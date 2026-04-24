---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
current_phase: 4 — Core Screens
current_plan: none (Phase 4 not yet planned)
status: ready
stopped_at: Phase 3 complete — human-verified 2026-04-24
last_updated: "2026-04-24T14:30:00.000Z"
progress:
  total_phases: 6
  completed_phases: 3
  total_plans: 22
  completed_plans: 16
  percent: 50
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

**Current Phase:** 4 — Core Screens
**Current Plan:** none (Phase 4 not yet planned)
**Phase Status:** Phase 3 complete — human-verified 2026-04-24
**Overall Status:** Phase 3 done; Phase 4 ready to plan

```
Progress: [###################...................] 50%
Phase 3 of 6 complete — Phase 4 ready to plan
```

---

## Phase Summary

| Phase | Name | Status |
|-------|------|--------|
| 1 | Foundation | Complete — all 5 plans done, human-verified 2026-04-22 |
| 2 | Authentication | Complete — all 5 plans done and human-verified 2026-04-23 |
| 3 | Shell + Data Foundation | Complete — all 6 plans done, human-verified 2026-04-24 |
| 4 | Core Screens | Not started |
| 5 | Native Integration | Not started |
| 6 | Build Pipeline | Not started |

---

## Performance Metrics

| Metric | Value |
|--------|-------|
| Phases completed | 3 / 6 |
| Requirements done | 21 / 41 |
| Plans complete | 16 / 16 (Phase 1: 5, Phase 2: 5, Phase 3: 6/6) |
| Sessions | 10 |

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

### Todos

*(None)*

### Blockers

*(None)*

---

## Session Continuity

**Last session:** 2026-04-24T14:30:00.000Z
**Stopped at:** Phase 3 complete — human-verified (2026-04-24)
**Next action:** `/gsd-discuss-phase 4` or `/gsd-plan-phase 4` — Core Screens

---
*State initialized: 2026-04-22*
*Last updated: 2026-04-23 after Phase 3 planning*
