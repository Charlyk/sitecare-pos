# External Integrations

**Analysis Date:** 2026-04-22

## Overview

This is a self-contained static prototype. It has no backend, no API calls, no authentication service, and no database connection. All external dependencies are limited to CDN-hosted JavaScript libraries and a Google Fonts stylesheet. All data is hardcoded mock data defined in `src/data.jsx`.

## Details

### CDN Scripts

All three scripts are loaded in `index.html` with Subresource Integrity (SRI) hashes for reproducibility.

| Library | Version | URL | Integrity hash |
|---------|---------|-----|----------------|
| react | 18.3.1 | `https://unpkg.com/react@18.3.1/umd/react.development.js` | `sha384-hD6/rw4ppMLGNu3tX5cjIb+uRZ7UkRJ6BPkLpg4hAu/6onKUg4lLsHAs9EBPT82L` |
| react-dom | 18.3.1 | `https://unpkg.com/react-dom@18.3.1/umd/react-dom.development.js` | `sha384-u6aeetuaXnQ38mYT8rp6sbXaQe3NL9t+IBXmnYxwkUI2Hw4bsp2Wvmx4yRQF1uAm` |
| @babel/standalone | 7.29.0 | `https://unpkg.com/@babel/standalone@7.29.0/babel.min.js` | `sha384-m08KidiNqLdpJqLq95G/LEi8Qvjl/xUYll3QILypMoQ65QorJ9Lvtp2RXYGBFj1y` |

CDN provider: **unpkg.com** (npm CDN). All scripts use `crossorigin="anonymous"`.

### Fonts

**Google Fonts CDN** (loaded via `@import` inside `assets/colors_and_type.css`):

```
https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&family=Caveat:wght@400;600;700&display=swap
```

This single request covers:
- **Outfit** weights 300, 400, 500, 600, 800 (weights 700 and 900 are served locally instead)
- **Caveat** weights 400, 600, 700 (handwriting accent used in eyebrow labels and the Tweaks panel)

**Local font files** (committed to repository, no network dependency):

| File | Family | Weight |
|------|--------|--------|
| `assets/fonts/Outfit-Bold.ttf` | Outfit | 700 |
| `assets/fonts/Outfit-Black.ttf` | Outfit | 900 |
| `assets/fonts/Inter-Bold.ttf` | Inter | 700 (present but unused — no `@font-face` rule references it) |

### Parent Frame Communication

`src/app.jsx` implements a `window.postMessage` protocol for optional integration with a Claude Design host frame (edit/tweaks mode):

| Direction | Message type | Meaning |
|-----------|-------------|---------|
| Incoming | `__activate_edit_mode` | Shows the Tweaks panel overlay |
| Incoming | `__deactivate_edit_mode` | Hides the Tweaks panel overlay |
| Outgoing | `__edit_mode_available` | Signals to parent that the frame supports edit mode |
| Outgoing | `__edit_mode_set_keys` | Sends changed tweak values (`lang`, `role`, `accent`, `density`) back to parent |

This is a design-tool integration; it has no effect when the prototype is opened outside a host frame.

### Browser APIs Used

| API | Usage location | Purpose |
|-----|---------------|---------|
| `localStorage` | `src/app.jsx` | Persist UI preferences (lang, role, screen, accent, density, sidebar state) across reloads |
| `window.addEventListener('resize', ...)` | `src/app.jsx` | Recalculate viewport scale for the 1440×900 letterbox |
| `window.addEventListener('message', ...)` | `src/app.jsx` | Receive edit mode signals from parent frame |
| `Intl.NumberFormat` | `src/data.jsx` | Format currency as Romanian lei (`ro-RO` locale) |
| `Date.toLocaleTimeString` | `src/app.jsx` | Format promised delivery time in `ro-RO` or `en-GB` |
| `setTimeout` | `src/app.jsx` | Auto-dismiss toasts after 3500ms; trigger demo new-order toast after 6000ms |

### Mock Data (No Real API)

All application data is defined as static JavaScript constants in `src/data.jsx` and exposed via `window.*` globals:

| Global | Content |
|--------|---------|
| `window.MENU_CATEGORIES` | 6 categories (pizza, burgers, pasta, salads, drinks, desserts) |
| `window.MENU_ITEMS` | 19 menu items with Romanian and English names, prices in RON |
| `window.ORDERS` | 8 sample orders across all states (new, accepted, preparing, ready, out, done) |
| `window.PRINTERS` | 3 thermal printer records (Epson TM-T20III, Star TSP143, Epson TM-T88VI) |
| `window.USERS` | 4 user records (Admin, Cashier, Kitchen roles) |

Order timestamps are generated relative to `Date.now()` at page load, so the elapsed-time display stays realistic on each load.

### Internationalisation

`src/i18n.jsx` is a static bilingual string dictionary (Romanian and English), not a third-party i18n library. It is exposed as `window.I18N` and `window.useT(lang)`. Romanian is the canonical language per the SiteCare product.

## Key Observations

- **No backend exists.** There are no `fetch()` calls, XHR requests, WebSocket connections, or service workers anywhere in the source. The prototype is 100% static.
- **No authentication.** There is no login flow, no JWT handling, and no session management. The role switcher (cashier / kitchen) is a UI-only toggle stored in `localStorage`.
- **Network dependency is limited to two origins at load time**: `unpkg.com` (three scripts) and `fonts.googleapis.com` / `fonts.gstatic.com` (font CSS + font files). The prototype is partially usable offline if the page has been loaded once (browser cache) or if font fallbacks are acceptable.
- **SRI hashes pin CDN versions** — the `integrity` attributes on all three CDN scripts prevent loading tampered or updated files, effectively locking the dependency versions without a lockfile.
- **The parent-frame postMessage protocol is the only runtime "integration"** — it is optional and silently no-ops when the prototype is opened standalone.
- **Printer records are display-only mock data** — no actual ESC/POS commands, no network printing, no USB/Ethernet communication occurs. Print actions only trigger a toast notification.
