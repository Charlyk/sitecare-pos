---
phase: 15
slug: sse-branch-aware-reconnect
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: validated
nyquist_compliant: false
wave_0_complete: true
created: 2026-07-22
validated: 2026-07-23
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

| Requirement | Behavior | Test Type | Automated Command | Status |
|-------------|----------|-----------|-------------------|--------|
| SCOPE-02 (SC1) | Effect re-runs + `ctrl.abort()` called when `branchId` changes across a `renderHook` rerender; `isConnected` explicitly flips `false` at top of new effect run; `fetchEventSource` called a second time with a fresh `AbortController` signal (`mock.calls.length === 2`, signals differ) | unit | `npx vitest run src/__tests__/use-sse.test.js -t "reconnect"` | ✅ `branch-aware reconnect > branchId change triggers reconnect: fetchEventSource called twice with distinct signals, isConnected flips false` (L170) |
| SCOPE-02 (SC3) | `snapshotDone.current` resets `false` on every effect run; a live `order_new` fired immediately after a branch-triggered reconnect does **not** call `onLiveOrder` | unit | same file (extends `KDS-04` block) | ✅ `KDS-04 > onLiveOrder is NOT called for order_new fired immediately after a branch-triggered reconnect (SC3 snapshot silence)` (L530) |
| SCOPE-02 (D-04) | Handlers write to `['orders', branchId]`, `['orders', branchId, status]`, `['order', branchId, orderId]`, `['stats', branchId]` — not the old unscoped keys | unit | same file (`U9b`/`U9b2`) | ✅ `U9b — order_new … appends to cache` (L100) + `U9b2 — order_status_changed updates … list cache and invalidates D-04 scoped keys` (L215) + detail-patch case (L303) |
| SCOPE-02 (D-03) | A message arriving after `branchId` changes writes to the **old** captured branch's key, not the live store value | unit | same file | ✅ `D-03 — captured scopedBranchId isolates a stale-connection message from a live branch switch` (L366) |
| SCOPE-02 (SC4) | A `renderHook` where `branchId` never changes never calls `fetchEventSource` more than once | unit | same file | ✅ `SC4: single-branch tenant — branchId unchanged across rerenders connects exactly once` (L197) |
| SCOPE-02 (D-06) | A non-2xx `onopen` logs `{ status, best-effort body }` before the unchanged throw, and does not connect | unit | same file | ✅ `U9a — D-06: a non-2xx onopen logs status + best-effort body before the unchanged throw, and does not connect` (L70) |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky — verified 22/22 passing on 2026-07-23 (`npx vitest run src/__tests__/use-sse.test.js`)*

---

## Wave 0 Requirements

- [x] `src/__tests__/use-sse.test.js` — added: (1) a `describe('branch-aware reconnect')` block covering effect-rerun-on-`branchId`-change + explicit `isConnected` false-flip; (2) rewritten `U9b`/`U9b2` assertions targeting branch-scoped keys instead of unscoped `['orders']`/`['order', orderId]`; (3) a captured-vs-live-read regression test (D-03); (4) a single-branch (`branchId` never changes) regression test (SC4); (5) SC3 snapshot-silence-across-reconnect case; (6) D-06 non-2xx onopen capture-log case.
- [x] `useAppStore`/`currentBranch` test-seeding mechanism resolved — reused the established `use-orders.test.js` idiom (`@tauri-apps/plugin-store` mock with resolved store handle + `useAppStore.setState({ currentBranch })`); no new idiom invented. Also fixed a pre-existing `wrapper()` QueryClient-identity bug via `useRef` (see 15-01-SUMMARY.md Deviations).
- [x] Framework install: none — Vitest, `@testing-library/react`, and all mocks already present.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| KDS and order list both receive the new branch's live events after a switch | SCOPE-02 (SC2) | Needs two concurrent live sessions against the real API; cannot be unit-tested without encoding the assumption (D-07) | With the switcher wired (Phase 16) or a manual `currentBranch` set, switch branch and confirm on a second live session on the new branch that both KDS and the order list receive that branch's live `order_new`/`order_status_changed` events. Same live-API-verification pattern as v1.1's timezone / cents-vs-RON checks. |
| Actual 403 branch-resolution signal shape from `/v1/sse/orders` `onopen` | SCOPE-02 (D-06 capture) → Phase 17 | The raw SSE route bypasses the SDK's `{ error: string }` envelope; the real body shape is genuinely unverified and only observable when a real 403 occurs (realistically during Phase 16/17 testing) | Once a branch-resolution 403 first occurs, read the D-06 capture log for the status + body shape; record it for Phase 17. Capture-only in Phase 15 — no behavior change. |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references — all 6 automated behaviors now green (0 MISSING)
- [x] No watch-mode flags
- [x] Feedback latency < 10s (single-file run ~0.7s)
- [ ] `nyquist_compliant: true` set in frontmatter — **N/A: PARTIAL.** SC2 is legitimate manual-only (needs two concurrent live sessions + a switcher UI that ships in Phase 16); all 6 *automatable* behaviors are covered and green, so `status: validated` + `nyquist_compliant: false` = PARTIAL, not a gap.

**Approval:** validated (PARTIAL) — 2026-07-23

---

## Validation Audit 2026-07-23

State A audit (VALIDATION.md pre-existed as `draft`, seeded by plan-phase). Cross-referenced all SCOPE-02 sub-criteria against `src/__tests__/use-sse.test.js`; ran the file (22/22 green).

| Metric | Count |
|--------|-------|
| Automated behaviors audited | 6 (SC1, SC3, SC4, D-03, D-04, D-06) |
| Gaps found | 0 |
| Resolved (auditor-generated) | 0 (all tests already existed and pass) |
| Escalated | 0 |
| Manual-only (deferred) | 1 (SC2 — live two-session check, gated on Phase 16 switcher UI) |

**Verdict:** PARTIAL — 6 automated + 1 manual-only. No auditor spawn required (zero gaps). SC2 remains a live human/UAT checkpoint per D-07, to be exercised once Phase 16 ships.
