---
phase: 11-reprint-csv-export
plan: 02
subsystem: data-export
tags: [csv, rfc-4180, formula-injection, i18n, history-utils]

# Dependency graph
requires:
  - phase: 07-history-screen
    provides: deriveDisplayStatus, groupOrdersByDay, and the pure history-utils.js module this plan extends
provides:
  - "buildCsv(orders) — pure, tested accounting-grade CSV serializer for the History screen export"
  - "Three new i18n keys (print_configure_hint, h_export_empty_tooltip, h_export_error_title) in ro+en"
affects: [11-03, 11-04]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "OWASP CSV-injection guard (leading apostrophe) applied BEFORE RFC-4180 quote/escape, never after"
    - "Module-private co-located local-time formatter instead of importing from data.jsx, preserving history-utils.js's react/data.jsx/@charlyk-free invariant"

key-files:
  created: []
  modified:
    - src/history-utils.js
    - src/i18n.jsx
    - src/__tests__/history-utils.test.js

key-decisions:
  - "order_number column mirrors screen-history.jsx's orderNumberLabel derivation (numeric dailyOrderNumber, else id.slice(0,8)) rather than inventing a second precedence source"
  - "Monetary fields missing/undefined serialize as an empty CSV field, never '0.00' — distinguishes a genuinely-absent value from an explicit zero"
  - "RFC-4180 quoting and the T-11 formula-injection guard can both apply to the same field (e.g. a leading CR is both an injection vector and an RFC-4180 quoting trigger) — order of operations is injection-guard-first, quote-second, and both effects compose"

patterns-established:
  - "escapeCsvField(value): coerce null/undefined to '', apply formula-injection guard, then RFC-4180 quote-and-double — reusable escaping template for any future CSV export in this app"

requirements-completed: [HIST-11, HIST-12]

coverage:
  - id: D1
    description: "buildCsv(orders) produces one row per order with the 13-column accounting-full field set, comma-delimited, dot-decimal monetary formatting, fixed English headers, single leading BOM, RFC-4180 escaping, and T-11 formula-injection neutralization"
    requirement: "HIST-11"
    verification:
      - kind: unit
        ref: "src/__tests__/history-utils.test.js#buildCsv"
        status: pass
    human_judgment: false
  - id: D2
    description: "Three new i18n keys (print_configure_hint, h_export_empty_tooltip, h_export_error_title) exist in both ro and en blocks with UI-SPEC-locked copy"
    requirement: "HIST-12"
    verification:
      - kind: unit
        ref: "grep -c across src/i18n.jsx (3 keys x 2 blocks = 6 occurrences confirmed)"
        status: pass
    human_judgment: false

# Metrics
duration: 4min
completed: 2026-07-18
status: complete
---

# Phase 11 Plan 02: CSV Export Serializer + New i18n Keys Summary

**Pure `buildCsv(orders)` serializer producing RFC-4180-compliant, BOM-prefixed, formula-injection-safe accounting CSV, plus three new locked-copy i18n keys for the disabled-reprint/export tooltips and export-error toast title**

## Performance

- **Duration:** 4 min
- **Started:** 2026-07-18T23:49:11+03:00
- **Completed:** 2026-07-18T23:52:23+03:00
- **Tasks:** 2 (Task 1 non-TDD, Task 2 TDD with RED/GREEN commits)
- **Files modified:** 3

## Accomplishments
- Added `buildCsv(orders)` + private helpers (`escapeCsvField`, `orderToCsvRow`, `csvPlacedAt`, `csvOrderNumber`, `csvMoney`) and the `CSV_HEADERS` const to `src/history-utils.js`, closing D-07 through D-12
- Closed threat T-11 (CSV formula injection): any field whose first character is `=`, `+`, `-`, `@`, tab, or CR is apostrophe-prefixed before RFC-4180 quoting, verified by dedicated unit tests including the composed-effects case (leading `=` plus an embedded comma)
- Closed T-11-B: every column maps unconditionally through `escapeCsvField`, so a missing field is always an empty position, never a dropped one
- Added a held-out large-export perf test (~2000 synthetic orders, a full-year worst case under `MAX_RANGE_DAYS=366`) asserting sub-1000ms build time
- Added the three UI-SPEC-locked i18n keys (`print_configure_hint`, `h_export_empty_tooltip`, `h_export_error_title`) to both `ro` and `en` blocks in `src/i18n.jsx`
- Extended `src/__tests__/history-utils.test.js` with a 17-test `describe('buildCsv', ...)` block covering populated/BOM/status/placed_at/monetary/escaping/formula-injection/partial-row/zero-one-many/order_number-fallback/large-export cases

## Task Commits

Each task was committed atomically:

1. **Task 1: Add the three new i18n keys (ro + en)** - `3f243df` (feat)
2. **Task 2: Add pure buildCsv(orders) serializer with formula-injection guard** - RED: `cc29714` (test), GREEN: `5d4b088` (feat)

**Plan metadata:** (this commit, follows)

## Files Created/Modified
- `src/history-utils.js` - Added `buildCsv(orders)`, `CSV_HEADERS`, and five private helpers implementing D-07..D-12 and T-11/T-11-B; module purity (no react/data.jsx/@charlyk imports) preserved
- `src/i18n.jsx` - Added `print_configure_hint`, `h_export_empty_tooltip`, `h_export_error_title` to both `ro` (near line 240) and `en` (near line 480) blocks, adjacent to the existing `h_export` key
- `src/__tests__/history-utils.test.js` - Added `buildCsv` to the import list; appended a 17-test `describe('buildCsv', ...)` block covering every behavior bullet in the plan

## Decisions Made
- `order_number` column derivation exactly mirrors `orderNumberLabel` in `screen-history.jsx` (numeric `dailyOrderNumber`, else `id.slice(0, 8)`) so the CSV never diverges from what the UI already renders for the same order
- Monetary fields distinguish "missing/undefined" (→ empty CSV field) from "explicit zero" (→ `0.00`) — a dine-in order with no `deliveryFee` never falsely reports `0.00`
- Confirmed via test that RFC-4180 quoting and the T-11 apostrophe guard compose rather than conflict: a value both starting with an injection-trigger character AND containing an RFC-4180-trigger character (comma/quote/newline/CR) receives both transformations, with the guard applied first

## Deviations from Plan

None - plan executed exactly as written. One test-authoring correction was made during GREEN verification (not a deviation from the plan's behavior spec): the initial test asserted a CR-prefixed field literally starts with `'`, but a bare CR also triggers RFC-4180 quoting per the plan's own D-12 spec, so the correct assertion unwraps quoting before checking the apostrophe guard — the implementation was correct on the first pass; only the test's assertion needed adjustment to match RFC-4180 composition, which the plan's behavior section already specified.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- `buildCsv` is ready for plan 11-03/11-04 to wire into the Export CSV button (native `save()` dialog + `writeTextFile`)
- The three new i18n keys are ready for 11-03's disabled-tooltip and export-error-toast wiring
- `history-utils.js` remains pure and unit-testable without a DOM; no downstream plan needs to touch `i18n.jsx` again for this phase

---
*Phase: 11-reprint-csv-export*
*Completed: 2026-07-18*

## Self-Check: PASSED

All created/modified files exist on disk; all three task commit hashes (3f243df, cc29714, 5d4b088) found in git log.
