# Phase 1: Foundation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-22
**Phase:** 01-foundation
**Areas discussed:** Window chrome, Scaffold location, CSS migration, API domain for CSP

---

## Window chrome

| Option | Description | Selected |
|--------|-------------|----------|
| Custom titlebar (decorations: false) | Keep prototype's macOS chrome from lib/macos-window.jsx. Pixel-perfect but has known plugin-window-state bug on macOS. | |
| Native OS chrome (decorations: true) | Standard Tauri window chrome. No bug, slight deviation from prototype design. | ✓ |

**User's choice:** Native OS chrome  
**Notes:** Accepted deviation from prototype's macOS titlebar simulation. Bug avoidance was the deciding factor.

---

## Scaffold location

| Option | Description | Selected |
|--------|-------------|----------|
| At repo root | Move prototype to _prototype/, scaffold Tauri+Vite at root. Standard layout. | ✓ |
| In app/ subdirectory | Keep prototype at root, Tauri app in app/. Awkward for CI and IDE tooling. | |

**User's choice:** At repo root  
**Notes:** Prototype files archived to `_prototype/` before scaffolding.

---

## CSS migration

| Option | Description | Selected |
|--------|-------------|----------|
| Single global styles.css (recommended) | Lift index.html <style> block verbatim to src/styles.css. Zero class name changes. | ✓ |
| Per-screen CSS files | Split by screen. More modular but shared utilities (card, btn-primary) still need a common file. | |

**User's choice:** Single global styles.css  
**Notes:** Simplest path — existing class names preserved unchanged.

---

## API domain for CSP

| Option | Description | Selected |
|--------|-------------|----------|
| User provides domain | Actual API domain for tauri.conf.json connect-src | ✓ |
| Wildcard for now | connect-src: * temporarily | |
| Unknown / placeholder | api.example.com placeholder + TODO | |

**User's choice:** `https://api.restaurant.sitecare.ro`  
**Notes:** Real domain confirmed by user. No placeholder needed. Configure connect-src and event-src on day 1.

---

## Claude's Discretion

- Zustand store shape — single store with logical grouping; exact slice structure left to Claude
- `window.*` migration order — i18n.jsx first, then icons.jsx, then leaf screens, then shell, then app
- Window position and default window size — Claude decides

## Deferred Ideas

None.
