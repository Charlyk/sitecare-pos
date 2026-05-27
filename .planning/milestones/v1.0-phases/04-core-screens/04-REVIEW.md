---
phase: 04-core-screens
reviewed: 2026-04-27T20:07:05Z
depth: standard
files_reviewed: 18
files_reviewed_list:
  - src/__tests__/accept-dialog.test.jsx
  - src/__tests__/cancel-dialog.test.jsx
  - src/__tests__/screen-kitchen.test.jsx
  - src/__tests__/screen-menu.test.jsx
  - src/__tests__/screen-orders.test.jsx
  - src/__tests__/screen-pos.test.jsx
  - src/__tests__/screen-settings.test.jsx
  - src/__tests__/store.test.js
  - src/__tests__/use-order-actions.test.js
  - src/__tests__/use-sse.test.js
  - src/app.jsx
  - src/i18n.jsx
  - src/screen-kitchen.jsx
  - src/screen-menu.jsx
  - src/screen-pos.jsx
  - src/screen-settings.jsx
  - src/store.js
  - src/use-sse.js
findings:
  critical: 4
  warning: 7
  info: 3
  total: 14
status: issues_found
---

# Phase 4: Code Review Report

**Reviewed:** 2026-04-27T20:07:05Z
**Depth:** standard
**Files Reviewed:** 18
**Status:** issues_found

## Summary

Phase 4 delivers KDS sound alerts, SSE wiring, AcceptDialog/CancelDialog API integration, POS order creation, MenuScreen live stock toggling, and a new Display tab in SettingsScreen. The overall architecture is sound and follows the state-split contract (Zustand for UI, TanStack Query for server state). However, four blockers were found: the table number is silently dropped from POS submissions; the discount encoding for pct mode sends the wrong unit to the API; `order.customer.name` is accessed without a null guard inside AcceptDialog (crash risk when the field is absent); and the SSE `snapshotDone` ref is never reset on reconnection, causing a window where live orders after a reconnect are silently dropped from sound notification. Seven warnings cover: `isOffline` not wired to the Ring Up button, dead `visible` variable, sound file path mismatch with the spec, test coverage gaps (all action tests are `test.todo`), a stale-data risk when navigating from a cancelled order, and incorrect dismiss-button label documented in cancel-dialog tests.

---

## Critical Issues

### CR-01: Table number silently dropped from POS API submission

**File:** `src/screen-pos.jsx:57, 192-217`
**Issue:** `table` is captured in React state (line 57: `useState('7')`) and displayed to staff in the dine-in form (line 296), but it is never included in the `body` object sent to `client.kitchen.orders.create` (lines 192–217). Staff can enter table 12, submit the order, and the kitchen receives no table assignment. This is a data loss bug: the field is shown to the user but silently discarded.
**Fix:**
```js
const body = {
  orderType: orderTypeMap[type],
  items: cart.map(it => ({ ... })),
  // Add this line:
  ...(type === 'dinein' && table ? { tableNumber: table } : {}),
  ...(customer.name  ? { customerName: customer.name }  : {}),
  // ... rest unchanged
};
```
Confirm the exact SDK field name (`tableNumber`, `table`, or `tableId`) against `@charlyk/admin-client` types before shipping.

---

### CR-02: Wrong unit sent for percentage discount — API receives percent integer, not RON cents

**File:** `src/screen-pos.jsx:187-190`
**Issue:** D-12 (RESEARCH.md line 25) and the UI-SPEC (04-UI-SPEC.md line 321) both state that `discountAmount` should be the computed RON value passed to the API. For `pct` mode the implementation instead sends `Math.round(discountVal)` — that is, the raw percentage integer (e.g., `10` for a 10% discount) — while `discountType: 'percent'` is also sent. If the API interprets `discountAmount` as a monetary amount (in cents) regardless of `discountType`, a 10% discount will be treated as a 0.10 RON discount instead of the correct computed amount. Even if the API understands `percent` type, `Math.round` discards fractional percentages (15.5% → 16%) without rounding at the correct precision.

