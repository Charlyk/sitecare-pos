import { useQuery } from '@tanstack/react-query';
import { useAuth } from './auth.jsx';

export function useDeliveryAreas() {
  const { client } = useAuth();
  return useQuery({
    queryKey: ['delivery-areas'],
    queryFn: async () => {
      const result = await client.kitchen.deliveryAreas.list({});
      if (result.error) throw new Error(result.error.error ?? 'Failed to fetch delivery areas');
      return (result.data?.deliveryAreas ?? []).map((a) => ({
        id: String(a.id ?? ''),
        name: String(a.name ?? ''),
        fee: (a.fee ?? 0) / 100, // API returns cents
      }));
    },
    enabled: !!client,
    staleTime: 5 * 60 * 1000,
  });
}
