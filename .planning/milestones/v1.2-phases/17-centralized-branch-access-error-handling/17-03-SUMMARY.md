---
phase: 17-centralized-branch-access-error-handling
plan: 03
subsystem: error-handling
tags: [tanstack-query, zustand, i18n, react, tdd]

# Dependency graph
requires:
  - phase: 17-centralized-branch-access-error-handling (plan 01)
    provides: BRANCH_CODES allowlist, handleBranchError(err, queryClient) central dispatcher, BRANCH_ACCESS_REVOKED wired
  - phase: 17-centralized-branch-access-error-handling (plan 02)
    provides: BRANCH_CODES matcher locked (provisional, flagged risk — see WINDOWS.md #1)
provides:
  - "handleBranchError complete for all three BRANCH_CODES — BRANCH_INACTIVE and BRANCH_ACCESS_REVOKED share recovery (toast + reopen + refetch) via a per-code copy map; NO_BRANCH_ACCESS sets a new noBranchAccess flag with no toast/reopen"
  - "noBranchAccess session-only store flag + setNoBranchAccess setter, excluded from partialize — the gating seam for 17-04's block UI"
  - "fireSwitch's onError trimmed with the BRANCH_CODES guard — a branch-code switch failure produces exactly one toast (D-05), never doubled with handleBranchError's"
affects: [17-04, 17-05, 17-06]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Per-code copy map (RECOVERABLE_CODE_COPY) factoring shared recovery behavior across codes that differ only in i18n copy — write the behavior once, branch only on the title/detail key pair"
    - "Cache-level + mutation-level onError composition guard: the call-site (mutation) onError conditionally suppresses its own generic toast when the central dispatcher (cache-level onError) will already handle the same error code, preventing double-surfacing"

key-files:
  created: []
  modified:
    - src/store.js
    - src/use-branches.js
    - src/app.jsx
    - src/i18n.jsx
    - src/__tests__/store.test.js
    - src/__tests__/use-branches.test.js
    - src/__tests__/app-branch-switch.test.jsx

key-decisions:
  - "RECOVERABLE_CODE_COPY map (titleKey/detailKey per code) factors BRANCH_ACCESS_REVOKED and BRANCH_INACTIVE's identical recovery behavior through one code path, rather than duplicating the toast+reopen+invalidate block per case in the switch"
  - "noBranchAccess mirrors branchSwitcherForceOpen field-for-field (session-only block placement, sibling setter, simple omission from partialize) rather than inventing a new state-management convention"
  - "app-branch-switch.test.jsx's mocked use-branches.js module now also exports BRANCH_CODES (literal array matching the real export) so app.jsx's new import resolves in the test harness without pulling in the real module's other dependencies"

patterns-established:
  - "Pattern: when two error codes share 100% of recovery behavior and differ only in copy, factor the copy through a small key-pair map indexed by code, not a duplicated switch-case body"

requirements-completed: [BERR-01, BERR-02]

coverage:
  - id: D1
    description: "handleBranchError handles all three BRANCH_CODES: BRANCH_INACTIVE and BRANCH_ACCESS_REVOKED share recovery (toast + setBranchSwitcherForceOpen(true) + invalidate ['branches']) with distinct per-code copy; NO_BRANCH_ACCESS calls setNoBranchAccess(true) and fires no toast/reopen"
    requirement: "BERR-01"
    verification:
      - kind: unit
        ref: "src/__tests__/use-branches.test.js#BRANCH_INACTIVE pushes exactly one toast with the DISTINCT inactive title (not the revoked title), sets branchSwitcherForceOpen true, and invalidates [\"branches\"]"
        status: pass
      - kind: unit
        ref: "src/__tests__/use-branches.test.js#NO_BRANCH_ACCESS calls setNoBranchAccess(true), pushes NO toast, and does NOT set branchSwitcherForceOpen"
        status: pass
      - kind: unit
        ref: "src/__tests__/use-branches.test.js#BRANCH_INACTIVE and BRANCH_ACCESS_REVOKED both reach the same reopen+refetch behavior but with different copy"
        status: pass
      - kind: unit
        ref: "src/__tests__/use-branches.test.js#BRANCH_INACTIVE interpolates <branch> the same way as BRANCH_ACCESS_REVOKED (err.branchName -> currentBranch?.name -> generic fallback)"
        status: pass
    human_judgment: false
  - id: D2
    description: "noBranchAccess is a session-only store flag (default false) with setNoBranchAccess, excluded from store.js partialize's allowlist (never persisted)"
    requirement: "BERR-01"
    verification:
      - kind: unit
        ref: "src/__tests__/store.test.js#store default noBranchAccess value is false"
        status: pass
      - kind: unit
        ref: "src/__tests__/store.test.js#setNoBranchAccess(true) sets noBranchAccess to true"
        status: pass
      - kind: unit
        ref: "src/__tests__/store.test.js#noBranchAccess is NOT included in the partialize output (session-only, never persisted)"
        status: pass
    human_judgment: false
  - id: D3
    description: "fireSwitch's onError guards its generic toast behind !BRANCH_CODES.includes(err?.code), so a branch-code switch failure produces exactly one toast total (no double-toast, D-05); a non-branch failure still fires the generic toast"
    requirement: "BERR-02"
    verification:
      - kind: unit
        ref: "src/__tests__/app-branch-switch.test.jsx#a branch-code rejection (BRANCH_ACCESS_REVOKED) does NOT fire the generic branch_switch_error toast — the per-code toast is handleBranchError's job alone"
        status: pass
      - kind: unit
        ref: "src/__tests__/app-branch-switch.test.jsx#composed with handleBranchError firing separately (as MutationCache.onError would in production), a branch-code rejection produces EXACTLY ONE toast total, not two"
        status: pass
      - kind: unit
        ref: "src/__tests__/app-branch-switch.test.jsx#a rejection with a non-branch code (e.g. a validation error string) still fires the generic branch_switch_error toast"
        status: pass
    human_judgment: false
  - id: D4
    description: "fireSwitch's switchPhase/pendingBranch cleanup runs UNCONDITIONALLY regardless of err.code; a rejected switch never mutates currentBranch, so the app stays visibly stable on the previous branch"
    requirement: "BERR-02"
    verification:
      - kind: unit
        ref: "src/__tests__/app-branch-switch.test.jsx#switchPhase/pendingBranch cleanup runs unconditionally for a branch-code rejection too (BERR-02) — overlay released, app stable on the previous branch"
        status: pass
    human_judgment: false
  - id: D5
    description: "i18n: branch_err_inactive_title/detail and branch_no_access_title/body/retry/retry_busy added to both ro and en with 1:1 parity, per the UI-SPEC Copywriting Contract"
    requirement: "BERR-01"
    verification:
      - kind: other
        ref: "grep -c \"branch_err_inactive_title\\|branch_no_access_title\" src/i18n.jsx == 4"
        status: pass
    human_judgment: false
  - id: D6
    description: "D-05's concurrent-error backstop truth — a burst of simultaneously-inflight branch-scoped 403s converges to a single visible recovery, not a stack of N — is NOT automated-verified this plan; handleBranchError has no de-dup guard, so each concurrently-rejecting query independently pushes its own toast"
    verification: []
    human_judgment: true
    rationale: "17-UI-SPEC.md marks this row (E2-toast zero-one-many) as 🧪 backstop, not an automated-test deliverable, and no task in this plan's scope (Task 1/Task 2) implements a dedup mechanism. Flagged as WINDOWS.md ledger entry #2 (kind=unrun-verify) for a future plan or human multi-tab test to resolve."

duration: ~6min
completed: 2026-07-23
status: complete
---

# Phase 17 Plan 03: Complete Three-Code Branch Recovery + No-Double-Toast Summary

**`handleBranchError` now dispatches all three `BRANCH_CODES` (INACTIVE/REVOKED share copy-differentiated recovery via a `RECOVERABLE_CODE_COPY` map, `NO_BRANCH_ACCESS` sets a new `noBranchAccess` session flag), and `fireSwitch`'s own `onError` is trimmed with a `BRANCH_CODES` guard so a branch-code switch failure never doubles up with the central dispatcher's toast.**

## Performance

- **Duration:** ~6 min
- **Started:** 2026-07-23T21:07:00Z (approx, per STATE.md session timestamp)
- **Completed:** 2026-07-23T21:13:17Z
- **Tasks:** 2 (both TDD, RED→GREEN, no REFACTOR needed)
- **Files modified:** 7

## Accomplishments
- `handleBranchError` is complete for all three `BRANCH_CODES`: `BRANCH_ACCESS_REVOKED` and `BRANCH_INACTIVE` share identical recovery (toast + `setBranchSwitcherForceOpen(true)` + `invalidateQueries(['branches'])`) factored through a new `RECOVERABLE_CODE_COPY` per-code title/detail key map; `NO_BRANCH_ACCESS` instead calls the new `setNoBranchAccess(true)` and returns with no toast or reopen
- `store.js` gained `noBranchAccess: false` (session-only, mirrors `branchSwitcherForceOpen` field-for-field) + `setNoBranchAccess` setter, correctly omitted from `partialize`'s six-key allowlist — never persisted
- `app.jsx`'s `fireSwitch` `onError` now imports `BRANCH_CODES` and wraps only its generic `branch_switch_error` toast behind `!BRANCH_CODES.includes(err?.code)`; the `switchPhase`/`pendingBranch` cleanup (return to idle, clear pending branch, clear bridge timeout) stays unconditional so a rejected switch — branch-code or not — always visibly returns the app to a stable state on the previous branch (closes the D-05 double-toast gap, satisfies BERR-02)
- `i18n.jsx` gained `branch_err_inactive_title`/`branch_err_inactive_detail` and `branch_no_access_title`/`branch_no_access_body`/`branch_no_access_retry`/`branch_no_access_retry_busy` in both `ro` and `en` blocks, exact copy from `17-UI-SPEC.md`'s Copywriting Contract, with 1:1 key parity — these are the keys `17-04`'s block UI will consume
- All target tests green: `npx vitest run src/__tests__/store.test.js src/__tests__/use-branches.test.js src/__tests__/app-branch-switch.test.jsx` → 71/71 passed
- Full suite: 597/598 passed — the 1 failure is the pre-existing, unrelated `build-pipeline.test.js` `BILD-04` assertion (flagged in `deferred-items.md` since 17-01)

## Task Commits

Each task followed TDD RED→GREEN (no REFACTOR needed — implementation was clean on first pass):

1. **Task 1 (RED): failing tests for noBranchAccess flag and full handleBranchError coverage** — `7303a5c` (test)
2. **Task 1 (GREEN): add noBranchAccess store flag and complete handleBranchError for all three codes** — `c8c2a87` (feat)
3. **Task 2 (RED): failing tests for D-05 no-double-toast fireSwitch trim** — `df98a0f` (test)
4. **Task 2 (GREEN): trim fireSwitch onError to prevent D-05 double toast** — `a9e5c37` (feat)

**Plan metadata:** committed as part of this SUMMARY commit.

## Files Created/Modified
- `src/store.js` — added `noBranchAccess: false` session-only field beside `branchSwitcherForceOpen`, `setNoBranchAccess` setter beside `setBranchSwitcherForceOpen`, `partialize` left untouched (omission is the exclusion)
- `src/use-branches.js` — `handleBranchError` extended with a `RECOVERABLE_CODE_COPY` map and a `NO_BRANCH_ACCESS` early-return branch (via `setNoBranchAccess`); the two recoverable codes now flow through one shared code path
- `src/app.jsx` — imports `BRANCH_CODES`; `fireSwitch`'s `onError` receives `err` and guards its generic toast behind the `BRANCH_CODES` check while keeping cleanup unconditional
- `src/i18n.jsx` — added the four new key pairs (`branch_err_inactive_*`, `branch_no_access_*`) to both `ro` and `en` blocks
- `src/__tests__/store.test.js` — RED tests for `noBranchAccess` default/setter/partialize-exclusion
- `src/__tests__/use-branches.test.js` — RED tests for `BRANCH_INACTIVE` distinct copy, `NO_BRANCH_ACCESS` flag path, and the shared-behavior/distinct-copy cross-check
- `src/__tests__/app-branch-switch.test.jsx` — RED tests for the no-double-toast guard, the still-fires-for-non-branch-codes case, and unconditional cleanup; mocked `use-branches.js` now also exports `BRANCH_CODES`

## Decisions Made
- **`RECOVERABLE_CODE_COPY` map, not a duplicated switch-case body.** `BRANCH_ACCESS_REVOKED` and `BRANCH_INACTIVE` share 100% of recovery behavior and differ only in which i18n keys they read — factoring that through a `{ titleKey, detailKey }` map keeps the shared logic (branch-name resolution, toast push, reopen, invalidate) written exactly once.
- **`noBranchAccess` mirrors `branchSwitcherForceOpen` exactly** — same session-only block placement, same setter naming convention, same "omission from partialize is the exclusion" mechanism — no new state-management pattern introduced for this one flag.
- **The `app-branch-switch.test.jsx` mock for `use-branches.js` gained a literal `BRANCH_CODES` export** matching the real module's three-code array, so `app.jsx`'s new import resolves without pulling the mocked file's other real dependencies (auth, TanStack Query) into that test's already-isolated mock boundary.
- **The D-05 "exactly one toast" composition is tested at two levels, not one integration test.** `use-branches.test.js` proves `handleBranchError` alone produces exactly one toast per code; `app-branch-switch.test.jsx` proves `fireSwitch`'s own `onError` produces ZERO toasts for a branch code (so it cannot double up) and STILL produces the generic toast for a non-branch code. A third test explicitly composes both call sites (manually pushing the toast `handleBranchError` would have pushed via `MutationCache.onError` in production, then firing `fireSwitch`'s own `onError` for the same code) to prove the total stays at one — full `MutationCache` wiring is out of this test file's harness (it uses a bare `QueryClient`, matching Phase 16's existing tracer-suite convention), so this composition is proven by construction rather than a single end-to-end assertion.

