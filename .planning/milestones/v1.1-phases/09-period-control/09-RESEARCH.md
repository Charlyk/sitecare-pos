# Phase 9: Period Control - Research

**Researched:** 2026-07-17
**Domain:** TanStack Query re-fetch-on-key-change patterns; native browser date input; locale-aware date formatting; popover UI mechanics in a hand-rolled (no-component-library) React app
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01: Native `<input type="date">` pair in a popover anchored under the Interval pill.** No new
  dependency; accepted cost is browser-chrome styling. Rejected: inline filter-bar fields, a
  hand-built calendar.
- **D-02: Explicit Apply button — nothing fetches until it is clicked.** Popover holds both dates in
  local state; Apply stays disabled until the range is valid.
- **D-03: An applied custom range renders ON the pill** (e.g. `3 Mar – 17 Mar`), replacing the static
  "Interval" label. Pill widens with content (accepted cost).
- **D-04: Switching to a preset CLEARS the custom range.** Pill reverts to "Interval"; popover reopens
  empty. No remembered range.
- **D-05: Keep the previous list visible and dimmed during a switch** (TanStack Query
  `placeholderData: keepPreviousData`). Dimming must read as loading, not disabled — distinct from
  the greyed-out/inert convention (`P7 D-14`).
- **D-06: The tile sub-label follows the DATA, not the click.** Rendered period label must derive
  from the range that produced the visible rows, not from the pill's selected state.
- **D-07: A failed switch shows the full-area error + retry, per `P7 D-16`** — the table area is
  replaced and previous rows are discarded. Deliberately diverges from `P8 D-07`'s
  keep-what-you-have instinct.
- **D-08: The attempted range stays selected and Retry re-fetches THAT range.** Previous period's
  cache entry is untouched — clicking its pill restores instantly, no refetch.
- **D-09: A hard span cap, enforced in the picker.** Exceed it and Apply stays disabled with a
  message naming the limit.
- **D-10: The cap is 366 days — a full year.** Chosen over the recommended 92 days so a year-end
  reconciliation and Phase 11's CSV export work in one pass. Unmeasured 12× worst case, accepted
  knowingly.
- **D-11: Constrain inputs via native `min`/`max`** so invalid ranges largely cannot be picked; an
  Apply-time check is still required (typed values bypass `min`/`max`). `min`/`max` recompute as the
  other field changes. Future dates excluded (History is finished-only).
- **D-12: The tile sub-label reuses the pill labels verbatim** (`h_period_*` keys + D-14's formatted
  range for custom). One label source feeds pill and tiles.
- **D-13: The empty state gets its own prepositional label set for prose** (`h_period_in_*`) because
  pill labels do not survive interpolation in Romanian. `h_today` reused directly for "Today" (no new
  key needed for that one period).
- **D-14: One locale-aware range formatter, year shown only when needed** — a single pure helper in
  `history-utils.js` using `Intl.DateTimeFormat`, serving the pill, tile sub-lines, and empty state.

### Claude's Discretion

- **Where period state lives** — lifted into `screen-history.jsx`, kept in `useHistoryOrders` with
  the setter finally used, or moved to the Zustand store. Constraints: reset-on-leave is already
  accepted for v1.1 (store persistence not needed); D-06 requires the *rendered* label to derive from
  settled data, not selection; Phase 10's filters will compose with whatever shape is chosen.
- **Popover mechanics** — anchoring, outside-click dismissal, focus handling, whether Escape closes.
  (Resolved by `09-UI-SPEC.md`: both outside-click and Escape, per the `shell.jsx` precedent.)
- **Prefill defaults** when the empty popover opens. (Resolved by `09-UI-SPEC.md`: blank, not
  today-in-both-fields.)
- **The stale-"Today" case** — app is a long-running desktop POS that may sit open past midnight;
  `getLast30DaysRange`'s lazy `useState` freezes boundaries at mount. Do not build a clock-tick
  refresh without reason.
- **Whether the "30 zile" pill's currently-full-opacity styling** needs any change once pills become
  genuinely interactive.

### Deferred Ideas (OUT OF SCOPE)

- List virtualization — deferred pending real-data measurement; D-10's 366-day cap is the most likely
  trigger to revisit.
- Pagination for `listAdminOrders` — an SDK/API change, out of reach for this phase.
- Remembering a custom range across preset switches — rejected under D-04.
- Persisting the selected period across navigation — reset-on-leave accepted for v1.1.
- A clock-tick refresh for the stale-"Today" case — not scoped; revisit only if staff report it.
- Restyling the native date inputs to match the design system — accepted cost under D-01.
- Design-system popover primitive — none exists; this phase builds a single-purpose popover.
- Keeping the previous list on a failed switch — rejected under D-07 in favor of `P7 D-16` consistency.
- Business-day cutoff for day grouping — rejected under `P7 D-04`, unchanged here.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| HIST-04 | User can switch the period via presets — Today / 7 days / 30 days / custom range — and the list reloads for the new range | Pattern 1 (range-parameterized query hook) generalizes the existing `getLast30DaysRange` into preset builders + a custom-range validator/formatter, all pure and unit-testable in `history-utils.js`; `placeholderData: keepPreviousData` (Standard Stack, Code Examples) satisfies D-05's dimmed-reload requirement; Pattern 2 (label-follows-data) satisfies D-06; Pitfall 4/5 and the Validation Architecture test map cover the cache-key and existing-test-regression risks specific to making this hook's range switchable |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

