# Technology Stack

**Analysis Date:** 2026-04-22

## Overview

This is a UI prototype delivered as a static HTML bundle. There is no build step, no bundler, no Node.js runtime, and no package manager. All dependencies are loaded via CDN at runtime. JSX is compiled in the browser by Babel Standalone.

## Details

### Languages

**Primary:**
- JavaScript (ES2020+) — all application logic written as `.jsx` files
- JSX — transpiled in-browser by `@babel/standalone`; no pre-compilation step
- CSS — split between an inline `<style>` block in `index.html` and a separate design-token file

### Runtime Environment

- **Browser-only** — the prototype runs entirely in the browser; open `index.html` directly from disk (file://) or serve it with any static HTTP server
- **No Node.js required** — no `package.json`, no `node_modules`, no lockfile
- **No bundler** — Vite, Webpack, and Rollup are absent; scripts are loaded sequentially via `<script>` tags

### Frameworks

| Framework | Version | How loaded |
|-----------|---------|------------|
| React | 18.3.1 | CDN — `unpkg.com`, UMD development build |
| ReactDOM | 18.3.1 | CDN — `unpkg.com`, UMD development build |
| @babel/standalone | 7.29.0 | CDN — `unpkg.com` |

React is used via global `window.React` and `window.ReactDOM`; components share state through the `window` object (e.g., `window.Shell`, `window.OrdersScreen`, `window.ORDERS`).

### Application Structure

Entry point: `sitecare-orders/project/index.html`

Source files loaded sequentially via `<script type="text/babel">`:

| File | Role |
|------|------|
| `src/icons.jsx` | SVG icon registry |
| `src/i18n.jsx` | Bilingual string table (Romanian + English) |
| `src/data.jsx` | Static mock data and helper functions |
| `src/shell.jsx` | App shell, sidebar, nav |
| `src/screen-orders.jsx` | Orders list screen |
| `src/screen-kitchen.jsx` | Kitchen display screen |
| `src/screen-pos.jsx` | Point-of-sale / new order screen |
| `src/screen-detail.jsx` | Order detail screen |
| `src/screen-menu.jsx` | Menu management screen |
| `src/screen-printer.jsx` | Printer configuration screen |
| `src/screen-settings.jsx` | Settings screen |
| `src/app.jsx` | Root `App` component, mounts via `ReactDOM.createRoot` |

Library component: `lib/macos-window.jsx` — standalone macOS Tahoe-style window chrome (pure JS/CSS, no dependencies).

### Styling

Two-layer CSS approach:

1. **Design tokens** — `assets/colors_and_type.css`: CSS custom properties defining the full SiteCare design system (colors, typography scale, spacing, radii, shadows). Source of truth is described as `src/app/globals.css @ Charlyk/sitecare-landing`.
2. **Component styles** — inline `<style>` block in `index.html`: layout classes, nav items, buttons, cards, chips, toasts, tweaks panel, scrollbar overrides, and keyframe animations.

No CSS Modules, no Tailwind, no CSS-in-JS.

### Fonts

| Font | Weights | Source |
|------|---------|--------|
| Outfit | 700, 900 | Local `.ttf` files at `assets/fonts/Outfit-Bold.ttf`, `assets/fonts/Outfit-Black.ttf` |
| Outfit | 300, 400, 500, 600, 800 | Google Fonts CDN (fallback for weights without local files) |
| Caveat | 400, 600, 700 | Google Fonts CDN (handwriting accent) |
| Inter | Bold | Local `.ttf` file at `assets/fonts/Inter-Bold.ttf` (available but not declared in CSS `@font-face`) |

### State Management

- React `useState` / `useEffect` hooks only (no Redux, Zustand, or Context API)
- Prototype state is stored in `window.*` globals for cross-file sharing
- UI preferences (language, role, screen, accent, density, sidebar collapse) persist to `localStorage`

### Viewport / Scaling

The prototype renders a fixed 1440×900 canvas letterboxed inside the browser viewport. A `resize` listener recalculates a CSS `scale()` transform to fit the frame on any screen size.

## Key Observations

- **Development build of React is intentional for a prototype** — no production optimisation needed; source maps and warnings are available in DevTools.
- **Babel Standalone is a prototype-only choice** — it compiles JSX at runtime on every page load; unsuitable for production.
- **No package manager or lockfile** — dependency versions are pinned via `integrity` SRI hashes on each CDN `<script>` tag, which provides reproducibility without a lockfile.
- **Global `window` namespace is the module system** — components and data are exported onto `window` rather than using ES Modules or CommonJS. This avoids the need for a bundler but creates implicit coupling between files.
- **Inter-Bold.ttf is present but unused** — the font file exists at `assets/fonts/Inter-Bold.ttf` but no `@font-face` rule references it and no CSS uses `font-family: Inter`.
- **Caveat and lighter Outfit weights depend on network** — if Google Fonts is unavailable, handwriting accents fall back to system `cursive` and body text falls back to `system-ui`.
