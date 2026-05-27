# Phase 5: Native Integration - Context

**Gathered:** 2026-04-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Wire the Printer Setup screen and Order Detail screen to a real USB thermal printer via Tauri Rust commands — staff can configure a USB COM port, send a test print, and print a receipt for any order. All communication uses ESC/POS bytes sent over a serial connection via the `serialport` Rust crate. No system print dialog.

**In scope:**
- Redesign Printer Setup screen as a single-printer configuration form (port picker, paper width, printer name)
- Tauri Rust command to enumerate available serial ports (`list_serial_ports`)
- Tauri Rust commands to save printer config to `tauri-plugin-store` and test connection
- Tauri Rust command to send an ESC/POS test receipt
- Tauri Rust command to send an ESC/POS customer receipt for a real order
- Wire `onPrint` in `app.jsx` (currently a no-op) to invoke the print command
- ACT-04, PRNT-01, PRNT-02, PRNT-03

**Out of scope:**
- TCP/IP printer support (deferred to a future release)
- Multi-printer support with kitchen/bar/customer roles (deferred)
- Auto-print on new order (greyed-out toggle — not wired in v1)
- QR code on receipt (deferred)
- Print job queuing / retry on reconnect (deferred)

</domain>

<decisions>
## Implementation Decisions

### Connection Scope (PRNT-01)

- **D-01:** Connection type is **USB serial (COM port)** for v1. Thermal printers used by Romanian restaurants are predominantly USB-connected on Windows machines, where they appear as COM ports.
- **D-02:** Port selection uses **enumeration** — a Tauri command calls `serialport::available_ports()` and returns the list. The Printer Setup form renders a dropdown of discovered ports. No manual text entry required.
- **D-03:** TCP/IP support is **deferred** to a future release. Once USB is working, TCP is low-cost to add (same ESC/POS bytes, different transport), but is out of scope for Phase 5.

### Printer Count + Config Storage (PRNT-01)

- **D-04:** v1 supports **one configured printer**. All print actions (test print, receipt from Order Detail) go to this single printer.
- **D-05:** Printer config is persisted in **`tauri-plugin-store`** (already installed) under a `'printer'` key as `{ port, name, paperWidth, baud }`. Consistent with how auth token and UI preferences are stored.
- **D-06:** The Printer Setup screen is **redesigned as a single-printer form** — drop the multi-printer list layout from the prototype. UI contains: port dropdown (populated from serial port enumeration), paper width toggle (58mm / 80mm), printer name text field, Save button, Test Print button.

### Receipt Content (PRNT-03, ACT-04)

- **D-07:** Receipt **header**: restaurant name and address, pulled from `restaurantSettings` (already flows into `screen-detail.jsx` as a prop).
- **D-08:** Receipt **body**:
  - Order number (`dailyOrderNumber`) and date/time placed
  - Customer name (if present on the order)
  - Each line item: name, quantity, unit price
  - Item modifiers as sub-lines below each item (e.g., "+ extra cheese")
- **D-09:** Receipt **totals**: subtotal, delivery fee (if applicable), total. Tax line at Claude's discretion based on what the normalized order object carries.
- **D-10:** Receipt **footer**: bilingual thank-you line — `Mulțumim! / Thank you!` followed by paper cut command.

### Save + Test Flow (PRNT-01, PRNT-02)

- **D-11:** Clicking **Save** immediately attempts a live connection test — opens the COM port and sends a minimal ESC/POS status ping. On success: show a green "Printer connected" status chip and persist config to `plugin-store`. On failure: show error message inline and do not persist.
- **D-12:** The **Test Print** button prints a short test slip: restaurant name, "Test Print", timestamp, and a ruler line to verify paper width alignment. Does not require a real order — uses config data only.
- **D-13:** If a print job fails mid-way (e.g., printer goes offline), the app shows an **error toast** (`'Print failed — check printer connection'`) and does not retry automatically. Consistent with the error-handling pattern used throughout the app (see Phase 3/4 mutation error toasts).

### Claude's Discretion

