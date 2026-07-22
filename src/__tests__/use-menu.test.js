// Tests for useMenu branch-scoping — Phase 14 Plan 02 (SCOPE-01, SC1)
// Base useMenu behavior (staleTime, data shape) is already covered by use-orders.test.js's
// U11b block; this file adds the dedicated SC1 branch-key assertion.

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
import { useMenu } from '../use-menu.js'
import { useAuth } from '../auth.jsx'
import { useAppStore } from '../store.js'

beforeEach(() => {
  useAppStore.setState({ currentBranch: null })
})

describe('useMenu (Phase 14, SC1)', () => {
  // SC1: seeding a currentBranch id makes that id appear as the segment immediately after
  // 'menu' in the cache key.
  test('query key includes currentBranch.id as the segment after "menu" (SC1)', async () => {
    useAppStore.setState({ currentBranch: { id: 'branch-a', name: 'A', slug: 'a', isDefault: true, isActive: true } })

    const mockMenu = { categories: [], globalProducts: [] }
    const mockClient = {
      kitchen: { menu: { list: vi.fn().mockResolvedValue({ data: mockMenu, error: null }) } },
    }
    useAuth.mockReturnValue({ client: mockClient })

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    function w({ children }) { return createElement(QueryClientProvider, { client: qc }, children) }

    const { result } = renderHook(() => useMenu(), { wrapper: w })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    const keys = qc.getQueryCache().findAll().map((q) => q.queryKey)
    expect(keys.some((k) => k[0] === 'menu' && k[1] === 'branch-a')).toBe(true)
  })

  test('fetches immediately when client present and currentBranch is null (enabled unchanged)', () => {
    useAppStore.setState({ currentBranch: null })
    const mockClient = {
      kitchen: { menu: { list: vi.fn().mockResolvedValue({ data: { categories: [], globalProducts: [] }, error: null }) } },
    }
    useAuth.mockReturnValue({ client: mockClient })

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    function w({ children }) { return createElement(QueryClientProvider, { client: qc }, children) }

    const { result } = renderHook(() => useMenu(), { wrapper: w })
    expect(result.current.fetchStatus).not.toBe('idle')
  })
})
