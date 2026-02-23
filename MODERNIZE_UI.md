You are a senior Vue 3 + Vite + Tailwind engineer working in the repo 1C8Flyers/stockforge.

Status update (2026-02-23):
- Admin Users UI now includes portal-shareholder linking controls.
- Shareholders UI now includes primary portal-access assignment controls.
- Portal UI supports dual-mode tenant routing (`/portal/*` host mode and `/t/:tenantSlug/portal/*` fallback mode).

CONTEXT (repo facts — do not change structure)
- Frontend: apps/web (Vue 3 + TS + Vite + vue-router + pinia)
- Routes file: apps/web/src/router.ts
- Pages live in: apps/web/src/pages/
  - LoginPage.vue, DashboardPage.vue, ShareholdersPage.vue, LotsPage.vue, TransfersPage.vue,
    MeetingsPage.vue, ReportsPage.vue, AuditLogPage.vue, AdminPage.vue
- Do NOT change backend endpoints or contracts (apps/api). Keep all existing fetch/store logic working.

TASK
Modernize the apps/web UI to be clean, mobile-friendly, and consistent with our “chapterforge-vue” look:
- Tailwind-based admin UI
- Responsive app shell (desktop sidebar + header; mobile drawer nav)
- CRUD screens that work well on phones (tables become cards; drawers/sheets for edit/create)

HARD CONSTRAINTS
- Keep existing routes and paths unchanged.
- Keep business logic intact; only refactor UI/layout/components.
- No heavy UI framework (no Vuetify/Quasar). Tailwind + lightweight components only.
- Ensure `npm run dev` and `npm run build` inside apps/web succeed.

IMPLEMENTATION PLAN (do in this order)

1) Add Tailwind to apps/web
- Install dev deps in apps/web:
  tailwindcss postcss autoprefixer @tailwindcss/forms @tailwindcss/typography
- Create:
  - apps/web/tailwind.config.(js|ts) scanning:
      ./index.html
      ./src/**/*.{vue,ts,js}
  - apps/web/postcss.config.(js|cjs)
  - apps/web/src/styles/tailwind.css containing:
      @tailwind base;
      @tailwind components;
      @tailwind utilities;
    Add a few base styles (body bg, text color) + prefer @tailwindcss/forms.
- Import the stylesheet in apps/web/src/main.ts:
  import './styles/tailwind.css';

2) Create reusable UI primitives (apps/web/src/components/ui/)
Create these components, Tailwind-styled, accessible, and consistent:
- Button.vue (variants: primary, secondary, ghost, danger; sizes; loading)
- Card.vue
- Badge.vue
- Input.vue + Select.vue (label, error text, help text, proper focus rings)
- IconButton.vue (aria-label required)
- DropdownMenu.vue (headless: trigger + menu; esc to close; click outside)
- Drawer.vue (overlay + panel; esc to close; click overlay closes; focus trap; body scroll lock)
  - Desktop: right-side drawer (max-w-md)
  - Mobile: full-screen sheet
- ConfirmDialog.vue (simple modal)
- EmptyState.vue + LoadingState.vue

3) Build navigation + layout shell
- Create apps/web/src/layouts/AppShell.vue:
  - Desktop layout: left sidebar + top header + main content area
  - Mobile layout: top header with hamburger button; opens a slide-in nav drawer
  - Header shows title from route meta, fallback to a map of route path -> title
  - Provide slots: headerActions, default content
- Create apps/web/src/components/nav/SideNav.vue:
  - nav links to the existing routes: /, /shareholders, /lots, /transfers, /meetings, /reports, /audit-log, /admin
  - active route highlighting
- Create apps/web/src/components/nav/MobileNavDrawer.vue that uses Drawer.vue and SideNav.vue

4) Wire AppShell globally without breaking routes
- Update apps/web/src/App.vue to render:
  - If route is /login: render <RouterView/>
  - Else: wrap <RouterView/> in <AppShell/>
  (Do not change route paths or router behavior.)

5) Refactor TWO exemplar pages (Shareholders + Transfers)
Refactor UI only in:
- apps/web/src/pages/ShareholdersPage.vue
- apps/web/src/pages/TransfersPage.vue

For each:
- Add a consistent page header inside AppShell (title + primary action button)
- Add search input
- Implement responsive data view:
  - >= md: table layout
  - < md: card list layout
- Put row actions behind a “…” DropdownMenu (Edit/Delete/Other actions already supported)
- Implement Create/Edit using Drawer.vue:
  - Desktop: right drawer
  - Mobile: full-screen sheet
- Keep existing API calls/store logic untouched (reuse current functions and state).
- Add Loading and Empty states.

6) Polish + accessibility
- Touch targets >= 44px
- Visible focus rings everywhere
- aria-label on icon-only buttons
- ESC closes drawer/dialog
- focus trap inside Drawer and ConfirmDialog
- Prevent background scroll when drawer open

7) Minimal docs
- Add a short “UI Modernization” section to README.md or apps/web/README.md:
  - Tailwind setup files
  - AppShell usage
  - pattern for new CRUD pages (table->cards + drawer)

OUTPUT
- Make the actual code changes in the repo.
- Keep changes localized to apps/web (plus any root workspace config only if absolutely required for build).
- Don’t change the API.