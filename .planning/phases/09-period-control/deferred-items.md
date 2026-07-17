# Deferred Items — Phase 09

## Pre-existing failures out of scope for 09-01

- `src/__tests__/offline-buttons.test.jsx` — 2 tests in the "U12 — mutating buttons have disabled
  attribute and .btn-disabled-offline class when isOffline=true (OFF-03)" describe block fail with
  `Error: No QueryClient set, use QueryClientProvider to set one` inside `OrdersScreen`
  (`src/screen-orders.jsx:164`). Neither file is touched by 09-01 (which only modifies
  `src/history-utils.js` and `src/__tests__/history-utils.test.js`). Last touched by
  `7f640b3` (test scaffold) and `8b57205` (Reîmprospătează wiring), both unrelated to this plan.
  Confirmed pre-existing via `npx vitest run` full-suite run before and after this plan's changes —
  identical 3 failures / 346 passing baseline either way. Out of scope per the executor's scope
  boundary; not auto-fixed.
