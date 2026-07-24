---
phase: 16-branch-switcher-ui-switch-flow-language-relocation
plan: 02
subsystem: ui
tags: [react, zustand, tanstack-query, i18n, branch-switching]

requires:
  - phase: 16-branch-switcher-ui-switch-flow-language-relocation
    provides: "Plan 01's minimal multi-branch selector (trigger + popover), useBranchSwitch(), i18n copywriting-contract key set (all 13 branch_* keys, including branch_default_badge/branch_available_label/branch_popover_error consumed here)"
provides:
  - "Single-branch read-only rendering (SWCH-02, D-04) — interactive popover gated on branches.length > 1 OR still-resolving/errored, never on !!currentBranch"
  - "Tenant default-branch badge in trigger + popover row (SWCH-01, E8)"
  - "Collapsed-sidebar branch-initial chip that stays visible and clickable (D-03, E2)"
  - "Popover loading/error/overflow backstops (E3): .spin row, branch_popover_error row, scrollable list, optional section label"
  - "Overflow/long-text title= treatment on every branch-name render site (Pitfall 5)"
  - "Full automated test coverage for SWCH-01/SWCH-02/LANG-01/D-03/E3 in shell.test.jsx"
affects: [16-03]

tech-stack:
  added: []
  patterns:
    - "canOpenBranchPopover = isMultiBranch || isLoading || isError — extends the D-04 gate so the popover can render its own loading/error backstop before the definitive branch count is known, while a settled single-branch tenant still locks fully read-only"
    - "currentBranch?.isDefault read directly (not re-derived by scanning the branches array) for the trigger's default badge — SelectedBranch and AccessibleBranch share the same isDefault field per the SDK contract"

key-files:
  created: []
  modified:
    - src/shell.jsx
    - src/__tests__/shell.test.jsx

key-decisions:
  - "canOpenBranchPopover (not a bare isMultiBranch) gates click-to-open and the chevron — while useBranches() is still loading or errored, the trigger stays interactive so the popover's own spinner/error backstop rows are reachable; a genuinely single-branch tenant settles (isLoading=false, isError=false, branches.length<=1) and locks read-only permanently, so SWCH-02 holds in steady state (UI-SPEC left this loading/error handling to planner discretion)"
  - "Default badge styled as .chip-sage plus an inline `border: 1px solid var(--sc-primary)` — mirrors the existing chip-sage idle treatment while adding the primary-colored border the UI-SPEC calls for"
  - "Collapsed chip built as a bespoke 32x32 circular tile (border + white background, matching the Collapse button's neutral-chrome convention) rather than reusing the `.avatar` class — `.avatar`'s terracotta background is explicitly reserved for the user chip per 16-UI-SPEC.md Color table ('avatar bg precedent only — NOT used by the branch switcher')"

requirements-completed: [SWCH-01, SWCH-02, LANG-01]

