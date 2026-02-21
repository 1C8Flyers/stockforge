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

## 2) First login
Default seeded admin credentials:
- Email: `admin@example.com`
- Password: `ChangeMe123!`

After first login, change to a secure password in your user-management process.

---

## 3) Roles and permissions

- **Admin**: full access, config, user management
- **Officer**: CRUD operational records, can post transfers and finalize voting operations
- **Clerk**: can create/edit operational drafts, cannot post transfers/finalize restricted actions
- **ReadOnly**: view-only access

The UI hides/disables actions based on role, and API enforces permissions server-side.

---

## 4) Main navigation
- **Dashboard**: voting totals, majority threshold, top holders, bloc builder, recent activity
- **Shareholders**: create and maintain person/entity records
- **Lots**: create and view share certificates/lots
- **Transfers**: draft and post share transfers
- **Meetings/Proxies**: meeting list + detail workspace (Overview, Attendance, Proxies, Motions & Votes)
- **Reports**: CSV exports
- **Audit Log**: read-only operational history with filters and change summaries
- **Admin** (Admin role only): user/roles, password reset, config, and health

Navigation pending indicators:
- **Transfers** shows a badge when draft transfers are pending.
- **Meetings/Proxies** shows a badge when open motions or draft proxies are pending.

---

## 5) Core concepts you must know

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
- Shareholders with status `Inactive`, `DeceasedOutstanding`, or `DeceasedSurrendered`
- Lots with status `Treasury` or `Surrendered`
- Optional: `Disputed` lots (controlled by config toggle)

### Meeting snapshot
When a meeting is created, voting totals and majority threshold are snapshotted and preserved historically.

---

## 6) Typical workflow

### Step A — Create shareholders
1. Open **Shareholders**.
2. Add person or entity details.
3. Capture contact data: phone, street, city, state, zip.
4. Use the **Edit** button in the table to update existing shareholders.

### Step B — Create lots
1. Open **Lots**.
2. Click **Add lot** to open the lot entry popup card.
3. Select owner, enter shares, certificate number (optional), notes (optional), and lot status.
4. Save lot.

For updates, use **Edit** on a lot row/card to open the same popup in edit mode.

If certificate number is blank, the system auto-generates one starting at `1000`.

In lot edit mode, allowed updates are metadata fields (for example owner, status, source, notes). Certificate number and shares remain immutable.

Printing certificates:
- Admin/Officer users can use **Original** or **Reprint** on lot rows/cards to generate stock certificate PDFs.
- Certificate PDFs include a visible `ORIGINAL` or `REPRINT` label based on the selected action.
- Certificate PDFs include a `State of Incorporation` line under the corporation name when set in Admin branding.
- Certificate PDFs include a `Verification ID`, signed verification URL, and QR code.
- Anyone can open the QR link to the public verification page and confirm certificate authenticity.
- Only lots with status `Active` are printable; non-active lots return a clear message.

### Step C — Draft transfer
1. Open **Transfers**.
2. Click **Create transfer** to open the transfer popup card.
3. Select from-owner and to-owner (including **Retired Shares** option for either side).
4. Set transfer date, source lot, shares, and notes.
5. Click **Create transfer** to save as draft.

Draft transfers support:
- **Edit** (change date/parties/lot/shares/notes)
- **Cancel** (delete draft)
- **Post** (finalize and make immutable)

### Step D — Post transfer (Officer/Admin)
1. In **Transfers**, click **Post** on a draft.
2. System atomically updates source lots and creates recipient lots.
3. Transfer status changes to `POSTED`.

### Step E — Run meeting
1. Open **Meetings/Proxies**.
2. Click **Create meeting** to open the meeting popup card, then save.
3. Select the meeting from the left-side list.
	- Each meeting row shows a pending badge when that meeting has open motions or draft proxies.
4. In the meeting detail area, use tabs:
	- **Overview** for summary and quick actions
	- **Attendance** to mark present shareholders
	- **Proxies** to add/verify/revoke proxies (tab badge appears only when draft proxies are pending)
	- **Motions & Votes** to add motions and record/reopen votes (tab badge appears only when open motions are pending)
5. Record motions and votes.

Vote entry supports two patterns:
- **Standard motion**: present shareholders vote Yes/No/Abstain.
- **Election**: choose office + candidates, then each present shareholder selects a candidate.

In both cases, recorded results are share-weighted automatically based on each voter’s active eligible shares.
- Standard motions are reported as Yes/No/Abstain totals with Passed/Failed outcomes.
- Election motions are reported as candidate totals and winner(s), not Passed/Failed.
After a motion vote is recorded, that motion is marked **Closed** and no additional votes can be recorded unless a user explicitly clicks **Reopen voting**.
6. Use represented-shares values for live decisions.

---

## 7) Proxies
- Proxies are meeting-specific.
- On create/verify, the app stores `proxySharesSnapshot`.
- Only **Verified** proxies count in represented shares.

---

## 8) Reports
From **Reports** page:
- **Ownership Report (Cap Table) CSV or PDF**
- **Meeting Proxy CSV or PDF** (choose meeting first)
- **Meeting Report PDF** (choose meeting first) with:
	- meeting summary totals
	- attendance (present)
	- proxies and statuses
	- standard motion vote results
	- election totals and winner details
	- detailed ballot/election breakdown

Use these exports for review packets and compliance records.

---

## 9) Dashboard metrics explained
- **Active voting shares**: currently eligible shares under configured rules
- **Excluded breakdown**: owner-status exclusions, treasury lots, surrendered lots, disputed (if enabled)
- **Majority threshold**: `floor(activeVotingShares / 2) + 1`
- **Top shareholders**: top 10 by active shares
- **Bloc builder**: selected-holder voting power and percentage

---

## 10) Attachments/uploads
Files uploaded (e.g., proxy documents) are stored on persistent local volume mapped to API uploads path.

---

## 11) Audit log
The system records create/update/post/delete actions with user ID, timestamp, entity context, and JSON diff data for traceability.

---

## 12) Troubleshooting

### “Blocked request. Host is not allowed”
Use the current deployed version with allowed preview host configuration for `enterprise.local`.

### `ERR_CONNECTION_REFUSED` on login
Ensure web is using correct API base URL for deployment:
- NAS should use `http://enterprise.local:13000/api`.

### Session suddenly returns to login / 401 responses
After database resets or reseeds, older login sessions are invalid.
- The app now auto-clears stale session tokens and redirects to **Login** on `401`.
- Sign in again with a current user from the reset database.

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

## 13) Operational best practices
- Keep Admin accounts limited.
- Use Officer role for posting/final actions.
- Keep Clerk role for data entry and draft prep.
- Reconcile dashboards with exports before formal meetings.
- Back up PostgreSQL volume and uploads volume regularly.

---

## 14) Admin / Settings quick guide

Admin-only page includes:
- **System Health**: DB connectivity and migration count
- **Voting Configuration**: toggle disputed-lot exclusion from voting
- **Branding**: set app display name and logo URL for sidebar/mobile navigation header branding, with save confirmation/error feedback
	- includes **Public app URL** used as the base for certificate verification links/QR codes
- **Create User**: email, temporary password, role selection
- **User Management**: update roles and reset user passwords

Branding updates apply to the app shell after saving settings.
