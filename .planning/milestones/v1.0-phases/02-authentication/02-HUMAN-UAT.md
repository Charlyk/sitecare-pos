---
status: partial
phase: 02-authentication
source: [02-VERIFICATION.md]
started: 2026-04-23T00:00:00Z
updated: 2026-04-23T00:00:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Successful login against live API (AUTH-01)
expected: Enter real SiteCare credentials in the Login screen; the app transitions to the Orders screen with no errors.
result: [pending]

### 2. Token persists across app restart (AUTH-04)
expected: Log in successfully, quit the app (Cmd+Q), reopen with `npm run tauri dev`. The Orders screen appears immediately — no login prompt shown.
result: [pending]

### 3. Session expiry redirect (AUTH-03 / D-07)
expected: Trigger `expireSession()` (e.g., by clearing the token and waiting, or invoking directly in DevTools). A bilingual toast ("Sesiunea a expirat" / "Session expired") appears. After ~2 seconds the LoginScreen renders clean (no stale error).
result: [pending]

### 4. Forgot password link opens browser (D-05)
expected: Click "Ai uitat parola?" on the Login screen. The system default browser opens the SiteCare password-reset URL.
result: [pending]

### 5. Auth guard active on all 7 screens (AUTH-05)
expected: While authenticated, navigate to all 7 screens — no crash, no redirect. Sign out; confirm that navigating to any screen redirects to LoginScreen.
result: [pending]

## Summary

total: 5
passed: 0
issues: 0
pending: 5
skipped: 0
blocked: 0

## Gaps
