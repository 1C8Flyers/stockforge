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
      [
        { key: 'name', label: 'Name', width: 168 },
        { key: 'status', label: 'Status', width: 68 },
        { key: 'activeShares', label: 'Active', width: 48, align: 'right' },
        { key: 'excludedShares', label: 'Excluded', width: 58, align: 'right' },
        { key: 'email', label: 'Email', width: 132 },
        { key: 'phone', label: 'Phone', width: 58 }
      ],
      data.map((r) => ({ ...r, email: r.email || '—', phone: r.phone || '—' }))
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
    const meeting = await prisma.meeting.findUnique({ where: { id: meetingId }, select: { title: true, dateTime: true } });
    const proxies = await prisma.proxy.findMany({
      where: { meetingId },
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
}
