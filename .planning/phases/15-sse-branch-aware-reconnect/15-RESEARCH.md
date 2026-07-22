# Phase 15: SSE Branch-Aware Reconnect - Research

**Researched:** 2026-07-22
**Domain:** React effect lifecycle + `@microsoft/fetch-event-source` reconnect semantics + TanStack Query cache re-keying
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** `useSSE` reads `currentBranch?.id` from Zustand **internally** (via a selector at hook top, e.g. `useAppStore((s) => s.currentBranch?.id)`) and adds it to the SSE `useEffect` **dependency array**. A branch change re-runs the effect → `ctrl.abort()` the old connection → open a fresh one. Chosen over passing `branchId` as a param from `app.jsx` and over an imperative `reconnect()` because it keeps the hook **self-contained, declarative, and testable now without Phase 16** — and mirrors Phase 14 D-02 ("keys/streams react automatically; the phase does not touch the switch flow"). The effect's own abort→re-run gives SC1's visible drop-and-recover for free. — **Reversibility:** reversible — the change is local to `use-sse.js`'s effect dependency list and one selector read.
- **D-02:** Because the reconnect is dependency-driven and `currentBranch` is only set **after** a switch succeeds (Phase 16 sets it in `onSuccess`, never optimistically), the reconnect naturally fires **post-switch-resolution** — no cross-phase coupling, and Pitfall-4 race safety by construction (same reasoning as Phase 14 D-02).
- **D-03:** The SSE message handlers write to the **connection's captured `branchId`** — the selector value the effect closed over at connect time — never a fresh per-message store read. An in-flight message from a just-aborted old connection can therefore only ever land on the **old** branch's key; the old effect is torn down before the new one writes. Rejects "live store read per message," which could let a late old-connection message write the *new* branch's key and reintroduce cross-branch bleed. Mirrors Phase 14 D-04's read-once-close-over pattern. — **Reversibility:** costly — undoing means re-threading branch reads through all four cache-write sites in `use-sse.js`.
- **D-04:** All SSE cache writes re-key to Phase 14's exact shapes: the `order_new` upsert and `order_status_changed` list patch → `['orders', branchId]`; the status-filtered invalidations (`fromStatus`/`toStatus`) → `['orders', branchId, status]`; the detail patch → `['order', branchId, orderId]`; the stats invalidations → `['stats', branchId]`. Missing one leaves a live event writing an orphaned unscoped key that no hook reads — the silent-stale-stream failure this phase exists to prevent. (See Phase 14 `14-CONTEXT.md` key convention: `branchId` is always the first variable segment.)
- **D-05:** Phase 15 lets `isConnected` flip **honestly** during a branch-triggered reconnect (brief `OfflineBanner` via `shell.jsx:226` + Accept/Advance disabled via `screen-orders.jsx:149-151`). Keeps the hook self-contained and SC1's "visible drop and recover" literally true. **Phase 16 — which owns the switch flow — is responsible for holding its pending-disabled ("switching…") state across the reconnect** so users perceive one continuous switch, not a false "offline" flash after the success toast. Phase 15 adds no suppression flag (there is no real switch signal to key it off until Phase 16). — **Reversibility:** reversible — no new state added in Phase 15; the bridging lives entirely in Phase 16.
- **D-06:** Phase 15 adds a **minimal, non-behavioral capture scaffold** in `onopen`: when the response is non-2xx, log the status + response body shape before the existing throw. This records the actual 403 branch-resolution signal shape whenever one first occurs (realistically during Phase 16/17 testing, since there is no switcher to trigger it in Phase 15). It does **not** add any handling, recovery, retry-suppression, or behavior change — the current throw→`onerror`→library-retry path is untouched. All 403 *handling* is Phase 17 (BERR). Rejected "pure defer" (loses the free observability hedge) and "capture + probe now" (needs test setup that doesn't exist pre-switcher — wasted effort). — **Reversibility:** reversible — a single logging line in `onopen`.
- **D-07:** SC2 ("KDS and order list both receive the new branch's live events, confirmed against a second live session on that branch") is recorded as a **human-verification / UAT item** run against the live API — it needs two concurrent live sessions and cannot be unit-tested without encoding the assumption. Automated tests cover the reconnect *mechanism* (effect re-runs and aborts on `branchId` change), snapshot-silence preservation across reconnect (SC3), and cache-key alignment with Phase 14 (D-04). Same live-API-verification pattern as v1.1's timezone / cents-vs-RON confirmations.

### Claude's Discretion

- Exact selector form for reading `currentBranch?.id` in `use-sse.js` (inline `useAppStore` selector vs. a small shared selector) — planner's call, as long as it triggers a re-render/effect-re-run on id change.
- Whether the captured `branchId` is threaded as a closed-over `const` inside the effect body or passed into small helper writers — planner's call, as long as D-03's "captured, not live-read" invariant holds.
- Whether the D-06 capture logs via `console` or a more structured sink, and the exact fields logged (status is mandatory; body/headers best-effort) — as long as it stays non-behavioral.
- Test scaffolding specifics for the reconnect/snapshot-silence/key-alignment assertions (mock branch ids, fake SSE messages, abort-spy).

### Deferred Ideas (OUT OF SCOPE)

- **Phase 16 — bridge the pending-disabled state across the reconnect** (D-05): Phase 16's non-optimistic switch handler should keep order actions in their "switching…" disabled state until `isConnected` recovers, so the honest Phase 15 offline flash is invisible to the user as a false disconnect. Surfaced here, owned there.
- **Phase 17 — 403 branch-access handling** (BERR): consume the D-06-captured signal shape; add toast + reopen switcher + refetch branch list for `BRANCH_INACTIVE` / `BRANCH_ACCESS_REVOKED`, a full-screen block for `NO_BRANCH_ACCESS`, and suppress the library's blind exponential-backoff retry on a 403 (which will otherwise loop forever against an inaccessible branch).
- **Phase 16 — switch flow / `client.me.branches.switch` mutation** (SWCH-03) and **POS cart reset / detail exit on switch** (SCOPE-03).

None of these were scope creep — all are already-roadmapped later phases surfaced by the discussion.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SCOPE-02 | The live SSE stream reconnects on switch so the order list and Kitchen Display receive the new branch's events; the reconnect must not fire the initial-snapshot sound burst. | Pattern 1 (dependency-driven reconnect) + Pitfall 1 (explicit `isConnected` reset needed for a *visible* reconnect) satisfy SC1; the full cache-write inventory + Phase 14 key-shape verification (Pattern 2, Code Examples) satisfy D-04's re-keying requirement underlying SC2; the existing `snapshotDone` ref mechanism (confirmed still structurally sound across a dependency-driven effect re-run) satisfies SC3; the `null`-is-stable finding (Pitfall 3) satisfies SC4's single-branch regression bar; SC2 itself is routed to the D-07 human/UAT checkpoint per the Validation Architecture section. |
</phase_requirements>

## Summary

This phase is a source-level rewire of one file (`src/use-sse.js`), not a new-technology phase — every fact needed is verifiable directly from the installed package source and the sibling Phase 14 hooks, which is what this research does. The locked decisions (D-01..D-07) already fix the *shape* of the solution: add `currentBranch?.id` to the effect's dependency array, capture `branchId` once per connection, re-key all four cache writes to Phase 14's branch-scoped shapes, and add a non-behavioral capture log in `onopen`. This research verifies the *exact* line-level mechanics the planner needs to get that shape right on the first pass, and surfaces one consequential gap in the CONTEXT.md's own reasoning: **D-01's claim that "the effect's own abort→re-run gives SC1's visible drop-and-recover for free" is not fully true at the `isConnected` level** — tracing `@microsoft/fetch-event-source`'s actual abort path shows a manually-aborted connection calls neither `onerror` nor `onclose`, so `isConnected` will not flip to `false` on its own during a branch-triggered reconnect unless the plan adds an explicit reset. This is the single most important finding in this research and directly affects whether SC1 and D-05 are actually satisfied by the effect-dependency approach as literally described.

The four SSE cache-write sites currently write to **unscoped, pre-Phase-14 keys** (`['orders']`, `['order', orderId]`, `['orders', fromStatus]`, `['stats']`) — this is exactly the orphaned-key bug D-04 describes, confirmed by reading the file as it exists today (not from prose). The Phase 14 hooks (`use-orders.js`, `use-order-detail.js`, `use-stats.js`, `use-order-actions.js`) all confirm the same branch-first key convention live in the codebase right now, so the target shapes are fully pinned down, not inferred.

**Primary recommendation:** Rewrite `use-sse.js`'s effect to (1) read `branchId` via `useAppStore((s) => s.currentBranch?.id) ?? null` at hook top, (2) add `branchId` to the effect dependency array, (3) explicitly reset `isConnected` to `false` at the top of the effect body (alongside the existing `snapshotDone.current = false` reset) so a branch-triggered reconnect visibly drops per SC1/D-05, (4) close over the connection's `branchId` in every one of the four cache-write call sites, re-keyed to Phase 14's shapes, and (5) add a capture-only `console.warn`/log line in `onopen` for non-2xx responses, reading `response.status` and `await response.text()` **before** throwing (the thrown `Error` is all `onerror` ever receives — the original `Response` is not accessible there).

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Branch-id selection for reconnect scoping | Frontend (React hook / Zustand) | — | `currentBranch` is client-side session state (Zustand); no server round-trip needed to read it |
| SSE connection lifecycle (open/abort/retry) | Frontend (React hook via `@microsoft/fetch-event-source`) | — | Connection is a client-initiated `fetch` stream; abort/retry orchestration lives entirely in the hook |
| Server-side branch scoping of the stream | API / Backend (`sitecare-orders-api` SSE route) | — | The server resolves `selected_branch_id` server-side per v2.6's session-state model; the client sends no branch param, it just reopens the connection so the server re-resolves against the new session state |
| Cache re-keying on live events | Frontend (TanStack Query cache, via the SSE hook) | — | Same tier as Phase 14's re-scoping; SSE writes are just another writer into the same branch-scoped key space TanStack Query owns |
| 403 signal capture (non-behavioral) | Frontend (SSE hook `onopen`) | — | Purely a logging concern in the client; no handling/recovery added this phase (Phase 17) |

## Package Legitimacy Audit

No new packages are installed this phase. `@microsoft/fetch-event-source` (already installed, `^2.0.1` per `package.json`) is the only third-party dependency touched, and it is being read/used, not newly added. Skipping the full audit table — nothing to verify against a registry that isn't already a shipped, in-use dependency confirmed present in `node_modules`.

## Standard Stack

No new libraries. This phase modifies existing code only:

| File | Role | Status |
|------|------|--------|
| `src/use-sse.js` | SSE hook — reconnect trigger, cache writes, capture scaffold | Modified this phase |
| `src/store.js` | Zustand — `currentBranch` selector source (`store.js:68`, session-only, never persisted) | Read-only this phase |
| `src/app.jsx:105` | `useSSE(token, onLiveOrder)` call site | Read-only — no change required by D-01 |
| `src/__tests__/use-sse.test.js` | Existing test suite (394 lines, 9 `describe` blocks) | Extended this phase |

**Installed and confirmed present** (`node_modules/@microsoft/fetch-event-source@2.0.1`, `package.json` dependency list): no install step needed.

## Architecture Patterns

### System Architecture Diagram

```
Zustand store (store.js)
   currentBranch: { id, name, ... } | null   ── session-only, set by Phase 16's switch onSuccess
        │
        │ selector: useAppStore(s => s.currentBranch?.id) ?? null
        ▼
useSSE(token, onLiveOrder)  [src/use-sse.js]
        │
        │  useEffect deps: [token, queryClient, branchId]   ◄── D-01: branchId ADDED here
        │
        ├─ branchId changes ──► cleanup fires: ctrl.abort() (old connection)
        │                        │
        │                        ▼
        │                    library's outer-signal 'abort' listener
        │                        → dispose() + resolve()  (NEITHER onerror NOR onclose fires!)
        │                        → isConnected stays whatever it was UNLESS explicitly reset
        │
        └─ effect body re-runs:
              snapshotDone.current = false     (existing — fresh silent window, SC3 preserved)
              setIsConnected(false)            (MUST ADD — explicit drop signal, SC1/D-05)
              const ctrl = new AbortController()
              const scopedBranchId = branchId  (D-03: captured once, closed over)
              fetchEventSource(SSE_URL, {
                onopen(response):
                    if (response.ok) → setIsConnected(true); arm 100ms snapshotDone timer
                    else → [D-06 capture: read response.status + body HERE, before throw]
                           → throw (existing throw→onerror→retry path UNCHANGED)
                onmessage(msg):
                    order_new         → setQueryData(['orders', scopedBranchId], …)
                                       → invalidateQueries(['stats', scopedBranchId])
                    order_status_changed → setQueryData(['orders', scopedBranchId], …)
                                       → setQueryData(['order', scopedBranchId, orderId], …)
                                       → invalidateQueries(['orders', scopedBranchId, fromStatus])
                                       → invalidateQueries(['orders', scopedBranchId, toStatus])
                                       → invalidateQueries(['stats', scopedBranchId])
                onerror() → setIsConnected(false)   (unchanged — natural drop/retry path)
                onclose() → setIsConnected(false)   (unchanged — natural stream close)
              })
        ▼
TanStack Query cache (branch-scoped keys, same key space Phase 14's 4 hooks read)
        ▼
OrdersScreen / KitchenScreen / OrderDetailScreen re-render from cache
```

### Recommended Project Structure

No new files or folders. All changes confined to `src/use-sse.js` plus test additions in `src/__tests__/use-sse.test.js`.

### Pattern 1: Dependency-driven reconnect (D-01)

**What:** Add the branch id to the effect's dependency array so React's own effect-rerun-on-dep-change mechanism performs the teardown/reconnect — no imperative `reconnect()` function, no ref-based trigger.

**When to use:** Exactly this case — a value that must force a full connection re-open on change, as opposed to `onLiveOrder`, which must NOT (hence its ref-based exclusion, already in the file).

**Example — current code (`src/use-sse.js:17-33`):**
```javascript
export function useSSE(token, onLiveOrder) {
  const queryClient = useQueryClient();
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
    snapshotDone.current = false; // reset so each (re)connect gets a fresh 100ms window
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    fetchEventSource(SSE_URL, { /* ... */ });

    return () => ctrl.abort();
  }, [token, queryClient]); // onLiveOrder intentionally excluded — stored in ref
```

**Target shape (this phase adds `branchId` selector + dep, and the explicit `isConnected` reset):**
```javascript
// added: import { useAppStore } from './store.js';
export function useSSE(token, onLiveOrder) {
  const queryClient = useQueryClient();
  const branchId = useAppStore((s) => s.currentBranch?.id) ?? null; // same idiom as use-orders.js:15
  const [isConnected, setIsConnected] = useState(false);
  // ... unchanged refs ...

  useEffect(() => {
    if (!token) {
      setIsConnected(false);
      return;
    }
    snapshotDone.current = false;
    setIsConnected(false); // NEW — explicit drop signal; library's abort path fires neither onerror nor onclose
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    const scopedBranchId = branchId; // D-03: captured once, closed over — never re-read inside handlers

    fetchEventSource(SSE_URL, { /* handlers reference scopedBranchId, not branchId */ });

    return () => ctrl.abort();
  }, [token, queryClient, branchId]); // branchId ADDED — the sole reconnect trigger
```

### Pattern 2: Captured, not live-read, branch id (D-03)

**What:** The `branchId` value that scopes a connection's cache writes is read once, at the top of the effect body, into a `const` that every handler closes over — never re-read from the store inside `onmessage`.

**When to use:** Any in-flight async callback (SSE message handler) whose owning connection may be torn down mid-flight; prevents a message from an aborted old connection from writing to the new branch's key.

**Why this specific file needs it:** `onmessage`, `onopen`, `onerror`, and `onclose` are all closures created once per `fetchEventSource(...)` call inside the effect body — they naturally close over any `const` declared above them in the same effect run, so this is a zero-cost pattern already idiomatic to the file; the only change is declaring `const scopedBranchId = branchId;` before the `fetchEventSource` call and using `scopedBranchId` (not `branchId`) inside all four write sites.

### Anti-Patterns to Avoid

- **Reading `branchId` inside `onmessage` via a fresh `useAppStore.getState().currentBranch?.id` call:** defeats D-03 — a message from an old, just-aborted connection could read the *new* branch id and write into the new branch's cache, reintroducing cross-branch bleed. Always use the captured `scopedBranchId` const.
- **Putting `branchId` in a `ref` instead of the dependency array:** mirrors the `onLiveOrder` ref pattern by accident, but does the opposite of what's needed — a ref change never triggers an effect re-run, so the connection would never actually reconnect on branch switch.
- **Assuming the effect teardown alone flips `isConnected` to `false`:** confirmed false by reading `node_modules/@microsoft/fetch-event-source/lib/esm/fetch.js` — see Pitfall 1 below. Must add an explicit `setIsConnected(false)` at the top of the effect body.
- **Trying to read the non-2xx response body in `onerror`:** `onerror(err: any)` receives only the `Error` object thrown by `onopen`, never the original `Response`. The status/body capture for D-06 **must** happen inside `onopen`, before the `throw`.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Reconnect-on-branch-change orchestration | A manual `reconnect()` imperative function, an `AbortController` re-creation helper, or a custom retry/backoff wrapper | React's own effect dependency array (already the file's existing idiom for `[token, queryClient]`) | D-01: keeps the hook declarative and self-contained; matches the file's existing pattern exactly — zero new abstraction needed |
| Detecting a non-2xx SSE open | A custom response-shape parser or schema validator for the 403 body | A minimal capture log (`console.warn`/structured sink) of `response.status` + best-effort body text, per D-06 | The actual shape is unverified — building a parser for an unknown shape is premature; log first, build Phase 17's handler once the real shape is observed |

