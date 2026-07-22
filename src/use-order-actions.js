// useOrderActions — TanStack Query v5 useMutation wrappers for order status mutations (D-15)
// On success: invalidateQueries(['orders', branchId]) — triggers fresh fetch from API to sync any
// server-side state changes (e.g., timestamps, computed fields) not in SSE payload.
// branchId is read ONCE at the hook-body top (never inside onSuccess — Pitfall 4) and closed
// over by both mutations' onSuccess callbacks, so invalidation only ever targets the currently
// active branch's cache entries (SC2).
// Use .isPending (v5), NOT .isLoading (v4 — removed).

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './auth.jsx';
import { useAppStore } from './store.js';

export function useOrderActions() {
  const { client } = useAuth();
  const queryClient = useQueryClient();
  const branchId = useAppStore((s) => s.currentBranch?.id) ?? null;

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
      queryClient.invalidateQueries({ queryKey: ['orders', branchId] });
      queryClient.invalidateQueries({ queryKey: ['order', branchId] });
      queryClient.invalidateQueries({ queryKey: ['stats', branchId] });
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
      queryClient.invalidateQueries({ queryKey: ['orders', branchId] });
      queryClient.invalidateQueries({ queryKey: ['order', branchId] });
      queryClient.invalidateQueries({ queryKey: ['stats', branchId] });
    },
  });

  return { updateStatus, updateEstimatedTime };
}