Directives from `./CLAUDE.md` applicable to this phase (others — CSP domain config, GitHub Package
Registry auth, SSE auth headers, macOS notarization — are unaffected by this phase and omitted):

1. **`@charlyk/admin-client` is the ONLY data layer.** The generalized range fetch must continue to
   go through `client.admin.orders.list({ query: { from, to } })` exclusively — no direct HTTP call
   to the admin API, even for the custom-range case.
2. **`window.*` globals are forbidden in production code.** The popover's outside-click/Escape
   listeners use `document.addEventListener` (standard DOM API via `document`, not `window`) — this
   matches the existing `shell.jsx` precedent and is not a `window.*` module-global violation.
3. **ES modules only; no prototype-era module system.** All new range-builder/formatter/validator
   functions belong in `history-utils.js` as named exports, consistent with the existing module.
4. **Design Fidelity — do not change colors, spacing, typography, or layout without explicit
   instruction.** `09-UI-SPEC.md` already resolves this for every value this phase touches (including
   three formally grandfathered off-grid spacing exceptions); the plan should not introduce any
   additional visual deviation beyond what that document specifies.
5. **Unready features stay greyed-out, not hidden.** Status/type filter pills, search input, and
   Export button remain inert (`disabled`, dimmed, visible) this phase — only the four period pills
   and the new custom-range popover become interactive. This phase must not accidentally enable any
   Phase 10/11 control while touching the shared `FilterBar` component.

## Summary

Phase 9 is small in surface area but precise in its constraints: it unfreezes one `useState` lazy
initializer (`use-history-orders.js:19-22`), generalizes one pure helper (`getLast30DaysRange` in
`history-utils.js`) into preset+custom range builders, and builds exactly one genuinely new UI
surface — a native-`<input type="date">` popover with an explicit Apply button. Every other piece
(day-grouping, summary computation, error/empty components, i18n scaffolding) already ships from
Phase 7 and is reused verbatim; this phase only retargets what feeds them.

All the domain technology already exists in the codebase or its dependency tree — no new npm
package is needed. The two mechanisms this phase leans on are both already-installed, well-defined
APIs: TanStack Query v5's `placeholderData: keepPreviousData` (for D-05's dimmed-not-blanked
loading) and the platform's native `Intl.DateTimeFormat` + `<input type="date">` (for D-14's range
formatter and D-01's picker). Both were verified this session against the installed package version
and against live Node execution, respectively — see Code Examples.

