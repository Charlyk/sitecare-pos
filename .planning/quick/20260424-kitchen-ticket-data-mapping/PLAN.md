---
slug: kitchen-ticket-data-mapping
created: 2026-04-24
status: complete
---

# Fix data mapping in KitchenTicket

Three fixes in `screen-kitchen.jsx` `KitchenTicket`:
1. Order number header: `order.id` → `#${order.dailyOrderNumber}` (matches OrderCard convention)
2. Promised time display: add `?? order.estimatedMinutes ?? '—'` fallback for API field name variations
3. Items list: filter out global products (`source === 'global_product'`) — kitchen only needs menu items