Per D-12 and 04-UI-SPEC.md the correct approach is to calculate the RON amount client-side and send that:
```js
// pct mode: compute RON amount, convert to cents
const sdkDiscountAmount = hasDiscount
  ? (discountMode === 'pct'
      ? Math.round((subtotal * discountVal / 100) * 100)  // RON → cents
      : Math.round(discountVal * 100))                     // RON → cents (unchanged)
  : undefined;
const sdkDiscountType = hasDiscount ? (discountMode === 'pct' ? 'percent' : 'fixed') : undefined;
```
If the API accepts a `percent` type with the percent value (not RON), align the `discountType` key name and value with the actual SDK contract — but the current code sends two conflicting signals (`discountType: 'percent'` yet `discountAmount` is the raw percent integer), which will produce an incorrect result under either interpretation.

---

### CR-03: `order.customer.name` accessed without null guard — crash in AcceptDialog

**File:** `src/app.jsx:277`
**Issue:** Inside `AcceptDialog`, the order summary line reads:
```jsx
{order.customer.name} {order.items.length} {t('items')} {formatRON(order.total)}
```
`normalizeOrder` in `data.jsx` (line 223) constructs `customer` as `o.customer ?? { name: o.customerName ?? '', phone: ... }`. If `o.customer` is `null` (possible when the server omits the field on certain order types, e.g. counter orders with no registered customer) the fallback fires and `customer.name` is `''` — safe. However, if an order arrives via SSE before `normalizeOrder` runs and is passed directly into `acceptDialog.order` (the store sets `acceptDialog: { order }` at line 100 from the raw `order` prop), and that raw order has `customer: null`, then `order.customer.name` crashes with `TypeError: Cannot read properties of null (reading 'name')`.

The AcceptDialog is opened via `handleAdvance` which receives orders from `orders` (the TanStack Query cache, already normalised by `useOrders`). However, KitchenScreen also calls `onAdvance` with raw normalised orders that pass through KitchenTicket's `_state` augmentation without re-normalising (screen-kitchen.jsx line 21-22). If a raw SDK response has `customer: null`, the crash occurs.

**Fix:**
```jsx
{order.customer?.name} {order.items?.length ?? 0} {t('items')} {formatRON(order.total)}
```

---

### CR-04: `snapshotDone` ref not reset on reconnection — live orders silently skip sound after reconnect

**File:** `src/use-sse.js:21, 42, 66`
**Issue:** `snapshotDone` is a `useRef(false)` (line 21) that is set to `true` once via `setTimeout(..., 100)` inside `onopen` (line 42). The cleanup function (line 88) aborts the SSE connection, which triggers `onerror` → `setIsConnected(false)`. On the next reconnect attempt, `fetchEventSource` fires `onopen` again and schedules a new `setTimeout` — but `snapshotDone.current` is already `true` from the previous connection. The 100ms silent window logic is correct only on the very first connect.

More critically: after a connection drop and reconnect, the server replays the snapshot batch again. Because `snapshotDone.current` is already `true`, `onLiveOrderRef.current` is called for every snapshot order, triggering a notification sound for every order in the queue on every reconnect — not just truly new live orders.

**Fix:** Reset `snapshotDone.current` to `false` at the start of the SSE effect so each reconnect gets a fresh snapshot window:
```js
useEffect(() => {
  if (!token) { setIsConnected(false); return; }

  snapshotDone.current = false;  // Reset on every (re)connect
  const ctrl = new AbortController();
  // ... rest unchanged
}, [token, queryClient]);
```

---

## Warnings

### WR-01: `isOffline` received by `PosScreen` but not wired to the Ring Up button

