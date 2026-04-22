# Architecture

**Analysis Date:** 2026-04-22

## Overview

SiteCare POS is a single-page application prototype delivered as a static HTML bundle. There is no build step, no bundler, and no server. React 18 is loaded from CDN and all JSX files are transpiled in-browser at runtime by `@babel/standalone`. The app renders a fixed 1440×900 desktop frame letterboxed inside the browser viewport, simulating a macOS desktop application.

Screen switching is handled by a single `screen` string in root state — there is no router library. All application state lives in one top-level `App` component in `sitecare-orders/project/src/app.jsx`. Mock data is initialised from `window` globals set by `src/data.jsx` and mutated in-memory via React `useState`.

## Details

### Component Hierarchy

```
App                          (src/app.jsx)
├── Shell                    (src/shell.jsx)
│   ├── Sidebar + NavGroups
│   ├── Topbar
│   └── {children}           — one screen component at a time
│       ├── OrdersScreen     (src/screen-orders.jsx)
│       │   └── OrderCard
│       ├── KitchenScreen    (src/screen-kitchen.jsx)
│       │   └── KitchenTicket
│       ├── PosScreen        (src/screen-pos.jsx)
│       ├── OrderDetailScreen (src/screen-detail.jsx)
│       │   └── ThermalTicket
│       ├── MenuScreen       (src/screen-menu.jsx)
│       │   ├── StatTile
│       │   └── AvailSwitch
│       ├── PrinterScreen    (src/screen-printer.jsx)
│       │   ├── Field
│       │   ├── Toggle
│       │   └── ThermalTicket (re-used from screen-detail)
│       └── SettingsScreen   (src/screen-settings.jsx)
├── ToastStack               (inline in app.jsx)
├── AcceptDialog             (inline in app.jsx)
└── TweaksPanel              (inline in app.jsx)
```

### State Management

All state is `React.useState` at the `App` level. There is no Redux, Zustand, Context API, or any other state library. Key state slices in `App`:

| State var | Type | Purpose |
|---|---|---|
| `screen` | string | Active screen key (`'orders'`, `'kitchen'`, `'pos'`, `'detail'`, `'menu'`, `'printer'`, `'settings'`) |
| `orders` | array | In-memory order list, seeded from `window.ORDERS` |
| `selectedOrder` | object\|null | Order shown in the detail screen |
| `lang` | string | `'ro'` or `'en'` |
| `role` | string | `'cashier'` or `'kitchen'` |
| `accent` | string | Theme colour key (`'sage'`, `'indigo'`, `'terracotta'`, `'charcoal'`) |
| `density` | string | Layout density (`'balanced'` or `'dense'`) |
| `sidebarCollapsed` | boolean | Sidebar expand/collapse toggle |
| `toasts` | array | Active toast notifications |
| `acceptDialog` | object\|null | Order being accepted (triggers prep-time modal) |

Six `useEffect` hooks in `App` persist `lang`, `role`, `screen`, `accent`, `density`, and `sidebarCollapsed` to `localStorage`.

### Screen Switching (Routing)

Routing is conditional JSX rendering gated on the `screen` string:

```jsx
// src/app.jsx
{screen === 'orders'  && <window.OrdersScreen  orders={orders} ... />}
{screen === 'kitchen' && <window.KitchenScreen  orders={orders} ... />}
{screen === 'pos'     && <window.PosScreen      lang={lang} onCreate={createOrder} />}
{screen === 'detail'  && selectedOrder && <window.OrderDetailScreen ... />}
{screen === 'menu'    && <window.MenuScreen     lang={lang} />}
{screen === 'printer' && <window.PrinterScreen  lang={lang} ... />}
{screen === 'settings'&& <window.SettingsScreen lang={lang} />}
```

`setScreen` is a thin wrapper around the raw setter that also clears `selectedOrder` when leaving the detail screen. The `detail` screen is the only screen that requires companion state (`selectedOrder`); it is activated by calling `openOrder(order)` in `App`, which sets both `selectedOrder` and `screen = 'detail'` together.

### Data Flow

