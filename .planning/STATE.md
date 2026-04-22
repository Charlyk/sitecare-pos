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
**Current Plan:** None started
**Phase Status:** Not started
**Overall Status:** Not started

```
Progress: [..................................................] 0%
Phase 1 of 6
```

---

## Phase Summary

| Phase | Name | Status |
|-------|------|--------|
| 1 | Foundation | Not started |
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
| Requirements done | 0 / 41 |
| Plans complete | 0 / ? |
| Sessions | 0 |

---

## Accumulated Context

### Key Decisions Logged

*(None yet — decisions logged here at phase transitions)*

### Open Questions (from research)

- Does `@charlyk/admin-client` manage SSE auth internally (cookies) or expose a raw URL requiring Bearer? Inspect SDK source in Phase 2 before wiring KDS-01.
- `decorations: false` has a known macOS bug with `@tauri-apps/plugin-window-state` (issue #14822) — decide in Phase 1 whether to keep native chrome or manage window state manually.
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

**Last session:** 2026-04-22 — Roadmap and STATE.md created, no implementation started.
**Next action:** Run `/gsd-plan-phase 1` to plan Phase 1: Foundation.

---
*State initialized: 2026-04-22*
*Last updated: 2026-04-22 after roadmap creation*
