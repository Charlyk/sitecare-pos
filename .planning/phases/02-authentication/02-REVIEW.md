---
phase: 02-authentication
reviewed: 2026-04-23T00:00:00Z
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
  critical: 1
  warning: 4
  info: 3
  total: 8
status: issues_found
---

# Phase 02: Code Review Report

**Reviewed:** 2026-04-23
**Depth:** standard
**Files Reviewed:** 9
**Status:** issues_found

## Summary

Authentication phase wires the Tauri keychain (Rust `keyring` crate), a React `AuthProvider` with proactive token refresh, a login screen, and Zustand UI state. The architecture is sound — Rust side is thin, no direct HTTP calls outside the SDK, no `window.*` globals, CSP is properly configured in `tauri.conf.json`, and auth state is correctly excluded from Zustand persistence.

Four areas need attention before shipping: one critical infinite-refresh loop that causes a tight busy-loop when a token is permanently expired, three warnings around a stale screen enum value, missing `error` reset on re-entry, and a debug `console.log` that leaks credentials shape to DevTools in production. Three informational items are also flagged.

---

## Critical Issues

### CR-01: Infinite refresh loop when token is permanently expired near expiry boundary

**File:** `src/auth.jsx:29-35`

**Issue:** `scheduleRefresh` calculates `msUntilRefresh = expiresAt - now - REFRESH_LEAD_MS`. When `msUntilRefresh <= 0` it calls `doRefresh` immediately. If the server returns a new session whose `expiresAt` is also within the lead window (e.g. the account has been deactivated and the server keeps issuing short-lived sessions, or the system clock is skewed forward), `doRefresh` succeeds, calls `scheduleRefresh` again with the new expiry, which again evaluates `<= 0`, and calls `doRefresh` immediately again — creating a tight synchronous-async loop that hammers the auth endpoint until the call fails.

There is no guard to prevent re-entrant or back-to-back immediate refreshes. A single failing call path (`Err` branch) correctly calls `expireSession`, but a sequence of succeeding calls with a permanently-near-expiry session never terminates.

**Fix:**
```js
// Add a minimum floor to prevent spin. If the computed delay is <= 0 but the
// session is actually valid (getSession succeeded), wait at least 30 seconds
// before retrying rather than firing immediately.
const MIN_RETRY_MS = 30_000;

function scheduleRefresh(expiresAt, adminClient) {
  if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
  const msUntilRefresh = new Date(expiresAt).getTime() - Date.now() - REFRESH_LEAD_MS;
  const delay = msUntilRefresh <= 0 ? MIN_RETRY_MS : msUntilRefresh;
  refreshTimerRef.current = setTimeout(() => doRefresh(adminClient), delay);
}
```

Removing the direct synchronous call to `doRefresh` in the `<= 0` branch and always going through `setTimeout` (even with a short delay) breaks the loop and keeps the timer ref trackable.

---

## Warnings

### WR-01: `setScreen('login')` sets an invalid screen value that is never rendered

**File:** `src/auth.jsx:63` and `src/auth.jsx:142`

**Issue:** `expireSession` calls `setScreen('login')` after a 2-second delay (line 63), and `signOut` calls it directly (line 142). However `'login'` is not a valid value in the `screen` enum used by the router in `app.jsx`. The app guards on `!isAuthenticated` to render `<LoginScreen>` — the `screen` state value is never checked for `'login'`. Setting screen to `'login'` means that after a user authenticates again (setting `isAuthenticated = true`), the app renders the shell with `screen === 'login'` which matches no `{screen === 'orders' && ...}` branch, resulting in a blank shell with no content panel.

The `store.js` comment on line 45 lists the valid values: `'orders'|'kitchen'|'pos'|'detail'|'menu'|'printer'|'settings'` — `'login'` is not among them.

**Fix:**
```js
// In expireSession (line 63) and signOut (line 142): navigate to 'orders'
// rather than 'login'. The auth guard in app.jsx shows LoginScreen whenever
// isAuthenticated is false, regardless of screen value.
setTimeout(() => setScreen('orders'), 2000);  // expireSession
// ...
setScreen('orders');  // signOut
```

### WR-02: Auth error state not cleared when user navigates away and back to login

**File:** `src/auth.jsx:97`

**Issue:** `signIn` calls `setError(null)` at the top of each attempt (line 97), which correctly clears a prior error before a new attempt. However, if the user triggers `signOut` or `expireSession`, the `error` state is **not** reset. If the session expires with a prior `error` value in state (from a failed sign-in earlier in the session — e.g. the user typed wrong creds, then corrected them and signed in, then the session expired), the re-displayed login form will show a stale credential error immediately on appearance, before the user has done anything.

