---
phase: 15-sse-branch-aware-reconnect
plan: 01
subsystem: api
tags: [sse, fetch-event-source, tanstack-query, zustand, react-hooks]

# Dependency graph
requires:
  - phase: 14-branch-scoped-cache-re-scoping
    provides: branchId-first query key shapes (['orders', branchId], ['order', branchId, id], ['stats', branchId]) and the useAppStore((s) => s.currentBranch?.id) ?? null selector idiom
  - phase: 13-branch-state-launch-seeding-foundation
    provides: session-only currentBranch state in store.js (never persisted)
provides:
  - Branch-aware SSE reconnect in useSSE — branchId as an effect dependency, not a ref
  - All seven SSE cache-write sites (order_new x2, order_status_changed x5) re-keyed to Phase 14's branch-scoped keys
  - D-03 captured-not-live-read isolation (scopedBranchId const closed over per connection)
  - D-06 non-2xx onopen capture scaffold logging status + best-effort body, non-behavioral
affects: [16-branch-switcher-ui-switch-flow-language-relocation, 17-centralized-branch-access-error-handling]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Dependency-driven reconnect: read branchId via the store selector at hook top, add it to the effect dependency array — never store an app-state value that should trigger cleanup/reopen in a ref"
    - "Per-connection captured const (scopedBranchId) closed over by every handler inside the effect, preventing a stale connection's in-flight message from reading a since-changed live store value"

key-files:
  created: []
  modified:
    - src/use-sse.js
    - src/__tests__/use-sse.test.js

key-decisions:
  - "D-01: reconnect trigger is the internal useAppStore((s) => s.currentBranch?.id) ?? null selector plus branchId in the effect dependency array — never a ref, never an imperative reconnect() passed from app.jsx"
  - "D-02: no new reconnect trigger added this phase — because currentBranch is only set after a branch switch resolves (Phase 16 onSuccess, never optimistic), the dependency-driven reconnect fires post-switch-resolution by construction (Pitfall-4 race safety, no cross-phase coupling)"
  - "D-03: scopedBranchId captured once per connection (const scopedBranchId = branchId, right after the AbortController is created) and referenced by every handler — no handler ever reads useAppStore.getState()"
  - "D-05: setIsConnected(false) added at the top of every effect run (after the token guard) because ctrl.abort() fires neither onerror nor onclose in @microsoft/fetch-event-source — otherwise a branch-triggered reconnect would be real but invisible"
  - "D-06: non-2xx onopen logs { status, body } via console.warn before the existing throw — response.text() wrapped in try/catch (never .json()), console-only with no remote telemetry sink"

patterns-established:
  - "Test helper fix: shared `wrapper()` components passed to renderHook must hold a stable QueryClient (via useRef), not construct `new QueryClient()` in the function body — otherwise any explicit rerender() call gives every dependent hook a new queryClient identity and defeats dependency-array assertions"

requirements-completed: [SCOPE-02]

coverage:
  - id: D1
    description: "branchId change triggers a full drop-and-reopen reconnect: fetchEventSource called twice with distinct AbortController signals, isConnected flips false immediately"
    requirement: "SCOPE-02"
    verification:
      - kind: unit
        ref: "src/__tests__/use-sse.test.js#branch-aware reconnect > branchId change triggers reconnect: fetchEventSource called twice with distinct signals, isConnected flips false"
        status: pass
    human_judgment: false
  - id: D2
    description: "Single-branch tenant (branchId never changes) connects exactly once across multiple rerenders — no extra reconnect cycles"
    requirement: "SCOPE-02"
    verification:
      - kind: unit
        ref: "src/__tests__/use-sse.test.js#branch-aware reconnect > SC4: single-branch tenant — branchId unchanged across rerenders connects exactly once"
        status: pass
    human_judgment: false
  - id: D3
    description: "All seven SSE cache-write sites (order_new upsert + stats invalidate; order_status_changed list patch, detail patch, from/to invalidate, stats invalidate) target Phase 14's branch-scoped keys via the captured scopedBranchId"
    requirement: "SCOPE-02"
    verification:
      - kind: unit
        ref: "src/__tests__/use-sse.test.js#U9b — order_new event with new order id appends to cache"
        status: pass
      - kind: unit
        ref: "src/__tests__/use-sse.test.js#U9b2 — order_status_changed updates state in [\"orders\", branchId] list cache and invalidates D-04 scoped keys"
        status: pass
      - kind: unit
        ref: "src/__tests__/use-sse.test.js#U9b2 — order_status_changed patches the per-order detail cache"
        status: pass
    human_judgment: false
  - id: D4
    description: "A late message from a just-aborted stale connection writes only to its captured (old) branch key, never the new live-store value (D-03 isolation)"
    requirement: "SCOPE-02"
    verification:
      - kind: unit
        ref: "src/__tests__/use-sse.test.js#D-03 — a message fired after the store changes but before the hook rerenders writes to the OLD captured branch key, not the live value"
        status: pass
    human_judgment: false
  - id: D5
    description: "The initial-snapshot replay after a branch-triggered reconnect stays silent — no live-order callback fires for orders already open on the new branch"
    requirement: "SCOPE-02"
    verification:
      - kind: unit
        ref: "src/__tests__/use-sse.test.js#KDS-04 — onLiveOrder is NOT called for order_new fired immediately after a branch-triggered reconnect (SC3 snapshot silence)"
        status: pass
    human_judgment: false
  - id: D6
    description: "A non-2xx onopen response logs status + best-effort body before the unchanged throw (D-06 capture scaffold), and the throw→onerror→retry path is provably untouched"
    requirement: "SCOPE-02"
    verification:
      - kind: unit
        ref: "src/__tests__/use-sse.test.js#U9a — D-06: a non-2xx onopen logs status + best-effort body before the unchanged throw, and does not connect"
        status: pass
    human_judgment: false
  - id: D7
    description: "SC2 — two concurrent live sessions confirm both KDS and the order list receive the new branch's live events after a real switch"
    requirement: "SCOPE-02"
    verification: []
    human_judgment: true
    rationale: "No branch switcher UI exists yet (Phase 16 builds it) — SC2 cannot be exercised end-to-end until then. The plan's own <verification> section explicitly defers this to a live human/UAT session once Phase 16 ships, per D-07."

