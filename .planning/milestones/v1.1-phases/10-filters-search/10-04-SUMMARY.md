---
phase: 10-filters-search
plan: 04
subsystem: ui
tags: [react, vitest, fake-timers, empty-state, integration-tests]

# Dependency graph
requires:
  - phase: 10-filters-search (10-01)
    provides: matchesStatus/matchesType/matchesSearch pure predicates, h_empty_filtered_title/h_clear_filters i18n keys — consumed directly, no re-derivation
  - phase: 10-filters-search (10-03)
    provides: HistoryScreen's statusFilter/typeFilter/query/debouncedQuery state, the byTypeAndSearch/visible two-derived-set faceted chain, and the D-15 Avg-tile isError gate — this plan builds the empty-state remedy and integration tests directly on top, untouched otherwise
provides:
  - "EmptyBlock's Variant B (filtersActive true): h_empty_filtered_title main line, no sub-line, a btn-secondary Clear Filters button (Icon x + h_clear_filters) whose onClick resets the three filter axes"
  - "HistoryScreen's filtersActive boolean (statusFilter!=='all' || typeFilter!=='all' || query!=='') and handleClearFilters — the ONLY place that resets filter state, and it never calls setSelectedPeriod"
  - "Integration test coverage for D-01/D-02 (exclude-self faceting), F-03 (pill order), D-03 (zero-pill→empty), D-04 (filtered day-header/tile recompute), D-10 (fake-timer debounce burst + immediate-clear), D-12 (filters survive a period switch), D-13/D-14 (both empty-state variants + Clear Filters + its period-untouched prohibition), and D-15 (Avg-tile RON-zero fix)"
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Fake-timer debounce assertion: vi.useFakeTimers() + a rapid fireEvent.change burst + act(() => vi.advanceTimersByTime(250)) inside a try/finally that restores vi.useRealTimers() — proves exactly one recompute lands after the debounce window, not one per keystroke"
    - "RTL text-match disambiguation for pill-vs-chip label collisions: getByText(label) resolves the pill button only when the button's DIRECT text-node children (the plain-text label, not the nested count-badge <span>) match; where a row's own chip renders the identical label as a <span>, disambiguate by filtering screen.getAllByText(label) on el.tagName === 'BUTTON'"

key-files:
  created: []
  modified:
    - src/screen-history.jsx
    - src/__tests__/screen-history.test.jsx

key-decisions:
  - "EmptyBlock's two variants are a single early-return branch on filtersActive at the top of the function, not a shared-JSX conditional inline — keeps Variant A's existing period-composition logic (periodPhrase, the D-14 double-dot Rule-1 fix) completely untouched and unreachable when filters are active, matching the UI-SPEC's 'two distinct variants from the same container/shape' framing"
  - "handleClearFilters is a HistoryScreen-level function (not passed-through setters) so the 'never touches the period setter' invariant is enforced at a single call site or auditable in a `grep -n 'setSelectedPeriod' handleClearFilters` fashion — it composes only setStatusFilter/setTypeFilter/setQuery, matching the plan's key_links contract verbatim"
  - "The D-12 compose-with-period backstop test was written as a full automated assertion rather than deferred to a manual check, since Phase 9's period-pill plumbing (history-period-pill testid) was already confirmed present and wired at execution time — the plan's own conditional ('write it only if... otherwise defer') resolved to 'write it'"
  - "D-14's prohibition test asserts on the FETCHED RANGE ARGUMENT staying identical across a status-select + Clear-Filters cycle, not on useHistoryOrders' mock call COUNT — the hook is invoked on every HistoryScreen re-render regardless of argument (it's a hook call, not a memoized fetch trigger), so call-count equality would have been the wrong invariant; the existing pre-10-04 test asserting call-count equality only holds because it clicks pills that are already at their default value (a true React no-op re-render)"

requirements-completed: [HIST-07, HIST-08, HIST-09]

