---
status: testing
phase: 15-sse-branch-aware-reconnect
source: [15-VERIFICATION.md]
started: 2026-07-23
updated: 2026-07-23
---

## Current Test

number: 1
name: SC2 — Live two-session branch-switch event confirmation
expected: |
  With two concurrent live sessions authenticated against the real API, both on Branch A,
  switch one session's active branch to Branch B (once Phase 16's switcher exists) and observe
  the Kitchen Display and order list on the switched session. The switched session's KDS and
  order list start showing Branch B's live order_new/order_status_changed events within about a
  second of the switch, with no residual Branch A events after the reconnect settles; the
  un-switched session (still on Branch A) is unaffected.
awaiting: user response

## Tests

### 1. SC2 — Live two-session branch-switch event confirmation
expected: |
  With two concurrent live sessions on Branch A, switching one session to Branch B causes that
  session's KDS and order list to receive Branch B's live events within ~1s, with no residual
  Branch A events after reconnect; the un-switched Branch A session is unaffected.
result: [pending — blocked on Phase 16 switcher UI (D-07 deferral)]

## Summary

total: 1
passed: 0
issues: 0
pending: 1
skipped: 0
blocked: 0

## Gaps

None. The single pending item (SC2) is a plan-acknowledged D-07 human/UAT checkpoint that
cannot be exercised until Phase 16's branch switcher UI exists. All 13 code-verifiable
must-haves for Phase 15 are VERIFIED (see 15-VERIFICATION.md). This is a deferred cross-phase
checkpoint, not an implementation gap.
