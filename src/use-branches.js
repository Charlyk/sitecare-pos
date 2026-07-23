import { useMutation, useQuery } from '@tanstack/react-query';
import { useAuth } from './auth.jsx';
import { useAppStore } from './store.js';
import { useT } from './i18n.jsx';

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
        err.branchName = branch.name; // 17-01: attempted branch identity for handleBranchError's <branch> interpolation
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

// BRANCH_CODES — the one allowlist of recognized branch-access error codes (T-17-02, D-05's
// "one central path"). Shared by handleBranchError (below), app.jsx's fireSwitch onError trim,
// and use-sse.js's onopen 403 extension (both land in later plans of this phase) so all three
// branch off the same literal set rather than re-declaring it.
export const BRANCH_CODES = ['BRANCH_INACTIVE', 'BRANCH_ACCESS_REVOKED', 'NO_BRANCH_ACCESS'];

// handleBranchError(err, queryClient) — the ONE central branch-access-403 recovery path (BERR-01,
// D-05). A plain module-scope function, NOT a hook: it is invoked from main.jsx's QueryCache/
// MutationCache onError (module scope, not a React render context) and, in a later plan, from
// use-sse.js's onopen callback. It therefore reads/writes the store via useAppStore.getState()
// exclusively, mirroring auth.jsx's handleFocus/expireSession non-hook getState() convention —
// never useAppStore((s) => ...).
//
// Guard-first: any err.code not in BRANCH_CODES is an immediate no-op (T-17-02) — this is the
// single choke point every branch-scoped query/mutation error passes through, so a wrongly-typed
// or unrelated error (a 500, a validation string) must never toast/reopen/invalidate.
//
// RECOVERABLE_CODE_COPY (17-03) — the two BRANCH_INACTIVE/BRANCH_ACCESS_REVOKED codes share
// identical recovery behavior (toast + setBranchSwitcherForceOpen(true) + invalidate ['branches'])
// but render distinct per-code copy (D-03). Factoring the i18n key pair through this map means the
// shared recovery behavior below is written once, not once per code.
const RECOVERABLE_CODE_COPY = {
  BRANCH_ACCESS_REVOKED: { titleKey: 'branch_err_revoked_title', detailKey: 'branch_err_revoked_detail' },
  BRANCH_INACTIVE: { titleKey: 'branch_err_inactive_title', detailKey: 'branch_err_inactive_detail' },
};

// All three codes are wired: BRANCH_ACCESS_REVOKED and BRANCH_INACTIVE share the same recovery
// (toast + reopen + refetch) with distinct copy; NO_BRANCH_ACCESS instead sets the session-only
// noBranchAccess flag and fires no toast/reopen (BERR-01, D-03).
export function handleBranchError(err, queryClient) {
  const code = err?.code;
  if (!BRANCH_CODES.includes(code)) return;

  const { pushToast, setBranchSwitcherForceOpen, setNoBranchAccess, currentBranch, lang } = useAppStore.getState();
  const t = useT(lang);

  if (code === 'NO_BRANCH_ACCESS') {
    setNoBranchAccess(true);
    return;
  }

  // BRANCH_ACCESS_REVOKED / BRANCH_INACTIVE — shared recoverable-code path.
  const { titleKey, detailKey } = RECOVERABLE_CODE_COPY[code];
  // <branch> resolution order (never a literal '<branch>' or empty gap, UI-SPEC E2-toast
  // backstop): the attempted branch identity attached by useBranchSwitch's mutationFn first,
  // then the currently-known branch, then a graceful generic fallback string.
  const branchName = err.branchName ?? currentBranch?.name ?? t('branch_generic_fallback');
  pushToast({
    id: Date.now(),
    kind: 'error',
    title: t(titleKey),
    detail: t(detailKey).replace('<branch>', branchName),
  });
  setBranchSwitcherForceOpen(true);
  queryClient.invalidateQueries({ queryKey: ['branches'] });
}
