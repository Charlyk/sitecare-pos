# Phase 3: Shell + Data Foundation - Research

**Researched:** 2026-04-23
**Domain:** TanStack Query v5, SSE via @microsoft/fetch-event-source, React data hooks, offline UI
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** SSE endpoint is `GET /v1/sse/orders` (full URL: `https://api.restaurant.sitecare.ro/v1/sse/orders`).
- **D-02:** Auth is Bearer token in the `Authorization` header — same token the SDK uses. Do NOT use native `EventSource`. Use `@microsoft/fetch-event-source` instead.
- **D-03:** The server emits a snapshot of all ACTIVE orders as `order_new` events immediately on connect. The `useSSE` hook must handle this: each `order_new` event → parse the order JSON → `queryClient.setQueryData(...)` to upsert into the orders cache.
- **D-04:** The `ping` event (keepalive every 30 seconds) is a no-op — ignore it.
- **D-05:** `useSSE` is mounted once at Shell level and stays alive across screen switches. Must NOT be mounted per-screen.
- **D-06:** `useSSE` exposes `isConnected: boolean`. Connected = SSE stream is open and receiving. Disconnected = failed to connect or was dropped.
- **D-07:** Token for the SSE connection comes from `useAuth().client` — extract it from the client's config, or keep the raw token accessible. If `useAuth` doesn't expose the raw token directly, add a `token` getter or expose it alongside `client`.
- **D-08:** `isConnected` from `useSSE` is the single source of truth for connectivity. No `navigator.onLine` event, no periodic health ping.
- **D-09:** When SSE reconnects successfully, `isConnected` flips back to `true` and the offline banner disappears automatically.
- **D-10:** The offline banner renders at the top of the main content area, inside Shell, above the active screen component. It does NOT span the sidebar.
- **D-11:** Shell passes `isOffline={!isConnected}` as a prop to every screen component.
- **D-12:** Mutating buttons are visually disabled (opacity 0.45 + `pointer-events: none` or `disabled` attribute) while offline — not hidden.
- **D-13:** `useOrders(status?)` uses TanStack Query `useQuery` + `client.kitchen.orders.list({ query: { status } })`.
- **D-14:** `useMenu()` uses `useQuery` + `client.kitchen.menu.list({})`. `staleTime: 5 * 60 * 1000`.
- **D-15:** `useOrderActions()` returns React Query `useMutation` wrappers for `updateStatus` and `updateEstimatedTime`. On success, `invalidateQueries(['orders'])`.
- **D-16:** `QueryClientProvider` is added in `main.jsx`, wrapping the app.

### Claude's Discretion

- **Token extraction for useSSE:** How to get the raw Bearer token string from `useAuth()` without breaking the existing auth.jsx abstraction.
- **SSE reconnect backoff:** `@microsoft/fetch-event-source` handles this internally — no custom retry logic needed.
- **TanStack Query cache key shape:** Claude decides the query key structure (e.g., `['orders', status]`, `['menu']`).
- **isOffline prop wiring in app.jsx:** Claude decides whether `isOffline` flows from `useSSE` in App or in Shell itself.

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within Phase 3 scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| KDS-01 | Kitchen display shows live order queue updated in real-time via SSE (no polling) | useSSE hook + @microsoft/fetch-event-source + queryClient cache upsert |
| OFF-01 | App shows a visible "connection lost" banner when the API is unreachable | isConnected from useSSE → isOffline prop → OfflineBanner component |
| OFF-02 | Existing data remains visible from TanStack Query cache while offline | TanStack Query's default stale-while-revalidate cache behavior — no extra work |
| OFF-03 | Mutating actions are disabled while offline and re-enabled on reconnect | isOffline prop → disabled + .btn-disabled-offline CSS class on mutating buttons |
</phase_requirements>

---

## Summary

Phase 3 wires the data layer that all future phases depend on. The three pillars are: (1) TanStack Query v5 as the server state cache, already installed at `^5.99.2` and `QueryClientProvider` already wired in `main.jsx`; (2) a `useSSE` hook that establishes a persistent SSE connection via `@microsoft/fetch-event-source` (not yet installed — the one missing package), feeding live order events into the TanStack Query cache; and (3) an `isConnected` boolean that drives the offline banner and mutating-button disabled state.

The existing codebase is in excellent shape for this phase. `main.jsx` already has `QueryClientProvider` and a `queryClient` instance. `auth.jsx` already stores `sessionToken` as a constructor argument to `createAdminClient` — but does not expose the raw token string, which the SSE hook needs. The recommended solution is to expose a `token` string from `AuthProvider`'s context value. The SDK's `AdminClient` interface shows that `kitchen.orders.list`, `kitchen.orders.updateStatus`, `kitchen.orders.updateEstimatedTime`, and `kitchen.menu.list` are the four methods Phase 3 hooks call.

The SSE server endpoint (`GET /v1/sse/orders`) uses Better Auth with the `bearer()` plugin enabled, meaning the same session token stored in `preferences.json` works as a Bearer token in the `Authorization` header. The server emits all ACTIVE orders as `order_new` events on connect (snapshot pattern), then streams live events, then pings every 30 seconds. No special client-side sequencing is needed — events arrive in order.

