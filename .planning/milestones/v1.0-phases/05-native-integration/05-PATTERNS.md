# Phase 5: Native Integration - Pattern Map

**Mapped:** 2026-04-28
**Files analyzed:** 5 new/modified files
**Analogs found:** 5 / 5

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `src-tauri/src/lib.rs` | service (Rust commands) | request-response | `src-tauri/src/lib.rs` (existing commands) | exact |
| `src-tauri/Cargo.toml` | config | — | `src-tauri/Cargo.toml` (existing deps) | exact |
| `src/screen-printer.jsx` | component (form screen) | request-response | `src/screen-settings.jsx` (settings form) + existing `screen-printer.jsx` | role-match |
| `src/app.jsx` | component (wiring) | request-response | `src/app.jsx` (CancelDialog mutation error pattern, lines 214–239) | exact |
| `src/i18n.jsx` | config | — | `src/i18n.jsx` (existing bilingual key structure) | exact |

---

## Pattern Assignments

### `src-tauri/src/lib.rs` (Rust commands, request-response)

**Analog:** `src-tauri/src/lib.rs` — existing `store_token`, `get_token`, `delete_token` commands.

**Imports pattern** (lines 1–4):
```rust
// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use keyring::Entry;
```
New commands add:
```rust
use serialport;
use escpos::{driver::SerialPortDriver, printer::Printer, utils::Protocol, printer_options::PrinterOptions};
use serde::Deserialize;
use std::time::Duration;
```

**Existing command pattern** (lines 6–12 — `store_token` is the canonical simple command):
```rust
#[tauri::command]
fn store_token(token: String) -> Result<(), String> {
    Entry::new("sitecare-pos", "auth_token")
        .map_err(|e| e.to_string())?
        .set_password(&token)
        .map_err(|e| e.to_string())
}
```
All three existing commands follow the same structure:
- `#[tauri::command]` attribute
- `fn name(args) -> Result<T, String>` — errors are `.map_err(|e| e.to_string())`
- Idiomatic `?` propagation; no panics

**Existing `get_token` pattern for Option return and NoEntry guard** (lines 14–23):
```rust
#[tauri::command]
fn get_token() -> Result<Option<String>, String> {
    let entry = Entry::new("sitecare-pos", "auth_token")
        .map_err(|e| e.to_string())?;
    match entry.get_password() {
        Ok(token) => Ok(Some(token)),
        Err(keyring::Error::NoEntry) => Ok(None),
        Err(e) => Err(e.to_string()),
    }
}
```
Apply the same match-on-error-variant approach to handle the "no config" case in `test_print` and `print_receipt`.

**invoke_handler registration pattern** (line 46):
```rust
.invoke_handler(tauri::generate_handler![store_token, get_token, delete_token])
```
Phase 5 adds four new commands to this macro: `list_serial_ports, save_printer_config, test_print, print_receipt`.

**Async + spawn_blocking pattern for new serial commands** (from RESEARCH.md Pattern 1 — NOT in codebase yet; copy verbatim):
```rust
#[tauri::command]
async fn test_print(
    port: String,
    baud: u32,
    paper_width: String,
    restaurant_name: String,
) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || {
        // All blocking serial I/O happens inside this closure
        let chars = chars_per_line(&paper_width);
        // open port, build receipt, print_cut
        Ok::<(), String>(())
    })
    .await
    .map_err(|e| e.to_string())?
}
```
The double `?` (`...map_err(|e| e.to_string())?`) at the end unwraps `JoinError` from `spawn_blocking`, then the inner `Result`.

**Serde deserialize struct pattern for complex command args** (from RESEARCH.md):
```rust
#[derive(Deserialize)]
struct PrinterConfig {
    port: String,
    name: String,
    paper_width: String,   // "58mm" | "80mm"
    baud: u32,
}

#[tauri::command]
async fn save_printer_config(config: PrinterConfig) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || {
        serialport::new(&config.port, config.baud)
            .timeout(Duration::from_millis(2000))
            .open()
            .map_err(|e| format!("Cannot open {}: {}", config.port, e))?;
        Ok::<(), String>(())
    })
    .await
    .map_err(|e| e.to_string())?
}
```

**`list_serial_ports` is synchronous** (no I/O write — just an OS query; no `spawn_blocking` needed):
```rust
#[tauri::command]
fn list_serial_ports() -> Result<Vec<String>, String> {
    serialport::available_ports()
        .map_err(|e| e.to_string())
        .map(|ports| ports.into_iter().map(|p| p.port_name).collect())
}
```

