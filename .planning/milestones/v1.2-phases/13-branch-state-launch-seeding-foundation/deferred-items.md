# Deferred Items — Phase 13

Discovered during execution of 13-02 (useBranches hook). Out of scope for this plan (not caused by this plan's changes) — logged, not fixed.

## Pre-existing test failures (unrelated to 13-02)

- `src/__tests__/build-pipeline.test.js` — `bundle.createUpdaterArtifacts` expected `true`, config has different value. Last touched in commits predating Phase 13 (tauri.conf.json / build pipeline concern, unrelated to branches).
- `src/__tests__/offline-buttons.test.jsx` — `OrdersScreen` throws `No QueryClient set, use QueryClientProvider to set one` at `src/screen-orders.jsx:164`. Pre-existing test harness gap (missing QueryClientProvider wrapper in that test file), unrelated to `src/use-branches.js`.

Both failures pre-date this plan (confirmed via `git log` on `src/screen-orders.jsx` and the two test files — last touched by Phase 10/earlier commits). Not caused by, or fixable within scope of, 13-02.
