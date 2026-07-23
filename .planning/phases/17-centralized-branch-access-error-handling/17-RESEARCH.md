# Phase 17: Centralized Branch-Access Error Handling - Research

**Researched:** 2026-07-23
**Domain:** TanStack Query v5 global error interception, SDK error-envelope verification, SSE retry suppression, window-focus revalidation — in a Tauri/React/Zustand POS app
**Confidence:** MEDIUM — the choke-point architecture and every wiring seam are HIGH confidence (read directly from installed source and the SDK's compiled type declarations); the one load-bearing unknown (the literal runtime string inside the 403 error envelope) is explicitly LOW confidence and gated behind a build-time verification task.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**NO_BRANCH_ACCESS full-screen block (BERR-03)**
- **D-01:** Minimal message + Retry screen — headline ("No branch available") + one guidance line ("Ask your manager to assign you a branch") + a Retry button. Sidebar/nav hidden; nothing else reachable. Chosen over a full branded/login-style gate screen. Uses existing design tokens (`assets/colors_and_type.css`) and the app's error/empty-state conventions.
- **D-02:** Clears itself the moment a branch becomes accessible, via two triggers: (a) auto-revalidation on window focus (reuses BERR-04 path), (b) a manual Retry button. Rejected "auto-on-focus only" and "add Sign out" (over-scoped).

**Recoverable-code recovery — INACTIVE / REVOKED (BERR-01/02)**
- **D-03:** Distinct per-code toast copy. `BRANCH_ACCESS_REVOKED` → "Your access to `<branch>` was removed."; `BRANCH_INACTIVE` → "`<branch>` is no longer active." Both direct the user to "pick another branch." Same reopen+refetch behavior for both. Exact wording/i18n keys are Claude's discretion, keeping RO+EN parity.
- **D-04:** After a recoverable 403, the auto-reopened switcher is **dismissible** — pops open via `branchSwitcherForceOpen` showing the refetched list, but the user can close it and keep working on a valid branch. Reversible — a single `branchSwitcherForceOpen` set consumed by the existing Phase 16 popover.
- **D-05:** The central handler owns all three `BRANCH_*` codes. Phase 16's `app.jsx` `fireSwitch` generic error toast (~`app.jsx:217-227`) is trimmed to fire only for non-branch switch failures (400 validation, network, unknown). A switch-call 403 flows through the same `handleBranchError` as a 403 from any later request — one implementation, two triggers, guaranteeing exactly one recovery per failure and no double toast. **Costly to reverse** — this is the linchpin of the "one central path" requirement; splitting handling back out per-call-site reintroduces Anti-Pattern 3.

**Window-focus revalidation (BERR-04)**
- **D-06:** On focus, revalidation compares the server's selected branch (via `getMe().selectedBranch`) to what the app shows:
  - Access revoked/branch inactive → route through the recovery path (D-03/D-04, or the D-01 block if it's the last branch).
  - Branch changed to a different but still-valid branch on another device → silently adopt the server's branch (`setCurrentBranch`) and show a neutral info toast ("Now showing `<branch>`"). Rejected "adopt silently, no notice" and "reopen switcher on any remote change." Reversible — adoption is a single `setCurrentBranch`; the info toast reuses `pushToast`.
- **D-07:** Extends the existing D-04 window-`focus` listener in `auth.jsx:167-180`, which today only re-seeds when `currentBranch` is null. Phase 17 must make it revalidate even when a branch is already set. Throttle/debounce is Claude's discretion.

**SSE stream 403 routing (SC2)**
- **D-08:** SSE errors don't flow through TanStack's `onError`, so the stream needs its own hook. In `use-sse.js` `onopen`, when a non-2xx response carries a `BRANCH_*` code, call the same `handleBranchError` (toast/reopen for recoverable codes, or the D-01 block for `NO_BRANCH_ACCESS`) **and STOP retrying** — do not rethrow into `fetchEventSource`'s retry loop / do not abort in a way that re-triggers backoff. Non-branch errors keep today's throw→`onerror`→retry behavior untouched. **Costly to reverse** — the retry-suppression invariant prevents an infinite-backoff loop against an inaccessible branch.

### Claude's Discretion

- Final toast wording + the RO/EN i18n key set for all new messages (D-03 per-code copy, D-01 block copy, D-06 info toast) — keeping to existing i18n conventions. **Resolved by `17-UI-SPEC.md`'s Copywriting Contract** (see below) — treat those exact strings as the source of truth.
- Exact layout/markup of the `NO_BRANCH_ACCESS` block screen (D-01), within existing design tokens and error/empty-state conventions. **Resolved by `17-UI-SPEC.md`** (mirrors `EmptyBlock`'s minimal, box-less convention, not a floating card).
- The focus-revalidation throttle/debounce guard and whether revalidation reuses `useBranches`'s `refetchOnWindowFocus` or an explicit `getMe()` call — note: the list refetch alone does not detect a selected-branch change, so an explicit `selectedBranch` comparison is likely required (D-06).
- The precise shape of `handleBranchError` (where it lives — `use-branches.js` per research, vs a new `sdk-helpers.js`) and how it reads `queryClient`/store setters.
- Whether `NO_BRANCH_ACCESS` also tears down the live SSE stream/stops other polling while the block is up — consistent with D-08's stop-retrying intent.

### Deferred Ideas (OUT OF SCOPE)

- Sign-out escape hatch on the `NO_BRANCH_ACCESS` block — considered (D-02) and left out; could be added later if a "hand off to another login" workflow becomes real.
- Richer timeout-fallback affordance (a retry button in the OfflineBanner after a Phase 16 D-09 overlay timeout) — surfaced in Phase 16's deferred list; a natural fold into this phase's recovery UI but NOT required by BERR-01–04, left for a follow-up unless trivially adjacent.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| BERR-01 | `BRANCH_INACTIVE`/`BRANCH_ACCESS_REVOKED` (403) — whether from the switch call or any later branch-scoped request — handled through one central path: toast, switcher reopened, branch list refetched | `## The Central Choke Point` (QueryCache/MutationCache `onError` wiring) + `## SSE 403 Routing` (the one path that bypasses TanStack) |
| BERR-02 | A rejected switch (403) leaves the app on the previously-selected branch, with no change beyond the error notice | Already satisfied by existing `useBranchSwitch`'s non-optimistic `onSuccess`-only `setCurrentBranch` (Phase 16) — `handleBranchError` firing via `MutationCache.onError` does not itself touch `currentBranch`; no code changes needed for BERR-02 beyond confirming this invariant holds |
| BERR-03 | `NO_BRANCH_ACCESS` (403 — zero accessible branches) shows a distinct full-screen blocking state | `## NO_BRANCH_ACCESS Block Wiring` + `17-UI-SPEC.md` (design contract, already approved) |
| BERR-04 | Selected branch revalidated on window focus, catching a remote branch change/revocation | `## Window-Focus Revalidation` (extending `auth.jsx:167-180`) |
</phase_requirements>

## Summary

This phase's architecture is almost entirely pre-decided by `CONTEXT.md` and `ARCHITECTURE.md §6` — there is no alternative-exploration to do here. What remains is confirming the exact shapes of the seams this phase wires together, several of which now exist in the codebase in a more evolved form than the original architecture doc predicted (Phases 14–16 already shipped and adjusted the design in flight — e.g., `useSSE`'s signature is `useSSE(token, onLiveOrder)` reading `branchId` internally via the store, not the `useSSE(token, branchId, onLiveOrder)` the architecture doc sketched).

**The one genuine unknown, and it is load-bearing for the entire phase:** `err.code` is currently populated from the SDK's raw error string itself, not a separate enum field. `unwrapSdkResult` (`data.jsx:200-209`) and `useBranchSwitch` (`use-branches.js:31-40`) both do `err.code = message` where `message = (typeof raw === 'string' ? raw : raw?.error) ?? fallback`. The installed SDK's compiled type (`node_modules/@charlyk/admin-client/dist/index.d.ts:1239-1241`) declares the error envelope as `type Error = { error: string }` — a bare `string`, not a literal union `'BRANCH_INACTIVE' | 'BRANCH_ACCESS_REVOKED' | 'NO_BRANCH_ACCESS'`. **The TypeScript surface cannot confirm whether the runtime value is the literal enum code or a human-readable sentence** (e.g. `"Branch is inactive"` vs `"BRANCH_INACTIVE"`) — that is a live-API-only fact. This exact ambiguity was flagged and left unresolved by both the Phase 15 CONTEXT (`use-sse.js` D-06 capture scaffold) and the ROADMAP's own Phase 15 planning note ("the exact 403 signal shape ... is unverified from documentation alone"). Phase 17 must not lock the matcher without either (a) a live 403 captured during planning/execution, or (b) an explicit build-time verification task in the plan that gates the matcher's final form.

Everything else is concrete and ready to plan directly: the global `QueryCache`/`MutationCache` choke point in `main.jsx` (currently a bare `new QueryClient()`), the SSE `onopen` extension in `use-sse.js` (the Phase 15 capture scaffold at lines 54-66, already reading `response.text()` and console-warning), the `auth.jsx` window-focus listener extension (currently gated on `!currentBranch`, needs generalizing to always-revalidate), and `handleBranchError`'s placement (`use-branches.js`, reading `useAppStore.getState()` directly — never hooks — so it is callable from `main.jsx`'s module scope).

**Primary recommendation:** Wire `QueryCache`/`MutationCache` `onError` in `main.jsx` to a new `handleBranchError(err, queryClient)` exported from `use-branches.js`. It matches `err.code` against the three literal strings, reads/writes `useAppStore.getState()` directly, and is invoked from exactly two call sites in source (TanStack's global `onError` — which transparently covers both ordinary-query 403s AND the switch mutation's 403, since `MutationCache.onError` fires for every mutation including `useBranchSwitch` — and `use-sse.js`'s `onopen` non-2xx branch). No third call site is needed; the "one central path" requirement is satisfied by construction because `MutationCache.onError` already subsumes the switch-call case.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| 403 error-code detection (ordinary requests) | API/Backend (data layer: `data.jsx` `unwrapSdkResult`) | — | Already attaches `err.code`; this phase only *consumes* it, doesn't change extraction |
| 403 error-code detection (switch mutation) | API/Backend (data layer: `use-branches.js` `useBranchSwitch`) | — | Same convention, already attached |
| 403 error-code detection (SSE stream) | API/Backend (`use-sse.js` `onopen`) | — | Raw `Response`, not SDK-unwrapped — needs its own body-parse, independent of `unwrapSdkResult` |
| Central recovery dispatch (`handleBranchError`) | API/Backend layer (`use-branches.js`) | Browser/Client (Zustand store writes) | Pure function callable from module scope (no React hooks) — sits at the data-layer/state-layer seam |
| Toast display (per-code copy) | Browser/Client (Zustand `toasts` → `app.jsx` render) | — | Existing toast-stack rendering pattern, unmodified |
| Branch switcher reopen | Browser/Client (`shell.jsx` `branchMenuOpen` local state, driven by `store.js` `branchSwitcherForceOpen`) | — | Presentation-only; Shell already deviates from strict "prop-driven" by calling `useBranches()` directly (Phase 16 precedent, logged as a "Rule 3 deviation") |
| `NO_BRANCH_ACCESS` full-screen block | Browser/Client (`app.jsx` top-level gate, replacing `<Shell>`) | — | Page-level state, not a per-screen concern; supersedes the screen router entirely |
| Window-focus revalidation | Browser/Client (`auth.jsx` `focus` listener) | API/Backend (`getMe()` round-trip) | Client-side event triggers a server round-trip; comparison logic lives client-side |
| `['branches']` refetch on recovery | API/Backend (TanStack Query cache) | — | Existing `useBranches()` query, just invalidated from a new call site |

## Standard Stack

No new packages this phase — zero new dependencies, per CLAUDE.md's "SDK is the only data layer" rule and the milestone's "zero new dependencies" framing. This phase is pure wiring of already-installed libraries.

### Core
| Library | Version (verified installed) | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@tanstack/react-query` | `5.99.2` [VERIFIED: node_modules/@tanstack/react-query/package.json] | `QueryCache`/`MutationCache` global `onError` choke point | v5 is the only major version where `QueryCache`/`MutationCache` accept a constructor-level `onError` callback covering every query/mutation in the client — exactly the "one central path" BERR-01 requires |
| `@microsoft/fetch-event-source` | `2.0.1` [VERIFIED: node_modules/@microsoft/fetch-event-source/package.json] | SSE transport whose `onopen` receives the raw `Response` for branch-error inspection | Already the app's sole SSE client (Phase 3, for Bearer-header support); this phase changes only the `onopen` handler's control flow, not the transport |
| `@charlyk/admin-client` | `1.1.67` [VERIFIED: node_modules/@charlyk/admin-client/package.json] | Source of the `{ error: string }` 403 envelope this whole phase reacts to | Confirms no SDK version bump occurred since Phase 14/15/16 — the error-envelope shape already relied upon by `unwrapSdkResult` is unchanged |

**Installation:** none — no new packages.

## Package Legitimacy Audit

Not applicable — this phase installs zero new external packages (verified against `package.json`/`package-lock.json`; all three libraries above are pre-existing, already-audited dependencies from Phases 3, 13, and 16).

## Architecture Patterns

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│ Any branch-scoped request                                           │
│  (useOrders / useMenu / useStats / .../ useBranchSwitch.mutate)     │
│         │                                                            │
│         ▼                                                            │
│  unwrapSdkResult(result, fallback)  [data.jsx:200-209]               │
│    if (result.error) → throw Error with .code = raw.error string    │
│    (useBranchSwitch has its own inline copy of this exact pattern)  │
│         │                                                            │
│         ▼                                                            │
│  TanStack QueryCache / MutationCache onError  ◄── NEW (main.jsx)    │
│    onError: (err) => handleBranchError(err, queryClient)            │
│    fires for BOTH failed queries AND failed mutations —              │
│    the switch-call 403 and a later-request 403 land HERE, together  │
│         │                                                            │
│         ▼                                                            │
│  handleBranchError(err, queryClient)  ◄── NEW (use-branches.js)     │
│    if (!BRANCH_CODES.includes(err.code)) return;                    │
│    switch (err.code) {                                               │
│      case 'BRANCH_INACTIVE':                                         │
│      case 'BRANCH_ACCESS_REVOKED':                                   │
│        pushToast(perCodeCopy) + setBranchSwitcherForceOpen(true)    │
│          + queryClient.invalidateQueries(['branches'])               │
│        break;                                                        │
│      case 'NO_BRANCH_ACCESS':                                        │
│        setNoBranchAccess(true)   ── NEW store flag                  │
│        break;                                                        │
│    }                                                                  │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│ SSE stream — bypasses TanStack's onError entirely                   │
│                                                                       │
│  fetchEventSource onopen(response)                                   │
│    if (response.ok) { ...existing snapshot logic... ; return; }      │
│    body = await response.text();  ← Phase 15 scaffold already reads │
│    code = extractBranchCode(body) ── NEW parse                       │
│    if (BRANCH_CODES.includes(code)) {                                │
│      handleBranchError({ code }, queryClient)  ── same function     │
│      return;  ← DO NOT throw — this is what stops the retry loop    │
│    }                                                                  │
│    console.warn(...); throw new Error(...)  ← unchanged non-branch  │
│                                              path, still retries     │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│ Window focus revalidation (auth.jsx)                                 │
│                                                                       │
│  window 'focus' event                                                │
│    │                                                                  │
│    ▼                                                                  │
│  handleFocus() — generalized from "only if currentBranch is null"   │
│    to "always revalidate"                                            │
│    │                                                                  │
│    ▼                                                                  │
│  me = await client.auth.getMe()   [throws on 401, not {data,error}]  │
│    │                                                                  │
│    ├── me.selectedBranch === null                                    │
│    │     → route to NO_BRANCH_ACCESS block (same as handleBranchError)│
│    ├── me.selectedBranch.id === currentBranch.id                      │
│    │     → no-op (still the same branch)                              │
│    └── me.selectedBranch.id !== currentBranch.id                      │
│          → setCurrentBranch(me.selectedBranch) silently               │
│            + pushToast(neutral "Now showing <branch>")                 │
└─────────────────────────────────────────────────────────────────────┘
```

### Recommended Project Structure

No new files. Modifications only, per `CONTEXT.md`'s `<canonical_refs>` files-changed list:
```
src/
├── main.jsx              # MODIFIED — QueryCache/MutationCache onError wiring
├── use-branches.js       # MODIFIED — handleBranchError() added, exported
├── app.jsx               # MODIFIED — fireSwitch trim (D-05), NO_BRANCH_ACCESS block render/gate
├── use-sse.js            # MODIFIED — onopen extended: parse body, call handleBranchError, stop retry
├── auth.jsx              # MODIFIED — focus listener generalized (D-06/D-07)
├── store.js              # MODIFIED — new `noBranchAccess` session-only flag + setter
└── i18n.jsx              # MODIFIED — new keys per 17-UI-SPEC.md Copywriting Contract
```

### Pattern 1: Global cache-level error interception (TanStack Query v5)

**What:** Configure `onError` at the `QueryCache`/`MutationCache` constructor level (not per-hook) so every query and mutation in the app funnels failures through one function.
**When to use:** Whenever an error class (like a branch-access 403) must be handled identically regardless of which specific hook or screen triggered it — the textbook use case v5's cache-level callbacks were added for.
**Example:**
```js
// src/main.jsx — the exact v5 constructor syntax
import { QueryClient, QueryClientProvider, QueryCache, MutationCache } from '@tanstack/react-query';
import { handleBranchError } from './use-branches.js';

const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (err) => handleBranchError(err, queryClient),
  }),
  mutationCache: new MutationCache({
    onError: (err) => handleBranchError(err, queryClient),
  }),
});
```
`QueryCache`'s `onError` signature in v5 is `(error: TError, query: Query) => void` — the query object is available as a second argument if the handler ever needs the failing query's key, but `handleBranchError` doesn't need it (it invalidates a fixed `['branches']` key regardless of which query 403'd). `MutationCache`'s `onError` signature is `(error: TError, variables: TVariables, context: TContext | undefined, mutation: Mutation) => void` — again, `handleBranchError` only needs `error`, so the extra positional args are simply unused parameters, not blockers. Both callbacks fire for **every** query/mutation in the client — `handleBranchError`'s own `if (!BRANCH_CODES.includes(err?.code)) return;` guard is what keeps this from interfering with non-branch errors (existing 401 session-expiry handling, generic mutation failures, etc.), which is why the very first line of the function must be that early-return, not an assumption baked into the call site.

### Pattern 2: SSE non-2xx branch-error short-circuit without retry

**What:** In `fetchEventSource`'s `onopen`, detect a branch-access 403 and **return** (not throw) after calling the shared handler — this is the mechanism that stops the library's retry loop, since `fetchEventSource` only retries when `onopen` throws or when `onerror` doesn't rethrow.
**When to use:** Exactly this one case — a 403 that will not resolve by retrying, ever, until the user picks a different branch or access is restored (at which point the *next* `useSSE` effect run, triggered by a `currentBranch` change, opens a fresh connection anyway).
**Example:**
```js
// src/use-sse.js — extending the existing onopen (currently lines 48-67)
async onopen(response) {
  if (response.ok) {
    setIsConnected(true);
    setTimeout(() => { snapshotDone.current = true; }, 100);
    return;
  }
  let body;
  try {
    body = await response.text();
  } catch {
    body = undefined;
  }
  // NEW: attempt to extract a BRANCH_* code from the 403 body before the existing warn+throw.
  // Body shape is UNVERIFIED — see the "err.code Verification" section below. This tries the
  // same { error: string } shape unwrapSdkResult already assumes, since it's the one SDK-wide
  // envelope convention confirmed elsewhere in this codebase.
  if (response.status === 403) {
    const code = extractBranchCodeFromSseBody(body); // new small helper, see below
    if (code && BRANCH_CODES.includes(code)) {
      handleBranchError({ code }, queryClient);
      setIsConnected(false); // still disconnected — this stream will not self-heal via retry
      return; // <-- the load-bearing line: NOT throwing means fetchEventSource does not retry
    }
  }
  console.warn('[SSE] non-2xx onopen', { status: response.status, body });
  throw new Error(`SSE: server returned ${response.status}`); // unchanged non-branch path
},
```
```js
// small helper, colocated in use-sse.js or exported from data.jsx/sdk-helpers
function extractBranchCodeFromSseBody(rawText) {
  if (!rawText) return null;
  try {
    const parsed = JSON.parse(rawText);
    return (typeof parsed === 'string' ? parsed : parsed?.error) ?? null;
  } catch {
    return null; // not JSON — cannot extract a code; falls through to the generic warn+throw
  }
}
```

### Pattern 3: Window-focus revalidation generalized beyond "seed if null"

**What:** Extend the existing `auth.jsx` focus listener from "only re-seed when `currentBranch` is null" to "always compare server truth against local state."
**When to use:** Exactly BERR-04's requirement — catching an out-of-band branch change or revocation from another device/session.
**Example:**
```js
// src/auth.jsx — extending the existing D-04 listener (current: lines 167-181)
useEffect(() => {
  let inFlight = false; // simple reentrancy guard — see Common Pitfalls below for why
  async function handleFocus() {
    const { isAuthenticated, currentBranch } = useAppStore.getState();
    if (!isAuthenticated || !client || inFlight) return;
    inFlight = true;
    try {
      const me = await client.auth.getMe(); // throws with .status on failure — NOT {data,error}
      if (me?.selectedBranch === null) {
        // zero accessible branches — route to the same NO_BRANCH_ACCESS block as a live 403
        useAppStore.getState().setNoBranchAccess(true);
        return;
      }
      const serverBranchId = me?.selectedBranch?.id ?? null;
      const localBranchId = currentBranch?.id ?? null;
      if (serverBranchId && serverBranchId !== localBranchId) {
        // benign remote change — adopt silently, surface via neutral toast (D-06)
        useAppStore.getState().setCurrentBranch(me.selectedBranch);
        useAppStore.getState().pushToast({
          id: Date.now(), kind: 'info',
          title: t('branch_focus_update_title'),
          detail: `${t('branch_focus_update_prefix')} ${me.selectedBranch.name}`,
        });
      }
      // serverBranchId === localBranchId → no-op, still the same branch
    } catch (meErr) {
      if (meErr?.status === 401) expireSession();
      // non-401 failures: silent, matches existing seedFromMe() error-swallow convention
    } finally {
      inFlight = false;
    }
  }
  window.addEventListener('focus', handleFocus);
  return () => window.removeEventListener('focus', handleFocus);
}, [client]);
```
Note: this replaces (not adds alongside) the existing D-04 listener — the old `if (!isAuthenticated || currentBranch || !client) return;` guard is exactly what must be removed/generalized, since the whole point of D-07 is that revalidation must fire even when `currentBranch` is already set.

### Anti-Patterns to Avoid

- **Anti-Pattern 3 (carried forward from `ARCHITECTURE.md`): one-off `try/catch` 403 handling per screen.** Do not add a `BRANCH_*`-code check inside `use-order-actions.js`'s `onError`, or inside any individual screen's mutation callback. The entire point of the global `QueryCache`/`MutationCache` `onError` is that no hook or screen needs its own branch-error awareness — verify during planning that no new per-hook `if (err.code === 'BRANCH_INACTIVE')` branches are introduced anywhere outside `handleBranchError` itself.
- **Reintroducing the Phase 16 generic switch-error toast for branch codes.** `app.jsx`'s `fireSwitch`'s `onError` callback (lines ~217-227) currently fires an unconditional generic toast (`branch_switch_error_title`/`branch_switch_error_detail`) for *every* switch failure. Once `handleBranchError` is wired via `MutationCache.onError`, a `BRANCH_*` 403 will ALSO reach `fireSwitch`'s local `onError` (TanStack calls both the mutation-level `onError` passed to `.mutate()` AND the cache-level `onError` — they are not mutually exclusive). D-05 requires trimming `fireSwitch`'s local `onError` so it only shows the generic toast for non-`BRANCH_*` codes, otherwise every recoverable-code switch failure produces **two** toasts (the generic one + the per-code one) — a direct violation of D-05's "no double toast."
- **Optimistically clearing `noBranchAccess` before revalidation confirms recovery.** The D-02 Retry button and the D-06 focus path must only clear `noBranchAccess` after a **successful** `getMe()` call with a non-null `selectedBranch` — never eagerly on click, matching the same "never optimistic" discipline that governs `currentBranch` itself (Pitfall 5/10 from `PITFALLS.md`, carried forward).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Detecting "this error is a branch-access 403" from many call sites | A per-hook `try/catch` checking `err.message` string patterns | The existing `err.code` convention (`unwrapSdkResult`, `useBranchSwitch`) + one shared `BRANCH_CODES` array and one `handleBranchError` function | The codebase already solved "attach a matchable code once" in Phase 14 (`unwrapSdkResult`) — duplicating that logic per-hook is exactly Anti-Pattern 3 |
| SSE reconnection backoff/jitter | A custom retry-suppression timer or manual reconnect scheduler | `fetchEventSource`'s own retry mechanism for non-branch errors (untouched); a bare `return` (no throw) for branch errors, which naturally means "no retry" without any custom logic | The library already implements exponential backoff correctly for the cases that should retry; the only new behavior needed is *not calling into it* for the one case that shouldn't — a `return` vs `throw` distinction, not a new retry system |
| Comparing "did the server's branch change" | A diff of the full `['branches']` list before/after | A direct `getMe().selectedBranch.id` string comparison against `currentBranch.id` | `['branches']`'s list (via `useBranches()`) reports *accessible* branches, not the *currently selected* one — refetching that list on focus does not tell you if the selection itself moved; only `getMe()` reports the selection (confirmed by the SDK's own `CurrentUser.selectedBranch` field vs `AccessibleBranch[]`, which has no "is currently selected" flag) |

