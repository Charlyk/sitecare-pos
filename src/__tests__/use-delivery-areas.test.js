// Tests for useDeliveryAreas — Phase 14 Plan 03 (SCOPE-01, SC1)

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
import { useDeliveryAreas } from '../use-delivery-areas.js'
import { useAuth } from '../auth.jsx'
import { useAppStore } from '../store.js'

beforeEach(() => {
  useAppStore.setState({ currentBranch: null })
})

describe('useDeliveryAreas (Phase 14, SC1)', () => {
  test('returns delivery areas mapped with fee divided by 100 (cents -> units)', async () => {
    const mockClient = {
      kitchen: {
        deliveryAreas: {
          list: vi.fn().mockResolvedValue({
            data: { deliveryAreas: [{ id: 1, name: 'Zone 1', fee: 1500 }] },
            error: null,
          }),
        },
      },
    }
    useAuth.mockReturnValue({ client: mockClient })

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    function w({ children }) { return createElement(QueryClientProvider, { client: qc }, children) }

    const { result } = renderHook(() => useDeliveryAreas(), { wrapper: w })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual([{ id: '1', name: 'Zone 1', fee: 15 }])
  })

  // SC1: seeding a currentBranch id makes that id appear as the segment immediately after
  // 'delivery-areas' in the cache key.
  test('query key includes currentBranch.id as the segment after "delivery-areas" (SC1)', async () => {
    useAppStore.setState({ currentBranch: { id: 'branch-a', name: 'A', slug: 'a', isDefault: true, isActive: true } })

    const mockClient = {
      kitchen: {
        deliveryAreas: {
          list: vi.fn().mockResolvedValue({ data: { deliveryAreas: [] }, error: null }),
        },
      },
    }
    useAuth.mockReturnValue({ client: mockClient })

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    function w({ children }) { return createElement(QueryClientProvider, { client: qc }, children) }

    const { result } = renderHook(() => useDeliveryAreas(), { wrapper: w })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    const keys = qc.getQueryCache().findAll().map((q) => q.queryKey)
    expect(keys.some((k) => k[0] === 'delivery-areas' && k[1] === 'branch-a')).toBe(true)
  })

  test('fetches immediately when client present and currentBranch is null (enabled unchanged)', () => {
    useAppStore.setState({ currentBranch: null })
    const mockClient = {
      kitchen: { deliveryAreas: { list: vi.fn().mockResolvedValue({ data: { deliveryAreas: [] }, error: null }) } },
    }
    useAuth.mockReturnValue({ client: mockClient })

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    function w({ children }) { return createElement(QueryClientProvider, { client: qc }, children) }

    const { result } = renderHook(() => useDeliveryAreas(), { wrapper: w })
    expect(result.current.fetchStatus).not.toBe('idle')
  })

  test('rethrows SDK error message via unwrapSdkResult', async () => {
    const mockClient = {
      kitchen: { deliveryAreas: { list: vi.fn().mockResolvedValue({ data: null, error: { error: 'Invalid delivery area request' } }) } },
    }
    useAuth.mockReturnValue({ client: mockClient })

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    function w({ children }) { return createElement(QueryClientProvider, { client: qc }, children) }

    const { result } = renderHook(() => useDeliveryAreas(), { wrapper: w })
    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(result.current.error.message).toBe('Invalid delivery area request')
  })
})
