# Phase 11: Reprint + CSV Export - Research

**Researched:** 2026-07-18
**Domain:** Tauri v2 native file I/O (dialog + fs plugins) + client-side CSV serialization + existing thermal-print reuse
**Confidence:** HIGH

## Summary

This phase wires two already-designed capabilities onto the shipped History screen: reprint (reusing the exact `handlePrint`/`print_receipt` path from the live detail view) and CSV export (net-new, client-side, via two official Tauri v2 plugins). Both decisions are locked in `11-CONTEXT.md` and `11-UI-SPEC.md`; the open work is entirely mechanical wiring plus one pure serializer function.

The reprint half is lower-risk than it looks but has one landmine the CONTEXT.md canonical refs do not call out explicitly: **the read-only `OrderDetailScreen` call site in `app.jsx` (lines 254–267) does not currently pass an `onPrint` prop at all.** `screen-detail.jsx`'s print-button row (`!readOnly`-gated, lines 261–270) calls `onPrint(order, 'kitchen'|'customer')` — today that prop is `undefined` on the `history-detail` route. Adding the `readOnly` button row to `screen-detail.jsx` is necessary but not sufficient; `app.jsx:254-267` must also gain `onPrint={handlePrint}`, exactly as the live `screen === 'detail'` call site already has it (`app.jsx:252`). `handlePrint` itself needs zero changes — it already reads printer config from the store, invokes `print_receipt`, and fires the existing `toast_printed`/`print_failed` toasts, and the merged order object passed to the read-only detail (`mergedHistoryOrder = {...historyOrder, ...(historyDetail ?? {})}`, `app.jsx:215`) already carries every field `handlePrint`'s payload construction needs (items, customer, address, subtotal, tax, deliveryFee, discount, total, payment) since both halves are normalized through `normalizeOrder`.

The CSV export half requires two new official Tauri v2 plugins — `@tauri-apps/plugin-dialog` (native Save dialog) and `@tauri-apps/plugin-fs` (`writeTextFile`) — added on both the npm and Cargo sides, registered in `lib.rs`, and granted in `src-tauri/capabilities/default.json`. The key unblocking fact for planning: **Tauri v2's dialog plugin automatically extends the fs plugin's scope to whatever path the user picks via `save()`/`open()`, for the running app session** — so the capability grant needed is narrow (`dialog:allow-save` + `fs:allow-write-text-file`), NOT a broad `fs:scope` rule covering `$HOME/**` or similar. This resolves the single biggest unknown in D-13. The CSV serializer itself (row mapping, RFC-4180 escaping, BOM, header) is a pure function that belongs in `history-utils.js` alongside the phase's other pure derivations, matching the module's established no-React/no-SDK-imports convention.

**Primary recommendation:** Add `onPrint={handlePrint}` to the `history-detail` route in `app.jsx`, add a `readOnly &&` print-button block to `screen-detail.jsx` mirroring the existing `!readOnly` block exactly, add a mount-time printer-configured store read to gate both buttons, install `@tauri-apps/plugin-dialog` + `@tauri-apps/plugin-fs` (JS + Cargo + capabilities, mirroring the `tauri add` pattern already used for `store`/`window-state`/`process`/`updater`), write a pure `buildCsv(orders)` function in `history-utils.js`, and wire it to the already-inert `h_export` button via `save()` → `writeTextFile()`.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Reprint trigger (button, click handler) | Browser/Client (React) | — | Pure UI state; `handlePrint` already lives in `app.jsx` (client tier) |
| Printer-configured check (greyed state) | Browser/Client (React) | — | Reads Tauri plugin-store via JS `load()`; no Rust round-trip needed for a read |
| Thermal print execution | API/Backend equivalent — Rust `#[tauri::command]` | — | `print_receipt` already in `src-tauri/src/lib.rs`; unchanged this phase — serial port I/O must stay in Rust |
| CSV row/field construction (serializer) | Browser/Client (React/JS, pure fn) | — | Operates entirely on in-memory `AdminOrder` summaries already in the `visible` memo — no new data fetch, no Rust needed |
| Native Save dialog (file picker UI) | Browser/Client (JS) → OS-native chrome via `@tauri-apps/plugin-dialog` | — | `plugin-dialog` IPCs to a thin Rust-side plugin command that shows the OS dialog; JS never touches Rust custom code |
| CSV file write | Browser/Client (JS) → OS filesystem via `@tauri-apps/plugin-fs` | — | `writeTextFile` IPCs to the official `fs` plugin, not a bespoke Rust command — keeps "Rust side is thin" (CLAUDE.md) |

No capability in this phase touches the CDN/Static or Database/Storage tiers — the app has neither.

## Project Constraints (from CLAUDE.md)

