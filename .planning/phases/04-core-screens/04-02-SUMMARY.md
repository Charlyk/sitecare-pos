---
phase: 04-core-screens
plan: "02"
subsystem: shared-infrastructure
tags: [zustand, sse, sound, accept-dialog, status-mapping, i18n]
dependency_graph:
  requires: ["04-01"]
  provides: ["soundMuted state", "onLiveOrder SSE callback", "statusToSDK mapping", "AcceptDialog API wiring", "i18n ACT-01 keys"]
  affects: ["04-03", "04-04", "04-05", "04-06", "04-07", "04-08", "04-09"]
tech_stack:
  added: []
  patterns:
    - "useRef snapshotDone flag for SSE snapshot detection (100ms window)"
    - "useCallback for stable callback identity in useEffect deps"
    - "statusToSDK lookup map replacing .toUpperCase() for SDK status enum"
    - "Per-call onSuccess/onError callbacks in useMutation.mutate()"
key_files:
  created:
    - public/sounds/new-order.mp3
  modified:
    - src/store.js
    - src/use-sse.js
    - src/app.jsx
    - src/i18n.jsx
    - src/__tests__/store.test.js
    - src/__tests__/use-sse.test.js
decisions:
  - "Added const t = useT(lang) to App() scope so AcceptDialog onConfirm callbacks can reference t() — was missing, would have thrown at runtime"
  - "statusToSDK placed as module-level const outside App() — it is pure data, no need to recreate on every render"
  - "useSSE moves before isOffline derivation but after ordersData/updateStatus — preserves hook call order invariant"
metrics:
  duration: "5 minutes"
  tasks_completed: 2
  files_modified: 6
  files_created: 1
  completed_date: "2026-04-24"
---

# Phase 4 Plan 02: Wave 1 Shared Infrastructure Summary

**One-liner:** Zustand soundMuted session state, SSE snapshot detection via snapshotDone ref, statusToSDK enum mapping, and AcceptDialog wired to updateStatus.mutate with per-call success/error callbacks.

---

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add soundMuted to store.js and copy sound file | 16e402b | src/store.js, src/__tests__/store.test.js, public/sounds/new-order.mp3 |
| 2 | Extend use-sse.js, fix app.jsx, add i18n keys | 0a81385 | src/use-sse.js, src/app.jsx, src/i18n.jsx, src/__tests__/use-sse.test.js |

---

## What Was Built

### Task 1 — soundMuted state + sound file (TDD)

- `src/store.js`: Added `soundMuted: false` to session-only state block (not in `partialize`). Added `setSoundMuted(v)` action after `setAcceptDialog`.
- `public/sounds/new-order.mp3`: Copied from `public/notification.mp3` as required by D-05. URL `/sounds/new-order.mp3` matches the `new Audio(...)` call in app.jsx.
- `src/__tests__/store.test.js`: Converted 4 `test.todo` stubs to real RED→GREEN tests covering initial value, setter, and partialize exclusion.

### Task 2 — SSE callback, AcceptDialog fix, statusToSDK, i18n (TDD)

**use-sse.js:**
- Updated function signature: `useSSE(token, onLiveOrder)`
- Added `snapshotDone = useRef(false)` after `abortRef`
- Added `setTimeout(() => { snapshotDone.current = true; }, 100)` in `onopen` after `setIsConnected(true)`
- Added guard in `onmessage` after cache upsert: call `onLiveOrder()` only when `snapshotDone.current && onLiveOrder`
- Added `onLiveOrder` to `useEffect` dependency array

**app.jsx:**
- Added `useCallback` to React imports
- Added `statusToSDK` map as module-level const with correct enum values (`done→COMPLETED`, `out→OUT_FOR_DELIVERY`)
- Added `const t = useT(lang)` to `App()` scope (auto-fix: was missing, would throw at runtime)
- Added `soundMuted` selector from store
- Added `handleLiveOrder` callback using `useCallback([soundMuted])` — plays audio only when not muted
- Updated `useSSE(token, handleLiveOrder)` call
- Fixed `handleAdvance` to use `statusToSDK` lookup with `.toUpperCase()` fallback
- Fixed `AcceptDialog onConfirm` to call `updateStatus.mutate(...)` with per-call `onSuccess`/`onError` callbacks (was toast-only, no API call)

**i18n.jsx:**
- Added 19 new keys to both `ro` and `en` sections: accept_success_title, accept_error_title, check_connection, cancel_dialog_title, cancel_dialog_sub, cancel_reason_label, cancel_success_title, cancel_success_detail, cancel_error_title, confirm_cancellation, select_reason, cancel_order, back, order_sent, order_error, discount, display_lang_label, display_density_label, display_accent_label

---

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Added `const t = useT(lang)` to `App()` scope**
- **Found during:** Task 2 implementation
- **Issue:** The new `AcceptDialog onConfirm` callbacks reference `t('accept_success_title')`, `t('accept_error_title')`, `t('check_connection')`, `t('promised')`, `t('min')`. The `App()` function had no `t` binding — only `AcceptDialog` (the child component) had one. At runtime, `t` would have been `undefined` and thrown `TypeError: t is not a function`.
- **Fix:** Added `const t = useT(lang)` immediately after the `useAuth()` destructure in `App()`. This is the correct place per the plan's pattern (screens call `useT(lang)` directly).
- **Files modified:** src/app.jsx
- **Commit:** 0a81385

---

## Test Results

| Suite | Tests | Result |
|-------|-------|--------|
| store.test.js — soundMuted | 4 new tests (RED→GREEN) | PASS |
| use-sse.test.js — KDS-04 snapshot detection | 3 new tests (RED→GREEN) | PASS |
| Full suite | 88 passed, 58 todo | PASS |

---

## Known Stubs

None introduced by this plan. The 58 `test.todo` stubs are from Plan 01 scaffolding and are addressed in Plans 03–09.

---

## Threat Surface Scan

No new network endpoints, auth paths, or schema changes introduced. The threat mitigations from the plan's threat register are implemented:

| Threat ID | Mitigation | Status |
|-----------|------------|--------|
| T-04-02-01 | AcceptDialog estimatedMinutes validated in UI | Present — confirm button disabled when prep <= 0 (existing behavior) |
| T-04-02-02 | snapshotDone flag prevents burst-play on connect; .catch() prevents unhandled rejections | Implemented |
| T-04-02-03 | statusToSDK fallback .toUpperCase() accepted | Implemented as designed |
| T-04-02-04 | Token already in memory, no new exposure | Accepted |

---

## Self-Check: PASSED

| Item | Status |
|------|--------|
| src/store.js | FOUND |
| src/use-sse.js | FOUND |
| src/app.jsx | FOUND |
| src/i18n.jsx | FOUND |
| public/sounds/new-order.mp3 | FOUND |
| Commit 16e402b (Task 1) | FOUND |
| Commit 0a81385 (Task 2) | FOUND |
