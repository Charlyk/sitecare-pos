# Phase 12: Close CR-01 tax-in-fallback-total + HIST-06 traceability + WR-01 popover - Context

**Gathered:** 2026-07-19
**Status:** Ready for planning

<domain>
## Phase Boundary

Close out the v1.1 tech-debt items surfaced by `.planning/v1.1-MILESTONE-AUDIT.md` so the milestone can complete as a clean `passed` rather than `tech_debt`.

**Critical finding that reshapes this phase:** the audit (commit `3879182`, run 2026-07-19 01:07) was written against a tree that predated the 2026-07-17/18 fixes. **Three of its flagged items are already resolved on `master`** and need only *verification + audit correction*, not fixing:

| Audit item | Audit claim | Working-tree reality |
|---|---|---|
| **CR-01** — fallback `total` omits tax (`data.jsx:214-216`) | "still OPEN, no fix commit" | ✅ Fixed — `7d9810b` (tax) + `30c89d8` (sibling percent-discount 100× bug). No regression test. |
| **WR-01** — Custom pill popover re-click doesn't close | "independently reproduced by verifier" | ✅ Fixed — `033cc39`; `customWrapperRef` wraps toggle+panel. Three regression tests already exist (incl. `realClick` mousedown-race). |
| **G-07-1** — Rust `dead_code`, `PrintOrderData.table` never read (`lib.rs:59`) | "user asked for it to be fixed" | ✅ Resolved — `50492d5` wired `table` into dine-in receipts (`lib.rs:260`); `cargo check --lib` finishes with **zero warnings**. |

So the phase's actual work is one small code change plus verification, tests, docs, and audit correction.

**In scope:**
1. **Return-from-detail state continuity** — the one substantive code change (state resets on Back from the read-only detail because `HistoryScreen` unmounts).
2. **Regression tests** — backfill the missing `normalizeOrder` fallback-total tests (tax + percent discount).
3. **HIST-06 traceability** — doc-only: the requirement tag is orphaned from Phase 7 verification bookkeeping.
4. **Nyquist validation of Phases 10 & 11** — reconcile their `status: draft` VALIDATION.md files.
5. **Correct `v1.1-MILESTONE-AUDIT.md`** — mark CR-01, WR-01, G-07-1 resolved (cite commits) and re-derive the verdict.
6. **Verify** CR-01, WR-01, G-07-1 are genuinely closed (run tests + a live check of the WR-01 popover).

**Out of scope:** re-fixing CR-01/WR-01/G-07-1 code (already done); the 3 pre-existing v1.0 test failures (`build-pipeline.test.js` BILD-04, `offline-buttons.test.jsx` ×2 — [INFO], deferred); any new HIST features.

</domain>

<decisions>
## Implementation Decisions

### Return-from-detail state continuity (the one code change)
- **D-01:** Lift the History selection to the **Zustand store, session-only** — a new `historySelection` (or equivalent) slice holding `{ period, statusFilter, typeFilter, query }`, **not** added to `partialize` (mirrors `selectedOrder`/`historyOrder`). Idiomatic per CLAUDE.md ("Zustand owns UI state"). Survives the History→detail→Back round-trip; fresh on app restart. Rejected: persisting across restarts (a stale custom date range could reappear days later); lifting to `app.jsx` and prop-drilling (fights the "screens call their own hooks" convention).
- **D-02:** Preserve **everything** on Back — period + status + type + search. Back lands the user exactly where they were. This goes beyond the strict v1.1 "filter reset is accepted" deferral, but it is the expected UX and makes Phase 8 SC4's "period intact" literally true.
- **D-03:** **Only the detail round-trip preserves.** Reset to defaults (30-day / All / All / empty) when leaving History for any other screen (Orders/KDS/POS). Mechanism: in the store's `setScreen`, keep `historySelection` when the target is `history` or `history-detail`, reset it otherwise. A fresh visit to History from elsewhere starts clean; the detail round-trip (which routes via `history-detail`) is preserved by construction.
- **D-04:** `selectedPeriod`, `statusFilter`, `typeFilter`, `query` (and its `debouncedQuery` derivation) currently live as component-local `useState` in `screen-history.jsx` (lines 327, 371-373). The `settledPeriodRef` derived-during-render pattern (WR-03) and the `range` `useMemo` must keep working after the lift — read initial state from the store, write changes back to it.

