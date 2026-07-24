# Phase 14: Branch-Scoped Cache Re-Scoping - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-22
**Phase:** 14-branch-scoped-cache-re-scoping
**Areas discussed:** Re-scope mechanism, Mutation invalidation scope, Error-code plumbing (SC3), Null/undefined branchId

---

## Re-scope mechanism

| Option | Description | Selected |
|--------|-------------|----------|
| branchId-keyed keys | Fold branchId into every query key (`['orders', branchId]`, …); old-branch entries orphan harmlessly, new-branch entries fetch fresh. Race-safe, future-proof, PRD-recommended. | ✓ |
| resetQueries() on switch | Leave keys unscoped; Phase 16 switch onSuccess nukes everything. Smaller diff, but must stay exhaustive and moves re-scope logic out of this phase. | |

**User's choice:** branchId-keyed keys
**Notes:** Resolves the ROADMAP's explicit planning-note decision point. Apply uniformly across all 7 hooks; do not mix in any ad-hoc resetQueries.

---

## Mutation invalidation scope

| Option | Description | Selected |
|--------|-------------|----------|
| Exact branch-scoped key | `invalidateQueries({ queryKey: ['orders', branchId] })` — targets only the active branch; literally satisfies SC2; testable. | ✓ |
| Broad prefix `['orders']` | Prefix partial-matches every branch's entries; simpler but violates SC2 as written and isn't cleanly testable. | |

**User's choice:** Exact branch-scoped key
**Notes:** Mutation hooks/screens read `currentBranch?.id` like the query hooks. Lockstep sites: use-order-actions (×3), screen-pos submit, screen-menu toggle, screen-orders refresh.

---

## Error-code plumbing (SC3)

| Option | Description | Selected |
|--------|-------------|----------|
| Shared `unwrapSdkResult()` helper | One helper all 7 fetch hooks route their error branch through; throws Error with `.code` from `result.error.code`. Single choke point for Phase 17's onError. | ✓ |
| Minimal per-hook `.code` attach | Attach `.code` inline in each throw; smaller change but repeats in 7+ hooks and drifts. | |
| Defer all error plumbing to Phase 17 | Do only keys + invalidations now. Rejected — SC3 is a success criterion of THIS phase. | |

**User's choice:** Shared `unwrapSdkResult()` helper
**Notes:** This phase produces the code only; the onError handler and any recovery/toast are Phase 17.

---

## Null/undefined branchId

| Option | Description | Selected |
|--------|-------------|----------|
| Fixed slot, null literal | Always `['orders', currentBranch?.id ?? null, …]`; query stays `enabled: !!client`; consistent shape so invalidations always match. | ✓ |
| Variable-length key | `branchId ? ['orders', branchId] : ['orders']` — mixes scoped/unscoped shapes; brittle invalidation + orphan risk. Rejected. | |

**User's choice:** Fixed slot, null literal
**Notes:** Reaffirms Pitfall 11 / SC4 — gate is `enabled: !!client` only, never `!!branchId`. Single-branch (null selectedBranch) and non-401 cold-start-failure states fetch immediately; server resolves from the session's selected branch.

---

## Claude's Discretion

- Where `unwrapSdkResult()` lives (`src/data.jsx` vs new `src/sdk.js`).
- `history-orders` key segment ordering (branchId first, before from/to).
- Whether mutation hooks reuse `unwrapSdkResult()` for their own error branches (SC3 strictly requires only the 7 fetch hooks).
- Test scaffolding specifics for SC1/SC2/SC3.

## Deferred Ideas

- Switch mutation / non-optimistic flow + Pitfall-4 race sequencing — Phase 16.
- SSE branch-prefixed cache writes + branch-aware reconnect — Phase 15.
- Centralized `onError` handler consuming `err.code` — Phase 17.
- POS cart reset / detail-screen exit on switch — Phase 16.
