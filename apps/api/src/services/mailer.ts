import nodemailer, { type Transporter } from 'nodemailer';
import { prisma } from '../lib/db.js';
import { decryptSecret } from '../lib/email-crypto.js';
import { getOrCreateEmailSettings } from '../lib/email-settings.js';

const CACHE_TTL_MS = 60_000;

class MailerConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MailerConfigError';
  }
}

type CachedMailer = {
  transporter: Transporter;
  expiresAt: number;
  fromName: string;
  fromEmail: string;
  replyTo: string | null;
};

let cachedMailer: CachedMailer | null = null;

function asSafeMailerError(error: unknown) {
  if (error instanceof MailerConfigError) return error;
  return new MailerConfigError('Unable to send email. Check SMTP host, port, secure setting, and credentials.');
}

async function getMailerConfig() {
  const now = Date.now();
  if (cachedMailer && cachedMailer.expiresAt > now) {
    return cachedMailer;
  }

  const settings = await getOrCreateEmailSettings(prisma);

  if (!settings.enabled) {
    throw new MailerConfigError('Email is disabled.');
  }

  const host = settings.smtpHost?.trim();
  const port = settings.smtpPort ?? null;
  const fromName = settings.fromName?.trim();
  const fromEmail = settings.fromEmail?.trim();

  if (!host || !port || !fromName || !fromEmail || !settings.smtpPassEnc) {
    throw new MailerConfigError('Email not fully configured.');
  }

  const auth = settings.smtpUser?.trim()
    ? {
        user: settings.smtpUser.trim(),
        pass: decryptSecret(settings.smtpPassEnc)
      }
    : {
        pass: decryptSecret(settings.smtpPassEnc)
      };

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: settings.smtpSecure,
    auth
  });

  cachedMailer = {
    transporter,
    expiresAt: now + CACHE_TTL_MS,
    fromName,
    fromEmail,
    replyTo: settings.replyTo?.trim() || null
  };

  return cachedMailer;
}

export function resetMailerCache() {
  cachedMailer = null;
}

export async function verifyMailer() {
  try {
    const { transporter } = await getMailerConfig();
    await transporter.verify();
  } catch (error) {
    throw asSafeMailerError(error);
  }
}

export async function sendMail(params: { to: string; subject: string; html?: string; text?: string }) {
  try {
    const { transporter, fromName, fromEmail, replyTo } = await getMailerConfig();
    await transporter.sendMail({
      from: `${fromName} <${fromEmail}>`,
      to: params.to,
      subject: params.subject,
      html: params.html,
      text: params.text,
      ...(replyTo ? { replyTo } : {})
    });
  } catch (error) {
    throw asSafeMailerError(error);
  }
}

export async function sendMailWithAttachments(params: {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  attachments?: Array<{ filename: string; content: Buffer; contentType?: string }>;
}) {
  try {
    const { transporter, fromName, fromEmail, replyTo } = await getMailerConfig();
    await transporter.sendMail({
      from: `${fromName} <${fromEmail}>`,
      to: Array.isArray(params.to) ? params.to.join(', ') : params.to,
      subject: params.subject,
      html: params.html,
      text: params.text,
      attachments: params.attachments,
      ...(replyTo ? { replyTo } : {})
    });
  } catch (error) {
    throw asSafeMailerError(error);
  }
}
