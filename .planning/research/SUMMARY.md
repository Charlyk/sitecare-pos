# Research Summary — v1.1 Orders History Screen

**Updated:** 2026-05-27

## SDK Findings (from @charlyk/admin-client type inspection)

### What the API gives us

| Endpoint | Method | Params | Returns |
|----------|--------|--------|---------|
| `/v1/admin/orders` | `admin.orders.list()` | `from`, `to` (ISO 8601 dates) | `AdminOrder[]` — summary fields only |
| `/v1/orders/{id}` | `orders.get()` | `id` | Full `Order` with items, events, address |

### AdminOrder shape (summary list)

```
id, status, orderType, customerName, customerPhone,
dailyNumber, estimatedMinutes, discountAmount, discountType,
total, paymentType, currency, createdAt
```

**No items, no delivery address, no notes** — must call `getOrder(id)` for detail view.

### Critical constraints

1. **No server-side pagination** — full result set returned for the date range; default to "today" to keep load fast
2. **No server-side search or status/type filter** — all filtering is client-side on the fetched array
3. **AdminOrder has no items** — detail panel always requires a second `getOrder(id)` call
4. **No export endpoint** — CSV must be generated client-side; PDF deferred to v1.2

## Stack Additions

| Addition | Why |
|----------|-----|
| None required | All new features build on existing stack |
| `@tauri-apps/plugin-fs` (if not installed) | Needed for native Save dialog + file write for CSV export |
| Manual CSV generation | No library needed for simple field escaping |

## Recommended Build Order

1. `use-admin-orders.js` hook (date-range query, 5min staleTime)
2. Navigation wiring (store.js + shell.jsx + app.jsx + icons.jsx)
3. `screen-history.jsx` — list + client-side filters + search
4. Detail panel — reuse `use-order-detail` + `screen-detail` in read-only mode
5. Reprint — reuse existing `print_receipt` Tauri command
6. CSV export — client-side generation + native Save dialog
7. i18n — all new keys in ro/en

## Watch Out For

- **Default date range** — History defaults to current week (Monday 00:00 → today 23:59); compute start-of-week on the client before sending to API
- **Date boundary timezone** — verify `from`/`to` in API calls return the correct day in Romanian timezone; server may treat as UTC
- **Large result sets** — warn or limit if >500 orders returned for a wide date range
- **`getOrder` requires kitchen endpoint** — verify admin token can access `/v1/orders/{id}`; if 401, detail view must fall back to AdminOrder fields only
- **CSV escaping** — wrap all fields in double-quotes; escape internal `"` as `""`
- **Printer config check before Reprint** — reuse existing printer-configured guard
- **Filter state reset on navigation** — acceptable for v1.1; document as known behavior
