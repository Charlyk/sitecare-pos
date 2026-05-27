# Requirements: SiteCare POS — v1.1 Orders History Screen

**Milestone:** v1.1
**Created:** 2026-05-27

---

## v1.1 Requirements

> **SDK dependency:** All history requirements depend on @charlyk/admin-client v2 API
> shipping before implementation begins. The v2 API adds:
> - Paginated admin orders list with server-side filtering (date range, status, order type, text search)
> - CSV export endpoint that accepts the same filter params and returns a CSV for all matching orders

### HIST — History Screen

- [ ] **HIST-01**: User can navigate to a History screen via a dedicated sidebar item (same level as Orders, KDS, POS)
- [ ] **HIST-02**: History screen calls the v2 admin orders endpoint with server-side params: date range, status, order type, and search query
- [ ] **HIST-03**: History screen defaults to the current week (Monday–today) on first open
- [ ] **HIST-04**: User can change the date range (from / to) to load orders for any past period
- [ ] **HIST-05**: User can see a paginated list of orders for the selected filters, sorted newest first
- [ ] **HIST-06**: User can filter history by order status (All / Completed / Cancelled) — sent as server query param
- [ ] **HIST-07**: User can filter history by order type (All / Dine-in / Pickup / Delivery) — sent as server query param
- [ ] **HIST-08**: User can search by customer name or phone number — debounced text input sent as server query param
- [ ] **HIST-09**: User can click any order in the list to see a read-only detail panel with full items, delivery address, and notes
- [ ] **HIST-10**: User can reprint a receipt for any historical order from the detail panel (greyed-out if printer not configured)
- [ ] **HIST-11**: User can export the current filtered results as a CSV file via a native Save dialog — CSV is generated server-side and returned by the v2 API

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

- Client-side filtering / search — v2 SDK handles all filtering server-side
- Client-side CSV generation — v2 SDK returns CSV directly; no client-side generation
- PDF export for v1.1 — adds significant dependency; defer
- Status mutations on historical orders — orders in COMPLETED/CANCELLED are final
- "Today's summary" stats panel on History screen — not requested
- Infinite scroll — pagination (page/cursor) is the model; explicit page controls
- Server-side pagination library — handled by the v2 SDK wrapper and TanStack Query

---

## Traceability

| REQ-ID | Phase | Plan | Status |
|--------|-------|------|--------|
| HIST-01 | — | — | Pending |
| HIST-02 | — | — | Pending |
| HIST-03 | — | — | Pending |
| HIST-04 | — | — | Pending |
| HIST-05 | — | — | Pending |
| HIST-06 | — | — | Pending |
| HIST-07 | — | — | Pending |
| HIST-08 | — | — | Pending |
| HIST-09 | — | — | Pending |
| HIST-10 | — | — | Pending |
| HIST-11 | — | — | Pending |

---

*Created: 2026-05-27 — v1.1 milestone; 11 requirements*