---

### `src-tauri/Cargo.toml` (config, dependency manifest)

**Analog:** `src-tauri/Cargo.toml` (lines 1–30).

**Existing `[dependencies]` block** (lines 20–26):
```toml
[dependencies]
tauri = { version = "2", features = [] }
tauri-plugin-opener = "2"
serde = { version = "1", features = ["derive"] }
serde_json = "1"
tauri-plugin-store = "2"
keyring = "3"
```
Add two lines following the same `name = "version"` / `name = { version = "...", features = [...] }` pattern:
```toml
serialport = "4.9"
escpos = { version = "0.17", features = ["serial_port"] }
```

**Desktop-only target pattern** (lines 28–30) — no change needed:
```toml
[target.'cfg(not(any(target_os = "android", target_os = "ios")))'.dependencies]
tauri-plugin-window-state = "2"
```
`serialport` and `escpos` go into `[dependencies]` (not target-scoped) because Windows is the primary deployment target.

---

### `src/screen-printer.jsx` (component, request-response — FULL REDESIGN)

**Analog:** Existing `src/screen-printer.jsx` (lines 1–113) plus `src/screen-settings.jsx` for form field patterns.

**Current imports to replace** (lines 1–5 of existing file):
```jsx
import { useState } from 'react';
import { Icon } from './icons.jsx';
import { useT } from './i18n.jsx';
import { PRINTERS, ORDERS } from './data.jsx';          // DELETE — no longer used
import { ThermalTicket } from './screen-detail.jsx';
```
New imports:
```jsx
import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { load } from '@tauri-apps/plugin-store';
import { Icon } from './icons.jsx';
import { useT } from './i18n.jsx';
import { ThermalTicket } from './screen-detail.jsx';
import { useAppStore } from './store.js';
```

**`invoke` pattern** — copied from auth token commands in `src/auth.jsx` (established project pattern):
```jsx
// On mount: enumerate ports
useEffect(() => {
  invoke('list_serial_ports')
    .then(setPorts)
    .catch(() => setPorts([]));
}, []);

// On Save button click:
async function handleSave() {
  setSaveStatus('pending');
  try {
    await invoke('save_printer_config', {
      config: { port: selectedPort, name: printerName, paperWidth: width, baud: 9600 },
    });
    // Persist to plugin-store on JS side (per RESEARCH.md D-11 / Open Question 2)
    const store = await load('preferences.json', { autoSave: false });
    await store.set('printer', { port: selectedPort, name: printerName, paperWidth: width, baud: 9600 });
    await store.save();
    setSaveStatus('success');
  } catch (err) {
    setSaveStatus('error');
    setSaveError(String(err));
  }
}
```

**Status chip pattern** (from existing `screen-printer.jsx` lines 39 and `styles.css` chip classes):
```jsx
// Success chip — green:
<span className="chip chip-sage chip-dot">
  {t('printer_connected')}
</span>

// Error chip — red:
<span className="chip chip-red chip-dot">
  {t('printer_connection_failed')}
</span>
```
These chip classes already exist in `styles.css` — confirmed by `src/screen-printer.jsx:39` where `chip-sage` and `chip-slate` are used.

**Paper width toggle pattern** (lines 61–64 of existing `screen-printer.jsx` — keep unchanged):
```jsx
<div style={{ display: 'flex', gap: 6 }}>
  {['58mm', '80mm'].map(w => (
    <button key={w} onClick={() => setWidth(w)}
      style={{ flex: 1, padding: '8px 10px', borderRadius: 8,
        border: width === w ? '1.5px solid var(--sc-primary)' : '1px solid hsl(120 10% 88%)',
        background: width === w ? 'hsl(120 14% 49% / 0.08)' : '#fff',
        color: width === w ? 'var(--sc-primary)' : '#555',
        fontWeight: 700, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>{w}</button>
  ))}
</div>
```

**Auto-print toggle — greyed-out per CLAUDE.md unready features rule:**
```jsx
<div style={{ opacity: 0.45, pointerEvents: 'none' }}>
  <Toggle label={t('printer_auto_print')} on={false} onChange={() => {}} />
</div>
```

