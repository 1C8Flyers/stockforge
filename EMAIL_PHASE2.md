Repo: https://github.com/1C8Flyers/stockforge

Context / current state
- Admin can reset user passwords today via apps/api/src/routes/admin.ts (PUT /admin/users/:id/password). :contentReference[oaicite:1]{index=1}
- Meeting report PDF export exists and includes meeting summary, attendance, proxies, motions, vote details. :contentReference[oaicite:2]{index=2}
- Certificate printing exists + public verification link/QR exists. :contentReference[oaicite:3]{index=3}
- App has RBAC roles (Admin/Officer/Clerk/ReadOnly) and audit logging via audit(). :contentReference[oaicite:4]{index=4}

Assume SMTP + DB-backed encrypted email settings are already implemented (admin UI + /api/admin/email-settings + mailer service).
Now implement the first set of high-value, low-risk emails:

(1) Self-service password reset emails
(2) Meeting report delivery emails to officers
(3) Proxy receipt confirmation (ONLY IF/WHEN a proxy is submitted through a public/self-service path; do not email on officer-entered proxies)
(4) Certificate issuance notice (optional; OFF by default)

================================================================================
PART A — Add “Email Preferences” (feature toggles) to AppConfig
================================================================================
Use the existing AppConfig pattern (key/value or JSON) to add these toggles:
- email.passwordResetsEnabled (default true once SMTP configured, but safe to leave false until configured)
- email.meetingReportsEnabled (default true)
- email.proxyReceiptEnabled (default false)  // only if we add public proxy submission
- email.certificateNoticesEnabled (default false)  // keep OFF by default; this is shareholder-facing

Expose these toggles in Admin UI alongside existing settings (AdminPage.vue already has other toggles like voting config etc.). :contentReference[oaicite:5]{index=5}

================================================================================
PART B — Email templates
================================================================================
Create a minimal templating approach in apps/api:
- apps/api/src/emails/templates/base.ts or base.html string
- Keep styling simple: header (StockForge / org display name), body, footer
- Always include plain text fallback.

Templates to add:
1) password-reset
   Subject: “Reset your StockForge password”
   Body: short, includes reset link + expiration
2) meeting-report
   Subject: “Meeting Report: <meeting title> (<date>)”
   Body: summary + attach PDF
3) proxy-receipt (placeholder; implement once public proxy submission exists)
   Subject: “Proxy received for <meeting title>”
4) certificate-notice (optional; OFF by default)
   Subject: “Your stock certificate is available”
   Body includes verification link/ID (do NOT attach if you prefer), or attach PDF if policy allows.

================================================================================
PART C — (1) Self-service password reset emails (move beyond admin resets)
================================================================================
Add Prisma model:
model PasswordResetToken {
  id        String   @id @default(cuid())
  userId    String
  tokenHash String   @unique
  expiresAt DateTime
  usedAt    DateTime?
  createdAt DateTime @default(now())
  user      User @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@index([userId])
  @@index([expiresAt])
}

Security:
- Generate random token (32+ bytes), store only a hash (SHA-256) in DB.
- Reset link uses raw token; API compares hash.
- Token expires (e.g. 60 minutes) and is one-time use (usedAt).

API routes (new file apps/api/src/routes/passwordReset.ts or add into auth routes if they exist):
- POST /auth/request-password-reset
  Body: { email }
  Behavior:
    - Always return { ok: true } (don’t reveal whether email exists)
    - If user exists and email.passwordResetsEnabled is true and email is configured:
        - create token row
        - send password reset email with link: <PUBLIC_APP_URL>/reset-password?token=... (use existing config/public URL if present)
    - Audit log: PASSWORD_RESET_REQUESTED (no PII beyond email domain; avoid leaking whether account exists)

- POST /auth/reset-password
  Body: { token, newPassword }
  Behavior:
    - validate token hash, not expired, not used
    - update user passwordHash
    - mark token usedAt
    - audit: PASSWORD_RESET_COMPLETED

Web UI:
- Add “Forgot password?” link on Login page -> RequestReset page
- Add ResetPassword page that reads token from query string and posts new password.

Make sure this coexists with existing Admin reset endpoint (admin can still do manual resets). :contentReference[oaicite:6]{index=6}

================================================================================
PART D — (2) Meeting report delivery to officers (high-value)
================================================================================
Add an email action in Meetings/Reports UI:
- In the meeting detail screen (or Reports page), add button: “Email Meeting Report”
- Admin/Officer only