coverage:
  - id: D13-VariantB
    description: "EmptyBlock renders h_empty_filtered_title on the main line (fontSize 15/600) with NO sub-line whenever filtersActive is true; Variant A (period copy + h_empty_sub) renders unchanged when filtersActive is false"
    requirement: "HIST-07"
    verification:
      - kind: integration
        ref: "src/__tests__/screen-history.test.jsx — 'D-03: a zero-count status pill...' and 'D-13/D-14: Clear Filters...' tests assert h_empty_filtered_title renders and h_empty_sub does NOT"
        status: pass
    human_judgment: false
  - id: D14-ClearFilters
    description: "Clear Filters button (btn-secondary, marginTop 16, Icon x + h_clear_filters) resets statusFilter/typeFilter/query to 'all'/'all'/'' and restores Variant A; it never calls setSelectedPeriod"
    requirement: "HIST-09"
    verification:
      - kind: integration
        ref: "src/__tests__/screen-history.test.jsx — 'D-13/D-14: Clear Filters resets...' and 'D-14 prohibition: Clear Filters never touches...' (asserts the fetched range argument is byte-identical before/after the click sequence)"
        status: pass
    human_judgment: false
  - id: D02-Faceting
    description: "Selecting a status pill does not zero out sibling pills' counts — statusCounts is tallied over byTypeAndSearch (exclude-self), unaffected by statusFilter itself"
    requirement: "HIST-07"
    verification:
      - kind: integration
        ref: "src/__tests__/screen-history.test.jsx — 'D-02: selecting Completed leaves...' (Rambursate stays '1', Anulate stays '2' after selecting Finalizate)"
        status: pass
    human_judgment: false
  - id: D03-ZeroPill
    description: "A 0-count status pill is not disabled and, when clicked, lands on the filtered-empty Variant B"
    requirement: "HIST-07"
    verification:
      - kind: integration
        ref: "src/__tests__/screen-history.test.jsx — 'D-03: a zero-count status pill is clickable...'"
        status: pass
    human_judgment: false
  - id: D04-FilteredRecompute
    description: "A canceled-only filter recomputes the day-header count/revenue subtotal and the four summary tiles to the filtered subset, not the period"
    requirement: "HIST-07"
    verification:
      - kind: integration
        ref: "src/__tests__/screen-history.test.jsx — 'D-04: a canceled-only filter recomputes...'"
        status: pass
    human_judgment: false
  - id: D15-AvgZero
    description: "A canceled-only filter (completedCount 0, isError false) renders the Avg tile as formatRON(0), never the '—' em-dash"
    requirement: "HIST-09"
    verification:
      - kind: integration
        ref: "src/__tests__/screen-history.test.jsx — 'D-15: a canceled-only filter... renders the Avg tile as a RON zero, not \"—\"'"
        status: pass
    human_judgment: false
  - id: D10-Debounce
    description: "A rapid keystroke burst produces exactly one filtered recompute 250ms after the LAST keystroke (fake timers); clearing the search box applies immediately with no timer advance"
    requirement: "HIST-09"
    verification:
      - kind: integration
        ref: "src/__tests__/screen-history.test.jsx — 'D-10: a rapid keystroke burst yields exactly one filtered recompute...' (vi.useFakeTimers + act(vi.advanceTimersByTime(250)))"
        status: pass
    human_judgment: false
  - id: D12-SurvivesPeriodSwitch
    description: "A status filter survives a period switch — period and filters are independent axes, neither setter resets the other"
    requirement: "HIST-09"
    verification:
      - kind: integration
        ref: "src/__tests__/screen-history.test.jsx — 'D-12: a status filter survives a period switch...'"
        status: pass
    human_judgment: false
  - id: F03-PillOrder
    description: "The four status pills render in exactly All/Completed/Refunded/Canceled DOM order"
    requirement: "HIST-07"
    verification:
      - kind: integration
        ref: "src/__tests__/screen-history.test.jsx — 'F-03: the four status pills render in order...'"
        status: pass
    human_judgment: false
  - id: FullSuiteGreen
    description: "npx vitest run src/__tests__/screen-history.test.jsx is green (74/74); the full suite's only 3 failures are the pre-existing, unrelated build-pipeline/offline-buttons failures logged in deferred-items.md by 10-01"
    requirement: "HIST-07, HIST-08, HIST-09"
    verification:
      - kind: unit
        ref: "npx vitest run src/__tests__/screen-history.test.jsx (74/74) and npx vitest run (444/447, 3 pre-existing unrelated failures)"
        status: pass
    human_judgment: false

duration: ~18min
completed: 2026-07-18
status: complete
---

# Phase 10 Plan 04: Filtered Empty-State + Integration Test Suite Summary

