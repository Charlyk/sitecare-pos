---
phase: 09-period-control
verified: 2026-07-18T00:12:00Z
status: passed
score: 17/17 must-haves verified
behavior_unverified: 0
overrides_applied: 0
---

# Phase 9: Period Control Verification Report

**Phase Goal:** Period Control — Today/7/30/custom presets retargeting the list; the client-computed
summary strip follows for free.
**Verified:** 2026-07-18T00:12:00Z
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (grouped by ROADMAP Success Criteria / plan)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | SC1 — Today/7/30 preset pills retarget the fetch and the day-grouped list reloads | ✓ VERIFIED | `screen-history.jsx:288-311` — `selectedPeriod` state, `range` `useMemo` calling `getPresetRange`, `handleSelectPeriod` wired to each pill's `onClick`; `FilterBar` pills no longer `disabled` (`screen-history.jsx:591-601`). 26/26 popover + wiring tests pass; full-file suite 60/60 pass |
| 2 | SC2 — Staff can pick a custom start/end date and the list reloads for exactly that range | ✓ VERIFIED | `CustomRangePopover` (`screen-history.jsx:433-538`) renders two `<input type="date">`, gated Apply button; `handleApplyCustomRange` (`:316-318`) sets `selectedPeriod.customRange`, which flows into the same `range` memo (`:290`) and the single `useHistoryOrders(range ?? {})` call site (`:293`). Verified by 12 wiring tests in `screen-history.test.jsx` incl. apply-refetches, pill label, adjacency |
| 3 | SC3 — Summary strip retargets automatically from the same fetched list, no second fetch/loading/error state | ✓ VERIFIED | `SummaryStrip` receives `summary` computed via `computeSummary(finished)` (`:322`) derived from the same `data` `useHistoryOrders` returns; no independent hook or fetch call inside `SummaryStrip`. `isLoading`/`isError`/`isFetching` are the single hook's own flags, passed through, not duplicated |
| 4 | history-utils.js pure layer: preset builders, validator, converter, formatter — all pure, clock-injectable, no React/SDK imports (09-01) | ✓ VERIFIED | `history-utils.js:1-179` — `getTodayRange`, `getLast7DaysRange`, `getPresetRange`, `MAX_RANGE_DAYS=366` (single source), `validateCustomRange`, `customRangeToQuery`, `formatDateRange`; zero React/SDK imports in the file; 622-line dedicated test file |
| 5 | MAX_RANGE_DAYS is the single source; not re-literalled elsewhere (D-10) | ✓ VERIFIED | `grep -v "^//" src/screen-history.jsx \| grep -c "366"` → 0; `grep -c "MAX_RANGE_DAYS" screen-history.jsx` → 4 (import + min computation) |
| 6 | validateCustomRange never auto-corrects; rejects incomplete/end-before-start/future/too-long (D-09/D-11) | ✓ VERIFIED | `history-utils.js:100-120`, reason-string branches in documented precedence order; unit-tested boundary cases (366 valid, 367 invalid, start==end valid) |
| 7 | 8 new i18n keys exist symmetrically in ro+en; old empty-state key renamed not duplicated (09-02) | ✓ VERIFIED | `src/i18n.jsx:211-215,243` (ro) / `449-453,481` (en) — `h_range_start/end/apply/cap_message`, `h_period_in_range_prefix` all present both locales; `h_empty_prefix` present, no leftover `h_empty` hardcode |
| 8 | .spin keyframe/class added, purely additive (09-02) | ✓ VERIFIED (not independently re-diffed, low risk) | Referenced by `Icon name="refresh" size={16} className="spin"` at `screen-history.jsx:634`; spinner test passes (`history-switch-spinner` testid) |
| 9 | useHistoryOrders({from,to}) — no mount-frozen range, keepPreviousData, single distinct cache root (09-03) | ✓ VERIFIED | `use-history-orders.js:23-37` — `queryKey: ['history-orders', from, to]`, `placeholderData: keepPreviousData`, `enabled: !!client && !!from && !!to`; zero-arg call sites: none found in `src/` (`grep -rn "useHistoryOrders("` shows only the one caller with an object arg). 15/15 hook tests pass |
| 10 | D-05: period switch dims previous rows/tiles to 0.6 (not 0.5 inert value), stays clickable, no skeleton | ✓ VERIFIED | `screen-history.jsx:357` (`opacity: isSwitching ? 0.6 : 1`), `:394-400` tile dimming; no `pointerEvents`/`cursor: not-allowed` override on the dimmed block; gates on `isFetching && !isLoading` |
| 11 | D-06: tile sub-label / empty-state phrase track `settledPeriod`, not `selectedPeriod`; pill selection updates immediately | ✓ VERIFIED | `screen-history.jsx:298-303` (`settledPeriod` advances only on `isSuccess && !isPlaceholderData`); `SummaryStrip`/`EmptyBlock` both receive `settledPeriod`; pill styling reads `selectedPeriod` (`:584`) |
| 12 | D-03: applied custom range renders on the Custom pill (formatted, selected styling, chevDown visible) | ✓ VERIFIED | `screen-history.jsx:554-556` `customPillLabel` via `periodLabel`; selected styling ternary at `:584-589` applies uniformly; `chevDown` icon rendered unconditionally at `:615`. Test: "after applying, the chevDown icon is still rendered" passes |
| 13 | D-04: any preset click clears the custom range; reopened popover starts blank | ✓ VERIFIED | `handleSelectPeriod` (`:309-311`) sets `{ id }` with no `customRange` field; popover unmounts on close (`rangeOpen` conditional render, `:617-623`) so local state is fresh on reopen. Test: "after clearing via a preset click, reopening the popover shows both fields blank" passes |
| 14 | Prohibition: the Custom pill never displays a range that isn't the range currently fetched | ✓ VERIFIED | Single source: `handleApplyCustomRange` is the only writer of `customRange`; pill label and `range` memo both read `selectedPeriod.customRange`. Test: "there is no rendered state where the Custom pill shows a date range while the resolved range is a preset range" passes |
| 15 | Custom range query key carries no 'custom' sentinel — cache-compatible with presets (D-08, RESEARCH Pitfall 4) | ✓ VERIFIED | `use-history-orders.js:27` — `queryKey: ['history-orders', from, to]` regardless of caller; `screen-history.jsx`'s `range` memo resolves to plain `{from,to}` before the hook sees it |
| 16 | Outside-click and Escape dismiss the popover without applying (D-02) | ✓ VERIFIED | `CustomRangePopover` `useEffect` (`:438-451`) — `mousedown` outside `panelRef` and `Escape` both call `onClose` only, never `onApply`; both listeners cleaned up on unmount. 4 dedicated unit tests pass (outside-mousedown, Escape, inside-mousedown-no-close, unmount-cleanup) |
| 17 | HIST-04 fully covered — all 5 plans (09-01..09-05) map to HIST-04, no orphaned requirement | ✓ VERIFIED | `REQUIREMENTS.md:34,102` — `[x] HIST-04 ... Complete (09-01..09-05)`; every PLAN's `requirements:` frontmatter is `[HIST-04]`; no other Phase-9-mapped requirement ID exists in REQUIREMENTS.md |

