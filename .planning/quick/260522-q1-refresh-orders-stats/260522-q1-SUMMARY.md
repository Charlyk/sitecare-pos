---
quick_id: 260522-q1
status: complete
date: 2026-05-22
---

# Summary: Refresh Orders & Stats

## What was done

Wired the existing `Reîmprospătează` / `Refresh` button in `OrdersScreen` to trigger a real refetch.

**Changes:** `src/screen-orders.jsx`
- Added `import { useQueryClient } from '@tanstack/react-query'`
- Added `const queryClient = useQueryClient()` inside `OrdersScreen`
- Added `onClick` to the Refresh button: calls `invalidateQueries` for both `['orders']` and `['stats']`

## Result

Clicking Refresh marks both caches stale and triggers background refetches via TanStack Query. The button was previously rendered but had no handler.
