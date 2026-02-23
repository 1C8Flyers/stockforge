import { RoleName } from '@prisma/client';
import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireRoles } from '../lib/auth.js';
import { prisma } from '../lib/db.js';
import { audit } from '../lib/audit.js';
import { DEFAULT_TENANT_ID } from '../lib/tenant.js';

export async function configRoutes(app: FastifyInstance) {
  app.get('/', { preHandler: requireRoles(RoleName.Admin, RoleName.Officer, RoleName.Clerk, RoleName.ReadOnly) }, async () => {
    const rows = await prisma.appConfig.findMany({ where: { tenantId: DEFAULT_TENANT_ID } });
    return Object.fromEntries(rows.map((r) => [r.key, r.value]));
  });

  app.put('/', { preHandler: requireRoles(RoleName.Admin) }, async (request) => {
    const body = z
      .object({
        excludeDisputedFromVoting: z.boolean().optional(),
        emailPasswordResetsEnabled: z.boolean().optional(),
        emailMeetingReportsEnabled: z.boolean().optional(),
        emailProxyReceiptEnabled: z.boolean().optional(),
        emailCertificateNoticesEnabled: z.boolean().optional(),
        appDisplayName: z.string().trim().min(1).max(80).optional(),
        appLogoUrl: z.string().trim().max(500).optional(),
        appIncorporationState: z.string().trim().max(80).optional(),
        appPublicBaseUrl: z.string().trim().max(500).optional(),
        certificateSecretaryName: z.string().trim().max(120).optional(),
        certificatePresidentName: z.string().trim().max(120).optional()
      })
      .parse(request.body);

    if (
      typeof body.excludeDisputedFromVoting === 'undefined' &&
      typeof body.emailPasswordResetsEnabled === 'undefined' &&
      typeof body.emailMeetingReportsEnabled === 'undefined' &&
      typeof body.emailProxyReceiptEnabled === 'undefined' &&
      typeof body.emailCertificateNoticesEnabled === 'undefined' &&
      typeof body.appDisplayName === 'undefined' &&
      typeof body.appLogoUrl === 'undefined' &&
      typeof body.appIncorporationState === 'undefined' &&
      typeof body.appPublicBaseUrl === 'undefined' &&
      typeof body.certificateSecretaryName === 'undefined' &&
      typeof body.certificatePresidentName === 'undefined'
    ) {
      return request.server.httpErrors.badRequest('No config fields provided');
    }

    const updates: string[] = [];

    if (typeof body.excludeDisputedFromVoting === 'boolean') {
      await prisma.appConfig.upsert({
        where: { tenantId_key: { tenantId: DEFAULT_TENANT_ID, key: 'excludeDisputedFromVoting' } },
        update: { value: body.excludeDisputedFromVoting ? 'true' : 'false', updatedById: request.userContext.id },
        create: {
          tenantId: DEFAULT_TENANT_ID,
          key: 'excludeDisputedFromVoting',
          value: body.excludeDisputedFromVoting ? 'true' : 'false',
          updatedById: request.userContext.id
        }
      });
      updates.push('excludeDisputedFromVoting');
    }

    if (typeof body.emailPasswordResetsEnabled === 'boolean') {
      await prisma.appConfig.upsert({
        where: { tenantId_key: { tenantId: DEFAULT_TENANT_ID, key: 'email.passwordResetsEnabled' } },
        update: { value: body.emailPasswordResetsEnabled ? 'true' : 'false', updatedById: request.userContext.id },
        create: {
          tenantId: DEFAULT_TENANT_ID,
          key: 'email.passwordResetsEnabled',
          value: body.emailPasswordResetsEnabled ? 'true' : 'false',
          updatedById: request.userContext.id
        }
      });
      updates.push('email.passwordResetsEnabled');
    }

    if (typeof body.emailMeetingReportsEnabled === 'boolean') {
      await prisma.appConfig.upsert({
        where: { tenantId_key: { tenantId: DEFAULT_TENANT_ID, key: 'email.meetingReportsEnabled' } },
        update: { value: body.emailMeetingReportsEnabled ? 'true' : 'false', updatedById: request.userContext.id },
        create: {
          tenantId: DEFAULT_TENANT_ID,
          key: 'email.meetingReportsEnabled',
          value: body.emailMeetingReportsEnabled ? 'true' : 'false',
          updatedById: request.userContext.id
        }
      });
      updates.push('email.meetingReportsEnabled');
    }

    if (typeof body.emailProxyReceiptEnabled === 'boolean') {
      await prisma.appConfig.upsert({
        where: { tenantId_key: { tenantId: DEFAULT_TENANT_ID, key: 'email.proxyReceiptEnabled' } },
        update: { value: body.emailProxyReceiptEnabled ? 'true' : 'false', updatedById: request.userContext.id },
        create: {
          tenantId: DEFAULT_TENANT_ID,
          key: 'email.proxyReceiptEnabled',
          value: body.emailProxyReceiptEnabled ? 'true' : 'false',
          updatedById: request.userContext.id
        }
      });
      updates.push('email.proxyReceiptEnabled');
    }

    if (typeof body.emailCertificateNoticesEnabled === 'boolean') {
      await prisma.appConfig.upsert({
        where: { tenantId_key: { tenantId: DEFAULT_TENANT_ID, key: 'email.certificateNoticesEnabled' } },
        update: { value: body.emailCertificateNoticesEnabled ? 'true' : 'false', updatedById: request.userContext.id },
        create: {
          tenantId: DEFAULT_TENANT_ID,
          key: 'email.certificateNoticesEnabled',
          value: body.emailCertificateNoticesEnabled ? 'true' : 'false',
          updatedById: request.userContext.id
        }
      });
      updates.push('email.certificateNoticesEnabled');
    }

    if (typeof body.appDisplayName === 'string') {
      await prisma.appConfig.upsert({
        where: { tenantId_key: { tenantId: DEFAULT_TENANT_ID, key: 'appDisplayName' } },
        update: { value: body.appDisplayName, updatedById: request.userContext.id },
        create: { tenantId: DEFAULT_TENANT_ID, key: 'appDisplayName', value: body.appDisplayName, updatedById: request.userContext.id }
      });
      updates.push('appDisplayName');
    }

    if (typeof body.appLogoUrl === 'string') {
      await prisma.appConfig.upsert({
        where: { tenantId_key: { tenantId: DEFAULT_TENANT_ID, key: 'appLogoUrl' } },
        update: { value: body.appLogoUrl, updatedById: request.userContext.id },
        create: { tenantId: DEFAULT_TENANT_ID, key: 'appLogoUrl', value: body.appLogoUrl, updatedById: request.userContext.id }
      });
      updates.push('appLogoUrl');
    }

    if (typeof body.appIncorporationState === 'string') {
      await prisma.appConfig.upsert({
        where: { tenantId_key: { tenantId: DEFAULT_TENANT_ID, key: 'appIncorporationState' } },
        update: { value: body.appIncorporationState, updatedById: request.userContext.id },
        create: {
          tenantId: DEFAULT_TENANT_ID,
          key: 'appIncorporationState',
          value: body.appIncorporationState,
          updatedById: request.userContext.id
        }
      });
      updates.push('appIncorporationState');
    }

    if (typeof body.appPublicBaseUrl === 'string') {
      await prisma.appConfig.upsert({
        where: { tenantId_key: { tenantId: DEFAULT_TENANT_ID, key: 'appPublicBaseUrl' } },
        update: { value: body.appPublicBaseUrl, updatedById: request.userContext.id },
        create: {
          tenantId: DEFAULT_TENANT_ID,
          key: 'appPublicBaseUrl',
          value: body.appPublicBaseUrl,
          updatedById: request.userContext.id
        }
      });
      updates.push('appPublicBaseUrl');
    }

    if (typeof body.certificateSecretaryName === 'string') {
      await prisma.appConfig.upsert({
        where: { tenantId_key: { tenantId: DEFAULT_TENANT_ID, key: 'certificateSecretaryName' } },
        update: { value: body.certificateSecretaryName, updatedById: request.userContext.id },
        create: {
          tenantId: DEFAULT_TENANT_ID,
          key: 'certificateSecretaryName',
          value: body.certificateSecretaryName,
          updatedById: request.userContext.id
        }
      });
      updates.push('certificateSecretaryName');
    }

    if (typeof body.certificatePresidentName === 'string') {
      await prisma.appConfig.upsert({
        where: { tenantId_key: { tenantId: DEFAULT_TENANT_ID, key: 'certificatePresidentName' } },
        update: { value: body.certificatePresidentName, updatedById: request.userContext.id },
        create: {
          tenantId: DEFAULT_TENANT_ID,
          key: 'certificatePresidentName',
          value: body.certificatePresidentName,
          updatedById: request.userContext.id
        }
      });
      updates.push('certificatePresidentName');
    }

    const rows = await prisma.appConfig.findMany({ where: { tenantId: DEFAULT_TENANT_ID } });
    const result = Object.fromEntries(rows.map((r) => [r.key, r.value]));
    await audit(prisma, request.userContext.id, 'UPDATE', 'AppConfig', 'global', { updatedKeys: updates, values: body });
    return result;
  });
}
