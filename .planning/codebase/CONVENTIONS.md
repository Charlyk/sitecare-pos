# Coding Conventions

**Analysis Date:** 2026-04-22

## Overview

This is a browser-native React prototype delivered as a Claude Design handoff bundle. There is no build toolchain: JSX is transpiled at runtime by `@babel/standalone`. All source files are loaded as `<script type="text/babel">` tags in `index.html`. Conventions are informal but internally consistent across the codebase.

## Details

### File Naming

- All source files use **kebab-case**: `screen-orders.jsx`, `screen-pos.jsx`, `screen-kitchen.jsx`, `colors_and_type.css`.
- All source files share the `.jsx` extension regardless of whether they contain JSX markup.
- Files are flat inside `sitecare-orders/project/src/` — no subdirectories.

### Component Naming

- All React components use **PascalCase**: `App`, `Shell`, `OrderCard`, `OrdersScreen`, `PosScreen`, `AcceptDialog`, `TweaksPanel`, `Icon`.
- Screen-level components follow the pattern `<Name>Screen` (e.g., `OrdersScreen`, `PosScreen`, `KitchenScreen`).
- Dialog/overlay components are named with a `Dialog` suffix (e.g., `AcceptDialog`).

### Global Registration Pattern

Because there is no module system, each file exports its component(s) by assigning to `window`:

```js
// shell.jsx
window.Shell = Shell;

// screen-orders.jsx
window.OrdersScreen = OrdersScreen;
window.sourceMeta = sourceMeta;

// icons.jsx
window.Icon = Icon;

// i18n.jsx
window.useT = function useT(lang) { ... };
window.I18N = I18N;

// data.jsx
window.ORDERS = ORDERS;
window.formatRON = (n) => ...;
window.elapsedMinutes = (iso) => ...;
```

Components access siblings via `window.*` inside their function bodies:

```js
// Inside any component
const Icon = window.Icon;
const t = window.useT(lang);
const typ = window.typeMeta(order.type, t);
```

### Hook Naming (Alias Pattern)

Because all files share a single global scope, React hooks are imported once per file under unique aliases to avoid collision:

```js
// app.jsx
const { useState: useStateApp, useEffect: useEffectApp } = React;

// screen-orders.jsx
const { useState: useStateOrders } = React;

// screen-pos.jsx
const { useState: useStateP, useMemo } = React;
```

This is the primary workaround for the no-module constraint.

### React Patterns

- All components are **functional components**. No class components exist.
- State is managed with `useState`. `useEffect` is used for side effects (localStorage persistence, viewport scaling, timers, `window.addEventListener`).
- `useMemo` appears in `screen-pos.jsx` (imported but used implicitly for derived values).
- Props are passed as plain named parameters with no TypeScript types — all prop shapes are implicit.
- Children are passed via the standard `children` prop in `Shell`.

### Prop Passing Style

Props are spread verbosely; no prop destructuring at the call site. `TweaksPanel` uses spread:

```jsx
{tweaksOn && <TweaksPanel {...{ lang, setLang, role, setRole, accent, setAccent, density, setDensity }} />}
```

All other components receive props individually by name.

### State Persistence

Six app-level state values are persisted to `localStorage` with `sc_` prefixed keys:

| Key | Value type |
|---|---|
| `sc_lang` | `'ro'` \| `'en'` |
| `sc_role` | `'cashier'` \| `'kitchen'` |
| `sc_screen` | screen id string |
| `sc_accent` | accent theme string |
| `sc_density` | `'balanced'` \| `'dense'` |
| `sc_sidebar_collapsed` | `'0'` \| `'1'` |

Each is written with a dedicated `useEffect` that declares only that value as a dependency.

### CSS Architecture

CSS lives in two places:

1. **`sitecare-orders/project/assets/colors_and_type.css`** — design tokens only. Defines all `--sc-*` custom properties on `:root`: colors (HSL), typography scale (`--sc-type-*`), spacing/radius scale, shadow scale, layout constants.
2. **`sitecare-orders/project/index.html` `<style>` block** — all layout and component CSS. Utility classes (`card`, `chip`, `btn-primary`, `btn-secondary`, `btn-ghost`, `icon-btn`, `nav-item`, etc.) and animations are defined here.

No CSS-in-JS library is used. Component-level styling uses **inline `style` objects** for dynamic values (conditionals, computed sizes) and **class names** for static reusable rules.

Example of the mixed pattern:

```jsx
<div
  className="card shadow"
  style={{ padding: 16, border: order.state === 'new' ? '1.5px solid ...' : '1px solid ...' }}
>
```

### Design Token Usage

All color and spacing values reference `--sc-*` CSS custom properties:

- `var(--sc-primary)` — sage green (default), dynamically overridden at runtime per accent choice
- `var(--sc-terracotta)` — red-orange accent for handwriting and alerts
- `var(--sc-muted-foreground)` — secondary text
- `var(--sc-background)` — warm cream page background
- `var(--sc-border)` / `hsl(120 10% 88%)` — border color (the HSL literal is used interchangeably with the token)

