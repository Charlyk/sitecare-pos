# SiteCare POS — Desktop App

## What This Is

A Tauri v2 desktop application (macOS + Windows) for SiteCare restaurant staff to manage orders in real-time. The UI is a pixel-perfect port of the Claude Design prototype — same 7 screens, same design system, same brand — backed by the live SiteCare API via `@charlyk/admin-client`. v1.0 shipped on 2026-05-22 with all 41 requirements delivered. The app is production-ready: native installers, macOS notarization, silent auto-updates, and thermal printer integration are in place.

## Core Value

Restaurant staff can see, accept, and advance orders in real-time from a native desktop app that looks and feels exactly like the design prototype.

## Current State (v1.0)

**Shipped:** 2026-05-22
**Tech stack:** Tauri 2.x · React 18 · Vite 6 · Zustand 5 · TanStack Query 5 · @charlyk/admin-client v1.1.29+
**Source LOC:** ~7,961 JS/JSX
**Tests:** 166 passing
**Platforms:** macOS arm64 (notarized), Windows x64 (unsigned MSI)

**What works in production:**
- Login with username/password + OS keychain persistence + 8-hour proactive token refresh
- Live order list with search, filter, and real-time SSE updates
- Order lifecycle actions: accept (with prep-time picker), advance, cancel
- Kitchen Display screen with per-ticket timers, urgency colors, sound alerts, and bump
- POS checkout with live menu browse, cart, discount, and order type (dine-in/pickup/delivery)
- Menu availability toggles (in-stock / out-of-stock)
- Settings: language, density, accent color — all persisted across restarts
- Offline resilience: banner, cached data, disabled mutations
- Thermal printer: configure USB/TCP, test print, print receipts via ESC/POS
- Auto-update: silent in-app update delivery via tauri-plugin-updater

## Current Milestone: v1.1 Orders History Screen

**Goal:** Give restaurant staff a dedicated screen to browse, search, and export the full archive of past orders with receipt reprinting.

**Replanned 2026-07-16** against the new design handoff (`sitecare-orders/`) and SDK v1.1.59. The original
2026-05-27 scope assumed a paginated list with a side detail panel and no summary strip; the new design is a
day-grouped scroll with an inline expandable receipt and a period summary strip.

**Target features:**
- New "History" sidebar item (same level as Orders, KDS, POS)
- Period summary strip — orders, revenue, average — from the new `getAdminDashboard` endpoint
- Period presets (Today / 7 / 30 / custom) driving a `listAdminOrders({from,to})` fetch
- Orders grouped by calendar day with per-day count and revenue subtotal — no pagination
- Filter by status (Completed / Refunded / Canceled) and order type (Delivery / Pickup / Dine-in)
- Debounced search by order number or customer name
- Inline expandable read-only receipt row, hydrated on demand via `getOrder(id)`
- Reprint receipt from the expanded row
- CSV export of the filtered list

**Scope boundary:** Desktop History screen only. The new design bundle also contains an owner dashboard,
mobile screens, and a forgot-password flow — all deferred, not part of v1.1.

**Known divergence from the design:** tax/tip lines, refund amount and reason, order source channel, the
collapsed-row items count, address subtitle, and table number are all cut — no API field backs them. Tracked
in REQUIREMENTS.md under "Design Elements Cut".

**Progress:** Phase 7 (History Screen Foundation) complete 2026-07-17 — the History sidebar item opens a
screen that auto-loads the last 30 days via `listAdminOrders({from,to})`, grouped by Romanian calendar day
with per-day count and revenue subtotals, plus loading/empty/error states and a read-only order detail.
The period and status filter bar is present but inert; Phase 8 makes it live. Two open v1.1 questions were
closed by live-API human verification: the API's `from`/`to` params behave correctly for Romanian local
calendar days, and `AdminOrder.total` is denominated in RON (not cents), so no `normalizeOrder` change is needed.

---

## Requirements

### Validated (v1.0)

