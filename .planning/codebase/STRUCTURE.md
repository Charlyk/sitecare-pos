# Codebase Structure

**Analysis Date:** 2026-04-22

## Overview

The deliverable is a static HTML prototype. The entire runnable app lives inside `sitecare-orders/project/`. There is no `node_modules`, no `package.json`, and no build output directory. Opening `index.html` directly in a browser is sufficient to run the prototype.

## Directory Layout

```
sitecare-pos/                            # repo root
├── .planning/                           # GSD planning docs (this file lives here)
│   └── codebase/
├── sitecare-orders/
│   ├── README.md                        # project notes
│   └── project/                         # RUNNABLE APP ROOT
│       ├── index.html                   # single entry point; loads all scripts
│       ├── assets/
│       │   ├── colors_and_type.css      # design tokens + global typography + layout CSS
│       │   ├── fonts/
│       │   │   ├── Inter-Bold.ttf
│       │   │   ├── Outfit-Black.ttf
│       │   │   └── Outfit-Bold.ttf
│       │   ├── sitecare-logo.png
│       │   └── sitecare-logo-white.png
│       ├── lib/
│       │   └── macos-window.jsx         # standalone macOS Tahoe glass UI components (unused by main app)
│       └── src/
│           ├── icons.jsx                # SVG icon registry → window.Icon
│           ├── i18n.jsx                 # bilingual strings (ro/en) → window.useT
│           ├── data.jsx                 # mock data + helper functions → window.ORDERS etc.
│           ├── app.jsx                  # root App component + ReactDOM.createRoot
│           ├── shell.jsx                # sidebar + topbar layout shell → window.Shell
│           ├── screen-orders.jsx        # Orders list screen → window.OrdersScreen
│           ├── screen-kitchen.jsx       # Kitchen display screen → window.KitchenScreen
│           ├── screen-pos.jsx           # Point-of-sale / new order screen → window.PosScreen
│           ├── screen-detail.jsx        # Order detail + thermal ticket → window.OrderDetailScreen, window.ThermalTicket
│           ├── screen-menu.jsx          # Menu/stock availability screen → window.MenuScreen
│           ├── screen-printer.jsx       # Printer config screen → window.PrinterScreen
│           └── screen-settings.jsx      # Settings screen → window.SettingsScreen
```

## Directory Purposes

**`sitecare-orders/project/`**
- The self-contained runnable prototype. Everything needed to open in a browser is here.
- No build step. Open `index.html` directly.

**`sitecare-orders/project/assets/`**
- Static assets only: CSS design tokens, local font files, logo images.
- `colors_and_type.css` is the single CSS file for the entire app. It defines CSS custom properties (`--sc-primary`, `--sc-terracotta`, `--sc-foreground`, etc.), font-face declarations, and all reusable utility classes (`card`, `chip`, `btn-primary`, `nav-item`, `toast`, etc.).
- The inline `<style>` block in `index.html` defines structural layout rules (`.desktop-stage`, `.win`, `.app-body`, `.sidebar`, `.topbar`, `.content`).

**`sitecare-orders/project/lib/`**
- One file: `macos-window.jsx`. Exports `MacWindow`, `MacSidebar`, `MacSidebarItem`, `MacSidebarHeader`, `MacToolbar`, `MacGlass`, `MacTrafficLights` as `window.*` globals.
- These are macOS Tahoe liquid glass UI primitives. They are **not used by the main app** (`app.jsx`, `shell.jsx`, or any screen). This file exists as a standalone design component reference and is not loaded by `index.html`.

**`sitecare-orders/project/src/`**
- All application logic. Twelve JSX files, loaded in order by `index.html`.

## Key File Locations

**Entry Point:**
- `sitecare-orders/project/index.html` — loads React + Babel from CDN, then loads all `src/*.jsx` files in dependency order as `<script type="text/babel">` tags. `app.jsx` is last; it calls `ReactDOM.createRoot`.

**Global Utilities (load first):**
- `sitecare-orders/project/src/icons.jsx` — `window.Icon` component; SVG paths for ~30 named icons
- `sitecare-orders/project/src/i18n.jsx` — `window.useT(lang)` translation helper; `window.I18N` dictionary
- `sitecare-orders/project/src/data.jsx` — all mock data arrays and formatting helpers

**Layout Shell:**
- `sitecare-orders/project/src/shell.jsx` — `window.Shell`; renders the macOS-style title bar, sidebar nav, and topbar. Accepts `children` (the active screen).

**Root App:**
- `sitecare-orders/project/src/app.jsx` — `App` component with all top-level state. Also contains `AcceptDialog` and `TweaksPanel` components inline. Calls `ReactDOM.createRoot`.

**Screens (one file per screen):**
- `sitecare-orders/project/src/screen-orders.jsx`
- `sitecare-orders/project/src/screen-kitchen.jsx`
- `sitecare-orders/project/src/screen-pos.jsx`
- `sitecare-orders/project/src/screen-detail.jsx`
- `sitecare-orders/project/src/screen-menu.jsx`
- `sitecare-orders/project/src/screen-printer.jsx`
- `sitecare-orders/project/src/screen-settings.jsx`

