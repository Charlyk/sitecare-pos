# Deferred Items — Phase 10 (Filters + Search)

Pre-existing test failures observed during `10-01` execution's full-suite `npx vitest run`.
Out of scope per the executor's SCOPE BOUNDARY rule (not caused by 10-01's changes to
`src/history-utils.js`, `src/__tests__/history-utils.test.js`, or `src/i18n.jsx`; confirmed
present on `master` before 10-01's commits by re-running the same two test files against a
stashed working tree).

| Test file | Failing test(s) | Notes |
|-----------|-----------------|-------|
| `src/__tests__/build-pipeline.test.js` | `BILD-04 — tauri.conf.json updater configuration > bundle.createUpdaterArtifacts is true` | Unrelated to History screen; build-pipeline config assertion |
| `src/__tests__/offline-buttons.test.jsx` | `U12 — mutating buttons ... isOffline=true (OFF-03) > OrdersScreen: action buttons are disabled when isOffline=true`, `... are NOT disabled when isOffline=false` | Unrelated to History screen; Orders screen offline-button rendering |

Not fixed by this plan. Flagging for awareness — a future phase or maintenance pass should
investigate.
