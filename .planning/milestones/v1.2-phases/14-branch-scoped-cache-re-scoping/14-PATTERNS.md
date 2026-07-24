# Phase 14: Branch-Scoped Cache Re-Scoping - Pattern Map

**Mapped:** 2026-07-22
**Files analyzed:** 11 modified + 1 new helper + 5 new/extended test files
**Analogs found:** 11 / 11 (all in-repo, self-referential retrofit — every file's analog is a sibling file of the same shape)

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `src/use-orders.js` | hook (query) | CRUD (read) | `src/use-order-detail.js` (simpler sibling, already exact shape) | exact — self is the template |
| `src/use-order-detail.js` | hook (query) | CRUD (read) | `src/use-orders.js` | exact |
| `src/use-stats.js` | hook (query) | CRUD (read) | `src/use-restaurant-settings.js` | exact |
| `src/use-menu.js` | hook (query) | CRUD (read) | `src/use-restaurant-settings.js` | exact |
| `src/use-history-orders.js` | hook (query) | CRUD (read), range-filtered | `src/use-orders.js` (status-filtered sibling) | exact, minus error-path (see Pitfall 5) |
| `src/use-restaurant-settings.js` | hook (query) | CRUD (read) | `src/use-stats.js` | exact |
| `src/use-delivery-areas.js` | hook (query) | CRUD (read) | `src/use-restaurant-settings.js` | exact |
| `src/use-order-actions.js` | hook (mutation) | CRUD (write) + invalidation | itself — 2 mutations, identical shape | exact — internal duplication |
| `src/screen-pos.jsx` (~172) | component (mutation call site) | event-driven (onSuccess invalidation) | `src/screen-menu.jsx` (~40) | role-match |
| `src/screen-menu.jsx` (~40) | component (mutation call site) | event-driven (onSuccess invalidation) | `src/screen-pos.jsx` (~172) | role-match |
| `src/screen-orders.jsx` (~281) | component (manual refresh handler) | event-driven (onClick invalidation) | `src/use-order-actions.js` (onSuccess double-invalidate) | role-match |
| `src/data.jsx` (`unwrapSdkResult`, NEW) | utility (data transform) | transform | `normalizeOrder` in same file | exact — same file, same "shared data-shaping helper" role |
| `src/__tests__/use-order-detail.test.js` (NEW) | test | unit | `src/__tests__/use-orders.test.js` | exact |
| `src/__tests__/use-stats.test.js` (NEW) | test | unit | `src/__tests__/use-orders.test.js` (U11b `useMenu` describe block) | exact |
| `src/__tests__/use-restaurant-settings.test.js` (NEW) | test | unit | `src/__tests__/use-orders.test.js` | exact |
| `src/__tests__/use-delivery-areas.test.js` (NEW) | test | unit | `src/__tests__/use-orders.test.js` | exact |
| `src/__tests__/data-unwrap-sdk-result.test.js` (NEW) | test | unit | none direct — plain function unit test, no React/mock scaffolding needed | n/a, trivial |
| `src/__tests__/use-order-actions.test.js` (EXTEND) | test | unit, sibling-cache assertion | itself (existing `qc.setQueryData(['orders'], ...)` + `invalidateSpy` pattern) | exact |

## Pattern Assignments

### `src/use-orders.js` (hook, CRUD-read) — the template for all 6 sibling hooks

**Current full source** (`src/use-orders.js:1-25`):
```javascript
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

**Retrofit shape (apply identically to all 6 sibling hooks):**
```javascript
import { useAppStore } from './store.js';
import { normalizeOrder, unwrapSdkResult } from './data.jsx';

export function useOrders(status) {
  const { client } = useAuth();
  const branchId = useAppStore((s) => s.currentBranch?.id) ?? null;

  return useQuery({
    queryKey: status ? ['orders', branchId, status] : ['orders', branchId],
    queryFn: async () => {
      const result = await client.kitchen.orders.list({ query: status ? { status } : {} });
      const { orders, ...rest } = unwrapSdkResult(result, 'Failed to list orders');
      return { ...rest, orders: orders.map(normalizeOrder) };
    },
    enabled: !!client, // UNCHANGED — never !!branchId (D-08)
    staleTime: 30_000, // UNCHANGED
  });
}
```

**Store import pattern** — `useAppStore` selector, verified at `src/store.js:68,116`:
```javascript
currentBranch: null,     // SelectedBranch | null (from getMe()); session-only; NEVER in partialize (D-10)
setCurrentBranch: (branch) => set({ currentBranch: branch }),
```
Import as `import { useAppStore } from './store.js';` then `useAppStore((s) => s.currentBranch?.id)` — this is a plain component/hook-body selector call (valid — `use-orders.js` etc. are hook bodies, not callbacks).

---

### `src/use-order-detail.js` (hook, CRUD-read)

**Current full source** (`src/use-order-detail.js:1-17`):
```javascript
import { useQuery } from '@tanstack/react-query';
import { useAuth } from './auth.jsx';
import { normalizeOrder } from './data.jsx';

export function useOrderDetail(id) {
  const { client } = useAuth();
  return useQuery({
    queryKey: ['order', id],
    queryFn: async () => {
      const result = await client.kitchen.orders.get({ path: { id } });
      if (result.error) throw new Error(result.error.error ?? 'Failed to get order');
      return normalizeOrder(result.data.order);
    },
    enabled: !!client && !!id,
    staleTime: 0,
  });
}
```
**Retrofit:** key line → `queryKey: ['order', branchId, id],`; error line → `return normalizeOrder(unwrapSdkResult(result, 'Failed to get order').order);` — `enabled: !!client && !!id` stays exactly as-is (id-gating is unrelated to branch-gating; D-08 only forbids adding `!!branchId`).

---

### `src/use-stats.js` (hook, CRUD-read) — simplest template, best analog for use-restaurant-settings / use-delivery-areas

**Current full source** (`src/use-stats.js:1-16`):
```javascript
import { useQuery } from '@tanstack/react-query';
import { useAuth } from './auth.jsx';

export function useStats() {
  const { client } = useAuth();
  return useQuery({
    queryKey: ['stats'],
    queryFn: async () => {
      const result = await client.admin.dashboard.getToday();
      if (result.error) throw new Error(result.error.error ?? 'Failed to load stats');
      return result.data;
    },
    enabled: !!client,
    staleTime: 30_000,
  });
}
```
**Retrofit:** `queryKey: ['stats', branchId],`; error line → `return unwrapSdkResult(result, 'Failed to load stats');`

---

### `src/use-menu.js` (hook, CRUD-read)

**Current full source** (`src/use-menu.js:1-21`):
```javascript
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
    staleTime: 5 * 60 * 1000, // D-14: 5 minutes
  });
}
```
**Retrofit:** `queryKey: ['menu', branchId],`; error line → `return unwrapSdkResult(result, 'Failed to list menu');`

---

### `src/use-restaurant-settings.js` (hook, CRUD-read)

**Current full source** (`src/use-restaurant-settings.js:1-16`):
```javascript
import { useQuery } from '@tanstack/react-query';
import { useAuth } from './auth.jsx';

