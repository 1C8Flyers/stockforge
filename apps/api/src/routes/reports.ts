import { RoleName, ShareholderStatus } from '@prisma/client';
import { FastifyInstance } from 'fastify';
import { stringify } from 'csv-stringify/sync';
import PDFDocument from 'pdfkit';
import { z } from 'zod';
import { requireRoles } from '../lib/auth.js';
import { prisma } from '../lib/db.js';
import { getExcludeDisputed, getShareholderActiveShares } from '../lib/voting.js';
import { DEFAULT_TENANT_ID, resolveTenantIdForRequest } from '../lib/tenant.js';

function shareholderName(s: { firstName: string | null; lastName: string | null; entityName: string | null }) {
  return s.entityName || `${s.firstName ?? ''} ${s.lastName ?? ''}`.trim();
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

type PdfColumn = {
  key: string;
  label: string;
  width: number;
  align?: 'left' | 'right';
};

function renderSimplePdf(title: string, subtitle: string, columns: PdfColumn[], rows: Record<string, unknown>[]): Promise<Buffer> {
  return new Promise((resolve) => {
    const doc = new PDFDocument({ size: 'LETTER', margin: 40 });
    const chunks: Buffer[] = [];
    const tableWidth = columns.reduce((sum, c) => sum + c.width, 0);
    const minRowHeight = 22;
    const cellPaddingX = 6;
    const cellPaddingY = 6;
    const pageBottom = () => doc.page.height - doc.page.margins.bottom;

    const getRowHeight = (row: Record<string, unknown>) => {
      let maxHeight = 0;
      for (const col of columns) {
        doc.font('Helvetica').fontSize(9);
        const text = String(row[col.key] ?? '');
        const cellHeight = doc.heightOfString(text, {
          width: col.width - cellPaddingX * 2,
          align: col.align === 'right' ? 'right' : 'left'
        });
        maxHeight = Math.max(maxHeight, cellHeight);
      }
      return Math.max(minRowHeight, maxHeight + cellPaddingY * 2);
    };

    const drawHeaderRow = (y: number) => {
      let x = doc.page.margins.left;
      doc.save();
      doc.rect(x, y, tableWidth, minRowHeight).fill('#f1f5f9');
      doc.restore();
      doc.strokeColor('#cbd5e1').lineWidth(0.7).rect(x, y, tableWidth, minRowHeight).stroke();

      for (const col of columns) {
        doc.font('Helvetica-Bold').fillColor('#0f172a').fontSize(9).text(col.label, x + cellPaddingX, y + 7, {
          width: col.width - cellPaddingX * 2,
          align: col.align === 'right' ? 'right' : 'left',
          lineBreak: false,
          ellipsis: true
        });
        x += col.width;
      }
    };

    const drawDataRow = (row: Record<string, unknown>, y: number, rowHeight: number, shade: boolean) => {
      let x = doc.page.margins.left;
      if (shade) {
        doc.save();
        doc.rect(x, y, tableWidth, rowHeight).fill('#f8fafc');
        doc.restore();
      }
      doc.strokeColor('#e2e8f0').lineWidth(0.5).rect(x, y, tableWidth, rowHeight).stroke();

      for (const col of columns) {
        doc.font('Helvetica').fillColor('#111827').fontSize(9).text(String(row[col.key] ?? ''), x + cellPaddingX, y + cellPaddingY, {
          width: col.width - cellPaddingX * 2,
          align: col.align === 'right' ? 'right' : 'left'
        });
        x += col.width;
      }
    };

    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));

    doc.font('Helvetica-Bold').fontSize(18).fillColor('#0f172a').text(title);
    doc.moveDown(0.3);
    doc.font('Helvetica').fontSize(10).fillColor('#64748b').text(subtitle);
    doc.moveDown();

    let y = doc.y;
    drawHeaderRow(y);
    y += minRowHeight;

    rows.forEach((row, index) => {
      const rowHeight = getRowHeight(row);
      if (y + rowHeight > pageBottom()) {
        doc.addPage();
        y = doc.page.margins.top;
        drawHeaderRow(y);
        y += minRowHeight;
      }
      drawDataRow(row, y, rowHeight, index % 2 === 1);
      y += rowHeight;
    });

    if (rows.length === 0) {
      doc.moveDown(0.4);
      doc.font('Helvetica').fontSize(10).fillColor('#6b7280').text('No records found.');
    }

    doc.end();
  });
}

