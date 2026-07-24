# SiteCare POS — Desktop App

## What This Is

A Tauri v2 desktop application (macOS + Windows) for SiteCare restaurant staff to manage orders in real-time. The UI is a pixel-perfect port of the Claude Design prototype — same design system, same brand — backed by the live SiteCare API via `@charlyk/admin-client`. v1.0 shipped on 2026-05-22 with all 41 requirements delivered; v1.1 shipped on 2026-07-19, adding a dedicated Orders History screen (browse, filter, search, reprint, CSV export) across 13 requirements; v1.2 shipped on 2026-07-24, making the app branch-aware (sidebar branch switcher, per-branch cache scoping, SSE reconnect on switch, centralized branch-access 403 handling) across 15 requirements against the API's v2.6 Tenant Branching model. The app is production-ready: native installers, macOS notarization, silent auto-updates, and thermal printer integration are in place.

## Core Value

Restaurant staff can see, accept, and advance orders in real-time from a native desktop app that looks and feels exactly like the design prototype.

## Current State (v1.2)

**Shipped:** v1.0 on 2026-05-22 · v1.1 on 2026-07-19 · v1.2 on 2026-07-24
**Tech stack:** Tauri 2.x · React 18 · Vite 6 · Zustand 5 · TanStack Query 5 · @charlyk/admin-client v1.1.67
**Tests:** ~620 (1 pre-existing unrelated `build-pipeline` failure carried forward)
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
- **Branch Switching (v1.2):** sidebar-footer branch switcher (read-only for single-branch tenants, "default" badge); current branch seeded session-only from `getMe().selectedBranch` on sign-in + cold start + window-focus revalidation; all 7 data caches keyed per branch; non-optimistic switch flow bridging the SSE reconnect behind a blocking overlay with cart-discard/neutral-landing safety; centralized branch-access 403 recovery (toast + reopen for `BRANCH_INACTIVE`/`BRANCH_ACCESS_REVOKED`, full-screen block for `NO_BRANCH_ACCESS`); RO/EN toggle relocated to Settings → Afișaj

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

## Shipped: v1.2 Branch Switching (2026-07-24)

**Delivered:** The POS app is now branch-aware. A sidebar-footer switcher shows the current branch (read-only for
single-branch tenants, "default" badge for the tenant default); the current branch is seeded session-only from
`getMe().selectedBranch` on sign-in, cold start, and window-focus revalidation (never persisted). All 7 data caches
are keyed per branch, the live SSE stream reconnects scoped to the new branch, and switching is non-optimistic —
a blocking overlay bridges the reconnect with cart-discard/neutral-landing safety, and the branch updates only after
`client.me.branches.switch` resolves. Every branch-access 403 (from the switch call or any later request) routes
through one central handler: toast + reopened switcher for `BRANCH_INACTIVE`/`BRANCH_ACCESS_REVOKED`, a full-screen
block for `NO_BRANCH_ACCESS`. The RO/EN toggle moved to Settings → Afișaj. All 15/15 requirements
(BSTATE, SCOPE, SWCH, BERR, LANG) delivered across Phases 13–17.

**Closed `override_closeout`:** every requirement is code-complete and test-backed (~620 tests) with all cross-phase
flows wired (integration checker: 0 broken), but the milestone closed with acknowledged deferred verification —
Phases 15/16/17 carry live-account and pixel-fidelity checks that no available test tenant could exercise, and two
open WINDOWS caveats. **The load-bearing follow-up is WINDOWS #1:** the branch-access 403 body shape
(`{ error: '<CODE>' }`, REST + SSE) is UNVERIFIED against the live API — the whole BERR recovery parses an assumed
envelope and degrades *silently* to a generic toast if the real shape differs. Re-capture and correct the matcher
against a live tenant with a revocable branch before relying on the recovery path in production. Full detail:
`.planning/milestones/v1.2-MILESTONE-AUDIT.md` and STATE.md → Deferred Items.

**Key context (API v2.6 "Tenant Branching"):** the active branch is server-side session state
(`user.selected_branch_id`) — no header, no query param; every existing session-authed call auto-scopes to it.
Net-new SDK calls: `client.me.branches.list()` and `client.me.branches.switch({ body: { branchId } })`.

**Carry-forward candidates** (not yet scoped) live under **Requirements → Active** below (Windows code signing,
thermal-printer hardware validation, tax display), the two v1.2 WINDOWS caveats, plus deferred features in the v1.1
requirements archive (owner dashboard, mobile screens, forgot-password, PDF export).

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

### Validated (v1.2)