```
src/data.jsx
  └── writes window.ORDERS, window.MENU_CATEGORIES, window.MENU_ITEMS,
              window.PRINTERS, window.USERS, window.formatRON,
              window.elapsedMinutes, window.orderTimeLabel

App (useState)
  └── orders = window.ORDERS  (initial seed, then owned by React state)
  └── passes orders + callbacks down to screen components as props

Screen components
  └── read orders/menu/printer data via props or directly from window.*
  └── call onAdvance / onCreate / onPrint callbacks → mutate state in App
```

Screens do not own the orders array. All mutations (`advance`, `createOrder`) are callback props that call `setOrders` in `App`. Local screen state (`filter`, `cart`, `tab`, etc.) is scoped inside each screen component.

### Order Lifecycle

Orders follow a linear state machine managed in `App.advance()`:

```
new → accepted → preparing → ready → out (delivery only) → done
                                   → done (dinein/pickup)
```

The `new → accepted` transition is intercepted to show the `AcceptDialog` (prep-time picker) before applying the state change.

### Theming

Four accent themes are applied by mutating CSS custom properties on `document.documentElement` inside a `useEffect` in `App`:

```js
--sc-primary        // main action colour
--sc-primary-hover  // darker shade for hover
--sc-primary-soft   // 10% opacity tint for backgrounds
```

Base tokens (`--sc-terracotta`, `--sc-foreground`, `--sc-muted-foreground`, `--sc-background`) are defined in `assets/colors_and_type.css`.

### i18n

Translation is handled by a simple key lookup via `window.useT(lang)` defined in `src/i18n.jsx`. It returns a translator function `t(key) → string`. Romanian (`ro`) is the canonical language; English (`en`) is a full mirror. `lang` is passed as a prop to every screen component and to `Shell`.

### Design-Mode Integration

`App` listens for `window.postMessage` events to toggle `TweaksPanel` — a floating overlay that live-edits `lang`, `role`, `accent`, and `density`. This supports embedding the prototype in a design handoff iframe where the parent frame sends `__activate_edit_mode` / `__deactivate_edit_mode` messages.

### Global Namespace (module boundary substitute)

Because there is no bundler, components share references through `window`:

```js
window.Shell = Shell;
window.OrdersScreen = OrdersScreen;
window.KitchenScreen = KitchenScreen;
window.PosScreen = PosScreen;
window.OrderDetailScreen = OrderDetailScreen;
window.ThermalTicket = ThermalTicket;
window.MenuScreen = MenuScreen;
window.PrinterScreen = PrinterScreen;
window.SettingsScreen = SettingsScreen;
window.Icon = Icon;          // src/icons.jsx
window.useT = useT;          // src/i18n.jsx
window.ORDERS = ORDERS;      // src/data.jsx
window.MENU_ITEMS = ...;
window.formatRON = ...;
// etc.
```

`App` consumes these via `window.Shell`, `window.OrdersScreen`, etc. Script load order in `index.html` is therefore significant — `icons.jsx` and `i18n.jsx` must load before `data.jsx`, which must load before any screen, which must load before `app.jsx`.

## Key Observations

- **No build tooling.** `@babel/standalone` transpiles JSX in the browser at page load. This is intentional for a prototype bundle — there is nothing to compile or deploy.
- **All state is prop-drilled.** `App` passes `lang`, callbacks, and data down to `Shell` and then into screens. There is no shared context or store.
- **`window` is the module system.** Each file writes its exports onto `window` and reads its dependencies from `window`. Load order in `index.html` is the only dependency graph enforcement.
- **Screens are leaf nodes.** No screen imports another screen. Cross-screen reuse (`ThermalTicket`) is accessed via `window.ThermalTicket`.
- **Role gates navigation.** When `role` changes to `'kitchen'`, a `useEffect` in `App` forces `screen` back to `'kitchen'` if the current screen is not kitchen-appropriate. The `Shell` sidebar also renders a different nav group for kitchen vs cashier roles.
- **Viewport scaling.** The fixed 1440×900 frame is CSS-transformed (`scale()`) to fit the actual browser viewport, computed and updated on every `resize` event.
- **LocalStorage persistence** covers `lang`, `role`, `screen`, `accent`, `density`, and `sidebarCollapsed`. Orders and cart state are not persisted — they reset to mock data on page reload.
