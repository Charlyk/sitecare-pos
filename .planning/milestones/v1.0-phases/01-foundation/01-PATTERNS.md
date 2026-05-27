# Phase 1: Foundation - Pattern Map

**Mapped:** 2026-04-22
**Files analyzed:** 16 new/modified files
**Analogs found:** 14 / 16 (2 are greenfield with no prototype analog)

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/main.jsx` | entry point | request-response | `_prototype/src/app.jsx` (ReactDOM.createRoot only) | partial |
| `src/app.jsx` | root component | event-driven | `_prototype/src/app.jsx` | exact |
| `src/store.js` | state store | event-driven | `_prototype/src/app.jsx` (useState slices) | role-match |
| `src/i18n.jsx` | utility | transform | `_prototype/src/i18n.jsx` | exact |
| `src/icons.jsx` | utility / component | transform | `_prototype/src/icons.jsx` | exact |
| `src/data.jsx` | utility / mock data | transform | `_prototype/src/data.jsx` | exact |
| `src/shell.jsx` | layout component | event-driven | `_prototype/src/shell.jsx` | exact |
| `src/screen-orders.jsx` | screen component | event-driven | `_prototype/src/screen-orders.jsx` | exact |
| `src/screen-kitchen.jsx` | screen component | event-driven | `_prototype/src/screen-kitchen.jsx` | exact |
| `src/screen-pos.jsx` | screen component | event-driven | `_prototype/src/screen-pos.jsx` | exact |
| `src/screen-detail.jsx` | screen component | event-driven | `_prototype/src/screen-detail.jsx` | exact |
| `src/screen-menu.jsx` | screen component | event-driven | `_prototype/src/screen-menu.jsx` | exact |
| `src/screen-printer.jsx` | screen component | event-driven | `_prototype/src/screen-printer.jsx` | exact |
| `src/screen-settings.jsx` | screen component | event-driven | `_prototype/src/screen-settings.jsx` | exact |
| `src/colors_and_type.css` | CSS / design tokens | — | `_prototype/assets/colors_and_type.css` | exact (path-adjusted) |
| `src-tauri/tauri.conf.json` | config | — | none (greenfield Tauri config) | none |

---

## Pattern Assignments

---

### `src/i18n.jsx` (utility, transform) — CONVERT FIRST

**Analog:** `sitecare-orders/project/src/i18n.jsx`

**What changes:** Remove the two `window.*` assignments at the bottom. Add named `export` keywords. React is NOT imported (this file has no JSX).

**Full prototype file** (`sitecare-orders/project/src/i18n.jsx`, lines 1–188):
```javascript
/* global window */
// Bilingual strings (ro + en). ro is canonical per SiteCare; en is mirror.
const I18N = {
  ro: {
    nav_orders: 'Comenzi live',
    // ... (full dictionary verbatim) ...
  },
  en: {
    nav_orders: 'Live orders',
    // ... (full dictionary verbatim) ...
  },
};

window.I18N = I18N;
window.useT = function useT(lang) {
  return (key) => (I18N[lang] && I18N[lang][key]) || key;
};
```

**Production ES module conversion** (remove `window.*`, add `export`):
```javascript
// src/i18n.jsx
// REMOVE: /* global window */
// REMOVE: window.I18N = I18N;
// REMOVE: window.useT = function useT(lang) { ... };
// ADD:
export const I18N = { /* ... verbatim ... */ };

export function useT(lang) {
  return (key) => (I18N[lang] && I18N[lang][key]) || key;
}
```

**Migration pitfall:** The `useT` function is a factory — it returns a translator function `t`, it is NOT a React hook despite the `use` prefix. It does NOT need to be inside `useState`/`useEffect`. The prototype calls it at the top of each render function: `const t = window.useT(lang)`. The production equivalent is identical: `const t = useT(lang)` — called at component render time, not inside a hook.

---

### `src/icons.jsx` (utility / component) — CONVERT SECOND

**Analog:** `sitecare-orders/project/src/icons.jsx`

**What changes:** Add `import React from 'react'` (the JSX in `Icon` needs it). Remove `window.Icon = Icon`. Add `export` to `ICON_PATHS` const and `Icon` function.

**Full prototype file** (`sitecare-orders/project/src/icons.jsx`, lines 1–71):
```javascript
/* global React */
// Lucide-style icons (1.5px stroke, rounded caps) — inline SVG paths.
const ICON_PATHS = {
  zap: 'M13 2 3 14h9l-1 8 10-12h-9l1-8z',
  clipboard: 'M16 4h2a2 2 0 0 1 2 2v14...|M15 2H9a1 1 0 0 0-1 1v2...',
  // ... all entries verbatim ...
  lang: 'M5 8h14|M5 8a6 6 0 0 0 12 0|...',
};

function Icon({ name, size = 18, stroke = 1.75, style = {}, className = '' }) {
  const d = ICON_PATHS[name];
  if (!d) return null;
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round"
      style={{ flexShrink: 0, ...style }} className={className}
    >
      {d.split('|').map((p, i) => <path key={i} d={p.trim()} />)}
    </svg>
  );
}

