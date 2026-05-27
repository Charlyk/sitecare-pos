# Phase 3: Shell + Data Foundation - Pattern Map

**Mapped:** 2026-04-23
**Files analyzed:** 11 new/modified files + 4 test files
**Analogs found:** 11 / 11 (all files have at least role-match analogs)

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `src/use-orders.js` | hook (query) | request-response | `src/auth.jsx` (client pattern) + RESEARCH.md Pattern 3 | role-match |
| `src/use-menu.js` | hook (query) | request-response | `src/auth.jsx` (client pattern) + RESEARCH.md Pattern 5 | role-match |
| `src/use-order-actions.js` | hook (mutation) | request-response | `src/auth.jsx` (client pattern) + RESEARCH.md Pattern 4 | role-match |
| `src/use-sse.js` | hook (effect) | event-driven | `src/auth.jsx` (useEffect + useRef + token) + RESEARCH.md Pattern 2 | role-match |
| `src/offline-banner.jsx` | component | — | `src/shell.jsx` (Icon + useT usage) | exact |
| `src/auth.jsx` (MODIFY) | provider | — | itself | exact |
| `src/app.jsx` (MODIFY) | root component | request-response | itself | exact |
| `src/shell.jsx` (MODIFY) | layout component | — | itself | exact |
| `src/i18n.jsx` (MODIFY) | config/data | — | itself | exact |
| `src/styles.css` (MODIFY) | config/styles | — | itself (`.btn-primary`, `.btn-secondary`) | exact |
| `src/screen-*.jsx` (MODIFY × 7) | component | request-response | `src/screen-orders.jsx`, `src/screen-kitchen.jsx` | exact |
| `src/__tests__/use-sse.test.js` | test | — | `src/__tests__/auth-schedule.test.js` | role-match |
| `src/__tests__/offline-banner.test.jsx` | test | — | `src/__tests__/auth.test.jsx` | exact |
| `src/__tests__/use-orders.test.js` | test | — | `src/__tests__/store.test.js` | role-match |
| `src/__tests__/offline-buttons.test.jsx` | test | — | `src/__tests__/app-guard.test.jsx` | exact |

---

## Pattern Assignments

### `src/use-orders.js` (hook, request-response)

**Analog:** `src/auth.jsx` for `useAuth()` import pattern; RESEARCH.md Pattern 3 for TanStack Query v5 shape.

**No existing useQuery hook exists in the codebase** — this is the first. All patterns come from the analog and RESEARCH.md.

**Imports pattern** — copy from `src/auth.jsx` lines 1-4:
```javascript
import { useQuery } from '@tanstack/react-query';
import { useAuth } from './auth.jsx';
```

**Client access pattern** — copy from `src/auth.jsx` line 42 and `src/app.jsx` line 40:
```javascript
// In auth.jsx: const [client, setClient] = useState(null);
// In app.jsx:  const { signIn, coldStartBusy, busy: authBusy, error: authError } = useAuth();
// useOrders pattern:
const { client } = useAuth();
```

**TanStack Query v5 single-object form** (from RESEARCH.md Pitfall 4 + Pattern 3):
```javascript
// CORRECT v5 form — single options object:
return useQuery({
  queryKey: status ? ['orders', status] : ['orders'],
  queryFn: async () => {
    const result = await client.kitchen.orders.list({
      query: status ? { status } : {},
    });
    // SDK responseStyle:'fields' — always unwrap .data (RESEARCH.md Pitfall 1)
    if (result.error) throw new Error(result.error.error ?? 'Failed to list orders');
    return result.data; // { orders: Order[] }
  },
  enabled: !!client,
  staleTime: 30_000,
});
```

**Guard pattern** (enabled: !!client) mirrors the auth guard in `src/app.jsx` line 64:
```javascript
// app.jsx line 64-67:
if (coldStartBusy) {
  return <div style={{ width: '100vw', height: '100vh', background: '#fff' }} />;
}
// Equivalent in hooks: enabled: !!client prevents query from running before auth
```

---

### `src/use-menu.js` (hook, request-response)

