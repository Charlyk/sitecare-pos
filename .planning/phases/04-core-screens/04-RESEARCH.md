# Phase 4: Core Screens — Research

**Researched:** 2026-04-24
**Domain:** React screen wiring, TanStack Query mutations, SSE sound alerts, POS order creation, menu stock API, Zustand settings persistence
**Confidence:** HIGH — all findings verified against live codebase and SDK type definitions

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Cancel button in OrderDetail screen only — not on OrderCard.
- **D-02:** Cancellation requires a confirm dialog before API call.
- **D-03:** Confirm dialog has a required reason dropdown (5 presets) — Confirm button disabled until reason selected.
- **D-04:** `updateStatus` cancel call: `{ currentStatus: order.state.toUpperCase(), toStatus: 'CANCELLED', reason: selectedReason }`.
- **D-05:** Sound file is a bundled MP3 at `public/sounds/new-order.mp3`. Play via `new Audio('/sounds/new-order.mp3')`.
- **D-06:** Sound plays only on live SSE `order_new` events — NOT on initial snapshot. `useSSE` must track `snapshotReceived` flag.
- **D-07:** Mute toggle state lives in Zustand (`soundMuted: boolean`), session-only (NOT in partialize).
- **D-08:** When `soundMuted` is true, audio is not played; all other KDS UX unaffected.
- **D-09:** Discount is order-level only.
- **D-10:** Staff can choose fixed (RON) or percentage (%) with a mode toggle. Default: percentage.
- **D-11:** Discount field in totals area, between delivery fee row and total row. Label: "Discount" + mode toggle inline.
- **D-12:** `discountAmount` in RON passed to `orders.create` body. If API rejects, apply client-side and omit field.
- **D-13:** SettingsScreen gets a new "Display" tab alongside existing tabs.
- **D-14:** Display tab: Language (RO/EN toggle), Density (Balanced/Dense toggle), Accent (4-color picker). Map to `setLang`, `setDensity`, `setAccent` from `useAppStore`.
- **D-15:** SettingsScreen imports `useAppStore` directly — no prop-drilling from App.
- **D-16:** Phase 4 includes persistence verification — change lang/density/accent in Display tab, restart app, confirm values survive.
- **D-17:** Search (ORD-03) is client-side filter over `dailyOrderNumber` and customer name. No API call.
- **D-18:** FOH/BOH role switching already works. No additional work beyond confirming it works with live data.
- **D-19:** `onConfirm(prepMin)` in app.jsx must call `updateStatus.mutate({ id: order.id, currentStatus: 'NEW', toStatus: 'ACCEPTED', estimatedMinutes: prepMin })`.
- **D-20:** After AcceptDialog success: close dialog + success toast. On error: error toast, keep dialog open.
- **D-21:** PosScreen calls `useMenu()` directly. Remove static `MENU_CATEGORIES`/`MENU_ITEMS` imports.
- **D-22:** Normalize `useMenu()` SDK shape to POS card layout: `id`, `name` (per lang), `price`, `categoryId`.
- **D-23:** MenuScreen calls `useMenu()` for live data. Remove `localStorage` availability state.
- **D-24:** Availability toggle uses `useMutation` → `client.kitchen.products.updateStock(...)` → `invalidateQueries(['menu'])` on success.
- **D-25:** `updateStock` endpoint is `PATCH /v1/kitchen/stock`. Confirm body shape from SDK types before implementing.

### Claude's Discretion

- MP3 file selection: short notification chime (~0.5s). Commit to `public/sounds/new-order.mp3`.
- SSE snapshot detection implementation approach.
- Cancel reason exact preset options (4-5, bilingual ro/en).
- Discount API field name — inspect SDK, apply client-side if field not accepted.
- Error handling style — brief toast, consistent with Phase 3 patterns.

### Deferred Ideas (OUT OF SCOPE)

- Cancel from OrderCard.
- Per-item discounts (v2).
- Sound configuration — volume control, custom sound.

</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| ORD-01 | User can view a live list of orders with status filtering | Already wired in Phase 3; verify status filter works with live data |
| ORD-02 | User can switch between FOH and BOH role views | Already works via Zustand `role` gate in app.jsx; verify with live data |
| ORD-03 | User can search orders by order ID or customer name | Client-side filter on `orders` array — add `SearchInput` to filter bar |
| ACT-01 | User can accept a new order and set prep time | Wire `onConfirm` in AcceptDialog to call `updateStatus` mutation |
| ACT-02 | User can advance order status through full lifecycle | Already wired via `handleAdvance` in app.jsx; verify end-to-end |
| ACT-03 | User can cancel an order from Order Detail screen | New `CancelDialog` component + `updateStatus` CANCELLED mutation |
| KDS-02 | Each ticket shows elapsed time updated every minute | Change setInterval from 30s to 60s in screen-kitchen.jsx |
| KDS-03 | Tickets visually indicate urgency by age | Already implemented (border colors); verify thresholds match spec |
| KDS-04 | App plays sound alert when new order ticket arrives | SSE snapshot detection + Audio playback + mute toggle in Zustand |
| KDS-05 | User can bump a ticket directly from the KDS screen | Already wired via `onAdvance`; verify with live data |
| POS-01 | User can browse live menu with categories/items from API | Replace static data with `useMenu()` hook in PosScreen |
| POS-02 | User can add items to cart and adjust quantities | Already implemented in PosScreen; verify with live item `id` and `price` |
| POS-03 | User can apply discounts during checkout | Add `DiscountField` component in POS totals area |
| POS-04 | User can select order type before submitting | Already implemented (dinein/pickup/delivery toggle in POS cart panel) |
| POS-05 | User can submit a completed order to the kitchen via API | Wire `onCreate` in app.jsx to `useMutation` → `client.kitchen.orders.create` |
| MENU-01 | User can toggle item availability from Menu screen | Wire `AvailSwitch` to `useMutation` → `client.kitchen.products.updateStock` |
| MENU-02 | Menu screen shows current availability state from live API | Replace static data with `useMenu()` hook in MenuScreen |
| SET-01 | User can change app language, persisted across restarts | Already persisted via Zustand partialize; add Display tab UI controls |
| SET-02 | User can change display density, persisted across restarts | Already persisted; add Display tab UI controls |
| SET-03 | User can change accent theme color, persisted across restarts | Already persisted; add Display tab UI controls |

