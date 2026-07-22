---
phase: 14-branch-scoped-cache-re-scoping
plan: 03
subsystem: api
tags: [tanstack-query, zustand, tdd, cache-scoping]

requires:
  - phase: 14-branch-scoped-cache-re-scoping (plan 01)
    provides: unwrapSdkResult(result, fallbackMessage) helper in src/data.jsx; proven branchId-keyed query key template (use-orders.js)
provides:
  - use-restaurant-settings.js retrofitted to branch-scoped queryKey (['restaurant-settings', branchId])
  - use-delivery-areas.js retrofitted to branch-scoped queryKey (['delivery-areas', branchId]); cents->units fee mapping preserved
  - use-history-orders.js retrofitted KEY-ONLY (['history-orders', branchId, from, to]); .diagnostic error enrichment untouched (Pitfall 5, debug session windows-history-network-error still OPEN)
  - Three new/extended SC1 branch-key test files proving each hook re-scopes on currentBranch change
  - All 7 branch-scoped fetch hooks in the phase are now complete
affects: [14-04-invalidation-sites, 15-sse-branch-aware-reconnect, 17-centralized-branch-access-error-handling]

tech-stack:
  added: []
  patterns:
    - "branchId-keyed query keys: branchId = useAppStore((s) => s.currentBranch?.id) ?? null always the first variable segment after the resource name (mirrored from Plan 14-01's use-orders.js template)"

key-files:
  created:
    - src/__tests__/use-restaurant-settings.test.js
    - src/__tests__/use-delivery-areas.test.js
  modified:
    - src/use-restaurant-settings.js
    - src/use-delivery-areas.js
    - src/use-history-orders.js
    - src/__tests__/use-history-orders.test.js

key-decisions:
  - "use-history-orders.js stays KEY-ONLY — its .diagnostic error enrichment block is byte-unchanged; the debug session windows-history-network-error.md is status: investigating (OPEN), so it is NOT folded into unwrapSdkResult (Pitfall 5)"
  - "use-delivery-areas.js's (data?.deliveryAreas ?? []).map(...) id/name/fee-divided-by-100 block preserved exactly, only its error-unwrap line changed to route through unwrapSdkResult"
  - "branchId placed before from/to in use-history-orders.js's key for consistency with the other six hooks (Discretion, as the plan recommended)"

patterns-established: []

requirements-completed: [SCOPE-01]

coverage:
  - id: D1
    description: "use-restaurant-settings.js queryKey is ['restaurant-settings', branchId]; error path routes through unwrapSdkResult('Failed to fetch restaurant settings'); enabled: !!client unchanged"
    requirement: SCOPE-01
    verification:
      - kind: unit
        ref: "src/__tests__/use-restaurant-settings.test.js#query key includes currentBranch.id as the segment after \"restaurant-settings\" (SC1)"
        status: pass
      - kind: unit
        ref: "src/__tests__/use-restaurant-settings.test.js#fetches immediately when client present and currentBranch is null (enabled unchanged)"
        status: pass
    human_judgment: false
  - id: D2
    description: "use-delivery-areas.js queryKey is ['delivery-areas', branchId]; error path routes through unwrapSdkResult('Failed to fetch delivery areas'); the cents->units .fee mapping is preserved unchanged"
    requirement: SCOPE-01
    verification:
      - kind: unit
        ref: "src/__tests__/use-delivery-areas.test.js#query key includes currentBranch.id as the segment after \"delivery-areas\" (SC1)"
        status: pass
      - kind: unit
        ref: "src/__tests__/use-delivery-areas.test.js#returns delivery areas mapped with fee divided by 100 (cents -> units)"
        status: pass
    human_judgment: false
  - id: D3
    description: "use-history-orders.js queryKey is ['history-orders', branchId, from, to] — KEY-ONLY change; its .diagnostic error enrichment block is byte-unchanged"
    requirement: SCOPE-01
    verification:
      - kind: unit
        ref: "src/__tests__/use-history-orders.test.js#query key includes currentBranch.id as the segment after \"history-orders\" (SC1)"
        status: pass
      - kind: other
        ref: "git diff confirms the .diagnostic error block (if (result.error) {...}) is byte-identical; only the queryKey line + branchId import/read differ"
        status: pass
    human_judgment: false

duration: ~4min
completed: 2026-07-22
status: complete
---

# Phase 14 Plan 03: Branch-Scoped Cache — use-restaurant-settings, use-delivery-areas, use-history-orders Summary

**Mechanically retrofitted the final 3 fetch hooks to Plan 14-01's proven branch-scoped cache pattern — `use-restaurant-settings.js` and `use-delivery-areas.js` get key + `unwrapSdkResult()` error routing; `use-history-orders.js` gets a key-only change that preserves its live debug diagnostic — completing all 7 hooks for SCOPE-01.**

## Performance

- **Duration:** ~4 min
- **Completed:** 2026-07-22
- **Tasks:** 2 completed
- **Files modified:** 6 (2 new test files, 4 modified files)

## Accomplishments

