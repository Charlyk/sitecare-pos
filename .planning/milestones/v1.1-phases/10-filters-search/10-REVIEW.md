---
phase: 10-filters-search
reviewed: 2026-07-18T00:00:00Z
depth: standard
files_reviewed: 9
files_reviewed_list:
  - src/__tests__/history-utils.test.js
  - src/__tests__/normalize-order.test.js
  - src/__tests__/screen-detail.test.jsx
  - src/__tests__/screen-history.test.jsx
  - src/__tests__/screen-orders.test.jsx
  - src/data.jsx
  - src/history-utils.js
  - src/i18n.jsx
  - src/screen-history.jsx
findings:
  critical: 3
  warning: 3
  info: 4
  total: 10
status: issues_found
---

# Phase 10: Code Review Report

**Reviewed:** 2026-07-18T00:00:00Z
**Depth:** standard
**Files Reviewed:** 9
**Status:** issues_found

## Summary

`history-utils.js` and its test suite are excellent — the date-range builders, D-01/D-02 status precedence, faceted filtering (`matchesStatus`/`matchesType`/`matchesSearch`), and the summary/day-group derivations are internally consistent, well-specified, and thoroughly exercised. I could not find a defect there. `screen-history.jsx`'s filter bar, custom-range popover, and empty-state variants are similarly solid and match their extensive test coverage.

The real problems live in `src/data.jsx`'s `normalizeOrder` — the single data-normalization chokepoint every screen (Live Orders, History, Order Detail) depends on. It has three distinct, financially- or functionally-significant defects, none of which are covered by `normalize-order.test.js` (which only tests the `dailyOrderNumber` and `type`-from-`local` fallback chains added for this phase):

1. A percent-type discount is computed from the raw cents subtotal but never converted back to RON — the stored/displayed discount is 100x too large.
2. The fallback `total` formula (used whenever the SDK omits `order.total`) omits tax entirely, silently under-totaling the order by the full tax amount.
3. The `state` fallback resolves to `''` instead of the documented `'new'` default when both `state` and `status` are absent from the input — and tracing into `screen-orders.jsx` confirms this actually removes such an order from every live-order filter bucket, since that screen's own state derivation has the identical `?? ''`-then-`??` blind spot.

A handful of smaller robustness/quality issues round out the findings in `screen-history.jsx` and `history-utils.js` — an unsafe default in the exported, reuse-designed `historyStatusMeta` helper, a non-defensive facet-counting loop, a hardcoded locale in `orderTimeLabel` that is inconsistent with every other date/time formatter touched by this phase, an unused prop, and some duplicated logic.

## Critical Issues

### CR-01: Percent-type discount is never converted from cents to RON (100x inflation)

**File:** `src/data.jsx:200-206`
**Issue:** `cRON` (`v / 100`) is this module's one cents→RON converter, and every other monetary field (`subtotal`, `deliveryFee`, `tax`, `tip`, and the *fixed-amount* discount branch) is passed through it before being returned. The `percent` branch is not:

```javascript
const discount = rawDiscountAmt === 0 ? 0
  : discountType === 'percent'
    ? +((o.subtotal ?? 0) * rawDiscountAmt / 10000).toFixed(2)
    : cRON(rawDiscountAmt);
```

`o.subtotal` here is the **raw, un-converted cents value** — the `cRON(o.subtotal)` conversion happens two lines later into a differently-named `subtotal` local, and is never applied to this branch. For a 9600-cent (96 RON) subtotal with a 10% discount (`rawDiscountAmt = 1000` basis points), the formula yields `9600 * 1000 / 10000 = 960`, which is 960 **cents** (9.60 RON) — but the code returns `960` as the final RON discount value with no further division. `order.discount` renders as `960,00 lei` instead of `9,60 lei`: a 100x overstatement, and it also poisons the fallback total (CR-02). Completely untested — `normalize-order.test.js` never exercises `discountType`/`discountAmount` at all.
**Fix:**
```javascript
const discount = rawDiscountAmt === 0 ? 0
  : discountType === 'percent'
    ? +(cRON(o.subtotal) * rawDiscountAmt / 10000).toFixed(2)
    : cRON(rawDiscountAmt);
```
Add a fixture with `discountType: 'percent'` to prove the resulting `discount` is in RON, not cents.

### CR-02: `normalizeOrder`'s fallback total calculation omits tax