</phase_requirements>

---

## Summary

Phase 4 is a pure wiring and completion phase — no new infrastructure required. All data hooks (`useOrders`, `useMenu`, `useOrderActions`) are implemented and tested. The screens exist with correct visual structure but are connected to static mock data or have empty callbacks. The work is: replace static data sources with live hooks, complete unfinished callbacks (AcceptDialog `onConfirm`, PosScreen `onCreate`), add missing UI features (CancelDialog, SearchInput, DiscountField, DisplayTab, MuteToggle), and verify persistence end-to-end.

The most structurally novel work in this phase is:
1. **SSE snapshot detection** — extending `useSSE` to distinguish initial batch events from live events, so sound plays only on new arrivals.
2. **POS order creation** — calling `client.kitchen.orders.create` with the correct field mapping from the cart state to `CreateKitchenOrderBody`.
3. **Menu data normalization** — `KitchenMenuResponse.categories` uses `{ [key: string]: unknown }` (untyped in SDK), so the normalization layer must be written defensively.

All other changes are direct, low-risk wiring of existing patterns.

**Primary recommendation:** Execute in screen-by-screen waves. Each wave is self-contained, testable, and independently committable. Start with the lowest-risk changes (Orders search, KDS timer interval, Settings Display tab) and end with the highest-complexity changes (POS order creation, SSE sound detection).

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Client-side search filter (ORD-03) | Browser/React state | — | Filter operates over already-fetched `orders` array; no server involvement |
| AcceptDialog API wiring (ACT-01) | React component | API/Backend | Component calls mutation; mutation calls SDK; server owns transition logic |
| Cancel order with reason (ACT-03) | React component + dialog | API/Backend | UI collects reason; `updateStatus` sends it; server validates the transition |
| KDS elapsed timer display (KDS-02) | Browser/React state | — | `setInterval` + `useState` force rerender; no server call needed |
| KDS urgency colors (KDS-03) | Browser/React state | — | Derived from `elapsed` and `promisedIn` already in cache; pure calculation |
| Sound alert on SSE event (KDS-04) | Browser/Audio + useSSE | — | `new Audio().play()` in browser; SSE hook owns snapshot-vs-live distinction |
| Mute toggle persistence (KDS-04) | Zustand store | — | Session-only state; no persistence needed; lives in store only |
| POS live menu (POS-01) | React component + TanStack Query | API/Backend | `useMenu()` fetches from `/v1/kitchen/menu`; component renders result |
| POS cart + order submission (POS-05) | React component | API/Backend | Cart is local state; submission maps cart → `CreateKitchenOrderBody` |
| Discount calculation (POS-03) | Browser/React state | — | Math done client-side before passing `discountAmount` to API or display |
| Menu availability toggle (MENU-01/02) | React component + TanStack Query | API/Backend | `useMenu()` fetches state; `useMutation` sends PATCH; `invalidateQueries` syncs |
| Settings persistence (SET-01/02/03) | Zustand + plugin-store | — | Zustand partialize already persists `lang`/`density`/`accent`; Display tab only adds UI |

---

## Standard Stack

No new dependencies are required for Phase 4. All libraries are already installed and operational.

### Core (already installed)
| Library | Version | Purpose | Phase 4 Usage |
|---------|---------|---------|---------------|
| React 18 | ^18.3.1 | UI rendering | All new components and screen modifications |
| Zustand 5 | ^5.x | UI state | Adding `soundMuted` session key |
| TanStack Query 5 | ^5.x | Server state + mutations | New mutations: createOrder, updateStock |
| @charlyk/admin-client | installed | SDK data layer | `kitchen.orders.create`, `kitchen.products.updateStock` |
| @microsoft/fetch-event-source | installed | SSE connection | Extending `useSSE` with snapshot detection |

### No New Installations Required

Phase 4 uses only what is already installed. No `npm install` step is needed.

---

## Architecture Patterns

### System Architecture Diagram

```
User interaction (button click / search input / toggle)
         |
         v
React component local state (cart, discountValue, searchQuery, reasonSelected)
         |
         v
   Mutation or filter operation?
         |
    [filter] ──────────────────────────────────────────→ Re-render with filtered array
         |
    [mutation]
         |
         v
TanStack Query useMutation → SDK method → API endpoint
         |
    success?
   /         \
[yes]        [no]
  |            |
  v            v
invalidateQueries  push error toast
  |            keep dialog open
  v
useQuery refetch → cache update → screen re-renders
         |
         v (SSE parallel path)
useSSE onmessage(order_new) → snapshotReceived?
         |                      /         \
         |                   [no]         [yes]
         |                    |             |
         |               skip audio    play audio (if !soundMuted)
         v
setQueryData(['orders']) → screen re-renders
```

### Recommended Project Structure

No structural changes needed. Phase 4 adds:

```
src/
├── use-sse.js           — extend with snapshotReceived flag + onLiveOrder callback
├── store.js             — add soundMuted: boolean (session-only)
├── app.jsx              — fix onConfirm, wire onCreate, add CancelDialog JSX, add createOrder handler
├── screen-orders.jsx    — add SearchInput to filter bar
├── screen-kitchen.jsx   — add MuteToggle, change interval to 60s
├── screen-pos.jsx       — replace static data with useMenu(), add DiscountField, wire onCreate
├── screen-menu.jsx      — replace static data + localStorage with useMenu() + useMutation
├── screen-settings.jsx  — add Display tab
├── screen-detail.jsx    — add Cancel button + CancelDialog
├── i18n.jsx             — add ~40 new bilingual strings
public/
└── sounds/
    └── new-order.mp3    — copy from public/notification.mp3 (already exists)
```

### Pattern 1: TanStack Query v5 Mutation

All mutations in Phase 4 follow the established project pattern exactly.

```javascript
// Source: verified against use-order-actions.js (Phase 3 implementation)
const createOrder = useMutation({
  mutationFn: (orderData) => client.kitchen.orders.create({ body: orderData }),
  onSuccess: (result) => {
    queryClient.invalidateQueries({ queryKey: ['orders'] });
    pushToast({ id: Date.now(), kind: 'success', title: t('order_sent'), detail: `#${result.data?.dailyNumber}` });
    setCart([]);
  },
  onError: () => {
    pushToast({ id: Date.now(), kind: 'error', title: t('order_error'), detail: t('check_connection') });
  },
});
```

### Pattern 2: SSE Snapshot Detection

The `useSSE` hook must be extended to prevent the initial batch of orders (snapshot replay on connect) from triggering sound. The simplest approach is a `useRef` flag set after a short timeout post-connect.

```javascript
// Source: logic inferred from useSSE.js + CONTEXT.md D-06
// Add to useSSE.js — no external libraries needed
const snapshotDone = useRef(false);

async onopen(response) {
  if (response.ok) {
    setIsConnected(true);
    // 100ms window to absorb initial snapshot batch silently
    setTimeout(() => { snapshotDone.current = true; }, 100);
    return;
  }
  throw new Error(`SSE: server returned ${response.status}`);
},

onmessage(msg) {
  if (msg.event === 'ping') return;
  if (msg.event === 'order_new') {
    // ... existing cache upsert logic ...
    if (snapshotDone.current && onLiveOrder) {
      onLiveOrder(); // caller plays sound
    }
  }
},
```

The `onLiveOrder` callback is passed in from `app.jsx` where sound logic lives:

```javascript
// In app.jsx — soundMuted read from store
const soundMuted = useAppStore((s) => s.soundMuted);
const handleLiveOrder = useCallback(() => {
  if (!soundMuted) {
    new Audio('/sounds/new-order.mp3').play().catch(() => {});
  }
}, [soundMuted]);
const { isConnected } = useSSE(token, handleLiveOrder);
```

Note: `useSSE` signature change — add optional second parameter `onLiveOrder` callback.

### Pattern 3: POS Order Creation Body Mapping

The SDK's `CreateKitchenOrderBody` does NOT include a discount field. Confirmed by reading `index.d.ts` line 661–687. Discount must be applied client-side.

```javascript
// Source: VERIFIED against SDK index.d.ts CreateKitchenOrderBody (lines 661-687)
// orderType mapping: SDK uses 'local' for dine-in, NOT 'dinein'
const orderTypeMap = { dinein: 'local', pickup: 'pickup', delivery: 'delivery' };

const body = {
  orderType: orderTypeMap[type],                    // 'local' | 'pickup' | 'delivery'
  items: cart.map(it => ({
    productId: it.id,                               // SDK field name: productId
    quantity: it.qty,                               // SDK field name: quantity
  })),
  ...(customer.name   ? { customerName: customer.name }   : {}),
  ...(customer.phone  ? { customerPhone: customer.phone }  : {}),
  ...(note            ? { notes: note }                    : {}),
  paymentType: payment === 'online' ? undefined : payment, // 'cash' | 'card' only
  ...(type === 'delivery' && customer.address ? {
    deliveryAddress: { street: customer.address, number: '' },
  } : {}),
};
```

**Critical finding:** SDK `orderType` for dine-in is `'local'`, not `'dinein'`. The UI toggle uses `'dinein'` internally; the mapping must convert before SDK call.

### Pattern 4: Menu Data Normalization

`KitchenMenuResponse.categories` has type `Array<{ [key: string]: unknown }>` — fully untyped in the SDK. Normalization must be defensive.

```javascript
// Source: VERIFIED against SDK index.d.ts line 653-659 + KitchenMenuResponse type
// Run useMenu() and normalize defensively
const { data: menuData } = useMenu();
const cats = (menuData?.categories ?? []).map(c => ({
  id: c.id ?? c.categoryId ?? '',
  ro: c.name ?? c.nameRo ?? '',          // field names unknown — inspect runtime
  en: c.nameEn ?? c.name ?? '',
  icon: c.icon ?? 'utensils',
  products: (c.products ?? c.items ?? []).map(p => ({
    id: p.id ?? p.productId ?? '',
    ro: p.name ?? p.nameRo ?? '',
    en: p.nameEn ?? p.name ?? '',
    price: (p.price ?? 0) / 100,         // SDK returns cents — convert to RON
    inStock: p.inStock !== false,         // default true if missing
    categoryId: c.id,
  })),
}));
```

**Note:** The exact field names inside `categories[].products` items are not documented in the SDK types (the type is `{ [key: string]: unknown }`). The normalizer must be inspected against live API data during implementation. A console.log of raw `result.data` in `use-menu.js` on first run will reveal the actual field names.

### Pattern 5: Stock Update Call

```javascript
// Source: VERIFIED against SDK index.d.ts UpdateStockBody (line 642-644)
// UpdateProductStockData.body: { productId: string; inStock: boolean }
// endpoint: PATCH /v1/kitchen/stock (no path param — productId is in body)
const toggleStock = useMutation({
  mutationFn: ({ productId, inStock }) =>
    client.kitchen.products.updateStock({
      body: { productId, inStock },       // productId in body, NOT path
    }),
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ['menu'] }),
  onError: () => pushToast({ ... }),
});
```

**Critical finding:** `UpdateProductStockData.path` is `never` — there is no path parameter. The `productId` is sent in the body, not the URL. This differs from the CONTEXT.md D-24 description which said `path: { id: item.id }` — that is INCORRECT. The actual call is `{ body: { productId: item.id, inStock: newValue } }`.

### Pattern 6: Store `soundMuted` Addition

```javascript
// Source: VERIFIED against store.js — add to session-only section, NOT partialize
// In store.js, add alongside selectedOrder and toasts:
soundMuted: false,

