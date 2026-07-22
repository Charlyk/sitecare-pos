// useOrders — TanStack Query v5 wrapper for kitchen.orders.list (D-13)
// Cache key: ['orders', branchId] or ['orders', branchId, status] (Phase 14, D-01/D-07 —
// branchId is always the first variable segment so a currentBranch change re-scopes the
// cache purely via the key change; no manual cache-reset call is used). staleTime: 30s
// (SSE keeps cache fresh). enabled stays !!client only — never gated on branchId (D-08).
// SDK responseStyle:'fields' — always unwrap result.data (RESEARCH.md Pitfall 1).

import { useQuery } from '@tanstack/react-query';
import { useAuth } from './auth.jsx';
import { useAppStore } from './store.js';
import { normalizeOrder, unwrapSdkResult } from './data.jsx';

export function useOrders(status) {
  const { client } = useAuth();
  const branchId = useAppStore((s) => s.currentBranch?.id) ?? null;

  return useQuery({
    queryKey: status ? ['orders', branchId, status] : ['orders', branchId],
    queryFn: async () => {
      const result = await client.kitchen.orders.list({
        query: status ? { status } : {},
      });
      const { orders, ...rest } = unwrapSdkResult(result, 'Failed to list orders');
      return { ...rest, orders: orders.map(normalizeOrder) };
    },
    enabled: !!client,
    staleTime: 30_000, // 30s — SSE keeps cache fresh; polling is fallback only
  });
}
