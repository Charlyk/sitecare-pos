---
phase: 17-centralized-branch-access-error-handling
plan: 06
subsystem: error-handling
tags: [react, zustand, i18n, tdd]

# Dependency graph
requires:
  - phase: 17-centralized-branch-access-error-handling (plan 03)
    provides: "noBranchAccess session-only store flag + setNoBranchAccess setter, i18n branch_no_access_* keys"
provides:
  - "auth.jsx's window-focus listener generalized from 're-seed only if currentBranch is null' to 'always revalidate via getMe() on every focus' (BERR-04, D-07)"
  - "Focus revalidation compares server selectedBranch.id to local currentBranch.id: adopt+neutral-toast on a different valid branch, no-op on the same branch, setNoBranchAccess(true) on null/403 (D-06, D-02 auto-clear trigger)"
  - "In-closure inFlight reentrancy guard preventing overlapping getMe() calls on rapid focus events (Pitfall 4)"
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Reentrancy guard via a plain in-closure boolean (not a timer/debounce) for an async event handler that can re-fire before its own async work completes"

key-files:
  created: []
  modified:
    - src/auth.jsx
    - src/i18n.jsx
    - src/__tests__/auth.test.jsx
    - src/__tests__/auth-token.test.jsx

key-decisions:
  - "The focus listener's neutral adopt toast uses kind: 'info' (per 17-RESEARCH.md Pattern 3's exact sketch) — this renders through the existing zap-icon toast branch (only 'success' gets a distinct icon), so no new toast markup/CSS was needed despite 'info' not being a previously-used kind string in this codebase"
  - "Id comparison for the server-vs-local branch check is normalized via String(serverBranchId) !== String(localBranchId) rather than a strict !==, per Pitfall 11's explicit warning that a string/number id-type mismatch must never produce a false 'changed' and misfire the adopt+toast path"
  - "t() is computed fresh inside handleFocus via useT(useAppStore.getState().lang) at toast-push time, not derived once from a render-time hook — this avoids a stale-closure risk if lang changes while the effect is mounted (the effect's own dependency array is [client] only, unchanged from the original D-04 listener)"
  - "The pre-existing auth-token.test.jsx assertion 'firing window focus when currentBranch is already set does NOT call getMe() again' encoded the OLD behavior this plan intentionally inverts; updated in the same GREEN commit to assert the new behavior (getMe() IS called again, but a same-branch response is a no-op) rather than treated as a separate deviation, since replacing that exact behavior is this plan's stated objective"

patterns-established:
  - "Non-hook module-scope store reads inside a plain async closure (useAppStore.getState() at each decision point, not a single hook-derived destructure) — mirrors the existing seedFromMe/expireSession convention in the same file"

requirements-completed: [BERR-04]

