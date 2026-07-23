---
phase: 16-branch-switcher-ui-switch-flow-language-relocation
plan: 01
subsystem: ui
tags: [react, zustand, tanstack-query, sse, i18n, branch-switching]

requires:
  - phase: 13-branch-state-launch-seeding-foundation
    provides: currentBranch/setCurrentBranch in store.js, useBranches() list query, session-only never-persisted branch state
  - phase: 14-branch-scoped-cache-re-scoping
    provides: branch-keyed query cache keys that react automatically to currentBranch?.id
  - phase: 15-sse-branch-aware-reconnect
    provides: useSSE's branch-aware reconnect — isConnected drops to false then recovers to true whenever currentBranch?.id changes
provides:
  - useBranchSwitch() non-optimistic mutation (src/use-branches.js)
  - branchSwitcherForceOpen session-only store field + setter (deferred seam for Phase 17)
  - Full bilingual i18n copywriting-contract key set for the switcher/overlay/toasts/cart-discard (owned entirely by this plan)
  - Minimal multi-branch selector (trigger pill + upward popover) in shell.jsx, replacing the deleted RO/EN toggle
  - switchPhase state machine + SwitchingOverlay in app.jsx bridging the mutation with the SSE reconnect
affects: [17-centralized-branch-access-error-handling, 16-02, 16-03]

tech-stack:
  added: []
  patterns:
    - "Non-optimistic mutation: setCurrentBranch only inside useBranchSwitch's onSuccess, mirroring use-order-actions.js's no-onMutate shape"
    - "Overlay-as-sibling-of-Shell for full-screen blocking (SCOPE-04), matching AcceptDialog/CancelDialog's DOM-coverage technique"
    - "switchPhase state machine (idle/pending/bridging/done) bridging a mutation's resolution with an independent async signal (SSE isConnected), self-terminating one-shot release effect"
    - "i18n prefix-only keys (branch_overlay_heading_prefix, branch_switch_success_prefix) with JSX-level concatenation of the branch name — this codebase's i18n has no interpolation"

key-files:
  created:
    - src/__tests__/app-branch-switch.test.jsx
  modified:
    - src/use-branches.js
    - src/store.js
    - src/i18n.jsx
    - src/shell.jsx
    - src/app.jsx
    - src/__tests__/use-branches.test.js
    - src/__tests__/shell.test.jsx

key-decisions:
  - "setCurrentBranch is called ONLY inside useBranchSwitch's own onSuccess, never adjacent to .mutate() and never optimistically (D-05) — proven by a dedicated unit test that asserts the store is untouched at .mutate() time"
  - "branchSwitcherForceOpen added with zero call sites setting it true this phase (D-12) — Phase 17 is the first consumer"
  - "SwitchingOverlay renders at zIndex 250 (above AcceptDialog/CancelDialog's 200) as a sibling of Shell so it can never be obscured mid-switch"
  - "Bounded bridging timeout set to 6000ms (within the CONTEXT-specified 5-8s range)"
  - "This tracer's handleSelectBranch calls fireSwitch(branch) directly with no cart-emptiness gate — the D-13 confirm dialog is explicitly deferred to Plan 03"
  - "Deviation (Rule 3): src/__tests__/shell.test.jsx now mocks use-branches.js since Shell calls useBranches() directly and needs a QueryClient context that pre-existing suite didn't provide"

patterns-established:
  - "Pattern: mutate-level test mocking — mock the hook to return { mutate: vi.fn() } and capture the call-site { onSuccess, onError } options in tests, driving them directly with act() to simulate async resolution without a real network layer"
  - "Pattern: forceRerender helper (re-invoking RTL's rerender with the same root element) to force a fully-mocked non-React-state hook (useSSE) to be re-read on each simulated state transition, when waitFor cannot be used because fake timers are active"

requirements-completed: [SWCH-01, SWCH-03, SWCH-04, SCOPE-04, LANG-01]

