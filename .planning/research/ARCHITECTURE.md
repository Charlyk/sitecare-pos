# Architecture Patterns — SiteCare POS (Tauri v2 + React + Vite)

**Domain:** Desktop POS application (restaurant order management)
**Researched:** 2026-04-22
**Sources:** Tauri v2 official docs (v2.tauri.app), Context7 Tauri docs, community patterns

---

## Overview

SiteCare POS is a Tauri v2 desktop application with a hard separation between two worlds:

- **Rust side (src-tauri):** Thin host process. Manages the OS window, spawns the WebView, handles anything that requires native OS access (file I/O, printing). For this app that is a deliberately small surface area — no custom business logic belongs in Rust.
- **JavaScript side (src/):** Everything else. React + Vite frontend runs inside the WebView. API calls via `@charlyk/admin-client`, SSE for real-time updates, all UI state, all routing, all business logic lives here.

The prototype's Shell + Screens component hierarchy is worth preserving exactly. What changes is the wiring underneath it: `window.*` globals become ES module imports, `window.ORDERS` mock data becomes TanStack Query cache, and `useState` at App level splits into query cache (server state) + a small Zustand store (UI preferences).

The frontend communicates with the SiteCare API entirely through the WebView's fetch layer — `@charlyk/admin-client` uses standard fetch and EventSource. Tauri's CSP must be configured to allow connections to the API host. No API traffic routes through the Rust backend.

---

## Component Map

### Process Boundary

```
OS Process: Tauri Rust Binary (src-tauri/)
│
│  IPC Bridge (invoke / emit)
│
WebView Process: React SPA (src/)
```

### Rust Side (src-tauri/) — Surface Area

The Rust side is intentionally thin for this app. All commands here are about OS integration, not business logic.

| Rust Component | Responsibility | When Invoked |
|----------------|---------------|--------------|
| `main.rs` | Entry point, spawns WebView, registers plugins | App start |
| `lib.rs` | Command handler registration | App start |
| `commands/window.rs` | Window drag region, minimize, maximize, close | Title bar buttons |
| `tauri-plugin-store` | Persistent settings (JSON file on disk) | Preference reads/writes |
| `tauri-plugin-printer` or `tauri-plugin-thermoprint` | Send ESC/POS data to thermal printer | Print receipt action |
| `capabilities/default.json` | Security allowlist for which JS can call which commands | Compile time |

Do NOT add Rust commands for: authentication, order fetching, SSE subscriptions, menu data, or any business domain logic. All of that is handled in JavaScript via `@charlyk/admin-client`.

### JavaScript Side (src/) — Component Hierarchy

Preserve the prototype's Shell + Screens structure. Replace `window.*` with ES module imports.

```
main.jsx                        (React root, QueryClientProvider, app bootstrap)
└── App.jsx                     (thin orchestrator: reads auth state, renders Shell or LoginScreen)
    ├── LoginScreen             (screens/LoginScreen.jsx)
    └── Shell                   (shell/Shell.jsx)
        ├── Sidebar             (shell/Sidebar.jsx — NavGroups, role switcher, collapse)
        ├── Topbar              (shell/Topbar.jsx)
        └── [Active Screen]     (one of:)
            ├── OrdersScreen    (screens/orders/OrdersScreen.jsx)
            │   └── OrderCard   (screens/orders/OrderCard.jsx)
            ├── KitchenScreen   (screens/kitchen/KitchenScreen.jsx)
            │   └── KitchenTicket (screens/kitchen/KitchenTicket.jsx)
            ├── PosScreen       (screens/pos/PosScreen.jsx)
            ├── OrderDetailScreen (screens/detail/OrderDetailScreen.jsx)
            │   └── ThermalTicket (shared/ThermalTicket.jsx)
            ├── MenuScreen      (screens/menu/MenuScreen.jsx)
            │   ├── StatTile    (screens/menu/StatTile.jsx)
            │   └── AvailSwitch (screens/menu/AvailSwitch.jsx)
            ├── PrinterScreen   (screens/printer/PrinterScreen.jsx)
            └── SettingsScreen  (screens/settings/SettingsScreen.jsx)
    ├── ToastStack              (shared/ToastStack.jsx)
    └── AcceptDialog            (shared/AcceptDialog.jsx)
```

### Folder Layout (src/)

