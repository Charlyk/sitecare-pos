// Tests for useOrderActions hook — U11c (D-15)
// Covers: updateStatus SDK call, cache invalidation on success, updateEstimatedTime SDK call.

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
vi.mock('../auth.jsx', () => ({
  useAuth: vi.fn(),
}))

import { renderHook, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement } from 'react'
import { useAuth } from '../auth.jsx'
import { useOrderActions } from '../use-order-actions.js'

// ── U11c: useOrderActions mutation wrappers (D-15) ────────────────────────

describe('U11c — useOrderActions mutation wrappers (D-15)', () => {
  test('updateStatus calls SDK with correct path and body args', async () => {
    const mockUpdateStatus = vi.fn().mockResolvedValue({ data: {}, error: null })
    const mockClient = {
      kitchen: {
        orders: {
          updateStatus: mockUpdateStatus,
          updateEstimatedTime: vi.fn().mockResolvedValue({ data: {}, error: null }),
        },
      },
    }

    useAuth.mockReturnValue({ client: mockClient })

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    function w({ children }) { return createElement(QueryClientProvider, { client: qc }, children) }

    const { result } = renderHook(() => useOrderActions(), { wrapper: w })

    await act(async () => {
      await result.current.updateStatus.mutateAsync({
        id: 'ord-001',
        currentStatus: 'NEW',
        toStatus: 'IN_PROGRESS',
      })
    })

    expect(mockUpdateStatus).toHaveBeenCalledWith({
      path: { id: 'ord-001' },
      body: { currentStatus: 'NEW', toStatus: 'IN_PROGRESS' },
    })
  })

  test('updateStatus invalidates [\'orders\'] cache on success', async () => {
    const mockUpdateStatus = vi.fn().mockResolvedValue({ data: {}, error: null })
    const mockClient = {
      kitchen: {
        orders: {
          updateStatus: mockUpdateStatus,
          updateEstimatedTime: vi.fn().mockResolvedValue({ data: {}, error: null }),
        },
      },
    }

    useAuth.mockReturnValue({ client: mockClient })

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    // Pre-populate cache so invalidation has something to act on
    qc.setQueryData(['orders'], [{ id: 'ord-001', status: 'NEW' }])

    const invalidateSpy = vi.spyOn(qc, 'invalidateQueries')

    function w({ children }) { return createElement(QueryClientProvider, { client: qc }, children) }

    const { result } = renderHook(() => useOrderActions(), { wrapper: w })

    await act(async () => {
      await result.current.updateStatus.mutateAsync({
        id: 'ord-001',
        currentStatus: 'NEW',
        toStatus: 'IN_PROGRESS',
      })
    })

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['orders'] })
  })

  test('updateEstimatedTime calls SDK with correct path and body args', async () => {
    const mockUpdateEstimatedTime = vi.fn().mockResolvedValue({ data: {}, error: null })
    const mockClient = {
      kitchen: {
        orders: {
          updateStatus: vi.fn().mockResolvedValue({ data: {}, error: null }),
          updateEstimatedTime: mockUpdateEstimatedTime,
        },
      },
    }

    useAuth.mockReturnValue({ client: mockClient })

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    function w({ children }) { return createElement(QueryClientProvider, { client: qc }, children) }

    const { result } = renderHook(() => useOrderActions(), { wrapper: w })

    await act(async () => {
      await result.current.updateEstimatedTime.mutateAsync({
        id: 'ord-001',
        estimatedMinutes: 15,
      })
    })

    expect(mockUpdateEstimatedTime).toHaveBeenCalledWith({
      path: { id: 'ord-001' },
      body: { estimatedMinutes: 15 },
    })
  })
})
