---
phase: 02-authentication
verified: 2026-04-23T12:00:00Z
status: gaps_found
score: 7/11 must-haves verified
overrides_applied: 0
gaps:
  - truth: "A proactive refresh timer fires 5 minutes before session.expiresAt and calls getSession() to renew"
    status: failed
    reason: "CR-01: scheduleRefresh() calls doRefresh() directly (synchronously) when msUntilRefresh <= 0 instead of using setTimeout with a minimum floor. If the server keeps returning sessions whose expiresAt is within the lead window (clock skew, short-lived sessions, deactivated accounts), doRefresh succeeds, calls scheduleRefresh again, which again evaluates <= 0, calling doRefresh immediately — a tight async loop that hammers the auth endpoint without bound."
    artifacts:
      - path: "src/auth.jsx"
        issue: "Lines 30-33: `if (msUntilRefresh <= 0) { doRefresh(adminClient); return; }` — no minimum delay floor; must use setTimeout(doRefresh, MIN_RETRY_MS) unconditionally"
    missing:
      - "Replace direct doRefresh() call with setTimeout(() => doRefresh(adminClient), MIN_RETRY_MS) where MIN_RETRY_MS >= 30_000 to break the spin loop"
  - truth: "On cold start, AuthProvider reads the keychain token; if valid, isAuthenticated is set to true without showing the login screen"
    status: failed
    reason: "WR-01 + persistence interaction: signOut() and expireSession() call setScreen('login'). The screen key is included in Zustand partialize and is written to preferences.json. On the next cold start with a valid token, the persist middleware restores screen='login'. The cold-start code path sets isAuthenticated=true but never calls setScreen — so the shell renders with screen='login', which matches no branch in the screen router, producing a blank content panel."
    artifacts:
      - path: "src/auth.jsx"
        issue: "Lines 63 and 142: setScreen('login') persists an invalid screen value. 'login' is not in the valid enum ('orders'|'kitchen'|'pos'|'detail'|'menu'|'printer'|'settings') and the screen router has no handler for it."
      - path: "src/store.js"
        issue: "Line 82: screen IS in partialize — setScreen('login') survives app restart via preferences.json"
    missing:
      - "Replace setScreen('login') with setScreen('orders') in both expireSession (line 63) and signOut (line 142); the auth guard in app.jsx renders LoginScreen whenever isAuthenticated=false regardless of screen value"
  - truth: "Email and password fields display inline validation errors matching the UI-SPEC"
    status: partial
    reason: "WR-04: canSubmit checks `email !== ''` not `isValidEmail(email)`, so the submit button is enabled as soon as any string is typed. When handleSubmit fires with an invalid email, it calls `isValidEmail` and silently returns — no error is displayed and nothing happens. The user sees no feedback."
    artifacts:
      - path: "src/screen-login.jsx"
        issue: "Line 27: `canSubmit = email !== '' && pass !== '' && !busy` — should include `isValidEmail(email)`. Line 31: silent bail with no error state update."
    missing:
      - "Change canSubmit to: `const canSubmit = isValidEmail(email) && pass !== '' && !busy;` (Option A from code review) OR set local error state on silent bail so user sees 'Email invalid' message"
human_verification:
  - test: "Successful login (AUTH-01): Enter valid SiteCare credentials, click Submit"
    expected: "Button shows spinner + 'Se conectează…', then navigates to Orders screen"
    why_human: "Requires live API — cannot verify credential flow programmatically"
  - test: "Persist across restart (AUTH-04): Login, close app, reopen"
    expected: "App goes directly to Orders screen without showing LoginScreen"
    why_human: "Requires actual Tauri runtime and OS keychain interaction"
  - test: "Session expiry toast (AUTH-03/D-07): Simulate expireSession()"
    expected: "Bilingual toast appears, screen transitions to LoginScreen after 2 seconds"
    why_human: "Requires runtime timer behavior — cannot trigger programmatically"
  - test: "Forgot password link (D-05): Click 'Ai uitat parola?' on login screen"
    expected: "System browser opens https://restaurant.sitecare.ro/reset-password"
    why_human: "Requires Tauri runtime and OS browser launch"
  - test: "Auth guard (AUTH-05): Navigate to all 7 screens while logged in"
    expected: "All screens accessible; signing out redirects to LoginScreen"
    why_human: "Requires running Tauri app with authenticated session"
---

# Phase 2: Authentication Verification Report

