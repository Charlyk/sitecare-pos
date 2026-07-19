# Deferred Items — Phase 07 (History Screen Foundation)

Out-of-scope discoveries logged during execution (not fixed, per deviation-rules scope boundary).

## Plan 07-01

- **Pre-existing test failures unrelated to this plan's changes** (observed during `npx vitest run`
  full-suite check after Task 2/3):
  - `src/__tests__/build-pipeline.test.js` — `bundle.createUpdaterArtifacts` assertion fails against
    current `src-tauri/tauri.conf.json`. Last touched in commit `d096cdd` (unrelated topbar refactor).
  - `src/__tests__/offline-buttons.test.jsx` (2 tests) — `OrdersScreen` throws "No QueryClient set, use
    QueryClientProvider to set one" during render; test harness is missing a `QueryClientProvider`
    wrapper. Last touched in commit `8b57205` (Reîmprospătează wiring), unrelated to `history-utils.js`
    or `normalizeOrder`.
  - Neither file was read, imported, or modified by Plan 07-01 (`history-utils.js`,
    `history-utils.test.js`, `data.jsx`'s single-line `dailyOrderNumber` change, or
    `normalize-order.test.js`). Confirmed pre-existing via `git log` on the affected files.
  - Not fixed per deviation-rules scope boundary ("Only auto-fix issues DIRECTLY caused by the
    current task's changes"). Flagged here for a future phase/quick-task to address.
