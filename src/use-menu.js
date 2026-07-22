// useMenu — TanStack Query v5 wrapper for kitchen.menu.list (D-14)
// Cache key: ['menu', branchId] (Phase 14, D-01/D-07 — branchId is always the first variable
// segment so a currentBranch change re-scopes the cache purely via the key change).
// staleTime: 5 minutes — menus change infrequently.
// SDK responseStyle:'fields' — always unwrap result.data.

import { useQuery } from '@tanstack/react-query';
import { useAuth } from './auth.jsx';
import { useAppStore } from './store.js';
import { unwrapSdkResult } from './data.jsx';

export function useMenu() {
  const { client } = useAuth();
  const branchId = useAppStore((s) => s.currentBranch?.id) ?? null;

  return useQuery({
    queryKey: ['menu', branchId],
    queryFn: async () => {
      const result = await client.kitchen.menu.list({});
      return unwrapSdkResult(result, 'Failed to list menu'); // KitchenMenuResponse: { categories: [...], globalProducts: [...] }
    },
    enabled: !!client,
    staleTime: 5 * 60 * 1000, // D-14: 5 minutes
  });
}
