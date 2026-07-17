# Phase 8: Read-Only Order Detail View - Context

**Gathered:** 2026-07-17
**Status:** Ready for planning — ⚠ one ROADMAP success criterion needs amending (see Roadmap Impact)

> **Decision numbering:** `D-01`…`D-10` below are **Phase 8** decisions. Phase 7's decisions are
> always qualified as **`P7 D-nn`** to avoid collision with `07-CONTEXT.md`, which numbered its own
> D-01…D-16.

<domain>
## Phase Boundary

Staff can open any historical order from the History list and read its full receipt — items with
modifiers, delivery address, totals, and how long it took — without any control that could change it.

**In scope:** HIST-10 (rewritten). Hydrating the **already-routed** `history-detail` screen via
`getOrder(id)`; merging that payload over the `AdminOrder` summary Phase 7 already put in the store;
loading and failure states for that fetch; a derived duration row; and closing the one mutating
control that `readOnly` currently fails to hide.

**Out of scope:** period presets (Phase 9), status/type filters and search (Phase 10), reprint and
CSV export (Phase 11). The route, the `readOnly` prop, the store's `historyOrder`, the back-to-History
navigation, and the rehydrate backstop **all already ship from Phase 7** — this phase does not rebuild
them.

**What this phase actually is:** mostly a data-source swap. `normalizeOrder()` already maps the full
SDK `Order` shape, and `screen-detail.jsx` already renders items, mods, address, and totals from it.
The genuinely new rendering is the duration row and the loading/failure states.

</domain>

<decisions>
## Implementation Decisions

### Hydration + caching

- **D-01: Reuse `useOrderDetail(id)` (`src/use-order-detail.js`) completely unchanged.** It already
  calls the exact endpoint this phase needs and runs the result through `normalizeOrder`. No new hook,
  no new key, no signature change. Chosen over a history-scoped hook and over parameterising the
  existing one.
  - **Verified:** despite the `client.kitchen.orders.get` namespacing, `GetOrderData.url` is
    **`/v1/orders/{id}`** — *not* kitchen-scoped. Archived orders resolve through it. Documented
    errors are **401 and 404 only** (there is no 403, contrary to the ROADMAP SC2 wording).
  - Consequence accepted: `staleTime: 0` means an archived order refetches on every mount/focus even
    though it can never change. Cost is one cheap request; not worth a divergent hook.

- **D-02: The shared `['order', id]` cache entry is accepted as intentional — "one order, one truth."**
  `use-sse.js:94` writes this key via `setQueryData` on status events, so a live SSE event (e.g. a late
  refund) can update what the read-only view shows. This is treated as reflecting reality, not as a
  bug. Opening the same order from Orders or from History shows identical data by construction. No
  snapshot, no guard, no defensive copy.
  - ⚠ **Note for Phase 11 (reprint):** a reprint from this view may therefore print post-SSE data
    rather than the payload as originally fetched.

### Summary → detail merge

- **D-03: Merge, hydrated wins — `{...historyOrder, ...detail}`.** The `AdminOrder` summary renders
  instantly; `getOrder` fields fill in as they arrive; nothing ever blanks. Directly satisfies ROADMAP
  SC2. Safe because **both sides are already `normalizeOrder`'d**, so field names align (`state`,
  `type`, `total`, `customer`, `placedAt`). Rejected: replacing the summary outright, and storing only
  the id (which would blank the screen during load).

- **D-04: The `getOrder` call and the merge live in `app.jsx`, at the route.** `app.jsx:70` already
  calls `useOrderDetail(selectedOrderId)` for the live route; add a sibling call for
  `historyOrder?.id` and pass the merged object into `<OrderDetailScreen readOnly>`.
  `screen-detail.jsx` **stays a pure presenter with zero data code** — the same shape `P7 D-09`
  already accepted.
  - ⚠ This is a deliberate, narrow departure from CLAUDE.md's *"screens call their own data hooks —
    no prop-drilling from App."* Rationale: `screen-detail.jsx` serves two callers, and only one of
    them fetches; making the screen fetch conditionally would put two data paths in one file. The
    prop-driven live route sets the precedent.
  - ⚠ **Hook-ordering rule applies** — the new hook call must sit above `App()`'s conditional returns
    (the auth guard at `app.jsx:207`), or React throws "rendered fewer hooks than expected."

- **D-05: The read-only detail reuses Phase 7's derived display status (`history-utils.js`), not raw
  `order.state`.** A refunded order is `status: COMPLETED` + `paymentCaptureStatus: 'refunded'`
  (`P7 D-02`); `screen-detail.jsx` reads `order.state`, which would render it as **Completed** and
  contradict the **Refunded** chip on the row staff just clicked. Apply the same single-status
  derivation so row and detail agree by construction. Rejected: showing both chips (`P7 D-02`
  deliberately chose one status slot) and leaving it as Completed.

