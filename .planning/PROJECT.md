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

**Target features:**
- New "History" sidebar item (same level as Orders, KDS, POS)
- Paginated list of all historical orders (completed + cancelled)
- Date range filter to navigate far back
- Search by order number, phone number, or customer name
- Filter by status (completed / cancelled) and order type (dine-in / pickup / delivery)
- Read-only order detail view (same panel as live orders)
- Reprint receipt action on any historical order
- CSV / PDF export of the filtered list

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

### Active (v1.1)

- [ ] Orders History screen — new sidebar item with paginated list of all past orders — v1.1
- [ ] Date range filter on History screen — navigate back to any period — v1.1
- [ ] Search by order number, phone number, customer name on History screen — v1.1
- [ ] Filter by status (completed / cancelled) and order type (dine-in / pickup / delivery) — v1.1
- [ ] Read-only order detail view on historical orders — same panel as live orders — v1.1
- [ ] Reprint receipt on historical orders — thermal printer integration — v1.1
- [ ] CSV / PDF export of filtered history list — v1.1
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

**API SDK:** `@charlyk/admin-client` (v1.1.29+, proprietary, GitHub Package Registry `npm.pkg.github.com`). This is the only sanctioned way to communicate with the SiteCare backend. Published by GitHub Actions bot — expect frequent updates.

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

*Last updated: 2026-05-27 — v1.1 milestone started; Orders History Screen*
