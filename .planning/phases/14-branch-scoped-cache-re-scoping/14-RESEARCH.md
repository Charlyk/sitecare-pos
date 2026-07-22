# Phase 14: Branch-Scoped Cache Re-Scoping - Research

**Researched:** 2026-07-22
**Domain:** TanStack Query v5 cache-key parameterization in an existing Tauri/React POS app; SDK error-envelope shape verification
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Re-scoping mechanism (the ROADMAP-flagged decision point)**
- **D-01:** Use **branchId-keyed query keys** across all 7 hooks — `['orders', branchId, status?]`, `['order', branchId, id]`, `['stats', branchId]`, `['menu', branchId]`, `['history-orders', branchId, from, to]`, `['restaurant-settings', branchId]`, `['delivery-areas', branchId]`. **NOT** `queryClient.resetQueries()` on switch. Old-branch entries orphan harmlessly (never re-queried); new-branch entries fetch fresh on first render after a switch. Chosen for race-safety by construction (immune to Pitfall 4) and future-proofing (a later hook that forgets to reset cannot leak). Apply the ONE mechanism **uniformly** — do not mix in any ad-hoc `resetQueries`. — **Reversibility:** costly — reverting to `resetQueries()` would touch all 7 hook keys plus every invalidation call site and shift the re-scope logic into Phase 16.
- **D-02:** Because re-scoping is key-driven, **this phase does not touch the switch flow**. When Phase 16 sets `currentBranch`, every key changes and caches re-scope automatically — no reset call, no cross-phase coupling beyond the shared key convention.

**Mutation invalidation scope (SC2)**
- **D-03:** Mutations invalidate with **exact branch-scoped keys** — `invalidateQueries({ queryKey: ['orders', branchId] })`, `['order', branchId]`, `['stats', branchId]`, and `['menu', branchId]` for the menu toggle. This literally satisfies SC2 ("invalidate only the active branch's cache entries, never a different branch's") and is testable — a sibling branch's cached entry must stay untouched. The mutation hooks/screens therefore read `currentBranch?.id`, same as the query hooks. **Not** the broad prefix `['orders']`, which partial-matches every branch's entries and fails SC2 as written.
- **D-04:** All invalidation call sites move in **lockstep** with the key change: `use-order-actions.js` (updateStatus + updateEstimatedTime → `['orders'|'order'|'stats', branchId]`), `screen-pos.jsx:172` (POS submit → `['orders', branchId]`), `screen-menu.jsx:40` (toggle stock → `['menu', branchId]`), and the manual refresh button in `screen-orders.jsx:281` (`['orders', branchId]` + `['stats', branchId]`). Missing one reproduces the exact stale-branch bug this phase exists to prevent.

**Error-code plumbing (SC3)**
- **D-05:** Build a shared **`unwrapSdkResult(result, fallbackMessage)`** helper: on `result.error`, throw an `Error` whose message is `result.error.error ?? fallback` and whose `.code` is copied from `result.error.code`; otherwise return `result.data`. Route the error branch of all 7 fetch hooks through it. This gives Phase 17's `QueryCache`/`MutationCache` `onError` a single trustworthy `err.code` choke point. Since all 7 hooks are already being edited for keys, threading the error line through the helper is clean and drift-proof. **⚠ Research correction (see Common Pitfalls #1 below): the installed SDK's `.d.ts` shows no `.code` field exists on `result.error` for any of these 7 hooks — the mechanism (build a shared helper, attach `err.code`) stands, but the exact field read must be `result.error.error` (or the bare string), not `result.error.code`.**
- **D-06:** This phase **produces** the code only. It does **not** build the `onError` handler, does not act on `BRANCH_INACTIVE`/`BRANCH_ACCESS_REVOKED`/`NO_BRANCH_ACCESS`, and does not add any toast or recovery — all Phase 17. SC3's bar is met when a fetch failure carries a matchable `err.code`, verifiable by asserting `error.code` is populated on a simulated branch-error response.

**Null / unresolved branchId**
- **D-07:** The `branchId` key slot is **always present**, holding `currentBranch?.id ?? null` — e.g. `['orders', currentBranch?.id ?? null, ...(status ? [status] : [])]`. A single, fixed key shape (never the variable-length `branchId ? ['orders', branchId] : ['orders']` fallback), so scoped and unscoped shapes never coexist and exact invalidations always match. When a branch later resolves, the key changes exactly once and re-scopes cleanly.
- **D-08:** The query gate stays **`enabled: !!client` only** — **never** `!!branchId` (Pitfall 11 / SC4). Single-branch tenants (whose `selectedBranch` may legitimately be `null`) and the non-401 cold-start-failure state (authed, `currentBranch` still null) must fetch immediately with the null-slot key; the server resolves data from the session's own `selected_branch_id`. Branch resolution never blocks or delays the initial fetch.

### Claude's Discretion

- Where `unwrapSdkResult()` lives — colocate in `src/data.jsx` (alongside `normalizeOrder`) or a small new `src/sdk.js`. Planner's call.
- Whether the `history-orders` key places `branchId` before the `from`/`to` segments (recommended: `['history-orders', branchId, from, to]`) — as long as `branchId` is the first variable segment for consistency with the others.
- Whether mutation hooks reuse `unwrapSdkResult()` for their own error branches, or keep their existing throw — SC3 only strictly requires the 7 *fetch* hooks; extending it to mutations is a nice-to-have, not required.
- Exact test scaffolding for SC1/SC2/SC3 verification (mock branch ids, sibling-cache assertion).

### Deferred Ideas (OUT OF SCOPE)

- **Switch mutation / non-optimistic switch flow + Pitfall-4 race sequencing** — Phase 16 (SWCH-03, SCOPE-04). This phase makes keys react; Phase 16 owns the invalidate-only-after-switch-resolves ordering.
- **SSE branch-prefixed cache writes + branch-aware reconnect** — Phase 15 (SCOPE-02). `useSSE`'s cache writes must eventually adopt this phase's key convention.
- **Centralized `onError` handler** consuming `err.code` (toast + reopen switcher + refetch; full-screen block for `NO_BRANCH_ACCESS`) — Phase 17 (BERR-01).
- **POS cart reset / detail-screen exit on switch** (`key={currentBranch?.id}` on the POS route) — Phase 16 (SCOPE-03).