**Key insight:** This phase's entire job is re-wiring existing, working idioms (effect deps, ref-captured closures, branch-scoped keys already proven in Phase 14) to one more consumer (`use-sse.js`). There is no new pattern to invent — the risk is entirely in *fidelity* to those existing idioms, not in architecture.

## Common Pitfalls

### Pitfall 1: `isConnected` does not flip to `false` on a manual `ctrl.abort()` — the effect teardown does NOT give SC1's "visible drop" for free

**What goes wrong:** CONTEXT.md's D-01 reasoning states "The effect's own abort→re-run gives SC1's visible drop-and-recover for free." Tracing the actual library source (`node_modules/@microsoft/fetch-event-source/lib/esm/fetch.js`) shows this is only half true.

**Why it happens:** `fetchEventSource` registers a listener on the *outer* signal (the one passed in `options.signal`, i.e. `ctrl.signal`):
```javascript
inputSignal?.addEventListener('abort', () => {
    dispose();
    resolve();
});
```
`dispose()` clears timers and aborts the library's *internal* fetch controller (`curRequestController`), which is a different object from the outer `ctrl`. The internal fetch/stream-read then throws inside `create()`'s `try/catch`, but the catch block explicitly checks `if (!curRequestController.signal.aborted)` before calling `onerror` — and it *is* aborted at that point, so the whole retry/`onerror` branch is skipped entirely. **Neither `onerror()` nor `onclose()` is ever invoked as a result of calling `ctrl.abort()`.** Since React does not reset `useState` values across an effect *re-run* (only across a full unmount/remount), `isConnected` simply retains its prior value (almost always `true`) straight through the abort — until the *new* connection's own `onopen`/`onerror` eventually fires asynchronously.

