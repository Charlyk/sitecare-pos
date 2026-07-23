---
phase: 17-centralized-branch-access-error-handling
plan: 04
subsystem: error-handling
tags: [react, zustand, i18n, ui]

# Dependency graph
requires:
  - phase: 17-centralized-branch-access-error-handling (plan 03)
    provides: "noBranchAccess session-only store flag + setNoBranchAccess setter, i18n branch_no_access_* keys"
provides:
  - "NoBranchAccessBlock component — the full-screen, box-less NO_BRANCH_ACCESS terminal-state surface"
  - "app.jsx's third top-level gate (noBranchAccess) superseding <Shell> entirely, sibling to coldStartBusy/!isAuthenticated"
  - "Non-optimistic Retry handler: clears noBranchAccess + adopts the branch ONLY on a confirmed non-null getMe().selectedBranch"
affects: [17-05, 17-06]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Third top-level route gate, added in the exact position/style of the existing coldStartBusy/!isAuthenticated early returns — a session-only store flag deciding whether <Shell> renders at all, not a child-level conditional"
    - "Non-optimistic recovery: the block clears only after an explicit server round-trip (getMe()) confirms a non-null selectedBranch; a null result or thrown error is a silent no-op (fail-safe, never a wrongful unblock)"

key-files:
  created:
    - src/no-branch-access.jsx
  modified:
    - src/app.jsx
    - src/__tests__/app-branch-error.test.jsx

key-decisions:
  - "NoBranchAccessBlock is box-less and full-viewport on var(--sc-background) — deliberately NOT a card over a scrim like SwitchingOverlay/CancelDialog — because it is a persistent full-page state, not a transient modal (17-UI-SPEC.md D-01 layout rationale)"
  - "The Retry spinner icon uses color: var(--sc-primary) exactly as 17-UI-SPEC.md's Color section specifies (accent reserved for the button fill AND the spinner color) — implemented verbatim per the approved design contract even though the icon renders inside a same-colored .btn-primary fill; flagged as a visual nuance for the E1-retry loading backstop check, not deviated from"
  - "onRetry destructures client from useAuth() (previously unused in app.jsx) rather than introducing a new prop or context value — client.auth.getMe() is the same throwing-contract call already used by auth.jsx's seedFromMe/handleFocus"

requirements-completed: [BERR-03]

