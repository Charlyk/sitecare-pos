# Phase 7: History Screen Foundation - Context

**Gathered:** 2026-07-17
**Status:** Ready for planning — ⚠ BLOCKED on roadmap reconciliation (see Roadmap Impact)

<domain>
## Phase Boundary

Staff can open a History screen from the sidebar and see the last 30 days of finished orders,
grouped by calendar day, with a live summary strip and working navigation into an order's detail.

**In scope:** HIST-01 (sidebar entry), HIST-02 (`listAdminOrders({from,to})` fetch), HIST-03 (30-day
default), HIST-05 (day-grouped list with per-day count + revenue), HIST-13 (empty state), plus
loading/error states. Two additions pulled in by decisions below: the client-computed summary strip
(rewritten HIST-06) and row → detail-route navigation (routing only, not the detail content).

**Out of scope:** period presets/custom range, status/type filters, search, CSV export, the detail
view's own content (items, address, prep time via `getOrder(id)`), reprint.

⚠ **Two locked v1.1 decisions were deliberately reversed during this discussion.** They change
requirements and phase structure beyond Phase 7. See `<roadmap_impact>` — do not plan Phase 7 in
isolation from it.

</domain>

<decisions>
## Implementation Decisions

### What counts as "history"

- **D-01:** History shows **finished orders only** — completed, canceled, refunded. `listAdminOrders`
  returns every order in the range including in-flight ones; filter them out client-side. Rationale:
  HIST-07's status filter has no bucket for an in-flight order, and day revenue must not change after
  the fact.
- **D-02:** **Refunded wins over completed.** A refunded order is `status: COMPLETED` +
  `paymentCaptureStatus: 'refunded'` — two orthogonal fields. Derive exactly one display status per
  row; refunded takes precedence and renders as Refunded (amber), never Completed. Keeps the design's
  single chip slot honest and makes the later status filters mutually exclusive.
- **D-03:** **Render every row — no cap, no warning, no virtualization.** Supersedes the STATE.md
  watch-out "warn or limit if >500 orders; document threshold." ~500 lightweight rows is within
  React's comfort; measure against real data before adding machinery. Virtualization is deferred.
- **D-04:** **Local Romanian day boundaries drive everything.** Send `from`/`to` as local-day
  boundaries converted to ISO instants, and group by local calendar day — not UTC. Staff reconcile
  against the till by the day they worked. No business-day cutoff (a 04:00 rollover was considered and
  rejected as unrequested configurability).

### Row + detail route

- **D-05:** Order column renders **`#dailyNumber`, falling back to a short UUID slice** when
  `dailyNumber` is null. The SDK's `id` is a UUID; `dailyNumber` is the human number. Follows the
  existing precedent in `normalizeOrder()` (`dailyOrderNumber: o.dailyOrderNumber ?? o.id`) and the
  v1.0 KDS ticket fix that made `dailyNumber` canonical. No date qualifier — the day header supplies
  that context.
- **D-06:** **Redefine the grid for 7 columns** — order #, customer, type, time, payment, status,
  total (+ chevron/affordance). Drop items-count and the source/address sub-lines entirely and
  rebalance track widths; do not leave blank cells in the design's 9-track `HIST_GRID`. The cuts are
  already sanctioned in REQUIREMENTS.md "Design Elements Cut".
- **D-07:** ⚠ **REVERSAL — rows navigate to an order detail view; the inline expandable receipt is
  dropped entirely.** This overrides the locked v1.1 decision *"Inline expandable receipt row replaces
  the side detail panel — screen-detail.jsx is NOT reused."* User-directed and deliberate, not drift.
  The detail view is **permanent**, not interim scaffolding.
- **D-08:** **Phase 7 routes only; a new phase builds the detail view.** Phase 7 ships rows that
  navigate to a detail route rendering the `AdminOrder` fields already fetched (customer, phone, type,
  total, payment, time). The `getOrder(id)` call that fills in items/address/prep belongs to the new
  phase. Phase 7 stays a foundation while the row is alive from day one.
- **D-09:** **Reuse `src/screen-detail.jsx` in a read-only mode** rather than building a new
  history-specific screen. Add a `readOnly` prop that hides the mutating controls (advance, cancel,
  print) and routes back to History. Chosen over a purpose-built read-only screen, accepting that the
  file then serves two callers with different data shapes.

### Day headers + grouping

