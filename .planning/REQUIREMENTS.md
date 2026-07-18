# Requirements: SiteCare POS — v1.1 Orders History Screen

**Milestone:** v1.1
**Created:** 2026-05-27
**Replanned:** 2026-07-16 — new design handoff (`sitecare-orders/`) + SDK bump to v1.1.59

---

## v1.1 Requirements

> **Design source:** `sitecare-orders/project/src/screen-history.jsx` + `screenshots/desktop-history.png`,
> `history-expanded.png`, `order-history.png`. This design supersedes the 2026-05-27 requirements,
> which assumed a paginated list with a side detail panel and no summary strip.
>
> **SDK dependency:** @charlyk/admin-client v1.1.59. Verified against the installed type definitions:
> - `listAdminOrders({ from, to })` → `{ orders: AdminOrder[] }` — date range only; **no server-side
>   pagination, filtering, or search**. All filtering is client-side on the returned array.
> - `getOrder(id)` → full `Order` with `items[]` (name, qty, `selectedOptions` as mods, `itemSubtotal`),
>   `subtotal`, `deliveryFee`, `total`, `notes`, delivery address fields, and `events[]`.
> - `events[]` (`OrderEvent`) carries `actor`, `reason`, `toStatus`, `createdAt` — the only source for
>   handled-by, cancel reason, real close time, and prep duration.
> - `getAdminDashboard({ from, to })` → `totalEarned`, `totalOrders`, `dailyStats`, `topProducts` — NEW in
>   this SDK range; **not used** — D-15 drops it permanently. The summary strip is computed client-side
>   from the same `listAdminOrders` result that backs the rows, so tiles and day headers agree by
>   construction. (Its numbers would contradict a finished-only list anyway.)
> - `paymentCaptureStatus: 'refunded'` — NEW; makes Refunded a first-class status filter.
> - No export endpoint — CSV is generated client-side from the fetched and filtered array.

### HIST — History Screen

- [x] **HIST-01**: User can navigate to a History screen via a dedicated sidebar item (same level as Orders, KDS, POS)
- [x] **HIST-02**: History screen loads orders via `listAdminOrders({ from, to })`; all status, type, and search filtering is applied client-side on the returned array
- [x] **HIST-03**: History screen defaults to the last 30 days on first open
- [x] **HIST-04**: User can switch the period via presets — Today / 7 days / 30 days / custom range — and the list reloads for the new range
- [x] **HIST-05**: User can see orders grouped by calendar day, newest first, each day header showing that day's order count and revenue subtotal
- [x] **HIST-06**: User can see a summary strip for the selected period — orders, revenue, and average order value computed client-side from the same fetched list that backs the rows (D-15 — `getAdminDashboard` is not used); the refunds tile shows count only
- [x] **HIST-07**: User can filter by status — All / Completed / Refunded / Canceled — each showing a live count
- [x] **HIST-08**: User can filter by order type — All / Delivery / Pickup / Dine-in (`orderType: 'local'` maps to Dine-in)
- [x] **HIST-09**: User can search by order number or customer name — debounced text input, filtered client-side
- [x] **HIST-10**: User can click any row to open a read-only detail view (reusing `screen-detail.jsx` in `readOnly` mode — D-07, D-09) showing items with modifiers, subtotal, delivery fee, total, customer phone, delivery address, and prep time — hydrated on demand via `getOrder(id)`
  - **F-01 (planner finding):** `08-RESEARCH.md` and `08-CONTEXT.md` both assert the `AdminOrder` summary reaches `screen-detail.jsx` with a null `items` value. This is false and was verified false by executing `normalizeOrder` against an `AdminOrder`-shaped object: `normalizeOrder` maps `items: (o.items ?? []).map(...)`, which returns an empty array, never null, and `use-history-orders.js` runs every summary through `normalizeOrder`. Consequences: (1) the ungated Modify control is reachable on the `history-detail` route in production today — a live defect, not one this phase introduces; (2) the minimal-totals-card fallback at `screen-detail.jsx:191-204` is unreachable on both routes; (3) the pre-hydration state is an empty receipt, not an absent one, so loading must be distinguished from a genuinely empty order by query state rather than by the items value.
- [ ] **HIST-11**: User can reprint a receipt from the read-only detail view (greyed-out when no printer is configured)
- [ ] **HIST-12**: User can export the current filtered results as a CSV file via a native Save dialog — generated client-side
- [x] **HIST-13**: User sees a clear empty state when no orders match the active filters

---

## Design Elements Cut (no API data source)

Recorded so the divergence from `screen-history.jsx` is deliberate and reviewable, not drift.
Revisit if the API adds these fields.

| Design element | Why cut |
|---|---|
| Tax line in receipt | No `tax` field on `Order` or `AdminOrder` anywhere in the SDK |
| Tip line in receipt | No `tip` field in the SDK |
| Refund amount + refund reason | Only `paymentCaptureStatus: 'refunded'` exists — a flag, no amount or reason |
| Source sub-label (order channel) | No channel field. `OrderItem.source` is `menu_item`/`global_product` — unrelated to the design's `sourceMeta` |
| Items-count column (collapsed row) | `AdminOrder` has no `items[]`; showing it would force a `getOrder` per row (N+1) |
| Address subtitle (collapsed row) | `AdminOrder` has no address fields |
| Table number | No table field in the SDK |
| Refund total in summary tile | No refund aggregate is available; count is derived client-side (D-15 drops `getAdminDashboard` entirely) |
| `HistoryReceiptRow` (inline expandable receipt) + `screenshots/history-expanded.png` | **User-instructed divergence, not an API gap (D-07).** Rows navigate to a read-only detail view instead; the inline expandable receipt is dropped permanently. The design-fidelity rule in CLAUDE.md requires explicit instruction to break — this is it. Confirmed while looking directly at the tradeoffs and accepted. |
| Handled-by field on the detail view | `Order` has no such field; it exists only as `events[].actor`, typed `string \| null` with undocumented semantics. Deriving it risks misattributing an order to the wrong staff member (D-09). |

---

## Future Requirements (deferred)

- Owner dashboard screen with charts (`design_handoff_owner_dashboard/`) — designed, not scoped to v1.1
- Mobile app screens (`mobile-screens.jsx`, `mobile-app.html`) — desktop-only milestone
- Forgot-password flow (`forgot-password.html`) — designed, not scoped to v1.1
- PDF export — defer to v1.2; CSV covers the accounting use case
- Windows code signing (BILD-03) — Azure Trusted Signing; deferred from v1.0
- Thermal printer hardware validation — approved-no-hardware in v1.0; real-device test needed
- Tax / tip display — blocked on API fields; confirm with SiteCare
- Refund amount + reason display — blocked on API fields
- History filter state persisted across navigation — reset on leave is acceptable for v1.1

---

## Out of Scope

- Server-side filtering / search / pagination — SDK returns the full result set for a date range
- Server-side CSV generation — no export endpoint in the API
- Status mutations on historical orders — orders in COMPLETED/CANCELLED are final
- Pagination controls — the design is a day-grouped scroll; there is no pagination in it
- Infinite scroll — not in the design
- Inline expandable receipt row — superseded by the read-only detail view (D-07 reversal, 2026-07-17); `screen-detail.jsx` IS reused in `readOnly` mode
- `getAdminDashboard({from,to})` as a summary-strip source — dropped permanently (D-15); the strip is computed client-side from the fetched list
- Any non-History screen from the new design bundle (dashboard, mobile, forgot-password)

---

## Traceability

| REQ-ID | Phase | Plan | Status |
|--------|-------|------|--------|
| HIST-01 | Phase 7 | 07-02 | Complete |
| HIST-02 | Phase 7 | 07-03 | Complete |
| HIST-03 | Phase 7 | 07-03 | Complete |
| HIST-04 | Phase 9 | 09-01 – 09-05 | Complete (09-01..09-05) |
| HIST-05 | Phase 7 | 07-01, 07-04 | Complete |
| HIST-06 | Phase 7 | 07-04 | Complete |
| HIST-07 | Phase 10 | TBD | Complete |
| HIST-08 | Phase 10 | TBD | Complete |
| HIST-09 | Phase 10 | TBD | Complete |
| HIST-10 | Phase 8 | 08-01..08-05 | Complete (08-01..08-05) |
| HIST-11 | Phase 11 | 11-02, 11-03 | Pending |
| HIST-12 | Phase 11 | 11-01, 11-02, 11-04 | Pending |
| HIST-13 | Phase 7 | 07-04 | Complete |

---

*Created: 2026-05-27 — v1.1 milestone; 11 requirements*
*Updated: 2026-07-17 — restructured per 07-CONTEXT.md `<roadmap_impact>` (D-07, D-15): HIST-06 and HIST-10 rewritten; HIST-06 reassigned to Phase 7 (client-computed strip shipped in 07-04); HIST-10 → new Phase 8; HIST-07/08/09 → Phase 10; HIST-11/12 → Phase 11*
*Replanned: 2026-07-16 — new design handoff + SDK v1.1.59; 13 requirements mapped to Phases 7–10*