coverage:
  - id: D1
    description: "NoBranchAccessBlock renders box-less centered content (muted alert icon, 20px/800 headline, 13px/500 body, single .btn-primary Retry) on full-viewport var(--sc-background), using only existing design tokens (no hardcoded colors, no new CSS)"
    requirement: "BERR-03"
    verification:
      - kind: other
        ref: "grep -n \"export function NoBranchAccessBlock\" src/no-branch-access.jsx"
        status: pass
      - kind: other
        ref: "grep -nE \"#[0-9a-fA-F]{3,6}\" src/no-branch-access.jsx (expect no match)"
        status: pass
      - kind: unit
        ref: "src/__tests__/app-branch-error.test.jsx#noBranchAccess=true renders the block and Shell/screen router is unreachable"
        status: pass
    human_judgment: false
  - id: D2
    description: "app.jsx gates on noBranchAccess as a third top-level early return (after !isAuthenticated, before <Shell>) — the sidebar/nav/screen router is structurally unreachable while the block is up; noBranchAccess=false leaves the normal Shell path unchanged"
    requirement: "BERR-03"
    verification:
      - kind: unit
        ref: "src/__tests__/app-branch-error.test.jsx#noBranchAccess=false renders the normal Shell path (no block)"
        status: pass
      - kind: unit
        ref: "src/__tests__/app-branch-error.test.jsx#noBranchAccess=true renders the block and Shell/screen router is unreachable"
        status: pass
      - kind: other
        ref: "grep -n \"if (noBranchAccess)\" src/app.jsx (gate placed before the Shell return)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Retry calls client.auth.getMe() and clears noBranchAccess + adopts the branch via setCurrentBranch ONLY when the returned selectedBranch is non-null — never optimistic on click"
    requirement: "BERR-03"
    verification:
      - kind: unit
        ref: "src/__tests__/app-branch-error.test.jsx#Retry with a getMe() returning a non-null selectedBranch clears noBranchAccess and adopts the branch"
        status: pass
    human_judgment: false
  - id: D4
    description: "A null selectedBranch or a thrown getMe() error leaves the block up unchanged, fires no extra toast, and returns the Retry button to its idle enabled state"
    requirement: "BERR-03"
    verification:
      - kind: unit
        ref: "src/__tests__/app-branch-error.test.jsx#Retry with a getMe() returning a null selectedBranch keeps the block up and pushes no toast"
        status: pass
      - kind: unit
        ref: "src/__tests__/app-branch-error.test.jsx#Retry whose getMe() throws keeps the block up and returns the button to idle"
        status: pass
    human_judgment: false
  - id: D5
    description: "Clicking Retry disables the button and swaps its label to the in-flight spinner + busy copy (Icon name=\"refresh\" className=\"spin\") while getMe() is pending, resolving to either clearing the block or re-rendering it unchanged"
    requirement: "BERR-03"
    verification:
      - kind: unit
        ref: "src/__tests__/app-branch-error.test.jsx#clicking Retry disables the button and swaps the label to the in-flight copy while the getMe() call is pending"
        status: pass
    human_judgment: true
    rationale: "17-UI-SPEC.md marks E1-retry loading as a 🧪 backstop row — the spinner/label swap's visual correctness (including the color: var(--sc-primary) icon-on-primary-fill nuance noted in key-decisions) still needs a human look, even though the state-transition logic itself is unit-tested and passing."
  - id: D6
    description: "A single-branch tenant with valid access never sees the block — noBranchAccess defaults false and the block only mounts when the flag is explicitly set true by handleBranchError's NO_BRANCH_ACCESS branch (17-03), never by this plan's code"
    requirement: "BERR-03"
    verification:
      - kind: unit
        ref: "src/__tests__/app-branch-error.test.jsx#noBranchAccess=false renders the normal Shell path (no block)"
        status: pass
    human_judgment: false

duration: ~10min
completed: 2026-07-24
status: complete
---

# Phase 17 Plan 04: NO_BRANCH_ACCESS Full-Screen Block + Non-Optimistic Retry Summary

**A box-less, full-viewport `NoBranchAccessBlock` now supersedes `<Shell>` entirely as app.jsx's third top-level gate whenever the session-only `noBranchAccess` flag is true, with a Retry button that clears the flag only on a server-confirmed non-null `selectedBranch`, never optimistically.**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-07-23T21:10:00Z (approx)
- **Completed:** 2026-07-23T21:19:46Z
- **Tasks:** 2
- **Files modified:** 3 (1 created, 2 modified)

## Accomplishments
- `src/no-branch-access.jsx` created: `NoBranchAccessBlock({ lang, onRetry, retrying })` renders a full-viewport, box-less block on `var(--sc-background)` — muted `alert` icon, 20px/800 headline (`branch_no_access_title`), 13px/500 guidance line (`branch_no_access_body`), and a single `.btn-primary` Retry button. The in-flight state disables the button and swaps to the spinner (`Icon name="refresh" className="spin"`) + busy copy (`branch_no_access_retry_busy`)
- `app.jsx` gained a third top-level early return — `if (noBranchAccess) return <NoBranchAccessBlock ... />` — placed after the `!isAuthenticated` gate and before the `<Shell>` return, exactly mirroring the `coldStartBusy`/`LoginScreen` precedent. This makes `<Shell>` (and therefore every screen/nav element) structurally unreachable while the block is up
- The Retry `onRetry` handler: sets a local `noBranchRetrying` state, calls `client.auth.getMe()` (destructured newly from `useAuth()`), and clears `noBranchAccess` + adopts the branch via `setCurrentBranch(me.selectedBranch)` ONLY when `selectedBranch` is truthy; a null `selectedBranch` or a thrown error (network drop) leaves the block up unchanged with no additional toast — always resetting `noBranchRetrying` to false in a `finally`
- `src/__tests__/app-branch-error.test.jsx` (new, 6 tests): gate presence/absence, Shell unreachability, all three Retry outcomes (success/null/throw), and the in-flight spinner-swap state — all passing