**Adds EmptyBlock's Variant B (D-13's filtered-empty copy + D-14's Clear Filters remedy that resets only the three filter axes, never the period) and a 15-test integration suite proving exclude-self faceting, the F-03 pill order, D-03's zero-pill behavior, D-04's filtered day-header/tile recompute, D-10's fake-timer debounce, D-12's period-independence, and D-15's Avg-tile fix.**

## Performance

- **Duration:** ~18 min
- **Started:** 2026-07-18T00:00:00+03:00 (approx, per prior session start)
- **Completed:** 2026-07-18T01:08:55+03:00
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- `EmptyBlock` gained an early-return `filtersActive` branch: when true it renders `t('h_empty_filtered_title')` on the main-line role (fontSize 15/600), no sub-line, and a `.btn-secondary` Clear Filters button (`Icon name="x"` + `t('h_clear_filters')`, `marginTop: 16`) below it — mirroring `ErrorBlock`'s retry-button shape exactly. Variant A's existing period-composition logic (`periodPhrase`, the 09-05 double-dot Rule-1 fix) is completely untouched and unreachable in the Variant-B branch.
- `HistoryScreen` computes `filtersActive = statusFilter !== 'all' || typeFilter !== 'all' || query !== ''` and a `handleClearFilters` function that calls `setStatusFilter('all')`, `setTypeFilter('all')`, `setQuery('')` — nothing else. It never calls `setSelectedPeriod` (D-12/D-14 prohibition), and both values are wired into `EmptyBlock`'s render call.
- 15 new integration tests added to `src/__tests__/screen-history.test.jsx` under a new `describe('Phase 10 integration — faceting, debounce, filtered recompute, empty-state variants')` block, covering:
  - **F-03**: the four status pills render in exact `All/Completed/Refunded/Canceled` DOM order
  - **D-02**: selecting Completed leaves the Canceled/Refunded pills' counts non-zero and correct (exclude-self faceting)
  - **D-03**: a zero-count Refunded pill is clickable and lands on Variant B
  - **D-13/D-14**: Clear Filters resets status/type/query and restores Variant A; a separate prohibition test proves the fetched range argument never changes across a status-select + Clear-Filters cycle
  - **D-04**: a canceled-only filter recomputes the day-header count/subtotal and the four summary tiles to the filtered subset
  - **D-15**: a canceled-only filter renders the Avg tile as `0,00 lei`, never `'—'`
  - **Type filter**: selecting the delivery type pill narrows rows across every status
  - **D-10**: a fake-timer rapid-keystroke burst yields exactly one filtered recompute 250ms after the last keystroke; clearing applies immediately with no timer advance
  - **D-12**: a status filter survives a period switch (period and filters are independent axes)

## Task Commits

Each task was committed atomically:

1. **Task 1: EmptyBlock two variants + Clear Filters remedy (D-13/D-14)** - `1e9212a` (feat)
2. **Task 2: Integration test suite — faceting, debounce, D-04, D-15, empty variants** - `540bfda` (test), extended by `8e7d94c` (test — D-12 backstop, see Deviations)

**Plan metadata:** committed separately per `<final_commit>` protocol.

## Files Created/Modified

- `src/screen-history.jsx` - `EmptyBlock` gained the `filtersActive`/`onClearFilters` props and Variant B's early-return branch; `HistoryScreen` gained the `filtersActive` derivation and `handleClearFilters`, wired into the `EmptyBlock` render call
- `src/__tests__/screen-history.test.jsx` - new `describe` block with 15 integration tests (fixture spanning completed/refunded/canceled × delivery/pickup/dinein on one calendar day); no existing tests were modified

## Decisions Made