**Primary recommendation:** Install `@microsoft/fetch-event-source@2.0.1`, expose `token` from `AuthProvider`, write four hook files (`use-sse.js`, `use-orders.js`, `use-menu.js`, `use-order-actions.js`), create `offline-banner.jsx`, add two i18n keys, add the CSS classes, and wire `isOffline` through Shell to all seven screens.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| SSE connection lifecycle | Frontend (React hook in Shell) | — | Shell persists across screens; mounting useSSE here prevents connection restart on navigation |
| Server state cache (orders, menu) | Frontend (TanStack Query) | — | TanStack Query is the designated server-state layer; Zustand explicitly excluded from server data |
| Offline detection signal | Frontend (useSSE isConnected) | — | SSE drop IS the offline signal per D-08; no secondary ping needed |
| Offline banner render | Frontend (Shell / content column) | — | Must not span sidebar; sits above screen content inside .content |
| Mutation blocking | Frontend (each screen) | — | Screens receive isOffline prop and own their button disabled state |
| Bearer token for SSE | Frontend (auth.jsx AuthProvider) | — | Token lives in auth layer; SSE hook consumes it |

---

## Standard Stack

### Core (already installed)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @tanstack/react-query | 5.99.2 [VERIFIED: npm list] | Server state cache, useQuery/useMutation | Designated server-state layer per architecture decisions |
| zustand | 5.0.12 [VERIFIED: npm list] | UI state only | Already used for screen/role/lang/accent/density/sidebarCollapsed |
| @charlyk/admin-client | ^1.1.20 [VERIFIED: package.json] | API data layer | Only sanctioned API layer per CLAUDE.md |
| react | ^18.3.1 [VERIFIED: package.json] | Component framework | Project foundation |

### Missing — Must Install

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @microsoft/fetch-event-source | 2.0.1 [VERIFIED: npm registry] | SSE with custom headers (Bearer auth) | Native EventSource cannot send Authorization header; this is the only solution for authenticated SSE |

**Installation:**
```bash
npm install @microsoft/fetch-event-source
```

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| @microsoft/fetch-event-source | Native EventSource | Native EventSource CANNOT send auth headers — ruled out by CLAUDE.md critical rule and confirmed by SSE server requiring Bearer token |
| @microsoft/fetch-event-source | SDK's own SSE client | SDK's async-generator SSE is for SDK-defined endpoints; the raw SSE endpoint at /v1/sse/orders needs direct control over reconnect/ping handling |
| TanStack Query invalidateQueries | Zustand for order list | Architecture rule: Zustand owns UI state only; server data belongs in TanStack Query cache |

---

## Architecture Patterns

### System Architecture Diagram

```
[AuthProvider]
    │  sessionToken → exposes token string
    ▼
[App.jsx]
    │  useAuth() → { client, token }
    │  useSSE(token) → { isConnected }
    │  isOffline = !isConnected
    ▼
[Shell.jsx]  ← receives isOffline prop
    │  renders <OfflineBanner> when isOffline
    │  passes isOffline to all 7 screens
    ▼
[Screen components]  ← receive isOffline prop
    │  useOrders(status)  → TanStack Query cache
    │  useMenu()          → TanStack Query cache
    │  useOrderActions()  → useMutation wrappers
    │  buttons disabled when isOffline

[useSSE hook]  ← mounted once in App (above Shell)
    │  fetchEventSource(GET /v1/sse/orders, Authorization: Bearer <token>)
    │  on order_new event → queryClient.setQueryData(['orders'], upsert)
    │  on open → setIsConnected(true)
    │  on error/close → setIsConnected(false), auto-retry via library
    │  on ping → ignore
    ▼
[TanStack Query cache]
    │  key: ['orders'] or ['orders', status]
    │  key: ['menu']
    ├── useOrders reads from cache
    └── useMenu reads from cache
```

### Recommended Project Structure

New files for Phase 3:
```
src/
├── use-sse.js            # SSE hook — persistent connection, cache upsert, isConnected
├── use-orders.js         # useOrders(status?) — useQuery wrapping kitchen.orders.list
├── use-menu.js           # useMenu() — useQuery wrapping kitchen.menu.list, staleTime 5min
├── use-order-actions.js  # useOrderActions() — useMutation wrappers for updateStatus + updateEstimatedTime
└── offline-banner.jsx    # OfflineBanner component
```

Modified files:
```
src/
├── auth.jsx              # Expose token string from AuthProvider context
├── app.jsx               # Mount useSSE, pass isOffline to Shell
├── shell.jsx             # Accept isOffline prop, render OfflineBanner, pass isOffline to screens
├── i18n.jsx              # Add offline_banner_title + offline_banner_sub (ro + en)
├── styles.css            # Add .offline-banner + .btn-disabled-offline CSS classes
├── main.jsx              # Already has QueryClientProvider (NO CHANGES NEEDED)
└── screen-*.jsx          # Add isOffline prop + disabled state to mutating buttons (7 screens)
```

### Pattern 1: Token Exposure from AuthProvider

**What:** Expose the raw `sessionToken` string alongside `client` from `AuthProvider`'s context, so `useSSE` can construct the Authorization header.

