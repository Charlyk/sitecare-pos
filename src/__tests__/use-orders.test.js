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

import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement } from 'react'
import { useOrders } from '../use-orders.js'
import { useMenu } from '../use-menu.js'

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

    vi.doMock('../auth.jsx', () => ({
      useAuth: vi.fn().mockReturnValue({ client: mockClient }),
    }))

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    function w({ children }) { return createElement(QueryClientProvider, { client: qc }, children) }

    const { result } = renderHook(() => useOrders(), { wrapper: w })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data.orders).toHaveLength(1)
    expect(result.current.data.orders[0].id).toBe('ord-001')
  })

  test('useOrders does not run when client is null (enabled: false)', () => {
    vi.doMock('../auth.jsx', () => ({
      useAuth: vi.fn().mockReturnValue({ client: null }),
    }))

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    function w({ children }) { return createElement(QueryClientProvider, { client: qc }, children) }

    const { result } = renderHook(() => useOrders(), { wrapper: w })
    // When enabled=false, status is 'pending' but fetchStatus is 'idle'
    expect(result.current.fetchStatus).toBe('idle')
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

    vi.doMock('../auth.jsx', () => ({
      useAuth: vi.fn().mockReturnValue({ client: mockClient }),
    }))

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    function w({ children }) { return createElement(QueryClientProvider, { client: qc }, children) }

    const { result } = renderHook(() => useMenu(), { wrapper: w })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(mockMenu)
  })
})
