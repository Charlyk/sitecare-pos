# Phase 8: Read-Only Order Detail View - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-17
**Phase:** 8-Read-Only Order Detail View
**Areas discussed:** Hook reuse & cache key, Summary→detail merge, Loading & failure fallback, Prep time & handled-by

---

## Hook reuse & cache key

### Q1 — How should the history detail fetch its data?

| Option | Description | Selected |
|--------|-------------|----------|
| Reuse useOrderDetail as-is | Zero new data code. Key `['order', id]` is written by `use-sse.js:94`; `staleTime: 0` refetches on every mount/focus. | ✓ |
| Own hook, own key | `useHistoryOrderDetail` on `['history-order', id]`, long staleTime, SSE-proof. ~15 lines duplicated. | |
| Reuse the hook, tune the key | Optional scope/staleTime arg — one hook, two callers. | |

**User's choice:** Reuse `useOrderDetail` as-is → **D-01**
**Notes:** Scouting established the endpoint is `/v1/orders/{id}`, not kitchen-scoped despite the `client.kitchen.orders.get` namespacing, so archived orders resolve. Accepted consequence: an unchanging archived order refetches on every open.

### Q2 — How to treat the shared `['order', id]` cache entry?

| Option | Description | Selected |
|--------|-------------|----------|
| Accept — one order, one truth | Finished orders rarely emit events; a late refund quietly reflects reality. No guard code. | ✓ |
| Accept, but document it | Same behaviour, recorded as deliberate coupling. | |
| Guard the readOnly view | Snapshot on open; adds state, can show stale data. | |

**User's choice:** Accept — one order, one truth → **D-02**
**Notes:** Documented anyway in CONTEXT.md, including a forward-note that Phase 11's reprint may print post-SSE data.

---

## Summary→detail merge

### Q1 — How should the hydrated result combine with the stored summary?

| Option | Description | Selected |
|--------|-------------|----------|
| Merge, hydrated wins | `{...historyOrder, ...detail}` — nothing blanks; satisfies SC2. | ✓ |
| Hydrated replaces summary | Simpler model, but AdminOrder-only fields would vanish. | |
| Store only the id | Cleanest store, but blanks the screen while loading — contradicts SC2. | |

**User's choice:** Merge, hydrated wins → **D-03**
**Notes:** Safe because both sides are already `normalizeOrder`'d, so field names align.

### Q2 — Where should the getOrder call and merge live?

| Option | Description | Selected |
|--------|-------------|----------|
| In app.jsx at the route | Sibling to the existing `useOrderDetail(selectedOrderId)` on line 70; screen stays a pure presenter. | ✓ |
| Inside screen-detail | Matches CLAUDE.md's "screens call their own data hooks", but creates two data paths in one file. | |
| A small wrapper component | Thin app.jsx + pure screen, at the cost of one new file. | |

**User's choice:** In `app.jsx` at the route → **D-04**
**Notes:** A deliberate, narrow departure from CLAUDE.md's no-prop-drilling rule, justified by `screen-detail.jsx` serving two callers where only one fetches. Hook-ordering rule flagged: the call must sit above `App()`'s auth-guard returns.

### Q3 — How should a refunded order's status render in the detail?

| Option | Description | Selected |
|--------|-------------|----------|
| Reuse D-02's derived status | Apply Phase 7's `history-utils.js` derivation so chip matches the row. | ✓ |
| Leave as Completed | Raw FSM state; contradicts the row staff just clicked. | |
| Show both | Truest to the orthogonal fields, but P7 D-02 chose a single status slot. | |

**User's choice:** Reuse Phase 7's derived status → **D-05**
**Notes:** Surfaced during scouting — `screen-detail.jsx` reads `order.state`, which is `done` for a refunded order.

---

## Loading & failure fallback

### Q1 — What shows while getOrder is in flight?

| Option | Description | Selected |
|--------|-------------|----------|
| Skeleton rows in the receipt | Summary renders instantly; items card shows skeletons. Mirrors P7 D-16. No layout jump. | ✓ |
| Spinner in the items card | Simpler; card height jumps when items arrive. | |
| Render nothing until loaded | Least code; visible reflow. | |

