---
phase: 15-sse-branch-aware-reconnect
reviewed: 2026-07-23T00:00:00Z
depth: standard
files_reviewed: 2
files_reviewed_list:
  - src/use-sse.js
  - src/__tests__/use-sse.test.js
findings:
  critical: 0
  warning: 2
  info: 3
  total: 5
status: needs-attention
---

# Phase 15: Code Review Report

**Reviewed:** 2026-07-23
**Depth:** standard
**Files Reviewed:** 2
**Status:** needs-attention

## Summary

Reviewed the branch-aware rewire of the SSE hook (`src/use-sse.js`) and its test file. The core phase intent is implemented correctly: `branchId` is read via the `useAppStore((s) => s.currentBranch?.id) ?? null` selector, added as the third effect dependency (`[token, queryClient, branchId]`), `setIsConnected(false)` is placed at the effect top, and a single `scopedBranchId` const is captured once per connection (line 41) and threaded to all seven cache-write sites — with no `getState()` escape hatch (grep-confirmed absent). The D-03 captured-not-live-read isolation, the D-06 non-2xx `onopen` capture (uses `response.text()` in try/catch, logs to console only, throw unchanged), and the Bearer-in-header control are all implemented as designed. No security defects found.

Two real correctness defects remain, both in the message/lifecycle handling rather than the branch-scoping logic itself: an inconsistent cache-write shape in the `order_new` handler that silently drops list metadata, and an uncleared snapshot-window timer that can defeat SC3 snapshot-silence on a fast reconnect. Neither is caught by the current test suite.

## Summary Table

| ID | Sev | File:Line | Issue |
|------|---------|--------------------------|-------------------------------------------------------------------|
| WR-01 | Warning | src/use-sse.js:83 | `order_new` upsert returns `{ orders: next }`, dropping sibling cache metadata (`...rest` from useOrders) |
| WR-02 | Warning | src/use-sse.js:51 | Snapshot-window `setTimeout` never cleared on cleanup — stale timer can prematurely end the new connection's snapshot silence (violates SC3) |
| IN-01 | Info | src/use-sse.js:99 | `toStatus.toLowerCase()` throws on missing/non-string `toStatus`; swallowed silently by the catch |
| IN-02 | Info | src/__tests__/use-sse.test.js:386 | D-03 regression relies on React not flushing a store-subscription rerender (setState outside `act()`, no `rerender()`) — brittle |
| IN-03 | Info | src/use-sse.js:90,121 | Both message handlers swallow parse/errors with fully empty catch blocks — no debug trace for malformed server events |

## Warnings

### WR-01: `order_new` cache upsert drops sibling list metadata

**File:** `src/use-sse.js:77-84`
**Issue:** The `order_new` handler rebuilds the orders cache as `return { orders: next };`, discarding every other field on the existing cache object. But `useOrders` stores `{ ...rest, orders: orders.map(normalizeOrder) }` (`src/use-orders.js:24`), so `rest` (any pagination/total/metadata the SDK `kitchen.orders.list` returns) is silently wiped on **every** new-order event. This also diverges from the sibling `order_status_changed` handler, which correctly preserves the object via `{ ...old, orders: ... }` (line 103-108). The result is a cache object that no longer matches the shape produced by the query hook, and any screen reading a non-`orders` field will see it vanish the moment the first live order arrives.
**Fix:**
```js
queryClient.setQueryData(['orders', scopedBranchId], (old) => {
  const list = old?.orders ?? [];
  const idx = list.findIndex((o) => o.id === order.id);
  const next = idx >= 0
    ? list.map((o) => (o.id === order.id ? order : o))
    : [order, ...list];
  return { ...old, orders: next }; // preserve sibling metadata, matching order_status_changed
});
```

### WR-02: Snapshot-window timer is never cleared on effect cleanup

**File:** `src/use-sse.js:51` (cleanup at line 140)
**Issue:** `setTimeout(() => { snapshotDone.current = true; }, 100)` is armed in `onopen` but its id is never stored and never cleared. The cleanup returns only `() => ctrl.abort()`. `snapshotDone` is a single shared ref reused across connections. On a fast branch switch, the old connection's timer can still be pending when the new effect runs: the new effect resets `snapshotDone.current = false`, but the stale timer from the prior connection then fires and flips it back to `true` before the new connection's own snapshot window has elapsed. Any `order_new` arriving during the new branch's initial snapshot replay would then be treated as live and invoke `onLiveOrder` — firing a false new-order chime. This directly undermines the SC3 "snapshot silence across reconnect" contract. The existing SC3 test does not catch it because it only exercises the path where the first timer has already fired (advances 150ms) before reconnecting; the sub-100ms reconnect race is untested.
**Fix:** Track the timer and clear it in cleanup:
```js
const snapshotTimer = useRef(null);
// in onopen:
snapshotTimer.current = setTimeout(() => { snapshotDone.current = true; }, 100);
// in cleanup:
return () => {
  ctrl.abort();
  if (snapshotTimer.current) clearTimeout(snapshotTimer.current);
};
```

## Info

### IN-01: `toStatus.toLowerCase()` can throw on a well-formed-but-incomplete event

**File:** `src/use-sse.js:99`
**Issue:** `const state = SDK_STATE_MAP[toStatus] ?? toStatus.toLowerCase();` assumes `toStatus` is always a non-null string. A valid JSON payload missing `toStatus` (or carrying a numeric value) makes `.toLowerCase()` throw. It is caught by the surrounding try/catch and silently ignored, so no crash — but the entire status-change update (list patch, detail patch, three invalidations) is silently dropped, leaving the UI stale with no signal.
**Fix:** Guard the field before use, e.g. `if (typeof toStatus !== 'string') return;` at the top of the block, or `SDK_STATE_MAP[toStatus] ?? String(toStatus ?? '').toLowerCase()`.

### IN-02: D-03 regression test depends on React not flushing a store rerender

**File:** `src/__tests__/use-sse.test.js:386-398`
**Issue:** The test calls `useAppStore.setState({ currentBranch: { id: 'branch-b' } })` outside `act()` and without `rerender()`, then fires the previously captured `onmessage`. It passes only because the store-subscription rerender is not flushed, so `capturedOnMessage` still points at the branch-a connection's closure. If future React / testing-library versions flush that update, the effect would re-run, `capturedOnMessage` would be reassigned to the branch-b handler, and the assertion would flip. The behavior under test (captured-not-live isolation) is correct; the test's mechanism for reaching it is fragile.
**Fix:** Make the staleness explicit — capture the handler into a local variable immediately after render, then null out or ignore any reassignment, so the test asserts against the specific closure regardless of whether a rerender occurs.

### IN-03: Empty catch blocks provide no diagnostics for malformed events

**File:** `src/use-sse.js:90-92, 121-123`
**Issue:** Both handlers swallow all errors with a bare comment-only catch. This is intentional input-validation hardening (untrusted server JSON), but a fully silent drop makes a real server-side event-shape regression invisible in the field. A single `console.debug`/`console.warn` would aid diagnosis without changing behavior — consistent with the D-06 capture scaffold added elsewhere in this same file.
**Fix:** Add a minimal `console.warn('[SSE] dropped malformed <event>', err)` inside each catch (console-only, matching the T-15-02 disposition).

---

_Reviewed: 2026-07-23_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
