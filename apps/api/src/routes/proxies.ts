import { FastifyInstance } from 'fastify';
import { ProxyStatus, RoleName } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../lib/db.js';
import { audit } from '../lib/audit.js';
import { canWriteRoles, requireRoles } from '../lib/auth.js';
import { getShareholderActiveShares } from '../lib/voting.js';

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
    const q = z.object({ meetingId: z.string().optional() }).parse(request.query);
    return prisma.proxy.findMany({
      where: q.meetingId ? { meetingId: q.meetingId } : undefined,
      include: { grantor: true },
      orderBy: { createdAt: 'desc' }
    });
  });

  app.post('/', { preHandler: requireRoles(...canWriteRoles) }, async (request) => {
    const body = proxySchema.parse(request.body);
    const snap = await getShareholderActiveShares(prisma, body.grantorId);
    const created = await prisma.proxy.create({
      data: {
        ...body,
        receivedDate: new Date(body.receivedDate),
        proxyHolderShareholderId: body.proxyHolderShareholderId ?? null,
        attachmentId: body.attachmentId ?? null,
        proxySharesSnapshot: snap
      }
    });
    await audit(prisma, request.userContext.id, 'CREATE', 'Proxy', created.id, body);
    return created;
  });

  app.put('/:id', { preHandler: requireRoles(...canWriteRoles) }, async (request, reply) => {
    const { id } = z.object({ id: z.string() }).parse(request.params);
    const body = proxySchema.partial().parse(request.body);
    const existing = await prisma.proxy.findUnique({ where: { id } });
    if (!existing) return reply.notFound();

    const nextStatus = body.status ?? existing.status;
    const nextGrantor = body.grantorId ?? existing.grantorId;
    const snapshot = nextStatus === ProxyStatus.Verified ? await getShareholderActiveShares(prisma, nextGrantor) : existing.proxySharesSnapshot;

    const updated = await prisma.proxy.update({
      where: { id },
      data: {
        ...body,
        receivedDate: body.receivedDate ? new Date(body.receivedDate) : undefined,
        proxySharesSnapshot: snapshot
      }
    });

    await audit(prisma, request.userContext.id, 'UPDATE', 'Proxy', id, { before: existing, after: updated });
    return updated;
  });

  app.delete('/:id', { preHandler: requireRoles(RoleName.Admin, RoleName.Officer) }, async (request) => {
    const { id } = z.object({ id: z.string() }).parse(request.params);
    await prisma.proxy.delete({ where: { id } });
    await audit(prisma, request.userContext.id, 'DELETE', 'Proxy', id);
    return { ok: true };
  });
}