- **D-10:** **Day revenue counts completed orders only** — canceled and refunded contribute nothing.
  The design's `total - refundAmount` is unimplementable: no `refundAmount` exists in the SDK, only a
  refunded flag. Counting a refunded order's full total would overstate the day.
- **D-11:** **The day count counts every visible row** in that day, including canceled and refunded.
  The count describes the list ("6 orders" above 6 rows); the revenue describes what was kept. A
  count that excluded visible rows would read as a bug.
- **D-12:** **Sort newest-first client-side within each day**, mirroring newest-day-first.
  `listAdminOrders` makes no documented ordering guarantee, so never rely on the API's array order.
- **D-13:** **One empty-state component, copy worded for the period** — reuse the design's two-line
  block (`h_empty` / `h_empty_sub`), e.g. "No orders in the last 30 days." The later filters phase
  swaps the sub-line when filters are active. No separate "none finished" variant.

### Unready controls + states

- **D-14:** **The full filter bar renders greyed-out and inert** — period presets, status/type
  filters, search, Export: visible, dimmed, not clickable. Follows the project's standing greyed-out
  convention; later phases activate controls without shifting layout. The "30 days" preset may render
  as selected since it reflects actual state.
- **D-15:** ⚠ **REVERSAL — the summary strip is live and client-computed from the fetched list, and
  `getAdminDashboard` is dropped permanently.** This overrides the locked v1.1 decision *"Summary
  strip is a second, independent data source."* Tiles agree with the day headers by construction; one
  data source, one loading state, no independent failure. The refunds tile stays count-only (no
  amount exists). Note: the endpoint's numbers would contradict a finished-only list anyway.
- **D-16:** **Skeleton rows + placeholder tiles while loading; on error a message with retry replaces
  the table area while the strip shows dashes.** No layout jump between loading, error, and content —
  the greyed-out bar already holds the page's shape.

### Claude's Discretion

- **Sidebar placement + icon (HIST-01).** Not discussed. `screenshots/desktop-history.png` shows
  History in the first nav group (after the kitchen/moped item) with a clock-with-arrow icon, in the
  cashier role. Planner should match the screenshot; the icon likely needs adding to `src/icons.jsx`
  (precedent: the `shield` icon added for settings in v1.0).
- **Role visibility.** Whether the `kitchen` role sees History was not decided. `navGroups` in
  `shell.jsx` is role-conditional; the screenshot only evidences the cashier role. Planner's call —
  default to cashier-visible, matching the screenshot.
- **Whether SSE should refresh the History list** when an order completes. Not discussed; History is
  a past-orders archive and `staleTime` alone is likely sufficient. Do not wire SSE without reason.

</decisions>

<roadmap_impact>
## ⚠ Roadmap Impact — reconcile BEFORE planning Phase 8+

Two user-directed reversals (D-07, D-15) invalidate requirements and phase boundaries that
ROADMAP.md, REQUIREMENTS.md, and STATE.md still assert. CONTEXT.md cannot carry these alone — a
downstream phase planned against the current documents would build features that have been overruled.

**Requirements to rewrite:**
- **HIST-06** — currently "summary strip ... from `getAdminDashboard`". Now: derived client-side from
  the fetched and filtered list; `getAdminDashboard` is not used. The tile set and count-only refunds
  are unchanged.
- **HIST-10** — currently "expand an inline read-only receipt ... via `getOrder(id)`". Now: row
  navigates to a read-only detail view (reusing `screen-detail.jsx`) hydrated via `getOrder(id)`.

**Phase structure (user-directed):** insert a new detail-view phase directly after Phase 7; existing
Phases 8, 9, 10 shift to 9, 10, 11.

| New | Was | Change |
|---|---|---|
| 7 | 7 | Absorbs the client-computed summary strip + detail routing |
| 8 | — | **NEW** — read-only detail view via `getOrder(id)` (rewritten HIST-10) |
| 9 | 8 | Period Control **only** — summary strip removed; SC 3 and 4 (independent strip loading/error) no longer apply |
| 10 | 9 | Filters + Search — unchanged |
| 11 | 10 | Reprint + CSV export — inline-expand criteria (SC 1, 2) removed; HIST-11, HIST-12 remain |

**STATE.md "v1.1 Key Decisions" entries now false** — both need correcting:
- *"Inline expandable receipt row replaces the side detail panel — `screen-detail.jsx` is NOT reused"*
- *"Summary strip is a second, independent data source — `getAdminDashboard({from,to})` backs it"*