**Key insight:** every piece of machinery this phase needs (error-code tagging, cache invalidation, mutation-vs-query error unification, SSE retry logic) already exists in this codebase or in the two libraries it depends on. The entire phase is composition, not construction — which is exactly why `CONTEXT.md` frames this as "consuming the seams" laid by Phases 14-16, not building new ones.

## Runtime State Inventory

Not applicable — this is not a rename/refactor/migration phase. No renaming, no data migration, no OS-registered state changes. Skipped per the trigger condition in the researcher instructions.

## Common Pitfalls

### Pitfall 1: The literal-string assumption for `err.code` may not hold at runtime

**What goes wrong:** The plan/implementation hard-codes `err.code === 'BRANCH_INACTIVE'` etc., but the live API actually returns a human-readable message like `"This branch is no longer active."` inside `{ error: "..." }` — in which case every comparison silently fails, the recovery path never fires, and the generic Phase 16 switch-error toast (or a completely unhandled ordinary-request 403) is all the user ever sees. This is the single most consequential unknown in the entire phase — nothing else here matters if the matcher never matches.
**Why it happens:** The SDK's compiled type only declares `{ error: string }` — a bare string, not a literal union. Neither the type declarations nor the `.mjs` runtime source (both read directly for this research) reveal the actual runtime value; that information exists only in the live API's route handlers, which are outside this repo (`sitecare-orders-api`, referenced but not readable from this workspace).
**How to avoid:** The plan MUST include an explicit verification task — either (a) a live smoke test against the real API using a test account with a deactivated/revoked branch, capturing the actual response body before finalizing the matcher, or (b) if live verification isn't feasible during planning, a `checkpoint:human-verify` gate before the phase is considered done, with the matcher shipped provisionally against the two literal strings named in `CONTEXT.md`/`REQUIREMENTS.md` (`BRANCH_INACTIVE`, `BRANCH_ACCESS_REVOKED`, `NO_BRANCH_ACCESS`) and a follow-up correction task if the live shape differs — mirroring exactly how Phase 14 corrected `unwrapSdkResult`'s original wrong assumption (`result.error.code` → `result.error.error`) after discovering the real envelope shape.
**Warning signs:** A manually-triggered 403 (via a revoked test account) produces no toast, no switcher reopen, and no console error — the generic catch-all silently swallows it because `err.code` doesn't match any of the three literals.

