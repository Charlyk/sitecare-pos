# Phase 13: Branch State & Launch Seeding Foundation - Research

**Researched:** 2026-07-22
**Domain:** Auth/session state seeding + a single new TanStack Query hook in an existing Tauri/React/Zustand/TanStack Query POS app
**Confidence:** HIGH

## Summary

This phase is a small, mechanical extension of two already-proven patterns in this codebase: the `authUser` Zustand seeding pattern (`store.js`/`auth.jsx`) and the small dedicated-hook-per-resource TanStack Query pattern (`use-stats.js`, `use-menu.js`, etc.). No new libraries, no new architectural idioms. The work is entirely inside `auth.jsx` (add one `client.auth.getMe()` call to two existing call sites), `store.js` (one new session-only field), `shell.jsx` (one small name-composition fix), and one new file `src/use-branches.js` (a single `useQuery` hook, no mutation, no UI consumer yet).

All decisions from `13-CONTEXT.md` (D-01 through D-11) were verified against the actual codebase during this research pass and confirmed accurate — no drift found in any cited line number or code shape. One implementation detail not fully specified in CONTEXT.md was discovered and is critical to get right: **`client.auth.getMe()` does not follow this codebase's `{ data, error }` "fields" convention** — unlike `client.me.branches.list()`, it is a throwing async function that resolves `CurrentUser` directly or throws an `Error` with a `.status` property attached (mirroring the `err?.status` pattern `signIn()`'s catch block already uses at `auth.jsx:158`). This must be wrapped in try/catch, not `if (result.error)`.

**Primary recommendation:** Add `client.auth.getMe()` to `auth.jsx`'s cold-start effect and `signIn()`, seeding a new session-only `currentBranch` (and fixing the pre-existing `authUser` cold-start gap) via try/catch (not fields-style unwrap); build `useBranches()` in a new `use-branches.js` mirroring `use-stats.js`'s shape exactly (`enabled: !!client`, finite `staleTime`, `refetchOnWindowFocus: true`); wire a `window` `'focus'` listener in `AuthProvider` as the D-04 backstop — this is genuinely new code with no existing precedent in this codebase (`shell.jsx`/`screen-history.jsx` only use `mousedown`/`keydown` listeners), so build it from scratch rather than copying an existing pattern.

## User Constraints

<user_constraints>
### Locked Decisions

**D-01:** Cold start is **blocking** — `getMe()` is awaited before the app paints. The branch resolves **inside the existing `coldStartBusy` blank gate** (app.jsx:224 already renders a blank white screen during the token/keychain read), so this is **not a new blank state**, only a slightly longer existing one.

**D-02:** **SC5 is reinterpreted** for this phase: the ROADMAP wording "no added delay or new blank state" is read as **"the branch resolves within the existing cold-start gate; no NEW blank/spinner state is introduced; a single `getMe()` round-trip inside that gate is acceptable."** Planner/verifier should hold this reworded bar, not the literal "zero added delay." (Flag for a possible ROADMAP SC5 edit via `/gsd-phase` — not edited here.)

