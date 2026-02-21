import { PrismaClient } from '@prisma/client';

export async function audit(
  prisma: PrismaClient,
  userId: string,
  action: string,
  entityType: string,
  entityId: string,
  diffJson?: unknown
) {
  await prisma.auditLog.create({
    data: { userId, action, entityType, entityId, diffJson: diffJson as object | undefined }
  });
}
