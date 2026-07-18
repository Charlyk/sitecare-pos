# Phase 11: Reprint + CSV Export - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-18
**Phase:** 11-reprint-csv-export
**Areas discussed:** Reprint button design, No-printer greyed state, CSV columns & granularity, CSV format & locale

---

## Reprint button design

### How many print actions?

| Option | Description | Selected |
|--------|-------------|----------|
| Both Kitchen + Customer | Mirror the live detail exactly — two buttons reusing onPrint(order,'kitchen'\|'customer') | ✓ |
| Single 'Reprint receipt' | One button, prints the customer receipt | |
| Follows preview tab | One button, prints whichever Kitchen/Customer preview tab is active | |

**User's choice:** Both Kitchen + Customer.

### Label copy

| Option | Description | Selected |
|--------|-------------|----------|
| Reuse print_kitchen/customer | Same labels as live detail; zero new i18n keys | ✓ |
| New 'Reprint' labels | reprint_kitchen / reprint_customer keys × 2 langs | |

**User's choice:** Reuse existing `print_kitchen` / `print_customer` keys.

---

## No-printer greyed state

### Detecting printer-configured state at render

| Option | Description | Selected |
|--------|-------------|----------|
| Load config on mount | useEffect reads store 'printer', holds printerConfigured in state, disables when false | ✓ |
| Shared printer state in store | Add printer-configured to Zustand, set on boot + on save; live across session | |
| You decide | Planner picks lightest approach | |

**User's choice:** Load config on mount.

### Disabled UX + hint

| Option | Description | Selected |
|--------|-------------|----------|
| Greyed + tooltip hint | Dim + disable, plus title tooltip 'Configure a printer in Settings'; no toast | ✓ |
| Greyed, no hint | Dim + disable only, matching unready-feature convention | |
| Greyed + keep toast | Dim, but keep the existing not-configured toast as safety net | |

**User's choice:** Greyed + tooltip hint (new i18n key for tooltip text).

---

## CSV columns & granularity

### Row granularity

| Option | Description | Selected |
|--------|-------------|----------|
| One row per order | Each filtered order = one summary row; no getOrder(id) hydration | ✓ |
| One row per line item | Expand items; needs per-order hydration (N fetches) | |

**User's choice:** One row per order.

### Column set

| Option | Description | Selected |
|--------|-------------|----------|
| Accounting-full | num, datetime, type, status, customer, phone, payment, subtotal, delivery_fee, tip, tax, discount, total | ✓ |
| Core financial | num, datetime, type, status, customer, subtotal, tax, total | |
| You decide | Planner picks a sensible accounting set | |

**User's choice:** Accounting-full.

---

## CSV format & locale

### Delimiter / decimal

| Option | Description | Selected |
|--------|-------------|----------|
| RO Excel (semicolon) | Semicolon delimiter, comma decimal; opens by double-click in RO Windows Excel | |
| Standard CSV (comma) | Comma delimiter, dot decimal; RFC-portable | ✓ |
| Follow app language | ro → semicolon/comma-decimal, en → comma/dot | |

**User's choice:** Standard CSV (comma, dot decimal).

### Header language / BOM

| Option | Description | Selected |
|--------|-------------|----------|
| English headers + BOM | Fixed English headers + UTF-8 BOM for diacritics in Excel | ✓ |
| Localized headers + BOM | Headers follow app language via new i18n keys + BOM | |
| English headers, no BOM | Fixed English headers, no BOM; risk of mojibake in Excel | |

**User's choice:** English headers + UTF-8 BOM.

### Save-dialog mechanism

| Option | Description | Selected |
|--------|-------------|----------|
| Tauri dialog + fs plugins | Add @tauri-apps/plugin-dialog + plugin-fs; JS builds CSV, plugins do IO | ✓ |
| Rust command | One export_csv #[command] opens dialog + writes in Rust | |
| You decide | Researcher/planner chooses | |

**User's choice:** Tauri dialog + fs plugins.

### Default filename

| Option | Description | Selected |
|--------|-------------|----------|
| Range-based | orders_<from>_<to>.csv — self-describing, collision-resistant | ✓ |
| Export-date | orders_export_<today>.csv — simpler, can collide same-day | |
| You decide | Planner picks | |

**User's choice:** Range-based (`orders_<from>_<to>.csv`).

---

## Claude's Discretion

- `placed_at` datetime string format in the CSV (spreadsheet-friendly, sortable).
- Empty-list export behavior (0 filtered rows) and any post-export success toast.
- Precise placement/order of the two reprint buttons and exact disabled-style tokens.

## Deferred Ideas

None — discussion stayed within phase scope. Two considered-and-rejected alternatives (line-item CSV granularity; RO-Excel semicolon/comma-decimal formatting) are recorded as decisions D-07 / D-09 in CONTEXT.md, not deferred.
