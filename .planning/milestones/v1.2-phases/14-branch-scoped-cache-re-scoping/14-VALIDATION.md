---
phase: 14
slug: branch-scoped-cache-re-scoping
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: validated
nyquist_compliant: true
wave_0_complete: true
created: 2026-07-22
validated: 2026-07-23
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
| SC1 — per-hook branch key | SCOPE-01 | — | Changing `currentBranch` in store yields a different query key → fresh fetch (cache miss) for each of the 7 hooks | unit | `npx vitest run src/__tests__/use-order-detail.test.js` (+ 6 sibling per-hook files) | ✅ | ✅ green |
| SC2 — sibling-branch untouched | SCOPE-01 | — | Exact branch-scoped `invalidateQueries` leaves a sibling branch's cached entry untouched (`qc.getQueryData(['orders','branch-b'])` unchanged after mutate) | unit | `npx vitest run src/__tests__/use-order-actions.test.js` | ✅ | ✅ green |
| SC3 — err.code populated | SCOPE-01 | T-14 (info-disclosure, indirect) | Simulated branch-error response yields a populated `err.code` on the thrown `Error` (both object-error and bare-string shapes; `use-history-orders.js` closed by fast-follow ae08341) | unit | `npx vitest run src/__tests__/data-unwrap-sdk-result.test.js src/__tests__/use-history-orders.test.js` | ✅ | ✅ green |
| SC4 — null-branch still fetches | SCOPE-01 | — | `client` present + `currentBranch: null` → `fetchStatus` is NOT `'idle'`; `enabled: !!client` only, never `!!branchId` | unit | `npx vitest run src/__tests__/use-orders.test.js` | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `src/__tests__/use-order-detail.test.js` — covers `['order', branchId, id]` (SC1) ✅ green
- [x] `src/__tests__/use-stats.test.js` — covers `['stats', branchId]` (SC1) + SC4 null-branch ✅ green
- [x] `src/__tests__/use-restaurant-settings.test.js` — covers `['restaurant-settings', branchId]` (SC1) ✅ green
- [x] `src/__tests__/use-delivery-areas.test.js` — covers `['delivery-areas', branchId]` (SC1) ✅ green
- [x] `src/__tests__/data-unwrap-sdk-result.test.js` — direct unit test of `unwrapSdkResult()` for SC3; both `{error: 'BRANCH_INACTIVE'}` and object-error shapes assert `.code` populated ✅ green (3/3)
- [x] Sibling-branch-untouched assertion pattern — established in `use-order-actions.test.js:117,131` (SC2); mutates branch-a, asserts `['orders','branch-b']` unchanged ✅ green
- [x] Extended `use-orders.test.js`, `use-menu.test.js`, and `use-history-orders.test.js` with branch-key + SC4 null-branch assertions (`use-history-orders.test.js:201-224` also carries SC3 `err.code` on both shapes) ✅ green

*Vitest + @testing-library/react already installed — no framework install needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Exact runtime string of `BRANCH_INACTIVE`/`BRANCH_ACCESS_REVOKED`/`NO_BRANCH_ACCESS` (short code vs. sentence) | SCOPE-01 (SC3 boundary) | Requires a live 403 branch-error response; not statically declared in SDK types (Assumption A1). NOT a Phase 14 blocker — `unwrapSdkResult()` is code-string-agnostic; flagged for Phase 15/17 | Trigger a real branch-access 403 against the live API once switching exists (Phase 16/17) and record the literal `error` string shape |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references (5 new test files + 1 shared assertion pattern) — all present & green
- [x] No watch-mode flags
- [x] Feedback latency < 30s (9-file targeted run: 1.9s)
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** validated 2026-07-23 — all 4 SC tasks COVERED, 0 gaps

---

## Validation Audit 2026-07-23

State A audit of the plan-seeded VALIDATION.md against shipped artifacts. All 4 SC tasks were seeded as `⬜ pending / ❌ MISSING`, but the tests were authored during execution (confirmed by 14-VERIFICATION.md, status: passed 4/4) and are present and green. No auditor spawn needed — zero gaps.

| Metric | Count |
|--------|-------|
| Gaps found | 0 |
| Resolved | 0 |
| Escalated | 0 |

**Evidence (targeted run, 1.9s):** `npx vitest run` over the 9 phase-14 test files → **9 files / 51 tests passing**.

- SC1 — 7 hook test files assert `branch-a` as the first key segment after the resource name (spot: `use-order-detail.test.js:60`).
- SC2 — `use-order-actions.test.js:117,131`: seeds `['orders','branch-b']`, mutates branch-a, asserts sibling untouched.
- SC3 — `data-unwrap-sdk-result.test.js` (3/3) + `use-history-orders.test.js:201-224` assert `.code` on both object-error (`BRANCH_INACTIVE`) and bare-string (`BRANCH_ACCESS_REVOKED`) shapes.
- SC4 — `use-orders.test.js:109`, `use-stats.test.js:74` (et al.) assert `fetchStatus !== 'idle'` with `currentBranch: null` + present client.

**Phase-gate grep audit:** `git grep` for unscoped `queryKey: ['<resource>']` → **zero matches** (`use-sse.js` re-keyed in Phase 15; the Manual-Only note below is now historical).

The single Manual-Only item (literal runtime string of branch-error codes) remains correctly deferred — `unwrapSdkResult()` is code-string-agnostic, so it is not a Phase 14 blocker.