**Phase Goal:** Staff can log in with username + password via the real SiteCare API, stay authenticated through an 8-hour shift and across app restarts, and are automatically redirected to the login screen if their session expires.
**Verified:** 2026-04-23T12:00:00Z
**Status:** gaps_found
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | OS keychain token commands are callable from the JS renderer via invoke() | VERIFIED | lib.rs: store_token, get_token, delete_token declared as #[tauri::command] and listed in invoke_handler!; keyring = "3" in Cargo.toml |
| 2 | opener plugin is registered so URLs can be opened in the system browser | VERIFIED | lib.rs line 40: tauri_plugin_opener::init() chained in builder; capabilities/default.json includes "opener:default"; app.jsx uses openUrl() from @tauri-apps/plugin-opener (valid export confirmed) |
| 3 | LoginScreen renders the split brand-panel / form-panel layout | VERIFIED | screen-login.jsx: full split-panel JSX present, brand panel + form panel, all bilingual strings via useT(), no window.* globals, no localStorage |
| 4 | All bilingual strings (RO/EN) are present in i18n.jsx and render correctly on the login screen | VERIFIED | 74 login_ occurrences in i18n.jsx (35 key pairs × 2 languages + comments); all 35 keys verified present in both ro and en objects |
| 5 | SSO button is visible but greyed out and unclickable (opacity 0.45, pointer-events none) | VERIFIED | screen-login.jsx line 225: `style={{ opacity: 0.45, cursor: 'not-allowed', pointerEvents: 'none' }}` |
| 6 | useAuth().signIn(email, pass, remember) calls the SDK signIn() and stores the token in the OS keychain when remember=true | VERIFIED | auth.jsx: sdkSignIn() called at line 100; invoke('store_token', { token }) called at line 106 behind `if (remember)` guard |
| 7 | useAuth().signOut() deletes the keychain token and sets isAuthenticated=false in Zustand | VERIFIED | auth.jsx signOut(): invoke('delete_token'), setClient(null), setIsAuthenticated(false), setAuthUser(null) — all present |
| 8 | On cold start, AuthProvider reads the keychain token; if valid, isAuthenticated is set to true without showing the login screen | FAILED | WR-01 + persistence: setScreen('login') is called by signOut/expireSession and screen IS in partialize. After a signOut, preferences.json stores screen='login'. On next cold start with valid token, screen='login' is restored, isAuthenticated=true, and the shell renders a blank content panel (no screen router branch handles 'login'). |
| 9 | A proactive refresh timer fires 5 minutes before session.expiresAt and calls getSession() to renew | FAILED | CR-01: scheduleRefresh() calls doRefresh() directly when msUntilRefresh <= 0 (auth.jsx:32) — no minimum floor, no setTimeout. Can produce a tight async loop hammering the auth endpoint. |
| 10 | If getSession() fails on refresh, the session-expired toast fires and isAuthenticated is set to false | VERIFIED | auth.jsx doRefresh() catch block calls expireSession(); expireSession() clears state, pushes bilingual toast, calls setTimeout(() => setScreen('login'), 2000) |
| 11 | Email and password fields display inline validation errors matching the UI-SPEC | PARTIAL | auth-level errors (creds) display correctly. However email validation is silent: canSubmit checks `email !== ''` not `isValidEmail(email)` — handleSubmit silently bails on invalid email with no error shown to user (WR-04) |