**Analog:** Same as `use-orders.js`. Identical structure, different endpoint, longer staleTime (D-14: 5 minutes).

**Imports and client access pattern:** Identical to `use-orders.js` above — copy verbatim, change import name.

**Core pattern diff from use-orders.js** (from RESEARCH.md Pattern 5):
```javascript
return useQuery({
  queryKey: ['menu'],
  queryFn: async () => {
    const result = await client.kitchen.menu.list({});
    if (result.error) throw new Error(result.error.error ?? 'Failed to list menu');
    return result.data; // { categories: [...], globalProducts: [...] }
  },
  enabled: !!client,
  staleTime: 5 * 60 * 1000, // D-14: 5 minutes — menus change infrequently
});
```

---

### `src/use-order-actions.js` (hook, request-response)

**Analog:** `src/auth.jsx` for client + error pattern; RESEARCH.md Pattern 4 for useMutation v5 shape.

**Imports pattern:**
```javascript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './auth.jsx';
```

**useMutation v5 pattern** (from RESEARCH.md Pattern 4 — note `isPending` not `isLoading`):
```javascript
export function useOrderActions() {
  const { client } = useAuth();
  const queryClient = useQueryClient();

  const updateStatus = useMutation({
    mutationFn: ({ id, currentStatus, toStatus, estimatedMinutes, reason }) =>
      client.kitchen.orders.updateStatus({
        path: { id },
        body: {
          currentStatus,
          toStatus,
          ...(estimatedMinutes ? { estimatedMinutes } : {}),
          ...(reason ? { reason } : {}),
        },
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

**Mutation loading state** — use `updateStatus.isPending` (v5), NOT `updateStatus.isLoading` (v4 — removed).

---

### `src/use-sse.js` (hook, event-driven)

**Analog:** `src/auth.jsx` for the async useEffect + AbortController + token + ref pattern.

**useEffect + cleanup pattern** — copy from `src/auth.jsx` lines 103-124:
```javascript
// auth.jsx lines 103-124: async useEffect with try/finally, cleanup return
useEffect(() => {
  (async () => {
    try {
      const token = await readToken();
      // ... setup ...
    } catch (e) {
      // ... handle ...
    } finally {
      setColdStartBusy(false);
    }
  })();

  return () => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
  };
}, []); // empty deps
```

**Ref pattern for mutable value** — copy from `src/auth.jsx` line 47:
```javascript
// auth.jsx line 47:
const tokenRef = useRef(null); // tracks current session token
// useSSE equivalent:
const abortRef = useRef(null);
```

**Token guard pattern** — mirrors the `if (!token)` early return in cold-start:
```javascript
// Derived from auth.jsx cold-start: if (!token) return;
if (!token) {
  setIsConnected(false);
  return;
}
```

**Dev vs production URL pattern** — copy from `src/auth.jsx` lines 7-8:
```javascript
// auth.jsx lines 7-8:
const BASE_URL = import.meta.env.DEV ? '' : 'https://api.restaurant.sitecare.ro';
// useSSE equivalent (RESEARCH.md Pitfall 7):
const SSE_URL = import.meta.env.DEV
  ? '/v1/sse/orders'
  : 'https://api.restaurant.sitecare.ro/v1/sse/orders';
```

**Full core pattern** (from RESEARCH.md Pattern 2):
```javascript
import { useEffect, useRef, useState } from 'react';
import { fetchEventSource } from '@microsoft/fetch-event-source';
import { useQueryClient } from '@tanstack/react-query';

const SSE_URL = import.meta.env.DEV
  ? '/v1/sse/orders'
  : 'https://api.restaurant.sitecare.ro/v1/sse/orders';

