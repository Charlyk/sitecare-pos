# Project Retrospective

*A living document updated after each milestone. Lessons feed forward into future planning.*

## Milestone: v1.1 — Orders History Screen

**Shipped:** 2026-07-19
**Phases:** 6 (Phases 7–12) | **Plans:** 28 | **Tasks:** 61

### What Was Built
- Orders History screen — day-grouped archive, client-computed 4-tile summary strip, loading/empty/error states (HIST-01/02/03/05/06/13)
- Read-only order detail reusing `screen-detail.jsx` in `readOnly` mode, hydrated via `getOrder(id)` with a derived actual prep duration (HIST-10)
- Period control (Today/7/30/custom) through a single `useHistoryOrders({from,to})` fetch seam with `keepPreviousData` (HIST-04)
- Client-side status/type/search filters with live faceted per-period counts, composing with the period (HIST-07/08/09)
- Printer-gated receipt reprint + accounting-grade CSV export (RFC-4180, BOM, formula-injection guard) via native Save dialog (HIST-11/12)
- Phase 12 tech-debt closeout: session-only `historySelection` slice, backfilled regression tests, HIST-06 traceability fix, Nyquist promotion, in-place audit re-derivation to `passed`

### What Worked
- **One data source, computed downstream (D-15):** deriving the summary strip and day headers from the same `listAdminOrders` result made tiles and rows agree by construction — no second endpoint, no independent loading/error state, no reconciliation bugs
- **Pure derivation layer first:** `history-utils.js` (day-grouping, preset ranges, 366-day validator, filter predicates, `deriveDuration`, `buildCsv`) was built and unit-tested React-free, so screen wiring consumed a proven foundation
- **Reusing `screen-detail.jsx` in `readOnly` mode (D-07):** one detail presenter instead of two; mutating controls gated by DOM removal with a standing allowlist test
- **Live-API human checkpoints** closed genuinely un-mockable questions (RON vs cents, Romanian calendar-day `from`/`to` boundaries, popover re-click, state continuity) rather than guessing

### What Was Inefficient
- **Traceability drift:** HIST-06 was functionally delivered and tested in Phase 7 but its requirement tag was never attached to any VERIFICATION.md table or SUMMARY frontmatter — surfaced only at milestone audit, needing a dedicated Phase 12 doc-only fix
- **Deferred tech debt compounded into a whole phase:** the fallback-total/percent-discount regression tests, the return-from-detail state continuity, and the WR-01 popover defect all rode along un-closed until Phase 12 had to sweep them
- **CR-01/CR-02 numbering collision:** the audit relabeled the tax-omission bug "CR-01" while `10-REVIEW.md` already defined CR-01 as the percent-discount bug — reconciling the two numbering schemes cost audit-correction effort in Phase 12

### Patterns Established
- **Session-only Zustand slice for cross-screen UI selection** (`historySelection`) that survives a specific round-trip and resets on any other exit via a target-keyed branch in `setScreen` — mirrors the existing `selectedOrder`/`historyOrder` precedent
- **Client-side export with a security guard baked in:** CSV serialization treats user-authored columns as an injection surface (OWASP formula-injection prefix) by default
- **Tauri plugin four-file lockstep:** npm + Cargo + `lib.rs` + capabilities changed together, with narrow capability grants and no broad `fs:scope`

### Key Lessons
1. Attach the requirement tag in the VERIFICATION.md table and SUMMARY frontmatter in the same phase the behavior ships — traceability is cheap to maintain inline and expensive to reconstruct at audit
2. When a phase closes with known regression-test gaps or a live defect, file it as a tracked item immediately; deferring several across phases forces a dedicated cleanup phase later
3. Keep bug-numbering anchored to its origin review document; introducing a parallel numbering scheme in an audit invites contradictory labels

### Cost Observations
- Model mix / session count: not tracked this milestone
- Notable: the pure-derivation-first approach kept expensive live-API verification narrowly targeted at the handful of genuinely un-mockable questions

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Phases | Key Change |
|-----------|--------|------------|
| v1.0 MVP | 6 | Greenfield: full scaffold, all 7 screens upfront, grey-out unready features |
| v1.1 Orders History | 6 | Brownfield feature addition; pure-derivation-first; live-API human checkpoints; a dedicated tech-debt closeout phase (12) + in-place milestone-audit correction |

### Cumulative Quality

| Milestone | Tests | Notable |
|-----------|-------|---------|
| v1.0 | 166 | Thermal printer, SSE, auth all covered; 3 pre-existing failures documented |
| v1.1 | 487 | +321 tests; 3 pre-existing v1.0 failures carried forward (deferred, out of scope) |

### Top Lessons (Verified Across Milestones)

1. Build the pure, testable layer before the React/UI wiring — validated in both v1.0 and v1.1
2. Reserve human/live verification for what cannot be mocked (OS keychain, thermal hardware, live-API date boundaries) rather than re-verifying deterministic logic
