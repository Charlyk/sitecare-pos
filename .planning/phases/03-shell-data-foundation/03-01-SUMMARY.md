---
phase: 03-shell-data-foundation
plan: 01
subsystem: testing
tags: [vitest, react-testing-library, tanstack-query, sse, offline, i18n]

# Dependency graph
requires:
  - phase: 02-authentication
    provides: auth.jsx useAuth hook, vi.mock patterns for Tauri modules

provides:
  - Wave 0 failing test stubs for KDS-01, OFF-01, OFF-02, OFF-03
  - Test contracts: useSSE hook interface (isConnected, cache upsert, ping guard)
  - Test contracts: OfflineBanner component interface (lang prop, className, i18n keys)
  - Test contracts: useOrders/useMenu hook interfaces (SDK query, enabled guard)
  - Test contracts: isOffline prop on OrdersScreen and KitchenScreen (.btn-disabled-offline class)
  - Extended i18n.test.js with U13 offline_ key completeness checks

affects:
  - 03-02 (useSSE implementation — must satisfy U9a, U9b, U9c)
  - 03-03 (useOrders/useMenu implementation — must satisfy U11a, U11b)
  - 03-04 (OfflineBanner + i18n keys — must satisfy U10, U13)
  - 03-05 (offline button prop — must satisfy U12)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Wave 0 test stubs: import source module that doesn't exist yet — Vite reports clean 'Cannot find module' RED"
    - "vi.mock hoisting: vi.mock() calls at top of file before imports (Vitest hoisting requirement)"
    - "QueryClient wrapper: createElement(QueryClientProvider, { client }, children) pattern for hook tests"
    - "Per-test queryClient: instantiate fresh QueryClient inside each describe block that tests cache behavior"

key-files:
  created:
    - src/__tests__/use-sse.test.js
    - src/__tests__/offline-banner.test.jsx
    - src/__tests__/use-orders.test.js
    - src/__tests__/offline-buttons.test.jsx
  modified:
    - src/__tests__/i18n.test.js

key-decisions:
  - "Wave 0 test stubs import non-existent source files intentionally — clean RED via Vite module resolution failure, not syntax error"
  - "offline-buttons.test.jsx imports screen-orders.jsx and screen-kitchen.jsx directly (they exist) — RED via missing isOffline prop behavior"
  - "U13 symmetry tests pass immediately (both ro and en have zero offline_ keys — empty sets match); value tests RED until i18n keys added in plan 03-04"

patterns-established:
  - "RED stubs: Vite 'Cannot find module' is the canonical RED failure mode for Wave 0 stubs"
  - "Per-describe queryClient: each cache-mutation describe block creates its own QueryClient instance to avoid cross-test pollution"

requirements-completed:
  - KDS-01
  - OFF-01
  - OFF-02
  - OFF-03

# Metrics
duration: 2min
completed: 2026-04-23
---

# Phase 3 Plan 01: Shell + Data Foundation — Wave 0 Test Stubs Summary

**Five TDD stub files establishing test contracts for SSE cache upsert, offline banner, useOrders/useMenu hooks, and isOffline button gating — all RED until implementation plans execute**

## Performance

- **Duration:** 2 min
- **Started:** 2026-04-23T19:48:20Z
- **Completed:** 2026-04-23T19:50:48Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- Created `use-sse.test.js` with 6 tests across 3 describe blocks (U9a/U9b/U9c) covering KDS-01: isConnected state, order_new cache upsert (new + update), and ping no-op guard
- Created `offline-banner.test.jsx` (U10), `use-orders.test.js` (U11a/U11b), `offline-buttons.test.jsx` (U12) covering OFF-01, OFF-02, OFF-03 respectively
- Extended `i18n.test.js` with U13 offline_ key bilingual completeness tests (OFF-01); 12 existing U8 tests remain passing

## Task Commits

Each task was committed atomically:

1. **Task 1: Create use-sse.test.js stub (KDS-01)** - `cfe9059` (test)
2. **Task 2: Create offline-banner/use-orders/offline-buttons stubs + extend i18n** - `7f640b3` (test)

## Files Created/Modified

- `src/__tests__/use-sse.test.js` — U9 (KDS-01): 6 failing tests for useSSE hook behavior
- `src/__tests__/offline-banner.test.jsx` — U10 (OFF-01): 5 failing tests for OfflineBanner component
- `src/__tests__/use-orders.test.js` — U11 (OFF-02): 3 failing tests for useOrders and useMenu hooks
- `src/__tests__/offline-buttons.test.jsx` — U12 (OFF-03): 3 failing tests for isOffline disabled button state
- `src/__tests__/i18n.test.js` — U13 (OFF-01): 4 tests added for offline_ i18n keys (2 RED, 2 PASS)

## Decisions Made

- Wave 0 stubs import non-existent source files to produce Vite "Cannot find module" RED failures rather than test assertion failures — this is the canonical pattern; clean error, no confusion with future assertion failures
- `offline-buttons.test.jsx` renders existing `screen-orders.jsx` and `screen-kitchen.jsx` directly — RED via assertion failure (no `.btn-disabled-offline` class yet) rather than missing module; this is correct since the screens already exist and just need the prop wired
- U13 symmetry tests pass immediately and intentionally: with zero `offline_` keys in both languages, the symmetry check (empty set matches empty set) is vacuously true; the value tests for `offline_banner_title` and `offline_banner_sub` are RED until plan 03-04 adds the i18n keys

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Wave 0 test contracts are in place for all 4 requirements: KDS-01, OFF-01, OFF-02, OFF-03
- Plans 03-02 through 03-05 can now execute and turn these stubs GREEN
- No blockers; existing Phase 2 test infrastructure (U3, U6, U8, store, auth-schedule) remains 100% green

---
*Phase: 03-shell-data-foundation*
*Completed: 2026-04-23*
