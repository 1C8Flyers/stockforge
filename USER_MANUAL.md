# Cottonwood Share Manager — User Manual

## 1) What this app does
Cottonwood Share Manager is used to manage:
- Shareholders
- Share lots (certificates)
- Transfer ledger
- Meetings, attendance, motions, and votes
- Meeting proxies
- Reports and audit trail

It is designed so ownership is derived from active lots, and posted transfers are immutable.

---

## 2) Accessing the app

### Local Docker
- Web: http://localhost:5173
- API: http://localhost:3000/api

### NAS deployment
- Web: http://enterprise.local:15173
- API: http://enterprise.local:13000/api

If login fails due to stale browser data, do a hard refresh.

---

## 3) First login
Default seeded admin credentials:
- Email: `admin@example.com`
- Password: `ChangeMe123!`

After first login, change to a secure password in your user-management process.

---

## 4) Roles and permissions

- **Admin**: full access, config, user management
- **Officer**: CRUD operational records, can post transfers and finalize voting operations
- **Clerk**: can create/edit operational drafts, cannot post transfers/finalize restricted actions
- **ReadOnly**: view-only access

The UI hides/disables actions based on role, and API enforces permissions server-side.

---

## 5) Main navigation
- **Dashboard**: voting totals, majority threshold, top holders, bloc builder, recent activity
- **Shareholders**: create and maintain person/entity records
- **Lots**: create and view share certificates/lots
- **Transfers**: draft and post share transfers
- **Meetings/Proxies**: meeting setup, attendance, motions/votes, proxy records
- **Reports**: CSV exports
- **Audit Log**: read-only operational history with filters and change summaries
- **Admin** (Admin role only): user/roles, password reset, config, and health

---

## 6) Core concepts you must know

### Share ownership model
Ownership is calculated from **active share lots**, not from a single “shares” field on shareholder.

### Certificate numbers
- You can enter a certificate number manually when creating a lot.
- If left blank, the system auto-generates one.
- Auto-generated numbers start at `1000` and increment upward.
- After lot creation, certificate number is locked (not editable).

### Lot share quantity
- Share quantity is set at lot creation.
- After lot creation, share quantity is locked (not editable).
- Use transfers to move/reallocate shares instead of editing lot quantity directly.

### Transfer immutability
- Draft transfers can be edited/deleted.
- Once a transfer is **POSTED**, it becomes immutable.

### Voting exclusion rules
Excluded from voting calculations:
- Shareholders with status `DeceasedOutstanding` or `DeceasedSurrendered`
- Lots with status `Surrendered`
- Optional: `Disputed` lots (controlled by config toggle)

### Meeting snapshot
When a meeting is created, voting totals and majority threshold are snapshotted and preserved historically.

---

## 7) Typical workflow

### Step A — Create shareholders
1. Open **Shareholders**.
2. Add person or entity details.
3. Capture contact data: phone, street, city, state, zip.
4. Use the **Edit** button in the table to update existing shareholders.

### Step B — Create lots
1. Open **Lots**.
2. Select owner, enter shares, certificate number (optional), notes (optional), and lot status.
3. Save lot.

If certificate number is blank, the system auto-generates one starting at `1000`.

In lot edit mode, allowed updates are metadata fields (for example owner, status, source, notes). Certificate number and shares remain immutable.

### Step C — Draft transfer
1. Open **Transfers**.
2. Select from-owner and to-owner (including **Retired Shares** option for either side).
3. Set transfer date, source lot, shares, and notes.
4. Save transfer as draft.

Draft transfers support:
- **Edit** (change date/parties/lot/shares/notes)
- **Cancel** (delete draft)
- **Post** (finalize and make immutable)

### Step D — Post transfer (Officer/Admin)
1. In **Transfers**, click **Post** on a draft.
2. System atomically updates source lots and creates recipient lots.
3. Transfer status changes to `POSTED`.

### Step E — Run meeting
1. Open **Meetings/Proxies** and create a meeting.
2. Add attendance.
3. Add/verify proxies.
4. Record motions and votes.
5. Use represented-shares values for live decisions.

---

## 8) Proxies
- Proxies are meeting-specific.
- On create/verify, the app stores `proxySharesSnapshot`.
- Only **Verified** proxies count in represented shares.

---

## 9) Reports
From **Reports** page:
- **Cap Table CSV**
- **Meeting Proxy CSV** (choose meeting first)

Use these exports for review packets and compliance records.

---

## 10) Dashboard metrics explained
- **Active voting shares**: currently eligible shares under configured rules
- **Excluded breakdown**: owner-status exclusions, surrendered lots, disputed (if enabled)
- **Majority threshold**: `floor(activeVotingShares / 2) + 1`
- **Top shareholders**: top 10 by active shares
- **Bloc builder**: selected-holder voting power and percentage

---

## 11) Attachments/uploads
Files uploaded (e.g., proxy documents) are stored on persistent local volume mapped to API uploads path.

---

## 12) Audit log
The system records create/update/post/delete actions with user ID, timestamp, entity context, and JSON diff data for traceability.

---

## 13) Troubleshooting

### “Blocked request. Host is not allowed”
Use the current deployed version with allowed preview host configuration for `enterprise.local`.

### `ERR_CONNECTION_REFUSED` on login
Ensure web is using correct API base URL for deployment:
- NAS should use `http://enterprise.local:13000/api`.

### API unavailable
Check containers:
- `docker compose -f docker-compose.nas.yml ps`

### Transfers look too technical
The transfer table now shows:
- owner names instead of IDs
- lot/certificate references
- transfer date and posted date
- notes

If a lot has no manual certificate number, the auto-generated number is used.

### Initial data load with no existing shareholder lots
If you are loading data for the first time, create a corporation/treasury shareholder record and issue initial lots there. Then transfer from that record to individual shareholders as needed.

Use **Retired Shares** only when shares should move to/from the null-owner retired bucket.

---

## 14) Operational best practices
- Keep Admin accounts limited.
- Use Officer role for posting/final actions.
- Keep Clerk role for data entry and draft prep.
- Reconcile dashboards with exports before formal meetings.
- Back up PostgreSQL volume and uploads volume regularly.

---

## 15) Admin / Settings quick guide

Admin-only page includes:
- **System Health**: DB connectivity and migration count
- **Voting Configuration**: toggle disputed-lot exclusion from voting
- **Create User**: email, temporary password, role selection
- **User Management**: update roles and reset user passwords