export function useRestaurantSettings() {
  const { client } = useAuth();
  return useQuery({
    queryKey: ['restaurant-settings'],
    queryFn: async () => {
      const result = await client.admin.settings.list({});
      if (result.error) throw new Error(result.error.error ?? 'Failed to fetch restaurant settings');
      return result.data;
    },
    enabled: !!client,
    staleTime: 5 * 60 * 1000,
  });
}
```
**Retrofit:** `queryKey: ['restaurant-settings', branchId],`; error line → `return unwrapSdkResult(result, 'Failed to fetch restaurant settings');`

---

### `src/use-delivery-areas.js` (hook, CRUD-read)

**Current full source** (`src/use-delivery-areas.js:1-20`):
```javascript
import { useQuery } from '@tanstack/react-query';
import { useAuth } from './auth.jsx';

export function useDeliveryAreas() {
  const { client } = useAuth();
  return useQuery({
    queryKey: ['delivery-areas'],
    queryFn: async () => {
      const result = await client.kitchen.deliveryAreas.list({});
      if (result.error) throw new Error(result.error.error ?? 'Failed to fetch delivery areas');
      return (result.data?.deliveryAreas ?? []).map((a) => ({
        id: String(a.id ?? ''),
        name: String(a.name ?? ''),
        fee: (a.fee ?? 0) / 100, // API returns cents
      }));
    },
    enabled: !!client,
    staleTime: 5 * 60 * 1000,
  });
}
```
**Retrofit:** `queryKey: ['delivery-areas', branchId],`; error line →
```javascript
const data = unwrapSdkResult(result, 'Failed to fetch delivery areas');
return (data?.deliveryAreas ?? []).map((a) => ({ ... })); // unchanged mapping
```

---

### `src/use-history-orders.js` (hook, CRUD-read, range-filtered) — KEY-ONLY change, see Pitfall 5

**Current full source** (`src/use-history-orders.js:1-70`) — has a load-bearing `.diagnostic` debug enrichment tied to an **open** production investigation (`windows-history-network-error`, referenced in the file's own top-of-file comment, lines 19-31). **Do NOT route this hook's error path through `unwrapSdkResult()`** — only change the query key.

Current key line (`use-history-orders.js:41`):
```javascript
queryKey: ['history-orders', from, to],
```
Retrofit (key only):
```javascript
const branchId = useAppStore((s) => s.currentBranch?.id) ?? null;
queryKey: ['history-orders', branchId, from, to],
```
Everything else in the file (the entire `if (result.error) {...}` diagnostic block, lines 46-63) stays untouched. Flag this explicitly in the plan as an intentional exception to the "all 7 hooks route through `unwrapSdkResult`" rule.

**Verify before finalizing:** check whether `.planning/debug/windows-history-network-error` is still open — if closed, the planner may choose to fold this into `unwrapSdkResult` after all (Claude's Discretion per CONTEXT.md/RESEARCH.md Assumption A2), but default to preserving it.

---

### `src/data.jsx` — NEW `unwrapSdkResult()` helper (colocation analog: `normalizeOrder`)

**Analog** (`src/data.jsx:195-198`, `normalizeOrder`'s opening shape — a plain exported function, no React/hook dependency, pure data transform):
```javascript
export function normalizeOrder(o) {
  const cRON = (v) => (v ?? 0) / 100; // SDK returns monetary values in cents
  const rawState = o.state ?? o.status ?? '';
  const state = SDK_STATE_MAP[rawState] ?? (rawState.toLowerCase() || 'new');
  ...
```
`data.jsx` has zero imports today (confirmed: file starts directly with `export const MENU_CATEGORIES`) — a leaf module, safe for colocation, no import-cycle risk.

**New helper to add**, following the same "plain exported function operating on the SDK's `{data,error}` result shape" convention as `normalizeOrder` operates on the SDK's order shape:
```javascript
// unwrapSdkResult — shared SDK {data,error} envelope unwrap (D-05, corrected per RESEARCH Pitfall 1:
// the SDK's generic Error type is `{ error: string }`, not `{ error: { code, ... } }` — no separate
// .code field exists at runtime for these hooks' declared error unions).
export function unwrapSdkResult(result, fallbackMessage) {
  if (result.error) {
    const raw = result.error;
    const message = (typeof raw === 'string' ? raw : raw?.error) ?? fallbackMessage;
    const err = new Error(message);
    err.code = message; // same string serves as the matchable code (Phase 17 consumes err.code)
    throw err;
  }
  return result.data;
}
```

---

### `src/use-order-actions.js` (hook, mutation + invalidation)

**Current full source** (`src/use-order-actions.js:1-47`):
```javascript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './auth.jsx';

export function useOrderActions() {
  const { client } = useAuth();
  const queryClient = useQueryClient();

  const updateStatus = useMutation({
    mutationFn: ({ id, currentStatus, toStatus, estimatedMinutes, reason }) =>
      client.kitchen.orders.updateStatus({
        path: { id },
        body: { currentStatus, toStatus, ...(estimatedMinutes != null ? { estimatedMinutes } : {}), ...(reason != null ? { reason } : {}) },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['order'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
    },
  });

  const updateEstimatedTime = useMutation({
    mutationFn: ({ id, estimatedMinutes }) =>
      client.kitchen.orders.updateEstimatedTime({ path: { id }, body: { estimatedMinutes } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['order'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
    },
  });

  return { updateStatus, updateEstimatedTime };
}
```
**Retrofit** — add `import { useAppStore } from './store.js';`, read `const branchId = useAppStore((s) => s.currentBranch?.id) ?? null;` **once at the top of the hook body** (valid — this IS the hook's own render, not a callback; per RESEARCH Pitfall 4, do NOT use `useAppStore.getState()` here since this is a proper hook body), then close over `branchId` in both `onSuccess` blocks:
```javascript
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: ['orders', branchId] });
  queryClient.invalidateQueries({ queryKey: ['order', branchId] });
  queryClient.invalidateQueries({ queryKey: ['stats', branchId] });
},
```
Apply identically to both `updateStatus` and `updateEstimatedTime`.

---

### `src/screen-pos.jsx` (~line 172) — POS submit invalidation

**Current** (`src/screen-pos.jsx:169-173`, inside `createOrder` mutation's `onSuccess`):
```javascript
const createOrder = useMutation({
  mutationFn: (orderData) => client.kitchen.orders.create({ body: orderData }),
  onSuccess: (result) => {
    queryClient.invalidateQueries({ queryKey: ['orders'] });
    pushToast({ id: Date.now(), kind: 'success', title: t('order_sent'), ... });
    ...
```
**Retrofit:** this is a component body (has `useAppStore` selector available at render time, same as any hook body) — add `const branchId = useAppStore((s) => s.currentBranch?.id) ?? null;` near the top of the component, then:
```javascript
queryClient.invalidateQueries({ queryKey: ['orders', branchId] });
```

---

### `src/screen-menu.jsx` (~line 40) — stock toggle invalidation

**Current** (`src/screen-menu.jsx:37-40`):
```javascript
const toggleStock = useMutation({
  mutationFn: ({ productId, inStock }) => client.kitchen.products.updateStock({ body: { productId, inStock } }),
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ['menu'] }),
  onError: () => pushToast({ ... }),
```
**Retrofit:** add branchId selector near top of component, then `onSuccess: () => queryClient.invalidateQueries({ queryKey: ['menu', branchId] }),`

---

### `src/screen-orders.jsx` (~line 281) — manual refresh button

**Current** (`src/screen-orders.jsx:281`):
```javascript
<button className="btn-secondary" onClick={() => { queryClient.invalidateQueries({ queryKey: ['orders'] }); queryClient.invalidateQueries({ queryKey: ['stats'] }); }}>
```
**Retrofit:** add branchId selector near top of component, then:
```javascript
onClick={() => { queryClient.invalidateQueries({ queryKey: ['orders', branchId] }); queryClient.invalidateQueries({ queryKey: ['stats', branchId] }); }}
```

---

## Test Patterns

### Analog: `src/__tests__/use-orders.test.js` (full source read, 86 lines) — the template for all 4 new hook test files

Mock scaffolding block (identical across all hook test files, copy verbatim):
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
vi.mock('../auth.jsx', () => ({ useAuth: vi.fn() }))
```
Note: **do NOT mock `../store.js`** — import and use the real `useAppStore`, seeding via `.setState()` (see below), per RESEARCH.md's Test Convention section, itself citing `auth-token.test.jsx:154`.

Hook test body pattern (`use-orders.test.js:29-49`):
```javascript
describe('...', () => {
  test('...', async () => {
    const mockOrders = [{ id: 'ord-001', status: 'NEW' }]
    const mockClient = { kitchen: { orders: { list: vi.fn().mockResolvedValue({ data: { orders: mockOrders }, error: null }) } } }
    useAuth.mockReturnValue({ client: mockClient })

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    function w({ children }) { return createElement(QueryClientProvider, { client: qc }, children) }

    const { result } = renderHook(() => useOrders(), { wrapper: w })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data.orders).toHaveLength(1)
  })
})
```

**New branch-scoping assertion to add** (per RESEARCH.md's Phase Requirements → Test Map, SC1): seed `useAppStore.setState({ currentBranch: { id: 'branch-a', ... } })` before `renderHook`, then assert `result.current` (or inspect `qc.getQueryCache()`) reflects a key containing `'branch-a'`. Import the real store:
```javascript
import { useAppStore } from '../store.js'
// ...
beforeEach(() => { useAppStore.setState({ currentBranch: null }) }) // reset between tests
```

### `auth-token.test.jsx:154` — the `.setState({currentBranch})` seeding precedent

```javascript
expect(freshUseAppStore.getState().currentBranch).toEqual(FAKE_ME.selectedBranch)
```
This confirms `currentBranch` is read/written via plain `useAppStore.getState()`/`.setState()` in tests — no special store mock needed, exactly as RESEARCH.md's Test Convention section prescribes.

### `use-order-actions.test.js:59-91` — sibling-branch-untouched pattern to extend (SC2)

**Current test** (to extend, not replace):
```javascript
test('updateStatus invalidates [\'orders\'] cache on success', async () => {
  const mockUpdateStatus = vi.fn().mockResolvedValue({ data: {}, error: null })
  const mockClient = { kitchen: { orders: { updateStatus: mockUpdateStatus, updateEstimatedTime: vi.fn().mockResolvedValue({ data: {}, error: null }) } } }
  useAuth.mockReturnValue({ client: mockClient })

  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  qc.setQueryData(['orders'], [{ id: 'ord-001', status: 'NEW' }])   // ← pre-populate cache
  const invalidateSpy = vi.spyOn(qc, 'invalidateQueries')
  function w({ children }) { return createElement(QueryClientProvider, { client: qc }, children) }

  const { result } = renderHook(() => useOrderActions(), { wrapper: w })
  await act(async () => {
    await result.current.updateStatus.mutateAsync({ id: 'ord-001', currentStatus: 'NEW', toStatus: 'IN_PROGRESS' })
  })

  expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['orders'] })   // ← update to ['orders', 'branch-a']
})
```
**New sibling-branch-untouched assertion to add** (the single most important new test in this phase, per RESEARCH.md Wave 0 Gaps):
```javascript
test('updateStatus invalidates only current branch — sibling branch cache untouched (SC2)', async () => {
  useAppStore.setState({ currentBranch: { id: 'branch-a', name: 'A', slug: 'a', isDefault: true, isActive: true } })
  const mockClient = { kitchen: { orders: { updateStatus: vi.fn().mockResolvedValue({ data: {}, error: null }), updateEstimatedTime: vi.fn() } } }
  useAuth.mockReturnValue({ client: mockClient })

  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  qc.setQueryData(['orders', 'branch-a'], [{ id: 'ord-001' }])
  qc.setQueryData(['orders', 'branch-b'], [{ id: 'ord-002' }])   // sibling branch
  function w({ children }) { return createElement(QueryClientProvider, { client: qc }, children) }

  const { result } = renderHook(() => useOrderActions(), { wrapper: w })
  await act(async () => {
    await result.current.updateStatus.mutateAsync({ id: 'ord-001', currentStatus: 'NEW', toStatus: 'IN_PROGRESS' })
  })

  expect(qc.getQueryData(['orders', 'branch-b'])).toEqual([{ id: 'ord-002' }]) // untouched
})
```

### NEW `data-unwrap-sdk-result.test.js` — trivial plain-function unit test, no analog needed

```javascript
import { unwrapSdkResult } from '../data.jsx'

describe('unwrapSdkResult (D-05, SC3)', () => {
  test('returns result.data when no error', () => {
    expect(unwrapSdkResult({ data: { foo: 1 }, error: null }, 'fallback')).toEqual({ foo: 1 })
  })
  test('throws with populated .code on bare-string error', () => {
    try { unwrapSdkResult({ data: null, error: 'BRANCH_INACTIVE' }, 'fallback'); throw new Error('should have thrown') }
    catch (err) { expect(err.code).toBe('BRANCH_INACTIVE') }
  })
  test('throws with populated .code on { error: string } object error', () => {
    try { unwrapSdkResult({ data: null, error: { error: 'Branch is inactive' } }, 'fallback'); throw new Error('should have thrown') }
    catch (err) { expect(err.code).toBe('Branch is inactive') }
  })
})
```

## Shared Patterns

### Branch-scoped query key (all 7 fetch hooks)
**Source:** `src/use-orders.js:13` (current), retrofit shown per-file above.
**Apply to:** `use-orders.js`, `use-order-detail.js`, `use-stats.js`, `use-menu.js`, `use-history-orders.js`, `use-restaurant-settings.js`, `use-delivery-areas.js`.
**Rule (D-07):** `branchId` is always present as the fixed second segment — `currentBranch?.id ?? null` — never a variable-length fork on branchId presence (only the existing per-hook param, e.g. `status`, still forks the key length).

### `unwrapSdkResult()` error unwrap
**Source:** NEW helper in `src/data.jsx`, colocated with `normalizeOrder`.
**Apply to:** all 7 fetch hooks' `if (result.error) throw new Error(...)` lines EXCEPT `use-history-orders.js` (preserve its `.diagnostic` enrichment — Pitfall 5).

### Exact-key invalidation, never prefix-only unscoped
**Source:** `src/use-order-actions.js:26-28,40-42` (current, unscoped) → branch-scoped per Pattern above.
**Apply to:** `use-order-actions.js` (×2 mutations, 3 invalidations each), `screen-pos.jsx:172`, `screen-menu.jsx:40`, `screen-orders.jsx:281` (×2 invalidations).

### `useAppStore` branch-id read — hook-body vs callback distinction
**Source:** `src/store.js:68,116` (state shape), `src/__tests__/auth-token.test.jsx:154` (`.setState`/`.getState()` test-seeding precedent).
**Rule (RESEARCH Pitfall 4):** inside a component/hook render body (all 7 fetch hooks, `use-order-actions.js`'s own function body, `screen-pos.jsx`/`screen-menu.jsx`/`screen-orders.jsx` component bodies), use the selector-hook form `useAppStore((s) => s.currentBranch?.id) ?? null`. Never call this hook form inside a `useMutation`'s `onSuccess` callback — none of this phase's call sites actually need `.getState()` since every invalidation call site is inside a component or hook body, not a truly non-component context (that pattern — `useAppStore.getState()` — exists only in `auth.jsx`'s window-focus listener, unrelated to this phase).

## No Analog Found

None — every file in this phase's scope has an exact same-shape sibling already in the repo (the retrofit is explicitly described in RESEARCH.md as "mechanical and near-identical across 7 files").

## Metadata

**Analog search scope:** `src/*.js`, `src/*.jsx`, `src/__tests__/*.test.js(x)` — no Glob/Grep search needed beyond what CONTEXT.md/RESEARCH.md already named explicitly (both documents had already read every file directly); this pass re-read each named file to capture exact current line content for excerpting.
**Files scanned:** 11 source files + 3 test files (2 existing + auth-token.test.jsx for the seeding precedent) = 14
**Pattern extraction date:** 2026-07-22
</content>
