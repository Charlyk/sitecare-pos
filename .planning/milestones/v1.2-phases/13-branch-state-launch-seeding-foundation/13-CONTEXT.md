# Phase 13: Branch State & Launch Seeding Foundation - Context

**Gathered:** 2026-07-21
**Status:** Ready for planning

<domain>
## Phase Boundary

The app resolves and holds the **current active branch** — plus the list of branches the user may switch to — from **server session state** on every sign-in and cold start, **never from local persistence**. Requirements: **BSTATE-01, BSTATE-02**.

Delivers:
- `store.js`: a new session-only `currentBranch` field (the full `SelectedBranch` object or `null`), excluded from `partialize`.
- `auth.jsx`: a `client.auth.getMe()` call added to **both** the cold-start restore effect and `signIn()`, seeding `currentBranch` (and `authUser`) from `getMe()`.
- `use-branches.js` (new): `useBranches()` — a `['branches']` TanStack Query hook over `client.me.branches.list()` with focus/error refetch, short `staleTime`, never cached indefinitely.

**Out of scope for this phase** (later phases): the branch switcher UI and switch flow (Phase 16), branch-scoped cache re-keying of the 7 data hooks (Phase 14), SSE branch-aware reconnect (Phase 15), centralized 403 recovery (Phase 17), and the RO/EN language relocation (Phase 16). No consumer reads `currentBranch` yet in this phase.

</domain>

<decisions>
## Implementation Decisions

### Cold-start seeding timing
- **D-01:** Cold start is **blocking** — `getMe()` is awaited before the app paints. The branch resolves **inside the existing `coldStartBusy` blank gate** (app.jsx:224 already renders a blank white screen during the token/keychain read), so this is **not a new blank state**, only a slightly longer existing one.
- **D-02:** **SC5 is reinterpreted** for this phase: the ROADMAP wording "no added delay or new blank state" is read as **"the branch resolves within the existing cold-start gate; no NEW blank/spinner state is introduced; a single `getMe()` round-trip inside that gate is acceptable."** Planner/verifier should hold this reworded bar, not the literal "zero added delay." (Flag for a possible ROADMAP SC5 edit via `/gsd-phase` — not edited here.)

