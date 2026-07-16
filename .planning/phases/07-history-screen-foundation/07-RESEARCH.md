# Phase 7: History Screen Foundation - Research

**Researched:** 2026-07-17
**Domain:** TanStack Query data hook + client-side day-grouping/derivation over an existing React/Zustand/Tauri POS shell
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**What counts as "history"**
- **D-01:** History shows **finished orders only** — completed, canceled, refunded. `listAdminOrders` returns every order in the range including in-flight ones; filter them out client-side.
- **D-02:** **Refunded wins over completed.** A refunded order is `status: COMPLETED` + `paymentCaptureStatus: 'refunded'` — two orthogonal fields. Derive exactly one display status per row; refunded takes precedence and renders as Refunded (amber), never Completed.
- **D-03:** **Render every row — no cap, no warning, no virtualization.** Supersedes the STATE.md watch-out "warn or limit if >500 orders." Virtualization is deferred.
- **D-04:** **Local Romanian day boundaries drive everything.** Send `from`/`to` as local-day boundaries converted to ISO instants, and group by local calendar day — not UTC. No business-day cutoff.

**Row + detail route**
- **D-05:** Order column renders **`#dailyNumber`, falling back to a short UUID slice** when `dailyNumber` is null.
- **D-06:** **Redefine the grid for 7 columns** — order #, customer, type, time, payment, status, total (+ chevron). Drop items-count and the source/address sub-lines; rebalance track widths; do not leave blank cells in the design's 9-track `HIST_GRID`.
- **D-07:** ⚠ **REVERSAL — rows navigate to an order detail view; the inline expandable receipt is dropped entirely.** Overrides the locked v1.1 decision *"Inline expandable receipt row replaces the side detail panel."* The detail view is **permanent**, not interim scaffolding.
- **D-08:** **Phase 7 routes only; a new phase builds the detail view.** Phase 7 ships rows that navigate to a detail route rendering the `AdminOrder` fields already fetched. The `getOrder(id)` call for items/address/prep belongs to the next phase.
- **D-09:** **Reuse `src/screen-detail.jsx` in a read-only mode** rather than building a new history-specific screen. Add a `readOnly` prop that hides mutating controls (advance, cancel, print) and routes back to History.

**Day headers + grouping**
- **D-10:** **Day revenue counts completed orders only** — canceled and refunded contribute nothing. The design's `total - refundAmount` is unimplementable (no `refundAmount` field exists).
- **D-11:** **The day count counts every visible row** in that day, including canceled and refunded.
- **D-12:** **Sort newest-first client-side within each day**, mirroring newest-day-first. `listAdminOrders` makes no ordering guarantee.
- **D-13:** **One empty-state component, copy worded for the period** — reuse the design's two-line block (`h_empty`/`h_empty_sub`).

**Unready controls + states**
- **D-14:** **The full filter bar renders greyed-out and inert** — period presets, status/type filters, search, Export: visible, dimmed, not clickable. The "30 days" preset renders as selected.
- **D-15:** ⚠ **REVERSAL — the summary strip is live and client-computed from the fetched list, and `getAdminDashboard` is dropped permanently.** Overrides the locked v1.1 decision *"Summary strip is a second, independent data source."* One data source, one loading state, no independent failure.
- **D-16:** **Skeleton rows + placeholder tiles while loading; on error a message with retry replaces the table area while the strip shows dashes.** No layout jump between loading, error, and content.

### Claude's Discretion

- **Sidebar placement + icon (HIST-01).** Not discussed. `screenshots/desktop-history.png` shows History in the first nav group (after the kitchen/moped item) with a clock-with-arrow icon, in the cashier role. Match the screenshot; icon likely needs adding to `src/icons.jsx` — **verified during this research: it already exists** (`Icon name="history"`, `src/icons.jsx:48`), no addition needed.
- **Role visibility.** Whether the `kitchen` role sees History was not decided. Default to cashier-visible, matching the screenshot.
- **Whether SSE should refresh the History list** when an order completes. Not discussed; History is a past-orders archive and `staleTime` alone is likely sufficient. Do not wire SSE without reason.

### Deferred Ideas (OUT OF SCOPE)

- **List virtualization** — measure first with real data (D-03).
- **Business-day cutoff for day grouping** (e.g. day ends at 04:00) — rejected as unrequested configurability.
- **>500-order warning banner** — superseded by D-03.
- **Distinct "no finished orders yet" empty state** — rejected as a rare edge case.
- **SSE-driven History refresh** — not scoped, Claude's Discretion above.
- **Persisting History filter state across navigation** — reset-on-leave accepted for v1.1.

### ⚠ Roadmap Impact (informational — do not act on this in Phase 7 planning)

CONTEXT.md flags that D-07 and D-15 invalidate ROADMAP.md/REQUIREMENTS.md text for HIST-06 and HIST-10 and the phase-8/9/10 boundaries. **This research does not re-litigate that** — it is scoped to Phase 7 only, whose own boundary (HIST-01/02/03/05/13 + the two reversals it absorbs) is settled and unaffected by the still-open roadmap reconciliation.

</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| HIST-01 | User can navigate to a History screen via a dedicated sidebar item (same level as Orders, KDS, POS) | Sidebar Entry Contract confirmed against live `shell.jsx` — see Architecture Patterns → Sidebar Wiring. Icon already exists, no `icons.jsx` change needed. |
| HIST-02 | History screen loads orders via `listAdminOrders({ from, to })`; client-side filtering | SDK call path verified at `node_modules/@charlyk/admin-client/dist/index.d.ts:4893` (`client.admin.orders.list`) and `:3180` (`ListAdminOrdersData`, date-range-only query). Hook pattern in Code Examples. |
| HIST-03 | History screen defaults to the last 30 days on first open | Day-boundary computation in Code Examples (`getLast30DaysRange`), addresses the open timezone question — see Common Pitfalls → Pitfall 3. |
| HIST-05 | Orders grouped by calendar day, newest first, day header shows count + revenue subtotal | `groupOrdersByDay` in Code Examples; D-10/D-11/D-12 codified as pure-function contract. |
| HIST-13 | Clear empty state when no orders match | Existing `OrdersScreen` empty-state pattern (`src/screen-orders.jsx:290-300`) is the precedent to mirror; D-13 copy is in UI-SPEC.md. |

