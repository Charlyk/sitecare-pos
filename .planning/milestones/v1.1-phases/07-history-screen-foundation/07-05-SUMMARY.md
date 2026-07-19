---
phase: 07-history-screen-foundation
plan: 05
subsystem: ui
tags: [react, order-detail, history, readonly-view]

# Dependency graph
requires:
  - phase: 07-02 (i18n + store + sidebar nav)
    provides: h_back_to_history i18n key (ro/en) used by the readOnly back label
provides:
  - "readOnly prop on OrderDetailScreen (src/screen-detail.jsx) that turns the shipped live-order
    detail surface into an archive view"
  - "Minimal totals card filling the slot the items card vacates when AdminOrder carries no items[]"
affects: [07-06 (app.jsx router — will wire the History call site with readOnly + onBack)]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Single shared detail component serving two callers with different data shapes (D-09):
      readOnly gates regions rather than forking a new component"
    - "Unconditional gating for mutating controls (Advance/Cancel/Print) — hidden by readOnly
      regardless of the order's derived state, not status-driven"

key-files:
  created: []
  modified:
    - src/screen-detail.jsx
    - src/__tests__/screen-detail.test.jsx

key-decisions:
  - "order.items != null used as the single gating condition for the items card, thermal rail,
    and outer grid collapse; !readOnly used directly for the remaining regions (timeline, notes,
    call-customer, print buttons, Advance, Cancel) per the plan's 'pick one, use consistently'
    guidance for the items/rail path"
  - "Minimal totals card reuses existing card/chip classes, orderTimeLabel, formatRON, and the
    'total' i18n key — no new CSS class or i18n key added"

patterns-established:
  - "readOnly = false default preserves byte-identical behavior at every shipped call site
    (app.jsx:227), verified by the pre-existing ACT-04 print tests staying green untouched"

requirements-completed: [HIST-05]

coverage:
  - id: D1
    description: "readOnly prop added to OrderDetailScreen, defaulting to false; shipped call sites unchanged"
    requirement: "HIST-05"
    verification:
      - kind: unit
        ref: "src/__tests__/screen-detail.test.jsx#ACT-04: print receipt from Order Detail screen (both tests)"
        status: pass
      - kind: unit
        ref: "src/__tests__/screen-detail.test.jsx#readOnly mode > readOnly omitted renders exactly as shipped"
        status: pass
    human_judgment: false
  - id: D2
    description: "readOnly hides timeline, notes card, Call customer, items card, thermal rail, print buttons, Advance, Cancel; back label switches to h_back_to_history"
    requirement: "HIST-05"
    verification:
      - kind: unit
        ref: "src/__tests__/screen-detail.test.jsx#readOnly mode > readOnly hides timeline, notes card, Call customer, items card, thermal rail, print buttons, Advance, Cancel"
        status: pass
    human_judgment: false
  - id: D3
    description: "Advance and Cancel hidden unconditionally under readOnly regardless of order.state (non-terminal 'new' state included)"
    requirement: "HIST-05"
    verification:
      - kind: unit
        ref: "src/__tests__/screen-detail.test.jsx#readOnly mode > readOnly hides Advance and Cancel unconditionally, even for a non-terminal order state"
        status: pass
    human_judgment: false
  - id: D4
    description: "Customer name and phone still render under readOnly"
    requirement: "HIST-05"
    verification:
      - kind: unit
        ref: "src/__tests__/screen-detail.test.jsx#readOnly mode > readOnly still renders customer name and phone"
        status: pass
    human_judgment: false
  - id: D5
    description: "Outer grid collapses from '1fr 380px' to '1fr' when order.items is null"
    requirement: "HIST-05"
    verification:
      - kind: unit
        ref: "src/__tests__/screen-detail.test.jsx#readOnly mode > readOnly with items-less order collapses the outer grid to a single 1fr column"
        status: pass
    human_judgment: false
  - id: D6
    description: "Minimal totals card renders status/type/payment chips, local time, and a single total line (t('total') + formatRON(order.total))"
    requirement: "HIST-05"
    verification:
      - kind: unit
        ref: "src/__tests__/screen-detail.test.jsx#readOnly mode > readOnly renders the minimal totals card: total label + formatted RON total"
        status: pass
    human_judgment: false