- **Baud rate**: Most Epson/Star thermal printers default to 9600 baud; some use 19200 or 38400. Research the most common setting for target models and either hard-code 9600 or make it a hidden advanced option.
- **Paper cut command**: Include auto-cut ESC/POS command at the end of every receipt (maps to the prototype's "Auto paper cut" toggle — treat as always-on in v1).
- **Language of receipt**: Use the app's current `lang` store value (RO by default). Items printed in RO language. The footer is bilingual by decision D-10.
- **ESC/POS crate selection**: Choose between `escpos-rs` (feature-rich, actively maintained) and raw byte arrays. Research which is better supported for the `serialport` integration on Windows.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` — ACT-04, PRNT-01, PRNT-02, PRNT-03 (Phase 5 requirements)

### Existing Code — Key Files
- `src/screen-printer.jsx` — Current prototype-era printer screen (uses mock PRINTERS data; will be redesigned per D-06)
- `src/screen-detail.jsx` — Contains `OrderDetailScreen` with `onPrint` prop and `ThermalTicket` component (receipt visual preview — reference for receipt content structure)
- `src/app.jsx` lines 167, 170 — `onPrint={() => {}}` no-op; this is the integration point to wire in Phase 5
- `src-tauri/src/lib.rs` — Existing Tauri Rust commands (store_token, get_token, delete_token); add printer commands here
- `src-tauri/Cargo.toml` — Add `serialport` crate (and optionally `escpos-rs`) here

### Tauri / Rust
- `src-tauri/tauri.conf.json` — May need capability update for serial port access (check Tauri 2 capability model)

### Prior Phase Context
- `.planning/phases/04-core-screens/04-CONTEXT.md` — D-13 (CancelDialog error pattern), D-20 (mutation toast on error pattern) — follow same error handling style

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `ThermalTicket` component (`src/screen-detail.jsx:253`) — renders the receipt visual preview; defines the data fields available on a normalized order; use as the reference spec for ESC/POS content
- `useAppStore` (lang, restaurantSettings pattern) — `lang` is available from Zustand for receipt language
- `tauri-plugin-store` — already wired in `lib.rs`; use same store instance for printer config
- Toast pattern from Phase 4 mutations — `addToast({ type: 'error', message: ... })` — use for print failure feedback

### Established Patterns
- Tauri commands follow the `#[tauri::command]` + `invoke_handler` registration pattern in `lib.rs`
- JS side calls commands via `invoke('command_name', { ...args })` from `@tauri-apps/api/core`
- Error handling: Rust commands return `Result<T, String>`; JS `.catch` maps to an error toast
- Config persistence: `tauri-plugin-store` with a named store file — follow the auth token pattern

### Integration Points
- `app.jsx` `onPrint` prop (lines 167, 170) — replace `() => {}` with a real print handler
- `screen-printer.jsx` — full redesign as a single-printer form; replace PRINTERS mock import with Tauri invoke calls
- `src-tauri/Cargo.toml` + `lib.rs` — add `serialport` dependency and new Rust commands

</code_context>

<specifics>
## Specific Ideas

- Windows-first deployment context: USB thermal printers on Windows appear as COM ports (COM3, COM4, etc.). The port enumeration dropdown must present COM port labels on Windows and `/dev/tty*` paths on macOS.
- The restaurant's staff are non-technical — the port picker dropdown is important; manual COM port entry would create support issues.
- Receipt content follows what `ThermalTicket` already renders visually — keep the same data fields so the preview and printed output stay in sync.

</specifics>

<deferred>
## Deferred Ideas

- **TCP/IP printer support** — Low-cost to add after USB works (same ESC/POS bytes, socket transport). Future phase or minor follow-up.
- **Multi-printer with roles** (kitchen ticket + customer receipt + bar) — Prototype shows 3 printers; deferred until multi-printer demand is confirmed.
- **Auto-print on new order** — SSE-triggered automatic printing when a new order arrives. The toggle exists in the prototype UI (render it greyed-out/disabled in v1).
- **QR code on receipt** — Requires ESC/POS GS v0 image command or QR module; deferred.
- **Print job queue with reconnect retry** — Complex state; error-toast-and-retry-manually is sufficient for v1.

</deferred>

---

*Phase: 5-Native Integration*
*Context gathered: 2026-04-28*
