---
phase: 09-period-control
reviewed: 2026-07-17T21:04:29Z
depth: standard
files_reviewed: 8
files_reviewed_list:
  - src/history-utils.js
  - src/use-history-orders.js
  - src/screen-history.jsx
  - src/i18n.jsx
  - src/styles.css
  - src/__tests__/history-utils.test.js
  - src/__tests__/use-history-orders.test.js
  - src/__tests__/screen-history.test.jsx
findings:
  critical: 0
  warning: 3
  info: 2
  total: 5
status: clean
fixed:
  - id: WR-01
    commit: 033cc39
    summary: >-
      FilterBar now attaches a wrapper ref spanning both the Custom pill's toggle button and
      CustomRangePopover (containerRef), matching shell.jsx's userMenuRef precedent, so a real
      mousedown->click on the pill can no longer close-then-reopen the popover.
  - id: WR-02
    commit: 3942e92
    summary: >-
      isSwitching/dimmed now require isFetching && isPlaceholderData (threaded through
      SummaryStrip and FilterBar), so a same-range background refetch (e.g. window-refocus
      revalidation) no longer dims rows/tiles or shows the switch spinner.
  - id: WR-03
    commit: 4513cb4
    summary: >-
      settledPeriod is now derived synchronously during render via a ref (React's "adjust state
      during render" pattern) instead of a post-paint useEffect, closing the one-paint window
      where new data could render under the old period's label.
not_fixed: []
info_findings_deferred:
  - IN-01
  - IN-02
---

# Phase 9: Code Review Report — Period Control (HIST-04)

**Reviewed:** 2026-07-17T21:04:29Z
**Depth:** standard
**Files Reviewed:** 8
**Status:** clean

> **Fix update (2026-07-18):** All three Warning findings (WR-01, WR-02, WR-03) have been fixed
> in `src/screen-history.jsx`, each with a regression test, in commits `033cc39`, `3942e92`, and
> `4513cb4` respectively. The two Info findings (IN-01, IN-02) were intentionally left unfixed —
> both are low-risk/cosmetic per their own descriptions and were out of scope for this fix pass.
> Full suite: 401 passing / 3 pre-existing failures (unrelated; see
> `.planning/phases/09-period-control/deferred-items.md`).

## Summary

Phase 9's date-arithmetic core (`history-utils.js`: preset builders, `validateCustomRange`,
`customRangeToQuery`, `formatDateRange`) is careful and correct — local-midnight construction is
used consistently (never `toISOString()`-derived UTC slicing), the exclusive-upper-bound
convention holds across every builder, the 366-day cap is defined exactly once and imported
everywhere it's enforced, and the validator's reason-precedence order matches its own docstring
and the test suite. `useHistoryOrders` is a thin, correct parameterization of the v5
`keepPreviousData` pattern with a query key isolated from the live-order cache root, as designed.
i18n keys are fully symmetric between `ro` and `en` (verified programmatically — no orphaned or
duplicated keys), and the `h_empty` → `h_empty_prefix` rename left no stale references.

The 149 existing unit/render tests all pass, and the pure-function layer is genuinely
well-covered. However, three real defects were found in `screen-history.jsx`'s React wiring —
none of them are caught by the existing test suite because the relevant tests exercise the
`FilterBar`/`CustomRangePopover` interaction with `fireEvent.click` alone, which (unlike a real
browser) does **not** dispatch a preceding `mousedown`. Two of these are timing/event-ordering
bugs that only manifest with real DOM event sequencing; I reproduced one empirically (below) to
confirm it is not speculative. None are security issues or data-loss risks — this phase has a very
small security surface (pure client-side date math, no injection vectors, no secrets) — but the
first finding directly contradicts a documented, tested-for acceptance criterion and should be
fixed before this phase is considered closed.

## Warnings

### WR-01: The Custom pill cannot be closed by re-clicking it in a real browser (mousedown/click race)

**File:** `src/screen-history.jsx:439-451` (outside-click effect) and `src/screen-history.jsx:607-625` (pill/popover DOM structure)

**Issue:** `CustomRangePopover`'s outside-click effect attaches `panelRef` only to the popover
panel's own root `<div>` (line 474), not to a wrapper that also contains the toggle button. The
toggle button lives as a **sibling** of the popover, inside a shared `position: relative` wrapper
(lines 608-624) — it is not inside `panelRef`.

Compare this with the one existing precedent for this pattern in the codebase,
`shell.jsx:17-29,148`, which the phase plan (`09-05-PLAN.md` Task 1 `<read_first>`) explicitly
names as "the ONLY popover precedent in the codebase and the shape to copy." There, `userMenuRef`
is attached to the wrapper `<div>` that contains **both** the toggle button and the menu
(`shell.jsx:148`), so a click on the toggle button is correctly recognized as "inside" the ref and
never triggers the outside-click close.

