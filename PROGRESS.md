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
	- app branding controls: display name + logo URL
	- branding save feedback with explicit success/error messaging in Admin page
	- system health + migration count visibility
	- audit log page with human-readable summaries

- Auth/session resilience improvements completed:
	- API now validates that JWT subject still exists in DB (prevents stale-token FK failures after DB resets)
	- web auto-clears session and redirects to login on API `401` responses

- UI modernization completed across app shell and all major pages:
	- Tailwind-based reusable components and responsive app shell
	- full-width layout behavior (no centered app-width cap)
	- Shareholders + Transfers converted to responsive table/card + drawer CRUD pattern
	- Dashboard/Lots/Meetings/Reports/Audit/Admin/Login refined to consistent modern styling
- Meetings/proxy workflow completed on web page:
	- attendance toggles on selected meeting
	- motion creation and vote submission from web UI
	- proxy verify/revoke controls and represented-share refresh
- Voting enhancements completed:
	- per-shareholder ballots for present attendees
	- automatic share-weighted tallying from active shares
	- election vote type with office + candidate setup and candidate totals/winner detail
	- election motions now display winners/totals instead of Passed/Failed result framing
	- motions now auto-close after vote recording; reopening is explicit and required for additional voting
- Reporting enhancements completed:
	- PDF layout cleanup (table readability and column tuning)
	- meeting report PDF export with meeting summary, attendance, proxies, motions, and vote details
- Pending-work visibility enhancements completed:
	- Transfers nav badge shows count of draft transfers
	- Meetings nav badge shows count of open motions + draft proxies
	- Meetings page left list shows per-meeting pending count (open motions + draft proxies)
	- Meeting detail tabs now show pending badges only when applicable (`Proxies` for Draft items, `Motions & Votes` for open motions)
- Stock certificate printing MVP completed:
	- new API endpoint to render certificate PDF for lot records
	- Lots page print action for Admin/Officer users
	- printing restricted to `Active` lots with clear user-facing errors for non-printable statuses
	- certificate output supports explicit `ORIGINAL` and `REPRINT` labels
