import { useQuery } from '@tanstack/react-query';
import { useAuth } from './auth.jsx';

export function useRestaurantSettings() {
  const { client } = useAuth();
  return useQuery({
    queryKey: ['restaurant-settings'],
    queryFn: async () => {
      const result = await client.admin.settings.list({});
      if (result.error) throw new Error(result.error.error ?? 'Failed to fetch restaurant settings');
      return result.data;
    },
    enabled: !!client,
    staleTime: 5 * 60 * 1000,
  });
}
