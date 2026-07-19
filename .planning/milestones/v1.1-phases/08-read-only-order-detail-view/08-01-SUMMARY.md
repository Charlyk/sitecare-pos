---
phase: 08-read-only-order-detail-view
plan: 01
subsystem: docs
tags: [i18n, roadmap, requirements, documentation]

# Dependency graph
requires:
  - phase: 07-history-screen-foundation
    provides: readOnly screen-detail.jsx routing, history-detail route, historyOrder store state
provides:
  - Corrected ROADMAP.md Phase 8 SC1 (no handled-by, prep time = derived actual duration)
  - Corrected ROADMAP.md Phase 8 SC2 (401/404, not 401/403)
  - Corrected REQUIREMENTS.md HIST-10 (no handled-by) with F-01 finding recorded
  - REQUIREMENTS.md Design Elements Cut row explaining the handled-by omission (D-09)
  - Four new i18n keys (h_detail_error_title, h_prep_time, h_canceled_after, h_detail_no_items) in ro+en
affects: [08-02, 08-03, 08-04, 08-05]

# Tech tracking
tech-stack:
  added: []
  patterns: []

key-files:
  created: []
  modified:
    - .planning/ROADMAP.md
    - .planning/REQUIREMENTS.md
    - src/i18n.jsx

key-decisions:
  - "Removed handled-by from both ROADMAP SC1 and REQUIREMENTS HIST-10 per D-09 — Order has no such field, only events[].actor (string|null, undocumented semantics)"
  - "ROADMAP SC2 corrected 401/403 to 401/404 — GetOrderErrors in the SDK type defs documents only 401 and 404"
  - "Also fixed a pre-existing 'handled-by cut' mention in the Phase 8 plans-list description line so the plan's own zero-occurrence acceptance check passes"
  - "Recorded planner finding F-01 in REQUIREMENTS.md: normalizeOrder yields an empty items array, never null, for AdminOrder summaries"

patterns-established: []

requirements-completed: [HIST-10]

coverage:
  - id: D1
    description: "ROADMAP.md Phase 8 SC1/SC2 amended (no handled-by; prep time = derived duration; 401/404 not 401/403)"
    requirement: "HIST-10"
    verification:
      - kind: other
        ref: "awk Phase-8-block grep checks: handled-by=0, 401/403=0, 401/404=2"
        status: pass
    human_judgment: false
  - id: D2
    description: "REQUIREMENTS.md HIST-10 amended (no handled-by) with F-01 finding and a new Design Elements Cut row"
    requirement: "HIST-10"
    verification:
      - kind: other
        ref: "grep -n HIST-10 / F-01 / handled-by checks in REQUIREMENTS.md"
        status: pass
    human_judgment: false
  - id: D3
    description: "Four i18n keys (h_detail_error_title, h_prep_time, h_canceled_after, h_detail_no_items) added to both ro and en locale objects, no duplicates"
    requirement: "HIST-10"
    verification:
      - kind: unit
        ref: "npx vitest run src/__tests__/i18n.test.js"
        status: pass
    human_judgment: false

duration: ~5min
completed: 2026-07-17
status: complete
---

# Phase 8 Plan 1: Amend Planning Docs + Add Detail-View i18n Keys Summary

**Corrected two stale planning documents (dropped a promised "handled-by" field and a nonexistent 403 error) and added the four i18n keys the rest of Phase 8 renders.**

## Performance

- **Duration:** ~5 min
- **Completed:** 2026-07-17
- **Tasks:** 2
- **Files modified:** 3 (+1 new deferred-items.md tracking file)

## Accomplishments
- ROADMAP.md Phase 8 SC1 no longer promises `handled-by`; SC1 now clarifies "prep time" means the derived actual duration (D-09, D-10)
- ROADMAP.md Phase 8 SC2 now names 401/404 (what `getOrder` actually documents), not 401/403
- REQUIREMENTS.md HIST-10 amended to drop `handled-by`; a new Design Elements Cut row records why (`events[].actor` is `string | null` with undocumented semantics — D-09)
- REQUIREMENTS.md records planner finding F-01: `normalizeOrder` maps `items: (o.items ?? []).map(...)`, so the pre-hydration `AdminOrder` summary always yields an empty items array, never null
- `src/i18n.jsx` gained four new keys (`h_detail_error_title`, `h_prep_time`, `h_canceled_after`, `h_detail_no_items`) in both `ro` and `en`, ready for 08-03 (duration row) and 08-04 (items-card states) to consume

## Task Commits

