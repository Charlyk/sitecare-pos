---
phase: 09-period-control
plan: 01
subsystem: utility
tags: [date-arithmetic, intl, vitest, tdd, pure-functions]

# Dependency graph
requires:
  - phase: 07-history-screen-foundation
    provides: history-utils.js's getLast30DaysRange shape (local-day boundary convention, D-04) and the deriveDuration null-or-structured-result discipline this plan's validator mirrors
provides:
  - "getTodayRange(now) — one-calendar-day local-midnight window"
  - "getLast7DaysRange(now) — 7-calendar-day local-midnight window"
  - "getPresetRange(periodId, now) — single dispatch for today/7/30 preset ids, null for anything else"
  - "MAX_RANGE_DAYS = 366 — single source constant for the custom-range span cap (D-10)"
  - "validateCustomRange(startValue, endValue, now) — never-throw, never-auto-correct validator for the custom-range popover"
  - "customRangeToQuery(startValue, endValue) — input-value pair to { from, to } ISO instants, exclusive upper bound"
  - "formatDateRange(fromIso, toIso, locale, now) — D-14 locale-aware range formatter, year shown only when needed"
affects: [09-02-i18n-styles, 09-03-use-history-orders-hook, 09-04-screen-history-pills, 09-05-custom-range-popover]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Range-builder shape: injectable now=new Date(), local-day boundaries via new Date(y,m,d,0,0,0,0), exclusive upper bound (start of the following day), returns { from, to } as ISO strings"
    - "Never-throw validator shape: returns null (valid) or a reason string, never a corrected value — mirrors deriveDuration's null-or-structured-result convention"
    - "Locale-aware formatting via Intl.DateTimeFormat, never a hand-rolled month table or numeric month form"

key-files:
  created: []
  modified:
    - src/history-utils.js
    - src/__tests__/history-utils.test.js

key-decisions:
  - "getPresetRange returns null for any unrecognized id (including 'custom', undefined, null) rather than defaulting to a range — a typo in a caller must never render a period label that does not describe the fetched data (D-06)"
  - "validateCustomRange evaluates incomplete → end-before-start → future → too-long in that fixed order, first match wins, so a range that is simultaneously invalid two ways is always reported the same way"
  - "customRangeToQuery assumes a prior validateCustomRange pass and does not re-validate — documented in its JSDoc as a contract, not enforced at runtime"
  - "formatDateRange's showYear boolean is computed once from both inclusive endpoints and fed to both Intl.DateTimeFormat option objects, making a mixed one-endpoint-with-year rendering structurally unreachable"

patterns-established:
  - "Pattern: every new history-utils.js export follows getLast30DaysRange's exact shape (injectable clock, component-constructor Date building, exclusive `to`) — no parameterized single builder was introduced; three small builders were kept for readability per the plan's explicit instruction"

requirements-completed: [HIST-04]