### Loading + failure

- **D-06: Skeleton rows in the receipt region while `getOrder` is in flight.** Header, customer,
  address, and total render immediately from the summary; the items card shows skeleton lines that
  swap to real rows. Mirrors `P7 D-16`'s skeleton-rows choice on the list, so History reads as one
  screen. **No layout jump** between loading, error, and content.

- **D-07: On failure, an inline message with Retry replaces the items card — the summary stays on
  screen.** Satisfies ROADMAP SC2 ("the `AdminOrder` fields already fetched stay visible rather than
  blanking") and mirrors `P7 D-16`'s retry-in-place pattern. Rejected: a full-area error (discards
  data we already hold) and a toast (easy to miss, no obvious retry).

- **D-08: One generic, retryable message for every failure — no branching on status code.**
  "Couldn't load this receipt" + Retry, for 404, 401, and network alike. Two i18n keys, no branch.
  - Rationale: a 404 on an order staff clicked seconds ago is near-impossible (the id came from a
    list fetched moments before), and 401 is already handled app-wide by the auth layer.
  - **Self-consistent with D-01:** `useOrderDetail` throws `new Error(result.error.error ?? …)` and
    **discards the HTTP status**, so any status-aware copy would require modifying the hook that D-01
    locks as unchanged.

### Duration + handled-by

- **D-09: "Handled by" is CUT — no clean data source.** `Order` has no such field; it exists only as
  `events[].actor`, typed `string | null` with no documented semantics. Guessing which event
  represents "handled by" risks misattributing work to the wrong person. Record in REQUIREMENTS.md
  **"Design Elements Cut"** alongside tax and tip. ⚠ **Amends ROADMAP Phase 8 SC1 and HIST-10** — see
  `<roadmap_impact>`.

- **D-10: Prep time is the ACTUAL duration, derived from event timestamps — not `estimatedMinutes`.**
  More useful for reviewing a past order than the estimate given at accept. Unlike `actor`, event
  timestamps are non-null and unambiguous.
  - **Completed orders:** `createdAt` → the COMPLETED event's `createdAt`, labelled as prep time.
  - **Cancelled orders:** `createdAt` → the CANCELLED event's `createdAt`, **relabelled** (e.g.
    "Canceled after") — it is no longer prep time, so the label is dynamic.
  - Both labels need `ro` + `en` i18n keys.
  - `estimatedMinutes` is **not** rendered in this phase.

### Claude's Discretion

- **Neither a COMPLETED nor a CANCELLED event exists** (or `events` is empty): hide the duration row
  entirely. Should not occur — `P7 D-01` makes History finished-only — but do not render a partial or
  misleading number.
- **Where the duration row sits** in the detail layout, and its exact copy/format ("25 min" vs
  "25m" vs "0h 25m"). Not discussed. Follow the design's existing meta-row treatment.
- **Skeleton row count** in the loading state — match the design's item-row height; the real count is
  unknown until `getOrder` returns (`AdminOrder` has no `items[]`).
- **Whether the ungated "Modify" button (below) is removed under `readOnly` only, or reconsidered for
  the live route too** — the live route's behaviour is out of scope here; gate it, don't redesign it.

### Folded Fix (in scope — closes ROADMAP SC3)

