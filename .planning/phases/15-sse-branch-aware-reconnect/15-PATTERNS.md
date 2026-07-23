# Phase 15: SSE Branch-Aware Reconnect - Pattern Map

**Mapped:** 2026-07-22
**Files analyzed:** 2 (1 source file modified, 1 test file extended)
**Analogs found:** 2 / 2 (this phase modifies existing files in-place; the "analog" for each is the sibling Phase 14 hook/test that already established the target pattern)

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|--------------------|------|-----------|-----------------|----------------|
| `src/use-sse.js` | hook (streaming, self-mutating) | event-driven / streaming | `src/use-orders.js` (branch-selector idiom) + itself (existing effect-lifecycle idiom) | role-match (selector) / exact (effect pattern already in file) |
| `src/__tests__/use-sse.test.js` | test | event-driven | `src/__tests__/use-orders.test.js` (store-seeding idiom) + itself (mock/act harness) | role-match (store seeding) / exact (harness) |

No new files. Both target files already exist and are being edited in place; there is no "role/data-flow lookup elsewhere in the codebase" step needed beyond confirming the exact key shapes and selector idiom Phase 14 already locked in.

## Pattern Assignments

### `src/use-sse.js` (hook, event-driven/streaming)

**Analog 1 — branch selector idiom:** `src/use-orders.js:15`
```javascript
const branchId = useAppStore((s) => s.currentBranch?.id) ?? null;
```
Import needed (not currently in `use-sse.js`):
```javascript
import { useAppStore } from './store.js';
```
Apply exactly this line at the top of `useSSE`, same as `use-orders.js:10,15`, `use-order-detail.js`, `use-stats.js`, `use-order-actions.js`. `null` is a legitimate, stable value (Pitfall 3 / SC4) — do not guard/defer on it.

**Analog 2 — target key shapes (verified live in Phase 14 hooks, not inferred):**
```javascript
// src/use-orders.js:18
queryKey: status ? ['orders', branchId, status] : ['orders', branchId],

// src/use-order-detail.js:10
queryKey: ['order', branchId, id],

// src/use-stats.js:10
queryKey: ['stats', branchId],

// src/use-order-actions.js:31-33 (invalidation-side, same shapes)
queryClient.invalidateQueries({ queryKey: ['orders', branchId] });
queryClient.invalidateQueries({ queryKey: ['order', branchId] });
queryClient.invalidateQueries({ queryKey: ['stats', branchId] });
```
`branchId` is always the first variable segment after the entity name string.

**Current file state — full inventory of the 7 call sites to re-key** (`src/use-sse.js`, current lines, confirmed by direct read):
```javascript
// order_new handler (lines 56-75)
queryClient.setQueryData(['orders'], (old) => { ... });        // → ['orders', scopedBranchId]
queryClient.invalidateQueries({ queryKey: ['stats'] });         // → ['stats', scopedBranchId]

// order_status_changed handler (lines 78-106)
queryClient.setQueryData(['orders'], (old) => { ... });         // → ['orders', scopedBranchId]
queryClient.setQueryData(['order', orderId], (old) => { ... }); // → ['order', scopedBranchId, orderId]
queryClient.invalidateQueries({ queryKey: ['orders', fromStatus] }); // → ['orders', scopedBranchId, fromStatus]
queryClient.invalidateQueries({ queryKey: ['orders', toStatus] });   // → ['orders', scopedBranchId, toStatus]
queryClient.invalidateQueries({ queryKey: ['stats'] });          // → ['stats', scopedBranchId]
```
All seven must move — missing any one leaves an orphaned unscoped write (Pitfall 2).

