---
phase: 14-branch-scoped-cache-re-scoping
plan: 04
subsystem: api
tags: [tanstack-query, zustand, tdd, cache-scoping]

requires:
  - phase: 14-branch-scoped-cache-re-scoping (plan 01)
    provides: unwrapSdkResult(result, fallbackMessage) helper in src/data.jsx; proven branchId-keyed query key template (use-orders.js); lockstep invalidation precedent from screen-orders.jsx
  - phase: 14-branch-scoped-cache-re-scoping (plans 02, 03)
    provides: all 7 fetch hooks branch-scoped, completing the query-key half of the phase
provides:
  - use-order-actions.js's two mutations (updateStatus, updateEstimatedTime) invalidate branch-scoped ['orders'|'order'|'stats', branchId]
  - screen-pos.jsx POS-submit invalidates ['orders', branchId]
  - screen-menu.jsx stock-toggle invalidates ['menu', branchId]
  - SC2 sibling-branch-untouched test in use-order-actions.test.js — proof that a branch-a mutation never clears branch-b's cache
  - All 6 mutation-side invalidation sites in the phase (the 4 in use-order-actions.js + POS + menu) are now branch-scoped, matching the 7 branch-scoped query keys from Plans 01-03
affects: [15-sse-branch-aware-reconnect, 17-centralized-branch-access-error-handling]

tech-stack:
  added: []
  patterns:
    - "Mutation-side lockstep invalidation: onSuccess reads the SAME branchId selector as the corresponding query hook and invalidates with the exact scoped key, never a bare unscoped prefix"

key-files:
  created: []
  modified:
    - src/use-order-actions.js
    - src/screen-pos.jsx
    - src/screen-menu.jsx
    - src/__tests__/use-order-actions.test.js
    - src/__tests__/screen-menu.test.jsx

key-decisions:
  - "branchId is read ONCE at the hook/component-body top in all three files and closed over in onSuccess callbacks — never re-read via useAppStore inside onSuccess itself (Pitfall 4, prohibition enforced by code review + awk-scoped grep of the onSuccess block)"
  - "screen-menu.test.jsx's mocked useAppStore state was extended with currentBranch: null and its invalidation assertion updated to ['menu', null] — a Rule 1 fix, this test's expectation was directly invalidated by the in-scope screen-menu.jsx change and would have failed the full suite otherwise"

patterns-established: []

requirements-completed: [SCOPE-01]

coverage:
  - id: D1
    description: "use-order-actions.js updateStatus AND updateEstimatedTime each invalidate ['orders', branchId], ['order', branchId], ['stats', branchId] — branchId read once at the hook-body top and closed over in onSuccess"
    requirement: SCOPE-01
    verification:
      - kind: unit
        ref: "src/__tests__/use-order-actions.test.js#updateStatus invalidates ['orders', branchId] cache on success"
        status: pass
      - kind: other
        ref: "awk-scoped grep of use-order-actions.js's onSuccess blocks confirms no useAppStore call inside either callback — only the hook-body-top read at line 13"
        status: pass
    human_judgment: false
  - id: D2
    description: "screen-pos.jsx POS-submit onSuccess invalidates ['orders', branchId]; screen-menu.jsx stock-toggle onSuccess invalidates ['menu', branchId]"
    requirement: SCOPE-01
    verification:
      - kind: unit
        ref: "src/__tests__/screen-menu.test.jsx#on success: invalidateQueries called with queryKey [menu, branchId]"
        status: pass
      - kind: other
        ref: "screen-pos.jsx has no dedicated invalidation-assertion test in the repo (screen-pos.test.jsx does not test the mutation's onSuccess invalidation call); verified by direct code inspection and the phase-gate grep audit (D5) instead"
        status: pass
    human_judgment: true
    rationale: "screen-pos.jsx's createOrder onSuccess invalidation was verified by code inspection and the zero-unscoped-matches grep audit, not a dedicated component-level test — no pre-existing test in screen-pos.test.jsx exercised this call site (unlike screen-menu.test.jsx, which already had one to update)."
  - id: D3
    description: "SC2: exact branch-scoped invalidateQueries leaves a sibling branch's cached entry untouched — mutating for branch-a does not clear qc.getQueryData(['orders','branch-b'])"
    requirement: SCOPE-01
    verification:
      - kind: unit
        ref: "src/__tests__/use-order-actions.test.js#updateStatus invalidates only current branch — sibling branch cache untouched (SC2)"
        status: pass
    human_judgment: false
  - id: D4
    description: "Phase-gate grep audit returns zero unscoped-key queryKey matches across src/ outside use-sse.js"
    requirement: SCOPE-01
    verification:
      - kind: other
        ref: "grep -rnE \"queryKey:\\s*\\['(orders|order|stats|menu|restaurant-settings|delivery-areas|history-orders)'\\]\" src/ --include=*.js --include=*.jsx | grep -v use-sse.js returns zero matches"
        status: pass
    human_judgment: false

