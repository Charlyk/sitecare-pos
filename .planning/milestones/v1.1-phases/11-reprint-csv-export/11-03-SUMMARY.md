---
phase: 11-reprint-csv-export
plan: 03
subsystem: ui
tags: [react, tauri, plugin-store, thermal-printing, order-detail]

# Dependency graph
requires:
  - phase: 11-reprint-csv-export
    provides: "11-01 (plugin-dialog/plugin-fs installed), 11-02 (print_configure_hint + h_export_* i18n keys added to i18n.jsx)"
  - phase: 08-read-only-order-detail-view
    provides: "screen-detail.jsx readOnly prop, the live !readOnly print row this plan mirrors"
provides:
  - "onPrint={handlePrint} wired onto the history-detail route in app.jsx (closes the Pitfall-1 gap where a reprint click would have thrown onPrint-is-not-a-function)"
  - "A readOnly print-button row in screen-detail.jsx (Print kitchen / Print customer) that reuses the existing handlePrint/print_receipt path unchanged"
  - "printerConfigured mount-time gate (preferences.json -> printer.port) that greys out the reprint buttons when no printer is configured"
affects: [reprint-csv-export]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Route-level prop regression guard: wrap a real (unmocked) child component in a test-only vi.mock that captures its rendered props via a hoisted array, then re-renders the real component via createElement — proves a specific prop was passed without stubbing the child's own behavior tests"

key-files:
  created: []
  modified:
    - src/app.jsx
    - src/screen-detail.jsx
    - src/__tests__/app-history-route.test.jsx
    - src/__tests__/screen-detail.test.jsx

key-decisions:
  - "onPrint={handlePrint} added as a new prop line to the history-detail OrderDetailScreen block, byte-identical in spirit to the live detail route's existing onPrint={handlePrint} — handlePrint itself received zero changes"
  - "The readOnly print row is placed inside the existing order.items != null right-panel block, immediately after ThermalTicket and before the !readOnly print/Advance/Cancel controls — an added readOnly && block, not a widened guard, so Advance/Cancel stay hidden in read-only mode by construction (D-03)"
  - "printerConfigured mirrors screen-printer.jsx's own mount effect exactly: load('preferences.json', {autoSave:false}) -> store.get('printer') -> !!config?.port, with a .catch that leaves it false"
  - "Disabled styling reuses screen-history.jsx's exact inert-Export convention (opacity 0.5, pointerEvents none, cursor not-allowed) rather than the .btn-disabled-offline class, per D-05"
  - "No new i18n keys added — print_kitchen/print_customer/print_configure_hint all pre-existed from 11-02"

patterns-established:
  - "Test-only wrapper mock for route-prop regression guards: vi.mock('../child.jsx', async (importOriginal) => {...}) with a vi.hoisted() capture array and createElement pass-through, used when a test file needs to assert a specific prop reaches a real (unmocked, behaviorally-tested-elsewhere) child component"

requirements-completed: [HIST-11]

coverage:
  - id: D1
    description: "history-detail route in app.jsx passes onPrint={handlePrint}, closing the Pitfall-1 gap (a reprint click on a historical order can never throw onPrint-is-not-a-function)"
    requirement: "HIST-11"
    verification:
      - kind: unit
        ref: "src/__tests__/app-history-route.test.jsx#history-detail route passes onPrint=handlePrint to OrderDetailScreen (Pitfall 1 regression guard)"
        status: pass
    human_judgment: false
  - id: D2
    description: "readOnly order detail renders Print kitchen / Print customer buttons that call onPrint(order, 'kitchen'|'customer') when a printer is configured"
    requirement: "HIST-11"
    verification:
      - kind: unit
        ref: "src/__tests__/screen-detail.test.jsx#readOnly + printer configured: reprint buttons render enabled and fire onPrint(order, kind) (HIST-11)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Reprint buttons render disabled, greyed (opacity 0.5 / pointerEvents none / cursor not-allowed), with the print_configure_hint tooltip when no printer is configured"
    requirement: "HIST-11"
    verification:
      - kind: unit
        ref: "src/__tests__/screen-detail.test.jsx#readOnly + no printer configured: reprint buttons render disabled, greyed, with print_configure_hint tooltip (D-05/D-06)"
        status: pass
    human_judgment: false
  - id: D4
    description: "The added readOnly reprint row does not widen the live !readOnly guard — Advance/Cancel controls stay absent in read-only mode even with a printer configured"
    requirement: "HIST-11"
    verification:
      - kind: unit
        ref: "src/__tests__/screen-detail.test.jsx#readOnly + printer configured: Advance/Cancel controls stay absent (D-03 — added block, guard not widened)"
        status: pass
    human_judgment: false
  - id: D5
    description: "With a real printer connected, Print kitchen / Print customer on a historical order actually produce the correct receipts on hardware"
    verification: []
    human_judgment: true
    rationale: "Requires physical thermal printer hardware; the reprint path reuses handlePrint/print_receipt unchanged from the live route, which was already hardware-verified in Phase 5 — this plan only adds a new UI entry point to that existing, already-verified path. Flagged as VALIDATION Manual-Only per the plan's own verification section."

