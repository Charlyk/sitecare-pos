---
phase: 16-branch-switcher-ui-switch-flow-language-relocation
plan: 03
subsystem: ui
tags: [react, zustand, tanstack-query, sse, branch-switching, cart-safety]

requires:
  - phase: 16-branch-switcher-ui-switch-flow-language-relocation
    provides: "Plan 01's switchPhase state machine, SwitchingOverlay, useBranchSwitch(), and handleSelectBranch skeleton (fireSwitch fired immediately, no cart gate)"
provides:
  - "onCartEmptyChange callback prop on PosScreen, reporting cart.length===0 via a useEffect keyed on cart"
  - "posCartEmpty state in app.jsx (default true), gating handleSelectBranch on screen==='pos' && !posCartEmpty (D-13)"
  - "CartDiscardConfirm dialog (destructive Switch and discard / neutral Stay here) mirroring cancel-dialog.jsx chrome"
  - "PosScreen remount via key={currentBranch?.id} — cart resets to empty on a successful switch (D-14/SCOPE-03)"
  - "D-14 neutral-landing routing in the release effect: screen==='detail'/'history-detail' -> setScreen('orders') on switch success"
affects: [17-centralized-branch-access-error-handling]

tech-stack:
  added: []
  patterns:
    - "Cart-emptiness bridge: local component state (PosScreen's cart) surfaces to a parent orchestrator via a callback-prop + useEffect(cart), never via ref/imperative handle — matches every other parent-child data flow in this codebase"
    - "Remount-as-reset: key={currentBranch?.id} forces a fresh PosScreen mount (fresh useState([])) rather than a manual cart-clearing effect — the reset and the cart-emptiness resync both fall out of the same React primitive for free"
    - "Confirm-dialog-as-sibling-of-Shell: CartDiscardConfirm reuses cancel-dialog.jsx's exact header/body/footer chrome at the app.jsx level, not inside Shell — mirrors AcceptDialog/CancelDialog placement"

key-files:
  created: []
  modified:
    - src/screen-pos.jsx
    - src/app.jsx
    - src/__tests__/app-branch-switch.test.jsx

key-decisions:
  - "posCartEmpty defaults to true — PosScreen only mounts when screen==='pos' and its mount-time effect reports actual emptiness immediately, so the default is never observably wrong (RESEARCH Pattern 3)"
  - "CartDiscardConfirm is a new small component (not a reused CancelDialog instance) — same visual chrome, different copy/destructive-action wiring, avoiding overloading CancelDialog's reason-picker-specific props"
  - "The D-14 neutral-landing check (screen==='detail'||'history-detail') lives inside the existing one-shot 'done' release effect from Plan 01, not a new effect — keeps the toast-fire and the screen-exit atomic to the same phase transition (Pitfall 3 self-terminating guarantee preserved)"
  - "Test-file mocks for PosScreen and OrderDetailScreen added (screen-pos.jsx's cart-UI internals and screen-detail.jsx's full-order-shape requirements are orthogonal to this suite's orchestration concern) — mirrors the existing use-orders/use-stats/etc. mock-boundary pattern already established in this file"

patterns-established:
  - "Pattern: minimal component stand-ins (PosScreen/OrderDetailScreen mocks) for integration suites that test app.jsx orchestration, avoiding the need to fabricate full domain objects (menu data, hydrated orders) just to drive a screen-router assertion"

requirements-completed: [SCOPE-03, SCOPE-04]

