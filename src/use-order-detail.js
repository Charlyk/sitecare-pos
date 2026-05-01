import { useQuery } from '@tanstack/react-query';
import { useAuth } from './auth.jsx';
import { normalizeOrder } from './data.jsx';

export function useOrderDetail(id) {
  const { client } = useAuth();
  return useQuery({
    queryKey: ['order', id],
    queryFn: async () => {
      const result = await client.kitchen.orders.get({ path: { id } });
      if (result.error) throw new Error(result.error.error ?? 'Failed to get order');
      return normalizeOrder(result.data.order);
    },
    enabled: !!client && !!id,
    staleTime: 0,
  });
}
