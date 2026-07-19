---
phase: 08-read-only-order-detail-view
plan: 05
subsystem: ui
tags: [react, tanstack-query, vitest, testing-library, order-detail, routing]

requires:
  - phase: 08-read-only-order-detail-view/08-04
    provides: "detailLoading / detailError / onRetryDetail props on OrderDetailScreen — the contract this plan fulfils from useOrderDetail's isPending/isError/refetch"
  - phase: 08-read-only-order-detail-view/08-01
    provides: "F-01 finding — normalizeOrder always yields items: [], never null, for AdminOrder summaries"
provides:
  - "history-detail route now fetches getOrder(historyOrder.id) via a sibling useOrderDetail(historyOrder?.id) call and merges the hydrated payload over the AdminOrder summary"
  - "mergedHistoryOrder — route-level derived value in app.jsx: {...historyOrder, ...(historyDetail ?? {})}, hydrated fields winning (D-03)"
  - "Controllable per-id useOrderDetail mock in app-history-route.test.jsx, replacing the blanket mock that could not distinguish the live and history route call sites"
affects: []

tech-stack:
  added: []
  patterns:
    - "Sibling hook call (add-alongside, not promote): a second useOrderDetail(historyOrder?.id) call placed in the same unconditional block as the existing live-route call, above App()'s conditional returns — preserves React hook-ordering rules and keeps the live route byte-identical"
    - "Manual merge over TanStack placeholderData/initialData: {...summary, ...(detail ?? {})} was chosen deliberately because placeholderData/initialData reset to undefined on error, which would blank the screen — the opposite of D-07/SC2"
    - "isPending (not isFetching) gates the loading skeleton — correct under staleTime: 0, since isFetching would flash the skeleton on every reopen of an already-cached order"

key-files:
  created: []
  modified:
    - src/app.jsx
    - src/__tests__/app-history-route.test.jsx

key-decisions:
  - "add-alongside confirmed as the terminal decision for this phase (per 08-CONTEXT.md's locked D-01/D-04, reaffirmed in the plan's assumption-delta-decision) — two useOrderDetail call sites against the same ['order', id] cache key, not a unified/generalized route. What would force a promote is documented in the plan (a third OrderDetailScreen caller, diverging data needs, or props growing past readOnly + three) and carried forward as a phase-level tripwire, not resolved here."
  - "mergedHistoryOrder placed near orderCount (just before the return statement) rather than immediately adjacent to the hook declarations — it is a derived value, not a hook, so no ordering constraint applies to its position; placing it next to orderCount keeps all pre-render derived values grouped together."
  - "Test fixture totals restructured to subtotal 120.00 / tax 8.50 / total 128.50 (rather than the original subtotal===total shape) specifically so getByText('128,50 lei') resolves unambiguously to the total row — mirrors the same ambiguity 08-04 hit and documented the same fix for."

requirements-completed: [HIST-10]

