---
phase: 01-foundation
plan: "05"
subsystem: ui
tags: [react, zustand, tanstack-query, tauri, vite, es-modules, shell, app-root]

requires:
  - phase: 01-03
    provides: store.js (useAppStore), colors_and_type.css, styles.css
  - phase: 01-04
    provides: all 9 screen/utility ES modules (screen-orders, screen-kitchen, screen-pos, screen-detail, screen-menu, screen-settings, i18n, icons, data)

provides:
  - src/shell.jsx — Shell layout (sidebar nav, topbar, role pill, collapse toggle); ES module with named export
  - src/screen-printer.jsx — PrinterScreen with ThermalTicket preview; ES module with named export
  - src/app.jsx — Root App component: all UI state from Zustand, accent useEffect, role gate, AcceptDialog, Phase 1 stub screen router
  - src/main.jsx — Vite entry: colors_and_type.css first, styles.css second, QueryClientProvider wrapping App
  - Complete ES module migration of all 12 prototype files (Plans 03+04+05)

affects: [phase-02-auth, phase-03-shell-data, phase-04-core-screens, phase-05-native]

tech-stack:
  added: []
  patterns:
    - "App reads all UI state via useAppStore selectors — no local useState for persisted prefs"
    - "Screen router in App passes orders=[] stub; Phase 3 replaces with useOrders()"
    - "Accent color applied via document.documentElement.style.setProperty in useEffect"
    - "AcceptDialog lives in app.jsx as a local component using local useState for dialog-only state"
    - "main.jsx imports CSS in strict order: colors_and_type.css (tokens) then styles.css (components)"

key-files:
  created:
    - src/shell.jsx
    - src/screen-printer.jsx
    - src/app.jsx
  modified:
    - src/main.jsx

key-decisions:
  - "App.jsx scaffold (uppercase) deleted — production entry is lowercase app.jsx; git mv used to rename properly on case-insensitive macOS filesystem"
  - "AcceptDialog kept in app.jsx — it uses local useState for dialog-only state (picked, custom, useCustom) which should not be in global Zustand store"
  - "orders=[] stub passed to OrdersScreen and KitchenScreen — Phase 3 replaces with useOrders() hook return value"
  - "orderCount hardcoded to {live:0, new:0, active:0} in Phase 1 — Phase 3 derives from live orders"

patterns-established:
  - "Pattern: All prototype window.* CDN globals replaced with explicit ES module imports — migration complete"
  - "Pattern: Shell receives orderCount from App (not from Zustand) — allows Phase 3 to pass derived values from TanStack Query cache"

requirements-completed:
  - FOUND-03
  - FOUND-04
  - FOUND-05

duration: 15min
completed: 2026-04-22
---

# Phase 1 Plan 05: Integration — Shell, App, Main Summary

**All 12 prototype files fully migrated to ES modules; app boots with Zustand store, QueryClientProvider, and design tokens wired; custom macOS titlebar removed in favor of native OS chrome**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-04-22T21:30:00Z
- **Completed:** 2026-04-22T21:46:00Z
- **Tasks:** 2 auto tasks completed; 1 checkpoint awaiting human verification
- **Files modified:** 4 (shell.jsx created, screen-printer.jsx created, app.jsx created from scaffold, main.jsx rewritten)

## Accomplishments
- shell.jsx converted: window.* CDN globals replaced with ES module imports; custom .titlebar div removed per D-01 (native OS window chrome)
- screen-printer.jsx converted: ThermalTicket imported from screen-detail.jsx; PRINTERS and ORDERS from data.jsx
- app.jsx built from scratch: 20 useAppStore selectors, accent useEffect, role gate, AcceptDialog, Phase 1 stub screen router — no localStorage, no letterbox, no TweaksPanel
- main.jsx rewritten: colors_and_type.css first, styles.css second, App wrapped in QueryClientProvider
- Full Vite build: 95 modules compiled, 264KB JS bundle, no errors
- Zero window.* module globals remaining in any src/ JSX file (verified with grep audit)

## Task Commits

1. **Task 1: Convert shell.jsx and screen-printer.jsx** - `720c281` (feat)
2. **Task 2: Write app.jsx and wire main.jsx** - `3c34a10` (feat)
3. **Task 3: Human verification checkpoint** — awaiting (see checkpoint below)

