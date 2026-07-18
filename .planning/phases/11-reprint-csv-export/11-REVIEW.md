---
phase: 11-reprint-csv-export
reviewed: 2026-07-19T00:00:00Z
depth: standard
files_reviewed: 12
files_reviewed_list:
  - src/history-utils.js
  - src/i18n.jsx
  - src/app.jsx
  - src/screen-detail.jsx
  - src/screen-history.jsx
  - src-tauri/src/lib.rs
  - src-tauri/capabilities/default.json
  - src-tauri/Cargo.toml
  - src/__tests__/history-utils.test.js
  - src/__tests__/app-history-route.test.jsx
  - src/__tests__/screen-detail.test.jsx
  - src/__tests__/screen-history.test.jsx
findings:
  critical: 1
  warning: 2
  info: 1
  total: 4
status: issues_found
---

# Phase 11: Code Review Report

**Reviewed:** 2026-07-19T00:00:00Z
**Depth:** standard
**Files Reviewed:** 12
**Status:** issues_found

## Summary

Reviewed the plugin-dialog/plugin-fs install, `buildCsv()` (CSV-injection guard, RFC-4180
escaping, BOM), the HIST-11 reprint wiring in the read-only order detail, and the HIST-12
Export CSV handler (`save()` → `writeTextFile()`), against the actual diff introduced by this
phase (`git diff ab34782a0..HEAD`).

Areas that check out cleanly:
- **Capability scope** (`src-tauri/capabilities/default.json`): exactly `dialog:allow-save` +
  `fs:allow-write-text-file` were added, with no `fs:scope` entry — the minimal grant the phase
  intended. `Cargo.toml`/`lib.rs` register exactly the two matching plugins, nothing more.
- **`save()`/`writeTextFile()` control flow** (`screen-history.jsx:handleExportCsv`): a canceled
  save dialog (`path` falsy) returns before `writeTextFile` is ever called and never reaches the
  `catch`; a genuine `save()` or `writeTextFile()` throw is the only path that produces the error
  toast. This matches the `Export CSV` test suite exactly.
- **RFC-4180 escaping / BOM** (`history-utils.js:buildCsv`): guard-before-quote ordering is
  correct, BOM is emitted exactly once at position 0, `null`/`undefined` degrade to empty fields
  rather than the literal strings `'null'`/`'undefined'`, and the header line is fixed/English
  regardless of locale.

