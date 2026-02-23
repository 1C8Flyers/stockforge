# Admin Tabbed Refactor Progress

## Scope
Refactor `/admin` UI into a tabbed layout in `apps/web/src/pages/AdminPage.vue`, split admin areas into modular components, and preserve current API behavior.

## Progress
- [x] Added central Pinia store: `apps/web/src/stores/adminStore.ts`
- [x] Added modular admin panels in `apps/web/src/components/admin/`
  - [x] `AdminUsersPanel.vue`
  - [x] `AdminBrandingPanel.vue`
  - [x] `AdminVotingPanel.vue`
  - [x] `AdminEmailPanel.vue`
  - [x] `AdminSystemPanel.vue`
- [x] Refactored `apps/web/src/pages/AdminPage.vue` to tab shell with query param tab state
- [x] Implemented status badges on tabs
  - [x] Users count badge (muted)
  - [x] Branding warning dot when app name missing
  - [x] Voting warning dot from store getter
  - [x] Email status badge (`Disabled` / `Not Configured` / green dot)
  - [x] System status badge (`Migration` / `Issue`)
- [x] Added lazy-load per tab (first visit)
- [x] Added small transition between tab panels
- [x] Added panel-level saved/error messaging and “Last saved at HH:MM” footer where applicable
- [x] Added portal-shareholder linking controls in Users panel (user -> shareholder shortcut)
- [x] Build verification completed after portal-linking updates

## Remaining
- [x] Run `apps/web` type/build verification and fix any regressions
- [ ] Optional UI polish pass after manual QA on mobile breakpoints
