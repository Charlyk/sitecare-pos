---
phase: 08-read-only-order-detail-view
plan: 03
subsystem: ui
tags: [history, order-detail, duration, status-chip, testing, vitest]

requires:
  - phase: 08-read-only-order-detail-view
    plan: 08-01
    provides: i18n keys h_prep_time, h_canceled_after (ro+en)
  - phase: 08-read-only-order-detail-view
    plan: 08-02
    provides: "deriveDuration(order) in history-utils.js; historyStatusMeta exported from screen-history.jsx"
provides:
  - "readOnly header meta line reports deriveDuration's measured prep-time or time-to-cancellation instead of elapsed-since-now"
  - "readOnly status chip derived from deriveDisplayStatus + historyStatusMeta, agreeing with the History row by construction (D-05)"
affects: [08-04-loading-error-states, 08-05-app-route-wiring]

tech-stack:
  added: []
  patterns:
    - "readOnly-gated derivation: compute the readOnly-only value (duration, displayStatus) once per render, guarded by the readOnly flag, and let the live route's original expression stand unchanged in its own branch"
    - "Null-fallback-to-shipped-behavior: when a derivation returns null, fall back to the pre-existing live-route function (stateMeta) rather than feeding null into a second function whose own internal default would silently mislabel the record"

key-files:
  created: []
  modified:
    - src/screen-detail.jsx
    - src/__tests__/screen-detail.test.jsx

key-decisions:
  - "Duration segment fully replaces (not appends to) the elapsed-since-now segment under readOnly — built as a single conditional string so the '·' separator only appears when a real duration exists, never dangling"
  - "duration is computed once via deriveDuration(order), guarded by readOnly, and reuses formatDuration from data.jsx verbatim — no second duration formatter added"
  - "displayStatus (deriveDisplayStatus(order)) is computed once into a local binding and reused for both the branch condition and the historyStatusMeta argument, per the plan's explicit instruction not to call it twice in a ternary"
  - "st binding assignment: readOnly && displayStatus -> historyStatusMeta(displayStatus, t); readOnly with null displayStatus -> stateMeta(order.state, t); not readOnly -> stateMeta(order.state, t) unchanged — both existing consumers (header chip, minimal-totals chip) pick up the same st with no further change"
  - "Test assertions for the status chip switched from getByText to getAllByText/class-based checks once the fix was in place, because st feeds two chip locations (header + minimal-totals) by design — this was anticipated in the plan's <action> block, not a defect"

patterns-established: []

requirements-completed: []

coverage:
  - id: D3
    description: "readOnly header meta line replaces elapsed-since-now with deriveDuration's derived prep-time/canceled-after duration; null duration drops to a bare placed-at timestamp with no dangling separator; live route unchanged"
    requirement: "HIST-10"
    verification:
      - kind: unit
        ref: "src/__tests__/screen-detail.test.jsx#readOnly duration row (7 tests)"
        status: pass
    human_judgment: false
  - id: D4
    description: "readOnly status chip derived from deriveDisplayStatus + historyStatusMeta agrees with the History row by construction; null displayStatus falls back to stateMeta rather than historyStatusMeta's own completed default; live route and screen-orders.jsx untouched"
    requirement: "HIST-10"
    verification:
      - kind: unit
        ref: "src/__tests__/screen-detail.test.jsx#readOnly mode (5 new tests: refunded, cancelled/RESEARCH Pitfall 2, completed, null-fallback, non-readOnly unchanged)"
        status: pass
      - kind: static
        ref: "git diff --stat src/screen-orders.jsx (empty)"
        status: pass
    human_judgment: false

duration: ~6min
completed: 2026-07-17
status: complete
---

# Phase 8 Plan 3: Duration Row and Status Chip Truth-Telling Summary

**readOnly detail header now reports the order's actual measured duration (never elapsed-since-now) and a status chip that structurally agrees with the History row it was opened from.**

## Performance

- **Duration:** ~6 min
- **Started:** 2026-07-17T15:23:47+03:00 (approx., first task commit)
- **Completed:** 2026-07-17T15:28:46+03:00
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- readOnly header meta line replaces the `elapsedMinutes(order.placedAt)`-based counter (meaningless on an order finished weeks ago) with `deriveDuration(order)`'s measured result: `t('h_prep_time')` for a COMPLETED-terminated order, `t('h_canceled_after')` for a CANCELLED-only order, both rendered via the shared `formatDuration` from `data.jsx`
- A `null` `deriveDuration` result (no events, empty `events[]`, or no terminal event) drops the row to a bare placed-at timestamp with no label, no number, and no dangling `·` separator — built as a single conditional expression rather than static JSX between two dynamic segments
- readOnly status chip now routes through `deriveDisplayStatus(order)` + `historyStatusMeta(displayStatus, t)` — the identical derivation `screen-history.jsx` uses for its rows — instead of the live-lifecycle `stateMeta(order.state, t)`, fixing T-08-07: a cancelled historical order previously fell through `stateMeta`'s `map.new` fallback and rendered a terracotta **New** chip, directly contradicting the **Canceled** chip staff clicked to get here
- A `null` `deriveDisplayStatus` (unrecognised status) deliberately falls back to `stateMeta` rather than entering `historyStatusMeta`, whose own `map[status] || map.completed` default would otherwise silently label an unexpected order **Completed** (T-08-08)
- The live (non-readOnly) route is byte-unchanged: elapsed segment intact, `stateMeta` chip intact, no duration row; `git diff --stat src/screen-orders.jsx` is empty, confirming the live status-mapping file was never touched

