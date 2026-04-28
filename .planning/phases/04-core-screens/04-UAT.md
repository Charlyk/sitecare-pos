---
status: complete
phase: 04-core-screens
source: [04-01-SUMMARY.md, 04-02-SUMMARY.md, 04-03-SUMMARY.md, 04-04-SUMMARY.md, 04-05-SUMMARY.md, 04-06-SUMMARY.md, 04-07-SUMMARY.md, 04-08-SUMMARY.md, 04-09-SUMMARY.md, 04-10-SUMMARY.md]
started: 2026-04-28T16:53:00Z
updated: 2026-04-28T17:10:00Z
---

## Current Test

## Current Test

[testing complete]

## Tests

### 1. Orders Screen — Live Data
expected: Launch the app and log in. The Orders screen loads and shows real orders from the API (not empty, not mock data). Orders have numbers, statuses, and customer names visible.
result: pass

### 2. Orders Screen — Status Filters
expected: Click the "Active", "All", or status pill filters in the Orders screen. The list updates to show only orders matching the selected status. Switching filters is instant (client-side).
result: pass

### 3. Orders Search — By Number
expected: Type a partial order number (e.g., "42") in the search box in the Orders filter bar. Only orders whose daily number contains "42" appear. A clear button (×) appears next to the search field.
result: pass

### 4. Orders Search — By Customer Name
expected: Type a partial customer name (e.g., "Ion") in the search box. Only orders whose customer name matches appear. Clearing the field (via the × button or by deleting text) restores the full filtered list.
result: pass

### 5. Accept Order Dialog
expected: Click on any active order to open its detail view. A blue/primary "Accept" button is visible in the right panel. Clicking it opens the Accept dialog — it shows the order summary and a preparation time field (numeric input or +/- stepper). The Confirm button is active only when prep time > 0.
result: pass

### 6. Accept Order — Advances Status
expected: Enter a prep time (e.g., 15 min) and confirm. The dialog closes. A success toast appears ("Order accepted" or Romanian equivalent). The order status changes in the list (e.g., moves from "New" to "Confirmed" or disappears from the active filter).
result: pass

### 7. Cancel Order Flow — Dialog Opens
expected: Open an order detail that is NOT in a terminal state (done/cancelled). A "Cancel" button is visible in the right panel. Clicking it opens the Cancel dialog. The dialog shows 5 preset cancellation reasons (e.g., customer changed mind, out of ingredients, etc.). The Confirm button is greyed out until a reason is selected.
result: pass

### 8. Cancel Order — Completes via API
expected: Select any cancel reason. The Confirm button becomes active (terracotta/red background). Click Confirm. The dialog closes, a success toast appears, and the order transitions to cancelled status in the list.
result: pass

### 9. KDS Timer Updates
expected: Open the Kitchen Display screen. Each active order card shows an elapsed time (e.g., "5 min"). Wait at least 1 minute — the elapsed time on at least one card should increment (the timer updates every minute).
result: issue
reported: "what I do not like is that if the app window is not focused, the new order notification is not received, it appears only if I focus the window"
severity: major

### 10. KDS Urgency Colors
expected: Kitchen order cards change color based on elapsed time: neutral color for orders over 8 minutes old, amber/yellow for ≤8 min, terracotta/red for ≤3 min. At least one color threshold is visible if there are orders of varying ages.
result: pass

### 11. KDS Mute Toggle
expected: In the Kitchen Display screen, a sound toggle button is visible in the header area (above the order columns). Clicking it mutes/unmutes the new-order notification sound. The button label or icon updates to reflect muted vs. active state.
result: pass

### 12. KDS Bump Button
expected: On any KDS order card, a "Bump" button is visible. Clicking Bump advances the order to its next status (e.g., confirmed → ready). The card updates or disappears from the column depending on the new status.
result: pass

### 13. POS Screen — Live Menu
expected: Open the POS screen. Menu categories appear in a sidebar or tab list (fetched live from the API). Clicking a category shows its items. The items are not hardcoded placeholder data.
result: pass

### 14. POS — Out-of-Stock Items
expected: If any menu item has been marked as out-of-stock (via the Menu screen), it appears greyed out in the POS screen at ~45% opacity and cannot be clicked to add to the cart.
result: pass

### 15. POS Discount Field
expected: Add at least one item to the POS cart. A discount field appears in the totals area. Enter a discount value (e.g., 10). Toggle between % and RON mode. The discount amount and final total update accordingly. The discount line is hidden when the discount amount is 0.
result: pass

### 16. POS Ring Up — Creates Order
expected: Build a cart with at least one item. Select an order type (Dine-In, Takeaway, or Delivery). Press "Ring Up". A success toast appears showing the new daily order number (e.g., "#43"). The cart resets to empty. The new order appears in the Orders screen.
result: issue
reported: "It is working, just the toast shows duplicate # symbol (##0001)"
severity: cosmetic

### 17. Menu Availability Toggle — Saves to Server
expected: Open the Menu screen. Toggle at least one item from Available to Out-of-stock (or back). The change is reflected immediately (no page refresh needed). Navigate away and return — the toggle state is preserved (not reset).
result: pass

### 18. Settings — Language Toggle
expected: Open the Settings screen. Click on the Display tab. A Language toggle is visible with RO and EN options. Clicking EN switches all visible text in the app to English. Clicking RO switches back to Romanian.
result: pass

### 19. Settings — Density Toggle
expected: In Settings > Display, a Density toggle shows Balanced and Dense options. Switching changes the visual density of lists/cards (tighter or looser spacing).
result: issue
reported: "I did not notice any difference"
severity: minor

### 20. Settings — Accent Picker + Persistence
expected: In Settings > Display, 4 accent color swatches are visible. Clicking a swatch changes the UI accent color (button highlights, active states). Close the app completely and reopen it — the selected accent color is still applied (persisted via Tauri store).
result: pass

## Summary

total: 20
passed: 17
issues: 3
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps

- truth: "New order SSE notifications are received and displayed regardless of whether the app window is focused"
  status: failed
  reason: "User reported: if the app window is not focused, the new order notification is not received, it appears only if I focus the window"
  severity: major
  test: 9
  root_cause: ""
  artifacts: []
  missing: []
  debug_session: ""

- truth: "Switching density toggle between Balanced and Dense produces a visible change in list/card spacing across the app"
  status: failed
  reason: "User reported: I did not notice any difference"
  severity: minor
  test: 19
  root_cause: ""
  artifacts: []
  missing: []
  debug_session: ""

- truth: "Ring Up success toast shows the daily order number with a single # prefix (e.g., #43)"
  status: failed
  reason: "User reported: the toast shows duplicate # symbol (##0001)"
  severity: cosmetic
  test: 16
  root_cause: ""
  artifacts: []
  missing: []
  debug_session: ""
