# Roadmap: SiteCare POS Desktop App

**Project:** SiteCare POS — Tauri desktop app (macOS + Windows)
**Core Value:** Restaurant staff can see, accept, and advance orders in real-time from a native desktop app that looks exactly like the design prototype.
**Created:** 2026-04-22

---

## Milestones

- ✅ **v1.0 MVP** — Phases 1–6 (shipped 2026-05-22)
- **v1.1 Orders History Screen** — Phases 7–11 (started 2026-05-27, replanned 2026-07-16, restructured 2026-07-17)

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

> Restructured 2026-07-17 per `07-CONTEXT.md` `<roadmap_impact>` — two user-directed reversals
> (D-07 detail view replaces the inline expandable receipt; D-15 summary strip is client-computed and
> `getAdminDashboard` is dropped). A new detail-view phase inserts after Phase 7; former Phases 8, 9,
> 10 shift to 9, 10, 11.

- [x] **Phase 7: History Screen Foundation** — sidebar entry, `listAdminOrders` hook, 30-day default, day-grouped list, client-computed summary strip, detail routing, empty state (completed 2026-07-17)
- [x] **Phase 8: Read-Only Order Detail View** — hydrate the archived-order detail via `getOrder(id)`: items, modifiers, address, prep time (completed 2026-07-17)
- [x] **Phase 9: Period Control** — Today/7/30/custom presets retargeting the list; the client-computed strip follows for free (was Phase 8) (completed 2026-07-18)
- [x] **Phase 10: Filters + Search** — client-side status (incl. Refunded), order type, and debounced search with live counts (was Phase 9) (completed 2026-07-18)
- [ ] **Phase 11: Reprint + CSV Export** — reprint from the detail view, CSV export via native Save dialog (was Phase 10)

---

## Phase Details

### Phase 7: History Screen Foundation

**Goal**: Staff can open a History screen from the sidebar and see the last 30 days of orders grouped by day
**Depends on**: Phase 6 (shipped v1.0 shell, navigation, and SDK data layer)
**Requirements**: HIST-01, HIST-02, HIST-03, HIST-05, HIST-06, HIST-13
**Success Criteria** (what must be TRUE):

  1. A "History" item is visible and clickable in the sidebar at the same level as Orders, KDS, and POS; clicking it opens the History screen without breaking any existing screen
  2. On first open the screen loads the last 30 days of orders via `listAdminOrders({ from, to })` with no user interaction
  3. Orders appear grouped by calendar day, newest day first, and each day header shows that day's order count and revenue subtotal
  4. When the period returns no orders, a clear empty state is shown instead of a blank list; loading and error states render without crashing

**Plans**: 6/6 plans executed

Plans:
**Wave 1**

- [x] 07-01-PLAN.md — pure derivation utilities (`history-utils.js`) + `normalizeOrder` `dailyNumber` fallback
- [x] 07-02-PLAN.md — i18n keys, store screen/route additions, sidebar History entry (HIST-01)

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 07-03-PLAN.md — `useHistoryOrders` hook: 30-day `listAdminOrders` fetch on a collision-free cache key
- [x] 07-05-PLAN.md — `readOnly` mode on `screen-detail.jsx` for the archived-order detail

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 07-04-PLAN.md — `HistoryScreen`: day-grouped table, computed summary strip, inert filter bar, empty/loading/error

**Wave 4** *(blocked on Wave 3 completion)*

- [x] 07-06-PLAN.md — `app.jsx` router wiring, rehydrate backstop, live-API human verification

**UI hint**: yes

> Note: Phase 7 absorbed the client-computed summary strip (D-15) and the detail routing (D-08), so
> HIST-06 is satisfied here rather than in the period-control phase.

### Phase 8: Read-Only Order Detail View

**Goal**: Staff can open any historical order and read its full receipt without being able to change it
**Depends on**: Phase 7 (rows already navigate to the read-only detail route)
**Requirements**: HIST-10
**Success Criteria** (what must be TRUE):

  1. Opening a historical order hydrates the detail view via `getOrder(id)` and shows items with modifiers, subtotal, delivery fee, total, customer phone, delivery address, and prep time (the derived actual duration, not the accept-time estimate) — none of which exist on the `AdminOrder` summary already in hand
  2. The detail view shows a loading state while fetching and a readable fallback if `getOrder(id)` fails or returns 401/404; the `AdminOrder` fields already fetched stay visible rather than blanking
  3. No control that mutates order state is reachable — Advance, Cancel, and the timeline stay hidden, as the `readOnly` mode shipped in Phase 7 already enforces
  4. Back returns to History with the list and period intact, not to Orders

**Plans**: 5/5 plans executed
**UI hint**: yes

Plans:
**Wave 1**

- [x] 08-01-PLAN.md — Amend ROADMAP/REQUIREMENTS per D-09 (drop staff-attribution field, 401/404) + add 4 i18n keys
- [x] 08-02-PLAN.md — deriveDuration() in history-utils.js + export historyStatusMeta (pure derivation layer)

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 08-03-PLAN.md — screen-detail: derived duration row (D-10) + readOnly status chip (D-05)

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 08-04-PLAN.md — screen-detail: items-card loading/error/empty states + gate the Modify button (SC3)

**Wave 4** *(blocked on Wave 3 completion)*

