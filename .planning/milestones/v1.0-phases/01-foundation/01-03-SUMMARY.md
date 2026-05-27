---
phase: 01-foundation
plan: "03"
subsystem: ui-foundation
tags: [css, design-tokens, fonts, zustand, plugin-store, persistence]

# Dependency graph
requires:
  - phase: 01-01
    provides: Tauri+Vite+React scaffold at repo root
  - phase: 01-02
    provides: zustand@5, @tauri-apps/plugin-store installed and registered in Rust

provides:
  - "src/colors_and_type.css: all --sc-* design tokens with @font-face using absolute /fonts/ paths"
  - "src/styles.css: verbatim component CSS from prototype index.html <style> block"
  - "public/fonts/Outfit-Bold.ttf and public/fonts/Outfit-Black.ttf: bundled font files"
  - "src/store.js: useAppStore with 9 state keys, 10 actions, plugin-store persistence adapter"

affects:
  - 01-04 (ES module conversion needs store.js to exist for app.jsx imports)
  - 01-05 (main.jsx wires colors_and_type.css + styles.css imports; store is ready)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Vite public/ directory: font files at public/fonts/ served at /fonts/ (absolute URL in @font-face)"
    - "Zustand persist with custom StateStorage adapter: tauriStorage bridges Zustand persist <-> @tauri-apps/plugin-store"
    - "partialize excludes session-only keys (selectedOrder, toasts, acceptDialog) from persistence"

key-files:
  created:
    - src/colors_and_type.css
    - src/styles.css
    - public/fonts/Outfit-Bold.ttf
    - public/fonts/Outfit-Black.ttf
    - src/store.js
  modified: []

key-decisions:
  - "Font path strategy: @font-face uses absolute /fonts/ paths (not relative ./fonts/) so fonts resolve correctly when CSS is in src/ but fonts live in public/fonts/"
  - "localStorage comments in store.js are documentation only — no functional localStorage API calls exist in production code"
  - "store.js partialize: 6 persisted keys (screen, role, lang, accent, density, sidebarCollapsed); 3 session keys excluded (selectedOrder, toasts, acceptDialog)"

# Metrics
duration: ~3min
completed: 2026-04-22
---

# Phase 1 Plan 03: CSS Design System Migration + Zustand Store Summary

**CSS design tokens (colors_and_type.css), component styles (styles.css), and bundled fonts migrated from prototype to Tauri app; Zustand store (store.js) created with plugin-store persistence adapter for 6 UI preferences**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-04-22T21:21:25Z
- **Completed:** 2026-04-22
- **Tasks:** 2 (both auto)
- **Files created:** 5

## Accomplishments

- `public/fonts/Outfit-Bold.ttf` and `public/fonts/Outfit-Black.ttf` copied from prototype assets — both non-zero bytes (54916 and 48324 bytes respectively)
- `src/colors_and_type.css` written verbatim from prototype `assets/colors_and_type.css` with the single required change: `@font-face` src URLs changed from `./fonts/` (relative, broken after relocation) to `/fonts/` (absolute, served from `public/fonts/` by Vite)
- `src/styles.css` written verbatim from prototype `index.html` `<style>` block — all class names preserved (`.nav-item`, `.btn-primary`, `.card`, `.chip`, `.toast`, `.titlebar`, `.desktop-stage`, etc.)
- `src/store.js` created with `useAppStore` export: 9 state keys, 10 action functions, `tauriStorage` custom adapter delegating to `@tauri-apps/plugin-store`, `partialize` restricting persistence to 6 keys only

## Task Commits

1. **Task 1: Migrate CSS design system and bundle fonts** - `d62d85d` (feat)
2. **Task 2: Create Zustand store with plugin-store persistence adapter** - `357e217` (feat)

## Files Created

- `public/fonts/Outfit-Bold.ttf` — bundled font, weight 700, served at /fonts/Outfit-Bold.ttf
- `public/fonts/Outfit-Black.ttf` — bundled font, weight 900, served at /fonts/Outfit-Black.ttf
- `src/colors_and_type.css` — design tokens: all --sc-* custom properties; @font-face with corrected absolute paths; Google Fonts @import preserved
- `src/styles.css` — component CSS verbatim from index.html: .nav-item, .btn-primary, .btn-secondary, .btn-ghost, .btn-terracotta, .card, .chip, .chip-*, .toast, .sidebar, .topbar, .titlebar, .desktop-stage (unused but harmless), .tweaks-panel (unused but harmless), all animations
- `src/store.js` — Zustand store with tauriStorage adapter; 6 persisted keys; 3 session-only keys; 10 actions

## Decisions Made

- Font files go to `public/fonts/` (not `src/assets/`) and are referenced with absolute `/fonts/` URL in `@font-face` — simpler than Vite asset hashing, avoids relative path resolution issues when CSS is in `src/`
- Comments in `store.js` reference "localStorage" to explain migration context — not functional code; the acceptance criterion is satisfied (no `localStorage.` method calls exist)
- Prototype-only CSS classes (`.desktop-stage`, `.desktop-frame`, `.titlebar`, `.tl-*`, `.tweaks-panel`) are left in `styles.css` per plan — unused rules are harmless; deleting would require a full class audit

## Deviations from Plan

None — plan executed exactly as written.

## Stub Tracking

No stubs in this plan. `src/colors_and_type.css` and `src/styles.css` contain all design tokens and class rules. `src/store.js` has proper defaults (no hardcoded empty values that flow to rendering). These files are infrastructure — they do not render data directly.

## Threat Surface Scan

No new security-relevant surface introduced:
- T-1-06 (Font path tampering): Verified — `url("/fonts/Outfit-Bold.ttf")` and `url("/fonts/Outfit-Black.ttf")` use absolute paths; no relative `./fonts/` present in production CSS
- T-1-07 (Session state disclosure): Verified — `partialize` explicitly excludes `selectedOrder`, `toasts`, `acceptDialog` from preferences.json
- T-1-08 (localStorage DoS): Verified — no `localStorage.` method calls in store.js; tauriStorage adapter uses plugin-store exclusively

## Next Phase Readiness

Plan 01-04 (ES module conversion) can proceed immediately:
- `src/store.js` is ready for `import { useAppStore } from './store.js'` in app.jsx
- `src/colors_and_type.css` and `src/styles.css` are ready for `import './colors_and_type.css'` and `import './styles.css'` in main.jsx (Plan 05 wires these)

## Self-Check: PASSED

| Item | Status |
|------|--------|
| src/colors_and_type.css | FOUND |
| src/styles.css | FOUND |
| public/fonts/Outfit-Bold.ttf | FOUND |
| public/fonts/Outfit-Black.ttf | FOUND |
| src/store.js | FOUND |
| 01-03-SUMMARY.md | FOUND |
| Commit d62d85d (Task 1) | FOUND |
| Commit 357e217 (Task 2) | FOUND |

---
*Phase: 01-foundation*
*Completed: 2026-04-22*
