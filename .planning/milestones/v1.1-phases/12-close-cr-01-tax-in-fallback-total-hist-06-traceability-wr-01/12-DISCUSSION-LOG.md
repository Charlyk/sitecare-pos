# Phase 12: Close CR-01 tax-in-fallback-total + HIST-06 traceability + WR-01 popover - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-19
**Phase:** 12-close-cr-01-tax-in-fallback-total-hist-06-traceability-wr-01
**Areas discussed:** Phase scope (given fixes already landed), Adjacent audit items, Audit correction, State-continuity design (home / scope / reset rule)

---

## Pre-discussion finding (codebase scout)

Before asking anything, scouting revealed the milestone audit is stale: CR-01 (tax fallback, `7d9810b` + `30c89d8`), WR-01 (popover re-click, `033cc39`), and G-07-1 (Rust `dead_code`, `50492d5`) were all already fixed on `master` before the audit ran. `cargo check --lib` is clean; WR-01 has 3 existing regression tests. This reframed the phase from "fix 3 bugs" to "verify + close + one real code change."

---

## Phase scope (given CR-01 & WR-01 already fixed on master)

| Option | Description | Selected |
|--------|-------------|----------|
| Verify + backfill tests | Treat both as fixed; add missing CR-01 regression test, live-verify WR-01, correct the audit. No re-fixing. | ✓ |
| Re-investigate first | Don't trust the fixes; reproduce against current code before deciding. | |
| Docs-only | Skip tests/live verification; only fix HIST-06 docs + correct audit. | |

**User's choice:** Verify + backfill tests
**Notes:** CR-01 fallback-total path has zero regression coverage today; WR-01 gets a live check to close the audit's "independently reproduced" claim.

---

## Adjacent audit items (beyond the phase title)

| Option | Description | Selected |
|--------|-------------|----------|
| G-07-1 Rust dead_code | Fix `PrintOrderData.table` warning | ✓ (but already resolved — verify + correct audit only) |
| Nyquist validate 10 & 11 | Reconcile draft VALIDATION.md via /gsd-validate-phase | ✓ |
| Return-from-detail state | Lift period/filters/search so they survive Back | ✓ |
| None — keep title scope | Only the three named items | |

**User's choice:** G-07-1 + Nyquist 10/11 + Return-from-detail state
**Notes:** After selection, scout found G-07-1 is also already resolved (`50492d5`, cargo check clean) — so it collapses to verify + audit correction. Return-from-detail state is the only substantive code change in the phase.

---

## Audit correction (audit is wrong about CR-01/WR-01)

| Option | Description | Selected |
|--------|-------------|----------|
| Correct the audit file | Update `v1.1-MILESTONE-AUDIT.md` to mark items resolved (cite commits) and re-derive the verdict | ✓ |
| Append correction note | Leave original; add a dated addendum | |
| Leave as-is | Don't touch the audit | |

**User's choice:** Correct the audit file
**Notes:** Correction now covers three stale claims (CR-01, WR-01, G-07-1), not two.

---

## State-continuity design — where the selection lives

| Option | Description | Selected |
|--------|-------------|----------|
| Zustand store (session-only) | New session-only slice, not in partialize; survives round-trip, fresh on restart | ✓ |
| Zustand store (persisted) | Added to partialize; survives app restart | |
| Lift to app.jsx parent | Hold in app.jsx, prop-drill down | |

**User's choice:** Zustand store (session-only)
**Notes:** Mirrors `selectedOrder`/`historyOrder`; idiomatic per CLAUDE.md; avoids a stale custom range reappearing after restart.

---

## State-continuity design — which selections to preserve

| Option | Description | Selected |
|--------|-------------|----------|
| Everything | period + status + type + search | ✓ |
| Period only | Minimal fix satisfying Phase 8 SC4; filters/search still reset | |

**User's choice:** Everything
**Notes:** Back lands the user exactly where they were; goes slightly beyond the strict v1.1 filter-reset deferral by design.

---

## State-continuity design — reset rule

| Option | Description | Selected |
|--------|-------------|----------|
| Only detail round-trip preserves | Preserve History↔detail; reset when leaving History entirely | ✓ |
| Persist until explicitly cleared | Sticks across all in-session navigation | |

**User's choice:** Only detail round-trip preserves
**Notes:** Implement via `setScreen` — keep `historySelection` when target is `history`/`history-detail`, reset otherwise.

---

## Claude's Discretion

- Exact regression test file/case names and assertions.
- Store slice naming and setter shape (follow existing store idioms).
- Whether the re-derived audit verdict lands on `passed` or a qualified state (depends on Nyquist 10/11 outcomes).

## Deferred Ideas

- 3 pre-existing v1.0 test failures (BILD-04 + `offline-buttons.test.jsx` ×2) — [INFO], out of scope.
- `/gsd-complete-milestone` — next step after Phase 12, not part of it.