# Metrics
duration: ~7min
completed: 2026-07-23
status: complete
---

# Phase 15 Plan 01: SSE Branch-Aware Reconnect Summary

**useSSE now reconnects whenever `currentBranch?.id` changes — branchId is a real effect dependency (not a ref), every one of the seven SSE cache writes targets Phase 14's branch-scoped keys via a per-connection captured const, and a non-2xx onopen now logs the real 403 signal shape ahead of a Phase 17 spike.**

## Performance

- **Duration:** ~7 min
- **Started:** 2026-07-22T23:55Z (first task commit)
- **Completed:** 2026-07-23T00:00Z (last task commit)
- **Tasks:** 3
- **Files modified:** 2

## Accomplishments
- `useSSE` reads `branchId` via `useAppStore((s) => s.currentBranch?.id) ?? null` and adds it to the effect dependency array — a branch change now tears down the old connection and opens a fresh one with a distinct `AbortController` signal (D-01)
- `setIsConnected(false)` added at the top of every effect run — makes the reconnect visibly drop (OfflineBanner + disabled Accept/Advance), since `ctrl.abort()` fires neither `onerror` nor `onclose` in `@microsoft/fetch-event-source` (D-05)
- A `scopedBranchId` const is captured once per connection and closed over by every handler; all seven cache-write sites (`order_new` upsert + stats invalidate; `order_status_changed` list patch, detail patch, from/to invalidate, stats invalidate) now target Phase 14's branch-scoped keys (D-03/D-04)
- A single-branch tenant (branchId never changes) still connects exactly once — proven by an explicit multi-rerender regression test (SC4)
- Snapshot silence is preserved across a branch-triggered reconnect: `snapshotDone.current` resets to `false` on every effect run, so the fresh 100ms window absorbs the new branch's initial snapshot without a sound burst (SC3)
- A late message from a just-aborted stale connection writes only to its captured (old) branch's cache key, never the new live-store value — proven by a dedicated D-03 regression test that changes the store without rerendering the hook
- A non-2xx `onopen` now logs `{ status, body }` via `console.warn` before the existing throw — `response.text()` wrapped in try/catch (never `.json()`), console-only, no remote telemetry sink (D-06 capture scaffold for Phase 17)

## Task Commits

Each task was committed atomically (TDD RED/GREEN pairs for tasks 1 and 2):

1. **Task 1: End-to-end branch-aware reconnect + order_new write path** — `2875769` (test, RED) → `35166bb` (feat, GREEN)
2. **Task 2: Expand re-keying to order_status_changed + D-03 isolation** — `6c9c995` (test, RED) → `b337132` (feat, GREEN)
3. **Task 3: D-06 non-2xx onopen capture scaffold** — `810c21b` (feat, includes test)

## Files Created/Modified
- `src/use-sse.js` — branchId selector + effect dependency, `setIsConnected(false)` reconnect-drop, captured `scopedBranchId` const, all seven cache writes re-keyed, D-06 onopen capture log
- `src/__tests__/use-sse.test.js` — branch-aware reconnect describe block, rewritten U9b/U9b2 scoped-key assertions, D-03 captured-not-live-read regression, SC4 single-branch regression, SC3 snapshot-silence-across-reconnect case, D-06 capture-log case; fixed a pre-existing test-helper bug (see Deviations)