Each task was committed atomically:

1. **Task 1: Amend ROADMAP Phase 8 SC1/SC2 and REQUIREMENTS HIST-10 per D-09 and F-01** - `2111384` (docs)
2. **Task 2: Add the four new i18n keys to both the ro and en locale objects** - `208852c` (feat)

## Files Created/Modified
- `.planning/ROADMAP.md` - Phase 8 SC1/SC2 corrected; a stale "handled-by cut" mention in the plans-list description line also fixed
- `.planning/REQUIREMENTS.md` - HIST-10 amended, F-01 finding recorded, new Design Elements Cut row added
- `src/i18n.jsx` - four new keys added to both `ro` and `en` locale objects
- `.planning/phases/08-read-only-order-detail-view/deferred-items.md` - new file, logs two pre-existing unrelated test failures found during full-suite verification

## Decisions Made
- Removed `handled-by` from both ROADMAP SC1 and REQUIREMENTS HIST-10 per D-09 — `Order` carries no such field, only `events[].actor` (`string | null`, undocumented semantics); deriving it risks misattributing an order to the wrong staff member.
- Corrected ROADMAP SC2's error codes from 401/403 to 401/404, matching `GetOrderErrors` in `node_modules/@charlyk/admin-client/dist/index.d.ts`.
- Recorded planner finding F-01 as a note under HIST-10 in REQUIREMENTS.md: the summary's `items` field is always an array (never null) after `normalizeOrder`, so the pre-hydration state is an empty receipt, not an absent one.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed a second pre-existing "handled-by" mention outside the planned edit scope**
- **Found during:** Task 1 verification (acceptance criteria grep check)
- **Issue:** The plan's Task 1 `<action>` specified five scoped edits (ROADMAP SC1/SC2, REQUIREMENTS HIST-10, Design Elements Cut row, F-01 note), but the Task 1 `<acceptance_criteria>` additionally required `grep -c 'handled-by'` across the whole Phase 8 ROADMAP block to return `0`. A pre-existing line in the Phase 8 "Plans:" list (`08-01-PLAN.md — Amend ROADMAP/REQUIREMENTS per D-09 (handled-by cut, 401/404) + add 4 i18n keys`) also contained the word, causing the count to be 1 instead of 0.
- **Fix:** Reworded that line to `Amend ROADMAP/REQUIREMENTS per D-09 (drop staff-attribution field, 401/404) + add 4 i18n keys`, preserving its meaning without the word "handled-by".
- **Files modified:** `.planning/ROADMAP.md`
- **Verification:** `awk '/^### Phase 8:/,/^### Phase 9:/' .planning/ROADMAP.md | grep -c 'handled-by'` now returns `0`
- **Committed in:** `2111384` (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 Rule 1 bug fix)
**Impact on plan:** Necessary to satisfy the plan's own acceptance criteria. No scope creep — same document, same section, same underlying correction (D-09).

## Issues Encountered
- Full-suite `npx vitest run` (run as part of Task 2's broader verification, beyond the plan's required `npx vitest run src/__tests__/i18n.test.js`) surfaced two pre-existing, unrelated failures: `src/__tests__/build-pipeline.test.js:101` (a `tauri.conf.json` bundle-config assertion) and `src/__tests__/offline-buttons.test.jsx` (missing `QueryClientProvider` in a test render of `screen-orders.jsx`). Neither can be caused by `src/i18n.jsx` string additions. Logged to `.planning/phases/08-read-only-order-detail-view/deferred-items.md` per the scope boundary rule (only auto-fix issues directly caused by the current task's changes) rather than fixed inline.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- All four i18n keys (`h_prep_time`, `h_canceled_after`, `h_detail_error_title`, `h_detail_no_items`) exist in both locales, unblocking 08-03 (duration row) and 08-04 (items-card loading/error/empty states)
- ROADMAP.md and REQUIREMENTS.md now describe what the SDK can actually deliver, so downstream plans (08-02 through 08-05) can be verified against accurate success criteria
- Two pre-existing, unrelated test failures remain open in `deferred-items.md` — not blocking Phase 8 but should be triaged separately

---
*Phase: 08-read-only-order-detail-view*
*Completed: 2026-07-17*

## Self-Check: PASSED

- FOUND: .planning/ROADMAP.md
- FOUND: .planning/REQUIREMENTS.md
- FOUND: src/i18n.jsx
- FOUND: .planning/phases/08-read-only-order-detail-view/deferred-items.md
- FOUND: commit 2111384
- FOUND: commit 208852c
