---
gsd_state_version: 1.0
milestone: v1.1
milestone_name: Orders History Screen
current_phase: 8 — Period Control + Summary Strip
current_plan: Not started
status: ready_to_execute
stopped_at: Completed 07-06-PLAN.md (app.jsx router wiring + human-verified checkpoint; Phase 7 complete)
last_updated: "2026-07-17T09:25:32.297Z"
progress:
  total_phases: 4
  completed_phases: 1
  total_plans: 6
  completed_plans: 6
  percent: 25
---

# State: SiteCare POS Desktop App

*This file is the project's memory. Update it at every phase transition and plan completion.*

---

## Project Reference

See: `.planning/PROJECT.md` (updated 2026-07-16)

**Core value:** Restaurant staff can see, accept, and advance orders in real-time from a native desktop app that looks exactly like the design prototype.
**Current focus:** Phase 07 — history-screen-foundation
**Project file:** `.planning/PROJECT.md`
**Roadmap:** `.planning/ROADMAP.md`
**Milestones:** `.planning/MILESTONES.md`

---

## Current Position

**Milestone:** v1.1 Orders History Screen — STARTED 2026-05-27, REPLANNED 2026-07-16
**Current Phase:** 8 — Period Control + Summary Strip
**Current Plan:** Not started
**Total Plans in Phase:** 6
**Overall Status:** Phase 7 executing. Plan 07-01 (history-utils + normalizeOrder dailyNumber fix)
complete — 3 tasks committed, 27+6 new unit tests green. Ready for the remaining Wave 1 plan
(07-02) and subsequent waves.

```
Progress: [██████████] 100% (1/6 plans, phase 7)
Milestone v1.1 — Phase 7 in progress
```

---

## Phase Summary

| Phase | Name | Status |
|-------|------|--------|
| 1 | Foundation | Complete — all 5 plans done, human-verified 2026-04-22 |
| 2 | Authentication | Complete — all 5 plans done and human-verified 2026-04-23 |
| 3 | Shell + Data Foundation | Complete — all 6 plans done, human-verified 2026-04-24 |
| 4 | Core Screens | Complete — all 10 plans done, 20/20 verification, 125 tests passing (2026-04-27) |
| 5 | Native Integration | Complete — 4 plans done, 166 tests passing, approved-no-hardware (2026-04-29) |
| 6 | Build Pipeline | Complete — all 4 plans done, human-approved 2026-05-02 |
| 7 | History Screen Foundation | Planned — 6 plans in 4 waves, ready to execute — HIST-01, HIST-02, HIST-03, HIST-05, HIST-13 |
| 8 | Period Control + Summary Strip | Not started — HIST-04, HIST-06 |
| 9 | Filters + Search | Not started — HIST-07, HIST-08, HIST-09 |
| 10 | Receipt Detail + Output | Not started — HIST-10, HIST-11, HIST-12 |

---

## Performance Metrics

| Metric | Value |
|--------|-------|
| Phases completed (v1.0) | 6 / 6 |
| Phases completed (v1.1) | 0 / 4 |
| Requirements done (v1.0) | 41 / 41 |
| Requirements done (v1.1) | 0 / 13 |
| Sessions | 13 |

---
**Per-Plan Metrics:**

| Plan | Duration | Tasks | Files |
|------|----------|-------|-------|
| Phase 07 P01 | ~2 minutes | 3 tasks | 4 files |
| Phase 07 P02 | 3min | 3 tasks | 5 files |
| Phase 07 P03 | 5min | 2 tasks | 2 files |
| Phase 07 P05 | 9min | 2 tasks | 2 files |
| Phase 07 P04 | 20min | 3 tasks | 2 files |
| Phase 07 P06 | ~7min + checkpoint | 3 tasks | 2 files |

## Accumulated Context

### Key Decisions Logged