The one real risk this research surfaces that `09-CONTEXT.md`/`09-UI-SPEC.md` do not explicitly
flag: `<input type="date">` only renders a real calendar affordance in WebKit (macOS's engine) from
Safari 14.1 / macOS 11 Big Sur (April 2021) onward — a genuinely-shipped-controls fix, not a
progressive-enhancement footnote. On older macOS the same markup degrades to a plain text field with
no calendar chrome at all, which is a materially different "accepted cost" than the browser-chrome-
styling difference D-01 already accepts. See Pitfall 3 and Environment Availability.

**Primary recommendation:** Generalize `getLast30DaysRange(now)` into a small set of pure range
builders in `history-utils.js` (today/7/30 + a custom-range validator/formatter), pass the resolved
`{from, to}` into `useHistoryOrders({from, to})` as a parameter (replacing the internal lazy
`useState`), add `placeholderData: keepPreviousData` to the query, and track two pieces of state in
`screen-history.jsx`: the *selected* period (drives pill styling immediately) and the *settled*
period (drives tile sub-label + empty-state copy, per D-06 — derived from `data`'s own query
variables via a second small piece of state set only inside `onSuccess`/after the fetch resolves,
not from the click).

## Architectural Responsibility Map

This is a single-tier desktop app: a Tauri-hosted React renderer (Client) talking to one external
service, the SiteCare Admin API, exclusively through `@charlyk/admin-client` (API/Backend). There is
no SSR tier, no CDN tier, and no separate database tier the app talks to directly.

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Period/pill selection state, custom-range popover UI | Browser/Client | — | Pure UI state (which pill is lit, whether the popover is open) — Zustand-or-component-state territory, never server state |
| Custom-range validity guardrails (366-day cap, min/max) | Browser/Client | — | Enforced entirely client-side via native input `min`/`max` + an Apply-time check; the SDK does no range validation of its own (confirmed: `ListAdminOrdersData.query` is `{from?, to?}` with no documented bounds) |
| Order data for the selected range | API/Backend | Browser/Client (cache) | `client.admin.orders.list({query:{from,to}})` is the sole data source; TanStack Query is the client-side cache/staleness layer over it — it does not own the data, it mediates access to it |
| Day-grouping, summary tiles, display-status precedence | Browser/Client | — | `history-utils.js` — pure, SDK-free derivation over whatever list is fetched (D-15: no second data source, e.g. `getAdminDashboard`, is used) |
| Locale-aware range formatting, period copy | Browser/Client | — | `Intl.DateTimeFormat` + `src/i18n.jsx` — no backend involvement; purely a rendering concern |

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@tanstack/react-query` | `^5.99.2` installed (registry latest `5.101.2`) [VERIFIED: npm registry] | `placeholderData: keepPreviousData` for D-05's dimmed-in-place loading | Already the project's server-state layer (`CLAUDE.md` § Architecture Decisions); v5's `keepPreviousData` function is the documented, first-class replacement for v4's removed `keepPreviousData: true` boolean option [CITED: tanstack.com/query/v5/docs/framework/react/guides/placeholder-query-data] |
| Native `<input type="date">` | Browser built-in, no version | Custom-range start/end fields (D-01) | Zero new dependency; OS supplies calendar UI + locale handling; explicit project decision (D-01), not a research recommendation to revisit |
| `Intl.DateTimeFormat` | Browser built-in (ECMA-402), no version | D-14's locale-aware range formatter (`3 mar. – 17 mar.` / `3 Mar – 17 Mar`) | Already used in this exact codebase for the equivalent problem — `data.jsx:175` (`formatRON` via `Intl.NumberFormat`) and `screen-history.jsx:64` (`toLocaleDateString('ro-RO'/'en-GB', …)`) — this phase's formatter is a direct extension of an established pattern, not a new one |

No new package installs this phase. See Package Legitimacy Audit.

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@testing-library/react` / `vitest` | `^16.3.2` / `^4.1.5` [VERIFIED: npm registry] | Test the range builders, span validator, and formatter in `history-utils.js`; test the hook's now-switchable query key in `use-history-orders.test.js` | Already the project's exclusive test stack — every existing History test (`history-utils.test.js`, `use-history-orders.test.js`, `screen-history.test.jsx`) uses this combination |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Native `<input type="date">` | A date-picker library (e.g. `react-day-picker`, `flatpickr`) | Already rejected under D-01: no date library exists anywhere in the codebase today, and a hand-built calendar was independently rejected as "by far the most code in an otherwise small phase." Not revisited here — the accepted cost (browser-chrome styling) is real but bounded, see Pitfall 3 |
| TanStack Query `placeholderData: keepPreviousData` | Manually caching the previous list in a `ref`/local state and swapping it in during `isLoading` | Reinvents exactly what the library already does per-query-key, and loses the free per-range cache reuse D-08 depends on (revisiting a previously-successful pill must restore instantly with no refetch — that's the query cache, not a manual cache) |
| `Intl.DateTimeFormat` | A date-formatting library (`date-fns`, `dayjs`) | No such library exists in this codebase; `Intl` already does everything D-14 needs (verified output below) with zero bundle cost |

**Installation:**
No install step — every API used this phase is already present in `package.json` or the browser
runtime.

## Package Legitimacy Audit

**Not applicable this phase.** No new external package is introduced. `@tanstack/react-query` is an
already-installed, already-audited dependency (installed in Phase 3); the two other mechanisms this
phase relies on (`<input type="date">`, `Intl.DateTimeFormat`) are browser/runtime built-ins, not
packages. If the planner later decides a hand-built calendar or a popover primitive library is
warranted (see `09-CONTEXT.md` `<deferred>` — both are explicitly deferred, not scoped to this
phase), a fresh legitimacy audit would be required at that time.

## Architecture Patterns

### System Architecture Diagram

```
User clicks a period pill / Apply Range
            │
            ▼
  screen-history.jsx (Client)
    ├─ selectedPeriod state ──────► drives pill styling IMMEDIATELY (intent signal)
    │
    └─ range = presetRange(selectedPeriod) | customRange   [history-utils.js, pure]
            │
            ▼
  useHistoryOrders({ from, to })            [use-history-orders.js]
    queryKey: ['history-orders', from, to]  ◄── distinct cache entry per range (enables D-08's
            │                                    "revisit a successful pill → instant, no refetch")
            ├─ placeholderData: keepPreviousData  → previous rows/tiles stay visible, dimmed
            ▼
  client.admin.orders.list({ query: { from, to } })   [API/Backend — @charlyk/admin-client]
            │
     success│                              │failure
            ▼                              ▼
  normalizeOrder(...) per row      ErrorBlock replaces table body (D-07)
            │                      SummaryStrip isError branch (D-07, reused from Phase 7)
            ▼                      pill the user clicked STAYS selected (D-08); Retry
  filterFinishedOrders             re-fetches the SAME range
  groupOrdersByDay                 │
  computeSummary                   ▼
  [history-utils.js, pure — same fn Retry ──► re-enters this diagram at
   for every range, no branching]         "client.admin.orders.list" with the
            │                             SAME {from,to} that failed
            ▼
  settledRange = the range that PRODUCED this data (D-06)
            │
            ▼
  Rendered: day-grouped rows, summary tiles, tile sub-label/empty-state
  copy — all derived from settledRange, NOT from selectedPeriod
```

### Recommended Project Structure

No new files. This phase edits four existing files:

```
src/
├── history-utils.js       # + preset range builders, span validator, D-14 formatter (pure, tested)
├── use-history-orders.js  # accepts {from,to} param instead of freezing one at mount; + keepPreviousData
├── screen-history.jsx     # live period pills, custom-range popover, D-12/D-13 copy wiring
└── i18n.jsx                # D-13's h_period_in_* set, D-09's cap message, h_range_* labels
```

### Pattern 1: Range-parameterized query hook (replaces the frozen `useState`)

**What:** `useHistoryOrders` currently freezes its range at mount via a `useState` lazy initializer
with an unused setter. This phase's core change is making the range a caller-supplied value so the
screen can drive it, while preserving the query-key-stability guarantee the original comment
protects.

**When to use:** Any TanStack Query hook whose fetch parameters must become interactive after
initially being "fixed at mount" — the exact trap already documented in this file's own header
comment.

**Example:**
```javascript
// Source: this codebase, src/use-history-orders.js — generalized from the existing pattern.
// The caller (screen-history.jsx) now owns the range; the hook's job is purely to fetch+cache it.
import { keepPreviousData, useQuery } from '@tanstack/react-query';

export function useHistoryOrders({ from, to }) {
  const { client } = useAuth();
  return useQuery({
    queryKey: ['history-orders', from, to],   // range fully determines the cache entry (D-08)
    queryFn: async () => {
      const result = await client.admin.orders.list({ query: { from, to } });
      if (result.error) throw new Error(result.error.error ?? 'Failed to load history');
      return (result.data?.orders ?? []).map(normalizeOrder);
    },
    enabled: !!client && !!from && !!to,
    staleTime: 30_000,
    placeholderData: keepPreviousData,        // D-05: previous list stays visible, dimmed
  });
}
```
The critical invariant to preserve from the original: **the caller must not compute a new `{from,
to}` object identity on every render** for a stable period. `screen-history.jsx` must memoize the
resolved range (e.g. `useMemo` keyed on the selected preset id / applied custom range, not
recomputed inline from `new Date()` every render) — the same lazy-initializer discipline, moved up
one level.

### Pattern 2: Label-follows-data, not label-follows-click (D-06)

**What:** Track two values, not one. `selectedPeriod` (or `selectedRange`) updates synchronously on
click and drives the pill's visual state. A second value — the range that produced the *currently
rendered* `data` — drives every other period-dependent render (tile sub-label, empty-state phrase).
Because `useQuery`'s `data` only updates once the fetch settles (and holds the *previous* range's
data throughout the `keepPreviousData` window), the query's own resolved variables are the correct
source for this second value — not the click handler's state.

**When to use:** Any UI where an optimistic "what did the user just ask for" signal (the pill) must
render together with a lagging "what is actually displayed" signal (the tiles/sub-label), and the
two must never silently swap into agreement without an explicit data-arrival event.

**Example:**
```javascript
// Illustrative — the concrete mechanism TanStack Query offers for this exact problem.
// Source: TanStack Query v5 docs, Placeholder Query Data guide.
const { data, isFetching, isPlaceholderData } = useHistoryOrders({ from, to });
// isPlaceholderData === true while `data` is still the PREVIOUS range's result.
// The tile sub-label/empty-state copy must key off the query's OWN variables
// (i.e. the {from,to} that produced `data`), tracked via a ref/state updated only
// when isPlaceholderData transitions from true -> false, not off `selectedPeriod`.
```

### Pattern 3: Outside-click + Escape dismissal (extends the one existing popover precedent)

**What:** `shell.jsx:17-29,148-150` already implements outside-click dismissal for the sidebar
user-menu popover via a `useRef` + `document.addEventListener('mousedown', …)` pair, cleaned up in a
`useEffect` return. `09-UI-SPEC.md`'s Custom Range Popover Contract requires this **plus** an
`Escape` keydown listener, which `shell.jsx` does not currently have.

**When to use:** The custom-range popover (`chevDown`-triggered, `screen-history.jsx`, this phase's
only new popover).

**Example:**
```javascript
// Source: src/shell.jsx:20-29 (verbatim precedent), extended with Escape per 09-UI-SPEC.md.
useEffect(() => {
  if (!popoverOpen) return;
  function handleClick(e) {
    if (popoverRef.current && !popoverRef.current.contains(e.target)) setPopoverOpen(false);
  }
  function handleKey(e) {
    if (e.key === 'Escape') setPopoverOpen(false);
  }
  document.addEventListener('mousedown', handleClick);
  document.addEventListener('keydown', handleKey);
  return () => {
    document.removeEventListener('mousedown', handleClick);
    document.removeEventListener('keydown', handleKey);
  };
}, [popoverOpen]);
```

### Anti-Patterns to Avoid

- **Calling a range helper inline in the render body for a value that must stay stable across
  re-renders** — `use-history-orders.js`'s own header comment calls this out for the original 30-day
  case; the same trap now applies one level up, in `screen-history.jsx`, for whichever range is
  currently active. A new object identity every render (even with numerically-identical `from`/`to`
  strings, if constructed fresh) is fine for TanStack Query (it compares serialized key values, not
  object identity) — the actual hazard is **new *string values*** from re-deriving `now` on every
  render (e.g. calling `getLast30DaysRange()` inline rather than in a `useMemo`/`useState`
  initializer keyed on the selected preset).
- **Deriving the sub-label / empty-state period phrase from `selectedPeriod`** — this is D-06's
  explicit prohibition. It produces exactly the "7 zile / 1,240 orders" mismatch the decision exists
  to prevent, for the entire duration of every switch.
- **Using `isLoading` for the period-switch dimming instead of `isFetching`/`isPlaceholderData`** —
  in TanStack Query v5, `isLoading` is `isPending && isFetching`, i.e. true only when there is *no*
  data yet. Once the first successful fetch has landed, `isLoading` is `false` for the remainder of
  the component's life — including during every subsequent period switch. Phase 7's skeleton state
  (`screen-history.jsx:231`, `isLoading && Array.from(...)`) correctly gates on `isLoading` for the
  *first* load; D-05's dimmed state for every switch *after* that must gate on `isFetching` (or
  equivalently `isPlaceholderData`), a distinct boolean.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Keeping the previous list visible during a re-fetch | A manual `lastGoodData` ref + branching render logic | `placeholderData: keepPreviousData` | Built into the already-installed query library; also correctly ties into `isPlaceholderData` for the D-06 label-lag logic — a hand-rolled version would need to reinvent that signal too |
