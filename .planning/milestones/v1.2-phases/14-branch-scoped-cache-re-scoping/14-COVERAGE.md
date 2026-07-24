# Phase 14 — API Integration Coverage

**Reasoned no-integration declaration (api-integration checkpoint opt-out):**

No external API integration: internal TanStack Query cache re-keying + error-envelope threading around SDK calls already integrated in v1.0/v1.1; no new SDK capability surface is added.

## Rationale

This phase re-keys already-integrated `@charlyk/admin-client` calls (all 7 fetch hooks + 6 invalidation sites) around `currentBranch?.id`, and introduces one internal helper (`unwrapSdkResult`) that unwraps the SDK's existing `{ data, error }` envelope. Every SDK method touched here — `kitchen.orders.list`/`.get`/`.updateStatus`/`.updateEstimatedTime`/`.create`, `kitchen.menu.list`, `kitchen.products.updateStock`, `kitchen.deliveryAreas.list`, `admin.dashboard.getToday`, `admin.orders.list`, `admin.settings.list` — was already wired and shipped in v1.0/v1.1. No new endpoint, no new SDK capability, no new external network surface is introduced.

A capability matrix is deliberately NOT fabricated per the checkpoint's own opt-out contract.
