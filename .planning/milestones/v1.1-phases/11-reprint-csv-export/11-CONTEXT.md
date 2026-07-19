# Phase 11: Reprint + CSV Export - Context

**Gathered:** 2026-07-18
**Status:** Ready for planning

<domain>
## Phase Boundary

Two capabilities layered onto the already-shipped History screen (Phases 7–10):

1. **Reprint (HIST-11)** — Staff can reprint a historical receipt from the **read-only** order detail view to the configured thermal printer. The reprint control is greyed-out when no printer is configured.
2. **CSV export (HIST-12)** — Staff can export the **currently filtered** History results as a CSV file via a native Save dialog, generated client-side.

Nothing else. No new data sources, no server-side export, no changes to filtering/period logic (those shipped in Phases 9–10). The Export button already exists but is inert; this phase activates it. Print buttons already exist in the live detail; this phase surfaces equivalents in read-only mode.

</domain>

<decisions>
## Implementation Decisions

### Reprint control (HIST-11)
- **D-01:** Expose **two** reprint buttons in the read-only detail — **Print kitchen** and **Print customer** — mirroring the live detail exactly (`screen-detail.jsx:262-269`). They reuse the same `onPrint(order, 'kitchen'|'customer')` → `handlePrint` → `print_receipt` path already wired for live orders.
- **D-02:** **Reuse the existing `print_kitchen` / `print_customer` i18n keys** for the labels ("Bon bucătărie" / "Bon client" · "Print kitchen" / "Print customer"). No new label keys. (Deliberately NOT "Reprint …" copy.)
- **D-03:** These buttons appear inside the existing thermal-preview panel that already renders in read-only mode (`screen-detail.jsx:241-259`). The current code hides the print button row behind `!readOnly` (`screen-detail.jsx:261`); this phase adds a read-only variant of that row rather than removing the guard wholesale (the live `!readOnly` Advance/Cancel controls below it must stay hidden).

