// Tests for auth error mapping — U3 (T-02-08: all signIn failures map to 'creds')
// Verifies the LoginScreen renders the 'creds' error message (not a raw API string)
// when error='creds' is passed.

vi.mock('@tauri-apps/plugin-store', () => ({ load: vi.fn() }))
vi.mock('@charlyk/admin-client', () => ({ signIn: vi.fn(), createAdminClient: vi.fn() }))
vi.mock('@tauri-apps/plugin-opener', () => ({ open: vi.fn(), openUrl: vi.fn() }))
vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }))

import { render, screen, renderHook, act, waitFor } from '@testing-library/react'
import { createElement } from 'react'
import { LoginScreen } from '../screen-login.jsx'
import { I18N } from '../i18n.jsx'
import { AuthProvider, useAuth } from '../auth.jsx'
import { useAppStore } from '../store.js'
import { createAdminClient, signIn as sdkSignIn } from '@charlyk/admin-client'
import { load } from '@tauri-apps/plugin-store'

// ── U3: Auth error type mapping (T-02-08) ──────────────────────────────────

describe('U3 — Auth error maps to creds type, not raw API message (T-02-08)', () => {
  test('when error is creds, LoginScreen shows the i18n creds error message (not a raw API string)', () => {
    render(
      <LoginScreen
        lang="en"
        onLangChange={vi.fn()}
        onSubmit={vi.fn()}
        onForgotPassword={vi.fn()}
        busy={false}
        error="creds"
      />
    )

    // The i18n message for 'creds' error in English
    const expectedMsg = I18N.en.login_err_creds // "Wrong email or password"
    expect(screen.getByText(expectedMsg)).toBeInTheDocument()

    // Ensure raw API-style strings are NOT present
    expect(screen.queryByText(/unauthorized/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/invalid credentials/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/401/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/403/i)).not.toBeInTheDocument()
  })

  test('when error is creds, both email and password fields get error styling', () => {
    render(
      <LoginScreen
        lang="en"
        onLangChange={vi.fn()}
        onSubmit={vi.fn()}
        onForgotPassword={vi.fn()}
        busy={false}
        error="creds"
      />
    )

    // Both field wrappers should have the "err" class when error='creds'
    const errFields = document.querySelectorAll('.field-input.err')
    expect(errFields.length).toBe(2) // email field + password field both get .err
  })

  test('when error is creds in Romanian, shows the Romanian error message', () => {
    render(
      <LoginScreen
        lang="ro"
        onLangChange={vi.fn()}
        onSubmit={vi.fn()}
        onForgotPassword={vi.fn()}
        busy={false}
        error="creds"
      />
    )

    const expectedMsg = I18N.ro.login_err_creds // "Email sau parolă greșită"
    expect(screen.getByText(expectedMsg)).toBeInTheDocument()
  })
})

// ── BERR-04: window-focus listener generalized to always revalidate (D-06/D-07) ───────────
// The `|| currentBranch` short-circuit is removed from the D-04 focus listener — every focus
// now calls getMe() and compares the server's selectedBranch to the local one, routing through
// adopt+toast / setNoBranchAccess(true) / no-op / expireSession depending on the result.

function focusWrapper({ children }) {
  return createElement(AuthProvider, null, children)
}

const FOCUS_BRANCH_A = { id: 'b1', name: 'Branch One', slug: 'b1', isDefault: true, isActive: true }
const FOCUS_BRANCH_B = { id: 'b2', name: 'Branch Two', slug: 'b2', isDefault: false, isActive: true }

function makeFocusMe(selectedBranch) {
  return {
    id: 'u1',
    firstName: 'Ana',
    lastName: 'Pop',
    email: 'ana@example.com',
    image: null,
    role: 'cashier',
    selectedBranch,
  }
}