```
src/
├── main.jsx                    # React root — mounts App, QueryClientProvider, Zustand
├── App.jsx                     # Auth gate: LoginScreen or Shell
│
├── shell/
│   ├── Shell.jsx               # Layout wrapper, passes nothing down — screens fetch own data
│   ├── Sidebar.jsx
│   └── Topbar.jsx
│
├── screens/
│   ├── orders/
│   │   ├── OrdersScreen.jsx
│   │   └── OrderCard.jsx
│   ├── kitchen/
│   │   ├── KitchenScreen.jsx
│   │   └── KitchenTicket.jsx
│   ├── pos/
│   │   └── PosScreen.jsx
│   ├── detail/
│   │   └── OrderDetailScreen.jsx
│   ├── menu/
│   │   ├── MenuScreen.jsx
│   │   ├── StatTile.jsx
│   │   └── AvailSwitch.jsx
│   ├── printer/
│   │   └── PrinterScreen.jsx
│   └── settings/
│       └── SettingsScreen.jsx
│
├── shared/
│   ├── ThermalTicket.jsx       # Shared between detail + printer screens
│   ├── ToastStack.jsx
│   └── AcceptDialog.jsx
│
├── hooks/                      # Custom hooks (data + behavior, not UI)
│   ├── useOrders.js            # wraps TanStack Query + admin-client orders calls
│   ├── useMenu.js              # wraps TanStack Query + admin-client menu calls
│   ├── useOrderActions.js      # useMutation wrappers: accept, advance, cancel
│   ├── useSSE.js               # EventSource lifecycle, reconnect, feeds query cache
│   └── usePrint.js             # invoke('print_receipt') wrapper
│
├── services/                   # Pure JS — no React, no hooks
│   ├── adminClient.js          # Initializes + exports @charlyk/admin-client instance
│   └── auth.js                 # login(), logout(), token storage via plugin-store
│
├── store/                      # Zustand: UI-only state, no server data
│   └── uiStore.js              # screen, lang, role, accent, density, sidebarCollapsed
│
├── i18n/
│   └── useT.js                 # Translation hook (direct port from prototype)
│
├── icons/
│   └── Icon.jsx                # Icon component (direct port from prototype)
│
└── assets/
    └── colors_and_type.css     # Design tokens (copied verbatim from prototype)
```

### src-tauri/ Layout

```
src-tauri/
├── Cargo.toml
├── build.rs
├── tauri.conf.json
├── src/
│   ├── main.rs                 # Desktop entry — calls lib::run()
│   └── lib.rs                  # Plugin registration, command handler setup
├── capabilities/
│   └── default.json            # Permissions: store, printer, window controls
└── icons/                      # App icons for macOS + Windows
```

---

## Data Flow

### Direction Rule

Data flows in one direction: API → hooks → components. Components do not call services directly. They call hooks. Hooks call services. Services call `@charlyk/admin-client`.

```
@charlyk/admin-client (SDK)
        │
        ▼
services/adminClient.js         (singleton client instance, auth headers)
        │
        ├──▶ hooks/useOrders.js      (TanStack Query: fetches + caches orders)
        ├──▶ hooks/useMenu.js        (TanStack Query: fetches + caches menu)
        ├──▶ hooks/useOrderActions.js (useMutation: accept/advance/cancel → invalidate cache)
        │
        ▼
TanStack Query cache             (the single source of truth for server data)
        │
        ▼
Screen components                (read from cache via hooks, never from store)
        │
        ▼
Shell / ToastStack               (reads toasts from Zustand store, not query cache)
```

### SSE Data Flow

SSE events update the TanStack Query cache directly. They do not go into Zustand.

```
API SSE endpoint
        │  (EventSource in useSSE.js — runs at app root, one connection)
        ▼
useSSE.js hook
        │  (receives order_updated / order_created events)
        ▼
queryClient.invalidateQueries(['orders'])
   OR   queryClient.setQueryData(['orders'], updatedFn)
        │
        ▼
useOrders.js consumers re-render automatically
```

The EventSource lives in a singleton hook mounted once at App level (or Shell level), not inside any individual screen. This means it stays alive when the user switches between the Orders screen and the Kitchen screen — which is critical for the kitchen display use case.

### UI State Flow (Zustand)