**File:** `src/data.jsx:212-216`
**Issue:** When the SDK response does not include `order.total` (the code's own comment acknowledges this can happen — "Fall back to recomputing from components if the server doesn't provide it"), the fallback formula sums `subtotal + deliveryFee + tip - discount` but never adds `tax`, even though `tax` is computed on the line directly above and is a real, non-zero component of every order in this file's own mock data (e.g. order `#1047`: `subtotal 96 + deliveryFee 10 + tip 0 + tax 15.28 = 121.28 = total`, matching that fixture's own `total` field). Feeding that same shape through the fallback path (`o.total` omitted) would compute `96 + 10 + 0 - 0 = 106`, not `121.28` — a silent, tax-sized under-total on a POS receipt. No fixture in the reviewed suite supplies an order without `total`, so this branch has zero coverage.
**Fix:**
```javascript
const total = o.total != null
  ? cRON(o.total)
  : +(subtotal + tax + deliveryFee + tip - discount).toFixed(2);
```

### CR-03: `??`-with-empty-string trap leaves `state` (and potentially `type`) as `''` instead of the documented default

**File:** `src/data.jsx:197-198` (and `src/data.jsx:222` for the related `type` case)
**Issue:**
```javascript
const rawState = o.state ?? o.status ?? '';
const state = SDK_STATE_MAP[rawState] ?? rawState.toLowerCase() ?? 'new';
```
When both `o.state` and `o.status` are absent, `rawState` becomes `''`. `''.toLowerCase()` is `''`, and `'' ?? 'new'` evaluates to `''` — the empty string is not nullish, so the `??` never triggers, and the documented "falls back to `'new'`" behavior silently does not happen; `state` ends up `''`.

This is not merely theoretical: `screen-orders.jsx:37` re-derives its own working `state` as `order.state ?? order.status?.toLowerCase() ?? 'new'`. Because `order.state` (already normalized to `''`) is not nullish, that expression short-circuits identically, so the Live Orders screen's own local `state` is *also* `''`. Such an order matches none of the `new`/`preparing`/`ready` filter buckets (`screen-orders.jsx:170-172`) and silently disappears from the live board under every filter, with nothing surfaced to staff.

The type mapping one line below has the same latent shape, triggered only if an upstream field is an explicit empty string rather than absent:
```javascript
type: ((raw) => (raw === 'local' ? 'dinein' : raw ?? 'dinein'))(o.type ?? o.orderType),
```
If `o.type`/`o.orderType` is ever `''` (falsy but non-nullish), `raw ?? 'dinein'` again fails to apply the default, leaving `type: ''`. Neither case is covered by `normalize-order.test.js` (which only tests `undefined`/`null`/absent inputs, never an empty-string field).
**Fix:** Use `||` (or an explicit truthiness check) instead of `??` wherever an empty string should be treated the same as absent:
```javascript
const state = SDK_STATE_MAP[rawState] ?? (rawState.toLowerCase() || 'new');
// and
type: ((raw) => (raw === 'local' ? 'dinein' : (raw || 'dinein')))(o.type ?? o.orderType),
```

## Warnings

### WR-01: `historyStatusMeta`'s default silently relabels any unrecognized/null status as "completed"

**File:** `src/screen-history.jsx:54-61`
**Issue:** `historyStatusMeta` is exported specifically for reuse (the comment states `screen-detail.jsx` imports it under `readOnly`), yet its own fallback is `map[status] || map.completed` — any status that isn't exactly `'completed'`/`'canceled'`/`'refunded'`, including `null` (what `deriveDisplayStatus` returns for an in-flight order), silently renders the green "Completed" chip and colors. The reviewed test suite documents having to guard against this at the *call site* in `screen-detail.jsx` rather than in the function itself (the test comment reads: "the defect this guards against is historyStatusMeta's own `map[status] || map.completed` default silently activating when deriveDisplayStatus returns null"). Correctness therefore depends entirely on every current and future caller remembering never to pass a `null`/unknown status — a fragile contract for a function explicitly designed to be reused.
**Fix:** Make the function fail safe/loud instead of silently defaulting to a specific, visually-confident status:
```javascript
export function historyStatusMeta(status, t) {
  const map = { completed: {...}, canceled: {...}, refunded: {...} };
  return map[status] ?? { chip: 'chip-slate', tile: 'hsl(210 15% 92%)', ink: '#556', icon: 'help', label: '—' };
}
```
(Exact fallback shape is a design decision, but it must not reuse `map.completed`'s visual identity for a non-completed/unknown state.)

### WR-02: `statusCounts` faceting loop is not defensive against `deriveDisplayStatus` returning `null`

**File:** `src/screen-history.jsx:388-395`
**Issue:**
```javascript
const statusCounts = useMemo(() => {
  const counts = { all: 0, completed: 0, refunded: 0, canceled: 0 };
  for (const o of byTypeAndSearch) {
    counts.all += 1;
    counts[deriveDisplayStatus(o)] += 1;
  }
  return counts;
}, [byTypeAndSearch]);
```
This is currently safe only because `byTypeAndSearch` is derived from `finished = filterFinishedOrders(data)`, which guarantees every order's `deriveDisplayStatus` result is non-null. The loop itself has no guard: if a future refactor changes what feeds `byTypeAndSearch`, or a bug elsewhere lets an in-flight order slip through, `counts[null] += 1` silently creates a stray `counts.null = NaN` property with no thrown error, and the "All" pill's badge count would stop matching the sum of the other three pills with no visible failure.
**Fix:**
```javascript
for (const o of byTypeAndSearch) {
  counts.all += 1;
  const status = deriveDisplayStatus(o);
  if (status) counts[status] += 1;
}
```

### WR-03: `orderTimeLabel` hardcodes `ro-RO`, ignoring the active UI language

**File:** `src/data.jsx:183-186`
**Issue:**
```javascript
export const orderTimeLabel = (iso) => {
  const d = new Date(iso);
  return d.toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' });
};
```
Every other date/time formatter touched by this phase resolves its locale from the active `lang` (`dayGroupLabel` in `screen-history.jsx`: `lang === 'ro' ? 'ro-RO' : 'en-GB'`; `formatDateRange` in `history-utils.js` takes an explicit `locale` argument). `orderTimeLabel` takes no `lang` parameter at all and is called from `HistoryRow` (`screen-history.jsx:249`) as `orderTimeLabel(order.placedAt)`. As a result the History table's "Time" column (and the Live Orders screen, which uses the same helper) always renders Romanian-locale time formatting even when the app is switched to English — inconsistent with the rest of this phase's careful lang-aware formatting.
**Fix:** Thread `lang` through, mirroring the existing convention, and update call sites:
```javascript
export const orderTimeLabel = (iso, lang = 'ro') => {
  const d = new Date(iso);
  return d.toLocaleTimeString(lang === 'ro' ? 'ro-RO' : 'en-GB', { hour: '2-digit', minute: '2-digit' });
};
```

## Info

### IN-01: `FilterBar` destructures an `isLoading` prop it never uses

**File:** `src/screen-history.jsx:664-666`
**Issue:** `isLoading` is passed into `FilterBar` from `HistoryScreen` (line 442) and destructured in the function signature, but nothing in `FilterBar`'s body reads it — the period/status/type pills are never disabled or styled differently during the initial load. Either dead code left over from an earlier iteration, or a sign that first-load pill-disabling was intended but never implemented.
**Fix:** Remove the unused destructure, or wire it up if pills should in fact be disabled/dimmed during `isLoading`.

### IN-02: `matchesSearch`'s numeric-label branch has no null-safety for `order.id`, unlike its `customer` handling in the same function

**File:** `src/history-utils.js:341-343`
**Issue:**
```javascript
const numLabel = String(
  typeof order.dailyOrderNumber === 'number' ? order.dailyOrderNumber : order.id.slice(0, 8)
).toLowerCase();
```
This assumes `order.id` is always a string when `dailyOrderNumber` is not a number. That invariant holds today (every normalized order carries an `id`), but there's no defensive check here, unlike the `customer` handling two lines below (`order.customer?.name ?? ''`) in the very same function. A malformed/partial order reaching this predicate would throw instead of returning `false`.
**Fix:** `order.id?.slice(0, 8) ?? ''` for symmetry with the existing `customer` null-safety.

### IN-03: Locale-mapping ternary (`lang === 'ro' ? 'ro-RO' : 'en-GB'`) is duplicated three times in `screen-history.jsx`

**File:** `src/screen-history.jsx:88, 103, 119`
**Issue:** The same mapping appears independently in `dayGroupLabel`, `periodPhrase`, and `periodLabel`. If a third language is ever added, or the English locale needs to change, all three sites must be updated in lockstep — missing one produces an inconsistent date format between, e.g., the day-group header and the tile sub-label in the same render.
**Fix:** Extract one helper (e.g. `const LOCALE_FOR_LANG = { ro: 'ro-RO', en: 'en-GB' }; const resolveLocale = (lang) => LOCALE_FOR_LANG[lang] ?? 'en-GB';`) and call it from all three sites.

### IN-04: `isSwitching` is computed identically in two components

**File:** `src/screen-history.jsx:420, 715`
**Issue:** `const isSwitching = isFetching && isPlaceholderData;` is defined independently in both `HistoryScreen` (line 420) and `FilterBar` (line 715), each with its own comment restating the same "genuine period switch vs. background refetch" rationale. Since this predicate is load-bearing for the D-05 loading treatment, having two copies risks them drifting if the condition is ever revised in only one place.
**Fix:** Compute `isSwitching` once in `HistoryScreen` and pass it down to `FilterBar` as a single prop instead of re-deriving it in both places.

---

_Reviewed: 2026-07-18T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
