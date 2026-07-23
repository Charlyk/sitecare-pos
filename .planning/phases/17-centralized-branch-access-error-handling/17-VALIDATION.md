---
phase: 17
slug: centralized-branch-access-error-handling
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: validated
nyquist_compliant: true
wave_0_complete: true
created: 2026-07-23
validated: 2026-07-24
---

# Phase 17 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Reconstructed retroactively (State A — VALIDATION.md was an un-filled post-plan scaffold)
> from the six 17-0N-SUMMARY `coverage:` blocks and a live re-run of the suite.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.x (already configured; confirmed via the existing `src/__tests__/*.test.js(x)` suite) |
| **Config file** | existing `vitest.config.js` at repo root (unchanged by this phase) |
| **Quick run command** | `npx vitest run <changed-test-file>` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~15–30 seconds (full suite); phase-scoped 8-file subset ~1.6s |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run <changed-test-file>` (all phase-17 tasks were TDD RED→GREEN)
- **After every plan wave:** Run `npx vitest run src/__tests__/`
- **Before `/gsd-verify-work`:** Full suite must be green (`npx vitest run`)
- **Max feedback latency:** ~30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| T1–T2 | 17-01 | W1 | BERR-01 | — | Central `handleBranchError` dispatch: a `BRANCH_ACCESS_REVOKED` 403 routed via global QueryCache/MutationCache `onError` → exactly one toast, `branchSwitcherForceOpen=true`, `['branches']` invalidated; guard-first early-return for non-branch codes; `<branch>` interpolation (`err.branchName` → `currentBranch?.name` → generic fallback) | unit | `npx vitest run src/__tests__/use-branches.test.js src/__tests__/shell.test.jsx` | ✅ | ✅ green |
| T1 | 17-02 | W1 | BERR-01 | T-17-SC (N/A) | Provisional `err.code` matcher locked by a regression test against the ASSUMED `{ error: '<CODE>' }` REST body — internal extraction→dispatch consistency proven; live-shape UNVERIFIED (WINDOWS.md #1) | unit | `npx vitest run src/__tests__/use-branches.test.js` | ✅ | ✅ green |
| T1–T2 | 17-03 | W2 | BERR-01, BERR-02 | — | All three `BRANCH_CODES` handled (INACTIVE/REVOKED share copy-mapped recovery, `NO_BRANCH_ACCESS` sets `noBranchAccess`); `fireSwitch.onError` trimmed behind `!BRANCH_CODES.includes` → exactly one toast (D-05), cleanup unconditional | unit | `npx vitest run src/__tests__/store.test.js src/__tests__/use-branches.test.js src/__tests__/app-branch-switch.test.jsx` | ✅ | ✅ green |
| T1–T2 | 17-04 | W3 | BERR-03 | — | `NoBranchAccessBlock` full-viewport gate supersedes `<Shell>`; non-optimistic Retry clears the flag + adopts branch ONLY on a confirmed non-null `getMe().selectedBranch`; null/throw is a fail-safe no-op | unit | `npx vitest run src/__tests__/app-branch-error.test.jsx` | ✅ | ✅ green |
| T1 | 17-05 | W3 | BERR-01 | — | SSE `onopen` branch-403 short-circuit: status-403 + `BRANCH_*` body → `handleBranchError` + return (no throw, stops `fetchEventSource` retry); every other non-2xx path unchanged; `extractBranchCodeFromSseBody` never throws | unit | `npx vitest run src/__tests__/use-sse.test.js` | ✅ | ✅ green |
| T1 | 17-06 | W4 | BERR-04 | — | Window-focus always revalidates via `getMe()`: adopt+neutral-info-toast on a different valid branch, no-op on same branch, `setNoBranchAccess(true)` on null/403, `expireSession` on 401, silent-swallow otherwise; in-closure `inFlight` reentrancy guard | unit | `npx vitest run src/__tests__/auth.test.jsx src/__tests__/auth-token.test.jsx` | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*
*Wave map: W1 = 17-01 tracer (central choke point, BERR-01) + 17-02 matcher lock; W2 = 17-03 three-code recovery + no-double-toast (BERR-01/02); W3 = 17-04 block UI (BERR-03) + 17-05 SSE 403 routing (BERR-01) parallel; W4 = 17-06 focus revalidation (BERR-04). All phase-17 tests confirmed green `npx vitest run` on 2026-07-24 (159/159 across the 8 phase test files).*

---

## Wave 0 Requirements

- [x] `src/__tests__/use-branches.test.js` — extended (17-01/02/03); `handleBranchError` dispatch/guard/interpolation, provisional matcher lock, three-code recovery
- [x] `src/__tests__/store.test.js` — extended (17-03); `noBranchAccess` default/setter/partialize-exclusion
- [x] `src/__tests__/app-branch-switch.test.jsx` — extended (17-03); no-double-toast `fireSwitch` trim + unconditional cleanup
- [x] `src/__tests__/app-branch-error.test.jsx` — new (17-04); `NO_BRANCH_ACCESS` gate + non-optimistic Retry outcomes
- [x] `src/__tests__/use-sse.test.js` — extended (17-05); `extractBranchCodeFromSseBody` + D-08 onopen short-circuit
- [x] `src/__tests__/auth.test.jsx` / `auth-token.test.jsx` — extended (17-06); BERR-04 focus revalidation
- [x] `src/__tests__/shell.test.jsx` — extended (17-01); consume-once `branchSwitcherForceOpen` reopen
- [x] Framework install: **none** — Vitest + `@testing-library/react` + existing SDK/store mock scaffolding reused verbatim; zero new dependencies (confirmed in COVERAGE.md).

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Real live 403 body shape (REST + SSE) matches the assumed `{ error: '<CODE>' }` / bare-string envelope | BERR-01 | No reachable test tenant with a deactivable/revocable branch during execution; the assumed shape is UNVERIFIED (WINDOWS.md #1). If the real body differs, the matcher silently no-ops in production | Against the live `sitecare-orders-api` with a test account whose branch can be revoked/deactivated, trigger a real 403 on a branch query, a switch, and the SSE stream; confirm `err.code`/`extractBranchCodeFromSseBody` yields a `BRANCH_CODES` member and recovery fires |
| Concurrent-error convergence: a burst of simultaneously-inflight branch-scoped 403s converges to a single visible recovery, not a stack of N toasts | BERR-01 | `handleBranchError` has no de-dup guard; UI-SPEC E2-toast marks the zero-one-many row a 🧪 backstop (WINDOWS.md #2) | Force several branch-scoped queries to reject with a `BRANCH_*` code in the same tick (multi-tab / concurrent refetch); confirm the recovery reads as one converged state, or add a dedup guard |
| Visual/interaction fidelity: `NoBranchAccessBlock` layout, Retry spinner-on-primary-fill color, toast sentence naturalness, popover reopen | BERR-01/03 | Pixel/interaction fidelity per 17-UI-SPEC.md backstops requires a human looking at the running app; automated DOM assertions cover structure/behavior only | Run the app, trip each 403 path, confirm the block, toasts, and reopened popover match the approved UI-SPEC |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references — no MISSING references; all 4 requirements COVERED
- [x] No watch-mode flags
- [x] Feedback latency < 30s (phase-scoped 8-file subset runs in ~1.6s)
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** validated 2026-07-24 — all 4 requirements (BERR-01/02/03/04) automated & green; 3 manual-only/backstop items retained by design (unverified live 403 shape, concurrent-error dedup, pixel fidelity), all tracked in `.planning/WINDOWS.md`.

---

## Validation Audit 2026-07-24

Retroactive audit of the completed phase (State A — VALIDATION.md existed only as an un-filled post-plan scaffold: all `{...}` placeholders, `status: draft`, `nyquist_compliant: false`). The phase had in fact shipped with full automated coverage across six TDD plans (confirmed by the 17-0N-SUMMARY `coverage:` blocks and 17-VERIFICATION.md). The requirement→plan→test map was independently reconstructed rather than trusting the SUMMARY prose: all 8 phase test files confirmed present on disk, and each of the 4 BERR requirements resolves to a concrete, requirement-tagged, green test block. No tests were generated — every requirement was already COVERED by a green test. The 3 manual-only items are backstops by design (not automatable without live-API access or a human visual pass) and are already tracked as open ledger entries in `.planning/WINDOWS.md`.

| Metric | Count |
|--------|-------|
| Gaps found | 0 |
| Resolved | 0 |
| Escalated | 0 |
| Manual-only (by design) | 3 |

**Re-run confirmation:** `npx vitest run` over the 8 phase test files (`use-branches`, `shell`, `store`, `app-branch-switch`, `app-branch-error`, `use-sse`, `auth`, `auth-token`) → 8 files, **159/159** tests pass (2026-07-24). Note: `nyquist_compliant: true` reflects that all four in-scope requirements have green automated verification; the unverified-live-403-shape risk (WINDOWS.md #1) is a live-API confirmation item retained as manual-only, not an automated-coverage gap.
