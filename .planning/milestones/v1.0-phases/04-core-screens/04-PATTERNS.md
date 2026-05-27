# Phase 4: Core Screens - Pattern Map

**Mapped:** 2026-04-24
**Files analyzed:** 11 (9 modified, 1 new component, 1 new test set)
**Analogs found:** 11 / 11

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `src/app.jsx` | component (root orchestrator) | request-response | `src/app.jsx` (self) | exact — in-place modification |
| `src/store.js` | store | session state | `src/store.js` (self) | exact — add one key |
| `src/use-sse.js` | hook | event-driven | `src/use-sse.js` (self) | exact — extend existing hook |
| `src/screen-orders.jsx` | component/screen | CRUD + filter | `src/screen-orders.jsx` (self) | exact — add search state |
| `src/screen-kitchen.jsx` | component/screen | event-driven + timer | `src/screen-kitchen.jsx` (self) | exact — extend interval + add mute toggle |
| `src/screen-pos.jsx` | component/screen | CRUD + request-response | `src/screen-pos.jsx` (self) | exact — replace static data, add mutation |
| `src/screen-menu.jsx` | component/screen | CRUD + request-response | `src/screen-menu.jsx` (self) + `src/use-menu.js` | exact — replace static + localStorage |
| `src/screen-settings.jsx` | component/screen | request-response | `src/screen-settings.jsx` (self) | exact — add tab |
| `src/screen-detail.jsx` | component/screen | request-response | `src/screen-detail.jsx` (self) + `src/app.jsx` AcceptDialog | exact — add cancel button + CancelDialog |
| `src/i18n.jsx` | config/utility | transform | `src/i18n.jsx` (self) | exact — add key pairs |
| `CancelDialog` (in `src/app.jsx` or `src/screen-detail.jsx`) | component | request-response | `AcceptDialog` in `src/app.jsx` lines 149–225 | exact — same dialog shell, different content |

---

## Pattern Assignments

### `src/store.js` (store, session state)

**Analog:** `src/store.js` itself — add one session-only key alongside `selectedOrder`, `toasts`, `acceptDialog`.

**Session-only state block** (lines 53–55, the pattern to follow):
```javascript
// --- Session-only state (NOT persisted — reset on restart) ---
selectedOrder: null,     // Set by openOrder(); consumed by screen-detail
toasts: [],              // Managed by pushToast/dismissToast
acceptDialog: null,      // Set by setAcceptDialog(); consumed by AcceptDialog in app.jsx
```

**Add after `acceptDialog`:**
```javascript
soundMuted: false,       // KDS mute toggle (D-07) — session-only, NOT in partialize
```

**Add action after `setAcceptDialog`:**
```javascript
setSoundMuted: (v) => set({ soundMuted: v }),
```

**partialize exclusion rule** — `soundMuted` must NOT appear in `partialize` at lines 81–88. The existing `partialize` must continue to export exactly these 6 keys and nothing else:
```javascript
partialize: (state) => ({
  screen: state.screen,
  role: state.role,
  lang: state.lang,
  accent: state.accent,
  density: state.density,
  sidebarCollapsed: state.sidebarCollapsed,
}),
```

---

### `src/use-sse.js` (hook, event-driven)

**Analog:** `src/use-sse.js` itself — extend the existing `onopen` and `onmessage` handlers.

**Current signature** (line 17):
```javascript
export function useSSE(token) {
```

**New signature** — add optional second parameter:
```javascript
export function useSSE(token, onLiveOrder) {
```

**Snapshot detection ref** — add after `abortRef` (line 21):
```javascript
const snapshotDone = useRef(false);
```

**Extend `onopen`** (currently lines 36–42) — set snapshot flag after 100ms:
```javascript
async onopen(response) {
  if (response.ok) {
    setIsConnected(true);
    setTimeout(() => { snapshotDone.current = true; }, 100); // absorb initial snapshot batch silently
    return;
  }
  throw new Error(`SSE: server returned ${response.status}`);
},
```

**Extend `onmessage`** (currently lines 45–65) — call `onLiveOrder` after cache upsert, but only if snapshot is done:
```javascript
onmessage(msg) {
  if (msg.event === 'ping') return;
  if (msg.event === 'order_new') {
    try {
      const order = normalizeOrder(JSON.parse(msg.data));
      queryClient.setQueryData(['orders'], (old) => {
        const list = old?.orders ?? [];
        const idx = list.findIndex((o) => o.id === order.id);
        const next = idx >= 0
          ? list.map((o) => (o.id === order.id ? order : o))
          : [...list, order];
        return { orders: next };
      });
      // D-06: only call onLiveOrder for live events, not initial snapshot
      if (snapshotDone.current && onLiveOrder) {
        onLiveOrder();
      }
    } catch {
      // Malformed JSON from server — ignore silently
    }
  }
},
```

