# Phase 10: Filters + Search - Research

**Researched:** 2026-07-17
**Domain:** Client-side array filtering, faceted counts, debounced search — React/Vitest, no new dependencies
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Status pill counts respect ALL other active filters (type + search). A count always answers "how many rows do I get if I click this?"
- **D-02:** Exclude-self faceting — each status count is computed against type + search but NOT the status selection. `All` count = matches of type + search alone. ⚠ Load-bearing: two derived sets, one pass apart — a single `visible.filter(...)` cannot produce both.
- **D-03:** A zero-count pill stays clickable and reads `0`; clicking yields the filtered empty state. Rejected: disable-at-zero.
- **INVARIANT:** the three status buckets partition the list exactly (`deriveDisplayStatus` never returns `null` on the finished-only list; refunded takes outright precedence).
- **D-04:** The four summary tiles recompute for the FILTERED set, not the period. `computeSummary` already accepts any list — change of input only.
- **D-05:** Accepted consequence — under `status = Completed`, Refunds tile reads `0 · 0 canceled` and can only ever read zero. No per-tile carve-out.
- **D-06:** The tile sub-label stays the PERIOD label only (`P9 D-12` verbatim) — does not name active filters.
- **D-15:** The Avg tile shows a computed zero whenever `completedCount === 0` without an error. Gating condition must change from `isEmptyState` to "not an error" (`isError`).
- **D-07:** Port the design's bar structure — nest search + export together in ONE `marginLeft: auto` container so they wrap to row 2, right-aligned, with the three pill groups on row 1. Production's current structure will NOT produce this without a nesting change.
- **D-08:** Fix the SDK `'local'` → UI `'dinein'` mapping in `normalizeOrder` (`src/data.jsx:222`), at the boundary — inverting `screen-pos.jsx:12`'s outbound `orderTypeMap` so `'dinein'` is the single app-wide type vocabulary in both directions. Fixes HIST-08 AND the live Orders defect (F-02) in one line. Rendering is unaffected (`typeMeta` has no `'local'` key, already falls through to `map.dinein`). Accepted cost: touches the shared live-order path — Orders, KDS, and detail need a regression check.
- **D-09:** Search matches what the row actually renders — `dailyOrderNumber` OR the `id[0:8]` fallback (`orderNumberLabel`) plus `customer.name`. No row unreachable by the text printed on it.
- **D-10:** 250ms debounce on typing; clearing/emptying the box applies immediately, no delay.
- **D-11:** Fold diacritics — normalize both query and name (NFD + strip combining marks) so `Radulescu` matches `Rădulescu`. Pure helper in `history-utils.js` with direct unit tests. Diverges from `screen-orders.jsx`'s plain `.toLowerCase().includes()` (deliberate, deferred elsewhere).
- **D-12:** Status, type, and search ALL survive a period switch (independent axis from `P9 D-04`'s custom-range-clear-on-preset).
- **D-13:** Two distinct empty-state variants. No filters active → `P9 D-13`'s period copy, unchanged (main line). Filters active → new copy naming the real cause on the MAIN line (not just the sub-line `P7 D-13` reserved).
- **D-14:** The filter-active empty-state variant carries a Clear Filters button. Resets status, type, and search — NOT the period.

### Claude's Discretion

- Where filter state lives — local `useState` in `screen-history.jsx`, colocated with `P9`'s period state. Bound: must NOT be keyed to the range (D-12 requires survival across period switch); reset-on-navigation is accepted.
- How the two derived sets in D-02 are computed — one memo chain vs. two, and where the count pass sits. Constraint: both sets must exist.
- Debounce implementation — hand-rolled `useEffect` + timer vs. a small hook. No debounce utility exists in the codebase today.
- Whether the status pill order is corrected to the design's All / Completed / Refunded / Canceled (production's inert bar has the last two swapped — F-03). Design is authoritative per project convention → correct it.
- The type group's distinct selected styling — cream `#f7f1e1` + primary-green text, ported as drawn.
- Exact `h_empty_*` key naming for D-13's second variant — check for pre-existing keys first (duplicate-key issue hit twice in v1.0).

### Deferred Ideas (OUT OF SCOPE)

- Diacritic folding for the live Orders screen's search (`screen-orders.jsx:188-191`) — deliberate divergence, not drift.
- Debounce for the live Orders screen's search — same file, same reasoning, undebounced today.
- Extracting a shared filter-predicate module across `screen-orders.jsx` and `screen-history.jsx` — premature until a third caller appears.
- Naming the active filters in the empty-state copy — rejected on ro/en composition grounds.
- Multi-select filters (e.g. Delivery *and* Pickup at once) — out of scope, would change D-02's faceting math.
- Persisting filters across navigation — reset-on-leave accepted for v1.1.
- Design-system popover primitive — not pulled into this phase (no popover here).
- List virtualization — unchanged by this phase; filtering does NOT reduce the fetched array, only what renders. A 366-day fetch is still fully in memory and count passes traverse it on every debounced keystroke.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| HIST-07 | Filter by status — All / Completed / Refunded / Canceled — each showing a live count | `deriveDisplayStatus` (history-utils.js:82) already gives the exact vocabulary and precedence; the two-derived-set faceted-count pattern (Pattern 1) satisfies D-01/D-02; F-03 pill-order correction confirmed against both production (`screen-history.jsx:305-310`) and design source (`screen-history.jsx:161-165`) |
| HIST-08 | Filter by order type — All / Delivery / Pickup / Dine-in (`orderType: 'local'` maps to Dine-in) | D-08's one-line `normalizeOrder` fix (`src/data.jsx:222`) confirmed as the correct and only boundary fix; regression surface fully traced (Runtime State Inventory below) — the type-filter predicate itself is a plain `order.type === selected` equality once the boundary fix lands |
| HIST-09 | Search by order number or customer name — debounced, client-side | D-09's search predicate (`orderNumberLabel` parity — dailyOrderNumber or id[0:8] fallback — plus `customer.name`), D-10's 250ms/immediate-clear debounce pattern (Pattern 2), D-11's diacritic-folding helper (Pattern 3) — all pure, unit-testable in `history-utils.js` |
</phase_requirements>

