---
phase: 07-history-screen-foundation
plan: 02
subsystem: ui
tags: [zustand, i18n, react, sidebar, routing]

# Dependency graph
requires:
  - phase: 07-history-screen-foundation
    provides: history-utils.js pure derivation layer (plan 07-01, same wave — no overlap)
provides:
  - 34 new i18n keys (nav_history + 33 h_*/status_* history keys) in both ro and en
  - Zustand historyOrder session state + openHistoryOrder(order) action
  - 'history' and 'history-detail' screen enum values (comment-documented; router lands in Plan 06)
  - History sidebar nav entry (cashier-only, 4th position after Kitchen)
  - screenTitles entries for 'history' and 'history-detail'
affects: [07-03-useHistoryOrders-hook, 07-04-HistoryScreen, 07-05-screen-detail-readOnly, 07-06-app-router]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "add-alongside for a second detail route (openHistoryOrder/history-detail) instead of generalizing openOrder — recorded in 07-02-PLAN.md's assumption_delta_decision"

key-files:
  created:
    - src/__tests__/shell.test.jsx
  modified:
    - src/i18n.jsx
    - src/store.js
    - src/__tests__/store.test.js
    - src/shell.jsx

key-decisions:
  - "add-alongside (not promote): openHistoryOrder()/'history-detail' ship as a parallel pair to openOrder()/'detail'; the live order path stays byte-identical per D-07/D-08 and the recorded assumption-delta rationale in 07-02-PLAN.md"
  - "History nav item is cashier-only — added to the non-kitchen arm of the navGroups ternary only, matching CONTEXT.md's discretion default and the design screenshot"

patterns-established:
  - "Session-only Zustand keys (historyOrder) are declared alongside their sibling (selectedOrder), get a comment noting the setter/consumer/persistence exclusion, and are omitted from partialize by omission rather than explicit filtering"

requirements-completed: [HIST-01]

coverage:
  - id: D1
    description: "34 new i18n keys (nav_history + 33 h_*/status_* keys) resolve as non-empty strings in both ro and en, with zero duplicate key declarations"
    requirement: "HIST-01"
    verification:
      - kind: unit
        ref: "src/__tests__/i18n.test.js — full suite (9 tests)"
        status: pass
      - kind: other
        ref: "grep-based duplicate/count checks from 07-02-PLAN.md acceptance criteria (nav_history, h_back_to_history, h_empty, h_orders_count_one, check_connection, all — all return exactly 2; no key appears more than twice)"
        status: pass
    human_judgment: false
  - id: D2
    description: "openHistoryOrder(order) sets historyOrder + screen: 'history-detail' atomically, leaves selectedOrder null; openOrder() is provably unchanged; setScreen resets both selectedOrder and historyOrder; historyOrder defaults to null and is excluded from partialize"
    requirement: "HIST-01"
    verification:
      - kind: unit
        ref: "src/__tests__/store.test.js — describe('HIST-01: openHistoryOrder / historyOrder / setScreen reset (D-07, D-08)') (6 tests)"
        status: pass
      - kind: other
        ref: "grep checks from 07-02-PLAN.md acceptance criteria confirming openOrder's line is byte-identical to the shipped version"
        status: pass
    human_judgment: false
  - id: D3
    description: "History nav item visible and clickable in the cashier sidebar (4th position, after Kitchen), absent for the kitchen role, active-highlighted on screen='history', and topbar shows the correct title for both 'history' and 'history-detail'"
    requirement: "HIST-01"
    verification:
      - kind: unit
        ref: "src/__tests__/shell.test.jsx — all 6 tests (render, click dispatch, kitchen-role absence, active state + topbar title, history-detail title with no active nav item, cashier group ordering)"
        status: pass
      - kind: other
        ref: "git diff src/icons.jsx — confirmed empty (icons.jsx untouched, existing 'history' icon reused)"
        status: pass
    human_judgment: false

duration: 3min
completed: 2026-07-17
status: complete
---

# Phase 07 Plan 02: i18n + Store + Sidebar Nav Foundation Summary

**34 history i18n keys, Zustand historyOrder/openHistoryOrder route state, and a cashier-only History sidebar entry — HIST-01 complete at the nav+store level, with openOrder's shipped behavior provably unchanged.**

## Performance

- **Duration:** 3 min
- **Started:** 2026-07-16T22:23:00Z
- **Completed:** 2026-07-16T22:25:27Z
- **Tasks:** 3
- **Files modified:** 4 (+1 created)