| Date-range formatting per locale | Manual `if (lang === 'ro')` string templates for month names | `Intl.DateTimeFormat(locale, {day:'numeric', month:'short', year: maybe})` | Verified this session to produce exactly the target strings (`3 mar.` / `3 Mar`) with zero hand-maintained month-name tables; already the pattern `screen-history.jsx:64` and `data.jsx:175` use for adjacent problems |
| Calendar UI for picking two dates | A hand-built month-grid component (nav, range highlighting, keyboard access, i18n month names) | Native `<input type="date">` × 2 | Explicitly rejected by the user in D-01 as "by far the most code in an otherwise small phase" — not revisited here |
| Enforcing "end can't precede start," "no future dates," "span ≤ 366 days" | A custom validation library or ad-hoc boolean soup scattered across the component | Native `min`/`max` attributes (recomputed on each field's `onChange`) **plus** one small pure validator function in `history-utils.js` for the Apply-time check (native inputs accept typed values that bypass `min`/`max`) | `min`/`max` narrows what's *pickable*; the pure validator is the single source of truth for what's *submittable*, unit-testable exactly like every other `history-utils.js` function |

**Key insight:** every mechanism this phase needs is either already installed or already a browser
platform primitive. The risk in this phase is not missing tooling — it is state-shape discipline
(which value drives which render, per D-06) and one platform-support edge (WebKit's date-input
history, Pitfall 3) — not "what library should we add."

## Common Pitfalls

### Pitfall 1: Query-key instability reintroducing the infinite-refetch trap

**What goes wrong:** `useHistoryOrders`'s cache key is `['history-orders', from, to]`. If the caller
(`screen-history.jsx`) recomputes `from`/`to` with a fresh call to a range-builder on every render
(rather than memoizing it against the selected preset id / applied custom range), the *string
values* can still end up stable (same calendar day → same ISO string) in the common case, but for
"Today" specifically, a range builder called with `new Date()` inline recomputes `to`'s exclusive
upper bound (start of tomorrow) freshly each time — which is stable within a day but is exactly the
kind of inline-`now()`-in-render-body call the original file's comment warns against as a general
practice, and it's one boundary condition (midnight rollover, see Pitfall 5 in `09-CONTEXT.md`'s own
language) away from becoming visibly wrong.

