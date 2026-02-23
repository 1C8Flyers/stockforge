import { Prisma, RoleName, ShareholderType, ShareholderStatus } from '@prisma/client';
import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/db.js';
import { audit } from '../lib/audit.js';
import { canWriteRoles, requireRoles } from '../lib/auth.js';
import { getExcludeDisputed } from '../lib/voting.js';

const schema = z.object({
  type: z.nativeEnum(ShareholderType),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  entityName: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  address1: z.string().optional(),
  address2: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postalCode: z.string().optional(),
  status: z.nativeEnum(ShareholderStatus).default(ShareholderStatus.Active),
  notes: z.string().optional(),
  tags: z.array(z.string()).optional().default([])
});

const setPortalLinkSchema = z.object({
  userId: z.string().nullable()
});

export async function shareholderRoutes(app: FastifyInstance) {
  app.get('/', { preHandler: requireRoles(RoleName.Admin, RoleName.Officer, RoleName.Clerk, RoleName.ReadOnly) }, async (request) => {
    const query = z.object({ q: z.string().optional() }).parse(request.query);
    const rows = await prisma.shareholder.findMany({
      where: query.q
        ? {
            OR: [
              { firstName: { contains: query.q, mode: 'insensitive' } },
              { lastName: { contains: query.q, mode: 'insensitive' } },
              { entityName: { contains: query.q, mode: 'insensitive' } },
              { email: { contains: query.q, mode: 'insensitive' } }
            ]
          }
        : undefined,
      include: {
        shareholderLinks: {
          include: {
            user: {
              select: {
                id: true,
                email: true
              }
            }
          },
          take: 1
        }
      },
      orderBy: [{ lastName: 'asc' }, { entityName: 'asc' }]
    });
    return rows;
  });

  app.get('/portal-users', { preHandler: requireRoles(RoleName.Admin, RoleName.Officer) }, async () => {
    return prisma.user.findMany({
      select: {
        id: true,
        email: true
      },
      orderBy: { email: 'asc' }
    });
  });

  app.post('/', { preHandler: requireRoles(...canWriteRoles) }, async (request) => {
    const body = schema.parse(request.body);
    const created = await prisma.shareholder.create({
      data: {
        ...body,
        email: body.email || null
      }
    });
    await audit(prisma, request.userContext.id, 'CREATE', 'Shareholder', created.id, body);
    return created;
  });

  app.get('/:id', { preHandler: requireRoles(RoleName.Admin, RoleName.Officer, RoleName.Clerk, RoleName.ReadOnly) }, async (request, reply) => {
    const { id } = z.object({ id: z.string() }).parse(request.params);
    const shareholder = await prisma.shareholder.findUnique({ where: { id }, include: { lots: true } });
    if (!shareholder) return reply.notFound();

    const excludeDisputed = await getExcludeDisputed(prisma);
    const ownerExcluded =
      shareholder.status === ShareholderStatus.Inactive ||
      shareholder.status === ShareholderStatus.DeceasedOutstanding ||
      shareholder.status === ShareholderStatus.DeceasedSurrendered;
    const activeShares = ownerExcluded
      ? 0
      : shareholder.lots
          .filter((l) => l.status === 'Active' || (!excludeDisputed && l.status === 'Disputed'))
          .reduce((sum, l) => sum + l.shares, 0);
    const excludedShares = shareholder.lots.reduce((sum, l) => sum + l.shares, 0) - activeShares;

    const transfers = await prisma.transfer.findMany({
      where: { OR: [{ fromOwnerId: id }, { toOwnerId: id }] },
      include: { lines: true },
      orderBy: { createdAt: 'desc' }
    });

    return { ...shareholder, activeShares, excludedShares, transfers };
  });

  app.put('/:id', { preHandler: requireRoles(...canWriteRoles) }, async (request, reply) => {
    const { id } = z.object({ id: z.string() }).parse(request.params);
    const body = schema.partial().parse(request.body);
    const existing = await prisma.shareholder.findUnique({ where: { id } });
    if (!existing) return reply.notFound();
    const updated = await prisma.shareholder.update({ where: { id }, data: body });
    await audit(prisma, request.userContext.id, 'UPDATE', 'Shareholder', id, { before: existing, after: updated });
    return updated;
  });

  app.put('/:id/portal-link', { preHandler: requireRoles(RoleName.Admin, RoleName.Officer) }, async (request, reply) => {
    const { id } = z.object({ id: z.string() }).parse(request.params);
    const body = setPortalLinkSchema.parse(request.body);

    const shareholder = await prisma.shareholder.findUnique({ where: { id } });
    if (!shareholder) return reply.notFound();

    if (!body.userId) {
      await prisma.shareholderLink.deleteMany({
        where: {
          tenantId: shareholder.tenantId,
          shareholderId: id
        }
      });
      await audit(prisma, request.userContext.id, 'UPDATE', 'ShareholderLink', `${shareholder.tenantId}:${id}`, {
        tenantId: shareholder.tenantId,
        shareholderId: id,
        userId: null
      }, shareholder.tenantId);
      return { ok: true };
    }

    const user = await prisma.user.findUnique({ where: { id: body.userId } });
    if (!user) {
      return reply.badRequest('User not found.');
    }

    try {
      await prisma.shareholderLink.upsert({
        where: {
          tenantId_shareholderId: {
            tenantId: shareholder.tenantId,
            shareholderId: id
          }
        },
        update: {
          userId: body.userId
        },
        create: {
          tenantId: shareholder.tenantId,
          shareholderId: id,
          userId: body.userId
        }
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        return reply.conflict('That user or shareholder is already linked in this tenant.');
      }
      throw error;
    }

    await audit(prisma, request.userContext.id, 'UPDATE', 'ShareholderLink', `${shareholder.tenantId}:${id}`, {
      tenantId: shareholder.tenantId,
      shareholderId: id,
      userId: body.userId
    }, shareholder.tenantId);

    return { ok: true };
  });

  app.delete('/:id', { preHandler: requireRoles(RoleName.Admin, RoleName.Officer) }, async (request, reply) => {
    const { id } = z.object({ id: z.string() }).parse(request.params);
    const existing = await prisma.shareholder.findUnique({
      where: { id },
      include: { _count: { select: { lots: true, proxyGrantor: true } } }
    });
    if (!existing) return reply.notFound();

    if (existing._count.lots > 0 || existing._count.proxyGrantor > 0) {
      return reply.code(409).send({
        error:
          'Cannot delete shareholder with linked share lots or granted proxies. Remove or reassign those records first.'
      });
    }

    try {
      await prisma.shareholder.delete({ where: { id } });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
        return reply.code(409).send({
          error: 'Cannot delete shareholder because related records still reference this shareholder.'
        });
      }
      throw error;
    }
    await audit(prisma, request.userContext.id, 'DELETE', 'Shareholder', id);
    return { ok: true };
  });
}