export async function buildMeetingReportPdf(meetingId: string, tenantId = DEFAULT_TENANT_ID) {
  const meeting = await prisma.meeting.findFirst({
    where: { id: meetingId, tenantId },
    include: {
      snapshot: true,
      attendance: { include: { shareholder: true } },
      proxies: { include: { grantor: true }, orderBy: { createdAt: 'asc' } },
      motions: { include: { votes: { orderBy: { createdAt: 'asc' } } }, orderBy: { createdAt: 'asc' } }
    }
  });

  if (!meeting) {
    return null;
  }

  let presentShares = 0;
  const presentRows = meeting.attendance.filter((a) => a.present);
  for (const row of presentRows) {
    presentShares += await getShareholderActiveShares(prisma, row.shareholderId, tenantId);
  }
  const proxyShares = meeting.proxies
    .filter((p) => p.status === 'Verified')
    .reduce((sum, p) => sum + p.proxySharesSnapshot, 0);
  const representedShares = presentShares + proxyShares;
  const majorityThreshold = meeting.snapshot?.majorityThreshold || 0;

  const shareholderNameById = new Map<string, string>();
  for (const a of meeting.attendance) {
    shareholderNameById.set(a.shareholderId, shareholderName(a.shareholder));
  }

  const pdf = await new Promise<Buffer>((resolve) => {
    const doc = new PDFDocument({ size: 'LETTER', margin: 40 });
    const chunks: Buffer[] = [];
    const maxY = () => doc.page.height - doc.page.margins.bottom;
    const fullWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;

    const ensureSpace = (height: number) => {
      if (doc.y + height > maxY()) doc.addPage();
    };

    const sectionTitle = (text: string) => {
      ensureSpace(24);
      doc.moveDown(0.4);
      doc.font('Helvetica-Bold').fontSize(12).fillColor('#0f172a').text(text);
      doc.moveDown(0.2);
    };

    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));

    doc.font('Helvetica-Bold').fontSize(18).fillColor('#0f172a').text('Meeting Report');
    doc.moveDown(0.2);
    doc.font('Helvetica').fontSize(10).fillColor('#64748b').text(`${meeting.title} • ${new Date(meeting.dateTime).toLocaleString()} • Generated ${new Date().toLocaleString()}`);

    sectionTitle('Summary');
    doc.font('Helvetica').fontSize(10).fillColor('#111827');
    doc.text(`Present Shares: ${presentShares}`);
    doc.text(`Verified Proxy Shares: ${proxyShares}`);
    doc.text(`Represented Shares: ${representedShares}`);
    doc.text(`Majority Threshold: ${majorityThreshold}`);

    sectionTitle('Attendance (Present)');
    if (presentRows.length === 0) {
      doc.font('Helvetica').fontSize(10).fillColor('#6b7280').text('No attendees marked present.');
    } else {
      for (const row of presentRows) {
        const name = shareholderName(row.shareholder);
        ensureSpace(16);
        doc.font('Helvetica').fontSize(10).fillColor('#111827').text(`• ${name}`);
      }
    }

    sectionTitle('Proxies');
    if (meeting.proxies.length === 0) {
      doc.font('Helvetica').fontSize(10).fillColor('#6b7280').text('No proxies recorded.');
    } else {
      for (const p of meeting.proxies) {
        ensureSpace(34);
        doc.font('Helvetica-Bold').fontSize(10).fillColor('#111827').text(`${shareholderName(p.grantor)} → ${p.proxyHolderName}`);
        doc.font('Helvetica').fontSize(9).fillColor('#334155').text(`Status: ${p.status} • Shares: ${p.proxySharesSnapshot} • Received: ${p.receivedDate.toLocaleDateString()}`);
      }
    }

    sectionTitle('Motions & Vote Results');
    if (meeting.motions.length === 0) {
      doc.font('Helvetica').fontSize(10).fillColor('#6b7280').text('No motions recorded.');
    } else {
      for (const motion of meeting.motions) {
        ensureSpace(52);
        const motionType = (motion as any).type || 'STANDARD';
        doc.font('Helvetica-Bold').fontSize(11).fillColor('#0f172a').text(motion.title, { width: fullWidth });
        doc.font('Helvetica').fontSize(9).fillColor('#475569').text(`Type: ${motionType}${(motion as any).officeTitle ? ` • Office: ${(motion as any).officeTitle}` : ''}`);
        doc.font('Helvetica').fontSize(10).fillColor('#111827').text(motion.text, { width: fullWidth });

        if (motion.votes.length === 0) {
          doc.font('Helvetica').fontSize(9).fillColor('#6b7280').text('No votes recorded for this motion.');
          continue;
        }

        motion.votes.forEach((vote, voteIndex) => {
          ensureSpace(40);
          doc.moveDown(0.2);
          const details = asRecord((vote as any).detailsJson);
          const detailsType = String(details.type || '');
          const isElectionVote = detailsType === 'ELECTION' || motionType === 'ELECTION';

          if (isElectionVote) {
            doc.font('Helvetica-Bold').fontSize(9).fillColor('#111827').text(`Election vote ${voteIndex + 1} • ${new Date(vote.createdAt).toLocaleString()}`);
          } else {
            doc.font('Helvetica-Bold').fontSize(9).fillColor('#111827').text(`Vote ${voteIndex + 1} • ${new Date(vote.createdAt).toLocaleString()} • Result: ${vote.result}`);
            doc.font('Helvetica').fontSize(9).fillColor('#334155').text(`Yes: ${vote.yesShares} • No: ${vote.noShares} • Abstain: ${vote.abstainShares}`);
          }

          if (isElectionVote) {
            const totals = Array.isArray(details.totals) ? details.totals : [];
            const winners = Array.isArray(details.winners) ? details.winners.map((w) => String(w)) : [];
            if (totals.length) {
              doc.font('Helvetica').fontSize(9).fillColor('#0f172a').text('Election totals:');
              for (const row of totals as Array<Record<string, unknown>>) {
                ensureSpace(14);
                doc.font('Helvetica').fontSize(9).fillColor('#334155').text(`  - ${String(row.candidate || '')}: ${Number(row.shares || 0)} shares`);
              }
            }
            if (winners.length) {
              ensureSpace(14);
              doc.font('Helvetica').fontSize(9).fillColor('#14532d').text(`Winners: ${winners.join(', ')}`);
            }
          } else {
            const ballots = Array.isArray(details.ballots) ? details.ballots : [];
            if (ballots.length) {
              doc.font('Helvetica').fontSize(9).fillColor('#0f172a').text('Ballot details:');
              for (const b of ballots as Array<Record<string, unknown>>) {
                ensureSpace(14);
                const shareholderId = String(b.shareholderId || '');
                const voter = shareholderNameById.get(shareholderId) || shareholderId;
                const choice = String(b.choice || b.candidate || '');
                const shares = Number(b.shares || 0);
                doc.font('Helvetica').fontSize(9).fillColor('#334155').text(`  - ${voter}: ${choice} (${shares} shares)`);
              }
            }
          }
        });
      }
    }

    doc.end();
  });

  return { pdf, meeting };
}

