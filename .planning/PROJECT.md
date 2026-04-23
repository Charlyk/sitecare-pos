# SiteCare POS — Desktop App

## What This Is

A Tauri-based desktop application (macOS + Windows) for SiteCare restaurant staff to manage orders in real-time. The UI is a pixel-perfect port of the Claude Design prototype — same 7 screens, same design system, same brand — backed by the live SiteCare API via `@charlyk/admin-client`. Features not yet production-ready are greyed-out in the UI rather than hidden.

## Core Value

Restaurant staff can see, accept, and advance orders in real-time from a native desktop app that looks and feels exactly like the design prototype.

## Requirements

### Validated

- ✓ Full 7-screen app shell (Orders, POS, Kitchen, Order Detail, Menu, Printer, Settings) — existing prototype
- ✓ SiteCare design system (sage/terracotta palette, Outfit font, CSS design tokens) — existing prototype
- ✓ Bilingual UI (Romanian + English) — existing prototype
- ✓ Role-based navigation (cashier vs kitchen) — existing prototype
- ✓ Order state machine: new → accepted → preparing → ready → done — existing prototype
- ✓ Sidebar with role switcher, accent themes, density toggle — existing prototype
- ✓ macOS window chrome (titlebar dots, draggable) — existing prototype
- ✓ Toast notifications and accept dialog (prep-time picker) — existing prototype
- ✓ Preference persistence (lang, role, screen, accent, density) — existing prototype

### Active

- [x] Tauri app shell with macOS + Windows build targets — Validated in Phase 1: Tauri + Vite scaffold at repo root, native window opens
- [x] React + Vite frontend replacing CDN/Babel-standalone prototype — Validated in Phase 1: all 12 prototype files converted to ES modules, Vite 6 + React 18
- [x] Username + password authentication via @charlyk/admin-client — Validated in Phase 2: signIn, keychain persistence, proactive refresh, auth guard
- [ ] Live order data from SiteCare API (replacing mock window.ORDERS)
- [ ] SSE integration for real-time kitchen display order updates
- [ ] Menu availability toggles (in-stock / out-of-stock) wired to API
- [ ] Order lifecycle actions (accept, advance, cancel) wired to API
- [ ] POS order creation wired to API
- [ ] Greyed-out UI for features not yet production-ready
- [ ] macOS + Windows installer / build pipeline

### Out of Scope

- Linux build — not requested, add later if needed
- TypeScript — not in scope for v1; plain JS
- Mobile / web version — desktop-only
- Backend / API development — existing API via @charlyk/admin-client
- Custom API client — SDK handles all API communication
- Full menu CRUD — Menu screen is availability-only (in-stock / out-of-stock), not full editing

## Context

**Origin:** Claude Design handoff bundle — a fully fleshed HTML/React prototype with 7 screens, all CSS, and mock data. The prototype runs React 18 via CDN with Babel standalone transpilation. The production app replaces the CDN stack with React + Vite inside a Tauri shell.

**API SDK:** `@charlyk/admin-client` (v1.1.20, proprietary, GitHub Package Registry `npm.pkg.github.com`). This is the only sanctioned way to communicate with the SiteCare backend. Published by GitHub Actions bot — expect frequent updates.

**Real-time:** The API has SSE (Server-Sent Events) configured. The Kitchen display screen depends on this for live order queue updates.

**Design fidelity requirement:** The prototype UI must be reproduced pixel-perfectly. CSS design tokens (`colors_and_type.css`) and the SiteCare brand are non-negotiable. The macOS window chrome simulation from the prototype is preserved in the Tauri window.

**Feature gating:** Features not yet ready are greyed-out in the UI (disabled, visible, not clickable). Nothing is hidden — this lets users see what's coming and avoids confusion about missing nav items.

## Constraints

- **Framework:** Tauri — user-specified, not Electron
- **Frontend:** React + Vite — matches prototype tech, standard Tauri frontend
- **API:** @charlyk/admin-client only — no direct HTTP calls, no custom client
- **Platforms:** macOS + Windows — both must ship
- **Design:** Pixel-perfect match to Claude Design prototype — no redesign

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Tauri over Electron | User specified; smaller binary, native OS integration, Rust backend | — Pending |
| React + Vite frontend | Matches prototype's React components; minimal migration effort | — Pending |
| All screens built upfront | Build everything, grey-out unready — avoids partial UI gaps | — Pending |
| SSE not polling for kitchen | Backend already has SSE configured; polling wastes resources | — Pending |
| Plain JS, not TypeScript | Not requested for v1; reduces setup complexity | — Pending |
| @charlyk/admin-client as sole data layer | Existing SDK; no need to build a custom API client | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-04-23 — Phase 2 Authentication complete and human-verified*
