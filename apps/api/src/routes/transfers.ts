import { FastifyInstance } from 'fastify';
import { LotStatus, RoleName, TransferStatus } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../lib/db.js';
import { audit } from '../lib/audit.js';
import { canPostRoles, canWriteRoles, requireRoles } from '../lib/auth.js';
import { nextAutoCertificateNumber } from '../lib/certificates.js';
import { resolveTenantIdForRequest } from '../lib/tenant.js';

const lineSchema = z.object({ lotId: z.string(), sharesTaken: z.number().int().positive() });
const transferSchema = z.object({
  fromOwnerId: z.string().nullable().optional(),
  toOwnerId: z.string().nullable().optional(),
  meetingId: z.string().nullable().optional(),
  transferDate: z.string().datetime().optional(),
  notes: z.string().optional(),
  lines: z.array(lineSchema).default([])
});

export async function transferRoutes(app: FastifyInstance) {
  app.get('/', { preHandler: requireRoles(RoleName.Admin, RoleName.Officer, RoleName.Clerk, RoleName.ReadOnly) }, async (request) => {
    const tenantId = await resolveTenantIdForRequest(request);
    return prisma.transfer.findMany({
      where: { tenantId },
      include: {
        lines: { include: { lot: true } },
        fromOwner: true,
        toOwner: true
      },
      orderBy: [{ transferDate: 'desc' }, { createdAt: 'desc' }]
    });
  });

  app.post('/', { preHandler: requireRoles(...canWriteRoles) }, async (request) => {
    const tenantId = await resolveTenantIdForRequest(request);
    const body = transferSchema.parse(request.body);

    if (body.fromOwnerId) {
      const owner = await prisma.shareholder.findFirst({ where: { id: body.fromOwnerId, tenantId }, select: { id: true } });
      if (!owner) return request.server.httpErrors.badRequest('From owner not found in this tenant.');
    }
    if (body.toOwnerId) {
      const owner = await prisma.shareholder.findFirst({ where: { id: body.toOwnerId, tenantId }, select: { id: true } });
      if (!owner) return request.server.httpErrors.badRequest('To owner not found in this tenant.');
    }
    if (body.meetingId) {
      const meeting = await prisma.meeting.findFirst({ where: { id: body.meetingId, tenantId }, select: { id: true } });
      if (!meeting) return request.server.httpErrors.badRequest('Meeting not found in this tenant.');
    }
    if (body.lines.length) {
      const lotIds = body.lines.map((line) => line.lotId);
      const count = await prisma.shareLot.count({ where: { tenantId, id: { in: lotIds } } });
      if (count !== new Set(lotIds).size) {
        return request.server.httpErrors.badRequest('One or more transfer lots were not found in this tenant.');
      }
    }

    const created = await prisma.transfer.create({
      data: {
        tenantId,
        fromOwnerId: body.fromOwnerId ?? null,
        toOwnerId: body.toOwnerId ?? null,
        meetingId: body.meetingId ?? null,
        transferDate: body.transferDate ? new Date(body.transferDate) : new Date(),
        notes: body.notes,
        lines: { create: body.lines.map((line) => ({ ...line, tenantId })) }
      },
      include: { lines: { include: { lot: true } }, fromOwner: true, toOwner: true }
    });
    await audit(prisma, request.userContext.id, 'CREATE', 'Transfer', created.id, body, tenantId);
    return created;
  });

  app.get('/:id', { preHandler: requireRoles(RoleName.Admin, RoleName.Officer, RoleName.Clerk, RoleName.ReadOnly) }, async (request, reply) => {
    const tenantId = await resolveTenantIdForRequest(request);
    const { id } = z.object({ id: z.string() }).parse(request.params);
    const row = await prisma.transfer.findFirst({
      where: { id, tenantId },
      include: { lines: { include: { lot: true } }, fromOwner: true, toOwner: true }
    });
    if (!row) return reply.notFound();
    return row;
  });

  app.put('/:id', { preHandler: requireRoles(...canWriteRoles) }, async (request, reply) => {
    const tenantId = await resolveTenantIdForRequest(request);
    const { id } = z.object({ id: z.string() }).parse(request.params);
    const body = transferSchema.partial().parse(request.body);
    const existing = await prisma.transfer.findFirst({ where: { id, tenantId }, include: { lines: true } });
    if (!existing) return reply.notFound();
    if (existing.status === TransferStatus.POSTED) return reply.badRequest('Posted transfers are immutable');

    if (body.fromOwnerId) {
      const owner = await prisma.shareholder.findFirst({ where: { id: body.fromOwnerId, tenantId }, select: { id: true } });
      if (!owner) return reply.badRequest('From owner not found in this tenant.');
    }
    if (body.toOwnerId) {
      const owner = await prisma.shareholder.findFirst({ where: { id: body.toOwnerId, tenantId }, select: { id: true } });
      if (!owner) return reply.badRequest('To owner not found in this tenant.');
    }
    if (body.meetingId) {
      const meeting = await prisma.meeting.findFirst({ where: { id: body.meetingId, tenantId }, select: { id: true } });
      if (!meeting) return reply.badRequest('Meeting not found in this tenant.');
    }
    if (body.lines?.length) {
      const lotIds = body.lines.map((line) => line.lotId);
      const count = await prisma.shareLot.count({ where: { tenantId, id: { in: lotIds } } });
      if (count !== new Set(lotIds).size) {
        return reply.badRequest('One or more transfer lots were not found in this tenant.');
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      if (body.lines) {
        await tx.transferLine.deleteMany({ where: { transferId: id, tenantId } });
      }
      return tx.transfer.update({
        where: { id },
        data: {
          fromOwnerId: body.fromOwnerId ?? undefined,
          toOwnerId: body.toOwnerId ?? undefined,
          meetingId: body.meetingId ?? undefined,
          transferDate: body.transferDate ? new Date(body.transferDate) : undefined,
          notes: body.notes,
          lines: body.lines ? { create: body.lines.map((line) => ({ ...line, tenantId })) } : undefined
        },
        include: { lines: { include: { lot: true } }, fromOwner: true, toOwner: true }
      });
    });

    await audit(prisma, request.userContext.id, 'UPDATE', 'Transfer', id, { before: existing, after: updated }, tenantId);
    return updated;
  });

  app.delete('/:id', { preHandler: requireRoles(RoleName.Admin, RoleName.Officer) }, async (request, reply) => {
    const tenantId = await resolveTenantIdForRequest(request);
    const { id } = z.object({ id: z.string() }).parse(request.params);
    const existing = await prisma.transfer.findFirst({ where: { id, tenantId } });
    if (!existing) return reply.notFound();
    if (existing.status === TransferStatus.POSTED) return reply.badRequest('Posted transfers are immutable');
    await prisma.transfer.delete({ where: { id } });
    await audit(prisma, request.userContext.id, 'DELETE', 'Transfer', id, undefined, tenantId);
    return { ok: true };
  });

  app.post('/:id/post', { preHandler: requireRoles(...canPostRoles) }, async (request, reply) => {
    const tenantId = await resolveTenantIdForRequest(request);
    const { id } = z.object({ id: z.string() }).parse(request.params);

    const result = await prisma.$transaction(async (tx) => {
      const transfer = await tx.transfer.findFirst({ where: { id, tenantId }, include: { lines: true } });
      if (!transfer) throw new Error('not_found');
      if (transfer.status === TransferStatus.POSTED) throw new Error('already_posted');
      if (transfer.lines.length === 0) throw new Error('no_lines');

      for (const line of transfer.lines) {
        const lot = await tx.shareLot.findFirst({ where: { id: line.lotId, tenantId } });
        if (!lot) throw new Error(`missing_lot:${line.lotId}`);
        if (lot.shares < line.sharesTaken) throw new Error(`insufficient_lot:${line.lotId}`);

        const nextShares = lot.shares - line.sharesTaken;
        await tx.shareLot.update({
          where: { id: lot.id },
          data: {
            shares: nextShares,
            status: nextShares === 0 ? LotStatus.TransferredOut : lot.status
          }
        });

        if (transfer.toOwnerId) {
          const certificateNumber = await nextAutoCertificateNumber(tx, tenantId);
          await tx.shareLot.create({
            data: {
              tenantId,
              ownerId: transfer.toOwnerId,
              shares: line.sharesTaken,
              status: LotStatus.Active,
              certificateNumber,
              source: `Transfer ${transfer.id}`,
              notes: transfer.notes
            }
          });
        }
      }

      return tx.transfer.update({
        where: { id },
        data: { status: TransferStatus.POSTED, postedAt: new Date() },
        include: { lines: { include: { lot: true } }, fromOwner: true, toOwner: true }
      });
    }).catch((e: Error) => {
      if (e.message === 'not_found') return null;
      if (e.message === 'already_posted') throw reply.badRequest('Transfer already posted');
      if (e.message === 'no_lines') throw reply.badRequest('Transfer has no lines');
      if (e.message.startsWith('insufficient_lot')) throw reply.badRequest('Insufficient shares in lot');
      throw e;
    });

    if (!result) return reply.notFound();
    await audit(prisma, request.userContext.id, 'POST', 'Transfer', id, { status: 'POSTED' }, tenantId);
    return result;
  });
}
