// useHistoryOrders — TanStack Query v5 wrapper for admin.orders.list (HIST-02, HIST-03, HIST-04).
// Cache key: ['history-orders', branchId, from, to] (Phase 14, D-01/D-07) — a root DISTINCT from
// ['orders']. `use-sse.js` writes
// live order data directly into ['orders'] via setQueryData, and `use-order-actions.js`
// invalidates that same root; sharing a root here would let live SSE writes corrupt History's
// admin-shaped AdminOrder[] cache (RESEARCH Pitfall 4, STATE.md). staleTime: 30s — History is a
// past-orders archive with no live feed, so a stable window with a modest staleTime is sufficient;
// no SSE wiring here by design.
// SDK responseStyle:'fields' — always unwrap result.data (RESEARCH.md Pitfall 1); never try/catch.
//
// The caller owns the range (HIST-04): this hook computes none of its own and imports no range
// helper. The same stability discipline that used to live in this file's lazy initializer now
// applies one level up — the caller must resolve { from, to } once per state transition (e.g. a
// pill click or an Apply click), never by calling a range builder inline in its render body,
// because a fresh clock reading every render would produce fresh key strings and refetch in a
// loop (RESEARCH Anti-Patterns). The `keepPreviousData` placeholder option (D-05) means the raw
// useQuery result is returned unwrapped, so callers can read `isPlaceholderData`/`isFetching`
// directly during a range switch (D-05/D-06).
//
// TEMP DIAGNOSTIC (windows-history-network-error, .planning/debug/): the thrown Error is enriched
// with a non-breaking `.diagnostic` property so screen-history.jsx's ErrorBlock can surface the
// real failure on machines where DevTools is unavailable (a live production Windows box). Per the
// SDK's own request() implementation (dist/index.mjs:655-777, throwOnError never set so always
// falsy here — confirmed via grep, .npmrc/auth.jsx do not set it): a genuine network-level failure
// (fetch() itself rejects — DNS, connection reset, CORS, a WebView2 net::ERR_* abort) resolves
// `result.response` to `undefined`; a real HTTP response (2xx/4xx/5xx) always sets
// `result.response` to the actual fetch Response with `.status`. That presence/absence is the
// discriminator between "never reached the server" and "reached the server, got an error status" —
// information the previous `throw new Error(result.error.error ?? 'Failed to load history')` threw
// away entirely. The second optional arg (`enabled`) lets screen-history.jsx run this SAME hook a
// second time, on-error, as a small-range diagnostic probe — see screen-history.jsx.
// Remove this diagnostic (revert to the plain two-line queryFn) once the session resolves.

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useAuth } from './auth.jsx';
import { useAppStore } from './store.js';
import { normalizeOrder } from './data.jsx';

export function useHistoryOrders({ from, to }, { enabled: extraEnabled = true } = {}) {
  const { client } = useAuth();
  const branchId = useAppStore((s) => s.currentBranch?.id) ?? null;

  return useQuery({
    queryKey: ['history-orders', branchId, from, to],
    queryFn: async () => {
      const startedAt = Date.now();
      const result = await client.admin.orders.list({ query: { from, to } });
      const ms = Date.now() - startedAt;
      if (result.error) {
        const status = result.response?.status;
        const message =
          (typeof result.error === 'string' ? result.error : result.error?.error) ??
          result.error?.message ??
          (status ? `HTTP ${status}` : 'Failed to load history');
        const err = new Error(message);
        err.diagnostic = {
          // 'http' = request reached the server and got a real (non-2xx) response.
          // 'network' = fetch() itself rejected before any response was received.
          kind: result.response ? 'http' : 'network',
          status,
          statusText: result.response?.statusText,
          errorName: result.error?.name,
          ms,
        };
        throw err;
      }
      return (result.data?.orders ?? []).map(normalizeOrder);
    },
    enabled: !!client && !!from && !!to && extraEnabled,
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });
}