coverage:
  - id: D1
    description: "Selecting a branch in the sidebar popover fires client.me.branches.switch({ body: { branchId } }) exactly once, non-optimistically"
    requirement: "SWCH-03"
    verification:
      - kind: unit
        ref: "src/__tests__/use-branches.test.js#useBranchSwitch — non-optimistic branch switch (SWCH-03) > calling .mutate(branch) invokes client.me.branches.switch with { body: { branchId } }"
        status: pass
      - kind: unit
        ref: "src/__tests__/use-branches.test.js#useBranchSwitch — non-optimistic branch switch (SWCH-03) > setCurrentBranch is NOT called synchronously at .mutate() time — only after success resolves (D-05)"
        status: pass
      - kind: integration
        ref: "src/__tests__/app-branch-switch.test.jsx#selecting a branch shows the pending overlay and calls the mutation exactly once"
        status: pass
    human_judgment: false
  - id: D2
    description: "A global overlay blocks all interaction for the full pending+bridging window and releases into a success toast only after SSE reconnects (or a bounded 6s timeout)"
    requirement: "SCOPE-04"
    verification:
      - kind: integration
        ref: "src/__tests__/app-branch-switch.test.jsx#an isConnected false→true transition while bridging releases the overlay and fires the success toast exactly once (D-08/D-10)"
        status: pass
      - kind: integration
        ref: "src/__tests__/app-branch-switch.test.jsx#bounded timeout (D-09): if isConnected never recovers, the overlay releases anyway and the success toast still fires"
        status: pass
    human_judgment: false
  - id: D3
    description: "A rejected switch (4xx) fires a single generic error toast, releases the overlay, and leaves currentBranch on the old branch"
    requirement: "SWCH-04"
    verification:
      - kind: unit
        ref: "src/__tests__/use-branches.test.js#useBranchSwitch — non-optimistic branch switch (SWCH-03) > on a mocked { error } result, the mutation rejects and setCurrentBranch is never called (D-11/SC3)"
        status: pass
      - kind: integration
        ref: "src/__tests__/app-branch-switch.test.jsx#a rejected switch releases the overlay immediately and shows the generic failure toast (D-11/D-12/SC3)"
        status: pass
    human_judgment: false
  - id: D4
    description: "The RO/EN language pill is removed from the sidebar footer; the branch selector occupies that exact slot; single-branch tenants see a read-only trigger"
    requirement: "LANG-01"
    verification:
      - kind: unit
        ref: "src/__tests__/shell.test.jsx (full suite — no regression after RO/EN removal + branch trigger addition)"
        status: pass
    human_judgment: false
  - id: D5
    description: "Visual/interaction fidelity of the popover, overlay copy layout, truncation/title-attribute overflow handling, and collapsed-sidebar branch identity match the approved 16-UI-SPEC.md"
    verification: []
    human_judgment: true
    rationale: "Pixel-level visual review (spacing, color tokens, truncation ellipsis rendering, popover positioning) requires a human looking at the running app; automated DOM assertions in this plan cover structural/behavioral correctness only, not visual fidelity."

duration: ~50min (includes one tracer-feedback checkpoint pause)
completed: 2026-07-23
status: complete
---

# Phase 16 Plan 01: End-to-End Branch Switch Tracer + Language Relocation Summary

**`useBranchSwitch()` non-optimistic mutation wired end-to-end through a minimal multi-branch popover, a global blocking overlay bridging the SSE reconnect, and a release-gated success toast — plus deletion of the RO/EN footer toggle (LANG-01).**

## Performance

- **Duration:** ~50 min (includes a tracer-feedback checkpoint pause for coordinator approval)
- **Tasks:** 2
- **Files modified:** 7 (5 source, 2 test — 1 new test file)

## Accomplishments
- `useBranchSwitch()` added to `src/use-branches.js`: non-optimistic TanStack mutation over `client.me.branches.switch`, sets `currentBranch` ONLY in its own `onSuccess` (D-05), leaves `useBranches()`'s `enabled: !!client` gate untouched (Pitfall 2)
- `branchSwitcherForceOpen` session-only field + setter added to `store.js`, excluded from `partialize`, zero call sites setting it true this phase (D-12) — the seam Phase 17 will consume
- 13 new bilingual i18n keys added to `i18n.jsx` covering the full switcher/overlay/toast/cart-discard copywriting contract — this plan owns ALL new keys so no Wave-2 plan touches `i18n.jsx`
- `shell.jsx`: RO/EN pill deleted (LANG-01); a branch trigger pill + upward-opening popover (mirroring the user-chip-menu pattern exactly) now occupies the vacated slot, gated on `branches.length > 1` (D-04), with a checkmark on the currently-selected branch read live from the store
- `app.jsx`: `switchPhase` state machine (`idle → pending → bridging → done`), `SwitchingOverlay` rendered as a sibling of `<Shell>` at `zIndex: 250` (covers all screens for SCOPE-04), a bridging watcher effect observing `useSSE`'s guaranteed `isConnected` drop+recover (D-08), a bounded 6000ms timeout safety valve (D-09), a success toast firing only on overlay release (D-10), and a generic failure toast + immediate revert on error (D-11/D-12)
- `src/__tests__/app-branch-switch.test.jsx` (new): 5 tests proving the whole vertical — pending overlay + single mutate call, bridging sub-line with no premature toast, reconnect-driven release + toast, bounded-timeout release + toast, and error-path revert
- `src/__tests__/use-branches.test.js` extended with a `useBranchSwitch` describe block: SDK call-shape assertion, the non-optimistic ordering proof (store untouched until success resolves), and the error-path proof (store never touched)

## Task Commits

Each task was committed atomically:

1. **Task 1: End-to-end branch switch — one path, wired through every layer (tracer)** - `4b1a412` (feat)
2. **Task 2: useBranchSwitch unit coverage — non-optimistic + SDK contract (SWCH-03)** - `b86519c` (test)

**Plan metadata:** _pending — see final commit below_