coverage:
  - id: D1
    description: "The `|| currentBranch` short-circuit is removed from auth.jsx's focus listener guard — revalidation now fires via getMe() on every focus, not only when currentBranch is null"
    requirement: "BERR-04"
    verification:
      - kind: other
        ref: "grep -n \"currentBranch\" src/auth.jsx (no `|| currentBranch` short-circuit line in the focus effect's guard)"
        status: pass
      - kind: unit
        ref: "src/__tests__/auth-token.test.jsx#firing window focus when currentBranch is already set now revalidates via getMe() again (BERR-04) — same branch stays a no-op"
        status: pass
    human_judgment: false
  - id: D2
    description: "A different-but-valid server branch on focus is silently adopted via setCurrentBranch and surfaced with a neutral 'Now showing <branch>' info toast; an identical branch is a no-op (no setCurrentBranch, no toast, no block)"
    requirement: "BERR-04"
    verification:
      - kind: unit
        ref: "src/__tests__/auth.test.jsx#focus with a different-but-valid server branch adopts it and pushes a neutral \"Now showing\" toast"
        status: pass
      - kind: unit
        ref: "src/__tests__/auth.test.jsx#focus with the same server branch id is a no-op — no setCurrentBranch, no toast, no block"
        status: pass
    human_judgment: false
  - id: D3
    description: "selectedBranch === null OR a thrown 403 (A3 defensive path) on focus routes through setNoBranchAccess(true) — the same NO_BRANCH_ACCESS block a live 403 trips"
    requirement: "BERR-04"
    verification:
      - kind: unit
        ref: "src/__tests__/auth.test.jsx#focus with selectedBranch===null routes to setNoBranchAccess(true) and does not adopt a branch"
        status: pass
      - kind: unit
        ref: "src/__tests__/auth.test.jsx#focus with a thrown 403 (A3 defensive path) also routes to setNoBranchAccess(true)"
        status: pass
    human_judgment: false
  - id: D4
    description: "A genuine 401 from the focus getMe() still calls expireSession; a non-401/non-403 failure is swallowed silently, matching seedFromMe's existing convention"
    requirement: "BERR-04"
    verification:
      - kind: unit
        ref: "src/__tests__/auth.test.jsx#focus with a thrown 401 calls expireSession (session ends)"
        status: pass
      - kind: unit
        ref: "src/__tests__/auth.test.jsx#focus with a non-401/non-403 thrown error is swallowed silently — no block, no toast, no expire"
        status: pass
    human_judgment: false
  - id: D5
    description: "An in-closure inFlight boolean guard prevents overlapping getMe() calls when focus events fire in rapid succession — a second focus while a getMe() call is still pending is a no-op, so a stale later-resolving response can never win the adopt/toast decision"
    requirement: "BERR-04"
    verification:
      - kind: unit
        ref: "src/__tests__/auth.test.jsx#two focus events fired before the first getMe() resolves result in a single getMe() call (reentrancy guard)"
        status: pass
    human_judgment: false
  - id: D6
    description: "A single-branch tenant's focus revalidation returns the same branch every time and never misfires the NO_BRANCH_ACCESS block or a spurious 'Now showing' toast (Pitfall 11 standing regression item)"
    requirement: "BERR-04"
    verification:
      - kind: unit
        ref: "src/__tests__/auth.test.jsx#a single-branch tenant returning the same branch every focus never trips the block or a spurious toast"
        status: pass
    human_judgment: false
  - id: D7
    description: "branch_focus_update_title/branch_focus_update_prefix added to both ro and en i18n blocks with 1:1 key parity, exact copy from 17-UI-SPEC.md's Copywriting Contract"
    requirement: "BERR-04"
    verification:
      - kind: other
        ref: "grep -c \"branch_focus_update_title\" src/i18n.jsx == 2"
        status: pass
    human_judgment: false

duration: ~7min
completed: 2026-07-24
status: complete
---

# Phase 17 Plan 06: Generalized Window-Focus Branch Revalidation Summary

**`auth.jsx`'s window-focus listener now always revalidates the selected branch via `getMe()` on every focus (the old `|| currentBranch` null-only guard is removed), silently adopting a benign remote branch change with a neutral "Now showing `<branch>`" toast, routing a revoked/zero-branch state to the same `NO_BRANCH_ACCESS` block as a live 403, no-opping when unchanged, and guarding rapid-focus races with an in-closure `inFlight` boolean.**

## Performance

- **Duration:** ~7 min
- **Started:** 2026-07-24T00:30:00Z (approx)
- **Completed:** 2026-07-24T00:33:06Z
- **Tasks:** 1 (TDD, RED→GREEN, no REFACTOR needed)
- **Files modified:** 4

