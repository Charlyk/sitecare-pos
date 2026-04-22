---
phase: 01-foundation
plan: "02"
subsystem: infra
tags: [tauri, npm, csp, zustand, react-query, plugin-store, plugin-window-state, github-package-registry]

# Dependency graph
requires:
  - phase: 01-01
    provides: Tauri+Vite+React scaffold, src-tauri/Cargo.toml, src-tauri/src/lib.rs, src-tauri/capabilities/default.json
provides:
  - "@charlyk/admin-client installed from GitHub Package Registry (not yet wired, ready for Phase 3)"
  - "zustand@5.0.12 and @tanstack/react-query@5 installed"
  - "@tauri-apps/plugin-store + tauri-plugin-store@2 registered in Rust and capabilities"
  - "@tauri-apps/plugin-window-state + tauri-plugin-window-state@2 registered in Rust and capabilities"
  - "Complete tauri.conf.json CSP: connect-src and event-src for https://api.restaurant.sitecare.ro"
  - ".npmrc verified safe: uses \${NODE_AUTH_TOKEN} env var, no literal PAT"
affects:
  - 01-03 (CSS migration into scaffold)
  - 01-04 (ES module conversion uses zustand)
  - 01-05 (Zustand store wires to tauri-plugin-store)
  - 02-01 (auth wires @charlyk/admin-client)
  - 03-01 (SSE wires @microsoft/fetch-event-source via CSP connect-src)

# Tech tracking
tech-stack:
  added:
    - "@charlyk/admin-client (latest, GitHub Package Registry)"
    - "zustand@5.0.12"
    - "@tanstack/react-query@5"
    - "@tauri-apps/plugin-store (npm) + tauri-plugin-store@2 (Cargo)"
    - "@tauri-apps/plugin-window-state (npm) + tauri-plugin-window-state@2 (Cargo)"
  patterns:
    - "tauri-plugin-window-state registered under #[cfg(desktop)] guard in lib.rs — mobile-safe"
    - "tauri add CLI command handles npm + Cargo + capabilities in one step when cargo is in PATH"
    - "window-state capability in separate desktop.json (platform-scoped) + default.json (app-wide)"
    - ".npmrc uses \${NODE_AUTH_TOKEN} env var — never a literal PAT in version control"

key-files:
  created:
    - src-tauri/Cargo.lock
    - src-tauri/capabilities/desktop.json
  modified:
    - package.json
    - package-lock.json
    - src-tauri/Cargo.toml
    - src-tauri/src/lib.rs
    - src-tauri/capabilities/default.json

key-decisions:
  - "tauri add CLI used (not manual install) — it handles npm, Cargo, and capabilities atomically when cargo is in PATH"
  - "window-state capability placed in BOTH desktop.json (platform-scoped, auto-created by tauri add) AND default.json (for plan acceptance criteria) — no conflict, Tauri merges all capability files"
  - "@charlyk/admin-client has zero peer dependencies — no additional installs required"
  - "tauri.conf.json CSP was already complete from Plan 01 — Task 3 was a confirm-only, no changes needed"
  - "Cargo.lock committed — consistent Rust dependency resolution across machines and CI"

patterns-established:
  - "Pattern 1: Tauri plugin registration order in lib.rs: store first (persistent), then window-state in setup() under #[cfg(desktop)]"
  - "Pattern 2: cargo must be in PATH before running npm run tauri — source ~/.cargo/env or add to shell profile"

requirements-completed:
  - FOUND-02
  - FOUND-06

# Metrics
duration: ~8min
completed: 2026-04-22
---

# Phase 1 Plan 02: Foundation — Package Installation & CSP Summary

**@charlyk/admin-client + zustand@5 + @tanstack/react-query@5 + Tauri store/window-state plugins installed; lib.rs wired with plugin registrations; full 6-directive CSP (connect-src + event-src for api.restaurant.sitecare.ro) confirmed in tauri.conf.json**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-04-22T21:14:57Z
- **Completed:** 2026-04-22
- **Tasks:** 3 (all auto)
- **Files modified:** 7

## Accomplishments

- `@charlyk/admin-client` installed from GitHub Package Registry; `.npmrc` verified safe (uses `${NODE_AUTH_TOKEN}`, no literal PAT)
- `zustand@5.0.12` and `@tanstack/react-query@5` installed — Zustand for UI state, TanStack Query for server state
- `tauri-plugin-store` and `tauri-plugin-window-state` added via `tauri add` CLI (handles npm + Cargo + capabilities atomically)
- `lib.rs` rewritten per plan pattern: store registered globally, window-state registered under `#[cfg(desktop)]` guard in `setup()`
- `tauri.conf.json` CSP confirmed complete with all 6 directives including `event-src` for Phase 3 SSE

