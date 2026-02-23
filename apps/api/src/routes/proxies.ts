import { FastifyInstance } from 'fastify';
import { ProxyStatus, RoleName } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../lib/db.js';
import { audit } from '../lib/audit.js';
import { canWriteRoles, requireRoles } from '../lib/auth.js';
import { getShareholderActiveShares } from '../lib/voting.js';
import { resolveTenantIdForRequest } from '../lib/tenant.js';

const proxySchema = z.object({
  meetingId: z.string(),
  grantorId: z.string(),
  proxyHolderName: z.string().min(1),
  proxyHolderShareholderId: z.string().optional().nullable(),
  receivedDate: z.string().datetime(),
  status: z.nativeEnum(ProxyStatus).default(ProxyStatus.Draft),
  attachmentId: z.string().optional().nullable()
});

export async function proxyRoutes(app: FastifyInstance) {
  app.get('/', { preHandler: requireRoles(RoleName.Admin, RoleName.Officer, RoleName.Clerk, RoleName.ReadOnly) }, async (request) => {
    const tenantId = await resolveTenantIdForRequest(request);
    const q = z.object({ meetingId: z.string().optional() }).parse(request.query);
    return prisma.proxy.findMany({
      where: q.meetingId ? { tenantId, meetingId: q.meetingId } : { tenantId },
      include: { grantor: true },
      orderBy: { createdAt: 'desc' }
    });
  });

  app.post('/', { preHandler: requireRoles(...canWriteRoles) }, async (request) => {
    const tenantId = await resolveTenantIdForRequest(request);
    const body = proxySchema.parse(request.body);

    const [meeting, grantor] = await Promise.all([
      prisma.meeting.findFirst({ where: { id: body.meetingId, tenantId }, select: { id: true } }),
      prisma.shareholder.findFirst({ where: { id: body.grantorId, tenantId }, select: { id: true } })
    ]);
    if (!meeting) return request.server.httpErrors.badRequest('Meeting not found in this tenant.');
    if (!grantor) return request.server.httpErrors.badRequest('Grantor not found in this tenant.');
    if (body.proxyHolderShareholderId) {
      const holder = await prisma.shareholder.findFirst({
        where: { id: body.proxyHolderShareholderId, tenantId },
        select: { id: true }
      });
      if (!holder) return request.server.httpErrors.badRequest('Proxy holder shareholder not found in this tenant.');
    }

    const snap = await getShareholderActiveShares(prisma, body.grantorId, tenantId);
    const created = await prisma.proxy.create({
      data: {
        ...body,
        tenantId,
        receivedDate: new Date(body.receivedDate),
        proxyHolderShareholderId: body.proxyHolderShareholderId ?? null,
        attachmentId: body.attachmentId ?? null,
        proxySharesSnapshot: snap
      }
    });
    await audit(prisma, request.userContext.id, 'CREATE', 'Proxy', created.id, body, tenantId);
    return created;
  });

  app.put('/:id', { preHandler: requireRoles(...canWriteRoles) }, async (request, reply) => {
    const tenantId = await resolveTenantIdForRequest(request);
    const { id } = z.object({ id: z.string() }).parse(request.params);
    const body = proxySchema.partial().parse(request.body);
    const existing = await prisma.proxy.findFirst({ where: { id, tenantId } });
    if (!existing) return reply.notFound();

    const nextStatus = body.status ?? existing.status;
    const nextGrantor = body.grantorId ?? existing.grantorId;

    if (body.meetingId) {
      const meeting = await prisma.meeting.findFirst({ where: { id: body.meetingId, tenantId }, select: { id: true } });
      if (!meeting) return reply.badRequest('Meeting not found in this tenant.');
    }
    if (body.grantorId) {
      const grantor = await prisma.shareholder.findFirst({ where: { id: body.grantorId, tenantId }, select: { id: true } });
      if (!grantor) return reply.badRequest('Grantor not found in this tenant.');
    }
    if (typeof body.proxyHolderShareholderId === 'string') {
      const holder = await prisma.shareholder.findFirst({ where: { id: body.proxyHolderShareholderId, tenantId }, select: { id: true } });
      if (!holder) return reply.badRequest('Proxy holder shareholder not found in this tenant.');
    }

    const snapshot = nextStatus === ProxyStatus.Verified
      ? await getShareholderActiveShares(prisma, nextGrantor, tenantId)
      : existing.proxySharesSnapshot;

    const updated = await prisma.proxy.update({
      where: { id },
      data: {
        ...body,
        receivedDate: body.receivedDate ? new Date(body.receivedDate) : undefined,
        proxySharesSnapshot: snapshot
      }
    });

    await audit(prisma, request.userContext.id, 'UPDATE', 'Proxy', id, { before: existing, after: updated }, tenantId);
    return updated;
  });

  app.delete('/:id', { preHandler: requireRoles(RoleName.Admin, RoleName.Officer) }, async (request, reply) => {
    const tenantId = await resolveTenantIdForRequest(request);
    const { id } = z.object({ id: z.string() }).parse(request.params);
    const existing = await prisma.proxy.findFirst({ where: { id, tenantId } });
    if (!existing) return reply.notFound();
    await prisma.proxy.delete({ where: { id } });
    await audit(prisma, request.userContext.id, 'DELETE', 'Proxy', id, undefined, tenantId);
    return { ok: true };
  });
}
