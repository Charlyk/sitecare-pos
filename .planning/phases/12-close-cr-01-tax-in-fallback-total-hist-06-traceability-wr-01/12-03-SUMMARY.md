---
phase: 12-close-cr-01-tax-in-fallback-total-hist-06-traceability-wr-01
plan: 03
subsystem: ui
tags: [zustand, react, state-management, history]

# Dependency graph
requires:
  - phase: 07-history-screen-foundation
    provides: HistoryScreen (screen-history.jsx), the openHistoryOrder/historyOrder session-only
      store pattern this plan mirrors
  - phase: 09-period-control
    provides: selectedPeriod / settledPeriodRef derived-during-render pattern (WR-03), the range
      useMemo this plan preserves in mechanism
  - phase: 10-filters-search
    provides: statusFilter/typeFilter/query local state this plan lifts into the store
provides:
  - Session-only historySelection Zustand slice (period/statusFilter/typeFilter/query)
  - setHistorySelection(patch) shallow-merge action with a Rule-1 no-op guard
  - setScreen's D-03 target-keyed conditional reset (preserve for history/history-detail, reset
    otherwise)
  - screen-history.jsx rewired to read/write the store instead of four local useState calls
affects: [any future phase touching screen-history.jsx state, store.js's setScreen/session-only
  slice pattern]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Session-only Zustand slice mirrored from the selectedOrder/historyOrder precedent: set via
      an action, target-keyed conditional reset in setScreen, excluded from partialize"
    - "Shallow-merge setter with a no-op guard (Object.is per patched key) to prevent unnecessary
      reference churn / re-renders on a redundant update"

key-files:
  created: []
  modified:
    - src/store.js
    - src/__tests__/store.test.js
    - src/screen-history.jsx
    - src/__tests__/screen-history.test.jsx

key-decisions:
  - "add-alongside: historySelection is a new session-only store slice, not a promotion/generalization of an existing abstraction (assumption-delta detector false-positive on the word 'fallback' in the phase title)"
  - "setScreen's D-03 reset is additive-conditional: screen/selectedOrder/historyOrder stay unconditional; only historySelection gets a target-keyed branch"
  - "debouncedQuery stays local (derived UI timing value) but is seeded from the restored historySelection.query via a lazy useState initializer, avoiding a one-frame unfiltered flash after Back"
  - "Rule-1 fix: setHistorySelection no-ops when every patched key already strictly equals its current value, so re-clicking an already-selected filter pill does not allocate a new historySelection reference (zustand's set() always creates a new top-level object, unlike React's primitive-value setState bailout)"

patterns-established:
  - "Session-only slice + target-keyed conditional reset in setScreen, for any future store-lifted UI selection state that must survive one specific screen transition but reset on all others"

requirements-completed: [D-01, D-02, D-03, D-04]

coverage:
  - id: D1
    description: "historySelection session-only slice (period/statusFilter/typeFilter/query) added to store.js, defaulting correctly and excluded from partialize"
    requirement: D-01
    verification:
      - kind: unit
        ref: "src/__tests__/store.test.js#historySelection session-only slice (D-01/D-03/D-04) > historySelection defaults to ... on a fresh store"
        status: pass
      - kind: unit
        ref: "src/__tests__/store.test.js#historySelection session-only slice (D-01/D-03/D-04) > historySelection is NOT included in the partialize output (session-only)"
        status: pass
    human_judgment: false
  - id: D2
    description: "History -> history-detail -> Back round-trip preserves the full selection (period/status/type/search)"
    requirement: D-02
    verification:
      - kind: unit
        ref: "src/__tests__/store.test.js#historySelection session-only slice (D-01/D-03/D-04) > History -> history-detail -> Back (history) round-trip preserves the full selection"
        status: pass
    human_judgment: false
  - id: D3
    description: "setScreen resets historySelection to defaults for any non-history/history-detail target, while still unconditionally nulling selectedOrder/historyOrder"
    requirement: D-03
    verification:
      - kind: unit
        ref: "src/__tests__/store.test.js#historySelection session-only slice (D-01/D-03/D-04) > setScreen(\"orders\") (a non-history target) resets historySelection to defaults"
        status: pass
      - kind: unit
        ref: "src/__tests__/store.test.js#historySelection session-only slice (D-01/D-03/D-04) > setScreen to any non-history target still sets selectedOrder=null and historyOrder=null (unconditional, unchanged)"
        status: pass
    human_judgment: false
  - id: D4
    description: "setHistorySelection shallow-merges only changed keys, keeping the period object reference stable on non-period updates; screen-history.jsx rewired to read/write the slice with WR-03 and the range useMemo unregressed"
    requirement: D-04
    verification:
      - kind: unit
        ref: "src/__tests__/store.test.js#historySelection session-only slice (D-01/D-03/D-04) > setHistorySelection({ statusFilter: \"completed\" }) changes only statusFilter; the period reference is unchanged"
        status: pass
      - kind: unit
        ref: "src/__tests__/screen-history.test.jsx (full file, 84 tests, includes filter/period/debounce interaction coverage)"
        status: pass
    human_judgment: false

