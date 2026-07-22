---
phase: 13-branch-state-launch-seeding-foundation
plan: 02
subsystem: api
tags: [tanstack-query, react, admin-client, branches]

# Dependency graph
requires:
  - phase: 13-branch-state-launch-seeding-foundation (plan 01)
    provides: currentBranch Zustand field + getMe() launch-seeding (session-only single-branch fact)
provides:
  - useBranches() TanStack Query hook over client.me.branches.list() — the accessible-branches list data layer
affects: [phase-16-branch-switcher-ui, phase-17-branch-access-revocation-recovery]

# Tech tracking
tech-stack:
  added: []
  patterns: ["1:1 structural mirror of use-stats.js for {data,error}-style SDK calls"]

key-files:
  created: [src/use-branches.js, src/__tests__/use-branches.test.js]
  modified: []

key-decisions:
  - "queryKey is ['branches'] (not branch-prefixed) — deliberate, re-keying deferred to Phase 14 (D-09)"
  - "enabled: !!client only — no branchId/currentBranch gate, preserving SC5 single-branch first-paint timing"
  - "staleTime 30_000 (finite) + refetchOnWindowFocus: true — never cached indefinitely (D-09, T-13-03 mitigation)"
  - "No useBranchSwitch() and no app.jsx wiring this phase — deferred to Phase 16 (D-08), avoids dead code"

patterns-established:
  - "use-branches.js: {data,error}-unwrap queryFn mirroring use-stats.js exactly, for SDK calls that follow the fields-style contract (as opposed to getMe()'s throwing contract)"

requirements-completed: [BSTATE-02]

coverage:
  - id: D1
    description: "useBranches() hook fetches the accessible-branches list via client.me.branches.list() with {data,error} unwrap, gated on !!client only, finite staleTime, refetchOnWindowFocus true"
    requirement: "BSTATE-02"
    verification:
      - kind: unit
        ref: "src/__tests__/use-branches.test.js#useBranches — calls client.me.branches.list() and returns data (BSTATE-02)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Single-branch (one-element) and empty accessible-branches lists both pass through unchanged, with no special-casing and no first-paint gating regression (SC5)"
    requirement: "BSTATE-02"
    verification:
      - kind: unit
        ref: "src/__tests__/use-branches.test.js#single-branch tenant (one-element list) passes through unchanged (edge/empty)"
        status: pass
      - kind: unit
        ref: "src/__tests__/use-branches.test.js#empty accessible-branches list passes through unchanged (edge/empty)"
        status: pass
    human_judgment: false

# Metrics
duration: 8min
completed: 2026-07-22
status: complete
---

# Phase 13 Plan 02: useBranches Hook Summary

**['branches']-keyed TanStack Query hook over client.me.branches.list(), mirroring use-stats.js's {data,error} unwrap, with enabled:!!client and finite staleTime — the accessible-branches list data layer with no UI consumer yet (D-08)**

## Performance

- **Duration:** 8 min
- **Started:** 2026-07-22T14:30:00Z
- **Completed:** 2026-07-22T14:38:00Z
- **Tasks:** 1 (TDD: RED + GREEN)
- **Files modified:** 2 (both new)

## Accomplishments
- `useBranches()` hook created as a 1:1 structural mirror of `use-stats.js`, fetching `client.me.branches.list()` via the `{data,error}` fields-style unwrap
- `enabled: !!client` is the sole gate — no `branchId`/`currentBranch` clause, preserving the SC5 single-branch first-paint regression check
- `staleTime: 30_000` (finite) + `refetchOnWindowFocus: true` — the list is never pinned stale indefinitely, satisfying D-09 and mitigating T-13-03 (stale-trust information disclosure on revoked access)
- Test suite covers success, `{data,error}` throw-on-error, enabled-gate-off, finite-staleTime + focus-refetch assertion (read directly off the QueryClient cache), and both single-branch and empty-list edges

## Task Commits

Each task was committed atomically (TDD RED → GREEN):

1. **Task 1 (RED): failing test for useBranches** - `325e6a5` (test)
2. **Task 1 (GREEN): implement useBranches hook** - `b546f75` (feat)

**Plan metadata:** (final commit hash below, this commit)

_TDD task: RED (test) → GREEN (feat) — no REFACTOR commit needed, implementation matched the RESEARCH/PATTERNS spec exactly on first pass._

## Files Created/Modified
- `src/use-branches.js` - New hook: `useBranches()`, `['branches']`-keyed useQuery over `client.me.branches.list()`
- `src/__tests__/use-branches.test.js` - New test file: 6 tests covering success, error-throw, enabled-gate, staleTime/focus-refetch, and single/empty-list edges

## Decisions Made
None beyond the plan's own PLANNER discretion (staleTime 30_000 to match use-stats.js/use-orders.js precedent, already specified in PLAN.md's `assumptions`). Followed PATTERNS.md's exact code template verbatim.

## Deviations from Plan

None - plan executed exactly as written. The hook implementation matches the PATTERNS.md §src/use-branches.js template character-for-character (queryKey, {data,error} unwrap, enabled gate, staleTime, refetchOnWindowFocus).

## Known Stubs

None - `useBranches()` is a complete, self-contained data hook. It intentionally has no UI consumer this phase (D-08, deferred to Phase 16) — this is a documented plan decision, not a stub; there is no hardcoded/placeholder value flowing to any UI.

## Threat Flags

None - the only new surface (`client.me.branches.list()` crossing into the TanStack Query cache) was already identified and dispositioned in the plan's own `<threat_model>` (T-13-03, T-13-04), both `mitigate`d as designed (finite staleTime + refetchOnWindowFocus; `{data,error}` throw into query error state). No new undocumented surface introduced.

## Issues Encountered

Full test suite (`npx vitest run`) shows 2 pre-existing failures unrelated to this plan's files (`src/__tests__/build-pipeline.test.js` — tauri.conf.json `createUpdaterArtifacts` assertion; `src/__tests__/offline-buttons.test.jsx` — missing `QueryClientProvider` wrapper around `OrdersScreen` in that test's harness). Confirmed via `git log` that both files predate Phase 13 and are out of this plan's `files_modified` scope. Logged to `.planning/phases/13-branch-state-launch-seeding-foundation/deferred-items.md`, not fixed (Scope Boundary rule).

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- `useBranches()` is ready for Phase 16's branch switcher UI to consume directly (no rework expected — hook is architecturally identical to the shipped `useStats()`/`useOrders()` hooks)
- Query key `['branches']` is NOT branch-prefixed; Phase 14 owns any re-keying work if needed
- Phase 13 (branch-state-launch-seeding-foundation) is now fully complete: plan 01 (currentBranch Zustand state + getMe() launch seeding + D-04 focus-retry) and plan 02 (this plan, useBranches hook) both shipped

---
*Phase: 13-branch-state-launch-seeding-foundation*
*Completed: 2026-07-22*
