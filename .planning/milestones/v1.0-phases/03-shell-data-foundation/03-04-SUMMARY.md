---
phase: 03-shell-data-foundation
plan: "04"
subsystem: ui
tags: [react, i18n, css, offline, animation]

# Dependency graph
requires:
  - phase: 03-01
    provides: Wave 0 test stubs (offline-banner.test.jsx, i18n.test.js U13 group)

provides:
  - OfflineBanner React component (src/offline-banner.jsx)
  - offline_banner_title and offline_banner_sub i18n keys in ro and en
  - .offline-banner CSS class with amber theme, border, slideDown animation
  - .offline-banner .banner-sub sub-rule (muted weight)
  - @keyframes slideDown CSS animation
  - .btn-disabled-offline CSS utility class

affects:
  - 03-05 (Shell wiring — imports OfflineBanner, applies .btn-disabled-offline)
  - 04 (Core Screens — uses .btn-disabled-offline on mutating action buttons)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "OfflineBanner uses Icon+useT pattern matching shell.jsx conventions"
    - "CSS offline states use literal hsl() values (no new CSS custom properties)"
    - "Animation via @keyframes slideDown referenced by .offline-banner rule"

key-files:
  created:
    - src/offline-banner.jsx
  modified:
    - src/i18n.jsx
    - src/styles.css

key-decisions:
  - "OfflineBanner has no conditional logic — Shell controls render via isOffline prop; component always renders when mounted"
  - "Horizontal ellipsis U+2026 used in sub-text per UI-SPEC copywriting contract, not three separate dots"
  - "CSS values match 03-UI-SPEC.md exactly — no rounding or adjustment"

patterns-established:
  - "OfflineBanner pattern: dumb component (no state), receives lang prop, calls useT, renders markup"
  - ".btn-disabled-offline applied at screen level when isOffline=true — not baked into button components"

requirements-completed:
  - OFF-01

# Metrics
duration: 2min
completed: "2026-04-23"
---

# Phase 03 Plan 04: OfflineBanner Component and CSS Summary

**OfflineBanner component with bilingual amber connection-lost banner and .btn-disabled-offline CSS utility for offline mutating-button state**

## Performance

- **Duration:** 2 min
- **Started:** 2026-04-23T19:59:51Z
- **Completed:** 2026-04-23T20:01:44Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- Created `src/offline-banner.jsx` exporting `OfflineBanner` — uses `Icon name="wifi"` + `useT(lang)` for bilingual amber-themed connection-lost notification strip
- Added `offline_banner_title` and `offline_banner_sub` i18n keys to both `ro` and `en` objects in `i18n.jsx` with exact UI-SPEC copywriting strings
- Added `.offline-banner`, `.offline-banner .banner-sub`, `@keyframes slideDown`, and `.btn-disabled-offline` to `styles.css` with all values matching 03-UI-SPEC.md exactly
- All 14 relevant tests pass: 5 U10 (OfflineBanner render), 4 U8 (i18n login keys unchanged), 5 U13 (offline_ keys bilingual completeness)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create offline-banner.jsx and add i18n keys (TDD GREEN)** - `3a23c7d` (feat)
2. **Task 2: Add .offline-banner and .btn-disabled-offline to styles.css** - `64d9574` (feat)

**Plan metadata:** (SUMMARY commit — see below)

## Files Created/Modified

- `src/offline-banner.jsx` — OfflineBanner component; Icon+useT pattern; renders amber banner with wifi icon, title, and sub text; className offline-banner
- `src/i18n.jsx` — Added offline_banner_title and offline_banner_sub to ro and en language objects
- `src/styles.css` — Added .offline-banner (40px, amber hsl theme, slideDown animation, flex-shrink:0), .offline-banner .banner-sub (opacity 0.75), @keyframes slideDown, .btn-disabled-offline (opacity 0.45, cursor not-allowed, pointer-events none)

## Decisions Made

- OfflineBanner is a dumb component — Shell controls whether it renders via `isOffline` boolean; the component itself renders unconditionally when mounted. This keeps the component simple and testable in isolation.
- Horizontal ellipsis character `…` (U+2026) used in sub-text strings per UI-SPEC copywriting contract.
- CSS uses literal `hsl()` values (not new CSS custom properties) to match the inline approach used by existing button and chip rules.

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

Pre-existing failing tests (`use-orders.test.js`, `use-sse.test.js`, `offline-buttons.test.jsx`) are Wave 0 stubs for Plans 03-03 and 03-05 which are not yet implemented. These failures are expected and out of scope for this plan. Plan-specific tests (offline-banner.test.jsx and i18n.test.js) all pass.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- `OfflineBanner` component ready to drop into Shell (Plan 03-05 wires it at `isOffline` toggle)
- `.btn-disabled-offline` CSS class available for screens to apply to mutating action buttons when `isOffline=true` (Plan 04 Core Screens)
- No blockers

## Self-Check: PASSED

- src/offline-banner.jsx: FOUND
- src/i18n.jsx: FOUND
- src/styles.css: FOUND
- 03-04-SUMMARY.md: FOUND
- Commit 3a23c7d (Task 1): FOUND
- Commit 64d9574 (Task 2): FOUND

---
*Phase: 03-shell-data-foundation*
*Completed: 2026-04-23*
