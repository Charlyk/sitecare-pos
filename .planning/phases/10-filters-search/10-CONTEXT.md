# Phase 10: Filters + Search - Context

**Gathered:** 2026-07-17
**Status:** Ready for planning

> **Decision numbering:** `D-01`…`D-15` below are **Phase 10** decisions. Prior phases are qualified as
> **`P7 D-nn`** (`07-CONTEXT.md`, D-01…D-16), **`P8 D-nn`** (`08-CONTEXT.md`, D-01…D-10), and
> **`P9 D-nn`** (`09-CONTEXT.md`, D-01…D-14) to avoid collision.

<domain>
## Phase Boundary

Staff can narrow a period's orders down to the ones they are looking for — by status (All / Completed /
Refunded / Canceled, each with a live count), by order type (All / Delivery / Pickup / Dine-in), and by
a debounced text search over order number and customer name.

**In scope:** HIST-07, HIST-08, HIST-09. Activating the status pills that `P7 D-14` ships inert
(`screen-history.jsx:327`) and adding count badges to them; **building the type filter group that was
never ported** (F-03); activating the search box (`:335`); and restructuring the filter bar to the
design's two-row shape so all of it fits.

**Out of scope:** Reprint and CSV export (Phase 11 — the Export button at `:339` stays inert). The
period control ships from Phase 9; the day-grouped list, summary strip, empty-state component, detail
route, and `history-utils.js` derivation layer all ship from Phase 7. **This phase filters what is
already fetched — it does not fetch.**

**Everything is client-side.** `ListAdminOrdersData`'s query is `{ from?, to? }` only — no filter, sort,
search, or pagination params exist. The array `useHistoryOrders` already holds is the whole input.

**The derivation layer is period- and filter-agnostic already.** `filterFinishedOrders`,
`groupOrdersByDay`, `computeSummary`, and `deriveDisplayStatus` all operate on whatever list they are
handed. This phase changes **what list they are handed** — it does not rewrite them. That is why D-04
(tiles follow filters) is nearly free and why SC4 (day headers reflect visible orders) falls out of
feeding `groupOrdersByDay` the filtered array.

**What this phase actually is:** one filter predicate, a faceted-count pass, a debounce, a bar
restructure, and a one-line boundary fix (D-08) for a bug that predates the phase.

</domain>

<decisions>
## Implementation Decisions

### Status counts

