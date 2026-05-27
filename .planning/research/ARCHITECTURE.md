# Architecture — v1.1 Orders History Screen

**Updated:** 2026-05-27

## Existing Architecture (carry forward)

- Zustand: UI state (screen, role, lang, accent, density, sidebarCollapsed)
- TanStack Query: all server state (orders, menu, stats)
- `@charlyk/admin-client`: sole data layer — no direct HTTP
- SSE: mounted at App level via `useSSE`; updates ['orders'] cache
- Screens: each calls its own data hooks, no prop-drilling

## New Components Needed

### `screen-history.jsx`

New screen component. Mirrors the pattern of `screen-orders.jsx`:
- Calls `useAdminOrders(from, to)` for the list
- Calls `useOrderDetail(selectedId)` for the detail panel (reuse existing hook)
- Holds filter state locally (from/to dates, status, orderType, searchText)
- Renders history list + detail panel side-by-side

### `use-admin-orders.js`

New TanStack Query hook:
```js
useQuery({
  queryKey: ['admin-orders', from, to],
  queryFn: () => client.admin.orders.list({ query: { from, to } }),
  enabled: !!from && !!to,
  staleTime: 5 * 60 * 1000  // 5min — history doesn't change in real-time
})
```
`from` and `to` are ISO 8601 date strings (YYYY-MM-DD at midnight boundaries).

### Sidebar + Navigation

- Add 'history' to the Zustand screen enum (store.js)
- Add History icon to icons.jsx (e.g. clock/archive icon)
- Add sidebar entry in shell.jsx — same structure as Orders, KDS, etc.
- Route 'history' to `<HistoryScreen />` in app.jsx screen router

### Reuse: `use-order-detail.js`

Already fetches a full Order by id. History screen reuses it without modification.
The detail panel component (screen-detail.jsx) can also be reused as read-only.

### Reuse: Thermal printer commands

`print_receipt` Tauri command already exists from Phase 5. History screen calls it with the loaded full Order data — same invocation as live orders.

### CSV Export

Client-side generation from filtered AdminOrder[]:
```js
const csv = [headers, ...rows.map(r => [r.dailyNumber, r.customerName, ...].join(','))].join('\n')
const blob = new Blob([csv], { type: 'text/csv' })
// Save via @tauri-apps/plugin-dialog + @tauri-apps/plugin-fs
```

## Integration Points

| Existing | Touch | Reason |
|----------|-------|--------|
| `store.js` | Add 'history' to screen enum + persisted list | Navigation |
| `shell.jsx` | Add History nav item | Sidebar |
| `app.jsx` | Add 'history' → HistoryScreen route | Screen router |
| `icons.jsx` | Add history/archive icon | Sidebar icon |
| `i18n.jsx` | Add history-screen translation keys | Romanian + English |
| `use-order-detail.js` | No change | Reused as-is |
| `screen-detail.jsx` | Minor: hide action buttons in read-only mode | Reuse for history detail |

## Build Order (suggested)

1. Hook: `use-admin-orders.js` → data layer
2. Navigation: store.js + shell.jsx + app.jsx + icons.jsx → screen reachable
3. Screen: `screen-history.jsx` → list + filters + client-side filter logic
4. Detail: wire `use-order-detail` + `screen-detail` in read-only mode
5. Reprint: wire existing print_receipt command
6. Export: CSV download
7. i18n: all new keys in both ro/en

## Constraints

- **No direct HTTP** — `admin.orders.list` is the only acceptable call
- **staleTime 5min** — history data doesn't change; avoid re-fetching on every focus
- **'history' screen must be greyed-out if printer not configured** — reprint depends on it (follow existing greyed-out pattern for not-ready features)
- **No SSE on history** — history is static; SSE updates only touch ['orders'] live cache
