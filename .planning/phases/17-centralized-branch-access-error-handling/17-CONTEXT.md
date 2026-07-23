# Phase 17: Centralized Branch-Access Error Handling - Context

**Gathered:** 2026-07-23
**Status:** Ready for planning

<domain>
## Phase Boundary

Every branch-access **403** — whether it comes back from the `client.me.branches.switch` call itself **or** from any later ordinary request (an order/menu/stats refetch, an order mutation, an SSE stream reconnect) — is routed through **one central, code-aware recovery path** keyed on the error code, instead of surfacing as a generic toast or a silent failure. Requirements: **BERR-01, BERR-02, BERR-03, BERR-04**.

Three behaviors, keyed on `err.code`:
- **`BRANCH_INACTIVE` / `BRANCH_ACCESS_REVOKED`** → recoverable: a **distinct per-code** toast, the branch switcher **auto-reopens** (via `branchSwitcherForceOpen`), and the branch list (`['branches']`) is **refetched** so the now-unavailable branch drops out. The app **stays on the previously selected branch** with no other change (BERR-01/02).
- **`NO_BRANCH_ACCESS`** → the user has **zero** accessible active branches: a **distinct full-screen blocking state** that supersedes all normal screens until access is restored (BERR-03).
- **Window-focus revalidation** → on regaining focus, the app revalidates the server's selected branch, catching a branch change or access revocation made on another device and routing it through the same paths (BERR-04).

This phase **consumes the seams** deliberately laid by Phases 14–16:
- `err.code` is already attached by `unwrapSdkResult` (`data.jsx:205`) and `useBranchSwitch` (`use-branches.js:37`).
- `branchSwitcherForceOpen` already exists in the store (`store.js:72`), currently unwired — this phase wires it.
- Phase 15's `onopen` non-2xx **capture scaffold** (`use-sse.js:48-67`) is the seam the SSE 403 handling extends.
- The research-locked architecture (global `QueryCache`/`MutationCache` `onError` → `handleBranchError`) is the choke point — see canonical refs.

**Out of scope (belongs elsewhere / not this phase):**
- The switcher UI, the switch mutation, the switching overlay, cart discard, neutral landing — all Phase 16 (shipped). This phase only *reacts* to 403s; it does not build the switcher or the switch flow.
- Branch-scoped cache keying (Phase 14) and SSE branch-aware reconnect mechanics (Phase 15) — already done; this phase only adds the 403 *handling* on top.
- Non-403 failures (400 validation, 401 unauthorized, network) keep their existing generic handling — this phase does **not** rework them beyond trimming the Phase 16 generic switch toast to no longer fire for the three `BRANCH_*` codes.

</domain>

<decisions>
## Implementation Decisions

### NO_BRANCH_ACCESS full-screen block (BERR-03)
- **D-01:** The block is a **minimal message + Retry** screen — a clear headline ("No branch available") + one line of guidance ("Ask your manager to assign you a branch") + a **Retry** button. The sidebar/nav is **hidden**; nothing else in the app is reachable while it's up. Chosen over a full branded/login-style gate screen (heavier, more new UI for a rare terminal state). Keep to existing design tokens (`assets/colors_and_type.css`) and the app's error/empty-state conventions.
- **D-02:** The block clears itself the **moment a branch becomes accessible**, via **two** recovery triggers: (a) **auto-revalidation on window focus** (reuses the BERR-04 path) and (b) a **manual Retry button** so staff on a fixed POS terminal can force a re-check without alt-tabbing away and back. Rejected "auto-on-focus only" (no way to force a re-check while staring at the screen) and "add Sign out" (over-scoped for this phase — no sign-out escape hatch added here).

### Recoverable-code recovery — INACTIVE / REVOKED (BERR-01/02)
- **D-03:** **Distinct per-code toast copy.** `BRANCH_ACCESS_REVOKED` → "Your access to `<branch>` was removed."; `BRANCH_INACTIVE` → "`<branch>` is no longer active." Both then direct the user to "pick another branch." The two codes mean genuinely different things to staff, so they get different copy — but route to the **same** reopen+refetch behavior. (Exact final wording + i18n keys are Claude's discretion / planner's, keeping RO+EN parity.)
- **D-04:** After a recoverable 403, the auto-reopened switcher is **dismissible** — it pops open (via `branchSwitcherForceOpen`) showing the refetched list (the unavailable branch now gone), but the user can close it and keep working on whatever valid branch they still have. Chosen over "insistent until picked" — the user still has a working branch, so don't trap them; that treatment is reserved for `NO_BRANCH_ACCESS` (D-01). — **Reversibility:** reversible — the reopen is a single `branchSwitcherForceOpen` set consumed by the existing Phase 16 popover.
- **D-05:** **The central handler owns all three `BRANCH_*` codes.** Phase 16's `app.jsx` `fireSwitch` generic error toast (D-11 there, ~`app.jsx:219-221`) is **trimmed to fire only for non-branch switch failures** (400 validation, network, unknown). A switch-call 403 flows through the **same** `handleBranchError` as a 403 from any later request — one implementation, two triggers — guaranteeing exactly **one** recovery per failure and no double toast. This literally satisfies BERR-01 ("whether returned by the switch call itself or by any later branch-scoped request … one central path") and BERR-02. — **Reversibility:** costly — this is the linchpin of the whole "one central path" requirement; splitting handling back out per-call-site reintroduces the per-screen `try/catch` anti-pattern the phase exists to prevent (Research Anti-Pattern 3).