**File:** `src/screen-pos.jsx:14, 437`
**Issue:** `PosScreen` accepts `isOffline` as a prop (line 14) but the Ring Up button's `disabled` check (line 437) is:
```js
disabled={cart.length === 0 || createOrder.isPending || (type === 'delivery' && !deliveryAreaId)}
```
`isOffline` is not included. This means staff can attempt to submit an order while the SSE connection is lost, which typically indicates network unavailability. The order creation call will fail and show an error toast, but it would be better UX (and prevents partial-write race conditions) to also check `isOffline`. All other action buttons in the app (KitchenScreen, OrderDetailScreen) guard on `isOffline`.
**Fix:**
```js
disabled={isOffline || cart.length === 0 || createOrder.isPending || (type === 'delivery' && !deliveryAreaId)}
```

---

### WR-02: Dead variable `visible` in `PosScreen` — the rendered grid uses `effectiveVisible` instead

**File:** `src/screen-pos.jsx:160-162`
**Issue:**
```js
const visible = cats.find(c => c.id === cat)?.items ?? [];          // never read
const effectiveCat = cat || (cats[0]?.id ?? '');
const effectiveVisible = (cats.find(c => c.id === effectiveCat)?.items ?? []);
```
`visible` is computed but never consumed. `effectiveVisible` is what drives the rendered grid (line 242). The dead `visible` variable indicates either a refactor that was not completed or a copy-paste mistake. If `cat` is always a valid ID (set from `cats[0]?.id ?? ''` via `useState`), then `visible` and `effectiveVisible` are logically equivalent and the duplication is harmless but confusing. If they are intended to differ, there is a hidden correctness issue.
**Fix:** Remove the unused `visible` declaration.

---

### WR-03: Sound file path in `app.jsx` does not match the spec (D-05) or plan

**File:** `src/app.jsx:77`
**Issue:** The implementation loads `/sounds/notification.mp3`:
```js
useEffect(() => { audioRef.current = new Audio('/sounds/notification.mp3'); }, []);
```
Constraint D-05 (04-RESEARCH.md line 18) and the phase plan (04-02-PLAN.md line 37) specify the path as `/sounds/new-order.mp3`. Both `public/sounds/new-order.mp3` and `public/sounds/notification.mp3` exist on disk, so audio does play — but the implementation uses the wrong file relative to the spec. If `new-order.mp3` is intentionally different (shorter/distinct chime) this is a silent functional mismatch.
**Fix:** Update the path to match the spec:
```js
useEffect(() => { audioRef.current = new Audio('/sounds/new-order.mp3'); }, []);
```

---

### WR-04: AcceptDialog and CancelDialog test files have zero implemented tests (all `test.todo`)

**File:** `src/__tests__/accept-dialog.test.jsx:23-27`, `src/__tests__/cancel-dialog.test.jsx:22-29`
**Issue:** All tests for ACT-01 (AcceptDialog API wiring) and ACT-03 (CancelDialog API wiring with reason requirement) are stubs — `test.todo(...)`. These are the highest-risk mutations in Phase 4 (they change order state in the backend). Without passing tests there is no automated regression guard for:
- confirm button disabled when `prep <= 0`
- `updateStatus.mutate` called with correct args on confirm
- dialog stays open on error
- cancel with reason calls `CANCELLED` status
- dismiss closes without API call

**Fix:** Implement these tests. The infrastructure (mock setup, QueryClient wrapper) is already present in both files. The component under test (`AcceptDialog`) is in `app.jsx` and is not exported — it may need to be extracted to its own file to be testable in isolation.

---

### WR-05: `ACT-02` statusToSDK tests are all `test.todo` — the fallback `.toUpperCase()` bug is documented but untested

**File:** `src/__tests__/use-order-actions.test.js:125-131`
**Issue:** The RESEARCH.md (line 583) explicitly calls out a pre-existing bug: `'done'.toUpperCase()` → `'DONE'` but the API requires `'COMPLETED'`; `'out'.toUpperCase()` → `'OUT'` but the API requires `'OUT_FOR_DELIVERY'`. `app.jsx` addresses this with the `statusToSDK` map (lines 27-35). However, `handleAdvance` still has a fallback: `statusToSDK[order.state] ?? order.state.toUpperCase()` (line 105). If a new state arrives from the server that is not in `statusToSDK`, the fallback silently sends the wrong value. The tests that would catch this mapping are all `test.todo`.
**Fix:** Implement the ACT-02 tests, and replace the `.toUpperCase()` fallback with an explicit error or log when the mapping is missing, rather than silently forwarding a potentially wrong string.

