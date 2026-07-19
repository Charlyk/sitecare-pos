---
phase: 08-read-only-order-detail-view
plan: 04
subsystem: ui
tags: [react, vitest, testing-library, order-detail, security]

requires:
  - phase: 08-read-only-order-detail-view/08-01
    provides: "h_detail_error_title, h_prep_time, h_canceled_after, h_detail_no_items i18n keys (ro+en)"
  - phase: 08-read-only-order-detail-view/08-03
    provides: "readOnly duration row and status chip in screen-detail.jsx, on top of which this plan's rows-region restructuring was built"
provides:
  - "detailLoading / detailError / onRetryDetail props on OrderDetailScreen — the contract app.jsx fulfils in 08-05 from useOrderDetail's isPending/isError/refetch"
  - "ItemsSkeletonRows and ItemsErrorBlock module-private components"
  - "State machine keyed on query state (not items value) so the empty-order message can never appear while the fetch is in flight or failed"
  - "Modify button gated behind !readOnly (DOM removal) — closes a live SC3 defect on the shipped history-detail route"
  - "Standing allowlist test sweeping every <button> in a hydrated readOnly render against a fixed non-mutating set"
affects: ["08-05 (app.jsx wiring of useOrderDetail's isPending/isError/refetch into these exact prop names)"]

tech-stack:
  added: []
  patterns:
    - "Query-state-first precedence: detailError > detailLoading > items.length===0 > populated — evaluated in that order so a failed fetch never shows a stale skeleton and the empty claim is only ever made about a settled, successfully-read order"
    - "Rows-region-only state scoping: skeleton/error/empty render inside the items card's rows slot only; the card shell, header, and totals block stay mounted in every state so SC2 (never blank the total the app already holds) holds by construction"

key-files:
  created: []
  modified:
    - src/screen-detail.jsx
    - src/__tests__/screen-detail.test.jsx

key-decisions:
  - "Modify button gate landed inside Task 1's commit as an inherent side effect of restructuring the card header for the three new states — not deferred to Task 2 as the plan's task split implied. Verified the defect and the fix were both real by transiently un-gating Modify and re-running the suite before finalizing Task 2 (5 assertions fail without the gate, pass with it); Task 2's committed diff is therefore test-only (the standing allowlist regression test)."
  - "Test fixtures (HYDRATING_ORDER, HYDRATED_ORDER, DUPLICATE_ITEMS_ORDER) carry the full production-shaped numeric fields (subtotal/tax/deliveryFee/tip/discount, all 0-defaulted per normalizeOrder) rather than reusing the phase's existing HISTORY_ORDER fixture as-is — HISTORY_ORDER omits those fields, which was safe only while items stayed null/undefined (thermal rail unmounted); once items is a real array the thermal rail mounts and ThermalTicket's money() helper throws on undefined tax."
  - "Card header count slot: skeletal 100x15 bar while loading, nothing while errored (a grey placeholder in a settled error state would read as still-loading), real count only when settled — per plan action text"

requirements-completed: []

