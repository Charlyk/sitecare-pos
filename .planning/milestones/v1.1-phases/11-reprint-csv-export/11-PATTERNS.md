# Phase 11: Reprint + CSV Export - Pattern Map

**Mapped:** 2026-07-18
**Files analyzed:** 12 (7 source modifications + 4 config/manifest modifications + 4 test files, with overlap)
**Analogs found:** 12 / 12 (all files modify existing code; every target has a direct in-file or sibling-file analog — no wholly new files this phase)

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|--------------------|------|-----------|-----------------|----------------|
| `src/history-utils.js` (add `buildCsv`) | utility (pure fn) | transform | same file — `groupOrdersByDay`/`deriveDisplayStatus`/`foldDiacritics` (lines 237-313, 323-325) | exact |
| `src/screen-detail.jsx` (readOnly print row) | component | request-response (click → callback) | same file — `!readOnly` print row (lines 261-270) | exact |
| `src/screen-detail.jsx` (printer-configured mount check) | component (hook) | event-driven (mount effect) | `src/screen-printer.jsx` mount effect (lines 42-67) | exact |
| `src/app.jsx` (add `onPrint={handlePrint}` to history-detail route) | route/wiring | request-response | same file — live `detail` route (line 252) | exact |
| `src/screen-history.jsx` (activate `h_export` button) | component | file-I/O (Save dialog + write) | same file — inert Export button (lines 834-846) + `visible` memo (lines 379-382) | exact |
| `src/i18n.jsx` (new keys) | config (i18n table) | CRUD (static lookup) | same file — `h_export` key pair (lines 240, 480) | exact |
| `src/data.jsx` (confirm `normalizeOrder` fields) | model/transform | transform | same file — `normalizeOrder` (lines 200-209 region) | exact (read-only confirmation, no new fields needed) |
| `package.json` (new deps) | config | — | existing `@tauri-apps/plugin-store`/`plugin-updater`/`plugin-window-state` entries (lines 16-21) | exact |
| `src-tauri/Cargo.toml` (new deps) | config | — | existing `tauri-plugin-store`/`tauri-plugin-opener`/`tauri-plugin-process` entries (lines 20-33) | exact |
| `src-tauri/src/lib.rs` (plugin registration) | config/bootstrap | — | existing `.plugin(...)` chain (lines 426-433) | exact |
| `src-tauri/capabilities/default.json` (permission grant) | config | — | existing `permissions` array (whole file, 8 lines) | exact |
| `src/__tests__/*.test.jsx` extensions | test | request-response / transform | `src/__tests__/print-receipt.test.jsx` (plugin-mocking pattern, lines 1-26) | exact |

## Pattern Assignments

### `src/history-utils.js` — add `buildCsv(orders)` (utility, transform)

**Analog:** same file, existing pure functions (`deriveDuration` lines 237-262, `groupOrdersByDay` lines 285-313, `foldDiacritics` lines 323-325)

**Module conventions to follow** (file header, lines 1-8):
```javascript
// Pure, React-free, SDK-free derivation layer for the History screen (Phase 7).
// ...
// Operates on ALREADY-normalized orders (see src/data.jsx normalizeOrder): order.total is in
// RON, order.placedAt is present. Never re-divide by 100 here, and never import react/data.jsx/
// @charlyk/admin-client — this module must stay pure and unit-testable without a DOM.
```
`buildCsv` MUST NOT import react, data.jsx, or @charlyk/admin-client — matches the module's stated invariant (also called out explicitly in RESEARCH Open Question 1).

**JSDoc + traceability comment style to mirror** (from `deriveDuration`, lines 203-236):
```javascript
/**
 * D-XX: <one-line what/why>. Never <forbidden shortcut>. Returns <shape> or null when <condition>
 * — never a guessed/defaulted value.
 * @param {object} order — an already-normalized order
 * @returns {...}
 */
```

**Local helper convention** (`pad`, `localDayKey`, lines 264-275) — module-private helpers are plain `function`/arrow declarations below the exported functions that need them, not exported themselves:
```javascript
const pad = (n) => String(n).padStart(2, '0')
function localDayKey(iso) { ... }
```
Use this exact pattern for a private local-time formatter and `escapeCsvField`/`orderToCsvRow` (per RESEARCH Pattern 3 / Open Question 1 — do not import `orderTimeLabel` from `data.jsx`).

