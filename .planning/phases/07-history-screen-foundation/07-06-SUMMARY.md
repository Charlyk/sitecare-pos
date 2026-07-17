---
phase: 07-history-screen-foundation
plan: 06
subsystem: ui
tags: [react, zustand, react-router-state, tanstack-query, vitest]

requires:
  - phase: 07-history-screen-foundation
    provides: HistoryScreen (Plan 04), read-only OrderDetailScreen (Plan 05), historyOrder/openHistoryOrder store actions and 'history'/'history-detail' screen enum values (Plan 02)
provides:
  - Wired 'history' and 'history-detail' router branches in src/app.jsx
  - Rehydrate backstop preventing a blank content area after a cold start on the detail route
  - Human-verified resolution of the two v1.1 open API questions (units, timezone)
affects: [phase-08-period-control, phase-09-filters-search, phase-10-receipt-detail]

tech-stack:
  added: []
  patterns:
    - "Router branch pairing: 'history'/'history-detail' shipped as an additive pair alongside the existing 'orders'/'detail' pair, sharing no state (D-07/D-08 add-alongside decision)"
    - "Rehydrate backstop useEffect: redirects to the list screen when a persisted detail-route screen value rehydrates with a null session-only order object"

key-files:
  created:
    - src/__tests__/app-history-route.test.jsx
  modified:
    - src/app.jsx

key-decisions:
  - "Confirmed by human verification against the live API on 2026-07-17: AdminOrder.total is denominated in RON, not cents (day-header revenue subtotal matched the SiteCare admin dashboard, not 100x off). No normalizeOrder change needed."
  - "Confirmed by human verification against the live API on 2026-07-17: the API's from/to date params behave correctly for Romanian local calendar days (orders land under their correct Romanian calendar day; oldest day header is ~30 days back)."

patterns-established:
  - "Additive router wiring: new screen branches added without touching the byte-identical shipped 'detail' branch, verified by acceptance-criteria grep pins"

requirements-completed: [HIST-01, HIST-05]

coverage:
  - id: D1
    description: "screen === 'history' renders HistoryScreen; History sidebar item opens it end-to-end without breaking any existing screen"
    requirement: "HIST-01"
    verification:
      - kind: unit
        ref: "src/__tests__/app-history-route.test.jsx#history screen renders inside Shell"
        status: pass
      - kind: manual_procedural
        ref: "Task 3 checklist step 1, 10 — human verification against live API"
        status: pass
    human_judgment: false
  - id: D2
    description: "screen === 'history-detail' with historyOrder present renders OrderDetailScreen readOnly; back returns to History, not Orders"
    requirement: "HIST-05"
    verification:
      - kind: unit
        ref: "src/__tests__/app-history-route.test.jsx#no redirect when historyOrder present"
        status: pass
      - kind: manual_procedural
        ref: "Task 3 checklist step 7 — human verification against live API"
        status: pass
    human_judgment: false
  - id: D3
    description: "Rehydrate backstop: cold start on screen: 'history-detail' with historyOrder: null redirects to 'history' instead of rendering blank"
    verification:
      - kind: unit
        ref: "src/__tests__/app-history-route.test.jsx#redirects to history when historyOrder is null"
        status: pass
      - kind: manual_procedural
        ref: "Task 3 checklist step 8 — human verification against live API (quit/relaunch)"
        status: pass
    human_judgment: false
  - id: D4
    description: "AdminOrder.total units resolved as RON (not cents) against live API data"
    verification:
      - kind: manual_procedural
        ref: "Task 3 checklist step 2 — human verification against live API"
        status: pass
    human_judgment: true
    rationale: "Requires comparing a live day-header revenue subtotal against the SiteCare admin dashboard; cannot be encoded as an automated assertion without fabricating the comparison value."
  - id: D5
    description: "API from/to timezone semantics resolved as Romanian local calendar day against live API data"
    verification:
      - kind: manual_procedural
        ref: "Task 3 checklist step 3 — human verification against live API"
        status: pass
    human_judgment: true
    rationale: "Requires inspecting live order timestamps near local midnight against day-header grouping; cannot be encoded as an automated assertion without fabricating observed timestamps."

