import { RoleName } from '@prisma/client';
import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireRoles } from '../lib/auth.js';
import { prisma } from '../lib/db.js';
import { audit } from '../lib/audit.js';

export async function configRoutes(app: FastifyInstance) {
  app.get('/', { preHandler: requireRoles(RoleName.Admin, RoleName.Officer, RoleName.Clerk, RoleName.ReadOnly) }, async () => {
    const rows = await prisma.appConfig.findMany();
    return Object.fromEntries(rows.map((r) => [r.key, r.value]));
  });

  app.put('/', { preHandler: requireRoles(RoleName.Admin) }, async (request) => {
    const body = z
      .object({
        excludeDisputedFromVoting: z.boolean().optional(),
        appDisplayName: z.string().trim().min(1).max(80).optional(),
        appLogoUrl: z.string().trim().max(500).optional(),
        appIncorporationState: z.string().trim().max(80).optional(),
        appPublicBaseUrl: z.string().trim().max(500).optional()
      })
      .parse(request.body);

    if (
      typeof body.excludeDisputedFromVoting === 'undefined' &&
      typeof body.appDisplayName === 'undefined' &&
      typeof body.appLogoUrl === 'undefined' &&
      typeof body.appIncorporationState === 'undefined' &&
      typeof body.appPublicBaseUrl === 'undefined'
    ) {
      return request.server.httpErrors.badRequest('No config fields provided');
    }

    const updates: string[] = [];

    if (typeof body.excludeDisputedFromVoting === 'boolean') {
      await prisma.appConfig.upsert({
        where: { key: 'excludeDisputedFromVoting' },
        update: { value: body.excludeDisputedFromVoting ? 'true' : 'false', updatedById: request.userContext.id },
        create: {
          key: 'excludeDisputedFromVoting',
          value: body.excludeDisputedFromVoting ? 'true' : 'false',
          updatedById: request.userContext.id
        }
      });
      updates.push('excludeDisputedFromVoting');
    }

    if (typeof body.appDisplayName === 'string') {
      await prisma.appConfig.upsert({
        where: { key: 'appDisplayName' },
        update: { value: body.appDisplayName, updatedById: request.userContext.id },
        create: { key: 'appDisplayName', value: body.appDisplayName, updatedById: request.userContext.id }
      });
      updates.push('appDisplayName');
    }

    if (typeof body.appLogoUrl === 'string') {
      await prisma.appConfig.upsert({
        where: { key: 'appLogoUrl' },
        update: { value: body.appLogoUrl, updatedById: request.userContext.id },
        create: { key: 'appLogoUrl', value: body.appLogoUrl, updatedById: request.userContext.id }
      });
      updates.push('appLogoUrl');
    }

    if (typeof body.appIncorporationState === 'string') {
      await prisma.appConfig.upsert({
        where: { key: 'appIncorporationState' },
        update: { value: body.appIncorporationState, updatedById: request.userContext.id },
        create: {
          key: 'appIncorporationState',
          value: body.appIncorporationState,
          updatedById: request.userContext.id
        }
      });
      updates.push('appIncorporationState');
    }

    if (typeof body.appPublicBaseUrl === 'string') {
      await prisma.appConfig.upsert({
        where: { key: 'appPublicBaseUrl' },
        update: { value: body.appPublicBaseUrl, updatedById: request.userContext.id },
        create: {
          key: 'appPublicBaseUrl',
          value: body.appPublicBaseUrl,
          updatedById: request.userContext.id
        }
      });
      updates.push('appPublicBaseUrl');
    }

    const rows = await prisma.appConfig.findMany();
    const result = Object.fromEntries(rows.map((r) => [r.key, r.value]));
    await audit(prisma, request.userContext.id, 'UPDATE', 'AppConfig', 'global', { updatedKeys: updates, values: body });
    return result;
  });
}