**Core effect-lifecycle pattern (already in file, `src/use-sse.js:25-123`) — the exact idiom being extended:**
```javascript
useEffect(() => {
  if (!token) {
    setIsConnected(false);
    return;
  }
  snapshotDone.current = false; // reset so each (re)connect gets a fresh 100ms window
  const ctrl = new AbortController();
  abortRef.current = ctrl;

  fetchEventSource(SSE_URL, {
    headers: { Authorization: `Bearer ${token}` },
    signal: ctrl.signal,
    openWhenHidden: true,
    async onopen(response) {
      if (response.ok) {
        setIsConnected(true);
        setTimeout(() => { snapshotDone.current = true; }, 100);
        return;
      }
      throw new Error(`SSE: server returned ${response.status}`);
    },
    onmessage(msg) { /* order_new / order_status_changed handlers — the 7 re-key sites above */ },
    onerror() { setIsConnected(false); },
    onclose() { setIsConnected(false); },
  });

  return () => ctrl.abort();
}, [token, queryClient]); // onLiveOrder intentionally excluded — stored in ref
```

**Target shape** (per RESEARCH.md Pattern 1/2 and CONTEXT.md D-01/D-03/D-04/D-06):
```javascript
import { useEffect, useRef, useState } from 'react';
import { fetchEventSource } from '@microsoft/fetch-event-source';
import { useQueryClient } from '@tanstack/react-query';
import { useAppStore } from './store.js';              // NEW
import { normalizeOrder, SDK_STATE_MAP } from './data.jsx';

export function useSSE(token, onLiveOrder) {
  const queryClient = useQueryClient();
  const branchId = useAppStore((s) => s.currentBranch?.id) ?? null; // NEW — same idiom as use-orders.js:15
  const [isConnected, setIsConnected] = useState(false);
  const abortRef = useRef(null);
  const snapshotDone = useRef(false);
  const onLiveOrderRef = useRef(onLiveOrder);
  useEffect(() => { onLiveOrderRef.current = onLiveOrder; }, [onLiveOrder]);

  useEffect(() => {
    if (!token) {
      setIsConnected(false);
      return;
    }
    snapshotDone.current = false;
    setIsConnected(false); // NEW (Pitfall 1) — manual ctrl.abort() fires neither onerror nor onclose
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    const scopedBranchId = branchId; // NEW (D-03) — captured once, closed over; never re-read inside handlers

    fetchEventSource(SSE_URL, {
      headers: { Authorization: `Bearer ${token}` },
      signal: ctrl.signal,
      openWhenHidden: true,
      async onopen(response) {
        if (response.ok) {
          setIsConnected(true);
          setTimeout(() => { snapshotDone.current = true; }, 100);
          return;
        }
        // D-06: non-behavioral capture — read Response here, unavailable in onerror
        let body;
        try { body = await response.text(); } catch { body = undefined; }
        console.warn('[SSE] non-2xx onopen', { status: response.status, body });
        throw new Error(`SSE: server returned ${response.status}`); // existing throw, unchanged
      },
      onmessage(msg) {
        if (msg.event === 'ping') return;
        if (msg.event === 'order_new') {
          try {
            const order = normalizeOrder(JSON.parse(msg.data));
            queryClient.setQueryData(['orders', scopedBranchId], (old) => { /* unchanged upsert body */ });
            queryClient.invalidateQueries({ queryKey: ['stats', scopedBranchId] });
            if (snapshotDone.current && onLiveOrderRef.current) onLiveOrderRef.current(order);
          } catch { /* malformed JSON — ignore */ }
        }
        if (msg.event === 'order_status_changed') {
          try {
            const { orderId, fromStatus, toStatus } = JSON.parse(msg.data);
            const state = SDK_STATE_MAP[toStatus] ?? toStatus.toLowerCase();
            queryClient.setQueryData(['orders', scopedBranchId], (old) => { /* unchanged patch body */ });
            queryClient.setQueryData(['order', scopedBranchId, orderId], (old) => { /* unchanged patch body */ });
            queryClient.invalidateQueries({ queryKey: ['orders', scopedBranchId, fromStatus] });
            queryClient.invalidateQueries({ queryKey: ['orders', scopedBranchId, toStatus] });
            queryClient.invalidateQueries({ queryKey: ['stats', scopedBranchId] });
          } catch { /* malformed JSON — ignore */ }
        }
      },
      onerror() { setIsConnected(false); },
      onclose() { setIsConnected(false); },
    });

    return () => ctrl.abort();
  }, [token, queryClient, branchId]); // NEW: branchId added — sole reconnect trigger

  return { isConnected };
}
```

