import { RoleName, ShareholderStatus } from '@prisma/client';
import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireRoles } from '../lib/auth.js';
import { prisma } from '../lib/db.js';
import { calculateVotingSnapshot, getExcludeDisputed } from '../lib/voting.js';
import { resolveTenantIdForRequest } from '../lib/tenant.js';

function shareholderName(s: { firstName: string | null; lastName: string | null; entityName: string | null }) {
  return s.entityName || `${s.firstName ?? ''} ${s.lastName ?? ''}`.trim();
}

export async function dashboardRoutes(app: FastifyInstance) {
  app.get('/', { preHandler: requireRoles(RoleName.Admin, RoleName.Officer, RoleName.Clerk, RoleName.ReadOnly) }, async (request) => {
    const tenantId = await resolveTenantIdForRequest(request);
    const query = z.object({ blocIds: z.string().optional() }).parse(request.query);
    const snap = await calculateVotingSnapshot(prisma, tenantId);
    const excludeDisputed = await getExcludeDisputed(prisma, tenantId);

    const shareholders = await prisma.shareholder.findMany({ where: { tenantId }, include: { lots: true } });
    const top = shareholders
      .map((s) => {
        const ownerExcluded =
          s.status === ShareholderStatus.Inactive ||
          s.status === ShareholderStatus.DeceasedOutstanding ||
          s.status === ShareholderStatus.DeceasedSurrendered;
        const activeShares = ownerExcluded
          ? 0
          : s.lots
              .filter((l) => l.status === 'Active' || (!excludeDisputed && l.status === 'Disputed'))
              .reduce((sum, l) => sum + l.shares, 0);
        return { id: s.id, name: shareholderName(s), activeShares };
      })
      .sort((a, b) => b.activeShares - a.activeShares)
      .slice(0, 10);

    const blocSet = new Set((query.blocIds || '').split(',').filter(Boolean));
    const blocShares = top
      .filter((s) => blocSet.has(s.id))
      .reduce((sum, s) => sum + s.activeShares, 0);

    const recentActivity = await prisma.auditLog.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: { user: true }
    });

    return {
      activeVotingShares: snap.activeVotingShares,
      excludedBreakdown: snap.breakdown,
      majorityThreshold: snap.majorityThreshold,
      topShareholders: top,
      blocBuilder: {
        selectedIds: [...blocSet],
        shares: blocShares,
        percent: snap.activeVotingShares === 0 ? 0 : Number(((blocShares / snap.activeVotingShares) * 100).toFixed(2))
      },
      recentActivity
    };
  });
}
