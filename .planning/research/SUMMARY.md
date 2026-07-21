# Project Research Summary

**Project:** SiteCare POS — v1.2 Branch Switching
**Domain:** Multi-location POS/desktop app integration — making a shipped, single-branch Tauri/React/TanStack Query app branch-aware against a server-side-scoped multi-tenant API
**Researched:** 2026-07-21
**Confidence:** HIGH

## Executive Summary

v1.2 is a pure integration milestone against an already-installed SDK (`@charlyk/admin-client@1.1.67`) and an already-live API (v2.6 "Tenant Branching"). All four researchers independently verified the exact same SDK surface directly from `node_modules/@charlyk/admin-client/dist/index.d.ts` and this repo's own source, so there is unusually high agreement across STACK, FEATURES, ARCHITECTURE, and PITFALLS: `client.me.branches.list()` returns `AccessibleBranch[]`, `client.me.branches.switch({ body: { branchId } })` returns `{ ok, branchId }`, and — critically — `client.auth.getMe()` already returns `CurrentUser.selectedBranch`, contradicting a stale warning in the external API PRD. No new npm or Cargo dependencies are needed anywhere in this milestone.

The recommended approach is architectural, not incremental: rather than bolting a "switch handler" onto the existing screens, prefix every branch-scoped TanStack Query key with `branchId` (`['orders', branchId]`, `['menu', branchId]`, etc.) and add `branchId` to `useSSE`'s effect dependency array. Once `currentBranch` is written to Zustand on a successful switch, every consumer re-renders, computes a new (uncached) query key, and refetches automatically — no manual `invalidateQueries` calls, no manual SSE teardown/reopen logic. This is a natural extension of a pattern this codebase already uses (`['orders', status]`). A simpler fallback — `queryClient.resetQueries()` with no filter in the switch mutation's `onSuccess` — is viable as an interim/simpler mechanism but is more fragile against future hooks being silently missed and has weaker race-condition isolation; the two are complementary, and the final choice should be made explicitly during phase planning rather than left ambiguous.

The dominant risk category is **silent wrong-branch data** — the entire feature exists to prevent staff from unknowingly acting on the wrong branch's orders, menu, or KDS stream, so partial implementations (SSE not reconnecting, one hook not rekeyed, a 403 not centrally routed) reproduce exactly the failure mode the milestone is meant to eliminate. A secondary risk is state that currently doesn't exist and must be added carefully: cold start today never calls `getMe()`/`getSession()` (`auth.jsx` trusts the stored token blindly), so seeding "current branch" on relaunch requires adding a new call, not wiring an existing one. A tertiary, physically-unrecoverable risk is a wrong-branch printed receipt if a switch races an in-flight order/print operation — this argues for disabling branch-agnostic mutations during a pending switch.

## Key Findings

### Recommended Stack

Zero new dependencies. The entire feature is built from technologies already in `package.json`: `@charlyk/admin-client` (branch list/switch calls), `@tanstack/react-query` (branch-scoped cache re-keying), `zustand` (current-branch + switcher UI state), and `@microsoft/fetch-event-source` (SSE, unchanged library — only its reconnect *trigger* changes). The SDK's `me.branches.{list,switch}` namespace and `CurrentUser.selectedBranch` field are both already declared in the pinned `v1.1.67` types — no SDK bump required. All SDK calls follow the codebase's existing `{ data, error }` "fields" response-style convention already used everywhere.

**Core technologies:**
- `@charlyk/admin-client@1.1.67` (pinned, unchanged): `me.branches.list()` / `me.branches.switch()` / `auth.getMe()` — the entire branch surface, already installed
- `@tanstack/react-query@5.99.2` (unchanged): mechanism for re-scoping every screen's data on switch — via `branchId`-keyed query keys (robust default) or `resetQueries()` (simpler fallback)
- `zustand@5` (unchanged): new `currentBranch` (session-only, never persisted) and `branchSwitcherForceOpen` state, same tier as existing `authUser`

### Expected Features

Sourced from the SiteCare API's own PRD for this exact integration (`RESTAURANT_DASHBOARD_PRD.md` §5–7, §11, §15–16), cross-checked against shipped code — this is a fixed backend contract, not a general market survey.

