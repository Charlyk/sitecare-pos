---
phase: 14-branch-scoped-cache-re-scoping
verified: 2026-07-22T18:53:36Z
status: human_needed
score: 3/4 roadmap success criteria fully verified (1 partial — human decision requested)
behavior_unverified: 0
overrides_applied: 0
human_verification:
  - test: "Decide whether use-history-orders.js's exclusion from the unwrapSdkResult/err.code mechanism is an acceptable, scoped deviation from ROADMAP SC3, or must be closed before Phase 17 depends on it."
    expected: "Either (a) accept the deviation via a VERIFICATION.md override, given the documented rationale (protecting the OPEN windows-history-network-error debug investigation from disruption), or (b) require a fast-follow that adds `err.code` to use-history-orders.js's existing `.diagnostic` error block (a non-conflicting, additive change) so all 7 branch-scoped resources satisfy SC3 uniformly before Phase 17 (BERR) builds its centralized `onError` handler."
    why_human: "This is a deliberate, well-reasoned, plan-level scope decision (14-03-PLAN.md's explicit 'enforced' prohibition), not a code defect — grep/test evidence can confirm the fact (err.code is absent on this one hook) but cannot judge whether the trade-off is acceptable. That is a product/engineering judgment call about phase-completion bar and Phase 17 dependency risk."
---

# Phase 14: Branch-Scoped Cache Re-Scoping Verification Report

