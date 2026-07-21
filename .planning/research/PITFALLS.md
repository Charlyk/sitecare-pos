# Pitfalls Research

**Domain:** Adding server-side-scoped branch switching to a shipped Tauri/React POS app with live SSE and TanStack Query
**Researched:** 2026-07-21
**Confidence:** HIGH — grounded directly in this repo's source (`src/app.jsx`, `src/use-sse.js`, `src/store.js`, `src/auth.jsx`, `src/use-orders.js`, `src/use-order-detail.js`, `src/use-order-actions.js`, `src/use-stats.js`, `src/use-restaurant-settings.js`, `src/use-delivery-areas.js`), the installed `@charlyk/admin-client@1.1.67` type definitions (`node_modules/@charlyk/admin-client/dist/index.d.ts`, `index.mjs`), and `~/Developer/sitecare-orders-api/docs/RESTAURANT_DASHBOARD_PRD.md` §5/§7/§11. No web sources were needed — every claim below is either read directly from shipped code/types in this workspace or is a direct logical consequence of them. Two places where the PRD and the *actually installed* SDK disagree are called out explicitly (see Pitfall 9).

> **Superseded note:** This file previously held v1.1 Orders History pitfalls (dated 2026-05-27). That milestone shipped 2026-07-19; those findings are preserved in `.planning/milestones/v1.1-REQUIREMENTS.md` and phase VERIFICATION docs. This file now covers the active v1.2 Branch Switching milestone.

## Critical Pitfalls

### Pitfall 1: SSE never reconnects because `useSSE`'s effect has no branch dependency

**What goes wrong:**
`src/use-sse.js`'s single `useEffect` only re-runs when `[token, queryClient]` change (line 123: `}, [token, queryClient]);`). A branch switch does not rotate the auth token — `switchMyBranch` mutates server-side session state (`user.selected_branch_id`), not the bearer token. So after a successful switch, the effect **does not re-run at all**: the existing `AbortController`/`fetchEventSource` call stays exactly as it was. The server, per the PRD (§5.3, §11), unilaterally **closes** that open SSE connection when the switch happens. On the client, this surfaces as a dropped connection → `fetchEventSource`'s own internal `onerror` retry logic kicks in on its own timetable (exponential backoff, not immediate) and reconnects to the *same URL* — which the server will now correctly re-scope to the new branch (branch is resolved fresh per-request, not baked into the URL). Between the switch succeeding and that internal retry actually reconnecting, the KDS/order list either goes silently dead (`isConnected` flips false, `isOffline` banner shows) or, worse, appears to keep working but is receiving nothing — no crash, no error toast, just silence. Staff have no way to tell "stream is catching up" from "stream is broken."

**Why it happens:**
The effect's dependency array was designed for the single-branch, single-token world (Phase 3, v1.0) where the only thing that ever invalidated a live connection was a token rotation. Branch switching introduces a second, independent trigger for "this connection is no longer valid" that the effect was never taught to watch.

**How to avoid:**
Add the current `branchId` to `useSSE`'s effect dependency array (mirroring how `token` already triggers a full teardown/reconnect) so a switch **forces** `ctrl.abort()` + a fresh `fetchEventSource(...)` call immediately, rather than waiting on the library's own backoff. Concretely: `useSSE(token, branchId, onLiveOrder)`, effect deps `[token, branchId, queryClient]`. Do this reconnect only *after* `switchMyBranch` resolves successfully (see Pitfall 4) — never speculatively.

**Warning signs:**
- KDS/orders screen stops receiving live updates right after a branch switch, but no error toast appears.
- `isConnected` stays `true` (stale) because the old connection hasn't errored yet at the moment of switch — a false "connected" state showing the wrong branch's stream.
- Manual test: switch branch, then advance an order from a second client/session on the new branch — the switched-to client doesn't see it appear until several seconds later (backoff delay), not immediately.

**Phase to address:**
The `useSSE` reconnect-on-branch-switch phase (SSE integration work) — must land together with the switch-flow phase, not as a follow-up; a switch UI without a forced reconnect actively produces the "silently shows the wrong branch" failure mode this milestone exists to prevent.

---

### Pitfall 2: `snapshotDone` sound-burst on reconnect — worse after a branch switch than on a normal drop

**What goes wrong:**
`snapshotDone.current = false;` (use-sse.js line 32) is set exactly once per **effect execution**, not once per **connection attempt**. `onopen` (line 41-49) only *reads* `snapshotDone.current` via a 100ms `setTimeout` — it never resets it. Today (single-branch, token-keyed reconnects only) this is mostly harmless: token rotations are rare and a resulting full snapshot replay is expected. But once branch switching lands and Pitfall 1's fix makes `branchId` a dependency, every switch will (correctly) tear down and recreate the effect — which *does* reset `snapshotDone.current = false` before the new `fetchEventSource` call, so a **deliberate, effect-level reconnect** is fine. The danger is the *other* reconnect path: if Pitfall 1 is *not* fixed and the library's own internal `onerror`-triggered retry reconnects **within the same effect execution** (same closure, same `snapshotDone` ref, already `true` from the original connect), the initial snapshot batch the server replays for the *new* branch on that reconnect will be misread as a burst of live `order_new` events — because `snapshotDone.current` is already `true`. Every order already sitting in the new branch's queue at the moment of reconnect fires `onLiveOrderRef.current(order)` → the KDS sound plays once per pre-existing order. This is a distinct bug from Pitfall 1 (which is "nothing happens"); this one is "the wrong reconnect path fires and detonates a sound alarm for orders that aren't new."

