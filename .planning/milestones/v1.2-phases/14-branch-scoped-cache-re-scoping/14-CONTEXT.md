# Phase 14: Branch-Scoped Cache Re-Scoping - Context

**Gathered:** 2026-07-22
**Status:** Ready for planning

<domain>
## Phase Boundary

Every branch-scoped data cache is **keyed to the active branch** so that, once switching exists, no cached response can ever be served against the wrong branch. Requirement: **SCOPE-01**.

This is the **load-bearing phase** of v1.2 — the switcher UI (Phase 16), SSE reconnect (Phase 15), and centralized 403 handling (Phase 17) all assume branch-scoped caches already exist. Research and Pitfalls both flag it as the single phase that must be scoped and verified on its own.

**Delivers:**
- All **7 branch-scoped data hooks** retrofitted to read `currentBranch?.id` and fold it into their query keys.
- `use-order-actions.js`'s **3 `invalidateQueries` calls** + POS submit (`screen-pos.jsx`) + menu stock toggle (`screen-menu.jsx`) updated in lockstep to branch-scoped keys.
- A shared **`unwrapSdkResult()` helper** that attaches `err.code` from the SDK error envelope, satisfying SC3's "matchable error code" requirement.

**Out of scope for this phase** (later phases):
- The branch **switch flow / mutation** that actually *sets* `currentBranch` — Phase 16 (SWCH-03). This phase only makes the keys *react* to a `currentBranch` change; it does not trigger one.
- **Pitfall-4 race sequencing** (invalidate/refetch/reconnect only *after* `switch` resolves) — enforced in Phase 16's switch handler, not here.
- **SSE branch-aware reconnect** — Phase 15 (SCOPE-02).
- The **centralized `onError` handler** that consumes `err.code` — Phase 17 (BERR). This phase only *produces* the code; it does not route it.
- POS cart reset / detail-screen exit on switch — Phase 16 (SCOPE-03).

</domain>

<decisions>
## Implementation Decisions

### Re-scoping mechanism (the ROADMAP-flagged decision point)
- **D-01:** Use **branchId-keyed query keys** across all 7 hooks — `['orders', branchId, status?]`, `['order', branchId, id]`, `['stats', branchId]`, `['menu', branchId]`, `['history-orders', branchId, from, to]`, `['restaurant-settings', branchId]`, `['delivery-areas', branchId]`. **NOT** `queryClient.resetQueries()` on switch. Old-branch entries orphan harmlessly (never re-queried); new-branch entries fetch fresh on first render after a switch. Chosen for race-safety by construction (immune to Pitfall 4) and future-proofing (a later hook that forgets to reset cannot leak). Apply the ONE mechanism **uniformly** — do not mix in any ad-hoc `resetQueries`. — **Reversibility:** costly — reverting to `resetQueries()` would touch all 7 hook keys plus every invalidation call site and shift the re-scope logic into Phase 16.
- **D-02:** Because re-scoping is key-driven, **this phase does not touch the switch flow**. When Phase 16 sets `currentBranch`, every key changes and caches re-scope automatically — no reset call, no cross-phase coupling beyond the shared key convention.

### Mutation invalidation scope (SC2)
- **D-03:** Mutations invalidate with **exact branch-scoped keys** — `invalidateQueries({ queryKey: ['orders', branchId] })`, `['order', branchId]`, `['stats', branchId]`, and `['menu', branchId]` for the menu toggle. This literally satisfies SC2 ("invalidate only the active branch's cache entries, never a different branch's") and is testable — a sibling branch's cached entry must stay untouched. The mutation hooks/screens therefore read `currentBranch?.id`, same as the query hooks. **Not** the broad prefix `['orders']`, which partial-matches every branch's entries and fails SC2 as written.
- **D-04:** All invalidation call sites move in **lockstep** with the key change: `use-order-actions.js` (updateStatus + updateEstimatedTime → `['orders'|'order'|'stats', branchId]`), `screen-pos.jsx:172` (POS submit → `['orders', branchId]`), `screen-menu.jsx:40` (toggle stock → `['menu', branchId]`), and the manual refresh button in `screen-orders.jsx:281` (`['orders', branchId]` + `['stats', branchId]`). Missing one reproduces the exact stale-branch bug this phase exists to prevent.

