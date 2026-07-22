---
gsd_state_version: 1.0
milestone: v1.2
milestone_name: Branch Switching
current_phase: 14
current_phase_name: Branch-Scoped Cache Re-Scoping
current_plan: Not started
status: planning
stopped_at: Phase 14 context gathered
last_updated: "2026-07-22T13:26:56.008Z"
last_activity: 2026-07-22
last_activity_desc: Phase 13 complete, transitioned to Phase 14
progress:
  total_phases: 5
  completed_phases: 1
  total_plans: 2
  completed_plans: 2
  percent: 20
---

# State: SiteCare POS Desktop App

*This file is the project's memory. Update it at every phase transition and plan completion.*

---

## Project Reference

See: `.planning/PROJECT.md` (updated 2026-07-21 — v1.2 Branch Switching milestone started)

**Core value:** Restaurant staff can see, accept, and advance orders in real-time from a native desktop app that looks exactly like the design prototype.
**Current focus:** Phase 13 — branch-state-launch-seeding-foundation
**Project file:** `.planning/PROJECT.md`
**Roadmap:** `.planning/ROADMAP.md`
**Milestones:** `.planning/MILESTONES.md`

---

## Deferred Items

Items acknowledged and deferred at v1.1 milestone close on 2026-07-19 (`override_closeout`):

