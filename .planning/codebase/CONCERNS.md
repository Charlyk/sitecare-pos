# Codebase Concerns

**Analysis Date:** 2026-04-22
**Source:** Claude Design handoff bundle — HTML/React prototype, not production code.

---

## Overview

This is a browser-based prototype for a restaurant POS system (SiteCare Orders). It demonstrates UI, workflow, and business logic across seven screens: Live Orders, Kitchen Display, POS (new order), Order Detail, Menu, Printer, and Settings. The prototype uses CDN-loaded React 18, Babel standalone for in-browser JSX transpilation, global `window.*` exports as the module system, and a static in-memory data file in place of any backend. Every concern below exists because of the gap between what the prototype demonstrates and what a production POS app requires.

---

## Critical Concerns

### 1. No backend — all data is mocked in memory

Every order, menu item, user, and printer is defined in `sitecare-orders/project/src/data.jsx` as plain JS arrays exposed on `window`. Orders created in the POS screen (`screen-pos.jsx`) are added to React state only; a page reload discards them. There is no API, no database, and no persistence layer of any kind.

**What must be built:**
- REST or GraphQL API for orders (CRUD), menu items, users, printer configs, and settings.
- A database schema covering `orders`, `order_items`, `menu_categories`, `menu_items`, `users`, `printers`, and `venues`.
- The `createOrder` function in `src/app.jsx` (lines 114–134) must POST to an API endpoint rather than mutating local state.
- Order state transitions (`advance` / `applyAdvance` in `src/app.jsx` lines 90–107) must PATCH the order state on the server.

**Impact:** Without a backend, nothing persists, no two devices share state, and no real orders can be taken.

---

### 2. No real-time transport — kitchen display polls on a 30-second interval

`screen-kitchen.jsx` (lines 8–11) forces a re-render every 30 seconds using `setInterval` as a substitute for live data:

```js
useEffectK(() => {
  const id = setInterval(() => force(v => v + 1), 30000);
  return () => clearInterval(id);
}, []);
```

This means the kitchen display can be up to 30 seconds behind reality. In a live restaurant, a new order placed at the POS must appear on the kitchen display within 1–2 seconds.

**What must be built:**
- WebSocket connection (or Server-Sent Events) so the kitchen display receives order events (`order.created`, `order.state_changed`) in real time.
- The 30-second interval must be removed entirely.
- The orders screen similarly has a non-functional "Refresh" button (`screen-orders.jsx` line 190) — it must trigger a real data fetch or rely on the same push channel.

**Impact:** Kitchen staff will miss or delay orders without real-time updates.

---

### 3. No authentication or authorization

The prototype has a hardcoded user "Eduard Albu / Administrator" displayed in `shell.jsx` (line 111). The role switcher (Cashier / Kitchen) is a UI toggle with no security — any user can switch to any role. There are no login, session, or permission checks anywhere.

The `USERS` array in `data.jsx` (lines 168–173) defines four users with roles (`Admin`, `Cashier`, `Kitchen`) but these are purely decorative.

**What must be built:**
- Authentication (JWT or session-based) with login screen.
- Role-based access control: `kitchen` role must not access the POS or settings screens; `cashier` role must not access admin functions.
- The role guard in `app.jsx` (lines 27–29) currently only redirects the kitchen role to the kitchen screen — this must be enforced server-side, not just client-side.

**Impact:** Without auth, any employee can access any screen including settings, user management, and tax configuration.

---

### 4. Prototype uses CDN React + Babel standalone — not viable in production

`index.html` loads three CDN scripts:
- `react@18.3.1` UMD build from `unpkg.com` (line 248)
- `react-dom@18.3.1` UMD build from `unpkg.com` (line 249)
- `@babel/standalone@7.29.0` (line 250) — 1.1 MB minified, transpiles JSX at runtime in the browser

All `.jsx` files are loaded as `<script type="text/babel">` tags (lines 255–266), which means the browser downloads and parses every source file individually, then Babel transpiles each one at runtime. There is no bundling, no tree-shaking, no code splitting, and no module system — every component is a global on `window`.

**What must be built:**
- A proper build toolchain: Vite (recommended for POS apps) or Next.js if SSR is needed.
- Replace `window.ComponentName` globals with standard ES module `import`/`export`.
- Replace the CDN scripts with `npm` dependencies managed in a `package.json`.
- The Babel standalone script must be removed entirely from the production build.

**Impact:** Runtime Babel transpilation adds ~300–500ms of startup latency on every page load. It is not suitable for a POS terminal that must be responsive immediately.

