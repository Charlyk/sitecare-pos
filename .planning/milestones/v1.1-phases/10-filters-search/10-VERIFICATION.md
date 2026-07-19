---
phase: 10-filters-search
verified: 2026-07-17T22:22:09Z
status: passed
score: 28/30 must-haves verified
behavior_unverified: 2 # visual two-row wrap at 1440x900 + perceptual debounce/traversal responsiveness (10-03 backstop truths) — present + wired, no automated test can exercise them
overrides_applied: 0
behavior_unverified_items:

  - truth: "The three pill groups sit on row 1 and search + Export wrap together to a right-aligned row 2 at 1440x900 (D-07 two-row bar)"
    test: "Open History at 1440x900 (or the app's default window size); observe the FilterBar layout"
    expected: "Period, Status, and Type pill groups render on the same row (row 1); the marginLeft:auto container holding the search input and the disabled Export button wraps to a right-aligned row 2"
    why_human: "CSS flex-wrap behavior at a specific viewport width cannot be confirmed by static source inspection or jsdom (RTL/vitest has no real layout engine) — the container's marginLeft:'auto'/flexWrap:'wrap' styling is present in source (src/screen-history.jsx:718,837) but its rendered wrap point is a visual fact"

  - truth: "The type+search count pass and the status+type+search row pass both traverse the full in-memory (up to 366-day) array on every debounced keystroke without visibly freezing the UI (E4 overflow; virtualization deferred)"
    test: "Load a 366-day custom range with a realistic order volume and type a search query"
    expected: "No visible UI freeze/jank while the debounced recompute runs"
    why_human: "Perceived responsiveness under realistic data volume is not something a unit/integration test with a handful of fixture rows can measure"
human_verification:

  - test: "Open History screen at 1440x900 window size; observe the FilterBar"
    expected: "Period/Status/Type pill groups sit on row 1; search input + Export button wrap together to a right-aligned row 2 (per screenshots/desktop-history.png)"
    why_human: "Visual/layout fidelity — CSS flex-wrap point at a specific viewport cannot be verified without a real browser render"

  - test: "Type a rapid burst into the History search box, then pause; also clear the box"
    expected: "One filtered recompute lands ~250ms after the last keystroke (not one per keystroke, not immediately); clearing the box narrows/widens the list with no perceptible delay"
    why_human: "Perceptual timing/'feels responsive' judgment (10-VALIDATION.md Manual-Only) — the mechanical 250ms timer and immediate-clear branch are already covered by an automated fake-timer test (D-10), but the human-perceived feel of the debounce is a separate, VALIDATION-listed manual check"
---

# Phase 10: Filters + Search Verification Report

**Phase Goal:** Staff can narrow a period's orders down to the ones they are looking for (client-side status incl. Refunded, order type with orderType 'local' shown as Dine-in, and debounced search with live counts).
**Verified:** 2026-07-17T22:22:09Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

**Roadmap Success Criteria (the contract)**

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| SC1 | Staff can filter by status — All/Completed/Refunded/Canceled — with a live count per option | ✓ VERIFIED | `src/screen-history.jsx:695-699,781-808` — F-03-ordered status pills with `statusCounts[f.id]` badges; `src/__tests__/screen-history.test.jsx:779` (`F-03` test) and `:793` (`D-02` exclude-self test) pass |
| SC2 | Staff can filter by order type — All/Delivery/Pickup/Dine-in — with `orderType:'local'` presented as Dine-in | ✓ VERIFIED | `src/data.jsx:222` maps `'local'`→`'dinein'` at the normalizeOrder boundary; `src/history-utils.js:370-373` `matchesType` mapping-free equality; `src/__tests__/normalize-order.test.js` + `src/__tests__/screen-orders.test.jsx` (F-02/D-08 regression) pass |
| SC3 | Staff can type an order number/customer name; the list narrows, debounced (no filter-per-keystroke) | ✓ VERIFIED | `src/screen-history.jsx:360-367` (250ms `setTimeout` + immediate-clear branch + `clearTimeout` cleanup); `src/__tests__/screen-history.test.jsx:918` (`D-10` fake-timer test) proves exactly one recompute after `advanceTimersByTime(250)` and immediate clear |
| SC4 | Filters/search/period compose — day headers/counts/tiles reflect only the visible (filtered) set; empty state appears when nothing matches | ✓ VERIFIED | `days`/`summary` derive from `visible`, not `finished` (`src/screen-history.jsx:397-398`); `src/__tests__/screen-history.test.jsx:874` (`D-04` test), `:894` (`D-15` Avg-tile test), `:811` (`D-03` zero-pill→empty test), `:953` (`D-12` period-independence test) all pass |

