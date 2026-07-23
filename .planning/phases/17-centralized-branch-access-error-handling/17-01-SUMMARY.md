---
phase: 17-centralized-branch-access-error-handling
plan: 01
subsystem: error-handling
tags: [tanstack-query, zustand, i18n, react]

# Dependency graph
requires:
  - phase: 16-branch-switcher-ui-switch-flow-language-relocation
    provides: branchSwitcherForceOpen field/setter (wired minimally, zero call sites), useBranches()/useBranchSwitch(), shell.jsx branch popover markup
provides:
  - "handleBranchError(err, queryClient) — the one central branch-access-403 recovery dispatcher, exported from src/use-branches.js"
  - "BRANCH_CODES allowlist const, shared by later plans (fireSwitch trim, SSE onopen extension)"
  - "TanStack QueryCache/MutationCache global onError wiring in main.jsx — the single choke point every branch-scoped query/mutation error passes through"
  - "shell.jsx consume-once reopen of the branch popover on branchSwitcherForceOpen"
  - "err.branchName attached in useBranchSwitch's mutationFn for <branch> toast interpolation"
affects: [17-02, 17-03, 17-04, 17-05, 17-06]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Guard-first error-code dispatch: handleBranchError early-returns for any err.code not in the BRANCH_CODES allowlist before touching the store"
    - "Non-hook module-scope store access (useAppStore.getState()) for a function invoked from outside React render context (QueryCache/MutationCache onError)"
    - "Consume-once store flag: shell.jsx's useEffect force-opens the popover then immediately resets branchSwitcherForceOpen to false"

key-files:
  created: []
  modified:
    - src/use-branches.js
    - src/main.jsx
    - src/i18n.jsx
    - src/shell.jsx
    - src/__tests__/use-branches.test.js
    - src/__tests__/shell.test.jsx

key-decisions:
  - "handleBranchError is a plain module-scope function, not a hook — mirrors auth.jsx's handleFocus/expireSession getState() convention, since it's invoked from main.jsx's module-scope QueryCache/MutationCache constructors"
  - "Only BRANCH_ACCESS_REVOKED is wired end-to-end this plan; BRANCH_INACTIVE and NO_BRANCH_ACCESS are guarded-but-not-yet-implemented switch branches, deferred to 17-03 — a deliberate functionality gap on a proven architecture, not an architectural gap"
  - "branch_generic_fallback i18n copy ('această filială'/'this branch') chosen as the graceful <branch> interpolation fallback when neither err.branchName nor currentBranch?.name are available"

patterns-established:
  - "Pattern 1 (RESEARCH.md): main.jsx QueryClient constructed with queryCache/mutationCache onError closures capturing the same const queryClient binding, valid because callbacks only invoke queryClient methods at error time after construction completes"

requirements-completed: [BERR-01]