The accent system mutates `--sc-primary`, `--sc-primary-hover`, and `--sc-primary-soft` on `document.documentElement` via `useEffect` whenever `accent` state changes (`app.jsx` lines 56–67).

### Typography

Two typefaces are in use:

- **Outfit** — primary sans-serif, weights 400–900. Loaded from Google Fonts and also bundled as `.ttf` for Bold (700) and Black (900).
- **Caveat** — handwriting accent font, used for the brand sub-label ("POS"), greeting text ("bună dimineața"), and `.eyebrow` class elements.

Hardcoded `px` font sizes are used in inline styles. The type scale tokens (`--sc-type-*`) from `colors_and_type.css` are defined but not referenced in component JSX — they are available for future use.

### i18n Pattern

All user-visible strings are keyed through a single `window.useT(lang)` factory:

```js
// i18n.jsx — defines the dictionary
const I18N = { ro: { ... }, en: { ... } };
window.useT = function useT(lang) {
  return (key) => (I18N[lang] && I18N[lang][key]) || key;
};

// Usage in any component
const t = window.useT(lang);
t('accept')        // => 'Acceptă' or 'Accept'
t('nav_orders')    // => 'Comenzi live' or 'Live orders'
```

Romanian (`ro`) is the canonical language; English (`en`) is a mirror. Some short inline strings bypass `t()` and compare `lang === 'ro'` directly (e.g., `lang === 'ro' ? 'Detalii' : 'Details'`). This is inconsistent but intentional for prototype speed.

### Icon Pattern

All icons are defined as a dictionary of SVG path strings in `sitecare-orders/project/src/icons.jsx`:

```js
const ICON_PATHS = {
  zap: 'M13 2 3 14h9l-1 8...',
  check: 'M20 6 9 17l-5-5',
  // multi-path icons separated by '|'
  clipboard: 'M16 4h2...|M15 2H9...',
};
```

The `Icon` component renders inline SVG, splitting on `|` to produce multiple `<path>` elements:

```jsx
function Icon({ name, size = 18, stroke = 1.75, style = {}, className = '' }) {
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

Icons follow a Lucide-style aesthetic (1.5–1.75px stroke, rounded caps). They are always referenced by string name: `<Icon name="check" size={14} />`.

### Data Shape Conventions

Order objects follow a fixed shape defined in `sitecare-orders/project/src/data.jsx`. Key conventions:

- Monetary values are stored as plain numbers (RON, e.g., `32`, `121.28`). Formatting is applied at render time via `window.formatRON(n)` which uses `Intl.NumberFormat('ro-RO')`.
- Timestamps are ISO 8601 strings (`placedAt: new Date().toISOString()`).
- Order IDs are prefixed strings: `'#1047'`. The matching numeric field `num` is also present.
- Menu item names are bilingual: `{ ro: 'Margherita', en: 'Margherita' }`. Access via `it[lang]` in `PosScreen`.
- State machine values: `'new' → 'accepted' → 'preparing' → 'ready' → 'out' → 'done'`.

### Helper Functions (Global)

Defined on `window` in `data.jsx`:

| Function | Signature | Purpose |
|---|---|---|
| `window.formatRON` | `(n: number) => string` | Formats number as Romanian currency |
| `window.elapsedMinutes` | `(iso: string) => number` | Minutes since ISO timestamp |
| `window.orderTimeLabel` | `(iso: string) => string` | Formats time as HH:MM |

### Miscellaneous

- `Math.random().toString(36).slice(2)` is used for toast IDs — no UUID library.
- The `/* global React, ReactDOM, window */` comment at the top of each file is a JSHint/ESLint globals declaration for linters that might run on the file in isolation.
- The `TWEAK_DEFAULTS` block in `app.jsx` is delimited by `/*EDITMODE-BEGIN*/` and `/*EDITMODE-END*/` comments — a marker format used by the Claude Design edit-mode postMessage protocol.

## Key Observations

- **No module system.** All inter-file communication goes through `window.*` assignments. This is intentional for the browser-native, no-build prototype format.
- **Inline styles dominate component-level styling.** CSS classes handle reusable structural patterns; inline styles handle anything conditional or computed.
- **The `--sc-*` token system is well-defined** in `colors_and_type.css` but not fully applied in JSX — inline styles frequently use raw HSL literals (`hsl(120 10% 88%)`) rather than the equivalent token. If this moves to production, a pass to replace literals with token references is needed.
- **Hook aliasing** (e.g., `useStateApp`, `useStateOrders`) is the file-scope collision workaround for the shared global scope — this would not be needed in a module-based system.
- **Bilingual string handling is split** between the `t()` factory (correct) and inline ternaries (shortcut). New strings must go into `i18n.jsx` under both `ro` and `en` keys.
- **All data is in-memory.** `window.ORDERS` is the single source of truth; mutations are done via React state in `App` and never persisted beyond the session.