**Why it happens:** The original code avoided this with a `useState` lazy initializer specifically
because "no period switching exists yet." That justification is gone this phase — but the underlying
hazard (fresh `now()` calls producing fresh strings) is not.

**How to avoid:** Compute the active range in exactly one place, from exactly one state transition
(pill click / Apply click), and pass the *already-resolved* `{from, to}` down — never call a
range-builder function reactively inside the render body keyed on nothing.

**Warning signs:** Network tab shows a refetch on every keystroke/re-render unrelated to a period
change; React DevTools shows `use-history-orders`'s queryKey array changing on unrelated re-renders.

### Pitfall 2: `isLoading` vs `isFetching`/`isPlaceholderData` confusion (see Anti-Patterns)

**What goes wrong:** Reusing Phase 7's `isLoading` boolean to gate D-05's dimmed treatment does
nothing after the first successful load — the skeleton never re-triggers (which is correct for
skeletons) but the dimmed-loading treatment silently never triggers either.

**Why it happens:** Both `isLoading` and `isFetching` "feel like" the loading flag; only one of them
fires on every subsequent fetch.

**How to avoid:** Gate Phase 7's skeleton on `isLoading` (unchanged); gate this phase's dimmed
treatment on `isFetching` (true during *any* fetch, including background refetches) or, more
precisely, `isPlaceholderData` (true specifically while `data` is stale placeholder content from a
previous range).

**Warning signs:** Switching periods shows no visual feedback at all until the new data simply
appears (no dim, no spinner) — the D-05 contract silently not implemented despite the code compiling.

### Pitfall 3: `<input type="date">` renders no calendar controls on older WebKit (macOS)

**What goes wrong:** The native date-picker calendar affordance for `<input type="date">` (and
`datetime-local`/`time`) only shipped in WebKit — Safari and, by extension, `WKWebView`, the engine
Tauri uses on macOS — starting with Safari 14.1 / macOS 11 Big Sur (April 2021). [CITED:
bugs.webkit.org/show_bug.cgi?id=119175, resolution comment dated 2021] On any macOS version older
than Big Sur, the exact same markup silently degrades to a plain text field with **no calendar
button, no date-specific keyboard, and no `min`/`max` enforcement UI** — a materially different
failure mode than D-01's accepted "browser-chrome-styled, doesn't match our design system" cost,
which assumes a calendar renders at all.

**Why it happens:** WebKit lagged Chromium (2012), Firefox (2017), and Edge (2015) by nearly a
decade on this specific input type; it is a genuinely late platform feature, not a hypothetical edge
case.

