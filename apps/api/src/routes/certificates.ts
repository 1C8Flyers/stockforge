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

function buildCertificatePdf(input: {
  appName: string;
  certificateNumber: string;
  ownerDisplayName: string;
  shares: number;
  issuedDate: Date;
  lotId: string;
}): Promise<Buffer> {
  return new Promise((resolve) => {
    const doc = new PDFDocument({ size: 'LETTER', margin: 54 });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));

    doc.font('Helvetica-Bold').fontSize(22).fillColor('#0f172a').text(input.appName, { align: 'center' });
    doc.moveDown(0.5);
    doc.font('Helvetica-Bold').fontSize(18).fillColor('#111827').text('Stock Certificate', { align: 'center' });
    doc.moveDown(1.1);

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
      .text(`is the owner of ${input.shares} shares in ${input.appName}.`, { align: 'center' });

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

    const cfg = await prisma.appConfig.findMany({ where: { key: { in: ['appDisplayName'] } } });
    const appName = cfg.find((c) => c.key === 'appDisplayName')?.value || 'StockForge';
    const certificateNumber = lot.certificateNumber || lot.id;
    const issuedDate = lot.acquiredDate || lot.createdAt;
    const pdf = await buildCertificatePdf({
      appName,
      certificateNumber,
      ownerDisplayName: ownerName(lot.owner),
      shares: lot.shares,
      issuedDate,
      lotId: lot.id
    });

    await audit(prisma, request.userContext.id, 'PRINT', 'ShareLot', lot.id, {
      certificateNumber,
      status: lot.status,
      shares: lot.shares
    });

    reply.header('Content-Type', 'application/pdf');
    reply.header('Cache-Control', 'no-store');
    reply.header('Content-Disposition', `inline; filename="certificate-${sanitizeFilePart(certificateNumber)}.pdf"`);
    return reply.send(pdf);
  });
}