**Fix:**
```js
function expireSession() {
  if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
  setError(null);          // clear stale error before showing login again
  setClient(null);
  setIsAuthenticated(false);
  // ...
}

async function signOut() {
  if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
  setError(null);          // same
  // ...
}
```

### WR-03: `console.log` in `signIn` leaks response shape in production

**File:** `src/auth.jsx:101`

**Issue:** Line 101 logs `Object.keys(signInResult)` on every successful sign-in. Depending on what keys the SDK returns, this may include `token`, `accessToken`, or similar names visible in DevTools. While it is not a secret itself, it discloses the API response shape and confirms credential exchange succeeded — this is diagnostic scaffolding that should not reach production.

**Fix:**
```js
// Remove this line entirely, or guard with a DEV check:
if (import.meta.env.DEV) {
  console.log('[auth] signIn response keys:', Object.keys(signInResult));
}
```

### WR-04: Silent email validation mismatch — submit button enabled but `handleSubmit` silently bails

**File:** `src/screen-login.jsx:27-32`

**Issue:** `canSubmit` (line 27) checks only that `email !== ''` and `pass !== ''` and `!busy`. The submit button is therefore enabled as soon as any non-empty string is typed in the email field. When the user submits, `handleSubmit` calls `isValidEmail(email)` and silently returns without feedback (line 31) if the email is invalid — the button un-disables, nothing happens, and the user gets no error message.

This is a usability bug: the form appears to accept the submission (button is enabled, `e.preventDefault()` fires) but does nothing and shows no error.

**Fix:**
```js
// Option A: disable submit until email is syntactically valid
const canSubmit = isValidEmail(email) && pass !== '' && !busy;

// Option B (if lazy validation is intentional): set the error state on silent bail
const handleSubmit = (e) => {
  e.preventDefault();
  if (!isValidEmail(email)) {
    // surface validation error to user instead of silently ignoring
    // AuthProvider's setError is not accessible here; lift to local state:
    setLocalError('email');  // add local error state to LoginScreen
    return;
  }
  onSubmit(email, pass, remember);
};
```

Option A is simpler and consistent with other POS UX patterns.

---

## Info

### IN-01: `Cargo.toml` placeholder author and description

**File:** `src-tauri/Cargo.toml:4-5`

**Issue:** `description = "A Tauri App"` and `authors = ["you"]` are scaffold defaults. These surface in the macOS `.app` bundle metadata and the Windows installer, and will appear verbatim if notarization or App Store submission happens in Phase 6.

**Fix:** Update to real values now before they propagate into build artifacts:
```toml
description = "SiteCare POS — restaurant order management desktop app"
authors = ["SiteCare <dev@sitecare.ro>"]
```

### IN-02: `doRefresh` does not store updated token to keychain after refresh

**File:** `src/auth.jsx:38-46`

**Issue:** When `doRefresh` succeeds (line 40-42), it receives a new session from `getSession()` and reschedules the timer — but it does not call `invoke('store_token', { token })` to persist the refreshed token. If the app is quit and restarted after a successful mid-session refresh, the cold-start restore (line 70) will load the original token from keychain, which may be expired by then.

This is currently low severity because the SDK's `createAdminClient` likely handles token refresh internally via the session object, and `getSession` may return the same session rather than a new token. The issue should be verified against the SDK's actual refresh semantics, and if `getSession` returns a new token, it should be persisted.

**Fix:** After a successful `doRefresh`, check whether the session includes a new token and persist it:
```js
async function doRefresh(adminClient) {
  try {
    const { session } = await adminClient.auth.getSession();
    // If the SDK returns a refreshed token, persist it (only if originally persisted)
    // if (session?.accessToken) await invoke('store_token', { token: session.accessToken });
    scheduleRefresh(session.expiresAt, adminClient);
  } catch {
    expireSession();
  }
}
```

### IN-03: Forgot-password link duplicated at top and bottom of form

**File:** `src/screen-login.jsx:164-167` and `src/screen-login.jsx:233-237`

**Issue:** The "Forgot password?" link appears twice on the login form — once inline in the password field label (line 164) and once in the form footer (line 233). Both call `onForgotPassword()`. This is likely a prototype port artifact. While not a bug, it adds redundant DOM elements and may cause confusion if the label placement is later changed.

**Fix:** Remove the footer link (lines 232-238) and keep only the in-label link, which is the conventional location for this action.

---

_Reviewed: 2026-04-23_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
