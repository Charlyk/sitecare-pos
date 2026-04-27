---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
current_phase: 5 — Native Integration
current_plan: ""
status: ready-to-plan
stopped_at: ""
last_updated: "2026-04-27T23:59:00.000Z"
progress:
  total_phases: 6
  completed_phases: 4
  total_plans: 36
  completed_plans: 34
  percent: 94
---

# State: SiteCare POS Desktop App

*This file is the project's memory. Update it at every phase transition and plan completion.*

---

## Project Reference

**Core Value:** Restaurant staff can see, accept, and advance orders in real-time from a native desktop app that looks exactly like the design prototype.
**Project file:** `.planning/PROJECT.md`
**Requirements:** `.planning/REQUIREMENTS.md`
**Roadmap:** `.planning/ROADMAP.md`

---

## Current Position

**Current Phase:** 5 — Native Integration
**Current Plan:** —
**Phase Status:** Phase 5 not started
**Overall Status:** Phase 4 complete; ready to discuss/plan Phase 5

```
Progress: [##################################.....] 67% (4/6 phases)
Phase 4 of 6 complete — 125 tests passing, 20/20 verification score
```

---

## Phase Summary

| Phase | Name | Status |
|-------|------|--------|
| 1 | Foundation | Complete — all 5 plans done, human-verified 2026-04-22 |
| 2 | Authentication | Complete — all 5 plans done and human-verified 2026-04-23 |
| 3 | Shell + Data Foundation | Complete — all 6 plans done, human-verified 2026-04-24 |
| 4 | Core Screens | Complete — all 10 plans done, 20/20 verification, 125 tests passing (2026-04-27) |
| 5 | Native Integration | Not started |
| 6 | Build Pipeline | Not started |

---

## Performance Metrics

| Metric | Value |
|--------|-------|
| Phases completed | 3 / 6 |
| Requirements done | 29 / 41 |
| Plans complete | 23 / 31 (Phase 1: 5, Phase 2: 5, Phase 3: 6, Phase 4: 8/9) |
| Sessions | 13 |

---

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

### Open Questions (from research)

- ~~Does `@charlyk/admin-client` manage SSE auth internally (cookies) or expose a raw URL requiring Bearer?~~ — RESOLVED (Phase 2 context): SDK uses its own async-generator SSE client (not native `EventSource`), so Bearer headers can be sent through it. Safe for Phase 3 SSE wiring.
- ~~`decorations: false` has a known macOS bug~~ — RESOLVED: using `decorations: true` (native chrome).
- Tax calculation bug in `screen-pos.jsx` (total excludes tax) — confirm in Phase 4 whether API returns a server-calculated total (preferred) or the client must apply Romanian VAT rates (5%/9%/19%).
- Which thermal printer model(s) are targeted? Needed before Phase 5 plugin validation.

### Critical Watch-Outs (carry forward)

- **CSP silently blocks everything** — `connect-src` in `tauri.conf.json` must include the API domain on day 1. Silent failure: screens empty, EventSource loops forever.
- **GitHub Package Registry auth breaks CI** — `.npmrc` must commit scope routing (`@charlyk:registry=https://npm.pkg.github.com`); use `NODE_AUTH_TOKEN: ${{ secrets.GITHUB_TOKEN }}` in Actions. Never commit a literal PAT.
- **EventSource cannot send auth headers** — Using @microsoft/fetch-event-source for SSE. Confirmed in Phase 3 plan.
- **React hook ordering in app.jsx** — useSSE and useOrders MUST be called before any conditional return (coldStartBusy, isAuthenticated guards). Violating this causes "rendered fewer hooks" runtime error.
- **macOS notarization is a hard distribution block** — Apple Developer account ($99/yr) required before Phase 6. Configure all CI secrets before the first release build.
- **TanStack Query v5 API** — useQuery takes single options object; useMutation uses .isPending not .isLoading. All Phase 3 hooks use v5 syntax.

### Quick Tasks Completed

| Date | Slug | Description |
|------|------|-------------|
| 2026-04-24 | order-card-item-groups | Split OrderCard items preview into menu items + global products/delivery fee groups with dashed divider |
| 2026-04-24 | kitchen-ticket-data-mapping | Fix KitchenTicket: use dailyOrderNumber, add estimatedMinutes fallback, filter out global products |
| 2026-04-24 | show-item-options-order-card | Show selected product options (mods) as subtitle below each item name in OrderCard items preview |
| 2026-04-24 | pos-delivery-address-area | Structured address fields (street/number/bloc/apt/floor/intercom) + delivery zone picker with dynamic fee in POS manual order form |

### Todos

*(None)*

### Blockers

*(None)*

---

## Session Continuity

**Last session:** 2026-04-27
**Stopped at:** —
**Next action:** `/gsd-discuss-phase 5` — discuss Native Integration before planning

---
*State initialized: 2026-04-22*
*Last updated: 2026-04-24 — Phase 4 Plan 01 complete (test scaffolding, 20 requirement stubs)*
