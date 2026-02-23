import { RoleName } from '@prisma/client';
import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { requireSystemAdmin } from '../lib/auth.js';
import { prisma } from '../lib/db.js';

const roleListSchema = z.object({
  roles: z.array(z.nativeEnum(RoleName)).min(1)
});

const createTenantSchema = z.object({
  slug: z
    .string()
    .trim()
    .min(2)
    .max(40)
    .regex(/^[a-z0-9-]+$/, 'Slug must use lowercase letters, numbers, and hyphens only.'),
  name: z.string().trim().min(1).max(120)
});

const updateTenantSchema = z.object({
  slug: z
    .string()
    .trim()
    .min(2)
    .max(40)
    .regex(/^[a-z0-9-]+$/, 'Slug must use lowercase letters, numbers, and hyphens only.')
    .optional(),
  name: z.string().trim().min(1).max(120).optional()
});

const createTenantUserSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8),
  roles: z.array(z.nativeEnum(RoleName)).min(1)
});

export async function systemAdminRoutes(app: FastifyInstance) {
  app.get('/tenants', { preHandler: requireSystemAdmin }, async () => {
    const tenants = await prisma.tenant.findMany({
      orderBy: [{ createdAt: 'asc' }],
      include: {
        _count: {
          select: {
            tenantUsers: true,
            shareholders: true,
            meetings: true
          }
        }
      }
    });

    return tenants;
  });

  app.post('/tenants', { preHandler: requireSystemAdmin }, async (request, reply) => {
    const body = createTenantSchema.parse(request.body);

    const existing = await prisma.tenant.findFirst({
      where: {
        OR: [{ id: body.slug }, { slug: body.slug }]
      },
      select: { id: true }
    });
    if (existing) return reply.conflict('A tenant with this slug already exists.');

    const tenant = await prisma.tenant.create({
      data: {
        id: body.slug,
        slug: body.slug,
        name: body.name
      }
    });

    return tenant;
  });

  app.put('/tenants/:id', { preHandler: requireSystemAdmin }, async (request, reply) => {
    const { id } = z.object({ id: z.string().min(1) }).parse(request.params);
    const body = updateTenantSchema.parse(request.body);
    if (typeof body.slug === 'undefined' && typeof body.name === 'undefined') {
      return reply.badRequest('No update fields provided.');
    }

    const existing = await prisma.tenant.findUnique({ where: { id }, select: { id: true } });
    if (!existing) return reply.notFound('Tenant not found.');

    if (body.slug) {
      const conflict = await prisma.tenant.findFirst({
        where: {
          slug: body.slug,
          id: { not: id }
        },
        select: { id: true }
      });
      if (conflict) return reply.conflict('Another tenant already uses that slug.');
    }

    const tenant = await prisma.tenant.update({
      where: { id },
      data: {
        slug: body.slug,
        name: body.name
      }
    });

    return tenant;
  });

  app.get('/users', { preHandler: requireSystemAdmin }, async () => {
    return prisma.user.findMany({
      orderBy: { email: 'asc' },
      include: {
        userRoles: { include: { role: true } },
        tenantUsers: {
          select: {
            tenantId: true,
            roles: true
          }
        }
      }
    });
  });

  app.post('/tenants/:tenantId/users', { preHandler: requireSystemAdmin }, async (request, reply) => {
    const { tenantId } = z.object({ tenantId: z.string().min(1) }).parse(request.params);
    const body = createTenantUserSchema.parse(request.body);

    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { id: true } });
    if (!tenant) return reply.notFound('Tenant not found.');

    const existing = await prisma.user.findUnique({ where: { email: body.email }, select: { id: true } });
    if (existing) {
      return reply.conflict('User already exists. Use tenant membership assignment below.');
    }

    const passwordHash = await bcrypt.hash(body.password, 10);
    const user = await prisma.user.create({
      data: {
        email: body.email,
        passwordHash,
        tenantUsers: {
          create: {
            tenantId,
            roles: body.roles
          }
        }
      },
      select: {
        id: true,
        email: true
      }
    });

    return user;
  });

  app.get('/tenants/:tenantId/members', { preHandler: requireSystemAdmin }, async (request, reply) => {
    const { tenantId } = z.object({ tenantId: z.string().min(1) }).parse(request.params);
    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { id: true } });
    if (!tenant) return reply.notFound('Tenant not found.');

    const members = await prisma.tenantUser.findMany({
      where: { tenantId },
      include: {
        user: {
          select: {
            id: true,
            email: true
          }
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    return members;
  });

  app.put('/tenants/:tenantId/members/:userId', { preHandler: requireSystemAdmin }, async (request, reply) => {
    const { tenantId, userId } = z.object({ tenantId: z.string().min(1), userId: z.string().min(1) }).parse(request.params);
    const body = roleListSchema.parse(request.body);

    const [tenant, user] = await Promise.all([
      prisma.tenant.findUnique({ where: { id: tenantId }, select: { id: true } }),
      prisma.user.findUnique({ where: { id: userId }, select: { id: true } })
    ]);
    if (!tenant) return reply.notFound('Tenant not found.');
    if (!user) return reply.notFound('User not found.');

    const member = await prisma.tenantUser.upsert({
      where: {
        tenantId_userId: {
          tenantId,
          userId
        }
      },
      update: {
        roles: body.roles
      },
      create: {
        tenantId,
        userId,
        roles: body.roles
      }
    });

    return member;
  });

  app.delete('/tenants/:tenantId/members/:userId', { preHandler: requireSystemAdmin }, async (request, reply) => {
    const { tenantId, userId } = z.object({ tenantId: z.string().min(1), userId: z.string().min(1) }).parse(request.params);
    const existing = await prisma.tenantUser.findUnique({
      where: {
        tenantId_userId: {
          tenantId,
          userId
        }
      },
      select: { id: true }
    });
    if (!existing) return reply.notFound('Tenant membership not found.');

    await prisma.tenantUser.delete({
      where: {
        tenantId_userId: {
          tenantId,
          userId
        }
      }
    });

    return { ok: true };
  });
}