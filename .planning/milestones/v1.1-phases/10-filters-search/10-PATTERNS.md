# Phase 10: Filters + Search - Pattern Map

**Mapped:** 2026-07-17
**Files analyzed:** 5 (3 modified, 1 boundary-fix, 1 shared i18n; plus 4 existing test files extended)
**Analogs found:** 5 / 5

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|--------------------|------|-----------|-----------------|---------------|
| `src/screen-history.jsx` (FilterBar, HistoryScreen, SummaryStrip, EmptyBlock) | component | CRUD (client-side filter/derive) | `src/screen-orders.jsx:162-196` (live filter+search) AND `sitecare-orders/project/src/screen-history.jsx:143-269` (design layout) | role-match (production) / exact (design layout) |
| `src/history-utils.js` (+matchesStatus, matchesType, foldDiacritics, matchesSearch) | utility (pure derivation) | transform | `src/history-utils.js` itself — `deriveDisplayStatus`, `filterFinishedOrders`, `computeSummary` (same file, same conventions) | exact |
| `src/data.jsx:222` (`normalizeOrder` boundary fix) | utility (data normalization boundary) | transform | `src/data.jsx:195-222` (`normalizeOrder`, same function) + `src/screen-pos.jsx:12` (`orderTypeMap`, the outbound map being inverted) | exact |
| `src/i18n.jsx` (+h_status_* reorder confirm, +h_empty_filtered_*, +h_clear_filters) | config (i18n dictionary) | CRUD (static key/value) | `src/i18n.jsx:210-238` (`ro`) / `:441-469` (`en`) — existing `h_*` history keys | exact |
| `src/__tests__/history-utils.test.js`, `normalize-order.test.js`, `screen-history.test.jsx`, `screen-orders.test.jsx` | test | transform / request-response | same files, existing `describe`/`test` blocks | exact |

## Pattern Assignments

### `src/screen-history.jsx` — FilterBar restructure + filter state (component, CRUD)

**Analog A (production, current inert bar):** `src/screen-history.jsx:294-345`
**Analog B (design, target structure):** `sitecare-orders/project/src/screen-history.jsx:227-269`

**Current inert structure to replace** (`src/screen-history.jsx:298-345`):
```javascript
function FilterBar({ t }) {
  const periods = [ ... ];
  const statusFilters = [
    { id: 'all', label: t('all') },
    { id: 'completed', label: t('h_status_completed') },
    { id: 'canceled', label: t('h_status_canceled') },   // ⚠ swapped vs design (F-03) — fix order
    { id: 'refunded', label: t('h_status_refunded') },
  ];
  const inertBtn = { border: 0, padding: '7px 12px', borderRadius: 8, fontWeight: 600, fontSize: 13, fontFamily: 'inherit', cursor: 'not-allowed', pointerEvents: 'none' };
  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
      {/* period pills — disabled */}
      {/* status pills — disabled, unrolled */}
      <div className="search" style={{ width: 220, opacity: 0.5, pointerEvents: 'none', cursor: 'not-allowed' }}>
        <Icon name="search" size={15} style={{ color: 'var(--sc-muted-foreground)' }} />
        <input placeholder={t('h_search')} disabled />
      </div>
      <div style={{ marginLeft: 'auto', opacity: 0.5, pointerEvents: 'none', cursor: 'not-allowed' }}>
        <button className="btn-secondary" disabled><Icon name="download" size={14} /> {t('h_export')}</button>
      </div>
    </div>
  );
}
```

