---
phase: 02-authentication
reviewed: 2026-04-23T12:00:00Z
depth: standard
files_reviewed: 9
files_reviewed_list:
  - src-tauri/Cargo.toml
  - src-tauri/capabilities/default.json
  - src-tauri/src/lib.rs
  - src/app.jsx
  - src/auth.jsx
  - src/i18n.jsx
  - src/login.css
  - src/screen-login.jsx
  - src/store.js
findings:
  critical: 0
  warning: 1
  info: 4
  total: 5
status: issues_found
---

# Phase 02: Code Review Report

**Reviewed:** 2026-04-23
**Depth:** standard
**Files Reviewed:** 9
**Status:** issues_found

## Summary

This review covers the post-gap-closure state of the Phase 2 authentication implementation. The gap-closure pass (plan 02-05) successfully resolved all four previously reported issues: CR-01 (tight refresh loop), WR-01 (invalid `setScreen('login')` calls), WR-02 (stale error state on session expiry/sign-out), and WR-03 (debug `console.log` leaking response shape). WR-04 (canSubmit email validation) was also fixed.

The implementation is architecturally sound: Rust keychain commands are thin and correct, token persistence and cold-start restore work as designed, the refresh timer has a proper floor, auth state is correctly excluded from Zustand persistence, and no direct HTTP calls bypass the SDK.

One new warning was introduced during the gap-closure pass (an error message that can leak SDK response key names in production). Four informational items remain — three carried over from the original review and one new dead-code branch.

---

## Warnings

### WR-01: Error message in `signIn` leaks SDK response key names into production logs

**File:** `src/auth.jsx:107`

**Issue:** When `signIn` receives a response with no recognizable token field, it throws:
```js
throw new Error('No token in signIn response: ' + JSON.stringify(Object.keys(signInResult)));
```
This error message is then caught at line 124 and written to `console.error('[auth] signIn error:', err)`. In production, this means the DevTools console will contain the exact key names the SDK returns in its sign-in response (e.g. `["token","user","expiresIn"]`), which discloses the API response contract. Unlike the original WR-03 (which fired on every successful sign-in), this only fires on a misconfigured SDK response — but it still discloses shape information that should not appear in production.

**Fix:**
```js
// Replace the key-listing message with a generic one:
if (!token) throw new Error('No token in signIn response');

// If SDK key names are needed for debugging, gate them behind DEV:
if (!token) {
  if (import.meta.env.DEV) {
    console.warn('[auth] unexpected signIn response keys:', Object.keys(signInResult));
  }
  throw new Error('Authentication failed: no token received');
}
```

---

## Info

### IN-01: `Cargo.toml` placeholder author and description

**File:** `src-tauri/Cargo.toml:4-5`

**Issue:** `description = "A Tauri App"` and `authors = ["you"]` are scaffold defaults. These propagate into the macOS `.app` bundle metadata and Windows installer, and will appear verbatim if notarization or distribution happens in Phase 6.

**Fix:**
```toml
description = "SiteCare POS — restaurant order management desktop app"
authors = ["SiteCare <dev@sitecare.ro>"]
```

### IN-02: `doRefresh` does not persist refreshed token to keychain

**File:** `src/auth.jsx:39-47`

**Issue:** When `doRefresh` succeeds, it receives a new session from `getSession()` and reschedules the timer, but it does not call `invoke('store_token', { token })` to persist any refreshed token. If the app restarts after a successful mid-session refresh and the SDK issues a new token during `getSession`, the cold-start restore will load the original (potentially expired) token from keychain.

This is low severity because the SDK's `createAdminClient` likely manages session state internally, and `getSession` may return the same bearer token rather than a new one. Verify against SDK behavior when the SDK source is available.

**Fix:** After a successful `doRefresh`, check whether the session includes a new token and conditionally persist it:
```js
async function doRefresh(adminClient) {
  try {
    const { session } = await adminClient.auth.getSession();
    // If SDK returns a refreshed token, persist it (only if user originally chose "remember me"):
    // if (session?.accessToken) await invoke('store_token', { token: session.accessToken });
    scheduleRefresh(session.expiresAt, adminClient);
  } catch {
    expireSession();
  }
}
```

### IN-03: Forgot-password link duplicated at top and bottom of form

**File:** `src/screen-login.jsx:164-167` and `src/screen-login.jsx:233-237`

**Issue:** The "Forgot password?" link appears twice — once inline in the password field label (line 164) and once in the form footer (line 233). Both call `onForgotPassword()`. This is a prototype port artifact. While not a bug, it adds a redundant DOM element and may cause confusion if the label placement changes.

**Fix:** Remove the footer link (lines 232-238) and keep only the inline label link, which is the conventional location for this action.

### IN-04: `error === 'pass'` is a dead code branch in `screen-login.jsx`

**File:** `src/screen-login.jsx:171` and `src/screen-login.jsx:190`

**Issue:** The password field error state is checked against `error === 'pass'` in two places (lines 171 and 190). However `auth.jsx` never emits `'pass'` as an error code — the only values assigned to `error` are `null`, `'creds'`, and `'email'` (lines 55, 101, 127, 129, 131, 145). The `'pass'` branches are unreachable and represent leftover scaffolding.

**Fix:** Remove `|| error === 'pass'` from both checks:
```jsx
// Line 171 — was:
<div className={`field-input${error === 'pass' || error === 'creds' ? ' err' : ''}`}>
// Should be:
<div className={`field-input${error === 'creds' ? ' err' : ''}`}>

// Line 190 — was:
{(error === 'creds' || error === 'pass') && (
// Should be:
{error === 'creds' && (
```

---

_Reviewed: 2026-04-23_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
