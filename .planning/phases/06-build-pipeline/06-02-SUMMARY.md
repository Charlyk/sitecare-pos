---
phase: 06-build-pipeline
plan: 02
subsystem: auto-update
tags: [tauri-plugin-updater, tauri-plugin-process, use-updater, BILD-04, build-pipeline]

# Dependency graph
requires:
  - phase: 06-build-pipeline
    plan: 01
    provides: 12 failing RED-state tests (build-pipeline.test.js); BILD-04 module test is the green gate for this plan
provides:
  - src/use-updater.js: silent launch-only update check hook (D-05, D-06)
  - tauri-plugin-updater + tauri-plugin-process installed in Cargo.toml + package.json
  - Both plugins registered in lib.rs .plugin() chain
  - capabilities/default.json updated with updater:default and process:default
  - app.jsx wired: useUpdater() called in authenticated branch
affects:
  - 06-03-PLAN: tauri.conf.json must configure plugins.updater.endpoints, pubkey, bundle.createUpdaterArtifacts
  - 06-04-PLAN: CI workflow (release.yml) — no impact from this plan

# Tech tracking
tech-stack:
  added:
    - tauri-plugin-updater 2 (Rust, desktop-only)
    - tauri-plugin-process 2 (Rust)
    - "@tauri-apps/plugin-updater ^2.10.1 (npm)"
    - "@tauri-apps/plugin-process ^2.3.1 (npm)"
  patterns:
    - "window.__TAURI_INTERNALS__ guard: prevents plugin API calls outside Tauri webview (Vite dev safety)"
    - "useUpdater() inside authenticated branch: prevents relaunch() during cold-start auth init (Pitfall 7)"
    - "Silent update: check() → downloadAndInstall() → relaunch() with catch(console.warn) — no user prompt (D-05)"
    - "Launch-only check: empty deps array in useEffect — no periodic polling (D-06)"

key-files:
  created:
    - src/use-updater.js
  modified:
    - src-tauri/Cargo.toml
    - src-tauri/Cargo.lock
    - src-tauri/capabilities/default.json
    - src-tauri/capabilities/desktop.json
    - src-tauri/src/lib.rs
    - src/app.jsx
    - package.json
    - package-lock.json

key-decisions:
  - "tauri add CLI used (preferred path) — atomically updated Cargo.toml, package.json, and desktop.json"
  - "tauri add added updater:default to desktop.json; plan requires it in default.json too — both populated for full coverage"
  - "tauri_plugin_updater placed in platform-scoped [target.'cfg(not(any(target_os=\"android\", target_os=\"ios\")))'.dependencies] per tauri add behavior"
  - "No use tauri_plugin_updater::UpdaterExt import — update logic is JS-side per D-05/D-06"
  - "useUpdater() placed after if (!isAuthenticated) block — Pitfall 7: relaunch() during auth init would disrupt cold-start flow"

# Metrics
duration: 15min
completed: 2026-04-30
---

# Phase 6 Plan 02: Auto-Update Plugin Stack Summary

**tauri-plugin-updater and tauri-plugin-process installed, registered in Rust, wired to JS via use-updater.js silent launch-only hook, BILD-04 module test green**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-04-30
- **Completed:** 2026-04-30
- **Tasks:** 2 of 2
- **Files modified:** 8

## Accomplishments

- Installed `tauri-plugin-updater` (desktop-scoped) and `tauri-plugin-process` via `npm run tauri add` CLI — both plugins added atomically to Cargo.toml and package.json
- Registered both plugins in `lib.rs` `.plugin()` chain: `tauri_plugin_updater::Builder::new().build()` and `tauri_plugin_process::init()`
- Updated `capabilities/default.json` with `updater:default` and `process:default` (tauri CLI added `updater:default` to `desktop.json`; `default.json` manually updated to match plan spec)
- Created `src/use-updater.js` with silent launch-only update check: `window.__TAURI_INTERNALS__` guard, empty deps array (D-06), `check() → downloadAndInstall() → relaunch()` (D-05), errors swallowed via `console.warn`
- Wired `useUpdater()` import and call in `src/app.jsx` inside the authenticated branch (after `if (!isAuthenticated)` return, before the authenticated `return (` JSX)
- `cargo check` passes (1 pre-existing `dead_code` warning on `table` field — not introduced by this plan)
- BILD-04 module test (`use-updater.js exports useUpdater as a function`) is now green

## Task Commits

