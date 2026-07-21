# Feature Research: Branch Switching (v1.2)

**Domain:** Multi-location POS/dashboard — branch/store switcher for a staff-facing (cashier/kitchen) desktop app
**Researched:** 2026-07-21
**Confidence:** HIGH (primary source is the SiteCare API's own PRD for this exact feature — §5, §7, §11, §16 of `RESTAURANT_DASHBOARD_PRD.md` — cross-checked against the already-shipped codebase: `src/shell.jsx`, `src/screen-settings.jsx`, `src/store.js`, `src/use-sse.js`, and every existing TanStack Query hook. No external ecosystem survey was needed — the backend contract is fixed and documented for this integration, not a generic "how do other POS systems do it" question.)

> Supersedes the v1.1 Orders History feature research previously in this file (archived below under "Prior Milestone Reference" for continuity — the v1.1 History screen itself remains shipped and unaffected by v1.2).

## Scope Note

This app is **staff-facing** (cashier/kitchen roles), not the owner dashboard. Everything in §13 of the PRD (branch creation, staff↔branch assignment, per-branch Stripe onboarding, cross-branch analytics) is **owner-only and out of scope**. `GET /v1/me/branches` and `POST /v1/me/branches/switch` are explicitly "available to every role (not owner-gated)" (PRD §7.2), which is what makes this feature legal for the staff app at all.

---

## Feature Landscape

### 1. Switcher UI (placement, current-branch display, default badge, single-branch read-only)

| Feature | Category | Why | Complexity | Notes / Dependencies |
|---|---|---|---|---|
| Persistent switcher in sidebar footer, replacing the RO/EN pill | Table stakes | PRD §7.3: "a persistent branch selector in the app chrome... showing the current branch name." User decision: it physically replaces `src/shell.jsx` lines ~136-147 (the RO/EN `<div style={{display:'flex', background:'#f3ecd9'...}}>` block). | LOW | Direct edit to `shell.jsx`. The RO/EN control doesn't disappear — it already exists redundantly in `screen-settings.jsx` (`display_lang_label`, `storeLang`/`setLang` via `useAppStore`), so this is a straight removal, not a new build. |
| Shows current branch name | Table stakes | Staff must always know which branch's orders/menu they're looking at — this is the entire point of the feature (PRD: "get it wrong and every screen silently shows the wrong branch's data"). | LOW | New `currentBranchName` derived from the branch list entry matching the active `branchId`, or from the session/profile call on cold start (see §5 below). |
| "Default" badge on the default branch | Table stakes | PRD §7.3 explicit requirement; `AccessibleBranch.isDefault` is already on the wire. | LOW | Pure rendering — `branch.isDefault` boolean from `client.me.branches()`. |
| Single-branch tenant renders read-only (no dropdown affordance) | Table stakes | PRD §7.3: "If the list has one entry, render it read-only (single-branch tenant behaves exactly as before v2.6)." Backward compatibility guarantee — most SiteCare tenants today are single-branch. | LOW | `branches.length === 1` → render a static label with no chevron/click target, not a disabled-looking dropdown (disabled-but-visible reads as broken, not as "nothing to switch"). |
| Dropdown/popover pattern (open on click, closes on outside click or Escape) | Table stakes | Standard interaction; the sidebar already has this exact pattern for the user menu (`userMenuOpen`/`userMenuRef` in `shell.jsx` lines 17-29, 148-179) — reuse it. | LOW | Reuse the existing outside-click-to-close `useEffect` + ref pattern verbatim; don't invent a new one. |
| Collapsed-sidebar affordance (icon-only, tooltip with branch name) | Table stakes | The sidebar already supports a `sidebarCollapsed` state that changes every other nav element to icon+tooltip (`title={sidebarCollapsed ? ... : ''}`). The switcher must follow the same rule or it will look broken when collapsed. | LOW | Mirror the existing collapsed-mode conditional rendering already used for nav items and the user chip in `shell.jsx`. |
| Branch icon per entry, list sorted `(name, id)` | Differentiator | PRD confirms server already sorts `(name, id)` — no client sort needed. A small storefront/location icon per row is a nice-to-have consistent with the rest of the sidebar's icon language (`Icon` component). | LOW | Purely visual; check `icons.jsx` for a suitable existing icon (e.g. `storefront`, already used for the role pill) before adding a new one. |
| Inactive-branch visual distinction inside the list | Differentiator | Mostly moot for staff — `getMyBranches` already filters to accessible/active branches — but cheap defensive polish if the list ever includes a soon-to-deactivate branch mid-transition. | LOW | Skip unless product asks; the list endpoint already does the filtering server-side. |
| Search/filter box inside the switcher for tenants with many branches | Anti-feature | SiteCare restaurant tenants are small chains (a handful of locations), not hundreds. A search box adds UI complexity for a list that will almost always be short. | Instead: a plain scrollable list is sufficient; revisit only if a tenant reports >15 branches. |
| Branch logo/photo per entry (rich media) | Anti-feature | `AccessibleBranch` has no image field — would require a new API surface and asset pipeline for zero staff-workflow value. | Instead: name + default badge is enough to disambiguate; branches are named distinctly by the owner. |
| Recently-switched / "last used branch" quick-access shortcut | Anti-feature | Adds local-storage state for a workflow (multi-branch staff switching frequently) that doesn't exist yet for this app — v1.2 explicitly excludes staff-assignment-driven multi-branch workflows; most staff will have 1 branch or rarely switch. | Instead: plain alphabetical list; add only if usage data later shows staff switching branches multiple times per shift. |

### 2. Loading branches (`client.me.branches()`)

| Feature | Category | Why | Complexity | Notes / Dependencies |
|---|---|---|---|---|
| Fetch branch list via `client.me.branches()` (`GET /v1/me/branches`) as a TanStack Query hook (e.g. `use-branches.js`) | Table stakes | Matches the existing hook pattern in this codebase exactly — every other data source (`use-menu.js`, `use-stats.js`, `use-restaurant-settings.js`, `use-history-orders.js`) is a small dedicated hook wrapping one `useQuery`. | LOW | New file `src/use-branches.js`, `queryKey: ['branches']` (not itself branch-scoped — it's the *list of* branches available to this user, independent of which one is currently selected). |
| Refetch on window focus + after a branch-related error (do not cache indefinitely) | Table stakes | PRD §7.3 explicit: "Do not cache the branch list indefinitely — access can be revoked; refetch on focus/after errors." | LOW | TanStack Query default `refetchOnWindowFocus: true` covers the focus case for free; the "after errors" case is satisfied by explicitly calling `queryClient.invalidateQueries({ queryKey: ['branches'] })` inside the 403 handler (§6 below), not by a special stale-time hack. |
| Loading state for the switcher while branches load | Table stakes | Standard UX — the switcher shouldn't render an empty/broken control during the initial fetch, particularly at app launch when it races the session-restore flow. | LOW | Skeleton or simply omit the switcher control until `data` resolves — same pattern already used elsewhere (e.g. `screen-orders.jsx` loading states). |
| Graceful zero/undefined-branches handling (defensive; should not happen for an authenticated staff user per PRD §5.2's fallback chain, but the request can still fail) | Table stakes | If `client.me.branches()` itself errors (network, 401), the switcher must not crash the whole sidebar. | LOW | Standard TanStack Query `isError` guard; on error, render the switcher in its last-known state or hide it, never throw. |
| Long polling / periodic background refresh of the branch list (e.g. every 30s) | Anti-feature | Branch access changes are rare (an owner reassigning staff) and are already caught the moment they matter — on the *next request* any screen makes, via the 403 flow (§6). Polling a list endpoint on a timer adds load and complexity for an event that already self-reports via 403. | Instead: focus-refetch + error-triggered refetch (already table stakes above) is the correct trigger set per PRD §7.3. |
| Client-side caching of the branch list across app restarts (persist to `preferences.json`) | Anti-feature | Access can be revoked while the app is closed; showing a stale branch list on next launch (then discovering on click that a branch is gone) is worse UX than a fresh fetch. Also inconsistent with "do not cache indefinitely." | Instead: session-only TanStack Query cache (default), always refetched fresh per app launch — same treatment as `['orders']`/`['menu']`, which are also not persisted to disk. |

### 3. The switch action (`client.me.branches.switch({branchId})`)

| Feature | Category | Why | Complexity | Notes / Dependencies |
|---|---|---|---|---|
| Selecting a branch in the dropdown calls `client.me.branches.switch({branchId})` | Table stakes | This is the only mechanism that changes `user.selected_branch_id` server-side (PRD §5.3, §7.2). | LOW | Wrap in a TanStack `useMutation`. |
| Optimistic UI is **not** used — wait for `{ok, branchId}` before updating chrome | Table stakes | PRD §5.3: "A rejected switch (403) changes nothing server-side — the previously selected branch is untouched (ACCS-06). Keep the UI on the old branch and show the error." Optimistically flipping the sidebar label before confirmation risks showing a branch name the server never accepted. | LOW | Standard `onSuccess`/`onError` mutation handlers, no `onMutate` optimistic patch for the branch name itself. |
| Disable the switcher (or show a spinner state) while the switch mutation is in flight | Table stakes | Prevents double-submission / racing switches, and matches this codebase's existing pattern of disabling mutating controls during pending mutations (e.g. order-action buttons in `use-order-actions.js`). | LOW | `mutation.isPending` guards the control. |
| Close the dropdown on successful switch | Table stakes | Standard interaction completion signal — the same as any of this codebase's existing popovers (user menu closes on `signOut`). | LOW | — |
| Client-side `branchId` UUID validation before calling switch | Differentiator | The server already returns `400 VALIDATION_ERROR` for a bad/non-UUID `branchId` (PRD §7.2), and the switcher only ever offers `branchId`s it fetched from `client.me.branches()` — this can't realistically happen from normal use. | LOW-effort but genuinely unnecessary | Skip; trust the closed set of IDs sourced from the same session. Add only defensive error copy for the (unreachable in practice) 400 case, reusing the generic error toast. |
| Debounce/throttle rapid repeated switch clicks | Differentiator | Minor polish; `mutation.isPending` disabling the control (table stakes above) already prevents the double-submit case that debouncing would otherwise guard against. | LOW | Covered by the disabled-while-pending state; don't add a second mechanism. |
| A "confirm switch" modal/dialog before committing (e.g. "Are you sure you want to switch to Branch X?") | Anti-feature | Switching branches is reversible (switch back any time) and low-stakes for staff (no data loss, no destructive action) — an extra confirmation click just slows down a routine action multi-branch staff may do daily. | Instead: the post-switch "switched to X" toast (table stakes, §4 below) is sufficient feedback; no pre-switch gate. |
| Client-side branch-availability caching that lets the switch action bypass a fresh list fetch (e.g. reuse a stale branch list to populate the dropdown, but always hit the switch endpoint with a `branchId` from that stale cache) | Anti-feature | This is effectively covered already since `client.me.branches.switch` re-validates server-side regardless of what the client sends — but building extra client trust in a stale list invites a confusing UX where a user picks a branch that then 403s. | Instead: the existing "don't cache indefinitely" rule (§2) already keeps the list fresh enough; no separate mechanism needed. |

### 4. Post-switch re-scope (SSE reconnect + cache invalidation + confirmation toast)

| Feature | Category | Why | Complexity | Notes / Dependencies |
|---|---|---|---|---|
| Invalidate/refetch every branch-scoped TanStack Query cache on switch success | Table stakes | PRD §5.3 + §7.3: "invalidate all branch-scoped queries and refetch." This is the mechanism that actually re-scopes every screen — without it, screens keep showing the old branch's data until their next unrelated refetch. | MEDIUM | Existing branch-scoped query keys to retrofit: `['orders']` (orders list — screen-orders/screen-pos/screen-kitchen), `['order', id]` (detail), `['stats']` (dashboard tiles), `['menu']` (POS + Menu screen), `['history-orders', from, to]` (History screen), `['restaurant-settings']`, `['delivery-areas']`. Simplest correct approach given the PRD's explicit recipe ("key your data-fetching cache on the current `branchId` and change the key on switch"): **key every one of these on `branchId`** (e.g. `['orders', branchId]`) so a switch is a pure key change — old-branch data falls out of the active query naturally rather than needing a manual invalidate list to stay in sync as new hooks are added. |
| SSE reconnect scoped to the new branch after switch | Table stakes | PRD §5.3 + §11: the server **closes** the user's SSE streams on switch as part of the switch response side-effect; the stream is keyed `(restaurantId, branchId, userId)`. The client *must* reconnect or KDS/live orders silently go dark after every switch. | MEDIUM | `useSSE` (`src/use-sse.js`) is currently keyed only on `[token, queryClient]` in its `useEffect` dependency array (line 123) — it does not know about branch at all today. Add `branchId` (or a `branchVersion` counter) to that dependency array so a switch tears down the old `AbortController` and opens a fresh `fetchEventSource` connection. The SSE URL itself doesn't change (no branch param per §5.1) — only the *timing* of reconnect matters, since the server already closed the old stream. |
| "Switched to `<branch>`" confirmation toast | Table stakes | PRD §7.3: "Show a subtle 'switched to <branch>' confirmation." | LOW | Reuse the existing `pushToast`/`dismissToast` actions already in `store.js` (used by other flows) — no new toast subsystem needed. |
| Navigate back to a safe/neutral screen after switching (e.g. Orders) if the current screen holds branch-specific session state | Differentiator | If a user switches branch while sitting on `detail`/`history-detail` (an order belonging to the *old* branch), staying on that screen post-switch is confusing — the order they're looking at may no longer be visible/relevant. | LOW-MEDIUM | Reuse the existing `setScreen` pattern in `store.js`, which already clears `selectedOrder`/`historyOrder` (and conditionally `historySelection`) on any screen change (lines 75-84) — calling `setScreen('orders')` on switch success gets this "for free" from existing logic, no new state needed. |
| Re-fetch the branch list itself after a successful switch (not just branch-scoped data) | Differentiator | Cheap correctness belt: confirms the switcher's own displayed "current branch" and default badge reflect server truth immediately, rather than trusting the client's own `branchId` echo from the switch response. | LOW | `queryClient.invalidateQueries({ queryKey: ['branches'] })` alongside the branch-scoped invalidation — one extra line, consistent with "don't cache indefinitely." |
| Full app reload / window relaunch on every branch switch (brute-force re-scope) | Anti-feature | A full reload defeats the purpose of SSE/query-cache re-scoping infrastructure that already exists, throws away sidebar/nav UI state unnecessarily, and is jarring for a routine action. The existing `relaunch()` mechanism in `shell.jsx` is reserved for app *updates*, a genuinely different-severity event. | Instead: targeted cache-key change + SSE reconnect (both table stakes above) achieve the same correctness without the UX cost. |
| Per-branch-keyed *Zustand* UI state (e.g. separate `screen`/`density`/`sidebarCollapsed` per branch) | Anti-feature | UI preferences (theme, density, language, collapsed state) are user preferences, not branch data — PRD explicitly frames only *server data* (catalog, settings, orders, dashboard) as branch-scoped. Branch-keying UI chrome state would be over-engineering with no PRD backing. | Instead: Zustand continues to own UI state unscoped (per this project's existing architecture rule); only TanStack Query's server-state caches get `branchId`-keyed. |

### 5. Launch-time branch adoption from session

| Feature | Category | Why | Complexity | Notes / Dependencies |
|---|---|---|---|---|
| On cold start, adopt the active branch from the authenticated session (`user.selectedBranch` / whatever the SDK's session-fetch surfaces), not from any locally persisted branch choice | Table stakes | The selection is **server-side session state**, global to the user, re-validated every request (PRD §5.2, §5.3: "global to the user, not per-tab... If the owner switches branch in one tab, other tabs' next requests follow"). Persisting a client-side "last selected branch" and trusting it at launch would drift from server truth the moment it's switched elsewhere (another device, or revoked while offline). | MEDIUM | Do **not** add `branchId` to the persisted slice of `store.js` (the `partialize` list currently: `screen, role, lang, accent, density, sidebarCollapsed`). Branch identity is session-derived, same category as `authUser` (already session-only, set by `AuthProvider` on cold start per the store's own comment at line 65-67) — mirror that exact pattern for whichever field carries the branch. |
| No branch UI/data fetch attempted before auth resolves | Table stakes | The branch endpoints are session-authed (`401` if unauthenticated per PRD §7.2) — same precondition `useSSE` already encodes today (`if (!token) return`, line 27 of `use-sse.js`). | LOW | Gate the `use-branches.js` query (`enabled: !!isAuthenticated` or `!!token`) exactly like the SSE hook gates on `token`. |
| First screen render already reflects the correct branch (no "flash" of wrong-branch/no-branch chrome before the branch list resolves) | Table stakes | Prevents a jarring flash where the sidebar briefly shows a placeholder or the previous session's cached branch name before settling. | LOW-MEDIUM | Show a neutral loading state in the switcher slot (not a wrong name) until both auth and the branch list have resolved — same treatment as the rest of the app's auth-gated cold-start sequence already documented in PROJECT.md ("Auth guard on all screens"). |
| Reconcile a **mismatch** between the SDK-provided `user.selectedBranch` (if the SDK's `getMe`/session call surfaces it) and the first `client.me.branches()` response, in case they ever disagree | Differentiator | Defensive-only; per PRD §5.2 the server always re-validates on every request, so any request the app makes after launch is already correctly scoped regardless of what the client *displays*. Only the switcher's own display label is at risk of transient staleness. | LOW | If `client.me.branches()` includes enough info to identify "this one is currently selected" (check SDK response shape at implementation time — the documented `AccessibleBranch` type in PRD §15 does **not** include a `selected`/`isCurrent` flag, only `isDefault`/`isActive`), the app may need to source "current branch" from the session/profile call instead of inferring it from the list. Flag this as a build-time verification item, not a design gap — confirm the exact field name the installed `@charlyk/admin-client` v1.1.67 actually exposes before wiring the store. |
| Store a locally-remembered "preferred branch" independent of server session, and silently re-apply it on next launch by calling `switch` automatically before the user does anything | Anti-feature | Actively fights the server's own resolution order (PRD §5.2: selected → default → first `branch_members` → 403) and the "global to the user" guarantee — a device-local override would cause the same user's other devices/sessions to visibly flicker branch on this device's launch. | Instead: trust `resolveEffectiveBranchId` server-side entirely; the app is a passive reflector of session state at launch, never an initiator of a switch the user didn't request. |

### 6. Error handling (403 `BRANCH_INACTIVE` / `BRANCH_ACCESS_REVOKED` — on switch AND on any later request)

| Feature | Category | Why | Complexity | Notes / Dependencies |
|---|---|---|---|---|
| Handle `403 BRANCH_INACTIVE` / `BRANCH_ACCESS_REVOKED` on the **switch** call itself | Table stakes | PRD §7.2, §7.3, §16: switching to a now-inactive/inaccessible branch is a documented rejection path. Per §5.3, a rejected switch changes nothing server-side. | LOW-MEDIUM | `useMutation` `onError`: inspect the SDK error for these two codes, toast an explanatory error, refetch `['branches']` (the target branch may need to disappear from the list), leave the switcher open on the *previous* (still-active) branch — no other screen re-scoping needed since nothing changed server-side. |
| Handle the same two codes on **any later request** (orders list, menu, history, SSE, POS submit, etc. — not just the switch call) | Table stakes | This is the more important and more subtle case per PRD §5.2: because the server re-validates the selection on *every* request, a branch can be deactivated or access revoked by an owner **while the staff member is mid-session on it**, and the *next unrelated action* (e.g. loading the orders list) is what surfaces the 403 — not a switch attempt. PRD §16: "Treat the three `BRANCH_*` codes specially — they mean 'the branch you thought you were on is no longer valid,' and should route to the branch switcher, not a generic toast." | MEDIUM-HIGH | This needs a **centralized** handler, not per-screen try/catches — the same class of cross-cutting concern this codebase already solved once for 401 (PROJECT.md D-08: "401 is handled app-wide by the auth-refresh layer; raw SDK error strings must not reach the DOM"). Likely a shared response/error interceptor (wherever the 401-refresh layer already lives) extended to special-case these two 403 codes: on catch, force-open the branch switcher, `invalidateQueries(['branches'])`, and show the "branch no longer available" toast — regardless of which screen/hook triggered the failing request. |
| `403 NO_BRANCH_ACCESS` (the third, more severe branch-resolution code) → full-screen blocking state, not a toast | Table stakes | PRD §5.2/§16: this means the user has **no** accessible branch at all — nothing to switch *to*. A toast + reopened (empty) switcher would be actively misleading. | LOW-MEDIUM | Distinct handling path from the other two: render a full-screen "you have no branch access — contact your owner" state (PRD's own suggested copy), blocking the rest of the app, since there is no valid branch-scoped screen to fall back to. |
| Generic/opaque error copy for these codes (no raw SDK error strings surfaced to the DOM) | Table stakes | Matches this project's own established decision (D-08 in PROJECT.md) applied to auth errors — same principle extends cleanly to branch errors: user-facing copy is a small fixed set of translated strings keyed by the three codes, not a passthrough of `error.message`. | LOW | Add 3 translation keys (RO/EN) to `i18n.jsx` alongside the existing `t()` catalog. |
| SSE-specific 403 handling — if the *stream itself* drops due to a branch-resolution failure (distinct from a plain network drop), still route through the same branch-switcher-reopen path rather than the generic SSE retry/backoff in `onerror` | Differentiator | `use-sse.js`'s current `onerror` (line 109-114) treats every failure identically (retry with backoff, `setIsConnected(false)`). A `BRANCH_INACTIVE`/`BRANCH_ACCESS_REVOKED` failure on the SSE endpoint is not a transient network blip — retrying forever against a branch the user can no longer access is wasted effort and would never self-heal without the same switcher-reopen flow. | MEDIUM | Requires inspecting the actual response status/body `fetchEventSource`'s `onopen` receives for this failure mode (verify at implementation time whether the SSE endpoint returns a JSON 403 body the library surfaces, or just a bare non-2xx) — flag as a Phase-level research item, not resolvable from documentation alone. |
| Retry the failing request automatically after the user re-selects a branch in the reopened switcher (so a screen self-heals without a manual page refresh) | Differentiator | Nice completion of the loop — TanStack Query's `invalidateQueries`/refetch behavior (already the mechanism used for the happy-path switch in §4) naturally provides this: once the branch-scoped keys change to the newly-selected `branchId`, previously-failed observers refetch on their own. | LOW (falls out of the `branchId`-in-query-key design from §4) | No separate retry logic needed if branch-scoped keys are designed correctly from the start — this is a strong argument *for* the "key every branch-scoped query on `branchId`" approach over a manual invalidate-list, since manual invalidation lists must be remembered to include every future branch-scoped hook, while key-based scoping doesn't. |
| Silent/logged-only handling of `BRANCH_INACTIVE`/`BRANCH_ACCESS_REVOKED` (swallow the error, keep showing stale cached data) | Anti-feature | Directly contradicts PRD §5.2's design intent: "a branch that is later deactivated... produces a **loud 403** on the next request — never a silently empty result set." Silently keeping stale UI up is exactly the failure mode the API was designed to prevent. | Instead: always surface + force re-selection, per table stakes above. |
| Distinguishing `BRANCH_INACTIVE` from `BRANCH_ACCESS_REVOKED` with different user-facing copy/flows | Anti-feature (for this app) | PRD's own recommended dashboard handling treats both identically ("Toast + force the branch switcher open" / "Same — refresh `GET /v1/me/branches` and make them re-select") — the distinction matters to an owner deciding *why* (did I deactivate the branch, or did I remove this user's access?) but a staff member's remedy is identical either way: pick a different accessible branch or contact the owner. | Instead: one shared handler/toast copy for both codes; only `NO_BRANCH_ACCESS` gets genuinely different (full-screen) treatment. |

---

## Feature Dependencies

```
[Load branches (client.me.branches)]
    └──requires──> [Auth resolved / session token available]
                       (mirrors useSSE's existing `if (!token) return` gate)

[Switcher UI: current branch + default badge]
    └──requires──> [Load branches]
    └──requires──> [Launch-time branch adoption from session]
                       (must know "current" before rendering "current branch name")

[Switch action (client.me.branches.switch)]
    └──requires──> [Switcher UI]  (needs a branchId to switch to)

[Post-switch re-scope: SSE reconnect]
    └──requires──> [Switch action] (success)
    └──requires──> [useSSE branch-aware dependency array]  (net-new — today keyed on [token, queryClient] only)

[Post-switch re-scope: cache invalidation]
    └──requires──> [Switch action] (success)
    └──requires──> [branchId-keyed query keys across ALL existing hooks]
                       (orders list, use-menu.js, use-order-detail.js,
                        use-history-orders.js, use-stats.js, use-restaurant-settings.js,
                        use-delivery-areas.js — every one of these currently has NO branchId
                        in its queryKey and must be retrofitted)

[Post-switch re-scope: confirmation toast]
    └──requires──> [Switch action] (success)
    └──enhances──> nothing further; leaf feature, reuses existing pushToast/store.js

[403 error handling: BRANCH_INACTIVE / BRANCH_ACCESS_REVOKED on switch]
    └──requires──> [Switch action]

[403 error handling: same codes on ANY later request]
    └──requires──> [A centralized SDK-response error interceptor]
                       (does not yet exist for this purpose — the existing 401-refresh
                        layer is the closest analog and the natural place to extend, per D-08)
    └──enhances──> [Switcher UI]  (must be force-openable programmatically, not just by click)

[403 error handling: NO_BRANCH_ACCESS]
    └──conflicts with──> [normal screen rendering]
                       (this is a full-screen blocking state — every other screen must
                        defer to it, same severity class as the existing auth guard)

[Launch-time branch adoption from session] ──conflicts with──> [Persisting branchId in Zustand's partialize list]
                       (branch identity must always come from the live session, never from
                        a locally cached last-known value — see §5 anti-feature)
```

### Dependency Notes

- **Cache invalidation requires retrofitting query keys, not just adding an invalidate call.** The PRD's own recommended pattern ("key your data-fetching cache on the current `branchId` and change the key on switch") is a *design* dependency, not just an implementation detail — it changes every existing branch-scoped hook's `queryKey` shape (`['orders']` → `['orders', branchId]`, etc.), which is a wider-reaching change than it first appears and should be scoped as its own unit of work, not a one-line addition to the switch mutation's `onSuccess`.
- **The centralized 403 interceptor is the highest-leverage single piece of work.** Every other branch-error requirement (switch-time 403, later-request 403, SSE 403, `NO_BRANCH_ACCESS`) funnels through it. Building it once, in the same place the existing 401-refresh logic lives, avoids the "manual invalidate-list" trap called out above and is the difference between "loud 403, correctly routed" (the PRD's design goal) and silent per-screen inconsistency.
- **Launch-time adoption conflicts with any local persistence of branch choice.** This is the one place where the natural instinct (persist the user's last branch like `lang`/`accent`/`density` are already persisted) is actively wrong for this feature, because the server, not the client, owns branch selection truth.

---

## MVP Definition (for the v1.2 milestone itself — not a further-deferred split)

Per the user's stated scope, v1.2 is not being split into a smaller MVP than "full re-scope of every existing screen" — but within that milestone, the true must-haves vs. safe-to-defer-a-phase items are:

### Launch With (v1.2)

- [ ] Switcher UI in sidebar footer (current branch, default badge, single-branch read-only) — the visible surface of the whole feature
- [ ] Branch list load (`client.me.branches()`) with focus/error refetch, no indefinite caching
- [ ] Switch action (`client.me.branches.switch`), non-optimistic, disabled-while-pending
- [ ] `branchId`-keyed query caches across every existing branch-scoped hook (orders, order detail, stats, menu, history, restaurant settings, delivery areas)
- [ ] SSE reconnect on switch (branch-aware `useSSE` dependency)
- [ ] "Switched to X" confirmation toast
- [ ] Launch-time branch adoption from session (not from local persistence)
- [ ] Centralized 403 `BRANCH_INACTIVE`/`BRANCH_ACCESS_REVOKED` handling — both on switch and on any later request — reopening the switcher + refetching the branch list
- [ ] `403 NO_BRANCH_ACCESS` full-screen blocking state

### Add After Validation (v1.2.x, if needed)

- [ ] Reconciling a session-vs-list "current branch" mismatch (only if the installed SDK version's actual response shape requires it — verify at build time per §5)
- [ ] SSE-specific 403 short-circuit (distinct from generic retry/backoff) — verify the SDK's actual failure signal for this case before committing to a design
- [ ] Auto re-fetch of the branch list itself (not just branch-scoped data) after a successful switch

### Future Consideration (out of scope for staff app entirely)

- [ ] Branch creation, per-branch Stripe onboarding, staff↔branch assignment, cross-branch reporting — all owner-only, PRD §13/§14, explicitly excluded by milestone scope
- [ ] Per-branch push-notification preferences (PRD §11.1) — relevant to this app's role set but not called out in the v1.2 target features; flag as a candidate for a follow-up milestone if staff start missing notifications after a branch switch

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---|---|---|---|
| Switcher UI (display, default badge, single-branch read-only) | HIGH | LOW | P1 |
| Branch list load + refetch policy | HIGH | LOW | P1 |
| Switch action (non-optimistic, disabled-while-pending) | HIGH | LOW | P1 |
| `branchId`-keyed query caches (all existing hooks) | HIGH | MEDIUM | P1 |
| SSE reconnect on switch | HIGH | MEDIUM | P1 |
| Confirmation toast | MEDIUM | LOW | P1 |
| Launch-time adoption from session | HIGH | MEDIUM | P1 |
| Centralized 403 interceptor (switch + later-request) | HIGH | MEDIUM-HIGH | P1 |
| `NO_BRANCH_ACCESS` full-screen state | MEDIUM (rare in practice) | LOW-MEDIUM | P1 |
| Post-switch navigation to a neutral screen | MEDIUM | LOW | P2 |
| Session/list mismatch reconciliation | LOW (defensive) | LOW | P2 |
| SSE-specific 403 short-circuit vs. generic retry | LOW-MEDIUM | MEDIUM | P2 |
| Search box in switcher, branch logos, recently-used shortcut | LOW | LOW-MEDIUM | P3 (anti-features — do not build for v1.2) |

**Priority key:**
- P1: Must have for the v1.2 milestone (matches PROJECT.md's stated target features)
- P2: Should have, add within v1.2 if time allows, else fast-follow
- P3: Anti-features / explicitly deferred — do not build

---

## Sources

- `~/Developer/sitecare-orders-api/docs/RESTAURANT_DASHBOARD_PRD.md` §5 (branch-selection model), §6 (SDK integration + gaps), §7 (branch switcher feature spec), §11 (orders/SSE per branch), §13 (staff/branch-access — used only to confirm what's owner-only/out of scope), §15 (`AccessibleBranch`/`SwitchBranchResponse` data dictionary), §16 (error-handling reference) — **HIGH confidence**: this is the API's own PRD for this exact integration, written by the team that owns the backend contract this app must consume.
- `/Users/eduardalbu/Developer/sitecare-pos/.planning/PROJECT.md` — Current Milestone v1.2 section (target features, key context, SDK version installed) — **HIGH confidence**: project's own source of truth.
- `/Users/eduardalbu/Developer/sitecare-pos/src/shell.jsx` — existing sidebar chrome, RO/EN toggle location (lines 136-147), existing dropdown/outside-click pattern (user menu, lines 17-29, 148-179) reused as the switcher's interaction model.
- `/Users/eduardalbu/Developer/sitecare-pos/src/screen-settings.jsx` — confirms a language control already exists in Settings → Afișaj (`display_lang_label`, `storeLang`/`setLang`), validating the "redundant toggle removal" framing.
- `/Users/eduardalbu/Developer/sitecare-pos/src/store.js` — Zustand persisted vs. session-only state split; `partialize` list; existing `setScreen` side-effect pattern that clears order-detail state on navigation (reused for post-switch neutral-screen navigation).
- `/Users/eduardalbu/Developer/sitecare-pos/src/use-sse.js` — current SSE hook's `useEffect` dependency array (`[token, queryClient]`), `onerror`/`onclose` handling — the exact spot that needs a `branchId`-aware reconnect trigger.
- `/Users/eduardalbu/Developer/sitecare-pos/src/use-menu.js`, `use-order-detail.js`, `use-stats.js`, `use-restaurant-settings.js`, `use-delivery-areas.js`, `use-history-orders.js`, and `queryKey` usages across `screen-orders.jsx`, `screen-pos.jsx`, `screen-menu.jsx`, `use-order-actions.js` — enumerated every existing branch-scoped TanStack Query key (`['orders']`, `['order', id]`, `['stats']`, `['menu']`, `['history-orders', from, to]`, `['restaurant-settings']`, `['delivery-areas']`) that must be retrofitted with `branchId`.

---

## Prior Milestone Reference (v1.1 Orders History — for continuity, unaffected by v1.2)

<details>
<summary>v1.1 Orders History feature research (archived, shipped 2026-07-19)</summary>

**SDK Capabilities (from @charlyk/admin-client inspection):**
- `admin.orders.list({ query: { from, to } })` → `AdminOrder[]`, no server-side pagination/search/filter (all client-side); status values NEW/ACCEPTED/PREPARING/READY/OUT_FOR_DELIVERY/COMPLETED/CANCELLED; orderType delivery/pickup/local.
- `orders.get({ path: { id } })` → full `Order` with items/events/address — always used for detail view (AdminOrder has no items).

**Table stakes shipped:** date range selector, history list, client-side status/type/text filters, order detail panel (getOrder), reprint receipt.
**Differentiators shipped:** CSV export, empty state.
**Anti-features avoided:** server-side search (not in SDK), PDF export (deferred), bulk actions on history, "today's summary" stats panel, infinite scroll.

Full detail in `.planning/milestones/v1.1-REQUIREMENTS.md`.

</details>

---
*Feature research for: branch switching (v1.2) — SiteCare POS staff app*
*Researched: 2026-07-21*
