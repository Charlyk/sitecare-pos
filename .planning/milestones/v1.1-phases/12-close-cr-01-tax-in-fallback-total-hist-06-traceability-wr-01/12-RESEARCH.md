# Phase 12: Close CR-01 tax-in-fallback-total + HIST-06 traceability + WR-01 popover - Research

**Researched:** 2026-07-19
**Domain:** Zustand session-state lifting (React/Vite/Tauri desktop app) + regression-test backfill + verification-doc correction
**Confidence:** HIGH

## Summary

This phase is 90% verification and paperwork, 10% code. The three audit-flagged bugs (CR-01/CR-02
tax+discount, WR-01 popover, G-07-1 Rust dead_code) were independently re-verified against the
current `master` tree in this research session and are **confirmed genuinely fixed** — not just per
CONTEXT.md's claim, but by direct inspection of `src/data.jsx`, `src/screen-history.jsx`,
`src-tauri/src/lib.rs`, a live `cargo check --lib` run (zero warnings), and a full `npx vitest run`
(481/484 passing, the 3 failures being the pre-existing, already-documented v1.0 items). No further
code work is needed on any of the three.

The one substantive code change — lifting History's period/status/type/search selection into a
session-only Zustand slice so it survives the History→detail→Back round-trip — is straightforward
and low-risk **provided the implementation preserves reference stability** the way `selectedOrder`/
`historyOrder` already do. The three things that can silently break if this is done carelessly are:
(1) the `settledPeriodRef` derived-during-render pattern (WR-03) comparing `selectedPeriod` by
strict object reference, (2) the `range` `useMemo` keyed on that same reference, and (3) the test
suite's `useAppStore` mock in `screen-history.test.jsx`, which currently hard-codes a fixed
`{ lang, pushToast }` object and will need every newly-selected field/setter added or the ~40
existing HistoryScreen render tests will destructure `undefined`.

A real discrepancy was found and must be resolved during the D-08 audit correction: the milestone
audit's "CR-01" (fallback total omits tax) does **not** match the phase's own origin document
(`10-REVIEW.md`), which calls the tax-omission bug **CR-02** and the percent-discount 100x bug
**CR-01**. The fix commits' own messages follow `10-REVIEW.md`'s original numbering, not the
audit's. This is purely a labeling collision (both bugs are fixed either way) but the audit
correction must not blindly copy CONTEXT.md's commit-to-CR mapping without flagging the swap.

