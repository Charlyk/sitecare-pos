---
phase: 04-core-screens
plan: 07
subsystem: ui
tags: [react, tanstack-query, zustand, useMutation, useMenu, menu-availability, tdd]

requires:
  - phase: 04-core-screens/04-02
    provides: "useMenu() hook, ['menu'] cache key, kitchen.products.updateStock SDK call"

provides:
  - "MenuScreen reads item availability from useMenu() live data (not localStorage)"
  - "AvailSwitch toggle calls client.kitchen.products.updateStock({ body: { productId, inStock } }) — no path param"
  - "toggleStock useMutation with invalidateQueries(['menu']) on success and error toast on failure"
  - "Pending row opacity 0.6 while mutation in flight"
  - "localStorage sc_avail completely removed from MenuScreen"

affects:
  - "04-core-screens — Plan 08 and beyond (menu availability state now server-owned)"

tech-stack:
  added: []
  patterns:
    - "useMutation with body-only SDK call (no path param) — updateStock pattern"
    - "TDD RED/GREEN: write failing tests first, implement to pass"
    - "Defensive menu normalization: menuData?.categories ?? [], p.inStock !== false"

key-files:
  created: []
  modified:
    - src/screen-menu.jsx
    - src/__tests__/screen-menu.test.jsx

key-decisions:
  - "toggleStock uses body.productId (not path.id) — SDK UpdateProductStockData.path is 'never'"
  - "toggleAll bulk function removed — no API equivalent for bulk stock update"
  - "All available / All out buttons removed — localStorage-based bulk ops have no server equivalent"
  - "Pending opacity uses toggleStock.variables.productId to highlight only the toggling row"
  - "Item filter by category uses cats.find() on normalized cats array (not allItems.filter(i => i.cat === cat) which relied on static data shape)"

requirements-completed:
  - MENU-01
  - MENU-02

duration: 8min
completed: 2026-04-24
---

# Phase 4 Plan 07: Menu Screen Live Toggle Summary

**Menu availability state migrated from localStorage to server via useMenu() normalization and updateStock mutation with body-only SDK call (productId in body, no path param)**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-04-24T17:44:00Z
- **Completed:** 2026-04-24T17:47:00Z
- **Tasks:** 1 (TDD: RED + GREEN commits)
- **Files modified:** 2

## Accomplishments

- Removed all localStorage reads/writes for menu availability state (sc_avail key gone)
- Removed MENU_CATEGORIES and MENU_ITEMS static imports from data.jsx
- Replaced with useMenu() hook + defensive cats/allItems normalization (same pattern as POS plan 06)
- toggleStock mutation wired: `client.kitchen.products.updateStock({ body: { productId, inStock } })` — no path param
- AvailSwitch checked prop now reads `it.inStock` from normalized server data
- Pending row at opacity 0.6 while mutation is in flight (variables.productId match)
- onSuccess: `queryClient.invalidateQueries({ queryKey: ['menu'] })` triggers re-fetch
- onError: pushes error toast via pushToast
- Added loading state while useMenu() isLoading
- All 5 TDD tests passing; full suite 114/114 pass, zero regressions

## Task Commits

1. **RED: Failing tests for MENU-01 and MENU-02** - `810ca48` (test)
2. **GREEN: Replace localStorage + static data with useMenu() and toggleStock mutation** - `bb7337f` (feat)

## Files Created/Modified

- `src/screen-menu.jsx` — localStorage/static data removed; useMenu() + toggleStock mutation added
- `src/__tests__/screen-menu.test.jsx` — 5 real tests replacing 5 test.todo stubs

## Decisions Made

- `toggleAll` function and bulk "All available" / "All out" buttons removed: these called bulk localStorage writes with no API equivalent; removing is correct behavior.
- Pending opacity scoped to matching `toggleStock.variables?.productId` so only the toggling row dims, not the entire list.
- Item category filter refactored to use `cats.find(c => c.items.some(ci => ci.id === it.id))` since normalized items no longer carry a `.cat` field from static data.
- Description column removed from table (was using static `it.desc` field; normalized items don't have it) — column count reduced from 6 to 5 columns.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Item category filter refactored for normalized data shape**
- **Found during:** Task 1 (implementation)
- **Issue:** Old code used `allItems.filter(i => i.cat === cat)` where `.cat` was a static data field; normalized items from useMenu() don't have `.cat`
- **Fix:** Category filter now uses `cats.find(c => c.items.some(ci => ci.id === it.id))` to associate items with their parent category from the normalized cats array
- **Files modified:** src/screen-menu.jsx
- **Verification:** Tests pass; category navigation works correctly for normalized data
- **Committed in:** bb7337f

**2. [Rule 1 - Bug] Description column removed — `it.desc` field absent from normalized items**
- **Found during:** Task 1 (implementation)
- **Issue:** Old table had a Description column using `it.desc` from static MENU_ITEMS. Normalized API items don't carry a description field.
- **Fix:** Removed Description column from the table header and item rows; grid reduced from 6 to 5 columns
- **Files modified:** src/screen-menu.jsx
- **Verification:** Table renders cleanly without the description column; no empty cells
- **Committed in:** bb7337f

---

**Total deviations:** 2 auto-fixed (2 Rule 1 - Bug)
**Impact on plan:** Both fixes necessary for correctness with live data shape. No scope creep.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Menu availability is now server-owned; any other screen showing in-stock state can trust useMenu() as source of truth.
- Plan 08 (Settings Display Tab) is next; no blockers from this plan.

---
*Phase: 04-core-screens*
*Completed: 2026-04-24*
