import { PrismaClient } from '@prisma/client';
import { DEFAULT_TENANT_ID } from './tenant.js';

export async function audit(
  prisma: PrismaClient,
  userId: string,
  action: string,
  entityType: string,
  entityId: string,
  diffJson?: unknown,
  tenantId = DEFAULT_TENANT_ID
) {
  await prisma.auditLog.create({
    data: { tenantId, userId, action, entityType, entityId, diffJson: diffJson as object | undefined }
  });
}
