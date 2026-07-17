# Phase 9: Period Control - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-17
**Phase:** 9-Period Control
**Areas discussed:** Custom range picker, Switch feedback, Custom range guardrails, Period-dependent copy

**Area selection:** All four offered gray areas were selected for discussion.

---

## Custom range picker

### Q1 — How should staff pick a custom start and end date?

| Option | Description | Selected |
|--------|-------------|----------|
| Native date inputs in a popover *(recommended)* | Popover under the Interval pill with two `<input type="date">` + Apply. Zero new deps; OS supplies calendar + locale. Cost: browser-chrome-styled, won't match the design system. | ✓ |
| Two date inputs inline in the bar | Fields appear in the filter bar when Interval is selected. Simplest — no popover/positioning/outside-click. Cost: breaks P7 D-14's no-layout-shift promise; bar already crowded. | |
| Hand-built calendar component | Custom month-grid matching the design system exactly. Full visual control. Cost: most code in an otherwise small phase — month nav, range selection, keyboard, i18n months. | |

**User's choice:** Native date inputs in a popover → **D-01**
**Notes:** Codebase scout confirmed no date library and no date input exists anywhere in `src/`. The design handoff (`screen-history.jsx:159`) gives the custom pill a chevron and `setPeriod('custom')` but never renders a picker — this is a genuine design gap, not a port.

### Q2 — When does a custom range actually fire the fetch?

| Option | Description | Selected |
|--------|-------------|----------|
| Explicit Apply button *(recommended)* | Popover holds dates locally; nothing fetches until Apply. Apply disabled until both dates valid. A half-entered range never hits the API. | ✓ |
| Fetch as soon as both dates are set | No Apply; reloads the moment both are filled. Fewer clicks. Cost: native date inputs fire change events mid-typing — correcting a year triggers throwaway fetches of large ranges. | |
| Apply on popover close | Pick both, click outside, it fetches. No button. Cost: clicking away is how people cancel — risks applying an abandoned range. | |

**User's choice:** Explicit Apply button → **D-02**

### Q3 — Once applied, what does the Interval pill show?

| Option | Description | Selected |
|--------|-------------|----------|
| The applied range, e.g. "3 Mar – 17 Mar" *(recommended)* | Pill answers "what am I looking at?" without reopening. Chevron signals reopenable. Cost: pill widens, shifting the bar; needs a compact ro/en format. | ✓ |
| Stays "Interval", just selected-styled | Static label, dark selected background. Fixed width, zero shift, trivial. Cost: no on-pill indication of which dates are showing. | |
| "Interval" plus a small date sub-line | Label stays, dates underneath in smaller text. Cost: pill grows taller than its four siblings, breaking the segmented-control row. | |

**User's choice:** The applied range on the pill → **D-03**

### Q4 — Custom range applied, then "30 days" clicked. What happens to the custom range?

| Option | Description | Selected |
|--------|-------------|----------|
| Remembered — pill keeps dates, reselects on click *(recommended)* | Pill still reads the range in unselected styling; clicking re-applies instantly. Cheap, forgiving of misclicks. Cost: pill shows dates that aren't currently live. | |
| Cleared — pill reverts to "Interval" | Preset switch wipes the range; fresh popover opens empty. Unambiguous — the pill never shows a non-live range. Cost: a misclick destroys a typed range. | ✓ |
| Remembered, but popover reopens on reselect | Dates persist and prefill; reselect opens for confirmation. Guards against accidental re-apply. Cost: an extra Apply click every bounce. | |

**User's choice:** Cleared → **D-04** *(chose against the recommendation)*
**Notes:** Locks together with D-03 into a single invariant — the pill shows dates **only** when that range is what the list is showing. There is no state where it advertises a range that isn't live. Ambiguity eliminated at the cost of re-typing after a misclick.

---

## Switch feedback

### Q1 — What happens to the screen during a period-switch fetch?

