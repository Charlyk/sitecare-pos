---
phase: "04-core-screens"
plan: "03"
subsystem: "cancel-order-flow"
tags: ["cancel", "dialog", "order-lifecycle", "act-03"]
dependency_graph:
  requires:
    - "04-02"  # statusToSDK, AcceptDialog pattern, i18n keys
  provides:
    - "src/cancel-dialog.jsx"  # CancelDialog component
    - "cancel order flow"      # ACT-03 complete
  affects:
    - "src/app.jsx"
    - "src/screen-detail.jsx"
tech_stack:
  added: []
  patterns:
    - "CancelDialog mirrors AcceptDialog: dumb dialog + parent handles mutation"
    - "canConfirm guard: opacity 0.45 + pointer-events none until reason selected"
    - "updateStatus.mutate with toStatus CANCELLED + reason string"
key_files:
  created:
    - "src/cancel-dialog.jsx"
  modified:
    - "src/screen-detail.jsx"
    - "src/app.jsx"
decisions:
  - "CancelDialog is a dumb component — calls onConfirm(reason), app.jsx handles mutation (same pattern as AcceptDialog)"
  - "Cancel button hidden for terminal states (done/cancelled) via order.state guard"
  - "Dialog stays open on error — setCancelDialog(null) only called on success"
  - "i18n cancel keys were already present from Plan 02 — no i18n changes needed in this plan"
metrics:
  duration: "3m 10s"
  completed: "2026-04-24"
  tasks_completed: 2
  files_created: 1
  files_modified: 2
---

# Phase 4 Plan 03: Cancel Order Flow Summary

**One-liner:** Cancel order dialog (ACT-03) with 5 preset reasons, canConfirm guard, and updateStatus CANCELLED mutation wired through app.jsx.

---

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create CancelDialog component | c1d9e6f | src/cancel-dialog.jsx (created) |
| 2 | Wire CancelDialog into screen-detail and app | 8d828d3 | src/screen-detail.jsx, src/app.jsx |

---

## What Was Built

### CancelDialog component (`src/cancel-dialog.jsx`)
- Accepts `{ lang, order, onCancel, onConfirm }` props
- Renders nothing when `order` is null/undefined
- 5 hardcoded preset reasons: customer_changed_mind, out_of_ingredients, duplicate_order, kitchen_cannot_fulfill, other
- Bilingual reason labels (ro/en) via `lang` prop
- Selected reason highlighted with terracotta border (`hsl(0 53% 58%)`) + tinted background
- Confirm button: `opacity: 0.45, pointer-events: none` until reason selected; becomes active + terracotta background when selected
- Calls `onConfirm(reason)` with selected value string; parent handles mutation
- Dismiss button calls `onCancel()` — no API call
- `fadeIn 180ms ease-out` overlay animation matching AcceptDialog
- 420px width (AcceptDialog is 460px)

### screen-detail.jsx changes
- `onCancel` added to `OrderDetailScreen` function signature
- Cancel button rendered for `order.state !== 'done' && order.state !== 'cancelled'`
- Button disabled when `isOffline` is true
- `onClick={() => onCancel && onCancel(order)}` — safe call with null check

### app.jsx changes
- `import { CancelDialog } from './cancel-dialog.jsx'` added
- `const [cancelDialog, setCancelDialog] = useState(null)` added alongside acceptDialog
- Detail screen passes `onCancel={() => setCancelDialog({ order: selectedOrder })}`
- CancelDialog JSX after AcceptDialog block:
  - `onConfirm(reason)` calls `updateStatus.mutate` with `toStatus: 'CANCELLED'`, `reason`, and `statusToSDK` mapping for currentStatus
  - On success: `setCancelDialog(null)` + `setScreen('orders')` + success toast
  - On error: error toast only; dialog stays open (setCancelDialog NOT called)

---

## Deviations from Plan

None — plan executed exactly as written.

Note: The i18n cancel strings (`cancel_dialog_title`, `cancel_dialog_sub`, `cancel_reason_label`, `cancel_success_title`, `cancel_success_detail`, `cancel_error_title`, `confirm_cancellation`, `select_reason`, `cancel_order`, `back`) were already present in both ro and en sections from Plan 02. No changes to `src/i18n.jsx` were needed in this plan.

---

## Verification Results

```
grep "export function CancelDialog"   → 1 match
grep "canConfirm" count               → 6 (opacity + pointer-events + disabled + onClick guard + button text)
grep "onConfirm(reason)"              → 1 match
grep "cancel_dialog_title" i18n.jsx   → 2 (ro + en)
grep "confirm_cancellation" i18n.jsx  → 2 (ro + en)
grep "onCancel" screen-detail.jsx     → 2 (prop signature + onClick)
grep "order.state !== 'done' && order.state !== 'cancelled'" → 1 match
grep "import.*CancelDialog" app.jsx   → 1 match
grep "cancelDialog" app.jsx count     → 5 (state + setter calls + JSX + order access)
grep "toStatus.*CANCELLED" app.jsx    → 1 match
grep "statusToSDK[cancelDialog.order.state]" app.jsx → 1 match
npx vitest run                        → 88 passed | 58 todo — no regressions
```

---

## Known Stubs

None — all cancel flow functionality is fully wired. The 6 cancel-dialog test cases remain as `test.todo` (as expected per plan — they were scaffolded in Plan 01 and are awaiting TDD implementation in a future plan).

---

## Threat Flags

None — no new network endpoints, auth paths, or schema changes introduced beyond what was specified in the plan threat model.

---

## Self-Check: PASSED

- `src/cancel-dialog.jsx` — FOUND
- `src/screen-detail.jsx` onCancel changes — FOUND
- `src/app.jsx` CancelDialog import + state + JSX — FOUND
- Commit c1d9e6f — FOUND
- Commit 8d828d3 — FOUND
- 88 tests passing, 0 failures — CONFIRMED
