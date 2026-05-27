---
phase: 04-core-screens
plan: 11
subsystem: ui
tags: [react, sse, fetch-event-source, css, density, toast]

# Dependency graph
requires:
  - phase: 04-core-screens
    provides: SSE hook, POS screen with toast, density toggle in shell
provides:
  - SSE connection stays alive when app window is backgrounded (openWhenHidden: true)
  - Ring Up toast shows single # prefix using dailyOrderNumber field
  - Density toggle produces visible spacing reduction on order rows and KDS cards
affects: [05-native-integration]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "openWhenHidden: true on fetchEventSource to keep SSE alive when window loses focus"
    - "dailyOrderNumber (with # prefix) is the canonical order number field; dailyNumber is the numeric fallback"
    - "CSS density cascade via class names (order-row, kds-card-body) — no inline padding on elements that need density responsiveness"

key-files:
  created: []
  modified:
    - src/use-sse.js
    - src/screen-pos.jsx
    - src/styles.css
    - src/screen-orders.jsx
    - src/screen-kitchen.jsx
    - src/__tests__/use-sse.test.js
    - src/__tests__/screen-pos.test.jsx

key-decisions:
  - "openWhenHidden: true placed between signal: ctrl.signal and async onopen — zero other changes to use-sse.js"
  - "dailyOrderNumber ?? dailyNumber ?? '' fallback chain handles both new and legacy API shapes"
  - "inline padding removed from OrderCard and KitchenTicket body so CSS density cascade can reach those elements"

patterns-established:
  - "CSS density pattern: remove inline padding from elements, move to .density-compact .classname rules so the cascade works"

requirements-completed: [SSE-01, POS-05, UI-DENSITY-01]

# Metrics
duration: 15min
completed: 2026-04-28
---

# Phase 04 Plan 11: UAT Gap Closure Summary

**Closed 3 UAT regressions: SSE backgrounding (openWhenHidden), toast double-# (dailyOrderNumber field), and density CSS cascade (order-row + kds-card-body class-based padding)**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-04-28T17:44:00Z
- **Completed:** 2026-04-28T17:47:30Z
- **Tasks:** 3 (2 TDD, 1 direct fix)
- **Files modified:** 7

## Accomplishments

- SSE stream now stays connected when the app window is backgrounded — `openWhenHidden: true` added to `fetchEventSource` call
- Ring Up success toast correctly shows `#44` (not `##44`) by using `dailyOrderNumber` field which already carries the `#` prefix
- Density toggle now produces a visible spacing reduction: `order-row` and `kds-card-body` class names enable the CSS cascade to reach previously inline-padded elements

## Task Commits

1. **Task 1: Fix SSE background suspension** - `ebeb386` (fix — TDD GREEN)
2. **Task 2: Fix toast double-# prefix** - `4b85165` (fix — TDD GREEN)
3. **Task 3: Fix density toggle cascade** - `4151e46` (fix)

## Files Created/Modified

- `src/use-sse.js` — added `openWhenHidden: true` option to `fetchEventSource` call
- `src/screen-pos.jsx` — changed toast detail from `` `#${dailyNumber}` `` to `` `${dailyOrderNumber ?? dailyNumber ?? ''}` ``
- `src/styles.css` — replaced broken `padding-block: 0` rule with 3 sane density rules
- `src/screen-orders.jsx` — added `order-row` to `OrderCard` outer div className; removed inline `padding: 16`
- `src/screen-kitchen.jsx` — added `kds-card-body` to `KitchenTicket` body div; removed inline `padding: '12px 14px'`
- `src/__tests__/use-sse.test.js` — added U9d describe block (2 tests asserting openWhenHidden is passed)
- `src/__tests__/screen-pos.test.jsx` — updated existing success-toast test + added regression test for double-# prevention

## gaps_closed

### Gap 1 — SSE Background Suspension (UAT gap 1, major)

- **Before:** `fetchEventSource` had no `openWhenHidden` option; browser stopped delivering SSE events when the app window was backgrounded
- **After:** `openWhenHidden: true` added; SSE stream remains active regardless of window focus state
- **Tests:** 2 new U9d tests; all 12 use-sse tests pass

### Gap 2 — Toast Double-# Prefix (UAT gap 2, cosmetic)

- **Before:** `onSuccess` used `` `#${result.data?.dailyNumber}` ``; if `dailyNumber` was numeric (e.g. 44) this gave `#44`, but if it was a string `#44`, it gave `##44`
- **After:** Uses `result.data?.dailyOrderNumber ?? result.data?.dailyNumber ?? ''`; `dailyOrderNumber` already carries the `#` prefix from the API; numeric fallback for legacy shape
- **Tests:** Updated existing test to include `dailyOrderNumber: '#44'`; added regression test asserting `'##99'` is never in toast calls

### Gap 3 — Density Toggle No Visible Effect (UAT gap 3, minor)

- **Before:** Only rule was `.density-compact .card { padding-block: 0 }` (too aggressive — zeroed padding) and didn't reach order rows or KDS cards which set padding via inline `style`
- **After:** Three balanced rules (card 8px/12px, order-row 6px block, kds-card-body 8px/14px); inline padding removed from `OrderCard` and `KitchenTicket` body so cascade reaches them
- **Tests:** 16 screen-orders + screen-kitchen tests pass with 0 failures (DOM structure assertions unaffected)

## Decisions Made

- `openWhenHidden: true` is placed as a top-level option alongside `signal` — no structural changes to the SSE hook
- The `dailyOrderNumber ?? dailyNumber ?? ''` fallback chain handles both new API shape (string with `#`) and legacy numeric shape
- Inline padding removed only from the two density-sensitive elements; all other inline styles preserved

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None. All three fixes applied cleanly with no blocking issues. The TDD RED phase for Task 2 was technically green (because numeric `dailyNumber` happened to produce the same string as `dailyOrderNumber`), but the canonical fix (using the correct field) was applied as planned.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- All 3 UAT gaps from `04-UAT.md` are closed; Phase 4 UAT should now reach 20/20 pass
- Phase 5 (Native Integration) can proceed; SSE and POS screen are fully functional

---
*Phase: 04-core-screens*
*Completed: 2026-04-28*

## Self-Check: PASSED

Files verified:
- `src/use-sse.js` — FOUND, contains `openWhenHidden: true`
- `src/screen-pos.jsx` — FOUND, contains `dailyOrderNumber`
- `src/styles.css` — FOUND, contains `.density-compact .order-row`
- `src/screen-orders.jsx` — FOUND, contains `order-row`
- `src/screen-kitchen.jsx` — FOUND, contains `kds-card-body`

Commits verified:
- `ebeb386` — Task 1 SSE fix
- `4b85165` — Task 2 toast fix
- `4151e46` — Task 3 density fix