**Status derivation reuse** — call the existing exported `deriveDisplayStatus(order)` (lines 191-201) for the CSV `status` column; do not re-derive precedence:
```javascript
export function deriveDisplayStatus(order) {
  if (order.paymentCaptureStatus === 'refunded') return 'refunded'
  if (order.status === 'CANCELLED') return 'canceled'
  if (order.status === 'COMPLETED') return 'completed'
  return null
}
```

**Core transform pattern** — RESEARCH.md's Pattern 3 code block is the concrete starting point (already cites this file's convention); key structural requirement per RESEARCH Pitfall 5: every field mapped positionally and unconditionally via `escapeCsvField(value ?? '')`, never omitted:
```javascript
const CSV_HEADERS = ['order_number','placed_at','type','status','customer','phone','payment','subtotal','delivery_fee','tip','tax','discount','total']

function escapeCsvField(value) {
  const s = value == null ? '' : String(value)
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}
```
Add a formula-injection guard per RESEARCH's Threat Patterns section (flagged gap, not yet in D-12): prefix fields starting with `= + - @` (and tab/CR) with a leading `'` before quoting.

**Empty-orders / partial-field behavior:** `orders.length === 0` → header-only string (still BOM-prefixed); a field that is `undefined`/`null` (e.g. `customer.phone: null`, no `deliveryFee` on a dine-in order) serializes as `""`, never dropped (RESEARCH Pitfall 5).

---

### `src/screen-detail.jsx` — readOnly print-button row + printer-configured check (component, request-response)

**Analog A (button row to mirror):** same file, `!readOnly` print row, lines 261-270:
```jsx
{!readOnly && (
<div style={{ display: 'flex', gap: 8 }}>
  <button className="btn-secondary" style={{ flex: 1, justifyContent: 'center' }} onClick={() => onPrint(order, 'kitchen')}>
    <Icon name="printer" size={14} /> {t('print_kitchen')}
  </button>
  <button className="btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={() => onPrint(order, 'customer')}>
    <Icon name="printer" size={14} /> {t('print_customer')}
  </button>
</div>
)}
```
This block sits at lines 258-270, immediately after `<ThermalTicket .../>` and immediately before the `!readOnly` Advance button (line 273) — the new `readOnly &&` block goes in the same position, gated the opposite direction, so the Advance/Cancel controls below stay hidden in read-only mode (D-03).

**Analog B (mount-time store read for a gating boolean):** `src/screen-printer.jsx` lines 42-67 — the existing `load('preferences.json')` → `store.get('printer')` mount effect, adapted per RESEARCH Pattern 1:
```javascript
useEffect(() => {
  load('preferences.json', { autoSave: false })
    .then((store) => store.get('printer'))
    .then((config) => {
      const savedPort = config?.port ?? null;
      if (savedPort) { ... }
    })
    .catch(() => { /* store unavailable fallback */ });
}, []);
```
Adapt to a boolean-only local state (`printerConfigured`), gated on `readOnly` per RESEARCH Pattern 1 (only the read-only detail needs this; the live detail keeps `handlePrint`'s own click-time guard unchanged).

**Disabled/greyed style convention (D-05):** copy the exact inline-style dimming already used for the inert Export button (`src/screen-history.jsx:843`):
```javascript
style={{ opacity: 0.5, pointerEvents: 'none', cursor: 'not-allowed' }}
```
Combine with `disabled={!printerConfigured}` and `title={!printerConfigured ? t('print_configure_hint') : undefined}` per D-06 — the new tooltip i18n key.

**`onPrint` prop signature already exists** — no new prop threading needed inside this file; `onPrint` is already a prop on `OrderDetailScreen` (used by the live `!readOnly` block). The read-only caller (`app.jsx`) is what's currently missing the value — see next section.

---

### `src/app.jsx` — add `onPrint={handlePrint}` to `history-detail` route (route/wiring, request-response)

**Analog:** same file, the live `detail` route two lines above, line 252:
```jsx
{screen === 'detail'  && selectedOrder && <OrderDetailScreen order={selectedOrder} lang={lang} restaurantSettings={restaurantSettings} deliveryAreas={deliveryAreas} onBack={() => setScreen('orders')} onAdvance={handleAdvance} onPrint={handlePrint} onCancel={() => setCancelDialog({ order: selectedOrder })} isOffline={isOffline} />}
```

**Current (buggy — missing `onPrint`) `history-detail` block, lines 254-267:**
```jsx
{screen === 'history-detail' && historyOrder && (
  <OrderDetailScreen
    order={mergedHistoryOrder}
    lang={lang}
    restaurantSettings={restaurantSettings}
    deliveryAreas={deliveryAreas}
    readOnly
    detailLoading={historyDetailPending}
    detailError={historyDetailError}
    onRetryDetail={refetchHistoryDetail}
    onBack={() => setScreen('history')}
    isOffline={isOffline}
  />
)}
```
Add `onPrint={handlePrint}` as a new prop line in this block — `handlePrint` itself (lines 127-176) needs ZERO changes; it already reads printer config from the store, calls `invoke('print_receipt', ...)`, and fires `toast_printed`/`print_failed` toasts. This is RESEARCH's Pitfall 1 — must be an explicit, separately-verified task, not assumed to be covered by the `screen-detail.jsx` edit.

---

### `src/screen-history.jsx` — activate `h_export` button (component, file-I/O)

**Analog:** same file, the currently-inert button, lines 843-845:
```jsx
<button className="btn-secondary" disabled style={{ opacity: 0.5, pointerEvents: 'none', cursor: 'not-allowed' }}>
  <Icon name="download" size={14} /> {t('h_export')}
