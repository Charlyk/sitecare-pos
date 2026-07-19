# Phase 7: History Screen Foundation - Pattern Map

**Mapped:** 2026-07-17
**Files analyzed:** 8 (3 new, 5 modified)
**Analogs found:** 8 / 8

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `src/history-utils.js` (NEW) | utility | transform | none — no existing pure-derivation module | no analog (see below) |
| `src/use-history-orders.js` (NEW) | hook | CRUD (read) / request-response | `src/use-orders.js` | exact |
| `src/screen-history.jsx` (NEW) | component (screen) | request-response + CRUD (read) | `src/screen-orders.jsx` | exact |
| `src/screen-detail.jsx` (MODIFIED — add `readOnly` prop) | component (screen) | request-response | itself (existing file, extend in place) | exact (self) |
| `src/data.jsx` (MODIFIED — `normalizeOrder()` fallback) | utility | transform | itself (existing file, extend in place) | exact (self) |
| `src/store.js` (MODIFIED — screen enum + `historyOrder`/`openHistoryOrder`) | store | event-driven | itself (existing file, extend in place) | exact (self) |
| `src/shell.jsx` (MODIFIED — nav item + screenTitles) | component (nav) | request-response | itself (existing file, extend in place) | exact (self) |
| `src/app.jsx` (MODIFIED — screen router branches) | route | request-response | itself (existing file, extend in place) | exact (self) |
| `src/__tests__/history-utils.test.js` (NEW) | test | transform | no direct analog — nearest is any pure-fn test file (none exists yet); use `src/__tests__/use-orders.test.js`'s mock/describe conventions for structure only | partial |
| `src/__tests__/use-history-orders.test.js` (NEW) | test | CRUD (read) | `src/__tests__/use-orders.test.js` | exact |
| `src/__tests__/screen-history.test.jsx` (NEW) | test | request-response | `src/__tests__/screen-orders.test.jsx` | exact |

## Pattern Assignments

### `src/use-history-orders.js` (hook, request-response)

**Analog:** `src/use-orders.js` (full file, 25 lines — read in full, no re-read needed)

**Full pattern to mirror:**
```javascript
// src/use-orders.js
import { useQuery } from '@tanstack/react-query';
import { useAuth } from './auth.jsx';
import { normalizeOrder } from './data.jsx';

export function useOrders(status) {
  const { client } = useAuth();

  return useQuery({
    queryKey: status ? ['orders', status] : ['orders'],
    queryFn: async () => {
      const result = await client.kitchen.orders.list({
        query: status ? { status } : {},
      });
      if (result.error) throw new Error(result.error.error ?? 'Failed to list orders');
      const { orders, ...rest } = result.data;
      return { ...rest, orders: orders.map(normalizeOrder) };
    },
    enabled: !!client,
    staleTime: 30_000, // 30s — SSE keeps cache fresh; polling is fallback only
  });
}
```

