---
phase: 10-filters-search
reviewed: 2026-07-18T00:00:00Z
depth: standard
files_reviewed: 9
files_reviewed_list:
  - src/history-utils.js
  - src/data.jsx
  - src/i18n.jsx
  - src/screen-history.jsx
  - src/__tests__/history-utils.test.js
  - src/__tests__/normalize-order.test.js
  - src/__tests__/screen-detail.test.jsx
  - src/__tests__/screen-history.test.jsx
  - src/__tests__/screen-orders.test.jsx
findings:
  critical: 1
  warning: 4
  info: 2
  total: 7
status: issues_found
---

# Phase 10: Code Review Report

**Reviewed:** 2026-07-18T00:00:00Z
**Depth:** standard
**Files Reviewed:** 9
**Status:** issues_found

## Summary

Reviewed the History screen's filter/search implementation (`history-utils.js`, `screen-history.jsx`), the shared order-normalization chokepoint it depends on (`data.jsx`), the i18n table, and the full associated test suite. All 231 tests across the five test files pass (`npx vitest run` verified). The pure filter/derivation functions in `history-utils.js` (`matchesSearch`, `matchesStatus`, `matchesType`, `foldDiacritics`, `computeSummary`, `groupOrdersByDay`, `deriveDuration`, the date-range builders) are well-specified, heavily commented, and match their test coverage precisely — no defects found there.

The one BLOCKER is a financial-correctness bug in `normalizeOrder` (`src/data.jsx`), which is in scope as a listed file: the fallback total calculation (used whenever the SDK does not supply `order.total` directly) omits `tax` entirely, silently under-billing every finished order that hits that code path. This is untested (no fixture in the provided test files exercises the fallback branch), so it would ship undetected.

Several WARNING-level robustness/quality issues were also found in `data.jsx` and `screen-history.jsx` — a `??`-with-empty-string trap that can leave `order.state`/`order.type` as `''` instead of the documented default, an unsafe default in the exported `historyStatusMeta` helper, a non-defensive facet-counting loop, and duplicated locale-mapping logic. None of these are exercised by the current test fixtures, which is itself the risk: they will not fail CI until a real-world input triggers them.

## Critical Issues

### CR-01: normalizeOrder's fallback total calculation omits tax

