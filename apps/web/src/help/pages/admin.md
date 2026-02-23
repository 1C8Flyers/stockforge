# Admin Help

## Update (2026-02-23)
- Tenant portal routing migration is in dual-mode; both `/portal/*` and `/t/:tenantSlug/portal/*` are supported.
- Users tab still supports quick portal-shareholder linking, while Shareholders is the preferred primary workflow.

## What this page does
- Central admin controls for users, branding, voting, email, and system checks.

## Tabs
- **Users & Roles**: create users, edit roles, reset passwords, and link a user to a portal shareholder profile.
- **Branding**: app name/logo/incorporation/public URL.
- **Voting / Governance**: voting exclusion configuration.
- **Email**: SMTP settings, feature toggles, test email, and logs.
- **System**: DB health and migration diagnostics.

## Tips
- Email tab badges indicate Disabled / Not Configured / Ready.
- System tab warns when health fails or migration state looks incomplete.