**Plan-level must-haves (10-01 — pure predicates)**

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | `foldDiacritics` folds both ș/ț encodings + ă/â/î | ✓ VERIFIED | `src/history-utils.js:323-325`; `history-utils.test.js` asserts both encodings fold to `Gheorghita` |
| 2 | `matchesSearch` returns true for empty/whitespace query | ✓ VERIFIED | `src/history-utils.js:337-339`; test covers `''` and `'   '` |
| 3 | `matchesSearch` matches dailyOrderNumber, id[0:8] fallback, customer.name | ✓ VERIFIED | `src/history-utils.js:341-346`; test seeds `dailyOrderNumber: null` fallback case |
| 4 | `matchesStatus('all')` matches all; named status delegates to `deriveDisplayStatus` | ✓ VERIFIED | `src/history-utils.js:357-360` — no inline status literals (grep confirms) |
| 5 | `matchesType('all')` matches all; named type is exact equality, no local mapping | ✓ VERIFIED | `src/history-utils.js:370-373` |
| 6 | Three status buckets partition a finished-only list exactly (refunded precedence) | ✓ VERIFIED | `deriveDisplayStatus` (`src/history-utils.js:196-201`) — refunded checked first, unconditionally |
| 7 | Search is pure substring containment, no rounding/tie-breaking | ✓ VERIFIED | `.includes()` only, confirmed by code read |

**Plan-level must-haves (10-02 — normalizeOrder boundary fix)**

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 8 | `normalizeOrder` maps `'local'`→`'dinein'` | ✓ VERIFIED | `src/data.jsx:222` |
| 9 | delivery/pickup pass through unchanged; absent still falls back to `'dinein'` | ✓ VERIFIED | Same expression; `normalize-order.test.js` covers all four cases |
| 10 | Formerly-`'local'` order now matches the live Orders Dine-in filter (F-02) | ✓ VERIFIED | `src/__tests__/screen-orders.test.jsx` F-02/D-08 test passes |
| 11 | Orders chips / KDS / detail render byte-identically before/after (no `'local'` key in `typeMeta`) | ✓ VERIFIED | `src/screen-orders.jsx:15-22` `typeMeta` has no `'local'` key (falls through to `map.dinein`); `screen-detail.test.jsx` regression passes |

**Plan-level must-haves (10-03 — screen wiring)**

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 12 | Status pills render All/Completed/Refunded/Canceled order | ✓ VERIFIED | `src/screen-history.jsx:695-699`; `F-03` test |
| 13 | Type pills render All/Delivery/Pickup/Dine-in with grid/moped/bag/utensils icons | ✓ VERIFIED | `src/screen-history.jsx:703-708` |
| 14 | Status counts are integer tallies via `deriveDisplayStatus`, no subtraction | ✓ VERIFIED | `src/screen-history.jsx:388-395`; `grep "orders - "` → 0 matches |
| 15 | All-status count === byTypeAndSearch.length | ✓ VERIFIED | Same memo (`counts.all += 1` for every element of `byTypeAndSearch`) |
| 16 | Selecting one status leaves siblings' true type+search-only counts (exclude-self) | ✓ VERIFIED | `D-02` integration test (`:793`) passes with a real fixture, not just presence |
| 17 | Day headers/tiles recompute from the filtered set, not the period | ✓ VERIFIED | `D-04` integration test (`:874`) passes |
| 18 | Completed-only filter: Refunds tile reads `0 · 0 canceled`; other tiles' sub-labels stay period-only | ✓ VERIFIED | `refundsCount`/`canceledCount` derive from `visible`; `sub: periodSub` (orders/revenue tiles) is independent of any filter — confirmed by code read at `src/screen-history.jsx:488-501` |
| 19 | Avg tile renders `formatRON(0)`, not em-dash, when completedCount is 0 and isError is false | ✓ VERIFIED | `src/screen-history.jsx:496`; `D-15` integration test (`:894`) passes |
| 20 | Status/type/query survive a period switch | ✓ VERIFIED | `D-12` integration test (`:953`) passes |
| 21 | *(backstop)* Rapid keystroke burst → exactly one recompute 250ms after last keystroke; clear is immediate | ✓ VERIFIED | Promoted from backstop to a real automated test in 10-04 (`D-10`, `:918`) — fake timers, not presence-only |
| 22 | *(backstop)* Selecting a status never zeroes sibling counts | ✓ VERIFIED | Same as #16 — promoted to a real automated test in 10-04 |
| 23 | *(backstop)* Three pill groups on row 1, search+Export wrap to row 2 at 1440x900 | ⚠️ PRESENT_BEHAVIOR_UNVERIFIED | `marginLeft:'auto'`/`flexWrap:'wrap'` present in source (`:718,837`) but wrap point at a real viewport is a visual fact no jsdom test can observe — routed to human verification |
| 24 | *(backstop)* Full-array traversal on every debounced keystroke doesn't visibly freeze the UI | ⚠️ PRESENT_BEHAVIOR_UNVERIFIED | Mechanically present (single `.filter()` passes per debounced keystroke) but perceived responsiveness at realistic (366-day) volume is unmeasured by the fixture-sized test suite — routed to human verification |