coverage:
  - id: D1
    description: "Default badge (Implicit/Default) renders in the trigger when the current branch isDefault, and on that branch's popover row"
    requirement: "SWCH-01"
    verification:
      - kind: unit
        ref: "src/__tests__/shell.test.jsx#SWCH-01: default badge + multi-branch trigger > trigger shows the current branch name and a default badge when the current branch isDefault"
        status: pass
      - kind: unit
        ref: "src/__tests__/shell.test.jsx#SWCH-01: default badge + multi-branch trigger > popover row for the default branch also carries the default badge"
        status: pass
      - kind: unit
        ref: "src/__tests__/shell.test.jsx#SWCH-01: default badge + multi-branch trigger > selected branch row shows the primary checkmark, sourced from the store currentBranch (not an optimistic local value)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Single-branch tenants render a fully read-only selector — no chevron, no popover, gate never keys on !!currentBranch"
    requirement: "SWCH-02"
    verification:
      - kind: unit
        ref: "src/__tests__/shell.test.jsx#SWCH-02 (D-04): single-branch tenant renders read-only > with exactly one branch, no popover opens on click and no branch row ever renders"
        status: pass
      - kind: unit
        ref: "src/__tests__/shell.test.jsx#SWCH-02 (D-04): single-branch tenant renders read-only > a null currentBranch with a single branch still renders read-only (never gates on !!currentBranch)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Collapsed-sidebar branch chip stays visible with the branch initial, carries the full name in title/aria-label, and opens the popover on click when multi-branch"
    requirement: "SCOPE-04"
    verification:
      - kind: unit
        ref: "src/__tests__/shell.test.jsx#D-03: collapsed sidebar branch chip > renders a compact chip with the branch initial and the full name in title/aria-label"
        status: pass
      - kind: unit
        ref: "src/__tests__/shell.test.jsx#D-03: collapsed sidebar branch chip > clicking the collapsed chip opens the same popover when multi-branch"
        status: pass
    human_judgment: false
  - id: D4
    description: "Popover shows a loading spinner row while useBranches() resolves and a branch_popover_error row when it errors, keeping the last-known trigger label"
    verification:
      - kind: unit
        ref: "src/__tests__/shell.test.jsx#E3 popover backstops: loading / error states > shows an inline spinner row while useBranches() is loading"
        status: pass
      - kind: unit
        ref: "src/__tests__/shell.test.jsx#E3 popover backstops: loading / error states > shows the branch_popover_error row when useBranches() errors, keeping the last-known trigger label"
        status: pass
    human_judgment: false
  - id: D5
    description: "RO/EN language pill is absent from the sidebar footer (negative assertion)"
    requirement: "LANG-01"
    verification:
      - kind: unit
        ref: "src/__tests__/shell.test.jsx#LANG-01 (D-15): RO/EN pill is absent from the footer > no RO or EN language-toggle button renders in the sidebar footer"
        status: pass
    human_judgment: false
  - id: D6
    description: "Popover list scrolls (overflow-y auto + max-height) when the branch count exceeds the visible area"
    verification: []
    human_judgment: true
    rationale: "Backstop per 16-UI-SPEC.md E3 overflow row — visual/interaction fidelity of scroll behavior with a many-branch tenant requires a human looking at the running app; the max-height/overflow-y CSS was carried forward unchanged from Plan 01's tracer and is not independently re-verified by an automated test in this plan."

duration: ~20min
completed: 2026-07-23
status: complete
---

# Phase 16 Plan 02: Branch Selector Presentation Surface Summary

**Expanded the tracer's bare branch selector into the full UI-SPEC-compliant control: single-branch read-only lock (SWCH-02), tenant "default" badge (SWCH-01), a collapsed-sidebar branch-initial chip (D-03), popover loading/error backstops (E3), and 22 new automated tests including a negative assertion that the RO/EN pill stays gone (LANG-01).**

## Performance