- `EmptyBlock`'s two variants are a single early-return branch on `filtersActive`, not a shared-JSX conditional inline — this keeps Variant A's period-composition logic entirely unreachable (and untouched) when filters are active, matching the UI-SPEC's framing of "two distinct variants from the same container/shape"
- `handleClearFilters` lives at the `HistoryScreen` level as one function composing exactly three setters — auditable at a single call site that the period setter is never touched, matching the plan's `key_links` contract verbatim
- The D-12 compose-with-period backstop test was written as a full automated assertion (not deferred to a manual check) since Phase 9's period-pill plumbing (`history-period-pill` testid) was already confirmed wired at execution time — the plan's own conditional resolved to "write it"
- D-14's prohibition test asserts on the FETCHED RANGE ARGUMENT staying byte-identical across a status-select + Clear-Filters cycle, not on `useHistoryOrders`' mock call count — the mocked hook is invoked on every `HistoryScreen` re-render regardless of its argument (a hook call is not a memoized fetch trigger), so call-count equality is not the correct invariant here (see Deviations below for the discovery path)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] D-14 prohibition test's initial assertion used the wrong invariant (mock call COUNT instead of the fetched range ARGUMENT)**
- **Found during:** Task 2, first `npx vitest run` pass
- **Issue:** The first draft of the D-14 prohibition test asserted `useHistoryOrders.mock.calls.length` stayed constant across a status-pill click + Clear-Filters click. It failed (107 vs expected 105) because `useHistoryOrders` is a plain hook call inside `HistoryScreen`'s render body — it fires on EVERY re-render regardless of whether its argument changed, so selecting a status pill (a genuine state change, unlike the pre-existing test's already-selected 'all' pill click, which is a true React no-op) legitimately increments the mock's call count twice (once per re-render), even though the fetched RANGE never changes.
- **Fix:** Rewrote the assertion to compare the last call's range argument (`useHistoryOrders.mock.calls[...][0]`) before and after the click sequence via `toEqual`, which is the actual D-14 invariant (period/range never retargeted) rather than "no re-renders occurred."
- **Files modified:** `src/__tests__/screen-history.test.jsx`
- **Verification:** `npx vitest run src/__tests__/screen-history.test.jsx` — passes after the fix
- **Committed in:** `540bfda` (the fix landed before the commit; no separate commit needed)

**2. [Rule 1 - Bug] "Livrare" type-pill click resolved to a TestingLibraryElementError (multiple matches)**
- **Found during:** Task 2, first `npx vitest run` pass
- **Issue:** `screen.getByText('Livrare')` matched both the type-filter `<button>` AND each delivery row's own type chip (`<span className="chip chip-slate">`), since both render the identical label as a direct text-node child (RTL's default text-node-only matcher matches both element types, not just buttons).
- **Fix:** Changed to `screen.getAllByText('Livrare').find((el) => el.tagName === 'BUTTON')` to disambiguate.
- **Files modified:** `src/__tests__/screen-history.test.jsx`
- **Verification:** `npx vitest run src/__tests__/screen-history.test.jsx` — passes after the fix
- **Committed in:** `540bfda`

---

**Total deviations:** 2 auto-fixed (both Rule 1 — test-authoring bugs discovered by running the suite, fixed inline before committing; no production-code changes were needed for either)
**Impact on plan:** No scope creep. Both fixes were required to make this plan's own stated verification (`npx vitest run src/__tests__/screen-history.test.jsx` green) actually pass.

## Issues Encountered

**Full-suite `npx vitest run` shows the same 3 pre-existing failures** already logged in `.planning/phases/10-filters-search/deferred-items.md` by 10-01/10-02 and reconfirmed unrelated by 10-03: `src/__tests__/build-pipeline.test.js` (`BILD-04`) and `src/__tests__/offline-buttons.test.jsx` (`U12`, 2 assertions). Neither touches `screen-history.jsx` or its test file. Not fixed here, per the executor's SCOPE BOUNDARY rule. `src/__tests__/screen-history.test.jsx` itself is 74/74 green.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Phase 10's three requirements (HIST-07/08/09) are now fully wired end-to-end: activated status/type/search filters (10-01/10-02/10-03), the two-derived-set faceted count chain and D-04/D-15 recompute fixes (10-03), and this plan's filtered-empty-state Variant B + Clear Filters remedy, with integration coverage proving D-01/D-02/D-03/D-04/D-10/D-12/D-13/D-14/D-15 and F-03 all hold together in the fully-wired screen. No blockers. The one manual/UI-checker verification named in `10-VALIDATION.md` (the two-row filter-bar wrap at 1440×900) remains outside automated test scope by design and should be confirmed during `/gsd-verify-work`.

---
*Phase: 10-filters-search*
*Completed: 2026-07-18*

## Self-Check: PASSED

- FOUND: src/screen-history.jsx
- FOUND: src/__tests__/screen-history.test.jsx
- FOUND: .planning/phases/10-filters-search/10-04-SUMMARY.md
- FOUND: commit 1e9212a (Task 1)
- FOUND: commit 540bfda (Task 2)
- FOUND: commit 8e7d94c (Task 2 extension — D-12 backstop)