**User's choice:** Skeleton rows → **D-06**

### Q2 — What shows when getOrder fails?

| Option | Description | Selected |
|--------|-------------|----------|
| Inline message + retry, summary intact | Items card replaced; summary stays. Satisfies SC2. | ✓ |
| Error replaces the whole screen | Clearer, but discards data already held — against SC2. | |
| Toast + keep summary | Least intrusive; easy to miss, no obvious retry. | |

**User's choice:** Inline message + retry → **D-07**

### Q3 — Should error copy distinguish 404 / 401 / network?

| Option | Description | Selected |
|--------|-------------|----------|
| One generic message + retry | Two i18n keys, no branching. | ✓ |
| Split 404 from the rest | More honest; ~4 keys and a status branch. | |
| Three-way split | Most precise; likely duplicates the app-wide auth layer. | |

**User's choice:** One generic message + retry → **D-08**
**Notes:** Self-consistent with D-01 — `useOrderDetail` throws `new Error(result.error.error)` and discards the HTTP status, so status-aware copy would require modifying the hook D-01 locks as unchanged. Also corrected the roadmap's "401/403": the SDK documents 401 and 404 only.

---

## Prep time & handled-by

### Q1 — How should handled-by be derived?

| Option | Description | Selected |
|--------|-------------|----------|
| Actor of the completing event | Who closed the order out. | |
| Actor of the accepting event | Who accepted it; may differ from who closed it. | |
| Cut it — no clean source | `actor` is `string | null`, undocumented; deriving risks misattribution. | ✓ |

**User's choice:** Cut it → **D-09**
**Notes:** Amends ROADMAP Phase 8 SC1 and HIST-10, both of which promise handled-by. Recorded in `<roadmap_impact>`.

### Q2 — What should prep time show?

| Option | Description | Selected |
|--------|-------------|----------|
| estimatedMinutes, as the estimate | Real typed field; no derivation. | |
| Actual duration from event timestamps | More useful for retrospection; timestamps are non-null and unambiguous. | ✓ |
| Both | Richest; doubles new rendering. | |

**User's choice:** Actual duration from event timestamps → **D-10**

### Q3 — How should duration behave for cancelled orders / missing events?

| Option | Description | Selected |
|--------|-------------|----------|
| Hide the row entirely | No misleading number, no placeholder. | |
| Show time-to-cancellation | Consistent "how long did this order live"; relabels the row. | ✓ |
| Show a dash | Layout stays identical; adds a row that says nothing. | |

**User's choice:** Show time-to-cancellation → **D-10**
**Notes:** Makes the row label dynamic — prep time when completed, "canceled after" when cancelled. Both need `ro`/`en` keys. The no-event-at-all case fell to Claude's discretion (hide the row).

---

## Claude's Discretion

- Behaviour when neither a COMPLETED nor CANCELLED event exists — hide the duration row (shouldn't occur; P7 D-01 makes History finished-only).
- Placement, copy, and format of the duration row.
- Skeleton row count in the loading state.
- Whether the ungated "Modify" button is reconsidered for the live route (out of scope — gate it, don't redesign it).

## Folded Fix (surfaced during scouting, not a discussion outcome)

- `screen-detail.jsx:131` renders a "Modify" button not gated by `readOnly` — reachable on the history route today, contradicting SC3. Folded into this phase, with instruction to sweep the file for other ungated controls rather than trust the single finding.

## Deferred Ideas

- `estimatedMinutes` (accept-time estimate) — rejected under D-10.
- Estimate-vs-actual side by side — rejected under D-10.
- Status-specific error copy — rejected under D-08.
- History-scoped query key / longer staleTime for archived orders — considered under D-01.
- Snapshotting the order against SSE writes — rejected under D-02.
- Reprint from this view — Phase 11 (HIST-11).
- Reconsidering "Modify" on the live detail route — out of scope.
- The notes/payment card hidden under `readOnly` (`screen-detail.jsx:106`), which also hides the payment-type chip — noted for a future phase.