- ✓ Current selected branch resolved from `getMe().selectedBranch` and held session-only (never persisted) on sign-in + cold start — Validated in Phase 13 (BSTATE-01)
- ✓ Accessible-branches list via `client.me.branches.list()`, refetched on focus / after branch-access error, never cached indefinitely — Validated in Phase 13 (BSTATE-02)
- ✓ All 7 branch-scoped caches (orders, order detail, stats, menu, history, restaurant settings, delivery areas) keyed on `branchId`; mutations invalidate only the active branch; every fetch error carries a matchable `err.code` — Validated in Phase 14 (SCOPE-01)
- ✓ Live SSE stream reconnects scoped to the new branch on switch, snapshot replay stays silent (no sound burst) — Validated in Phase 15 (SCOPE-02) — *live two-session confirmation deferred*
- ✓ POS cart reset + open order-detail exit on switch; no prior-branch working state carries forward — Validated in Phase 16 (SCOPE-03)
- ✓ Order mutations (POS submit, accept/advance/cancel, reprint) blocked while a switch is pending — Validated in Phase 16 (SCOPE-04)
- ✓ Sidebar-footer branch selector with current name + "default" badge — Validated in Phase 16 (SWCH-01)
- ✓ Single-branch tenant renders the selector read-only (pre-v2.6 parity) — Validated in Phase 16 (SWCH-02)
- ✓ Non-optimistic switch via `client.me.branches.switch`; disabled while pending; active branch updates only on success — Validated in Phase 16 (SWCH-03)
- ✓ "Switched to `<branch>`" confirmation toast on success — Validated in Phase 16 (SWCH-04)
- ✓ Central branch-access 403 recovery for `BRANCH_INACTIVE`/`BRANCH_ACCESS_REVOKED` (toast + reopen switcher + refetch) from the switch call or any later request — Validated in Phase 17 (BERR-01) — *assumed 403 envelope, see WINDOWS #1*
- ✓ Rejected switch leaves app on previous branch, no change beyond the error notice — Validated in Phase 17 (BERR-02)
- ✓ `NO_BRANCH_ACCESS` shows a distinct full-screen blocking state superseding all screens until access is restored — Validated in Phase 17 (BERR-03) — *assumed 403 envelope, see WINDOWS #1*
- ✓ Selected branch revalidated on window focus, catching a remote branch change / access revocation — Validated in Phase 17 (BERR-04)
- ✓ RO/EN toggle removed from sidebar footer; language remains changeable via Settings → Afișaj — Validated in Phase 16 (LANG-01)

### Active (carry-forward)

- [ ] **WINDOWS #1 (v1.2 follow-up):** re-capture the real branch-access 403 body shape (REST + SSE) against a live tenant with a revocable/deactivable branch and correct the `BRANCH_CODES` matcher / `extractBranchCodeFromSseBody` — the recovery path is UNVERIFIED and degrades silently if the assumed `{ error: '<CODE>' }` envelope is wrong
- [ ] **WINDOWS #2 (v1.2 follow-up):** add a concurrent-error de-dup guard to `handleBranchError` (or accept the multi-toast edge via manual testing) — a burst of simultaneous branch-403s currently stacks N toasts
- [ ] v1.2 live/visual UAT sign-off — Phases 15/16/17 backstops (live multi-branch switch, SSE cross-branch bleed, popover/overlay pixel fidelity, Retry spinner) need a real multi-branch account
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
| **LOCKED — Design-fidelity exception to the generic UI grid/weight rules** | The shipped design system (`colors_and_type.css` + `styles.css`, 15 phases live) uses a fine-grained spacing scale (4/6/8/10-12/14-16/24/32) and 3 font weights (600 body, 700 label, 800 heading). Pixel-perfect parity with the prototype is a non-negotiable project constraint (see Constraints → Design, Context → Design fidelity). New UI **must extend these tokens verbatim**, not conform to a generic 4px-multiple grid or a 2-weight cap. | ✓ Locked 2026-07-23 — the UI-SPEC checker's Dimension 4 (2-weight cap) and Dimension 5 (4px-multiple grid) are **formally waived project-wide** for values that match the shipped system; a UI-SPEC that reuses existing spacing/weight tokens is compliant by this decision, not a violation |
| `currentBranch` session-only, never persisted (v1.2 D-10) | Server re-validates `selected_branch_id` every request; a persisted stale value would flash the wrong branch before the first request self-corrects | ✓ Good — re-derived from `getMe()` on every cold start; excluded from `partialize` |
| branchId-keyed query keys over `resetQueries()` (v1.2 Phase 14 D-01) | Race-safe by construction (immune to Pitfall 4), future-proof; `['orders', branchId]` uniformly across all 7 hooks | ✓ Good — SC2 sibling-branch-untouched proven by test; no `resetQueries` anywhere |
| Non-optimistic switch; `setCurrentBranch` only in `onSuccess` (v1.2 D-05) | A rejected switch must leave the UI on the old branch with nothing changed beyond an error notice | ✓ Good — BERR-02 verified; overlay bridges the reconnect, no false offline flash in tests |
| `enabled: !!client` as the sole gate on data hooks — never `!!branchId` (v1.2 Pitfall 11) | Single-branch tenants must see no first-paint delay; branch resolution is server-side | ✓ Good — SC5 single-branch first-paint parity preserved across all 5 phases |
| Central 403 choke-point via QueryCache/MutationCache `onError` (v1.2 Phase 17) | One recovery path for the switch call, ordinary requests, SSE reconnect, and focus revalidation — not per-call-site handling | ✓ Good — 0 per-call-site `BRANCH_*` branching; ⚠ but the 403 envelope is UNVERIFIED (WINDOWS #1) — degrades silently if the assumed shape is wrong |
| BRANCH_CODES matcher locked against an ASSUMED 403 shape (v1.2 Phase 17, WINDOWS #1) | Live 403 capture was infeasible (no test tenant with a revocable branch); shipping the recovery scaffold beat blocking the milestone | ⚠ Revisit — synthetic-test-locked only; re-capture the real REST+SSE body before production reliance |

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

*Last updated: 2026-07-24 after v1.2 Branch Switching milestone. Shipped branch-aware POS (sidebar switcher, per-branch cache scoping, SSE reconnect, centralized branch-access 403 handling, language relocation) — 15/15 requirements across Phases 13–17, closed `override_closeout` with deferred live/pixel verification and two open WINDOWS caveats (see Current State and Requirements → Active).*
