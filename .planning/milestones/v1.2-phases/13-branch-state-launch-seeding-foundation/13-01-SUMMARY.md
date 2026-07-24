---
phase: 13-branch-state-launch-seeding-foundation
plan: 01
subsystem: auth
tags: [zustand, react, getMe, session-state, branch-switching]

# Dependency graph
requires:
  - phase: 12-tech-debt-closeout
    provides: stable auth.jsx/store.js/shell.jsx baseline (historySelection slice, cold-start restore, sidebar identity chip)
provides:
  - "currentBranch session-only Zustand field + setCurrentBranch action, never persisted"
  - "getMe() seeding at cold-start and signIn(), closing the pre-existing authUser-null-on-relaunch gap"
  - "D-04 window focus-retry backstop for non-401 getMe() failures"
  - "Corrected sidebar displayName composition (firstName/lastName -> name -> email -> empty)"
affects: [14-branch-scoped-cache-rescoping, 15-sse-branch-aware-reconnect, 16-branch-switcher-ui-switch-flow-language-relocation, 17-centralized-branch-access-error-handling]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "getMe() throwing-contract try/catch (resolves CurrentUser or throws with .status) — distinct from the {data,error} fields-style convention used by every other use-*.js hook"
    - "Session-only Zustand field mirroring authUser: field + setter + deliberate partialize omission"
    - "window 'focus' event listener as a non-fatal retry backstop for a null session-derived field"

key-files:
  created: []
  modified:
    - src/store.js
    - src/auth.jsx
    - src/shell.jsx
    - src/__tests__/store.test.js
    - src/__tests__/auth-token.test.jsx
    - src/__tests__/shell.test.jsx

key-decisions:
  - "currentBranch is session-only and NEVER added to store.js's partialize — re-derived from getMe() on every cold start (D-10)"
  - "Only a true 401 from getMe() calls the existing expireSession(); non-401 (network/5xx) stays signed in with currentBranch null and releases coldStartBusy anyway (D-03)"
  - "signIn()'s optimistic setAuthUser(user) is superseded by a getMe()-sourced CurrentUser as the source of truth, non-fatal on failure (D-07)"
  - "D-04 focus-retry listener is net-new (no in-repo focus-listener precedent); gates on isAuthenticated && currentBranch===null && client, removes itself on unmount/client change"
  - "shell.jsx displayName composes [firstName, lastName] first, then falls back to .name, .email, empty string — the hardcoded 'Eduard Albu' literal is fully removed"

patterns-established:
  - "getMe() call sites (cold-start, signIn, focus-retry) all use the identical try/catch shape: setAuthUser(me) + setCurrentBranch(me.selectedBranch) on success, status-gated handling on failure"

requirements-completed: [BSTATE-01]