**What to change for `useHistoryOrders`:**
- Call `client.admin.orders.list({ query: { from, to } })` — NOT `client.kitchen.orders.list` (different endpoint/shape, see RESEARCH.md Anti-Patterns).
- Query key MUST be a distinct root: `['history-orders', from, to]` — never `['orders', ...]` (SSE writes directly into `['orders']` via `use-sse.js`; a shared root would corrupt History's admin-shaped data — RESEARCH.md Pitfall 4).
- `from`/`to` must come from a **stable** value computed once (`useState(() => getLast30DaysRange())`), not recomputed inline every render, or the queryKey changes every render and defeats caching (RESEARCH.md Anti-Patterns, 3rd bullet).
- Same `if (result.error) throw new Error(...)` / unwrap `result.data` shape — this SDK convention is non-negotiable across every hook in the codebase.
- `enabled: !!client` and `staleTime: 30_000` — keep both.
- Still run `.map(normalizeOrder)` over the result — reuse the shared normalizer (see `data.jsx` pattern below), do not write a second normalization path.

### `src/history-utils.js` (utility, transform) — NO ANALOG, build fresh per RESEARCH.md Code Examples

No existing file in the codebase is a pure (no-React, no-SDK) derivation module — every existing "logic" file is either a hook or a component. RESEARCH.md already supplies the exact implementation contract (`getLast30DaysRange`, `filterFinishedOrders`, `deriveDisplayStatus`, `groupOrdersByDay`, `computeSummary`) — use those code blocks verbatim as the starting point; they are pre-verified against the SDK types and CONTEXT.md's D-01/D-02/D-04/D-10/D-11/D-12. Structural convention to still follow from the rest of the codebase: **named exports, no default export** (matches `data.jsx`, `use-orders.js`).

### `src/screen-history.jsx` (component, request-response)

**Analog:** `src/screen-orders.jsx` (full file, 310 lines — read in full)

**Imports pattern** (lines 1-5):
```javascript
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Icon } from './icons.jsx';
import { useT } from './i18n.jsx';
import { formatRON, elapsedMinutes, orderTimeLabel, formatDuration } from './data.jsx';
```
For `screen-history.jsx`, additionally import `typeMeta` from `./screen-orders.jsx` (D-06 column 3 reuses it verbatim per UI-SPEC) and the new `history-utils.js` functions.

**Screen-calls-its-own-hook pattern** — `OrdersScreen` receives `orders` as a prop from `App()` today (line 162: `function OrdersScreen({ orders, lang, onOpen, ... })`), but RESEARCH.md's Architecture Diagram is explicit that `HistoryScreen` should call `useHistoryOrders()` itself rather than being prop-drilled — follow the stated convention ("every screen calls its own data hook"), not this one legacy prop-drilled example. `app.jsx`'s router call for History should therefore be:
```javascript
{screen === 'history' && <HistoryScreen lang={lang} onOpenOrder={openHistoryOrder} isOffline={isOffline} />}
```
(per RESEARCH.md Code Examples, "Store + router wiring" block) — `HistoryScreen` calls `useHistoryOrders()` internally, unlike `OrdersScreen`.

**Local `typeMeta`-style lookup-map pattern** (lines 7-33, `sourceMeta`/`typeMeta`/`stateMeta`):
```javascript
function typeMeta(type, t) {
  const map = {
    delivery: { icon: 'moped', label: t('delivery') },
    pickup: { icon: 'bag', label: t('pickup') },
    dinein: { icon: 'utensils', label: t('dinein') },
  };
  return map[type] || map.dinein;
}
```
Import and reuse this exact function from `screen-orders.jsx` (already exported at line 310: `export { OrdersScreen, sourceMeta, typeMeta, stateMeta };`) for the Type column — do not re-derive. For the Status column, write a small local `historyStatusMeta(displayStatus, t)` map (`completed` → `chip-sage`, `canceled` → `chip-red`, `refunded` → `chip-amber`) — no existing analog has a 3-way finished-status map (existing `stateMeta` is a 6-way live-order-state map); D-02's precedence is handled upstream in `history-utils.js`'s `deriveDisplayStatus()`, this map only picks the chip class.

**Filter-bar-with-local-state pattern** (lines 165-181, 224-283) — `useState('all')` for filter, `useState('')` for search, rendered as pill groups. For Phase 7's inert filter bar (D-14), mirror the exact JSX shape of the pill/search-input markup but strip the `onClick`/`onChange` handlers and add `opacity: 0.5` + `disabled`/`pointer-events: none`, per UI-SPEC's Filter Bar Contract. Do not invent new pill/search markup — copy this structure verbatim and disable it.

**Stats-strip pattern** (lines 197-221) — 4-tile `grid-template-columns: repeat(4, 1fr)` card grid with 44×44 icon tile + label/value stack:
```javascript
<div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
  {stats.map((s, i) => (
    <div key={i} className="card" style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ width: 44, height: 44, borderRadius: 12, background: /* tint */, color: /* tint */, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={s.icon} size={18} />
      </div>
      <div>
        <div style={{ fontSize: 11, color: 'var(--sc-muted-foreground)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.label}</div>
        <div style={{ fontWeight: 900, fontSize: 22, letterSpacing: '-0.02em' }}>{s.value}</div>
      </div>
    </div>
  ))}
</div>
```
This is the exact shape for the D-15 summary strip — feed it `computeSummary()`'s output instead of `apiStats`. UI-SPEC.md's Summary Strip Contract specifies 20px value size (not 22px — a Phase 7-specific typography value, see UI-SPEC Typography table) and specific tile tints (sage/sage/slate/terracotta) — apply those deltas on top of this copied structure.

**Empty-state pattern** (lines 290-304):
```javascript
{visible.length === 0 && (
  <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: 48, color: 'var(--sc-muted-foreground)' }}>
    <div style={{ fontSize: 15, fontWeight: 600 }}>{t('empty_orders')}</div>
    <div style={{ fontSize: 13, marginTop: 4 }}>{t('empty_orders_sub')}</div>
  </div>
)}
```
Copy this exact two-line centered structure for History's `h_empty`/`h_empty_sub` (D-13) — same font sizes/weights, per UI-SPEC's Empty State Contract.

**Card wrapper convention:** `className="content-pad"` wraps the whole screen body (line 207) — reuse for `HistoryScreen`'s outer container.

### `src/screen-detail.jsx` (MODIFIED — add `readOnly` prop, D-09)

**Analog:** the file itself (342 lines, read in full — this is a same-file extension, not a cross-file port).

**Region-by-region `readOnly` gating** — UI-SPEC.md's "Detail Route Contract" table is the authoritative spec; the concrete line anchors in the current file are:
- Back button + label (lines 40-42): keep the `onBack` prop mechanism as-is; make the label prop-driven or `readOnly`-ternary'd (new key `h_back_to_history`).
- Timeline block (lines 28-34, 58-75): wrap in `{!readOnly && (...)}`.
- "Call customer" button (lines 97-101): wrap in `{!readOnly && order.customer.phone && (...)}`.
- Notes card (lines 104-116): wrap in `{!readOnly && (...)}` — hide entirely per UI-SPEC (do not render a permanent "no notes" placeholder for history).
- Items card + thermal-ticket right rail (lines 118-249, and the outer grid at line 37 `gridTemplateColumns: '1fr 380px'`): guard on `order.items != null` or `!readOnly`; when hidden, collapse the outer grid to `'1fr'` and render UI-SPEC's "minimal totals card" in that slot instead (new markup — no direct analog, but reuse the existing chip classes and the `fontWeight: 900, fontSize: 26` total-figure style already used at line 179).
- Advance button (lines 217-230) and Cancel button (lines 232-247): wrap both in `{!readOnly && (...)}` — hide unconditionally.
- Print buttons (lines 208-214): wrap in `{!readOnly && (...)}`.

**Existing `onBack`/prop-based caller-customization pattern already in place** — the component already takes `onBack`, `onAdvance`, `onPrint`, `onCancel` as caller-supplied callbacks (line 7 signature). Add `readOnly = false` to that same destructured prop list; do not invent a new mechanism.

### `src/data.jsx` (MODIFIED — `normalizeOrder()` fallback, Pitfall 2)

**Analog:** the file itself, line 220.

**Exact change** (RESEARCH.md Code Examples, verified against `node_modules/@charlyk/admin-client/dist/index.d.ts:267`):
```javascript
// BEFORE (line 220):
dailyOrderNumber: o.dailyOrderNumber ?? o.id,
// AFTER:
dailyOrderNumber: o.dailyOrderNumber ?? o.dailyNumber ?? o.id,
```
This is the single normalization point used by every hook in the codebase (`use-orders.js` line 20, and the new `use-history-orders.js`) — extend here, do not duplicate the divide-by-100/fallback logic elsewhere. `formatRON` (line 175), `orderTimeLabel` (line 183-186), and the `cRON` convention inside `normalizeOrder` (line 196) are all reused as-is by History with zero changes.

### `src/store.js` (MODIFIED — screen enum + `historyOrder`/`openHistoryOrder`, Pitfall 1)

**Analog:** the file itself (95 lines, read in full).

**Existing `openOrder`/`'detail'` pair to mirror, NOT overload** (lines 53, 72):
```javascript
selectedOrder: null,     // Set by openOrder(); consumed by screen-detail
...
openOrder: (order) => set({ selectedOrder: order, screen: 'detail' }),
```

**New additions, following the exact same shape:**
```javascript
// screen: 'orders' comment (line 45) — extend enum documentation:
screen: 'orders',   // Valid: 'orders'|'kitchen'|'pos'|'detail'|'menu'|'printer'|'settings'|'history'|'history-detail'
// session-only key, alongside selectedOrder (line 53):
historyOrder: null,   // Set by openHistoryOrder(); consumed by screen-detail in readOnly mode — session-only, NOT persisted (mirrors selectedOrder)
// new action, alongside openOrder (line 72):
openHistoryOrder: (order) => set({ historyOrder: order, screen: 'history-detail' }),
```
**Do not** add a `readOnly` boolean parameter to the existing `openOrder()` — RESEARCH.md Pattern 3 / Pitfall 1 explicitly reject overloading it, since that would couple the Orders detail flow to History's back-navigation.

**`partialize`** (lines 84-92) already persists only `screen`, `role`, `lang`, `accent`, `density`, `sidebarCollapsed` — no change needed there (both `'history'` and `'history-detail'` values persist automatically as strings; `historyOrder` itself stays session-only like `selectedOrder`, which is also excluded from `partialize`).

**`setScreen`** (line 65) currently resets `selectedOrder: null` on every screen change — extend it to also reset `historyOrder: null`, per RESEARCH.md's "Store + router wiring" code example:
```javascript
setScreen: (screen) => set({ screen, selectedOrder: null, historyOrder: null }),
```

### `src/shell.jsx` (MODIFIED — nav item + screenTitles, HIST-01)

**Analog:** the file itself (225 lines, read in full).

**`navGroups` structure to extend** (lines 34-56) — cashier-role branch (lines 42-46):
```javascript
items: role === 'kitchen'
  ? [ /* unchanged */ ]
  : [
      { id: 'orders', icon: 'zap', label: t('nav_orders'), count: orderCount.live, dot: orderCount.new > 0 },
      { id: 'pos', icon: 'plus', label: t('nav_new') },
      { id: 'kitchen', icon: 'chef', label: t('nav_kitchen'), count: orderCount.active },
      { id: 'history', icon: 'history', label: t('nav_history') },  // NEW
    ],
```
`Icon name="history"` already exists at `src/icons.jsx:48` (verified) — no icon addition needed. Do not add to the `role === 'kitchen'` branch (lines 38-41), per CONTEXT.md's discretion default (cashier-visible only).

**`screenTitles` map to extend** (lines 58-66):
```javascript
const screenTitles = {
  orders: t('nav_orders'),
  kitchen: t('nav_kitchen'),
  pos: t('nav_new'),
  menu: t('nav_menu'),
  printer: t('nav_printer'),
  settings: t('nav_settings'),
  detail: lang === 'ro' ? 'Detalii comandă' : 'Order details',
  history: t('nav_history'),                                              // NEW
  'history-detail': lang === 'ro' ? 'Detalii comandă' : 'Order details',   // NEW — reuse existing 'detail' title text verbatim
};
```
The `nav-item` click-to-navigate rendering (lines 89-103, `onClick={() => setScreen(item.id)}`, `className={`nav-item ${screen === item.id ? 'active' : ''}`}`) needs no change — it is already generic over `item.id`.

### `src/app.jsx` (MODIFIED — screen router branches, HIST-01/02/03/05/13 + D-08)

**Analog:** the file itself (388 lines, read in full).

**Existing `openOrder`/`'detail'` router branch to mirror the shape of, NOT the wiring of** (lines 56, 227):
```javascript
const openOrder = useAppStore((s) => s.openOrder);
...
{screen === 'detail' && selectedOrder && <OrderDetailScreen order={selectedOrder} lang={lang} restaurantSettings={restaurantSettings} deliveryAreas={deliveryAreas} onBack={() => setScreen('orders')} onAdvance={handleAdvance} onPrint={handlePrint} onCancel={() => setCancelDialog({ order: selectedOrder })} isOffline={isOffline} />}
```

**New additions** (per RESEARCH.md's "Store + router wiring" code example, hooks added alongside the existing `useAppStore` selector block at lines 41-59 — **must be called unconditionally before any early return**, per the file's own documented hook-ordering rule at line 102-103):
```javascript
const historyOrder = useAppStore((s) => s.historyOrder);
const openHistoryOrder = useAppStore((s) => s.openHistoryOrder);
```
New router branches (alongside line 224-230's existing screen branches):
```javascript
{screen === 'history' && <HistoryScreen lang={lang} onOpenOrder={openHistoryOrder} isOffline={isOffline} />}
{screen === 'history-detail' && historyOrder && (
  <OrderDetailScreen order={historyOrder} lang={lang} readOnly onBack={() => setScreen('history')} isOffline={isOffline} />
)}
```
Add `import { HistoryScreen } from './screen-history.jsx';` alongside the other screen imports (lines 5-11).

**Rehydrate-to-blank-screen backstop (UI-SPEC E7, Pitfall 6):** mirror the existing role-gate `useEffect` pattern (lines 182-184):
```javascript
useEffect(() => {
  if (role === 'kitchen' && !['kitchen', 'orders'].includes(screen)) setScreen('kitchen');
}, [role, screen, setScreen]);
```
Add an analogous effect redirecting `screen === 'history-detail'` back to `'history'` when `historyOrder` is null (cold-start rehydrate case) — same shape, same placement (before the auth-guard early returns).

### Test files

**Analog for `use-history-orders.test.js`:** `src/__tests__/use-orders.test.js` (full file, 85 lines, read in full). Mirror its exact mock/wrapper scaffolding:
```javascript
vi.mock('../auth.jsx', () => ({ useAuth: vi.fn() }))
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement } from 'react'
import { useHistoryOrders } from '../use-history-orders.js'
import { useAuth } from '../auth.jsx'

test('useHistoryOrders calls client.admin.orders.list and returns normalized orders', async () => {
  const mockOrders = [{ id: 'ord-001', status: 'COMPLETED', dailyNumber: 12 }]
  const mockClient = { admin: { orders: { list: vi.fn().mockResolvedValue({ data: { orders: mockOrders }, error: null }) } } }
  useAuth.mockReturnValue({ client: mockClient })
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  function w({ children }) { return createElement(QueryClientProvider, { client: qc }, children) }
  const { result } = renderHook(() => useHistoryOrders(), { wrapper: w })
  await waitFor(() => expect(result.current.isSuccess).toBe(true))
  expect(result.current.data[0].dailyOrderNumber).toBe(12) // via normalizeOrder's dailyNumber fallback
})
```
Note the mock client shape uses `admin.orders.list`, not `kitchen.orders.list` — this is the one required deviation from the analog.

**Analog for `screen-history.test.jsx`:** `src/__tests__/screen-orders.test.jsx` — same `@testing-library/react` render + query-by-text conventions; not read in full this pass (budget), but its existence confirms the render-testing pattern used across `screen-*.jsx` components in this codebase.

**Analog for `history-utils.test.js`:** no existing pure-function test file to mirror structurally; write plain `describe`/`test` blocks per RESEARCH.md's Phase Requirements → Test Map, with literal `AdminOrder`-shaped fixtures (no mocks/wrapper needed — these are plain function calls).

## Shared Patterns

### SDK response unwrap (all hooks)
**Source:** `src/use-orders.js` lines 15-20 (and identically in `src/use-stats.js`, `src/use-order-detail.js`)
```javascript
const result = await client.kitchen.orders.list({ query: status ? { status } : {} });
if (result.error) throw new Error(result.error.error ?? 'Failed to list orders');
const { orders, ...rest } = result.data;
```
**Apply to:** `use-history-orders.js` — same shape, swap `client.kitchen.orders.list` for `client.admin.orders.list({ query: { from, to } })`. Never wrap the SDK call itself in try/catch.

### Money formatting / cents conversion
**Source:** `src/data.jsx` lines 175, 196 (`formatRON`, `cRON` inside `normalizeOrder`)
```javascript
export const formatRON = (n) => new Intl.NumberFormat('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n) + ' lei';
const cRON = (v) => (v ?? 0) / 100; // SDK returns monetary values in cents
```
**Apply to:** `screen-history.jsx` (all row/tile totals), `history-utils.js`'s `computeSummary`/`groupOrdersByDay` revenue sums (operate on already-cRON'd `order.total` post-`normalizeOrder`, do not re-divide).

### Card / chip / button utility classes
**Source:** `src/styles.css` lines 211-226
```css
.card { background: #fff; border: 1px solid hsl(120 10% 90%); border-radius: 16px; }
.chip { /* pill shape, padding 3px 9px, radius 999px */ }
.chip-sage { background: hsl(120 14% 49% / 0.14); color: hsl(120 14% 32%); }
.chip-red   { background: hsl(0 84% 60% / 0.12); color: hsl(0 72% 45%); }
.chip-amber { background: hsl(38 92% 50% / 0.14); color: hsl(30 80% 38%); }
.chip-slate { background: hsl(210 15% 90%); color: hsl(215 25% 27%); }
```
**Apply to:** all Phase 7 UI files — `screen-history.jsx` row status chips (D-02: sage/red/amber for completed/canceled/refunded), type chip (`chip-slate`), summary tiles (`.card`); `screen-detail.jsx`'s new minimal totals card. Confirmed no new CSS classes are needed this phase — every visual primitive UI-SPEC.md calls for already exists in `src/styles.css`.

### i18n key lookup
**Source:** `src/i18n.jsx` — flat `I18N.ro` / `I18N.en` objects, consumed via `useT(lang)` (imported everywhere as `import { useT } from './i18n.jsx'`)
**Apply to:** every new file adds its strings under both `ro` and `en` top-level keys in `src/i18n.jsx`. Verified (via grep) that none of UI-SPEC's ~30 new keys (`nav_history`, `h_col_*`, `h_period_*`, `h_status_*`, `h_empty*`, `h_orders*`, `h_revenue`, `h_avg*`, `h_refunds`, `h_canceled_suffix`, `h_search`, `h_export`, `h_error_title`, `h_retry`, `h_back_to_history`, `h_today`, `h_yesterday`) already exist in the file — safe to add as net-new, no collision risk found.

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `src/history-utils.js` | utility | transform | No existing pure (React/SDK-free) derivation module exists in the codebase to pattern-match against structurally. RESEARCH.md's Code Examples section fully specifies the required implementation (`getLast30DaysRange`, `filterFinishedOrders`, `deriveDisplayStatus`, `groupOrdersByDay`, `computeSummary`) — planner should treat that as the source of truth rather than searching for a closer analog. |
| `src/__tests__/history-utils.test.js` | test | transform | No pure-function unit test file exists yet in `src/__tests__/` to structurally mirror (all existing tests are hook-render or component-render tests requiring mocks/wrappers); use plain `describe`/`test` blocks with literal fixtures instead. |

## Metadata

**Analog search scope:** `src/` (all `.jsx`/`.js` production files), `src/__tests__/`, `src/styles.css`, `src/icons.jsx`, `node_modules/@charlyk/admin-client/dist/index.d.ts` (types only, not analog code)
**Files scanned:** `screen-orders.jsx`, `use-orders.js`, `store.js`, `shell.jsx`, `app.jsx`, `screen-detail.jsx`, `data.jsx`, `i18n.jsx` (partial), `__tests__/use-orders.test.js`, `icons.jsx` (grep), `styles.css` (grep)
**Pattern extraction date:** 2026-07-17