### Window-focus revalidation (BERR-04)
- **D-06:** On focus, revalidation compares the **server's** selected branch (via `getMe().selectedBranch`) to what the app shows:
  - **Access revoked / branch inactive** → route through the **recovery path** (D-03/D-04, or the D-01 block if it's the last branch).
  - **Branch changed to a different but still-valid branch on another device** → **silently adopt** the server's branch (set `currentBranch` → Phase 14 caches + Phase 15 SSE re-scope automatically) **and** show a **neutral info toast** ("Now showing `<branch>`") so staff aren't confused about why the board changed. Rejected "adopt silently, no notice" (staff may not notice they're now looking at a different branch's board — costly for a wrong-branch action) and "reopen switcher on any remote change" (friction for what is a perfectly valid state). — **Reversibility:** reversible — adoption is a single `setCurrentBranch`; the info toast reuses `pushToast`.
- **D-07:** This **extends** the existing D-04 window-`focus` listener in `auth.jsx:167-180`, which today only re-seeds when `currentBranch` is **null**. Phase 17 must make it revalidate **even when a branch is already set**. Throttle/debounce of the focus check (POS terminals can fire `focus` frequently) is **Claude's discretion** — planner picks a sensible guard so revalidation isn't hammered.

### SSE stream 403 routing (SC2 — "stream reconnect" as a recovery trigger)
- **D-08:** SSE errors do **not** flow through TanStack's `onError`, so the stream needs its own hook into the shared path. In `use-sse.js` `onopen`, when a non-2xx response carries a `BRANCH_*` code, call the **same** `handleBranchError` (toast/reopen for the recoverable codes, or the D-01 block for `NO_BRANCH_ACCESS`) **and STOP retrying** — do not rethrow into `fetchEventSource`'s retry loop / abort the controller — so the library does **not** loop forever with blind exponential backoff against an inaccessible branch. **Non-branch** errors keep today's throw→`onerror`→retry behavior untouched. Chosen over "suppress retry only, no visible recovery from the stream" (leaves a window where the stream is dead with no toast/reopen — SC2 explicitly names a stream reconnect as a recovery trigger). — **Reversibility:** costly — undoing means re-threading branch-error handling out of `use-sse.js` and back to a passive-retry-only stream; the retry-suppression invariant is what prevents the infinite-backoff loop.

### Claude's Discretion
- Final toast wording + the RO/EN i18n key set for all new messages (D-03 per-code copy, D-01 block copy, D-06 info toast), keeping to the existing i18n conventions.
- Exact layout/markup of the `NO_BRANCH_ACCESS` block screen (D-01), within existing design tokens and error/empty-state conventions.
- The focus-revalidation throttle/debounce guard and whether revalidation reuses `useBranches`'s existing `refetchOnWindowFocus` (`use-branches.js:16`) or an explicit `getMe()` call — **note:** the list refetch alone does not detect a *selected-branch change*, so an explicit `selectedBranch` comparison is likely required (D-06).
- The precise shape of `handleBranchError` (where it lives — `use-branches.js` per research, vs a new `sdk-helpers.js`) and how it reads `queryClient` / the store setters for toast + `branchSwitcherForceOpen` + `['branches']` invalidation.
- Whether `NO_BRANCH_ACCESS` also tears down the live SSE stream / stops other polling while the block is up (avoid hammering an inaccessible API) — planner's call; consistent with D-08's stop-retrying intent.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & roadmap
- `.planning/REQUIREMENTS.md` — **BERR-01** (line 31), **BERR-02** (32), **BERR-03** (33), **BERR-04** (34): the four locked requirements for this phase.
- `.planning/ROADMAP.md` §"Phase 17" — goal + 4 success criteria. Note SC1/SC2 (switch-call 403 **and** any later request → identical recovery) resolved by D-05/D-08; SC3 (`NO_BRANCH_ACCESS` full-screen block) by D-01/D-02; SC4 (focus revalidation) by D-06/D-07. Also read the **Phase 15 planning note** (§"Phase 15") flagging the unverified 403 signal shape.

### Research (all 2026-07-21, HIGH confidence) — architecture is largely pre-decided here
- `.planning/research/ARCHITECTURE.md` §6 "403 branch-access error propagation" (lines 183-215) + the component diagram (lines 60-93) — **the locked choke-point architecture**: `new QueryClient({ queryCache: new QueryCache({ onError }), mutationCache: new MutationCache({ onError }) })` in `main.jsx`, `onError = handleBranchError(err, queryClient)` matching the three `BRANCH_*` codes; `branchSwitcherForceOpen` consumed by the switcher; `['branches']` invalidation; the "don't persist currentBranch" rule (lines 91-93, 249-253); **Anti-Pattern 3** "one-off try/catch 403 per screen" (255-259) — the exact thing D-05 prevents. Files-changed table (line 223): `main.jsx` modified.
- `.planning/research/PITFALLS.md` — Pitfall 5 (`enabled` gating — never `!!branchId`), Pitfall 11 (single-branch regression); check for any pitfall on SSE retry storms / infinite backoff relevant to D-08.
- `.planning/research/SUMMARY.md` — build order; this phase is the final v1.2 layer on top of the switcher.

### Prior phase context (carried forward — the seams this phase consumes)
- `.planning/phases/16-branch-switcher-ui-switch-flow-language-relocation/16-CONTEXT.md` — **D-11/D-12 are the explicit hard boundary this phase crosses**: Phase 16 shipped ONLY a generic failure toast + revert and left ALL code-aware 403 recovery to Phase 17. `branchSwitcherForceOpen` is the seam (`store.js:72`); `app.jsx` `fireSwitch` is where D-05 trims the generic toast; `useBranchSwitch` already attaches `err.code`.
- `.planning/phases/15-sse-branch-aware-reconnect/15-CONTEXT.md` — **D-06 there is the `onopen` capture scaffold** (`use-sse.js:48-67`) that D-08 here extends into real handling + retry suppression. The deferred list (line 116) names exactly this phase's SSE work.
- `.planning/phases/14-branch-scoped-cache-re-scoping/14-CONTEXT.md` — `unwrapSdkResult`'s `err.code` convention (`data.jsx:200-209`); branch-scoped keys that re-scope automatically when `currentBranch` is set (relevant to D-06 adopt-on-focus).
- `.planning/phases/13-branch-state-launch-seeding-foundation/13-CONTEXT.md` — the D-04 window-`focus` re-seed listener (`auth.jsx:167-180`) that D-07 extends; `currentBranch` is session-only, never persisted.

### SDK / server contract (source of truth over the PRD) — ⚠ verify early
- `node_modules/@charlyk/admin-client/dist/index.d.ts` — the error envelope (`{ error: string }`) and the `me.branches.switch` / list / `getMe` (`selectedBranch`) shapes. **BUILD-TIME VERIFICATION ITEM (blocking for the whole phase):** the entire `err.code` match hinges on `result.error.error` actually yielding the literal strings `BRANCH_INACTIVE` / `BRANCH_ACCESS_REVOKED` / `NO_BRANCH_ACCESS` (vs a human message or a nested `.code`). This is **unverified from docs** (flagged in Phase 15 D-06 and the roadmap Phase 15 planning note). The planner must verify the real 403 body shape — for both ordinary requests **and** the SSE 403 body (`use-sse.js` onopen `response.text()`) — against the live API before locking the matcher, and adjust the extraction in `unwrapSdkResult` / `handleBranchError` accordingly.

### Source files this phase modifies/adds
- `src/main.jsx` — wire `QueryCache`/`MutationCache` `onError: handleBranchError` into the (currently bare) `new QueryClient()` (`main.jsx:8`).
- `src/use-branches.js` (or a new `sdk-helpers.js`) — add `handleBranchError(err, queryClient)` (toast + `branchSwitcherForceOpen` + `['branches']` invalidate + `NO_BRANCH_ACCESS` block trigger).
- `src/app.jsx` — trim the `fireSwitch` generic toast to non-branch failures (D-05, ~219-221); render the `NO_BRANCH_ACCESS` block (D-01) as a top-level gate; wire the block's Retry (D-02).
- `src/use-sse.js` — extend the `onopen` non-2xx branch (48-67) to call `handleBranchError` + stop retrying on a `BRANCH_*` 403 (D-08).
- `src/auth.jsx` — extend the D-04 window-`focus` listener (167-180) to revalidate the selected branch even when `currentBranch` is set (D-06/D-07).
- `src/store.js` — `branchSwitcherForceOpen` (72) is consumed here; a new app-level `noBranchAccess` blocking flag likely added (session-only, never in `partialize`).

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **Global `QueryClient`** (`main.jsx:8`) — currently a bare `new QueryClient()` with no cache-level error handling; the single wiring point for the `onError` choke point.
- **`err.code` convention** — `unwrapSdkResult` (`data.jsx:200-209`) and `useBranchSwitch` (`use-branches.js:31-40`) already attach `err.code`; every fetch hook (`use-orders`, `use-menu`, `use-stats`, `use-order-detail`, `use-history-orders`, `use-delivery-areas`, `use-restaurant-settings`) throws through `unwrapSdkResult`, so their 403s already carry a matchable code.
- **`branchSwitcherForceOpen`** (`store.js:72`, setter `store.js:121`) — the deliberately-unwired reopen seam from Phase 16; consumed here.
- **`pushToast`** (`app.jsx:61`, store action; `{ id, kind, title, detail }`) — for the per-code recovery toasts (D-03) and the D-06 info toast.
- **Phase 15 `onopen` capture scaffold** (`use-sse.js:48-67`) — reads `response.text()` on non-2xx and `console.warn`s the status+body; D-08 turns this observability hook into real handling.
- **D-04 window-`focus` listener** (`auth.jsx:167-180`) — `seedFromMe(client, …)` on focus; D-07 extends its condition from "currentBranch is null" to "always revalidate selected branch."
- **`useBranches()`** (`use-branches.js:5-18`) — `['branches']` query with `refetchOnWindowFocus: true`, `staleTime: 30_000`; the refetch target for `handleBranchError` (its list refetch; a `selectedBranch` change still needs an explicit `getMe` compare per D-06).

### Established Patterns
- **Session-only state never in `partialize`** — `branchSwitcherForceOpen` and any new `noBranchAccess` flag are session-only (never persisted), consistent with `currentBranch` and the "don't persist branch" research rule.
- **Non-optimistic branch set** — `setCurrentBranch` runs only after server confirmation; D-06's adopt-on-focus is the one new place the store adopts the *server's* branch (still server-confirmed, via `getMe`).
- **`isOffline` fan-out** (`app.jsx`) — existing pattern threading connection state to screens; the `NO_BRANCH_ACCESS` block (D-01) supersedes this as a top-level gate rather than a per-screen prop.

### Integration Points
- **Phase 14 caches + Phase 15 SSE** re-scope automatically when `currentBranch` is set (D-06 adopt-on-focus rides this).
- **Phase 16 switcher popover** consumes `branchSwitcherForceOpen` — D-04's reopen is a store set, no new switcher UI.
- **SSE `isConnected`** — the stream's own drop on a `BRANCH_*` 403 must NOT retry-loop (D-08); this is the one error path that bypasses TanStack's `onError`.

</code_context>

<specifics>
## Specific Ideas

- **"One central path" is the whole point** — a switch-call 403 and a later-request 403 must hit the *same* `handleBranchError` (D-05). The failure mode this phase exists to prevent is per-screen `try/catch` divergence (Research Anti-Pattern 3) and silent/generic failures.
- **Distinct codes, distinct copy, same behavior** — INACTIVE vs REVOKED read differently to staff (D-03) but recover identically (reopen + refetch, dismissible). Only `NO_BRANCH_ACCESS` gets a different *behavior* (the block).
- **Don't trap a user who still has a working branch** — the recoverable-code switcher is dismissible (D-04); only the zero-branches case blocks (D-01).
- **Server is source of truth on focus** — a benign remote branch change is adopted, not fought, but surfaced with a neutral toast so the board never silently swaps under staff (D-06).
- **The SSE 403 must stop retrying** — a blind exponential-backoff loop against an inaccessible branch is the concrete harm D-08 prevents.

</specifics>

<deferred>
## Deferred Ideas

- **Sign-out escape hatch on the `NO_BRANCH_ACCESS` block** — considered (D-02) and left out of this phase; could be added later if the "hand off to another login" workflow becomes real.
- **Richer timeout-fallback affordance** (a retry button in the OfflineBanner after a Phase 16 D-09 overlay timeout) — surfaced in Phase 16's deferred list; a natural fold into this phase's recovery UI but NOT required by BERR-01–04, so left for a follow-up unless the planner finds it trivially adjacent.

None of these were scope creep — both are adjacent refinements to already-roadmapped recovery behavior.

</deferred>

---

*Phase: 17-centralized-branch-access-error-handling*
*Context gathered: 2026-07-23*