</phase_requirements>

## Summary

Phase 7 is not a "learn a new library" phase — every dependency it needs (React 18, Zustand 5, TanStack Query 5, `@charlyk/admin-client` 1.1.59) is already installed, pinned, and has an established usage pattern elsewhere in this codebase. The work is: (1) a new TanStack Query hook (`useHistoryOrders`) that calls `client.admin.orders.list({ query: { from, to } })` and normalizes the result through the existing `normalizeOrder()` in `src/data.jsx`; (2) a small set of pure, testable functions that derive display status (D-02), filter to finished orders (D-01), and group by local calendar day (D-04/D-05/D-10/D-11/D-12); (3) a new `HistoryScreen` component following the `OrdersScreen`/`KitchenScreen` "screen calls its own data hook" convention; (4) wiring into `shell.jsx` nav, `store.js` screen enum, and `app.jsx`'s screen router; (5) a `readOnly` prop on the existing `OrderDetailScreen` (`src/screen-detail.jsx`) per D-09.

Direct inspection of the installed SDK type definitions (`node_modules/@charlyk/admin-client/dist/index.d.ts`) surfaced two facts CONTEXT.md's canonical_refs did not fully spell out and that materially affect implementation correctness: **(a)** `AdminOrder.dailyNumber` is a *different field name* than the `dailyOrderNumber` that `normalizeOrder()` currently reads, so the existing normalizer's fallback chain (`o.dailyOrderNumber ?? o.id`) will silently skip straight to the UUID fallback for every History row unless it is extended to also check `o.dailyNumber`; **(b)** reusing `screen-detail.jsx`'s existing `onBack`/`screen: 'detail'` wiring as-is creates a routing collision between Orders' detail route and History's detail route, because `openOrder()` in `store.js` unconditionally sets `screen: 'detail'` with no way to know which list to return to. Both are addressed with concrete code in this document.

**Primary recommendation:** Build a dedicated `src/history-utils.js` module of pure functions (`getLast30DaysRange`, `deriveDisplayStatus`, `groupOrdersByDay`, `computeSummary`) so the day-grouping/derivation logic is unit-testable in isolation from React — this is also the natural Wave-0 test target for Nyquist validation. Add a second Zustand screen value (`'history-detail'`) and a second `open*` action rather than overloading the existing `'detail'`/`openOrder()` pair, to avoid the back-navigation collision.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| History order fetch (`listAdminOrders`) | API / Backend (via SDK) | Frontend Server (TanStack Query cache) | The SDK is the only data layer per CLAUDE.md; TanStack Query owns the client-side cache of the response. |
| Finished-order filter, status derivation, day-grouping, revenue sums | Browser / Client | — | No server endpoint supports this (SDK returns the raw date-range set); D-01/D-02/D-04/D-10/D-11/D-12 are all explicitly client-side by design. |
| Sidebar nav entry + screen routing | Browser / Client | — | Zustand-owned UI state (`screen` enum); no server involvement. |
| Read-only order detail rendering | Browser / Client | — | Phase 7 reuses already-fetched `AdminOrder` fields in memory; no new fetch (that's the next phase's `getOrder(id)`). |
| Local-day boundary computation (`from`/`to`) | Browser / Client | — | Computed from the device's system clock/timezone before the request is sent; the API only sees ISO instants, not "days." |

## Standard Stack

No new packages this phase. Everything is already in `package.json` and pinned per CLAUDE.md:

| Library | Installed Version | Purpose in Phase 7 | Why Standard (already established) |
|---------|--------------------|---------------------|--------------------------------------|
| `react` | `^18.3.1` [VERIFIED: package.json] | `HistoryScreen`, day-group/row components | Pinned; do not bump (CLAUDE.md) |
| `@tanstack/react-query` | `^5.99.2` [VERIFIED: package.json] | `useHistoryOrders` hook | Same pattern as `use-orders.js`/`use-stats.js` |
| `zustand` | `^5.0.12` [VERIFIED: package.json] | `screen` enum extension, new `open*` action | Same `store.js` `persist`/`partialize` pattern |
| `@charlyk/admin-client` | `^1.1.59` [VERIFIED: package.json, node_modules types] | `client.admin.orders.list({ query: { from, to } })` | The only data layer per CLAUDE.md |
| `vitest` | `^4.1.5` [VERIFIED: package.json] | Unit tests for `history-utils.js` pure functions | Existing test runner; no config change needed |