**Why it happens:**
`snapshotDone` was designed around the assumption that "reconnect" and "fresh effect mount" are the same event. Branch switching (and any other future closes-the-stream-server-side event, e.g. token rotation racing a switch) breaks that assumption.

**How to avoid:**
Fixing Pitfall 1 (branch-driven effect teardown) closes most of this risk by construction, since the effect's own top-of-body `snapshotDone.current = false` line runs again on every switch. As a backstop, add a regression test asserting that N `order_new` snapshot events arriving within the 100ms window after a branch-switch-triggered reconnect do **not** call `onLiveOrderRef.current` — i.e. verify the effect-teardown path (not the library's internal retry path) is what actually handles a switch, every time.

**Warning signs:**
- KDS sound fires repeatedly (once per order) immediately after switching to a branch with several open orders.
- Existing `src/__tests__/use-sse.test.js` has no case simulating "reconnect mid-effect-lifetime with a fresh snapshot" — its absence is itself a warning sign that this path is unverified today.

**Phase to address:**
Same phase as Pitfall 1 (SSE reconnect-on-switch); write the regression test as part of that phase's test suite, not deferred.

---

### Pitfall 3: Cache bleed — none of the six existing query hooks are branch-scoped

**What goes wrong:**
Every server-state hook in this app keys its cache on a **branch-agnostic** query key: `['orders']` / `['orders', status]` (`use-orders.js`), `['order', id]` (`use-order-detail.js`), `['stats']` (`use-stats.js`), `['restaurant-settings']` (`use-restaurant-settings.js`), `['delivery-areas']` (`use-delivery-areas.js`). `useOrderActions`'s mutations (`use-order-actions.js`) invalidate exactly those same unscoped keys (`['orders']`, `['order']`, `['stats']`) on success. None of this is wrong *today* because there is only ever one branch. The moment branch switching ships, `staleTime: 30_000` on `useOrders`/`useStats` (and `5 * 60 * 1000` on settings/delivery-areas) means: if a switch doesn't explicitly force a refetch, the previous branch's orders/stats/settings/delivery-areas will keep rendering, untouched, for up to 30s–5min after the switch — a textbook "silently shows the wrong branch's data" failure, and the worst kind because it looks completely normal (real orders, real totals, just from the wrong branch).

**Why it happens:**
These hooks were built for a single-branch world where "the selected branch" was not a variable. TanStack Query has no way to know a cache entry is now stale unless its key changes or something explicitly invalidates it.

**How to avoid:**
Two viable patterns per the PRD's own recommendation (§5.3, §18 checklist item 2) — pick one and apply it uniformly across all six hooks, not ad hoc per-screen:
1. **Key on `branchId`** — `['orders', branchId]`, `['order', branchId, id]`, `['stats', branchId]`, `['restaurant-settings', branchId]`, `['delivery-areas', branchId]`. Old-branch entries become orphaned but harmless (never queried again); new-branch entries are fetched fresh on first render after switch. This is the more robust pattern (survives race conditions naturally — see Pitfall 4) and is what the PRD explicitly recommends: "key your data-fetching cache... on the current `branchId` and change the key on switch."
2. **`queryClient.resetQueries()` / targeted `removeQueries()` on switch success** — simpler diff, but must be exhaustive (every one of the six keys, plus any future branch-scoped hook) and is easy to silently miss one when a seventh hook is added later (e.g. a future POS-specific query). Keying on `branchId` is safer against exactly this "forgot one" class of regression.

Whichever pattern is chosen, `useOrderActions`'s three `invalidateQueries` calls must be updated in lockstep (they currently target the unscoped keys) — otherwise a status-change mutation after a switch will invalidate the *previous* branch's cache entry, not the current one.

**Warning signs:**
- Orders/stats/settings/delivery-areas still show the pre-switch branch's data for up to the hook's `staleTime` after a successful switch and "switched to X" toast.
- A `git grep "queryKey: \['orders'\]\|queryKey: \['order'\]\|queryKey: \['stats'\]\|queryKey: \['restaurant-settings'\]\|queryKey: \['delivery-areas'\]"` after the branch-switch phase lands that still finds branch-agnostic keys.