## Accomplishments
- `src/auth.jsx`'s D-04 focus listener generalized: the `if (!isAuthenticated || currentBranch || !client) return;` guard's `|| currentBranch` clause is removed, so `getMe()` fires on every focus regardless of whether a branch is already set
- The listener now compares `me.selectedBranch.id` (server truth) to the local `currentBranch.id`: a different-but-valid id triggers `setCurrentBranch` + a neutral `kind: 'info'` toast (`branch_focus_update_title`/`branch_focus_update_prefix`); an identical id is a no-op; `selectedBranch === null` or a thrown 403 calls `setNoBranchAccess(true)` (the same block `17-04` renders); a thrown 401 calls `expireSession()`; any other thrown error is swallowed silently
- An in-closure `inFlight` boolean guards against overlapping `getMe()` calls from rapid focus events (POS alt-tabbing) — a second focus received while a prior call is still pending is a no-op, closing the reentrancy race Pitfall 4 describes
- `src/i18n.jsx` gained `branch_focus_update_title`/`branch_focus_update_prefix` in both `ro` and `en` blocks, exact copy from `17-UI-SPEC.md`
- `src/__tests__/auth.test.jsx` gained 8 new tests (mounting the real `AuthProvider` via `renderHook` + `window.dispatchEvent(new Event('focus'))`) covering adopt+toast, no-op, null-block, 403-block, 401-expire, silent-swallow, reentrancy, and single-branch-tenant non-misfire
- `src/__tests__/auth-token.test.jsx`'s pre-existing D-04 test (which asserted the OLD "focus does NOT re-call getMe() once a branch is set" behavior) updated to assert the new, intentionally-inverted behavior

## Task Commits

1. **Task 1 (RED): failing tests for generalized window-focus branch revalidation** — `293bfcb` (test)
2. **Task 1 (GREEN): generalize window-focus listener to always revalidate branch** — `68ba861` (feat)

**Plan metadata:** committed as part of this SUMMARY commit.

_No REFACTOR commit — implementation was clean on first GREEN pass._

## Files Created/Modified
- `src/auth.jsx` — focus `useEffect` body replaced: `inFlight` closure guard, explicit `getMe()` call, `selectedBranch === null` / id-compare / 401 / 403 / silent-catch branches, `useT` import added
- `src/i18n.jsx` — `branch_focus_update_title`/`branch_focus_update_prefix` added to both `ro` and `en` blocks
- `src/__tests__/auth.test.jsx` — new `BERR-04` describe block (8 tests) mounting the real `AuthProvider`/`useAuth` and dispatching real `focus` events
- `src/__tests__/auth-token.test.jsx` — updated the one pre-existing test whose assertion directly contradicted the new intended behavior

## Decisions Made
- **`kind: 'info'` for the neutral toast**, per `17-RESEARCH.md` Pattern 3's exact sketch — renders through the existing generic (zap-icon) toast branch with zero new markup, satisfying the UI-SPEC's "keep to an existing kind, no new toast variant" note even though `'info'` wasn't a previously-used kind string in this codebase.
- **String-normalized id comparison** (`String(serverBranchId) !== String(localBranchId)`) rather than a bare `!==`, per Pitfall 11's explicit warning sign about a string/number id-type mismatch causing a spurious "Now showing" toast.
- **`t()` computed fresh at toast-push time** via `useT(useAppStore.getState().lang)` inside the async closure, not derived once from a render-time hook — avoids a stale-`lang`-closure risk without adding `lang` to the effect's dependency array (kept at `[client]`, unchanged from the original listener).
- **The obsolete `auth-token.test.jsx` assertion was updated, not left broken or treated as a separate out-of-scope deviation** — its old expectation ("focus does NOT call getMe() again once branch is set") is the literal behavior this plan's objective replaces, so fixing it is inherent to implementing the plan, bundled into the GREEN commit.

## Deviations from Plan

None beyond the expected/foreseeable test-suite adjustment described above (updating the one test whose assertion encoded the exact behavior this plan intentionally inverts) — not treated as a Rule 1-4 deviation since the plan's own objective is to replace that behavior; the test change is bundled into the GREEN implementation commit as inherent scope, not unplanned discovered work.

