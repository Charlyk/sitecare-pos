# Phase 7: History Screen Foundation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-17
**Phase:** 7-History Screen Foundation
**Areas discussed:** What counts as history, Row columns after the cuts, Day headers + grouping basis, Unready controls in Phase 7

---

## What counts as "history"

### Q1 — What should the History list contain?

| Option | Description | Selected |
|--------|-------------|----------|
| Finished orders only (Recommended) | Filter client-side to completed / canceled / refunded | ✓ |
| Every order in the window | Show in-flight orders too, with live status | |
| Everything, in-flight visually dimmed | Show all, mark in-flight as not-yet-final | |

**User's choice:** Finished orders only
**Notes:** HIST-07's status filter has no bucket for an in-flight order; day revenue stays meaningful.

### Q2 — How should a refunded order present?

| Option | Description | Selected |
|--------|-------------|----------|
| Refunded wins over Completed (Recommended) | One derived display status per row; refunded beats completed | ✓ |
| Show Completed + a refund marker | Status chip stays Completed, refund as separate badge | |
| You decide | Planner picks | |

**User's choice:** Refunded wins over Completed
**Notes:** `status: COMPLETED` and `paymentCaptureStatus: 'refunded'` are orthogonal SDK fields. Design has one chip slot; keeps later filter buckets mutually exclusive.

### Q3 — How should Phase 7 handle volume?

| Option | Description | Selected |
|--------|-------------|----------|
| Render all, revisit if it's slow (Recommended) | No cap, no warning; measure against real data | ✓ |
| Render all + warn above a threshold | Banner when the set is large | |
| Virtualize the list now | Windowed rendering from day one | |

**User's choice:** Render all, revisit if it's slow
**Notes:** Supersedes the STATE.md watch-out "warn or limit if >500 orders". Virtualizing a grouped list was judged real complexity for an unobserved problem. Virtualization deferred.

### Q4 — What should drive day boundaries?

| Option | Description | Selected |
|--------|-------------|----------|
| Local restaurant day, always (Recommended) | Local-day boundaries as ISO instants; group by local day | ✓ |
| Whatever the API returns, grouped by UTC | Match the server exactly | |
| Local day, but with a business-day cutoff | Day ends ~04:00 so a late shift stays on one header | |

**User's choice:** Local restaurant day, always
**Notes:** Addresses the STATE.md open question on `from`/`to` timezone semantics — research must still verify how the API reads the params. Staff reconcile against the till by the day they worked.

---

## Row columns after the cuts

### Q1 — What goes in the order column?

| Option | Description | Selected |
|--------|-------------|----------|
| #dailyNumber, fall back to short id (Recommended) | `#1047` from dailyNumber; short UUID slice when null | ✓ |
| Always the UUID, shortened | Globally unique, never null | |
| #dailyNumber + date qualifier | Disambiguate the daily reset | |

**User's choice:** #dailyNumber, fall back to short id
**Notes:** Follows `normalizeOrder`'s existing `dailyOrderNumber: o.dailyOrderNumber ?? o.id` precedent and the v1.0 KDS ticket fix. Day header already supplies date context.

### Q2 — How should the row handle the cut columns?

| Option | Description | Selected |
|--------|-------------|----------|
| Redefine the grid for 7 columns (Recommended) | Drop items-count and sub-lines; rebalance tracks | ✓ |
| Keep the 9-column grid, leave cut cells blank | Preserve design positions for future API fields | |
| 7 columns, keep the empty space at the right | Minimal deviation from design metrics | |

**User's choice:** Redefine the grid for 7 columns
**Notes:** Cuts already sanctioned in REQUIREMENTS.md "Design Elements Cut". Blank columns would read as broken, not pending.

### Q3 — What should the row do in Phase 7? ⚠ OVERRIDE

| Option | Description | Selected |
|--------|-------------|----------|
| Chevron greyed-out, row not clickable (Recommended) | Visible but inert; Phase 10 turns it on | |
| No chevron until Phase 10 | Omit entirely | |
| Chevron live, expands to a placeholder | Prove the interaction early | |
| **Other (free text)** | **"Make each row just open order details"** | ✓ |