- **D-01: Status pill counts respect ALL other active filters (type + search).** A count always answers
  *"how many rows do I get if I click this?"* — count and resulting row count never disagree. Coheres
  with `P9 D-06` (rendered numbers follow the data, not the click). Rejected: period-only counts (what
  the design does — computed from a static summary, so a pill can read `240` while 12 rows show);
  type-but-not-search (an inconsistent rule staff must intuit, and the count still won't match).

- **D-02: Exclude-self faceting — each status count is computed against type + search but NOT the status
  selection.** With Completed active, Canceled still shows its true count, so the group stays
  navigational ("what's over there if I click it?"). Standard faceted-search behaviour. **Without this,
  every unselected pill reads 0 the moment any status is picked and the group goes dead.**
  - The `All` count = the number of matches of type + search.
  - ⚠ **Load-bearing for the planner:** D-01 and D-02 together mean the counts are **not** derivable from
    the final filtered array. The count pass needs a list filtered by *type + search only*; the rendered
    rows need that list filtered by status as well. Two derived sets, one pass apart. A single
    `visible.filter(...)` cannot produce both.

- **D-03: A zero-count pill stays clickable and reads `0`;** clicking yields the filtered empty state.
  Chosen to avoid overloading grey: this screen already uses greying for *unready feature* (`P7 D-14`)
  and dimming for *loading* (`P9 D-05`), and both can render simultaneously. A third grey meaning *no
  matches* would be unreadable. Also avoids enable/disable flicker while typing. Rejected:
  disable-at-zero.

- **INVARIANT (verified in source, not asked): the three status buckets partition the list exactly.**
  `filterFinishedOrders` (`history-utils.js:29`) admits only `status === 'COMPLETED' || 'CANCELLED'`, and
  `deriveDisplayStatus` (`:38`) gives `refunded` outright precedence. So on the history list
  `deriveDisplayStatus` **never returns `null`**, and `All = Completed + Refunded + Canceled` always —
  no double-count, no remainder. A canceled-and-refunded order counts as **refunded only**. The design's
  arithmetic (`completed = orders - cancelCount - refundCount`) is valid only because of this precedence;
  prefer counting via `deriveDisplayStatus` directly over reproducing the subtraction.

### Summary strip under filters

- **D-04: The four tiles recompute for the FILTERED set, not the period.** One rule for the whole screen:
  *everything shows what you're looking at*. `computeSummary` already accepts any list, so this is a
  change of input, not a rewrite. Makes Phase 11's *"export the current filtered results"* (HIST-12)
  agree with the tiles **by construction**. Rejected: period-wide tiles (what the design does — recreates
  the exact tiles-vs-day-headers disagreement that `P7 D-15` dropped `getAdminDashboard` to prevent);
  filtered-plus-period-subtext (the sub-line is already spoken for by `P9 D-12`).
  - Accepted cost: the period-wide total becomes unreachable without clearing filters.

- **D-05: Accepted consequence — under `status = Completed` the Refunds tile reads `0 · 0 canceled`** and
  can only ever read zero. Literally correct (there are zero refunds in view) and keeps D-04's rule
  exception-free. Rejected: a per-tile carve-out where Refunds alone ignores the status filter — three
  tiles obeying status and one not, with nothing on screen explaining why.

- **D-06: The tile sub-label stays the PERIOD label only** (`P9 D-12` verbatim) — it does **not** name the
  active filters. The lit pills sit directly below the tiles and already say what's filtered; restating
  it across four tiles is redundant. Preserves `P9 D-12`'s single label source: no new strings, no
  composition logic, no ro/en drift. Accepted cost: a tile can read `30 zile` while showing delivery-only
  revenue — the pill above disambiguates.

- **D-15: The Avg tile shows a computed zero whenever `completedCount === 0` without an error** — the
  em-dash keeps exactly one meaning on this screen: *error*. This **broadens `P7`'s rule** from "the
  period is empty" to "no completed orders are in view".
  - ⚠ **This is a bug D-04 would otherwise introduce.** Today `screen-history.jsx:250` reads
    `summary.avg === null ? (isEmptyState ? formatRON(0) : '—') : formatRON(summary.avg)`. Filter to
    **Canceled only**: `computeSummary` averages over *completed* orders, so `avg === null`, but
    `isEmptyState` is `false` because canceled rows are on screen — the tile renders `'—'`, the error
    glyph, during a completely successful filter. **The gating condition must change from `isEmptyState`
    to "not an error".** Same one-error-treatment reflex as `P7 D-16` and `P9 D-07`.

### Filter bar structure + type filter

- **D-07: Port the design's bar structure — nest search + export together in ONE `marginLeft: auto`
  container** so they wrap to row 2, right-aligned, with the three pill groups on row 1.
  - **The two-row wrap is the design's intent, not a layout failure** — confirmed by
    `screenshots/desktop-history.png`, which is 1440×900, the app's exact default window size, and shows
    search + export on their own right-aligned second row.
  - **It fits:** row 1 measures ~990px against 1152px available (1440 window − 240 sidebar −
    2×24 `content-pad`), leaving headroom for `P9 D-03`'s widened custom-range pill. ⚠ No `minWidth` is
    set in `tauri.conf.json` and the window is resizable — `flexWrap: 'wrap'` (already present at `:314`)
    degrades gracefully below that.
  - ⚠ **Production's current structure will NOT produce this.** Search is a standalone flex child
    (`:335`) with only Export in an auto-margin div (`:339`). Adding a type group to that shape strands
    search on row 1 and Export alone on row 2. The nesting must change to match the design
    (`sitecare-orders/project/src/screen-history.jsx:260`).
  - Rejected: icon-only type pills to force one row (diverges from the design, discards `delivery` /
    `pickup` / `dinein` i18n labels that already exist); a type dropdown (a new control pattern nothing
    else on the screen uses).

- **D-08: Fix the SDK `'local'` → UI `'dinein'` mapping in `normalizeOrder` (`src/data.jsx:222`), at the
  boundary** — inverting `screen-pos.jsx:12`'s existing outbound `orderTypeMap` so `'dinein'` is the
  single app-wide type vocabulary in **both** directions. Fixes HIST-08 **and** the live Orders defect
  (F-02) in one line.
  - **Rendering is unaffected:** `typeMeta` has no `'local'` key and already falls through to
    `map.dinein`, so chips render byte-identically before and after. **Only filtering changes.**
  - Accepted cost: touches the shared live-order path — Orders, KDS, and detail need a regression check.
    See F-02 for the full trace.
  - Rejected: mapping inside the history predicate only (leaves the shipped Orders bug in place and
    creates two type vocabularies — the exact drift this project keeps rejecting).

### Search

- **D-09: Search matches what the row actually renders** — the `#` label plus the customer name. Concretely:
  `dailyOrderNumber`, **or** the `id[0:8]` fallback that `orderNumberLabel` (`screen-history.jsx`) shows
  when `dailyNumber` is null (the SDK types `AdminOrder.dailyNumber` as `number | null`, so those rows
  exist), plus `customer.name`. **No row is unreachable by the text printed on it.** Matches the existing
  `h_search` label — *"Caută după # sau client"*. Rejected: `dailyOrderNumber` + name only (mirrors
  `screen-orders.jsx:188-191` verbatim, but leaves null-dailyNumber rows displaying `#a3f9c201` and
  matching nothing); adding phone (beyond SC3 and the label; not a visible column).

- **D-10: 250ms debounce; clearing is immediate.** 250ms sits below the ~300ms lag threshold and still
  collapses a keystroke burst into one pass. Clearing (or emptying) the box applies at once — widening a
  result set has no cost, and waiting to see *more* reads as broken. Everything is client-side, so this
  governs render churn, not network. Rejected: a uniform 300ms including clear (visible pause when
  emptying the field).

- **D-11: Fold diacritics** — normalize both query and name (NFD + strip combining marks) so `Radulescu`
  matches `Rădulescu` and `Gheorghita` matches `Gheorghiță`. This is a Romanian-first POS: names routinely
  carry ă/â/î/ș/ț, staff type fast, and ș/ț are habitually typed as s/t. A pure helper in
  `history-utils.js` with direct unit tests. Accepted cost: slightly wider matches; **diverges from
  `screen-orders.jsx:188-191`'s plain `.toLowerCase().includes()`** (see `<deferred>`).

- **D-12: Status, type, and search ALL survive a period switch.** Period and filters are independent axes
  — that is what SC4's "compose" means, and *"same question, narrower window"* is the real workflow.
  - **This does not contradict `P9 D-04`** (switching to a preset clears the custom range): that decision
    governs two ways of expressing the **same** axis. This one governs a **different** axis. Both hold.

### Empty state

- **D-13: Two distinct empty-state variants.** No filters active → `P9 D-13`'s period copy, unchanged.
  Filters active → copy naming the real cause (*"Nicio comandă nu se potrivește cu filtrele active"*).
  - ⚠ **The `P7 D-13` / `P9 D-13` split does not survive filters.** `P7 D-13` reserved the empty state's
    **sub-line** for this phase's filter copy, leaving the main line to carry the period. But when 240
    orders exist and filters exclude them all, the main line *"Nicio comandă în ultimele 30 de zile"* is
    **factually false**. Filters must reach the **main line**, not only the reserved sub-line.
  - Rejected: one copy for both (either lies about the period, or goes vague enough to say nothing
    actionable); naming the active filters in the copy (string composition across ro/en — the exact
    interpolation trap `P9 D-13` documents, where pill labels don't survive being dropped into a Romanian
    sentence).

- **D-14: The filter-active variant carries a clear-filters button.** That state is a dead end and the
  remedy is a single action staff certainly want; putting it where the problem is beats hunting three
  controls across a two-row bar. It renders **only** in this empty state, so it costs no permanent bar
  real estate — which the type group (D-07) has already made scarce.
  - **It resets status, type, and search — NOT the period** (D-12: separate axes; clearing filters must
    not silently retarget the fetch).

### Claude's Discretion

- **Where filter state lives** — local `useState` in `screen-history.jsx`, colocated with `P9`'s period
  state, or elsewhere. Not discussed. Bounds: reset-on-navigation is already accepted for v1.1;
  `P9 D-06`/D-01 require rendered counts to derive from settled data; D-12 requires filter state to
  survive a period change, so it must **not** be keyed to the range.
- **How the two derived sets in D-02 are computed** — one memo chain vs. two, and where the count pass
  sits. Not discussed. The constraint is only that both exist (see D-02's warning).
- **Debounce implementation** — a hand-rolled `useEffect` + timer vs. a small hook. No debounce utility
  exists in the codebase today. `screen-orders.jsx`'s search is **not** debounced, so it is a precedent
  for the predicate but not for the timing.
- **Whether the status pill order is corrected** to the design's All / Completed / **Refunded** /
  **Canceled** (production's inert bar has the last two swapped — F-03). Not discussed; the design is
  authoritative per project convention.
- **The type group's distinct selected styling** — the design uses cream `#f7f1e1` + primary-green text
  for type, versus solid green for status and solid dark for period. Three selected treatments in one
  bar. Port as drawn unless it reads as a bug.
- **Exact `h_empty_*` key naming** for D-13's second variant, and whether existing keys can be reused.
  ⚠ Check for pre-existing keys before adding — v1.0 hit duplicate-key issues twice (`search_placeholder`).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Prior phase context (read first — this phase continues Phases 7 and 9 directly)
- `.planning/phases/07-history-screen-foundation/07-CONTEXT.md` — **the parent decision record.**
  `P7 D-14` (the inert bar this phase activates — and whose zero-layout-shift promise does **not** cover
  the type group, see F-03), `P7 D-15` (client-computed strip — why D-04 is nearly free), `P7 D-13`
  (empty-state copy; its sub-line reservation is what D-13 amends), `P7 D-16` (one error treatment —
  D-15's basis), `P7 D-03` (no row cap / no virtualization).
- `.planning/phases/09-period-control/09-CONTEXT.md` — **read before touching the bar or the tiles.**
  `P9 D-06` (rendered labels follow the settled data, not the click — D-01 inherits this), `P9 D-12` (one
  label source, pill and tile — D-06 preserves it), `P9 D-13` (the ro/en interpolation trap D-13 cites),
  `P9 D-03`/`P9 D-04` (the custom-range pill widens; preset switch clears it — D-12 explains why that does
  not contradict this phase), `P9 D-05` (dimmed loading — the grey D-03 must not collide with).
- `.planning/phases/08-read-only-order-detail-view/08-CONTEXT.md` — F-01 is the direct precedent for F-02:
  a shipped defect masked by a defaulting code path, found during discussion rather than by a test.

### Requirements + planning
- `.planning/REQUIREMENTS.md` — **HIST-07, HIST-08, HIST-09** are this phase's requirements. HIST-08's
  *"`orderType: 'local'` maps to Dine-in"* is precisely F-02 / D-08. F-01's write-up is the model for how
  F-02 should be recorded.
- `.planning/ROADMAP.md` § Phase 10 — goal + 4 success criteria. SC4's day-header requirement falls out of
  feeding `groupOrdersByDay` the filtered array.

### Design source (authoritative for layout, spacing, color)
- `sitecare-orders/project/src/screen-history.jsx:150-153` — `status` / `typeFilter` / `query` state.
  **:161-165** status filters **with counts**; **:167-172** the **type filter group that was never
  ported** (F-03); **:176-182** the filter predicate; **:250-258** the type group's cream selected style;
  **:260-270** the **search + export `marginLeft: auto` nesting D-07 requires**. Prototype-era `window.*`
  globals and `useStateHist` are not the module pattern to copy.
- `sitecare-orders/project/screenshots/desktop-history.png` — **1440×900, the app's exact window size.**
  The evidence that the two-row wrap is intended (D-07). Shows count badges on status pills only, never
  on type pills. ⚠ Its sidebar is rendered **collapsed**, so it had ~1320px, not the expanded layout's
  1152px — D-07's fit was measured against 1152px.

### SDK (verified against installed types, v1.1.59)
- `node_modules/@charlyk/admin-client/dist/index.d.ts` § `AdminOrder` (**:264-265**) —
  `orderType: string`, `customerName: string`, `dailyNumber: number | null`. § `Order` (**:793**) types the
  same field as `'delivery' | 'pickup' | 'local'` — **the enum behind F-02.**
  § `ListAdminOrdersData` — query is `{ from?, to? }` **only**: no filter, sort, search, or pagination
  params exist server-side, which is why every requirement here is client-side.

### Production code to follow
- `src/screen-history.jsx:294-341` — the inert `FilterBar` (`P7 D-14`). **:327** status pills (activate +
  add counts), **:335** search (activate), **:339** Export (**stays inert** — Phase 11). **:314**
  `flexWrap: 'wrap'` already present. **:242-247** the summary strip D-04 retargets; **:250** the Avg tile
  expression D-15 fixes. **:104-111** `EmptyBlock` — D-13's two variants. **:218**
  `filterFinishedOrders(data ?? [])` — the seam the filter predicate slots behind.
- `src/screen-orders.jsx:175-196` — **the live type filter and search.** **:187** is F-02's defect and the
  line NOT to copy. **:188-191** is the search precedent D-09 extends (`String(o.dailyOrderNumber ??
  '').includes(q)` + name substring, not debounced). `typeMeta` — no `'local'` key, falls through to
  `map.dinein`: the fallback that masks F-02.
- `src/data.jsx:222` — `type: o.type ?? o.orderType ?? 'dinein'`, **the one line D-08 fixes.**
- `src/screen-pos.jsx:12` — `orderTypeMap = { dinein: 'local', pickup: 'pickup', delivery: 'delivery' }`,
  the **outbound** map D-08 inverts. Proof the `dinein`↔`local` translation is already an established,
  deliberate concept — it was simply never applied inbound.
- `src/history-utils.js` — the pure, React-free, SDK-free derivation layer. `deriveDisplayStatus` (**:38**)
  drives the status buckets; `computeSummary` (**:163**) already accepts any list (D-04). D-11's
  diacritic-folding helper belongs here. **The module header forbids importing react, `data.jsx`, or the
  SDK — keep it that way.**
- `src/i18n.jsx` — `all` (**:20**/`:260`), `delivery`/`pickup`/`dinein` (**:24-26**/`:264-266`),
  `h_status_*`, `h_search` (**:235**/`:466`), `h_empty`/`h_empty_sub` (**:237-238**/`:468-469`).
  Type-filter labels **already exist** — no new keys needed for D-07's group. ⚠ Check before adding
  D-13's keys; v1.0 hit duplicate-key issues twice.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`history-utils.js`'s whole derivation layer** — `filterFinishedOrders`, `groupOrdersByDay`,
  `computeSummary`, `deriveDisplayStatus` are all list-agnostic. Feeding them the filtered array delivers
  SC4 (day headers reflect visible orders) and D-04 (tiles follow filters) with no changes to any of them.
- **`deriveDisplayStatus`** — already the exact status vocabulary the filter needs
  (`refunded`/`canceled`/`completed`), already precedence-correct, already unit-tested. The status
  predicate is `deriveDisplayStatus(o) === selected`.
- **The inert status pills + search box** (`screen-history.jsx:327`, `:335`) — markup, styling, and i18n
  ship already. Remove `disabled`, wire handlers, add count badges.
- **All type-filter i18n labels** (`all`, `delivery`, `pickup`, `dinein`) exist in both `ro` and `en`.
- **`typeMeta`'s icons** (`moped`/`bag`/`utensils`) — the design's type pills use exactly these.
- **`screen-orders.jsx:188-191`** — the search predicate shape to extend (D-09/D-11), though **not** its
  timing (undebounced) and **not** its type filter (F-02).

### Established Patterns
- **TanStack Query owns server state; Zustand owns UI state.** Filter selections are UI state; the fetched
  list is server state keyed by range. Filters must not touch the query key — they are not a fetch input.
- **`history-utils.js` stays pure** — no react, no `data.jsx`, no SDK imports; unit-testable without a DOM.
  D-11's folding helper fits this directly.
- **i18n** — every user-facing string in `src/i18n.jsx` under both `ro` and `en`.
- **Greyed-out convention** — unready features stay visible, disabled, not clickable. ⚠ This screen now
  renders three greys at once: unready (Export), loading-dim (`P9 D-05`), and — were D-03 decided
  otherwise — no-matches. D-03 keeps it at two.
- **The design is authoritative for layout, spacing, and color** — do not "fix" the three distinct
  selected-pill treatments without instruction.
- **ES modules only; no `window.*` globals** — the design file's `useStateHist` is prototype-era.

### Integration Points
- **`src/screen-history.jsx`** — the bulk of the phase: filter state, the two derived sets (D-02), the
  restructured bar (D-07), the type group (F-03), count badges, D-15's Avg fix, D-13/D-14's empty state.
- **`src/data.jsx:222`** — D-08's one-line boundary fix. **The only file this phase touches that is shared
  with the live-order path** — hence the regression check.
- **`src/history-utils.js`** — D-11's diacritic-folding helper, and any extracted filter predicate.
- **`src/i18n.jsx`** — D-13's second empty-state variant + D-14's clear-filters label, `ro` + `en`.
- **Tests** — `history-utils.js` has an established pure-unit-test pattern; the folding helper and status
  predicate fit it directly. F-02 warrants a regression test that a dine-in filter matches `'local'`
  orders — the assertion whose absence let the live bug ship.

</code_context>

<specifics>
## Specific Ideas

- **"The count always answers 'what do I get if I click this?'"** — D-01 and D-02 were answered
  independently and lock into one invariant: counts respect every axis *except their own*. The user took
  standard faceted behaviour over both the design's simpler period-wide counts and the naively "consistent"
  fully-filtered counts that would zero out the group.
- **One rule, no carve-outs — chosen twice, at a visible cost.** D-04 makes tiles follow filters; D-05 then
  accepts a Refunds tile that can only read zero under a status filter, rather than granting one tile an
  exception. Same reflex as `P7 D-15` and `P9 D-12`: fewer sources of truth, even when a carve-out would
  look better in a screenshot.
- **The em-dash means one thing (D-15).** Offered a defensible "not applicable" reading for a null average,
  the user instead broadened `P7`'s rule so the glyph keeps exactly one meaning. Continues the `P7 D-16` /
  `P9 D-07` thread — **one error treatment on this screen** — now extended from error *states* to the
  error *glyph*.
- **Fix it at the boundary, not at the call site (D-08).** Offered a narrow history-only mapping with zero
  live-path risk, the user took the shared one-line normalizer fix that also repairs a v1.0 bug they had
  not known about 60 seconds earlier. Same instinct as `P8 D-02` ("one order, one truth") and the same
  willingness to touch shipped code as `P8`'s T-08-01 gate.
- **Romanian-first, concretely (D-11).** Diacritic folding diverges from the shipped `screen-orders.jsx`
  search — accepted because ș/ț are habitually typed as s/t on a POS keyboard, and a staff member who
  omits a diacritic getting zero results for an order plainly in front of them is the failure that matters.
  Same shape as `P9 D-10`'s cap: choose what is actually useful to staff over what is easy to defend.
- **The design screenshot settled an argument.** The bar's two-row wrap looked like a layout failure to be
  designed around; the 1440×900 screenshot showed it is what the design already does. Measuring beat
  theorizing — and it is the same 1440×900 as the app window, which is why the evidence transferred.

</specifics>

<deferred>
## Deferred Ideas

- **Diacritic folding for the live Orders screen's search** (`screen-orders.jsx:188-191`) — D-11 makes
  History's search strictly better than the live screen's. Deliberate divergence, not drift: the fix is
  out of this phase's boundary. Fold into a quick task if staff notice.
- **Debounce for the live Orders screen's search** — same file, same reasoning. `screen-orders.jsx`'s
  search is undebounced today.
- **Extracting a shared filter-predicate module** across `screen-orders.jsx` and `screen-history.jsx` —
  the two predicates now differ deliberately (finished-only vs. live, folded vs. plain, debounced vs.
  not). Premature until a third caller appears — the same promote-on-the-third-caller rule `P8 D-05`
  applied to `useOrderDetail`.
- **Naming the active filters in the empty-state copy** — rejected under D-13 on ro/en composition grounds
  (`P9 D-13`'s interpolation trap).
- **Multi-select filters** (e.g. Delivery *and* Pickup at once) — the design draws single-select segmented
  controls in both groups. Out of scope; would change D-02's faceting math.
- **Persisting filters across navigation** — reset-on-leave is already accepted for v1.1
  (`REQUIREMENTS.md` "Future Requirements"); `P7` and `P9` record the same.
- **Design-system popover primitive** — `P9` builds a single-purpose one for its date picker. This phase
  adds no popover, so the extract-it trigger `P9` named is not pulled here.
- **List virtualization** — `P7 D-03` deferred it; `P9 D-10`'s 366-day cap made the worst case concrete.
  ⚠ Unchanged by this phase, but note filtering does **not** reduce the fetched array — only what renders.
  A 366-day fetch is still fully in memory, and D-01/D-02's count passes now traverse it on every
  debounced keystroke.

</deferred>

---

*Phase: 10-Filters + Search*
*Context gathered: 2026-07-17*