## Files Created/Modified
- `src/use-branches.js` - added `useBranchSwitch()` mutation alongside the existing `useBranches()` query
- `src/store.js` - added `branchSwitcherForceOpen` field + `setBranchSwitcherForceOpen` setter (session-only)
- `src/i18n.jsx` - added 13 new bilingual keys for the branch-switcher copywriting contract
- `src/shell.jsx` - removed the RO/EN pill; added the branch trigger + popover; added `onSelectBranch` prop
- `src/app.jsx` - added the switch orchestration (`fireSwitch`, `handleSelectBranch`, bridging watcher, release effect) and the `SwitchingOverlay` component
- `src/__tests__/app-branch-switch.test.jsx` - new: end-to-end orchestration tests
- `src/__tests__/use-branches.test.js` - extended: `useBranchSwitch` unit coverage

## Decisions Made
- `setCurrentBranch` lives inside `useBranchSwitch()`'s own `onSuccess` (not a call-site `onSuccess` in `app.jsx`) — keeps D-05's "never optimistic" guarantee co-located and auditable in one file; `app.jsx`'s call-site `onSuccess` only drives the `switchPhase` transition, sidestepping any dependency on TanStack Query's hook-level vs. call-site `onSuccess` composition semantics (RESEARCH Open Question 1, resolved by this design choice)
- Bounded bridging timeout: 6000ms, within the CONTEXT-specified 5-8s range (D-09)
- `SwitchingOverlay` zIndex 250 (above `AcceptDialog`/`CancelDialog`'s 200) so it can never be visually obscured if a dialog happens to still be mounted
- This tracer's `handleSelectBranch` fires the switch immediately with no cart-emptiness gate — D-13's confirm dialog is explicitly Plan 03's scope, matching the plan's own artifact-deferral note

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Mocked `use-branches.js` in the pre-existing `shell.test.jsx`**
- **Found during:** Task 1 (Shell footer surgery)
- **Issue:** `shell.jsx` now calls `useBranches()` directly (per the plan's own Pattern 4 design), which internally calls TanStack Query's `useQuery`/`useQueryClient`. The pre-existing `src/__tests__/shell.test.jsx` (Phase 7/13) renders `<Shell>` with no `QueryClientProvider` wrapper, so every test in that file started throwing `"No QueryClient set, use QueryClientProvider to set one"`.
- **Fix:** Added `vi.mock('../use-branches.js', () => ({ useBranches: vi.fn(() => ({ data: [] })) }))` to the top of `shell.test.jsx`, matching the exact mocking approach 16-RESEARCH.md's own Wave-0 gap note anticipated for the eventual dedicated `shell.test.jsx` branch-switcher coverage (Plan 02), applied here minimally just to unblock the pre-existing suite.
- **Files modified:** `src/__tests__/shell.test.jsx`
- **Verification:** All 12 pre-existing tests in that file pass again; `npx vitest run` shows no other regressions (556/557, the 1 failure pre-existing and unrelated — see Issues Encountered)
- **Committed in:** `4b1a412` (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Necessary to keep the Phase 7/13 regression suite green after Shell's new direct `useBranches()` call. No scope creep — the fix is a one-line mock addition, not new test coverage (that's Plan 02's job).

## Issues Encountered
- `src/__tests__/build-pipeline.test.js`'s `BILD-04 — bundle.createUpdaterArtifacts is true` test fails both before and after this plan's changes (confirmed via `git stash`) — a pre-existing, unrelated failure in `tauri.conf.json`'s updater config (`v1Compatible` vs. expected `true`). Out of scope per the SCOPE BOUNDARY rule; not touched.
- Mixing `vi.useFakeTimers()` with `@testing-library/react`'s `waitFor` caused two tests to hang until the real 5000ms test timeout, because `waitFor`'s internal polling is itself faked and never advances without a manual `vi.advanceTimersByTime()` call. Fixed by replacing `waitFor` with direct synchronous assertions after `await act(async () => { ... })` blocks that fully flush the relevant state transition (no test-authoring guidance was violated; this was corrected during this plan's own test-writing, not a deviation from the PLAN.md text).
- A separate, unrelated staging-endpoint swap was present in the working tree during this plan's execution (uncommitted changes to `vite.config.js`, `src/use-sse.js`, `src/auth.jsx`, `src-tauri/tauri.conf.json`, `src/__tests__/foundation.test.js`). Per the coordinator's explicit instruction, these were left untouched and never staged — only the files this plan's tasks modify were added via targeted `git add <file>` calls, never `git add -A`/`git add .`.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- The whole v1.2 vertical (selector → non-optimistic switch → automatic cache/SSE re-scoping → overlay bridge → toast) is proven end-to-end on the happy path and the error path.
- Plan 02 (selector polish: single-branch read-only styling, "default" badge, collapsed-sidebar chip, popover loading/error states) and Plan 03 (cart-discard confirm gate + neutral-landing routing, SCOPE-03) both build on this tracer's `useBranchSwitch()`, `SwitchingOverlay`, and `switchPhase` machine without needing to touch them structurally.
- All 13 i18n keys needed by Plans 02/03 (badge, popover-error, cart-discard copy) are already present in `i18n.jsx` — neither downstream plan needs to edit that file.
- No blockers identified.

---
*Phase: 16-branch-switcher-ui-switch-flow-language-relocation*
*Completed: 2026-07-23*

## Self-Check: PASSED

All 9 claimed files exist on disk; both commit hashes (`4b1a412`, `b86519c`) found in `git log`.
