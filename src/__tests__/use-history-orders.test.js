// Tests for useHistoryOrders — HIST-02, HIST-03, HIST-04 (Phase 7 Plan 03; Phase 9 Plan 03)
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
import { useAppStore } from '../store.js'
import { getLast30DaysRange } from '../history-utils.js'

beforeEach(() => {
  useAppStore.setState({ currentBranch: null })
})

function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  function w({ children }) { return createElement(QueryClientProvider, { client: qc }, children) }
  return w
}

// Shared fixture range for tests whose subject is not the range itself (the endpoint, the
// unwrap, the mapping, the sort). Built from a fixed clock so it is deterministic across runs.
const FIXTURE_RANGE = getLast30DaysRange(new Date('2026-06-15T12:00:00.000Z'))

// Two distinct fixed ranges for the tests whose subject IS the range: range-change refetch,
// cache reuse, and keepPreviousData.
const RANGE_A = { from: '2026-01-01T00:00:00.000Z', to: '2026-01-08T00:00:00.000Z' }
const RANGE_B = { from: '2026-02-01T00:00:00.000Z', to: '2026-02-08T00:00:00.000Z' }

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

    const { result } = renderHook(() => useHistoryOrders(FIXTURE_RANGE), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(mockClient.admin.orders.list).toHaveBeenCalledTimes(1)
    const callArg = mockClient.admin.orders.list.mock.calls[0][0]
    expect(callArg).toHaveProperty('query')
    expect(() => new Date(callArg.query.from).toISOString()).not.toThrow()
    expect(() => new Date(callArg.query.to).toISOString()).not.toThrow()
    expect(Number.isNaN(new Date(callArg.query.from).getTime())).toBe(false)
    expect(Number.isNaN(new Date(callArg.query.to).getTime())).toBe(false)
  })

  test('passes the caller-supplied range to the SDK verbatim, with no transformation (HIST-04)', async () => {
    const distinctiveRange = { from: '2025-03-10T00:00:00.000Z', to: '2025-03-25T00:00:00.000Z' }
    const mockClient = {
      admin: {
        orders: {
          list: vi.fn().mockResolvedValue({ data: { orders: [] }, error: null }),
        },
      },
    }
    useAuth.mockReturnValue({ client: mockClient })

    const { result } = renderHook(() => useHistoryOrders(distinctiveRange), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    const callArg = mockClient.admin.orders.list.mock.calls[0][0]
    // The hook computes no range of its own — whatever the caller passes reaches the SDK
    // verbatim, with no transformation.
    expect(callArg.query.from).toBe(distinctiveRange.from)
    expect(callArg.query.to).toBe(distinctiveRange.to)
  })
})