**useEffect dependency array** (line 81) — add `onLiveOrder`:
```javascript
}, [token, queryClient, onLiveOrder]);
```

---

### `src/app.jsx` (component/root, request-response)

**Three changes in this file.**

**Change 1 — Add `soundMuted` store selector and `handleLiveOrder` callback.**

Add after `const { updateStatus } = useOrderActions();` (line 49):
```javascript
const soundMuted = useAppStore((s) => s.soundMuted);
const setSoundMuted = useAppStore((s) => s.setSoundMuted);

const handleLiveOrder = useCallback(() => {
  if (!soundMuted) {
    new Audio('/sounds/new-order.mp3').play().catch(() => {});
  }
}, [soundMuted]);
```

Update `useSSE` call (line 45) to pass the callback:
```javascript
const { isConnected } = useSSE(token, handleLiveOrder);
```

Add `useCallback` to imports from `'react'` (line 1).

**Change 2 — Fix `AcceptDialog onConfirm`** (lines 139–143, currently toast-only).

The existing broken pattern (lines 139–143):
```javascript
onConfirm={(prepMin) => {
  pushToast({ id: Date.now(), kind: 'success', title: lang === 'ro' ? 'Comanda acceptata' : 'Order accepted', detail: acceptDialog.order.id + ' ' + prepMin + ' min' });
  setAcceptDialog(null);
}}
```

Replace entirely with (analog: `useOrderActions` mutation pattern from `src/use-order-actions.js` lines 14–26):
```javascript
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
        // dialog stays open intentionally — do NOT call setAcceptDialog(null)
      },
    }
  );
}}
```

**Change 3 — Add `statusToSDK` map and fix `handleAdvance`.**

The current `handleAdvance` (lines 51–53) passes `.toUpperCase()` directly, which breaks `'done'` → `'DONE'` (should be `'COMPLETED'`) and `'out'` → `'OUT'` (should be `'OUT_FOR_DELIVERY'`).

Add after imports (or at top of App function):
```javascript
const statusToSDK = {
  new: 'NEW',
  accepted: 'ACCEPTED',
  preparing: 'PREPARING',
  ready: 'READY',
  out: 'OUT_FOR_DELIVERY',
  done: 'COMPLETED',
  cancelled: 'CANCELLED',
};
```

Replace `handleAdvance` (lines 51–53):
```javascript
const handleAdvance = (order, toStatus) => {
  updateStatus.mutate({
    id: order.id,
    currentStatus: statusToSDK[order.state] ?? order.state.toUpperCase(),
    toStatus: statusToSDK[toStatus] ?? toStatus.toUpperCase(),
  });
};
```

**Change 4 — Add `CancelDialog` state and JSX** (see CancelDialog section below).

Add state: `const [cancelDialog, setCancelDialog] = useState(null);`

Add to screen router JSX for `detail` screen:
```javascript
{screen === 'detail' && selectedOrder && (
  <OrderDetailScreen
    order={selectedOrder}
    lang={lang}
    onBack={() => setScreen('orders')}
    onAdvance={handleAdvance}
    onPrint={() => {}}
    onCancel={() => setCancelDialog({ order: selectedOrder })}
    isOffline={isOffline}
  />
)}
```

Add `CancelDialog` JSX after `AcceptDialog` JSX:
```javascript
{cancelDialog && (
  <CancelDialog
    lang={lang}
    order={cancelDialog.order}
    onCancel={() => setCancelDialog(null)}
    onConfirm={(reason) => {
      updateStatus.mutate(
        { id: cancelDialog.order.id, currentStatus: statusToSDK[cancelDialog.order.state] ?? cancelDialog.order.state.toUpperCase(), toStatus: 'CANCELLED', reason },
        {
          onSuccess: () => {
            setCancelDialog(null);
            setScreen('orders');
            pushToast({ id: Date.now(), kind: 'success', title: t('cancel_success_title'), detail: t('cancel_success_detail') });
          },
          onError: () => {
            pushToast({ id: Date.now(), kind: 'error', title: t('cancel_error_title'), detail: t('check_connection') });
          },
        }
      );
    }}
  />
)}
```

---

### `CancelDialog` component (component, request-response)

**Analog:** `AcceptDialog` in `src/app.jsx` lines 149–225. Copy the dialog shell (overlay div, inner white card, header section, footer with two buttons). Replace the content section with a reason dropdown.

**Dialog overlay shell** — copy verbatim from AcceptDialog (lines 166–167):
```javascript
<div style={{ position: 'absolute', inset: 0, background: 'rgba(18, 24, 18, 0.45)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, animation: 'fadeIn 180ms ease-out' }}>
  <div style={{ width: 460, background: '#fff', borderRadius: 20, boxShadow: '0 30px 80px rgba(0,0,0,0.35)', overflow: 'hidden', border: '1px solid hsl(120 10% 88%)' }}>
```

