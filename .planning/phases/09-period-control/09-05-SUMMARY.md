---
phase: 09-period-control
plan: 05
subsystem: ui
tags: [react, history-screen, popover, i18n, tanstack-query]

requires:
  - phase: 09-period-control/09-01
    provides: validateCustomRange, customRangeToQuery, MAX_RANGE_DAYS, formatDateRange in history-utils.js
  - phase: 09-period-control/09-02
    provides: h_range_start/h_range_end/h_range_apply/h_range_cap_message i18n keys
  - phase: 09-period-control/09-04
    provides: selectedPeriod/settledPeriod state split, periodLabel()/periodPhrase() lookup helpers, live Today/7/30 pills
provides:
  - CustomRangePopover component (fields, D-11 guardrails, Apply gated by validateCustomRange)
  - Custom pill wired to the popover — D-03 applied-range label, D-04 clear-on-preset
  - custom range flowing through the identical range-memo/useHistoryOrders seam the presets use
affects: [10-filters-search, 11-reprint-export]

tech-stack:
  added: []
  patterns:
    - "CustomRangePopover holds both dates in local state (D-02); nothing fetches until Apply, and validateCustomRange gates both the disabled attribute (render time) and the click handler (Apply time)"
    - "selectedPeriod extended to a discriminated shape: { id } for a preset, { id: 'custom', customRange: {from,to} } once applied — handleApplyCustomRange is the ONLY call site that produces the customRange field, so the pill and the fetched range cannot diverge by construction"
    - "FilterBar wraps only the Custom pill button in position:relative (not the whole segmented-control group) and unmounts CustomRangePopover on close so its local state is always fresh on reopen (D-04)"

key-files:
  created: []
  modified:
    - src/screen-history.jsx
    - src/__tests__/screen-history.test.jsx

key-decisions:
  - "CustomRangePopover is exported (not truly module-private, despite the plan's <artifacts> label) so Task 1's tests can render and exercise it in isolation ahead of Task 2's FilterBar wiring — same testability precedent as historyStatusMeta's export in 09-02"
  - "periodLabel()/periodPhrase()'s pre-existing 'custom' branches (written but unreachable in 09-04) now read period.customRange instead of flat period.from/period.to, matching the { id, customRange } shape this plan introduces; periodLabel falls back to t('h_period_custom') when customRange is absent"
  - "Rule-1 fix: EmptyBlock previously appended a trailing '.' unconditionally; the Romanian abbreviated month format ('mar.') already ends in a period for a custom range's end date, so the naive concatenation produced a double-dot ('17 mar..') the first time this plan's custom branch exercised EmptyBlock's sentence composition. Fixed to skip the extra period when the phrase already ends with one."

requirements-completed: []
# NOT marking HIST-04 complete — Task 3 (blocking human-verify checkpoint) is PENDING. See
# "## Human Checkpoint — PENDING" below. This plan's coverage claims Tasks 1-2 only.

coverage:
  - id: D1
    description: "CustomRangePopover renders two native date inputs (blank on open) and an Apply button, gated by validateCustomRange at both render time (disabled attribute) and click time (early return); D-11 min/max guardrails recompute as fields change, sourced from history-utils.js's MAX_RANGE_DAYS (no re-literalled 366); outside-click and Escape dismiss without applying; both document listeners are cleaned up on unmount"
    requirement: "HIST-04"
    verification:
      - kind: unit
        ref: "src/__tests__/screen-history.test.jsx#CustomRangePopover popover (09-05)"
        status: pass
    human_judgment: false
  - id: D2
    description: "The Custom pill toggles the popover (position:relative wraps only that pill); applying a range fetches through the identical useHistoryOrders({from,to}) seam the presets use (one fetch path, no 'custom' sentinel in the query key); the pill shows the D-14-formatted applied range and adopts selected styling (D-03); a preset click clears the custom range and a reopened popover starts blank (D-04); no reachable state shows a pill range that isn't the live fetched range"
    requirement: "HIST-04"
    verification:
      - kind: unit
        ref: "src/__tests__/screen-history.test.jsx#Custom range popover wiring — D-03/D-04 (09-05)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Live-API/live-platform verification: the native date picker's real calendar chrome on this machine's macOS (RESEARCH Pitfall 3, pre-Big-Sur WebKit degradation risk), the 366-day worst-case fetch timing (P7 D-03's deferred 'measure against real data' trigger for virtualization), and whether the D-05 dimmed-loading state reads as loading vs. disabled — none of these are answerable by a mocked unit test"
    requirement: "HIST-04"
    verification: []
    human_judgment: true
    rationale: "Task 3 is a blocking human-verify checkpoint (gate=\"blocking\") requiring the live SiteCare API, a real macOS calendar picker, and a human timing/perception judgment. This is PENDING — see the Human Checkpoint section below. HIST-04 cannot be marked complete until this returns."

