# Roadmap: SiteCare POS Desktop App

**Project:** SiteCare POS — Tauri desktop app (macOS + Windows)
**Core Value:** Restaurant staff can see, accept, and advance orders in real-time from a native desktop app that looks exactly like the design prototype.
**Created:** 2026-04-22

---

## Milestones

- ✅ **v1.0 MVP** — Phases 1–6 (shipped 2026-05-22)
- **v1.1 Orders History Screen** — Phases 7–10 (started 2026-05-27, replanned 2026-07-16)

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

> Replanned 2026-07-16 against the new design handoff (`sitecare-orders/project/src/screen-history.jsx`)
> and SDK v1.1.59. The prior Phase 7–9 breakdown (paginated list + side detail panel, no summary strip)
> is superseded and was never executed.

- [ ] **Phase 7: History Screen Foundation** — sidebar entry, `listAdminOrders` hook, 30-day default, day-grouped list, empty state
- [ ] **Phase 8: Period Control + Summary Strip** — Today/7/30/custom presets driving both data sources; `getAdminDashboard` summary tiles
- [ ] **Phase 9: Filters + Search** — client-side status (incl. Refunded), order type, and debounced search with live counts
- [ ] **Phase 10: Receipt Detail + Output** — inline expandable receipt via `getOrder(id)`, reprint, CSV export

---

## Phase Details

### Phase 7: History Screen Foundation

**Goal**: Staff can open a History screen from the sidebar and see the last 30 days of orders grouped by day
**Depends on**: Phase 6 (shipped v1.0 shell, navigation, and SDK data layer)
**Requirements**: HIST-01, HIST-02, HIST-03, HIST-05, HIST-13
**Success Criteria** (what must be TRUE):

  1. A "History" item is visible and clickable in the sidebar at the same level as Orders, KDS, and POS; clicking it opens the History screen without breaking any existing screen
  2. On first open the screen loads the last 30 days of orders via `listAdminOrders({ from, to })` with no user interaction
  3. Orders appear grouped by calendar day, newest day first, and each day header shows that day's order count and revenue subtotal
  4. When the period returns no orders, a clear empty state is shown instead of a blank list; loading and error states render without crashing

**Plans**: 1/6 plans executed

Plans:
**Wave 1**

- [x] 07-01-PLAN.md — pure derivation utilities (`history-utils.js`) + `normalizeOrder` `dailyNumber` fallback
- [ ] 07-02-PLAN.md — i18n keys, store screen/route additions, sidebar History entry (HIST-01)

**Wave 2** *(blocked on Wave 1 completion)*

- [ ] 07-03-PLAN.md — `useHistoryOrders` hook: 30-day `listAdminOrders` fetch on a collision-free cache key
- [ ] 07-05-PLAN.md — `readOnly` mode on `screen-detail.jsx` for the archived-order detail

**Wave 3** *(blocked on Wave 2 completion)*

- [ ] 07-04-PLAN.md — `HistoryScreen`: day-grouped table, computed summary strip, inert filter bar, empty/loading/error

**Wave 4** *(blocked on Wave 3 completion)*

- [ ] 07-06-PLAN.md — `app.jsx` router wiring, rehydrate backstop, live-API human verification

**UI hint**: yes

> ⚠ **Phases 8–10 below are STALE.** CONTEXT.md's `<roadmap_impact>` records two user-directed
> reversals (D-07, D-15) that invalidate the HIST-06 and HIST-10 requirement text and shift the phase
> boundaries: a NEW read-only detail-view phase inserts after Phase 7, pushing 8→9, 9→10, 10→11.
> Phase 7's own scope is settled and unaffected. Run `/gsd-phase` to restructure before planning
> Phase 8.

### Phase 8: Period Control + Summary Strip

**Goal**: Staff can retarget the whole screen to any period and read that period's totals at a glance
**Depends on**: Phase 7
**Requirements**: HIST-04, HIST-06
**Success Criteria** (what must be TRUE):

  1. Staff can switch the period with Today / 7 days / 30 days presets and the day-grouped list reloads for the new range
  2. Staff can pick a custom start and end date and the list reloads for exactly that range
  3. A summary strip above the list shows orders, revenue, and average order value for the selected period, sourced from `getAdminDashboard({ from, to })`, and updates whenever the period changes
  4. The refunds tile shows a count only (no amount), and the summary strip renders its own loading and error state independently of the list — a failure in one does not blank the other

**Plans**: TBD
**UI hint**: yes

### Phase 9: Filters + Search

**Goal**: Staff can narrow a period's orders down to the ones they are looking for
**Depends on**: Phase 7 (list), Phase 8 (period control)
**Requirements**: HIST-07, HIST-08, HIST-09
**Success Criteria** (what must be TRUE):

  1. Staff can filter by status — All / Completed / Refunded / Canceled — and see only matching rows, with each option showing a live count for the current period
  2. Staff can filter by order type — All / Delivery / Pickup / Dine-in — and see only matching rows, with `orderType: 'local'` presented as Dine-in
  3. Staff can type an order number or customer name and the list narrows to matching orders, debounced so no filtering runs on every keystroke
  4. Filters, search, and period compose — day headers and their counts/subtotals reflect only the visible (filtered) orders, and the empty state appears when nothing matches

**Plans**: TBD
**UI hint**: yes

### Phase 10: Receipt Detail + Output

**Goal**: Staff can inspect any historical order's full receipt, reprint it, and export the filtered list for accounting
**Depends on**: Phase 9
**Requirements**: HIST-10, HIST-11, HIST-12
**Success Criteria** (what must be TRUE):

  1. Clicking any row expands an inline read-only receipt showing items with modifiers, subtotal, delivery fee, total, customer phone, delivery address, handled-by, and prep time — fetched on demand via `getOrder(id)`, with no controls that mutate order state
  2. The expanded row shows its own loading state while fetching and a readable fallback if `getOrder(id)` fails or is unauthorized; collapsing and re-expanding does not refetch unnecessarily
  3. Staff can reprint the receipt from the expanded row to the configured thermal printer; the button is greyed-out when no printer is configured
  4. Staff can export the currently filtered results as CSV via a native Save dialog and open the resulting file with correct rows, headers, and escaped fields

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
| 7. History Screen Foundation | v1.1 | 1/6 | In Progress|  |
| 8. Period Control + Summary Strip | v1.1 | 0/? | Not started | - |
| 9. Filters + Search | v1.1 | 0/? | Not started | - |
| 10. Receipt Detail + Output | v1.1 | 0/? | Not started | - |

---

*Roadmap created: 2026-04-22*
*Last updated: 2026-07-16 — v1.1 replanned against new design handoff + SDK v1.1.59; 4 phases (7–10), 13 requirements*
