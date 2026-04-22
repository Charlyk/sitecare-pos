# Feature Landscape — SiteCare POS

**Domain:** Restaurant desktop POS (order management, kitchen display, receipt printing)
**Researched:** 2026-04-22
**Scope:** Porting a 7-screen UI prototype to a production Tauri app backed by the SiteCare API

---

## Overview

This document maps what each of the 7 prototype screens needs to become production-grade, then
synthesizes those findings into table stakes, differentiators, and anti-features for v1.

The prototype already validates the UX shape — role-based navigation, the state machine
(new → accepted → preparing → ready → done), bilingual text, and the visual design. The gap between
prototype and production is entirely about operational robustness: real data, real errors, real
printers, and real network conditions.

The production implementation has three hard constraints that shape every feature decision:
1. All API calls go through `@charlyk/admin-client`. No direct HTTP. No alternative client.
2. Real-time kitchen display depends on the API's SSE channel — not polling.
3. Greyed-out UI for features not yet wired is the chosen pattern; nothing is hidden.

---

## Screen-by-Screen: What Production Needs That the Prototype Doesn't

### Screen 1 — Orders List

**Prototype state:** Static mock list, status filter tabs, FOH/BOH switcher.

**Production gaps:**

| Gap | Why It Matters | Complexity |
|-----|----------------|------------|
| Auth guard on mount | Unauthenticated users must never see order data | Low |
| Loading skeleton (card grid) | First fetch takes 200–800ms; blank screen looks broken | Low |
| Empty state per filter tab | "No preparing orders" is a valid state, not a bug | Low |
| Error state + retry button | API failure must show message + a way to recover, not an infinite spinner | Low |
| Poll or SSE-driven list refresh | New orders from the API don't appear without a refresh signal | Medium |
| Pagination or windowing | If order history grows, rendering 500 cards destroys performance | Medium |

**Not needed in v1:** Bulk actions, CSV export, advanced search.

---

### Screen 2 — POS (Take New Order)

**Prototype state:** Item grid, add to order, discount input, checkout button — all using mock data.

**Production gaps:**

| Gap | Why It Matters | Complexity |
|-----|----------------|------------|
| Menu items fetched from API | Static mock items are meaningless in production | Medium |
| Item availability respect | Out-of-stock items from Menu Management must appear disabled here | Medium |
| Optimistic add-to-cart | Cart updates must feel instant; API submission happens at checkout | Low |
| Checkout → API order creation | The core action; must handle success, validation error, and network failure | Medium |
| Loading state on "Place Order" | Prevents double-submission; button disables during inflight request | Low |
| Success feedback + cart clear | After successful order creation, reset cart and confirm to staff | Low |
| Error feedback on failure | API rejection (item unavailable, auth expired) must surface actionably | Low |
| Discount validation | Discounts must validate against API rules before submission | Medium |

**Not needed in v1:** Split payment, table assignment, customer lookup, saved carts.

---

### Screen 3 — Kitchen Display (KDS)

**Prototype state:** Static order cards in columns, SSE wired but not consuming real events.

**Production gaps:**

| Gap | Why It Matters | Complexity |
|-----|----------------|------------|
| SSE connection with auto-reconnect | Network hiccups must not freeze the kitchen silently | Medium |
| Connection status indicator | Kitchen staff must know if the live feed is dead | Low |
| Visual timer on each ticket | Elapsed time since order received — standard KDS UX | Medium |
| Color urgency by elapsed time | Green → yellow → red as ticket ages (industry standard: green < 5min, yellow 5–10min, red > 10min) | Medium |
| Sound alert on new ticket | Audible ding is the primary attention signal in a loud kitchen | Medium |
| "Bump" / Done button per ticket | Tap to advance or complete a ticket — the primary kitchen interaction | Medium |
| Recall last bumped ticket | Accidental bumps happen; 30-second undo or recall is standard | Medium |
| Empty state (no active orders) | A calm kitchen should see a clear "No pending orders" message | Low |
| Error state (SSE dropped, no reconnect) | After N failed reconnect attempts, show a prominent banner | Low |

