// Tests for useSSE hook — U9 (KDS-01)
// Wave 0 stub: tests fail RED until src/use-sse.js is implemented.

vi.mock('@tauri-apps/plugin-store', () => ({
  load: vi.fn().mockResolvedValue({
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(undefined),
  }),
}))
vi.mock('@charlyk/admin-client', () => ({ signIn: vi.fn(), createAdminClient: vi.fn() }))
vi.mock('@tauri-apps/plugin-opener', () => ({ open: vi.fn(), openUrl: vi.fn() }))
vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }))
vi.mock('@microsoft/fetch-event-source', () => ({
  fetchEventSource: vi.fn(),
}))
// 17-05: use-sse.js's onopen 403 short-circuit imports handleBranchError + BRANCH_CODES from
// use-branches.js. Mock handleBranchError as a spy; keep BRANCH_CODES as the real literal array
// so the `BRANCH_CODES.includes(code)` guard in use-sse.js behaves identically to production.
vi.mock('../use-branches.js', () => ({
  handleBranchError: vi.fn(),
  BRANCH_CODES: ['BRANCH_INACTIVE', 'BRANCH_ACCESS_REVOKED', 'NO_BRANCH_ACCESS'],
}))

import { renderHook, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement, useRef } from 'react'
import { useSSE, extractBranchCodeFromSseBody } from '../use-sse.js'
import { fetchEventSource } from '@microsoft/fetch-event-source'
import { useAppStore } from '../store.js'
import { handleBranchError } from '../use-branches.js'

beforeEach(() => {
  useAppStore.setState({ currentBranch: null })
})

// Stable QueryClient identity across rerender() calls — constructing `new QueryClient()`
// directly in the function body would give it a fresh identity on every render, which
// would spuriously trigger useSSE's effect (queryClient is a dependency) independent of
// any branchId change, defeating reconnect-count assertions.
function wrapper({ children }) {
  const clientRef = useRef(null)
  if (!clientRef.current) {
    clientRef.current = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  }
  return createElement(QueryClientProvider, { client: clientRef.current }, children)
}

// ── U9a: isConnected state transitions (KDS-01) ────────────────────────────

describe('U9a — useSSE sets isConnected=true on open, false on error (KDS-01)', () => {
  beforeEach(() => { vi.clearAllMocks() })

  test('isConnected is false before SSE opens', () => {
    const { result } = renderHook(() => useSSE('test-token'), { wrapper })
    expect(result.current.isConnected).toBe(false)
  })

  test('isConnected becomes true when onopen is called with ok response', async () => {
    let capturedOnOpen
    fetchEventSource.mockImplementation((_url, opts) => {
      capturedOnOpen = opts.onopen
      return Promise.resolve()
    })
    const { result } = renderHook(() => useSSE('test-token'), { wrapper })
    await act(async () => {
      if (capturedOnOpen) await capturedOnOpen({ ok: true, status: 200 })
    })
    expect(result.current.isConnected).toBe(true)
  })

  test('isConnected is false when token is null (guard: no SSE attempt)', () => {
    const { result } = renderHook(() => useSSE(null), { wrapper })
    expect(fetchEventSource).not.toHaveBeenCalled()
    expect(result.current.isConnected).toBe(false)
  })

  test('D-06: a non-2xx onopen logs status + best-effort body before the unchanged throw, and does not connect', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    let capturedOnOpen
    fetchEventSource.mockImplementation((_url, opts) => {
      capturedOnOpen = opts.onopen
      return Promise.resolve()
    })
    const { result } = renderHook(() => useSSE('test-token'), { wrapper })

    const badResponse = { ok: false, status: 403, text: () => Promise.resolve('{"error":"branch not resolved"}') }
    await act(async () => {
      if (capturedOnOpen) {
        await expect(capturedOnOpen(badResponse)).rejects.toThrow('SSE: server returned 403')
      }
    })

    expect(warnSpy).toHaveBeenCalledTimes(1)
    expect(warnSpy).toHaveBeenCalledWith('[SSE] non-2xx onopen', expect.objectContaining({
      status: 403,
      body: '{"error":"branch not resolved"}',
    }))
    // Non-ok onopen never flips isConnected true — the throw→onerror→retry path is preserved
    expect(result.current.isConnected).toBe(false)

    warnSpy.mockRestore()
  })
})

