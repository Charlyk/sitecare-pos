# Architecture Research: Branch Switching (v1.2)

**Domain:** Integration architecture — adding branch switching to an existing Tauri v2 / React / Zustand / TanStack Query POS app
**Researched:** 2026-07-21
**Confidence:** HIGH (grounded directly in `src/app.jsx`, `src/store.js`, `src/auth.jsx`, `src/use-sse.js`, all 7 `use-*.js` data hooks, `@charlyk/admin-client` v1.1.67 `dist/index.d.ts`, and `~/Developer/sitecare-orders-api/docs/RESTAURANT_DASHBOARD_PRD.md` §5–7, §11, §15–16)

## Core Architectural Insight

Branch switching integrates almost entirely through **query-key parameterization**, not through new invalidation machinery. If every branch-scoped `queryKey` is prefixed with `currentBranch.id` read from Zustand, then changing that one Zustand value causes every consuming `useQuery` to compute a *new, never-before-seen* key on its next render — which TanStack Query treats as a cache miss and fetches automatically. No `queryClient.invalidateQueries()` calls are needed for the branch-scoped hooks themselves. The same is true of `useSSE`: adding `branchId` to its effect dependency array makes React tear down the old `fetchEventSource` connection and open a new one the instant `currentBranch.id` changes — no manual "disconnect then reconnect" call is needed either. The entire "switch orchestration" collapses to: call the switch endpoint, and on success, write the new `currentBranch` into Zustand. Everything downstream reacts on its own.

This mirrors a pattern the codebase already uses for `['orders', status]` (varying the key by an argument) — it is not a new idiom, it's an extension of one already proven in this app.

## System Overview

```
┌──────────────────────────────────────────────────────────────────────┐
│ AuthProvider (src/auth.jsx)                                          │
│  cold-start restore ──┐                                              │
│  signIn() ─────────────┼──► client.auth.getMe() ──► CurrentUser      │
│                        │      { ...,  selectedBranch }               │
│                        └──► setAuthUser(me) + setCurrentBranch(me.   │
│                              selectedBranch)   [Zustand, session-only│
│                              — mirrors existing authUser pattern]    │
├──────────────────────────────────────────────────────────────────────┤
│ Zustand store.js (UI/session state — unchanged discipline)           │
│  currentBranch: SelectedBranch|null   (NEW, session-only, not        │
│    persisted — always re-seeded from getMe() on cold start)          │
│  branchSwitcherForceOpen: boolean     (NEW, session-only — set by    │
│    the 403 handler, read by the switcher component)                 │
├──────────────────────────────────────────────────────────────────────┤
│ TanStack Query (server state — unchanged discipline)                 │
│  ['branches']                 useBranches()        NEW — not         │
│                                                      branch-prefixed  │
│                                                      (it's what lets  │
│                                                      you pick a       │
│                                                      branch)          │
│  ['orders', branchId]         useOrders()           MODIFIED         │
│  ['orders', branchId, status] useOrders(status)      MODIFIED         │
│  ['order', branchId, id]      useOrderDetail(id)     MODIFIED         │
│  ['menu', branchId]           useMenu()              MODIFIED         │
│  ['history-orders', branchId, from, to] useHistoryOrders() MODIFIED  │
│  ['stats', branchId]          useStats()             MODIFIED         │
│  ['restaurant-settings', branchId] useRestaurantSettings() MODIFIED  │
│  ['delivery-areas', branchId] useDeliveryAreas()     MODIFIED         │
├──────────────────────────────────────────────────────────────────────┤
│ useSSE(token, branchId, onLiveOrder)   MODIFIED                      │
│  effect deps: [token, branchId, queryClient]  (branchId NEW)         │
│  writes to ['orders', branchId], ['stats', branchId] (branchId-      │
│  aware — was hardcoded ['orders']/['stats'])                         │
├──────────────────────────────────────────────────────────────────────┤
│ App() (src/app.jsx) — hook host, unconditional call order preserved  │
│  const currentBranch = useAppStore(s => s.currentBranch);            │
│  const { data: branches } = useBranches();             NEW           │
│  const { switchBranch, switching } = useBranchSwitch(); NEW          │
│  const { isConnected } = useSSE(token, currentBranch?.id, ...);      │
│  → passes branches / currentBranch / switchBranch DOWN to <Shell>    │
│    as props (Shell does NOT call its own data hooks — see below)     │
├──────────────────────────────────────────────────────────────────────┤
│ Shell (src/shell.jsx) — chrome, prop-driven (unchanged convention)   │
│  BranchSwitcher (NEW component) replaces the RO/EN toggle block      │
│  (lines ~136-147); RO/EN moves into Settings → Afișaj                │
├──────────────────────────────────────────────────────────────────────┤
│ QueryClient (src/main.jsx) — MODIFIED                                │
│  new QueryClient({ queryCache: new QueryCache({ onError }),          │
│                     mutationCache: new MutationCache({ onError }) })  │
│  onError = handleBranchError(err, queryClient) — the ONE choke point │
│  for BRANCH_INACTIVE / BRANCH_ACCESS_REVOKED / NO_BRANCH_ACCESS,     │
│  regardless of which hook or the switch mutation raised it           │
└──────────────────────────────────────────────────────────────────────┘
```

