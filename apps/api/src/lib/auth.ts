import { FastifyReply, FastifyRequest } from 'fastify';
import { RoleName } from '@prisma/client';
import { prisma } from './db.js';

const DEFAULT_TENANT_ID = 'default';

function normalizeHost(rawHost: string) {
  return rawHost.split(',')[0].trim().toLowerCase().replace(/:\d+$/, '');
}

function readTenantSlugFromRequest(request: FastifyRequest) {
  const params = request.params as Record<string, unknown> | undefined;
  const fromParams = typeof params?.tenantSlug === 'string' ? params.tenantSlug.trim() : '';
  if (fromParams) return fromParams;

  const forwardedHost = request.headers['x-forwarded-host'];
  const headerHost = typeof forwardedHost === 'string'
    ? forwardedHost
    : Array.isArray(forwardedHost)
      ? forwardedHost[0]
      : request.headers.host || '';
  const host = normalizeHost(headerHost);
  if (!host || host === 'localhost' || /^\d+\.\d+\.\d+\.\d+$/.test(host)) {
    return '';
  }

  const configuredBaseDomain = (process.env.TENANT_BASE_DOMAIN || '').trim().toLowerCase();
  if (configuredBaseDomain) {
    if (host === configuredBaseDomain) return '';
    if (!host.endsWith(`.${configuredBaseDomain}`)) return '';
    return host.slice(0, -(configuredBaseDomain.length + 1)).split('.')[0] || '';
  }

  const labels = host.split('.').filter(Boolean);
  if (labels.length < 3) return '';
  if (labels[0] === 'www') return '';
  return labels[0] || '';
}

async function resolveTenantIdForAuth(request: FastifyRequest) {
  const tenantSlug = readTenantSlugFromRequest(request);
  if (!tenantSlug) return DEFAULT_TENANT_ID;
  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug }, select: { id: true } });
  return tenant?.id || DEFAULT_TENANT_ID;
}

declare module 'fastify' {
  interface FastifyRequest {
    userContext: {
      id: string;
      email: string;
      roles: RoleName[];
      systemRoles: RoleName[];
      isSystemAdmin: boolean;
      tenantId: string;
    };
  }
}

export async function requireAuth(request: FastifyRequest, reply: FastifyReply) {
  await request.jwtVerify<{ sub: string; email: string; roles?: RoleName[] }>();
  const payload = request.user as { sub: string; email: string; roles?: RoleName[] };

  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    include: { userRoles: { include: { role: true } } }
  });

  if (!user) {
    return reply.unauthorized('Session is no longer valid. Please sign in again.');
  }

  const systemRoles = user.userRoles.map((r) => r.role.name);
  const tenantId = await resolveTenantIdForAuth(request);
  const membership = await prisma.tenantUser.findUnique({
    where: {
      tenantId_userId: {
        tenantId,
        userId: user.id
      }
    },
    select: { roles: true }
  });

  request.userContext = {
    id: user.id,
    email: user.email,
    roles: membership?.roles || [],
    systemRoles,
    isSystemAdmin: systemRoles.includes(RoleName.Admin),
    tenantId
  };
}

export function requireRoles(...allowed: RoleName[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    await requireAuth(request, reply);
    if (reply.sent) return;
    if (request.userContext.isSystemAdmin) return;

    const ok = request.userContext.roles.some((r) => allowed.includes(r));
    if (!ok) {
      return reply.forbidden('Insufficient role');
    }
  };
}

export async function requireSystemAdmin(request: FastifyRequest, reply: FastifyReply) {
  await requireAuth(request, reply);
  if (reply.sent) return;
  if (!request.userContext.isSystemAdmin) {
    return reply.forbidden('System admin access required.');
  }
}

export const canWriteRoles: RoleName[] = [RoleName.Admin, RoleName.Officer, RoleName.Clerk];
export const canPostRoles: RoleName[] = [RoleName.Admin, RoleName.Officer];
