import { FastifyInstance } from 'fastify';
import { RoleName } from '@prisma/client';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { prisma } from '../lib/db.js';
import { requireAuth } from '../lib/auth.js';
import { getEmailPreferenceFlags } from '../lib/email-preferences.js';
import { passwordResetTemplate } from '../emails/templates/index.js';
import { sendMail } from '../services/mailer.js';
import { writeEmailLog } from '../lib/email-log.js';
import { audit } from '../lib/audit.js';
import { DEFAULT_TENANT_ID, resolveTenantIdForRequest } from '../lib/tenant.js';

function hashToken(raw: string) {
  return crypto.createHash('sha256').update(raw).digest('hex');
}

function normalizeBaseUrl(url: string) {
  return url.trim().replace(/\/+$/, '');
}

async function resolvePublicAppBaseUrl(request: { protocol: string; headers: Record<string, unknown> }, tenantId = DEFAULT_TENANT_ID) {
  const config = await prisma.appConfig.findUnique({
    where: {
      tenantId_key: {
        tenantId,
        key: 'appPublicBaseUrl'
      }
    }
  });
  if (config?.value?.trim()) return normalizeBaseUrl(config.value);

  const envUrl = (process.env.PUBLIC_APP_BASE_URL || '').trim();
  if (envUrl) return normalizeBaseUrl(envUrl);

  const forwardedProto = String(request.headers['x-forwarded-proto'] || '').trim();
  const proto = forwardedProto || request.protocol || 'http';
  const host = String(request.headers.host || 'localhost:5173');
  return `${proto}://${host}`;
}

export async function authRoutes(app: FastifyInstance) {
  app.post('/login', async (request, reply) => {
    const body = z.object({ email: z.string().email(), password: z.string().min(8) }).parse(request.body);
    const user = await prisma.user.findUnique({
      where: { email: body.email },
      include: { userRoles: { include: { role: true } } }
    });
    if (!user || !(await bcrypt.compare(body.password, user.passwordHash))) {
      return reply.unauthorized('Invalid credentials');
    }

    const tenantId = await resolveTenantIdForRequest(request);
    const systemRoles = user.userRoles.map((r) => r.role.name);
    const isSystemAdmin = systemRoles.includes(RoleName.Admin);
    const membership = await prisma.tenantUser.findUnique({
      where: {
        tenantId_userId: {
          tenantId,
          userId: user.id
        }
      },
      select: { roles: true }
    });
    const roles = membership?.roles || [];

    if (!isSystemAdmin && roles.length === 0) {
      return reply.forbidden('You are not a member of this tenant.');
    }

    const token = await reply.jwtSign({ sub: user.id, email: user.email });
    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        roles,
        tenantId,
        isSystemAdmin,
        systemRoles
      }
    };
  });

  app.get('/me', { preHandler: requireAuth }, async (request) => {
    return request.userContext;
  });

  app.post('/request-password-reset', async (request) => {
    const tenantId = await resolveTenantIdForRequest(request);
    const body = z.object({ email: z.string().email() }).parse(request.body);
    const user = await prisma.user.findUnique({ where: { email: body.email } });

    try {
      const flags = await getEmailPreferenceFlags(tenantId);
      if (!flags.passwordResetsEnabled || !user) {
        return { ok: true };
      }

      const rawToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = hashToken(rawToken);
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

      await prisma.passwordResetToken.create({
        data: {
          tenantId,
          userId: user.id,
          tokenHash,
          expiresAt
        }
      });

      const baseUrl = await resolvePublicAppBaseUrl(request, tenantId);
      const resetUrl = `${baseUrl}/reset-password?token=${encodeURIComponent(rawToken)}`;
      const template = passwordResetTemplate({
        resetUrl,
        expiresAtIso: expiresAt.toISOString()
      });

      await sendMail({
        to: user.email,
        subject: template.subject,
        html: template.html,
        text: template.text
      });

      await writeEmailLog({
        type: 'PASSWORD_RESET',
        tenantId,
        to: user.email,
        subject: template.subject,
        status: 'SENT',
        relatedEntityType: 'User',
        relatedEntityId: user.id
      });

      await audit(prisma, user.id, 'PASSWORD_RESET_REQUESTED', 'User', user.id, {
        emailDomain: String(user.email.split('@')[1] || '')
      }, tenantId);
    } catch (error: any) {
      if (user) {
        await writeEmailLog({
          type: 'PASSWORD_RESET',
          tenantId,
          to: user.email,
          subject: 'Reset your StockForge password',
          status: 'FAILED',
          relatedEntityType: 'User',
          relatedEntityId: user.id,
          errorSafe: error?.message || 'Password reset email failed'
        });
      }
    }

    return { ok: true };
  });

  app.post('/reset-password', async (request, reply) => {
    const tenantId = await resolveTenantIdForRequest(request);
    const body = z.object({ token: z.string().min(10), newPassword: z.string().min(8) }).parse(request.body);
    const tokenHash = hashToken(body.token);

    const row = await prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      include: { user: true }
    });

    if (!row || row.tenantId !== tenantId || row.usedAt || row.expiresAt.getTime() < Date.now()) {
      return reply.badRequest('Reset token is invalid or expired.');
    }

    const passwordHash = await bcrypt.hash(body.newPassword, 10);
    await prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: row.userId }, data: { passwordHash } });
      await tx.passwordResetToken.update({ where: { id: row.id }, data: { usedAt: new Date() } });
    });

    await audit(prisma, row.userId, 'PASSWORD_RESET_COMPLETED', 'User', row.userId, undefined, tenantId);
    return { ok: true };
  });
}