**Anti-patterns to avoid (confirmed by RESEARCH.md against installed library source):**
- Do NOT read `branchId` inside `onmessage` via a fresh `useAppStore.getState()...` call — breaks D-03, use `scopedBranchId` only.
- Do NOT put `branchId` in a `ref` (that's the `onLiveOrder` pattern, which exists to *prevent* reconnects — the opposite of what's needed here).
- Do NOT assume effect teardown alone flips `isConnected` — `ctrl.abort()` triggers neither `onerror` nor `onclose` in `@microsoft/fetch-event-source` (verified in `node_modules/@microsoft/fetch-event-source/lib/esm/fetch.js`); the explicit `setIsConnected(false)` at the top of the effect body is required.
- Do NOT try to read the non-2xx body in `onerror` — it only receives the thrown `Error`, never the `Response`. Capture in `onopen` before the throw.

---

### `src/__tests__/use-sse.test.js` (test, event-driven)

**Analog — store-seeding idiom:** `src/__tests__/use-orders.test.js:26,29,68-69`
```javascript
import { useAppStore } from '../store.js'

beforeEach(() => {
  useAppStore.setState({ currentBranch: null })
})

// ...
test('useOrders query key includes currentBranch.id as the segment after "orders" (SC1)', async () => {
  useAppStore.setState({ currentBranch: { id: 'branch-a', name: 'A', slug: 'a', isDefault: true, isActive: true } })
  // ... renderHook, assert queryKey
})
```
This is the established, precedent idiom for seeding `currentBranch` in tests — `useAppStore.setState(...)` directly, no `vi.mock('../store.js', ...)`. Follow it verbatim in `use-sse.test.js` rather than inventing a mock. Add `import { useAppStore } from '../store.js'` and a `beforeEach(() => useAppStore.setState({ currentBranch: null }))` (or per-test seeding) alongside the existing mocks.

