# Deferred Items — Phase 17

Out-of-scope issues discovered during execution, logged per the executor's scope-boundary rule
(not fixed — unrelated to the current task's changes).

## 17-01

- **`src/__tests__/build-pipeline.test.js` — `BILD-04 bundle.createUpdaterArtifacts is true`**
  fails on the full suite run (`npx vitest run`). Pre-existing, unrelated to this plan: commit
  `f1d533d fix: use v1Compatible updater artifacts so macOS gets .app.tar.gz` changed
  `tauri.conf.json`'s `bundle.createUpdaterArtifacts` from `true` to the string `"v1Compatible"`
  for a documented macOS packaging reason, but the assertion in `build-pipeline.test.js` was never
  updated to match. No files this plan touches (`src/main.jsx`, `src/use-branches.js`,
  `src/i18n.jsx`, `src/shell.jsx`) relate to the build pipeline or `tauri.conf.json`. Not fixed
  here per the scope-boundary rule; flagged for a future build-pipeline plan or quick task.
