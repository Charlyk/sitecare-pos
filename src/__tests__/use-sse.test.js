// Tests for useSSE hook — U9 (KDS-01)
// Wave 0 stub: tests fail RED until src/use-sse.js is implemented.

vi.mock('@tauri-apps/plugin-store', () => ({ load: vi.fn() }))
vi.mock('@charlyk/admin-client', () => ({ signIn: vi.fn(), createAdminClient: vi.fn() }))
vi.mock('@tauri-apps/plugin-opener', () => ({ open: vi.fn(), openUrl: vi.fn() }))
vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }))
vi.mock('@microsoft/fetch-event-source', () => ({
  fetchEventSource: vi.fn(),
}))

import { renderHook, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement } from 'react'
import { useSSE } from '../use-sse.js'
import { fetchEventSource } from '@microsoft/fetch-event-source'

function wrapper({ children }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return createElement(QueryClientProvider, { client }, children)
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
})

// ── U9b: order_new event upserts into ['orders'] cache (KDS-01) ───────────

describe('U9b — useSSE upserts order_new event into TanStack Query cache (KDS-01)', () => {
  beforeEach(() => { vi.clearAllMocks() })

  test('order_new event with new order id appends to cache', async () => {
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

    const order = { id: 'ord-001', status: 'NEW', customerName: 'Test' }
    await act(async () => {
      if (capturedOnMessage) {
        capturedOnMessage({ event: 'order_new', data: JSON.stringify(order) })
      }
    })

    const cached = queryClient.getQueryData(['orders'])
    expect(cached.orders).toHaveLength(1)
    expect(cached.orders[0].id).toBe('ord-001')
  })

  test('order_new event with existing order id updates (not duplicates) in cache', async () => {
    let capturedOnMessage
    fetchEventSource.mockImplementation((_url, opts) => {
      capturedOnMessage = opts.onmessage
      return Promise.resolve()
    })

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    queryClient.setQueryData(['orders'], { orders: [{ id: 'ord-001', status: 'NEW' }] })

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

    const cached = queryClient.getQueryData(['orders'])
    expect(cached.orders).toHaveLength(1)
    expect(cached.orders[0].status).toBe('ACCEPTED')
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
