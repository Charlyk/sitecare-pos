# Testing Patterns

**Analysis Date:** 2026-04-22

## Overview

This project has no automated test suite of any kind. It is a Claude Design handoff bundle — a browser-rendered prototype intended for visual review and interactive demonstration, not production deployment. Verification is entirely manual: open `index.html` in a browser and interact with the UI.

## Details

### What Is Absent

The following tooling does not exist in this project:

- No test runner (Jest, Vitest, Mocha, Jasmine)
- No assertion library (Testing Library, Chai, expect)
- No end-to-end framework (Cypress, Playwright, Puppeteer)
- No snapshot testing
- No visual regression tooling (Chromatic, Percy)
- No linting configuration (no `.eslintrc.*`, no `eslint.config.*`, no `biome.json`, no `.prettierrc`)
- No `package.json` (no npm/node dependency graph at all)
- No CI pipeline or GitHub Actions workflow files

The only static analysis hints present are JSHint/ESLint-style `/* global */` comment directives at the top of each source file:

```js
/* global React, ReactDOM, window */   // app.jsx
/* global React, window */             // shell.jsx, screen-*.jsx
/* global window */                    // data.jsx, i18n.jsx
```

These declare globals for any editor or linter that might analyse the files in isolation but do not activate any linting tool.

### How the Prototype Is Run

The application is a single HTML file loaded directly in a browser:

```
sitecare-orders/project/index.html
```

Runtime dependencies are loaded from CDN via `unpkg.com` with SRI hashes:

```html
<script src="https://unpkg.com/react@18.3.1/umd/react.development.js"
  integrity="sha384-hD6/rw4ppMLGNu3tX5cjIb+..." crossorigin="anonymous"></script>
<script src="https://unpkg.com/react-dom@18.3.1/umd/react-dom.development.js"
  integrity="sha384-u6aeetuaXnQ38mYT8rp6sb..." crossorigin="anonymous"></script>
<script src="https://unpkg.com/@babel/standalone@7.29.0/babel.min.js"
  integrity="sha384-m08KidiNqLdpJqLq95G/LE..." crossorigin="anonymous"></script>
```

JSX is transpiled in-browser by `@babel/standalone`. There is no build step.

Source files are loaded as ordered `<script type="text/babel">` tags:

```html
<script type="text/babel" src="src/icons.jsx"></script>
<script type="text/babel" src="src/i18n.jsx"></script>
<script type="text/babel" src="src/data.jsx"></script>
<script type="text/babel" src="src/shell.jsx"></script>
<script type="text/babel" src="src/screen-orders.jsx"></script>
<!-- ...etc -->
<script type="text/babel" src="src/app.jsx"></script>
```

Load order is significant: each file assigns to `window.*` and later files reference those assignments.

### What Manual Testing Covers

The prototype is designed to demonstrate the following scenarios interactively:

| Scenario | Mechanism |
|---|---|
| Language toggle (RO / EN) | Sidebar language buttons or TweaksPanel |
| Role switching (Cashier / Kitchen) | TopBar role pill or TweaksPanel |
| Accent colour themes (Sage, Indigo, Terracotta, Charcoal) | TweaksPanel — mutates `--sc-primary` CSS vars live |
| Density switching (Balanced / Dense) | TweaksPanel |
| Sidebar collapse / expand | Collapse toggle button |
| Order state progression | Accept, Start, Mark Ready, Out, Complete buttons on cards |
| Accept dialog with prep time selection | Clicking Accept on a `new` order |
| Toast notifications | Auto-fires at 6s after load; also fires on accept and print actions |
| POS screen — cart building and order creation | `screen-pos.jsx` |
| Order filtering by state and type | Filter bar in `screen-orders.jsx` |
| Viewport scaling | Auto-scales the 1440×900 frame to fit any browser window |

The TweaksPanel (`app.jsx` `TweaksPanel` component) is an explicit in-browser development tool: it exposes state controls and communicates with a parent frame via `window.postMessage` for Claude Design's edit-mode integration.

### Data Validation

There is no form validation library. Input handling is minimal:

- The prep-time custom input in `AcceptDialog` uses `type="number"` with `min="1"` max="240"` HTML attributes — browser-native only.
- The `confirmAccept` call guards against `!prep || prep <= 0` to disable the confirm button.
- The POS screen's "Ring up" button is `disabled={cart.length === 0}` — no other validation.
- Customer name, phone, and address fields in `PosScreen` accept any string with no validation.

### What Would Be Needed for Production Testing

If this prototype were converted to a production application, the following would need to be added:

**Unit tests (recommended: Vitest + Testing Library)**
- Order state machine transitions (`advance`, `applyAdvance` in `app.jsx`)
- `formatRON`, `elapsedMinutes`, `orderTimeLabel` helper functions in `data.jsx`
- `useT` i18n lookup with missing keys in `i18n.jsx`
- `Icon` component rendering with known and unknown icon names

**Integration tests**
- Order lifecycle: create → accept (with prep time) → prepare → ready → complete
- POS cart: add item, adjust quantity, remove item, order type switching, create order
- Language switching: verify all visible strings update, verify `localStorage` persistence
- Accent switching: verify CSS custom properties update on `document.documentElement`

**End-to-end tests (recommended: Playwright)**
- Full cashier workflow from POS → new order appearing in orders list
- Kitchen role restriction (POS screen hidden, redirect to kitchen view)
- Sidebar collapse/expand preserving counts and navigation
- Toast appearance and auto-dismissal timing

**Linting and formatting**
- ESLint with React plugin (catch missing `key` props, hook rules violations)
- Prettier for consistent formatting
- The `/* global */` comments can be replaced with a proper ESLint `globals` config once a module system is introduced

**Build toolchain prerequisite**
All of the above requires first migrating from the browser-native `@babel/standalone` approach to a proper bundler (Vite recommended for React projects). This means:
- Adding `package.json` with React, ReactDOM, and Vite as dependencies
- Converting `window.*` globals to ES module imports/exports
- Removing per-file hook aliases (`useStateApp`, `useStateOrders`, etc.)
- Moving inline `<style>` from `index.html` into CSS modules or a global stylesheet

## Key Observations

- **No test infrastructure exists.** This is expected for a design handoff prototype and is not a defect.
- **The prototype is self-contained and immediately runnable** — open `index.html` in any modern browser with internet access (for CDN scripts and Google Fonts).
- **SRI hashes on CDN scripts** (`integrity=` attributes) are the only security/integrity measure in the project.
- **All state is ephemeral.** `window.ORDERS` resets on page reload. `localStorage` persists UI preferences (lang, role, accent, density, collapsed) but not order data.
- **The TweaksPanel is a testing aid.** It allows rapid switching of all prototype variants (language, role, accent, density) without reloading, simulating the full design review surface in one session.
- **The `EDITMODE-BEGIN/END` markers** in `app.jsx` (`TWEAK_DEFAULTS`) indicate integration with the Claude Design parent frame — the prototype is designed to be embedded in an iframe and controlled via `postMessage`.