## Deviations from Plan

None — plan executed exactly as written. `RECOVERABLE_CODE_COPY` (the per-code copy map named in the plan's own action text) was the exact shape implemented.

## Issues Encountered

None new. The pre-existing `build-pipeline.test.js` `BILD-04` failure (unrelated to this plan's files, documented in 17-01-SUMMARY.md and `deferred-items.md`) persists unchanged and was not re-investigated — out of scope for this plan's files.

## TDD Gate Compliance

Both tasks (`tdd="true"`) gate sequences verified in git log:

**Task 1:**
- RED: `7303a5c test(17-03): add failing tests for noBranchAccess flag and full handleBranchError coverage` — 7 new tests confirmed failing before implementation (`toHaveLength(1)` got 0, `noBranchAccess` undefined, `branchSwitcherForceOpen` stayed false for `BRANCH_INACTIVE`)
- GREEN: `c8c2a87 feat(17-03): add noBranchAccess store flag and complete handleBranchError for all three BRANCH_CODES` — all 54 tests in `store.test.js` + `use-branches.test.js` pass
- REFACTOR: none needed

**Task 2:**
- RED: `df98a0f test(17-03): add failing tests for D-05 no-double-toast fireSwitch trim` — 2 new tests confirmed failing (`Nu s-a putut schimba filiala` present when it should have been absent; toast count 2 instead of 1) before the guard existed
- GREEN: `a9e5c37 feat(17-03): trim fireSwitch onError to prevent D-05 double toast` — all 17 tests in `app-branch-switch.test.jsx` pass (71/71 across the three target files)
- REFACTOR: none needed

Gate sequence compliant: RED precedes GREEN for both tasks, both present, no drift.

## Known Stubs

**D-05's concurrent-error backstop (burst-of-simultaneous-403s convergence) is not automated-verified.**
- **File:** `src/use-branches.js` (`handleBranchError`)
- **Reason:** `17-UI-SPEC.md`'s edge-coverage table marks this exact row (E2-toast, zero-one-many) as 🧪 backstop — deliberately deferred to human/manual verification, not an automated-test deliverable this plan. `handleBranchError` has no de-dup guard: if N branch-scoped queries reject with a `BRANCH_*` code in the same tick (or close together), each independently calls `pushToast`, producing N stacked toasts rather than the single converged recovery the `must_haves.truths` statement describes.
- **What proves this is a stub, not a bug:** this plan's two tasks (add the third-code branches, trim `fireSwitch`) did not include a dedup task — the plan's own `<verification>` section lists only the three target test files plus a full-suite regression check, no burst-concurrency test. Implementing dedup was out of scope for `17-03`.
- **Follow-up:** recorded in `.planning/WINDOWS.md` (entry #2, kind=`unrun-verify`) — a future plan must either add a dedup guard (e.g. a short-lived in-flight-recovery flag) to `handleBranchError`, or a human must confirm via manual multi-tab/concurrent-query testing that the current stacked-toast behavior is acceptable as shipped.

## Broken-Windows Ledger

Appended to `.planning/WINDOWS.md`:
- **Entry #2** — kind=`unrun-verify`, phase=17, file=`src/use-branches.js` — "D-05 concurrent-error backstop not automated-verified: handleBranchError has no de-dup guard for a burst of simultaneously-rejecting branch-scoped queries. Follow-up: add dedup guard or confirm acceptable via manual concurrent testing." (Entry #1 from 17-02, the provisional `BRANCH_CODES` matcher, remains open and unrelated to this plan's work.)

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

`handleBranchError` is now complete and correct for all three `BRANCH_CODES` on the proven 17-01 architecture, and the D-05 double-toast composition hazard between cache-level and mutation-level `onError` is closed for the switch-call path. `noBranchAccess` is wired as a session-only flag ready for `17-04` to consume in the `NO_BRANCH_ACCESS` block UI (top-level gate, Retry button, block copy — all i18n keys already shipped this plan). `17-05`'s SSE `onopen` 403 extension and `17-06`'s focus-listener generalization both build on this same `handleBranchError`/`BRANCH_CODES` foundation without needing further central-dispatcher changes.

No blockers. Two items remain open in `.planning/WINDOWS.md` for future resolution (neither blocks continued plan execution): entry #1 (provisional `BRANCH_CODES` matcher, from 17-02) and entry #2 (concurrent-error backstop, this plan) — both flagged, not silently dropped.

---
*Phase: 17-centralized-branch-access-error-handling*
*Completed: 2026-07-23*

## Self-Check: PASSED

- All 7 modified files confirmed present on disk (`src/store.js`, `src/use-branches.js`, `src/app.jsx`, `src/i18n.jsx`, `src/__tests__/store.test.js`, `src/__tests__/use-branches.test.js`, `src/__tests__/app-branch-switch.test.jsx`)
- All 4 task commits confirmed in `git log` (`7303a5c`, `c8c2a87`, `df98a0f`, `a9e5c37`)
- All acceptance criteria re-run and passing:
  - `store.test.js` asserts `noBranchAccess` default false, `setNoBranchAccess` flips it, excluded from partialize — PASS
  - `use-branches.test.js` asserts all three codes dispatch correctly (INACTIVE distinct copy + reopen + refetch; NO_BRANCH_ACCESS sets the flag with no toast/reopen) — PASS
  - `grep -c "branch_err_inactive_title\|branch_no_access_title" src/i18n.jsx` == 4 (2 keys × 2 languages) — PASS
  - `grep -A8 "partialize:" src/store.js` shows no `noBranchAccess` line — PASS
  - `app-branch-switch.test.jsx` proves exactly one toast for a branch-code switch failure and a generic toast for a non-branch failure — PASS
  - `switchPhase`/`pendingBranch` cleanup asserted to run for both branch and non-branch failures — PASS
  - `grep -n "BRANCH_CODES.includes" src/app.jsx` shows the guard around the generic toast only — PASS
- Target test files green: `npx vitest run src/__tests__/store.test.js src/__tests__/use-branches.test.js src/__tests__/app-branch-switch.test.jsx` → 71/71 passed
- Full suite: `npx vitest run` → 597/598 passed — the 1 failure is pre-existing and unrelated (documented above and in `deferred-items.md`)
