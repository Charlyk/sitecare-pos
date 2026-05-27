---
phase: 02-authentication
plan: 05
subsystem: auth
tags: [zustand, react, auth, token-refresh, email-validation]

# Dependency graph
requires:
  - phase: 02-authentication
    provides: auth.jsx AuthProvider, scheduleRefresh, signOut, expireSession; screen-login.jsx LoginScreen with canSubmit
provides:
  - CR-01 fixed: scheduleRefresh uses 30s MIN_RETRY_MS floor via setTimeout, no bare doRefresh call
  - WR-01 fixed: expireSession and signOut call setScreen('orders') — 'login' is not a valid persisted screen
  - WR-02 fixed: expireSession and signOut call setError(null) before navigating away
  - WR-03 fixed: debug console.log removed from signIn response handling
  - WR-04 fixed: canSubmit requires isValidEmail(email), disabling Submit for invalid addresses
affects: [03-shell-data, phase-2-human-verification]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "MIN_RETRY_MS = 30_000 floor constant guards all async refresh paths from tight loops"
    - "setScreen('orders') as the safe reset target — auth guard in app.jsx handles LoginScreen render when isAuthenticated=false"
    - "setError(null) called in both expireSession and signOut to ensure clean login screen state on reappear"

key-files:
  created: []
  modified:
    - src/auth.jsx
    - src/screen-login.jsx

key-decisions:
  - "setScreen('orders') not setScreen('login') on sign-out/expire: 'login' is not a valid Zustand-persisted screen enum value; auth guard handles LoginScreen render when isAuthenticated=false"
  - "MIN_RETRY_MS = 30_000 applied only to the <= 0 (already-expired) branch; normal branch uses calculated msUntilRefresh unchanged"
  - "canSubmit check uses isValidEmail(email) replacing email !== '' — the handleSubmit guard retained as secondary safety net for Enter-key edge case"

patterns-established:
  - "Refresh floor: any scheduleRefresh path that would fire immediately uses setTimeout(fn, MIN_RETRY_MS) instead of direct call"
  - "Auth screen routing: signOut/expireSession always navigate to a valid router branch ('orders'); auth guard determines what to render"

requirements-completed: [AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05]

gaps_closed: [CR-01, WR-01, WR-02, WR-03, WR-04]
files_modified: [src/auth.jsx, src/screen-login.jsx]
build_verified: true
phase_status: ready_for_human_verification

# Metrics
duration: 2min
completed: 2026-04-23
---

# Phase 2 Plan 05: Gap Closure Summary

**Targeted 5-fix gap-closure: MIN_RETRY_MS floor prevents auth tight-loops, setScreen('orders') fixes Zustand screen persistence, setError(null) ensures clean login state, console.log removed, isValidEmail gates Submit button**

## Performance

- **Duration:** 2 min
- **Started:** 2026-04-23T10:47:07Z
- **Completed:** 2026-04-23T10:49:04Z
- **Tasks:** 3 (2 code edits + 1 build verification)
- **Files modified:** 2

## Accomplishments

- CR-01 resolved: `scheduleRefresh` <= 0 branch now wraps `doRefresh` in `setTimeout` with `MIN_RETRY_MS` (30s) floor, eliminating the tight async loop that could hammer the auth endpoint
- WR-01 resolved: `expireSession` and `signOut` call `setScreen('orders')` — the 'login' string was never a valid Zustand-persisted router branch and would cause a blank shell on cold start
- WR-02 resolved: both `expireSession` and `signOut` call `setError(null)` before navigating away, ensuring the login screen shows clean state when it reappears
- WR-03 resolved: `console.log('[auth] signIn response keys:', ...)` debug line removed — API response key shape no longer visible in DevTools
- WR-04 resolved: `canSubmit` in `screen-login.jsx` now requires `isValidEmail(email)`, disabling Submit for any invalid email format and eliminating the silent-bail UX failure

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix auth.jsx — CR-01, WR-01, WR-02, WR-03** - `00ac3c5` (fix)
2. **Task 2: Fix screen-login.jsx — WR-04 email validation** - `c7df676` (fix)
3. **Task 3: Build verification** - no commit (verification only, no code changes)

## Files Created/Modified

- `src/auth.jsx` — Added `MIN_RETRY_MS = 30_000` constant; `scheduleRefresh` <= 0 branch uses `setTimeout` with floor; `expireSession` and `signOut` call `setScreen('orders')` and `setError(null)`; removed `console.log` debug line
- `src/screen-login.jsx` — `canSubmit` expression changed from `email !== ''` to `isValidEmail(email)`

## Decisions Made

- `setScreen('orders')` as reset target: 'login' is not a valid Zustand-persisted router enum value. The auth guard in `app.jsx` renders `LoginScreen` whenever `isAuthenticated === false`, so setting screen to 'orders' and relying on the guard is the correct pattern.
- `MIN_RETRY_MS` applied only to the `<= 0` branch: the normal path (positive `msUntilRefresh`) is unchanged; only the already-expired path gets the 30s floor.
- `handleSubmit` guard retained as-is: since `canSubmit` now blocks the Submit button for invalid emails, the `if (!isValidEmail(email)) return` in `handleSubmit` is a harmless secondary guard for the Enter-key edge case. No change needed.

## Deviations from Plan

None - plan executed exactly as written. The `setError(null)` count of 3 (vs. the plan's expected 2) is because the pre-existing call at the top of `signIn()` was already in the file; the plan counted only the two new additions in `expireSession` and `signOut`.

## Issues Encountered

None — all 5 edits applied cleanly, Vite build passed on first attempt with no errors.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 2 auth layer is fully fixed and ready for human verification (SC-1 live Tauri cold-start test, SC-5 8-hour shift test require native runtime)
- All 5 gap-closure items (CR-01, WR-01, WR-02, WR-03, WR-04) are resolved
- Phase 3 (Shell + Data Foundation) can proceed after human verification of Phase 2

---
*Phase: 02-authentication*
*Completed: 2026-04-23*