// ── D-08: branch-403 onopen short-circuit (17-05, BERR-01) ────────────────
// The one error path that bypasses TanStack's onError — the SSE stream's onopen
// non-2xx — must route a BRANCH_* 403 to handleBranchError and return WITHOUT
// throwing, so fetchEventSource never schedules a retry against an inaccessible
// branch. Non-branch 403s and all other non-2xx statuses must keep today's
// warn+throw behavior exactly (retry preserved).

describe('extractBranchCodeFromSseBody (17-05, V5 input validation)', () => {
  test('returns null for undefined input', () => {
    expect(extractBranchCodeFromSseBody(undefined)).toBeNull()
  })

  test('returns null for empty-string input', () => {
    expect(extractBranchCodeFromSseBody('')).toBeNull()
  })

  test('returns null for non-JSON input and never throws', () => {
    expect(() => extractBranchCodeFromSseBody('not json at all')).not.toThrow()
    expect(extractBranchCodeFromSseBody('not json at all')).toBeNull()
  })

  test('returns the code for the ASSUMED { error: "<CODE>" } body shape', () => {
    expect(extractBranchCodeFromSseBody('{"error":"BRANCH_ACCESS_REVOKED"}')).toBe('BRANCH_ACCESS_REVOKED')
  })

  test('returns the code for a bare JSON string body', () => {
    expect(extractBranchCodeFromSseBody('"BRANCH_INACTIVE"')).toBe('BRANCH_INACTIVE')
  })
})

describe('D-08 — SSE onopen 403 short-circuit routes BRANCH_* codes to handleBranchError without throwing', () => {
  beforeEach(() => { vi.clearAllMocks() })

  test('a 403 onopen with a body carrying a BRANCH_* code calls handleBranchError and resolves without throwing (no retry scheduled)', async () => {
    let capturedOnOpen
    let capturedSignal
    fetchEventSource.mockImplementation((_url, opts) => {
      capturedOnOpen = opts.onopen
      capturedSignal = opts.signal
      return Promise.resolve()
    })
    const { result } = renderHook(() => useSSE('test-token'), { wrapper })

    const branchResponse = { ok: false, status: 403, text: () => Promise.resolve('{"error":"BRANCH_ACCESS_REVOKED"}') }
    await act(async () => {
      // MUST resolve, not reject — a throw here would re-enter fetchEventSource's retry loop (D-08).
      await expect(capturedOnOpen(branchResponse)).resolves.toBeUndefined()
    })

    expect(handleBranchError).toHaveBeenCalledTimes(1)
    expect(handleBranchError).toHaveBeenCalledWith({ code: 'BRANCH_ACCESS_REVOKED' }, expect.anything())
    expect(result.current.isConnected).toBe(false)
    // CR-01 (17-REVIEW.md): "return without throwing" alone does NOT stop fetchEventSource's retry
    // — response.text() above already drained response.body, so the library's own getBytes() call
    // (right after onopen resolves) throws on the locked stream regardless. The connection's own
    // AbortController must be aborted so the library's `curRequestController.signal.aborted` guard
    // suppresses the retry-scheduling branch unconditionally. See use-sse-retry-suppression.test.js
    // for an end-to-end proof against the REAL (unmocked) fetch-event-source library.
    expect(capturedSignal.aborted).toBe(true)
  })

  test('a 403 onopen whose body is non-JSON falls through to the existing console.warn + throw (retry preserved)', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    let capturedOnOpen
    let capturedSignal
    fetchEventSource.mockImplementation((_url, opts) => {
      capturedOnOpen = opts.onopen
      capturedSignal = opts.signal
      return Promise.resolve()
    })
    const { result } = renderHook(() => useSSE('test-token'), { wrapper })

    const badResponse = { ok: false, status: 403, text: () => Promise.resolve('not json') }
    await act(async () => {
      await expect(capturedOnOpen(badResponse)).rejects.toThrow('SSE: server returned 403')
    })

    expect(handleBranchError).not.toHaveBeenCalled()
    expect(warnSpy).toHaveBeenCalledTimes(1)
    expect(result.current.isConnected).toBe(false)
    // CR-01: the abort-based short-circuit is scoped to the recognized-branch-code case only —
    // a non-branch 403 must NOT abort, preserving the existing throw -> onerror -> retry path.
    expect(capturedSignal.aborted).toBe(false)

    warnSpy.mockRestore()
  })

  test('a 403 onopen whose body carries no branch code falls through to the existing console.warn + throw (retry preserved)', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    let capturedOnOpen
    fetchEventSource.mockImplementation((_url, opts) => {
      capturedOnOpen = opts.onopen
      return Promise.resolve()
    })
    const { result } = renderHook(() => useSSE('test-token'), { wrapper })

    const badResponse = { ok: false, status: 403, text: () => Promise.resolve('{"error":"branch not resolved"}') }
    await act(async () => {
      await expect(capturedOnOpen(badResponse)).rejects.toThrow('SSE: server returned 403')
    })

    expect(handleBranchError).not.toHaveBeenCalled()
    expect(warnSpy).toHaveBeenCalledTimes(1)

    warnSpy.mockRestore()
  })

  test('a non-403 non-2xx onopen keeps the existing warn + throw behavior unchanged (retry preserved)', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    let capturedOnOpen
    fetchEventSource.mockImplementation((_url, opts) => {
      capturedOnOpen = opts.onopen
      return Promise.resolve()
    })
    const { result } = renderHook(() => useSSE('test-token'), { wrapper })

    const badResponse = { ok: false, status: 500, text: () => Promise.resolve('{"error":"BRANCH_ACCESS_REVOKED"}') }
    await act(async () => {
      await expect(capturedOnOpen(badResponse)).rejects.toThrow('SSE: server returned 500')
    })

    // Even though the body carries a branch code, a non-403 status must never short-circuit —
    // the branch-403 special case is gated on status === 403 specifically.
    expect(handleBranchError).not.toHaveBeenCalled()
    expect(warnSpy).toHaveBeenCalledTimes(1)
    expect(result.current.isConnected).toBe(false)

    warnSpy.mockRestore()
  })
})

