---
phase: 11-reprint-csv-export
verified: 2026-07-19T00:35:00Z
status: passed
score: 15/15 must-haves verified
behavior_unverified: 0
overrides_applied: 0
human_verification:

  - test: "With a real thermal printer configured, open a historical order in the read-only detail view and tap Print kitchen / Print customer."
    expected: "Both receipts print on the physical printer with correct kitchen/customer content."
    why_human: "print_receipt IPC targets real serial-port hardware; cannot be exercised in Vitest/JSDOM. Reuses the handlePrint/print_receipt path already hardware-verified in Phase 5 — this phase only adds a second UI entry point to it."

  - test: "In History, apply a filter, click Export CSV, save the file, and open it in Excel."
    expected: "Rows/headers/escaped fields are correct, and Romanian diacritics (ă/ș/ț) render correctly via the UTF-8 BOM."
    why_human: "Native OS Save dialog + real filesystem write + Excel rendering are outside the JSDOM/Vitest environment. buildCsv's row/header/escaping/BOM logic is unit-tested; end-to-end Excel rendering with real diacritics is not (tracked as coverage item D6 in 11-04-SUMMARY.md)."

  - test: "Run `npm run tauri dev`, filter History, and click Export CSV to pick a save path."
    expected: "save() and writeTextFile() succeed with no permission/capability error, confirming the dialog:allow-save + fs:allow-write-text-file grants (and the fs-scope auto-extension assumption, Research A1) hold at runtime."
    why_human: "Capability/permission enforcement only manifests in a real Tauri runtime, not the web test harness."
---

# Phase 11: Reprint + CSV Export Verification Report