**KDS urgency color convention (industry standard from Lightspeed, Toast):**
- Green: ticket age 0–5 minutes (on track)
- Yellow / orange: 5–10 minutes (approaching late)
- Red (pulsing): > 10 minutes (late)
- Thresholds should be configurable in Settings even if v1 ships hardcoded defaults.

**Sound alert:** A single short bell on new ticket arrival. No sound for status advances in v1.
Web Audio API `AudioContext` is sufficient — no Tauri plugin needed.

**Not needed in v1:** Per-station routing (grill, fry, salad), coursing, multi-screen KDS spanning.

---

### Screen 4 — Order Detail

**Prototype state:** Full single-order view with timeline and status action buttons — all mock.

**Production gaps:**

| Gap | Why It Matters | Complexity |
|-----|----------------|------------|
| Load order by ID from API | Deep-link into an order from Orders list | Low |
| Loading skeleton | Detail fetch takes time; show structure while loading | Low |
| Status action buttons wired to API | Accept, advance, cancel — the core lifecycle actions | Medium |
| Optimistic status update | Show new status immediately; revert on error | Medium |
| Confirm dialog before cancel | Accidental cancels are costly; require confirmation | Low |
| Prep-time picker on accept | Already in prototype (accept dialog) — must wire to API | Low |
| Print receipt button | Trigger receipt print from Order Detail | Medium |
| Error states per action | Each button needs its own failure feedback | Low |
| Timeline from real API data | Status timestamps must come from API, not be fabricated | Low |

**Not needed in v1:** Order editing after acceptance, refunds, partial fulfillment per item.

---

### Screen 5 — Menu Management

**Prototype state:** Item list with in-stock / out-of-stock toggles — all mock.

**Production gaps:**

| Gap | Why It Matters | Complexity |
|-----|----------------|------------|
| Menu items fetched from API | Load real menu structure | Low |
| Toggle wired to API | Availability change must persist to backend | Medium |
| Optimistic toggle | Toggle feels instant; revert on API failure | Low |
| Loading skeleton | Initial load takes time | Low |
| Empty state | "No menu items" should not look like a bug | Low |
| Error state on toggle failure | Staff must know when an availability change didn't save | Low |

**Scope boundary (from PROJECT.md):** This screen is availability-only. Full menu CRUD (add item,
edit price, change category, upload image) is explicitly out of scope for v1 and should be
greyed-out or absent entirely.

---

### Screen 6 — Printer Setup

**Prototype state:** Printer config form and test print button — all mock.

**Production gaps:**

| Gap | Why It Matters | Complexity |
|-----|----------------|------------|
| Printer discovery (USB + network) | Staff must be able to find their printer without knowing its IP | High |
| Save printer config to Tauri store | Settings must persist across app restarts | Low |
| Test print via Tauri plugin | Verify the printer is connected and configured correctly | High |
| Error state on failed test | "Printer not found" or "connection refused" must surface clearly | Medium |
| ESC/POS command generation | Format a proper receipt with items, totals, restaurant name | High |

**Tauri printer approach:** Use `tauri-plugin-thermal-printer` (USB + TCP/network on macOS and
Windows, 68 commits, most complete option found). Avoid `tauri-plugin-escpos` (BLE-only, Android
focused). The Tauri plugin calls into Rust which speaks ESC/POS directly — this is the right
approach because the system print dialog produces PDF-style output incompatible with thermal receipt
printers.

**System print dialog is an anti-pattern for thermal printers.** ESC/POS printers expect raw binary
commands over USB or TCP, not PostScript or PDF. The system dialog will either error or produce
garbage output on a typical 80mm thermal printer. Use the Tauri plugin path.

**Not needed in v1:** Bluetooth printer pairing, kitchen printer routing (different printer per
station), cash drawer trigger.

---

### Screen 7 — Settings

**Prototype state:** Language toggle (RO/EN), role switcher, receipt preferences — all persisted
to localStorage.

**Production gaps:**