**Plan-level must-haves (10-04 — empty-state variants + integration suite)**

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 25 | Filtered empty-state Variant B renders `h_empty_filtered_title` on the main line, no sub-line | ✓ VERIFIED | `src/screen-history.jsx:170-179`; `D-03`/`D-13` tests confirm `h_empty_sub` text absent |
| 26 | No filters active + no match → Variant A (period copy) renders unchanged | ✓ VERIFIED | Pre-existing test at `screen-history.test.jsx:493` (unmodified by this phase) still passes |
| 27 | Zero-count status pill is clickable and lands on Variant B | ✓ VERIFIED | `D-03` test (`:811`) |
| 28 | Clear Filters button appears only in Variant B, resets status/type/query | ✓ VERIFIED | `D-13/D-14` test (`:831`) |
| 29 | Clear Filters never changes the active period/range | ✓ VERIFIED | `D-14 prohibition` test (`:850`) asserts the fetched range argument is byte-identical across the click sequence |
| 30 | Integration coverage exists for D-02/D-04/D-10/D-12/D-13/D-14/D-15 and both empty-state variants | ✓ VERIFIED | All 15 new tests in `describe('Phase 10 integration...')` (`:755-971`) pass |

**Score:** 28/30 truths verified (2 present + wired, behavior/visual-unverified — routed to human verification)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/history-utils.js` | +4 exports: `foldDiacritics`, `matchesStatus`, `matchesType`, `matchesSearch` | ✓ VERIFIED | All 4 present, JSDoc'd, no react/data.jsx/@charlyk import (`grep` → 0 matches for actual import statements; only comments reference these names) |
| `src/__tests__/history-utils.test.js` | Covers foldDiacritics (both encodings), matchesSearch (all 3 match paths + empty), matchesStatus, matchesType | ✓ VERIFIED | 100 tests in this file, all pass |
| `src/i18n.jsx` | `h_empty_filtered_title` + `h_clear_filters` in ro + en | ✓ VERIFIED | 4 matches (2 keys × 2 locales); exact copy confirmed |
| `src/data.jsx` | `normalizeOrder` translates `'local'`→`'dinein'` at line 222 | ✓ VERIFIED | Single-expression fix present, scoped exactly as planned |
| `src/__tests__/normalize-order.test.js` | 'local'→'dinein' + delivery/pickup passthrough | ✓ VERIFIED | Test block present and passing |
| `src/__tests__/screen-orders.test.jsx` | Formerly-'local' order appears under Dine-in + All | ✓ VERIFIED | F-02/D-08 describe block passing |
| `src/__tests__/screen-detail.test.jsx` | Read-only detail renders dine-in chip for normalized 'dinein' order | ✓ VERIFIED | `HISTORY_ORDER_DINEIN` fixture + assertion passing |
| `src/screen-history.jsx` | Filter state, debounce, memo chain, statusCounts, restructured FilterBar, EmptyBlock Variant B | ✓ VERIFIED | All present, wired, and exercised by 74 passing tests in this file |
| `src/__tests__/screen-history.test.jsx` | Integration tests for faceting/debounce/D-04/D-15/empty variants | ✓ VERIFIED | 74/74 passing (231/231 across all 5 phase-touched test files) |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `matchesStatus` | `deriveDisplayStatus` | direct call, no re-derivation | ✓ WIRED | `src/history-utils.js:359` |
| `matchesSearch` | `foldDiacritics` | query + name normalized on same axis | ✓ WIRED | `src/history-utils.js:338,344` |
| `normalizeOrder .type` output | `screen-orders.jsx:187` live type filter | equality comparison against corrected value | ✓ WIRED | Confirmed via passing F-02 regression test |
| `byTypeAndSearch` | `statusCounts` AND `visible` → `groupOrdersByDay`/`computeSummary` | two-derived-set memo chain | ✓ WIRED | `src/screen-history.jsx:374-398` |
| `query` → debounce `useEffect` → `debouncedQuery` → `matchesSearch` | 250ms timer, immediate clear | ✓ WIRED | `src/screen-history.jsx:360-367,375`; proven by fake-timer test, not just presence |
| `FilterBar` filter props/setters/statusCounts | passed from `HistoryScreen` | prop drilling | ✓ WIRED | `src/screen-history.jsx:443-449,664-666` |
| `HistoryScreen.filtersActive` | `EmptyBlock` variant selection | boolean prop | ✓ WIRED | `src/screen-history.jsx:405,461` |
| `Clear Filters onClick` | `setStatusFilter('all')`+`setTypeFilter('all')`+`setQuery('')` | `handleClearFilters`, never `setSelectedPeriod` | ✓ WIRED | `src/screen-history.jsx:406-410`; `grep` confirms no `setSelectedPeriod` call inside; D-14 prohibition test passes |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Phase-touched unit/integration suite is green | `npx vitest run src/__tests__/history-utils.test.js src/__tests__/normalize-order.test.js src/__tests__/screen-orders.test.jsx src/__tests__/screen-detail.test.jsx src/__tests__/screen-history.test.jsx` | 5 files, 231/231 tests passed | ✓ PASS |
| Full workspace suite | `npx vitest run` | 444/447 passed (3 pre-existing, unrelated failures per orchestrator context: `build-pipeline.test.js` BILD-04, `offline-buttons.test.jsx` U12×2 — confirmed pre-dating this phase via `git blame`, not re-litigated) | ✓ PASS |
| No period-wide subtraction arithmetic for counts | `grep -n "orders - " src/screen-history.jsx` | 0 matches | ✓ PASS |
| Module purity preserved | `grep -c -E "from 'react'|data\.jsx|@charlyk" src/history-utils.js` (import statements only) | 0 real imports (2 matches are comments) | ✓ PASS |
| `'local'` literal appears only at the two deliberate boundary sites | `grep -rn "'local'" src/*.jsx src/*.js` | `src/data.jsx:222` (inbound fix) + `src/screen-pos.jsx:12` (outbound map, untouched) — no new site | ✓ PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|--------------|--------|----------|
| HIST-07 | 10-01, 10-03, 10-04 | Filter by status — All/Completed/Refunded/Canceled with live count | ✓ SATISFIED | Status pills + `statusCounts` wired and tested (SC1) |
| HIST-08 | 10-01, 10-02, 10-03 | Filter by order type, `'local'`→Dine-in | ✓ SATISFIED | `normalizeOrder` boundary fix + type pills wired and tested (SC2) |
| HIST-09 | 10-01, 10-03, 10-04 | Debounced search by order number/customer name | ✓ SATISFIED | `matchesSearch` + 250ms debounce wired and tested (SC3) |

No orphaned requirements: `.planning/REQUIREMENTS.md`'s traceability table maps exactly HIST-07/08/09 to Phase 10, and all three appear in at least one plan's `requirements:` frontmatter. (Minor doc nit, non-blocking: the traceability table's "Plan" column still reads "TBD" for these three rows instead of "10-01..10-04" — a stale-doc issue, not a functional gap.)

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/data.jsx` | 208-216 | `10-REVIEW.md` CR-01 (CRITICAL, unresolved): fallback `total` calculation omits `tax` when the SDK doesn't supply `order.total` directly | Info (out of Phase 10 scope) | Pre-dates Phase 10 (`git blame` → commit `e8ccae4`, 2026-05-06); `src/data.jsx` was only in Phase 10's review scope because 10-02 touched line 222 (an unrelated field on the same object). Not caused by, and does not block, HIST-07/08/09. **Left OPEN with no fix commit after the review** — see Gaps Summary. |
| `src/screen-history.jsx` | 388-395 | `10-REVIEW.md` WR-03 (unresolved): `statusCounts` loop does `counts[deriveDisplayStatus(o)] += 1` with no guard against a `null` return | Info (currently safe by construction) | This IS new code from 10-03. Currently safe only because `byTypeAndSearch` is derived from `finished` (guaranteed non-null status by `filterFinishedOrders`). No observed defect; flagged by the review as a latent fragility if that invariant is ever broken by a future change. |
| `src/data.jsx`, `src/screen-history.jsx` | 197-198, 222, 54-61, 88/103/119 | `10-REVIEW.md` WR-01/WR-02/WR-04 (unresolved) | Info (pre-existing, out of Phase 10 scope) | `??`-with-empty-string trap, `historyStatusMeta` unsafe default, triplicated locale ternary — none introduced by or blocking Phase 10's HIST-07/08/09 truths. |
| — | — | No `TBD`/`FIXME`/`XXX`/`TODO`/`HACK`/`PLACEHOLDER` markers found in any of the 9 phase-touched files | — | Debt-marker gate: clean |

### Human Verification Required

### 1. Two-row FilterBar wrap at 1440×900

**Test:** Open the History screen at a 1440×900 window (or the app's default size).
**Expected:** The Period, Status, and Type pill groups sit together on row 1; the search input and the (disabled) Export button — nested in one `marginLeft:'auto'` container — wrap together to a right-aligned row 2, matching `screenshots/desktop-history.png`.
**Why human:** CSS flex-wrap behavior at a specific viewport is a rendered-layout fact; jsdom (used by the automated test suite) has no layout engine to observe it. This is explicitly listed as Manual-Only in `10-VALIDATION.md` and was never marked done.

### 2. Debounce "feels responsive"

**Test:** Type a rapid burst into the History search box, pause, then clear it.
**Expected:** One filtered recompute lands roughly 250ms after the last keystroke (not instantly, not laggy); clearing the box narrows/widens the list with no perceptible delay.
**Why human:** The mechanical timing (exactly one recompute after `advanceTimersByTime(250)`, immediate clear) is already covered by an automated fake-timer test (`D-10`) and passes. What remains unverified is the human-perceived "feel" of that timing — also explicitly listed as Manual-Only in `10-VALIDATION.md`.

### Gaps Summary

No gaps against Phase 10's own goal (HIST-07/08/09). All 4 roadmap Success Criteria, all must-haves truths/artifacts/key-links declared across 10-01 through 10-04, and both HIST-07/08/09's precision/boundary/adjacency edge cases are verified either by direct source inspection or — for every behavior-dependent truth (debounce timing, exclude-self faceting, filtered recompute, empty-state variants, period-independence) — by a real, passing behavioral test added in 10-04's integration suite (not merely "code is present").

Two items remain unverified by automation and are routed to human verification, both explicitly pre-flagged as Manual-Only in `10-VALIDATION.md` and never marked done: the two-row FilterBar wrap at 1440×900, and the perceptual "feel" of the 250ms debounce. Neither is a functional defect — the underlying code is present, wired, and (for the debounce) mechanically tested — but visual layout and perceived timing are not observable from source or jsdom.

**Separately, out of Phase 10's declared scope:** `10-REVIEW.md` (committed at `9111134`, the tip of this phase's history) reports `status: issues_found` with 1 CRITICAL and 4 WARNING findings, and no fix commit follows it in the git log. The CRITICAL finding (CR-01 — `normalizeOrder`'s fallback `total` calculation omits `tax`) is a genuine financial-correctness bug, confirmed still present in `src/data.jsx:214-216`. It pre-dates Phase 10 (introduced 2026-05-06, unrelated to any HIST-07/08/09 change) and does not block this phase's goal, but it is a real, currently-shipping defect that the project's own review process flagged and left open. Recommend a human decision: fix now in a short follow-up plan, or explicitly log it to `deferred-items.md`/a tracked backlog item before the next milestone ships — leaving a CRITICAL code-review finding silently unresolved is the kind of drift `10-REVIEW.md`'s own existence is meant to prevent.

---

*Verified: 2026-07-17T22:22:09Z*
*Verifier: Claude (gsd-verifier)*
