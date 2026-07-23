import { useMutation, useQuery } from '@tanstack/react-query';
import { useAuth } from './auth.jsx';
import { useAppStore } from './store.js';

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

// useBranchSwitch — non-optimistic branch-switch mutation (D-05, SWCH-03).
// Mirrors use-order-actions.js's mutation shape: bare useMutation, no onMutate.
// setCurrentBranch is called ONLY here, inside onSuccess — never adjacent to .mutate(), never
// optimistically. Because Phase 14's cache keys and Phase 15's useSSE both react to
// currentBranch?.id, this single write re-scopes every cache and reconnects the stream
// automatically, post-resolution (Pitfall 4/5 race avoided by construction).
export function useBranchSwitch() {
  const { client } = useAuth();
  const setCurrentBranch = useAppStore((s) => s.setCurrentBranch);

  return useMutation({
    mutationFn: async (branch) => {
      const result = await client.me.branches.switch({ body: { branchId: branch.id } });
      if (result.error) {
        const raw = result.error;
        const message = (typeof raw === 'string' ? raw : raw?.error) ?? 'Failed to switch branch';
        const err = new Error(message);
        err.code = message; // matches data.jsx's unwrapSdkResult convention — Phase 17 will consume this
        throw err;
      }
      return result.data; // SwitchBranchResponse: { ok: true, branchId }
    },
    onSuccess: (_response, branch) => {
      setCurrentBranch(branch); // D-05: non-optimistic, only here. `branch` carries the full
                                 // AccessibleBranch (name/isDefault) — richer than the response's
                                 // bare branchId, needed for the popover checkmark/toast copy.
    },
  });
}