describe('useHistoryOrders — branch-scoped cache key (Phase 14, SC1)', () => {
  test('query key includes currentBranch.id as the segment after "history-orders" (SC1)', async () => {
    useAppStore.setState({ currentBranch: { id: 'branch-a', name: 'A', slug: 'a', isDefault: true, isActive: true } })

    const mockClient = {
      admin: { orders: { list: vi.fn().mockResolvedValue({ data: { orders: [] }, error: null }) } },
    }
    useAuth.mockReturnValue({ client: mockClient })

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    function w({ children }) { return createElement(QueryClientProvider, { client: qc }, children) }

    const { result } = renderHook(() => useHistoryOrders(FIXTURE_RANGE), { wrapper: w })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    const keys = qc.getQueryCache().findAll().map((q) => q.queryKey)
    expect(keys.some((k) => k[0] === 'history-orders' && k[1] === 'branch-a')).toBe(true)
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

    const { result } = renderHook(() => useHistoryOrders(FIXTURE_RANGE), { wrapper: makeWrapper() })
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

    const { result } = renderHook(() => useHistoryOrders(FIXTURE_RANGE), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual([])
  })

  test('null orders resolves to [] without throwing', async () => {
    const mockClient = {
      admin: { orders: { list: vi.fn().mockResolvedValue({ data: { orders: null }, error: null }) } },
    }
    useAuth.mockReturnValue({ client: mockClient })

    const { result } = renderHook(() => useHistoryOrders(FIXTURE_RANGE), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.isSuccess || result.current.isError).toBe(true))

    expect(result.current.isError).toBe(false)
    expect(result.current.data).toEqual([])
  })

  test('missing orders key resolves to []', async () => {
    const mockClient = {
      admin: { orders: { list: vi.fn().mockResolvedValue({ data: {}, error: null }) } },
    }
    useAuth.mockReturnValue({ client: mockClient })

    const { result } = renderHook(() => useHistoryOrders(FIXTURE_RANGE), { wrapper: makeWrapper() })
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

    const { result } = renderHook(() => useHistoryOrders(FIXTURE_RANGE), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(result.current.error.message).toBe('Invalid date format')
  })

  test('falls back to "Failed to load history" when error has no message field', async () => {
    const mockClient = {
      admin: { orders: { list: vi.fn().mockResolvedValue({ data: null, error: {} }) } },
    }
    useAuth.mockReturnValue({ client: mockClient })

    const { result } = renderHook(() => useHistoryOrders(FIXTURE_RANGE), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(result.current.error.message).toBe('Failed to load history')
  })

  // Phase 14 SC3: the thrown Error carries a matchable .code (mirrors unwrapSdkResult's contract)
  // so Phase 17's centralized branch-access onError handler can act on it uniformly. The
  // .diagnostic enrichment (windows-history-network-error session) is preserved alongside it.
  test('populates err.code from the object error field (SC3)', async () => {
    const mockClient = {
      admin: { orders: { list: vi.fn().mockResolvedValue({ data: null, error: { error: 'BRANCH_INACTIVE' } }) } },
    }
    useAuth.mockReturnValue({ client: mockClient })

    const { result } = renderHook(() => useHistoryOrders(FIXTURE_RANGE), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(result.current.error.code).toBe('BRANCH_INACTIVE')
    // .diagnostic enrichment remains intact alongside the new .code (additive change)
    expect(result.current.error.diagnostic).toBeDefined()
  })

  test('populates err.code from a bare-string error (SC3)', async () => {
    const mockClient = {
      admin: { orders: { list: vi.fn().mockResolvedValue({ data: null, error: 'BRANCH_ACCESS_REVOKED' }) } },
    }
    useAuth.mockReturnValue({ client: mockClient })

    const { result } = renderHook(() => useHistoryOrders(FIXTURE_RANGE), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(result.current.error.code).toBe('BRANCH_ACCESS_REVOKED')
  })
})

describe('useHistoryOrders — disabled when client is null', () => {
  test('does not call the SDK and stays idle', () => {
    useAuth.mockReturnValue({ client: null })

    const { result } = renderHook(() => useHistoryOrders(FIXTURE_RANGE), { wrapper: makeWrapper() })

    expect(result.current.fetchStatus).toBe('idle')
  })
})

describe('useHistoryOrders — disabled until the range resolves (HIST-04)', () => {
  test('called with { from: undefined, to: undefined } issues no call and does not throw', () => {
    const mockClient = {
      admin: { orders: { list: vi.fn().mockResolvedValue({ data: { orders: [] }, error: null }) } },
    }
    useAuth.mockReturnValue({ client: mockClient })

    const { result } = renderHook(
      () => useHistoryOrders({ from: undefined, to: undefined }),
      { wrapper: makeWrapper() }
    )

    expect(result.current.fetchStatus).toBe('idle')
    expect(mockClient.admin.orders.list).not.toHaveBeenCalled()
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

    const { result } = renderHook(() => useHistoryOrders(FIXTURE_RANGE), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data[0].id).toBe('ord-b')
    expect(result.current.data[1].id).toBe('ord-a')
  })
})

describe('useHistoryOrders — stable query key across re-renders', () => {
  test('rerender with an identical-valued new object literal does not trigger a second fetch', async () => {
    const mockClient = {
      admin: { orders: { list: vi.fn().mockResolvedValue({ data: { orders: [] }, error: null }) } },
    }
    useAuth.mockReturnValue({ client: mockClient })

    // The callback below builds a NEW object literal on every render (identical string values),
    // exercising the "compared by serialized value, not object identity" guarantee — the
    // premise now moves from the hook's internal useState to whatever the caller supplies.
    const { result, rerender } = renderHook(
      () => useHistoryOrders({ from: RANGE_A.from, to: RANGE_A.to }),
      { wrapper: makeWrapper() }
    )
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    rerender()
    // Allow any accidental re-fetch microtask to settle before asserting call count.
    await waitFor(() => expect(mockClient.admin.orders.list).toHaveBeenCalled())

    expect(mockClient.admin.orders.list).toHaveBeenCalledTimes(1)
  })
})

describe('useHistoryOrders — range change refetches (HIST-04)', () => {
  test('rerendering with a genuinely different range issues exactly one additional call, with the new range', async () => {
    const mockClient = {
      admin: { orders: { list: vi.fn().mockResolvedValue({ data: { orders: [] }, error: null }) } },
    }
    useAuth.mockReturnValue({ client: mockClient })

    const { result, rerender } = renderHook((range) => useHistoryOrders(range), {
      wrapper: makeWrapper(),
      initialProps: RANGE_A,
    })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(mockClient.admin.orders.list).toHaveBeenCalledTimes(1)

    rerender(RANGE_B)
    await waitFor(() => expect(mockClient.admin.orders.list).toHaveBeenCalledTimes(2))

    const secondCallArg = mockClient.admin.orders.list.mock.calls[1][0]
    expect(secondCallArg.query.from).toBe(RANGE_B.from)
    expect(secondCallArg.query.to).toBe(RANGE_B.to)
  })
})

describe('useHistoryOrders — cache reuse on return (D-08 / RESEARCH Pitfall 4)', () => {
  test('switching A → B → A against one QueryClient serves the third render from cache: still 2 calls', async () => {
    const mockClient = {
      admin: { orders: { list: vi.fn().mockResolvedValue({ data: { orders: [] }, error: null }) } },
    }
    useAuth.mockReturnValue({ client: mockClient })

    // makeWrapper() builds a fresh QueryClient per call — this test needs the SAME QueryClient
    // across all three renders, so it is built once and reused.
    const wrapper = makeWrapper()
    const { result, rerender } = renderHook((range) => useHistoryOrders(range), {
      wrapper,
      initialProps: RANGE_A,
    })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    rerender(RANGE_B)
    await waitFor(() => expect(mockClient.admin.orders.list).toHaveBeenCalledTimes(2))
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    rerender(RANGE_A)
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    // The resolved range, not a period id, is the cache identity — returning to range A must be
    // served from cache with no additional SDK call.
    expect(mockClient.admin.orders.list).toHaveBeenCalledTimes(2)
  })
})

describe('useHistoryOrders — keepPreviousData holds the previous range as placeholder data (D-05)', () => {
  test('mid-switch, data is still the previous range and isPlaceholderData is true', async () => {
    const orderA = { id: 'ord-a', status: 'COMPLETED', dailyNumber: 1, total: 1000, createdAt: new Date().toISOString() }
    let resolveB
    const mockClient = {
      admin: {
        orders: {
          list: vi.fn()
            .mockResolvedValueOnce({ data: { orders: [orderA] }, error: null })
            .mockImplementationOnce(() => new Promise((resolve) => { resolveB = resolve })),
        },
      },
    }
    useAuth.mockReturnValue({ client: mockClient })

    const { result, rerender } = renderHook((range) => useHistoryOrders(range), {
      wrapper: makeWrapper(),
      initialProps: RANGE_A,
    })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data[0].id).toBe('ord-a')
    expect(result.current.isPlaceholderData).toBe(false)

    rerender(RANGE_B)
    await waitFor(() => expect(result.current.isFetching).toBe(true))

    // Range B has not settled yet — the hook still returns range A's data, flagged as a
    // placeholder rather than undefined.
    expect(result.current.data[0].id).toBe('ord-a')
    expect(result.current.isPlaceholderData).toBe(true)

    resolveB({ data: { orders: [] }, error: null })
    await waitFor(() => expect(result.current.isPlaceholderData).toBe(false))
    expect(result.current.data).toEqual([])
  })
})
