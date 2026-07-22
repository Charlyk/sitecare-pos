---
phase: 13
slug: branch-state-launch-seeding-foundation
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: validated
nyquist_compliant: true
wave_0_complete: true
created: 2026-07-22
validated: 2026-07-22
---

# Phase 13 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | vitest.config.js |
| **Quick run command** | `npx vitest run src/__tests__/store.test.js src/__tests__/auth-token.test.jsx src/__tests__/shell.test.jsx src/__tests__/use-branches.test.js` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~1.5s (4 phase-13 files, 58 tests) · full suite ~a few seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd-verify-work`:** Full suite must be green (modulo 3 pre-existing, unrelated failures — see note below)
- **Max feedback latency:** ~2 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 13-01-01 | 01 | 1 | BSTATE-01 | T-13-01 | `currentBranch` never enters `partialize` (persisted shape stays the same 6 keys) — D-10 stale-trust guard | unit | `npx vitest run src/__tests__/store.test.js` | ✅ | ✅ green |
| 13-01-02 | 01 | 1 | BSTATE-01 | T-13-02 | `getMe()` seeds authUser+currentBranch before `coldStartBusy` releases; only a true 401 calls `expireSession()`, non-401 stays signed in with `currentBranch` null; focus-retry backstop re-seeds only while authed && null | unit | `npx vitest run src/__tests__/auth-token.test.jsx` | ✅ | ✅ green |
| 13-01-03 | 01 | 1 | BSTATE-01 | — | Sidebar `displayName` renders empty when `authUser` unresolved — never the hardcoded `'Eduard Albu'` literal (D-06) | unit | `npx vitest run src/__tests__/shell.test.jsx` | ✅ | ✅ green |
| 13-02-01 | 02 | 1 | BSTATE-02 | T-13-03 / T-13-04 | `useBranches` finite `staleTime` (30_000) + `refetchOnWindowFocus: true` (never pinned stale); `{data,error}` unwrap throws into TanStack Query's error state (no unhandled rejection) | unit | `npx vitest run src/__tests__/use-branches.test.js` | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

**Coverage detail (verified 2026-07-22 against test sources, all green):**

- **BSTATE-01** (store field, getMe seeding, displayName) — `store.test.js` (partialize excludes `currentBranch` + 6-key regression, D-10), `auth-token.test.jsx` (cold-start seed / 401-expire / non-401-stay-signed-in / signIn seed / signIn-failure-non-fatal / focus-retry-fires / focus-noop-when-set), `shell.test.jsx` (full-name / first-only / email-fallback / unresolved-empty / initials).
- **BSTATE-02** (useBranches hook) — `use-branches.test.js` (success / `{data,error}` throw / enabled:!!client off-when-null / finite-staleTime + focus-refetch / single-element + empty-list edges).

---

## Wave 0 Requirements

*Existing infrastructure covers all phase requirements.* No new framework install, no shared fixture stubs, and no MISSING references were needed — vitest was already the project harness and every task's tests were authored inline (TDD) during execution.

---

## Manual-Only Verifications

*All phase behaviors have automated verification.*

Every BSTATE-01 and BSTATE-02 behavior — including the UI-SPEC E2 "render nothing when unresolved" decision and the D-03 401/non-401 branches — is exercised by a passing unit test. No behavior in this phase required human judgment (all `human_judgment: false` in both SUMMARY coverage maps).

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references (none existed)
- [x] No watch-mode flags (all commands are `vitest run`)
- [x] Feedback latency < 3s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-07-22

---

## Validation Audit 2026-07-22

| Metric | Count |
|--------|-------|
| Gaps found | 0 |
| Resolved | 0 |
| Escalated | 0 |

**State A audit** (VALIDATION.md existed as an unfilled `draft` template). All 4 tasks across the 2 plans were cross-referenced against their test files: every requirement is **COVERED** by a green automated unit test (58/58 phase-13 tests pass). No auditor spawn was needed — no MISSING or PARTIAL gaps existed. Template promoted `draft → validated`, `nyquist_compliant: false → true`.

> **Note — 3 pre-existing, out-of-scope full-suite failures** (documented in both SUMMARYs, reproduced on the pre-phase baseline via `git stash`): `build-pipeline.test.js` (`createUpdaterArtifacts` / `tauri.conf.json` assertion) and `offline-buttons.test.jsx` (×2, missing `QueryClientProvider` wrapper). These predate Phase 13, touch no phase-13 file, and are logged to `deferred-items.md`. They do **not** affect Phase 13's Nyquist compliance.
