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

import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement } from 'react'
import { useBranches, useBranchSwitch } from '../use-branches.js'
import { useAuth } from '../auth.jsx'
import { useAppStore } from '../store.js'

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

// ── useBranchSwitch — non-optimistic branch switch (SWCH-03) ──────────────

describe('useBranchSwitch — non-optimistic branch switch (SWCH-03)', () => {
  beforeEach(() => {
    useAppStore.setState({ currentBranch: { id: 'br-001', name: 'Downtown', isDefault: true, isActive: true } })
  })

  test('calling .mutate(branch) invokes client.me.branches.switch with { body: { branchId } }', async () => {
    const mockSwitch = vi.fn().mockResolvedValue({ data: { ok: true, branchId: 'br-002' }, error: null })
    const mockClient = { me: { branches: { switch: mockSwitch } } }
    useAuth.mockReturnValue({ client: mockClient })

    const { result } = renderHook(() => useBranchSwitch(), { wrapper: makeWrapper() })
    const branch = { id: 'br-002', name: 'Uptown', isDefault: false, isActive: true }

    await act(async () => {
      await result.current.mutateAsync(branch)
    })

    expect(mockSwitch).toHaveBeenCalledWith({ body: { branchId: 'br-002' } })
  })

  test('setCurrentBranch is NOT called synchronously at .mutate() time — only after success resolves (D-05)', async () => {
    let resolveSwitch
    const mockSwitch = vi.fn(() => new Promise((resolve) => { resolveSwitch = resolve }))
    const mockClient = { me: { branches: { switch: mockSwitch } } }
    useAuth.mockReturnValue({ client: mockClient })

    const { result } = renderHook(() => useBranchSwitch(), { wrapper: makeWrapper() })
    const branch = { id: 'br-002', name: 'Uptown', isDefault: false, isActive: true }

    act(() => {
      result.current.mutate(branch)
    })

    // Flush microtasks so the mutationFn's async body actually starts and invokes mockSwitch
    // (TanStack v5's mutate() dispatches execution on a microtask, not fully synchronously).
    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
    })
    expect(mockSwitch).toHaveBeenCalled()

    // Still pending — the non-optimistic guarantee: currentBranch has NOT moved yet.
    expect(useAppStore.getState().currentBranch?.id).toBe('br-001')

    await act(async () => {
      resolveSwitch({ data: { ok: true, branchId: 'br-002' }, error: null })
    })

    await waitFor(() => expect(useAppStore.getState().currentBranch?.id).toBe('br-002'))
  })

  test('on a mocked { error } result, the mutation rejects and setCurrentBranch is never called (D-11/SC3)', async () => {
    const mockSwitch = vi.fn().mockResolvedValue({ data: null, error: { error: 'Branch not accessible' } })
    const mockClient = { me: { branches: { switch: mockSwitch } } }
    useAuth.mockReturnValue({ client: mockClient })

    const { result } = renderHook(() => useBranchSwitch(), { wrapper: makeWrapper() })
    const branch = { id: 'br-002', name: 'Uptown', isDefault: false, isActive: true }

    await act(async () => {
      await expect(result.current.mutateAsync(branch)).rejects.toThrow('Branch not accessible')
    })

    // Old branch untouched — nothing else changed.
    expect(useAppStore.getState().currentBranch?.id).toBe('br-001')
  })
})