# Metrics
duration: 9min
completed: 2026-07-17
status: complete
---

# Phase 07 Plan 05: OrderDetailScreen readOnly Mode Summary

**Extended `src/screen-detail.jsx` with a `readOnly` prop that turns the shipped live-order detail
surface into a read-only archive view — no timeline, no mutating controls, no thermal ticket, a
history-flavored back label, and a minimal totals card in place of the itemized receipt.**

## Performance

- **Duration:** 9 min
- **Started:** 2026-07-17T01:33:00Z
- **Completed:** 2026-07-17T01:42:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- `readOnly = false` added to `OrderDetailScreen`'s existing prop list; every shipped call site
  (`app.jsx:227`) stays behaviorally byte-identical — verified by the pre-existing ACT-04 print
  tests passing untouched.
- Every mutating or unavailable region (timeline, notes card, Call customer, items card + thermal
  rail, print buttons, Advance, Cancel) is now gated: hidden unconditionally under `readOnly`,
  regardless of the order's derived state.
- Back button label switches to `t('h_back_to_history')` under `readOnly`, reusing Plan 02's i18n
  key; the `onBack` callback mechanism itself is unchanged.
- New minimal totals card fills the slot the items card vacates: status chip + type chip + payment
  chip + local time + a single total line, using only fields `AdminOrder` actually carries (no
  fabricated subtotal/tax/discount breakdown).
- Outer grid collapses from `'1fr 380px'` to `'1fr'` when `order.items` is null — no empty 380px
  column remains.
- `src/__tests__/screen-detail.test.jsx` extended with a `describe('readOnly mode')` block (6 new
  tests) covering every behavior from both tasks; the pre-existing shipped tests were left
  untouched (git diff shows insertions only).

## Task Commits

Each task was committed atomically:

1. **Task 1: Add the readOnly prop and gate every mutating/unavailable region** - `65d54ea` (feat)
2. **Task 2: Add the minimal totals card in the slot the items card vacates** - `29d940e` (test)

**Plan metadata:** committed separately (see final commit below)

## Files Created/Modified
- `src/screen-detail.jsx` - Added `readOnly` prop; gated timeline, notes card, Call customer
  button, items card + thermal rail (and the outer grid's `gridTemplateColumns`), print buttons,
  Advance, and Cancel behind `readOnly`; added the minimal totals card; back label now resolves
  `h_back_to_history` via `useT(lang)` when `readOnly`
- `src/__tests__/screen-detail.test.jsx` - Added a `readOnly mode` describe block with 6 new tests
  covering the shipped-default regression path, full region gating, unconditional Advance/Cancel
  hiding, customer name/phone rendering, grid collapse, and the minimal totals card content

## Decisions Made
- `order.items != null` chosen as the single gating condition for the items card + thermal rail +
  grid collapse (equivalent to `!readOnly` per the plan's guidance to "pick one and use it
  consistently" for that specific region); `!readOnly` used directly everywhere else (timeline,
  notes, call-customer, print buttons, Advance, Cancel) since those regions have no independent
  `items`-based signal.
- No new CSS class or i18n key was needed for the totals card — reused existing `card`/`chip`
  classes, `orderTimeLabel`, `formatRON`, and the pre-existing `total` key.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `readOnly` prop and its full region-gating contract are in place and test-covered; Plan 06's
  `app.jsx` router work can now wire the History call site with
  `<OrderDetailScreen readOnly onBack={() => setScreen('history')} />`.
- No `getOrder(id)` fetch was introduced (D-08 respected) — the next detail-view phase will extend
  this same `readOnly` surface with the additional itemized fields rather than replace it.
- Full test suite: 242 passing / 3 failing (pre-existing, unrelated failures logged in
  `deferred-items.md` — baseline was 236/3, no new failures introduced, 6 new tests added).

---
*Phase: 07-history-screen-foundation*
*Completed: 2026-07-17*

## Self-Check: PASSED
- FOUND: src/screen-detail.jsx
- FOUND: src/__tests__/screen-detail.test.jsx
- FOUND: 65d54ea (Task 1 commit)
- FOUND: 29d940e (Task 2 commit)