**When to use:** Any hook that needs to make requests outside the SDK (e.g., SSE via fetchEventSource).

**Example:**
```javascript
// In auth.jsx — AuthProvider state
const [token, setToken] = useState(null); // add this

// In signIn — after setting client:
setToken(signInResult.token ?? signInResult.accessToken ?? signInResult.access_token);
tokenRef.current = ...; // already exists

// In cold start — after reading stored token:
setToken(token);

// In doRefresh — if token rotated:
setToken(session.token);

// In signOut:
setToken(null);

// In context value:
<AuthContext.Provider value={{ signIn, signOut, client, token, coldStartBusy, busy: signingIn, error, setError }}>
```

### Pattern 2: useSSE Hook

**What:** Persistent SSE connection using @microsoft/fetch-event-source. Mounted once at App level (above Shell). Updates TanStack Query cache on `order_new` events. Sets `isConnected` state.

**When to use:** Once, at App level. Not per-screen.

```javascript
// src/use-sse.js
// Source: @microsoft/fetch-event-source docs + server SSE implementation
import { useEffect, useRef, useState } from 'react';
import { fetchEventSource } from '@microsoft/fetch-event-source';
import { useQueryClient } from '@tanstack/react-query';

const SSE_URL = import.meta.env.DEV
  ? '/v1/sse/orders'   // Vite proxy intercepts in dev
  : 'https://api.restaurant.sitecare.ro/v1/sse/orders';

export function useSSE(token) {
  const queryClient = useQueryClient();
  const [isConnected, setIsConnected] = useState(false);
  const abortRef = useRef(null);

  useEffect(() => {
    if (!token) {
      setIsConnected(false);
      return;
    }

    const ctrl = new AbortController();
    abortRef.current = ctrl;

    fetchEventSource(SSE_URL, {
      headers: { Authorization: `Bearer ${token}` },
      signal: ctrl.signal,
      onopen(response) {
        if (response.ok) {
          setIsConnected(true);
        }
        // fetchEventSource throws on non-2xx by default
      },
      onmessage(msg) {
        if (msg.event === 'ping') return; // D-04: keepalive no-op

        if (msg.event === 'order_new') {
          try {
            const order = JSON.parse(msg.data);
            queryClient.setQueryData(['orders'], (old) => {
              const list = old?.orders ?? [];
              const exists = list.findIndex((o) => o.id === order.id);
              const next = exists >= 0
                ? list.map((o) => (o.id === order.id ? order : o))
                : [...list, order];
              return { orders: next };
            });
          } catch { /* malformed JSON — ignore */ }
        }
      },
      onerror() {
        setIsConnected(false);
        // Returning undefined lets library retry with backoff (default 3s, max 30s)
      },
      onclose() {
        setIsConnected(false);
      },
    });

    return () => ctrl.abort();
  }, [token, queryClient]);

  return { isConnected };
}
```

### Pattern 3: useOrders Hook (TanStack Query v5)

**What:** `useQuery` wrapping `client.kitchen.orders.list()`. Returns `{ orders, isLoading, isError }`.

**TanStack Query v5 note:** `useQuery` options signature changed in v5 — `queryKey` and `queryFn` are now inside a single options object (not positional args).

```javascript
// src/use-orders.js
import { useQuery } from '@tanstack/react-query';
import { useAuth } from './auth.jsx';

export function useOrders(status) {
  const { client } = useAuth();

  return useQuery({
    queryKey: status ? ['orders', status] : ['orders'],
    queryFn: async () => {
      const result = await client.kitchen.orders.list({
        query: status ? { status } : {},
      });
      // SDK returns { data: OrderListResponse, error, response } with responseStyle:'fields'
      if (result.error) throw new Error(result.error.error ?? 'Failed to list orders');
      return result.data; // { orders: Order[] }
    },
    enabled: !!client,
    staleTime: 30_000, // 30s — SSE keeps cache fresh; polling is backup only
  });
}
```

**Cache key strategy:** `['orders']` is the root key used by `useSSE` cache writes and `invalidateQueries`. `['orders', status]` for filtered views. `invalidateQueries({ queryKey: ['orders'] })` invalidates all orders keys including filtered.

### Pattern 4: useOrderActions Hook (TanStack Query v5 useMutation)

**What:** `useMutation` wrappers for status updates and estimated time.

```javascript
// src/use-order-actions.js
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './auth.jsx';

export function useOrderActions() {
  const { client } = useAuth();
  const queryClient = useQueryClient();

  const updateStatus = useMutation({
    mutationFn: ({ id, currentStatus, toStatus, estimatedMinutes, reason }) =>
      client.kitchen.orders.updateStatus({
        path: { id },
        body: { currentStatus, toStatus, ...(estimatedMinutes ? { estimatedMinutes } : {}), ...(reason ? { reason } : {}) },
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['orders'] }),
  });

  const updateEstimatedTime = useMutation({
    mutationFn: ({ id, estimatedMinutes }) =>
      client.kitchen.orders.updateEstimatedTime({
        path: { id },
        body: { estimatedMinutes },
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['orders'] }),
  });

  return { updateStatus, updateEstimatedTime };
}
```

### Pattern 5: useMenu Hook

