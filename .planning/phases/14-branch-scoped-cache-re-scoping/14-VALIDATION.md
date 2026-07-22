---
phase: 14
slug: branch-scoped-cache-re-scoping
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-07-22
---

# Phase 14 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.5 + `@testing-library/react` (already used by `use-orders.test.js`, `use-order-actions.test.js`) |
| **Config file** | `vitest.config.js` (repo root) |
| **Quick run command** | `npx vitest run src/__tests__/use-orders.test.js src/__tests__/use-order-actions.test.js src/__tests__/use-history-orders.test.js` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~15–30 seconds (full suite; 7+ shared files touched, high regression surface) |

**Test convention (verified against shipped tests):** Do NOT mock `../store.js`. Import the real `useAppStore` and seed branch state with `useAppStore.setState({ currentBranch: { id: 'branch-a', name, slug, isDefault, isActive } })` before `renderHook` — the exact pattern already shipped in `src/__tests__/auth-token.test.jsx:154`. Mock `@tauri-apps/plugin-store` and `../auth.jsx` only.

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run <touched-hook-test-file>` (fast, targeted)
- **After every plan wave:** Run `npx vitest run` (full suite — 7+ shared files, high regression surface)
- **Before `/gsd-verify-work`:** Full suite must be green, PLUS the manual `git grep` unscoped-key audit below
- **Max feedback latency:** ~30 seconds

**Phase-gate grep audit (Pitfalls' own recommended check):**
```
git grep "queryKey: \['orders'\]\|queryKey: \['order'\]\|queryKey: \['stats'\]\|queryKey: \['menu'\]\|queryKey: \['history-orders'\]\|queryKey: \['restaurant-settings'\]\|queryKey: \['delivery-areas'\]" src/
```
Must return **zero matches outside `use-sse.js`** (the one file deliberately left unscoped until Phase 15 — Pitfall 3 / accepted regression window).

---

## Per-Task Verification Map

| Task ID | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| SC1 — per-hook branch key | SCOPE-01 | — | Changing `currentBranch` in store yields a different query key → fresh fetch (cache miss) for each of the 7 hooks | unit | `npx vitest run src/__tests__/use-orders.test.js` (+ new per-hook files) | ❌ W0 | ⬜ pending |
| SC2 — sibling-branch untouched | SCOPE-01 | — | Exact branch-scoped `invalidateQueries` leaves a sibling branch's cached entry untouched (`qc.getQueryData(['orders','branch-b'])` unchanged after mutate) | unit | `npx vitest run src/__tests__/use-order-actions.test.js` | ❌ W0 | ⬜ pending |
| SC3 — err.code populated | SCOPE-01 | T-14 (info-disclosure, indirect) | Simulated branch-error response yields a populated `err.code` on the thrown `Error` | unit | `npx vitest run src/__tests__/data-unwrap-sdk-result.test.js` | ❌ W0 | ⬜ pending |
| SC4 — null-branch still fetches | SCOPE-01 | — | `client` present + `currentBranch: null` → `fetchStatus` is NOT `'idle'`; `enabled: !!client` only, never `!!branchId` | unit | `npx vitest run src/__tests__/use-orders.test.js` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/__tests__/use-order-detail.test.js` — new; covers `['order', branchId, id]` (SC1), no existing test file touches this hook
- [ ] `src/__tests__/use-stats.test.js` — new; covers `['stats', branchId]` (SC1)
- [ ] `src/__tests__/use-restaurant-settings.test.js` — new; covers `['restaurant-settings', branchId]` (SC1)
- [ ] `src/__tests__/use-delivery-areas.test.js` — new; covers `['delivery-areas', branchId]` (SC1)
- [ ] `src/__tests__/data-unwrap-sdk-result.test.js` — new; direct unit test of `unwrapSdkResult()` for SC3 (mock both `{error: 'BRANCH_INACTIVE'}` and `{error: {error: 'Branch is inactive'}}` shapes; assert `.code` populated in both)
- [ ] Sibling-branch-untouched assertion pattern — establish once in `use-order-actions.test.js` (single most important assertable behavior for SC2); not yet present anywhere in the suite
- [ ] Extend existing `use-orders.test.js`, `use-menu.js` coverage, and `use-history-orders.test.js` with branch-key + SC4 null-branch assertions

*Vitest + @testing-library/react already installed — no framework install needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Exact runtime string of `BRANCH_INACTIVE`/`BRANCH_ACCESS_REVOKED`/`NO_BRANCH_ACCESS` (short code vs. sentence) | SCOPE-01 (SC3 boundary) | Requires a live 403 branch-error response; not statically declared in SDK types (Assumption A1). NOT a Phase 14 blocker — `unwrapSdkResult()` is code-string-agnostic; flagged for Phase 15/17 | Trigger a real branch-access 403 against the live API once switching exists (Phase 16/17) and record the literal `error` string shape |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references (5 new test files + 1 shared assertion pattern)
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
