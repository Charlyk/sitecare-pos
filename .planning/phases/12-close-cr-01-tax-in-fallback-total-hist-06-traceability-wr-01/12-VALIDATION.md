---
phase: 12
slug: close-cr-01-tax-in-fallback-total-hist-06-traceability-wr-01
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-07-19
---

# Phase 12 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Seeded from `12-RESEARCH.md` § Validation Architecture. No formal REQ-IDs apply (tech-debt
> closeout); mapping is by decision ID (D-01…D-10). This phase is verification-heavy — the only
> net-new automated coverage is for the D-01/D-03 store lift and the D-06 fallback-total regression.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest ^4.1.5 + @testing-library/react ^16.3.2 (already configured) |
| **Config file** | `vitest.config.js` |
| **Quick run command** | `npx vitest run src/__tests__/store.test.js src/__tests__/normalize-order.test.js src/__tests__/screen-history.test.jsx` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~3 seconds (quick subset ~2s; full suite ~3s) |

---

## Sampling Rate

- **After every task commit:** Run the quick-run command (subset of 3 files, ~2–3s)
- **After every plan wave:** Run `npx vitest run` (full suite)
- **Before `/gsd-verify-work`:** Full suite green except the 3 pre-existing v1.0 failures
- **Max feedback latency:** 5 seconds

> **Baseline:** full suite is `481/484` today. The 3 reds are pre-existing v1.0 failures
> (`build-pipeline.test.js` BILD-04, `offline-buttons.test.jsx` ×2 — [INFO], deferred). They are
> the ONLY acceptable red. New D-01/D-03/D-06 tests must land green and must not increase the red count.

---

## Per-Task Verification Map

| Item | Behavior | Test Type | Automated Command | File Exists | Status |
|------|----------|-----------|-------------------|-------------|--------|
| D-01/D-03 | `historySelection` preserved across `setScreen('history'\|'history-detail')`, reset for other targets; existing `selectedOrder`/`historyOrder` unconditional reset unchanged | unit | `npx vitest run src/__tests__/store.test.js` | ✅ add `describe` block | ⬜ pending |
| D-01/D-04 | `HistoryScreen` reads/writes `historySelection`; loading/error/empty/populated render, period switching, and WR-03 settled-period timing unregressed | component | `npx vitest run src/__tests__/screen-history.test.jsx` | ✅ mock MUST be updated first (Pitfall) | ⬜ pending |
| D-06 | `normalizeOrder` fallback total includes tax; percent discount `cRON`-converted (not 100× inflated) | unit | `npx vitest run src/__tests__/normalize-order.test.js` | ✅ add `describe` block | ⬜ pending |
| G-07-1 verify | `cargo check --lib` reports zero warnings | build check | `cd src-tauri && cargo check --lib` | N/A — confirmed clean | ⬜ pending |
| D-07 | WR-01 popover live-check — re-clicking open Custom pill closes it | manual | see Manual-Only Verifications | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

*Existing infrastructure covers all phase needs.* No new framework, config, or fixtures required.

- The only pre-work is updating the `useAppStore` mock in `src/__tests__/screen-history.test.jsx`
  (a fixed literal `{ lang, pushToast }`) so a new `historySelection` selector does not return
  `undefined` and break the ~40 existing tests. This is an in-task infra fix, not a Wave 0 install.

---

## Manual-Only Verifications

| Behavior | Decision | Why Manual | Test Instructions |
|----------|----------|------------|-------------------|
| Custom-pill popover closes on re-click (WR-01) | D-07 | Audit claimed it was "independently reproduced"; a live check closes the ambiguity even though code + 3 regression tests already prove it | Run the app, open History, click the **Custom** period pill to open the popover, then click the **Custom** pill again — the popover must close. |
| Return-from-detail continuity (D-01/D-02) end-to-end | D-01/D-02 | Full round-trip through the real router is a human-observable UX assertion beyond the component test | In the app: set a non-default period + status + type + search in History, open an order, click **Back** — the list must return with all four selections intact. Then leave to Orders and back to History — selections must be reset to defaults (D-03). |

---

## Validation Sign-Off

- [ ] All tasks have automated verify or a documented manual checkpoint
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references (none required here)
- [ ] No watch-mode flags (`vitest run`, not `vitest`)
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter (by `/gsd-validate-phase 12`)

**Approval:** pending
