// Tests for useOrders, useMenu, useOrderActions hooks — U11 (OFF-02)
// Wave 0 stub: tests fail RED until hook files are implemented.

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
import { useOrders } from '../use-orders.js'
import { useMenu } from '../use-menu.js'
import { useAuth } from '../auth.jsx'
import { useAppStore } from '../store.js'

beforeEach(() => {
  useAppStore.setState({ currentBranch: null })
})

// ── U11a: useOrders fetches and returns orders (OFF-02) ───────────────────

describe('U11a — useOrders calls client.kitchen.orders.list and returns data (OFF-02)', () => {
  test('useOrders returns orders array from SDK response', async () => {
    const mockOrders = [{ id: 'ord-001', status: 'NEW' }]
    const mockClient = {
      kitchen: {
        orders: {
          list: vi.fn().mockResolvedValue({ data: { orders: mockOrders }, error: null }),
        },
      },
    }

    useAuth.mockReturnValue({ client: mockClient })

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    function w({ children }) { return createElement(QueryClientProvider, { client: qc }, children) }

    const { result } = renderHook(() => useOrders(), { wrapper: w })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data.orders).toHaveLength(1)
    expect(result.current.data.orders[0].id).toBe('ord-001')
  })

  test('useOrders does not run when client is null (enabled: false)', () => {
    useAuth.mockReturnValue({ client: null })

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    function w({ children }) { return createElement(QueryClientProvider, { client: qc }, children) }

    const { result } = renderHook(() => useOrders(), { wrapper: w })
    // When enabled=false, status is 'pending' but fetchStatus is 'idle'
    expect(result.current.fetchStatus).toBe('idle')
  })

  // SC1: changing currentBranch folds branchId into the query key as the first variable segment.
  test('useOrders query key includes currentBranch.id as the segment after "orders" (SC1)', async () => {
    useAppStore.setState({ currentBranch: { id: 'branch-a', name: 'A', slug: 'a', isDefault: true, isActive: true } })

    const mockOrders = [{ id: 'ord-001', status: 'NEW' }]
    const mockClient = {
      kitchen: {
        orders: {
          list: vi.fn().mockResolvedValue({ data: { orders: mockOrders }, error: null }),
        },
      },
    }
    useAuth.mockReturnValue({ client: mockClient })

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    function w({ children }) { return createElement(QueryClientProvider, { client: qc }, children) }

    const { result } = renderHook(() => useOrders(), { wrapper: w })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    const keys = qc.getQueryCache().findAll().map((q) => q.queryKey)
    expect(keys.some((k) => k[0] === 'orders' && k[1] === 'branch-a')).toBe(true)
  })

  // SC4: client present, currentBranch still null (unresolved) — fetch must happen immediately,
  // never gated behind branch resolution (D-08). enabled stays !!client only.
  test('useOrders fetches immediately when client present and currentBranch is null (SC4)', () => {
    useAppStore.setState({ currentBranch: null })

    const mockClient = {
      kitchen: {
        orders: {
          list: vi.fn().mockResolvedValue({ data: { orders: [] }, error: null }),
        },
      },
    }
    useAuth.mockReturnValue({ client: mockClient })

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    function w({ children }) { return createElement(QueryClientProvider, { client: qc }, children) }

    const { result } = renderHook(() => useOrders(), { wrapper: w })
    expect(result.current.fetchStatus).not.toBe('idle')
  })
})

// ── U11b: useMenu staleTime is 5 minutes (OFF-02, D-14) ──────────────────

describe('U11b — useMenu has staleTime of 5 minutes (OFF-02, D-14)', () => {
  test('useMenu returns menu data from SDK response', async () => {
    const mockMenu = { categories: [], globalProducts: [] }
    const mockClient = {
      kitchen: {
        menu: {
          list: vi.fn().mockResolvedValue({ data: mockMenu, error: null }),
        },
      },
    }

    useAuth.mockReturnValue({ client: mockClient })

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    function w({ children }) { return createElement(QueryClientProvider, { client: qc }, children) }

    const { result } = renderHook(() => useMenu(), { wrapper: w })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(mockMenu)
  })
})
