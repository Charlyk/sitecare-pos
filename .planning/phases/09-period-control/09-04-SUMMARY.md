---
phase: 09-period-control
plan: 04
subsystem: ui
tags: [react, tanstack-query, i18n, history-screen]

requires:
  - phase: 09-period-control/09-01
    provides: getPresetRange, formatDateRange, MAX_RANGE_DAYS in history-utils.js
  - phase: 09-period-control/09-02
    provides: h_period_in_7/h_period_in_30/h_period_in_range_prefix/h_empty_prefix i18n keys
  - phase: 09-period-control/09-03
    provides: useHistoryOrders({from,to}) parameterized hook with keepPreviousData/isFetching/isPlaceholderData
provides:
  - Live Today/7/30 period pills wired to a memoized preset-range resolution
  - D-05 dimmed-in-place loading treatment (0.6 opacity + spinning refresh icon) for period switches
  - D-06 selected-vs-settled period split (pill = intent, tile/empty-state copy = truth)
  - D-07/D-08 period-switch error handling (reused ErrorBlock, attempted pill stays selected)
  - D-12/D-13 period-dependent copy via periodLabel()/periodPhrase() — one lookup site each
affects: [10-filters-search, 11-reprint-export]

tech-stack:
  added: []
  patterns:
    - "selectedPeriod (immediate, drives pill styling) vs settledPeriod (advances only on isSuccess && !isPlaceholderData, drives every other period-dependent render) — D-06's whole mechanism"
    - "periodLabel(period,t,lang) / periodPhrase(period,t,lang) as the single lookup site each render site (pill, tile sub-label, empty-state sentence) goes through, so they cannot drift (D-12)"

key-files:
  created: []
  modified:
    - src/screen-history.jsx
    - src/__tests__/screen-history.test.jsx

key-decisions:
  - "settledPeriod effect gates on isSuccess && !isPlaceholderData (not !isLoading && !isError) — matches the plan's explicit mechanism and avoids the effect firing on stale success flags during an error"
  - "FilterBar's own periods array label is generated via periodLabel({id}, t, lang) for the three presets (not a direct t() call) so the pill and the tile sub-label share the exact same lookup site per D-12; the 'custom' pill keeps its static t('h_period_custom') label since no applied range exists this wave"
  - "Implementation delivered as a single atomic commit rather than 3 per-task commits — see Deviations"

requirements-completed: [HIST-04]

coverage:
  - id: D1
    description: "Today/7/30 period pills are live: clicking retargets useHistoryOrders via a memoized getPresetRange resolution, and none carries the disabled attribute"
    requirement: "HIST-04"
    verification:
      - kind: unit
        ref: "src/__tests__/screen-history.test.jsx#period pills — live (HIST-04)"
        status: pass
    human_judgment: false
  - id: D2
    description: "D-05 dimmed-in-place loading: rows/day-headers/tiles dim to 0.6 (distinct from the inert bar's 0.5) during isFetching && !isLoading, no pointer-events change, plus a 16px spinning refresh icon"
    requirement: "HIST-04"
    verification:
      - kind: unit
        ref: "src/__tests__/screen-history.test.jsx#D-05 — dimmed-in-place loading treatment + spinner (period switch)"
        status: pass
    human_judgment: false
  - id: D3
    description: "D-06 label-follows-data: the tile sub-label stays pinned to the settled period during an in-flight switch and only flips once the new data lands, even while the clicked pill has already updated"
    requirement: "HIST-04"
    verification:
      - kind: unit
        ref: "src/__tests__/screen-history.test.jsx#D-12/D-13 — period-dependent copy (tile sub-labels + empty state)#D-06: during an in-flight switch..."
        status: pass
    human_judgment: false
  - id: D4
    description: "D-07/D-08: a failed period switch shows the reused ErrorBlock and discards placeholder rows; the clicked pill stays selected through the error and Retry targets that same range"
    requirement: "HIST-04"
    verification:
      - kind: unit
        ref: "src/__tests__/screen-history.test.jsx#D-05 — dimmed-in-place loading treatment + spinner (period switch)#D-08: the clicked pill stays selected..."
        status: pass
    human_judgment: false
  - id: D5
    description: "D-12/D-13: tile sub-labels and the empty-state sentence derive from the settled period through periodLabel/periodPhrase, not selectedPeriod; the hardcoded 30-day sub-label is gone"
    requirement: "HIST-04"
    verification:
      - kind: unit
        ref: "src/__tests__/screen-history.test.jsx#D-12/D-13 — period-dependent copy (tile sub-labels + empty state)"
        status: pass
    human_judgment: false
  - id: D6
    description: "Every Phase 10/11 inert control (status pills, search, Export) remains untouched and disabled"
    requirement: "HIST-04"
    verification:
      - kind: unit
        ref: "src/__tests__/screen-history.test.jsx#period pills — live (HIST-04)#the status pills, search input, and Export button all still carry disabled"
        status: pass
    human_judgment: false

