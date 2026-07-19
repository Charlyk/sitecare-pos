---
phase: 12-close-cr-01-tax-in-fallback-total-hist-06-traceability-wr-01
reviewed: 2026-07-19T00:00:00Z
depth: standard
files_reviewed: 5
files_reviewed_list:
  - src/__tests__/normalize-order.test.js
  - src/__tests__/screen-history.test.jsx
  - src/__tests__/store.test.js
  - src/screen-history.jsx
  - src/store.js
findings:
  critical: 0
  warning: 3
  info: 2
  total: 5
status: issues_found
---

# Phase 12: Code Review Report

**Reviewed:** 2026-07-19T00:00:00Z
**Depth:** standard
**Files Reviewed:** 5
**Status:** issues_found

## Summary

This phase lifts History's period/status/type/search selection out of `screen-history.jsx`'s
four local `useState` calls into a new session-only `historySelection` slice on `store.js`
(`setHistorySelection`, `setScreen`'s conditional preserve/reset branch), and backfills
regression-only test coverage in `normalize-order.test.js` for the previously-shipped CR-01
(percent-discount 100x inflation) and CR-02 (tax dropped from the fallback total) fixes.

I traced the new `normalizeOrder` fallback-total/discount tests against the current
`src/data.jsx` implementation (not in this review's file list, read only for cross-reference) and
confirmed all three new assertions (`total === 57`, `discount === 9.6`, `total === 96.4`) match
the shipped code exactly — this backfill is correct and closes the CR-01/CR-02 regression gap as
intended.

The `historySelection` lift itself is functionally correct against its own spec (verified by
tracing `setScreen`'s preserve/reset ternary and `setHistorySelection`'s shallow-merge/no-op
guard against every new test in `store.test.js` and `screen-history.test.jsx`). No critical or
blocking defects were found. Three warnings and two info items were found, all in the newly
added/modified code: a duplicated default-selection literal that can drift, a no-op-guard code
path in the real store that no test actually exercises (the render-test suite only exercises a
hand-duplicated copy of that logic inside a mock), and a pre-existing but still-live
error-handling/race gap in the Tauri plugin-store bridge that this phase's new persistence-facing
code now depends on more heavily.

## Warnings

### WR-01: Default `historySelection` object is duplicated and can drift

**File:** `src/store.js:59` and `src/store.js:82-83`
**Issue:** The default `historySelection` value (`{ period: { id: '30' }, statusFilter: 'all', typeFilter: 'all', query: '' }`) is written out as a separate object literal in two places: the store's initial state (line 59) and the reset branch of `setScreen`'s ternary (lines 82-83). Both test files (`store.test.js:165`, `screen-history.test.jsx:41`) independently extract this into a `DEFAULT_HISTORY_SELECTION` constant specifically to avoid this duplication — the production code does not follow its own test suite's pattern. If a future change updates the default period (e.g. to `'7'`) in one location and not the other, a fresh store and a "leave History" reset would silently diverge (fresh mount shows 30-day History, but leaving-and-returning-later behavior resets to a different default), and nothing would catch it since both literals independently type-check and independently pass `toEqual`-based tests.
**Fix:**
```js
// Module scope, above create(persist(...)):
const DEFAULT_HISTORY_SELECTION = { period: { id: '30' }, statusFilter: 'all', typeFilter: 'all', query: '' };

export const useAppStore = create(
  persist(
    (set) => ({
      // ...
      historySelection: DEFAULT_HISTORY_SELECTION,
      // ...
      setScreen: (screen) =>
        set((s) => ({
          screen,
          selectedOrder: null,
          historyOrder: null,
          historySelection:
            screen === 'history' || screen === 'history-detail'
              ? s.historySelection
              : DEFAULT_HISTORY_SELECTION,
        })),
```
Reusing the same frozen-by-convention reference is safe here because every update path (`setHistorySelection`) is immutable (`{ ...s.historySelection, ...patch }`), so the shared default is never mutated in place.

### WR-02: `setHistorySelection`'s Rule-1 no-op branch is never exercised against the real store

**File:** `src/store.js:93-98`
**Issue:** `setHistorySelection` has a documented "Rule-1 fix" — when every patched key already strictly equals the current value, it returns `{}` so the `historySelection` reference (and therefore selector-subscribed re-renders) stay untouched. `src/__tests__/store.test.js`'s new `historySelection` describe block (lines 167-243) only tests the *changed* path (a patch that differs from current state) — there is no test that calls `setHistorySelection` with a patch equal to the current value and asserts the reference is unchanged (`toBe`). `src/__tests__/screen-history.test.jsx` re-implements the identical no-op logic by hand inside its `vi.mock('../store.js', ...)` factory (lines 52-59) rather than importing the real store, so its render-level "redundant click doesn't re-render" coverage exercises a duplicate of the logic, not the actual `store.js` code path. The real no-op branch in production code is therefore untested — a regression that breaks it (e.g. someone "simplifying" it to always spread) would ship undetected by either test file.
**Fix:** Add a direct unit test against the real store in `store.test.js`:
```js
test('setHistorySelection with an already-equal patch is a true no-op (Rule-1): reference unchanged', () => {
  const before = useAppStore.getState().historySelection
  useAppStore.getState().setHistorySelection({ statusFilter: before.statusFilter })
  const after = useAppStore.getState().historySelection
  expect(after).toBe(before)
})
```

### WR-03: `getPluginStore()` has no error handling and a duplicate-init race on concurrent first calls

**File:** `src/store.js:12-18` (also `tauriStorage.getItem`/`setItem`/`removeItem`, lines 23-35)
**Issue:** `_store` is only assigned after `load(...)` successfully resolves, and the check is `if (!_store)`. If `getItem`, `setItem`, and/or `removeItem` are invoked concurrently before the first `load()` call resolves (plausible during app cold start, since zustand's `persist` hydration and any early `set()`-triggered write can race), each concurrent caller sees `_store === null` and independently calls `load('preferences.json', ...)` again, rather than awaiting the same in-flight promise. None of the three storage methods, nor `getPluginStore` itself, catch errors from `load`/`get`/`set`/`delete` — a failure (corrupted `preferences.json`, filesystem permission error) becomes an unhandled promise rejection during store hydration/writes instead of a logged, recoverable failure. This phase increases reliance on this bridge (the new `historySelection` slice is intentionally excluded from persistence, but `screen`, `role`, etc. still round-trip through this exact code on every session), so a latent defect here now has more surface area exercised per app session.
**Fix:**
```js
let _storePromise = null;
async function getPluginStore() {
  if (!_storePromise) {
    _storePromise = load('preferences.json', { autoSave: true }).catch((err) => {
      _storePromise = null; // allow a retry on the next call instead of caching a permanent failure
      throw err;
    });
  }
  return _storePromise;
}

const tauriStorage = {
  getItem: async (name) => {
    try {
      const store = await getPluginStore();
      const val = await store.get(name);
      return val ?? null;
    } catch (err) {
      console.error('[store] getItem failed', name, err);
      return null; // fail open to defaults rather than crash hydration
    }
  },
  // ...analogous try/catch for setItem/removeItem
};
```

## Info

### IN-01: The no-op guard cannot deduplicate `period` patches — every preset re-click allocates a new reference

**File:** `src/screen-history.jsx:366-368`, `src/screen-history.jsx:373-375`, `src/store.js:93-98`
**Issue:** `handleSelectPeriod` and `handleApplyCustomRange` both call `setHistorySelection({ period: { id } })` / `setHistorySelection({ period: { id: 'custom', customRange } })` with a freshly-constructed object literal every time. `setHistorySelection`'s Rule-1 no-op check compares `s.historySelection[k] === patch[k]` by reference — since `patch.period` is a brand-new object literal on every call, this comparison is always `false`, even when re-clicking the already-selected preset pill. This means the no-op optimization documented in `store.js:88-92` ("no-op when every patched key already strictly equals its current value... re-clicking an already-selected filter pill") only actually holds for the primitive `statusFilter`/`typeFilter`/`query` keys, never for `period`. This matches the pre-Phase-12 `useState`-based behavior (which had the same characteristic), so it is not a regression, but the guard's own doc comment reads as though it covers "an already-selected filter pill" generally, which includes the period pills in the same UI row.
**Fix:** Either narrow the doc comment to explicitly scope the no-op guarantee to `statusFilter`/`typeFilter`/`query`, or extend the comparison to value-compare `period` by its meaningful fields:
```js
const isPeriodEqual = (a, b) => a.id === b.id && a.customRange?.from === b.customRange?.from && a.customRange?.to === b.customRange?.to;
const unchanged = Object.keys(patch).every((k) =>
  k === 'period' ? isPeriodEqual(s.historySelection.period, patch.period) : s.historySelection[k] === patch[k]
);
```

### IN-02: `handleClearFilters` issues three separate store updates instead of one merged patch

**File:** `src/screen-history.jsx:463-467`
**Issue:** `handleClearFilters` calls `setStatusFilter('all')`, `setTypeFilter('all')`, and `setQuery('')` sequentially — three separate `setHistorySelection` calls, each allocating its own intermediate `historySelection` object and running the no-op-guard `Object.keys(...).every(...)` check independently. React 18 batches these into one render, so there's no user-visible defect, but it's unnecessary churn for what is conceptually a single atomic "reset filters" action, and it means three `setHistorySelectionMock` calls are recorded per Clear Filters click in tests rather than one.
**Fix:**
```js
const handleClearFilters = () => {
  setHistorySelection({ statusFilter: 'all', typeFilter: 'all', query: '' });
};
```

---

_Reviewed: 2026-07-19T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