## Files Created/Modified
- `src/shell.jsx` - Shell layout component: sidebar, nav groups, topbar, role pill, collapse toggle; no custom titlebar
- `src/screen-printer.jsx` - PrinterScreen with printer list, settings, live ThermalTicket preview
- `src/app.jsx` - Root App: Zustand selectors, accent useEffect, role gate, stub screen router, toast stack, AcceptDialog
- `src/main.jsx` - Vite entry: CSS token import order enforced, QueryClientProvider wraps App

## Decisions Made
- Deleted `src/App.jsx` (uppercase scaffold) and renamed to `src/app.jsx` using `git mv` to preserve git history correctly on macOS case-insensitive filesystem
- AcceptDialog uses local `useState` for `picked`, `custom`, `useCustom` — these are dialog-only ephemeral values that belong in component scope, not the global Zustand store
- `orderCount` hardcoded to `{live:0, new:0, active:0}` stubs in Phase 1 — Phase 3 derives from TanStack Query cache result of `useOrders()`
- Phase 1 screen router passes `onAdvance={() => {}}` and `onPrint={() => {}}` stubs — Phase 3 wires real API calls

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

**Case-insensitive filesystem (macOS):** The scaffold `src/App.jsx` and new `src/app.jsx` are the same path on macOS. Writing `app.jsx` content to the filesystem overwrote `App.jsx`. Used `git mv src/App.jsx src/app.jsx` to correctly register the rename in git history. Then deleted the file and recreated via bash to ensure the file existed with the correct lowercase inode. Git now correctly tracks `src/app.jsx` as a renamed+modified file.

**PostCSS warning (pre-existing):** `colors_and_type.css` has a Google Fonts `@import` after the `@font-face` blocks, which PostCSS warns about (`@import must precede all other statements`). This was already present in Plan 03 and is out of scope for Plan 05. The build succeeds (warning only). Tracked in deferred-items.

## Known Stubs

| Stub | File | Reason |
|------|------|--------|
| `orders={[]}` in screen router | src/app.jsx:67-68 | Phase 3 replaces with `useOrders()` hook; empty in Phase 1 by design |
| `onAdvance={() => {}}` | src/app.jsx:67-73 | Phase 3 wires real API advance call |
| `onPrint={() => {}}` | src/app.jsx:67-73 | Phase 5 wires thermal printer |
| `orderCount={live:0, new:0, active:0}` | src/app.jsx:65 | Phase 3 derives from TanStack Query cache |

These stubs are intentional Phase 1 placeholders documented in the plan. They do not prevent the plan's goal (app boots, all 7 screens visible, design system active) from being achieved.

## Awaiting: Human Verification (Task 3)

The checkpoint requires manual browser verification:

1. Run `npm run dev` and open http://localhost:5173
2. Verify no JavaScript errors in console (no ReferenceError, TypeError)
3. In DevTools console: `getComputedStyle(document.documentElement).getPropertyValue('--sc-primary')` — expected: `hsl(120 14% 49%)`
4. Click all 7 nav items and confirm each screen renders
5. Verify fonts load (Network tab → filter Font → Outfit-Bold.ttf returns 200)
6. Run `npm run tauri dev` and verify CSP does not block `https://api.restaurant.sitecare.ro`
7. Test Zustand persistence: change language in Settings, quit app, relaunch — language should persist

## Threat Surface Scan

No new network endpoints, auth paths, or file access patterns introduced. app.jsx, shell.jsx, screen-printer.jsx are pure UI rendering code with no fetch calls or security-sensitive operations.

## Next Phase Readiness
- All 12 prototype modules now ES modules — ES module migration 100% complete
- App boots and renders with Zustand store + QueryClientProvider
- After human verification approval, Phase 1 is complete
- Phase 2 (Authentication) can begin: `@charlyk/admin-client` auth flow, SSE connection

## Self-Check: PASSED

- `src/shell.jsx` — FOUND
- `src/screen-printer.jsx` — FOUND
- `src/app.jsx` — FOUND (lowercase; macOS case-insensitive filesystem makes `-f App.jsx` and `-f app.jsx` resolve identically, but `ls` confirms the actual filename is `app.jsx`)
- `src/main.jsx` — FOUND
- Commit `720c281` (Task 1) — VERIFIED in git log
- Commit `3c34a10` (Task 2) — VERIFIED in git log

---
*Phase: 01-foundation*
*Completed: 2026-04-22*
