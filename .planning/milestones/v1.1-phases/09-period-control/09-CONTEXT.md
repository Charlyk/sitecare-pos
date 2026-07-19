# Phase 9: Period Control - Context

**Gathered:** 2026-07-17
**Status:** Ready for planning

> **Decision numbering:** `D-01`…`D-14` below are **Phase 9** decisions. Phase 7's decisions are
> qualified as **`P7 D-nn`** and Phase 8's as **`P8 D-nn`** to avoid collision with `07-CONTEXT.md`
> (which numbered D-01…D-16) and `08-CONTEXT.md` (D-01…D-10).

<domain>
## Phase Boundary

Staff can retarget the whole History screen to any period — Today / 7 days / 30 days presets, or a
custom start–end range — and the day-grouped list reloads for the new range.

**In scope:** HIST-04. Activating the period pills that `P7 D-14` already ships greyed-out and inert
(`screen-history.jsx:315-321`); a custom-range picker (the phase's only genuinely net-new UI); making
`useHistoryOrders` accept a switchable range; the loading/error shape of a period *switch*; and the
period-dependent copy Phase 7 left hardcoded.

**Out of scope:** status/type filters and search (Phase 10 — the status/type pills and search box stay
inert here), reprint and CSV export (Phase 11). The day-grouped list, the summary strip, the
empty-state component, the detail route, and `history-utils.js`'s derivation layer **all already ship
from Phase 7** — this phase retargets them, it does not rebuild them.

**The strip follows for free.** `P7 D-15` made the summary client-computed from the same fetched list,
so tiles retarget with the period by construction. There is no second data source, no independent
loading state, and no independent failure. The ROADMAP's original Phase 8 SC3/SC4 (independent strip
loading/error) were already struck by `07-CONTEXT.md`'s `<roadmap_impact>`.

**What this phase actually is:** unfreezing one `useState` and building a date-range popover. The
comment at `use-history-orders.js:19-22` — *"No period switching exists yet (HIST-04 is a later
phase), so a stable per-mount value is correct; the setter is unused"* — is precisely what this phase
resolves.

</domain>

<decisions>
## Implementation Decisions

### Custom range picker