**Must have (table stakes):**
- Persistent branch switcher in the sidebar footer, replacing the RO/EN toggle (which relocates to Settings → Afișaj, where a language control already exists)
- Current branch name + "default" badge always visible; single-branch tenants render a read-only label (no dropdown affordance) — must behave identically to pre-v1.2
- Branch list load (`client.me.branches.list()`) with focus/error refetch, never cached indefinitely
- Non-optimistic switch action (`client.me.branches.switch`) — UI only updates after the server confirms; disabled/spinner while pending
- Branch-scoped re-fetch of every existing data hook (orders, order detail, stats, menu, history, restaurant settings, delivery areas) on switch
- SSE reconnect scoped to the new branch (server force-closes the old stream on switch)
- "Switched to `<branch>`" confirmation toast
- Launch-time branch adoption from session (`getMe().selectedBranch`), never from local persistence
- Centralized 403 handling for `BRANCH_INACTIVE` / `BRANCH_ACCESS_REVOKED` (switch call *and* any later request) → toast + reopen switcher + refetch branch list
- `NO_BRANCH_ACCESS` → distinct full-screen blocking state (more severe; no valid branch to fall back to)

**Should have (P2 — add within v1.2 if time allows):**
- Post-switch navigation off stale detail screens to a neutral screen (Orders/History)
- Session-vs-branch-list mismatch reconciliation (defensive only)
- SSE-specific 403 short-circuit distinct from generic retry/backoff

**Defer / anti-features (do not build for v1.2):**
- Search/filter box inside the switcher, branch logos, "recently used branch" shortcut — SiteCare tenants have only a handful of branches
- Polling the branch list on a timer — focus/error-triggered refetch is sufficient per the PRD
- Persisting the branch list or selected branch across app restarts
- A confirm-switch modal, client-side branchId validation, full app reload/relaunch as the re-scope mechanism
- Per-branch-keyed Zustand UI state (density/theme/etc. remain global user preferences, not branch-scoped)

### Architecture Approach

Branch switching integrates almost entirely through query-key parameterization plus one new Zustand field, not through new invalidation machinery. `currentBranch` (the full `SelectedBranch` object) lives in Zustand, session-only, seeded from `client.auth.getMe()` on both cold start and sign-in (cold start currently does neither — this is new work, not a rewire). `accessibleBranches` lives in TanStack Query (`['branches']`, deliberately not branch-prefixed) with a short `staleTime` and focus/error refetch. Every existing branch-scoped hook reads `currentBranch?.id` and folds it into its query key as the second segment (`['orders', branchId]`, `['order', branchId, id]`, etc.), while `useSSE` gains a `branchId` parameter added to its effect's dependency array so React's own cleanup/re-run cycle tears down and reopens the connection — no manual disconnect/reconnect call needed. A single `QueryCache`/`MutationCache`-level `onError` handler in `main.jsx` is the one choke point for all three `BRANCH_*` error codes, fed by a small `err.code` attached in a shared SDK-response-unwrap helper, so switch-time and later-request 403s both route through identical recovery logic.

**Major components:**
1. `currentBranch` (Zustand, session-only) — single source of truth for "which branch," seeded by `AuthProvider`, read synchronously by every query-key builder, `useSSE`, and Shell
2. `useBranches()` / `useBranchSwitch()` (new `use-branches.js`) — TanStack Query hook + mutation wrapping the two new SDK calls; also hosts the shared `handleBranchError`
3. Seven existing data hooks (`use-orders`, `use-order-detail`, `use-menu`, `use-history-orders`, `use-stats`, `use-restaurant-settings`, `use-delivery-areas`) — each modified to fold `branchId` into its query key
4. `useSSE(token, branchId, onLiveOrder)` — modified to reconnect on branch change and branch-prefix its cache writes
5. Global `QueryCache`/`MutationCache` `onError` in `main.jsx` — the single interceptor for `BRANCH_INACTIVE` / `BRANCH_ACCESS_REVOKED` / `NO_BRANCH_ACCESS`, regardless of origin
6. `BranchSwitcher` (new, in `Shell`) — prop-driven like the rest of `Shell` (not hook-driven), replacing the RO/EN toggle block

### Critical Pitfalls

