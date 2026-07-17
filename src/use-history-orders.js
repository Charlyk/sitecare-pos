// useHistoryOrders — TanStack Query v5 wrapper for admin.orders.list (HIST-02, HIST-03, HIST-04).
// Cache key: ['history-orders', from, to] — a root DISTINCT from ['orders']. `use-sse.js` writes
// live order data directly into ['orders'] via setQueryData, and `use-order-actions.js`
// invalidates that same root; sharing a root here would let live SSE writes corrupt History's
// admin-shaped AdminOrder[] cache (RESEARCH Pitfall 4, STATE.md). staleTime: 30s — History is a
// past-orders archive with no live feed, so a stable window with a modest staleTime is sufficient;
// no SSE wiring here by design.
// SDK responseStyle:'fields' — always unwrap result.data (RESEARCH.md Pitfall 1); never try/catch.
//
// The caller owns the range (HIST-04): this hook computes none of its own and imports no range
// helper. The same stability discipline that used to live in this file's lazy initializer now
// applies one level up — the caller must resolve { from, to } once per state transition (e.g. a
// pill click or an Apply click), never by calling a range builder inline in its render body,
// because a fresh clock reading every render would produce fresh key strings and refetch in a
// loop (RESEARCH Anti-Patterns). The `keepPreviousData` placeholder option (D-05) means the raw
// useQuery result is returned unwrapped, so callers can read `isPlaceholderData`/`isFetching`
// directly during a range switch (D-05/D-06).

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useAuth } from './auth.jsx';
import { normalizeOrder } from './data.jsx';

export function useHistoryOrders({ from, to }) {
  const { client } = useAuth();

  return useQuery({
    queryKey: ['history-orders', from, to],
    queryFn: async () => {
      const result = await client.admin.orders.list({ query: { from, to } });
      if (result.error) throw new Error(result.error.error ?? 'Failed to load history');
      return (result.data?.orders ?? []).map(normalizeOrder);
    },
    enabled: !!client && !!from && !!to,
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });
}