### Verification & audit correction
- **D-05:** Scope choice = **"Verify + backfill tests"**. Treat CR-01/WR-01/G-07-1 as fixed; do not re-touch their code. Add the missing regression test for the CR-01 tax + percent-discount fallback in `normalizeOrder`; WR-01 and G-07-1 already have coverage (WR-01: 3 tests; G-07-1: `cargo check` clean).
- **D-06:** Backfill `normalize-order.test.js` (or a sibling) with cases that exercise the **fallback total path** (`o.total` omitted → `subtotal + tax + deliveryFee + tip − discount`) and the **percent-discount branch** (`cRON`-converted, not 100× inflated). This is the critical financial path with zero coverage today.
- **D-07:** WR-01 also gets a **live check** (run the app, confirm re-clicking the open Custom pill closes the popover) since the audit claimed it "independently reproduced" — a human/live checkpoint closes the ambiguity even though the code + tests already prove it.
- **D-08:** **Correct the audit file** (`v1.1-MILESTONE-AUDIT.md`) in place: mark CR-01, WR-01, and G-07-1 resolved with their commit SHAs (`7d9810b`/`30c89d8`, `033cc39`, `50492d5`), and re-derive the verdict. With the lone CRITICAL (CR-01) and both WR-01/G-07-1 resolved, remaining open reduces to the HIST-06 doc gap (fixed here), state continuity (fixed here), and Nyquist 10/11 (run here) — the milestone should re-derive toward a clean `passed`.

### HIST-06 traceability (doc-only)
- **D-09:** `REQUIREMENTS.md` is already correct (`HIST-06 → Phase 7 / 07-04, Complete`). The gap is in Phase 7 verification bookkeeping: `07-VERIFICATION.md` omits HIST-06 from its requirements table and its closing line (~101) wrongly states HIST-06 is "scoped to later phases (8-10)". Fix: add HIST-06 to the `07-VERIFICATION.md` table (satisfied by 07-04's computed summary strip), correct the mis-statement, and add `HIST-06` to a Phase 7 SUMMARY `requirements-completed` field (07-04's).

### Nyquist validation
- **D-10:** Run `/gsd-validate-phase 10` and `/gsd-validate-phase 11` to promote their draft VALIDATION.md to a real verdict. This is a coverage TODO, not a compliance failure — both phases are otherwise fully verified (VERIFICATION passed, UAT complete). Accept whatever COMPLIANT/PARTIAL verdict results.

### Claude's Discretion
- Exact test file/case names and assertions for the D-06 regression tests.
- Exact store slice naming (`historySelection` vs individual keys) and setter shape — follow existing store idioms.
- Whether the audit re-derivation flips the frontmatter `status:` to `passed` or a qualified state depends on the Nyquist outcomes; use judgment against the re-derived facts.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Source of the tech-debt list
- `.planning/v1.1-MILESTONE-AUDIT.md` — the audit that defines this phase's items; **note it is stale on CR-01/WR-01/G-07-1** (see D-08). MUST read before planning.

### CR-01 (already fixed — verify only)
- `src/data.jsx` §200-216 — `normalizeOrder` discount + total fallback (fixed: percent uses `cRON`, total includes `tax`)
- `.planning/phases/10-filters-search/10-REVIEW.md` §CR-01/CR-02 — origin of the tax + discount findings
- `src/__tests__/normalize-order.test.js` — where the missing fallback-total regression test goes (D-06)

### WR-01 (already fixed — verify only)
- `src/screen-history.jsx` §585-625 (`CustomRangePopover`), §715-812 (`customWrapperRef` boundary + Custom pill) — the fixed outside-click boundary
- `src/__tests__/screen-history.test.jsx` §571-640 — existing WR-01 regression tests (incl. `realClick` mousedown-race)
- `.planning/phases/09-period-control/09-REVIEW.md` §WR-01 — origin of the popover re-click finding

