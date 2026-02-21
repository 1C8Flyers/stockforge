import { FastifyInstance } from 'fastify';
import { LotStatus, RoleName } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../lib/db.js';
import { audit } from '../lib/audit.js';
import { canWriteRoles, requireRoles } from '../lib/auth.js';

const createSchema = z.object({
  ownerId: z.string(),
  shares: z.number().int().positive(),
  status: z.nativeEnum(LotStatus).default(LotStatus.Active),
  certificateNumber: z.string().optional(),
  acquiredDate: z.string().datetime().optional(),
  source: z.string().optional(),
  notes: z.string().optional()
});

export async function lotRoutes(app: FastifyInstance) {
  app.get('/', { preHandler: requireRoles(RoleName.Admin, RoleName.Officer, RoleName.Clerk, RoleName.ReadOnly) }, async () => {
    return prisma.shareLot.findMany({ include: { owner: true }, orderBy: { createdAt: 'desc' } });
  });

  app.post('/', { preHandler: requireRoles(...canWriteRoles) }, async (request) => {
    const body = createSchema.parse(request.body);
    const lot = await prisma.shareLot.create({
      data: {
        ...body,
        acquiredDate: body.acquiredDate ? new Date(body.acquiredDate) : null
      }
    });
    await audit(prisma, request.userContext.id, 'CREATE', 'ShareLot', lot.id, body);
    return lot;
  });

  app.put('/:id', { preHandler: requireRoles(...canWriteRoles) }, async (request, reply) => {
    const { id } = z.object({ id: z.string() }).parse(request.params);
    const body = createSchema.partial().parse(request.body);

    const existing = await prisma.shareLot.findUnique({ where: { id } });
    if (!existing) return reply.notFound();

    if (typeof body.shares === 'number' && body.shares !== existing.shares) {
      const postedUsage = await prisma.transferLine.count({
        where: { lotId: id, transfer: { status: 'POSTED' } }
      });
      if (postedUsage > 0) {
        return reply.badRequest('Cannot edit lot shares after posted transfer usage');
      }
    }

    const updated = await prisma.shareLot.update({
      where: { id },
      data: {
        ...body,
        acquiredDate: body.acquiredDate ? new Date(body.acquiredDate) : undefined
      }
    });

    await audit(prisma, request.userContext.id, 'UPDATE', 'ShareLot', id, { before: existing, after: updated });
    return updated;
  });

  app.delete('/:id', { preHandler: requireRoles(RoleName.Admin, RoleName.Officer) }, async (request, reply) => {
    const { id } = z.object({ id: z.string() }).parse(request.params);
    const postedUsage = await prisma.transferLine.count({
      where: { lotId: id, transfer: { status: 'POSTED' } }
    });
    if (postedUsage > 0) return reply.badRequest('Cannot delete lot used in posted transfer');
    await prisma.shareLot.delete({ where: { id } });
    await audit(prisma, request.userContext.id, 'DELETE', 'ShareLot', id);
    return { ok: true };
  });
}