None of these were scope creep — all are already-roadmapped later phases surfaced by the discussion.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-------------------|
| SCOPE-01 | On switch, all branch-scoped server data (orders, order detail, stats, menu, order history, restaurant settings, delivery areas) re-scopes to the newly selected branch — no stale prior-branch data is served for the cache's `staleTime` window. | Pattern 1 (branchId as fixed key segment) covers the 7-hook retrofit; Pattern 3 (exact-key invalidation) covers the 6 lockstep invalidation sites (SC2 sub-requirement); Common Pitfalls #1/#2 cover the `unwrapSdkResult()`/`err.code` correction (SC3 sub-requirement); Validation Architecture maps SC1-SC4 to concrete test files/commands, including the Wave 0 gaps (4 missing hook test files) that must be created before SC1/SC2 can be asserted. |
</phase_requirements>

## Summary

This phase is a **mechanical, codebase-internal retrofit**, not a new-technology integration: fold `currentBranch?.id` (shipped by Phase 13 in `store.js:68`) into the query key of 7 already-existing TanStack Query hooks, move 6 `invalidateQueries` call sites onto the same branch-scoped keys, and route all 7 hooks' error paths through one new `unwrapSdkResult()` helper that attaches `err.code`. The mechanism (branchId-keyed query keys, not `resetQueries()`) is locked by CONTEXT.md D-01 and is not re-litigated here. Zero new npm dependencies — `@charlyk/admin-client@1.1.67` and `@tanstack/react-query@5.99.2` are both already installed and pinned `[VERIFIED: package.json]`.

