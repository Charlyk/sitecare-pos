---
phase: 07-history-screen-foundation
plan: 03
subsystem: api
tags: [tanstack-query, react-hooks, admin-client, history]

requires:
  - phase: 07-history-screen-foundation (Plan 01)
    provides: getLast30DaysRange() and normalizeOrder's dailyOrderNumber ?? dailyNumber fallback
provides:
  - "useHistoryOrders() — TanStack Query hook fetching last 30 days of orders from client.admin.orders.list"
  - "['history-orders', from, to] cache key root, collision-free with the SSE-owned ['orders'] root"
affects: [07-04 (HistoryScreen consumes this hook), 07-06 (app.jsx router)]

tech-stack:
  added: []
  patterns:
    - "Lazy useState initializer for a one-time-computed value (getLast30DaysRange()) to keep a query key stable across re-renders"
    - "Thin fetch+normalize hook returning the raw array as `data` (no `{ ...rest, orders }` wrapper) when the SDK response has no sibling fields worth preserving"

key-files:
  created:
    - src/use-history-orders.js
    - src/__tests__/use-history-orders.test.js
  modified: []

key-decisions:
  - "useHistoryOrders() calls the last-30-days window via getLast30DaysRange() through useState's lazy initializer, never inline — prevents an infinite refetch loop from a churning query key"
  - "Hook's data is the order array itself (not { ...rest, orders }) since AdminOrderListResponse has no sibling fields worth preserving"
  - "No SSE wiring in this hook — History is a past-orders archive; staleTime: 30_000 alone is sufficient per CONTEXT.md"

patterns-established:
  - "Query key root ['history-orders', from, to] is deliberately distinct from the SSE-owned ['orders'] root to prevent cache collision (T-07-08, mitigated)"

requirements-completed: [HIST-02, HIST-03]

coverage:
  - id: D1
    description: "useHistoryOrders() fetches the last 30 days from client.admin.orders.list({ query: { from, to } }) on mount with no user interaction"
    requirement: "HIST-03"
    verification:
      - kind: unit
        ref: "src/__tests__/use-history-orders.test.js#calls client.admin.orders.list exactly once with { query: { from, to } }"
        status: pass
      - kind: unit
        ref: "src/__tests__/use-history-orders.test.js#from/to span the same 30-day window as getLast30DaysRange()"
        status: pass
    human_judgment: false
  - id: D2
    description: "Hook calls the admin endpoint (client.admin.orders.list), never the kitchen endpoint (HIST-02)"
    requirement: "HIST-02"
    verification:
      - kind: unit
        ref: "src/__tests__/use-history-orders.test.js — mock client exposes only admin.orders.list, no kitchen namespace defined"
        status: pass
    human_judgment: false
  - id: D3
    description: "Orders are normalized via normalizeOrder (cents→RON, dailyOrderNumber fallback chain)"
    requirement: "HIST-02"
    verification:
      - kind: unit
        ref: "src/__tests__/use-history-orders.test.js#resolves dailyOrderNumber via Plan 01 fallback and total cents→RON via normalizeOrder"
        status: pass
    human_judgment: false
  - id: D4
    description: "Empty, null, and missing orders responses resolve to [] without throwing"
    verification:
      - kind: unit
        ref: "src/__tests__/use-history-orders.test.js — empty orders array / null orders / missing orders key describe block"
        status: pass
    human_judgment: false
  - id: D5
    description: "SDK errors are rethrown as Error with a fallback message when the response has no message field"
    verification:
      - kind: unit
        ref: "src/__tests__/use-history-orders.test.js — error handling describe block (2 tests)"
        status: pass
    human_judgment: false
  - id: D6
    description: "Query key root ['history-orders', from, to] is distinct from and never collides with the SSE-owned ['orders'] root"
    requirement: "HIST-02"
    verification:
      - kind: unit
        ref: "grep -v '^//' src/use-history-orders.js | grep -c \"\\['orders'\\]\" returns 0"
        status: pass
    human_judgment: false

duration: 5min
completed: 2026-07-17
status: complete
---

# Phase 7 Plan 03: useHistoryOrders Hook Summary

