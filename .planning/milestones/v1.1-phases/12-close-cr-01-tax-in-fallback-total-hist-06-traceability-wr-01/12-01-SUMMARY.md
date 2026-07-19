---
phase: 12-close-cr-01-tax-in-fallback-total-hist-06-traceability-wr-01
plan: 01
subsystem: testing
tags: [vitest, normalizeOrder, regression-test, financial-correctness]

# Dependency graph
requires:
  - phase: 10-filters-search
    provides: "10-REVIEW.md CR-01 (percent-discount 100x-inflation) and CR-02 (tax-omission) findings against normalizeOrder's fallback-total path"
provides:
  - "Automated regression coverage for normalizeOrder's fallback-total (o.total absent) and percent-discount (discountType: 'percent') math paths"
affects: [normalize-order, data-layer, financial-correctness]

# Tech tracking
tech-stack:
  added: []
  patterns: []

key-files:
  created: []
  modified:
    - src/__tests__/normalize-order.test.js

key-decisions:
  - "Verify-and-backfill only (D-05) — src/data.jsx left untouched; the CR-01/CR-02 fixes shipped earlier (commits 30c89d8, 7d9810b), this plan adds the missing tests only"
  - "Third test case ties the total assertion to the same asserted component fields (subtotal/tax/deliveryFee/tip/discount) rather than a hardcoded total, so the internal-consistency check can't be satisfied by two independently-wrong numbers that happen to match"

patterns-established: []

requirements-completed: [D-05, D-06]

coverage:
  - id: D1
    description: "Fallback total (o.total omitted) includes tax — CR-02 regression guard"
    requirement: "D-06"
    verification:
      - kind: unit
        ref: "src/__tests__/normalize-order.test.js#fallback total INCLUDES tax when o.total is omitted"
        status: pass
    human_judgment: false
  - id: D2
    description: "Percent discount is cRON-scaled, not 100x inflated (10% of 96 RON = 9.60) — CR-01 regression guard"
    requirement: "D-06"
    verification:
      - kind: unit
        ref: "src/__tests__/normalize-order.test.js#percent discount is cRON-scaled, not 100x inflated (10% of 96 RON = 9.60)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Combined fallback-total + percent-discount case is internally consistent (total derived from asserted components)"
    requirement: "D-06"
    verification:
      - kind: unit
        ref: "src/__tests__/normalize-order.test.js#combined: fallback total with tax AND percent discount is internally consistent"
        status: pass
    human_judgment: false

# Metrics
duration: ~6min
completed: 2026-07-19
status: complete
---

# Phase 12 Plan 01: Backfill D-06 normalizeOrder Regression Tests Summary

**Three new vitest cases lock the already-fixed CR-01 (percent-discount 100x-inflation) and CR-02 (tax-omission) fallback-total math in `normalizeOrder` behind automated regression coverage — no source changed.**

## Performance

- **Duration:** ~6 min
- **Completed:** 2026-07-19T19:51:01Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments
- Added a new `describe('normalizeOrder — fallback total + discount (D-06 / CR-01 / CR-02)', ...)` block to `src/__tests__/normalize-order.test.js`
- Test 1 proves the fallback total (`o.total` omitted) still includes tax — the CR-02 regression it would silently reintroduce is a total that's short by the tax amount
- Test 2 proves the percent-discount branch is cRON-scaled (10% of 96 RON = 9.60), directly catching the CR-01 100x-inflation defect (which would have produced 960 instead of 9.60)
- Test 3 combines both paths in one order and asserts `total` is arithmetically consistent with its own asserted `subtotal`/`tax`/`deliveryFee`/`tip`/`discount` fields, closing the exact CR-01/CR-02 gap end-to-end

## Task Commits

Each task was committed atomically:

1. **Task 1: Backfill normalizeOrder fallback-total + percent-discount regression tests (D-06)** - `8b7b2d2` (test)

**Plan metadata:** (pending — final commit below)

## Files Created/Modified
- `src/__tests__/normalize-order.test.js` - added 3 new test cases (14 total in file) covering the fallback-total-includes-tax path, the percent-discount cRON-scaling path, and a combined internal-consistency check

## Decisions Made
- Verify-and-backfill scope honored exactly — `git diff -- src/data.jsx` confirmed empty before and after the commit; no production code was touched
- Chose cents values (5000/500/200, 9600/1000, 9600/500/300/200/1000) that produce exact 2-decimal RON sums, avoiding floating-point rounding noise in assertions
- Test 3's total assertion is computed from the same result object's own asserted component fields (not a separately hand-computed literal), making the internal-consistency claim structurally enforced rather than coincidental

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- D-06 regression coverage is in place; a future edit to `normalizeOrder`'s fallback-total or percent-discount math will now fail these tests before it can ship
- Full vitest suite: 484 passed / 3 failed (unchanged pre-existing v1.0 failures: `build-pipeline.test.js` BILD-04 `createUpdaterArtifacts`, and 2 `offline-buttons.test.jsx` assertions failing on a missing `QueryClientProvider` in that test's render harness) — no new reds introduced by this plan
- Remaining phase 12 plans (02-04: store lift, HIST-06 docs, verify+audit) are unblocked

---
*Phase: 12-close-cr-01-tax-in-fallback-total-hist-06-traceability-wr-01*
*Completed: 2026-07-19*

## Self-Check: PASSED

- FOUND: src/__tests__/normalize-order.test.js
- FOUND: 8b7b2d2 (commit hash verified in git log)
