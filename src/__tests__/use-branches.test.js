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
import { QueryClient, QueryClientProvider, QueryCache, useQuery } from '@tanstack/react-query'
import { createElement } from 'react'
import { useBranches, useBranchSwitch, handleBranchError, BRANCH_CODES } from '../use-branches.js'
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

  // WR-02 (17-REVIEW.md): the queryFn must route through the same unwrapSdkResult convention
  // every sibling branch-scoped hook uses, so a branches-list 403 carries a matchable err.code
  // into handleBranchError's central choke point instead of surfacing as a plain, code-less Error.
  test('WR-02: a SDK { error } result populates err.code (matches the unwrapSdkResult convention used by every sibling hook)', async () => {
    const mockClient = {
      me: {
        branches: {
          list: vi.fn().mockResolvedValue({ data: null, error: { error: 'BRANCH_ACCESS_REVOKED' } }),
        },
      },
    }

    useAuth.mockReturnValue({ client: mockClient })

    const { result } = renderHook(() => useBranches(), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error.code).toBe('BRANCH_ACCESS_REVOKED')
  })

  test('WR-02: a branches-list BRANCH_* 403 reaches handleBranchError via QueryCache onError (central choke point, not bypassed)', async () => {
    const mockClient = {
      me: {
        branches: {
          list: vi.fn().mockResolvedValue({ data: null, error: { error: 'NO_BRANCH_ACCESS' } }),
        },
      },
    }
    useAuth.mockReturnValue({ client: mockClient })

    const qc = new QueryClient({
      queryCache: new QueryCache({ onError: (err) => handleBranchError(err, qc) }),
      defaultOptions: { queries: { retry: false } },
    })
    function w({ children }) { return createElement(QueryClientProvider, { client: qc }, children) }

    useAppStore.setState({ noBranchAccess: false })

    const { result } = renderHook(() => useBranches(), { wrapper: w })
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(useAppStore.getState().noBranchAccess).toBe(true)
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

// ── handleBranchError — central branch-403 recovery dispatch (BERR-01, 17-01 tracer) ──

describe('handleBranchError — central branch-403 recovery dispatch (BERR-01)', () => {
  beforeEach(() => {
    useAppStore.setState({ toasts: [], branchSwitcherForceOpen: false, currentBranch: null, lang: 'ro' })
  })

  test('BRANCH_ACCESS_REVOKED pushes exactly one toast, sets branchSwitcherForceOpen true, and invalidates ["branches"]', () => {
    const invalidateQueries = vi.fn()
    const queryClient = { invalidateQueries }

    handleBranchError({ code: 'BRANCH_ACCESS_REVOKED' }, queryClient)

    const state = useAppStore.getState()
    expect(state.toasts).toHaveLength(1)
    expect(state.toasts[0].title).toBe('Acces revocat')
    expect(state.branchSwitcherForceOpen).toBe(true)
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['branches'] })
  })

  test('a non-branch error code is a no-op — no toast, no reopen, no invalidation (guard-first early-return)', () => {
    const invalidateQueries = vi.fn()
    const queryClient = { invalidateQueries }

    handleBranchError({ code: 'SOME_OTHER_ERROR' }, queryClient)

    const state = useAppStore.getState()
    expect(state.toasts).toHaveLength(0)
    expect(state.branchSwitcherForceOpen).toBe(false)
    expect(invalidateQueries).not.toHaveBeenCalled()
  })

  test('interpolates err.branchName into the detail line when present, never a literal "<branch>"', () => {
    const queryClient = { invalidateQueries: vi.fn() }

    handleBranchError({ code: 'BRANCH_ACCESS_REVOKED', branchName: 'Centru' }, queryClient)

    const detail = useAppStore.getState().toasts[0].detail
    expect(detail).toContain('Centru')
    expect(detail).not.toContain('<branch>')
  })

  test('falls back to currentBranch?.name when err.branchName is absent', () => {
    useAppStore.setState({ currentBranch: { id: 'b1', name: 'Filiala Nord' } })
    const queryClient = { invalidateQueries: vi.fn() }

    handleBranchError({ code: 'BRANCH_ACCESS_REVOKED' }, queryClient)

    const detail = useAppStore.getState().toasts[0].detail
    expect(detail).toContain('Filiala Nord')
    expect(detail).not.toContain('<branch>')
  })

  test('falls back to the generic fallback copy when neither err.branchName nor currentBranch exist — never a literal "<branch>" or empty gap', () => {
    const queryClient = { invalidateQueries: vi.fn() }

    handleBranchError({ code: 'BRANCH_ACCESS_REVOKED' }, queryClient)

    const detail = useAppStore.getState().toasts[0].detail
    expect(detail).not.toContain('<branch>')
    expect(detail).not.toMatch(/\s{2,}/)
    expect(detail.length).toBeGreaterThan(0)
  })

  test('BRANCH_INACTIVE pushes exactly one toast with the DISTINCT inactive title (not the revoked title), sets branchSwitcherForceOpen true, and invalidates ["branches"]', () => {
    const invalidateQueries = vi.fn()
    const queryClient = { invalidateQueries }

    handleBranchError({ code: 'BRANCH_INACTIVE' }, queryClient)

    const state = useAppStore.getState()
    expect(state.toasts).toHaveLength(1)
    expect(state.toasts[0].title).toBe('Filială inactivă')
    expect(state.toasts[0].title).not.toBe('Acces revocat')
    expect(state.branchSwitcherForceOpen).toBe(true)
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['branches'] })
  })

  test('BRANCH_INACTIVE interpolates <branch> the same way as BRANCH_ACCESS_REVOKED (err.branchName -> currentBranch?.name -> generic fallback)', () => {
    const queryClient = { invalidateQueries: vi.fn() }

    handleBranchError({ code: 'BRANCH_INACTIVE', branchName: 'Centru' }, queryClient)

    const detail = useAppStore.getState().toasts[0].detail
    expect(detail).toContain('Centru')
    expect(detail).not.toContain('<branch>')
  })

  test('NO_BRANCH_ACCESS calls setNoBranchAccess(true), pushes NO toast, and does NOT set branchSwitcherForceOpen', () => {
    const invalidateQueries = vi.fn()
    const queryClient = { invalidateQueries }

    handleBranchError({ code: 'NO_BRANCH_ACCESS' }, queryClient)

    const state = useAppStore.getState()
    expect(state.noBranchAccess).toBe(true)
    expect(state.toasts).toHaveLength(0)
    expect(state.branchSwitcherForceOpen).toBe(false)
    expect(invalidateQueries).not.toHaveBeenCalled()
  })

  test('BRANCH_INACTIVE and BRANCH_ACCESS_REVOKED both reach the same reopen+refetch behavior but with different copy', () => {
    const qc1 = { invalidateQueries: vi.fn() }
    handleBranchError({ code: 'BRANCH_INACTIVE' }, qc1)
    const inactiveState = useAppStore.getState()
    expect(inactiveState.branchSwitcherForceOpen).toBe(true)
    expect(qc1.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['branches'] })
    const inactiveTitle = inactiveState.toasts[0].title

    useAppStore.setState({ toasts: [], branchSwitcherForceOpen: false })

    const qc2 = { invalidateQueries: vi.fn() }
    handleBranchError({ code: 'BRANCH_ACCESS_REVOKED' }, qc2)
    const revokedState = useAppStore.getState()
    expect(revokedState.branchSwitcherForceOpen).toBe(true)
    expect(qc2.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['branches'] })
    const revokedTitle = revokedState.toasts[0].title

    expect(inactiveTitle).not.toBe(revokedTitle)
  })

  test('BRANCH_CODES exports the three literal branch-access codes', () => {
    expect(BRANCH_CODES).toEqual(
      expect.arrayContaining(['BRANCH_INACTIVE', 'BRANCH_ACCESS_REVOKED', 'NO_BRANCH_ACCESS'])
    )
  })

  test('a QueryCache constructed with onError:(e)=>handleBranchError(e,qc) invokes the dispatch when a query rejects with a BRANCH_ACCESS_REVOKED error', async () => {
    const qc = new QueryClient({
      queryCache: new QueryCache({ onError: (err) => handleBranchError(err, qc) }),
      defaultOptions: { queries: { retry: false } },
    })
    function w({ children }) { return createElement(QueryClientProvider, { client: qc }, children) }

    const { result } = renderHook(
      () => useQuery({
        queryKey: ['test-branch-revoked-query'],
        queryFn: async () => {
          const err = new Error('BRANCH_ACCESS_REVOKED')
          err.code = 'BRANCH_ACCESS_REVOKED'
          throw err
        },
      }),
      { wrapper: w }
    )

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(useAppStore.getState().toasts).toHaveLength(1)
    expect(useAppStore.getState().branchSwitcherForceOpen).toBe(true)
  })

  // [PROVISIONAL/UNVERIFIED — 17-02] Live-API capture of the real 403 body was infeasible during
  // execution (no accessible test tenant with a deactivable/revocable branch). This test locks the
  // CURRENTLY ASSUMED contract only — that the REST 403 envelope is { error: '<LITERAL_CODE>' } and
  // that the literal code string round-trips through useBranchSwitch's err.code extraction unchanged
  // — so that a future drift (a real body that doesn't match this assumption) breaks this test rather
  // than silently no-opping in production. See 17-02-SUMMARY.md "Known Stubs" / decision log for the
  // flagged risk. Plan 17-05 must re-confirm the real REST + SSE shapes against a live API and correct
  // this test (and the matcher) if they differ — this is NOT a verified runtime observation.
  test('[PROVISIONAL] err.code extraction from the assumed REST 403 body { error: "BRANCH_ACCESS_REVOKED" } yields the exact literal code, and handleBranchError dispatches on it', async () => {
    const mockSwitch = vi.fn().mockResolvedValue({ data: null, error: { error: 'BRANCH_ACCESS_REVOKED' } })
    const mockClient = { me: { branches: { switch: mockSwitch } } }
    useAuth.mockReturnValue({ client: mockClient })

    const { result } = renderHook(() => useBranchSwitch(), { wrapper: makeWrapper() })
    const branch = { id: 'br-002', name: 'Uptown', isDefault: false, isActive: true }

    let caughtErr
    await act(async () => {
      try {
        await result.current.mutateAsync(branch)
      } catch (e) {
        caughtErr = e
      }
    })

    // Locks the ASSUMED extraction contract: err.code must equal the exact literal string from the
    // assumed { error: '<LITERAL_CODE>' } envelope, not a wrapped object or human-readable sentence.
    expect(caughtErr).toBeDefined()
    expect(caughtErr.code).toBe('BRANCH_ACCESS_REVOKED')

    const queryClient = { invalidateQueries: vi.fn() }
    handleBranchError(caughtErr, queryClient)

    const state = useAppStore.getState()
    expect(state.toasts).toHaveLength(1)
    expect(state.branchSwitcherForceOpen).toBe(true)
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['branches'] })
  })
})
