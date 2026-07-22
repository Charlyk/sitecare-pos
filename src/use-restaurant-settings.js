import { useQuery } from '@tanstack/react-query';
import { useAuth } from './auth.jsx';
import { useAppStore } from './store.js';
import { unwrapSdkResult } from './data.jsx';

export function useRestaurantSettings() {
  const { client } = useAuth();
  const branchId = useAppStore((s) => s.currentBranch?.id) ?? null;

  return useQuery({
    queryKey: ['restaurant-settings', branchId],
    queryFn: async () => {
      const result = await client.admin.settings.list({});
      return unwrapSdkResult(result, 'Failed to fetch restaurant settings');
    },
    enabled: !!client,
    staleTime: 5 * 60 * 1000,
  });
}