```javascript
// src/use-menu.js
import { useQuery } from '@tanstack/react-query';
import { useAuth } from './auth.jsx';

export function useMenu() {
  const { client } = useAuth();

  return useQuery({
    queryKey: ['menu'],
    queryFn: async () => {
      const result = await client.kitchen.menu.list({});
      if (result.error) throw new Error(result.error.error ?? 'Failed to list menu');
      return result.data; // KitchenMenuResponse: { categories: [...], globalProducts: [...] }
    },
    enabled: !!client,
    staleTime: 5 * 60 * 1000, // 5 minutes — D-14
  });
}
```

### Pattern 6: OfflineBanner Component (from UI-SPEC)

```javascript
// src/offline-banner.jsx
import { Icon } from './icons.jsx';
import { useT } from './i18n.jsx';

export function OfflineBanner({ lang }) {
  const t = useT(lang);
  return (
    <div className="offline-banner">
      <Icon name="wifi" size={16} />
      <span>{t('offline_banner_title')}</span>
      <span className="banner-sub">{t('offline_banner_sub')}</span>
    </div>
  );
}
```

CSS (add to styles.css):
```css
.offline-banner {
  height: 40px;
  padding: 0 24px;
  display: flex;
  align-items: center;
  gap: 8px;
  background: hsl(38 92% 50% / 0.12);
  border-left: 3px solid hsl(38 92% 50%);
  border-bottom: 1px solid hsl(38 92% 50% / 0.25);
  color: hsl(30 80% 38%);
  font-size: 13px;
  font-family: var(--sc-font-sans);
  font-weight: 600;
  animation: slideDown var(--sc-duration) var(--sc-easing);
  flex-shrink: 0;
}
.offline-banner .banner-sub {
  font-weight: 400;
  opacity: 0.75;
}
@keyframes slideDown {
  from { transform: translateY(-40px); opacity: 0; }
  to   { transform: translateY(0);     opacity: 1; }
}
.btn-disabled-offline {
  opacity: 0.45;
  cursor: not-allowed;
  pointer-events: none;
}
```

### Pattern 7: Shell Wiring

**What:** Shell accepts `isOffline` prop, conditionally renders `OfflineBanner`, passes `isOffline` to all screen children.

The current Shell signature in `src/shell.jsx`:
```javascript
function Shell({ lang, setLang, role, setRole, screen, setScreen, accent, density,
                 children, orderCount, sidebarCollapsed, setSidebarCollapsed }) {
```

Add `isOffline` to this signature and render the banner inside `.content`:
```jsx
<div className={`content ${density === 'dense' ? 'density-compact' : ''}`}>
  {isOffline && <OfflineBanner lang={lang} />}
  {children}
</div>
```

**app.jsx wiring:** Mount `useSSE` in App (authenticated branch only), derive `isOffline`, pass to Shell:
```javascript
// Inside the authenticated branch of App():
const { isConnected } = useSSE(token); // token comes from useAuth()
const isOffline = !isConnected;
// ...
<Shell ... isOffline={isOffline}>
  {screen === 'orders'  && <OrdersScreen  ... isOffline={isOffline} />}
  {/* all 7 screens */}
</Shell>
```

### Pattern 8: orderCount Derived from TanStack Query Cache

The current `app.jsx` has a stub: `const orderCount = { live: 0, new: 0, active: 0 };`

Phase 3 replaces this with real data from `useOrders()`:
```javascript
const { data: ordersData } = useOrders(); // no status filter = ACTIVE by default or all
const orders = ordersData?.orders ?? [];
const orderCount = {
  live: orders.filter(o => !['COMPLETED','CANCELLED'].includes(o.status)).length,
  new: orders.filter(o => o.status === 'NEW').length,
  active: orders.filter(o => ['ACCEPTED','PREPARING'].includes(o.status)).length,
};
```

### Anti-Patterns to Avoid

- **Mounting useSSE inside screen components:** SSE connection restarts on every screen switch, causing a new snapshot dump and brief disconnect each time.
- **Storing SSE order data in Zustand:** Architecture rule: Zustand owns UI state; TanStack Query owns server data.
- **Using native EventSource:** Cannot send `Authorization` header. The SSE endpoint uses Better Auth bearer() plugin — Authorization header is required.
- **Calling `invalidateQueries` inside useSSE on every event:** Triggers a full network refetch on every SSE event. Instead, use `setQueryData` to upsert directly into cache without a network round-trip.
- **Separate query keys per screen without shared root:** Using `['kitchen-orders']` in one screen and `['orders']` in another means `invalidateQueries(['orders'])` misses kitchen orders. Use `['orders']` as the canonical root everywhere.
- **Not handling the SDK `responseStyle: 'fields'` wrapper:** `client.kitchen.orders.list()` returns `{ data: OrderListResponse, error, response }` not raw `OrderListResponse`. Always unwrap `result.data`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| SSE reconnect with backoff | Custom retry timer | @microsoft/fetch-event-source | Library handles exponential backoff (default 3s, max 30s), abort signals, and browser tab visibility automatically |
| Server state caching | Zustand for orders/menu | TanStack Query | Zustand has no built-in deduplication, background refetch, or stale-while-revalidate; TanStack Query provides all three |
| Offline detection | navigator.onLine polling | isConnected from useSSE | D-08 is explicit: SSE drop is the offline signal; navigator.onLine misses API-down-but-network-up scenarios |
| Mutation loading states | Manual useState booleans | useMutation.isPending | TanStack Query tracks loading/error/success per mutation automatically |

