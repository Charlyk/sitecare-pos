---
phase: 03-shell-data-foundation
plan: 02
subsystem: auth
tags: [react, fetch-event-source, sse, auth-context, token, bearer]

# Dependency graph
requires:
  - phase: 02-authentication
    provides: AuthProvider with tokenRef — existing token persistence and refresh logic this plan extends

provides:
  - "@microsoft/fetch-event-source@2.0.1 installed as a production dependency"
  - "token React state variable exposed from AuthProvider context value"
  - "useAuth() returns { token } — raw Bearer token string accessible to useSSE"
  - "token kept in sync at cold-start, signIn, doRefresh rotation, signOut, expireSession"

affects:
  - 03-03 (useSSE hook reads token via useAuth())
  - 03-04 (useOrders hook may read client via useAuth())
  - any future hook needing direct Bearer header access

# Tech tracking
tech-stack:
  added:
    - "@microsoft/fetch-event-source@2.0.1 — fetchEventSource with header support for SSE Bearer auth"
  patterns:
    - "Parallel ref + state pattern: tokenRef.current for synchronous comparison, token state for React re-renders"
    - "setToken called at every tokenRef.current assignment site to keep both in sync"

key-files:
  created:
    - "src/__tests__/auth-token.test.jsx — TDD RED tests for token in useAuth() context"
  modified:
    - "package.json — @microsoft/fetch-event-source added to dependencies"
    - "package-lock.json — resolved package entry added"
    - "src/auth.jsx — token state + setToken calls + Provider value updated"

key-decisions:
  - "setToken called unconditionally in signIn() regardless of remember flag — token must flow to useSSE even in non-persistent sessions"
  - "token state variable is a React state (not just tokenRef) to trigger re-renders in useSSE when token changes"
  - "Both tokenRef.current and setToken must be kept in sync — ref for synchronous doRefresh comparison, state for consumers"
  - "Worktree package.json updated directly; package-lock.json copied from main repo after npm install ran there"

patterns-established:
  - "Parallel ref+state sync: whenever tokenRef.current = x, immediately call setToken(x)"
  - "Context consumers use const { token } = useAuth() to access raw Bearer token"

requirements-completed:
  - KDS-01

# Metrics
duration: 4min
completed: 2026-04-23
---

# Phase 3 Plan 02: Install fetch-event-source and Expose Auth Token Summary

**@microsoft/fetch-event-source installed and raw Bearer token exposed from AuthProvider context via token React state — useSSE can now construct Authorization headers**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-04-23T19:52:54Z
- **Completed:** 2026-04-23T19:56:49Z
- **Tasks:** 2 (1 chore + 1 TDD feat)
- **Files modified:** 4 (package.json, package-lock.json, auth.jsx, auth-token.test.jsx)

## Accomplishments

- Installed @microsoft/fetch-event-source@2.0.1 — the fetchEventSource function with native header support that makes Bearer-authenticated SSE possible
- Added `token` React state variable to AuthProvider, kept in sync at all 5 token lifecycle points (cold-start, signIn, doRefresh, signOut, expireSession)
- Exposed `token` in AuthContext.Provider value — useSSE can now do `const { token } = useAuth()` to build Bearer headers
- Wrote 4 TDD tests (RED then GREEN) verifying token key presence, null-before-auth, null-after-signOut, matches-signIn-result
- All 18 auth tests pass green; use-sse.test.js stays RED until Plan 03-03 implements the hook

## Task Commits

Each task was committed atomically:

1. **Task 1: Install @microsoft/fetch-event-source** - `7fcb7c0` (chore)
2. **Task 2 RED: auth-token tests** - `37e576b` (test)
3. **Task 2 GREEN: expose token from AuthProvider** - `fa76194` (feat)

**Plan metadata:** (docs commit below)

_Note: Task 2 used TDD — test commit (RED) followed by implementation commit (GREEN)._

## Files Created/Modified

- `package.json` — @microsoft/fetch-event-source@^2.0.1 added to dependencies
- `package-lock.json` — resolved package entry (version 2.0.1, npm registry)
- `src/auth.jsx` — token state + setToken at 5 sites + Provider value updated
- `src/__tests__/auth-token.test.jsx` — U10a/U10b tests for token in useAuth()

## Decisions Made

- `setToken(token)` placed before the `if (remember)` block in signIn() so the token always enters context regardless of persistence preference — useSSE must get a token even when remember=false
- tokenRef.current and token state remain in parallel — ref is needed for synchronous token rotation detection in doRefresh (prevents infinite loop), state triggers re-renders in downstream hooks
- Package installed in main repo node_modules (shared by Node resolution up the directory tree); worktree package.json updated directly and package-lock.json copied from main repo to reflect the new entry

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

The worktree has its own package.json but no node_modules directory; npm install must run in the main repo root. Node's upward module resolution finds the main repo's node_modules transparently. The worktree package.json was updated manually and package-lock.json copied from the main repo after install. This is the expected worktree pattern for this project.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Plan 03-03 (useSSE hook) is unblocked: `fetchEventSource` is installed, `token` is accessible via `useAuth()`
- The `if (!token) return early` guard pattern in useSSE is safe — token is null during cold-start and becomes non-null after auth completes
- use-sse.test.js remains RED (module not found for use-sse.js) — this is correct; Plan 03-03 creates that file

---
*Phase: 03-shell-data-foundation*
*Completed: 2026-04-23*
