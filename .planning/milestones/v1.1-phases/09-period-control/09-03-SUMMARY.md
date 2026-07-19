---
phase: 09-period-control
plan: 03
subsystem: api
tags: [tanstack-query, react-query-v5, keepPreviousData, testing-library, vitest]

# Dependency graph
requires:
  - phase: 07-history-screen-foundation
    provides: useHistoryOrders (HIST-02/HIST-03) with a mount-frozen 30-day range, and history-utils.js range builders (getLast30DaysRange)
provides:
  - useHistoryOrders({ from, to }) — a parameterized hook that fetches whatever range its caller supplies
  - placeholderData keepPreviousData wired so a range switch keeps the previous rows on screen with isPlaceholderData true
  - A rewritten test file with 15 passing tests (was 11), covering range-change refetch, A→B→A cache reuse, and the keepPreviousData placeholder window
affects: [09-04-screen-history-period-ui, 10-filters-search]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Range-parameterized query hook: the hook computes no range of its own; the caller resolves { from, to } once per state transition and passes it in, preserving query-key stability discipline one level up from where it used to live"

key-files:
  created: []
  modified:
    - src/use-history-orders.js
    - src/__tests__/use-history-orders.test.js

key-decisions:
  - "Assumption-delta `promote` (chosen: getLast30DaysRange() constant -> caller-supplied { from, to } parameter): the general range representation becomes the hook's only contract; add-alongside (keeping a zero-arg default overload) was explicitly rejected because it would have preserved the frozen-at-mount trap this plan exists to remove"
  - "queryKey, cache-root separation from ['orders'], the SDK error-unwrap discipline, and staleTime: 30_000 all preserved verbatim per RESEARCH Pitfall 4's warning against folding a preset id or 'custom' sentinel into the key"

patterns-established:
  - "Query-key stability discipline moves from the hook (useState lazy initializer) to the caller: any component using this hook must resolve its range once per state transition, never inline in the render body"

requirements-completed: [HIST-04]

coverage:
  - id: D1
    description: "useHistoryOrders takes a caller-supplied { from, to } and computes no range of its own; the useState lazy initializer, its unused setter, and the history-utils.js import are gone"
    requirement: "HIST-04"
    verification:
      - kind: unit
        ref: "src/__tests__/use-history-orders.test.js#useHistoryOrders — calls the admin endpoint only (HIST-02) > passes the caller-supplied range to the SDK verbatim, with no transformation (HIST-04)"
        status: pass
    human_judgment: false
  - id: D2
    description: "placeholderData: keepPreviousData is set — during a range switch the hook returns the previous range's data with isPlaceholderData true rather than undefined"
    requirement: "HIST-04"
    verification:
      - kind: unit
        ref: "src/__tests__/use-history-orders.test.js#useHistoryOrders — keepPreviousData holds the previous range as placeholder data (D-05) > mid-switch, data is still the previous range and isPlaceholderData is true"
        status: pass
    human_judgment: false
  - id: D3
    description: "Changing { from, to } triggers exactly one new fetch; an identical-valued new object literal triggers none; a range already fetched this session is served from cache (A -> B -> A, still 2 calls)"
    requirement: "HIST-04"
    verification:
      - kind: unit
        ref: "src/__tests__/use-history-orders.test.js#useHistoryOrders — range change refetches (HIST-04) > rerendering with a genuinely different range issues exactly one additional call, with the new range"
        status: pass
      - kind: unit
        ref: "src/__tests__/use-history-orders.test.js#useHistoryOrders — stable query key across re-renders > rerender with an identical-valued new object literal does not trigger a second fetch"
        status: pass
      - kind: unit
        ref: "src/__tests__/use-history-orders.test.js#useHistoryOrders — cache reuse on return (D-08 / RESEARCH Pitfall 4) > switching A -> B -> A against one QueryClient serves the third render from cache: still 2 calls"
        status: pass
    human_judgment: false
  - id: D4
    description: "enabled gates on client AND from AND to; a hook called with an unresolved range issues no request and does not throw"
    requirement: "HIST-04"
    verification:
      - kind: unit
        ref: "src/__tests__/use-history-orders.test.js#useHistoryOrders — disabled until the range resolves (HIST-04) > called with { from: undefined, to: undefined } issues no call and does not throw"
        status: pass
    human_judgment: false

duration: ~10min
completed: 2026-07-17
status: complete
---

# Phase 9 Plan 3: Parameterize useHistoryOrders + keepPreviousData Summary

**useHistoryOrders now fetches a caller-supplied { from, to } instead of a mount-frozen 30-day window, with `placeholderData: keepPreviousData` so period switches keep prior rows visible instead of blanking.**

## Performance

- **Duration:** ~10 min
- **Completed:** 2026-07-17T20:13:30Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- `useHistoryOrders({ from, to })` — the `useState` lazy initializer, its unused setter, and the `getLast30DaysRange`/`history-utils.js` import are all gone; the hook now computes no range of its own and imports no React state primitive
- `placeholderData: keepPreviousData` (v5 API — the removed v4 boolean form does not appear anywhere in source) wired into `useQuery`, and `enabled` widened to `!!client && !!from && !!to`
- Every existing assertion (endpoint shape, unwrap, mapping, sort, error branches, null-client disable) updated to pass an explicit range with no change to what it proves
- Two obsolete-premise tests rewritten rather than deleted: "from/to span the same 30-day window" now proves the hook passes the caller's range to the SDK verbatim; "stable query key across re-renders" now proves the same guarantee against a caller-supplied stable range
- Four new tests added: range-change refetch, A→B→A cache reuse against one shared `QueryClient` (D-08 — the resolved range, not a period id, is the cache identity), `keepPreviousData` placeholder window (D-05), and disabled-until-resolved
- Test count for this file: 15 passing (was 11 pre-plan) — a net gain of 4, satisfying the plan's "at least 4 more tests" acceptance criterion