One genuine functional defect was found in the reprint path (a pre-existing struct now exercised
by this phase's new `onPrint={handlePrint}` wiring), plus two quality/robustness issues in the
newly-added code.

## Critical Issues

### CR-01: Reprint (and live print) fails for orders whose `dailyOrderNumber` is not a JS number

**File:** `src/app.jsx:145` (payload construction), `src-tauri/src/lib.rs:55` (Rust field type)
**Issue:**
`handlePrint` sends the order's daily number straight through, unguarded:

```js
// src/app.jsx:140-171
await invoke('print_receipt', {
  ...
  order: {
    daily_order_number: order.dailyOrderNumber,
    ...
  },
  kind,
});
```

but the Rust command's struct declares this field as a strict `u32`, not `Option<...>` or a
flexible type:

```rust
// src-tauri/src/lib.rs:53-72
#[derive(Deserialize)]
struct PrintOrderData {
    daily_order_number: u32,
    ...
}
```

Multiple places in this exact phase (`history-utils.js:csvOrderNumber`, `screen-history.jsx`'s
`orderNumberLabel`, and the D-05 comment in `screen-detail.jsx:30-34`) explicitly document and
test the case where `order.dailyOrderNumber` is **not** a number — normalizeOrder's UUID-fallback
path (`typeof num === 'number'` is used everywhere else specifically to guard against this). The
print payload is the one call site that skips this check entirely.

When `order.dailyOrderNumber` is `null`/`undefined`/a UUID string, `serde` will reject the
argument with a deserialization error, Tauri rejects the `invoke()` promise, and the whole
`print_receipt` command fails before printing anything. `handlePrint`'s `catch` surfaces this as
a generic `print_failed` toast — the order is simply "not printable" with no indication why. This
is directly relevant to HIST-11 (reprint): the read-only history route is exactly where orders
with a missing/fallback daily number are most likely to be opened and reprinted (older orders,
data migrated before daily numbering existed, etc.).

Note the sibling `table` field one line above was explicitly coerced to guard against this exact
Rust-deserialization pitfall (`table: order.table != null ? String(order.table) : null` with a
comment: "Coerced: Rust deserializes this as Option<String>, and a numeric table would fail the
whole payload.") — the same treatment was never applied to `daily_order_number`.

**Fix:** Coerce on the JS side to match what Rust can always deserialize, e.g.:
```js
// app.jsx
daily_order_number: typeof order.dailyOrderNumber === 'number' ? order.dailyOrderNumber : 0,
```
or (preferred, since `0` is a misleading number on the ticket) change the Rust struct to accept
a display-ready label instead of a numeric type:
```rust
// lib.rs
struct PrintOrderData {
    order_number: String, // formatted client-side via the same fallback used everywhere else
    ...
}
```
and update `print_receipt`'s `order_label` construction accordingly.

## Warnings

### WR-01: `printerConfigured` effect has no unmount guard

**File:** `src/screen-detail.jsx:16-24`
**Issue:**
```js
useEffect(() => {
  if (!readOnly) return;
  load('preferences.json', { autoSave: false })
    .then((store) => store.get('printer'))
    .then((config) => setPrinterConfigured(!!config?.port))
    .catch(() => setPrinterConfigured(false));
}, [readOnly]);
```
If the staff member clicks "Back to history" before this promise chain resolves, `setPrinterConfigured`
still fires on the now-unmounted component, producing a React warning ("Can't perform a React
state update on an unmounted component") and wasted work. This is new code added by this phase.

**Fix:** Guard with a cancellation flag:
```js
useEffect(() => {
  if (!readOnly) return;
  let cancelled = false;
  load('preferences.json', { autoSave: false })
    .then((store) => store.get('printer'))
    .then((config) => { if (!cancelled) setPrinterConfigured(!!config?.port); })
    .catch(() => { if (!cancelled) setPrinterConfigured(false); });
  return () => { cancelled = true; };
}, [readOnly]);
```

### WR-02: The T-11 formula-injection guard applies indiscriminately to every CSV field, including computed/structured columns where it produces incorrect-looking output

**File:** `src/history-utils.js:432, 442-447` (`FORMULA_INJECTION_RE`, `escapeCsvField`), used from `orderToCsvRow:495-512`
**Issue:**
```js
const FORMULA_INJECTION_RE = /^[=+\-@\t\r]/
function escapeCsvField(value) {
  let s = value === null || value === undefined ? '' : String(value)
  if (FORMULA_INJECTION_RE.test(s)) s = `'${s}`
  ...
}
```
Every one of the 13 fields (including `phone` and every money column) is routed through this
same guard (`orderToCsvRow` maps `.map(escapeCsvField)` unconditionally over all fields). Two
concrete consequences:

1. **Phone numbers.** Romanian/international phone numbers are commonly entered with a leading
   `+` (e.g. `+40712345678`). Every such `customer.phone` value is silently rewritten to
   `'+40712345678` in the exported file. This is the OWASP-recommended mitigation working exactly
   as designed, but it is a well-documented false-positive of this exact mitigation for phone
   number columns — the apostrophe is invisible in Excel/Sheets (rendered as left-aligned text)
   but visible if the CSV is opened in a plain text editor or imported into non-Excel accounting
   tools, and will read as "corrupted" data to staff/accountants.
2. **Money columns.** `csvMoney` (`history-utils.js:484-486`) formats negative values as
   `"-5.00"` via `Number(v).toFixed(2)`. If any of `subtotal`/`tip`/`tax`/`discount`/`total` is
   ever legitimately negative (e.g. a future negative-adjustment/partial-refund total), the same
   leading-`-` guard fires and turns a numeric accounting column into a text field
   (`'-5.00`), breaking the CSV's D-09 "comma-delimited with dot decimals" contract that the
   phase's own header comment promises — Excel can no longer sum or numerically sort that
   column.

**Fix:** Scope the formula-injection guard to genuinely free-text/user-authored columns only
(`customer`, `phone`, and any future notes-like column), and let programmatically-formatted
columns (`order_number`, `placed_at`, all money columns, `type`, `status`, `payment`) bypass it
entirely, since their values are never raw user input and can never contain an executable
formula regardless of leading character. Alternatively, if a uniform guard is preferred for
simplicity, add a regression test asserting the expected (if imperfect) behavior for a
`+`-prefixed phone number, since none of the existing `T-11` tests exercise the `phone` column
specifically (`history-utils.test.js`'s formula-injection tests all use `customer.name`).

## Info

### IN-01: `csvMoney` inherits standard floating-point rounding behavior from `Number.prototype.toFixed`

**File:** `src/history-utils.js:484-486`
**Issue:** `Number(v).toFixed(2)` is subject to the well-known IEEE-754 rounding quirks (e.g.
`(1.005).toFixed(2)` → `"1.00"`, not `"1.01"`). Since `buildCsv` is explicitly billed as an
"accounting-grade" export, a value that is off by a cent at the boundary of a rounding case could
matter to a bookkeeper reconciling totals against the underlying order records. This is a
pre-existing pattern used by the rest of the app's money formatting too, so it is not a new
regression, but worth a defensive note given the export's stated accounting purpose.
**Fix:** If exact-cent accuracy at rounding boundaries becomes a real complaint, format via
integer-cents math (`Math.round(v * 100) / 100`) or a decimal library rather than
`toFixed`.

---

_Reviewed: 2026-07-19T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