**Component structure:**
```javascript
function CancelDialog({ lang, order, onCancel, onConfirm }) {
  const t = useT(lang);
  const [reason, setReason] = useState('');

  const reasons = [
    { value: 'customer_changed_mind', label: lang === 'ro' ? 'Clientul a renunțat' : 'Customer changed mind' },
    { value: 'out_of_ingredients',    label: lang === 'ro' ? 'Lipsă ingrediente'    : 'Out of ingredients' },
    { value: 'duplicate_order',       label: lang === 'ro' ? 'Comandă duplicată'    : 'Duplicate order' },
    { value: 'kitchen_cannot_fulfill',label: lang === 'ro' ? 'Bucătăria nu poate pregăti' : 'Kitchen cannot fulfill' },
    { value: 'other',                 label: lang === 'ro' ? 'Alt motiv'            : 'Other' },
  ];
  const canConfirm = reason !== '';

  return (
    <div style={{ position: 'absolute', inset: 0, background: 'rgba(18, 24, 18, 0.45)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, animation: 'fadeIn 180ms ease-out' }}>
      <div style={{ width: 460, background: '#fff', borderRadius: 20, boxShadow: '0 30px 80px rgba(0,0,0,0.35)', overflow: 'hidden', border: '1px solid hsl(120 10% 88%)' }}>
        {/* Header — same pattern as AcceptDialog header lines 168–172 */}
        <div style={{ padding: '20px 24px 8px', borderBottom: '1px solid hsl(120 10% 92%)' }}>
          <div className="eyebrow">{lang === 'ro' ? 'anulare comandă' : 'cancel order'}</div>
          <div style={{ fontWeight: 900, fontSize: 22, letterSpacing: '-0.02em' }}>{t('cancel_dialog_title')}</div>
          <div style={{ color: 'var(--sc-muted-foreground)', fontSize: 13, marginTop: 4 }}>{t('cancel_dialog_sub')}</div>
        </div>
        {/* Body — reason select */}
        <div style={{ padding: '16px 24px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--sc-muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>{t('cancel_reason_label')}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {reasons.map(r => (
              <button key={r.value} onClick={() => setReason(r.value)}
                style={{ padding: '12px 16px', borderRadius: 12, border: reason === r.value ? '1.5px solid var(--sc-terracotta)' : '1px solid hsl(120 10% 88%)', background: reason === r.value ? 'hsl(0 53% 58% / 0.08)' : '#fff', color: reason === r.value ? 'hsl(0 53% 42%)' : '#333', cursor: 'pointer', fontFamily: 'inherit', fontWeight: reason === r.value ? 700 : 500, fontSize: 13, textAlign: 'left' }}>
                {r.label}
              </button>
            ))}
          </div>
        </div>
        {/* Footer — copy AcceptDialog footer lines 216–221, swap primary button color */}
        <div style={{ padding: '14px 24px', borderTop: '1px solid hsl(120 10% 92%)', display: 'flex', gap: 10, background: '#fafaf6' }}>
          <button className="btn-secondary" onClick={onCancel} style={{ flex: '0 0 auto' }}>{t('back')}</button>
          <button
            className="btn-primary"
            style={{ flex: 1, justifyContent: 'center', height: 42, background: canConfirm ? 'var(--sc-terracotta)' : undefined, opacity: canConfirm ? 1 : 0.45, pointerEvents: canConfirm ? 'auto' : 'none' }}
            disabled={!canConfirm}
            onClick={() => onConfirm(reason)}
          >
            <Icon name="x" size={14} /> {canConfirm ? t('confirm_cancellation') : t('select_reason')}
          </button>
        </div>
      </div>
    </div>
  );
}
```

---

### `src/screen-orders.jsx` (component/screen, CRUD + filter)

**Analog:** `src/screen-orders.jsx` itself — add one `useState` for `searchQuery` and a filter step.

**Add state** alongside `filter` and `typeFilter` (lines 165–180):
```javascript
const [searchQuery, setSearchQuery] = useState('');
```

**Extend `visible` filter** (currently lines 182–188) — add text search step:
```javascript
const visible = orders.filter(o => {
  if (filter === 'preparing' && !['preparing', 'accepted'].includes(o.state)) return false;
  if (filter === 'ready' && !['ready', 'out'].includes(o.state)) return false;
  if (filter !== 'all' && filter !== 'preparing' && filter !== 'ready' && o.state !== filter) return false;
  if (typeFilter !== 'all' && o.type !== typeFilter) return false;
  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase();
    const matchId = String(o.dailyOrderNumber ?? '').includes(q);
    const matchName = (o.customer?.name ?? o.customerName ?? '').toLowerCase().includes(q);
    if (!matchId && !matchName) return false;
  }
  return o.state !== 'done';
});
```

