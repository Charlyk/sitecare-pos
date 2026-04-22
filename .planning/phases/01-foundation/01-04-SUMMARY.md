---
phase: 01-foundation
plan: 04
subsystem: frontend
tags: [es-modules, prototype-conversion, window-globals, react, vite]
dependency_graph:
  requires: [01-02, 01-03]
  provides: [src/i18n.jsx, src/icons.jsx, src/data.jsx, src/screen-orders.jsx, src/screen-kitchen.jsx, src/screen-pos.jsx, src/screen-menu.jsx, src/screen-settings.jsx, src/screen-detail.jsx]
  affects: [01-05]
tech_stack:
  added: []
  patterns: [ES-module-named-exports, import-graph-dependency-order, React-Fragment-import]
key_files:
  created:
    - src/i18n.jsx
    - src/icons.jsx
    - src/data.jsx
    - src/screen-orders.jsx
    - src/screen-kitchen.jsx
    - src/screen-pos.jsx
    - src/screen-menu.jsx
    - src/screen-settings.jsx
    - src/screen-detail.jsx
  modified: []
decisions:
  - "Converted React.Fragment CDN global to named Fragment import from 'react' in screen-detail.jsx — JSX fragment syntax shorthand <> would also work but explicit import matches existing code style"
  - "Added shield icon to icons.jsx — used by screen-settings.jsx for fiscal register display, was missing from prototype icons.jsx"
metrics:
  duration: 9 minutes
  completed: 2026-04-22
  tasks_completed: 2
  files_created: 9
  files_modified: 0
---

# Phase 1 Plan 4: ES Module Conversion (Utility + Screen Modules) Summary

**One-liner:** Converted all 9 prototype files from `window.*` CDN global module system to proper ES module `import`/`export` in strict dependency order — zero window.* module assignments remain in converted files.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Convert utility modules — i18n, icons, data | b9dfa1e | src/i18n.jsx, src/icons.jsx, src/data.jsx |
| 2 | Convert screen modules — orders, kitchen, pos, menu, settings, detail | ca1b723 | src/screen-orders.jsx, src/screen-kitchen.jsx, src/screen-pos.jsx, src/screen-menu.jsx, src/screen-settings.jsx, src/screen-detail.jsx |

## What Was Built

Converted 9 prototype files from the `window.*` global module system to proper ES modules following the mandatory 8-step dependency order (steps 1-6 of 8):

**Step 1 — i18n.jsx:** `export const I18N` (full bilingual dictionary, ro + en) and `export function useT(lang)` — the factory function that returns a translator. No React import needed (pure JS, no JSX). All `window.I18N` and `window.useT` assignments removed.

**Step 2 — icons.jsx:** `import React from 'react'` added (JSX requires it), `export const ICON_PATHS` with all SVG path strings verbatim, `export function Icon` component. `window.Icon` assignment removed.

**Step 3 — data.jsx:** `export const` for all 5 data arrays (MENU_CATEGORIES, MENU_ITEMS, ORDERS, PRINTERS, USERS) and `export const` for 3 helper functions (formatRON, elapsedMinutes, orderTimeLabel). All `window.*` assignments at bottom removed.

**Step 4 — screen-orders.jsx:** Critical 4-symbol export: `export { OrdersScreen, sourceMeta, typeMeta, stateMeta }`. The `sourceMeta`/`typeMeta`/`stateMeta` helper functions are consumed by `screen-detail.jsx` and `screen-kitchen.jsx` respectively. All `window.` reads removed from `OrderCard` and `OrdersScreen` function bodies.

**Step 5 — Leaf screens (kitchen, pos, menu, settings):**
- `screen-kitchen.jsx`: imports `typeMeta` from `./screen-orders.jsx`; exports `KitchenScreen`
- `screen-pos.jsx`: imports `typeMeta` from `./screen-orders.jsx`, `MENU_CATEGORIES`/`MENU_ITEMS`/`formatRON` from `./data.jsx`; exports `PosScreen`
- `screen-menu.jsx`: imports from `./data.jsx`; exports `MenuScreen`
- `screen-settings.jsx`: imports `USERS` from `./data.jsx`; exports `SettingsScreen`

**Step 6 — screen-detail.jsx:** Imports `sourceMeta`/`typeMeta`/`stateMeta` from `./screen-orders.jsx` and helpers from `./data.jsx`. Exports both `OrderDetailScreen` AND `ThermalTicket` (ThermalTicket is also consumed by `screen-printer.jsx` in Plan 05).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing] Added `shield` icon to icons.jsx**
- **Found during:** Task 2 (screen-settings.jsx conversion)
- **Issue:** `screen-settings.jsx` uses `<Icon name="shield" />` for the fiscal cash register display, but the `shield` icon was not present in the prototype's `icons.jsx`. The prototype must have relied on a different version of the file or the icon rendered null silently.
- **Fix:** Added `shield: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z'` to `ICON_PATHS` in `icons.jsx`.
- **Files modified:** src/icons.jsx
- **Commit:** b9dfa1e

**2. [Rule 1 - Bug] Fixed React.Fragment CDN global reference in screen-detail.jsx**
- **Found during:** Task 2 (screen-detail.jsx conversion)
- **Issue:** The prototype's `screen-detail.jsx` used `<React.Fragment key={i}>` relying on `window.React` CDN global. In the ES module version, `React` is not in scope unless explicitly imported.
- **Fix:** Added `Fragment` to the `import { useState, Fragment } from 'react'` statement; replaced `React.Fragment` with `Fragment` in the timeline map.
- **Files modified:** src/screen-detail.jsx
- **Commit:** ca1b723

## Verification Results

```
window.* occurrences in all 9 converted files: 0
export { OrdersScreen, sourceMeta, typeMeta, stateMeta } — confirmed in screen-orders.jsx
export { OrderDetailScreen, ThermalTicket } — confirmed in screen-detail.jsx
npm run build: 26 modules transformed, built in 247ms — zero errors
```

## Known Stubs

The following mock data arrays in `data.jsx` are intentional Phase 1 stubs. They are explicitly documented as Phase 3 replacements:

| Stub | File | Reason |
|------|------|--------|
| `ORDERS` array (8 mock orders) | src/data.jsx | Phase 1 stub — Phase 3 replaces with `useOrders()` TanStack Query hook |
| `MENU_CATEGORIES` / `MENU_ITEMS` | src/data.jsx | Phase 1 stub — Phase 3 replaces with `useMenu()` TanStack Query hook |
| `PRINTERS` / `USERS` | src/data.jsx | Phase 1 stub — Phase 3/4 wires real data |

These stubs do not prevent the plan's goal (ES module conversion). Plan 05 (shell + app.jsx) will wire them into the React component tree.

## Self-Check

- [x] src/i18n.jsx exists: FOUND
- [x] src/icons.jsx exists: FOUND
- [x] src/data.jsx exists: FOUND
- [x] src/screen-orders.jsx exists: FOUND
- [x] src/screen-kitchen.jsx exists: FOUND
- [x] src/screen-pos.jsx exists: FOUND
- [x] src/screen-menu.jsx exists: FOUND
- [x] src/screen-settings.jsx exists: FOUND
- [x] src/screen-detail.jsx exists: FOUND
- [x] Commit b9dfa1e exists: FOUND
- [x] Commit ca1b723 exists: FOUND

## Self-Check: PASSED
