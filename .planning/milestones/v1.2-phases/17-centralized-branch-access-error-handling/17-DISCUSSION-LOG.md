# Phase 17: Centralized Branch-Access Error Handling - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-23
**Phase:** 17-centralized-branch-access-error-handling
**Areas discussed:** NO_BRANCH_ACCESS block, Toast & reopened switcher, Focus revalidation UX, SSE stream 403 routing

---

## Area selection

| Option | Description | Selected |
|--------|-------------|----------|
| NO_BRANCH_ACCESS block | Full-screen blocking state (BERR-03): content + exit path | ✓ |
| Toast & reopened switcher | Recovery for INACTIVE / REVOKED (BERR-01): copy, dismissibility | ✓ |
| Focus revalidation UX | Cross-device change/revocation on focus (BERR-04) | ✓ |
| SSE stream 403 routing | Stream 403 into shared path + retry suppression (SC2) | ✓ |

**User's choice:** All four.
**Notes:** The global-onError choke-point architecture is already locked by research; discussion focused on the product/UX layer on top.

---

## NO_BRANCH_ACCESS block

### Exit path

| Option | Description | Selected |
|--------|-------------|----------|
| Auto + manual retry | Auto-revalidate on focus AND a manual Retry button; clears when a branch becomes accessible | ✓ |
| Auto (focus) only | Silent re-check on focus only, no button | |
| Retry + Sign out | Manual Retry plus a Sign-out escape hatch | |

**User's choice:** Auto + manual retry.
**Notes:** Most forgiving on a fixed POS terminal — staff can force a re-check without alt-tabbing. Sign-out left out (deferred).

### Content

| Option | Description | Selected |
|--------|-------------|----------|
| Message + Retry | Headline + one line of guidance + Retry; nav hidden | ✓ |
| Full branded screen | Logo, centered card, login/gate styling | |
| You decide | Planner picks layout | |

**User's choice:** Message + Retry.
**Notes:** Matches "distinct blocking state that supersedes normal screens" without heavy new UI.

---

## Toast & reopened switcher (INACTIVE / REVOKED)

### Toast copy

| Option | Description | Selected |
|--------|-------------|----------|
| Distinct per code | REVOKED → "access removed"; INACTIVE → "no longer active"; both → "pick another branch" | ✓ |
| One shared message | Single "branch unavailable" message for both | |
| You decide | Planner picks copy | |

**User's choice:** Distinct per code.
**Notes:** The two codes mean genuinely different things to staff; both route to the same reopen+refetch behavior.

### Reopen mode

| Option | Description | Selected |
|--------|-------------|----------|
| Dismissible | Switcher pops open with refetched list; user can close and keep working on a valid branch | ✓ |
| Insistent until picked | Switcher stays/reopens until a valid branch is selected | |
| You decide | Planner picks | |

**User's choice:** Dismissible.
**Notes:** They still have a working branch — don't trap them; the insistent treatment is reserved for NO_BRANCH_ACCESS.

### Double-toast reconciliation

| Option | Description | Selected |
|--------|-------------|----------|
| Central owns branch codes | Central handler owns all 3 BRANCH_* codes; app.jsx generic toast fires only for non-branch failures | ✓ |
| Keep generic, central skips switch | Leave app.jsx generic toast as the switch UI; central handler ignores the switch mutation | |
| You decide | Planner reconciles the two onError paths | |

**User's choice:** Central owns branch codes.
**Notes:** One implementation, two triggers (switch call + later request) — guarantees exactly one recovery per failure, satisfies BERR-01/02.

---

## Focus revalidation UX

### Remote branch change

| Option | Description | Selected |
|--------|-------------|----------|
| Adopt + info toast | Silently adopt server's branch, show neutral "Now showing <branch>" toast | ✓ |
| Adopt silently | Update with no notice | |
| Reopen switcher | Treat any remote change like the recovery path | |

**User's choice:** Adopt + info toast.
**Notes:** Server is source of truth; the info toast prevents silent-swap confusion. Revocation on focus routes through the recovery path (already determined by BERR-04). Throttle/debounce left to planner.

---

## SSE stream 403 routing

| Option | Description | Selected |
|--------|-------------|----------|
| Route to shared handler + stop | onopen detects BRANCH_* code, calls handleBranchError, stops retrying; non-branch errors keep today's retry | ✓ |
| Suppress retry only | Stop retry but no toast/reopen from the stream | |
| You decide | Planner wires it, guarantees no infinite backoff | |

**User's choice:** Route to shared handler + stop.
**Notes:** SC2 explicitly names a stream reconnect as a recovery trigger; prevents the blind exponential-backoff loop against an inaccessible branch.

---

## Claude's Discretion

- Final toast wording + RO/EN i18n key set for all new messages.
- Exact layout/markup of the NO_BRANCH_ACCESS block screen (within design tokens / error-state conventions).
- Focus-revalidation throttle/debounce guard; explicit `getMe().selectedBranch` compare vs relying on `useBranches` `refetchOnWindowFocus`.
- Shape/location of `handleBranchError` (`use-branches.js` vs new `sdk-helpers.js`).
- Whether NO_BRANCH_ACCESS also tears down SSE / stops polling while the block is up.

## Deferred Ideas

- Sign-out escape hatch on the NO_BRANCH_ACCESS block — considered, left out of this phase.
- Richer timeout-fallback affordance (retry in OfflineBanner after a Phase 16 D-09 overlay timeout) — surfaced in Phase 16; a natural fold but not required by BERR-01–04.

## Build-time verification item (flagged, blocking)

The `err.code` matcher hinges on `result.error.error` actually yielding the literal `BRANCH_INACTIVE` / `BRANCH_ACCESS_REVOKED` / `NO_BRANCH_ACCESS` strings — unverified from docs (Phase 15 D-06, roadmap Phase 15 planning note). Planner must verify the real 403 body shape (ordinary requests AND the SSE 403 body) against the live API before locking the matcher.
