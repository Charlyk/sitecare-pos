---
phase: 15
slug: sse-branch-aware-reconnect
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-07-22
---

# Phase 15 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest ^4.1.5 (`package.json` devDependencies) |
| **Config file** | `vitest.config.js` (repo root) |
| **Quick run command** | `npx vitest run src/__tests__/use-sse.test.js` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~a few seconds (single file); full suite ~seconds |

**Harness notes (from RESEARCH.md):** The existing 394-line `src/__tests__/use-sse.test.js` mocks `fetchEventSource` at module level (`vi.mock('@microsoft/fetch-event-source', () => ({ fetchEventSource: vi.fn() }))`), captures the `onopen`/`onmessage` callbacks from the mock's `mockImplementation`, and drives them via `act()`. Each test builds its own `QueryClient` + `QueryClientProvider` and pre-seeds cache with `queryClient.setQueryData(...)`. `vi.useFakeTimers()` / `vi.advanceTimersByTime()` covers the 100ms `snapshotDone` window (existing `KDS-04` tests). **No `vi.mock('./store.js')` exists yet** — the new `useAppStore` selector read needs a store-seeding mechanism; check a sibling hook test (e.g. `use-orders`) for the established `useAppStore`/`currentBranch` idiom before inventing one.

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run src/__tests__/use-sse.test.js`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd-verify-work`:** Full suite must be green **plus** the SC2 human/UAT checkpoint (D-07)
- **Max feedback latency:** ~10 seconds

---

## Per-Task Verification Map

> Seeded from RESEARCH.md → "Phase Requirements → Test Map". The planner refines Task IDs/plan numbers.

| Requirement | Behavior | Test Type | Automated Command | File Exists |
|-------------|----------|-----------|-------------------|-------------|
| SCOPE-02 (SC1) | Effect re-runs + `ctrl.abort()` called when `branchId` changes across a `renderHook` rerender; `isConnected` explicitly flips `false` at top of new effect run | unit | `npx vitest run src/__tests__/use-sse.test.js -t "reconnect"` | ❌ W0 |
| SCOPE-02 (SC1) | `fetchEventSource` called a second time with a fresh `AbortController` signal after a `branchId` change (`mock.calls.length === 2`, signals differ) | unit | same file | ❌ W0 |
| SCOPE-02 (SC3) | `snapshotDone.current` resets `false` on every effect run; a live `order_new` fired immediately after a branch-triggered reconnect does **not** call `onLiveOrder` | unit | same file (extends `KDS-04` block) | ❌ W0 |
| SCOPE-02 (D-04) | Handlers write to `['orders', branchId]`, `['orders', branchId, status]`, `['order', branchId, orderId]`, `['stats', branchId]` — not the old unscoped keys | unit | same file (rewrite of `U9b`/`U9b2`) | ❌ W0 |
| SCOPE-02 (D-03) | A message arriving after `branchId` changes writes to the **old** captured branch's key, not the live store value | unit | same file | ❌ W0 |
| SCOPE-02 (SC4) | A `renderHook` where `branchId` never changes never calls `fetchEventSource` more than once | unit | same file | ❌ W0 |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/__tests__/use-sse.test.js` — add: (1) a `describe('branch-aware reconnect')` block covering effect-rerun-on-`branchId`-change + explicit `isConnected` false-flip; (2) rewritten `U9b`/`U9b2` assertions targeting branch-scoped keys instead of unscoped `['orders']`/`['order', orderId]`; (3) a captured-vs-live-read regression test (D-03); (4) a single-branch (`branchId` never changes) regression test (SC4).
- [ ] Decide the `useAppStore`/`currentBranch` test-seeding mechanism — check an existing sibling-hook test for the established store idiom; do not invent a new one if a precedent exists.
- [ ] Framework install: none — Vitest, `@testing-library/react`, and all mocks are already present.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| KDS and order list both receive the new branch's live events after a switch | SCOPE-02 (SC2) | Needs two concurrent live sessions against the real API; cannot be unit-tested without encoding the assumption (D-07) | With the switcher wired (Phase 16) or a manual `currentBranch` set, switch branch and confirm on a second live session on the new branch that both KDS and the order list receive that branch's live `order_new`/`order_status_changed` events. Same live-API-verification pattern as v1.1's timezone / cents-vs-RON checks. |
| Actual 403 branch-resolution signal shape from `/v1/sse/orders` `onopen` | SCOPE-02 (D-06 capture) → Phase 17 | The raw SSE route bypasses the SDK's `{ error: string }` envelope; the real body shape is genuinely unverified and only observable when a real 403 occurs (realistically during Phase 16/17 testing) | Once a branch-resolution 403 first occurs, read the D-06 capture log for the status + body shape; record it for Phase 17. Capture-only in Phase 15 — no behavior change. |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