- `@charlyk/admin-client` is the ONLY data layer — never make direct HTTP calls from the app; always go through the SDK. **This phase makes zero new SDK calls** — CSV export reads the already-fetched `visible` memo (D-07); reprint reuses `handlePrint`'s existing `invoke('print_receipt', ...)`.
- CSP must be configured in `tauri.conf.json` — `connect-src` must include the API domain. **Not implicated this phase**: dialog/fs plugin calls are Tauri IPC (`ipc:`/`http://ipc.localhost`), already covered by the existing `default-src`/`connect-src` CSP entries (`src-tauri/tauri.conf.json:25-26`). No CSP edit is expected; verify this assumption at execution time rather than skip the check.
- `window.*` globals are forbidden in production code — all code uses ES module imports/exports. New code must `import { save } from '@tauri-apps/plugin-dialog'` and `import { writeTextFile } from '@tauri-apps/plugin-fs'`, matching the existing `import { load } from '@tauri-apps/plugin-store'` pattern.
- Rust side is thin — window chrome, `plugin-store`, and thermal printing only; everything else lives in JavaScript. **Satisfied by design (D-13):** `plugin-dialog` and `plugin-fs` are official pre-built plugins, not bespoke Rust commands — CSV construction and the write call both happen in JS.
- macOS notarization / GitHub Package Registry auth / EventSource auth-header rules — not implicated this phase.
- Design fidelity — do not change colors, spacing, typography without explicit instruction. **UI-SPEC (`11-UI-SPEC.md`) already locks every visual value this phase touches** — reuse `.btn-primary`/`.btn-secondary`, existing disabled-opacity convention, native `title` tooltips. No `assets/colors_and_type.css` edits expected.
- Unready features must be **greyed-out, visible, not hidden**. Directly governs D-05/D-06 (reprint buttons) and the UI-SPEC's `h_export_empty_tooltip` (Export button when `visible.length === 0`).

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@tauri-apps/plugin-dialog` | `^2.7.2` [VERIFIED: npm registry] (`npm view` confirmed `2.7.2`, published 2026-07-18) | Native Save dialog (`save()`) | Official first-party Tauri v2 plugin — same publisher/monorepo as `plugin-store`/`plugin-updater`/`plugin-window-state` already in this project |
| `@tauri-apps/plugin-fs` | `^2.5.1` [VERIFIED: npm registry] (`npm view` confirmed `2.5.1`, published 2026-05-02) | `writeTextFile()` to the user-chosen path | Official first-party Tauri v2 plugin; same monorepo |
| `tauri-plugin-dialog` (Cargo) | `2.7.2` [VERIFIED: crates.io] (`cargo search` confirmed) | Rust-side registration for `plugin-dialog` | Must match/track the npm package's major version per Tauri v2 convention |
| `tauri-plugin-fs` (Cargo) | `2.5.1` [VERIFIED: crates.io] (`cargo search` confirmed) | Rust-side registration for `plugin-fs` | Same |

### Supporting
None — no additional CSV libraries needed. RFC-4180 escaping for a fixed 13-column, no-nested-CSV shape is a ~15-line pure function; pulling in a dependency (e.g. `papaparse`) for this would be the "don't hand-roll" anti-pattern in reverse (over-engineering a trivial problem). See **Don't Hand-Roll** below for the boundary.

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `plugin-dialog` + `plugin-fs` (JS-side write) | A bespoke Rust `#[tauri::command] fn export_csv(...)` | Rejected by D-13 and CLAUDE.md's "Rust side is thin" rule — would duplicate what the official plugins already do, and every future Rust build/test touches an extra command |
| Hand-rolled RFC-4180 escaping | `papaparse` / `csv-stringify` npm package | Unnecessary dependency for a fixed 13-column shape with no nested-CSV or streaming requirement; adds bundle weight and a new supply-chain surface for a ~15-line function |

**Installation:**
```bash
npm install @tauri-apps/plugin-dialog @tauri-apps/plugin-fs
```
Cargo side (`src-tauri/Cargo.toml` `[dependencies]`):
```toml
tauri-plugin-dialog = "2"
tauri-plugin-fs = "2"
```

**Version verification:** Confirmed live against the npm registry and crates.io on 2026-07-18 (see table above). `@tauri-apps/plugin-dialog` published the same day this research ran — see Package Legitimacy Audit for the "too-new" signal and why it is not treated as blocking.

## Package Legitimacy Audit

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| `@tauri-apps/plugin-dialog` | npm | published 2026-07-18 (same-day patch release) | 955,265/wk | `github.com/tauri-apps/plugins-workspace` | [SUS] — flagged "too-new" by the automated gate | **Flagged — planner must add `checkpoint:human-verify` before the `npm install`, OR planner may pin to the immediately-prior published version if the checkpoint blocks progress.** See note below. |
| `@tauri-apps/plugin-fs` | npm | published 2026-05-02 | 391,351/wk | `github.com/tauri-apps/plugins-workspace` | [OK] | Approved |

**Note on the `plugin-dialog` SUS verdict:** The "too-new" signal is a same-day publish timestamp, not a slopsquat/typosquat pattern — the package has 955K weekly downloads, is scoped under the official `@tauri-apps` org, and resolves from the exact same monorepo (`tauri-apps/plugins-workspace`) as `@tauri-apps/plugin-store`/`plugin-updater`/`plugin-window-state`, all three of which are already installed and trusted in this project's own `package.json`. This reads as a routine patch release in an actively-maintained official monorepo, not a legitimacy risk — but per protocol the verdict is not auto-upgraded to OK. **The planner must still insert a `checkpoint:human-verify` task before running `npm install @tauri-apps/plugin-dialog`**, satisfied trivially by confirming `npm view @tauri-apps/plugin-dialog repository.url` still resolves to `tauri-apps/plugins-workspace` at execution time (a 10-second check, not a blocking research gap).

**Packages removed due to [SLOP] verdict:** none.
**Packages flagged as suspicious [SUS]:** `@tauri-apps/plugin-dialog` — planner must add a lightweight `checkpoint:human-verify` (repo-URL confirmation, not a deep audit) before the install task.

