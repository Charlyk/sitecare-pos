---
phase: 05-native-integration
status: needs-fixes
reviewed_files: 5
findings:
  critical: 0
  high: 2
  medium: 4
  low: 3
  info: 2
---

# Code Review — Phase 05: Native Integration

## Summary

Five files reviewed: `src-tauri/Cargo.toml`, `src-tauri/src/lib.rs`, `src/app.jsx`,
`src/i18n.jsx`, `src/screen-printer.jsx`.

The overall architecture is sound: `validate_port` correctly guards against port injection by
checking against the OS-enumerated list, blocking I/O is correctly moved into `spawn_blocking`,
and error handling flows from Rust through to user-facing toasts. `i18n.jsx` is complete and
symmetric — both locales have identical key sets.

Two issues require fixes before shipping: a Rust panic that is reachable with ordinary non-ASCII
customer data, and a JavaScript race condition that silently corrupts the saved printer-port
selection. Four medium-severity defects cover column-alignment overflow, a missing null guard, and
incomplete truncation coverage. Low-priority items are noted below.

---

## Findings

### HIGH — Byte-slice truncation panics on non-Romanian Unicode in customer/item data

**File:** `src-tauri/src/lib.rs:262, 268, 277`

**Issue:** All truncation sites use `&safe[..safe.len().min(40)]`, which is a *byte* index into a
UTF-8 string. `strip_diacritics` only normalises Romanian diacritics — any other multi-byte
characters (`é`, `á`, `ñ`, Cyrillic, Arabic, CJK, etc.) are passed through unchanged via the
`other => other` arm. If a customer name or item name contains such a character that spans the
byte-40 boundary, Rust panics with a thread-level `byte index N is not a char boundary` error,
crashing the `spawn_blocking` task and returning a generic `JoinError` to the caller.

Concrete example: a customer name consisting of 39 ASCII characters followed by `é` is 41 bytes;
`min(40)` = 40; `&safe[..40]` splits the two-byte sequence for `é` and panics.

```rust
// Proof (Python equivalent):
// s = 'a' * 39 + 'é'   # 40 chars, 41 bytes
// b.encode('utf-8')[:40].decode('utf-8')  -> UnicodeDecodeError
```

**Fix:** Replace byte-based slicing with a char-based approach at every truncation site:

```rust
// Instead of:
let truncated = &safe[..safe.len().min(40)];

// Use:
let truncated: String = safe.chars().take(40).collect();
```

Apply this pattern to all three truncation sites: `customer_name` (line 262),
`delivery_address` (line 268), and `item.name` (line 277).

---

### HIGH — Race condition: concurrent Promises overwrite saved port selection on mount

**File:** `src/screen-printer.jsx:42-63`

**Issue:** The `useEffect` on mount fires two concurrent Promises without sequencing:

1. `invoke('list_serial_ports')` — on success, **unconditionally** calls
   `setSelectedPort(list[0])` (line 46).
2. `load('preferences.json')` then `.get('printer')` — on success, calls
   `setSelectedPort(config.port)` (line 55).

Both run in parallel. If the `invoke` Promise resolves *after* the store load (which can happen on
first mount when the Tauri IPC round-trip is slightly slower than the async store read),
`list[0]` overwrites the saved `config.port`. The user sees the correct config rendered briefly,
then it snaps to the first OS port — the classic last-write-wins race.

The `handleRefreshPorts` function at line 69 correctly guards with `!selectedPort`, but the mount
path at line 46 has no such guard.

**Fix:** Load saved config first; use the port from config as the initial selection and only fall
back to `list[0]` if no saved port exists:

```javascript
useEffect(() => {
  // Load config first, then discover ports
  load('preferences.json', { autoSave: false })
    .then((store) => store.get('printer'))
    .then((config) => {
      const savedPort = config?.port ?? null;
      if (savedPort) {
        setSelectedPort(savedPort);
        setPrinterName(config.name ?? '');
        setWidth(config.paperWidth ?? '80mm');
        setHasConfig(true);
        setSaveStatus('success');
      }
      // Now fetch ports, fall back to list[0] only if no saved port
      return invoke('list_serial_ports').then((list) => {
        setPorts(list);
        if (!savedPort && list.length > 0) setSelectedPort(list[0]);
      });
    })
    .catch(() => {
      // Store unavailable — still load ports
      invoke('list_serial_ports')
        .then((list) => { setPorts(list); if (list.length > 0) setSelectedPort(list[0]); })
        .catch(() => setPorts([]));
    });
}, []);
```

---

### MEDIUM — Totals section column alignment overflows for large monetary values

**File:** `src-tauri/src/lib.rs:329-341`