coverage:
  - id: D1
    description: "Opening a historical order calls getOrder(id) via a sibling useOrderDetail(historyOrder?.id) and renders items with modifiers, subtotal, delivery fee, total, customer phone, and delivery address — none of which the AdminOrder summary carries (SC1)"
    requirement: HIST-10
    verification:
      - kind: unit
        ref: "src/__tests__/app-history-route.test.jsx#hydration: opening a historical order fetches getOrder(id) and renders items with modifiers, phone, and address (SC1)"
        status: pass
    human_judgment: false
  - id: D2
    description: "The hydrated detail is merged over the summary so no field ever blanks during the fetch, and the hydrated value wins when both sides carry a value (D-03)"
    requirement: HIST-10
    verification:
      - kind: unit
        ref: "src/__tests__/app-history-route.test.jsx#merge: summary total present, hydrated payload omits total — nothing blanks"
        status: pass
      - kind: unit
        ref: "src/__tests__/app-history-route.test.jsx#merge: hydrated total differs from summary total — hydrated wins (D-03)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Hook placement is correctness-load-bearing: both useOrderDetail calls sit above App()'s conditional returns, so hook count is identical on every render across the auth-guard early-return branches"
    requirement: HIST-10
    verification:
      - kind: unit
        ref: "src/__tests__/app-guard.test.jsx (full file — auth-guard early-return branches)"
        status: pass
      - kind: other
        ref: "grep -n 'useOrderDetail(\\|if (coldStartBusy)' src/app.jsx — both hook calls at lines 70/76, guard at line 218"
        status: pass
    human_judgment: false
  - id: D4
    description: "The skeleton is gated on isPending, not isFetching, so reopening an already-cached order does not flash the skeleton"
    requirement: HIST-10
    verification:
      - kind: other
        ref: "grep -c isFetching src/app.jsx returns 0; grep -c 'isPending: historyDetailPending' returns 1"
        status: pass
      - kind: unit
        ref: "src/__tests__/app-history-route.test.jsx#loading: isPending true renders the items skeleton and the summary total still renders"
        status: pass
    human_judgment: false
  - id: D5
    description: "detailLoading/detailError/onRetryDetail are passed only on the history-detail route; the live route renders unchanged"
    requirement: HIST-10
    verification:
      - kind: unit
        ref: "src/__tests__/app-history-route.test.jsx#the live route is unaffected: screen 'detail' with a selectedOrder still renders the editable detail"
        status: pass
    human_judgment: false
  - id: D6
    description: "Back from the read-only detail returns to History, not Orders, with the list and period intact (SC4)"
    requirement: HIST-10
    verification:
      - kind: unit
        ref: "src/__tests__/app-history-route.test.jsx#Back: from history-detail, clicking back returns to History, not Orders (SC4)"
        status: pass
    human_judgment: false
  - id: D7
    description: "The rehydrate backstop still redirects history-detail with a null historyOrder to history (Phase 7 behavior preserved)"
    requirement: HIST-10
    verification:
      - kind: unit
        ref: "src/__tests__/app-history-route.test.jsx#rehydrate backstop: history-detail with historyOrder null redirects to history (not blank)"
        status: pass
    human_judgment: false
  - id: D8
    description: "The Modify gate holds under real hydration (hydrated fixture, non-empty items), closing the T-08-01/T-08-10 gap at the route level"
    requirement: HIST-10
    verification:
      - kind: unit
        ref: "src/__tests__/app-history-route.test.jsx#Modify gate holds under real hydration: with a hydrated fixture (non-empty items), Modify is absent from the DOM"
        status: pass
    human_judgment: false

duration: ~8min
completed: 2026-07-17
status: complete
---

# Phase 8 Plan 5: Wire the read-only detail route to fetch and merge Summary

**Added a sibling `useOrderDetail(historyOrder?.id)` call to `app.jsx`, merged the hydrated `getOrder(id)` payload over the `AdminOrder` summary with hydrated fields winning, and wired the query state into the `detailLoading`/`detailError`/`onRetryDetail` props `08-04` added — making SC1 true and completing HIST-10.**

## Performance

- **Duration:** ~8 min
- **Completed:** 2026-07-17
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- `App()` now calls `useOrderDetail(historyOrder?.id)` as a second, sibling call site immediately after the existing live-route call, both sitting above the `coldStartBusy`/`!isAuthenticated` conditional returns — preserves React's hook-ordering rule exactly the way `useSSE`/`useOrders`/`useUpdater` already do
- `mergedHistoryOrder = historyOrder ? { ...historyOrder, ...(historyDetail ?? {}) } : null` — the hydrated payload wins field-by-field over the summary, safe because both sides have already passed through `normalizeOrder`
- The `history-detail` route now passes `order={mergedHistoryOrder}`, `detailLoading={historyDetailPending}`, `detailError={historyDetailError}`, `onRetryDetail={refetchHistoryDetail}`, plus `restaurantSettings`/`deliveryAreas` (previously missing from this route, needed by the thermal ticket and address fallback)
- Loading is gated on `isPending` (not `isFetching`) — resolves RESEARCH Open Question 1; correct given `staleTime: 0`, since `isFetching` would re-flash the skeleton on every reopen of an already-cached order
- The live `detail` route at `app.jsx` is untouched — it passes none of the three new props, so `OrderDetailScreen`'s defaults keep it byte-identical
- Test file rewritten: the blanket `useOrderDetail` mock (which could not distinguish the two now-simultaneous call sites) replaced with a `vi.hoisted()` `vi.fn()` keyed by order id, defaulting to TanStack v5's real disabled-query shape
- `historyOrderFixture` corrected from the unrepresentative `items: null` to the production-shaped `items: []` (per F-01), with `status`/`paymentCaptureStatus` fields added so `deriveDisplayStatus` resolves correctly
- 8 new tests cover hydration (items/mods/phone/address render), loading (skeleton + total intact), error (error title + total intact), both merge directions (nothing-blanks and hydrated-wins), the Modify gate under real hydration, Back-to-History, and live-route non-regression

## Task Commits

Each task was committed atomically:

1. **Task 1: Add the sibling useOrderDetail call, merge the payload, and wire the props at the history-detail route** - `270142d` (feat)
2. **Task 2: Cover the hydration, failure, and back-navigation paths with a controllable per-id mock** - `c634b6e` (test)