**Add SearchInput** to the filter bar (after the two existing toggle groups, before `marginLeft: 'auto'` div at line 237). Follow the input style in `screen-pos.jsx` lines 95–97:
```javascript
<input
  type="search"
  placeholder={t('search_placeholder')}
  value={searchQuery}
  onChange={e => setSearchQuery(e.target.value)}
  style={{ padding: '7px 12px 7px 34px', border: '1px solid hsl(120 10% 90%)', borderRadius: 10, fontSize: 13, fontFamily: 'inherit', fontWeight: 500, background: '#fff', position: 'relative', width: 220 }}
/>
```
Wrap with a `position: relative` container holding an `<Icon name="search" size={14} />` as a leading icon (same pattern as Shell topbar search).

---

### `src/screen-kitchen.jsx` (component/screen, event-driven + timer)

**Two changes.**

**Change 1 — Fix timer interval.** Line 12: change `30000` to `60000`:
```javascript
const id = setInterval(() => force(v => v + 1), 60000);
```
Do NOT restructure the `useEffect` — the existing cleanup return at line 13 is correct.

**Change 2 — Add mute toggle.** Import `useAppStore` at top. Read `soundMuted` and `setSoundMuted`:
```javascript
import { useAppStore } from './store.js';
// Inside KitchenScreen:
const soundMuted = useAppStore((s) => s.soundMuted);
const setSoundMuted = useAppStore((s) => s.setSoundMuted);
```

Add mute toggle button to each Column header. The Column component currently renders a count badge on the right at line 28. Add the toggle only in the top-level KitchenScreen header row (outside Column), above the grid, using the existing `btn-secondary` class:
```javascript
// Above the Column grid — show mute toggle in KDS header
<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', marginBottom: 12 }}>
  <button
    className="btn-secondary"
    onClick={() => setSoundMuted(!soundMuted)}
    title={soundMuted ? (lang === 'ro' ? 'Activează sunet' : 'Unmute sound') : (lang === 'ro' ? 'Dezactivează sunet' : 'Mute sound')}
    style={{ display: 'flex', alignItems: 'center', gap: 6, opacity: soundMuted ? 0.6 : 1 }}
  >
    <Icon name="bell" size={14} />
    {soundMuted ? (lang === 'ro' ? 'Sunet oprit' : 'Muted') : (lang === 'ro' ? 'Sunet activ' : 'Sound on')}
  </button>
</div>
```

Note: `bell-off` icon does not exist in `src/icons.jsx`. Use `bell` icon for both states, relying on the label and opacity to communicate state. Or add a `bellOff` icon path to `ICON_PATHS` in `icons.jsx`.

---

### `src/screen-pos.jsx` (component/screen, CRUD + request-response)

**Three changes.**

**Change 1 — Replace static data with `useMenu()`.** Remove the `MENU_CATEGORIES`/`MENU_ITEMS` import from `data.jsx` (line 4). Add imports:
```javascript
import { useState, useMemo } from 'react';
import { useMenu } from './use-menu.js';
import { useAuth } from './auth.jsx';
import { useAppStore } from './store.js';
import { useMutation, useQueryClient } from '@tanstack/react-query';
```

Replace static data binding (lines 9–10) with live hook + normalization:
```javascript
function PosScreen({ lang, isOffline }) {  // remove 'onCreate' prop — handled internally now
  const t = useT(lang);
  const { client } = useAuth();
  const queryClient = useQueryClient();
  const pushToast = useAppStore((s) => s.pushToast);
  const { data: menuData, isLoading: menuLoading } = useMenu();

  const cats = useMemo(() => (menuData?.categories ?? []).map(c => ({
    id: c.id ?? String(c.categoryId ?? ''),
    ro: c.name ?? '',
    en: c.nameEn ?? c.name ?? '',
    icon: c.icon ?? 'utensils',
    items: (c.products ?? c.items ?? []).map(p => ({
      id: p.id ?? String(p.productId ?? ''),
      ro: p.name ?? '',
      en: p.nameEn ?? p.name ?? '',
      price: typeof p.price === 'number' ? p.price / 100 : 0,
      inStock: p.inStock !== false,
    })),
  })), [menuData]);
```

Update `visible` items (line 34): `const visible = (cats.find(c => c.id === cat)?.items ?? []).filter(it => it.inStock);`

Update category tab render: use `c[lang]` → `c[lang === 'ro' ? 'ro' : 'en']` or `c.ro` / `c.en`.

Update `add()` (lines 20–25): item name becomes `it[lang === 'ro' ? 'ro' : 'en']`.

