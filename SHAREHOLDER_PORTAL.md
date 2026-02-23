
Goal: Add a NEW “Shareholder Portal” (separate from Admin UI) that lets authenticated shareholders:
1) View their own holdings/summary (read-only)
2) Create/manage proxies with TWO modes:
   - Temporary proxy: applies to ONE Meeting
   - Standing proxy: applies to ALL meetings until revoked (optional expiresAt)
   Proxies must be auditable, revocable, and meeting-specific proxy overrides standing proxy for that meeting.
3) Record “Heir / Beneficiary Designation” as an intent record (NOT an automatic transfer), including multiple beneficiaries with % allocation.

Constraints / principles:
- Treat this as multi-tenant-ready: every new table must include tenantId, and every query must scope by tenantId.
- One login (User) can belong to multiple tenants; portal must resolve an active tenant by subdomain OR /t/:slug route (choose /t/:slug to minimize DNS).
- Shareholders can ONLY access their own data (Shareholder record + related lots/holdings + their own proxies + their own designations).
- Never delete proxies/designations; use status transitions (PENDING/ACCEPTED/REJECTED/REVOKED) + audit log.
- Add server-side authorization checks everywhere; do not rely on frontend.
- Add minimal UI that is clean and works on mobile.

Deliverables:
A) Prisma schema changes
B) API routes (Fastify) for portal
C) Frontend pages (Vue) for portal
D) Seed + migration/backfill for existing single-tenant data (create default tenant and set tenantId)
E) Basic tests or at least smoke tests for tenant isolation

A) DATA MODEL (Prisma)
1. Create Tenant and TenantUser:
   - Tenant: id (cuid), slug (unique), name, createdAt
   - TenantUser: id, tenantId, userId, roles (string[] or relation), createdAt
   - Unique: @@unique([tenantId, userId])
2. Add tenantId to ALL tenant-owned models (existing + new) and adjust unique indexes to be tenant-scoped where appropriate:
   - AppConfig: @@unique([tenantId, key]) instead of key @unique
   - Review other unique fields and scope them with tenantId if they’re tenant-local.
3. Add ShareholderLink (maps auth User to Shareholder record within a tenant):
   - id, tenantId, userId, shareholderId, verifiedAt, createdAt
   - @@unique([tenantId, userId])
   - @@unique([tenantId, shareholderId])
4. Add ProxyAuthorization:
   - id, tenantId
   - shareholderId (grantor)
   - proxyType enum: MEETING | STANDING
   - meetingId nullable (required if MEETING)
   - proxyHolderShareholderId nullable OR proxyHolderName/email/address fields
   - scope enum: GENERAL | DIRECTED (DIRECTED can be stubbed for now)
   - effectiveAt default now, expiresAt nullable
   - status enum: PENDING | ACCEPTED | REJECTED | REVOKED
   - signedAt, signatureHash (or signatureBlob), ip, userAgent
   - createdByUserId
   - createdAt, updatedAt
   - indexes: [tenantId, shareholderId], [tenantId, meetingId], [tenantId, status]
5. (Optional placeholder) ProxyDirective (only if you want to stub directed proxies):
   - id, tenantId, proxyAuthorizationId, ballotItemId or motionId, instruction YES/NO/ABSTAIN
6. Add BeneficiaryDesignation:
   - id, tenantId, shareholderId
   - status enum: DRAFT | SUBMITTED | ACKNOWLEDGED
   - createdByUserId, createdAt, updatedAt
7. Add BeneficiaryDesignationEntry:
   - id, tenantId, designationId
   - name, relationship nullable, email/phone/address nullable
   - percent (Int) OR (Decimal) ensure total = 100 in service validation
   - createdAt
8. Ensure AuditLog includes tenantId and records changes for proxies/designations (created, submitted, acknowledged, revoked).

B) AUTH / TENANT RESOLUTION
1. Implement tenant resolution via route prefix: /t/:tenantSlug/...
   - Add middleware that loads Tenant by slug and attaches request.tenant
2. Update requireAuth to attach request.user (existing) and request.tenantId
3. Add requireTenantMembership: ensure user is member of tenant (TenantUser exists)
4. Add requireShareholderLink: ensure logged-in user has ShareholderLink for this tenant; attach request.shareholderId

C) API ROUTES (Fastify)
Create new portal route group: /api/portal/t/:tenantSlug
Endpoints:
1. GET /me
   - returns tenant info + shareholder summary + proxy status (active for next meeting) + designation status
2. GET /holdings
   - returns shareholder + lots/certificates/holdings for that shareholder only (read-only)
3. GET /meetings
   - returns upcoming and recent meetings for tenant (limit fields)
4. GET /proxies
   - list proxies created by this shareholder (grantor), newest first
5. POST /proxies
   - create proxy (MEETING or STANDING)
   - validate:
     - MEETING requires meetingId in same tenant
     - If standing: meetingId must be null
     - proxyHolder must be either existing shareholderId in same tenant OR manual name/email
   - set status=PENDING (or ACCEPTED if you want auto-accept, but keep review option)
   - write AuditLog
6. POST /proxies/:id/revoke
   - only grantor can revoke; set status=REVOKED; write AuditLog
7. GET /beneficiaries
   - get current designation (latest) + entries
8. POST /beneficiaries
   - create/update designation:
     - allow draft save and submit
     - validate percent totals 100 on submit
   - write AuditLog
9. POST /beneficiaries/:id/submit
   - set status=SUBMITTED
