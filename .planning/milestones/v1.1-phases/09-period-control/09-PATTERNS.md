# Phase 9: Period Control - Pattern Map

**Mapped:** 2026-07-17
**Files analyzed:** 6 (4 source + 2 test files touched; no net-new files)
**Analogs found:** 6 / 6 (all analogs are the file's own prior version — this is a retarget/extend phase, not a greenfield one)

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|--------------------|------|-----------|-----------------|----------------|
| `src/history-utils.js` | utility (pure derivation) | transform | itself — `getLast30DaysRange` (lines 17-21) | exact (generalize existing fn shape) |
| `src/use-history-orders.js` | hook (TanStack Query) | request-response / CRUD-read | itself (whole file) | exact (parameterize existing hook) |
| `src/screen-history.jsx` | component (screen + subcomponents) | request-response | itself, `FilterBar`/`SummaryStrip`/`ErrorBlock` (lines 92-115, 244-292, 298-345); popover chrome from `src/shell.jsx` (lines 17-29, 148-179) | exact for pills/strip/error; role-match (shell.jsx) for the net-new popover |
| `src/i18n.jsx` | config (i18n string table) | CRUD (static key-value) | itself — `h_period_*`/`h_today`/`h_empty` block (lines 208-238) | exact |
| `src/__tests__/history-utils.test.js` | test | transform | itself — existing `getLast30DaysRange` test block | exact |
| `src/__tests__/use-history-orders.test.js` | test | request-response | itself — lines 193-209 (the now-obsolete "stable key, no args" test) | exact, but must be rewritten not just extended (Pitfall 5) |

No genuinely new files this phase — every touched file already exists and ships a directly analogous pattern to extend. `src/__tests__/screen-history.test.jsx` is also extended (D-08/D-06 integration assertions) using the same RTL/vitest conventions as the files above; not separately tabulated since it has no new pattern beyond what's below.

## Pattern Assignments

### `src/history-utils.js` (utility, transform)

**Analog:** itself, `getLast30DaysRange` (lines 17-21) — the model for every new range helper this phase adds (preset builders for today/7, a custom-range validator, and D-14's formatter).

**Existing pattern to copy** (lines 17-21):
```javascript
export function getLast30DaysRange(now = new Date()) {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29, 0, 0, 0, 0)
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0)
  return { from: start.toISOString(), to: end.toISOString() }
}
```
Copy exactly this shape for `getTodayRange(now)` / `getLast7DaysRange(now)`: injectable clock defaulting to `new Date()`, local-day boundaries built via the `Date(y, m, d, ...)` component constructor (never `new Date(isoString)` — see RESEARCH's "avoid the string-parse gotcha" example), `to` as an **exclusive** upper bound (start of tomorrow), return `{ from, to }` as ISO strings.

**Module-purity header pattern** (lines 1-9): every new export (range builders, the 366-day span validator, D-14's formatter) goes in this file as a named export; the header comment's constraint — no react, no `data.jsx`, no SDK import — applies unchanged.

**D-14 formatter model** — no existing formatter in this file to copy verbatim, but the project's own `Intl` convention exists at `src/screen-history.jsx:64`ish (`toLocaleDateString('ro-RO'/'en-GB', …)`) and `data.jsx`'s `formatRON` (`Intl.NumberFormat`) — follow that convention: a pure function taking `(fromIso, toIso, locale)` returning a formatted string, using `Intl.DateTimeFormat`, never a hand-rolled month-name table.

**Validator function shape** — model it on `deriveDuration` (lines 79-104) for the "return null / a structured result, never throw" discipline: the span validator should return either `null` (valid) or a reason string, not throw, so `screen-history.jsx` can render the cap message declaratively.

---

### `src/use-history-orders.js` (hook, request-response)

**Analog:** itself — the entire file is the analog; RESEARCH Pattern 1 (Range-parameterized query hook) is the exact target shape.

**Current pattern to replace** (lines 16-23, the lazy-initializer trap):
```javascript
export function useHistoryOrders() {
  const { client } = useAuth();
  const [{ from, to }] = useState(() => getLast30DaysRange());
  return useQuery({
    queryKey: ['history-orders', from, to],
    ...
```

**Target pattern** (RESEARCH Pattern 1, verbatim):
```javascript
import { keepPreviousData, useQuery } from '@tanstack/react-query';

export function useHistoryOrders({ from, to }) {
  const { client } = useAuth();
  return useQuery({
    queryKey: ['history-orders', from, to],
    queryFn: async () => {
      const result = await client.admin.orders.list({ query: { from, to } });
      if (result.error) throw new Error(result.error.error ?? 'Failed to load history');
      return (result.data?.orders ?? []).map(normalizeOrder);
    },
    enabled: !!client && !!from && !!to,
    staleTime: 30_000,
    placeholderData: keepPreviousData,   // D-05
  });
}
```
**Preserve verbatim:** the `queryKey: ['history-orders', from, to]` shape (Pitfall 4 — never fold in a preset id or a `'custom'` sentinel), the `result.error` / `result.data` unwrap discipline (never `try/catch` the SDK call itself), and the header comment's warning about cache-root separation from `['orders']`.

**Error handling pattern:** unchanged — `if (result.error) throw new Error(...)`; TanStack Query surfaces this as `isError`, consumed by `screen-history.jsx`'s existing `ErrorBlock` branch.

---

### `src/screen-history.jsx` (component, request-response)

**Analog 1 — inert period pills → live pills** (lines 298-322, `FilterBar`):
```javascript
// Current (inert):
<button disabled style={{ ...inertBtn, background: 'transparent', color: '#555', opacity: 0.5 }}>{periods[0].label}</button>
```
Copy the *container* chrome and `periods` array construction verbatim; replace the unrolled `disabled` buttons with a `.map()` over `periods` that reads `selectedPeriod` for styling (the design source's live ternary, per UI-SPEC's Period Pills Contract table): selected → `background: var(--sc-foreground)`, `color: #fff`; unselected → `background: transparent`, `color: #555`. Remove `disabled`/`pointerEvents`/`opacity` overrides on these four buttons only — status pills/search/Export at lines 325-342 stay untouched (inert convention preserved).

**Analog 2 — popover chrome** (`src/shell.jsx` lines 17-29 for outside-click, lines 148-150 for anchor/panel chrome):
```javascript
// src/shell.jsx:20-28 — outside-click dismissal, the only popover precedent in this codebase
useEffect(() => {
  if (!userMenuOpen) return;
  function handleClick(e) {
    if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
      setUserMenuOpen(false);
    }
  }
  document.addEventListener('mousedown', handleClick);
  return () => document.removeEventListener('mousedown', handleClick);
}, [userMenuOpen]);
```
```javascript
// src/shell.jsx:150 — panel chrome to copy verbatim (position/border/shadow), per UI-SPEC's
// grandfathered 6px offset row — only `top: calc(100% + 6px)` direction flips (opens downward here)
style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, background: '#fff',
  border: '1px solid hsl(120 10% 88%)', borderRadius: 10, boxShadow: '0 4px 16px rgba(0,0,0,0.12)', zIndex: 50 }}
```
Extend with an `Escape` keydown listener (UI-SPEC requires it; `shell.jsx` does not have one — add a second `document.addEventListener('keydown', ...)` inside the same effect, per RESEARCH Pattern 3's example).

**Analog 3 — loading/error/empty branches** (lines 216-236, `HistoryScreen`):
```javascript
const { data, isLoading, isError, refetch } = useHistoryOrders();
...
{isLoading && Array.from({ length: 7 }).map((_, i) => <SkeletonRow key={i} />)}
{!isLoading && isError && <ErrorBlock t={t} onRetry={() => refetch()} />}
{!isLoading && !isError && isEmpty && <EmptyBlock t={t} />}
{!isLoading && !isError && !isEmpty && days.map(...)}
```
Keep this exact branch structure for first-load (`isLoading`) and failure (`isError` → `ErrorBlock`, D-07 — **do not add a second, different error UI for a period-switch failure**). Add a **new**, distinct branch/treatment keyed on `isFetching`/`isPlaceholderData` (NOT `isLoading` — Pitfall 2 / Anti-Patterns) for D-05's dimmed-in-place state: `opacity: 0.6` on rows/tiles, no `pointer-events: none`, plus the new `spin`-keyframe `refresh` icon UI-SPEC specifies.

**Analog 4 — `ErrorBlock` component itself** (lines 92-115) — reused verbatim, no modification; this is D-07's "exactly one error treatment" requirement made concrete.

**Analog 5 — `SummaryStrip`'s dimmed/error tile treatment** (lines 244-292, esp. `dimmed = isLoading || isError` at line 262):
```javascript
const dimmed = isLoading || isError;
```
Extend this boolean to also cover the period-switch fetching case (`dimmed = isLoading || isError || isFetching`) so the tile-dimming visual already built here covers D-05 for free — but the **sub-label** (`tile.sub`) must stop reading the hardcoded `t('h_period_30')` (lines 246-247) and instead read the settled-period label per D-06/D-12 (see i18n section below).

**Anti-pattern flagged by RESEARCH — do not reproduce:** never call a range-builder (`getTodayRange()`, etc.) inline in `screen-history.jsx`'s render body for the *active* range; resolve it once per state transition (pill click / Apply click) and pass the resolved `{from, to}` into `useHistoryOrders`, exactly as the hook's own header comment already warns against doing internally.

---

### `src/i18n.jsx` (config)

**Analog:** itself — the `h_period_*` / `h_today` / `h_empty` block (lines 208-238, `ro`; mirrored `en` block further down).

**Pattern to copy** (lines 208-211):
```javascript
h_period_today: 'Azi',
h_period_7: '7 zile',
h_period_30: '30 zile',
h_period_custom: 'Interval',
```
Add new keys in this exact flat-object, same-file, ro+en-mirrored style: `h_range_start`, `h_range_end`, `h_range_apply`, `h_range_cap_message`, `h_period_in_7`, `h_period_in_30`, `h_period_in_range_prefix`, `h_empty_prefix`. **Grep before adding** — the project has hit duplicate-key bugs twice (per UI-SPEC's own note); `h_today` (line 225) is reused directly for the "today" prepositional form per D-13, not redeclared.

**Rename, not append** (line 237): `h_empty: 'Nicio comandă în ultimele 30 de zile.'` must become `h_empty_prefix: 'Nicio comandă'` (and its `en` mirror at ~line 468) — a rename matching the pattern `08-UI-SPEC.md` used for its own key additions, per the UI-SPEC's explicit instruction. Do not leave `h_empty` as dead code alongside the new key.

---

### `src/__tests__/use-history-orders.test.js` (test)

**Analog:** itself, lines 193-209 — the test asserting a stable query key across re-renders with **zero arguments**.

**Pattern to rewrite (not delete):**
```javascript
// Current premise (now obsolete): useHistoryOrders() with no args, one implicit range.
// New premise: useHistoryOrders({ from, to }) with an EXPLICIT, caller-supplied stable range —
// the "stable key ⇒ no extra fetch" guarantee is still worth asserting, just against a range
// the test passes in itself (mirroring how screen-history.jsx will now supply it), not an
// implicit mount-time default.
```
Every other call site in this file that invokes `useHistoryOrders()` with zero arguments needs the same explicit-range update (RESEARCH Pitfall 5). Add a new test for D-08/Pitfall 4: apply a custom range, switch to a preset, switch back to the exact same custom range → assert the mock SDK call count does not increase on the third step.

---

## Shared Patterns

### Query-key stability / no-inline-range-builder-in-render
**Source:** `src/use-history-orders.js` header comment (lines 1-22, esp. the lazy-initializer rationale)
**Apply to:** `src/use-history-orders.js` (removing the internal `useState`) AND `src/screen-history.jsx` (the new home for this same discipline, one level up) — resolve the active range exactly once per state transition (pill click / Apply click), never inline in the render body via `new Date()`/a range-builder call.

### SDK error-unwrap discipline
**Source:** `src/use-history-orders.js` lines 27-28
```javascript
const result = await client.admin.orders.list({ query: { from, to } });
if (result.error) throw new Error(result.error.error ?? 'Failed to load history');
```
**Apply to:** unchanged in `use-history-orders.js`; no other file makes this call this phase. `responseStyle: 'fields'` — always check `result.error` then unwrap `result.data`, never `try/catch` the call itself.

### Outside-click + Escape popover dismissal
**Source:** `src/shell.jsx` lines 17-29 (outside-click, existing), extended per RESEARCH Pattern 3 (Escape, new)
**Apply to:** the new custom-range popover in `src/screen-history.jsx` — the only other popover in the codebase; copy the `useRef` + `document.addEventListener('mousedown', ...)` cleanup-on-unmount shape verbatim, add a parallel `keydown` listener for `Escape`.

### Greyed-out/inert vs. dimmed-loading — two visually distinct conventions
**Source:** `src/screen-history.jsx` lines 311 (`inertBtn`, opacity 0.5, `pointer-events: none`) vs. the NEW dimmed-loading treatment (opacity 0.6, pointer-events unchanged) this phase introduces
**Apply to:** `screen-history.jsx` — status/type/search/Export pills keep the existing 0.5-opacity/`not-allowed` inert pattern (unmodified); the period-switch dimming (D-05) must use a **different** opacity value (0.6) and must NOT set `pointer-events: none`/`cursor: not-allowed`, so the two states never visually collide.

### `isLoading` (first load) vs. `isFetching`/`isPlaceholderData` (every subsequent switch)
**Source:** `src/screen-history.jsx` line 231 (`isLoading && ...` skeleton — correct, unchanged) vs. RESEARCH Anti-Patterns / Pitfall 2
**Apply to:** every new dimmed-loading branch added to `HistoryScreen`/`SummaryStrip` — gate the skeleton on `isLoading` (unchanged), gate D-05's dimming on `isFetching` or `isPlaceholderData` (new, distinct boolean) — reusing `isLoading` for both silently breaks every switch after the first successful load.

## No Analog Found

None — every file this phase touches already exists with a directly extensible pattern in the codebase (see File Classification). The one element with no *design* analog (the custom-range popover's exact visual layout) is fully specified in `09-UI-SPEC.md`'s Custom Range Popover Contract and built from `shell.jsx`'s existing popover-chrome primitives plus `styles.css`'s existing `.btn-primary`/`.btn-disabled-offline` classes — no net-new CSS class or component pattern is required.

## Metadata

**Analog search scope:** `src/history-utils.js`, `src/use-history-orders.js`, `src/screen-history.jsx`, `src/shell.jsx`, `src/i18n.jsx`, `src/__tests__/use-history-orders.test.js`, `src/__tests__/screen-history.test.jsx`
**Files scanned:** 7
**Pattern extraction date:** 2026-07-17