**Toggle subcomponent** — copy from existing `screen-printer.jsx` lines 102–111 unchanged:
```jsx
function Toggle({ label, on, onChange }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <button onClick={() => onChange(!on)}
        style={{ width: 38, height: 22, borderRadius: 999,
          background: on ? 'var(--sc-primary)' : 'hsl(120 10% 85%)',
          border: 0, padding: 2, cursor: 'pointer', transition: 'background 200ms' }}>
        <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#fff',
          marginLeft: on ? 16 : 0, transition: 'margin 200ms',
          boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
      </button>
      <div style={{ fontSize: 13, fontWeight: 500 }}>{label}</div>
    </div>
  );
}
```

**Screen header pattern** (from existing `screen-printer.jsx` lines 17–21 — keep structure, update text):
```jsx
<div style={{ marginBottom: 20 }}>
  <div className="eyebrow">{t('printer_eyebrow')}</div>
  <div style={{ fontWeight: 900, fontSize: 24, letterSpacing: '-0.02em' }}>{t('printers')}</div>
  <div style={{ color: 'var(--sc-muted-foreground)', fontSize: 13, marginTop: 2 }}>
    {t('printer_subtitle')}
  </div>
</div>
```

**Receipt preview column** (lines 84–88 of existing `screen-printer.jsx` — keep ThermalTicket; pass config from store not ORDERS mock):
```jsx
<div style={{ background: '#ede9de', padding: 16, borderRadius: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
  <div className="eyebrow">preview</div>
  <div style={{ fontWeight: 900, fontSize: 15, letterSpacing: '-0.02em' }}>
    {t('printer_test_ticket_preview')}
  </div>
  <ThermalTicket order={PREVIEW_ORDER} lang={lang} kind="customer" restaurantSettings={restaurantSettings} />
</div>
```
`PREVIEW_ORDER` is a static minimal order object defined at module top — do NOT import from `data.jsx`'s `ORDERS` mock.

---

### `src/app.jsx` (component wiring — modify two lines)

**Analog:** `src/app.jsx` — `CancelDialog` `onConfirm` / `onError` mutation toast pattern (lines 218–239).

**Integration points to modify** (lines 167 and 170):

Current (line 167):
```jsx
{screen === 'orders'  && <OrdersScreen  orders={orders} lang={lang} onOpen={openOrder} onAdvance={handleAdvance} onPrint={() => {}} isOffline={isOffline} stats={stats} />}
```
Current (line 170):
```jsx
{screen === 'detail'  && selectedOrder && <OrderDetailScreen order={selectedOrder} lang={lang} restaurantSettings={restaurantSettings} deliveryAreas={deliveryAreas} onBack={() => setScreen('orders')} onAdvance={handleAdvance} onPrint={() => {}} onCancel={() => setCancelDialog({ order: selectedOrder })} isOffline={isOffline} />}
```

**Error toast pattern to follow** (lines 234–238 of existing `app.jsx` — CancelDialog onError):
```jsx
onError: () => {
  pushToast({ id: Date.now(), kind: 'error', title: t('cancel_error_title'), detail: t('check_connection') });
  // dialog stays open intentionally — do NOT call setCancelDialog(null) here
},
```

**New `handlePrint` function to add above the return statement:**
```jsx
const handlePrint = async (order, kind) => {
  const store = await load('preferences.json', { autoSave: false });
  const config = await store.get('printer');
  if (!config?.port) {
    pushToast({ id: Date.now(), kind: 'error', title: t('print_not_configured'), detail: t('go_to_printer_settings') });
    return;
  }
  try {
    await invoke('print_receipt', {
      port: config.port,
      baud: config.baud ?? 9600,
      paperWidth: config.paperWidth ?? '80mm',
      order: {
        dailyOrderNumber: order.dailyOrderNumber,
        placedAt: order.placedAt,
        type: order.type,
        source: order.source,
        table: order.table ?? null,
        customerName: order.customer?.name ?? null,
        deliveryAddress: order.address?.line1 ?? null,
        notes: order.notes ?? null,
        items: (order.items ?? []).map(it => ({
          name: it.name,
          qty: it.qty,
          price: it.price,
          mods: it.mods ?? [],
        })),
        subtotal: order.subtotal,
        tax: order.tax,
        deliveryFee: order.deliveryFee,
        discount: order.discount ?? 0,
        total: order.total,
        payment: order.payment ?? null,
      },
      kind,
      restaurantName: restaurantSettings?.restaurant_name ?? 'Restaurant',
      restaurantAddress: restaurantSettings?.branch_address ?? null,
    });
    pushToast({ id: Date.now(), kind: 'success', title: t('toast_printed'), detail: '' });
  } catch (err) {
    pushToast({ id: Date.now(), kind: 'error', title: t('print_failed'), detail: String(err) });
  }
};
```

