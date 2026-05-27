---
phase: 04-core-screens
plan: 06
subsystem: ui
tags: [react, tanstack-query, zustand, pos, menu, discount, order-creation]

requires:
  - phase: 04-02
    provides: "useMenu() hook, useAuth() client, useAppStore pushToast, shared mutation pattern"

provides:
  - "PosScreen calls useMenu() for live category/item data with defensive normalization"
  - "Out-of-stock items rendered at opacity 0.45 with no click handler"
  - "Discount field (number input + %/RON mode toggle) in POS totals area"
  - "discountAmount calculated client-side; discount line conditionally rendered when > 0"
  - "orderTypeMap const mapping UI orderType to SDK enum (dinein→local)"
  - "createOrder mutation calling client.kitchen.orders.create with correct body shape"
  - "Ring Up button wired end-to-end with disabled state on empty cart / offline / pending"

affects:
  - "04-07 onwards — POS screen now fully live; static data.jsx MENU_CATEGORIES/MENU_ITEMS no longer used by PosScreen"

tech-stack:
  added: []
  patterns:
    - "useMenu() called inside screen component with useMemo normalization for SDK untyped fields"
    - "orderTypeMap module-level const for UI→SDK enum mapping"
    - "useMutation for order creation following use-order-actions.js pattern exactly"
    - "discountAmount via useMemo with pct/RON mode and subtotal cap"

key-files:
  created: []
  modified:
    - src/screen-pos.jsx
    - src/app.jsx

key-decisions:
  - "orderTypeMap defined as module-level const — no user input possible; SDK validates enum server-side (T-04-06-01 mitigation)"
  - "Discount is client-side display only — SDK CreateKitchenOrderBody has no discount field; server computes authoritative total (T-04-06-02 accepted)"
  - "createOrder.isPending added to Ring Up disabled condition — prevents double-submit on rapid clicks (T-04-06-04 mitigation)"
  - "Static MENU_CATEGORIES/MENU_ITEMS removed from screen-pos.jsx; productId now comes from SDK — server validates product existence (T-04-06-05 mitigation)"
  - "onCreate prop removed from PosScreen signature and app.jsx call site — mutation is now fully internal to PosScreen"

patterns-established:
  - "Defensive menu normalization: c.id ?? String(c.categoryId ?? ''), c.products ?? c.items ?? [] for untyped SDK response"
  - "inStock guard: opacity 0.45 + onClick=undefined for out-of-stock items — visible but not clickable"

requirements-completed:
  - POS-01
  - POS-02
  - POS-03
  - POS-04
  - POS-05

duration: 4min
completed: 2026-04-24
---

# Phase 4 Plan 06: POS Screen Live Menu + Order Creation Summary

**PosScreen replaces static MENU_CATEGORIES/MENU_ITEMS with useMenu() hook, adds %/RON discount field, and wires Ring Up to kitchen.orders.create with orderTypeMap (dinein→local)**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-04-24T14:37:31Z
- **Completed:** 2026-04-24T14:41:16Z
- **Tasks:** 1 (TDD: RED + GREEN phases)
- **Files modified:** 3 (screen-pos.jsx, app.jsx, screen-pos.test.jsx)

## Accomplishments

- Static `MENU_CATEGORIES`/`MENU_ITEMS` imports removed from `screen-pos.jsx`; `useMenu()` called directly inside PosScreen with defensive `??` normalization for untyped SDK fields
- Discount field added to POS totals area: number input + `%`/`RON` mode toggle; `discountAmount` calculated via `useMemo`; discount totals line conditionally rendered only when `discountAmount > 0`
- `createOrder` mutation wired end-to-end: `orderTypeMap` maps `dinein→local` (critical SDK requirement), items mapped to `{productId, quantity}`, Ring Up disabled on empty cart / offline / isPending, success toast shows `#dailyNumber`

## Task Commits

TDD cycle — two commits for the single task:

1. **RED: Failing tests** - `037fca9` (test) — 13 tests covering POS-01 through POS-05
2. **GREEN: Implementation** - `3433ebc` (feat) — screen-pos.jsx rewrite + app.jsx cleanup

## Files Created/Modified

- `src/screen-pos.jsx` — Removed static imports; added useMenu(), useMutation createOrder, orderTypeMap, discountValue/discountMode state, discount UI, defensive cats normalization, out-of-stock opacity
- `src/app.jsx` — Removed `onCreate={() => {}}` prop from PosScreen JSX (mutation now internal)
- `src/__tests__/screen-pos.test.jsx` — 13 real tests replacing test.todo stubs (POS-01 to POS-05)

## Decisions Made

- `orderTypeMap` is a module-level `const` — maps all three UI order types to SDK enum values; `dinein→local` is the critical mapping the SDK requires
- Discount is client-side display only; no discount field exists in `CreateKitchenOrderBody`; server computes the authoritative total
- `createOrder.isPending` added to Ring Up's `disabled` condition to prevent double-submit on rapid clicks
- `onCreate` prop eliminated entirely — the mutation is now internal to PosScreen, which is cleaner architecture

## Deviations from Plan

None - plan executed exactly as written.

The only minor adjustment was tightening test selectors in the POS-03 discount tests: the initial `/−/` regex matched both the cart minus button text and the discount amount span. Updated to `getAllByText(/^−/)` filtered to `tagName === 'SPAN'` to precisely target the discount totals line.

## Issues Encountered

Test selector precision: cart minus buttons render the `−` character in button text, which collided with the discount amount span matcher. Resolved by using `getAllByText(/^−/)` (anchored regex) and filtering to `SPAN` elements only.

## Known Stubs

None — discount field and order creation are fully wired to live data. The i18n keys `order_sent`, `order_error`, and `discount` were already present in both `ro` and `en` sections from an earlier plan.

## Threat Surface Scan

All threats from the plan's `<threat_model>` are mitigated as documented in Key Decisions:
- T-04-06-01 (orderType tampering): mitigated via module-level const
- T-04-06-04 (double-submit DoS): mitigated via `createOrder.isPending`
- T-04-06-05 (stale productId): mitigated by removing static data; productId from SDK

No new security surface introduced beyond what the plan's threat model already covers.

## Next Phase Readiness

- POS screen is fully live: categories, items, cart, discount, and order submission all use real API data
- Plans 07–09 (Menu screen live toggle, Settings Display tab, Order Detail cancel) can proceed independently
- No blockers

---
*Phase: 04-core-screens*
*Completed: 2026-04-24*
