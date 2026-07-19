---
phase: 09-period-control
plan: 02
subsystem: ui
tags: [i18n, css, ro, en, period-control]

# Dependency graph
requires:
  - phase: 09-period-control (09-01)
    provides: getPresetRange, validateCustomRange, formatDateRange (history-utils.js pure helpers)
provides:
  - Eight new i18n keys (h_range_start, h_range_end, h_range_apply, h_range_cap_message, h_period_in_7, h_period_in_30, h_period_in_range_prefix, h_empty_prefix) symmetric across ro/en
  - Old period-baked empty-state key (h_empty) removed from both locales, replaced by composable h_empty_prefix (D-13)
  - .spin CSS class + @keyframes spin (800ms linear infinite, 360deg) for the period-switch loading affordance (D-05)
affects: [09-04, 09-05]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Composable empty-state copy: h_empty_prefix + period-phrase + component-appended full stop, replacing a single baked-in sentence key (D-13)"
    - "Loading-spinner CSS convention: linear infinite rotation via a dedicated .spin utility class, kept structurally distinct from the .btn-disabled-offline greyed-out/inert convention"

key-files:
  created: []
  modified:
    - src/i18n.jsx
    - src/styles.css

key-decisions:
  - "h_empty_prefix carries no trailing period and no period name — sentence composition (prefix + period phrase + full stop) is deferred entirely to 09-04's component code"
  - "Old h_empty key is a rename, not an addition — zero duplicate/dead keys left behind"

patterns-established:
  - "Grep-before-write on all new i18n key names before adding, per T-09-06's duplicate-key mitigation"

requirements-completed: [HIST-04]

coverage:
  - id: D1
    description: "Eight new i18n keys added symmetrically to both ro and en locale blocks in src/i18n.jsx"
    requirement: "HIST-04"
    verification:
      - kind: unit
        ref: "grep -c per-key count checks (each of 8 keys returns exactly 2) — see Task 1 acceptance criteria"
        status: pass
      - kind: other
        ref: "node duplicate-key scan (no h_* key declared more than twice across the file)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Old period-baked empty-state key (h_empty) renamed to h_empty_prefix in both locales, with h_empty_sub and all reused keys untouched"
    requirement: "HIST-04"
    verification:
      - kind: unit
        ref: "grep -c \"h_empty:\" src/i18n.jsx returns 0; grep -c h_empty_sub returns 2; grep -c \"ultimele 30 de zile\" returns 1 (only inside h_period_in_30)"
        status: pass
    human_judgment: false
  - id: D3
    description: "spin keyframe (360deg, to-only) and .spin utility class (800ms linear infinite) added additively to src/styles.css"
    verification:
      - kind: unit
        ref: "node regex check for @keyframes spin and .spin rule; git diff --numstat src/styles.css shows 0 deletions"
        status: pass
    human_judgment: false
  - id: D4
    description: "Full vitest suite run after both tasks — 3 pre-existing failures unchanged, 4 new failures caused by the h_empty rename (screen-history.test.jsx x2, app-history-route.test.jsx x2) surfaced as a plan-anticipated finding, not silently patched"
    verification: []
    human_judgment: true
    rationale: "The plan's own <verification> section explicitly anticipated this exact scenario and instructed the executor to report rather than patch the consumer (screen-history.jsx / its tests) here, since that work belongs to 09-04. A human/reviewer should confirm this is acceptable interim breakage given the wave ordering (09-04 depends_on [09-02])."

# Metrics
duration: ~5min
completed: 2026-07-17
status: complete
---

# Phase 09 Plan 02: Period-Control i18n Keys + Spin Keyframe Summary

