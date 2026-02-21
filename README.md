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
- Lots: CRUD, with immutable share edit rule once in posted transfer
- Transfers: draft CRUD + transactional post endpoint (append-only once posted)
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
