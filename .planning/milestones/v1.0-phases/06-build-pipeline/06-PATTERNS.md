# Phase 6: Build Pipeline - Pattern Map

**Mapped:** 2026-04-30
**Files analyzed:** 7
**Analogs found:** 5 / 7

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `.github/workflows/release.yml` | config | event-driven | — | no analog |
| `src-tauri/tauri.conf.json` | config | — | self (existing, extend) | self-extend |
| `src-tauri/Cargo.toml` | config | — | self (existing, extend) | self-extend |
| `src-tauri/capabilities/default.json` | config | — | self (existing, extend) | self-extend |
| `src-tauri/src/lib.rs` | config | — | self (existing, extend) | self-extend |
| `src/use-updater.js` | hook | event-driven | `src/use-sse.js` | role-match |
| `src/__tests__/build-pipeline.test.js` | test | — | `src/__tests__/foundation.test.js` | exact |

---

## Pattern Assignments

### `src/use-updater.js` (hook, event-driven)

**Analog:** `src/use-sse.js`

**Imports pattern** (`src/use-sse.js` lines 6-9):
```javascript
import { useEffect, useRef, useState } from 'react';
import { fetchEventSource } from '@microsoft/fetch-event-source';
import { useQueryClient } from '@tanstack/react-query';
import { normalizeOrder } from './data.jsx';
```

For `use-updater.js`, the equivalent import block is:
```javascript
import { useEffect } from 'react';
import { check } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';
```

**Tauri context guard pattern** (`src/use-sse.js` lines 28-31 — guard idiom):
```javascript
// Guard: do not attempt SSE without a token (D-07) — handles null during cold-start
if (!token) {
  setIsConnected(false);
  return;
}
```

For `use-updater.js`, apply the same early-return guard pattern but for Tauri context:
```javascript
// Guard: do not call plugin-updater outside Tauri webview (dev server would throw)
if (!window.__TAURI_INTERNALS__) return;
```

**Core pattern — useEffect with cleanup** (`src/use-sse.js` lines 25-91):
```javascript
useEffect(() => {
  // guard check here

  // async work inside useEffect — use .then() chain or inner async IIFE
  check()
    .then(async (update) => {
      if (!update) return;
      // D-05: silent install — no user prompt
      await update.downloadAndInstall();
      await relaunch();
    })
    .catch((err) => {
      // Silent failure — do not surface update errors to restaurant staff
      console.warn('[updater] check failed:', err);
    });

  // No cleanup needed for one-shot check (contrast: useSSE returns ctrl.abort())
}, []); // empty deps — run once on mount (D-06: launch-only check)
```

**Error handling pattern** (`src/use-sse.js` lines 77-85):
```javascript
onerror() {
  // Do NOT throw here — that would abort retries entirely.
  setIsConnected(false);
},
```

For `use-updater.js`: use `.catch()` with `console.warn` — never throw or surface errors to UI.

**Placement note (RESEARCH.md Pitfall 7):** Call `useUpdater()` only inside the authenticated branch of `app.jsx` (inside the `isAuthenticated` guard), not at the top of App before the auth guard. This prevents a `relaunch()` call during auth init from disrupting the cold-start auth flow.

---

### `src/__tests__/build-pipeline.test.js` (test, structural/smoke)

**Analog:** `src/__tests__/foundation.test.js`

**Environment directive** (`foundation.test.js` line 1):
```javascript
// @vitest-environment node
```
This directive is mandatory for filesystem tests. `build-pipeline.test.js` must also use `@vitest-environment node` so that `fs.readFileSync`, `path.join(process.cwd(), ...)`, and JSON.parse calls work without jsdom interference.

**Imports pattern** (`foundation.test.js` lines 12-15):
```javascript
import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
```

**File existence check pattern** (`foundation.test.js` lines 36-54):
```javascript
describe('GAP 1-05-02 — Font files bundled at correct paths', () => {
  const boldPath  = path.join(ROOT, 'public', 'fonts', 'Outfit-Bold.ttf')

  test('public/fonts/Outfit-Bold.ttf exists', () => {
    expect(fs.existsSync(boldPath)).toBe(true)
  })

  test('public/fonts/Outfit-Bold.ttf is non-empty', () => {
    expect(fs.statSync(boldPath).size).toBeGreaterThan(0)
  })
})
```

For `build-pipeline.test.js`, use the same `fs.existsSync` + `fs.statSync` pattern for:
- `.github/workflows/release.yml` — file exists and is non-empty
- `src-tauri/tauri.conf.json` — parsed JSON has `bundle.createUpdaterArtifacts: true`

**JSON parse + nested property check pattern** (`foundation.test.js` lines 56-74):
```javascript
describe('GAP 1-06-01 — CSP connect-src includes SiteCare API domain', () => {
  const confPath = path.join(ROOT, 'src-tauri', 'tauri.conf.json')
  let conf

  beforeAll(() => {
    conf = JSON.parse(fs.readFileSync(confPath, 'utf8'))
  })

  test('tauri.conf.json CSP is at app.security.csp (Tauri v2 path)', () => {
    expect(conf?.app?.security?.csp).toBeDefined()
  })

  test('connect-src includes https://api.restaurant.sitecare.ro', () => {
    const connectSrc = conf?.app?.security?.csp?.['connect-src'] ?? ''
    expect(connectSrc).toContain('https://api.restaurant.sitecare.ro')
  })
})
```

For `build-pipeline.test.js`, use the same `beforeAll` + `JSON.parse` + optional-chaining pattern for:
- `conf?.bundle?.createUpdaterArtifacts` — toBe(true)
- `conf?.plugins?.updater?.endpoints` — length > 0
- `conf?.plugins?.updater?.pubkey` — truthy (non-empty string)

**YAML content check pattern** (no existing analog for YAML — use `fs.readFileSync` + string `includes`):
```javascript
describe('BILD-01 — release.yml contains required workflow structure', () => {
  const wfPath = path.join(ROOT, '.github', 'workflows', 'release.yml')
  let content

  beforeAll(() => {
    content = fs.readFileSync(wfPath, 'utf8')
  })

  test('workflow triggers on app-v* tag push', () => {
    expect(content).toContain("tags:\n")
    expect(content).toContain("- 'app-v*'")
  })

  test('workflow includes macOS arm64 matrix entry', () => {
    expect(content).toContain('aarch64-apple-darwin')
  })

  test('workflow includes APPLE_ID env var reference', () => {
    expect(content).toContain('APPLE_ID')
  })
})
```

**Module export check pattern** (`foundation.test.js` lines 120-155):
```javascript
vi.mock('@tauri-apps/plugin-store', () => ({ load: vi.fn() }))
vi.mock('@charlyk/admin-client', () => ({ signIn: vi.fn(), createAdminClient: vi.fn() }))

describe('GAP 1-03-02 — All 7 screen components are importable as ES modules', () => {
  test('screen-orders.jsx exports OrdersScreen as a function', async () => {
    const mod = await import('../screen-orders.jsx')
    expect(typeof mod.OrdersScreen).toBe('function')
  })
})
```

For `build-pipeline.test.js`, use `vi.mock` + `dynamic import` to verify `use-updater.js` exports `useUpdater`:
```javascript
vi.mock('@tauri-apps/plugin-updater', () => ({ check: vi.fn() }))
vi.mock('@tauri-apps/plugin-process', () => ({ relaunch: vi.fn() }))

describe('BILD-04 — use-updater.js exports useUpdater', () => {
  test('use-updater.js exports useUpdater as a function', async () => {
    const mod = await import('../use-updater.js')
    expect(typeof mod.useUpdater).toBe('function')
  })
})
```

**package.json dependency check pattern** (inline, no special analog — use JSON parse):
```javascript
describe('BILD-04 — @tauri-apps/plugin-updater in package.json dependencies', () => {
  const pkgPath = path.join(ROOT, 'package.json')
  let pkg

  beforeAll(() => {
    pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'))
  })

  test('@tauri-apps/plugin-updater is listed in dependencies', () => {
    expect(pkg.dependencies['@tauri-apps/plugin-updater']).toBeDefined()
  })
})
```

---

### `src-tauri/tauri.conf.json` (config, extend existing)

**Current state** (full file, 45 lines):
```json
{
  "$schema": "https://schema.tauri.app/config/2",
  "productName": "SiteCare POS",
  "version": "0.1.0",
  "identifier": "ro.sitecare.pos",
  "build": { ... },
  "app": {
    "windows": [ ... ],
    "security": { "csp": { ... } }
  },
  "bundle": {
    "active": true,
    "targets": "all",
    "icon": [ ... ]
  }
}
```

**Changes required:**
1. Change `bundle.targets` from `"all"` to `["dmg", "msi"]` — prevents Linux build attempt on macOS runner (Pitfall 5)
2. Add `bundle.createUpdaterArtifacts: true` — enables .tar.gz/.sig/.msi.sig generation
3. Add `plugins.updater` section with `pubkey`, `endpoints`, and `windows.installMode`