**Primary recommendation:** Treat this as a verify-first phase. Do the store lift as the one
piece of net-new code (small, mechanical, high test-coverage risk if the mock isn't updated); do
everything else as read-verify-cite-correct, not re-implement.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| History period/filter/search selection continuity | Frontend (Zustand UI-state store) | — | Pure client-side UI state, no server round-trip; matches CLAUDE.md's "Zustand owns UI state" / "TanStack Query owns server state" split. Data itself (`useHistoryOrders`) stays in TanStack Query's cache, untouched by this phase. |
| Screen-transition reset policy (D-03) | Frontend (`store.js` `setScreen` action) | — | Single choke point: every screen change in the app (sidebar nav clicks, Back buttons, role-guard redirects) already routes through `setScreen`; verified by grep — `shell.jsx:96`, `app.jsx:200/209/258/270/333` all call it. |
| `normalizeOrder` fallback total/discount math (CR-01/CR-02) | Frontend (`src/data.jsx`, pure function) | — | Already fixed; this phase only adds regression-test coverage, no tier change. |
| WR-01 popover outside-click boundary | Frontend (`screen-history.jsx` component-local ref) | — | Already fixed; component-local `useRef`, no architectural change needed. |
| G-07-1 `table` field usage | Rust (Tauri backend, thermal print formatting) | — | Already fixed; verify-only, no JS/store involvement. |
| HIST-06 traceability | Documentation (`07-VERIFICATION.md`, `REQUIREMENTS.md` already correct) | — | Doc-only; no runtime tier. |

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Lift the History selection to the **Zustand store, session-only** — a new
  `historySelection` (or equivalent) slice holding `{ period, statusFilter, typeFilter, query }`,
  **not** added to `partialize` (mirrors `selectedOrder`/`historyOrder`). Idiomatic per CLAUDE.md
  ("Zustand owns UI state"). Survives the History→detail→Back round-trip; fresh on app restart.
  Rejected: persisting across restarts (a stale custom date range could reappear days later);
  lifting to `app.jsx` and prop-drilling (fights the "screens call their own hooks" convention).
- **D-02:** Preserve **everything** on Back — period + status + type + search. Back lands the user
  exactly where they were. Goes beyond the strict v1.1 "filter reset is accepted" deferral, but is
  the expected UX and makes Phase 8 SC4's "period intact" literally true.
- **D-03:** **Only the detail round-trip preserves.** Reset to defaults (30-day / All / All / empty)
  when leaving History for any other screen (Orders/KDS/POS). Mechanism: in the store's `setScreen`,
  keep `historySelection` when the target is `history` or `history-detail`, reset it otherwise. A
  fresh visit to History from elsewhere starts clean; the detail round-trip (which routes via
  `history-detail`) is preserved by construction.
- **D-04:** `selectedPeriod`, `statusFilter`, `typeFilter`, `query` (and its `debouncedQuery`
  derivation) currently live as component-local `useState` in `screen-history.jsx`. The
  `settledPeriodRef` derived-during-render pattern (WR-03) and the `range` `useMemo` must keep
  working after the lift — read initial state from the store, write changes back to it.
- **D-05:** Scope choice = **"Verify + backfill tests."** Treat CR-01/WR-01/G-07-1 as fixed; do not
  re-touch their code. Add the missing regression test for the CR-01 tax + percent-discount
  fallback in `normalizeOrder`; WR-01 and G-07-1 already have coverage.
- **D-06:** Backfill `normalize-order.test.js` (or a sibling) with cases exercising the **fallback
  total path** (`o.total` omitted → `subtotal + tax + deliveryFee + tip − discount`) and the
  **percent-discount branch** (`cRON`-converted, not 100× inflated).
- **D-07:** WR-01 also gets a **live check** (run the app, confirm re-clicking the open Custom pill
  closes the popover) since the audit claimed it "independently reproduced" — a human/live
  checkpoint closes the ambiguity even though code + tests already prove it.
- **D-08:** **Correct the audit file** (`v1.1-MILESTONE-AUDIT.md`) in place: mark CR-01, WR-01, and
  G-07-1 resolved with their commit SHAs (`7d9810b`/`30c89d8`, `033cc39`, `50492d5`), and re-derive
  the verdict.
- **D-09:** `REQUIREMENTS.md` is already correct (`HIST-06 → Phase 7 / 07-04, Complete`). The gap is
  in Phase 7 verification bookkeeping: `07-VERIFICATION.md` omits HIST-06 from its requirements
  table and its closing line (~101) wrongly states HIST-06 is "scoped to later phases (8-10)." Fix:
  add HIST-06 to the `07-VERIFICATION.md` table, correct the mis-statement, and add `HIST-06` to a
  Phase 7 SUMMARY `requirements-completed` field (07-04's).
- **D-10:** Run `/gsd-validate-phase 10` and `/gsd-validate-phase 11` to promote their draft
  VALIDATION.md to a real verdict. Coverage TODO, not a compliance failure — both phases are
  otherwise fully verified.

### Claude's Discretion

- Exact test file/case names and assertions for the D-06 regression tests.
- Exact store slice naming (`historySelection` vs individual keys) and setter shape — follow
  existing store idioms.
- Whether the audit re-derivation flips the frontmatter `status:` to `passed` or a qualified state
  depends on the Nyquist outcomes; use judgment against the re-derived facts.

### Deferred Ideas (OUT OF SCOPE)

- **3 pre-existing v1.0 test failures** ([INFO] in the audit): `build-pipeline.test.js` BILD-04 +
  `offline-buttons.test.jsx` ×2. Confirmed unrelated to v1.1. Leave deferred; note in the audit
  correction that they remain the only red in an otherwise-green suite.
- **`/gsd-complete-milestone`** — a next-step after Phase 12 verification, not part of this phase.
</user_constraints>

<phase_requirements>
## Phase Requirements

No REQ-IDs are formally assigned to Phase 12 in ROADMAP.md (`ROADMAP.md:220-229` is still a stub —
`Goal: [To be planned]`, `Requirements: TBD`). This is a tech-debt closeout, not a new-requirement
phase. Do not invent new REQ-IDs.

| ID | Description | Research Support |
|----|-------------|------------------|
| HIST-06 | Already `Complete` in REQUIREMENTS.md traceability (Phase 7 / 07-04) — this phase only fixes the orphaned tag in `07-VERIFICATION.md`'s requirements table and closing line, and backfills the tag into `07-04-SUMMARY.md`'s `requirements-completed` frontmatter. No new behavior. | Confirmed by direct read: `07-VERIFICATION.md:101` reads "HIST-04 and HIST-06 through HIST-12 are correctly scoped to later phases (8-10)" — this line is the mis-statement to correct. `07-04-SUMMARY.md:39` currently reads `requirements-completed: [HIST-05, HIST-13]` — HIST-06 is confirmed absent. |

The planner should NOT attach REQ-IDs to the historySelection state-lift work (D-01–D-04) or the
CR-01/WR-01/G-07-1 verification tasks (D-05–D-08) — those are tech-debt/quality items, not
requirements, per ROADMAP's stub and CONTEXT's scoping.
</phase_requirements>

## Standard Stack

No new libraries are introduced by this phase. The relevant existing stack:

### Core (already in use, verified installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| zustand | ^5.0.12 [VERIFIED: package.json] | UI-state store (screen, filters, session-only slices) | Already the project's sole UI-state layer per CLAUDE.md; D-01's `historySelection` slice is an additive field, not a new dependency |
| vitest | ^4.1.5 [VERIFIED: package.json] | Test runner for D-06 regression tests and any store/component test updates | Existing test infra; `npx vitest run` confirmed working (481/484 passing) |
| @testing-library/react | ^16.3.2 [VERIFIED: package.json] | Component render tests (`screen-history.test.jsx`) | Existing convention |

**No installation step needed for this phase.** `## Package Legitimacy Audit` is not applicable —
no new external packages are introduced.

### Alternatives Considered (rejected per CONTEXT.md, not re-litigated)
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Zustand session-only slice (D-01) | Persist to `partialize` | Rejected — a stale custom date range could reappear days later on app restart |
| Zustand session-only slice (D-01) | Lift to `app.jsx` + prop-drill | Rejected — fights the "screens call their own hooks" convention (CLAUDE.md) |

## Package Legitimacy Audit

Not applicable — this phase installs no external packages. `zustand`/`vitest`/`@testing-library/react`
are pre-existing project dependencies (verified present in `package.json`), not new additions.

## Architecture Patterns

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│  Sidebar nav click / Back button / role-guard redirect                │
│  (shell.jsx:96, app.jsx:200/209/258/270/333 — ALL routes go through)  │
└───────────────────────────────┬───────────────────────────────────────┘
                                 ▼
                      store.js: setScreen(target)
                                 │
             ┌───────────────────┴────────────────────┐
             │  ALWAYS: selectedOrder=null,            │
             │           historyOrder=null (unchanged) │
             │  NEW (D-03): if target is 'history' or  │
             │    'history-detail' → keep              │
             │    historySelection unchanged;           │
             │    else → reset historySelection to      │
             │    defaults (30-day/All/All/'')          │
             └───────────────────┬────────────────────┘
                                 ▼
                    Zustand store state updates
                                 │
      ┌──────────────────────────┴──────────────────────────┐
      ▼                                                       ▼
HistoryScreen mounts/re-renders                    app.jsx conditionally
(screen === 'history')                             renders HistoryScreen
      │                                             (unmounts entirely on
      │ reads historySelection.{period,             screen !== 'history')
      │ statusFilter, typeFilter, query}
      ▼
selectedPeriod/statusFilter/typeFilter/query
now sourced from store instead of local useState
      │
      ▼
range = useMemo(getPresetRange/customRange, [selectedPeriod])
      │
      ▼
useHistoryOrders({from,to}) → TanStack Query cache
['history-orders', from, to] (UNCHANGED — no query-key
shape change; from/to are primitive strings)
      │
      ▼
settledPeriodRef (WR-03, derived-during-render) advances
only on isSuccess && !isPlaceholderData — UNCHANGED logic,
just now comparing a store-sourced object reference
```

### Recommended Project Structure

No new files. Modify in place:
```
src/
├── store.js                         # add historySelection slice + setter(s) + D-03 conditional reset in setScreen
├── screen-history.jsx               # replace 4 local useState calls with store reads/writes (lines ~327, ~371-373)
├── __tests__/
│   ├── store.test.js                # add tests for historySelection default/reset/preserve behavior
│   ├── screen-history.test.jsx      # UPDATE the useAppStore mock (line 32) to include historySelection + setters
│   └── normalize-order.test.js      # ADD D-06 fallback-total + percent-discount regression tests
```

### Pattern 1: Session-only Zustand slice (existing precedent to mirror exactly)

**What:** A store field excluded from `partialize`, set by an action, reset by `setScreen`.
**When to use:** Any UI state that must survive a same-screen-family route change but not an app
restart — this project's established idiom (`selectedOrder`, `historyOrder`).
**Example — the pattern already in `store.js` to mirror:**
```javascript
// Source: src/store.js:53-54, :66, :87-95 (current shipped code, verified this session)
selectedOrder: null,     // Set by openOrder(); consumed by screen-detail
historyOrder: null,      // Set by openHistoryOrder(); consumed by screen-detail in readOnly mode

setScreen: (screen) => set({ screen, selectedOrder: null, historyOrder: null }),

// partialize (persisted keys only — historySelection must NOT appear here):
partialize: (state) => ({
  screen: state.screen,
  role: state.role,
  lang: state.lang,
  accent: state.accent,
  density: state.density,
  sidebarCollapsed: state.sidebarCollapsed,
}),
```

**D-01/D-03 extension — the new field + the conditional reset:**
```javascript
// Additive to store.js — historySelection is a NEW top-level state key, session-only.
historySelection: {
  period: { id: '30' },      // mirrors screen-history.jsx's current useState default
  statusFilter: 'all',
  typeFilter: 'all',
  query: '',
},

// setScreen must keep the UNCONDITIONAL selectedOrder/historyOrder reset (existing, tested
// behavior — src/__tests__/store.test.js:144 "setScreen resets both selectedOrder and
// historyOrder to null" must keep passing unchanged) and ADD a conditional reset scoped to
// historySelection only:
setScreen: (screen) => set((s) => ({
  screen,
  selectedOrder: null,
  historyOrder: null,
  historySelection: (screen === 'history' || screen === 'history-detail')
    ? s.historySelection
    : { period: { id: '30' }, statusFilter: 'all', typeFilter: 'all', query: '' },
})),

setHistorySelection: (patch) => set((s) => ({
  historySelection: { ...s.historySelection, ...patch },
})),
```

**Critical implementation detail (not spelled out in CONTEXT, discovered this session):** the
`setHistorySelection` merge MUST be a shallow merge of only the changed key (`{ ...s.historySelection,
period: newPeriod }`, not a full object rebuild), so that selecting `historySelection.statusFilter`
in a status-only update does not also produce a new `period` reference. `screen-history.jsx`'s
`range` useMemo (dep: `[selectedPeriod]`) and the `settledPeriodRef` comparison
(`settledPeriodRef.current !== selectedPeriod`) both use strict object-reference equality on the
period value — if every filter/search keystroke also reallocated the `period` field, `range` would
recompute needlessly on every keystroke (wasteful, not a correctness bug, since the actual
`useHistoryOrders` queryKey is `['history-orders', from, to]` — primitive strings, so TanStack Query
itself will not refetch on a reference-only change — but it is still worth avoiding).

### Pattern 2: Selector discipline (existing codebase convention — no `shallow`/`useShallow` in use)

**What:** Every existing `useAppStore` call site (`app.jsx` has 15+) selects exactly one primitive
or one stable object field per call — never an inline-constructed object literal
(`useAppStore(s => ({a: s.a, b: s.b}))`), because Zustand's default comparator is `Object.is` and an
inline literal is a new reference on every render, which either causes redundant re-renders or (in
combination with a `useMemo`/`useEffect` dependency reading that value) redundant recomputation.
**When to use:** All new `screen-history.jsx` reads of `historySelection` fields.
**Example:**
```javascript
// Recommended — one selector per field, matching app.jsx's existing convention:
const historySelection = useAppStore((s) => s.historySelection);
const setHistorySelection = useAppStore((s) => s.setHistorySelection);
// screen-history.jsx then destructures locally:
const { period: selectedPeriod, statusFilter, typeFilter, query } = historySelection;
```
This is a single selector for the whole `historySelection` object (safe — it's a real store field,
not a literal reconstructed per call), matching the codebase's existing one-selector-per-field style
while avoiding 4 separate subscriptions to the same object.

### Anti-Patterns to Avoid

- **Inline object-literal selectors:** `useAppStore(s => ({ period: s.historySelection.period,
  status: s.statusFilter }))` — creates a new object every render regardless of store change,
  defeats Zustand's reference-equality re-render skip. Select the whole `historySelection` object
  (a real, stable store field) instead.
- **Converting `settledPeriodRef`'s derived-during-render pattern to `useEffect`:** explicitly
  called out by WR-03 in the existing code comments (`screen-history.jsx:339-346`) as previously
  causing a stale-numbers-next-to-new-label flash. Do not "clean this up" while touching the
  surrounding code — leave the ref-during-render mechanism untouched.
- **Resetting `debouncedQuery` to `''` on remount:** if `query` is restored from the store on
  History remount but `debouncedQuery` is re-initialized to `''` (its current default), the visible
  list will briefly show unfiltered results before the 250ms debounce effect catches up to the
  restored `query`. Initialize `debouncedQuery`'s local `useState` from the restored `query` value
  (`useState(() => historySelection.query)`), not from `''`, so results are correct on the very
  first post-Back render.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Session-only cross-mount state | A new context provider, a module-level mutable variable, or `sessionStorage` | The existing Zustand store, `partialize`-excluded (D-01) | One state ownership pattern in the whole app; a second mechanism (context/module-global/sessionStorage) would be an unexplained divergence from the `selectedOrder`/`historyOrder` precedent and from CLAUDE.md's "Zustand owns UI state" rule |
| Screen-transition reset logic | A `useEffect` in `screen-history.jsx` watching `screen` and resetting itself on unmount | The existing single `setScreen` choke point in `store.js` (D-03) | `setScreen` is already the one place every screen transition passes through (verified: `shell.jsx:96`, `app.jsx:200,209,258,270,333`); a component-local effect would be a second, less-reliable enforcement point that fires on unmount timing, not on transition intent |

**Key insight:** This app already has exactly one pattern for "state that must survive within a
screen family but reset elsewhere" (`selectedOrder`/`historyOrder`), and exactly one choke point for
"screen changed" (`setScreen`). The correct move for D-01/D-03 is composition with both existing
mechanisms, not a new one.

## Common Pitfalls

### Pitfall 1: Test mock desync — `screen-history.test.jsx`'s `useAppStore` mock is a fixed literal

**What goes wrong:** `src/__tests__/screen-history.test.jsx:31-32` currently mocks the entire store
as `vi.fn((selector) => selector({ lang: 'ro', pushToast: pushToastMock }))`. Any new
`useAppStore(s => s.historySelection)` or `useAppStore(s => s.setHistorySelection)` call inside
`HistoryScreen` will invoke this same mock against that same fixed object, returning `undefined` for
both. Destructuring `undefined.period` (or similar) throws, breaking the ~40 existing HistoryScreen
render tests immediately, unrelated to any actual regression.
**Why it happens:** The mock predates this phase's state lift; it only anticipated `lang` and
`pushToast` because those were the only two fields `HistoryScreen` read from the store before D-01.
**How to avoid:** Update the mock object to include `historySelection: { period: {id:'30'},
statusFilter:'all', typeFilter:'all', query:'' }` and a working `setHistorySelection: vi.fn()` (or a
mutable-in-place stub if tests need to assert on calls) as part of the SAME commit/task that does
the store lift — not as an afterthought. Re-run the full `screen-history.test.jsx` suite immediately
after the store-lift edit, before moving on to other tasks.
**Warning signs:** `TypeError: Cannot read properties of undefined (reading 'period')` (or similar)
in previously-green HistoryScreen tests immediately after the store-lift edit.

### Pitfall 2: CR-01/CR-02 label swap between the audit and the origin review

**What goes wrong:** `v1.1-MILESTONE-AUDIT.md` (and this phase's own CONTEXT.md, which inherited the
audit's numbering) call the **fallback-total-omits-tax** bug "CR-01". But the bug's origin document,
`.planning/phases/10-filters-search/10-REVIEW.md`, defines **CR-01 as the percent-discount 100x
bug** (`10-REVIEW.md:45`) and **CR-02 as the tax-omission bug** (`10-REVIEW.md:67`). The fix commits
follow `10-REVIEW.md`'s original numbering, not the audit's: `7d9810b` is titled `fix(10): CR-02
include tax in normalizeOrder fallback total`, and `30c89d8` is titled `fix(10): CR-01 convert
percent-type discount from cents to RON` — the reverse of what CONTEXT.md implies when it says
"CR-01 ... Fixed — `7d9810b` (tax) + `30c89d8` (sibling percent-discount ...)".
**Why it happens:** The milestone audit (commit `3879182`) apparently re-numbered or mis-transcribed
the two review findings when writing its own tech-debt list, and this phase's CONTEXT.md carried
that numbering forward without cross-checking against `10-REVIEW.md`.
**How to avoid:** When correcting `v1.1-MILESTONE-AUDIT.md` (D-08), cite BOTH bugs by their fix
commit SHAs and a one-line description (tax-omission fixed by `7d9810b`; percent-discount-100x fixed
by `30c89d8`) rather than by a bare "CR-01"/"CR-02" label, OR add an explicit footnote noting the
audit's numbering diverges from `10-REVIEW.md`'s. Do not silently perpetuate one numbering as if it
were uncontested — a future reader diffing the audit against `10-REVIEW.md` will otherwise conclude
one of the two bugs was never actually fixed.
**Warning signs:** Any documentation edit that writes "CR-01: tax fixed by 7d9810b" without
qualification will directly contradict `10-REVIEW.md`'s own CR-01 definition if a reader opens both
files side by side.

### Pitfall 3: `setScreen`'s existing unconditional reset test must still pass

**What goes wrong:** `src/__tests__/store.test.js:144-152` (`'setScreen resets both selectedOrder
and historyOrder to null'`) calls `setScreen('history')` and asserts `selectedOrder`/`historyOrder`
are both null — this is the SAME target (`'history'`) that D-03 says should PRESERVE
`historySelection`. It would be easy to conflate "preserve historySelection" with "preserve
everything" and accidentally stop resetting `selectedOrder`/`historyOrder` too.
**Why it happens:** D-03's wording ("keep `historySelection` when the target is `history` or
`history-detail`") is about ONE new field; the unconditional reset of `selectedOrder`/`historyOrder`
is unrelated, pre-existing, tested behavior that must NOT change.
**How to avoid:** Write the `setScreen` update as an ADDITIVE conditional field on top of the
existing unconditional reset (see Pattern 1's code example above) — never restructure the existing
`selectedOrder: null, historyOrder: null` reset into anything conditional.
**Warning signs:** `store.test.js:144-152` failing after the D-03 change is a direct signal the
conditional logic was applied to the wrong fields.

### Pitfall 4: `debouncedQuery` re-initialization on remount (D-02/D-04 completeness gap)

**What goes wrong:** If only `query` (not `debouncedQuery`) is restored from the store on
`HistoryScreen` remount, and `debouncedQuery`'s local `useState('')` keeps its current empty-string
default, the visible/filtered list on first render post-Back will not reflect the restored search
text until the 250ms debounce effect fires — a visible flash of the wrong (unfiltered) result set,
undermining D-02's "Back lands the user exactly where they were" guarantee for the search field
specifically.
**Why it happens:** CONTEXT.md's D-04 mentions "its `debouncedQuery` derivation" must "keep working"
but doesn't spell out the remount-initialization detail — this is a gap this research session
identified by reading the actual debounce effect (`screen-history.jsx:379-386`).
**How to avoid:** Initialize `debouncedQuery`'s local state from the restored `query` value
(`useState(() => historySelection.query)`) rather than from `''`, so the two are already in sync on
the very first render after remount.
**Warning signs:** A UAT/manual check where typing text, navigating to detail, and clicking Back
shows a one-frame flash of unfiltered rows before the search re-applies.

## Code Examples

### Verified: `normalizeOrder`'s current (fixed) fallback-total + discount logic — D-06 test target

```javascript
// Source: src/data.jsx:200-216 (current shipped code, read and confirmed fixed this session)
const discountType = o.discountType ?? null;
const rawDiscountAmt = o.discountAmount ?? 0;
const discount = rawDiscountAmt === 0 ? 0
  : discountType === 'percent'
    ? +(cRON(o.subtotal) * rawDiscountAmt / 10000).toFixed(2)
    : cRON(rawDiscountAmt);

const subtotal    = cRON(o.subtotal);
const deliveryFee = cRON(o.deliveryFee);
const tax         = o.tax != null ? cRON(o.tax) : 0;
const tip         = o.tip != null ? cRON(o.tip) : 0;
// Use server total when available — authoritative. Fall back to recomputing from components.
const total = o.total != null
  ? cRON(o.total)
  : +(subtotal + tax + deliveryFee + tip - discount).toFixed(2);
```

**D-06 regression test targets (add to `src/__tests__/normalize-order.test.js`):**
1. `o.total` absent, `o.tax` present, `o.subtotal`/`o.deliveryFee` present, no discount → assert
   `result.total === subtotal + tax + deliveryFee` in RON (not cents, not omitting tax).
2. `o.total` absent, `discountType: 'percent'`, `discountAmount` in the SDK's percent-encoding →
   assert the discount is NOT 100x inflated (e.g., a 10% discount on a 9600-cent/96 RON subtotal
   must yield `9.60`, not `960`, per `10-REVIEW.md:57`'s own worked example).
3. Combine both (tax present AND percent discount present) in the fallback path, asserting the
   final `total` is internally consistent with the same `discount`/`tax` values the test also
   asserts individually — this closes the exact CR-01/CR-02 gap the milestone audit flagged as
   untested (`10-REVIEW.md:57`: "Completely untested — `normalize-order.test.js` never exercises
   `discountType`/`discountAmount` at all").

### Verified: existing session-only store test pattern to extend (`store.test.js`)

```javascript
// Source: src/__tests__/store.test.js:112-161 (existing HIST-01 describe block, read this session)
describe('HIST-01: openHistoryOrder / historyOrder / setScreen reset (D-07, D-08)', () => {
  beforeEach(() => {
    useAppStore.setState({ selectedOrder: null, historyOrder: null, screen: 'orders' })
  })
  // ... existing tests using useAppStore.getState()/.setState() directly against the REAL store
  // (only @tauri-apps/plugin-store is mocked) — this is the pattern to follow for new
  // historySelection tests, not a fully-mocked useAppStore.
})
```
Recommended new `store.test.js` cases (Claude's discretion on exact names): `historySelection`
defaults on fresh store; `setHistorySelection` merges a single key without disturbing siblings
(direct test of the Pitfall-1-adjacent reference-stability concern); `setScreen('history')`
preserves `historySelection`; `setScreen('history-detail')` preserves `historySelection`;
`setScreen('orders')` (or any non-history target) resets `historySelection` to defaults;
`setScreen` still resets `selectedOrder`/`historyOrder` to null regardless of target (guards
against Pitfall 3).

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|---------------|--------|
| `selectedPeriod`/`statusFilter`/`typeFilter`/`query` as `screen-history.jsx` component-local `useState` | Session-only Zustand `historySelection` slice, store-owned | This phase (D-01) | Survives History→detail→Back; still resets to defaults on any other screen exit (D-03) |
| Milestone verdict candidate | `tech_debt` (per stale audit, commit `3879182`) → re-derivable to `passed` once this phase's items land (D-08, D-10) | This phase | Downstream: `/gsd-complete-milestone` becomes viable once Phase 12 verification completes |

**Deprecated/outdated:** The audit's characterization of CR-01/WR-01/G-07-1 as "still OPEN" is
outdated as of this research session — all three are confirmed fixed on `master` (see Verification
below). Do not re-derive fixes for them; only correct the audit's status field and citations.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | The exact shape `{ period, statusFilter, typeFilter, query }` is the right `historySelection` field naming — CONTEXT.md leaves exact naming to Claude's discretion. This research recommends matching the existing local variable names (`period` for what's currently called `selectedPeriod`, to avoid a `selectedPeriod`-vs-`period` naming collision inside the same component). | Architecture Patterns / Pattern 1 | Low — purely a naming choice, does not affect behavior; the planner/executor can rename freely as long as usage is consistent |
| A2 | `debouncedQuery` should be re-initialized from the restored `query` on remount (Pitfall 4) — this refinement is not explicitly stated in CONTEXT.md's D-04, it was inferred from reading the debounce effect's actual code. | Common Pitfalls / Pitfall 4 | Medium if skipped — a one-frame flash of unfiltered results on Back, a minor UX regression relative to D-02's stated intent, but not a functional break |

**If this table is empty:** N/A — see above; both entries are LOW-MEDIUM risk implementation
refinements, not disputed facts. All bug-fix-status claims (CR-01/CR-02/WR-01/G-07-1) were directly
verified against source and tool output in this session, not assumed.

## Open Questions

1. **Does the audit correction (D-08) need to explicitly reconcile the CR-01/CR-02 numbering swap,
   or is it acceptable to just cite commit SHAs and descriptions without relabeling?**
   - What we know: Both bugs are fixed; the commits' own messages use `10-REVIEW.md`'s original
     CR-01(discount)/CR-02(tax) numbering, while the audit and this phase's title use CR-01(tax).
   - What's unclear: Whether "closing CR-01" in this phase's title/scope should be read as closing
     the audit's CR-01 (tax) specifically, or whether the correction should also fix the numbering
     inconsistency for future readers.
   - Recommendation: Cite both fixes by commit SHA + one-line description in the audit correction
     (Pitfall 2's approach) rather than relabeling anything — this satisfies D-08's literal
     instruction ("mark CR-01, WR-01, and G-07-1 resolved with their commit SHAs") without asserting
     a numbering correction that CONTEXT.md didn't ask for.

2. **Does Phase 12 need its own VALIDATION.md / Nyquist entry, given the phase is itself largely a
   verification/doc-correction exercise?**
   - What we know: `workflow.nyquist_validation` is `true` in `.planning/config.json` (not disabled),
     so the Validation Architecture section below applies by default.
   - What's unclear: Whether the plan-checker will expect meaningful "Wave 0 gaps" given most of the
     phase's work IS the verification (D-10 runs `/gsd-validate-phase` on Phases 10/11, not Phase 12
     itself).
   - Recommendation: Keep Phase 12's own validation light — the one piece of genuinely new
     behavior (D-01–D-04's store lift) gets real automated tests (store.test.js + updated
     screen-history.test.jsx); D-05–D-10 are verification/documentation tasks with their own
     built-in evidence trail (commit SHAs, live checks, `/gsd-validate-phase` output) rather than
     needing a separate test-coverage map.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest ^4.1.5 + @testing-library/react ^16.3.2 (already configured, confirmed via `package.json` and a live `npx vitest run`) |
| Config file | `vitest.config.js` |
| Quick run command | `npx vitest run src/__tests__/store.test.js src/__tests__/normalize-order.test.js src/__tests__/screen-history.test.jsx` |
| Full suite command | `npx vitest run` |

### Phase Requirements -> Test Map

No formal REQ-IDs apply (see `<phase_requirements>`); mapping instead to this phase's decision IDs:

| Item | Behavior | Test Type | Automated Command | File Exists? |
|------|----------|-----------|-------------------|-------------|
| D-01/D-03 | `historySelection` preserved across `setScreen('history'/'history-detail')`, reset otherwise | unit | `npx vitest run src/__tests__/store.test.js` | ✅ file exists, add new `describe` block |
| D-01/D-04 | `HistoryScreen` reads/writes `historySelection` correctly; existing render behavior (loading/error/empty/populated, period switching, WR-03 settled-period timing) unregressed | component | `npx vitest run src/__tests__/screen-history.test.jsx` | ✅ file exists, mock MUST be updated (Pitfall 1) before this can pass |
| D-06 | `normalizeOrder` fallback total includes tax; percent discount not 100x inflated | unit | `npx vitest run src/__tests__/normalize-order.test.js` | ✅ file exists, add new `describe` block |
| D-07 | WR-01 popover live-check | manual/human checkpoint | N/A — run the app, click the Custom pill twice | N/A (manual-only) |
| G-07-1 verify | `cargo check --lib` reports zero warnings | build check | `cd src-tauri && cargo check --lib` | N/A — already confirmed clean this session |

### Sampling Rate
- **Per task commit:** the quick-run command above (subset of 3 files, ~2-3s)
- **Per wave merge:** `npx vitest run` (full suite, ~3s, expect 481/484 — same 3 pre-existing
  failures, no new failures)
- **Phase gate:** Full suite at 481+/484 (484 + however many new D-06/store tests are added) before
  `/gsd-verify-work`; the 3 pre-existing failures are the ONLY acceptable red

### Wave 0 Gaps

None — existing test infrastructure (Vitest, @testing-library/react, the `store.test.js` real-store
pattern, the `screen-history.test.jsx` mocked-store pattern) fully covers this phase's needs. The
only required action is updating the existing `screen-history.test.jsx` mock (Pitfall 1), not
installing new infrastructure.

## Security Domain

Not applicable in any load-bearing way — this phase touches only client-side UI-state plumbing
(Zustand), a pure math function (`normalizeOrder`, already fixed, now gaining test coverage), and
documentation. No new input surface, no new auth/session boundary, no new cryptography. The
`historySelection.query` field is free-text search input that was ALREADY rendered/filtered
client-side before this phase (Phase 10, `matchesSearch`) — lifting its storage location does not
change its trust boundary or introduce a new injection surface (it is never sent to the server; all
filtering is client-side per REQUIREMENTS.md's "Out of Scope: Server-side filtering / search").

| ASVS Category | Applies | Standard Control |
|---------------|---------|-------------------|
| V5 Input Validation | No new surface | Unchanged — `query` was already free text filtered client-side pre-phase |
| V2/V3/V4/V6 | No | No auth, session, access-control, or cryptography surface touched by this phase |

## Sources

### Primary (HIGH confidence — direct source-file / tool-output verification this session)
- `src/data.jsx:190-229` — read directly; confirms CR-01/CR-02 fix present (tax included in fallback
  total; percent discount uses `cRON(o.subtotal) * rawDiscountAmt / 10000`, not 100x inflated)
- `src/screen-history.jsx:316-420` (period/filter/search state), `:585-705` (`CustomRangePopover`),
  `:707-815` (`FilterBar`, `customWrapperRef` WR-01 fix) — read directly, confirms all cited line
  ranges in CONTEXT.md are accurate to within a few lines
- `src/store.js` (full file, 99 lines) — read directly; confirms `persist`/`partialize`/`setScreen`
  structure exactly as CONTEXT.md describes
- `src/app.jsx:230-300`, and `grep` of `setScreen`/`useAppStore` call sites across `app.jsx` and
  `shell.jsx` — confirms `setScreen` is the single choke point for all screen transitions
- `src-tauri/src/lib.rs:53-72` and `:240-270` — read directly; confirms `table` field is read
  (G-07-1 fixed)
- `cd src-tauri && cargo check --lib` — run this session; zero warnings, confirming G-07-1
- `npx vitest run` (full suite) — run this session; `Test Files 2 failed | 28 passed (30)`,
  `Tests 3 failed | 481 passed (484)` — exact match to the audit's "481/484 at Phase 11 tip" claim
- `git show --stat -1 <sha>` for `7d9810b`, `30c89d8`, `033cc39`, `50492d5` — run this session;
  confirms all four commits exist, touch the claimed files, and (for the first two) reveals the
  CR-01/CR-02 label swap documented in Pitfall 2
- `src/__tests__/normalize-order.test.js` (full file) — read directly; confirms zero existing
  coverage of `discountType`/`discountAmount`/fallback-total paths (D-06's gap is real)
- `src/__tests__/screen-history.test.jsx:1-46, 570-645` — read directly; confirms the fixed-literal
  `useAppStore` mock (Pitfall 1) and the existing 3-test WR-01 coverage
- `src/__tests__/store.test.js` (full file) — read directly; confirms the real-store test pattern
  and the existing unconditional-reset test that must not be broken (Pitfall 3)
- `src/use-history-orders.js` (full file) — read directly; confirms queryKey uses primitive
  `from`/`to` strings, not object references, de-risking the reference-stability concern
- `.planning/phases/07-history-screen-foundation/07-VERIFICATION.md:91-101` — read directly;
  confirms the exact mis-statement text for D-09
- `.planning/phases/07-history-screen-foundation/07-04-SUMMARY.md:39` — read directly; confirms
  `requirements-completed: [HIST-05, HIST-13]`, HIST-06 absent
- `.planning/phases/10-filters-search/10-REVIEW.md:45,57,67` — read directly; source of the
  CR-01(discount)/CR-02(tax) original numbering
- `.planning/phases/10-filters-search/10-VALIDATION.md`, `.planning/phases/11-reprint-csv-export/11-VALIDATION.md` — read directly; both confirm `status: draft`, `nyquist_compliant: false` (D-10's target)
- `.planning/ROADMAP.md:220-229` — read directly; confirms Phase 12 is still an unplanned stub
- `.planning/config.json` — read directly; confirms `workflow.nyquist_validation: true`

### Secondary (MEDIUM confidence)
- None — no external/web sources were needed for this phase; it is entirely internal-codebase
  verification.

### Tertiary (LOW confidence)
- None.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new dependencies, all versions confirmed against `package.json`
- Architecture: HIGH — the store-lift pattern directly mirrors existing, tested, shipped code
  (`selectedOrder`/`historyOrder`) verified in this session
- Pitfalls: HIGH — all four pitfalls were derived from directly reading the actual current
  implementation and test files, not inferred from documentation alone

**Research date:** 2026-07-19
**Valid until:** Effectively permanent for this phase's scope (internal codebase state, not an
external API/library surface) — re-verify only if `master` receives further commits touching
`src/data.jsx`, `src/screen-history.jsx`, `src/store.js`, or the audit/verification docs before this
phase executes.