**Score:** 7/11 truths verified

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src-tauri/Cargo.toml` | keyring = 3 dependency | VERIFIED | Line 26: `keyring = "3"` |
| `src-tauri/src/lib.rs` | store_token / get_token / delete_token + opener plugin | VERIFIED | All 3 commands declared with #[tauri::command], listed in invoke_handler!, opener init() chained |
| `src-tauri/capabilities/default.json` | opener:default permission | VERIFIED | All 4 permissions present: core:default, store:default, window-state:default, opener:default |
| `src/login.css` | All login-specific CSS from prototype | VERIFIED | 10,645 bytes; .login-body, .brand-panel, .primary-btn, .field-input.err, .alt-btn, @keyframes pulse, @keyframes spin all present; prototype-only wrappers excluded (0 matches for desktop-stage, tweaks-panel, recent-chip) |
| `src/screen-login.jsx` | LoginScreen component with correct props interface | VERIFIED | Exports LoginScreen({ lang, onLangChange, onSubmit, onForgotPassword, busy, error }); imports login.css, useT, Icon; no window.* or localStorage |
| `src/i18n.jsx` | 35 bilingual login string pairs | VERIFIED | 74 login_ occurrences; all 35 keys present in both ro and en |
| `src/store.js` | isAuthenticated and authUser session-only keys | VERIFIED | Lines 58-59: isAuthenticated:false, authUser:null; setIsAuthenticated and setAuthUser actions at lines 74-75; both excluded from partialize (confirmed) |
| `src/auth.jsx` | AuthProvider + useAuth | VERIFIED (with gaps) | Exports AuthProvider and useAuth; SDK wired; keychain IPC wired; but CR-01 and WR-01 bugs present |
| `src/app.jsx` | AuthProvider wrapper + auth guard | VERIFIED (with gaps) | AppWithAuth wraps App in AuthProvider; coldStartBusy blank div → !isAuthenticated LoginScreen → Shell guard correct; openUrl wired to forgot-password; but inherits WR-01 via setScreen('login') in auth.jsx |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| src/auth.jsx | src-tauri/src/lib.rs | invoke('store_token'\|'get_token'\|'delete_token') | WIRED | 4 invoke calls present in auth.jsx |
| src/auth.jsx | @charlyk/admin-client | signIn() and createAdminClient() | WIRED | sdkSignIn and createAdminClient imported and used |
| src/auth.jsx | src/store.js | setIsAuthenticated / setAuthUser | WIRED | Both called in signIn, signOut, expireSession, cold-start |
| src/screen-login.jsx | src/login.css | import './login.css' | WIRED | Line 4 of screen-login.jsx |
| src/screen-login.jsx | src/i18n.jsx | useT(lang) | WIRED | useT imported and called throughout |
| src/app.jsx | src/auth.jsx | AuthProvider wrapper + useAuth() | WIRED | AuthProvider in AppWithAuth; useAuth() destructured in App |
| src/app.jsx | src/screen-login.jsx | conditional render when !isAuthenticated | WIRED | Lines 69-86 of app.jsx |
| src/app.jsx | @tauri-apps/plugin-opener | openUrl('https://restaurant.sitecare.ro/reset-password') | WIRED | Line 17 import; line 81 call; openUrl confirmed exported by package |

---

### Data-Flow Trace (Level 4)

Not applicable — Phase 2 delivers auth infrastructure and a login form, not data-rendering screens. No dynamic data flows to verify beyond token storage (IPC-traced above).

---

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Vite build compiles without errors | `npx --no-install vite build --mode development` | 100 modules transformed, built in 425ms | PASS |
| login.css contains required selectors | grep checks on 8 required selectors | All 8 present (login-body:1, brand-panel:2, primary-btn:4, field-input.err:1, alt-btn:2, @keyframes pulse:1, @keyframes spin:1) | PASS |
| login.css excludes prototype wrappers | grep for desktop-stage, tweaks-panel, recent-chip, user-rail, loc-chip | 0 matches | PASS |
| screen-login.jsx has no window.* or localStorage | grep | 0 matches | PASS |
| openUrl export exists in plugin-opener | node -e require(...) | ['openPath', 'openUrl', 'revealItemInDir'] | PASS |
| i18n.jsx has 35+ login_ key pairs | grep -c login_ | 74 occurrences (35 × 2 + 4 comments) | PASS |
| CR-01 tight-loop path present | grep scheduleRefresh in auth.jsx | Direct doRefresh() call at line 32 — no setTimeout floor | FAIL |
| WR-01 invalid screen value | grep setScreen in auth.jsx + partialize check | setScreen('login') at lines 63 and 142; screen IS in partialize (store.js line 82) | FAIL |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| AUTH-01 | 02-02, 02-03, 02-04 | User can log in with username + password via @charlyk/admin-client | PARTIAL | signIn() wired to SDK; human verification of actual API call pending |
| AUTH-02 | 02-01, 02-03 | Auth token persisted in OS secure storage | VERIFIED (code) | invoke('store_token') called when remember=true; keychain commands confirmed in lib.rs |
| AUTH-03 | 02-03 | App proactively refreshes auth token before expiry | FAILED | scheduleRefresh CR-01 bug — direct doRefresh call with no floor creates tight loop |
| AUTH-04 | 02-03, 02-04 | App auto-logs in on restart when valid stored token exists | FAILED | WR-01 bug: cold-start with valid token + screen='login' in preferences.json = blank shell |
| AUTH-05 | 02-04 | All screens protected by auth guard | VERIFIED (code) | !isAuthenticated guard in app.jsx before Shell router; human verification pending |

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| src/auth.jsx | 32 | `doRefresh(adminClient)` direct call in `<= 0` branch — no setTimeout floor | Blocker | Infinite async loop when session is near-expiry on a successful refresh (CR-01) |
| src/auth.jsx | 63, 142 | `setScreen('login')` — invalid screen enum value written to persisted store | Blocker | Blank shell on cold start after signOut/expiry (WR-01 + partialize interaction) |
| src/screen-login.jsx | 27, 31 | `canSubmit` uses `email !== ''` not `isValidEmail(email)`; handleSubmit silently bails | Warning | No error feedback for invalid email format typed before submit (WR-04) |
| src/auth.jsx | 101 | `console.log('[auth] signIn response keys:', Object.keys(signInResult))` | Warning | Leaks API response shape in production DevTools (WR-03) |
| src/auth.jsx | 49, 137 | `expireSession()` and `signOut()` do not clear the `error` state | Warning | Stale credential error shown immediately on re-displayed login screen (WR-02) |
| src-tauri/Cargo.toml | 4-5 | `description = "A Tauri App"`, `authors = ["you"]` | Info | Scaffold defaults surface in macOS .app bundle metadata and Windows installer (IN-01) |
| src/auth.jsx | 38-46 | `doRefresh` does not persist updated token to keychain after successful refresh | Info | Original token may be expired on cold start after a mid-session refresh (IN-02) |

---

### Human Verification Required

#### 1. Successful Login (AUTH-01)

**Test:** With the app running (`npm run tauri dev`), type valid SiteCare credentials into the login form and click "Intră în aplicație"
**Expected:** Button shows spinner + "Se conectează…" text, then the app transitions to the Orders screen
**Why human:** Requires live SiteCare API — token exchange and session validation cannot be mocked programmatically here

#### 2. Persist Across Restart (AUTH-04)

**Test:** After a successful login with "Ține-mă conectat" checked, quit the app (Cmd+Q) and reopen with `npm run tauri dev`
**Expected:** App goes directly to Orders screen without showing LoginScreen (cold-start keychain restore works)
**Note:** This test is currently BLOCKED by the WR-01 bug (setScreen('login') may have been persisted from a prior signOut). Fix WR-01 before running this test.
**Why human:** Requires Tauri runtime and OS keychain; vite build alone cannot exercise Tauri IPC

#### 3. Session Expiry Redirect (AUTH-03/D-07)

**Test:** Trigger `expireSession()` from DevTools or by waiting for a session to expire mid-use
**Expected:** A bilingual toast appears ("Sesiunea a expirat…"), and 2 seconds later the app shows LoginScreen
**Why human:** Timer behavior requires running app; cannot inject time manipulation without test harness

#### 4. Forgot Password Link (D-05)

**Test:** Click "Ai uitat parola?" in the password field label on the login screen
**Expected:** System browser opens https://restaurant.sitecare.ro/reset-password
**Why human:** Requires Tauri runtime and OS browser launch; openUrl() is an IPC call

#### 5. Auth Guard on All 7 Screens (AUTH-05)

**Test:** While logged in, click each sidebar item (Orders, Kitchen, POS, Menu, Printer, Settings); then sign out
**Expected:** All 7 screens are accessible when authenticated; after signOut, LoginScreen is shown
**Why human:** Requires running Tauri app with authenticated session

---

### Gaps Summary

Three code-level bugs block two of the four Phase 2 Success Criteria:

**SC-2 (app survives restart)** is blocked by **WR-01**: `setScreen('login')` persists the invalid screen value `'login'` to disk via Zustand partialize. On the next cold start with a valid token the shell renders with `screen='login'` which matches no screen router branch — resulting in a blank content panel. Fix: change `setScreen('login')` to `setScreen('orders')` in both `expireSession` and `signOut` in `src/auth.jsx`.

**SC-3 (8-hour shift without logout)** is blocked by **CR-01**: `scheduleRefresh` in `src/auth.jsx` calls `doRefresh()` directly when `msUntilRefresh <= 0` instead of going through `setTimeout`. On any system with clock skew, short-lived tokens, or a deactivated account that still passes getSession(), this creates a tight async loop hammering the auth endpoint. Fix: always use `setTimeout(() => doRefresh(adminClient), delay)` where delay has a minimum floor of 30,000ms.

A third warning-level bug (**WR-04**) causes silent failure on invalid email: the submit button is enabled for any non-empty email string and the form shows no error when an invalid address is submitted. This blocks the "Email invalid" feedback from the UI-SPEC.

**SC-1** (login works against real API) and **SC-4** (auth guard active) cannot be fully verified without the human checkpoint — all automated checks pass for those success criteria.

Five remaining issues from the code review (WR-02, WR-03, IN-01, IN-02, IN-03) are present in the codebase but do not block the core phase goal. They are documented in the Anti-Patterns table above.

---

_Verified: 2026-04-23T12:00:00Z_
_Verifier: Claude (gsd-verifier)_