- **D-01: Native `<input type="date">` pair in a popover anchored under the Interval pill.** No new
  dependency — there is no date library and no date input anywhere in the codebase today, and the OS
  supplies a real calendar plus locale handling on both macOS and Windows. Accepted cost: the native
  picker is browser-chrome-styled and will not match the design system. Rejected: inline fields in the
  filter bar (breaks `P7 D-14`'s no-layout-shift promise in an already-crowded bar); a hand-built
  calendar (by far the most code in an otherwise small phase — month nav, range selection, keyboard
  access, i18n month names, all hand-rolled).
  - ⚠ **The design handoff does not draw this.** `sitecare-orders/project/src/screen-history.jsx:159`
    gives the custom pill an `icon: 'chevDown'` and `setPeriod('custom')` — and nothing else. No
    picker is designed, mocked, or screenshotted. This is a genuine design gap, not a port.

- **D-02: Explicit Apply button — nothing fetches until it is clicked.** The popover holds both dates
  in local state; Apply stays disabled until the range is valid. A half-entered range (start picked,
  end still empty) never reaches the API. Rejected: fetch-as-soon-as-both-set (native date inputs fire
  change events mid-typing, so correcting a year would trigger several throwaway fetches of
  potentially year-wide ranges); apply-on-popover-close (clicking away is how people cancel — this
  would apply a range staff were abandoning).

- **D-03: An applied custom range renders ON the pill** — e.g. `3 Mar – 17 Mar` replaces the static
  "Interval" label. The pill becomes the answer to "what am I looking at?" without reopening the
  popover; the chevron the design already draws signals it stays reopenable. Accepted cost: the pill
  widens with its content, shifting the bar's other controls.

- **D-04: Switching to a preset CLEARS the custom range.** The pill reverts to "Interval" and a fresh
  popover opens empty. Chosen over remembering the range. **This coheres with D-03 by design:** the
  pill shows dates *only* when that range is what the list is showing — there is no state where it
  advertises a range that isn't live. Accepted cost: a misclick on a preset destroys a typed range and
  both dates must be re-entered.

### Period switch — loading + failure

- **D-05: Keep the previous list visible and dimmed during a switch** (TanStack Query
  `placeholderData: keepPreviousData`). Rows stay on screen at reduced opacity and swap in place — no
  content collapse, no scroll jump, no tile flash. The dimming **must read as loading, not as
  disabled** — the greyed-out convention (`P7 D-14`) means something different on this screen.
  Rejected: blanking to skeleton rows (a full-height collapse on every switch, including switching
  back to a cached range); no loading state at all (a slow response looks frozen and invites
  re-clicking).

- **D-06: The tile sub-label follows the DATA, not the click.** It stays "30 zile" until the 7-day data
  actually lands, then label and number flip together — a tile is never internally inconsistent (never
  "7 zile / 1,240 orders" where 1,240 is the 30-day figure). The selected pill communicates intent
  during the wait; the dimming ties them together. This is the same mismatch `P7 D-15` dropped
  `getAdminDashboard` to avoid, so it is not reintroduced here in a smaller form.
  - ⚠ **Load-bearing implication for the planner:** the rendered period label must derive from **the
    range that produced the visible rows**, not from the pill's selected state. Those two are the same
    value only after the fetch settles. A naive `selectedPeriod` string driving both the pill and the
    tile sub-label violates this decision.

- **D-07: A failed switch shows the full-area error + retry, per `P7 D-16`** — the table area is
  replaced and the previous rows are discarded. **The user chose consistency over data preservation**,
  against the recommendation: exactly one error treatment exists on the screen, matching first-load
  failure.
  - ⚠ Note this runs *against* `P8 D-07`'s instinct ("the fields already fetched stay visible rather
    than blanking"). The divergence is deliberate and user-directed. Detail-view hydration keeps its
    summary; a failed period switch does not keep its list.

- **D-08: The attempted range stays selected and Retry re-fetches THAT range.** The pill staff clicked
  stays lit and the error belongs to that choice — "your 7-day view failed, try again" rather than
  silently reverting a deliberate action. The previous period's cache entry is untouched, so clicking
  its pill restores that list instantly with no refetch. Rejected: snapping the selection back to the
  last successful range (leaves the error under a pill naming a different period, and makes Retry's
  target ambiguous).

### Custom range guardrails

- **D-09: A hard span cap, enforced in the picker.** Exceed it and Apply stays disabled with a message
  naming the limit — the oversized fetch is unreachable rather than merely discouraged, and it fails at
  the input where staff can fix it. Rejected: no cap (consistent with `P7 D-03`'s measure-first stance,
  but leaves a plausible path to a multi-second freeze on a screen with no virtualization and no
  pagination); warn-past-a-threshold (`P7` already rejected a >500-order warning banner as machinery).

- **D-10: The cap is 366 days — a full year.** Chosen over the recommended 92 days specifically so a
  year-end reconciliation and Phase 11's CSV export work in **one pass**. The cap exists to stop the
  absurd case, not to force staff into multiple lookups for a legitimate accounting period.
  - ⚠ **Watch-out, accepted knowingly:** `listAdminOrders` has no pagination and `P7 D-03` renders
    every row with no cap or virtualization, so the range is the *only* thing bounding how much data
    reaches the screen. A 366-day range is ~12× the 30-day default in one unpaginated fetch. This makes
    `P7 D-03`'s deferred *"measure against real data before adding machinery"* concrete: **366 days is
    now the worst case, and nobody has measured it.** If virtualization is ever revisited (see
    `<deferred>`), this is the trigger.

- **D-11: Constrain the inputs so invalid ranges largely cannot be picked** — via the native inputs'
  own `min`/`max`: the end field cannot precede the chosen start, neither field can exceed today, and
  the start cannot precede end-minus-366-days. The OS calendar greys impossible dates out. **An
  Apply-time check is still required** — date inputs accept typed values. `min`/`max` must recompute as
  the other field changes. Future dates are excluded because History is finished-only (`P7 D-01`), so a
  future range is guaranteed empty. Rejected: validate-only-on-Apply (staff construct nonsense and find
  out at the end); silent auto-correct (changes what staff typed without telling them — reads as a bug).

### Period-dependent copy

- **D-12: The tile sub-label reuses the pill labels verbatim** — the existing `h_period_*` keys for the
  three presets, and the formatted range (D-14) for custom. **One label source** feeds pill and tiles,
  so they cannot drift. Rejected: fuller parallel phrasing like "in the last 7 days" (a second set of
  ro/en period strings to keep in step — exactly the drift `P7 D-15` disliked); dropping the sub-label
  on presets (the design draws it on every tile, and tile height would change between periods).
  - Fixes the hardcoded `sub: t('h_period_30')` at **`screen-history.jsx:246-247`** — currently every
    tile claims "30 zile" regardless of period. Harmless today (30 days is the only period), a bug the
    moment this phase lands.

- **D-13: The empty state gets its own prepositional label set for prose.** `P7 D-13` wants one
  empty-state component with copy worded for the period; the template is one ro/en string with the
  period interpolated. But the **pill labels do not survive interpolation in Romanian** — *"Nicio
  comandă în Azi"* is broken. So keep `h_period_*` for the standalone pill/tile labels and add a
  parallel `h_period_in_*` set worded to sit inside a sentence (`astăzi`, `în ultimele 7 zile`).
  - **This follows existing precedent, it is not a new pattern:** `src/i18n.jsx` already carries
    `h_period_today: 'Azi'` (line 208) *and* a separate `h_today: 'Astăzi'` (line 225) — the project has
    already hit this exact need. ⚠ Check whether `h_today` can serve directly before adding a duplicate;
    v1.0 hit duplicate-key issues twice.
  - Accepted cost: two label families for four periods — the drift risk D-12 just avoided, reappearing
    in a place where grammar leaves no choice.
  - `P7 D-13`'s reservation of the sub-line for Phase 10's filter copy is preserved — the period rides
    the main line, not the sub-line.

- **D-14: One locale-aware range formatter, year shown only when needed.** A single pure helper in
  `history-utils.js` using `Intl.DateTimeFormat` with the active locale (`3 mar. – 17 mar.` /
  `3 Mar – 17 Mar`), omitting the year when the range sits inside the current one and adding it when it
  does not — **which the 366-day cap (D-10) makes reachable.** Compact in the pill, unambiguous across a
  year boundary. Serves all three render sites (pill, tile sub-lines, empty state). Rejected:
  always-show-year (noticeably wider in a pill sitting in a four-sibling segmented control); numeric
  short form (`03.03 – 17.03` inverts between ro `dd.mm` and en `mm/dd` — the same pill would read as two
  different ranges depending on language).

### Claude's Discretion

- **Where period state lives** now that the range must be switchable — lifted into `screen-history.jsx`,
  kept in `useHistoryOrders` with the setter finally used, or moved to the Zustand store. Not discussed.
  Constraints that bound the choice: reset-on-leave is already accepted for v1.1 (see `<deferred>`), so
  the store's persistence is not needed; D-06 requires the *rendered* label to derive from the settled
  data rather than the selection; and Phase 10's filters will compose with whatever shape is chosen.
- **Popover mechanics** — anchoring, outside-click dismissal, focus handling, and whether Escape closes.
  Not discussed. No popover primitive exists in the codebase to follow.
- **Prefill defaults** when the empty popover opens (e.g. blank vs. today in both fields). Not discussed.
- **The stale-"Today" case** — the app is a long-running desktop POS that may sit open past midnight,
  and `getLast30DaysRange`'s lazy `useState` freezes its boundaries at mount. Raised but not discussed.
  Do not build a clock-tick refresh without reason; note that D-04's clearing behaviour and any
  period-switch already recompute the range.
- **Whether the "30 zile" pill's currently-full-opacity styling** (`screen-history.jsx:320`, the sole
  exception `P7 D-14` carved out) needs any change once the pills become genuinely interactive.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Prior phase context (read first — this phase continues Phase 7 directly)