**User's choice:** *(free text)* — "Make each row just open order details"
**Notes:** Claude flagged that this contradicts the locked v1.1 decision ("`screen-detail.jsx` is NOT reused") and raised three mechanical problems: wrong data shape (`AdminOrder` has no `items[]`/address/subtotal), `screen-detail` renders mutating controls unsuitable for finished orders, and `onBack` hardcodes `setScreen('orders')`. Offered three readings of the intent; user chose "Detail genuinely usable in Phase 7, accepting rework."

### Q4 — Is the detail view permanent or interim?

| Option | Description | Selected |
|--------|-------------|----------|
| Interim — Phase 10 still builds inline expand | Phase 7 detail is knowingly throwaway | |
| Permanent — detail view supersedes inline expand | Reverses the locked decision; update roadmap docs | ✓ |
| Decide at Phase 10, on real usage | Leave the call open | |

**User's choice:** Permanent — "Yes, the details view must replace the inline expandable receipt"
**Notes:** Claude surfaced the full cost: HIST-10 rewritten, Phase 10 reduced to reprint + CSV, `history-expanded.png` and `HistoryReceiptRow` unimplemented, and the project's design-fidelity rule broken by explicit instruction.

### Q5 — Where does the detail-view work land?

| Option | Description | Selected |
|--------|-------------|----------|
| Phase 7 absorbs the detail view (HIST-10) | Phase 7 owns getOrder(id) + detail; Phase 10 shrinks | |
| Phase 7 routes; Phase 8 builds the detail view | Phase 7 stays a foundation; row alive day one | ✓ |
| Phase 7 absorbs it, drop the greyed-out convention | Fully live row, largest Phase 7 | |

**User's choice:** Phase 7 routes; Phase 8 builds the detail view
**Notes:** Requires inserting a new phase after 7; existing 8/9/10 shift to 9/10/11.

### Q6 — Reuse `screen-detail.jsx` or build new?

| Option | Description | Selected |
|--------|-------------|----------|
| New read-only history detail screen (Recommended) | Purpose-built; avoids two callers with different rules | |
| Reuse screen-detail.jsx in a read-only mode | `readOnly` prop hides mutating controls | ✓ |
| You decide at planning time | Planner reads the file and chooses | |

**User's choice:** Reuse screen-detail.jsx in a read-only mode
**Notes:** Chosen against the recommendation, accepting that the file serves two callers with different data shapes.

---

## Day headers + grouping basis

### Q1 — How is day revenue calculated?

| Option | Description | Selected |
|--------|-------------|----------|
| Completed only — exclude canceled and refunded (Recommended) | Honest reading of "revenue" given no refundAmount | ✓ |
| Completed + refunded, exclude canceled only | Literal design intent | |
| Everything except canceled, refunds shown separately | Transparent about the gap | |

**User's choice:** Completed only
**Notes:** The design's `total - refundAmount` is unimplementable — no `refundAmount` in the SDK. Counting a refunded order's full total would overstate the day.

### Q2 — What does the day count count?

| Option | Description | Selected |
|--------|-------------|----------|
| All rows shown that day (Recommended) | Count describes the list; revenue describes what was kept | ✓ |
| Completed only — match the revenue basis | Count and revenue reconcile exactly | |
| All rows, with canceled/refunded broken out | e.g. "6 orders (1 canceled)" | |

**User's choice:** All rows shown that day
**Notes:** A count excluding visible rows would read as a bug.

### Q3 — How should rows sort inside each day?

| Option | Description | Selected |
|--------|-------------|----------|
| Newest first, sorted client-side (Recommended) | Explicit createdAt desc; matches the screenshot | ✓ |
| Oldest first within the day | Chronological story of the day | |
| Whatever order the API returns | No client-side sort | |

