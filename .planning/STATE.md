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

**Current Phase:** 1 — Foundation
**Current Plan:** 01-02 (4 plans remaining)
**Phase Status:** In progress — 1/5 plans complete
**Overall Status:** Executing Phase 1

```
Progress: [#.................................................] 3%
Phase 1 of 6 — Plan 1/5
```

---

## Phase Summary

| Phase | Name | Status |
|-------|------|--------|
| 1 | Foundation | Ready to execute (5 plans) |
| 2 | Authentication | Not started |
| 3 | Shell + Data Foundation | Not started |
| 4 | Core Screens | Not started |
| 5 | Native Integration | Not started |
| 6 | Build Pipeline | Not started |

---

## Performance Metrics

| Metric | Value |
|--------|-------|
| Phases completed | 0 / 6 |
| Requirements done | 1 / 41 |
| Plans complete | 1 / 5 |
| Sessions | 1 |

---

## Accumulated Context

### Key Decisions Logged

- **Window chrome:** `decorations: true` (native OS chrome). Custom macOS titlebar from prototype NOT used. Avoids `@tauri-apps/plugin-window-state` bug #14822.
- **Scaffold location:** Tauri+Vite at repo root. Prototype archived to `_prototype/`.
- **CSS migration:** `index.html` `<style>` block → `src/styles.css`. `colors_and_type.css` unchanged. Both imported in `main.jsx`.
- **API domain:** `https://api.restaurant.sitecare.ro` — configure in `tauri.conf.json` `connect-src` and `event-src` on day 1.
- **Vite pinned to ^6.4.2, React ^18.3.1** — Tauri v2 validated against these versions; jumping to Vite 7/8 or React 19 introduces unvalidated risk.
- **Prototype kept in _prototype/** — Plans 04-05 read these files during ES module conversion; removing would require git archaeology.

### Open Questions (from research)

- Does `@charlyk/admin-client` manage SSE auth internally (cookies) or expose a raw URL requiring Bearer? Inspect SDK source in Phase 2 before wiring KDS-01.
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

**Last session:** 2026-04-22 — Phase 1 Plan 01-01 executed. Rust installed (cargo 1.95.0), prototype archived to _prototype/, Tauri+Vite+React scaffold created at repo root, first Rust compile succeeded, native macOS window verified by human.
**Stopped at:** Phase 1 Plan 01-01 complete — SUMMARY at `.planning/phases/01-foundation/01-01-SUMMARY.md`
**Next action:** Execute Plan 01-02 — install npm packages (@charlyk/admin-client, plugins, zustand), configure tauri.conf.json CSP, wire lib.rs.

---
*State initialized: 2026-04-22*
*Last updated: 2026-04-22 after roadmap creation*