**TanStack Query hook fetching the last 30 days of orders via `client.admin.orders.list`, with a collision-free `['history-orders', from, to]` cache key and normalizeOrder-based normalization.**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-07-17T01:29:00Z
- **Completed:** 2026-07-17T01:30:34Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Created `src/use-history-orders.js` exporting `useHistoryOrders()` — fetches the admin endpoint's last-30-days window on mount, no user interaction required
- Query key root `['history-orders', from, to]` established as structurally distinct from the SSE-owned `['orders']` root, preventing the high-severity cache-collision threat (T-07-08) identified in the plan's threat model
- 11 unit tests covering: endpoint correctness, window correctness, normalization, empty/null/missing-key response shapes, error rethrow (with and without a message field), disabled-when-no-client, ordering preservation, and query-key stability across re-renders

## Task Commits

Each task was committed atomically:

1. **Task 1: Write failing tests for useHistoryOrders (Wave 0 scaffold)** - `f52b7d5` (test)
2. **Task 2: Implement useHistoryOrders and turn the suite GREEN** - `511c549` (feat)

_TDD gate sequence verified: `test(07-03)` commit precedes `feat(07-03)` commit — RED before GREEN._

## Files Created/Modified
- `src/use-history-orders.js` - `useHistoryOrders()` hook: fetches `client.admin.orders.list({ query: { from, to } })` via a lazily-initialized 30-day window, normalizes via `normalizeOrder`, guards null/missing orders arrays
- `src/__tests__/use-history-orders.test.js` - 11 tests encoding every behavior in the plan's `<behavior>` block

## Decisions Made
- Hook returns the order array directly as `data` (unlike `use-orders.js`'s `{ ...rest, orders }` shape) since `AdminOrderListResponse` carries no sibling fields worth preserving — matches the plan's explicit instruction
- No SSE wiring added — CONTEXT.md left this to discretion and `staleTime: 30_000` is sufficient for a past-orders archive with no live feed

## Deviations from Plan

**1. [Rule 3 - Blocking, minor] Removed the literal word "kitchen" from code comments to satisfy acceptance-criteria grep checks**
- **Found during:** Task 1 and Task 2 (writing test file and hook comments)
- **Issue:** The plan's acceptance criteria required `grep -c "kitchen" <file>` to return `0` on both the test file and the hook file. Initial drafts used the word "kitchen" in explanatory comments (e.g., "no kitchen namespace defined", "live kitchen-shaped orders") which the plan intended as a code-content check (no `client.kitchen.*` calls), but the literal grep also matches comments.
- **Fix:** Reworded comments to avoid the literal string "kitchen" while preserving the same explanatory intent (e.g., "no other order-list namespace is defined", "live order data").
- **Files modified:** `src/__tests__/use-history-orders.test.js`, `src/use-history-orders.js`
- **Verification:** `grep -c "kitchen" src/use-history-orders.js` and the same on the test file both return `0`; all 11 tests still pass after the wording change.
- **Committed in:** `f52b7d5`, `511c549` (part of each task's own commit — comments were adjusted before the initial commit of each file, no extra commit needed)

---

**Total deviations:** 1 auto-fixed (wording-only, Rule 3 category but trivial — no functional/behavioral change)
**Impact on plan:** None on functionality. Pure comment wording adjustment to satisfy a literal grep-based acceptance criterion.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- `useHistoryOrders()` is ready for Plan 04 (HistoryScreen) to consume directly
- Full test suite remains at 236 passing / 3 failing (11 new tests added; the 3 pre-existing failures — `build-pipeline.test.js` updater config and 2 `offline-buttons.test.jsx` QueryClientProvider-wrapper failures — are unchanged and unrelated to this plan, per `deferred-items.md`)
- No blockers for Wave 3 (07-04)

---
*Phase: 07-history-screen-foundation*
*Completed: 2026-07-17*

## Self-Check: PASSED

- FOUND: src/use-history-orders.js
- FOUND: src/__tests__/use-history-orders.test.js
- FOUND: f52b7d5 (test commit)
- FOUND: 511c549 (feat commit)