## Summary

This phase has almost no open technical questions — `10-CONTEXT.md` is exceptionally thorough and settles architecture, faceting math, bar structure, and the D-08 boundary fix. What remains for the planner is: (1) a Validation Architecture test map so `VALIDATION.md` can be generated (this phase is the first of the milestone with three brand-new pure predicates — status, type, and a diacritic-folding search — plus a genuinely new derived-data shape, the type+search-only count list, that has no existing test coverage to extend); (2) confirmation that the 250ms debounce is safe to hand-roll with a plain `useEffect` + `setTimeout` (no library, no existing precedent in this codebase to reuse); (3) a full trace of every file that consumes `normalizeOrder` so the D-08 regression surface is enumerated, not just described; and (4) confirmation of the exact two-container-to-one-container DOM restructuring `D-07` requires in `screen-history.jsx`'s `FilterBar`.

All four are now confirmed. No new npm packages are needed — every mechanism (memoized array filters, `useEffect`-based debounce, `String.prototype.normalize('NFD')` diacritic stripping) is either already in the dependency tree (React) or a native JS platform API verified present in the target Node/browser runtime. The Package Legitimacy Gate is not applicable to this phase.

**Primary recommendation:** Extract three pure predicates into `history-utils.js` (`matchesStatus`, `matchesType`, a `foldDiacritics`-backed `matchesSearch`), compute two derived arrays in `screen-history.jsx` via a single `useMemo` chain (`byTypeAndSearch` → feeds counts; `visible` = `byTypeAndSearch` further filtered by status → feeds rows/day-groups/summary), hand-roll the 250ms debounce with `useEffect`+`setTimeout`+cleanup (immediate apply on clear), and land the `normalizeOrder` one-liner fix with a regression test asserting `type: 'local'` input yields `type: 'dinein'` output, plus a spot-check that `screen-orders.jsx`'s live type filter and `screen-kitchen.jsx`'s rendering are both unaffected by the change (both already fall through the same `map.dinein` default before and after).

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Status/type/search filter predicates | Client (React component + pure utils) | — | `ListAdminOrdersData` has no filter/search params — filtering can only happen on the already-fetched array in the renderer |
| Faceted count computation (D-01/D-02) | Client (React component, memoized) | — | Same array, same tier; a second derived list, not a second fetch |
| Debounce timing (D-10) | Client (React component, `useEffect`) | — | Governs render churn only, not network — there is no network call to debounce |
| Diacritic folding (D-11) | Client (pure util in `history-utils.js`) | — | Pure string transform, no I/O, belongs in the SDK-free/React-free derivation layer per the module's own header contract |
| `normalizeOrder` type-mapping boundary fix (D-08) | Client (data-normalization layer, `src/data.jsx`) | — | The single point where every raw SDK order (list, SSE, detail) crosses into the app's internal vocabulary — the correct and only place to fix a vocabulary mismatch |
| Filter bar restructuring (D-07) | Client (presentation component) | — | Pure layout/DOM nesting change, no data implications |

## Standard Stack

### Core

No new libraries. This phase is 100% built from what is already installed:

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | ^18.3.1 [VERIFIED: package.json] | `useState`/`useMemo`/`useEffect` for filter state, derived arrays, and debounce timer | Already the app's sole UI framework |
| Vitest | ^4.1.5 [VERIFIED: package.json] | Unit tests for the three new pure predicates + the diacritic-folding helper | Already the app's sole test runner |
| `@testing-library/react` | ^16.3.2 [VERIFIED: package.json] | Integration tests for `HistoryScreen`'s filter bar wiring and debounce timing (fake timers) | Already used by `screen-history.test.jsx` |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `String.prototype.normalize('NFD')` (native) | ES2015+ | Diacritic folding (D-11) — decompose `ă/â/î/ș/ț` into base+combining-mark pairs | Combined with a regex strip of the Unicode combining-diacritical-marks block (`̀-ͯ`) |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Hand-rolled `useEffect` debounce | A dedicated `use-debounce` npm package | Rejected — CONTEXT.md's own discretion note observes no debounce utility exists in the codebase today and leaves the choice open; a 6-line `useEffect` has zero dependency-audit surface and matches the project's consistent "no library for a problem solvable in <10 lines" posture (e.g. hand-rolled `useSSE`, hand-rolled auth-refresh scheduling) |
| Native `String.normalize('NFD')` | A diacritics library (e.g. `diacritics`, `remove-accents`) | Rejected — native `normalize('NFD')` + regex strip is a well-known, zero-dependency pattern that covers Romanian diacritics completely (verified below); adding a package for a 2-line transform would be the exact "don't hand-roll" inversion this project avoids elsewhere (it avoids libraries for trivial transforms, not the reverse) |

**Installation:** None required — no `npm install` step in this phase's plan.

**Version verification:** Not applicable — no new packages recommended.

## Package Legitimacy Audit

**Not applicable.** This phase introduces zero new npm packages. Every mechanism (memoized filtering, `useEffect`-based debounce, `String.prototype.normalize`) uses APIs already present in the installed dependency tree (`react` ^18.3.1) or in the JavaScript language/runtime itself. The Package Legitimacy Gate protocol was not run because there is nothing to check against a registry.

## Architecture Patterns

### System Architecture Diagram