1. **SSE never reconnects on switch** — `useSSE`'s effect currently depends only on `[token, queryClient]`; a switch doesn't rotate the token, so without adding `branchId` to the dependency array, the KDS/live-orders stream goes silently dead (or worse, appears connected while receiving nothing) until the library's own backoff eventually retries. Fix: add `branchId`/`branchEpoch` to the effect deps so React's cleanup forces an immediate teardown+reconnect.
2. **Cache bleed across all six existing hooks** — none of `use-orders`, `use-order-detail`, `use-stats`, `use-restaurant-settings`, `use-delivery-areas` (plus `use-menu`) currently key on branch; without rekeying (or a `resetQueries()` fallback), stale-branch data keeps rendering for up to their `staleTime` (30s–5min) after a switch — a "looks completely normal, is actually wrong" bug. `use-order-actions.js`'s three `invalidateQueries` calls must be updated in lockstep.
3. **Race: refetching/reconnecting before the switch call resolves returns old-branch data** — because branch is server-side session state, any request fired before `switchMyBranch`'s response lands is still scoped to the old branch. Sequence strictly: await the switch mutation, only then update Zustand / rekey / reconnect SSE — never optimistically on click.
4. **403 on a later, ordinary request isn't routed anywhere special** — access can be revoked mid-session by an owner, surfacing on the *next* orders refetch or mutation, not just on a switch attempt; without a centralized `QueryCache`/`MutationCache`-level handler, this looks like a generic/offline error with no path back to a working state.
5. **Launch-time seed is genuinely new code, and the external PRD is stale for this SDK version** — cold start today never calls `getMe()`/`getSession()` at all (trusts the stored token blindly), so there is currently no hook to attach "load selected branch on launch" to. Separately, the API PRD claims `getMe()` lacks `role`/`selectedBranchId` — false for the installed `v1.1.67` SDK, whose `CurrentUser` type already includes both. Trust the installed types over the PRD prose; flag this explicitly in the phase so a future reviewer doesn't "correct" it back to the PRD.

## Implications for Roadmap

Based on combined research (Architecture's suggested build order is the load-bearing sequencing input here, cross-checked against Pitfalls' "must land together" warnings):

### Phase 1: State + Launch Seeding Foundation
**Rationale:** Every other phase depends on `currentBranch` existing in Zustand and being correctly seeded on both cold start and sign-in; this is low-risk, independently testable, and mirrors the already-proven `authUser` pattern — but it requires *new* code (cold start currently calls neither `getMe()` nor `getSession()`), not a rewire of existing logic.
**Delivers:** `store.js` additions (`currentBranch`, `branchSwitcherForceOpen` — explicitly excluded from `partialize`); `auth.jsx` gains a `client.auth.getMe()` call in both the cold-start restore effect and `signIn()`; new `use-branches.js` with `useBranches()` and `useBranchSwitch()` (no UI consumption yet).
**Addresses:** Launch-time branch adoption from session (FEATURES §5); "no local persistence of branch" requirement.
**Avoids:** Pitfall 9 (missing cold-start seed / stale PRD guidance), Pitfall 10 (persisted branchId drift).

### Phase 2: Branch-Scoped Query Keys (Cache Re-Scoping)
**Rationale:** Architecture and Pitfalls both flag this as the single load-bearing phase — every other feature (switcher UI, SSE, 403 handling) assumes branch-scoped caches exist. Should be scoped as its own unit of work with its own verification pass, not folded into the switcher UI phase.
**Delivers:** All seven existing hooks (`use-orders`, `use-order-detail`, `use-menu`, `use-history-orders`, `use-stats`, `use-restaurant-settings`, `use-delivery-areas`) retrofitted to read `currentBranch?.id` and fold it into their query keys; `use-order-actions.js`'s `invalidateQueries` calls updated in lockstep; a shared `unwrapSdkResult()` helper that attaches `err.code` for later use by the global error handler. **Decision point for phase planning:** choose branchId-keying (robust default, complementary) vs. `resetQueries()` (simpler fallback) as the primary mechanism — Stack recommends the latter as sufficient on its own; Architecture/Features recommend the former as more race-safe and future-proof. Document the choice explicitly rather than mixing both ad hoc.
**Uses:** `@tanstack/react-query`'s query-key cache-miss/refetch behavior.
**Implements:** The "per-resource hooks" component from ARCHITECTURE.md.
**Avoids:** Pitfall 3 (cache bleed), Pitfall 4 (race on refetch-before-resolve), Pitfall 11 (single-branch regression — keep `enabled: !!client` as the sole gate, never block on `!!branchId`).