**Phase to address:**
The cache-scoping phase — should be scoped explicitly as "make all six existing server-state hooks branch-aware," not folded silently into the switcher UI phase, since it touches every data hook in the app and needs its own verification pass (switch branch, confirm every screen's data actually changed, not just the switcher label).

---

### Pitfall 4: Race — refetching before `switchMyBranch` resolves returns the OLD branch's data

**What goes wrong:**
Because branch selection is server-side session state re-validated per request (PRD §5.2), *any* request that departs before the `POST /v1/me/branches/switch` response lands is still scoped to the **old** branch — including a refetch fired eagerly (e.g., optimistically invalidating `['orders']` the instant the user clicks a branch in the switcher, rather than after `switchMyBranch`'s promise resolves). If the UI invalidates/refetches before the switch call's response is observed, the refetch races the switch on the server and can return **stale old-branch data that gets written into the "new branch" cache slot**, especially if using pattern 1 from Pitfall 3 (`['orders', branchId]`) — a refetch fired against the new `branchId` key but landing on the server *before* the switch has taken effect will return old-branch orders, permanently mislabeled under the new branch's key until the next natural refetch.

**Why it happens:**
The natural instinct when building a "snappy" switcher is to invalidate/refetch as soon as the user picks a branch, not after the network round-trip confirms the switch. That instinct is correct for client-side-scoped systems (where the branch travels in the request itself) and actively wrong for this server-side-session-state model.

**How to avoid:**
Sequence strictly: `await client.me.branches.switch({ body: { branchId } })` → confirm `{ ok: true, branchId }` → **only then** update the local "current branch" UI state, invalidate/refetch branch-scoped caches (Pitfall 3), and reconnect SSE (Pitfall 1). Never invalidate/refetch/reconnect optimistically on click. This also means the switcher button should show a pending/spinner state between click and the awaited response, not flip instantly.

**Warning signs:**
- Intermittent (not always-reproducible) wrong-branch data right after switching — a hallmark of a race rather than a straightforward missing-invalidation bug (Pitfall 3 reproduces every time; this one is timing-dependent).
- Code review finds `onClick={() => { switchMutation.mutate(...); queryClient.invalidateQueries(...); }}` where the invalidate is not inside `switchMutation`'s `onSuccess`.

**Phase to address:**
Switch-flow phase (the mutation wiring itself) — the switch handler's implementation is exactly where this must be enforced; write it as a single `useMutation` whose `mutationFn` awaits the switch call and whose `onSuccess` (not a sibling effect) does the branch-state update + cache invalidation + SSE-reconnect trigger, in that order.

---

### Pitfall 5: Optimistic branch UI on a rejected switch (403) lies to the operator

**What goes wrong:**
A rejected switch (`403 BRANCH_INACTIVE` or `403 BRANCH_ACCESS_REVOKED`) changes **nothing** server-side — `user.selected_branch_id` stays exactly as it was (PRD §5.3: "A rejected switch... changes nothing server-side — the previously selected branch is untouched"). If the switcher UI updates its displayed "current branch" label the moment the user clicks (before the network response), a 403 leaves the UI showing branch B while every subsequent request the app makes is still actually scoped to branch A. Staff would see branch B's name in the sidebar footer while accepting/advancing orders that are silently operating on branch A's data — an even worse variant of Pitfall 4 because it's not a transient race, it's a **persistent, wrong, confidently-displayed label** until the next reload.

**Why it happens:**
Same root cause as Pitfall 4 — treating the switch as an optimistic client-side toggle instead of a server-confirmed state change.

**How to avoid:**
The switcher's displayed "current branch" must be derived *only* from confirmed server state: either the last successful `switchMyBranch` response, or the branch data seeded on launch (Pitfall 9). Never a locally-set "the user clicked this" value. On a 403, keep the UI on the old branch, surface the error via toast, and (per PRD §7.3 / the milestone's own spec) route straight into the "reopen switcher + refetch `client.me.branches.list()`" flow rather than a generic error toast — the stale/revoked branch may no longer even be in the refreshed list.

**Warning signs:**
- Switcher shows branch B; Orders/KDS screens show orders that don't match branch B's expected volume/menu — a discrepancy only visible by cross-referencing another client.
- No `onError` handler on the switch mutation that reverts UI branch state.

**Phase to address:**
Switch-flow phase, alongside Pitfall 4 — these two are two sides of the same "only trust the server's confirmation" discipline and should be verified together (test both the success path and a mocked 403 path).

---

### Pitfall 6: A 403 on a *later, ordinary* request isn't routed anywhere special

**What goes wrong:**
Per PRD §5.2, branch access is re-validated on **every** request, not just switch. If a branch is deactivated or the staff member's access is revoked mid-session (by an owner/superadmin, possibly from a different device entirely — see Pitfall 8), the *next* ordinary call this POS app makes — an orders refetch, an SSE reconnect, a status-update mutation, a POS order create — will 403 with `BRANCH_INACTIVE` or `BRANCH_ACCESS_REVOKED`. None of this app's current data hooks (`use-orders.js`, `use-order-detail.js`, `use-order-actions.js`, `use-stats.js`, `use-restaurant-settings.js`, `use-delivery-areas.js`) inspect the error body beyond `result.error.error ?? 'Failed...'` — they all throw a generic `Error`, which TanStack Query surfaces as a generic `isError` state, rendered (if at all) as this app's existing offline/error UI. A revoked-access 403 would be silently indistinguishable from "network is down," and the operator would keep trying to work against a branch they no longer have access to with no path back to a working state short of restarting the app.

**Why it happens:**
The existing error-handling convention in this codebase (see PROJECT.md D-08: "Generic detail error copy, no HTTP-status branching") was a deliberate v1.1 simplification appropriate when the only 401/404 cases were "session expired" (already centrally handled) or "order not found." Branch-access 403s are a new error class this convention was never designed to carry.

**How to avoid:**
Add a single, central place — not per-hook — that inspects every SDK call's error for the three branch codes (`BRANCH_INACTIVE`, `BRANCH_ACCESS_REVOKED`, `NO_BRANCH_ACCESS`) and, on match, short-circuits to: toast + force-reopen the branch switcher + refetch `client.me.branches.list()` (mirroring the switch-time 403 handling in Pitfall 5, since it's the same recovery flow). The cleanest integration point given this app's existing architecture is a thin wrapper around the SDK client (or a TanStack Query global `onError`/`QueryCache`/`MutationCache` handler, since v5 supports cache-level error callbacks) rather than editing all six hooks' `catch` blocks individually — that keeps the "route branch errors to the switcher" rule in exactly one place, auditable the same way D-08's "no HTTP-status branching" rule was.

