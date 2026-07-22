import { useQuery } from '@tanstack/react-query';
import { useAuth } from './auth.jsx';

export function useBranches() {
  const { client } = useAuth();
  return useQuery({
    queryKey: ['branches'],
    queryFn: async () => {
      const result = await client.me.branches.list();
      if (result.error) throw new Error(result.error.error ?? 'Failed to load branches');
      return result.data; // AccessibleBranch[]
    },
    enabled: !!client,             // sole gate — NEVER add !!currentBranch/!!branchId (Pitfall 5/11)
    staleTime: 30_000,             // finite, matches use-stats.js precedent
    refetchOnWindowFocus: true,    // explicit per D-09 (TanStack default is already true)
  });
}