**How to avoid:** Add an explicit `setIsConnected(false)` at the top of the effect body (next to the existing `snapshotDone.current = false` reset), so every effect run — first connect and every branch-triggered reconnect alike — starts from a known "disconnected" state. This is a no-op UI change for first connect (already `false`) but is what actually produces SC1's "visibly reconnect... drop and recover" and satisfies D-05's "isConnected flips honestly during a branch-triggered reconnect."

**Warning signs:** A UAT run where a branch switch reconnects the stream (confirmed via network/console logs) but the `OfflineBanner` (`shell.jsx:226`) never appears and Accept/Advance buttons (`screen-orders.jsx:149-151`) never grey out — the reconnect is real but invisible to the user, silently failing SC1's "visibly reconnect" criterion and D-05's honest-flash contract that Phase 16 is depending on for its own pending-state bridging.

### Pitfall 2: Missing one of the four cache-write sites when re-keying leaves an orphaned unscoped write

**What goes wrong:** The current file (confirmed by direct read) writes to `['orders']` (upsert, `use-sse.js:59`), `['stats']` (invalidate, `use-sse.js:67`), `['orders']` again (status patch, `use-sse.js:83`), `['order', orderId]` (detail patch, `use-sse.js:94`), `['orders', fromStatus]` / `['orders', toStatus]` (status-filtered invalidations, `use-sse.js:100-101`), and `['stats']` again (`use-sse.js:102`) — **seven** call sites total across two message handlers, not four generic "cache writes." Missing any one leaves that event writing to a key no branch-scoped hook reads (per D-04's exact framing).

**Why it happens:** The two handlers (`order_new`, `order_status_changed`) are visually dense; it's easy to re-key the obvious `setQueryData(['orders'], ...)` calls and miss the `invalidateQueries` calls further down, or vice versa.

**How to avoid:** Enumerate every `queryClient.*` call in the file before editing (see exact line list below) and check each one off against the Phase-14-confirmed target shape.

**Warning signs:** A status-filtered order list (e.g., a KDS column keyed `['orders', branchId, 'preparing']`) stops updating live after a branch switch while the main unfiltered list keeps working — a sign one invalidation call was missed while the `setQueryData` calls were re-keyed.

### Pitfall 3: `branchId === null` must remain a stable, non-reconnecting value for single-branch tenants (SC4)

**What goes wrong:** Treating `null` as "not yet loaded" and adding logic to defer/retry the connection until a non-null `branchId` appears would break SC4 (the standing single-branch regression) and Phase 13/14's established convention.

**Why it happens:** `null` looks like an "unset" sentinel, tempting a defensive `if (branchId == null) return;` guard.

**How to avoid:** Treat `null` exactly as Phase 14 already does (`?? null` in the selector, `['orders', null]` as a fully valid key) — it never changes for a single-branch tenant (or a non-401 cold start with no branch), so the effect's dependency array simply never re-triggers, giving SC4's "connects once, stays connected" for free. Do not special-case `null`.

**Warning signs:** A single-branch fixture that used to connect once now shows repeated reconnect cycles in logs, or `enabled`/gating logic added around the SSE effect that didn't exist before.

### Pitfall 4: Race between switch success and reconnect is closed by construction, but only if `branchId` is read the same way `use-orders.js` reads it

**What goes wrong:** If `currentBranch` were read optimistically (before `client.me.branches.switch` resolves), the SSE effect could reconnect to a branch the server hasn't actually switched to yet, or reconnect before Phase 16's mutation has even fired.

**Why it happens:** N/A this phase — Phase 16 sets `currentBranch` only in `onSuccess` (non-optimistic, confirmed in `REQUIREMENTS.md` SWCH-03 and `STATE.md`'s "never invalidate/reconnect optimistically on switch click" watch-out). Phase 15's effect is a pure consumer of that value.

**How to avoid:** No action needed in this phase beyond using the identical selector idiom (`useAppStore((s) => s.currentBranch?.id) ?? null`) already used by all four Phase 14 hooks — this guarantees the SSE hook observes `currentBranch` changes at the exact same tick as every other branch-scoped hook, with no separate polling or staleness window.

**Warning signs:** N/A — flagged here only so the planner doesn't re-derive or second-guess this; it's inherited safety, not something to build.

## Code Examples

### Full inventory of `queryClient` call sites requiring re-keying (verified by direct read of `src/use-sse.js`, current lines)

```javascript
// Source: src/use-sse.js (as of Phase 14 completion, pre-Phase-15)

// order_new handler (lines 56-75)
queryClient.setQueryData(['orders'], (old) => { /* upsert */ });      // → ['orders', scopedBranchId]
queryClient.invalidateQueries({ queryKey: ['stats'] });               // → ['stats', scopedBranchId]

// order_status_changed handler (lines 78-106)
queryClient.setQueryData(['orders'], (old) => { /* status patch */ }); // → ['orders', scopedBranchId]
queryClient.setQueryData(['order', orderId], (old) => { /* patch */ }); // → ['order', scopedBranchId, orderId]
queryClient.invalidateQueries({ queryKey: ['orders', fromStatus] });   // → ['orders', scopedBranchId, fromStatus]
queryClient.invalidateQueries({ queryKey: ['orders', toStatus] });     // → ['orders', scopedBranchId, toStatus]
queryClient.invalidateQueries({ queryKey: ['stats'] });                // → ['stats', scopedBranchId]
```

### Phase 14 target key shapes (verified by direct read of the live hooks, not prose)

```javascript
// Source: src/use-orders.js:18
queryKey: status ? ['orders', branchId, status] : ['orders', branchId],

// Source: src/use-order-detail.js:10
queryKey: ['order', branchId, id],

// Source: src/use-stats.js:10
queryKey: ['stats', branchId],

// Source: src/use-order-actions.js:31-33 (mutation-side invalidation — same shapes)
queryClient.invalidateQueries({ queryKey: ['orders', branchId] });
queryClient.invalidateQueries({ queryKey: ['order', branchId] });
queryClient.invalidateQueries({ queryKey: ['stats', branchId] });
```

### `onopen`'s actual signature and abort semantics (verified from installed package source)

```typescript
// Source: node_modules/@microsoft/fetch-event-source/lib/esm/fetch.d.ts
export interface FetchEventSourceInit extends RequestInit {
    onopen?: (response: Response) => Promise<void>;   // real Fetch API Response — .status, .headers, .body all available
    onerror?: (err: any) => number | null | undefined | void;  // receives the THROWN value only, never the Response
}
```

```javascript
// Source: node_modules/@microsoft/fetch-event-source/lib/esm/fetch.js — the abort path (verified)
inputSignal?.addEventListener('abort', () => {
    dispose();   // aborts the library's OWN internal fetch controller, clears retry timer
    resolve();   // resolves the outer fetchEventSource() promise
});
// dispose()'s internal abort causes create()'s catch(err) block to run, but it's gated:
//   if (!curRequestController.signal.aborted) { /* onerror + retry scheduling */ }
// — which is FALSE immediately after dispose(), so onerror/onclose are skipped entirely.
```

### D-06 capture scaffold — correct placement (must read Response before throwing)

```javascript
async onopen(response) {
  if (response.ok) {
    setIsConnected(true);
    setTimeout(() => { snapshotDone.current = true; }, 100);
    return;
  }
  // D-06: non-behavioral capture — must happen HERE, response is unavailable in onerror
  let body;
  try { body = await response.text(); } catch { body = undefined; }
  console.warn('[SSE] non-2xx onopen', { status: response.status, body }); // fields: status mandatory, body best-effort
  throw new Error(`SSE: server returned ${response.status}`); // existing throw, unchanged
},
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|---------------|--------|
| SSE connection opened once per `[token, queryClient]`, never reconnects on branch change | SSE connection also reacts to `currentBranch?.id` | This phase (v2.6 branching model) | Live stream stays correctly scoped to whichever branch is active, closing the last branch-awareness gap after Phase 14's fetch-hook re-scoping |
| Cache writes target unscoped `['orders']` / `['stats']` / `['order', id]` keys | Cache writes target Phase 14's branch-scoped keys | This phase | SSE writes land in the same key space the screens actually read from post-Phase-14; currently (pre-Phase-15) SSE writes are silently orphaned against those screens' branch-scoped reads |

**Deprecated/outdated:** N/A — no external API or library version changed this phase; this is purely an internal re-scoping consistent with the model Phase 14 already established.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | The server's `/v1/sse/orders` route returns a 403 with a body shape resembling the SDK's generic `{ error: string }` envelope (used by SDK-mediated calls like `client.me.branches.switch`) when branch resolution fails | Common Pitfalls / D-06 context | Low — the phase does not act on this shape at all (capture-only); if wrong, only the Phase 17 planner's expectations need correcting once the D-06 log actually fires during Phase 16/17 testing. Flagged as unverified in ROADMAP.md's own planning note — not resolved by this research, by design. |

**Note:** Every other claim in this research was verified directly against `node_modules/@microsoft/fetch-event-source` source, the live `src/*.js` hook files, and `src/__tests__/use-sse.test.js` — not from training knowledge or web search. No `[ASSUMED]`-tagged package or API claims exist outside A1.

## Open Questions

1. **Exact 403 body shape from `/v1/sse/orders`** (ROADMAP's own flagged item, D-06's reason for existing)
   - What we know: the SDK's own generic `Error` type for *SDK-mediated* 403s (e.g., `client.me.branches.switch`) is `{ error: string }` (verified in `node_modules/@charlyk/admin-client/dist/index.d.ts`). The SSE route is fetched directly (not via the SDK client), so this convention is not guaranteed to apply.
   - What's unclear: whether the raw `/v1/sse/orders` 403 response body matches that shape, is empty, or differs — and whether `content-type` on that response is JSON, since `response.text()` is the only safe read (JSON parsing could throw on an unexpected body).
   - Recommendation: implement the D-06 capture exactly as scaffolded (status + best-effort `response.text()`, never `.json()` which could throw and mask the real signal) and treat the first real observation (Phase 15 UAT if a switcher exists by then, more realistically Phase 16/17 testing) as the actual answer — do not guess a shape into Phase 17's design before that.

2. **`abortRef` is currently write-only, never read** (`use-sse.js:20,34`)
   - What we know: `abortRef.current = ctrl` is assigned every effect run but nothing in the file ever reads `abortRef.current` (confirmed by grep across `src/`).
   - What's unclear: whether this is vestigial from an earlier design (e.g., an imperative `reconnect()` that was never built) or intentionally reserved for a future phase.
   - Recommendation: leave it as-is (removing it is out of scope and not required by any locked decision); the planner should not treat its presence as a hint that an imperative trigger is expected — D-01 explicitly rejected that approach.

## Environment Availability

Skipped — this phase has no new external dependencies (no new packages, no new services, no new CLI tools). `@microsoft/fetch-event-source`, TanStack Query, and Zustand are all already installed and in active use elsewhere in the codebase.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest ^4.1.5 (`package.json` devDependencies) |
| Config file | `vitest.config.js` (repo root) |
| Quick run command | `npx vitest run src/__tests__/use-sse.test.js` |
| Full suite command | `npx vitest run` |

The existing harness (confirmed by full read of `src/__tests__/use-sse.test.js`, 394 lines) mocks `fetchEventSource` at the module level (`vi.mock('@microsoft/fetch-event-source', () => ({ fetchEventSource: vi.fn() }))`), captures the `onopen`/`onmessage` callbacks passed into the mock's `mockImplementation`, and drives them manually via `act()`. Each test builds its own `QueryClient` + `QueryClientProvider` wrapper and pre-seeds cache state with `queryClient.setQueryData([...], ...)` before firing a captured handler. `vi.useFakeTimers()` / `vi.advanceTimersByTime()` is the established pattern for the 100ms `snapshotDone` window (see the two `KDS-04` tests). **No `vi.mock('./store.js', ...)` currently exists** — this phase's new `useAppStore` selector read will need either a real `store.js` import (Zustand stores work fine un-mocked in tests since they're plain JS, not React context) or a light mock, following whatever pattern the codebase already uses elsewhere for `useAppStore` in tests (check sibling hook tests, e.g. `src/__tests__/use-orders.test.js` if present, for the established idiom before inventing a new one).

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SCOPE-02 (SC1) | Effect re-runs and tears down (`ctrl.abort()` called) when `branchId` changes across a `renderHook` rerender; `isConnected` explicitly flips to `false` at the top of the new effect run | unit | `npx vitest run src/__tests__/use-sse.test.js -t "reconnect"` | ❌ Wave 0 — new `describe` block needed |
| SCOPE-02 (SC1) | `fetchEventSource` is called a second time with a fresh `AbortController` signal after a `branchId` change (asserting `fetchEventSource.mock.calls.length === 2` and the two signals differ) | unit | same file | ❌ Wave 0 |
| SCOPE-02 (SC3) | `snapshotDone.current` resets to `false` on every effect run (existing 100ms mechanism), so a live `order_new` fired immediately after a branch-triggered reconnect does **not** call `onLiveOrder` (silent snapshot re-armed) | unit | same file, extends existing `KDS-04` `describe` block pattern | ❌ Wave 0 — new test case in existing block |
| SCOPE-02 (D-04 key alignment) | `order_new` / `order_status_changed` handlers write to `['orders', branchId]`, `['orders', branchId, status]`, `['order', branchId, orderId]`, `['stats', branchId]` — not the old unscoped keys | unit | same file | ❌ Wave 0 — rewrite of existing `U9b`/`U9b2` assertions, which currently assert unscoped `['orders']`/`['order', orderId]` |
| SCOPE-02 (D-03 captured-not-live-read) | A message arriving after `branchId` changes (simulating a late message from a stale connection) writes to the **old** captured branch's key, not the new live store value | unit | same file | ❌ Wave 0 — new test, needs a way to change the store's `currentBranch` mid-test and assert against both key shapes |
| SCOPE-02 (SC4 regression) | A `renderHook` where `branchId` never changes across rerenders never causes `fetchEventSource` to be called more than once | unit | same file | ❌ Wave 0 — new test |
| SCOPE-02 (SC2 — KDS + order list both receive new branch's events) | N/A — requires two concurrent live sessions against the real API | manual/UAT (per D-07) | — | Human-verification checkpoint, not automatable |

### Sampling Rate
- **Per task commit:** `npx vitest run src/__tests__/use-sse.test.js`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd-verify-work`, plus the SC2 human/UAT checkpoint per D-07

### Wave 0 Gaps
- [ ] `src/__tests__/use-sse.test.js` — needs: (1) a `describe('branch-aware reconnect')` block covering effect-rerun-on-branchId-change + explicit `isConnected` false-flip, (2) rewritten `U9b`/`U9b2` assertions targeting branch-scoped keys instead of the current unscoped `['orders']`/`['order', orderId]`, (3) a captured-vs-live-read regression test for D-03, (4) a single-branch (`branchId` never changes) regression test for SC4.
- [ ] Decide the `useAppStore`/`currentBranch` test-seeding mechanism before writing new tests — check for an existing sibling-hook test (e.g. any `use-orders`/`use-order-detail` test file) for the established store-mocking idiom in this codebase; do not invent a new one if a precedent exists.
- [ ] Framework install: none — Vitest, `@testing-library/react`, and all mocks are already present and used by the existing 394-line suite.

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | Yes (unchanged) | Bearer token in `Authorization` header only, never URL (`use-sse.js:37`, existing, T-3-01) — untouched by this phase |
| V3 Session Management | Yes (peripheral) | `currentBranch` is session-only Zustand state, never persisted (`store.js:68`); this phase only reads it, doesn't manage it |
| V4 Access Control | Yes (peripheral) | Branch-scoping is enforced server-side (`selected_branch_id` session state) — the client reconnecting is a UX/freshness concern, not an access-control boundary; a stale connection could show stale-but-still-authorized data, never unauthorized data, since the server itself decides what the old connection could see |
| V5 Input Validation | Yes (unchanged) | `JSON.parse(msg.data)` wrapped in try/catch, malformed messages ignored silently — existing pattern, untouched |
| V6 Cryptography | N/A | No cryptographic operations in this phase |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Stale/late SSE message from an aborted old connection writing into the new branch's cache (cross-branch data bleed) | Tampering (of client-side cache state, not server data) | D-03's captured-`branchId`-per-connection pattern — the mitigation this whole phase is built around; verified structurally sound because JS closures guarantee `scopedBranchId` cannot change after capture |
| Logging a 403 response body that might contain sensitive fields (D-06 capture) | Information Disclosure (client-side log, not a network exposure) | Keep the D-06 log to `console`/local dev tooling only, as scoped by CONTEXT.md ("non-behavioral... status is mandatory; body/headers best-effort") — do not forward this log to any remote telemetry sink in this phase; that decision (if ever made) belongs to a future phase with its own review |

## Sources

### Primary (HIGH confidence — direct source inspection this session)
- `node_modules/@microsoft/fetch-event-source/lib/esm/fetch.js` — full read; verified the abort-path behavior (Pitfall 1) and `onopen`/`onerror` signal availability
- `node_modules/@microsoft/fetch-event-source/lib/esm/fetch.d.ts` — `FetchEventSourceInit` type signature confirming `onopen(response: Response)` vs `onerror(err: any)`
- `node_modules/@charlyk/admin-client/dist/index.d.ts` — confirmed generic SDK `Error = { error: string }` envelope shape (lines ~1240) and `SwitchMyBranchErrors` 403 typing (lines ~2000-2010); confirmed no SSE-specific error typing exists for the raw `/v1/sse/orders` route
- `src/use-sse.js` — full read, current (pre-Phase-15) state; exact line numbers for all 7 cache-write call sites
- `src/use-orders.js`, `src/use-order-detail.js`, `src/use-stats.js`, `src/use-order-actions.js` — full reads; confirmed exact target key shapes for D-04
- `src/__tests__/use-sse.test.js` — full read (394 lines); confirmed mocking pattern, existing assertions that must be rewritten
- `src/app.jsx:95-114` — confirmed the `useSSE(token, onLiveOrder)` call site and `isOffline = !isConnected` derivation
- `src/shell.jsx:220-230`, `src/screen-orders.jsx:145-155` — confirmed `OfflineBanner` and disabled-action line references from CONTEXT.md
- `src/store.js:68,116` — confirmed `currentBranch` field definition and setter
- `package.json` — confirmed Vitest `^4.1.5`, `@microsoft/fetch-event-source` `^2.0.1`, no dedicated `test` npm script (run via `npx vitest`)
- `.planning/config.json` — confirmed `nyquist_validation: true` (Validation Architecture section required)

### Secondary (MEDIUM confidence)
- None — all findings this session were verified against primary sources directly.

### Tertiary (LOW confidence)
- None.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new packages; all existing dependency versions confirmed via `package.json` and `node_modules`
- Architecture: HIGH — every diagram element and pattern traced to an exact file/line in the live codebase
- Pitfalls: HIGH — Pitfall 1 (the abort/`isConnected` gap) is derived from direct line-by-line reading of the installed library's source, not inference

**Research date:** 2026-07-22
**Valid until:** 30 days (stable internal codebase phase; only re-verify if `@microsoft/fetch-event-source` is upgraded before this phase executes)
