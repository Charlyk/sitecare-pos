---
phase: 11-reprint-csv-export
plan: 04
subsystem: ui
tags: [react, tauri, plugin-dialog, plugin-fs, csv, export, zustand]

# Dependency graph
requires:
  - phase: 11-reprint-csv-export
    provides: "plugin-dialog/plugin-fs (11-01), buildCsv + h_export_* i18n keys (11-02)"
provides:
  - "Working Export CSV button on the History screen (HIST-12)"
  - "handleExportCsv: build->save->write flow with cancel/error/empty/success handling"
affects: [history-screen, phase-12-if-any]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "save()-then-writeTextFile() native export flow with explicit `if (!path) return` cancel guard before the write (cancel is a silent no-op, never an error toast)"
    - "Store-connected screen component: HistoryScreen now imports useAppStore directly (pushToast selector) rather than receiving it via prop-drilling from app.jsx"

key-files:
  created: []
  modified:
    - src/screen-history.jsx
    - src/__tests__/screen-history.test.jsx

key-decisions:
  - "Tasks 1 and 2 landed in a single feat commit — Task 1's own acceptance criteria require click-driven tests, which only work once Task 2's button wiring (onClick/disabled/title) exists; splitting them would have produced an intermediate commit with a broken/contradictory test suite (same precedent as Phase 08-04)."
  - "Default export filename's end date is the range's INCLUSIVE last day (range.to minus one day), not a raw slice of the EXCLUSIVE range.to ISO instant — a new rangeToFilenameDates() helper mirrors formatDateRange's own exclusive-to-inclusive-end conversion so the filename never advertises tomorrow's date."
  - "Export button's disabled/dimmed/tooltip state is now fully data-driven (visible.length === 0), replacing Phase 10's permanently-inert flag — 2 pre-existing tests that asserted the old always-disabled Export button were updated to assert the new data-driven behavior."

patterns-established:
  - "handleExportCsv: buildCsv(visible) -> save({defaultPath, filters}) -> if(!path) return -> writeTextFile(path, csv) -> pushToast(success), with a single try/catch pushing an error toast on any save()/writeTextFile() throw"

requirements-completed: [HIST-12]

coverage:
  - id: D1
    description: "Export button serializes the visible filtered/searched/period-scoped order set via buildCsv, opens a native Save dialog, and writes the file on confirm"
    requirement: "HIST-12"
    verification:
      - kind: unit
        ref: "src/__tests__/screen-history.test.jsx#Export CSV — HIST-12 (11-04) > happy path: click -> save() resolves a path -> writeTextFile(path, buildCsv(visible)) -> toast_saved success toast with pluralized detail"
        status: pass
      - kind: unit
        ref: "src/__tests__/screen-history.test.jsx#Export CSV — HIST-12 (11-04) > happy path pluralization: 2 visible orders push a \"2 comenzi\" success detail"
        status: pass
    human_judgment: false
  - id: D2
    description: "A cancelled native Save dialog (save() resolving null/undefined) is a silent no-op — no toast, no writeTextFile call"
    requirement: "HIST-12"
    verification:
      - kind: unit
        ref: "src/__tests__/screen-history.test.jsx#Export CSV — HIST-12 (11-04) > cancel: save() resolving null is a silent no-op — writeTextFile is never called and no toast is pushed"
        status: pass
      - kind: unit
        ref: "src/__tests__/screen-history.test.jsx#Export CSV — HIST-12 (11-04) > cancel: save() resolving undefined behaves identically to null (silent no-op)"
        status: pass
    human_judgment: false
  - id: D3
    description: "A save() or writeTextFile() throw shows the h_export_error_title error toast with String(err) detail, never mis-routed from a cancel"
    requirement: "HIST-12"
    verification:
      - kind: unit
        ref: "src/__tests__/screen-history.test.jsx#Export CSV — HIST-12 (11-04) > error: a thrown writeTextFile (after a real save() path) pushes an h_export_error_title error toast with String(err) detail"
        status: pass
      - kind: unit
        ref: "src/__tests__/screen-history.test.jsx#Export CSV — HIST-12 (11-04) > error: a thrown save() pushes the same error toast and writeTextFile is never called"
        status: pass
    human_judgment: false
  - id: D4
    description: "Export button is disabled + dimmed + h_export_empty_tooltip-titled when visible.length === 0, and enabled/full-opacity/untitled otherwise"
    requirement: "HIST-12"
    verification:
      - kind: unit
        ref: "src/__tests__/screen-history.test.jsx#Export CSV — HIST-12 (11-04) > empty visible set: Export is disabled, dimmed (opacity 0.5/pointerEvents none/cursor not-allowed), carries the h_export_empty_tooltip title"
        status: pass
      - kind: unit
        ref: "src/__tests__/screen-history.test.jsx#Export CSV — HIST-12 (11-04) > non-empty visible set: Export is enabled, full-opacity, and carries no title"
        status: pass
    human_judgment: false
  - id: D5
    description: "Default export filename is orders_<from>_<to>.csv derived from the active period's inclusive from/to dates (D-14)"
    requirement: "HIST-12"
    verification:
      - kind: unit
        ref: "src/__tests__/screen-history.test.jsx#Export CSV — HIST-12 (11-04) > filename: save() is called with defaultPath orders_<from>_<to>.csv for the active range and a CSV filter"
        status: pass
    human_judgment: false
  - id: D6
    description: "Manual: exported CSV opens correctly in Excel with correct rows/headers/escaping and Romanian diacritics render via the UTF-8 BOM, on a real Tauri runtime with the capability grants from 11-01"
    verification: []
    human_judgment: true
    rationale: "Requires opening a real spreadsheet application against a file written by the actual Tauri save()/writeTextFile() plugins and a running `npm run tauri dev` session — cannot be exercised from a mocked vitest unit test (VALIDATION Manual-Only, per plan's <verification> section)."