## Task Commits

Each task followed the plan's `tdd="true"` RED → GREEN cycle; no REFACTOR commit was needed for either task:

1. **Task 1 (RED): Add failing tests for the readOnly duration row** - `f772dec` (test)
2. **Task 1 (GREEN): Implement the readOnly duration row** - `d7c8e6f` (feat)
3. **Task 2 (RED): Add failing tests for the readOnly status chip derivation** - `b178bc8` (test)
4. **Task 2 (GREEN): Implement the readOnly status chip derivation** - `f774709` (feat)

**Plan metadata:** (final commit hash recorded after this summary is committed)

## Files Created/Modified

- `src/screen-detail.jsx` — imported `deriveDuration`/`deriveDisplayStatus` from `history-utils.js` and `historyStatusMeta` from `screen-history.jsx`; added a `duration` binding (readOnly-gated `deriveDuration(order)`) consumed by the header meta line; replaced the unconditional `stateMeta` assignment with a three-branch `st` derivation (readOnly+displayStatus → `historyStatusMeta`; readOnly+null → `stateMeta`; not readOnly → `stateMeta`, unchanged)
- `src/__tests__/screen-detail.test.jsx` — added a `describe('readOnly duration row')` block (7 tests: COMPLETED 25min en/ro, CANCELLED 65min, empty events, missing events key, COMPLETED-precedence-over-CANCELLED, non-readOnly unchanged) and 5 tests inside the existing `describe('readOnly mode')` block (refunded, cancelled/RESEARCH Pitfall 2, completed, null-displayStatus fallback, non-readOnly stateMeta unchanged)

## Decisions Made

- Duration and status derivations are each computed once per render (`const duration = readOnly ? deriveDuration(order) : null`; `const displayStatus = readOnly ? deriveDisplayStatus(order) : null`), guarded by `readOnly`, per the plan's explicit instruction to avoid double-calling either derivation inside a ternary
- The duration row's `·` separator is embedded inside the truthy branch of the conditional (not emitted as static JSX between expressions), so a `null` duration can never leave a dangling separator
- Left `const elapsed = elapsedMinutes(order.placedAt)` in place unconditionally (cheap, unused under `readOnly`) exactly as the plan directed, rather than gating it — keeps the live-route expression untouched in its own branch

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Test correctness] Status-chip test assertions adjusted from `getByText`/`queryByText` to `getAllByText` with class-based disambiguation**
- **Found during:** Task 2, GREEN phase (tests failed with "Found multiple elements" rather than "unable to find")
- **Issue:** `st` (the derived chip meta) feeds two DOM locations by design — the header chip (line 52-ish) and the minimal-totals card chip (rendered when `order.items == null`, which is true for every `HISTORY_ORDER`-based fixture in this test file). `getByText`/`queryByText` throw on multiple matches, which is a query-strictness problem, not a behavior defect — this dual-rendering was explicitly called out in the plan's `<action>` block ("Assign the result to the existing `st` binding so both consumers... pick it up with no further change").
- **Fix:** Switched the refunded/cancelled/completed assertions to `getAllByText(...).length > 0`; kept the null-fallback and non-readOnly assertions distinguishing chip class (`chip-slate` for `stateMeta`'s `done`/`accepted` states vs `chip-sage` for `historyStatusMeta`'s `completed` default) since the Romanian labels for `state_done` and `status_completed` happen to be the identical string `Finalizată` — a class check was needed to prove which derivation actually produced the chip, not just that some chip with that text exists.
- **Files modified:** `src/__tests__/screen-detail.test.jsx`
- **Commits:** `b178bc8` (initial RED version), `f774709` (fixed alongside the GREEN implementation commit)

## Issues Encountered

None outside the test-query adjustment above. The three pre-existing, unrelated test failures (`src/__tests__/build-pipeline.test.js` — 1 failure; `src/__tests__/offline-buttons.test.jsx` — 2 failures) were re-confirmed present and untouched; full suite is 287/290 passing (baseline 275/278 + 12 new tests from this plan, same 3 known failures).

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

`screen-detail.jsx`'s readOnly header now tells the truth about a finished order's duration and status. 08-04 (loading/error states) and 08-05 (app.jsx route wiring / `mergedHistoryOrder`) can proceed without further changes to the duration or status-chip logic landed here. No blockers.

---
*Phase: 08-read-only-order-detail-view*
*Completed: 2026-07-17*

## Self-Check: PASSED

All modified files confirmed present on disk; all four task commit hashes (f772dec, d7c8e6f, b178bc8, f774709) confirmed in git log.