**No installation step required.** Do not run `npm install` for this phase.

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Native `Date`/`Intl` for local-day boundary math | `date-fns-tz` / `luxon` | Adds a dependency for a single well-scoped calculation (midnight-to-midnight in the device's local timezone); CLAUDE.md's minimal-Rust/thin-stack philosophy and the absence of any existing date library in this codebase argue for native `Date`. Revisit only if DST edge-case bugs surface in production. |
| Separate `history-detail` screen enum + action | Overload existing `'detail'` screen + `openOrder()` with an extra flag (e.g. `openOrder(order, { readOnly: true, returnTo: 'history' })`) | Overloading is fewer new store keys but couples History's return-navigation to Orders' detail logic, which the Orders detail flow does not need to know about. A separate enum value is a cleaner boundary and matches the "each screen owns its own state" convention already used for `acceptDialog`/`cancelDialog`. Both are viable; this document recommends the separate-value approach (see Common Pitfalls → Pitfall 1). |

## Package Legitimacy Audit

**Not applicable — no external packages are installed in this phase.** All libraries used (`react`, `@tanstack/react-query`, `zustand`, `@charlyk/admin-client`, `vitest`) are already present in `package.json` and were vetted in prior phases. The Package Legitimacy Gate is skipped per its own scope ("every phase that installs external packages").

## Architecture Patterns

### System Architecture Diagram

```
Sidebar click ("Istoric")
   │  shell.jsx: navGroups[0] item { id: 'history' } → onClick → setScreen('history')
   ▼
Zustand store.js: screen = 'history' (persisted)
   │
   ▼
app.jsx screen router: {screen === 'history' && <HistoryScreen ... />}
   │
   ▼
HistoryScreen mounts → calls its own data hook (existing per-screen convention)
   │
   ▼
useHistoryOrders()  [src/use-history-orders.js]
   │  1. getLast30DaysRange() → { from, to } as local-Romania-day-boundary ISO instants
   │  2. client.admin.orders.list({ query: { from, to } })   ← @charlyk/admin-client, the ONLY data layer
   │  3. unwrap result.data.orders (throw on result.error, per SDK responseStyle:'fields' convention)
   │  4. orders.map(normalizeOrder)   ← src/data.jsx, extended to read AdminOrder.dailyNumber
   ▼
TanStack Query cache: ['history-orders', from, to]   ← distinct root from SSE-owned ['orders']
   │
   ▼
history-utils.js (pure functions, no React, unit-testable)
   │  filterFinishedOrders(orders)      — D-01: keep only COMPLETED | CANCELLED
   │  deriveDisplayStatus(order)        — D-02: refunded > canceled > completed
   │  groupOrdersByDay(orders)          — D-04/D-12: local-day bucket, newest-day-first, newest-row-first
   │  computeSummary(orders)            — D-15: orders/revenue/avg/refund-count, all from the same list
   ▼
HistoryScreen render:
   ├── Summary strip (4 tiles, D-15)         ← computeSummary() output
   ├── Inert filter bar (D-14)               ← static, no data binding
   └── Day-grouped table (D-05/D-06/D-10/D-11) ← groupOrdersByDay() output
          │
          │  row click
          ▼
       Zustand store.js: openHistoryOrder(order) → { historyOrder: order, screen: 'history-detail' }
          │
          ▼
       app.jsx router: {screen === 'history-detail' && historyOrder &&
          <OrderDetailScreen order={historyOrder} readOnly onBack={() => setScreen('history')} .../>}
          ▼
       OrderDetailScreen (src/screen-detail.jsx) in readOnly mode — renders AdminOrder fields
       already in memory (no new fetch this phase; getOrder(id) lands in the next phase)
```

### Recommended Project Structure

```
src/
├── history-utils.js          # NEW — pure functions: getLast30DaysRange, filterFinishedOrders,
│                              #   deriveDisplayStatus, groupOrdersByDay, computeSummary.
│                              #   No React/SDK imports — unit-testable in isolation (Nyquist Wave 0 target).
├── use-history-orders.js     # NEW — TanStack Query hook, mirrors use-orders.js/use-stats.js shape
├── screen-history.jsx        # NEW — HistoryScreen component (day-grouped table, summary strip, inert filter bar)
├── screen-detail.jsx         # MODIFIED — add `readOnly` prop per D-09 (see UI-SPEC.md region table)
├── data.jsx                  # MODIFIED — normalizeOrder() fallback chain extended for `dailyNumber`
├── store.js                  # MODIFIED — add 'history' + 'history-detail' to screen enum,
│                              #   add `historyOrder` session key + `openHistoryOrder` action
├── shell.jsx                 # MODIFIED — add History nav item (navGroups[0]) + screenTitles entry
├── app.jsx                   # MODIFIED — add screen === 'history' and 'history-detail' router branches
├── icons.jsx                 # NO CHANGE — `history` icon already exists (verified, line 48)
└── i18n.jsx                  # MODIFIED — add the ~30 new keys listed in UI-SPEC.md "New i18n Keys"
```

### Pattern 1: Screen-owned data hook (established convention)

**What:** Every screen calls its own TanStack Query hook directly; no prop-drilling of server data from `App()`.
**When to use:** Always, for this codebase — confirmed in `use-orders.js`, `use-stats.js`, and every `screen-*.jsx` file.
**Example:**
```javascript
// Source: src/use-orders.js (existing production pattern to mirror)
import { useQuery } from '@tanstack/react-query';
import { useAuth } from './auth.jsx';
import { normalizeOrder } from './data.jsx';

export function useOrders(status) {
  const { client } = useAuth();
  return useQuery({
    queryKey: status ? ['orders', status] : ['orders'],
    queryFn: async () => {
      const result = await client.kitchen.orders.list({ query: status ? { status } : {} });
      if (result.error) throw new Error(result.error.error ?? 'Failed to list orders');
      const { orders, ...rest } = result.data;
      return { ...rest, orders: orders.map(normalizeOrder) };
    },
    enabled: !!client,
    staleTime: 30_000,
  });
}
```

### Pattern 2: Pure derivation functions kept out of React

**What:** Day-grouping, status derivation, and summary math are plain functions taking/returning plain arrays — no hooks, no JSX.
**When to use:** Any logic with a Nyquist-testable behavior contract (D-01, D-02, D-04, D-10, D-11, D-12 are all directly testable this way).
**Example:** see Code Examples below (`history-utils.js`).

### Pattern 3: Two-screen-value routing for a shared, mode-switched component

**What:** Rather than adding a boolean flag to the existing `'detail'` screen + `openOrder()` pair, add a second screen value (`'history-detail'`) and a second store action (`openHistoryOrder`) that together carry both "which order" and "how to get back" without touching the Orders detail flow.
**When to use:** Whenever a shared component (`OrderDetailScreen`) is entered from two different list screens with different back-destinations and different capability sets (mutating vs. read-only).
**Why not overload `openOrder()`:** `openOrder()` is called from `OrdersScreen` today and always implies "editable, back-to-orders." Threading a `readOnly`/`returnTo` parameter through it means every future caller of `openOrder()` has to reason about History's back-navigation too — a coupling this codebase's per-screen-owns-its-state convention (see `acceptDialog`, `cancelDialog`, both screen/flow-scoped) argues against.

### Anti-Patterns to Avoid

- **Fetching `getOrder(id)` from the History detail route in Phase 7:** D-08 is explicit that this phase renders only the `AdminOrder` fields already in hand from the list call. Wiring a `getOrder(id)` fetch now pre-builds a feature the next phase owns and risks a shape mismatch when that phase lands.
- **Reading `client.kitchen.orders.list` for History:** the History screen must use `client.admin.orders.list` (`AdminOrder` shape, date-range query) — a different endpoint with a different response shape than the Orders/KDS screens' `client.kitchen.orders.list`. Mixing them up produces confusing partial data (no `dailyOrderNumber`, no `status` normalization for the admin shape).
- **Recomputing `getLast30DaysRange()` on every render:** if computed inline in the component body without memoization, `new Date()` produces a new value each render, which changes the TanStack Query `queryKey` (`['history-orders', from, to]`) every render and defeats caching entirely (infinite refetch loop). Compute once via `useState(() => getLast30DaysRange())` or `useMemo` with an empty dependency array, since Phase 7 has no period switching yet (HIST-04 is a later phase).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Money formatting | A new RON formatter | `formatRON()` from `src/data.jsx:175` | Already handles `Intl.NumberFormat('ro-RO')` + " lei" suffix; UI-SPEC's total column strips the suffix via `.replace(' lei', '')` — reuse, don't reimplement |
| Cents→RON conversion | Ad-hoc `/100` | `normalizeOrder()`'s `cRON` helper convention | The SDK returns money in cents throughout; `normalizeOrder()` is the single place this conversion happens today — extend it, don't duplicate the divide-by-100 logic in `history-utils.js` |
| Order-type icon/label | New history-specific type map | `typeMeta()` from `src/screen-orders.jsx` | Already handles `delivery`/`pickup`/`dinein` (and, via its default-fallback, `'local'` — see Common Pitfalls → Pitfall 5) |
| SDK error handling | `try/catch` around the SDK call | Check `result.error` then unwrap `result.data` | SDK uses `responseStyle: 'fields'` — it does not throw; every hook in this codebase (`use-orders.js`, `use-stats.js`, `use-order-detail.js`) follows the same `if (result.error) throw new Error(...)` shape |
| Local-day timestamp display | New time formatter | `orderTimeLabel()` from `src/data.jsx:183` | Already does `toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' })` |

**Key insight:** This phase's "don't hand-roll" surface is entirely internal reuse, not third-party libraries — the codebase's own established helpers (`normalizeOrder`, `formatRON`, `typeMeta`, `orderTimeLabel`) already solve every formatting/normalization problem History needs; the only genuinely new logic is the grouping/filtering/derivation math in `history-utils.js`.

## Common Pitfalls

### Pitfall 1: Routing collision between Orders' detail route and History's detail route
**What goes wrong:** If History rows call the existing `openOrder(order)` action, it unconditionally sets `screen: 'detail'` (`store.js:72`). `app.jsx`'s router renders `OrderDetailScreen` for `screen === 'detail'` with `onBack={() => setScreen('orders')}` hardcoded (`app.jsx:227`). A History row would land on the same screen value with no way to distinguish "came from History" — the back button would incorrectly return to Orders, and there'd be no way to pass `readOnly={true}`.
**Why it happens:** `openOrder()`/`'detail'` was designed for exactly one caller (`OrdersScreen`) before History existed.
**How to avoid:** Add a second screen enum value (`'history-detail'`) and a second store action (`openHistoryOrder`) — see Code Examples. Do not add a `readOnly` boolean to the existing `openOrder()`/`'detail'` pair.
**Warning signs:** Clicking a History row and landing on "Back to orders" instead of "Back to history"; History rows showing Advance/Cancel/Print buttons that shouldn't be visible.

### Pitfall 2: `dailyNumber` vs `dailyOrderNumber` field-name mismatch
**What goes wrong:** `AdminOrder` (the type returned by `listAdminOrders`) has a field named **`dailyNumber: number | null`** [VERIFIED: `node_modules/@charlyk/admin-client/dist/index.d.ts:267`]. The existing `normalizeOrder()` in `src/data.jsx:220` only checks `o.dailyOrderNumber ?? o.id` — it has no branch for `dailyNumber`. Run unmodified against `AdminOrder` data, every row's `dailyOrderNumber` falls straight through to `o.id` (a UUID), even though a human-readable daily number is available. This directly breaks D-05 ("`#dailyNumber`, falling back to a short UUID slice **only** when `dailyNumber` is null").
**Why it happens:** `normalizeOrder()` was written against the kitchen `Order` shape (which uses `dailyOrderNumber`), before `AdminOrder`'s differently-named field existed in the codebase's usage.
**How to avoid:** Extend the fallback chain to `o.dailyOrderNumber ?? o.dailyNumber ?? o.id` (or add a dedicated mapping step in `useHistoryOrders`'s `queryFn` before calling the shared normalizer, if `normalizeOrder()` is intentionally not touched — either is acceptable, but the planner must choose one explicitly. Extending the shared function is likely simpler since it's the single normalization point already used everywhere).
**Warning signs:** Every History row showing a UUID-slice fallback instead of a real order number, even for orders that clearly have one in the admin dashboard/API response.

### Pitfall 3: Local-day boundary computation must not rely on the API's own timezone interpretation
**What goes wrong:** STATE.md's open question — "what timezone does the API treat `from`/`to` params as?" — is **not fully resolved** by this research; the SDK's own type comment only says `from`/`to` are "ISO 8601," with no timezone semantics documented [CITED: `node_modules/@charlyk/admin-client/dist/index.d.ts:3184-3191`]. D-04 already locks the correct mitigation: compute local-Romania midnight-to-midnight boundaries and convert **each boundary** to a full ISO instant (with its UTC offset baked in via `.toISOString()`) before sending — this makes the request correct regardless of how the server internally stores/compares instants, because ISO instants are unambiguous. The residual risk is narrower than the original open question: whether the server compares `from`/`to` as inclusive/exclusive bounds around midnight is still unverified against the live API (no test environment reachable from this research session).
**Why it happens:** Comparing a client's "calendar day" against a server's date-range filter is inherently a timezone-sensitive operation unless both sides agree on instant boundaries, which D-04's approach achieves.
**How to avoid:** Implement `getLast30DaysRange()` using the device's local `Date` (assumes the POS terminal's system clock is set to Europe/Bucharest — reasonable for hardware physically deployed in a Romanian restaurant, but should be flagged, see Assumptions Log A1). Do the same boundary-computation approach for `groupOrdersByDay()`'s bucketing of each order's `createdAt` (convert to local `Date`, bucket by local Y-M-D, not by slicing the ISO string, which would bucket in UTC and be wrong for very early/late orders near midnight).
**Warning signs:** An order placed at 23:50 local time appears grouped under the wrong day; the "last 30 days" range is off by one day at either edge; day boundaries look correct in developer testing (likely UTC-adjacent timezone) but wrong once tested on hardware actually set to Europe/Bucharest during DST transitions.

