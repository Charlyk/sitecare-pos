---
phase: 07-history-screen-foundation
plan: 01
subsystem: history-derivation
tags: [history-utils, normalize-order, tdd, pure-functions]
dependency-graph:
  requires: []
  provides:
    - src/history-utils.js (getLast30DaysRange, filterFinishedOrders, deriveDisplayStatus, groupOrdersByDay, computeSummary)
    - normalizeOrder AdminOrder.dailyNumber fallback
  affects:
    - src/use-history-orders.js (Plan 07-03, consumes getLast30DaysRange)
    - src/screen-history.jsx (Plan 07-04, consumes groupOrdersByDay/computeSummary)
tech-stack:
  added: []
  patterns:
    - Pure derivation module with zero React/SDK imports (Nyquist Wave-0 target)
    - Local-Date-getter day bucketing (never ISO-string slice, avoids UTC misfiling near midnight)
key-files:
  created:
    - src/history-utils.js
    - src/__tests__/history-utils.test.js
    - src/__tests__/normalize-order.test.js
    - .planning/phases/07-history-screen-foundation/deferred-items.md
  modified:
    - src/data.jsx
decisions:
  - "normalizeOrder's dailyOrderNumber fallback chain extended to o.dailyOrderNumber ?? o.dailyNumber ?? o.id — additive only, kitchen Order path unchanged (D-05)"
  - "history-utils.js stays pure: no react/data.jsx/@charlyk imports, no re-division by 100, no UTC-slicing day keys"
metrics:
  duration: "~2 minutes"
  completed: 2026-07-17
status: complete
---

# Phase 7 Plan 01: History Utils Foundation Summary

Built the pure, React-free derivation layer (`src/history-utils.js`) that every later Phase 7 plan
depends on for day-grouping, status derivation, and summary math — plus fixed the `dailyNumber` vs
`dailyOrderNumber` field-name mismatch at the single shared `normalizeOrder()` chokepoint in
`src/data.jsx`.

## What Was Built

- **`src/history-utils.js`** — five pure named exports: `getLast30DaysRange`, `filterFinishedOrders`,
  `deriveDisplayStatus`, `groupOrdersByDay`, `computeSummary`, plus a module-private `localDayKey`
  helper. No default export, no imports from `react`, `data.jsx`, or `@charlyk/admin-client`.
- **`src/__tests__/history-utils.test.js`** — 27 tests across 5 `describe` blocks covering every
  behavior in the plan's contract, including the local-midnight boundary edge case, tie-stability,
  empty/single-order inputs, and the all-canceled-day zero-revenue case.
- **`src/data.jsx`** — one additive line change: `dailyOrderNumber: o.dailyOrderNumber ?? o.dailyNumber ?? o.id`.
  Uses `??` (not `||`) so a legitimate `dailyNumber: 0` is preserved. Diff is exactly 1 insertion / 1
  deletion, per acceptance criteria.
- **`src/__tests__/normalize-order.test.js`** — 6 tests covering the fallback chain: AdminOrder shape,
  kitchen Order shape (unchanged), both-present precedence, null fallthrough, absent fallthrough, and
  the `0`-is-not-nullish case.

## Task Execution (RED/GREEN/REFACTOR)

1. **Task 1 (RED):** `history-utils.test.js` written first; failed because `src/history-utils.js`
   did not exist. Commit `81e2023`.
2. **Task 2 (GREEN):** `src/history-utils.js` implemented; all 27 tests pass. Commit `5e1f5fd`.
3. **Task 3 (single commit, additive fix + tests):** the `data.jsx` one-line change and its
   `normalize-order.test.js` were committed together — the plan's own `<action>` instructed writing
   the fix and its test in the same task, since this is a single-line additive change to an existing
   function rather than a from-scratch RED/GREEN cycle. Commit `4fc82a6`.

## Verification

- `npx vitest run src/__tests__/history-utils.test.js` — 27/27 passed
- `npx vitest run src/__tests__/normalize-order.test.js` — 6/6 passed
- `npx vitest run` (full suite) — 213/216 passed; the 3 failures are pre-existing and unrelated to
  this plan (see Deviations below)
- `grep -c "^export function\|^export const" src/history-utils.js` → 5
- `grep -c "export default" src/history-utils.js` → 0
- No `react`/`data.jsx`/`@charlyk` imports, no `/100` re-conversion, no `slice(0, 10)` UTC bucketing
  in `history-utils.js`
- `git diff --stat src/data.jsx` → exactly 1 insertion, 1 deletion

## Deviations from Plan

### Auto-fixed Issues

None — plan executed exactly as written for the in-scope files.

### Out-of-Scope Discoveries (logged, not fixed)

**3 pre-existing test failures unrelated to this plan**, surfaced by the full-suite verification
step (`npx vitest run`):

- `src/__tests__/build-pipeline.test.js` — `bundle.createUpdaterArtifacts` assertion fails against
  the current `src-tauri/tauri.conf.json`. Last touched in commit `d096cdd` (unrelated topbar
  refactor), not this plan.
- `src/__tests__/offline-buttons.test.jsx` (2 tests) — `OrdersScreen` throws "No QueryClient set, use
  QueryClientProvider to set one" during render; missing a `QueryClientProvider` wrapper in the test
  harness. Last touched in commit `8b57205` (Reîmprospătează wiring), not this plan.

Neither file was read or modified by this plan. Confirmed pre-existing via `git log` on the affected
files before verification. Per deviation-rules scope boundary, these were logged to
`.planning/phases/07-history-screen-foundation/deferred-items.md` and NOT fixed — they are out of
scope for Plan 07-01.

## TDD Gate Compliance

- RED gate: commit `81e2023` (`test(07-01): add failing unit tests for history-utils`) — confirmed
  RED (module-not-found error).
- GREEN gate: commit `5e1f5fd` (`feat(07-01): implement history-utils.js...`) — confirmed GREEN
  (27/27 passing).
- Task 3 combined a single-line additive fix with its test in one commit (`4fc82a6`) per the plan's
  explicit `<action>` instruction rather than a separate RED-then-GREEN pair; this is a deliberate
  plan design choice for a one-line `??`-chain extension, not a gate-sequence gap.

## Known Stubs

None — this plan produces no UI-facing output; all five exports are fully implemented pure functions
with no placeholder/mock data paths.

## Threat Flags

None — this plan's threat register items (T-07-01 timestamp guard, T-07-02 additive-diff pin,
T-07-03 revenue-agreement pin) were all implemented and verified via the acceptance criteria above;
no new surface beyond what `<threat_model>` already anticipated.

## Self-Check: PASSED

- FOUND: src/history-utils.js
- FOUND: src/__tests__/history-utils.test.js
- FOUND: src/__tests__/normalize-order.test.js
- FOUND: .planning/phases/07-history-screen-foundation/deferred-items.md
- FOUND commit: 81e2023
- FOUND commit: 5e1f5fd
- FOUND commit: 4fc82a6
