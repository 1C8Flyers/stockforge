import { prisma } from './db.js';
import { DEFAULT_TENANT_ID } from './tenant.js';

export const EMAIL_PREF_KEYS = {
  passwordResetsEnabled: 'email.passwordResetsEnabled',
  meetingReportsEnabled: 'email.meetingReportsEnabled',
  proxyReceiptEnabled: 'email.proxyReceiptEnabled',
  certificateNoticesEnabled: 'email.certificateNoticesEnabled'
} as const;

export type EmailPreferenceFlags = {
  passwordResetsEnabled: boolean;
  meetingReportsEnabled: boolean;
  proxyReceiptEnabled: boolean;
  certificateNoticesEnabled: boolean;
};

const DEFAULT_FLAGS: EmailPreferenceFlags = {
  passwordResetsEnabled: false,
  meetingReportsEnabled: true,
  proxyReceiptEnabled: false,
  certificateNoticesEnabled: false
};

export async function getEmailPreferenceFlags(tenantId = DEFAULT_TENANT_ID) {
  const rows = await prisma.appConfig.findMany({
    where: {
      tenantId,
      key: {
        in: Object.values(EMAIL_PREF_KEYS)
      }
    }
  });

  const values = Object.fromEntries(rows.map((row) => [row.key, row.value]));
  return {
    passwordResetsEnabled: values[EMAIL_PREF_KEYS.passwordResetsEnabled]
      ? values[EMAIL_PREF_KEYS.passwordResetsEnabled] === 'true'
      : DEFAULT_FLAGS.passwordResetsEnabled,
    meetingReportsEnabled: values[EMAIL_PREF_KEYS.meetingReportsEnabled]
      ? values[EMAIL_PREF_KEYS.meetingReportsEnabled] === 'true'
      : DEFAULT_FLAGS.meetingReportsEnabled,
    proxyReceiptEnabled: values[EMAIL_PREF_KEYS.proxyReceiptEnabled]
      ? values[EMAIL_PREF_KEYS.proxyReceiptEnabled] === 'true'
      : DEFAULT_FLAGS.proxyReceiptEnabled,
    certificateNoticesEnabled: values[EMAIL_PREF_KEYS.certificateNoticesEnabled]
      ? values[EMAIL_PREF_KEYS.certificateNoticesEnabled] === 'true'
      : DEFAULT_FLAGS.certificateNoticesEnabled
  } as EmailPreferenceFlags;
}
