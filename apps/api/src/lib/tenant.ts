import { FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { requireAuth } from './auth.js';
import { prisma } from './db.js';

export const DEFAULT_TENANT_ID = 'default';

declare module 'fastify' {
  interface FastifyRequest {
    tenantContext?: {
      id: string;
      slug: string;
      name: string;
    };
    shareholderId?: string;
  }
}

function readTenantSlug(request: FastifyRequest) {
  const parsed = z.object({ tenantSlug: z.string().min(1) }).safeParse(request.params);
  return parsed.success ? parsed.data.tenantSlug : '';
}

function normalizeHost(rawHost: string) {
  return rawHost.split(',')[0].trim().toLowerCase().replace(/:\d+$/, '');
}

function readTenantSlugFromHost(request: FastifyRequest) {
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

export async function resolveTenantBySlug(tenantSlug: string) {
  return prisma.tenant.findUnique({ where: { slug: tenantSlug } });
}

export async function resolveTenantIdForRequest(request: FastifyRequest) {
  if (request.tenantContext?.id) {
    return request.tenantContext.id;
  }

  const tenantSlug = readTenantSlug(request) || readTenantSlugFromHost(request);
  if (!tenantSlug) {
    return DEFAULT_TENANT_ID;
  }

  const tenant = await resolveTenantBySlug(tenantSlug);
  return tenant?.id || DEFAULT_TENANT_ID;
}

export async function requireTenantMembership(request: FastifyRequest, reply: FastifyReply) {
  await requireAuth(request, reply);
  if (reply.sent) return;

  const tenantSlug = readTenantSlug(request) || readTenantSlugFromHost(request);
  if (!tenantSlug) {
    return reply.badRequest('Tenant could not be resolved from route or host.');
  }

  const tenant = await resolveTenantBySlug(tenantSlug);
  if (!tenant) {
    return reply.notFound('Tenant not found.');
  }

  const membership = await prisma.tenantUser.findUnique({
    where: {
      tenantId_userId: {
        tenantId: tenant.id,
        userId: request.userContext.id
      }
    }
  });

  if (!membership) {
    return reply.forbidden('You are not a member of this tenant.');
  }

  request.tenantContext = {
    id: tenant.id,
    slug: tenant.slug,
    name: tenant.name
  };
}

export async function requireShareholderLink(request: FastifyRequest, reply: FastifyReply) {
  await requireTenantMembership(request, reply);
  if (reply.sent || !request.tenantContext) return;

  const link = await prisma.shareholderLink.findUnique({
    where: {
      tenantId_userId: {
        tenantId: request.tenantContext.id,
        userId: request.userContext.id
      }
    }
  });

  if (!link) {
    return reply.forbidden('No shareholder profile is linked to this user in the selected tenant.');
  }

  request.shareholderId = link.shareholderId;
}
