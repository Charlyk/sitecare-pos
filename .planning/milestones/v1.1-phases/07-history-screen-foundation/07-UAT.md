---
status: complete
phase: 07-history-screen-foundation
source: [07-01-SUMMARY.md, 07-02-SUMMARY.md, 07-03-SUMMARY.md, 07-04-SUMMARY.md, 07-05-SUMMARY.md, 07-06-SUMMARY.md]
started: 2026-07-17T10:12:50Z
updated: 2026-07-17T10:24:10Z
---

## Current Test

[testing complete]

## Tests

### 1. Cold Start Smoke Test
expected: Quit the app completely, then relaunch with `npm run tauri`. App boots without errors, persisted store rehydrates, History opens from the sidebar with live data. If last closed on a history-detail view, it redirects to History rather than rendering blank.
result: pass
note: "Passed, but the build emits a dead_code warning the user wants fixed: field `table` is never read (src/lib.rs:59, PrintOrderData). Logged as gap G-07-1."

### 2. Summary Strip + Inert Filter Bar (visual fidelity)
expected: On the History screen, the summary strip tiles agree with the day-header subtotals below them. The filter bar is visible but dimmed and inert — Export button and search input are disabled — with the "30 days" pill as the only full-opacity element (D-14).
result: pass
coverage_id: D5
source: 07-04-SUMMARY.md

### 3. Order Total Units — RON vs cents (live API)
expected: Pick a day header on History and compare its revenue subtotal against the same day in the SiteCare admin dashboard. The figures match — totals render as RON, not cents (no 100x discrepancy).
result: pass
coverage_id: D4
source: 07-06-SUMMARY.md

### 4. Date Window Timezone Semantics (live API)
expected: Find an order timestamped near local midnight (Europe/Bucharest). It files under the Romanian local calendar day in the day-header grouping — not the UTC day.
result: pass
coverage_id: D5
source: 07-06-SUMMARY.md

### 5. 34 i18n keys resolve non-empty in ro and en, zero duplicate declarations
expected: 34 new i18n keys (nav_history + 33 h_*/status_* keys) resolve as non-empty strings in both ro and en, with zero duplicate key declarations
result: pass
source: automated
coverage_id: D1

### 6. openHistoryOrder sets historyOrder + screen atomically; setScreen resets both
expected: openHistoryOrder(order) sets historyOrder + screen: 'history-detail' atomically, leaves selectedOrder null; openOrder() is provably unchanged; setScreen resets both selectedOrder and historyOrder; historyOrder defaults to null and is excluded from partialize
result: pass
source: automated
coverage_id: D2

### 7. History nav item visible for cashier, absent for kitchen, correct topbar titles
expected: History nav item visible and clickable in the cashier sidebar (4th position, after Kitchen), absent for the kitchen role, active-highlighted on screen='history', and topbar shows the correct title for both 'history' and 'history-detail'
result: pass
source: automated
coverage_id: D3

### 8. useHistoryOrders fetches last 30 days on mount
expected: useHistoryOrders() fetches the last 30 days from client.admin.orders.list({ query: { from, to } }) on mount with no user interaction
result: pass
source: automated
coverage_id: D1

### 9. Hook calls admin endpoint, never kitchen endpoint
expected: Hook calls the admin endpoint (client.admin.orders.list), never the kitchen endpoint (HIST-02)
result: pass
source: automated
coverage_id: D2

### 10. Orders normalized via normalizeOrder (cents→RON, dailyOrderNumber fallback)
expected: Orders are normalized via normalizeOrder (cents→RON, dailyOrderNumber fallback chain)
result: pass
source: automated
coverage_id: D3

### 11. Empty, null, missing orders responses resolve to [] without throwing
expected: Empty, null, and missing orders responses resolve to [] without throwing
result: pass
source: automated
coverage_id: D4

### 12. SDK errors rethrown as Error with fallback message
expected: SDK errors are rethrown as Error with a fallback message when the response has no message field
result: pass
source: automated
coverage_id: D5

### 13. Query key root distinct from SSE-owned ['orders'] root
expected: Query key root ['history-orders', from, to] is distinct from and never collides with the SSE-owned ['orders'] root
result: pass
source: automated
coverage_id: D6