| Option | Description | Selected |
|--------|-------------|----------|
| Keep the old list, dimmed *(recommended)* | `placeholderData: keepPreviousData`. Rows stay at reduced opacity and swap in place — no collapse, no scroll jump, no tile flash. Cost: rows and the selected pill briefly disagree; dimming must read as loading, not disabled. | ✓ |
| Blank to skeleton rows | Table drops to skeletons exactly as on first load, reusing P7 D-16 with no new treatment. Unambiguous. Cost: full-height collapse on every switch, including a cached range. | |
| Nothing — rows just swap when ready | No loading state; list replaces itself when resolved. Cheapest. Cost: on a slow response the screen looks frozen and invites re-clicking. | |

**User's choice:** Keep the old list, dimmed → **D-05**

### Q2 — During the dimmed beat, the tiles hold the OLD period's numbers. How to resolve the sub-label?

| Option | Description | Selected |
|--------|-------------|----------|
| Sub-label follows the data, not the click *(recommended)* | Stays "30 days" until 7-day data lands, then label and number flip together. Tile never internally inconsistent. Pill communicates intent during the wait. | ✓ |
| Sub-label flips immediately | Strip agrees with the pill instantly; one piece of state drives both. Cost: for the fetch's duration the tile makes a measurably false claim — the exact mismatch P7 D-15 dropped `getAdminDashboard` to avoid. | |
| Tiles show placeholder dashes | Numbers blank to "—" during the switch, matching P7 D-16's error treatment. Never wrong. Cost: strip flickers while rows stay smooth — two loading philosophies on one screen. | |

**User's choice:** Sub-label follows the data → **D-06**
**Notes:** Surfaced a load-bearing planner constraint — the rendered period label must derive from the range that produced the visible rows, not from the pill's selected state. A naive `selectedPeriod` string driving both violates this.

### Q3 — The switch fails while dimmed old data is on screen. P7 D-16 says full-area error, but that discards data in hand. What wins?

| Option | Description | Selected |
|--------|-------------|----------|
| Keep the old list, error strip above it *(recommended)* | Rows un-dim and stay usable; inline error + Retry; pill snaps back. Mirrors P8 D-07 ("fields already fetched stay visible rather than blanking"). Cost: a new error treatment P7 D-16 didn't anticipate. | |
| Full-area error replaces the table, per P7 D-16 | Old rows gone. Exactly one error treatment on the screen, consistent with first-load failure. Cost: throws away a good list because an unrelated fetch failed — what P8 D-07 rejected. | ✓ |
| Toast, list stays as-is | List un-dims, toast reports failure. Least disruptive. Cost: P8 D-08 already rejected toasts — easy to miss, no obvious retry. | |

**User's choice:** Full-area error per P7 D-16 → **D-07** *(chose against the recommendation)*
**Notes:** Deliberate: consistency of error treatment beats data preservation. Diverges from P8 D-07's instinct — detail-view hydration keeps its summary, a failed period switch does not keep its list.

### Q4 — Which range is selected after a failed switch, and what does Retry retry?

| Option | Description | Selected |
|--------|-------------|----------|
| Attempted range stays selected; Retry re-fetches it *(recommended)* | The clicked pill stays lit; error belongs to that choice. Prior period's cache entry untouched, so clicking it restores instantly. | ✓ |
| Snap back to the last successful range | Selection never names a range the screen can't show. Cost: error sits under a pill claiming a different period; Retry's target becomes ambiguous. | |
| You decide | Leave to the planner, following from how query state is wired. | |

**User's choice:** Attempted range stays selected → **D-08**

---

## Custom range guardrails

### Q1 — Nothing stops a 2-year range: one unpaginated fetch, every row rendered. How to bound it?