10. (Admin side) Minimal endpoints to review/accept/reject proxies and acknowledge designations:
   - Keep under existing admin routes but ensure tenant scoping:
     - GET /api/admin/t/:tenantSlug/proxy-requests
     - POST /api/admin/t/:tenantSlug/proxies/:id/accept
     - POST /api/admin/t/:tenantSlug/proxies/:id/reject
     - GET /api/admin/t/:tenantSlug/designations
     - POST /api/admin/t/:tenantSlug/designations/:id/ack

D) PORTAL FRONTEND (Vue)
Add a new app or route segment:
- Public landing: /t/:tenantSlug/portal
- Auth pages: /t/:tenantSlug/portal/login (reuse existing auth if possible)
Pages:
1. Dashboard
   - shares summary, next meeting, active proxy status, “Create/Update Proxy” CTA, beneficiary designation status CTA
2. Holdings
   - read-only tables, downloadable statement button (optional later)
3. Meetings
   - list upcoming + details
4. Proxies
   - list + create proxy form + revoke button
   - Create proxy form:
     - Temporary vs Standing
     - If Temporary: select meeting
     - Select proxy holder: search existing shareholders (optional) or manual name/email
     - Confirm + sign checkbox (e-sign simple for now)
5. Beneficiaries
   - add beneficiaries rows (name, relationship, contact, percent)
   - Save Draft / Submit
Mobile-first layout; reuse existing component patterns in repo.

E) MIGRATION / BACKFILL
1. Create a migration that:
   - Adds Tenant + default tenant row (slug “default”, name “Default”)
   - Adds tenantId columns to existing tables, backfills to default tenant
   - Adds TenantUser for existing admin users (grant ADMIN role) within default tenant
2. Ensure app still runs with existing data after migration.

F) TESTING / SMOKE
- Add a simple test script or minimal route tests:
  - Ensure cross-tenant access is forbidden
  - Ensure revoke updates status not delete

Implementation notes:
- Keep code consistent with existing repo patterns (Fastify plugins, Prisma client usage, Vue routing/store).
- Add clear types for enums in Prisma and shared DTOs if you have a shared package.
- Add comments where security scoping is critical.
- After implementing, run formatter/linter and ensure build passes.

Now start by:
1) Editing prisma/schema.prisma with the new models/enums and tenantId fields + unique index adjustments.
2) Add migration and seed/backfill.
3) Implement tenant middleware and portal routes.
4) Implement minimal portal UI pages with API integration.

---

## Implementation Progress (live)

- [x] Prisma schema updated with tenant foundation + portal models/enums
   - Added `Tenant`, `TenantUser`, `ShareholderLink`, `ProxyAuthorization`, `BeneficiaryDesignation`, `BeneficiaryDesignationEntry`
   - Added `tenantId` to tenant-owned existing models and tenant-scoped indexes
   - Added `AuditLog.tenantId`
- [x] Migration/backfill scaffold added
   - New migration: `apps/api/prisma/migrations/20260222030000_tenant_portal_foundation/migration.sql`
   - Creates default tenant (`id=default`) and backfills `tenantId` defaults
   - Seeds `TenantUser` rows for existing admin users
- [x] Seed updated for default tenant behavior
   - `apps/api/prisma/seed.ts` now upserts default tenant + admin tenant membership
- [x] Tenant middleware added
   - `apps/api/src/lib/tenant.ts` with `requireTenantMembership`, `requireShareholderLink`, `resolveTenantBySlug`
- [x] Portal API routes added (`/api/portal/t/:tenantSlug/...`)
   - `GET /me`, `GET /holdings`, `GET /meetings`, `GET /proxies`
   - `POST /proxies`, `POST /proxies/:id/revoke`
   - `GET /beneficiaries`, `POST /beneficiaries`, `POST /beneficiaries/:id/submit`
- [x] Admin tenant review endpoints added
   - `GET /api/admin/t/:tenantSlug/proxy-requests`
   - `POST /api/admin/t/:tenantSlug/proxies/:id/accept`
   - `POST /api/admin/t/:tenantSlug/proxies/:id/reject`
   - `GET /api/admin/t/:tenantSlug/designations`
   - `POST /api/admin/t/:tenantSlug/designations/:id/ack`
- [x] Minimal portal frontend pages + routing added
   - Routes: `/t/:tenantSlug/portal/login|/|/holdings|/meetings|/proxies|/beneficiaries`
   - New shell: `apps/web/src/layouts/PortalShell.vue`
   - New pages under `apps/web/src/pages/Portal*.vue`
- [x] Tenant isolation smoke checks
   - `GET /api/portal/t/acme/me` (member + shareholder link) => `200`
   - `GET /api/portal/t/delta/me` (member, no shareholder link) => `403`
   - `GET /api/portal/t/gamma/me` (non-member) => `403`
   - `POST /api/portal/t/beta/proxies/px_acme_1/revoke` (cross-tenant id) => `404`
   - `POST /api/portal/t/acme/proxies/px_acme_1/revoke` => `200`; proxy row persisted with `status=REVOKED`
- [x] Build/typecheck pass and final cleanup
   - `npm run -w @cottonwood/api prisma:generate`
   - `npm run -w @cottonwood/api build`
   - `npm run -w @cottonwood/web build`

### Notes / deviations
- Tenant `id` is currently a string key (`default` used for backfill compatibility) rather than strict cuid generation.
- Existing legacy routes remain default-tenant scoped for compatibility while portal/admin tenant routes are explicitly tenant-scoped.
- Migration hardening: `apps/api/prisma/migrations/20260222030000_tenant_portal_foundation/migration.sql` now drops `AppConfig` uniqueness via `ALTER TABLE ... DROP CONSTRAINT IF EXISTS "AppConfig_key_key"` before creating tenant-scoped unique index.
```
