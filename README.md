# Cottonwood Share Manager MVP

Monorepo structure:
- apps/api: Fastify + Prisma + PostgreSQL + JWT/RBAC
- apps/web: Vue 3 + TypeScript + Vite + Router + Pinia
- packages/shared: shared TS types

## Project structure
- apps/api: REST API, auth, RBAC, Prisma schema/migrations, seed, uploads
- apps/web: Vue UI for dashboard/shareholders/lots/transfers/meetings/reports
- packages/shared: shared enums/types

## Quick start (Docker)
1. Copy [.env.example](.env.example) to .env and adjust values.
2. Start stack:
   - `docker compose up --build`
3. Open:
   - Web: http://localhost:5173
   - API: http://localhost:3000/api

Container startup for API runs:
1) `prisma migrate deploy`
2) `seed`
3) `start`

## NAS deployment (Enterprise)
For NAS environments where ports `3000`/`5173`/`5432` are already in use, use the NAS compose profile:

- Compose file: [docker-compose.nas.yml](docker-compose.nas.yml)
- Run:
   - `docker compose -f docker-compose.nas.yml up -d --build`

NPM network mode (recommended):
- `web`, `api`, and `db` are attached to external Docker network `npm_default`
- no direct host `ports` for `web`/`api` (NPM is the only public entrypoint)
- `db` still has no host port binding

Prerequisite:
- Ensure Nginx Proxy Manager stack is running and provides Docker network `npm_default`

NPM routing:
- `/` -> `web:5173`
- `/api` -> `api:3000`

NAS env expectations for this profile:
- `VITE_API_BASE_URL=/api`
- `CORS_ORIGIN=https://<your-public-domain>`
- `PUBLIC_APP_BASE_URL=https://<your-public-domain>`

Default seeded admin (from .env):
- Email: `ADMIN_EMAIL`
- Password: `ADMIN_PASSWORD`

## Environment variables
Use [.env.example](.env.example).

Certificate verification settings:
- `CERT_VERIFICATION_SECRET`: HMAC secret used to sign certificate verification links (recommended to set explicitly in production)
- `PUBLIC_APP_BASE_URL`: public web origin used in certificate QR links (example: `https://shares.example.com`)

Email settings:
- `EMAIL_SETTINGS_ENCRYPTION_KEY`: base64-encoded 32-byte key used for AES-256-GCM encryption of SMTP password values at rest

## Auth + RBAC
Roles enforced server-side:
- Admin
- Officer
- Clerk
- ReadOnly

## Implemented API areas
- Auth: login, me
- Config: get/update (Admin-only update) for voting + app branding (`appDisplayName`, `appLogoUrl`, `appIncorporationState`, `appPublicBaseUrl`)
- Shareholders: CRUD
- Lots: CRUD with immutable `certificateNumber` and `shares` after creation (edit supports metadata/status updates), including `Treasury` status
- Transfers: draft CRUD + transactional post endpoint (append-only once posted), explicit `transferDate`, notes, human-readable owner/lot data, and special `Retired Shares` null-owner option
- Meetings: CRUD + snapshot at creation + meeting mode endpoints (attendance, motions, votes), including election-type motions with office/candidate setup and persisted motion close/reopen state
- Proxies: CRUD with `proxySharesSnapshot` and represented share logic in meeting mode
- Dashboard endpoint with active voting shares, excluded breakdown, majority threshold, top holders, bloc builder, recent activity
- Reports CSV/PDF: ownership (cap table), meeting proxy, and detailed meeting reports
- Upload endpoint storing files on local mounted volume
- Audit log for create/update/post/delete actions

## Local dev (without Docker)
- `npm install`
- `npm run prisma:generate`
- `npm run prisma:migrate`
- `npm run seed`
- `npm run dev:api`
- `npm run dev:web`

## Nginx Proxy Manager guidance
Use one Proxy Host with custom location routing:
1. Forward host default location `/` to `web:5173`
2. Add custom location `/api` forwarding to `api:3000`
3. Keep websocket support enabled

Environment/CORS for proxy deployment:
- Set `VITE_API_BASE_URL=/api`
- Set `CORS_ORIGIN` to your public web origin (for example `https://shares.example.com`)
- Keep auth token in `Authorization: Bearer <token>`

## Email setup
- Set `EMAIL_SETTINGS_ENCRYPTION_KEY` in your environment before enabling email in Admin.
- In Admin → Email Settings, configure SMTP host/port/secure/user/password plus from-name/from-email.
- Use **Send test email** in Admin to validate transporter config and delivery.
- API responses never return SMTP password; they expose only `hasPassword`.