**Design Tokens:**
- `sitecare-orders/project/assets/colors_and_type.css`

## Naming Conventions

**Files:**
- Screen files: `screen-{name}.jsx` — always lowercase, hyphen-separated (e.g., `screen-orders.jsx`, `screen-kitchen.jsx`)
- Utility/infrastructure files: lowercase single word (`app.jsx`, `shell.jsx`, `data.jsx`, `icons.jsx`, `i18n.jsx`)
- Lib components: `macos-window.jsx` — hyphen-separated

**Components (function names):**
- Screens: PascalCase with `Screen` suffix — `OrdersScreen`, `KitchenScreen`, `PosScreen`, `OrderDetailScreen`, `MenuScreen`, `PrinterScreen`, `SettingsScreen`
- Sub-components: PascalCase, descriptive — `OrderCard`, `KitchenTicket`, `ThermalTicket`, `AcceptDialog`, `TweaksPanel`, `StatTile`, `AvailSwitch`, `Field`, `Toggle`
- Shell: `Shell` (no suffix)

**`useState` aliases:**
- Each file aliases `React.useState` to avoid collisions in the shared global scope: `useStateApp`, `useStateOrders`, `useStateK`, `useStateP`, `useStateD`. This is a workaround for the no-bundler constraint.

**CSS classes:**
- BEM-adjacent, hyphen-separated: `.nav-item`, `.nav-group-label`, `.brand-logo`, `.topbar-title`, `.chip-sage`, `.btn-primary`, `.icon-btn`
- Modifier classes appended: `.chip.chip-sage`, `.chip.chip-dot`, `.card.shadow`, `.density-compact`

**window globals:**
- Components: PascalCase — `window.Shell`, `window.Icon`, `window.OrdersScreen`
- Data arrays: SCREAMING_SNAKE_CASE — `window.ORDERS`, `window.MENU_ITEMS`, `window.PRINTERS`, `window.USERS`
- Helper functions: camelCase — `window.formatRON`, `window.elapsedMinutes`, `window.orderTimeLabel`, `window.useT`
- Metadata helpers (defined in `screen-orders.jsx`): `window.sourceMeta`, `window.typeMeta`, `window.stateMeta`

## Script Load Order (index.html)

The load order is the dependency graph. Violating it causes runtime errors:

```
1. icons.jsx         (no deps)
2. i18n.jsx          (no deps)
3. data.jsx          (no deps)
4. shell.jsx         (needs window.Icon, window.useT)
5. screen-orders.jsx (needs window.Icon, window.useT, window.formatRON, window.elapsedMinutes, window.orderTimeLabel)
6. screen-kitchen.jsx(needs window.Icon, window.useT, window.typeMeta, window.elapsedMinutes)
7. screen-pos.jsx    (needs window.Icon, window.useT, window.MENU_CATEGORIES, window.MENU_ITEMS, window.typeMeta, window.formatRON)
8. screen-detail.jsx (needs window.Icon, window.useT, window.sourceMeta, window.typeMeta, window.stateMeta, window.formatRON, window.orderTimeLabel)
9. screen-menu.jsx   (needs window.Icon, window.MENU_CATEGORIES, window.MENU_ITEMS, window.formatRON)
10. screen-printer.jsx (needs window.Icon, window.useT, window.PRINTERS, window.ThermalTicket, window.ORDERS)
11. screen-settings.jsx (needs window.Icon, window.useT, window.USERS)
12. app.jsx          (needs window.Shell + all screen components + window.Icon + window.useT + window.formatRON)
```

## Where to Add New Code

**New screen:**
1. Create `sitecare-orders/project/src/screen-{name}.jsx`
2. Export via `window.{Name}Screen = {Name}Screen;` at the bottom
3. Add `<script type="text/babel" src="src/screen-{name}.jsx"></script>` to `index.html` before `app.jsx`
4. Add conditional render in `app.jsx`: `{screen === '{name}' && <window.{Name}Screen lang={lang} />}`
5. Add nav entry in `shell.jsx` `navGroups` array

**New utility function:**
- If globally needed: add to `sitecare-orders/project/src/data.jsx` and export via `window.{fnName}`
- If screen-local: define inside the screen file, no export needed

**New i18n string:**
- Add the key to both `ro` and `en` objects in `sitecare-orders/project/src/i18n.jsx`

**New icon:**
- Add an SVG path case to the icon registry in `sitecare-orders/project/src/icons.jsx`

**New CSS utility class:**
- Add to `sitecare-orders/project/assets/colors_and_type.css` for design tokens and reusable component styles
- Add to the `<style>` block in `index.html` for structural/layout rules

## Special Directories

**`lib/`:**
- Purpose: standalone UI component library (macOS Tahoe glass components)
- Generated: No — hand-authored
- Committed: Yes
- Note: Not wired into the main app. Safe to ignore when working on POS screens.

**`.planning/`:**
- Purpose: GSD planning and codebase analysis documents
- Generated: Yes — by GSD mapper commands
- Committed: Yes (intended as team reference)
