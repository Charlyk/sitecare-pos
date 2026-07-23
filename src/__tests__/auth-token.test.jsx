// Tests for token field in AuthProvider context — U10 (KDS-01 / D-07)
// Verifies that useAuth() exposes a token string so useSSE can build Bearer headers.
// RED: these tests fail until auth.jsx adds token state to context value.

vi.mock('@tauri-apps/plugin-store', () => ({
  load: vi.fn().mockResolvedValue({
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(undefined),
  }),
}))
vi.mock('@charlyk/admin-client', () => ({
  signIn: vi.fn(),
  createAdminClient: vi.fn(),
}))
vi.mock('@tauri-apps/plugin-opener', () => ({ open: vi.fn(), openUrl: vi.fn() }))
vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }))

import { renderHook, act, waitFor } from '@testing-library/react'
import { createElement } from 'react'
import { AuthProvider, useAuth } from '../auth.jsx'
import { useAppStore } from '../store.js'
import { createAdminClient, signIn as sdkSignIn } from '@charlyk/admin-client'
import { load } from '@tauri-apps/plugin-store'

function wrapper({ children }) {
  return createElement(AuthProvider, null, children)
}

// ── U10a: token is present in context value (D-07) ────────────────────────

describe('U10a — useAuth() returns token field (D-07)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useAppStore.setState({ isAuthenticated: false, authUser: null })
  })

  test('useAuth() returns an object containing a token key', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper })
    await waitFor(() => expect(result.current.coldStartBusy).toBe(false))
    expect(result.current).toHaveProperty('token')
  })

  test('token is null before authentication (cold start with no stored token)', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper })
    await waitFor(() => expect(result.current.coldStartBusy).toBe(false))
    expect(result.current.token).toBeNull()
  })

  test('token is null after signOut', async () => {
    // Set up mock store with a stored token so cold-start restores it
    load.mockResolvedValue({
      get: vi.fn().mockResolvedValue('test-session-token-abc'),
      set: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
    })
    createAdminClient.mockReturnValue({
      auth: { getSession: vi.fn().mockResolvedValue({ session: null }) },
    })

    const { result } = renderHook(() => useAuth(), { wrapper })
    await waitFor(() => expect(result.current.coldStartBusy).toBe(false))

    // signOut should clear token
    await act(async () => { await result.current.signOut() })
    expect(result.current.token).toBeNull()
  })
})

// ── U10b: token set on signIn (D-07) ──────────────────────────────────────

describe('U10b — token set to session token after signIn (D-07)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useAppStore.setState({ isAuthenticated: false, authUser: null })
    load.mockResolvedValue({
      get: vi.fn().mockResolvedValue(null),
      set: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
    })
  })

  test('token matches the session token string after signIn', async () => {
    const fakeToken = 'bearer-token-xyz-123'
    sdkSignIn.mockResolvedValue({ token: fakeToken, user: { id: 1, name: 'Test' } })
    createAdminClient.mockReturnValue({
      auth: { getSession: vi.fn().mockResolvedValue({ session: null }) },
    })

    const { result } = renderHook(() => useAuth(), { wrapper })
    await waitFor(() => expect(result.current.coldStartBusy).toBe(false))

    await act(async () => {
      await result.current.signIn('user@example.com', 'password', false)
    })

    expect(result.current.token).toBe(fakeToken)
  })
})

// ── BSTATE-01: getMe() seeding at cold-start + signIn seams, D-04 focus-retry ──

const FAKE_ME = {
  id: 'u1',
  firstName: 'Ana',
  lastName: 'Pop',
  email: 'ana@example.com',
  image: null,
  role: 'cashier',
  selectedBranch: { id: 'b1', name: 'Branch One', slug: 'b1', isDefault: true, isActive: true },
}

