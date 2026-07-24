---
phase: 14-branch-scoped-cache-re-scoping
plan: 02
subsystem: api
tags: [tanstack-query, zustand, tdd, cache-scoping]

requires:
  - phase: 14-branch-scoped-cache-re-scoping (plan 01)
    provides: unwrapSdkResult(result, fallbackMessage) helper in src/data.jsx; proven branchId-keyed query key template (use-orders.js)
provides:
  - use-order-detail.js retrofitted to branch-scoped queryKey (['order', branchId, id])
  - use-stats.js retrofitted to branch-scoped queryKey (['stats', branchId])
  - use-menu.js retrofitted to branch-scoped queryKey (['menu', branchId])
  - Three new SC1 branch-key test files proving each hook re-scopes on currentBranch change
affects: [14-03-use-history-orders-use-restaurant-settings-use-delivery-areas, 14-04-invalidation-sites, 15-sse-branch-aware-reconnect, 17-centralized-branch-access-error-handling]

tech-stack:
  added: []
  patterns:
    - "branchId-keyed query keys: branchId = useAppStore((s) => s.currentBranch?.id) ?? null always the first variable segment after the resource name (mirrored from Plan 14-01's use-orders.js template)"

key-files:
  created:
    - src/__tests__/use-order-detail.test.js
    - src/__tests__/use-stats.test.js
    - src/__tests__/use-menu.test.js
  modified:
    - src/use-order-detail.js
    - src/use-stats.js
    - src/use-menu.js

key-decisions:
  - "use-order-detail.js's enabled: !!client && !!id left exactly as-is — id-gating is unrelated to branch-gating; only unwrapSdkResult() and the branchId key segment were added"
  - "unwrapSdkResult() import added to all three hooks per D-05; each hook's error line now routes through the shared helper instead of its own inline if (result.error) throw"

patterns-established: []

requirements-completed: [SCOPE-01]

coverage:
  - id: D1
    description: "use-order-detail.js queryKey is ['order', branchId, id]; error path routes through unwrapSdkResult('Failed to get order'); enabled: !!client && !!id unchanged"
    requirement: SCOPE-01
    verification:
      - kind: unit
        ref: "src/__tests__/use-order-detail.test.js#query key includes currentBranch.id as the segment after \"order\" (SC1)"
        status: pass
      - kind: unit
        ref: "src/__tests__/use-order-detail.test.js#does not run when id is missing, even with client present (enabled unchanged)"
        status: pass
    human_judgment: false
  - id: D2
    description: "use-stats.js queryKey is ['stats', branchId]; error path routes through unwrapSdkResult('Failed to load stats'); enabled: !!client unchanged, never gated on branchId"
    requirement: SCOPE-01
    verification:
      - kind: unit
        ref: "src/__tests__/use-stats.test.js#query key includes currentBranch.id as the segment after \"stats\" (SC1)"
        status: pass
      - kind: unit
        ref: "src/__tests__/use-stats.test.js#fetches immediately when client present and currentBranch is null (enabled unchanged)"
        status: pass
    human_judgment: false
  - id: D3
    description: "use-menu.js queryKey is ['menu', branchId]; error path routes through unwrapSdkResult('Failed to list menu'); enabled/staleTime unchanged"
    requirement: SCOPE-01
    verification:
      - kind: unit
        ref: "src/__tests__/use-menu.test.js#query key includes currentBranch.id as the segment after \"menu\" (SC1)"
        status: pass
      - kind: unit
        ref: "src/__tests__/use-menu.test.js#fetches immediately when client present and currentBranch is null (enabled unchanged)"
        status: pass
    human_judgment: false

duration: ~5min
completed: 2026-07-22
status: complete
---

# Phase 14 Plan 02: Branch-Scoped Cache — use-order-detail, use-stats, use-menu Summary

**Mechanically retrofitted `use-order-detail.js`, `use-stats.js`, and `use-menu.js` to Plan 14-01's proven branch-scoped cache pattern — branchId-keyed queryKey plus `unwrapSdkResult()` error routing — with a dedicated SC1 branch-key test per hook.**

## Performance

- **Duration:** ~5 min
- **Completed:** 2026-07-22
- **Tasks:** 2 completed
- **Files modified:** 6 (3 modified hooks, 3 new test files)

## Accomplishments

- `use-order-detail.js`: queryKey changed to `['order', branchId, id]`; error path now routes through `unwrapSdkResult(result, 'Failed to get order')`; `enabled: !!client && !!id` and `staleTime: 0` left untouched.
- `use-stats.js`: queryKey changed to `['stats', branchId]`; error path routes through `unwrapSdkResult(result, 'Failed to load stats')`; `enabled: !!client` and `staleTime: 30_000` unchanged.
- `use-menu.js`: queryKey changed to `['menu', branchId]`; error path routes through `unwrapSdkResult(result, 'Failed to list menu')`; `enabled: !!client` and `staleTime: 5 * 60 * 1000` unchanged.
- Three new test files (`use-order-detail.test.js`, `use-stats.test.js`, `use-menu.test.js`) each seed a real `useAppStore` `currentBranch` and assert the branch id appears as the segment immediately after the resource name in the query cache key (SC1), plus base-fetch and null-branch-still-fetches coverage.
- All three hooks import `branchId = useAppStore((s) => s.currentBranch?.id) ?? null` from `./store.js`, mirroring `use-orders.js`'s template exactly.