### Pitfall 4: TanStack Query cache key collision with the SSE-owned `['orders']` root
**What goes wrong:** `use-sse.js` writes live order updates directly into the `['orders']` query cache (per STATE.md: "Cache key `['orders']` is canonical root shared by useSSE.setQueryData and useOrderActions.invalidateQueries"). If `useHistoryOrders` reuses `['orders']` as any part of its key, SSE's live-order writes could corrupt History's date-ranged, admin-shaped data (different response shape entirely — `AdminOrder[]` vs. kitchen `Order[]`).
**Why it happens:** Copy-pasting `use-orders.js`'s query key without renaming it.
**How to avoid:** Use a distinct root, e.g. `['history-orders', from, to]` (already reflected in the Architecture Diagram above). CONTEXT.md's canonical_refs already flags this explicitly.
**Warning signs:** History screen showing kitchen-shaped order objects, or crashing on `order.status` vs `order.state` mismatches, after an SSE event fires.

### Pitfall 5: `typeMeta()`'s handling of `orderType: 'local'` is an implicit fallback, not an explicit case
**What goes wrong:** CONTEXT.md's canonical_refs states `typeMeta()` "already maps order types to icon + label including `local`→Dine-in." Direct inspection of `src/screen-orders.jsx` shows the map has exactly three keys — `delivery`, `pickup`, `dinein` — and the function returns `map[type] || map.dinein`. There is **no explicit `'local'` case**; it works today only because `map['local']` is `undefined` and the function's default fallback happens to be `map.dinein`, which is coincidentally the correct label. This is functionally correct for the current three-value `orderType` enum (`'delivery' | 'pickup' | 'local'` [VERIFIED: `node_modules/@charlyk/admin-client/dist/index.d.ts:701`]) but fragile — any future enum value added server-side would also silently render as "Dine-in."
**Why it happens:** The default-fallback pattern was written for kitchen orders (which already carry a `type` field normalized to `'dinein'`), not `AdminOrder` (which carries `orderType: 'local'` verbatim, mapped through `normalizeOrder()`'s `type: o.type ?? o.orderType ?? 'dinein'`).
**How to avoid:** No change required to ship Phase 7 correctly (behavior is already right). Optionally add an explicit `local:` entry to `typeMeta()`'s map for clarity/future-proofing — not required by CONTEXT.md/UI-SPEC.md, planner's discretion.
**Warning signs:** None expected this phase; flagged for awareness only, since CONTEXT.md's own citation slightly overstates what the code does.

### Pitfall 6: Detail-route rehydrate-to-blank-screen on app restart
**What goes wrong:** `store.js`'s `partialize` persists `screen` but not `selectedOrder` (session-only). If a new `historyOrder` session key is added the same way, restarting the app while `screen: 'history-detail'` was the last-persisted value rehydrates with `historyOrder: null` — `app.jsx`'s router branch (`{screen === 'history-detail' && historyOrder && <OrderDetailScreen .../>}`) will simply render nothing (the `&&` short-circuits), producing a blank content area inside the shell, not a crash, but also not a useful screen.
**Why it happens:** By design, order objects are never persisted (they'd go stale); only navigation state is persisted.
**How to avoid:** UI-SPEC.md's E7 backstop already requires a safe fallback. Simplest implementation: when the router branch's condition is false but `screen === 'history-detail'`, redirect to `'history'` via a `useEffect` (mirroring the existing role-gate `useEffect` pattern in `app.jsx:182-184`) rather than leaving a blank pane.
**Warning signs:** Blank main content area with a working sidebar/topbar after a cold start, if the user happened to quit while viewing a History order detail.

## Code Examples

### `getLast30DaysRange()` — local-day boundaries, computed once

```javascript
// src/history-utils.js — pure function, no React/SDK imports (D-04, Pitfall 3)
export function getLast30DaysRange(now = new Date()) {
  // Local midnight 29 days ago (30-day window inclusive of today) → ISO instant
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29, 0, 0, 0, 0);
  // Local "start of tomorrow" as the exclusive upper bound → ISO instant
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);
  return { from: start.toISOString(), to: end.toISOString() };
}
```

### `deriveDisplayStatus()` — D-02 precedence

```javascript
// src/history-utils.js
export function deriveDisplayStatus(order) {
  // order.status: 'COMPLETED' | 'CANCELLED' | ... (source: AdminOrder.status, kitchen Order.status enum
  //   confirmed identical at node_modules/@charlyk/admin-client/dist/index.d.ts:792)
  // order.paymentCaptureStatus: 'authorized' | 'captured' | 'voided' | 'refunded' | 'failed' | null
  if (order.paymentCaptureStatus === 'refunded') return 'refunded'; // D-02: wins regardless of status
  if (order.status === 'CANCELLED') return 'canceled';
  if (order.status === 'COMPLETED') return 'completed';
  return null; // in-flight — filtered out by filterFinishedOrders before this is ever called on it
}

export function filterFinishedOrders(orders) {
  // D-01: finished = COMPLETED or CANCELLED only. In-flight orders (NEW/ACCEPTED/PREPARING/READY/
  // OUT_FOR_DELIVERY) are dropped client-side — listAdminOrders returns all of them for the range.
  return orders.filter((o) => o.status === 'COMPLETED' || o.status === 'CANCELLED');
}
```

### `groupOrdersByDay()` — D-04/D-05/D-10/D-11/D-12

```javascript
// src/history-utils.js
function localDayKey(iso) {
  const d = new Date(iso);
  // Local Y-M-D bucket key — NOT iso.slice(0,10), which would bucket in UTC (Pitfall 3)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function groupOrdersByDay(orders) {
  const byDay = new Map();
  for (const order of orders) {
    const key = localDayKey(order.createdAt ?? order.placedAt);
    if (!byDay.has(key)) byDay.set(key, []);
    byDay.get(key).push(order);
  }

  return [...byDay.entries()]
    .sort(([a], [b]) => b.localeCompare(a))              // newest day first (D-04)
    .map(([dayKey, dayOrders]) => {
      const sorted = [...dayOrders].sort(
        (a, b) => new Date(b.createdAt ?? b.placedAt) - new Date(a.createdAt ?? a.placedAt)
      );                                                   // newest row first within the day (D-12)
      const count = sorted.length;                         // every visible row, incl. canceled/refunded (D-11)
      const revenue = sorted
        .filter((o) => deriveDisplayStatus(o) === 'completed')  // completed-only (D-10)
        .reduce((sum, o) => sum + o.total, 0);              // o.total already in RON via normalizeOrder's cRON
      return { dayKey, orders: sorted, count, revenue };
    });
}
```

### `computeSummary()` — D-15, single data source

```javascript
// src/history-utils.js
export function computeSummary(orders) {
  const completed = orders.filter((o) => deriveDisplayStatus(o) === 'completed');
  const canceled = orders.filter((o) => deriveDisplayStatus(o) === 'canceled');
  const revenue = completed.reduce((sum, o) => sum + o.total, 0);
  return {
    ordersCount: orders.length,                 // all finished orders, D-15 "Orders" tile
    revenue,                                     // completed-only, matches day-header revenue math
    avg: completed.length > 0 ? revenue / completed.length : null,  // null → render "—" per UI-SPEC
    refundsCount: orders.filter((o) => deriveDisplayStatus(o) === 'refunded').length,
    canceledCount: canceled.length,              // feeds the Refunds tile's "{n} canceled" sub-line
  };
}
```

### `useHistoryOrders` hook

```javascript
// src/use-history-orders.js
import { useQuery } from '@tanstack/react-query';
import { useAuth } from './auth.jsx';
import { normalizeOrder } from './data.jsx';
import { getLast30DaysRange } from './history-utils.js';

export function useHistoryOrders() {
  const { client } = useAuth();
  // Computed once per mount — NOT recomputed on every render (Anti-Pattern above).
  // Phase 7 has no period switching (HIST-04 is a later phase), so a stable initial value is correct.
  const [{ from, to }] = useState(() => getLast30DaysRange());

  return useQuery({
    queryKey: ['history-orders', from, to],   // distinct root from SSE-owned ['orders'] (Pitfall 4)
    queryFn: async () => {
      const result = await client.admin.orders.list({ query: { from, to } });
      if (result.error) throw new Error(result.error.error ?? 'Failed to load history');
      return result.data.orders.map(normalizeOrder);
    },
    enabled: !!client,
    staleTime: 30_000,
  });
}
```
*(`useState` import needed at the top of the file — omitted above for brevity.)*

### `normalizeOrder()` extension — fixes Pitfall 2

```javascript
// src/data.jsx — modify the existing line 220
// BEFORE:
dailyOrderNumber: o.dailyOrderNumber ?? o.id,
// AFTER:
dailyOrderNumber: o.dailyOrderNumber ?? o.dailyNumber ?? o.id,
```

### Store + router wiring — fixes Pitfall 1

```javascript
// src/store.js — additions
screen: 'orders',   // extend comment: 'orders'|'kitchen'|'pos'|'detail'|'menu'|'printer'|'settings'|'history'|'history-detail'
// ...
historyOrder: null,   // session-only, NOT persisted — mirrors selectedOrder's pattern

setScreen: (screen) => set({ screen, selectedOrder: null, historyOrder: null }),
openOrder: (order) => set({ selectedOrder: order, screen: 'detail' }),               // unchanged
openHistoryOrder: (order) => set({ historyOrder: order, screen: 'history-detail' }), // NEW
```

```javascript
// src/app.jsx — router additions
const historyOrder = useAppStore((s) => s.historyOrder);
const openHistoryOrder = useAppStore((s) => s.openHistoryOrder);
// ...
{screen === 'history' && <HistoryScreen lang={lang} onOpenOrder={openHistoryOrder} isOffline={isOffline} />}
{screen === 'history-detail' && historyOrder && (
  <OrderDetailScreen order={historyOrder} lang={lang} readOnly onBack={() => setScreen('history')} isOffline={isOffline} />
)}
```

```javascript
// src/shell.jsx — navGroups[0] addition (cashier role only, per Claude's Discretion)
items: role === 'kitchen'
  ? [ /* unchanged */ ]
  : [
      { id: 'orders', icon: 'zap', label: t('nav_orders'), count: orderCount.live, dot: orderCount.new > 0 },
      { id: 'pos', icon: 'plus', label: t('nav_new') },
      { id: 'kitchen', icon: 'chef', label: t('nav_kitchen'), count: orderCount.active },
      { id: 'history', icon: 'history', label: t('nav_history') },  // NEW — icon already exists in icons.jsx
    ],
// screenTitles addition:
history: t('nav_history'),
'history-detail': lang === 'ro' ? 'Detalii comandă' : 'Order details',  // reuse existing 'detail' title text
```

## State of the Art

Not applicable — this phase uses only already-established, already-pinned patterns in this codebase (no library upgrades, no framework migrations, no deprecated-API replacements). No "old approach → current approach" table is meaningful here.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | The POS terminal's OS-level system clock/timezone is set to Europe/Bucharest, so native `Date` local-time math in `getLast30DaysRange()`/`groupOrdersByDay()` correctly reflects Romanian calendar days. | Pitfall 3, Code Examples | If a terminal's OS timezone is misconfigured (e.g. left at UTC or another zone), day-grouping and the "last 30 days" window would be systematically offset — orders would appear on the wrong day, and the count could be off by a full day at either edge of the range. This is an operational/deployment concern (out of this phase's code), but worth a one-line note in the phase's manual QA checklist. |
| A2 | `AdminOrder.total` (and other money fields returned by `listAdminOrders`) are in the same cents-based unit as the kitchen `Order` shape, so passing them through `normalizeOrder()`'s existing `cRON` (÷100) conversion is correct. | Standard Stack, Don't Hand-Roll | The installed type definition documents `total: number` with no unit comment specific to `AdminOrder` (unlike some other fields). If `AdminOrder.total` is actually already in RON (not cents), every revenue figure in the summary strip and day headers would be 100x too small. Low risk — the codebase-wide convention (documented at `data.jsx:196`, "SDK returns monetary values in cents") is applied uniformly across every other endpoint already integrated — but this specific field was not independently confirmed against a live API response in this research session. **Recommend a smoke-test checkpoint** (compare one known order's total in the admin UI/database against the rendered History total) before merging. |
| A3 | The server's `from`/`to` range comparison on `/v1/admin/orders` treats these as inclusive-start/exclusive-end (or some other well-defined boundary) consistent with the ISO-instant boundaries D-04 computes, rather than truncating to a UTC calendar day server-side. | Pitfall 3 | If the server internally truncates `from`/`to` to UTC calendar days before filtering (ignoring the time-of-day/offset portion of the ISO instant), Romanian local-day boundaries sent as precise instants would not produce the intended 30-day window — orders from the last ~2-3 hours of each UTC day could be systematically excluded or a day boundary could shift. Not verifiable without live API access in this research session; flagged for a manual smoke test against real data during Phase 7 execution. |

## Open Questions

1. **Does the server's date-range filter respect ISO instant boundaries, or truncate to UTC calendar days?**
   - What we know: The type signature documents `from`/`to` as plain "ISO 8601" strings with no further semantics (A3 above).
   - What's unclear: Whether sending `2026-07-01T21:00:00.000Z` (= local midnight in Bucharest, UTC+2/+3 depending on DST) as `from` correctly starts the window there, or whether the server rounds/truncates to `2026-07-01T00:00:00Z`.
   - Recommendation: Ship D-04's approach as specified (it's the only client-side-correct approach regardless of server behavior); add a manual smoke-test step comparing rendered day boundaries against a few known real orders placed near midnight, during phase execution/verification, not as a blocking research gap.

2. **Is `AdminOrder.total` in cents or RON?**
   - What we know: No `AdminOrder`-specific unit documentation; codebase-wide convention elsewhere is cents (A2 above).
   - What's unclear: Independent confirmation against a live response.
   - Recommendation: Same as above — smoke-test one real order's total against the admin dashboard/database during execution.

## Environment Availability

Skipped — this phase introduces no new external tool, service, or runtime dependency. All required tooling (Node/npm, the already-configured GitHub Package Registry auth for `@charlyk/admin-client`, Vitest) was established in prior phases and is unchanged here.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest ^4.1.5 [VERIFIED: package.json] |
| Config file | `vitest.config.js` (jsdom environment, `src/__tests__/setup.js`) |
| Quick run command | `npx vitest run src/__tests__/history-utils.test.js` |
| Full suite command | `npx vitest run` |

*(Note: `package.json` has no `"test"` script defined — existing test files are invoked directly via `npx vitest run` or `npx vitest`; follow that same convention for History's tests rather than adding a new script, unless the planner decides a `"test"` script is independently worth adding.)*

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| HIST-01 | History nav item renders in cashier role, absent in kitchen role, clicking sets screen | unit (component) | `npx vitest run src/__tests__/shell.test.jsx` | ❌ Wave 0 (new file; no existing `shell.test.jsx`) |
| HIST-02 | `useHistoryOrders` calls `client.admin.orders.list({ query: { from, to } })`, unwraps `result.data.orders`, throws on `result.error` | unit (hook) | `npx vitest run src/__tests__/use-history-orders.test.js` | ❌ Wave 0 — mirror `src/__tests__/use-orders.test.js`'s mock-client pattern |
| HIST-03 | `getLast30DaysRange()` returns a 30-day window ending "tomorrow" in local time | unit (pure fn) | `npx vitest run src/__tests__/history-utils.test.js` | ❌ Wave 0 |
| HIST-05 | `groupOrdersByDay()` sorts days newest-first, rows newest-first within a day, count includes all visible rows, revenue sums completed-only | unit (pure fn) | `npx vitest run src/__tests__/history-utils.test.js` | ❌ Wave 0 |
| HIST-13 | Empty list renders `h_empty`/`h_empty_sub`; loading/error states render without throwing | unit (component) | `npx vitest run src/__tests__/screen-history.test.jsx` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run src/__tests__/history-utils.test.js` (fast — pure functions, no DOM)
- **Per wave merge:** `npx vitest run` (full suite)
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `src/__tests__/history-utils.test.js` — covers HIST-03, HIST-05 (`getLast30DaysRange`, `filterFinishedOrders`, `deriveDisplayStatus`, `groupOrdersByDay`, `computeSummary`); no fixtures needed beyond plain `AdminOrder`-shaped literals
- [ ] `src/__tests__/use-history-orders.test.js` — covers HIST-02; mirror the mock-client + `renderHook` pattern already used in `src/__tests__/use-orders.test.js`
- [ ] `src/__tests__/screen-history.test.jsx` — covers HIST-01 (nav wiring can be asserted here or in a `shell.test.jsx`), HIST-13 (empty/loading/error render)
- [ ] Framework install: none — Vitest, jsdom, and Testing Library are already installed

## Security Domain

`security_enforcement` is not set to `false` in `.planning/config.json` — treated as enabled.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-------------------|
| V2 Authentication | No (phase-local) | Already handled by `AuthProvider`/`useAuth()` — History reuses the existing authenticated `client`; no new auth surface |
| V3 Session Management | No | No change to session/token handling this phase |
| V4 Access Control | Yes | The `client.admin.orders.list` call is gated by whatever role/permission scope the admin token already carries server-side; this phase does not add or change access-control logic client-side. If the admin token lacks History access, the SDK call returns `result.error` (401/403), which the existing error-state UI (D-16) already surfaces — no silent failure |
| V5 Input Validation | Yes (minimal) | No user-supplied input reaches the SDK this phase — `from`/`to` are computed entirely client-side from the system clock, not from any user-editable field (the period/filter/search controls are inert per D-14). Nothing to sanitize/validate this phase |
| V6 Cryptography | No | No new cryptographic operation |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|----------------------|
| Stale/incorrect authorization boundary if the admin token doesn't scope `/v1/admin/orders` per-restaurant | Elevation of Privilege | Server-side responsibility (out of scope for this client-only phase); client already surfaces `result.error` via the existing error-state UI rather than assuming success |
| XSS via unescaped customer-supplied strings (`customerName`, order notes in the future detail phase) | Tampering | React's default JSX text-node escaping already covers this — no `dangerouslySetInnerHTML` is used anywhere in the existing `screen-detail.jsx`/`screen-orders.jsx`, and Phase 7 introduces no new raw-HTML rendering |

## Sources

### Primary (HIGH confidence — direct codebase/SDK inspection this session)
- `node_modules/@charlyk/admin-client/dist/index.d.ts` — `AdminOrder` type (line 261), `ListAdminOrdersData` (line 3180), `client.admin.orders.list` call path (line 4893), `status`/`orderType`/`paymentType` enums (lines 701, 747-748, 792-794)
- `src/use-orders.js`, `src/use-stats.js`, `src/use-order-detail.js` — established TanStack Query hook pattern
- `src/data.jsx` — `normalizeOrder()`, `formatRON()`, `orderTimeLabel()`, `SDK_STATE_MAP`
- `src/store.js` — Zustand `screen` enum, `partialize`, `openOrder()` action
- `src/shell.jsx` — `navGroups`, `screenTitles`
- `src/app.jsx` — screen router, hook-ordering constraints
- `src/screen-detail.jsx` — `OrderDetailScreen` regions targeted by D-09's `readOnly` prop
- `src/screen-orders.jsx` — `typeMeta()`, `stateMeta()`, existing empty-state pattern
- `src/icons.jsx` — confirmed `history` icon already present (line 48)
- `src/i18n.jsx` — existing key structure, confirmed no duplicate-key collisions with UI-SPEC's new keys
- `package.json`, `vitest.config.js` — installed/pinned versions, test runner config
- `.planning/phases/07-history-screen-foundation/07-CONTEXT.md`, `07-UI-SPEC.md` — locked decisions and visual contract (authoritative, not re-derived)

### Secondary (MEDIUM confidence)
- None used — no web search was performed this session (no `exa_search`/`brave_search`/`firecrawl` providers configured for this project, per `init.phase-op` output, and no genuinely novel external-library question existed for this phase; all dependencies are already established in-codebase).

### Tertiary (LOW confidence)
- None.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new packages, all versions confirmed via `package.json` and installed SDK types
- Architecture: HIGH — routing/store pattern derived from direct inspection of the live `store.js`/`app.jsx`/`shell.jsx`, cross-checked against CONTEXT.md's canonical_refs
- Pitfalls: HIGH for Pitfalls 1, 2, 4, 5, 6 (all confirmed by direct code/type inspection); MEDIUM for Pitfall 3 (timezone boundary correctness on the client is HIGH-confidence, but server-side interpretation is unverified — see Assumptions A3)

**Research date:** 2026-07-17
**Valid until:** 30 days (stable, internal-codebase-only research; no fast-moving external dependency)
