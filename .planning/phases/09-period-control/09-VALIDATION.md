---
phase: 9
slug: period-control
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: validated
nyquist_compliant: true
wave_0_complete: true
created: 2026-07-17
---

# Phase 9 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest `^4.1.5` + `@testing-library/react` `^16.3.2` |
| **Config file** | existing project vitest config — unchanged by this phase |
| **Quick run command** | `npx vitest run src/__tests__/history-utils.test.js src/__tests__/use-history-orders.test.js src/__tests__/screen-history.test.jsx` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~8s quick · ~35s full |

---

## Sampling Rate

- **After every task commit:** Run the quick command (the three files this phase touches)
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** ~35 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 9-01-01 | 01 | 1 | HIST-04 | — | N/A — pure range arithmetic, no boundary crossed | unit | `npx vitest run src/__tests__/history-utils.test.js` | ✅ | ✅ green |
| 9-01-02 | 01 | 1 | HIST-04 | T-09-01 / T-09-02 | An inclusive span over 366 days is rejected before it can parameterize a fetch; a malformed date string is rejected as `'incomplete'` rather than converted | unit | `npx vitest run src/__tests__/history-utils.test.js -t "validateCustomRange"` | ✅ | ✅ green |
| 9-01-03 | 01 | 1 | HIST-04 | T-09-03 | The rendered period never names a range other than the one fetched — exclusive-`to` round-trip and locale-stable month names | unit | `npx vitest run src/__tests__/history-utils.test.js -t "formatDateRange"` | ✅ | ✅ green |
| 9-02-01 | 02 | 1 | HIST-04 | T-09-05 / T-09-06 | No locale renders a raw key name; no key shadows another | unit + scan | `npx vitest run` + the duplicate-key node scan in 09-02 Task 1 | ✅ | ✅ green |
| 9-02-02 | 02 | 1 | HIST-04 | — | N/A — additive stylesheet rule | scan | the `@keyframes spin` / `.spin` node check in 09-02 Task 2 | ✅ | ✅ green |
| 9-03-01 | 03 | 1 | HIST-04 | T-09-08 / T-09-09 / T-09-10 | The hook computes no range and cannot cause key instability; the `['history-orders', …]` cache root stays distinct from `['orders']`; `isPlaceholderData` is exposed so stale data is labelable | unit (hook) | `npx vitest run src/__tests__/use-history-orders.test.js` | ✅ | ✅ green |
| 9-03-02 | 03 | 1 | HIST-04 | T-09-08 | A stable caller-supplied range refetches zero times; A→B→A serves from cache, proving the key is the resolved range and nothing else | unit (hook) | `npx vitest run src/__tests__/use-history-orders.test.js -t "cache"` | ✅ | ✅ green |
| 9-04-01 | 04 | 2 | HIST-04 | T-09-13 / T-09-14 | The range resolves inside a `useMemo`, so no render-loop refetch is reachable; every Phase 10/11 control is provably still inert | integration | `npx vitest run src/__tests__/screen-history.test.jsx` | ✅ | ✅ green |
| 9-04-02 | 04 | 2 | HIST-04 | T-09-15 / T-09-16 | A failed switch discards placeholder rows rather than presenting them as the new period's result; the dimming gates on `isFetching`, so the D-05 contract cannot silently no-op | integration | `npx vitest run src/__tests__/screen-history.test.jsx` | ✅ | ✅ green |
| 9-04-03 | 04 | 2 | HIST-04 | T-09-12 | No tile sub-label or empty-state phrase can read `selectedPeriod` — a period label above another period's figures is unreachable from those components | integration | `npx vitest run src/__tests__/screen-history.test.jsx -t "settled"` | ✅ | ✅ green |
| 9-05-01 | 05 | 3 | HIST-04 | T-09-17 / T-09-18 / T-09-20 / T-09-21 | Apply is gated by the pure validator at render AND click time; dismissal never applies; both document listeners are cleaned up | integration | `npx vitest run src/__tests__/screen-history.test.jsx -t "popover"` | ✅ | ✅ green |
| 9-05-02 | 05 | 3 | HIST-04 | T-09-19 | The Custom pill's label and the resolved range read one source, so the pill cannot advertise a range that is not live | integration | `npx vitest run src/__tests__/screen-history.test.jsx` | ✅ | ✅ green |
| 9-05-03 | 05 | 3 | HIST-04 | T-09-17 (residual) / T-09-22 | Human: measure the 366-day worst case; confirm the native picker's real chrome; confirm the dimming reads as loading | manual | — see Manual-Only Verifications | n/a | ☑ manual (approved — 366-day timing unmeasured) |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky · ☑ manual (human-verified)*