**Existing SSE test harness pattern to extend (`src/__tests__/use-sse.test.js:1-51`):**
```javascript
vi.mock('@microsoft/fetch-event-source', () => ({
  fetchEventSource: vi.fn(),
}))

import { renderHook, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement } from 'react'
import { useSSE } from '../use-sse.js'
import { fetchEventSource } from '@microsoft/fetch-event-source'

function wrapper({ children }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return createElement(QueryClientProvider, { client }, children)
}

describe('U9a — useSSE sets isConnected=true on open, false on error (KDS-01)', () => {
  beforeEach(() => { vi.clearAllMocks() })
  test('isConnected becomes true when onopen is called with ok response', async () => {
    let capturedOnOpen
    fetchEventSource.mockImplementation((_url, opts) => {
      capturedOnOpen = opts.onopen
      return Promise.resolve()
    })
    const { result } = renderHook(() => useSSE('test-token'), { wrapper })
    await act(async () => {
      if (capturedOnOpen) await capturedOnOpen({ ok: true, status: 200 })
    })
    expect(result.current.isConnected).toBe(true)
  })
})
```
Note: `wrapper` currently builds a fresh `QueryClient` per render with no way to inject a pre-existing one or re-render with new props — new reconnect tests need `renderHook(() => useSSE(token, onLiveOrder), { wrapper })` plus `rerender(...)` (via `renderHook`'s own return, which supports `rerender` regardless of the wrapper) to change `token`/force `useAppStore.setState` between renders and observe a second `fetchEventSource` call.

**New assertions required per RESEARCH.md Wave 0 Gaps / Phase Requirements → Test Map:**
1. `describe('branch-aware reconnect')` — `useAppStore.setState({ currentBranch: {id:'a'} })` then rerender with `{id:'b'}` → assert `fetchEventSource` called twice with two different `AbortController.signal`s, and `isConnected` is `false` immediately after the second call's effect body runs (before its `onopen` fires).
2. Rewrite the existing `U9b`/`U9b2` blocks (`order_new`/`order_status_changed` cache assertions) to target `['orders', branchId]`, `['order', branchId, orderId]`, `['orders', branchId, status]`, `['stats', branchId]` instead of the current unscoped keys — these currently assert against `['orders']` / `['order', orderId]` (confirmed pre-existing in the file, lines referenced in RESEARCH.md as `use-sse.js:59,67,83,94,100-101,102` pre-Phase-15).
3. D-03 captured-vs-live-read regression: seed `currentBranch: {id:'a'}`, render, capture `onmessage`; change `useAppStore.setState({ currentBranch: {id:'b'} })` WITHOUT rerendering the hook (simulating a stale in-flight connection); fire the captured `onmessage` for `order_new`; assert the write lands on `['orders', 'a']`, not `['orders', 'b']`.
4. SC4 single-branch regression: seed a fixed `currentBranch`, rerender the hook multiple times with the same `branchId`, assert `fetchEventSource` is called exactly once.
5. SC3 snapshot-silence preservation: extend the existing `KDS-04` `describe` block (100ms `snapshotDone` timer, `vi.useFakeTimers()`/`vi.advanceTimersByTime()`) with a case that changes `branchId` (triggering the reconnect effect) and confirms `onLiveOrder` is NOT called for an `order_new` fired immediately after the reconnect's `onopen`, mirroring the existing snapshot-window tests.
6. D-06 capture scaffold: `onopen({ ok: false, status: 403, text: () => Promise.resolve('...') })` → assert `console.warn` was called with `{ status: 403, body: ... }` (spy via `vi.spyOn(console, 'warn')`) and that the existing `throw`/retry path is untouched (no behavior regression).

---

## Shared Patterns

### Branch selector idiom
**Source:** `src/use-orders.js:15`, `src/use-order-detail.js`, `src/use-stats.js`, `src/use-order-actions.js`
**Apply to:** `src/use-sse.js` (the only file this phase touches)
```javascript
const branchId = useAppStore((s) => s.currentBranch?.id) ?? null;
```
`null` must remain stable/valid — never guard or defer on it (SC4, Pitfall 3).

### Branch-scoped query key convention
**Source:** Phase 14 hooks (`src/use-orders.js:18`, `src/use-order-detail.js:10`, `src/use-stats.js:10`, `src/use-order-actions.js:31-33`)
**Apply to:** All 7 `queryClient.*` call sites in `src/use-sse.js`
```javascript
['orders', branchId] | ['orders', branchId, status] | ['order', branchId, id] | ['stats', branchId]
```
`branchId` is always the first variable segment.

### Test store-seeding idiom
**Source:** `src/__tests__/use-orders.test.js:26,29,68-69`
**Apply to:** `src/__tests__/use-sse.test.js`
```javascript
import { useAppStore } from '../store.js'
beforeEach(() => { useAppStore.setState({ currentBranch: null }) })
// per-test: useAppStore.setState({ currentBranch: { id: 'branch-a', ... } })
```
No `vi.mock('../store.js', ...)` needed or used anywhere in the codebase — Zustand stores are plain JS and work fine un-mocked in tests.

## No Analog Found

None. Both target files are pre-existing and being edited in place; every required pattern (selector idiom, key shapes, effect-dependency-array reconnect, test store-seeding) is already established live in the codebase by Phase 14's four hooks and their tests.

## Metadata

**Analog search scope:** `src/use-sse.js`, `src/use-orders.js`, `src/use-order-detail.js`, `src/use-stats.js`, `src/use-order-actions.js`, `src/__tests__/use-sse.test.js`, `src/__tests__/use-orders.test.js`, `node_modules/@microsoft/fetch-event-source` (abort-path source, for the `isConnected` reset requirement)
**Files scanned:** 8
**Pattern extraction date:** 2026-07-22