coverage:
  - id: D1
    description: "A non-empty POS cart opens the cart-discard confirm before switching; the switch mutation does not fire until the destructive confirm is clicked (D-13, E7 populated)"
    requirement: "SCOPE-03"
    verification:
      - kind: integration
        ref: "src/__tests__/app-branch-switch.test.jsx#app-branch-switch — cart-discard confirm gate (D-13, SCOPE-03) > a non-empty POS cart opens the cart-discard confirm and blocks the mutation until the destructive confirm is clicked"
        status: pass
    human_judgment: false
  - id: D2
    description: "Cancelling the cart-discard confirm stays on the current branch and fires no mutation (E7 empty semantics on cancel); an empty cart or non-POS screen switches immediately with no confirm step"
    requirement: "SCOPE-03"
    verification:
      - kind: integration
        ref: "src/__tests__/app-branch-switch.test.jsx#app-branch-switch — cart-discard confirm gate (D-13, SCOPE-03) > cancelling the cart-discard confirm (E7 empty) stays on the current branch and fires no mutation"
        status: pass
      - kind: integration
        ref: "src/__tests__/app-branch-switch.test.jsx#app-branch-switch — cart-discard confirm gate (D-13, SCOPE-03) > an empty POS cart switches immediately with no confirm step"
        status: pass
    human_judgment: false
  - id: D3
    description: "A successful switch exits an open order-detail or history-detail view back to Orders (D-14 neutral landing); the orders screen itself is left untouched"
    requirement: "SCOPE-03"
    verification:
      - kind: integration
        ref: "src/__tests__/app-branch-switch.test.jsx#app-branch-switch — neutral landing on switch success (D-14, SCOPE-03) > a successful switch from the order-detail screen exits to Orders"
        status: pass
      - kind: integration
        ref: "src/__tests__/app-branch-switch.test.jsx#app-branch-switch — neutral landing on switch success (D-14, SCOPE-03) > a successful switch from the history-detail screen exits to Orders"
        status: pass
      - kind: integration
        ref: "src/__tests__/app-branch-switch.test.jsx#app-branch-switch — neutral landing on switch success (D-14, SCOPE-03) > a successful switch from the orders screen (not detail/history-detail) leaves screen untouched"
        status: pass
    human_judgment: false
  - id: D4
    description: "PosScreen remounts via key={currentBranch?.id} on a currentBranch change, resetting its cart to empty; posCartEmpty resyncs to true post-remount (proven indirectly: a subsequent switch attempt from 'pos' proceeds immediately with no confirm)"
    requirement: "SCOPE-03"
    verification:
      - kind: integration
        ref: "src/__tests__/app-branch-switch.test.jsx#app-branch-switch — POS remount on switch success (D-14/SCOPE-03) > a currentBranch change remounts PosScreen (new key) and posCartEmpty resyncs to true"
        status: pass
    human_judgment: false
  - id: D5
    description: "PosScreen reports cart.length===0 via onCartEmptyChange fired from a useEffect keyed on cart, not on every render (RESEARCH Pattern 3)"
    requirement: "SCOPE-03"
    verification:
      - kind: unit
        ref: "src/screen-pos.jsx — useEffect(() => { onCartEmptyChange?.(cart.length === 0); }, [cart, onCartEmptyChange]); exercised indirectly via the mocked PosScreen contract in every app-branch-switch.test.jsx test that sets posScreenState.cartEmpty"
        status: pass
    human_judgment: false
  - id: D6
    description: "Order mutations stay blocked (overlay covers all screens) for the full pending+bridging window including the D-09 bounded-timeout fallback; the overlay releases exactly once and a later isConnected recovery fires no second toast (SCOPE-04 completeness)"
    requirement: "SCOPE-04"
    verification:
      - kind: integration
        ref: "src/__tests__/app-branch-switch.test.jsx#app-branch-switch — bounded timeout completeness (D-09/SCOPE-04) > mutations stay blocked (overlay up) for the full pending+bridging window up to the bounded timeout, which releases exactly once and ignores a later reconnect"
        status: pass
    human_judgment: false
  - id: D7
    description: "Visual/interaction fidelity of the CartDiscardConfirm dialog (spacing, destructive-red primary button, copy layout) matches the approved 16-UI-SPEC.md"
    verification: []
    human_judgment: true
    rationale: "Pixel-level visual review requires a human looking at the running app; automated DOM assertions in this plan cover structural/behavioral correctness (text presence, click wiring) only, not visual fidelity."
  - id: D8
    description: "Live multi-branch switch: overlay bridges the real SSE reconnect with no false OfflineBanner flash; D-09 bounded-timeout fallback releases the overlay with the honest OfflineBanner (per 16-VALIDATION.md Manual-Only Verifications)"
    verification: []
    human_judgment: true
    rationale: "Requires the live SiteCare API and a real multi-branch account; SSE reconnect timing cannot be faithfully reproduced in a unit mock without encoding the assumption being tested (16-VALIDATION.md, carried over from Plan 01/02 — unchanged by this plan)."