describe('BERR-04 — window focus always revalidates the selected branch (D-06/D-07)', () => {
  let getMe

  beforeEach(() => {
    vi.clearAllMocks()
    // Configure the plugin-store mock BEFORE any useAppStore.setState call below — setState on a
    // persisted key (lang) synchronously kicks off zustand persist's async setItem->load() write,
    // so `load` must already resolve to a valid store object to avoid an unhandled rejection.
    load.mockResolvedValue({
      get: vi.fn().mockResolvedValue(null),
      set: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
    })
    useAppStore.setState({
      isAuthenticated: false,
      authUser: null,
      currentBranch: null,
      toasts: [],
      noBranchAccess: false,
      lang: 'en',
    })
  })

  // Signs in via the existing AuthProvider flow so isAuthenticated/currentBranch/client are all
  // set exactly as they would be in production, then clears the getMe mock's call count so
  // subsequent assertions only count focus-triggered calls.
  async function signInWithBranch(branch) {
    sdkSignIn.mockResolvedValue({ token: 'tok-focus', user: { id: 1, name: 'Focus' } })
    getMe = vi.fn().mockResolvedValue(makeFocusMe(branch))
    createAdminClient.mockReturnValue({
      auth: { getSession: vi.fn().mockResolvedValue({ session: null }), getMe },
    })

    const { result } = renderHook(() => useAuth(), { wrapper: focusWrapper })
    await waitFor(() => expect(result.current.coldStartBusy).toBe(false))

    await act(async () => {
      await result.current.signIn('user@example.com', 'password', false)
    })

    expect(useAppStore.getState().currentBranch).toEqual(branch)
    getMe.mockClear()
    return { result }
  }

  test('focus with a different-but-valid server branch adopts it and pushes a neutral "Now showing" toast', async () => {
    await signInWithBranch(FOCUS_BRANCH_A)
    getMe.mockResolvedValue(makeFocusMe(FOCUS_BRANCH_B))

    await act(async () => {
      window.dispatchEvent(new Event('focus'))
      await Promise.resolve()
      await Promise.resolve()
    })

    await waitFor(() => expect(useAppStore.getState().currentBranch).toEqual(FOCUS_BRANCH_B))
    expect(getMe).toHaveBeenCalledTimes(1)
    const toasts = useAppStore.getState().toasts
    expect(toasts).toHaveLength(1)
    expect(toasts[0].title).toBe('Branch updated')
    expect(toasts[0].detail).toBe('Now showing Branch Two')
  })

  test('focus with the same server branch id is a no-op — no setCurrentBranch, no toast, no block', async () => {
    await signInWithBranch(FOCUS_BRANCH_A)
    getMe.mockResolvedValue(makeFocusMe(FOCUS_BRANCH_A))

    await act(async () => {
      window.dispatchEvent(new Event('focus'))
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(getMe).toHaveBeenCalledTimes(1)
    expect(useAppStore.getState().currentBranch).toEqual(FOCUS_BRANCH_A)
    expect(useAppStore.getState().toasts).toHaveLength(0)
    expect(useAppStore.getState().noBranchAccess).toBe(false)
  })

  test('focus with selectedBranch===null routes to setNoBranchAccess(true) and does not adopt a branch', async () => {
    await signInWithBranch(FOCUS_BRANCH_A)
    getMe.mockResolvedValue(makeFocusMe(null))

    await act(async () => {
      window.dispatchEvent(new Event('focus'))
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(getMe).toHaveBeenCalledTimes(1)
    await waitFor(() => expect(useAppStore.getState().noBranchAccess).toBe(true))
    expect(useAppStore.getState().currentBranch).toEqual(FOCUS_BRANCH_A) // unchanged — no adoption
    expect(useAppStore.getState().toasts).toHaveLength(0)
  })

  test('focus with a thrown 403 (A3 defensive path) also routes to setNoBranchAccess(true)', async () => {
    await signInWithBranch(FOCUS_BRANCH_A)
    getMe.mockRejectedValue({ status: 403 })

    await act(async () => {
      window.dispatchEvent(new Event('focus'))
      await Promise.resolve()
      await Promise.resolve()
    })

    await waitFor(() => expect(useAppStore.getState().noBranchAccess).toBe(true))
    expect(useAppStore.getState().toasts).toHaveLength(0)
  })

  test('focus with a thrown 401 calls expireSession (session ends)', async () => {
    await signInWithBranch(FOCUS_BRANCH_A)
    getMe.mockRejectedValue({ status: 401 })

    await act(async () => {
      window.dispatchEvent(new Event('focus'))
      await Promise.resolve()
      await Promise.resolve()
    })

    await waitFor(() => expect(useAppStore.getState().isAuthenticated).toBe(false))
    expect(useAppStore.getState().currentBranch).toBe(null)
  })

  test('focus with a non-401/non-403 thrown error is swallowed silently — no block, no toast, no expire', async () => {
    await signInWithBranch(FOCUS_BRANCH_A)
    getMe.mockRejectedValue(new Error('network drop'))

    await act(async () => {
      window.dispatchEvent(new Event('focus'))
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(getMe).toHaveBeenCalledTimes(1)
    expect(useAppStore.getState().isAuthenticated).toBe(true)
    expect(useAppStore.getState().noBranchAccess).toBe(false)
    expect(useAppStore.getState().toasts).toHaveLength(0)
    expect(useAppStore.getState().currentBranch).toEqual(FOCUS_BRANCH_A)
  })

  test('two focus events fired before the first getMe() resolves result in a single getMe() call (reentrancy guard)', async () => {
    await signInWithBranch(FOCUS_BRANCH_A)
    let resolveGetMe
    getMe.mockReturnValue(new Promise((resolve) => { resolveGetMe = resolve }))

    await act(async () => {
      window.dispatchEvent(new Event('focus'))
      window.dispatchEvent(new Event('focus'))
      await Promise.resolve()
    })

    expect(getMe).toHaveBeenCalledTimes(1)

    await act(async () => {
      resolveGetMe(makeFocusMe(FOCUS_BRANCH_B))
      await Promise.resolve()
      await Promise.resolve()
    })

    await waitFor(() => expect(useAppStore.getState().currentBranch).toEqual(FOCUS_BRANCH_B))
    expect(getMe).toHaveBeenCalledTimes(1)
    expect(useAppStore.getState().toasts).toHaveLength(1)
  })

  test('a single-branch tenant returning the same branch every focus never trips the block or a spurious toast', async () => {
    await signInWithBranch(FOCUS_BRANCH_A)
    getMe.mockResolvedValue(makeFocusMe(FOCUS_BRANCH_A))

    for (let i = 0; i < 3; i++) {
      await act(async () => {
        window.dispatchEvent(new Event('focus'))
        await Promise.resolve()
        await Promise.resolve()
      })
    }

    expect(getMe).toHaveBeenCalledTimes(3)
    expect(useAppStore.getState().noBranchAccess).toBe(false)
    expect(useAppStore.getState().toasts).toHaveLength(0)
    expect(useAppStore.getState().currentBranch).toEqual(FOCUS_BRANCH_A)
  })

  // ── CR-02/WR-01 (17-REVIEW.md): noBranchAccess/branchSwitcherForceOpen must not leak across
  // a sign-out/session-expiry -> next-login cycle on the same running app (shared POS terminal).
  test('expireSession (triggered by a focus-time 401) resets noBranchAccess AND branchSwitcherForceOpen to false', async () => {
    await signInWithBranch(FOCUS_BRANCH_A)
    // Simulate a previous branch-access block still latched from earlier in this session.
    useAppStore.setState({ noBranchAccess: true, branchSwitcherForceOpen: true })
    getMe.mockRejectedValue({ status: 401 })

    await act(async () => {
      window.dispatchEvent(new Event('focus'))
      await Promise.resolve()
      await Promise.resolve()
    })

    await waitFor(() => expect(useAppStore.getState().isAuthenticated).toBe(false))
    expect(useAppStore.getState().noBranchAccess).toBe(false)
    expect(useAppStore.getState().branchSwitcherForceOpen).toBe(false)
  })
})

describe('CR-02/WR-01 — signOut() resets noBranchAccess AND branchSwitcherForceOpen (shared-terminal leak fix)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    load.mockResolvedValue({
      get: vi.fn().mockResolvedValue(null),
      set: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
    })
    useAppStore.setState({
      isAuthenticated: false,
      authUser: null,
      currentBranch: null,
      toasts: [],
      noBranchAccess: false,
      branchSwitcherForceOpen: false,
      lang: 'en',
    })
  })

  test('signOut() resets both flags to false even when a previous NO_BRANCH_ACCESS/reopen was latched', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper: focusWrapper })
    await waitFor(() => expect(result.current.coldStartBusy).toBe(false))

    // Simulate staff member A hitting a branch-access block before signing out.
    useAppStore.setState({ noBranchAccess: true, branchSwitcherForceOpen: true })

    await act(async () => {
      await result.current.signOut()
    })

    expect(useAppStore.getState().noBranchAccess).toBe(false)
    expect(useAppStore.getState().branchSwitcherForceOpen).toBe(false)
  })
})
