import { FastifyInstance } from 'fastify';
import { LotStatus, RoleName } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../lib/db.js';
import { audit } from '../lib/audit.js';
import { canWriteRoles, requireRoles } from '../lib/auth.js';
import { nextAutoCertificateNumber } from '../lib/certificates.js';
import { resolveTenantIdForRequest } from '../lib/tenant.js';

const createSchema = z.object({
  ownerId: z.string(),
  shares: z.number().int().positive(),
  status: z.nativeEnum(LotStatus).default(LotStatus.Active),
  certificateNumber: z.string().optional(),
  acquiredDate: z.string().datetime().optional(),
  source: z.string().optional(),
  notes: z.string().optional()
});

const updateSchema = z.object({
  ownerId: z.string().optional(),
  status: z.nativeEnum(LotStatus).optional(),
  acquiredDate: z.string().datetime().optional(),
  source: z.string().optional(),
  notes: z.string().optional()
});

export async function lotRoutes(app: FastifyInstance) {
  app.get('/', { preHandler: requireRoles(RoleName.Admin, RoleName.Officer, RoleName.Clerk, RoleName.ReadOnly) }, async (request) => {
    const tenantId = await resolveTenantIdForRequest(request);
    return prisma.shareLot.findMany({ where: { tenantId }, include: { owner: true }, orderBy: { createdAt: 'desc' } });
  });

  app.post('/', { preHandler: requireRoles(...canWriteRoles) }, async (request) => {
    const tenantId = await resolveTenantIdForRequest(request);
    const body = createSchema.parse(request.body);
    const owner = await prisma.shareholder.findFirst({ where: { id: body.ownerId, tenantId }, select: { id: true } });
    if (!owner) return request.server.httpErrors.badRequest('Owner not found in this tenant.');
    const certificateNumber = body.certificateNumber?.trim() || (await nextAutoCertificateNumber(prisma, tenantId));
    const lot = await prisma.shareLot.create({
      data: {
        ...body,
        tenantId,
        certificateNumber,
        acquiredDate: body.acquiredDate ? new Date(body.acquiredDate) : null
      }
    });
    await audit(prisma, request.userContext.id, 'CREATE', 'ShareLot', lot.id, body, tenantId);
    return lot;
  });

  app.put('/:id', { preHandler: requireRoles(...canWriteRoles) }, async (request, reply) => {
    const tenantId = await resolveTenantIdForRequest(request);
    const { id } = z.object({ id: z.string() }).parse(request.params);
    const body = updateSchema.parse(request.body);

    const existing = await prisma.shareLot.findFirst({ where: { id, tenantId } });
    if (!existing) return reply.notFound();

    if (body.ownerId) {
      const owner = await prisma.shareholder.findFirst({ where: { id: body.ownerId, tenantId }, select: { id: true } });
      if (!owner) return reply.badRequest('Owner not found in this tenant.');
    }

    const updated = await prisma.shareLot.update({
      where: { id },
      data: {
        ...body,
        acquiredDate: body.acquiredDate ? new Date(body.acquiredDate) : undefined
      }
    });

    await audit(prisma, request.userContext.id, 'UPDATE', 'ShareLot', id, { before: existing, after: updated }, tenantId);
    return updated;
  });

  app.delete('/:id', { preHandler: requireRoles(RoleName.Admin, RoleName.Officer) }, async (request, reply) => {
    const tenantId = await resolveTenantIdForRequest(request);
    const { id } = z.object({ id: z.string() }).parse(request.params);
    const existing = await prisma.shareLot.findFirst({ where: { id, tenantId } });
    if (!existing) return reply.notFound();
    const postedUsage = await prisma.transferLine.count({
      where: { lotId: id, tenantId, transfer: { status: 'POSTED', tenantId } }
    });
    if (postedUsage > 0) return reply.badRequest('Cannot delete lot used in posted transfer');
    await prisma.shareLot.delete({ where: { id } });
    await audit(prisma, request.userContext.id, 'DELETE', 'ShareLot', id, undefined, tenantId);
    return { ok: true };
  });
}