coverage:
  - id: D1
    description: "Items rows region shows exactly 3 skeleton rows matching the real item row's box (padding 12px 18px, gap 12, matching borderBottom) while detailLoading is true, and the totals block still renders the AdminOrder total"
    requirement: HIST-10
    verification:
      - kind: unit
        ref: "src/__tests__/screen-detail.test.jsx#readOnly items-card states > detailLoading: exactly 3 skeleton rows render, no no-items line, no error title"
        status: pass
      - kind: unit
        ref: "src/__tests__/screen-detail.test.jsx#readOnly items-card states > detailLoading: the totals block still renders the formatted total"
        status: pass
      - kind: unit
        ref: "src/__tests__/screen-detail.test.jsx#readOnly items-card states > skeleton row inline padding is 12px 18px and gap is 12, matching a real item row"
        status: pass
    human_judgment: false
  - id: D2
    description: "detailError renders the generic error title, check-connection body, and a Retry button in the rows region, wired to onRetryDetail, while the totals block still renders the total — no HTTP-status branching"
    requirement: HIST-10
    verification:
      - kind: unit
        ref: "src/__tests__/screen-detail.test.jsx#readOnly items-card states > detailError: error title, check-connection body, and Retry render; no skeleton, no no-items line"
        status: pass
      - kind: unit
        ref: "src/__tests__/screen-detail.test.jsx#readOnly items-card states > detailError: the totals block still renders the formatted total"
        status: pass
      - kind: unit
        ref: "src/__tests__/screen-detail.test.jsx#readOnly items-card states > detailError: clicking Retry calls onRetryDetail exactly once"
        status: pass
    human_judgment: false
  - id: D3
    description: "The no-items line renders only in the settled-empty state (never while loading or errored, per F-01/prohibition), and a settled-populated order renders items in server order including when two items compare equal"
    requirement: HIST-10
    verification:
      - kind: unit
        ref: "src/__tests__/screen-detail.test.jsx#readOnly items-card states > settled (both flags false) + empty items: the no-items line renders; totals render; no skeleton"
        status: pass
      - kind: unit
        ref: "src/__tests__/screen-detail.test.jsx#readOnly items-card states > settled + hydrated 2-item array: both item names render, no skeleton, no error, no no-items line"
        status: pass
      - kind: unit
        ref: "src/__tests__/screen-detail.test.jsx#readOnly items-card states > settled + two items with identical name/price/qty: both rows render in server order"
        status: pass
      - kind: unit
        ref: "src/__tests__/screen-detail.test.jsx#readOnly items-card states > NOT readOnly + MINIMAL_ORDER, both flags omitted: renders exactly as today"
        status: pass
    human_judgment: false
  - id: D4
    description: "No mutating control (Modify) is reachable on the readOnly route with a fully-hydrated items array — DOM removal, not disabled/CSS-hidden — and a standing sweep test enumerates every button in a hydrated readOnly render against a fixed non-mutating allowlist"
    requirement: HIST-10
    verification:
      - kind: unit
        ref: "src/__tests__/screen-detail.test.jsx#readOnly mutating-control gate (T-08-01, T-08-09) > readOnly + settled + hydrated items array: the Modify button is absent from the DOM"
        status: pass
      - kind: unit
        ref: "src/__tests__/screen-detail.test.jsx#readOnly mutating-control gate (T-08-01, T-08-09) > readOnly + settled + hydrated items array: exhaustive button sweep against the non-mutating allowlist"
        status: pass
      - kind: unit
        ref: "src/__tests__/screen-detail.test.jsx#readOnly mutating-control gate (T-08-01, T-08-09) > NOT readOnly + MINIMAL_ORDER: the Modify button IS present — the live route keeps its control"
        status: pass
    human_judgment: false

duration: ~10min
completed: 2026-07-17
status: complete
---

# Phase 8 Plan 4: Items-card loading/error/empty states + Modify gate closure Summary

**Added a query-state-keyed (not items-value-keyed) loading/error/empty state machine to the read-only items card's rows region, and closed a live SC3 defect by gating the Modify button behind `!readOnly`.**

## Performance

