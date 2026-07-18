---
phase: 10-filters-search
fixed_at: 2026-07-18T22:41:00Z
review_path: .planning/phases/10-filters-search/10-REVIEW.md
iteration: 1
findings_in_scope: 6
fixed: 6
skipped: 0
status: all_fixed
---

# Phase 10: Code Review Fix Report

**Fixed at:** 2026-07-18T22:41:00Z
**Source review:** .planning/phases/10-filters-search/10-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 6 (critical_warning scope — CR-01 through CR-03, WR-01 through WR-03; IN-01 through IN-04 excluded by scope)
- Fixed: 6
- Skipped: 0

## Fixed Issues

### CR-01: Percent-type discount is never converted from cents to RON (100x inflation)

**Files modified:** `src/data.jsx`
**Commit:** `30c89d8`
**Applied fix:** Changed the percent-discount branch in `normalizeOrder` to run `o.subtotal` through the module's `cRON` cents→RON converter before applying the basis-points percentage, matching every other monetary field in the function. Verified against the existing `normalize-order.test.js` suite and `history-utils.test.js` (all passing); no regression.

### CR-02: `normalizeOrder`'s fallback total calculation omits tax

**Files modified:** `src/data.jsx`
**Commit:** `7d9810b`
**Applied fix:** Added `tax` to the fallback total formula (`subtotal + tax + deliveryFee + tip - discount`) used when the SDK omits `order.total`, so the recomputed total matches the authoritative server total shape documented in the file's own mock fixtures.

### CR-03: `??`-with-empty-string trap leaves `state` (and `type`) as `''` instead of the documented default

**Files modified:** `src/data.jsx`
**Commit:** `5c7abb2`
**Applied fix:** Switched both the `state` fallback (`SDK_STATE_MAP[rawState] ?? rawState.toLowerCase() ?? 'new'`) and the `type` fallback (`raw ?? 'dinein'`) from `??` to `||` at the final default step, so an explicit empty string is treated the same as absent/nullish input. This prevents `normalizeOrder` from ever emitting `state: ''`, which was silently removing orders from every live-order filter bucket in `screen-orders.jsx` (that screen's own re-derivation short-circuits on the already-populated, now-correct `order.state`).

### WR-01: `historyStatusMeta`'s default silently relabels any unrecognized/null status as "completed"

**Files modified:** `src/screen-history.jsx`, `src/__tests__/screen-history.test.jsx`
**Commit:** `e3ae8f3`
**Applied fix:** Changed `historyStatusMeta`'s fallback from `map[status] || map.completed` to `map[status] ?? { chip: 'chip-slate', tile: 'hsl(210 15% 92%)', ink: '#556', icon: 'help', label: '—' }` — a visually distinct neutral fallback rather than reusing the "Completed" chip's identity. The existing test at `screen-history.test.jsx:984-986` explicitly asserted the old buggy default (`historyStatusMeta('unknown', t)` equal to `historyStatusMeta('completed', t)`) as correct behavior; updated it to assert the new fail-safe, visually-distinct fallback instead. Ran `screen-history.test.jsx` (74/74 passing) and `screen-detail.test.jsx` (37/37 passing, including the readOnly/no-status test that documents this exact defect) to confirm no regression.

### WR-02: `statusCounts` faceting loop is not defensive against `deriveDisplayStatus` returning `null`

**Files modified:** `src/screen-history.jsx`
**Commit:** `fbd59c1`
**Applied fix:** Added a guard so the loop only increments `counts[status]` when `deriveDisplayStatus(o)` returns a truthy status, preventing a stray `counts.null = NaN` property if a future refactor or bug lets a non-finished order reach this facet-counting loop. Verified `screen-history.test.jsx` (74/74 passing).

### WR-03: `orderTimeLabel` hardcodes `ro-RO`, ignoring the active UI language

**Files modified:** `src/data.jsx`, `src/screen-orders.jsx`, `src/screen-history.jsx`, `src/screen-detail.jsx`
**Commit:** `bd32090`
**Applied fix:** Added an optional `lang = 'ro'` parameter to `orderTimeLabel`, mirroring the existing `lang === 'ro' ? 'ro-RO' : 'en-GB'` convention used elsewhere in this phase, and threaded `lang` through all 7 call sites across `screen-orders.jsx` (`OrderCard`), `screen-history.jsx` (`HistoryRow`, plumbed from `DayGroup`), and `screen-detail.jsx` (`OrderDetailScreen` × 4, `ThermalTicket` × 1) — `lang` was already in scope at every call site as a component prop, so no additional prop-drilling was required. Ran the full relevant suite (`screen-history.test.jsx`, `screen-orders.test.jsx`, `screen-detail.test.jsx`, `normalize-order.test.js` — 131/131 passing). The default parameter preserves prior behavior for any caller that doesn't pass `lang`.

## Skipped Issues

None — all in-scope findings were fixed.

## Verification Notes

- Tier 2 syntax checking via `node -c` does not support `.jsx` files (per verification_strategy fallback rule), so a temporary `node_modules` symlink to the main repo was created solely to run the project's own `vitest` suite as a stronger correctness check for each fix, then removed before finalizing (not committed — it was never part of the git-tracked worktree).
- Full suite run (`vitest run src/__tests__/`) showed 3 pre-existing failures (`build-pipeline.test.js` Tauri config assertion, `offline-buttons.test.jsx` missing `QueryClientProvider` wrapper) confirmed present on the pre-fix commit via `git stash` — unrelated to this phase's findings and left untouched, as they are out of scope for this review-fix pass.
- Out-of-scope Info findings (IN-01 unused `isLoading` prop, IN-02 missing null-safety in `matchesSearch`, IN-03 duplicated locale ternary, IN-04 duplicated `isSwitching` derivation) were not attempted per `fix_scope: critical_warning`.

---

_Fixed: 2026-07-18T22:41:00Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