## Architecture Patterns

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│  READ-ONLY DETAIL VIEW  (screen-detail.jsx, readOnly=true)              │
│                                                                           │
│  mount ──▶ load('preferences.json') ──▶ store.get('printer')            │
│              │                              │                           │
│              ▼                              ▼                           │
│      printerConfigured = !!config?.port  (local useState)               │
│              │                                                           │
│              ▼                                                           │
│  [Print kitchen] [Print customer]  ── disabled+greyed if !printerConfigured
│              │  onClick                                                  │
│              ▼                                                           │
│      onPrint(order, kind)  ── prop from app.jsx: onPrint={handlePrint}  │
│              │            (NEW — currently missing on history-detail)   │
│              ▼                                                           │
│  app.jsx handlePrint(order, kind)  [UNCHANGED — already exists]          │
│      │ store.get('printer') (2nd read, click-time guard)                │
│      ▼                                                                   │
│  invoke('print_receipt', {...})  ──▶ Rust: validate_port ──▶ ESC/POS    │
│      │                                        write to serial port      │
│      ▼                                                                   │
│  toast_printed / print_failed                                            │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│  HISTORY SCREEN  (screen-history.jsx)                                    │
│                                                                           │
│  visible memo (filtered/searched/period-scoped AdminOrder[])             │
│              │                                                           │
│              ▼                                                           │
│  [Export CSV] click ──▶ buildCsv(visible)  (NEW pure fn, history-utils.js)│
│              │              │                                            │
│              │              ▼                                            │
│              │        header row + N data rows, RFC-4180 escaped,       │
│              │        BOM-prepended string                              │
│              ▼                                                           │
│  save({ defaultPath: 'orders_<from>_<to>.csv', filters:[...] })          │
│  (@tauri-apps/plugin-dialog)                                             │
│              │                                                           │
│      null (user canceled) ──▶ silent no-op, no toast                    │
│              │                                                           │
│      path string                                                         │
│              ▼                                                           │
│  writeTextFile(path, csv)  (@tauri-apps/plugin-fs)                      │
│  — fs scope auto-extended to `path` by the dialog plugin for this        │
│    session; no fs:scope capability rule needed for this specific path   │
│              │                                                           │
│              ▼                                                           │
│  toast_saved (success) / h_export_error_title (error, on throw)         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Recommended Project Structure
No new files. This phase touches existing files only:
```
src/
├── app.jsx              # add onPrint={handlePrint} to history-detail route (app.jsx:254-267)
├── screen-detail.jsx    # add readOnly print-button row + printer-configured check
├── screen-history.jsx   # wire h_export button to buildCsv + save() + writeTextFile()
├── history-utils.js     # add buildCsv(orders) pure function
└── i18n.jsx             # add print_configure_hint, h_export_empty_tooltip, h_export_error_title (ro+en)
```

### Pattern 1: Mount-time store read for a UI-gating boolean
**What:** Read `plugin-store` once on mount (not on every render, not on click) to derive a boolean that greys out a control.
**When to use:** Any "is X configured" check that gates a button's enabled/disabled state, as opposed to a guard that fires only at click-time (like `handlePrint`'s own internal check).
**Example (mirrors the existing `screen-printer.jsx:42-67` mount-effect pattern):**
```javascript
// Source: existing pattern at src/screen-printer.jsx:42-67, applied per D-04
const [printerConfigured, setPrinterConfigured] = useState(false);
useEffect(() => {
  if (!readOnly) return; // only the read-only detail needs this; live detail keeps its own click-time guard
  load('preferences.json', { autoSave: false })
    .then((store) => store.get('printer'))
    .then((config) => setPrinterConfigured(!!config?.port))
    .catch(() => setPrinterConfigured(false));
}, [readOnly]);
```

### Pattern 2: Save dialog → write, with explicit cancel handling
**What:** `save()` resolving to `null`/`undefined` is a user-canceled no-op, distinct from an error. Only a `writeTextFile`/`save` **throw** is an error state (UI-SPEC E1 "error" row).
**When to use:** Any native-Save-dialog-backed export flow.
**Example:**
```javascript
// Source: @tauri-apps/plugin-dialog v2.7.2 + @tauri-apps/plugin-fs v2.5.1 official docs
import { save } from '@tauri-apps/plugin-dialog';
import { writeTextFile } from '@tauri-apps/plugin-fs';

async function handleExportCsv() {
  try {
    const csv = buildCsv(visible); // pure fn, history-utils.js
    const path = await save({
      defaultPath: `orders_${fromDateStr}_${toDateStr}.csv`,
      filters: [{ name: 'CSV', extensions: ['csv'] }],
    });
    if (!path) return; // user canceled — silent no-op, NOT an error (UI-SPEC)
    await writeTextFile(path, csv);
    pushToast({
      id: Date.now(), kind: 'success', title: t('toast_saved'),
      detail: `${visible.length} ${t(visible.length === 1 ? 'h_orders_count_one' : 'h_orders_count_other')}`,
    });
  } catch (err) {
    pushToast({ id: Date.now(), kind: 'error', title: t('h_export_error_title'), detail: String(err) });
  }
}
```

