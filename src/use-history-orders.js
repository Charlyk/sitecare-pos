// useHistoryOrders — TanStack Query v5 wrapper for admin.orders.list (HIST-02, HIST-03).
// Cache key: ['history-orders', from, to] — a root DISTINCT from ['orders']. `use-sse.js` writes
// live order data directly into ['orders'] via setQueryData, and `use-order-actions.js`
// invalidates that same root; sharing a root here would let live SSE writes corrupt History's
// admin-shaped AdminOrder[] cache (RESEARCH Pitfall 4, STATE.md). staleTime: 30s — History is a
// past-orders archive with no live feed, so a stable window with a modest staleTime is sufficient;
// no SSE wiring here by design.
// SDK responseStyle:'fields' — always unwrap result.data (RESEARCH.md Pitfall 1); never try/catch.

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from './auth.jsx';
import { normalizeOrder } from './data.jsx';
import { getLast30DaysRange } from './history-utils.js';

export function useHistoryOrders() {
  const { client } = useAuth();
  // Lazy initializer is load-bearing: calling getLast30DaysRange() inline in the component body
  // would produce a new `from` every render, changing the query key every render and defeating
  // caching into an infinite refetch loop (RESEARCH Anti-Patterns). No period switching exists yet
  // (HIST-04 is a later phase), so a stable per-mount value is correct; the setter is unused.
  const [{ from, to }] = useState(() => getLast30DaysRange());

  return useQuery({
    queryKey: ['history-orders', from, to],
    queryFn: async () => {
      const result = await client.admin.orders.list({ query: { from, to } });
      if (result.error) throw new Error(result.error.error ?? 'Failed to load history');
      return (result.data?.orders ?? []).map(normalizeOrder);
    },
    enabled: !!client,
    staleTime: 30_000,
  });
}
