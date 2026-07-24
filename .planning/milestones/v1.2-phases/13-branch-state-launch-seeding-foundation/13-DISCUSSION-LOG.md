# Phase 13: Branch State & Launch Seeding Foundation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-21
**Phase:** 13-branch-state-launch-seeding-foundation
**Areas discussed:** Cold-start timing, getMe() failure handling, authUser scope, use-branches.js scope, SC5 reconciliation, focus-retry mechanism

---

## Cold-start seeding timing

| Option | Description | Selected |
|--------|-------------|----------|
| Non-blocking (background) | Paint shell immediately; getMe() fills currentBranch async. Zero added delay (SC5-safe); branch null for ~1 RTT. | |
| Blocking (await first) | Hold coldStartBusy until getMe() resolves; branch guaranteed before paint; adds RTT + a new blank-state risk. | ✓ |

**User's choice:** Blocking (await first)
**Notes:** Reconciled against SC5 below — resolved inside the *existing* coldStartBusy blank gate, so no NEW blank state.

---

## getMe() failure handling on cold start

| Option | Description | Selected |
|--------|-------------|----------|
| Keep trusting token | Any getMe() failure → stay signed in, branch null; only a real 401 from later requests expires. | |
| 401 signs out, else retry | getMe() 401 → expireSession(); network/5xx → stay in, retry on focus. | ✓ |
| Any failure signs out | Any getMe() failure → expireSession() → login. Strictest; a transient blip forces re-login. | |

**User's choice:** 401 signs out, else retry
**Notes:** Preserves the codebase's "trust token until a real 401" philosophy for the non-401 case.

---

## authUser scope (existing cold-start gap)

| Option | Description | Selected |
|--------|-------------|----------|
| Also populate authUser | Same getMe() sets authUser (role + name), fixing the cold-start hardcoded-'Eduard Albu'/no-role gap; touches shell.jsx name mapping. | ✓ |
| currentBranch only | Set only currentBranch; leave authUser as-is; smaller diff, name/role gap persists. | |

**User's choice:** Also populate authUser
**Notes:** Requires reconciling shell.jsx's `authUser?.name` read with getMe()'s `firstName`/`lastName` shape.

---

## use-branches.js scope

| Option | Description | Selected |
|--------|-------------|----------|
| List hook only | Build only useBranches() (['branches'] list, focus/error refetch); switch mutation + force-open → Phase 16. | ✓ |
| Also stub switch + state | Also add useBranchSwitch() + branchSwitcherForceOpen now (dead until Phase 16/17). | |

**User's choice:** List hook only
**Notes:** Keeps Phase 13 tight to BSTATE-01/02; no dead code shipped.

---

## SC5 reconciliation (follow-up to blocking cold-start)

| Option | Description | Selected |
|--------|-------------|----------|
| Reuse gate + reword SC5 | Resolve getMe() inside existing coldStartBusy blank; reword SC5 to "resolves within existing gate, no NEW blank, RTT acceptable." | ✓ |
| Timeout safety valve | Block ≤ ~2–3s then paint anyway; bounds worst-case delay. | |
| Keep SC5 strict | Hold zero-added-delay; would reverse toward non-blocking. | |

**User's choice:** Reuse gate + reword SC5
**Notes:** Planner/verifier hold the reworded bar; possible ROADMAP SC5 edit flagged (not done here).

---

## Focus-retry mechanism (follow-up to getMe() failure)

| Option | Description | Selected |
|--------|-------------|----------|
| Focus listener in AuthProvider | window 'focus' → re-call getMe() while session exists && currentBranch null. Self-contained in auth layer. | ✓ |
| Make getMe a TanStack query | Wrap in useQuery(['me']) for free focus refetch; larger auth refactor. | |
| Defer retry to Phase 17 | Leave branch null on failure; recovery built in Phase 17. | |

**User's choice:** Focus listener in AuthProvider
**Notes:** Launch-seed backstop only; full branch-access 403 recovery stays Phase 17.

---

## Claude's Discretion

- Exact finite `staleTime` for `useBranches()`.
- Focus-listener effect wiring and the `firstName`/`lastName` composition helper.
- Whether `signIn()` keeps an optimistic `signInResult.user` fill before getMe() resolves (final source of truth remains getMe()).

## Deferred Ideas

- `useBranchSwitch()` mutation → Phase 16.
- `branchSwitcherForceOpen` store field → Phase 16/17.
- Branch-scoped query keys / cache re-scoping (7 hooks) → Phase 14.
- Centralized 403 branch-access recovery → Phase 17.
- Possible ROADMAP SC5 wording edit (via /gsd-phase) to match D-02.