**Key insight:** The SSE reconnect problem is non-trivial (exponential backoff, jitter, abort on unmount, tab visibility). @microsoft/fetch-event-source handles all of it. Don't replicate it.

---

## Common Pitfalls

### Pitfall 1: SDK Response Unwrapping

**What goes wrong:** Hook calls `client.kitchen.orders.list({})` and tries to use the result directly as `{ orders: [] }`. Gets `undefined` or a strange object instead.

**Why it happens:** The SDK is configured with `responseStyle: 'fields'` (default). Every method returns `{ data: T, error: E, request, response }`. The actual payload is in `.data`.

**How to avoid:** Always unwrap: `const { data, error } = await client.kitchen.orders.list({}); if (error) throw ...; return data;`

**Warning signs:** `orders` is undefined; `data.data.orders` exists; TypeScript complaints about shape.

### Pitfall 2: SSE Mounted in Wrong Component

**What goes wrong:** `useSSE` is placed inside a screen component (e.g., `KitchenScreen`). Every time the user navigates away and back, the SSE connection is torn down and re-established, causing a new snapshot dump and a brief `isConnected=false` flash.

**Why it happens:** React unmounts the component and its effects when navigating away. The SSE cleanup runs, abort is called, then on navigation back, a new connection is started.

**How to avoid:** Mount `useSSE` in `App` (or the top-level authenticated wrapper), above the Shell and all screen components.

**Warning signs:** Offline banner flickers briefly on every screen switch; console shows repeated SSE connection logs.

### Pitfall 3: Missing QueryClientProvider

**What goes wrong:** `useQuery` or `useMutation` throw "No QueryClient set, use QueryClientProvider to set one."

**Why it happens:** The hook is called in a component that renders outside the `QueryClientProvider` tree (e.g., the auth guard branch in App that renders `LoginScreen`).

**How to avoid:** Confirmed — `main.jsx` already wraps `<App />` with `<QueryClientProvider client={queryClient}>`. `LoginScreen` is rendered inside `App` which is inside the provider. This pitfall is already avoided by the existing structure.

**Warning signs:** The error is thrown at runtime, not build time.

### Pitfall 4: TanStack Query v5 API Differences

**What goes wrong:** Using v4 patterns such as `useQuery(queryKey, queryFn, options)` (positional args) or `isLoading` instead of `isPending` for mutations.

**Why it happens:** TanStack Query v5 (installed at 5.99.2) changed the API — `useQuery` now takes a single options object; `useMutation.isLoading` was renamed to `isPending`.

**How to avoid:** Always use single-object form:
```javascript
// CORRECT (v5):
useQuery({ queryKey: ['orders'], queryFn: ... })
// WRONG (v4):
useQuery(['orders'], () => ..., { staleTime: 5000 })
```

**Warning signs:** TypeScript errors if using TS; runtime errors about unexpected argument shapes.

### Pitfall 5: Cache Key Collision Between Filtered and Unfiltered Queries

**What goes wrong:** `useSSE` writes to `['orders']` but `KitchenScreen` calls `useOrders('ACTIVE')` which uses key `['orders', 'ACTIVE']`. The SSE upsert never reaches the filtered cache — KDS does not update in real time.

**Why it happens:** TanStack Query treats `['orders']` and `['orders', 'ACTIVE']` as separate cache entries.

**How to avoid:** Two strategies, pick one:
1. `useSSE` writes to `['orders']` (unfiltered). Each screen calls `useOrders()` without a filter and filters client-side (preferred for Phase 3 — simpler).
2. `useSSE` also writes to `['orders', 'ACTIVE']` when the order has active status.

**Recommendation:** Strategy 1. Phase 3 scope is data foundation, not screen UX — client-side filtering is sufficient and avoids cache fragmentation. Status filtering in API queries is a Phase 4 optimization.

### Pitfall 6: Token Not Available When useSSE Mounts

**What goes wrong:** `useSSE` mounts before `cold start` completes, `token` is `null`, and the hook tries to connect with no auth — SSE endpoint returns 401.

**Why it happens:** `coldStartBusy` is true while `AuthProvider` reads the token from `preferences.json`. App renders the loading blank during this phase, so `useSSE` is not mounted. But if wired incorrectly, it could mount in the auth-guarded branch before `token` is set.

**How to avoid:** Mount `useSSE` only in the authenticated branch of App (same branch where `isAuthenticated` is true and `client` is non-null). The `if (!token)` early-return guard inside `useSSE` is the safety net.

**Warning signs:** SSE 401 errors in the console on cold start.

### Pitfall 7: SSE URL in Dev vs Production

**What goes wrong:** In production Tauri build, `useSSE` uses `/v1/sse/orders` (relative URL). But Vite proxy is not available in production — the relative URL has no host and fails.

**Why it happens:** Vite dev server proxies `/v1/*` to `https://api.restaurant.sitecare.ro`. Production Tauri webview has no proxy — relative URLs resolve to `tauri://localhost` which is not the API.

