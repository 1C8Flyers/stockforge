import { RoleName } from '@prisma/client';
import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireRoles } from '../lib/auth.js';
import { prisma } from '../lib/db.js';

const querySchema = z.object({
  entityType: z.string().optional(),
  action: z.string().optional(),
  userId: z.string().optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(100)
});

export async function auditLogRoutes(app: FastifyInstance) {
  app.get('/', { preHandler: requireRoles(RoleName.Admin, RoleName.Officer, RoleName.ReadOnly) }, async (request) => {
    const q = querySchema.parse(request.query);

    return prisma.auditLog.findMany({
      where: {
        entityType: q.entityType || undefined,
        action: q.action || undefined,
        userId: q.userId || undefined,
        createdAt:
          q.from || q.to
            ? {
                gte: q.from ? new Date(q.from) : undefined,
                lte: q.to ? new Date(q.to) : undefined
              }
            : undefined
      },
      include: { user: { select: { id: true, email: true } } },
      orderBy: { createdAt: 'desc' },
      take: q.limit
    });
  });
}
