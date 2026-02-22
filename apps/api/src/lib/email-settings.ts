import { PrismaClient, type Prisma } from '@prisma/client';

export const EMAIL_SETTINGS_SINGLETON_ID = 'global-email-settings';

export async function getOrCreateEmailSettings(
  prismaOrTx: PrismaClient | Prisma.TransactionClient,
  updatedById?: string
) {
  return prismaOrTx.emailSettings.upsert({
    where: { id: EMAIL_SETTINGS_SINGLETON_ID },
    update: {
      ...(updatedById ? { updatedById } : {})
    },
    create: {
      id: EMAIL_SETTINGS_SINGLETON_ID,
      enabled: false,
      smtpSecure: false,
      ...(updatedById ? { updatedById } : {})
    }
  });
}
