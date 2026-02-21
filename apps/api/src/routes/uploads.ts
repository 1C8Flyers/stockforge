import { randomUUID } from 'node:crypto';
import { createWriteStream } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { statSync, createReadStream } from 'node:fs';
import { join } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { RoleName } from '@prisma/client';
import { FastifyInstance } from 'fastify';
import { canWriteRoles, requireRoles } from '../lib/auth.js';
import { prisma } from '../lib/db.js';

export async function uploadRoutes(app: FastifyInstance) {
  app.post('/', { preHandler: requireRoles(...canWriteRoles) }, async (request, reply) => {
    const file = await request.file();
    if (!file) return reply.badRequest('No file uploaded');

    const dir = process.env.UPLOAD_DIR || './uploads';
    await mkdir(dir, { recursive: true });

    const filename = `${randomUUID()}-${file.filename}`;
    const fullPath = join(dir, filename);

    await pipeline(file.file, createWriteStream(fullPath));
    const size = statSync(fullPath).size;

    const attachment = await prisma.attachment.create({
      data: {
        path: fullPath,
        originalName: file.filename,
        mimeType: file.mimetype,
        size,
        createdBy: request.userContext.id
      }
    });

    return attachment;
  });

  app.get('/:id', { preHandler: requireRoles(RoleName.Admin, RoleName.Officer, RoleName.Clerk, RoleName.ReadOnly) }, async (request, reply) => {
    const id = (request.params as { id: string }).id;
    const attachment = await prisma.attachment.findUnique({ where: { id } });
    if (!attachment) return reply.notFound();
    reply.header('Content-Type', attachment.mimeType);
    reply.header('Content-Disposition', `inline; filename="${attachment.originalName}"`);
    return reply.send(createReadStream(attachment.path));
  });
}
