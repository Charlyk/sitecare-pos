# Requirements: SiteCare POS Desktop App

**Defined:** 2026-04-22
**Core Value:** Restaurant staff can see, accept, and advance orders in real-time from a native desktop app that looks exactly like the design prototype.

## v1 Requirements

### Foundation

- [ ] **FOUND-01**: Tauri v2 + React 18 + Vite 6 scaffold builds successfully on macOS and Windows
- [ ] **FOUND-02**: @charlyk/admin-client installs from GitHub Package Registry in local dev and CI environments
- [ ] **FOUND-03**: All 7 prototype screens converted from `window.*` globals to ES module imports/exports
- [ ] **FOUND-04**: Zustand store manages UI state (screen, role, lang, accent, density, sidebar, toasts) with @tauri-apps/plugin-store persistence
- [ ] **FOUND-05**: CSS design tokens from prototype (`colors_and_type.css`) imported and working in Vite without modification
- [ ] **FOUND-06**: Tauri CSP configured to allow API domain in `connect-src` (blocks SSE and fetches if missing)

### Authentication

- [ ] **AUTH-01**: User can log in with username + password via @charlyk/admin-client
- [ ] **AUTH-02**: Auth token is persisted in OS secure storage (macOS Keychain / Windows Credential Manager), not localStorage
- [ ] **AUTH-03**: App proactively refreshes auth token before expiry to cover full 8-hour shifts
- [ ] **AUTH-04**: App auto-logs in on restart when a valid stored token exists (remember device)
- [ ] **AUTH-05**: All screens are protected by an auth guard — unauthenticated users are redirected to login screen

### Orders

- [ ] **ORD-01**: User can view a live list of orders with status filtering (new, accepted, preparing, ready, done)
- [ ] **ORD-02**: User can switch between FOH (cashier) and BOH (kitchen) role views
- [ ] **ORD-03**: User can search orders by order ID or customer name

### Order Actions

- [ ] **ACT-01**: User can accept a new order and set prep time — triggers `new → accepted` transition with prep-time picker dialog
- [ ] **ACT-02**: User can advance order status through the lifecycle: `preparing → ready → done` (and `ready → out → done` for delivery)
- [ ] **ACT-03**: User can cancel an order from the Orders list or Order Detail screen
- [ ] **ACT-04**: User can print a receipt for any order from the Order Detail screen

### Kitchen Display

- [ ] **KDS-01**: Kitchen display shows live order queue updated in real-time via SSE (no polling)
- [ ] **KDS-02**: Each ticket shows elapsed time since the order was placed, updated every minute
- [ ] **KDS-03**: Tickets visually indicate urgency by age — green (fresh), yellow (waiting), red (overdue)
- [ ] **KDS-04**: App plays a sound alert when a new order ticket arrives on the KDS
- [ ] **KDS-05**: User can bump (mark done) a ticket directly from the KDS screen

### POS

- [ ] **POS-01**: User can browse the live menu with categories and items fetched from the API
- [ ] **POS-02**: User can add items to a cart and adjust quantities before checkout
- [ ] **POS-03**: User can apply discounts (per-item or whole order) during checkout
- [ ] **POS-04**: User can select order type (dine-in, pickup, delivery) before submitting
- [ ] **POS-05**: User can submit a completed order to the kitchen via the API

### Menu Management

- [ ] **MENU-01**: User can toggle item availability (in-stock / out-of-stock) from the Menu screen
- [ ] **MENU-02**: Menu screen shows current availability state loaded from the live API

### Printer

- [ ] **PRNT-01**: User can configure thermal printer connection (USB or TCP) in the Printer Setup screen
- [ ] **PRNT-02**: User can send a test print from the Printer Setup screen
- [ ] **PRNT-03**: App prints receipts via ESC/POS protocol using a Tauri native plugin (system print dialog is incompatible with thermal printers)

### Settings

- [ ] **SET-01**: User can change app language (Romanian / English), persisted across app restarts
- [ ] **SET-02**: User can change display density (balanced / dense), persisted across app restarts
- [ ] **SET-03**: User can change accent theme color, persisted across app restarts

### Offline Resilience

- [ ] **OFF-01**: App shows a visible "connection lost" banner when the API is unreachable
- [ ] **OFF-02**: Existing data remains visible from TanStack Query cache while offline
- [ ] **OFF-03**: Mutating actions (accept, advance, cancel, create order) are disabled while offline and re-enabled on reconnect