```
uiStore.js (Zustand)
    ├── screen: 'orders' | 'kitchen' | 'pos' | 'detail' | 'menu' | 'printer' | 'settings'
    ├── lang: 'ro' | 'en'
    ├── role: 'cashier' | 'kitchen'
    ├── accent: 'sage' | 'indigo' | 'terracotta' | 'charcoal'
    ├── density: 'balanced' | 'dense'
    ├── sidebarCollapsed: boolean
    └── toasts: Toast[]

Reads:  Shell reads screen to decide which screen to render
        Sidebar reads role to determine nav groups
        Any component reads lang to pass to useT()

Writes: NavItem click → setScreen()
        RoleSwitcher click → setRole()
        AcceptDialog dismiss → addToast()
        Preference change → setAccent(), setDensity(), etc.

Persistence: Zustand middleware writes lang/role/screen/accent/density/sidebarCollapsed
             to plugin-store (Tauri) on every change. Loaded on boot.
```

### Authentication Flow

```
App.jsx boot
    │
    ├── read token from services/auth.js (loaded from plugin-store on start)
    │
    ├── no token ──▶ render LoginScreen
    │                   │  (user submits credentials)
    │                   ▼
    │               auth.login(user, pass) via @charlyk/admin-client
    │                   │  (success: saves token to plugin-store)
    │                   ▼
    │               App re-renders → token present → render Shell
    │
    └── token present ──▶ render Shell + QueryClientProvider active
```

### Print Flow

```
OrderDetailScreen "Print" button click
    │
    ▼
usePrint.js hook
    │  (formats ThermalTicket data to ESC/POS or HTML string)
    ▼
invoke('print_receipt', { printerName, data })     [Tauri IPC]
    │
    ▼
Rust: tauri-plugin-printer command handler
    │  (sends to OS print queue / thermal printer driver)
    ▼
OS printer
```

If the printer plugin proves insufficient, fallback is `window.print()` from within Tauri's WebView — macOS and Windows both expose the OS print dialog this way. Thermal ESC/POS requires the Rust plugin.

---

## State Architecture

### The Hard Rule

Never store server data in Zustand. Never fetch server data from inside Zustand actions.

| State Type | What Lives Here | Library |
|------------|----------------|---------|
| Server state | Orders list, order details, menu items, menu categories | TanStack Query |
| Mutation state | Loading / error state for accept, advance, cancel, toggle availability | TanStack Query useMutation |
| Real-time updates | SSE-pushed order changes feed directly into Query cache | useSSE → queryClient |
| UI preferences | screen, lang, role, accent, density, sidebarCollapsed | Zustand |
| Transient UI | Toast list, active dialog | Zustand |
| Auth token | Stored in plugin-store (Tauri), read into memory on boot | services/auth.js |
| Screen-local UI | Cart state in POS, filter state in Orders | useState inside screen |

### TanStack Query Setup

```js
// main.jsx
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,       // 30s — SSE handles real-time, don't over-fetch
      retry: 2,
      refetchOnWindowFocus: false,  // desktop app, window focus is different
    }
  }
})
```

Query keys follow a simple hierarchy:
- `['orders']` — all orders
- `['orders', orderId]` — single order detail
- `['menu', 'categories']` — menu categories
- `['menu', 'items']` — all menu items

### Zustand Store Shape

```js
// store/uiStore.js
const useUIStore = create(
  persist(
    (set) => ({
      screen: 'orders',
      lang: 'ro',
      role: 'cashier',
      accent: 'sage',
      density: 'balanced',
      sidebarCollapsed: false,
      toasts: [],
      // actions
      setScreen: (screen) => set({ screen }),
      setLang: (lang) => set({ lang }),
      setRole: (role) => set({ role, screen: role === 'kitchen' ? 'kitchen' : 'orders' }),
      addToast: (toast) => set((s) => ({ toasts: [...s.toasts, toast] })),
      dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter(t => t.id !== id) })),
    }),
    { name: 'ui-preferences', storage: tauriPluginStoreAdapter }
  )
)
```

The `persist` middleware uses a custom adapter that reads/writes to `tauri-plugin-store` instead of localStorage. This gives native file-backed persistence rather than WebView localStorage (which can be cleared).

### SSE Hook Architecture

