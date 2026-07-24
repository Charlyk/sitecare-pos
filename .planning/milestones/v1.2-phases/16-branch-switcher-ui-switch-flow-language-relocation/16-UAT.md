---
status: testing
phase: 16-branch-switcher-ui-switch-flow-language-relocation
source: [16-VERIFICATION.md]
started: 2026-07-23T13:40:00Z
updated: 2026-07-23T13:40:00Z
---

## Current Test

number: 1
name: Visual/interaction fidelity of branch popover, SwitchingOverlay, and collapsed-sidebar chip vs 16-UI-SPEC.md
expected: |
  Spacing, color tokens (--sc-primary badge/checkmark/spinner), popover positioning,
  and ellipsis truncation match the approved spec pixel-for-pixel.
awaiting: user response

## Tests

### 1. Branch selector / overlay / collapsed chip visual fidelity
expected: Spacing, color tokens (--sc-primary badge/checkmark/spinner), popover positioning, and ellipsis/title-attribute overflow handling, plus the collapsed-sidebar branch-chip identity, match 16-UI-SPEC.md pixel-for-pixel.
result: [pending]

### 2. Popover list scroll backstop with a many-branch tenant
expected: With a >4–5 branch tenant, the popover list scrolls internally (overflow-y auto + max-height) rather than growing unbounded or clipping rows.
result: [pending]

### 3. CartDiscardConfirm dialog visual fidelity
expected: Dialog spacing, destructive-red primary button, and copy layout match the approved 16-UI-SPEC.md chrome exactly.
result: [pending]

### 4. Live multi-branch switch — SSE reconnect bridged, no false OfflineBanner flash
expected: Against the real SiteCare API with a multi-branch account, one continuous overlay from click through the success toast on the new branch, with no OfflineBanner flash in between.
result: [pending]

### 5. Single-branch-tenant regression — no first-paint delay, no switcher affordance
expected: With a real one-branch account, login → orders → KDS → POS shows no first-paint delay; footer shows a read-only branch label (no chevron), matching exact pre-v1.2 behavior.
result: [pending]

### 6. D-09 bounded-timeout fallback with a genuinely-down new-branch SSE stream
expected: With a real dead SSE stream on the new branch, the overlay releases at the bounded ~6s window, the success toast still fires, and OfflineBanner takes over honestly (not shown as an error).
result: [pending]

## Summary

total: 6
passed: 0
issues: 0
pending: 6
skipped: 0
blocked: 0

## Gaps
