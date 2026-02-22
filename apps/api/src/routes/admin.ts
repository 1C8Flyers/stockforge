import { FastifyInstance } from 'fastify';
import { RoleName } from '@prisma/client';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/db.js';
import { requireRoles } from '../lib/auth.js';
import { audit } from '../lib/audit.js';
import { encryptSecret } from '../lib/email-crypto.js';
import { getOrCreateEmailSettings } from '../lib/email-settings.js';
import { writeEmailLog } from '../lib/email-log.js';
import { resetMailerCache, sendMail, verifyMailer } from '../services/mailer.js';

const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  roles: z.array(z.nativeEnum(RoleName)).min(1)
});

const updateRolesSchema = z.object({
  roles: z.array(z.nativeEnum(RoleName)).min(1)
});

const resetPasswordSchema = z.object({
  password: z.string().min(8)
});

const emailSettingsUpdateSchema = z.object({
  enabled: z.boolean(),
  smtpHost: z.string().trim().nullable().optional(),
  smtpPort: z.number().int().min(1).max(65535).nullable().optional(),
  smtpSecure: z.boolean().optional(),
  smtpUser: z.string().trim().nullable().optional(),
  smtpPassword: z.string().nullable().optional(),
  fromName: z.string().trim().nullable().optional(),
  fromEmail: z.string().trim().email().nullable().optional(),
  replyTo: z.string().trim().email().nullable().optional()
});

const emailSettingsTestSchema = z.object({
  toEmail: z.string().trim().email()
});

function asDto(settings: {
  enabled: boolean;
  smtpHost: string | null;
  smtpPort: number | null;
  smtpSecure: boolean;
  smtpUser: string | null;
  smtpPassEnc: string | null;
  fromName: string | null;
  fromEmail: string | null;
  replyTo: string | null;
}) {
  return {
    enabled: settings.enabled,
    smtpHost: settings.smtpHost,
    smtpPort: settings.smtpPort,
    smtpSecure: settings.smtpSecure,
    smtpUser: settings.smtpUser,
    hasPassword: Boolean(settings.smtpPassEnc),
    fromName: settings.fromName,
    fromEmail: settings.fromEmail,
    replyTo: settings.replyTo
  };
}

