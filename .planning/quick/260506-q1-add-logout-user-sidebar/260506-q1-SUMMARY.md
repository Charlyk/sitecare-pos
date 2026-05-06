---
quick_id: 260506-q1
status: complete
date: 2026-05-06
commit: 141aeaf
---

# Quick Task 260506-q1: Add logout option to sidebar user chip

## What was done

Added a logout dropdown to the user chip in the sidebar footer.

**Changes:**
- `src/icons.jsx` — Added `chevUp` and `logout` icon paths
- `src/i18n.jsx` — Added `logout` key in both RO (`Deconectare`) and EN (`Log out`)
- `src/shell.jsx` — Wired `useAuth` + `authUser` into Shell; clicking the user chip toggles a popover with a red-tinted "Log out" button; outside-click dismisses it; chevron indicator shows open/closed state; display name and initials come from real `authUser` store state with graceful fallback

## Outcome

All 178 tests pass. Commit: `141aeaf`