// Action:
setSoundMuted: (v) => set({ soundMuted: v }),
```

The `partialize` function must NOT include `soundMuted` — confirmed requirement from D-07.

### Anti-Patterns to Avoid

- **Using `order.state` directly for SDK status fields:** The SDK expects UPPERCASE (`'NEW'`, `'ACCEPTED'`, `'CANCELLED'`). The normalized `order.state` is lowercase. Always call `.toUpperCase()` before passing to `updateStatus`. This is already done in `use-order-actions.js` but must be verified in the new CancelDialog.
- **Calling `new Audio().play()` in snapshot events:** The SSE snapshot replays all current orders on connect. Without the `snapshotReceived` flag, every existing order on the KDS would trigger a sound burst on app load.
- **Using `orderType: 'dinein'` in SDK call:** The SDK `CreateKitchenOrderBody.orderType` accepts `'delivery' | 'pickup' | 'local'`. The string `'dinein'` is not valid and will cause a 400 validation error. Map it to `'local'`.
- **Passing `path: { id }` to `updateStock`:** `UpdateProductStockData.path` is typed as `never`. The product ID goes in the body as `productId`, not in the path.
- **Storing lang/density/accent in component state instead of calling Zustand setters:** The Display tab must call `setLang`, `setDensity`, `setAccent` directly — changes must flow through Zustand so they persist. Do not shadow the values in local state.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Bilingual strings | Inline lang ternaries everywhere | `useT(lang)` from i18n.jsx | Already established; adding keys is the only needed change |
| Toast notifications | Custom modal system | `pushToast` from `useAppStore` | Already implemented and styled |
| Query invalidation after mutation | Manual refetch calls | `queryClient.invalidateQueries` in `onSuccess` | TanStack Query v5 canonical pattern; already used everywhere |
| SSE connection management | Custom EventSource polling | `useSSE` with `fetchEventSource` | Already implemented; only needs `onLiveOrder` callback extension |
| OS-level settings persistence | `localStorage` writes | Zustand `partialize` + `plugin-store` | Already wired; `lang`/`density`/`accent` persist automatically |
| Discount math | Complex floating point | Simple `subtotal * pct / 100` or `fixedAmount` | Subtotals are small RON values; no currency library needed |

**Key insight:** Phase 4 is fundamentally a wiring phase. Every hard problem (SSE, persistence, toast, query invalidation, auth) was solved in Phases 1-3. New code is either: (a) connecting existing hooks to existing UI, or (b) small new components following established patterns.

---

## Common Pitfalls

### Pitfall 1: SDK `orderType` vs. UI `type` Mismatch
**What goes wrong:** Passing the UI's `'dinein'` string to `kitchen.orders.create` as `orderType`. The SDK only accepts `'local'`, `'pickup'`, or `'delivery'`. The API returns a 400 with a validation error.
**Why it happens:** The prototype used `'dinein'` as the internal key. The SDK uses `'local'` for the same concept.
**How to avoid:** Always map before the SDK call: `{ dinein: 'local', pickup: 'pickup', delivery: 'delivery' }[type]`.
**Warning signs:** `result.error` is defined after `orders.create` call; error message mentions validation.

### Pitfall 2: Sound Playing on Initial Snapshot
**What goes wrong:** `useSSE` receives the full order list as `order_new` events on first connect (SSE snapshot pattern). Without guard, every loaded order triggers a sound alert on app start.
**Why it happens:** SSE protocol uses the same event type for both initial state delivery and live updates.
**How to avoid:** Set `snapshotDone = true` inside a `setTimeout(100)` in `onopen`. Events processed before that flag is set are silent.
**Warning signs:** Sound plays immediately on app launch before any user action; multiple rapid chimes on cold start.

### Pitfall 3: `updateStock` Path Parameter Confusion
**What goes wrong:** Calling `client.kitchen.products.updateStock({ path: { id: item.id }, body: { inStock } })`. The SDK type for `path` is `never` — passing a path object either throws or silently ignores it, and the `productId` in the body is missing, causing a 400/404.
**Why it happens:** Most SDK methods use path parameters for resource IDs. This one is a PATCH without a path param — the ID goes in the body.
**How to avoid:** `{ body: { productId: item.id, inStock: newValue } }` — no `path` property.
**Warning signs:** API returns 400 or "product not found" even when the item ID is correct.

### Pitfall 4: Stale `selectedOrder` in CancelDialog
**What goes wrong:** The CancelDialog is opened from `screen-detail.jsx` with the current `order` prop. After a successful cancel, `setScreen('orders')` is called. But if `openOrder` was called earlier, `selectedOrder` in Zustand still points to the cancelled order. On next detail screen visit, stale data may show.
**Why it happens:** `setScreen` calls `set({ screen, selectedOrder: null })` — confirmed in `store.js` line 63. This clears it automatically.
**How to avoid:** Use `setScreen('orders')` after cancel success (not `setScreen('orders')` directly) — the existing `setScreen` action already clears `selectedOrder`. No additional cleanup needed.
**Warning signs:** Detail screen shows cancelled order state after navigating away and back.

### Pitfall 5: KDS Tick Interval vs. React Hook Rules
**What goes wrong:** Moving the `setInterval` from 30s to 60s inside a conditional block or inside a component that might unmount.
**Why it happens:** `useEffect` cleanup is needed to prevent interval accumulation.
**How to avoid:** The existing pattern in `screen-kitchen.jsx` is correct — `clearInterval` is already in the cleanup return. Just change `30000` to `60000`. Do not restructure the `useEffect`.
**Warning signs:** KDS timer jumps by more than 1 minute at a time; multiple intervals firing simultaneously.

### Pitfall 6: Discount Line Rendering on Zero Value
**What goes wrong:** Showing a "Discount: -0.00 RON" line even when no discount is entered.
**Why it happens:** Discount state is a number, and `0` is falsy but `formatRON(0)` renders `"0,00 RON"`.
**How to avoid:** Conditionally render: `{discountAmount > 0 && <DiscountLine />}`. Also reset to empty string `''` (not `0`) as default input state so the check `discountValue === ''` works cleanly.
**Warning signs:** Totals area shows an extra "Discount -0,00 RON" line on all orders.

### Pitfall 7: `AcceptDialog` `onConfirm` Still Uses Toast-Only Path
**What goes wrong:** The current `onConfirm` in `app.jsx` (line 140-143) shows a toast and closes the dialog WITHOUT calling the API. After Phase 4, this must call `updateStatus.mutate`. If the old path is not replaced, orders appear accepted in the UI but the API never transitions them.
**Why it happens:** Phase 3 explicitly deferred this wiring — it is the known gap documented in CONTEXT.md D-19.
**How to avoid:** Replace the `onConfirm` callback in `app.jsx` entirely. The new implementation must: (1) call `updateStatus.mutate(...)`, (2) in `onSuccess` close dialog + toast, (3) in `onError` toast-only (dialog stays open).
**Warning signs:** Order remains in `new` state after accepting in the UI; no state change in API.

---

## Code Examples

### AcceptDialog onConfirm (ACT-01)

```javascript
// Source: VERIFIED against use-order-actions.js mutation signature + app.jsx current state
// Replace the existing onConfirm lambda in app.jsx AcceptDialog JSX:
onConfirm={(prepMin) => {
  updateStatus.mutate(
    { id: acceptDialog.order.id, currentStatus: 'NEW', toStatus: 'ACCEPTED', estimatedMinutes: prepMin },
    {
      onSuccess: () => {
        setAcceptDialog(null);
        pushToast({ id: Date.now(), kind: 'success', title: t('accept_success_title'), detail: `${t('promised')}: ${prepMin} ${t('min')}` });
      },
      onError: () => {
        pushToast({ id: Date.now(), kind: 'error', title: t('accept_error_title'), detail: t('check_connection') });
        // dialog stays open — do NOT call setAcceptDialog(null) here
      },
    }
  );
}}
```

### CancelDialog Component (ACT-03)

```javascript
// Source: pattern derived from AcceptDialog structure (app.jsx lines 149-225)
// New component in app.jsx or screen-detail.jsx
function CancelDialog({ lang, order, onCancel, onConfirm }) {
  const t = useT(lang);
  const [reason, setReason] = useState('');
  const reasons = [
    { value: 'customer_changed_mind', label: lang === 'ro' ? 'Clientul a renunțat' : 'Customer changed mind' },
    { value: 'out_of_ingredients',    label: lang === 'ro' ? 'Lipsă ingrediente' : 'Out of ingredients' },
    { value: 'duplicate_order',       label: lang === 'ro' ? 'Comandă duplicată' : 'Duplicate order' },
    { value: 'kitchen_cannot_fulfill',label: lang === 'ro' ? 'Bucătăria nu poate pregăti' : 'Kitchen cannot fulfill' },
    { value: 'other',                 label: lang === 'ro' ? 'Altul' : 'Other' },
  ];
  const canConfirm = reason !== '';
  return (
    <div style={{ position: 'absolute', inset: 0, background: 'rgba(18,24,18,0.45)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, animation: 'fadeIn 180ms ease-out' }}>
      <div style={{ width: 420, background: '#fff', borderRadius: 20, ... }}>
        {/* reason select, confirm/cancel buttons */}
        <button className="btn-primary" style={{ background: 'var(--sc-destructive)', ..., opacity: canConfirm ? 1 : 0.45, pointerEvents: canConfirm ? 'auto' : 'none' }} onClick={() => onConfirm(reason)}>
          {canConfirm ? t('confirm_cancellation') : t('select_reason')}
        </button>
      </div>
    </div>
  );
}
```

### useMenu() POS Normalization

```javascript
// Source: VERIFIED against use-menu.js return value + SDK KitchenMenuResponse type
const { data: menuData, isLoading: menuLoading } = useMenu();
// KitchenMenuResponse: { categories: Array<{ [key: string]: unknown }>, globalProducts: Array<...> }
// Field names inside categories are NOT documented — must inspect live response
// Defensive normalization:
const cats = useMemo(() => (menuData?.categories ?? []).map(c => ({
  id: c.id ?? String(c.categoryId ?? ''),
  ro: c.name ?? '',
  en: c.nameEn ?? c.name ?? '',
  icon: 'utensils',
  items: (c.products ?? c.items ?? []).map(p => ({
    id: p.id ?? String(p.productId ?? ''),
    ro: p.name ?? '',
    en: p.nameEn ?? p.name ?? '',
    price: typeof p.price === 'number' ? p.price / 100 : 0,
    inStock: p.inStock !== false,
  })),
})), [menuData]);
```

---

## Runtime State Inventory

Step 2.5 evaluation: Phase 4 is NOT a rename/refactor/migration phase. It is a feature completion phase that modifies source code only. No runtime state inventory is needed.

The one quasi-migration is replacing `localStorage` availability state in `screen-menu.jsx` with live API data. This is a removal (localStorage key `sc_avail` is abandoned) — no migration required. Staff availability state is now owned by the API.

---

## Environment Availability

Phase 4 has no new external dependencies beyond what was installed in Phases 1-3.

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| `public/notification.mp3` | D-05 sound alert | Already exists at `public/notification.mp3` | — | Copy to `public/sounds/new-order.mp3` |
| `src/__tests__/` test infra | Validation | vitest + jsdom + @testing-library/react | all passing (80/80) | — |
| @charlyk/admin-client kitchen API | All mutations | Installed and operational | confirmed Phase 3 | — |

**Sound file note:** `public/notification.mp3` already exists. The plan should instruct renaming or copying to `public/sounds/new-order.mp3` (creating the `sounds/` subdirectory) so the path matches D-05.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `localStorage` availability state in MenuScreen | Live API state via `useMenu()` | Phase 4 | Remove `localStorage.getItem('sc_avail')` entirely; `avail` state becomes `item.inStock` from SDK |
| Static `MENU_CATEGORIES`/`MENU_ITEMS` imports in PosScreen | `useMenu()` hook | Phase 4 | POS shows real restaurant menu, not mock pizza/burger data |
| Static `MENU_CATEGORIES`/`MENU_ITEMS` imports in MenuScreen | `useMenu()` hook | Phase 4 | Same |
| `onConfirm` showing toast only (no API call) | `onConfirm` calling `updateStatus.mutate` | Phase 4 | ACT-01 actually works |
| `onCreate={() => {}}` (no-op) in PosScreen | `onCreate` calling `kitchen.orders.create` | Phase 4 | POS-05 actually works |
| KDS 30s timer interval | 60s interval | Phase 4 | Matches KDS-02 "updated every minute" requirement |
| No cancel UI | CancelDialog in OrderDetail | Phase 4 | ACT-03 complete |

**Deprecated:**
- `localStorage.getItem('sc_avail')` / `localStorage.setItem('sc_avail', ...)` in screen-menu.jsx — remove entirely.
- Static `MENU_CATEGORIES` and `MENU_ITEMS` imports from `data.jsx` in `screen-pos.jsx` and `screen-menu.jsx` — remove from these screens (keep in data.jsx for now since no other consumer currently uses them, but the screens stop importing them).

---

## SDK Type Findings (Critical)

These findings are VERIFIED against `node_modules/@charlyk/admin-client/dist/index.d.ts` and directly affect implementation.

### `kitchen.orders.create` — `CreateKitchenOrderBody`
```typescript
// VERIFIED: lines 661-687 in index.d.ts
{
  orderType: 'delivery' | 'pickup' | 'local';  // NOT 'dinein' — use 'local' for dine-in
  items: Array<{ productId: string; quantity: number; selectedOptions?: [...] }>;
  customerName?: string;
  customerPhone?: string;
  deliveryAddress?: { street: string; number: string; bloc?: string; ... };
  notes?: string;
  paymentType?: 'cash' | 'card';               // 'online' is NOT accepted here
  // NO discount field
}
```

Response (`CreateKitchenOrderResponse`):
```typescript
// VERIFIED: lines 688-694 in index.d.ts
{ orderId: string; trackToken: string; cancelToken: string; dailyNumber: number; estimatedMinutes: number | null; }
```

### `kitchen.products.updateStock` — `UpdateStockBody`
```typescript
// VERIFIED: lines 642-644 in index.d.ts
// UpdateProductStockData.path is 'never' — NO path parameter
{ productId: string; inStock: boolean; }       // productId in BODY, not URL path
// endpoint: PATCH /v1/kitchen/stock
```

### `kitchen.orders.updateStatus` — `UpdateOrderStatusBody`
```typescript
// VERIFIED: lines 695-703 in index.d.ts
{
  currentStatus: 'NEW' | 'ACCEPTED' | 'PREPARING' | 'READY' | 'OUT_FOR_DELIVERY' | 'COMPLETED' | 'CANCELLED';
  toStatus: same enum;
  reason?: string;
  estimatedMinutes?: number;   // accepted only when toStatus is ACCEPTED, range 1-480
}
```

**Note:** API uses `'OUT_FOR_DELIVERY'` and `'COMPLETED'` for what the UI calls `'out'` and `'done'`. The existing `handleAdvance` in app.jsx passes `.toUpperCase()` but `'done'.toUpperCase()` → `'DONE'` not `'COMPLETED'`. The `use-order-actions.js` passes `toStatus.toUpperCase()` directly. **This is a pre-existing bug** — the status advance for `'done' → 'DONE'` should be `'COMPLETED'`, and `'out' → 'OUT'` should be `'OUT_FOR_DELIVERY'`. This must be fixed in Phase 4 when wiring ACT-02 end-to-end. A status mapping object is needed.

```javascript
// VERIFIED fix needed — add to data.jsx or a utility:
const statusToSDK = {
  new: 'NEW',
  accepted: 'ACCEPTED',
  preparing: 'PREPARING',
  ready: 'READY',
  out: 'OUT_FOR_DELIVERY',   // NOT 'OUT'
  done: 'COMPLETED',         // NOT 'DONE'
  cancelled: 'CANCELLED',
};
```

### `KitchenMenuResponse`
```typescript
// VERIFIED: lines 653-659 in index.d.ts
{ categories: Array<{ [key: string]: unknown }>; globalProducts: Array<{ [key: string]: unknown }>; }
```
Both arrays are fully untyped. Normalization must be written defensively and validated against live API output at runtime.

---

## Open Questions

1. **KitchenMenuResponse category field names**
   - What we know: SDK types are `{ [key: string]: unknown }` — no field names documented.
   - What's unclear: Exact field names for `id`, `name`, `products`, item `id`, `name`, `price`, `inStock` inside category objects.
   - Recommendation: In the PosScreen/MenuScreen implementation task, add a `console.log('raw menu:', result.data)` in `use-menu.js` queryFn for one run to inspect actual field names, then finalize normalization. Remove the log before commit.

2. **Tax display in POS**
   - What we know: Current screen-pos.jsx hardcodes 19% tax. STATE.md documents this as an open question. The `CreateKitchenOrderResponse` does NOT return a total — it returns `{ orderId, dailyNumber, estimatedMinutes }` only.
   - What's unclear: Whether to keep displaying client-calculated tax in the POS totals UI (pre-submission) or remove it.
   - Recommendation: Keep the 19% client-side tax display for UX (staff needs to see total before submitting). The tax line is informational only — the API computes the final authoritative total server-side. For the success toast, use `formatRON(total)` from local cart state. [ASSUMED: 19% is the correct VAT rate for this restaurant type]

3. **POS `paymentType` field — 'online' handling**
   - What we know: SDK `CreateKitchenOrderBody.paymentType` accepts only `'cash' | 'card'`. The POS UI has an 'online' payment option.
   - What's unclear: Whether to omit the field, default to 'card', or remove the 'online' option from POS.
   - Recommendation: Omit `paymentType` when `payment === 'online'` (the field is optional). The server will default appropriately. Do not remove the 'online' UI button — it was in the prototype.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest + @testing-library/react + jsdom |
| Config file | `vitest.config.js` (root) |
| Setup file | `src/__tests__/setup.js` (imports @testing-library/jest-dom) |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run --reporter=verbose` |
| Current baseline | 80 tests passing across 13 files |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| ORD-01 | Orders list renders live data with status filters | unit (render) | `npx vitest run src/__tests__/screen-orders.test.jsx` | Wave 0 |
| ORD-02 | FOH/BOH role switch navigates to kitchen screen | unit (store) | `npx vitest run src/__tests__/store.test.js` (extend) | Partial |
| ORD-03 | Search filter by dailyOrderNumber | unit (render) | `npx vitest run src/__tests__/screen-orders.test.jsx` | Wave 0 |
| ORD-03 | Search filter by customer name | unit (render) | `npx vitest run src/__tests__/screen-orders.test.jsx` | Wave 0 |
| ACT-01 | AcceptDialog onConfirm calls updateStatus mutation | unit (hook) | `npx vitest run src/__tests__/accept-dialog.test.jsx` | Wave 0 |
| ACT-01 | AcceptDialog: error toast on mutation failure, dialog stays open | unit (render) | `npx vitest run src/__tests__/accept-dialog.test.jsx` | Wave 0 |
| ACT-02 | Advance button calls updateStatus with correct toStatus | unit (mutation) | `npx vitest run src/__tests__/use-order-actions.test.js` (extend) | Partial |
| ACT-03 | CancelDialog: confirm disabled until reason selected | unit (render) | `npx vitest run src/__tests__/cancel-dialog.test.jsx` | Wave 0 |
| ACT-03 | CancelDialog: calls updateStatus with CANCELLED + reason | unit (render) | `npx vitest run src/__tests__/cancel-dialog.test.jsx` | Wave 0 |
| KDS-02 | KDS interval is 60000ms (not 30000ms) | unit (render) | `npx vitest run src/__tests__/screen-kitchen.test.jsx` | Wave 0 |
| KDS-03 | KDS urgency: border color critical when remaining ≤ 3 | unit (render) | `npx vitest run src/__tests__/screen-kitchen.test.jsx` | Wave 0 |
| KDS-04 | Sound plays on live SSE order_new, not on snapshot | unit (hook) | `npx vitest run src/__tests__/use-sse.test.js` (extend) | Partial |
| KDS-04 | Sound does NOT play when soundMuted=true | unit (hook) | `npx vitest run src/__tests__/use-sse.test.js` (extend) | Partial |
| KDS-05 | Bump button calls handleAdvance with correct next state | unit (render) | `npx vitest run src/__tests__/screen-kitchen.test.jsx` | Wave 0 |
| POS-01 | POS renders menu categories from useMenu() not static data | unit (render) | `npx vitest run src/__tests__/screen-pos.test.jsx` | Wave 0 |
| POS-02 | Adding item increments cart qty badge | unit (render) | `npx vitest run src/__tests__/screen-pos.test.jsx` | Wave 0 |
| POS-03 | Discount field: % mode calculates correct discountAmount | unit (logic) | `npx vitest run src/__tests__/screen-pos.test.jsx` | Wave 0 |
| POS-03 | Discount line hidden when discountValue is empty/zero | unit (render) | `npx vitest run src/__tests__/screen-pos.test.jsx` | Wave 0 |
| POS-04 | Order type toggle changes orderType state | unit (render) | `npx vitest run src/__tests__/screen-pos.test.jsx` | Wave 0 |
| POS-05 | Ring Up calls kitchen.orders.create with mapped body | unit (mutation) | `npx vitest run src/__tests__/screen-pos.test.jsx` | Wave 0 |
| POS-05 | Ring Up: 'dinein' maps to 'local' in SDK call | unit (mutation) | `npx vitest run src/__tests__/screen-pos.test.jsx` | Wave 0 |
| MENU-01 | Toggle calls updateStock with { productId, inStock } in body | unit (mutation) | `npx vitest run src/__tests__/screen-menu.test.jsx` | Wave 0 |
| MENU-02 | Menu screen renders inStock state from useMenu() not localStorage | unit (render) | `npx vitest run src/__tests__/screen-menu.test.jsx` | Wave 0 |
| SET-01 | Display tab lang toggle calls setLang | unit (render) | `npx vitest run src/__tests__/screen-settings.test.jsx` | Wave 0 |
| SET-02 | Display tab density toggle calls setDensity | unit (render) | `npx vitest run src/__tests__/screen-settings.test.jsx` | Wave 0 |
| SET-03 | Display tab accent picker calls setAccent | unit (render) | `npx vitest run src/__tests__/screen-settings.test.jsx` | Wave 0 |

### Wave 0 Gaps (test files to create before implementation begins)

- [ ] `src/__tests__/screen-orders.test.jsx` — ORD-01, ORD-03
- [ ] `src/__tests__/accept-dialog.test.jsx` — ACT-01
- [ ] `src/__tests__/cancel-dialog.test.jsx` — ACT-03
- [ ] `src/__tests__/screen-kitchen.test.jsx` — KDS-02, KDS-03, KDS-05
- [ ] `src/__tests__/screen-pos.test.jsx` — POS-01 through POS-05
- [ ] `src/__tests__/screen-menu.test.jsx` — MENU-01, MENU-02
- [ ] `src/__tests__/screen-settings.test.jsx` — SET-01, SET-02, SET-03

**Extend (not create):**
- `src/__tests__/use-sse.test.js` — extend with KDS-04 snapshot detection + mute tests
- `src/__tests__/use-order-actions.test.js` — extend with ACT-02 correct status enum tests
- `src/__tests__/store.test.js` — extend with `soundMuted` key and `setSoundMuted` action

### Sampling Rate
- **Per task commit:** `npx vitest run --reporter=verbose` (full suite, ~1.4s)
- **Per wave merge:** `npx vitest run --reporter=verbose`
- **Phase gate:** All tests green before `/gsd-verify-work`

---

## Project Constraints (from CLAUDE.md)

- **@charlyk/admin-client is the ONLY data layer** — no direct HTTP calls. All SDK methods used in Phase 4 are in `client.kitchen.*`.
- **window.* globals are forbidden** — `new Audio(...)` is a Web API browser global, NOT a `window.*` module proxy. This is fine to use in production code.
- **State split** — Zustand owns `soundMuted` (UI/session state). TanStack Query owns all menu and order server state. `soundMuted` is NOT a server value.
- **Screens call their own hooks** — PosScreen calls `useMenu()` directly. MenuScreen calls `useMenu()` directly. No prop-drilling from App. SettingsScreen calls `useAppStore` directly.
- **Design fidelity** — All new components must match the prototype visual spec. CancelDialog matches AcceptDialog visual language (overlay, radius, backdrop). DiscountField matches the existing totals row style.
- **TypeScript is out of scope** — All code is plain JavaScript (`.jsx`). No type annotations.
- **No per-item discounts** — This is a v2 requirement. Phase 4 implements order-level discount only.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | 19% VAT is the correct rate for this restaurant type | Open Questions #2 | POS tax line shows wrong amount; cosmetic impact only (server computes authoritative total) |
| A2 | `KitchenMenuResponse.categories[].products` field exists with product items | Pattern 4, Code Examples | Normalization fails; POS/Menu screens show empty; must inspect live API response and adjust field names |
| A3 | SSE 100ms snapshot window is sufficient to absorb initial batch | Pattern 2 | Sound plays on some snapshot orders; increase timeout to 200-500ms if false |
| A4 | `paymentType: undefined` (omitted) is acceptable for 'online' payment in `orders.create` | Open Questions #3 | API returns 400 if field required; handle by defaulting to 'card' for online payment |

---

## Sources

### Primary (HIGH confidence — verified against codebase)

- `node_modules/@charlyk/admin-client/dist/index.d.ts` — SDK type definitions. Verified: `CreateKitchenOrderBody`, `UpdateStockBody`, `UpdateOrderStatusBody`, `KitchenMenuResponse`, `CreateKitchenOrderResponse`, `UpdateProductStockData` (path: never), status enum values.
- `src/use-order-actions.js` — Established mutation pattern. Verified: `useMutation` with inline `onSuccess`/`onError` callbacks.
- `src/use-sse.js` — SSE hook current state. Verified: `onmessage` handler, `setIsConnected`, no snapshot detection yet.
- `src/store.js` — Zustand store. Verified: `partialize` list (6 keys), session-only keys, `setScreen` clears `selectedOrder`.
- `src/screen-pos.jsx` — Current POS state. Verified: static `MENU_CATEGORIES`/`MENU_ITEMS` imports, empty `onCreate`, existing totals structure.
- `src/screen-menu.jsx` — Current menu state. Verified: `localStorage.getItem('sc_avail')` usage, `AvailSwitch` component is visual-only.
- `src/app.jsx` — Current AcceptDialog state. Verified: `onConfirm` at line 140 shows toast only, does not call API.
- `src/icons.jsx` — Icon registry. Verified: `search` and `bell` icons exist; `sliders` does NOT exist (must add); `bell-off` does NOT exist (use `bell` + `x` overlay or add path).
- `public/notification.mp3` — Sound file exists at this path.
- `vitest.config.js` + `src/__tests__/setup.js` — Test infrastructure confirmed operational (80/80 tests passing).

### Secondary (MEDIUM confidence)

- SDK `KitchenMenuResponse` field names — typed as `{ [key: string]: unknown }`; actual field names confirmed from Phase 3 `use-menu.js` usage pattern (`result.data.categories`) but inner field names not confirmed without live API inspection.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new dependencies; all libraries verified in production use
- SDK API signatures: HIGH — read directly from `index.d.ts`
- Architecture: HIGH — all patterns verified against Phase 3 implementations
- Menu field names: LOW — `{ [key: string]: unknown }` type; requires runtime inspection
- Pitfalls: HIGH — `statusToSDK` mapping bug verified by reading SDK enum vs. app state; `updateStock` path:never verified by type

**Research date:** 2026-04-24
**Valid until:** 2026-05-24 (stable SDK; unlikely to change)
