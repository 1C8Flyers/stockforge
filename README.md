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

Default NAS mappings:
- Web: `15173 -> 5173`
- API: `13000 -> 3000`
- DB: internal only (no host binding)

Access URLs on NAS:
- Web: `http://enterprise.local:15173`
- API: `http://enterprise.local:13000/api`

Default seeded admin (from .env):
- Email: `ADMIN_EMAIL`
- Password: `ADMIN_PASSWORD`

## Environment variables
Use [.env.example](.env.example).

## Auth + RBAC
Roles enforced server-side:
- Admin
- Officer
- Clerk
- ReadOnly

## Implemented API areas
- Auth: login, me
- Config: get/update (Admin-only update)
- Shareholders: CRUD
- Lots: CRUD with immutable `certificateNumber` and `shares` after creation (edit supports metadata/status updates)
- Transfers: draft CRUD + transactional post endpoint (append-only once posted), explicit `transferDate`, notes, human-readable owner/lot data, and special `Retired Shares` null-owner option
- Meetings: CRUD + snapshot at creation + meeting mode endpoints (attendance, motions, votes)
- Proxies: CRUD with `proxySharesSnapshot` and represented share logic in meeting mode
- Dashboard endpoint with active voting shares, excluded breakdown, majority threshold, top holders, bloc builder, recent activity
- Reports CSV: cap table, meeting proxy report
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

## Recent UX additions
- Shareholders: phone + street/city/state/zip capture and edit support
- Lots: certificate number input in UI; if blank, API auto-generates from `1000+`
- Lots: edit workflow exposed in UI; `certificateNumber` and `shares` lock after creation
- Transfers: explicit Retired Shares from/to option, notes field, and draft `Post / Edit / Cancel` actions
- Admin/Settings: user + role management, password reset, voting config toggle, and system health/migration summary

## Troubleshooting
### `ERR_CONNECTION_REFUSED` to `localhost:3000/api`
Cause: built web bundle still points to localhost API.

Fixes now included:
- Web Docker image accepts build arg `VITE_API_BASE_URL`.
- Compose files pass `VITE_API_BASE_URL` at build time.
- NAS profile sets API URL to `http://enterprise.local:13000/api`.

After updating, rebuild web image:
- `docker compose -f docker-compose.nas.yml up -d --build web`

### Vite host blocked (`enterprise.local is not allowed`)
Fix now included in [apps/web/vite.config.ts](apps/web/vite.config.ts):
- `preview.allowedHosts` includes `enterprise.local`.