In `screen-history.jsx`, because the ref only wraps the popover panel, a real click on the Custom
pill while it is open plays out as:
1. `mousedown` fires on the pill → document listener sees `e.target` is not contained in
   `panelRef` → calls `onClose()` → `setRangeOpen(false)`.
2. React commits; the popover unmounts (cleanup removes the listeners).
3. `click` fires on the pill next (native event order is always mousedown → mouseup → click) →
   the pill's own `onClick={() => setRangeOpen((open) => !open)}` fires, reading the *just-updated*
   state (`false`) and flipping it back to `true`.

Net effect: the popover reopens immediately after "closing," so clicking the Custom pill a second
time while it is open is a no-op from the user's perspective — it can only be dismissed via
Escape or an outside click, never by re-clicking the pill itself. This directly contradicts
`09-05-PLAN.md` Task 1's stated behavior ("clicking it again closes it") and its own test's title
(`screen-history.test.jsx:492`, `'the popover is absent on mount; clicking the Custom pill opens
it, clicking it again closes it'`).

That test passes today only because RTL's `fireEvent.click()` dispatches a single synthetic
`click` event and never a preceding `mousedown` — so the race is never exercised in the test
environment. I confirmed the bug empirically by re-running the same interaction with a real
`mousedown` → `mouseup` → `click` sequence via `fireEvent.mouseDown`/`fireEvent.mouseUp`/
`fireEvent.click` against the actual component: the popover is still present after the second
click.