## Component Responsibilities

| Component | Responsibility | Where it lives |
|-----------|-----------------|-----------------|
| `currentBranch` (Zustand) | Single source of truth for "which branch am I looking at" — the full `SelectedBranch` object (`id`, `name`, `slug`, `isDefault`, `isActive`), not just an id. Read synchronously by every branch-scoped hook and by Shell for display. | `store.js` — new session-only key, same tier as existing `authUser` |
| `useBranches()` (TanStack Query) | Fetches `client.me.branches.list()` → `AccessibleBranch[]`. Populates the switcher. Cross-branch/user-scoped, so its key is **not** prefixed with `branchId`. | new `use-branches.js` |
| `useBranchSwitch()` (TanStack Query mutation) | Wraps `client.me.branches.switch({branchId})`. On success, resolves the full branch object from the already-cached `['branches']` list and writes it to Zustand. Does **not** manually touch SSE or other query caches — those react on their own. | new `use-branches.js` |
| `useSSE(token, branchId, onLiveOrder)` | Owns the realtime connection lifecycle. Reconnects when `branchId` changes (in addition to existing `token` reconnect). Writes into branch-prefixed cache keys. | `use-sse.js` (modified) |
| Per-resource hooks (`useOrders`, `useOrderDetail`, `useMenu`, `useHistoryOrders`, `useStats`, `useRestaurantSettings`, `useDeliveryAreas`, `useOrderActions`) | Each reads `currentBranch?.id` via `useAppStore` (same pattern they already use for `useAuth()`'s `client`) and folds it into its `queryKey` / `enabled` guard / `invalidateQueries` calls. | 7 existing files, each modified |
| `QueryCache`/`MutationCache` global `onError` | The single interceptor for the three `BRANCH_*` 403 codes, regardless of which query or the switch mutation produced them. Pushes a toast, sets `branchSwitcherForceOpen`, invalidates `['branches']`. | `main.jsx` (modified) + new `use-branches.js` (`handleBranchError`) |
| `unwrapSdkResult()` helper | Every hook currently hand-rolls `if (result.error) throw new Error(...)`. Extend (or introduce, reusing the existing `err.diagnostic` idea from `use-history-orders.js`) so the thrown `Error` also carries `err.code = result.error?.error` (e.g. `'BRANCH_INACTIVE'`) — otherwise the global `onError` has nothing to pattern-match on. | `data.jsx` or new `sdk-helpers.js` |

## Answering the Six Questions

### 1. Where does "current branch" + "accessible branches" state live?

**Split, following existing precedent exactly:**

- **`currentBranch` → Zustand**, session-only, not persisted. This is architecturally identical to `authUser`: a single server-originated fact ("who/where am I") that many unrelated consumers need synchronously (query-key construction, SSE reconnect, Shell display), not a collection to be paged/filtered/invalidated. It is seeded by `AuthProvider`, not fetched by a screen.
- **`accessibleBranches` → TanStack Query**, key `['branches']`. This is a genuine server *list* resource with its own fetch/cache/refetch lifecycle (PRD §7.3: "Do not cache the branch list indefinitely... refetch on focus/after errors") — exactly the shape `useOrders`/`useMenu` already have. Set `refetchOnWindowFocus: true` and a short `staleTime` (e.g. `30_000` or `0`) to satisfy that requirement.

**Do not persist `currentBranch` to `preferences.json`.** The server re-validates `selected_branch_id` on *every* request (PRD §5.2) and access can be revoked between sessions — a cached stale branchId would let the UI show a branch label the user no longer has rights to for a few hundred ms until the first request 403s. Always re-derive from `client.auth.getMe().selectedBranch` on cold start, same as `authUser` is (in principle) meant to be re-derived on sign-in.

**Concrete gap to avoid repeating:** today's cold-start restore effect in `auth.jsx` (lines 106–128) never calls `setAuthUser(...)` — only `signIn()` does (line 147). That's why `Shell` falls back to the hardcoded `'Eduard Albu'` display name after a restart. Do **not** copy this gap for `currentBranch`: call `client.auth.getMe()` and `setCurrentBranch(me.selectedBranch)` in **both** the cold-start effect and `signIn()`. (Fixing the pre-existing `authUser` gap at the same time is optional scope creep, not required by v1.2 — flag it, don't silently expand the phase.)

### 2. Query-key restructuring: prefix with `branchId`, not a global reset

**Prefix every branch-scoped key** with `branchId` as the key's second segment (after the resource name, matching the existing `['orders', status]` two-segment convention):

| Hook | Current key | New key |
|---|---|---|
| `useOrders()` | `['orders']` / `['orders', status]` | `['orders', branchId]` / `['orders', branchId, status]` |
| `useOrderDetail(id)` | `['order', id]` | `['order', branchId, id]` |
| `useMenu()` | `['menu']` | `['menu', branchId]` |
| `useHistoryOrders({from,to})` | `['history-orders', from, to]` | `['history-orders', branchId, from, to]` |
| `useStats()` | `['stats']` | `['stats', branchId]` |
| `useRestaurantSettings()` | `['restaurant-settings']` | `['restaurant-settings', branchId]` |
| `useDeliveryAreas()` | `['delivery-areas']` | `['delivery-areas', branchId]` |
| `useBranches()` | — | `['branches']` (**no** branchId prefix — deliberately cross-branch) |

Also add `branchId` to every `invalidateQueries({queryKey: [...]})` call inside `use-order-actions.js` and `use-sse.js` so a partial-key invalidation (e.g. `['orders']`) doesn't accidentally match every branch's cache entries at once — use `['orders', branchId]` there too.

**Why prefix instead of `queryClient.clear()` / `resetQueries()` on switch (the blunt alternative):**
- **Race safety.** The switch is `await`ed, but any in-flight request from the *old* branch (e.g. a slow `useHistoryOrders` fetch that started just before the user clicked switch) will resolve *after* the switch completes. With branch-prefixed keys, that stale response writes into the old branch's cache slot (`['history-orders', oldBranchId, ...]`) and is simply ignored — nothing subscribes to that key anymore. A flat `clear()` has no such isolation; a late-arriving write can land in a freshly-cleared cache with no branch discriminator to catch it.
- **No lost unrelated state.** `['branches']` itself, and anything unrelated to branch scoping, must *not* be wiped by a switch — a blunt `clear()` would need an explicit exclusion list; prefixing needs none.
- **Free "instant back" UX.** Switching back to a previously-visited branch within the query's `gcTime` (default 5 min) shows cached data immediately while revalidating in the background — a `clear()`-based approach throws this away every time.
- **Matches PRD's own recommendation verbatim:** "the safest pattern is to key your data-fetching cache... on the current `branchId` and change the key on switch" (§5.3).

### 3. `useSSE` reconnect on branch switch

Two changes to `use-sse.js`:

1. **Signature:** `useSSE(token, branchId, onLiveOrder)`. Add `branchId` to the effect's dependency array: `[token, branchId, queryClient]`. Extend the top-of-effect guard to `if (!token || !branchId) { setIsConnected(false); return; }` — this also naturally covers the brief window between `isAuthenticated=true` and `getMe()` resolving `currentBranch`, so no SSE connection (and no writes to `['orders', undefined]`) is attempted with an unknown branch.
2. **Cache writes:** every `queryClient.setQueryData`/`invalidateQueries` call inside `onmessage` must use the branch-prefixed key (`['orders', branchId]`, `['order', branchId, orderId]`, `['stats', branchId]`, etc.), since `branchId` is now in scope as a hook argument.

This is sufficient by itself — **no explicit "close SSE, then reopen SSE" call is needed inside the switch handler.** React's effect-cleanup rule already does it: when `branchId` changes, the effect's cleanup (`ctrl.abort()`) fires before the new effect body runs, so the old connection is torn down client-side *before* the reconnect attempt, rather than waiting on the server-initiated close (PRD §5.3, §11: "the server closes the user's SSE streams... client must reconnect") or the library's exponential-backoff retry. `snapshotDone.current = false` is already reset at the top of the effect body on every run, so each reconnect (branch-triggered or token-triggered) correctly gets a fresh 100ms absorption window for its own initial snapshot — no change needed there.

### 4. Switch orchestration sequence

```
User selects a branch in <BranchSwitcher>
  │
  ▼
switchBranch(branchId)   [useMutation.mutateAsync — must await]
  │
  ▼
client.me.branches.switch({ branchId })  →  { ok: true, branchId }
  │
  ├── on error (400/403) ──► rethrow; mutation's error flows to the
  │                          SAME global MutationCache.onError as any
  │                          other 403 (see Q6) — no local onError
  │                          needed. Per PRD §5.3/§7.2: a rejected
  │                          switch changes nothing server-side; UI
  │                          simply stays on the old branch because
  │                          Zustand was never written.
  │
  └── on success ──►
        1. next = branches.find(b => b.id === branchId)
           (resolved from the already-cached ['branches'] list —
           the switch response only returns { ok, branchId }, not
           the branch's name/slug/isDefault, so no 2nd round trip)
        2. setCurrentBranch(next)                    [Zustand write]
        3. if (['detail','history-detail'].includes(screen))
             setScreen('orders' | 'history')          [see edge case below]
        4. pushToast({ kind: 'success', title: `Switched to ${next.name}` })
        │
        ▼
   Zustand notifies subscribers ⇒ App() re-renders ⇒
     - every branch-prefixed useQuery computes a new key ⇒ cache miss
       ⇒ auto-refetch (no invalidateQueries call written by hand)
     - useSSE's effect deps changed ⇒ old connection aborted, new
       connection opened against the (now server-side switched) branch
```

Nothing in this sequence manually calls `invalidateQueries` for the branch-scoped resources, and nothing manually manages the SSE connection — both are consequences of steps 1–2, not separate steps. This is the intended simplification; treat any PR that adds explicit `invalidateQueries(['orders'])`-style calls inside the switch handler as a smell (it duplicates what the key change already does, and can race with it).

**Edge case — stale detail screens.** `App()` derives `selectedOrder`/`historyOrder` for the detail routes via `useOrderDetail(selectedOrderId)` (a live query), not by reading the raw order object out of Zustand — Zustand's `selectedOrder`/`historyOrder` only supply the `id`. So once `['order', branchId, id]` is branch-prefixed, switching branch while parked on `screen: 'detail'` turns that id into a cache-miss against the *new* branch and will most likely 404 (order not found there) rather than silently leaking branch-A data. That's a safe failure mode but a poor one — the fix is the one-line `setScreen('orders')`/`setScreen('history')` in step 3 above, reusing the router's existing reset-on-`setScreen` behavior (`store.js` already clears `selectedOrder`/`historyOrder` on any non-history `setScreen` call).

**Edge case — POS cart.** `screen-pos.jsx` keeps its cart in local `useState` (`cart`, `cat`, `customer`, etc. — not Zustand, not TanStack Query). Because `App()`'s router only unmounts `PosScreen` when `screen` changes, switching branch *while already on the POS screen* does **not** unmount it, so a half-built cart referencing branch-A product ids/prices survives the switch untouched. Recommend giving the POS route a `key={currentBranch?.id}` in `app.jsx`'s router (`{screen === 'pos' && <PosScreen key={currentBranch?.id} ... />}`) — the standard React idiom for "discard local state when an external identity changes" — rather than threading branch-awareness into the cart's own state. Flag this for phase planning; it wasn't in the original v1.2 scope list but follows directly from how `PosScreen` is actually built.

### 5. Launch-time seeding of the current branch

`client.auth.getMe()` → `CurrentUser` (confirmed via `@charlyk/admin-client` v1.1.67 `dist/index.d.ts` line 684–692) already carries `selectedBranch: SelectedBranch | null` where `SelectedBranch = { id, name, slug, isDefault, isActive } | null`. Call it in `auth.jsx`:

- **Cold-start restore effect** (lines 106–128): immediately after `createAdminClient(...)` succeeds and before `setColdStartBusy(false)`, call `const me = await adminClient.auth.getMe(); setCurrentBranch(me.selectedBranch);` (wrap in try/catch — non-fatal, same treatment as the existing `getSession()` call in `signIn()`).
- **`signIn()`** (lines 131–169): call it alongside the existing `setAuthUser(user)` at line 147, using the same `adminClient` instance.

Both call sites populate the same Zustand `currentBranch` slot, so every consumer (query hooks, `useSSE`, `Shell`) is agnostic to which path seeded it.

`useBranches()` (the `['branches']` list) does **not** need to be prefetched in `AuthProvider` — it's a screen/chrome concern, not an auth concern, and per the "Shell is prop-driven, not hook-driven" convention below, `App()` calls it once (unconditionally, alongside `useOrders`/`useSSE`) and passes the result down.

### 6. 403 branch-access error propagation

The SDK has no axios-style interceptor — every call returns a `{ data, error, response }` tuple that each hook currently unwraps by hand (`if (result.error) throw new Error(result.error.error ?? '...')`, see `use-orders.js`, `use-menu.js`, etc.; `use-history-orders.js` already goes further and attaches a non-breaking `.diagnostic` property to the thrown `Error`). The natural choke point in *this* architecture is not the SDK layer but **TanStack Query's `QueryCache`/`MutationCache` `onError`**, configured once:

```js
// main.jsx
import { QueryClient, QueryClientProvider, QueryCache, MutationCache } from '@tanstack/react-query';
import { handleBranchError } from './use-branches.js';

const queryClient = new QueryClient({
  queryCache: new QueryCache({ onError: (err) => handleBranchError(err, queryClient) }),
  mutationCache: new MutationCache({ onError: (err) => handleBranchError(err, queryClient) }),
});
```

For this to have anything to match on, every hook's error-throwing must attach the SDK's error code, e.g. `err.code = typeof result.error === 'string' ? result.error : result.error?.error` (mirrors the `.diagnostic` precedent already in `use-history-orders.js`). This is a small, mechanical addition to each of the 7 existing hooks' `queryFn`s (and to `use-order-actions.js`'s `mutationFn`s) — best centralized in a shared `unwrapSdkResult(result, fallback)` helper so it's written once, not seven times.

`handleBranchError` (new, in `use-branches.js`):
```js
export function handleBranchError(err, queryClient) {
  if (!['BRANCH_INACTIVE', 'BRANCH_ACCESS_REVOKED', 'NO_BRANCH_ACCESS'].includes(err?.code)) return;
  useAppStore.getState().pushToast({ id: Date.now(), kind: 'alert', title: /* branch-lost copy */ });
  useAppStore.getState().setBranchSwitcherForceOpen(true);
  queryClient.invalidateQueries({ queryKey: ['branches'] });
}
```

Because `MutationCache.onError` covers mutations too, a **rejected switch itself** (the `switchMyBranch` call returning 403) flows through the exact same function as a 403 discovered on any *later* unrelated request (PRD §7.3: "Handle 403 ... on switch **and** on any subsequent request by re-opening the switcher") — one implementation, two triggers, matching the PRD's requirement without a second code path. `NO_BRANCH_ACCESS` is included in the same handler for completeness even though the PRD treats it as a more severe full-screen state (§16) — decide during phase planning whether it needs a distinct UI treatment from the toast+reopen pattern used for the other two.

## Integration Points — New vs. Modified Files

| File | New / Modified | Change |
|---|---|---|
| `src/store.js` | Modified | Add `currentBranch: null`, `setCurrentBranch`, `branchSwitcherForceOpen: false`, `setBranchSwitcherForceOpen` — session-only, excluded from `partialize` |
| `src/auth.jsx` | Modified | Call `client.auth.getMe()` + `setCurrentBranch(me.selectedBranch)` in both the cold-start effect and `signIn()` |
| `src/use-branches.js` | **New** | `useBranches()` (`['branches']` query), `useBranchSwitch()` (mutation wrapping `client.me.branches.switch`), `handleBranchError()` |
| `src/use-orders.js`, `use-order-detail.js`, `use-menu.js`, `use-history-orders.js`, `use-stats.js`, `use-restaurant-settings.js`, `use-delivery-areas.js` | Modified | Read `currentBranch?.id` via `useAppStore`; fold into `queryKey` and `enabled` guard |
| `src/use-order-actions.js` | Modified | `invalidateQueries` calls gain the `branchId` segment |
| `src/use-sse.js` | Modified | New `branchId` param; add to effect deps; branch-prefix all `setQueryData`/`invalidateQueries` calls inside `onmessage` |
| `src/data.jsx` (or new `src/sdk-helpers.js`) | Modified/New | Shared `unwrapSdkResult()` that attaches `err.code` for the global error handler to match on |
| `src/main.jsx` | Modified | `QueryClient` gains `queryCache`/`mutationCache` with `onError: handleBranchError` |
| `src/app.jsx` | Modified | Call `useBranches()`/`useBranchSwitch()` unconditionally alongside existing `useSSE`/`useOrders`/`useUpdater` calls (before any early return); pass `currentBranch.id` into `useSSE`; pass `branches`/`currentBranch`/`switchBranch` down to `<Shell>` as new props; add the detail-screen redirect-on-switch (edge case in Q4); consider `key={currentBranch?.id}` on the POS route |
| `src/shell.jsx` | Modified | New `BranchSwitcher` component in the sidebar footer, replacing the RO/EN toggle block (lines ~136–147); RO/EN control relocates to `screen-settings.jsx` |
| `src/screen-settings.jsx` | Modified | Gains the relocated RO/EN language control (Afișaj section) |

**Hook-ordering constraint (respected above, worth restating for planning):** `App()` currently calls `useSSE`, `useOrders`, `useOrderDetail` (×2), `useStats`, `useRestaurantSettings`, `useDeliveryAreas`, `useOrderActions`, and `useUpdater` **unconditionally**, before the `coldStartBusy` blank-screen return and the `!isAuthenticated` → `<LoginScreen>` return. `useBranches()` and `useBranchSwitch()` must join that same unconditional block — not be called only once `currentBranch` is already known, and not be called conditionally inside a `role === ...`-style branch. This is exactly the same discipline already documented inline in `app.jsx` at the `useUpdater()` call site ("Must be called unconditionally before any early return to respect React hook ordering rules").

**Shell stays prop-driven, not hook-driven.** CLAUDE.md's "screens call their own data hooks" rule applies to `screen-*.jsx` components; `Shell` has never followed it — it already receives `lang`, `role`, `screen`, `accent`, `density`, `orderCount`, `sidebarCollapsed`, `isOffline` as props from `App()`, with zero hooks of its own. The new `BranchSwitcher` should follow `Shell`'s existing convention (props: `branches`, `currentBranch`, `onSwitchBranch`, `switching`, `forceOpen`) rather than calling `useBranches()`/`useBranchSwitch()` itself — introducing a hook call inside `Shell` would be a new, inconsistent pattern for this specific component.

## Suggested Build Order

1. **State + seeding foundation** — `store.js` additions, `auth.jsx` `getMe()` wiring (both call sites), `use-branches.js`'s `useBranches()`/`useBranchSwitch()` (no UI consumption yet). Low-risk, independently testable (mirrors the already-proven `authUser` pattern), unblocks everything else.
2. **Query-key branch-scoping** — retrofit all 7 existing data hooks + `use-order-actions.js`'s invalidations to branch-prefixed keys, plus the shared `unwrapSdkResult()`/`err.code` plumbing. Mechanical but touches every data hook; run the existing 487-test suite plus new key-shape assertions before moving on. This phase is the load-bearing one — everything after it depends on the key convention being settled and correct.
3. **`useSSE` branch-reconnect** — add `branchId` param/dep, branch-prefix the `onmessage` cache writes. Depends on step 2's key convention.
4. **Branch switcher UI** — `BranchSwitcher` component in `Shell`, wired to the props `App()` now has available from steps 1–3; the "switched to X" toast; the detail-screen redirect and POS `key={}` edge-case fixes from Q4.
5. **Global 403 handling** — `QueryCache`/`MutationCache` `onError` wiring in `main.jsx`, `handleBranchError`, `branchSwitcherForceOpen` consumed by the switcher component to force itself open. Logically layers on top of step 4 (needs the switcher to exist so "reopen" has a target) but can be developed in parallel once step 2's `err.code` plumbing lands.
6. **RO/EN relocation to Settings → Afișaj** — purely cosmetic, no branch-logic risk, no dependency on 1–5; sequence last so it doesn't block or get entangled with the functional work.

## Anti-Patterns to Avoid

### Anti-Pattern 1: Manual cache invalidation inside the switch handler

**What people do:** After `switchMyBranch` succeeds, call `queryClient.invalidateQueries({queryKey:['orders']})`, `invalidateQueries({queryKey:['menu']})`, etc. by hand, plus manually abort/reopen the SSE connection.
**Why it's wrong:** Duplicates work the branch-prefixed key change already does automatically on the next render, and can race with it (invalidating the *old* key while components are already re-rendering against the *new* key achieves nothing; invalidating the *new* key before it's ever been fetched is a no-op). It also reintroduces a manual SSE lifecycle the `branchId`-in-deps approach was specifically designed to avoid.
**Instead:** Write `currentBranch` to Zustand and let key-driven refetch + effect-dependency-driven reconnect do the rest.

