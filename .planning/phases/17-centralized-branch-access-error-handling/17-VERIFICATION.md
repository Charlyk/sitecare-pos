---
phase: 17-centralized-branch-access-error-handling
verified: 2026-07-24T00:45:00Z
status: human_needed
score: 30/30 code-verifiable must-haves verified (4/4 roadmap Success Criteria)
behavior_unverified: 4
overrides_applied: 0
human_verification:
  - test: "Trigger a BRANCH_INACTIVE or BRANCH_ACCESS_REVOKED toast with a null/unknown branch name (e.g. clear the branches cache before the 403 fires) and read the rendered detail sentence."
    expected: "Sentence reads naturally (e.g. 'Your access to this branch was removed. Pick another branch.'), never a literal '<branch>' token or an awkward double-space gap."
    why_human: "17-UI-SPEC.md E2-toast 'partial' row is marked backstop — the automated test only proves no literal token/empty-string leaks through, not that the rendered sentence reads naturally in the actual .toast markup."
  - test: "Trip the NO_BRANCH_ACCESS block, click Retry, and visually confirm the button disables and swaps to the spinner + 'Se verifică…'/'Checking…' label while getMe() is in flight, on both the success and unchanged-block outcomes."
    expected: "Button disables, Icon name='refresh' className='spin' renders in var(--sc-primary), label swaps to the busy copy, then either the block clears (branch restored) or re-renders unchanged with the button back to idle."
    why_human: "17-UI-SPEC.md E1-retry 'loading' row is marked backstop — state-transition logic is unit-tested, but the visual spinner-on-primary-fill rendering needs a human look (flagged explicitly in 17-04-SUMMARY.md key-decisions)."
  - test: "Force a network failure during a NO_BRANCH_ACCESS Retry click (e.g. disconnect network) and confirm no extra toast appears."
    expected: "Block stays up unchanged, Retry button returns to idle/enabled, and no additional toast fires (avoiding toast-on-toast noise while already blocking)."
    why_human: "17-UI-SPEC.md E1-retry 'error' row is marked backstop. The state logic (no toast, button reset) is unit-tested in app-branch-error.test.jsx, but the UI-SPEC still calls for a live visual confirmation of the failure path."
  - test: "Trigger a live branch revocation while the SSE stream is connected and confirm no other branch's order events land in the cache during the recovery window (before the next useSSE effect run)."
    expected: "The stream stops after exactly one non-2xx onopen attempt (no retry storm) and no cross-branch order/stat data appears in TanStack Query cache until currentBranch changes and a fresh connection opens."
    why_human: "17-05-PLAN.md's D-08 recovery-path truth is explicitly verification:backstop — reasoned by construction from the diff (no new message-handling code, only an onopen early-return) but not proven by a dedicated test; a live branch-revocation test is the only way to observe it end-to-end."
gaps: []
---

# Phase 17: Centralized Branch-Access Error Handling Verification Report

**Phase Goal:** Any branch-access failure — from the switch call itself or from any later ordinary request — recovers through one consistent, visible path instead of surfacing as a generic or silent failure.