**File:** `src/data.jsx:208-216`
**Issue:** When the SDK response does not include `order.total` (the code's own comment acknowledges this can happen — "Fall back to recomputing from components if the server doesn't provide it"), the fallback formula sums `subtotal + deliveryFee + tip - discount` but never adds `tax`, even though `tax` is computed on the very line above and is a real, non-zero component of every order in this app's own mock data (`ORDERS` in this same file carries `tax: 15.28`-style values). Any order normalized through this fallback path would have its displayed/stored `total` understated by exactly the tax amount — a financial-correctness bug in a POS application, and one no test in the reviewed suite catches (every fixture across `normalize-order.test.js`, `screen-detail.test.jsx`, etc. supplies `total` directly, so the fallback branch has zero coverage).
**Fix:**
```javascript
const total = o.total != null
  ? cRON(o.total)
  : +(subtotal + tax + deliveryFee + tip - discount).toFixed(2);
```
Add a unit test that omits `o.total` and asserts the recomputed value includes tax.

## Warnings

### WR-01: `??`-with-empty-string trap leaves `state`/`type` as `''` instead of the documented default

**File:** `src/data.jsx:197-198` and `src/data.jsx:222`
**Issue:**
```javascript
const rawState = o.state ?? o.status ?? '';
const state = SDK_STATE_MAP[rawState] ?? rawState.toLowerCase() ?? 'new';
```
When both `o.state` and `o.status` are absent, `rawState` becomes `''`. `''.toLowerCase()` is `''`, and `'' ?? 'new'` evaluates to `''` (the empty string is not nullish, so the `??` never triggers) — the documented "falls back to 'new'" behavior silently does not happen; `state` ends up `''`.
The same pattern reappears in the type mapping one line later:
```javascript
type: ((raw) => (raw === 'local' ? 'dinein' : raw ?? 'dinein'))(o.type ?? o.orderType),
```
If `o.type` is ever an empty string (falsy, non-nullish), `raw` is `''`, and `raw ?? 'dinein'` again fails to apply the default, leaving `type: ''`.
Neither case is covered by `normalize-order.test.js` (which only tests `undefined`/`null`/absent inputs, never an empty-string field).
**Fix:** Use `||` (or an explicit truthiness check) instead of `??` where an empty string should be treated the same as absent:
```javascript
const state = SDK_STATE_MAP[rawState] ?? (rawState.toLowerCase() || 'new');
// and
type: ((raw) => (raw === 'local' ? 'dinein' : (raw || 'dinein')))(o.type ?? o.orderType),
```

### WR-02: `historyStatusMeta`'s default silently relabels any unrecognized/null status as "completed"

**File:** `src/screen-history.jsx:54-61`
**Issue:** `historyStatusMeta` is exported specifically for reuse outside this file (the comment says screen-detail.jsx imports it), yet its own fallback is `map[status] || map.completed` — any status that isn't exactly `'completed'`/`'canceled'`/`'refunded'`, including `null` (what `deriveDisplayStatus` returns for an in-flight order), silently renders the green "Completed" chip. The test suite for this file explicitly documents having to guard against this at the *call site* in screen-detail.jsx ("the defect this guards against is historyStatusMeta's own `map[status] || map.completed` default silently activating when deriveDisplayStatus returns null") rather than in the function itself. Correctness here depends entirely on every current and future caller remembering never to pass a `null`/unknown status — a fragile contract for a function explicitly designed for reuse.
**Fix:** Make the function fail safe/loud instead of silently defaulting to a specific status:
```javascript
export function historyStatusMeta(status, t) {
  const map = { completed: {...}, canceled: {...}, refunded: {...} };
  if (!map[status]) {
    // no trustworthy display status — do not disguise it as "completed"
    return { chip: 'chip-slate', tile: 'hsl(210 15% 92%)', ink: '#556', icon: 'help', label: t('status_completed') };
  }
  return map[status];
}
```
(Exact fallback shape TBD by design, but it must not reuse `map.completed`'s visual identity for a non-completed/unknown state.)

### WR-03: `statusCounts` faceting loop is not defensive against `deriveDisplayStatus` returning `null`

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
This is currently safe only because `byTypeAndSearch` is derived from `finished` (`filterFinishedOrders(data)`), which guarantees every order's `deriveDisplayStatus` result is non-null. There is no guard in this loop itself, though: if a future refactor changes what feeds `byTypeAndSearch` (or a bug elsewhere lets an in-flight order slip through), `counts[null] += 1` creates a stray `counts.null = NaN` object property with no error, and the `all` pill's badge count would silently stop matching the sum of the other three pills.
**Fix:** Guard the increment explicitly:
```javascript
for (const o of byTypeAndSearch) {
  counts.all += 1;
  const status = deriveDisplayStatus(o);
  if (status) counts[status] += 1;
}
```

### WR-04: Locale-mapping logic (`lang === 'ro' ? 'ro-RO' : 'en-GB'`) is duplicated three times

**File:** `src/screen-history.jsx:88, 103, 119`
**Issue:** The same ternary appears in `dayGroupLabel`, `periodPhrase`, and `periodLabel` — three independent call sites making the same lang→BCP-47 mapping decision. If a third language is ever added (or the `en` locale needs to change from `en-GB` to something else), all three sites must be updated in lockstep; missing one produces an inconsistent date format between, e.g., the day-group header and the tile sub-label for the same render.
**Fix:** Extract a single helper:
```javascript
const LOCALE_FOR_LANG = { ro: 'ro-RO', en: 'en-GB' };
function resolveLocale(lang) { return LOCALE_FOR_LANG[lang] ?? 'en-GB'; }
```
and call it from all three sites.

## Info

### IN-01: `FilterBar` destructures an `isLoading` prop it never uses

**File:** `src/screen-history.jsx:665`
**Issue:** `isLoading` is passed into `FilterBar` from `HistoryScreen` (line 442) and destructured in the function signature (line 665), but nothing in `FilterBar`'s body reads it — the period/status/type pills are never disabled or styled differently during the initial load. This is either dead code left over from an earlier iteration, or a sign that first-load pill-disabling was intended but never implemented (no test exercises this either way).
**Fix:** Either remove the unused destructure, or wire it up if pills should in fact be disabled during `isLoading` (first load, before any range has resolved).

### IN-02: `matchesSearch`'s numeric-label branch silently coerces a missing `order.id` into a crash risk

**File:** `src/history-utils.js:341-343`
**Issue:**
```javascript
const numLabel = String(
  typeof order.dailyOrderNumber === 'number' ? order.dailyOrderNumber : order.id.slice(0, 8)
).toLowerCase();
```
This assumes `order.id` is always a string when `dailyOrderNumber` is not a number. That invariant holds today (every normalized order carries an `id`), but the function has no defensive check, unlike its sibling handling of `order.customer` a few lines below (`order.customer?.name ?? ''`). A malformed/partial order object reaching this predicate would throw instead of returning `false`.
**Fix:** `order.id?.slice(0, 8) ?? ''` for symmetry with the `customer` null-safety already present in the same function.

---

_Reviewed: 2026-07-18T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
