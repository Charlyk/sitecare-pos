---
phase: 17-centralized-branch-access-error-handling
plan: 02
subsystem: error-handling
tags: [tanstack-query, vitest, err-code-matcher, risk-flagged]

# Dependency graph
requires:
  - phase: 17-centralized-branch-access-error-handling (plan 01)
    provides: BRANCH_CODES allowlist, handleBranchError(err, queryClient) central dispatcher
provides:
  - "A regression test locking the CURRENTLY ASSUMED err.code extraction contract (three literal strings) — PROVISIONAL, not verified against a live API"
  - "A recorded project decision + broken-windows ledger entry flagging the 403 body shape as unverified, for 17-05 and downstream plans to consume"
affects: [17-03, 17-04, 17-05, 17-06]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Provisional-matcher-with-flagged-risk: when a load-bearing runtime unknown cannot be live-verified, ship the documented assumption unchanged, lock it with a test that will break on drift, and record the risk as a first-class decision + ledger entry rather than silently treating a passing synthetic test as confirmation"

key-files:
  created: []
  modified:
    - src/__tests__/use-branches.test.js

key-decisions:
  - "17-02: BRANCH_CODES err.code matcher shipped PROVISIONAL — live 403 capture infeasible (see STATE.md decision log and .planning/WINDOWS.md entry #1)"

patterns-established:
  - "Pattern: a blocking-human checkpoint resolved as 'live capture infeasible' still produces a concrete artifact — a regression test locking the current assumption plus an explicit, greppable risk flag (decision + ledger entry) — rather than a silent pass-through."

requirements-completed: [BERR-01]

coverage:
  - id: D1
    description: "err.code extraction from the ASSUMED REST 403 body { error: 'BRANCH_ACCESS_REVOKED' } yields the exact literal code, and handleBranchError dispatches on it (toast, forceOpen, invalidate) — locks the current assumption, not a verified runtime fact"
    requirement: "BERR-01"
    verification:
      - kind: unit
        ref: "src/__tests__/use-branches.test.js#[PROVISIONAL] err.code extraction from the assumed REST 403 body { error: \"BRANCH_ACCESS_REVOKED\" } yields the exact literal code, and handleBranchError dispatches on it"
        status: pass
    human_judgment: true
    rationale: "The test proves the CODE PATH is internally consistent (extraction -> dispatch), but does NOT prove the assumed body shape matches the real live API — that fact is unverified. A human/future plan must confirm the real 403 shape before this can be marked fully verified; see Known Stubs below."

duration: ~8min
completed: 2026-07-23
status: complete
---

# Phase 17 Plan 02: Provisional err.code Matcher Lock (Risk Flagged) Summary

**Blocking-human checkpoint resolved as "live capture infeasible" — the three-literal-string BRANCH_CODES matcher from 17-01 is kept unchanged and locked by a new regression test, with the REST/SSE 403 body shapes recorded as explicit UNVERIFIED assumptions (not confirmed facts) via a project decision and a broken-windows ledger entry for 17-05 to re-check.**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-07-23T20:58:00Z (approx)
- **Completed:** 2026-07-23T21:06:02Z
- **Tasks:** 1 (checkpoint pre-resolved by orchestrator; auto Task 1 executed)
- **Files modified:** 1 (`src/__tests__/use-branches.test.js`)

