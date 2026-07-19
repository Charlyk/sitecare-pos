---
phase: 10
slug: filters-search
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: validated
nyquist_compliant: true
wave_0_complete: true
created: 2026-07-17
---

# Phase 10 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Promoted from the plan-phase seed skeleton by `/gsd-validate-phase` (invoked from Phase 12 Plan
> 04, Task 3, D-10) — reconstructed from `10-VERIFICATION.md`'s already-complete Per-Task
> evidence table plus `10-UAT.md` (both pre-existing, no re-verification needed; State A audit
> found zero gaps).

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest ^4.1.5 + @testing-library/react ^16.3.2 |
| **Config file** | `vitest.config.js` |
| **Quick run command** | `npx vitest run src/__tests__/history-utils.test.js src/__tests__/normalize-order.test.js src/__tests__/screen-orders.test.jsx src/__tests__/screen-detail.test.jsx src/__tests__/screen-history.test.jsx` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~3 seconds |

---

## Sampling Rate

- **After every task commit:** Run the quick run command above (5 phase-touched files)
- **After every plan wave:** Run `npx vitest run` (full suite)
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** ~3 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 10-01-01 | 01 | 1 | HIST-09 | — | N/A | unit | `npx vitest run src/__tests__/history-utils.test.js` | ✅ | ✅ green |
| 10-01-02 | 01 | 1 | HIST-07/HIST-08 | — | N/A | unit | `npx vitest run src/__tests__/history-utils.test.js` | ✅ | ✅ green |
| 10-01-03 | 01 | 1 | HIST-07/08/09 (i18n) | — | N/A | static (grep) | `grep -c "h_empty_filtered_title\|h_clear_filters" src/i18n.jsx` | ✅ | ✅ green |
| 10-02-01 | 02 | 1 | HIST-08 | — | N/A | unit | `npx vitest run src/__tests__/normalize-order.test.js` | ✅ | ✅ green |
| 10-02-02 | 02 | 1 | HIST-08 (F-02 regression) | — | N/A | integration | `npx vitest run src/__tests__/screen-orders.test.jsx src/__tests__/screen-detail.test.jsx` | ✅ | ✅ green |
| 10-03-01 | 03 | 2 | HIST-07/08/09 | — | N/A | integration | `npx vitest run src/__tests__/screen-history.test.jsx` | ✅ | ✅ green |
| 10-03-02 | 03 | 2 | HIST-07/08 (FilterBar) | — | N/A | integration | `npx vitest run src/__tests__/screen-history.test.jsx` | ✅ | ✅ green |
| 10-04-01 | 04 | 2 | HIST-07/08/09 (empty states) | — | N/A | integration | `npx vitest run src/__tests__/screen-history.test.jsx` | ✅ | ✅ green |
| 10-04-02 | 04 | 2 | HIST-07/08/09 (D-02/D-04/D-10/D-12/D-13/D-14/D-15) | — | N/A | integration | `npx vitest run src/__tests__/screen-history.test.jsx` | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

**Evidence:** `10-VERIFICATION.md` §Goal Achievement records 231/231 phase-touched tests passing
(5 files) and 444/447 full-suite passing (the 3 pre-existing v1.0 failures, unrelated — see
Phase 12's own Task 1 re-confirmation at 492/495 with the same 3 red). 28/30 must-haves truths
verified directly by automated test; the remaining 2 are the Manual-Only items below, both closed.

---

## Wave 0 Requirements

- [x] `src/history-utils.test.js` — pure-unit stubs for the diacritic-folding helper (HIST-09/D-11), status predicate (HIST-07), type predicate (HIST-08/D-08) — present, 100 tests
- [x] F-02 regression: dine-in filter matches `orderType: 'local'` orders after the `normalizeOrder` boundary fix (D-08) — present in `screen-orders.test.jsx`
- [x] ș/ț dual-encoding cases (comma-below U+0219/U+021B and cedilla U+015F/U+0163) for the folding helper — present in `history-utils.test.js`

All three Wave 0 targets from the seed skeleton were delivered by 10-01/10-02. No outstanding Wave 0 gaps.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions | Resolution |
|----------|-------------|------------|--------------------|------------|
| Two-row filter-bar wrap renders as designed at 1440×900 | HIST-07/08/D-07 | CSS flex-wrap point at a specific viewport is a rendered-layout fact; jsdom has no layout engine | Open History at 1440×900; confirm Period/Status/Type pill groups on row 1, search+Export wrap to a right-aligned row 2 | ✅ Closed — `10-UAT.md` test 1, result: pass (2026-07-18) |
| 250ms debounce feels responsive; clear is immediate | HIST-09/D-10 | Perceptual timing judgment; the mechanical timer is already automated (D-10 fake-timer test) but "feels right" is human-only | Type a burst; confirm one filter pass after ~250ms idle; clearing the box applies at once | ✅ Closed — `10-UAT.md` test 2, result: pass (2026-07-18) |

Both items were pre-flagged here at plan time, routed to `10-VERIFICATION.md`'s Human Verification
Required section, and closed with a passing result in `10-UAT.md` (2/2, 0 issues) on 2026-07-18.

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 5s (full suite ~3s)
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-07-19 (reconstructed from complete `10-VERIFICATION.md`/`10-UAT.md`
evidence during Phase 12 Plan 04, Task 3 — D-10; zero gaps found, no auditor spawn needed)

## Validation Audit 2026-07-19

| Metric | Count |
|--------|-------|
| Gaps found | 0 |
| Resolved | 0 (none needed) |
| Escalated | 0 |
