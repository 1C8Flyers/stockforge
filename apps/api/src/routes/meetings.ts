import { FastifyInstance } from 'fastify';
import { MotionType, RoleName, VoteResult } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../lib/db.js';
import { audit } from '../lib/audit.js';
import { canPostRoles, canWriteRoles, requireRoles } from '../lib/auth.js';
import { calculateVotingSnapshot, getShareholderActiveShares } from '../lib/voting.js';

const ballotChoiceSchema = z.enum(['yes', 'no', 'abstain']);
const motionTypeSchema = z.enum(['STANDARD', 'ELECTION']);

function shareholderName(s: { firstName: string | null; lastName: string | null; entityName: string | null }) {
  return s.entityName || `${s.firstName ?? ''} ${s.lastName ?? ''}`.trim();
}

function getVerifiedProxyDelegation(
  proxies: Array<{ status: string; grantorId: string; proxySharesSnapshot: number; proxyHolderShareholderId: string | null }>
) {
  const proxiedGrantorIds = new Set<string>();
  const delegatedToHolder = new Map<string, number>();

  for (const p of proxies) {
    if (p.status !== 'Verified') continue;
    proxiedGrantorIds.add(p.grantorId);
    if (p.proxyHolderShareholderId) {
      delegatedToHolder.set(
        p.proxyHolderShareholderId,
        (delegatedToHolder.get(p.proxyHolderShareholderId) || 0) + p.proxySharesSnapshot
      );
    }
  }

  return { proxiedGrantorIds, delegatedToHolder };
}