## Accomplishments
- Blocking-human checkpoint "Capture the real 403 body shape (REST + SSE) against the live API" resolved per the plan's own fallback clause: live capture was genuinely infeasible (no reachable test tenant with a deactivable/revocable branch in the execution environment), so the three literal strings (`BRANCH_INACTIVE`, `BRANCH_ACCESS_REVOKED`, `NO_BRANCH_ACCESS`) named in REQUIREMENTS.md/CONTEXT.md were shipped as-is, unchanged
- Added a regression test in `src/__tests__/use-branches.test.js` that drives `useBranchSwitch`'s real `mutationFn` against a mocked SDK response shaped `{ error: 'BRANCH_ACCESS_REVOKED' }`, asserts `err.code` equals the exact literal string, and then asserts `handleBranchError` dispatches correctly (toast, `branchSwitcherForceOpen`, `invalidateQueries(['branches'])`) — this locks the CURRENTLY ASSUMED extraction contract so a future drift (a real body that doesn't match) breaks the test instead of silently no-opping in production
- Recorded the ASSUMED REST 403 body shape and the ASSUMED SSE 403 body shape as a project decision (STATE.md decision log) and a broken-windows ledger entry (`.planning/WINDOWS.md`, kind=`deviation`, id=1) — both explicitly labeled UNVERIFIED — for 17-05 and downstream plans to inherit the flagged assumption rather than a false "verified"
- `src/use-sse.js` was NOT modified, per the plan's explicit instruction — only the finding is recorded, the SSE parse implementation lands in 17-05
- `npx vitest run src/__tests__/use-branches.test.js` passes 17/17 (16 pre-existing + 1 new)

## Task Commits

1. **Checkpoint: Capture the real 403 body shape (REST + SSE) against the live API** — pre-resolved by the orchestrator (no code change; resolution = "live capture infeasible, shipping provisional literal-string matcher with flagged risk")
2. **Task 1: Lock or correct the err.code matcher against the captured 403 shape** — `d7d2df6` (test)

**Plan metadata:** committed as part of this SUMMARY commit.

## Files Created/Modified
- `src/__tests__/use-branches.test.js` — added one regression test locking the assumed REST 403 body shape's err.code extraction + handleBranchError dispatch, clearly flagged `[PROVISIONAL]` in its title and preceded by a comment block explaining why live capture wasn't possible and what 17-05 must re-verify

## Decisions Made
- **BRANCH_CODES matcher kept unchanged (three literal strings, provisional form).** No source-code change to `src/use-branches.js` — the matcher form was already correct per the plan's fallback clause; only a regression test was added to lock the current assumption.
- **ASSUMED REST 403 body shape (UNVERIFIED, not observed):** `{ error: 'BRANCH_ACCESS_REVOKED' }` (and analogously `{ error: 'BRANCH_INACTIVE' }`, `{ error: 'NO_BRANCH_ACCESS' }`) — the bare literal enum string inside the SDK's `{ error: string }` envelope, per `unwrapSdkResult`'s existing convention. **This has never been observed against the live API.**
- **ASSUMED SSE 403 body shape (UNVERIFIED, not observed):** same `{ error: '<LITERAL_CODE>' }` JSON shape, assumed identical to the REST envelope purely because it's the one SDK-wide convention confirmed elsewhere in the codebase — but the SSE route (`/v1/sse/orders`) is hand-rolled server-side (not SDK-unwrapped), so this assumption is weaker than the REST one and carries independent risk (RESEARCH.md Pitfall 3, Assumption A2).
- **zero-branch `getMe()` behavior (UNVERIFIED, not observed):** whether `selectedBranch` comes back `null` or `getMe()` itself throws a 403 with `NO_BRANCH_ACCESS` (RESEARCH.md Assumption A3) — not confirmed this plan; affects 17-06's focus-revalidation path.
- **Risk recorded as a first-class artifact, not just prose:** both a `state.add-decision` entry and a `.planning/WINDOWS.md` ledger entry (kind=`deviation`, id=1) were created so the flagged assumption survives past this SUMMARY's context window and is visible at ship-gate time (`/gsd-ship` blocks while ledger entries are open).

## Deviations from Plan

None — plan executed exactly as written, including its own explicit fallback clause for the case where live 403 capture is infeasible during execution. The checkpoint's "how-to-verify" section anticipated exactly this outcome and specified this exact resolution path (ship provisional literal strings + flag risk + follow-up task), which was followed precisely.

## Issues Encountered

None new. The plan 17-01 pre-existing `build-pipeline.test.js` failure (unrelated, documented in 17-01-SUMMARY.md and `deferred-items.md`) was not re-investigated here — out of scope for this plan's files.

## Known Stubs

