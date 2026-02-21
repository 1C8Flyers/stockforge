import { RoleName, ShareholderStatus } from '@prisma/client';
import { FastifyInstance } from 'fastify';
import { stringify } from 'csv-stringify/sync';
import PDFDocument from 'pdfkit';
import { z } from 'zod';
import { requireRoles } from '../lib/auth.js';
import { prisma } from '../lib/db.js';
import { getExcludeDisputed } from '../lib/voting.js';

function shareholderName(s: { firstName: string | null; lastName: string | null; entityName: string | null }) {
  return s.entityName || `${s.firstName ?? ''} ${s.lastName ?? ''}`.trim();
}

function renderSimplePdf(title: string, subtitle: string, headers: string[], rows: string[][]): Promise<Buffer> {
  return new Promise((resolve) => {
    const doc = new PDFDocument({ size: 'LETTER', margin: 40 });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));

    doc.fontSize(18).text(title);
    doc.moveDown(0.3);
    doc.fontSize(10).fillColor('#666666').text(subtitle);
    doc.moveDown();

    doc.fillColor('#000000').fontSize(10);
    doc.text(headers.join('  |  '), { underline: true });
    doc.moveDown(0.3);

    for (const row of rows) {
      const line = row.join('  |  ');
      doc.text(line, { lineGap: 2 });
      if (doc.y > 730) doc.addPage();
    }

    doc.end();
  });
}

export async function reportRoutes(app: FastifyInstance) {
  app.get('/cap-table.csv', { preHandler: requireRoles(RoleName.Admin, RoleName.Officer, RoleName.Clerk, RoleName.ReadOnly) }, async (_request, reply) => {
    const excludeDisputed = await getExcludeDisputed(prisma);
    const rows = await prisma.shareholder.findMany({ include: { lots: true } });

    const data = rows.map((s) => {
      const ownerExcluded =
        s.status === ShareholderStatus.Inactive ||
        s.status === ShareholderStatus.DeceasedOutstanding ||
        s.status === ShareholderStatus.DeceasedSurrendered;
      const activeShares = ownerExcluded
        ? 0
        : s.lots
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

  app.get('/cap-table.pdf', { preHandler: requireRoles(RoleName.Admin, RoleName.Officer, RoleName.Clerk, RoleName.ReadOnly) }, async (_request, reply) => {
    const excludeDisputed = await getExcludeDisputed(prisma);
    const rows = await prisma.shareholder.findMany({ include: { lots: true } });

    const data = rows.map((s) => {
      const ownerExcluded =
        s.status === ShareholderStatus.Inactive ||
        s.status === ShareholderStatus.DeceasedOutstanding ||
        s.status === ShareholderStatus.DeceasedSurrendered;
      const activeShares = ownerExcluded
        ? 0
        : s.lots
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

    const pdf = await renderSimplePdf(
      'Ownership Report (Cap Table)',
      `Generated ${new Date().toLocaleString()}`,
      ['Name', 'Status', 'Active', 'Excluded', 'Email', 'Phone'],
      data.map((r) => [r.name, r.status, String(r.activeShares), String(r.excludedShares), r.email || '—', r.phone || '—'])
    );

    reply.header('Content-Type', 'application/pdf');
    reply.header('Content-Disposition', 'attachment; filename="ownership-report.pdf"');
    return reply.send(pdf);
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

  app.get('/meeting-proxy.pdf', { preHandler: requireRoles(RoleName.Admin, RoleName.Officer, RoleName.Clerk, RoleName.ReadOnly) }, async (request, reply) => {
    const { meetingId } = z.object({ meetingId: z.string() }).parse(request.query);
    const proxies = await prisma.proxy.findMany({
      where: { meetingId },
      include: { grantor: true }
    });

    const pdf = await renderSimplePdf(
      'Meeting Proxy Report',
      `Meeting ${meetingId} • Generated ${new Date().toLocaleString()}`,
      ['Grantor', 'Proxy Holder', 'Status', 'Shares', 'Received'],
      proxies.map((p) => [
        shareholderName(p.grantor),
        p.proxyHolderName,
        p.status,
        String(p.proxySharesSnapshot),
        p.receivedDate.toLocaleDateString()
      ])
    );

    reply.header('Content-Type', 'application/pdf');
    reply.header('Content-Disposition', `attachment; filename="meeting-proxy-${meetingId}.pdf"`);
    return reply.send(pdf);
  });
}
