# Deferred Items — Phase 15

Out-of-scope discoveries logged during 15-01 execution (not fixed — outside this plan's `files_modified`).

## Pre-existing failing test: build-pipeline.test.js

- **File:** `src/__tests__/build-pipeline.test.js`
- **Test:** `BILD-04 — tauri.conf.json updater configuration > bundle.createUpdaterArtifacts is true`
- **Issue:** `conf?.bundle?.createUpdaterArtifacts` is `'v1Compatible'` (string), not `true` (boolean). This is a `tauri.conf.json` config value mismatch unrelated to SSE/branch work.
- **Found during:** 15-01 full-suite verification (`npx vitest run`) after Task 3.
- **Scope:** Not touched — `tauri.conf.json` and `build-pipeline.test.js` are not in this plan's `files_modified` (`src/use-sse.js`, `src/__tests__/use-sse.test.js`). Pre-dates this plan (introduced in `7d00bcd`, Phase 6).
- **Action:** Not fixed. Flagging for a future Phase 6 tech-debt pass or explicit user triage.
