import { PrismaClient, type Prisma } from '@prisma/client';
import { DEFAULT_TENANT_ID } from './tenant.js';

export async function getOrCreateEmailSettings(
  prismaOrTx: PrismaClient | Prisma.TransactionClient,
  updatedById?: string,
  tenantId = DEFAULT_TENANT_ID
) {
  return prismaOrTx.emailSettings.upsert({
    where: { tenantId },
    update: {
      ...(updatedById ? { updatedById } : {})
    },
    create: {
      tenantId,
      enabled: false,
      smtpSecure: false,
      ...(updatedById ? { updatedById } : {})
    }
  });
}
