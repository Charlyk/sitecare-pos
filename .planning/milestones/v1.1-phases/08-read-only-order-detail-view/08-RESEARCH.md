# Phase 8: Read-Only Order Detail View - Research

**Researched:** 2026-07-17
**Domain:** Internal data hydration + presentational gating in an already-shipped React/TanStack Query screen (no new external dependencies)
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01: Reuse `useOrderDetail(id)` (`src/use-order-detail.js`) completely unchanged.** It already
  calls the exact endpoint this phase needs and runs the result through `normalizeOrder`. No new hook,
  no new key, no signature change.
  - Verified: despite the `client.kitchen.orders.get` namespacing, `GetOrderData.url` is
    `/v1/orders/{id}` — not kitchen-scoped. Archived orders resolve through it. Documented errors are
    401 and 404 only (there is no 403, contrary to the ROADMAP SC2 wording).
  - Consequence accepted: `staleTime: 0` means an archived order refetches on every mount/focus even
    though it can never change. Cost is one cheap request; not worth a divergent hook.
- **D-02: The shared `['order', id]` cache entry is accepted as intentional — "one order, one truth."**
  `use-sse.js:94` writes this key via `setQueryData` on status events, so a live SSE event can update
  what the read-only view shows. No snapshot, no guard, no defensive copy.
  - Note for Phase 11 (reprint): a reprint from this view may therefore print post-SSE data rather
    than the payload as originally fetched.
- **D-03: Merge, hydrated wins — `{...historyOrder, ...detail}`.** The `AdminOrder` summary renders
  instantly; `getOrder` fields fill in as they arrive; nothing ever blanks. Safe because both sides are
  already `normalizeOrder`'d, so field names align. Rejected: replacing the summary outright, and
  storing only the id (which would blank the screen during load).
- **D-04: The `getOrder` call and the merge live in `app.jsx`, at the route.** Add a sibling
  `useOrderDetail(historyOrder?.id)` call next to the existing live-route call; pass the merged object
  into `<OrderDetailScreen readOnly>`. `screen-detail.jsx` stays a pure presenter with zero data code.
  - Deliberate, narrow departure from CLAUDE.md's "screens call their own data hooks — no
    prop-drilling from App." Rationale: `screen-detail.jsx` serves two callers, only one of which
    fetches.
  - Hook-ordering rule applies — the new hook call must sit above `App()`'s conditional returns (the
    auth guard), or React throws "rendered fewer hooks than expected."
- **D-05: The read-only detail reuses Phase 7's derived display status (`history-utils.js`), not raw
  `order.state`.** A refunded order is `status: COMPLETED` + `paymentCaptureStatus: 'refunded'`;
  `screen-detail.jsx` currently reads `order.state` via `stateMeta()`, which would render it
  incorrectly and contradict the chip staff just clicked. Apply the same single-status derivation so
  row and detail agree by construction. Rejected: showing both chips, and leaving it as Completed.
- **D-06: Skeleton rows in the receipt region while `getOrder` is in flight.** Header, customer,
  address, and total render immediately from the summary; the items card shows skeleton lines that
  swap to real rows. No layout jump between loading, error, and content.
- **D-07: On failure, an inline message with Retry replaces the items card — the summary stays on
  screen.** Rejected: a full-area error (discards data already held) and a toast (easy to miss).
- **D-08: One generic, retryable message for every failure — no branching on status code.** "Couldn't
  load this receipt" + Retry, for 404, 401, and network alike. Two i18n keys, no branch.
  - Self-consistent with D-01: `useOrderDetail` throws `new Error(result.error.error ?? …)` and
    discards the HTTP status, so status-aware copy would require modifying the hook D-01 locks as
    unchanged.
- **D-09: "Handled by" is CUT — no clean data source.** `Order` has no such field; it exists only as
  `events[].actor`, typed `string | null` with no documented semantics. Record in REQUIREMENTS.md
  "Design Elements Cut." Amends ROADMAP Phase 8 SC1 and HIST-10 (see Roadmap Impact below).
- **D-10: Prep time is the ACTUAL duration, derived from event timestamps — not `estimatedMinutes`.**
  - Completed orders: `placedAt` → the COMPLETED event's `createdAt`, labelled prep time.
  - Cancelled orders: `placedAt` → the CANCELLED event's `createdAt`, relabelled ("Canceled after").
  - Both labels need `ro` + `en` i18n keys. `estimatedMinutes` is not rendered in this phase.

### Claude's Discretion

- Neither a COMPLETED nor a CANCELLED event exists (or `events` is empty): hide the duration row
  entirely. Do not render a partial or misleading number.
- Where the duration row sits in the detail layout, and its exact copy/format — resolved by UI-SPEC:
  it replaces the existing `{orderTimeLabel} · {elapsed}` segment in place, same typography.
- Skeleton row count in the loading state — resolved by UI-SPEC: 3 rows.
- Whether the ungated "Modify" button is removed under `readOnly` only, or reconsidered for the live
  route too — gate it under `readOnly`, don't redesign the live route.

### Folded Fix (in scope — closes ROADMAP SC3)

- `src/screen-detail.jsx:131` renders a "Modify" button (`btn-ghost`) that is NOT `readOnly`-gated. It
  is reachable on the `history-detail` route today (once items hydrate) — directly contradicting Phase
  8 SC3. Gate it behind `!readOnly` in this phase. The planner should sweep `screen-detail.jsx` for any
  other ungated interactive control rather than trusting this single finding.

### Deferred Ideas (OUT OF SCOPE)

- `estimatedMinutes` (the accept-time estimate) — rejected under D-10 in favour of actual duration.
- Estimate-vs-actual side by side — rejected as doubling new rendering in an otherwise data-swap phase.
- Status-specific error copy (404 / 401 / network) — rejected; would require modifying `useOrderDetail`
  to preserve HTTP status, which D-01 locks as unchanged.
- A history-scoped query key / longer `staleTime` for archived orders — revisit only if the
  refetch-on-every-open proves visible or costly.
- Snapshotting the order against SSE writes — rejected under D-02.
- Reprint from this view — Phase 11 (HIST-11), explicitly out of scope.
- Reconsidering the "Modify" button on the live detail route — out of scope; this phase only gates it.
- The notes/payment card hidden under `readOnly` (`screen-detail.jsx:106`) — not raised as a problem;
  note it exists if a future phase wants payment method visible on a historical receipt.