### Phase 3: SSE Branch-Aware Reconnect
**Rationale:** Depends on Phase 2's key convention (SSE writes into branch-prefixed cache keys); Pitfalls explicitly warns this must land together with the switch-flow phase, not as a follow-up — a switcher without a forced SSE reconnect reproduces the exact "silently shows wrong branch" failure this milestone exists to prevent.
**Delivers:** `useSSE(token, branchId, onLiveOrder)` with `branchId` added to the effect dependency array (forcing immediate teardown/reconnect rather than passive backoff retry); branch-prefixed `setQueryData`/`invalidateQueries` calls inside `onmessage`; a regression test asserting snapshot-replay events on a branch-triggered reconnect don't fire the KDS sound burst.
**Addresses:** SSE reconnect requirement (FEATURES §4).
**Avoids:** Pitfall 1 (SSE never reconnects), Pitfall 2 (snapshotDone sound-burst on the wrong reconnect path).

### Phase 4: Branch Switcher UI + Switch Flow
**Rationale:** Now that state, cache-scoping, and SSE reconnect all exist and react automatically to a `currentBranch` write, the switcher itself is comparatively low-risk UI work wired to already-built plumbing.
**Delivers:** `BranchSwitcher` component in `Shell`'s sidebar footer (prop-driven, not hook-driven, matching `Shell`'s existing convention), replacing the RO/EN toggle (RO/EN relocates to Settings → Afișaj); non-optimistic switch mutation (`await` the switch call, only update Zustand/UI in `onSuccess`); disabled/spinner state while pending; "switched to X" toast; default badge + single-branch read-only rendering; post-switch redirect off stale detail screens (`setScreen('orders')`); `key={currentBranch?.id}` on the POS route to discard a stale cart.
**Addresses:** Switcher UI requirements (FEATURES §1, §3).
**Avoids:** Pitfall 5 (optimistic UI on rejected switch), Pitfall 7 (in-flight mutations racing a switch — disable Ring Up/Accept/Advance/Cancel/Reprint while a switch is pending).

### Phase 5: Centralized 403 Branch-Error Handling
**Rationale:** Logically layers on top of Phase 4 (needs the switcher to exist so "reopen" has a target) but its `err.code` plumbing depends on Phase 2's shared unwrap helper — can be developed in parallel with Phase 4 once that plumbing lands. Pitfalls flags this as the single item most likely to be silently dropped if not given its own explicit success criterion.
**Delivers:** `QueryCache`/`MutationCache` `onError` wiring in `main.jsx`; `handleBranchError()` in `use-branches.js` matching on `BRANCH_INACTIVE` / `BRANCH_ACCESS_REVOKED` / `NO_BRANCH_ACCESS`; toast + force-reopen switcher + refetch `['branches']` for the first two; a distinct full-screen blocking state for `NO_BRANCH_ACCESS` (scoping decision — confirm severity treatment during planning); i18n copy for all three codes (no raw SDK error strings surfaced, per existing D-08 convention).
**Addresses:** 403 handling requirement (FEATURES §6, PROJECT.md target features).
**Avoids:** Pitfall 6 (403 on a later ordinary request unrouted), Pitfall 8 (cross-device branch drift — same recovery path covers it, documented as accepted behavior, not "fixed").

### Phase 6: RO/EN Relocation Cleanup
**Rationale:** Purely cosmetic, no branch-logic risk, no dependency on Phases 1–5 beyond Phase 4 having removed the toggle from the sidebar. Sequenced last so it doesn't block or get entangled with functional work.
**Delivers:** RO/EN language control fully relocated into `screen-settings.jsx`'s Afișaj section (a language control already exists there per Features research — confirm it's not already duplicated).

### Phase Ordering Rationale

- State/seeding must exist before anything can read `currentBranch` (Phase 1 first, per Architecture's build order and Pitfalls 9/10's "foundation phase" framing).
- Cache re-scoping (Phase 2) is the widest-reaching, most mechanical change (touches 7 hooks) and is a hard dependency for both SSE reconnect and the switcher's correctness — sequenced before either.
- SSE reconnect (Phase 3) depends on Phase 2's key convention for its own cache writes.
- Switcher UI (Phase 4) and 403 handling (Phase 5) can be developed in parallel once Phase 2's `err.code` plumbing lands, but Phase 5's "reopen switcher" behavior needs Phase 4's switcher to exist as a target — sequence Phase 4 first, Phase 5 close behind or overlapping.
- Every phase from 1–5 should carry a standing verification item re-testing the pre-v1.2 single-branch tenant flow end-to-end (Pitfall 11) — this is not a one-time phase but a regression check repeated throughout the milestone.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 5 (403 handling):** the exact interaction between a branch-resolution 403 on the *SSE endpoint itself* (vs. a plain network drop) needs verification at implementation time — PITFALLS and STACK both flag this as unresolved without inspecting the actual `fetchEventSource` `onopen` failure signal for this case.
- **Phase 2 (cache re-scoping):** the branchId-keying vs. `resetQueries()` choice should be explicitly decided and documented before implementation starts — the four researchers disagree on which is primary, and phase planning should resolve it, not leave both as live options in code.