| Gap | Why It Matters | Complexity |
|-----|----------------|------------|
| Persist settings via Tauri store plugin | `localStorage` is unavailable in Tauri's WebView context on all platforms; use `@tauri-apps/plugin-store` | Low |
| Session timeout config | Staff should be able to set auto-lock duration | Medium |
| KDS timer thresholds (optional v1) | Green/yellow/red cutoffs — can ship hardcoded | Low |
| Logout action | Must clear auth token from secure storage and redirect to login | Low |

---

## Table Stakes

Features that must work on day 1 or the app is unusable. Staff will refuse to use the app
without these.

### Authentication

| Feature | Why Required | Complexity |
|---------|--------------|------------|
| Username + password login via `@charlyk/admin-client` | Entry point to everything | Low |
| Auth token stored in OS secure storage (Keychain / Windows Credential Manager) | `localStorage` is not secure for auth tokens in a desktop app; use `keyring` crate via Tauri | Medium |
| Auth guard on every screen | Unauthenticated navigation must redirect to login | Low |
| Token refresh on expiry | Session must survive a shift (8+ hours) without re-login | Medium |
| Logout that clears secure storage | Shared devices need real session termination | Low |
| Error state on failed login | Wrong credentials must show a clear message, not a blank screen | Low |

**Session timeout:** Auto-lock after configurable idle period (default 30 minutes). Show a PIN
re-entry screen rather than a full re-login — standard POS pattern on shared devices.

**Not needed in v1:** SSO, OAuth, biometric login, PIN-only flow (username/password is fine for v1).

---

### Order Management (Core Lifecycle)

| Feature | Why Required | Complexity |
|---------|--------------|------------|
| Accept order with prep-time selection | Primary FOH action; sends confirmation to kitchen | Medium |
| Advance order status (preparing → ready → done) | Drive the order through the state machine | Medium |
| Cancel order with confirmation dialog | Cancels happen; must be intentional, not accidental | Low |
| Print receipt from Order Detail | Guests expect a receipt; cannot be deferred | Medium |
| Real data from API on Orders list | Mock data has no operational value | Medium |
| Optimistic status updates | Status change must feel instant; 500ms API round-trips break flow | Medium |
| Revert on API failure with toast | Optimistic update must roll back cleanly if the API rejects | Medium |

---

### Kitchen Display

| Feature | Why Required | Complexity |
|---------|--------------|------------|
| SSE connection consuming real events | The KDS is useless without live data | Medium |
| Auto-reconnect with exponential backoff | Network drops in a kitchen environment; silent failure is dangerous | Medium |
| Connection status banner | Kitchen staff must see "DISCONNECTED — reconnecting…" when SSE is dead | Low |
| Elapsed time timer per ticket | Kitchens run on time; every KDS in the market shows this | Medium |
| Color urgency (green/yellow/red) | Standard KDS convention; deviating confuses trained kitchen staff | Medium |
| Bump / Done button per ticket | Primary kitchen interaction; there is no KDS without it | Medium |
| Sound alert on new ticket | Loud kitchen environments require audible notification | Medium |
| Wired to order lifecycle API | Bumping a ticket must advance the order status in the backend | Medium |

---

### Printer Integration

| Feature | Why Required | Complexity |
|---------|--------------|------------|
| ESC/POS receipt printing via Tauri plugin (USB or TCP) | Thermal printers do not work with system print dialog | High |
| Printer discovery (list connected USB + network printers) | Staff cannot be expected to enter raw IP addresses blind | High |
| Test print from Printer Setup screen | Verify configuration before service starts | Medium |
| Receipt content: restaurant name, items, quantities, prices, total, timestamp, order number | Minimum legal and operational content on a receipt | Medium |
| Persist printer config across restarts | Having to re-configure the printer every launch is unacceptable | Low |

---

### Loading, Error, and Empty States (All Screens)

These are not glamorous but a production app without them feels broken. Every screen that
fetches data needs all three.

