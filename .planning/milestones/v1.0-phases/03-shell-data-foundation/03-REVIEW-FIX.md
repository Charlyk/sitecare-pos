---
phase: 03-shell-data-foundation
fixed_at: 2026-04-24T11:11:03Z
review_path: .planning/phases/03-shell-data-foundation/03-REVIEW.md
iteration: 1
fix_scope: critical_warning
findings_in_scope: 6
fixed: 6
skipped: 0
status: all_fixed
---

# Phase 03: Code Review Fix Report

**Fixed at:** 2026-04-24T11:11:03Z
**Source review:** .planning/phases/03-shell-data-foundation/03-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 6
- Fixed: 6
- Skipped: 0

## Fixed Issues

### CR-01: orderCount reads raw `o.status` after normalizeOrder already maps it to `o.state`

**Files modified:** `src/app.jsx`
**Commit:** 39c45c9
**Applied fix:** Changed all three `orderCount` filter predicates from uppercase `o.status` comparisons (`'COMPLETED'`, `'CANCELLED'`, `'NEW'`, `'ACCEPTED'`, `'PREPARING'`) to lowercase `o.state` comparisons (`'done'`, `'cancelled'`, `'new'`, `'accepted'`, `'preparing'`). Sidebar badge counts and bell notification counts now correctly reflect live order state.

---

### WR-01: ThermalTicket crashes when `order.source` or `order.payment` is undefined

**Files modified:** `src/screen-detail.jsx`
**Commit:** 6ce342e
**Applied fix:** Added null-coalescing fallbacks on both unsafe `.toUpperCase()` calls: `order.source.toUpperCase()` → `(order.source ?? 'counter').toUpperCase()` (line 260) and `order.payment.toUpperCase()` → `(order.payment ?? 'cash').toUpperCase()` (line 293).

---

### WR-02: All mutating callbacks are no-ops — `useOrderActions` is never wired up

**Files modified:** `src/app.jsx`
**Commit:** 7801998
**Applied fix:** Imported `useOrderActions` from `./use-order-actions.js`, called it inside `App()` to get `updateStatus`, defined a `handleAdvance(order, toStatus)` function that calls `updateStatus.mutate` with uppercased status values, and passed `handleAdvance` as the `onAdvance` prop to `OrdersScreen`, `KitchenScreen`, and `OrderDetailScreen` (replacing all three `() => {}` no-ops).

---

### WR-03: useEffect role-gate has missing `screen` and `setScreen` dependencies

**Files modified:** `src/app.jsx`
**Commit:** 3e20ba9
**Applied fix:** Changed dependency array from `[role]` to `[role, screen, setScreen]` so the role-gate effect re-evaluates whenever the current screen changes, preventing stale closure from triggering unwanted navigation.

---

### WR-04: `onopen` handler is synchronous and does nothing on non-2xx responses

**Files modified:** `src/use-sse.js`
**Commit:** 7d67f80
**Applied fix:** Made `onopen` `async`, added early `return` after the happy-path `setIsConnected(true)` call, and added `throw new Error(`SSE: server returned ${response.status}`)` for non-ok responses so `fetchEventSource` immediately routes to `onerror` and triggers its retry backoff rather than silently falling through.

---

### WR-05: Hardcoded `+ 24` in "Completed today" stat pollutes production data

**Files modified:** `src/screen-orders.jsx`
**Commit:** 4690229
**Applied fix:** Removed the `+ 24` addition from the "Completed today" stat value expression. The stat now displays the real count of orders with `state === 'done'`.

---

## Skipped Issues

None — all findings were fixed.

---

_Fixed: 2026-04-24T11:11:03Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
