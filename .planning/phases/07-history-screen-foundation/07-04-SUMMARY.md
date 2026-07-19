---
phase: 07-history-screen-foundation
plan: 04
subsystem: ui
tags: [react, history, table, summary-strip, filter-bar, i18n]

requires:
  - phase: 07-history-screen-foundation
    provides: history-utils.js (filterFinishedOrders/deriveDisplayStatus/groupOrdersByDay/computeSummary), 34 history i18n keys, useHistoryOrders() hook
provides:
  - HistoryScreen — day-grouped, read-only order history table with loading/error/empty states
  - Client-computed summary strip (D-15) sharing the same fetched-and-filtered list as the rows
  - Inert filter bar (period presets, status pills, search, export) rendered at final visual size (D-14)
affects: [07-06 (app.jsx router wiring), Phase 10 (Filters + Search will wire this inert bar up)]

tech-stack:
  added: []
  patterns:
    - "Screen-owns-its-hook: HistoryScreen calls useHistoryOrders() directly instead of receiving orders as a prop from App()"
    - "8-track HIST_GRID grid-template-columns constant, superseding the design source's 9-track definition (D-06)"
    - "Static i18n error copy only in error states — never renders error.message (T-07-10 mitigation)"

key-files:
  created:
    - src/screen-history.jsx
    - src/__tests__/screen-history.test.jsx
  modified: []

key-decisions:
  - "Avg summary tile shows a computed zero (formatRON(0)), not an em-dash, specifically when the whole period has zero finished orders — reserving the em-dash strictly for the error state and for a populated-but-all-canceled day's tile-level ambiguity, per the literal Task-1 test contract (which asserts '—' absent from the empty state) rather than the UI-SPEC prose's looser 'computed zeros (... — for avg ...)' phrasing"
  - "Skeleton-row and summary-tile loading placeholders use static neutral-grey blocks (no CSS animation) rather than a shimmer keyframe, since adding one would require a new styles.css class and the phase's own acceptance criteria forbid touching styles.css/i18n.jsx"
  - "Period preset pills are unrolled as 4 explicit JSX buttons rather than .map()'d, so each pill's disabled state and the single full-opacity '30 days' exception are independently readable in source"
  - "historyStatusMeta reuses the design source's tile/ink/icon per status (check/x/refresh) but maps chip classes to chip-sage/chip-red/chip-amber per D-02, dropping the design source's chip-dot modifier since it isn't part of the phase's must-have truths"

patterns-established:
  - "Screen-owns-its-hook for history-shaped screens: call the data hook directly in the screen component, no prop-drilling from App()"
  - "Client-computed summary strips derive from the exact same filtered list backing the table, so tiles and rows can never disagree (D-15)"

requirements-completed: [HIST-05, HIST-06, HIST-13]

coverage:
  - id: D1
    description: "HistoryScreen renders finished orders grouped by local calendar day, newest-first, with per-day count (incl. canceled/refunded) and completed-only revenue"
    requirement: "HIST-05"
    verification:
      - kind: unit
        ref: "src/__tests__/screen-history.test.jsx#populated state > groups orders by day newest-first; count includes canceled, revenue is completed-only; plural handling"
        status: pass
      - kind: unit
        ref: "src/__tests__/screen-history.test.jsx#populated state > a day of only canceled/refunded rows renders its true count with 0,00 lei revenue"
        status: pass
    human_judgment: false
  - id: D2
    description: "Status chip precedence (refunded wins over completed/canceled) renders exactly one chip per row"
    requirement: "HIST-05"
    verification:
      - kind: unit
        ref: "src/__tests__/screen-history.test.jsx#populated state > a refunded order renders the refunded chip and not the completed chip (D-02)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Order-number D-05 UUID fallback renders a short slice, never the full 36-char UUID"
    verification:
      - kind: unit
        ref: "src/__tests__/screen-history.test.jsx#populated state > a null dailyNumber (post-normalize UUID fallback) renders a short slice, never the full UUID"
        status: pass
    human_judgment: false
  - id: D4
    description: "Empty, loading, and error states render inside the table card without crashing; empty renders computed zeros, error renders static copy + retry with no raw error text leaked"
    requirement: "HIST-13"
    verification:
      - kind: unit
        ref: "src/__tests__/screen-history.test.jsx#loading state"
        status: pass
      - kind: unit
        ref: "src/__tests__/screen-history.test.jsx#error state"
        status: pass
      - kind: unit
        ref: "src/__tests__/screen-history.test.jsx#empty state"
        status: pass
    human_judgment: false
  - id: D5
    description: "Summary strip is computed client-side from the same fetched list as the rows (no getAdminDashboard call); filter bar renders visible, dimmed, and inert with the 30-day pill as the sole full-opacity exception"
    requirement: "HIST-05"
    verification:
      - kind: unit
        ref: "src/__tests__/screen-history.test.jsx#populated state > the filter bar renders inert: Export button and search input are disabled"
        status: pass
    human_judgment: true
    rationale: "Automated tests confirm Export/search are disabled and the tiles compute correctly, but exact D-14 visual treatment (30-day pill full-opacity exception, pixel styling) is a visual-fidelity claim best confirmed by a human against the running app, per CLAUDE.md's pixel-perfect-port rule."

