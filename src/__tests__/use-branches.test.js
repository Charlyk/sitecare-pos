// Tests for useBranches — BSTATE-02
// Wave 0 stub: tests fail RED until src/use-branches.js is implemented.

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
import { useBranches } from '../use-branches.js'
import { useAuth } from '../auth.jsx'

function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  function w({ children }) { return createElement(QueryClientProvider, { client: qc }, children) }
  return w
}

describe('useBranches — calls client.me.branches.list() and returns data (BSTATE-02)', () => {
  test('returns AccessibleBranch[] from SDK response on success', async () => {
    const mockBranches = [
      { id: 'br-001', name: 'Downtown' },
      { id: 'br-002', name: 'Uptown' },
    ]
    const mockClient = {
      me: {
        branches: {
          list: vi.fn().mockResolvedValue({ data: mockBranches, error: null }),
        },
      },
    }

    useAuth.mockReturnValue({ client: mockClient })

    const { result } = renderHook(() => useBranches(), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(mockBranches)
    expect(mockClient.me.branches.list).toHaveBeenCalled()
  })

  test('throws into query error state when SDK returns { error }, not a bare try/catch', async () => {
    const mockClient = {
      me: {
        branches: {
          list: vi.fn().mockResolvedValue({ data: null, error: { error: 'Access revoked' } }),
        },
      },
    }

    useAuth.mockReturnValue({ client: mockClient })

    const { result } = renderHook(() => useBranches(), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error.message).toBe('Access revoked')
  })

  test('does not run when client is null (enabled: !!client, no branchId gate)', () => {
    useAuth.mockReturnValue({ client: null })

    const { result } = renderHook(() => useBranches(), { wrapper: makeWrapper() })
    // When enabled=false, status is 'pending' but fetchStatus is 'idle'
    expect(result.current.fetchStatus).toBe('idle')
  })

  test('has a finite staleTime (not Infinity) and refetchOnWindowFocus true', async () => {
    const mockClient = {
      me: {
        branches: {
          list: vi.fn().mockResolvedValue({ data: [{ id: 'br-001', name: 'Downtown' }], error: null }),
        },
      },
    }
    useAuth.mockReturnValue({ client: mockClient })

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    function w({ children }) { return createElement(QueryClientProvider, { client: qc }, children) }

    const { result } = renderHook(() => useBranches(), { wrapper: w })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    const cache = qc.getQueryCache().find({ queryKey: ['branches'] })
    const options = cache.options
    expect(typeof options.staleTime).toBe('number')
    expect(options.staleTime).not.toBe(Infinity)
    expect(options.staleTime).toBe(30_000)
    expect(options.refetchOnWindowFocus).toBe(true)
  })

  test('single-branch tenant (one-element list) passes through unchanged (edge/empty)', async () => {
    const mockClient = {
      me: {
        branches: {
          list: vi.fn().mockResolvedValue({ data: [{ id: 'br-001', name: 'Only Branch' }], error: null }),
        },
      },
    }
    useAuth.mockReturnValue({ client: mockClient })

    const { result } = renderHook(() => useBranches(), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toHaveLength(1)
  })

  test('empty accessible-branches list passes through unchanged (edge/empty)', async () => {
    const mockClient = {
      me: {
        branches: {
          list: vi.fn().mockResolvedValue({ data: [], error: null }),
        },
      },
    }
    useAuth.mockReturnValue({ client: mockClient })

    const { result } = renderHook(() => useBranches(), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toHaveLength(0)
  })
})