- **`src/screen-detail.jsx:131` renders a "Modify" button (`btn-ghost`) that is NOT `readOnly`-gated.**
  It is reachable on the `history-detail` route today, directly contradicting Phase 8 SC3 ("no control
  that mutates order state is reachable"). Phase 7 gated advance/cancel/print/call/notes but missed
  this one. **Gate it behind `!readOnly` in this phase.**
  - The planner should **sweep `screen-detail.jsx` for any other ungated interactive control** rather
    than trusting this single finding — SC3 is a claim about the whole surface, not about one button.

</decisions>

<roadmap_impact>
## ⚠ Roadmap Impact — amend before/while planning

**D-09 cuts "handled-by"**, which two documents currently promise:

- **ROADMAP.md § Phase 8, Success Criterion 1** — currently lists "…customer phone, delivery address,
  **handled-by**, and prep time". Remove `handled-by`. Also note SC1's "prep time" now means the
  **actual derived duration** (D-10), not `estimatedMinutes`.
- **REQUIREMENTS.md HIST-10** — same edit: drop `handled-by` from the field list. Add a
  **"Design Elements Cut"** row: *"Handled-by — no field on `Order`; only `events[].actor`
  (`string | null`, undocumented semantics). Deriving it risks misattribution (D-09)."*

**Also worth correcting (minor, factual):**
- ROADMAP Phase 8 **SC2** says "fails or returns **401/403**". The SDK documents **401 and 404** for
  `getOrder`; there is no 403. D-08 makes this moot in implementation (generic message), but the
  criterion should not assert an error the API does not return.

Unlike Phase 7's reversals, these do **not** change phase structure or ordering — Phases 9–11 are
unaffected. `/gsd-phase` is not required; a direct edit to the two documents suffices.

</roadmap_impact>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Prior phase context (read first — this phase is a direct continuation)
- `.planning/phases/07-history-screen-foundation/07-CONTEXT.md` — **the parent decision record.**
  `P7 D-07`/`D-08`/`D-09` created this phase; `P7 D-01` (finished-only), `P7 D-02` (refunded wins),
  `P7 D-16` (loading/error shape) are all load-bearing here. Its `<canonical_refs>` and
  `<code_context>` are not duplicated in full below — read them.

### Requirements + planning
- `.planning/REQUIREMENTS.md` — **HIST-10** is this phase's sole requirement. ⚠ Its `handled-by`
  clause is stale per `<roadmap_impact>`. The "Design Elements Cut" table explains why tax, tip,
  table, and refund amount are absent from the receipt.
- `.planning/ROADMAP.md` § Phase 8 — goal + 4 success criteria. ⚠ SC1 (`handled-by`) and SC2
  (`401/403`) are stale per `<roadmap_impact>`.

### SDK (verified against installed types, v1.1.59)
- `node_modules/@charlyk/admin-client/dist/index.d.ts` § `GetOrderData` — url is **`/v1/orders/{id}`**,
  `path: { id: string }`, no query. Errors: **401, 404 only**. Response: "Single order with full items
  and event log."
- `node_modules/@charlyk/admin-client/dist/index.d.ts` § `Order` — the full detail payload. Has
  `items[]`, `subtotal`, `deliveryFee`, `total`, `customerPhone`, the six `delivery*` address fields,
  `estimatedMinutes`, `paymentCaptureStatus`, and `events[]`. **No `tax`, no `tip`, no `table`, no
  handled-by.**
- `node_modules/@charlyk/admin-client/dist/index.d.ts` § `OrderItem` / `SelectedOption` — modifiers
  live in `items[].selectedOptions[].optionName` with a `priceDelta`.
- `node_modules/@charlyk/admin-client/dist/index.d.ts` § `OrderEvent` — `{ fromStatus, toStatus,
  actor: string | null, reason, createdAt }`. The only source for D-10's duration (and the reason
  D-09 cuts handled-by).
- Call path: `client.kitchen.orders.get({ path: { id } })` — namespaced under `kitchen`, but **not
  kitchen-scoped** at the URL level.

### Production code to follow
- `src/use-order-detail.js` — **reuse unchanged (D-01).** Key `['order', id]`, `staleTime: 0`,
  `enabled: !!client && !!id`, throws on `result.error`, returns `normalizeOrder(result.data.order)`.
- `src/data.jsx` § `normalizeOrder()` — **already maps the entire `Order` shape**: `items[].mods` from
  `selectedOptions[].optionName`, `address` from the six `delivery*` fields, `customer.phone`, and
  **converts money from cents** (`cRON`). This is why the phase is mostly a data swap.
- `src/screen-detail.jsx` — the surface. `readOnly` gates already at lines 59, 99, 106, 228, 240, 256.
  ⚠ **line 131 ("Modify") is ungated** — the folded fix. Items render at 123–131; totals at 157–183.
- `src/use-sse.js:94` — `setQueryData(['order', orderId], …)`, the write D-02 accepts.
- `src/app.jsx:48,70` — `selectedOrderId` + `useOrderDetail` precedent for D-04's sibling call.
  `:241` live detail route; `:243-245` the `history-detail` route to hydrate; `:196-198` the
  rehydrate backstop (already handles `historyOrder: null`).
- `src/store.js:54,66,75` — `historyOrder` (session-only, not persisted), `setScreen` clears it,
  `openHistoryOrder(order)` stores the **whole summary object** (which D-03 merges onto).
- `src/i18n.jsx:241,468` — `h_back_to_history` already exists in `ro`/`en`. New keys for the error
  message and the two duration labels go here. ⚠ **Check for pre-existing keys before adding** — v1.0
  hit duplicate-key issues twice.
- `src/__tests__/app-history-route.test.jsx:22` — already mocks `useOrderDetail`; this test will need
  updating once the history route calls it too.