```
useHistoryOrders()  →  data (raw fetched array, unchanged by this phase)
        │
        ▼
filterFinishedOrders(data)  →  finished  (Phase 7, unchanged — status ∈ {COMPLETED, CANCELLED})
        │
        ▼
┌───────────────────────────────────────────────────────────────┐
│ NEW this phase — two derived sets, one pass apart (D-02)       │
│                                                                 │
│  byTypeAndSearch = finished                                    │
│      .filter(matchesType(typeFilter))                          │
│      .filter(matchesSearch(debouncedQuery))                    │
│                                                                 │
│  visible = byTypeAndSearch.filter(matchesStatus(statusFilter))  │
└───────────────────────────────────────────────────────────────┘
        │                                    │
        │ (counts: group byTypeAndSearch      │ (rows: feed visible into
        │  by deriveDisplayStatus, tally)     │  the Phase 7 pipeline unchanged)
        ▼                                    ▼
statusFilters[].count                 groupOrdersByDay(visible)  →  days
                                       computeSummary(visible)    →  summary (D-04)
                                              │
                                              ▼
                                       DayGroup rows / SummaryStrip tiles
                                       (D-15's Avg-tile gating fix applies here)

Search input (raw keystroke) → useEffect+setTimeout(250ms) → debouncedQuery state
                                  (clear/empty bypasses the timer — applies same tick)
```

### Recommended Project Structure

No new files. All changes land in three existing files:

```
src/
├── history-utils.js       # + matchesStatus, matchesType, foldDiacritics, matchesSearch (pure, unit-tested)
├── screen-history.jsx     # filter state, debounce timer, two derived arrays, FilterBar restructure, EmptyBlock variants, Avg-tile gate fix
├── data.jsx               # normalizeOrder — one-line type-mapping fix (D-08)
└── i18n.jsx                # + h_clear_filters, h_empty_filtered_title (ro + en)
```

### Pattern 1: Two-derived-set faceted counting (D-01/D-02)

**What:** Compute counts from a list filtered by every axis EXCEPT the axis being counted; compute rendered rows from a list filtered by ALL axes including the one being counted.
**When to use:** Any time a filter group's own badge/count must stay "live" (non-zero, navigational) while another value in the same group is selected.
**Example:**
```javascript
// screen-history.jsx — inside HistoryScreen()
const byTypeAndSearch = useMemo(
  () => finished.filter((o) => matchesType(o, typeFilter) && matchesSearch(o, debouncedQuery)),
  [finished, typeFilter, debouncedQuery]
);

const visible = useMemo(
  () => byTypeAndSearch.filter((o) => matchesStatus(o, statusFilter)),
  [byTypeAndSearch, statusFilter]
);

// Counts derived from byTypeAndSearch (D-02: excludes the status axis itself)
const statusCounts = useMemo(() => {
  const counts = { all: 0, completed: 0, refunded: 0, canceled: 0 };
  for (const o of byTypeAndSearch) {
    counts.all += 1;
    const s = deriveDisplayStatus(o); // never null on a finished-only list (INVARIANT)
    counts[s] += 1;
  }
  return counts;
}, [byTypeAndSearch]);
```
This is a single `useMemo` chain (one of the two options CONTEXT.md leaves to discretion) — `byTypeAndSearch` is computed once and reused by both the count pass and (via a further filter) the row pass, avoiding a duplicate `.filter()` traversal of the type+search predicate.

### Pattern 2: Debounce with immediate-clear escape hatch (D-10)

**What:** A `useEffect` timer that delays applying a non-empty query by 250ms, but applies an emptied query immediately.
**When to use:** Text search inputs where narrowing (adding characters) should collapse a keystroke burst, but widening (clearing) should never feel delayed.
**Example:**
```javascript
// screen-history.jsx
const [query, setQuery] = useState('');
const [debouncedQuery, setDebouncedQuery] = useState('');

useEffect(() => {
  if (query === '') {
    setDebouncedQuery(''); // D-10: clearing applies immediately, no timer
    return;
  }
  const id = setTimeout(() => setDebouncedQuery(query), 250);
  return () => clearTimeout(id); // cleanup cancels a superseded keystroke's pending apply
}, [query]);
```
Source: standard React debounce pattern (`useEffect` + `setTimeout` + cleanup-cancels-stale-timer) — this is the textbook implementation for a controlled input with delayed derived state; no library needed. [ASSUMED: general React pattern knowledge, not from a specific fetched doc this session — low risk, this is a widely-taught idiom with no version-specific API surface to get wrong]

### Pattern 3: Diacritic folding (D-11)