## Issues Encountered

- During RED-phase test-writing, an initial version of the new `BERR-04` describe block's `beforeEach` called `useAppStore.setState({ ..., lang: 'en' })` (a persisted key) *before* configuring the `@tauri-apps/plugin-store` `load` mock — this raced zustand persist's async `setItem` write against an unconfigured mock and surfaced as an "Unhandled Rejection: Cannot read properties of undefined (reading 'set')" (non-fatal to the tests themselves, all 11 still passed, but a real test-harness smell). Fixed by reordering the `beforeEach` to configure `load.mockResolvedValue(...)` before the `useAppStore.setState(...)` call. Verified clean (`npx vitest run src/__tests__/auth.test.jsx` — no unhandled errors) before proceeding.
- Pre-existing, unrelated `build-pipeline.test.js` `BILD-04` failure (documented since 17-01 in `deferred-items.md`) persists unchanged — out of scope for this plan's files (`src/auth.jsx`, `src/i18n.jsx`, two test files).

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

BERR-04 is fully implemented: the window-focus listener now provides the D-02 auto-clear-on-focus trigger for the `NO_BRANCH_ACCESS` block (a revoked/zero-branch state detected on focus routes through the identical `setNoBranchAccess(true)` path `17-04`'s block already renders and recovers from), and closes the "another device changed my branch and I never find out" gap (Pitfall 8) with a silent adopt + neutral toast for benign remote changes. This is the last plan in Phase 17's wave 4 (`depends_on: ["17-03"]`) — all four `BERR-01` through `BERR-04` requirements are now complete across plans 01/02 (choke point + matcher), 03 (three-code recovery), 04 (block UI), 05 (SSE 403 routing), and this plan (focus revalidation). No blockers.

Two items remain open in `.planning/WINDOWS.md` from earlier plans in this phase (neither touched or affected by this plan's files): entry #1 (provisional `BRANCH_CODES` matcher, from 17-02) and entry #2 (concurrent-error backstop, from 17-03).

---
*Phase: 17-centralized-branch-access-error-handling*
*Completed: 2026-07-24*

## TDD Gate Compliance

Task 1 (`tdd="true"`) gate sequence verified in git log:

- RED: `293bfcb test(17-06): add failing tests for generalized window-focus branch revalidation` — all 8 new tests confirmed failing before implementation (`npx vitest run src/__tests__/auth.test.jsx` showed 8 failures / 3 pre-existing passes)
- GREEN: `68ba861 feat(17-06): generalize window-focus listener to always revalidate branch` — all 11 tests in `auth.test.jsx` pass, plus the updated `auth-token.test.jsx` assertion
- REFACTOR: none needed — implementation was clean on first GREEN pass

Gate sequence compliant: RED precedes GREEN, both present, no drift.

## Self-Check: PASSED

- All 4 modified files confirmed present on disk (`src/auth.jsx`, `src/i18n.jsx`, `src/__tests__/auth.test.jsx`, `src/__tests__/auth-token.test.jsx`)
- Both task commits confirmed in `git log` (`293bfcb`, `68ba861`)
- All acceptance criteria re-run and passing:
  - `grep -n "currentBranch" src/auth.jsx` — no `|| currentBranch` short-circuit remains in the focus listener guard
  - `npx vitest run src/__tests__/auth.test.jsx` — 11/11 passed, no unhandled errors
  - `grep -c "branch_focus_update_title" src/i18n.jsx` — returns 2 (both language blocks)
- Full suite: `npx vitest run` → 620/621 passed — the 1 failure is pre-existing and unrelated (`build-pipeline.test.js` BILD-04, documented in `deferred-items.md` since 17-01)
- Targeted regression check: `npx vitest run src/__tests__/auth-token.test.jsx src/__tests__/auth.test.jsx src/__tests__/auth-schedule.test.js` → 26/26 passed