**Warning signs:**
- A staff member reports "the app just stopped working" with no clear repro, around the same time an owner deactivated a branch or revoked their access from the dashboard.
- Code review finds branch-error handling duplicated across multiple hooks instead of centralized — a sign the next new hook will forget it.

**Phase to address:**
Should be its own phase (or a clearly-scoped plan within the switch-flow phase) since it is orthogonal to the happy-path switch UI and easy to skip if not explicitly planned — the PRD explicitly calls this "ACCS-07: never a silently empty result set," and it is the single pitfall most likely to be silently dropped if not given its own success criterion.

---

### Pitfall 7: In-flight mutations around a switch can land on the wrong branch

**What goes wrong:**
`screen-pos.jsx`'s `createOrder` mutation, `use-order-actions.js`'s `updateStatus`/`updateEstimatedTime`, and `app.jsx`'s `handlePrint` (which reads `restaurantSettings` for the receipt header) are all independent of the switch flow today. If a cashier has a POS cart open, clicks "Ring Up" (`createOrder.mutate(body)`), and a branch switch (triggered from another part of the UI, or — per Pitfall 8 — from another device) completes *during* that request's flight, the order create request itself is unaffected (it was already scoped server-side to whichever branch was active when it was sent — correct, not a bug in isolation). The real risk is the surrounding UI state: if `restaurantSettings` (branch name/address used on the printed receipt) has already been invalidated/refetched to the new branch by the time the *old* request's success handler runs and triggers `handlePrint`, the receipt could be printed with the **new** branch's name/address for an order that was actually created against the **old** branch — a wrong-branch artifact on a physical, unrecoverable printed document.

**Why it happens:**
Mutations and their downstream side effects (printing) don't currently carry an explicit "which branch was this created against" context — they implicitly trust whatever `restaurantSettings`/`orders` happen to be in the cache at the moment they run, which Pitfall 3's fix makes *branch-current* but not necessarily *branch-matching-the-specific-order*.

**How to avoid:**
Two complementary guards: (1) disable branch-agnostic mutating actions (Ring Up, Accept/Advance/Cancel, Reprint) while a switch is pending (between click and the switch mutation's settle), matching the "optimistic UI" discipline from Pitfall 5 — this closes the highest-risk window entirely; (2) for print specifically, snapshot `restaurantSettings` (or better, the order's own branch-scoped fields once available) at order-creation time rather than re-reading the live query cache at print time, so a receipt always reflects the branch the order actually belongs to, not whatever branch happens to be selected when the staff member clicks print.

**Warning signs:**
- A receipt prints with a different branch name/address than the order's actual origin branch — only detectable by comparing the physical receipt against the order record, i.e. likely to surface as a customer/accounting complaint, not a test failure.
- No `disabled` state on Ring Up / Accept / Advance / Cancel / Reprint tied to a "switch in progress" flag.

**Phase to address:**
Switch-flow phase for the disable-during-switch guard (cheap, mechanical); flag the print-snapshot fix as a follow-up if the receipt payload doesn't already carry enough branch identity to make it moot — worth a quick check against `CreateKitchenOrderResponse`/`Order` shape during that phase's discussion step.

---

### Pitfall 8: Selection is global to the user, not per-tab/per-device — this app can be silently re-scoped by another session

**What goes wrong:**
Per PRD §5.3: "The selected branch is global to the user, not per-tab. If the owner switches branch in one tab, other tabs' next requests follow." This POS app is a single desktop client, but the *user* (staff account) may be logged in elsewhere too — another till, a phone, a manager's laptop. If that other session switches branches, this app's *next* request (an SSE reconnect after a drop, a 30s-stale orders refetch, a status mutation) silently starts operating on the new branch **with no local trigger at all** — no click happened in this app, so none of Pitfalls 1–7's "switch flow" guards fire. This is the purest form of "silently shows the wrong branch's data": the operator staring at this screen did nothing, yet the data underneath them changes.

**Why it happens:**
The architectural fact PRD §5.1 leads with — branch is session state, not a per-request parameter — cuts both ways: it's what makes existing endpoints "just work" without header-threading, and it's also what makes the active branch a moving target this specific client doesn't control exclusively.

**How to avoid:**
Cannot be prevented (it's correct, intended cross-device behavior per the domain model) — only surfaced. At minimum: (a) make the current branch name/badge prominent and always-visible in the sidebar footer (already planned per PROJECT.md's v1.2 scope) so a silent re-scope is at least *visible* on next glance; (b) treat every 403/data-shape surprise from Pitfall 6 as potentially originating from an out-of-band switch, not just a revoked-access event — the recovery flow (reopen switcher, refetch branch list) is the same either way; (c) consider periodically re-validating the selected branch (e.g., on window focus, mirroring the PRD's own "refetch branch list on focus" recommendation in §7.3) rather than only reacting to errors, since a same-branch-still-accessible-but-now-different-branch-selected switch produces no error at all — it produces a silent, correct-per-the-server data change this client never asked for.

**Warning signs:**
- Orders/KDS data changes on screen with no user-initiated switch action logged.
- Support report: "the branch changed by itself."

**Phase to address:**
Document as an accepted, inherent characteristic of the server-side session model in the switch-flow phase's design notes (not a bug to "fix"); the window-focus revalidation is a candidate for the same phase's success criteria if product wants proactive detection rather than purely reactive (error-triggered) recovery.

---

### Pitfall 9: Launch seed — this app currently fetches NO user/branch info on cold start, and the PRD's guidance about `getMe()` is stale relative to the installed SDK

**What goes wrong (two compounding issues):**

1. **Cold start never calls `getSession()` or `getMe()` at all.** `src/auth.jsx`'s cold-start effect (lines 106-128) reads the persisted token from `plugin-store` and, if present, sets `isAuthenticated: true` immediately — "Trust the stored token... The token is assumed valid until an API call returns 401" (comment on line 104-105). `authUser` is only ever populated inside `signIn()` (line 147, from the sign-in response's `user` field) — **never** on a restored cold-start session. So on every app relaunch with a remembered session (the common case for a POS till that stays logged in), there is currently **zero** source of "who is this / what branch are they on" until *something* explicitly fetches it. The v1.2 milestone's stated plan ("Load the current selected branch on launch from the session (`user.selectedBranch`)") has no hook to attach to today — that data is never fetched on cold start.