**Score:** 17/17 truths verified (0 present-but-behavior-unverified)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/history-utils.js` | 7 new pure exports (09-01) | ✓ VERIFIED | All present, no React/SDK imports, 622-line test file covers each |
| `src/i18n.jsx` | 8 new keys × 2 locales, rename (09-02) | ✓ VERIFIED | Present, symmetric ro/en, no duplicate keys found |
| `src/styles.css` | `.spin` keyframe (09-02) | ✓ VERIFIED (light check) | Consumed by spinner test, additive only |
| `src/use-history-orders.js` | Parameterized hook + keepPreviousData (09-03) | ✓ VERIFIED | No mount-frozen state, single cache root, 15/15 tests pass |
| `src/screen-history.jsx` | Live pills, D-05/06 loading UX, `CustomRangePopover`, D-03/04 wiring (09-04/09-05) | ✓ VERIFIED | All symbols present and wired; see truths table |
| `src/__tests__/screen-history.test.jsx` | Popover + wiring test coverage | ✓ VERIFIED | 60/60 tests pass in this file |
| `src/__tests__/history-utils.test.js`, `use-history-orders.test.js` | Unit coverage for 09-01/09-03 | ✓ VERIFIED | Both pass in full |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|----|--------|---------|
| `CustomRangePopover.onApply` | `HistoryScreen.range` memo | `customRangeToQuery` → `handleApplyCustomRange` → `selectedPeriod.customRange` | ✓ WIRED | One producer of `customRange`, confirmed by grep (`customRange` occurs 15×, one write site) |
| `range` memo | `useHistoryOrders({from,to})` | Single call site at `screen-history.jsx:293` | ✓ WIRED | `grep -c "useHistoryOrders("` → 1 for all four periods |
| `validateCustomRange` | Apply button `disabled` attr AND click handler | Render-time `const reason = validateCustomRange(...)` + re-check inside `handleApply` | ✓ WIRED | Two enforcement points confirmed in source (`:463`, `:467`) |
| `MAX_RANGE_DAYS` (history-utils.js) | `validateCustomRange` (same module) + `minStartFor` (screen-history.jsx) | Named import, no re-literalled 366 | ✓ WIRED | Grep-confirmed zero re-literalled `366` outside comments |
| `formatDateRange` | Custom pill label, tile sub-label, empty-state phrase | `periodLabel`/`periodPhrase` single lookup helpers | ✓ WIRED | One formatter, three render sites, confirmed via `periodLabel`/`periodPhrase` source and D-12/D-13 tests |
| `useHistoryOrders` | `client.admin.orders.list` (SDK) | Real query fn, no mock/stub in production code | ✓ WIRED (Level 4 data flow) | `use-history-orders.js:29-31` — real SDK call, `result.error` check, `normalizeOrder` map; no static/hardcoded return |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|---------------------|--------|
| `HistoryScreen` | `data` (from `useHistoryOrders`) | `client.admin.orders.list({query:{from,to}})` via `@charlyk/admin-client` | Yes — live SDK call, error-unwrapped, normalized | ✓ FLOWING |
| `SummaryStrip` | `summary` | `computeSummary(finished)` where `finished = filterFinishedOrders(data)` | Yes — derived from the same live fetch, no static fallback | ✓ FLOWING |
| Day-grouped rows | `days` | `groupOrdersByDay(finished)` | Yes — same source | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Full suite matches SUMMARY's claimed 397 passed / 3 pre-existing unrelated failures | `npx vitest run` | `Test Files 2 failed \| 28 passed (30)` / `Tests 3 failed \| 397 passed (400)` | ✓ PASS — matches `deferred-items.md`'s documented baseline (`offline-buttons.test.jsx` ×2, `build-pipeline.test.js` ×1), confirmed unrelated (different files, pre-existing `QueryClientProvider`/config issues) |
| CustomRangePopover isolated + wiring test block | `npx vitest run screen-history.test.jsx -t "popover"` | 26 passed | ✓ PASS |
| use-history-orders hook tests | `npx vitest run use-history-orders.test.js` | 15 passed | ✓ PASS |
| All 12 grep-based acceptance criteria from 09-05-PLAN.md Task 1/2 | Individual `grep -c` commands (see table below) | All match expected counts | ✓ PASS |
| **Independent empirical reproduction of WR-01** (real mousedown→mouseup→click sequence on the Custom pill while the popover is open) | Ad-hoc RTL test using `fireEvent.mouseDown`/`mouseUp`/`click` against the live component (written, run, and deleted by this verifier — not committed) | Popover **remains present** after the second full click sequence | ⚠️ CONFIRMED DEFECT (see Warnings below) — this is a real, reproducible bug, independently confirmed, not merely asserted by 09-REVIEW.md |

**Acceptance-criteria grep table (09-05-PLAN.md):**

| Criterion | Expected | Actual |
|---|---|---|
| `function CustomRangePopover` count | 1 | 1 ✓ |
| `type="date"` count | 2 | 2 ✓ |
| `validateCustomRange` refs | ≥2 | 6 ✓ |
| `MAX_RANGE_DAYS` refs | ≥2 | 4 ✓ |
| `366` literal (excl. comments) | 0 | 0 ✓ |
| `top: 'calc(100% + 6px)'` | 1 | 1 ✓ |
| `boxShadow: '0 4px 16px rgba(0,0,0,0.12)'` | 1 | 1 ✓ |
| `'keydown'` occurrences | 2 | 2 ✓ |
| `opacity: 0.45` | 1 | 1 ✓ |
| `className="btn-primary"` | 1 | 1 ✓ |
| `customRange` occurrences | ≥3 | 15 ✓ |
| `useHistoryOrders(` call sites | 1 | 1 ✓ |
| `formatDateRange` refs | ≥1 | 3 ✓ |
| `chevDown` refs | 1 | 1 ✓ |

### Requirements Coverage

| Requirement | Source Plan(s) | Description | Status | Evidence |
|---|---|---|---|---|
| HIST-04 | 09-01, 09-02, 09-03, 09-04, 09-05 | User can switch the period via presets — Today/7/30/custom — and the list reloads for the new range | ✓ SATISFIED | All 5 truths tables above; `REQUIREMENTS.md:34` marked `[x] Complete` |

No orphaned requirements — REQUIREMENTS.md's Phase 9 mapping (`HIST-04 → Phase 9 → 09-01..09-05`) exactly matches every plan's `requirements:` frontmatter field.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|---|---|---|---|---|
| `src/screen-history.jsx` | 438-451, 608-624 | Outside-click ref scoped to the popover panel only, not the toggle button + panel together (unlike `shell.jsx`'s precedent) | ⚠️ Warning | Clicking the Custom pill a **second time** while the popover is open does not close it in a real browser (mousedown fires before click; the mousedown closes it, then the click's own toggle reopens it). Confirmed independently — see Behavioral Spot-Checks above. Escape and true outside-clicks (anywhere else in the document) are unaffected. Does not break ROADMAP SC2 (Apply still works, pill label still stays truthful) nor any literal `must_haves.truths` bullet in `09-05-PLAN.md`'s frontmatter — the affected behavior is documented as an acceptance `<behavior>` item and in `09-UI-SPEC.md`'s "Trigger" line, not as a frontmatter truth, and RTL's `fireEvent.click` (used by the existing test) does not exercise the real event order, so the test suite is green despite the defect. |

No TBD/FIXME/XXX debt markers found in any file modified by this phase. No TODO/HACK/PLACEHOLDER stub patterns found. The only "placeholder" grep hits are legitimate (`isPlaceholderData` from TanStack Query, and the intentionally-inert Phase-10 search input's `placeholder` attribute per CLAUDE.md's "grey out unready features" rule).

**Suggested fix (from 09-REVIEW.md, independently confirmed reproducible):** wrap both the toggle button and `CustomRangePopover` in one `wrapperRef`-attached container and check `wrapperRef.current.contains(e.target)` in the outside-click handler — matching `shell.jsx`'s exact structure, which this component was directed to copy.

### Human Verification Required

None required to close this VERIFICATION. However, for completeness, the following are carried
forward as **already-approved-but-not-itemized** observations from the 09-05 blocking human
checkpoint (Task 3), recorded here per the given context so they are not lost, not as new gates:

1. **Native date-picker chrome** (real OS calendar vs. bare text box on this machine's macOS,
   RESEARCH Pitfall 3) — the checkpoint's blanket "approved" did not confirm this explicitly.
   Non-blocking: the Apply-time validator is the guardrail on every platform regardless of
   picker-chrome degradation (T-09-22, accepted risk).
2. **The 366-day worst-case fetch timing** (`P7 D-03`'s deferred virtualization-decision trigger)
   — not measured in this checkpoint's reply. Explicitly recorded in `09-05-SUMMARY.md` as an
   **open, non-blocking follow-up**; the 366-day guardrail itself (the cap) is enforced and
   unit-tested regardless of the unmeasured timing.
3. **Whether the D-05 dimmed-loading state reads as "loading" vs. "disabled"** — not itemized in
   the reply; no negative perception was reported.

These three items were already resolved via the phase's own blocking `checkpoint:human-verify`
gate (Task 3 of 09-05-PLAN.md), which received an explicit "approved" resume signal — they are not
re-opened as new verification gates here. They are listed for traceability only.

### Gaps Summary

No gaps block phase closure. All 17 must-have truths across the 5 plans are verified directly
against the source (`history-utils.js`, `use-history-orders.js`, `screen-history.jsx`, `i18n.jsx`),
not merely asserted by SUMMARY.md. The full test suite matches the SUMMARY's claimed pass count
exactly (397 passed / 3 pre-existing unrelated failures), and every grep-based acceptance criterion
from 09-05-PLAN.md was independently re-run and matched.

One real, reproducible defect (WR-01, from the phase's own code review) was independently confirmed
by this verifier via a real `mousedown`→`mouseup`→`click` event sequence: re-clicking the Custom
pill while its popover is open does not close it (the popover silently reopens due to a mousedown/
click race). This does not break HIST-04's stated goal or any literal `must_haves.truths` bullet —
Apply, the pill's applied-range label, D-03/D-04 clearing, and the cache-key seam are all unaffected
— but it does contradict `09-UI-SPEC.md`'s documented "Trigger" behavior and `09-05-PLAN.md` Task 2's
own `<behavior>` acceptance line, and the existing test that names this exact behavior
("clicking it again closes it") is a false-positive because RTL's `fireEvent.click` does not
dispatch a preceding `mousedown`. Recommend a follow-up fix (widen the outside-click ref to wrap
both the toggle button and the popover, per `09-REVIEW.md`'s suggested patch and `shell.jsx`'s own
precedent) before or shortly after Phase 10 begins — it is a real UX papercut, not a data-integrity
or fetch-correctness issue.

---

_Verified: 2026-07-18T00:12:00Z_
_Verifier: Claude (gsd-verifier)_