# Metrics
duration: ~5min
completed: 2026-07-18
status: complete
---

# Phase 11 Plan 3: Reprint in Read-Only Order Detail Summary

**Wired onPrint={handlePrint} onto the history-detail route and added a printer-configured-gated Print kitchen/Print customer row to the read-only order detail, reusing the existing print path unchanged.**

## Performance

- **Duration:** ~5 min
- **Completed:** 2026-07-18T20:59:38Z
- **Tasks:** 2 completed
- **Files modified:** 4

## Accomplishments
- Closed the Pitfall-1 landmine: the `history-detail` route in `app.jsx` now passes `onPrint={handlePrint}`, so a reprint click on an archived order can never throw `onPrint is not a function` — guarded by a regression test that fails if the prop is ever dropped.
- Added a `readOnly &&` reprint-button row to `screen-detail.jsx` (Print kitchen / Print customer), placed as an additive block alongside the existing `!readOnly` row so the mutating Advance/Cancel controls remain provably hidden in read-only mode (D-03).
- Buttons grey out (opacity 0.5, pointerEvents none, cursor not-allowed, `print_configure_hint` tooltip) via a mount-time `printerConfigured` check that mirrors `screen-printer.jsx`'s own `preferences.json -> printer.port` read.

## Task Commits

Each task was committed atomically:

1. **Task 1: Wire onPrint={handlePrint} onto the history-detail route (Pitfall 1)** - `6b920a4` (feat)
2. **Task 2: Add readOnly reprint-button row + printer-configured gate to screen-detail** - `10a54ed` (feat)

**Plan metadata:** pending (docs: complete plan)

_Note: both tasks were `tdd="true"` — for each, the new test(s) were written and confirmed failing (RED) before the implementation change (GREEN), then committed as a single task-scoped commit per the plan's `type: execute` (not `type: tdd`) frontmatter, matching this repo's per-task commit convention._

## Files Created/Modified
- `src/app.jsx` - Added `onPrint={handlePrint}` to the `history-detail` `<OrderDetailScreen>` block
- `src/screen-detail.jsx` - Added `printerConfigured` state + mount effect, and a `readOnly &&` two-button reprint row inside the existing thermal-rail panel
- `src/__tests__/app-history-route.test.jsx` - Added a route-prop regression guard capturing `OrderDetailScreen`'s real rendered props via a hoisted wrapper mock
- `src/__tests__/screen-detail.test.jsx` - Extended `describe('readOnly mode', ...)` with enabled-click, disabled+greyed+tooltip, and Advance-stays-hidden assertions; added `HISTORY_ORDER_WITH_ITEMS` fixture and a `load` import from `@tauri-apps/plugin-store`

## Decisions Made
- Test-only wrapper-mock pattern for route-prop regression: `vi.mock('../screen-detail.jsx', async (importOriginal) => {...})` combined with `vi.hoisted()` (matching this file's existing `useOrderDetailMock` precedent) to capture real component props without stubbing out the child's own rendered behavior, which the rest of `app-history-route.test.jsx` depends on.
- No changes to `handlePrint` itself — it already reads printer config from the store, invokes `print_receipt`, and fires `toast_printed`/`print_failed`; this plan only adds a second call site for it.
- Disabled-state styling reused verbatim from `screen-history.jsx`'s inert-Export convention (`opacity: 0.5; pointerEvents: 'none'; cursor: 'not-allowed'`), explicitly NOT `.btn-disabled-offline` — confirmed by `grep -c "btn-disabled-offline" src/screen-detail.jsx` staying at 1 (unchanged).

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Both `history-detail` route wiring and the read-only reprint UI are complete and test-covered. `11-04-PLAN.md` (the remaining plan in this phase, wave 2, CSV export UI wiring) is unaffected by and independent of this plan's changes. Manual hardware verification of actual thermal output from the new read-only entry point remains a VALIDATION Manual-Only item (D5 above) — deferred to human UAT, consistent with how the live-route print path was verified in Phase 5.

---
*Phase: 11-reprint-csv-export*
*Completed: 2026-07-18*

## Self-Check: PASSED

All created/modified files confirmed present on disk; both task commits (`6b920a4`, `10a54ed`) confirmed in `git log`.