export function useSSE(token) {
  const queryClient = useQueryClient();
  const [isConnected, setIsConnected] = useState(false);
  const abortRef = useRef(null);

  useEffect(() => {
    if (!token) { setIsConnected(false); return; }

    const ctrl = new AbortController();
    abortRef.current = ctrl;

    fetchEventSource(SSE_URL, {
      headers: { Authorization: `Bearer ${token}` },
      signal: ctrl.signal,
      onopen(response) {
        if (response.ok) setIsConnected(true);
      },
      onmessage(msg) {
        if (msg.event === 'ping') return; // D-04: no-op keepalive
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
      onerror() { setIsConnected(false); },
      onclose() { setIsConnected(false); },
    });

    return () => ctrl.abort();
  }, [token, queryClient]);

  return { isConnected };
}
```

**Cache upsert strategy** — use `setQueryData` (not `invalidateQueries`) inside onmessage. `invalidateQueries` triggers a full network refetch on every SSE event — wrong (RESEARCH.md Anti-Patterns).

---

### `src/offline-banner.jsx` (component)

**Analog:** `src/shell.jsx` for Icon + useT import/usage pattern (lines 1-6).

**Imports pattern** — copy from `src/shell.jsx` lines 1-3:
```javascript
// shell.jsx lines 1-3:
import { useState, useEffect } from 'react';
import { Icon } from './icons.jsx';
import { useT } from './i18n.jsx';
// offline-banner.jsx (no useState needed):
import { Icon } from './icons.jsx';
import { useT } from './i18n.jsx';
```

**useT usage pattern** — copy from `src/shell.jsx` line 6:
```javascript
// shell.jsx line 6:
const t = useT(lang);
```

**Icon usage pattern** — copy from `src/shell.jsx` line 69:
```javascript
// shell.jsx line 69:
<Icon name={item.icon} size={sidebarCollapsed ? 19 : 17} />
// offline-banner.jsx:
<Icon name="wifi" size={16} />  // 'wifi' icon confirmed at icons.jsx line 43
```

**Full component** (from RESEARCH.md Pattern 6):
```jsx
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

---

### `src/auth.jsx` — MODIFY: expose `token` from context

**Modification scope:** Add `token` state variable, set it wherever `tokenRef.current` is set, include it in context value.

**Where to add `token` state** — mirror `client` state at line 42:
```javascript
// auth.jsx line 42 (existing):
const [client, setClient] = useState(null);
// Add immediately after:
const [token, setToken] = useState(null);
```

**Where to call `setToken`** — wherever `tokenRef.current = ...` is assigned:

1. Cold-start (line 109): `tokenRef.current = token;` → also `setToken(token);`
2. signIn (line 135-136): `tokenRef.current = token;` → also `setToken(token);`
3. doRefresh (line 67): `tokenRef.current = session.token;` → also `setToken(session.token);`
4. signOut (line 170): `tokenRef.current = null;` → also `setToken(null);`
5. expireSession (called from doRefresh catch) — `setToken(null)` in `expireSession()` at line 80.

**Context value modification** — `src/auth.jsx` line 179 (current):
```javascript
// auth.jsx line 179 (CURRENT):
<AuthContext.Provider value={{ signIn, signOut, client, coldStartBusy, busy: signingIn, error, setError }}>
// MODIFIED — add token:
<AuthContext.Provider value={{ signIn, signOut, client, token, coldStartBusy, busy: signingIn, error, setError }}>
```

**useAuth return shape** — line 185-188 needs no changes; callers destructure what they need:
```javascript
// app.jsx will use:
const { client, token } = useAuth(); // token is new
```

---

### `src/app.jsx` — MODIFY: mount useSSE, derive isOffline, wire to Shell

**Where to add useSSE** — inside the authenticated branch (after line 86 `if (!isAuthenticated)` block), before the return statement at line 88.

**Import to add** (line 1 area):
```javascript
import { useSSE } from './use-sse.js';
import { useOrders } from './use-orders.js';
```

**Token from useAuth** — modify line 40:
```javascript
// CURRENT line 40:
const { signIn, coldStartBusy, busy: authBusy, error: authError } = useAuth();
// MODIFIED:
const { signIn, coldStartBusy, busy: authBusy, error: authError, token } = useAuth();
```

**useSSE call and isOffline** — replace the stub `orderCount` at line 61 and add SSE:
```javascript
// CURRENT line 61:
const orderCount = { live: 0, new: 0, active: 0 };

// REPLACE WITH (inside authenticated branch, hooks must not be conditional):
// Note: hooks must be called at top level; the conditional guard at line 64/69
// stays but useSSE + useOrders must be called unconditionally at function top.
// Solution: call useSSE always; the token guard inside useSSE handles null token.
const { isConnected } = useSSE(token);
const isOffline = !isConnected;
const { data: ordersData } = useOrders();
const orders = ordersData?.orders ?? [];
const orderCount = {
  live: orders.filter(o => !['COMPLETED','CANCELLED'].includes(o.status)).length,
  new: orders.filter(o => o.status === 'NEW').length,
  active: orders.filter(o => ['ACCEPTED','PREPARING'].includes(o.status)).length,
};
```

**Shell invocation** — add `isOffline` prop at line 90-93:
```jsx
// CURRENT lines 90-93:
<Shell lang={lang} setLang={setLang} role={role} setRole={setRole}
       screen={screen} setScreen={setScreen} accent={accent} density={density}
       orderCount={orderCount} sidebarCollapsed={sidebarCollapsed}
       setSidebarCollapsed={setSidebarCollapsed}>
// MODIFIED — add isOffline:
<Shell lang={lang} setLang={setLang} role={role} setRole={setRole}
       screen={screen} setScreen={setScreen} accent={accent} density={density}
       orderCount={orderCount} sidebarCollapsed={sidebarCollapsed}
       setSidebarCollapsed={setSidebarCollapsed} isOffline={isOffline}>
```

**Screen stubs** — add `isOffline={isOffline}` to every screen at lines 95-101:
```jsx
// CURRENT line 95 example:
{screen === 'orders' && <OrdersScreen orders={[]} lang={lang} onOpen={openOrder} onAdvance={() => {}} onPrint={() => {}} />}
// MODIFIED:
{screen === 'orders' && <OrdersScreen orders={[]} lang={lang} onOpen={openOrder} onAdvance={() => {}} onPrint={() => {}} isOffline={isOffline} />}
```

---

### `src/shell.jsx` — MODIFY: accept isOffline, render OfflineBanner

**Analog:** itself — modify existing signature at line 5 and content div at line 154.

**Signature change** — `src/shell.jsx` line 5:
```javascript
// CURRENT line 5:
function Shell({ lang, setLang, role, setRole, screen, setScreen, accent, density, children, orderCount, sidebarCollapsed, setSidebarCollapsed }) {
// MODIFIED — add isOffline:
function Shell({ lang, setLang, role, setRole, screen, setScreen, accent, density, children, orderCount, sidebarCollapsed, setSidebarCollapsed, isOffline }) {
```

**Import to add** at top of file:
```javascript
import { OfflineBanner } from './offline-banner.jsx';
```

**Content div** — `src/shell.jsx` lines 154-156:
```jsx
// CURRENT lines 154-156:
<div className={`content ${density === 'dense' ? 'density-compact' : ''}`}>
  {children}
</div>
// MODIFIED — add banner above children:
<div className={`content ${density === 'dense' ? 'density-compact' : ''}`}>
  {isOffline && <OfflineBanner lang={lang} />}
  {children}
</div>
```

---

### `src/i18n.jsx` — MODIFY: add offline_banner keys

**Analog:** itself — follow existing key-value pattern at lines 3-136.

**Entry format pattern** — copy from `src/i18n.jsx` lines 5-6 (adjacent keys):
```javascript
// Existing pattern (i18n.jsx lines 73-74):
empty_orders: 'Nicio comandă aici încă',
empty_orders_sub: 'Comenzile noi vor apărea aici în timp real.',
```

**Keys to add to `ro` object** (insert after existing entries, before closing `},`):
```javascript
offline_banner_title: 'Conexiune întreruptă',
offline_banner_sub: 'Reconectare automată în curs…',
```

**Keys to add to `en` object** (same position in en block):
```javascript
offline_banner_title: 'Connection lost',
offline_banner_sub: 'Reconnecting automatically…',
```

**Symmetry rule** — the existing `i18n.test.js` pattern (lines 6-13) checks that all `login_` keys exist in both languages. The new test for Phase 3 should follow the same assertion shape for `offline_` keys.

---

### `src/styles.css` — MODIFY: add .offline-banner and .btn-disabled-offline

**Analog:** existing `.btn-primary` / `.btn-secondary` at lines 126-156.

**CSS property conventions** — copy from `src/styles.css` lines 126-134:
```css
/* Existing btn-primary (lines 126-134) — observe: flex, inline-flex, gap, border-radius:10px, transition */
.btn-primary {
  height: 38px; padding: 0 18px; border-radius: 10px; border: 0;
  background: var(--sc-primary); color: #fff; font-weight: 700; font-size: 13px;
  display: inline-flex; align-items: center; gap: 8px; cursor: pointer;
  box-sizing: border-box;
  font-family: inherit;
  transition: background 150ms;
}
```

**Classes to add** (from RESEARCH.md Pattern 6 CSS block + UI-SPEC dimensions):
```css
/* Append after existing button classes */
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

**Where to insert in styles.css** — after the `.btn-ghost` / `.btn-terracotta` block (after line 156), before `.role-pill` section.

---

### `src/screen-*.jsx` — MODIFY × 7: accept isOffline, disable mutating buttons

**Analog:** `src/screen-orders.jsx` lines 96-112 (button rendering pattern) and `src/screen-kitchen.jsx` lines 7 (function signature).

**Screens requiring mutation-blocking** (have Accept/Advance/Cancel/Create buttons):
- `screen-orders.jsx` — Accept, Advance, Print buttons on OrderCard
- `screen-kitchen.jsx` — Advance buttons on KitchenTicket
- `screen-pos.jsx` — Create Order / Ring Up button
- `screen-detail.jsx` — Advance, Cancel buttons

**Screens that are read-only** (no mutation-blocking needed per D-11):
- `screen-menu.jsx` — browse only
- `screen-settings.jsx` — local settings only
- `screen-printer.jsx` — test print is a local action (no server mutation)

**Signature change pattern** — copy from `src/screen-kitchen.jsx` line 7:
```javascript
// CURRENT (screen-kitchen.jsx line 7):
function KitchenScreen({ orders, lang, onAdvance }) {
// MODIFIED:
function KitchenScreen({ orders, lang, onAdvance, isOffline }) {
```

**Button disabling pattern** — copy from existing btn-primary usage at `src/screen-orders.jsx` lines 104-106:
```jsx
// CURRENT (screen-orders.jsx lines 104-106):
{nextAction && (
  <button className="btn-primary" style={{ height: 34, fontSize: 12, padding: '0 14px' }}
          onClick={() => onAdvance(order, nextAction.next)}>
    {nextAction.label}
  </button>
)}
// MODIFIED — add disabled + class:
{nextAction && (
  <button
    className={`btn-primary${isOffline ? ' btn-disabled-offline' : ''}`}
    style={{ height: 34, fontSize: 12, padding: '0 14px' }}
    disabled={isOffline}
    onClick={() => onAdvance(order, nextAction.next)}
  >
    {nextAction.label}
  </button>
)}
```

**The `disabled` attribute** + `.btn-disabled-offline` class together cover both native browser accessibility and the visual greyed-out state (D-12).

**Export pattern** — all screen files export named functions (e.g., `export { OrdersScreen }` at end of file or `export function`). Keep the same export style.

---

## Test File Patterns

### `src/__tests__/use-sse.test.js` (new)

**Analog:** `src/__tests__/auth-schedule.test.js` for mock setup + vi.useFakeTimers pattern; `src/__tests__/app-guard.test.jsx` for vi.mock block structure.

**Mock header pattern** — copy from `src/__tests__/auth-schedule.test.js` lines 1-10:
```javascript
vi.mock('@tauri-apps/plugin-store', () => ({ load: vi.fn() }))
vi.mock('@charlyk/admin-client', () => ({ signIn: vi.fn(), createAdminClient: vi.fn() }))
// useSSE needs:
vi.mock('@microsoft/fetch-event-source', () => ({
  fetchEventSource: vi.fn(),
}))
```

**describe/test structure pattern** — copy from `src/__tests__/auth-schedule.test.js` lines 38-66:
```javascript
describe('U[N] — useSSE [behavior] (KDS-01)', () => {
  beforeEach(() => { vi.useFakeTimers() })
  afterEach(() => { vi.useRealTimers(); vi.clearAllMocks() })

  test('[specific behavior]', () => {
    // Arrange
    // Act
    // Assert
  })
})
```

**Cache upsert test approach** — use `@tanstack/react-query`'s `QueryClient` directly (not via hook), pass it through a `QueryClientProvider` wrapper, call the mocked `onmessage` callback, then read from `queryClient.getQueryData(['orders'])`.

---

### `src/__tests__/offline-banner.test.jsx` (new)

**Analog:** `src/__tests__/auth.test.jsx` for render + screen query pattern.

**Test structure pattern** — copy from `src/__tests__/auth.test.jsx` lines 10-12 and 17-38:
```javascript
import { render, screen } from '@testing-library/react'
import { OfflineBanner } from '../offline-banner.jsx'
import { I18N } from '../i18n.jsx'

describe('U[N] — OfflineBanner renders connection lost state (OFF-01)', () => {
  test('renders banner text when isOffline is true', () => {
    render(<OfflineBanner lang="en" />)
    expect(screen.getByText(I18N.en.offline_banner_title)).toBeInTheDocument()
  })
})
```

**Note:** `OfflineBanner` is always rendered by Shell only when `isOffline=true` — the component itself has no conditional rendering. Tests verify it renders the correct i18n text.

---

### `src/__tests__/use-orders.test.js` (new)

**Analog:** `src/__tests__/store.test.js` for module mock + direct state inspection pattern.

**Mock header** — copy from `src/__tests__/app-guard.test.jsx` lines 5-20 for vi.mock structure:
```javascript
vi.mock('@tauri-apps/plugin-store', () => ({
  load: vi.fn().mockResolvedValue({
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(undefined),
  }),
}))
vi.mock('@charlyk/admin-client', () => ({ signIn: vi.fn(), createAdminClient: vi.fn() }))
vi.mock('../auth.jsx', () => ({
  useAuth: vi.fn().mockReturnValue({ client: mockClient }),
}))
```

**renderHook pattern** — use `@testing-library/react`'s `renderHook` with a `QueryClientProvider` wrapper:
```javascript
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

function wrapper({ children }) {
  return <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>
}
const { result } = renderHook(() => useOrders(), { wrapper })
await waitFor(() => expect(result.current.data).toBeDefined())
```

---

### `src/__tests__/offline-buttons.test.jsx` (new)

**Analog:** `src/__tests__/auth.test.jsx` for component render + DOM query; `src/__tests__/app-guard.test.jsx` for vi.mock + useAuth mock pattern.

**Key assertion pattern** — copy from `src/__tests__/auth.test.jsx` lines 51-54:
```javascript
// auth.test.jsx lines 51-54 (DOM class query):
const errFields = document.querySelectorAll('.field-input.err')
expect(errFields.length).toBe(2)

// offline-buttons.test.jsx equivalent:
const disabledButtons = document.querySelectorAll('.btn-disabled-offline')
expect(disabledButtons.length).toBeGreaterThan(0)
// AND check the disabled attribute:
disabledButtons.forEach(btn => {
  expect(btn).toBeDisabled()
})
```

---

## Shared Patterns

### Client Access (from useAuth)
**Source:** `src/auth.jsx` line 179, `src/app.jsx` line 40
**Apply to:** `use-orders.js`, `use-menu.js`, `use-order-actions.js`
```javascript
const { client } = useAuth();
// New for useSSE and app.jsx:
const { client, token } = useAuth();
```

### Dev/Prod URL Pattern
**Source:** `src/auth.jsx` lines 7-8
**Apply to:** `use-sse.js`
```javascript
const BASE_URL = import.meta.env.DEV ? '' : 'https://api.restaurant.sitecare.ro';
```

### Icon + useT Import
**Source:** `src/shell.jsx` lines 1-6
**Apply to:** `offline-banner.jsx`
```javascript
import { Icon } from './icons.jsx';
import { useT } from './i18n.jsx';
// usage:
const t = useT(lang);
<Icon name="wifi" size={16} />  // wifi confirmed at icons.jsx line 43
```

### Vitest Mock Block for Tauri Modules
**Source:** `src/__tests__/app-guard.test.jsx` lines 5-14
**Apply to:** All new test files that touch auth or tauri modules
```javascript
vi.mock('@tauri-apps/plugin-store', () => ({ load: vi.fn() }))
vi.mock('@charlyk/admin-client', () => ({ signIn: vi.fn(), createAdminClient: vi.fn() }))
vi.mock('@tauri-apps/plugin-opener', () => ({ open: vi.fn(), openUrl: vi.fn() }))
vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }))
```

### i18n Key Symmetry Test Pattern
**Source:** `src/__tests__/i18n.test.js` lines 6-13
**Apply to:** Extended i18n.test.js for Phase 3 offline keys
```javascript
const roKeys = Object.keys(I18N.ro).filter((k) => k.startsWith('offline_'))
const missingInEn = roKeys.filter((k) => !Object.keys(I18N.en).includes(k))
expect(missingInEn).toEqual([])
```

---

## No Analog Found

All files have analogs or direct self-modification. The only net-new concept is the `useMutation` / `useQuery` pattern from TanStack Query — no existing hook files exist in the codebase. RESEARCH.md Patterns 2-5 serve as the canonical source for those, verified against the installed SDK types and the SSE server source.

| File | Role | Data Flow | Reason |
|---|---|---|---|
| `src/use-sse.js` | hook | event-driven | No event-driven hooks exist yet; RESEARCH.md Pattern 2 + auth.jsx useEffect structure are the combined analog |
| `src/use-orders.js` | hook | request-response | No useQuery hooks exist yet; RESEARCH.md Pattern 3 is the canonical source |
| `src/use-menu.js` | hook | request-response | Same as above |
| `src/use-order-actions.js` | hook | mutation | No useMutation hooks exist yet; RESEARCH.md Pattern 4 is the canonical source |

---

## Critical Implementation Notes

1. **Hook call ordering in app.jsx** — `useSSE`, `useOrders`, `useAuth` are React hooks and MUST be called unconditionally at function top level. The `if (coldStartBusy)` and `if (!isAuthenticated)` guards must come AFTER all hook calls. The `if (!token)` guard inside `useSSE` handles the null-token case safely.

2. **SDK response unwrapping** — `client.kitchen.orders.list()` returns `{ data, error, response }`. Always check `result.error` and return `result.data` — never use the result directly as the data shape.

3. **Cache key canonical root** — `['orders']` is the single root key. Both `useSSE`'s `setQueryData` and `useOrderActions`'s `invalidateQueries` use `['orders']` as the root. `invalidateQueries({ queryKey: ['orders'] })` invalidates all subtrees including `['orders', status]`.

4. **QueryClientProvider** — already wired in `src/main.jsx` (lines 3, 8, 11). No changes needed to main.jsx.

5. **@microsoft/fetch-event-source** — must be installed (`npm install @microsoft/fetch-event-source`) before `use-sse.js` can be written. This is the only missing dependency.

---

## Metadata

**Analog search scope:** `src/` directory — all `.jsx` and `.js` source files and `src/__tests__/` directory
**Files scanned:** auth.jsx, app.jsx, shell.jsx, i18n.jsx, styles.css, screen-orders.jsx, screen-kitchen.jsx, screen-pos.jsx, main.jsx, icons.jsx, __tests__/setup.js, __tests__/i18n.test.js, __tests__/auth.test.jsx, __tests__/auth-schedule.test.js, __tests__/app-guard.test.jsx, __tests__/store.test.js
**Pattern extraction date:** 2026-04-23
