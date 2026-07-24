---
phase: 14-branch-scoped-cache-re-scoping
reviewed: 2026-07-22T00:00:00Z
depth: standard
files_reviewed: 12
files_reviewed_list:
  - src/data.jsx
  - src/use-orders.js
  - src/use-order-detail.js
  - src/use-stats.js
  - src/use-menu.js
  - src/use-restaurant-settings.js
  - src/use-delivery-areas.js
  - src/use-history-orders.js
  - src/use-order-actions.js
  - src/screen-orders.jsx
  - src/screen-pos.jsx
  - src/screen-menu.jsx
findings:
  critical: 2
  warning: 3
  info: 2
  total: 7
status: issues_found
---

# Phase 14: Code Review Report

**Reviewed:** 2026-07-22
**Depth:** standard
**Files Reviewed:** 12
**Status:** issues_found

## Summary

The branch-scoping mechanics of this phase are implemented correctly: all seven fetch hooks key on `['<resource>', branchId, ...]` with `branchId` as the fixed second segment, `enabled` stays gated on `!!client` only (no `!!branchId` gate anywhere — D-08 respected), no `queryClient.resetQueries()` call exists anywhere, and every mutation invalidation site (`use-order-actions.js`, `screen-pos.jsx`, `screen-menu.jsx`, `screen-orders.jsx`'s manual refresh) was updated in lockstep to invalidate the same `['<resource>', branchId]` prefix the corresponding query hook uses — TanStack Query's default prefix (non-exact) matching means these invalidations correctly reach every variant key (e.g. `['orders', branchId]` reaches both `['orders', branchId]` and `['orders', branchId, status]`). `use-history-orders.js` intentionally keeps its own inline `.diagnostic`-enriched error path outside `unwrapSdkResult` per the phase's own documented exception, and `use-sse.js` is out of scope per the task brief. No cache-key mismatches or branchId stale-closure bugs were found in the reviewed files.

However, two pre-existing correctness defects surfaced while tracing the write/read paths this phase touched, both severe enough to flag as Critical: a unit mismatch that corrupts percentage-discount totals, and a systemic failure to unwrap the SDK's `{data, error}` envelope on every mutation call site (only the query hooks were taught to call the new `unwrapSdkResult`). Several smaller robustness/quality gaps are listed as Warnings and Info.

## Critical Issues

### CR-01: Percent-discount unit mismatch between order creation and order normalization corrupts totals

**File:** `src/screen-pos.jsx:186-191` and `src/data.jsx:217-222`
**Issue:** When a percent discount is submitted from the POS, `screen-pos.jsx` sends the raw percent value as `discountAmount`:
```js
const sdkDiscountAmount = hasDiscount
  ? (discountMode === 'pct' ? Math.round(discountVal) : Math.round(discountVal * 100))
  : undefined;
```
For a 20% discount, `discountVal = 20`, so `sdkDiscountAmount = 20`.

But `normalizeOrder` (used by `useOrders`/`useOrderDetail`/`useHistoryOrders` to re-render that same order later) decodes `discountAmount` for `discountType === 'percent'` as a basis-points-style value scaled by `/10000`:
```js
const discount = rawDiscountAmt === 0 ? 0
  : discountType === 'percent'
    ? +(cRON(o.subtotal) * rawDiscountAmt / 10000).toFixed(2)
    : cRON(rawDiscountAmt);
```
For that same 20% discount to normalize back to 20% of subtotal, `rawDiscountAmt` needs to be `2000`, not `20` — the write path is off by a factor of 100. A cashier who applies a 20% discount will see (once the order is re-fetched into the Orders/History screens) a discount of `subtotal * 20/10000` = 0.2% instead of 20%, silently overstating the order total by nearly the full discount amount. This is a billing-correctness bug, not a display-only issue — `total` is derived from `discount` when the server doesn't supply its own `total` field.

The `'ron'`/fixed-amount path is internally consistent (write side multiplies by 100 to cents, read side's `cRON` divides by 100), so only the percent branch is broken.

**Fix:** Make the two sides agree on one unit. Simplest fix — send basis points on write to match the existing read-side divisor:
```js
const sdkDiscountAmount = hasDiscount
  ? (discountMode === 'pct' ? Math.round(discountVal * 100) : Math.round(discountVal * 100))
  : undefined;
```
(then in `normalizeOrder`, `rawDiscountAmt / 10000` still yields the correct fraction). Alternatively, if the actual SDK contract for `discountType: 'percent'` really expects a plain integer percent (not basis points), fix `normalizeOrder` instead (`rawDiscountAmt / 100` instead of `/10000`). Either way, add a round-trip test that creates an order with a percent discount and asserts the normalized `discount` matches the originally-entered percent of `subtotal`.

### CR-02: Mutation call sites never unwrap the SDK's `{data, error}` envelope — business-logic failures are reported as success

**File:** `src/use-order-actions.js:19-49`, `src/screen-pos.jsx:170-183`, `src/screen-menu.jsx:38-48`
**Issue:** This phase's `unwrapSdkResult` helper (and the file's own comments / `use-history-orders.js`'s comment block, which explains that the installed SDK's `request()` never sets `throwOnError` and therefore never rejects on a business-logic error — it always resolves to `{ data, error }`) establishes that every SDK call must have its `result.error` checked explicitly; a non-2xx or `{error: ...}` response does **not** reject the promise.

Every fetch hook was updated this phase to route through `unwrapSdkResult`, but none of the mutation call sites were:
```js
// use-order-actions.js
mutationFn: ({ id, currentStatus, toStatus, estimatedMinutes, reason }) =>
  client.kitchen.orders.updateStatus({ path: { id }, body: { ... } }),
onSuccess: () => { /* invalidates caches unconditionally */ },
```
```js
// screen-pos.jsx
mutationFn: (orderData) => client.kitchen.orders.create({ body: orderData }),
onSuccess: (result) => {
  queryClient.invalidateQueries({ queryKey: ['orders', branchId] });
  pushToast({ ...kind: 'success'... });
  ...
},
```
```js
// screen-menu.jsx
mutationFn: ({ productId, inStock }) => client.kitchen.products.updateStock({ body: { productId, inStock } }),
onSuccess: () => queryClient.invalidateQueries({ queryKey: ['menu', branchId] }),
```
Because the mutation's returned promise always resolves (never rejects) on a server-side business error, `onSuccess` fires unconditionally — TanStack Query has no way to know the call actually failed. Concretely: if `updateStatus` is rejected server-side (e.g. invalid state transition), staff clicking "Accept"/"Mark ready" will see the button succeed, the order card disappear from the "advance" flow expectations, yet the order never actually changed state — a stuck, invisible-failure order. Similarly `createOrder` would show the "order sent" success toast and clear the cart even if the order was never created, and `toggleStock` would silently fail to flip stock without ever calling the configured `onError` toast.

**Fix:** Route every mutation's success path through `unwrapSdkResult` (or an equivalent check) before treating it as success, e.g.:
```js
mutationFn: async ({ id, currentStatus, toStatus, estimatedMinutes, reason }) => {
  const result = await client.kitchen.orders.updateStatus({
    path: { id },
    body: { currentStatus, toStatus, ...(estimatedMinutes != null ? { estimatedMinutes } : {}), ...(reason != null ? { reason } : {}) },
  });
  return unwrapSdkResult(result, 'Failed to update order status');
},
```
This makes `unwrapSdkResult` throw on a business error, which `useMutation` will correctly surface via its existing (or a newly added) `onError` handler instead of `onSuccess`.

## Warnings

### WR-01: `screen-pos.jsx`'s `createOrder` never invalidates `['stats', branchId]`

**File:** `src/screen-pos.jsx:172-179`
**Issue:** `useOrderActions`'s mutations invalidate `['orders', branchId]`, `['order', branchId]`, **and** `['stats', branchId]` on every status change, but `createOrder`'s `onSuccess` only invalidates `['orders', branchId]`. Creating a new order changes `activeOrders`, `totalEarned`, and `completedOrders` on the Orders screen's stats strip (`apiStats` in `screen-orders.jsx`), but those numbers won't refresh until the 30s `staleTime` on `useStats` naturally elapses or some other action happens to invalidate `stats`. Right after ringing up an order, revenue/active-order counts will visibly lag reality.
**Fix:**
```js
onSuccess: (result) => {
  queryClient.invalidateQueries({ queryKey: ['orders', branchId] });
  queryClient.invalidateQueries({ queryKey: ['stats', branchId] });
  ...
}
```

### WR-02: `unwrapSdkResult` can silently degrade to a non-informative `"[object Object]"` message

**File:** `src/data.jsx:200-209`
**Issue:**
```js
export function unwrapSdkResult(result, fallbackMessage) {
  if (result.error) {
    const raw = result.error;
    const message = (typeof raw === 'string' ? raw : raw?.error) ?? fallbackMessage;
    const err = new Error(message);
    err.code = message;
    throw err;
  }
  return result.data;
}
```
This correctly handles the two shapes the codebase's own tests exercise (`error: 'STRING'` and `error: { error: 'STRING' }`), but there's no guard ensuring `raw?.error` (when `raw` is an object) is itself a string. If any endpoint ever returns a nested error object (e.g. `{ error: { code: 'X', message: 'Y' } }`), `message` becomes that object, `new Error(message)` stringifies it to `"[object Object]"`, and `err.code` is set to the same non-string object reference — breaking the "matchable string code" contract this helper exists to guarantee (the comment explicitly says Phase 17 consumes `err.code` as a string).
**Fix:** Add an explicit type guard so unexpected shapes fail loud instead of silently degrading:
```js
const errObj = typeof raw === 'string' ? raw : raw?.error;
const message = typeof errObj === 'string' ? errObj : fallbackMessage;
```

### WR-03: No upper bound enforced on percent discount — total can go negative

**File:** `src/screen-pos.jsx:153-158, 396-397`
**Issue:** The discount input has `max={discountMode === 'pct' ? 100 : undefined}`, but the HTML `max` attribute on `type="number"` only affects the spinner buttons and validity-API state — it does not clamp a typed or pasted value. `discountAmount`'s computation for `'pct'` mode has no corresponding clamp:
```js
if (discountMode === 'pct') return +(subtotal * v / 100).toFixed(2);
```
Entering e.g. `200` yields a discount of `2 × subtotal`, making `total = subtotal + fee - discountAmount` negative, and nothing in `handleCreate`/the "Ring Up" button disables submission for a negative total.
**Fix:** Clamp the percent branch the same way the `'ron'` branch already clamps against `subtotal`:
```js
if (discountMode === 'pct') return +(subtotal * Math.min(v, 100) / 100).toFixed(2);
```

## Info

### IN-01: `PosScreen` has grown into a very large, multi-concern component

**File:** `src/screen-pos.jsx:14-591`
**Issue:** `PosScreen` (menu grid, cart, customer/address form, discount logic, prep-time dialog trigger, and the product-options modal markup) is a single ~580-line function component. This isn't a phase-14 regression, but it's a maintainability risk going forward — any future change (e.g. Phase 15's SSE re-scoping work) touching this file has to reason about the whole thing at once.
**Fix:** Consider extracting the product-options modal and the cart panel into their own components (`ProductOptionsModal`, `CartPanel`) in a follow-up cleanup phase; no functional change needed now.

### IN-02: Two divergent SDK-error-unwrap implementations now coexist long-term

**File:** `src/use-history-orders.js:46-66` vs `src/data.jsx:200-209`
**Issue:** This is an intentional, explicitly-documented exception for this phase (preserving the `.diagnostic` enrichment for the open `windows-history-network-error` investigation), so it is not a bug to fix now. Flagging only so it isn't forgotten: once that investigation closes, `use-history-orders.js`'s inline `if (result.error) {...}` block duplicates logic now centralized in `unwrapSdkResult` and should be folded back in (per the phase's own `PATTERNS.md` note that this is a deliberate, temporary divergence).
**Fix:** No action for this phase; revisit after the linked debug investigation resolves.

---

_Reviewed: 2026-07-22_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