// NOTE: auth.jsx caches its plugin-store handle in a module-level `_store` variable that is
// populated on the FIRST call to getStore() and never re-fetched. Because this test file's
// earlier describes (U10a/U10b) already trigger a cold-start readToken() call against the
// shared module instance, later `load.mockResolvedValue(...)` overrides would have no effect
// on cold-start token restoration without full module isolation. Each test below uses
// vi.resetModules() + a dynamic re-import so it gets a fresh `auth.jsx`/store module instance
// (and therefore a fresh, uncached `_store`) that actually observes this test's own token mock.
describe('BSTATE-01 — cold-start getMe() seeding (D-03, D-05, D-07)', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  async function freshAuthModules() {
    const { load: freshLoad } = await import('@tauri-apps/plugin-store')
    const { createAdminClient: freshCreateAdminClient } = await import('@charlyk/admin-client')
    const { useAppStore: freshUseAppStore } = await import('../store.js')
    const { AuthProvider: FreshAuthProvider, useAuth: freshUseAuth } = await import('../auth.jsx')
    function freshWrapper({ children }) {
      return createElement(FreshAuthProvider, null, children)
    }
    return { freshLoad, freshCreateAdminClient, freshUseAppStore, freshUseAuth, freshWrapper }
  }

  test('cold-start with a stored token and getMe() resolving seeds authUser + currentBranch before coldStartBusy becomes false', async () => {
    const { freshLoad, freshCreateAdminClient, freshUseAppStore, freshUseAuth, freshWrapper } = await freshAuthModules()
    freshLoad.mockResolvedValue({
      get: vi.fn().mockResolvedValue('stored-token'),
      set: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
    })
    const getMe = vi.fn().mockResolvedValue(FAKE_ME)
    freshCreateAdminClient.mockReturnValue({
      auth: { getSession: vi.fn().mockResolvedValue({ session: null }), getMe },
    })

    const { result } = renderHook(() => freshUseAuth(), { wrapper: freshWrapper })
    await waitFor(() => expect(result.current.coldStartBusy).toBe(false))

    expect(getMe).toHaveBeenCalled()
    expect(freshUseAppStore.getState().authUser).toEqual(FAKE_ME)
    expect(freshUseAppStore.getState().currentBranch).toEqual(FAKE_ME.selectedBranch)
  })

  test('cold-start getMe() rejecting with .status 401 calls expireSession (isAuthenticated false); currentBranch stays null', async () => {
    const { freshLoad, freshCreateAdminClient, freshUseAppStore, freshUseAuth, freshWrapper } = await freshAuthModules()
    freshLoad.mockResolvedValue({
      get: vi.fn().mockResolvedValue('stored-token'),
      set: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
    })
    const getMe = vi.fn().mockRejectedValue({ status: 401 })
    freshCreateAdminClient.mockReturnValue({
      auth: { getSession: vi.fn().mockResolvedValue({ session: null }), getMe },
    })

    const { result } = renderHook(() => freshUseAuth(), { wrapper: freshWrapper })
    await waitFor(() => expect(result.current.coldStartBusy).toBe(false))
    await waitFor(() => expect(freshUseAppStore.getState().isAuthenticated).toBe(false))

    expect(freshUseAppStore.getState().currentBranch).toBe(null)
  })

  test('cold-start getMe() rejecting with a non-401 error stays signed in, currentBranch stays null, coldStartBusy still releases', async () => {
    const { freshLoad, freshCreateAdminClient, freshUseAppStore, freshUseAuth, freshWrapper } = await freshAuthModules()
    freshLoad.mockResolvedValue({
      get: vi.fn().mockResolvedValue('stored-token'),
      set: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
    })
    const getMe = vi.fn().mockRejectedValue({ status: 500 })
    freshCreateAdminClient.mockReturnValue({
      auth: { getSession: vi.fn().mockResolvedValue({ session: null }), getMe },
    })

    const { result } = renderHook(() => freshUseAuth(), { wrapper: freshWrapper })
    await waitFor(() => expect(result.current.coldStartBusy).toBe(false))

    expect(freshUseAppStore.getState().isAuthenticated).toBe(true)
    expect(freshUseAppStore.getState().currentBranch).toBe(null)
  })
})