export async function reportRoutes(app: FastifyInstance) {
  app.get('/cap-table.csv', { preHandler: requireRoles(RoleName.Admin, RoleName.Officer, RoleName.Clerk, RoleName.ReadOnly) }, async (request, reply) => {
    const tenantId = await resolveTenantIdForRequest(request);
    const excludeDisputed = await getExcludeDisputed(prisma, tenantId);
    const rows = await prisma.shareholder.findMany({ where: { tenantId }, include: { lots: true } });

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

  app.get('/cap-table.pdf', { preHandler: requireRoles(RoleName.Admin, RoleName.Officer, RoleName.Clerk, RoleName.ReadOnly) }, async (request, reply) => {
    const tenantId = await resolveTenantIdForRequest(request);
    const excludeDisputed = await getExcludeDisputed(prisma, tenantId);
    const rows = await prisma.shareholder.findMany({ where: { tenantId }, include: { lots: true } });

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
      [
        { key: 'name', label: 'Name', width: 160 },
        { key: 'status', label: 'Status', width: 60 },
        { key: 'activeShares', label: 'Active', width: 44, align: 'right' },
        { key: 'excludedShares', label: 'Excluded', width: 52, align: 'right' },
        { key: 'email', label: 'Email', width: 126 },
        { key: 'phone', label: 'Phone', width: 90 }
      ],
      data.map((r) => ({ ...r, email: r.email || '—', phone: r.phone || '—' }))
    );

    reply.header('Content-Type', 'application/pdf');
    reply.header('Content-Disposition', 'attachment; filename="ownership-report.pdf"');
    return reply.send(pdf);
  });

  app.get('/meeting-proxy.csv', { preHandler: requireRoles(RoleName.Admin, RoleName.Officer, RoleName.Clerk, RoleName.ReadOnly) }, async (request, reply) => {
    const tenantId = await resolveTenantIdForRequest(request);
    const { meetingId } = z.object({ meetingId: z.string() }).parse(request.query);

    const meeting = await prisma.meeting.findFirst({ where: { id: meetingId, tenantId }, select: { id: true } });
    if (!meeting) return reply.notFound();

    const proxies = await prisma.proxy.findMany({
      where: { meetingId, tenantId },
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
    const tenantId = await resolveTenantIdForRequest(request);
    const { meetingId } = z.object({ meetingId: z.string() }).parse(request.query);
    const meeting = await prisma.meeting.findFirst({ where: { id: meetingId, tenantId }, select: { title: true, dateTime: true } });
    if (!meeting) return reply.notFound();
    const proxies = await prisma.proxy.findMany({
      where: { meetingId, tenantId },
      include: { grantor: true }
    });

    const pdf = await renderSimplePdf(
      'Meeting Proxy Report',
      `${meeting?.title || meetingId} • ${meeting?.dateTime ? new Date(meeting.dateTime).toLocaleString() : ''} • Generated ${new Date().toLocaleString()}`,
      [
        { key: 'grantor', label: 'Grantor', width: 170 },
        { key: 'proxyHolderName', label: 'Proxy Holder', width: 140 },
        { key: 'status', label: 'Status', width: 70 },
        { key: 'proxySharesSnapshot', label: 'Shares', width: 55, align: 'right' },
        { key: 'receivedDate', label: 'Received', width: 97 }
      ],
      proxies.map((p) => ({
        grantor: shareholderName(p.grantor),
        proxyHolderName: p.proxyHolderName,
        status: p.status,
        proxySharesSnapshot: p.proxySharesSnapshot,
        receivedDate: p.receivedDate.toLocaleDateString()
      }))
    );

    reply.header('Content-Type', 'application/pdf');
    reply.header('Content-Disposition', `attachment; filename="meeting-proxy-${meetingId}.pdf"`);
    return reply.send(pdf);
  });

  app.get('/meeting-report.pdf', { preHandler: requireRoles(RoleName.Admin, RoleName.Officer, RoleName.Clerk, RoleName.ReadOnly) }, async (request, reply) => {
    const tenantId = await resolveTenantIdForRequest(request);
    const { meetingId } = z.object({ meetingId: z.string() }).parse(request.query);
    const generated = await buildMeetingReportPdf(meetingId, tenantId);
    if (!generated) return reply.notFound();

    reply.header('Content-Type', 'application/pdf');
    reply.header('Content-Disposition', `attachment; filename="meeting-report-${meetingId}.pdf"`);
    return reply.send(generated.pdf);
  });
}
