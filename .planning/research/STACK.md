# Stack Research — v1.2 Branch Switching

**Domain:** Branch switching for an existing Tauri v2 POS app
**Researched:** 2026-07-21
**Confidence:** HIGH — verified directly against `node_modules/@charlyk/admin-client/dist/index.d.ts` (installed v1.1.67) and the app's existing source (`src/data.jsx`, `src/use-orders.js`, `src/use-sse.js`, `src/use-order-actions.js`, `src/auth.jsx`, `src/main.jsx`). No web research was needed for the SDK surface (verified from disk); one TanStack Query v5 doc check confirmed `resetQueries`/`invalidateQueries`/`removeQueries` semantics.

## Existing Stack (do not re-add)

Tauri 2.x · React 18 · Vite 6 · Zustand 5 · TanStack Query 5.99.2 · @charlyk/admin-client 1.1.67 · @microsoft/fetch-event-source 2.0.1

## New Stack Additions Needed

**None.** This is a zero-new-dependency milestone. Every piece needed for branch switching already ships in `package.json`: `@charlyk/admin-client` (SDK calls), `@tanstack/react-query` (cache re-scoping), `zustand` (UI state — switcher open/closed, selected-branch display), `@microsoft/fetch-event-source` (SSE reconnect). This document is about which existing API surface to use and how, not what to install.

## SDK Surface — Verified Exact Signatures

Confirmed against `node_modules/@charlyk/admin-client/dist/index.d.ts` (v1.1.67, lines 5218–5222):

```ts
me: {
  branches: {
    list: () => ReturnType<typeof getMyBranches<false>>;
    switch: (data?: ApiInput<SwitchMyBranchData>) => ReturnType<typeof switchMyBranch<false>>;
  };
};
```

**Correction to the milestone brief's shorthand:** the call is `client.me.branches.list()`, not `client.me.branches()` — `branches` is a namespace object with `.list` and `.switch` methods, matching the shape of every other resource on the client (e.g. `client.kitchen.orders.list(...)`).

```js
// List — GET /v1/me/branches
const result = await client.me.branches.list();
if (result.error) throw new Error(result.error.error ?? 'Failed to list branches');
const branches = result.data; // AccessibleBranch[]: { id, name, slug, isDefault, isActive }

// Switch — POST /v1/me/branches/switch
const result = await client.me.branches.switch({ body: { branchId } });
if (result.error) {
  // result.error.error is a string; on 403 it carries the domain code —
  // 'BRANCH_ACCESS_REVOKED' or 'BRANCH_INACTIVE'. On 400 it's a generic validation string.
} else {
  result.data; // SwitchBranchResponse: { ok: true, branchId: string }
}
```

Both follow the SDK's `responseStyle: 'fields'` contract already used everywhere in this codebase (`{ data, error }`, never a thrown exception for expected 4xx) — `use-orders.js` and `use-order-actions.js` establish this pattern (`if (result.error) throw new Error(...)` inside `queryFn`/`mutationFn`); the new branch hooks must follow it identically.

`ApiInput<T> = Omit<T, 'url'>` (line 5005) confirms `switch`'s argument is `{ body: { branchId: string } }` — no `path`/`query`. `Error = { error: string }` (line 1239) is the same error shape already unwrapped elsewhere via `result.error.error`.

Session shape already carries the active branch: `CurrentUser.selectedBranch: SelectedBranch | null` (lines 677–691) — this is what to read on cold start/login before the first `me.branches.list()` call resolves, matching the verified fact that the active branch is server-side session state (`user.selected_branch_id`), with no header or query param on any other call.

**No SDK version bump needed.** v1.1.67 already declares the full branch surface: `AccessibleBranch`, `SelectedBranch`, `SwitchBranchResponse`, `getMyBranches`, `switchMyBranch`, and the `me.branches.{list,switch}` client methods are all present in the installed `dist/index.d.ts`.

## TanStack Query v5 Mechanism for Re-Scoping Caches on Switch

**Recommendation: `queryClient.resetQueries()` called with no filter (reset everything) inside the switch mutation's `onSuccess`.**

### Why not the alternatives