### 14. Orders grouped by local calendar day, newest-first, correct count and revenue
expected: HistoryScreen renders finished orders grouped by local calendar day, newest-first, with per-day count (incl. canceled/refunded) and completed-only revenue
result: pass
source: automated
coverage_id: D1

### 15. Status chip precedence — refunded wins, exactly one chip per row
expected: Status chip precedence (refunded wins over completed/canceled) renders exactly one chip per row
result: pass
source: automated
coverage_id: D2

### 16. UUID fallback renders short slice, never full 36-char UUID
expected: Order-number D-05 UUID fallback renders a short slice, never the full 36-char UUID
result: pass
source: automated
coverage_id: D3

### 17. Empty, loading, error states render in-card without crashing or leaking raw errors
expected: Empty, loading, and error states render inside the table card without crashing; empty renders computed zeros, error renders static copy + retry with no raw error text leaked
result: pass
source: automated
coverage_id: D4

### 18. readOnly prop added to OrderDetailScreen, defaults false, call sites unchanged
expected: readOnly prop added to OrderDetailScreen, defaulting to false; shipped call sites unchanged
result: pass
source: automated
coverage_id: D1

### 19. readOnly hides timeline, notes, call, items, thermal rail, print, Advance, Cancel
expected: readOnly hides timeline, notes card, Call customer, items card, thermal rail, print buttons, Advance, Cancel; back label switches to h_back_to_history
result: pass
source: automated
coverage_id: D2

### 20. Advance and Cancel hidden unconditionally under readOnly
expected: Advance and Cancel hidden unconditionally under readOnly regardless of order.state (non-terminal 'new' state included)
result: pass
source: automated
coverage_id: D3

### 21. Customer name and phone still render under readOnly
expected: Customer name and phone still render under readOnly
result: pass
source: automated
coverage_id: D4

### 22. Outer grid collapses to '1fr' when order.items is null
expected: Outer grid collapses from '1fr 380px' to '1fr' when order.items is null
result: pass
source: automated
coverage_id: D5

### 23. Minimal totals card renders chips, local time, single total line
expected: Minimal totals card renders status/type/payment chips, local time, and a single total line (t('total') + formatRON(order.total))
result: pass
source: automated
coverage_id: D6

### 24. screen='history' renders HistoryScreen end-to-end without breaking existing screens
expected: screen === 'history' renders HistoryScreen; History sidebar item opens it end-to-end without breaking any existing screen
result: pass
source: automated
coverage_id: D1

### 25. screen='history-detail' renders readOnly detail; back returns to History
expected: screen === 'history-detail' with historyOrder present renders OrderDetailScreen readOnly; back returns to History, not Orders
result: pass
source: automated
coverage_id: D2

### 26. Rehydrate backstop redirects to history when historyOrder is null
expected: Rehydrate backstop: cold start on screen: 'history-detail' with historyOrder: null redirects to 'history' instead of rendering blank
result: pass
source: automated
coverage_id: D3

## Summary

total: 26
passed: 26
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps

[none — all 26 deliverables verified: 22 auto-covered by passing tests, 4 confirmed by human checkpoint]

## Out-of-Scope Findings (not phase 7 gaps)

- finding: "Rust dead_code warning — `field table is never read` (src/lib.rs:59, PrintOrderData)"
  surfaced_by: test 1 (Cold Start Smoke Test — passed; warning reported alongside)
  scope: pre-existing, phase 5 (thermal printing) — not a phase 7 deliverable
  root_cause: "app.jsx sent `table` and PrintOrderData deserialized it, but the print path never wrote it, while the thermal preview (screen-detail.jsx:313) renders 'TYPE · MASA n' — preview and physical receipt disagreed for dine-in. A latent type bug also existed: Rust declares Option<String> but legacy fixtures produce a numeric table, which would fail deserialization of the entire payload."
  status: fixed
  resolved_by: "commit 50492d5 — fix(print): print the table number on dine-in receipts"
  note: "Inert with today's data — no shipped code populates order.table (SDK has no such field; the POS writes the table into notes). Fix makes print agree with the preview and with the UI's existing `order.table ?` branches if the field is ever populated."