```js
// hooks/useSSE.js
function useSSE() {
  const queryClient = useQueryClient()
  const eventSourceRef = useRef(null)
  const retryCountRef = useRef(0)
  const retryTimerRef = useRef(null)

  const connect = useCallback(() => {
    const es = new EventSource(SSE_URL, { withCredentials: true })
    eventSourceRef.current = es

    es.addEventListener('order_updated', (e) => {
      const order = JSON.parse(e.data)
      queryClient.setQueryData(['orders'], (old) =>
        old?.map(o => o.id === order.id ? order : o) ?? [order]
      )
      queryClient.invalidateQueries(['orders', order.id])
    })

    es.addEventListener('order_created', (e) => {
      queryClient.invalidateQueries(['orders'])
    })

    es.onerror = () => {
      es.close()
      const delay = Math.min(1000 * 2 ** retryCountRef.current, 30_000)
      retryCountRef.current++
      retryTimerRef.current = setTimeout(connect, delay)
    }

    es.onopen = () => { retryCountRef.current = 0 }
  }, [queryClient])

  useEffect(() => {
    connect()
    return () => {
      eventSourceRef.current?.close()
      clearTimeout(retryTimerRef.current)
    }
  }, [connect])
}
```

`useSSE()` is called once at the Shell level (not inside screens). SSE events never touch Zustand — they update the Query cache, which propagates to all subscribers automatically.

Note: Tauri v2 WebView uses the platform's native WebView (WKWebView on macOS, WebView2 on Windows). Both support `EventSource` natively. The API host must be in the CSP `connect-src` directive. No Tauri Rust plugin is needed for SSE itself.

### CSP Configuration

```json
// src-tauri/tauri.conf.json (security section)
"security": {
  "csp": {
    "default-src": "'self' customprotocol: asset:",
    "connect-src": "ipc: http://ipc.localhost https://api.sitecare.ro wss://api.sitecare.ro",
    "font-src": "'self' data:",
    "img-src": "'self' asset: http://asset.localhost blob: data:",
    "style-src": "'unsafe-inline' 'self'"
  }
}
```

---

## Build Order

Components have hard dependencies. This order avoids building a consumer before its dependency exists.

### Phase 1 — Foundation (nothing can be built without this)

1. **Vite + Tauri scaffold** — `npm create vite`, `npx tauri init`. Empty shell that builds and runs.
2. **Design tokens** — Copy `colors_and_type.css` from prototype. Verify fonts load in Tauri WebView.
3. **`services/adminClient.js`** — Initialize `@charlyk/admin-client` singleton. Nothing else can talk to the API without this.
4. **`store/uiStore.js`** — Zustand store with plugin-store persistence adapter. Required by Shell and App.
5. **`services/auth.js`** — Login/logout wrappers. Required before any authenticated screen can render.

### Phase 2 — Auth + App Shell (gate before screens)

6. **`LoginScreen`** — First real screen. Auth must work before any other screen is accessible.
7. **`App.jsx`** — Auth gate: renders LoginScreen or Shell based on token presence.
8. **`Shell.jsx` + `Sidebar.jsx` + `Topbar.jsx`** — Navigation container. Depends on uiStore for screen/role/lang.
9. **`QueryClientProvider`** — Mounted in main.jsx. Required by all data-fetching hooks.

### Phase 3 — Core Data Hooks (screens depend on these)

10. **`hooks/useOrders.js`** — TanStack Query wrapper for orders list + detail.
11. **`hooks/useOrderActions.js`** — useMutation wrappers for accept/advance/cancel.
12. **`hooks/useSSE.js`** — EventSource lifecycle. Mounted at Shell level. Required for KitchenScreen to be live.
13. **`hooks/useMenu.js`** — TanStack Query wrapper for menu categories + items.

### Phase 4 — Screens (in dependency order)

14. **`OrdersScreen`** — First fully live screen. Uses useOrders + useOrderActions.
15. **`AcceptDialog` + `ToastStack`** — Shared UI needed by Orders accept flow.
16. **`KitchenScreen`** — Uses useOrders (filtered) + useSSE already mounted at Shell.
17. **`OrderDetailScreen` + `ThermalTicket`** — Uses single-order query.
18. **`PosScreen`** — Order creation mutation. Depends on useOrderActions.
19. **`MenuScreen`** — Uses useMenu + availability toggle mutation.

### Phase 5 — Native Integration

20. **`hooks/usePrint.js` + Rust print command** — Requires printer plugin registered in lib.rs and capabilities.
21. **`PrinterScreen`** — Printer configuration UI. Depends on usePrint.
22. **`SettingsScreen`** — Preference controls. Reads/writes uiStore. No API dependency.

### Phase 6 — Hardening + Build Pipeline

23. **Tauri capabilities lockdown** — Audit default.json, remove unneeded permissions.
24. **macOS + Windows build targets** — `tauri build` for both, test installer on both platforms.
25. **Auto-update** (if required) — `tauri-plugin-updater`.

### Dependency Graph Summary

