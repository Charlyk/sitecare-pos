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
    - src/colors_and_type.css (fix: @import moved before @font-face)
    - src/styles.css (fix: titlebar grid row removed from .win rule)

key-decisions:
  - "App.jsx scaffold (uppercase) deleted — production entry is lowercase app.jsx; git mv used to rename properly on case-insensitive macOS filesystem"
  - "AcceptDialog kept in app.jsx — it uses local useState for dialog-only state (picked, custom, useCustom) which should not be in global Zustand store"
  - "orders=[] stub passed to OrdersScreen and KitchenScreen — Phase 3 replaces with useOrders() hook return value"
  - "orderCount hardcoded to {live:0, new:0, active:0} in Phase 1 — Phase 3 derives from live orders"
  - "@import rule in colors_and_type.css moved to top (before @font-face) — PostCSS requires @import to precede all other statements"
  - "Titlebar grid row removed from .win CSS rule — app.jsx had a nested .win wrapper causing double-row layout; fixed by removing the erroneous grid-template-rows and unwrapping the redundant .win div"

patterns-established:
  - "Pattern: All prototype window.* CDN globals replaced with explicit ES module imports — migration complete"
  - "Pattern: Shell receives orderCount from App (not from Zustand) — allows Phase 3 to pass derived values from TanStack Query cache"

requirements-completed:
  - FOUND-03
  - FOUND-04
  - FOUND-05

duration: 20min
completed: 2026-04-22
---

# Phase 1 Plan 05: Integration — Shell, App, Main Summary

**All 12 prototype files fully migrated to ES modules; app boots with Zustand store, QueryClientProvider, and design tokens wired; all 7 screens verified rendering correctly in browser with custom macOS titlebar removed in favor of native OS chrome**

## Performance

- **Duration:** ~20 min
- **Started:** 2026-04-22T21:30:00Z
- **Completed:** 2026-04-22T22:00:00Z
- **Tasks:** 2 auto tasks completed; 1 human-verify checkpoint approved
- **Files modified:** 6 (shell.jsx created, screen-printer.jsx created, app.jsx created from scaffold, main.jsx rewritten, colors_and_type.css fix, styles.css fix)

## Accomplishments
- shell.jsx converted: window.* CDN globals replaced with ES module imports; custom .titlebar div removed per D-01 (native OS window chrome)
- screen-printer.jsx converted: ThermalTicket imported from screen-detail.jsx; PRINTERS and ORDERS from data.jsx
- app.jsx built from scratch: 20 useAppStore selectors, accent useEffect, role gate, AcceptDialog, Phase 1 stub screen router — no localStorage, no letterbox, no TweaksPanel
- main.jsx rewritten: colors_and_type.css first, styles.css second, App wrapped in QueryClientProvider
- Full Vite build: 95 modules compiled, 264KB JS bundle, no errors
- Zero window.* module globals remaining in any src/ JSX file (verified with grep audit)
- All 7 screens verified rendering correctly by human reviewer — design tokens active (--sc-primary: hsl(120 14% 49%)), layout correct

## Task Commits

1. **Task 1: Convert shell.jsx and screen-printer.jsx** - `720c281` (feat)
2. **Task 2: Write app.jsx and wire main.jsx** - `3c34a10` (feat)
3. **Post-task fix: Move @import before @font-face in colors_and_type.css** - `57252e5` (fix)
4. **Post-task fix: Remove titlebar grid row from .win, fix nested .win wrapper in app.jsx** - `c1c527b` (fix)
5. **Task 3: Human verification** - Approved by user (all 7 screens render, design system active, layout correct)

## Files Created/Modified
- `src/shell.jsx` - Shell layout component: sidebar, nav groups, topbar, role pill, collapse toggle; no custom titlebar
- `src/screen-printer.jsx` - PrinterScreen with printer list, settings, live ThermalTicket preview
- `src/app.jsx` - Root App: Zustand selectors, accent useEffect, role gate, stub screen router, toast stack, AcceptDialog
- `src/main.jsx` - Vite entry: CSS token import order enforced, QueryClientProvider wraps App
- `src/colors_and_type.css` - Fixed: Google Fonts @import rule moved to top (before @font-face declarations) to satisfy PostCSS
- `src/styles.css` - Fixed: Removed erroneous titlebar grid row from .win CSS rule