**User's choice:** Newest first, sorted client-side
**Notes:** `listAdminOrders` documents no ordering guarantee — never rely on API array order.

### Q4 — What should the empty state say?

| Option | Description | Selected |
|--------|-------------|----------|
| One message, worded for the period (Recommended) | Reuse `h_empty`/`h_empty_sub`; filters phase swaps the sub-line | ✓ |
| Distinguish 'no orders' from 'none finished' | Separate message for in-flight-only windows | |
| Generic empty state, same copy always | One fixed string | |

**User's choice:** One message, worded for the period
**Notes:** Rejected variant leaks the finished-only rule into the UI for a rare edge case.

---

## Unready controls in Phase 7

### Q1 — What renders of the filter bar?

| Option | Description | Selected |
|--------|-------------|----------|
| Full bar, greyed-out and inert (Recommended) | Period, filters, search, Export — visible, dimmed | ✓ |
| Nothing — bare list | Controls arrive with their phases | |
| Only the period control, greyed-out | Partial; screen states its own scope | |

**User's choice:** Full bar, greyed-out and inert
**Notes:** Follows the project's standing greyed-out convention; no layout shift as phases activate controls.

### Q2 — Does Phase 7 render the summary strip? ⚠ AGAINST RECOMMENDATION

| Option | Description | Selected |
|--------|-------------|----------|
| Greyed-out placeholder tiles (Recommended) | Consistent with the greyed-out bar below | |
| Omit until its phase | List starts at top of content area | |
| Render tiles live, computed from the fetched list | Real numbers now; duplicates getAdminDashboard's job | ✓ |

**User's choice:** Render tiles live, computed from the fetched list
**Notes:** Claude cautioned that this duplicates logic `getAdminDashboard` exists to own and that the two sources would disagree at the edges. User accepted, then went further (Q3).

### Q3 — Which strip source wins long-term? ⚠ REVERSAL

| Option | Description | Selected |
|--------|-------------|----------|
| Client-computed permanently — drop getAdminDashboard | One source; tiles agree with day headers by construction | ✓ |
| Interim — the period phase swaps in getAdminDashboard | Keeps HIST-06 and the independent-failure criterion | |
| Both — server for totals, client for refunds | Literal HIST-06 reading | |

**User's choice:** Client-computed permanently — drop getAdminDashboard
**Notes:** Reverses the locked v1.1 decision "Summary strip is a second, independent data source." Rewrites HIST-06 and removes Phase 8's (now 9's) summary-strip scope including its independent loading/error criterion.

### Q4 — How should loading and error render?

| Option | Description | Selected |
|--------|-------------|----------|
| Skeleton rows + tiles, error replaces the table (Recommended) | No layout jump across states | ✓ |
| Simple centered spinner, then content | Least code; matches v1.0 screens | |
| Reuse whatever v1.0 screens do | App-wide consistency | |

**User's choice:** Skeleton rows + tiles, error replaces the table
**Notes:** Strip and list share one query, so one loading/error state covers both.

---

## Claude's Discretion

- **Sidebar placement + icon (HIST-01)** — not discussed; planner matches `desktop-history.png` (first nav group, clock-with-arrow icon). Icon likely needs adding to `src/icons.jsx`.
- **Role visibility** — whether the `kitchen` role sees History; screenshot only evidences cashier. Default cashier-visible.
- **SSE-driven refresh of the History list** — not discussed; likely unnecessary for a past-orders archive.

## Deferred Ideas

- **List virtualization** — if real-data volume makes the scroll drag (D-03 chose to measure first).
- **Business-day cutoff for day grouping** (~04:00 rollover) — rejected as unrequested configurability; revisit if staff report late-night orders on the wrong day.
- **>500-order warning banner** — superseded by D-03.
- **Distinct "no finished orders yet" empty state** — rejected as a rare edge case.
- **SSE-driven History refresh** — not scoped.
- **Persisting History filter state across navigation** — already deferred at milestone level; reset-on-leave accepted for v1.1.
