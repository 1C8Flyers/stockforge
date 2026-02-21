import { RoleName } from '@prisma/client';
import { FastifyInstance } from 'fastify';
import { stringify } from 'csv-stringify/sync';
import { z } from 'zod';
import { requireRoles } from '../lib/auth.js';
import { prisma } from '../lib/db.js';
import { getExcludeDisputed } from '../lib/voting.js';

function shareholderName(s: { firstName: string | null; lastName: string | null; entityName: string | null }) {
  return s.entityName || `${s.firstName ?? ''} ${s.lastName ?? ''}`.trim();
}

export async function reportRoutes(app: FastifyInstance) {
  app.get('/cap-table.csv', { preHandler: requireRoles(RoleName.Admin, RoleName.Officer, RoleName.Clerk, RoleName.ReadOnly) }, async (_request, reply) => {
    const excludeDisputed = await getExcludeDisputed(prisma);
    const rows = await prisma.shareholder.findMany({ include: { lots: true } });

    const data = rows.map((s) => {
      const activeShares = s.lots
        .filter((l) => l.status === 'Active' || (!excludeDisputed && l.status === 'Disputed'))
        .reduce((sum, l) => sum + l.shares, 0);
      const excludedShares = s.lots.reduce((sum, l) => sum + l.shares, 0) - activeShares;
      return {
        name: shareholderName(s),
        status: s.status,
        activeShares,
        excludedShares,
        email: s.email || '',
        phone: s.phone || ''
      };
    });

    const csv = stringify(data, { header: true });
    reply.header('Content-Type', 'text/csv');
    return reply.send(csv);
  });

  app.get('/meeting-proxy.csv', { preHandler: requireRoles(RoleName.Admin, RoleName.Officer, RoleName.Clerk, RoleName.ReadOnly) }, async (request, reply) => {
    const { meetingId } = z.object({ meetingId: z.string() }).parse(request.query);
    const proxies = await prisma.proxy.findMany({
      where: { meetingId },
      include: { grantor: true }
    });

    const csv = stringify(
      proxies.map((p) => ({
        meetingId,
        grantor: shareholderName(p.grantor),
        proxyHolderName: p.proxyHolderName,
        status: p.status,
        proxySharesSnapshot: p.proxySharesSnapshot,
        receivedDate: p.receivedDate.toISOString()
      })),
      { header: true }
    );

    reply.header('Content-Type', 'text/csv');
    return reply.send(csv);
  });
}
