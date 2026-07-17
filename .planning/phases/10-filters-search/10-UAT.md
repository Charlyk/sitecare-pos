---
status: testing
phase: 10-filters-search
source: [10-VERIFICATION.md]
started: 2026-07-18T00:00:00Z
updated: 2026-07-18T00:00:00Z
---

## Current Test

number: 1
name: Two-row FilterBar wrap at 1440×900
expected: |
  Period, Status, and Type pill groups render on the same row (row 1); the search
  input and the disabled Export button wrap together to a right-aligned row 2
  (per screenshots/desktop-history.png).
awaiting: user response

## Tests

### 1. Two-row FilterBar wrap at 1440×900
expected: Open History screen at 1440×900 window size; observe the FilterBar. Period/Status/Type pill groups sit on row 1; search input + Export button wrap together to a right-aligned row 2 (per screenshots/desktop-history.png).
result: [pending]

### 2. Debounced search "feels responsive"
expected: Type a rapid burst into the History search box, then pause; also clear the box. One filtered recompute lands ~250ms after the last keystroke (not one per keystroke, not immediately); clearing the box narrows/widens the list with no perceptible delay.
result: [pending]

## Summary

total: 2
passed: 0
issues: 0
pending: 2
skipped: 0
blocked: 0

## Gaps
