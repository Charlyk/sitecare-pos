---
status: resolved
phase: 14-branch-scoped-cache-re-scoping
source: [14-VERIFICATION.md]
started: 2026-07-22T18:53:36Z
updated: 2026-07-22
---

## Current Test

number: 1
name: SC3 completeness for use-history-orders.js — accept deviation or require fast-follow
expected: |
  A decision. Either (a) accept the documented deviation via a VERIFICATION.md override,
  OR (b) require a small additive fast-follow that sets err.code on use-history-orders.js.
awaiting: none — resolved

## Tests

### 1. SC3 completeness for use-history-orders.js
expected: Accept the scoped deviation (override) OR request an additive err.code fast-follow on use-history-orders.js.
result: passed
resolution: |
  Human chose option (b) — fast-follow. commit ae08341 adds err.code to
  use-history-orders.js's queryFn error path (additive; .diagnostic block byte-unchanged),
  mirroring unwrapSdkResult's contract. Two new passing tests assert .code on both the
  object-error (BRANCH_INACTIVE) and bare-string (BRANCH_ACCESS_REVOKED) shapes and that
  .diagnostic remains intact. All 7 branch-scoped resources now satisfy SC3 uniformly.
  Full suite 543/544 (sole failure = pre-existing build-pipeline.test.js).

## Summary

total: 1
passed: 1
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps
