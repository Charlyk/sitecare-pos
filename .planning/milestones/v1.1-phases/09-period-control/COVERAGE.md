# API Coverage — @charlyk/admin-client v1.1.59 (order-history retrieval, retargeted)

> Full coverage by default. Opt-outs are explicit, reasoned decisions.
> Scope: the capability surface relevant to Phase 9's need — retrieving order history for an
> arbitrary, staff-chosen date range.
> Surface re-enumerated by direct inspection of `node_modules/@charlyk/admin-client/dist/index.d.ts`
> (`ListAdminOrdersData` — `query` is `{ from?: string, to?: string }` only; `/v1/admin/orders`).

**Baseline restart (per the full-coverage rule):** this matrix does **not** inherit
`07-COVERAGE.md`'s opt-outs. Every capability below was re-decided from a full-coverage default for
Phase 9's need. Rows that re-affirm a Phase 7 opt-out say so explicitly rather than being carried
over silently.

## Capability matrix

| capability | decision | reason |
|---|---|---|
| `admin.orders.list({ query: { from, to } })` (`GET /v1/admin/orders`) | INTEGRATE | |
| `query.from` (ISO 8601) — now staff-chosen, not frozen at mount | INTEGRATE | |
| `query.to` (ISO 8601) — now staff-chosen, not frozen at mount | INTEGRATE | |
| `400 Invalid date format` error branch | INTEGRATE | surfaced through the same `result.error` → `ErrorBlock` path Phase 7 built (D-07 reuses it verbatim for a failed period switch) |
| `401` unauthenticated branch | INTEGRATE | unchanged — the existing auth-guarded client from Phase 2/3; this phase adds no new auth surface |
| server-side pagination | OPT-OUT | not offered — `ListAdminOrdersData.query` has no page/limit/cursor param. **Load-bearing for this phase:** its absence is the entire reason D-09/D-10's client-side 366-day span cap is the only bound on fetch size |
| server-side date-range validation / max-span enforcement | OPT-OUT | not offered — the SDK documents no bounds on `from`/`to`. The cap is enforced client-side twice (native `min`/`max` per D-11, plus a pure Apply-time validator) |
| server-side status filtering | OPT-OUT | not offered — no `status` query param; client-side filtering stays in `history-utils.js` (`filterFinishedOrders`), unchanged this phase |
| server-side order-type filtering | OPT-OUT | not offered — no `orderType` query param; deferred to Phase 10 (Filters + Search) |
| server-side search | OPT-OUT | not offered — no `q`/`search` param; deferred to Phase 10 |
| server-side sort/ordering | OPT-OUT | not offered — no sort param; `groupOrdersByDay` imposes ordering client-side (D-12), unchanged this phase |
| server-side CSV/PDF export endpoint | OPT-OUT | not offered — no export operation on the admin surface; CSV is client-side in Phase 11 |
| `admin.dashboard.get({ from, to })` (`getAdminDashboard`) | OPT-OUT | explicitly and permanently out of scope — `P7 D-15` dropped it; the summary strip is computed from the same fetched list, which is exactly why it retargets with the period for free (SC3). Re-affirmed from a full-coverage baseline, not carried over |
| `admin.dashboard.getToday()` | OPT-OUT | not needed — `use-stats.js` consumes it for the Orders screen; the "Today" period preset here is a `from`/`to` range against `admin.orders.list`, not a second endpoint (re-using `getToday()` would reintroduce exactly the two-data-source disagreement `P7 D-15` removed) |
| `kitchen.orders.get({ path: { id } })` (`getOrder(id)`) | OPT-OUT | not needed — already integrated by Phase 8 for the detail route; retargeting the period does not touch it |
| response `orders[]` array | INTEGRATE | mapped through `normalizeOrder`, unchanged |
| every `AdminOrder` field | INTEGRATE / OPT-OUT per `07-COVERAGE.md` | unchanged this phase — Phase 9 changes only which rows are fetched, never which fields are read. No field-level decision is reopened, and none is newly needed |

## Baseline note

A future integration against this same need (order-history retrieval for a range) starts from the
same full-coverage baseline. In particular, `server-side pagination` is `not offered`, not
`never wanted` — `09-CONTEXT.md`'s `<deferred>` records it as the one change that would remove the
need for a client-side span cap entirely.
