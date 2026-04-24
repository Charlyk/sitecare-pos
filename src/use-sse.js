// useSSE — persistent SSE connection via @microsoft/fetch-event-source (D-02)
// Mounted once in App (authenticated branch). Stays alive across screen switches (D-05).
// Exposes isConnected: boolean (D-06). Updates TanStack Query cache on order_new (D-03).
// Source: RESEARCH.md Pattern 2, sitecare-orders-api/src/routes/v1/sse/index.ts

import { useEffect, useRef, useState } from 'react';
import { fetchEventSource } from '@microsoft/fetch-event-source';
import { useQueryClient } from '@tanstack/react-query';
import { normalizeOrder } from './data.jsx';

// Dev: Vite proxy intercepts /v1/* → https://api.restaurant.sitecare.ro
// Prod: direct URL — tauri.conf.json connect-src already whitelists this domain (Phase 1)
const SSE_URL = import.meta.env.DEV
  ? '/v1/sse/orders'
  : 'https://api.restaurant.sitecare.ro/v1/sse/orders';

export function useSSE(token) {
  const queryClient = useQueryClient();
  const [isConnected, setIsConnected] = useState(false);
  const abortRef = useRef(null);

  useEffect(() => {
    // Guard: do not attempt SSE without a token (D-07) — handles null during cold-start
    if (!token) {
      setIsConnected(false);
      return;
    }

    const ctrl = new AbortController();
    abortRef.current = ctrl;

    fetchEventSource(SSE_URL, {
      headers: { Authorization: `Bearer ${token}` }, // Bearer token in header only — NEVER in URL (T-3-01)
      signal: ctrl.signal,

      async onopen(response) {
        if (response.ok) {
          setIsConnected(true); // D-06: connected = stream open and receiving
          return;
        }
        // Non-2xx: throw so fetchEventSource routes to onerror and retries
        throw new Error(`SSE: server returned ${response.status}`);
      },

      onmessage(msg) {
        // D-04: ping events are no-ops — keepalive only, ignore
        if (msg.event === 'ping') return;

        // D-03: order_new events → upsert into ['orders'] cache (no network refetch)
        if (msg.event === 'order_new') {
          try {
            const order = normalizeOrder(JSON.parse(msg.data));
            queryClient.setQueryData(['orders'], (old) => {
              const list = old?.orders ?? [];
              const idx = list.findIndex((o) => o.id === order.id);
              const next = idx >= 0
                ? list.map((o) => (o.id === order.id ? order : o)) // update existing
                : [...list, order];                                  // append new
              return { orders: next };
            });
          } catch {
            // Malformed JSON from server — ignore silently (V5 input validation)
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
  }, [token, queryClient]); // Re-run if token changes (e.g., rotation in doRefresh)

  return { isConnected };
}
