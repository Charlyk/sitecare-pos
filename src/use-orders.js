// useOrders — TanStack Query v5 wrapper for kitchen.orders.list (D-13)
// Cache key: ['orders'] or ['orders', status]. staleTime: 30s (SSE keeps cache fresh).
// SDK responseStyle:'fields' — always unwrap result.data (RESEARCH.md Pitfall 1).

import { useQuery } from '@tanstack/react-query';
import { useAuth } from './auth.jsx';
import { normalizeOrder } from './data.jsx';

export function useOrders(status) {
  const { client } = useAuth();

  return useQuery({
    queryKey: status ? ['orders', status] : ['orders'],
    queryFn: async () => {
      const result = await client.kitchen.orders.list({
        query: status ? { status } : {},
      });
      if (result.error) throw new Error(result.error.error ?? 'Failed to list orders');
      const { orders, ...rest } = result.data;
      return { ...rest, orders: orders.map(normalizeOrder) };
    },
    enabled: !!client,
    staleTime: 30_000, // 30s — SSE keeps cache fresh; polling is fallback only
  });
}
