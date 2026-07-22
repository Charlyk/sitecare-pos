// useSSE — persistent SSE connection via @microsoft/fetch-event-source (D-02)
// Mounted once in App (authenticated branch). Stays alive across screen switches (D-05).
// Exposes isConnected: boolean (D-06). Updates TanStack Query cache on order_new (D-03).
// Source: RESEARCH.md Pattern 2, sitecare-orders-api/src/routes/v1/sse/index.ts

import { useEffect, useRef, useState } from 'react';
import { fetchEventSource } from '@microsoft/fetch-event-source';
import { useQueryClient } from '@tanstack/react-query';
import { useAppStore } from './store.js';
import { normalizeOrder, SDK_STATE_MAP } from './data.jsx';

// Dev: Vite proxy intercepts /v1/* → https://api.restaurant.sitecare.ro
// Prod: direct URL — tauri.conf.json connect-src already whitelists this domain (Phase 1)
const SSE_URL = import.meta.env.DEV
  ? '/v1/sse/orders'
  : 'https://api.restaurant.sitecare.ro/v1/sse/orders';

export function useSSE(token, onLiveOrder) {
  const queryClient = useQueryClient();
  // D-01: branch-aware reconnect trigger — a dependency, never a ref (a ref would defeat the reconnect)
  const branchId = useAppStore((s) => s.currentBranch?.id) ?? null;
  const [isConnected, setIsConnected] = useState(false);
  const abortRef = useRef(null);
  const snapshotDone = useRef(false);
  const onLiveOrderRef = useRef(onLiveOrder);
  useEffect(() => { onLiveOrderRef.current = onLiveOrder; }, [onLiveOrder]);

  useEffect(() => {
    // Guard: do not attempt SSE without a token (D-07) — handles null during cold-start
    if (!token) {
      setIsConnected(false);
      return;
    }

    snapshotDone.current = false; // reset so each (re)connect gets a fresh 100ms window
    // D-05: ctrl.abort() fires neither onerror nor onclose in @microsoft/fetch-event-source,
    // so isConnected must be explicitly dropped here (no-op on first connect, visible flash on reconnect).
    setIsConnected(false);
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    const scopedBranchId = branchId; // D-03: captured once per connection, closed over by every handler — never a live read

    fetchEventSource(SSE_URL, {
      headers: { Authorization: `Bearer ${token}` }, // Bearer token in header only — NEVER in URL (T-3-01)
      signal: ctrl.signal,
      openWhenHidden: true, // UAT gap 1: keep SSE alive when app window is backgrounded

      async onopen(response) {
        if (response.ok) {
          setIsConnected(true); // D-06: connected = stream open and receiving
          setTimeout(() => { snapshotDone.current = true; }, 100); // absorb initial snapshot batch silently (D-06)
          return;
        }
        // Non-2xx: throw so fetchEventSource routes to onerror and retries
        throw new Error(`SSE: server returned ${response.status}`);
      },

      onmessage(msg) {
        // D-04: ping events are no-ops — keepalive only, ignore
        if (msg.event === 'ping') return;

        // D-03/D-04: order_new events → upsert into ['orders', scopedBranchId] cache (no network refetch)
        if (msg.event === 'order_new') {
          try {
            const order = normalizeOrder(JSON.parse(msg.data));
            queryClient.setQueryData(['orders', scopedBranchId], (old) => {
              const list = old?.orders ?? [];
              const idx = list.findIndex((o) => o.id === order.id);
              const next = idx >= 0
                ? list.map((o) => (o.id === order.id ? order : o)) // update existing
                : [order, ...list];                                  // prepend new
              return { orders: next };
            });
            queryClient.invalidateQueries({ queryKey: ['stats', scopedBranchId] });
            // D-06: only call onLiveOrder for live events, not initial snapshot
            if (snapshotDone.current && onLiveOrderRef.current) {
              onLiveOrderRef.current(order);
            }
          } catch {
            // Malformed JSON from server — ignore silently (V5 input validation)
          }
        }

        // order_status_changed: another client advanced an order — patch both list and detail caches (D-04)
        if (msg.event === 'order_status_changed') {
          try {
            const { orderId, fromStatus, toStatus } = JSON.parse(msg.data);
            const state = SDK_STATE_MAP[toStatus] ?? toStatus.toLowerCase();

            queryClient.setQueryData(['orders', scopedBranchId], (old) => {
              if (!old?.orders) return old;
              return {
                ...old,
                orders: old.orders.map((o) =>
                  o.id === orderId ? { ...o, status: toStatus, state } : o
                ),
              };
            });

            // Patch detail cache in-place so the detail screen doesn't flash a loading spinner
            queryClient.setQueryData(['order', scopedBranchId, orderId], (old) => {
              if (!old) return old;
              return { ...old, status: toStatus, state };
            });

            // Invalidate status-filtered list caches and dashboard totals; they'll refetch if observed
            queryClient.invalidateQueries({ queryKey: ['orders', scopedBranchId, fromStatus] });
            queryClient.invalidateQueries({ queryKey: ['orders', scopedBranchId, toStatus] });
            queryClient.invalidateQueries({ queryKey: ['stats', scopedBranchId] });
          } catch {
            // Malformed JSON — ignore silently
          }
        }
      },

      onerror() {
        // Library calls onerror on connection failure or dropped connection.
        // Returning undefined (default) lets the library retry with exponential backoff.
        // Do NOT throw here — that would abort retries entirely.
        setIsConnected(false); // D-06: disconnected = failed or dropped
      },

      onclose() {
        setIsConnected(false); // D-09: reconnect will flip back to true on next onopen
      },
    });

    // Cleanup: abort SSE on unmount (prevents memory leak — server unregisters client on abort)
    return () => ctrl.abort();
  }, [token, queryClient, branchId]); // onLiveOrder intentionally excluded — stored in ref to avoid reconnection on every render; branchId IS a dependency (D-01) — the sole reconnect trigger

  return { isConnected };
}