### Error-code plumbing (SC3)
- **D-05:** Build a shared **`unwrapSdkResult(result, fallbackMessage)`** helper: on `result.error`, throw an `Error` whose message is `result.error.error ?? fallback` and whose `.code` is copied from `result.error.code`; otherwise return `result.data`. Route the error branch of all 7 fetch hooks through it. This gives Phase 17's `QueryCache`/`MutationCache` `onError` a single trustworthy `err.code` choke point. Since all 7 hooks are already being edited for keys, threading the error line through the helper is clean and drift-proof.
- **D-06:** This phase **produces** the code only. It does **not** build the `onError` handler, does not act on `BRANCH_INACTIVE`/`BRANCH_ACCESS_REVOKED`/`NO_BRANCH_ACCESS`, and does not add any toast or recovery — all Phase 17. SC3's bar is met when a fetch failure carries a matchable `err.code`, verifiable by asserting `error.code` is populated on a simulated branch-error response.

### Null / unresolved branchId
- **D-07:** The `branchId` key slot is **always present**, holding `currentBranch?.id ?? null` — e.g. `['orders', currentBranch?.id ?? null, ...(status ? [status] : [])]`. A single, fixed key shape (never the variable-length `branchId ? ['orders', branchId] : ['orders']` fallback), so scoped and unscoped shapes never coexist and exact invalidations always match. When a branch later resolves, the key changes exactly once and re-scopes cleanly.
- **D-08:** The query gate stays **`enabled: !!client` only** — **never** `!!branchId` (Pitfall 11 / SC4). Single-branch tenants (whose `selectedBranch` may legitimately be `null`) and the non-401 cold-start-failure state (authed, `currentBranch` still null) must fetch immediately with the null-slot key; the server resolves data from the session's own `selected_branch_id`. Branch resolution never blocks or delays the initial fetch.

### Claude's Discretion
- **Where `unwrapSdkResult()` lives** — colocate in `src/data.jsx` (alongside `normalizeOrder`) or a small new `src/sdk.js`. Planner's call.
- **Whether the `history-orders` key** places `branchId` before the `from`/`to` segments (recommended: `['history-orders', branchId, from, to]`) — as long as `branchId` is the first variable segment for consistency with the others.
- **Whether mutation hooks reuse `unwrapSdkResult()`** for their own error branches, or keep their existing throw — SC3 only strictly requires the 7 *fetch* hooks; extending it to mutations is a nice-to-have, not required.
- Exact test scaffolding for SC1/SC2/SC3 verification (mock branch ids, sibling-cache assertion).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & roadmap
- `.planning/REQUIREMENTS.md` — SCOPE-01 (line 24): the single locked requirement for this phase. Also read SCOPE-02 (line 25, Phase 15) and SWCH-03 / SCOPE-03-04 (Phase 16) to see where the switch flow that consumes these keys lands.
- `.planning/ROADMAP.md` §"Phase 14" (lines 79–93) — goal + 4 success criteria + the **explicit planning note** ("branchId-keyed vs `resetQueries()` — pick one, apply uniformly, don't mix"). D-01 resolves that note in favor of branchId-keying.

### Research (all 2026-07-21, HIGH confidence)
- `.planning/research/SUMMARY.md` §"Phase 2: Branch-Scoped Query Keys" (lines 85–90) — this phase's deliverables, the mechanism decision point, and the pitfalls it avoids. §"Architecture Approach" (lines 55–65) names the 7 hooks, the `unwrapSdkResult()` helper, and the `use-order-actions` lockstep requirement.
- `.planning/research/PITFALLS.md` — **Pitfall 3** (cache bleed across the unscoped hooks; the two mechanism options), **Pitfall 4** (refetch-before-switch-resolves race — why branchId-keying is safer; the race *sequencing* is Phase 16), **Pitfall 11** (single-branch regression — `enabled: !!client` only, never `!!branchId`).
- `.planning/research/ARCHITECTURE.md` — per-resource hooks fold `branchId` as the second key segment; the global `onError` interceptor (Phase 17) reads the `err.code` this phase attaches.

### SDK contract (source of truth over the PRD)
- `node_modules/@charlyk/admin-client/dist/index.d.ts` — the SDK error envelope carries `code: string` (the field `unwrapSdkResult` copies). `client.kitchen.orders.list` / `.get`, `client.menu`, stats, restaurant-settings, delivery-areas response `{ data, error }` shapes.

### Prior phase context (carried forward)
- `.planning/phases/13-branch-state-launch-seeding-foundation/13-CONTEXT.md` — Phase 13 decisions this phase builds on: `currentBranch` is the full `SelectedBranch` object, session-only in Zustand (`store.js:68`), nullable-is-valid (D-13 specifics), seeded by `AuthProvider` inside the cold-start blocking gate; the `enabled: !!client` / never-`!!branchId` lock (D-09).