## Decisions Made
- D-01/D-02/D-03/D-05/D-06 all implemented exactly as specified in the plan's `must_haves.truths` — no deviation from the plan's chosen mechanism.
- Tracer feedback gate (Task 1): the tracer's `<verify>` is fully automated (`npx vitest run src/__tests__/use-sse.test.js`) and passed cleanly (20/20) with no UI surface to checkpoint on in this phase (the switcher is Phase 16, and the plan's own `<verification>` section explicitly defers the human/UAT confirmation to SC2 once Phase 16 ships). Proceeded directly to Task 2 rather than pausing for a checkpoint with no actionable human step, consistent with the plan's `autonomous: true` frontmatter, the project's `yolo` mode config, and the absence of any `type="checkpoint"` task in this plan.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed pre-existing `wrapper()` test-helper QueryClient identity bug**
- **Found during:** Task 1 (writing the branchId-change reconnect test, which requires an explicit `rerender()` call)
- **Issue:** The shared `wrapper({ children })` function in `src/__tests__/use-sse.test.js` constructed `new QueryClient()` directly in its function body. Because `wrapper` is itself a React component in the `renderHook` tree, calling `rerender()` re-invokes `wrapper`, producing a **new** QueryClient instance on every rerender. Since `queryClient` (from `useQueryClient()`) is in `useSSE`'s effect dependency array, this gave every rerender a different `queryClient` identity — spuriously re-triggering the SSE effect independent of any `branchId` change, making the SC4 single-branch regression test fail (4 calls instead of 1) and giving a false extra call in the reconnect-count test.
- **Fix:** Wrapped the QueryClient construction in a `useRef` so its identity is stable across rerenders of the same `renderHook` mount, matching the intended semantics (one hook mount = one QueryClient, unless the test opts into a custom `testWrapper`).
- **Files modified:** `src/__tests__/use-sse.test.js`
- **Verification:** Both the reconnect test (`fetchEventSource` called exactly 2 times, distinct signals) and the SC4 single-branch test (`fetchEventSource` called exactly 1 time across 3 rerenders) pass with the fix.
- **Committed in:** `35166bb` (Task 1 GREEN commit)

**2. [Rule 3 - Blocking] Mocked `@tauri-apps/plugin-store` with a resolved store handle**
- **Found during:** Task 1 (first test to call `useAppStore.setState(...)`)
- **Issue:** `src/__tests__/use-sse.test.js` mocked `@tauri-apps/plugin-store` as `{ load: vi.fn() }` (no resolved value). Once tests started calling `useAppStore.setState({ currentBranch: ... })` (required to drive the new branchId dependency), Zustand's persist middleware attempted `store.set(...)` against `undefined`, producing an unhandled promise rejection on every test run (27 errors in the run output, though not causing assertion failures).
- **Fix:** Matched the established convention from `src/__tests__/use-orders.test.js`: `load: vi.fn().mockResolvedValue({ get: vi.fn().mockResolvedValue(null), set: vi.fn().mockResolvedValue(undefined), delete: vi.fn().mockResolvedValue(undefined) })`.
- **Files modified:** `src/__tests__/use-sse.test.js`
- **Verification:** `npx vitest run src/__tests__/use-sse.test.js` shows 0 unhandled errors after the fix.
- **Committed in:** `35166bb` (Task 1 GREEN commit)

---

**Total deviations:** 2 auto-fixed (both Rule 1/Rule 3 — test-infrastructure bugs blocking correct verification, not production code)
**Impact on plan:** Both fixes are test-only, necessary to make the plan's own required assertions (SC4, reconnect-count) actually verify what they claim. No scope creep into production code beyond what the plan specified.

## Issues Encountered

- **Out-of-scope pre-existing failure (not fixed, logged):** `npx vitest run` (full suite) shows 1 unrelated failure — `src/__tests__/build-pipeline.test.js > BILD-04 > bundle.createUpdaterArtifacts is true` (`tauri.conf.json`'s `bundle.createUpdaterArtifacts` is the string `'v1Compatible'`, not `true`). This predates this plan (introduced in Phase 6, commit `7d00bcd`) and touches neither `src/use-sse.js` nor `src/__tests__/use-sse.test.js`. Logged to `.planning/phases/15-sse-branch-aware-reconnect/deferred-items.md` per the scope-boundary rule; not fixed.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `src/use-sse.js` is fully branch-aware: reconnect, cache re-keying, and isolation are all in place and covered by 22 passing tests in `src/__tests__/use-sse.test.js`.
- Phase 16 (Branch Switcher UI, Switch Flow & Language Relocation) can now safely call `setCurrentBranch(...)` after a switch resolves — `useSSE` will automatically drop and reopen the connection scoped to the new branch, with no changes needed in `useSSE` itself.
- SC2 (two concurrent live sessions confirming both KDS and the order list receive the new branch's live events) remains a deferred human/UAT checkpoint per the plan's own design — exercise it once Phase 16's switcher exists.
- D-06's capture scaffold is ready to record the real `/v1/sse/orders` 403 body shape the first time a branch-resolution failure is observed during Phase 16/17 testing — feed that observation into Phase 17 (Centralized Branch-Access Error Handling).

---
*Phase: 15-sse-branch-aware-reconnect*
*Completed: 2026-07-23*

## Self-Check: PASSED

- FOUND: src/use-sse.js
- FOUND: src/__tests__/use-sse.test.js
- FOUND: .planning/phases/15-sse-branch-aware-reconnect/15-01-SUMMARY.md
- FOUND commit: 2875769 (test RED, Task 1)
- FOUND commit: 35166bb (feat GREEN, Task 1)
- FOUND commit: 6c9c995 (test RED, Task 2)
- FOUND commit: b337132 (feat GREEN, Task 2)
- FOUND commit: 810c21b (feat, Task 3)
