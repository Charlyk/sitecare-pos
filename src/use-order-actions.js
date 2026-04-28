// useOrderActions — TanStack Query v5 useMutation wrappers for order status mutations (D-15)
// On success: invalidateQueries(['orders']) — triggers fresh fetch from API to sync any
// server-side state changes (e.g., timestamps, computed fields) not in SSE payload.
// Use .isPending (v5), NOT .isLoading (v4 — removed).

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './auth.jsx';

export function useOrderActions() {
  const { client } = useAuth();
  const queryClient = useQueryClient();

  // updateStatus: accepts, advances, or cancels an order
  const updateStatus = useMutation({
    mutationFn: ({ id, currentStatus, toStatus, estimatedMinutes, reason }) =>
      client.kitchen.orders.updateStatus({
        path: { id },
        body: {
          currentStatus,
          toStatus,
          ...(estimatedMinutes != null ? { estimatedMinutes } : {}),
          ...(reason != null ? { reason } : {}),
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['order'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
    },
  });

  // updateEstimatedTime: updates the promised prep time for an accepted order
  const updateEstimatedTime = useMutation({
    mutationFn: ({ id, estimatedMinutes }) =>
      client.kitchen.orders.updateEstimatedTime({
        path: { id },
        body: { estimatedMinutes },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['order'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
    },
  });

  return { updateStatus, updateEstimatedTime };
}
