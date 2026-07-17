---
status: complete
phase: 08-read-only-order-detail-view
source: 08-01-SUMMARY.md, 08-02-SUMMARY.md, 08-03-SUMMARY.md, 08-04-SUMMARY.md, 08-05-SUMMARY.md
started: 2026-07-17T12:54:46Z
updated: "2026-07-17T13:02:39Z"
---

## Current Test

[testing complete]

## Tests

### 1. Cold Start Smoke Test

expected: Quit any running dev server / app instance. Start the app from scratch. App boots with no console errors, authenticates, Orders screen loads live data. No React hook-order warnings during boot or login.
result: pass

### 2. Read-Only Status Chip Matches History Row

expected: Open History, note the status chip on a few rows (a completed order, and a cancelled or refunded one if present). Open each order's detail. The detail's status chip shows the same label and color as the History row it came from — no drift between list and detail.
result: pass
coverage_id: D4 (08-03)

### 3. No Hook-Order Crash Across Auth/Cold-Start Branches

expected: Exercise the auth-guard branches — cold start busy state, logged out then logged in, and switching between Orders / History / History-detail. No "Rendered fewer hooks than expected" error or white screen at any transition.
result: pass
coverage_id: D3 (08-05)

### 4. No Skeleton Flash When Reopening a Cached Order

expected: Open a historical order (items skeleton may briefly show on first open), press Back, then open the SAME order again. The second open shows the items immediately — no skeleton flash, because the order is already cached.
result: pass
coverage_id: D4 (08-05)

### 5. ROADMAP Phase 8 SC1/SC2 amended (no handled-by; prep time = derived duration; 401/404 not 401/403)

expected: ROADMAP Phase 8 SC1/SC2 amended (no handled-by; prep time = derived duration; 401/404 not 401/403)
result: pass
source: automated
coverage_id: D1 (08-01)

### 6. REQUIREMENTS.md HIST-10 amended (no handled-by) with F-01 finding and a new Design Elements Cut row

expected: REQUIREMENTS.md HIST-10 amended (no handled-by) with F-01 finding and a new Design Elements Cut row
result: pass
source: automated
coverage_id: D2 (08-01)

### 7. Four i18n keys added to both ro and en locale objects, no duplicates

expected: Four i18n keys (h_detail_error_title, h_prep_time, h_canceled_after, h_detail_no_items) added to both ro and en locale objects, no duplicates
result: pass
source: automated
coverage_id: D3 (08-01)

### 8. deriveDuration(order) returns prep/canceled duration from events[] with COMPLETED precedence and null on untrustworthy input

expected: deriveDuration(order) returns {kind:'prep',minutes} or {kind:'canceled',minutes} from events[] timestamps, with COMPLETED precedence, max-createdAt selection, deterministic tie-break, zero-floor clamping, and null on any untrustworthy input
result: pass
source: automated
coverage_id: D1 (08-02)

### 9. historyStatusMeta exported from screen-history.jsx with byte-identical mapping behavior

expected: historyStatusMeta is exported from screen-history.jsx with byte-identical mapping behavior (chip class, tile/ink colors, icon, label) for reuse by screen-detail.jsx
result: pass
source: automated
coverage_id: D2 (08-02)

### 10. readOnly header meta line shows derived duration; null duration drops to bare placed-at timestamp

expected: readOnly header meta line replaces elapsed-since-now with deriveDuration's derived prep-time/canceled-after duration; null duration drops to a bare placed-at timestamp with no dangling separator; live route unchanged
result: pass
source: automated
coverage_id: D3 (08-03)

### 11. Items region shows exactly 3 skeleton rows matching the real item row box while loading; totals still render

expected: Items rows region shows exactly 3 skeleton rows matching the real item row's box (padding 12px 18px, gap 12, matching borderBottom) while detailLoading is true, and the totals block still renders the AdminOrder total
result: pass
source: automated
coverage_id: D1 (08-04)

### 12. detailError renders generic error title, check-connection body, and Retry wired to onRetryDetail

expected: detailError renders the generic error title, check-connection body, and a Retry button in the rows region, wired to onRetryDetail, while the totals block still renders the total — no HTTP-status branching
result: pass
source: automated
coverage_id: D2 (08-04)

### 13. No-items line renders only in settled-empty state; settled-populated renders items in server order

expected: The no-items line renders only in the settled-empty state (never while loading or errored, per F-01/prohibition), and a settled-populated order renders items in server order including when two items compare equal
result: pass
source: automated
coverage_id: D3 (08-04)

### 14. No mutating control (Modify) reachable on readOnly route — DOM removal, with standing allowlist sweep

expected: No mutating control (Modify) is reachable on the readOnly route with a fully-hydrated items array — DOM removal, not disabled/CSS-hidden — and a standing sweep test enumerates every button in a hydrated readOnly render against a fixed non-mutating allowlist
result: pass
source: automated
coverage_id: D4 (08-04)

### 15. Opening a historical order calls getOrder(id) and renders items with modifiers, phone, address (SC1)

expected: Opening a historical order calls getOrder(id) via a sibling useOrderDetail(historyOrder?.id) and renders items with modifiers, subtotal, delivery fee, total, customer phone, and delivery address — none of which the AdminOrder summary carries (SC1)
result: pass
source: automated
coverage_id: D1 (08-05)

### 16. Hydrated detail merged over summary — no field blanks during fetch; hydrated wins (D-03)

expected: The hydrated detail is merged over the summary so no field ever blanks during the fetch, and the hydrated value wins when both sides carry a value (D-03)
result: pass
source: automated
coverage_id: D2 (08-05)

### 17. detailLoading/detailError/onRetryDetail passed only on history-detail route; live route unchanged

expected: detailLoading/detailError/onRetryDetail are passed only on the history-detail route; the live route renders unchanged
result: pass
source: automated
coverage_id: D5 (08-05)

### 18. Back from read-only detail returns to History, not Orders, with list and period intact (SC4)

expected: Back from the read-only detail returns to History, not Orders, with the list and period intact (SC4)
result: pass
source: automated
coverage_id: D6 (08-05)

### 19. Rehydrate backstop redirects history-detail with null historyOrder to history

expected: The rehydrate backstop still redirects history-detail with a null historyOrder to history (Phase 7 behavior preserved)
result: pass
source: automated
coverage_id: D7 (08-05)

### 20. Modify gate holds under real hydration (hydrated fixture, non-empty items)

expected: The Modify gate holds under real hydration (hydrated fixture, non-empty items), closing the T-08-01/T-08-10 gap at the route level
result: pass
source: automated
coverage_id: D8 (08-05)

## Summary

total: 20
passed: 20
issues: 0
pending: 0
skipped: 0
blocked: 0

## Coverage Block Errors

Three coverage entries used `kind: static`, which is not in the allowed set
(unit, integration, e2e, automated_ui, manual_procedural, other). They failed
validation and fell through to human checkpoints (fail-safe — no deliverable
dropped), even though their referenced verification is passing:

- 08-03 D4 — `verification[1].kind: static` (git diff --stat check)
- 08-05 D3 — `verification[1].kind: static` (grep hook-placement check)
- 08-05 D4 — `verification[0].kind: static` (grep isFetching check)

Fix: change `kind: static` to `kind: other` in those SUMMARY coverage blocks.

## Gaps

[none yet]
