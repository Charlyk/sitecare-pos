# Phase 5: Native Integration — Research

**Researched:** 2026-04-28
**Domain:** Rust serial I/O · ESC/POS thermal printing · Tauri v2 command model
**Confidence:** HIGH (core stack verified against crates.io registry and official docs)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Connection type is USB serial (COM port) for v1.
- **D-02:** Port selection uses enumeration — `serialport::available_ports()` returns the list; rendered as a dropdown. No manual text entry.
- **D-03:** TCP/IP support deferred.
- **D-04:** v1 supports one configured printer.
- **D-05:** Printer config persisted in `tauri-plugin-store` under a `'printer'` key as `{ port, name, paperWidth, baud }`.
- **D-06:** Printer Setup screen redesigned as a single-printer form (drop prototype's 3-column multi-printer list).
- **D-07:** Receipt header: restaurant name + address from `restaurantSettings`.
- **D-08:** Receipt body: order number, date/time, customer name, line items with modifiers.
- **D-09:** Receipt totals: subtotal, delivery fee (if applicable), total. Tax at Claude's discretion.
- **D-10:** Receipt footer: bilingual `"Mulțumim! / Thank you!"` + paper cut command.
- **D-11:** Save button = live connection test first; success persists config; failure shows inline error; config NOT persisted on failure.
- **D-12:** Test Print = short test slip (restaurant name, "Test Print", timestamp, ruler line). No real order needed.
- **D-13:** Print failure = error toast. No auto-retry.

### Claude's Discretion
- **Baud rate:** Most Epson/Star thermal printers default to 9600 baud; some use 19200 or 38400. Research and recommend.
- **Paper cut command:** Auto-cut always-on in v1 (no toggle UI).
- **Language of receipt:** Use app's `lang` Zustand value (RO by default). Footer is always bilingual (D-10).
- **ESC/POS crate selection:** Choose between `escpos` (v0.17, the `fabienbellanger/escpos-rs` crate on crates.io) and raw byte arrays.

### Deferred Ideas (OUT OF SCOPE)
- TCP/IP printer support
- Multi-printer support (kitchen/bar/customer roles)
- Auto-print on new order (render toggle greyed-out; not wired)
- QR code on receipt
- Print job queue / reconnect retry
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| ACT-04 | User can print a receipt for any order from the Order Detail screen | Tauri `print_receipt` command wired to `onPrint` in `app.jsx` |
| PRNT-01 | User can configure thermal printer connection (USB) in the Printer Setup screen | `list_serial_ports` command + redesigned `screen-printer.jsx` + `save_printer_config` command |
| PRNT-02 | User can send a test print from the Printer Setup screen | `test_print` Tauri command using config-only data |
| PRNT-03 | App prints receipts via ESC/POS protocol using a Tauri native plugin | `escpos` crate with `SerialPortDriver` + `print_receipt` command with full order data |
</phase_requirements>

---

## Summary

Phase 5 adds a single-printer USB serial configuration form and wires the existing `onPrint` no-op in `app.jsx` to a real ESC/POS print path. All hardware I/O lives in Rust (three new `#[tauri::command]` functions in `lib.rs`); the JS side calls `invoke` as it does for auth token commands today.

The Rust implementation uses two crates: `serialport` 4.9.0 for port enumeration and transport, and `escpos` 0.17.0 with the `serial_port` feature flag for ESC/POS byte generation. Because `serialport` is synchronous (blocking I/O), all three print commands must be declared `async` and wrap their I/O in `tauri::async_runtime::spawn_blocking` to avoid stalling Tokio's async runtime.

The Tauri v2 capability model does NOT require a new capability entry for custom Rust commands registered via `invoke_handler` — they are allowed by default across all windows. No new `.json` file in `capabilities/` is needed for Phase 5.

**Primary recommendation:** Use `escpos` 0.17.0 with `serial_port` feature over raw byte arrays. It handles ESC/POS command encoding, paper cut, justify, bold, and line-width management correctly and is actively maintained. Raw byte arrays are feasible but require maintaining every byte sequence manually and testing against physical hardware.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Port enumeration | Rust (Tauri command) | — | OS-level syscall (`available_ports`) must run in native context |
| Serial I/O write | Rust (Tauri command) | — | Hardware I/O; cannot run in WebView JS |
| ESC/POS byte generation | Rust (Tauri command) | — | Byte-level protocol construction belongs co-located with the I/O write |
| Config persistence | Rust (tauri-plugin-store) | JS (read only) | Store writes go through Tauri plugin; JS reads via same plugin |
| UI form state | React (PrinterScreen) | — | Port selection, paper width toggle, name field — local useState |
| Print trigger | React (app.jsx) | — | `onPrint` callback in app.jsx wires order data into invoke call |
| Receipt content structure | Rust (print_receipt command) | — | Mirrors `ThermalTicket` JSX component; must accept a serializable order payload |
| Error feedback | React (pushToast) | React (inline chip) | Toast for print failures; inline chip for Save connection status |

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `serialport` (Rust crate) | 4.9.0 | Port enumeration, opening, writing bytes to COM/tty | De-facto standard Rust serial library; cross-platform (Windows COM + macOS /dev/tty); actively maintained |
| `escpos` (Rust crate, crate name on crates.io is `escpos`) | 0.17.0 | ESC/POS command builder: text, bold, justify, feed, cut | Most actively maintained Rust ESC/POS crate (31 releases, Rust 2024 edition, Sep 2025 release); includes `SerialPortDriver` as optional feature |

[VERIFIED: crates.io API — `escpos` newest_version=0.17.0; `serialport` newest_version=4.9.0]

### Supporting (already installed)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `tauri-plugin-store` | 2.x (already in Cargo.toml) | Persist printer config `{ port, name, paperWidth, baud }` | `save_printer_config` command writes to this store |
| `@tauri-apps/api/core` — `invoke` | 2.x (already in package.json) | JS side calls Tauri commands | All three print commands called from JS |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `escpos` crate | Raw ESC/POS byte arrays | Raw bytes work and have zero dependencies but require manual maintenance of every command sequence (init `ESC @`, set font, bold `ESC E`, justify `ESC a`, cut `GS V`). Use raw bytes only if `escpos` crate cannot be compiled for the target. |
| `escpos` crate | `escpos-rs` (Malanche/escpos-rs, crate name `escpos-rs`) | `escpos-rs` is at 0.4.3, less actively maintained; does not expose a `SerialPortDriver`. The `escpos` crate (fabienbellanger) is the better choice. |

**Installation (Cargo.toml additions):**
```toml
serialport = "4.9"
escpos = { version = "0.17", features = ["serial_port"] }
```

**Version verification:** [VERIFIED: crates.io registry, 2026-04-28]
- `serialport` 4.9.0 — published 2026-03-16
- `escpos` 0.17.0 — published 2025-09-15

---

## Architecture Patterns

### System Architecture Diagram

```
JS (React)                    Rust (Tauri)                  Hardware
──────────────────────────    ──────────────────────────    ──────────────
                              
[screen-printer.jsx]          [list_serial_ports]
  invoke('list_serial_ports') ───────────────────>  serialport::available_ports()
  <── Vec<String> port names ──────────────────────
  renders <select> dropdown

[screen-printer.jsx]          [save_printer_config]
  invoke('save_printer_config', { port, name,  ──>  1. Open port (connection test)
          paperWidth, baud })                        2a. Success: write config to
  <── Ok(()) ──────────────────────────────────         tauri-plugin-store
  shows chip-sage "Printer connected"               2b. Failure: return Err(String)
  <── Err(msg) ───────────────────────────────
  shows chip-red "Connection failed"

[screen-printer.jsx]          [test_print]
  invoke('test_print')   ─────────────────────>  1. Read config from store
                                                  2. Open serial port
                                                  3. escpos: write test receipt
                                                     (restaurant name, "Test Print",
                                                     timestamp, ruler, cut)
  <── Ok(()) ─ toast success ──────────────────
  <── Err(msg) ─ toast error ─────────────────

[app.jsx onPrint(order, kind)] [print_receipt]
  invoke('print_receipt', ────────────────────>  1. Read config from store
    { order: {...}, kind })                       2. Open serial port
                                                  3. escpos: build receipt from
                                                     order data (header, items,
                                                     totals, footer, cut)
  <── Ok(()) ─ toast success ──────────────────
  <── Err(msg) ─ toast error ─────────────────
```

### Recommended Project Structure

```
src-tauri/src/
├── lib.rs             # Add: list_serial_ports, save_printer_config, test_print, print_receipt
└── main.rs            # Unchanged

src/
├── screen-printer.jsx # FULL REDESIGN: single-printer form replacing prototype 3-col layout
├── app.jsx            # Wire onPrint (lines 167, 170) to real invoke call
└── i18n.jsx           # Add 20 new bilingual keys (see UI-SPEC.md)
```

### Pattern 1: Async Command Wrapping Blocking Serial I/O

**What:** All three print commands (`save_printer_config`, `test_print`, `print_receipt`) do synchronous blocking I/O via `serialport`. Because Tauri uses Tokio, a blocking call on the async thread starves the runtime. Use `tauri::async_runtime::spawn_blocking`.

**When to use:** Any `#[tauri::command]` that calls synchronous/blocking code (serial I/O, file I/O, heavy CPU).

```rust
// Source: https://v2.tauri.app/develop/calling-rust/ + Tauri docs.rs
#[tauri::command]
async fn test_print(app: tauri::AppHandle) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || {
        // All blocking serial I/O happens here
        let config = read_printer_config_sync(&app)?;
        send_test_print(&config)?;
        Ok(())
    })
    .await
    .map_err(|e| e.to_string())?
}
```

[VERIFIED: https://v2.tauri.app/develop/calling-rust/ — "Async commands are executed on a separate async task using async_runtime::spawn. For blocking operations use spawn_blocking."]

### Pattern 2: serialport Port Enumeration

**What:** Call `serialport::available_ports()` and return port names as `Vec<String>`.

**When to use:** `list_serial_ports` command.

```rust
// Source: https://github.com/serialport/serialport-rs README
use serialport;

#[tauri::command]
fn list_serial_ports() -> Result<Vec<String>, String> {
    let ports = serialport::available_ports()
        .map_err(|e| e.to_string())?;
    Ok(ports.iter().map(|p| p.port_name.clone()).collect())
}
```

Note: This command is synchronous (no I/O write, just an OS query) and can remain non-async. [VERIFIED: serialport-rs README]

### Pattern 3: serialport Open + Write

**What:** Open a COM port, write bytes, close by dropping.

```rust
// Source: https://github.com/serialport/serialport-rs README
use serialport;
use std::time::Duration;

fn open_and_write(port_name: &str, baud: u32, data: &[u8]) -> Result<(), String> {
    let mut port = serialport::new(port_name, baud)
        .timeout(Duration::from_millis(2000))
        .open()
        .map_err(|e| format!("Cannot open {}: {}", port_name, e))?;
    port.write_all(data)
        .map_err(|e| format!("Write failed: {}", e))?;
    Ok(())
    // port is dropped here, closing the connection automatically
}
```

[VERIFIED: serialport-rs README — `serialport::new(path, baud_rate).timeout(...).open()`]

### Pattern 4: escpos with SerialPortDriver

**What:** Use `escpos` crate's `SerialPortDriver` + `Printer` builder to generate ESC/POS bytes and transmit them over serial.

```rust
// Source: https://docs.rs/escpos/latest/escpos/
use escpos::{
    driver::SerialPortDriver,
    printer::Printer,
    utils::Protocol,
    printer_options::PrinterOptions,
};
use std::time::Duration;

fn build_and_send_receipt(port: &str, baud: u32, chars_per_line: u8) -> Result<(), String> {
    let driver = SerialPortDriver::open(port, baud, Some(Duration::from_millis(2000)))
        .map_err(|e| e.to_string())?;
    
    let opts = PrinterOptions::default()
        .characters_per_line(chars_per_line);  // 32 for 58mm, 48 for 80mm
    
    Printer::new(driver, Protocol::default(), Some(opts))
        .init()
        .map_err(|e| e.to_string())?
        .justify(JustifyMode::CENTER)
        .map_err(|e| e.to_string())?
        .bold(true)
        .map_err(|e| e.to_string())?
        .writeln("RESTAURANT NAME")
        .map_err(|e| e.to_string())?
        .bold(false)
        .map_err(|e| e.to_string())?
        .justify(JustifyMode::LEFT)
        .map_err(|e| e.to_string())?
        // ... more content ...
        .feed()
        .map_err(|e| e.to_string())?
        .print_cut()    // sends all buffered data + GS V cut command
        .map_err(|e| e.to_string())?;
    Ok(())
}
```

[VERIFIED: https://docs.rs/escpos/latest/escpos/ — SerialPortDriver::open signature; Printer fluent API with init/bold/writeln/justify/feed/print_cut]

### Pattern 5: Reading Printer Config from tauri-plugin-store in Rust

**What:** The printer config is stored by JS via `@tauri-apps/plugin-store`. To read it in Rust, use `app.state::<tauri_plugin_store::StoreCollection>()`.

```rust
// Source: [ASSUMED] — based on tauri-plugin-store Rust API patterns; verify against plugin docs
use tauri_plugin_store::StoreExt;

fn read_printer_config(app: &tauri::AppHandle) -> Result<PrinterConfig, String> {
    let store = app.store("preferences.json")
        .map_err(|e| e.to_string())?;
    let val = store.get("printer")
        .ok_or("Printer not configured")?;
    serde_json::from_value(val.clone())
        .map_err(|e| e.to_string())
}
```

**Alternative pattern (simpler for Phase 5):** Accept printer config parameters directly as command arguments from JS rather than reading from store in Rust. This avoids the Rust store API complexity:

```rust
// JS reads config from plugin-store, passes it directly to command
invoke('print_receipt', { port: config.port, baud: config.baud, order: {...}, kind: 'customer' })

// Rust command signature:
#[tauri::command]
async fn print_receipt(port: String, baud: u32, order: OrderData, kind: String) -> Result<(), String>
```

[ASSUMED] — The exact Rust-side API for reading tauri-plugin-store in a command is not verified against official docs in this session. The "pass args from JS" alternative is simpler and has no uncertainty.

**Recommendation:** Pass config as command arguments from JS (simpler, avoids Rust store API). JS already reads from `@tauri-apps/plugin-store`.

### Anti-Patterns to Avoid

- **Blocking on Tokio async thread:** Never call `serialport::new(...).open()` directly inside an `async fn` without `spawn_blocking`. Doing so will deadlock Tokio under concurrent workloads.
- **Keeping serial port open persistently:** Open the port, write, and immediately drop. Holding an open port handle across commands creates "port in use" errors on the next write if the previous command panicked.
- **Writing UTF-8 bytes directly to printer:** Most thermal printers do not support UTF-8. Romanian characters (ă, â, î, ș, ț) must be mapped to the printer's active code page (CP852 or WPC1252). With `escpos` crate: set `page_code` in `PrinterOptions` to a code page that covers Romanian. If the printer does not support these pages, use ASCII-only fallback (strip diacritics). [MEDIUM confidence — printer behavior varies by model]
- **Using the prototype's multi-printer PRINTERS mock:** `screen-printer.jsx` currently imports from `data.jsx`. The entire component is being replaced; do not incrementally patch the mock-based version.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| ESC/POS byte sequences | Custom byte arrays for every command | `escpos` crate (v0.17) | init (`ESC @`), bold (`ESC E`), justify (`ESC a`), line spacing, cut (`GS V`) all require knowing exact byte values per spec; `escpos` encodes these correctly for Epson/Star printers |
| Serial port I/O | Custom FFI or OS APIs | `serialport` crate (v4.9) | Cross-platform abstraction handles Windows `CreateFile`/`DeviceIoControl` and POSIX `termios`; handles baud rate, stop bits, parity settings |
| Characters-per-line line wrapping | Manual string splitting | `PrinterOptions::characters_per_line()` in `escpos` | Printer truncates lines longer than paper width silently; `escpos` handles wrapping |

**Key insight:** The ESC/POS spec has dozens of commands with multi-byte encodings. A hand-rolled approach must handle printer initialization, character encoding selection, text mode, cut mode, and feed lines correctly — all with exact byte values. One wrong byte silently garbles output. Use the crate.

---

## Common Pitfalls

### Pitfall 1: "Port in Use" on Windows

**What goes wrong:** The second `save_printer_config` or `test_print` call fails with "Access is denied" on Windows COM ports.

**Why it happens:** Windows exclusive-locks COM ports. If the previous Tauri command opened a port and the `SerialPortDriver` or `serialport` handle was not dropped before the next command ran (e.g., due to a panic leaving the handle alive), the next open attempt fails.

**How to avoid:** Always drop the port handle before returning from the Rust function. Using the `?` operator returns early on error but Rust drops all values in scope, so the handle is dropped. Don't wrap port handles in `Arc<Mutex<>>` across command lifetimes — just open-use-drop per command.

**Warning signs:** "The process cannot access the file because another process is using it" (Windows) or "Device or resource busy" (macOS).

### Pitfall 2: `spawn_blocking` Not Used — Async Runtime Stall

**What goes wrong:** The app UI freezes for 1-2 seconds during a print job. Under load, other Tauri commands (SSE, API calls) may time out.

**Why it happens:** `serialport` write calls are blocking. If called inside a Tokio async task without `spawn_blocking`, they block the async thread.

**How to avoid:** All three print commands must be `async fn` and wrap their I/O bodies in `tauri::async_runtime::spawn_blocking(move || { ... }).await`.

**Warning signs:** UI stutters on "Print" click; "thread panicked" warnings about blocking in async context.

### Pitfall 3: Romanian Diacritics Garbled on Receipt

**What goes wrong:** Characters `ă`, `â`, `î`, `ș`, `ț` print as garbage or question marks.

**Why it happens:** Thermal printers do not accept UTF-8. The `escpos` crate sends text through the printer's active code page. If no `page_code` is set, the printer uses its default (often CP437 / PC437), which does not include Romanian characters.

**How to avoid:** One of:
1. Set `PrinterOptions.page_code(Some(PageCode::PC852))` — covers Romanian in code page 852.
2. If the specific printer does not support PC852, strip diacritics: `ă→a`, `â→a`, `î→i`, `ș→s`, `ț→t` before writing. This is a practical fallback for receipts.
3. Test with the target hardware before committing to a code page.

**Warning signs:** First few lines print correctly (ASCII), but Romanian characters appear as boxes/question marks/random symbols.

### Pitfall 4: Save Button Persists Config Even on Connection Failure

**What goes wrong:** Staff saves a wrong COM port, config is written to store, and all future print attempts silently fail against the wrong port.

**Why it happens:** If the Rust command writes to `tauri-plugin-store` before testing the connection, or if the JS side doesn't check the `Result` before calling `store.set()`.

**How to avoid:** Per D-11, the Rust `save_printer_config` command MUST open the port (connection test) FIRST. Only if `open()` succeeds does the command write config to the store and return `Ok(())`. On `Err`, return the error string; JS shows the red chip and does NOT call `store.set()`.

**Warning signs:** The chip shows green after Save but Test Print immediately fails.

### Pitfall 5: Empty Port List on macOS Without Drivers

**What goes wrong:** `serialport::available_ports()` returns an empty list on macOS even with a printer plugged in.

**Why it happens:** Some USB thermal printers require a USB-to-serial driver (FTDI, Prolific CH340) on macOS. Without the driver installed, the device does not enumerate as `/dev/tty.*`.

**How to avoid:** The UI must handle an empty port list gracefully — render a disabled `<option>` "No ports found" and a Refresh button per the UI-SPEC. Document for end-users that they may need to install a driver on macOS. Windows is the primary target (D-01); macOS empty list is a known edge case.

### Pitfall 6: `print_cut()` Sends Data — Don't Call `print()` Before It

**What goes wrong:** Receipt prints twice, or content prints and then the printer cuts at the wrong place.

**Why it happens:** The `escpos` Printer API has two transmission methods: `print()` (sends buffered data without cut) and `print_cut()` (sends buffered data + cut command). Calling `print()` then `print_cut()` flushes twice.

**How to avoid:** For a receipt that ends with a cut, call only `print_cut()` as the terminal call. Never call `print()` before `print_cut()` on the same receipt.

---

## Code Examples

### list_serial_ports Command (complete)

```rust
// Source: serialport-rs README + lib.rs established pattern
use serialport;

#[tauri::command]
fn list_serial_ports() -> Result<Vec<String>, String> {
    serialport::available_ports()
        .map_err(|e| e.to_string())
        .map(|ports| ports.into_iter().map(|p| p.port_name).collect())
}
```

### save_printer_config Command (skeleton)

```rust
// Source: serialport-rs README + tauri v2 command pattern
use serialport;
use std::time::Duration;
use serde::Deserialize;

#[derive(Deserialize)]
struct PrinterConfig {
    port: String,
    name: String,
    paper_width: String,    // "58mm" | "80mm"
    baud: u32,
}

#[tauri::command]
async fn save_printer_config(
    app: tauri::AppHandle,
    config: PrinterConfig,
) -> Result<(), String> {
    let config_clone = /* clone fields for move */ ;
    tauri::async_runtime::spawn_blocking(move || {
        // 1. Test connection
        serialport::new(&config_clone.port, config_clone.baud)
            .timeout(Duration::from_millis(2000))
            .open()
            .map_err(|e| format!("Cannot open {}: {}", config_clone.port, e))?;
        // Port drops immediately — just testing open works
        Ok::<(), String>(())
    })
    .await
    .map_err(|e| e.to_string())??;
    
    // 2. Persist to store (on success only) — JS handles actual store.set()
    // Return Ok(()); JS side writes to plugin-store and shows success chip
    Ok(())
}
```

**Note on store persistence:** Recommended approach is JS-side store write after `invoke('save_printer_config', ...)` resolves. This keeps the Rust command focused on the hardware test and avoids the Rust tauri-plugin-store API uncertainty (see Pitfall 4 / Assumptions A1).

### Characters Per Line by Paper Width

```rust
// [CITED: ESC/POS standard documentation + printer spec sheets]
fn chars_per_line(paper_width: &str) -> u8 {
    match paper_width {
        "58mm" => 32,   // 384 dots / ~12 dots-per-char = ~32 chars (standard font)
        "80mm" => 48,   // 576 dots / ~12 dots-per-char = ~48 chars (standard font)
        _ => 48,        // Default to 80mm
    }
}
```

[CITED: SambaPOS forum thread + ESC/POS printer data sheets — 32 chars/line for 58mm, 48 for 80mm is the industry standard at normal font size]

### JS invoke pattern for print commands

```js
// Source: established project pattern — @tauri-apps/api/core invoke, same as auth token commands
import { invoke } from '@tauri-apps/api/core';

// list_serial_ports → called on PrinterScreen mount
const ports = await invoke('list_serial_ports');  // string[]

// save_printer_config → called on Save button click
await invoke('save_printer_config', {
  config: { port: selectedPort, name: printerName, paperWidth: width, baud: 9600 }
});

// test_print → called on Test Print button
await invoke('test_print', {
  port: config.port, baud: config.baud, paperWidth: config.paperWidth,
  restaurantName: restaurantSettings?.restaurant_name ?? 'Restaurant',
});

// print_receipt → called from app.jsx onPrint(order, kind)
await invoke('print_receipt', {
  port: config.port, baud: config.baud, paperWidth: config.paperWidth,
  order: { /* normalized order fields */ }, kind,
});
```

### Order Data Struct for Rust (print_receipt)

```rust
// Matches ThermalTicket's data fields — source: screen-detail.jsx ThermalTicket component
use serde::Deserialize;

#[derive(Deserialize)]
struct OrderItem {
    name: String,
    qty: u32,
    price: f64,
    mods: Vec<String>,
    source: Option<String>,  // "global_product" items shown separately
}

#[derive(Deserialize)]
struct PrintOrderData {
    daily_order_number: u32,
    placed_at: String,
    order_type: String,    // "dinein" | "pickup" | "delivery"
    source: Option<String>,
    table: Option<String>,
    customer_name: Option<String>,
    delivery_address: Option<String>,
    notes: Option<String>,
    items: Vec<OrderItem>,
    subtotal: f64,
    tax: f64,
    delivery_fee: f64,
    discount: f64,
    total: f64,
    payment: Option<String>,
}
```

---

## Baud Rate Recommendation

**Recommendation:** Default to **9600 baud** (hardcoded in config stored by `save_printer_config`). Expose baud as a stored field (`baud` in config) but do not surface a UI selector in v1 — 9600 is the factory default for Epson TM series and Star printers.

[CITED: Beagle Hardware serial printer guide + Epson FAQ + Star Thermal default spec — "Default setting of all Star serial printers: 9600 baud, 8 data bits, no parity, 1 stop bit." Multiple manufacturer sources confirm 9600 as default.]

The stored `baud` field allows future baud-rate adjustment without schema migration. In v1, JS always writes `9600` when saving config.

---

## Tauri v2 Capability Model — Serial Port

**Finding:** Custom Rust commands registered via `invoke_handler` are automatically allowed in all windows. No new entry in `capabilities/default.json` or `capabilities/desktop.json` is needed for Phase 5. [VERIFIED: https://v2.tauri.app/security/capabilities/ — "By default, all commands that you registered in your app (using the `tauri::Builder::invoke_handler` function) are allowed to be used by all the windows and webviews of the app."]

The `serialport` crate operates entirely in Rust via OS system calls. It does not require WebView-level capability declarations (those apply to Tauri plugin commands, not native Rust commands in `lib.rs`).

**No changes needed to** `capabilities/default.json` or `capabilities/desktop.json`.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Rust / Cargo | Compile `serialport` + `escpos` | Yes | (CI environment) | — |
| `serialport` crate | `list_serial_ports`, port I/O | Will compile | 4.9.0 | — |
| `escpos` crate | ESC/POS byte generation | Will compile | 0.17.0 | Raw byte arrays |
| Physical USB printer | Integration test | NOT available in dev/CI | — | `escpresso` emulator or mock |
| Windows COM port | PRNT-01 primary target | Not verifiable in dev | — | macOS /dev/tty for dev testing |

**Missing dependencies with fallback:**
- Physical USB printer: not available in automated test environment. All Vitest unit tests mock `invoke`. Manual integration test required (Phase 5 Wave 3 verification). The `escpresso` crate (a TCP-based ESC/POS emulator with visual output) can be used for visual receipt layout testing without physical hardware.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.5 |
| Config file | `vitest.config.js` (project root) |
| Quick run command | `npx vitest run --reporter=verbose 2>&1 \| tail -20` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PRNT-01 | `list_serial_ports` invoke call populates dropdown | unit | `npx vitest run src/__tests__/screen-printer.test.jsx -t "PRNT-01"` | Wave 0 |
| PRNT-01 | Empty port list renders disabled "No ports found" option | unit | `npx vitest run src/__tests__/screen-printer.test.jsx -t "empty ports"` | Wave 0 |
| PRNT-01 | Save button invokes `save_printer_config` with correct args | unit | `npx vitest run src/__tests__/screen-printer.test.jsx -t "save config"` | Wave 0 |
| PRNT-01 | Save success shows `chip-sage` "Printer connected" | unit | `npx vitest run src/__tests__/screen-printer.test.jsx -t "save success"` | Wave 0 |
| PRNT-01 | Save failure shows `chip-red` "Connection failed" | unit | `npx vitest run src/__tests__/screen-printer.test.jsx -t "save failure"` | Wave 0 |
| PRNT-02 | Test Print button invokes `test_print` command | unit | `npx vitest run src/__tests__/screen-printer.test.jsx -t "PRNT-02"` | Wave 0 |
| PRNT-02 | Test Print disabled when no config saved | unit | `npx vitest run src/__tests__/screen-printer.test.jsx -t "test print disabled"` | Wave 0 |
| PRNT-03 | `onPrint` in app.jsx invokes `print_receipt` when config present | unit | `npx vitest run src/__tests__/print-receipt.test.jsx -t "PRNT-03"` | Wave 0 |
| PRNT-03 | `onPrint` shows "not configured" toast when no config | unit | `npx vitest run src/__tests__/print-receipt.test.jsx -t "not configured"` | Wave 0 |
| ACT-04 | Order Detail screen Print buttons call onPrint | unit | `npx vitest run src/__tests__/screen-detail.test.jsx -t "ACT-04"` | Wave 0 |

All unit tests mock `invoke` via `vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }))` (established pattern in all existing test files). Rust command correctness is verified manually with a physical printer.

### Sampling Rate

- **Per task commit:** `npx vitest run src/__tests__/screen-printer.test.jsx`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `src/__tests__/screen-printer.test.jsx` — covers PRNT-01, PRNT-02 (new file)
- [ ] `src/__tests__/print-receipt.test.jsx` — covers PRNT-03, ACT-04 (new file)
- [ ] `src/__tests__/screen-detail.test.jsx` — covers ACT-04 print button wiring (new file, or extend existing if created in Phase 4 gap closure)

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | Not applicable — print is post-auth action |
| V3 Session Management | No | — |
| V4 Access Control | No | — |
| V5 Input Validation | Yes | Validate `port` string before passing to `serialport::new()` — reject port names with path traversal characters (`..`, `/` on Windows); `baud` rate must be one of the valid values (9600, 19200, 38400, 115200) |
| V6 Cryptography | No | — |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Malicious port path injection (e.g., `port = "../../etc/passwd"`) | Tampering | Validate port name against `available_ports()` whitelist — only accept ports returned by enumeration; reject any port not in the list |
| Oversized order data in `print_receipt` | DoS | Truncate field lengths before feeding to printer (e.g., item names max 40 chars); `escpos` wraps lines but a receipt with 1000 items would exhaust paper |

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `EventSource` for SSE auth | `@microsoft/fetch-event-source` | Phase 3 | Allows Bearer headers — already implemented |
| Prototype window.* globals | ES module imports | Phase 1 | Already implemented |
| `serialport` crate for full plugin | Direct crate in `lib.rs` (no separate plugin) | Phase 5 choice | Simpler than `tauri-plugin-serialplugin` (third-party, requires capability JSON); fewer moving parts for one-printer use case |

**Deprecated/outdated:**
- `tauri-plugin-serialplugin` (s00d/tauri-plugin-serialplugin): While it exists and supports Tauri v2, it adds a full plugin layer with capability permissions, a JS class API, and persistent port handles — all overkill for a write-once printer workflow. Custom commands in `lib.rs` using `serialport` directly are simpler and match the existing auth token pattern.
- `escpos-rs` crate (Malanche, v0.4.3): Less maintained; no `SerialPortDriver`. Use `escpos` (fabienbellanger, v0.17.0) instead.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Reading tauri-plugin-store in Rust uses `app.store("preferences.json").map_err(...)?; store.get("printer")` | Pattern 5 | If the Rust store API differs, the "pass args from JS" alternative has zero risk and is preferred |
| A2 | 32 chars/line for 58mm, 48 for 80mm are correct standard values | Code Examples | If wrong, line wrapping will be off; validated by visual inspection at print time |
| A3 | `SerialPortDriver::open(path, baud, timeout)` takes 3 parameters (the third being `Option<Duration>`) | Pattern 4 | Compile error if signature differs; easily fixed at implementation time against docs.rs |
| A4 | Romanian diacritics require code page selection in `escpos` (PageCode::PC852 or similar) | Pitfall 3 | If target printers don't support PC852, ASCII fallback (strip diacritics) is the workaround |

**Verified claims:** All core crate versions (serialport 4.9.0, escpos 0.17.0), `available_ports()` API, `serialport::ErrorKind` variants, `spawn_blocking` usage pattern, Tauri v2 capability model for custom commands, `print_cut()` vs `print()` distinction, baud rate defaults — all confirmed against official docs or crates.io registry.

---

## Open Questions

1. **Does the specific printer model used by the restaurant support PC852 code page for Romanian diacritics?**
   - What we know: PC852 is standard Latin-2 and covers Romanian; `escpos` crate supports `page_code(Some(PageCode::PC852))`
   - What's unclear: Whether the actual target hardware (specific Epson/Star model used by Romanian restaurants) has PC852 in its firmware
   - Recommendation: Wave 3 manual test. For safety, implement ASCII-only diacritic stripping as a fallback in the `print_receipt` command. Bilingual footer uses only ASCII-safe characters anyway.

2. **Should `save_printer_config` write to store in Rust or return Ok(()) and let JS call `store.set()`?**
   - What we know: Both patterns work; JS already has `@tauri-apps/plugin-store` wired; the Rust store API requires `tauri_plugin_store::StoreExt` import
   - What's unclear: The exact Rust-side `tauri-plugin-store` API (StoreExt trait availability, whether `app.store()` method exists in the version installed)
   - Recommendation: JS-side store write after `invoke()` resolves. The auth token commands (Phase 2) use the `keyring` crate for storage, not `plugin-store` — there is no existing Rust-side plugin-store usage to reference. Keeping the write in JS matches all prior store patterns.

---

## Project Constraints (from CLAUDE.md)

| Directive | Impact on Phase 5 |
|-----------|-------------------|
| `@charlyk/admin-client` is the ONLY data layer for API calls | Not applicable — print commands do not make API calls |
| No `window.*` globals in production code | Not applicable — new Rust commands, no prototype globals |
| `tauri-plugin-store` for persistence | Printer config stored as `'printer'` key per D-05 |
| Rust side is thin: `tauri-plugin-store`, thermal printing only | Phase 5 Rust additions are exactly: `serialport` + `escpos` for thermal printing |
| Design fidelity — no new CSS classes without documenting | `screen-printer.jsx` redesign uses only existing `.card`, `.btn-primary`, `.btn-secondary`, `.chip`, `.chip-sage`, `.chip-red`, `.chip-dot`, `.eyebrow` classes (all confirmed in `styles.css`) |
| Unready features greyed out | Auto-print toggle: rendered with `opacity: 0.45; pointer-events: none` per UI-SPEC |
| TypeScript excluded — plain JavaScript | All new JS files are `.jsx`/`.js`, no TypeScript |

---

## Sources

### Primary (HIGH confidence)
- `crates.io` API — verified `escpos` = 0.17.0 (2025-09-15), `serialport` = 4.9.0 (2026-03-16)
- `https://github.com/serialport/serialport-rs` README — `available_ports()`, `serialport::new().timeout().open()`, write pattern
- `https://docs.rs/escpos/latest/escpos/` — SerialPortDriver::open, PrinterOptions::characters_per_line, Printer fluent API
- `https://v2.tauri.app/develop/calling-rust/` — async command pattern, spawn_blocking, Result<T, String>
- `https://v2.tauri.app/security/capabilities/` — custom invoke_handler commands auto-allowed, no capability JSON needed
- `https://docs.rs/serialport/latest/serialport/enum.ErrorKind.html` — NoDevice, InvalidInput, Unknown, Io variants
- `.planning/phases/05-native-integration/05-CONTEXT.md` — locked decisions D-01 through D-13
- `.planning/phases/05-native-integration/05-UI-SPEC.md` — component inventory, copywriting contract, receipt content contract
- `src/screen-detail.jsx` — ThermalTicket component (receipt data structure reference)
- `src-tauri/src/lib.rs` — existing command pattern (store_token/get_token/delete_token)
- `src/__tests__/screen-orders.test.jsx` — established `vi.mock('@tauri-apps/api/core')` test pattern

### Secondary (MEDIUM confidence)
- Multiple manufacturer docs (Beagle Hardware, Star spec sheet, Epson FAQ) confirming 9600 baud default
- SambaPOS forum + ESC/POS data sheets confirming 32 chars/58mm and 48 chars/80mm at standard font
- `https://v2.tauri.app/security/capabilities/` — confirmed custom commands do not need capability declarations

### Tertiary (LOW confidence)
- Rust-side `tauri-plugin-store` API (reading from store in Rust commands) — not verified; recommended to avoid in Phase 5

---

## Metadata

**Confidence breakdown:**
- Standard stack (serialport, escpos crates): HIGH — verified against crates.io registry and official docs
- Architecture (spawn_blocking pattern, command structure): HIGH — verified against Tauri v2 official docs
- Capability model (no new entry needed): HIGH — verified against Tauri v2 security docs
- ESC/POS content (receipt structure): HIGH — derived from ThermalTicket component in codebase
- Baud rate defaults: HIGH (CITED from multiple manufacturer sources)
- Characters per line (32/48): MEDIUM — consistent across sources but not verified against specific target hardware
- Romanian character encoding: MEDIUM — PC852 is the standard approach; hardware support varies

**Research date:** 2026-04-28
**Valid until:** 2026-07-28 (stable crate APIs; `escpos` and `serialport` are stable libraries)