### Source files this phase modifies/adds
- `src/use-orders.js` — key `['orders'|,status]` → `['orders', branchId, status?]`; error path → `unwrapSdkResult`.
- `src/use-order-detail.js` — key `['order', id]` → `['order', branchId, id]`.
- `src/use-stats.js` — key `['stats']` → `['stats', branchId]`.
- `src/use-menu.js` — key `['menu']` → `['menu', branchId]`.
- `src/use-history-orders.js` — key `['history-orders', from, to]` → `['history-orders', branchId, from, to]`.
- `src/use-restaurant-settings.js` — key `['restaurant-settings']` → `['restaurant-settings', branchId]`.
- `src/use-delivery-areas.js` — key `['delivery-areas']` → `['delivery-areas', branchId]`.
- `src/use-order-actions.js` — 3 `invalidateQueries` calls → branch-scoped (D-04).
- `src/screen-pos.jsx:172` (POS submit) and `src/screen-menu.jsx:40` (stock toggle) and `src/screen-orders.jsx:281` (manual refresh) — invalidations → branch-scoped.
- `src/data.jsx` (or new `src/sdk.js`) — `unwrapSdkResult()` helper.
- `src/store.js` — `currentBranch` (read-only consumption; no change needed beyond what Phase 13 shipped).

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`currentBranch` in Zustand** (`store.js:68`, setter `store.js:116`) — already shipped by Phase 13, session-only, excluded from `partialize`. Every hook reads `currentBranch?.id` from the store (or via a small selector) — no new state needed.
- **`normalizeOrder` in `src/data.jsx`** — existing shared data helper; the natural colocation candidate for `unwrapSdkResult()`.
- **Uniform hook shape** — all 7 hooks already follow `useQuery({ queryKey, queryFn, enabled: !!client, staleTime })` with `if (result.error) throw new Error(result.error.error ?? '…')`. The retrofit is mechanical and identical across them.

### Established Patterns
- **`{ data, error }` "fields" response style** — every SDK call unwraps `result.data` / checks `result.error`; `unwrapSdkResult()` formalizes exactly this existing shape.
- **`enabled: !!client` is the sole gate** on every hook today — preserving that (never adding `!!branchId`) is both the existing pattern and the Pitfall-11 requirement.
- **Invalidation currently targets unscoped keys** — `use-order-actions.js:26-28,40-42`, `screen-pos.jsx:172`, `screen-menu.jsx:40`, `screen-orders.jsx:281`. These are the exact lockstep sites for D-04.
- **`staleTime` varies** — 30s on orders/stats, 5min on settings/delivery-areas, 0 on order-detail. These stay as-is; branch-keying is what forces the fresh fetch on switch, not `staleTime` changes.

### Integration Points
- **Phase 16 switch flow** is the eventual *trigger* — it sets `currentBranch`, and these keys react. This phase ships the reaction, not the trigger.
- **Phase 17 `onError`** is the eventual *consumer* of the `err.code` that `unwrapSdkResult()` attaches.
- **`useSSE` (`src/use-sse.js`)** writes into `['orders', …]` / `['stats']` caches on live events — Phase 15 will branch-prefix those writes to match this phase's keys. Not modified here, but its cache writes must eventually align with the D-01 key convention.

</code_context>

<specifics>
## Specific Ideas

- Key convention is fixed: **`branchId` is always the first variable segment**, immediately after the resource name, before any other params (status, id, from/to). This uniformity is what makes exact-key invalidation (D-03) reliable.
- `null` is a **legitimate resolved branch value**, distinct from "not yet loaded" — the null-slot key (D-07) handles both without conflating them or gating the fetch.

</specifics>

<deferred>
## Deferred Ideas

- **Switch mutation / non-optimistic switch flow + Pitfall-4 race sequencing** — Phase 16 (SWCH-03, SCOPE-04). This phase makes keys react; Phase 16 owns the invalidate-only-after-switch-resolves ordering.
- **SSE branch-prefixed cache writes + branch-aware reconnect** — Phase 15 (SCOPE-02). `useSSE`'s cache writes must eventually adopt this phase's key convention.
- **Centralized `onError` handler** consuming `err.code` (toast + reopen switcher + refetch; full-screen block for `NO_BRANCH_ACCESS`) — Phase 17 (BERR-01).
- **POS cart reset / detail-screen exit on switch** (`key={currentBranch?.id}` on the POS route) — Phase 16 (SCOPE-03).

None of these were scope creep — all are already-roadmapped later phases surfaced by the discussion.

</deferred>

---

*Phase: 14-branch-scoped-cache-re-scoping*
*Context gathered: 2026-07-22*
