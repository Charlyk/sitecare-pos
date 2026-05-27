---
phase: 02-authentication
plan: "03"
subsystem: auth-state
tags: [auth, zustand, react-context, keychain, sdk, refresh-timer]
completed: 2026-04-23

dependency_graph:
  requires: [02-01-keychain-commands]
  provides:
    - src/auth.jsx (AuthProvider + useAuth)
    - isAuthenticated and authUser keys in src/store.js
  affects:
    - src/store.js (2 new session-only keys + 2 new actions)
    - src/app.jsx (Plan 02-04 wraps with AuthProvider here)

tech_stack:
  added: []
  patterns:
    - React context provider for AdminClient singleton (AuthProvider)
    - Zustand session-only keys for auth flag (isAuthenticated / authUser)
    - Proactive refresh timer via useRef + setTimeout (cleared on unmount/signOut)
    - Imperative Zustand read (useAppStore.getState()) inside non-hook expireSession()

key_files:
  created:
    - src/auth.jsx
  modified:
    - src/store.js

decisions:
  - "expireSession() reads lang imperatively via useAppStore.getState().lang — called from a timer callback, not a hook"
  - "signIn() error mapping: all auth failures map to 'creds' error type — prevents credential enumeration (T-02-08)"
  - "busy starts as true on mount so cold-start keychain check does not flash the login screen"
  - "setError exposed in context so Plan 02-04 can clear errors when navigating away"
  - "signOut navigates to login immediately (no 2s delay); expireSession delays 2s per D-07"

metrics:
  duration: "~8 minutes"
  completed: "2026-04-23"
  tasks_completed: 2
  tasks_total: 2
  files_created: 1
  files_modified: 1
---

# Phase 2 Plan 3: Auth State Machine — AuthProvider + useAuth Summary

**One-liner:** React context provider wiring AdminClient singleton to Zustand auth flag, with cold-start keychain restore, proactive 5-minute refresh timer, and session-expiry toast.

---

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add isAuthenticated and authUser to Zustand store | 5925169 | src/store.js |
| 2 | Create src/auth.jsx — AuthProvider and useAuth hook | 253e225 | src/auth.jsx |

---

## What Was Built

### src/store.js changes
- Added `isAuthenticated: false` (session-only, NOT in `partialize`)
- Added `authUser: null` (session-only, NOT in `partialize`)
- Added `setIsAuthenticated(v)` action
- Added `setAuthUser(user)` action
- `partialize` unchanged — still returns only the original 6 persisted keys

### src/auth.jsx
- `AuthProvider` wraps the app, manages the `AdminClient` singleton in React state
- **Cold start (AUTH-04):** Reads token from OS keychain via `invoke('get_token')`; if valid, calls `adminClient.auth.getSession()` to verify, sets `isAuthenticated=true` and `authUser` — no login screen shown
- **signIn(email, pass, remember) (AUTH-01, AUTH-02):** Calls `sdkSignIn()`, stores token in keychain when `remember=true`, creates `AdminClient`, calls `getSession()` for `expiresAt`, starts refresh timer, navigates to orders (D-09)
- **signOut():** Clears refresh timer, deletes keychain token, resets Zustand auth state, navigates to login
- **Proactive refresh timer (AUTH-03, D-08):** `scheduleRefresh()` sets a `setTimeout` to fire 5 minutes before `session.expiresAt`; on success, reschedules with new expiry; on failure, calls `expireSession()`
- **expireSession() (D-07):** Clears client, sets `isAuthenticated=false`, pushes bilingual session-expired toast, navigates to login after 2000ms
- **useAuth():** Returns `{ signIn, signOut, client, busy, error, setError }` — throws if called outside `<AuthProvider>`

---

## Deviations from Plan

None — plan executed exactly as written.

---

## Threat Model Compliance

| Threat ID | Mitigation | Status |
|-----------|-----------|--------|
| T-02-07 | Token lives only in React state (client ref), garbage-collected on signOut — no localStorage or window.* | Implemented |
| T-02-08 | All auth failures map to `'creds'` error type — API error messages never surfaced verbatim | Implemented |
| T-02-09 | Server-side session management controls ultimate validity; proactive refresh is client convenience only | Accepted |
| T-02-10 | `busy` flag set during signIn; Plan 02-04 uses it to disable the submit button | Implemented |

---

## Known Stubs

None — auth.jsx is fully wired to the real SDK and real keychain commands; no hardcoded values or placeholder data.

---

## Threat Flags

None — no new network endpoints beyond the already-CSP-configured `https://api.restaurant.sitecare.ro`. All IPC calls use the existing `store_token`, `get_token`, `delete_token` commands from Plan 02-01.

---

## Self-Check: PASSED

| Item | Status |
|------|--------|
| src/store.js contains `isAuthenticated: false` | FOUND |
| src/store.js contains `authUser: null` | FOUND |
| src/store.js contains `setIsAuthenticated` | FOUND |
| src/store.js contains `setAuthUser` | FOUND |
| partialize does NOT contain isAuthenticated or authUser | CONFIRMED |
| src/auth.jsx exports `AuthProvider` | FOUND |
| src/auth.jsx exports `useAuth` | FOUND |
| src/auth.jsx calls `invoke('get_token')`, `invoke('store_token')`, `invoke('delete_token')` | FOUND (4 invoke calls) |
| src/auth.jsx uses `sdkSignIn` and `createAdminClient` | FOUND |
| src/auth.jsx contains `scheduleRefresh` and `REFRESH_LEAD_MS` | FOUND |
| src/auth.jsx contains `expireSession` | FOUND |
| src/auth.jsx contains `setScreen('orders')` | FOUND |
| src/auth.jsx does NOT import `@tauri-apps/plugin-shell` | CONFIRMED CLEAN |
| vite build exits 0 | PASSED (95 modules, built in ~390ms) |
| Commit 5925169 exists | FOUND |
| Commit 253e225 exists | FOUND |
