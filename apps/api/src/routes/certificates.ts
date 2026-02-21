import { LotStatus, RoleName } from '@prisma/client';
import { FastifyInstance } from 'fastify';
import PDFDocument from 'pdfkit';
import { z } from 'zod';
import { requireRoles } from '../lib/auth.js';
import { prisma } from '../lib/db.js';
import { audit } from '../lib/audit.js';

function ownerName(owner: { firstName: string | null; lastName: string | null; entityName: string | null }) {
  return owner.entityName || `${owner.firstName ?? ''} ${owner.lastName ?? ''}`.trim();
}

function formatDate(value: Date) {
  return value.toLocaleDateString();
}

function sanitizeFilePart(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]/g, '_');
}

function incorporationPhrase(state: string) {
  const normalized = state.trim();
  if (!normalized) return '';
  const first = normalized.charAt(0).toLowerCase();
  const article = ['a', 'e', 'i', 'o', 'u'].includes(first) ? 'An' : 'A';
  const titleState = normalized
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
  return `${article} ${titleState} Corporation`;
}

function buildCertificatePdf(input: {
  appName: string;
  appIncorporationState: string;
  certificateNumber: string;
  ownerDisplayName: string;
  shares: number;
  issuedDate: Date;
  lotId: string;
  printLabel: 'ORIGINAL' | 'REPRINT';
}): Promise<Buffer> {
  return new Promise((resolve) => {
    const doc = new PDFDocument({ size: 'LETTER', layout: 'landscape', margin: 54 });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));

    doc.font('Helvetica-Bold').fontSize(22).fillColor('#0f172a').text(input.appName, { align: 'center' });
    if (input.appIncorporationState) {
      const phrase = incorporationPhrase(input.appIncorporationState);
      doc
        .font('Helvetica')
        .fontSize(10)
        .fillColor('#475569')
        .text(phrase, { align: 'center' });
      doc.moveDown(0.25);
    } else {
      doc.moveDown(0.5);
    }
    doc.font('Helvetica-Bold').fontSize(18).fillColor('#111827').text('Stock Certificate', { align: 'center' });
    doc.moveDown(1.1);

    doc.font('Helvetica-Bold').fontSize(10).fillColor(input.printLabel === 'REPRINT' ? '#b45309' : '#166534').text(input.printLabel, {
      align: 'right'
    });
    doc.moveDown(0.2);

    doc.font('Helvetica').fontSize(11).fillColor('#334155').text(`Certificate No: ${input.certificateNumber}`);
    doc.text(`Issued: ${formatDate(input.issuedDate)}`);
    doc.moveDown(0.8);

    doc
      .font('Helvetica')
      .fontSize(12)
      .fillColor('#111827')
      .text('This certifies that', { align: 'center' });
    doc.moveDown(0.3);
    doc.font('Helvetica-Bold').fontSize(20).fillColor('#0f172a').text(input.ownerDisplayName, { align: 'center' });
    doc.moveDown(0.5);
    doc
      .font('Helvetica')
      .fontSize(12)
      .fillColor('#111827')
      .text('is the owner of One (1) Common Share', { align: 'center' });
    doc.moveDown(0.3);
    doc
      .font('Helvetica')
      .fontSize(12)
      .fillColor('#111827')
      .text(`of ${input.appName}, fully paid and non-assessable.`, { align: 'center' });

    const signatureY = doc.page.height - doc.page.margins.bottom - 100;
    const leftX = doc.page.margins.left + 20;
    const rightX = doc.page.width / 2 + 10;
    const lineWidth = doc.page.width / 2 - doc.page.margins.left - 40;

    doc.strokeColor('#94a3b8').lineWidth(1);
    doc.moveTo(leftX, signatureY).lineTo(leftX + lineWidth, signatureY).stroke();
    doc.moveTo(rightX, signatureY).lineTo(rightX + lineWidth, signatureY).stroke();

    doc.font('Helvetica').fontSize(10).fillColor('#475569').text('Secretary', leftX, signatureY + 6, { width: lineWidth, align: 'center' });
    doc.font('Helvetica').fontSize(10).fillColor('#475569').text('President', rightX, signatureY + 6, { width: lineWidth, align: 'center' });

    doc
      .font('Helvetica')
      .fontSize(8)
      .fillColor('#475569')
      .text(
        'The shares represented by this certificate are subject to the restrictions on transfer set forth in the Articles of Incorporation and/or Bylaws of the Corporation and any applicable Shareholder Agreement.',
        doc.page.margins.left,
        signatureY + 30,
        {
          width: doc.page.width - doc.page.margins.left - doc.page.margins.right,
          align: 'left'
        }
      );

    doc
      .font('Helvetica')
      .fontSize(8)
      .fillColor('#64748b')
      .text(`Lot ID: ${input.lotId}`, doc.page.margins.left, doc.page.height - doc.page.margins.bottom - 16, {
        width: doc.page.width - doc.page.margins.left - doc.page.margins.right,
        align: 'right'
      });

    doc.end();
  });
}

export async function certificateRoutes(app: FastifyInstance) {
  app.get('/lots/:lotId.pdf', { preHandler: requireRoles(RoleName.Admin, RoleName.Officer) }, async (request, reply) => {
    const { lotId } = z.object({ lotId: z.string() }).parse(request.params);
    const { mode } = z
      .object({ mode: z.enum(['original', 'reprint']).optional().default('original') })
      .parse(request.query);

    const lot = await prisma.shareLot.findUnique({
      where: { id: lotId },
      include: { owner: true }
    });
    if (!lot) return reply.notFound();

    if (lot.status !== LotStatus.Active) {
      return reply.code(409).send({
        error: 'NotPrintable',
        message: 'Only Active lots can be printed as certificates.',
        lotStatus: lot.status
      });
    }

    const cfg = await prisma.appConfig.findMany({ where: { key: { in: ['appDisplayName', 'appIncorporationState'] } } });
    const appName = cfg.find((c) => c.key === 'appDisplayName')?.value || 'StockForge';
    const appIncorporationState = cfg.find((c) => c.key === 'appIncorporationState')?.value || '';
    const certificateNumber = lot.certificateNumber || lot.id;
    const issuedDate = lot.acquiredDate || lot.createdAt;
    const printLabel = mode === 'reprint' ? 'REPRINT' : 'ORIGINAL';
    const pdf = await buildCertificatePdf({
      appName,
      appIncorporationState,
      certificateNumber,
      ownerDisplayName: ownerName(lot.owner),
      shares: lot.shares,
      issuedDate,
      lotId: lot.id,
      printLabel
    });

    await audit(prisma, request.userContext.id, 'PRINT', 'ShareLot', lot.id, {
      certificateNumber,
      status: lot.status,
      shares: lot.shares,
      mode
    });

    reply.header('Content-Type', 'application/pdf');
    reply.header('Cache-Control', 'no-store');
    reply.header('Content-Disposition', `inline; filename="certificate-${sanitizeFilePart(certificateNumber)}.pdf"`);
    return reply.send(pdf);
  });
}