**Updated screen router lines (167 and 170):** replace `onPrint={() => {}}` with `onPrint={handlePrint}`.

**Additional imports needed at top of `app.jsx`:**
```jsx
import { invoke } from '@tauri-apps/api/core';
import { load } from '@tauri-apps/plugin-store';
```

---

### `src/i18n.jsx` (config, bilingual key addition)

**Analog:** `src/i18n.jsx` lines 1–348 — existing bilingual key pattern.

**Key structure pattern** (established throughout file):
- RO is canonical; EN is mirror
- Keys are `snake_case` strings
- Both `ro` and `en` blocks must have matching keys
- Grouped by feature with a comment header

**Existing toast key pattern** (lines 99–100):
```js
toast_new_order: 'Comandă nouă primită',
toast_printed: 'Bon printat',
```

**New keys to add** — insert after `toast_printed` / `toast_saved` block in both `ro` and `en` objects:

RO additions:
```js
// PRNT-01/02/03 — Printer Setup screen
printer_eyebrow: 'imprimantă termică',
printer_subtitle: 'Configurează imprimanta termică USB pentru comenzi.',
printer_port_label: 'Port serial',
printer_port_placeholder: 'Selectează portul…',
printer_no_ports: 'Niciun port găsit',
printer_refresh_ports: 'Actualizează',
printer_name_label: 'Nume imprimantă',
printer_name_placeholder: 'ex: Epson TM-T20',
printer_width_label: 'Lățime hârtie',
printer_auto_print: 'Print automat la comandă nouă',
printer_save_btn: 'Salvează și testează conexiunea',
printer_test_btn: 'Print de test',
printer_test_ticket_preview: 'Bon de test',
printer_connected: 'Imprimantă conectată',
printer_connection_failed: 'Conexiune eșuată',
printer_not_configured: 'Imprimanta nu este configurată',
go_to_printer_settings: 'Mergi la Setări → Imprimantă pentru a configura.',
print_failed: 'Eroare la printare',
```

EN additions (mirror):
```js
// PRNT-01/02/03 — Printer Setup screen
printer_eyebrow: 'thermal printer',
printer_subtitle: 'Configure the USB thermal printer for orders.',
printer_port_label: 'Serial port',
printer_port_placeholder: 'Select port…',
printer_no_ports: 'No ports found',
printer_refresh_ports: 'Refresh',
printer_name_label: 'Printer name',
printer_name_placeholder: 'e.g. Epson TM-T20',
printer_width_label: 'Paper width',
printer_auto_print: 'Auto-print on new order',
printer_save_btn: 'Save & test connection',
printer_test_btn: 'Test print',
printer_test_ticket_preview: 'Test ticket',
printer_connected: 'Printer connected',
printer_connection_failed: 'Connection failed',
printer_not_configured: 'Printer not configured',
go_to_printer_settings: 'Go to Settings → Printer to configure.',
print_failed: 'Print failed',
```

---

## Shared Patterns

### Toast on async failure
**Source:** `src/app.jsx` lines 200–205 (AcceptDialog onError) and lines 234–238 (CancelDialog onError)
**Apply to:** `handlePrint` in `app.jsx`, Test Print button handler in `screen-printer.jsx`
```jsx
pushToast({ id: Date.now(), kind: 'error', title: t('print_failed'), detail: String(err) });
```
- `id: Date.now()` — unique ID for toast deduplication
- `kind: 'error'` — maps to the zap icon in the toast renderer (app.jsx line 184)
- Never auto-dismiss; staff must click to dismiss

### invoke call pattern
**Source:** `src/auth.jsx` (established project pattern, also used in multiple test mocks)
**Apply to:** All three Tauri command calls in `screen-printer.jsx` and `app.jsx`
```jsx
import { invoke } from '@tauri-apps/api/core';
// ...
await invoke('command_name', { argKey: argValue });
```
- Always `await` — commands return `Promise<T>`
- Errors propagate as rejected Promise with the `String` from Rust `Err(msg)`
- Wrap in try/catch; map catch to `pushToast`

