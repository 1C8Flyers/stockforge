# StockForge Instructions

Last updated: 2026-02-23

## What this file is
Operational instructions for running and using the current `main` deployment, including portal tenant access and subdomain mode.

## Local run
1. Copy `.env.example` to `.env`.
2. Start stack:
   - `docker compose up --build`
3. Open:
   - Web: `http://localhost:5173`
   - API: `http://localhost:3000/api`

## NAS deploy
From repo root:
- `docker compose -f docker-compose.nas.yml up -d --build`

Expected services:
- `db` healthy
- `api` up
- `web` up

## Admin login
Default (from `.env`):
- Email: `admin@example.com`
- Password: `ChangeMe123!`

## Portal access (current)
Two URL styles are supported:

1. Slug path mode (legacy/fallback)
- `/t/:tenantSlug/portal/login`
- Example: `https://sfdemo.manring.co/t/default/portal/login`

2. Host mode (subdomain-ready)
- `/portal/login`
- Example: `https://default.sfdemo.manring.co/portal/login`

## Enable subdomain tenant mode
Set these environment variables:

- API (`TENANT_BASE_DOMAIN`):
  - Example: `TENANT_BASE_DOMAIN=sfdemo.manring.co`
- Web (`VITE_TENANT_BASE_DOMAIN`):
  - Example: `VITE_TENANT_BASE_DOMAIN=sfdemo.manring.co`

Also ensure:
- Wildcard DNS exists: `*.sfdemo.manring.co` -> your NPM/public endpoint
- Nginx Proxy Manager forwards host headers and routes:
  - `/` -> `web:5173`
  - `/api` -> `api:3000`

## Linking portal users
Portal requires a `ShareholderLink`.

Recommended workflow:
- Go to **Shareholders**.
- Edit a shareholder.
- Set **Portal access user**.
- Save.

Optional workflow:
- Go to **Admin -> Users & Roles**.
- Set **Portal Shareholder** for a user.

## Quick smoke checks
- Web root: `GET /` should return `200`
- Portal login page: `GET /portal/login` should return `200`
- Auth:
  - `POST /api/auth/login` returns token
  - `GET /api/auth/me` with token returns `200`
- Portal endpoint:
  - `GET /api/portal/t/default/me` with token returns `200` when shareholder is linked

## Notes
- During migration, slug routes and host routes are both supported.
- If user is not linked to a shareholder in tenant, portal endpoints return `403`.
