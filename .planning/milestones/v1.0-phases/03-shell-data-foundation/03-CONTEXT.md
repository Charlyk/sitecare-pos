# Phase 3: Shell + Data Foundation - Context

**Gathered:** 2026-04-23
**Status:** Ready for planning

<domain>
## Phase Boundary

Wire all data-fetching hooks (`useOrders`, `useOrderActions`, `useMenu`, `useSSE`) to the live SiteCare API via TanStack Query and `@charlyk/admin-client`; establish the SSE real-time connection at Shell level so the KDS receives live order events without polling; and implement the offline banner with mutation blocking.

**In scope:**
- `QueryClientProvider` setup in `main.jsx`
- `useOrders` hook (lists orders via `client.kitchen.orders.list()`)
- `useOrderActions` hook (mutations: accept, advance, cancel via `client.kitchen.orders.updateStatus()`)
- `useMenu` hook (via `client.kitchen.menu.list()`)
- `useSSE` hook (persistent SSE connection; updates TanStack Query cache on events)
- `isConnected` state surfaced from `useSSE` → offline banner in Shell
- `isOffline` prop passed from Shell to all 7 screens → mutating buttons disabled

**Out of scope:**
- Full screen UX for orders/KDS/POS (Phase 4)
- Thermal printing (Phase 5)
- Build pipeline (Phase 6)

</domain>

<decisions>
## Implementation Decisions

### SSE Connection

- **D-01:** SSE endpoint is `GET /v1/sse/orders` (full URL: `https://api.restaurant.sitecare.ro/v1/sse/orders`).
- **D-02:** Auth is Bearer token in the `Authorization` header — same token the SDK uses. Do NOT use native `EventSource` (cannot send custom headers). Use `@microsoft/fetch-event-source` instead.
- **D-03:** The server emits a snapshot of all ACTIVE orders as `order_new` events immediately on connect (before any live events). The `useSSE` hook must handle this: each `order_new` event → parse the order JSON → `queryClient.setQueryData(...)` to upsert into the orders cache.
- **D-04:** The `ping` event (keepalive every 30 seconds) is a no-op — ignore it, just let it prevent connection timeout.
- **D-05:** `useSSE` is mounted **once at Shell level** and stays alive across screen switches. It must NOT be mounted per-screen.
- **D-06:** `useSSE` exposes `isConnected: boolean`. Connected = SSE stream is open and receiving. Disconnected = failed to connect or was dropped.
- **D-07:** Token for the SSE connection comes from `useAuth().client` — extract it from the client's config, or keep the raw token accessible. If `useAuth` doesn't expose the raw token directly, add a `token` getter or expose it alongside `client`.

### Offline Detection

- **D-08:** `isConnected` from `useSSE` is the **single source of truth for connectivity**. No `navigator.onLine` event, no periodic health ping. The SSE connection failing IS the offline signal.
- **D-09:** When SSE reconnects successfully, `isConnected` flips back to `true` and the offline banner disappears automatically.

### Offline Banner UX

- **D-10:** The offline banner renders **at the top of the main content area**, inside Shell, above the active screen component. It does NOT span the sidebar. It persists across screen switches because Shell itself persists.
- **D-11:** Shell passes `isOffline={!isConnected}` as a prop to every screen component. Each screen is responsible for disabling its mutating buttons (Accept, Advance, Cancel, Create Order) when `isOffline` is true. Static/read-only screens (Settings, Menu browse) need no special handling.
- **D-12:** Mutating buttons are **visually disabled** (opacity + `pointer-events: none` or `disabled` attribute) while offline — not hidden. Consistent with the project's "greyed-out, not hidden" principle for unavailable features.

### Data Hooks

- **D-13:** `useOrders(status?)` uses TanStack Query `useQuery` + `client.kitchen.orders.list({ query: { status } })`. Each screen that needs orders calls this hook directly (no prop-drilling).
- **D-14:** `useMenu()` uses `useQuery` + `client.kitchen.menu.list({})`. Menus change infrequently — `staleTime: 5 * 60 * 1000` (5 minutes) is appropriate.
- **D-15:** `useOrderActions()` returns React Query `useMutation` wrappers for `updateStatus` and `updateEstimatedTime`. On success, `invalidateQueries(['orders'])` so the list refreshes.
- **D-16:** `QueryClientProvider` is added in `main.jsx`, wrapping `AuthProvider` (or at the same level). A single shared `QueryClient` instance is used app-wide.

### Claude's Discretion

