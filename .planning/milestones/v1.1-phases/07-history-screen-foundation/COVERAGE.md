# API Coverage — @charlyk/admin-client v1.1.59 (order-history retrieval)

> Full coverage by default. Opt-outs are explicit, reasoned decisions.
> Scope: the capability surface relevant to Phase 7's need — retrieving and presenting order history.
> Surface enumerated by direct inspection of `node_modules/@charlyk/admin-client/dist/index.d.ts`
> (`AdminOrder` :261, `AdminOrderListResponse` :285, `ListAdminOrdersData` :3180, client surface :4893).

## Capability matrix

Single table by format contract — the matrix parser recognizes one `| capability | decision | reason |`
header per file. Rows are grouped in reading order: **endpoints / operations** first (13 rows), then
**`AdminOrder` fields / response shape** (14 rows).

| capability | decision | reason |
|---|---|---|
| `admin.orders.list({ query: { from, to } })` (`GET /v1/admin/orders`) | INTEGRATE | |
| `query.from` (ISO 8601) | INTEGRATE | |
| `query.to` (ISO 8601) | INTEGRATE | |
| `400 Invalid date format` error branch | INTEGRATE | surfaced through the shared `result.error` → error-state path (D-16) |
| `admin.dashboard.get({ from, to })` (`getAdminDashboard`) | OPT-OUT | explicitly out of scope — D-15 reversal drops this endpoint permanently; the summary strip is client-computed from the same fetched list so tiles and day headers agree by construction |
| `admin.dashboard.getToday()` | OPT-OUT | not needed — already integrated by `use-stats.js` for the Orders screen; History does not consume it |
| `kitchen.orders.get({ path: { id } })` (`getOrder(id)`) | OPT-OUT | not needed yet — D-08 defers the itemised receipt (items/address/prep) to the new detail-view phase; Phase 7 renders only `AdminOrder` fields already in hand |
| server-side pagination | OPT-OUT | not offered — `ListAdminOrdersData.query` is `{ from?, to? }` only; no page/limit/cursor params exist |
| server-side status filtering | OPT-OUT | not offered — no `status` query param; HIST-02 mandates client-side filtering (D-01) |
| server-side order-type filtering | OPT-OUT | not offered — no `orderType` query param; client-side, deferred to Phase 10 (Filters + Search) |
| server-side search | OPT-OUT | not offered — no `q`/`search` param; client-side, deferred to Phase 10 |
| server-side sort/ordering | OPT-OUT | not offered — no sort param and no documented array-order guarantee; D-12 imposes ordering client-side |
| server-side CSV/PDF export endpoint | OPT-OUT | not offered — no export operation on the admin surface; CSV is generated client-side in Phase 11, PDF deferred to v1.2 |
| `AdminOrder.id` | INTEGRATE | UUID; D-05 short-slice fallback for the Order column, and the row → detail route key |
| `AdminOrder.status` | INTEGRATE | D-01 finished-order filter, D-02 display-status derivation |
| `AdminOrder.paymentCaptureStatus` | INTEGRATE | D-02 — `'refunded'` wins over `status: COMPLETED` |
| `AdminOrder.orderType` | INTEGRATE | Type column via `typeMeta()`; `'local'` → Dine-in |
| `AdminOrder.customerName` | INTEGRATE | Customer column |
| `AdminOrder.customerPhone` | INTEGRATE | read-only detail route only (not a table column — D-06) |
| `AdminOrder.dailyNumber` | INTEGRATE | D-05 — requires the `normalizeOrder()` fallback-chain extension (Plan 01) |
| `AdminOrder.total` | INTEGRATE | Total column, day-header revenue, summary strip |
| `AdminOrder.createdAt` | INTEGRATE | Time column, D-04 local-day grouping |
| `AdminOrder.paymentType` | INTEGRATE | Payment column |
| `AdminOrder.currency` | OPT-OUT | not needed — single-currency deployment (RON); `formatRON` is hardcoded to `ro-RO` + " lei" across the shipped app |
| `AdminOrder.estimatedMinutes` | OPT-OUT | not needed — a live-order prep estimate has no meaning on a finished archived order |
| `AdminOrder.discountAmount` / `discountType` | OPT-OUT | not needed — D-06 cuts every column except the seven listed; `normalizeOrder()` consumes them incidentally but History renders no discount line |
| `AdminOrder.paymentWarning` | OPT-OUT | not needed yet — no UI-SPEC surface renders it in Phase 7; candidate for the detail-view phase, tracked for follow-up |

## Baseline note

A future integration against this same need (order-history retrieval) starts from the **same
full-coverage baseline** — none of the opt-outs above carry over silently. In particular
`getOrder(id)` and `paymentWarning` are `not needed yet`, not `never`.

## Addendum — Edge-probe accounting (spec-less fallback)

Moved to **`07-EDGE-PROBE.md`** — it is an edge-probe audit record with its own schema
(`requirement | category | disposition | where`), not part of the API capability surface. It was
split out so the matrix parser reads only the capability table above; content is unchanged.