duration: ~12min
completed: 2026-07-22
status: complete
---

# Phase 14 Plan 04: Branch-Scoped Cache — Mutation Invalidation Lockstep Summary

**Moved the three remaining mutation invalidation call sites (`use-order-actions.js`'s two mutations, `screen-pos.jsx` POS-submit, `screen-menu.jsx` stock-toggle) onto branch-scoped keys in lockstep with Plans 01-03's query-key retrofit, and proved SC2 — a branch-a mutation never touches branch-b's cache — with a dedicated automated test. This closes the final plan of Phase 14: all 7 query-key hooks and all 6 mutation-side invalidation sites are now branch-scoped.**

## Performance

- **Duration:** ~12 min
- **Completed:** 2026-07-22
- **Tasks:** 2 completed
- **Files modified:** 5 (3 source files, 2 test files — 1 new SC2 test file extension + 1 Rule-1 test fix)

## Accomplishments

- `use-order-actions.js`: added `import { useAppStore } from './store.js'`; `branchId` is read once at the top of `useOrderActions()`'s function body and closed over by both `updateStatus` and `updateEstimatedTime`'s `onSuccess` callbacks, each now invalidating `['orders', branchId]`, `['order', branchId]`, `['stats', branchId]`.
- `screen-pos.jsx`: added a `branchId` selector near the top of `PosScreen` (component already imported `useAppStore` for `pushToast`); `createOrder`'s `onSuccess` now invalidates `['orders', branchId]`.
- `screen-menu.jsx`: added a `branchId` selector near the top of `MenuScreen` (same pattern); `toggleStock`'s `onSuccess` now invalidates `['menu', branchId]`.
- `use-order-actions.test.js`: imported the real `useAppStore` (not mocked), added a `beforeEach` resetting `currentBranch` to `null`, updated the existing invalidation assertion to expect the branch-scoped key `['orders', 'branch-a']`, and added the SC2 sibling-branch-untouched test — the single most important assertable behavior in this phase: seed cache entries for `branch-a` and `branch-b`, mutate for `branch-a`, assert `branch-b`'s cached entry is unchanged.
- `screen-menu.test.jsx` (Rule 1 fix, out of the plan's declared `files_modified` but directly caused by this plan's `screen-menu.jsx` change): the pre-existing `'on success: invalidateQueries called with queryKey [menu]'` test asserted the old unscoped key and would have failed against the new branch-scoped invalidation. Updated the mocked `useAppStore` state to include `currentBranch: null` and the assertion to `{ queryKey: ['menu', null] }`.
- Confirmed via `grep -rn "resetQueries" src/` (zero matches) and a full phase-gate audit (`grep -rnE "queryKey:\s*\['(orders|order|stats|menu|restaurant-settings|delivery-areas|history-orders)'\]" src/ | grep -v use-sse.js`, zero matches) that every fetch-hook and mutation-invalidation call site in the codebase is now branch-scoped, except the intentionally-deferred `use-sse.js` writes (Phase 15 scope).

## Task Commits

Each task was committed atomically:

1. **Task 1: Branch-scope the three mutation invalidation call sites** - `08f0c9a` (feat)
2. **Task 2: SC2 sibling-branch-untouched test + branch-scoped-key assertion update** - `aeca763` (test)

## Files Created/Modified

- `src/use-order-actions.js` — `branchId` read once at hook-body top; both mutations' `onSuccess` invalidate the three branch-scoped keys
- `src/screen-pos.jsx` — added `branchId` selector; `createOrder` onSuccess invalidates `['orders', branchId]`
- `src/screen-menu.jsx` — added `branchId` selector; `toggleStock` onSuccess invalidates `['menu', branchId]`
- `src/__tests__/use-order-actions.test.js` — added `useAppStore` import + `beforeEach` reset; updated existing invalidation assertion to `['orders', 'branch-a']`; added new SC2 sibling-branch-untouched test
- `src/__tests__/screen-menu.test.jsx` — Rule 1 fix: `currentBranch: null` added to mocked store state; invalidation assertion updated to `['menu', null]`

## Decisions Made

- `branchId` is read exactly once at the top of each hook/component body in all three modified files and closed over by `onSuccess` callbacks — never re-read via `useAppStore` inside `onSuccess` itself, per Pitfall 4's prohibition. Verified by direct inspection (an `awk`-scoped grep of `use-order-actions.js`'s `onSuccess` blocks found the selector call only at the hook-body top, line 13).
- `screen-menu.test.jsx`'s stale invalidation assertion was fixed under Rule 1 (auto-fix bug) rather than left broken — the test's expectation was directly falsified by this plan's in-scope `screen-menu.jsx` change, and leaving it red would have contradicted the "full suite green" verification requirement.
- `screen-pos.jsx`'s new invalidation call site has no dedicated pre-existing test to update (unlike `screen-menu.jsx`), so no test file for it needed a Rule 1 fix; its correctness was verified by direct code inspection and the phase-gate grep audit instead (documented as `human_judgment: true` in the coverage table, mirroring Plan 14-01's precedent for `screen-orders.jsx`'s refresh button).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed stale invalidation-key assertion in screen-menu.test.jsx**
- **Found during:** Task 1 (full-suite safety check after the mutation retrofit)
- **Issue:** `screen-menu.test.jsx`'s `'on success: invalidateQueries called with queryKey [menu]'` test asserted the old unscoped key `{ queryKey: ['menu'] }`. Retrofitting `screen-menu.jsx`'s `toggleStock.onSuccess` to invalidate `['menu', branchId]` (this plan's Task 1) directly falsified this assertion, since the mocked `useAppStore` didn't define `currentBranch`, so the actual call became `{ queryKey: ['menu', null] }`.
- **Fix:** Added `currentBranch: null` to the mocked store state (clarifying intent) and updated the assertion to `{ queryKey: ['menu', null] }`.
- **Files modified:** `src/__tests__/screen-menu.test.jsx`
- **Commit:** `08f0c9a`

## Issues Encountered

Full-suite `npx vitest run` (extra safety check beyond this plan's own `<verify>` command) surfaces the same 2 pre-existing failing test files already flagged in Plans 14-02/14-03's SUMMARYs, confirmed unrelated to this plan's 5 files:
- `src/__tests__/offline-buttons.test.jsx` (2 failures) — `OrdersScreen` calls `useQueryClient()` since Plan 14-01's `screen-orders.jsx` change, but this test file never wraps it in a `QueryClientProvider`.
- `src/__tests__/build-pipeline.test.js` (1 failure) — `bundle.createUpdaterArtifacts` config drift, unrelated to branch-scoped cache work.

Both confirmed unrelated to this plan's commits (`08f0c9a`, `aeca763` touch only the 5 files listed above). Already logged in `.planning/phases/14-branch-scoped-cache-re-scoping/deferred-items.md` from Plan 14-02; not re-logged or fixed here.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Phase 14 (SCOPE-01) is now fully complete: all 7 fetch hooks (`use-orders`, `use-order-detail`, `use-stats`, `use-menu`, `use-restaurant-settings`, `use-delivery-areas`, `use-history-orders`) are branch-scoped, and all 6 mutation-side invalidation sites (`use-order-actions.js`'s 2 mutations x 3 keys, `screen-pos.jsx`, `screen-menu.jsx`, plus `screen-orders.jsx`'s manual refresh from Plan 14-01) invalidate in lockstep with the exact same branch-scoped keys. SC2 (sibling branch untouched) is proven by an automated test.

**Known accepted regression window (carried forward from Plans 14-01/02/03, unchanged by this plan):** `src/use-sse.js` still writes unscoped `['orders']`/`['stats']` keys that no hook reads anymore — SSE live updates stop reaching the UI until Phase 15 branch-prefixes those writes. This is an intentional phase boundary; call it out as a deploy-ordering constraint if Phase 14 and Phase 15 ship as separate deploys.

**Two pre-existing test failures flagged, not fixed** (see Issues Encountered / `deferred-items.md`) — out of scope for this plan's 5 files.

---
*Phase: 14-branch-scoped-cache-re-scoping*
*Completed: 2026-07-22*

## Self-Check: PASSED

All created/modified files found on disk (src/use-order-actions.js, src/screen-pos.jsx, src/screen-menu.jsx, src/__tests__/use-order-actions.test.js, src/__tests__/screen-menu.test.jsx, .planning/phases/14-branch-scoped-cache-re-scoping/14-04-SUMMARY.md). Both task commits (08f0c9a, aeca763) confirmed present in git log.
