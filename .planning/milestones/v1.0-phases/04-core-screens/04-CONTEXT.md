# Phase 4: Core Screens - Context

**Gathered:** 2026-04-24
**Status:** Ready for planning

<domain>
## Phase Boundary

Wire all 7 screens to live API data and complete the full prototype UX: orders list with status/type filtering and client-side search, KDS per-ticket elapsed timers with urgency colors plus sound alert and bump, POS checkout with live menu and order creation, menu availability toggle via API, and settings with a new Display tab for lang/density/accent. Every mutating action that was wired in Phase 3 now actually completes its full UX loop.

**In scope:**
- AcceptDialog wired to `updateStatus` + `estimatedMinutes` (ACT-01)
- Order lifecycle advance through all states (ACT-02)
- Cancel from OrderDetail with confirm dialog and required reason (ACT-03)
- KDS elapsed timers (already in place — verify), urgency colors (already in place), sound alert on SSE new-order, mute toggle (KDS-02, KDS-03, KDS-04, KDS-05)
- POS: live menu from `useMenu()`, order creation via `kitchen.orders.create`, discount field in totals area (POS-01 through POS-05)
- Menu availability toggle via `client.kitchen.products.updateStock` (MENU-01, MENU-02)
- SettingsScreen: new Display tab with lang, density, accent controls; persistence re-verified (SET-01, SET-02, SET-03)
- Orders: client-side text search in filter bar (ORD-01, ORD-02, ORD-03)

**Out of scope:**
- Thermal printing (Phase 5)
- Build pipeline (Phase 6)
- Per-item discounts (v2)
- Cancel from OrderCard (deferred — cancelled cancel button on cards, cancellation lives in detail screen only)

</domain>

<decisions>
## Implementation Decisions

### Cancel Order (ACT-03)

- **D-01:** Cancel button appears in **OrderDetail screen only** — not on the OrderCard. Staff must open the detail view to cancel.
- **D-02:** Cancellation requires a **confirm dialog** before calling the API. No immediate-cancel on tap.
- **D-03:** The confirm dialog includes a **required reason field** — staff must pick a reason before the Confirm button activates. Use a preset dropdown with options such as: "Customer changed mind", "Out of ingredients", "Duplicate order", "Other". The reason is passed to `updateStatus` as the `reason` field in the request body.
- **D-04:** `updateStatus` call for cancel: `{ currentStatus: order.state.toUpperCase(), toStatus: 'CANCELLED', reason: selectedReason }`.

### KDS Sound Alert (KDS-04)

- **D-05:** Sound alert uses a **bundled MP3 file** committed to the repo (e.g. `public/sounds/new-order.mp3`). Use `new Audio('/sounds/new-order.mp3')` to play it. No Web Audio API synthesis needed.
- **D-06:** Sound plays **only on live SSE `order_new` events** — NOT on the initial snapshot replay when the app connects. The `useSSE` hook must distinguish "first snapshot" events from subsequent live events (e.g., track whether the initial batch has been received).
- **D-07:** A **mute toggle button** is visible on the KDS screen header. State lives in Zustand (`soundMuted: boolean`). Mute persists across screen switches but does NOT need to survive app restarts (session-only state — do not add to partialize list).
- **D-08:** When `soundMuted` is true, the audio file is not played but all other ticket UX (urgency colors, layout) is unaffected.

### POS Discount (POS-03)

- **D-09:** Discount is **order-level only** — one discount applied to the whole order total, not per-item.
- **D-10:** Staff can choose **fixed amount (RON) or percentage (%)** — a small toggle or radio switch next to the discount input lets them pick the mode. Default: percentage.
- **D-11:** The discount field appears **in the totals area**, between the delivery fee row and the total row — same visual register as subtotal, tax, and fee lines. Label: "Discount" with the mode toggle inline.
- **D-12:** `discountAmount` (in RON, pre-calculated from mode + value) is passed to `client.kitchen.orders.create` as a field in the order body. If the API does not accept a discount field, apply it client-side to reduce the total before submission and display it as a line item.

### Display Settings (SET-01, SET-02, SET-03)

- **D-13:** `SettingsScreen` gets a new **"Display" tab** added alongside Users, Tax & VAT, Restaurant, Integrations.
- **D-14:** The Display tab contains controls for: **Language** (RO/EN toggle), **Density** (Balanced/Dense toggle), **Accent color** (4-color picker: Sage, Indigo, Terracotta, Charcoal). These map directly to `setLang`, `setDensity`, `setAccent` from `useAppStore`.
- **D-15:** SettingsScreen must import `useAppStore` directly (same pattern as other screens with their own hooks) — no prop-drilling of these setters from App.
- **D-16:** Phase 4 planning must include a **persistence verification step** — after changing lang/density/accent via the Display tab, close and reopen the app and confirm the values survive. This verifies SET-01/02/03 end-to-end.

