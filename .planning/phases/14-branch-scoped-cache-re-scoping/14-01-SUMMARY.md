---
phase: 14-branch-scoped-cache-re-scoping
plan: 01
subsystem: api
tags: [tanstack-query, zustand, tdd, cache-scoping]

requires:
  - phase: 13-branch-state-launch-seeding-foundation
    provides: currentBranch session-only Zustand state (store.js:68), seeded by AuthProvider cold-start
provides:
  - unwrapSdkResult(result, fallbackMessage) helper in src/data.jsx — shared SDK {data,error} unwrap with err.code
  - use-orders.js retrofitted to branch-scoped queryKey (['orders', branchId] / ['orders', branchId, status])
  - screen-orders.jsx manual refresh invalidating ['orders', branchId] + ['stats', branchId] in lockstep
  - The proven template for Plans 02-04 to mechanically expand to the remaining 6 hooks and invalidation sites
affects: [14-02-use-order-detail-use-stats, 14-03-use-menu-use-history-use-settings-use-delivery, 14-04-invalidation-sites, 15-sse-branch-aware-reconnect, 17-centralized-branch-access-error-handling]

tech-stack:
  added: []
  patterns:
    - "branchId-keyed query keys: branchId = useAppStore((s) => s.currentBranch?.id) ?? null always the first variable segment after the resource name"
    - "unwrapSdkResult(result, fallbackMessage) as the single choke point for SDK error-envelope unwrapping, attaching err.code"

key-files:
  created:
    - src/__tests__/data-unwrap-sdk-result.test.js
  modified:
    - src/data.jsx
    - src/use-orders.js
    - src/screen-orders.jsx
    - src/__tests__/use-orders.test.js

key-decisions:
  - "branchId is always present in the key (currentBranch?.id ?? null), never a variable-length fork — keeps scoped/unscoped key shapes from ever coexisting (D-07)"
  - "enabled stays !!client only, no !!branchId gate — single-branch tenants and the non-401 cold-start-null-branch state must still fetch immediately (D-08)"
  - "unwrapSdkResult reads err.code from result.error.error (or the bare string), never result.error.code — the installed SDK's generic error type is { error: string } with no .code field (RESEARCH Pitfall 1 correction, carried into the plan's own build-time note)"

patterns-established:
  - "unwrapSdkResult(result, fallbackMessage): shared SDK {data,error} envelope unwrap colocated in data.jsx alongside normalizeOrder — Plans 02-03 route the remaining 6 hooks through it (except use-history-orders.js, which preserves its own diagnostic error enrichment per Pitfall 5)"
  - "Branch-scoped query key retrofit: queryKey folds branchId as the fixed second segment; all invalidation call sites read the same currentBranch?.id selector and invalidate with the exact branch-scoped key, never a bare unscoped prefix"

requirements-completed: [SCOPE-01]

coverage:
  - id: D1
    description: "unwrapSdkResult(result, fallbackMessage) exists in src/data.jsx: returns result.data unchanged when no error; throws an Error with err.code populated from result.error.error or the bare string when result.error is truthy"
    requirement: SCOPE-01
    verification:
      - kind: unit
        ref: "src/__tests__/data-unwrap-sdk-result.test.js#unwrapSdkResult (D-05, SC3)"
        status: pass
    human_judgment: false
  - id: D2
    description: "use-orders.js queryKey is branch-scoped (['orders', branchId] / ['orders', branchId, status]) and reacts to currentBranch changes; enabled stays !!client only"
    requirement: SCOPE-01
    verification:
      - kind: unit
        ref: "src/__tests__/use-orders.test.js#U11a — useOrders query key includes currentBranch.id as the segment after \"orders\" (SC1)"
        status: pass
      - kind: unit
        ref: "src/__tests__/use-orders.test.js#U11a — useOrders fetches immediately when client present and currentBranch is null (SC4)"
        status: pass
    human_judgment: false
  - id: D3
    description: "screen-orders.jsx manual refresh button invalidates ['orders', branchId] and ['stats', branchId] in lockstep with the key change"
    requirement: SCOPE-01
    verification:
      - kind: unit
        ref: "src/__tests__/use-orders.test.js (queryKey retrofit proven; invalidation call site verified by code review/grep, no dedicated component test in this plan)"
        status: pass
    human_judgment: true
    rationale: "The refresh button's onClick invalidation call was verified by direct code inspection and grep, not by a dedicated component-level test in this plan — Plan 04 (invalidation sites) is where the remaining invalidation call sites get systematic test coverage."

duration: ~10min (execution time; excludes the tracer feedback checkpoint wait)
completed: 2026-07-22
status: complete
---

# Phase 14 Plan 01: Branch-Scoped Cache Tracer Slice Summary

**Proved the branch-scoped cache pattern end-to-end on `useOrders` — `unwrapSdkResult()` helper, `['orders', branchId]` key, and lockstep invalidation — as the template for Plans 02–04 to mechanically expand to the remaining 6 hooks and invalidation sites.**