---

### WR-06: `cancel-dialog.test.jsx` test description names dismiss button "Renunță/Never mind" — actual button renders "Înapoi/Back"

**File:** `src/__tests__/cancel-dialog.test.jsx:28`
**Issue:** The todo test documents:
```js
test.todo('dismiss button (Renunță/Never mind) closes dialog without API call')
```
But `CancelDialog` renders `{t('back')}` (cancel-dialog.jsx line 84), which resolves to `'Înapoi'` (ro) or `'Back'` (en). When this test is implemented using `getByText('Renunță')` or `getByRole('button', { name: /Never mind/i })` it will fail immediately. The test description is misaligned with the actual implementation.
**Fix:** Correct the todo description to reflect the actual button label:
```js
test.todo('dismiss button (Înapoi/Back) closes dialog without API call')
```

---

### WR-07: `store.test.js` uses `vi`, `describe`, and `beforeEach` as globals without an explicit import

**File:** `src/__tests__/store.test.js:4, 17, 64, 91`
**Issue:** The file calls `vi.mock(...)`, `describe(...)`, `beforeEach(...)`, and `test(...)` without importing them from `vitest`. This works only because `vitest.config.js` sets `globals: true`. The other test files explicitly import: `import { describe, it, test, vi, expect, beforeEach } from 'vitest'`. `store.test.js` relies on globals silently — if `globals: true` is ever disabled or the file is linted with `no-undef`, it breaks. This inconsistency is a maintainability issue.
**Fix:** Add the import at the top of `store.test.js`:
```js
import { describe, test, expect, beforeEach, vi } from 'vitest'
```

---

## Info

### IN-01: `effectiveCat` and `effectiveVisible` redundancy — `cat` is always initialised to a valid ID

**File:** `src/screen-pos.jsx:54, 161-162`
**Issue:** The initial state for `cat` is `cats[0]?.id ?? ''` (line 54). `effectiveCat` on line 161 then does `cat || cats[0]?.id ?? ''`, which is only needed if `cat` could be empty. Since they share the same initializer, this guard is unreachable. This is a code smell that should be cleaned up to reduce reader confusion (the `visible` dead variable in WR-02 is related).

---

### IN-02: Magic hardcoded table default `'7'` in POS state initialisation

**File:** `src/screen-pos.jsx:57`
**Issue:** `useState('7')` hardcodes table 7 as the default table number. A staff member could miss clearing it and accidentally submit an order to table 7. This should be `''` (empty string) so the field is blank on load and staff must actively enter a value.
**Fix:**
```js
const [table, setTable] = useState('');
```

---

### IN-03: `MenuScreen` receives `isOffline` prop in `app.jsx` but the parameter is not declared in `MenuScreen`

**File:** `src/app.jsx:173`, `src/screen-menu.jsx:10`
**Issue:** `app.jsx` passes `isOffline` to `MenuScreen`:
```jsx
{screen === 'menu' && <MenuScreen lang={lang} isOffline={isOffline} />}
```
But `MenuScreen` is declared as `function MenuScreen({ lang })` — `isOffline` is silently ignored. The stock toggle button is never disabled when offline. This is consistent with WR-01 (POS offline guard missing) but in this case the prop itself is also not received.
**Fix:** Either accept and use `isOffline` in `MenuScreen` to disable the stock toggle while offline:
```js
function MenuScreen({ lang, isOffline }) {
```
and add `disabled={isOffline || toggleStock.isPending}` to the `AvailSwitch` calls, or stop passing `isOffline` to `MenuScreen` if offline guarding is intentionally not needed there.

---

_Reviewed: 2026-04-27T20:07:05Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
