// useMenu — TanStack Query v5 wrapper for kitchen.menu.list (D-14)
// Cache key: ['menu']. staleTime: 5 minutes — menus change infrequently.
// SDK responseStyle:'fields' — always unwrap result.data.

import { useQuery } from '@tanstack/react-query';
import { useAuth } from './auth.jsx';

export function useMenu() {
  const { client } = useAuth();

  return useQuery({
    queryKey: ['menu'],
    queryFn: async () => {
      const result = await client.kitchen.menu.list({});
      if (result.error) throw new Error(result.error.error ?? 'Failed to list menu');
      return result.data; // KitchenMenuResponse: { categories: [...], globalProducts: [...] }
    },
    enabled: !!client,
    staleTime: 5 * 60 * 1000, // D-14: 5 minutes
  });
}
