---
phase: 10-filters-search
plan: 01
subsystem: ui
tags: [react-free-utils, i18n, unit-tests, romanian-diacritics]

# Dependency graph
requires:
  - phase: 07-history-screen-foundation
    provides: history-utils.js's deriveDisplayStatus (D-02 precedence), filterFinishedOrders, module-purity convention
provides:
  - foldDiacritics(s) — NFD + combining-marks-block strip, folds both modern and legacy ș/ț encodings plus ă/â/î
  - matchesSearch(order, query) — free-text search predicate over the row's own # label + customer.name
  - matchesStatus(order, statusFilter) — status filter predicate delegating to deriveDisplayStatus
  - matchesType(order, typeFilter) — type filter predicate, mapping-free equality
  - i18n keys h_empty_filtered_title, h_clear_filters (ro + en)
affects: [10-02, 10-03, 10-04]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Diacritic folding via String.prototype.normalize('NFD') + full combining-diacritical-marks block strip (U+0300–U+036F), not a hand-picked subset"
    - "Filter predicates delegate to existing derivation functions (deriveDisplayStatus) rather than re-implementing precedence — single source of truth"

key-files:
  created: []
  modified:
    - src/history-utils.js
    - src/__tests__/history-utils.test.js
    - src/i18n.jsx

key-decisions:
  - "foldDiacritics targets the whole Unicode combining-marks block so both comma-below (U+0219/U+021B) and legacy cedilla (U+015F/U+0163) ș/ț encodings fold identically — verified with explicit dual-encoding test cases"
  - "matchesSearch mirrors screen-history.jsx's orderNumberLabel exactly (dailyOrderNumber when numeric, else id.slice(0,8)) so no row is ever unreachable by the text it displays"
  - "matchesStatus/matchesType kept as thin predicates with zero inline status/type literals — matchesStatus delegates to deriveDisplayStatus, matchesType does no 'local' mapping of its own"

patterns-established:
  - "New pure predicates land in history-utils.js with direct unit tests before any screen wires them — same Wave-0-first precedent as Phase 7"

requirements-completed: [HIST-07, HIST-08, HIST-09]

coverage:
  - id: D1
    description: "foldDiacritics folds both ș/ț Unicode encodings (modern comma-below and legacy cedilla) plus ă/â/î"
    requirement: "HIST-09"
    verification:
      - kind: unit
        ref: "src/__tests__/history-utils.test.js#foldDiacritics"
        status: pass
    human_judgment: false
  - id: D2
    description: "matchesSearch matches on dailyOrderNumber, the id[0:8] fallback when dailyOrderNumber is null/undefined, and diacritic-folded customer.name; empty/whitespace query matches all; tolerates missing customer"
    requirement: "HIST-09"
    verification:
      - kind: unit
        ref: "src/__tests__/history-utils.test.js#matchesSearch"
        status: pass
    human_judgment: false
  - id: D3
    description: "matchesStatus delegates to deriveDisplayStatus for status-bucket matching (refunded precedence preserved); matchesType does mapping-free type equality"
    requirement: "HIST-07"
    verification:
      - kind: unit
        ref: "src/__tests__/history-utils.test.js#matchesStatus"
        status: pass
    human_judgment: false
  - id: D4
    description: "matchesType exact-equality predicate; 'all' matches every order"
    requirement: "HIST-08"
    verification:
      - kind: unit
        ref: "src/__tests__/history-utils.test.js#matchesType"
        status: pass
    human_judgment: false
  - id: D5
    description: "h_empty_filtered_title and h_clear_filters i18n keys added to both ro and en dictionaries with the exact UI-SPEC copywriting contract strings, no duplicate-key collision"
    verification:
      - kind: other
        ref: "grep -c -E 'h_empty_filtered_title|h_clear_filters' src/i18n.jsx == 4"
        status: pass
    human_judgment: false

duration: 12min
completed: 2026-07-18
status: complete
---

# Phase 10 Plan 01: Filter Predicates + Diacritic Folding Summary

**Four pure, unit-tested filter primitives (foldDiacritics, matchesSearch, matchesStatus, matchesType) added to history-utils.js, plus the two net-new filtered-empty-state i18n keys — the React-free foundation 10-03's screen wiring will consume.**

## Performance

