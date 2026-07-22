import { useQuery } from '@tanstack/react-query';
import { useAuth } from './auth.jsx';
import { useAppStore } from './store.js';
import { unwrapSdkResult } from './data.jsx';

export function useStats() {
  const { client } = useAuth();
  const branchId = useAppStore((s) => s.currentBranch?.id) ?? null;
  return useQuery({
    queryKey: ['stats', branchId],
    queryFn: async () => {
      const result = await client.admin.dashboard.getToday();
      return unwrapSdkResult(result, 'Failed to load stats');
    },
    enabled: !!client,
    staleTime: 30_000,
  });
}