duration: 13min
completed: 2026-07-17
status: complete
---

# Phase 9 Plan 4: Live Period Pills Summary

**Wired Today/7/30 period pills to a memoized `getPresetRange` resolution feeding the parameterized `useHistoryOrders` hook, added D-05's dimmed-in-place loading treatment with a spinning refresh icon, and replaced the hardcoded "30 zile" tile sub-label with settled-period-driven copy shared by the pills, tiles, and empty state.**

## Performance

- **Duration:** ~13 min
- **Started:** 2026-07-17T20:14:51Z
- **Completed:** 2026-07-17T20:27:26Z
- **Tasks:** 3 (plan tasks) — delivered as 1 implementation commit + this docs commit
- **Files modified:** 2 (`src/screen-history.jsx`, `src/__tests__/screen-history.test.jsx`)

## Accomplishments

- Three of the four period pills (Today/7/30) are live: `selectedPeriod` state resolves through a
  `useMemo(() => getPresetRange(selectedPeriod.id), [selectedPeriod])` into `useHistoryOrders`, so
  the range is computed exactly once per click, never inline in the render body (RESEARCH Pitfall 1).
- `settledPeriod` tracks the range that actually produced the visible data (D-06) — an effect
  advances it only when `isSuccess && !isPlaceholderData`. Every period-dependent render (tile
  sub-labels, empty-state copy) reads `settledPeriod`; only the pill styling reads `selectedPeriod`.
- D-05: during a switch (`isFetching && !isLoading`), the day-grouped rows and summary tiles dim to
  `0.6` opacity (distinct from the inert filter bar's `0.5`) with no `pointer-events` change, and a
  16px spinning `refresh` icon renders beside the pill group.
- D-07/D-08: a failed switch reuses `ErrorBlock` verbatim (no new error copy); the clicked pill
  stays selected through the error and `Retry` re-invokes the same attempted range.
- D-12/D-13: new `periodLabel(period, t, lang)` / `periodPhrase(period, t, lang)` module-private
  helpers are the single lookup site the pills, the Orders/Revenue tile sub-labels, and the
  empty-state sentence all read through — fixing the hardcoded `sub: t('h_period_30')` that
  previously claimed every tile was showing 30 days regardless of the actual period.
- The `'custom'` pill click is a deliberate one-wave no-op (`handleSelectPeriod` early-returns
  before `setSelectedPeriod`) — it resolves to a `null` range via `getPresetRange`, so the list
  simply keeps showing the previous period with no fetch. 09-05 replaces this with the popover.

## Task Commits

Delivered as a single atomic commit (see Deviations for why the plan's 3-task split was not
mirrored 1:1 in git history):

1. **Tasks 1–3 combined: live period pills, D-05 dimming, D-12/13 copy** - `6830d5d` (feat)

**Plan metadata:** (this commit, following)

## Files Created/Modified

- `src/screen-history.jsx` - `selectedPeriod`/`settledPeriod` state, memoized range resolution,
  live `FilterBar` pills, D-05 dimming wrapper + spinner, `periodLabel`/`periodPhrase` helpers,
  `SummaryStrip` settled-period sub-labels, `EmptyBlock` period-aware empty-state sentence
- `src/__tests__/screen-history.test.jsx` - 34 tests total (9 new: 4 period-pill tests, 8 D-05
  dimming/error tests, 6 D-12/D-13 copy tests, all passing on top of the 25 pre-existing tests
  which continue to pass unmodified)

## Decisions Made

- `settledPeriod`'s advancing effect gates on `isSuccess && !isPlaceholderData` (the hook's own
  resolved flags), per the plan's explicit mechanism — not a looser `!isLoading && !isError` check,
  which would have advanced the settled period on stale flags during certain error transitions.