```
Tauri scaffold
    └── Design tokens
        └── adminClient.js
            └── auth.js
                └── LoginScreen
                    └── App.jsx (auth gate)
                        └── Shell + uiStore
                            └── QueryClientProvider
                                ├── useOrders → OrdersScreen → AcceptDialog / ToastStack
                                ├── useSSE (mounted at Shell) → KitchenScreen
                                ├── useOrderActions → PosScreen
                                ├── useMenu → MenuScreen
                                └── single-order query → OrderDetailScreen
                                    └── usePrint + Rust command → PrinterScreen
```

---

## Key Observations

### What Rust Handles (and why)

Only three things require Rust in this app:

1. **Window chrome** — `decorations: false` in tauri.conf.json enables the custom macOS titlebar simulation from the prototype. The drag region (`data-tauri-drag-region`) and close/minimize/maximize buttons call `invoke('window_minimize')` etc., which map to `getCurrentWindow()` API calls. This is wired up once and never touched again.

2. **Persistent settings** — `tauri-plugin-store` stores preferences to a JSON file in the app data directory. More reliable than WebView localStorage (which Tauri can clear on update). Used exclusively by the Zustand persist adapter.

3. **Thermal printing** — `tauri-plugin-printer` or `tauri-plugin-thermoprint` bridges the JS print intent to OS printer drivers / ESC/POS USB. This cannot be done from the WebView alone. If the Printer screen is descoped or deferred, this Rust dependency goes away entirely.

Everything else — authentication, API calls, SSE, business logic, routing, state — lives in JavaScript.

### SSE Does Not Need Rust

Both WKWebView (macOS) and WebView2 (Windows) support `EventSource` natively. SSE connections from the JavaScript layer work as long as the API host is in CSP `connect-src`. No Tauri plugin or Rust proxy is needed. This is a simpler and more correct architecture than routing SSE through Tauri's IPC.

### Screen Isolation Pattern

In the production app, screens should fetch their own data rather than receiving it via props from App. This is the key departure from the prototype:

- Prototype: `App` owns `orders`, passes down as prop to every screen
- Production: `OrdersScreen` calls `useOrders()` directly; `KitchenScreen` calls `useOrders()` directly. TanStack Query deduplicates the fetch — only one network request fires even if both hooks are active.

This eliminates prop drilling and removes the need for `App` to know about order data at all.

### Routing Stays Simple

No router library is needed. The prototype's `screen` string in state is the correct pattern for a 7-screen desktop app with no deep-link requirement. Zustand's `uiStore.screen` replaces `App.useState('screen')`. `Shell.jsx` maps the screen key to the active component — same logic, clean implementation.

### Feature Gating

Greyed-out features (per PROJECT.md requirement) are implemented with a shared `disabled` CSS class and `pointer-events: none`. No conditional rendering — disabled features render but are not interactive. This requires no architecture change from the prototype; it is a CSS/prop concern at the component level.

### Migration Risk: Window Globals

The largest migration risk is the `window.*` module system in the prototype. Every screen file writes itself to `window.ScreenName` and reads dependencies from `window.OtherThing`. In production, each file becomes a proper ES module with named imports. The component logic is identical — only the import/export syntax changes. The order of operations (script load order in index.html) is replaced by Vite's static import graph.

### Authentication Is a New Concern

The prototype has no authentication concept — it boots directly to the orders screen. Production must boot to a LoginScreen, acquire a token, and store it. This is the first new screen and the first new concept. It must be built before anything else is wired to the live API, because `@charlyk/admin-client` requires auth headers on every request.

---

## Sources

- Tauri v2 Architecture: https://v2.tauri.app/concept/architecture/
- Tauri v2 Project Structure: https://v2.tauri.app/start/project-structure/
- Tauri v2 Calling Rust from Frontend: https://v2.tauri.app/develop/calling-rust/
- Tauri v2 Window Customization: https://v2.tauri.app/learn/window-customization/
- Tauri v2 CSP: https://v2.tauri.app/security/csp/
- Tauri Plugins (store, fs, printer): Context7 /tauri-apps/plugins-workspace
- TanStack Query docs: https://tanstack.com/query/latest
- TanStack Query + Zustand pattern: https://www.nextsteps.dev/en/posts/federated-state-done-righ/
- Tauri thermal printer plugin: https://github.com/luis3132/tauri-plugin-thermal-printer
- tauri-plugin-printer: https://crates.io/crates/tauri-plugin-printer