---

### 5. No fiscal / legal integration — prototype shows it as connected but it is fake

`screen-settings.jsx` (lines 63–74) displays a "Datecs DP-25 · ANAF conform" fiscal register with serial number `FX0212945` shown as "Connected". The printer screen (`screen-printer.jsx`) shows Epson and Star thermal printers. All of this is static data from `data.jsx` (lines 162–166).

For a Romanian restaurant, fiscal receipt printing via an ANAF-certified cash register is a legal requirement.

**What must be built:**
- Integration with a fiscal cash register (Datecs, DATRON, or similar) via its serial/Ethernet API.
- Fiscal receipts must be issued for every completed sale through the `doPrint` function in `app.jsx` (line 110).
- The tax rate is hardcoded at 19% in `screen-pos.jsx` (line 28) — this must be configurable and applied correctly per product category (food in Romania can be 5% or 9% depending on category).

**Impact:** Operating without a compliant fiscal register integration is illegal for a Romanian food business.

---

## Medium Concerns

### 6. State management will not scale past a single screen

All application state lives in a single `useState` chain at the top of `App()` in `src/app.jsx`. Every screen receives props drilled from the root: `orders`, `lang`, `role`, `screen`, `selectedOrder`, `toasts`, and `accent`. There are no contexts, no reducers, and no query cache.

When the real app fetches orders from an API, manages optimistic updates (e.g., advancing an order state while waiting for the server response), and handles WebSocket events from multiple sources simultaneously, this flat prop-drilling model will become unmanageable.

**Recommendation:**
- Use React Query (TanStack Query) for all server state: order lists, order details, menu items.
- Use Zustand or React Context for UI state: current screen, language, role, sidebar collapse.
- Toast notifications should move to a context-based system (e.g., react-hot-toast) rather than state in the root component.

---

### 7. Search is non-functional

The search input in `shell.jsx` (lines 146–150) is a purely decorative element — it has no `onChange` handler, no state binding, and no filtering logic. The keyboard shortcut hint `⌘K` suggests a command palette was intended but not implemented.

**What must be built:**
- Full-text search across orders (by order ID, customer name, phone number).
- The search must query the backend, not filter the in-memory array, since the production dataset will exceed what is safe to load client-side.

---

### 8. Tax calculation is hardcoded and simplified

`screen-pos.jsx` line 28 computes tax as `subtotal * 0.19` for all items. The `total` displayed to the user omits the tax (line 29: `total = subtotal + fee`, not `subtotal + tax + fee`), which is a calculation inconsistency.

In `data.jsx`, order totals do not consistently include tax in the `total` field — e.g., order `#1046` has `subtotal: 96`, `tax: 15.28`, but `total: 96` (tax excluded from total).

**What must be built:**
- Consistent total calculation: `total = subtotal + deliveryFee + tip` with tax either included in prices or clearly broken out.
- Per-category VAT rates (Romanian law: 5% for takeaway cold food, 9% for some categories, 19% for dine-in and alcohol).
- Tax calculation must happen server-side to be authoritative.

---

### 9. Menu management screen is read-only

`screen-menu.jsx` (not read in full, but present in the file list) and the menu in the POS screen both display the static `MENU_ITEMS` array from `data.jsx`. There is no ability to add items, change prices, toggle availability, or manage modifiers.