| Option | Description | Selected |
|--------|-------------|----------|
| Cap the span, enforced in the picker *(recommended)* | Hard max before Apply; exceed it and Apply stays disabled with a message naming the limit. Unreachable, not merely discouraged; fails at the input where staff can fix it. Cost: an arbitrary number; blocks a year-end export in Phase 11. | ✓ |
| No cap — trust staff, measure first | Consistent with P7 D-03, which rejected a row cap in favor of measuring real data first. Cost: a plausible path to a multi-second freeze, no virtualization. | |
| No hard cap, but warn past a threshold | Wide ranges permitted with a slowness warning. Cost: P7 already rejected a >500-order warning banner as machinery. | |

**User's choice:** Cap the span → **D-09**

### Q2 — What's the maximum span? (Phase 11's CSV export inherits this as its largest possible export.)

| Option | Description | Selected |
|--------|-------------|----------|
| 92 days — a quarter *(recommended)* | Covers month/quarter/VAT reconciliation. ~3× the 30-day default, well inside what P7 D-03 judged comfortable. Cost: a fiscal-year export needs four passes. | |
| 366 days — a full year | Any accounting period incl. year-end in one go. Cost: ~12× the default in one unpaginated fetch with every row rendered — the scenario P7 D-03 deferred rather than validated. | ✓ |
| 31 days — a month | Every fetch at or below the existing 30-day default; zero new perf exposure. Cost: quarter-end becomes three lookups. | |

**User's choice:** 366 days → **D-10** *(chose against the recommendation)*
**Notes:** The cap exists to stop the absurd case, not to force multiple passes for a legitimate accounting period. Unmeasured perf exposure accepted knowingly. Makes P7 D-03's deferred "measure with real data" concrete — 366 days is now the worst case and is unmeasured.

### Q3 — End before start, and future dates. How should the picker handle them?

| Option | Description | Selected |
|--------|-------------|----------|
| Constrain the inputs via native min/max *(recommended)* | End can't precede start, neither exceeds today, start can't precede end−366d. OS calendar greys impossible dates. Apply-time check still needed (inputs accept typing). Cost: min/max recompute as the other field changes. | ✓ |
| Allow any entry, validate on Apply | One validation path, all rules in one place. Cost: staff construct nonsense and find out at the end; future dates are guaranteed empty (finished-only). | |
| Auto-correct silently | Swap inverted dates, clamp future to today. No error copy. Cost: changes what staff typed without telling them — reads as a bug. | |

**User's choice:** Constrain the inputs → **D-11**

---

## Period-dependent copy

### Q1 — The tiles hardcode `sub: t('h_period_30')`. What should the sub-label say?

| Option | Description | Selected |
|--------|-------------|----------|
| Reuse the pill labels verbatim *(recommended)* | Tile sub-line shows exactly what the pill shows. Existing `h_period_*` keys cover the presets; only custom needs formatting. One label source can't drift. Cost: a date range is longer than a preset label in a small slot. | ✓ |
| Fuller phrasing, e.g. "in the last 7 days" | Reads as a sentence fragment describing the number. Cost: a second parallel ro/en set that must stay in step — the drift P7 D-15 disliked. | |
| Drop the sub-label on presets | Tiles only caption themselves for custom ranges. Cost: the design draws the sub-line on every tile; tile height would change between periods. | |

**User's choice:** Reuse the pill labels → **D-12**
**Notes:** Fixes `screen-history.jsx:246-247`, where every tile claims "30 zile" regardless of period — harmless today, a bug the moment this phase lands.

### Q2 — How should the empty state read across the four periods? (P7 D-13: copy worded for the period.)

| Option | Description | Selected |
|--------|-------------|----------|
| One template, period label interpolated *(recommended)* | Single ro/en string fed the same label the pill and tiles use. Phase 10 keeps the sub-line free for filter copy, as P7 D-13 planned. Cost: Romanian grammar must work for every substitution. | ✓ |
| A distinct sentence per period | Four hand-written ro/en strings, each natural. Cost: 4 × 2 strings to keep in step with the pills; custom still needs interpolation. | |
| Generic, period-free copy | "No orders found." One string, no grammar risk. Cost: walks back P7 D-13's explicit choice. | |