## Accomplishments
- Added all 34 UI-SPEC "New i18n Keys" to both `I18N.ro` and `I18N.en` in `src/i18n.jsx` — `nav_history` grouped with existing `nav_*` keys, the remaining 33 `h_*`/`status_*` keys under a new `// history (Phase 7)` section — with zero duplicate declarations and no re-declaration of reused keys (`all`, `delivery`, `check_connection`, etc.)
- Extended `src/store.js` with `historyOrder` (session-only, mirrors `selectedOrder`), `openHistoryOrder(order)` (sets `historyOrder` + `screen: 'history-detail'` atomically), and widened `setScreen` to reset both `selectedOrder` and `historyOrder` — `openOrder()`/`'detail'` left byte-identical per the plan's `add-alongside` decision
- Added a cashier-only History nav entry to `src/shell.jsx` (4th position, after Kitchen, reusing the existing `Icon name="history"`) plus `screenTitles` entries for `'history'` and `'history-detail'`; created `src/__tests__/shell.test.jsx` (first test file for this component) covering render, click dispatch, role-gating, active-state, and ordering

## Task Commits

Each task was committed atomically:

1. **Task 1: Add the 34 new i18n keys under both ro and en** - `908eb23` (feat)
2. **Task 2: Add the history screen enum values, historyOrder key, and openHistoryOrder action** - `38d80ec` (feat)
3. **Task 3: Add the History sidebar entry and screenTitles entries (HIST-01)** - `edf38e7` (feat)

**Plan metadata:** (this commit, see below)

## Files Created/Modified
- `src/i18n.jsx` - 34 new keys (`nav_history` + 33 `h_*`/`status_*`) added to both `ro` and `en`
- `src/store.js` - `historyOrder` session key, `openHistoryOrder(order)` action, `setScreen` reset extended to both detail keys, screen enum comment widened
- `src/__tests__/store.test.js` - new `describe` block with 6 tests covering `openHistoryOrder`, `openOrder` non-regression, `setScreen` reset, and partialize exclusion
- `src/shell.jsx` - History nav item in cashier `navGroups[0]` (4th, after Kitchen), `screenTitles.history` and `screenTitles['history-detail']`
- `src/__tests__/shell.test.jsx` - new file, 6 tests covering nav render/click, kitchen-role absence, active state, and cashier group ordering

## Decisions Made
- **add-alongside, not promote:** `openHistoryOrder()`/`'history-detail'` ship as a parallel pair to the shipped `openOrder()`/`'detail'`. This was a plan-level decision (see `07-02-PLAN.md`'s `<assumption_delta_decision>`), executed exactly as specified — the shipped mutation path for live orders is untouched, and the acceptance criteria's grep for `openOrder`'s exact line confirms byte-identity.
- **History nav item is cashier-only:** added only to the non-kitchen arm of the `navGroups` ternary, per CONTEXT.md's discretion default; `shell.test.jsx` asserts a kitchen-role render contains no History item (T-07-06 mitigation).
- **`historyOrder` excluded from `partialize` by omission**, mirroring the existing `selectedOrder` pattern — no explicit filter logic needed since `partialize` is an allowlist of 6 UI keys (T-07-07 mitigation).

## Deviations from Plan

None - plan executed exactly as written.

**Note on one acceptance-criteria check:** the plan's `sed -n '/partialize/,/}),/p' src/store.js | grep -c historyOrder` check (intended to confirm the persisted-keys allowlist excludes `historyOrder`) matches the `setScreen` line rather than the actual `partialize: (state) => ({...})` block, because `sed`'s range starts at the first line containing the substring `"partialize"` (a pre-existing comment on `soundMuted`, unrelated to my change) and ends at the first line ending in `"}),"` (the `setScreen` action itself). This quirk pre-dates this plan — running the identical command against `HEAD~3:src/store.js` shows the same false match. The actual `partialize` block (verified directly, line 85-92) correctly omits `historyOrder`, and the dedicated unit test (`store.test.js` — "historyOrder is NOT included in the partialize output") proves this via `useAppStore.persist.getOptions().partialize()`. Not a bug in this plan's code; flagging for visibility only.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- `historyOrder`, `openHistoryOrder`, and the `'history'`/`'history-detail'` screen values are available for Plan 03 (`useHistoryOrders` hook) and Plan 05 (`screen-detail` readOnly mode) to consume.
- The History nav item dispatches `setScreen('history')` but `app.jsx` has no router branch for it yet — that lands in Plan 06 (Wave 4), alongside the `'history-detail'` blank-render backstop noted in the threat model (T-07-05).
- All 34 i18n keys are now available to every remaining Phase 7 plan; no plan should need to touch `src/i18n.jsx` again this phase, removing the contention risk the plan's objective called out.
- Full test suite: 228 tests, 225 passing, 3 pre-existing failures unrelated to this plan (`build-pipeline.test.js` BILD-04 assertion, `offline-buttons.test.jsx` ×2 QueryClientProvider issue) — logged in `.planning/phases/07-history-screen-foundation/deferred-items.md`, not touched here per prior-wave-context instructions.

---
*Phase: 07-history-screen-foundation*
*Completed: 2026-07-17*

## Self-Check: PASSED

All 5 modified/created files confirmed present on disk; all 3 task commits (908eb23, 38d80ec, edf38e7) confirmed in git log.