</button>
```
Replace `disabled` (hardcoded) with `disabled={visible.length === 0}` and the style spread conditioned on that same boolean; add `title={visible.length === 0 ? t('h_export_empty_tooltip') : undefined}` and an `onClick={handleExportCsv}`.

**Data source (already exists, do not re-derive):** the `visible` memo, lines 379-382:
```javascript
const visible = useMemo(
  () => byTypeAndSearch.filter((o) => matchesStatus(o, statusFilter)),
  [byTypeAndSearch, statusFilter]
);
```
`buildCsv(visible)` maps 1:1 over this exact array (D-07) — no new fetch, no `getOrder(id)` hydration.

**Handler pattern — full example already drafted in RESEARCH.md** (Pattern 2, reproduce verbatim as the starting point):
```javascript
import { save } from '@tauri-apps/plugin-dialog';
import { writeTextFile } from '@tauri-apps/plugin-fs';

async function handleExportCsv() {
  try {
    const csv = buildCsv(visible);
    const path = await save({
      defaultPath: `orders_${fromDateStr}_${toDateStr}.csv`,
      filters: [{ name: 'CSV', extensions: ['csv'] }],
    });
    if (!path) return; // user canceled — silent no-op, NOT an error
    await writeTextFile(path, csv);
    pushToast({ id: Date.now(), kind: 'success', title: t('toast_saved'), detail: `...` });
  } catch (err) {
    pushToast({ id: Date.now(), kind: 'error', title: t('h_export_error_title'), detail: String(err) });
  }
}
```
`pushToast` is already imported/used elsewhere in this file (same store hook pattern as `app.jsx`'s `pushToast` usage at line 132/172) — reuse the existing import, do not re-derive.

---

### `src/i18n.jsx` — new keys (config, static lookup)

**Analog:** existing `h_export` key pair, ro at line 240, en at line 480:
```javascript
// ro block
h_export: 'Exportă CSV',
// en block
h_export: 'Export CSV',
```
Add `print_configure_hint`, `h_export_empty_tooltip`, `h_export_error_title` as sibling key-value pairs in BOTH the `ro` and `en` blocks (same file, two locations each), following the existing flat-object, comma-terminated, single-quoted-string convention. No pluralization/interpolation machinery needed for these three (contrast with `h_orders_count_one`/`h_orders_count_other`, already present per RESEARCH Pattern 2's toast example — reuse those existing plural keys for the success-toast detail rather than adding new ones).

---

### `src/data.jsx` — confirm `normalizeOrder` fields (model/transform, no code change expected)

**Analog:** same file — `normalizeOrder`'s discount/subtotal/deliveryFee computation, lines ~200-209:
```javascript
const discountType = o.discountType ?? null;
const rawDiscountAmt = o.discountAmount ?? 0;
const discount = rawDiscountAmt === 0 ? 0
  : discountType === 'percent'
    ? +(cRON(o.subtotal) * rawDiscountAmt / 10000).toFixed(2)
    : ...