duration: ~6min
completed: 2026-07-19
status: complete
---

# Phase 12 Plan 03: Lift History selection state into a session-only Zustand slice Summary

**History's period/status/type/search selection moved from four component-local `useState` calls into a session-only `historySelection` Zustand slice with a target-keyed conditional reset in `setScreen`, so History→history-detail→Back now genuinely preserves the full selection while any other screen exit still clears it.**

## Performance

- **Duration:** ~6 min
- **Completed:** 2026-07-19T19:59:54Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- `store.js` gained a session-only `historySelection` slice (`{ period, statusFilter, typeFilter, query }`), a `setHistorySelection(patch)` shallow-merge action, and an additive D-03 conditional reset inside `setScreen` (preserve for `'history'`/`'history-detail'` targets, reset to defaults otherwise) — the unconditional `selectedOrder`/`historyOrder` null reset is untouched.
- `screen-history.jsx` now sources `selectedPeriod`/`statusFilter`/`typeFilter`/`query` from the store instead of four local `useState` calls; `debouncedQuery` stays local but is seeded from the restored `query` so no unfiltered frame appears on remount.
- The `settledPeriodRef` derived-during-render pattern (WR-03) and the `range` useMemo are unchanged in mechanism — they now simply read the store-sourced `selectedPeriod`, whose reference stays stable across non-period updates.
- Zero JSX/CSS/i18n change — a pure state-ownership refactor, design fidelity preserved.

## Task Commits

Each task was committed atomically:

1. **Task 1: Add session-only historySelection slice + setter + D-03 conditional reset in store.js** - `e0c797a` (feat)
2. **Task 2: Rewire screen-history.jsx to the store slice + update the test mock** - `7c0d726` (feat)

_Note: both commits are `feat` — Task 1's TDD-flagged work (behavior + tests) landed as a single commit per this repo's established convention of combining closely-coupled implementation+test work when the test suite for the new behavior is authored in the same edit pass (matches Phase 08-04/11-04 precedent noted in STATE.md)._

## Files Created/Modified
- `src/store.js` - historySelection state key, setHistorySelection action (with Rule-1 no-op guard), D-03 conditional reset inside setScreen
- `src/__tests__/store.test.js` - new describe block covering default/merge/preserve/reset behavior, round-trip preservation, and the unchanged selectedOrder/historyOrder reset guard
- `src/screen-history.jsx` - four local useState calls replaced by store reads/writes; debouncedQuery seeded from restored query
- `src/__tests__/screen-history.test.jsx` - useAppStore mock rebuilt on a real zustand instance (extended with historySelection + setHistorySelection) so filter-click interaction tests still re-render correctly