### G-07-1 (already resolved — verify only)
- `src-tauri/src/lib.rs` §53-71 (`PrintOrderData`), §250-264 (`table` reader on the thermal ticket) — the field is read; `cargo check --lib` is clean
- `src/app.jsx` §157 — JS print payload sends `table`

### HIST-06 traceability (doc fix)
- `.planning/phases/07-history-screen-foundation/07-VERIFICATION.md` §~101 — the orphaned tag + the incorrect "scoped to later phases" note
- `.planning/REQUIREMENTS.md` §HIST-06 (line 36, 104) — already-correct traceability (reference, do not change)

### Return-from-detail state continuity (the code change)
- `src/screen-history.jsx` §325-373 — the component-local period/filter/search state to lift
- `src/store.js` §42-90 — Zustand `persist`/`partialize` (6 persisted keys) + `setScreen` reset logic; the seam for D-01/D-03
- `src/app.jsx` §259 — the conditional render of `HistoryScreen` that unmounts on `history-detail`

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **Zustand store session-only pattern** (`store.js:53-54`): `selectedOrder`/`historyOrder` are session-only (set by openers, reset by `setScreen`, excluded from `partialize`). `historySelection` follows this exact template (D-01).
- **`setScreen` reset hook** (`store.js:66`): already resets `selectedOrder`/`historyOrder` on every screen change — the natural place to add the D-03 "reset unless target is history/history-detail" rule.
- **`normalize-order.test.js`**: existing test module for `normalizeOrder`; extend it for the D-06 fallback-total cases rather than creating a new file.
- **WR-01 `realClick` helper** (`screen-history.test.jsx:604`): fires `mousedown→mouseup→click`; the pattern already proves the popover race is closed.

### Established Patterns
- **Screens call their own hooks** (CLAUDE.md) — reinforces D-01's store approach over app.jsx prop-drilling.
- **`settledPeriodRef` derived-during-render** (`screen-history.jsx:347`, WR-03) — must survive the state lift; do not regress it into a `useEffect`.
- **`cRON` (v/100)** is the module's single cents→RON converter; every monetary field passes through it — the CR-01 regression test should assert on RON outputs.

### Integration Points
- `screen-history.jsx` initial state now reads from / writes to the store slice instead of local `useState` defaults.
- `store.setScreen` gains a conditional reset of `historySelection` keyed on the target screen (D-03).
- No SDK, Rust, or CSP changes — this phase is JS state + tests + docs only (the Rust item is verify-only).

</code_context>

<specifics>
## Specific Ideas

- The user's mental model of "close CR-01/WR-01/G-07-1" turned out to mean "confirm they are closed and fix the paperwork" — the code was already correct. Downstream planning should not spend effort re-deriving the fixes; it should verify + document.
- Re-derived post-phase milestone state (informational): CR-01 (critical) resolved, WR-01/G-07-1 resolved, HIST-06 documented, state continuity fixed, Nyquist 10/11 reconciled → milestone eligible for a clean `passed` and `/gsd-complete-milestone`.

</specifics>

<deferred>
## Deferred Ideas

- **3 pre-existing v1.0 test failures** ([INFO] in the audit): `build-pipeline.test.js` BILD-04 (updater-artifacts `v1Compatible`) + `offline-buttons.test.jsx` ×2 (missing `QueryClientProvider` wrapper). From Phase 6 (v1.0), confirmed unrelated to v1.1. Out of this phase's title scope — leave deferred; note in the audit correction that they remain the only red in an otherwise-green suite.
- **`/gsd-complete-milestone`** — running it to archive v1.1 is a next-step after Phase 12 verification, not part of this phase.

### Reviewed Todos (not folded)
None — no pending todos matched this phase.

</deferred>

---

*Phase: 12-close-cr-01-tax-in-fallback-total-hist-06-traceability-wr-01*
*Context gathered: 2026-07-19*