**Eight new bilingual i18n keys for the custom-range picker and period-dependent empty-state copy, plus a `.spin` CSS utility for the period-switch loading affordance — no component code touched.**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-07-17T23:05Z (approx)
- **Completed:** 2026-07-17T23:07:15+03:00
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Added `h_range_start`, `h_range_end`, `h_range_apply`, `h_range_cap_message` (custom-range picker labels and the 366-day cap message) to both `ro` and `en` blocks, adjacent to the existing `h_period_*` group.
- Added `h_period_in_7`, `h_period_in_30`, `h_period_in_range_prefix`, `h_empty_prefix` (period-dependent copy fragments for D-13's composed empty-state sentence) to both locales, adjacent to the empty-state keys.
- Renamed the old period-baked empty-state key (`h_empty: 'Nicio comandă în ultimele 30 de zile.'` / `'No orders in the last 30 days.'`) out of both locales entirely — replaced, not duplicated, by `h_empty_prefix`.
- Added `@keyframes spin` (`to { transform: rotate(360deg); }`) and `.spin { animation: spin 800ms linear infinite; }` to `src/styles.css`, grouped with the existing `pulseRing`/`.pulse` animation block. Purely additive — zero deletions, `.btn-disabled-offline`'s `opacity: 0.45` untouched.

## Task Commits

Each task was committed atomically:

1. **Task 1: New i18n keys + empty-state key rename (ro + en)** - `df8c9ea` (feat)
2. **Task 2: spin keyframe + .spin class** - `f5a8051` (feat)

**Plan metadata:** (pending — final docs commit)

## Files Created/Modified
- `src/i18n.jsx` - 8 new keys x 2 locales added; old `h_empty` key removed from both `ro` and `en`
- `src/styles.css` - `@keyframes spin` + `.spin` class added to the Animations block, additive only

## Decisions Made
- None beyond what UI-SPEC specified — plan executed to the letter for the key set, values, and placement.

## Deviations from Plan

### Reported (not auto-fixed) — plan-anticipated finding

**1. [Plan's own explicit instruction] `npx vitest run` does not fully pass after Task 1's rename — 4 tests assert on the removed `h_empty` string literal**
- **Found during:** Task 1 verification (`npx vitest run`)
- **Issue:** The plan's `<verification>` section states: "the suite must still pass because no existing test asserts on that key's text. If a test does fail on it, that is the signal that the consumer change cannot wait for 09-04 — report rather than patching the consumer here." That premise is false. Confirmed by running the full suite against both the pre-plan baseline (`git show HEAD:src/i18n.jsx`, restored after checking) and the post-rename state: baseline is 3 pre-existing failures / 346 passing (build-pipeline.test.js x1, offline-buttons.test.jsx x2, both unrelated to i18n and already logged in `deferred-items.md` from 09-01); post-rename is 7 failing / 342 passing — the same 3 pre-existing failures plus 4 new ones, all asserting the literal string `'Nicio comandă în ultimele 30 de zile.'`:
  - `src/__tests__/screen-history.test.jsx:83` and `:97`
  - `src/__tests__/app-history-route.test.jsx:175` and `:193`
- **Fix:** None applied here, per the plan's explicit instruction. `screen-history.jsx` (the consumer) and its tests are outside this plan's `files_modified` scope (`src/i18n.jsx`, `src/styles.css` only) and are owned by 09-04, which already `depends_on: [09-02]`.
- **Files modified:** None (reporting only)
- **Verification:** Documented in `.planning/phases/09-period-control/deferred-items.md` with full test-name breakdown, so 09-04's plan execution knows its scope must include updating these four test assertions to the composed `h_empty_prefix` + period-phrase + full-stop string, not just `screen-history.jsx`'s render output.
- **Committed in:** Not committed as code; documented in `deferred-items.md` (included in this plan's final metadata commit).

---

**Total deviations:** 1 reported (0 auto-fixed)
**Impact on plan:** No code deviation — the i18n and CSS changes match the plan exactly. The only deviation is a documentation finding that disproves one of the plan's own stated assumptions; flagged per the plan's explicit instruction rather than silently worked around.

## Issues Encountered
- Full-suite `npx vitest run` is red (7/349 failing) after this plan, by design per the wave-ordering rationale in the plan's own threat model (T-09-07): the consumer (`screen-history.jsx`) intentionally lands in a later wave (09-04). See "Deviations from Plan" above for the full accounting.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- The eight new keys and `.spin` class are in place and ready for 09-03/09-04/09-05 to consume.
- 09-04 must budget for updating `screen-history.jsx`'s `EmptyBlock` (D-13 composed sentence) AND the four test assertions listed above that still expect the old literal string — this was not called out in 09-04's task list as written and should be treated as in-scope for that plan's consumer update.

---
*Phase: 09-period-control*
*Completed: 2026-07-17*

## Self-Check: PASSED

- FOUND: src/i18n.jsx
- FOUND: src/styles.css
- FOUND: .planning/phases/09-period-control/09-02-SUMMARY.md
- FOUND commit: df8c9ea
- FOUND commit: f5a8051