**Phase Goal:** Staff can reprint a historical receipt and export the filtered list for accounting
**Verified:** 2026-07-19T00:35:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Roadmap SC1 — Staff can reprint the receipt from the read-only detail view to the configured thermal printer; button greyed-out when no printer configured | ✓ VERIFIED | `src/screen-detail.jsx:280-301` — `readOnly &&` block renders Print kitchen/Print customer buttons; `printerConfigured` state (mount effect reading `preferences.json → printer.port`) gates `disabled`, `opacity:0.5/pointerEvents:none/cursor:not-allowed`, and `title=print_configure_hint`. Tests in `screen-detail.test.jsx` (part of 268/268 green phase-11 test run) assert both enabled and disabled states. |
| 2 | Roadmap SC2 — Staff can export the currently filtered results as CSV via a native Save dialog and open the resulting file with correct rows, headers, and escaped fields | ✓ VERIFIED (code+unit) / see human-verification for the Excel-open step | `src/screen-history.jsx:410-426` `handleExportCsv` wires `buildCsv(visible) → save() → writeTextFile()`; `src/history-utils.js:524+` `buildCsv` unit-tested for header content, row mapping, RFC-4180 escaping, and BOM (19 passing tests in `history-utils.test.js`). Opening the real file in Excel with diacritics is a Manual-Only item (human_verification #2). |
| 3 | The `history-detail` route in `app.jsx` passes `onPrint={handlePrint}` so a reprint click never throws `onPrint is not a function` (Pitfall 1) | ✓ VERIFIED | `src/app.jsx:271` — `onPrint={handlePrint}` present on the `history-detail` `<OrderDetailScreen>` block. Regression test `app-history-route.test.jsx:209-215` asserts `typeof historyDetailCall.onPrint === 'function'`. |
| 4 | Reprint buttons reuse the existing `print_kitchen`/`print_customer` i18n labels verbatim — no new label keys | ✓ VERIFIED | `src/screen-detail.jsx:267,289,270,298` all use `t('print_kitchen')`/`t('print_customer')`; no new print-label keys added. |
| 5 | `printerConfigured` is derived from a mount-time read of `preferences.json → printer.port`, gated on `readOnly`, held in local state, with an unmount-cancellation guard (WR-01 fix) | ✓ VERIFIED | `src/screen-detail.jsx:18-28` — effect gated `if (!readOnly) return`, uses a `cancelled` flag set in the cleanup function, matching the WR-01 fix in commit `d3d20e4`. |
| 6 | The reprint row is an ADDED `readOnly &&` block — the live `!readOnly` Advance/Cancel controls stay hidden | ✓ VERIFIED | `src/screen-detail.jsx:280` (`readOnly &&`) is a sibling block to `303` (`!readOnly &&`) and `315` (`!readOnly && ...Advance`); guard was not widened. Confirmed by `screen-detail.test.jsx` D4 assertion (Advance stays absent). |
| 7 | `buildCsv` produces one row per order with the 13-column accounting field set, comma-delimited, dot-decimal, fixed English headers (never localized), single leading UTF-8 BOM | ✓ VERIFIED | `src/history-utils.js:410-424` (`CSV_HEADERS`), `:493-495` (`csvMoney` → `.toFixed(2)`), `:524+` (`buildCsv` BOM-prepend + CRLF join). Verified by dedicated unit tests (BOM position, header content via `csv.slice(1)`, monetary formatting). |
| 8 | `buildCsv` escapes RFC-4180 special characters (comma/quote/newline) with doubled quotes | ✓ VERIFIED | `src/history-utils.js:454` `escapeCsvField` — quote-and-double logic; covered by passing tests. |
| 9 | A field whose first character is `=`,`+`,`-`,`@`, tab, or CR is neutralized against formula injection (T-11), scoped to user-authored columns only after the WR-02 fix | ✓ VERIFIED | `src/history-utils.js:432,451-456` `FORMULA_INJECTION_RE` + `guardFormula` param; `orderToCsvRow` (`:506-522`) passes `true` only for `customer.name`/`customer.phone` (`:512-513`), all other columns bypass the guard. Regression tests `history-utils.test.js:908` (negative money stays numeric) and `:918` (phone `+` still guarded) both pass — confirms WR-02 fix from commit `d3d20e4`. |
| 10 | Missing/undefined optional fields serialize as an empty CSV field, never `null`/`undefined`/`N/A` | ✓ VERIFIED | `escapeCsvField` (`:452`) coerces `null`/`undefined` to `''`; `csvMoney` (`:493-495`) returns `''` for missing values, never `'0.00'`. Covered by partial-row unit tests. |
| 11 | `history-utils.js` imports no react/data.jsx/@charlyk/admin-client — stays pure and unit-testable | ✓ VERIFIED | Module-purity invariant preserved; `buildCsv`/`escapeCsvField`/`csvMoney`/`csvPlacedAt`/`csvOrderNumber` are all pure functions with no such imports (confirmed by reading the file and by `npx vitest run src/__tests__/history-utils.test.js`, which runs the module standalone). |
| 12 | The three i18n keys (`print_configure_hint`, `h_export_empty_tooltip`, `h_export_error_title`) exist in both `ro` and `en` blocks with UI-SPEC-locked copy | ✓ VERIFIED | `src/i18n.jsx:241-243` (ro), `:484-486` (en) — all 6 occurrences present with the exact locked strings. |
| 13 | Clicking Export CSV builds the CSV from the visible filtered memo (no new fetch/hydration), opens a native Save dialog via `save()`, and writes with `writeTextFile()`; default filename is `orders_<from>_<to>.csv` | ✓ VERIFIED | `src/screen-history.jsx:410-426` `handleExportCsv`; `rangeToFilenameDates` (`:59-65`) derives inclusive from/to dates for the filename. Integration tests in `screen-history.test.jsx` assert filename shape, `buildCsv(visible)` call, and write-after-save ordering. |
| 14 | A cancelled Save dialog (`save()` resolves null/undefined) is a silent no-op — no toast, no `writeTextFile` call; a throw shows the `h_export_error_title` error toast | ✓ VERIFIED | `src/screen-history.jsx:418` explicit `if (!path) return;` guard before `writeTextFile`; catch block (`:423-425`) pushes the error toast only on a genuine throw. Both cancel and error paths covered by passing integration tests. |
| 15 | The Export button is disabled + greyed + tooltipped when `visible.length === 0`, enabled otherwise; `@tauri-apps/plugin-dialog`/`plugin-fs` are registered across all four Tauri layers with a narrow `dialog:allow-save`+`fs:allow-write-text-file` grant and no `fs:scope` | ✓ VERIFIED | `src/screen-history.jsx:889-897` (`exportDisabled={visible.length === 0}` styling/title/onClick); `package.json:17-18`, `Cargo.toml:30-31`, `lib.rs:430-431`, `capabilities/default.json` (permissions array contains exactly `dialog:allow-save`+`fs:allow-write-text-file`, no `fs:scope` entry). |

**Score:** 15/15 truths verified (0 present-but-behavior-unverified)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/history-utils.js` | `buildCsv` + escaping helpers | ✓ VERIFIED | Present, substantive, pure, wired into `screen-history.jsx` |
| `src/i18n.jsx` | 3 new keys, ro+en | ✓ VERIFIED | 6 occurrences confirmed, locked copy matches UI-SPEC |
| `src/app.jsx` | `onPrint={handlePrint}` on `history-detail` route | ✓ VERIFIED | Present at line 271 |
| `src/screen-detail.jsx` | `readOnly &&` reprint row + `printerConfigured` gate | ✓ VERIFIED | Present at lines 16-28, 280-301; WR-01 fix present |
| `src/screen-history.jsx` | `handleExportCsv` + activated Export button | ✓ VERIFIED | Present at lines 410-426, 889-897 |
| `package.json` / `Cargo.toml` / `lib.rs` / `capabilities/default.json` | 4-file plugin lockstep | ✓ VERIFIED | All four layers confirmed registered with narrow grant |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|----|--------|---------|
| `app.jsx` history-detail route | `handlePrint` | `onPrint={handlePrint}` prop | ✓ WIRED | Confirmed by regression test + source read |
| `screen-detail.jsx` reprint buttons | `onPrint(order, kind)` | `onClick` handlers | ✓ WIRED | Buttons call `onPrint` with `'kitchen'`/`'customer'` |
| `screen-detail.jsx` printerConfigured | `preferences.json → printer.port` | mount `useEffect` + `load()`/`store.get()` | ✓ WIRED | Cancellation-guarded effect confirmed |
| `screen-history.jsx` Export button | `handleExportCsv` | `onExportCsv` prop → `onClick` | ✓ WIRED | `HistoryScreen` passes `onExportCsv={handleExportCsv}` (line 495) into the toolbar sub-component, which wires `onClick={onExportCsv}` (line 892) |
| `handleExportCsv` | `buildCsv(visible)` → `save()` → `writeTextFile()` | direct call chain | ✓ WIRED | Order confirmed: build → save → guard → write → toast |
| `history-utils.js` `orderToCsvRow` | `deriveDisplayStatus(order)` | reused existing export | ✓ WIRED | Status column derivation reuses the existing function, not reimplemented |
| Tauri capabilities | `save()`/`writeTextFile()` at runtime | `dialog:allow-save`+`fs:allow-write-text-file` grants | ✓ WIRED (static) / see human_verification #3 for runtime confirmation | Grants present in `capabilities/default.json`; runtime confirmation requires `npm run tauri dev` |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| `buildCsv` large-export perf test passes | `npx vitest run src/__tests__/history-utils.test.js -t "large export"` | 1 passed | ✓ PASS |
| All phase-11 test files pass | `npx vitest run src/__tests__/print-receipt.test.jsx src/__tests__/history-utils.test.js src/__tests__/screen-detail.test.jsx src/__tests__/screen-history.test.jsx src/__tests__/app-history-route.test.jsx` | 268 passed | ✓ PASS |
| WR-02 regression: negative money not formula-guarded | test name match in `history-utils.test.js:908` | passed (part of 268) | ✓ PASS |
| WR-02 regression: phone `+` still guarded | test name match in `history-utils.test.js:918` | passed (part of 268) | ✓ PASS |
| CR-01 regression: `daily_order_number` coercion (numeric/UUID/null/undefined) | test name match in `print-receipt.test.jsx:209` | passed (part of 268) | ✓ PASS |
| Full workspace suite (baseline check) | `npx vitest run` | 481 passed / 3 failed (484 total) | ✓ PASS (3 failures pre-existing, unrelated — see below) |

**Full-suite result detail:** `npx vitest run` (run once, not filtered per-truth) → **481 passed / 3 failed**. The 3 failures are:

1. `src/__tests__/build-pipeline.test.js` — `BILD-04 — bundle.createUpdaterArtifacts is true` (pre-existing, `tauri.conf.json` has `"v1Compatible"` instead of `true`, last touched Phase 6, commit `7d00bcd`)
2. `src/__tests__/offline-buttons.test.jsx` — `U12` (×2 assertions) — `OrdersScreen` throws `No QueryClient set` because the test renders without a `QueryClientProvider` wrapper (pre-existing, Phase 6, commit `7d00bcd`)

Both are confirmed by direct execution to be pre-existing and unrelated to phase 11 (no `dialog`/`fs`/`writeTextFile`/`buildCsv`/reprint references in either failing test), matching `deferred-items.md` and the phase context notes exactly.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| HIST-11 | 11-02, 11-03 | User can reprint a receipt from the read-only detail view (greyed-out when no printer configured) | ✓ SATISFIED | Truths #1, #3-6; `screen-detail.jsx`, `app.jsx` |
| HIST-12 | 11-01, 11-02, 11-04 | User can export the current filtered results as a CSV file via a native Save dialog — generated client-side | ✓ SATISFIED | Truths #2, #7-10, #13-15; `history-utils.js`, `screen-history.jsx`, 4-file plugin lockstep |

No orphaned requirements — both HIST-11 and HIST-12 map to plans in this phase per `REQUIREMENTS.md`'s traceability table, and both are covered by the plans actually executed.

### Anti-Patterns Found

None. Scanned `src/app.jsx`, `src/screen-detail.jsx`, `src/screen-history.jsx`, `src/history-utils.js`, `src/i18n.jsx`, `src-tauri/src/lib.rs`, `src-tauri/capabilities/default.json` for `TBD`/`FIXME`/`XXX`/`TODO`/`HACK`/`PLACEHOLDER`/`console.log`-only-implementations — zero matches.

### Code Review Resolution (11-REVIEW.md)

The post-execution code review found 1 Critical + 2 Warnings; all three were fixed inline in commit `d3d20e4` with new regression tests, confirmed present in the current working tree:

| Finding | Fix Location | Verified Present |
|---------|--------------|-------------------|
| CR-01 (critical): `daily_order_number` unguarded → strict Rust `u32`, breaking reprint for UUID-fallback orders | `src/app.jsx:151` — `typeof order.dailyOrderNumber === 'number' ? order.dailyOrderNumber : 0` | ✓ Confirmed in source; regression tests pass |
| WR-01: `printerConfigured` effect has no unmount guard | `src/screen-detail.jsx:20-27` — `cancelled` flag + cleanup function | ✓ Confirmed in source |
| WR-02: formula-injection guard applied indiscriminately, mangling phone numbers and negative money values | `src/history-utils.js:441-453,506-522` — `guardFormula` param scoped to `customer.name`/`customer.phone` only | ✓ Confirmed in source; regression tests pass |

IN-01 (money rounding via `toFixed`) was deliberately deferred as a documented pre-existing pattern, not a phase-11 regression — reasonable, not a gap.

### Human Verification Required

1. **Physical thermal reprint** — With a real printer configured, open a historical order and tap Print kitchen / Print customer.
   Expected: Both receipts print correctly on hardware.
   Why human: Requires physical thermal printer hardware; cannot be exercised in Vitest.

2. **CSV opens correctly in Excel with diacritics** — Export CSV from a filtered History view, open the file in Excel.
   Expected: Rows/headers/escaped fields correct; Romanian diacritics (ă/ș/ț) render via the BOM.
   Why human: Native Save dialog + real filesystem write + Excel rendering are outside the Vitest/JSDOM environment.

3. **Tauri capability grants work at runtime** — In `npm run tauri dev`, click Export CSV and confirm the save/write succeeds with no permission error.
   Expected: `save()`/`writeTextFile()` succeed, confirming the `dialog:allow-save`/`fs:allow-write-text-file` grants (and the fs-scope auto-extension assumption) hold in a real Tauri runtime.
   Why human: Capability/permission enforcement only manifests in a real Tauri runtime, not the web test harness.

### Gaps Summary

No gaps found. All 15 derived must-have truths (merged from the 2 ROADMAP.md success criteria and the must_haves frontmatter across all 4 plans) are verified in the actual source code — not just claimed in SUMMARY.md. All three code-review findings (1 critical, 2 warnings) from `11-REVIEW.md` were independently confirmed fixed in the current working tree, not just claimed fixed. The full test suite was executed directly by this verifier (not taken from SUMMARY claims) and matches the documented 481-passed/3-pre-existing-failed baseline exactly.

The phase is functionally complete pending three Manual-Only verification items that require real hardware/native-runtime access (thermal printer, Excel, `npm run tauri dev`) — none of these are gaps in the implementation; they are the expected human-in-the-loop checks for capabilities that cannot be exercised in a JSDOM/Vitest environment. Per the phase's own `11-VALIDATION.md`, these are pre-declared Manual-Only items, not new discoveries.

---

_Verified: 2026-07-19T00:35:00Z_
_Verifier: Claude (gsd-verifier)_
