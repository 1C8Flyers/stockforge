import { proxyReceiptTemplate } from '../emails/templates/index.js';
import { sendMail } from './mailer.js';
import { getEmailPreferenceFlags } from '../lib/email-preferences.js';
import { writeEmailLog } from '../lib/email-log.js';

export async function sendProxyReceiptEmail(input: {
  tenantId?: string;
  meetingId: string;
  meetingTitle: string;
  grantorEmail: string;
  holderEmail?: string | null;
  sharesSnapshot: number;
  status: string;
  referenceId: string;
}) {
  const flags = await getEmailPreferenceFlags(input.tenantId);
  if (!flags.proxyReceiptEnabled) {
    return { skipped: true, reason: 'proxy-receipt-disabled' as const };
  }

  const template = proxyReceiptTemplate({
    meetingTitle: input.meetingTitle,
    referenceId: input.referenceId
  });

  const recipients = [input.grantorEmail, input.holderEmail || ''].map((v) => v.trim()).filter(Boolean);
  for (const to of recipients) {
    try {
      await sendMail({
        to,
        subject: template.subject,
        html: template.html,
        text: template.text
      });
      await writeEmailLog({
        type: 'PROXY_RECEIPT',
        tenantId: input.tenantId,
        to,
        subject: template.subject,
        status: 'SENT',
        relatedEntityType: 'Meeting',
        relatedEntityId: input.meetingId
      });
    } catch (error: any) {
      await writeEmailLog({
        type: 'PROXY_RECEIPT',
        tenantId: input.tenantId,
        to,
        subject: template.subject,
        status: 'FAILED',
        relatedEntityType: 'Meeting',
        relatedEntityId: input.meetingId,
        errorSafe: error?.message || 'Unable to send proxy receipt email.'
      });
    }
  }

  return { skipped: false };
}