## Task Commits

Each task was committed atomically:

1. **Task 1: Build the NoBranchAccessBlock component** - `8785b1d` (feat)
2. **Task 2: Gate the block at the top level of app.jsx and wire non-optimistic Retry** - `23d9656` (feat)

**Plan metadata:** committed as part of this SUMMARY commit.

## Files Created/Modified
- `src/no-branch-access.jsx` — new: `NoBranchAccessBlock` component, box-less full-viewport block with icon + headline + body + Retry button, existing tokens only
- `src/app.jsx` — imports `NoBranchAccessBlock`; adds `noBranchAccess`/`setNoBranchAccess`/`setCurrentBranch` store selectors, a local `noBranchRetrying` state, destructures `client` from `useAuth()`, and adds the top-level gate + non-optimistic `onRetry` handler
- `src/__tests__/app-branch-error.test.jsx` — new: 6 tests covering the gate, Shell unreachability, Retry success/null/throw outcomes, and the in-flight button state

## Decisions Made
- **Box-less full-viewport layout, not a card over a scrim.** Mirrors `EmptyBlock`'s minimal centered-text convention (layout approach only, not its 15px type scale) rather than `SwitchingOverlay`/`CancelDialog`'s bordered white-card-on-scrim treatment — this is a persistent full-page state, not a transient modal (D-01).
- **Retry spinner icon color follows 17-UI-SPEC.md verbatim (`var(--sc-primary)`)**, even though it renders inside the same-colored `.btn-primary` fill. The design contract's Color section explicitly reserves the accent color for both the button fill and the spinner — implemented exactly as specified rather than second-guessing the token choice; flagged in coverage (D5) as a human-judgment item since the visual outcome of an icon-on-matching-background is worth a real look.
- **`client` destructured newly from `useAuth()`** in `app.jsx` (previously unused there) rather than adding a new prop/context path — `client.auth.getMe()` reuses the identical throwing-contract call already established by `auth.jsx`'s `seedFromMe`/`handleFocus`.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None. The pre-existing, unrelated `build-pipeline.test.js` `BILD-04` failure (documented since 17-01, `deferred-items.md`) persists unchanged — 603/604 tests pass, the 1 failure is out of scope for this plan's files.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

The `NO_BRANCH_ACCESS` block is fully wired end-to-end: `handleBranchError` (17-03) sets `noBranchAccess`, this plan renders and recovers from it. `17-05`'s SSE `onopen` 403 extension and `17-06`'s focus-listener generalization both call the same `handleBranchError` dispatcher, so a 403 arriving via either channel will now correctly surface this block with no additional wiring needed here. No blockers.

---
*Phase: 17-centralized-branch-access-error-handling*
*Completed: 2026-07-24*

## Self-Check: PASSED

- Both created/modified files confirmed present on disk (`src/no-branch-access.jsx`, `src/app.jsx`, `src/__tests__/app-branch-error.test.jsx`)
- Both task commits confirmed in `git log` (`8785b1d`, `23d9656`)
- All acceptance criteria re-run and passing:
  - `grep -n "export function NoBranchAccessBlock" src/no-branch-access.jsx` — match found
  - `grep -nE "#[0-9a-fA-F]{3,6}" src/no-branch-access.jsx` — no hardcoded hex colors
  - `grep -n "if (noBranchAccess)" src/app.jsx` — gate present before the Shell return
  - `npx vitest run src/__tests__/app-branch-error.test.jsx` — 6/6 passed
- Full suite: `npx vitest run` → 603/604 passed — the 1 failure is pre-existing and unrelated (`build-pipeline.test.js` BILD-04, documented above)
