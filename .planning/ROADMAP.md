# Roadmap: SiteCare POS Desktop App

**Project:** SiteCare POS — Tauri desktop app (macOS + Windows)
**Core Value:** Restaurant staff can see, accept, and advance orders in real-time from a native desktop app that looks exactly like the design prototype.
**Milestone:** v1 — Production-ready app with all 7 screens live-wired to the SiteCare API
**Created:** 2026-04-22
**Granularity:** Standard (6 phases)

---

## Phases

- [ ] **Phase 1: Foundation** - Working Tauri + Vite scaffold with all 7 prototype screens converted to ES modules, design tokens wired, and CSP configured
- [ ] **Phase 2: Authentication** - Staff can log in with username + password, stay logged in across restarts, and be redirected to login when their session expires
- [ ] **Phase 3: Shell + Data Foundation** - App shell renders from real Zustand state, data hooks connect to live API, SSE connection established, offline banner works
- [ ] **Phase 4: Core Screens** - All 7 screens render live API data with full UX — orders, KDS timers/urgency/sound/bump, POS checkout flow, menu toggles, settings persistence
- [ ] **Phase 5: Native Integration** - Staff can configure a thermal printer and print receipts end-to-end via Tauri native plugin
- [ ] **Phase 6: Build Pipeline** - Every release tag produces signed, notarized macOS and Windows installers; auto-update works

---

## Phase Details

### Phase 1: Foundation
**Goal**: Working Tauri + Vite scaffold with @charlyk/admin-client installed, all 7 prototype screens converted from `window.*` globals to ES module imports/exports, CSS design tokens wired through Vite, and CSP configured for API access.
**Depends on**: Nothing — this is the hard prerequisite for all subsequent phases.
**Requirements**: FOUND-01, FOUND-02, FOUND-03, FOUND-04, FOUND-05, FOUND-06
**Success Criteria** (what must be TRUE):
  1. Running `npm run tauri dev` launches a native window on macOS and a Windows build completes without errors
  2. All 7 screens render in the Vite dev build with no `window.*` reference errors in the console
  3. The SiteCare sage/terracotta color palette and Outfit font are visible — design tokens are active, not broken
  4. Zustand store persists UI preferences (role, language, accent, density) across app restarts via @tauri-apps/plugin-store
  5. Making a test API call from the renderer does not fail with a CSP violation — network requests reach the API domain
**Plans**: 5 plans
Plans:
- [x] 01-01-PLAN.md — Install Rust, archive prototype, scaffold Tauri + Vite + React at repo root
- [x] 01-02-PLAN.md — Install packages (@charlyk/admin-client, plugins, zustand), configure tauri.conf.json CSP, wire lib.rs
- [x] 01-03-PLAN.md — Migrate CSS design system (colors_and_type.css, styles.css, fonts) and create Zustand store
- [x] 01-04-PLAN.md — Convert 9 prototype files to ES modules (i18n → icons → data → screen-orders → leaf screens → screen-detail)
- [ ] 01-05-PLAN.md — Convert shell.jsx + screen-printer.jsx, write app.jsx + main.jsx, human verify all 7 screens
**UI hint**: yes

### Phase 2: Authentication
**Goal**: Staff can log in with username + password via the real SiteCare API, stay authenticated through an 8-hour shift and across app restarts, and are automatically redirected to the login screen if their session expires.
**Depends on**: Phase 1
**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05
**Success Criteria** (what must be TRUE):
  1. A staff member can enter their username and password and land on the Orders screen — login works against the real API
  2. Closing and reopening the app does not prompt for login again — the token survives a restart via OS secure storage (Keychain / Credential Manager)
  3. After 8 hours of continuous use, the app has not logged the user out — proactive token refresh works
  4. Navigating directly to any screen without a valid token redirects to the login screen — the auth guard is active on all routes
**Plans**: TBD

### Phase 3: Shell + Data Foundation
**Goal**: The app shell, sidebar, and topbar render from live Zustand state; all data-fetching hooks (`useOrders`, `useOrderActions`, `useMenu`, `useSSE`) are connected to the live API; the SSE connection is established at shell level; and the offline banner works.
**Depends on**: Phase 2
**Requirements**: KDS-01, OFF-01, OFF-02, OFF-03
**Success Criteria** (what must be TRUE):
  1. The Kitchen Display screen receives a new order without any page reload — the SSE connection delivers the event in real-time
  2. When the test machine's network is disabled, a visible "connection lost" banner appears on screen within a few seconds
  3. When offline, previously loaded orders remain visible in their last known state — TanStack Query cache is serving data
  4. While offline, the Accept, Advance, and Cancel buttons are visually disabled — mutating actions are blocked and re-enable when connectivity returns
**Plans**: TBD

