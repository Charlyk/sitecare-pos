---
phase: 16
slug: branch-switcher-ui-switch-flow-language-relocation
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: validated
nyquist_compliant: true
wave_0_complete: true
created: 2026-07-23
validated: 2026-07-24
---

# Phase 16 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Seeded from `16-RESEARCH.md` → Validation Architecture. The planner expands the
> Per-Task Verification Map with concrete task IDs during planning.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest (already configured; confirmed via `src/__tests__/use-sse.test.js`, `src/__tests__/use-order-actions.test.js`, `src/__tests__/cancel-dialog.test.jsx`, `src/__tests__/offline-banner.test.jsx`) |
| **Config file** | existing `vitest.config.js` at repo root (unchanged by this phase) |
| **Quick run command** | `npx vitest run <changed-test-file>` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~15–30 seconds (full suite) |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run <changed-test-file>`
- **After every plan wave:** Run `npx vitest run src/__tests__/`
- **Before `/gsd-verify-work`:** Full suite must be green (`npx vitest run`)
- **Max feedback latency:** ~30 seconds

---

## Per-Task Verification Map

> Requirement-level seed from RESEARCH. Planner rewrites `Task ID` / `Plan` / `Wave` /
> `Threat Ref` columns with concrete values once tasks are decomposed.

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| T1–T2 | 16-02 (SWCH-01 badge) / 16-01 (slot) | W2 / W1 | SWCH-01 | — | Selector renders in footer slot with name + "default" badge | unit (shell render) | `npx vitest run src/__tests__/shell.test.jsx` | ✅ | ✅ green |
| T1 | 16-02 | W2 | SWCH-02 | — | Single-branch tenant → read-only, no popover affordance (gate `canOpenBranchPopover`, never `!!currentBranch`) | unit | `npx vitest run src/__tests__/shell.test.jsx` | ✅ | ✅ green |
| T1–T2 | 16-01 | W1 | SWCH-03 | — | `client.me.branches.switch` fires; overlay blocks while pending; `currentBranch` unchanged until resolve (non-optimistic, `setCurrentBranch` only in `onSuccess`) | unit (mock SDK) | `npx vitest run src/__tests__/use-branches.test.js` | ✅ | ✅ green |
| T1 | 16-01 | W1 | SWCH-04 | — | Success toast fires at overlay release, not at mutation resolve; rejected switch → single generic error toast, no branch change | unit + integration (fake timers) | `npx vitest run src/__tests__/app-branch-switch.test.jsx` | ✅ | ✅ green |
| T1–T2 | 16-03 | W2 | SCOPE-03 | — | Cart-discard confirm gate (non-empty POS cart); cart reset on switch (remount `key={currentBranch?.id}`); open detail view exits to Orders (neutral landing) | integration | `npx vitest run src/__tests__/app-branch-switch.test.jsx` | ✅ | ✅ green |
| T1 | 16-01 (overlay) / 16-03 (bounded-timeout completeness) | W1 / W2 | SCOPE-04 | — | Overlay blocks all screens for the full pending+bridging window incl. bounded ~6s timeout; releases exactly once (no double toast on later reconnect) | integration (fake timers) | `npx vitest run src/__tests__/app-branch-switch.test.jsx` | ✅ | ✅ green |
| T1–T2 | 16-02 (assertion) / 16-01 (removal) | W2 / W1 | LANG-01 | — | RO/EN pill absent from footer; Settings → Afișaj still switches `lang` (no regression) | unit (negative assertion) | `npx vitest run src/__tests__/shell.test.jsx` | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*
*Wave map: W1 = Plan 16-01 tracer (SWCH-01 slot / SWCH-03 / SWCH-04 / SCOPE-04 overlay / LANG-01 removal); W2 = Plans 16-02 (selector polish, SWCH-01/02/LANG-01) + 16-03 (switch-flow safety, SCOPE-03/04) parallel. All 44 phase-scoped tests confirmed green `npx vitest run` on 2026-07-23.*

---

## Wave 0 Requirements

- [x] `src/__tests__/use-branches.test.js` — extended (16-01 T2); `useBranchSwitch()` unit coverage — SDK call-shape, non-optimistic ordering proof, error-path proof
- [x] `src/__tests__/shell.test.jsx` — extended (16-01 T1 mock, 16-02 T2 blocks); footer-slot selector / default badge / popover loading-error backstops / collapsed-chip / single-branch read-only / RO-EN-pill-absent coverage
- [x] `src/__tests__/app-branch-switch.test.jsx` — new (16-01 T1, extended 16-03 T2); overlay / switch-phase-machine / cart-gate / neutral-landing / POS-remount / bounded-timeout integration coverage
- [x] Framework install: **none** — Vitest, `@testing-library/react`, and existing mock scaffolding (`vi.mock('@tauri-apps/plugin-store', ...)`, `vi.mock('@charlyk/admin-client', ...)`) reused verbatim; no new dependencies added this phase.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Live switch against real multi-branch tenant: overlay bridges the real SSE reconnect with no false OfflineBanner flash | SWCH-03 / SCOPE-04 (D-08) | Requires the live SiteCare API + a real multi-branch account; SSE reconnect timing cannot be faithfully reproduced in a unit mock without encoding the assumption | Log in with a multi-branch account, switch branch, confirm one continuous overlay → success toast on the new branch, no offline flash |
| Single-branch-tenant regression: login → orders → KDS → POS shows no first-paint delay and no switcher affordance | SWCH-02 (SC4, standing v1.2 item) | The `enabled: !!client` / never-`!!branchId` first-paint guarantee is a timing property best confirmed against a real one-branch fixture | Log in with a one-branch account; confirm the footer shows a read-only branch label (no chevron) and orders paint immediately |
| D-09 bounded-timeout fallback: switch succeeds but new-branch SSE stays down → overlay releases at timeout, honest OfflineBanner takes over | SCOPE-04 (D-09) | Requires forcing a genuinely-down new-branch stream, hard to reproduce deterministically | Simulate/observe a new-branch stream that does not reconnect; confirm overlay releases at the bounded window, success toast fires, OfflineBanner appears |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references — no MISSING references; all 7 requirements COVERED
- [x] No watch-mode flags
- [x] Feedback latency < 30s (phase-scoped suite runs in ~1.3s)
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** validated 2026-07-23 — all 7 requirements automated & green; 3 manual-only items retained by design (live-API/pixel-fidelity).

---

## Validation Audit 2026-07-23

Retroactive audit of the completed phase (State A — VALIDATION.md existed as an un-updated post-plan scaffold). All Per-Task Verification Map rows were `TBD`/`⬜ pending`; the phase had in fact shipped with full automated coverage (confirmed by 16-01/16-02/16-03 SUMMARY `coverage:` sections and 16-VERIFICATION.md). No tests were generated — every requirement was already COVERED by a green test. This audit reconciled the map to concrete task/plan/wave values and green statuses, and re-ran the suite to confirm.

| Metric | Count |
|--------|-------|
| Gaps found | 0 |
| Resolved | 0 |
| Escalated | 0 |
| Manual-only (by design) | 3 |

**Re-run confirmation:** `npx vitest run src/__tests__/use-branches.test.js src/__tests__/shell.test.jsx src/__tests__/app-branch-switch.test.jsx` → 3 files, 44/44 tests pass (2026-07-23).

---

## Validation Audit 2026-07-24

Re-audit of the completed phase (State A — VALIDATION.md already `validated` / `nyquist_compliant: true`). Re-derived the requirement→task→test map independently rather than trusting the prior audit: confirmed all three phase test files exist on disk and that each of the 7 phase requirements resolves to a concrete, requirement-tagged, green test block (SWCH-01/SWCH-02/LANG-01 in `shell.test.jsx`; SWCH-03/SWCH-04 in `use-branches.test.js`; SCOPE-03/SCOPE-04 in `app-branch-switch.test.jsx`). No gaps found; no tests generated; no auditor spawn required. The 3 Manual-Only items remain manual by design (live multi-branch API + pixel fidelity).

| Metric | Count |
|--------|-------|
| Gaps found | 0 |
| Resolved | 0 |
| Escalated | 0 |
| Manual-only (by design) | 3 |

**Re-run confirmation:** `npx vitest run src/__tests__/use-branches.test.js src/__tests__/shell.test.jsx src/__tests__/app-branch-switch.test.jsx` → 3 files, **65/65** tests pass (2026-07-24). The count rose from 44 → 65 because `use-branches.test.js` and `app-branch-switch.test.jsx` gained Phase 17 coverage in the same files; every phase-16 requirement block remains present and green.