coverage:
  - id: D1
    description: "A synthetic BRANCH_ACCESS_REVOKED 403 thrown by an ordinary branch-scoped query reaches handleBranchError via the global QueryCache onError and produces exactly one toast, sets branchSwitcherForceOpen true, and invalidates ['branches']"
    requirement: "BERR-01"
    verification:
      - kind: unit
        ref: "src/__tests__/use-branches.test.js#a QueryCache constructed with onError:(e)=>handleBranchError(e,qc) invokes the dispatch when a query rejects with a BRANCH_ACCESS_REVOKED error"
        status: pass
      - kind: unit
        ref: "src/__tests__/use-branches.test.js#BRANCH_ACCESS_REVOKED pushes exactly one toast, sets branchSwitcherForceOpen true, and invalidates ['branches']"
        status: pass
    human_judgment: false
  - id: D2
    description: "handleBranchError early-returns for any err.code NOT in BRANCH_CODES — a non-branch error triggers no toast, no reopen, no invalidation"
    requirement: "BERR-01"
    verification:
      - kind: unit
        ref: "src/__tests__/use-branches.test.js#a non-branch error code is a no-op — no toast, no reopen, no invalidation (guard-first early-return)"
        status: pass
    human_judgment: false
  - id: D3
    description: "shell.jsx consumes branchSwitcherForceOpen: opens the branch popover and immediately resets the flag (consume-once), reopened popover stays dismissible via the existing outside-click handler"
    requirement: "BERR-01"
    verification:
      - kind: unit
        ref: "src/__tests__/shell.test.jsx#setting branchSwitcherForceOpen true opens the branch popover and resets the store flag to false"
        status: pass
      - kind: unit
        ref: "src/__tests__/shell.test.jsx#a settled single-branch tenant (canOpenBranchPopover false) is never force-opened"
        status: pass
      - kind: unit
        ref: "src/__tests__/shell.test.jsx#the reopened popover stays dismissible via the existing outside-click handler"
        status: pass
    human_judgment: false
  - id: D4
    description: "The <branch> interpolation resolves err.branchName first, then currentBranch?.name, then t('branch_generic_fallback') — never a literal '<branch>' or empty gap"
    requirement: "BERR-01"
    verification:
      - kind: unit
        ref: "src/__tests__/use-branches.test.js#interpolates err.branchName into the detail line when present, never a literal \"<branch>\""
        status: pass
      - kind: unit
        ref: "src/__tests__/use-branches.test.js#falls back to currentBranch?.name when err.branchName is absent"
        status: pass
      - kind: unit
        ref: "src/__tests__/use-branches.test.js#falls back to the generic fallback copy when neither err.branchName nor currentBranch exist"
        status: pass
    human_judgment: false
  - id: D5
    description: "The recoverable-code toast renders through the existing unmodified .toast/.toast-icon markup with a null/unknown branch name still reading as a sensible sentence (graceful fallback descriptor), not a broken string"
    verification:
      - kind: unit
        ref: "src/__tests__/use-branches.test.js#falls back to the generic fallback copy when neither err.branchName nor currentBranch exist — never a literal \"<branch>\" or empty gap"
        status: pass
    human_judgment: true
    rationale: "UI-SPEC E2-toast marks this a backstop item requiring visual confirmation that the interpolated sentence reads naturally (not just structurally non-empty) — the automated test proves no literal token/gap leaks through, but sentence naturalness in the rendered .toast markup is a human-judgment call per the design contract."

duration: ~6min
completed: 2026-07-23
status: complete
---

# Phase 17 Plan 01: Central Branch-403 Recovery Tracer Summary

**Wired TanStack Query's global QueryCache/MutationCache `onError` to a new `handleBranchError(err, queryClient)` in `use-branches.js`, proving the one-central-path architecture end-to-end for `BRANCH_ACCESS_REVOKED` (toast + switcher reopen + `['branches']` refetch) before any expansion.**

## Performance

- **Duration:** ~6 min
- **Started:** 2026-07-23T20:15:30Z (approx, per STATE.md session timestamp)
- **Completed:** 2026-07-23T20:21:34Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- `handleBranchError(err, queryClient)` exported from `src/use-branches.js` — the one central choke point for branch-access-403 recovery, guard-first on the `BRANCH_CODES` allowlist
- `main.jsx` constructs `QueryClient` with `queryCache`/`mutationCache` `onError` both wired to `handleBranchError`, so every branch-scoped query and mutation error routes through the same dispatcher
- `shell.jsx` consumes `branchSwitcherForceOpen` with a consume-once effect: opens the branch popover, then resets the store flag, gated on `canOpenBranchPopover` so a single-branch tenant is never force-opened
- `useBranchSwitch`'s `mutationFn` now attaches `err.branchName = branch.name`, giving the interpolation the attempted branch identity for the switch-call path
- Three new i18n keys (`branch_err_revoked_title`, `branch_err_revoked_detail`, `branch_generic_fallback`) added to both `ro` and `en` blocks with 1:1 parity, using the exact `17-UI-SPEC.md` Copywriting Contract copy

## Task Commits

Each task was committed atomically (TDD RED→GREEN for Task 1):

1. **Task 1 (RED): failing tests for handleBranchError** — `a1c2d7d` (test)
2. **Task 1 (GREEN): wire central branch-403 recovery path** — `bb60f84` (feat)
3. **Task 2: consume branchSwitcherForceOpen in shell.jsx** — `940fe4b` (feat)

**Plan metadata:** committed as part of this SUMMARY commit.