**Fix:** Attach a single ref to a wrapper `<div>` around **both** the toggle button and
`CustomRangePopover`, and check `wrapperRef.current.contains(e.target)` in the outside-click
handler (matching `shell.jsx`'s exact structure) instead of scoping the ref to the panel alone:

```jsx
// FilterBar
const wrapperRef = useRef(null);
return (
  <div key={p.id} ref={wrapperRef} style={{ position: 'relative' }}>
    <button onClick={() => setRangeOpen((open) => !open)} /* ... */>
      {p.label}
      <Icon name="chevDown" size={14} />
    </button>
    {rangeOpen && (
      <CustomRangePopover
        containerRef={wrapperRef}
        t={t}
        onApply={onApplyCustomRange}
        onClose={() => setRangeOpen(false)}
      />
    )}
  </div>
);

// CustomRangePopover — accept the boundary ref from the caller instead of creating its own
export function CustomRangePopover({ t, onApply, onClose, containerRef }) {
  useEffect(() => {
    function handleMouseDown(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) onClose();
    }
    // ...
  }, [onClose, containerRef]);
  // panel div no longer needs its own ref for this purpose (data-testid can stay)
}
```

Also add a regression test that dispatches a real `mousedown`+`click` sequence (not `fireEvent.click`
alone) against the toggle button while the popover is open, asserting the popover is absent
afterward — the current test's use of `fireEvent.click` alone cannot detect this class of bug.

---

### WR-02: Passive background refetches trigger the same "period switch" dimming/spinner UI as a real range change

**File:** `src/screen-history.jsx:327` (`isSwitching`), `:394` (`dimmed`), `:632-636` (spinner render); `src/use-history-orders.js:34` (`staleTime: 30_000`); `src/main.jsx:8` (`new QueryClient()` — no `refetchOnWindowFocus` override)

**Issue:** D-05's dimmed-rows/spinner treatment is gated purely on `isFetching && !isLoading`
(`isSwitching`, line 327) and `isLoading || isError || isFetching` (`dimmed`, line 394). Neither
condition distinguishes a **user-initiated period switch** (the scenario D-05 was designed for,
and the only scenario exercised by the test suite — every D-05 test in
`screen-history.test.jsx:293-382` mocks `isFetching: true` together with `isPlaceholderData: true`)
from a **passive background revalidation** of the *same* query.

TanStack Query v5's default `refetchOnWindowFocus` is `true`, and it is not overridden anywhere
(`main.jsx:8` constructs `new QueryClient()` with no `defaultOptions`). Combined with
`staleTime: 30_000` in `useHistoryOrders`, this means: any time the Tauri window regains focus (or
mounts) more than 30 seconds after the last successful fetch, TanStack Query issues a background
refetch of the *unchanged* range. During that refetch, `isFetching` is `true` while
`isPlaceholderData` stays `false` (the query key hasn't changed, so `keepPreviousData` isn't even
in play) — but `isSwitching`/`dimmed` don't check `isPlaceholderData`, so the rows dim to 0.6
opacity, the switch spinner appears next to the pills, and the summary tiles grey out, all while
nothing the staff did changed anything. On a desktop POS app that staff routinely alt-tab away
from and back to, this will read as unexplained flicker/"is something broken?" on every return to
the screen after 30 seconds idle — not the period-switch affordance it was built for.

**Fix:** Scope the dimming to an actual range change, not any fetch. The cheapest correct signal
is `isPlaceholderData` (only true when TanStack Query is showing stale data for a *different*
query key) combined with `isFetching`, or track it explicitly via the same range-identity the
`settledPeriod` effect already computes:

```js
// only true during a genuine period switch, not a background revalidation of the same range
const isSwitching = isFetching && isPlaceholderData;
```

and thread the same signal into `SummaryStrip`'s `dimmed` (currently `isLoading || isError ||
isFetching`) so a same-range background refetch no longer greys the tiles either.

---

### WR-03: `settledPeriod` is committed via `useEffect`, allowing one paint where the tile sub-label can show the wrong period next to already-updated numbers

**File:** `src/screen-history.jsx:298-303`

**Issue:** D-06 exists specifically so that a numeric value and its period label can never disagree
on screen (`screen-history.jsx:295-297`'s own comment: "settledPeriod tracks the range that
actually PRODUCED the visible data"). But `settledPeriod` is only updated from a plain `useEffect`:

```js
const [settledPeriod, setSettledPeriod] = useState(selectedPeriod);
useEffect(() => {
  if (isSuccess && !isPlaceholderData) {
    setSettledPeriod(selectedPeriod);
  }
}, [isSuccess, isPlaceholderData, selectedPeriod]);
```

`useEffect` callbacks are explicitly deferred until *after* the browser has painted the current
commit (React docs: "fires after layout and paint, during a deferred event" — unlike
`useLayoutEffect`, which is synchronous and blocks paint). When the in-flight query resolves,
`isPlaceholderData` flips from `true` to `false` and `data`/`finished`/`summary` are recomputed
from the *new* range in that same render — but `settledPeriod` (read by `periodLabel`/`periodPhrase`
in `SummaryStrip` and `EmptyBlock`) is still the *old* value for that render, because the effect
that would advance it hasn't run yet. The browser can paint that intermediate, self-contradicting
state (new numbers next to the old period's label) before the effect fires a moment later and
triggers a corrective re-render. This is exactly the class of bug D-06 was written to make
unreachable — a numeric value momentarily paired with the wrong period name — just narrowed to a
single-paint window instead of persisting.

The existing test at `screen-history.test.jsx:397-433` cannot detect this: it manually re-invokes
`fireEvent.click` after swapping the mock's return value to force React to flush the effect
synchronously inside `act()`, which is exactly the kind of intermediate-paint state real usage (an
async query resolving on its own, with no intervening user click) does not get to skip.

**Fix:** Derive `settledPeriod` synchronously during render instead of via a post-paint effect —
e.g. compute it with a ref updated in the render body (the "adjust state during render" pattern
React recommends for exactly this kind of derived-state-from-a-condition case), or use
`useLayoutEffect` so the correction is applied before paint:

```js
const settledPeriodRef = useRef(selectedPeriod);
if (isSuccess && !isPlaceholderData && settledPeriodRef.current !== selectedPeriod) {
  settledPeriodRef.current = selectedPeriod;
}
const settledPeriod = settledPeriodRef.current;
```

## Info

### IN-01: `validateCustomRange`'s format check accepts calendar-invalid dates and relies on `Date`'s silent rollover

**File:** `src/history-utils.js:72,100-107`

**Issue:** `DATE_INPUT_RE = /^\d{4}-\d{2}-\d{2}$/` only checks digit *shape*, not calendar
validity — `'2026-13-45'` or `'2026-02-30'` both match the regex. `localDateFromInputValue` then
builds `new Date(y, m - 1, d, ...)`, which JS silently normalizes (rolls forward into the next
month/year) rather than producing an invalid date, so `Number.isNaN(start.getTime())` never
catches it. In practice this is low-risk because the only production caller
(`screen-history.jsx`'s native `<input type="date">`) cannot itself emit an out-of-range value —
but the function's own docstring claims "either parses to NaN → 'incomplete'" as a validation
guarantee, which isn't quite true for calendar-invalid-but-regex-valid strings, and this function
is exported and unit-tested as a general-purpose validator.

**Fix:** Either reject non-normalized input explicitly (compare the constructed `Date`'s
`getFullYear`/`getMonth`/`getDate` back against the parsed `y`/`m`/`d` and return `'incomplete'`
on mismatch), or narrow the docstring's claim to "malformed/overflowing calendar values are
silently normalized by `Date`, not rejected" so callers don't rely on a guarantee the function
doesn't actually provide.

### IN-02: Near-identical local-Y-M-D zero-pad helpers duplicated across two files

**File:** `src/history-utils.js:264` (`pad`) and `src/screen-history.jsx:28` (`pad2`)

**Issue:** Both files independently define `const pad = (n) => String(n).padStart(2, '0')` (under
different names), used for building local `YYYY-MM-DD`-shaped strings. Minor duplication, not a
correctness issue — flagged only because a future change to the padding convention would need to
be made in two places.

**Fix:** Export `pad`/`padDate` from `history-utils.js` and import it in `screen-history.jsx`
instead of redefining it as `pad2`.

---

_Reviewed: 2026-07-17T21:04:29Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