window.Icon = Icon;
```

**Production ES module conversion:**
```javascript
// src/icons.jsx
import React from 'react';

// REMOVE: /* global React */
// REMOVE: window.Icon = Icon;
// ADD export keywords:
export const ICON_PATHS = { /* ... all entries verbatim ... */ };

export function Icon({ name, size = 18, stroke = 1.75, style = {}, className = '' }) {
  const d = ICON_PATHS[name];
  if (!d) return null;
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round"
      style={{ flexShrink: 0, ...style }} className={className}
    >
      {d.split('|').map((p, i) => <path key={i} d={p.trim()} />)}
    </svg>
  );
}
```

---

### `src/data.jsx` (utility / mock data) — CONVERT THIRD

**Analog:** `sitecare-orders/project/src/data.jsx`

**What changes:**
- Add `import React from 'react'` only if JSX is present (data.jsx has none — skip the import).
- Replace all five `window.X = X` data exports with `export const X = ...`.
- Replace three `window.fn = (...)` helper assignments with `export function fn(...)`.
- Keep mock data verbatim for Phase 1. Phases 3+ replace with API calls.

**Prototype exports** (`sitecare-orders/project/src/data.jsx`, lines 175–187):
```javascript
window.MENU_CATEGORIES = MENU_CATEGORIES;
window.MENU_ITEMS = MENU_ITEMS;
window.ORDERS = ORDERS;
window.PRINTERS = PRINTERS;
window.USERS = USERS;

window.formatRON = (n) => new Intl.NumberFormat('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n) + ' lei';
window.elapsedMinutes = (iso) => Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
window.orderTimeLabel = (iso) => {
  const d = new Date(iso);
  return d.toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' });
};
```

**Production ES module conversion:**
```javascript
// src/data.jsx
// REMOVE: /* global window */
// REMOVE: all window.X = X lines
// ADD export to each declaration:
export const MENU_CATEGORIES = [ /* ... verbatim ... */ ];
export const MENU_ITEMS = [ /* ... verbatim ... */ ];
export const ORDERS = [ /* ... verbatim ... */ ];
export const PRINTERS = [ /* ... verbatim ... */ ];
export const USERS = [ /* ... verbatim ... */ ];

export const formatRON = (n) =>
  new Intl.NumberFormat('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n) + ' lei';

export const elapsedMinutes = (iso) =>
  Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));