### Pitfall 2: Double toast from `fireSwitch`'s local `onError` + the new global handler

**What goes wrong:** Once `MutationCache.onError` is wired, `useBranchSwitch`'s mutation failures reach it. But `app.jsx`'s `fireSwitch` also passes its own `onError` directly to `.mutate(branch, { onError: ... })` — TanStack v5 calls **both** the per-call `onError` and the cache-level `onError` for the same failure (they compose, they don't override each other). If `fireSwitch`'s `onError` isn't trimmed per D-05, a `BRANCH_*` 403 on the switch call produces the generic `branch_switch_error_title` toast (from `fireSwitch`) **and** the per-code toast (from `handleBranchError`) — two toasts for one failure.
**Why it happens:** TanStack Query's cache-level and mutation-level error callbacks are additive by design (both exist to serve different purposes — cache-level for cross-cutting concerns, mutation-level for local UI state like `fireSwitch`'s `switchPhase`/`pendingBranch` reset) — it's easy to assume wiring the global one automatically supersedes the local one, but it does not.
**How to avoid:** Inside `fireSwitch`'s existing `onError` callback (`app.jsx` ~lines 217-227), add the same `BRANCH_CODES.includes(err?.code)` guard and only fire the generic toast + `switchPhase`/`pendingBranch` reset for the `else` branch. The `switchPhase`/`pendingBranch` state reset itself (returning to `'idle'`, clearing `pendingBranch`) should likely still happen unconditionally regardless of error code — it's the *toast* that must be conditional, not the phase-machine cleanup, since BERR-02 requires the app to visibly return to a stable state on the old branch either way.
**Warning signs:** Manually triggering a branch-code switch failure (mocked or live) shows two toast entries in the toast stack instead of one.

