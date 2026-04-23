---
phase: 03-shell-data-foundation
plan: "03"
subsystem: data-hooks
tags: [tanstack-query, sse, fetch-event-source, hooks, real-time]
dependency_graph:
  requires: [03-01, 03-02]
  provides: [use-sse, use-orders, use-menu, use-order-actions]
  affects: [03-05, 03-06, phase-04-screens]
tech_stack:
  added: []
  patterns:
    - TanStack Query v5 useQuery with single options object
    - TanStack Query v5 useMutation with .isPending
    - fetchEventSource SSE with Bearer token in Authorization header
    - setQueryData upsert pattern (no network refetch on SSE event)
    - invalidateQueries on mutation success for cache consistency
key_files:
  created:
    - src/use-sse.js
    - src/use-orders.js
    - src/use-menu.js
    - src/use-order-actions.js
  modified:
    - src/__tests__/use-orders.test.js
decisions:
  - "useSSE uses setQueryData for order_new events — not invalidateQueries — to avoid network round-trip on every SSE event"
  - "useOrders staleTime=30s (SSE keeps cache fresh; polling is fallback only)"
  - "useMenu staleTime=5 minutes (menus change infrequently)"
  - "useOrderActions.updateStatus uses estimatedMinutes != null (not truthy check) to allow 0-minute updates"
  - "vi.doMock replaced with hoisted vi.mock in use-orders.test.js (Rule 1 auto-fix)"
metrics:
  duration: "4m 18s"
  completed_date: "2026-04-23"
  tasks_completed: 2
  tasks_total: 2
  files_created: 4
  files_modified: 1
---

# Phase 03 Plan 03: Data Hooks Summary

**One-liner:** Four TanStack Query v5 hooks wiring `@charlyk/admin-client` to React — useSSE with fetchEventSource Bearer auth + cache upsert, useOrders/useMenu as guarded queries, useOrderActions as mutation wrappers with cache invalidation.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Write use-sse.js (D-01 through D-09, KDS-01) | c835ee8 | src/use-sse.js |
| 2 | Write use-orders.js, use-menu.js, use-order-actions.js (D-13, D-14, D-15) | 1cc1a9c | src/use-orders.js, src/use-menu.js, src/use-order-actions.js, src/__tests__/use-orders.test.js |

## Verification Results

```
Test Files  2 passed (2)
Tests       9 passed (9)

use-sse.test.js:    6 passed (U9a, U9b, U9c — isConnected transitions, cache upsert, ping no-op)
use-orders.test.js: 3 passed (U11a, U11b — useOrders fetches, enabled guard, useMenu returns data)
```

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed vi.doMock → vi.mock in use-orders.test.js**
- **Found during:** Task 2 verification
- **Issue:** The Wave 0 test stub used `vi.doMock('../auth.jsx')` inside individual test cases. In vitest's ESM module proxy system, `vi.doMock` (non-hoisted) cannot affect module bindings that were already resolved via static imports at the top of the test file. Calling `useOrders()` invoked the real `useAuth()` which threw `"useAuth must be used inside <AuthProvider>"`.
- **Fix:** Replaced `vi.doMock` with a top-level hoisted `vi.mock('../auth.jsx', () => ({ useAuth: vi.fn() }))`. Added import of `useAuth` from `'../auth.jsx'` at the top. Replaced per-test `vi.doMock(...)` calls with `useAuth.mockReturnValue(...)` — equivalent behavior, correct vitest module proxy interception.
- **Files modified:** `src/__tests__/use-orders.test.js`
- **Commit:** 1cc1a9c
- **Test intent preserved:** Same three tests verify same behaviors (orders fetch, enabled guard, menu fetch).

## Key Implementation Notes

### useSSE (D-01 to D-09, KDS-01)
- SSE URL split: `/v1/sse/orders` in dev (Vite proxy), absolute URL in prod (import.meta.env.DEV guard)
- `fetchEventSource` with `Authorization: Bearer ${token}` header — token NEVER in URL
- `setQueryData(['orders'], upsert)` — updates or appends orders without network refetch
- `onerror` returns `undefined` to allow library retry with exponential backoff (NOT throw)
- AbortController cleanup on unmount prevents memory leak

### useOrders (D-13)
- Cache key: `['orders']` or `['orders', status]` depending on status argument
- `enabled: !!client` — no query runs before auth completes
- staleTime: 30s (SSE keeps cache warm; polling is only fallback)

### useMenu (D-14)
- Cache key: `['menu']`
- staleTime: 5 minutes (300,000ms) — menus change infrequently

### useOrderActions (D-15)
- `updateStatus`: uses `estimatedMinutes != null` (not falsy check) — allows `estimatedMinutes: 0` if ever needed
- `updateEstimatedTime`: simple path+body mutation
- Both mutations: `invalidateQueries({ queryKey: ['orders'] })` on success — triggers re-fetch to sync server-computed fields

## Success Criteria Check

- [x] src/use-sse.js exists — `fetchEventSource` + Bearer header + `setQueryData` + ping no-op + `import.meta.env.DEV` split
- [x] src/use-orders.js exists — `enabled: !!client`, `staleTime: 30_000`, `['orders']` cache key
- [x] src/use-menu.js exists — `enabled: !!client`, `staleTime: 5 * 60 * 1000`, `['menu']` cache key
- [x] src/use-order-actions.js exists — `useMutation`, `invalidateQueries(['orders'])` on success
- [x] use-sse.test.js: 6 tests pass (U9a, U9b, U9c)
- [x] use-orders.test.js: 3 tests pass (U11a, U11b)
- [x] useSSE uses `setQueryData` (not `invalidateQueries`) for SSE events
- [x] useOrders/useMenu use `enabled: !!client` guard
- [x] useOrderActions uses `.isPending`-compatible `useMutation` (TanStack v5)

## Self-Check: PASSED

**Files exist:**
- FOUND: src/use-sse.js
- FOUND: src/use-orders.js
- FOUND: src/use-menu.js
- FOUND: src/use-order-actions.js

**Commits exist:**
- c835ee8 feat(03-03): implement useSSE persistent SSE hook
- 1cc1a9c feat(03-03): implement useOrders, useMenu, useOrderActions data hooks