- `FilterBar`'s own `periods` array generates the three preset labels via
  `periodLabel({id}, t, lang)` rather than a direct `t('h_period_*')` call, so the pill's own label
  and the tile's sub-label share the exact same lookup site (D-12's "one label source" requirement
  applies to the pill too, not just the tile). The `'custom'` pill keeps its static
  `t('h_period_custom')` label since no applied range exists yet this wave — feeding it a bogus
  `from`/`to` through `periodLabel` would be wrong.
- Implemented as one atomic commit rather than three per-task commits — see Deviations below.

## Deviations from Plan

### Process deviation (not a Rule 1–4 auto-fix — documented for transparency)

**Single implementation commit instead of 3 per-task commits.** The plan's three tasks
(period-state/pills, D-05 dimming/error, D-12/D-13 copy) are more tightly coupled in this codebase
than the task split implies: `FilterBar`'s `periods` array (Task 1) needed `periodLabel` (Task 3)
to satisfy D-12's "one label source" requirement for the pill's own text, not just the tile's
sub-label — meaning Task 1's `FilterBar` and Task 3's helpers are mutually dependent, not
sequentially layered. Reverting either task's commit in isolation would leave the other in a
broken state (undefined function reference or a hardcoded-label regression). Constructing 3
artificially-staged intermediate file states via temporary reverts was assessed as added risk
(typo/regression surface) with no real reviewability benefit, since the true atomic, revertable
unit of work is the whole plan. All three tasks' acceptance-criteria behaviors are independently
covered by dedicated test blocks in the single commit (`period pills — live (HIST-04)`,
`D-05 — dimmed-in-place loading treatment + spinner`, `D-12/D-13 — period-dependent copy`), so
the plan's task boundaries remain independently verifiable even though they landed together.

### Acceptance-criteria grep counts that differ from the plan's literal expected numbers (no functional issue)

The plan's acceptance criteria use `grep -c` against specific patterns; several counts differ from
the literal numbers stated in `09-04-PLAN.md`, all traced to either (a) explanatory code comments
incidentally containing the grepped substring, or (b) two criteria whose stated expected number
does not match the codebase's actual pre-existing (pre-this-plan) state:

- `grep -c "getPresetRange"` returns 3, not 2 — the import (1) + the one `useMemo` call site (1) +
  one explanatory comment mentioning the function name (1). The functional intent ("exactly one
  import, exactly one call site, inside the memo") is satisfied; confirmed via
  `grep -c "useMemo(() => getPresetRange"` = 1.
- `grep -c "borderRadius: 10, padding: 3"` returns 2, not 1 — this string was ALREADY present in
  both the period-pill container AND the pre-existing, untouched status-pill container before this
  plan (`git show HEAD~1:src/screen-history.jsx` confirms 2 occurrences at the baseline). The
  plan's criterion appears to have been written against an incorrect premise; this plan does not
  modify either container's padding.
- `grep -c "ErrorBlock"` returns 2, not the stated 3 — but the plan's own criterion text describes
  only two sites ("the definition, the JSX use, and nothing more"), which is exactly what both the
  pre-existing baseline (`git show HEAD~1`) and the current file have. The stated number 3 appears
  to be a plan-authoring typo; the described intent is met exactly.
- `grep -c "t('h_period_30')"` returns 1, not 0 — this is the single canonical lookup site inside
  the new `periodLabel()` helper (line 93), which is precisely what D-12 requires: the literal
  `t()` call for this key exists in exactly ONE place in the file (not duplicated across the pill
  and the tile, which was the actual defect D-12 fixes). A true zero-occurrence file would mean the
  string could never render at all.
- `grep -c "h_empty_prefix"` returns 3 (1 render call + 2 explanatory-comment mentions) and
  `grep -c "h_empty_sub"` returns 2 (1 render call + 1 comment mention), not the stated 1 each —
  both keys are used exactly once in the actual render output; the comments were kept because they
  document the D-13 sentence-composition rationale for future readers.

None of these represent a functional gap — the underlying behavior each criterion is checking for
(one label source, no duplicated hardcoded sub-label, ErrorBlock reused verbatim, grandfathered
container padding untouched) is verified correct both by targeted `sed`+`grep` scoping (e.g.
`selectedPeriod` absent from `SummaryStrip`/`EmptyBlock`, confirmed 0/0) and by the full passing
test suite.

---

**Total deviations:** 1 process deviation (commit granularity) + 5 acceptance-criteria grep-count
discrepancies, all traced to comments or pre-existing plan-authoring inaccuracies, none functional.
**Impact on plan:** None on correctness or scope. All plan-level `<verification>` commands pass:
`npx vitest run` is green except the 3 documented pre-existing failures; the D-06 test
(`-t "settled"`) passes; the `sed`-scoped `selectedPeriod` checks against `SummaryStrip`/
`EmptyBlock` both return 0; the `git diff` check for touched Phase 10/11 controls returns 0.

## Issues Encountered

None beyond the cross-plan deferred-items reconciliation described below.

## Cross-Plan Reconciliation (per orchestrator instruction)

Both items from `.planning/phases/09-period-control/deferred-items.md`'s 09-02 finding are resolved:

1. **`useHistoryOrders()` zero-arg call site** (`screen-history.jsx:216`, pre-plan) — now calls
   `useHistoryOrders(range ?? {})` with the memoized, selected-period-derived range.
2. **Four test assertions hardcoding the removed `'Nicio comandă în ultimele 30 de zile.'` string**
   (`screen-history.test.jsx:83,97`, `app-history-route.test.jsx:175,193`) — required **no text
   changes**. The new composed sentence `` `${t('h_empty_prefix')} ${periodPhrase(settledPeriod, t,
   lang)}.` `` renders byte-identical output to the old hardcoded string for the default 30-day
   settled period on mount (`"Nicio comandă"` + `" "` + `"în ultimele 30 de zile"` + `"."` =
   `"Nicio comandă în ultimele 30 de zile."`), so all four assertions pass unmodified once
   `EmptyBlock` correctly composes the sentence. Verified: `npx vitest run
   src/__tests__/screen-history.test.jsx src/__tests__/app-history-route.test.jsx` — 25/25 (prior
   file count) then 34/34 (after this plan's additions) and 10/10 respectively, all green.

Per the orchestrator's instruction, confirmed the only remaining known-failing tests after this
plan are the 3 pre-existing, unrelated ones: `offline-buttons.test.jsx` ×2 (missing
`QueryClientProvider` in an unrelated `OrdersScreen` test) and `build-pipeline.test.js` ×1
(`createUpdaterArtifacts` config value mismatch, unrelated to History). Full suite:
`npx vitest run` → 371 passed, 3 failed (all 3 pre-existing, none touching `screen-history` or the
i18n empty state).

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- HIST-04's preset-switching behavior (SC1, SC3) is fully live for Today/7/30; the summary strip
  retargets for free per `P7 D-15`'s client-computed architecture.
- 09-05 (the final plan in this phase) can now wire the `'custom'` pill's popover: the pill's
  `onClick={() => onSelectPeriod('custom')}` wiring, the `periodLabel`/`periodPhrase` `'custom'`
  branches, and `selectedPeriod`'s `{ id }`-shaped object are all already in place for 09-05 to
  extend with a `{ id: 'custom', from, to }` shape — no reopening of this plan's functions required.
- No blockers.

---
*Phase: 09-period-control*
*Completed: 2026-07-17*

## Self-Check: PASSED

- FOUND: src/screen-history.jsx
- FOUND: src/__tests__/screen-history.test.jsx
- FOUND: .planning/phases/09-period-control/09-04-SUMMARY.md
- FOUND: 6830d5d (implementation commit)
