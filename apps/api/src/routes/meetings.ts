import { FastifyInstance } from 'fastify';
import { RoleName, VoteResult } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../lib/db.js';
import { audit } from '../lib/audit.js';
import { canPostRoles, canWriteRoles, requireRoles } from '../lib/auth.js';
import { calculateVotingSnapshot, getShareholderActiveShares } from '../lib/voting.js';

export async function meetingRoutes(app: FastifyInstance) {
  app.get('/', { preHandler: requireRoles(RoleName.Admin, RoleName.Officer, RoleName.Clerk, RoleName.ReadOnly) }, async () => {
    return prisma.meeting.findMany({ include: { snapshot: true }, orderBy: { dateTime: 'desc' } });
  });

  app.post('/', { preHandler: requireRoles(...canWriteRoles) }, async (request) => {
    const body = z.object({ title: z.string().min(1), dateTime: z.string().datetime() }).parse(request.body);
    const snapshot = await calculateVotingSnapshot(prisma);
    const created = await prisma.$transaction(async (tx) => {
      const snap = await tx.meetingSnapshot.create({
        data: {
          activeVotingShares: snapshot.activeVotingShares,
          excludedShares: snapshot.excludedShares,
          majorityThreshold: snapshot.majorityThreshold,
          rulesJson: snapshot.rulesJson
        }
      });
      return tx.meeting.create({ data: { title: body.title, dateTime: new Date(body.dateTime), snapshotId: snap.id } });
    });
    await audit(prisma, request.userContext.id, 'CREATE', 'Meeting', created.id, body);
    return created;
  });

  app.put('/:id', { preHandler: requireRoles(...canWriteRoles) }, async (request, reply) => {
    const { id } = z.object({ id: z.string() }).parse(request.params);
    const body = z.object({ title: z.string().optional(), dateTime: z.string().datetime().optional() }).parse(request.body);
    const existing = await prisma.meeting.findUnique({ where: { id } });
    if (!existing) return reply.notFound();
    const updated = await prisma.meeting.update({
      where: { id },
      data: {
        title: body.title,
        dateTime: body.dateTime ? new Date(body.dateTime) : undefined
      }
    });
    await audit(prisma, request.userContext.id, 'UPDATE', 'Meeting', id, { before: existing, after: updated });
    return updated;
  });

  app.delete('/:id', { preHandler: requireRoles(RoleName.Admin, RoleName.Officer) }, async (request) => {
    const { id } = z.object({ id: z.string() }).parse(request.params);
    await prisma.meeting.delete({ where: { id } });
    await audit(prisma, request.userContext.id, 'DELETE', 'Meeting', id);
    return { ok: true };
  });

  app.post('/:id/attendance', { preHandler: requireRoles(...canWriteRoles) }, async (request) => {
    const { id } = z.object({ id: z.string() }).parse(request.params);
    const body = z.object({ shareholderId: z.string(), present: z.boolean() }).parse(request.body);
    const row = await prisma.attendance.upsert({
      where: { meetingId_shareholderId: { meetingId: id, shareholderId: body.shareholderId } },
      update: { present: body.present },
      create: { meetingId: id, shareholderId: body.shareholderId, present: body.present }
    });
    await audit(prisma, request.userContext.id, 'UPDATE', 'Attendance', row.id, body);
    return row;
  });

  app.post('/:id/motions', { preHandler: requireRoles(...canWriteRoles) }, async (request) => {
    const { id } = z.object({ id: z.string() }).parse(request.params);
    const body = z.object({ title: z.string().min(1), text: z.string().min(1) }).parse(request.body);
    const motion = await prisma.motion.create({ data: { meetingId: id, title: body.title, text: body.text } });
    await audit(prisma, request.userContext.id, 'CREATE', 'Motion', motion.id, body);
    return motion;
  });

  app.post('/motions/:motionId/votes', { preHandler: requireRoles(...canPostRoles) }, async (request, reply) => {
    const { motionId } = z.object({ motionId: z.string() }).parse(request.params);
    const body = z.object({ yesShares: z.number().int().nonnegative(), noShares: z.number().int().nonnegative(), abstainShares: z.number().int().nonnegative() }).parse(request.body);

    const motion = await prisma.motion.findUnique({ where: { id: motionId }, include: { meeting: { include: { snapshot: true } } } });
    if (!motion) return reply.notFound();

    const represented = body.yesShares + body.noShares + body.abstainShares;
    const threshold = motion.meeting.snapshot?.majorityThreshold ?? 1;
    const result = body.yesShares >= threshold && represented > 0 ? VoteResult.Passed : VoteResult.Failed;

    const vote = await prisma.vote.create({ data: { motionId, ...body, result } });
    await audit(prisma, request.userContext.id, 'CREATE', 'Vote', vote.id, { ...body, result });
    return vote;
  });

  app.get('/:id/mode', { preHandler: requireRoles(RoleName.Admin, RoleName.Officer, RoleName.Clerk, RoleName.ReadOnly) }, async (request, reply) => {
    const { id } = z.object({ id: z.string() }).parse(request.params);
    const meeting = await prisma.meeting.findUnique({
      where: { id },
      include: {
        snapshot: true,
        attendance: { include: { shareholder: true } },
        proxies: true,
        motions: { include: { votes: true } }
      }
    });
    if (!meeting) return reply.notFound();

    let presentShares = 0;
    for (const row of meeting.attendance.filter((a) => a.present)) {
      presentShares += await getShareholderActiveShares(prisma, row.shareholderId);
    }

    const proxyShares = meeting.proxies
      .filter((p) => p.status === 'Verified')
      .reduce((sum, p) => sum + p.proxySharesSnapshot, 0);

    return {
      meeting,
      representedShares: presentShares + proxyShares,
      presentShares,
      proxyShares
    };
  });
}