export const orderTimeLabel = (iso) => {
  const d = new Date(iso);
  return d.toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' });
};
```

---

### `src/screen-orders.jsx` (screen component, event-driven) — CONVERT FOURTH

**Analog:** `sitecare-orders/project/src/screen-orders.jsx`

**What changes:**
- Remove `/* global React, window */` comment.
- Replace `const { useState: useStateOrders } = React` with `import { useState } from 'react'` — use standard names (no alias needed in ES modules).
- Add import block at top.
- Replace every `window.Icon` → `Icon` (imported), `window.useT(lang)` → `useT(lang)`, `window.elapsedMinutes(...)` → `elapsedMinutes(...)`, `window.orderTimeLabel(...)` → `orderTimeLabel(...)`, `window.formatRON(...)` → `formatRON(...)`.
- Remove `window.OrdersScreen = OrdersScreen` etc. at bottom; add named exports.
- `sourceMeta`, `typeMeta`, `stateMeta` are also exported (consumed by `screen-detail.jsx` and `screen-kitchen.jsx`).

**Prototype imports section** (`sitecare-orders/project/src/screen-orders.jsx`, lines 1–3):
```javascript
/* global React, window */
const { useState: useStateOrders } = React;
```

**Production imports block:**
```javascript
// src/screen-orders.jsx
import { useState } from 'react';
import { Icon } from './icons.jsx';
import { useT } from './i18n.jsx';
import { formatRON, elapsedMinutes, orderTimeLabel } from './data.jsx';
```

**Prototype window.* reads inside `OrderCard`** (`sitecare-orders/project/src/screen-orders.jsx`, lines 33–38):
```javascript
function OrderCard({ order, lang, t, onOpen, onAdvance, onPrint }) {
  const Icon = window.Icon;
  const src = sourceMeta(order.source, t);
  const typ = typeMeta(order.type, t);
  const st = stateMeta(order.state, t);
  const elapsed = window.elapsedMinutes(order.placedAt);
```

**Production version** (remove `const Icon = window.Icon`; use direct calls):
```javascript
function OrderCard({ order, lang, t, onOpen, onAdvance, onPrint }) {
  // Icon is imported at file level — no local alias needed
  const src = sourceMeta(order.source, t);
  const typ = typeMeta(order.type, t);
  const st = stateMeta(order.state, t);
  const elapsed = elapsedMinutes(order.placedAt);
```

**Prototype window.* reads inside `OrdersScreen`** (`sitecare-orders/project/src/screen-orders.jsx`, lines 114–116):
```javascript
function OrdersScreen({ orders, lang, onOpen, onAdvance, onPrint }) {
  const t = window.useT(lang);
  const Icon = window.Icon;
  const [filter, setFilter] = useStateOrders('all');
```

**Production version:**
```javascript
function OrdersScreen({ orders, lang, onOpen, onAdvance, onPrint }) {
  const t = useT(lang);
  const [filter, setFilter] = useState('all');
```

**Prototype window.* reads inline** (`sitecare-orders/project/src/screen-orders.jsx`, lines 64, 84, 94):
```javascript
  <div>...{window.orderTimeLabel(order.placedAt)}</div>
  <span>...{window.formatRON(it.qty * it.price)}</span>
  <div>...{window.formatRON(order.total)}</div>
```

**Production version:** Replace `window.` prefix → direct call (functions are imported at file top).

**Prototype bottom exports** (last 4 lines of `screen-orders.jsx`):
```javascript
window.OrdersScreen = OrdersScreen;
window.sourceMeta = sourceMeta;
window.typeMeta = typeMeta;
window.stateMeta = stateMeta;
```

**Production exports:**
```javascript
export { OrdersScreen, sourceMeta, typeMeta, stateMeta };
```

---

### `src/screen-kitchen.jsx` (screen component, event-driven) — CONVERT FIFTH (leaf)

**Analog:** `sitecare-orders/project/src/screen-kitchen.jsx`

**What changes:**
- Replace `const { useState: useStateK, useEffect: useEffectK } = React` with `import { useState, useEffect } from 'react'`.
- Add import block.
- Replace `window.useT(lang)` → `useT(lang)`, `window.Icon` → `Icon`, `window.elapsedMinutes(...)` → `elapsedMinutes(...)`, `window.typeMeta(...)` → `typeMeta(...)`.
- Note: `typeMeta` is imported from `./screen-orders.jsx` (it is exported from there).
- Remove `window.KitchenScreen = KitchenScreen`; add `export { KitchenScreen }`.

**Production imports block:**
```javascript
// src/screen-kitchen.jsx
import { useState, useEffect } from 'react';
import { Icon } from './icons.jsx';
import { useT } from './i18n.jsx';
import { elapsedMinutes } from './data.jsx';
import { typeMeta } from './screen-orders.jsx';
```

**Prototype hook alias** (`sitecare-orders/project/src/screen-kitchen.jsx`, lines 1–3):
```javascript
/* global React, window */
const { useState: useStateK, useEffect: useEffectK } = React;
```
**Production:** Delete these two lines entirely; use standard imported names.

---

### `src/screen-pos.jsx` (screen component, event-driven) — CONVERT FIFTH (leaf)

**Analog:** `sitecare-orders/project/src/screen-pos.jsx`

**What changes:** Same pattern as kitchen. `MENU_CATEGORIES`, `MENU_ITEMS` come from `./data.jsx`. `typeMeta` and `formatRON` also from their respective files.

**Production imports block:**
```javascript
// src/screen-pos.jsx
import { useState, useMemo } from 'react';
import { Icon } from './icons.jsx';
import { useT } from './i18n.jsx';
import { MENU_CATEGORIES, MENU_ITEMS, formatRON } from './data.jsx';
import { typeMeta } from './screen-orders.jsx';
```

**Bottom export:**
```javascript
export { PosScreen };
```

---

### `src/screen-menu.jsx` (screen component, event-driven) — CONVERT FIFTH (leaf)

**Analog:** `sitecare-orders/project/src/screen-menu.jsx`

**Production imports block:**
```javascript
// src/screen-menu.jsx
import { useState } from 'react';
import { Icon } from './icons.jsx';
import { useT } from './i18n.jsx';
import { MENU_CATEGORIES, MENU_ITEMS, formatRON } from './data.jsx';
```

**Bottom export:**
```javascript
export { MenuScreen };
```

---

### `src/screen-printer.jsx` (screen component, event-driven) — CONVERT FIFTH (leaf)

**Analog:** `sitecare-orders/project/src/screen-printer.jsx`

**window.* reads** (prototype): `window.useT(lang)`, `window.Icon`, `window.PRINTERS`.

**Production imports block:**
```javascript
// src/screen-printer.jsx
import { useState } from 'react';
import { Icon } from './icons.jsx';
import { useT } from './i18n.jsx';
import { PRINTERS } from './data.jsx';
import { ThermalTicket } from './screen-detail.jsx';
```

**Special note:** `PrinterScreen` re-uses `ThermalTicket` from `screen-detail.jsx`. In the prototype it read `window.ThermalTicket`. In production, import directly from `./screen-detail.jsx`. This creates a dependency on `screen-detail.jsx` being converted first — follow the 8-step order exactly.

**Bottom export:**
```javascript
export { PrinterScreen };
```

---

### `src/screen-settings.jsx` (screen component, event-driven) — CONVERT FIFTH (leaf)

**Analog:** `sitecare-orders/project/src/screen-settings.jsx`

**Prototype top** (`sitecare-orders/project/src/screen-settings.jsx`, lines 1–6):
```javascript
/* global React, window */
function SettingsScreen({ lang }) {
  const t = window.useT(lang);
  const Icon = window.Icon;
  const users = window.USERS;
  const [tab, setTab] = React.useState('users');
```

**Production imports block:**
```javascript
// src/screen-settings.jsx
import { useState } from 'react';
import { Icon } from './icons.jsx';
import { useT } from './i18n.jsx';
import { USERS } from './data.jsx';
```

**Production version of function top:**
```javascript
function SettingsScreen({ lang }) {
  const t = useT(lang);
  const users = USERS;
  const [tab, setTab] = useState('users');
```

**Bottom export:**
```javascript
export { SettingsScreen };
```

---

### `src/screen-detail.jsx` (screen component, event-driven) — CONVERT SIXTH

**Analog:** `sitecare-orders/project/src/screen-detail.jsx`

**Special cases:**
- Exports BOTH `OrderDetailScreen` AND `ThermalTicket` (used by `screen-printer.jsx`).
- Reads `sourceMeta`, `typeMeta`, `stateMeta` from `screen-orders.jsx` — so `screen-orders.jsx` must be converted first.
- Reads `elapsedMinutes`, `orderTimeLabel`, `formatRON` from `data.jsx`.

**Production imports block:**
```javascript
// src/screen-detail.jsx
import { useState } from 'react';
import { Icon } from './icons.jsx';
import { useT } from './i18n.jsx';
import { formatRON, elapsedMinutes, orderTimeLabel } from './data.jsx';
import { sourceMeta, typeMeta, stateMeta } from './screen-orders.jsx';
```

**Bottom export (both components):**
```javascript
export { OrderDetailScreen, ThermalTicket };
```

---

### `src/shell.jsx` (layout component, event-driven) — CONVERT SEVENTH

**Analog:** `sitecare-orders/project/src/shell.jsx`

**Prototype top** (`sitecare-orders/project/src/shell.jsx`, lines 1–5):
```javascript
/* global React, window */
const { useState, useEffect } = React;

function Shell({ lang, setLang, role, setRole, screen, setScreen, accent, density, children, orderCount, sidebarCollapsed, setSidebarCollapsed }) {
  const t = window.useT(lang);
  const Icon = window.Icon;
```

**Production imports block:**
```javascript
// src/shell.jsx
import { useState, useEffect } from 'react';
import { Icon } from './icons.jsx';
import { useT } from './i18n.jsx';
```

**Production function top:**
```javascript
function Shell({ lang, setLang, role, setRole, screen, setScreen, accent, density, children, orderCount, sidebarCollapsed, setSidebarCollapsed }) {
  const t = useT(lang);
  // Icon is imported at file level — remove the local alias
```

**Prototype bottom** (`sitecare-orders/project/src/shell.jsx`, line 173):
```javascript
window.Shell = Shell;
```

**Production:**
```javascript
export { Shell };
// or: export default Shell;
```

**Note on custom macOS titlebar:** The prototype's `shell.jsx` renders a custom macOS-style titlebar (`.titlebar` div with three dots: `.tl-close`, `.tl-min`, `.tl-max`). Per D-01, the production app uses `decorations: true` (native OS chrome). Remove the entire `.titlebar` div from the JSX. The OS draws the real title bar. The CSS classes for `.titlebar` can remain in `styles.css` but will be unused.

---

### `src/app.jsx` (root component, event-driven) — CONVERT LAST

**Analog:** `sitecare-orders/project/src/app.jsx`

**What changes (many):**

**Prototype top** (`sitecare-orders/project/src/app.jsx`, lines 1–18):
```javascript
/* global React, ReactDOM, window */
const { useState: useStateApp, useEffect: useEffectApp } = React;

function App() {
  const [lang, setLang] = useStateApp(localStorage.getItem('sc_lang') || 'ro');
  const [role, setRole] = useStateApp(localStorage.getItem('sc_role') || 'cashier');
  const [screen, setScreenRaw] = useStateApp(localStorage.getItem('sc_screen') || 'orders');
  const [accent, setAccent] = useStateApp(localStorage.getItem('sc_accent') || 'sage');
  const [density, setDensity] = useStateApp(localStorage.getItem('sc_density') || 'balanced');
  const [sidebarCollapsed, setSidebarCollapsed] = useStateApp(localStorage.getItem('sc_sidebar_collapsed') === '1');
  // ...
  const [orders, setOrders] = useStateApp(window.ORDERS);     // ← DELETE (Phase 3 wires real data)
  const [selectedOrder, setSelectedOrder] = useStateApp(null);
  const [scale, setScale] = useStateApp(1);                   // ← DELETE (letterbox logic)
```

**Production imports block:**
```javascript
// src/app.jsx
import { useEffect } from 'react';
import { Shell } from './shell.jsx';
import { OrdersScreen } from './screen-orders.jsx';
import { KitchenScreen } from './screen-kitchen.jsx';
import { PosScreen } from './screen-pos.jsx';
import { OrderDetailScreen } from './screen-detail.jsx';
import { MenuScreen } from './screen-menu.jsx';
import { PrinterScreen } from './screen-printer.jsx';
import { SettingsScreen } from './screen-settings.jsx';
import { useAppStore } from './store.js';
// Note: Icon is not imported here — AcceptDialog is the only App-level component that uses it,
// and it receives Icon from its own scope via the icons import in its moved location.
import { Icon } from './icons.jsx';
import { useT } from './i18n.jsx';
import { formatRON } from './data.jsx';
import { typeMeta } from './screen-orders.jsx';
```

**DELETIONS from prototype app.jsx — remove entirely:**
1. `const [scale, setScale] = ...` state — letterbox variable, not needed in Tauri.
2. The `fit()` function and the entire `resize` useEffect (lines 36–47 in prototype) — letterbox logic, delete entirely.
3. `const [orders, setOrders] = ...` state seeded from `window.ORDERS` — Phase 1 passes empty array `[]`; Phase 3 replaces with `useOrders()` hook.
4. The entire `window.addEventListener('message', handler)` useEffect (lines 69–79) — TweaksPanel design-mode bridge, not migrated.
5. The entire `TweaksPanel` component definition (lines 262–299) — prototype-only.
6. The `TWEAK_DEFAULTS` constant (lines 301–306) — prototype-only.
7. All `window.useT(lang)` reads in `doPrint` and `createOrder` — replace with `useT(lang)` called at function scope.
8. All `window.*` screen component reads in JSX (`window.Shell`, `window.OrdersScreen`, etc.) — use imported names.
9. `window.typeMeta(...)` in `AcceptDialog` — use `typeMeta(...)` (imported).
10. `window.formatRON(...)` in `AcceptDialog` — use `formatRON(...)` (imported).

**REPLACEMENTS — read from Zustand store instead of local state:**
```javascript
// Prototype (app.jsx lines 5-10):
const [lang, setLang] = useStateApp(localStorage.getItem('sc_lang') || 'ro');
const [role, setRole] = useStateApp(localStorage.getItem('sc_role') || 'cashier');
// etc.

// Production — all UI state comes from Zustand:
function App() {
  const lang = useAppStore((s) => s.lang);
  const role = useAppStore((s) => s.role);
  const screen = useAppStore((s) => s.screen);
  const accent = useAppStore((s) => s.accent);
  const density = useAppStore((s) => s.density);
  const sidebarCollapsed = useAppStore((s) => s.sidebarCollapsed);
  const selectedOrder = useAppStore((s) => s.selectedOrder);
  const toasts = useAppStore((s) => s.toasts);
  const acceptDialog = useAppStore((s) => s.acceptDialog);
  const setScreen = useAppStore((s) => s.setScreen);
  const setRole = useAppStore((s) => s.setRole);
  const setLang = useAppStore((s) => s.setLang);
  const setAccent = useAppStore((s) => s.setAccent);
  const setDensity = useAppStore((s) => s.setDensity);
  const setSidebarCollapsed = useAppStore((s) => s.setSidebarCollapsed);
  const openOrder = useAppStore((s) => s.openOrder);
  const pushToast = useAppStore((s) => s.pushToast);
  const dismissToast = useAppStore((s) => s.dismissToast);
  const setAcceptDialog = useAppStore((s) => s.setAcceptDialog);
```

**Accent useEffect (KEEP VERBATIM, change only the data source)** (`sitecare-orders/project/src/app.jsx`, lines 56–67):
```javascript
// Prototype reads accent from local state — same logic, production reads from Zustand:
useEffect(() => {
  const map = {
    sage:       { primary: 'hsl(120 14% 49%)', hover: 'hsl(120 14% 42%)', soft: 'hsl(120 14% 49% / 0.1)' },
    indigo:     { primary: 'hsl(230 50% 55%)', hover: 'hsl(230 50% 48%)', soft: 'hsl(230 50% 55% / 0.1)' },
    terracotta: { primary: 'hsl(0 53% 52%)',   hover: 'hsl(0 53% 45%)',   soft: 'hsl(0 53% 52% / 0.1)'  },
    charcoal:   { primary: 'hsl(120 8% 25%)',  hover: 'hsl(120 8% 18%)',  soft: 'hsl(120 8% 25% / 0.1)' },
  };
  const c = map[accent] || map.sage;
  document.documentElement.style.setProperty('--sc-primary', c.primary);
  document.documentElement.style.setProperty('--sc-primary-hover', c.hover);
  document.documentElement.style.setProperty('--sc-primary-soft', c.soft);
}, [accent]);
```

**Role gate useEffect (KEEP)** (`sitecare-orders/project/src/app.jsx`, lines 27–29):
```javascript
useEffect(() => {
  if (role === 'kitchen' && !['kitchen', 'orders'].includes(screen)) setScreen('kitchen');
}, [role]);
```

**Screen router JSX** (`sitecare-orders/project/src/app.jsx`, lines 154–161):
```javascript
// Prototype (window.* calls):
{screen === 'orders'  && <window.OrdersScreen  orders={orders} lang={lang} onOpen={openOrder} onAdvance={advance} onPrint={doPrint} />}
{screen === 'kitchen' && <window.KitchenScreen orders={orders} lang={lang} onAdvance={advance} />}
// ...

// Production (imported components; orders=[] stub in Phase 1):
{screen === 'orders'  && <OrdersScreen  orders={[]} lang={lang} onOpen={openOrder} onAdvance={advance} onPrint={doPrint} />}
{screen === 'kitchen' && <KitchenScreen orders={[]} lang={lang} onAdvance={advance} />}
{screen === 'pos'     && <PosScreen lang={lang} onCreate={createOrder} />}
{screen === 'detail'  && selectedOrder && <OrderDetailScreen order={selectedOrder} lang={lang} onBack={() => setScreen('orders')} onAdvance={advance} onPrint={doPrint} />}
{screen === 'menu'    && <MenuScreen lang={lang} />}
{screen === 'printer' && <PrinterScreen lang={lang} onTestPrint={() => pushToast({ kind: 'print', title: t('toast_printed'), detail: 'Test print' })} />}
{screen === 'settings'&& <SettingsScreen lang={lang} />}
```

**Wrapper element** (`sitecare-orders/project/src/app.jsx`, lines 144–146):
```javascript
// Prototype — fixed 1440×900 frame with CSS scale:
return (
  <div className="desktop-stage">
    <div className="desktop-frame" style={{ transform: `scale(${scale})` }}>
      ...
    </div>
  </div>
);

// Production — fills native Tauri window naturally (delete desktop-stage/desktop-frame wrappers):
return (
  <div className="win" style={{ width: '100vw', height: '100vh' }}>
    <Shell ...>
      {/* screen router */}
    </Shell>
    {/* toast stack */}
    {/* accept dialog */}
  </div>
);
```

**app.jsx has no exports** — `ReactDOM.createRoot` call moves to `main.jsx`.

---

### `src/store.js` (state store, event-driven)

**Analog:** `sitecare-orders/project/src/app.jsx` (the `useState` slices and localStorage effects)

This is a new file with no direct prototype analog. The shape mirrors the prototype's `App` state, but uses Zustand's `create()` with a custom plugin-store adapter instead of `useState` + localStorage.

**Full production pattern** (from RESEARCH.md Pattern 4 — verified against Zustand v5 docs):
```javascript
// src/store.js
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { load } from '@tauri-apps/plugin-store';

let _store = null;
async function getPluginStore() {
  if (!_store) {
    _store = await load('preferences.json', { autoSave: true });
  }
  return _store;
}

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

export const useAppStore = create(
  persist(
    (set) => ({
      // Persisted UI state (mirrors prototype sc_* localStorage keys)
      screen: 'orders',
      role: 'cashier',
      lang: 'ro',
      accent: 'sage',
      density: 'balanced',
      sidebarCollapsed: false,

      // Session-only (not persisted — mirrors prototype's non-localStorage state)
      selectedOrder: null,
      toasts: [],
      acceptDialog: null,

      // Actions (mirrors prototype's callback functions in App)
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
      name: 'sc-ui-prefs',
      storage: createJSONStorage(() => tauriStorage),
      partialize: (state) => ({
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

**State shape mapping from prototype:**

| Prototype `App` useState | Zustand store key | Persisted? | Notes |
|--------------------------|-------------------|------------|-------|
| `lang` (localStorage `sc_lang`) | `lang` | Yes | Default `'ro'` |
| `role` (localStorage `sc_role`) | `role` | Yes | Default `'cashier'` |
| `screen` (localStorage `sc_screen`) | `screen` | Yes | Default `'orders'` |
| `accent` (localStorage `sc_accent`) | `accent` | Yes | Default `'sage'` |
| `density` (localStorage `sc_density`) | `density` | Yes | Default `'balanced'` |
| `sidebarCollapsed` (localStorage `sc_sidebar_collapsed`) | `sidebarCollapsed` | Yes | Default `false` |
| `selectedOrder` (session only) | `selectedOrder` | No | `null` on cold start |
| `toasts` (session only) | `toasts` | No | Empty array on cold start |
| `acceptDialog` (session only) | `acceptDialog` | No | `null` on cold start |
| `orders` (seeded from window.ORDERS) | NOT in store | — | Phase 3 → TanStack Query |
| `scale` (letterbox) | NOT in store | — | Deleted entirely |
| `tweaksOn` (TweaksPanel) | NOT in store | — | TweaksPanel not migrated |

---

### `src/main.jsx` (entry point, request-response)

**Analog:** `sitecare-orders/project/src/app.jsx` — only the `ReactDOM.createRoot` line at the very end (line 308).

**Prototype ReactDOM mount** (`sitecare-orders/project/src/app.jsx`, line 308):
```javascript
ReactDOM.createRoot(document.getElementById('root')).render(<App />);
```

**Production `main.jsx`** (from RESEARCH.md Pattern 6):
```javascript
// src/main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import './colors_and_type.css';   // design tokens — MUST come before styles.css
import './styles.css';            // component CSS (verbatim from prototype index.html <style> block)
import App from './app.jsx';

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById('root')).render(
  <QueryClientProvider client={queryClient}>
    <App />
  </QueryClientProvider>
);
```

**CSS import order matters:** `colors_and_type.css` defines `--sc-*` custom properties consumed by `styles.css`. Import tokens first.

---

### `src/colors_and_type.css` (CSS / design tokens)

**Analog:** `sitecare-orders/project/assets/colors_and_type.css` (exact copy with one path adjustment)

**Prototype @font-face** (`sitecare-orders/project/assets/colors_and_type.css`, lines 7–20):
```css
@font-face {
  font-family: "Outfit";
  src: url("./fonts/Outfit-Bold.ttf") format("truetype");
  font-weight: 700;
  font-style: normal;
  font-display: swap;
}
@font-face {
  font-family: "Outfit";
  src: url("./fonts/Outfit-Black.ttf") format("truetype");
  font-weight: 900;
  font-style: normal;
  font-display: swap;
}
@import url("https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&family=Caveat:wght@400;600;700&display=swap");
```

**Production `src/colors_and_type.css`** — change only the font paths (move fonts to `public/fonts/`):
```css
@font-face {
  font-family: "Outfit";
  src: url("/fonts/Outfit-Bold.ttf") format("truetype");   /* absolute path → public/fonts/ */
  font-weight: 700;
  font-style: normal;
  font-display: swap;
}
@font-face {
  font-family: "Outfit";
  src: url("/fonts/Outfit-Black.ttf") format("truetype");  /* absolute path → public/fonts/ */
  font-weight: 900;
  font-style: normal;
  font-display: swap;
}
@import url("https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&family=Caveat:wght@400;600;700&display=swap");
```

All `:root` custom property declarations below the `@font-face` blocks are copied verbatim with zero changes.

**Font file placement:** Copy `sitecare-orders/project/assets/fonts/Outfit-Bold.ttf` and `Outfit-Black.ttf` to `public/fonts/` in the new Tauri project.

---

### `src/styles.css` (CSS / component styles)

**Analog:** The `<style>` block inside `sitecare-orders/project/index.html`

**What to do:** Extract the entire `<style>...</style>` content from `index.html` and save verbatim as `src/styles.css`. Zero changes to class names or values. This is the entire component CSS: `.card`, `.btn-primary`, `.chip`, `.nav-item`, `.topbar`, `.sidebar`, `.content-pad`, animations, etc.

**Pitfall:** The `.desktop-stage` and `.desktop-frame` classes exist in this CSS for the letterbox wrapper. These classes become unused in production (the wrapper is deleted from `app.jsx`). Leave the CSS rules in place — unused rules are harmless and deleting them is risky without a full audit.

---

### `src-tauri/tauri.conf.json` (config) — NO ANALOG

**Analog:** None — greenfield Tauri v2 config

**Full production pattern** (from RESEARCH.md Pattern 2 — verified against Tauri v2 docs):
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

**Critical:** CSP lives at `app.security.csp` (NOT `security.csp` at root — that was Tauri v1). Missing `ipc:` and `http://ipc.localhost` in `connect-src` silently breaks all plugin-store calls.

---

### `src-tauri/src/lib.rs` (Rust entry, event-driven) — NO ANALOG

**Analog:** None — the prototype has no Rust layer

**Full production pattern** (from RESEARCH.md Pattern 4):
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

---

### `src-tauri/capabilities/default.json` (config, permissions)

**Analog:** None — generated by scaffold, then augmented

**Production pattern** (from RESEARCH.md Pattern 4):
```json
{
  "permissions": [
    "core:default",
    "store:default",
    "window-state:default"
  ]
}
```

`store:default` and `window-state:default` are added by `npm run tauri add store` and `npm run tauri add window-state` respectively. Do not add them manually unless the CLI commands fail.

---

## Shared Patterns

### Pattern A: window.* Import Replacement

**Source:** Every prototype file in `sitecare-orders/project/src/`
**Apply to:** All 7 screen files, shell.jsx, app.jsx

Every occurrence of the prototype's window aliasing pattern converts identically:

```javascript
// Prototype (at file top — remove entirely):
/* global React, window */
const { useState: useStateOrders } = React;

// Prototype (inside function bodies — remove these local aliases):
const Icon = window.Icon;
const t = window.useT(lang);
const elapsed = window.elapsedMinutes(order.placedAt);

// Prototype (at file bottom — replace with named exports):
window.OrdersScreen = OrdersScreen;

// Production (at file top):
import { useState } from 'react';
import { Icon } from './icons.jsx';
import { useT } from './i18n.jsx';
import { elapsedMinutes } from './data.jsx';

// Production (inside function bodies — direct calls, no aliases):
const t = useT(lang);
const elapsed = elapsedMinutes(order.placedAt);

// Production (at file bottom):
export { OrdersScreen };
```

### Pattern B: React Hook Naming

**Source:** `sitecare-orders/project/src/` — hook alias pattern
**Apply to:** All 7 screen files, shell.jsx

The prototype aliases React hooks with file-scoped suffixes to avoid global scope collision. ES modules have proper scope — remove all aliases.

```javascript
// Prototype:
const { useState: useStateOrders, useEffect: useEffectOrders } = React;
const { useState: useStateK, useEffect: useEffectK } = React;

// Production — use standard imported names in every file:
import { useState, useEffect } from 'react';
// No aliasing needed — each module has its own scope.
```

### Pattern C: Inline Styles + Class Names (Mixed Pattern)

**Source:** All prototype screen files
**Apply to:** All production screen files

Do NOT switch to Tailwind, CSS modules, or styled-components. Preserve the prototype's mixed pattern exactly:

```javascript
// Prototype inline style pattern (verbatim in production):
<div
  className="card shadow"
  style={{ padding: 16, border: order.state === 'new' ? '1.5px solid hsl(0 53% 58% / 0.4)' : '1px solid hsl(120 10% 90%)' }}
>

// className for reusable structural rules (from styles.css):
<button className="btn-primary">...</button>
<span className="chip chip-sage">...</span>

// Inline style for dynamic/conditional values:
<div style={{ color: timeCritical ? 'var(--sc-terracotta)' : 'var(--sc-muted-foreground)' }}>
```

### Pattern D: CSS Custom Properties (Design Tokens)

**Source:** `sitecare-orders/project/assets/colors_and_type.css`
**Apply to:** All component JSX

Use `var(--sc-*)` tokens for all color and spacing values. Do not introduce new hardcoded HSL literals. The prototype mixes tokens and raw HSL literals; preserve existing literals verbatim and use tokens for any new values.

```javascript
// Token usage (all these are in colors_and_type.css):
color: 'var(--sc-primary)'
color: 'var(--sc-muted-foreground)'
background: 'var(--sc-background)'
border: '1px solid var(--sc-border)'
color: 'var(--sc-terracotta)'
```

### Pattern E: i18n via useT Factory

**Source:** `sitecare-orders/project/src/i18n.jsx` (lines 186–188)
**Apply to:** Every component that renders user-visible strings

```javascript
// Call useT at the top of every render function that needs strings:
function SomeScreen({ lang }) {
  const t = useT(lang);    // t is a regular function, not a React hook
  // ...
  return <div>{t('nav_orders')}</div>;
}
```

`useT` is NOT a React hook — it does not call `useState` or `useEffect`. It is a plain factory function that returns a translator function. The `use` prefix is coincidental. Call it at render time, not inside `useEffect`.

---

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `src-tauri/tauri.conf.json` | config | — | No Tauri configuration exists in the prototype (browser-only) |
| `src-tauri/src/lib.rs` | Rust entry | event-driven | Prototype has no Rust layer |

---

## Conversion Order Enforcement

The 8-step conversion order is **mandatory** because the prototype's script load order is now expressed as explicit ES module imports. Converting in the wrong order creates missing-export build errors.

| Step | File | Exports needed by |
|------|------|-------------------|
| 1 | `i18n.jsx` | All other files |
| 2 | `icons.jsx` | All other files |
| 3 | `data.jsx` | All screen files |
| 4 | `screen-orders.jsx` | `screen-detail.jsx`, `screen-kitchen.jsx`, `screen-pos.jsx` (for `typeMeta`, `sourceMeta`, `stateMeta`) |
| 5 | `screen-kitchen.jsx`, `screen-pos.jsx`, `screen-menu.jsx`, `screen-settings.jsx` | No cross-screen deps (leaf) |
| 6 | `screen-detail.jsx` | `screen-printer.jsx` (for `ThermalTicket`) |
| 7 | `shell.jsx` | `app.jsx` |
| 8 | `app.jsx` + `store.js` | Nothing (roots) |

After each step, verify with `npm run dev` before proceeding.

---

## Migration Pitfalls Summary

| Pitfall | Source | Consequence | Detection |
|---------|--------|-------------|-----------|
| Migrating `app.jsx` before step 4–7 files | Circular import | Vite parse error: "Cannot find module export" | Immediate build failure |
| Leaving `window.ORDERS` seed in app.jsx | Prototype-specific | TypeError on `window.ORDERS` (undefined) | Console error on first render |
| Keeping scale/resize logic in app.jsx | Prototype letterbox | App renders tiny in center of Tauri window | Visual — immediately visible |
| Keeping TweaksPanel postMessage handler | Prototype design tool | `window.parent.postMessage` throws in Tauri sandbox | Console error |
| `./fonts/` relative path in colors_and_type.css | Relative URL resolution | Font 404; text renders at wrong weight | DevTools Network tab: 404 on .ttf |
| CSP missing `ipc:` in `connect-src` | Tauri IPC requirement | plugin-store calls silently return undefined | No UI error; preferences not saved |
| React 19 installed instead of 18 | npm create tauri-app template | Possible JSX transform issues | Check package.json after scaffold |
| Vite 8 instead of Vite 6 | npm create tauri-app template | Rolldown beta may fail on prototype CSS | Check package.json after scaffold |

---

## Metadata

**Analog search scope:** `sitecare-orders/project/src/` (all 12 prototype files read)
**Files scanned:** 12 prototype JSX files + 1 CSS file + 3 planning docs
**Pattern extraction date:** 2026-04-22