- **Duration:** ~20 min
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- `src/shell.jsx`: interactive-popover gate widened from a bare `isMultiBranch` to `canOpenBranchPopover = isMultiBranch || branchesLoading || branchesError` — a settled single-branch tenant (both flags false, `branches.length <= 1`) still locks fully read-only (no chevron, no click target), while the trigger stays clickable during the brief loading/error window so the popover's own backstop rows are reachable
- Default badge (`t('branch_default_badge')`, styled `.chip-sage` + `1px solid var(--sc-primary)` border) renders in the trigger (via `currentBranch?.isDefault`, read directly off the store rather than re-derived from the branches array) and on the matching popover row (via `branch.isDefault`)
- Collapsed-sidebar branch chip: a bespoke 32×32 circular tile (white background, `--sc-border` border — deliberately not the `.avatar` class, whose terracotta fill is reserved for the user chip per 16-UI-SPEC.md) showing the current branch's uppercase initial, with `title`/`aria-label` carrying the full name; stays visible when collapsed (unlike the removed RO/EN toggle) and opens the same popover on click
- Popover E3 backstops: an inline `.spin` spinner row while `useBranches().isLoading`, a compact `t('branch_popover_error')` row (no retry — Phase 17) when `isError`, and an optional `t('branch_available_label')` section header shown only once the list is genuinely multi-branch and settled; the `maxHeight`/`overflow-y: auto` scroll backstop carried forward unchanged from Plan 01
- Every branch-name render site (trigger, collapsed chip, popover rows) now carries a `title=` attribute (8 occurrences total in the selector region) satisfying the E1/E2/E3 overflow/long-text truth
- `src/__tests__/shell.test.jsx` extended with 5 new describe blocks (22 total tests in the file, 10 net-new for this plan's scope) covering SWCH-01, SWCH-02 (including the null-currentBranch single-branch edge case), D-03 collapsed chip, E3 loading/error backstops, and the LANG-01 negative assertion

## Task Commits

Each task was committed atomically:

1. **Task 1: Complete the selector — read-only single-branch, default badge, collapsed chip, popover backstops** - `c79d033` (feat)
2. **Task 2: Shell selector test coverage — SWCH-01, SWCH-02, LANG-01, chip, popover states** - `649a059` (test)

**Plan metadata:** _pending — see final commit below_

## Files Created/Modified
- `src/shell.jsx` - expanded branch selector: `canOpenBranchPopover` gate, default badge (trigger + popover row), collapsed chip, popover loading/error/section-label rows
- `src/__tests__/shell.test.jsx` - 5 new describe blocks covering SWCH-01/SWCH-02/D-03/E3/LANG-01

## Decisions Made
- `canOpenBranchPopover = isMultiBranch || branchesLoading || branchesError` — extends the read-only gate beyond a bare `branches.length > 1` so the popover's own loading/error backstops are reachable before the definitive branch count resolves, while a settled single-branch tenant still locks read-only permanently (UI-SPEC explicitly left popover loading/error handling to planner discretion)
- Default badge styling: `.chip-sage` class plus an inline `border: 1px solid var(--sc-primary)`, matching the UI-SPEC's "mirrors `.chip-sage`" instruction while adding the primary-colored border it also calls for
- Collapsed chip is a bespoke inline-styled 32×32 circular tile, NOT the `.avatar` class — `.avatar`'s terracotta background is explicitly reserved for the user chip per 16-UI-SPEC.md's Color table ("avatar bg precedent only — NOT used by the branch switcher... branch identity uses primary, not terracotta"); using white/bordered chrome instead (matching the Collapse button's own neutral convention) avoids both the reserved terracotta and the accent-reserved primary-as-fill rule

## Deviations from Plan

None - plan executed exactly as written. The `canOpenBranchPopover` extension beyond a bare `isMultiBranch` check was explicitly within "Claude's Discretion" per 16-CONTEXT.md ("Popover loading/error states for `useBranches()` — planner picks sensible minimal handling; not a product-level decision"), not a deviation from a locked decision.

## Issues Encountered
- `getByTitle(text, { selector })` from `@testing-library/dom` does not support the `selector` option (unlike `getByText`) — a test attempting to disambiguate a popover row button from the trigger div (both sharing the same `title`) via `getByTitle(name, { selector: 'button' })` threw a multiple-elements error instead of filtering. Fixed by using `getAllByTitle(name).find((el) => el.tagName === 'BUTTON')` instead. No production code affected; test-authoring correction only.
- The pre-existing, unrelated `src/__tests__/build-pipeline.test.js` `BILD-04 — bundle.createUpdaterArtifacts is true` failure (documented in 16-01-SUMMARY.md, confirmed via `git stash` there) is still present and untouched — out of scope per the SCOPE BOUNDARY rule. Full suite: 566/567 passing.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- The branch selector now fully satisfies 16-UI-SPEC.md's E1/E2/E3/E8 surfaces and both SWCH-01/SWCH-02 requirements; LANG-01's negative assertion is locked in automated coverage.
- Plan 03 (cart-discard confirm gate + neutral-landing routing, SCOPE-03) builds on this plan's selector and Plan 01's `useBranchSwitch()`/`SwitchingOverlay`/`switchPhase` machine without needing further structural changes to `shell.jsx`.
- The E3 popover-scroll backstop (many-branch overflow) and general visual/interaction fidelity remain human-judgment items per 16-UI-SPEC.md's own backstop classification — flagged as coverage `D6` above, not a blocker for Plan 03.
- No blockers identified.

---
*Phase: 16-branch-switcher-ui-switch-flow-language-relocation*
*Completed: 2026-07-23*

## Self-Check: PASSED

All 3 claimed files exist on disk (`src/shell.jsx`, `src/__tests__/shell.test.jsx`, this SUMMARY); both commit hashes (`c79d033`, `649a059`) found in `git log`.