duration: ~11min (Tasks 1-2 only; Task 3 checkpoint pending)
completed: 2026-07-17
status: pending-human-checkpoint
---

# Phase 9 Plan 5: Custom-Range Popover Summary (DRAFT — Task 3 checkpoint pending)

**CustomRangePopover — two native date inputs, D-11 min/max guardrails sourced from `MAX_RANGE_DAYS`, an Apply button gated by `validateCustomRange` at both render and click time — wired to the Custom pill so an applied range fetches through the same seam as the Today/7/30 presets and clears on any preset click (D-03/D-04). Tasks 1-2 are implemented, tested, and committed; Task 3's blocking human-verify checkpoint (live API, native picker chrome, 366-day timing) has NOT yet run.**

> **This is a DRAFT summary.** HIST-04 and the phase are NOT complete. Do not treat this document
> as phase-closing until the "Human Checkpoint" section below is filled in and the plan/phase are
> re-finalized in a follow-up pass.

## Performance

- **Duration:** ~11 min (Tasks 1-2 only)
- **Started:** ~2026-07-17T23:31:49+03:00 (immediately after 09-04's completion commit)
- **Completed (Tasks 1-2):** 2026-07-17T23:42:56+03:00
- **Tasks:** 2 of 3 (Task 3 — blocking human-verify checkpoint — is PENDING, not executed)
- **Files modified:** 2 (`src/screen-history.jsx`, `src/__tests__/screen-history.test.jsx`)

## Accomplishments

- **Task 1 — `CustomRangePopover` component:** two native `<input type="date">` fields holding
  local state (D-02, nothing fetches until Apply), field labels (`h_range_start`/`h_range_end`),
  a cap-message slot (`h_range_cap_message`, shown only for the `'too-long'` validation reason),
  and an Apply button (`h_range_apply`, `.btn-primary`) disabled via `validateCustomRange`'s result
  at both render time and inside the click handler. Panel chrome (`position: absolute`,
  `top: calc(100% + 6px)`, `#fff`/`hsl(120 10% 88%)` border/`10px` radius/
  `0 4px 16px rgba(0,0,0,0.12)` shadow/`zIndex: 50`, `280px` × `16px` padding) is copied verbatim
  from `shell.jsx:148-150`, the app's only other popover. Outside-click and `Escape` dismissal
  reuse `shell.jsx:20-28`'s effect shape, extended with an Escape `keydown` listener per UI-SPEC;
  both listeners share one `useEffect` cleanup.
- D-11 guardrails: the End input's `max` is today; the Start input's `max` is the chosen End (or
  today); the Start input's `min`, once End is set, is `End - (MAX_RANGE_DAYS - 1)` days (imported
  from `history-utils.js`, never re-literalled as `366` in this file — confirmed by grep). Because
  native inputs accept typed values that bypass `min`/`max`, `validateCustomRange` re-runs inside
  the Apply click handler as the authoritative gate.
- **Task 2 — wiring:** `selectedPeriod` extends from `{ id }` to
  `{ id: 'custom', customRange: {from, to} }` once a range is applied. The range `useMemo` resolves
  the custom branch to `selectedPeriod.customRange` and falls through to `getPresetRange` for
  presets — one `useHistoryOrders(...)` call site for all four periods, confirmed by grep. The
  Custom pill's own `<div style={{position:'relative'}}>` wraps only that button (not the whole
  segmented-control group); clicking it toggles a local `rangeOpen` state in `FilterBar`, and the
  popover unmounts entirely when closed so its blank local state is always fresh on reopen (D-04).