**Issue:** The totals block (Subtotal, TVA, Livrare, Discount) computes padding using hardcoded
right-column widths of 5 (for positive amounts) and 6 (for the discount line with its `-` prefix):

```rust
let sub_line = format!("Subtotal{}{:.2}",
    " ".repeat(chars.saturating_sub(8 + 5)),
    order.subtotal);
```

`{:.2}` formats to the *natural* width of the number — `"1.00"` is 4 chars, `"12345.67"` is 8
chars. The hardcoded `5` assumes every formatted amount is exactly 5 characters wide. For an order
subtotal of `12345.67` on an 80mm printer (48 cols):

- Spaces = 48 - 8 - 5 = 35
- Actual line = `"Subtotal"` (8) + 35 spaces + `"12345.67"` (8) = 51 chars — 3 characters past the
  column width.

The printer auto-wraps at the hardware column boundary, producing misaligned output. The same bug
affects `TVA 19%`, `Livrare`, and `Discount` lines. By contrast, the `TOTAL RON` and `Plata` lines
compute padding from the actual formatted string length and are correct.

**Fix:** Compute padding from the actual formatted value string:

```rust
let sub_str = format!("{:.2}", order.subtotal);
let sub_line = format!(
    "Subtotal{}{}",
    " ".repeat(chars.saturating_sub("Subtotal".len() + sub_str.len())),
    sub_str
);
```

Apply the same pattern to the `TVA 19%`, `Livrare`, and `Discount` lines.

---

### MEDIUM — `handleTestPrint` dereferences `config` without a null guard

**File:** `src/screen-printer.jsx:96-103`

**Issue:** `handleTestPrint` reads `config` from the store and immediately accesses `config.port`
(line 99) without checking whether `config` is null. The button is disabled when `hasConfig` is
false, but `hasConfig` is UI state — it can be `true` while the store entry has been cleared by
another process, a factory-reset operation, or a Tauri store migration. If `config` is `null`,
`config.port` throws a `TypeError` before the `catch` block can produce a useful error message
(the raw `TypeError` is stringified and shown in a toast, confusing users).

```javascript
// Current — will throw TypeError if config is null:
const config = await store.get('printer');
await invoke('test_print', { port: config.port, ... });
```

**Fix:**

```javascript
const config = await store.get('printer');
if (!config?.port) {
  pushToast({ id: Date.now(), kind: 'error', title: t('printer_not_configured'), detail: '' });
  return;
}
await invoke('test_print', { port: config.port, baud: config.baud ?? 9600, ... });
```

---

### MEDIUM — `notes` field is not length-truncated before writing to receipt

**File:** `src-tauri/src/lib.rs:310-322`

**Issue:** Customer notes are written to the receipt without any length cap. The `notes` field in
`PrintOrderData` accepts an unbounded `String`. A note containing several paragraphs will produce
dozens of lines of wrapped text on the thermal receipt, potentially consuming the entire paper roll.
All other user-controlled strings (customer name, delivery address, item names) have a 40-character
truncation guard. Notes are the only field that lacks one.

**Fix:** Apply the same char-based truncation pattern, or wrap at `chars` columns:

```rust
if let Some(ref notes) = order.notes {
    let safe_notes = strip_diacritics(notes);
    // Truncate to 3 lines worth of content
    let truncated_notes: String = safe_notes.chars().take(chars * 3).collect();
    p = p
        .writeln(&ruler).map_err(|e| e.to_string())?
        .bold(true).map_err(|e| e.to_string())?
        .writeln("NOTE:").map_err(|e| e.to_string())?
        .bold(false).map_err(|e| e.to_string())?
        .writeln(&truncated_notes).map_err(|e| e.to_string())?;
}
```

---

### MEDIUM — Modifier strings (`mods`) not truncated, can overflow column width

**File:** `src-tauri/src/lib.rs:303-306`

**Issue:** Modifier sub-lines are printed as `"  -> {safe_mod}"` with no length cap:

```rust
let safe_mod = strip_diacritics(m);
p = p.writeln(&format!("  -> {}", safe_mod)).map_err(|e| e.to_string())?;
```

A modifier string of 200 characters (valid API data) would produce a multi-line output. The
`  -> ` prefix consumes 5 characters, leaving only 27 chars (58mm) or 43 chars (80mm) before
wrapping. Unlike item names and customer names, no truncation is applied.

**Fix:**

```rust
let safe_mod: String = strip_diacritics(m).chars().take(chars - 5).collect();
p = p.writeln(&format!("  -> {}", safe_mod)).map_err(|e| e.to_string())?;
```

---

### LOW — `restaurant_name` and `restaurant_address` not truncated

**File:** `src-tauri/src/lib.rs:147, 201, 212`

