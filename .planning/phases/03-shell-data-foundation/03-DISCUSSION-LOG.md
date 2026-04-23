# Phase 3: Shell + Data Foundation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-23
**Phase:** 03-shell-data-foundation
**Areas discussed:** SSE implementation, Offline detection, Offline banner UX

---

## SSE Implementation

| Option | Description | Selected |
|--------|-------------|----------|
| Yes — known URL | There's an SSE endpoint; user will provide it | ✓ |
| Unknown — needs research | Unsure if streaming endpoint exists | |
| No — use polling | No SSE endpoint; use refetchInterval | |

**User's choice:** Known URL — user pointed to `/Users/eduardalbu/Developer/sitecare-orders-api/src/routes/v1/sse/index.ts`
**Notes:** SSE endpoint is `GET /v1/sse/orders`. Server emits a snapshot of all ACTIVE orders as `order_new` events on connect, then live events afterward. Ping keepalive every 30 seconds. Auth via session middleware.

---

### SSE auth method

| Option | Description | Selected |
|--------|-------------|----------|
| Bearer token — same as SDK | Authorization: Bearer header via @microsoft/fetch-event-source | ✓ |
| Session cookie — auto-sent by browser | Native EventSource or plain fetch, no extra header | |

**User's choice:** Bearer token
**Notes:** Native EventSource cannot send Authorization header. `@microsoft/fetch-event-source` is the correct library (already identified in CLAUDE.md critical rules).

---

## Offline Detection

| Option | Description | Selected |
|--------|-------------|----------|
| SSE disconnect = offline | useSSE isConnected as single source of truth | ✓ |
| navigator.onLine + SSE disconnect | Both signals required | |
| Periodic health ping | HEAD request every 10s | |

**User's choice:** SSE disconnect = offline
**Notes:** SSE failing IS the connectivity failure for this app. No extra pinging needed for an internal restaurant tool.

---

## Offline Banner UX

### Banner placement

| Option | Description | Selected |
|--------|-------------|----------|
| Top of main content area | Above active screen, inside Shell, below topbar, to the right of sidebar | ✓ |
| Full-width below topbar | Spans entire window width below topbar | |

**User's choice:** Top of main content area
**Notes:** Consistent with existing layout — sidebar stays unaffected. Persists across screen switches because Shell persists.

### Mutation blocking

| Option | Description | Selected |
|--------|-------------|----------|
| isOffline prop from Shell | Shell passes prop; each screen disables its own buttons | ✓ |
| useSSE hook in each screen | Each screen reads isConnected directly | |

**User's choice:** isOffline prop from Shell
**Notes:** Cleaner separation — screens don't need to know about the SSE mechanism, only that actions are blocked.

---

## Claude's Discretion

- Token extraction strategy for the SSE Bearer header
- SSE reconnect backoff configuration (library defaults)
- TanStack Query cache key shape
- Whether `useSSE` mounts in `app.jsx` or inside `shell.jsx`

## Deferred Ideas

None — discussion stayed within Phase 3 scope.