duration: ~7min (Tasks 1-2) + human verification checkpoint (2026-07-17)
completed: 2026-07-17
status: complete
---

# Phase 07 Plan 06: App Router Wiring + History Checkpoint Summary

**Wired the 'history' and 'history-detail' screen router branches into app.jsx with a rehydrate backstop, then closed out the phase's two live-API open questions via human verification: AdminOrder.total is in RON and from/to date params use Romanian local calendar days.**

## Performance

- **Tasks:** 3 (2 automated + 1 human-verification checkpoint)
- **Files modified:** 2 (`src/app.jsx`, `src/__tests__/app-history-route.test.jsx`)

## Accomplishments

- `screen === 'history'` renders `HistoryScreen`; the sidebar History item now opens it end-to-end without touching the byte-identical shipped `'detail'` branch (HIST-01).
- `screen === 'history-detail'` with a `historyOrder` present renders `OrderDetailScreen` with `readOnly`, and its back button returns to `'history'`, never `'orders'` (D-07/D-08).
- A rehydrate backstop `useEffect` redirects `'history-detail'` + null `historyOrder` (the cold-start case, since `historyOrder` is deliberately not persisted) to `'history'` instead of rendering a blank content area (T-07-20).
- Human verification against the live SiteCare API confirmed both v1.1 open questions:
  - `AdminOrder.total` is denominated in RON, not cents.
  - The API's `from`/`to` params behave correctly for Romanian local calendar days.

## Task Commits

Each automated task was committed atomically:

1. **Task 1: Add the history and history-detail router branches** - `939c79e` (feat)
2. **Task 2: Add the rehydrate backstop and route tests** - `c7e9d23` (test)
3. **Task 3: Human verification against the live API** - checkpoint, no code commit (verification-only; approved by human 2026-07-17)

**Plan metadata:** (this commit) `docs: complete 07-06 plan`

## Files Created/Modified

- `src/app.jsx` - `HistoryScreen` import, `historyOrder`/`openHistoryOrder` selectors in the unconditional selector block, `'history'` and `'history-detail'` router branches, rehydrate backstop `useEffect` placed before the auth-guard early returns
- `src/__tests__/app-history-route.test.jsx` - route + backstop coverage: redirect when `historyOrder` is null, no redirect when present, history screen renders, orders screen no-regression

## Decisions Made

- Confirmed by human verification against the live API on 2026-07-17: `AdminOrder.total` is in RON — the day-header revenue subtotal matched the SiteCare admin dashboard (not 100x off). No `normalizeOrder` change needed.
- Confirmed by human verification against the live API on 2026-07-17: orders land under their correct Romanian calendar day, and the oldest day header shown is ~30 days back — the API's `from`/`to` params behave correctly for Romanian local calendar days.

Both resolutions are recorded at the confidence level actually available from the human's report: a pass/fail verdict against each backstop, not specific witnessed figures. No revenue amounts, order IDs, or timestamps were reported by the human, so none are fabricated here.

## Deviations from Plan

None - plan executed exactly as written. Tasks 1 and 2 were completed by a prior executor session; this continuation session verified those commits, executed Task 3 (the human-verification checkpoint), and closed out the plan.

## Issues Encountered

None. The checkpoint resolved cleanly: the human ran the app against the live API and reported "approved," which per the checkpoint's stated contract means all 11 `<how-to-verify>` steps passed, including both backstops (units, timezone).

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 07 (History Screen Foundation) is now fully wired end-to-end: History nav item -> HistoryScreen -> read-only detail -> back to History, with a cold-start-safe rehydrate path.
- Both v1.1 open questions blocking downstream phases are resolved: `AdminOrder.total` unit handling needs no correction, and day-grouping timezone logic is confirmed correct against live data.
- Phases 8-10 in ROADMAP.md remain stale per STATE.md's existing note (D-07/D-15 reversals) and still require a `/gsd-phase` insert/rewrite pass before Phase 8 is planned — unrelated to this plan's scope.

---
*Phase: 07-history-screen-foundation*
*Completed: 2026-07-17*
