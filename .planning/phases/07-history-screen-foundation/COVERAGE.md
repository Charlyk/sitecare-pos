# API Coverage — @charlyk/admin-client v1.1.59 (order-history retrieval)

> Full coverage by default. Opt-outs are explicit, reasoned decisions.
> Scope: the capability surface relevant to Phase 7's need — retrieving and presenting order history.
> Surface enumerated by direct inspection of `node_modules/@charlyk/admin-client/dist/index.d.ts`
> (`AdminOrder` :261, `AdminOrderListResponse` :285, `ListAdminOrdersData` :3180, client surface :4893).

## Endpoints / operations

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

## `AdminOrder` fields (response shape)

| capability | decision | reason |
|---|---|---|
| `id` | INTEGRATE | UUID; D-05 short-slice fallback for the Order column, and the row → detail route key |
| `status` | INTEGRATE | D-01 finished-order filter, D-02 display-status derivation |
| `paymentCaptureStatus` | INTEGRATE | D-02 — `'refunded'` wins over `status: COMPLETED` |
| `orderType` | INTEGRATE | Type column via `typeMeta()`; `'local'` → Dine-in |
| `customerName` | INTEGRATE | Customer column |
| `customerPhone` | INTEGRATE | read-only detail route only (not a table column — D-06) |
| `dailyNumber` | INTEGRATE | D-05 — requires the `normalizeOrder()` fallback-chain extension (Plan 01) |
| `total` | INTEGRATE | Total column, day-header revenue, summary strip |
| `createdAt` | INTEGRATE | Time column, D-04 local-day grouping |
| `paymentType` | INTEGRATE | Payment column |
| `currency` | OPT-OUT | not needed — single-currency deployment (RON); `formatRON` is hardcoded to `ro-RO` + " lei" across the shipped app |
| `estimatedMinutes` | OPT-OUT | not needed — a live-order prep estimate has no meaning on a finished archived order |
| `discountAmount` / `discountType` | OPT-OUT | not needed — D-06 cuts every column except the seven listed; `normalizeOrder()` consumes them incidentally but History renders no discount line |
| `paymentWarning` | OPT-OUT | not needed yet — no UI-SPEC surface renders it in Phase 7; candidate for the detail-view phase, tracked for follow-up |

## Baseline note

A future integration against this same need (order-history retrieval) starts from the **same
full-coverage baseline** — none of the opt-outs above carry over silently. In particular
`getOrder(id)` and `paymentWarning` are `not needed yet`, not `never`.

---

## Addendum — Edge-probe accounting (spec-less fallback)

Phase 7 has no plain `SPEC.md`, so `## Edge Coverage` and `## Prohibitions` were authored by the
spec-less probe fallback rather than lifted from a SPEC. The deterministic edge probe surfaced
**13 applicable edges, all `unresolved`** at probe time. This table is the audit record showing
where each one landed — the no-silent-drop equality check is
`13 = 9 covered + 2 backstop + 2 flagged`.

| requirement | category | disposition | where (verified against plan files) |
|---|---|---|---|
| HIST-01 | adjacency | covered | `07-02-PLAN.md:24` |
| HIST-01 | empty | covered | `07-02-PLAN.md:26` |
| HIST-01 | ordering | covered | `07-02-PLAN.md:28` |
| HIST-02 | empty | covered | `07-03-PLAN.md:22` |
| HIST-02 | ordering | covered | `07-03-PLAN.md:24` |
| HIST-02 | adjacency | **backstop** | `07-03-PLAN.md:26` — `{ statement, verification: backstop }` |
| HIST-03 | **unclassified** | **flagged assumption** | see A-1 below — *no plan tag by design* |
| HIST-05 | boundary | covered | `07-01-PLAN.md:23` |
| HIST-05 | adjacency | covered | `07-01-PLAN.md:25` |
| HIST-05 | empty | covered | `07-01-PLAN.md:27` |
| HIST-05 | ordering | covered | `07-01-PLAN.md:29` |
| HIST-05 | precision | **backstop** | `07-01-PLAN.md:31` — the cents-vs-RON unit question; a mocked test would encode the assumption, not verify it |
| HIST-13 | **unclassified** | **flagged assumption** | see A-2 below — *no plan tag by design* |

**Why the two `unclassified` rows are flagged, not backstopped.** The fallback protocol forbids
auto-backstopping an `unclassified` row — inventing a criterion for one is worse than recording the
gap. Both requirements ARE functionally covered by ordinary (non-edge-probe) `truths`; what is
flagged is the *edge*, not the requirement.

- **A-1 — HIST-03 / unclassified.** The 30-day window's inclusivity (29 days back + today) and its
  DST-transition behavior. Implemented per D-04 and exercised by unit tests (the window's own edges
  are the separate, `covered` HIST-05/boundary predicate), but the DST edge is unverified against a
  live Europe/Bucharest terminal. Inherited RESEARCH A1 rider: day-boundary correctness assumes the
  terminal's OS timezone is Europe/Bucharest — a deployment concern outside this phase's code.
  Routed to the `07-06-PLAN.md` Task 3 checkpoint.
- **A-2 — HIST-13 / unclassified.** Distinguishing "no orders in period" from "no orders match
  filters". Not actionable in Phase 7 — filters land in a later phase, and D-13 deliberately ships a
  single empty-state variant. Revisit when filters exist.

**Related deferrals.** The two live-API open questions (server `from`/`to` boundary interpretation;
`AdminOrder.total` cents-vs-RON) are recorded in `07-RESEARCH.md` → *Open Questions (DEFERRED)* and
`07-VALIDATION.md` → *Manual-Only Verifications*, and route to the same blocking human checkpoint.
They are deliberately NOT asserted by mocked unit tests, which would encode the assumption rather
than verify it.
