---
status: complete
phase: 11-reprint-csv-export
source: [11-VERIFICATION.md]
started: 2026-07-19T00:40:00Z
updated: 2026-07-19T00:50:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Physical thermal reprint from the read-only detail view
expected: With a real thermal printer configured, open a historical order in the read-only detail view and tap Print kitchen / Print customer — both receipts print on the physical printer with correct kitchen/customer content.
result: pass

### 2. Export CSV opens correctly in Excel with diacritics
expected: In History, apply a filter, click Export CSV, save the file, and open it in Excel — rows/headers/escaped fields are correct, and Romanian diacritics (ă/ș/ț) render correctly via the UTF-8 BOM.
result: pass

### 3. Tauri capability grants hold at runtime
expected: Run `npm run tauri dev`, filter History, and click Export CSV to pick a save path — save() and writeTextFile() succeed with no permission/capability error, confirming the dialog:allow-save + fs:allow-write-text-file grants (and the fs-scope auto-extension assumption, Research A1) hold at runtime.
result: pass

## Summary

total: 3
passed: 3
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps
