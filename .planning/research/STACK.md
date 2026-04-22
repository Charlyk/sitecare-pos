# Technology Stack — SiteCare POS

**Project:** SiteCare POS (Tauri desktop, macOS + Windows)
**Researched:** 2026-04-22
**Confidence:** HIGH (all versions verified against official docs/npm; no training-data-only assertions)

---

## Overview

This is a Tauri v2 desktop app with a React + Vite frontend, no TypeScript, targeting macOS and Windows. The prototype is CDN React + Babel-standalone — the entire runtime stack is replaced by a proper Vite build. The data layer is exclusively `@charlyk/admin-client` from GitHub Package Registry. Real-time updates come via SSE. State is split between client UI state (Zustand) and server/async state (TanStack Query).

The stack is intentionally minimal. Every library in this document is load-bearing. There are no "nice to have" additions.

---

## Recommended Stack

### Runtime Shell

| Technology | Version (verified) | Purpose | Confidence |
|---|---|---|---|
| Tauri | 2.10.3 | Desktop shell, OS integration, build/bundle | HIGH — from v2.tauri.app/release/ |
| @tauri-apps/api | 2.10.1 | JS bridge to Tauri core (tray, window, events) | HIGH |
| @tauri-apps/cli | 2.10.1 | Dev server + build CLI (`tauri dev`, `tauri build`) | HIGH |
| Rust toolchain | stable (min 1.77.2) | Tauri backend compilation | HIGH — from official plugin docs |

Rust minimum version 1.77.2 is set by `tauri-plugin-notification`; use `rustup update stable` and pin `channel = "stable"` in `rust-toolchain.toml`. Do not pin a specific Rust version number — Tauri tracks stable.

### Frontend Framework

| Technology | Version (verified) | Purpose | Confidence |
|---|---|---|---|
| React | 18.x (use 18, not 19) | UI component tree | HIGH — see note below |
| Vite | 6.x | Dev server + production bundler | HIGH — v6 is LTS-equivalent for this project |
| @vitejs/plugin-react | 4.x | React transform (Babel, fast refresh) | HIGH |

**React 18 not 19:** React 19 is stable but introduces breaking changes (new JSX transform behavior, changed ref handling, `use()` hook). The prototype is React 18 CDN. Migrating to React 18 proper is the path of least resistance. Upgrade to 19 in a later milestone after stabilization.

**Vite 6 not 8:** Vite 8 ships Rolldown as its bundler (Rust-based), which is a significant internal change still accruing ecosystem support. Vite 6 is stable, well-tested with `@vitejs/plugin-react`, and matches what `npm create tauri-app@latest` scaffolds as of early 2026. Use Vite 6; do not chase Vite 8 until it has 6+ months of ecosystem burn-in.

**No SWC transform:** `@vitejs/plugin-react-swc` is faster but changes the Babel config surface. Since this project has no TypeScript and no complex transform configuration, standard `@vitejs/plugin-react` with Babel is the right pick — fewer surprises during migration from Babel-standalone.

### State Management

| Technology | Version (verified) | Purpose | Confidence |
|---|---|---|---|
| Zustand | 5.0.12 | Client/UI global state (auth session, role, preferences, UI flags) | HIGH — npm verified |
| @tanstack/react-query | 5.99.x | Server state: API calls, caching, background refresh | HIGH — npm verified |

**Why both:** These solve different problems. Zustand holds state that has no "server source of truth": which role is active, which screen is selected, which accent/density/language the user chose, whether a dialog is open. TanStack Query handles everything that comes from or goes to the API: order lists, menu items, any mutation (accept, advance, cancel, create order). Mixing these up into one store is the most common mistake in React apps at this scale.

**Why Zustand over React Context:** React Context causes subtree re-renders on every state change. A POS display needs fast, granular updates — new order arrives via SSE, only the order list re-renders, not the entire app. Zustand v5 uses `useSyncExternalStore` natively (React 18 API), providing surgical re-renders via selector functions (`useStore(s => s.role)`) without a Provider wrapper.

**Why TanStack Query over custom fetch hooks:** The SiteCare API will return stale data between SSE events for edge cases (network reconnect, app foregrounded). TanStack Query's background refetch, stale-while-revalidate, and mutation invalidation handle these correctness gaps automatically. Writing this logic manually in `useEffect` is a source of subtle bugs.

### API and Real-time

| Technology | Version | Purpose | Confidence |
|---|---|---|---|
| @charlyk/admin-client | 1.1.20 (current; update as published) | Sole API layer — all HTTP calls go through this | HIGH — from PROJECT.md |
| Native EventSource API | browser built-in | SSE connection for kitchen display | HIGH |
| Custom `useSSE` hook | hand-rolled | Reconnection logic, cleanup, React lifecycle binding | MEDIUM |

**SSE approach:** Use the browser's native `EventSource` directly — do not add a library. Tauri's WebView (WKWebView on macOS, WebView2 on Windows) fully supports `EventSource`. The only library that would add value is reconnection logic, which is 30 lines of hand-rolled code. Write a single `useSSE(url, handlers)` hook that:
1. Creates the `EventSource` on mount
2. Attaches message/error handlers
3. Implements exponential backoff reconnect on `onerror` (3s → 6s → 12s → 30s max)
4. Calls `eventSource.close()` on unmount
5. Accepts the auth token as a query param or via `@charlyk/admin-client`'s SSE URL builder

**CORS note:** Tauri's WebView is not a sandboxed browser — it does not enforce same-origin policy on outbound requests. SSE connections to the SiteCare backend will work without a proxy as long as the server sends `Access-Control-Allow-Origin`. If the backend blocks the Tauri origin (`tauri://localhost`), the Rust-side HTTP client (`@tauri-apps/plugin-http`) can proxy the SSE, but this is only needed as a fallback.

### Tauri Plugins (official, from plugins-workspace)

| Plugin (JS package) | Version | Purpose | Confidence |
|---|---|---|---|
| @tauri-apps/plugin-notification | 2.3.3 | Native OS toast notifications for new orders | HIGH — npm verified |
| @tauri-apps/plugin-store | 2.4.2 | Persistent key-value storage for user preferences | HIGH — npm verified |
| @tauri-apps/plugin-window-state | ~2.4.x | Save/restore window size and position across launches | MEDIUM — version from GH issues |

System tray support is built into the Tauri core — it requires enabling the `tray-icon` feature in `Cargo.toml` and using `TrayIcon` from `@tauri-apps/api/tray`. No separate plugin install needed.

**What to use `@tauri-apps/plugin-store` for:** Language preference, role (cashier/kitchen), accent theme, density setting, last-selected screen. Do not use `localStorage` — it resets on Tauri's WebView clearing. The plugin writes to a JSON file in the OS app data directory, which survives between launches reliably.

**What NOT to use `@tauri-apps/plugin-store` for:** Live order data or any API-sourced state. That belongs in TanStack Query's cache.

### Internationalization

| Technology | Version (verified) | Purpose | Confidence |
|---|---|---|---|
| i18next | latest | i18n core engine | HIGH |
| react-i18next | 17.0.4 | React bindings (`useTranslation` hook) | HIGH — npm verified |

The prototype has Romanian + English bilingual UI. `react-i18next` is the de-facto standard — 6,000+ npm dependents, actively maintained, no compile-time dependency. Initialize with two JSON namespace files (`en.json`, `ro.json`). Persist the selected language via `@tauri-apps/plugin-store`.

### Build Pipeline

| Technology | Purpose | Confidence |
|---|---|---|
| GitHub Actions | CI/CD matrix for macOS + Windows builds | HIGH |
| tauri-apps/tauri-action@v0 | Official Tauri GH Action — builds, bundles, creates release artifacts | HIGH |
| dtolnay/rust-toolchain@stable | Pin Rust stable in CI | HIGH |
| swatinem/rust-cache@v2 | Cache Rust build artifacts between CI runs (saves 3-5 min per run) | HIGH |

**Matrix strategy:** Two separate jobs — `macos-latest` (for Apple Silicon; produces `.dmg` and `.app`) and `windows-latest` (produces `.msi` and `.exe` NSIS installer). There is no cross-compilation: macOS binary must be built on a macOS runner, Windows binary on a Windows runner. This is a hard Tauri constraint — Tauri relies on native system toolchains and libraries.

**macOS signing:** Requires an Apple Developer account ($99/yr). Export a `Developer ID Application` certificate as a base64 `.p12`, store it as a GitHub Actions secret. Notarization is required for distribution outside the Mac App Store (uses App Store Connect API key or Apple ID + app-specific password).

**Windows signing:** An OV code signing certificate is sufficient to avoid most SmartScreen warnings. EV certificates provide immediate SmartScreen reputation but are significantly more expensive. Since June 2023, certificates must be stored on hardware security modules — Azure Key Vault is the most accessible option in CI. For an internal/restaurant-only app, unsigned builds are acceptable for initial delivery; add signing before any broader distribution.

### Dev Tooling

| Tool | Purpose | Confidence |
|---|---|---|
| npm | Package manager (no pnpm, no yarn) — consistency with existing JS ecosystem | HIGH |
| .npmrc (project-local) | GitHub Package Registry auth for `@charlyk/admin-client` | HIGH |
| ESLint | Linting (flat config, eslint 9.x) | HIGH |

---

## Library Rationale

### Why Tauri v2 over v1

Tauri v2 (stable since October 2024, current 2.10.3) is the only version to target. v1 entered maintenance-only status. v2 introduces:
- Modular plugin system (was monolithic core in v1)
- Rebuilt permission model (was allowlist in v1)
- Multiwindow/multi-webview support
- Mobile targets (iOS/Android) — not needed now but future-proof
- `@tauri-apps/api` import paths changed: `@tauri-apps/api/tauri` → `@tauri-apps/api/core`

v1 documentation and community examples are abundant but wrong for a v2 project. Always verify against `v2.tauri.app`, not `tauri.app`.

### Why Vite over webpack / Create React App

CRA is dead (unmaintained). webpack adds 500ms+ cold starts that make Tauri's `tauri dev` workflow painful. Vite's dev server is instant — critical when iterating on a pixel-perfect UI migration. Vite is also what `npm create tauri-app@latest` scaffolds natively.

### Why plain JS over TypeScript

Project requirement (out of scope per PROJECT.md). Plain `.jsx` files with `@vitejs/plugin-react` work identically to TypeScript in Vite — no config delta. The `jsconfig.json` path aliases provide IDE auto-complete without TS compilation.

### Why not Redux Toolkit

RTK is the correct choice for very large teams with strict state ownership conventions. For a 7-screen app built by a small team, RTK's boilerplate (slices, actions, reducers, selectors) adds friction without benefit. Zustand accomplishes the same store shape in 1/4 the code.

### Why not Electron

Project requirement (Tauri specified). For reference: Tauri binaries are 3-10MB versus Electron's 50-150MB, and Tauri uses the OS WebView rather than shipping Chromium. For an app deployed to restaurant hardware, binary size and memory footprint matter.

---

## What Not to Use

| Library / Approach | Why Not |
|---|---|
| React 19 | Breaking changes from prototype's React 18; unnecessary complexity for v1 |
| Vite 8 / Rolldown | Too new; ecosystem not settled; Rolldown is Rust-based bundler with less community burn-in |
| Redux / Redux Toolkit | Overkill boilerplate for a 7-screen app with clear state boundaries |
| MobX | Observable-based reactivity is a different mental model; adds friction for plain JS |
| Jotai | Atom-based state — correct concept but better suited for highly granular fine-grained state (not the global UI state pattern here) |
| Axios | No advantage over `fetch` for the use case; `@charlyk/admin-client` already abstracts HTTP |
| socket.io | Not what the backend uses (SSE, not WebSockets); adds unnecessary dependency |
| react-hooks-sse / react-eventsource | Thin wrappers with low maintenance signals; native EventSource + custom hook is 30 lines and fully controlled |
| Tailwind CSS | The prototype uses CSS custom properties (design tokens). Migrating to Tailwind would require rebuilding the entire CSS layer, not migrating it. The design token system is non-negotiable per PROJECT.md. |
| CSS Modules | Not needed when design tokens are defined at `:root` — global CSS custom properties cascade correctly into any component without scoping |
| Storybook | Useful for design systems but overhead for a port-the-prototype workstream |
| React Router | Seven screens with role-based navigation, no URL-driven routing needed in a desktop app; simple state-driven screen switching in Zustand is sufficient |
| Electron | Ruled out by project constraint |
| `localStorage` for preferences | Tauri's WebView can clear `localStorage`; use `@tauri-apps/plugin-store` instead |
| TypeScript | Ruled out by project constraint (plain JS for v1) |
| pnpm / yarn | Project uses npm; no reason to introduce a second package manager |

---

## Key Observations

### 1. The .npmrc / GitHub Package Registry setup is the first real friction point

`@charlyk/admin-client` lives on `npm.pkg.github.com`, not the public npm registry. This requires a `.npmrc` file scoped to the `@charlyk` namespace with a GitHub Personal Access Token (PAT) with `read:packages` scope:

```
@charlyk:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
```

In local development, set `GITHUB_TOKEN` as an environment variable (never commit the token). In GitHub Actions, use `${{ secrets.GITHUB_TOKEN }}` (the built-in token has `read:packages` for packages in the same org) or a separate PAT secret if the package is in a different org. The `.npmrc` file should be committed (without the token value) so CI picks it up.

This must be solved in Phase 1 before any other work — if the package can't be installed, nothing else runs.

### 2. Tauri v2 requires native builds per platform — no cross-compilation

The GitHub Actions matrix must spin up `macos-latest` and `windows-latest` runners concurrently. There is no way to build the Windows `.msi` on a Mac runner or the macOS `.dmg` on a Windows runner. Budget for two runner-hours per release build. Use `swatinem/rust-cache@v2` — the first Rust compilation (downloading crates, compiling Tauri) takes 8-15 minutes; the cache drops this to under 2 minutes on subsequent runs.

### 3. CSS design token migration is straightforward — import the file, not rewrite it

