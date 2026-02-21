import { FastifyReply, FastifyRequest } from 'fastify';
import { RoleName } from '@prisma/client';

declare module 'fastify' {
  interface FastifyRequest {
    userContext: {
      id: string;
      email: string;
      roles: RoleName[];
    };
  }
}

export async function requireAuth(request: FastifyRequest, reply: FastifyReply) {
  await request.jwtVerify<{ sub: string; email: string; roles: RoleName[] }>();
  const payload = request.user as { sub: string; email: string; roles: RoleName[] };
  request.userContext = {
    id: payload.sub,
    email: payload.email,
    roles: payload.roles
  };
}

export function requireRoles(...allowed: RoleName[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    await requireAuth(request, reply);
    const ok = request.userContext.roles.some((r) => allowed.includes(r));
    if (!ok) {
      return reply.forbidden('Insufficient role');
    }
  };
}

export const canWriteRoles: RoleName[] = [RoleName.Admin, RoleName.Officer, RoleName.Clerk];
export const canPostRoles: RoleName[] = [RoleName.Admin, RoleName.Officer];
