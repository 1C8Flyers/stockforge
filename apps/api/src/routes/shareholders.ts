import { RoleName, ShareholderType, ShareholderStatus } from '@prisma/client';
import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/db.js';
import { audit } from '../lib/audit.js';
import { canWriteRoles, requireRoles } from '../lib/auth.js';
import { getExcludeDisputed } from '../lib/voting.js';

const schema = z.object({
  type: z.nativeEnum(ShareholderType),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  entityName: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  status: z.nativeEnum(ShareholderStatus).default(ShareholderStatus.Active),
  notes: z.string().optional(),
  tags: z.array(z.string()).optional().default([])
});

export async function shareholderRoutes(app: FastifyInstance) {
  app.get('/', { preHandler: requireRoles(RoleName.Admin, RoleName.Officer, RoleName.Clerk, RoleName.ReadOnly) }, async (request) => {
    const query = z.object({ q: z.string().optional() }).parse(request.query);
    const rows = await prisma.shareholder.findMany({
      where: query.q
        ? {
            OR: [
              { firstName: { contains: query.q, mode: 'insensitive' } },
              { lastName: { contains: query.q, mode: 'insensitive' } },
              { entityName: { contains: query.q, mode: 'insensitive' } },
              { email: { contains: query.q, mode: 'insensitive' } }
            ]
          }
        : undefined,
      orderBy: [{ lastName: 'asc' }, { entityName: 'asc' }]
    });
    return rows;
  });

  app.post('/', { preHandler: requireRoles(...canWriteRoles) }, async (request) => {
    const body = schema.parse(request.body);
    const created = await prisma.shareholder.create({
      data: {
        ...body,
        email: body.email || null
      }
    });
    await audit(prisma, request.userContext.id, 'CREATE', 'Shareholder', created.id, body);
    return created;
  });

  app.get('/:id', { preHandler: requireRoles(RoleName.Admin, RoleName.Officer, RoleName.Clerk, RoleName.ReadOnly) }, async (request, reply) => {
    const { id } = z.object({ id: z.string() }).parse(request.params);
    const shareholder = await prisma.shareholder.findUnique({ where: { id }, include: { lots: true } });
    if (!shareholder) return reply.notFound();

    const excludeDisputed = await getExcludeDisputed(prisma);
    const activeShares = shareholder.lots
      .filter((l) => l.status === 'Active' || (!excludeDisputed && l.status === 'Disputed'))
      .reduce((sum, l) => sum + l.shares, 0);
    const excludedShares = shareholder.lots.reduce((sum, l) => sum + l.shares, 0) - activeShares;

    const transfers = await prisma.transfer.findMany({
      where: { OR: [{ fromOwnerId: id }, { toOwnerId: id }] },
      include: { lines: true },
      orderBy: { createdAt: 'desc' }
    });

    return { ...shareholder, activeShares, excludedShares, transfers };
  });

  app.put('/:id', { preHandler: requireRoles(...canWriteRoles) }, async (request, reply) => {
    const { id } = z.object({ id: z.string() }).parse(request.params);
    const body = schema.partial().parse(request.body);
    const existing = await prisma.shareholder.findUnique({ where: { id } });
    if (!existing) return reply.notFound();
    const updated = await prisma.shareholder.update({ where: { id }, data: body });
    await audit(prisma, request.userContext.id, 'UPDATE', 'Shareholder', id, { before: existing, after: updated });
    return updated;
  });

  app.delete('/:id', { preHandler: requireRoles(RoleName.Admin, RoleName.Officer) }, async (request) => {
    const { id } = z.object({ id: z.string() }).parse(request.params);
    await prisma.shareholder.delete({ where: { id } });
    await audit(prisma, request.userContext.id, 'DELETE', 'Shareholder', id);
    return { ok: true };
  });
}