## Decisions Made
- **add-alongside** (not promote/generalize): `historySelection` is a brand-new session-only slice mirroring the `selectedOrder`/`historyOrder` precedent exactly — the assumption-delta detector's "fallback" trigger was a false positive on the phase title, not a signal to genericize an existing abstraction (documented in the plan's own `<assumption_delta_decision>`).
- `setScreen`'s D-03 reset is additive-conditional: `screen`, `selectedOrder: null`, `historyOrder: null` stay exactly as before (unconditional); only the new `historySelection` field gets a target-keyed branch, using the functional `set((s) => ...)` form to read current state for the preserve branch.
- `debouncedQuery` remains local component state (a derived UI timing value, not shared selection) but its `useState` initializer is now a lazy closure reading `historySelection.query`, closing the "first render shows unfiltered rows" gap (Pitfall 4).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] setHistorySelection no-ops on a redundant patch to avoid spurious re-renders**
- **Found during:** Task 2 (screen-history.jsx rewire + test mock update)
- **Issue:** The plan's `setHistorySelection` implementation (`set((s) => ({ historySelection: { ...s.historySelection, ...patch } }))`) always allocates a new `historySelection` object, even when the patch's values already match current state. Because zustand's `set()` always produces a fresh top-level state object, this caused a real behavior regression versus the old local `useState`-based implementation: clicking an *already-selected* filter pill (or clicking Export, which touches no state) used to be a no-op React bail-out (identical primitive `setState` calls are skipped by React), but after the lift it triggered a genuine re-render of `HistoryScreen` and an extra call into `useHistoryOrders` on every render. Caught by the existing render test `"clicking a status pill or the Export button changes nothing about the fetched range"` (expected 24 hook calls, got 26).
- **Fix:** Added a shallow no-op guard to `setHistorySelection` in both `store.js` and the test file's mirrored mock store: if every key in the patch already strictly equals (`===`) its current value in `historySelection`, `set()` returns `{}` (a genuine no-op — the `historySelection` reference itself is left untouched, so zustand's selector-level equality check on `s.historySelection` correctly bails out and the consuming component does not re-render). Any patch that actually changes a value still merges normally.
- **Files modified:** `src/store.js`, `src/__tests__/screen-history.test.jsx`
- **Verification:** Full `npx vitest run` — the previously-failing test now passes; no other test's expectations changed.
- **Committed in:** `7c0d726` (Task 2 commit)

**2. [Rule 3 - Blocking] screen-history.test.jsx's store mock rebuilt on a real zustand store**
- **Found during:** Task 2 (test mock update)
- **Issue:** The plan's literal instruction was to extend the mocked `useAppStore` object (`vi.fn((selector) => selector({...}))`) with `historySelection`/`setHistorySelection` as static values. Because `screen-history.jsx`'s status/type/period/search click handlers now call the store's `setHistorySelection` instead of local `useState` setters, a static mock never actually changes what `useAppStore((s) => s.historySelection)` returns on the next render — filter-click interaction tests (faceting, debounce, filtered recompute, empty-state variants; ~9 tests) would render, click a filter, and assert on now-unreachable UI, since the component never re-rendered with new data. This blocked completing Task 2's own acceptance criteria (`npx vitest run src/__tests__/screen-history.test.jsx` passing).
- **Fix:** Replaced the static mock object with a real `zustand` `create(...)` store inside the `vi.mock('../store.js', ...)` factory (the same library already a project dependency, imported dynamically inside the async factory to respect vitest's mock-hoisting order). `setHistorySelectionMock` still records every call for assertions; `beforeEach` resets the mock store's `historySelection` to defaults between tests.
- **Files modified:** `src/__tests__/screen-history.test.jsx`
- **Verification:** `npx vitest run src/__tests__/screen-history.test.jsx` — 84/84 tests pass, including all Phase 10 filter-interaction tests.
- **Committed in:** `7c0d726` (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (1 bug fix, 1 blocking test-infrastructure fix)
**Impact on plan:** Both deviations were necessary consequences of moving reactive UI state from React's local `useState` (with its automatic identical-value bail-out and real re-render on every `set` call) into zustand (whose `set()` always allocates a new top-level state object). No scope creep — both fixes are scoped exactly to `setHistorySelection`'s behavior and its test double.

## Issues Encountered
None beyond the two auto-fixed deviations above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- `historySelection` is fully wired and tested; Phase 8's SC4 "period intact" claim across History→history-detail→Back is now literally true.
- Plan 12-04 (verify + audit) can proceed — no known blockers from this plan.
- Full test suite: 492/495 passing; the 3 remaining failures are pre-existing v1.0 issues (confirmed unrelated by running the same tests against the pre-plan commit) — `BILD-04` config assertion (`bundle.createUpdaterArtifacts` reads `'v1Compatible'`) and two `offline-buttons.test.jsx` `OrdersScreen` tests missing a `QueryClientProvider` wrapper.

---
*Phase: 12-close-cr-01-tax-in-fallback-total-hist-06-traceability-wr-01*
*Completed: 2026-07-19*

## Self-Check: PASSED

- FOUND: src/store.js
- FOUND: src/__tests__/store.test.js
- FOUND: src/screen-history.jsx
- FOUND: src/__tests__/screen-history.test.jsx
- FOUND commit: e0c797a
- FOUND commit: 7c0d726