### Build Pipeline

- [ ] **BILD-01**: GitHub Actions CI builds on every push and produces platform installers on release tags
- [ ] **BILD-02**: macOS .dmg installer with Apple notarization (required for Gatekeeper on macOS 13+)
- [ ] **BILD-03**: Windows .msi installer with code signing (avoids SmartScreen reputation warnings)
- [ ] **BILD-04**: App checks for and installs updates automatically via Tauri updater

## v2 Requirements

### Offline (advanced)

- **OFF-V2-01**: Queue new orders locally when offline, sync with API on reconnect
- **OFF-V2-02**: Queue order status advances locally when offline, sync on reconnect

### POS (advanced)

- **POS-V2-01**: Table assignment / table map integration
- **POS-V2-02**: Discount code redemption from external promotions system

### Kitchen Display (advanced)

- **KDS-V2-01**: Split KDS view — show multiple order stages simultaneously
- **KDS-V2-02**: Configurable urgency thresholds per restaurant type

### Admin

- **ADMIN-V2-01**: Full menu CRUD (add/edit/remove items and categories)
- **ADMIN-V2-02**: User management and role assignment within the app
- **ADMIN-V2-03**: Multi-printer routing (send different ticket types to different printers)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Linux build | Not requested; add later if needed |
| TypeScript | Not in scope for v1; plain JavaScript |
| Mobile / web version | Desktop-only app |
| Custom API client | @charlyk/admin-client is the only sanctioned API layer |
| Full menu CRUD | Menu screen is availability-only (in-stock/out-of-stock); editing is v2 |
| Full offline order creation | Requires local SQLite + sync engine; deferred to v2 |
| PIN / OAuth login | Username + password sufficient for v1 |
| Batch order operations | v2 once core flow is validated |
| iOS / Android | Out of scope entirely |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| FOUND-01 | Phase 1 | Pending |
| FOUND-02 | Phase 1 | Pending |
| FOUND-03 | Phase 1 | Pending |
| FOUND-04 | Phase 1 | Pending |
| FOUND-05 | Phase 1 | Pending |
| FOUND-06 | Phase 1 | Pending |
| AUTH-01 | Phase 2 | Pending |
| AUTH-02 | Phase 2 | Pending |
| AUTH-03 | Phase 2 | Pending |
| AUTH-04 | Phase 2 | Pending |
| AUTH-05 | Phase 2 | Pending |
| ORD-01 | Phase 4 | Pending |
| ORD-02 | Phase 4 | Pending |
| ORD-03 | Phase 4 | Pending |
| ACT-01 | Phase 4 | Pending |
| ACT-02 | Phase 4 | Pending |
| ACT-03 | Phase 4 | Pending |
| ACT-04 | Phase 5 | Pending |
| KDS-01 | Phase 3 | Pending |
| KDS-02 | Phase 4 | Pending |
| KDS-03 | Phase 4 | Pending |
| KDS-04 | Phase 4 | Pending |
| KDS-05 | Phase 4 | Pending |
| POS-01 | Phase 4 | Pending |
| POS-02 | Phase 4 | Pending |
| POS-03 | Phase 4 | Pending |
| POS-04 | Phase 4 | Pending |
| POS-05 | Phase 4 | Pending |
| MENU-01 | Phase 4 | Pending |
| MENU-02 | Phase 4 | Pending |
| PRNT-01 | Phase 5 | Pending |
| PRNT-02 | Phase 5 | Pending |
| PRNT-03 | Phase 5 | Pending |
| SET-01 | Phase 4 | Pending |
| SET-02 | Phase 4 | Pending |
| SET-03 | Phase 4 | Pending |
| OFF-01 | Phase 3 | Pending |
| OFF-02 | Phase 3 | Pending |
| OFF-03 | Phase 3 | Pending |
| BILD-01 | Phase 6 | Pending |
| BILD-02 | Phase 6 | Pending |
| BILD-03 | Phase 6 | Pending |
| BILD-04 | Phase 6 | Pending |

**Coverage:**
- v1 requirements: 41 total
- Mapped to phases: 41
- Unmapped: 0 ✓

---
*Requirements defined: 2026-04-22*
*Last updated: 2026-04-22 after initial definition*
