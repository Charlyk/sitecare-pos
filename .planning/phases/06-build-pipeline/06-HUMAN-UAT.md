---
status: partial
phase: 06-build-pipeline
source: [06-VERIFICATION.md]
started: 2026-05-01T22:27:00.000Z
updated: 2026-05-01T22:27:00.000Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. CI pipeline run
expected: Push an `app-v*` tag — GitHub Actions runs two jobs (macos-latest + windows-latest) and produces a draft GitHub Release containing .dmg, .msi, .sig files, and latest.json

result: [pending]

### 2. Gatekeeper test
expected: Install the notarized macOS .dmg on a fresh macOS 13+ machine — no quarantine dialog, app opens without warning

result: [pending]

### 3. Auto-update e2e
expected: Release two successive versions — the running app silently downloads and installs the update, then relaunches without any user prompt

result: [pending]

## Summary

total: 3
passed: 0
issues: 0
pending: 3
skipped: 0
blocked: 0

## Gaps