| API | What it does | Why it's wrong here |
|-----|---------------|----------------------|
| `invalidateQueries({ queryKey: [...] })` per-key | Marks matching queries stale; active ones refetch, but **existing cached data stays rendered until the refetch resolves** | Real bug risk: for the ~1–2s between switch and refetch completing, every mounted screen (Orders, Kitchen, History, Menu, Stats) would keep rendering branch-A data under a branch-B header — wrong for a POS screen where staff act on what they see (accept/cancel/print) |
| `removeQueries({ queryKey: [...] })` per-key | Deletes cache entries; inactive queries vanish, but active (mounted) ones **do not automatically refetch** — left with `data: undefined` until something else triggers a fetch | Blank/loading screens instead of live data, with no better isolation than `resetQueries` |
| `queryClient.clear()` | Wipes the **entire** cache *and* the mutation cache — a hard reset, same shape as first app mount | Overkill; also drops in-flight mutation history. `resetQueries()` is the documented, scoped tool for "these queries are still valid, but their data must be treated as freshly mounted" |
| Restructure every `queryKey` to `['orders', branchId, status]` and invalidate by branchId prefix | Requires threading `branchId` through 7 hooks (`use-orders.js`, `use-order-detail.js`, `use-menu.js`, `use-stats.js`, `use-history-orders.js`, `use-restaurant-settings.js`, `use-delivery-areas.js`) and every `invalidateQueries` call site (`use-order-actions.js`, `use-sse.js`, `screen-menu.jsx`, `screen-orders.jsx`, `screen-pos.jsx`) | Unnecessary: the API scopes **every** call server-side off session state — no header, no param — so there's no client-visible axis to key on other than "before switch" vs "after switch." A global reset achieves perfect isolation without touching seven existing hooks |

### Why `resetQueries()` and not `invalidateQueries()`

Per the TanStack Query v5 `QueryClient` reference and `Query Invalidation` guide (verified 2026-07-21): `resetQueries()` resets matching queries to their **pre-loaded/initial state** — `data` becomes `undefined` immediately, synchronously, for every subscriber — then refetches any query with a mounted observer. `invalidateQueries()` only marks queries stale and refetches; it does **not** clear currently-rendered `data` first, so stale-branch data stays on screen during the refetch window. Old data here is not "stale but roughly correct" (TanStack's default invalidation assumption) — it's **wrong data belonging to a different branch** — so it must be cleared synchronously, not shown-then-swapped. `resetQueries()` is the only one of the three primitives that guarantees this.

### Implementation shape

```js
// use-branch.js (new file) — mutation for the switch action
const switchBranch = useMutation({
  mutationFn: (branchId) => client.me.branches.switch({ body: { branchId } }),
  onSuccess: (result) => {
    if (result.error) {
      // 403 BRANCH_ACCESS_REVOKED / BRANCH_INACTIVE — surfaced via toast, switcher stays open,
      // branch list refetched — handled in-band since the SDK returns { error }, not a thrown
      // exception, for expected 4xx ('fields' responseStyle).
      return;
    }
    queryClient.resetQueries(); // no filter — every branch-scoped cache re-fetches from zero
    // then: bump SSE reconnect trigger, push the "switched to X" toast
  },
});
```

`resetQueries()` with no argument is intentional and safe here: as established above, there is no non-branch-scoped query in this app to protect from the reset, and a fresh refetch of `['orders']`, `['menu']`, `['stats']`, etc. immediately after a manual, infrequent, staff-initiated branch switch has negligible cost.

### 403 handling on any *later* request (not just the switch call itself)

`BRANCH_ACCESS_REVOKED` / `BRANCH_INACTIVE` can also surface on a normal `orders.list()` or `kitchen.orders.updateStatus()` call if access is revoked mid-session. Existing hooks already unwrap `result.error.error` as a string (`use-orders.js` line 18, `use-order-actions.js`) — the only change needed is a shared check for these two specific strings that, on match, triggers the store's toast + reopen-switcher + `queryClient.invalidateQueries({ queryKey: ['me-branches'] })` (refetch branch list) instead of the current generic error path. This is app logic, not a stack addition.

## SSE Reconnect on Switch — No New Dependency, One New Hook Trigger

The server **closes** the user's SSE stream on branch switch (verified fact). `use-sse.js`'s `useEffect` currently only re-runs when `token` changes (`}, [token, queryClient]);`); its `onerror`/`onclose` handlers already retry with backoff, so a server-initiated close isn't silently fatal — `fetchEventSource` reconnects on its own. But relying on the library's implicit retry means an indeterminate delay, and a reconnect that races the server's session cutover.

**Recommended (still zero new dependencies):** add a `branchEpoch` value (a counter, or the current `branchId`) to `useSSE`'s dependency array — e.g. `useSSE(token, branchEpoch, onLiveOrder)` — so the effect's cleanup (`ctrl.abort()`) and re-run are driven explicitly by the switch, not by the library's error-driven retry. Bump `branchEpoch` in the same `onSuccess` handler that calls `resetQueries()`. This is a one-line addition to an existing hook's signature and dependency array, not a new library or SSE mechanism.

## What NOT to Add

| Avoid | Why | Use Instead |
|-------|-----|--------------|
| A new HTTP client / raw `fetch` for branch endpoints | CLAUDE.md rule 1: `@charlyk/admin-client` is the only sanctioned data layer | `client.me.branches.list()` / `client.me.branches.switch()` — already in the installed SDK |
| Bumping `@charlyk/admin-client` past `^1.1.67` | v1.1.67 already ships the full branch surface | Stay pinned at `^1.1.67` |
| A per-branch React Query cache namespace (custom multi-tenant cache wrapper, or prefixing every `queryKey` with `branchId`) | The API has no client-visible branch axis — every session-authed call is already server-scoped; a global `resetQueries()` on switch gives perfect isolation for free | `queryClient.resetQueries()` in the switch mutation's `onSuccess` |
| A dedicated pub/sub or event-emitter library to signal "branch changed" across hooks/components | Zustand already exists for cross-component UI state; TanStack Query's cache is the natural signal for data-side consumers | A `selectedBranch` field in the existing Zustand store + `queryClient.resetQueries()` for data-side consumers |
| A second SSE client/library instance to "hard-reconnect" | `@microsoft/fetch-event-source` already handles connect/retry/backoff; `useSSE` only needs an extra dependency-array entry to force teardown+reconnect on switch | Add `branchId`/`branchEpoch` to `useSSE`'s effect dependencies |
| `queryClient.clear()` for the reset | Also wipes the mutation cache — broader than needed | `queryClient.resetQueries()` (no filter) |
| Restructuring every existing `queryKey` (`['orders']`, `['order', id]`, `['menu']`, `['stats']`, `['history-orders', from, to]`, `['delivery-areas']`, `['restaurant-settings']`) to embed `branchId` | Unnecessary churn across 7 hooks and 9 call sites for a server-side-scoped API with no client-visible branch parameter | Leave all existing query keys exactly as they are; rely on the global reset instead |

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| `@charlyk/admin-client@1.1.67` | `@tanstack/react-query@5.99.2` | No coupling — SDK is transport-agnostic; `resetQueries`/`invalidateQueries`/`removeQueries` behavior is unchanged across the v5 line, so no minimum-version bump is implied |
| `@charlyk/admin-client@1.1.67` | Existing `responseStyle: 'fields'` pattern | Confirmed: `getMyBranches`/`switchMyBranch` are both declared `RequestResult<..., ..., ThrowOnError, "fields">` (lines 4909–4910) — identical calling convention to every other SDK method already wrapped in this codebase |

## Sources

- `node_modules/@charlyk/admin-client/dist/index.d.ts` (installed v1.1.67, read directly) — `AccessibleBranch` (line 670), `SelectedBranch`/`CurrentUser.selectedBranch` (lines 677–691), `SwitchBranchResponse` (line 666), `GetMyBranchesData`/`Responses` (lines 1974–1993), `SwitchMyBranchData`/`Responses` (lines 1994–2023), `getMyBranches`/`switchMyBranch` signatures (lines 4909–4910), `me.branches.{list,switch}` client shape (lines 5218–5222), `ApiInput<T> = Omit<T, 'url'>` (line 5005), `Error = { error: string }` (line 1239). HIGH confidence — primary source read directly.
- `src/data.jsx`, `src/use-orders.js`, `src/use-sse.js`, `src/use-order-actions.js`, `src/auth.jsx`, `src/main.jsx`, `src/app.jsx` (this repo). HIGH confidence — existing validated app code establishing the `{ data, error }` unwrap pattern, current `queryKey` inventory, and the `useSSE` reconnect surface.
- [QueryClient | TanStack Query v5 Docs](https://tanstack.com/query/v5/docs/reference/QueryClient) — confirms `resetQueries`/`invalidateQueries`/`removeQueries` semantics (reset-to-initial-and-refetch-active vs. mark-stale-and-refetch-active vs. delete-without-refetch).
- [Query Invalidation | TanStack Query v5 React Docs](https://tanstack.com/query/v5/docs/framework/react/guides/query-invalidation) — confirms v5 partial `queryKey` matching semantics (ruled out for this use case; reasoning above).
- `~/Developer/sitecare-orders-api/packages/admin-client/src/index.ts` — not present on this machine; not needed since the compiled `.d.ts` in `node_modules` is the actual contract this app compiles against.

---
*Stack research for: branch switching (v1.2) in an existing Tauri v2 POS app*
*Researched: 2026-07-21*
