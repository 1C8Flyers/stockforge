type TemplateInput = {
  title: string;
  heading: string;
  lines: string[];
  ctaText?: string;
  ctaUrl?: string;
  footer?: string;
};

export function renderBaseTemplate(input: TemplateInput) {
  const escapedLines = input.lines.map((line) => line.replace(/</g, '&lt;').replace(/>/g, '&gt;'));
  const ctaHtml = input.ctaText && input.ctaUrl
    ? `<p style="margin:20px 0;"><a href="${input.ctaUrl}" style="display:inline-block;background:#2563eb;color:#fff;padding:10px 14px;border-radius:8px;text-decoration:none;">${input.ctaText}</a></p>`
    : '';

  const html = `<!doctype html>
<html>
  <body style="font-family:Arial,Helvetica,sans-serif;background:#f8fafc;color:#0f172a;padding:24px;">
    <div style="max-width:640px;margin:0 auto;background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:24px;">
      <h1 style="font-size:20px;margin:0 0 8px;">StockForge</h1>
      <p style="margin:0 0 20px;color:#64748b;">${input.title}</p>
      <h2 style="font-size:18px;margin:0 0 12px;">${input.heading}</h2>
      ${escapedLines.map((line) => `<p style="margin:0 0 10px;">${line}</p>`).join('')}
      ${ctaHtml}
      <p style="margin-top:24px;color:#64748b;font-size:12px;">${input.footer || 'This message was sent by StockForge.'}</p>
    </div>
  </body>
</html>`;

  const text = [
    'StockForge',
    input.title,
    '',
    input.heading,
    ...input.lines,
    input.ctaText && input.ctaUrl ? `${input.ctaText}: ${input.ctaUrl}` : '',
    '',
    input.footer || 'This message was sent by StockForge.'
  ]
    .filter(Boolean)
    .join('\n');

  return { html, text };
}