Also stale: *"Expanded row requires a third, on-demand getOrder(id) call"* (still true, but it's now a
detail route, not an expanded row), and the watch-out *"warn or limit if >500 orders"* (superseded by
D-03).

**Design divergence (deliberate, user-instructed):** `HistoryReceiptRow` in `screen-history.jsx` and
`screenshots/history-expanded.png` will not be implemented. The project's design-fidelity rule requires
explicit instruction to break — this is it. Record in REQUIREMENTS.md "Design Elements Cut".

**Recommended:** run `/gsd-phase` to restructure the roadmap and update REQUIREMENTS.md + STATE.md
before `/gsd-plan-phase 8`. Phase 7 itself can be planned now — its own scope is settled.

</roadmap_impact>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Design source (authoritative for layout, spacing, color)
- `sitecare-orders/project/src/screen-history.jsx` — the design handoff. Prototype-era `window.*`
  globals and mock `HISTORY_ORDERS`/`HISTORY_SUMMARY`; port structure and styling, not the module
  pattern. `HIST_GRID` (line 14) is superseded by D-06; `HistoryReceiptRow` (lines 20–86) is dropped
  entirely by D-07.
- `sitecare-orders/project/screenshots/desktop-history.png` — the target. Evidences sidebar placement,
  the summary strip, filter bar, day headers, and row layout.
- `sitecare-orders/project/screenshots/order-history.png`, `order-history-zoom.png` — row detail.
- `sitecare-orders/project/screenshots/history-expanded.png` — ⚠ **superseded by D-07, do not
  implement.**

### Requirements + planning
- `.planning/REQUIREMENTS.md` — HIST-01/02/03/05/13 are Phase 7. "Design Elements Cut" table explains
  why items-count, source, address, and table are absent. ⚠ HIST-06 and HIST-10 are stale per
  `<roadmap_impact>`.
- `.planning/ROADMAP.md` § Phase 7 — goal + 4 success criteria. ⚠ Phase 8–10 entries are stale.
- `.planning/STATE.md` § v1.1 Key Decisions — ⚠ two entries now false per `<roadmap_impact>`.

### SDK (verified against installed types, v1.1.59)
- `node_modules/@charlyk/admin-client/dist/index.d.ts:261` — `AdminOrder`. Confirmed: `id` (UUID),
  `dailyNumber: number | null`, `status: string`, `orderType`, `customerName`, `customerPhone`,
  `total`, `paymentType`, `createdAt`, `paymentCaptureStatus`. **No `closedAt`, no `items[]`, no
  address, no `subtotal`, no `tax`.**
- `node_modules/@charlyk/admin-client/dist/index.d.ts:3180` — `ListAdminOrdersData`. Query is
  `{ from?: string, to?: string }` only — ISO 8601, `/v1/admin/orders`. No pagination, filter, sort,
  or search params. Confirms all filtering is client-side.
- `node_modules/@charlyk/admin-client/dist/index.d.ts:4893` — call path is
  `client.admin.orders.list({ query: { from, to } })`.

### Production code to follow
- `src/use-orders.js` — the hook pattern to mirror: `useQuery`, `useAuth()` for `client`,
  `if (result.error) throw`, unwrap `result.data`, `enabled: !!client`, `staleTime: 30_000`.
- `src/use-stats.js` — smallest example of the same shape.
- `src/data.jsx:195` — `normalizeOrder()`. Already maps `AdminOrder`-ish fields (`status`,
  `orderType`, `customerName`, `paymentType`, `createdAt`) and **converts money from cents** (`cRON`).
  Also `formatRON` (line 175), `SDK_STATE_MAP` (line 190).
- `src/screen-detail.jsx` — the detail surface to extend with a read-only mode (D-09).
- `src/screen-orders.jsx:7-33` — `sourceMeta`, `typeMeta`, `stateMeta`; `typeMeta` handles the
  `local`→Dine-in mapping.
- `src/shell.jsx:34-64` — `navGroups` + the screen→title map; both need a History entry.
- `src/store.js:45` — the `screen` enum comment and `partialize` (line 85); `openOrder()` (line 72)
  hardcodes `screen: 'detail'`.
- `src/app.jsx:224-230` — the screen router; `onBack` on line 227 hardcodes `setScreen('orders')`.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`normalizeOrder()` (`src/data.jsx`)** — handles most of the `AdminOrder` shape already. Critical:
  the SDK returns money in **cents** and `cRON` divides by 100 — history totals must go through it.
  Note it defaults `type` to `'dinein'` and `source` to `'counter'` when absent; with `source` cut
  from the row (D-06) that default is harmless here.