**How to avoid:** Confirm the project's actual minimum supported macOS version (not currently pinned
in `src-tauri/tauri.conf.json` — no `minimumSystemVersion`/`LSMinimumSystemVersion` found this
session) is Big Sur (11.0) or later. If an older macOS must be supported, D-01's underlying premise
("OS supplies a real calendar") does not hold on that OS and the Apply-time validator becomes the
*only* guardrail (no `min`/`max` UI feedback at all) — worth a line in the plan's risk notes even if
no code changes result. `date`/`datetime-local`/`time` are fine; `month`/`week` remain unsupported on
macOS WebKit even today — irrelevant here since D-01 only uses `date`, noted for completeness.

**Warning signs:** QA on an older Mac reports "the date fields don't do anything when I click them"
— confirm the OS version before assuming a code bug.

### Pitfall 4: Query-key granularity must match D-08's per-range caching promise exactly

**What goes wrong:** If the custom-range query key is built from anything *other than* the exact
`{from, to}` ISO strings that were actually applied (e.g. a `'custom'` string literal alongside
separately-stored dates), re-applying the *same* custom range a second time in the same session would
not hit the existing cache entry, silently defeating D-08's "clicking back restores instantly, no
refetch" guarantee for custom ranges specifically (it already works for presets, since their
`from`/`to` are deterministic functions of "now" + a fixed offset).

**Why it happens:** It's tempting to key the query on the *selected preset id* (`'today'`, `'7'`,
`'30'`, `'custom'`) for readability, but the preset id is not what TanStack Query needs to
disambiguate cache entries — the resolved date strings are.

**How to avoid:** Keep the existing `['history-orders', from, to]` shape verbatim — resolve
*whichever* period/custom-range is active down to concrete `{from, to}` ISO strings *before* calling
`useHistoryOrders`, and never include the preset id or a `'custom'` sentinel in the query key itself.

**Warning signs:** Unit test: apply a custom range, switch to a preset, switch back to the exact same
custom range — assert the mock SDK call count does **not** increase on the third step.

### Pitfall 5: The existing "stable query key across re-renders" test encodes now-obsolete behavior

**What goes wrong:** `src/__tests__/use-history-orders.test.js:193-209` currently asserts that
calling `useHistoryOrders()` with **no arguments**, then re-rendering, produces exactly one SDK call
— a direct encoding of the frozen-at-mount behavior this phase removes. Once `useHistoryOrders`
accepts a `{from, to}` parameter, this test's premise (no arguments, one implicit range) no longer
matches the hook's new signature, and every other existing test in this file that calls
`useHistoryOrders()` with zero arguments will need updating to pass a range explicitly.

**Why it happens:** This is a direct, foreseeable consequence of changing a hook's parameter
contract — not a subtle interaction, but easy to discover only at test-run time rather than at
planning time if the plan doesn't call it out explicitly.

**How to avoid:** Treat `src/__tests__/use-history-orders.test.js` as a file this phase must edit,
not just `use-history-orders.js` itself. The specific test to rewrite (not delete — the underlying
"stable key ⇒ no extra fetch" guarantee is still worth asserting, just against an explicit stable
range passed by the caller, not an implicit mount-time one).

**Warning signs:** None at code-review time — this only surfaces as a red test suite, which is the
intended catch, but the plan should anticipate it rather than have it arrive as a surprise mid-phase.

## Code Examples

### D-14's formatter — verified output (Node execution, this session)

```javascript
// Source: verified via `node -e` this session against the installed Node/V8 Intl implementation.
const fmtRo = new Intl.DateTimeFormat('ro-RO', { day: 'numeric', month: 'short' });
const fmtEn = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' });
fmtRo.format(new Date(2026, 2, 3));   // -> "3 mar."
fmtRo.format(new Date(2026, 2, 17));  // -> "17 mar."
fmtEn.format(new Date(2026, 2, 3));   // -> "3 Mar"
fmtEn.format(new Date(2026, 2, 17));  // -> "17 Mar"

// With year (D-10's year-crossing case):
new Intl.DateTimeFormat('ro-RO', { day: 'numeric', month: 'short', year: 'numeric' })
  .format(new Date(2026, 2, 3));      // -> "3 mar. 2026"
```
These match `09-CONTEXT.md` D-14's target strings (`3 mar. – 17 mar.` / `3 Mar – 17 Mar`) exactly —
the formatter is a thin wrapper: format both endpoints, join with ` – ` (en dash), pass
`year: 'numeric'` to both calls only when the two dates' `getFullYear()` differ from the *current*
calendar year (per D-14: "omitting the year when the range sits inside the current one").

### Date-input value parsing — avoid the string-parse gotcha

```javascript
// Source: this codebase's own established convention (history-utils.js's getLast30DaysRange
// constructs Date objects from y/m/d components, never from a bare ISO string). The same
// discipline applies to <input type="date">'s value, which is always 'YYYY-MM-DD'.
function localDateFromInputValue(value) {
  // value is guaranteed 'YYYY-MM-DD' by the input's own contract when non-empty.
  const [y, m, d] = value.split('-').map(Number);
  return new Date(y, m - 1, d, 0, 0, 0, 0);   // local midnight — NOT new Date(value)
}
```
`new Date('2026-03-17')` parses as **UTC** midnight, not local midnight — in Romania's current
UTC+2/+3 offset this happens not to shift the calendar day (verified this session:
`new Date('2026-03-17').toString()` → `Tue Mar 17 2026 02:00:00 GMT+0200`), but it is the wrong
building block to reach for regardless, since it silently breaks for any negative-UTC-offset user and
contradicts every other date-construction call in `history-utils.js`, all of which use the
component-constructor form (`new Date(year, month, day, …)`).