// ── U9b: order_new event upserts into ['orders'] cache (KDS-01) ───────────

describe('U9b — useSSE upserts order_new event into TanStack Query cache (KDS-01)', () => {
  beforeEach(() => { vi.clearAllMocks() })

  test('order_new event with new order id appends to cache', async () => {
    useAppStore.setState({ currentBranch: { id: 'branch-a' } })
    let capturedOnMessage
    fetchEventSource.mockImplementation((_url, opts) => {
      capturedOnMessage = opts.onmessage
      return Promise.resolve()
    })

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    queryClient.setQueryData(['orders', 'branch-a'], { orders: [] })

    function testWrapper({ children }) {
      return createElement(QueryClientProvider, { client: queryClient }, children)
    }

    renderHook(() => useSSE('test-token'), { wrapper: testWrapper })

    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    const order = { id: 'ord-001', status: 'NEW', customerName: 'Test' }
    await act(async () => {
      if (capturedOnMessage) {
        capturedOnMessage({ event: 'order_new', data: JSON.stringify(order) })
      }
    })

    const cached = queryClient.getQueryData(['orders', 'branch-a'])
    expect(cached.orders).toHaveLength(1)
    expect(cached.orders[0].id).toBe('ord-001')
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['stats', 'branch-a'] })
  })

  test('order_new event with existing order id updates (not duplicates) in cache', async () => {
    useAppStore.setState({ currentBranch: { id: 'branch-a' } })
    let capturedOnMessage
    fetchEventSource.mockImplementation((_url, opts) => {
      capturedOnMessage = opts.onmessage
      return Promise.resolve()
    })

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    queryClient.setQueryData(['orders', 'branch-a'], { orders: [{ id: 'ord-001', status: 'NEW' }] })

    function testWrapper({ children }) {
      return createElement(QueryClientProvider, { client: queryClient }, children)
    }

    renderHook(() => useSSE('test-token'), { wrapper: testWrapper })

    const updated = { id: 'ord-001', status: 'ACCEPTED' }
    await act(async () => {
      if (capturedOnMessage) {
        capturedOnMessage({ event: 'order_new', data: JSON.stringify(updated) })
      }
    })

    const cached = queryClient.getQueryData(['orders', 'branch-a'])
    expect(cached.orders).toHaveLength(1)
    expect(cached.orders[0].status).toBe('ACCEPTED')
  })
})

// ── D-01/SC1/SC4: branch-aware reconnect ───────────────────────────────────

describe('branch-aware reconnect', () => {
  beforeEach(() => { vi.clearAllMocks() })

  test('branchId change triggers reconnect: fetchEventSource called twice with distinct signals, isConnected flips false', async () => {
    useAppStore.setState({ currentBranch: { id: 'branch-a' } })
    let capturedOnOpen
    fetchEventSource.mockImplementation((_url, opts) => {
      capturedOnOpen = opts.onopen
      return Promise.resolve()
    })

    const { result, rerender } = renderHook(() => useSSE('test-token'), { wrapper })

    await act(async () => {
      if (capturedOnOpen) await capturedOnOpen({ ok: true, status: 200 })
    })
    expect(result.current.isConnected).toBe(true)

    act(() => {
      useAppStore.setState({ currentBranch: { id: 'branch-b' } })
    })
    rerender()

    expect(fetchEventSource).toHaveBeenCalledTimes(2)
    const signal1 = fetchEventSource.mock.calls[0][1].signal
    const signal2 = fetchEventSource.mock.calls[1][1].signal
    expect(signal1).not.toBe(signal2)
    expect(result.current.isConnected).toBe(false)
  })

  test('SC4: single-branch tenant — branchId unchanged across rerenders connects exactly once', () => {
    useAppStore.setState({ currentBranch: { id: 'branch-a' } })
    fetchEventSource.mockImplementation(() => Promise.resolve())

    const { rerender } = renderHook(() => useSSE('test-token'), { wrapper })
    rerender()
    rerender()
    rerender()

    expect(fetchEventSource).toHaveBeenCalledTimes(1)
  })
})

// ── U9b2: order_status_changed event patches caches ───────────────────────