- **`formatRON()`** — `Intl.NumberFormat('ro-RO')` + " lei". The design strips the suffix in the total
  column via `.replace(' lei', '')`.
- **`typeMeta()` (`src/screen-orders.jsx`)** — already maps order types to icon + label including
  `local`→Dine-in. Reuse rather than re-deriving.
- **`screen-detail.jsx`** — the detail surface for D-09's read-only mode.
- **CSS utility classes** — `card`, `card shadow`, `chip`/`chip-sage`/`chip-red`/`chip-amber`,
  `btn-secondary`, `search`, `content-pad` all exist; the design uses them directly.

### Established Patterns
- **TanStack Query v5 owns server state; Zustand owns UI state.** `useHistoryOrders` (or similar)
  belongs alongside `use-orders.js`, keyed distinctly from `['orders']` — that key is SSE-owned and
  written by `use-sse.js`; a history query must not collide with it.
- **SDK `responseStyle: 'fields'`** — always check `result.error` then unwrap `result.data`. Never
  `try/catch` the call itself.
- **ES modules only** — the design file's `window.*` globals and `useStateHist` aliasing are
  prototype-era workarounds. Production uses named imports; zero `window.*` module globals remain.
- **i18n** — every user-facing string goes in `src/i18n.jsx` under both `ro` and `en`. The design
  references many new keys (`h_period_*`, `h_status_*`, `h_col_*`, `h_empty`, `h_orders_count`, …).
  Check for pre-existing keys before adding — v1.0 hit duplicate-key issues twice (`search_placeholder`).
- **Greyed-out convention** — unready features stay visible, disabled, not clickable (D-14).
- **Inline styles for computed values, classes for reusable structure** — the design already follows this.

### Integration Points
- **`src/shell.jsx`** — add a History `navGroups` entry (first group, per the screenshot) + a
  screen→title map entry.
- **`src/store.js`** — add `'history'` to the `screen` enum comment on line 45. `partialize` already
  persists `screen`, so History survives restart with no change. ⚠ Also add `'history'` to any
  screen-validation, or a persisted `screen: 'history'` could rehydrate into a blank render.
- **`src/app.jsx`** — add `{screen === 'history' && <HistoryScreen … />}` to the router. Both
  `openOrder()` and `screen-detail`'s `onBack` hardcode `'orders'`/`'detail'`; D-08's routing needs a
  History-aware path back. **Hook-ordering rule applies** — any new hook must be called before the
  conditional returns in `App()`, or React throws "rendered fewer hooks".
- **`src/icons.jsx`** — the History icon likely needs adding (precedent: `shield` in v1.0).

</code_context>

<specifics>
## Specific Ideas

- **"Make each row just open order details"** — the user's own words, and the origin of D-07/D-08/D-09.
  Restated and confirmed as permanent: the detail view *must* replace the inline expandable receipt.
  Confirmed while looking directly at the tradeoffs (throwaway wiring, wrong data shape, mutating
  controls, back-navigation) and accepted anyway.
- The user chose live client-computed summary tiles over a greyed-out placeholder — real numbers from
  day one mattered more than deferring to `getAdminDashboard`, and then chose to drop that endpoint
  outright rather than face a visible number-change when it landed.
- Consistent preference across both reversals: **fewer data sources, no interim fakery, ship
  something that actually works now** — even at the cost of design-handoff fidelity and a documented
  locked decision.

</specifics>

<deferred>
## Deferred Ideas

- **List virtualization** — if real-data volume makes the day-grouped scroll drag (D-03 chose to
  measure first). Revisit with production data.
- **Business-day cutoff for day grouping** (e.g. day ends at 04:00 so a late shift stays on one
  header) — considered under D-04, rejected as unrequested configurability. Revisit only if staff
  report late-night orders on the "wrong" day.
- **>500-order warning banner** — superseded by D-03; the filters phase largely solves the underlying
  need.
- **Distinct "no finished orders yet" empty state** — considered under D-13, rejected as a rare edge
  case that leaks the finished-only rule into the UI.
- **SSE-driven History refresh** — not discussed, not scoped. Listed under Claude's Discretion.
- **Persisting History filter state across navigation** — already deferred at the milestone level
  (REQUIREMENTS.md "Future Requirements"); reset-on-leave is accepted for v1.1.

</deferred>

---

*Phase: 7-History Screen Foundation*
*Context gathered: 2026-07-17*
