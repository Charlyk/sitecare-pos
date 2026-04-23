---
phase: 02-authentication
plan: "01"
subsystem: rust-backend
tags: [keychain, secure-storage, tauri-commands, ipc, opener-plugin]
dependency_graph:
  requires: []
  provides: [store_token-command, get_token-command, delete_token-command, opener-plugin]
  affects: [src-tauri/src/lib.rs, src-tauri/Cargo.toml, src-tauri/capabilities/default.json]
tech_stack:
  added: [keyring@3]
  patterns: [tauri-command, keyring-entry, idempotent-credential-delete]
key_files:
  created: []
  modified:
    - src-tauri/Cargo.toml
    - src-tauri/src/lib.rs
    - src-tauri/capabilities/default.json
decisions:
  - "Used keyring::Error::NoEntry match arm to make get_token return Ok(None) instead of an error when no credential exists"
  - "delete_token is idempotent: NoEntry is treated as Ok(()) so callers do not need to guard against double-delete"
  - "opener plugin registered via tauri_plugin_opener::init() in builder chain alongside existing store and window-state plugins"
metrics:
  duration: "2 minutes"
  completed: "2026-04-23"
  tasks_completed: 2
  tasks_total: 2
---

# Phase 2 Plan 1: OS Keychain Tauri Commands Summary

OS secure storage commands wired into the Tauri Rust layer using keyring v3 (macOS Keychain / Windows Credential Manager), plus opener plugin registered so the renderer can open the forgot-password URL in the system browser.

## What Was Built

Three Tauri IPC commands exposed to the JS renderer:

- `store_token(token: String)` — persists JWT to OS keychain under service `sitecare-pos`, username `auth_token`
- `get_token()` — returns `Ok(Some(token))` if credential exists, `Ok(None)` if absent (not an error), `Err(msg)` on keychain failure
- `delete_token()` — removes credential idempotently; `NoEntry` treated as success

The `tauri_plugin_opener` plugin is registered in the builder so `open(url)` from `@tauri-apps/plugin-opener` can be called from the JS layer to open `https://restaurant.sitecare.ro/reset-password` in the system browser (D-05).

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add keyring crate and register opener plugin | d9c4809 | src-tauri/Cargo.toml, src-tauri/src/lib.rs |
| 2 | Add opener:default permission to capabilities | f18bc03 | src-tauri/capabilities/default.json |

## Verification Results

- `cargo check` exits 0
- `keyring = "3"` present in Cargo.toml
- `store_token`, `get_token`, `delete_token` declared as `#[tauri::command]` and listed in `invoke_handler!`
- `tauri_plugin_opener::init()` chained in builder
- `"opener:default"` present in capabilities/default.json
- All four capabilities present: core:default, store:default, window-state:default, opener:default

## Deviations from Plan

None - plan executed exactly as written.

## Threat Surface Scan

No new network endpoints or trust boundary changes introduced. The three Tauri commands operate at the renderer-to-Rust IPC boundary which was already covered by the plan's threat model:

- T-02-01 (Tampering/store_token): Token stored verbatim, no parsing or eval — mitigated as planned
- T-02-02 (Information Disclosure/Keychain): OS-enforced app-bundle isolation — accepted as planned
- T-02-03 (Elevation of Privilege/invoke from iframe): Tauri v2 CSP `script-src 'self'` blocks remote scripts — mitigated as planned

## Known Stubs

None — this plan delivers Rust infrastructure only; no UI components with data stubs.

## Self-Check: PASSED

- [x] src-tauri/Cargo.toml contains `keyring = "3"` — FOUND
- [x] src-tauri/src/lib.rs contains store_token, get_token, delete_token commands — FOUND
- [x] src-tauri/capabilities/default.json contains opener:default — FOUND
- [x] Commit d9c4809 exists — FOUND
- [x] Commit f18bc03 exists — FOUND
- [x] cargo check exits 0 — PASSED