**The BRANCH_CODES / err.code matcher is a PROVISIONAL/UNVERIFIED assumption, not a confirmed runtime contract.**
- **File:** `src/use-branches.js` (BRANCH_CODES const, handleBranchError, useBranchSwitch's err.code attach)
- **Reason:** The load-bearing runtime unknown — whether the live API's 403 `{ error: string }` envelope actually contains the literal enum code (`BRANCH_INACTIVE`/`BRANCH_ACCESS_REVOKED`/`NO_BRANCH_ACCESS`) rather than a human-readable sentence — could not be verified because no live/staging test account with a deactivable or revocable branch was reachable during execution (login was not possible in the capture environment).
- **What proves this is a stub, not a bug:** the new regression test in `src/__tests__/use-branches.test.js` only proves internal consistency (the code path extracts and dispatches correctly given the assumed shape) — it does NOT prove the assumed shape matches reality. If the real 403 body differs (a human sentence, a nested `.code` field, a differently-keyed field), the entire matcher silently no-ops in production and BERR-01/02/03 fail invisibly, exactly as RESEARCH.md Pitfall 1 describes.
- **Follow-up:** recorded in `.planning/WINDOWS.md` (entry #1, kind=`deviation`) — re-capture the real REST + SSE 403 body against the live `sitecare-orders-api` once a suitable test account exists, and correct the matcher/extraction if it differs. Plan 17-05 (which implements `extractBranchCodeFromSseBody`) MUST re-confirm the real SSE shape rather than assuming it mirrors the REST shape.

## Broken-Windows Ledger

Appended to `.planning/WINDOWS.md`:
- **Entry #1** — kind=`deviation`, phase=17, file=`src/use-branches.js` — "BRANCH_CODES err.code matcher is PROVISIONAL/UNVERIFIED — live 403 capture infeasible during 17-02 execution. Follow-up: re-capture real REST+SSE 403 body once a test account is available."

## User Setup Required

None for this plan's own execution — the plan's `user_setup` field named the ideal live test-account access, but that access was unavailable and the plan's documented fallback (ship provisional, flag risk) was used instead. **A future session/plan will need a test account whose branch can be deactivated or revoked, against the live `sitecare-orders-api`, to actually resolve this stub.**

## Next Phase Readiness

The matcher is unblocked for downstream plans to build on (17-03's `BRANCH_INACTIVE`/`NO_BRANCH_ACCESS` wiring, 17-04's `fireSwitch` trim, 17-05's SSE extension, 17-06's focus-revalidation extension) — but every one of those plans inherits a flagged, unverified assumption, not a confirmed one. 17-05 in particular MUST NOT treat the REST shape's assumption as automatically applying to the SSE shape; both are independently unverified (RESEARCH.md Assumption A1 vs A2).

**Blocker for full closure of this phase's risk:** live API access with a test account capable of triggering a real 403 (deactivated/revoked branch, zero-branch account) remains unavailable. This is now tracked in `.planning/WINDOWS.md` and must be resolved before the phase can be considered fully risk-clear, though it does not block continued plan execution per the plan's own fallback clause.

---
*Phase: 17-centralized-branch-access-error-handling*
*Completed: 2026-07-23*

## Self-Check: PASSED

- `src/__tests__/use-branches.test.js` confirmed present on disk and containing the new `[PROVISIONAL]` test
- Task commit `d7d2df6` confirmed in `git log --oneline -1`
- All acceptance criteria re-verified:
  - Regression test asserts err.code extraction yields the exact literal value AND handleBranchError dispatches on it — PASS (new test in describe block "handleBranchError")
  - SUMMARY records the REST 403 body shape and SSE 403 body shape verbatim, labeled UNVERIFIED — PASS (see "Decisions Made" above)
  - `npx vitest run src/__tests__/use-branches.test.js` passes — PASS (17/17 passed)
- `src/use-sse.js` confirmed untouched (`git diff --stat` shows no changes to this file)
- Decision recorded via `gsd_run query state.add-decision` — confirmed added
- Follow-up correction task recorded via `gsd_run query windows append` — confirmed entry id=1, status=open