export async function adminRoutes(app: FastifyInstance) {
  app.get('/users', { preHandler: requireRoles(RoleName.Admin) }, async () => {
    return prisma.user.findMany({
      include: { userRoles: { include: { role: true } } },
      orderBy: { createdAt: 'desc' }
    });
  });

  app.post('/users', { preHandler: requireRoles(RoleName.Admin) }, async (request, reply) => {
    const body = createUserSchema.parse(request.body);
    const exists = await prisma.user.findUnique({ where: { email: body.email } });
    if (exists) return reply.conflict('Email already exists');

    const passwordHash = await bcrypt.hash(body.password, 10);
    const roles = await prisma.role.findMany({ where: { name: { in: body.roles } } });

    const user = await prisma.user.create({
      data: {
        email: body.email,
        passwordHash,
        userRoles: { create: roles.map((r) => ({ roleId: r.id })) }
      },
      include: { userRoles: { include: { role: true } } }
    });

    await audit(prisma, request.userContext.id, 'CREATE', 'User', user.id, { email: body.email, roles: body.roles });
    return user;
  });

  app.put('/users/:id/roles', { preHandler: requireRoles(RoleName.Admin) }, async (request, reply) => {
    const { id } = z.object({ id: z.string() }).parse(request.params);
    const body = updateRolesSchema.parse(request.body);

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) return reply.notFound();

    const roles = await prisma.role.findMany({ where: { name: { in: body.roles } } });

    await prisma.$transaction(async (tx) => {
      await tx.userRole.deleteMany({ where: { userId: id } });
      if (roles.length) {
        await tx.userRole.createMany({ data: roles.map((r) => ({ userId: id, roleId: r.id })) });
      }
    });

    await audit(prisma, request.userContext.id, 'UPDATE', 'UserRoles', id, { roles: body.roles });
    return { ok: true };
  });

  app.put('/users/:id/password', { preHandler: requireRoles(RoleName.Admin) }, async (request, reply) => {
    const { id } = z.object({ id: z.string() }).parse(request.params);
    const body = resetPasswordSchema.parse(request.body);

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) return reply.notFound();

    const passwordHash = await bcrypt.hash(body.password, 10);
    await prisma.user.update({ where: { id }, data: { passwordHash } });

    await audit(prisma, request.userContext.id, 'UPDATE', 'UserPassword', id);
    return { ok: true };
  });

  app.get('/health', { preHandler: requireRoles(RoleName.Admin) }, async () => {
    const now = new Date().toISOString();
    const db = await prisma.$queryRaw<{ ok: number }[]>`SELECT 1 as ok`;
    let migrationCount = 0;
    try {
      const rows = await prisma.$queryRaw<{ count: number }[]>`SELECT COUNT(*)::int AS count FROM "_prisma_migrations"`;
      migrationCount = rows[0]?.count ?? 0;
    } catch {
      migrationCount = 0;
    }

    return {
      now,
      dbOk: db?.[0]?.ok === 1,
      migrationCount
    };
  });

  app.get('/email-settings', { preHandler: requireRoles(RoleName.Admin) }, async () => {
    const settings = await getOrCreateEmailSettings(prisma);
    return asDto(settings);
  });

  app.put('/email-settings', { preHandler: requireRoles(RoleName.Admin) }, async (request) => {
    const body = emailSettingsUpdateSchema.parse(request.body);
    const existing = await getOrCreateEmailSettings(prisma);

    const providedPassword = typeof body.smtpPassword === 'string' ? body.smtpPassword.trim() : '';
    const passwordChanged = providedPassword.length > 0;

    const next = {
      enabled: body.enabled,
      smtpHost: typeof body.smtpHost === 'undefined' ? existing.smtpHost : body.smtpHost,
      smtpPort: typeof body.smtpPort === 'undefined' ? existing.smtpPort : body.smtpPort,
      smtpSecure: typeof body.smtpSecure === 'undefined' ? existing.smtpSecure : body.smtpSecure,
      smtpUser: typeof body.smtpUser === 'undefined' ? existing.smtpUser : body.smtpUser,
      fromName: typeof body.fromName === 'undefined' ? existing.fromName : body.fromName,
      fromEmail: typeof body.fromEmail === 'undefined' ? existing.fromEmail : body.fromEmail,
      replyTo: typeof body.replyTo === 'undefined' ? existing.replyTo : body.replyTo,
      hasPassword: passwordChanged || Boolean(existing.smtpPassEnc)
    };

    if (next.enabled) {
      if (!next.smtpHost?.trim()) {
        return request.server.httpErrors.badRequest('SMTP host is required when email is enabled.');
      }
      if (!next.smtpPort) {
        return request.server.httpErrors.badRequest('SMTP port is required when email is enabled.');
      }
      if (!next.fromName?.trim()) {
        return request.server.httpErrors.badRequest('From name is required when email is enabled.');
      }
      if (!next.fromEmail?.trim()) {
        return request.server.httpErrors.badRequest('From email is required when email is enabled.');
      }
      if (!next.hasPassword) {
        return request.server.httpErrors.badRequest('SMTP password is required when enabling email.');
      }
    }

    const updateData = {
      enabled: next.enabled,
      smtpHost: next.smtpHost,
      smtpPort: next.smtpPort,
      smtpSecure: next.smtpSecure,
      smtpUser: next.smtpUser,
      fromName: next.fromName,
      fromEmail: next.fromEmail,
      replyTo: next.replyTo,
      updatedById: request.userContext.id,
      ...(passwordChanged ? { smtpPassEnc: encryptSecret(providedPassword) } : {})
    };

    const saved = await prisma.emailSettings.upsert({
      where: { id: existing.id },
      update: updateData,
      create: {
        id: existing.id,
        ...updateData
      }
    });

    resetMailerCache();

    const updatedFields = Object.keys(body).filter((key) => key !== 'smtpPassword');
    await audit(prisma, request.userContext.id, 'UPDATE', 'EmailSettings', 'global', {
      updatedFields,
      enabled: saved.enabled,
      smtpHost: saved.smtpHost,
      smtpPort: saved.smtpPort,
      smtpSecure: saved.smtpSecure,
      smtpUser: saved.smtpUser,
      fromName: saved.fromName,
      fromEmail: saved.fromEmail,
      replyTo: saved.replyTo,
      passwordChanged
    });

    return asDto(saved);
  });

  app.post('/email-settings/test', { preHandler: requireRoles(RoleName.Admin) }, async (request) => {
    const body = emailSettingsTestSchema.parse(request.body);
    const sentAt = new Date().toISOString();
    const subject = 'StockForge Email Test';

    try {
      await verifyMailer();
      await sendMail({
        to: body.toEmail,
        subject,
        text: `This is a test email from StockForge sent at ${sentAt}.`
      });

      await writeEmailLog({
        type: 'EMAIL_TEST',
        to: body.toEmail,
        subject,
        status: 'SENT',
        relatedEntityType: 'Admin',
        relatedEntityId: request.userContext.id
      });

      await audit(prisma, request.userContext.id, 'CREATE', 'EmailTest', 'global', {
        toEmail: body.toEmail,
        success: true
      });

      return { ok: true };
    } catch (error: any) {
      const safeMessage = error?.message || 'Unable to send email test. Check SMTP configuration.';

      await writeEmailLog({
        type: 'EMAIL_TEST',
        to: body.toEmail,
        subject,
        status: 'FAILED',
        relatedEntityType: 'Admin',
        relatedEntityId: request.userContext.id,
        errorSafe: safeMessage
      });

      await audit(prisma, request.userContext.id, 'CREATE', 'EmailTest', 'global', {
        toEmail: body.toEmail,
        success: false,
        error: safeMessage
      });

      return { ok: false, error: safeMessage };
    }
  });

  app.get('/email-logs', { preHandler: requireRoles(RoleName.Admin) }, async () => {
    return prisma.emailLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100
    });
  });
}