**Change 2 — Add `discountValue` and `discountMode` state + discount line in totals:**
```javascript
const [discountValue, setDiscountValue] = useState('');
const [discountMode, setDiscountMode] = useState('pct'); // 'pct' | 'ron'

const discountAmount = useMemo(() => {
  const v = parseFloat(discountValue);
  if (!v || v <= 0) return 0;
  if (discountMode === 'pct') return +(subtotal * v / 100).toFixed(2);
  return Math.min(v, subtotal); // cap at subtotal
}, [discountValue, discountMode, subtotal]);
```

In the totals section (after `fee` row, before total row at line 143), add conditionally:
```javascript
{discountAmount > 0 && (
  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4, color: 'hsl(0 53% 42%)' }}>
    <span style={{ color: 'var(--sc-muted-foreground)' }}>{t('discount')}</span>
    <span style={{ fontWeight: 600 }}>−{formatRON(discountAmount)}</span>
  </div>
)}
```

Update `total` calculation: `const total = +(subtotal + fee - discountAmount).toFixed(2);`

Add discount input row above payment buttons (following the existing input style from lines 87–99):
```javascript
<div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 10 }}>
  <span style={{ fontSize: 12, color: 'var(--sc-muted-foreground)', fontWeight: 600, minWidth: 56 }}>{t('discount')}</span>
  <input
    type="number" min="0" value={discountValue}
    onChange={e => setDiscountValue(e.target.value)}
    placeholder="0"
    style={{ flex: 1, padding: '6px 10px', border: '1px solid hsl(120 10% 88%)', borderRadius: 8, fontFamily: 'inherit', fontSize: 13 }}
  />
  <button onClick={() => setDiscountMode(discountMode === 'pct' ? 'ron' : 'pct')}
    style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid hsl(120 10% 88%)', background: '#fff', fontWeight: 700, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>
    {discountMode === 'pct' ? '%' : 'RON'}
  </button>
</div>
```

**Change 3 — Add `createOrder` mutation and wire Ring Up button.**

Pattern sourced from `src/use-order-actions.js` lines 14–26 and SDK `CreateKitchenOrderBody`:
```javascript
const orderTypeMap = { dinein: 'local', pickup: 'pickup', delivery: 'delivery' };

const createOrder = useMutation({
  mutationFn: (orderData) => client.kitchen.orders.create({ body: orderData }),
  onSuccess: (result) => {
    queryClient.invalidateQueries({ queryKey: ['orders'] });
    pushToast({ id: Date.now(), kind: 'success', title: t('order_sent'), detail: `#${result.data?.dailyNumber}` });
    setCart([]);
    setDiscountValue('');
    setNote('');
    setCustomer({ name: '', phone: '', address: '' });
  },
  onError: () => {
    pushToast({ id: Date.now(), kind: 'error', title: t('order_error'), detail: t('check_connection') });
  },
});