### Phase 4: Core Screens
**Goal**: All 7 screens render live API data with the full prototype UX — orders list with filtering and search, KDS with per-ticket elapsed timers, urgency colors, sound alerts, and bump; POS checkout with cart, discounts, and order submission; menu availability toggles; and settings persistence.
**Depends on**: Phase 3
**Requirements**: ORD-01, ORD-02, ORD-03, ACT-01, ACT-02, ACT-03, KDS-02, KDS-03, KDS-04, KDS-05, POS-01, POS-02, POS-03, POS-04, POS-05, MENU-01, MENU-02, SET-01, SET-02, SET-03
**Success Criteria** (what must be TRUE):
  1. A cashier can accept a new order with a prep-time picker, advance it through the full lifecycle to done, and cancel an order — all transitions reflect immediately in the UI and persist in the API
  2. The KDS screen shows each ticket's elapsed time updating every minute, color-coded green/yellow/red by age, plays a sound when a new ticket arrives, and lets the cook bump a ticket directly from the screen
  3. A cashier can browse the live menu, build a cart with quantity adjustments and a discount, select dine-in/pickup/delivery, and submit the order to the kitchen — the order appears on the KDS
  4. A manager can toggle any menu item out-of-stock and back in-stock from the Menu screen — the change persists in the API and reflects immediately
  5. Changing language, density, or accent in Settings persists after closing and reopening the app
**Plans**: TBD
**UI hint**: yes

### Phase 5: Native Integration
**Goal**: Staff can configure a thermal printer (USB or TCP) in the Printer Setup screen, send a test print, and print a receipt for any order from the Order Detail screen — all via ESC/POS protocol through a Tauri native plugin.
**Depends on**: Phase 4
**Requirements**: ACT-04, PRNT-01, PRNT-02, PRNT-03
**Success Criteria** (what must be TRUE):
  1. A staff member can open Printer Setup, enter a USB port or TCP address, and save the printer configuration — the connection attempt gives immediate feedback (success or error)
  2. Clicking "Test Print" sends a print job to the configured printer and a test receipt comes out — no system print dialog appears
  3. Clicking "Print Receipt" on the Order Detail screen sends an ESC/POS-formatted receipt to the thermal printer — the receipt is legible and correctly formatted
**Plans**: TBD

### Phase 6: Build Pipeline
**Goal**: Every GitHub release tag triggers a CI build that produces a notarized macOS .dmg and a signed Windows .msi installer; the installed app checks for and installs updates automatically on next launch.
**Depends on**: Phase 5
**Requirements**: BILD-01, BILD-02, BILD-03, BILD-04
**Success Criteria** (what must be TRUE):
  1. Pushing a release tag to GitHub triggers a CI run that produces a macOS .dmg and a Windows .msi as downloadable artifacts — no manual build step required
  2. The macOS .dmg installer opens on a fresh macOS 13+ machine without a Gatekeeper warning — Apple notarization is in place
  3. The Windows .msi installer runs on a fresh Windows machine without a SmartScreen warning — code signing is in place
  4. Installing the app and then releasing a newer version causes the running app to detect and install the update automatically on next launch
**Plans**: TBD

---

## Progress Table

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 4/5 | In progress | - |
| 2. Authentication | 0/? | Not started | - |
| 3. Shell + Data Foundation | 0/? | Not started | - |
| 4. Core Screens | 0/? | Not started | - |
| 5. Native Integration | 0/? | Not started | - |
| 6. Build Pipeline | 0/? | Not started | - |

---

## Coverage Validation

| Requirement | Phase |
|-------------|-------|
| FOUND-01 | Phase 1 |
| FOUND-02 | Phase 1 |
| FOUND-03 | Phase 1 |
| FOUND-04 | Phase 1 |
| FOUND-05 | Phase 1 |
| FOUND-06 | Phase 1 |
| AUTH-01 | Phase 2 |
| AUTH-02 | Phase 2 |
| AUTH-03 | Phase 2 |
| AUTH-04 | Phase 2 |
| AUTH-05 | Phase 2 |
| KDS-01 | Phase 3 |
| OFF-01 | Phase 3 |
| OFF-02 | Phase 3 |
| OFF-03 | Phase 3 |
| ORD-01 | Phase 4 |
| ORD-02 | Phase 4 |
| ORD-03 | Phase 4 |
| ACT-01 | Phase 4 |
| ACT-02 | Phase 4 |
| ACT-03 | Phase 4 |
| KDS-02 | Phase 4 |
| KDS-03 | Phase 4 |
| KDS-04 | Phase 4 |
| KDS-05 | Phase 4 |
| POS-01 | Phase 4 |
| POS-02 | Phase 4 |
| POS-03 | Phase 4 |
| POS-04 | Phase 4 |
| POS-05 | Phase 4 |
| MENU-01 | Phase 4 |
| MENU-02 | Phase 4 |
| SET-01 | Phase 4 |
| SET-02 | Phase 4 |
| SET-03 | Phase 4 |
| ACT-04 | Phase 5 |
| PRNT-01 | Phase 5 |
| PRNT-02 | Phase 5 |
| PRNT-03 | Phase 5 |
| BILD-01 | Phase 6 |
| BILD-02 | Phase 6 |
| BILD-03 | Phase 6 |
| BILD-04 | Phase 6 |

**Mapped: 41/41 v1 requirements — no orphans.**

---
*Roadmap created: 2026-04-22*
*Last updated: 2026-04-22 — Phase 1 planning complete (5 plans, 3 waves)*