### Pattern 3: RFC-4180 CSV serializer as a pure function
**What:** Escape only fields that need it (comma/quote/newline present), double embedded quotes, prepend BOM once to the whole string (not per-row).
**When to use:** `buildCsv` in `history-utils.js`.
**Example:**
```javascript
// Source: RFC 4180 §2.5–2.7 (comma delimiter, CRLF or LF, quote-if-needed, double-quote escape)
const CSV_HEADERS = ['order_number','placed_at','type','status','customer','phone','payment','subtotal','delivery_fee','tip','tax','discount','total'];

function escapeCsvField(value) {
  const s = value == null ? '' : String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function orderToCsvRow(order) {
  const status = deriveDisplayStatus(order) ?? '';
  const placedAt = formatPlacedAtForCsv(order.placedAt); // 'YYYY-MM-DD HH:mm', local time
  return [
    order.dailyOrderNumber, placedAt, order.type, status,
    order.customer?.name, order.customer?.phone,
    order.payment, order.subtotal, order.deliveryFee, order.tip, order.tax, order.discount, order.total,
  ].map(escapeCsvField).join(',');
}

export function buildCsv(orders) {
  const rows = [CSV_HEADERS.join(','), ...orders.map(orderToCsvRow)];
  return '﻿' + rows.join('\r\n');
}
```

### Anti-Patterns to Avoid
- **Re-reading the printer store on every render:** Use a mount effect + local state (Pattern 1), not a synchronous read inline in JSX — `load()`/`store.get()` are async, and calling them outside an effect either throws or silently no-ops.
- **Treating a canceled Save dialog as an error:** `save()` resolving to `null` must be a silent early return, not routed into the `catch` block or the error toast (explicit UI-SPEC requirement).
- **BOM per-row:** The U+FEFF BOM belongs exactly once, at byte 0 of the whole file string — prepending it to every row or to the header only-if-present corrupts the file for spreadsheet apps.
- **Quoting every field unconditionally:** D-12/RFC-4180 only requires quoting fields containing a comma, double-quote, or newline. Unconditional quoting is not wrong per the RFC but diverges from the "portable, predictable" intent in D-09 and makes diffing/reading raw CSV harder than necessary — quote conditionally.
- **A bespoke Rust `export_csv` command:** Explicitly rejected by D-13 and the "Rust side is thin" constraint — do not add a new `#[tauri::command]` for this.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Native Save file dialog | A custom HTML `<input type="file">`-based fake, or a bespoke Rust `rfd`-crate command | `@tauri-apps/plugin-dialog`'s `save()` | Official plugin already handles cross-platform OS chrome (macOS NSSavePanel / Windows common dialog); a hand-rolled fallback is exactly the kind of complexity the plugin exists to absorb |
| Writing an arbitrary user-chosen file path | A bespoke Rust `#[tauri::command] fn write_file(path, contents)` | `@tauri-apps/plugin-fs`'s `writeTextFile()` | Same reasoning as above — plus the plugin's dialog-path auto-scope-extension (see Common Pitfalls) means the official pairing "just works" for this exact save-then-write flow, which a hand-rolled Rust command would have to reimplement or bypass Tauri's ACL entirely (a worse security posture) |
| CSV escaping for a fixed, flat, 13-column shape | An npm CSV library (`papaparse`, `csv-stringify`) | A ~15-line hand-written `escapeCsvField`/`buildCsv` pair | The reverse case: for THIS shape (no nesting, no streaming, no locale-variant quoting rules beyond RFC-4180) a dependency is over-engineering, not under. Re-evaluate only if a future phase needs streaming or a second CSV variant |

**Key insight:** This phase's "don't hand-roll" boundary cuts across two different problems in opposite directions — file I/O should NOT be hand-rolled (use the official plugins), but CSV serialization for this specific fixed shape SHOULD be hand-rolled (a dependency would be unjustified complexity for 15 lines of pure logic).

## Common Pitfalls

### Pitfall 1: Missing `onPrint` prop on the read-only detail route
**What goes wrong:** The `readOnly` print-button row is added to `screen-detail.jsx` and calls `onPrint(order, kind)`, but `app.jsx`'s `history-detail` route (`app.jsx:254-267`) never passes an `onPrint` prop — calling `onPrint(...)` throws `onPrint is not a function`.
**Why it happens:** The live `screen === 'detail'` call site (`app.jsx:252`) already has `onPrint={handlePrint}`; it's easy to assume the sibling read-only call site inherits it, but the two JSX blocks are independent prop lists.
**How to avoid:** Explicitly add `onPrint={handlePrint}` to the `history-detail` block as its own task/verification step — do not bundle it silently inside the `screen-detail.jsx` task and assume it's covered.
**Warning signs:** A runtime TypeError on first reprint-button click during manual verification; a unit/integration test that renders the read-only route and clicks a print button without asserting `handlePrint`/`invoke` was called would miss this if the mock prop is supplied directly in the test harness instead of through the real `app.jsx` tree.

### Pitfall 2: Assuming `fs:scope` must broadly allow the whole filesystem
**What goes wrong:** Planner adds a broad `fs:scope` capability rule (e.g. `{"path": "$HOME/**"}`) to make `writeTextFile` work for an arbitrary Save-dialog-picked path, unnecessarily widening the app's filesystem ACL.
**Why it happens:** The `plugin-fs` docs describe `fs:scope` as the general mechanism for granting path access, without prominently flagging the dialog-plugin auto-extension behavior on the same page.
**How to avoid:** For this specific save()-then-writeTextText flow, only `dialog:allow-save` + `fs:allow-write-text-file` are needed in `capabilities/default.json` — no `fs:scope` entry. Tauri v2's dialog plugin automatically adds the user-picked path to the fs (and asset-protocol) scope for the running session when `open()`/`save()` resolves to a path [CITED: v2.tauri.app/plugin/file-system, cross-confirmed via community sources — see Sources].
**Warning signs:** A `writeTextFile` call failing with a "forbidden path" / scope error despite `fs:allow-write-text-file` being granted — the fix in that case is almost never "widen scope further," it's checking that the path actually came from `save()`'s return value and wasn't independently constructed.

