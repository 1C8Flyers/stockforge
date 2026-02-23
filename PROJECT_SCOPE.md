You are building a self-hosted web app called "Cottonwood Share Manager" for shareholder/share/voting/proxy/meeting management.

Update (2026-02-23):
- Portal user linking is now implemented in both Shareholders and Admin Users workflows.
- Tenant-aware portal routing now supports both slug and subdomain-compatible host mode.
- Deployment and operational runbook is tracked in `INSTRUCTIONS.md`.

STACK (must use):
- Backend: Node.js + TypeScript + Fastify (preferred) OR Express, Prisma ORM, PostgreSQL
- Frontend: Vue 3 + TypeScript + Vite, Vue Router, Pinia
- Auth: session cookie or JWT (choose one, implement RBAC server-side)
- Deployment: Docker Compose (postgres + api + web). Must run behind Nginx Proxy Manager.
- File uploads: store on local volume mounted into api container; persist across restarts.

CORE DOMAIN RULES:
- Shares are tracked as Share Lots (certificates) owned by Shareholders.
- Ownership is derived from active Share Lots, not a single "shares" number field.
- Transfers are a ledger. Once POSTED, transfers are immutable (append-only).
- Meeting snapshots must preserve historical calculations even if shareholders/lots change later.
- Voting eligibility: exclude shareholders with status "Deceased-Outstanding" or "Deceased-Surrendered". Exclude lots with status "Surrendered". Add a config toggle to optionally exclude "Disputed" lots.

ROLES:
- Admin: full access + user management + config
- Officer: CRUD shareholders/lots/transfers/proxies/meetings but no user mgmt
- Clerk: can create/edit shareholders, draft transfers/proxies, upload attachments; cannot post transfers or finalize meetings
- ReadOnly: view only

FEATURES (MVP):
1) Dashboard:
   - Active voting shares
   - Excluded shares breakdown
   - Majority threshold = floor(activeVotingShares/2)+1
   - Top 10 shareholders by active shares
   - Bloc Builder: multi-select shareholders -> sum of active shares and % of active voting shares
   - Recent activity log

2) Shareholders:
   - CRUD shareholders (person or entity), contact info, status, notes, tags
   - Shareholder detail view shows active shares, excluded shares, lots table, transfers table

3) Lots/Certificates:
   - Create lots with certificateNumber (optional), shares, acquiredDate, source, notes, status, ownerId
   - Lots can’t have shares edited after creation if they’ve ever been involved in a posted transfer (enforce in backend)
   - Lot status: Active, TransferredOut, Surrendered, Disputed

4) Transfers:
   - Draft transfer wizard: fromOwner, toOwner (or “Corporation” special recipient), number of shares, choose lots to draw down (default FIFO), notes, attachments
   - Post transfer endpoint: atomically updates lots and creates recipient lots; logs to audit
   - Transfers ledger view with filters and detail page

5) Meetings:
   - Create meeting; snapshot active voting shares and majority threshold at creation (store snapshot record)
   - Meeting mode page:
     - attendance list (present shareholders)
     - proxies list for meeting (see below)
     - live represented shares: present + proxy shares
     - motions: create motion; record vote yes/no/abstain by shares; show Passed/Failed

6) Proxies:
   - Meeting-specific proxies: grantor shareholder -> proxyHolderName (and optional shareholder link), receivedDate, status Draft/Verified/Revoked, attachment upload
   - When proxy is created/verified, store a snapshot of grantor active shares at that time (proxySharesSnapshot)
   - Meeting represented shares includes verified proxies only

7) Reports:
   - Export cap table CSV (shareholder name, status, activeShares, excludedShares, email, phone)
   - Export meeting proxy report CSV/PDF-lite (CSV is fine for MVP)

8) Audit Log:
   - Record create/update/post actions with userId, timestamp, entityType, entityId, action, diff JSON

DATABASE (Prisma):
- users, roles, user_roles
- shareholders (type: PERSON|ENTITY, names, contact fields, status enum, notes)
- shareLots (ownerId, shares, status, certificateNumber, acquiredDate, source, notes)
- transfers (fromOwnerId nullable, toOwnerId nullable, meetingId nullable, status DRAFT|POSTED, postedAt, notes)
- transferLines (transferId, lotId, sharesTaken)
- meetings (title, dateTime, snapshotId)
- meetingSnapshots (activeVotingShares, excludedShares, majorityThreshold, rulesJson)
- proxies (meetingId, grantorId, proxyHolderName, proxyHolderShareholderId nullable, receivedDate, status, proxySharesSnapshot, attachmentId nullable)
- attendance (meetingId, shareholderId, present boolean)
- motions (meetingId, title, text, voteRule SIMPLE_MAJORITY default)
- votes (motionId, yesShares, noShares, abstainShares, result)
- attachments (path, originalName, mimeType, size, createdBy)
- auditLog (userId, action, entityType, entityId, diffJson)

IMPLEMENTATION REQUIREMENTS:
- Server-side validation (zod or similar)
- Transactions for posting transfers (Prisma transaction)
- Seed script: create admin user
- Minimal clean UI; tables with filters and search; avoid complex styling
- Write clear README with setup steps and env vars
- Provide docker-compose.yml and .env.example
- Add automated database migration commands (prisma migrate deploy) in container startup

OUTPUT:
- Create a monorepo structure:
  /apps/api (Fastify)
  /apps/web (Vue)
  /packages/shared (types)
- Provide the full code necessary to run locally with Docker Compose.
- Include instructions for Nginx Proxy Manager: web -> /, api -> /api, and CORS configuration.

Start by scaffolding the repo, prisma schema, auth + RBAC middleware, then implement core CRUD, then transfers posting, then meeting mode.