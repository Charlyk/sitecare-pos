---
status: partial
phase: 05-native-integration
source: [05-VERIFICATION.md]
started: 2026-04-29T00:00:00.000Z
updated: 2026-04-29T00:00:00.000Z
---

## Current Test

Approved-no-hardware — UI verified, hardware checks deferred to first deployment.

## Tests

### 1. Save + Connection Test (PRNT-01)
expected: Physical COM port opens; green chip on success, red chip on failure
result: deferred-hardware

### 2. Test Print — no system dialog (PRNT-02)
expected: ESC/POS bytes reach printer, legible test slip prints, no OS dialog
result: deferred-hardware

### 3. Customer Receipt Print (PRNT-03, ACT-04)
expected: Receipt prints with items/prices/totals/footer; diacritics stripped; correct column alignment
result: deferred-hardware

### 4. Kitchen Ticket Print (PRNT-03, ACT-04)
expected: "BON BUCATARIE" banner present; prices absent; quantities shown
result: deferred-hardware

## Summary

total: 4
passed: 0
issues: 0
pending: 0
skipped: 0
blocked: 0
deferred: 4

## Gaps
