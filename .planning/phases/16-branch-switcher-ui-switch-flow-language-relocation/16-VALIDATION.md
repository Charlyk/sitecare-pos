---
phase: 16
slug: branch-switcher-ui-switch-flow-language-relocation
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-07-23
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
| TBD | TBD | TBD | SWCH-01 | T-16-* / — | Selector renders in footer slot with name + "default" badge | unit (shell render) | `npx vitest run src/__tests__/shell.test.jsx` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | SWCH-02 | — | Single-branch tenant → read-only, no popover affordance (gate on `branches.length > 1`) | unit | `npx vitest run src/__tests__/shell.test.jsx` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | SWCH-03 | T-16-* | `client.me.branches.switch` fires; control disabled while pending; `currentBranch` unchanged until resolve (non-optimistic) | unit (mock SDK) | `npx vitest run src/__tests__/use-branches.test.js` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | SWCH-04 | — | Success toast fires at overlay release, not at mutation resolve | unit (fake timers) | `npx vitest run src/__tests__/app-branch-switch.test.jsx` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | SCOPE-03 | — | Cart reset on switch (remount key); open detail view exits to Orders | unit + integration | `npx vitest run src/__tests__/app-branch-switch.test.jsx` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | SCOPE-04 | T-16-* | Overlay blocks all screens while pending (no mutation lands mid-switch) | unit (overlay coverage/inert assertion) | `npx vitest run src/__tests__/app-branch-switch.test.jsx` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | LANG-01 | — | RO/EN pill absent from footer; Settings → Afișaj still switches `lang` (no regression) | unit (negative assertion) | `npx vitest run src/__tests__/shell.test.jsx` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/__tests__/use-branches.test.js` — new; `useBranchSwitch()` unit coverage (mirrors `use-order-actions.test.js` SDK-mock scaffold)
- [ ] `src/__tests__/shell.test.jsx` — new; footer-slot selector / popover / collapsed-chip / single-branch read-only / RO-EN-pill-absent coverage
- [ ] `src/__tests__/app-branch-switch.test.jsx` — new (or extend an existing `app.jsx` test file if one exists — confirm during planning); overlay / switch-phase-machine / cart-gate / neutral-landing integration coverage
- [ ] Framework install: **none** — Vitest, `@testing-library/react`, and existing mock scaffolding (`vi.mock('@tauri-apps/plugin-store', ...)`, `vi.mock('@charlyk/admin-client', ...)`) are present and reusable verbatim from `use-sse.test.js`.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Live switch against real multi-branch tenant: overlay bridges the real SSE reconnect with no false OfflineBanner flash | SWCH-03 / SCOPE-04 (D-08) | Requires the live SiteCare API + a real multi-branch account; SSE reconnect timing cannot be faithfully reproduced in a unit mock without encoding the assumption | Log in with a multi-branch account, switch branch, confirm one continuous overlay → success toast on the new branch, no offline flash |
| Single-branch-tenant regression: login → orders → KDS → POS shows no first-paint delay and no switcher affordance | SWCH-02 (SC4, standing v1.2 item) | The `enabled: !!client` / never-`!!branchId` first-paint guarantee is a timing property best confirmed against a real one-branch fixture | Log in with a one-branch account; confirm the footer shows a read-only branch label (no chevron) and orders paint immediately |
| D-09 bounded-timeout fallback: switch succeeds but new-branch SSE stays down → overlay releases at timeout, honest OfflineBanner takes over | SCOPE-04 (D-09) | Requires forcing a genuinely-down new-branch stream, hard to reproduce deterministically | Simulate/observe a new-branch stream that does not reconnect; confirm overlay releases at the bounded window, success toast fires, OfflineBanner appears |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