const subtotal    = cRON(o.subtotal);
const deliveryFee = cRON(o.deliveryFee);
```
Confirmed fields available on every normalized order for `buildCsv`: `dailyOrderNumber`, `placedAt`, `type`, `status` (raw SDK status — use `deriveDisplayStatus` from `history-utils.js`, not `order.status` directly, for the CSV `status` column), `customer.name`/`customer.phone`, `payment`, `subtotal`, `deliveryFee`, `tip`, `tax`, `discount`, `total`. All already RON-scaled and 2-decimal-safe via `cRON`/`.toFixed(2)` in most spots — RESEARCH Open Question 2 recommends `.toFixed(2)` defensively on every monetary field inside `orderToCsvRow` regardless. **No `normalizeOrder` code change is expected this phase** — this file is read-only reference for the serializer's field list.

---

### `package.json` / `src-tauri/Cargo.toml` / `src-tauri/src/lib.rs` / `src-tauri/capabilities/default.json` — plugin registration (config)

**Analog: the existing plugin install/registration pattern, all four files, for `store`/`window-state`/`process`/`opener`/`updater`.**

`package.json` (lines 16-21) — add two lines matching this style:
```json
"@tauri-apps/plugin-store": "^2.4.2",
"@tauri-apps/plugin-updater": "^2.10.1",
"@tauri-apps/plugin-window-state": "^2.4.1",
```
→ add `"@tauri-apps/plugin-dialog": "^2.7.2"`, `"@tauri-apps/plugin-fs": "^2.5.1"`.

`src-tauri/Cargo.toml` (lines 20-33) — add two lines matching this style:
```toml
[dependencies]
tauri-plugin-opener = "2"
tauri-plugin-store = "2"
tauri-plugin-process = "2"
```
→ add `tauri-plugin-dialog = "2"`, `tauri-plugin-fs = "2"` under `[dependencies]` (not the platform-gated `[target...]` block — dialog/fs are cross-platform, same tier as `store`/`opener`/`process`).

`src-tauri/src/lib.rs` (lines 426-433) — extend the existing `.plugin(...)` chain:
```rust
.plugin(tauri_plugin_process::init())
.plugin(tauri_plugin_updater::Builder::new().build())
.plugin(tauri_plugin_store::Builder::new().build())
.plugin(tauri_plugin_opener::init())
```
→ append `.plugin(tauri_plugin_dialog::init())` and `.plugin(tauri_plugin_fs::init())` (RESEARCH's Code Examples section already gives the exact insertion point).

`src-tauri/capabilities/default.json` (whole file, 8 lines) — extend the `permissions` array:
```json
{
  "$schema": "../gen/schemas/desktop-schema.json",
  "identifier": "default",
  "description": "Capability file generated by the Tauri CLI",
  "windows": ["main"],
  "permissions": [
    "core:default", "store:default", "window-state:default",
    "opener:default", "updater:default", "process:default"
  ]
}
```
→ add `"dialog:allow-save"`, `"fs:allow-write-text-file"` to the array. Per RESEARCH Pitfall 2, do NOT add an `fs:scope` entry — the dialog plugin auto-extends fs scope to the user-picked path for the session.

**Pre-install checkpoint (RESEARCH Package Legitimacy Audit):** `@tauri-apps/plugin-dialog` was flagged `[SUS]` (same-day publish). Planner must insert a `checkpoint:human-verify` task before `npm install @tauri-apps/plugin-dialog` — a 10-second `npm view @tauri-apps/plugin-dialog repository.url` check confirming it still resolves to `tauri-apps/plugins-workspace`.

---

### Test files (test, request-response / transform)

**Analog for Tauri-plugin mocking:** `src/__tests__/print-receipt.test.jsx`, lines 1-26 — the established `vi.mock(...)` shape for store/opener/invoke:
```javascript
vi.mock('@tauri-apps/plugin-store', () => ({
  load: vi.fn().mockResolvedValue({
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue(undefined),
    save: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(undefined),
  }),
}))
vi.mock('@charlyk/admin-client', () => ({ signIn: vi.fn(), createAdminClient: vi.fn() }))
vi.mock('@tauri-apps/plugin-opener', () => ({ open: vi.fn(), openUrl: vi.fn() }))
vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }))
vi.mock('../store.js', () => ({
  useAppStore: vi.fn((selector) => selector ? selector({ lang: 'en', pushToast: vi.fn() }) : {}),
}))
```
Extend this exact pattern with:
```javascript
vi.mock('@tauri-apps/plugin-dialog', () => ({ save: vi.fn() }))
vi.mock('@tauri-apps/plugin-fs', () => ({ writeTextFile: vi.fn() }))
```
in `src/__tests__/screen-history.test.jsx` for the Export-button tests (happy path / cancel / error / empty-state — per RESEARCH's Phase Requirements → Test Map).

`src/__tests__/history-utils.test.js` — extend with a plain `describe('buildCsv', ...)` block (pure-function tests, no plugin mocking needed) covering: header+row mapping, RFC-4180 escaping, exact single BOM at position 0 (`csv.charCodeAt(0) === 0xFEFF`, per RESEARCH Pitfall 4 — do NOT assert on raw `.length`/`.startsWith` without stripping the BOM first), 0/1/many rows, partial-field `""` emission (Pitfall 5), and a large-export perf case (~2000 synthetic orders, generous threshold like `< 1000ms`).

`src/__tests__/screen-detail.test.jsx` — extend the existing `readOnly mode` describe block with reprint-button enabled/disabled/tooltip assertions (mocks the same store shape as `print-receipt.test.jsx`).

`src/__tests__/app-history-route.test.jsx` — add an assertion that `onPrint` reaches `OrderDetailScreen` on the `history-detail` route (direct regression guard for Pitfall 1).

## Shared Patterns

### Plugin-store mount-time read (printer-configured gate)
**Source:** `src/screen-printer.jsx:42-67`
**Apply to:** `src/screen-detail.jsx` (new `printerConfigured` state, read-only mode only)
```javascript
useEffect(() => {
  load('preferences.json', { autoSave: false })
    .then((store) => store.get('printer'))
    .then((config) => setPrinterConfigured(!!config?.port))
    .catch(() => setPrinterConfigured(false));
}, []);
```

### Inert/disabled visual convention
**Source:** `src/screen-history.jsx:843`
**Apply to:** reprint buttons (`screen-detail.jsx`) and the Export button's disabled-when-empty state (`screen-history.jsx`)
```javascript
style={{ opacity: 0.5, pointerEvents: 'none', cursor: 'not-allowed' }}
```

### Toast push on success/error
**Source:** `src/app.jsx:132-176` (`handlePrint`'s existing try/catch → `pushToast` calls)
**Apply to:** `handleExportCsv` in `screen-history.jsx` (error path) and reused as-is for print (no change needed)
```javascript
pushToast({ id: Date.now(), kind: 'success', title: t('...'), detail: '...' });
// or, in catch:
pushToast({ id: Date.now(), kind: 'error', title: t('...'), detail: String(err) });
```

### Official-Tauri-plugin registration (4-file lockstep pattern)
**Source:** existing `store`/`opener`/`process`/`updater`/`window-state` plugins across `package.json`, `Cargo.toml`, `lib.rs`, `capabilities/default.json`
**Apply to:** `@tauri-apps/plugin-dialog` + `@tauri-apps/plugin-fs` — every new Tauri plugin touches all four files identically; never register in only one or two.

### Tauri-plugin test mocking
**Source:** `src/__tests__/print-receipt.test.jsx:6-20`
**Apply to:** all four test files in scope — mock `@tauri-apps/plugin-dialog`/`@tauri-apps/plugin-fs` the same shape as the existing `plugin-store`/`api/core` mocks (vi.fn() per named export, resolved/rejected per test case).

## No Analog Found

None — every file in scope modifies an existing file with a directly analogous existing block/pattern in the same file or a clear sibling file. No wholly new files are created this phase.

## Metadata

**Analog search scope:** `src/`, `src-tauri/`, `src/__tests__/` (targeted reads only, per files named in CONTEXT.md/RESEARCH.md canonical refs — no broad Glob/Grep sweep needed since RESEARCH.md already cites exact file:line locations for every reuse path)
**Files scanned:** `src/history-utils.js`, `src/screen-detail.jsx`, `src/app.jsx`, `src/screen-history.jsx`, `src/screen-printer.jsx`, `src/i18n.jsx`, `src/data.jsx`, `src-tauri/Cargo.toml`, `src-tauri/src/lib.rs`, `src-tauri/capabilities/default.json`, `package.json`, `src/__tests__/print-receipt.test.jsx`
**Pattern extraction date:** 2026-07-18