- ✓ Tauri app shell with macOS + Windows build targets — v1.0 Phase 1
- ✓ React + Vite frontend replacing CDN/Babel-standalone prototype — v1.0 Phase 1
- ✓ @charlyk/admin-client installed from GitHub Package Registry — v1.0 Phase 1
- ✓ Zustand store with @tauri-apps/plugin-store persistence — v1.0 Phase 1
- ✓ CSS design tokens (colors_and_type.css, Outfit font) unchanged from prototype — v1.0 Phase 1
- ✓ Tauri CSP with API domain in connect-src — v1.0 Phase 1
- ✓ Username + password authentication via @charlyk/admin-client — v1.0 Phase 2
- ✓ Token persisted in OS secure storage (Keychain / Credential Manager) — v1.0 Phase 2
- ✓ Proactive token refresh (8-hour shift coverage) — v1.0 Phase 2
- ✓ Auto-login on restart with valid stored token — v1.0 Phase 2
- ✓ Auth guard on all screens — v1.0 Phase 2
- ✓ Live order data via @charlyk/admin-client (replacing mock window.ORDERS) — v1.0 Phase 3–4
- ✓ SSE integration for real-time KDS order updates — v1.0 Phase 3–4
- ✓ Offline banner + cached data + disabled mutations — v1.0 Phase 3
- ✓ Orders list: search, filter, FOH/BOH role view — v1.0 Phase 4
- ✓ Order lifecycle actions (accept with prep time, advance, cancel) — v1.0 Phase 4
- ✓ KDS: elapsed timers (60s), urgency colors, sound alerts, bump — v1.0 Phase 4
- ✓ POS: live menu, cart, discount, order type, API submission — v1.0 Phase 4
- ✓ Menu availability toggles wired to API — v1.0 Phase 4
- ✓ Settings: language, density, accent color — v1.0 Phase 4
- ✓ Thermal printer integration (USB/TCP, ESC/POS, print receipt) — v1.0 Phase 5
- ✓ GitHub Actions CI with macOS notarization and Windows MSI — v1.0 Phase 6
- ✓ Silent in-app auto-updates via tauri-plugin-updater — v1.0 Phase 6

### Validated (v1.1)

- ✓ Orders History screen — new sidebar item, day-grouped scroll of past orders — Validated in Phase 7: History Screen Foundation (HIST-01, HIST-05)
- ✓ History loads via `listAdminOrders({from,to})`; all filtering client-side on the returned array — Validated in Phase 7 (HIST-02)
- ✓ History defaults to the last 30 days on first open — Validated in Phase 7 (HIST-03)
- ✓ Clear empty state when no orders match — Validated in Phase 7 (HIST-13)
- ✓ Period summary strip — orders, revenue, and average order value computed client-side from the same fetched list that backs the rows (D-15 — `getAdminDashboard` is not used); refunds tile is count-only — Validated in Phase 7 (HIST-06)
- ✓ Read-only detail view — click any row to open `screen-detail.jsx` in `readOnly` mode (D-07, D-09) showing items with modifiers, subtotal, delivery fee, total, customer phone, delivery address, and derived prep time; hydrated on demand via `getOrder(id)` — Validated in Phase 8 (HIST-10)

### Active (v1.1)

- [ ] Period presets + custom range on History screen — v1.1 (HIST-04) — *the inert 30-day pill landed in Phase 7; Phase 9 makes it interactive, and per D-15 the summary strip retargets for free*
- [ ] Search by order number or customer name on History screen — v1.1 (HIST-09)
- [ ] Filter by status (completed / refunded / canceled) and order type — v1.1 (HIST-07, HIST-08)
- [ ] Reprint receipt on historical orders — thermal printer integration — v1.1 (HIST-11)
- [ ] CSV export of filtered history list — v1.1 (HIST-12)
- [ ] Windows code signing — unsigned MSI; Azure Trusted Signing is the path forward (BILD-03 deferred)
- [ ] Thermal printer hardware validation — approved-no-hardware for v1.0; real-device test needed
- [ ] Tax display — server-authoritative total used; Romanian VAT (5%/9%/19%) display to be confirmed with SiteCare

### Out of Scope

- Linux build — not requested, add later if needed
- TypeScript — not in scope for v1; plain JS
- Mobile / web version — desktop-only
- Backend / API development — existing API via @charlyk/admin-client
- Custom API client — SDK handles all API communication
- Full menu CRUD — Menu screen is availability-only (in-stock / out-of-stock); editing is v2
- Full offline order creation — requires local SQLite + sync engine; deferred to v2
- Table assignment / table map — v2
- Multi-printer routing — v2
- User management / admin — v2

## Context

**Origin:** Claude Design handoff bundle — a fully fleshed HTML/React prototype with 7 screens, all CSS, and mock data. The prototype runs React 18 via CDN with Babel standalone transpilation. The production app replaced the CDN stack with React + Vite inside a Tauri shell.

