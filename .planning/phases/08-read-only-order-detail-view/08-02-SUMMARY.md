---
phase: 08-read-only-order-detail-view
plan: 02
subsystem: ui
tags: [history, order-detail, derivation, testing, vitest]

requires:
  - phase: 07-history-screen-foundation
    provides: history-utils.js module contract (pure, no react/data.jsx/@charlyk imports), screen-history.jsx HistoryScreen and historyStatusMeta
provides:
  - "deriveDuration(order) — pure function in history-utils.js that computes an order's actual prep/cancellation duration from raw events[] timestamps"
  - "historyStatusMeta — now exported from screen-history.jsx for reuse by screen-detail.jsx"
affects: [08-03-order-detail-screen, 08-04-loading-error-states]

tech-stack:
  added: []
  patterns:
    - "Derivation helpers select the winning array element via filter+reduce with a >= tie-break, never Array.prototype.find (avoids stale first-match selection)"
    - "Screen-to-screen meta-helper reuse via named export at declaration site (mirrors screen-orders.jsx's sourceMeta/typeMeta/stateMeta precedent)"

key-files:
  created: []
  modified:
    - src/history-utils.js
    - src/screen-history.jsx
    - src/__tests__/history-utils.test.js
    - src/__tests__/screen-history.test.jsx

key-decisions:
  - "deriveDuration lives in history-utils.js, not co-located in screen-detail.jsx, so its hard edge cases (no terminal event, duplicate COMPLETED events, tied timestamps) get direct unit tests instead of being probed through rendered DOM"
  - "historyStatusMeta is exported (not duplicated, not extracted to a new module) — mirrors the screen→screen meta-import precedent screen-detail.jsx already uses for sourceMeta/typeMeta/stateMeta from screen-orders.jsx"
  - "deriveDuration reads events[].toStatus with raw SDK casing (COMPLETED/CANCELLED), never the lowercased order.state, because normalizeOrder spreads events[] through untouched"
  - "deriveDuration uses Math.round (not Math.floor like elapsedMinutes) because it measures a fixed historical event, not a live ticking counter"
  - "empty edge: an order with no events, empty events[], or no terminal event yields null (dropped duration row), never '0 min' or a dash"
  - "adjacency edge: two terminal events with an identical createdAt resolve deterministically to the later array element via a >= comparison in the reduce"

patterns-established:
  - "Derivation module purity contract (no imports) is preserved even when adding a second helper with more complex selection logic"

requirements-completed: [HIST-10]

coverage:
  - id: D1
    description: "deriveDuration(order) returns {kind:'prep',minutes} or {kind:'canceled',minutes} from events[] timestamps, with COMPLETED precedence, max-createdAt selection (not first-match), deterministic tie-break, zero-floor clamping, and null on any untrustworthy input"
    requirement: "HIST-10"
    verification:
      - kind: unit
        ref: "src/__tests__/history-utils.test.js#deriveDuration (12 tests)"
        status: pass
    human_judgment: false
  - id: D2
    description: "historyStatusMeta is exported from screen-history.jsx with byte-identical mapping behavior (chip class, tile/ink colors, icon, label) for reuse by screen-detail.jsx"
    requirement: "HIST-10"
    verification:
      - kind: unit
        ref: "src/__tests__/screen-history.test.jsx#historyStatusMeta (2 tests)"
        status: pass
      - kind: unit
        ref: "src/__tests__/screen-history.test.jsx (11 pre-existing HistoryScreen tests, unchanged)"
        status: pass
    human_judgment: false

duration: ~3min
completed: 2026-07-17
status: complete
---

# Phase 8 Plan 2: Duration Derivation and Status-Meta Export Summary