## Files Created/Modified

- `src/app.jsx` - Added second `useOrderDetail` call, `mergedHistoryOrder` derivation, updated `history-detail` route props
- `src/__tests__/app-history-route.test.jsx` - Replaced blanket mock with controllable per-id `vi.fn()`, fixed `items: null` → `items: []` fixture, added `hydratedDetailFixture`/`hydratedDetailNoTotalFixture`/`liveOrderFixture`, added 8 new tests

## Decisions Made

- **add-alongside stands as the terminal architectural decision for this phase.** The plan's `assumption_delta_decision` flagged this as the phase Phase 7 predicted would "force a promote," but D-01/D-04 in `08-CONTEXT.md` are locked user decisions specifying add-alongside explicitly. No generalization of `openOrder()`/`useOrderDetail` was made. The three promote-tripwires (a third `OrderDetailScreen` caller — Phase 11's reprint is the near-term candidate; diverging data needs between the two routes; or props growing past `readOnly` + three) remain open and are not this plan's concern to resolve.
- **`mergedHistoryOrder` computed near `orderCount`,** not immediately adjacent to the two `useOrderDetail` hook declarations. It's a plain derived value, not a hook, so it carries no ordering constraint — grouping it with the other pre-render derived values (`orderCount`) keeps the render-prep section coherent.
- **Test fixture totals split into `subtotal: 120.00` / `tax: 8.50` / `total: 128.50`** (rather than an equal subtotal/total shape) specifically so `getByText('128,50 lei')` resolves to a single, unambiguous node — the same ambiguity 08-04's summary already flagged and fixed the same way.
- **`Extra cheese` and `Str. Exemplu 10` assertions use `getAllByText`,** not `getByText` — both mods and the address line1 render twice once `items` is non-null (once in the items card, once in the mounted `ThermalTicket`), since neither the mods string nor `line1` gets uppercased by the ticket the way item names do (`it.name.toUpperCase()` keeps item-name assertions unique).

## Deviations from Plan

None — plan executed exactly as written. Task 1's implementation matched the plan's action text precisely (hook placement, merge expression, prop wiring, `isPending` choice). Task 2 required one test-authoring fix during the RED→GREEN cycle (see below), not a deviation from the plan's behavior spec.

### Auto-fixed Issues

**1. [Rule 1 - Test bug] `getByText(/Extra cheese/)` matched two DOM nodes**
- **Found during:** Task 2, first run of the new hydration test
- **Issue:** With `items` non-null, both the items-card rows region and the mounted `ThermalTicket` render the same modifier string (`→ Extra cheese`), so a single-match `getByText` query threw `TestingLibraryElementError: Found multiple elements`.
- **Fix:** Switched the hydration test's item-name and modifier assertions to `getAllByText(...).length > 0`, which asserts presence without requiring uniqueness across the two rendered regions (this is expected, correct duplication — the thermal preview is supposed to mirror the items card).
- **Files modified:** `src/__tests__/app-history-route.test.jsx`
- **Verification:** Test passes; full suite green.
- **Commit:** `c634b6e`

---

**Total deviations:** 1 auto-fixed (Rule 1, test-authoring fix during TDD RED→GREEN — no production code defect)
**Impact on plan:** None — stayed inside the test file, no scope change.

## Issues Encountered

None beyond the auto-fixed test-assertion issue above.

## User Setup Required

None - no external service configuration required.

## Requirement Status

**HIST-10 is now complete.** All nine `must_haves.truths` in `08-05-PLAN.md`'s frontmatter are verified by the coverage table above. This was the final plan of Phase 8 — HIST-10 was the phase's sole requirement, and all five plans (08-01 through 08-05) are now done.

## Next Phase Readiness

- Phase 8 is complete: 5/5 plans done, HIST-10 delivered.
- Full suite: 311/314 passing, matching the pre-existing 3 baseline failures (`build-pipeline.test.js` x1, `offline-buttons.test.jsx` x2) — unrelated to this plan, confirmed failing at the phase base commit.
- No blockers for Phase 9 (Period Control, HIST-04).
- The add-alongside promote-tripwires remain open for whichever phase adds a third `OrderDetailScreen` caller (Phase 11's reprint is the documented near-term candidate).

---
*Phase: 08-read-only-order-detail-view*
*Completed: 2026-07-17*

## Self-Check: PASSED

- FOUND: src/app.jsx
- FOUND: src/__tests__/app-history-route.test.jsx
- FOUND: .planning/phases/08-read-only-order-detail-view/08-05-SUMMARY.md
- FOUND: 270142d (Task 1 commit)
- FOUND: c634b6e (Task 2 commit)
