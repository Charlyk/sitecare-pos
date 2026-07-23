---
phase: 17-centralized-branch-access-error-handling
plan: 05
subsystem: error-handling
tags: [sse, fetch-event-source, tanstack-query, vitest, tdd, risk-flagged]

# Dependency graph
requires:
  - phase: 17-centralized-branch-access-error-handling (plan 01)
    provides: BRANCH_CODES allowlist, handleBranchError(err, queryClient) central dispatcher
  - phase: 17-centralized-branch-access-error-handling (plan 02)
    provides: BRANCH_CODES matcher locked (provisional, flagged risk — WINDOWS.md entry #1, SSE shape UNVERIFIED)
  - phase: 17-centralized-branch-access-error-handling (plan 03)
    provides: handleBranchError complete for all three BRANCH_CODES
provides:
  - "extractBranchCodeFromSseBody(rawText) helper in use-sse.js — parses the SSE onopen 403 body against the ASSUMED { error: '<CODE>' } shape, never throws, returns null on malformed/non-JSON input"
  - "SSE onopen branch-403 short-circuit: routes a BRANCH_* 403 to handleBranchError and returns without throwing, stopping fetchEventSource's retry loop against an inaccessible branch (D-08)"
affects: [17-06]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Return-not-throw retry suppression: the one onopen branch inspects status+body BEFORE the existing throw and returns early on a matched branch code, leaving every other non-2xx path unchanged"

key-files:
  created: []
  modified:
    - src/use-sse.js
    - src/__tests__/use-sse.test.js

key-decisions:
  - "17-05: extractBranchCodeFromSseBody targets the ASSUMED SSE 403 body shape { error: '<CODE>' } / bare-string, copied from 17-02's REST-side convention — this remains UNVERIFIED against the live API; WINDOWS.md entry #1's follow-up (re-capture the real SSE 403 body) still stands and is NOT closed by this plan"
  - "The branch-403 short-circuit is gated on response.status === 403 specifically — a body carrying a BRANCH_* code at any other status (e.g. 500) does NOT short-circuit, preserving the existing warn+throw retry path for every non-403 non-2xx case"

patterns-established:
  - "Pattern: an onopen callback that must suppress a library's own retry mechanism resolves (returns) rather than rejects (throws) — the inverse of the existing D-06 scaffold's default behavior, applied only inside a narrowly-gated status+body-match branch"

requirements-completed: [BERR-01]

coverage:
  - id: D1
    description: "A branch-403 onopen (status 403, body carrying a BRANCH_* code) calls handleBranchError({ code }, queryClient), sets isConnected false, and resolves WITHOUT throwing — no retry scheduled"
    requirement: "BERR-01"
    verification:
      - kind: unit
        ref: "src/__tests__/use-sse.test.js#D-08 — SSE onopen 403 short-circuit routes BRANCH_* codes to handleBranchError without throwing > a 403 onopen with a body carrying a BRANCH_* code calls handleBranchError and resolves without throwing (no retry scheduled)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Non-branch 403 bodies (non-JSON, or JSON with no recognized code) and non-403 non-2xx statuses fall through to the unchanged console.warn + throw path (retry preserved) — even a non-403 status carrying a branch code in its body does not short-circuit"
    requirement: "BERR-01"
    verification:
      - kind: unit
        ref: "src/__tests__/use-sse.test.js#D-08 — SSE onopen 403 short-circuit routes BRANCH_* codes to handleBranchError without throwing > a 403 onopen whose body is non-JSON falls through to the existing console.warn + throw (retry preserved)"
        status: pass
      - kind: unit
        ref: "src/__tests__/use-sse.test.js#D-08 — SSE onopen 403 short-circuit routes BRANCH_* codes to handleBranchError without throwing > a 403 onopen whose body carries no branch code falls through to the existing console.warn + throw (retry preserved)"
        status: pass
      - kind: unit
        ref: "src/__tests__/use-sse.test.js#D-08 — SSE onopen 403 short-circuit routes BRANCH_* codes to handleBranchError without throwing > a non-403 non-2xx onopen keeps the existing warn + throw behavior unchanged (retry preserved)"
        status: pass
      - kind: unit
        ref: "src/__tests__/use-sse.test.js#D-06: a non-2xx onopen logs status + best-effort body before the unchanged throw, and does not connect"
        status: pass
    human_judgment: false
  - id: D3
    description: "extractBranchCodeFromSseBody(rawText) never throws: returns null for undefined/empty/non-JSON input, and extracts the code from the ASSUMED { error: '<CODE>' } / bare-string body shape"
    requirement: "BERR-01"
    verification:
      - kind: unit
        ref: "src/__tests__/use-sse.test.js#extractBranchCodeFromSseBody (17-05, V5 input validation) > returns null for undefined input"
        status: pass
      - kind: unit
        ref: "src/__tests__/use-sse.test.js#extractBranchCodeFromSseBody (17-05, V5 input validation) > returns null for empty-string input"
        status: pass
      - kind: unit
        ref: "src/__tests__/use-sse.test.js#extractBranchCodeFromSseBody (17-05, V5 input validation) > returns null for non-JSON input and never throws"
        status: pass
      - kind: unit
        ref: "src/__tests__/use-sse.test.js#extractBranchCodeFromSseBody (17-05, V5 input validation) > returns the code for the ASSUMED { error: \"<CODE>\" } body shape"
        status: pass
      - kind: unit
        ref: "src/__tests__/use-sse.test.js#extractBranchCodeFromSseBody (17-05, V5 input validation) > returns the code for a bare JSON string body"
        status: pass
    human_judgment: false
  - id: D4
    description: "The stopped stream does not write another branch's events into cache during recovery — no cross-branch bleed; a fresh connection opens only on a currentBranch change (D-08 recovery-path backstop)"
    verification: []
    human_judgment: true
    rationale: "This truth is marked 'backstop' verification in the plan's own must_haves (statement + verification: backstop), not an automated-test deliverable this plan. The short-circuit itself opens no new connection and performs no cache writes on the branch-403 path (only handleBranchError's invalidateQueries(['branches']) runs, which is branch-agnostic metadata, not order/stat cache data) — reasoned by construction from the diff, not proven by a dedicated new test. Phase 15's existing D-03 scopedBranchId-capture tests already cover the general cross-branch-bleed invariant for message handlers; this plan adds no new message-handling code, only an onopen early-return, so no new bleed surface is introduced. A human/future plan should still confirm via a live branch-revocation manual test per the plan's own verification section."

duration: ~4min
completed: 2026-07-23
status: complete
---

# Phase 17 Plan 05: SSE onopen Branch-403 Short-Circuit (D-08) Summary

**`use-sse.js`'s `onopen` now routes a branch-access SSE 403 through the same central `handleBranchError` dispatcher and returns without throwing — stopping `fetchEventSource`'s exponential-backoff retry loop against an inaccessible branch — while every non-branch non-2xx case (malformed body, non-branch code, non-403 status) keeps the exact prior warn+throw/retry behavior.**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-07-23T21:21:30Z (approx, per STATE.md session timestamp for 17-04 completion)
- **Completed:** 2026-07-23T21:25:00Z (approx)
- **Tasks:** 1 (TDD, RED → GREEN, no REFACTOR needed)
- **Files modified:** 2

## Accomplishments
- Added `extractBranchCodeFromSseBody(rawText)` (exported from `src/use-sse.js`): parses the captured SSE 403 body text via `JSON.parse` inside a try/catch, returns the bare-string value or `.error` field (matching `data.jsx`'s `unwrapSdkResult`/`use-branches.js`'s `useBranchSwitch` convention), returns `null` for falsy input or any parse failure — never throws, never masks the real HTTP status
- Extended `onopen`'s existing Phase 15 capture scaffold: after the `response.text()` capture and BEFORE the existing `console.warn` + `throw`, a new `if (response.status === 403)` branch calls `extractBranchCodeFromSseBody(body)`; if the result is a recognized `BRANCH_CODES` member, calls `handleBranchError({ code }, queryClient)`, sets `isConnected(false)`, and **returns** (does not throw) — the load-bearing line that stops `fetchEventSource` from scheduling a retry (D-08, SC2)
- Every other case — non-JSON 403 body, JSON 403 body with an unrecognized code, and any non-403 non-2xx status (even one whose body happens to carry a branch code) — falls through unchanged to the existing `console.warn('[SSE] non-2xx onopen', ...)` + `throw new Error(...)`, preserving retry exactly as before (BERR-01 scope boundary)
- Imported `handleBranchError` and `BRANCH_CODES` from `./use-branches.js` (the existing `queryClient` from `useQueryClient()` at `use-sse.js:19` was already in scope — no new hook call needed)
- New test suite added to `src/__tests__/use-sse.test.js`: 5 tests for `extractBranchCodeFromSseBody`'s input-validation contract (null-safety for undefined/empty/non-JSON, correct extraction for both body shapes) + 4 tests for the `onopen` short-circuit (branch-code resolves without throwing, non-JSON body falls through, non-branch-code body falls through, non-403 status with a branch-code body still falls through) — all RED before implementation, all GREEN after
- `npx vitest run src/__tests__/use-sse.test.js` → 31/31 passed (22 pre-existing + 9 new test cases across two new describe blocks — 5 for `extractBranchCodeFromSseBody`, 4 for the `onopen` short-circuit)
- Full suite: `npx vitest run` → 612/613 passed — the 1 failure is the pre-existing, unrelated `build-pipeline.test.js` `BILD-04` assertion (flagged since 17-01, documented in `deferred-items.md`)

## Task Commits

TDD RED → GREEN (no REFACTOR needed — implementation was clean on first pass):

1. **Task 1 (RED): failing tests for SSE onopen branch-403 short-circuit** — `b5afea9` (test) — 6 of the 9 new tests failed as expected (`extractBranchCodeFromSseBody is not a function` ×5, unimplemented short-circuit rejecting instead of resolving ×1); the remaining 3 new tests passed immediately because they assert the *unchanged* fall-through behavior, which already existed pre-implementation
2. **Task 1 (GREEN): implement extractBranchCodeFromSseBody and the onopen short-circuit** — `5ef5bce` (feat) — all 31 tests in `use-sse.test.js` pass

**Plan metadata:** committed as part of this SUMMARY commit.

## Files Created/Modified
- `src/use-sse.js` — added `extractBranchCodeFromSseBody` export + import of `handleBranchError`/`BRANCH_CODES`; extended `onopen`'s non-2xx branch with the status-403-gated short-circuit that returns (not throws) on a recognized branch code
- `src/__tests__/use-sse.test.js` — added a `use-branches.js` module mock (spy `handleBranchError`, real `BRANCH_CODES` literal array) and two new describe blocks: `extractBranchCodeFromSseBody` (5 unit tests) and the `D-08` onopen short-circuit suite (4 tests covering branch-match / non-JSON / no-code / non-403-status)

## Decisions Made
- **`extractBranchCodeFromSseBody` targets the ASSUMED SSE body shape, explicitly not claimed as verified.** Per this plan's prior-context instruction and 17-02's WINDOWS.md entry #1, the real SSE 403 body was never captured against the live API — the implementation copies the REST-side `{ error: '<CODE>' }` / bare-string convention on the (unverified) assumption that the hand-rolled SSE route mirrors the SDK's REST envelope. **This is not confirmed.** WINDOWS.md entry #1's follow-up (re-capture the real REST + SSE 403 body against the live API) remains open and is NOT closed by this plan.
- **Status-gated, not code-gated, short-circuit.** The branch-code check only fires when `response.status === 403` — a non-403 response whose body happens to carry a recognized code (e.g. a 500 with a stray `BRANCH_ACCESS_REVOKED` string) does NOT short-circuit and still throws/retries. This matches the plan's explicit prohibition ("MUST NOT change the retry behavior for non-branch non-2xx responses") read narrowly: the branch-403 special case is scoped to the specific status the API is documented to use for access-revocation, not to any status containing matching text.
- **No new task decomposition beyond the plan's single TDD task** — the plan specified one `type="auto" tdd="true"` task and it was executed as a single RED→GREEN cycle with no REFACTOR step needed (the implementation was already minimal and clean).

## Deviations from Plan

None — plan executed exactly as written, including its explicit instruction to treat the SSE 403 shape as unverified rather than confirmed.

## Issues Encountered

None new. The pre-existing `build-pipeline.test.js` `BILD-04` failure (unrelated to this plan's files, documented since 17-01 in `deferred-items.md`) persists unchanged and was not re-investigated — out of scope for this plan's files.

## TDD Gate Compliance

Task 1 (`tdd="true"`) gate sequence verified in git log:

- RED: `b5afea9 test(17-05): add failing tests for SSE onopen branch-403 short-circuit` — confirmed failing (6/9 new tests failed: `extractBranchCodeFromSseBody is not a function` and the branch-403 case rejecting instead of resolving) before implementation
- GREEN: `5ef5bce feat(17-05): short-circuit branch-access 403s in SSE onopen without retrying` — all 31 tests in `use-sse.test.js` pass
- REFACTOR: none needed

Gate sequence compliant: RED precedes GREEN, both present, no drift.

## Known Stubs

**`extractBranchCodeFromSseBody`'s target body shape remains an UNVERIFIED assumption, inherited unchanged from 17-02 (WINDOWS.md entry #1).**
- **File:** `src/use-sse.js` (`extractBranchCodeFromSseBody`, the `onopen` 403 short-circuit)
- **Reason:** No live SSE 403 response (a real branch-revocation event on the SSE stream) has ever been captured against the actual `sitecare-orders-api`. The parser assumes the SSE route's error body mirrors the REST route's `{ error: '<CODE>' }` / bare-string envelope purely because that's the one SDK-wide convention observed elsewhere — but the SSE route is hand-rolled server-side, not SDK-unwrapped, so this is a weaker assumption than the REST one (RESEARCH.md Pitfall 3, Assumption A2, as already flagged in 17-02-SUMMARY.md).
- **What proves this is a stub, not a bug:** this plan's new tests only prove the parser and short-circuit are internally consistent given the assumed shape — they do NOT and cannot prove the real live SSE 403 body matches. If the real body differs (a different key, a human-readable sentence, a nested structure), `extractBranchCodeFromSseBody` returns `null` for every real branch-403 (since the input would either fail `JSON.parse` or produce a value not in `BRANCH_CODES`), and the short-circuit never fires — the stream would fall through to the unchanged warn+throw+retry path instead of recovering via `handleBranchError`. This degrades gracefully (retries as before, no crash, no cross-branch bleed) rather than failing loudly, but it does mean D-08's retry-suppression goal would silently not engage for a real SSE 403 until the shape is confirmed and corrected if needed.
- **Follow-up:** already tracked in `.planning/WINDOWS.md` (entry #1, kind=`deviation`, opened by 17-02). This plan does NOT close that entry — re-capturing the real SSE 403 body against the live API (once a test account with a deactivable/revocable branch is available) remains an open follow-up for a future plan or human verification session.

## Broken-Windows Ledger

No new entry added this plan. WINDOWS.md entry #1 (opened by 17-02, kind=`deviation`) already explicitly names 17-05's `extractBranchCodeFromSseBody` as the consumer that "must not treat this as confirmed" — this plan's implementation is consistent with that entry and does not resolve it. Entry #1 remains `open`.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

The SSE stream's `onopen` now routes branch-access 403s through the same central `handleBranchError`/`BRANCH_CODES` foundation as the REST/mutation paths (17-01/17-03) and stops retry-storming an inaccessible branch, satisfying D-08/SC2's stream-reconnect recovery trigger — on the currently assumed (unverified) SSE body shape. `17-06`'s focus-listener generalization builds on the same `handleBranchError`/`BRANCH_CODES` foundation and does not depend on this plan's SSE-specific parsing.

No new blockers from this plan. Three items remain open in `.planning/WINDOWS.md` for future resolution (none block continued plan execution): entry #1 (provisional `BRANCH_CODES` matcher / unverified SSE shape, from 17-02, now also covering this plan's `extractBranchCodeFromSseBody`), entry #2 (concurrent-error backstop, from 17-03), and the plan's own manual backstop verification (a live branch-revocation test to confirm the SSE connection stops after one attempt rather than retrying) — none automated this plan, per its own `<verification>` section marking it "Manual (backstop)".

---
*Phase: 17-centralized-branch-access-error-handling*
*Completed: 2026-07-23*

## Self-Check: PASSED

- `src/use-sse.js` and `src/__tests__/use-sse.test.js` confirmed present on disk with the new code (`grep -n "handleBranchError\|extractBranchCodeFromSseBody" src/use-sse.js` shows 5 matches: import + doc comment + export + two call sites)
- Both task commits confirmed in `git log --oneline -3`: `5ef5bce` (feat), `b5afea9` (test)
- All acceptance criteria re-verified:
  - Branch-403 onopen calls `handleBranchError` and resolves without throwing (no retry) — PASS (`expect(capturedOnOpen(branchResponse)).resolves.toBeUndefined()`, `handleBranchError` called once with `{ code: 'BRANCH_ACCESS_REVOKED' }`)
  - Non-branch cases still throw (retry) — PASS (non-JSON body, no-code body, and non-403-status-with-branch-code-body all reject with the original `SSE: server returned {status}` message)
  - `extractBranchCodeFromSseBody` never throws and returns null on non-JSON input — PASS (5/5 unit tests)
- `npx vitest run src/__tests__/use-sse.test.js` → 31/31 passed
- Full suite: `npx vitest run` → 612/613 passed — the 1 failure is pre-existing and unrelated (`build-pipeline.test.js` BILD-04, documented above and in `deferred-items.md`)
</output>