- **Duration:** 12 min
- **Started:** 2026-07-18T00:31:48+03:00
- **Completed:** 2026-07-18T00:43:57+03:00
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments
- `foldDiacritics` NFD-decomposes and strips the full Unicode combining-diacritical-marks block, folding both the modern comma-below (U+0219/U+021B) and legacy cedilla (U+015F/U+0163) ș/ț encodings identically, plus ă/â/î
- `matchesSearch` mirrors the row's displayed `#` label exactly (dailyOrderNumber when numeric, else `id.slice(0,8)`) and a diacritic-folded `customer.name`, with an empty/whitespace query matching every order
- `matchesStatus` and `matchesType` added as thin, delegation-only predicates — `matchesStatus` never re-implements the refunded/canceled/completed precedence, calling `deriveDisplayStatus` instead
- `h_empty_filtered_title` and `h_clear_filters` i18n keys landed in both `ro` and `en`, matching the UI-SPEC Copywriting Contract strings exactly, with zero duplicate-key collisions

## Task Commits

Each task was committed atomically:

1. **Task 1: Add foldDiacritics + matchesSearch to history-utils.js** - `126aa37` (feat)
2. **Task 2: Add matchesStatus + matchesType predicates** - `dc7f1cf` (feat)
3. **Task 3: Add h_empty_filtered_title + h_clear_filters i18n keys (ro + en)** - `8a2077c` (feat)

_Note: history-utils.js and its test file were touched in both Task 1 and Task 2 commits; each commit's diff is scoped to that task's functions/tests only (verified via `git diff` per commit)._

## Files Created/Modified
- `src/history-utils.js` - +4 exported functions: `foldDiacritics`, `matchesSearch`, `matchesStatus`, `matchesType`
- `src/__tests__/history-utils.test.js` - +2 describe blocks per task pairing: `foldDiacritics`/`matchesSearch`, `matchesStatus`/`matchesType` (9 new tests added on top of the 91 pre-existing, total 100 passing)
- `src/i18n.jsx` - +2 keys × 2 locales (`h_empty_filtered_title`, `h_clear_filters`), placed adjacent to `h_empty`/`h_empty_sub`

## Decisions Made
- Kept `foldDiacritics`'s regex targeting the whole Unicode combining-marks block (not a narrower hand-picked set) per RESEARCH Pitfall 2, and added explicit test cases for both ș/ț encodings to prevent silent regression to a narrower regex later
- `matchesSearch`'s number-label construction copies `orderNumberLabel`'s exact fallback logic (`typeof num === 'number'`) rather than re-deriving a looser check, closing the Pitfall 4 gap the live Orders screen's search predicate has
- No inline status/type literals in `matchesStatus`/`matchesType` — confirmed via grep that `matchesStatus`'s body contains no `'CANCELLED'`/`'COMPLETED'`/`'refunded'` string literals

## Deviations from Plan

None — plan executed exactly as written. All three tasks' acceptance criteria and `<behavior>` specs were satisfied without needing any Rule 1-4 auto-fixes.

One authoring correction (not a deviation from the plan, a self-caught test-writing error): initial test fixtures for the ș/ț legacy-cedilla test asserted `foldDiacritics('șerban')` should equal `'erban'`; corrected to `'serban'` since `foldDiacritics` folds the diacritic mark but retains the base letter (`ș` → `s`, not removed entirely). Caught by the RED test run before any commit — no functional code was ever wrong, only the initial test expectation.

## Issues Encountered

**Full-suite `npx vitest run` shows 3 pre-existing failures** in `src/__tests__/build-pipeline.test.js` (`BILD-04`) and `src/__tests__/offline-buttons.test.jsx` (`U12`, 2 assertions) — confirmed unrelated to this plan's changes (neither file imports `history-utils.js` or `i18n.jsx`'s new keys) and confirmed present before this plan's commits by re-running the same two files against a stashed working tree. Logged to `.planning/phases/10-filters-search/deferred-items.md` per the executor's SCOPE BOUNDARY rule — not fixed here.

The plan's own `<verification>` command (`npx vitest run src/__tests__/history-utils.test.js`) is green: 100/100 passing.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

`foldDiacritics`, `matchesSearch`, `matchesStatus`, `matchesType` are exported, unit-tested, and ready for 10-03's screen wiring to consume directly — no filter/search matching logic needs to be invented at the component layer. The two i18n keys are available for 10-03/10-04's filtered-empty-state and Clear Filters button. `history-utils.js` module purity (no react/data.jsx/@charlyk imports) is preserved. No blockers for 10-02 (normalizeOrder D-08 boundary fix, independent of this plan) or 10-03 (screen wiring, depends on this plan's exports).

---
*Phase: 10-filters-search*
*Completed: 2026-07-18*

## Self-Check: PASSED

- FOUND: src/history-utils.js
- FOUND: src/__tests__/history-utils.test.js
- FOUND: src/i18n.jsx
- FOUND: .planning/phases/10-filters-search/10-01-SUMMARY.md
- FOUND: commit 126aa37 (Task 1)
- FOUND: commit dc7f1cf (Task 2)
- FOUND: commit 8a2077c (Task 3)
