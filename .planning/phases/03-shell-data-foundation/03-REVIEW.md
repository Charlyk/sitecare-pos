---
phase: 03-shell-data-foundation
reviewed: 2026-04-24T00:00:00Z
depth: standard
files_reviewed: 18
files_reviewed_list:
  - src/__tests__/i18n.test.js
  - src/__tests__/offline-banner.test.jsx
  - src/__tests__/offline-buttons.test.jsx
  - src/__tests__/use-orders.test.js
  - src/__tests__/use-sse.test.js
  - src/app.jsx
  - src/i18n.jsx
  - src/offline-banner.jsx
  - src/screen-detail.jsx
  - src/screen-kitchen.jsx
  - src/screen-orders.jsx
  - src/screen-pos.jsx
  - src/shell.jsx
  - src/styles.css
  - src/use-menu.js
  - src/use-order-actions.js
  - src/use-orders.js
  - src/use-sse.js
findings:
  critical: 1
  warning: 5
  info: 3
  total: 9
status: issues_found
---

# Phase 03: Code Review Report

**Reviewed:** 2026-04-24
**Depth:** standard
**Files Reviewed:** 18
**Status:** issues_found

## Summary

The phase-3 implementation is structurally sound. SSE connection lifecycle, TanStack Query cache
wiring, offline banner, and button-disabling are all correctly implemented and well-tested. The data
layer (use-orders, use-menu, use-order-actions) correctly follows the SDK-only rule from CLAUDE.md
and the v5 API.

One critical bug was found: `orderCount` in `app.jsx` reads the raw `o.status` field (uppercase SDK
values like `'NEW'`, `'COMPLETED'`) after `normalizeOrder` has already downcased that value into
`o.state`. The badge counts shown in the sidebar nav are therefore always 0 for authenticated
users.

Five additional warnings cover a null-dereference crash in `ThermalTicket`, stale mutation
handlers wired as empty callbacks, a useEffect missing dependency, an incorrect `onopen` signature,
and hardcoded test-data pollution in the stats strip.

---

## Critical Issues

### CR-01: orderCount reads raw `o.status` after normalizeOrder already maps it to `o.state`

**File:** `src/app.jsx:69-71`

**Issue:** `normalizeOrder` (called by both `useOrders` and `useSSE`) writes the lowercased status
into `o.state` and preserves the original SDK string in `o.status`. After normalization, `o.status`
is still `'NEW'` / `'COMPLETED'` / `'CANCELLED'` (uppercase), but `o.state` is `'new'` /
`'done'` etc.

The `orderCount` object filters on uppercase `o.status` strings:

```js
// current — always returns 0 counts because status is never uppercase 'done'/'new' after normalize
live: orders.filter(o => !['COMPLETED', 'CANCELLED'].includes(o.status)).length,
new:  orders.filter(o => o.status === 'NEW').length,
active: orders.filter(o => ['ACCEPTED', 'PREPARING'].includes(o.status)).length,
```

`normalizeOrder` in `data.jsx:189` sets `state: o.state ?? o.status?.toLowerCase() ?? 'new'` and
spreads `...o`, so `o.status` is still present and still uppercase. The sidebar badge for "live
orders" and the notification bubble on the bell icon both show wrong (0) counts.

**Fix:**

```js
const orderCount = {
  live:   orders.filter(o => !['done', 'cancelled'].includes(o.state)).length,
  new:    orders.filter(o => o.state === 'new').length,
  active: orders.filter(o => ['accepted', 'preparing'].includes(o.state)).length,
};
```

---

## Warnings

### WR-01: ThermalTicket crashes when `order.source` is undefined

**File:** `src/screen-detail.jsx:260`

**Issue:** `order.source.toUpperCase()` is called unconditionally. `normalizeOrder` sets a
`source` fallback only for the normalized path; however `OrderDetailScreen` receives its `order`
via `selectedOrder` from the Zustand store, which is set by `openOrder(order)` — and `openOrder`
is called with the already-normalized order from `useOrders`. In practice the fallback is present.
However the `ThermalTicket` function is a standalone export (`export { ThermalTicket }`) that may
be called elsewhere with a raw (non-normalized) order, and there is no guard:

```js
// line 260 — crashes if order.source is null/undefined
<span>{order.source.toUpperCase()}</span>
```

Likewise `order.payment.toUpperCase()` on line 293 crashes if `payment` is `null`.

**Fix:**

```jsx
// line 260
<span>{(order.source ?? 'counter').toUpperCase()}</span>

// line 293
<span>{(order.payment ?? 'cash').toUpperCase()}</span>
```

---

### WR-02: All mutating callbacks are no-ops — `useOrderActions` is never wired up

**File:** `src/app.jsx:106-109`

**Issue:** Every screen receives `onAdvance={() => {}}` and `onPrint={() => {}}`. The
`useOrderActions` hook exists and is correctly implemented, but it is not imported or called
anywhere in `app.jsx`. Pressing Accept / Start / Mark Ready / Complete does nothing and triggers no
network request. This is a functional regression: the offline-disabling logic works correctly, but
the online path is completely broken.

```jsx
// current — onAdvance is a no-op
{screen === 'orders' && <OrdersScreen ... onAdvance={() => {}} ... />}
```

**Fix:** Import `useOrderActions`, call it inside `App`, and wire `updateStatus.mutate` through
`onAdvance`:

```jsx
import { useOrderActions } from './use-order-actions.js';

// inside App():
const { updateStatus } = useOrderActions();

const handleAdvance = (order, toStatus) => {
  updateStatus.mutate({ id: order.id, currentStatus: order.state.toUpperCase(), toStatus: toStatus.toUpperCase() });
};

// in JSX:
<OrdersScreen ... onAdvance={handleAdvance} ... />
<KitchenScreen ... onAdvance={handleAdvance} ... />
<OrderDetailScreen ... onAdvance={handleAdvance} ... />
```

---

### WR-03: useEffect role-gate has missing `setScreen` dependency

**File:** `src/app.jsx:64-66`

**Issue:** The role-gate effect reads `screen` and calls `setScreen`, but only lists `[role]` in
its dependency array. React's rules of hooks require all values used inside an effect to be in the
dependency array. `setScreen` is a stable Zustand selector, so it never changes in practice, but
`screen` is a captured closure value that may go stale between renders.

```js
useEffect(() => {
  if (role === 'kitchen' && !['kitchen', 'orders'].includes(screen)) setScreen('kitchen');
}, [role]); // screen and setScreen are missing
```

A stale `screen` closure here means the guard could fire even when the user is already on
`kitchen` or `orders`, causing an unwanted navigation.

**Fix:**

```js
useEffect(() => {
  if (role === 'kitchen' && !['kitchen', 'orders'].includes(screen)) setScreen('kitchen');
}, [role, screen, setScreen]);
```

---

### WR-04: `onopen` handler is declared synchronous but the library awaits it — non-2xx responses will not mark the connection as failed

**File:** `src/use-sse.js:36-40`

**Issue:** The `@microsoft/fetch-event-source` library calls `await onopen(response)`. When
`response.ok` is `false` (e.g. 401, 503), the current implementation simply does nothing — it
neither sets `isConnected` to `false` nor throws, so the library falls through to stream parsing
with a non-stream body and then hits `onerror`. The connection state briefly shows as potentially
ambiguous rather than definitively `false`.

More importantly, the library's `defaultOnOpen` throws on non-`text/event-stream` content-type,
which is correct. The custom `onopen` bypasses this check entirely — if the server returns a
non-2xx with a JSON body, the library will not retry until `onerror` is invoked, but
`isConnected` may remain `true` from a previous successful open.

```js
onopen(response) {
  if (response.ok) {
    setIsConnected(true);
  }
  // non-ok response: falls through with no action
},
```

**Fix:** Throw on non-ok responses so the library routes through `onerror` immediately:

```js
async onopen(response) {
  if (response.ok) {
    setIsConnected(true);
    return;
  }
  // Non-2xx: throw so fetchEventSource routes to onerror and retries
  throw new Error(`SSE: server returned ${response.status}`);
},
```

---

### WR-05: Hardcoded `+ 24` in "Completed today" stat pollutes production data

**File:** `src/screen-orders.jsx:163`

**Issue:** The "Completed today" stat card adds a hardcoded `+ 24` to the real count:

```js
{ label: lang === 'ro' ? 'Finalizate azi' : 'Completed today',
  value: orders.filter(o => o.state === 'done').length + 24, ... }
```

This is a leftover prototype fixture value. It causes the UI to display a count that is always 24
higher than reality, which would confuse restaurant staff (e.g. 0 completed orders shown as 24).

**Fix:**

```js
value: orders.filter(o => o.state === 'done').length,
```

---

## Info

### IN-01: `Math.random()` in barcode rendering causes unnecessary re-renders

**File:** `src/screen-detail.jsx:303`

**Issue:** `Math.random()` is called inline during render to determine barcode bar widths. This
means every re-render (including parent state updates unrelated to the order) randomizes the
barcode appearance. While purely cosmetic, it also means React's reconciliation will always
replace every bar DOM node even when the order has not changed.

**Fix:** Derive the bar widths from a stable seed (e.g. the order ID characters) so the pattern is
deterministic across renders:

```jsx
// Derive widths from order.id characters — stable across re-renders
{[...order.id.replace('#', '') + '00'].map((ch, i) => (
  <div key={i} style={{ width: ch.charCodeAt(0) % 2 === 0 ? 2 : 1, height: 30, background: '#1a1a1a' }} />
))}
```

---

### IN-02: `useMenu` is implemented but never called in any screen

**File:** `src/use-menu.js` (all lines), `src/screen-pos.jsx:4`

**Issue:** `screen-pos.jsx` imports and uses `MENU_CATEGORIES` and `MENU_ITEMS` from the local
`data.jsx` fixture instead of calling `useMenu()`. The `useMenu` hook exists and is tested, but is
not consumed anywhere. This means the POS screen always shows hardcoded menu data rather than the
live server menu.

This is likely intentional scaffolding for Phase 4, but worth flagging so it is not forgotten.

**Fix (Phase 4):** Replace fixture imports in `screen-pos.jsx` with:

```js
import { useMenu } from './use-menu.js';
const { data: menuData } = useMenu();
const cats = menuData?.categories ?? [];
```

---

### IN-03: `screen-orders.jsx` stats filter on `o.state` but the filter panel counts check both `o.state` values correctly — minor inconsistency in "Completed today" counts across components

**File:** `src/screen-orders.jsx:161`

**Issue:** The "Active orders" stat reads `o.state !== 'done'` (correct), but the "Completed today"
stat (after removing the `+ 24` stub from WR-05) reads `o.state === 'done'`. The detail screen,
however, uses `'COMPLETED'` as a terminal label in some timeline labels. The terminology is
consistent within this file but `stateMeta` only maps `'done'` → "Finalizată", while the SDK
status `'COMPLETED'` (before normalization) maps to `'done'` via `normalizeOrder`. No functional
issue; noting for future SDK alignment.

---

_Reviewed: 2026-04-24_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