**Pattern to follow** (RESEARCH.md Pattern 1):
```json
{
  "bundle": {
    "active": true,
    "targets": ["dmg", "msi"],
    "createUpdaterArtifacts": true,
    "icon": ["icons/32x32.png", "icons/128x128.png", "icons/128x128@2x.png", "icons/icon.icns", "icons/icon.ico"]
  },
  "plugins": {
    "updater": {
      "pubkey": "YOUR_GENERATED_PUBKEY_HERE",
      "endpoints": [
        "https://github.com/Charlyk/sitecare-pos/releases/latest/download/latest.json"
      ],
      "windows": {
        "installMode": "passive"
      }
    }
  }
}
```

**Note:** `pubkey` value is a placeholder until the human runs `npm run tauri signer generate -- -w ~/.tauri/sitecare-pos.key` and pastes the `.key.pub` content here.

---

### `src-tauri/Cargo.toml` (config, extend existing)

**Current state** (`Cargo.toml` lines 20-31):
```toml
[dependencies]
tauri = { version = "2", features = [] }
tauri-plugin-opener = "2"
serde = { version = "1", features = ["derive"] }
serde_json = "1"
tauri-plugin-store = "2"
keyring = "3"
serialport = "4.9"
escpos = { version = "0.17", features = ["serial_port"] }

[target.'cfg(not(any(target_os = "android", target_os = "ios")))'.dependencies]
tauri-plugin-window-state = "2"
```

**Existing pattern for platform-scoped dependencies** (`Cargo.toml` line 30):
```toml
[target.'cfg(not(any(target_os = "android", target_os = "ios")))'.dependencies]
tauri-plugin-window-state = "2"
```

**Changes required** (via `npm run tauri add updater` + `npm run tauri add process`, or manually):
```toml
[dependencies]
# ... existing entries unchanged ...
tauri-plugin-process = "2"

[target.'cfg(any(target_os = "macos", windows, target_os = "linux"))'.dependencies]
tauri-plugin-updater = "2"
```

**Note:** `tauri add` is preferred — it atomically updates Cargo.toml, package.json, and capabilities/default.json together.

---

### `src-tauri/capabilities/default.json` (config, extend existing)

**Current state** (full file, 12 lines):
```json
{
  "$schema": "../gen/schemas/desktop-schema.json",
  "identifier": "default",
  "description": "Capability file generated by the Tauri CLI",
  "windows": ["main"],
  "permissions": [
    "core:default",
    "store:default",
    "window-state:default",
    "opener:default"
  ]
}
```

**Changes required** — add two permissions following the existing list pattern:
```json
{
  "permissions": [
    "core:default",
    "store:default",
    "window-state:default",
    "opener:default",
    "updater:default",
    "process:default"
  ]
}
```

**Note:** `tauri add updater` and `tauri add process` handle this automatically.

---

### `src-tauri/src/lib.rs` (config, extend existing)

**Current state — `run()` function** (`lib.rs` lines 387-402):
```rust
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            #[cfg(desktop)]
            app.handle().plugin(tauri_plugin_window_state::Builder::default().build())?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            store_token, get_token, delete_token,
            list_serial_ports, save_printer_config, test_print, print_receipt
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application")
}
```

**Plugin registration pattern** — each plugin is a `.plugin(...)` chain call on `tauri::Builder::default()`. Follow the same pattern for the two new plugins.

**Changes required** — add two `.plugin()` calls after `tauri_plugin_opener::init()`:
```rust
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_updater::Builder::new().build())  // NEW
        .plugin(tauri_plugin_process::init())                  // NEW
        .setup(|app| {
            #[cfg(desktop)]
            app.handle().plugin(tauri_plugin_window_state::Builder::default().build())?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            store_token, get_token, delete_token,
            list_serial_ports, save_printer_config, test_print, print_receipt
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application")
}
```

**Note on `use` import** (RESEARCH.md Open Question 2): `use tauri_plugin_updater::UpdaterExt;` is only needed if Rust-side update logic is added. Per D-05/D-06, update logic lives in JS (`use-updater.js`), so no `use` import is required in `lib.rs`.

---

### `.github/workflows/release.yml` (config, event-driven)

**No analog exists** — the `.github/` directory does not exist in this repo. This file is created from scratch using the verified pattern from RESEARCH.md Pattern 5.

The complete workflow pattern from RESEARCH.md is the canonical source. Key structural points:

- Trigger: `on: push: tags: - 'app-v*'`
- Job: `permissions: contents: write` (minimum scope — nothing else)
- Matrix: `fail-fast: false` with two entries: `macos-latest` + `windows-latest`
- macOS args: `--target aarch64-apple-darwin` (D-01)
- Windows args: `''` (no cross-compile target — default host x64)
- Four standard setup steps: `actions/checkout@v4`, `actions/setup-node@v4`, `dtolnay/rust-toolchain@stable`, `swatinem/rust-cache@v2`
- macOS-only certificate import: `security create-keychain` + `security import` block (conditional on `matrix.platform == 'macos-latest'`)
- `NODE_AUTH_TOKEN` set on the `npm ci` step (not on tauri-action) — prevents Pitfall 3
- `tauri-apps/tauri-action@v0` (not v1 — Pitfall 1) with `uploadUpdaterJson: true`

---

## Shared Patterns

### Tauri Context Guard
**Apply to:** `src/use-updater.js`
**Source:** RESEARCH.md Pattern 4 + Anti-Patterns section

```javascript
// Guard: do not call Tauri plugin APIs outside the Tauri webview
// (Vite dev server has no __TAURI_INTERNALS__ — calling check() would throw)
if (!window.__TAURI_INTERNALS__) return;
```

Note: RESEARCH.md flags this as ASSUMED (A1) — if `window.__TAURI_INTERNALS__` proves incorrect in Tauri v2, use a try/catch outer wrapper as fallback.

### Node Environment Directive for FS Tests
**Apply to:** `src/__tests__/build-pipeline.test.js`
**Source:** `src/__tests__/foundation.test.js` line 1

```javascript
// @vitest-environment node
```

All tests that use `node:fs` or `process.cwd()` must have this directive as the very first line. The default `vitest.config.js` environment is `jsdom` — without the override, `import fs from 'node:fs'` will fail.

### vi.mock Declarations Before Dynamic Imports
**Apply to:** `src/__tests__/build-pipeline.test.js`
**Source:** `src/__tests__/foundation.test.js` lines 96-117 (comment block explains hoisting)

```javascript
// vi.mock calls are hoisted by vitest — declare them BEFORE dynamic imports.
// This is a vitest requirement, not optional style.
vi.mock('@tauri-apps/plugin-updater', () => ({ check: vi.fn() }))
vi.mock('@tauri-apps/plugin-process', () => ({ relaunch: vi.fn() }))
vi.mock('@tauri-apps/plugin-store', () => ({ load: vi.fn() }))
vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }))
```

### Silent Error Handling in Hooks
**Apply to:** `src/use-updater.js`
**Source:** `src/use-sse.js` lines 77-85

Restaurant staff must never see update-related errors. Use `.catch()` with `console.warn` only:
```javascript
.catch((err) => {
  // Silent failure — do not surface update errors to restaurant staff
  console.warn('[updater] check failed:', err);
});
```

### `.plugin()` Chain Pattern in lib.rs
**Apply to:** `src-tauri/src/lib.rs`
**Source:** `src-tauri/src/lib.rs` lines 388-390

```rust
tauri::Builder::default()
    .plugin(tauri_plugin_store::Builder::new().build())
    .plugin(tauri_plugin_opener::init())
    // add new .plugin() calls here, before .setup()
```

Plugins that use `Builder::new().build()` vs `::init()` — check the specific plugin's API:
- `tauri_plugin_updater::Builder::new().build()` (uses builder)
- `tauri_plugin_process::init()` (uses direct init, like opener)

---

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `.github/workflows/release.yml` | config | event-driven | No `.github/` directory exists in this repo; first CI workflow |

---

## Metadata

**Analog search scope:** `src/`, `src/__tests__/`, `src-tauri/src/`, `src-tauri/`
**Files scanned:** 8 source files read in full
**Pattern extraction date:** 2026-04-30

**Key anti-patterns documented in RESEARCH.md (planner must reference):**
- Use `tauri-apps/tauri-action@v0` not `@v1` (Pitfall 1)
- Set `bundle.targets: ["dmg", "msi"]` not `"all"` (Pitfall 5)
- Set `NODE_AUTH_TOKEN` on the `npm ci` step, not on tauri-action (Pitfall 3)
- Call `useUpdater()` inside the authenticated branch of `app.jsx`, not at top level (Pitfall 7)
- Generate keypair once — never regenerate without updating `pubkey` in `tauri.conf.json` (Pitfall 2)