**What must be built:**
- Full CRUD for menu items and categories.
- Item availability toggle (for 86'd items during service).
- Modifier/options support — the prototype has a `mods` field on order items (e.g., `'fără bacon'`) but no UI to create or configure modifiers.

---

### 10. Printer integration is entirely simulated

`doPrint` in `app.jsx` (line 110) shows a toast notification — it does not communicate with any printer. The `screen-printer.jsx` toggle options (auto-print, buzzer, paper cut, cash drawer) are local React state with no persistence and no actual printer commands.

**What must be built:**
- Thermal printer integration via ESC/POS commands over USB, Ethernet, or Bluetooth.
- `ThermalTicket` component (referenced in `screen-printer.jsx` line 83 as `window.ThermalTicket`) must generate actual ESC/POS byte sequences, not just HTML.
- Auto-print on new order requires the WebSocket event system to trigger printer commands on the client where the printer is physically connected.

---

### 11. Delivery integrations (Glovo, Tazz) are placeholders

`screen-settings.jsx` (lines 103–121) shows integration cards for Glovo, Tazz, Datecs POS, Stripe, and WhatsApp — all marked as "on" or "off" with no backend connectivity. These are aspirational UI only.

**What must be built:**
- Webhook receivers for Glovo and Tazz order pushes.
- Stripe payment intent creation and webhook handling for `payment_intent.succeeded` events.
- WhatsApp Business API integration for customer order status notifications.

---

### 12. Fixed 1440×900 viewport — no responsive design

`index.html` renders the app inside a fixed `1440px × 900px` `.desktop-frame` div that scales down via CSS `transform: scale()` on smaller screens (computed in `app.jsx` lines 36–47). This works for a dedicated POS terminal but means the app is not usable on a phone or small tablet.

If kitchen staff need to use phones or 10" tablets to manage orders, the layout must be rebuilt responsively. The current approach cannot be carried forward as-is.

---

## Low Concerns / Nice-to-Have

### 13. Design tokens are partially migrated

`assets/colors_and_type.css` defines a comprehensive set of CSS custom properties (`--sc-primary`, `--sc-background`, `--sc-radius-*`, `--sc-shadow-*`, etc.) sourced from `src/app/globals.css @ Charlyk/sitecare-landing`. This is a good foundation.

However, `index.html` (lines 8–246) contains ~230 lines of additional inline CSS for layout, component primitives (`.card`, `.chip`, `.btn-primary`, `.nav-item`, etc.) that duplicate or extend the token system without using the established CSS variables consistently. For example, hardcoded hex values like `#fbf6ea`, `#3b3a36`, and `#fafaf6` appear alongside `var(--sc-background)`.

**Recommendation:**
- Audit all hardcoded color values and replace with `--sc-*` tokens.
- Move component styles from `index.html` into co-located CSS modules or a Tailwind config that maps to the same token values.
- The accent color system in `app.jsx` (lines 57–67) that writes CSS variables at runtime (`document.documentElement.style.setProperty`) is a valid pattern — keep it but wire it to the token file.

---

### 14. No error handling for failed operations

The `advance` / `applyAdvance` / `createOrder` functions in `app.jsx` have no error states. In the prototype this is fine because all operations are synchronous in-memory mutations. In production, API calls can fail — network errors, concurrent state conflicts (another cashier advanced the same order), server validation errors.

**Recommendation:**
- Wrap all order mutations in try/catch with user-visible error toasts.
- Implement optimistic updates with rollback on failure using React Query's `onError` callback.

---

### 15. i18n system is functional but not extensible

`src/i18n.jsx` implements a simple `window.useT(lang)` lookup against a static two-language object (`ro` / `en`). This works for the prototype but does not support pluralization, interpolation, or adding a third language without editing the file.

**Recommendation:**
- Replace with `react-i18next` or `next-intl` if Next.js is chosen.
- The existing translation keys are well-named and can be migrated directly.

---

### 16. No CI/CD, linting, type checking, or tests

The project has no `package.json`, no TypeScript, no ESLint, no Prettier, no test runner, and no CI pipeline. This is expected for a design prototype.

**What must be set up before production:**
- TypeScript strict mode from day one — the order and menu data shapes are well-defined in `data.jsx` and translate directly to interfaces.
- ESLint with `@typescript-eslint` and `eslint-plugin-react-hooks`.
- Vitest for unit tests (order calculation logic, state transition rules).
- Playwright or Cypress for E2E tests covering the order lifecycle (new → accepted → preparing → ready → done).
- GitHub Actions or similar CI running lint, type check, and tests on every PR.

---

## Recommended Next Steps

**In priority order:**

1. **Set up the project scaffold** — Vite + React 18 + TypeScript. Extract the component files from the prototype into proper `.tsx` modules with `import`/`export`. Establish the build pipeline before writing any feature code.

2. **Define the data model** — Translate `data.jsx` into TypeScript interfaces and a database schema (PostgreSQL recommended). The `ORDERS`, `MENU_ITEMS`, `MENU_CATEGORIES`, `USERS`, and `PRINTERS` shapes are all well-specified in the prototype.

3. **Build the API** — Implement order CRUD endpoints first, as every screen depends on them. Then menu, users, and settings.

4. **Add authentication** — Implement login before building any user-facing features. Role-based routing depends on knowing who the user is.

5. **Add real-time transport** — Implement WebSocket or SSE for order events. Replace the 30-second kitchen interval immediately after the API exists.

6. **Wire up fiscal printing** — This is a legal requirement for Romania. Plan it early; Datecs and ANAF certification requirements affect the receipt data model.

7. **Migrate CSS to the token system** — Clean up the inline styles and hardcoded values progressively as each screen is implemented. Do not carry the `index.html` styles block forward.

---

*Concerns audit: 2026-04-22*