## Performance

- **Duration:** ~10 min execution (tracer feedback checkpoint added a human-verification pause per the interactive-mode tracer protocol)
- **Completed:** 2026-07-22
- **Tasks:** 2 completed
- **Files modified:** 5 (1 new test file, 4 modified)

## Accomplishments

- Added `unwrapSdkResult(result, fallbackMessage)` to `src/data.jsx`, colocated with `normalizeOrder` — the single choke point Phase 17's centralized `onError` handler will consume via `err.code`.
- Retrofitted `src/use-orders.js` to a branch-scoped query key (`['orders', branchId]` / `['orders', branchId, status]`) with `branchId = useAppStore((s) => s.currentBranch?.id) ?? null`, while leaving `enabled: !!client` and `staleTime: 30_000` untouched.
- Moved `src/screen-orders.jsx`'s manual refresh button invalidation to `['orders', branchId]` + `['stats', branchId]` in lockstep with the key change.
- Proved the slice with tests: a new `data-unwrap-sdk-result.test.js` (pass-through + both error shapes populate `err.code`), and two new assertions in `use-orders.test.js` (SC1 branch-key-change, SC4 null-branch-still-fetches).
- Human-verified the tracer via the mandatory tracer feedback checkpoint before proceeding to Task 2 (interactive-mode gate, auto_advance was false) — approved as the template for Plans 02–04.

## Task Commits

Each task was committed atomically:

1. **Task 1: End-to-end branch-scoped "orders" slice — helper + key + invalidation, one path** - `93083f9` (feat)
2. **Task 2: Prove the slice — unwrapSdkResult unit test + use-orders SC1/SC4 assertions** - `e1bc5f6` (test)

_Note: Task 1 was tagged `tdd="true"` and `type="tracer"` — it was executed and committed as a single real, production-quality commit (not RED/GREEN split across commits), matching the plan's explicit `<action>` instructions which describe the full retrofit as one unit. Task 2 adds the dedicated proof tests as its own commit._

## Files Created/Modified

- `src/data.jsx` — added exported `unwrapSdkResult(result, fallbackMessage)`, colocated with `normalizeOrder`
- `src/use-orders.js` — branch-scoped queryKey; error path routed through `unwrapSdkResult`; `enabled`/`staleTime` unchanged
- `src/screen-orders.jsx` — added `branchId` selector; refresh button invalidates branch-scoped `['orders', branchId]` + `['stats', branchId]`
- `src/__tests__/data-unwrap-sdk-result.test.js` (new) — 3 unit tests for the helper
- `src/__tests__/use-orders.test.js` — added `useAppStore` import + `beforeEach` reset, and 2 new tests (SC1 key-change, SC4 null-branch-fetch)

## Decisions Made

- branchId is always present in the key shape (`currentBranch?.id ?? null`), never a variable-length fork — per D-07, so scoped and unscoped key shapes never coexist and exact invalidation always matches.
- `enabled: !!client` stays the sole gate; never `!!branchId` — per D-08, preserving no first-paint delay for single-branch tenants and the non-401 cold-start null-branch state.
- `unwrapSdkResult`'s `err.code` is populated from `result.error.error` (or the bare string), not a nonexistent `result.error.code` — the plan's own build-time correction of D-05's literal text, matching the installed SDK's actual `{ error: string }` error envelope.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None. The tracer feedback gate (mandatory pause after a `type="tracer"` task in interactive mode) triggered as expected since `workflow.auto_advance` and `workflow._auto_chain_active` were both `false`; the coordinator reviewed and approved the tracer at commit `93083f9` before Task 2 proceeded.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

The branch-scoped-cache pattern (key shape, `unwrapSdkResult` helper, lockstep invalidation, test scaffolding) is proven and approved. Plans 02–04 can mechanically expand this exact pattern to the remaining 6 hooks (`use-order-detail.js`, `use-stats.js`, `use-menu.js`, `use-history-orders.js` — key-only, preserving its diagnostic error path per Pitfall 5 — `use-restaurant-settings.js`, `use-delivery-areas.js`), `use-order-actions.js`'s 3 invalidation calls, and the `screen-pos.jsx` / `screen-menu.jsx` invalidation call sites.

**Known accepted regression window (carried forward, not fixed here):** `src/use-sse.js` still writes unscoped `['orders']`/`['stats']` keys that no hook reads anymore after this plan — SSE live updates stop reaching the UI until Phase 15 branch-prefixes those writes. This is an intentional phase boundary; call it out as a deploy-ordering constraint if Phase 14 and Phase 15 ship as separate deploys.

---
*Phase: 14-branch-scoped-cache-re-scoping*
*Completed: 2026-07-22*

## Self-Check: PASSED

All created/modified files found on disk (src/data.jsx, src/use-orders.js, src/screen-orders.jsx, src/__tests__/data-unwrap-sdk-result.test.js, src/__tests__/use-orders.test.js). Both task commits (93083f9, e1bc5f6) confirmed present in git log.
