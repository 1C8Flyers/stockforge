import { prisma } from './db.js';

export async function writeEmailLog(input: {
  type: 'PASSWORD_RESET' | 'MEETING_REPORT' | 'CERTIFICATE' | 'PROXY_RECEIPT';
  to: string;
  subject: string;
  status: 'SENT' | 'FAILED';
  relatedEntityType?: string;
  relatedEntityId?: string;
  errorSafe?: string;
}) {
  await prisma.emailLog.create({
    data: {
      type: input.type,
      to: input.to,
      subject: input.subject,
      status: input.status,
      relatedEntityType: input.relatedEntityType,
      relatedEntityId: input.relatedEntityId,
      errorSafe: input.errorSafe
    }
  });
}