export async function meetingRoutes(app: FastifyInstance) {
  app.get('/', { preHandler: requireRoles(RoleName.Admin, RoleName.Officer, RoleName.Clerk, RoleName.ReadOnly) }, async () => {
    return prisma.meeting.findMany({ include: { snapshot: true }, orderBy: { dateTime: 'desc' } });
  });

  app.get(
    '/pending-summary',
    { preHandler: requireRoles(RoleName.Admin, RoleName.Officer, RoleName.Clerk, RoleName.ReadOnly) },
    async () => {
      const [openMotions, pendingProxies] = await Promise.all([
        prisma.motion.count({ where: { isClosed: false } }),
        prisma.proxy.count({ where: { status: 'Draft' } })
      ]);

      return {
        openMotions,
        pendingProxies,
        totalPending: openMotions + pendingProxies
      };
    }
  );

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
    const body = z
      .object({
        title: z.string().optional(),
        text: z.string().optional(),
        type: motionTypeSchema.default('STANDARD'),
        officeTitle: z.string().optional(),
        candidates: z.array(z.string().min(1)).optional()
      })
      .parse(request.body);

    const type = body.type as MotionType;
    const officeTitle = type === MotionType.ELECTION ? (body.officeTitle || '').trim() : null;
    const candidates = type === MotionType.ELECTION ? (body.candidates || []).map((c) => c.trim()).filter(Boolean) : [];

    if (type === MotionType.ELECTION) {
      if (!officeTitle) throw app.httpErrors.badRequest('Election motions require an office title.');
      if (candidates.length < 2) throw app.httpErrors.badRequest('Election motions require at least two candidates.');
    }

    const title = type === MotionType.ELECTION
      ? `Election: ${officeTitle}`
      : (body.title || '').trim();
    const text = type === MotionType.ELECTION
      ? `Election for ${officeTitle}. Candidates: ${candidates.join(', ')}`
      : (body.text || '').trim();

    if (type === MotionType.STANDARD) {
      if (!title) throw app.httpErrors.badRequest('Standard motions require a title.');
      if (!text) throw app.httpErrors.badRequest('Standard motions require motion text.');
    }

    const motion = await prisma.motion.create({
      data: {
        meetingId: id,
        title,
        text,
        type,
        officeTitle: officeTitle || null,
        candidatesJson: type === MotionType.ELECTION ? candidates : undefined
      }
    });
    await audit(prisma, request.userContext.id, 'CREATE', 'Motion', motion.id, body);
    return motion;
  });

  app.get('/:id/present-voters', { preHandler: requireRoles(RoleName.Admin, RoleName.Officer, RoleName.Clerk, RoleName.ReadOnly) }, async (request) => {
    const { id } = z.object({ id: z.string() }).parse(request.params);
    const rows = await prisma.attendance.findMany({
      where: { meetingId: id, present: true },
      include: { shareholder: true }
    });
    const proxies = await prisma.proxy.findMany({ where: { meetingId: id } });
    const { proxiedGrantorIds, delegatedToHolder } = getVerifiedProxyDelegation(proxies);

    const voters = await Promise.all(
      rows.map(async (row) => ({
        shareholderId: row.shareholderId,
        name: shareholderName(row.shareholder),
        shares:
          (proxiedGrantorIds.has(row.shareholderId) ? 0 : await getShareholderActiveShares(prisma, row.shareholderId)) +
          (delegatedToHolder.get(row.shareholderId) || 0)
      }))
    );

    return voters.filter((v) => v.shares > 0).sort((a, b) => b.shares - a.shares || a.name.localeCompare(b.name));
  });

  app.post('/motions/:motionId/votes', { preHandler: requireRoles(...canPostRoles) }, async (request, reply) => {
    const { motionId } = z.object({ motionId: z.string() }).parse(request.params);
    const rawBody = request.body;

    const motion = await prisma.motion.findUnique({
      where: { id: motionId },
      include: { meeting: { include: { snapshot: true, attendance: true, proxies: true } } }
    });
    if (!motion) return reply.notFound();
    if (motion.isClosed) {
      return reply.code(409).send({ error: 'Motion is closed. Reopen it before recording additional votes.' });
    }

    const presentIds = new Set(motion.meeting.attendance.filter((a) => a.present).map((a) => a.shareholderId));
    const { proxiedGrantorIds, delegatedToHolder } = getVerifiedProxyDelegation(motion.meeting.proxies);

    const effectiveSharesForBallot = async (shareholderId: string) => {
      const activeShares = proxiedGrantorIds.has(shareholderId) ? 0 : await getShareholderActiveShares(prisma, shareholderId);
      return activeShares + (delegatedToHolder.get(shareholderId) || 0);
    };

    let yesShares = 0;
    let noShares = 0;
    let abstainShares = 0;
    let details: unknown = rawBody;

    if (motion.type === MotionType.ELECTION) {
      const body = z.object({ ballots: z.array(z.object({ shareholderId: z.string(), candidate: z.string().min(1) })).min(1) }).parse(rawBody);
      const candidates = Array.isArray(motion.candidatesJson) ? (motion.candidatesJson as string[]) : [];
      const candidateSet = new Set(candidates);

      const seen = new Set<string>();
      const totals = new Map<string, number>();
      const resolvedBallots: Array<{ shareholderId: string; candidate: string; shares: number }> = [];

      for (const ballot of body.ballots) {
        if (!presentIds.has(ballot.shareholderId)) {
          return reply.code(400).send({ error: 'Ballot includes shareholder not marked present for this meeting.' });
        }
        if (!candidateSet.has(ballot.candidate)) {
          return reply.code(400).send({ error: `Invalid candidate: ${ballot.candidate}` });
        }
        if (seen.has(ballot.shareholderId)) {
          return reply.code(400).send({ error: 'Duplicate ballot for the same shareholder is not allowed.' });
        }
        seen.add(ballot.shareholderId);

        const shares = await effectiveSharesForBallot(ballot.shareholderId);
        totals.set(ballot.candidate, (totals.get(ballot.candidate) || 0) + shares);
        resolvedBallots.push({ shareholderId: ballot.shareholderId, candidate: ballot.candidate, shares });
      }

      const totalsArray = candidates.map((candidate) => ({ candidate, shares: totals.get(candidate) || 0 }));
      const topShares = Math.max(...totalsArray.map((t) => t.shares), 0);
      const winners = totalsArray.filter((t) => t.shares === topShares && t.shares > 0).map((t) => t.candidate);

      details = {
        type: 'ELECTION',
        officeTitle: motion.officeTitle,
        totals: totalsArray,
        winners,
        ballots: resolvedBallots
      };

      yesShares = topShares;
      noShares = 0;
      abstainShares = 0;
    } else {
      const body = z
        .union([
          z.object({ yesShares: z.number().int().nonnegative(), noShares: z.number().int().nonnegative(), abstainShares: z.number().int().nonnegative() }),
          z.object({ ballots: z.array(z.object({ shareholderId: z.string(), choice: ballotChoiceSchema })).min(1) })
        ])
        .parse(rawBody);

      if ('ballots' in body) {
        const seen = new Set<string>();
        const resolvedBallots: Array<{ shareholderId: string; choice: 'yes' | 'no' | 'abstain'; shares: number }> = [];

        for (const ballot of body.ballots) {
          if (!presentIds.has(ballot.shareholderId)) {
            return reply.code(400).send({ error: 'Ballot includes shareholder not marked present for this meeting.' });
          }
          if (seen.has(ballot.shareholderId)) {
            return reply.code(400).send({ error: 'Duplicate ballot for the same shareholder is not allowed.' });
          }
          seen.add(ballot.shareholderId);

          const shares = await effectiveSharesForBallot(ballot.shareholderId);
          resolvedBallots.push({ shareholderId: ballot.shareholderId, choice: ballot.choice, shares });
          if (ballot.choice === 'yes') yesShares += shares;
          else if (ballot.choice === 'no') noShares += shares;
          else abstainShares += shares;
        }

        details = { type: 'STANDARD', ballots: resolvedBallots };
      } else {
        yesShares = body.yesShares;
        noShares = body.noShares;
        abstainShares = body.abstainShares;
      }
    }

    const represented = yesShares + noShares + abstainShares;
    const threshold = motion.meeting.snapshot?.majorityThreshold ?? 1;
    const result = motion.type === MotionType.ELECTION
      ? (represented > 0 ? VoteResult.Passed : VoteResult.Failed)
      : (yesShares >= threshold && represented > 0 ? VoteResult.Passed : VoteResult.Failed);

    const vote = await prisma.$transaction(async (tx) => {
      const created = await tx.vote.create({ data: { motionId, yesShares, noShares, abstainShares, result, detailsJson: details as any } });
      await tx.motion.update({ where: { id: motionId }, data: { isClosed: true } });
      return created;
    });
    await audit(prisma, request.userContext.id, 'CREATE', 'Vote', vote.id, { yesShares, noShares, abstainShares, result, details });
    return vote;
  });

  app.post('/motions/:motionId/reopen', { preHandler: requireRoles(...canPostRoles) }, async (request, reply) => {
    const { motionId } = z.object({ motionId: z.string() }).parse(request.params);
    const existing = await prisma.motion.findUnique({ where: { id: motionId } });
    if (!existing) return reply.notFound();

    const updated = await prisma.motion.update({ where: { id: motionId }, data: { isClosed: false } });
    await audit(prisma, request.userContext.id, 'UPDATE', 'Motion', motionId, { before: { isClosed: existing.isClosed }, after: { isClosed: updated.isClosed } });
    return updated;
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
    const { proxiedGrantorIds } = getVerifiedProxyDelegation(meeting.proxies as any);
    for (const row of meeting.attendance.filter((a) => a.present)) {
      if (proxiedGrantorIds.has(row.shareholderId)) continue;
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