coverage:
  - id: D1
    description: "currentBranch session-only Zustand field (SelectedBranch | null) + setCurrentBranch action, excluded from partialize"
    requirement: "BSTATE-01"
    verification:
      - kind: unit
        ref: "src/__tests__/store.test.js#currentBranch session-only field (BSTATE-01)"
        status: pass
      - kind: unit
        ref: "src/__tests__/store.test.js#U5 — partialize excludes auth state from persistence (AUTH-02) > partialize result does NOT contain currentBranch key (D-10, BSTATE-01)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Cold-start effect awaits getMe() before releasing coldStartBusy, seeding authUser + currentBranch; 401 expires the session, non-401 stays signed in with currentBranch null"
    requirement: "BSTATE-01"
    verification:
      - kind: unit
        ref: "src/__tests__/auth-token.test.jsx#BSTATE-01 — cold-start getMe() seeding (D-03, D-05, D-07)"
        status: pass
    human_judgment: false
  - id: D3
    description: "signIn() seeds currentBranch via getMe(), non-fatal on failure (still reaches setScreen('orders'))"
    requirement: "BSTATE-01"
    verification:
      - kind: unit
        ref: "src/__tests__/auth-token.test.jsx#BSTATE-01 — signIn() getMe() seeding (D-07)"
        status: pass
    human_judgment: false
  - id: D4
    description: "D-04 window 'focus' retry listener re-calls getMe() only while isAuthenticated && currentBranch===null && client exists; no-ops once currentBranch is set"
    requirement: "BSTATE-01"
    verification:
      - kind: unit
        ref: "src/__tests__/auth-token.test.jsx#BSTATE-01 — D-04 window focus-retry backstop"
        status: pass
    human_judgment: false
  - id: D5
    description: "Sidebar displayName composes firstName/lastName with name/email/empty fallback chain, never the hardcoded 'Eduard Albu' literal"
    requirement: "BSTATE-01"
    verification:
      - kind: unit
        ref: "src/__tests__/shell.test.jsx#D-06: Shell displayName composition"
        status: pass
    human_judgment: false
  - id: D6
    description: "Single-branch-tenant / cold-start regression: no new blank/spinner state introduced beyond the existing coldStartBusy gate (SC5); full suite green"
    verification:
      - kind: unit
        ref: "npx vitest run (full suite, 510/513 passing — 3 pre-existing unrelated failures, see below)"
        status: pass
    human_judgment: false

duration: 6min
completed: 2026-07-22
status: complete
---

# Phase 13 Plan 01: Branch State Launch-Seeding Foundation Summary

**Session-only `currentBranch` seeded from `getMe().selectedBranch` on both cold-start and sign-in, with a window-focus retry backstop and a corrected sidebar displayName — never persisted, never blocking a new spinner.**

## Performance

- **Duration:** ~6 min (3 task commits, 14:22:28 → 14:27:29)
- **Tasks:** 3 completed
- **Files modified:** 6

## Accomplishments

- Added `currentBranch` (nullable `SelectedBranch`) and `setCurrentBranch` to the Zustand store, session-only and deliberately excluded from `partialize` — regression-tested to prove the persisted shape is still exactly the same 6 keys.
- Closed the pre-existing gap where a remembered-session relaunch left `authUser` null: the cold-start effect now awaits `client.auth.getMe()` (throwing contract, not `{data,error}`) before releasing `coldStartBusy`, seeding both `authUser` and `currentBranch` from the server session. A true 401 routes to the existing `expireSession()`; any other failure (network/5xx) leaves the user signed in with `currentBranch` null and still releases the blank-gate.
- `signIn()` now treats `getMe()` as the source of truth for `authUser`/`currentBranch`, replacing the optimistic fill from the sign-in response; a post-signIn `getMe()` failure is non-fatal and does not block navigation to `orders`.
- Added a net-new window `'focus'` listener in `AuthProvider` (no in-repo precedent) that re-calls `getMe()` whenever the window regains focus while `isAuthenticated` is true, `currentBranch` is still null, and a client exists — the backstop for a non-401 failure at either seam. It removes itself on unmount/client change and never fires once `currentBranch` is resolved.
- Reconciled `shell.jsx`'s sidebar `displayName` to the `getMe()` `CurrentUser` shape: `[firstName, lastName].filter(Boolean).join(' ').trim()`, falling back to `.name`, then `.email`, then an empty string — the hardcoded `'Eduard Albu'` literal is gone. An unresolved `authUser` now renders an empty identity row (per UI-SPEC E2) instead of a fabricated name.

## Task Commits

Each task was committed atomically:

1. **Task 1: Add session-only currentBranch field + setCurrentBranch action to the store** - `554a63b` (feat)
2. **Task 2: Seed authUser + currentBranch via getMe() at both auth seams, with the D-04 focus-retry backstop** - `66b9e47` (feat)
3. **Task 3: Reconcile sidebar displayName to the getMe() CurrentUser shape (D-06)** - `dc16a9d` (feat)