- D-03: once applied, the Custom pill's label is `formatDateRange(...)` via the same `periodLabel()`
  helper the tile sub-label reads (D-12), and the pill adopts the standard selected styling with the
  `chevDown` icon still visible. D-04: any preset click sets `selectedPeriod` to `{ id }` with no
  `customRange` field — the Custom pill reverts to the static `h_period_custom` label and a
  reopened popover starts blank, with `handleApplyCustomRange` as the sole call site that ever adds
  a `customRange`, so the pill cannot advertise a range the fetch isn't showing (T-09-19).
- **Rule 1 auto-fix:** `EmptyBlock`'s sentence composition (`${prefix} ${phrase}.`) previously
  appended a trailing period unconditionally. The Romanian abbreviated month format (`mar.`) already
  ends in a period for a custom range's end date, so applying a range like 2026-03-03..2026-03-17
  produced `"...17 mar.."` (double-dot) — a real, previously-undetected bug because no test exercised
  `EmptyBlock` with a phrase ending in punctuation until this plan's custom branch did. Fixed to
  append the trailing period only when the composed phrase doesn't already end with one.

## Task Commits

1. **Task 1: CustomRangePopover — fields, guardrails, Apply** - `1268334` (feat)
2. **Task 2: Wire the popover to the Custom pill — D-03 label, D-04 clearing, custom range fetch** - `9cbdd2b` (feat)

**Task 3 (checkpoint:human-verify, gate="blocking"): NOT YET RUN.** No commit exists for it — it
requires the live SiteCare API and a human observing real macOS calendar-picker chrome, 366-day
fetch timing, and D-05 dimming perception. See "Human Checkpoint — PENDING" below.