**Design's target nesting — D-07's `marginLeft: auto` container wraps search + export together** (`sitecare-orders/project/src/screen-history.jsx:250-268`):
```javascript
{/* Type — D-07/F-03: new pill group, cream selected style per Claude's Discretion */}
<div style={{ display: 'inline-flex', background: '#fff', border: '1px solid hsl(120 10% 90%)', borderRadius: 10, padding: 3 }}>
  {typeFilters.map(f => (
    <button key={f.id} onClick={() => setTypeFilter(f.id)}
      style={{ border: 0, background: typeFilter === f.id ? '#f7f1e1' : 'transparent', color: typeFilter === f.id ? 'var(--sc-primary)' : '#777', padding: '7px 11px', borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6 }}>
      <Icon name={f.icon} size={13} /> {f.label}
    </button>
  ))}
</div>

{/* D-07: ONE marginLeft:auto container holding BOTH search and export — this is the exact
    nesting change production lacks (search is currently a standalone flex child at :335,
    Export alone in its own auto-margin div at :339). Merge them into one div. */}
<div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
  <div className="search" style={{ width: 220 }}>
    <Icon name="search" size={15} style={{ color: 'var(--sc-muted-foreground)' }} />
    <input value={query} onChange={e => setQuery(e.target.value)} placeholder={t('h_search')} />
  </div>
  <button className="btn-secondary" disabled /* stays inert — Phase 11 */>
    <Icon name="download" size={14} /> {t('h_export')}
  </button>
</div>
```

**Status pill count badge pattern** (`sitecare-orders/project/src/screen-history.jsx:240-248`):
```javascript
<div style={{ display: 'inline-flex', background: '#fff', border: '1px solid hsl(120 10% 90%)', borderRadius: 10, padding: 3 }}>
  {statusFilters.map(f => (
    <button key={f.id} onClick={() => setStatus(f.id)}
      style={{ border: 0, background: status === f.id ? 'var(--sc-primary)' : 'transparent', color: status === f.id ? '#fff' : '#555', padding: '7px 12px', borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6 }}>
      {f.label}
      <span style={{ fontSize: 11, background: status === f.id ? 'rgba(255,255,255,0.25)' : 'hsl(120 10% 90%)', padding: '1px 6px', borderRadius: 999, fontWeight: 700 }}>{f.count}</span>
    </button>
  ))}
</div>
```
⚠ **Do not use `summary.orders - cancelCount - refundCount` arithmetic** for the counts (that's the design's period-wide shortcut, rejected by D-01/D-02). Instead compute `statusFilters[].count` from the `byTypeAndSearch` derived array per Pattern 1 in RESEARCH.md — tally via `deriveDisplayStatus`, not subtraction.

**Two-derived-set memo chain** (RESEARCH.md Pattern 1, to add inside `HistoryScreen`, replacing the current single `finished`→`days`/`summary` chain at `src/screen-history.jsx:218-220`):
```javascript
const finished = useMemo(() => filterFinishedOrders(data ?? []), [data]);

// D-02: type+search only — feeds counts
const byTypeAndSearch = useMemo(
  () => finished.filter((o) => matchesType(o, typeFilter) && matchesSearch(o, debouncedQuery)),
  [finished, typeFilter, debouncedQuery]
);

// full filter — feeds rows/day-groups/summary (D-04)
const visible = useMemo(
  () => byTypeAndSearch.filter((o) => matchesStatus(o, statusFilter)),
  [byTypeAndSearch, statusFilter]
);

const days = useMemo(() => groupOrdersByDay(visible), [visible]);       // was finished
const summary = useMemo(() => computeSummary(visible), [visible]);       // was finished
```

**Debounce timer** (RESEARCH.md Pattern 2 — no existing codebase precedent; hand-roll per `useEffect`+`setTimeout`+cleanup):
```javascript
const [query, setQuery] = useState('');
const [debouncedQuery, setDebouncedQuery] = useState('');
useEffect(() => {
  if (query === '') { setDebouncedQuery(''); return; } // D-10: clear is immediate
  const id = setTimeout(() => setDebouncedQuery(query), 250);
  return () => clearTimeout(id);
}, [query]);
```

**Avg tile gate fix (D-15/Pitfall 5)** — current code at `src/screen-history.jsx:251`:
```javascript
// BEFORE
value: summary.avg === null ? (isEmptyState ? formatRON(0) : '—') : formatRON(summary.avg),
// AFTER (D-15) — gate on isError, not isEmptyState; isError is already computed at :216 destructure
value: summary.avg === null ? (isError ? '—' : formatRON(0)) : formatRON(summary.avg),
```

