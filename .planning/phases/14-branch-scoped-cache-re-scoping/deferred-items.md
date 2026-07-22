# Phase 14 — Deferred Items (out of scope for Plan 14-02)

Logged during Plan 14-02 execution. Full-suite `npx vitest run` shows 2 pre-existing failing
test files, both confirmed via `git diff 17b4c00 HEAD` to be untouched by any Plan 14-02 commit
(17b4c00 is the tip of Plan 14-01, before this plan's changes):

1. **`src/__tests__/offline-buttons.test.jsx`** — 2 failures: `OrdersScreen` renders without a
   `QueryClientProvider` wrapper in this test file, but `screen-orders.jsx` started calling
   `useQueryClient()` in Plan 14-01 (commit `93083f9`) to support branch-scoped invalidation.
   The test file itself was never updated to wrap `OrdersScreen` in a `QueryClientProvider`.
   Out of scope for 14-02 (touches `screen-orders.jsx`/its test, not the 3 hooks this plan owns).

2. **`src/__tests__/build-pipeline.test.js`** — 1 failure: `bundle.createUpdaterArtifacts`
   expected `true`, got `undefined`/other in `tauri.conf.json`. Unrelated to branch-scoped
   cache work entirely; pre-existing config drift.

Both are pre-existing conditions, not introduced by Plan 14-02's `src/use-order-detail.js`,
`src/use-stats.js`, `src/use-menu.js`, or their new test files. Not fixed here per the
executor's scope-boundary rule (fix only issues directly caused by the current task's changes).
