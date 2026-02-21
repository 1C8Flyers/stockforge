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
    const body = z.object({ excludeDisputedFromVoting: z.boolean() }).parse(request.body);
    const row = await prisma.appConfig.upsert({
      where: { key: 'excludeDisputedFromVoting' },
      update: { value: body.excludeDisputedFromVoting ? 'true' : 'false', updatedById: request.userContext.id },
      create: { key: 'excludeDisputedFromVoting', value: body.excludeDisputedFromVoting ? 'true' : 'false', updatedById: request.userContext.id }
    });
    await audit(prisma, request.userContext.id, 'UPDATE', 'AppConfig', row.id, body);
    return row;
  });
}