## Recent UX additions
- Shareholders: phone + street/city/state/zip capture and edit support
- Lots: certificate number input in UI; if blank, API auto-generates from `1000+`
- Lots: edit workflow exposed in UI; `certificateNumber` and `shares` lock after creation
- Voting: `Treasury` lots are excluded from voting; owner exclusion includes `Inactive`, `DeceasedOutstanding`, and `DeceasedSurrendered`
- Transfers: explicit Retired Shares from/to option, notes field, and draft `Post / Edit / Cancel` actions
- Admin/Settings: user + role management, password reset, voting config toggle, app display name/logo controls, and system health/migration summary
- Auth/Session: stale JWT sessions are rejected after DB resets and web auto-redirects to login on API 401 responses (public certificate verification routes are excluded)
- Meetings/Votes: attendance-driven per-shareholder ballot entry with automatic share-weighted vote totals
- Meetings/Votes: election vote type with office + candidates and candidate-level share tallying
- Meetings/Votes: election motions report winners/totals (not Passed/Failed)
- Meetings/Votes: motions auto-close after votes are recorded; additional votes are blocked until explicitly reopened
- Navigation: Transfers and Meetings menu items now show pending badges (draft transfers; open motions + draft proxies)
- Meetings page: left-side meeting list includes per-meeting pending badge (open motions + draft proxies)
- Meetings page: Proxies and Motions & Votes tabs show pending badges only when draft proxies/open motions exist
- Lots: Admin/Officer can print stock certificate PDFs for Active lots from the Lots page
- Lots: certificate printing now supports explicit `Original` and `Reprint` actions with matching PDF labels
- Branding: Admin can configure `State of incorporation`, rendered under company name on stock certificates
- Certificates: each printed certificate includes a verification ID and QR link to public verification page
- Certificates: verification endpoint checks signed query parameter to detect tampered verification links
- Certificates: verification link base URL source priority is `appPublicBaseUrl` (Admin setting), then `PUBLIC_APP_BASE_URL`, then request-derived host/origin fallback
- Certificates: frontend accepts canonical and legacy verification link forms (`/verify/certificate/:id`, `/verify/:id`, `/verify/stock/:id`) and normalizes them to the canonical route
- Certificates: hash-style/older scanner URL variants containing `CERT-...` are normalized to the public verification page
- Reports: meeting report PDF capturing attendance, proxies, motions, and detailed vote outcomes

## Troubleshooting
### `ERR_CONNECTION_REFUSED` to `localhost:3000/api`
Cause: built web bundle still points to localhost API.

Fixes now included:
- Web Docker image accepts build arg `VITE_API_BASE_URL`.
- Compose files pass `VITE_API_BASE_URL` at build time.
- NAS profile uses relative `/api` for NPM reverse proxy routing.

After updating, rebuild web image:
- `docker compose -f docker-compose.nas.yml up -d --build web`

### Vite host blocked (`enterprise.local is not allowed`)
Fix now included in [apps/web/vite.config.ts](apps/web/vite.config.ts):
- `preview.allowedHosts` includes `enterprise.local` and `sfdemo.manring.co`.

## UI Modernization (apps/web)

Frontend UI is modernized with Tailwind and a responsive app shell.

Tailwind setup files:
- [apps/web/tailwind.config.ts](apps/web/tailwind.config.ts)
- [apps/web/postcss.config.cjs](apps/web/postcss.config.cjs)
- [apps/web/src/styles/tailwind.css](apps/web/src/styles/tailwind.css)
- Imported in [apps/web/src/main.ts](apps/web/src/main.ts)

Layout shell usage:
- [apps/web/src/layouts/AppShell.vue](apps/web/src/layouts/AppShell.vue) provides desktop sidebar, mobile drawer nav, sticky header, and logout.
- [apps/web/src/App.vue](apps/web/src/App.vue) applies `AppShell` to all routes except `/login` and public `/verify/*` routes.
- Shell now spans full browser width and supports configurable app name/logo from Admin settings.

Reusable UI primitives:
- Components live in [apps/web/src/components/ui](apps/web/src/components/ui)
- Includes `Button`, `Card`, `Input`, `Select`, `Badge`, `DropdownMenu`, `Drawer`, `ConfirmDialog`, `EmptyState`, and `LoadingState`.

CRUD page pattern:
- Desktop table + mobile cards
- Search filter at top
- Row actions in `DropdownMenu`
- Create/Edit in right drawer on desktop and full-screen sheet on mobile
- Applied in:
   - [apps/web/src/pages/ShareholdersPage.vue](apps/web/src/pages/ShareholdersPage.vue)
   - [apps/web/src/pages/TransfersPage.vue](apps/web/src/pages/TransfersPage.vue)

Refined pages with consistent card/table/form styling:
- [apps/web/src/pages/DashboardPage.vue](apps/web/src/pages/DashboardPage.vue)
- [apps/web/src/pages/LotsPage.vue](apps/web/src/pages/LotsPage.vue)
- [apps/web/src/pages/MeetingsPage.vue](apps/web/src/pages/MeetingsPage.vue)
- [apps/web/src/pages/ReportsPage.vue](apps/web/src/pages/ReportsPage.vue)
- [apps/web/src/pages/AuditLogPage.vue](apps/web/src/pages/AuditLogPage.vue)
- [apps/web/src/pages/AdminPage.vue](apps/web/src/pages/AdminPage.vue)
- [apps/web/src/pages/LoginPage.vue](apps/web/src/pages/LoginPage.vue)
