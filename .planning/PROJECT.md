# SiteCare POS — Desktop App

## What This Is

A Tauri v2 desktop application (macOS + Windows) for SiteCare restaurant staff to manage orders in real-time. The UI is a pixel-perfect port of the Claude Design prototype — same design system, same brand — backed by the live SiteCare API via `@charlyk/admin-client`. v1.0 shipped on 2026-05-22 with all 41 requirements delivered; v1.1 shipped on 2026-07-19, adding a dedicated Orders History screen (browse, filter, search, reprint, CSV export) across 13 requirements. The app is production-ready: native installers, macOS notarization, silent auto-updates, and thermal printer integration are in place.

## Core Value

Restaurant staff can see, accept, and advance orders in real-time from a native desktop app that looks and feels exactly like the design prototype.

## Current State (v1.1)

**Shipped:** v1.0 on 2026-05-22 · v1.1 on 2026-07-19
**Tech stack:** Tauri 2.x · React 18 · Vite 6 · Zustand 5 · TanStack Query 5 · @charlyk/admin-client v1.1.59+
**Tests:** 487 (3 pre-existing v1.0 failures documented + deferred)
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
- **Orders History (v1.1):** day-grouped archive with a client-computed summary strip; Today/7/30/custom period control; client-side status/type/search filters with live faceted counts; read-only order detail hydrated via `getOrder(id)`; printer-gated receipt reprint; accounting-grade CSV export via native Save dialog

## Shipped: v1.1 Orders History Screen (2026-07-19)

**Delivered:** A dedicated Orders History screen — day-grouped archive with a client-computed summary strip,
Today/7/30/custom period control, client-side status/type/search filters with live faceted counts, a read-only
order detail hydrated via `getOrder(id)`, printer-gated receipt reprint, and accounting-grade CSV export.
All 13/13 requirements (HIST-01…HIST-13) delivered and verified across Phases 7–12; milestone audit `passed`.

**Key design divergences (deliberate, API-driven):** tax/tip lines, refund amount and reason, order source
channel, collapsed-row items count, address subtitle, and table number were all cut — no API field backs them.
The summary strip is computed client-side from the same `listAdminOrders` result that backs the rows (D-15 —
`getAdminDashboard` dropped), and the inline expandable receipt was replaced by a read-only detail view reusing
`screen-detail.jsx` (D-07). Full rationale in `.planning/milestones/v1.1-REQUIREMENTS.md`.

## Current Milestone: v1.2 Branch Switching

**Goal:** Make the POS app branch-aware — staff can see and switch the active branch, and every screen plus the live SSE stream follow the selected branch.

**Target features:**
- Branch switcher in the sidebar footer (replacing the RO/EN toggle, which moves into Settings → Afișaj where a language control already exists). Shows the current branch name and a "default" badge; renders read-only when the tenant has a single branch.
- Load the current selected branch on launch from the session (`user.selectedBranch`); populate the switcher from `client.me.branches()`.
- Switch flow: `client.me.branches.switch({branchId})` → reconnect SSE → invalidate all branch-scoped caches → "switched to X" confirmation toast.
- Branch-scoped data: key orders / history / menu (and POS / KDS) TanStack Query caches on `branchId` so a switch cleanly re-scopes every screen.
- SSE reconnect on switch: the server closes the user's streams on switch, so `useSSE` must reconnect scoped to the new branch.
- 403 handling: `BRANCH_INACTIVE` / `BRANCH_ACCESS_REVOKED` on switch *or* any later request → toast + reopen switcher + refetch branch list.

**Key context (API v2.6 "Tenant Branching", shipped 2026-07-18):**
- The active branch is **server-side session state** (`user.selected_branch_id`) — no `X-Branch-Id` header, no `branchId` query param. Every existing session-authed call (`orders.list`, `getOrder`, kitchen menu, POS create, SSE) auto-scopes to it. Endpoint paths and response shapes are **unchanged**.
- SDK `@charlyk/admin-client` v1.1.67 is already installed; the only net-new calls are `client.me.branches()` (`GET /v1/me/branches` → `AccessibleBranch[]`, staff-accessible) and `client.me.branches.switch({branchId})` (`POST /v1/me/branches/switch` → `{ok, branchId}`).
- Backward compatible: a single-branch tenant returns a one-entry list → read-only switcher, behaves exactly as pre-v2.6.
- Reference PRD: `~/Developer/sitecare-orders-api/docs/RESTAURANT_DASHBOARD_PRD.md` §5, §7, §11 (owner-dashboard doc, but the branch-selection model and staff SSE rules are identical for this app).

**Carry-forward candidates** (not yet scoped into v1.2) live under **Requirements → Active** below (Windows code signing, thermal-printer hardware validation, tax display), plus deferred features in the v1.1 requirements archive (owner dashboard, mobile screens, forgot-password, PDF export).

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
- ✓ Period presets + custom range on History screen — Today / 7 / 30 / custom retarget the fetch; the client-computed summary strip retargets for free (D-15) — Validated in Phase 9 (HIST-04)
- ✓ Filter by status (All / Completed / Refunded / Canceled) and order type (All / Delivery / Pickup / Dine-in, with `orderType: 'local'` shown as Dine-in), each with live per-period counts — Validated in Phase 10 (HIST-07, HIST-08)
- ✓ Debounced search by order number or customer name; filters, search, and period compose so day headers reflect only visible rows — Validated in Phase 10 (HIST-09)
- ✓ Reprint receipt on historical orders — read-only detail view surfaces Print kitchen / Print customer, reusing the existing `handlePrint`/`print_receipt` path; greyed-out when no printer is configured — Validated in Phase 11 (HIST-11)
- ✓ CSV export of the filtered history list — native Save dialog (`plugin-dialog`) + `writeTextFile` (`plugin-fs`), accounting-grade `buildCsv` with RFC-4180 escaping, UTF-8 BOM, and OWASP formula-injection guard on user-authored columns — Validated in Phase 11 (HIST-12)

### Active (v1.1)

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
| Client-computed summary strip; drop `getAdminDashboard` (D-15) | Strip derives from the same `listAdminOrders` result backing the rows, so tiles and day headers agree by construction | ✓ Good — one data source; no second loading/error state; shipped Phases 7–10 |
| History period/filter/search selection in a session-only `historySelection` Zustand slice (D-01…D-04) | Selection must survive History→detail→Back but reset on any other exit; mirrors existing `selectedOrder`/`historyOrder` precedent | ✓ Good — Phase 12 lift; live-verified, resets correctly on leave |
| Client-side CSV export with RFC-4180 + BOM + formula-injection guard | No server export endpoint; accounting opens in Excel with diacritics; user-authored columns are an injection surface | ✓ Good — Phase 11; `plugin-dialog`/`plugin-fs` with narrow capability grants |

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

*Last updated: 2026-07-21 — v1.2 Branch Switching milestone started. Scope: make the POS app branch-aware (sidebar branch switcher, per-branch cache scoping, SSE reconnect on switch, 403 branch-access handling) against the API's v2.6 Tenant Branching model. Requirements and roadmap to follow.*