**API SDK:** `@charlyk/admin-client` (v1.1.59+, proprietary, GitHub Package Registry `npm.pkg.github.com`). This is the only sanctioned way to communicate with the SiteCare backend. Published by GitHub Actions bot — expect frequent updates. Bumped from v1.1.29 on 2026-07-16; that range added `getAdminDashboard`, `paymentCaptureStatus`, and fiscal-receipt endpoints, but did **not** add server-side order filtering or pagination.

**Real-time:** SSE via `@microsoft/fetch-event-source` (not native EventSource — required for Bearer auth headers). The Kitchen display and order list both receive live events. SSE connection kept alive with `openWhenHidden: true`.

**Design fidelity:** The prototype UI reproduced pixel-perfectly. CSS design tokens (`colors_and_type.css`) and the SiteCare brand are non-negotiable.

**Feature gating:** Features not yet ready are greyed-out in the UI (disabled, visible, not clickable).

## Constraints

- **Framework:** Tauri — user-specified, not Electron
- **Frontend:** React + Vite — matches prototype tech, standard Tauri frontend
- **API:** @charlyk/admin-client only — no direct HTTP calls, no custom client
- **Platforms:** macOS + Windows — both must ship
- **Design:** Pixel-perfect match to Claude Design prototype — no redesign

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Tauri over Electron | User specified; smaller binary, native OS integration, Rust backend | ✓ Good — native window, keychain, serial port access all worked via Tauri plugins |
| React + Vite frontend | Matches prototype's React components; minimal migration effort | ✓ Good — migration was smooth; Vite 6 + React 18 validated with Tauri v2 |
| All screens built upfront | Build everything, grey-out unready — avoids partial UI gaps | ✓ Good — greyed-out approach worked well; no user confusion |
| SSE not polling for kitchen | Backend already has SSE configured; polling wastes resources | ✓ Good — SSE works with fetch-event-source; openWhenHidden required |
| Plain JS, not TypeScript | Not requested for v1; reduces setup complexity | ✓ Good — no type errors encountered; TS would add complexity with no v1 benefit |
| @charlyk/admin-client as sole data layer | Existing SDK; no need to build a custom API client | ✓ Good — SDK handled all API concerns including SSE auth |
| @microsoft/fetch-event-source for SSE | Native EventSource cannot send auth headers | ✓ Good — confirmed in Phase 2 by inspecting SDK source |
| decorations: true (native chrome) | Avoids @tauri-apps/plugin-window-state bug #14822 | ✓ Good — stable, no issues |
| Zustand for UI state, TanStack Query for server state | Clean separation prevents cache conflicts | ✓ Good — worked well across all phases |
| BILD-03 deferred (unsigned Windows MSI) | Azure Trusted Signing requires org account setup; not blocking v1 | — Pending — document as v1.1 task |
| Reuse `screen-detail.jsx` in `readOnly` mode for the history detail (D-07/D-09) | Reverses the earlier inline-expandable-receipt plan; one detail presenter, not two | ✓ Good — Phase 8 shipped it; mutating controls gated by DOM removal with a standing allowlist test |
| One order, one truth — shared `['order', id]` cache, SSE-writable (D-02) | A late refund event reflects reality catching up, not contamination | ✓ Accepted risk R-08-01 — ⚠ carries a Phase 11 consequence: a reprint may print post-SSE data, not the payload as fetched |
| Merge hydrated detail over the summary (D-03) | No field ever blanks mid-fetch; hydrated wins on conflict | ✓ Good — also degrades gracefully if `getOrder` ever 401s |
| Generic detail error copy, no HTTP-status branching (D-08) | 401 is handled app-wide by the auth-refresh layer; raw SDK error strings must not reach the DOM | ✓ Accepted risk R-08-02 — deliberate simplification |
| Derive prep time from `events[]`, never read `events[].actor` (D-09) | `actor` is `string \| null` with undocumented semantics; misreading would misattribute an order | ✓ Good — "handled-by" cut from ROADMAP/REQUIREMENTS; zero `.actor` reads in `src/` |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---

*Last updated: 2026-07-17 after Phase 8 — Read-Only Order Detail View complete; HIST-10 validated (HIST-06 also reconciled to Validated, shipped in Phase 7 via 07-04)*
