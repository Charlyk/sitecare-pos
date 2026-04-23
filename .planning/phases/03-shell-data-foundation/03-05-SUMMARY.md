---
phase: 03-shell-data-foundation
plan: 05
subsystem: ui
tags: [react, tanstack-query, sse, offline, zustand, vitest]

# Dependency graph
requires:
  - phase: 03-shell-data-foundation
    provides: useSSE (03-03), OfflineBanner (03-04), useOrders (03-03)
provides:
  - "useSSE mounted unconditionally at App() top level, isOffline derived from isConnected"
  - "isOffline prop flows from App → Shell → all 7 screen branches"
  - "OfflineBanner conditionally rendered inside Shell's .content div"
  - "orderCount derived from live useOrders() data (replaces hardcoded zeros)"
  - "4 mutating screens apply btn-disabled-offline class + disabled attr when offline"
affects:
  - 03-06
  - phase-04-core-screens

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Hook ordering rule: useSSE + useOrders called at App() top level before any conditional return to respect React hook rules"
    - "Offline button pattern: className with conditional ' btn-disabled-offline' modifier + disabled={isOffline} attribute"
    - "SDK/prototype field normalisation: order.state ?? order.status?.toLowerCase() fallback in screen components"

key-files:
  created: []
  modified:
    - src/app.jsx
    - src/shell.jsx
    - src/screen-orders.jsx
    - src/screen-kitchen.jsx
    - src/screen-pos.jsx
    - src/screen-detail.jsx

key-decisions:
  - "useSSE and useOrders called unconditionally at App() top before coldStartBusy/isAuthenticated guards — React hook ordering rule"
  - "orderCount uses SDK uppercase status strings (COMPLETED, CANCELLED, NEW, ACCEPTED, PREPARING) matching live API response shape"
  - "Screen components normalise SDK flat fields (status, customerName, orderType) to prototype shape (state, customer.name, type) defensively — Rule 2 fix for test compatibility"
  - "mutation stubs onAdvance/onCreate remain as () => {} placeholders — wired in 03-06 via useOrderActions"

patterns-established:
  - "Offline button: className={`btn-primary${isOffline ? ' btn-disabled-offline' : ''}`} disabled={isOffline}"
  - "SDK/prototype shape bridge: order.state ?? order.status?.toLowerCase() ?? 'new'"

requirements-completed:
  - KDS-01
  - OFF-01
  - OFF-02
  - OFF-03

# Metrics
duration: 18min
completed: 2026-04-23
---

# Phase 3 Plan 05: Integration — SSE + isOffline + OfflineBanner Summary

**End-to-end offline flow wired: useSSE mounted in App, isOffline flows to Shell and all 7 screens, OfflineBanner renders in .content, 4 mutating buttons disabled with btn-disabled-offline class; all 77 tests green**

## Performance

- **Duration:** ~18 min
- **Started:** 2026-04-23T23:09:00Z
- **Completed:** 2026-04-23T23:17:00Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- Mounted `useSSE(token)` and `useOrders()` unconditionally at the top of `App()`, before all conditional returns, respecting React hook ordering rules
- Replaced hardcoded `orderCount = { live: 0, new: 0, active: 0 }` stub with live derivation from `useOrders()` data using SDK uppercase status strings
- Wired `isOffline={!isConnected}` through Shell to all 7 screen branches; Shell conditionally renders `<OfflineBanner>` as first child of `.content`
- Applied `btn-disabled-offline` class and `disabled` attribute to advance buttons in OrdersScreen, KitchenScreen, PosScreen (ring-up), and OrderDetailScreen

## Task Commits

1. **Task 1: Wire app.jsx** - `c8f1aac` (feat)
2. **Task 2: Wire shell.jsx + 4 mutating screens** - `76b97c5` (feat)

## Files Created/Modified