**EmptyBlock — two variants (D-13/D-14)**, analog is the existing single-variant block (`src/screen-history.jsx:104-111`):
```javascript
function EmptyBlock({ t }) {
  return (
    <div style={{ textAlign: 'center', padding: 48, color: 'var(--sc-muted-foreground)' }}>
      <div style={{ fontSize: 15, fontWeight: 600 }}>{t('h_empty')}</div>
      <div style={{ fontSize: 13, marginTop: 4 }}>{t('h_empty_sub')}</div>
    </div>
  );
}
```
Extend with a `filtersActive` boolean prop: when true, swap the main line to `t('h_empty_filtered_title')` (new key, D-13) and render a Clear Filters button (D-14) that resets `statusFilter`/`typeFilter`/`query` (NOT period) — follow the existing `ErrorBlock`'s retry-button shape (`src/screen-history.jsx:92-102`, `<button className="btn-secondary" onClick={...}><Icon .../> {t(...)}</button>`) for the Clear Filters button markup.

---

### `src/history-utils.js` — new pure predicates (utility, transform)

**Analog:** the module's own existing exported pure functions — `filterFinishedOrders` (`:187-189`), `deriveDisplayStatus` (`:196-201`). Same file — copy the JSDoc + no-react/no-SDK header convention exactly.

**Existing precedence function to build on top of, never reimplement** (`src/history-utils.js:196-201`):
```javascript
export function deriveDisplayStatus(order) {
  if (order.paymentCaptureStatus === 'refunded') return 'refunded'
  if (order.status === 'CANCELLED') return 'canceled'
  if (order.status === 'COMPLETED') return 'completed'
  return null
}
```

**New predicates to add** (RESEARCH.md Code Examples — verified pattern, matches module conventions: named export, JSDoc with `@param`/`@returns`, arrow-free `function` declarations):
```javascript
export function matchesStatus(order, statusFilter) {
  if (statusFilter === 'all') return true
  return deriveDisplayStatus(order) === statusFilter
}

export function matchesType(order, typeFilter) {
  if (typeFilter === 'all') return true
  return order.type === typeFilter
}

export function foldDiacritics(s) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '')
}

export function matchesSearch(order, query) {
  const q = foldDiacritics(query.trim().toLowerCase())
  if (!q) return true
  const numLabel = String(
    typeof order.dailyOrderNumber === 'number' ? order.dailyOrderNumber : order.id.slice(0, 8)
  ).toLowerCase()
  const name = foldDiacritics((order.customer?.name ?? '').toLowerCase())
  return numLabel.includes(q) || name.includes(q)
}
```
⚠ **Module contract, unchanged (`src/history-utils.js:1-8` header):** no `react`, no `data.jsx`, no `@charlyk/admin-client` imports. These four functions are pure and take already-normalized orders as input — same as every existing export in this file.

---

### `src/data.jsx` — `normalizeOrder` boundary fix (utility, transform)

**Analog:** the function itself, `src/data.jsx:195-250` — one-line change inside an existing large object-literal return.

**Exact line to change** (`src/data.jsx:222`):
```javascript
// BEFORE
type: o.type ?? o.orderType ?? 'dinein',

// AFTER (D-08)
type: (o.type ?? o.orderType) === 'local' ? 'dinein' : (o.type ?? o.orderType ?? 'dinein'),
```

**Inversion source — the outbound map already proving `dinein`↔`local` is a deliberate concept** (`src/screen-pos.jsx:12`):
```javascript
const orderTypeMap = { dinein: 'local', pickup: 'pickup', delivery: 'delivery' };
```

**Regression check sites (read-only, do not modify unless a test fails):**
- `src/screen-orders.jsx:183-195` — the live `visible` filter; `:187` (`if (typeFilter !== 'all' && o.type !== typeFilter) return false;`) is F-02's defect site — the filter logic itself needs NO change, only the upstream `type` value now arrives correct.
- `src/screen-orders.jsx:15-22` (`typeMeta`) — no `'local'` key, already falls through to `map.dinein`; rendering byte-identical before/after.
- `src/use-orders.js:20`, `src/use-history-orders.js:29`, `src/use-order-detail.js:12`, `src/use-sse.js:58` — all four call `normalizeOrder`; no changes needed there, the fix is fully upstream.

