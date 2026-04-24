---
slug: show-item-options-order-card
date: 2026-04-24
status: complete
---

# Summary: Show Selected Product Options on Order Card

## What was done
Edited `src/screen-orders.jsx` — in the `OrderCard` items preview, each menu item row now renders its `mods` array as a small (11px, muted) subtitle below the item name when mods are present.

## How it works
- `normalizeOrder()` in `data.jsx` already maps `selectedOptions` → `it.mods` for SDK orders
- Mock data items already carry `mods` arrays (e.g. `['fără bacon']`, `['extra ardei iute']`)
- The render is optional (`it.mods?.length > 0`) — items without mods are unaffected
- Price column gets `whiteSpace: nowrap` + `alignItems: flex-start` so multi-line items stay aligned