**`deriveDuration(order)` added to history-utils.js with full edge-case unit coverage, and `historyStatusMeta` exported from screen-history.jsx for cross-screen reuse.**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-07-17T12:20:00Z (approx.)
- **Completed:** 2026-07-17T12:21:26Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- `deriveDuration(order)` exported from `src/history-utils.js`: derives a trustworthy actual duration (`{ kind: 'prep'|'canceled', minutes }`) from `order.events[]` raw SDK-cased `toStatus`/`createdAt` fields, or `null` when the data can't support a real number
- COMPLETED events take outright precedence over CANCELLED regardless of timestamp ordering; the winning event within a status is selected by maximum `createdAt` via `filter`+`reduce` (never `.find`, which would return a stale first match)
- Full edge coverage: empty/absent `events`, no terminal event, missing `placedAt`, duplicate COMPLETED events (newest-first array order does not win — max `createdAt` does), identical-timestamp determinism, negative-duration clamp to 0, unparseable `createdAt` skipped without throwing
- `historyStatusMeta` changed from module-private to `export function` in `src/screen-history.jsx` — an export-visibility-only change; the map's chip classes, tile/ink colors, icons, and label lookups are byte-identical, verified by `git diff` scope and by re-running the full pre-existing `screen-history.test.jsx` suite unchanged

## Task Commits

Each task was committed atomically (Task 1 followed the plan's `tdd="true"` RED → GREEN cycle; no REFACTOR commit was needed):

1. **Task 1 (RED): Add failing tests for deriveDuration** - `628eaae` (test)
2. **Task 1 (GREEN): Implement deriveDuration(order)** - `d08fcc7` (feat)
3. **Task 2: Export historyStatusMeta from screen-history.jsx** - `ee00f1d` (feat)

**Plan metadata:** (final commit hash recorded after this summary is committed)

## Files Created/Modified
- `src/history-utils.js` - added `deriveDuration(order)`, placed after `deriveDisplayStatus`; module remains import-free (0 imports, verified by grep)
- `src/__tests__/history-utils.test.js` - added `describe('deriveDuration', ...)` with 12 tests covering every case in the plan's `<behavior>` block
- `src/screen-history.jsx` - `historyStatusMeta` changed from module-private `function` to `export function`; comment extended to note the new consumer and warn against narrowing it back
- `src/__tests__/screen-history.test.jsx` - added `describe('historyStatusMeta', ...)` with 2 tests asserting chip-class mapping by name-imported call, plus the unrecognized-status fallback

## Decisions Made
- `deriveDuration` placed in `history-utils.js` (not `screen-detail.jsx`) per the plan's `<planner_decision>` — pure function, direct unit tests for hard cases, matches this module's existing raw-SDK-casing convention (`deriveDisplayStatus`)
- `historyStatusMeta` exported via a bare `export function` at its declaration site (matching `screen-history.jsx`'s own convention — `HistoryScreen` is likewise exported at its declaration, not via a bottom re-export block), rather than mirroring `screen-orders.jsx`'s literal bottom-of-file `export { ... }` block
- `deriveDuration` selection logic uses `filter` + `reduce` with a `>=` comparison (not a plain `for` loop or `Array.prototype.find`) to make the max-`createdAt`/tie-break contract explicit and grep-verifiable (`grep -c "\.find(" src/history-utils.js` returns `0`)

## Deviations from Plan

None - plan executed exactly as written. All acceptance criteria (grep checks, test counts, full-suite green modulo pre-existing failures) verified directly.

## Issues Encountered

None. Two pre-existing, unrelated test failures were observed in `src/__tests__/build-pipeline.test.js` (BILD-04 updater config assertion) and `src/__tests__/offline-buttons.test.jsx` (missing `QueryClientProvider` wrapper) — both were present before this plan's changes, are outside this plan's file scope (`src/history-utils.js`, `src/screen-history.jsx` and their tests), and are logged in the plan context as deferred. Not touched here.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

`screen-detail.jsx` (08-03) can now import both `deriveDuration` from `history-utils.js` and `historyStatusMeta` from `screen-history.jsx` to render the duration row and a status chip that agrees with the History row by construction (D-05). No blockers for 08-03 or 08-04.

---
*Phase: 08-read-only-order-detail-view*
*Completed: 2026-07-17*

## Self-Check: PASSED

All modified files confirmed present on disk; all three task commit hashes (628eaae, d08fcc7, ee00f1d) confirmed in git log.