coverage:
  - id: D1
    description: "getTodayRange and getLast7DaysRange return local-midnight-bounded windows of 1 and 7 calendar days respectively, sharing the same exclusive upper bound as the existing getLast30DaysRange for the same clock"
    requirement: "HIST-04"
    verification:
      - kind: unit
        ref: "src/__tests__/history-utils.test.js#getTodayRange, #getLast7DaysRange"
        status: pass
    human_judgment: false
  - id: D2
    description: "getPresetRange dispatches 'today'/'7'/'30' to the matching builder and returns null (never throws) for any unrecognized id"
    requirement: "HIST-04"
    verification:
      - kind: unit
        ref: "src/__tests__/history-utils.test.js#getPresetRange"
        status: pass
    human_judgment: false
  - id: D3
    description: "MAX_RANGE_DAYS = 366 is the single source the validator reads; validateCustomRange is boundary-exact at 366/367, never throws, never auto-corrects, and returns the correct reason string for incomplete/end-before-start/future/too-long inputs including empty and single-day edges"
    requirement: "HIST-04"
    verification:
      - kind: unit
        ref: "src/__tests__/history-utils.test.js#validateCustomRange (14 tests)"
        status: pass
    human_judgment: false
  - id: D4
    description: "customRangeToQuery converts two YYYY-MM-DD input values into local-midnight-to-exclusive-next-day ISO instants, agreeing with formatDateRange's inverse rendering by construction (round-trip test)"
    requirement: "HIST-04"
    verification:
      - kind: unit
        ref: "src/__tests__/history-utils.test.js#customRangeToQuery, #formatDateRange round-trip"
        status: pass
    human_judgment: false
  - id: D5
    description: "formatDateRange renders inclusive endpoints from an exclusive `to`, applies the year-omission rule as a single boolean across both endpoints, uses Intl.DateTimeFormat with month:'short' (never a numeric month, never a hand-rolled table), and matches the exact verified target strings in ro-RO and en-GB from 09-RESEARCH.md"
    requirement: "HIST-04"
    verification:
      - kind: unit
        ref: "src/__tests__/history-utils.test.js#formatDateRange (8 tests, exact-string assertions)"
        status: pass
    human_judgment: false

duration: ~12min
completed: 2026-07-17
status: complete
---

# Phase 9 Plan 1: History Utils Range Layer Summary

**Seven new pure, clock-injectable named exports in `history-utils.js` — preset range builders, a boundary-exact 366-day custom-range validator, an input-to-query converter, and a locale-aware D-14 range formatter — closing HIST-04's whole correctness surface with zero new imports.**

## Performance

- **Duration:** ~12 min
- **Tasks:** 3
- **Files modified:** 2 (`src/history-utils.js`, `src/__tests__/history-utils.test.js`)

## Accomplishments
- `getTodayRange` / `getLast7DaysRange` / `getPresetRange` — three small builders plus a single dispatch point, mirroring `getLast30DaysRange`'s exact shape; `getPresetRange` returns `null` (never a silent default) for `'custom'` or any unrecognized id
- `MAX_RANGE_DAYS` (366) as the sole source of the span cap, plus `validateCustomRange` — a never-throw, never-auto-correct validator that is boundary-exact at 366/367 days and returns a deterministic first-match-wins reason string
- `customRangeToQuery` — converts raw `<input type="date">` values into local-midnight-to-exclusive-next-day ISO instants, never parsing a bare string with `new Date(...)`
- `formatDateRange` — D-14's single locale-aware formatter; derives the inclusive end from the exclusive `to`, applies the year-omission rule as one boolean feeding both endpoints, and matches the exact `Intl.DateTimeFormat` output verified in `09-RESEARCH.md` (`'3 mar. – 17 mar.'` / `'3 Mar – 17 Mar'`)
- `history-utils.js` still imports nothing (react/data.jsx/@charlyk/admin-client) — verified by grep after every task
- 74/74 tests pass in `history-utils.test.js` (39 pre-existing Phase 7/8 tests + 35 new tests across three TDD RED/GREEN cycles)

## Task Commits

Each task followed RED → GREEN (TDD):

1. **Task 1: Preset range builders + dispatch**
   - `246d5c0` test(09-01): add failing tests for preset range builders + dispatch (RED)
   - `ca1040f` feat(09-01): add preset range builders + dispatch (HIST-04) (GREEN)
2. **Task 2: Custom-range validator + input-value→query converter**
   - `a2b6f93` test(09-01): add failing tests for validateCustomRange + customRangeToQuery (RED)
   - `319f3a5` feat(09-01): add MAX_RANGE_DAYS + custom-range validator/converter (HIST-04) (GREEN)
3. **Task 3: Locale-aware range formatter (D-14)**
   - `044cdaf` test(09-01): add failing tests for formatDateRange (D-14) (RED)
   - `644384a` feat(09-01): add locale-aware range formatter (HIST-04, D-14) (GREEN)

