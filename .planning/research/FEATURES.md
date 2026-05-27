# Feature Landscape — v1.1 Orders History Screen

**Updated:** 2026-05-27

## SDK Capabilities (from @charlyk/admin-client inspection)

### `admin.orders.list({ query: { from, to } })` → `/v1/admin/orders`

Returns `AdminOrder[]` for a date range. Each `AdminOrder`:
```
id, status (string), orderType (string), customerName, customerPhone,
dailyNumber, estimatedMinutes, discountAmount, discountType,
total, paymentType, currency, createdAt
```
- **No server-side pagination** — full list returned for the date range
- **No server-side search/filter** — filtering by status/type/text is client-side
- Status values (from full `Order` type): NEW | ACCEPTED | PREPARING | READY | OUT_FOR_DELIVERY | COMPLETED | CANCELLED
- orderType values: delivery | pickup | local

### `orders.get({ path: { id } })` → `/v1/orders/{id}`

Returns full `Order` with items, events, delivery address, notes, subtotal, delivery fee, etc.
Use this for the detail panel when a staff member clicks a historical order.
AdminOrder does NOT contain items — always call getOrder for detail view.

## Feature Categories

### Table Stakes (must have for history screen to be useful)

- **Date range selector** — two native `<input type="date">` inputs; default = today
- **History list** — paginated display of AdminOrder[] filtered by selected range
- **Client-side status filter** — COMPLETED | CANCELLED | All
- **Client-side order type filter** — dine-in (local) | pickup | delivery | All
- **Client-side text search** — match on dailyNumber, customerName, customerPhone
- **Order detail panel** — click row → load full Order via getOrder(id) → read-only detail view
- **Reprint receipt** — use existing Rust print_receipt command with historical order data

### Differentiators (add value, manageable scope)

- **CSV export** — generate from filtered AdminOrder[] client-side; Save dialog via Tauri plugin-dialog
- **Empty state** — clear messaging when no orders found for date range or search

### Anti-features (do not build)

- Server-side search — not available in SDK; all filtering is client-side
- PDF export — defer to v1.2 (dependency weight, low urgency)
- Bulk actions on history — read-only; no mutations on historical orders
- "Today's summary" stats panel — user did not request; adds scope
- Infinite scroll / cursor pagination — SDK has no cursor; date range is the pagination unit

## User Workflow

1. Click "History" in sidebar → History screen opens, defaults to today
2. Optionally change date range → new API call fetches that date range
3. Filter list by status / order type / search text (all client-side, instant)
4. Click an order row → detail panel slides in (same panel as live orders, read-only)
5. Click "Reprint receipt" → sends to thermal printer
6. Click "Export CSV" → Save dialog → CSV file saved to chosen location