- **Window chrome:** `decorations: true` (native OS chrome). Custom macOS titlebar from prototype NOT used. Avoids `@tauri-apps/plugin-window-state` bug #14822.
- **Scaffold location:** Tauri+Vite at repo root. Prototype archived to `_prototype/`.
- **CSS migration:** `index.html` `<style>` block → `src/styles.css`. `colors_and_type.css` unchanged. Both imported in `main.jsx`.
- **API domain:** `https://api.restaurant.sitecare.ro` — configured in `tauri.conf.json` `connect-src` and `event-src` (done in Plan 01, confirmed in Plan 02).
- **Vite pinned to ^6.4.2, React ^18.3.1** — Tauri v2 validated against these versions; jumping to Vite 7/8 or React 19 introduces unvalidated risk.
- **Prototype kept in _prototype/** — Plans 04-05 read these files during ES module conversion; removing would require git archaeology.
- **Tauri plugins installed via `tauri add` CLI** — handles npm, Cargo, and capabilities atomically; requires `cargo` in PATH (source `~/.cargo/env` before running).
- **window-state in desktop.json + default.json** — `tauri add` auto-creates `desktop.json` (platform-scoped); plan also requires `default.json` entry; Tauri merges both at runtime, no conflict.
- **@charlyk/admin-client has zero peer dependencies** — no additional installs needed; installed from GitHub Package Registry with `NODE_AUTH_TOKEN` env var.
- **Cargo.lock committed** — ensures reproducible Rust builds in CI and on other machines.
- **Font path strategy:** @font-face uses absolute `/fonts/` paths (not relative `./fonts/`) so fonts resolve correctly when CSS lives in `src/` but font files live in `public/fonts/`.
- **Zustand partialize:** 6 persisted keys (screen, role, lang, accent, density, sidebarCollapsed); 3 session-only keys excluded (selectedOrder, toasts, acceptDialog).
- **store.js localStorage comments are documentation only** — comments explain migration provenance; no functional `localStorage.` API calls exist in production code.
- **setScreen('orders') not setScreen('login') on sign-out/expire** — 'login' is not a valid Zustand-persisted screen enum value; auth guard in app.jsx renders LoginScreen whenever isAuthenticated=false.
- **MIN_RETRY_MS = 30_000 floor on scheduleRefresh** — the <= 0 (already-expired) branch wraps doRefresh in setTimeout with 30s minimum to prevent tight async loops hammering the auth endpoint.
- **canSubmit uses isValidEmail(email) not email !== ''** — Submit button disabled for invalid email format; handleSubmit guard retained as secondary safety net for Enter-key edge case.
- **Fragment import in screen-detail.jsx** — prototype used `React.Fragment` from CDN global; production uses named `Fragment` import from 'react'. JSX shorthand `<>` would also work.
- **shield icon added to icons.jsx** — screen-settings.jsx uses `<Icon name="shield" />` for fiscal register display; icon was missing from prototype's icons.jsx; added to production version.
- **App.jsx scaffold renamed to app.jsx** — used `git mv` on macOS case-insensitive filesystem; production entry is lowercase `app.jsx`; git history preserved.
- **AcceptDialog local state** — `picked`, `custom`, `useCustom` are dialog-only ephemeral values; kept in component `useState`, not in global Zustand store.
- **orders=[] stub in Phase 1 screen router** — `orderCount` hardcoded to `{live:0, new:0, active:0}`; Phase 3 replaces this with live data from `useOrders()`.
- **ES module migration complete** — all 12 prototype files migrated; zero `window.*` module globals remain in any `src/*.jsx` file (verified by grep audit after Plan 05).
- **Phase 3 SSE approach confirmed** — @microsoft/fetch-event-source (not native EventSource) required for Bearer auth header. Token exposed from AuthProvider context (token state alongside tokenRef). useSSE mounted in App authenticated branch (not Shell component). isConnected is sole offline signal (no navigator.onLine). Cache key ['orders'] is canonical root shared by useSSE.setQueryData and useOrderActions.invalidateQueries.
- **Phase 3 hook placement** — useSSE and useOrders called unconditionally at top of App() function (before conditional returns) so React hook rules are respected. The `if (!token)` guard inside useSSE handles null token during cold-start safely.
- **statusToSDK map** — module-level const in app.jsx mapping UI state names to SDK enum values; `done→COMPLETED`, `out→OUT_FOR_DELIVERY`; fallback `.toUpperCase()` for unknown states.
- **snapshotDone ref (100ms)** — useSSE uses a `useRef` flag set via `setTimeout(100)` in `onopen` to distinguish initial SSE snapshot events from live events; prevents sound burst on app load.
- **App() t binding** — `const t = useT(lang)` added to App() scope so AcceptDialog onConfirm callbacks can call `t()` for toast strings; AcceptDialog child component has its own `t` binding for its own render.
- **handleLiveOrder with useCallback** — sound trigger callback wrapped in `useCallback([soundMuted])` to maintain stable identity in useSSE dependency array and prevent unnecessary SSE reconnects on re-renders.
- **CancelDialog is dumb** — calls `onConfirm(reason)`, app.jsx handles `updateStatus.mutate`; same pattern as AcceptDialog. Dialog stays open on error (setCancelDialog NOT called in onError).
- **Cancel button visibility guard** — `order.state !== 'done' && order.state !== 'cancelled'` prevents Cancel appearing on terminal orders; API also enforces transition validity server-side.
- **KDS timer 60000ms** — KDS-02 spec says "updated every minute"; 60s rerender is sufficient for minute-resolution elapsed display; do not revert to 30000.
- **KDS mute toggle uses bell icon for both states** — `bell-off` does not exist in icons.jsx; muted state communicated via `t('sound_off')` label + opacity 0.6 on the btn-secondary button.
- **search_placeholder key pre-existed in i18n.jsx** — key at line 15 (ro) / line 181 (en) was added in Phase 3 for Shell topbar; ORD-03 plan reused the same key; only net-new keys `search_no_results` and `search_no_results_sub` were added to avoid duplicates.
- **orderTypeMap module-level const in screen-pos.jsx** — maps UI order types to SDK enum values; `dinein→local` is critical (SDK rejects 'dinein'); defined as const prevents user tampering.
- **Discount is client-side display only** — SDK `CreateKitchenOrderBody` has no discount field; server computes authoritative total; client-side discount shown for staff awareness only.
- **createOrder.isPending disables Ring Up** — prevents double-submit on rapid clicks; follows T-04-06-04 threat mitigation.
- **onCreate prop removed from PosScreen** — mutation is now internal to PosScreen; app.jsx no longer passes an empty `onCreate={() => {}}` stub.
- **toggleStock body-only (no path param)** — SDK UpdateProductStockData.path is 'never'; correct call is `updateStock({ body: { productId, inStock } })` with productId in body, no path argument.
- **toggleAll removed from MenuScreen** — bulk "All available" / "All out" localStorage writes have no API equivalent; buttons removed entirely.
- **Menu category filter uses cats.find()** — normalized items from useMenu() don't carry a static `.cat` field; category association resolved via `cats.find(c => c.items.some(ci => ci.id === it.id))`.
- **Description column removed from menu table** — static MENU_ITEMS had `it.desc`; normalized API items have no description field; column count reduced from 6 to 5.
- **Display tab uses storeLang for density labels** — density button labels render using `storeLang` (from Zustand) not the `lang` prop so labels always match stored language preference; the two should be in sync but Zustand is authoritative.
- **ACCENT_SWATCHES module-level const** — avoids per-render array allocation; swatch active state communicated via box-shadow ring + scale(1.1) transform.
- **display_tab i18n key added to both sections** — other display keys (display_lang_label, display_density_label, display_accent_label) were already present from prior plans; only display_tab was missing.

### v1.1 Key Decisions

- **No server-side pagination or filtering** — confirmed against SDK v1.1.59 types: `listAdminOrders({from,to})` returns the full set for the date range. All status/type/search filtering is client-side on the fetched array.
- **No pagination at all** — the new design is a day-grouped scroll, not a paged list. The old HIST-05 pagination requirement is dropped. Infinite scroll is also out.
- **Inline expandable receipt row replaces the side detail panel** — `screen-detail.jsx` is NOT reused; the receipt renders inline within the expanded row.
- **Summary strip is a second, independent data source** — `getAdminDashboard({from,to})` (new in v1.1.59) backs it alongside `listAdminOrders`. Both are driven by the same period selection but fail independently.
- **Refunded is a first-class status** — derived from `paymentCaptureStatus: 'refunded'` (new in v1.1.59); sits alongside Completed and Canceled in the status filter.
- **Period presets replace raw date pickers** — Today / 7 / 30 / custom; default is last 30 days.
- **No server-side export endpoint** — CSV must be generated client-side (field escaping: wrap all fields in double-quotes, escape internal `"` as `""`). PDF deferred to v1.2.
- **Expanded row requires a third, on-demand getOrder(id) call** — AdminOrder summary has no items/address/notes; `getOrder(id)` is fetched lazily on row expand and is the only source for handled-by, cancel reason, close time, and prep duration (via `events[]`).
- **Filter state resets on navigation** — acceptable for v1.1; document as known behavior, not a bug.
- **History screen added to Zustand `screen` enum** — 'history' added alongside 'orders', 'kds', 'pos', 'menu', 'settings'; Zustand partialize rules carry forward unchanged.

### Open Questions (from research)

- ~~Does `@charlyk/admin-client` manage SSE auth internally (cookies) or expose a raw URL requiring Bearer?~~ — RESOLVED (Phase 2 context): SDK uses its own async-generator SSE client (not native `EventSource`), so Bearer headers can be sent through it. Safe for Phase 3 SSE wiring.
- ~~`decorations: false` has a known macOS bug~~ — RESOLVED: using `decorations: true` (native chrome).
- Tax calculation bug in `screen-pos.jsx` (total excludes tax) — confirm in Phase 4 whether API returns a server-calculated total (preferred) or the client must apply Romanian VAT rates (5%/9%/19%).
- Which thermal printer model(s) are targeted? Needed before Phase 5 plugin validation.
- **v1.1:** Does the admin token have access to `/v1/orders/{id}` (kitchen endpoint)? If 401 on getOrder, detail view must fall back to AdminOrder summary fields only.
- ~~**v1.1:** What timezone does the API treat `from`/`to` date params as? Verify Romanian orders appear on the correct calendar day.~~ — RESOLVED (07-06 human verification, 2026-07-17): confirmed by human verification against the live API — orders land under their correct Romanian calendar day, and the oldest day header is ~30 days back. The API's `from`/`to` params behave correctly for Romanian local calendar days.
- ~~**v1.1:** `AdminOrder.total` units (cents vs RON) — needs live API confirmation.~~ — RESOLVED (07-06 human verification, 2026-07-17): confirmed by human verification against the live API — total is in RON (the day-header revenue subtotal matched the SiteCare admin dashboard, i.e. NOT off by 100×). No `normalizeOrder` change needed.

### Critical Watch-Outs (carry forward)

- **CSP silently blocks everything** — `connect-src` in `tauri.conf.json` must include the API domain on day 1. Silent failure: screens empty, EventSource loops forever.
- **GitHub Package Registry auth breaks CI** — `.npmrc` must commit scope routing (`@charlyk:registry=https://npm.pkg.github.com`); use `NODE_AUTH_TOKEN: ${{ secrets.GITHUB_TOKEN }}` in Actions. Never commit a literal PAT.
- **EventSource cannot send auth headers** — Using @microsoft/fetch-event-source for SSE. Confirmed in Phase 3 plan.
- **React hook ordering in app.jsx** — useSSE and useOrders MUST be called before any conditional return (coldStartBusy, isAuthenticated guards). Violating this causes "rendered fewer hooks" runtime error.
- **macOS notarization is a hard distribution block** — Apple Developer account ($99/yr) required before Phase 6. Configure all CI secrets before the first release build.
- **TanStack Query v5 API** — useQuery takes single options object; useMutation uses .isPending not .isLoading. All Phase 3 hooks use v5 syntax.
- **v1.1: Large result sets** — warn or limit if >500 orders returned for a wide date range; document threshold.
- **v1.1: CSV escaping** — wrap all fields in double-quotes; escape internal `"` as `""`.
- **v1.1: Printer config check before Reprint** — reuse existing printer-configured guard; button greyed-out when not configured.

### Quick Tasks Completed

| Date | Slug | Description |
|------|------|-------------|
| 2026-04-24 | order-card-item-groups | Split OrderCard items preview into menu items + global products/delivery fee groups with dashed divider |
| 2026-04-24 | kitchen-ticket-data-mapping | Fix KitchenTicket: use dailyOrderNumber, add estimatedMinutes fallback, filter out global products |
| 2026-04-24 | show-item-options-order-card | Show selected product options (mods) as subtitle below each item name in OrderCard items preview |
| 2026-04-24 | pos-delivery-address-area | Structured address fields (street/number/bloc/apt/floor/intercom) + delivery zone picker with dynamic fee in POS manual order form |
| 2026-05-06 | add-logout-user-sidebar | Add logout dropdown to sidebar user chip — clicking shows popover with Log out button | [260506-q1](.planning/quick/260506-q1-add-logout-user-sidebar/) |
| 2026-05-07 | hide-settings-tabs | Hide all settings tabs except Afisaj (display) — others not yet implemented | [260507-q1](.planning/quick/260507-q1-hide-settings-tabs/) |
| 2026-05-11 | pos-product-images | Map imageUrl from API response and render product images in POS screen cards; add https: to CSP img-src |
| 2026-05-22 | refresh-orders-stats | Wire Reîmprospătează button to invalidate ['orders'] and ['stats'] caches | [260522-q1](.planning/quick/260522-q1-refresh-orders-stats/) |

### Todos

*(None)*

### Blockers

*(None)*

---

## Session Continuity

**Resume file:** None

**Last session:** 2026-07-17T09:19:31.590Z
**Stopped at:** Completed 07-06-PLAN.md (app.jsx router wiring + human-verified checkpoint; Phase 7 complete)
**Next action:** `/gsd-execute-phase 7` — execute Phase 7 (History Screen Foundation)

**Phase 7 planning notes:**

- Wave 1: 07-01 (history-utils + normalizeOrder `dailyNumber` fix) ∥ 07-02 (i18n + store + sidebar nav)
- Wave 2: 07-03 (useHistoryOrders hook) ∥ 07-05 (screen-detail readOnly)
- Wave 3: 07-04 (HistoryScreen) · Wave 4: 07-06 (app.jsx router + blocking human checkpoint)
- **Two open v1.1 questions are deliberately unresolved and routed to the Plan 06 human checkpoint**
  (they need live API access; a mocked test would encode the assumption rather than verify it):
  server `from`/`to` timezone interpretation, and `AdminOrder.total` cents-vs-RON. See
  `07-VALIDATION.md` → Manual-Only Verifications and `COVERAGE.md` → Edge-probe accounting.

- **Routing decision:** `add-alongside` (`openHistoryOrder` / `screen: 'history-detail'`) rather than
  generalizing `openOrder()`. Recorded as accepted debt in `07-02-PLAN.md`'s
  `<assumption_delta_decision>`; the next phase's `getOrder(id)` is what should force a promote.

- **⚠ Phases 8–10 in ROADMAP.md are stale** — CONTEXT.md `<roadmap_impact>` (D-07/D-15 reversals)
  requires `/gsd-phase` to insert the new detail-view phase and rewrite HIST-06/HIST-10 before
  Phase 8 is planned. Phase 7 itself is unaffected.

---
*State initialized: 2026-04-22*
*Last updated: 2026-07-16 — v1.1 roadmap replanned; 4 phases (7–10), 13 requirements*

## Decisions

- [Phase 07]: normalizeOrder's dailyOrderNumber fallback chain extended to o.dailyOrderNumber ?? o.dailyNumber ?? o.id (D-05) — additive only, kitchen Order path unchanged
- [Phase 07]: history-utils.js stays pure: no react/data.jsx/@charlyk imports, no re-division by 100, no UTC-slicing day keys (Nyquist Wave-0 target)
- [Phase 07]: add-alongside (not promote): openHistoryOrder()/'history-detail' ship as a parallel pair to openOrder()/'detail'; live order path stays byte-identical (D-07/D-08)
- [Phase 07]: History nav item is cashier-only — added to the non-kitchen arm of the navGroups ternary only
- [Phase 07]: useHistoryOrders() uses useState lazy initializer for getLast30DaysRange() to keep query key stable across re-renders and avoid infinite refetch loop
- [Phase 07]: useHistoryOrders() returns the order array directly as data (not { ...rest, orders }) since AdminOrderListResponse has no sibling fields worth preserving
- [Phase 07]: order.items != null used as the single gating condition for the items card/thermal rail/grid collapse; !readOnly used directly for the remaining gated regions
- [Phase 07]: Minimal totals card reuses existing card/chip classes, orderTimeLabel, formatRON, and the pre-existing total i18n key - no new CSS class or i18n key added
- [Phase ?]: Phase 07: Avg summary tile shows a computed zero (not em-dash) when the whole period has zero finished orders; em-dash reserved for the error state
- [Phase ?]: Phase 07: HistoryScreen's inert filter bar unrolls period-preset pills as explicit buttons (not mapped) so the D-14 30-day full-opacity exception is independently readable in source
- [Phase ?]: [Phase 07]: Confirmed by human verification against the live API on 2026-07-17: AdminOrder.total is in RON, not cents (day-header revenue subtotal matched the SiteCare admin dashboard).
- [Phase ?]: [Phase 07]: Confirmed by human verification against the live API on 2026-07-17: the API's from/to date params behave correctly for Romanian local calendar days.
