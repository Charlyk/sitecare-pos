# Phase 1: Foundation - Research

**Researched:** 2026-04-22
**Domain:** Tauri v2 + React 18 + Vite 6 scaffold; window.* ES module migration; Zustand 5 + plugin-store persistence; CSP configuration
**Confidence:** HIGH (all critical claims verified via Context7 official docs or live npm registry)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Use `decorations: true` (native OS window chrome). Do NOT use `decorations: false` or the custom macOS titlebar from `lib/macos-window.jsx`. The known `@tauri-apps/plugin-window-state` bug (issue #14822) with `decorations: false` on macOS is avoided entirely. The `lib/macos-window.jsx` file is not used in the production Tauri app.
- **D-02:** Scaffold the new Tauri+Vite project at the **repo root**. Before scaffolding, move all existing prototype files (`src/`, `assets/`, `lib/`, `index.html`) into a `_prototype/` archive directory. The Tauri project (`src/`, `src-tauri/`, `package.json`, `vite.config.js`) lives at the root.
- **D-03:** The prototype's component styles (the monolithic `<style>` block from `index.html`) move verbatim into `src/styles.css`. No splitting, no renaming of CSS classes. All existing class names (`.card`, `.btn-primary`, `.chip`, `.nav-item`, etc.) are preserved exactly.
- **D-04:** `assets/colors_and_type.css` (design tokens) is imported unchanged. Both `colors_and_type.css` and `styles.css` are imported once in `main.jsx` — no per-component CSS imports.
- **D-05:** The SiteCare API base domain is `https://api.restaurant.sitecare.ro`. This domain MUST appear in `connect-src` in `tauri.conf.json`. Also add it to `event-src` for SSE (Phase 3 will need it; better to configure on day 1).

### Claude's Discretion
- **Zustand store shape:** Single flat store with logical grouping by concern (UI: screen, role, lang, accent, density, sidebar, toasts). Claude decides the exact slice structure.
- **`window.*` migration order:** Convert `i18n.jsx` first (every screen depends on `useT`), then `icons.jsx`, then leaf screens bottom-up, then `shell.jsx`, then `app.jsx`. This order is mandatory per codebase watch-out.
- **Window position:** With `decorations: true`, `@tauri-apps/plugin-window-state` works normally. Claude decides default window size and whether to persist window position.

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within Phase 1 scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| FOUND-01 | Tauri v2 + React 18 + Vite 6 scaffold builds successfully on macOS and Windows | Scaffold command, file structure, Vite config verified via Context7 |
| FOUND-02 | @charlyk/admin-client installs from GitHub Package Registry in local dev and CI environments | .npmrc format verified; NODE_AUTH_TOKEN confirmed present in environment |
| FOUND-03 | All 7 prototype screens converted from window.* globals to ES module imports/exports | Full window.* audit of all 12 prototype files completed; exact conversion pattern documented |
| FOUND-04 | Zustand store manages UI state with @tauri-apps/plugin-store persistence | Zustand v5 create() API verified via Context7; plugin-store load() API verified via Context7; custom storage adapter pattern documented |
| FOUND-05 | CSS design tokens from prototype (colors_and_type.css) imported and working in Vite | Font path analysis complete; @font-face URL must be adjusted when CSS moves; Google Fonts CSP implications documented |
| FOUND-06 | Tauri CSP configured to allow API domain in connect-src | Exact tauri.conf.json CSP structure verified via Context7; all required directives documented |
</phase_requirements>

---

## Summary

Phase 1 is a scaffolding and migration phase with no new feature logic. The primary work is three parallelizable tracks: (1) stand up the Tauri+Vite project at the repo root by archiving the prototype and running `npm create tauri-app@latest`, (2) convert all 12 prototype files from `window.*` globals to ES module exports following a strict dependency-order — `i18n.jsx` first, `icons.jsx` second, then leaf screens, then `shell.jsx`, then `app.jsx`, and (3) wire the Zustand store with a custom `@tauri-apps/plugin-store` storage adapter so six UI preferences persist across restarts.

Rust is not installed in the current environment. Installing Rust via `curl --proto '=https' --tlsv1.2 https://sh.rustup.rs -sSf | sh` is the mandatory first step before any Tauri CLI commands can run. Xcode CLT is already installed. Node 24 and npm 11 are present and compatible. The `.npmrc` already has the correct `@charlyk:registry` scope and `NODE_AUTH_TOKEN` is set in the environment.

The single most dangerous silent failure in this phase is a misconfigured CSP. Tauri v2 places CSP inside `app.security.csp` in `tauri.conf.json` (not at the root `security` key as in v1). Missing `connect-src` silently drops all API fetches and SSE connections — screens appear empty with no error in the UI. The research documents the exact CSP object structure with all five required directives to prevent this.

**Primary recommendation:** Follow the documented wave order — archive prototype, install Rust, scaffold Tauri+Vite, migrate CSS, migrate JS files in dependency order, wire Zustand+plugin-store, configure CSP, add permissions. Each step is verifiable before proceeding to the next.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| UI state (screen, role, lang, accent, density, sidebar) | Frontend (React/Zustand) | Rust (plugin-store persistence) | Zustand owns runtime state; plugin-store writes it to disk |
| Preference persistence (6 keys) | Rust side (plugin-store file) | Frontend (Zustand hydration) | plugin-store file is source of truth on restart; Zustand reads it async on init |
| Window chrome | OS / Tauri native | — | D-01: decorations: true means OS draws titlebar; no JS involvement |
| Window size/position persistence | Tauri plugin (plugin-window-state) | — | Plugin saves/restores window geometry automatically via Rust |
| Screen routing | Frontend (Zustand `screen` state) | — | Conditional JSX render gated on `screen` string; no router library |
| CSS design tokens | Frontend (Vite static asset pipeline) | — | Two CSS files imported once in main.jsx; no server-side processing |
| Font loading (local .ttf) | Frontend (Vite `public/` or `src/assets/`) | — | @font-face url() paths must resolve relative to the CSS file location |
| Font loading (Google Fonts CDN) | External CDN | — | Requires `style-src` and `font-src` CSP directives in tauri.conf.json |
| API client installation | Package manager (npm) | CI (GitHub Actions) | .npmrc scopes @charlyk to GitHub Package Registry; CI uses GITHUB_TOKEN |
| CSP enforcement | Tauri (Rust webview layer) | — | Tauri intercepts all webview network requests at the Rust level |

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @tauri-apps/cli | 2.10.1 [VERIFIED: npm registry] | Tauri build toolchain and dev server | Official Tauri v2 CLI |
| @tauri-apps/api | 2.10.1 [VERIFIED: npm registry] | JS bindings for Tauri Rust APIs | Required for any Tauri JS↔Rust communication |
| react | 18.3.1 [VERIFIED: npm registry] | UI framework | Project constraint; React 19 breaks JSX transform compatibility |
| react-dom | 18.3.1 [VERIFIED: npm registry] | React DOM renderer | Paired with react 18 |
| vite | 6.4.2 [VERIFIED: npm registry] | Frontend bundler and dev server | Project constraint; Vite 8 switches to Rolldown bundler (beta, not production-ready per research SUMMARY.md) |
| @vitejs/plugin-react | latest 6.x [ASSUMED] | React fast-refresh in Vite | Standard Vite+React integration |
| zustand | 5.0.12 [VERIFIED: npm registry] | UI state management | Project decision; React hook-based, minimal boilerplate |
| @tauri-apps/plugin-store | 2.4.2 [VERIFIED: npm registry] | Cross-restart preference persistence | Official Tauri plugin; replaces localStorage for Tauri apps |
| @tauri-apps/plugin-window-state | 2.4.1 [VERIFIED: npm registry] | Window size/position persistence | Official plugin; works with decorations: true (D-01) |
| @tanstack/react-query | 5.99.2 [VERIFIED: npm registry] | Server state, caching, mutations | Project decision; Phase 1 only needs QueryClientProvider scaffolded |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @charlyk/admin-client | 1.1.20+ [CITED: research SUMMARY.md] | SiteCare API SDK — sole data layer | Phase 1: install and verify only; not yet wired to screens |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| @tauri-apps/plugin-store (custom storage adapter) | Zustand `persist` middleware with localStorage | localStorage is forbidden in Tauri production; plugin-store writes to OS data dir |
| Zustand `create()` (React hook) | `createStore()` (vanilla) | `create()` is the React standard; vanilla useful for testing but unnecessary here |

**Installation (after Tauri scaffold):**
```bash
# Add Tauri plugins
npm run tauri add store
npm run tauri add window-state

# Add remaining JS dependencies
npm install zustand @tanstack/react-query

# Verify @charlyk/admin-client (NODE_AUTH_TOKEN must be set)
npm install @charlyk/admin-client
```

**Note:** `npm run tauri add store` handles BOTH `cargo add tauri-plugin-store` (Cargo.toml) AND `npm install @tauri-apps/plugin-store` (package.json) AND adds `store:default` to capabilities. Do not do these steps manually unless the CLI fails. [VERIFIED: Context7/tauri-apps/tauri-docs]

**Version verification results (run 2026-04-22):**
- `@tauri-apps/plugin-store`: 2.4.2
- `@tauri-apps/plugin-window-state`: 2.4.1
- `zustand`: 5.0.12
- `@tanstack/react-query`: 5.99.2
- `vite` (latest v6): 6.4.2
- `react`: 19.2.5 (latest) — use `react@18` to pin to 18.3.1

---

## Architecture Patterns

### System Architecture Diagram

```
 npm create tauri-app (scaffold)
          |
          v
 src-tauri/                     ← Rust thin shell
   lib.rs                       ← registers plugin-store + plugin-window-state
   tauri.conf.json              ← window config, CSP, build commands
   capabilities/default.json   ← store:default, window-state:default

 src/                           ← React frontend
   main.jsx                     ← entry: imports CSS, mounts React root,
                                   wraps app in QueryClientProvider
   app.jsx                      ← reads Zustand store; runs async store.load();
                                   renders Shell + screen router
   store.js                     ← Zustand create() with custom plugin-store adapter
   i18n.jsx  → icons.jsx        ← shared utilities (ES module exports)
   data.jsx                     ← helper fns only (mock data removed in Phase 3+)
   shell.jsx                    ← reads Zustand screen/role/lang/accent/density/sidebar
   screen-orders.jsx            ← imports { useT } from ./i18n, { Icon } from ./icons
   screen-kitchen.jsx           ↑ same pattern
   screen-pos.jsx               ↑ same pattern
   screen-detail.jsx            ↑ same pattern
   screen-menu.jsx              ↑ same pattern
   screen-printer.jsx           ↑ same pattern
   screen-settings.jsx          ↑ same pattern
   colors_and_type.css          ← design tokens (moved from assets/, path adjusted)
   styles.css                   ← verbatim <style> block from index.html

 public/
   fonts/                       ← Outfit-Bold.ttf, Outfit-Black.ttf (moved here)
```

Data flow:
1. App starts → `store.load()` resolves → Zustand hydrates from plugin-store file
2. App renders Shell → reads Zustand `screen` → renders correct screen component
3. Screens import `useT` from `i18n.jsx`, `Icon` from `icons.jsx` directly (no window.*)
4. CSS tokens flow: `colors_and_type.css` loaded → `--sc-*` variables on `:root` → all components consume via `var(--sc-*)`

### Recommended Project Structure
```
src/
├── main.jsx           # Vite entry point; CSS imports; React root mount; QueryClientProvider
├── app.jsx            # Root component; Zustand init; plugin-store hydration; screen router
├── store.js           # Zustand store with plugin-store custom storage adapter
├── i18n.jsx           # I18N dict + useT() — ES module export (FIRST to convert)
├── icons.jsx          # Icon component + ICON_PATHS — ES module export (SECOND)
├── data.jsx           # formatRON, elapsedMinutes, orderTimeLabel — named exports; mock data stub
├── shell.jsx          # Shell, Sidebar, Topbar
├── screen-orders.jsx  # OrdersScreen + sourceMeta/typeMeta/stateMeta
├── screen-kitchen.jsx # KitchenScreen
├── screen-pos.jsx     # PosScreen
├── screen-detail.jsx  # OrderDetailScreen + ThermalTicket
├── screen-menu.jsx    # MenuScreen
├── screen-printer.jsx # PrinterScreen
├── screen-settings.jsx # SettingsScreen
├── colors_and_type.css # Design tokens (moved from prototype assets/)
└── styles.css         # Component CSS (verbatim from index.html <style> block)
src-tauri/
├── src/lib.rs         # Rust entry; registers plugins
├── tauri.conf.json    # Build, windows, security.csp
└── capabilities/
    └── default.json   # store:default, window-state:default permissions
public/
└── fonts/             # Outfit-Bold.ttf, Outfit-Black.ttf (static assets, served at /fonts/)
```

---

## Pattern 1: Tauri v2 Scaffold Command

**What:** `npm create tauri-app@latest` runs an interactive wizard. Answer prompts to produce the React+Vite template.

**Interactive prompts and answers for this project:**
```
Project name: . (dot — installs at repo root)
Identifier: ro.sitecare.pos
Frontend language: TypeScript / JavaScript  → choose JavaScript
Package manager: npm
UI template: React
UI flavor: JavaScript
```

**Generated scaffold files at repo root (verified via official docs):**
```
package.json                   ← scripts: tauri dev, tauri build, dev, build, preview
vite.config.js                 ← @vitejs/plugin-react
index.html                     ← entry HTML (Vite root)
src/
  main.jsx                     ← ReactDOM.createRoot stub
  App.jsx                      ← scaffold placeholder — will be REPLACED
src-tauri/
  Cargo.toml                   ← tauri + tauri-build deps
  build.rs
  src/lib.rs                   ← thin Tauri builder
  tauri.conf.json
  icons/                       ← default app icons
  capabilities/
    default.json               ← core:default permissions
```

**Files to REPLACE after scaffold:** `src/App.jsx` → `src/app.jsx` (lowercase per convention), `src/main.jsx` (add CSS imports and QueryClientProvider).

**Files to DELETE after scaffold:** `src/App.css`, `src/assets/react.svg` (scaffold boilerplate).

[VERIFIED: Context7/tauri-apps/tauri-docs, v2.tauri.app/start/create-project/]

---

## Pattern 2: tauri.conf.json — Window + Security (v2 structure)

**What:** In Tauri v2, window config lives under `app.windows[]` and CSP lives under `app.security.csp` (not at a top-level `security` key as in v1).

```json
{
  "$schema": "../node_modules/@tauri-apps/cli/config.schema.json",
  "productName": "SiteCare POS",
  "version": "0.1.0",
  "identifier": "ro.sitecare.pos",
  "build": {
    "beforeDevCommand": "npm run dev",
    "beforeBuildCommand": "npm run build",
    "devUrl": "http://localhost:5173",
    "frontendDist": "../dist"
  },
  "app": {
    "windows": [
      {
        "title": "SiteCare POS",
        "width": 1440,
        "height": 900,
        "resizable": true,
        "fullscreen": false,
        "decorations": true
      }
    ],
    "security": {
      "csp": {
        "default-src": "'self' ipc: http://ipc.localhost asset: http://asset.localhost",
        "connect-src": "ipc: http://ipc.localhost https://api.restaurant.sitecare.ro",
        "style-src": "'unsafe-inline' 'self' https://fonts.googleapis.com",
        "font-src": ["'self'", "https://fonts.gstatic.com", "asset:", "http://asset.localhost"],
        "img-src": "'self' asset: http://asset.localhost blob: data:",
        "event-src": "https://api.restaurant.sitecare.ro"
      }
    }
  },
  "bundle": {
    "active": true,
    "targets": "all",
    "icon": [
      "icons/32x32.png",
      "icons/128x128.png",
      "icons/128x128@2x.png",
      "icons/icon.icns",
      "icons/icon.ico"
    ]
  }
}
```

**Critical details:**
- `ipc:` and `http://ipc.localhost` in `connect-src` are Tauri's own IPC channels — omitting them breaks plugin calls from JS [VERIFIED: Context7/tauri-apps/tauri-docs]
- `asset:` and `http://asset.localhost` allow local file serving from src-tauri [VERIFIED: Context7]
- `event-src` is a Tauri-specific CSP directive for SSE/EventSource connections [CITED: CONTEXT.md D-05]
- `style-src: 'unsafe-inline'` is required because Tauri injects inline style nonces at compile time AND the prototype uses inline `style` objects [VERIFIED: Context7]
- `font-src` must include `https://fonts.gstatic.com` for Google Fonts to serve .woff2 files (the @import in colors_and_type.css fetches from googleapis.com, the actual font files come from gstatic.com) [VERIFIED: Context7 CSP example]
- The CSP value can be a string OR an object — use the object form so each directive is clear [VERIFIED: Context7]

[VERIFIED: Context7/tauri-apps/tauri-docs security/csp.mdx and http-headers.mdx]

---

## Pattern 3: window.* to ES Module Conversion

**What:** Remove all `window.X = ...` assignments at the bottom of each file, remove all `window.X` reads at the top, replace with ES module `export` / `import`.

**Mandatory conversion order (MUST follow — any deviation breaks rendering):**

1. `i18n.jsx` — FIRST (exports `I18N`, `useT`; every file depends on `useT`)
2. `icons.jsx` — SECOND (exports `Icon`, `ICON_PATHS`; every screen uses `<Icon>`)
3. `data.jsx` — THIRD (exports `formatRON`, `elapsedMinutes`, `orderTimeLabel`, mock data; leaf screens depend on helpers)
4. `screen-orders.jsx` — FOURTH (also exports `sourceMeta`, `typeMeta`, `stateMeta` — consumed by `screen-detail.jsx` and `screen-kitchen.jsx`)
5. `screen-kitchen.jsx`, `screen-pos.jsx`, `screen-menu.jsx`, `screen-printer.jsx`, `screen-settings.jsx` — FIFTH (leaf screens with no inter-screen deps beyond steps 1-4)
6. `screen-detail.jsx` — SIXTH (imports `ThermalTicket` self; imports `sourceMeta/typeMeta/stateMeta` from screen-orders; imports helpers from data)
7. `shell.jsx` — SEVENTH (imports `useT` from i18n, `Icon` from icons)
8. `app.jsx` — LAST (imports all screens, Shell, store, QueryClientProvider)

**Conversion pattern — before (prototype style):**
```javascript
// screen-orders.jsx — top of file
const Icon = window.Icon;
const t = window.useT(lang);

// screen-orders.jsx — bottom of file
window.OrdersScreen = OrdersScreen;
window.sourceMeta = sourceMeta;
window.typeMeta = typeMeta;
window.stateMeta = stateMeta;
```

**After (ES module style):**
```javascript
// screen-orders.jsx — top of file
import { Icon } from './icons.jsx';
import { useT } from './i18n.jsx';
import { formatRON, elapsedMinutes, orderTimeLabel } from './data.jsx';

// inside component — replace window.useT(lang) call:
const t = useT(lang);

// screen-orders.jsx — bottom of file (REMOVE window.* assignments)
export { OrdersScreen, sourceMeta, typeMeta, stateMeta };
// or: export default OrdersScreen; (pick one convention and stick with it)
```

**Remove hook aliasing:** The prototype aliased React hooks (`const { useState: useStateOrders } = React`) to avoid global scope collision. ES modules have proper scope — use standard names directly:
```javascript
// prototype:
const { useState: useStateOrders, useEffect: useEffectOrders } = React;
// production:
import { useState, useEffect } from 'react';
```

**Remove CDN React global:** The prototype accessed `React` from CDN `window.React`. All files now import from npm:
```javascript
import React from 'react';
// or destructure directly:
import { useState, useEffect, useMemo } from 'react';
```

**The `window.*` globals that are LEGITIMATELY kept** (these are browser APIs, not prototype module hacks):
- `window.addEventListener` / `window.removeEventListener` — DOM events (keep as-is in useEffect)
- `window.innerWidth` / `window.innerHeight` — viewport sizing (keep; the scale calculation in app.jsx uses these)
- `window.parent.postMessage` — design-mode iframe bridge (remove entirely; TweaksPanel is prototype-only, not migrated)

**Special case — `screen-detail.jsx`:** It re-exports `ThermalTicket` which is also used by `screen-printer.jsx`. After conversion, `screen-printer.jsx` should import `ThermalTicket` from `./screen-detail.jsx` directly.

**Special case — `app.jsx`:** The prototype `App` has a `scale` state and `transform: scale()` on a fixed 1440×900 frame. This is the prototype letterbox — it is REMOVED in the Tauri app. Tauri fills the native window at 1440×900; the fixed frame and transform are not needed. The `scale` state, `fit()` function, and the `resize` useEffect in app.jsx are all deleted.

**Special case — design-mode postMessage:** `app.jsx` has `window.addEventListener('message', handler)` for the TweaksPanel edit mode. The `TweaksPanel` is prototype-only. Remove the entire postMessage handler block and the TweaksPanel component from the migration.

[VERIFIED: Prototype source files read directly; conversion pattern is ASSUMED based on standard ES module idioms]

---

## Pattern 4: Zustand 5 Store with plugin-store Custom Storage Adapter

**What:** Zustand `create()` with `persist` middleware backed by a custom `StateStorage` adapter that delegates to `@tauri-apps/plugin-store`.

**The race condition problem:** `@tauri-apps/plugin-store`'s `load()` is async. Zustand's `persist` middleware initializes synchronously with defaults, then calls the storage adapter's `getItem` asynchronously. This means the app renders once with defaults, then re-renders after the store resolves. This is acceptable behavior — the UI flickers from defaults to persisted values on first render after cold start. The Zustand `persist` middleware handles this automatically; no manual `isHydrated` guard is needed for simple preference values like `lang` and `accent`.

**Pattern (JavaScript, no TypeScript):**
```javascript
// src/store.js
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { load } from '@tauri-apps/plugin-store';

// Lazy store handle — initialized once on first getItem call
let _store = null;
async function getPluginStore() {
  if (!_store) {
    _store = await load('preferences.json', { autoSave: true });
  }
  return _store;
}

// Custom StateStorage adapter bridging Zustand persist <-> plugin-store
const tauriStorage = {
  getItem: async (name) => {
    const store = await getPluginStore();
    const val = await store.get(name);
    return val ?? null;
  },
  setItem: async (name, value) => {
    const store = await getPluginStore();
    await store.set(name, value);
  },
  removeItem: async (name) => {
    const store = await getPluginStore();
    await store.delete(name);
  },
};

// Store shape — matches prototype sc_* localStorage keys exactly
export const useAppStore = create(
  persist(
    (set) => ({
      // Persisted UI state (maps to sc_* keys)
      screen: 'orders',
      role: 'cashier',
      lang: 'ro',
      accent: 'sage',
      density: 'balanced',
      sidebarCollapsed: false,

      // Session-only state (NOT persisted)
      selectedOrder: null,
      toasts: [],
      acceptDialog: null,

      // Actions
      setScreen: (screen) => set({ screen, selectedOrder: null }),
      setRole: (role) => set({ role }),
      setLang: (lang) => set({ lang }),
      setAccent: (accent) => set({ accent }),
      setDensity: (density) => set({ density }),
      setSidebarCollapsed: (v) => set({ sidebarCollapsed: v }),
      openOrder: (order) => set({ selectedOrder: order, screen: 'detail' }),
      pushToast: (toast) => set((s) => ({ toasts: [...s.toasts, toast] })),
      dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter(t => t.id !== id) })),
      setAcceptDialog: (dialog) => set({ acceptDialog: dialog }),
    }),
    {
      name: 'sc-ui-prefs',           // key in preferences.json
      storage: createJSONStorage(() => tauriStorage),
      partialize: (state) => ({      // Only persist these 6 keys, not session state
        screen: state.screen,
        role: state.role,
        lang: state.lang,
        accent: state.accent,
        density: state.density,
        sidebarCollapsed: state.sidebarCollapsed,
      }),
    }
  )
);
```

**Rust side (lib.rs):**
```rust
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::new().build())
        .setup(|app| {
            #[cfg(desktop)]
            app.handle().plugin(tauri_plugin_window_state::Builder::default().build())?;
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

**capabilities/default.json additions:**
```json
{
  "permissions": [
    "core:default",
    "store:default",
    "window-state:default"
  ]
}
```

[VERIFIED: plugin-store JS API via Context7/tauri-apps/tauri-docs; Zustand custom storage adapter via Context7/pmndrs/zustand; lib.rs pattern via Context7/tauri-apps/tauri-docs]

---

## Pattern 5: CSS Migration and Font Paths

**What:** Two CSS files must be imported in `main.jsx`. The `@font-face` rules in `colors_and_type.css` use relative URLs (`./fonts/Outfit-Bold.ttf`). The path must resolve correctly after the file moves.

**The font path problem:**
- Prototype: `assets/colors_and_type.css` references `./fonts/Outfit-Bold.ttf` → resolves to `assets/fonts/`
- After migration: if `colors_and_type.css` moves to `src/`, then `./fonts/` would look inside `src/fonts/` which does not exist

**Solution (recommended):** Place font files in `public/fonts/`. Reference them with an absolute path `/fonts/Outfit-Bold.ttf` in the CSS. Vite serves `public/` at the root URL (`/`), so `/fonts/Outfit-Bold.ttf` resolves correctly in both dev and production builds. [ASSUMED — based on standard Vite public directory behavior; verify during Wave 0]

**Adjusted @font-face rule in colors_and_type.css:**
```css
@font-face {
  font-family: "Outfit";
  src: url("/fonts/Outfit-Bold.ttf") format("truetype");
  font-weight: 700;
  font-style: normal;
  font-display: swap;
}
@font-face {
  font-family: "Outfit";
  src: url("/fonts/Outfit-Black.ttf") format("truetype");
  font-weight: 900;
  font-style: normal;
  font-display: swap;
}
```

**Alternative:** Place font files in `src/assets/fonts/` and import them from the CSS as `./assets/fonts/...`. Vite processes CSS imports and rewrites asset URLs. But the `public/` approach is simpler and avoids Vite's asset hashing for fonts. [ASSUMED]

**Google Fonts @import:** `colors_and_type.css` contains `@import url("https://fonts.googleapis.com/...")`. This will be blocked by the CSP unless `style-src` includes `https://fonts.googleapis.com` (for the @import itself) AND `font-src` includes `https://fonts.gstatic.com` (for the actual font files). Both are included in the tauri.conf.json CSP pattern above.

**main.jsx imports:**
```javascript
import './colors_and_type.css';  // design tokens — MUST come first
import './styles.css';           // component CSS — references var(--sc-*) from tokens
```

[VERIFIED: Context7/tauri-apps/tauri-docs CSP for font-src + style-src; @font-face path issue is ASSUMED standard Vite behavior]

---

## Pattern 6: TanStack Query v5 Provider Setup

**What:** Phase 1 only needs the `QueryClientProvider` scaffolded. No `useQuery` calls yet.

```javascript
// src/main.jsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import './colors_and_type.css';
import './styles.css';
import App from './app.jsx';
import React from 'react';
import ReactDOM from 'react-dom/client';

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById('root')).render(
  <QueryClientProvider client={queryClient}>
    <App />
  </QueryClientProvider>
);
```

**Breaking changes from v4 (if prototype used v4 patterns):** The prototype does not use TanStack Query at all (it was CDN-only React). No migration needed — this is a greenfield v5 setup. [VERIFIED: Context7/tanstack/query]

[VERIFIED: Context7/tanstack/query QueryClientProvider pattern]

---

## Pattern 7: @charlyk/admin-client Install Sequence

**What:** The package is on GitHub Package Registry, not the public npm registry. A `.npmrc` at the repo root scopes it.

**Existing .npmrc (already at repo root — do not change):**
```
@charlyk:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}
```

**Local dev:** `NODE_AUTH_TOKEN` is already set in the current environment (confirmed). The developer's GitHub PAT with `read:packages` scope must be set as `NODE_AUTH_TOKEN` in the shell environment. It is set now.

**CI (GitHub Actions):**
```yaml
- name: Install dependencies
  run: npm ci
  env:
    NODE_AUTH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```
GitHub Actions automatically sets `GITHUB_TOKEN` with `read:packages` for the repo's own organization. No additional secret needed for packages published in the same GitHub org.

**If npm install fails with 404:** The package may require the authenticated user to have at least `read:packages` on the `@charlyk` org. If the PAT lacks this scope, npm prints `npm error code E404`. It does NOT fail silently — a 404 error is explicit.

**Peer dependencies:** Unknown without reading the actual package.json of `@charlyk/admin-client`. [ASSUMED — check with `npm view @charlyk/admin-client peerDependencies` after install.]

[VERIFIED: .npmrc file read directly; NODE_AUTH_TOKEN confirmed present in environment]

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Preference persistence across restarts | Custom file I/O via Tauri fs plugin | `@tauri-apps/plugin-store` | plugin-store handles file location, JSON serialization, atomic writes, and cross-window sync |
| Window size/position memory | Custom window geometry tracking | `@tauri-apps/plugin-window-state` | Plugin hooks into OS window events; manual tracking misses edge cases (minimize, multiple displays) |
| Cross-component state | Prop drilling from App | Zustand `useAppStore` hook | Direct store hook in each component; no prop threading needed |
| CSS-in-JS or per-component CSS | Component-scoped styles | Global `styles.css` (D-03) | Prototype CSS depends on global class names; CSS modules would break `.card`, `.chip`, etc. |
| Custom icon rendering | SVG sprite or icon library | Existing `Icon` component from `icons.jsx` | Prototype already has all needed icons; no new icon library needed |

**Key insight:** The hardest part of Phase 1 is NOT any single technical pattern — it is the migration discipline. Every `window.X` reference must be eliminated before Phase 2 can wire real API data. Partial migration leaves the app in a broken state. The conversion order matters because the prototype's implicit load-order is now expressed as explicit ES module import graph.

---

## Common Pitfalls

### Pitfall 1: CSP Omitting Tauri IPC Channels
**What goes wrong:** Removing `ipc:` and `http://ipc.localhost` from `connect-src` breaks all `@tauri-apps/plugin-store` calls and all `@tauri-apps/api` calls from JS. The app appears to load but plugin calls silently fail.
**Why it happens:** Tauri uses a custom `ipc://` protocol for JS→Rust communication. Standard web CSP defaults block non-HTTP schemes.
**How to avoid:** Always include `ipc: http://ipc.localhost` in `connect-src` alongside the API domain. Use the full CSP object pattern from Pattern 2.
**Warning signs:** `store.get()` / `store.set()` return undefined; no console errors in the WebView.

### Pitfall 2: window.* Migration Order Violation
**What goes wrong:** Migrating `app.jsx` before `screen-orders.jsx` causes import cycles. Migrating `screen-detail.jsx` before `screen-orders.jsx` causes a missing `sourceMeta/typeMeta/stateMeta` import.
**Why it happens:** The prototype used script load order as a dependency graph. ES modules make this explicit — circular imports or missing exports throw at parse time.
**How to avoid:** Follow the exact 8-step order in Pattern 3. After each file is converted, verify `npm run dev` still compiles before moving to the next file.
**Warning signs:** Vite build error `Cannot find module './screen-orders.jsx' export 'typeMeta'`.

### Pitfall 3: React 19 Installed Instead of React 18
**What goes wrong:** `npm create tauri-app@latest` may scaffold with the latest React (19.x as of 2026-04-22). React 19 has breaking changes to the JSX transform and `ReactDOM.createRoot` behavior that could cause compatibility issues.
**Why it happens:** `npm create tauri-app` uses `react@latest` in its template dependencies.
**How to avoid:** After scaffolding, check `package.json` for `"react": "^19.x.x"`. If present, downgrade: `npm install react@18 react-dom@18`.
**Warning signs:** Console warning `ReactDOM.createRoot` deprecation notices or JSX transform errors.

### Pitfall 4: Font Path 404 After CSS Relocation
**What goes wrong:** `colors_and_type.css` moves from `assets/` to `src/`. The `@font-face` rules reference `./fonts/Outfit-Bold.ttf`. The fonts directory does not exist at `src/fonts/`, so all `font-weight: 700` and `font-weight: 900` text falls back to system fonts. Visually subtle — text still renders, just with wrong weight.
**Why it happens:** Relative URL in @font-face resolves relative to the CSS file, not the project root.
**How to avoid:** Move font files to `public/fonts/` and use absolute path `/fonts/Outfit-Bold.ttf` in the @font-face rule. Verify in browser DevTools Network tab that fonts load with 200 status.
**Warning signs:** Brand name and topbar title appear thinner than prototype; DevTools Network shows `Outfit-Bold.ttf: 404`.

### Pitfall 5: Vite 8 Selected Instead of Vite 6
**What goes wrong:** If the create-tauri-app template defaults to Vite 8, the Rolldown bundler (still in beta) may fail to handle the prototype's CSS import patterns or font URLs.
**Why it happens:** `npm create tauri-app@latest` templates follow upstream. Vite 8 is now the `latest` dist-tag (8.0.9 confirmed 2026-04-22).
**How to avoid:** After scaffolding, check `package.json`. If `"vite": "^8.x.x"`, downgrade: `npm install vite@6`. Per research SUMMARY.md, Vite 6 (6.4.2) is the project decision.
**Warning signs:** Unusual CSS import errors or Rolldown-specific build failures during `npm run dev`.

### Pitfall 6: Rust Not Installed — Scaffold Succeeds, `tauri dev` Fails
**What goes wrong:** `npm create tauri-app@latest` succeeds (it's a JS tool). Running `npm run tauri dev` fails immediately because Cargo is not installed.
**Why it happens:** Rust is not installed in the current environment (confirmed by environment audit).
**How to avoid:** Install Rust BEFORE running `npm run tauri dev`: `curl --proto '=https' --tlsv1.2 https://sh.rustup.rs -sSf | sh`. Then restart the terminal. First `tauri dev` run takes 5-10 minutes for initial Cargo crate compilation.
**Warning signs:** `error: command not found: cargo` when running `npm run tauri dev`.

### Pitfall 7: prototype window-resize Scale Logic Migrated to Production
**What goes wrong:** `app.jsx` in the prototype scales a fixed 1440×900 frame using a `resize` event listener. If this code is migrated, the Tauri window renders as a scaled-down box rather than filling the native window.
**Why it happens:** The scale logic was needed for the prototype's letterbox browser-within-browser display. It is not needed in a native Tauri window.
**How to avoid:** Delete the `scale` state, the `fit()` function, the `resize` useEffect, and any `transform: scale()` wrapper element during the `app.jsx` migration. The root div should fill the window naturally.
**Warning signs:** App content appears small in the center of the window; the native window chrome shows a blank margin around the app frame.

---

## Code Examples

### i18n.jsx — ES Module Conversion
```javascript
// Source: prototype src/i18n.jsx converted to ES module
// REMOVE: window.I18N = I18N;  window.useT = function useT(lang) {...}
// ADD:
export const I18N = {
  ro: { /* ... */ },
  en: { /* ... */ },
};

export function useT(lang) {
  return (key) => (I18N[lang] && I18N[lang][key]) || key;
}
```

### icons.jsx — ES Module Conversion
```javascript
// Source: prototype src/icons.jsx converted to ES module
// REMOVE: window.Icon = Icon;
// ADD:
export const ICON_PATHS = { /* ... verbatim ... */ };

export function Icon({ name, size = 18, stroke = 1.75, style = {}, className = '' }) {
  const d = ICON_PATHS[name];
  if (!d) return null;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round"
      style={{ flexShrink: 0, ...style }} className={className}>
      {d.split('|').map((p, i) => <path key={i} d={p.trim()} />)}
    </svg>
  );
}
```

### screen-orders.jsx — ES Module Conversion (head + tail)
```javascript
// Source: prototype src/screen-orders.jsx converted to ES module
import { useState } from 'react';
import { Icon } from './icons.jsx';
import { useT } from './i18n.jsx';
import { formatRON, elapsedMinutes, orderTimeLabel } from './data.jsx';

function sourceMeta(source, t) { /* ... verbatim ... */ }
function typeMeta(type, t) { /* ... verbatim ... */ }
function stateMeta(state, t) { /* ... verbatim ... */ }

function OrderCard({ order, lang, onOpen, onAdvance, onPrint }) {
  const t = useT(lang);   // replaces: const t = window.useT(lang);
  const elapsed = elapsedMinutes(order.placedAt);  // replaces: window.elapsedMinutes(...)
  // ... component body verbatim ...
}

export { OrdersScreen, sourceMeta, typeMeta, stateMeta };
```

### Accent effect in app.jsx (preserved verbatim, Zustand-driven)
```javascript
// Source: prototype src/app.jsx accent useEffect — now reads from Zustand
import { useEffect } from 'react';
import { useAppStore } from './store.js';

function App() {
  const accent = useAppStore((s) => s.accent);

  useEffect(() => {
    const map = {
      sage:       { primary: 'hsl(120 14% 49%)', hover: 'hsl(120 14% 42%)', soft: 'hsl(120 14% 49% / 0.1)' },
      indigo:     { primary: 'hsl(234 60% 55%)', hover: 'hsl(234 60% 48%)', soft: 'hsl(234 60% 55% / 0.1)' },
      terracotta: { primary: 'hsl(0 53% 58%)',   hover: 'hsl(0 53% 52%)',   soft: 'hsl(0 53% 58% / 0.1)' },
      charcoal:   { primary: 'hsl(220 9% 30%)',  hover: 'hsl(220 9% 24%)',  soft: 'hsl(220 9% 30% / 0.1)' },
    };
    const v = map[accent] || map.sage;
    document.documentElement.style.setProperty('--sc-primary', v.primary);
    document.documentElement.style.setProperty('--sc-primary-hover', v.hover);
    document.documentElement.style.setProperty('--sc-primary-soft', v.soft);
  }, [accent]);
  // ...
}
```

---

## Window.* Dependency Audit (Complete)

This table documents every `window.*` assignment and read in the prototype. The planner uses this to verify all conversions are covered.

| File | window.* READS (remove these) | window.* WRITES/EXPORTS (convert to ES exports) |
|------|-------------------------------|--------------------------------------------------|
| `i18n.jsx` | none | `window.I18N`, `window.useT` |
| `icons.jsx` | none | `window.Icon` |
| `data.jsx` | none | `window.MENU_CATEGORIES`, `window.MENU_ITEMS`, `window.ORDERS`, `window.PRINTERS`, `window.USERS`, `window.formatRON`, `window.elapsedMinutes`, `window.orderTimeLabel` |
| `shell.jsx` | `window.useT(lang)`, `window.Icon` | `window.Shell` |
| `screen-orders.jsx` | `window.Icon`, `window.useT(lang)`, `window.elapsedMinutes(...)`, `window.orderTimeLabel(...)`, `window.formatRON(...)` | `window.OrdersScreen`, `window.sourceMeta`, `window.typeMeta`, `window.stateMeta` |
| `screen-kitchen.jsx` | `window.useT(lang)`, `window.Icon`, `window.elapsedMinutes(...)`, `window.typeMeta(...)` | `window.KitchenScreen` |
| `screen-pos.jsx` | `window.useT(lang)`, `window.Icon`, `window.MENU_CATEGORIES`, `window.MENU_ITEMS`, `window.formatRON(...)`, `window.typeMeta(...)` | `window.PosScreen` |
| `screen-detail.jsx` | `window.useT(lang)`, `window.Icon`, `window.sourceMeta(...)`, `window.typeMeta(...)`, `window.stateMeta(...)`, `window.elapsedMinutes(...)`, `window.orderTimeLabel(...)`, `window.formatRON(...)`, `window.useT(lang)` (inline) | `window.OrderDetailScreen`, `window.ThermalTicket` |
| `screen-menu.jsx` | `window.Icon`, `window.MENU_CATEGORIES`, `window.MENU_ITEMS`, `window.formatRON(...)` | `window.MenuScreen` |
| `screen-printer.jsx` | `window.useT(lang)`, `window.Icon`, `window.PRINTERS` | `window.PrinterScreen` |
| `screen-settings.jsx` | `window.useT(lang)`, `window.Icon`, `window.USERS` | `window.SettingsScreen` |
| `app.jsx` | `window.ORDERS` (seed), `window.useT(lang)` (two places), `window.Shell`, `window.OrdersScreen`, `window.KitchenScreen`, `window.PosScreen`, `window.OrderDetailScreen`, `window.MenuScreen`, `window.PrinterScreen`, `window.SettingsScreen`, `window.Icon`, `window.typeMeta(...)`, `window.formatRON(...)` | none (app.jsx has no exports) |

**Special cases in app.jsx:**
- `window.ORDERS` seed → remove entirely; Phase 1 app renders screens with empty/stub order array; Phase 3 wires real data via `useOrders()` hook
- `window.parent.postMessage` → delete (TweaksPanel not migrated)
- `window.addEventListener('message', ...)` → delete (TweaksPanel not migrated)
- `window.addEventListener('resize', fit)` → delete (letterbox scale logic not needed in Tauri)

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | npm, Vite, scaffold | Yes | v24.9.0 | — |
| npm | Package installation | Yes | 11.6.2 | — |
| Xcode CLT | Tauri macOS build | Yes | Installed | — |
| Rust / Cargo | Tauri Rust backend | **No** | — | Must install via rustup before `tauri dev` |
| rustup | Rust version management | **No** | — | Install: `curl --proto '=https' --tlsv1.2 https://sh.rustup.rs -sSf \| sh` |
| NODE_AUTH_TOKEN | @charlyk/admin-client install | Yes | Set | — |

**Missing dependencies with no fallback:**
- **Rust / Cargo**: Required to run `npm run tauri dev` and any Tauri build. Must be installed before executing any Tauri CLI commands. Install command: `curl --proto '=https' --tlsv1.2 https://sh.rustup.rs -sSf | sh` then restart terminal. [VERIFIED: Context7/tauri-apps/tauri-docs prerequisites]

**First `tauri dev` run time:** 5-10 minutes on first run (Cargo downloads and compiles all Tauri + plugin crates). Subsequent runs: ~10 seconds (only changed Rust code recompiles).

---

## Validation Architecture

This section maps each phase requirement to a concrete verification command or check.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | None (Phase 1 is scaffold + migration; no unit tests yet) |
| Config file | N/A |
| Quick run command | `npm run dev` (Vite-only, no Tauri) |
| Full scaffold command | `npm run tauri dev` |

### Phase Requirements → Verification Map

| Req ID | Behavior | Verification Type | Command / Check |
|--------|----------|-------------------|-----------------|
| FOUND-01 | Tauri + Vite scaffold builds on macOS | Smoke test | `npm run tauri dev` — window opens with no Rust compile errors |
| FOUND-01 | Scaffold builds on Windows | Build matrix | Future CI (Phase 6); for Phase 1 accept macOS-only verification |
| FOUND-02 | @charlyk/admin-client installs | Install check | `npm install @charlyk/admin-client` exits 0; `node -e "require('@charlyk/admin-client')"` runs without error |
| FOUND-03 | All 7 screens converted to ES modules | Static analysis | `grep -r "window\." src/ --include="*.jsx" \| grep -v "window\.addEventListener\|window\.removeEventListener\|window\.innerWidth\|window\.innerHeight"` returns empty |
| FOUND-03 | App renders all 7 screens without JS errors | Visual smoke test | Navigate to each screen key in the Zustand store; verify no `Cannot read properties of undefined (reading 'X')` in console |
| FOUND-04 | Zustand store hydrates from plugin-store | Persistence test | Set `lang` to `'en'`, quit app, relaunch — verify `lang` is still `'en'` on startup |
| FOUND-05 | CSS tokens working in Vite | Visual check | Inspect `--sc-primary` in browser DevTools Elements > Computed; value should be `hsl(120 14% 49%)` |
| FOUND-05 | Fonts load correctly | Network check | Browser DevTools Network tab: `Outfit-Bold.ttf` and `Outfit-Black.ttf` return 200; no 404 for font files |
| FOUND-06 | CSP allows API domain | CSP validation | `npm run tauri dev` → open DevTools → Console: run `fetch('https://api.restaurant.sitecare.ro')` → should NOT throw `Content Security Policy` blocked error (may get network/auth error, that is OK) |

### Specific Verification Commands

```bash
# 1. Verify scaffold compiles (after Rust installed)
npm run tauri dev
# Expected: Tauri window opens, React renders, no console errors

# 2. Verify no window.* globals remain (after migration)
grep -rn "window\." src/ --include="*.jsx" | grep -v "window\.addEventListener\|window\.removeEventListener\|window\.innerWidth\|window\.innerHeight\|window\.document"
# Expected: empty output (all window.* module hacks removed)

# 3. Verify @charlyk/admin-client installs
npm install @charlyk/admin-client 2>&1 | tail -5
# Expected: "added X packages" with no 404 or auth errors

# 4. Verify CSS custom properties are active
# In Tauri DevTools (right-click > Inspect):
# document.documentElement.style.getPropertyValue('--sc-primary')
# or getComputedStyle(document.documentElement).getPropertyValue('--sc-primary')
# Expected: "hsl(120 14% 49%)" (sage green default)

# 5. Verify CSP does not block API domain
# In Tauri DevTools console:
# fetch('https://api.restaurant.sitecare.ro').catch(e => console.log(e.message))
# Expected: Network error or 401/403 — NOT "blocked by Content Security Policy"

# 6. Verify font files load (DevTools Network tab filtered to "Font")
# Expected: Outfit-Bold.ttf 200, Outfit-Black.ttf 200
# Red flag: 404 on any .ttf file

# 7. Verify Zustand persistence (manual)
# - Change lang to 'en' in Settings screen
# - Quit Tauri app (Cmd+Q)
# - Relaunch with npm run tauri dev
# Expected: App opens in English
```

### Wave 0 Gaps
- No test files exist (project not yet started). Phase 1 verification is entirely manual smoke tests and console checks.
- `None — no automated test infrastructure is required for this scaffold/migration phase; all verification is command-line or DevTools-based.`

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Tauri v1 `tauri.conf.json` `security.csp` at root | Tauri v2: `app.security.csp` nested under `app` key | Tauri v2 release (2024) | Config structure incompatible; v1 docs mislead |
| Zustand `persist` with `localStorage` | Custom `StateStorage` adapter for `@tauri-apps/plugin-store` | Tauri apps always | localStorage cleared by OS on app uninstall; plugin-store uses proper OS data dirs |
| React `window.React` CDN global | `import React from 'react'` | Prototype → production | Bundled React is smaller, tree-shaken, no CDN dependency |
| @babel/standalone in-browser JSX | Vite + @vitejs/plugin-react (esbuild) | Prototype → production | ~100x faster, proper source maps, tree shaking, HMR |
| `window.*` as module system | ES module `import`/`export` | Prototype → production | Explicit dependency graph, IDE support, dead code elimination |
| Zustand `create` (v4 curried) | Zustand v5 `create` (same API, v5 removed some v4 breaking deprecated patterns) | Zustand v5 (2024) | v5 is simpler; curried `create<Type>()()` is TypeScript-only; plain JS `create(fn)` unchanged |

**Deprecated/outdated:**
- `window.* global module system`: Prototype-only pattern. Forbidden in production per CLAUDE.md rule 4.
- `localStorage` for preferences in Tauri: Unreliable in Tauri webviews (sandboxed). Use `@tauri-apps/plugin-store`.
- `decorations: false` on macOS with plugin-window-state: Known bug #14822. Avoided via D-01.
- Vite 8 (Rolldown): Beta as of 2026-04-22. Not production-ready per research SUMMARY.md.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Vite 6 `public/` directory font path `/fonts/Outfit-Bold.ttf` resolves correctly in Tauri WebView | Pattern 5 (CSS Migration) | Font files 404; text renders with wrong weight; fix is to adjust path to alternative location |
| A2 | `create-tauri-app@latest` will scaffold with Vite 8 by default and will need manual downgrade to Vite 6 | Pattern 1 (Scaffold) | If scaffold uses Vite 6 still, no downgrade needed; low-risk assumption |
| A3 | `@charlyk/admin-client` has no peer dependencies beyond React 18 | FOUND-02 | If there are peer deps (e.g., specific node-fetch version), install may fail or emit warnings requiring additional packages |
| A4 | The `TweaksPanel` component and the `window.postMessage` design-mode handler are entirely omitted from the production app | Pattern 3 (window.* migration) | If TweaksPanel is wanted in production, it needs separate treatment; current decision is to omit |
| A5 | `autoSave: true` in `load('preferences.json', { autoSave: true })` is sufficient; no explicit `store.save()` calls needed after each `set` | Pattern 4 (Zustand + plugin-store) | If autoSave debounce (100ms default) causes values to not persist on hard crash/force-quit, will need explicit save calls on critical state changes |

---

## Open Questions (RESOLVED)

1. **@charlyk/admin-client peer dependencies**
   - What we know: The package installs from `https://npm.pkg.github.com`; authentication is confirmed working
   - What's unclear: Whether it declares peer dependencies (e.g., specific fetch polyfill, specific React version constraint)
   - Recommendation: Run `npm view @charlyk/admin-client peerDependencies` immediately after install; address any warnings before proceeding to Phase 2
   - **RESOLUTION:** Will be discovered on install. Plan 02 Task 1 includes `npm view @charlyk/admin-client peerDependencies` as part of the install verification; any peer deps found will be documented and addressed before Phase 2 proceeds.

2. **Vite 6 vs 8 in create-tauri-app template**
   - What we know: Vite 8.0.9 is the current `latest` on npm; Vite 6.4.2 is the previous stable
   - What's unclear: Which Vite version `create-tauri-app@4.6.2` pins for its React template
   - Recommendation: Check `package.json` immediately after scaffold; downgrade to `vite@6` if 8 is present
   - **RESOLUTION:** Resolved by Plan 01 Task 2: the scaffold output `package.json` is checked immediately post-install and downgraded to `vite@^6` if needed. Assumption A2 in the Assumptions Log covers this case explicitly.

3. **Rust installation time on developer machine**
   - What we know: Rust is not installed; first Cargo build takes 5-10 minutes
   - What's unclear: Whether there are Homebrew conflicts or Apple Silicon target issues
   - Recommendation: Install Rust first, verify `cargo --version` before starting scaffold; on Apple Silicon, `rustup` installs the correct aarch64 target automatically
   - **RESOLUTION:** On Apple Silicon, `rustup` installs the `aarch64-apple-darwin` target automatically — no Homebrew conflicts expected. First Cargo compile is 5–10 minutes; this is documented in Plan 01 Wave 0 and the executor is explicitly warned. No manual target selection required.

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | Not in scope for Phase 1 (Phase 2) |
| V3 Session Management | No | Not in scope for Phase 1 |
| V4 Access Control | No | Auth guard is Phase 2 |
| V5 Input Validation | Minimal | No user input in Phase 1 scaffold |
| V6 Cryptography | No | Auth token storage is Phase 2 |
| V7 Error Handling | Partial | CSP misconfiguration causes silent failures — mitigated by Pattern 2 |

### Known Threat Patterns for This Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| CSP bypass via missing directives | Elevation of Privilege | Explicit CSP object in tauri.conf.json (Pattern 2); include all Tauri IPC channels |
| Prototype window.* globals leaking into production | Information Disclosure | `grep -r "window\." src/` check in Pitfall 2 verification step |
| Committed PAT in .npmrc | Credential exposure | .npmrc uses `${NODE_AUTH_TOKEN}` env var interpolation — NEVER commit a literal token; .npmrc is already correct |

---

## Sources

### Primary (HIGH confidence)
- Context7 `/tauri-apps/tauri-docs` — CSP structure, plugin-store JS API, plugin-window-state Rust API, scaffold command, vite config, prerequisites (Rust install, Xcode CLT)
- Context7 `/pmndrs/zustand` — `create()` API, `persist` middleware, custom `StateStorage` adapter pattern, `createJSONStorage()`, `partialize` option
- Context7 `/tanstack/query` — `QueryClient`, `QueryClientProvider` v5 setup
- npm registry (live queries 2026-04-22) — package versions: @tauri-apps/plugin-store 2.4.2, @tauri-apps/plugin-window-state 2.4.1, zustand 5.0.12, @tanstack/react-query 5.99.2, vite 6.4.2 (stable), vite 8.0.9 (latest), react 18.3.1 (v18 latest), react 19.2.5 (current latest)
- Prototype source files (read directly) — complete window.* audit of all 12 files; exact function signatures; CSS @font-face rules; font file inventory

### Secondary (MEDIUM confidence)
- v2.tauri.app/start/create-project/ (WebFetch) — confirmed scaffold CLI command and interactive prompt flow
- v2.tauri.app/plugin/store/ (WebFetch) — confirmed async load() pattern and autoSave option

### Tertiary (LOW confidence)
- WebSearch results on Zustand+Tauri custom storage adapter patterns — multiple community sources agree on `StateStorage` interface approach; verified against official Zustand docs

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all versions verified against npm registry 2026-04-22
- Scaffold mechanics: HIGH — verified via Context7 official Tauri docs
- window.* audit: HIGH — read directly from prototype source files
- CSP structure: HIGH — verified via Context7 including all directives
- plugin-store JS API: HIGH — verified via Context7
- Zustand custom storage adapter: HIGH — verified via Context7 with IndexedDB example (same pattern)
- Font path handling: MEDIUM/ASSUMED — standard Vite behavior; verify during Wave 0
- @charlyk/admin-client peer deps: LOW — not verifiable without network access to private registry

**Research date:** 2026-04-22
**Valid until:** 2026-05-22 (stable libraries; Tauri plugin versions change frequently — re-verify before Phase 5)
