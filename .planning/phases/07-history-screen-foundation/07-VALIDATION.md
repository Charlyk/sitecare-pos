---
phase: 7
slug: history-screen-foundation
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-07-17
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
| **Estimated runtime** | ~20–40 seconds (20 existing test files, 166 tests as of Phase 5) |

> **Note:** `package.json` defines no `test` script — the suite is invoked directly via `npx vitest run`.
> Plans must use `npx vitest run`, never `npm test` (which would fail), and never `npx vitest`
> without `run` (watch mode hangs the executor).

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run src/__tests__/<file-under-test>.test.js`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 40 seconds

---

## Per-Task Verification Map

> Task IDs are filled in by the planner. This map seeds the required coverage shape:
> every pure function from RESEARCH.md's Validation Architecture gets isolated unit tests;
> the screen gets a render-level test for each of its four states.

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| TBD | 01 | 1 | HIST-13 | — | N/A | unit | `npx vitest run src/__tests__/store.test.js` | ✅ | ⬜ pending |
| TBD | 01 | 1 | HIST-01 | — | N/A | unit | `npx vitest run src/__tests__/shell.test.jsx` | ❌ W0 | ⬜ pending |
| TBD | 02 | 1 | HIST-03 | — | N/A | unit | `npx vitest run src/__tests__/history-utils.test.js` | ❌ W0 | ⬜ pending |
| TBD | 02 | 1 | HIST-02 | — | N/A | unit | `npx vitest run src/__tests__/use-history-orders.test.js` | ❌ W0 | ⬜ pending |
| TBD | 03 | 2 | HIST-05 | — | N/A | unit | `npx vitest run src/__tests__/screen-history.test.jsx` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/__tests__/history-utils.test.js` — stubs for HIST-03: `getLast30DaysRange`, `groupOrdersByDay`,
      `computeSummary`, `deriveDisplayStatus` (pure functions — no mocking needed)
- [ ] `src/__tests__/use-history-orders.test.js` — stubs for HIST-02: hook calls
      `client.admin.orders.list({ query: { from, to } })`; follow the existing
      `src/__tests__/use-orders.test.js` mocking pattern
- [ ] `src/__tests__/screen-history.test.jsx` — stubs for HIST-05: loading / error / empty / populated
      render states; follow the existing `src/__tests__/screen-orders.test.jsx` pattern
- [ ] `src/__tests__/shell.test.jsx` — stubs for HIST-01: sidebar History item renders and dispatches
      `setScreen('history')` (create only if no existing shell/nav coverage is found)

*Existing infrastructure (vitest + jsdom + setup.js) covers the framework need — no install required.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Day-boundary correctness for Romanian orders | HIST-03 | RESEARCH.md open question — the server's interpretation of `from`/`to` (full ISO instant vs. truncated UTC calendar day) is not determinable without live API access; a mocked test would encode the assumption, not verify it | Open History against the live API. Find an order placed shortly after local midnight (00:00–03:00 Romanian time). Confirm it appears under its Romanian calendar day, not the previous UTC day. |
| `AdminOrder.total` units (cents vs. RON) | HIST-03 | RESEARCH.md open question — day-header revenue subtotals are off by 100× if the unit assumption is wrong; only checkable against real data | Open History, pick one order, compare its displayed day-subtotal against the same day's revenue in the SiteCare admin dashboard. |
| Large result set behavior (>500 orders) | HIST-02 | Requires a real wide-range query against production-scale data | Select a 30-day range known to exceed 500 orders. Confirm the documented warn/limit threshold behaves as specified and the screen stays responsive. |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags (`npx vitest run`, never bare `npx vitest`)
- [ ] Feedback latency < 40s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