---

## Wave 0 Requirements

*Existing infrastructure covers all phase requirements.* `src/__tests__/history-utils.test.js`,
`src/__tests__/use-history-orders.test.js`, and `src/__tests__/screen-history.test.jsx` all exist and
already establish the patterns this phase extends (fixed-clock pure-unit tests; a hoisted `vi.mock`
of `auth.jsx` with a mock SDK client; a wholesale mock of `useHistoryOrders` for screen tests). No
new test file, fixture, or framework install is needed.

One pre-existing test is **rewritten, not extended** — `use-history-orders.test.js:193-209` asserts
the frozen-at-mount behavior this phase removes (RESEARCH Pitfall 5). 09-03 Task 2 owns that rewrite
and updates all 12 zero-argument call sites in the file.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| The native `<input type="date">` renders a real OS calendar on the target macOS | HIST-04 (D-01) | RESEARCH Pitfall 3: WebKit ships the calendar affordance only from Safari 14.1 / macOS 11 Big Sur, and `tauri.conf.json` pins no `minimumSystemVersion` (Assumption A2). jsdom renders neither chrome, so a unit test would assert nothing about the real widget. D-01 accepted "browser-chrome-styled"; it did not accept "no calendar at all" | 09-05 checkpoint, step C6 — open the Interval popover and report whether a calendar opens or a bare text box does |
| The 366-day worst case does not visibly freeze the UI | HIST-04 (D-10) | Requires a live API and real data volume. `listAdminOrders` has no pagination and `P7 D-03` renders every row with no virtualization, so the range is the only bound. A mocked test would encode an assumed response size rather than measure the real one. This is the first measurement of `P7 D-03`'s deferred *"measure against real data before adding machinery"* | 09-05 checkpoint, step D12 — apply a full 366-day range, time it, and report whether the spinner kept animating |
| The dimmed-loading state reads as *loading*, not as *disabled* | HIST-04 (D-05) | A perception judgment on a screen that renders both conventions simultaneously (inert controls at 0.5 opacity, dimmed rows at 0.6). The opacity values are test-asserted; whether they *communicate* is not testable | 09-05 checkpoint, steps A2 and B5 — switch periods and report whether the dim reads as updating or as broken |
| Orders land under the correct Romanian calendar day for the new preset ranges | HIST-04 (D-04 boundaries) | Already RESOLVED for the 30-day range by 07-06's human verification against the live API; the Today and 7-day ranges use identical local-midnight arithmetic and are covered by fixed-clock unit tests. Re-confirmed opportunistically | 09-05 checkpoint, step A3 — confirm "Azi" shows only today's orders |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies — every code task has one; the sole exception is 09-05's blocking human checkpoint, which is manual by necessity (see Manual-Only Verifications)
- [x] Sampling continuity: no 3 consecutive tasks without automated verify — 11 of 12 code tasks carry an `<automated>` command; the longest gap is 1
- [x] Wave 0 covers all MISSING references — none; no `<automated>` in any plan references a nonexistent test file
- [x] No watch-mode flags — every command is `vitest run`
- [x] Feedback latency < 35s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** validated 2026-07-18 — all 11 automated tasks run green; the sole manual task (9-05-03) was human-approved during the 09-05 blocking checkpoint.

---

## Validation Audit 2026-07-18

Ran the three phase-9 test files as the audit sample — `history-utils.test.js`, `use-history-orders.test.js`, `screen-history.test.jsx` — plus each `-t`-filtered command in the Per-Task Map to confirm every targeted row resolves to real, passing tests (no filter matched zero tests).

| Metric | Count |
|--------|-------|
| Tasks audited | 12 |
| Automated — COVERED (green) | 11 |
| Manual — human-verified | 1 (9-05-03) |
| Gaps found | 0 |
| Resolved | 0 |
| Escalated | 0 |
| Tests run | 153 passed / 153 |

**Result:** Nyquist-compliant. No gaps; no new tests generated. `status` advanced draft → validated.

**Carried-forward (non-blocking):** 9-05-03's 366-day worst-case fetch timing (`P7 D-03`) was not itemized in the checkpoint's blanket "approved" reply. Not a validation gap — the 366-day cap guardrail is enforced and unit-tested — but the timing figure remains unmeasured for any future virtualization decision.