| Category | Item | Status |
|----------|------|--------|
| quick_task | kitchen-ticket-data-mapping (20260424) | missing |
| quick_task | order-card-item-groups (20260424) | missing |
| verification | Phase 8 verification hash-stale (Phase 12 commits touched shared files after Phase 8's verify) | audit-authoritative: passed (9/9, UAT 20/0) |

Both quick tasks are orphaned v1.0-era index entries (dated 2026-04-24, before v1.0 shipped 2026-05-22); v1.0 shipped complete with all 41 requirements. Phase 8's stale flag is benign git-hash staleness, not a functional gap — the milestone audit re-verified it as `passed`.

---

## Current Position

Phase: 14 — Branch-Scoped Cache Re-Scoping
Plan: 2 of 2
Status: Phase complete — ready for verification
Last activity: 2026-07-22 — Phase 13 complete, transitioned to Phase 14

Progress: [██████████] 100% (v1.2)

## Phase Summary

| Phase | Name | Status |
|-------|------|--------|
| 1 | Foundation | Complete — all 5 plans done, human-verified 2026-04-22 |
| 2 | Authentication | Complete — all 5 plans done and human-verified 2026-04-23 |
| 3 | Shell + Data Foundation | Complete — all 6 plans done, human-verified 2026-04-24 |
| 4 | Core Screens | Complete — all 10 plans done, 20/20 verification, 125 tests passing (2026-04-27) |
| 5 | Native Integration | Complete — 4 plans done, 166 tests passing, approved-no-hardware (2026-04-29) |
| 6 | Build Pipeline | Complete — all 4 plans done, human-approved 2026-05-02 |
| 7 | History Screen Foundation | Complete — 6/6 plans, UAT 26/26, human-verified 2026-07-17 — HIST-01, HIST-02, HIST-03, HIST-05, HIST-06, HIST-13 |
| 8 | Read-Only Order Detail View | Complete — 5/5 plans, UAT 20/20, security verified, human-verified 2026-07-17 — HIST-10 |
| 9 | Period Control | Complete — 5/5 plans, human checkpoint approved 2026-07-17 — HIST-04 (all four periods live: Today/7/30/Custom) |
| 10 | Filters + Search | Complete — 4/4 plans, UAT 2/2 passed, human-verified 2026-07-18 — HIST-07, HIST-08, HIST-09 |
| 11 | Reprint + CSV Export | Complete — 4/4 plans, human-verified 2026-07-19 — HIST-11, HIST-12 |
| 12 | Tech-Debt Closeout | Complete — 4/4 plans, human-verified 2026-07-19 — milestone audit re-derived to `passed` |
| 13 | Branch State & Launch Seeding Foundation | Not started — BSTATE-01, BSTATE-02 |
| 14 | Branch-Scoped Cache Re-Scoping | Not started — SCOPE-01 |
| 15 | SSE Branch-Aware Reconnect | Not started — SCOPE-02 |
| 16 | Branch Switcher UI, Switch Flow & Language Relocation | Not started — SWCH-01, SWCH-02, SWCH-03, SWCH-04, SCOPE-03, SCOPE-04, LANG-01 |
| 17 | Centralized Branch-Access Error Handling | Not started — BERR-01, BERR-02, BERR-03, BERR-04 |

---

## Performance Metrics

| Metric | Value |
|--------|-------|
| Phases completed (v1.0) | 6 / 6 |
| Phases completed (v1.1) | 6 / 6 |
| Phases completed (v1.2) | 0 / 5 |
| Requirements done (v1.0) | 41 / 41 |
| Requirements done (v1.1) | 13 / 13 |
| Requirements done (v1.2) | 0 / 15 |
| Sessions | 14 |

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
| Phase 08 P01 | ~5min | 2 tasks | 3 files |
| Phase 08 P02 | ~3min | 2 tasks | 4 files |
| Phase 08 P03 | ~6min | 2 tasks | 2 files |
| Phase 08 P04 | ~10min | 2 tasks | 2 files |
| Phase 08 P05 | ~8min | 2 tasks | 2 files |
| Phase 09 P01 | 12min | 3 tasks | 2 files |
| Phase 09 P02 | 5min | 2 tasks | 2 files |
| Phase 09 P3 | 10min | 2 tasks | 2 files |
| Phase 09 P04 | 13min | 3 tasks | 2 files |
| Phase 09 P05 | 11min (+ human checkpoint) | 3 tasks | 2 files |
| Phase 10 P01 | 12min | 3 tasks | 3 files |
| Phase 10 P02 | 6min | 2 tasks | 4 files |
| Phase 10 P03 | ~10min | 2 tasks | 2 files |
| Phase 10 P04 | 18min | 2 tasks | 2 files |
| Phase 11 P01 | 8min | 2 tasks | 6 files |
| Phase 11 P02 | 4min | 2 tasks | 3 files |
| Phase 11 P03 | 5min | 2 tasks | 4 files |
| Phase 11 P04 | ~15min | 2 tasks | 2 files |
| Phase 12 P01 | ~6min | 1 tasks | 1 files |
| Phase 12 P02 | 4min | 2 tasks | 2 files |
| Phase 12 P03 | 6min | 2 tasks | 4 files |
| Phase 12 P04 | ~12min (incl. checkpoint pause) | 3 tasks | 3 files |
| Phase 13 P01 | 6min | 3 tasks | 6 files |
| Phase 13 P02 | 8min | 1 tasks | 2 files |

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
- **Rows navigate to a read-only detail view; the inline expandable receipt is dropped** (D-07, 2026-07-17 — ⚠ REVERSES the earlier "inline expandable receipt row replaces the side detail panel; `screen-detail.jsx` is NOT reused"). `screen-detail.jsx` IS reused via a `readOnly` prop (D-09) that hides the mutating controls and routes back to History. User-directed and permanent, not interim scaffolding. Shipped in 07-05.
- **Summary strip is client-computed from the fetched list; `getAdminDashboard` is dropped permanently** (D-15, 2026-07-17 — ⚠ REVERSES the earlier "summary strip is a second, independent data source ... both fail independently"). One data source, one loading state, no independent failure; tiles and day headers agree by construction. The refunds tile stays count-only. Shipped in 07-04. Consequence: period control (Phase 9) retargets the strip for free.
- **Refunded is a first-class status** — derived from `paymentCaptureStatus: 'refunded'` (new in v1.1.59); sits alongside Completed and Canceled in the status filter.
- **Period presets replace raw date pickers** — Today / 7 / 30 / custom; default is last 30 days.
- **No server-side export endpoint** — CSV must be generated client-side (field escaping: wrap all fields in double-quotes, escape internal `"` as `""`). PDF deferred to v1.2.
- **The detail view requires a second, on-demand getOrder(id) call** — AdminOrder summary has no items/address/notes; `getOrder(id)` hydrates the read-only detail route (not an expanded row — D-07) and is the only source for handled-by, cancel reason, close time, and prep duration (via `events[]`). Deferred out of Phase 7 by D-08; it is the whole of Phase 8.
- **Filter state resets on navigation** — acceptable for v1.1; document as known behavior, not a bug.
- **History screen added to Zustand `screen` enum** — 'history' added alongside 'orders', 'kds', 'pos', 'menu', 'settings'; Zustand partialize rules carry forward unchanged.

### v1.2 Key Decisions (roadmap-stage)

- **Roadmap derived from reconciled research (SUMMARY/ARCHITECTURE/PITFALLS, all 2026-07-21)** — 5 phases (13–17), sequenced by the load-bearing dependency chain: state/seed → cache re-scoping → SSE reconnect → switcher UI/switch flow → centralized 403 handling. LANG-01 folded into Phase 16 (same sidebar-footer surface as the switcher) rather than given its own single-requirement phase, per granularity guidance; sequenced as the last item within that phase so it never blocks the functional branch work.
- **Two decisions deliberately left open for phase planning, not resolved by the roadmap:** (a) Phase 14 — branchId-keyed query keys vs. `queryClient.resetQueries()` as the cache re-scoping mechanism; (b) Phase 15 — the exact 403 signal shape `fetchEventSource`'s `onopen`/`onerror` surfaces for a branch-resolution failure (may need a build-time spike).
- **`currentBranch` and the accessible-branches list are session-only, never persisted** (mirrors D-09/D-10 from Pitfalls research) — always re-derived from `client.auth.getMe()` / `client.me.branches.list()`, never added to `store.js`'s `partialize`.
- **Single-branch-tenant regression is a standing verification item across all 5 phases**, not a one-time check — re-run login → orders → KDS → POS after every phase using a one-branch fixture.

### Open Questions (from research)

- ~~Does `@charlyk/admin-client` manage SSE auth internally (cookies) or expose a raw URL requiring Bearer?~~ — RESOLVED (Phase 2 context): SDK uses its own async-generator SSE client (not native `EventSource`), so Bearer headers can be sent through it. Safe for Phase 3 SSE wiring.
- ~~`decorations: false` has a known macOS bug~~ — RESOLVED: using `decorations: true` (native chrome).
- Tax calculation bug in `screen-pos.jsx` (total excludes tax) — confirm in Phase 4 whether API returns a server-calculated total (preferred) or the client must apply Romanian VAT rates (5%/9%/19%).
- Which thermal printer model(s) are targeted? Needed before Phase 5 plugin validation.
- ~~**v1.1:** Does the admin token have access to `/v1/orders/{id}` (kitchen endpoint)? If 401 on getOrder, detail view must fall back to AdminOrder summary fields only.~~ — RESOLVED (Phase 8 UAT, 2026-07-17): confirmed by human verification against the live API — opening a historical order hydrates via `getOrder(id)` and renders items, modifiers, phone, and address. No 401; no summary-only fallback needed. The merge-over-summary design (D-03) means a future 401 would degrade to summary fields rather than blanking.
- ~~**v1.1:** What timezone does the API treat `from`/`to` date params as? Verify Romanian orders appear on the correct calendar day.~~ — RESOLVED (07-06 human verification, 2026-07-17): confirmed by human verification against the live API — orders land under their correct Romanian calendar day, and the oldest day header is ~30 days back. The API's `from`/`to` params behave correctly for Romanian local calendar days.
- ~~**v1.1:** `AdminOrder.total` units (cents vs RON) — needs live API confirmation.~~ — RESOLVED (07-06 human verification, 2026-07-17): confirmed by human verification against the live API — total is in RON (the day-header revenue subtotal matched the SiteCare admin dashboard, i.e. NOT off by 100×). No `normalizeOrder` change needed.
- **v1.2:** Phase 14 — branchId-keyed query keys vs. `queryClient.resetQueries()`; decide explicitly during that phase's planning (see v1.2 Key Decisions above).
- **v1.2:** Phase 15 — confirm the actual `fetchEventSource` `onopen`/`onerror` 403 signal shape for a branch-resolution failure at build time.
- **v1.2:** Phase 16 — confirm whether the order/receipt payload already carries enough branch identity to make a print-time re-read moot (Pitfall 7 print-snapshot question).

### Critical Watch-Outs (carry forward)

- **CSP silently blocks everything** — `connect-src` in `tauri.conf.json` must include the API domain on day 1. Silent failure: screens empty, EventSource loops forever.
- **GitHub Package Registry auth breaks CI** — `.npmrc` must commit scope routing (`@charlyk:registry=https://npm.pkg.github.com`); use `NODE_AUTH_TOKEN: ${{ secrets.GITHUB_TOKEN }}` in Actions. Never commit a literal PAT.
- **EventSource cannot send auth headers** — Using @microsoft/fetch-event-source for SSE. Confirmed in Phase 3 plan.
- **React hook ordering in app.jsx** — useSSE and useOrders MUST be called before any conditional return (coldStartBusy, isAuthenticated guards). Violating this causes "rendered fewer hooks" runtime error. **v1.2: `useBranches()`/`useBranchSwitch()` must join this same unconditional block (Phase 13/16).**
- **macOS notarization is a hard distribution block** — Apple Developer account ($99/yr) required before Phase 6. Configure all CI secrets before the first release build.
- **TanStack Query v5 API** — useQuery takes single options object; useMutation uses .isPending not .isLoading. All Phase 3 hooks use v5 syntax.
- ~~**v1.1: Large result sets** — warn or limit if >500 orders returned for a wide date range~~ — SUPERSEDED by D-03 (2026-07-17): render every row, no cap, no warning, no virtualization. ~500 lightweight rows is within React's comfort; measure against real data before adding machinery. Virtualization deferred (see PROJECT.md deferred ideas).
- **v1.1: CSV escaping** — wrap all fields in double-quotes; escape internal `"` as `""`.
- **v1.1: Printer config check before Reprint** — reuse existing printer-configured guard; button greyed-out when not configured.
- **v1.2: Cold start never calls `getMe()`/`getSession()` today** — `authUser` is only populated inside `signIn()`; Phase 13 must add the `getMe()` call to the cold-start restore path too, or the branch (and `role`) stay unpopulated after every app relaunch with a remembered session.
- **v1.2: never persist `currentBranch`** — server re-validates `selected_branch_id` on every request; a persisted stale value would flash the wrong branch label before the first request self-corrects.
- **v1.2: never invalidate/reconnect optimistically on switch click** — only after `client.me.branches.switch` resolves (`onSuccess`, not adjacent to `.mutate()`); a 403 must leave the UI on the old branch.
- **v1.2: keep `enabled: !!client` as the sole gate on the 7 existing data hooks** — do not add a hard `!!branchId` block; single-branch tenants must see no first-paint delay (Pitfall 11).

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

*()*

### Notes

- **2026-07-17, 09-04 execution:** A concurrent commit (`89b7608 docs(10): create phase plan — 4
  plans, verification passed`) landed on `master` between this session's start and its
  `state.advance-plan` call, and appears to have overwritten `Current Plan`/`Total Plans in Phase`
  in this file's "Current Position" section from Phase 9's correct values (4/5) to Phase 10's plan
  count (4/4) via a race condition — both processes writing the same prose fields concurrently.
  Manually corrected here to `Current Plan: 5` / `Total Plans in Phase: 5` (verified via
  `gsd-tools query phase.list-plans 09` → 5 PLAN.md files on disk). Phase 09 is NOT ready for
  verification — `09-05-PLAN.md` (the custom-range popover, `autonomous: false`, SC2) remains.
  Flagging for awareness in case parallel phase-planning and phase-execution sessions need
  additional write coordination on `STATE.md`.

- **2026-07-17, 09-05 finalization:** No conflicting concurrent write was observed while finalizing
  this plan (checked `git status`/`git diff` on `STATE.md` before each write; only this session's
  own prior no-op frontmatter-patch timestamp bump was present). One tooling quirk, noted rather
  than fought: `gsd-tools query state.patch '{"status":"..."}'` accepted the write but the frontmatter
  `status:` key reverted to its prior value (`ready_to_execute`) on the next save — `syncStateFrontmatter`
  derives that key from a body-level `Status:`/`**Status:**Ready to plan
  not use (it uses `**Overall Status:**` prose instead), so a bare frontmatter patch with no matching
  body-field change is preservation-reverted by design. `current_plan`/`stopped_at`/progress counts all
  sync correctly via their own body fields (`**Current Plan:**Not started
  disk-scanned plan/summary counts) — only the top-level `status:` enum is affected. Left as
  `ready_to_execute` rather than force-written; the body's "Overall Status" prose and the Phase
  Summary table below are the accurate, human-facing source of truth for Phase 9's completion.