### Design source
- `sitecare-orders/project/screenshots/history-expanded.png` — ⚠ **superseded by `P7 D-07`, do not
  implement.** The inline expandable receipt is dropped permanently; this detail view replaces it.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`useOrderDetail(id)`** — the entire data layer for this phase, reused verbatim (D-01).
- **`normalizeOrder()`** — maps `Order` → the shape `screen-detail.jsx` already renders (items, mods,
  address, subtotal, deliveryFee, total, customer.phone). **Money arrives in cents**; `cRON` divides
  by 100. Nothing new to write here.
- **`screen-detail.jsx`'s existing render** — items, modifiers, address, and the totals block already
  exist and already work off `normalizeOrder`'s output. They light up the moment real data arrives.
- **`history-utils.js` (Phase 7)** — the refunded-wins display-status derivation D-05 reuses.
- **Toast stack, `card`, `chip-*`, `btn-secondary` CSS utilities** — all exist.

### Established Patterns
- **TanStack Query owns server state; Zustand owns UI state.** `historyOrder` in the store is UI
  routing state carrying a summary payload — the *server* truth comes from the query cache.
- **SDK `responseStyle: 'fields'`** — check `result.error`, then unwrap `result.data`. Never
  `try/catch` the call itself.
- **Greyed-out convention** — unready features stay visible, disabled, not clickable. Note the folded
  fix takes the *opposite* approach: "Modify" is **hidden** under `readOnly` (matching how Phase 7
  gated advance/cancel), not greyed — it isn't an unready feature, it's an inapplicable one.
- **i18n** — every user-facing string in `src/i18n.jsx` under both `ro` and `en`.
- **ES modules only; no `window.*` globals.**

### Integration Points
- **`src/app.jsx`** — the one file that changes structurally: a second `useOrderDetail` call above the
  conditional returns, the merge, and the props passed at `:243-245`.
- **`src/screen-detail.jsx`** — gate line 131; add the duration row; add skeleton + inline-error
  states for the items card.
- **`src/i18n.jsx`** — error copy + two duration labels, `ro` and `en`.
- **`src/__tests__/app-history-route.test.jsx`** — its `useOrderDetail` mock now covers a second
  caller.

</code_context>

<specifics>
## Specific Ideas

- **"One order, one truth"** — the user's framing for accepting the shared `['order', id]` cache
  (D-02). A late SSE write to a finished order is treated as reality catching up, not as contamination
  of an archive. Consistent with Phase 7's `P7 D-15` instinct: **fewer data sources, no defensive
  duplication**.
- **Reuse over purity, twice.** Given three options for both the hook (D-01) and the merge site
  (D-04), the user took the one that writes the least new code — accepting a shared cache entry and a
  narrow, documented departure from CLAUDE.md's "screens call their own data hooks." Same instinct as
  `P7 D-09` (reuse `screen-detail.jsx` rather than build a read-only twin).
- **Honesty over completeness.** Offered a plausible derivation for handled-by, the user **cut the
  field entirely** rather than risk attributing an order to the wrong staff member — even though it
  costs a promised success criterion. But where the data *is* trustworthy (event timestamps), the user
  chose the **richer derived** answer (actual duration) over the easy typed field
  (`estimatedMinutes`). The rule isn't "prefer the simple field" — it's **"only show what the data can
  actually support."**

</specifics>

<deferred>
## Deferred Ideas

- **`estimatedMinutes` (the accept-time estimate)** — rejected under D-10 in favour of actual
  duration. Revisit only if staff ask to compare promised vs actual prep time.
- **Estimate-vs-actual side by side** — considered under D-10, rejected as doubling the new rendering
  in an otherwise data-swap phase.
- **Status-specific error copy (404 / 401 / network)** — considered under D-08, rejected as
  near-impossible cases already covered by the auth layer. Would require modifying `useOrderDetail`
  to preserve the HTTP status, which D-01 locks as unchanged.
- **A history-scoped query key / longer `staleTime` for archived orders** — considered under D-01.
  Revisit only if the refetch-on-every-open proves visible or costly.
- **Snapshotting the order against SSE writes** — considered and rejected under D-02.
- **Reprint from this view** — Phase 11 (HIST-11), explicitly out of scope. ⚠ See D-02's note: it may
  reprint post-SSE data.
- **Reconsidering the "Modify" button on the *live* detail route** — out of scope; this phase only
  gates it under `readOnly`.
- **The notes/payment card hidden under `readOnly` (`screen-detail.jsx:106`)** — Phase 7 hides the
  whole card, which also hides the payment-type chip. Not raised as a problem; note it exists if a
  future phase wants payment method visible on a historical receipt.

</deferred>

---

*Phase: 8-Read-Only Order Detail View*
*Context gathered: 2026-07-17*