- **Token extraction for useSSE:** How to get the raw Bearer token string from `useAuth()` without breaking the existing auth.jsx abstraction — Claude decides (e.g., expose `token` field from `AuthProvider`, or pass raw token ref).
- **SSE reconnect backoff:** `@microsoft/fetch-event-source` handles this internally — no custom retry logic needed. Use library defaults.
- **TanStack Query cache key shape:** Claude decides the query key structure (e.g., `['orders', status]`, `['menu']`).
- **isOffline prop wiring in app.jsx:** Shell already receives props from App — Claude decides whether `isOffline` flows from `useSSE` in App or in Shell itself.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### SSE Endpoint (server source)
- `/Users/eduardalbu/Developer/sitecare-orders-api/src/routes/v1/sse/index.ts` — SSE route implementation. Defines the `order_new` event shape, snapshot-on-connect behavior, ping keepalive, and auth middleware. Read this before implementing `useSSE`.

### Phase Requirements
- `.planning/ROADMAP.md` — Phase 3 goal, success criteria (4 criteria), requirement IDs KDS-01, OFF-01, OFF-02, OFF-03
- `.planning/REQUIREMENTS.md` — Full text for KDS-01, OFF-01, OFF-02, OFF-03

### SDK
- `node_modules/@charlyk/admin-client/dist/index.d.ts` — Type definitions. Key interfaces for Phase 3: `AdminClient.kitchen.orders.list`, `AdminClient.kitchen.orders.updateStatus`, `AdminClient.kitchen.orders.updateEstimatedTime`, `AdminClient.kitchen.menu.list`. Also `Order`, `OrderListResponse`, `ListOrdersData` (status filter: `ACTIVE | TODAY | ALL | NEW | ACCEPTED | PREPARING | READY | OUT_FOR_DELIVERY | COMPLETED | CANCELLED`).

### Existing Code
- `src/auth.jsx` — `AuthProvider` and `useAuth()`. Phase 3 hooks consume `client` from `useAuth()`. The raw session token may need to be exposed for the SSE Bearer auth header.
- `src/store.js` — Zustand store. `isAuthenticated`, `authUser` session keys. TanStack Query state does NOT go here.
- `src/shell.jsx` — Current Shell implementation (props-based). `isOffline` prop must be added to its signature.
- `src/app.jsx` — Root component. `QueryClientProvider` wraps here or in `main.jsx`. `useSSE` is mounted here or in Shell directly.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/auth.jsx` — `useAuth()` hook returns `{ client, signOut, coldStartBusy, busy, error }`. `client` is the `AdminClient` instance — Phase 3 data hooks call this directly.
- `src/store.js` — Zustand `useAppStore` with `pushToast`. Offline state (isConnected) is NOT stored in Zustand — it lives in `useSSE`'s local React state and flows as a prop.
- `src/icons.jsx` — `Icon` component. The offline banner will need a wifi-off or alert icon — verify `wifi` or `alert` are already registered.
- `src/i18n.jsx` — `useT(lang)` for bilingual strings. "Connection lost" text needs `ro`/`en` entries added.

### Established Patterns
- **Functional components, kebab-case filenames** — new hooks go in `src/use-orders.js`, `src/use-menu.js`, `src/use-sse.js`, `src/use-order-actions.js`.
- **TanStack Query owns server state** — never store API responses in Zustand.
- **Each screen is self-contained** — screens call their own hooks, receive `isOffline` as prop only (no other server data props from App).
- **No prop-drilling of server data** — only UI/interaction props (lang, isOffline, onNavigate) come from Shell/App.

### Integration Points
- `src/main.jsx` — Add `QueryClientProvider` wrapping here (or `src/app.jsx`).
- `src/app.jsx` — Mount `useSSE` here to get `isConnected`, pass `isOffline={!isConnected}` into Shell.
- `src/shell.jsx` — Accept `isOffline` prop; render offline banner conditionally above `{children}`.
- Each screen component — Accept `isOffline` prop; disable mutating buttons when true.

</code_context>

<specifics>
## Specific Ideas

- **SSE server source path confirmed:** `/Users/eduardalbu/Developer/sitecare-orders-api/src/routes/v1/sse/index.ts` — read this before implementing the hook.
- **`order_new` event data shape:** The server does `JSON.stringify(order)` where `order` comes from `listOrders(db, "ACTIVE")` — same shape as `client.kitchen.orders.list()` returns. The `useSSE` hook can type-cast parsed data as `Order` from the SDK types.
- **Snapshot pattern:** Server registers the client AFTER emitting the snapshot to prevent double-emit. No special handling needed on the client — events arrive in order.
- **@microsoft/fetch-event-source** was already identified in `CLAUDE.md` critical rules as the solution when SSE requires Bearer auth. Install if not already present.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within Phase 3 scope.

</deferred>

---

*Phase: 03-shell-data-foundation*
*Context gathered: 2026-04-23*
