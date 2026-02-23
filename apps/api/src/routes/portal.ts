import crypto from 'node:crypto';
import {
  LotStatus,
  ProxyAuthorizationScope,
  ProxyAuthorizationStatus,
  ProxyAuthorizationType,
  ShareholderStatus,
  BeneficiaryDesignationStatus
} from '@prisma/client';
import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/db.js';
import { requireShareholderLink } from '../lib/tenant.js';
import { audit } from '../lib/audit.js';

const proxyCreateSchema = z.object({
  proxyType: z.nativeEnum(ProxyAuthorizationType),
  meetingId: z.string().optional().nullable(),
  proxyHolderShareholderId: z.string().optional().nullable(),
  proxyHolderName: z.string().trim().optional().nullable(),
  proxyHolderEmail: z.string().trim().email().optional().nullable(),
  proxyHolderAddress: z.string().trim().optional().nullable(),
  scope: z.nativeEnum(ProxyAuthorizationScope).default(ProxyAuthorizationScope.GENERAL),
  effectiveAt: z.string().datetime().optional(),
  expiresAt: z.string().datetime().optional().nullable(),
  signConfirmed: z.boolean().default(true)
});

const beneficiaryEntrySchema = z.object({
  name: z.string().trim().min(1),
  relationship: z.string().trim().optional().nullable(),
  email: z.string().trim().email().optional().nullable(),
  phone: z.string().trim().optional().nullable(),
  address: z.string().trim().optional().nullable(),
  percent: z.number().int().min(0).max(100)
});

const beneficiaryUpsertSchema = z.object({
  designationId: z.string().optional(),
  entries: z.array(beneficiaryEntrySchema).default([]),
  submit: z.boolean().default(false)
});

function totalPercent(entries: Array<{ percent: number }>) {
  return entries.reduce((sum, item) => sum + item.percent, 0);
}

function shareholderDisplayName(shareholder: {
  firstName: string | null;
  lastName: string | null;
  entityName: string | null;
}) {
  return shareholder.entityName || `${shareholder.firstName ?? ''} ${shareholder.lastName ?? ''}`.trim();
}