| State | What It Means | Complexity |
|-------|---------------|------------|
| Loading skeleton (not spinner) | Matches the layout of real content; reduces perceived wait time | Low per screen |
| Error state + retry button | API failures must be surfaced with a clear message and recovery path | Low per screen |
| Empty state with context | "No accepted orders" is different from "something went wrong" | Low per screen |
| React Error Boundary wrapping each screen | Crash isolation — one screen crashing must not take down the whole app | Low |

---

### Offline Resilience (Minimum Viable)

Full offline mode is complex (local data store, sync engine, conflict resolution). For v1,
the minimum viable approach is:

| Feature | Why Required | Complexity |
|---------|--------------|------------|
| Connectivity detection (online/offline banner) | Staff must know they lost connectivity | Low |
| Graceful degradation messaging | "Cannot process orders — no connection" is better than a broken spinner | Low |
| Queue-and-retry for status actions | If advancing an order status fails due to network, retry automatically on reconnect | Medium |
| SSE reconnection on network restore | Kitchen display must resume without manual intervention | Medium |

**Full offline mode (local order creation, offline payment, sync on reconnect) is a v2 feature.**
The app connects to a live API for all operations. The SiteCare API cannot be replicated locally
without significant backend work. Attempting full offline in v1 would require a local data store,
a sync engine, and conflict resolution — more work than the rest of the app combined. The minimum
viable approach (banner + graceful degradation + retry queue) protects staff without requiring that
infrastructure.

---

## Differentiators

Features that improve the experience beyond baseline expectation. These are valuable but not
blockers for launch.

| Feature | Value Proposition | Complexity | Phase |
|---------|-------------------|------------|-------|
| KDS ticket recall (undo last bump) | Prevents re-entry for accidental completions; standard in premium KDS | Medium | v1.1 |
| Configurable KDS urgency thresholds | Different kitchens have different SLAs; 10min default is not universal | Low | v1.1 |
| Prep-time suggestion on accept | Show historical average for similar orders; reduces cognitive load | High | v2 |
| Keyboard shortcuts for order actions | Power users (accept: Enter, cancel: Escape) | Low | v1.1 |
| Window state persistence | App remembers which screen was active and sidebar state on relaunch | Low | v1.1 |
| Auto-lock with PIN re-entry | Shared device safety without a full re-login disruption | Medium | v1.1 |
| Order count badge on nav sidebar | Glanceable "3 new orders" without switching screen | Low | v1.1 |
| Density toggle (already in prototype) | Compact vs comfortable view for different screen sizes | Low | v1 (prototype has it) |
| Cash drawer trigger on receipt print | Common in restaurant setups; single ESC/POS command addition | Low | v1.1 |

---

## Anti-Features (v1)

Features to deliberately not build in v1. Each has a reason and a deferral path.

| Feature | Why Avoid in v1 | When to Revisit |
|---------|-----------------|-----------------|
| Full offline mode (local DB + sync) | Requires a sync engine and conflict resolution — more work than the app itself | v2, if connectivity is a real pain point |
| Full menu CRUD (add/edit/delete items, prices, images) | Explicitly out of scope per PROJECT.md; availability toggles only | v2, separate screen |
| Table management (seating map, assign server) | Not in the 7-screen prototype; adds significant domain complexity | v3 or never (depends on restaurant type) |
| Payment processing (card terminals, split bills) | Requires PCI compliance, payment hardware integration, financial audit trail | v2 with dedicated payment provider |
| Customer-facing display (order status screen) | Separate hardware, separate UX domain | v3 |
| Multi-location management | Single-location focus for v1; API may not support it | v3 |
| Inventory management (ingredient tracking, reorder alerts) | Different domain entirely from order management | v3 |
| Loyalty / CRM / customer accounts | No customer data model in prototype or API client | v3 |
| Online ordering / third-party delivery integration | Separate ingestion pipeline; not a POS responsibility | v2 |
| Employee time tracking / payroll | HR domain, not POS | v3 |
| Reporting and analytics dashboards | Useful but not operational; staff don't need it during service | v2 |
| iOS / Android port | Desktop-only per PROJECT.md | After v1 ships |
| TypeScript migration | Not requested for v1 | After v1 ships |
| Custom API client / direct HTTP | @charlyk/admin-client is the only sanctioned data layer | Never |
| System print dialog for receipts | Incompatible with 80mm thermal ESC/POS printers; produces wrong output | Never |

