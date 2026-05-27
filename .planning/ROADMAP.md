# Roadmap: SiteCare POS Desktop App

**Project:** SiteCare POS — Tauri desktop app (macOS + Windows)
**Core Value:** Restaurant staff can see, accept, and advance orders in real-time from a native desktop app that looks exactly like the design prototype.
**Created:** 2026-04-22

---

## Milestones

- ✅ **v1.0 MVP** — Phases 1–6 (shipped 2026-05-22)
- **v1.1 Orders History Screen** — Phases 7–9 (started 2026-05-27)

---

## Phases

<details>
<summary>✅ v1.0 MVP (Phases 1–6) — SHIPPED 2026-05-22</summary>

- [x] Phase 1: Foundation (5/5 plans) — completed 2026-04-22
- [x] Phase 2: Authentication (5/5 plans) — completed 2026-04-23
- [x] Phase 3: Shell + Data Foundation (6/6 plans) — completed 2026-04-24
- [x] Phase 4: Core Screens (11/11 plans) — completed 2026-04-27
- [x] Phase 5: Native Integration (4/4 plans) — completed 2026-04-29
- [x] Phase 6: Build Pipeline (4/4 plans) — completed 2026-05-02

Full phase details → `.planning/milestones/v1.0-ROADMAP.md`

</details>

### v1.1 Orders History Screen

- [ ] **Phase 7: Data Layer + Navigation** — API hook, store/shell/app/icons wiring, i18n skeleton
- [ ] **Phase 8: History List UI** — screen-history.jsx with date range picker, client-side filters, search, paginated list, empty state
- [ ] **Phase 9: Detail + Actions** — read-only detail panel, reprint receipt, CSV export with native Save dialog

---

## Phase Details

### Phase 7: Data Layer + Navigation
**Goal**: Staff can reach a functional (but empty) History screen from the sidebar
**Depends on**: Phase 6 (existing build pipeline and navigation infrastructure)
**Requirements**: HIST-01, HIST-02, HIST-03
**Success Criteria** (what must be TRUE):
  1. A "History" sidebar item is visible and clickable at the same level as Orders, KDS, and POS
  2. Clicking History navigates to the History screen without breaking any existing screen or route
  3. The History screen fetches orders for the current week (Monday 00:00 — today 23:59) on first open without user interaction
  4. The screen renders without errors when the API returns an empty result set or when the request is in flight
**Plans**: TBD
**UI hint**: yes

### Phase 8: History List UI
**Goal**: Staff can browse, filter, and search all past orders in the History screen
**Depends on**: Phase 7
**Requirements**: HIST-04, HIST-05, HIST-06, HIST-07, HIST-08
**Success Criteria** (what must be TRUE):
  1. Staff can change the date range (from / to dates) and the list immediately reloads with orders for the new period
  2. Staff can filter the list by order status (All / Completed / Cancelled) and see only matching rows
  3. Staff can filter the list by order type (All / Dine-in / Pickup / Delivery) and see only matching rows
  4. Staff can type in a search box and see the list narrow to orders matching customer name or phone number (debounced — no search on every keystroke)
  5. When no orders match the active filters, a clear empty state message is shown instead of a blank list
**Plans**: TBD
**UI hint**: yes

### Phase 9: Detail + Actions
**Goal**: Staff can inspect any historical order in full, reprint its receipt, and export the filtered list as a CSV file
**Depends on**: Phase 8
**Requirements**: HIST-09, HIST-10, HIST-11
**Success Criteria** (what must be TRUE):
  1. Clicking any order in the list opens a read-only detail panel showing full items, delivery address, and notes — no action buttons that mutate order state are visible
  2. Staff can click a Reprint button in the detail panel to send the receipt to the configured thermal printer; the button is greyed-out when no printer is configured
  3. Staff can click an Export CSV button, choose a save location in a native OS dialog, and receive a CSV file containing all orders matching the current filters
**Plans**: TBD
**UI hint**: yes

---

## Progress Table

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Foundation | v1.0 | 5/5 | Complete | 2026-04-22 |
| 2. Authentication | v1.0 | 5/5 | Complete | 2026-04-23 |
| 3. Shell + Data Foundation | v1.0 | 6/6 | Complete | 2026-04-24 |
| 4. Core Screens | v1.0 | 11/11 | Complete | 2026-04-27 |
| 5. Native Integration | v1.0 | 4/4 | Complete | 2026-04-29 |
| 6. Build Pipeline | v1.0 | 4/4 | Complete | 2026-05-02 |
| 7. Data Layer + Navigation | v1.1 | 0/? | Not started | - |
| 8. History List UI | v1.1 | 0/? | Not started | - |
| 9. Detail + Actions | v1.1 | 0/? | Not started | - |

---

*Roadmap created: 2026-04-22*
*Last updated: 2026-05-27 — v1.1 milestone started; 3 phases, 11 requirements*
