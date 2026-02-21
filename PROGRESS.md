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
