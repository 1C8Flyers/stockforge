# Cottonwood Share Manager Progress

## Status legend
- [ ] Not started
- [~] In progress
- [x] Done

## Milestones
- [x] 1. Scaffold monorepo (`apps/api`, `apps/web`, `packages/shared`)
- [x] 2. Prisma schema + migrations + seed admin user
- [x] 3. API auth (JWT) + RBAC middleware
- [x] 4. Core CRUD (shareholders, lots, transfers, meetings, proxies)
- [x] 5. Transfer posting transaction (immutable ledger)
- [x] 6. Meeting mode (attendance, represented shares, motions, votes)
- [x] 7. Dashboard/report endpoints
- [x] 8. Vue frontend MVP pages
- [x] 9. Docker Compose deployment + startup migration
- [x] 10. README + Nginx Proxy Manager guidance

## Notes
- Project initialized from `PROJECT_SCOPE.md`.
- Progress will be updated as each milestone lands.
- MVP implementation landed with API/Web/Shared workspaces, Docker, migrations, and seed admin flow.
- Workspace build validation passed (`npm run build`).
- Second pass completed: web app now hydrates `auth/me` and applies client-side role-aware UX for `Admin`/`Officer`/`Clerk`/`ReadOnly` actions.
- Deployed to NAS path `/backup-8tb/Docker/stockforge` using compose profile `docker-compose.nas.yml`.
- Deployment hardening completed:
	- fixed API container start path (`dist/src/index.js`)
	- updated `@fastify/sensible` for Fastify v5 compatibility
	- added Vite `preview.allowedHosts` for `enterprise.local`
	- baked `VITE_API_BASE_URL` into web Docker build to avoid stale `localhost:3000/api`
	- updated NAS CORS/API URL mapping (`enterprise.local:15173` -> `enterprise.local:13000/api`)
- Shareholder contact enhancements completed: phone + address fields (street/city/state/zip) and edit existing shareholder records.
- Transfer enhancements completed:
	- capture and display transfer date
	- human-readable transfer rows (owner names, cert/lot references, posted date)
	- explicit Retired Shares from/to option (null-owner transfer bucket)
	- draft actions now include Post / Edit / Cancel
	- notes captured on transfer creation
- Lot certificate enhancements completed:
	- certificate number input added to Lots UI
	- auto-certificate generation starts at `1000` when blank
	- lot edit workflow exposed in UI
	- certificate number and share quantity locked after lot creation (UI + API enforcement)
	- added `Treasury` lot status
	- treasury lots excluded from voting calculations and shown separately on dashboard exclusion breakdown
	- owner-status exclusion now also includes `Inactive`
- Admin/settings MVP completed:
	- admin-only user creation
	- role assignment updates
	- password reset for users
	- voting config toggle UI (`excludeDisputedFromVoting`)
	- system health + migration count visibility
	- audit log page with human-readable summaries