**D-03:** On cold start, a **401** from `getMe()` (token truly dead) → call the existing `expireSession()` path → land on login. A **non-401 failure** (network error / 5xx) → **stay signed in** with the trusted token (preserves today's "trust token until a real 401" philosophy), leave `currentBranch` null, and stop blocking / paint the app anyway.

**D-04:** After a non-401 cold-start `getMe()` failure, the retry fires via a **window `'focus'` listener in `AuthProvider`** that re-calls `getMe()` whenever a session exists **and** `currentBranch` is still null, until it resolves. Self-contained in the auth layer — no coupling to `useBranches()`. (Full recovery/error-routing for branch-access 403s remains Phase 17; this is only the launch-seed backstop.)

**D-05:** The same cold-start `getMe()` response also **populates `authUser`** (role + name), fixing the current gap where a remembered-session relaunch leaves `authUser` null (sidebar falls back to a hardcoded `'Eduard Albu'`, role unpopulated). `getMe()` becomes the canonical source for both branch and user identity on the restore path.

**D-06:** Reconcile the name shape: `getMe()` returns `CurrentUser.firstName` / `lastName` (nullable), **not** `authUser.name`. `shell.jsx:31` currently reads `authUser?.name ?? authUser?.email`. Update the mapping so a `getMe()`-sourced user renders correctly (compose `firstName`/`lastName`, fall back to `email`). Keep the change minimal and additive.

**D-07:** `signIn()` also routes through `getMe()` (in addition to / in place of the `signInResult.user` it uses today) so `currentBranch` + `authUser` are seeded identically on both entry paths. A `getMe()` failure right after a successful `signIn()` is **non-fatal** — proceed authenticated, `currentBranch` null, focus-retry (D-04) is the backstop.

**D-08:** Build **only `useBranches()`** this phase (the `['branches']` list query). `useBranchSwitch()` and the `branchSwitcherForceOpen` store field are **deferred to Phase 16**, where they are actually consumed — no dead code shipped now. This keeps Phase 13 tight to BSTATE-01/02.

**D-09:** `useBranches()` config: query key `['branches']` (deliberately **not** branch-prefixed), short `staleTime` (not `Infinity`), `refetchOnWindowFocus: true`, and refetch after a branch-access error (the error path itself is wired in Phase 17; this phase just doesn't pin it stale). Gate with `enabled: !!client` only — **never** add a `!!branchId` gate (Pitfall 11 / single-branch regression).

**D-10:** `currentBranch` and the branch list are **session-only, never persisted** — never added to `store.js` `partialize`. Server re-validates `selected_branch_id` on every request; a persisted stale value would flash the wrong branch. (Mirrors research D-09/D-10.)

**D-11:** Trust the **installed SDK types** over the API PRD prose: `client.auth.getMe()` returns `CurrentUser` with both `role` and `selectedBranch` in v1.1.67. Do not "correct" this back toward the stale PRD.

### Claude's Discretion

- Exact `staleTime` value for `useBranches()` (a small finite window; planner picks).
- Precise structure of the focus listener (add/remove effect wiring) and the `firstName`/`lastName` composition helper — implementation detail.
- Whether `signIn()` keeps `signInResult.user` as an immediate optimistic fill before `getMe()` resolves, or waits for `getMe()` — minor, planner's call, as long as the final source of truth is `getMe()`.

### Deferred Ideas (OUT OF SCOPE)

- **`useBranchSwitch()` mutation** — Phase 16 (branch switch flow).
- **`branchSwitcherForceOpen` store field** — Phase 16/17 (switcher reopen on 403).
- **Branch-scoped query keys / cache re-scoping** across the 7 data hooks — Phase 14.
- **Centralized `BRANCH_INACTIVE` / `BRANCH_ACCESS_REVOKED` / `NO_BRANCH_ACCESS` 403 recovery** (toast + reopen switcher + refetch, full-screen block for `NO_BRANCH_ACCESS`) — Phase 17. Phase 13's focus-retry (D-04) is only the launch-seed backstop, not this.
- **Possible ROADMAP SC5 wording edit** to match D-02 — do via `/gsd-phase` if desired; not done in this discussion.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| BSTATE-01 | On sign-in and on cold-start session restore, the app resolves the current selected branch from `client.auth.getMe().selectedBranch` and holds it in session-only state (never client-persisted). Cold start currently sets `isAuthenticated` without any `getMe()` call, so this adds that call. | See "getMe() throwing-contract" finding below; Code Examples §1–2 (cold-start + signIn seeding); Common Pitfalls #1–#3 |
| BSTATE-02 | The set of accessible branches loads via `client.me.branches.list()`; the list is refetched on window focus and after any branch-access error, and is never cached indefinitely. | See Code Examples §3 (`useBranches()`); Standard Stack (staleTime precedent table) |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

- **@charlyk/admin-client is the ONLY data layer** — `getMe()` and `me.branches.list()` are both called exclusively through the installed SDK client instance; no raw `fetch`.
- **window.* globals are forbidden in production code** except genuine browser/runtime APIs (the D-04 `window.addEventListener('focus', ...)` is a legitimate runtime API call, not a prototype-era module-system global — this rule targets `window.someModuleExport`-style globals, not DOM/browser event APIs).
- **State split** — Zustand owns UI state; TanStack Query owns server state. `currentBranch` is a single server-originated *fact*, not a *collection* — it belongs in Zustand (mirrors `authUser`), not TanStack Query. The *list* of accessible branches is a genuine server list resource — it belongs in TanStack Query (`useBranches()`).
- **Hooks must be called before conditional returns** in `app.jsx` — not triggered this phase (no `app.jsx` consumer of `useBranches()` yet per D-08), but flagged as a Phase 16 carry-forward per CONTEXT.md.
- **Screens call their own data hooks** — not applicable this phase; `useBranches()` has no screen consumer yet.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| `currentBranch` (which branch is active) | Frontend state (Zustand) | API/Backend (source of truth) | Single server-originated fact needed synchronously by many consumers (future query-key builders, `useSSE`, `Shell`) — same tier as `authUser`, not a paginated/filterable collection. Server (`selected_branch_id`) remains the actual authority; Zustand only mirrors it, never persists it. |
| Accessible branches list | Frontend state (TanStack Query cache) | API/Backend | Genuine server *list* resource with its own fetch/cache/refetch lifecycle (focus-refetch, error-refetch, short staleTime) — architecturally identical to `useOrders()`/`useMenu()`, not UI chrome state. |
| Launch-time identity resolution (`getMe()`) | Frontend Server-equivalent (AuthProvider, a client-side session-bootstrap layer) | API/Backend | `AuthProvider` in this Tauri/React app plays the role a thin SSR/session layer would play in a web app — it is the sole seam authorized to call `getMe()` and write `currentBranch`/`authUser`; screens never call `getMe()` directly. |
| Focus-triggered retry (D-04) | Frontend state (AuthProvider effect) | — | Self-contained recovery logic living entirely in the auth layer per D-04; no coupling to the branches list or any screen. |

## Standard Stack

### Core

No new dependencies — zero-install phase. Every piece needed is already installed and pinned.

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@charlyk/admin-client` | `^1.1.67` (installed, pinned) | `client.auth.getMe()`, `client.me.branches.list()` | Only sanctioned data layer per CLAUDE.md; both calls already declared in the installed `dist/index.d.ts` — no SDK bump needed `[VERIFIED: node_modules/@charlyk/admin-client/dist/index.d.ts, read directly]` |
| `@tanstack/react-query` | `^5.99.2` (installed, pinned) | `useBranches()` — one `useQuery` hook | Existing server-state layer; `useBranches()` is architecturally identical to `useStats()`/`useMenu()` `[VERIFIED: package.json]` |
| `zustand` | `^5.0.12` (installed, pinned) | `currentBranch` field on `useAppStore` | Existing UI/session state layer; mirrors the `authUser` field exactly `[VERIFIED: package.json, store.js]` |

### Supporting

No supporting libraries beyond the core three — this phase adds no new npm dependency of any kind.

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `window.addEventListener('focus', ...)` for D-04 | A library like `react-use`'s `useWindowFocus` | Unnecessary — this is a 4-line `useEffect`, and no such library is installed; adding one for a single listener would violate the zero-new-dependency constraint of this milestone. |
| `try/catch` around `getMe()` | Treat it like the `{ data, error }` fields-style calls elsewhere | **Wrong** — confirmed from `index.mjs` that `getMe()` throws (see Pitfall #1 below); using `if (result.error)` would silently never catch anything since `result` here is the resolved `CurrentUser` object, not a `{data,error}` tuple. |

**Installation:**
No installation needed — all three packages are already present in `package.json` at the versions above.

**Version verification:** Verified directly against the installed `node_modules/@charlyk/admin-client/dist/index.d.ts` (no `npm view` needed — SDK version is pinned and already installed; installed version confirmed as `1.1.67` via `package.json` dependency spec `^1.1.67`). `@tanstack/react-query@5.99.2` and `zustand@5.0.12` confirmed via `package.json`, unchanged from prior phases.

## Package Legitimacy Audit

**Not applicable — this phase installs zero new packages.** All three libraries used (`@charlyk/admin-client`, `@tanstack/react-query`, `zustand`) are pre-existing, already-audited dependencies from earlier phases (v1.0/v1.1 milestones). No `npm install` command is part of this phase's implementation.

**Packages removed due to [SLOP] verdict:** none (no packages evaluated — none installed)
**Packages flagged as suspicious [SUS]:** none

## Architecture Patterns

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│ Cold start (app launch, remembered session)                         │
│                                                                       │
│  readToken() ──► token found ──► createAdminClient(token)            │
│                                        │                              │
│                                        ▼                              │
│                          setIsAuthenticated(true)  [existing]        │
│                                        │                              │
│                                        ▼                              │
│                    await client.auth.getMe()   [NEW — awaited,       │
│                     (try/catch, NOT {data,error})  blocks paint]     │
│                          │                    │                      │
│                    success                  throws                   │
│                          │                    │                      │
│                          ▼              status===401?                │
│              setAuthUser(me)              /        \                 │
│              setCurrentBranch(            yes        no              │
│                me.selectedBranch)          │          │              │
│                          │            expireSession()  stay signed-in│
│                          │            → login screen   currentBranch │
│                          │                              stays null   │
│                          └──────────────┬───────────────┘            │
│                                         ▼                             │
│                             setColdStartBusy(false)                  │
│                             [app.jsx:224 gate releases — first paint]│
│                                         │                             │
│                          (if non-401 failure path taken)             │
│                                         ▼                             │
│                    window 'focus' listener [NEW, AuthProvider]       │
│                    — re-calls getMe() while session exists AND       │
│                      currentBranch is still null, until it resolves  │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│ signIn() (interactive login)                                        │
│                                                                       │
│  sdkSignIn() ──► token ──► createAdminClient(token)                  │
│                       │                                              │
│                       ▼                                              │
│           setIsAuthenticated(true) + setAuthUser(signInResult.user)  │
│           [existing — optimistic fill, planner's discretion whether  │
│            to keep this or wait for getMe()]                         │
│                       │                                              │
│                       ▼                                              │
│           await client.auth.getMe()  [NEW — non-fatal on failure]    │
│                       │                                              │
│                 success│  throws (any status)                       │
│                       ▼        │                                     │
│         setAuthUser(me)   proceed authenticated,                    │
│         setCurrentBranch(  currentBranch stays null,                │
│           me.selectedBranch) focus-retry (D-04) is backstop         │
│                       │        │                                     │
│                       └───┬────┘                                     │
│                           ▼                                          │
│                    setScreen('orders')  [existing, unchanged]        │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│ useBranches() — no consumer yet this phase (D-08)                   │
│                                                                       │
│  TanStack Query: queryKey ['branches']                              │
│    queryFn: client.me.branches.list()  → { data, error } fields    │
│    enabled: !!client                                                │
│    staleTime: finite (planner picks, precedent = 30_000ms)          │
│    refetchOnWindowFocus: true                                       │
│  (mirrors use-stats.js shape exactly — see Code Examples §3)        │
└─────────────────────────────────────────────────────────────────────┘
```

A reader can trace both entry points (cold start, sign-in) from "app starts" through "branch resolved (or backstopped)" to "first paint" by following the arrows above; the `useBranches()` box is intentionally disconnected from both flows this phase (no wiring into `app.jsx` — D-08).

### Recommended Project Structure

No new directories. One new file at the existing flat `src/` root, matching every other hook file:

```
src/
├── auth.jsx              # MODIFIED — getMe() added to cold-start effect + signIn()
├── store.js               # MODIFIED — currentBranch + setCurrentBranch added
├── shell.jsx               # MODIFIED — displayName composition fix (D-06)
├── use-branches.js         # NEW — useBranches() only (no useBranchSwitch() — D-08)
└── use-stats.js            # REFERENCE — mirror this file's shape exactly for use-branches.js
```

### Pattern 1: Session-only Zustand field mirroring `authUser`

**What:** Add `currentBranch: null` alongside the existing `authUser: null` (store.js:66-67), with a `setCurrentBranch` action alongside `setAuthUser` (store.js:114), and explicitly exclude it from `partialize` (store.js:120-127).
**When to use:** Any single server-originated fact that many unrelated consumers need synchronously and that must never survive a restart as stale data.
**Example:**
```js
// src/store.js — inside the store's state object, alongside existing auth state (line 66-67)
isAuthenticated: false,
authUser: null,
currentBranch: null,   // NEW — SelectedBranch | null; session-only; NEVER in partialize

// inside actions (alongside setAuthUser, line 114)
setAuthUser: (user) => set({ authUser: user }),
setCurrentBranch: (branch) => set({ currentBranch: branch }),  // NEW

// partialize (lines 120-127) — currentBranch is deliberately ABSENT here
partialize: (state) => ({
  screen: state.screen,
  role: state.role,
  lang: state.lang,
  accent: state.accent,
  density: state.density,
  sidebarCollapsed: state.sidebarCollapsed,
  // currentBranch intentionally NOT listed — D-10
}),
```

### Pattern 2: `getMe()` throwing-contract seeding (NOT the `{data,error}` fields style)

**What:** `client.auth.getMe()` resolves `CurrentUser` directly on success, or throws `Error` with `.status` attached on failure — confirmed by reading the SDK's compiled implementation directly (`node_modules/@charlyk/admin-client/dist/index.mjs:1619-1623`):
```js
getMe: async () => {
  const result = await getCurrentUser({ client: client2 });
  if (!result.data) throw Object.assign(new Error("Get current user failed"), { status: result.response.status });
  return result.data;
}
```
This is a **different calling convention** than `client.me.branches.list()` / `client.me.branches.switch()`, which both follow the `{ data, error }` "fields" style already used everywhere else in this codebase (`use-stats.js`, `use-orders.js`, etc.). `getMe()` is closer in shape to `client.auth.getSession()`, which `auth.jsx` already calls inside a `try { } catch { }` block (see `doRefresh()`, lines 63-80, and the `signIn()` `getSession()` call, lines 149-154).
**When to use:** Every call site that invokes `getMe()` in this phase (cold-start effect, `signIn()`, the D-04 focus-retry).
**Example:**
```typescript
// Source: node_modules/@charlyk/admin-client/dist/index.mjs:1619-1623 (read directly — HIGH confidence)
try {
  const me = await adminClient.auth.getMe();
  setAuthUser(me);                        // D-05: fixes the pre-existing cold-start authUser gap
  setCurrentBranch(me.selectedBranch);    // BSTATE-01: SelectedBranch | null — both are valid states
} catch (err) {
  if (err?.status === 401) {
    expireSession();  // D-03: token truly dead — reuse existing function, no new sign-out logic
  }
  // else: non-401 (network/5xx) — D-03: stay signed in, currentBranch stays null,
  // do NOT rethrow, do NOT block paint further. D-04's focus listener is the backstop.
}
```

### Pattern 3: `useBranches()` mirrors `useStats()`'s shape exactly

**What:** A `['branches']`-keyed `useQuery` following the existing dedicated-hook-per-resource convention.
**When to use:** This is the only pattern needed for BSTATE-02 this phase — no mutation, no consumer wiring (D-08).
**Example:**
```javascript
// Source: mirrors src/use-stats.js (read directly, HIGH confidence — existing shipped code)
import { useQuery } from '@tanstack/react-query';
import { useAuth } from './auth.jsx';

export function useBranches() {
  const { client } = useAuth();
  return useQuery({
    queryKey: ['branches'],
    queryFn: async () => {
      const result = await client.me.branches.list();   // { data, error } fields style — verified
      if (result.error) throw new Error(result.error.error ?? 'Failed to load branches');
      return result.data; // AccessibleBranch[]: { id, name, slug, isDefault, isActive }
    },
    enabled: !!client,             // D-09: sole gate — NEVER add !!branchId (Pitfall 11)
    staleTime: 30_000,             // D-09: short finite window, NOT Infinity — matches useOrders/useStats precedent
    refetchOnWindowFocus: true,    // D-09/BSTATE-02: TanStack Query default handles the "focus" trigger for free
  });
}
```
Note: `client.me.branches.list()` — confirmed the exact call shape from `node_modules/@charlyk/admin-client/dist/index.mjs:1798-1801`: `branches: { list: () => getMyBranches({ client: client2 }), switch: (data) => switchMyBranch({ ...data, client: client2 }) }`. This is a namespace object (`.list`, `.switch`), not `client.me.branches()` — matches CONTEXT.md's canonical ref exactly.

### Anti-Patterns to Avoid

- **Using `if (result.error)` on `getMe()`'s return value:** `getMe()` does not return `{data, error}` — it either resolves the plain `CurrentUser` object or throws. Treating it like `use-stats.js`'s pattern will silently never catch a failure (the `.error` property will simply be `undefined` on the resolved object, and a thrown error will be an unhandled promise rejection if not wrapped in try/catch).
- **Adding `currentBranch` to `store.js`'s `partialize`:** Directly contradicts D-10 and the entire server-side-session-state model this milestone is built around — see Pitfall #4 below.
- **Gating `useBranches()` (or any future hook) on `!!branchId`:** Regresses first-paint timing for single-branch tenants — see Pitfall #5 below (D-09 explicitly forbids this).
- **Wiring `useBranches()` into `app.jsx` this phase:** Out of scope per D-08 — no screen consumer exists yet; adding one would be scope creep into Phase 16's territory.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| "Refetch this query when the window regains focus" | A custom `window.addEventListener('focus', refetch)` wired manually into `useBranches()` | TanStack Query's `refetchOnWindowFocus: true` (default `true` already, but explicit is clearer per D-09) | TanStack Query already implements this correctly (including tab-visibility edge cases) — reinventing it for `useBranches()` would duplicate framework behavior and risk missing the visibility-vs-focus distinction the library already handles. |
| "Detect the branch is still unresolved after a while and retry" | A polling `setInterval` loop calling `getMe()` on a timer | The D-04 `window` `'focus'` listener, scoped narrowly (only fires while `currentBranch` is still null AND a session exists) | Matches the milestone's stated anti-pattern list (STACK.md/FEATURES.md both explicitly reject polling for branch-related state) and the PRD's own recommended trigger set (focus + error, not timers). |
| "Compose a display name from first/last name, falling back gracefully" | A generic `formatFullName()` utility library | A 1-line inline expression in `shell.jsx` (see Code Examples §4) | This is a single, narrow use site (one line in `shell.jsx`); D-06 explicitly says "keep the change minimal and additive" — a utility module would be over-engineering for one call site. |

**Key insight:** Every piece of "don't hand-roll" guidance in this phase points the same direction: use what TanStack Query, Zustand, and the SDK already give you for free rather than adding bespoke polling/interceptor/formatting layers. This phase's entire job is plumbing two already-declared SDK fields into two already-existing state slots.

## Common Pitfalls

### Pitfall 1: Treating `getMe()` like the `{data,error}` fields-style calls

**What goes wrong:** Code written as `const result = await client.auth.getMe(); if (result.error) { ... }` never enters the error branch — `getMe()` resolves the plain `CurrentUser` object (which has no `.error` property) or throws. A `getMe()` failure written this way becomes an unhandled promise rejection instead of a caught, handled D-03 branch.
**Why it happens:** Every *other* SDK call in this codebase (`use-orders.js`, `use-stats.js`, `client.me.branches.list()`) follows the `{data,error}` "fields" convention, so it's a natural (and here, incorrect) assumption that `getMe()` does too.
**How to avoid:** Wrap every `getMe()` call site in `try { } catch (err) { }`, matching the pattern `auth.jsx` already uses for `getSession()` (lines 63-80, 149-154) and `signIn()`'s own catch block (lines 156-165, which already reads `err?.status`). Check `err?.status === 401` for the D-03 branch — the thrown `Error` carries a `.status` property attached from `result.response.status` (confirmed from `index.mjs:1621`).
**Warning signs:** A cold-start `getMe()` failure (e.g., simulated by a mocked network error in a test) doesn't route through `expireSession()` on a genuine 401, or crashes the app with an unhandled rejection on any failure.

### Pitfall 2: Cold-start effect not actually blocking `setColdStartBusy(false)`

**What goes wrong:** If the new `getMe()` call is fired-and-forgotten (not `await`ed) inside the cold-start `useEffect`, `setColdStartBusy(false)` (currently at `auth.jsx:121`, inside the `finally` block) executes before `getMe()` resolves — the app paints with `currentBranch` still `null` even on the happy path, defeating D-01/D-02's entire "resolve inside the existing blank gate" design.
**Why it happens:** The existing cold-start effect's `finally { setColdStartBusy(false); }` (line 120-122) runs after the `try` block completes — inserting `getMe()` *before* the `finally` naturally works, but a careless edit (e.g., adding it as a non-awaited call, or adding it *after* `setColdStartBusy(false)` by mistake) silently breaks the blocking guarantee.
**How to avoid:** Insert the `await adminClient.auth.getMe()` call (wrapped in its own try/catch per Pitfall 1) inside the existing `try` block, after `setIsAuthenticated(true)` (line 116) and before the outer `try` block's end — so it executes before the `finally`'s `setColdStartBusy(false)` runs, exactly as D-01 specifies.
**Warning signs:** Manual test: restart the app with a remembered session and watch whether the sidebar/switcher-adjacent area (once Phase 16 adds it) ever shows a "flash" of no-branch state before settling — under D-01's design, it should not, because the branch is already resolved by the time first paint happens.

### Pitfall 3: `authUser` cold-start fix accidentally scoped too broadly

**What goes wrong:** D-05 fixes a *pre-existing* gap (cold start never called `setAuthUser`) as a byproduct of adding `getMe()` for branch seeding. It would be easy to over-scope this into "also fix `signIn()`'s user object shape entirely" or other adjacent cleanup not requested by this phase.
**Why it happens:** Touching `auth.jsx`'s identity-seeding code naturally surfaces other related-looking gaps.
**How to avoid:** D-05/D-06 scope the fix narrowly: `getMe()`'s response populates `authUser` on cold start (previously never happened) and `shell.jsx`'s `displayName` mapping is updated to read `firstName`/`lastName` instead of a nonexistent `authUser.name`. Nothing else in the identity/auth surface should change this phase — `signIn()`'s existing `setAuthUser(user)` call (line 147, using `signInResult.user`) is explicitly left as planner's discretion (keep as an optimistic fill, or replace with `getMe()`'s result) but the *shape reconciliation* (D-06) must handle both possible sources correctly regardless of which one wins.
**Warning signs:** A diff for this phase touches unrelated `auth.jsx` logic (refresh timer, `doRefresh()`, `signOut()`) — those are out of scope.

### Pitfall 4: Adding `currentBranch` to `partialize` "just to avoid a flash"

**What goes wrong:** The natural instinct to make the branch label "instant" on next launch (avoid waiting on `getMe()`) is to persist it — this is explicitly the anti-pattern D-10/Pitfall 10 (research) calls out. A persisted stale branch would render before the first `getMe()` call corrects it, and worse, an implementation might be tempted to use the persisted value as a gate or key before the authoritative fetch resolves — precisely the drift this milestone's server-side-session model is designed to prevent.
**Why it happens:** `store.js`'s `partialize` list looks identical in shape whether a field is a legitimate local preference (`lang`, `density`) or a cached copy of remote state (`currentBranch`) — the code pattern ("add a key, add it to partialize") doesn't visually distinguish the two.
**How to avoid:** Treat `currentBranch` exactly like `authUser`/`isAuthenticated` (already correctly session-only per the store's own header comment) — never add it to the `partialize` return object. D-01's blocking cold-start design (branch resolves inside the *existing* blank gate) is the sanctioned way to avoid a "flash," not persistence.
**Warning signs:** Code review finds `currentBranch` (or any branch-derived field) inside `store.js`'s `partialize` function body.

### Pitfall 5: Gating `useBranches()` on `!!branchId` "to be safe"

**What goes wrong:** Since `currentBranch` might be `null` for a beat after a `getMe()` failure (D-03's non-401 path), it's tempting to add `enabled: !!client && !!currentBranch` to `useBranches()`. This regresses first-paint timing and, more importantly, is logically backwards — `useBranches()` fetches the *list of branches available to switch to*, which has no dependency on `currentBranch` being resolved at all; a user with `currentBranch: null` (e.g., mid-`NO_BRANCH_ACCESS`, or a transient `getMe()` failure) still benefits from the list loading independently.
**Why it happens:** "Branch-aware" naturally makes every new query's `enabled` condition feel like it should grow a branch-related clause — but `useBranches()` is the one hook this phase builds that genuinely has no such dependency.
**How to avoid:** `enabled: !!client` only, exactly as D-09 states and exactly as `use-stats.js`/`use-orders.js` already do for their own `enabled` gates. This is also the standing Pitfall 11 regression check that applies across the entire v1.2 milestone.
**Warning signs:** `useBranches()`'s `enabled` clause references `currentBranch` or `branchId` in any form.

## Code Examples

Verified patterns from this codebase's own shipped source, read directly:

### 1. Cold-start effect — full modified shape (illustrative, not exhaustive)

```javascript
// Source: src/auth.jsx (existing cold-start effect, lines 106-128) — pattern to extend
useEffect(() => {
  (async () => {
    try {
      const token = await readToken();
      if (!token) return;
      tokenRef.current = token;
      setToken(token);
      const adminClient = createAdminClient({ baseUrl: BASE_URL, sessionToken: token });
      setClient(adminClient);
      setIsAuthenticated(true);

      // NEW (BSTATE-01, D-01/D-03/D-05): seed authUser + currentBranch before painting.
      try {
        const me = await adminClient.auth.getMe();
        setAuthUser(me);
        setCurrentBranch(me.selectedBranch);
      } catch (err) {
        if (err?.status === 401) {
          expireSession(); // D-03: token truly dead
        }
        // else: non-401 — stay signed in, currentBranch stays null (D-03), D-04 backstop retries
      }
    } catch (e) {
      console.error('[auth:cold] token read failed:', e?.message ?? e);
    } finally {
      setColdStartBusy(false); // MUST run after getMe() resolves/throws — Pitfall 2
    }
  })();
  return () => { if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current); };
}, []); // eslint-disable-line react-hooks/exhaustive-deps
```

### 2. D-04 focus-retry listener — no existing precedent in this codebase (net new)

```javascript
// Source: net-new pattern — this codebase currently only has 'mousedown'/'keydown' listeners
// (src/shell.jsx:27, src/screen-history.jsx:678-679), no existing 'focus' listener to mirror.
// Placed inside AuthProvider, reading currentBranch from the Zustand store directly.
useEffect(() => {
  function handleFocus() {
    const { isAuthenticated, currentBranch } = useAppStore.getState();
    if (!isAuthenticated || currentBranch || !client) return;
    client.auth.getMe()
      .then((me) => {
        setAuthUser(me);
        setCurrentBranch(me.selectedBranch);
      })
      .catch(() => { /* non-fatal — will retry on next focus event */ });
  }
  window.addEventListener('focus', handleFocus);
  return () => window.removeEventListener('focus', handleFocus);
}, [client]); // re-bind when client identity changes (new token/session)
```

### 3. `useBranches()` — new file, mirrors `use-stats.js` exactly

```javascript
// Source: mirrors src/use-stats.js (read directly, existing shipped code)
import { useQuery } from '@tanstack/react-query';
import { useAuth } from './auth.jsx';

export function useBranches() {
  const { client } = useAuth();
  return useQuery({
    queryKey: ['branches'],
    queryFn: async () => {
      const result = await client.me.branches.list();
      if (result.error) throw new Error(result.error.error ?? 'Failed to load branches');
      return result.data; // AccessibleBranch[]
    },
    enabled: !!client,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });
}
```

### 4. `shell.jsx` displayName fix (D-06)

```javascript
// Source: src/shell.jsx:31 (existing line) — before:
// const displayName = authUser?.name ?? authUser?.email ?? 'Eduard Albu';

// After (D-06): authUser now potentially comes from getMe()'s CurrentUser shape
// { firstName: string|null, lastName: string|null, email, ... } instead of a flat `.name`.
const displayName =
  [authUser?.firstName, authUser?.lastName].filter(Boolean).join(' ') ||
  authUser?.name ||           // keep as a fallback in case signIn()'s optimistic user object is used
  authUser?.email ||
  'Eduard Albu';               // existing final fallback, unchanged
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|---------------|--------|
| Cold start trusts stored token blindly, never calls `getMe()`/`getSession()` | Cold start calls `getMe()` (awaited, blocking) before releasing `coldStartBusy` | This phase (v1.2, Phase 13) | `authUser` and `currentBranch` are now populated on every relaunch with a remembered session, not only after interactive sign-in — closes a pre-existing gap (D-05) as a byproduct of the branch work |
| `authUser?.name` (a field that no `CurrentUser`-sourced object actually has) | `firstName`/`lastName` composition with `.name`/`.email` fallbacks | This phase (D-06) | Prevents `displayName` silently falling through to `authUser?.email` (or the hardcoded default) for every `getMe()`-sourced user, since `.name` never exists on `CurrentUser` |

**Deprecated/outdated:**
- The external API PRD's claim that `getMe()` lacks `role`/`selectedBranchId` — contradicted by the installed `v1.1.67` SDK types (`CurrentUser` already includes both `role` and `selectedBranch`). Trust `node_modules/@charlyk/admin-client/dist/index.d.ts` over the PRD prose (D-11, already resolved by prior research — re-confirmed in this pass by reading the type file directly).

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `staleTime: 30_000` is a reasonable default for `useBranches()` (matching `useOrders`/`useStats` precedent) | Standard Stack, Code Examples §3 | Low — D-09 explicitly leaves the exact value to planner's discretion; if wrong, it's a one-line follow-up tweak, not a design flaw. Not user-facing risk either way since branch access changes are rare. |
| A2 | The D-04 focus listener should live as a `useEffect` inside `AuthProvider` (not a separate module) | Code Examples §2 | Low — this matches D-04's explicit instruction ("self-contained in the auth layer"); if the planner chooses a different internal structure, the requirement (retry on focus while session exists and branch is null) is unaffected. |

**If this table is empty:** N/A — two low-risk implementation-detail assumptions are logged above; both were explicitly left to planner's discretion by CONTEXT.md and carry no compliance/security/data-integrity risk.

## Open Questions

1. **Should `signIn()` keep `signInResult.user` as an immediate optimistic fill, or wait for `getMe()`?**
   - What we know: CONTEXT.md's Claude's Discretion section explicitly defers this to the planner. `signIn()` currently sets `setAuthUser(user)` at line 147 using `signInResult.user ?? signInResult.profile ?? null` — a shape that may or may not match `CurrentUser`.
   - What's unclear: Whether `signInResult.user`'s shape is close enough to `CurrentUser` that keeping it as an optimistic fill (then overwriting with `getMe()`'s result) causes any visible flicker in `displayName` (e.g., if `signInResult.user` has a `.name` field but `getMe()`'s `CurrentUser` doesn't).
   - Recommendation: Either approach is safe given Code Example §4's fallback chain handles both shapes gracefully. Planner should pick based on whichever produces a cleaner diff; this is not a correctness-affecting decision.

2. **Exact wording/UX for the D-04 focus-retry — silent or user-visible?**
   - What we know: D-04 specifies the retry mechanism (window focus, re-call `getMe()` while `currentBranch` is null) but not whether this should be silent (no toast, no loading indicator) or surface anything to the user.
   - What's unclear: Whether staff should see any feedback during the retry window, given no consumer of `currentBranch` exists yet this phase (D-08) — there's no switcher UI to show a loading state in anyway.
   - Recommendation: Silent retry is correct for this phase — since nothing consumes `currentBranch` yet (Phase 16 builds the switcher), there is no UI surface to show feedback in. Confirm this stays true when Phase 16 plans its own UX around `currentBranch` still being null after a switch/relaunch.

## Environment Availability

Skipped — this phase has no external tool/service dependencies beyond the already-installed, already-verified npm packages (`@charlyk/admin-client`, `@tanstack/react-query`, `zustand`), all confirmed present via `package.json` and `node_modules`. No database, Docker, CLI tool, or runtime version dependency is introduced.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.5 + @testing-library/react 16.3.2 `[VERIFIED: package.json]` |
| Config file | Vite-integrated (no separate `vitest.config.js` found; uses `vite.config.js`'s `test` block or defaults) |
| Quick run command | `npx vitest run src/__tests__/auth.test.jsx src/__tests__/auth-token.test.jsx src/__tests__/store.test.js` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| BSTATE-01 | Cold start with remembered session calls `getMe()` and seeds `currentBranch` + `authUser` before paint | unit (renderHook, mocked `createAdminClient`) | `npx vitest run src/__tests__/auth-token.test.jsx` (extend) | ✅ Wave 0 extends existing file — pattern already present (`auth-token.test.jsx` mocks `createAdminClient`/`load` exactly as needed) |
| BSTATE-01 | 401 from cold-start `getMe()` routes to `expireSession()`; non-401 stays signed in with `currentBranch: null` | unit | `npx vitest run src/__tests__/auth.test.jsx` (new describe block) | ❌ Wave 0 — new test cases needed |
| BSTATE-01 | `signIn()` seeds `currentBranch` via `getMe()`; a `getMe()` failure post-signIn is non-fatal | unit | `npx vitest run src/__tests__/auth-token.test.jsx` (extend U10b-style block) | ❌ Wave 0 — new test cases needed |
| BSTATE-01 | `currentBranch` never appears in `store.js`'s persisted `partialize` output | unit | `npx vitest run src/__tests__/store.test.js` (extend) | ❌ Wave 0 — new assertion needed |
| BSTATE-02 | `useBranches()` fetches via `client.me.branches.list()`, `enabled: !!client`, no `!!branchId` gate | unit (renderHook + QueryClientProvider, mirrors `use-orders.test.js`) | `npx vitest run src/__tests__/use-branches.test.js` | ❌ Wave 0 — new file, new hook |
| BSTATE-02 | `useBranches()` sets `refetchOnWindowFocus: true` and a finite `staleTime` (not `Infinity`) | unit | same file as above | ❌ Wave 0 — new file |

### Sampling Rate

- **Per task commit:** `npx vitest run <touched test files>`
- **Per wave merge:** `npx vitest run` (full suite — this phase touches shared files `auth.jsx`/`store.js`/`shell.jsx` that other tests depend on; a full-suite run catches regressions in `auth-schedule.test.js`, `use-sse.test.js`, etc.)
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `src/__tests__/use-branches.test.js` — new file, covers BSTATE-02 (mirror `src/__tests__/use-orders.test.js`'s mocking pattern: `vi.mock('../auth.jsx', () => ({ useAuth: vi.fn() }))`, `renderHook` + `QueryClientProvider` wrapper)
- [ ] New describe block(s) in `src/__tests__/auth.test.jsx` or `src/__tests__/auth-token.test.jsx` — covers the D-01/D-03/D-05 cold-start `getMe()` seeding + 401-vs-non-401 branching (mirror `auth-token.test.jsx`'s existing `createAdminClient.mockReturnValue({ auth: { getSession: ... } })` pattern, extended with a mocked `getMe`)
- [ ] New assertion in `src/__tests__/store.test.js` — confirms `currentBranch` is absent from the persisted `partialize` shape (D-10 regression guard)
- [ ] Framework install: none — Vitest/Testing Library already fully configured and used across 4+ existing test files in this exact domain (`auth.test.jsx`, `auth-token.test.jsx`, `auth-schedule.test.js`, `store.test.js`)

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes (adjacent) | No new authentication mechanism — `getMe()` reuses the existing Bearer-token session already established by `signIn()`/cold-start token restore. No credential handling changes. |
| V3 Session Management | yes | `currentBranch` is explicitly session-only, never persisted (D-10) — this phase reinforces rather than weakens session-boundary discipline; a stale/tampered locally-cached branch value cannot exist because none is ever written to disk. |
| V4 Access Control | no (deferred) | Branch-access enforcement (403 `BRANCH_INACTIVE`/`BRANCH_ACCESS_REVOKED`/`NO_BRANCH_ACCESS`) is explicitly out of scope for this phase (Phase 17) — this phase only *reads* `selectedBranch`, it does not enforce or gate anything on it yet. |
| V5 Input Validation | n/a | No user-supplied input in this phase — `getMe()`/`me.branches.list()` take no parameters from user input. |
| V6 Cryptography | no | Not applicable — no new crypto/token-handling logic; reuses the existing Bearer-token session. |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Client-cached stale authorization state (a persisted `currentBranch` surviving a server-side revocation) | Tampering / Information Disclosure (stale-trust) | D-10: never persist `currentBranch`; always re-derive from `getMe()` on every cold start — already the design of this phase, not a gap to close. |
| Unhandled promise rejection on `getMe()` failure crashing the cold-start flow (denial of service to the user's own session) | Denial of Service (self-inflicted) | Pitfall #1's try/catch requirement — every `getMe()` call site in this phase must be wrapped, per D-03's explicit non-401 "stay signed in" behavior. |

## Sources

### Primary (HIGH confidence)

- `node_modules/@charlyk/admin-client/dist/index.d.ts` (installed v1.1.67, read directly) — `AccessibleBranch` (line 670), `SelectedBranch` (line 677), `CurrentUser` (line 684), `GetMyBranchesResponses` (line 1987), `SwitchMyBranchData`/`Errors`/`Responses` (lines 1994-2023), `AdminClient.auth.getMe()` signature (line 5050), `AdminClient.me.branches` namespace (lines 5218-5223) `[VERIFIED: npm registry — package already installed and pinned in package.json]`
- `node_modules/@charlyk/admin-client/dist/index.mjs` (installed v1.1.67, read directly) — `getMe()`'s actual throwing implementation (lines 1619-1623, confirms it is NOT `{data,error}` style), `me.branches.{list,switch}` implementation (lines 1798-1801, confirms namespace-with-methods shape) `[VERIFIED: read directly from installed compiled output]`
- `src/auth.jsx`, `src/store.js`, `src/shell.jsx`, `src/app.jsx`, `src/use-stats.js`, `src/use-sse.js`, `src/use-orders.js`, `src/use-menu.js`, `src/use-restaurant-settings.js`, `src/use-delivery-areas.js`, `src/use-history-orders.js` — this repo, read directly, 2026-07-22, confirming every line number cited in `13-CONTEXT.md` and establishing the `staleTime`/`queryKey` precedent table
- `src/__tests__/auth.test.jsx`, `src/__tests__/auth-token.test.jsx`, `src/__tests__/use-orders.test.js`, `src/__tests__/store.test.js` — this repo, read directly, establishing the existing mocking/testing conventions this phase's new tests must follow
- `.planning/phases/13-branch-state-launch-seeding-foundation/13-CONTEXT.md` — locked D-01 through D-11 decisions, verified against the actual codebase with zero drift found
- `.planning/REQUIREMENTS.md` (BSTATE-01 line 12, BSTATE-02 line 13), `.planning/STATE.md` (v1.2 Key Decisions, Critical Watch-Outs)

### Secondary (MEDIUM confidence)

- `.planning/research/SUMMARY.md`, `PITFALLS.md`, `ARCHITECTURE.md`, `STACK.md`, `FEATURES.md` (all dated 2026-07-21, HIGH confidence per their own metadata) — milestone-level research already cited by CONTEXT.md; re-read in full during this phase-level pass to extract only the Phase-13-relevant subset (launch seeding, `useBranches()`, Pitfalls 9/10/11) and cross-check against currently-installed SDK types

### Tertiary (LOW confidence)

- None — every claim in this document traces to either the installed SDK's compiled source/types (read directly) or this repo's own shipped code (read directly). No web search was needed for this phase's domain.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — zero new dependencies, all three libraries already pinned and installed; SDK call shapes read directly from compiled `.mjs`/`.d.ts` output, not inferred
- Architecture: HIGH — directly mirrors the already-shipped `authUser` pattern (store.js/auth.jsx) and the already-shipped `useStats()` hook shape; every cited line number re-verified against current source in this research pass
- Pitfalls: HIGH — the `getMe()` throwing-contract finding (Pitfall #1) was independently discovered in this research pass by reading the compiled SDK source directly, not carried forward from milestone research (which did not surface this distinction) — this is the single most load-bearing new finding for correct implementation

**Research date:** 2026-07-22
**Valid until:** 30 days (stable — SDK version pinned, no external API changes expected within this window; re-verify if `@charlyk/admin-client` is bumped past `^1.1.67` before this phase executes)
