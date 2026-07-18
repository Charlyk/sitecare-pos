---
status: testing
phase: 11-reprint-csv-export
source: [11-VERIFICATION.md]
started: 2026-07-19T00:40:00Z
updated: 2026-07-19T00:40:00Z
---

## Current Test

number: 1
name: Physical thermal reprint from the read-only detail view
expected: |
  With a real thermal printer configured, opening a historical order in the read-only
  detail view and tapping Print kitchen / Print customer prints both receipts on the
  physical printer with correct kitchen/customer content.
awaiting: user response

## Tests

### 1. Physical thermal reprint from the read-only detail view
expected: With a real thermal printer configured, open a historical order in the read-only detail view and tap Print kitchen / Print customer — both receipts print on the physical printer with correct kitchen/customer content.
result: [pending]

### 2. Export CSV opens correctly in Excel with diacritics
expected: In History, apply a filter, click Export CSV, save the file, and open it in Excel — rows/headers/escaped fields are correct, and Romanian diacritics (ă/ș/ț) render correctly via the UTF-8 BOM.
result: [pending]

### 3. Tauri capability grants hold at runtime
expected: Run `npm run tauri dev`, filter History, and click Export CSV to pick a save path — save() and writeTextFile() succeed with no permission/capability error, confirming the dialog:allow-save + fs:allow-write-text-file grants (and the fs-scope auto-extension assumption, Research A1) hold at runtime.
result: [pending]

## Summary

total: 3
passed: 0
issues: 0
pending: 3
skipped: 0
blocked: 0

## Gaps