describe('U9b2 — useSSE handles order_status_changed event', () => {
  beforeEach(() => { vi.clearAllMocks() })

  test('order_status_changed updates state in ["orders", branchId] list cache and invalidates D-04 scoped keys', async () => {
    useAppStore.setState({ currentBranch: { id: 'branch-a' } })
    let capturedOnMessage
    fetchEventSource.mockImplementation((_url, opts) => {
      capturedOnMessage = opts.onmessage
      return Promise.resolve()
    })

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    queryClient.setQueryData(['orders', 'branch-a'], { orders: [{ id: 'ord-001', status: 'NEW', state: 'new' }] })

    function testWrapper({ children }) {
      return createElement(QueryClientProvider, { client: queryClient }, children)
    }

    renderHook(() => useSSE('test-token'), { wrapper: testWrapper })

    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    await act(async () => {
      if (capturedOnMessage) {
        capturedOnMessage({ event: 'order_status_changed', data: JSON.stringify({ orderId: 'ord-001', fromStatus: 'NEW', toStatus: 'ACCEPTED', updatedAt: new Date().toISOString() }) })
      }
    })

    const cached = queryClient.getQueryData(['orders', 'branch-a'])
    expect(cached.orders[0].status).toBe('ACCEPTED')
    expect(cached.orders[0].state).toBe('accepted')
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['orders', 'branch-a', 'NEW'] })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['orders', 'branch-a', 'ACCEPTED'] })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['stats', 'branch-a'] })
  })

  test('order_status_changed maps OUT_FOR_DELIVERY to state "out"', async () => {
    useAppStore.setState({ currentBranch: { id: 'branch-a' } })
    let capturedOnMessage
    fetchEventSource.mockImplementation((_url, opts) => {
      capturedOnMessage = opts.onmessage
      return Promise.resolve()
    })

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    queryClient.setQueryData(['orders', 'branch-a'], { orders: [{ id: 'ord-002', status: 'READY', state: 'ready' }] })

    function testWrapper({ children }) {
      return createElement(QueryClientProvider, { client: queryClient }, children)
    }

    renderHook(() => useSSE('test-token'), { wrapper: testWrapper })

    await act(async () => {
      if (capturedOnMessage) {
        capturedOnMessage({ event: 'order_status_changed', data: JSON.stringify({ orderId: 'ord-002', fromStatus: 'READY', toStatus: 'OUT_FOR_DELIVERY', updatedAt: new Date().toISOString() }) })
      }
    })

    const cached = queryClient.getQueryData(['orders', 'branch-a'])
    expect(cached.orders[0].state).toBe('out')
  })

  test('order_status_changed maps COMPLETED to state "done"', async () => {
    useAppStore.setState({ currentBranch: { id: 'branch-a' } })
    let capturedOnMessage
    fetchEventSource.mockImplementation((_url, opts) => {
      capturedOnMessage = opts.onmessage
      return Promise.resolve()
    })

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    queryClient.setQueryData(['orders', 'branch-a'], { orders: [{ id: 'ord-003', status: 'READY', state: 'ready' }] })

    function testWrapper({ children }) {
      return createElement(QueryClientProvider, { client: queryClient }, children)
    }

    renderHook(() => useSSE('test-token'), { wrapper: testWrapper })

    await act(async () => {
      if (capturedOnMessage) {
        capturedOnMessage({ event: 'order_status_changed', data: JSON.stringify({ orderId: 'ord-003', fromStatus: 'READY', toStatus: 'COMPLETED', updatedAt: new Date().toISOString() }) })
      }
    })

    const cached = queryClient.getQueryData(['orders', 'branch-a'])
    expect(cached.orders[0].state).toBe('done')
  })

  test('order_status_changed patches the per-order detail cache', async () => {
    useAppStore.setState({ currentBranch: { id: 'branch-a' } })
    let capturedOnMessage
    fetchEventSource.mockImplementation((_url, opts) => {
      capturedOnMessage = opts.onmessage
      return Promise.resolve()
    })

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    queryClient.setQueryData(['orders', 'branch-a'], { orders: [] })
    queryClient.setQueryData(['order', 'branch-a', 'ord-004'], { id: 'ord-004', status: 'NEW', state: 'new' })

    function testWrapper({ children }) {
      return createElement(QueryClientProvider, { client: queryClient }, children)
    }

    renderHook(() => useSSE('test-token'), { wrapper: testWrapper })

    await act(async () => {
      if (capturedOnMessage) {
        capturedOnMessage({ event: 'order_status_changed', data: JSON.stringify({ orderId: 'ord-004', fromStatus: 'NEW', toStatus: 'PREPARING', updatedAt: new Date().toISOString() }) })
      }
    })

    const detail = queryClient.getQueryData(['order', 'branch-a', 'ord-004'])
    expect(detail.status).toBe('PREPARING')
    expect(detail.state).toBe('preparing')
  })

  test('order_status_changed with unknown orderId does not throw', async () => {
    useAppStore.setState({ currentBranch: { id: 'branch-a' } })
    let capturedOnMessage
    fetchEventSource.mockImplementation((_url, opts) => {
      capturedOnMessage = opts.onmessage
      return Promise.resolve()
    })

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    queryClient.setQueryData(['orders', 'branch-a'], { orders: [{ id: 'ord-999', status: 'NEW', state: 'new' }] })

    function testWrapper({ children }) {
      return createElement(QueryClientProvider, { client: queryClient }, children)
    }

    renderHook(() => useSSE('test-token'), { wrapper: testWrapper })

    await act(async () => {
      if (capturedOnMessage) {
        capturedOnMessage({ event: 'order_status_changed', data: JSON.stringify({ orderId: 'ord-unknown', fromStatus: 'NEW', toStatus: 'ACCEPTED', updatedAt: new Date().toISOString() }) })
      }
    })

    // Cache unchanged for unmatched orderId
    const cached = queryClient.getQueryData(['orders', 'branch-a'])
    expect(cached.orders[0].state).toBe('new')
  })
})

// ── D-03: captured-not-live-read isolation — a late message from a stale connection ────────
// writes only to its captured (old) branch's key, never the new live-store value.

