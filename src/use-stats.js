import { useQuery } from '@tanstack/react-query';
import { useAuth } from './auth.jsx';

export function useStats() {
  const { client } = useAuth();
  return useQuery({
    queryKey: ['stats'],
    queryFn: async () => {
      const result = await client.admin.dashboard.getToday();
      if (result.error) throw new Error(result.error.error ?? 'Failed to load stats');
      return result.data;
    },
    enabled: !!client,
    staleTime: 30_000,
  });
}