### Pitfall 3: Treating dialog cancellation as an error
**What goes wrong:** `save()` resolving to `null` (user clicked Cancel) gets routed through the same error-toast path as a genuine write failure, showing a confusing "Export failed" toast for a no-op user action.
**Why it happens:** A naive `try { ... await save(); await writeTextFile(...) ... } catch` without an explicit `if (!path) return;` guard between the two awaits will throw inside `writeTextFile(null, csv)` and land in the `catch` block.
**How to avoid:** Explicit early return on falsy `path`, before calling `writeTextFile` (Pattern 2 above). This is a locked UI-SPEC requirement, not discretionary.
**Warning signs:** UAT/manual test: click Export, click Cancel in the OS dialog, see an error toast — this is the exact bug this pitfall describes.

### Pitfall 4: BOM breaking a naive string-length or row-count assertion
**What goes wrong:** A test asserts `csv.split('\n').length === orders.length + 1` (header + rows) and fails, or a test asserts `csv.startsWith('order_number')` and fails, because the BOM character (U+FEFF) is invisible in most editors but is the literal first character of the string.
**Why it happens:** BOM is a zero-width, often-invisible character; easy to forget it's really there when eyeballing test output.
**How to avoid:** Tests should assert `csv.charCodeAt(0) === 0xFEFF` (or `csv[0] === '﻿'`) explicitly, and check header content via `csv.slice(1).startsWith('order_number')` or by stripping the BOM before other assertions.
**Warning signs:** A CSV unit test failing on a header-content assertion in a way that "looks like it should pass" when the string is printed.

### Pitfall 5: Row/field count mismatch on partial-field orders
**What goes wrong:** A pickup order (no `deliveryFee`), a walk-in with `customer.phone: null`, or an order missing `tip`/`discount` produces a CSV row with the WRONG number of comma-separated fields (e.g., a field silently dropped instead of emitted as `""`), corrupting every column after the gap for that row.
**Why it happens:** A naive serializer that does `order.deliveryFee > 0 ? order.deliveryFee : ''` conditionally, mimicking the on-screen totals card's "only show non-zero rows" convention, forgets that CSV rows are POSITIONAL — every row needs exactly 13 fields, every time, in the same order.
**How to avoid:** Map every field unconditionally through `escapeCsvField(value ?? '')` (Pattern 3) — never omit a field position based on the field's value. This is explicitly covered by UI-SPEC's "partial" row: missing/undefined fields serialize as `""`, never omitted or replaced with `null`/`N/A`.
**Warning signs:** A CSV that "looks right" visually but fails to import cleanly into a spreadsheet tool, with values shifted into the wrong columns starting partway down the file.

## Code Examples

### Reprint button row (read-only variant) — mirrors the existing `!readOnly` block exactly
```jsx
// Source: existing pattern at src/screen-detail.jsx:261-270, extended per D-01/D-03/D-05/D-06
{readOnly && (
<div style={{ display: 'flex', gap: 8 }}>
  <button
    className="btn-secondary"
    style={{ flex: 1, justifyContent: 'center', ...(printerConfigured ? {} : { opacity: 0.5, pointerEvents: 'none', cursor: 'not-allowed' }) }}
    disabled={!printerConfigured}
    title={!printerConfigured ? t('print_configure_hint') : undefined}
    onClick={() => onPrint(order, 'kitchen')}
  >
    <Icon name="printer" size={14} /> {t('print_kitchen')}
  </button>
  <button
    className="btn-primary"
    style={{ flex: 1, justifyContent: 'center', ...(printerConfigured ? {} : { opacity: 0.5, pointerEvents: 'none', cursor: 'not-allowed' }) }}
    disabled={!printerConfigured}
    title={!printerConfigured ? t('print_configure_hint') : undefined}
    onClick={() => onPrint(order, 'customer')}
  >
    <Icon name="printer" size={14} /> {t('print_customer')}
  </button>
</div>
)}
```

### Capabilities grant (`src-tauri/capabilities/default.json`)
```json
// Source: Tauri v2 official capabilities docs (v2.tauri.app/security/capabilities), applied per D-13
{
  "permissions": [
    "core:default",
    "store:default",
    "window-state:default",
    "opener:default",
    "updater:default",
    "process:default",
    "dialog:allow-save",
    "fs:allow-write-text-file"
  ]
}
```
No `fs:scope` entry is required for this flow specifically — see Pitfall 2.