## Files Created/Modified
- `src/use-branches.js` — exports `BRANCH_CODES` and `handleBranchError(err, queryClient)`; `useBranchSwitch`'s mutationFn now attaches `err.branchName`
- `src/main.jsx` — `QueryClient` constructed with `QueryCache`/`MutationCache` `onError` wired to `handleBranchError`
- `src/i18n.jsx` — added `branch_err_revoked_title`/`branch_err_revoked_detail`/`branch_generic_fallback` to both `ro` and `en` blocks
- `src/shell.jsx` — consume-once `useEffect` on `branchSwitcherForceOpen`, force-opens the popover and resets the flag
- `src/__tests__/use-branches.test.js` — RED tests for `handleBranchError` dispatch, guard, interpolation/fallback, and QueryCache wiring
- `src/__tests__/shell.test.jsx` — tests for the reopen-on-force-open, single-branch-tenant exclusion, and dismissibility

## Decisions Made
- `handleBranchError` is a plain module-scope function reading/writing via `useAppStore.getState()` (never a hook), mirroring `auth.jsx`'s `handleFocus`/`expireSession` convention, since it must be callable from `main.jsx`'s module scope
- Only `BRANCH_ACCESS_REVOKED` is fully wired this plan; `BRANCH_INACTIVE`/`NO_BRANCH_ACCESS` are guarded-but-unimplemented switch branches deferred to plan 17-03 — deliberate functionality gap, not an architectural one
- `branch_generic_fallback` copy chosen per UI-SPEC's backstop guidance ("this branch"/"această filială") for the no-identity-available case

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

A pre-existing, unrelated test failure was found on the full-suite run (`npx vitest run`): `src/__tests__/build-pipeline.test.js`'s `BILD-04 bundle.createUpdaterArtifacts is true` assertion, caused by an earlier commit (`f1d533d`) changing `tauri.conf.json`'s `bundle.createUpdaterArtifacts` to the string `"v1Compatible"` for macOS packaging without updating the test. Confirmed unrelated to this plan's files via `git show`; not fixed here per the scope-boundary rule. Logged to `.planning/phases/17-centralized-branch-access-error-handling/deferred-items.md`. Both target test files for this plan (`use-branches.test.js`, `shell.test.jsx`) pass 41/41; full suite is 584/585 with only this one pre-existing failure.

## TDD Gate Compliance

Task 1 (`tdd="true"`) gate sequence verified in git log:
- RED: `a1c2d7d test(17-01): add failing tests for handleBranchError central dispatch` — 7 new tests confirmed failing (`handleBranchError is not a function`) before implementation
- GREEN: `bb60f84 feat(17-01): wire central branch-403 recovery path (BRANCH_ACCESS_REVOKED)` — all 16 tests in `use-branches.test.js` pass
- REFACTOR: none needed — implementation required no cleanup

Gate sequence compliant: RED precedes GREEN, both present.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

The one-central-path architecture (D-05) is proven end-to-end for `BRANCH_ACCESS_REVOKED`: a synthetic 403 from an ordinary query routes through the global `onError` to `handleBranchError`, producing exactly one toast, a reopened dismissible switcher, and a `['branches']` refetch — with non-branch errors passing through untouched. Plan 17-02 and onward can now build `BRANCH_INACTIVE`, `NO_BRANCH_ACCESS`, the `fireSwitch` trim, the SSE `onopen` extension, and the focus-listener generalization on this proven spine without re-litigating the choke-point wiring.

No blockers. The pre-existing `build-pipeline.test.js` failure (documented above) is unrelated and does not block this phase's progress.

---
*Phase: 17-centralized-branch-access-error-handling*
*Completed: 2026-07-23*

## Self-Check: PASSED

- All 6 modified files confirmed present on disk (`src/use-branches.js`, `src/main.jsx`, `src/i18n.jsx`, `src/shell.jsx`, `src/__tests__/use-branches.test.js`, `src/__tests__/shell.test.jsx`)
- All 3 task commits confirmed in `git log` (`a1c2d7d`, `bb60f84`, `940fe4b`)
- All acceptance criteria re-run and passing: `BRANCH_CODES`/`handleBranchError` exports present, `QueryCache`/`MutationCache` wired in `main.jsx`, i18n key count = 2 (ro + en), `branchSwitcherForceOpen` read + reset present in `shell.jsx`
- Target test files green: `npx vitest run src/__tests__/use-branches.test.js src/__tests__/shell.test.jsx` → 41/41 passed
- Full suite: 584/585 passed — the 1 failure is pre-existing and unrelated (documented above and in `deferred-items.md`)
