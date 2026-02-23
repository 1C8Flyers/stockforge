import { FastifyInstance } from 'fastify';
import { BeneficiaryDesignationStatus, ProxyAuthorizationStatus, RoleName } from '@prisma/client';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/db.js';
import { requireRoles } from '../lib/auth.js';
import { audit } from '../lib/audit.js';
import { encryptSecret } from '../lib/email-crypto.js';
import { getOrCreateEmailSettings } from '../lib/email-settings.js';
import { writeEmailLog } from '../lib/email-log.js';
import { resetMailerCache, sendMail, verifyMailer } from '../services/mailer.js';
import { DEFAULT_TENANT_ID, requireTenantMembership, resolveTenantIdForRequest } from '../lib/tenant.js';

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

const setShareholderLinkSchema = z.object({
  shareholderId: z.string().nullable()
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
  app.get('/users', { preHandler: requireRoles(RoleName.Admin) }, async (request) => {
    const tenantId = await resolveTenantIdForRequest(request);
    return prisma.user.findMany({
      include: {
        userRoles: { include: { role: true } },
        tenantUsers: {
          where: { tenantId },
          select: { tenantId: true, roles: true }
        },
        shareholderLinks: {
          where: { tenantId },
          include: {
            shareholder: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                entityName: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  });

  app.post('/users', { preHandler: requireRoles(RoleName.Admin) }, async (request, reply) => {
    const tenantId = await resolveTenantIdForRequest(request);
    const body = createUserSchema.parse(request.body);
    const exists = await prisma.user.findUnique({ where: { email: body.email } });
    if (exists) return reply.conflict('Email already exists');

    const passwordHash = await bcrypt.hash(body.password, 10);

    const user = await prisma.user.create({
      data: {
        email: body.email,
        passwordHash,
        tenantUsers: {
          create: {
            tenantId,
            roles: body.roles
          }
        }
      },
      include: {
        userRoles: { include: { role: true } },
        tenantUsers: {
          where: { tenantId },
          select: { tenantId: true, roles: true }
        }
      }
    });

    await audit(prisma, request.userContext.id, 'CREATE', 'TenantUser', user.id, { tenantId, email: body.email, roles: body.roles }, tenantId);
    return user;
  });

  app.put('/users/:id/roles', { preHandler: requireRoles(RoleName.Admin) }, async (request, reply) => {
    const tenantId = await resolveTenantIdForRequest(request);
    const { id } = z.object({ id: z.string() }).parse(request.params);
    const body = updateRolesSchema.parse(request.body);

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) return reply.notFound();

    await prisma.tenantUser.upsert({
      where: {
        tenantId_userId: {
          tenantId,
          userId: id
        }
      },
      update: {
        roles: body.roles
      },
      create: {
        tenantId,
        userId: id,
        roles: body.roles
      }
    });

    await audit(prisma, request.userContext.id, 'UPDATE', 'TenantUserRoles', `${tenantId}:${id}`, { tenantId, roles: body.roles }, tenantId);
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

  app.put('/users/:id/shareholder-link', { preHandler: requireRoles(RoleName.Admin) }, async (request, reply) => {
    const tenantId = await resolveTenantIdForRequest(request);
    const { id } = z.object({ id: z.string() }).parse(request.params);
    const body = setShareholderLinkSchema.parse(request.body);

    const existingUser = await prisma.user.findUnique({ where: { id } });
    if (!existingUser) return reply.notFound();

    if (!body.shareholderId) {
      await prisma.shareholderLink.deleteMany({
        where: {
          tenantId,
          userId: id
        }
      });
      await audit(prisma, request.userContext.id, 'UPDATE', 'ShareholderLink', `${tenantId}:${id}`, {
        tenantId,
        userId: id,
        shareholderId: null
      }, tenantId);
      return { ok: true };
    }

    const shareholder = await prisma.shareholder.findFirst({
      where: {
        id: body.shareholderId,
        tenantId
      }
    });
    if (!shareholder) {
      return reply.badRequest('Shareholder not found in this tenant.');
    }

    await prisma.shareholderLink.upsert({
      where: {
        tenantId_userId: {
          tenantId,
          userId: id
        }
      },
      update: {
        shareholderId: body.shareholderId
      },
      create: {
        tenantId,
        userId: id,
        shareholderId: body.shareholderId
      }
    });

    await audit(prisma, request.userContext.id, 'UPDATE', 'ShareholderLink', `${tenantId}:${id}`, {
      tenantId,
      userId: id,
      shareholderId: body.shareholderId
    }, tenantId);

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

  app.get('/email-settings', { preHandler: requireRoles(RoleName.Admin) }, async (request) => {
    const tenantId = await resolveTenantIdForRequest(request);
    const settings = await getOrCreateEmailSettings(prisma, undefined, tenantId);
    return asDto(settings);
  });

  app.put('/email-settings', { preHandler: requireRoles(RoleName.Admin) }, async (request) => {
    const tenantId = await resolveTenantIdForRequest(request);
    const body = emailSettingsUpdateSchema.parse(request.body);
    const existing = await getOrCreateEmailSettings(prisma, undefined, tenantId);

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
    }, tenantId);

    return asDto(saved);
  });

  app.post('/email-settings/test', { preHandler: requireRoles(RoleName.Admin) }, async (request) => {
    const tenantId = await resolveTenantIdForRequest(request);
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
        tenantId,
        to: body.toEmail,
        subject,
        status: 'SENT',
        relatedEntityType: 'Admin',
        relatedEntityId: request.userContext.id
      });

      await audit(prisma, request.userContext.id, 'CREATE', 'EmailTest', 'global', {
        toEmail: body.toEmail,
        success: true
      }, tenantId);

      return { ok: true };
    } catch (error: any) {
      const safeMessage = error?.message || 'Unable to send email test. Check SMTP configuration.';

      await writeEmailLog({
        type: 'EMAIL_TEST',
        tenantId,
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
      }, tenantId);

      return { ok: false, error: safeMessage };
    }
  });

  app.get('/email-logs', { preHandler: requireRoles(RoleName.Admin) }, async (request) => {
    const tenantId = await resolveTenantIdForRequest(request);
    return prisma.emailLog.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      take: 100
    });
  });

  app.get(
    '/t/:tenantSlug/proxy-requests',
    { preHandler: [requireRoles(RoleName.Admin), requireTenantMembership] },
    async (request) => {
      const tenantId = request.tenantContext!.id;
      return prisma.proxyAuthorization.findMany({
        where: { tenantId, status: ProxyAuthorizationStatus.PENDING },
        include: {
          shareholder: true,
          meeting: true
        },
        orderBy: { createdAt: 'desc' }
      });
    }
  );

  app.post(
    '/t/:tenantSlug/proxies/:id/accept',
    { preHandler: [requireRoles(RoleName.Admin), requireTenantMembership] },
    async (request, reply) => {
      const tenantId = request.tenantContext!.id;
      const { id } = z.object({ id: z.string() }).parse(request.params);

      const existing = await prisma.proxyAuthorization.findFirst({ where: { id, tenantId } });
      if (!existing) return reply.notFound();

      const updated = await prisma.proxyAuthorization.update({
        where: { id },
        data: { status: ProxyAuthorizationStatus.ACCEPTED }
      });

      await audit(prisma, request.userContext.id, 'ACCEPT', 'ProxyAuthorization', id, undefined, tenantId);
      return updated;
    }
  );

  app.post(
    '/t/:tenantSlug/proxies/:id/reject',
    { preHandler: [requireRoles(RoleName.Admin), requireTenantMembership] },
    async (request, reply) => {
      const tenantId = request.tenantContext!.id;
      const { id } = z.object({ id: z.string() }).parse(request.params);

      const existing = await prisma.proxyAuthorization.findFirst({ where: { id, tenantId } });
      if (!existing) return reply.notFound();

      const updated = await prisma.proxyAuthorization.update({
        where: { id },
        data: { status: ProxyAuthorizationStatus.REJECTED }
      });

      await audit(prisma, request.userContext.id, 'REJECT', 'ProxyAuthorization', id, undefined, tenantId);
      return updated;
    }
  );

  app.get(
    '/t/:tenantSlug/designations',
    { preHandler: [requireRoles(RoleName.Admin), requireTenantMembership] },
    async (request) => {
      const tenantId = request.tenantContext!.id;
      return prisma.beneficiaryDesignation.findMany({
        where: { tenantId, status: BeneficiaryDesignationStatus.SUBMITTED },
        include: {
          shareholder: true,
          entries: true
        },
        orderBy: { updatedAt: 'desc' }
      });
    }
  );

  app.post(
    '/t/:tenantSlug/designations/:id/ack',
    { preHandler: [requireRoles(RoleName.Admin), requireTenantMembership] },
    async (request, reply) => {
      const tenantId = request.tenantContext!.id;
      const { id } = z.object({ id: z.string() }).parse(request.params);

      const existing = await prisma.beneficiaryDesignation.findFirst({ where: { id, tenantId } });
      if (!existing) return reply.notFound();

      const updated = await prisma.beneficiaryDesignation.update({
        where: { id },
        data: { status: BeneficiaryDesignationStatus.ACKNOWLEDGED }
      });

      await audit(prisma, request.userContext.id, 'ACKNOWLEDGE', 'BeneficiaryDesignation', id, undefined, tenantId);
      return updated;
    }
  );
}