- [x] 08-05-PLAN.md — app.jsx: sibling useOrderDetail + merge over summary + route wiring (SC1/SC2/SC4)

### Phase 9: Period Control

**Goal**: Staff can retarget the whole screen to any period
**Depends on**: Phase 7
**Requirements**: HIST-04
**Success Criteria** (what must be TRUE):

  1. Staff can switch the period with Today / 7 days / 30 days presets and the day-grouped list reloads for the new range
  2. Staff can pick a custom start and end date and the list reloads for exactly that range
  3. The summary strip retargets with the period automatically — it is computed from the same fetched list (D-15), so tiles and day headers continue to agree by construction with no second data source and no independent loading or error state

**Plans**: 5/5 plans executed

- [x] 09-01-PLAN.md — pure derivation layer: preset range builders, 366-day span validator, input→query converter, locale-aware range formatter (history-utils.js)
- [x] 09-02-PLAN.md — 8 new i18n keys (ro+en) + h_empty rename to h_empty_prefix; spin keyframe
- [x] 09-03-PLAN.md — parameterize useHistoryOrders({from,to}) + keepPreviousData; rewrite frozen-at-mount tests
- [x] 09-04-PLAN.md — live preset pills, dimmed-loading + spinner (D-05), settled-label tracking (D-06), period copy fix (D-12/D-13)
- [x] 09-05-PLAN.md — custom-range popover: native date inputs, guardrails, Apply, pill label (D-01/02/03/04/09/10/11) + blocking human checkpoint

**UI hint**: yes

### Phase 10: Filters + Search

**Goal**: Staff can narrow a period's orders down to the ones they are looking for
**Depends on**: Phase 7 (list), Phase 9 (period control)
**Requirements**: HIST-07, HIST-08, HIST-09
**Success Criteria** (what must be TRUE):

  1. Staff can filter by status — All / Completed / Refunded / Canceled — and see only matching rows, with each option showing a live count for the current period
  2. Staff can filter by order type — All / Delivery / Pickup / Dine-in — and see only matching rows, with `orderType: 'local'` presented as Dine-in
  3. Staff can type an order number or customer name and the list narrows to matching orders, debounced so no filtering runs on every keystroke
  4. Filters, search, and period compose — day headers and their counts/subtotals reflect only the visible (filtered) orders, and the empty state appears when nothing matches

**Plans**: 4/4 plans executed

Plans:

**Wave 1**

- [x] 10-01-PLAN.md — pure filter predicates (`matchesStatus`/`matchesType`/`foldDiacritics`/`matchesSearch`) + filtered-empty-state i18n keys
- [x] 10-02-PLAN.md — `normalizeOrder` `'local'`→`'dinein'` boundary fix (D-08) + F-02 live-path regression

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 10-03-PLAN.md — `HistoryScreen` filter state, debounce, two-derived-set faceted counts, D-04 recompute, D-15 Avg fix, two-row FilterBar restructure

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 10-04-PLAN.md — filtered empty-state variants + Clear Filters (D-13/D-14) + integration test suite

**UI hint**: yes

### Phase 11: Reprint + CSV Export

**Goal**: Staff can reprint a historical receipt and export the filtered list for accounting
**Depends on**: Phase 8 (detail view), Phase 10 (filters drive what CSV exports)
**Requirements**: HIST-11, HIST-12
**Success Criteria** (what must be TRUE):

  1. Staff can reprint the receipt from the read-only detail view to the configured thermal printer; the button is greyed-out when no printer is configured
  2. Staff can export the currently filtered results as CSV via a native Save dialog and open the resulting file with correct rows, headers, and escaped fields

**Plans**: 2/4 plans executed

Plans:

**Wave 1**

- [x] 11-01-PLAN.md — install + register `@tauri-apps/plugin-dialog` + `plugin-fs` (4-file lockstep, [SUS] legitimacy checkpoint, narrow capability grant) (HIST-12)
- [x] 11-02-PLAN.md — pure `buildCsv` serializer (RFC-4180 + BOM + formula-injection guard T-11) + 3 new i18n keys (HIST-11/12)

**Wave 2** *(blocked on Wave 1 completion)*

- [ ] 11-03-PLAN.md — read-only reprint buttons + printer-configured gate (D-04/05/06) + `onPrint={handlePrint}` history-detail wiring (Pitfall 1) (HIST-11)
- [ ] 11-04-PLAN.md — activate `h_export` button: `buildCsv(visible)` → native `save()` → `writeTextFile()`, cancel/error/empty handling, D-14 filename (HIST-12)

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
| 7. History Screen Foundation | v1.1 | 6/6 | Complete    | 2026-07-17 |
| 8. Read-Only Order Detail View | v1.1 | 5/5 | Complete    | 2026-07-17 |
| 9. Period Control | v1.1 | 5/5 | Complete    | 2026-07-18 |
| 10. Filters + Search | v1.1 | 4/4 | Complete    | 2026-07-18 |
| 11. Reprint + CSV Export | v1.1 | 2/4 | In Progress|  |

---

*Roadmap created: 2026-04-22*
*Last updated: 2026-07-17 — v1.1 restructured per 07-CONTEXT.md `<roadmap_impact>` (D-07, D-15): new detail-view phase inserted after Phase 7, former 8–10 shifted to 9–11; 5 phases (7–11), 13 requirements*
