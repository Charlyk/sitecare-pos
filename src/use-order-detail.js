import { useQuery } from '@tanstack/react-query';
import { useAuth } from './auth.jsx';
import { useAppStore } from './store.js';
import { normalizeOrder, unwrapSdkResult } from './data.jsx';

export function useOrderDetail(id) {
  const { client } = useAuth();
  const branchId = useAppStore((s) => s.currentBranch?.id) ?? null;
  return useQuery({
    queryKey: ['order', branchId, id],
    queryFn: async () => {
      const result = await client.kitchen.orders.get({ path: { id } });
      return normalizeOrder(unwrapSdkResult(result, 'Failed to get order').order);
    },
    enabled: !!client && !!id,
    staleTime: 0,
  });
}
