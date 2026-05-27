---
phase: "05"
plan: "01"
subsystem: testing
tags: [tdd, wave-0, stubs, thermal-printer, esc-pos]
dependency_graph:
  requires: []
  provides: [failing-test-stubs-prnt01, failing-test-stubs-prnt02, failing-test-stubs-prnt03, failing-test-stubs-act04]
  affects: [src/__tests__/screen-printer.test.jsx, src/__tests__/print-receipt.test.jsx, src/__tests__/screen-detail.test.jsx]
tech_stack:
  added: []
  patterns: [vitest-stub-pattern, expect-false-toBe-true-red-stubs]
key_files:
  created:
    - src/__tests__/screen-printer.test.jsx
    - src/__tests__/print-receipt.test.jsx
    - src/__tests__/screen-detail.test.jsx
  modified: []
decisions:
  - "13 total stubs (PRNT-01:5 + PRNT-02:2 + PRNT-03:4 + ACT-04:2) — one per distinct behavior, all use expect(false).toBe(true) for clean red"
  - "screen-detail.test.jsx is a new file — no prior Phase 4 test file existed for OrderDetailScreen print behavior"
  - "store.js mock added to screen-printer.test.jsx — PrinterScreen uses useAppStore for lang/pushToast"
  - "print-receipt.test.jsx imports load from plugin-store for future test implementation context"
metrics:
  duration: "5 minutes"
  completed: "2026-04-28"
  tasks_completed: 2
  tasks_total: 2
  files_changed: 3
---

# Phase 5 Plan 01: TDD Wave 0 — Failing Stubs for Thermal Printer Requirements

One-liner: 13 red stubs across 3 new test files defining contracts for PRNT-01, PRNT-02, PRNT-03, and ACT-04.

## What Was Built

Three new Vitest test files with intentionally failing stubs establishing acceptance criteria for Phase 5 thermal printer integration. All stubs use `expect(false).toBe(true)` — they fail with clear assertion errors (not syntax/import errors) and will turn green as Wave 1 (Rust commands) and Wave 2 (JS/UI) are implemented.

| File | Requirement | Stubs | Behavior Documented |
|------|-------------|-------|---------------------|
| `src/__tests__/screen-printer.test.jsx` | PRNT-01, PRNT-02 | 7 | Port enumeration on mount, empty port list handling, save_printer_config args, chip-sage/chip-red feedback, test_print invocation, disabled state |
| `src/__tests__/print-receipt.test.jsx` | PRNT-03 | 4 | invoke("print_receipt") with config, "not configured" toast, "print failed" toast, kind arg passthrough |
| `src/__tests__/screen-detail.test.jsx` | ACT-04 | 2 | Print kitchen button calls onPrint(order, "kitchen"), Print customer button calls onPrint(order, "customer") |

## Test Results

- **Prior suite (153 tests):** All passing — no regressions introduced
- **New stubs (13 tests):** All failing (red) — expected behavior for Wave 0
- **Total:** 166 tests, 153 passing / 13 failing

Note: The plan cited 125 prior tests; the actual count grew to 153 during Phase 4 execution. All are still green.

## Commits

| Hash | Description |
|------|-------------|
| b7f289f | test(05-01): add failing stubs for PRNT-01 (5 stubs) and PRNT-02 (2 stubs) |
| 64d9971 | test(05-01): add failing stubs for PRNT-03 (4 stubs) and ACT-04 (2 stubs) |

## Deviations from Plan

None — plan executed exactly as written.

All mock boilerplate copied verbatim from `cancel-dialog.test.jsx` (lines 1-19). The `store.js` mock with `useAppStore` was added to `screen-printer.test.jsx` per plan specification. The `save` method was added to the plugin-store mock in both new files (present in plan interfaces) since future implementation of `handleSave` in `screen-printer.jsx` will call `.save()`.

## Known Stubs

All stubs are intentional — this is a Wave 0 TDD plan. No data flows are wired. All 13 stubs will be resolved by Wave 2 (05-02 and 05-03 plans).

| Stub | File | Line | Resolved By |
|------|------|------|-------------|
| list_serial_ports on mount | screen-printer.test.jsx | 33 | Plan 05-02 (screen-printer.jsx redesign) |
| empty port list option | screen-printer.test.jsx | 38 | Plan 05-02 |
| save_printer_config args | screen-printer.test.jsx | 43 | Plan 05-02 |
| chip-sage success | screen-printer.test.jsx | 48 | Plan 05-02 |
| chip-red failure | screen-printer.test.jsx | 53 | Plan 05-02 |
| test_print invocation | screen-printer.test.jsx | 60 | Plan 05-02 |
| test_print disabled | screen-printer.test.jsx | 65 | Plan 05-02 |
| invoke print_receipt with config | print-receipt.test.jsx | 34 | Plan 05-03 (app.jsx onPrint) |
| not configured toast | print-receipt.test.jsx | 39 | Plan 05-03 |
| print failed toast | print-receipt.test.jsx | 44 | Plan 05-03 |
| kind arg passthrough | print-receipt.test.jsx | 49 | Plan 05-03 |
| Print kitchen onPrint call | screen-detail.test.jsx | 53 | Plan 05-03 |
| Print customer onPrint call | screen-detail.test.jsx | 58 | Plan 05-03 |

## Self-Check: PASSED

- [x] `src/__tests__/screen-printer.test.jsx` — exists, 7 stubs
- [x] `src/__tests__/print-receipt.test.jsx` — exists, 4 stubs
- [x] `src/__tests__/screen-detail.test.jsx` — exists, 2 stubs
- [x] Commits b7f289f and 64d9971 exist in git log
- [x] Full suite: 153 passing, 13 failing (all new stubs)
