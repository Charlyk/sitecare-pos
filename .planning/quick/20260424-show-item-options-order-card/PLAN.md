---
slug: show-item-options-order-card
date: 2026-04-24
status: in-progress
---

# Show Selected Product Options on Order Card

## Goal
Display the selected product options (modifiers) for each item in the OrderCard items preview on the Comenzi live screen.

## Context
- `normalizeOrder()` in `data.jsx` already maps `selectedOptions` → `it.mods` (array of option name strings)
- Mock data items already have `mods` populated (e.g. `['fără bacon']`, `['extra ardei iute']`)
- The OrderCard items preview renders each item name but does not show mods

## Change
**File:** `src/screen-orders.jsx`
**Location:** `shownMenuItems.map(...)` inside the items preview IIFE (~line 99)

Wrap the item row content so mods render as a small subtitle below the item name when present.

## Tasks
1. Edit `screen-orders.jsx` — render `it.mods` below item name in item rows
2. Commit atomically
3. Update STATE.md Quick Tasks Completed table