2. **The PRD's warning about `getMe()` is contradicted by the actually-installed SDK.** PRD §4 states: *"`getMe()` does not return `role`, `restaurantId`, `allBranches`, or `selectedBranchId`. Read `role` from the sign-in / `getSession()` user object..."* — but the SDK actually installed in this repo, `@charlyk/admin-client@1.1.67`, defines `client.auth.getMe()` (→ `GET /v1/profile/me`) as returning `CurrentUser`, whose type (verified directly in `node_modules/@charlyk/admin-client/dist/index.d.ts`) is:
   ```ts
   type CurrentUser = {
     id: string; firstName: string | null; lastName: string | null;
     email: string; image: string | null;
     role: string | null;
     selectedBranch: SelectedBranch;  // { id, name, slug, isDefault, isActive } | null
   };
   ```
   That is, the installed SDK's `getMe()` **already includes both `role` and `selectedBranch`** — the exact two fields the PRD says it lacks. The PRD (dated 2026-07-18, same day as the v2.6 API ship) appears to document an earlier or different-consumer state of the API/SDK than what actually shipped in this app's pinned dependency. Building the launch-seed logic around the PRD's literal guidance (e.g., adding an extra `getSession()` round-trip specifically to recover `selectedBranch`, or wiring up branch display around `client.me.branches.list()` alone without ever calling `getMe()`) would be unnecessary complexity at best and, at worst, a wrong assumption baked into a phase plan.

**Why it happens:**
(1) is an artifact of `readToken()`'s trust-the-token design being written before there was any per-session data worth fetching beyond the token itself (Phase 2, pre-branching). (2) is an artifact of documentation (the PRD) and the shipped SDK drifting — the PRD is dated the same day as the API's v2.6 ship, but this repo's SDK pin (`1.1.67`) evidently already carries the fix the PRD's own §19 "SDK gaps" section describes as still-needed for a *different* consuming app (the owner dashboard). Trusting a doc's prose over the actually-installed types is the mistake to avoid here.