- `src/app.jsx` — imports useSSE + useOrders; token from useAuth; isConnected/isOffline derived; orderCount from live data; isOffline passed to Shell and all 7 screens; orders array passed to OrdersScreen/KitchenScreen
- `src/shell.jsx` — imports OfflineBanner; isOffline added to signature; banner rendered conditionally above {children} in .content
- `src/screen-orders.jsx` — isOffline added to OrderCard + OrdersScreen signatures; advance button gets btn-disabled-offline + disabled; SDK/prototype field normalisation (state, customerName, placedAt)
- `src/screen-kitchen.jsx` — isOffline added to KitchenScreen + KitchenTicket; advance button gets btn-disabled-offline + disabled; _state normalisation for SDK/prototype compatibility; queue/active/ready filters use normalised _state
- `src/screen-pos.jsx` — isOffline added to PosScreen; ring-up button disabled when offline OR cart empty; btn-disabled-offline added
- `src/screen-detail.jsx` — isOffline added to OrderDetailScreen; advance (btn-terracotta) gets btn-disabled-offline + disabled

## Decisions Made

- **Hook ordering** — useSSE and useOrders called at the very top of App(), before `if (coldStartBusy)` and `if (!isAuthenticated)` guards. The `if (!token)` guard inside useSSE safely handles the null-token cold-start case.
- **SDK status field capitalisation** — orderCount filters use uppercase strings (`'NEW'`, `'COMPLETED'`, `'ACCEPTED'`, `'PREPARING'`, `'CANCELLED'`) to match the live API response shape. Screen-level state normalisation uses `.toLowerCase()` for prototype rendering code compatibility.
- **Defensive field normalisation in screens** — `order.state ?? order.status?.toLowerCase() ?? 'new'` bridges SDK (flat fields) and prototype (nested customer, lowercase state) shapes. Required for Wave 0 test fixtures to pass without modifying the tests.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Defensive SDK/prototype field normalisation in OrderCard and KitchenTicket**
- **Found during:** Task 2 (offline-buttons test run)
- **Issue:** Test mock uses SDK field names (`status: 'NEW'`, `customerName`, `orderType`, `createdAt`) but screens read prototype fields (`order.state`, `order.customer.name`, `order.type`, `order.placedAt`). Screen crashed with `Cannot read properties of undefined (reading 'name')` at `order.customer.name`. The advance button never rendered because `nextAction` lookup on undefined `order.state` returned undefined.
- **Fix:** Added field normalisation at the top of OrderCard and KitchenTicket: `state = order.state ?? order.status?.toLowerCase() ?? 'new'`, `customerName = order.customer?.name ?? order.customerName ?? ''`, etc. KitchenScreen queue/active/ready filters normalised via `_state` property on spread orders.
- **Files modified:** `src/screen-orders.jsx`, `src/screen-kitchen.jsx`
- **Verification:** All 3 U12 offline-button tests pass; all 77 tests green
- **Committed in:** `76b97c5` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - bug)
**Impact on plan:** Necessary for test correctness. The Wave 0 test stubs (03-01) used SDK data shape; screens were Phase 1 prototype-shape code. Normalisation bridges both without changing test fixtures or breaking the prototype rendering.

## Known Stubs

| Stub | File | Line | Reason |
|------|------|------|--------|
| `onAdvance={() => {}}` | `src/app.jsx` | 106-109 | Mutation handler placeholder; wired in plan 03-06 via useOrderActions |
| `onCreate={() => {}}` | `src/app.jsx` | 108 | POS create order placeholder; wired in plan 03-06 |
| `onPrint={() => {}}` | `src/app.jsx` | 106, 109 | Print handler placeholder; wired in Phase 5 (thermal printing) |

These stubs do not prevent plan 03-05's goal (offline UI wiring is complete). The buttons are correctly disabled offline; the mutation logic is intentionally deferred.

## Issues Encountered

- Vitest must be run from the worktree directory (`/…/worktrees/agent-a00f7b3b`), not from the main project root. Running from the main root causes vitest to resolve imports from the unmodified main-branch source files, making tests appear to fail on pre-modification code.

## Next Phase Readiness

- Plan 03-06 (useOrderActions) can now wire `onAdvance`, `onCreate`, and `onPrint` handlers into the screen router
- All offline UI infrastructure is complete: banner, disabled buttons, isOffline prop chain
- Full test suite is green (77/77)

---
*Phase: 03-shell-data-foundation*
*Completed: 2026-04-23*