**User's choice:** One template with interpolation → **D-13**

### Q3 — "Nicio comandă în Azi" is broken Romanian. Does the empty state get its own period phrases?

| Option | Description | Selected |
|--------|-------------|----------|
| Yes — a second prepositional label set *(recommended)* | Keep `h_period_*` for pills/tiles; add `h_period_in_*` worded for sentences ("astăzi", "în ultimele 7 zile"). `i18n.jsx` already does this with `h_period_today` vs `h_today`. Cost: two label sets; the drift risk D-12 just avoided reappears. | ✓ |
| No — reword the template to fit the pill labels | A frame that works with bare labels ("Nicio comandă: Azi"). Genuinely one label set. Cost: reads as UI-speak in a two-line empty state the design wrote as prose. | |
| Restructure so the label stands alone | Fixed headline; period rides the sub-line. No interpolation. Cost: collides with the slot Phase 10 wants for filter copy. | |

**User's choice:** A second prepositional set → **D-13**
**Notes:** Follows existing precedent rather than inventing one — `i18n.jsx:208` (`h_period_today: 'Azi'`) and `:225` (`h_today: 'Astăzi'`) show the project already hit this need.

### Q4 — How should the custom range be formatted across pill, tiles, and empty state?

| Option | Description | Selected |
|--------|-------------|----------|
| One helper, locale-aware, year only when needed *(recommended)* | Single formatter in `history-utils.js` via `Intl.DateTimeFormat`; omits the year in-year, adds it across a boundary — which the 366-day cap makes reachable. Pure and unit-testable. Cost: conditional-year logic to test. | ✓ |
| Always show the year | One format, never ambiguous, no conditional. Cost: wider in a pill among four siblings; repeats a year staff know. | |
| Numeric short form | "03.03 – 17.03" — most compact. Cost: inverts between ro `dd.mm` and en `mm/dd` — the same pill reads as two ranges depending on language. | |

**User's choice:** One locale-aware helper → **D-14**

---

## Claude's Discretion

- **Where period state lives** — lifted to `screen-history.jsx`, kept in `useHistoryOrders` with the setter finally used, or moved to the Zustand store. Bounded by: reset-on-leave already accepted for v1.1; D-06's requirement that the rendered label derive from settled data; Phase 10's filters composing with the chosen shape.
- **Popover mechanics** — anchoring, outside-click dismissal, focus handling, Escape-to-close. No popover primitive exists in the codebase.
- **Prefill defaults** when the empty popover opens (blank vs. today in both fields).
- **The stale-"Today" case** — a long-running desktop POS left open past midnight; `getLast30DaysRange`'s lazy `useState` freezes boundaries at mount. Raised, not discussed. Do not build a clock-tick refresh without reason.
- **Whether the "30 zile" pill's full-opacity styling** (`screen-history.jsx:320`, P7 D-14's sole carve-out) needs changing once the pills become interactive.

## Deferred Ideas

- **List virtualization** — P7 D-03 deferred pending measurement; D-10's 366-day cap is the most likely trigger for revisiting.
- **Pagination for `listAdminOrders`** — an SDK/API change; the only reason a client-side cap is load-bearing.
- **Remembering a custom range across preset switches** — rejected under D-04.
- **Persisting the selected period across navigation** — reset-on-leave already accepted for v1.1.
- **A clock-tick refresh for stale "Today"** — raised under Claude's Discretion, not scoped.
- **Restyling native date inputs to match the design system** — accepted cost under D-01; a hand-built calendar is the remedy if review rejects the browser chrome.
- **Design-system popover primitive** — none exists; extract one if Phases 10/11 want it too.
- **Keeping the previous list on a failed switch** — rejected under D-07; P8 D-07 is the counter-precedent.
- **Business-day cutoff for day grouping** — rejected under P7 D-04, unchanged.