# Metrics
duration: ~15min
completed: 2026-07-18
status: complete
---

# Phase 11 Plan 04: Activate Export CSV button Summary

**Wired handleExportCsv (buildCsv -> native save() dialog -> writeTextFile()) to the History screen's Export CSV button, with data-driven disabled/tooltip state replacing Phase 10's permanently-inert placeholder.**

## Performance

- **Duration:** ~15 min
- **Completed:** 2026-07-18T21:08:04Z
- **Tasks:** 2 (landed as 1 commit — see Deviations)
- **Files modified:** 2

## Accomplishments
- `handleExportCsv` builds the CSV from the currently visible (filtered/searched/period-scoped) order set via `buildCsv` (11-02), opens a native Save dialog via `save()` (11-01) with a `orders_<from>_<to>.csv` default filename, and writes with `writeTextFile()`.
- Cancel (`save()` resolves `null`/`undefined`) is an explicit silent no-op — `writeTextFile` is never called and no toast is pushed.
- Any `save()`/`writeTextFile()` throw pushes an `h_export_error_title` error toast with `String(err)` detail.
- Success pushes a `toast_saved` toast with a pluralized `h_orders_count_one`/`h_orders_count_other` detail (e.g. "1 comandă" / "2 comenzi").
- The Export button is now enabled/disabled purely by `visible.length === 0`: disabled + dimmed (opacity 0.5/pointerEvents none/cursor not-allowed) + `h_export_empty_tooltip` title when empty; enabled/full-opacity/untitled and clickable otherwise.
- No in-app spinner or pending state — the CSV builds synchronously; only the native `save()` dialog is async.

## Task Commits

Tasks 1 and 2 landed together in a single commit — see Deviations for why.

1. **Task 1 + Task 2: handleExportCsv wiring + Export button activation** - `2d2b2b0` (feat)

**Plan metadata:** _(this commit)_

## Files Created/Modified
- `src/screen-history.jsx` - Added `handleExportCsv`, `rangeToFilenameDates` helper, `pushToast` store selector, and activated the Export button (disabled/title/onClick driven by `visible`)
- `src/__tests__/screen-history.test.jsx` - Added `@tauri-apps/plugin-dialog`/`@tauri-apps/plugin-fs`/`../store.js` mocks and a new "Export CSV — HIST-12 (11-04)" describe block (happy path, pluralization, cancel x2, error x2, filename shape, empty/enabled states, no-spinner); updated 2 pre-existing tests that asserted the old Phase-10 permanently-inert Export button

