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
import { useAppStore } from '../store.js'
import { useOrderActions } from '../use-order-actions.js'

// ── U11c: useOrderActions mutation wrappers (D-15) ────────────────────────

describe('U11c — useOrderActions mutation wrappers (D-15)', () => {
  beforeEach(() => {
    useAppStore.setState({ currentBranch: null })
  })


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

  test('updateStatus invalidates [\'orders\', branchId] cache on success', async () => {
    useAppStore.setState({ currentBranch: { id: 'branch-a', name: 'A', slug: 'a', isDefault: true, isActive: true } })

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
    qc.setQueryData(['orders', 'branch-a'], [{ id: 'ord-001', status: 'NEW' }])

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

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['orders', 'branch-a'] })
  })

  test('updateStatus invalidates only current branch — sibling branch cache untouched (SC2)', async () => {
    useAppStore.setState({ currentBranch: { id: 'branch-a', name: 'A', slug: 'a', isDefault: true, isActive: true } })

    const mockClient = {
      kitchen: {
        orders: {
          updateStatus: vi.fn().mockResolvedValue({ data: {}, error: null }),
          updateEstimatedTime: vi.fn().mockResolvedValue({ data: {}, error: null }),
        },
      },
    }

    useAuth.mockReturnValue({ client: mockClient })

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    qc.setQueryData(['orders', 'branch-a'], [{ id: 'ord-001' }])
    qc.setQueryData(['orders', 'branch-b'], [{ id: 'ord-002' }]) // sibling branch

    function w({ children }) { return createElement(QueryClientProvider, { client: qc }, children) }

    const { result } = renderHook(() => useOrderActions(), { wrapper: w })

    await act(async () => {
      await result.current.updateStatus.mutateAsync({
        id: 'ord-001',
        currentStatus: 'NEW',
        toStatus: 'IN_PROGRESS',
      })
    })

    expect(qc.getQueryData(['orders', 'branch-b'])).toEqual([{ id: 'ord-002' }]) // untouched
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

describe('ACT-02: statusToSDK mapping — correct enum values sent to API', () => {
  let statusToSDK

  beforeAll(async () => {
    const mod = await import('../app.jsx')
    statusToSDK = mod.statusToSDK
  })

  // When advancing FROM 'new' TO 'accepted', the toStatus sent is statusToSDK['accepted']
  test('advancing from "done" state sends toStatus "COMPLETED" not "DONE"', () => {
    // When an order has state 'done' (meaning we're mapping that state to SDK), it must be 'COMPLETED'
    expect(statusToSDK['done']).toBe('COMPLETED')
    expect(statusToSDK['done']).not.toBe('DONE')
  })

  test('advancing from "out" state sends toStatus "OUT_FOR_DELIVERY" not "OUT"', () => {
    // When an order has state 'out' (delivery en route), SDK enum must be 'OUT_FOR_DELIVERY'
    expect(statusToSDK['out']).toBe('OUT_FOR_DELIVERY')
    expect(statusToSDK['out']).not.toBe('OUT')
  })

  test('advancing from "new" sends toStatus "ACCEPTED"', () => {
    // The toStatus when advancing past 'new' is statusToSDK['accepted']
    expect(statusToSDK['accepted']).toBe('ACCEPTED')
  })

  test('advancing from "accepted" sends toStatus "PREPARING"', () => {
    // The toStatus when advancing past 'accepted' is statusToSDK['preparing']
    expect(statusToSDK['preparing']).toBe('PREPARING')
  })

  test('advancing from "preparing" sends toStatus "READY"', () => {
    // The toStatus when advancing past 'preparing' is statusToSDK['ready']
    expect(statusToSDK['ready']).toBe('READY')
  })
})
