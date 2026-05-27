---
phase: "05"
plan: "02"
subsystem: rust-native
tags: [thermal-printer, escpos, serialport, tauri-commands, wave-1]
dependency_graph:
  requires: [05-01]
  provides: [tauri-cmd-list-serial-ports, tauri-cmd-save-printer-config, tauri-cmd-test-print, tauri-cmd-print-receipt]
  affects: [src-tauri/src/lib.rs, src-tauri/Cargo.toml]
tech_stack:
  added: [serialport@4.9, escpos@0.17+serial_port]
  patterns: [spawn-blocking-serial-io, escpos-fluent-api, validate-port-whitelist, strip-diacritics-ascii-fallback]
key_files:
  created: []
  modified:
    - src-tauri/Cargo.toml
    - src-tauri/src/lib.rs
    - src-tauri/Cargo.lock
decisions:
  - "PrinterOptions::new(None, None, chars) used instead of builder pattern — characters_per_line() is a mutating setter returning () not Self"
  - "Printer::new() must be bound to a named variable before calling .init() to avoid temporary value drop while borrowed"
  - "validate_port() called synchronously before spawn_blocking — OS port enumeration is fast enough to run outside the blocking thread"
  - "table field retained in PrintOrderData struct (not printed) — mirrors ThermalTicket data contract for future dine-in table printing"
metrics:
  duration: "25 minutes"
  completed: "2026-04-28"
  tasks_completed: 2
  tasks_total: 2
  files_changed: 3
---

# Phase 5 Plan 02: Rust Thermal Print Commands

One-liner: 4 Tauri Rust commands for USB serial thermal printing — list_serial_ports (sync), save_printer_config (async connection test), test_print (test receipt), print_receipt (full ESC/POS receipt matching ThermalTicket layout) with port injection prevention and Romanian diacritic stripping.

## What Was Built

Two files updated to add the native serial/ESC/POS printing layer for Phase 5:

| File | Change | Lines |
|------|--------|-------|
| `src-tauri/Cargo.toml` | Added serialport 4.9 and escpos 0.17 dependencies | +2 |
| `src-tauri/src/lib.rs` | Added 4 commands, 4 helpers, 2 data structs, updated invoke_handler | +354 |
| `src-tauri/Cargo.lock` | Auto-updated by cargo check | +109 |

### Commands Added

| Command | Type | Purpose |
|---------|------|---------|
| `list_serial_ports` | sync fn | OS port enumeration via `serialport::available_ports()` → `Vec<String>` |
| `save_printer_config` | async + spawn_blocking | Open COM port as connection test; returns Ok(()) on success; JS writes config to store |
| `test_print` | async + spawn_blocking | Print test slip: restaurant name, "TEST PRINT", ruler, cut |
| `print_receipt` | async + spawn_blocking | Full ESC/POS receipt: header, kitchen banner (kitchen only), order ID, items with mods, totals (customer only), footer + cut |

### Helpers Added

| Helper | Purpose |
|--------|---------|
| `strip_diacritics()` | Romanian character → ASCII fallback (ă→a, â→a, î→i, ș→s, ț→t) |
| `chars_per_line()` | 58mm→32, 80mm→48 characters per line |
| `validate_port()` | Whitelists port against `available_ports()` — prevents T-05-02 path injection |

### Security Mitigations (from threat model)

| Threat | Mitigation | Status |
|--------|-----------|--------|
| T-05-02: Port path injection | `validate_port()` called before spawn_blocking in all 3 I/O commands | Implemented |
| T-05-03: DoS via oversized print data | Item names and customer_name truncated to 40 chars via `.min(40)` | Implemented |

## Commits

| Hash | Description |
|------|-------------|
| 9ce24aa | chore(05-02): add serialport 4.9 and escpos 0.17 crate dependencies |
| f74da3a | feat(05-02): implement 4 Tauri print commands in lib.rs |
| 453b5fc | chore(05-02): update Cargo.lock for serialport and escpos dependencies |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed PrinterOptions builder pattern — API is mutating setter, not fluent builder**

- **Found during:** Task 2 — cargo check
- **Issue:** Plan specified `PrinterOptions::default().characters_per_line(chars)` — this returns `()` because `characters_per_line(&mut self, ...)` is a mutating setter. Rust inferred the type as `()`, causing a type mismatch when passed to `Printer::new(..., Some(()))`.
- **Fix:** Used `PrinterOptions::new(None, None, chars)` constructor which correctly creates a `PrinterOptions` with the specified characters per line.
- **Compiler error:** `expected PrinterOptions, found ()`
- **Files modified:** src-tauri/src/lib.rs

**2. [Rule 1 - Bug] Fixed temporary value drop while borrowed**

- **Found during:** Task 2 — cargo check (after fix 1)
- **Issue:** `let mut p = Printer::new(...).init().map_err(...)` — `Printer::new()` creates a temporary that is freed at the end of the statement. Subsequent lines reborrows `p` (which was a `&mut Printer` from the now-dropped temporary).
- **Fix:** Split into two lines: `let mut printer = Printer::new(...)` to own the value, then `let mut p = printer.init()...` to borrow from the owned value.
- **Compiler error:** `temporary value dropped while borrowed`
- **Files modified:** src-tauri/src/lib.rs

**3. [Rule 1 - Bug] Fixed test_print fluent chain return type mismatch**

- **Found during:** Task 2 — cargo check (first pass, same batch as above)
- **Issue:** The fluent chain ended with `.print_cut().map_err(|e| e.to_string())` which returns `Result<&mut Printer, String>`, not `Result<(), String>`. The spawn_blocking closure return type mismatch caused a `?` operator error.
- **Fix:** Changed the test_print chain to end with `.print_cut().map_err(|e| e.to_string())?;` then `Ok::<(), String>(())` — consistent with the print_receipt pattern.
- **Files modified:** src-tauri/src/lib.rs

## Known Stubs

None. All functionality in this plan is fully implemented. JS-side integration (screen-printer.jsx redesign, app.jsx onPrint wiring) is handled by Wave 3 (Plans 05-03 and 05-04).

## Threat Flags

No new security surface beyond what is in the plan's threat model.

## Self-Check: PASSED

- [x] `src-tauri/Cargo.toml` has `serialport = "4.9"` at line 27
- [x] `src-tauri/Cargo.toml` has `escpos = { version = "0.17", features = ["serial_port"] }` at line 28
- [x] Both are in `[dependencies]`, not target-scoped
- [x] `src-tauri/src/lib.rs` has 4 new `#[tauri::command]` functions
- [x] 3 spawn_blocking calls (save_printer_config, test_print, print_receipt)
- [x] 4 validate_port references (1 definition + 3 call sites)
- [x] 10 strip_diacritics references (1 definition + 9 call sites)
- [x] invoke_handler registers all 7 commands (3 existing + 4 new)
- [x] 2 print_cut calls (test_print + print_receipt), 0 print() calls
- [x] `cargo check` passes with 0 errors, 1 expected warning (table field unused)
- [x] Commits 9ce24aa, f74da3a, 453b5fc exist in git log