**How to avoid:** Same pattern as `auth.jsx`:
```javascript
const SSE_URL = import.meta.env.DEV
  ? '/v1/sse/orders'
  : 'https://api.restaurant.sitecare.ro/v1/sse/orders';
```

**Warning signs:** SSE connects fine in `npm run tauri dev` but fails silently in `tauri build`.

---

## Code Examples

### SDK: kitchen.orders.list call signature

```typescript
// Source: node_modules/@charlyk/admin-client/dist/index.d.ts line 2563
kitchen: {
  orders: {
    list: (data: ListOrdersData) => ReturnType<typeof listOrders>;
    // ...
  }
}

// ListOrdersData:
type ListOrdersData = {
  body?: never;
  path?: never;
  query?: {
    status?: string; // 'ACTIVE' | 'TODAY' | 'ALL' | 'NEW' | 'ACCEPTED' | 'PREPARING' | 'READY' | 'OUT_FOR_DELIVERY' | 'COMPLETED' | 'CANCELLED'
  };
  url: '/v1/orders';
};

// Usage:
const result = await client.kitchen.orders.list({ query: { status: 'ACTIVE' } });
// result.data = OrderListResponse = { orders: Order[] }
```

### SDK: Order type shape

```typescript
// Source: node_modules/@charlyk/admin-client/dist/index.d.ts lines 671-703
type Order = {
  id: string;
  dailyOrderNumber: number;
  orderDate: string;
  status: 'NEW' | 'ACCEPTED' | 'PREPARING' | 'READY' | 'OUT_FOR_DELIVERY' | 'COMPLETED' | 'CANCELLED';
  orderType: 'delivery' | 'pickup' | 'local';
  paymentType: 'cash' | 'card' | 'online';
  customerName: string;
  customerPhone: string;
  subtotal: number;
  total: number;
  notes: string | null;
  estimatedMinutes: number | null;
  currency: string;
  createdAt: string;
  updatedAt: string;
  items: Array<OrderItem>;
  events: Array<OrderEvent>;
  // ... delivery address fields
};
```

### SDK: kitchen.orders.updateStatus call signature

```typescript
// Source: node_modules/@charlyk/admin-client/dist/index.d.ts lines 629-646
type UpdateOrderStatusBody = {
  currentStatus: 'NEW' | 'ACCEPTED' | 'PREPARING' | 'READY' | 'OUT_FOR_DELIVERY' | 'COMPLETED' | 'CANCELLED';
  toStatus: 'NEW' | 'ACCEPTED' | 'PREPARING' | 'READY' | 'OUT_FOR_DELIVERY' | 'COMPLETED' | 'CANCELLED';
  reason?: string;
  estimatedMinutes?: number; // Only used when toStatus is ACCEPTED; range 1-480
};

// Usage:
const result = await client.kitchen.orders.updateStatus({
  path: { id: orderId },
  body: { currentStatus: 'NEW', toStatus: 'ACCEPTED', estimatedMinutes: 25 },
});
```

### SDK: AdminClient interface for kitchen (full)

```typescript
// Source: node_modules/@charlyk/admin-client/dist/index.d.ts lines 2560-2577
kitchen: {
  orders: {
    create: (data: CreateKitchenOrderData) => ReturnType<typeof createKitchenOrder>;
    list: (data: ListOrdersData) => ReturnType<typeof listOrders>;
    get: (data: GetOrderData) => ReturnType<typeof getOrder>;
    updateStatus: (data: UpdateOrderStatusData) => ReturnType<typeof updateOrderStatus>;
    updateEstimatedTime: (data: UpdateEstimatedTimeData) => ReturnType<typeof updateEstimatedTime>;
  };
  menu: {
    list: (data: ListKitchenMenuData) => ReturnType<typeof listKitchenMenu>;
  };
}
```

### SSE Server behavior (verified source)

```typescript
// Source: /Users/eduardalbu/Developer/sitecare-orders-api/src/routes/v1/sse/index.ts
// 1. Auth: requireRole("owner", "kitchen", "cashier", "courier") — Bearer token validated by Better Auth bearer() plugin
// 2. On connect: emits snapshot of listOrders(db, "ACTIVE") as order_new events
// 3. After snapshot: registers client for live events (prevents double-emit for orders created during snapshot)
// 4. Ping loop: every 30_000ms emits { event: "ping", data: "" }
// 5. On abort: unregisters client (memory leak prevention)
//
// Event format:
// event: order_new\ndata: <JSON.stringify(Order)>\n\n
// event: ping\ndata: \n\n
```

### i18n keys to add