### Anti-Pattern 2: Persisting `currentBranch` across restarts

**What people do:** Add `currentBranch` to `store.js`'s `partialize` list so the app "remembers" the last branch across a cold start, by analogy with `screen`/`role`/`lang`.
**Why it's wrong:** The server re-validates `selected_branch_id` on every request (§5.2) and access can be revoked while the app is closed. A persisted stale branch would show the wrong label/data for the first render or two before the first request 403s and self-corrects — a confusing flash for staff, and precisely the "silently show the wrong branch's data" failure mode the PRD opens §5 by warning against.
**Instead:** Always re-fetch via `client.auth.getMe()` on cold start (same tier as `authUser`, `isAuthenticated` — session-only).

### Anti-Pattern 3: One-off `try/catch` 403 handling per screen

**What people do:** Since the SDK has no interceptor, handle `BRANCH_INACTIVE`/`BRANCH_ACCESS_REVOKED` locally in whichever screen's mutation/query happened to surface it (e.g. only in `use-order-actions.js`'s `onError`, missed everywhere else).
**Why it's wrong:** The whole point of these three error codes (per PRD §5.2, §16) is that they can arrive from *any* branch-scoped request, at any time, because access can be revoked mid-session — not just from the switch call. Scattering handling per-hook guarantees some code path is missed.
**Instead:** One `QueryCache`/`MutationCache`-level `onError`, fed by a consistent `err.code` attached in a single shared unwrap helper.