**Issue:** `restaurant_name` (used in both `test_print` and `print_receipt`) and
`restaurant_address` (used in `print_receipt`) undergo `strip_diacritics` but no length cap. A
restaurant configured with a very long name will overflow the column width and wrap on the printer
header. This is a cosmetic/formatting issue rather than a crash risk, because `strip_diacritics`
guarantees the output is valid UTF-8 with no multi-byte boundaries to split. Severity is LOW
because restaurant name is operator-controlled data (not customer-supplied).

**Fix:** Apply `chars().take(chars_per_line)` to `rname` before writing, and to `addr` before
writing:

```rust
let rname_truncated: String = rname.chars().take(chars as usize).collect();
// ...
.writeln(&rname_truncated.to_uppercase())
```

---

### LOW — `baud` rate accepted without server-side validation

**File:** `src-tauri/src/lib.rs:123, 139, 182`

**Issue:** The `baud: u32` parameter is passed directly to `serialport::new()` and
`SerialPortDriver::open()` with no range check. A `baud` value of `0` or a non-standard value like
`1` would cause the underlying OS serial driver to return an error (not a Rust panic), which
propagates correctly. However, the JavaScript side always sends `9600` and never exposes baud
selection to the user, so this is a latent quality gap rather than an active risk. If baud
selection is added to the UI in a future phase, the lack of server-side validation becomes a
correctness issue.

**Fix (defensive):** Validate against accepted baud rates before opening:

```rust
const VALID_BAUDS: &[u32] = &[9600, 19200, 38400, 57600, 115200];
if !VALID_BAUDS.contains(&baud) {
    return Err(format!("Unsupported baud rate: {}", baud));
}
```

---

### INFO — `Cargo.toml` contains placeholder metadata

**File:** `src-tauri/Cargo.toml:3-4`

**Issue:** `description = "A Tauri App"` and `authors = ["you"]` are the Tauri scaffold defaults.
These appear in `tauri info` output and in any generated binaries' metadata.

**Fix:** Update to reflect the actual project:

```toml
description = "SiteCare POS — restaurant order management for macOS and Windows"
authors = ["SiteCare <dev@sitecare.ro>"]
```

---

### INFO — `placed_at` byte-range slice is not char-safe for non-ISO timestamps

**File:** `src-tauri/src/lib.rs:239-243`

**Issue:** Time extraction uses a byte slice `order.placed_at[11..16]`. For standard ISO-8601
strings (`"2024-01-15T13:45:00Z"`), positions 11-16 are ASCII and the slice is safe. The `len >=
16` guard prevents an out-of-bounds panic, but if `placed_at` ever contains a non-ASCII character
before position 16 (e.g., a localised timestamp string from a future API change), the byte slice
could panic. This is a low-probability theoretical risk given ISO-8601 is ASCII by definition, but
it is inconsistent with the char-safety concerns elsewhere.

**Fix:** Use a chars-based approach or parse with a time library:

```rust
let time_str = if order.placed_at.len() >= 16 {
    order.placed_at.chars().skip(11).take(5).collect::<String>()
} else {
    order.placed_at.clone()
};
```

---

## Clean Areas

- **`validate_port` security design** — checking the requested port against
  `serialport::available_ports()` is the correct approach for T-05-02 / ASVS V5 input validation.
  The validation runs synchronously on the Tauri async thread *before* `spawn_blocking`, so no
  port-path injection can enter the blocking closure.

- **`spawn_blocking` usage** — all serial I/O (`open`, `write`, `flush`) is correctly placed inside
  `tauri::async_runtime::spawn_blocking`. The async command handlers do not block the Tokio runtime.

- **`keyring` token storage** — `store_token`, `get_token`, and `delete_token` are correctly
  implemented: `delete_credential` is idempotent (no error on missing entry), and `NoEntry` is
  handled as `Ok(None)` rather than an error.

- **`i18n.jsx` symmetry** — both `ro` and `en` locales have exactly 174 keys with no gaps.

- **`handlePrint` in `app.jsx`** — correctly guards against unconfigured printer with a toast
  message and early return before invoking any Tauri command. Error handling wraps the full
  `invoke` call.

- **`strip_diacritics` correctness** — covers both legacy cedilla forms (`ş`/`ţ`) and modern comma
  forms (`ș`/`ț`) for Romanian, which is the correct and complete set for ESC/POS ASCII-only
  printers in a Romanian POS context.

- **Column alignment using `saturating_sub`** — prevents integer underflow (no panic) when content
  exceeds column width; the line overflows at most but does not crash. Only the hardcoded right-
  column width for totals produces consistent misalignment (addressed in MEDIUM finding above).
