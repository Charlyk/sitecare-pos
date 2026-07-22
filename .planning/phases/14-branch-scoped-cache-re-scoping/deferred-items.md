# Phase 14 — Deferred Items

Logged during Plan 14-02 execution; reconciled at the phase-level post-merge test gate.

1. **`src/__tests__/offline-buttons.test.jsx`** — status: resolved.
   Root cause: Plan 14-01 (commit `93083f9`) hoisted `useQueryClient()` to the `OrdersScreen`
   top level for branch-scoped invalidation, but this test rendered `OrdersScreen` without a
   `QueryClientProvider`, so the hook threw `No QueryClient set`. This was an **in-phase
   regression introduced by Phase 14**, NOT a pre-existing failure (the earlier 14-02 note
   mislabeled it). Fixed at the post-merge gate by wrapping both `OrdersScreen` renders in the
   standard `QueryClientProvider` wrapper convention (commit `0a33570`). 3/3 tests now pass.

2. **`src/__tests__/build-pipeline.test.js`** — status: deferred (genuinely pre-existing).
   `bundle.createUpdaterArtifacts` is `"v1Compatible"` (a string) in `src-tauri/tauri.conf.json`,
   but the test asserts `.toBe(true)`. Verified pre-existing: neither the test file nor
   `tauri.conf.json` changed between the phase-start commit (`bc2e75c`) and phase completion
   (`git log bc2e75c..HEAD` for both paths is empty). Entirely unrelated to branch-scoped cache
   work. Not fixed in Phase 14 — out of scope; belongs to build-pipeline/updater config, not
   SCOPE-01. Full suite is 541/542 with this as the sole remaining failure.
