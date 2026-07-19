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

## 09-02 finding: plan's "no test asserts on h_empty" premise is false — reported, not patched

- **Plan text (09-02-PLAN.md `<verification>`):** "This plan removes a key that screen-history.jsx
  still reads at this wave; the suite must still pass because no existing test asserts on that key's
  text. If a test does fail on it, that is the signal that the consumer change cannot wait for 09-04 —
  report rather than patching the consumer here."
- **Finding:** That premise is false. Confirmed by running `npx vitest run` against the original
  (pre-plan) `src/i18n.jsx` via `git show HEAD:src/i18n.jsx` — baseline is exactly the 3 pre-existing
  failures documented above (build-pipeline.test.js × 1, offline-buttons.test.jsx × 2), 346 passing.
  With the 09-02 rename applied, 4 additional tests fail, all asserting the literal removed string
  `'Nicio comandă în ultimele 30 de zile.'`:
  - `src/__tests__/screen-history.test.jsx:83` — "successfully loaded empty list renders empty copy
    and computed zeros, not dashes"
  - `src/__tests__/screen-history.test.jsx:97` — "data containing only in-flight orders renders the
    empty state (D-01)"
  - `src/__tests__/app-history-route.test.jsx:175` — "screen === history renders HistoryScreen inside
    the Shell"
  - `src/__tests__/app-history-route.test.jsx:193` — "rehydrate backstop: history-detail with
    historyOrder null redirects to history (not blank)"
- **Action taken (per the plan's explicit instruction):** Not patched here. `screen-history.jsx` (the
  consumer) and these four test assertions are out of this plan's `files_modified` scope
  (`src/i18n.jsx`, `src/styles.css` only) and are owned by 09-04, which already `depends_on: [09-02]`
  per the plan's `key_links`. Full-suite `npx vitest run` after this plan's commits: 7 failed / 342
  passed (3 pre-existing + these 4).
  Implication for 09-04: it must update these four assertions' expected text to the composed
  `h_empty_prefix` + period-phrase + full-stop string (D-13) as part of updating `screen-history.jsx`'s
  `EmptyBlock`, not just the component itself — the plan's task list only mentions the component
  render output, not the pre-existing test file updates. Flagging so 09-04's plan step doesn't miss it.