### No-printer greyed state (HIST-11)
- **D-04:** Detect printer-configured state by **reading the store on mount** — `load('preferences.json')` → `store.get('printer')` → `printerConfigured = !!config?.port`, held in local component state. Same store/key the app already uses in `handlePrint` (`app.jsx:129-131`) and `screen-printer.jsx:85-86`, just read at render time instead of at click.
- **D-05:** When `printerConfigured` is false, render the buttons **greyed + disabled**, matching the existing inert-Export dimming convention (`opacity: 0.5; pointerEvents: none; cursor: not-allowed`, per `screen-history.jsx:843`) and the project "unready features are greyed-out, visible, not clickable" rule.
- **D-06:** Add a **tooltip hint** on the disabled buttons — a `title` like "Configure a printer in Settings" via a **new i18n key** (ro + en). No toast fallback needed since the buttons are truly inert when disabled (this diverges from the live path's click-time `printer_not_configured` toast at `app.jsx:132`, which stays as-is for live orders).

### CSV contents & granularity (HIST-12)
- **D-07:** **One row per order** — each visible/filtered order becomes a single summary row. Works entirely from the `AdminOrder` summaries already held in `HistoryScreen` (`visible` memo, `screen-history.jsx:380`); **no per-order `getOrder(id)` hydration**.
- **D-08:** **Accounting-full column set**, all sourced from `normalizeOrder` fields already present: `order_number`, `placed_at` (datetime), `type`, `status`, `customer`, `phone`, `payment`, `subtotal`, `delivery_fee`, `tip`, `tax`, `discount`, `total`. (Available fields confirmed in `data.jsx`: `dailyOrderNumber`, `placedAt`, `type`, `customer{name,phone}`, `payment`, `subtotal`, `deliveryFee`, `tip`, `tax`, `discount`, `total`; derived status via `historyStatusMeta`.)

### CSV format & locale (HIST-12)
- **D-09:** **Standard RFC-4180 CSV** — **comma** field delimiter, **dot** decimal separator (e.g. `145.00`). NOT the RO-Excel semicolon/comma-decimal variant. Portable and predictable for downstream accounting import; accept that a double-clicked file in a Romanian Windows Excel may need Text-to-Columns.
- **D-10:** **Fixed English machine-style headers** (`order_number,placed_at,type,status,customer,phone,payment,subtotal,delivery_fee,tip,tax,discount,total`) — stable across languages, not localized. No new header i18n keys.
- **D-11:** Prepend a **UTF-8 BOM** (U+FEFF, byte sequence `EF BB BF`) as the first character of the CSV string so Excel renders diacritics (ă/ș/ț) in customer names correctly.
- **D-12:** Standard CSV field escaping — quote any field containing comma, double-quote, or newline; escape embedded quotes by doubling. (Customer names and notes are the realistic sources of special chars.)
- **D-13:** Implement the native Save dialog + write via **`@tauri-apps/plugin-dialog` + `@tauri-apps/plugin-fs`** (JS-side): build the CSV string in JS, call `save({ defaultPath, filters: [{ name: 'CSV', extensions: ['csv'] }] })`, then `writeTextFile(path, csv)`. NOT a Rust command. New deps + a capabilities entry required; keeps the Rust side thin (consistent with the architecture rule that Rust is window chrome + store + thermal printing only — file IO via official plugins is acceptable and idiomatic Tauri v2).
- **D-14:** **Range-based default filename**: `orders_<from>_<to>.csv` (e.g. `orders_2026-07-01_2026-07-18.csv`), derived from the active period's `from`/`to` already driving the list. Self-describing and collision-resistant.

### Claude's Discretion
- CSV `placed_at` datetime string format (ISO vs locale) — pick a spreadsheet-friendly, sortable format; not separately decided.
- Empty-list export behavior (0 filtered rows) and any post-export success toast — planner's call; sensible defaults expected (e.g., disable/skip export when nothing is visible, or write a header-only file).
- Exact placement/order of the two reprint buttons within the read-only preview panel and the precise disabled-style tokens — follow existing detail-view layout.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & roadmap
- `.planning/REQUIREMENTS.md` §HIST-11, §HIST-12 — the two requirements this phase satisfies (reprint greyed-when-unconfigured; client-side CSV of filtered results via native Save dialog).
- `.planning/ROADMAP.md` "Phase 11" — goal + two success criteria (reprint to configured thermal printer, greyed when none; export filtered results as CSV via native Save dialog with correct rows/headers/escaped fields).

### Reprint path (existing code to reuse)
- `src/app.jsx:127-175` — `handlePrint(order, kind)`: printer-config guard + `invoke('print_receipt', {...})` payload shape. The read-only reprint reuses this exact handler.
- `src/screen-detail.jsx:240-270` — thermal-preview panel + the `!readOnly`-gated print button row that must gain a read-only variant.
- `src-tauri/src/lib.rs:183` — `print_receipt` Rust command (the print target; unchanged this phase).
- `src/screen-printer.jsx:85-102` — how printer config is written to / read from the store (`store.get('printer')`, `config.port`), the source of truth for the greyed-out state.

### CSV export path (existing code to reuse)
- `src/screen-history.jsx:369-398` — `visible` filtered-orders memo (the CSV data source) + faceted counts; export must reflect exactly these rows.
- `src/screen-history.jsx:834-846` — the currently-inert Export button (`h_export`) to activate.
- `src/history-utils.js:66-70` — `MAX_RANGE_DAYS = 366`, chosen partly so a full-year CSV export runs in one pass.
- `src/i18n.jsx` (`h_export` at :240/:480) — existing export label; add the new no-printer tooltip key here.

### Project constraints
- `CLAUDE.md` — CSP must allow any new capability; "Rust side is thin"; unready features greyed-out (not hidden); `@charlyk/admin-client` is the only data layer (no new fetches — export uses in-hand summaries).
- `.planning/phases/10-filters-search/10-CONTEXT.md` D-07 — why search + Export are nested in one `marginLeft:auto` container and why Export was parked inert for Phase 11.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`handlePrint` (`app.jsx:127`)** — complete print flow incl. config guard and `print_receipt` payload mapping; the read-only reprint wires straight into it via the existing `onPrint` prop already passed to `OrderDetailScreen` for live orders.
- **`OrderDetailScreen` `readOnly` mode (`screen-detail.jsx`)** — shipped in Phase 7; already renders the thermal-preview panel with Kitchen/Customer tabs in read-only. Only the print button row is currently hidden.
- **`visible` memo (`screen-history.jsx:380`)** — the exact filtered/searched/period-scoped order set; CSV maps 1:1 over it.
- **Store access pattern (`load('preferences.json')` + `store.get('printer')`)** — reused for the mount-time printer-configured check.
- **Inert-Export dimming style (`screen-history.jsx:843`)** — the greyed-out visual convention to copy for the disabled reprint buttons.

### Established Patterns
- Rust stays thin — file IO via official Tauri v2 plugins (dialog/fs), not a bespoke command (D-13).
- New user-facing strings go through `i18n.jsx` with ro + en entries (one new key this phase: the no-printer tooltip).
- Pure/derivable logic lives in `history-utils.js` — the CSV serializer (row mapping + escaping + BOM + header) is a natural fit there as a pure, unit-testable function.

### Integration Points
- **New:** `@tauri-apps/plugin-dialog` + `@tauri-apps/plugin-fs` — add to `package.json`, `src-tauri/Cargo.toml`, register in `lib.rs`, and grant in `src-tauri/capabilities/`.
- **Read-only detail** ↔ `handlePrint` (reprint) — surface the print row under `readOnly`.
- **History screen** ↔ new CSV serializer + Save-dialog action bound to the `h_export` button, fed by `visible`.

</code_context>

<specifics>
## Specific Ideas

- Reprint should feel identical to the live detail's print controls — same two buttons, same labels, same handler — just available in the archived-order view.
- CSV is optimized for a downstream **accounting import**, not for pretty in-app display: portable RFC comma-CSV, stable English headers, full financial breakdown per order, one row per order.
- Diacritics must survive Excel (BOM) even though headers are English, because customer names are Romanian.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope. (Line-item-level CSV granularity was considered and rejected for this phase in favor of one-row-per-order; RO-Excel semicolon/comma-decimal formatting was considered and rejected in favor of standard RFC CSV. Both are recorded above as D-07 / D-09, not deferred.)

</deferred>

---

*Phase: 11-reprint-csv-export*
*Context gathered: 2026-07-18*