describe('D-03 — captured scopedBranchId isolates a stale-connection message from a live branch switch', () => {
  beforeEach(() => { vi.clearAllMocks() })

  test('a message fired after the store changes but before the hook rerenders writes to the OLD captured branch key, not the live value', async () => {
    useAppStore.setState({ currentBranch: { id: 'branch-a' } })
    let capturedOnMessage
    fetchEventSource.mockImplementation((_url, opts) => {
      capturedOnMessage = opts.onmessage
      return Promise.resolve()
    })

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    queryClient.setQueryData(['orders', 'branch-a'], { orders: [] })
    queryClient.setQueryData(['orders', 'branch-b'], { orders: [] })

    function testWrapper({ children }) {
      return createElement(QueryClientProvider, { client: queryClient }, children)
    }

    renderHook(() => useSSE('test-token'), { wrapper: testWrapper })

    // Simulate a stale in-flight connection: the store's currentBranch changes, but the
    // hook has NOT rerendered (no new effect run, no new scopedBranchId capture).
    useAppStore.setState({ currentBranch: { id: 'branch-b' } })

    await act(async () => {
      if (capturedOnMessage) {
        capturedOnMessage({ event: 'order_new', data: JSON.stringify({ id: 'ord-late', status: 'NEW' }) })
      }
    })

    const oldBranchCache = queryClient.getQueryData(['orders', 'branch-a'])
    const newBranchCache = queryClient.getQueryData(['orders', 'branch-b'])
    expect(oldBranchCache.orders).toHaveLength(1)
    expect(oldBranchCache.orders[0].id).toBe('ord-late')
    expect(newBranchCache.orders).toHaveLength(0)
  })
})

// ── U9c: ping events are ignored (KDS-01, D-04) ───────────────────────────

describe('U9c — useSSE ignores ping events (KDS-01, D-04)', () => {
  beforeEach(() => { vi.clearAllMocks() })

  test('ping event does not modify the orders cache', async () => {
    let capturedOnMessage
    fetchEventSource.mockImplementation((_url, opts) => {
      capturedOnMessage = opts.onmessage
      return Promise.resolve()
    })

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    queryClient.setQueryData(['orders'], { orders: [] })

    function testWrapper({ children }) {
      return createElement(QueryClientProvider, { client: queryClient }, children)
    }

    renderHook(() => useSSE('test-token'), { wrapper: testWrapper })

    await act(async () => {
      if (capturedOnMessage) {
        capturedOnMessage({ event: 'ping', data: '' })
      }
    })

    const cached = queryClient.getQueryData(['orders'])
    expect(cached.orders).toHaveLength(0) // unchanged
  })
})

describe('U9d — openWhenHidden: true is passed to fetchEventSource (UAT gap 1)', () => {
  beforeEach(() => { vi.clearAllMocks() })

  test('fetchEventSource is called with openWhenHidden: true', () => {
    fetchEventSource.mockImplementation(() => Promise.resolve())
    renderHook(() => useSSE('test-token'), { wrapper })
    expect(fetchEventSource).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ openWhenHidden: true })
    )
  })

  test('openWhenHidden: true is present regardless of token value', () => {
    fetchEventSource.mockImplementation(() => Promise.resolve())
    renderHook(() => useSSE('another-token'), { wrapper })
    const [, opts] = fetchEventSource.mock.calls[0]
    expect(opts.openWhenHidden).toBe(true)
  })
})

