import { FastifyInstance } from 'fastify';
import { RoleName } from '@prisma/client';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/db.js';
import { requireRoles } from '../lib/auth.js';
import { audit } from '../lib/audit.js';

const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  roles: z.array(z.nativeEnum(RoleName)).min(1)
});

const updateRolesSchema = z.object({
  roles: z.array(z.nativeEnum(RoleName)).min(1)
});

const resetPasswordSchema = z.object({
  password: z.string().min(8)
});

export async function adminRoutes(app: FastifyInstance) {
  app.get('/users', { preHandler: requireRoles(RoleName.Admin) }, async () => {
    return prisma.user.findMany({
      include: { userRoles: { include: { role: true } } },
      orderBy: { createdAt: 'desc' }
    });
  });

  app.post('/users', { preHandler: requireRoles(RoleName.Admin) }, async (request, reply) => {
    const body = createUserSchema.parse(request.body);
    const exists = await prisma.user.findUnique({ where: { email: body.email } });
    if (exists) return reply.conflict('Email already exists');

    const passwordHash = await bcrypt.hash(body.password, 10);
    const roles = await prisma.role.findMany({ where: { name: { in: body.roles } } });

    const user = await prisma.user.create({
      data: {
        email: body.email,
        passwordHash,
        userRoles: { create: roles.map((r) => ({ roleId: r.id })) }
      },
      include: { userRoles: { include: { role: true } } }
    });

    await audit(prisma, request.userContext.id, 'CREATE', 'User', user.id, { email: body.email, roles: body.roles });
    return user;
  });

  app.put('/users/:id/roles', { preHandler: requireRoles(RoleName.Admin) }, async (request, reply) => {
    const { id } = z.object({ id: z.string() }).parse(request.params);
    const body = updateRolesSchema.parse(request.body);

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) return reply.notFound();

    const roles = await prisma.role.findMany({ where: { name: { in: body.roles } } });

    await prisma.$transaction(async (tx) => {
      await tx.userRole.deleteMany({ where: { userId: id } });
      if (roles.length) {
        await tx.userRole.createMany({ data: roles.map((r) => ({ userId: id, roleId: r.id })) });
      }
    });

    await audit(prisma, request.userContext.id, 'UPDATE', 'UserRoles', id, { roles: body.roles });
    return { ok: true };
  });

  app.put('/users/:id/password', { preHandler: requireRoles(RoleName.Admin) }, async (request, reply) => {
    const { id } = z.object({ id: z.string() }).parse(request.params);
    const body = resetPasswordSchema.parse(request.body);

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) return reply.notFound();

    const passwordHash = await bcrypt.hash(body.password, 10);
    await prisma.user.update({ where: { id }, data: { passwordHash } });

    await audit(prisma, request.userContext.id, 'UPDATE', 'UserPassword', id);
    return { ok: true };
  });

  app.get('/health', { preHandler: requireRoles(RoleName.Admin) }, async () => {
    const now = new Date().toISOString();
    const db = await prisma.$queryRaw<{ ok: number }[]>`SELECT 1 as ok`;
    let migrationCount = 0;
    try {
      const rows = await prisma.$queryRaw<{ count: number }[]>`SELECT COUNT(*)::int AS count FROM "_prisma_migrations"`;
      migrationCount = rows[0]?.count ?? 0;
    } catch {
      migrationCount = 0;
    }

    return {
      now,
      dbOk: db?.[0]?.ok === 1,
      migrationCount
    };
  });
}