- `.planning/phases/07-history-screen-foundation/07-CONTEXT.md` — **the parent decision record.**
  `P7 D-14` (the inert filter bar this phase activates), `P7 D-15` (client-computed strip — why the
  strip retargets for free), `P7 D-04` (local-day boundaries), `P7 D-16` (loading/error shape),
  `P7 D-13` (empty-state copy worded for the period), `P7 D-03` (no row cap — see D-10's watch-out) are
  all load-bearing here. Its `<canonical_refs>` and `<code_context>` are not duplicated in full below.
- `.planning/phases/08-read-only-order-detail-view/08-CONTEXT.md` — `P8 D-07` (keep-what-you-have on
  failure) is the instinct **D-07 deliberately diverges from**. Read it before revisiting D-07.

### Requirements + planning
- `.planning/REQUIREMENTS.md` — **HIST-04** is this phase's sole requirement. HIST-06 (the strip) is
  already Complete via Phase 7 and retargets by construction.
- `.planning/ROADMAP.md` § Phase 9 — goal + 3 success criteria. SC3 is satisfied by `P7 D-15`'s
  architecture rather than by new work.

### Design source (authoritative for layout, spacing, color)
- `sitecare-orders/project/src/screen-history.jsx:149-165` — `const [period, setPeriod] = useStateHist('30')`
  and the `periods` array. **:231-238** is the live (non-inert) pill rendering to port — selected pill is
  `var(--sc-foreground)` + `#fff`, unselected `transparent` + `#555`. ⚠ **:159** gives the custom pill a
  chevron and `setPeriod('custom')` **and nothing more — no picker is designed.** Prototype-era `window.*`
  globals and `useStateHist` are not the module pattern to copy.
- `sitecare-orders/project/screenshots/desktop-history.png` — the target; evidences the filter bar and
  the pill row.

### SDK (verified against installed types, v1.1.59)
- `node_modules/@charlyk/admin-client/dist/index.d.ts` § `ListAdminOrdersData` — query is
  `{ from?: string, to?: string }` **only**, ISO 8601, `/v1/admin/orders`. **No pagination, filter, sort,
  or search params** — which is why D-09/D-10's cap is the only bound on fetch size.
- Call path: `client.admin.orders.list({ query: { from, to } })`.

### Production code to follow
- `src/use-history-orders.js` — **the file this phase unfreezes.** `useState(() => getLast30DaysRange())`
  at :19-22 with an unused setter and a comment naming HIST-04 as the phase that resolves it. ⚠ Its
  lazy-initializer warning is still binding: **never call a range helper inline in the component body** —
  a new `from` every render changes the query key every render and becomes an infinite refetch loop.
  Cache key `['history-orders', from, to]` is deliberately a **distinct root from `['orders']`** (which
  `use-sse.js` writes and `use-order-actions.js` invalidates) — do not merge them. `staleTime: 30_000`.
- `src/history-utils.js` — the pure, React-free, SDK-free derivation layer. `getLast30DaysRange(now)`
  (:17) is the model for any new range helper: **injectable clock for deterministic tests**, local-day
  boundaries → ISO instants, `from` = local midnight, `to` = **exclusive** upper bound (start of
  tomorrow). D-14's formatter belongs here. The module header forbids importing react, `data.jsx`, or
  the SDK — keep it that way.
- `src/screen-history.jsx:294-341` — the inert `FilterBar` (`P7 D-14`). **:315-321** are the four period
  pills, currently unrolled with hardcoded `disabled` and opacity — this phase makes them live. **:327**
  status pills, **:335** search, **:339** Export must all **stay inert** (Phases 10/11). **:242-247** is
  the summary strip with the hardcoded `sub: t('h_period_30')` that D-12 fixes. **:218**
  `filterFinishedOrders(data ?? [])`.
- `src/i18n.jsx:208-211` (ro) / `:439-442` (en) — `h_period_today` / `h_period_7` / `h_period_30` /
  `h_period_custom` already exist. `:225` `h_today: 'Astăzi'` / `:456` — the **precedent for D-13's second
  prepositional form.** ⚠ Check for pre-existing keys before adding; v1.0 hit duplicate-key issues twice
  (`search_placeholder`).

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`history-utils.js`** — the entire derivation layer already exists and is period-agnostic:
  `filterFinishedOrders`, `groupOrdersByDay`, `computeSummary`, `deriveDisplayStatus` all operate on
  whatever list they are handed. Retargeting the fetch retargets all of them for free. Only a range
  helper (presets → `{from, to}`) and D-14's formatter are new.
- **`getLast30DaysRange(now)`** — the exact shape the preset helpers need; generalize rather than
  reinvent (local-day boundaries, exclusive upper bound, injectable clock).
- **The inert period pills** (`screen-history.jsx:315-321`) — markup, styling, and i18n keys all ship
  already. This phase removes `disabled`, wires `onClick`, and drives the selected styling from state.
- **`h_period_*` i18n keys** — all four labels exist in both `ro` and `en`.
- **TanStack Query's `placeholderData: keepPreviousData`** — D-05's mechanism; a built-in, not new
  machinery.

### Established Patterns
- **TanStack Query owns server state; Zustand owns UI state.** The period selection is UI state; the
  fetched list is server state keyed by the range.
- **Query-key-per-range is already the design** — `['history-orders', from, to]`. Each period is
  naturally its own cache entry, which is what makes D-08's "clicking back restores instantly" true for
  free, and what makes D-05's keepPreviousData meaningful rather than a no-op.
- **SDK `responseStyle: 'fields'`** — check `result.error`, then unwrap `result.data`. Never `try/catch`
  the call itself.
- **`history-utils.js` stays pure** — no react, no `data.jsx`, no SDK imports; unit-testable without a
  DOM. Every derivation gets an injectable clock.
- **i18n** — every user-facing string in `src/i18n.jsx` under both `ro` and `en`.
- **Greyed-out convention** — unready features stay visible, disabled, not clickable. ⚠ D-05's dimmed
  loading state must be visually distinguishable from this, on a screen that renders both at once.
- **ES modules only; no `window.*` globals** — the design file's `useStateHist` is prototype-era.

### Integration Points
- **`src/use-history-orders.js`** — the core change: accept a range (or a period) rather than freezing
  one at mount; add `placeholderData: keepPreviousData` (D-05). The lazy-initializer trap is the thing
  to not regress.
- **`src/screen-history.jsx`** — live pills, the custom-range popover, the D-12 tile sub-label fix, and
  the D-13 empty-state copy. Status/type/search/Export stay inert.
- **`src/history-utils.js`** — preset→range helpers, the 366-day span validator (D-10/D-11), and D-14's
  locale-aware range formatter.
- **`src/i18n.jsx`** — D-13's `h_period_in_*` prose set, the cap message (D-09), and the switch-error
  copy (D-07), all in `ro` + `en`.
- **Tests** — `history-utils.js` has an established pure-unit-test pattern with injectable clocks; the
  range helpers, span validator, and formatter all fit it directly.

</code_context>

<specifics>
## Specific Ideas

- **"The pill never advertises a range that isn't live."** D-03 and D-04 were answered independently —
  show the dates on the pill, and clear them on preset switch — and they lock together into a single
  invariant. Offered the option to remember a typed range for convenience, the user took the one with
  no ambiguous state, at the cost of re-typing after a misclick.
- **Consistency chosen over data preservation (D-07), against the recommendation.** Offered a
  keep-the-old-list-and-show-an-error-strip option explicitly framed as mirroring `P8 D-07`, the user
  took `P7 D-16`'s full-area error instead: **one error treatment on the screen**. Notable because it
  is the first time in v1.1 the user has chosen surface consistency *over* the reuse/keep-what-you-have
  instinct that drove `P7 D-09`, `P8 D-01`, `P8 D-03`, and `P8 D-07`.
- **The cap is a guardrail, not a policy (D-10).** Recommended 92 days; the user took 366 so that a
  year-end export works in one pass — knowingly accepting an unmeasured 12×-default fetch. Same shape as
  `P7 D-03` (reject machinery, trust the real workload) and the same instinct as `P8 D-10` (choose the
  answer that is actually useful to staff, not the one that is easy to defend).
- **Consistent thread across three phases: fewer sources of truth.** D-06 (label follows data) and D-12
  (one label source for pill and tile) are the same reflex as `P7 D-15` (drop `getAdminDashboard`) and
  `P8 D-02` ("one order, one truth") — applied here to labels rather than to data. D-13 is the sole
  concession, and only because Romanian grammar leaves no alternative.

</specifics>

<deferred>
## Deferred Ideas

- **List virtualization** — `P7 D-03` deferred it pending real-data measurement. D-10's 366-day cap
  makes the worst case concrete and ~12× larger than anything Phase 7 measured. **This is the most
  likely trigger for revisiting it.**
- **Pagination for `listAdminOrders`** — an SDK/API change, out of reach for this phase. The only reason
  a client-side span cap is load-bearing at all.
- **Remembering a custom range across preset switches** — considered and rejected under D-04.
- **Persisting the selected period across navigation** — reset-on-leave is already accepted for v1.1
  (REQUIREMENTS.md "Future Requirements"); `P7`'s `<deferred>` records the same.
- **A clock-tick refresh for the stale-"Today" case** on an app left open past midnight — raised under
  Claude's Discretion, not scoped. Revisit only if staff report it.
- **Restyling the native date inputs to match the design system** — accepted as a known cost under D-01.
  A hand-built calendar is the remedy if the browser chrome proves unacceptable in review.
- **Design-system popover primitive** — none exists; this phase builds a single-purpose popover. If
  Phase 10's filters or Phase 11's export want one too, extracting it becomes worthwhile.
- **Keeping the previous list on a failed switch** — considered and rejected under D-07 in favour of
  `P7 D-16` consistency. `P8 D-07` is the counter-precedent if this is ever revisited.
- **Business-day cutoff for day grouping** — rejected under `P7 D-04`, unchanged here.

</deferred>

---

*Phase: 9-Period Control*
*Context gathered: 2026-07-17*
