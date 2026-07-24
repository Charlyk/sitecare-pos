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

## Milestone: v1.2 — Branch Switching

**Shipped:** 2026-07-24 (`override_closeout`)
**Phases:** 5 (Phases 13–17) | **Plans:** 16 | **Tasks:** 30

### What Was Built
- Session-only `currentBranch` seeded from `getMe().selectedBranch` on sign-in, cold start, and window-focus revalidation — never persisted (BSTATE-01); `['branches']` hook over `client.me.branches.list()` (BSTATE-02)
- All 7 data caches keyed on `branchId` with a shared `unwrapSdkResult()` err.code helper and lockstep mutation invalidation (SCOPE-01)
- Branch-aware SSE reconnect driven by a `currentBranch?.id` effect dependency, with per-connection captured `scopedBranchId` isolating stale-connection writes and preserving snapshot silence (SCOPE-02)
- Non-optimistic sidebar-footer switcher: blocking overlay bridging the SSE reconnect, cart-discard confirm, neutral-landing exit, `key={currentBranch?.id}` POS remount, "default" badge, single-branch read-only lock, RO/EN pill relocation to Settings (SWCH-01…04, SCOPE-03/04, LANG-01)
- Central branch-access 403 recovery via global QueryCache/MutationCache `onError` → `handleBranchError`: toast+reopen for INACTIVE/REVOKED, full-screen block for NO_BRANCH_ACCESS, SSE onopen short-circuit, focus revalidation (BERR-01…04)

### What Worked
- **Tracer-first waves:** each phase's Wave 1 proved the pattern end-to-end on one hook/path (useOrders, BRANCH_ACCESS_REVOKED), then later waves mechanically expanded it to the remaining 6 hooks / 3 codes — low-risk fan-out from a verified template
- **Single shared coupling point:** every phase read/wrote `store.js`'s `currentBranch`, so the integration checker found 0 orphans and 0 broken flows — the cross-phase chain (switch → cache re-scope → SSE reconnect → 403 handling) held together by construction
- **Central error choke-point:** wiring 403 recovery to TanStack's global cache `onError` instead of per-call-site meant one path covered switch calls, ordinary refetches, and mutations without touching each hook

### What Was Inefficient
- **Unverifiable-by-design core mechanism:** the entire BERR recovery parses an ASSUMED 403 envelope because no test tenant with a revocable branch was reachable — the milestone's headline feature shipped synthetic-test-locked and UNVERIFIED against the live API (WINDOWS #1). A live fixture arranged up front would have let Phase 17 lock the real shape instead of deferring it
- **Verification tail deferred across three phases:** Phases 15/16/17 all closed `human_needed`, accumulating 10 UAT scenarios + 3 verification sign-offs that a live multi-branch account would have cleared inline — instead they rode to milestone close as acknowledged debt
- **Bookkeeping drift:** STATE.md's Phase Summary table and ROADMAP's progress table lagged reality (showed 15/16/17 "Not started"/"In Progress") through the whole milestone until the close reconciled them

### Patterns Established
- **branchId-keyed query keys** (`['<resource>', branchId, ...]`) as the uniform cache-scoping mechanism, with `branchId` read once at hook-body top and closed over in `onSuccess` for invalidation lockstep
- **Non-optimistic mutation + bridging overlay:** write shared state only in `onSuccess`, bridge the async side-effect (SSE reconnect) behind a bounded-timeout blocking overlay so the UI never shows a torn intermediate state
- **Broken-windows ledger for infeasible verification:** when a live check can't run, record the assumption explicitly as an open WINDOWS entry with a named follow-up rather than letting it pass as verified

### Key Lessons
1. If a milestone's core mechanism depends on a live-only signal (a real 403 body, a real branch switch), secure the test fixture *before* planning the phase that needs it — otherwise the headline feature ships unverified and the risk survives to production
2. A phase that closes `human_needed` is a deferred bill; three in a row is a milestone that can't honestly claim `passed` — batch the live UAT or arrange the fixture rather than serially deferring
3. A single shared state field as the cross-phase coupling point (here `currentBranch`) makes integration verification cheap and orphan-free — worth designing for deliberately

### Cost Observations
- Model mix / session count: not tracked this milestone
- Notable: tracer-first waves kept expansion cheap, but the deferred live verification means the true cost (a live-fixture UAT pass) is still outstanding, not saved

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Phases | Key Change |
|-----------|--------|------------|
| v1.0 MVP | 6 | Greenfield: full scaffold, all 7 screens upfront, grey-out unready features |
| v1.1 Orders History | 6 | Brownfield feature addition; pure-derivation-first; live-API human checkpoints; a dedicated tech-debt closeout phase (12) + in-place milestone-audit correction |
| v1.2 Branch Switching | 5 | Cross-cutting state feature; tracer-first waves fanning out to N hooks/codes; single shared coupling point (`currentBranch`); closed `override_closeout` with deferred live verification (no test fixture) |

### Cumulative Quality

| Milestone | Tests | Notable |
|-----------|-------|---------|
| v1.0 | 166 | Thermal printer, SSE, auth all covered; 3 pre-existing failures documented |
| v1.1 | 487 | +321 tests; 3 pre-existing v1.0 failures carried forward (deferred, out of scope) |
| v1.2 | ~620 | +~130 tests; down to 1 pre-existing unrelated `build-pipeline` failure; core BERR path synthetic-test-locked, UNVERIFIED live (WINDOWS #1) |

### Top Lessons (Verified Across Milestones)

1. Build the pure, testable layer before the React/UI wiring — validated in both v1.0 and v1.1
2. Reserve human/live verification for what cannot be mocked (OS keychain, thermal hardware, live-API date boundaries) rather than re-verifying deterministic logic
3. Secure the live test fixture *before* planning a phase whose core mechanism can only be verified live (v1.2: the branch-access 403 body shipped unverified because no revocable-branch tenant was reachable) — a serially-deferred `human_needed` tail is a milestone that can't honestly claim `passed`
