// Tests for useHistoryOrders — HIST-02, HIST-03 (Phase 7 Plan 03)
// Mirrors src/__tests__/use-orders.test.js scaffolding. Required deviation: the mock client
// exposes ONLY `admin.orders.list` — no other order-list namespace is defined, so an accidental
// call to a different namespace throws instead of silently succeeding.

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
// Hoisted mock so vi.fn() is injectable per-test (vi.doMock is not hoisted and does
// not affect statically-imported bindings in vitest's module proxy system).
vi.mock('../auth.jsx', () => ({
  useAuth: vi.fn(),
}))

import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement } from 'react'
import { useHistoryOrders } from '../use-history-orders.js'
import { useAuth } from '../auth.jsx'
import { getLast30DaysRange } from '../history-utils.js'

function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  function w({ children }) { return createElement(QueryClientProvider, { client: qc }, children) }
  return w
}

describe('useHistoryOrders — calls the admin endpoint only (HIST-02)', () => {
  test('calls client.admin.orders.list exactly once with { query: { from, to } }', async () => {
    const mockClient = {
      admin: {
        orders: {
          list: vi.fn().mockResolvedValue({ data: { orders: [] }, error: null }),
        },
      },
    }
    useAuth.mockReturnValue({ client: mockClient })

    const { result } = renderHook(() => useHistoryOrders(), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(mockClient.admin.orders.list).toHaveBeenCalledTimes(1)
    const callArg = mockClient.admin.orders.list.mock.calls[0][0]
    expect(callArg).toHaveProperty('query')
    expect(() => new Date(callArg.query.from).toISOString()).not.toThrow()
    expect(() => new Date(callArg.query.to).toISOString()).not.toThrow()
    expect(Number.isNaN(new Date(callArg.query.from).getTime())).toBe(false)
    expect(Number.isNaN(new Date(callArg.query.to).getTime())).toBe(false)
  })

  test('from/to span the same 30-day window as getLast30DaysRange()', async () => {
    const expected = getLast30DaysRange()
    const mockClient = {
      admin: {
        orders: {
          list: vi.fn().mockResolvedValue({ data: { orders: [] }, error: null }),
        },
      },
    }
    useAuth.mockReturnValue({ client: mockClient })

    const { result } = renderHook(() => useHistoryOrders(), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    const callArg = mockClient.admin.orders.list.mock.calls[0][0]
    // Compare calendar-day granularity (avoids millisecond flakiness across two `new Date()` calls)
    expect(callArg.query.from.slice(0, 10)).toBe(expected.from.slice(0, 10))
    expect(callArg.query.to.slice(0, 10)).toBe(expected.to.slice(0, 10))
  })
})

describe('useHistoryOrders — normalizes orders (HIST-02)', () => {
  test('resolves dailyOrderNumber via Plan 01 fallback and total cents→RON via normalizeOrder', async () => {
    const mockOrder = { id: 'ord-uuid-001', status: 'COMPLETED', dailyNumber: 12, total: 4550, createdAt: new Date().toISOString() }
    const mockClient = {
      admin: {
        orders: {
          list: vi.fn().mockResolvedValue({ data: { orders: [mockOrder] }, error: null }),
        },
      },
    }
    useAuth.mockReturnValue({ client: mockClient })

    const { result } = renderHook(() => useHistoryOrders(), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data[0].dailyOrderNumber).toBe(12)
    expect(result.current.data[0].total).toBe(45.5)
  })
})

describe('useHistoryOrders — empty and missing data shapes never throw', () => {
  test('empty orders array resolves to []', async () => {
    const mockClient = {
      admin: { orders: { list: vi.fn().mockResolvedValue({ data: { orders: [] }, error: null }) } },
    }
    useAuth.mockReturnValue({ client: mockClient })

    const { result } = renderHook(() => useHistoryOrders(), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual([])
  })

  test('null orders resolves to [] without throwing', async () => {
    const mockClient = {
      admin: { orders: { list: vi.fn().mockResolvedValue({ data: { orders: null }, error: null }) } },
    }
    useAuth.mockReturnValue({ client: mockClient })

    const { result } = renderHook(() => useHistoryOrders(), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.isSuccess || result.current.isError).toBe(true))

    expect(result.current.isError).toBe(false)
    expect(result.current.data).toEqual([])
  })

  test('missing orders key resolves to []', async () => {
    const mockClient = {
      admin: { orders: { list: vi.fn().mockResolvedValue({ data: {}, error: null }) } },
    }
    useAuth.mockReturnValue({ client: mockClient })

    const { result } = renderHook(() => useHistoryOrders(), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual([])
  })
})

describe('useHistoryOrders — error handling', () => {
  test('rethrows SDK error message', async () => {
    const mockClient = {
      admin: { orders: { list: vi.fn().mockResolvedValue({ data: null, error: { error: 'Invalid date format' } }) } },
    }
    useAuth.mockReturnValue({ client: mockClient })

    const { result } = renderHook(() => useHistoryOrders(), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(result.current.error.message).toBe('Invalid date format')
  })

  test('falls back to "Failed to load history" when error has no message field', async () => {
    const mockClient = {
      admin: { orders: { list: vi.fn().mockResolvedValue({ data: null, error: {} }) } },
    }
    useAuth.mockReturnValue({ client: mockClient })

    const { result } = renderHook(() => useHistoryOrders(), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(result.current.error.message).toBe('Failed to load history')
  })
})

describe('useHistoryOrders — disabled when client is null', () => {
  test('does not call the SDK and stays idle', () => {
    useAuth.mockReturnValue({ client: null })

    const { result } = renderHook(() => useHistoryOrders(), { wrapper: makeWrapper() })

    expect(result.current.fetchStatus).toBe('idle')
  })
})

describe('useHistoryOrders — ordering preserved (no client-side sort)', () => {
  test('output preserves input order verbatim', async () => {
    const now = new Date()
    const earlier = { id: 'ord-a', status: 'COMPLETED', dailyNumber: 1, total: 1000, createdAt: new Date(now.getTime() - 60_000).toISOString() }
    const later = { id: 'ord-b', status: 'COMPLETED', dailyNumber: 2, total: 2000, createdAt: now.toISOString() }
    // Deliberate non-chronological order: later order comes first in the mock response.
    const mockClient = {
      admin: { orders: { list: vi.fn().mockResolvedValue({ data: { orders: [later, earlier] }, error: null }) } },
    }
    useAuth.mockReturnValue({ client: mockClient })

    const { result } = renderHook(() => useHistoryOrders(), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data[0].id).toBe('ord-b')
    expect(result.current.data[1].id).toBe('ord-a')
  })
})

describe('useHistoryOrders — stable query key across re-renders', () => {
  test('rerender does not trigger a second fetch', async () => {
    const mockClient = {
      admin: { orders: { list: vi.fn().mockResolvedValue({ data: { orders: [] }, error: null }) } },
    }
    useAuth.mockReturnValue({ client: mockClient })

    const { result, rerender } = renderHook(() => useHistoryOrders(), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    rerender()
    // Allow any accidental re-fetch microtask to settle before asserting call count.
    await waitFor(() => expect(mockClient.admin.orders.list).toHaveBeenCalled())

    expect(mockClient.admin.orders.list).toHaveBeenCalledTimes(1)
  })
})