## Task Commits

Each task was committed atomically:

1. **Task 1: Branch-scope use-order-detail.js and use-stats.js** - `b4b2754` (feat)
2. **Task 2: Branch-scope use-menu.js + SC1 tests for all three hooks** - `1f96fe5` (test)

_Note: Task 1 is tagged `tdd="true"` but, matching Plan 14-01's precedent, was executed as a single production-quality commit rather than a RED/GREEN split — the plan's own `<action>` describes a direct mechanical retrofit with no new test file in Task 1's `<files>` list; Task 1's own `<verify>` command references test files that Task 2 creates, so it was validated together with Task 2's verify step rather than in isolation._

## Files Created/Modified

- `src/use-order-detail.js` — branch-scoped queryKey (`['order', branchId, id]`); error path routed through `unwrapSdkResult`; `enabled`/`staleTime` unchanged
- `src/use-stats.js` — branch-scoped queryKey (`['stats', branchId]`); error path routed through `unwrapSdkResult`; `enabled`/`staleTime` unchanged
- `src/use-menu.js` — branch-scoped queryKey (`['menu', branchId]`); error path routed through `unwrapSdkResult`; `enabled`/`staleTime` unchanged
- `src/__tests__/use-order-detail.test.js` (new) — 3 tests: base fetch, SC1 branch-key, id-gating unchanged
- `src/__tests__/use-stats.test.js` (new) — 3 tests: base fetch, SC1 branch-key, null-branch-still-fetches
- `src/__tests__/use-menu.test.js` (new) — 2 tests: SC1 branch-key, null-branch-still-fetches (base fetch/staleTime already covered by `use-orders.test.js`'s U11b block)

## Decisions Made

- `use-order-detail.js`'s `enabled: !!client && !!id` is left byte-identical — id-gating is orthogonal to branch-gating and D-08 only forbids adding `!!branchId`, not touching the existing `!!id` term.
- All three hooks route their error path through the shared `unwrapSdkResult()` helper from Plan 14-01, rather than keeping their own inline `if (result.error) throw new Error(...)` — matches D-05's single-choke-point intent.

## Deviations from Plan

None - plan executed exactly as written. (See Task Commits note above for a documentation clarification on Task 1's tdd/verify sequencing, not a functional deviation.)

## Issues Encountered

Full-suite `npx vitest run` (not part of this plan's own `<verify>` command, run as an extra safety check) surfaced 2 pre-existing failing test files unrelated to this plan's 3 files:
- `src/__tests__/offline-buttons.test.jsx` (2 failures) — `OrdersScreen` calls `useQueryClient()` since Plan 14-01's `screen-orders.jsx` change, but this test file never wraps it in a `QueryClientProvider`.
- `src/__tests__/build-pipeline.test.js` (1 failure) — `bundle.createUpdaterArtifacts` config drift, unrelated to branch-scoped cache work.

Both confirmed via `git diff 17b4c00 HEAD` to be untouched by any Plan 14-02 commit (17b4c00 is Plan 14-01's tip). Logged to `.planning/phases/14-branch-scoped-cache-re-scoping/deferred-items.md` per the executor's scope-boundary rule; not fixed here.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

`use-order-detail.js`, `use-stats.js`, and `use-menu.js` are branch-scoped and error-routed through `unwrapSdkResult`, matching the Plan 14-01 template exactly. Plan 14-03 can mechanically retrofit the remaining 3 hooks (`use-history-orders.js` — key-only, preserving its diagnostic error path per Pitfall 5 — `use-restaurant-settings.js`, `use-delivery-areas.js`). Plan 14-04 (invalidation sites: `use-order-actions.js`'s 3 invalidations, `screen-pos.jsx`, `screen-menu.jsx`) is unblocked by this plan's work but not addressed here.

**Known accepted regression window (carried forward from Plan 14-01, unchanged by this plan):** `src/use-sse.js` still writes unscoped `['orders']`/`['stats']` keys; Phase 15 branch-prefixes those writes.

**Two pre-existing test failures flagged, not fixed** (see Issues Encountered / `deferred-items.md`) — out of scope for this plan's 3 files.

---
*Phase: 14-branch-scoped-cache-re-scoping*
*Completed: 2026-07-22*

## Self-Check: PASSED

All created/modified files found on disk (src/use-order-detail.js, src/use-stats.js, src/use-menu.js, src/__tests__/use-order-detail.test.js, src/__tests__/use-stats.test.js, src/__tests__/use-menu.test.js). Both task commits (b4b2754, 1f96fe5) confirmed present in git log.