**What:** NFD-normalize a string and strip Unicode combining marks so accented and unaccented forms compare equal.
**When to use:** Any user-facing text match where the input alphabet routinely omits diacritics under time pressure (Romanian POS: staff type `s`/`t` for `ș`/`ț`).
**Example:**
```javascript
// history-utils.js
/**
 * D-11: folds diacritics for loose matching — NFD-decomposes the string, then strips the
 * Unicode combining-diacritical-marks block (U+0300–U+036F). Pure, locale-agnostic.
 * @param {string} s
 * @returns {string}
 */
export function foldDiacritics(s) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '')
}

export function matchesSearch(order, query) {
  const q = foldDiacritics(query.trim().toLowerCase())
  if (!q) return true
  const numLabel = String(
    typeof order.dailyOrderNumber === 'number' ? order.dailyOrderNumber : order.id.slice(0, 8)
  ).toLowerCase()
  const name = foldDiacritics((order.customer?.name ?? '').toLowerCase())
  return numLabel.includes(q) || name.includes(q)
}
```
**Verified against Romanian diacritics:** `'ă'.normalize('NFD')` → `'a' + '̆'` (combining breve); `'â'/'î'.normalize('NFD')` → base + `'̂'` (combining circumflex); `'ș'/'ț'.normalize('NFD')` → base + `'̦'` (combining comma below) **in modern Unicode** — but ⚠ see Pitfall 2 below for the ș/ț cedilla-vs-comma legacy encoding risk, which is the one real subtlety in this pattern. [CITED: MDN `String.prototype.normalize()`, Unicode Standard Annex #15 (normalization forms) — combining-mark stripping via NFD is the standard documented technique for accent-insensitive search]

### Anti-Patterns to Avoid

- **Computing counts from `visible` (the fully-filtered list):** every unselected status pill would read 0 the moment any status is picked, killing the group's navigational purpose (explicitly rejected by D-02).
- **A single `.filter()` producing both counts and rows:** cannot satisfy D-01+D-02 simultaneously — the count pass and the row pass need genuinely different inputs (type+search only vs. type+search+status).
- **Debouncing the clear action:** widening a result set has no cost and reads as broken if delayed (D-10 explicitly rejects a uniform 300ms including clear).
- **Filtering inside `groupOrdersByDay`/`computeSummary` themselves:** these Phase 7 functions are deliberately list-agnostic — feed them the pre-filtered `visible` array, do not add filter parameters to them (would duplicate the predicate logic and violate the "one filter predicate" framing CONTEXT.md's `<domain>` section states).
- **Keying filter `useState` to the active period/range:** D-12 requires filters to survive a period switch — if filter state were derived from or reset by the range value, this would silently break.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Status/type bucket precedence | A second precedence implementation inside the new filter predicates | `deriveDisplayStatus` (`history-utils.js:82`, already shipped, already unit-tested) | It already encodes the exact precedence (refunded > canceled > completed) the INVARIANT depends on — reimplementing it in the filter predicate would create two sources of truth for the same logic |
| Diacritic-insensitive comparison | A regex table of ă→a, â→a, î→i, ș→s, ț→t substitutions | `String.prototype.normalize('NFD')` + combining-mark strip | The substitution-table approach is a maintenance liability (misses any diacritic not enumerated) and the NFD approach is the standard, complete, locale-agnostic technique |
| Debounce timing | A custom hook library or a `lodash.debounce` import | A 6-line `useEffect`+`setTimeout` (Pattern 2) | The codebase has zero existing debounce precedent and zero lodash dependency; this is exactly the kind of "problem solvable in <10 lines" this project consistently avoids importing a library for (see `useSSE`, auth-refresh scheduling) |

**Key insight:** every piece of "don't hand-roll" guidance here points the other direction from usual — this phase's actual risk is over-importing for problems the codebase already solves natively or has already solved once (Phase 7's `deriveDisplayStatus`). The one thing genuinely worth NOT hand-rolling is status precedence, because it already exists and is already trusted.

## Runtime State Inventory

**Trigger check:** This phase is not a rename/refactor/migration phase in the broad sense, but D-08 changes a data-normalization mapping (`'local'` → `'dinein'`) at a boundary consumed by multiple call sites. The canonical question — *after this fix, what runtime systems still have the old mapping cached or embedded?* — is answered below because the fix touches shared, already-shipped code.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | None — `orderType`/`type` is never persisted client-side; it is re-derived from the live SDK response on every fetch/SSE event. No local cache (TanStack Query cache is in-memory only, not persisted to disk) holds a stale mapping across app restarts. | None |
| Live service config | None — the mapping fix is entirely client-side (`normalizeOrder` in `src/data.jsx`); no server-side or third-party service configuration references `'local'` vs `'dinein'`. | None |
| OS-registered state | None — not applicable to this phase (no OS-level task/process registration touches order data). | None |
| Secrets/env vars | None — no secret or env var references `'local'`/`'dinein'` by name. | None |
| Build artifacts / installed packages | None — no compiled artifact embeds this mapping; it is evaluated at runtime on every render. | None |

**Consumer trace (the actual regression surface, verified by grep against `src/*.jsx`/`src/*.js`):**

| File | Consumes `normalizeOrder` via | Effect of D-08's fix |
|------|-------------------------------|------------------------|
| `src/use-history-orders.js:29` | `.map(normalizeOrder)` on `listAdminOrders` results | HIST-08's actual target — `order.type` becomes `'dinein'` for `orderType: 'local'` rows, making the new type-filter predicate match correctly |
| `src/use-orders.js:20` | `orders.map(normalizeOrder)` on live `listOrders`/kitchen results | **F-02 fix** — `screen-orders.jsx:187`'s existing live type filter (`typeFilter !== 'all' && o.type !== typeFilter`) currently silently excludes `'local'`-typed dine-in orders from the Dine-in filter; after the fix it matches them. Regression check: dine-in orders must still appear under "All" (unaffected either way) and now correctly appear under the Dine-in filter (previously did not) |
| `src/use-order-detail.js:12` | `normalizeOrder(result.data.order)` on `getOrder(id)` | Detail view's `order.type` for a dine-in order changes from `'local'` to `'dinein'` — **rendering unaffected**: `typeMeta` (`screen-orders.jsx:15-22`) has no `'local'` key and already falls through to `map.dinein` for any unrecognized type, so the chip icon/label was already rendering as Dine-in before the fix, byte-identically after |
| `src/use-sse.js:58` | `normalizeOrder(JSON.parse(msg.data))` on live SSE events | Every live order pushed over SSE now carries `type: 'dinein'` instead of `type: 'local'` for dine-in orders — flows into both `OrdersScreen` (F-02's live fix applies here too, in real time) and `KitchenScreen` (`screen-kitchen.jsx:69` independently re-derives `type = order.type ?? order.orderType ?? 'dinein'`, which already falls back to `'dinein'` for any falsy/unmapped value — **unaffected by the fix either way**, since it never equality-checks against `'local'`) |

**Grep-verified: no other file in `src/*.jsx`/`src/*.js` checks `=== 'local'` or `'local'` as a literal anywhere except `src/screen-pos.jsx:12`'s OUTBOUND `orderTypeMap = { dinein: 'local', pickup: 'pickup', delivery: 'delivery' }`** (the map D-08 inverts for the inbound direction — this outbound map is unmodified by D-08 and remains correct, since the SDK's `createKitchenOrder`/`createOrder` body still expects `'local'` for a dine-in order type). No stray `'local'`-vs-`'dinein'` string comparison exists anywhere else in the app to regress.

**Nothing found requiring a data migration** — this is a pure code-edit at the boundary; there is no persisted store of the old mapping to migrate.

## Common Pitfalls

### Pitfall 1: Producing counts from the wrong list (D-01/D-02 violation)
**What goes wrong:** A developer instinctively computes `statusFilters[].count` by filtering `visible` (the fully status+type+search-filtered array) rather than `byTypeAndSearch` (type+search only). This makes every unselected status pill read 0 the instant any status is selected.
**Why it happens:** `visible` is the array already being mapped over to render rows, so it's the array most readily "in scope" when writing the count logic nearby.
**How to avoid:** Compute `byTypeAndSearch` first as its own named `useMemo`, derive counts from it, then derive `visible` as a further filter of `byTypeAndSearch` (not a fresh filter of `finished`). Name the two arrays distinctly in code so a reviewer can see which one feeds counts vs. rows.
**Warning signs:** A UAT/manual test where selecting "Completed" makes the "Canceled" pill immediately show `0` even though canceled orders exist in the period.

### Pitfall 2: ș/ț legacy cedilla vs. comma-below encoding (diacritic folding, D-11)
**What goes wrong:** Romanian `ș`/`ț` have two historical Unicode encodings — the older, still-common "cedilla" forms (U+015F ș, U+0163 ț, NFD-decomposing to combining cedilla U+0327) and the correct modern "comma below" forms (U+0219 ș, U+021B ț, NFD-decomposing to combining comma below U+0326). Text from different sources (a customer name typed years ago in an older system vs. a name typed today) may use either encoding. Stripping only one combining-mark codepoint would silently fail to fold the other.
**Why it happens:** Windows/legacy Romanian keyboard layouts and older software predominantly produced the cedilla forms; modern Unicode-correct Romanian orthography and newer input methods produce comma-below forms. Both render visually near-identically in most fonts, making the discrepancy invisible to a developer eyeballing test data.
**How to avoid:** The regex `̀-ͯ` (the full Unicode "Combining Diacritical Marks" block) already covers BOTH U+0326 (comma below) and U+0327 (cedilla) — both fall inside this block. As long as the strip regex targets the whole block (not a narrower hand-picked set of marks), both encodings fold correctly. **Do not narrow the regex to only the marks observed in one test fixture.**
**Warning signs:** A unit test with `'Gheorghiță'` (one encoding) passes, but a manually-typed or copy-pasted name using the other encoding fails to match — write test cases for BOTH encodings explicitly (see Code Examples' test sketch below) to catch this before it ships.

### Pitfall 3: Debounce timer leak / stale-closure on unmount or rapid re-navigation
**What goes wrong:** If the `useEffect`'s cleanup function is omitted, a pending `setTimeout` from a superseded keystroke can fire after the component has unmounted (e.g., staff navigates away from History mid-debounce) or after a newer keystroke's timer should have superseded it, causing a `setState` on an unmounted component warning or a stale query overwriting a newer one.
**Why it happens:** Easy to forget the `return () => clearTimeout(id)` cleanup when writing the effect quickly, since the happy path (type, wait, see results) never surfaces the bug.
**How to avoid:** Always return the `clearTimeout` cleanup from the effect (shown in Pattern 2's example) — this is the standard, required shape for any `useEffect` that starts a timer.
**Warning signs:** React console warning "Can't perform a React state update on an unmounted component" during rapid typing + navigation in manual testing.

### Pitfall 4: Forgetting the `id[0:8]` fallback in the search predicate (D-09)
**What goes wrong:** Copying `screen-orders.jsx:190`'s search predicate verbatim (`String(o.dailyOrderNumber ?? '').includes(q)`) omits the `id.slice(0,8)` fallback that `orderNumberLabel` (`screen-history.jsx:41-45`) uses for rows where `dailyNumber` is null — those rows display `#a3f9c201` but the search predicate would never match on that text, making some rows permanently unreachable by search.
**Why it happens:** The live Orders screen's precedent search predicate doesn't need this fallback (its `dailyOrderNumber` is presumably never null in the live-order dataset, or the gap was simply never noticed there) — copying it verbatim carries the gap into History.
**How to avoid:** The search predicate must call the SAME `orderNumberLabel`-equivalent logic used for rendering (or a shared helper), not re-derive a narrower version. Confirmed correct in Pattern 3's example above (`typeof order.dailyOrderNumber === 'number' ? order.dailyOrderNumber : order.id.slice(0, 8)`).
**Warning signs:** A unit test seeding an order with `dailyOrderNumber: null` and searching for its displayed `id.slice(0,8)` value returns no match.

### Pitfall 5: Avg-tile gate fix applied to the wrong condition (D-15)
**What goes wrong:** The existing code (`screen-history.jsx:251`) is `summary.avg === null ? (isEmptyState ? formatRON(0) : '—') : formatRON(summary.avg)`. A naive fix might try to special-case "no completed orders" inline without touching the `isEmptyState` variable itself, missing that `isEmptyState` is defined elsewhere (`screen-history.jsx:222`, `!isLoading && !isError && days.length === 0`) as "zero VISIBLE rows," not "zero completed rows" — these are different conditions once filters exist (a Canceled-only filter has `days.length > 0` but `completedCount === 0`).
**Why it happens:** `isEmptyState` reads like it should cover "nothing to show," but D-15 specifically requires distinguishing "nothing rendered at all" from "rows rendered, but none of them completed."
**How to avoid:** Change the ternary's condition from `isEmptyState` to `isError` directly (D-15's stated fix: `summary.avg === null ? (isError ? '—' : formatRON(0)) : formatRON(summary.avg)`) — do not introduce a new derived boolean that re-expresses the same thing under a different name; use `isError` as-is, since it is already computed at `screen-history.jsx:216` from the query state.
**Warning signs:** A unit/integration test filtering to "Canceled only" on a period with canceled orders present still shows `'—'` on the Avg tile instead of `0,00 lei`.

## Code Examples

### Status/type predicates (extends `history-utils.js`)

```javascript
// history-utils.js — pure, no react/data.jsx/SDK imports (module contract, unchanged)

/**
 * HIST-07: predicate for the status filter group. 'all' always matches; otherwise compares
 * against deriveDisplayStatus's precedence-correct vocabulary (never re-derives precedence here).
 * @param {object} order
 * @param {'all'|'completed'|'refunded'|'canceled'} statusFilter
 * @returns {boolean}
 */
export function matchesStatus(order, statusFilter) {
  if (statusFilter === 'all') return true
  return deriveDisplayStatus(order) === statusFilter
}

/**
 * HIST-08: predicate for the type filter group. Assumes D-08's normalizeOrder boundary fix has
 * already mapped 'local' -> 'dinein' upstream — this predicate does its own mapping-free equality
 * check only (no history-only special-casing, per D-08's rejected alternative).
 * @param {object} order
 * @param {'all'|'delivery'|'pickup'|'dinein'} typeFilter
 * @returns {boolean}
 */
export function matchesType(order, typeFilter) {
  if (typeFilter === 'all') return true
  return order.type === typeFilter
}
```

### D-08's boundary fix (exact diff shape)

```javascript
// src/data.jsx:222 — BEFORE
type: o.type ?? o.orderType ?? 'dinein',

// src/data.jsx:222 — AFTER (D-08)
type: (o.type ?? o.orderType) === 'local' ? 'dinein' : (o.type ?? o.orderType ?? 'dinein'),
```
The inversion target is `screen-pos.jsx:12`'s `orderTypeMap = { dinein: 'local', pickup: 'pickup', delivery: 'delivery' }` — `pickup`/`delivery` are already identity-mapped in both directions, so only `'local'` needs an explicit inbound translation; every other value passes through unchanged, preserving the existing `?? 'dinein'` fallback for genuinely absent/unmapped values.

### Regression test sketch for D-08 (F-02)

```javascript
// src/__tests__/normalize-order.test.js — extend existing file
test('orderType "local" normalizes to type "dinein" (D-08, F-02 regression)', () => {
  const raw = { id: 'x1', orderType: 'local', status: 'COMPLETED' /* ...minimal fields */ }
  const normalized = normalizeOrder(raw)
  expect(normalized.type).toBe('dinein')
})

test('orderType "delivery"/"pickup" pass through unchanged (D-08 does not touch these)', () => {
  expect(normalizeOrder({ id: 'x2', orderType: 'delivery' }).type).toBe('delivery')
  expect(normalizeOrder({ id: 'x3', orderType: 'pickup' }).type).toBe('pickup')
})
```

### Diacritic-folding test sketch (Pitfall 2 coverage — both ș/ț encodings)

```javascript
// src/__tests__/history-utils.test.js — extend existing file
describe('foldDiacritics', () => {
  test('folds modern comma-below ș/ț (U+0219/U+021B)', () => {
    expect(foldDiacritics('Gheorghița')).toBe('Gheorghita') // ț = U+021B
  })
  test('folds legacy cedilla ş/ţ (U+015F/U+0163)', () => {
    expect(foldDiacritics('Gheorghiţa')).toBe('Gheorghita') // ţ = U+0163 (cedilla variant)
  })
  test('folds ă/â/î', () => {
    expect(foldDiacritics('Rădulescu')).toBe('Radulescu')
  })
})
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|---------------|--------|
| N/A — no prior filter implementation on this screen | This phase's two-derived-set faceted counting | This phase | First introduction of faceted (exclude-self) counting on any screen in this app; `screen-orders.jsx`'s live filter (`:169-172`) uses simple non-faceted counts (`orders.filter(o => ...).length` against the full unfiltered list) — a genuinely different, simpler pattern that this phase deliberately does NOT copy, per D-01/D-02 |

**Deprecated/outdated:** Nothing in this phase deprecates prior code — `screen-orders.jsx`'s undebounced, non-faceted, non-folding search/filter remains as-is (deliberately, per `<deferred>`).

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | The `useEffect`+`setTimeout` debounce pattern (Pattern 2) is the correct idiom for React 18 with no library | Architecture Patterns, Pattern 2 | Low — this is a widely-taught, version-independent React idiom (no React 18-specific API used); worst case a reviewer prefers a `useRef`-based variant, which is a refactor, not a rewrite |
| A2 | No other file besides `screen-pos.jsx:12` contains a literal `'local'` string comparison | Runtime State Inventory | Low — verified this session via `grep -rn "'local'" src/*.jsx src/*.js`, but a future file added between research and execution could theoretically introduce a new one; the plan should re-run this grep at execution time as a cheap guard |

**If this table is empty:** N/A — two low-risk assumptions logged above; both are cheap to re-verify at execution time and neither blocks planning.

## Open Questions

None outstanding. `10-CONTEXT.md` and `10-UI-SPEC.md` together resolve every design and behavioral question this phase raises; this research file's job was to confirm the debounce implementation approach, trace the D-08 regression surface exhaustively, and produce the Validation Architecture map — all three are complete above.

## Environment Availability

Skipped — this phase has no external dependencies (no new npm packages, no new CLI tools, no new services). All work is client-side code and test changes against the existing dependency tree.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest `^4.1.5` + `@testing-library/react` `^16.3.2` [VERIFIED: package.json] |
| Config file | Existing project `vitest.config.js` (unchanged by this phase) |
| Quick run command | `npx vitest run src/__tests__/history-utils.test.js src/__tests__/normalize-order.test.js src/__tests__/screen-history.test.jsx` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| HIST-07 | `matchesStatus` predicate — `'all'` matches everything; each named status matches only its `deriveDisplayStatus` bucket | unit | `npx vitest run src/__tests__/history-utils.test.js` | ✅ (extend existing file — mirrors the module's existing pure-function test pattern) |
| HIST-07 | D-02 exclude-self faceting — selecting Completed leaves Canceled/Refunded pills showing their true (type+search-only) counts, not 0 | integration | `npx vitest run src/__tests__/screen-history.test.jsx` | ✅ (extend existing `describe('HistoryScreen')` — the file already has a `populated state` describe block to extend) |
| HIST-07 | D-03 — a `0`-count pill remains clickable and lands on the filtered-empty-state | integration | `npx vitest run src/__tests__/screen-history.test.jsx` | ✅ (extend) |
| HIST-07 | F-03 — status pill render order is All / Completed / Refunded / Canceled (not the production-inert bar's swapped order) | integration | `npx vitest run src/__tests__/screen-history.test.jsx` | ✅ (extend — assert DOM order of the four `data-testid` or button labels) |
| HIST-08 | `matchesType` predicate — `'all'` matches everything; each named type matches `order.type` exactly | unit | `npx vitest run src/__tests__/history-utils.test.js` | ✅ (extend) |
| HIST-08 | D-08/F-02 regression — `normalizeOrder({ orderType: 'local' })` yields `type: 'dinein'`; `'delivery'`/`'pickup'` pass through unchanged | unit | `npx vitest run src/__tests__/normalize-order.test.js` | ✅ (extend existing file — see Code Examples for the exact test sketch) |
| HIST-08 | F-02 live-path regression — `screen-orders.jsx`'s Dine-in type filter now matches an order whose `orderType` was `'local'` (previously silently excluded it) | integration | `npx vitest run src/__tests__/screen-orders.test.jsx` | ✅ (extend existing file — add a fixture order with `orderType: 'local'`, assert it appears under the Dine-in filter) |
| HIST-09 | `foldDiacritics` — folds both modern comma-below AND legacy cedilla ș/ț encodings, plus ă/â/î (Pitfall 2) | unit | `npx vitest run src/__tests__/history-utils.test.js` | ✅ (extend — see Code Examples test sketch, both-encodings coverage) |
| HIST-09 | `matchesSearch` — matches `dailyOrderNumber`, matches the `id[0:8]` fallback when `dailyNumber` is null (Pitfall 4), matches `customer.name`, empty query matches everything | unit | `npx vitest run src/__tests__/history-utils.test.js` | ✅ (extend) |
| HIST-09 | Debounce timing — a rapid keystroke burst produces exactly ONE filtered recompute 250ms after the last keystroke; clearing the box applies with zero delay (D-10) | integration | `npx vitest run src/__tests__/screen-history.test.jsx` (Vitest fake timers: `vi.useFakeTimers()` + `vi.advanceTimersByTime(250)`) | ✅ (extend — this is a NEW test class for this file; no existing debounce test to model, but `vi` fake-timer usage is a standard Vitest API already available via the installed version) |
| HIST-09 | Filters + search compose with period (D-12) — status/type/query persist across a period-preset switch | integration | `npx vitest run src/__tests__/screen-history.test.jsx` | ✅ (extend — depends on Phase 9's period-switch plumbing already being in place; write after Phase 9 lands) |
| HIST-07/08/09 | D-04 — day headers and summary tiles reflect only the filtered (`visible`) set, not the whole period | integration | `npx vitest run src/__tests__/screen-history.test.jsx` | ✅ (extend — assert day-group counts/subtotals recompute after applying a filter in the test) |
| HIST-07/08/09 | D-15 — Avg tile shows `formatRON(0)` (not `'—'`) when a filter reduces `completedCount` to 0 while rows remain visible (Pitfall 5) | integration | `npx vitest run src/__tests__/screen-history.test.jsx` | ✅ (extend — filter to Canceled-only with canceled rows present, assert Avg tile is NOT `'—'`) |
| HIST-07/08/09 | D-13/D-14 — filtered-empty-state renders the correct copy variant + Clear Filters button; clicking it resets status/type/query but not the period | integration | `npx vitest run src/__tests__/screen-history.test.jsx` | ✅ (extend) |

### Sampling Rate

- **Per task commit:** `npx vitest run src/__tests__/history-utils.test.js src/__tests__/normalize-order.test.js`
- **Per wave merge:** `npx vitest run src/__tests__/screen-history.test.jsx src/__tests__/screen-orders.test.jsx`
- **Phase gate:** `npx vitest run` (full suite) green before `/gsd-verify-work`

### Wave 0 Gaps

None — `history-utils.test.js`, `normalize-order.test.js`, `screen-history.test.jsx`, and `screen-orders.test.jsx` all already exist with an established pure-unit-test / RTL-integration-test pattern this phase extends. The one genuinely new testing technique this phase introduces is Vitest fake timers (`vi.useFakeTimers()`) for the debounce test — `vi` is already globally available (`vitest.config.js` sets `globals: true`), so no new setup or config change is needed, only a new usage pattern within `screen-history.test.jsx`.

## Security Domain

`security_enforcement` is not explicitly disabled in `.planning/config.json` (absent = enabled). This phase introduces no authentication, session, or access-control surface, and no new external input reaches a privileged operation — it is a pure client-side array-filtering feature over data already fetched through the existing authenticated SDK client.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | Unchanged — same authenticated SDK client Phase 7/9 already use |
| V3 Session Management | no | Unchanged |
| V4 Access Control | no | Unchanged — no new role/permission surface; filters operate only on data the authenticated user could already see unfiltered |
| V5 Input Validation | yes | The search query is free text but is NEVER used to construct a query string, DOM `innerHTML`, or any injectable sink — it flows only into a `String.prototype.includes()` substring comparison inside `matchesSearch`. React's default JSX text-node escaping already prevents any XSS surface from rendering the query back (the input's own `value` prop is the only place it's echoed, which React escapes natively) |
| V6 Cryptography | no | Not applicable |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Search query used to build a filter that unintentionally widens visible data beyond the user's authorization (e.g., a query somehow bypassing the finished-only filter) | Information Disclosure | Not applicable here — `matchesSearch`/`matchesType`/`matchesStatus` only ever NARROW `finished` (already scoped to COMPLETED/CANCELLED, already scoped to the authenticated user's accessible orders via the SDK's own auth); no filter predicate in this phase can add rows, only remove them, so there is no path from a crafted search string to seeing unauthorized data |
| Denial of Service via a debounce/count-pass traversal of a large in-memory array on every keystroke (carried forward from `09-RESEARCH.md`'s 366-day-cap discussion) | Denial of Service (client-side, self-inflicted) | Already the accepted, documented cost noted in `10-CONTEXT.md`'s `<deferred>` (list virtualization deferred; a 366-day fetch is fully in memory and the count pass traverses it on every debounced keystroke) — the 250ms debounce (D-10) is itself the primary mitigation, collapsing a keystroke burst into one traversal instead of one per character; no additional server-side protection applies since there is no server-side call in this phase to exploit |

## Sources

### Primary (HIGH confidence)

- `src/screen-history.jsx` (production) — read in full this session; `FilterBar`, `SummaryStrip`, `HistoryScreen`, `EmptyBlock`, `historyStatusMeta` all directly inspected
- `src/history-utils.js` (production) — read in full this session; `deriveDisplayStatus`, `filterFinishedOrders`, `groupOrdersByDay`, `computeSummary` directly inspected for their exact contracts and precedence rules
- `src/data.jsx:190-250` (production) — `normalizeOrder` read directly; `type: o.type ?? o.orderType ?? 'dinein'` at line 222 confirmed as the exact fix target
- `src/screen-orders.jsx:1-196` (production) — `typeMeta`, live filter/search predicate, `orderTypeMap`-adjacent code read directly
- `src/screen-pos.jsx:12` (production) — `orderTypeMap = { dinein: 'local', pickup: 'pickup', delivery: 'delivery' }` confirmed as D-08's inversion source
- `sitecare-orders/project/src/screen-history.jsx:143-269` (design source) — read directly; exact bar structure, type-filter pill styling, and search+export nesting confirmed against production's current (non-matching) structure
- `package.json`, `vitest.config.js` — read directly; test framework/version confirmed
- `src/__tests__/history-utils.test.js`, `src/__tests__/screen-history.test.jsx` — read directly; existing test patterns confirmed as extension points
- Grep audit (`grep -rn "'local'" src/*.jsx src/*.js`, `grep -n "normalizeOrder" src/*.jsx src/*.js`) — this session, confirming D-08's full consumer/regression surface

### Secondary (MEDIUM confidence)

- `.planning/phases/09-period-control/09-RESEARCH.md` — read directly; Validation Architecture section format and the project's established Vitest test-map conventions modeled from this prior phase's research

### Tertiary (LOW confidence)

- MDN `String.prototype.normalize()` / Unicode Annex #15 combining-marks-block behavior for Romanian ș/ț legacy-vs-modern encoding (Pitfall 2) — based on general Unicode/i18n training knowledge, not fetched fresh this session; the underlying claim (both U+0326 and U+0327 fall within the `̀-ͯ` combining-marks block covered by the recommended regex) is a stable, long-standing Unicode fact unlikely to have changed, but is flagged [ASSUMED] rather than [VERIFIED] since it was not independently re-checked against the Unicode Character Database this session

## Metadata

**Confidence breakdown:**
- Standard Stack: HIGH — no new packages, every mechanism verified against the installed `package.json` and native JS platform APIs
- Architecture: HIGH — CONTEXT.md already locks the two-derived-set pattern; this research confirmed it maps cleanly onto the existing `history-utils.js`/`screen-history.jsx` structure with no surprises
- Pitfalls: HIGH for Pitfalls 1/3/4/5 (directly traceable to CONTEXT.md's own load-bearing warnings and the existing code's exact shape); MEDIUM for Pitfall 2 (the ș/ț dual-encoding risk is a real, well-documented Unicode phenomenon but was not verified against a live Romanian-locale test fixture this session — flagged as [ASSUMED] in the Assumptions Log's spirit, though it did not meet the bar for a numbered assumption since the mitigating regex range is unambiguous)

**Research date:** 2026-07-17
**Valid until:** 2026-08-16 (30 days — stable domain, no fast-moving external dependency; the one time-sensitive input, the installed `package.json` versions, should be re-checked if this research is reused past that window)