**How to avoid:**
- Add an explicit `client.auth.getMe()` call to the cold-start restore path (`auth.jsx`'s cold-start effect) so `authUser` — including `role` and `selectedBranch` — is populated on every launch with a remembered session, not only after an interactive sign-in. This directly enables the "load current branch from session on launch" requirement.
- Treat `CurrentUser.selectedBranch` (from `getMe()`) as the authoritative launch-time seed for "which branch am I on," and `client.me.branches.list()` as the authoritative source for "which branches can I switch to" — these are two different calls for two different purposes (PRD §7.2 confirms `getMyBranches` is the switcher's data source; `getMe()`/`CurrentUser.selectedBranch` is what tells you which one is *currently* active).
- Before wiring any branch logic against a PRD claim about SDK shape, cross-check `node_modules/@charlyk/admin-client/dist/index.d.ts` directly — the PRD is a useful map of the domain model and error codes, but not a substitute for the pinned SDK's actual types when they disagree.
- Handle `selectedBranch: null` (a valid `CurrentUser` shape per the type) — a user with no branch access at all (`403 NO_BRANCH_ACCESS` territory per PRD §5.2/§16) will have a null `selectedBranch`; the launch path must not assume it's always populated.

**Warning signs:**
- After a cold restart (not a fresh sign-in), the branch switcher shows no current branch, or crashes/renders blank, because `authUser` is still `null` from the unmodified cold-start path.
- A phase plan or implementation adds a redundant `getSession()` call purely to fetch branch/role data that `getMe()` already returns, based on a literal reading of the PRD rather than the installed types.

**Phase to address:**
Foundation-of-the-milestone phase (the one that first threads branch state through the app) — this is a launch-time correctness issue, must be resolved before the switcher UI phase can be meaningfully built, and should be flagged explicitly in that phase's plan as a divergence-from-PRD decision (with the type-definition citation) so it doesn't get "corrected" back to the PRD's stale guidance later.

---

### Pitfall 10: Persisting `branchId` client-side (Zustand) creates a second, driftable source of truth

**What goes wrong:**
`src/store.js`'s `persist` middleware currently writes exactly 6 keys to `preferences.json` (`screen, role, lang, accent, density, sidebarCollapsed` — see `partialize`, lines 120-127) and deliberately excludes session-derived state (`selectedOrder`, `historyOrder`, `authUser`, `isAuthenticated` are all session-only). If the branch-switching implementation follows the path of least resistance and adds `currentBranchId`/`currentBranch` to the *persisted* partialize list (so the switcher shows something instantly on next launch without waiting on a network call), it creates exactly the kind of client-side-cached branch state the PRD's entire domain model (§5) exists to avoid: the server is the sole source of truth for the selected branch, re-validated every request, and a persisted local copy can drift the moment another session switches branches (Pitfall 8) or access is revoked (Pitfall 6) — the stale local value would then flash on next launch before the real `getMe()`/`me.branches.list()` calls correct it, and worse, an implementation might be tempted to *reuse* that persisted value as a query key or gate before those calls resolve.

**Why it happens:**
It mirrors an existing, correct pattern in this exact file (`screen`, `role`, `lang`, etc. are all legitimately local-only preferences that should survive restart) — it's an easy, precedent-following mistake to lump branch selection in with them, since the code shape (`add a key, add it to partialize`) is identical even though the semantics are opposite (branch selection is *not* a local preference, it's a cached copy of remote state).

**How to avoid:**
Keep `currentBranch`/`branchId` (and the fetched `branches` list) as **session-only** Zustand state — same treatment as `authUser`/`isAuthenticated`/`selectedOrder` — explicitly excluded from `partialize`, exactly as this file's own header comment already documents the rule ("Persisted keys (6)... Session-only keys (3): reset to defaults on every cold start"). Re-seed it from `getMe()` on every cold start (Pitfall 9) instead of trusting a disk-cached value. If instant-paint-on-launch is a real product requirement, it's acceptable to *render* a last-known label optimistically while the real fetch is in flight, but it must never be used to *scope a query key or gate a mutation* before the authoritative fetch resolves.

**Warning signs:**
- A branch name flashes briefly on launch, then changes to a different one once `getMe()`/`me.branches.list()` resolve — a visible symptom of exactly this drift.
- `currentBranchId` (or similar) appears in `store.js`'s `partialize` return object during code review.

**Phase to address:**
Foundation-of-the-milestone phase (same as Pitfall 9) — this is a one-line decision (`partialize` inclusion) that's easy to get right if flagged explicitly and easy to get wrong silently otherwise.

---

### Pitfall 11: Breaking single-branch tenants while building for multi-branch ones

**What goes wrong:**
Per PRD §7.3/§18: "If the list has one entry, render it read-only (single-branch tenant behaves exactly as before v2.6)." Two ways this regresses even when the intent is respected: (a) the switcher still fires an extra `client.me.branches.list()` network call, an extra render, and extra layout for tenants that will only ever see one entry — acceptable if cheap and cached, but worth a conscious call, not an accident; (b) more seriously, if Pitfall 3's cache-scoping change (`['orders', branchId]` etc.) is implemented naively — e.g., gating the initial fetch on `branchId` being resolved from `getMe()` first — a single-branch tenant's orders screen could show a loading/blank state on every launch waiting for a branch-resolution round-trip that, for them, changes nothing about which data they'll ultimately see. Pre-v1.2, `useOrders()` etc. fire immediately once `client` exists (`enabled: !!client`); post-v1.2 they must not regress to `enabled: !!client && !!branchId` in a way that meaningfully delays first paint for the common (single-branch) case.

**Why it happens:**
Building "branch-aware" naturally makes every query's `enabled` condition grow a new clause; it's easy to make that clause block on a full round-trip (`getMe()`) rather than on data that's already available synchronously (the `branchId` isn't actually needed in the request at all — see PRD §5.1, "no `branchId` query param" — it's only needed as a *cache key*, and a cache key can default to a sentinel like `'current'` and be corrected on next fetch rather than blocking the first one).

**How to avoid:**
Keep the existing `enabled: !!client` gating as the primary gate for all six hooks — do not add a hard `!!branchId` blocking condition. Since the server resolves the branch itself per §5.1 (no client-supplied branch param on any of these endpoints), the *request* never needs a resolved `branchId` to fire correctly; only the *cache key* benefits from one, and it's safe to key on a placeholder (e.g., `['orders', branchId ?? 'pending']`) that gets superseded once `getMe()` resolves, rather than delaying the fetch itself. Explicitly test the single-branch-tenant path (a fixture/mock returning a one-entry `AccessibleBranch[]`) alongside the multi-branch path in every phase touching this milestone — the PRD's own acceptance checklist (§18) lists this as a first-class item, not an edge case.

**Warning signs:**
- First paint of the Orders screen after launch takes visibly longer than pre-v1.2 for a single-branch test tenant.
- The switcher renders (even read-only) before `getMe()`/`me.branches.list()` resolve, showing a loading spinner where v1.1 showed nothing.

**Phase to address:**
Verification checklist item across every phase in this milestone, not a single phase — explicitly re-test the pre-v1.2 single-branch flow (login → orders load → KDS live updates → POS submit) end-to-end once the switcher lands, using a tenant/mock that returns exactly one `AccessibleBranch`.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|-----------------|------------------|
| `queryClient.resetQueries()` (nuke-everything) on switch instead of branch-keyed cache keys | Smaller diff than rekeying six hooks | A future 7th hook silently forgotten breaks Pitfall 3's guarantee; also refetches things that don't need to change (e.g., i18n/UI-only queries if any exist later) | Acceptable only as an interim step with a follow-up ticket to migrate to branch-keyed keys before the milestone closes — not acceptable as the permanent design given this app already has 6+ server-state hooks |
| Reactive-only branch-error handling (no window-focus revalidation, per Pitfall 8) | Less code, no extra polling | Out-of-band switches (another device) go undetected until the next natural request happens to 403 or return surprising data | Acceptable for v1.2 MVP if explicitly documented as a known limitation (matches this project's pattern of documenting known behavior rather than silently accepting risk, e.g. D-14 in PROJECT.md) |
| Snapshotting `restaurantSettings` at print time instead of at order-creation time (Pitfall 7) | No change needed if current branch and print branch are (in practice) always the same for this desktop-till usage pattern | A genuine wrong-branch-on-receipt bug in the rare in-flight-switch-during-checkout window | Acceptable to defer if the switch-in-progress mutation-disable guard (Pitfall 7) is implemented, since that closes the realistic window entirely |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|-----------------|--------------------|
| `client.me.branches.switch(...)` | Assuming the wrapper takes `{ branchId }` directly (matching the PRD's `switchMyBranch({ client, body: { branchId } })` raw-generated-function example in §6.2) | The installed SDK's facade wraps it as `switch: (data) => switchMyBranch({ ...data, client: client2 })` — call it as `client.me.branches.switch({ body: { branchId } })`, matching this app's existing SDK call convention (e.g. `client.kitchen.orders.updateStatus({ path: { id }, body: {...} })`), not the PRD's raw-function example syntax |
| `client.auth.getMe()` vs `client.auth.getSession()` for launch-time branch seed | Reaching for `getSession()` because the PRD says `getMe()` lacks branch/role data | Use `getMe()` — confirmed by the installed SDK's `CurrentUser` type to include both `role` and `selectedBranch` (see Pitfall 9); reserve `getSession()` for what this app already uses it for (token/expiry, refresh scheduling in `auth.jsx`) |
| `@microsoft/fetch-event-source` reconnect semantics | Assuming aborting the controller and letting the library's `onerror` retry handle a branch switch is sufficient | The library's own retry uses backoff timing tuned for network blips, not an instant "the server just told you to reconnect" event; a branch switch should trigger an explicit, immediate teardown+recreate (Pitfall 1), not rely on passive retry |
| `AccessibleBranch[]` from `client.me.branches.list()` | Caching this list indefinitely (it's "just branch names, rarely changes") | PRD §7.3 explicitly: "Do not cache the branch list indefinitely — access can be revoked; refetch on focus/after errors" — treat it like any other short-`staleTime` query, refetched on the same triggers as Pitfall 6's error-recovery flow |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|-----------------|
| Blocking first paint on `getMe()`/`me.branches.list()` before firing existing data queries (Pitfall 11) | Orders screen shows a longer blank/loading window after launch than pre-v1.2, even for single-branch tenants | Keep `enabled: !!client` as the sole gate on existing hooks; branch resolution only affects cache-key shape, not fetch timing | Immediately noticeable even at n=1 branch — this isn't a scale issue, it's a correctness-of-gating issue that happens to look like a performance regression |
| Re-fetching the branch list on every render/focus without any staleness window at all | Excess network chatter on a desktop till that's rarely backgrounded but frequently refocused (window switches) | A short `staleTime` (e.g. 30-60s) on the branch-list query, refetch-on-focus/on-error as the PRD recommends, not refetch-on-every-focus-event unconditionally | Noticeable once staff routinely alt-tab between this app and, say, a delivery-platform tablet app, generating focus events every few seconds |

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Trusting a client-persisted `branchId` as authoritative for anything beyond display (Pitfall 10) | A stale/tampered local value could be used to mis-scope a print job, a cache key, or a UI gate even though the server would still correctly reject/re-scope the actual request | Treat persisted UI state as display-only; every actual data operation already goes through the server's own re-validated `selected_branch_id` (PRD §5.2) regardless of what the client thinks — don't let client state *appear* authoritative even though it can't actually bypass server enforcement |
| Surfacing raw SDK error strings from `BRANCH_*` 403s directly in toasts | Could leak internal error-code vocabulary to end users, and inconsistent with this app's existing D-08 decision ("Generic detail error copy, no HTTP-status branching... raw SDK error strings must not reach the DOM") | Map `BRANCH_INACTIVE`/`BRANCH_ACCESS_REVOKED`/`NO_BRANCH_ACCESS` to the same localized (`i18n.jsx`) toast copy pattern already used elsewhere in this app, not the raw `error.error` string |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-------------------|
| Silent SSE gap after switch (Pitfall 1) with no "reconnecting..." affordance | Staff believe the KDS is caught up when it's actually stale for several seconds | Surface the existing `isConnected`/`isOffline` signal during the reconnect window explicitly tied to "just switched branches," not only the generic offline banner |
| Generic error toast for `BRANCH_*` 403s (Pitfall 6) | Staff don't know to reopen the switcher; they retry the same action expecting it to eventually work | Route branch-code 403s straight into reopening the switcher (PRD §7.3), not a dismissible generic toast |
| No visual distinction between "default" branch and others in the switcher | Staff at a multi-branch tenant could switch to the wrong location without noticing | Per PRD §7.3/PROJECT.md's own v1.2 scope: show the "default" badge and current-branch name prominently in the sidebar footer at all times, not only inside an opened switcher dropdown |

## "Looks Done But Isn't" Checklist

- [ ] **Switcher UI renders and calls `switch()` successfully:** Often missing the SSE reconnect (Pitfall 1) — verify by watching network/SSE traffic across a switch, not just the toast appearing.
- [ ] **"Switched to X" toast appears:** Often missing the underlying cache invalidation (Pitfall 3) — verify every branch-scoped screen (Orders, KDS, POS, Menu, Settings/printer restaurant name) actually shows different data after switching between two branches with visibly different content.
- [ ] **Single-branch tenant shows read-only switcher:** Often missing the "same load-time as before" check (Pitfall 11) — verify first-paint timing, not just that the switcher is disabled.
- [ ] **403 handling for switch failures:** Often missing the *later-request* 403 path (Pitfall 6) — verify by revoking access mid-session (or mocking a 403 on an ordinary orders refetch) and confirming it also routes to the switcher, not just a failed switch attempt.
- [ ] **Branch shown on launch:** Often missing the cold-start-without-fresh-sign-in path (Pitfall 9) — verify by restarting the app with a remembered session (not a fresh login) and confirming the correct branch appears without requiring an interactive sign-in first.
- [ ] **Reprint after switch:** Often missing the in-flight-order branch-identity guard (Pitfall 7) — verify by creating an order, switching branches, then reprinting from the orders list and confirming the receipt still reflects the order's actual origin branch.

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|-----------------|------------------|
| Stale SSE after switch (P1) | LOW | Add `branchId` to `useSSE`'s effect deps; ship as a follow-up patch if missed at launch — no data corruption, just a lagging live feed until fixed |
| Cache bleed (P3) | LOW–MEDIUM | Rekey the six hooks; no data corruption (server truth is unaffected), just a UI-visible staleness bug fixable in a single follow-up PR |
| Optimistic-UI-on-403 (P5) | LOW | Revert the switcher's branch-label state to be purely response-derived; low blast radius since it's UI-only, server state was never wrong |
| Wrong-branch printed receipt (P7) | HIGH | Cannot be undone once printed (physical document); this is why it's the one pitfall worth a proactive guard (disable mutations during switch) rather than a reactive fix — plan for prevention, not recovery |
| Missing cold-start branch seed (P9) | LOW | Add the `getMe()` call to `auth.jsx`'s cold-start effect; purely additive, no migration needed since no prior behavior depended on `authUser` being null on cold start |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|--------------------|-----------------|
| P1: SSE never reconnects on switch | SSE reconnect-on-switch work (paired with switch-flow phase) | Switch branches with a second live session on the new branch; confirm the update appears within ~1s, not after backoff delay |
| P2: Snapshot-replay sound burst | Same phase as P1 | Regression test: reconnect mid-effect-lifetime must not fire `onLiveOrder` for replayed snapshot events |
| P3: Cache bleed across 6 hooks | Cache-scoping phase (own success criterion, not folded into switcher-UI phase) | `git grep` audit for branch-agnostic query keys after the phase lands; manual switch-and-compare test across Orders/KDS/POS/Menu/Settings |
| P4: Race on switch (refetch before resolve) | Switch-flow phase (mutation wiring) | Code review: invalidate/reconnect only inside `onSuccess`, never adjacent to `.mutate()` |
| P5: Optimistic UI on rejected switch | Switch-flow phase | Mock a 403 switch response; confirm UI stays on old branch and shows the error |
| P6: 403 on later ordinary request | Own phase/plan — central error-routing | Mock a 403 on an ordinary orders refetch (not a switch call); confirm it also opens the switcher |
| P7: In-flight mutations during switch | Switch-flow phase (disable guard) + a flagged follow-up for print-snapshot if needed | Attempt Ring Up / Accept / Reprint while a switch mutation is pending; confirm they're disabled, not silently racing |
| P8: Cross-device drift | Documented as accepted behavior in switch-flow phase design notes; optional focus-revalidation as a stretch success criterion | Switch from a second session; confirm this app's next request/error surfaces the change via existing P6 recovery flow |
| P9: Launch seed missing / PRD-vs-SDK mismatch | Foundation phase (first phase touching branch state) | Restart app with remembered session (no fresh login); confirm branch/role populate without an interactive sign-in |
| P10: Persisted branchId drift | Foundation phase (same as P9) | Code review of `store.js`'s `partialize`; confirm no branch fields present |
| P11: Single-branch regression | Every phase in this milestone (standing verification item) | Re-run the full pre-v1.2 login→orders→KDS→POS flow against a one-branch fixture after each phase |

## Sources

- `src/app.jsx`, `src/use-sse.js`, `src/store.js`, `src/auth.jsx`, `src/use-orders.js`, `src/use-order-detail.js`, `src/use-order-actions.js`, `src/use-stats.js`, `src/use-restaurant-settings.js`, `src/use-delivery-areas.js`, `src/screen-pos.jsx` — this repo, read directly, 2026-07-21.
- `node_modules/@charlyk/admin-client/dist/index.d.ts` and `index.mjs` (installed version `1.1.67`) — read directly for `CurrentUser`, `SelectedBranch`, `AccessibleBranch`, `SwitchMyBranchData`/`Response`, and the `client.me.branches`/`client.auth.getMe` wrapper implementations.
- `~/Developer/sitecare-orders-api/docs/RESTAURANT_DASHBOARD_PRD.md` §4, §5, §6.2–6.3, §7, §11, §16, §18 — the owner-dashboard PRD for the same v2.6 "Tenant Branching" API surface this app consumes; PRD text explicitly noted as diverging from the installed SDK in Pitfall 9.
- `.planning/PROJECT.md` (Current Milestone: v1.2 Branch Switching section, Key Decisions table) and `.planning/STATE.md` (Critical Watch-Outs, hook-ordering and SSE decisions) — this repo, read directly, 2026-07-21.

---
*Pitfalls research for: branch switching in a server-side-scoped, real-time Tauri/React POS app*
*Researched: 2026-07-21*