### `placeholderData: keepPreviousData` — v5 API, verified against installed version

```javascript
// Source: TanStack Query v5 docs (Placeholder Query Data guide) — confirms this is the documented
// v5 replacement for v4's removed `keepPreviousData: true` boolean.
// [CITED: tanstack.com/query/v5/docs/framework/react/guides/placeholder-query-data]
import { keepPreviousData, useQuery } from '@tanstack/react-query';

const { data, isFetching, isPlaceholderData } = useQuery({
  queryKey: ['history-orders', from, to],
  queryFn: fetchRange,
  placeholderData: keepPreviousData,
});
// isPlaceholderData: true while `data` is the PREVIOUS range's result, during the new fetch.
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|---------------|--------|
| `keepPreviousData: true` (TanStack Query v4) | `placeholderData: keepPreviousData` (v5) | v5 release (already the version installed in this project — no migration needed, this is simply the correct API to reach for) | Nothing to migrate; just use the current API directly. Do not write v4-style code from memory/training data — flagged here because `keepPreviousData: true` as a bare boolean is a very common stale-training-data mistake for this exact feature |
| `<input type="date">` unsupported calendar UI on WebKit | Full calendar UI support on WebKit (Safari 14.1+/macOS 11+) | Shipped April 2021 | D-01's "native input" choice is now safe on modern macOS; only relevant if the project's actual minimum macOS target predates Big Sur (unconfirmed — see Pitfall 3) |

**Deprecated/outdated:**
- `keepPreviousData: true` / `isPreviousData` — removed entirely in TanStack Query v5; do not
  reference this API shape in any new code even as a comment.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Period state should live as: `selectedPeriod` (immediate, drives pill styling) in `screen-history.jsx` component state, plus a second "settled range" value derived from the query's own resolved variables (not lifted into Zustand). | Architecture Patterns, Pattern 2 | `09-CONTEXT.md` marks "where period state lives" as explicit Claude's Discretion, not a locked decision — if the planner instead lifts this into Zustand (e.g. for future cross-screen reuse), the D-06 label-follows-data mechanism still applies but the state ownership diagram in this doc would need adjusting. Low risk: the mechanism (not the location) is what D-06 actually constrains. |
| A2 | The project's Tauri build targets macOS 11 (Big Sur) or later, making `<input type="date">`'s calendar UI reliably available. | Pitfall 3 | No `minimumSystemVersion` is currently set in `src-tauri/tauri.conf.json` (checked this session) — if the actual support target includes pre-Big-Sur macOS, D-01's premise (native calendar UI) partially fails on those machines and the Apply-time validator becomes the sole guardrail, with no `min`/`max` visual feedback. Worth a one-line confirmation, not a redesign. |

## Open Questions

1. **Where should the "selected vs. settled" period state formally live, and how granular?**
   - What we know: D-06 requires two logically distinct values (click-intent vs. rendered-truth);
     `09-CONTEXT.md` explicitly leaves the storage location to Claude's Discretion.
   - What's unclear: Whether "settled range" needs to be genuinely separate React state, or can be
     derived inline each render from `useHistoryOrders`'s own return value (the query's resolved
     `from`/`to`, obtainable via the query object or by having the screen pass through the same
     variables it fetched with, tracked in a `useRef` updated post-settle). The latter avoids an
     extra `useState` entirely.
   - Recommendation: Prefer deriving it from the query result directly (no extra state) if the
     hook's return shape makes the resolved variables inspectable; fall back to a `useRef` set only
     when `isPlaceholderData` transitions to `false`, otherwise.

2. **Is the project's actual minimum supported macOS version Big Sur (11.0) or later?**
   - What we know: No `minimumSystemVersion` is set in `tauri.conf.json` today; Big Sur is required
     for `<input type="date">`'s calendar UI in WebKit.
   - What's unclear: Whether any prior phase or the Apple Developer notarization requirements
     (`CLAUDE.md` § Critical Rules item 6) already implicitly floor this at a modern version.
   - Recommendation: A quick confirmation (not a phase task) — if unconfirmed, note the degraded
     fallback (Pitfall 3) in the plan's risk section rather than blocking on it.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| `@tanstack/react-query` `keepPreviousData` export | D-05 dimmed-loading mechanism | ✓ | `5.99.2` installed, API present since early v5 | — |
| WebKit calendar UI for `<input type="date">` (macOS) | D-01 custom-range picker | ✓ on macOS 11+ (Big Sur, Apr 2021+) [CITED: bugs.webkit.org/show_bug.cgi?id=119175] | Depends on target OS — not pinned in `tauri.conf.json` this session | Plain text field, still functional but no calendar affordance or `min`/`max` UI on pre-Big-Sur macOS — see Pitfall 3 |
| Chromium (WebView2) calendar UI for `<input type="date">` (Windows) | D-01 custom-range picker | ✓ — Chromium has supported this since 2012, long before WebView2 existed | — | — |

**Missing dependencies with no fallback:** None.

**Missing dependencies with fallback:**
- WebKit pre-Big-Sur date-input calendar UI (see above) — degrades to a plain text field; the
  Apply-time validator (D-11's second guardrail layer) remains the safety net regardless of platform.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest `^4.1.5` + `@testing-library/react` `^16.3.2` [VERIFIED: package.json] |
| Config file | Existing project vitest config (unchanged by this phase) |
| Quick run command | `npx vitest run src/__tests__/history-utils.test.js src/__tests__/use-history-orders.test.js` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| HIST-04 | Today/7/30 preset selection resolves to correct `{from,to}` | unit | `npx vitest run src/__tests__/history-utils.test.js` | ✅ (extend existing file — mirrors `getLast30DaysRange`'s existing test pattern) |
| HIST-04 | Custom-range span validator rejects >366 days, end-before-start, empty fields | unit | `npx vitest run src/__tests__/history-utils.test.js` | ✅ (extend) |
| HIST-04 | D-14 formatter omits year inside current calendar year, shows it otherwise | unit | `npx vitest run src/__tests__/history-utils.test.js` | ✅ (extend) |
| HIST-04 | `useHistoryOrders` re-fetches when `{from,to}` changes; reuses cache for a previously-fetched range | unit (hook) | `npx vitest run src/__tests__/use-history-orders.test.js` | ✅ (rewrite the mount-frozen tests, see Pitfall 5) |
| HIST-04 | Period switch failure keeps the clicked pill selected; Retry targets that same range (D-08) | integration | `npx vitest run src/__tests__/screen-history.test.jsx` | ✅ (extend existing screen test) |
| HIST-04 | Tile sub-label / empty-state copy reflects the settled range, not the click, during an in-flight switch (D-06) | integration | `npx vitest run src/__tests__/screen-history.test.jsx` | ✅ (extend) |

### Sampling Rate
- **Per task commit:** `npx vitest run src/__tests__/history-utils.test.js src/__tests__/use-history-orders.test.js`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
None — existing test infrastructure (`history-utils.test.js`, `use-history-orders.test.js`,
`screen-history.test.jsx`) already covers every phase requirement's test surface; this phase extends
those files rather than requiring new test scaffolding.

## Security Domain

`security_enforcement` is not explicitly disabled in `.planning/config.json` (absent = enabled).
This phase introduces no authentication, session, or access-control surface — it retargets an
already-authenticated, read-only fetch (`client.admin.orders.list`, already gated by the existing
auth token per Phase 2/3). The only applicable category is input validation on the client-supplied
date range.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | Unchanged — same authenticated SDK client Phase 7 already uses |
| V3 Session Management | no | Unchanged |
| V4 Access Control | no | Unchanged — no new role/permission surface |
| V5 Input Validation | yes | Client-side: native `min`/`max` on date inputs + a pure Apply-time validator in `history-utils.js` (D-11) rejecting end-before-start, future dates, and spans over 366 days before the value ever reaches the SDK call |
| V6 Cryptography | no | Not applicable |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Oversized/unbounded date range causing a slow, unpaginated, unvirtualized fetch (D-10's accepted 366-day cap is a *usability* bound, not primarily a security one, but shares the same mitigation) | Denial of Service (client-side, self-inflicted) | The 366-day cap enforced both at the input (`min`/`max`) and at Apply-time (pure validator) — already specified in D-09/D-10/D-11; no additional server-side protection exists or is needed since the SDK has no pagination to exploit maliciously beyond what any authenticated staff user could already request |
| Malformed/typed date strings bypassing `min`/`max` reaching the SDK call as garbage `from`/`to` values | Tampering (client-side input, not a network attacker) | The Apply-time validator is the backstop D-11 already requires precisely because native inputs accept typed values that bypass `min`/`max` — this is a robustness control, not a new one this research introduces |

## Sources

### Primary (HIGH confidence)
- This codebase, read directly this session: `src/use-history-orders.js`, `src/history-utils.js`,
  `src/screen-history.jsx`, `src/shell.jsx`, `src/i18n.jsx`, `src/styles.css`, `src/icons.jsx`,
  `src/__tests__/use-history-orders.test.js`, `src/__tests__/app-history-route.test.jsx`,
  `package.json`, `src-tauri/tauri.conf.json`
- `npm view @tanstack/react-query version` → `5.101.2` (registry latest; project pins `^5.99.2`) [VERIFIED: npm registry]
- Node `Intl.DateTimeFormat` output, executed directly this session (see Code Examples)

### Secondary (MEDIUM confidence)
- [TanStack Query v5 — Placeholder Query Data guide](https://tanstack.com/query/v5/docs/framework/react/guides/placeholder-query-data) — confirms `placeholderData: keepPreviousData` as the current v5 API and its v4→v5 migration shape
- [WebKit Bugzilla #119175](https://bugs.webkit.org/show_bug.cgi?id=119175) — confirms `<input type="date">` calendar UI shipped in WebKit (Safari 14.1/macOS 11, April 2021), with `month`/`week` types remaining unsupported on macOS

### Tertiary (LOW confidence)
- None — every claim above was either verified against installed code/versions this session or
  cited against an official/authoritative source.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new dependency; every mechanism verified against the installed package
  version or executed directly this session
- Architecture: HIGH — every pattern is either an existing in-codebase precedent (`shell.jsx`
  popover, `history-utils.js` pure-helper convention) or a documented, verified library API
- Pitfalls: HIGH — five of five pitfalls are either verified directly against this session's code
  reading (Pitfalls 1, 2, 4, 5) or against an authoritative external source with a dated resolution
  (Pitfall 3)

**Research date:** 2026-07-17
**Valid until:** 30 days (stable domain — no fast-moving dependencies; the one time-sensitive fact,
WebKit's date-input support, is a 2021 platform fact unlikely to regress)