---

## Feature Dependencies

Dependencies that constrain build order. An arrow means "must exist before."

```
Auth (login + token storage)
  → every other screen (all screens require authentication)

@charlyk/admin-client session
  → Orders list (real data)
  → POS checkout (order creation)
  → Order Detail actions (accept, advance, cancel)
  → Menu availability toggles
  → KDS order state (bump wired to API)

Menu items from API
  → POS item grid (can't take orders without a real menu)
  → Menu Management toggle list

Item availability state (Menu Management)
  → POS screen (out-of-stock items must be disabled)

SSE connection established
  → KDS live order queue
  → Orders list refresh signal (optional but recommended)

Order created (POS checkout)
  → Order Detail (navigate to new order)
  → Orders list (new order appears)
  → KDS (new ticket appears via SSE)

Tauri store plugin (settings persistence)
  → Language preference (RO/EN)
  → Role preference (cashier/kitchen)
  → Printer config (printer address + paper size)
  → Session timeout preference

Tauri thermal-printer plugin (ESC/POS)
  → Printer Setup (discovery, test print)
  → Print receipt from Order Detail
  → (optional v1.1) Cash drawer trigger

Order Detail load
  → Print receipt action (need full order data to generate receipt content)

Connection status detection
  → SSE reconnect logic
  → Offline degradation banner
  → Action retry queue
```

**Critical path to an operational app (minimum to be usable in a real restaurant):**

1. Auth login screen → secure token storage
2. Orders list with real API data + loading/error/empty states
3. Order Detail with accept + advance + cancel wired to API
4. KDS with SSE, elapsed timers, color urgency, bump button, sound alert
5. POS with real menu, checkout wired to API
6. Printer Setup + print receipt from Order Detail
7. Menu availability toggles wired to API
8. Settings persisted via Tauri store

This is the ordered build sequence. Each step is a prerequisite for the one after it in an
operational sense. Steps 1–4 are the MVP that makes the app useful for kitchen and floor staff.
Steps 5–8 complete the full loop.

---

## Sources

- [44 Best Restaurant POS Features Every Operator Needs in 2026 — Quantic](https://getquantic.com/restaurant-pos-system-features/)
- [Kitchen Display System Guide — Restaurant365](https://www.restaurant365.com/blog/kitchen-display-system/)
- [KDS Platform Guide — Toast](https://doc.toasttab.com/doc/platformguide/platformKDSOverview.html)
- [Using the KDS 2.0 — Lightspeed K-Series](https://k-series-support.lightspeedhq.com/hc/en-us/articles/22708154090267-Using-the-Kitchen-Display-System-2-0)
- [Offline Mode Overview — Toast](https://doc.toasttab.com/doc/platformguide/adminOfflineModeOverview.html)
- [What is a KDS? (2026) — Quantic](https://getquantic.com/what-is-a-kds/)
- [17 Features You Need in Your KDS — Fresh Technology](https://www.fresh.technology/blog/kitchen-display-system-features-you-need)
- [POS Offline Mode — SpotOn](https://www.spoton.com/blog/pos-offline-mode/)
- [tauri-plugin-thermal-printer — GitHub](https://github.com/luis3132/tauri-plugin-thermal-printer)
- [tauri-plugin-escpos — GitHub](https://github.com/lnxdxtf/tauri-plugin-escpos)
- [Secure storage discussion — Tauri GitHub](https://github.com/orgs/tauri-apps/discussions/7846)
- [POS Security and Compliance 2026 — Cloud Restaurant Manager](https://cloudrestaurantmanager.com/pos-security-and-compliance-for-restaurants/)
- [SSE with React — OneUptime](https://oneuptime.com/blog/post/2026-01-15-server-sent-events-sse-react/view)
- [KDS Features FAQ — Fresh Technology](https://www.fresh.technology/blog/kitchen-display-systems-5-frequently-asked-questions)