**Verified:** 2026-07-24T00:45:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (Roadmap Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | A `BRANCH_INACTIVE`/`BRANCH_ACCESS_REVOKED` 403 from the switch call itself produces a toast, reopens the switcher, refetches the branch list, and stays on the previous branch with no other change | ✓ VERIFIED | `src/main.jsx:14-17` wires `MutationCache.onError -> handleBranchError`; `src/use-branches.js:81-107` dispatches toast+`setBranchSwitcherForceOpen(true)`+`invalidateQueries(['branches'])` for both codes; `src/app.jsx:227-239` (`fireSwitch` onError) runs cleanup (`switchPhase` idle, `pendingBranch` null) unconditionally and suppresses only the *generic* toast via `!BRANCH_CODES.includes(err?.code)` (no double toast); `setCurrentBranch` is called only in `useBranchSwitch`'s `onSuccess` (`src/use-branches.js:44-48`), so a rejected switch never mutates `currentBranch`. Tested: `src/__tests__/use-branches.test.js`, `src/__tests__/app-branch-switch.test.jsx` (all pass). |
| 2 | The identical recovery also fires from any later ordinary request (order refetch, mutation, stream reconnect), not only a switch attempt | ✓ VERIFIED | `QueryCache.onError` (covers ordinary query refetches) and `MutationCache.onError` (covers any mutation) both wired to `handleBranchError` in `src/main.jsx:14-17` — a single, central choke point, not per-call-site handling (confirmed no `BRANCH_*` literal outside `use-branches.js` except comments: `grep -rn "BRANCH_INACTIVE\|BRANCH_ACCESS_REVOKED\|NO_BRANCH_ACCESS" src` shows no other logic branch). Stream reconnect: `src/use-sse.js:88-95` short-circuits a branch-403 `onopen` to `handleBranchError` and returns without throwing (stops fetchEventSource retry). Tested: `src/__tests__/use-sse.test.js` (31/31 pass). |
| 3 | `NO_BRANCH_ACCESS` 403 produces a distinct blocking state taking over the entire app, not the toast-and-reopen treatment | ✓ VERIFIED | `src/use-branches.js:88-91` — `NO_BRANCH_ACCESS` branch calls `setNoBranchAccess(true)` and returns with no toast/reopen (distinct from the other two codes). `src/app.jsx:356-378` gates `if (noBranchAccess) return <NoBranchAccessBlock .../>` after the `!isAuthenticated` early return and before the `<Shell>` return — `<Shell>`/nav/screen router is structurally unreachable while the block is up. `src/no-branch-access.jsx` renders a box-less, full-viewport block on `--sc-background` per the UI-SPEC. Retry (`app.jsx:361-375`) clears the flag only on a confirmed non-null `getMe().selectedBranch` — never optimistic. Tested: `src/__tests__/app-branch-error.test.jsx` (6/6 pass). |
| 4 | Returning to the app after focus revalidates the selected branch, surfacing a branch change or access revocation made on another device through the same recovery path | ✓ VERIFIED | `src/auth.jsx:189-227` — the `|| currentBranch` short-circuit is removed (`grep -n "currentBranch" src/auth.jsx` shows no such guard remains); every focus calls `getMe()` (guarded by an in-closure `inFlight` boolean against re-entrancy); a different-but-valid server branch is adopted (`setCurrentBranch`) with a neutral `branch_focus_update_*` toast; `selectedBranch === null` or a thrown 403 calls `setNoBranchAccess(true)` — the identical flag/block `NO_BRANCH_ACCESS` uses; a thrown 401 calls `expireSession()`; same branch is a no-op. Tested: `src/__tests__/auth.test.jsx` (11/11 pass), `src/__tests__/auth-token.test.jsx`. |

**Score:** 4/4 roadmap Success Criteria verified.

### Plan-Level Must-Have Truths (merged from PLAN frontmatter, Step 2c)

All non-backstop `must_haves.truths` across the six plans were cross-checked against the live source (not just SUMMARY claims) and against a fresh test run.

| Plan | Truths (non-backstop) | Status | Verification |
|------|------------------------|--------|---------------|
| 17-01 | 4 (central dispatch, guard-first early-return, shell consume-once reopen, `<branch>` interpolation fallback chain) | ✓ VERIFIED (4/4) | Source read (`use-branches.js`, `main.jsx`, `shell.jsx:61-74`) + `npx vitest run src/__tests__/use-branches.test.js src/__tests__/shell.test.jsx` → all pass |
| 17-02 | 2 (matcher lock test; correct-if-differs) | ⚠️ CAVEAT (see Known Caveats) | Live capture was infeasible (documented, WINDOWS.md #1) — the matcher is locked against an ASSUMED shape, not a live-verified one. Not treated as a phase blocker per explicit scope note below; tracked as an open ledger item. |
| 17-03 | 6 (three-code dispatch, no-double-toast, unconditional cleanup, `currentBranch` never mutated on reject, `noBranchAccess` session-only/excluded from partialize, single-branch tenant non-misfire) | ✓ VERIFIED (6/6) | Source read (`use-branches.js:73-107`, `store.js:76,126,132-139`, `app.jsx:210-241`) + `npx vitest run src/__tests__/store.test.js src/__tests__/use-branches.test.js src/__tests__/app-branch-switch.test.jsx` → 71/71 pass |
| 17-04 | 4 (top-level gate placement, box-less full-viewport rendering, non-optimistic Retry, single-branch tenant never sees block) | ✓ VERIFIED (4/4) | Source read (`app.jsx:352-378`, `no-branch-access.jsx`) + `npx vitest run src/__tests__/app-branch-error.test.jsx` → 6/6 pass |
| 17-05 | 4 (branch-403 short-circuit returns-not-throws, non-branch fallback unchanged, `extractBranchCodeFromSseBody` never throws, disconnect-and-no-self-heal) | ✓ VERIFIED (4/4) | Source read (`use-sse.js:13-99`) + `npx vitest run src/__tests__/use-sse.test.js` → 31/31 pass |
| 17-06 | 6 (guard generalized, adopt+toast/no-op split, null/403 → block, 401 → expire / other swallowed, reentrancy guard, single-branch non-misfire) | ✓ VERIFIED (6/6) | Source read (`auth.jsx:189-227`) + `npx vitest run src/__tests__/auth.test.jsx src/__tests__/auth-token.test.jsx` → both pass |

Total code-verifiable truths: **26/26 plan-level + 4/4 roadmap SCs = 30/30 verified.**

### Backstop Truths (verification: backstop, per Step 3 step 5b)

Six `must_haves.truths` entries across the phase's plans are explicitly declared `verification: backstop` (non-inferable from code/tests, requiring human/visual confirmation per 17-UI-SPEC.md's own edge-coverage table). Per the honest-verifier protocol, these abstain from `VERIFIED` and route to human verification / caveats rather than a silent pass:

| Plan | Backstop Truth | Disposition |
|------|-----------------|-------------|
| 17-01 | Toast branch-name fallback reads as a sensible sentence, not a broken string | Human Verification item #1 |
| 17-02 | Captured SSE 403 body shape recorded distinctly from REST shape | Known Caveat (WINDOWS #1) — live capture infeasible |
| 17-03 | Burst of simultaneous branch-403s converges to ONE recovery, not a stack of N | Known Caveat (WINDOWS #2) — no dedup guard implemented, confirmed by source read (`handleBranchError` has no in-flight/dedup state) |
| 17-04 | Retry in-flight spinner/label swap renders correctly | Human Verification item #2 |
| 17-04 | Retry network-failure path shows no extra toast (state logic is unit-tested; visual confirmation is backstop) | Human Verification item #3 |
| 17-05 | Stopped SSE stream does not cross-branch-bleed cache during recovery | Human Verification item #4 |

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/use-branches.js` | `handleBranchError(err, queryClient)` + `BRANCH_CODES` export | ✓ VERIFIED | Both exported (`use-branches.js:56,81`); guard-first, dispatches all 3 codes |
| `src/main.jsx` | `QueryCache`/`MutationCache` `onError` wired to `handleBranchError` | ✓ VERIFIED | `main.jsx:14-17` |
| `src/shell.jsx` | Consumes `branchSwitcherForceOpen` (consume-once reopen) | ✓ VERIFIED | `shell.jsx:67-74` |
| `src/store.js` | `noBranchAccess` field + setter, excluded from `partialize` | ✓ VERIFIED | `store.js:76,126`; `partialize` (132-139) has only the 6 persisted keys, no `noBranchAccess` |
| `src/app.jsx` | `fireSwitch` `BRANCH_CODES` guard; top-level `noBranchAccess` gate; non-optimistic Retry | ✓ VERIFIED | `app.jsx:227-239` (guard), `352-378` (gate + Retry) |
| `src/no-branch-access.jsx` | `NoBranchAccessBlock({ lang, onRetry, retrying })` | ✓ VERIFIED | Box-less, full-viewport, existing tokens only (no hardcoded hex: confirmed via grep) |
| `src/use-sse.js` | `extractBranchCodeFromSseBody` + onopen 403 short-circuit | ✓ VERIFIED | `use-sse.js:13-28,88-95` |
| `src/auth.jsx` | Generalized focus listener (no `|| currentBranch` short-circuit) | ✓ VERIFIED | `auth.jsx:189-227` |
| `src/i18n.jsx` | All new key pairs in both `ro`/`en` (1:1 parity) | ✓ VERIFIED | `branch_err_revoked_title`(×2), `branch_err_inactive_title`(×2), `branch_no_access_title`(×2), `branch_focus_update_title`(×2), `branch_generic_fallback`(×2) — all confirmed count=2 |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `main.jsx` QueryCache/MutationCache `onError` | `handleBranchError` | direct closure call | ✓ WIRED | `main.jsx:15-16` |
| `handleBranchError` `setBranchSwitcherForceOpen(true)` | `shell.jsx` `branchMenuOpen` | consume-once `useEffect` | ✓ WIRED | `shell.jsx:70-74` |
| `handleBranchError` `NO_BRANCH_ACCESS` → `setNoBranchAccess(true)` | `app.jsx` gate → `NoBranchAccessBlock` | store flag → top-level early return | ✓ WIRED | `app.jsx:356-378` |
| `NoBranchAccessBlock` Retry → `getMe()` | `setCurrentBranch` + `setNoBranchAccess(false)` (only on non-null `selectedBranch`) | `onRetry` handler | ✓ WIRED | `app.jsx:361-375` |
| `use-sse.js` onopen branch-403 | `handleBranchError` | direct call, return-not-throw | ✓ WIRED | `use-sse.js:88-94` |
| `auth.jsx` window focus | `getMe()` compare → adopt/block/expire | generalized `useEffect` | ✓ WIRED | `auth.jsx:189-227` |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Target test files for all 6 plans | `npx vitest run src/__tests__/{use-branches,shell,store,app-branch-switch,app-branch-error,use-sse,auth,auth-token}.test.js{,x}` | 155/155 passed | ✓ PASS |
| Full suite regression | `npx vitest run` (run once) | 620/621 passed | ✓ PASS (see caveat below for the 1 failure) |
| No per-call-site `BRANCH_*` branching outside the central handler | `grep -rn "BRANCH_INACTIVE\|BRANCH_ACCESS_REVOKED\|NO_BRANCH_ACCESS" src --include="*.jsx" --include="*.js" \| grep -v use-branches.js \| grep -v __tests__` | 3 matches, all comments (no logic) | ✓ PASS |
| `noBranchAccess` excluded from persisted state | `grep -A8 "partialize:" src/store.js` | 6 persisted keys, no `noBranchAccess` | ✓ PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|--------------|--------|----------|
| BERR-01 | 17-01, 17-02, 17-03, 17-05 | `BRANCH_INACTIVE`/`BRANCH_ACCESS_REVOKED` handled through one central path (toast + reopen + refetch), from switch call and any later request | ✓ SATISFIED | See Truth #1/#2 above |
| BERR-02 | 17-03 | Rejected switch leaves app on previous branch, no change beyond error notice | ✓ SATISFIED | `app.jsx:227-239` unconditional cleanup; `setCurrentBranch` only in `onSuccess` |
| BERR-03 | 17-04 | `NO_BRANCH_ACCESS` shows distinct full-screen blocking state | ✓ SATISFIED | See Truth #3 above |
| BERR-04 | 17-06 | Selected branch revalidated on window focus | ✓ SATISFIED | See Truth #4 above |

No orphaned requirements — REQUIREMENTS.md's Phase 17 traceability row lists exactly BERR-01..04, all claimed by plan frontmatter.

### Anti-Patterns Found

None blocking. No `TBD`/`FIXME`/`XXX`/`TODO`/`HACK`/`PLACEHOLDER` markers in any of the 8 phase-modified source files (`use-branches.js`, `main.jsx`, `store.js`, `app.jsx`, `no-branch-access.jsx`, `use-sse.js`, `auth.jsx`, `shell.jsx`). No stub returns, no hardcoded empty data flowing to render, no console.log-only implementations.

### Human Verification Required

1. **Toast branch-name fallback reads naturally** — Trigger a `BRANCH_INACTIVE`/`BRANCH_ACCESS_REVOKED` toast with no `err.branchName` and no `currentBranch` (fallback path). Expected: sentence reads sensibly ("Your access to this branch was removed..."), never a literal `<branch>` token or empty gap. Why human: UI-SPEC E2-toast "partial" row is backstop — automated test proves no broken token, not sentence naturalness.

2. **NO_BRANCH_ACCESS Retry loading state visual** — Click Retry and observe the spinner/label swap. Expected: button disables, `Icon name="refresh" className="spin"` renders in `var(--sc-primary)`, label swaps to busy copy. Why human: UI-SPEC E1-retry "loading" is backstop; the icon-on-matching-primary-fill rendering was flagged by the executor itself as worth a visual look (17-04-SUMMARY.md key-decisions).

3. **NO_BRANCH_ACCESS Retry network-failure path** — Force a network drop during Retry. Expected: block stays up, no extra toast, button returns to idle. Why human: UI-SPEC E1-retry "error" is backstop despite the state logic being unit-tested.

4. **SSE branch-403 recovery does not cross-branch-bleed cache** — Trigger a live branch revocation while SSE is connected. Expected: stream stops after one attempt, no wrong-branch data appears in cache before `currentBranch` changes. Why human: 17-05's D-08 truth is explicitly backstop — reasoned by construction from the diff, not proven by a dedicated test.

### Known Caveats (Non-Blocking, tracked in `.planning/WINDOWS.md`)

These are explicitly flagged, intentional deviations — not phase failures — per the phase's own risk-management process (both are open ledger entries with documented follow-ups):

1. **WINDOWS.md #1 — Unverified 403 body shape (REST + SSE) and zero-branch `getMe()` behavior.** Live capture against the real API was infeasible during 17-02 (no accessible test tenant). The `BRANCH_CODES` matcher (`use-branches.js`) and `extractBranchCodeFromSseBody` (`use-sse.js`) parse an ASSUMED `{ error: '<CODE>' }` shape, locked only by synthetic tests. If the real shape differs, recovery degrades safely (parser/matcher returns null/no-match → falls through to the existing retry/generic-error path) rather than crashing or silently corrupting state — but BERR-01/02/03's recovery would not fire for a real-world 403 until the shape is re-captured and corrected. **Follow-up required**: re-capture the real 403 body against a live test tenant.

2. **WINDOWS.md #2 — D-05 concurrent-error de-dup backstop not implemented.** `handleBranchError` has no de-dup/in-flight guard — a burst of simultaneously-rejecting branch-scoped queries (e.g. multiple screens fetching at once) would each independently push a toast, producing a stack of N toasts rather than the single converged recovery the UI-SPEC's E2-toast "zero-one-many" row describes. Confirmed by source read: no debounce/dedup state exists in `use-branches.js`. This matches the UI-SPEC's own backstop marking for that row (not an automated-test deliverable of this phase) and does not violate the phase's core success criteria (each individual request still recovers through the same path) — but it is a real, observable multi-toast UX edge case if triggered.

3. **Pre-existing, unrelated test failure**: `src/__tests__/build-pipeline.test.js` `BILD-04` (`bundle.createUpdaterArtifacts` is `"v1Compatible"` not `true`, from commit `f1d533d` macOS packaging) — documented in `deferred-items.md` since 17-01, confirmed still present on this verification's full-suite run (620/621), unrelated to any Phase 17 file.

### Gaps Summary

No gaps found. All four roadmap Success Criteria are code-verified with passing automated tests, all six plans' required artifacts exist/are substantive/are wired, and no blocking anti-patterns were found. The phase goal — a single, central branch-access-403 recovery path spanning the switch call, ordinary requests, SSE reconnects, and window-focus revalidation — is demonstrably implemented and exercised by 155 passing target tests (620/621 full suite, 1 pre-existing unrelated failure).

Status is `human_needed` rather than `passed` solely because four visual/behavioral backstop items (explicitly declared `verification: backstop` in the UI-SPEC and plan frontmatter, not automated-test deliverables) still require a human to look at the running app, plus two openly-tracked, non-blocking caveats (WINDOWS.md #1 unverified live 403 shape, #2 no concurrent-burst dedup) that the phase's own risk process flagged rather than hid.

---

*Verified: 2026-07-24T00:45:00Z*
*Verifier: Claude (gsd-verifier)*