The one substantive **build-time correction** this research surfaces: CONTEXT.md D-05 describes copying `err.code` from `result.error.code`, but the installed SDK's `.d.ts` shows every one of the 7 hooks' declared error types resolve to the generic `Error = { error: string }` shape — **a flat string field, with no `.code` property at all** `[VERIFIED: node_modules/@charlyk/admin-client/dist/index.d.ts]`. `unwrapSdkResult()` must set `err.code` from `result.error.error` (or the bare string itself, mirroring `use-history-orders.js`'s existing defensive unwrap), not from a nonexistent `.code` field. This is a one-line correction to D-05's mechanism, not a reversal of the decision itself — flagged prominently below and in the Assumptions Log.

**Primary recommendation:** Implement `unwrapSdkResult(result, fallbackMessage)` exactly as D-05 describes, except set `err.code = (typeof result.error === 'string' ? result.error : result.error?.error) ?? fallbackMessage` — the same string doubles as both the human-readable message and the matchable code, since the SDK's generic `Error` type carries only one string field for all 7 hooks' declared 400/401/403/404 responses.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Branch-scoped query-key construction | Frontend Server (SSR) — N/A here, treat as Browser/Client (React) | — | Pure client-side TanStack Query cache-key logic; no server involvement — the server never receives a `branchId` param (D-08/Pitfall 11) |
| `currentBranch?.id` read | Browser / Client (Zustand store) | — | Already shipped by Phase 13 (`store.js:68`); this phase only *consumes* it, read-only |
| SDK error-envelope unwrap (`unwrapSdkResult`) | Browser / Client | — | Runs entirely inside the React app's hook layer; the SDK itself is a thin HTTP client with no interceptor stage |
| Mutation invalidation scoping | Browser / Client | — | `queryClient.invalidateQueries()` is a client-side cache operation; the server has no awareness of which cache keys the client maintains |
| Branch access re-validation (403 issuance) | API / Backend | — | Out of scope for this phase — the server (not modified here) is what actually returns `BRANCH_INACTIVE`/etc.; this phase only threads the code through to `err.code` |

**Why this matters:** every capability in this phase lives entirely in the Browser/Client tier (React + Zustand + TanStack Query) — there is no API/Backend work, no CDN/static concern, and no Database/Storage concern. This map exists mainly to confirm a negative: nothing in this phase should touch `src-tauri/` (Rust) or any server-side code.

## Package Legitimacy Audit

**No new packages are introduced by this phase.** `@charlyk/admin-client@1.1.67` and `@tanstack/react-query@5.99.2` are both already installed, pinned in `package.json`, and used throughout the existing codebase `[VERIFIED: package.json lines 14, 16]`. No `npm install` step is required; this audit section is included per protocol but has nothing to gate.

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|--------------|---------|-------------|
| — | — | — | — | — | — | N/A — no new packages |

**Packages removed due to [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

## Architecture Patterns

### System Architecture Diagram

```
Zustand store.js (Phase 13, unchanged this phase)
  currentBranch: SelectedBranch | null  ──────────────┐
                                                        │ read via useAppStore(s => s.currentBranch?.id)
                                                        ▼
┌──────────────────────────────────────────────────────────────────────────┐
│ 7 fetch hooks (MODIFIED this phase)                                      │
│  useOrders(status)         → queryKey: ['orders', branchId, status?]     │
│  useOrderDetail(id)        → queryKey: ['order', branchId, id]           │
│  useStats()                → queryKey: ['stats', branchId]               │
│  useMenu()                 → queryKey: ['menu', branchId]                 │
│  useHistoryOrders({from,to})→ queryKey: ['history-orders', branchId, from, to] │
│  useRestaurantSettings()   → queryKey: ['restaurant-settings', branchId]  │
│  useDeliveryAreas()        → queryKey: ['delivery-areas', branchId]       │
│                                                                            │
│  each queryFn's error path:                                              │
│    result = await client.<resource>.<method>(...)                       │
│    return unwrapSdkResult(result, 'Failed to ...')  ◄── NEW shared helper │
│         │                                                                 │
│         ├─ result.error falsy  → return result.data                     │
│         └─ result.error truthy → throw Error(msg) with err.code attached │
│                                                                            │
│  enabled: !!client  (UNCHANGED — never !!branchId, D-08/Pitfall 11)      │
└──────────────────────────────────────────────────────────────────────────┘
                          │ TanStack Query: new key ⇒ cache miss ⇒ auto-refetch
                          ▼
              Screens render fresh, branch-current data
                          │
┌──────────────────────────────────────────────────────────────────────────┐
│ Mutation call sites (MODIFIED this phase) — read the SAME branchId       │
│  use-order-actions.js: updateStatus/updateEstimatedTime onSuccess        │
│    → invalidateQueries({queryKey:['orders', branchId]})                  │
│    → invalidateQueries({queryKey:['order', branchId]})                   │
│    → invalidateQueries({queryKey:['stats', branchId]})                   │
│  screen-pos.jsx:172 (createOrder onSuccess)                              │
│    → invalidateQueries({queryKey:['orders', branchId]})                  │
│  screen-menu.jsx:40 (toggleStock onSuccess)                              │
│    → invalidateQueries({queryKey:['menu', branchId]})                    │
│  screen-orders.jsx:281 (manual refresh button onClick)                   │
│    → invalidateQueries({queryKey:['orders', branchId]})                  │
│    → invalidateQueries({queryKey:['stats', branchId]})                   │
└──────────────────────────────────────────────────────────────────────────┘
                          │ exact-key partial match: invalidates ONLY this
                          │ branch's cache entries (sibling branch untouched)
                          ▼
              SC2 satisfied by construction (D-03)

NOT in this phase (downstream, unchanged references only):
  use-sse.js writes into ['orders'] / ['stats'] (branch-agnostic today) —
  Phase 15 must branch-prefix these to match this phase's key convention.
  Until Phase 15 lands, an SSE-driven setQueryData/invalidateQueries call
  writes to the OLD unscoped key, which no hook reads anymore post-Phase-14 —
  see "Cross-Phase Coupling" pitfall below.
```

### Recommended Project Structure

No new files/folders — all changes are in-place edits to existing files:
```
src/
├── use-orders.js              # MODIFIED — key + error unwrap
├── use-order-detail.js        # MODIFIED — key + error unwrap
├── use-stats.js                # MODIFIED — key + error unwrap
├── use-menu.js                 # MODIFIED — key + error unwrap
├── use-history-orders.js       # MODIFIED — key (error unwrap already custom, see below)
├── use-restaurant-settings.js  # MODIFIED — key + error unwrap
├── use-delivery-areas.js       # MODIFIED — key + error unwrap
├── use-order-actions.js        # MODIFIED — 3 invalidateQueries calls
├── screen-pos.jsx               # MODIFIED — line 172 invalidateQueries call
├── screen-menu.jsx              # MODIFIED — line 40 invalidateQueries call
├── screen-orders.jsx            # MODIFIED — line 281 invalidateQueries calls (×2)
└── data.jsx                     # MODIFIED (Claude's discretion: or new sdk.js) — unwrapSdkResult()
```

### Pattern 1: branchId as the fixed second key segment

**What:** Every branch-scoped `queryKey` array's second element is always `currentBranch?.id ?? null` — never omitted, never variable-length.
**When to use:** All 7 fetch hooks, uniformly (D-01, D-07).
**Example (verified against actual current source, `src/use-orders.js`):**
```javascript
// BEFORE (current, verified 2026-07-22):
queryKey: status ? ['orders', status] : ['orders'],

// AFTER (this phase, per D-01/D-07):
const branchId = useAppStore((s) => s.currentBranch?.id) ?? null;
queryKey: status ? ['orders', branchId, status] : ['orders', branchId],
```
Note the exact current shape being replaced: `use-orders.js` line 13 is `status ? ['orders', status] : ['orders']` — a **variable-length** key today. D-07 requires the new key to *always* carry the `branchId` slot (never a two-vs-three-element fork based on `branchId` presence), so the fork that remains is only on `status`, matching the existing pattern one level deeper.

### Pattern 2: unwrapSdkResult() — shared error-unwrap helper

**What:** A single function every fetch hook's `queryFn` routes its `{data,error}` result through, replacing each hook's hand-rolled `if (result.error) throw new Error(result.error.error ?? '...')`.
**When to use:** All 7 fetch hooks' error branches (D-05). Mutation hooks (`use-order-actions.js`, `screen-pos.jsx`, `screen-menu.jsx`) may optionally reuse it (Claude's Discretion, CONTEXT.md) — not required for SC3.
**Example (verified against SDK types, see Common Pitfalls below for the field-name correction):**
```javascript
// src/data.jsx (recommended colocation, alongside normalizeOrder) or new src/sdk.js
export function unwrapSdkResult(result, fallbackMessage) {
  if (result.error) {
    const raw = result.error;
    // The SDK's generic `Error` type (node_modules/@charlyk/admin-client/dist/index.d.ts:1239-1241)
    // is `{ error: string }` — a single string field, not `{ error: { code, message } }`.
    // `use-history-orders.js` (already shipped) defends against BOTH a bare string and this
    // object shape at runtime; unwrapSdkResult mirrors that same defensive read.
    const message = (typeof raw === 'string' ? raw : raw?.error) ?? fallbackMessage;
    const err = new Error(message);
    err.code = message; // same string serves as the matchable code (Phase 17 consumes this)
    throw err;
  }
  return result.data;
}

// Usage in use-orders.js:
const result = await client.kitchen.orders.list({ query: status ? { status } : {} });
const { orders, ...rest } = unwrapSdkResult(result, 'Failed to list orders');
return { ...rest, orders: orders.map(normalizeOrder) };
```

### Pattern 3: exact-key invalidation, not prefix invalidation

**What:** `invalidateQueries({ queryKey: ['orders', branchId] })` — TanStack Query v5's default `invalidateQueries` matching is **prefix-based** (fuzzy): a key of `['orders', branchId]` matches every cached entry whose key *starts with* `['orders', branchId, ...]`, e.g. both `['orders', branchId]` and `['orders', branchId, 'NEW']` — but it does **not** match `['orders', otherBranchId]` or `['orders', otherBranchId, 'NEW']`, because the second element differs `[CITED: TanStack Query v5 docs, already verified in prior research SUMMARY.md/ARCHITECTURE.md — Query Invalidation guide]`. This is exactly the mechanism D-03/SC2 relies on: invalidating `['orders', branchId]` reaches every status-filtered variant for the *current* branch while leaving every other branch's cached entries completely untouched.
**When to use:** All 6 lockstep invalidation call sites (D-04).
**Example:**
```javascript
// src/use-order-actions.js — onSuccess for both updateStatus and updateEstimatedTime
onSuccess: () => {
  const branchId = useAppStore.getState().currentBranch?.id ?? null;
  queryClient.invalidateQueries({ queryKey: ['orders', branchId] });
  queryClient.invalidateQueries({ queryKey: ['order', branchId] });
  queryClient.invalidateQueries({ queryKey: ['stats', branchId] });
},
```
Note: `use-order-actions.js` is a plain function (not a React component), so it cannot call the `useAppStore` selector hook inside `onSuccess` (a callback, not render body). Use `useAppStore.getState().currentBranch?.id` (the non-hook, imperative accessor) exactly as `auth.jsx`'s own focus-listener already does (`auth.jsx:173`, verified in Phase 13 source) — this is an established in-repo precedent, not a new pattern.

### Anti-Patterns to Avoid

- **Mixing `resetQueries()` into any single hook "just this once":** D-01 requires the ONE mechanism uniformly. A single hook using `resetQueries()` while the other 6 use branchId-keying reintroduces exactly the "forgot one" failure class the uniform approach exists to prevent (Pitfall 3 technical-debt table).
- **Variable-length branch slot:** `branchId ? ['orders', branchId] : ['orders']` — this creates two incompatible key shapes that can silently coexist in cache, breaking D-03's exact-invalidation guarantee (D-07 explicitly forbids this).
- **Gating `enabled` on `!!branchId`:** `enabled: !!client && !!branchId` regresses single-branch-tenant first paint (Pitfall 11, D-08 — locked, do not touch).
- **Reading `useAppStore` selector hook inside a non-component callback** (e.g., inside `use-order-actions.js`'s `onSuccess`): use `useAppStore.getState().currentBranch?.id` instead — the selector-hook form (`useAppStore((s) => s.currentBranch)`) only works inside a component/hook render body, and `onSuccess` runs outside render.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Cache re-scoping on branch switch | A manual `switchBranchAndClearEverything()` orchestrator that walks every query key | Branch-prefixed query keys (D-01) + TanStack Query's own cache-miss-on-new-key behavior | TanStack Query already does this automatically once the key changes on re-render — a hand-rolled orchestrator duplicates built-in behavior and is exactly the "forgot one hook" risk this phase avoids (SUMMARY.md Anti-Pattern 1) |
| Matching only the current branch's cache entries on invalidate | A custom `queryClient.getQueryCache().findAll(...)` + manual filter-and-remove loop | `invalidateQueries({queryKey: [...branchId]})`'s built-in prefix-match semantics | v5's default matching already does exactly this; a hand-rolled filter reimplements existing, tested library behavior |
| SDK error-code extraction | 7 separate hand-rolled `if (result.error) {...}` blocks (the current state) | One shared `unwrapSdkResult()` | Mechanical duplication across 7 files is itself the bug class Phase 17's centralized `onError` depends on being eliminated (Pitfall 6 in prior research: "scattering handling per-hook guarantees some code path is missed") |

**Key insight:** every piece of this phase's "hard part" is already solved by TanStack Query v5's built-in key-based caching and prefix-matching invalidation — the actual engineering work is disciplined, uniform application across 7 near-identical files, not new logic.

## Common Pitfalls

### Pitfall 1: D-05's `result.error.code` field does not exist in the installed SDK's types

**What goes wrong:** If `unwrapSdkResult()` is implemented literally as CONTEXT.md D-05 describes (`err.code` copied from `result.error.code`), `err.code` will always be `undefined` at runtime for all 7 fetch hooks, because the installed SDK's `.d.ts` types every one of these calls' error responses as the generic `Error = { error: string }` type — confirmed directly:
- `ListOrdersErrors` (used by `useOrders`, `kitchen.orders.list`): `400: Error, 401: Error`
- `GetOrderErrors` (`useOrderDetail`, `kitchen.orders.get`): `401: Error, 404: Error`
- `GetAdminDashboardTodayErrors` (`useStats`, `admin.dashboard.getToday`): `401: Error`
- `ListKitchenMenuErrors` (`useMenu`, `kitchen.menu.list`): `401: Error`
- `ListAdminOrdersErrors` (`useHistoryOrders`, `admin.orders.list`): `400: Error, 401: Error`
- `ListSettingsErrors` (`useRestaurantSettings`, `admin.settings.list`): `401: Error`
- `ListKitchenDeliveryAreasErrors` (`useDeliveryAreas`, `kitchen.deliveryAreas.list`): `401: Error`
- `SwitchMyBranchErrors` (Phase 16's switch call, for cross-reference): `400: Error, 401: Error, 403: Error`

All resolve to `type Error = { error: string }` (`node_modules/@charlyk/admin-client/dist/index.d.ts:1239-1241`) — a single string field, **no `.code` property**. This is distinct from `ValidationError`/`ZoneError`/`FiscalError` (used by other, unrelated endpoints — product/zone/fiscal mutations), which do carry `{ error: { code, message, details? } }` — those richer shapes are **not** used by any of this phase's 7 hooks.

**Why it happens:** D-05 was written from architectural reasoning (a plausible SDK shape), not from re-reading the actual generated types for these 7 specific endpoints — an easy mistake given the SDK does have a richer `{code,message}` shape elsewhere in the same file.

**How to avoid:** Set `err.code` from `result.error.error` (the string), or from `result.error` itself when it's a bare string — mirroring the exact defensive pattern `use-history-orders.js` already ships (`(typeof result.error === 'string' ? result.error : result.error?.error) ?? ...`). The code and the human-readable message are the same string for these 7 hooks; there is no separate structured code field to extract.

**Warning signs:** `err.code` is `undefined` in a debugger/test even though `err.message` is populated; Phase 17's `onError` string-matching against `BRANCH_INACTIVE` never fires because it's comparing against `undefined`.

### Pitfall 2: None of the 7 hooks' declared error types include a 403 at all (except the switch call)

**What goes wrong:** `ListOrdersErrors`, `GetOrderErrors` (401/404 only, no 403), `GetAdminDashboardTodayErrors`, `ListKitchenMenuErrors`, `ListAdminOrdersErrors`, `ListSettingsErrors`, and `ListKitchenDeliveryAreasErrors` **only statically declare 400/401/404-family errors** — none of them declares a 403 branch-access error in their typed error union, even though the PRD (per prior Pitfalls research) states branch access is re-validated on *every* request and can 403 on any of them. This means the generated OpenAPI-derived types for these 6 read endpoints have not been updated for the v2.6 branch-access 403 codes — a gap between the documented API behavior and the SDK's static types.

**Why it happens:** The SDK's type generator reflects whatever the OpenAPI spec declared at generation time; if the spec's `403` response wasn't added to these specific endpoint definitions when branch access was introduced, the types won't show it even though the live server may return it.

**How to avoid:** Do not rely on TypeScript/JSDoc types to enumerate which status codes are possible at runtime for these hooks — `unwrapSdkResult()` must be written generically (any truthy `result.error`, regardless of the declared status-code union) exactly as D-05 and the existing 7 hooks already do (none of them switch on HTTP status today). This is a documentation-vs-runtime gap, not a functional blocker, since `unwrapSdkResult()`'s implementation doesn't inspect status codes at all — it only reads `result.error`.

**Warning signs:** A future contributor "fixes" `unwrapSdkResult()` to only special-case documented status codes, silently dropping a legitimate runtime 403.

### Pitfall 3: Cross-phase key mismatch — `useSSE` still writes to unscoped keys until Phase 15

**What goes wrong:** After this phase, `use-sse.js`'s `onmessage` handler still calls `queryClient.setQueryData(['orders'], ...)` / `invalidateQueries({queryKey:['stats']})` (unscoped, unmodified — confirmed at `use-sse.js:59,67,83,94,100-102`, verified 2026-07-22). Once the 7 fetch hooks are rekeyed to `['orders', branchId]` etc., **no hook subscribes to the old unscoped `['orders']` key anymore** — SSE's writes into it become orphaned no-ops, and SSE-driven live updates silently stop reaching the UI until Phase 15 branch-prefixes those writes.
**Why it happens:** This is an intentional, documented phase boundary (CONTEXT.md `<deferred>`/`<code_context>` "Integration Points" — Phase 15 owns this) — not a bug introduced by this phase, but a real regression window between Phase 14 landing and Phase 15 landing if they ship as separate deploys.
**How to avoid:** Do not attempt to fix `use-sse.js` in this phase (out of scope per CONTEXT.md D-01/deferred). Flag it explicitly in the phase's plan/summary as a known, accepted, temporary regression — the roadmap already sequences Phase 15 immediately after Phase 14 specifically to close this window quickly. If Phase 14 and Phase 15 ship as separate deployed releases (not just separate planning phases within one release), this should be called out to the human operator as a deploy-ordering constraint.
**Warning signs:** After Phase 14 ships (before Phase 15), live order updates via SSE stop appearing on the Orders/KDS screens even though a manual refresh (`screen-orders.jsx:281`) shows the correct data — because the manual refresh path uses the new branch-scoped key (freshly wired by this phase) while SSE still writes the old key.

### Pitfall 4: `use-order-actions.js` cannot use the `useAppStore` selector hook inside `onSuccess`

**What goes wrong:** `onSuccess` callbacks passed to `useMutation` execute outside a component's render phase — calling `useAppStore((s) => s.currentBranch)` (the hook form) there violates the Rules of Hooks and will not work as a plain function call inside a callback.
**Why it happens:** `use-order-actions.js` is a custom hook itself (`useOrderActions()`), and it's tempting to read the same-looking selector inside the returned mutation's `onSuccess`, not realizing `onSuccess` is a callback, not part of the hook's own render.
**How to avoid:** Read `currentBranch?.id` via `const branchId = useAppStore((s) => s.currentBranch?.id)` **once, at the top of `useOrderActions()`'s function body** (this IS valid — it's the hook's own render), then close over that `branchId` value inside `onSuccess`. This is simpler and more idiomatic than the imperative `useAppStore.getState()` form shown in Pattern 3 above — prefer the selector-hook-at-top-of-function-body approach for `use-order-actions.js` specifically, since it already is a hook body; reserve `.getState()` only for genuinely non-component contexts (e.g., `auth.jsx`'s window-focus listener, which is not a hook body at all).
**Warning signs:** `ReferenceError`/lint warning about calling hooks conditionally or outside a component; or (if using `.getState()` unnecessarily) a subtle staleness bug if `onSuccess` fires after a very fast subsequent branch switch and reads a slightly newer `currentBranch` than the one active when the mutation was fired — a low-probability race, not a correctness requirement for this phase (Phase 16 owns switch-timing races per D-01/D-02 of this phase's own CONTEXT.md).

### Pitfall 5: `use-history-orders.js`'s existing custom error-unwrap must not be blindly replaced

**What goes wrong:** `use-history-orders.js` (verified 2026-07-22, lines 46-63) has its own hand-built, richer error handling — a `.diagnostic` property (kind/status/statusText/errorName/ms) added for a specific, documented, in-progress production debugging session (`windows-history-network-error`, per the file's own top-of-file comment). A naive "route all 7 hooks through `unwrapSdkResult()` identically" pass could delete this diagnostic without realizing it's load-bearing for an active investigation.
**Why it happens:** The file's comment explicitly says "Remove this diagnostic... once the session resolves" — an easy signal to misread as "safe to remove now" when doing an unrelated refactor.
**How to avoid:** Either (a) leave `use-history-orders.js`'s error path as-is (only change its `queryKey`, not its error handling) and treat SC3 as satisfied by the other 6 hooks plus this one's pre-existing (richer) error surfacing, or (b) extend `unwrapSdkResult()` to optionally preserve/attach `.diagnostic` when the caller opts in. Do not delete the diagnostic without confirming the referenced debug session (`.planning/debug/windows-history-network-error`, if present) is actually closed. This is a **planner decision point** — flag it in the plan rather than silently overwriting.
**Warning signs:** `.planning/debug/` contains an open thread referencing this diagnostic; deleting it would remove production-debugging capability for a live, unresolved Windows network issue.

## Code Examples

### Full `useOrders` retrofit (all decisions applied)
```javascript
// src/use-orders.js — AFTER this phase
import { useQuery } from '@tanstack/react-query';
import { useAuth } from './auth.jsx';
import { useAppStore } from './store.js';
import { normalizeOrder, unwrapSdkResult } from './data.jsx';

export function useOrders(status) {
  const { client } = useAuth();
  const branchId = useAppStore((s) => s.currentBranch?.id) ?? null;

  return useQuery({
    queryKey: status ? ['orders', branchId, status] : ['orders', branchId],
    queryFn: async () => {
      const result = await client.kitchen.orders.list({
        query: status ? { status } : {},
      });
      const { orders, ...rest } = unwrapSdkResult(result, 'Failed to list orders');
      return { ...rest, orders: orders.map(normalizeOrder) };
    },
    enabled: !!client, // UNCHANGED — never !!branchId (D-08, Pitfall 11)
    staleTime: 30_000, // UNCHANGED
  });
}
```

### `use-order-actions.js` invalidation retrofit
```javascript
// src/use-order-actions.js — AFTER this phase
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './auth.jsx';
import { useAppStore } from './store.js';

export function useOrderActions() {
  const { client } = useAuth();
  const queryClient = useQueryClient();
  const branchId = useAppStore((s) => s.currentBranch?.id) ?? null; // read once, at hook-body top level

  const updateStatus = useMutation({
    mutationFn: ({ id, currentStatus, toStatus, estimatedMinutes, reason }) =>
      client.kitchen.orders.updateStatus({
        path: { id },
        body: { currentStatus, toStatus, ...(estimatedMinutes != null ? { estimatedMinutes } : {}), ...(reason != null ? { reason } : {}) },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders', branchId] });
      queryClient.invalidateQueries({ queryKey: ['order', branchId] });
      queryClient.invalidateQueries({ queryKey: ['stats', branchId] });
    },
  });
  // updateEstimatedTime: identical shape, same 3 invalidations
  // ...
}
```

### `useHistoryOrders` key retrofit (key only — error path preserved, see Pitfall 5)
```javascript
// src/use-history-orders.js — key change only
queryKey: ['history-orders', branchId, from, to], // was ['history-orders', from, to]
// Discretion note (CONTEXT.md): branchId placed BEFORE from/to, consistent with the other 6 hooks —
// the recommended (not mandatory) shape per CONTEXT.md's Claude's Discretion section.
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Branch-agnostic query keys (`['orders']`, `['stats']`, etc.) | Branch-prefixed keys (`['orders', branchId]`, etc.) | This phase (v1.2 Phase 14) | Enables safe multi-branch tenants without stale-branch data bleed; single-branch tenants see zero behavioral change (branchId is `null`, a fixed constant slot) |
| Hand-rolled `if (result.error) throw new Error(...)` per hook (7 near-identical copies) | Shared `unwrapSdkResult()` | This phase | One choke point for `err.code`, consumed by Phase 17's centralized `onError` |

**Deprecated/outdated:** None — this is an additive/mechanical retrofit, not a library migration. `@tanstack/react-query@5.99.2` and `@charlyk/admin-client@1.1.67` stay pinned at their current versions.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | The runtime value of `result.error.error` for a `BRANCH_INACTIVE`/`BRANCH_ACCESS_REVOKED`/`NO_BRANCH_ACCESS` 403 is the literal short code string (e.g., exactly `"BRANCH_INACTIVE"`), not a human sentence (e.g., `"Branch is inactive"`) | Common Pitfalls #1, Code Examples | If the server actually sends a human sentence rather than the short code, Phase 17's planned string-equality match against `'BRANCH_INACTIVE'` etc. will never fire. This is unverifiable from the static `.d.ts` alone (it only declares `{error: string}` — the string's *content* is a runtime/API-server fact, not a TS-type fact) and was explicitly out of scope to verify further in this phase (Phase 14 only needs `err.code` populated with *some* string; Phase 17 is where the literal matching happens and where this should be confirmed against a live 403 response or the API's own docs) |
| A2 | `use-history-orders.js`'s existing `.diagnostic` debugging addition is safe to leave untouched (key-only change) rather than routed through `unwrapSdkResult()` | Common Pitfalls #5 | If the referenced debug session is actually closed, leaving the richer diagnostic in place is harmless (extra fields, no behavior change) — low risk either way, but the planner should explicitly decide rather than silently overwrite |
| A3 | Colocating `unwrapSdkResult()` in `src/data.jsx` (vs. a new `src/sdk.js`) has no import-cycle risk | Architecture Patterns — Pattern 2 | Low risk: `data.jsx` has no imports from any of the 7 hook files today (verified: `data.jsx`'s only imports are none — it's a leaf module of pure constants/functions), so adding an export there is safe either way; this is Claude's Discretion per CONTEXT.md, included for completeness |

## Open Questions

1. **Exact runtime string for the three branch-error codes**
   - What we know: the SDK's `.d.ts` types confirm the envelope shape (`{error: string}`) but not the string's actual content for a branch-access 403.
   - What's unclear: whether the API sends `"BRANCH_INACTIVE"` (short code) or a full sentence.
   - Recommendation: not a Phase 14 blocker (this phase only needs `err.code` populated with whatever string the server sends). Flag explicitly for Phase 15/17 planning to verify against the live API (or the `sitecare-orders-api` repo's error-code constants, if accessible) before writing Phase 17's `onError` string-match logic.

2. **Is `use-history-orders.js`'s `.diagnostic` debug session (`windows-history-network-error`) still open?**
   - What we know: the file's own header comment says it's a temporary addition tied to an active investigation.
   - What's unclear: whether `.planning/debug/windows-history-network-error` (referenced in the file) is still open or has been closed since.
   - Recommendation: check `.planning/debug/` for this slug before deciding whether to fold this hook's error path into `unwrapSdkResult()` or leave it as a key-only change (see Pitfall 5 / A2).

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Build/test toolchain | ✓ | v24.9.0 | — |
| npm | Package management | ✓ | 11.6.2 | — |
| Vitest | Test framework (this phase's verification) | ✓ | 4.1.5 | — |
| `@charlyk/admin-client` | All 7 hooks' SDK calls | ✓ (already installed, pinned) | 1.1.67 | — |
| `@tanstack/react-query` | Query-key mechanism | ✓ (already installed, pinned) | 5.99.2 | — |

**Missing dependencies with no fallback:** none.
**Missing dependencies with fallback:** none — this phase introduces zero new external dependencies.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.5 `[VERIFIED: npx vitest --version]` + `@testing-library/react` (already used by `use-orders.test.js`, `use-order-actions.test.js`) |
| Config file | `vitest.config.js` (repo root) |
| Quick run command | `npx vitest run src/__tests__/use-orders.test.js src/__tests__/use-order-actions.test.js src/__tests__/use-history-orders.test.js` |
| Full suite command | `npx vitest run` |

### Test Convention (verified against existing shipped tests)

All 4 existing hook test files (`use-orders.test.js`, `use-order-actions.test.js`, `use-history-orders.test.js`, `use-sse.test.js`) mock `@tauri-apps/plugin-store` and `../auth.jsx` (`vi.mock('../auth.jsx', () => ({ useAuth: vi.fn() }))`), then use the **real** `store.js` (backed by the mocked plugin-store) and call `useAppStore.setState({ currentBranch: {...} })` directly to seed branch state — this exact pattern is already shipped in `src/__tests__/auth-token.test.jsx` (e.g. line 154: `expect(freshUseAppStore.getState().currentBranch).toEqual(FAKE_ME.selectedBranch)`). Phase 14's new hook tests should follow this same convention: **do not mock `../store.js`** — import the real `useAppStore` and call `.setState({ currentBranch: { id: 'branch-a', name: '...', slug: '...', isDefault: true, isActive: true } })` before `renderHook`.

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SCOPE-01 (SC1) | Query key includes `currentBranch?.id`; changing `currentBranch` in the store produces a different key and a fresh fetch (cache miss) for each of the 7 hooks | unit | `npx vitest run src/__tests__/use-orders.test.js` (extend existing file, or new `use-orders-branch-scope.test.js`) | ❌ Wave 0 — new assertions needed in each of the 4 existing hook test files + 3 new test files for hooks with no test file yet (`use-order-detail`, `use-stats`, `use-menu` has partial coverage in `use-orders.test.js`, `use-restaurant-settings`, `use-delivery-areas`) |
| SCOPE-01 (SC2) | Mutation invalidation with an exact branch-scoped key leaves a **sibling branch's** cached entry untouched — the core assertable test for D-03 | unit | `npx vitest run src/__tests__/use-order-actions.test.js` (extend existing) | ❌ Wave 0 — existing file only asserts `invalidateQueries` was called with `['orders']`; must add branch-scoped key assertion AND a sibling-branch-untouched assertion (`qc.setQueryData(['orders', 'branch-b'], [...]); ...mutate(); expect(qc.getQueryData(['orders','branch-b'])).toEqual([...unchanged])`) |
| SCOPE-01 (SC3) | A simulated branch-error response (mock `result.error`) yields a populated `error.code` on the thrown `Error` | unit | new `src/__tests__/data-unwrap-sdk-result.test.js` (or colocate in an existing `data.test.js` if one exists) | ❌ Wave 0 — `unwrapSdkResult()` doesn't exist yet; needs its own direct unit test (mock `{error: 'BRANCH_INACTIVE'}` and `{error: {error: 'Branch is inactive'}}` shapes, assert `.code` is populated in both) |
| SCOPE-01 (SC4) | Single-branch/null-`currentBranch` tenant still fetches immediately — `enabled: !!client` unchanged, no added delay; null-slot key, not a gated/blocked fetch | unit | `npx vitest run src/__tests__/use-orders.test.js` (extend existing "does not run when client is null" test with a parallel "DOES run when client is set but currentBranch is null" test) | ❌ Wave 0 — the existing file already tests the `enabled: !!client` gate for a null client; needs a companion assertion for `client` present + `currentBranch: null` → `fetchStatus` is NOT `'idle'` |

### Sampling Rate

- **Per task commit:** `npx vitest run <touched-hook-test-file>` (fast, targeted)
- **Per wave merge:** `npx vitest run` (full suite — this phase touches 7+ shared files, high regression surface)
- **Phase gate:** Full suite green before `/gsd-verify-work`, plus a manual `git grep` audit (Pitfalls' own recommended check): `git grep "queryKey: \['orders'\]\|queryKey: \['order'\]\|queryKey: \['stats'\]\|queryKey: \['menu'\]\|queryKey: \['history-orders'\]\|queryKey: \['restaurant-settings'\]\|queryKey: \['delivery-areas'\]" src/` should return **zero matches** outside of `use-sse.js` (the one file deliberately left unscoped until Phase 15 — see Pitfall 3).

### Wave 0 Gaps

- [ ] `src/__tests__/use-order-detail.test.js` — does not exist yet; needed to cover `['order', branchId, id]` key shape (SC1) since no existing test file touches this hook
- [ ] `src/__tests__/use-stats.test.js` — does not exist yet; needed for `['stats', branchId]` (SC1)
- [ ] `src/__tests__/use-restaurant-settings.test.js` — does not exist yet
- [ ] `src/__tests__/use-delivery-areas.test.js` — does not exist yet
- [ ] `src/__tests__/data-unwrap-sdk-result.test.js` (or equivalent) — new, for SC3
- [ ] Sibling-branch-untouched assertion pattern — not yet present anywhere in the test suite; this phase's plan should establish the pattern once (e.g. in `use-order-actions.test.js`) since it's the single most important assertable behavior for SC2

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-------------------|
| V2 Authentication | No | Unchanged this phase — `useAuth()`/`client` gating untouched |
| V3 Session Management | No | `currentBranch` session-state handling is Phase 13's concern, already shipped and session-only (not persisted) |
| V4 Access Control | Indirect | This phase does not enforce access control — the server does (branch-access re-validated per request per prior Pitfalls research). This phase only threads the resulting error code through to `err.code`; it does not gate any UI action on branch identity |
| V5 Input Validation | No | No new user input is introduced; `branchId` is read from server-derived Zustand state, never from a form field or URL param, and is never sent to the server as a request parameter (D-08/Pitfall 11 — server resolves branch server-side) |
| V6 Cryptography | No | Not applicable |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|----------------------|
| Client-persisted `branchId` used as an authorization boundary | Tampering | Already mitigated by Phase 13 (D-10: `currentBranch` never in `partialize`) — this phase must not reintroduce persistence; verify no new `localStorage`/`preferences.json` write is added for `branchId` |
| Raw SDK error strings surfaced directly in UI toasts | Information Disclosure | Not this phase's concern (no toast/UI surfacing here — Phase 17 owns the toast). `unwrapSdkResult()` should not be called anywhere that renders `err.message` raw to the DOM without going through i18n copy, per existing D-08 convention (`use-history-orders.js`'s existing error handling already follows this — the raw message is used for internal `ErrorBlock` diagnostics only, not customer-facing copy) |

## Sources

### Primary (HIGH confidence)
- `/Users/eduardalbu/Developer/sitecare-pos/node_modules/@charlyk/admin-client/dist/index.d.ts` — read directly, lines 665-692 (`SelectedBranch`, `AccessibleBranch`, `CurrentUser`), 1613-1993 (all 7 hooks' + `useBranches`' declared `Errors` types), 2002-2016 (`SwitchMyBranchErrors`), 1239-1241 (`Error` generic type), 220-239/1220-1238 (`FiscalError`/`ZoneError`/`ValidationError` — the richer shapes NOT used by this phase's 7 hooks), 4820-4845 (generic `RequestResult`/response-style plumbing)
- `/Users/eduardalbu/Developer/sitecare-pos/src/use-orders.js`, `use-order-detail.js`, `use-stats.js`, `use-menu.js`, `use-history-orders.js`, `use-restaurant-settings.js`, `use-delivery-areas.js`, `use-order-actions.js`, `use-sse.js`, `store.js`, `auth.jsx` — read directly, 2026-07-22, for current query-key shapes, error-handling lines, and the `currentBranch` seam shipped by Phase 13
- `/Users/eduardalbu/Developer/sitecare-pos/src/screen-pos.jsx:169-178`, `screen-menu.jsx:37-45`, `screen-orders.jsx:162-165,281` — read directly for the 3 additional invalidation call sites
- `/Users/eduardalbu/Developer/sitecare-pos/src/__tests__/use-orders.test.js`, `use-order-actions.test.js`, `auth-token.test.jsx` — read directly for existing test conventions (mock strategy, `useAppStore.setState()` pattern for seeding `currentBranch`)
- `package.json` — confirmed `@charlyk/admin-client@^1.1.67`, `@tanstack/react-query@^5.99.2` already pinned; `node --version` (v24.9.0), `npm --version` (11.6.2), `npx vitest --version` (4.1.5) confirmed via direct tool invocation
- `.planning/phases/14-branch-scoped-cache-re-scoping/14-CONTEXT.md` — this phase's locked decisions (D-01 through D-08), read in full
- `.planning/phases/13-branch-state-launch-seeding-foundation/13-CONTEXT.md` — prior-phase `currentBranch` seeding decisions, read in full

### Secondary (MEDIUM confidence)
- `.planning/research/SUMMARY.md`, `PITFALLS.md`, `ARCHITECTURE.md` (all dated 2026-07-21, HIGH confidence per their own metadata, cross-checked against this phase's own direct source reads above) — cited for the TanStack Query v5 prefix-match `invalidateQueries` semantics (originally sourced from [TanStack Query v5 Query Invalidation docs](https://tanstack.com/query/v5/docs/framework/react/guides/query-invalidation)) and the overall architecture rationale for branchId-keying over `resetQueries()`

### Tertiary (LOW confidence)
- None — every claim in this document is either read directly from the installed SDK types, read directly from this repo's own source, or cited from the prior HIGH-confidence research documents. The one LOW-confidence item (exact runtime string content of the branch-error codes) is explicitly logged in the Assumptions Log (A1) rather than presented as fact.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — zero new dependencies; both libraries already pinned and in active use
- Architecture: HIGH — mechanism locked by CONTEXT.md D-01, cross-verified against actual source files, not just prior research prose
- Pitfalls: HIGH for the SDK error-shape correction (verified directly against `.d.ts`); MEDIUM for the exact runtime string content of branch-error codes (Assumption A1, cannot be verified without a live 403 response)

**Research date:** 2026-07-22
**Valid until:** 30 days (stable — this phase's scope is an internal refactor against already-pinned dependencies, not a fast-moving external API surface; re-verify the SDK version pin if `package.json`'s `@charlyk/admin-client` version changes before implementation)