## Decisions Made
- `rangeToFilenameDates(range)`: the filename's end date is `range.to` minus one day (the range's INCLUSIVE last calendar day), never a raw slice of the EXCLUSIVE `range.to` ISO instant — mirrors `formatDateRange`'s own exclusive-to-inclusive-end conversion in `history-utils.js`, so the filename never advertises tomorrow's date.
- `pushToastMock` in the test file is defined via `vi.hoisted()` so a single stable mock reference survives every `HistoryScreen` render across a test, rather than a fresh `vi.fn()` per render (which the print-receipt.test.jsx convention's inline `selector({ ..., pushToast: vi.fn() })` pattern would have produced, making assertions unreachable).
- Export's "unready feature" opacity styling (Phase 10's permanent `opacity: 0.5`) is now fully superseded by data-driven dimming — the button is only dimmed when `visible.length === 0`, matching the project's greyed-out-not-hidden convention for a feature that IS ready but has nothing to act on.

## Deviations from Plan

### Auto-fixed Issues

**1. [Task-split pragmatics, not a formal deviation rule] Tasks 1 and 2 committed together**
- **Found during:** Planning the commit sequence after both tasks' code was written and tests were green
- **Issue:** Task 1's own acceptance criteria (`npx vitest run` with click-driven happy/cancel/error/filename tests) require the Export button's `onClick={handleExportCsv}` wiring to exist to be testable at all — but the plan attributes that `onClick` wiring to Task 2. Splitting into two literal per-task commits would have required an intermediate commit where Task 1's own tests fail (button not yet clickable) or an artificial temporary hardcoded-enabled button that a later commit would immediately supersede.
- **Fix:** Implemented and committed both tasks' code together as one `feat(11-04)` commit, with the commit message explicitly documenting both task scopes and the reason for combining them.
- **Files modified:** `src/screen-history.jsx`, `src/__tests__/screen-history.test.jsx`
- **Committed in:** `2d2b2b0`

**2. [Rule 1 - Bug] Updated 2 pre-existing tests asserting the Phase-10 permanently-inert Export button**
- **Found during:** Running the full test suite after implementing Task 2's data-driven `disabled={visible.length === 0}`
- **Issue:** `screen-history.test.jsx` had 2 tests from Phase 10 that asserted the Export button was `disabled: true` even with non-empty visible order data (`data: [order]`), and one that asserted a hardcoded `opacity: '0.5'` during a period-switch loading state — both encoded the OLD "Export permanently inert" behavior this plan intentionally supersedes per its own objective (HIST-12).
- **Fix:** Updated both tests to assert the new data-driven behavior: Export is enabled with non-empty `visible` data regardless of loading state, and disabled only when `visible.length === 0`.
- **Files modified:** `src/__tests__/screen-history.test.jsx`
- **Verification:** `npx vitest run src/__tests__/screen-history.test.jsx` — 84/84 pass
- **Committed in:** `2d2b2b0`

---

**Total deviations:** 2 (1 commit-sequencing pragmatic call, 1 Rule-1 test update)
**Impact on plan:** No scope creep — both were necessary to land a coherent, fully-green implementation of the plan's stated objective. No production behavior beyond the plan's `<behavior>`/`<action>` spec was added.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required. Task's `<verification>` section notes a Manual-Only VALIDATION item (opening the exported CSV in Excel against a real `npm run tauri dev` session) — tracked as coverage item D6 above, not part of this plan's automated scope.

## Next Phase Readiness
- Phase 11 (Reprint + CSV Export, HIST-11/HIST-12) is now fully implemented across all 4 plans (11-01 through 11-04): plugin install, `buildCsv` serializer + i18n, reprint wiring in the read-only detail view, and this plan's Export CSV button activation.
- No blockers. The one open manual-verification item (CSV opens correctly in Excel with Romanian diacritics via the BOM, on a real Tauri build) should be exercised during phase verification/UAT before Phase 11 is marked fully complete.

---
*Phase: 11-reprint-csv-export*
*Completed: 2026-07-18*

## Self-Check: PASSED

- FOUND: src/screen-history.jsx
- FOUND: src/__tests__/screen-history.test.jsx
- FOUND: .planning/phases/11-reprint-csv-export/11-04-SUMMARY.md
- FOUND commit: 2d2b2b0