### getMe() failure handling on cold start
- **D-03:** On cold start, a **401** from `getMe()` (token truly dead) → call the existing `expireSession()` path → land on login. A **non-401 failure** (network error / 5xx) → **stay signed in** with the trusted token (preserves today's "trust token until a real 401" philosophy), leave `currentBranch` null, and stop blocking / paint the app anyway.
- **D-04:** After a non-401 cold-start `getMe()` failure, the retry fires via a **window `'focus'` listener in `AuthProvider`** that re-calls `getMe()` whenever a session exists **and** `currentBranch` is still null, until it resolves. Self-contained in the auth layer — no coupling to `useBranches()`. (Full recovery/error-routing for branch-access 403s remains Phase 17; this is only the launch-seed backstop.)

### authUser scope (fixes an existing cold-start gap)
- **D-05:** The same cold-start `getMe()` response also **populates `authUser`** (role + name), fixing the current gap where a remembered-session relaunch leaves `authUser` null (sidebar falls back to a hardcoded `'Eduard Albu'`, role unpopulated). `getMe()` becomes the canonical source for both branch and user identity on the restore path.
- **D-06:** Reconcile the name shape: `getMe()` returns `CurrentUser.firstName` / `lastName` (nullable), **not** `authUser.name`. `shell.jsx:31` currently reads `authUser?.name ?? authUser?.email`. Update the mapping so a `getMe()`-sourced user renders correctly (compose `firstName`/`lastName`, fall back to `email`). Keep the change minimal and additive.
- **D-07:** `signIn()` also routes through `getMe()` (in addition to / in place of the `signInResult.user` it uses today) so `currentBranch` + `authUser` are seeded identically on both entry paths. A `getMe()` failure right after a successful `signIn()` is **non-fatal** — proceed authenticated, `currentBranch` null, focus-retry (D-04) is the backstop.

### use-branches.js scope
- **D-08:** Build **only `useBranches()`** this phase (the `['branches']` list query). `useBranchSwitch()` and the `branchSwitcherForceOpen` store field are **deferred to Phase 16**, where they are actually consumed — no dead code shipped now. This keeps Phase 13 tight to BSTATE-01/02.
- **D-09:** `useBranches()` config: query key `['branches']` (deliberately **not** branch-prefixed), short `staleTime` (not `Infinity`), `refetchOnWindowFocus: true`, and refetch after a branch-access error (the error path itself is wired in Phase 17; this phase just doesn't pin it stale). Gate with `enabled: !!client` only — **never** add a `!!branchId` gate (Pitfall 11 / single-branch regression).

### Locked-by-research (carried forward, not re-litigated)
- **D-10:** `currentBranch` and the branch list are **session-only, never persisted** — never added to `store.js` `partialize`. Server re-validates `selected_branch_id` on every request; a persisted stale value would flash the wrong branch. (Mirrors research D-09/D-10.)
- **D-11:** Trust the **installed SDK types** over the API PRD prose: `client.auth.getMe()` returns `CurrentUser` with both `role` and `selectedBranch` in v1.1.67. Do not "correct" this back toward the stale PRD.

### Claude's Discretion
- Exact `staleTime` value for `useBranches()` (a small finite window; planner picks).
- Precise structure of the focus listener (add/remove effect wiring) and the `firstName`/`lastName` composition helper — implementation detail.
- Whether `signIn()` keeps `signInResult.user` as an immediate optimistic fill before `getMe()` resolves, or waits for `getMe()` — minor, planner's call, as long as the final source of truth is `getMe()`.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & roadmap
- `.planning/REQUIREMENTS.md` — BSTATE-01 (line 12), BSTATE-02 (line 13): the two locked requirements for this phase.
- `.planning/ROADMAP.md` §"Phase 13" (lines 62–72) — goal + 5 success criteria. **Read SC5 with D-01/D-02 above** (reinterpreted).

### Research (all 2026-07-21, HIGH confidence)
- `.planning/research/SUMMARY.md` §"Phase 1: State + Launch Seeding Foundation" — this phase's build order, deliverables, and the "cold start calls neither getMe() nor getSession() today" warning.
- `.planning/research/PITFALLS.md` — Pitfall 5 (launch seed is new code + stale PRD), Pitfall 9/10 (missing cold-start seed / persisted branchId drift), Pitfall 11 (single-branch regression — `enabled: !!client` only).
- `.planning/research/ARCHITECTURE.md` — `currentBranch` in Zustand seeded by AuthProvider; `['branches']` deliberately not branch-prefixed.
- `.planning/research/STACK.md` / `.planning/research/FEATURES.md` — SDK surface confirmation; FEATURES §5 (launch-time branch adoption).

### SDK contract (source of truth over the PRD)
- `node_modules/@charlyk/admin-client/dist/index.d.ts` — `SelectedBranch` (nullable) + `AccessibleBranch` (lines 670–683), `CurrentUser` incl. `role` + `selectedBranch` (lines 684–691), `me.branches.list` → `Array<AccessibleBranch>` (line ~1991), `auth.getMe()` (`GetCurrentUserResponse`).

### Source files this phase modifies/adds
- `src/auth.jsx` — cold-start restore effect (lines 106–128), `signIn()` (131–169), `expireSession()` (82–101). The getMe() call + focus listener land here.
- `src/store.js` — session-only auth state (lines 66–67), `partialize` (the 6 persisted keys). Add `currentBranch` + `setCurrentBranch`, excluded from partialize.
- `src/shell.jsx` — `displayName` mapping (line 31), needs the firstName/lastName reconcile (D-06).
- `src/app.jsx` — cold-start gate (lines 224–227); confirm blocking behavior renders inside it.
- `src/use-branches.js` — **new** hook file (mirror an existing hook like `src/use-stats.js` for query shape/conventions).

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`authUser` Zustand pattern** (`store.js:67`, `setAuthUser` `store.js:114`): `currentBranch` mirrors it exactly — session-only, set by AuthProvider, excluded from partialize. Same tier.
- **Existing TanStack hooks** (`use-stats.js`, `use-orders.js`, etc.): copy their `{ enabled: !!client }` gate, `{ data, error }` unwrap convention, and query-key style for `useBranches()`.
- **`coldStartBusy` blank gate** (`app.jsx:224`): the already-present blank white screen that D-01 resolves the branch inside of — reuse, don't add a new spinner.
- **`expireSession()`** (`auth.jsx:82`): the D-03 401 path calls this existing function; no new sign-out logic needed.

### Established Patterns
- **Hooks must be called before conditional returns in `app.jsx`** — when `useBranches()` gains a consumer (Phase 16), it must join the unconditional hook block; in Phase 13 it has no app.jsx consumer yet, so this is a carry-forward note, not an action.
- **`{ data, error }` "fields" response style** is used across all SDK calls — `getMe()` and `me.branches.list()` follow it.
- **Session-only state is never in `partialize`** (6 persisted keys only): screen, role, lang, accent, density, sidebarCollapsed.

### Integration Points
- `AuthProvider` cold-start effect (`auth.jsx:106`) — the seam where `getMe()` is added and awaited before `setColdStartBusy(false)`.
- `AuthProvider.signIn()` (`auth.jsx:131`) — the second seam for identical seeding.
- `shell.jsx` `displayName` — consumes the now-populated `authUser` on cold start.

</code_context>

<specifics>
## Specific Ideas

- `SelectedBranch` is **nullable** in the SDK — a user may have no selected branch. `currentBranch: null` is a valid resolved state, distinct from "not yet loaded." Handle both without conflating them.
- The whole `SelectedBranch` object is stored (id, name, slug, isDefault, isActive), not just the id — so Phase 16's switcher can render name + default badge without a second lookup.

</specifics>

<deferred>
## Deferred Ideas

- **`useBranchSwitch()` mutation** — Phase 16 (branch switch flow).
- **`branchSwitcherForceOpen` store field** — Phase 16/17 (switcher reopen on 403).
- **Branch-scoped query keys / cache re-scoping** across the 7 data hooks — Phase 14.
- **Centralized `BRANCH_INACTIVE` / `BRANCH_ACCESS_REVOKED` / `NO_BRANCH_ACCESS` 403 recovery** (toast + reopen switcher + refetch, full-screen block for `NO_BRANCH_ACCESS`) — Phase 17. Phase 13's focus-retry (D-04) is only the launch-seed backstop, not this.
- **Possible ROADMAP SC5 wording edit** to match D-02 — do via `/gsd-phase` if desired; not done in this discussion.

None of these were scope creep — all are already-roadmapped later phases surfaced by the discussion.

</deferred>

---

*Phase: 13-branch-state-launch-seeding-foundation*
*Context gathered: 2026-07-21*