1. **Task 1: Install plugins and wire Rust + capabilities** — `77f75a0` (feat)
2. **Task 2: Create use-updater.js hook and wire into app.jsx** — `cbcdebf` (feat)

## Files Created/Modified

- `src/use-updater.js` — new file; 37 lines; exports `useUpdater()` with silent update check logic
- `src/app.jsx` — added import for `useUpdater` + call inside authenticated branch (5 lines added)
- `src-tauri/src/lib.rs` — two new `.plugin()` calls in `run()` function (tauri add + manual verification)
- `src-tauri/Cargo.toml` — added `tauri-plugin-process = "2"` (dependencies), `tauri-plugin-updater = "2"` (target-scoped)
- `src-tauri/Cargo.lock` — updated lock file for new crates
- `src-tauri/capabilities/default.json` — added `updater:default`, `process:default`
- `src-tauri/capabilities/desktop.json` — `updater:default` added by tauri CLI automatically
- `package.json` — added `@tauri-apps/plugin-updater ^2.10.1`, `@tauri-apps/plugin-process ^2.3.1`
- `package-lock.json` — updated lockfile

## Decisions Made

- `tauri add` CLI used (preferred over manual) — atomically modifies Cargo.toml, package.json, and capabilities in one shot; no partial-state risk
- `tauri add updater` added permission to `desktop.json` (platform-scoped capability), not `default.json`. Per plan spec, `default.json` requires both permissions — manually added to satisfy acceptance criteria
- No `use tauri_plugin_updater::UpdaterExt` import in lib.rs — update logic lives entirely in JS per D-05 and D-06 architectural decisions

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing capability] Added permissions to default.json in addition to desktop.json**
- **Found during:** Task 1 Step 2 (verify/fix capabilities)
- **Issue:** `tauri add updater` added `updater:default` to `desktop.json` (platform-scoped), not `default.json` (main capability file). The plan's acceptance criteria explicitly requires `grep -c '"updater:default"' src-tauri/capabilities/default.json` to output `1`.
- **Fix:** Manually added `updater:default` and `process:default` to `capabilities/default.json` permissions array
- **Files modified:** `src-tauri/capabilities/default.json`
- **Commit:** `77f75a0`

## Issues Encountered

None beyond the capability file placement deviation above (auto-fixed per Rule 2).

## User Setup Required

None — no secrets required by this plan. Plan 03 will configure `plugins.updater.pubkey` and `plugins.updater.endpoints` in `tauri.conf.json`; the pubkey (and corresponding private key for CI signing) require Apple Developer account setup before Plan 04 produces real release artifacts.

## Known Stubs

None — `use-updater.js` contains real implementation logic. No hardcoded empty values or placeholder text.

## Threat Flags

None — all new capabilities and plugin APIs are documented in the plan's threat model (T-06-02-01 through T-06-02-05). No new network surface beyond what was pre-approved in the plan.

## Self-Check

- [x] `src/use-updater.js` exists: `ls src/use-updater.js` — FOUND
- [x] `grep -c "export function useUpdater" src/use-updater.js` → 1
- [x] `grep -c "tauri_plugin_updater::Builder::new().build()" src-tauri/src/lib.rs` → 1
- [x] `grep -c "tauri_plugin_process::init()" src-tauri/src/lib.rs` → 1
- [x] `grep -c '"updater:default"' src-tauri/capabilities/default.json` → 1
- [x] `grep -c '"process:default"' src-tauri/capabilities/default.json` → 1
- [x] `grep -c "tauri-plugin-updater" src-tauri/Cargo.toml` → 1
- [x] `grep -c "tauri-plugin-process" src-tauri/Cargo.toml` → 1
- [x] `grep -c '"@tauri-apps/plugin-updater"' package.json` → 1
- [x] `grep -c '"@tauri-apps/plugin-process"' package.json` → 1
- [x] `grep -c "useUpdater()" src/app.jsx` → 1
- [x] useUpdater() at line 215, after if (!isAuthenticated) at line 193 — placement correct
- [x] `cargo check` exits 0 (1 pre-existing warning, no errors)
- [x] BILD-04 module test green: `use-updater.js exports useUpdater as a function` ✓
- [x] Commit `77f75a0` exists: confirmed
- [x] Commit `cbcdebf` exists: confirmed

## Self-Check: PASSED

---
*Phase: 06-build-pipeline*
*Completed: 2026-04-30*