## Task Commits

Each task was committed atomically:

1. **Task 1: Parameterize the hook + keepPreviousData** - `6714fd2` (feat)
2. **Task 2: Update every test call site + add range-switch and cache-reuse tests** - `7c2b88b` (test)

**Plan metadata:** pending (this commit)

## Files Created/Modified
- `src/use-history-orders.js` - Signature changed to `useHistoryOrders({ from, to })`; no `useState`, no `history-utils.js` import; `placeholderData: keepPreviousData` added; `enabled` widened; queryKey/cache-root/unwrap-discipline/staleTime preserved verbatim; header comment rewritten to record that the caller now owns range-resolution stability
- `src/__tests__/use-history-orders.test.js` - Every call site passes an explicit range via a shared `FIXTURE_RANGE` (endpoint/unwrap/mapping/sort tests) or distinct `RANGE_A`/`RANGE_B` fixtures (range-identity tests); two tests rewritten against the new seam; four new tests added

## Decisions Made
- **Assumption-delta `promote` (chosen: constant → parameter).** `getLast30DaysRange()` was a derived constant computed inside the hook with no caller input; Phase 9 makes the range a chosen parameter. The general `{ from, to }` representation becomes the hook's primary and only contract — `add-alongside` (keeping a zero-argument default overload) was explicitly rejected because it would preserve the exact frozen-at-mount trap this plan exists to remove, and it would leave two ways to ask for the same data, one of which silently ignores D-06's label-follows-data requirement.
- **Preserved verbatim, unchanged:** `queryKey: ['history-orders', from, to]` (no preset id or `'custom'` sentinel folded in, per RESEARCH Pitfall 4), the cache-root separation from `['orders']`, the SDK `result.error`/`result.data` unwrap discipline, and `staleTime: 30_000`.

## Deviations from Plan

None - plan executed exactly as written. All acceptance-criteria greps for both tasks pass; the hook and its own test file are fully green.

**One expected, plan-documented exception (not a deviation):** `src/screen-history.jsx:216` still calls `useHistoryOrders()` with zero arguments. This is the plan's own boundary — `screen-history.jsx` is explicitly out of this plan's `files_modified` scope and is owned by `09-04` (`depends_on: [09-01, 09-02, 09-03]` per the phase's plan map). The plan's task 2 acceptance criteria literally ask for zero zero-argument call sites anywhere in `src/`, but the plan's own `<verification>` section and this wave's execution context both explicitly instruct against touching `screen-history.jsx` here and call the resulting `screen-history.test.jsx` red state "expected." Recording this discrepancy rather than silently resolving it: `find src -name "*.js" -o -name "*.jsx" | xargs grep -c "useHistoryOrders()"` still reports one match (`src/screen-history.jsx`), and it is intentionally left for `09-04`.

## Issues Encountered

None specific to this plan's scope. `screen-history.jsx` calling the hook with no arguments means it currently issues no fetch at all (`enabled` is now `false`, since `from`/`to` are `undefined`) — but `screen-history.test.jsx` fully mocks `useHistoryOrders` via `vi.mock('../use-history-orders.js', () => ({ useHistoryOrders: vi.fn() }))`, so this plan's signature change has zero effect on that suite's pass/fail state.

## Test Counts (as required by plan `<output>`)

- **Pre-plan test count for `use-history-orders.test.js`:** 11 (all passing before this plan)
- **Post-plan test count:** 15 (all passing)
- **Full-suite state (`npx vitest run`) at this wave:** 4 test files / 7 tests fail, 26 files / 346 tests pass. All 7 failures are pre-existing/deferred and unrelated to this plan's changes, matching `.planning/phases/09-period-control/deferred-items.md` exactly:
  - `src/__tests__/build-pipeline.test.js` × 1 (pre-existing, unrelated to Phase 9)
  - `src/__tests__/offline-buttons.test.jsx` × 2 (pre-existing `QueryClientProvider` scaffolding gap in `OrdersScreen`, unrelated to Phase 9)
  - `src/__tests__/screen-history.test.jsx` × 2 and `src/__tests__/app-history-route.test.jsx` × 2 — all four assert the literal i18n string removed by `09-02`'s rename (`'Nicio comandă în ultimele 30 de zile.'` → `h_empty_prefix` composed string, D-13); these are `screen-history.jsx`'s consumer-side assertions, explicitly owned by `09-04` per the deferred-items log
  - None of these seven failures reference `use-history-orders.js` or `use-history-orders.test.js`; this plan introduced zero new failures and closed zero pre-existing ones (by design — out of scope)

## Next Phase Readiness

- The `{ from, to }` seam this plan built is exactly what `09-04` needs: `screen-history.jsx` can now call `useHistoryOrders(resolvedRange)` with a `useMemo`'d range and read `isPlaceholderData`/`isFetching` off the unwrapped query result for D-05's dimming and D-06's settled-period label tracking.
- `09-04` must update the two `screen-history.test.jsx` empty-state assertions and the two `app-history-route.test.jsx` assertions to the new `h_empty_prefix`-composed string (D-13) as part of updating the `EmptyBlock` component — already flagged in `deferred-items.md` from `09-02`, reconfirmed here.
- `09-04` must add its own `useMemo` test pinning the caller-side stability discipline this plan's header comment now documents (T-09-08's mitigation is split across this plan and `09-04`).
- No blockers for `09-04`.

---
*Phase: 09-period-control*
*Completed: 2026-07-17*

## Self-Check: PASSED

- FOUND: src/use-history-orders.js
- FOUND: src/__tests__/use-history-orders.test.js
- FOUND commit: 6714fd2
- FOUND commit: 7c2b88b
