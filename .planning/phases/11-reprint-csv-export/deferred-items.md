# Deferred Items — Phase 11

Out-of-scope discoveries logged during plan execution. Not fixed — outside the scope boundary of the task that found them.

## From 11-01 (plugin-dialog + plugin-fs install)

Both discovered while running `npx vitest run` as this plan's verification step. Neither test file references `dialog`/`fs`/`writeTextFile`, neither was touched by this plan's diff (`package.json`, `package-lock.json`, `src-tauri/Cargo.toml`, `src-tauri/Cargo.lock`, `src-tauri/src/lib.rs`, `src-tauri/capabilities/default.json`), and `src-tauri/tauri.conf.json` has zero working-tree diff — confirming both are pre-existing, unrelated to the plugin install.

1. **`src/__tests__/build-pipeline.test.js` — `BILD-04 — bundle.createUpdaterArtifacts is true`**
   - Expects `conf?.bundle?.createUpdaterArtifacts` to be `true`; committed `tauri.conf.json` has it set to the string `"v1Compatible"` instead.
   - Last touched by `7d00bcd test(06-01): add 12 failing build-pipeline stubs (RED gate)` — predates this session.

2. **`src/__tests__/offline-buttons.test.jsx` — `U12 — mutating buttons have disabled attribute ... (OFF-03)`** (2 assertions)
   - `OrdersScreen` throws `No QueryClient set, use QueryClientProvider to set one` — the test renders `OrdersScreen` without wrapping it in a `QueryClientProvider`.
   - Last touched by `7d00bcd` as well — predates this session.

**Suite status after 11-01:** 444 passed / 3 failed (447 total). The 3 failures above are pre-existing and unrelated to this plan's four-file plugin lockstep (no runtime import of the new plugins was added in this plan).
