import { renderBaseTemplate } from './base.js';

export function passwordResetTemplate(input: { resetUrl: string; expiresAtIso: string }) {
  return {
    subject: 'Reset your StockForge password',
    ...renderBaseTemplate({
      title: 'Password reset requested',
      heading: 'Reset your password',
      lines: [
        'We received a request to reset your StockForge password.',
        `This link expires at ${new Date(input.expiresAtIso).toLocaleString()}.`
      ],
      ctaText: 'Reset Password',
      ctaUrl: input.resetUrl,
      footer: 'If you did not request this, you can safely ignore this email.'
    })
  };
}

export function meetingReportTemplate(input: { meetingTitle: string; meetingDate: string }) {
  return {
    subject: `Meeting Report: ${input.meetingTitle} (${input.meetingDate})`,
    ...renderBaseTemplate({
      title: 'Meeting report delivery',
      heading: input.meetingTitle,
      lines: ['Attached is the latest meeting report PDF generated from StockForge records.']
    })
  };
}

export function proxyReceiptTemplate(input: { meetingTitle: string; referenceId: string }) {
  return {
    subject: `Proxy received for ${input.meetingTitle}`,
    ...renderBaseTemplate({
      title: 'Proxy receipt confirmation',
      heading: 'Proxy received',
      lines: [`Reference ID: ${input.referenceId}`]
    })
  };
}

export function certificateNoticeTemplate(input: { certificateNumber: string; verificationUrl: string; verificationId: string }) {
  return {
    subject: 'Your stock certificate is available',
    ...renderBaseTemplate({
      title: 'Certificate notice',
      heading: `Certificate ${input.certificateNumber}`,
      lines: [
        `Verification ID: ${input.verificationId}`,
        'You can verify certificate authenticity using the link below.'
      ],
      ctaText: 'Open Verification Link',
      ctaUrl: input.verificationUrl
    })
  };
}
