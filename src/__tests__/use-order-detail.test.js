// Tests for useOrderDetail — Phase 14 Plan 02 (SCOPE-01, SC1)

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
vi.mock('../auth.jsx', () => ({ useAuth: vi.fn() }))

import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement } from 'react'
import { useOrderDetail } from '../use-order-detail.js'
import { useAuth } from '../auth.jsx'
import { useAppStore } from '../store.js'

beforeEach(() => {
  useAppStore.setState({ currentBranch: null })
})

describe('useOrderDetail (Phase 14, SC1)', () => {
  test('returns order data from SDK response', async () => {
    const mockOrder = { id: 'ord-001', status: 'NEW' }
    const mockClient = {
      kitchen: { orders: { get: vi.fn().mockResolvedValue({ data: { order: mockOrder }, error: null }) } },
    }
    useAuth.mockReturnValue({ client: mockClient })

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    function w({ children }) { return createElement(QueryClientProvider, { client: qc }, children) }

    const { result } = renderHook(() => useOrderDetail('ord-001'), { wrapper: w })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data.id).toBe('ord-001')
  })

  // SC1: seeding a currentBranch id makes that id appear as the segment immediately after
  // 'order' in the cache key.
  test('query key includes currentBranch.id as the segment after "order" (SC1)', async () => {
    useAppStore.setState({ currentBranch: { id: 'branch-a', name: 'A', slug: 'a', isDefault: true, isActive: true } })

    const mockOrder = { id: 'ord-001', status: 'NEW' }
    const mockClient = {
      kitchen: { orders: { get: vi.fn().mockResolvedValue({ data: { order: mockOrder }, error: null }) } },
    }
    useAuth.mockReturnValue({ client: mockClient })

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    function w({ children }) { return createElement(QueryClientProvider, { client: qc }, children) }

    const { result } = renderHook(() => useOrderDetail('ord-001'), { wrapper: w })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    const keys = qc.getQueryCache().findAll().map((q) => q.queryKey)
    expect(keys.some((k) => k[0] === 'order' && k[1] === 'branch-a' && k[2] === 'ord-001')).toBe(true)
  })

  test('does not run when id is missing, even with client present (enabled unchanged)', () => {
    useAuth.mockReturnValue({ client: {} })

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    function w({ children }) { return createElement(QueryClientProvider, { client: qc }, children) }

    const { result } = renderHook(() => useOrderDetail(undefined), { wrapper: w })
    expect(result.current.fetchStatus).toBe('idle')
  })
})