```javascript
// Source: src/i18n.jsx — add to both ro and en objects
// 03-UI-SPEC.md Copywriting Contract

// ro:
offline_banner_title: 'Conexiune întreruptă',
offline_banner_sub: 'Reconectare automată în curs…',

// en:
offline_banner_title: 'Connection lost',
offline_banner_sub: 'Reconnecting automatically…',
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| useQuery(key, fn, options) positional args | useQuery({ queryKey, queryFn, ...options }) single object | TanStack Query v5 (2024) | All hook code must use v5 object form |
| useMutation.isLoading | useMutation.isPending | TanStack Query v5 | Loading state check changes |
| Native EventSource for SSE | @microsoft/fetch-event-source | Always — EventSource limitation | Required whenever SSE needs custom headers |

**Deprecated/outdated:**
- `onSuccess`/`onError` inside `useQuery` options: Deprecated in TanStack Query v5. Use `useEffect` watching `.data`/`.error` or mutation-level callbacks instead. For Phase 3, `onSuccess` in `useMutation` options is still supported.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | The Vite dev proxy (`/v1` → `https://api.restaurant.sitecare.ro`) also applies to SSE connections from fetchEventSource | Pattern 2 (useSSE), Pitfall 7 | If proxy doesn't forward SSE, dev testing would require direct URL — dev experience only, no prod impact |
| A2 | KitchenMenuResponse from `client.kitchen.menu.list()` returns `{ categories: Array<{...}>, globalProducts: Array<{...}> }` with detail sufficient for Phase 4 POS screen | Standard Stack | Phase 4 may discover menu data is too sparse; but Phase 3 only caches it, not renders it |

---

## Open Questions

1. **orderCount derivation scope**
   - What we know: `app.jsx` has a hardcoded stub `{ live: 0, new: 0, active: 0 }` passed to Shell. Phase 3 replaces this with live data from `useOrders()`.
   - What's unclear: Whether to call `useOrders()` in `app.jsx` (where the count is needed) or derive count from a cached value.
   - Recommendation: Call `useOrders()` in App directly. It's a read from cache with no extra network call if the cache is warm (Shell doesn't mount until after auth, and useSSE pre-populates the cache). This is the cleanest approach and avoids prop-drilling data down from Shell.

2. **Where to mount useSSE: App or Shell**
   - What we know: CONTEXT.md D-05 says "mounted once at Shell level". But Shell only renders when authenticated. App already has the auth guard logic.
   - What's unclear: Whether "Shell level" means in `shell.jsx` or "at the same component level as Shell" (i.e., App).
   - Recommendation: Mount in `App` (the authenticated branch), not inside `shell.jsx`. Rationale: `useSSE` needs `token` from `useAuth()` and `queryClient` — both available in App. Shell is a pure presentational component that receives `isOffline` as a prop. This cleaner separation avoids adding data-fetching concerns to Shell.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | npm install | ✓ | v24.9.0 [VERIFIED: node --version] | — |