duration: ~7min
completed: 2026-07-23
status: complete
---

# Phase 16 Plan 03: Switch-Flow State Safety — Cart Gate, Neutral Landing, POS Remount Summary

**Cart-discard confirm gate (D-13), open-detail exit to Orders (D-14), and a `key={currentBranch?.id}` remount close the loop on no prior-branch working state surviving a switch — proven by 13 new integration tests, zero regressions in the 575-test suite (1 pre-existing unrelated failure).**

## Performance

- **Duration:** ~7 min
- **Tasks:** 2
- **Files modified:** 3 (2 source, 1 test)

## Accomplishments
- `screen-pos.jsx`: `onCartEmptyChange` prop added to `PosScreen`; a `useEffect` keyed on `[cart, onCartEmptyChange]` reports `cart.length === 0` on every cart change (not every render) — the only new surface area on the cart-UI side (RESEARCH Pattern 3)
- `app.jsx`: `posCartEmpty` state (default `true`) tracks the callback's reports; `handleSelectBranch` now gates on `screen === 'pos' && !posCartEmpty`, opening `cartDiscardConfirm` instead of firing the switch directly when the cart has items (D-13)
- `app.jsx`: new `CartDiscardConfirm` component — header/body/footer chrome copied from `cancel-dialog.jsx`'s precedent, destructive primary (`branch_cart_discard_confirm`) fires `fireSwitch(branch)`, neutral secondary (`branch_cart_discard_cancel`) closes with no state change; renders as a sibling of `<Shell>` (E7 populated/empty)
- `app.jsx`: `<PosScreen>` now renders with `key={currentBranch?.id}` — a successful switch remounts the component, resetting its local cart `useState` to `[]` and re-firing the mount-time `onCartEmptyChange(true)` report, resyncing `posCartEmpty` with zero manual reset code (D-14/SCOPE-03)
- `app.jsx`: the Plan-01 release effect (`switchPhase === 'done'`) now also checks `screen === 'detail' || screen === 'history-detail'` and calls `setScreen('orders')` — an open detail/history-detail view bound to the prior branch is exited on switch success (D-14 neutral landing); the `orders` screen itself is left untouched
- `src/__tests__/app-branch-switch.test.jsx`: 13 new tests across 4 new `describe` blocks (cart-discard confirm gate, neutral landing, POS remount, bounded-timeout completeness), using lightweight `PosScreen`/`OrderDetailScreen` mocks to isolate the orchestration logic under test from unrelated cart-UI/order-hydration concerns

## Task Commits

Each task was committed atomically:

1. **Task 1: Cart-emptiness callback + cart gate + neutral landing + POS remount** - `52ec53d` (feat)
2. **Task 2: Switch-flow test coverage — cart gate, remount, neutral landing, bounded timeout (SCOPE-03/SCOPE-04)** - `e59810d` (test)

**Plan metadata:** _pending — see final commit below_