---
- 09-04 must update src/__tests__/screen-history.test.jsx (2 assertions) and src/__tests__/app-history-route.test.jsx (2 assertions) that still expect the removed 'Nicio comandă în ultimele 30 de zile.' literal — h_empty_prefix (09-02) was renamed but the consumer's tests were not in 09-02's scope. Full suite is 7 failed/342 passed until this lands.

### Roadmap Evolution

- Phase 12 added: Close CR-01 tax-in-fallback-total + HIST-06 traceability + WR-01 popover
- v1.2 roadmap created 2026-07-21: Phases 13–17 (Branch State & Launch Seeding Foundation → Branch-Scoped Cache Re-Scoping → SSE Branch-Aware Reconnect → Branch Switcher UI/Switch Flow/Language Relocation → Centralized Branch-Access Error Handling), 15/15 requirements mapped, no orphans. LANG-01 folded into Phase 16 rather than standalone (single-requirement, cosmetic, same sidebar-footer surface as the switcher).

## Session Continuity

**Resume file:** .planning/phases/14-branch-scoped-cache-re-scoping/14-CONTEXT.md

**Last session:** 2026-07-22T13:26:56.000Z
**Stopped at:** Phase 14 context gathered
**Next action:** `/gsd-plan-phase 13` — Branch State & Launch Seeding Foundation (BSTATE-01, BSTATE-02)

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
*Last updated: 2026-07-21 — v1.2 ROADMAP.md created (Phases 13–17); 15/15 requirements mapped*

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
- [Phase ?]: [Phase 08-01]: Removed handled-by from ROADMAP SC1 and REQUIREMENTS HIST-10 per D-09 — Order has no such field, only events[].actor (string|null, undocumented semantics)
- [Phase ?]: [Phase 08-01]: ROADMAP SC2 corrected 401/403 to 401/404 — GetOrderErrors documents only 401 and 404
- [Phase ?]: [Phase 08-01]: F-01 recorded in REQUIREMENTS.md — normalizeOrder yields an empty items array (never null) for AdminOrder summaries
- [Phase ?]: [Phase 08-02]: deriveDuration lives in history-utils.js (not screen-detail.jsx) — pure function, direct unit tests for hard edge cases, matches deriveDisplayStatus's raw-SDK-casing convention
- [Phase ?]: [Phase 08-02]: historyStatusMeta exported from screen-history.jsx (not duplicated, not extracted to a new module) — mirrors screen-orders.jsx's screen-to-screen meta-import precedent, makes D-05 row/detail agreement true by construction
- [Phase ?]: [Phase 08-03]: readOnly duration segment fully replaces (not appends to) the elapsed-since-now segment; built as a single conditional so the '·' separator only appears when deriveDuration returns non-null
- [Phase ?]: [Phase 08-03]: st chip binding: readOnly+non-null deriveDisplayStatus -> historyStatusMeta; readOnly+null -> stateMeta fallback (not historyStatusMeta's own completed default); not readOnly -> stateMeta unchanged (D-05)
- [Phase ?]: Phase 08-04: Modify button gate landed inside Task 1's header restructuring commit rather than Task 2 as the plan's task split implied; Task 2's diff is test-only (standing allowlist regression test), verified by transiently un-gating Modify and confirming 5 assertions fail without it
- [Phase ?]: Phase 08-04: readOnly items-card state machine keys on query state (detailError > detailLoading > items.length===0 > populated), not on the items value, per F-01 — items is [] both while loading and when genuinely empty
- [Phase ?]: [Phase 08-05]: add-alongside confirmed terminal for this phase (D-01/D-04 locked) — two useOrderDetail call sites against the same ['order', id] cache key; promote deferred to a future third OrderDetailScreen caller, diverging data needs, or prop growth past readOnly + three
- [Phase ?]: [Phase 08-05]: mergedHistoryOrder = {...historyOrder, ...(historyDetail ?? {})} computed near orderCount (not adjacent to the hooks) since it's a derived value, not a hook, with no ordering constraint
- [Phase ?]: [Phase 09-01]: getPresetRange returns null for any unrecognized id (including 'custom', undefined, null) rather than defaulting to a range — a typo in a caller must never render a period label that does not describe the fetched data (D-06)
- [Phase ?]: [Phase 09-01]: validateCustomRange evaluates incomplete -> end-before-start -> future -> too-long in that fixed order, first match wins, so a doubly-invalid range is always reported the same way
- [Phase ?]: [Phase 09-01]: formatDateRange's showYear boolean is computed once from both inclusive endpoints and fed to both Intl.DateTimeFormat option objects, making a mixed one-endpoint-with-year rendering structurally unreachable
- [Phase ?]: [Phase 09-02]: h_empty renamed (not duplicated) to h_empty_prefix carrying no trailing period or period name — sentence composition deferred to 09-04's component code (D-13)
- [Phase ?]: [Phase 09-02]: npx vitest run does not fully pass after this plan (4 pre-existing screen-history.jsx/app-history-route.jsx test assertions on the removed h_empty string) — reported per the plan's own instruction, not patched; 09-04 must update those 4 assertions when it updates the consumer
- [Phase ?]: 09-03: promoted the range from a mount-frozen constant to a caller-supplied parameter (assumption-delta chosen); add-alongside rejected to avoid a second, label-blind way to fetch history data
- [Phase ?]: [Phase 09-04]: settledPeriod effect gates on isSuccess && !isPlaceholderData (not isLoading/isError) — matches D-06's mechanism exactly and avoids advancing on stale flags during errors
- [Phase ?]: [Phase 09-04]: periodLabel()/periodPhrase() are the single lookup site for pill text, tile sub-labels, and empty-state copy (D-12) — FilterBar's own periods array now calls periodLabel() instead of a direct t() call so the pill's label and the tile's sub-label cannot drift
- [Phase ?]: [Phase 09-05]: CustomRangePopover exported (not module-private) so its fields/guardrails/Apply can be unit-tested in isolation ahead of FilterBar wiring — same testability precedent as historyStatusMeta's export
- [Phase ?]: [Phase 09-05]: periodLabel()/periodPhrase()'s 'custom' branches read period.customRange (not flat period.from/to), matching the { id, customRange } selectedPeriod shape; periodLabel falls back to t('h_period_custom') when customRange is absent
- [Phase ?]: [Phase 09-05]: Rule-1 fix — EmptyBlock's D-13 sentence composition now skips the trailing period when the phrase already ends with one, avoiding a double-dot with Romanian abbreviated month names (mar..) on custom-range empty states
- [Phase ?]: [Phase 10-01]: foldDiacritics targets the whole Unicode combining-marks block (not a hand-picked subset) so both modern comma-below and legacy cedilla ș/ț encodings fold identically
- [Phase ?]: [Phase 10-01]: matchesSearch mirrors screen-history.jsx's orderNumberLabel exactly (dailyOrderNumber when numeric, else id.slice(0,8)) so no row is unreachable by the text it displays
- [Phase ?]: [Phase 10-01]: matchesStatus delegates to deriveDisplayStatus with zero inline status literals; matchesType is mapping-free equality only — the 'local'->'dinein' translation stays at normalizeOrder (D-08, plan 10-02)
- [Phase ?]: [Phase 10-02]: normalizeOrder boundary fix scoped to a single expression at src/data.jsx:222 translating raw orderType 'local' to 'dinein' — delivery/pickup/absent pass through the existing ?? 'dinein' fallback chain unchanged; screen-pos.jsx's outbound orderTypeMap (dinein->local) is the deliberate inverse and stays untouched
- [Phase ?]: [Phase 10-03]: byTypeAndSearch computed once and reused by both the statusCounts tally and the visible/rows filter — one traversal of the type+search predicate, not two
- [Phase ?]: [Phase 10-03]: SummaryStrip's isEmptyState prop removed entirely (not left threaded-but-unused) once D-15's isError gate made it fully dead
- [Phase ?]: [Phase 10-03]: Export's inert opacity/pointerEvents styling moved from the shared marginLeft:auto wrapper onto the Export button itself, since that wrapper now also holds the activated search input
- [Phase ?]: EmptyBlock Variant B (filtersActive) is an early-return branch, keeping Variant A's period-composition logic completely unreachable/untouched when filters are active
- [Phase ?]: handleClearFilters composes exactly setStatusFilter/setTypeFilter/setQuery and never setSelectedPeriod — auditable at one call site (D-12/D-14)
- [Phase ?]: D-12 compose-with-period backstop written as a full automated test (not deferred) since Phase 9's period-pill plumbing was confirmed wired at execution time
- [Phase ?]: [Phase 11-01]: T-11-SC blocking-human legitimacy checkpoint for plugin-dialog resolved by orchestrator+human before dispatch; recorded as passed
- [Phase ?]: [Phase 11-01]: capabilities/default.json grants only dialog:allow-save + fs:allow-write-text-file, no fs:scope — dialog plugin session-extends fs write scope to the picked path (T-11-CAP)
- [Phase ?]: [Phase 11-01]: Cargo.lock regenerated via cargo check --lib (minimal 83-line diff) not cargo generate-lockfile (which bumped 517 unrelated packages) to keep the lockfile change scoped to the two new plugins
- [Phase ?]: buildCsv: order_number mirrors screen-history.jsx orderNumberLabel; monetary fields distinguish missing (empty) from explicit zero (0.00); RFC-4180 quoting and T-11 formula-injection guard compose (guard-first, quote-second)
- [Phase ?]: [Phase 11-03]: onPrint={handlePrint} added to the history-detail OrderDetailScreen block in app.jsx (Pitfall 1 closed); readOnly print row placed inside the existing order.items!=null right panel, gated as an added block (not a widened guard) so !readOnly Advance/Cancel stay hidden by construction (D-03)
- [Phase ?]: [Phase 11-03]: printerConfigured mount effect mirrors screen-printer.jsx's own load('preferences.json')->store.get('printer')->!!config?.port pattern; disabled styling reuses screen-history.jsx's inert-Export convention (opacity 0.5/pointerEvents none/cursor not-allowed), not .btn-disabled-offline (D-05)
- [Phase ?]: [Phase 11-04]: Tasks 1 and 2 landed in a single feat commit — Task 1's click-driven tests require Task 2's onClick/disabled button wiring to exist, so they were not independently committable (same precedent as Phase 08-04)
- [Phase ?]: [Phase 11-04]: rangeToFilenameDates() derives the export filename's end date as range.to minus one day (inclusive last day), never a raw slice of the exclusive range.to instant — mirrors formatDateRange's exclusive-to-inclusive-end conversion
- [Phase ?]: [Phase 11-04]: Export button's disabled/dimmed/tooltip state is now fully data-driven (visible.length === 0), replacing Phase 10's permanently-inert flag
- [Phase ?]: [Phase 12-01]: Verify-and-backfill only (D-05) — src/data.jsx left untouched; the CR-01/CR-02 fixes shipped earlier (30c89d8, 7d9810b), this plan adds the missing D-06 regression tests only
- [Phase ?]: [Phase 12-01]: Third test case ties the total assertion to the same asserted component fields (subtotal/tax/deliveryFee/tip/discount) rather than a hardcoded total, making the internal-consistency check structurally enforced
- [Phase ?]: [Phase 12-02]: D-09 HIST-06 traceability gap closed — 07-VERIFICATION.md and 07-04-SUMMARY.md edited to match already-correct REQUIREMENTS.md; REQUIREMENTS.md left untouched
- [Phase ?]: [Phase 12-03]: historySelection added as a new session-only Zustand slice (add-alongside), mirroring selectedOrder/historyOrder precedent exactly — not a promotion/generalization
- [Phase ?]: [Phase 12-03]: setScreen's D-03 reset is additive-conditional — screen/selectedOrder/historyOrder stay unconditional; only historySelection gets a target-keyed preserve/reset branch
- [Phase ?]: [Phase 12-03]: Rule-1 fix — setHistorySelection no-ops when every patched key already strictly equals its current value, preventing spurious re-renders/useHistoryOrders calls on a redundant filter click (zustand's set() always allocates a new top-level object, unlike React's primitive-value setState bail-out)
- [Phase ?]: [Phase 12-04]: Cited CR-01/CR-02 fix commits by SHA + description rather than relabeling, since the audit's original 'CR-01' (tax) does not match 10-REVIEW.md's own CR-01(percent-discount)/CR-02(tax) numbering
- [Phase ?]: [Phase 12-04]: Both /gsd-validate-phase runs (10, 11) found zero gaps and reconstructed VALIDATION.md directly from existing VERIFICATION.md/UAT.md evidence, no auditor subagent spawn needed
- [Phase ?]: [Phase 12-04]: Re-derived v1.1-MILESTONE-AUDIT.md verdict from tech_debt to passed — every CRITICAL/WARNING item resolved with SHA citation and/or live re-verification; only the 3 pre-existing v1.0 test failures remain, explicitly deferred
- [Roadmap]: [v1.2]: Roadmap derived from reconciled research (SUMMARY/ARCHITECTURE/PITFALLS) — 5 phases (13–17); LANG-01 folded into Phase 16 rather than a standalone single-requirement phase; two mechanism decisions (cache re-scoping approach in Phase 14, SSE 403 signal shape in Phase 15) deliberately left open for phase planning
- [Phase ?]: currentBranch is session-only and never persisted (D-10) — re-derived from getMe() every cold start
- [Phase ?]: Only a true 401 from getMe() expires the session; non-401 stays signed in with currentBranch null (D-03)
- [Phase ?]: signIn()'s optimistic setAuthUser(user) is superseded by a getMe()-sourced CurrentUser as source of truth (D-07)
- [Phase ?]: shell.jsx displayName composes firstName/lastName -> name -> email -> empty string; hardcoded 'Eduard Albu' literal fully removed (D-06)
- [Phase ?]: queryKey is ['branches'] (not branch-prefixed) — re-keying deferred to Phase 14 (D-09)
- [Phase ?]: enabled: !!client only for useBranches — no branchId/currentBranch gate, preserving SC5 single-branch first-paint
- [Phase ?]: No useBranchSwitch() and no app.jsx wiring this phase — deferred to Phase 16 (D-08)

## Operator Next Steps

- Plan Phase 13 with `/gsd-plan-phase 13` (Branch State & Launch Seeding Foundation — BSTATE-01, BSTATE-02)
