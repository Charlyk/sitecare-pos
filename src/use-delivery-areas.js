import { useQuery } from '@tanstack/react-query';
import { useAuth } from './auth.jsx';
import { useAppStore } from './store.js';
import { unwrapSdkResult } from './data.jsx';

export function useDeliveryAreas() {
  const { client } = useAuth();
  const branchId = useAppStore((s) => s.currentBranch?.id) ?? null;

  return useQuery({
    queryKey: ['delivery-areas', branchId],
    queryFn: async () => {
      const result = await client.kitchen.deliveryAreas.list({});
      const data = unwrapSdkResult(result, 'Failed to fetch delivery areas');
      return (data?.deliveryAreas ?? []).map((a) => ({
        id: String(a.id ?? ''),
        name: String(a.name ?? ''),
        fee: (a.fee ?? 0) / 100, // API returns cents
      }));
    },
    enabled: !!client,
    staleTime: 5 * 60 * 1000,
  });
}