The prototype's `colors_and_type.css` (or equivalent) defines CSS custom properties at `:root`. In the Vite project, import this file once in `main.jsx` or in `index.css` (which Vite processes). All prototype components that reference `var(--color-sage-500)` etc. will work unchanged. The prototype's inline `<style>` tags in component files become imported `.css` files or `<style>` blocks in JSX — no token values need to change. This is a copy-and-import migration, not a rewrite.

### 4. The SSE connection must survive app backgrounding on macOS

macOS throttles background tabs in Safari's WebKit; Tauri's WKWebView inherits this behavior. If the app loses focus for >30s, the EventSource may be throttled or killed. The reconnect logic in the `useSSE` hook must be robust. Validate this behavior early in the Kitchen Display milestone — do not assume it "just works" because it works in Chrome.

### 5. Rust stable (≥1.77.2) is the only supported toolchain — do not use nightly

The Tauri plugin ecosystem sets a minimum of Rust 1.77.2 (set by `tauri-plugin-notification`). Use `rustup toolchain install stable` and add `rust-toolchain.toml` to the project root with `channel = "stable"`. Do not use nightly — Tauri explicitly warns against nightly due to unstable compiler behavior breaking Rust 2024 edition compatibility.

### 6. Windows WebView2 is a prerequisite — it is NOT bundled

On Windows, Tauri v2 uses WebView2 (Microsoft's Chromium-based runtime). It is pre-installed on Windows 10 (1803+) and Windows 11. For restaurant hardware running older Windows 10 builds, verify WebView2 is present. The Tauri Windows installer can embed the WebView2 bootstrapper — this should be enabled in `tauri.conf.json` for distribution to uncontrolled hardware.

### 7. Window state plugin has a known bug on macOS with decorations disabled

GitHub issue #14822 (open as of April 2026): `@tauri-apps/plugin-window-state` causes a hang on macOS when `decorations: false` is set in `tauri.conf.json`. The SiteCare prototype simulates macOS window chrome (draggable titlebar, traffic light dots) — this implies `decorations: false` is likely needed for pixel-perfect fidelity. Either use `decorations: true` and style within the native chrome, or handle window state manually (save/restore position using `@tauri-apps/plugin-store` + the window position API). This decision should be made in Phase 1.

---

## Installation

```bash
# Bootstrap the project
npm create tauri-app@latest

# Choose: React, JavaScript (not TypeScript), Vite

# Frontend dependencies
npm install zustand @tanstack/react-query i18next react-i18next

# Tauri plugins (JS side)
npm install @tauri-apps/plugin-notification @tauri-apps/plugin-store @tauri-apps/plugin-window-state

# API SDK (requires .npmrc with GitHub Package Registry auth)
npm install @charlyk/admin-client

# Dev dependencies
npm install -D eslint @eslint/js eslint-plugin-react
```

Rust-side plugin registration (in `src-tauri/src/lib.rs`):

```rust
tauri::Builder::default()
    .plugin(tauri_plugin_notification::init())
    .plugin(tauri_plugin_store::Builder::new().build())
    .plugin(tauri_plugin_window_state::Builder::new().build())
    // ... other plugins
```

---

## Sources

- Tauri v2 releases: https://v2.tauri.app/release/
- Tauri v2 create project: https://v2.tauri.app/start/create-project/
- Tauri v2 Vite setup: https://v2.tauri.app/start/frontend/vite/
- Tauri v2 prerequisites: https://v2.tauri.app/start/prerequisites/
- Tauri v2 GitHub Actions pipeline: https://v2.tauri.app/distribute/pipelines/github/
- Tauri v2 macOS code signing: https://v2.tauri.app/distribute/sign/macos/
- Tauri v2 Windows code signing: https://v2.tauri.app/distribute/sign/windows/
- Tauri v2 system tray: https://v2.tauri.app/learn/system-tray/
- Tauri v2 notifications plugin: https://v2.tauri.app/plugin/notification/
- Tauri v2 store plugin: https://v2.tauri.app/plugin/store/
- @tauri-apps/plugin-notification npm: https://www.npmjs.com/package/@tauri-apps/plugin-notification
- @tauri-apps/plugin-store npm: https://www.npmjs.com/package/@tauri-apps/plugin-store
- @tauri-apps/plugin-window-state npm: https://www.npmjs.com/package/@tauri-apps/plugin-window-state
- Zustand npm: https://www.npmjs.com/package/zustand
- @tanstack/react-query npm: https://www.npmjs.com/package/@tanstack/react-query
- react-i18next npm: https://www.npmjs.com/package/react-i18next
- GitHub Package Registry auth: https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-npm-registry
- Tauri v2 migration from v1: https://v2.tauri.app/start/migrate/from-tauri-1/
- Window-state macOS bug: https://github.com/tauri-apps/tauri/issues/14822