## Task Commits

Each task was committed atomically:

1. **Task 1: Verify .npmrc and install @charlyk/admin-client** - `f35404d` (chore)
2. **Task 2: Install Tauri plugins and JS dependencies, wire lib.rs and capabilities** - `9cfdb47` (feat)
3. **Task 3: Confirm tauri.conf.json CSP — no changes needed** - `0b4dfa5` (chore)

## Files Created/Modified

- `package.json` — added @charlyk/admin-client, zustand, @tanstack/react-query, plugin-store, plugin-window-state
- `src-tauri/Cargo.toml` — added tauri-plugin-store@2, tauri-plugin-window-state@2 (desktop target)
- `src-tauri/src/lib.rs` — replaced scaffold with plugin registrations (store + window-state under #[cfg(desktop)])
- `src-tauri/capabilities/default.json` — added store:default and window-state:default permissions
- `src-tauri/capabilities/desktop.json` — NEW: platform-scoped capability created by `tauri add window-state`
- `src-tauri/Cargo.lock` — NEW: committed for consistent Rust dependency resolution
- `.npmrc` — unchanged (already correct from Plan 01)
- `src-tauri/tauri.conf.json` — unchanged (CSP already complete from Plan 01)

## Decisions Made

- Used `npm run tauri add` CLI to install plugins — it handles npm install, `cargo add`, and capability grants in one command (requires cargo in PATH via `~/.cargo/env`)
- `window-state:default` placed in both `desktop.json` (auto-created by tauri add, platform-scoped) and `default.json` (per plan acceptance criteria) — Tauri merges all capability files at runtime, no duplication issue
- `@charlyk/admin-client` has zero peer dependencies — no additional installs needed; this fact documented here to avoid re-checking in future plans
- Cargo.lock committed — ensures reproducible Rust builds in CI and on other machines

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] `tauri add` failed because `cargo` not in PATH for npm script context**
- **Found during:** Task 2 (tauri add store)
- **Issue:** `npm run tauri add store` reported "failed to run command cargo add: No such file or directory" — cargo is installed but not automatically sourced in the npm script shell
- **Fix:** Set `PATH="$HOME/.cargo/bin:$PATH"` before running `npm run tauri add` commands
- **Files modified:** None (environment fix only)
- **Verification:** `tauri add store` and `tauri add window-state` both completed successfully
- **Committed in:** 9cfdb47 (Task 2 commit)

**2. [Rule 2 - Missing Critical] lib.rs scaffold `greet` command removed**
- **Found during:** Task 2 (writing lib.rs per plan pattern)
- **Issue:** Scaffold contained an unused `greet` Tauri command and `tauri_plugin_opener` registration not needed for this app
- **Fix:** Replaced entire lib.rs with the plan's specified pattern (store + window-state only)
- **Files modified:** `src-tauri/src/lib.rs`
- **Verification:** Correct plugin registrations confirmed by grep
- **Committed in:** 9cfdb47 (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (1 blocking environment fix, 1 missing critical cleanup)
**Impact on plan:** Both fixes necessary for correctness. No scope creep.

## Issues Encountered

- `cargo` binary not in PATH when invoked from npm scripts — resolved by explicitly setting `PATH=$HOME/.cargo/bin:$PATH` before `npm run tauri add`. This is a known macOS shell environment scoping issue. Future plans using Rust/cargo commands must apply the same workaround.

## User Setup Required

None — `NODE_AUTH_TOKEN` was already set in the environment; `@charlyk/admin-client` installed without error. No additional GitHub PAT configuration required.

## Threat Surface Scan

No new security-relevant surface introduced beyond what the plan's threat model covered:
- T-1-01 (CSP): Verified complete at `app.security.csp` with all 6 directives
- T-1-03 (PAT exposure): `.npmrc` confirmed to use `${NODE_AUTH_TOKEN}` env var, no literal token
- T-1-05 (ipc: in connect-src): Confirmed present in connect-src directive

## Next Phase Readiness

Plan 01-03 (CSS migration) can proceed immediately:
- Scaffold is in place with all JS dependencies installed
- `tauri.conf.json` is complete — no CSP changes needed in future plans
- `lib.rs` is clean — plugin registrations won't conflict with future additions
- `@charlyk/admin-client` is installed and waiting for Phase 2 auth wiring

Open question carried forward: Does `@charlyk/admin-client` expose SSE via cookies (EventSource-compatible) or requires Bearer header (`@microsoft/fetch-event-source`)? Inspect SDK source in Phase 2.

---
*Phase: 01-foundation*
*Completed: 2026-04-22*