- **Duration:** ~10 min
- **Completed:** 2026-07-17
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- `OrderDetailScreen` gained `detailLoading`, `detailError`, and `onRetryDetail` props (all defaulted so the live detail route stays byte-identical since `app.jsx` passes none of them today)
- Items rows region now precedence-checks `detailError → detailLoading → items.length===0 → populated`, so a failed fetch never shows a stale skeleton and the "no items" message can never appear before the order has actually settled — closing the exact failure mode F-01 flagged (empty receipt ≠ absent receipt)
- New `ItemsSkeletonRows` (3 rows matching a real item row's exact box) and `ItemsErrorBlock` (mirrors `screen-history.jsx`'s `ErrorBlock`, scoped to the card's 32px/18px rhythm) module-private components
- Totals block and card shell stay mounted through every state — SC2 verified by tests asserting the formatted total renders under both `detailLoading` and `detailError`
- Closed T-08-01 (high severity, live production defect per F-01): the Modify button at the items-card header is now behind `{!readOnly && (...)}` — DOM removal, matching the file's six pre-existing gates
- Closed T-08-09 with a standing regression test: every `<button>` in a fully-hydrated readOnly render is swept against a fixed allowlist (Back, the two thermal-preview tab toggles, Retry when errored) — a future ungated addition will fail this test automatically

## Task Commits

Each task was committed atomically:

1. **Task 1: Add loading, error, and empty states to the items rows region** - `cb76339` (feat, tdd)
2. **Task 2: Gate the Modify button and sweep the whole file for any other reachable mutating control** - `ab06d26` (test — implementation landed inside Task 1's commit, see Deviations)

## Files Created/Modified

- `src/screen-detail.jsx` - Added 3 new props, restructured the items-card rows region into a 4-way state machine, added `ItemsSkeletonRows`/`ItemsErrorBlock`, gated the Modify button
- `src/__tests__/screen-detail.test.jsx` - Added 24 new tests across two `describe` blocks (`readOnly items-card states`, `readOnly mutating-control gate`)

## Decisions Made

- **Modify gate landed in Task 1, not Task 2.** Task 1's action required restructuring the exact header block (lines 143-155) that also contains the Modify button, to insert the new count-slot state machine. The `{!readOnly && (...)}` wrap was applied as part of that restructuring rather than deferred. Verified this didn't silently skip the plan's required RED proof: before finalizing Task 2, transiently removed the gate, ran the suite (5 new Task-2 assertions failed as expected), restored the gate, confirmed all pass. Task 2's actual committed diff is test-only — the standing allowlist regression test plus the explicit Modify-absence assertions.
- **Test fixtures had to be more production-shaped than the phase's existing `HISTORY_ORDER`.** `HISTORY_ORDER` (from 08-01/02/03) omits `subtotal`/`tax`/`deliveryFee`/`tip`/`discount`, which was safe only while `items` was `undefined` (thermal rail stays unmounted, gated on `order.items != null`). Once `items` becomes a real array — the whole premise of F-01 and this plan — the thermal rail mounts and `ThermalTicket`'s `money()` helper throws on `undefined.toFixed()`. New fixtures (`HYDRATING_ORDER`, `HYDRATED_ORDER`, `DUPLICATE_ITEMS_ORDER`) carry the full numeric shape `normalizeOrder` always produces (0-defaulted, never `undefined`).
- **`128,50 lei` was ambiguous as a totals-block assertion** when `tax: 0` made subtotal and total format identically; switched fixtures to `subtotal: 118.50, tax: 10` (total still 128.50) so `getByText('128,50 lei')` resolves to the total unambiguously.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] ThermalTicket crashes on undefined `order.tax` once `items` is a real array**
- **Found during:** Task 1, first test run against my own new fixtures
- **Issue:** `ThermalTicket`'s `money = (n) => n.toFixed(2)` throws `Cannot read properties of undefined (reading 'toFixed')` when `order.tax` is `undefined`. This was previously masked because the phase's fixtures set `items` to `undefined`/`null`, keeping the thermal rail (gated on `order.items != null`) unmounted. Production's `normalizeOrder` always yields numeric `subtotal`/`tax`/`deliveryFee`/`tip`/`discount` (0-defaulted, per F-01's broader finding that AdminOrder-shaped fixtures throughout this phase have been unrepresentative).
- **Fix:** Not a `screen-detail.jsx`/`ThermalTicket` code change — the actual bug was in my own test fixtures not matching production shape. Added the full numeric field set to `HYDRATING_ORDER`, `HYDRATED_ORDER`, and `DUPLICATE_ITEMS_ORDER` so they match what `getOrder()` actually returns.
- **Files modified:** `src/__tests__/screen-detail.test.jsx`
- **Verification:** Full suite green after the fix; no `ThermalTicket` source change was needed since the crash only ever occurred against non-representative fixtures.
- **Committed in:** `cb76339` (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1, test-fixture correction — no production code defect)
**Impact on plan:** No scope creep; the fix stayed inside the test file and reinforced F-01's central finding (AdminOrder-shaped fixtures must be production-shaped, not just have a non-null `items`).

## Issues Encountered

- The task split assumed the Modify gate would land in Task 2, but Task 1's mandatory header restructuring (to add the loading-skeleton/error-empty count slot) touched the same lines and organically included the gate. Resolved by explicitly re-verifying the RED→GREEN proof for Task 2's tests via a transient revert-and-restore rather than skipping the proof because the fix was "already there."

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `detailLoading` / `detailError` / `onRetryDetail` prop contract is locked and tested; 08-05 wires `app.jsx`'s `useOrderDetail` (`isPending`, `isError`, `refetch`) into these exact prop names — the plan note is explicit that the `isPending` (not `isFetching`) choice must match on both sides.
- `mergedHistoryOrder` (route-level derivation combining the `AdminOrder` summary with the `getOrder(id)` hydration) is the remaining piece 08-05 owns.
- `app-history-route.test.jsx`'s `items: null` fixture is known-stale (per F-01) and intentionally left untouched here — 08-05 owns correcting it to a production-shaped `items: []` fixture.
- No blockers. Full suite at 303/306 passing, matching the pre-existing 3 baseline failures (`build-pipeline.test.js` x1, `offline-buttons.test.jsx` x2) unrelated to this plan.

---
*Phase: 08-read-only-order-detail-view*
*Completed: 2026-07-17*

## Self-Check: PASSED

- FOUND: src/screen-detail.jsx
- FOUND: src/__tests__/screen-detail.test.jsx
- FOUND: .planning/phases/08-read-only-order-detail-view/08-04-SUMMARY.md
- FOUND: cb76339 (Task 1 commit)
- FOUND: ab06d26 (Task 2 commit)
