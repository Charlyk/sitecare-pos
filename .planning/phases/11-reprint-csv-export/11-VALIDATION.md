---
phase: 11
slug: reprint-csv-export
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-07-18
---

# Phase 11 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Derived from `11-RESEARCH.md` → ## Validation Architecture.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.5 + @testing-library/react 16.3.2 (already configured) |
| **Config file** | `vitest.config.js` |
| **Quick run command** | `npx vitest run src/__tests__/history-utils.test.js src/__tests__/screen-detail.test.jsx src/__tests__/screen-history.test.jsx` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~15 seconds (342+ existing tests + phase-11 additions) |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run src/__tests__/history-utils.test.js src/__tests__/screen-detail.test.jsx src/__tests__/screen-history.test.jsx`
- **After every plan wave:** Run `npx vitest run` (full suite)
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** ~15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 11-XX | CSV | — | HIST-12 | T-11 (CSV formula injection) | `buildCsv` neutralizes leading `=`/`+`/`-`/`@` per threat-model decision | unit | `npx vitest run src/__tests__/history-utils.test.js` | ❌ W0 | ⬜ pending |
| 11-XX | CSV | — | HIST-12 | — | `buildCsv` header + row mapping for populated set | unit (pure fn) | `npx vitest run src/__tests__/history-utils.test.js` | ❌ W0 | ⬜ pending |
| 11-XX | CSV | — | HIST-12 | — | `buildCsv` RFC-4180 escaping (comma/quote/newline; doubled quotes) | unit (pure fn) | `npx vitest run src/__tests__/history-utils.test.js` | ❌ W0 | ⬜ pending |
| 11-XX | CSV | — | HIST-12 | — | `buildCsv` prepends exactly one BOM at position 0 | unit (pure fn) | `npx vitest run src/__tests__/history-utils.test.js` | ❌ W0 | ⬜ pending |
| 11-XX | CSV | — | HIST-12 | — | `buildCsv` structure identical at 0/1/many rows | unit (pure fn) | `npx vitest run src/__tests__/history-utils.test.js` | ❌ W0 | ⬜ pending |
| 11-XX | CSV | — | HIST-12 | — | `buildCsv` emits `""` (not null/undefined/N/A) for missing optional fields | unit (pure fn) | `npx vitest run src/__tests__/history-utils.test.js` | ❌ W0 | ⬜ pending |
| 11-XX | CSV | — | HIST-12 | — | **Held-out large-export test** — ~366-day / ~thousands-of-rows `buildCsv` completes < 1000ms (UI-SPEC "overflow", upgraded from backstop — MUST include) | unit (perf-flavored) | `npx vitest run src/__tests__/history-utils.test.js -t "large export"` | ❌ W0 | ⬜ pending |
| 11-XX | CSV | — | HIST-12 | — | Export click → `save()` → `writeTextFile()` happy path (both plugins mocked) | integration | `npx vitest run src/__tests__/screen-history.test.jsx` | ❌ W0 | ⬜ pending |
| 11-XX | CSV | — | HIST-12 | — | `save()` → `null` (cancel) = no toast, no `writeTextFile` call | integration | `npx vitest run src/__tests__/screen-history.test.jsx` | ❌ W0 | ⬜ pending |
| 11-XX | CSV | — | HIST-12 | — | `writeTextFile` throw → `h_export_error_title` error toast | integration | `npx vitest run src/__tests__/screen-history.test.jsx` | ❌ W0 | ⬜ pending |
| 11-XX | CSV | — | HIST-12 | — | Export disabled + `h_export_empty_tooltip` when `visible.length === 0` | integration | `npx vitest run src/__tests__/screen-history.test.jsx` | ❌ W0 | ⬜ pending |
| 11-XX | Reprint | — | HIST-11 | — | Reprint buttons call `onPrint(order, 'kitchen'\|'customer')` when enabled | integration (RTL) | `npx vitest run src/__tests__/screen-detail.test.jsx` | ❌ W0 | ⬜ pending |
| 11-XX | Reprint | — | HIST-11 | — | Reprint buttons disabled + greyed + `print_configure_hint` tooltip when `printerConfigured === false` | integration (RTL) | `npx vitest run src/__tests__/screen-detail.test.jsx` | ❌ W0 | ⬜ pending |
| 11-XX | Reprint | — | HIST-11 | — | `history-detail` route passes `onPrint={handlePrint}` (regression guard, Pitfall 1) | integration | `npx vitest run src/__tests__/app-history-route.test.jsx` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky · plan/wave/task IDs finalized by the planner*

---

## Wave 0 Requirements

- [ ] `src/__tests__/history-utils.test.js` — add `describe('buildCsv', ...)` covering escaping, BOM, 0/1/many rows, partial-field rows, the held-out large-export perf case, and CSV-formula-injection neutralization (per threat-model decision)
- [ ] `src/__tests__/screen-detail.test.jsx` — extend the existing `describe('readOnly mode', ...)` with reprint-button enabled/disabled/tooltip assertions
- [ ] `src/__tests__/app-history-route.test.jsx` — add an assertion that `onPrint` reaches `OrderDetailScreen` on the `history-detail` route (regression guard for Pitfall 1)
- [ ] `src/__tests__/screen-history.test.jsx` — extend with Export click/cancel/error/empty-state assertions, mocking `@tauri-apps/plugin-dialog` `save` and `@tauri-apps/plugin-fs` `writeTextFile` (same convention as `print-receipt.test.jsx` mocking `@tauri-apps/plugin-store`/`@tauri-apps/api/core`)
- [ ] No new framework/config needed — Vitest + RTL + existing Tauri-plugin mocking convention extends to the two new plugins

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Actual thermal reprint reaches the physical printer with correct kitchen/customer content | HIST-11 | Requires configured thermal-printer hardware; `print_receipt` IPC target cannot be exercised in Vitest | With a printer configured in Settings, open a historical order → tap **Print kitchen** and **Print customer** → confirm both receipts print with correct content |
| Native Save dialog opens and the written `.csv` opens in Excel with Romanian diacritics (ă/ș/ț) intact | HIST-12 | Native OS Save dialog + real filesystem write + Excel rendering are outside the JSDOM/Vitest environment (BOM correctness is unit-tested; end-to-end Excel rendering is not) | Filter History, click **Export CSV**, save the file, open in Excel → confirm rows/headers/escaping and that customer names with diacritics render correctly |
| Tauri capability grants (`dialog:allow-save` + `fs:allow-write-text-file`) actually permit `save()`+`writeTextFile()` at runtime (Research Assumption A1 — fs-scope auto-extension to the dialog-picked path) | HIST-12 | Capability/permission enforcement only manifests in a real Tauri runtime, not the web test harness | Early smoke test in `npm run tauri dev`: pick a path via the dialog and confirm the write succeeds with no permission error |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
