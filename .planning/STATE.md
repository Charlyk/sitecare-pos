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

**Current Phase:** 2 — Authentication
**Current Plan:** 02-05 (gap closure — ready to execute)
**Phase Status:** Phase 2 executed with gaps found; gap-closure plan ready
**Overall Status:** Phase 2 needs gap-closure execution (02-05-PLAN.md)

```
Progress: [################..........................] 30%
Phase 2 of 6 — 4/5 plans executed; 02-05 gap-closure plan ready
```

---

## Phase Summary

| Phase | Name | Status |
|-------|------|--------|
| 1 | Foundation | Complete — all 5 plans done, human-verified 2026-04-22 |
| 2 | Authentication | Gap closure planned — 02-05-PLAN.md ready; execute to fix CR-01, WR-01, WR-04 |
| 3 | Shell + Data Foundation | Not started |
| 4 | Core Screens | Not started |
| 5 | Native Integration | Not started |
| 6 | Build Pipeline | Not started |

---

## Performance Metrics

| Metric | Value |
|--------|-------|
| Phases completed | 1 / 6 |
| Requirements done | 8 / 41 |
| Plans complete | 5 / 5 (Phase 1 all done) |
| Sessions | 7 |

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
- **Fragment import in screen-detail.jsx** — prototype used `React.Fragment` from CDN global; production uses named `Fragment` import from 'react'. JSX shorthand `<>` would also work.
- **shield icon added to icons.jsx** — screen-settings.jsx uses `<Icon name="shield" />` for fiscal register display; icon was missing from prototype's icons.jsx; added to production version.
- **App.jsx scaffold renamed to app.jsx** — used `git mv` on macOS case-insensitive filesystem; production entry is lowercase `app.jsx`; git history preserved.
- **AcceptDialog local state** — `picked`, `custom`, `useCustom` are dialog-only ephemeral values; kept in component `useState`, not in global Zustand store.
- **orders=[] stub in Phase 1 screen router** — `orderCount` hardcoded to `{live:0, new:0, active:0}`; Phase 3 derives these from TanStack Query cache via `useOrders()`.
- **ES module migration complete** — all 12 prototype files migrated; zero `window.*` module globals remain in any `src/*.jsx` file (verified by grep audit after Plan 05).

### Open Questions (from research)

- ~~Does `@charlyk/admin-client` manage SSE auth internally (cookies) or expose a raw URL requiring Bearer?~~ — RESOLVED (Phase 2 context): SDK uses its own async-generator SSE client (not native `EventSource`), so Bearer headers can be sent through it. Safe for Phase 3 SSE wiring.
- ~~`decorations: false` has a known macOS bug~~ — RESOLVED: using `decorations: true` (native chrome).
- Tax calculation bug in `screen-pos.jsx` (total excludes tax) — confirm in Phase 4 whether API returns a server-calculated total (preferred) or the client must apply Romanian VAT rates (5%/9%/19%).
- Which thermal printer model(s) are targeted? Needed before Phase 5 plugin validation.

### Critical Watch-Outs (carry forward)

- **CSP silently blocks everything** — `connect-src` in `tauri.conf.json` must include the API domain on day 1. Silent failure: screens empty, EventSource loops forever.
- **GitHub Package Registry auth breaks CI** — `.npmrc` must commit scope routing (`@charlyk:registry=https://npm.pkg.github.com`); use `NODE_AUTH_TOKEN: ${{ secrets.GITHUB_TOKEN }}` in Actions. Never commit a literal PAT.
- **EventSource cannot send auth headers** — If the SSE endpoint requires Bearer, use `@microsoft/fetch-event-source` instead of native `EventSource`. Confirmed in Phase 2.
- **`window.*` migration order matters** — Convert leaf components first, verify renders, move up the tree. Convert `i18n.jsx` first (everything depends on `useT`).
- **macOS notarization is a hard distribution block** — Apple Developer account ($99/yr) required before Phase 6. Configure all CI secrets before the first release build.

### Todos

*(None yet — todos logged here during planning and implementation)*

### Blockers

*(None — project not yet started)*

---

## Session Continuity

**Last session:** 2026-04-23 — Phase 2 executed (4 plans: Rust keychain commands, login UI, auth layer, auth guard wiring). Verification found 3 gaps: CR-01 (scheduleRefresh tight-loop), WR-01 (setScreen('login') persists invalid screen), WR-04 (silent email validation). Gap-closure plan 02-05 created and checker-verified.
**Stopped at:** Gap-closure plan 02-05 planned and verified — ready to execute.
**Next action:** Execute gap-closure plan — `/gsd-execute-phase 2`.

---
*State initialized: 2026-04-22*
*Last updated: 2026-04-23 after Phase 2 context discussion*