### plugin-store read/write pattern (JS side)
**Source:** `src/__tests__/screen-orders.test.jsx` lines 6–12 shows the mock; actual usage in auth.jsx for token
**Apply to:** `save_printer_config` success handler (write), `handlePrint` (read)
```jsx
import { load } from '@tauri-apps/plugin-store';
// ...
const store = await load('preferences.json', { autoSave: false });
await store.set('printer', configObject);
await store.save();
// Read:
const config = await store.get('printer');
```

### Greyed-out unready feature
**Source:** CLAUDE.md "Unready Features" rule; `screen-pos.jsx` and `screen-settings.jsx` for examples
**Apply to:** Auto-print toggle in `screen-printer.jsx`
```jsx
<div style={{ opacity: 0.45, pointerEvents: 'none' }}>
  {/* unready toggle renders but is not interactive */}
</div>
```

### Test file mock boilerplate
**Source:** `src/__tests__/cancel-dialog.test.jsx` lines 1–19 and `src/__tests__/screen-orders.test.jsx` lines 1–19
**Apply to:** `src/__tests__/screen-printer.test.jsx` and `src/__tests__/print-receipt.test.jsx`
```jsx
import { describe, it, test, vi, expect, beforeEach } from 'vitest'
import { createElement } from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

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
vi.mock('../auth.jsx', () => ({ useAuth: vi.fn(() => ({ client: null, token: null })) }))

const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
function w({ children }) { return createElement(QueryClientProvider, { client: qc }, children) }
```
For `screen-printer.test.jsx`, additionally mock `useAppStore`:
```jsx
vi.mock('../store.js', () => ({
  useAppStore: vi.fn((selector) => selector ? selector({ lang: 'en', pushToast: vi.fn() }) : {}),
}))
```

---

## No Analog Found

All five files have analogs in the codebase. No files require falling back to RESEARCH.md patterns exclusively.

However, the following patterns from RESEARCH.md have **no existing codebase analog** and must be copied verbatim from RESEARCH.md:
- `tauri::async_runtime::spawn_blocking` wrapper (Pattern 1) — first async blocking command in the project
- `escpos` crate `SerialPortDriver` + `Printer` fluent API (Pattern 4) — first hardware I/O in the project
- `chars_per_line` helper (58mm → 32, 80mm → 48) — project-specific utility with no existing analog
- `PrintOrderData` struct (RESEARCH.md Code Examples) — maps to `ThermalTicket`'s data fields in `screen-detail.jsx:253–340`

---

## ThermalTicket Data Field Reference

The `ThermalTicket` component at `src/screen-detail.jsx:253–340` defines the receipt data contract. The Rust `PrintOrderData` struct must mirror these fields:

| JSX field | Rust field | Type | Notes |
|---|---|---|---|
| `order.dailyOrderNumber` | `daily_order_number` | `u32` | Receipt header |
| `order.placedAt` | `placed_at` | `String` | ISO-8601 |
| `order.type` | `order_type` | `String` | "dinein" / "pickup" / "delivery" |
| `order.source` | `source` | `Option<String>` | "web" / "phone" / "counter" |
| `order.table` | `table` | `Option<String>` | Dine-in only |
| `order.customer.name` | `customer_name` | `Option<String>` | line 292 |
| `order.address` | `delivery_address` | `Option<String>` | line 293 |
| `order.notes` | `notes` | `Option<String>` | line 306 |
| `order.items[i].qty` | `items[i].qty` | `u32` | line 298 |
| `order.items[i].name` | `items[i].name` | `String` | line 299 |
| `order.items[i].price` | `items[i].price` | `f64` | line 300 |
| `order.items[i].mods` | `items[i].mods` | `Vec<String>` | line 302 |
| `order.subtotal` | `subtotal` | `f64` | line 317 |
| `order.tax` | `tax` | `f64` | line 318 "TVA 19%" |
| `order.deliveryFee` | `delivery_fee` | `f64` | line 319 |
| `order.discount` | `discount` | `f64` | line 320 |
| `order.total` | `total` | `f64` | line 321 |
| `order.payment` | `payment` | `Option<String>` | line 324 |
| `restaurantSettings.restaurant_name` | `restaurant_name` | `String` | line 258 |
| `restaurantSettings.branch_address` | `restaurant_address` | `Option<String>` | line 259 |

---

## Metadata

**Analog search scope:** `src/`, `src-tauri/src/`, `src/__tests__/`
**Files scanned:** 10
**Pattern extraction date:** 2026-04-28