Server-side endpoint:
- POST /meetings/:id/email-report
  preHandler: requireRoles(Admin, Officer)
  Body: optional { recipients?: string[] } or { recipientMode: 'officers' | 'custom' }
  Default: send to all Users with Officer role (and Admin optionally), using their user.email field.
  Steps:
    1) generate the meeting report PDF using the existing meeting report PDF generator (reuse same function as the PDF export endpoint). :contentReference[oaicite:7]{index=7}
    2) send email with PDF as attachment (filename: meeting-report-<date>.pdf)
    3) audit: MEETING_REPORT_EMAILED with meetingId, recipientsCount, success/failure

Guardrails:
- Require email.meetingReportsEnabled toggle true
- Require SMTP enabled/configured
- Fail with safe message if no officer emails found

Also add “Send test to me” option: send to the current user only.

================================================================================
PART E — (3) Proxy receipt confirmation (defer until public proxy submission exists)
================================================================================
Current proxies are created/verified by officers in the meeting workflow. Do NOT email those.
Instead, implement email sending only when we add a public endpoint for proxy submission.

Plan now:
- Add a placeholder service method: sendProxyReceiptEmail({ meetingId, grantorEmail, holderEmail, sharesSnapshot, status })
- Add toggle email.proxyReceiptEnabled (default false)
- When a future public proxy submission endpoint is implemented, call this function to:
  - email the grantor: “We received your proxy…”
  - optionally email the proxy holder
  - include meeting title/date + a reference ID
  - audit: PROXY_RECEIPT_EMAILED

No UI changes required today beyond toggle visibility.

================================================================================
PART F — (4) Certificate issuance notice (optional; OFF by default)
================================================================================
Because certificate notices go to shareholders, keep OFF by default and require explicit enable.

Implementation:
- Add toggle email.certificateNoticesEnabled default false.
- Add a new action in Lots UI for Admin/Officer: “Email Certificate”
  - Only visible if toggle enabled and shareholder has an email.
  - Email includes:
      - shareholder name
      - certificate number
      - verification link (public verification URL already exists) :contentReference[oaicite:8]{index=8}
      - optionally attach certificate PDF (use existing certificate PDF render endpoint)
  - audit: CERTIFICATE_EMAILED with lotId, shareholderId, success/failure

DO NOT auto-email on every print/issue by default. Keep it manual.

================================================================================
PART G — Email logging (recommended for governance)
================================================================================
Add model EmailLog:
- id, createdAt, type ('PASSWORD_RESET','MEETING_REPORT','CERTIFICATE','PROXY_RECEIPT')
- to, subject
- relatedEntityType, relatedEntityId
- status ('SENT','FAILED')
- errorSafe (string nullable)

Write EmailLog rows for every send attempt.
Add Admin-only UI section to view logs (simple table; last 100).

================================================================================
PART H — Acceptance Criteria
================================================================================
1) Password reset request flow works end-to-end and does not reveal whether an email exists.
2) Meeting report can be emailed to officers and attaches the same PDF as the export feature.
3) Proxy receipt email is not sent anywhere until a future public submission endpoint exists.
4) Certificate email is manual-only and off by default; uses public verification link and/or PDF.
5) All sends are audited and logged; no secrets or SMTP creds are leaked.
6) RBAC enforced: only Admin/Officer for meeting report/cert email; public only for password reset request.

================================================================================
IMPLEMENTATION STATUS (current)
================================================================================
- [x] Part A — Email preference toggles added to AppConfig flow and Admin UI.
- [x] Part B — Basic email templates added (password reset, meeting report, proxy receipt placeholder, certificate notice).
- [x] Part C — Self-service password reset API + public web pages (`/request-password-reset`, `/reset-password`).
- [x] Part D — `POST /meetings/:id/email-report` implemented with PDF attachment and recipient modes (`officers`, `custom`, `me`).
- [x] Part E — Proxy receipt service placeholder added; not wired into officer-entered proxy flows.
- [x] Part F — Manual certificate email endpoint + Lots UI action, guarded by toggle and shareholder email.
- [x] Part G — EmailLog model + writes on send attempts + Admin logs table/API.
- [ ] Additional policy tuning (if needed): auto-default `email.passwordResetsEnabled` when SMTP first becomes configured.