export async function portalRoutes(app: FastifyInstance) {
  app.get('/t/:tenantSlug/me', { preHandler: requireShareholderLink }, async (request) => {
    const tenantId = request.tenantContext!.id;
    const shareholderId = request.shareholderId!;

    const [tenant, shareholder, lots, nextMeeting, latestDesignation] = await Promise.all([
      prisma.tenant.findUniqueOrThrow({ where: { id: tenantId } }),
      prisma.shareholder.findFirstOrThrow({ where: { id: shareholderId, tenantId } }),
      prisma.shareLot.findMany({ where: { tenantId, ownerId: shareholderId } }),
      prisma.meeting.findFirst({ where: { tenantId, dateTime: { gte: new Date() } }, orderBy: { dateTime: 'asc' } }),
      prisma.beneficiaryDesignation.findFirst({ where: { tenantId, shareholderId }, orderBy: { updatedAt: 'desc' } })
    ]);

    const activeLots = lots.filter((lot) => lot.status === LotStatus.Active || lot.status === LotStatus.Disputed);
    const activeShares = activeLots.reduce((sum, lot) => sum + lot.shares, 0);

    let activeProxy = null as null | {
      id: string;
      proxyType: ProxyAuthorizationType;
      status: ProxyAuthorizationStatus;
      meetingId: string | null;
      expiresAt: Date | null;
    };

    if (nextMeeting) {
      activeProxy = await prisma.proxyAuthorization.findFirst({
        where: {
          tenantId,
          shareholderId,
          proxyType: ProxyAuthorizationType.MEETING,
          meetingId: nextMeeting.id,
          status: ProxyAuthorizationStatus.ACCEPTED
        },
        select: { id: true, proxyType: true, status: true, meetingId: true, expiresAt: true }
      });
    }

    if (!activeProxy) {
      activeProxy = await prisma.proxyAuthorization.findFirst({
        where: {
          tenantId,
          shareholderId,
          proxyType: ProxyAuthorizationType.STANDING,
          status: ProxyAuthorizationStatus.ACCEPTED,
          OR: [{ expiresAt: null }, { expiresAt: { gte: new Date() } }]
        },
        orderBy: { updatedAt: 'desc' },
        select: { id: true, proxyType: true, status: true, meetingId: true, expiresAt: true }
      });
    }

    return {
      tenant: { id: tenant.id, slug: tenant.slug, name: tenant.name },
      shareholder: {
        id: shareholder.id,
        name: shareholderDisplayName(shareholder),
        email: shareholder.email,
        status: shareholder.status
      },
      holdingsSummary: {
        activeShares,
        lotCount: lots.length,
        activeLotCount: activeLots.length,
        hasExcludedStatus:
          shareholder.status === ShareholderStatus.Inactive ||
          shareholder.status === ShareholderStatus.DeceasedOutstanding ||
          shareholder.status === ShareholderStatus.DeceasedSurrendered
      },
      nextMeeting: nextMeeting
        ? { id: nextMeeting.id, title: nextMeeting.title, dateTime: nextMeeting.dateTime }
        : null,
      activeProxy,
      designationStatus: latestDesignation?.status || null
    };
  });

  app.get('/t/:tenantSlug/holdings', { preHandler: requireShareholderLink }, async (request) => {
    const tenantId = request.tenantContext!.id;
    const shareholderId = request.shareholderId!;

    const shareholder = await prisma.shareholder.findFirstOrThrow({
      where: { id: shareholderId, tenantId }
    });

    const lots = await prisma.shareLot.findMany({
      where: { tenantId, ownerId: shareholderId },
      orderBy: { createdAt: 'desc' }
    });

    return {
      shareholder,
      lots,
      totalShares: lots.reduce((sum, lot) => sum + lot.shares, 0),
      activeShares: lots
        .filter((lot) => lot.status === LotStatus.Active || lot.status === LotStatus.Disputed)
        .reduce((sum, lot) => sum + lot.shares, 0)
    };
  });

  app.get('/t/:tenantSlug/meetings', { preHandler: requireShareholderLink }, async (request) => {
    const tenantId = request.tenantContext!.id;
    const now = new Date();

    const [upcoming, recent] = await Promise.all([
      prisma.meeting.findMany({
        where: { tenantId, dateTime: { gte: now } },
        orderBy: { dateTime: 'asc' },
        take: 20
      }),
      prisma.meeting.findMany({
        where: { tenantId, dateTime: { lt: now } },
        orderBy: { dateTime: 'desc' },
        take: 20
      })
    ]);

    return { upcoming, recent };
  });

  app.get('/t/:tenantSlug/proxies', { preHandler: requireShareholderLink }, async (request) => {
    const tenantId = request.tenantContext!.id;
    const shareholderId = request.shareholderId!;

    return prisma.proxyAuthorization.findMany({
      where: { tenantId, shareholderId },
      include: {
        meeting: { select: { id: true, title: true, dateTime: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
  });

  app.post('/t/:tenantSlug/proxies', { preHandler: requireShareholderLink }, async (request) => {
    const tenantId = request.tenantContext!.id;
    const shareholderId = request.shareholderId!;
    const body = proxyCreateSchema.parse(request.body);

    if (!body.signConfirmed) {
      throw app.httpErrors.badRequest('You must confirm the signature statement.');
    }

    if (body.proxyType === ProxyAuthorizationType.MEETING && !body.meetingId) {
      throw app.httpErrors.badRequest('meetingId is required for temporary meeting proxy.');
    }

    if (body.proxyType === ProxyAuthorizationType.STANDING && body.meetingId) {
      throw app.httpErrors.badRequest('Standing proxy cannot specify a meetingId.');
    }

    if (body.meetingId) {
      const meeting = await prisma.meeting.findFirst({ where: { id: body.meetingId, tenantId } });
      if (!meeting) {
        throw app.httpErrors.badRequest('Meeting not found in this tenant.');
      }
    }

    if (body.proxyHolderShareholderId) {
      const holder = await prisma.shareholder.findFirst({
        where: { id: body.proxyHolderShareholderId, tenantId }
      });
      if (!holder) {
        throw app.httpErrors.badRequest('Selected proxy holder is not a shareholder in this tenant.');
      }
    } else if (!body.proxyHolderName?.trim()) {
      throw app.httpErrors.badRequest('Proxy holder name is required when not selecting an existing shareholder.');
    }

    const signatureHash = crypto
      .createHash('sha256')
      .update(`${request.userContext.id}:${shareholderId}:${Date.now()}:${request.ip}`)
      .digest('hex');

    const created = await prisma.proxyAuthorization.create({
      data: {
        tenantId,
        shareholderId,
        proxyType: body.proxyType,
        meetingId: body.meetingId ?? null,
        proxyHolderShareholderId: body.proxyHolderShareholderId ?? null,
        proxyHolderName: body.proxyHolderName?.trim() || null,
        proxyHolderEmail: body.proxyHolderEmail?.trim() || null,
        proxyHolderAddress: body.proxyHolderAddress?.trim() || null,
        scope: body.scope,
        effectiveAt: body.effectiveAt ? new Date(body.effectiveAt) : new Date(),
        expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
        status: ProxyAuthorizationStatus.PENDING,
        signedAt: new Date(),
        signatureHash,
        ip: request.ip,
        userAgent: String(request.headers['user-agent'] || ''),
        createdByUserId: request.userContext.id
      }
    });

    await audit(prisma, request.userContext.id, 'CREATE', 'ProxyAuthorization', created.id, body, tenantId);
    return created;
  });

  app.post('/t/:tenantSlug/proxies/:id/revoke', { preHandler: requireShareholderLink }, async (request, reply) => {
    const tenantId = request.tenantContext!.id;
    const shareholderId = request.shareholderId!;
    const { id } = z.object({ id: z.string() }).parse(request.params);

    const existing = await prisma.proxyAuthorization.findFirst({
      where: { id, tenantId, shareholderId }
    });

    if (!existing) return reply.notFound();

    if (existing.status === ProxyAuthorizationStatus.REVOKED) {
      return { ok: true, alreadyRevoked: true };
    }

    const updated = await prisma.proxyAuthorization.update({
      where: { id },
      data: { status: ProxyAuthorizationStatus.REVOKED }
    });

    await audit(prisma, request.userContext.id, 'REVOKE', 'ProxyAuthorization', id, undefined, tenantId);
    return { ok: true, proxy: updated };
  });

  app.get('/t/:tenantSlug/beneficiaries', { preHandler: requireShareholderLink }, async (request) => {
    const tenantId = request.tenantContext!.id;
    const shareholderId = request.shareholderId!;

    return prisma.beneficiaryDesignation.findFirst({
      where: { tenantId, shareholderId },
      include: { entries: { orderBy: { createdAt: 'asc' } } },
      orderBy: { updatedAt: 'desc' }
    });
  });

  app.post('/t/:tenantSlug/beneficiaries', { preHandler: requireShareholderLink }, async (request) => {
    const tenantId = request.tenantContext!.id;
    const shareholderId = request.shareholderId!;
    const body = beneficiaryUpsertSchema.parse(request.body);

    if (body.submit) {
      const total = totalPercent(body.entries);
      if (total !== 100) {
        throw app.httpErrors.badRequest('Beneficiary percentages must total 100 for submit.');
      }
      if (body.entries.length === 0) {
        throw app.httpErrors.badRequest('At least one beneficiary is required for submit.');
      }
    }

    const status = body.submit ? BeneficiaryDesignationStatus.SUBMITTED : BeneficiaryDesignationStatus.DRAFT;

    const designation = await prisma.$transaction(async (tx) => {
      const current = body.designationId
        ? await tx.beneficiaryDesignation.findFirst({
            where: { id: body.designationId, tenantId, shareholderId }
          })
        : null;

      const target =
        current ||
        (await tx.beneficiaryDesignation.create({
          data: {
            tenantId,
            shareholderId,
            status,
            createdByUserId: request.userContext.id
          }
        }));

      await tx.beneficiaryDesignation.update({
        where: { id: target.id },
        data: { status }
      });

      await tx.beneficiaryDesignationEntry.deleteMany({ where: { designationId: target.id } });

      if (body.entries.length > 0) {
        await tx.beneficiaryDesignationEntry.createMany({
          data: body.entries.map((entry) => ({
            tenantId,
            designationId: target.id,
            name: entry.name.trim(),
            relationship: entry.relationship?.trim() || null,
            email: entry.email?.trim() || null,
            phone: entry.phone?.trim() || null,
            address: entry.address?.trim() || null,
            percent: entry.percent
          }))
        });
      }

      return tx.beneficiaryDesignation.findUniqueOrThrow({
        where: { id: target.id },
        include: { entries: true }
      });
    });

    await audit(prisma, request.userContext.id, 'UPSERT', 'BeneficiaryDesignation', designation.id, body, tenantId);
    return designation;
  });

  app.post('/t/:tenantSlug/beneficiaries/:id/submit', { preHandler: requireShareholderLink }, async (request) => {
    const tenantId = request.tenantContext!.id;
    const shareholderId = request.shareholderId!;
    const { id } = z.object({ id: z.string() }).parse(request.params);

    const designation = await prisma.beneficiaryDesignation.findFirst({
      where: { id, tenantId, shareholderId },
      include: { entries: true }
    });

    if (!designation) {
      throw app.httpErrors.notFound('Designation not found.');
    }

    const total = totalPercent(designation.entries);
    if (total !== 100) {
      throw app.httpErrors.badRequest('Beneficiary percentages must total 100 before submit.');
    }

    const updated = await prisma.beneficiaryDesignation.update({
      where: { id },
      data: { status: BeneficiaryDesignationStatus.SUBMITTED }
    });

    await audit(prisma, request.userContext.id, 'SUBMIT', 'BeneficiaryDesignation', id, { total }, tenantId);
    return updated;
  });
}