const handleCreate = () => {
  const body = {
    orderType: orderTypeMap[type],
    items: cart.map(it => ({ productId: it.id, quantity: it.qty })),
    ...(customer.name  ? { customerName: customer.name }  : {}),
    ...(customer.phone ? { customerPhone: customer.phone } : {}),
    ...(note           ? { notes: note }                   : {}),
    paymentType: payment === 'online' ? undefined : payment,
    ...(type === 'delivery' && customer.address
      ? { deliveryAddress: { street: customer.address, number: '' } }
      : {}),
  };
  createOrder.mutate(body);
};
```

Update Ring Up button (line 162): `onClick={() => handleCreate()}` and disable when `createOrder.isPending`:
```javascript
disabled={cart.length === 0 || isOffline || createOrder.isPending}
```

Remove `onCreate` from `PosScreen` function signature — the mutation is now internal. Update app.jsx to stop passing `onCreate` prop.

---

### `src/screen-menu.jsx` (component/screen, CRUD + request-response)

**Analog:** `src/screen-menu.jsx` itself (for structure) + `src/use-order-actions.js` lines 14–26 (for the mutation).

**Change 1 — Replace static data + localStorage with `useMenu()` + `useMutation`.**

Remove `MENU_CATEGORIES`/`MENU_ITEMS` imports. Remove `localStorage` state (lines 11–23). Add imports:
```javascript
import { useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useMenu } from './use-menu.js';
import { useAuth } from './auth.jsx';
import { useAppStore } from './store.js';
```

Replace static data binding (lines 7–8) with live hooks:
```javascript
function MenuScreen({ lang }) {
  const { client } = useAuth();
  const queryClient = useQueryClient();
  const pushToast = useAppStore((s) => s.pushToast);
  const { data: menuData, isLoading } = useMenu();

  const cats = useMemo(() => (menuData?.categories ?? []).map(c => ({
    id: c.id ?? String(c.categoryId ?? ''),
    ro: c.name ?? '',
    en: c.nameEn ?? c.name ?? '',
    icon: c.icon ?? 'utensils',
    items: (c.products ?? c.items ?? []).map(p => ({
      id: p.id ?? String(p.productId ?? ''),
      ro: p.name ?? '',
      en: p.nameEn ?? p.name ?? '',
      price: typeof p.price === 'number' ? p.price / 100 : 0,
      inStock: p.inStock !== false,
    })),
  })), [menuData]);

  const allItems = useMemo(() => cats.flatMap(c => c.items), [cats]);
```

**Change 2 — Replace `setAvail` local state with `useMutation`.** Pattern follows `use-order-actions.js` exactly:
```javascript
const toggleStock = useMutation({
  mutationFn: ({ productId, inStock }) =>
    client.kitchen.products.updateStock({ body: { productId, inStock } }),  // NO path param — D-25
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ['menu'] }),
  onError: () => pushToast({ id: Date.now(), kind: 'error', title: lang === 'ro' ? 'Eroare la actualizare stoc' : 'Stock update failed', detail: '' }),
});
```

Update `AvailSwitch` call (line 140) — replace `onChange={v => setAvail({ ...avail, [it.id]: v })}` with:
```javascript
onChange={v => toggleStock.mutate({ productId: it.id, inStock: v })}
```

Replace `avail[it.id]` reads (lines 103, 104, 126, 129, etc.) with `it.inStock` from normalized item object.

Remove `toggleAll` function (lines 35–39) and both "All available" / "All out" buttons (lines 86–92) — these did bulk localStorage writes. Replace with disabled greyed-out buttons or simply remove.

---

### `src/screen-settings.jsx` (component/screen, request-response)

**Analog:** `src/screen-settings.jsx` itself — add one tab entry and its content panel.

**Add `useAppStore` import and selectors:**
```javascript
import { useAppStore } from './store.js';
// Inside SettingsScreen:
const lang = useAppStore((s) => s.lang);   // NOTE: may already come from prop — use prop if available
const setLang = useAppStore((s) => s.setLang);
const accent = useAppStore((s) => s.accent);
const setAccent = useAppStore((s) => s.setAccent);
const density = useAppStore((s) => s.density);
const setDensity = useAppStore((s) => s.setDensity);
```

**Add Display tab entry** (lines 11–16) — follow exact same object shape:
```javascript
{ id: 'display', label: lang === 'ro' ? 'Afișaj' : 'Display', icon: 'grid' },
```
Note: `sliders` icon does NOT exist in `icons.jsx` (verified). Use `grid` or add `sliders` path to ICON_PATHS.

**Add `{tab === 'display' && ...}` content panel** — follow the same pattern as `{tab === 'tax' && ...}` (lines 54–78), using a `card` with inner rows for each control:

```javascript
{tab === 'display' && (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 560 }}>
    {/* Language toggle — same pill toggle style as filter bars in screen-orders.jsx lines 218–226 */}
    <div className="card" style={{ padding: 20 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--sc-muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>{t('display_lang_label')}</div>
      <div style={{ display: 'inline-flex', background: '#fff', border: '1px solid hsl(120 10% 90%)', borderRadius: 10, padding: 3 }}>
        {['ro', 'en'].map(l => (
          <button key={l} onClick={() => setLang(l)}
            style={{ border: 0, background: lang === l ? 'var(--sc-primary)' : 'transparent', color: lang === l ? '#fff' : '#555', padding: '7px 20px', borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
            {l === 'ro' ? 'Română' : 'English'}
          </button>
        ))}
      </div>
    </div>

    {/* Density toggle — same pill toggle */}
    <div className="card" style={{ padding: 20 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--sc-muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>{t('display_density_label')}</div>
      <div style={{ display: 'inline-flex', background: '#fff', border: '1px solid hsl(120 10% 90%)', borderRadius: 10, padding: 3 }}>
        {['balanced', 'dense'].map(d => (
          <button key={d} onClick={() => setDensity(d)}
            style={{ border: 0, background: density === d ? 'var(--sc-primary)' : 'transparent', color: density === d ? '#fff' : '#555', padding: '7px 20px', borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
            {d === 'balanced' ? (lang === 'ro' ? 'Echilibrat' : 'Balanced') : (lang === 'ro' ? 'Compact' : 'Dense')}
          </button>
        ))}
      </div>
    </div>

    {/* Accent color picker — 4 color swatches */}
    <div className="card" style={{ padding: 20 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--sc-muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>{t('display_accent_label')}</div>
      <div style={{ display: 'flex', gap: 10 }}>
        {[
          { id: 'sage',       color: 'hsl(120 14% 49%)', label: 'Sage' },
          { id: 'indigo',     color: 'hsl(230 50% 55%)', label: 'Indigo' },
          { id: 'terracotta', color: 'hsl(0 53% 52%)',   label: 'Terracotta' },
          { id: 'charcoal',   color: 'hsl(120 8% 25%)',  label: 'Charcoal' },
        ].map(a => (
          <button key={a.id} onClick={() => setAccent(a.id)} title={a.label}
            style={{ width: 36, height: 36, borderRadius: '50%', background: a.color, border: accent === a.id ? '3px solid var(--sc-foreground)' : '3px solid transparent', outline: accent === a.id ? `2px solid ${a.color}` : 'none', cursor: 'pointer' }} />
        ))}
      </div>
    </div>
  </div>
)}
```

---

### `src/screen-detail.jsx` (component/screen, request-response)

**Analog:** `src/screen-detail.jsx` itself — add a Cancel button to the right action panel, plus an `onCancel` prop.

**Update function signature** (line 7):
```javascript
function OrderDetailScreen({ order, lang, onBack, onAdvance, onPrint, onCancel, isOffline }) {
```

**Add Cancel button** to the right panel (after existing advance button at lines 206–219). Only visible for non-terminal states:
```javascript
{order.state !== 'done' && order.state !== 'cancelled' && (
  <button
    className="btn-secondary"
    style={{ height: 44, justifyContent: 'center', fontSize: 14, color: 'hsl(0 53% 42%)', borderColor: 'hsl(0 53% 58% / 0.4)' }}
    disabled={isOffline}
    onClick={() => onCancel && onCancel(order)}
  >
    <Icon name="x" size={14} /> {t('cancel_order')}
  </button>
)}
```

The CancelDialog itself lives in `app.jsx` — `onCancel` is just a callback from `screen-detail.jsx` up to `app.jsx`. This keeps the dialog mounted at root level (same pattern as AcceptDialog).

---

### `src/i18n.jsx` (config/utility, transform)

**Analog:** `src/i18n.jsx` itself. Add key-value pairs in both `ro` and `en` sections, following the exact same flat object structure.

Keys to add (both `ro` and `en` sections):

```javascript
// AcceptDialog API wiring (ACT-01)
accept_success_title: 'Comandă acceptată' / 'Order accepted',
accept_error_title: 'Eroare la acceptare' / 'Accept failed',
check_connection: 'Verifică conexiunea' / 'Check your connection',

// CancelDialog (ACT-03)
cancel_dialog_title: 'Anulează comanda' / 'Cancel order',
cancel_dialog_sub: 'Selectează motivul anulării. Această acțiune nu poate fi anulată.' / 'Select a reason. This action cannot be undone.',
cancel_reason_label: 'Motiv anulare' / 'Cancellation reason',
cancel_success_title: 'Comandă anulată' / 'Order cancelled',
cancel_success_detail: 'Comanda a fost anulată cu succes.' / 'The order has been cancelled.',
cancel_error_title: 'Eroare la anulare' / 'Cancel failed',
confirm_cancellation: 'Confirmă anularea' / 'Confirm cancellation',
select_reason: 'Selectează un motiv' / 'Select a reason',
cancel_order: 'Anulează comanda' / 'Cancel order',
back: 'Înapoi' / 'Back',

// POS order creation (POS-05)
order_sent: 'Comandă trimisă' / 'Order sent',
order_error: 'Eroare la trimitere' / 'Order failed',
discount: 'Discount' / 'Discount',

// Settings Display tab (SET-01, SET-02, SET-03)
display_lang_label: 'Limbă' / 'Language',
display_density_label: 'Densitate' / 'Density',
display_accent_label: 'Culoare accent' / 'Accent colour',
```

---

## Shared Patterns

### Mutation Pattern
**Source:** `src/use-order-actions.js` lines 14–26  
**Apply to:** `createOrder` mutation in screen-pos.jsx, `toggleStock` mutation in screen-menu.jsx, AcceptDialog `onConfirm`, CancelDialog `onConfirm`

```javascript
const myMutation = useMutation({
  mutationFn: (args) => client.kitchen.someMethod({ body: args }),
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ['orders'] }),
  // Per-call onSuccess/onError via second arg to .mutate():
});
// Call as:
myMutation.mutate(args, {
  onSuccess: (result) => { /* close dialog + toast */ },
  onError: () => { pushToast({ id: Date.now(), kind: 'error', title: t('...'), detail: t('check_connection') }); },
});
```

### Toast Pattern
**Source:** `src/app.jsx` lines 140–142  
**Apply to:** All mutation success/error handlers

```javascript
pushToast({ id: Date.now(), kind: 'success', title: t('some_key'), detail: 'optional detail string' });
pushToast({ id: Date.now(), kind: 'error',   title: t('error_key'), detail: t('check_connection') });
```

### Store Selector Pattern
**Source:** `src/app.jsx` lines 23–41  
**Apply to:** Any screen that needs to read from store directly (SettingsScreen, KitchenScreen)

```javascript
const soundMuted = useAppStore((s) => s.soundMuted);
const setSoundMuted = useAppStore((s) => s.setSoundMuted);
```

### Filter Toggle Bar Pattern
**Source:** `src/screen-orders.jsx` lines 217–226  
**Apply to:** SearchInput container, Display tab toggles in settings

```javascript
<div style={{ display: 'inline-flex', background: '#fff', border: '1px solid hsl(120 10% 90%)', borderRadius: 10, padding: 3 }}>
  {items.map(f => (
    <button key={f.id} onClick={() => setActive(f.id)}
      style={{ border: 0, background: active === f.id ? 'var(--sc-primary)' : 'transparent', color: active === f.id ? '#fff' : '#555', padding: '7px 14px', borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
      {f.label}
    </button>
  ))}
</div>
```

### Menu Normalization Pattern
**Source:** `src/use-menu.js` return value shape + SDK KitchenMenuResponse  
**Apply to:** PosScreen and MenuScreen `useMemo` normalization blocks

```javascript
const cats = useMemo(() => (menuData?.categories ?? []).map(c => ({
  id: c.id ?? String(c.categoryId ?? ''),
  ro: c.name ?? '',
  en: c.nameEn ?? c.name ?? '',
  icon: c.icon ?? 'utensils',
  items: (c.products ?? c.items ?? []).map(p => ({
    id: p.id ?? String(p.productId ?? ''),
    ro: p.name ?? '',
    en: p.nameEn ?? p.name ?? '',
    price: typeof p.price === 'number' ? p.price / 100 : 0,
    inStock: p.inStock !== false,
  })),
})), [menuData]);
```
**Note:** Field names inside `categories[].products` are unknown at type level (`{ [key: string]: unknown }`). Add a `console.log('raw menu:', result.data)` in `use-menu.js` queryFn for one run to inspect actual names, then finalize. Remove before commit.

### useT Bilingual Pattern
**Source:** `src/i18n.jsx` line 266–268  
**Apply to:** All new string keys

```javascript
const t = useT(lang);
// Use: t('my_key') — returns ro or en string
// Add keys to BOTH ro and en sections of I18N object
```

---

## No Analog Found

All files in Phase 4 have direct analogs in the existing codebase. No files require falling back to RESEARCH.md patterns — however, note the following caveat:

| Concern | Note |
|---|---|
| `CancelDialog` component body | No pre-existing cancel dialog; copy `AcceptDialog` shell exactly, replace content |
| `statusToSDK` mapping | No existing status mapping utility; new object in `app.jsx` or `data.jsx` |
| `sliders` icon | Does NOT exist in `icons.jsx`. Use `grid` for Display tab icon, or add SVG path to ICON_PATHS |
| `bellOff` icon | Does NOT exist in `icons.jsx`. Use `bell` + opacity state, or add SVG path |
| `public/sounds/new-order.mp3` | `public/notification.mp3` already exists. Create `public/sounds/` directory and copy/rename. |

---

## Critical Anti-Patterns (from RESEARCH.md — must NOT repeat)

1. **`orderType: 'dinein'` in SDK call** — map to `'local'` via `orderTypeMap` before calling `orders.create`.
2. **`updateStock({ path: { id }, body: { inStock } })`** — `path` is `never`. Use `{ body: { productId, inStock } }` only.
3. **`order.state.toUpperCase()` for status enum** — use `statusToSDK` map; `'done'` must become `'COMPLETED'`, `'out'` must become `'OUT_FOR_DELIVERY'`.
4. **Sound on snapshot events** — only call `onLiveOrder()` when `snapshotDone.current === true`.
5. **Discount line on zero value** — use `discountAmount > 0` guard before rendering the discount line.
6. **Storing lang/density/accent in local state** — Display tab must call `setLang`/`setDensity`/`setAccent` from `useAppStore` directly; never shadow these in `useState`.

---

## Test Pattern

**Source:** `src/__tests__/use-order-actions.test.js` and `src/__tests__/use-sse.test.js`  
**Apply to:** All new test files

Test file boilerplate (all 7 new test files follow this header):
```javascript
vi.mock('@tauri-apps/plugin-store', () => ({
  load: vi.fn().mockResolvedValue({
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(undefined),
  }),
}))
vi.mock('@charlyk/admin-client', () => ({ signIn: vi.fn(), createAdminClient: vi.fn() }))
vi.mock('@tauri-apps/plugin-opener', () => ({ open: vi.fn(), openUrl: vi.fn() }))
vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }))

// For hooks that use useAuth:
vi.mock('../auth.jsx', () => ({ useAuth: vi.fn() }))
```

QueryClient wrapper (copy from `use-order-actions.test.js` lines 41–42):
```javascript
const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
function w({ children }) { return createElement(QueryClientProvider, { client: qc }, children) }
```

---

## Metadata

**Analog search scope:** `src/` directory (all .jsx and .js files)
**Files scanned:** 14 source files, 2 test files
**Pattern extraction date:** 2026-04-24
