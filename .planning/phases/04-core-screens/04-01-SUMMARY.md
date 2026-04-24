---
phase: 04-core-screens
plan: "01"
subsystem: testing
tags: [tdd, test-stubs, phase4, nyquist]
dependency_graph:
  requires: []
  provides:
    - test stubs for all 20 Phase 4 requirements (ORD-01/02/03, ACT-01/02/03, KDS-02/03/04/05, POS-01-05, MENU-01/02, SET-01/02/03)
  affects:
    - src/__tests__/screen-orders.test.jsx
    - src/__tests__/accept-dialog.test.jsx
    - src/__tests__/cancel-dialog.test.jsx
    - src/__tests__/screen-kitchen.test.jsx
    - src/__tests__/screen-pos.test.jsx
    - src/__tests__/screen-menu.test.jsx
    - src/__tests__/screen-settings.test.jsx
    - src/__tests__/store.test.js
    - src/__tests__/use-sse.test.js
    - src/__tests__/use-order-actions.test.js
tech_stack:
  added: []
  patterns:
    - test.todo() stubs — vitest pending pattern; suite exits 0 while marking unimplemented behavior
key_files:
  created:
    - src/__tests__/screen-orders.test.jsx
    - src/__tests__/accept-dialog.test.jsx
    - src/__tests__/cancel-dialog.test.jsx
    - src/__tests__/screen-kitchen.test.jsx
    - src/__tests__/screen-pos.test.jsx
    - src/__tests__/screen-menu.test.jsx
    - src/__tests__/screen-settings.test.jsx
  modified:
    - src/__tests__/store.test.js
    - src/__tests__/use-sse.test.js
    - src/__tests__/use-order-actions.test.js
decisions:
  - "test.todo() chosen over expect.fail() so suite exits 0 while stubs are clearly marked pending"
  - "Standard mock header applied verbatim to all 7 new files for consistent Tauri/SDK isolation"
metrics:
  duration: "~2.5 minutes"
  completed_date: "2026-04-24"
  tasks_completed: 2
  files_created: 7
  files_modified: 3
requirements:
  - ORD-01
  - ORD-02
  - ORD-03
  - ACT-01
  - ACT-02
  - ACT-03
  - KDS-02
  - KDS-03
  - KDS-04
  - KDS-05
  - POS-01
  - POS-02
  - POS-03
  - POS-04
  - POS-05
  - MENU-01
  - MENU-02
  - SET-01
  - SET-02
  - SET-03
---

# Phase 4 Plan 01: Test Stub Scaffolding (Nyquist Compliance) Summary

**One-liner:** 66 test.todo() stubs covering all 20 Phase 4 requirements across 10 test files, suite stays green at 80 passing tests.

## What Was Built

This plan creates the test scaffolding (Wave 0) that governs all subsequent Phase 4 implementation plans. Every requirement for the Core Screens phase now has at least one `test.todo()` entry before any implementation begins — the Nyquist compliance gate.

### Task 1: 7 New Test Stub Files

| File | Requirements Covered | Stubs |
|------|---------------------|-------|
| `screen-orders.test.jsx` | ORD-01, ORD-03 | 8 |
| `accept-dialog.test.jsx` | ACT-01 | 4 |
| `cancel-dialog.test.jsx` | ACT-03 | 6 |
| `screen-kitchen.test.jsx` | KDS-02, KDS-03, KDS-05 | 5 |
| `screen-pos.test.jsx` | POS-01 through POS-05 | 14 |
| `screen-menu.test.jsx` | MENU-01, MENU-02 | 5 |
| `screen-settings.test.jsx` | SET-01, SET-02, SET-03 | 10 |

### Task 2: 3 Extended Existing Test Files

| File | Requirements Added | Stubs Added |
|------|-------------------|-------------|
| `store.test.js` | KDS-04 (soundMuted), ORD-02 (role switch) | 6 |
| `use-sse.test.js` | KDS-04 (snapshot detection) | 4 |
| `use-order-actions.test.js` | ACT-02 (statusToSDK mapping) | 5 |

## Test Suite Metrics

| Metric | Before | After |
|--------|--------|-------|
| Test files | 13 | 20 |
| Passing tests | 80 | 80 |
| Todo stubs | 0 | 66 |
| Suite exit code | 0 | 0 |

## Commits

| Hash | Description |
|------|-------------|
| `260df56` | test(04-01): add failing test stubs for all 7 Phase 4 screen/dialog requirements |
| `a7d0d97` | test(04-01): extend 3 existing test files with Phase 4 todo stubs |

## Deviations from Plan

None — plan executed exactly as written.

## TDD Gate Compliance

This plan is Wave 0 (test scaffold only). It establishes the RED gate for all subsequent implementation plans (Waves 1-3). No GREEN gate commits exist in this plan by design — GREEN commits belong to the implementation plans that make these stubs pass.

## Known Stubs

All 66 test.todo() entries are intentional stubs by design. They represent the Phase 4 implementation backlog:

- ORD-01/03: `screen-orders.test.jsx` — 8 stubs
- ACT-01: `accept-dialog.test.jsx` — 4 stubs
- ACT-03: `cancel-dialog.test.jsx` — 6 stubs
- KDS-02/03/04/05: `screen-kitchen.test.jsx` + `use-sse.test.js` — 9 stubs
- POS-01-05: `screen-pos.test.jsx` — 14 stubs
- MENU-01/02: `screen-menu.test.jsx` — 5 stubs
- SET-01/02/03: `screen-settings.test.jsx` — 10 stubs
- ORD-02: `store.test.js` — 2 stubs
- ACT-02: `use-order-actions.test.js` — 5 stubs
- soundMuted/KDS-04: `store.test.js` — 4 stubs

These stubs are resolved in Phase 4 Wave 1-3 implementation plans (04-02 through 04-09).

## Threat Flags

None — test files contain no credentials, no network calls, and no production-facing logic.

## Self-Check: PASSED
