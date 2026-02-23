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

export async function resolveTenantBySlug(tenantSlug: string) {
  return prisma.tenant.findUnique({ where: { slug: tenantSlug } });
}

export async function requireTenantMembership(request: FastifyRequest, reply: FastifyReply) {
  await requireAuth(request, reply);
  if (reply.sent) return;

  const tenantSlug = readTenantSlug(request);
  if (!tenantSlug) {
    return reply.badRequest('tenantSlug route parameter is required.');
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