### Pitfall 3: SSE body parse failing silently, masking a real branch 403 as a generic retry

**What goes wrong:** The Phase 15 scaffold already does `body = await response.text()` defensively (catches parse failure). If the actual 403 body isn't JSON, or is JSON but shaped differently than assumed (e.g., a plain string body, or `{ code: 'BRANCH_INACTIVE' }` instead of `{ error: 'BRANCH_INACTIVE' }`), `extractBranchCodeFromSseBody` returns `null`, the branch check is skipped, and the 403 falls through to the generic `console.warn` + `throw` path — which means `fetchEventSource` retries against a branch the user has no access to, producing exactly the infinite-backoff-loop harm D-08 exists to prevent, just via a silent parse-miss rather than a design gap.
**Why it happens:** The SSE 403 body shape is a *second*, independent unknown from the ordinary-request body shape (Pitfall 1) — the SSE endpoint (`/v1/sse/orders`) may format its error response differently than the JSON `{ data, error }`-style REST endpoints the generated SDK wraps, since the SSE route is hand-rolled server-side (per `PITFALLS.md`'s note that `use-sse.js` reads a raw `Response`, "not SDK-unwrapped").
**How to avoid:** Treat the SSE body shape as its own verification item, distinct from the ordinary-request shape — do not assume they're identical without confirming. If a live 403 test is possible during planning/execution, capture the actual SSE 403 body via the existing `console.warn('[SSE] non-2xx onopen', ...)` scaffold (already logging `{ status, body }`) before finalizing `extractBranchCodeFromSseBody`'s parse logic.
**Warning signs:** A live branch-revocation test shows the KDS/orders screen's SSE connection retrying every few seconds indefinitely (visible via repeated `console.warn` entries) instead of stopping after one attempt.

### Pitfall 4: Focus-listener reentrancy on rapid alt-tab

**What goes wrong:** POS terminals can fire `focus` events in quick succession (e.g., a cashier alt-tabbing between this app and a delivery-platform tablet app repeatedly). Without a guard, each `focus` event fires its own `await client.auth.getMe()` call; if a prior call hasn't resolved yet, multiple concurrent `getMe()` calls race, and whichever resolves *last* wins the `setCurrentBranch`/toast decision — potentially an out-of-order write if responses arrive out of send order (unlikely but not impossible under real network conditions).
**Why it happens:** The existing D-04 listener has no reentrancy guard because it was only ever gated on `!currentBranch` — a condition that flips false after the first successful seed, naturally preventing re-entry in practice. Generalizing to "always revalidate" removes that accidental protection.
**How to avoid:** Add a simple in-closure boolean guard (`inFlight`, sketched in Pattern 3 above) so a `focus` event received while a prior `getMe()` call is still in flight is a no-op. This is deliberately *not* a debounce/throttle with a timer — CONTEXT.md leaves the exact guard mechanism to Claude's discretion, and a simple reentrancy flag is sufficient to prevent the race without adding timer-cleanup complexity.
**Warning signs:** Rapid alt-tabbing during manual testing occasionally shows the neutral "Now showing X" toast firing more than once for what should be a single branch-change detection, or shows it firing with stale branch data.

### Pitfall 5 (carried forward, PITFALLS.md Pitfall 11): Single-branch-tenant regression

**What goes wrong:** Any of this phase's new code paths (the global `onError`, the SSE branch-check, the focus revalidation) could theoretically introduce an extra round-trip or a new blocking condition that delays first paint or falsely triggers the `NO_BRANCH_ACCESS` block for a tenant that has always had exactly one, perfectly valid, branch.
**Why it happens:** New cross-cutting error-handling code is exactly the kind of change that's easy to test only against the multi-branch happy path (deliberately triggering a 403) while never re-confirming the single-branch tenant's default flow still works untouched.
**How to avoid:** This phase's new code should never fire for a single-branch tenant under normal operation — `handleBranchError` only activates on an actual `BRANCH_*` 403, and a single-branch tenant with valid access never produces one. The main risk is exclusively in the focus-revalidation path: confirm `me.selectedBranch` for a single-branch tenant returns the same branch every time (no accidental `NO_BRANCH_ACCESS` misfire from a `null` mis-parse). Re-run the standing verification checklist (login → orders → KDS → POS) with a one-branch fixture after this phase, per the project's own carried-forward standing item (`STATE.md` "Single-branch-tenant regression is a standing verification item across all 5 phases").
**Warning signs:** A single-branch tenant sees the `NO_BRANCH_ACCESS` block flash briefly on launch or focus, or sees an unexpected "Now showing `<branch>`" toast for a branch they were already on (a sign the `serverBranchId !== localBranchId` comparison has an id-normalization bug — e.g., comparing a string to a number, or a stale closure value).

## Code Examples

### Extracting the switch-mutation error unaffected by D-05's trim

```js
// src/app.jsx — fireSwitch's onError, trimmed per D-05 (Pitfall 2 above)
// BEFORE (Phase 16, current):
onError: () => {
  clearTimeout(bridgeTimeoutRef.current);
  setSwitchPhase('idle');
  setPendingBranch(null);
  pushToast({
    id: Date.now(), kind: 'error',
    title: t('branch_switch_error_title'),
    detail: t('branch_switch_error_detail'),
  });
},

// AFTER (Phase 17, D-05):
onError: (err) => {
  clearTimeout(bridgeTimeoutRef.current);
  setSwitchPhase('idle');
  setPendingBranch(null);
  // BRANCH_* codes are already handled by handleBranchError via MutationCache.onError —
  // only show this generic toast for everything else (400 validation, network, unknown).
  if (!BRANCH_CODES.includes(err?.code)) {
    pushToast({
      id: Date.now(), kind: 'error',
      title: t('branch_switch_error_title'),
      detail: t('branch_switch_error_detail'),
    });
  }
},
```

### `handleBranchError` full sketch

```js
// src/use-branches.js — new export, module-scope callable (no hooks inside)
import { useAppStore } from './store.js';

export const BRANCH_CODES = ['BRANCH_INACTIVE', 'BRANCH_ACCESS_REVOKED', 'NO_BRANCH_ACCESS'];

const RECOVERABLE_COPY = {
  BRANCH_ACCESS_REVOKED: { titleKey: 'branch_err_revoked_title', detailKey: 'branch_err_revoked_detail' },
  BRANCH_INACTIVE:       { titleKey: 'branch_err_inactive_title', detailKey: 'branch_err_inactive_detail' },
};

export function handleBranchError(err, queryClient) {
  const code = err?.code;
  if (!BRANCH_CODES.includes(code)) return;

  const { lang, pushToast, setBranchSwitcherForceOpen, setNoBranchAccess, currentBranch } = useAppStore.getState();
  const t = /* resolve via existing useT-equivalent module function, or inline lookup on lang */;

  if (code === 'NO_BRANCH_ACCESS') {
    setNoBranchAccess(true);
    return;
  }

  // BRANCH_INACTIVE / BRANCH_ACCESS_REVOKED — same recovery behavior, different copy (D-03)
  const copy = RECOVERABLE_COPY[code];
  pushToast({
    id: Date.now(),
    kind: 'error',
    title: t(copy.titleKey),
    detail: t(copy.detailKey).replace('<branch>', currentBranch?.name ?? t('branch_generic_fallback')),
  });
  setBranchSwitcherForceOpen(true);
  queryClient.invalidateQueries({ queryKey: ['branches'] });
}
```
Note: `currentBranch?.name` is used for the `<branch>` interpolation because the 403 arrived *about* the branch the user was just on/switching away from — `currentBranch` (pre-recovery) is the only branch identity `handleBranchError` has in scope without threading the failing branch's name through the error object itself. If the switch-call 403 needs the *target* branch's name (the one that was rejected, not the one the user stayed on), that name must be attached to the thrown error in `useBranchSwitch`'s `mutationFn` (e.g., `err.branchName = branch.name` alongside `err.code = message`) since `handleBranchError` has no other way to know which branch was attempted. **Flag this for planning** — `17-UI-SPEC.md`'s toast copy interpolates `<branch>`, and the plan must decide whether that's the branch being left or the branch that was attempted, and thread the right value through accordingly.

### `NO_BRANCH_ACCESS` block gating in `app.jsx`

```js
// src/app.jsx — near the existing coldStartBusy / !isAuthenticated early returns
const noBranchAccess = useAppStore((s) => s.noBranchAccess);
// ... after the !isAuthenticated guard, before the normal <Shell> render:
if (noBranchAccess) {
  return (
    <NoBranchAccessBlock
      lang={lang}
      onRetry={async () => {
        setRetrying(true);
        try {
          const me = await /* client instance, from useAuth() */.auth.getMe();
          if (me?.selectedBranch) {
            useAppStore.getState().setCurrentBranch(me.selectedBranch);
            useAppStore.getState().setNoBranchAccess(false);
          }
          // still null → block stays up, no toast (per 17-UI-SPEC.md E1-retry `error` row —
          // "no additional toast fires, avoids toast-on-toast noise while already blocking")
        } catch {
          // network/other failure — block stays up unchanged, button returns to idle
        } finally {
          setRetrying(false);
        }
      }}
    />
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|---------------|--------|
| Per-hook generic error → generic `isError` UI (Phase 3-16 convention) | Global `QueryCache`/`MutationCache` `onError` for the specific `BRANCH_*` error class | This phase (17) | Branch-access failures get code-aware recovery instead of the app's existing generic offline/error styling; non-branch errors are completely unaffected — this is additive, not a replacement of the existing error-handling convention |
| `useSSE`'s `onopen` non-2xx path: console-warn + throw (Phase 15 scaffold) | console-warn + throw for non-branch codes; call handler + return (no throw) for branch codes | This phase (17) | The one place in the app that bypasses TanStack's error machinery gets its own explicit, permanent stop for branch 403s, rather than relying on the library's generic backoff-retry forever |
| `auth.jsx` focus listener: re-seed only if `currentBranch` is null (Phase 13 D-04) | Always revalidate `selectedBranch` against server truth on focus | This phase (17) | Closes the "another device changed my branch and I never find out" gap (PITFALLS.md Pitfall 8) that was explicitly deferred/documented-as-accepted-risk in the v1.2 pitfalls research |

**Deprecated/outdated:** None — this phase extends existing, current-generation patterns (TanStack Query v5, the existing `err.code` convention); nothing here supersedes a previously-recommended approach.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | The literal runtime string inside `{ error: string }` for `BRANCH_INACTIVE`/`BRANCH_ACCESS_REVOKED`/`NO_BRANCH_ACCESS` 403s matches exactly the three names given in `CONTEXT.md`/`REQUIREMENTS.md`, rather than a human-readable message | Summary; Pitfall 1 | HIGH — if wrong, the entire matcher silently no-ops; every branch 403 falls back to generic/no handling, directly failing BERR-01/02/03 |
| A2 | The SSE endpoint's 403 body is JSON-parseable and shaped as `{ error: string }` (the same envelope as REST endpoints), rather than plain text, an HTML error page, or a differently-keyed JSON object | SSE 403 routing; Pitfall 3 | MEDIUM — if wrong, `extractBranchCodeFromSseBody` always returns null, and SSE branch-403s fall through to the generic retry-forever path, reintroducing the exact infinite-backoff harm D-08 exists to prevent |
| A3 | `getMe().selectedBranch` reliably returns `null` (not an error/exception) when a user has zero accessible branches, rather than the `getMe()` call itself throwing a 403 with a `NO_BRANCH_ACCESS` code | Window-focus revalidation | MEDIUM — if `getMe()` instead throws with a `NO_BRANCH_ACCESS`-coded error, the `try/catch`'s generic `meErr?.status === 401` check would swallow it silently (since 403 !== 401) and the focus-triggered `NO_BRANCH_ACCESS` detection (D-02's trigger a) would never fire; the plan should defensively check for a 403 status alongside the 401 check, not only rely on `selectedBranch === null` |
| A4 | The `<branch>` toast interpolation should reference `currentBranch` (the branch the user remains on) rather than the specific branch that was attempted/lost | Code Examples — `handleBranchError` sketch | LOW — cosmetic risk only; wrong branch name in a toast is confusing but not functionally harmful; easy to correct once `17-UI-SPEC.md`'s exact intent is confirmed during planning |

**If this table is empty:** N/A — see entries above; none of this research's factual claims should be treated as locked without the planner explicitly deciding how to handle A1-A4.

## Open Questions

1. **Does the plan need a live 403 test, or can it ship provisionally?**
   - What we know: The literal-string matcher is unverified from any static source (SDK types, `.mjs` source, PRD) — this was already flagged by Phase 15's own CONTEXT and the ROADMAP's Phase 15 planning note, and remains unresolved.
   - What's unclear: Whether a live test account with a deactivated/revoked branch is available during Phase 17's execution, or whether this must ship provisionally with a follow-up correction task (mirroring Phase 14's `unwrapSdkResult` correction).
   - Recommendation: The plan should include an explicit verification task/checkpoint (`checkpoint:human-verify` or a live-API smoke-test task) attempting to trigger a real `BRANCH_INACTIVE`/`BRANCH_ACCESS_REVOKED`/`NO_BRANCH_ACCESS` 403 (e.g., via a test tenant/branch that can be deactivated) and capturing the actual response body via the existing `console.warn` scaffolds before considering the matcher final. If genuinely infeasible during this phase, ship the three literal strings as given and flag the risk explicitly in the phase's verification notes.

2. **Which branch name does the `<branch>` toast interpolation reference — the one lost, or the one remained on?**
   - What we know: `17-UI-SPEC.md`'s Copywriting Contract shows `<branch>` in both `BRANCH_ACCESS_REVOKED` ("Your access to `<branch>` was removed") and `BRANCH_INACTIVE` ("`<branch>` is no longer active") — grammatically, both read as referring to the branch that failed, not the branch the user remains on.
   - What's unclear: `handleBranchError` as sketched only has `currentBranch` (pre-failure) in scope; for a *later-request* 403 (not a switch-call 403), `currentBranch` IS the failing branch, so `currentBranch?.name` is correct there. But for a *switch-call* 403, `currentBranch` is the OLD branch (switch never completed) and the *attempted* branch's name is only available in the mutation's `variables` (the `branch` object passed to `.mutate()`), which `MutationCache.onError`'s signature does expose as its second argument.
   - Recommendation: Thread the attempted branch's name onto the thrown error in `useBranchSwitch`'s `mutationFn` (`err.branchName = branch.name`) OR have `handleBranchError` accept the mutation's `variables` for the mutation-cache path and fall back to `currentBranch?.name` for the query-cache path. Decide during planning; this affects copy correctness, not the recovery mechanism itself.

## Environment Availability

Skipped — this phase has no external tool/service dependencies beyond the already-installed, already-verified npm packages (`@tanstack/react-query`, `@microsoft/fetch-event-source`, `@charlyk/admin-client`) and the already-configured live API domain (CSP already covers it per Phase 1). No new CLI tools, runtimes, or services are introduced.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (confirmed via existing `src/__tests__/*.test.jsx` suite referenced throughout `STATE.md`, e.g. "npx vitest run") |
| Config file | existing project Vitest config (not modified this phase) |
| Quick run command | `npx vitest run src/__tests__/use-branches.test.js src/__tests__/use-sse.test.js src/__tests__/app-branch-error.test.jsx` (new/existing files touched by this phase) |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| BERR-01 | A synthetic `BRANCH_INACTIVE`/`BRANCH_ACCESS_REVOKED` 403 from an ordinary query AND from the switch mutation both reach `handleBranchError` and produce identical toast+reopen+refetch behavior | unit | `npx vitest run -t "handleBranchError"` | ❌ Wave 0 — new test file |
| BERR-01 | Single-branch tenant fixture never trips `handleBranchError` under normal (non-403) operation | unit/regression | `npx vitest run -t "single-branch"` | ❌ Wave 0 — extend existing single-branch fixture tests from Phase 14/16 |
| BERR-02 | A rejected switch mutation leaves `currentBranch` unchanged (mock a 403 `useBranchSwitch` response) | unit | `npx vitest run -t "rejected switch"` | ✅ likely already covered by Phase 16's mutation error tests — verify, extend if code-specific assertion missing |
| BERR-03 | `NO_BRANCH_ACCESS` sets `noBranchAccess` true and the block renders, superseding `<Shell>` | unit + component | `npx vitest run -t "NO_BRANCH_ACCESS"` | ❌ Wave 0 — new test file |
| BERR-03 | Retry button re-checks `getMe()`; clears the block only on a non-null `selectedBranch`; stays up silently on failure (no extra toast) | component | `npx vitest run -t "NoBranchAccessBlock retry"` | ❌ Wave 0 |
| BERR-04 | Focus revalidation: `getMe().selectedBranch` differing from `currentBranch` triggers silent adopt + neutral toast; matching branch is a no-op; revoked/inactive routes to recovery | unit | `npx vitest run -t "focus revalidation"` | ❌ Wave 0 — new test file, mocking `client.auth.getMe` |
| D-05 (no double toast) | A branch-code switch failure produces exactly one toast, not two | unit/regression | `npx vitest run -t "fireSwitch branch error"` | ❌ Wave 0 — extend `app.jsx`'s existing switch-flow tests |
| D-08 (SSE retry suppression) | A synthetic 403 with a `BRANCH_*` body in `onopen` calls `handleBranchError` and does NOT throw (verify no retry scheduled) | unit | `npx vitest run -t "SSE branch 403"` | ❌ Wave 0 — extend `use-sse.test.js` |

### Sampling Rate
- **Per task commit:** `npx vitest run` scoped to the touched test file(s)
- **Per wave merge:** `npx vitest run` (full suite)
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `src/__tests__/use-branches.test.js` (or extend existing) — `handleBranchError` unit coverage for all three codes + non-branch pass-through
- [ ] `src/__tests__/use-sse.test.js` — extend existing suite with the branch-403-in-onopen retry-suppression case
- [ ] `src/__tests__/app.test.jsx` (or a new `app-branch-error.test.jsx`) — `NO_BRANCH_ACCESS` block render/gate, D-05 no-double-toast regression, focus-revalidation adopt/recover cases
- [ ] `src/__tests__/auth.test.jsx` (if exists — verify) — extend for the generalized focus listener (revalidate-even-when-set)

*(No framework install needed — Vitest is already fully configured and used throughout the project.)*

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | Unchanged this phase — `getMe()`/session handling already exists (Phase 2/13) |
| V3 Session Management | partial | The focus-revalidation `getMe()` call reuses the existing session/token mechanism; no new session semantics introduced |
| V4 Access Control | yes | This entire phase IS the client-side reaction to server-enforced access control (403s) — the server remains the sole enforcement point (per `PITFALLS.md`'s "Security Mistakes" table: "a stale/tampered local value could be used to mis-scope... but the server would still correctly reject" — this phase must not introduce any client-side bypass of that server enforcement, only better UX around it) |
| V5 Input Validation | yes | The SSE 403 body parse (`extractBranchCodeFromSseBody`) must not throw on malformed/non-JSON input — already guarded via `try/catch` returning `null` on parse failure, consistent with the existing Phase 15 scaffold's own defensive `response.text()` try/catch |
| V6 Cryptography | no | Not applicable — no cryptographic operations in this phase |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Raw SDK error strings surfacing directly in toasts (carried forward from `PITFALLS.md` Security Mistakes table) | Information Disclosure | Map `BRANCH_INACTIVE`/`BRANCH_ACCESS_REVOKED`/`NO_BRANCH_ACCESS` to localized `i18n.jsx` copy (per D-03/`17-UI-SPEC.md`'s Copywriting Contract) — never render `err.message`/`err.code` directly in the DOM. Already the codebase's existing D-08 convention ("Generic detail error copy, no HTTP-status branching... raw SDK error strings must not reach the DOM") |
| Trusting client-side `noBranchAccess`/`currentBranch` state as authoritative for anything beyond display | Tampering / Elevation of Privilege | Every actual data operation still goes through the server's own re-validated `selected_branch_id` per request — this phase's new `noBranchAccess` flag only gates *UI rendering* (which screen shows), never bypasses or replaces server-side enforcement; a tampered client value can at most show the wrong screen, never grant access to data the server wouldn't otherwise serve |
| SSE retry-storm against a revoked resource (denial-of-service-adjacent, self-inflicted) | Denial of Service (client resource exhaustion / unnecessary server load) | D-08's retry-suppression (return, not throw, on a branch 403) directly prevents an unbounded exponential-backoff loop hammering an endpoint the client has no access to — this is as much a "don't be a bad API citizen" concern as a UX one |

## Sources

### Primary (HIGH confidence)
- `/Users/eduardalbu/Developer/sitecare-pos/src/data.jsx` (read directly) — `unwrapSdkResult` exact implementation, lines 195-209
- `/Users/eduardalbu/Developer/sitecare-pos/src/use-branches.js` (read directly) — `useBranches()`/`useBranchSwitch()` exact current implementation
- `/Users/eduardalbu/Developer/sitecare-pos/src/use-sse.js` (read directly) — the Phase 15 `onopen` capture scaffold, exact current signature `useSSE(token, onLiveOrder)` (branchId read internally via store, not a parameter — corrects `ARCHITECTURE.md`'s original sketch)
- `/Users/eduardalbu/Developer/sitecare-pos/src/auth.jsx` (read directly) — the exact D-04 focus listener (lines 167-181) and `seedFromMe` helper to be reused/extended
- `/Users/eduardalbu/Developer/sitecare-pos/src/app.jsx` (read directly) — `fireSwitch`'s exact current `onError` (lines 217-227), the full screen router, `SwitchingOverlay`/`CartDiscardConfirm` chrome precedent for the `NO_BRANCH_ACCESS` block's sibling-of-Shell rendering approach
- `/Users/eduardalbu/Developer/sitecare-pos/src/store.js` (read directly) — exact `branchSwitcherForceOpen` field/setter (unwired, lines 69-72, 121), `partialize` exclusion list to extend for the new `noBranchAccess` flag
- `/Users/eduardalbu/Developer/sitecare-pos/src/main.jsx` (read directly) — confirmed current bare `new QueryClient()` (line 8), the exact insertion point
- `/Users/eduardalbu/Developer/sitecare-pos/src/shell.jsx` (read directly) — confirmed `branchMenuOpen` is local `useState`, NOT yet wired to `branchSwitcherForceOpen` — this phase must add that wiring
- `node_modules/@charlyk/admin-client/dist/index.d.ts` (read directly, v1.1.67) — `Error = { error: string }` (line 1239-1241), `SwitchMyBranchErrors` (400/401/403, all typed `Error`, line 2002-2016), `GetMyBranchesErrors` (401 only, line 1980-1986), `CurrentUser`/`SelectedBranch`/`AccessibleBranch` shapes (lines 666-692)
- `node_modules/@charlyk/admin-client/dist/index.mjs` (read directly, v1.1.67) — confirmed `getMe()`'s throwing contract (`throw Object.assign(new Error(...), { status: res.status })`, lines 1619-1623), confirmed `me.branches.list`/`switch` return the raw `{data, error, response}` tuple unmodified (lines 1799-1800)
- `.planning/phases/17-centralized-branch-access-error-handling/17-CONTEXT.md` — all locked decisions (D-01 through D-08), canonical refs, code context
- `.planning/phases/17-centralized-branch-access-error-handling/17-UI-SPEC.md` — approved Copywriting Contract (exact RO/EN toast and block strings), layout rationale, UI Considerations table
- `.planning/research/ARCHITECTURE.md` §6 (lines 183-259) — the original choke-point design and Anti-Pattern 3
- `.planning/research/PITFALLS.md` — Pitfall 5 (optimistic-UI-on-403), Pitfall 6 (later-request 403 not routed), Pitfall 8 (cross-device drift, the direct ancestor of BERR-04), Pitfall 11 (single-branch regression)
- `.planning/REQUIREMENTS.md` — BERR-01 through BERR-04 exact wording (lines 31-34)
- `.planning/ROADMAP.md` — Phase 15's planning note flagging the unverified 403 signal shape (line 124)
- `.planning/STATE.md` — Key Decisions log confirming `unwrapSdkResult`'s Phase 14 correction (`result.error.error`, not `result.error.code`) and the standing single-branch-regression verification item

### Secondary (MEDIUM confidence)
- None this phase — no WebSearch was needed; every claim traces to source code, compiled type declarations, or prior-phase planning artifacts already in this workspace

### Tertiary (LOW confidence)
- The runtime literal-string value inside the 403 error envelope (`err.code`'s actual content for a real `BRANCH_INACTIVE`/`BRANCH_ACCESS_REVOKED`/`NO_BRANCH_ACCESS` response) — explicitly unverifiable from any source available in this workspace; flagged throughout as requiring live-API confirmation (Assumption A1, Pitfall 1, Open Question 1)
- The SSE endpoint's 403 body shape specifically (as opposed to the REST endpoints' shape) — same tier, Assumption A2, Pitfall 3

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — zero new packages, all versions confirmed installed and read directly from `package.json`
- Architecture: HIGH — every wiring seam (main.jsx, use-branches.js, use-sse.js, auth.jsx, store.js, shell.jsx) read directly from current source; the choke-point design is locked by prior research and CONTEXT.md
- Pitfalls: MEDIUM — the mechanical pitfalls (double-toast, reentrancy, retry-suppression logic) are HIGH confidence; the error-envelope-shape pitfalls (Pitfall 1, Pitfall 3) are explicitly LOW confidence by nature (unverifiable without live API access) and are the reason the overall phase confidence is capped at MEDIUM

**Research date:** 2026-07-23
**Valid until:** 30 days (stable, no external API surface expected to change; the one live-verification item does not degrade with time, only with an actual API contract change)