| npm | Package install | ✓ | included with Node | — |
| @microsoft/fetch-event-source | useSSE hook | ✗ (not installed) | 2.0.1 available on npm [VERIFIED: npm view] | None — native EventSource cannot send auth headers |
| Vite dev proxy | Dev SSE testing | ✓ | Configured in vite.config.js for /v1/* | Direct URL with env var in production |
| SSE server (sitecare-orders-api) | Integration testing | ✓ | Running at https://api.restaurant.sitecare.ro [ASSUMED — based on Phase 2 success] | — |

**Missing dependencies with no fallback:**
- `@microsoft/fetch-event-source` — must be installed before `use-sse.js` can be written. Install command: `npm install @microsoft/fetch-event-source`

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | vitest 4.1.5 |
| Config file | vite.config.js (vitest reads it) — test config inline or via vitest.config.js |
| Quick run command | `npx vitest run src/__tests__/` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| KDS-01 | useSSE processes order_new event and upserts into query cache | unit | `npx vitest run src/__tests__/use-sse.test.js` | ❌ Wave 0 |
| KDS-01 | useSSE ignores ping events | unit | `npx vitest run src/__tests__/use-sse.test.js` | ❌ Wave 0 |
| KDS-01 | useSSE sets isConnected=true on open, false on error | unit | `npx vitest run src/__tests__/use-sse.test.js` | ❌ Wave 0 |
| OFF-01 | OfflineBanner renders when isOffline=true | unit | `npx vitest run src/__tests__/offline-banner.test.jsx` | ❌ Wave 0 |
| OFF-01 | OfflineBanner does not render when isOffline=false | unit | `npx vitest run src/__tests__/offline-banner.test.jsx` | ❌ Wave 0 |
| OFF-01 | i18n keys offline_banner_title and offline_banner_sub exist in ro and en | unit | `npx vitest run src/__tests__/i18n.test.js` | ✅ (extend existing) |
| OFF-02 | TanStack Query cache serves stale data when query function throws | unit | `npx vitest run src/__tests__/use-orders.test.js` | ❌ Wave 0 |
| OFF-03 | Mutating buttons have disabled attribute and .btn-disabled-offline class when isOffline=true | unit | `npx vitest run src/__tests__/offline-buttons.test.jsx` | ❌ Wave 0 |
| OFF-03 | Mutating buttons are interactive when isOffline=false | unit | `npx vitest run src/__tests__/offline-buttons.test.jsx` | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `npx vitest run src/__tests__/`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `src/__tests__/use-sse.test.js` — covers KDS-01 (mock fetchEventSource, verify cache upsert)
- [ ] `src/__tests__/offline-banner.test.jsx` — covers OFF-01 (render test with isOffline prop)
- [ ] `src/__tests__/use-orders.test.js` — covers OFF-02 (mock client, verify query behavior)
- [ ] `src/__tests__/offline-buttons.test.jsx` — covers OFF-03 (render screens with isOffline, check button disabled state)

Existing test infrastructure: `src/__tests__/setup.js`, `src/__tests__/i18n.test.js` (extend for new keys), `src/__tests__/store.test.js`. Vitest + @testing-library/react already installed.

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | Auth is handled by Phase 2 / AuthProvider |
| V3 Session Management | no | Token management is Phase 2 scope |
| V4 Access Control | no | Role check is server-side (requireRole middleware) |
| V5 Input Validation | yes | SSE event data from server: JSON.parse in try/catch; malformed events silently ignored |
| V6 Cryptography | no | No crypto operations in Phase 3 |

### Known Threat Patterns for SSE + Client-Side Cache

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Malformed SSE event data | Tampering | JSON.parse in try/catch; ignore events that don't parse |
| SSE open before auth completes | Spoofing | Guard: if (!token) return early in useSSE; SSE only mounted in authenticated branch |
| Token exposed in SSE URL as query param | Info Disclosure | Token is in Authorization header only (NOT in URL); @microsoft/fetch-event-source supports headers |

---

## Project Constraints (from CLAUDE.md)

| Directive | Impact on Phase 3 |
|-----------|-------------------|
| `@charlyk/admin-client` is the ONLY data layer | useOrders/useMenu/useOrderActions MUST use `client.kitchen.*` methods; no raw fetch calls to API except for SSE via fetchEventSource (SSE cannot use SDK's request method) |
| CSP must include API domain in connect-src | VERIFIED: `tauri.conf.json` already has `connect-src: https://api.restaurant.sitecare.ro` and `event-src: https://api.restaurant.sitecare.ro` — Phase 3 requires no CSP changes |
| EventSource cannot send auth headers — use @microsoft/fetch-event-source | Confirmed by server: Better Auth `bearer()` plugin is enabled; Authorization header is required; native EventSource is ruled out |
| window.* globals forbidden | All new hook files use ES module imports/exports; no window.* references |
| Rust side is thin | No Rust changes needed for Phase 3; data layer is purely JavaScript |
| State split: Zustand = UI state, TanStack Query = server state | isConnected lives in useSSE local React state (not Zustand); orders/menu live in TanStack Query cache (not Zustand) |
| SSE mounted once at Shell level | Mount in App (authenticated branch), pass isConnected down as prop; never in screen components |
| Screens call their own data hooks | OrdersScreen calls useOrders(), KitchenScreen calls useOrders(), etc. — no prop-drilling of data |

---

## Sources

### Primary (HIGH confidence)

- `node_modules/@charlyk/admin-client/dist/index.d.ts` — AdminClient interface, Order type, UpdateOrderStatusBody, ListOrdersData, KitchenMenuResponse, all SDK method signatures [VERIFIED: read directly]
- `/Users/eduardalbu/Developer/sitecare-orders-api/src/routes/v1/sse/index.ts` — SSE endpoint implementation: event shape, snapshot pattern, ping interval, auth middleware [VERIFIED: read directly]
- `/Users/eduardalbu/Developer/sitecare-orders-api/src/middleware/session.ts` — Better Auth session validation [VERIFIED: read directly]
- `/Users/eduardalbu/Developer/sitecare-orders-api/src/lib/auth.ts` — bearer() plugin confirmed enabled (line 64) [VERIFIED: read directly]
- `src/auth.jsx` — AuthProvider context value, token storage via tokenRef, createAdminClient pattern [VERIFIED: read directly]
- `src/shell.jsx` — Current Shell component signature and DOM structure [VERIFIED: read directly]
- `src/app.jsx` — Current App component, QueryClientProvider location, screen router stubs [VERIFIED: read directly]
- `src/main.jsx` — QueryClientProvider and queryClient already wired [VERIFIED: read directly]
- `src/icons.jsx` — `wifi` icon confirmed present at line 43 [VERIFIED: read directly]
- `.planning/phases/03-shell-data-foundation/03-UI-SPEC.md` — OfflineBanner exact CSS, dimensions, animation, color values [VERIFIED: read directly]
- `package.json` — All installed dependencies and versions [VERIFIED: read directly]
- `src-tauri/tauri.conf.json` — CSP configuration confirmed for connect-src and event-src [VERIFIED: read directly]

### Secondary (MEDIUM confidence)

- npm registry via `npm view @microsoft/fetch-event-source version` — version 2.0.1 confirmed [VERIFIED: shell command]
- npm list output — @tanstack/react-query@5.99.2, zustand@5.0.12 confirmed [VERIFIED: shell command]

### Tertiary (LOW confidence)

None — all critical claims were directly verified against source files.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages verified via npm list and package.json
- Architecture: HIGH — derived from existing source files and locked decisions in CONTEXT.md
- SSE implementation: HIGH — SSE server source read directly; Better Auth bearer() plugin confirmed
- SDK call signatures: HIGH — read directly from installed .d.ts
- Pitfalls: HIGH — derived from verified code patterns and TanStack Query v5 changelog

**Research date:** 2026-04-23
**Valid until:** 2026-05-23 (stable stack; @charlyk/admin-client is private and stable)
