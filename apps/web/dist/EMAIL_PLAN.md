Repo: https://github.com/1C8Flyers/stockforge

IMPLEMENTATION PROGRESS (live)
- [x] Part 1 — Prisma model + migration SQL + singleton helper
- [x] Part 2 — AES-256-GCM encryption helper with versioned payload format
- [x] Part 3 — Nodemailer mailer service with 60s cache and safe errors
- [x] Part 4 — Admin API endpoints (GET/PUT/POST test) with RBAC + audit
- [x] Part 5 — Shared DTO types in packages/shared
- [x] Part 6 — Admin UI section for Email Settings + Send Test Email
- [x] Part 7 — .env.example + README email setup docs
- [ ] Part 8 — Optional tests (skipped for now; no existing test framework)

Notes:
- SMTP passwords are never returned by API responses and never logged to audit diffs.
- EMAIL_SETTINGS_ENCRYPTION_KEY must be base64 for exactly 32 bytes (AES-256-GCM).