### Orders Screen (ORD-01, ORD-02, ORD-03)

- **D-17:** Search (ORD-03) is **client-side text filter** over the already-loaded orders array. No API call. Search input lives in the filter bar, right of the status/type toggles. Searches by order ID (`dailyOrderNumber`) and customer name.
- **D-18:** Role switching (ORD-02 — FOH vs BOH) already works via Zustand `role` → `setScreen('kitchen')` gate in app.jsx. No additional work needed beyond confirming it works with live data.

### AcceptDialog (ACT-01)

- **D-19:** `onConfirm(prepMin)` in app.jsx must call `updateStatus.mutate({ id: order.id, currentStatus: 'NEW', toStatus: 'ACCEPTED', estimatedMinutes: prepMin })`. Currently it only shows a toast without calling the API — this must be fixed.
- **D-20:** After successful mutation, close the dialog and show a success toast. On error, show an error toast and keep the dialog open.

### POS Live Menu (POS-01)

- **D-21:** `PosScreen` calls `useMenu()` directly (following Phase 3's "each screen calls its own hooks" pattern). Remove static `MENU_CATEGORIES`/`MENU_ITEMS` imports from screen-pos.jsx.
- **D-22:** SDK's `listKitchenMenu` returns `{ categories: [...], globalProducts: [...] }`. Map categories and their items to the existing POS card layout. Item shape from SDK may differ from static data — normalize it (id, name for both langs, price, category id).

### Menu Availability (MENU-01, MENU-02)

- **D-23:** `MenuScreen` calls `useMenu()` for live data. Replace static `MENU_CATEGORIES`/`MENU_ITEMS` imports and remove the `localStorage` availability state.
- **D-24:** Availability toggle calls `client.kitchen.products.updateStock({ path: { id: item.id }, body: { inStock: newValue } })` — use `useMutation` with `onSuccess: () => queryClient.invalidateQueries({ queryKey: ['menu'] })`.
- **D-25:** The "updateStock" endpoint is `PATCH /v1/kitchen/stock`. Confirm the exact body shape from the SDK type definitions before implementing.

### Claude's Discretion

- **MP3 file selection**: Choose or source an appropriate short notification sound. A single soft chime or beep (~0.5s). Commit to `public/sounds/new-order.mp3`.
- **SSE snapshot detection**: Decide how `useSSE` distinguishes initial snapshot from live events. Simplest approach: set a `snapshotReceived` flag to `true` after the first tick delay post-connect; events arriving before that flag is set are snapshot events and do not trigger sound.
- **Cancel reason options**: Choose the exact preset reasons (4-5 options, bilingual ro/en).
- **Discount API field name**: Inspect SDK type for `createKitchenOrder` body — if no discount field exists, apply client-side before submission and do not send the field.
- **Error handling style**: Brief toast on mutation error, consistent with Phase 3 patterns.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### SDK
- `node_modules/@charlyk/admin-client/dist/index.js` — Source of truth for all kitchen API methods. Key methods for Phase 4: `kitchen.orders.create` (`POST /v1/kitchen/orders`), `kitchen.orders.updateStatus` (`PATCH /v1/orders/{id}/status`), `kitchen.products.updateStock` (`PATCH /v1/kitchen/stock`), `kitchen.menu.list` (`GET /v1/kitchen/menu`).
- `node_modules/@charlyk/admin-client/dist/index.d.ts` — TypeScript types. Read before implementing order creation body and stock update body to confirm field names.

### Phase Requirements
- `.planning/ROADMAP.md` — Phase 4 goal, success criteria (5 criteria), requirement IDs: ORD-01/02/03, ACT-01/02/03, KDS-02/03/04/05, POS-01/02/03/04/05, MENU-01/02, SET-01/02/03
- `.planning/REQUIREMENTS.md` — Full text of all Phase 4 requirements

### Existing Screens (start here before planning each screen)
- `src/screen-orders.jsx` — Orders screen + OrderCard. Filter bar, stats strip, nextAction map already implemented. Add search + cancel-to-detail navigation.
- `src/screen-kitchen.jsx` — KDS screen + KitchenTicket. Urgency colors and bump already implemented. Add sound alert + mute toggle.
- `src/screen-pos.jsx` — POS screen. Currently uses static data + empty onCreate. Wire useMenu() + create order + discount field.
- `src/screen-menu.jsx` — Menu screen. Currently uses static data + localStorage. Wire useMenu() + updateStock mutation.
- `src/screen-settings.jsx` — Settings screen. Add Display tab with lang/density/accent controls.
- `src/screen-detail.jsx` — Order detail screen. Add Cancel button with confirm dialog + reason selector.
- `src/app.jsx` — Root. Fix AcceptDialog onConfirm to actually call updateStatus. Add soundMuted to store if needed.

### Data Hooks
- `src/use-orders.js` — useOrders() — already implemented, no changes needed
- `src/use-order-actions.js` — useOrderActions() — already implemented. updateStatus and updateEstimatedTime mutations available.
- `src/use-menu.js` — useMenu() — already implemented. Both PosScreen and MenuScreen should call this directly.
- `src/use-sse.js` — useSSE() — already implemented. Phase 4 must extend it to emit a signal on live new-order events (for sound trigger).

### Phase 3 Context (prior decisions)
- `.planning/phases/03-shell-data-foundation/03-CONTEXT.md` — Phase 3 decisions D-11 through D-16 directly affect Phase 4 screen wiring patterns.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `useOrderActions()` — returns `{ updateStatus, updateEstimatedTime }` mutations. Both invalidate `['orders']` on success.
- `useMenu()` — TanStack Query hook, cache key `['menu']`, staleTime 5min. Returns SDK shape `{ categories, globalProducts }`.
- `useOrders()` — cache key `['orders']`. Returns `{ orders: NormalizedOrder[] }`.
- `AcceptDialog` component (in app.jsx) — UI is complete and correct. Only the `onConfirm` callback needs to call the API.
- `OrderCard` in screen-orders.jsx — Already has advance button, details button, print button. Cancel will be in OrderDetail, not here.
- `KitchenTicket` in screen-kitchen.jsx — Urgency border colors and bump button already wired. Timer interval is 30s (currently); requirements say "every minute" — confirm whether 30s rerender is intentional or should be 60s.
- `typeMeta`, `sourceMeta`, `stateMeta` exported from screen-orders.jsx — reused in screen-kitchen.jsx and app.jsx.

### Established Patterns
- `useMutation` with `onSuccess: () => queryClient.invalidateQueries(...)` — the only mutation pattern used. New mutations (cancel, create order, updateStock) follow this.
- Each screen imports `useAuth` only if it needs the `client` directly; otherwise uses the named hooks.
- Bilingual strings via `useT(lang)` — all new UI text needs ro/en entries in `src/i18n.jsx`.
- `pushToast` from `useAppStore` — toast on mutation success/error (consistent with Phase 3 patterns in app.jsx).

### Integration Points
- `src/app.jsx` — Fix `onConfirm` in AcceptDialog JSX. Wire `onCreate` in PosScreen JSX to an actual createOrder handler. Add `soundMuted` to Zustand store if storing mute preference.
- `src/store.js` — May need `soundMuted` boolean added (session-only, not in partialize list).
- `src/i18n.jsx` — Add bilingual strings for: cancel confirm dialog, reason dropdown options, Display tab labels (language/density/accent), discount field label.
- `public/sounds/` — New directory for `new-order.mp3`.

</code_context>

<specifics>
## Specific Ideas

- **Cancel reason presets**: "Customer changed mind" / "Out of ingredients" / "Duplicate order" / "Kitchen cannot fulfill" / "Other" — bilingual. Pass to API as `reason` string.
- **Sound file placement**: `public/sounds/new-order.mp3` — served as a static asset. `new Audio('/sounds/new-order.mp3').play()` works from any component.
- **Discount UI**: Small toggle button (RON | %) next to the discount input, inline in the totals section. When no discount entered, the discount line doesn't render in the totals list.
- **Display tab icon**: Use `sliders` or `palette` icon from icons.jsx if available; otherwise `settings` or `grid`.
- **Open question from STATE.md (tax)**: Tax display in POS is currently hardcoded 19%. The `kitchen.orders.create` response likely returns the server-calculated total — use that total for the confirmation toast and don't re-compute client-side tax post-submission.

</specifics>

<deferred>
## Deferred Ideas

- Cancel from OrderCard (simpler flow) — deferred in favor of OrderDetail-only cancel to avoid accidental taps on mobile-like desktop use.
- Per-item discounts (POS-03 max scope) — deferred to v2 per REQUIREMENTS.md.
- Sound configuration (volume control, custom sound) — deferred; mute toggle is sufficient for v1.

</deferred>

---

*Phase: 04-core-screens*
*Context gathered: 2026-04-24*
