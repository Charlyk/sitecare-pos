# Pitfalls — v1.1 Orders History Screen

**Updated:** 2026-05-27

## SDK Constraints (critical — shapes all requirements)

### No server-side search or filter

`ListAdminOrdersData` accepts only `from` and `to` (date range). There is no `status`, `search`, `page`, `limit`, or `cursor` parameter. All text search and status/type filtering MUST be client-side on the returned array.

**Prevention:** Never add a server-side search query param — the API will return a 400 or ignore it. Implement all filter logic in useMemo inside the screen component.

### No server-side pagination

The API returns ALL orders for the date range in a single response. For high-volume restaurants, a 30-day range might return thousands of orders. Rendering them all at once will freeze the UI.

**Prevention:** 
- Default date range to "today" (one day) to keep initial load fast
- Add a visible disclaimer when result count exceeds a threshold (e.g., >500 orders)
- Use `useMemo` for filtered list to avoid re-filtering on every render
- Consider limiting max range to 31 days in the UI; warn the user if they request more

### AdminOrder has no items

`AdminOrder` (from admin list) does not contain order items — only summary fields. To show items in the detail panel, a second `getOrder(id)` call is required via the existing `use-order-detail.js` hook.

**Prevention:** Never try to render items from AdminOrder directly. Always lazy-load via `useOrderDetail(id)` when the user clicks a row.

### getOrder uses kitchen endpoint, not admin endpoint

`GetOrderData.url` is `/v1/orders/{id}` — the kitchen route. This returns the full `Order` type (kitchen role). Verify the authenticated user (admin role) can access this endpoint; if not, the detail panel will always fail with 401.

**Prevention:** Test in Phase 7 with an admin-role token. If 401, the detail panel must use fields from AdminOrder only (no items).

## React / UX Pitfalls

### staleTime must be set — don't use live query defaults

The live orders hook has `staleTime: 0` (always fresh). If `use-admin-orders.js` inherits the same defaults, every route switch will re-fetch the history list even within the same session.

**Prevention:** Set `staleTime: 5 * 60 * 1000` (5 minutes) on the admin orders query. History data is not real-time.

### Filter state resets on navigation

If filter state (date range, search, status) lives in component state, switching to another screen and back resets everything. Staff find this frustrating when looking up a specific order.

**Prevention:** Persist date range in Zustand (session-only, not persisted to disk) OR accept the reset as acceptable for v1.1. Decide before planning.

### Date boundary off-by-one

If `from` = "2026-05-27" and the API interprets it as "2026-05-27T00:00:00Z", orders created at "2026-05-27T23:59:59+03:00" (Romanian timezone) may fall outside the range on the server.

**Prevention:** Send `from` as start-of-day in UTC (or let the server decide UTC) and `to` as end-of-day. Verify with a real API call during Phase 7.

## Export Pitfalls

### Tauri filesystem access requires plugin-fs permission

`@tauri-apps/plugin-fs` must be added to `tauri.conf.json` capabilities if not already present. CSV "download" in a browser would use `<a download>`, but in Tauri, the WebView does not have a Downloads folder concept unless you pipe through the Rust side.

**Prevention:** Add `@tauri-apps/plugin-dialog` + `@tauri-apps/plugin-fs` (or confirm already added). Use `dialog.save()` + `fs.writeTextFile()` for a native Save dialog.

### CSV field escaping

Customer names or notes may contain commas, quotes, or newlines. Naive `join(',')` will produce invalid CSV.

**Prevention:** Wrap every field value in double-quotes and escape internal double-quotes as `""`.

## Reprint Pitfalls

### Reprint requires printer configured

If the printer is not configured (no USB/TCP address saved), the existing `print_receipt` command will error. History screen must check printer configuration state before showing the Reprint button — or show it greyed-out with a tooltip.

**Prevention:** Reuse the same printer-config check already in screen-orders.jsx (or wherever the live reprint button is).