**Phase Goal:** Every branch-scoped data cache is keyed to the active branch, so no cached response can be served against the wrong branch once switching exists. (Orders, order detail, stats, product availability, order history, restaurant settings, delivery-area data all cached per branch; mutations invalidate only the active branch's cache entries; every branch-scoped data-fetch error carries a matchable error code; single-branch tenant order list loads with no added delay — branch resolution never blocks the initial fetch.)
**Verified:** 2026-07-22T18:53:36Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (ROADMAP Success Criteria, verbatim)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Orders, order detail, stats, product availability, order history, restaurant settings, and delivery-area data are all cached per branch, so a branch change is guaranteed to produce a fresh fetch rather than a stale hit from another branch. | ✓ VERIFIED | All 7 hooks read `branchId = useAppStore((s) => s.currentBranch?.id) ?? null` and fold it as the first variable segment: `use-orders.js:18` (`['orders', branchId, status?]`), `use-order-detail.js:10` (`['order', branchId, id]`), `use-stats.js:10` (`['stats', branchId]`), `use-menu.js:17` (`['menu', branchId]`), `use-restaurant-settings.js:11` (`['restaurant-settings', branchId]`), `use-delivery-areas.js:11` (`['delivery-areas', branchId]`), `use-history-orders.js:44` (`['history-orders', branchId, from, to]`). Each has a passing SC1 test asserting `'branch-a'` appears as the key segment after the resource name (7 test files, all green in the full suite run). |
| 2 | Order mutations (accept/advance/cancel, POS submit) invalidate only the active branch's cache entries, never a different branch's. | ✓ VERIFIED | `use-order-actions.js:31-33,45-47` invalidates `['orders', branchId]`, `['order', branchId]`, `['stats', branchId]` for both `updateStatus` and `updateEstimatedTime`, with `branchId` read once at hook-body top (not inside `onSuccess` — no stale-closure risk). `screen-pos.jsx:173` invalidates `['orders', branchId]`; `screen-menu.jsx:41` invalidates `['menu', branchId]`; `screen-orders.jsx:283` (manual refresh) invalidates `['orders', branchId]` + `['stats', branchId]`. `use-order-actions.test.js`'s SC2 test explicitly seeds `['orders','branch-a']` and `['orders','branch-b']`, mutates for branch-a, and asserts `qc.getQueryData(['orders','branch-b'])` is unchanged — passes. `grep -rn "resetQueries" src/` returns zero matches. |
| 3 | Every branch-scoped data-fetch error carries a matchable error code (e.g. `BRANCH_INACTIVE`) that a later centralized handler can act on. | ⚠️ PARTIAL | `unwrapSdkResult()` (`src/data.jsx:200-209`) sets `err.code` from `result.error.error`/bare-string, confirmed by 3 passing unit tests including a simulated `BRANCH_INACTIVE` case. 6 of 7 fetch hooks route through it (`use-orders`, `use-order-detail`, `use-stats`, `use-menu`, `use-restaurant-settings`, `use-delivery-areas`) — verified by grep and read. **`use-history-orders.js` is explicitly excluded** (`src/use-history-orders.js:45-66`): its queryFn throws its own `Error` with `.diagnostic` and `.message` but never sets `.code`. This is a deliberate, documented plan-time decision (14-03-PLAN.md must_haves.prohibitions, status "enforced") to protect the OPEN debug investigation `windows-history-network-error`. Order history is one of the 7 resources explicitly named in SC1, so as literally worded, SC3 is not 100% true today — see Human Verification. |
| 4 | Standing regression: a single-branch tenant's order list loads with no added delay versus pre-v1.2 — branch resolution never blocks the initial fetch. | ✓ VERIFIED | Every hook's `enabled` gate is unchanged from pre-phase form (`enabled: !!client` only, or `!!client && !!id` for order-detail — no `branchId` term added). `grep -n "branchId" src/use-orders.js` and equivalents show `branchId` only in the selector/key, never in `enabled`. SC4 tests (`use-orders.test.js`, `use-stats.test.js`, `use-menu.test.js`, `use-restaurant-settings.test.js`, `use-delivery-areas.test.js`) assert `fetchStatus !== 'idle'` with `currentBranch: null` and a present client — all pass. |

**Score:** 3/4 fully verified, 1 partial (flagged for human decision, not a code defect)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/data.jsx` | `unwrapSdkResult` exported, correct err.code logic | ✓ VERIFIED | Lines 195-209; matches spec exactly (uses `result.error.error`/bare-string, not the nonexistent `result.error.code`) |
| `src/use-orders.js` | Branch-scoped key + unwrapSdkResult | ✓ VERIFIED | Line 18 key, line 23 unwrap |
| `src/use-order-detail.js` | Branch-scoped key + unwrapSdkResult | ✓ VERIFIED | Line 10 key, line 13 unwrap |
| `src/use-stats.js` | Branch-scoped key + unwrapSdkResult | ✓ VERIFIED | Line 10 key, line 13 unwrap |
| `src/use-menu.js` | Branch-scoped key + unwrapSdkResult | ✓ VERIFIED | Line 17 key, line 20 unwrap |
| `src/use-restaurant-settings.js` | Branch-scoped key + unwrapSdkResult | ✓ VERIFIED | Line 11 key, line 14 unwrap |
| `src/use-delivery-areas.js` | Branch-scoped key + unwrapSdkResult, fee mapping preserved | ✓ VERIFIED | Line 11 key, line 14 unwrap, line 18 `/100` mapping intact |
| `src/use-history-orders.js` | Branch-scoped key ONLY, `.diagnostic` preserved | ✓ VERIFIED (key) / ⚠️ (SC3 err.code absent, by design) | Line 44 key; lines 49-66 diagnostic block byte-preserved (no `.code` set) |
| `src/use-order-actions.js` | Branch-scoped invalidation, branchId read once | ✓ VERIFIED | Line 16 selector (hook-body top), lines 31-33/45-47 invalidation |
| `src/screen-orders.jsx` | Branch-scoped refresh invalidation | ✓ VERIFIED | Line 166 selector, line 283 invalidation |
| `src/screen-pos.jsx` | Branch-scoped POS-submit invalidation | ✓ VERIFIED | Line 19 selector, line 173 invalidation |
| `src/screen-menu.jsx` | Branch-scoped stock-toggle invalidation | ✓ VERIFIED | Line 16 selector, line 41 invalidation |
| 7 new/extended hook test files | SC1/SC2/SC3/SC4 assertions | ✓ VERIFIED | All present, substantive, passing (confirmed via full suite run) |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `useOrders` (and all 6 other fetch hooks) | `useAppStore` (`store.js`) | `useAppStore((s) => s.currentBranch?.id) ?? null` folded into `queryKey` | ✓ WIRED | Confirmed by source read across all 7 hooks; TanStack cache-miss-on-new-key drives fresh fetch (relies on standard TanStack behavior, not custom code) |
| `unwrapSdkResult` | Phase 17's future `onError` | `err.code` as matchable string | ✓ WIRED for 6/7 hooks; ✗ NOT WIRED for `use-history-orders.js` | See Truth #3 |
| Mutation invalidation sites | Query cache | Exact `['<resource>', branchId]` prefix match (TanStack v5 prefix semantics) | ✓ WIRED | `14-REVIEW.md` independently confirms prefix-match reaches status-filtered variants without over-matching other branches |

### Anti-Patterns Found

None. Scanned all 12 modified/created source files (`data.jsx`, 7 hooks, `use-order-actions.js`, `screen-orders.jsx`, `screen-pos.jsx`, `screen-menu.jsx`) for `TBD`/`FIXME`/`XXX`/`TODO`/`HACK`/`PLACEHOLDER`/empty-implementation patterns — zero matches.

Independent code review (`14-REVIEW.md`, depth: standard) confirms branch-scoping mechanics are correctly implemented across all 12 files, and separately surfaces 2 Critical + 3 Warning + 2 Info findings — all pre-existing or explicitly out-of-scope for SCOPE-01 per 14-CONTEXT.md's own "Claude's Discretion" section (mutation error-unwrapping was explicitly deemed "a nice-to-have, not required" for this phase). Not phase-14 regressions:
- CR-01 (percent-discount unit mismatch) — pure business-logic bug in `screen-pos.jsx`/`data.jsx`, unrelated to branch scoping.
- CR-02 (mutations don't unwrap SDK envelope) — explicitly scoped out by 14-CONTEXT.md; relevant to Phase 17, not Phase 14.
- WR-01 (POS submit doesn't invalidate stats) — pre-existing incompleteness, not introduced by this phase's key-change work; the 14-04-PLAN.md's own D-04 scope for `screen-pos.jsx` explicitly lists only `['orders', branchId]`.

### Requirements Coverage

| Requirement | Source Plans | Description | Status | Evidence |
|---|---|---|---|---|
| SCOPE-01 | 14-01, 14-02, 14-03, 14-04 | All branch-scoped data re-scopes on switch; mutations invalidate only active branch; error codes matchable | ✓ SATISFIED (3/4 SC fully; SC3 partial, human decision requested) | See Observable Truths above |

No orphaned requirements: REQUIREMENTS.md maps only SCOPE-01 to Phase 14, and all 4 plans declare exactly `requirements: [SCOPE-01]`.

### Test Suite

- Full suite: `npx vitest run` → 541/542 passing, 37 test files (1 test file has the single failure).
- The sole failure (`src/__tests__/build-pipeline.test.js` — `bundle.createUpdaterArtifacts` expected `true`, actual `"v1Compatible"`) is confirmed pre-existing: `git diff bc2e75c HEAD -- src-tauri/tauri.conf.json src/__tests__/build-pipeline.test.js` is empty (zero changes to either file since phase start). Unrelated to SCOPE-01.
- In-phase regression (`offline-buttons.test.jsx` losing `QueryClientProvider` after `screen-orders.jsx` hoisted `useQueryClient()`) was caught and fixed at the post-merge gate (commit `0a33570`); re-ran independently — 3/3 passing.
- All new SC1/SC2/SC3/SC4 test files independently verified present, substantive (not stubs), and asserting the exact behaviors claimed in each plan's `must_haves.truths`.

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|---|---|---|---|
| unwrapSdkResult populates err.code on branch-error shapes | `npx vitest run src/__tests__/data-unwrap-sdk-result.test.js` | 3/3 pass | ✓ PASS |
| use-orders SC1 (branch-key change) + SC4 (null-branch immediate fetch) | `npx vitest run src/__tests__/use-orders.test.js` | 5/5 pass | ✓ PASS |
| use-order-actions SC2 (sibling branch untouched) | `npx vitest run src/__tests__/use-order-actions.test.js` | pass | ✓ PASS |
| Full workspace suite (run once) | `npx vitest run` | 541/542 pass | ✓ PASS (pre-existing unrelated failure documented) |
| No `resetQueries` anywhere | `grep -rn "resetQueries" src/` | zero matches | ✓ PASS |
| No unscoped queryKey outside `use-sse.js` (accepted deferral) / `use-branches.js` (not branch-scoped data) | `grep -rn "queryKey:\s*\[" src/` | confirmed | ✓ PASS |

### Human Verification Required

#### 1. SC3 completeness for `use-history-orders.js`

**Test:** Decide whether the documented exclusion of `use-history-orders.js` from the `unwrapSdkResult`/`err.code` mechanism is acceptable as delivered, or must be closed before Phase 17 lands.
**Expected:** A decision — either accept via a VERIFICATION.md override (given the strong, explicit rationale already on record in `14-03-PLAN.md` and `14-CONTEXT.md`: protecting the OPEN `windows-history-network-error` debug investigation from disruption), or request a small follow-up that adds `err.code` alongside the existing `.diagnostic` enrichment (additive, non-conflicting) so SC3 is uniformly true across all 7 branch-scoped resources.
**Why human:** This is a deliberate architectural trade-off made and documented at plan time, not a code defect discoverable by grep/tests alone — the evidence (absence of `.code`) is clear, but whether the trade-off is acceptable for phase-completion purposes is a product/timing judgment, particularly given Phase 17 (BERR) depends on Phase 14's `err.code` plumbing being complete across all branch-scoped fetches.

### Gaps Summary

No blocking gaps. The phase's core deliverable — branch-scoped cache keys across all 7 resources (SC1) and branch-scoped mutation invalidation (SC2, SC4) — is fully implemented, tested, and independently code-reviewed with no regressions. The one open item (SC3's narrow exclusion of `use-history-orders.js`) is a known, deliberate, well-documented trade-off surfaced for human sign-off rather than an implementation defect. Two pre-existing Critical defects were found by code review but are explicitly out of SCOPE-01's boundary per the phase's own planning documents and belong to later phases (Phase 17) or are unrelated to this phase's purpose entirely.

---

_Verified: 2026-07-22T18:53:36Z_
_Verifier: Claude (gsd-verifier)_
