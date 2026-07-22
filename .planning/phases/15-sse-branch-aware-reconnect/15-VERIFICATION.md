---
phase: 15-sse-branch-aware-reconnect
verified: 2026-07-23T00:05:16Z
status: human_needed
score: 13/13 must-haves verified (2 automatable roadmap+plan truths remain code-supported but the live-session confirmation is out of scope for this phase)
behavior_unverified: 0
overrides_applied: 0
human_verification:
  - test: "SC2 — with two concurrent live sessions on different branches, switch one session's active branch and confirm both the Kitchen Display and the order list on that session start receiving the NEW branch's live order events (order_new / order_status_changed) while the other session's branch stream is unaffected."
    expected: "The switched session's KDS and order list update in near-real-time to reflect only the new branch's orders; no cross-branch event bleed; no stale old-branch events after the switch settles."
    why_human: "Requires a live SSE connection against the real API, two concurrent sessions, and an actual branch switch — none of which exist yet in the codebase (the branch switcher UI is Phase 16, not yet built). The plan's own <verification> section explicitly defers this to a human/UAT checkpoint (D-07) once Phase 16 ships. This is not a gap in Phase 15's delivered scope; it is a genuinely non-automatable, cross-phase checkpoint correctly deferred by the plan."
---

# Phase 15: SSE Branch-Aware Reconnect Verification Report

**Phase Goal:** The live order stream always reflects the currently active branch, reconnecting immediately on a switch rather than waiting on the library's passive retry.
**Verified:** 2026-07-23T00:05:16Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | SC1 (roadmap): a branch switch causes the live connection to visibly reconnect (drop + recover), scoped to the new branch, not on the library's passive backoff | ✓ VERIFIED | `src/use-sse.js:21,141` — `branchId` read via `useAppStore((s) => s.currentBranch?.id) ?? null` and is the third effect dependency; test `branch-aware reconnect > branchId change triggers reconnect` (use-sse.test.js:170-195) asserts `fetchEventSource` called twice with two distinct `AbortController` signal instances and `isConnected` flips to `false` immediately after the second effect run. Passing (22/22 use-sse tests green). |
| 2 | SC2 (roadmap): KDS and order list both receive the new branch's live events after a switch, confirmed against a second live session | ? UNCERTAIN → routed to human verification | No branch switcher UI exists yet (Phase 16 not built) — nothing to drive a real end-to-end live-session check. Correctly deferred per the plan's own `<verification>` D-07 checkpoint and SUMMARY.md's `D7` coverage entry (`human_judgment: true`). |
| 3 | SC3 (roadmap): reconnecting after a branch switch never fires the sound alert for orders already open on the new branch | ✓ VERIFIED | `src/use-sse.js:35,38` — `snapshotDone.current = false` and `setIsConnected(false)` at the top of every effect run, before the new `fetchEventSource` call. Test `KDS-04 > onLiveOrder is NOT called for order_new fired immediately after a branch-triggered reconnect` (use-sse.test.js:530-573) passes: after a branch-triggered reconnect, an `order_new` fired inside the fresh 100ms snapshot window does not invoke `onLiveOrder`. |
| 4 | SC4 (roadmap): a single-branch tenant's live connection behaves exactly as before — connects once, stays connected, no extra reconnect cycles | ✓ VERIFIED | Test `branch-aware reconnect > SC4: single-branch tenant` (use-sse.test.js:197-207): `branchId` unchanged across 3 explicit `rerender()` calls → `fetchEventSource` called exactly once. |
| 5 | D-01: `useSSE` reads `currentBranch?.id` internally and adds `branchId` to the effect dependency array; a branchId change tears down the old connection (`ctrl.abort`) and opens a fresh one with a distinct `AbortController` | ✓ VERIFIED | `src/use-sse.js:21,39-40,141` matches exactly; test as in truth #1. |
| 6 | D-02: because `currentBranch` is only set after a switch resolves (Phase 16 onSuccess, never optimistic), the dependency-driven reconnect fires post-switch-resolution by construction — no cross-phase coupling | ✓ VERIFIED (by code inspection) | The effect's sole reconnect trigger is the `branchId` dependency (`src/use-sse.js:141`); no gating logic, timer, or coupling to any switch-in-flight state was added — the hook is agnostic to *how* `currentBranch` changes, satisfying the "no cross-phase coupling" claim structurally. Phase 16 (which will call `setCurrentBranch` in onSuccess) does not exist yet, so the end-to-end causal chain cannot be exercised, but nothing in this phase's code depends on or assumes anything about Phase 16 beyond the existing `currentBranch` selector — consistent with the plan's own scope boundary. |
| 7 | `isConnected` explicitly flips to `false` at the top of every effect run (first connect and every branch-triggered reconnect) | ✓ VERIFIED | `src/use-sse.js:38`; test truth #1 confirms the flip on reconnect; `U9a` tests confirm the flip on first connect / error paths. |
| 8 | All seven SSE cache-write sites target Phase 14 branch-scoped keys — no write remains on an unscoped key | ✓ VERIFIED | `src/use-sse.js:77,85,101,112,118,119,120` — all 7 sites reference `scopedBranchId`; greps confirm zero remaining bare `['orders'],`, `['order', orderId]`, `['orders', fromStatus]`, `['orders', toStatus]`, or `['stats']` keys. Tests `U9b`, `U9b2` assert against `['orders','branch-a']`, `['order','branch-a','ord-004']`, `['orders','branch-a','NEW']`/`['ACCEPTED']`, `['stats','branch-a']`. |
| 9 | A late message from a just-aborted stale connection writes only to its captured (old) branch's key, never the new live-store value | ✓ VERIFIED | `src/use-sse.js:41` (`const scopedBranchId = branchId` captured once, closed over); test `D-03 — captured scopedBranchId isolates a stale-connection message` (use-sse.test.js:363-400) changes the store to `branch-b` without rerendering the hook, fires a message, and confirms the write lands only on `['orders','branch-a']`, with `['orders','branch-b']` untouched. |
| 10 | A branch-triggered reconnect resets `snapshotDone.current` to `false`, so the initial-snapshot replay stays silent | ✓ VERIFIED | Same as truth #3 — `src/use-sse.js:35` + KDS-04 reconnect test. |
| 11 | A single-branch tenant's `branchId` never changes, so the effect never re-runs — `fetchEventSource` called exactly once | ✓ VERIFIED | Same as truth #4. |
| 12 | `null` is a legitimate resolved `branchId` (single-branch / non-401 cold-start) and is treated as STABLE, not "unloaded" — no guard or defer on null | ✓ VERIFIED (by code inspection) | `src/use-sse.js:21` — `?? null` normalizes; the effect body has no `if (branchId === null) return` or defer logic; the only early-return guard is `if (!token)` (unrelated to branch). Consistent with Phase 14 D-07/D-08 precedent cited in the plan. |
| 13 | A non-2xx `onopen` response logs `response.status` + best-effort `response.text()` body before the existing throw, with no change to throw→onerror→retry behavior | ✓ VERIFIED | `src/use-sse.js:58-66`; test `U9a > D-06: a non-2xx onopen logs status + best-effort body before the unchanged throw` (use-sse.test.js:70-95) asserts `console.warn` called once with `{status:403, body:...}`, the promise still rejects/throws `'SSE: server returned 403'`, and `isConnected` stays `false`. |