describe('BSTATE-01 — signIn() getMe() seeding (D-07)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useAppStore.setState({ isAuthenticated: false, authUser: null, currentBranch: null, screen: 'orders' })
    load.mockResolvedValue({
      get: vi.fn().mockResolvedValue(null),
      set: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
    })
  })

  test('signIn() success with getMe() resolving seeds currentBranch from me.selectedBranch', async () => {
    sdkSignIn.mockResolvedValue({ token: 'tok-1', user: { id: 1, name: 'Optimistic' } })
    const getMe = vi.fn().mockResolvedValue(FAKE_ME)
    createAdminClient.mockReturnValue({
      auth: { getSession: vi.fn().mockResolvedValue({ session: null }), getMe },
    })

    const { result } = renderHook(() => useAuth(), { wrapper })
    await waitFor(() => expect(result.current.coldStartBusy).toBe(false))

    await act(async () => {
      await result.current.signIn('user@example.com', 'password', false)
    })

    expect(useAppStore.getState().currentBranch).toEqual(FAKE_ME.selectedBranch)
  })

  test('a getMe() rejection right after a successful signIn() is non-fatal — still signed in, currentBranch null, screen set to orders', async () => {
    sdkSignIn.mockResolvedValue({ token: 'tok-2', user: { id: 2, name: 'Optimistic2' } })
    const getMe = vi.fn().mockRejectedValue(new Error('boom'))
    createAdminClient.mockReturnValue({
      auth: { getSession: vi.fn().mockResolvedValue({ session: null }), getMe },
    })

    const { result } = renderHook(() => useAuth(), { wrapper })
    await waitFor(() => expect(result.current.coldStartBusy).toBe(false))

    await act(async () => {
      await result.current.signIn('user@example.com', 'password', false)
    })

    expect(useAppStore.getState().isAuthenticated).toBe(true)
    expect(useAppStore.getState().currentBranch).toBe(null)
    expect(useAppStore.getState().screen).toBe('orders')
  })
})

describe('BSTATE-01 — D-04 window focus-retry backstop', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useAppStore.setState({ isAuthenticated: false, authUser: null, currentBranch: null })
    load.mockResolvedValue({
      get: vi.fn().mockResolvedValue(null),
      set: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
    })
  })

  test('firing window focus while isAuthenticated && currentBranch===null re-calls getMe() and seeds currentBranch', async () => {
    sdkSignIn.mockResolvedValue({ token: 'tok-3', user: { id: 3, name: 'Focus' } })
    const getMe = vi.fn().mockRejectedValueOnce(new Error('first fails')).mockResolvedValue(FAKE_ME)
    createAdminClient.mockReturnValue({
      auth: { getSession: vi.fn().mockResolvedValue({ session: null }), getMe },
    })

    const { result } = renderHook(() => useAuth(), { wrapper })
    await waitFor(() => expect(result.current.coldStartBusy).toBe(false))

    await act(async () => {
      await result.current.signIn('user@example.com', 'password', false)
    })

    // signIn's own getMe() call failed (mockRejectedValueOnce) — currentBranch still null
    expect(useAppStore.getState().currentBranch).toBe(null)
    expect(getMe).toHaveBeenCalledTimes(1)

    await act(async () => {
      window.dispatchEvent(new Event('focus'))
      await Promise.resolve()
      await Promise.resolve()
    })

    await waitFor(() => expect(useAppStore.getState().currentBranch).toEqual(FAKE_ME.selectedBranch))
    expect(getMe).toHaveBeenCalledTimes(2)
  })

  // Phase 17, plan 06 (BERR-04/D-07) generalized this listener to ALWAYS revalidate on focus —
  // the `|| currentBranch` short-circuit that made this backstop a no-op once a branch was set
  // is removed. This test's title/expectation is updated accordingly: focus now calls getMe()
  // again even with a branch already set, but since the server returns the same branch it's a
  // no-op in terms of state (see src/__tests__/auth.test.jsx's BERR-04 describe block for the
  // full adopt+toast/block/no-op/expire coverage of the generalized listener).
  test('firing window focus when currentBranch is already set now revalidates via getMe() again (BERR-04) — same branch stays a no-op', async () => {
    sdkSignIn.mockResolvedValue({ token: 'tok-4', user: { id: 4, name: 'Focus2' } })
    const getMe = vi.fn().mockResolvedValue(FAKE_ME)
    createAdminClient.mockReturnValue({
      auth: { getSession: vi.fn().mockResolvedValue({ session: null }), getMe },
    })

    const { result } = renderHook(() => useAuth(), { wrapper })
    await waitFor(() => expect(result.current.coldStartBusy).toBe(false))

    await act(async () => {
      await result.current.signIn('user@example.com', 'password', false)
    })

    expect(useAppStore.getState().currentBranch).toEqual(FAKE_ME.selectedBranch)
    expect(getMe).toHaveBeenCalledTimes(1)

    await act(async () => {
      window.dispatchEvent(new Event('focus'))
      await Promise.resolve()
      await Promise.resolve()
    })

    await waitFor(() => expect(getMe).toHaveBeenCalledTimes(2))
    // Server returned the same branch — a no-op: currentBranch is unchanged.
    expect(useAppStore.getState().currentBranch).toEqual(FAKE_ME.selectedBranch)
  })
})
