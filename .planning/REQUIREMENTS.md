# Requirements: SiteCare POS — v1.1 Orders History Screen

**Milestone:** v1.1
**Created:** 2026-05-27

---

## v1.1 Requirements

> **SDK dependency:** All history requirements depend on @charlyk/admin-client (existing v1 API).
> Research confirmed the current API provides:
> - `admin.orders.list({ from, to })` — returns full AdminOrder[] for the date range (no server-side pagination or filtering)
> - `orders.get(id)` — returns full Order with items, address, notes (required for detail view)
> - No export endpoint — CSV is generated client-side from the fetched array

### HIST — History Screen

- [ ] **HIST-01**: User can navigate to a History screen via a dedicated sidebar item (same level as Orders, KDS, POS)
- [ ] **HIST-02**: History screen calls the admin orders list endpoint with a date range; all status, type, and search filtering is applied client-side on the returned array
- [ ] **HIST-03**: History screen defaults to the current week (Monday–today) on first open
- [ ] **HIST-04**: User can change the date range (from / to) to load orders for any past period
- [ ] **HIST-05**: User can see a paginated list of orders for the selected filters, sorted newest first
- [ ] **HIST-06**: User can filter history by order status (All / Completed / Cancelled) — applied client-side
- [ ] **HIST-07**: User can filter history by order type (All / Dine-in / Pickup / Delivery) — applied client-side
- [ ] **HIST-08**: User can search by customer name or phone number — debounced text input filtered client-side
- [ ] **HIST-09**: User can click any order in the list to see a read-only detail panel with full items, delivery address, and notes
- [ ] **HIST-10**: User can reprint a receipt for any historical order from the detail panel (greyed-out if printer not configured)
- [ ] **HIST-11**: User can export the current filtered results as a CSV file via a native Save dialog — CSV is generated client-side from the fetched and filtered array

---

## Future Requirements (deferred)

- PDF export — defer to v1.2; CSV covers the accounting use case for v1.1
- Windows code signing (BILD-03) — Azure Trusted Signing; deferred from v1.0
- Thermal printer hardware validation — approved-no-hardware in v1.0; real-device test needed
- Tax display (Romanian VAT 5%/9%/19%) — confirm with SiteCare before adding
- History filter state persisted across navigation — reset on leave is acceptable for v1.1
- Bulk actions on historical orders — read-only in v1.1; no mutations on completed orders

---

## Out of Scope

- Server-side filtering / search — current SDK API returns full result set; all filtering is client-side
- Server-side CSV generation — no export endpoint in v1 API; CSV generated client-side
- PDF export for v1.1 — adds significant dependency; defer
- Status mutations on historical orders — orders in COMPLETED/CANCELLED are final
- "Today's summary" stats panel on History screen — not requested
- Infinite scroll — explicit page controls; pagination is client-side on the fetched array
- Server-side pagination library — not applicable; full array returned by API

---

## Traceability

| REQ-ID | Phase | Plan | Status |
|--------|-------|------|--------|
| HIST-01 | Phase 7 | — | Pending |
| HIST-02 | Phase 7 | — | Pending |
| HIST-03 | Phase 7 | — | Pending |
| HIST-04 | Phase 8 | — | Pending |
| HIST-05 | Phase 8 | — | Pending |
| HIST-06 | Phase 8 | — | Pending |
| HIST-07 | Phase 8 | — | Pending |
| HIST-08 | Phase 8 | — | Pending |
| HIST-09 | Phase 9 | — | Pending |
| HIST-10 | Phase 9 | — | Pending |
| HIST-11 | Phase 9 | — | Pending |

---

*Created: 2026-05-27 — v1.1 milestone; 11 requirements*
*Updated: 2026-05-27 — traceability filled in; Phases 7–9 assigned*
