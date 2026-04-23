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
