# Milestones: SiteCare POS Desktop App

---

## ✅ v1.1 Orders History Screen — SHIPPED 2026-07-19

**Phases:** 7–12 (6 phases) | **Plans:** 28 | **Tasks:** 61 | **Timeline:** 2026-07-17 → 2026-07-19
**Commits:** 40 feat commits | **Source changed:** 22 files (+6,009 LOC in `src/` + `src-tauri/src/`) | **Tests:** 487

### Delivered

A dedicated Orders History screen backing the live SiteCare API — restaurant staff can browse, filter, search, reprint, and export the full archive of past orders. All 13/13 v1.1 requirements (HIST-01…HIST-13) delivered and verified.

### Key Accomplishments

1. **History screen foundation** — new cashier-level "History" sidebar entry opening a day-grouped scroll of the last 30 days via `client.admin.orders.list({from,to})`, with per-day count/revenue subtotals, a client-computed 4-tile summary strip (orders / revenue / average / refunds), and loading/empty/error states (HIST-01/02/03/05/06/13)
2. **Read-only order detail** — reuses `screen-detail.jsx` in `readOnly` mode, hydrated on demand via `getOrder(id)`, showing items + modifiers, totals, phone, address, and a derived actual prep duration; every mutating control gated out (HIST-10)
3. **Period control** — Today / 7 / 30 / custom-range presets retarget the fetch through one seam with `keepPreviousData`; the client-computed summary strip follows for free so tiles and day headers can never disagree (HIST-04)
4. **Client-side filters + search** — status (All/Completed/Refunded/Canceled) and type (All/Delivery/Pickup/Dine-in, `local`→Dine-in) with live faceted per-period counts, plus diacritic-folded debounced search; filters, search, and period compose (HIST-07/08/09)
5. **Reprint + CSV export** — printer-gated reprint from the detail view, and accounting-grade CSV export via native Save dialog (`plugin-dialog`/`plugin-fs`) with RFC-4180 escaping, UTF-8 BOM, and OWASP formula-injection guard (HIST-11/12)
6. **Tech-debt closeout (Phase 12)** — History selection lifted into a session-only `historySelection` Zustand slice (survives History→detail→Back, resets on leave); backfilled `normalizeOrder` fallback-total + percent-discount regression tests; HIST-06 traceability fixed; CR-01/CR-02/WR-01/G-07-1 verified fixed (code + live check); Phase 10/11 Nyquist validations promoted; milestone audit re-derived to `passed`

### Known Overrides (override_closeout)

- 2 stale v1.0-era quick tasks (`kitchen-ticket-data-mapping`, `order-card-item-groups`, both dated 2026-04-24, `[missing]`) — orphaned index entries, acknowledged and deferred at close (see STATE.md → Deferred Items)
- Phase 8 verification flagged `stale` by hash (Phase 12 commits touched shared files after Phase 8's verify) — audit-authoritative status is `passed` (9/9 must-haves, UAT 20/0); benign hash-staleness, not a functional gap

### Archives

- `.planning/milestones/v1.1-ROADMAP.md` — full phase details
- `.planning/milestones/v1.1-REQUIREMENTS.md` — all 13 requirements with outcomes
- `.planning/milestones/v1.1-MILESTONE-AUDIT.md` — audit report (`passed`)
- `.planning/milestones/v1.1-phases/` — phase execution artifacts

---

## ✅ v1.0 MVP — SHIPPED 2026-05-22

**Phases:** 1–6 | **Plans:** 35 | **Timeline:** 30 days (2026-04-22 → 2026-05-22)
**Commits:** 249 | **Files changed:** 348 | **Source LOC:** ~7,961 JS/JSX

### Delivered

Full production-ready Tauri v2 desktop app (macOS + Windows) — pixel-perfect port of the Claude Design POS prototype backed by the live SiteCare API. All 41/41 v1 requirements delivered.

### Key Accomplishments

1. Full Tauri + Vite + React scaffold — all 12 prototype files converted from CDN globals to ES modules; design tokens, fonts, and CSP wired on day 1
2. Secure authentication with OS keychain — username/password login; token persisted in macOS Keychain / Windows Credential Manager; proactive 8-hour refresh
3. Real-time kitchen display via SSE — `useSSE` with `@microsoft/fetch-event-source`; offline detection; TanStack Query cache serves stale data while offline
4. All 7 screens fully live-wired — orders list (search/filter), KDS (timers/urgency/sound/bump), POS (cart/checkout), menu availability toggles, settings persistence
5. Thermal printer integration — 4 Rust Tauri commands (list ports, save config, test print, print receipt) via ESC/POS; 166 tests passing; approved-no-hardware
6. Full CI/CD release pipeline — GitHub Actions release.yml with macOS arm64 notarization, Windows MSI, Ed25519 auto-updater signing, silent in-app updates

### Known Gaps

- BILD-03: Windows code signing — unsigned MSI produced; Azure Trusted Signing deferred to v1.1

### Archives

- `.planning/milestones/v1.0-ROADMAP.md` — full phase details
- `.planning/milestones/v1.0-REQUIREMENTS.md` — all 41 requirements with outcomes

---