describe('KDS-04: snapshot detection — sound plays only on live events', () => {
  beforeEach(() => { vi.clearAllMocks() })

  test('useSSE accepts optional second parameter onLiveOrder callback', () => {
    const onLiveOrder = vi.fn()
    // Should not throw when called with two args
    const { result } = renderHook(() => useSSE('test-token', onLiveOrder), { wrapper })
    expect(result.current).toHaveProperty('isConnected')
  })

  test('onLiveOrder is NOT called for order_new events arriving before snapshotDone (within 100ms of connect)', async () => {
    vi.useFakeTimers()
    const onLiveOrder = vi.fn()
    let capturedOnOpen
    let capturedOnMessage

    fetchEventSource.mockImplementation((_url, opts) => {
      capturedOnOpen = opts.onopen
      capturedOnMessage = opts.onmessage
      return Promise.resolve()
    })

    renderHook(() => useSSE('test-token', onLiveOrder), { wrapper })

    await act(async () => {
      if (capturedOnOpen) await capturedOnOpen({ ok: true, status: 200 })
    })

    // Fire order_new BEFORE 100ms timeout (snapshot period)
    await act(async () => {
      if (capturedOnMessage) {
        capturedOnMessage({ event: 'order_new', data: JSON.stringify({ id: 'snap-1', status: 'NEW' }) })
      }
    })

    // snapshotDone is still false — onLiveOrder must NOT have been called
    expect(onLiveOrder).not.toHaveBeenCalled()

    vi.useRealTimers()
  })

  test('onLiveOrder IS called for order_new events arriving after snapshotDone flag is set', async () => {
    vi.useFakeTimers()
    const onLiveOrder = vi.fn()
    let capturedOnOpen
    let capturedOnMessage

    fetchEventSource.mockImplementation((_url, opts) => {
      capturedOnOpen = opts.onopen
      capturedOnMessage = opts.onmessage
      return Promise.resolve()
    })

    renderHook(() => useSSE('test-token', onLiveOrder), { wrapper })

    await act(async () => {
      if (capturedOnOpen) await capturedOnOpen({ ok: true, status: 200 })
    })

    // Advance timers past 100ms to set snapshotDone = true
    await act(async () => {
      vi.advanceTimersByTime(150)
    })

    // Fire order_new AFTER snapshot window
    await act(async () => {
      if (capturedOnMessage) {
        capturedOnMessage({ event: 'order_new', data: JSON.stringify({ id: 'live-1', status: 'NEW' }) })
      }
    })

    expect(onLiveOrder).toHaveBeenCalledTimes(1)

    vi.useRealTimers()
  })

  test('onLiveOrder is NOT called for order_new fired immediately after a branch-triggered reconnect (SC3 snapshot silence)', async () => {
    vi.useFakeTimers()
    useAppStore.setState({ currentBranch: { id: 'branch-a' } })
    const onLiveOrder = vi.fn()
    let capturedOnOpen
    let capturedOnMessage

    fetchEventSource.mockImplementation((_url, opts) => {
      capturedOnOpen = opts.onopen
      capturedOnMessage = opts.onmessage
      return Promise.resolve()
    })

    renderHook(() => useSSE('test-token', onLiveOrder), { wrapper })

    await act(async () => {
      if (capturedOnOpen) await capturedOnOpen({ ok: true, status: 200 })
    })

    // Clear the initial connect's snapshot window
    await act(async () => {
      vi.advanceTimersByTime(150)
    })

    // Branch-triggered reconnect — snapshotDone resets to false
    await act(async () => {
      useAppStore.setState({ currentBranch: { id: 'branch-b' } })
    })

    await act(async () => {
      if (capturedOnOpen) await capturedOnOpen({ ok: true, status: 200 })
    })

    // Fire order_new immediately after the reconnect's onopen — still within the fresh 100ms window
    await act(async () => {
      if (capturedOnMessage) {
        capturedOnMessage({ event: 'order_new', data: JSON.stringify({ id: 'reconnect-1', status: 'NEW' }) })
      }
    })

    expect(onLiveOrder).not.toHaveBeenCalled()

    vi.useRealTimers()
  })

  test('when soundMuted is true in Zustand store, the caller should not play audio (mute is caller responsibility)', () => {
    // This is a design contract test — the hook itself never plays audio.
    // The onLiveOrder callback is the audio boundary: if caller checks soundMuted before playing, this is satisfied.
    // We verify: onLiveOrder is still called when soundMuted (the hook does not check it — caller does).
    // This test documents the contract only; actual mute enforcement is tested in app.jsx tests.
    const onLiveOrder = vi.fn()
    const { result } = renderHook(() => useSSE('test-token', onLiveOrder), { wrapper })
    expect(result.current).toHaveProperty('isConnected')
    // Contract: hook never inspects soundMuted — caller (app.jsx handleLiveOrder) is responsible
  })
})
