# Phase 15: SSE Branch-Aware Reconnect - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-22
**Phase:** 15-sse-branch-aware-reconnect
**Areas discussed:** Reconnect trigger, Cache-write keying, Offline UX on switch, 403 signal scope, SC2 verification

---

## Reconnect trigger

| Option | Description | Selected |
|--------|-------------|----------|
| Store-read + dep array | useSSE reads currentBranch?.id from Zustand internally and adds it to the effect dependency array; branch change → ctrl.abort() + reopen. Self-contained, declarative, testable without Phase 16, mirrors Phase 14 D-02. | ✓ |
| branchId param from app.jsx | app.jsx reads currentBranch?.id and passes it as useSSE(token, branchId, onLiveOrder); same reactivity, call site owns wiring. | |
| Imperative reconnect() | useSSE returns reconnect() called by Phase 16's switch onSuccess; couples Phase 15 to Phase 16, unverifiable until Phase 16 lands. | |

**User's choice:** Store-read + dep array
**Notes:** Becomes CONTEXT D-01/D-02. Chosen for a self-contained, declarative hook that is verifiable now without the Phase 16 switcher; the effect's own abort→re-run yields SC1's visible drop-and-recover. Since currentBranch is set only after switch success (Phase 16 onSuccess), the reconnect fires post-resolution — Pitfall-4 race safety by construction.

---

## Cache-write keying

| Option | Description | Selected |
|--------|-------------|----------|
| Connection's captured branchId | The branchId the effect closed over at connect time keys every setQueryData/invalidateQueries; a late old-connection message can only land on the old branch's key. Race-safe. Mirrors Phase 14 D-04. | ✓ |
| Live store read per message | Each handler re-reads currentBranch?.id when the event arrives; risk a late old-connection message writes the NEW branch's key → cross-branch bleed. | |

**User's choice:** Connection's captured branchId
**Notes:** Becomes CONTEXT D-03/D-04. Also flagged: all four SSE cache writes must re-key to Phase 14's shapes — `['orders', branchId]`, `['orders', branchId, status]` (from/to filtered), `['order', branchId, orderId]`, `['stats', branchId]`. The current unscoped `['orders']`/`['stats']` writes are orphaned by Phase 14.

---

## Offline UX on switch

| Option | Description | Selected |
|--------|-------------|----------|
| Honest flash, bridge in P16 | Phase 15 lets isConnected flip honestly (brief banner + disabled buttons); Phase 16 (owns the switch flow) holds its pending-disabled state across the reconnect so users see one continuous "switching…" state. | ✓ |
| Suppress now in Phase 15 | Add a switch-reconnect flag in useSSE so isConnected doesn't drop on a branch reconnect; but no real switch signal exists until Phase 16 — speculative. | |
| Flash, accept as-is | Let the offline banner + button freeze show ~1s on every switch permanently; simplest, but a false "offline" after a success toast may erode trust in the indicator. | |

**User's choice:** Honest flash, bridge in P16
**Notes:** Becomes CONTEXT D-05 + a Phase 16 deferred item. Key finding: `isOffline` both renders OfflineBanner (shell.jsx:226) and disables Accept/Advance (screen-orders.jsx:149-151), so the flash has real UX weight — hence the explicit Phase 16 bridge responsibility.

---

## 403 signal scope

| Option | Description | Selected |
|--------|-------------|----------|
| Add capture scaffold only | Minimal, non-behavioral capture in onopen (log non-2xx status + body shape) so a 403's exact shape is recorded whenever it first occurs downstream; no handling, no retry change. De-risks Phase 17. | ✓ |
| Pure defer to Phase 17 | Phase 15 changes nothing; Phase 17 owns both capturing and handling the 403. Roadmap's literal default. | |
| Capture + probe now | Phase 15 actively reproduces a 403 to document the shape; needs test setup that doesn't exist pre-switcher — likely wasted effort. | |

**User's choice:** Add capture scaffold only
**Notes:** Becomes CONTEXT D-06. Reality check that shaped it: no switcher UI until Phase 16, so Phase 15 can't easily trigger a real branch-resolution 403 — the scaffold records the shape for free whenever one first occurs in Phase 16/17 testing. All 403 handling stays in Phase 17.

---

## SC2 verification

| Option | Description | Selected |
|--------|-------------|----------|
| Human UAT item | Automated tests cover reconnect mechanism + snapshot-silence + key alignment; SC2's two-live-sessions cross-check is a human/live-API verification (v1.1 pattern). | ✓ |
| Mock the second session | Simulate the second session's events via injected SSE messages; cheaper but encodes an assumption rather than verifying it. | |
| I'm ready for context | Leave the verification method to the planner. | |

**User's choice:** Human UAT item
**Notes:** Becomes CONTEXT D-07. SC2 needs two concurrent live sessions on the branch — cannot be unit-tested without encoding the server-behavior assumption.

## Claude's Discretion

- Exact selector form for reading currentBranch?.id in use-sse.js (inline useAppStore selector vs. shared selector).
- Whether the captured branchId is a closed-over const in the effect body or passed to helper writers, as long as D-03's captured-not-live-read invariant holds.
- Whether the D-06 capture logs via console or a structured sink, and which fields beyond the mandatory status.
- Test scaffolding specifics (mock branch ids, fake SSE messages, abort-spy).

## Deferred Ideas

- **Phase 16** — bridge the pending-disabled ("switching…") state across the reconnect so the honest Phase 15 offline flash reads as one continuous switch (D-05 companion).
- **Phase 17** — 403 branch-access handling (toast + reopen switcher + refetch for BRANCH_INACTIVE/BRANCH_ACCESS_REVOKED, full-screen block for NO_BRANCH_ACCESS, suppress blind backoff retry on 403) consuming the D-06-captured shape.
- **Phase 16** — switch mutation (client.me.branches.switch, SWCH-03) and POS cart reset / detail exit on switch (SCOPE-03).