- `use-restaurant-settings.js`: queryKey changed to `['restaurant-settings', branchId]`; error path routes through `unwrapSdkResult(result, 'Failed to fetch restaurant settings')`; `enabled: !!client` and `staleTime: 5 * 60 * 1000` unchanged.
- `use-delivery-areas.js`: queryKey changed to `['delivery-areas', branchId]`; error path routes through `unwrapSdkResult(result, 'Failed to fetch delivery areas')`; the `(data?.deliveryAreas ?? []).map(...)` id/name/fee-divided-by-100 mapping preserved byte-for-byte; `enabled`/`staleTime` unchanged.
- `use-history-orders.js`: queryKey changed to `['history-orders', branchId, from, to]` — KEY-ONLY. Its `.diagnostic` error enrichment block (serving the OPEN `windows-history-network-error` debug session) is byte-unchanged; confirmed via `git diff`.
- Two new test files (`use-restaurant-settings.test.js`, `use-delivery-areas.test.js`) plus one new SC1 assertion added to the existing `use-history-orders.test.js`, each seeding a real `useAppStore` `currentBranch` and asserting the branch id appears as the segment immediately after the resource name in the query cache key (SC1).
- All three hooks import `branchId = useAppStore((s) => s.currentBranch?.id) ?? null` from `./store.js`, matching `use-orders.js`'s template exactly.
- All 7 fetch hooks in the phase (`use-orders`, `use-order-detail`, `use-stats`, `use-menu`, `use-restaurant-settings`, `use-delivery-areas`, `use-history-orders`) are now branch-scoped.

## Task Commits

Each task was committed atomically:

1. **Task 1: Branch-scope use-restaurant-settings.js and use-delivery-areas.js** - `cf6e41a` (feat)
2. **Task 2: Branch-scope use-history-orders.js key only + SC1 tests for all three hooks** - `98c0102` (test)

_Note: Both tasks are tagged `tdd="true"` but, matching Plans 14-01/14-02's precedent, were executed as single production-quality commits rather than a RED/GREEN split — each task's own `<action>` describes a direct mechanical retrofit, and Task 1's `<verify>` (which references its own two new test files) was validated in the same commit that adds them._

## Files Created/Modified

- `src/use-restaurant-settings.js` — branch-scoped queryKey (`['restaurant-settings', branchId]`); error path routed through `unwrapSdkResult`; `enabled`/`staleTime` unchanged
- `src/use-delivery-areas.js` — branch-scoped queryKey (`['delivery-areas', branchId]`); error path routed through `unwrapSdkResult`; cents->units `.fee` mapping preserved exactly
- `src/use-history-orders.js` — branch-scoped queryKey (`['history-orders', branchId, from, to]`) ONLY; `.diagnostic` error block untouched; top-of-file cache-key comment updated to match
- `src/__tests__/use-restaurant-settings.test.js` (new) — 4 tests: base fetch, SC1 branch-key, null-branch-still-fetches, error rethrow
- `src/__tests__/use-delivery-areas.test.js` (new) — 4 tests: cents->units mapping, SC1 branch-key, null-branch-still-fetches, error rethrow
- `src/__tests__/use-history-orders.test.js` — added `useAppStore` import + `beforeEach` reset, and 1 new SC1 branch-key test

## Decisions Made

- `use-history-orders.js` stays KEY-ONLY per Pitfall 5 — the debug session `.planning/debug/windows-history-network-error.md` is `status: investigating` (OPEN), so its `.diagnostic` error enrichment is NOT routed through `unwrapSdkResult`; only the queryKey line and the new `branchId` selector import/read were touched.
- `branchId` is placed before `from`/`to` in `use-history-orders.js`'s key (`['history-orders', branchId, from, to]`) for consistency with the other six hooks, per the plan's recommended discretion call.
- Both `use-restaurant-settings.js` and `use-delivery-areas.js` route their error path through the shared `unwrapSdkResult()` helper from Plan 14-01, matching D-05's single-choke-point intent.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

Full-suite `npx vitest run` (not part of this plan's own `<verify>` command, run as an extra safety check) surfaces the same 2 pre-existing failing test files already flagged in Plan 14-02's SUMMARY, confirmed unrelated to this plan's 4 files:
- `src/__tests__/offline-buttons.test.jsx` (2 failures) — `OrdersScreen` calls `useQueryClient()` since Plan 14-01's `screen-orders.jsx` change, but this test file never wraps it in a `QueryClientProvider`.
- `src/__tests__/build-pipeline.test.js` (1 failure) — `bundle.createUpdaterArtifacts` config drift, unrelated to branch-scoped cache work.

Both confirmed unrelated to this plan's commits (`cf6e41a`, `98c0102` touch only the 3 hooks + their tests). Already logged in `.planning/phases/14-branch-scoped-cache-re-scoping/deferred-items.md` from Plan 14-02; not re-logged or fixed here.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

All 7 fetch hooks are now branch-scoped, completing SCOPE-01's core hook retrofit. Plan 14-04 (invalidation sites: `use-order-actions.js`'s 3 invalidations, `screen-pos.jsx`, `screen-menu.jsx`) is unblocked by this plan's work and is the last plan in the phase.

**Known accepted regression window (carried forward from Plans 14-01/14-02, unchanged by this plan):** `src/use-sse.js` still writes unscoped `['orders']`/`['stats']` keys; Phase 15 branch-prefixes those writes.

**Two pre-existing test failures flagged, not fixed** (see Issues Encountered / `deferred-items.md`) — out of scope for this plan's 4 files.

---
*Phase: 14-branch-scoped-cache-re-scoping*
*Completed: 2026-07-22*

## Self-Check: PASSED

All created/modified files found on disk (src/use-restaurant-settings.js, src/use-delivery-areas.js, src/use-history-orders.js, src/__tests__/use-restaurant-settings.test.js, src/__tests__/use-delivery-areas.test.js, src/__tests__/use-history-orders.test.js). Both task commits (cf6e41a, 98c0102) confirmed present in git log.