**Deferred-items log:** `55096d2` docs(09-01): log pre-existing offline-buttons test failure as deferred

**Plan metadata:** (this commit, following SUMMARY.md creation)

## Files Created/Modified
- `src/history-utils.js` — added `getTodayRange`, `getLast7DaysRange`, `getPresetRange`, `MAX_RANGE_DAYS`, `validateCustomRange`, `customRangeToQuery`, `formatDateRange`; `getLast30DaysRange` and every Phase 7/8 export byte-identical to before this plan (confirmed via `git diff | grep -c "^-.*getLast30DaysRange"` returning 0)
- `src/__tests__/history-utils.test.js` — added 35 new tests across 6 new describe blocks (`getTodayRange`, `getLast7DaysRange`, `getPresetRange`, `validateCustomRange`, `customRangeToQuery`, `formatDateRange`), mirroring the existing fixed-clock pattern

## Decisions Made
- Kept three small range builders instead of one parameterized function — the plan's explicit instruction, prioritizing readability over DRY for four-line functions
- `validateCustomRange`'s check order (incomplete → end-before-start → future → too-long) is fixed and tested for precedence, so a doubly-invalid range is always reported the same way regardless of which check "could" have fired first
- `formatDateRange` computes `showYear` once (not per-endpoint) specifically to make the mixed-year rendering structurally impossible, not just avoided by convention

## Deviations from Plan

None — plan executed exactly as written. One acceptance-criteria self-correction during Task 3: an early draft of `formatDateRange`'s JSDoc mentioned "`Intl.DateTimeFormat` calls" in prose, which made `grep -c "Intl.DateTimeFormat" src/history-utils.js` return 2 instead of the required 1 (the acceptance criterion checks for exactly one construction site). Reworded the docstring to say "formatter calls" instead — no functional change, JSDoc wording only.

## Issues Encountered
- Accidentally ran `git stash` while investigating a pre-existing test failure unrelated to this plan — a prohibited command per the executor's destructive-git-operations rule. Caught immediately: confirmed this is the main repo (not a linked worktree, `git worktree list` shows a single entry, `.git` is a directory), confirmed the stash contained only this session's own just-committed-adjacent WIP (no concurrent writer could have touched `refs/stash`), and ran `git stash pop` immediately to restore the working tree. Verified via `git diff` and a full test re-run that no work was lost. No files were affected beyond the momentary stash/pop round-trip.
- Full-suite `npx vitest run` shows 3 pre-existing failures in `src/__tests__/offline-buttons.test.jsx` (`Error: No QueryClient set, use QueryClientProvider to set one` in `OrdersScreen`). Confirmed pre-existing and unrelated to this plan (neither `screen-orders.jsx` nor `offline-buttons.test.jsx` is touched by 09-01; both were last modified in early, unrelated commits `7f640b3`/`8b57205`). Logged to `.planning/phases/09-period-control/deferred-items.md` per the executor's scope-boundary rule rather than fixed inline.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- All seven planned exports exist, are pure, clock-injectable, and fully unit-tested against every `must_haves.truths` entry in the plan frontmatter (preset dispatch, 366/367 boundary, empty-input handling, single-day adjacency, year-omission rule, and the exclusive-to-inclusive round-trip agreement between `customRangeToQuery` and `formatDateRange`)
- `09-02` (i18n + styles) and `09-03` (`useHistoryOrders` hook signature change) can proceed independently — this plan touches no consumer
- `09-04`/`09-05` (screen wiring, custom-range popover) can now import `getPresetRange`, `MAX_RANGE_DAYS`, `validateCustomRange`, `customRangeToQuery`, and `formatDateRange` directly; no further changes to `history-utils.js` anticipated for Phase 9
- Pre-existing `offline-buttons.test.jsx` failures remain open and unrelated — tracked in `deferred-items.md`, not blocking this phase

---
*Phase: 09-period-control*
*Completed: 2026-07-17*