## Decisions Made
- Deleted `src/App.jsx` (uppercase scaffold) and renamed to `src/app.jsx` using `git mv` to preserve git history correctly on macOS case-insensitive filesystem
- AcceptDialog uses local `useState` for `picked`, `custom`, `useCustom` — these are dialog-only ephemeral values that belong in component scope, not the global Zustand store
- `orderCount` hardcoded to `{live:0, new:0, active:0}` stubs in Phase 1 — Phase 3 derives from TanStack Query cache result of `useOrders()`
- Phase 1 screen router passes `onAdvance={() => {}}` and `onPrint={() => {}}` stubs — Phase 3 wires real API calls

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed PostCSS @import order error in colors_and_type.css**
- **Found during:** Post-task build verification (after Task 2)
- **Issue:** Google Fonts `@import url(...)` appeared after `@font-face` declarations in `colors_and_type.css`. PostCSS requires @import to precede all other statements; this caused a PostCSS warning that surfaced as a build error in strict mode.
- **Fix:** Moved the `@import url('https://fonts.googleapis.com/...')` line to the very top of the file, before all @font-face blocks.
- **Files modified:** `src/colors_and_type.css`
- **Commit:** `57252e5`

**2. [Rule 1 - Bug] Fixed nested .win wrapper and titlebar grid row causing layout failure**
- **Found during:** Human verification (Task 3 — reviewer reported layout issues)
- **Issue:** `app.jsx` had a redundant nested `.win` wrapper div inside the outer `.win` div, causing a double-layout bug. Additionally, `styles.css` had a `grid-template-rows` entry that included a titlebar row — this was leftover from the prototype's custom titlebar (removed in Task 1 per D-01) and caused the content area to be offset incorrectly.
- **Fix:** Removed the erroneous `grid-template-rows` (titlebar row) from the `.win` CSS rule in `styles.css`; removed the redundant inner `.win` wrapper div from `app.jsx`.
- **Files modified:** `src/styles.css`, `src/app.jsx`
- **Commit:** `c1c527b`

## Known Stubs

| Stub | File | Reason |
|------|------|--------|
| `orders={[]}` in screen router | src/app.jsx:67-68 | Phase 3 replaces with `useOrders()` hook; empty in Phase 1 by design |
| `onAdvance={() => {}}` | src/app.jsx:67-73 | Phase 3 wires real API advance call |
| `onPrint={() => {}}` | src/app.jsx:67-73 | Phase 5 wires thermal printer |
| `orderCount={live:0, new:0, active:0}` | src/app.jsx:65 | Phase 3 derives from TanStack Query cache |

These stubs are intentional Phase 1 placeholders documented in the plan. They do not prevent the plan's goal (app boots, all 7 screens visible, design system active) from being achieved.

## Human Verification Result

**Status: APPROVED**

The user confirmed:
- All 7 screens render correctly in the running app
- Design tokens are active (sage green accent visible, Outfit font rendered)
- Layout is correct (no offset, no double-wrapper issues)
- No JavaScript errors in the console

## Threat Surface Scan

No new network endpoints, auth paths, or file access patterns introduced. app.jsx, shell.jsx, screen-printer.jsx are pure UI rendering code with no fetch calls or security-sensitive operations.

## Next Phase Readiness
- All 12 prototype modules now ES modules — ES module migration 100% complete
- App boots and renders with Zustand store + QueryClientProvider
- Human verification approved — Phase 1 is complete
- Phase 2 (Authentication) can begin: `@charlyk/admin-client` auth flow, SSE connection

## Self-Check: PASSED

- `src/shell.jsx` — FOUND
- `src/screen-printer.jsx` — FOUND
- `src/app.jsx` — FOUND (lowercase; macOS case-insensitive filesystem confirmed `app.jsx`)
- `src/main.jsx` — FOUND
- `src/colors_and_type.css` — FOUND (fixed: @import at top)
- `src/styles.css` — FOUND (fixed: titlebar grid row removed)
- Commit `720c281` (Task 1) — VERIFIED in git log
- Commit `3c34a10` (Task 2) — VERIFIED in git log
- Commit `57252e5` (post-task fix 1) — VERIFIED in git log
- Commit `c1c527b` (post-task fix 2) — VERIFIED in git log

---
*Phase: 01-foundation*
*Completed: 2026-04-22*
