---
phase: 11
slug: reprint-csv-export
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: validated
nyquist_compliant: true
wave_0_complete: true
created: 2026-07-18
---

# Phase 11 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Promoted from the plan-phase seed skeleton by `/gsd-validate-phase` (invoked from Phase 12 Plan
> 04, Task 3, D-10) — reconstructed from `11-VERIFICATION.md`'s already-complete Per-Task
> evidence table plus `11-UAT.md` (both pre-existing, no re-verification needed; State A audit
> found zero gaps).

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest ^4.1.5 + @testing-library/react ^16.3.2 (already configured) |
| **Config file** | `vitest.config.js` |
| **Quick run command** | `npx vitest run src/__tests__/print-receipt.test.jsx src/__tests__/history-utils.test.js src/__tests__/screen-detail.test.jsx src/__tests__/screen-history.test.jsx src/__tests__/app-history-route.test.jsx` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run the quick run command above (5 phase-touched files)
- **After every plan wave:** Run `npx vitest run` (full suite)
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** ~15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 11-01-01 | 01 | 1 | HIST-12 | T-11-SC | Supply-chain legitimacy gate for `@tauri-apps/plugin-dialog` — blocking-human checkpoint resolved | checkpoint (human-verified) | N/A — package-legitimacy gate, resolved by orchestrator+human before dispatch | ✅ | ✅ green |
| 11-01-02 | 01 | 1 | HIST-12 | T-11-CAP | `plugin-dialog`/`plugin-fs` registered across the four-file lockstep with narrow `dialog:allow-save`+`fs:allow-write-text-file` grant, no `fs:scope` | static (grep/read) | `grep -c "allow-save\|allow-write-text-file" src-tauri/capabilities/default.json` | ✅ | ✅ green |
| 11-02-01 | 02 | 1 | HIST-11/HIST-12 (i18n) | — | N/A | static (grep) | `grep -c "print_configure_hint\|h_export_empty_tooltip\|h_export_error_title" src/i18n.jsx` | ✅ | ✅ green |
| 11-02-02 | 02 | 1 | HIST-12 | T-11 (CSV formula injection) | `buildCsv` neutralizes leading `=`/`+`/`-`/`@` scoped to user-authored columns (WR-02 fix: `customer.name`/`customer.phone` only) | unit | `npx vitest run src/__tests__/history-utils.test.js` | ✅ | ✅ green |
| 11-03-01 | 03 | 2 | HIST-11 | — | `onPrint={handlePrint}` wired on `history-detail` route (Pitfall 1 regression guard) | integration | `npx vitest run src/__tests__/app-history-route.test.jsx` | ✅ | ✅ green |
| 11-03-02 | 03 | 2 | HIST-11 | — | `readOnly` reprint-button row + `printerConfigured` gate (WR-01 unmount-guard fix) | integration | `npx vitest run src/__tests__/screen-detail.test.jsx` | ✅ | ✅ green |
| 11-04-01 | 04 | 2 | HIST-12 | — | `handleExportCsv` build→save→write chain; cancel = silent no-op; throw = error toast | integration | `npx vitest run src/__tests__/screen-history.test.jsx` | ✅ | ✅ green |
| 11-04-02 | 04 | 2 | HIST-12 | — | Export button disabled+tooltipped when `visible.length === 0` | integration | `npx vitest run src/__tests__/screen-history.test.jsx` | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

**Evidence:** `11-VERIFICATION.md` §Goal Achievement records 268/268 phase-touched tests passing
(5 files) and 481/484 full-suite passing (the 3 pre-existing v1.0 failures, unrelated). All 15
must-haves truths verified directly by automated test or source read; the 3 post-review findings
(CR-01 critical + WR-01/WR-02 warnings, `11-REVIEW.md`) were all fixed inline in commit `d3d20e4`
with regression tests, independently re-confirmed present by the verifier.

---

## Wave 0 Requirements

- [x] `src/__tests__/history-utils.test.js` — `describe('buildCsv', ...)` covering escaping, BOM, 0/1/many rows, partial-field rows, held-out large-export perf case, CSV-formula-injection neutralization — present, passing
- [x] `src/__tests__/screen-detail.test.jsx` — extended `describe('readOnly mode', ...)` with reprint-button enabled/disabled/tooltip assertions — present, passing
- [x] `src/__tests__/app-history-route.test.jsx` — `onPrint` reaches `OrderDetailScreen` on the `history-detail` route regression guard — present, passing
- [x] `src/__tests__/screen-history.test.jsx` — Export click/cancel/error/empty-state assertions, mocking `@tauri-apps/plugin-dialog`/`plugin-fs` — present, passing
- [x] No new framework/config needed — confirmed, Vitest + RTL + existing Tauri-plugin mocking convention extended cleanly

All Wave 0 targets from the seed skeleton were delivered across 11-01 through 11-04. No outstanding Wave 0 gaps.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions | Resolution |
|----------|-------------|------------|--------------------|------------|
| Actual thermal reprint reaches the physical printer with correct kitchen/customer content | HIST-11 | Requires configured thermal-printer hardware; `print_receipt` IPC target cannot be exercised in Vitest | Configure a printer in Settings, open a historical order → tap Print kitchen / Print customer → confirm both receipts print correctly | ✅ Closed — `11-UAT.md` test 1, result: pass (2026-07-19) |
| Native Save dialog opens and the written `.csv` opens in Excel with Romanian diacritics (ă/ș/ț) intact | HIST-12 | Native OS Save dialog + real filesystem write + Excel rendering are outside JSDOM/Vitest | Filter History, click Export CSV, save the file, open in Excel → confirm rows/headers/escaping and diacritics render correctly | ✅ Closed — `11-UAT.md` test 2, result: pass (2026-07-19) |
| Tauri capability grants (`dialog:allow-save` + `fs:allow-write-text-file`) actually permit `save()`+`writeTextFile()` at runtime (Research Assumption A1) | HIST-12 | Capability/permission enforcement only manifests in a real Tauri runtime | In `npm run tauri dev`, pick a path via the dialog and confirm the write succeeds with no permission error | ✅ Closed — `11-UAT.md` test 3, result: pass (2026-07-19) |

Both Wave 0/plan-time Manual-Only items and the phase's post-verification human_verification set
converge on the same 3 items; all were closed with a passing result in `11-UAT.md` (3/3, 0 issues)
on 2026-07-19.

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 15s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-07-19 (reconstructed from complete `11-VERIFICATION.md`/`11-UAT.md`
evidence during Phase 12 Plan 04, Task 3 — D-10; zero gaps found, no auditor spawn needed)

## Validation Audit 2026-07-19

| Metric | Count |
|--------|-------|
| Gaps found | 0 |
| Resolved | 0 (none needed) |
| Escalated | 0 |
