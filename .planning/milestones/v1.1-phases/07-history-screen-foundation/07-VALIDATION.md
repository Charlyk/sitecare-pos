---
phase: 7
slug: history-screen-foundation
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: validated
nyquist_compliant: true
wave_0_complete: true
created: 2026-07-17
validated: 2026-07-17
---

# Phase 7 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.1.5 (jsdom, globals enabled) |
| **Config file** | `vitest.config.js` (setupFiles: `./src/__tests__/setup.js`) |
| **Quick run command** | `npx vitest run src/__tests__/<file>.test.js` |
| **Full suite command** | `npx vitest run` |
| **Measured runtime** | ~2.6s full suite (30 test files, 260 tests as of Phase 7) |

> **Note:** `package.json` defines no `test` script — the suite is invoked directly via `npx vitest run`.
> Plans must use `npx vitest run`, never `npm test` (which would fail), and never `npx vitest`
> without `run` (watch mode hangs the executor).

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run src/__tests__/<file-under-test>.test.js`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 40 seconds (actual: ~3s)

---

## Per-Task Verification Map

> Verified 2026-07-17 against the shipped implementation. Every Phase 7 requirement has at least one
> green automated test. Plan/wave assignments follow ROADMAP.md.

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 07-01-T1/T2 | 01 | 1 | HIST-03 | T-07-01 | Local-day bucketing, never UTC slice | unit | `npx vitest run src/__tests__/history-utils.test.js` | ✅ | ✅ green (27) |
| 07-01-T3 | 01 | 1 | HIST-02 | T-07-02 | Additive `??` fallback preserves `0` | unit | `npx vitest run src/__tests__/normalize-order.test.js` | ✅ | ✅ green (6) |
| 07-02-T2 | 02 | 1 | HIST-01 | T-07-07 | `historyOrder` excluded from partialize | unit | `npx vitest run src/__tests__/store.test.js` | ✅ | ✅ green |
| 07-02-T3 | 02 | 1 | HIST-01 | T-07-06 | History nav hidden for kitchen role | unit | `npx vitest run src/__tests__/shell.test.jsx` | ✅ | ✅ green (6) |
| 07-03-T1/T2 | 03 | 2 | HIST-02, HIST-03 | T-07-08 | `['history-orders']` key never collides with SSE `['orders']` | unit | `npx vitest run src/__tests__/use-history-orders.test.js` | ✅ | ✅ green (11) |
| 07-05-T1/T2 | 05 | 2 | HIST-05 | — | `readOnly` hides all mutating controls unconditionally | unit | `npx vitest run src/__tests__/screen-detail.test.jsx` | ✅ | ✅ green (6 readOnly) |
| 07-04-T1/T2/T3 | 04 | 3 | HIST-05, HIST-13 | T-07-10 | Error state renders static copy, never `error.message` | unit | `npx vitest run src/__tests__/screen-history.test.jsx` | ✅ | ✅ green (4 states) |
| 07-06-T1/T2 | 06 | 4 | HIST-01, HIST-05 | T-07-20 | Rehydrate backstop prevents blank detail route | unit | `npx vitest run src/__tests__/app-history-route.test.jsx` | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

**Requirement coverage:** HIST-01 ✅ · HIST-02 ✅ · HIST-03 ✅ · HIST-05 ✅ · HIST-13 ✅ — 5/5 COVERED.

**Phase 7 suite result (2026-07-17):** 8 files, 89 tests, all passing.

---

## Wave 0 Requirements

- [x] `src/__tests__/history-utils.test.js` — HIST-03: `getLast30DaysRange`, `groupOrdersByDay`,
      `computeSummary`, `deriveDisplayStatus`, `filterFinishedOrders` (27 tests, incl. local-midnight boundary)
- [x] `src/__tests__/use-history-orders.test.js` — HIST-02: hook calls
      `client.admin.orders.list({ query: { from, to } })` (11 tests, incl. empty/null/missing + error rethrow)
- [x] `src/__tests__/screen-history.test.jsx` — HIST-05/HIST-13: loading / error / empty / populated
      render states
- [x] `src/__tests__/shell.test.jsx` — HIST-01: sidebar History item renders and dispatches
      `setScreen('history')` (6 tests, incl. kitchen-role absence)

*All Wave 0 files were created during execution and are green. Existing infrastructure (vitest + jsdom
+ setup.js) covered the framework need — no install was required.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions | Result |
|----------|-------------|------------|-------------------|--------|
| Day-boundary correctness for Romanian orders | HIST-03 | The server's interpretation of `from`/`to` (full ISO instant vs. truncated UTC calendar day) is not determinable without live API access; a mocked test would encode the assumption, not verify it | Open History against the live API. Find an order placed shortly after local midnight (00:00–03:00 Romanian time). Confirm it appears under its Romanian calendar day, not the previous UTC day. | ✅ **Resolved 2026-07-17** (Plan 07-06 Task 3, human verification): orders land under their correct Romanian calendar day; oldest day header ~30 days back |
| `AdminOrder.total` units (cents vs. RON) | HIST-03 | Day-header revenue subtotals are off by 100× if the unit assumption is wrong; only checkable against real data | Open History, pick one order, compare its displayed day-subtotal against the same day's revenue in the SiteCare admin dashboard. | ✅ **Resolved 2026-07-17** (Plan 07-06 Task 3, human verification): `total` is denominated in RON, not cents — no `normalizeOrder` change needed |
| Large result set behavior (>500 orders) | HIST-02 | Requires a real wide-range query against production-scale data | Select a 30-day range known to exceed 500 orders. Confirm the documented warn/limit threshold behaves as specified and the screen stays responsive. | ⬜ **Open** — not exercised during Phase 7; carry into the next phase that touches paging/period control |
| D-14 filter-bar visual treatment | HIST-05 | Pixel-fidelity claim against the design prototype (CLAUDE.md pixel-perfect-port rule); automated tests confirm inertness but not exact styling | Open History in the running app. Confirm the filter bar renders at final visual size, dimmed, with the "30 days" pill as the sole full-opacity exception. | ⬜ **Open** — flagged `human_judgment: true` in 07-04-SUMMARY.md coverage D5 |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags (`npx vitest run`, never bare `npx vitest`)
- [x] Feedback latency < 40s (~3s actual)
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** validated 2026-07-17

---

## Validation Audit 2026-07-17

| Metric | Count |
|--------|-------|
| Requirements audited | 5 |
| COVERED | 5 |
| Gaps found | 0 |
| Resolved | 0 (none needed) |
| Escalated | 0 |
| Manual-only (open) | 2 |
| Manual-only (resolved) | 2 |

**Findings:**

- All four Wave 0 test files were created during execution and are green; two additional files
  (`normalize-order.test.js`, `app-history-route.test.jsx`) extended coverage beyond the seeded plan.
- No auditor spawn was required — zero MISSING or PARTIAL requirements.
- **Out-of-scope:** the full suite shows 3 pre-existing failures unrelated to Phase 7
  (`build-pipeline.test.js` ×1, `offline-buttons.test.jsx` ×2 — missing `QueryClientProvider` wrapper).
  Documented in `deferred-items.md`; they predate this phase and are not Phase 7 validation gaps.