**Plan metadata commit:** deferred until the checkpoint returns (this SUMMARY is committed on its
own, as a draft, per the orchestrator's explicit instruction not to seal the plan/phase yet).

## Files Created/Modified

- `src/screen-history.jsx` — `CustomRangePopover` component (exported for testability), its
  `toDateInputValue`/`minStartFor` helper functions, `periodLabel`/`periodPhrase`'s `'custom'`
  branches updated to read `period.customRange`, `HistoryScreen`'s `range` memo/`selectedPeriod`
  state/`handleApplyCustomRange`, `FilterBar`'s Custom-pill wrapper + `rangeOpen` state, and the
  `EmptyBlock` double-period fix.
- `src/__tests__/screen-history.test.jsx` — 26 new tests: 14 in `CustomRangePopover popover (09-05)`
  (isolated component behavior — fields, guardrails, Apply, dismissal, unmount cleanup) and 12 in
  `Custom range popover wiring — D-03/D-04 (09-05)` (popover open/close via the pill, apply-refetches
  through the shared seam, D-03 label, D-04 clearing, adjacency, pill/fetched-range agreement
  invariant). All 60 tests in the file pass, on top of the 34 pre-existing tests which continue to
  pass unmodified.

## Decisions Made

See `key-decisions` in the frontmatter — the export of `CustomRangePopover` for testability, the
`customRange`-shaped `'custom'` branch in `periodLabel`/`periodPhrase`, and the `EmptyBlock`
double-period fix.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] `EmptyBlock` double-punctuation on Romanian custom-range empty state**
- **Found during:** Task 2, while verifying the D-13 empty-state behavior test
  ("After applying, the empty-state phrase for a zero-order custom range reads 'Nicio comandă în
  intervalul 3 mar. – 17 mar.'")
- **Issue:** `EmptyBlock` composed the main line as `` `${t('h_empty_prefix')} ${periodPhrase(...)}.` ``
  — always appending a trailing period. `formatDateRange`'s Romanian short-month formatting
  (`Intl.DateTimeFormat('ro-RO', { month: 'short' })`) renders `"mar."` with its own trailing period
  for month abbreviations, so the composed sentence rendered `"...17 mar.."` (double-dot) instead of
  the single-dot form the plan's own behavior spec and UI-SPEC's Copywriting Contract both show. This
  is a pre-existing defect in 09-04's `EmptyBlock`, first exposed by this plan because no earlier test
  exercised `EmptyBlock` with a phrase that itself ends in punctuation — the day/7/30 period phrases
  never do.
- **Fix:** `EmptyBlock` now composes the phrase once, then appends the trailing period only if the
  phrase doesn't already end with one (`phrase.endsWith('.') ? ... : ... + '.'`).
- **Files modified:** `src/screen-history.jsx`
- **Verification:** `src/__tests__/screen-history.test.jsx#Custom range popover wiring...#after applying, the empty-state phrase reads the composed custom-range sentence (D-13)` — asserts the exact single-period string. Full existing D-12/D-13 describe block (today/7/30 empty states, which don't end in punctuation) continues to pass unmodified, confirming no regression to the non-custom periods.
- **Committed in:** `9cbdd2b` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 — bug)
**Impact on plan:** Necessary for correctness of the D-13 empty-state contract this plan is the
first to exercise with a punctuation-ending phrase. No scope creep — fix is contained to
`EmptyBlock`'s sentence-composition line in the plan's own file.

## Issues Encountered

None beyond the Rule-1 fix documented above.

## User Setup Required

None — no external service configuration required for Tasks 1-2. Task 3's checkpoint requires the
live SiteCare API, which is an existing, already-configured connection (no new setup).

## Human Checkpoint — PENDING

**Status: NOT YET RUN.** Task 3 is a `checkpoint:human-verify` gate with `gate="blocking"` per
`09-05-PLAN.md`. It requires a human to run `npm run tauri dev` against the live SiteCare API and
report on three items that cannot be verified by a mocked unit test:

1. **Native date picker chrome** — does a real OS calendar open when clicking a date field on this
   machine's macOS, or does it degrade to a bare text box (RESEARCH Pitfall 3: WebKit renders no
   calendar affordance pre-Safari 14.1 / macOS 11 Big Sur, and `tauri.conf.json` pins no
   `minimumSystemVersion`)?
   **Answer:** _(pending)_

2. **The 366-day worst-case fetch timing** — `P7 D-03` deferred virtualization pending a real
   measurement against live data; a 366-day range is ~12x the 30-day default against an unpaginated,
   unvirtualized list. Roughly how long did rows take to appear, did the spinner keep animating
   throughout, and did the app feel frozen at any point?
   **Answer:** _(pending)_

3. **Does the D-05 dimmed-loading state read as "loading" or as "disabled"?** — a perception
   judgment on a screen that renders both conventions simultaneously (0.5-opacity inert controls vs.
   0.6-opacity in-flight rows).
   **Answer:** _(pending)_

The full verification script (steps A-E, covering preset switching, dimming perception, custom-range
Apply flow, the 366-day worst case, and scope confirmation that Phase 10/11 controls remain inert)
is recorded verbatim in `09-05-PLAN.md`'s Task 3 `<how-to-verify>` block. This SUMMARY will be
updated with the three answers, and the plan/phase finalized (SUMMARY frontmatter `status`,
`requirements-completed`, STATE.md, ROADMAP.md, REQUIREMENTS.md) in a follow-up pass once the human
checkpoint returns a resume signal.

## Next Phase Readiness

**NOT READY.** HIST-04 remains open pending Task 3. Do not begin Phase 10 planning/execution or
mark Phase 9 complete until this checkpoint returns and the plan is finalized.

- Tasks 1-2's code, tests, and commits are complete and green (`npx vitest run` — 397 passed / 3
  pre-existing unrelated failures, documented in `deferred-items.md`).
- `HIST-04` is functionally complete in code (all four periods live, custom-range Apply flow fully
  wired) but not yet human-verified against the live API per this plan's blocking checkpoint.

---
*Phase: 09-period-control*
*Status: DRAFT — Tasks 1-2 complete, Task 3 (blocking human-verify) PENDING*
</content>