### `lib.rs` plugin registration
```rust
// Source: existing registration pattern at src-tauri/src/lib.rs:425-434, extended per D-13
tauri::Builder::default()
    .plugin(tauri_plugin_process::init())
    .plugin(tauri_plugin_updater::Builder::new().build())
    .plugin(tauri_plugin_store::Builder::new().build())
    .plugin(tauri_plugin_opener::init())
    .plugin(tauri_plugin_dialog::init())   // NEW
    .plugin(tauri_plugin_fs::init())       // NEW
    .setup(|app| { /* unchanged */ Ok(()) })
    .invoke_handler(tauri::generate_handler![ /* unchanged */ ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application")
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|---------------|--------|
| Tauri v1 `dialog::save()` / `fs::writeTextFile` (single `tauri` package, allowlist-based) | Tauri v2 split into per-capability plugins (`@tauri-apps/plugin-dialog`, `@tauri-apps/plugin-fs`) with a capability/permission ACL model | Tauri v2 GA (this project is already fully v2, per `package.json`) | Not a migration concern for this project — it was scaffolded directly on v2. Documented here only so the planner doesn't accidentally follow a v1-flavored tutorial (allowlist syntax in `tauri.conf.json`) instead of the v2 capabilities-file syntax used everywhere else in `src-tauri/capabilities/` |

**Deprecated/outdated:** N/A for this phase — no existing code in this domain to deprecate; this is the phase's first use of file-dialog/file-write functionality.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Dialog-picked paths auto-extend `fs` scope for the session without an explicit `fs:scope` capability rule | Common Pitfalls #2, Code Examples | If wrong, `writeTextFile` fails with a scope-denied error on every export attempt at first manual test; low actual risk because the fix (add a scoped `fs:scope` rule, or widen slightly) is a same-session, low-cost correction, not an architecture change. Cross-confirmed by two independent WebSearch sources during this research session (official Tauri v2 docs synthesis + community-source synthesis), giving MEDIUM rather than LOW confidence, but neither source is a verbatim quote from an official doc page — verify with a smoke test in the first execution wave |
| A2 | `@tauri-apps/plugin-dialog`'s same-day publish timestamp (2026-07-18) reflects a routine patch in the official `tauri-apps/plugins-workspace` monorepo, not a compromised/hijacked release | Package Legitimacy Audit | If wrong (extremely unlikely given 955K weekly downloads and the shared monorepo with 3 already-trusted sibling packages), a compromised patch release could introduce malicious install-time behavior; mitigated by the required `checkpoint:human-verify` task before install |

## Open Questions

1. **Exact `placed_at` local-time formatting helper to reuse or write**
   - What we know: UI-SPEC locks the format as `YYYY-MM-DD HH:mm` (24h local time); `orderTimeLabel` (imported from `data.jsx` into `screen-detail.jsx`) already formats `placedAt` for on-screen display, but its exact output format hasn't been confirmed to match the CSV's locked format.
   - What's unclear: Whether `orderTimeLabel` can be reused/parameterized, or whether `buildCsv` needs its own small local-time formatter in `history-utils.js` (consistent with that module's "pure, no shared formatting imports beyond what's already there" convention, per its own header comment banning new cross-module imports).
   - Recommendation: Planner should default to a new small pure formatter co-located in `history-utils.js` (mirrors the module's existing `pad`/`localDayKey` private-helper pattern) rather than importing/repurposing `data.jsx`'s `orderTimeLabel`, to keep `history-utils.js`'s zero-react/zero-data.jsx-import invariant intact (stated explicitly in that file's header comment and reinforced by the Phase 07 decision log: "history-utils.js stays pure: no react/data.jsx/@charlyk imports").

2. **CSV numeric formatting — plain `String(number)` vs `.toFixed(2)`**
   - What we know: D-09 specifies dot decimal separator, e.g. `145.00`. `normalizeOrder` already rounds most monetary fields to 2 decimals via `.toFixed(2)` parsing in a couple of spots (e.g. `discount`), but `subtotal`/`total`/`tax`/`tip`/`deliveryFee` are plain floats after division by 100 and are NOT guaranteed to already be exactly 2-decimal-clean (e.g. `10/100 * something` could produce a float like `14.499999999999998` in edge cases, though none observed in current test fixtures).
   - What's unclear: Whether `buildCsv` should call `.toFixed(2)` on every monetary field for safety, or trust the already-normalized values as-is.
   - Recommendation: Apply `.toFixed(2)` to every monetary field inside `orderToCsvRow` regardless of the input's apparent cleanliness — cheap, deterministic, and matches the `145.00` example format in D-09 literally (two decimal places always shown, not just "however many the float happens to have").

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| npm registry access | `npm install @tauri-apps/plugin-dialog @tauri-apps/plugin-fs` | ✓ | — | — |
| crates.io access | `cargo` dependency resolution for `tauri-plugin-dialog`/`tauri-plugin-fs` | ✓ | — | — |
| `cargo` in PATH | Cargo build step (per STATE.md's recorded gotcha: "requires cargo in PATH, source ~/.cargo/env before running") | Not probed this session (no shell access to confirm PATH state at plan/execute time) | — | If absent, `source ~/.cargo/env` first, per the project's own recorded Phase-1–10 precedent for every prior plugin install |
| Thermal printer hardware | Reprint execution (`print_receipt`) | Not applicable to this phase's own scope — reprint reuses the existing `print_receipt` command unchanged; hardware validation is a carried-forward v1.0 deferred item (`REQUIREMENTS.md` "Future Requirements") | — | Manual-only verification, same as the live print flow |

**Missing dependencies with no fallback:** none identified.
**Missing dependencies with fallback:** `cargo` PATH — documented fallback (`source ~/.cargo/env`) already used successfully for every prior plugin in this project.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.5 + @testing-library/react 16.3.2 (already configured, `vitest.config.js`) |
| Config file | `/Users/eduardalbu/Developer/sitecare-pos/vitest.config.js` |
| Quick run command | `npx vitest run src/__tests__/history-utils.test.js` (or the new CSV-specific test file) |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| HIST-11 | Reprint buttons call `onPrint(order, 'kitchen'\|'customer')` when enabled | unit/integration (React Testing Library, mirrors `screen-detail.test.jsx`'s existing `readOnly mode` describe block) | `npx vitest run src/__tests__/screen-detail.test.jsx` | ❌ Wave 0 — extend existing file, don't create new |
| HIST-11 | Reprint buttons are disabled+greyed+tooltipped when `printerConfigured === false` | unit/integration | `npx vitest run src/__tests__/screen-detail.test.jsx` | ❌ Wave 0 — extend existing file |
| HIST-11 | `history-detail` route in `app.jsx` passes `onPrint={handlePrint}` (regression guard for Pitfall 1) | integration | `npx vitest run src/__tests__/app-history-route.test.jsx` | ❌ Wave 0 — extend existing file, or add a new assertion to it |
| HIST-12 | `buildCsv` produces correct header + row mapping for a populated order set | unit (pure fn) | `npx vitest run src/__tests__/history-utils.test.js` | ❌ Wave 0 — extend existing file |
| HIST-12 | `buildCsv` escapes commas/quotes/newlines correctly (RFC-4180) | unit (pure fn) | `npx vitest run src/__tests__/history-utils.test.js` | ❌ Wave 0 |
| HIST-12 | `buildCsv` prepends exactly one BOM at position 0 | unit (pure fn) | `npx vitest run src/__tests__/history-utils.test.js` | ❌ Wave 0 |
| HIST-12 | `buildCsv` handles 0/1/many rows identically in structure | unit (pure fn) | `npx vitest run src/__tests__/history-utils.test.js` | ❌ Wave 0 |
| HIST-12 | `buildCsv` emits `""` (not `null`/`undefined`/`N/A`) for missing optional fields | unit (pure fn) | `npx vitest run src/__tests__/history-utils.test.js` | ❌ Wave 0 |
| HIST-12 | Held-out large-export test — ~366-day / thousands-of-rows `buildCsv` call completes within acceptable time (UI-SPEC "overflow" — upgraded from backstop, planner MUST include) | unit (pure fn, perf-flavored) | `npx vitest run src/__tests__/history-utils.test.js -t "large export"` | ❌ Wave 0 — new test case, e.g. `test('builds a full-year CSV of ~2000 synthetic orders in well under 1s', ...)` with a generous threshold (e.g. `< 1000ms`) to avoid CI flakiness while still catching an accidental O(n²) regression |
| HIST-12 | Export button click → `save()` → `writeTextFile()` happy path, mocking both plugins | integration | `npx vitest run src/__tests__/screen-history.test.jsx` | ❌ Wave 0 — extend existing file; mock `@tauri-apps/plugin-dialog` and `@tauri-apps/plugin-fs` the same way `print-receipt.test.jsx` mocks `@tauri-apps/plugin-store`/`@tauri-apps/api/core` |
| HIST-12 | `save()` resolving to `null` (cancel) produces no toast, no `writeTextFile` call | integration | `npx vitest run src/__tests__/screen-history.test.jsx` | ❌ Wave 0 |
| HIST-12 | `writeTextFile` throwing produces the `h_export_error_title` error toast | integration | `npx vitest run src/__tests__/screen-history.test.jsx` | ❌ Wave 0 |
| HIST-12 | Export button disabled+tooltipped when `visible.length === 0` | integration | `npx vitest run src/__tests__/screen-history.test.jsx` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run src/__tests__/history-utils.test.js src/__tests__/screen-detail.test.jsx src/__tests__/screen-history.test.jsx`
- **Per wave merge:** `npx vitest run` (full suite — this project currently has 342+ tests across the existing files; a phase-11 regression in any of them must be caught before merge)
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `src/__tests__/history-utils.test.js` — add `describe('buildCsv', ...)` block covering escaping, BOM, 0/1/many rows, partial-field rows, and the held-out large-export perf case
- [ ] `src/__tests__/screen-detail.test.jsx` — extend the existing `describe('readOnly mode', ...)` block with the reprint-button enabled/disabled/tooltip assertions
- [ ] `src/__tests__/app-history-route.test.jsx` — add an assertion that `onPrint` reaches `OrderDetailScreen` on the `history-detail` route (regression guard for Pitfall 1)
- [ ] `src/__tests__/screen-history.test.jsx` — extend with Export-button click/cancel/error/empty-state assertions, mocking `@tauri-apps/plugin-dialog`'s `save` and `@tauri-apps/plugin-fs`'s `writeTextFile`
- [ ] No new test framework/config needed — Vitest + RTL + the existing `@tauri-apps/plugin-store`/`@tauri-apps/api/core` mocking convention (see `print-receipt.test.jsx:1-30`) extends directly to the two new plugins

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-------------------|
| V2 Authentication | No | Phase adds no new auth surface |
| V3 Session Management | No | N/A |
| V4 Access Control | No | Reprint/export both operate on data the staff user already has (History screen access is already gated by the existing role/nav guard) |
| V5 Input Validation | Yes | CSV field escaping (RFC-4180, D-12) is itself an output-encoding control against CSV/formula injection in downstream spreadsheet tools — see Threat Patterns below. The Save dialog's `path` string is OS-validated by the native picker, not user-typed free text, so path-traversal validation is delegated to the OS dialog + Tauri's dialog-scope-extension, not hand-rolled |
| V6 Cryptography | No | No secrets/crypto touched by this phase |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|----------------------|
| CSV/formula injection — a customer name or note beginning with `=`, `+`, `-`, or `@` is interpreted as a formula by Excel/Sheets when the file is opened, potentially executing an unintended calculation or (in older Excel versions) a DDE-based command | Tampering | RFC-4180 quote-escaping (D-12) alone does NOT neutralize formula injection — quoting a field that starts with `=` still leaves a leading `=` inside the quotes, which Excel still treats as a formula trigger. **Recommend the planner add a formula-injection guard**: if a field's first character is one of `= + - @ \t \r`, prefix it with a single leading `'` (apostrophe) before the RFC-4180 quote/escape step, matching OWASP's standard CSV-injection mitigation. This was NOT explicitly locked in `11-CONTEXT.md`'s D-12 (which only covers comma/quote/newline escaping) — flag as a planner discretion item requiring either inclusion or an explicit accepted-risk note, since customer-supplied names are the exact realistic injection vector D-12's own rationale already names ("Customer names and notes are the realistic sources of special chars") |
| Arbitrary file overwrite via a maliciously crafted `defaultPath`/filename | Tampering | Not applicable here — the filename is derived entirely from the app's own `from`/`to` period state (D-14: `orders_<from>_<to>.csv`), never from user-typed free text, and the actual write path is chosen by the user through the native OS Save dialog, which itself enforces OS-level overwrite confirmation for existing files |
| Overly broad `fs:scope` capability grant | Elevation of Privilege | Avoided by design per Common Pitfall #2 — grant only `dialog:allow-save` + `fs:allow-write-text-file`, relying on the dialog plugin's session-scoped auto-extension rather than a persistent broad `fs:scope` rule |

**Flag for the planner:** The CSV-formula-injection mitigation above is a genuine gap between D-12 (as currently worded) and full input-validation coverage. It should either be added as an explicit task (cheap: one extra character-check + prefix in `escapeCsvField`) or surfaced to the user as an accepted, documented risk before execution — do not silently skip it.

## Sources

### Primary (HIGH confidence)
- `src/app.jsx`, `src/screen-detail.jsx`, `src/screen-printer.jsx`, `src/history-utils.js`, `src/data.jsx`, `src/screen-history.jsx`, `src/i18n.jsx`, `src/use-order-detail.js`, `src-tauri/src/lib.rs`, `src-tauri/Cargo.toml`, `src-tauri/capabilities/default.json`, `src-tauri/capabilities/desktop.json`, `src-tauri/tauri.conf.json`, `package.json` — all read directly from the repository this session (file:line citations throughout this document)
- `npm view @tauri-apps/plugin-dialog version` → `2.7.2`; `npm view @tauri-apps/plugin-fs version` → `2.5.1`; `cargo search tauri-plugin-dialog`/`tauri-plugin-fs` → matching `2.7.2`/`2.5.1` — verified live against npm registry and crates.io this session
- `.planning/phases/11-reprint-csv-export/11-CONTEXT.md`, `.planning/phases/11-reprint-csv-export/11-UI-SPEC.md`, `.planning/REQUIREMENTS.md`, `.planning/STATE.md` — canonical locked decisions and traceability

### Secondary (MEDIUM confidence)
- https://v2.tauri.app/plugin/file-system/ — `writeTextFile` signature, `fs:allow-write-text-file` permission requirement, `requireLiteralLeadingDot` config
- https://v2.tauri.app/plugin/dialog/ — `save()` parameters, cancel-returns-null behavior, `dialog:allow-save` permission
- WebSearch synthesis (cross-confirmed across two independent queries) — dialog `open()`/`save()` auto-extends fs/asset-protocol scope to the picked path for the running session, not persisted across restarts (community + docs-adjacent sources; no single verbatim official-doc quote captured this session — see Assumption A1)
- https://github.com/tauri-apps/tauri/discussions/8540 — referenced context on `tauri-plugin-persisted-scope` existing specifically because the dialog-plugin scope extension is session-only

### Tertiary (LOW confidence)
- https://github.com/tauri-apps/tauri/discussions/9195 — anecdotal report of dialog-interaction-affecting-fs-permission-state; consistent with but not a primary confirmation of the scope-extension mechanism

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — both plugin package names/versions verified live against npm and crates.io; official `@tauri-apps` org monorepo, three sibling packages already trusted in this project
- Architecture: HIGH — reprint path traced end-to-end through actual source (`app.jsx`, `screen-detail.jsx`, `screen-printer.jsx`) with an exact line-cited landmine (missing `onPrint` prop); CSV path follows the project's own established pure-function convention in `history-utils.js`
- Pitfalls: MEDIUM-HIGH — the `onPrint`-prop gap, BOM, cancel-handling, and partial-field pitfalls are all directly sourced from reading the actual code/UI-SPEC; the fs-scope-auto-extension claim (Pitfall 2) is MEDIUM confidence per Assumption A1 and should be smoke-tested early in execution rather than assumed correct in a final build

**Research date:** 2026-07-18
**Valid until:** 2026-08-17 (30 days — Tauri v2 plugin APIs are relatively stable; re-verify plugin versions if execution slips past this window given the `plugin-dialog` package's very recent publish cadence)
