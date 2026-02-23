# Release Notes — Shareholder Portal Rollout

Date: 2026-02-22  
Commit: `bf8f5dc`

- Added a new tenant-aware Shareholder Portal with routes for dashboard, holdings, meetings, proxies, and beneficiary designations.
- Implemented backend tenant resolution and authorization guards to enforce membership + shareholder-link scoping on portal endpoints.
- Added portal API endpoints for viewing holdings/meetings, creating and revoking proxy authorizations, and drafting/submitting beneficiary designations.
- Added admin tenant-scoped review endpoints for proxy request acceptance/rejection and beneficiary designation acknowledgment.
- Extended Prisma schema and migration with tenant foundation models and tenant scoping across tenant-owned records, plus migration hardening for AppConfig uniqueness changes.
- Verified runtime tenant-isolation smoke checks:
  - member+link access succeeds,
  - member without link is denied,
  - non-member is denied,
  - cross-tenant revoke is blocked,
  - same-tenant revoke sets status to `REVOKED` without deleting the record.
- Updated implementation tracker in `SHAREHOLDER_PORTAL.md` to reflect completion and test outcomes.

## Follow-up Update — 2026-02-23

Commit: `2d2b190`, `e228ae7`

- Added Shareholder-centric portal access management so admins can link/unlink portal users directly from Shareholder records.
- Kept Admin Users shortcut controls for linking users to shareholder profiles.
- Added dual-mode tenant URL support during migration:
  - host/subdomain portal routes (`/portal/...`),
  - legacy slug routes (`/t/:tenantSlug/portal/...`) retained as fallback.
- Added host-aware tenant resolution on API side with route-param fallback.
- Added deployment/operations documentation in `INSTRUCTIONS.md` and linked it from the main README.