duration: 20min
completed: 2026-07-17
status: complete
---

# Phase 7 Plan 4: HistoryScreen (day-grouped table, summary strip, inert filter bar) Summary

**Day-grouped, read-only order-history table with a client-computed 4-tile summary strip and a fully inert D-14 filter bar, built entirely on Plan 01's pure derivation layer.**

## Performance

- **Duration:** ~20 min
- **Completed:** 2026-07-17
- **Tasks:** 3
- **Files modified:** 2 (both created)

## Accomplishments
- `HistoryScreen` calls `useHistoryOrders()` itself and performs zero derivation inline — `filterFinishedOrders`, `groupOrdersByDay`, and `computeSummary` (all from Plan 01) do all the work
- 8-track `HIST_GRID` (D-06) row layout: order/customer/type/time/payment/status/total/chevron, with the customer track widened to absorb the dropped items-count and sub-line tracks
- Day-group headers show every visible row's count (including canceled/refunded, D-11) alongside completed-only revenue (D-10), sorted newest-first (D-12), with correct singular/plural noun handling
- Status chip precedence (refunded > canceled > completed) resolved entirely by Plan 01's `deriveDisplayStatus`; the screen only maps the result to a chip class and icon-tile color
- Loading (skeleton rows), error (static copy + retry, no raw error text ever rendered — T-07-10), and empty (D-13) states all render inside the same table card without a layout jump
- Client-computed summary strip (D-15): 4 tiles (Orders/Revenue/Avg/Refunds) derived from the exact same filtered list backing the rows — `getAdminDashboard` is never called
- Full inert filter bar (D-14): period presets, status pills, search, and export all render at final visual size, dimmed and disabled, with the "30 days" pill as the sole full-opacity exception

## Task Commits

Each task was committed atomically:

1. **Task 1: Write failing render tests for HistoryScreen's four states** - `a401222` (test)
2. **Task 2: Implement the day-grouped table, rows, and loading/error/empty states** - `6cf95b9` (feat)
3. **Task 3: Add the client-computed summary strip and the inert filter bar** - `b595033` (feat)

_Note: Task 2's commit already included a working summary strip and a minimal inert filter bar (search + export) since those states share the exact same `isLoading`/`isError` booleans as the table and are directly exercised by Task 1's loading/error/empty test assertions. Task 3's commit is the genuine incremental addition: the period-preset and status-pill groups that complete the D-14 filter-bar contract._

## Files Created/Modified
- `src/screen-history.jsx` - HistoryScreen component: table (header/day-groups/rows), loading/error/empty states, summary strip, inert filter bar
- `src/__tests__/screen-history.test.jsx` - Render tests for all four states plus D-01/D-02/D-05/D-10/D-11/D-12 behavior assertions

## Decisions Made
- Avg summary tile renders a computed zero (`formatRON(0)`) rather than an em-dash specifically when the whole period has zero finished orders, reserving `—` for the error state — resolves a tension between the UI-SPEC prose (which lists "— for avg" under its "zeros" description) and Task 1's literal acceptance test (which asserts `—` must be absent from the empty state)
- Loading placeholders use static neutral-grey blocks instead of a CSS shimmer animation, since adding a keyframe would require a new `styles.css` class and the plan's own acceptance criteria pin `git diff src/styles.css src/i18n.jsx` to empty
- Period preset pills are unrolled as 4 explicit buttons rather than `.map()`'d for source-level clarity of the disabled/full-opacity-exception treatment
- Row-level status chips reuse the design source's `tile`/`ink`/`icon` per status but drop its `chip-dot` modifier class, since only `chip-sage`/`chip-red`/`chip-amber` are named in the phase's must-have truths

## Deviations from Plan

None - plan executed exactly as written. The task-split note above (Task 2 landing more of the summary/filter scaffolding than its `<action>` text implied) is a commit-granularity judgment call, not a deviation from any `<behavior>`/`<acceptance_criteria>` — every acceptance criterion for both Task 2 and Task 3 passed as specified.

## Known Stubs

None. Status/type filter pills and the search input are intentionally inert per D-14 (out of scope until Phase 10 — Filters + Search); this is documented phase-boundary behavior, not a stub blocking this plan's goal.

## Issues Encountered
None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `HistoryScreen` is fully built and tested; Plan 06 (app.jsx router wiring) can now render it for `screen === 'history'` and wire `onOpenOrder` to `openHistoryOrder()` (Plan 02) and `screen-detail.jsx`'s `readOnly` mode (Plan 05)
- Phase 10 (Filters + Search) will wire live handlers onto the already-shaped, already-positioned inert filter bar with zero layout shift
- No blockers.

---
*Phase: 07-history-screen-foundation*
*Completed: 2026-07-17*

## Self-Check: PASSED

All claimed files exist on disk and all claimed commit hashes are present in git history.