**Score:** 13/13 code-verifiable must-haves VERIFIED (0 present-but-behavior-unverified). 1 additional roadmap success criterion (SC2) is genuinely non-automatable in this phase's scope and correctly routed to human/UAT per the plan's own D-07 deferral — it is not a gap.

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/use-sse.js` | branchId selector, branchId in effect dependency array, `setIsConnected(false)` at effect top, captured `scopedBranchId` const threaded to all seven cache-write sites, D-06 non-2xx onopen capture log | ✓ VERIFIED | All elements present and match plan spec exactly (lines 9, 21, 38, 41, 58-66, 77, 85, 101, 112, 118-120, 141). |
| `src/__tests__/use-sse.test.js` | branch-aware-reconnect describe block, rewritten U9b/U9b2 scoped-key assertions, D-03 regression, SC4 regression, SC3 snapshot-silence case, D-06 capture-log assertion | ✓ VERIFIED | All present (lines 167-208, 100-163, 210-357, 363-400, 530-573, 70-95). 22/22 tests pass. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|----|--------|---------|
| `useAppStore((s) => s.currentBranch?.id) ?? null` selector | SSE `useEffect` dependency array | `branchId` is the 3rd dependency, never a ref | ✓ WIRED | `src/use-sse.js:21,141` |
| Captured `scopedBranchId` const | All 7 `queryClient` cache-write sites | Const declared once per connection (line 41), closed over by every handler | ✓ WIRED | `src/use-sse.js:77,85,101,112,118,119,120` — grep confirms 0 `getState()` calls (no live-read escape hatch) |
| `setIsConnected(false)` at effect top | `OfflineBanner` (shell.jsx) + disabled Accept/Advance (screen-orders.jsx) | `isConnected` returned from `useSSE`, consumed as `isOffline = !isConnected` in `app.jsx:108`, threaded to `Shell` (`shell.jsx:226`, `isOffline && <OfflineBanner .../>`) and `OrderCard` (`screen-orders.jsx:149-151`, `disabled={isOffline}`) | ✓ WIRED | Confirmed via grep across `app.jsx`, `shell.jsx`, `screen-orders.jsx` — the SC1 visible-drop fan-out is real and pre-existing (not newly built this phase, but confirmed intact and driven by the new reconnect-triggered `false` flip). |

### Behavioral Spot-Checks / Test Execution

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Full `use-sse.test.js` suite (single named file, all 22 tests) | `npx vitest run src/__tests__/use-sse.test.js` | 1 file / 22 tests passed | ✓ PASS |
| Full workspace suite (run once, for regression confirmation) | `npx vitest run` | 1 file failed (`build-pipeline.test.js` BILD-04), 548/549 tests passed | ✓ PASS (pre-existing failure confirmed unrelated) |
| Acceptance-criteria greps (no bare unscoped keys, no `.json()`, no `getState()`, throw preserved) | `grep` checks against `src/use-sse.js` | All 0-count checks returned 0; `.json()` grep matched only a code comment referencing `.text() (never .json())`, not an actual call | ✓ PASS |
| scopedBranchId threaded to all 7 write sites | `grep -n scopedBranchId src/use-sse.js` | 7 write-site occurrences (2 `order_new`, 5 `order_status_changed`) plus the declaration | ✓ PASS |
| Task commits exist and match SUMMARY | `git show --stat -s <hash>` for 2875769, 35166bb, 6c9c995, b337132, 810c21b | All 5 commits found, messages match SUMMARY's Task Commits section | ✓ PASS |

**Note on the pre-existing `build-pipeline.test.js` failure:** confirmed via `git log` and direct test run that this is the `tauri.conf.json` `bundle.createUpdaterArtifacts: 'v1Compatible'` vs `true` mismatch, logged in `.planning/phases/15-sse-branch-aware-reconnect/deferred-items.md`, predates this phase (Phase 6, commit `7d00bcd`), and touches neither `src/use-sse.js` nor `src/__tests__/use-sse.test.js`. Not treated as a phase-15 regression, per the task instructions.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|--------------|--------|----------|
| SCOPE-02 | 15-01-PLAN.md | The live SSE stream reconnects on switch so the order list and Kitchen Display receive the new branch's events; the reconnect must not fire the initial-snapshot sound burst | ✓ SATISFIED (mechanism); ? SC2 live-session confirmation pending human/UAT | Reconnect mechanism (D-01/D-02/D-05), branch-scoped re-keying (D-04), snapshot silence (SC3), single-branch regression (SC4), and stale-message isolation (D-03) are all code-verified and test-backed. The end-to-end live-session portion of SCOPE-02's wording ("KDS and order list receive... confirmed against a second live session") cannot be exercised until Phase 16's switcher UI exists — correctly deferred per plan design, not a Phase 15 delivery gap. |

REQUIREMENTS.md traceability table already marks `SCOPE-02 | Phase 15 | Complete` — consistent with this verification (mechanism fully delivered; SC2's live confirmation is an explicitly deferred cross-phase checkpoint, not an open implementation gap). No orphaned requirements found for Phase 15 — SCOPE-02 is the only requirement mapped to this phase in REQUIREMENTS.md, and it is the only requirement declared in the plan's frontmatter.

### Anti-Patterns Found

None. Scanned `src/use-sse.js` and `src/__tests__/use-sse.test.js` for `TBD|FIXME|XXX`, `TODO|HACK|PLACEHOLDER`, placeholder/stub language, and empty-return implementations — zero matches.

### Human Verification Required

### 1. SC2 — Live two-session branch-switch event confirmation

**Test:** With two concurrent live sessions authenticated against the real API, both on Branch A, switch one session's active branch to Branch B (once Phase 16's switcher exists) and observe the Kitchen Display and order list on the switched session.
**Expected:** The switched session's KDS and order list start showing Branch B's live `order_new`/`order_status_changed` events within about a second of the switch, with no residual Branch A events after the reconnect settles; the un-switched session (still on Branch A) is unaffected.
**Why human:** Requires a live SSE connection to the real API, a real branch switch action, and two concurrent human-observed sessions — none of which can be driven or observed by static code/test inspection. The switcher UI itself doesn't exist yet (Phase 16). The plan's own `<verification>` section explicitly defers this to a D-07 human/UAT checkpoint once Phase 16 ships, and SUMMARY.md's coverage entry `D7` already marks this `human_judgment: true` with an empty automated-verification list — this VERIFICATION.md corroborates that deferral rather than treating it as a gap.

### Gaps Summary

No gaps found. All 13 code-verifiable must-haves (4 roadmap success criteria minus the genuinely non-automatable SC2, plus 9 plan-frontmatter truths) are VERIFIED against the actual codebase: `src/use-sse.js` implements the branch-aware reconnect exactly as specified (dependency-driven trigger, explicit `isConnected` drop, captured `scopedBranchId` isolation across all seven cache-write sites, snapshot-silence preservation, single-branch regression safety, and a non-behavioral D-06 capture scaffold), and `src/__tests__/use-sse.test.js` exercises every one of these behaviors with 22 passing tests. The only outstanding item — SC2's live two-session confirmation — is a correctly-deferred, non-automatable human/UAT checkpoint that depends on Phase 16 (not yet built); it is not a defect or omission in Phase 15's delivered scope. Overall status is `human_needed` rather than `passed` solely because that one item exists, per the verification decision tree.

---

*Verified: 2026-07-23T00:05:16Z*
*Verifier: Claude (gsd-verifier)*
