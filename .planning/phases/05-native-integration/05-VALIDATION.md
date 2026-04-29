---
phase: 5
slug: native-integration
status: done
nyquist_compliant: true
wave_0_complete: true
created: 2026-04-28
audited: 2026-04-29
---

# Phase 5 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.5 |
| **Config file** | `vitest.config.js` (project root) |
| **Quick run command** | `npx vitest run src/__tests__/screen-printer.test.jsx --reporter=verbose 2>&1 | tail -20` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run src/__tests__/screen-printer.test.jsx`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------------|-----------|-------------------|-------------|--------|
| 05-Wave0-01 | Wave 0 stubs | 0 | PRNT-01 | invoke mock, no real hardware | unit | `npx vitest run src/__tests__/screen-printer.test.jsx -t "PRNT-01"` | ✅ screen-printer.test.jsx | ✅ green |
| 05-Wave0-02 | Wave 0 stubs | 0 | PRNT-01 | empty port list → disabled option | unit | `npx vitest run src/__tests__/screen-printer.test.jsx -t "empty ports"` | ✅ screen-printer.test.jsx | ✅ green |
| 05-Wave0-03 | Wave 0 stubs | 0 | PRNT-01 | save success → chip-sage | unit | `npx vitest run src/__tests__/screen-printer.test.jsx -t "save success"` | ✅ screen-printer.test.jsx | ✅ green |
| 05-Wave0-04 | Wave 0 stubs | 0 | PRNT-01 | save failure → chip-red, no persist | unit | `npx vitest run src/__tests__/screen-printer.test.jsx -t "save failure"` | ✅ screen-printer.test.jsx | ✅ green |
| 05-Wave0-05 | Wave 0 stubs | 0 | PRNT-02 | test print invokes command | unit | `npx vitest run src/__tests__/screen-printer.test.jsx -t "PRNT-02"` | ✅ screen-printer.test.jsx | ✅ green |
| 05-Wave0-06 | Wave 0 stubs | 0 | PRNT-02 | test print disabled when no config | unit | `npx vitest run src/__tests__/screen-printer.test.jsx -t "test print disabled"` | ✅ screen-printer.test.jsx | ✅ green |
| 05-Wave0-07 | Wave 0 stubs | 0 | PRNT-03 | onPrint invokes print_receipt | unit | `npx vitest run src/__tests__/print-receipt.test.jsx -t "PRNT-03"` | ✅ print-receipt.test.jsx | ✅ green |
| 05-Wave0-08 | Wave 0 stubs | 0 | PRNT-03 | no config → "not configured" toast | unit | `npx vitest run src/__tests__/print-receipt.test.jsx -t "not configured"` | ✅ print-receipt.test.jsx | ✅ green |
| 05-Wave0-09 | Wave 0 stubs | 0 | ACT-04 | Order Detail Print buttons call onPrint | unit | `npx vitest run src/__tests__/screen-detail.test.jsx -t "ACT-04"` | ✅ screen-detail.test.jsx | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `src/__tests__/screen-printer.test.jsx` — 7 tests covering PRNT-01 (5) and PRNT-02 (2) ✅
- [x] `src/__tests__/print-receipt.test.jsx` — 4 tests covering PRNT-03 ✅
- [x] `src/__tests__/screen-detail.test.jsx` — 2 tests covering ACT-04 print button wiring ✅

All test files mock `invoke` via `vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }))` — established pattern from Phase 3/4 tests.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Test Print produces physical output | PRNT-02 | Requires physical USB thermal printer — cannot automate in CI | Connect printer, open Printer Setup, click Test Print, verify a test slip prints (restaurant name, "Test Print", timestamp, ruler line) |
| Receipt prints correct content for a real order | PRNT-03 | Requires physical USB printer | From Order Detail, click Print, verify receipt shows order number, line items with modifiers, totals, bilingual footer, auto-cut |
| Romanian diacritics render correctly | PRNT-03 | Hardware code page varies | Verify ă, â, î, ș, ț display correctly on receipt; if not, confirm ASCII fallback (a, a, i, s, t) is used |
| Windows COM port enumeration | PRNT-01 | Requires Windows + printer | On Windows target, verify COM port (e.g., COM3) appears in dropdown |

---

## Validation Sign-Off

- [x] All tasks have automated verify
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 15s (full suite: ~2s, 166 tests)
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** 2026-04-29

---

## Validation Audit 2026-04-29

| Metric | Count |
|--------|-------|
| Gaps found | 9 |
| Resolved | 9 |
| Escalated | 0 |
| Full suite tests | 166 |
| Full suite files | 23 |
| Suite runtime | ~2s |