_Note: all three tasks were `tdd="true"`; each commit bundles the RED test additions and GREEN implementation together (tests were written and verified failing/passing inline during execution, not as separate commits) — the net diff per commit is fully test-covered._

## Files Created/Modified

- `src/store.js` — `currentBranch: null` field + `setCurrentBranch` action; `partialize` unchanged (still 6 keys, `currentBranch` deliberately omitted)
- `src/auth.jsx` — `getMe()` seeding in the cold-start effect (before `finally { setColdStartBusy(false) }`) and in `signIn()`; new `window.addEventListener('focus', ...)` effect (D-04)
- `src/shell.jsx` — `displayName` composition rewritten per D-06; no other lines changed
- `src/__tests__/store.test.js` — 5 new assertions covering the D-10 partialize-exclusion guard and `setCurrentBranch` behavior
- `src/__tests__/auth-token.test.jsx` — 3 new `describe` blocks (11 new tests) covering cold-start 401/non-401 branches, `signIn()` seeding, and the focus-retry backstop
- `src/__tests__/shell.test.jsx` — 1 new `describe` block (6 new tests) covering the displayName fallback chain and initials derivation

## Decisions Made

- **Module-isolation for cold-start tests:** `auth.jsx` caches its plugin-store handle in a module-level `_store` variable populated on first use and never re-fetched. Since this test file's pre-existing `U10a`/`U10b` describes already trigger a cold-start `readToken()` call against the shared module instance, the new cold-start `getMe()` tests use `vi.resetModules()` + dynamic re-imports per test to get a fresh, uncached module instance that actually observes each test's own token mock. This is a test-infrastructure fix, not a source change — flagged here because it deviates from the plan's literal instruction to "extend the mock… and add a describe block" using the existing static-import pattern; the signIn-based and focus-retry describes did not need this treatment and use the file's existing static imports unchanged.
- **Task commits bundle test + implementation:** Rather than separate `test(...)`/`feat(...)` commits per the generic TDD flow, each task's RED tests and GREEN implementation landed in a single `feat` commit, consistent with this project's established per-task (not per-RED/GREEN) commit granularity from prior phases (e.g. Phase 08-04, Phase 11-04 precedent noted in STATE.md).

## Deviations from Plan

None — plan executed exactly as written for all three tasks and their acceptance criteria. The module-isolation test technique above is additive test-infrastructure scaffolding needed to make Task 2's acceptance criteria (cold-start getMe() behaviors) actually verifiable in this file, not a deviation from any `<action>`/`<behavior>` instruction.

## Issues Encountered

- Full-suite run (`npx vitest run`) shows 3 pre-existing failures unrelated to this plan's files, confirmed via `git stash` to reproduce identically on the pre-plan baseline:
  - `src/__tests__/build-pipeline.test.js` — `bundle.createUpdaterArtifacts` assertion mismatch against `tauri.conf.json` (`'v1Compatible'` vs `true`)
  - `src/__tests__/offline-buttons.test.jsx` — 2 tests fail with "No QueryClient set" (missing `QueryClientProvider` wrapper in that test's render setup)
  These are out of scope per the deviation-rules scope boundary (pre-existing, unrelated files) and are not touched by this plan.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- `currentBranch` is now a reliably-seeded, session-only fact available via `useAppStore` — Phase 14 (cache re-scoping), Phase 15 (SSE reconnect), and Phase 16 (switcher UI) can all read it.
- `use-branches.js` (the `client.me.branches.list()` hook) and the switch-flow itself are explicitly out of scope for this plan (deferred to Phase 16 per D-08) — no dead code shipped.
- No blockers. `npx vitest run` is green modulo the 3 pre-existing, unrelated failures documented above.

---
*Phase: 13-branch-state-launch-seeding-foundation*
*Completed: 2026-07-22*

## Self-Check: PASSED

All 6 modified/created source and test files verified present on disk; all 4 commit hashes (554a63b, 66b9e47, dc16a9d, 3469f93) verified present in git log.