---

### `src/i18n.jsx` — new keys (config, CRUD)

**Analog:** existing `h_*` block, `ro` (`:210-238`) and `en` (`:441-469`), plus the type-label block already present (`:24-26` ro / `:264-266` en — no new keys needed there per CONTEXT.md).

**Existing status-key shape to add nothing new to (labels exist; only D-07/F-03 render ORDER changes in `screen-history.jsx`, not new i18n keys):**
```javascript
// ro (already present, :215-217)
h_status_completed: 'Finalizate',
h_status_canceled: 'Anulate',
h_status_refunded: 'Rambursate',
```

**New keys to add (D-13/D-14)** — place adjacent to the existing `h_empty`/`h_empty_sub` pair (`:237-238` ro, `:468-469` en); ⚠ check first for any pre-existing `h_empty_filtered*`/`h_clear*` key (v1.0 hit duplicate-key issues twice per CONTEXT.md):
```javascript
// ro — proposed keys, exact strings are Claude's Discretion (bounded by D-13's example copy)
h_empty_filtered_title: 'Nicio comandă nu se potrivește cu filtrele active.',
h_clear_filters: 'Șterge filtrele',

// en — mirror
h_empty_filtered_title: 'No orders match the active filters.',
h_clear_filters: 'Clear filters',
```

---

## Shared Patterns

### Pure predicate module contract
**Source:** `src/history-utils.js:1-8` (module header comment)
**Apply to:** `matchesStatus`, `matchesType`, `foldDiacritics`, `matchesSearch` — all four new exports
```javascript
// Pure, React-free, SDK-free derivation layer for the History screen (Phase 7).
// ...never import react/data.jsx/@charlyk/admin-client — this module must stay pure and
// unit-testable without a DOM.
```

### Faceted two-derived-set filtering (D-01/D-02)
**Source:** RESEARCH.md Pattern 1 (no existing codebase precedent — `screen-orders.jsx`'s counts are simple non-faceted `.filter().length` against the unfiltered list, a genuinely different and simpler pattern NOT to copy)
**Apply to:** `HistoryScreen`'s memo chain — `byTypeAndSearch` (counts) vs `visible` (rows), never a single `.filter()` for both.

### Debounce with immediate-clear escape hatch (D-10)
**Source:** RESEARCH.md Pattern 2 — no existing debounce precedent in codebase (`screen-orders.jsx`'s search, `:188-191`, is undebounced — precedent for predicate shape only, NOT timing).
**Apply to:** the search `query`→`debouncedQuery` state pair in `HistoryScreen`.

### i18n key placement
**Source:** `src/i18n.jsx` — every user-facing string lives in both `ro` (top block) and `en` (bottom block) with matching key names.
**Apply to:** `h_empty_filtered_title`, `h_clear_filters`.

### `deriveDisplayStatus` precedence — single source of truth
**Source:** `src/history-utils.js:196-201`
**Apply to:** `matchesStatus` — must call `deriveDisplayStatus`, never re-implement refunded/canceled/completed precedence inline.

## No Analog Found

None — every file touched by this phase has a same-file or same-repo analog (production `screen-orders.jsx` for filter/search shape, design `screen-history.jsx` for target layout, `history-utils.js` itself for the new pure predicates' conventions).

## Metadata

**Analog search scope:** `src/*.jsx`, `src/*.js`, `src/__tests__/*`, `sitecare-orders/project/src/screen-history.jsx` (design source)
**Files scanned:** `src/screen-history.jsx`, `src/history-utils.js`, `src/data.jsx`, `src/screen-orders.jsx`, `src/screen-pos.jsx`, `src/i18n.jsx`, `src/__tests__/history-utils.test.js`, `src/__tests__/normalize-order.test.js`, `sitecare-orders/project/src/screen-history.jsx`
**Pattern extraction date:** 2026-07-17
