import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/db.js';
import { requireAuth } from '../lib/auth.js';

export async function authRoutes(app: FastifyInstance) {
  app.post('/login', async (request, reply) => {
    const body = z.object({ email: z.string().email(), password: z.string().min(8) }).parse(request.body);
    const user = await prisma.user.findUnique({
      where: { email: body.email },
      include: { userRoles: { include: { role: true } } }
    });
    if (!user || !(await bcrypt.compare(body.password, user.passwordHash))) {
      return reply.unauthorized('Invalid credentials');
    }

    const roles = user.userRoles.map((r) => r.role.name);
    const token = await reply.jwtSign({ sub: user.id, email: user.email, roles });
    return { token, user: { id: user.id, email: user.email, roles } };
  });

  app.get('/me', { preHandler: requireAuth }, async (request) => {
    return request.userContext;
  });
}