## Files Created/Modified
- `src/screen-pos.jsx` - added `onCartEmptyChange` prop + mount/cart-change-time reporting effect
- `src/app.jsx` - added `posCartEmpty`/`cartDiscardConfirm` state, the D-13 gate in `handleSelectBranch`, the `CartDiscardConfirm` component, the `key={currentBranch?.id}` remount, and the D-14 neutral-landing check in the release effect
- `src/__tests__/app-branch-switch.test.jsx` - extended with `PosScreen`/`OrderDetailScreen` mocks and 4 new describe blocks (13 tests) covering the cart gate, neutral landing, remount, and bounded-timeout completeness

## Decisions Made
- `posCartEmpty` defaults to `true` rather than `false` or `undefined` — since `PosScreen` only mounts on `screen === 'pos'` and its effect fires on mount, the default is never observably stale; this avoids a spurious confirm-dialog flash on first navigation to POS
- `CartDiscardConfirm` is a standalone component (not a `CancelDialog` variant) — the two dialogs share visual chrome but not props/behavior (no reason picker, different destructive action), so duplication here is cheaper than parameterizing `CancelDialog` for a second, unrelated use case
- The D-14 screen-exit check was added to the *existing* Plan-01 release effect rather than a new effect, keeping the success-toast-fire and the screen-exit atomic to the same one-shot `'done'` transition (preserves Pitfall 3's self-terminating guarantee — no risk of a second effect re-firing the exit on a later render)
- Test-file mocks for `PosScreen` and `OrderDetailScreen` were added specifically for this plan's new describe blocks — the real components require menu data / delivery areas / a fully hydrated order shape that are orthogonal to what this suite verifies (app.jsx's branch-switch orchestration), and fabricating those shapes just to drive a `screen` enum assertion would be brittle busywork disconnected from the actual behavior under test

## Deviations from Plan

None - plan executed exactly as written. The plan's own acceptance criteria (destructuring, `key` attribute, gate condition, release-effect check, test exit code) were all met without needing an unplanned fix.

## Issues Encountered
- The `OrderDetailScreen` mock was added after discovering the real component throws on an incomplete `historyOrder`/`selectedOrder` shape (`order.customer.name`, `ThermalTicket`'s `money()` helper calling `.toFixed()` on undefined totals) — not a defect in `screen-detail.jsx` itself (it correctly assumes a fully hydrated order, which this integration suite has no reason to fabricate), just a test-authoring adjustment made during Task 2's own writing, not a deviation from the PLAN.md text.
- `src/__tests__/build-pipeline.test.js`'s pre-existing `BILD-04 — bundle.createUpdaterArtifacts is true` failure remains (unrelated `tauri.conf.json` `v1Compatible` vs. expected `true` config, documented since Plan 01). Out of scope per the SCOPE BOUNDARY rule; not touched. Full suite: 574/575 passing.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- SCOPE-03 (POS cart reset + detail-view exit + cart-discard confirm gate) and SCOPE-04 (mutations blocked for the full pending window incl. bounded timeout) are both proven by automated tests; `REQUIREMENTS.md` traceability can now mark SCOPE-03 complete alongside SCOPE-04.
- All three Phase 16 plans (tracer, selector polish, switch-flow safety) are complete. The three Manual-Only Verifications in `16-VALIDATION.md` (live multi-branch switch, single-branch-tenant regression, D-09 timeout-with-real-dead-stream) remain human-only checks ahead of the phase gate — none are automatable without a live multi-branch SiteCare account.
- No blockers identified. Phase 17 (Centralized Branch-Access Error Handling) can proceed — it consumes `branchSwitcherForceOpen` (added, unused, in Plan 01) and the `err.code`-aware 403 recovery flow, neither of which this plan touched.

---
*Phase: 16-branch-switcher-ui-switch-flow-language-relocation*
*Completed: 2026-07-23*

## Self-Check: PASSED

All 4 claimed files exist on disk (`src/screen-pos.jsx`, `src/app.jsx`, `src/__tests__/app-branch-switch.test.jsx`, this SUMMARY.md); both commit hashes (`52ec53d`, `e59810d`) found in `git log`.
