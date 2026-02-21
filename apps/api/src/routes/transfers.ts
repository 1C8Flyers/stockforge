import { FastifyInstance } from 'fastify';
import { LotStatus, RoleName, TransferStatus } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../lib/db.js';
import { audit } from '../lib/audit.js';
import { canPostRoles, canWriteRoles, requireRoles } from '../lib/auth.js';

const lineSchema = z.object({ lotId: z.string(), sharesTaken: z.number().int().positive() });
const transferSchema = z.object({
  fromOwnerId: z.string().nullable().optional(),
  toOwnerId: z.string().nullable().optional(),
  meetingId: z.string().nullable().optional(),
  notes: z.string().optional(),
  lines: z.array(lineSchema).default([])
});

export async function transferRoutes(app: FastifyInstance) {
  app.get('/', { preHandler: requireRoles(RoleName.Admin, RoleName.Officer, RoleName.Clerk, RoleName.ReadOnly) }, async () => {
    return prisma.transfer.findMany({ include: { lines: true }, orderBy: { createdAt: 'desc' } });
  });

  app.post('/', { preHandler: requireRoles(...canWriteRoles) }, async (request) => {
    const body = transferSchema.parse(request.body);
    const created = await prisma.transfer.create({
      data: {
        fromOwnerId: body.fromOwnerId ?? null,
        toOwnerId: body.toOwnerId ?? null,
        meetingId: body.meetingId ?? null,
        notes: body.notes,
        lines: { create: body.lines }
      },
      include: { lines: true }
    });
    await audit(prisma, request.userContext.id, 'CREATE', 'Transfer', created.id, body);
    return created;
  });

  app.get('/:id', { preHandler: requireRoles(RoleName.Admin, RoleName.Officer, RoleName.Clerk, RoleName.ReadOnly) }, async (request, reply) => {
    const { id } = z.object({ id: z.string() }).parse(request.params);
    const row = await prisma.transfer.findUnique({ where: { id }, include: { lines: true } });
    if (!row) return reply.notFound();
    return row;
  });

  app.put('/:id', { preHandler: requireRoles(...canWriteRoles) }, async (request, reply) => {
    const { id } = z.object({ id: z.string() }).parse(request.params);
    const body = transferSchema.partial().parse(request.body);
    const existing = await prisma.transfer.findUnique({ where: { id }, include: { lines: true } });
    if (!existing) return reply.notFound();
    if (existing.status === TransferStatus.POSTED) return reply.badRequest('Posted transfers are immutable');

    const updated = await prisma.$transaction(async (tx) => {
      if (body.lines) {
        await tx.transferLine.deleteMany({ where: { transferId: id } });
      }
      return tx.transfer.update({
        where: { id },
        data: {
          fromOwnerId: body.fromOwnerId ?? undefined,
          toOwnerId: body.toOwnerId ?? undefined,
          meetingId: body.meetingId ?? undefined,
          notes: body.notes,
          lines: body.lines ? { create: body.lines } : undefined
        },
        include: { lines: true }
      });
    });

    await audit(prisma, request.userContext.id, 'UPDATE', 'Transfer', id, { before: existing, after: updated });
    return updated;
  });

  app.delete('/:id', { preHandler: requireRoles(RoleName.Admin, RoleName.Officer) }, async (request, reply) => {
    const { id } = z.object({ id: z.string() }).parse(request.params);
    const existing = await prisma.transfer.findUnique({ where: { id } });
    if (!existing) return reply.notFound();
    if (existing.status === TransferStatus.POSTED) return reply.badRequest('Posted transfers are immutable');
    await prisma.transfer.delete({ where: { id } });
    await audit(prisma, request.userContext.id, 'DELETE', 'Transfer', id);
    return { ok: true };
  });

  app.post('/:id/post', { preHandler: requireRoles(...canPostRoles) }, async (request, reply) => {
    const { id } = z.object({ id: z.string() }).parse(request.params);

    const result = await prisma.$transaction(async (tx) => {
      const transfer = await tx.transfer.findUnique({ where: { id }, include: { lines: true } });
      if (!transfer) throw new Error('not_found');
      if (transfer.status === TransferStatus.POSTED) throw new Error('already_posted');
      if (transfer.lines.length === 0) throw new Error('no_lines');

      for (const line of transfer.lines) {
        const lot = await tx.shareLot.findUnique({ where: { id: line.lotId } });
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
          await tx.shareLot.create({
            data: {
              ownerId: transfer.toOwnerId,
              shares: line.sharesTaken,
              status: LotStatus.Active,
              source: `Transfer ${transfer.id}`,
              notes: transfer.notes
            }
          });
        }
      }

      return tx.transfer.update({
        where: { id },
        data: { status: TransferStatus.POSTED, postedAt: new Date() },
        include: { lines: true }
      });
    }).catch((e: Error) => {
      if (e.message === 'not_found') return null;
      if (e.message === 'already_posted') throw reply.badRequest('Transfer already posted');
      if (e.message === 'no_lines') throw reply.badRequest('Transfer has no lines');
      if (e.message.startsWith('insufficient_lot')) throw reply.badRequest('Insufficient shares in lot');
      throw e;
    });

    if (!result) return reply.notFound();
    await audit(prisma, request.userContext.id, 'POST', 'Transfer', id, { status: 'POSTED' });
    return result;
  });
}