Phases with standard patterns (skip research-phase):
- **Phase 1 (state + seeding):** directly mirrors the existing `authUser` pattern already proven in this codebase.
- **Phase 3 (SSE reconnect):** a one-line dependency-array addition to an existing, well-understood hook.
- **Phase 4 (switcher UI):** reuses the existing dropdown/outside-click pattern already implemented for the sidebar's user menu.
- **Phase 6 (RO/EN relocation):** cosmetic, no new patterns.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Verified directly against the installed `node_modules/@charlyk/admin-client/dist/index.d.ts` (v1.1.67) and this repo's own source; zero web research needed for the SDK surface |
| Features | HIGH | Primary source is the SiteCare API's own PRD for this exact integration, cross-checked against shipped code (`shell.jsx`, `store.js`, `use-sse.js`, etc.) |
| Architecture | HIGH | Grounded directly in `app.jsx`, `store.js`, `auth.jsx`, `use-sse.js`, all 7 data hooks, the installed SDK types, and the PRD |
| Pitfalls | HIGH | Every claim traced to shipped code, the installed SDK types, or a direct logical consequence of them; two explicit PRD-vs-installed-SDK divergences called out and resolved in favor of the installed types |

**Overall confidence:** HIGH

### Gaps to Address

- **branchId-keying vs. `resetQueries()`:** the four research files present two mechanisms for cache re-scoping that are complementary but not identical in race-safety and long-term robustness (see reconciliation above). Roadmapper/phase planner must pick one explicitly for Phase 2 rather than let it stay ambiguous.
- **SSE-specific 403 signal shape:** whether `fetchEventSource`'s `onopen` surfaces a distinguishable branch-resolution 403 (vs. a generic non-2xx) is unverified from documentation alone — flagged as a build-time verification item for Phase 5, not resolvable now.
- **Session/branch-list mismatch reconciliation:** `AccessibleBranch` (from `client.me.branches.list()`) has no `isCurrent`/`selected` flag per the PRD's data dictionary — confirm at implementation time whether the installed SDK's actual response shape ever requires reconciling it against `getMe().selectedBranch`, or whether trusting `getMe()` alone for "current" is sufficient throughout (current research strongly suggests the latter).
- **Print-snapshot fix for Pitfall 7:** whether the order/receipt payload already carries enough branch identity to make a print-time re-read moot is a quick check to make during the switch-flow phase's discussion step, not resolved by this research.

## Sources

### Primary (HIGH confidence)
- `node_modules/@charlyk/admin-client/dist/index.d.ts` (installed v1.1.67) — read directly for `AccessibleBranch`, `SelectedBranch`, `CurrentUser.selectedBranch`, `SwitchBranchResponse`, `client.me.branches.{list,switch}`, `client.auth.getMe()` signatures
- This repo's own source, read directly: `src/app.jsx`, `store.js`, `auth.jsx`, `shell.jsx`, `use-sse.js`, `data.jsx`, `use-orders.js`, `use-order-detail.js`, `use-menu.js`, `use-history-orders.js`, `use-stats.js`, `use-restaurant-settings.js`, `use-delivery-areas.js`, `use-order-actions.js`, `main.jsx`, `screen-pos.jsx`, `screen-settings.jsx`
- `~/Developer/sitecare-orders-api/docs/RESTAURANT_DASHBOARD_PRD.md` §4–7, §11, §15–16, §18 — the API's own PRD for this exact integration; two explicit divergences from the installed SDK noted and resolved in favor of the installed types
- `.planning/PROJECT.md` (Current Milestone: v1.2 section, Key Decisions table) — project's own source of truth

### Secondary (MEDIUM confidence)
- [QueryClient | TanStack Query v5 Docs](https://tanstack.com/query/v5/docs/reference/QueryClient) — confirmed `resetQueries`/`invalidateQueries`/`removeQueries` semantics
- [Query Invalidation | TanStack Query v5 React Docs](https://tanstack.com/query/v5/docs/framework/react/guides/query-invalidation) — confirmed v5 partial key-matching semantics

---
*Research completed: 2026-07-21*
*Ready for roadmap: yes*
