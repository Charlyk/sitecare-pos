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
>   this SDK range; backs the summary strip.
> - `paymentCaptureStatus: 'refunded'` — NEW; makes Refunded a first-class status filter.
> - No export endpoint — CSV is generated client-side from the fetched and filtered array.

### HIST — History Screen

- [ ] **HIST-01**: User can navigate to a History screen via a dedicated sidebar item (same level as Orders, KDS, POS)
- [ ] **HIST-02**: History screen loads orders via `listAdminOrders({ from, to })`; all status, type, and search filtering is applied client-side on the returned array
- [ ] **HIST-03**: History screen defaults to the last 30 days on first open
- [ ] **HIST-04**: User can switch the period via presets — Today / 7 days / 30 days / custom range — and the list reloads for the new range
- [ ] **HIST-05**: User can see orders grouped by calendar day, newest first, each day header showing that day's order count and revenue subtotal
- [ ] **HIST-06**: User can see a summary strip for the selected period — orders, revenue, and average order value from `getAdminDashboard`; the refunds tile shows count only
- [ ] **HIST-07**: User can filter by status — All / Completed / Refunded / Canceled — each showing a live count
- [ ] **HIST-08**: User can filter by order type — All / Delivery / Pickup / Dine-in (`orderType: 'local'` maps to Dine-in)
- [ ] **HIST-09**: User can search by order number or customer name — debounced text input, filtered client-side
- [ ] **HIST-10**: User can click any row to expand an inline read-only receipt showing items with modifiers, subtotal, delivery fee, total, customer phone, delivery address, handled-by, and prep time — fetched on demand via `getOrder(id)`
- [ ] **HIST-11**: User can reprint a receipt from the expanded row (greyed-out when no printer is configured)
- [ ] **HIST-12**: User can export the current filtered results as a CSV file via a native Save dialog — generated client-side
- [ ] **HIST-13**: User sees a clear empty state when no orders match the active filters

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
| Refund total in summary tile | `getAdminDashboard` returns no refund aggregate; count is derived client-side |

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
- Side detail panel — superseded by the inline expandable receipt row
- Any non-History screen from the new design bundle (dashboard, mobile, forgot-password)

---

## Traceability

| REQ-ID | Phase | Plan | Status |
|--------|-------|------|--------|
| HIST-01 | Phase 7 | TBD | Pending |
| HIST-02 | Phase 7 | TBD | Pending |
| HIST-03 | Phase 7 | TBD | Pending |
| HIST-04 | Phase 8 | TBD | Pending |
| HIST-05 | Phase 7 | TBD | Pending |
| HIST-06 | Phase 8 | TBD | Pending |
| HIST-07 | Phase 9 | TBD | Pending |
| HIST-08 | Phase 9 | TBD | Pending |
| HIST-09 | Phase 9 | TBD | Pending |
| HIST-10 | Phase 10 | TBD | Pending |
| HIST-11 | Phase 10 | TBD | Pending |
| HIST-12 | Phase 10 | TBD | Pending |
| HIST-13 | Phase 7 | TBD | Pending |

---

*Created: 2026-05-27 — v1.1 milestone; 11 requirements*
*Replanned: 2026-07-16 — new design handoff + SDK v1.1.59; 13 requirements mapped to Phases 7–10*