### Roadmap / Requirements Amendments Required (D-09 fallout — apply while planning)

- **ROADMAP.md Phase 8 SC1**: remove "handled-by" from the field list; "prep time" now means the
  actual derived duration (D-10), not `estimatedMinutes`.
- **REQUIREMENTS.md HIST-10**: same edit — drop "handled-by"; add a "Design Elements Cut" row:
  *"Handled-by — no field on `Order`; only `events[].actor` (`string | null`, undocumented semantics).
  Deriving it risks misattribution (D-09)."*
- **ROADMAP.md Phase 8 SC2**: says "fails or returns 401/403" — the SDK documents 401 and 404 only;
  there is no 403. D-08's generic message makes this moot for implementation, but the criterion
  wording should not assert an error the API cannot return.
- Not a phase-structure change — `/gsd-phase` is not required, a direct edit to the two documents
  suffices (the planner or a task in Wave 0 should make this edit).
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| HIST-10 | User can click any row to open a read-only detail view (reusing `screen-detail.jsx` in `readOnly` mode) showing items with modifiers, subtotal, delivery fee, total, customer phone, delivery address, and prep time — hydrated on demand via `getOrder(id)`. **("handled-by" dropped per D-09 — see amendment above.)** | Confirmed `getOrder(id)` → `/v1/orders/{id}` returns the full `Order` shape with `items[]`, `subtotal`, `deliveryFee`, `total`, `customerPhone`, six `delivery*` fields, and `events[]`. `normalizeOrder()` already maps all of it. The route (`app.jsx:243-245`), the `readOnly` prop, and the store's `historyOrder` all ship from Phase 7 — verified present in `app.jsx`, `store.js`, `screen-detail.jsx` at the exact lines cited below. |
</phase_requirements>

## Summary

This phase is a **data-source swap and a visibility fix**, not new-screen construction. Phase 7
already shipped the entire read-only surface: the `history-detail` route (`app.jsx:243-245`), the
`readOnly` prop on `OrderDetailScreen` with six existing `!readOnly` gates (`screen-detail.jsx:59, 99,
106, 228, 240, 256`), the `historyOrder` session-only store slot, the back-to-History navigation, and a
rehydrate backstop for cold-start edge cases. `screen-detail.jsx` already renders items, modifiers,
address, and totals correctly off `normalizeOrder()`'s output — it just has never received a
`getOrder(id)`-hydrated payload on the history route, only the thin `AdminOrder` summary (which has
`items: null`, so the screen degrades gracefully to a "minimal totals card," verified at
`screen-detail.jsx:191-204`).

The entire new work is: (1) a second `useOrderDetail(historyOrder?.id)` call in `app.jsx`, placed above
the conditional returns per React's hook-ordering rule and merged onto `historyOrder` with hydrated
fields winning (`{...historyOrder, ...detail}`); (2) a loading skeleton and an inline retryable error
inside the items-card region only, so the summary above it never blanks; (3) a new derived-duration
row computed from `order.events[]` (COMPLETED or CANCELLED event timestamp minus `placedAt`), replacing
the "elapsed since now" segment that is meaningless for a finished order; (4) swapping the raw
`order.state` → `stateMeta()` chip lookup for the same `deriveDisplayStatus()` + status-meta mapping
History's row already uses, so a refunded order shows "Refunded" in the detail exactly as it does in
the row; and (5) gating the ungated "Modify" button (`screen-detail.jsx:131`) behind `!readOnly`, plus
a sweep for any other missed control.

No new npm packages, no new SDK calls beyond the existing `useOrderDetail` hook, no new TanStack Query
keys. `client.kitchen.orders.get({ path: { id } })` resolves against `/v1/orders/{id}` regardless of
the `kitchen` namespace in the SDK's method tree — confirmed directly against the installed
`@charlyk/admin-client` v1.1.59 type definitions, not assumed from the method name.

**Primary recommendation:** Add one sibling `useOrderDetail` call and a merge in `app.jsx`; keep
`screen-detail.jsx` as a pure presenter that receives the already-merged order plus a `detailLoading` /
`detailError` pair of booleans (or equivalent) so it can render the items-card skeleton/error
independently of the header/summary region, which always has data from `historyOrder`.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Fetch full order detail (`getOrder(id)`) | API/Backend (via SDK) | Frontend data layer (`use-order-detail.js`) | The SDK call and its TanStack Query wrapper own the network round-trip; already exists, reused unchanged (D-01) |
| Merge summary + hydrated detail | Frontend data layer (`app.jsx` route level) | — | D-04 places this explicitly at the route, not inside the presentational component, because the component serves two callers and only one fetches |
| Render items/modifiers/address/totals | Browser/Client (`screen-detail.jsx`, pure presenter) | — | Already implemented against `normalizeOrder()`'s shape from Phase 4/7; this phase only feeds it richer data |
| Loading/error UI for the items card | Browser/Client (`screen-detail.jsx`) | — | Presentational concern scoped to one card region, not the whole screen (D-07) |
| Display-status derivation (refunded/canceled/completed) | Frontend data layer (`history-utils.js`, pure functions) | Browser/Client (consumes the derived value) | Pure, React-free, SDK-free by design (Phase 7 convention) — reused, not reimplemented |
| Duration derivation (prep time / canceled-after) | Browser/Client (co-located helper, new) | — | Pulls from `order.events[]` + `order.placedAt`; UI-specific "last matching event wins" and "COMPLETED precedence over CANCELLED" logic that is not reused elsewhere — best placed near its sole consumer, not promoted to a shared pure-utils module prematurely |
| Route/back navigation | Frontend data layer (Zustand `store.js`) | Browser/Client (`app.jsx` router) | `setScreen()`/`openHistoryOrder()` already implement this; no new action needed |

## Standard Stack

### Core

No new libraries are introduced in this phase. The relevant stack is already installed and in use:

| Library | Version | Purpose | Why Standard (for this phase) |
|---------|---------|---------|--------------------------------|
| `@charlyk/admin-client` | 1.1.59 (installed, verified via `.d.ts`) | `getOrder(id)` SDK call | Sole data layer per CLAUDE.md; already wraps `/v1/orders/{id}` |
| `@tanstack/react-query` | v5 (installed) | `useOrderDetail` hook, cache key `['order', id]` | Already owns all server state per CLAUDE.md; `useQuery` v5 semantics (`isPending`, not `isLoading`) already used throughout the codebase |
| `zustand` | (installed) | `historyOrder` session slot, `setScreen`/`openHistoryOrder` actions | Already owns UI/routing state; no new store keys needed |
| React 18 | (installed) | Hooks, conditional rendering | Existing hook-ordering constraint applies (`useOrderDetail` sibling call must sit above `App()`'s early returns) |

### Supporting

None — this phase adds zero new dependencies.

### Alternatives Considered

Alternatives were considered and explicitly rejected during context-gathering (`08-CONTEXT.md`), not
during this research pass — they are recorded here for traceability only, not as open choices:

| Instead of | Could Use | Tradeoff (why rejected) |
|------------|-----------|--------------------------|
| Reusing `useOrderDetail(id)` unchanged (D-01) | A history-scoped hook / a parameterized variant | More code for no behavioral gain; the endpoint and error shape are identical for both routes |
| Merge at the `app.jsx` route (D-04) | Merge inside `screen-detail.jsx` (screen calls its own hook conditionally) | Would put two data paths in one presentational file; contradicts the file's established pure-presenter role from Phase 7 (`P7 D-09`) |
| Spread-merge `{...historyOrder, ...detail}` (D-03) | `placeholderData: historyOrder` on the `useOrderDetail` call, or `initialData` | The merge approach was chosen explicitly by the user in CONTEXT.md; TanStack Query's `placeholderData`/`initialData` options were not selected because the summary and the hydrated detail are two distinct objects with the route needing to hold onto the summary independently of query lifecycle (query resets to `undefined` on error, which would blank the screen — the opposite of what D-07 requires). The manual spread merge is therefore the correct pattern for this phase, not a lesser alternative. |

**Installation:** None — no new packages. If Task tooling requires a no-op verification step, `npm ls @charlyk/admin-client @tanstack/react-query zustand` confirms all three are already present.

## Package Legitimacy Audit

**Not applicable.** This phase introduces zero new npm packages. All hooks, SDK calls, and derivation
utilities are reused from dependencies already vetted and installed in prior phases
(`@charlyk/admin-client`, `@tanstack/react-query`, `zustand`, React). The Package Legitimacy Gate is
skipped per its own trigger condition ("whenever this phase installs external packages").

## Architecture Patterns

### System Architecture Diagram

```
 [HistoryScreen row click]
        │  onOpenOrder(order)  — order is an AdminOrder summary (no items[])
        ▼
 [store.js openHistoryOrder(order)]
        │  atomically sets: historyOrder = order, screen = 'history-detail'
        ▼
 [App() render — app.jsx]
        │
        ├─ existing:  useOrderDetail(selectedOrderId)   → live-route detail (['order', selectedOrderId])
        └─ NEW:       useOrderDetail(historyOrder?.id)   → history-route detail (['order', historyOrder.id])
                            │
                            │  queryFn: client.kitchen.orders.get({ path:{ id } })
                            │  → GET /v1/orders/{id}  (401 | 404 documented; NOT kitchen-scoped)
                            │  → normalizeOrder(result.data.order)
                            ▼
                    TanStack Query cache ['order', id]
                            │  staleTime: 0 — refetches on every mount/focus
                            │  also written by use-sse.js:94 on live status events (D-02, shared truth)
                            ▼
        merged = { ...historyOrder, ...detailQuery.data }   ← NEW, in app.jsx, above conditional returns
        detailLoading = detailQuery.isPending
        detailError   = detailQuery.isError
                            │
                            ▼
        <OrderDetailScreen order={merged} readOnly detailLoading detailError onRetry={...} onBack={() => setScreen('history')} />
                            │
              ┌─────────────┴──────────────────────────────┐
              │ header/chips/customer card                  │ items card region
              │ — always populated from `historyOrder`       │ — 3 states, mutually exclusive:
              │   fields, never blanks (D-07)                │   loading → 3 skeleton rows (D-06)
              │ — status chip now uses deriveDisplayStatus() │   error   → inline message + Retry (D-07/D-08)
              │   (D-05), not raw order.state                │   success → real item rows (existing render)
              │ — duration row: COMPLETED/CANCELLED event     │
              │   timestamp minus placedAt (D-10), replaces  │
              │   the "elapsed since now" segment             │
              └────────────────────────────────────────────┘
                            │
                            ▼
                    [Back button] → onBack() → setScreen('history')
                            │
                            ▼
        store.js setScreen(): screen='history', historyOrder=null, selectedOrder=null
                            │
                            ▼
        HistoryScreen remounts → useHistoryOrders() recomputes getLast30DaysRange()
        (no period-switching exists yet — Phase 9) → same ['history-orders', from, to] cache
        key in practice → TanStack Query staleTime 30s serves from cache if within window,
        list and (default) period read as "intact" per SC4
```

### Recommended Project Structure

No new files. Modified files only:

```
src/
├── app.jsx              # +1 useOrderDetail call, +1 merge, updated props at the history-detail route (~line 243-245)
├── screen-detail.jsx     # +duration row, +items-card skeleton/error states, gate line 131 "Modify", sweep for other ungated controls
├── i18n.jsx              # +4 new keys (ro + en): h_detail_error_title, h_prep_time, h_canceled_after, h_detail_no_items
└── __tests__/
    ├── app-history-route.test.jsx   # existing mock of useOrderDetail now covers a second caller — update fixture/mocks
    └── screen-detail.test.jsx       # add coverage for duration row, skeleton, error, Modify gating
```

### Pattern 1: Route-level query merge over a shared summary object

**What:** Fetch detail data at the router/App level, merge it over an already-in-hand summary object
with hydrated fields taking precedence, and pass the merged object into a presentational component that
does no data fetching itself.

**When to use:** When a component serves two callers (a "live" route with full data already, and a
"lazy" route that starts with a partial summary) and you want zero risk of the screen ever rendering
empty during a fetch.

**Example (already-established precedent for the live route, `app.jsx:70` — extend identically for history):**
```jsx
// Source: src/app.jsx (existing, live-route precedent)
const { data: selectedOrder } = useOrderDetail(selectedOrderId);
// ...
{screen === 'detail' && selectedOrder && (
  <OrderDetailScreen order={selectedOrder} lang={lang} ... />
)}

// NEW — sibling call for the history route, placed at the same scope (above conditional returns):
const { data: historyDetail, isPending: historyDetailPending, isError: historyDetailError, refetch: refetchHistoryDetail }
  = useOrderDetail(historyOrder?.id);
const mergedHistoryOrder = historyOrder
  ? { ...historyOrder, ...(historyDetail ?? {}) }
  : null;
// ...
{screen === 'history-detail' && historyOrder && (
  <OrderDetailScreen
    order={mergedHistoryOrder}
    lang={lang}
    readOnly
    detailLoading={historyDetailPending}
    detailError={historyDetailError}
    onRetryDetail={refetchHistoryDetail}
    onBack={() => setScreen('history')}
    isOffline={isOffline}
  />
)}
```
Note: `historyOrder` itself already carries a `state`/`status` field from Phase 7's `normalizeOrder`
pass over the `AdminOrder` summary, so `mergedHistoryOrder` is never `null` while `historyOrder` is
present — satisfying D-07/E5's "screen never empty" requirement without extra guards.

### Pattern 2: Scoped-region loading/error states (no full-screen fallback)

**What:** Loading and error states are confined to the sub-region that actually depends on the async
data (the items card), leaving already-available data (header, chips, customer card, minimal totals)
on screen throughout.

**When to use:** Whenever a screen progressively enriches from a fast local/cached summary to a slower
network-hydrated detail, and blanking the whole screen during that gap would be a regression.

**Example (mirrors the existing `screen-history.jsx` SkeletonRow/ErrorBlock pattern — same visual
language, applied to a card region instead of a full-page list):**
```jsx
// Source: src/screen-history.jsx (existing pattern to mirror, NOT to import — it's a
// different card shape; port the concept, reuse the fill color hsl(210 15% 92%) and the
// ErrorBlock layout exactly per UI-SPEC's "Items-Card Loading State"/"Items-Card Error State")
function SkeletonRow() { /* ... */ }
function ErrorBlock({ t, onRetry }) { /* ... */ }

{isLoading && Array.from({ length: 7 }).map((_, i) => <SkeletonRow key={i} />)}
{!isLoading && isError && <ErrorBlock t={t} onRetry={() => refetch()} />}
```

### Pattern 3: Derived display status shared between list row and detail

**What:** A single pure function (`deriveDisplayStatus`) computes the canonical status label
(`'refunded' | 'canceled' | 'completed' | null`) from `paymentCaptureStatus` + `status`, used by both
the list row and the detail view so they can never disagree.

**When to use:** Any time the same order is rendered in two places and status must be visually
consistent.

**Example:**
```js
// Source: src/history-utils.js (existing, Phase 7 — import and reuse verbatim)
export function deriveDisplayStatus(order) {
  if (order.paymentCaptureStatus === 'refunded') return 'refunded'
  if (order.status === 'CANCELLED') return 'canceled'
  if (order.status === 'COMPLETED') return 'completed'
  return null
}
```
```jsx
// screen-detail.jsx currently does this (WRONG for readOnly — must change per D-05):
const st = stateMeta(order.state, t);   // keyed on 'new'|'accepted'|...|'done' — has NO
                                          // 'cancelled' or 'refunded' entries; falls back to
                                          // map.new ("New" chip) for a cancelled order, and to
                                          // "Done" (not "Completed") for a finished order.
// screen-history.jsx already solves this correctly (historyStatusMeta + deriveDisplayStatus,
// keyed on 'completed'|'canceled'|'refunded') — port the same chip-class/icon/tint mapping for
// the readOnly branch in screen-detail.jsx, OR extract historyStatusMeta to a shared module so
// both files import one mapping (planner's call; either satisfies D-05, extraction avoids drift).
```

### Anti-Patterns to Avoid

- **Using `stateMeta(order.state, t)` unchanged for the `readOnly` status chip:** confirmed by direct
  read of `screen-orders.jsx:23-33` — this map has no `'cancelled'` or `'refunded'` key. A cancelled
  order (`order.state === 'cancelled'`) falls through to `map.new`, rendering a "New" chip on a
  finished archived order. This is the exact bug D-05 exists to prevent; verify it is actually fixed,
  not just avoided by coincidence of test fixtures.
- **Branching error copy on HTTP status:** `useOrderDetail` deliberately discards the status code
  (`throw new Error(result.error.error ?? …)`), so any attempt to say "order not found" vs.
  "unauthorized" vs. "network error" would require touching the D-01-locked hook. Don't do it — one
  generic message (D-08).
- **Adding a `readOnly`-only fetch inside `screen-detail.jsx`:** would violate D-04's explicit
  "screen-detail.jsx stays a pure presenter with zero data code" and reintroduce the exact prop-drilling
  question D-04 already resolved.
- **Deriving "handled-by" from `events[].actor` "because the data is technically there":** explicitly
  cut under D-09 — `actor` is `string | null` with undocumented semantics; do not resurrect this field
  under a different label ("staff member", "processed by", etc.) without a fresh CONTEXT.md decision.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|--------------|-----|
| Fetching a single order's full detail | A new hook, a new query key, a parameterized "detail hook" that takes a `source` flag | `useOrderDetail(id)` unchanged (`src/use-order-detail.js`) | Identical endpoint, identical error shape, identical `normalizeOrder` pass for both the live and history routes (D-01) — a second hook would be pure duplication with zero behavioral difference |
| Status-chip color/label mapping for a finished order | A new inline ternary in `screen-detail.jsx` | `deriveDisplayStatus()` (`history-utils.js`) + the existing `historyStatusMeta`-style mapping already proven correct in `screen-history.jsx:28-35` | Two independent implementations of "what chip does a refunded/canceled/completed order get" is exactly the kind of drift D-05 exists to prevent |
| Duration formatting ("25 min" / "1h 5m") | A new formatter | `formatDuration(minutes)` (`src/data.jsx:177-182`) | Already handles both branches correctly; UI-SPEC explicitly requires reusing it verbatim |
| Money formatting from cents | A new `/ 100` divide anywhere in the phase's new code | `normalizeOrder()`'s existing `cRON()` conversion (`src/data.jsx:196`) | All money in this phase flows through `normalizeOrder` already (both `historyOrder` and the `getOrder` response) — new code should never re-divide |

**Key insight:** Every piece of "don't hand-roll" guidance in this phase points back to the same
lesson: Phase 7 already solved these exact problems (fetching, deriving status, formatting) for the
list. Phase 8's job is to reuse those solutions for the detail view, not to re-derive them locally in
`screen-detail.jsx`. The phase's own framing in CONTEXT.md — "mostly a data-source swap" — is the
correct mental model; treat any new derivation logic as a signal to check whether Phase 7 already wrote it.

## Common Pitfalls

### Pitfall 1: React hook-ordering violation

**What goes wrong:** Adding `useOrderDetail(historyOrder?.id)` below `App()`'s conditional returns
(`coldStartBusy` at line ~207, `!isAuthenticated` at line ~212) throws "Rendered fewer hooks than
expected" whenever those guards trigger, because the hook count differs between renders.

**Why it happens:** `App()` has two early `return` statements before its main JSX. Every hook must be
called unconditionally, in the same order, on every render — a hook call added after an early return
only runs on some renders.

**How to avoid:** Add the new `useOrderDetail` call in the same unconditional block as the existing
`selectedOrderId` one (`app.jsx:70`), i.e. before line 207's `if (coldStartBusy)`. This is exactly the
precedent already established for `useSSE`/`useOrders`/`useUpdater` in this file (see STATE.md's
"Critical Watch-Outs: React hook ordering in app.jsx").

**Warning signs:** A React error in the console reading "Rendered more/fewer hooks than during the
previous render," typically surfacing right after sign-in or sign-out, since that's when the
conditional-return branches change.

### Pitfall 2: Reusing `order.state` for the status chip on the read-only route

**What goes wrong:** `stateMeta(order.state, t)` (imported from `screen-orders.jsx`) has entries for
`new/accepted/preparing/ready/out/done` only — no `cancelled`, no concept of `refunded`. A finished
order falls back to `map.new` ("New" chip, terracotta) if cancelled, or shows "Done" (not "Completed")
if finished. This directly contradicts the chip the user just clicked in History (which correctly shows
"Refunded"/"Canceled"/"Completed" via `deriveDisplayStatus`).

**Why it happens:** `stateMeta` was designed for the live order lifecycle (new → accepted → … → done),
which has no refunded/canceled-with-nuance concept — those states were added later, in Phase 7, for the
archive view only, and `screen-detail.jsx` was never updated to know about them.

**How to avoid:** In the `readOnly` branch, compute `deriveDisplayStatus(order)` and map it through the
same completed/canceled/refunded → chip-class/label mapping `screen-history.jsx`'s `historyStatusMeta`
already uses (D-05). Do not touch `stateMeta`'s behavior for the live (non-`readOnly`) route.

**Warning signs:** A UAT reviewer opens a refunded historical order and sees "New" or "Completed"
instead of "Refunded" in the detail header chip while the row it came from correctly says "Refunded."

### Pitfall 3: Items-card region blanking on `getOrder` failure

**What goes wrong:** If the error state is implemented as a full-screen conditional (`if (detailError)
return <ErrorScreen/>`) instead of scoped to the items-card region only, the header/customer/totals
that already rendered from `historyOrder` disappear the moment `getOrder` fails — directly violating
ROADMAP SC2 and D-07.

**Why it happens:** It's the more familiar/simpler pattern (`isError ? <Error/> : <Content/>`) and is
easy to reach for by default; this phase deliberately requires the less-common scoped-region pattern.

**How to avoid:** Gate only the items-card's *internal* content (header text + rows) on
`detailLoading`/`detailError`; never gate the outer `<div className="card">...</div>` shell or anything
above it in the component tree.

**Warning signs:** Manually simulating a `getOrder` failure (e.g. temporarily throwing in the queryFn)
and observing the customer card / total figure vanish along with the items.

### Pitfall 4: Forgetting the "Modify" button sweep

**What goes wrong:** Gating only the one documented ungated control (`screen-detail.jsx:131`) and
declaring SC3 satisfied, when another interactive element elsewhere in the file was also missed.

**Why it happens:** The existing test suite's history-route fixture uses `items: null`
(`app-history-route.test.jsx:52`), which means the items card — and therefore the "Modify" button —
never rendered in that test, so the bug was invisible until this phase actually hydrates `items[]`.
There is no guarantee this is the *only* control the same blind spot hid.

**How to avoid:** After hydration lands (so `order.items != null` on the readOnly route for the first
time), manually or via test render the fully-hydrated readOnly screen and grep/visually verify every
`<button>`, every `onClick`, every interactive `<input>` in `screen-detail.jsx` is behind one of the six
existing `!readOnly` gates (lines 59, 99, 106, 228, 240, 256) or the new one at line 131. The customer
card's phone-call button (line 100) is already gated — confirmed. The thermal-ticket tab switcher
(lines 216-222, `setTab`) is presentational only (no mutation), so it's correctly left ungated.

**Warning signs:** A UAT step that clicks every visible button on a fully-hydrated readOnly historical
order and confirms none of them mutate state or navigate away destructively.

### Pitfall 5: Duration derivation picking the wrong event on re-completion/correction

**What goes wrong:** If `order.events[]` contains more than one `COMPLETED` or `CANCELLED` event (a
status correction or re-completion), naively using `.find()` (first match) instead of the most recent
matching event produces a stale or wrong duration.

**Why it happens:** `Array.prototype.find()` returns the first match by array order, which is not
guaranteed to be the terminal/most-recent one; `events[]` order is not documented as strictly
chronological-ascending by the SDK types (only `createdAt` is authoritative per-event).

**How to avoid:** Per UI-SPEC E1's "zero-one-many" resolution: filter to matching events, then pick the
one with the maximum `createdAt`. `COMPLETED` still takes precedence over `CANCELLED` when both exist
in `events[]` (an order that was completed and later had a correction event added should still read as
completed, not canceled).

**Warning signs:** A finance/ops spot-check where prep time on a re-completed order doesn't match what
staff remember, or is negative/absurdly large.

### Pitfall 6: `staleTime: 0` causing a visible flash on every open

**What goes wrong:** Because `useOrderDetail` uses `staleTime: 0` (by design, D-01 accepts this), every
time staff reopen the same historical order, TanStack Query refetches immediately even though the data
is cached and can never change. If the loading skeleton isn't cheap/fast, this could read as a
flash/flicker on repeat opens.

**Why it happens:** `staleTime: 0` marks cached data as immediately stale, so `useQuery` refetches on
mount even with data already in cache — a deliberate, accepted tradeoff (D-01), not a bug to fix in
this phase.

**How to avoid:** Nothing to change in code — this is accepted debt (see Deferred Ideas: "A
history-scoped query key / longer `staleTime` for archived orders"). The loading UI should just be
cheap enough that a sub-second refetch of already-cached-in-browser-memory data doesn't visually
distract; TanStack Query still shows the previous `data` synchronously while refetching in the
background (the `isPending` flag distinguishes "no data yet" from "refetching with data already
present" — verify the skeleton only shows on the former, not on every background refetch, or reopening
the same order will flash the skeleton unnecessarily even though the previous render's items are still
valid to show).

**Warning signs:** Visually flickering item rows every time the same historical order is reopened.

## Code Examples

### Merge pattern at the route (extends the existing live-route precedent)

```jsx
// Source: src/app.jsx (verified existing code at lines 48, 58-59, 70, 243-245)
const selectedOrderId = useAppStore((s) => s.selectedOrder?.id);
const historyOrder = useAppStore((s) => s.historyOrder);
// ...
const { data: selectedOrder } = useOrderDetail(selectedOrderId);
// NEW — sibling call, same unconditional scope, above any early return:
const { data: historyDetail, isPending: historyDetailPending, isError: historyDetailError, refetch: refetchHistoryDetail }
  = useOrderDetail(historyOrder?.id);
const mergedHistoryOrder = historyOrder ? { ...historyOrder, ...(historyDetail ?? {}) } : null;
// ...
{screen === 'history-detail' && historyOrder && (
  <OrderDetailScreen
    order={mergedHistoryOrder}
    lang={lang}
    readOnly
    detailLoading={historyDetailPending}
    detailError={historyDetailError}
    onRetryDetail={refetchHistoryDetail}
    onBack={() => setScreen('history')}
    isOffline={isOffline}
  />
)}
```

### Duration derivation (new, co-located with `screen-detail.jsx` — module-private helper)

```js
// Pattern mirrors screen-orders.jsx's module-private sourceMeta/typeMeta/stateMeta helpers
// (colocated with their sole consumer, not promoted to a shared module).
function deriveDuration(order) {
  if (!order.events || order.events.length === 0 || !order.placedAt) return null;
  const latestOfType = (toStatus) =>
    order.events
      .filter((e) => e.toStatus === toStatus)
      .reduce((latest, e) => (!latest || new Date(e.createdAt) > new Date(latest.createdAt) ? e : latest), null);

  const completed = latestOfType('COMPLETED');
  if (completed) {
    const minutes = Math.max(0, Math.round((new Date(completed.createdAt) - new Date(order.placedAt)) / 60000));
    return { kind: 'prep', minutes };
  }
  const cancelled = latestOfType('CANCELLED');
  if (cancelled) {
    const minutes = Math.max(0, Math.round((new Date(cancelled.createdAt) - new Date(order.placedAt)) / 60000));
    return { kind: 'canceled', minutes };
  }
  return null; // neither terminal event present — drop the segment (UI-SPEC E1 "empty"/"partial")
}
```
Note: `toStatus` values are the raw SDK enum strings (`'COMPLETED'`, `'CANCELLED'`) per
`OrderEvent.toStatus: string` — `normalizeOrder` does not touch `events[]` (it is passed through
unmodified via the `...o` spread), so raw SDK casing must be used here, not the lowercased
`order.state` values (`'done'`, `'cancelled'`).

### Status chip fix for the `readOnly` branch

```jsx
// Source: src/history-utils.js (existing) + src/screen-history.jsx:28-35 (existing mapping to port/extract)
import { deriveDisplayStatus } from './history-utils.js';
// ...
const displayStatus = readOnly ? deriveDisplayStatus(order) : null;
const st = readOnly ? historyChipMeta(displayStatus, t) /* ported or imported mapping */ : stateMeta(order.state, t);
```

## State of the Art

Not applicable in the conventional sense — no external library or API has moved since Phase 7 shipped
6 hours before this research. The one relevant "old vs. current" distinction is internal to this
project:

| Old Approach (Phase 7, still true for the live route) | Current Approach (this phase, `readOnly` route only) | When Changed | Impact |
|--------------------------------------------------------|--------------------------------------------------------|---------------|--------|
| History detail route renders the thin `AdminOrder` summary only (`items: null`) | History detail route hydrates via `getOrder(id)` and merges over the summary | Phase 8 (this phase) | Items, modifiers, address, phone, and derived duration become visible for the first time on historical orders |
| Status chip uses raw `order.state` via `stateMeta()` (correct for live orders, wrong for archived ones) | Status chip uses `deriveDisplayStatus()` + a completed/canceled/refunded-aware mapping, `readOnly` only | Phase 8 (this phase) | Refunded/canceled orders now show the correct chip in the detail view, matching the row |

**Deprecated/outdated:** N/A for this phase.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|----------------|
| A1 | The `deriveDuration` helper (event-timestamp diff) should live co-located in `screen-detail.jsx` rather than promoted to `history-utils.js` or `data.jsx` | Architecture Patterns / Code Examples | Low — purely a file-organization choice; either location works functionally. If the planner prefers `data.jsx` (alongside `elapsedMinutes`/`formatDuration`), that's an equally valid placement; flagged as a planner decision, not a blocking assumption |
| A2 | `screen-history.jsx`'s `historyStatusMeta` mapping should be either duplicated in `screen-detail.jsx` or extracted to a shared module for D-05's chip fix | Architecture Patterns / Pattern 3 | Low — both satisfy D-05's requirement that row and detail agree; extraction avoids future drift but duplication is not wrong, just slightly riskier long-term. Left as an implementation choice for the planner |
| A3 | `Math.round()` (not `Math.floor()`, which `elapsedMinutes` uses) is appropriate for the new duration derivation since it is a fixed historical diff, not a live ticking value | Code Examples | Very low — a one-minute rounding difference in a "prep time: 25 min" display has no functional consequence; `Math.floor` would also be acceptable and more consistent with `elapsedMinutes`'s existing convention |

**All claims tagged `[ASSUMED]` above are low-risk file-organization or minor-formatting choices, not
factual claims about the SDK, API behavior, or user requirements.** Every claim about SDK shapes, error
codes, existing code line numbers, and Phase 7 deliverables in this document was verified directly
against the installed `@charlyk/admin-client` type definitions and the actual repository source files
during this research session — see Sources below.

## Open Questions

1. **Should the loading skeleton distinguish "first open, no cached data" from "reopening an
   already-cached order, background refetch in flight" given `staleTime: 0`?**
   - What we know: TanStack Query v5's `isPending` is `true` only when there is no data at all yet
     (first fetch or a fully-evicted cache entry); a background refetch of already-cached data does
     not set `isPending`, only `isFetching`.
   - What's unclear: Whether the UI-SPEC's "3 skeleton rows while `getOrder` is in flight" intends
     `isPending` (first-open only, recommended) or `isFetching` (would flash on every reopen due to
     `staleTime: 0`, per Pitfall 6).
   - Recommendation: Gate the skeleton on `isPending`, not `isFetching`. This avoids the Pitfall 6
     flash and matches the phrasing "while `getOrder` is in flight" as most naturally meaning "we have
     nothing to show yet," which is what `isPending` represents. Flag this choice explicitly in the
     plan so the plan-checker/verifier can confirm it against UI-SPEC's E2 loading resolution.

2. **Where should the `deriveDuration` helper (and, if extracted, the shared chip-status mapping)
   physically live?**
   - What we know: Both are pure functions with no React/SDK imports in principle, matching
     `history-utils.js`'s stated convention ("no react/data.jsx/@charlyk imports").
   - What's unclear: Whether the planner prefers strict reuse of `history-utils.js` for anything
     order-status/duration-shaped (growing that module beyond "list-level" derivations), or keeping
     `screen-detail.jsx`-only concerns local to that file per the "co-location for single-consumer
     helpers" convention seen in `screen-orders.jsx` (`sourceMeta`/`typeMeta`/`stateMeta`).
   - Recommendation: Either is architecturally sound (see Assumptions A1/A2); the planner should pick
     one and record it as a Key Decision in STATE.md for consistency with the project's existing
     per-decision logging practice, but it is not a blocking research gap.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.5 (installed, confirmed via `npx vitest --version`) + `@testing-library/react` |
| Config file | `vitest.config.js` (environment: `jsdom`, globals: true, setup: `src/__tests__/setup.js`) |
| Quick run command | `npx vitest run src/__tests__/screen-detail.test.jsx src/__tests__/app-history-route.test.jsx` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|---------------------|--------------|
| HIST-10 | Detail hydrates via `getOrder(id)`: items/modifiers/subtotal/deliveryFee/total/phone/address render | unit/integration | `npx vitest run src/__tests__/app-history-route.test.jsx -t "history-detail"` | ✅ file exists, needs new assertions — the current fixture uses `items: null` and never exercises hydration |
| HIST-10 (SC2) | Loading skeleton shows before `getOrder` resolves; failure shows inline retry, summary stays visible | unit | `npx vitest run src/__tests__/screen-detail.test.jsx` | ⚠ Wave 0 — new test cases needed; the mock in `app-history-route.test.jsx:22` (`useOrderDetail: () => ({ data: undefined })`) must be extended to a controllable mock (pending/error/success states) |
| HIST-10 (SC3) | No mutating control reachable under `readOnly`, including a fully-hydrated items card ("Modify" gated) | unit | `npx vitest run src/__tests__/app-history-route.test.jsx -t "Modif"` | ⚠ existing assertion at line 105 doesn't actually exercise the bug (fixture has `items: null`) — Wave 0 must add a hydrated-items fixture to make this assertion meaningful |
| HIST-10 (SC1, D-05) | Refunded/canceled historical order shows correct status chip in detail, matching its row | unit | `npx vitest run src/__tests__/screen-detail.test.jsx -t "status"` | ❌ Wave 0 — no existing test covers `readOnly` status-chip derivation |
| HIST-10 (D-10) | Prep time / canceled-after duration row renders correctly, including the zero-one-many (latest-event-wins) case | unit | `npx vitest run src/__tests__/screen-detail.test.jsx -t "duration"` | ❌ Wave 0 — new pure-function or component test needed |
| HIST-10 (SC4) | Back returns to History with list/period intact | integration | `npx vitest run src/__tests__/app-history-route.test.jsx -t "back"` | ⚠ existing router tests cover the redirect/render cases but not an explicit "click Back → screen becomes 'history'" assertion from within `history-detail` |

### Sampling Rate

- **Per task commit:** `npx vitest run src/__tests__/screen-detail.test.jsx src/__tests__/app-history-route.test.jsx`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] Extend `app-history-route.test.jsx`'s `useOrderDetail` mock (currently `() => ({ data: undefined
      })`, shared by both call sites) to a controllable, per-id mock so the live-route and
      history-route calls can be independently set to pending/success/error in different test cases.
- [ ] Add a hydrated-items fixture (`items: [...]`, `events: [...]`) to `app-history-route.test.jsx` or
      `screen-detail.test.jsx` — the current `historyOrderFixture` (`items: null`) cannot exercise the
      Modify-button gating bug, the duration row, or the real item-row rendering path.
- [ ] Add a `readOnly` + `paymentCaptureStatus: 'refunded'` fixture to `screen-detail.test.jsx` to
      cover D-05's chip-derivation fix.
- [ ] Add fixtures with (a) a `COMPLETED` event, (b) a `CANCELLED` event, (c) no terminal event, (d)
      two `COMPLETED` events with different timestamps, to cover D-10's UI-SPEC E1 category matrix
      (populated / empty / zero-one-many).
- [ ] No new framework install needed — Vitest + Testing Library are already configured and used by
      the existing `screen-detail.test.jsx` and `app-history-route.test.jsx`.

## Security Domain

`security_enforcement` is not set in `.planning/config.json` (absent = enabled by default).

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|----------------|---------|--------------------|
| V2 Authentication | No (unchanged) | Existing app-wide auth guard (`app.jsx` `isAuthenticated` check) already gates the entire screen tree; this phase adds no new auth surface |
| V3 Session Management | No (unchanged) | No session handling introduced |
| V4 Access Control | **Yes** | This phase's core security property (SC3): no mutating control (Advance, Cancel, Modify, timeline) may be reachable from the `readOnly` route. Standard control: exhaustive `!readOnly` gating on every interactive element in `screen-detail.jsx`, verified by sweep (Pitfall 4) rather than trusted by inspection of one known bug |
| V5 Input Validation | No | No new user input is introduced (Retry is a parameterless re-fetch, not user input) |
| V6 Cryptography | No | Not applicable — no new cryptographic material |

### Known Threat Patterns for this stack/phase

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|------------------------|
| A hidden-but-not-disabled mutating control reachable via keyboard/devtools despite visual gating | Elevation of Privilege | Gate with a JS conditional (`{!readOnly && (...)}`) that fully removes the element from the DOM, not just `disabled`/`opacity` styling — confirmed this is already the codebase's convention (all six existing `readOnly` gates use `{!readOnly && (...)}`, not `disabled`); the new "Modify" gate (line 131) and duration-row logic must follow the same DOM-removal pattern, not a CSS-only hide |
| A 401 on `getOrder(id)` leaking through the generic error message and being confused with a data problem rather than an auth problem | Information Disclosure (inverse — under-disclosure is intentional here, D-08) | Accepted by design (D-08): the generic message is a deliberate simplification, not a security gap — 401 is already handled app-wide by the existing auth-refresh/redirect layer per STATE.md's auth architecture, so a stale-token 401 on this specific call should self-resolve via that layer before the user even sees the generic "couldn't load" message in most cases |
| Cross-order data bleed via the shared `['order', id]` cache key (D-02) | Tampering (data integrity, not security boundary) | Not a security concern — both the live and history routes only ever read the order the *authenticated* staff member is already permitted to see via `listAdminOrders`/`getOrder`, which are both scoped server-side to the authenticated restaurant. The shared cache key is a correctness/freshness tradeoff (D-02), not an access-control gap |

## Sources

### Primary (HIGH confidence — verified directly against installed source/types this session)

- `node_modules/@charlyk/admin-client/dist/index.d.ts` (installed v1.1.59) — `GetOrderData` (lines
  1408-1415: `url: '/v1/orders/{id}'`, `path: { id: string }`, no query param), `GetOrderErrors` (lines
  1416-1425: 401 and 404 only, no 403), `Order` type (lines 788-829: full field list including
  `items[]`, `events[]`, `paymentCaptureStatus`, delivery address fields, `estimatedMinutes`; confirmed
  **no** `tax` or `tip` field on `Order`), `OrderEvent` type (lines 758-766: `toStatus`, `actor: string
  | null`, `reason`, `createdAt`), `SelectedOption`/`OrderItem` types (lines 767-787)
- `src/use-order-detail.js` (full file read) — hook implementation, cache key, error handling, `staleTime: 0`
- `src/app.jsx` (full file read) — existing route wiring at lines 48, 58-70, 191-198 (rehydrate
  backstop), 200-249 (screen router), hook-ordering constraint (conditional returns at ~207, ~212)
- `src/screen-detail.jsx` (full file read) — all six existing `readOnly` gates (lines 59, 99, 106, 228,
  240, 256), the ungated Modify button (line 131), the `items != null` minimal-totals fallback (lines
  191-204), the current (buggy for readOnly) `stateMeta(order.state, t)` usage (line 15)
- `src/store.js` (full file read) — `historyOrder` session-only slot, `setScreen`/`openHistoryOrder`
  action semantics (both clear `selectedOrder`/`historyOrder` on `setScreen`)
- `src/history-utils.js` (full file read) — `deriveDisplayStatus`, `filterFinishedOrders`,
  `groupOrdersByDay`, `computeSummary`, all pure/React-free by design
- `src/screen-history.jsx` (full file read) — `historyStatusMeta` mapping, `SkeletonRow`/`ErrorBlock`
  patterns to mirror, `useHistoryOrders` period-state location (confirms SC4's "period intact" is
  already satisfied by existing lazy-init + cache-key architecture)
- `src/use-history-orders.js` (full file read) — confirms no period-switching state exists yet
  (Phase 9 scope), cache key `['history-orders', from, to]`, `staleTime: 30_000`
- `src/data.jsx` (partial read, lines 170-257) — `formatDuration`, `elapsedMinutes`, `orderTimeLabel`,
  `normalizeOrder` (confirmed `events[]` passes through unmodified via `...o` spread; confirmed `cRON`
  cents-to-RON conversion; confirmed `tax`/`tip` always default to 0 since `Order` has no such fields)
- `src/screen-orders.jsx` (partial read, lines 1-40) — `stateMeta` map contents, confirming the D-05
  bug (no `cancelled`/`refunded` keys)
- `src/i18n.jsx` (grep-verified) — confirmed `h_back_to_history`, `h_retry`, `check_connection`, and
  `elapsed` already exist in both `ro`/`en`; confirmed the four new UI-SPEC keys
  (`h_detail_error_title`, `h_prep_time`, `h_canceled_after`, `h_detail_no_items`) do **not** yet exist
- `src/__tests__/app-history-route.test.jsx` (full file read) — existing mock shape, the `items: null`
  fixture that leaves the Modify-gating bug and hydration path untested today
- `src/__tests__/screen-detail.test.jsx` (partial read) — existing test scaffolding/mock conventions
- `vitest.config.js` + `npx vitest --version` (executed) — confirmed Vitest 4.1.5, jsdom environment
- `.planning/config.json` (read) — confirmed `nyquist_validation: true`, `security_enforcement` absent (default enabled)
- `.planning/phases/08-read-only-order-detail-view/08-CONTEXT.md` — all D-01 through D-10 decisions,
  Claude's Discretion items, Deferred Ideas, Roadmap Impact (source of the user-decision layer this
  research verifies against, not re-derives)
- `.planning/phases/08-read-only-order-detail-view/08-UI-SPEC.md` — approved visual/interaction
  contract (typography, spacing, color, copy, UI-consideration probe coverage for E1-E5)
- `.planning/REQUIREMENTS.md`, `.planning/STATE.md`, `.planning/ROADMAP.md` — requirement text,
  decision history, phase success criteria

### Secondary (MEDIUM confidence)

None required for this phase — no external documentation lookups were necessary; the entire domain is
internal, already-shipped code with directly-inspectable source and type definitions.

### Tertiary (LOW confidence)

None — no web search was performed for this phase (no search providers configured in this environment
per `init.phase-op`, and none were needed: no new external library or API surface is introduced).

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — zero new dependencies; all reused code read directly from source this session
- Architecture: HIGH — merge pattern, route placement, and hook-ordering constraint all directly
  observed in existing `app.jsx` code and CONTEXT.md's locked decisions, not inferred
- Pitfalls: HIGH — five of six pitfalls (chip bug, blanking bug, Modify-gating gap, hook ordering,
  staleTime flash) were confirmed by directly reading the relevant source lines, not hypothesized;
  Pitfall 5 (duration event-selection) is directly specified by UI-SPEC's E1 zero-one-many resolution

**Research date:** 2026-07-17
**Valid until:** 30 days (stable, internal-only phase; no external dependency to go stale — re-verify
only if `@charlyk/admin-client` is bumped before this phase is planned/executed)