## Sources

- `/Users/eduardalbu/Developer/sitecare-pos/src/app.jsx`, `store.js`, `auth.jsx`, `shell.jsx`, `use-sse.js`, `data.jsx`, `use-orders.js`, `use-order-detail.js`, `use-menu.js`, `use-history-orders.js`, `use-stats.js`, `use-restaurant-settings.js`, `use-delivery-areas.js`, `use-order-actions.js`, `main.jsx`, `screen-pos.jsx` (read directly for this research)
- `/Users/eduardalbu/Developer/sitecare-pos/node_modules/@charlyk/admin-client/dist/index.d.ts` (v1.1.67) — confirmed `AccessibleBranch`, `SelectedBranch`, `CurrentUser.selectedBranch`, `client.auth.getMe()`, `client.me.branches.{list,switch}`, `SwitchBranchResponse` shapes directly from the installed type definitions (HIGH confidence — primary source, not documentation paraphrase)
- `~/Developer/sitecare-orders-api/docs/RESTAURANT_DASHBOARD_PRD.md` §5 (branch-selection model), §6.2 (SDK gaps/wrapper), §7 (branch switcher UX requirements), §11 (realtime per branch, SSE stream closure on switch), §15 (data dictionary), §16 (error-handling reference) — owner-dashboard doc, but the branch-selection/SSE rules are stated to be identical for staff apps (§11.1, ACCS-04)
- `/Users/eduardalbu/Developer/sitecare-pos/.planning/PROJECT.md` — v1.2 milestone scope and API v2.6 context section
- `/Users/eduardalbu/Developer/sitecare-pos/CLAUDE.md` — existing architecture decisions (state split, SSE mounting, screens-own-their-hooks convention)

---
*Architecture research for: SiteCare POS v1.2 Branch Switching*
*Researched: 2026-07-21*
