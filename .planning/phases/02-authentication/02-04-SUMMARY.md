---
phase: 02-authentication
plan: "04"
subsystem: auth-integration
tags: [auth, app.jsx, auth-guard, login-screen, opener-plugin, auth-provider]
completed: 2026-04-23T09:11:30Z

dependency_graph:
  requires: [02-01-keychain-commands, 02-02-login-screen, 02-03-auth-state]
  provides:
    - auth guard in src/app.jsx (renders LoginScreen when isAuthenticated=false)
    - AppWithAuth wrapper in src/app.jsx (provides AuthProvider context)
  affects:
    - src/app.jsx (AuthProvider wrapper + conditional LoginScreen render)

tech_stack:
  added: []
  patterns:
    - AuthProvider wraps App via AppWithAuth export
    - Conditional render guard (authBusy blank div → !isAuthenticated LoginScreen → Shell)
    - Hardcoded opener URL string (T-02-12 threat mitigation)

key_files:
  created: []
  modified:
    - src/app.jsx

decisions:
  - "Auth guard ordering: authBusy check first (blank div), then !isAuthenticated (LoginScreen), then Shell — prevents flash of protected content (T-02-13)"
  - "open() URL is a hardcoded string constant, not user-supplied — mitigates T-02-12"
  - "AppWithAuth wrapper function exports AuthProvider context; inner App consumes useAuth() — follows React context provider pattern"
  - "setAuthError (setError from useAuth) not explicitly wired in app.jsx — LoginScreen manages its own internal error state; authError from context is passed as error prop and LoginScreen reads it on re-render after failed signIn"

metrics:
  duration: "~2 minutes"
  completed: "2026-04-23"
  tasks_completed: 1
  tasks_total: 2
  files_created: 0
  files_modified: 1
---

# Phase 2 Plan 4: Auth Layer Integration into app.jsx Summary

**One-liner:** AuthProvider wrapper + conditional auth guard wired into app.jsx so unauthenticated users see LoginScreen and authenticated users proceed to Shell, with forgot-password opener and Zustand lang/setLang connected.

---

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Wire AuthProvider, auth guard, and LoginScreen into app.jsx | 85e21eb | src/app.jsx |
| 2 (checkpoint) | Human verify: end-to-end login flow | PENDING | — |

---

## What Was Built

### src/app.jsx changes

- **Imports added:**
  - `import { AuthProvider, useAuth } from './auth.jsx'`
  - `import { LoginScreen } from './screen-login.jsx'`
  - `import { open } from '@tauri-apps/plugin-opener'`

- **Inside `App` function (after `setAcceptDialog`):**
  - `const isAuthenticated = useAppStore((s) => s.isAuthenticated)`
  - `const { signIn, busy: authBusy, error: authError } = useAuth()`

- **Auth guard (before `return` statement):**
  - `if (authBusy)` → returns white blank `<div>` (cold-start protection per T-02-13)
  - `if (!isAuthenticated)` → returns `<LoginScreen>` with all props wired:
    - `lang={lang}`, `onLangChange={setLang}` — Zustand lang state
    - `onSubmit` — calls `signIn(email, pass, remember)`, swallows thrown error (authError set in context)
    - `onForgotPassword` — calls `open('https://restaurant.sitecare.ro/reset-password')` (hardcoded, T-02-12)
    - `busy={authBusy}`, `error={authError}` — passed from auth context

- **AppWithAuth wrapper function:**
  - Wraps `<App />` in `<AuthProvider>`
  - Exported as default (replaces bare `App` export)

- **Preserved verbatim:**
  - Both `useEffect` hooks (accent CSS + role gate)
  - `orderCount` stub
  - Entire `<Shell>` + screen router JSX
  - Toast stack
  - AcceptDialog render
  - `AcceptDialog` function definition

---

## Deviations from Plan

None — plan executed exactly as written.

---

## Threat Model Compliance

| Threat ID | Mitigation | Status |
|-----------|-----------|--------|
| T-02-11 | Guard checks Zustand `isAuthenticated` (only set to `true` after `getSession()` succeeds) | Implemented |
| T-02-12 | `open()` URL is hardcoded string `'https://restaurant.sitecare.ro/reset-password'` — not user input | Implemented |
| T-02-13 | `authBusy` renders white blank div — LoginScreen and Shell are mutually exclusive render paths | Implemented |

---

## Known Stubs

None in this plan's changes. (The `orderCount = { live: 0, new: 0, active: 0 }` stub from Phase 1 is preserved intentionally per plan instruction — Phase 3 replaces it.)

---

## Checkpoint Status

**Task 2 is a `checkpoint:human-verify` gate.** Automated tasks complete. Awaiting human verification of the end-to-end login flow against the real SiteCare API (Tests 1–6 in the plan).

---

## Self-Check: PASSED

| Item | Status |
|------|--------|
| src/app.jsx contains `AuthProvider` (>= 2 matches) | FOUND (3 matches) |
| src/app.jsx contains `LoginScreen` (>= 2 matches) | FOUND (4 matches) |
| src/app.jsx contains `isAuthenticated` | FOUND (2 matches) |
| src/app.jsx contains `open.*reset-password` | FOUND (1 match) |
| src/app.jsx contains `plugin-opener` | FOUND (1 match) |
| src/app.jsx does NOT contain `plugin-shell` | CONFIRMED (0 matches) |
| src/app.jsx contains `AcceptDialog` | FOUND (6 matches) |
| src/app.jsx contains `toast-stack` | FOUND (1 match) |
| vite build exits 0 | PASSED (95 modules, built in 419ms) |
| Commit 85e21eb exists | FOUND |
