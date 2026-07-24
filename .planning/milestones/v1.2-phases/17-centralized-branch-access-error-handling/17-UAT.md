---
status: testing
phase: 17-centralized-branch-access-error-handling
source: [17-VERIFICATION.md]
started: 2026-07-24T00:50:00Z
updated: 2026-07-24T00:50:00Z
---

## Current Test

number: 1
name: Recoverable-code toast reads naturally with a null/unknown branch name
expected: |
  Sentence reads naturally (e.g. "Your access to this branch was removed. Pick another branch."),
  never a literal '<branch>' token or an awkward double-space gap.
awaiting: user response

## Tests

### 1. Recoverable-code toast reads naturally with a null/unknown branch name
expected: Trigger a BRANCH_INACTIVE or BRANCH_ACCESS_REVOKED toast with a null/unknown branch name (e.g. clear the branches cache before the 403 fires) and read the rendered detail sentence. It should read naturally in the actual .toast markup, never emitting a literal '<branch>' token or a double-space gap.
result: [pending]

### 2. NO_BRANCH_ACCESS Retry shows the in-flight spinner + busy label
expected: Trip the NO_BRANCH_ACCESS block, click Retry, and visually confirm the button disables and swaps to the spinner (Icon name='refresh' className='spin' in var(--sc-primary)) with the "Se verifică…"/"Checking…" label while getMe() is in flight — on BOTH the success (block clears) and unchanged-block outcomes, returning to idle afterward.
result: [pending]

### 3. NO_BRANCH_ACCESS Retry network-failure path fires no extra toast
expected: Force a network failure during a NO_BRANCH_ACCESS Retry click (e.g. disconnect network). The block stays up unchanged, the Retry button returns to idle/enabled, and NO additional toast appears (no toast-on-toast while already blocking).
result: [pending]

### 4. SSE branch-revocation recovery causes no cross-branch cache bleed
expected: Trigger a live branch revocation while the SSE stream is connected. The stream stops after exactly one non-2xx onopen attempt (no retry storm), and no other branch's order/stat events land in the TanStack Query cache during the recovery window — until currentBranch changes and a fresh connection opens.
result: [pending]

## Summary

total: 4
passed: 0
issues: 0
pending: 4
skipped: 0
blocked: 0

## Gaps

_None recorded yet — populated if a manual test fails._

## Known Caveats (non-blocking, tracked in .planning/WINDOWS.md)

- **#1 (deviation, open):** The live 403 body shape (REST + SSE) and zero-branch getMe() behaviour were never verified against the live API — capture was infeasible (no accessible test tenant). The matcher and SSE parser target an assumed `{ error: '<CODE>' }` shape locked only by synthetic tests; recovery degrades safely (parser returns null → existing retry path) if the real shape differs. Follow-up: re-capture and correct when a 403-capable account exists. Test 4 above partially exercises this against the live API if a revocable test branch becomes available.
- **#2 (unrun-verify, open):** The D-05 concurrent-error de-dup backstop (a burst of simultaneous branch-403s converging to one recovery) is not automated-verified; matches the UI-SPEC's own backstop marking for that row.
