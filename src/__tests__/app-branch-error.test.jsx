// NO_BRANCH_ACCESS top-level block gate (Phase 17, plan 04 — BERR-03, D-01/D-02).
// Proves: the block supersedes <Shell> entirely while noBranchAccess is true; Retry clears the
// flag ONLY on a confirmed non-null selectedBranch (never optimistically); a null-result or
// thrown Retry leaves the block up unchanged with no extra toast; noBranchAccess false renders
// the normal Shell path. Mirrors app-branch-switch.test.jsx's full-App render + mock pattern.

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
vi.mock('@tauri-apps/plugin-process', () => ({ relaunch: vi.fn() }))

vi.mock('../auth.jsx', () => ({
  AuthProvider: ({ children }) => children,
  useAuth: vi.fn(),
}))

vi.mock('../use-orders.js', () => ({ useOrders: () => ({ data: { orders: [] } }) }))
vi.mock('../use-order-detail.js', () => ({ useOrderDetail: () => ({ data: undefined, isPending: false, isError: false, refetch: vi.fn() }) }))
vi.mock('../use-stats.js', () => ({ useStats: () => ({ data: undefined }) }))
vi.mock('../use-restaurant-settings.js', () => ({ useRestaurantSettings: () => ({ data: undefined }) }))
vi.mock('../use-delivery-areas.js', () => ({ useDeliveryAreas: () => ({ data: [] }) }))
vi.mock('../use-order-actions.js', () => ({
  useOrderActions: () => ({ updateStatus: { mutate: vi.fn(), isPending: false } }),
}))
vi.mock('../use-updater.js', () => ({ useUpdater: () => {} }))

vi.mock('../use-sse.js', () => ({ useSSE: () => ({ isConnected: true }) }))

const branchSwitchMutate = vi.hoisted(() => vi.fn())
vi.mock('../use-branches.js', () => ({
  useBranches: () => ({
    data: [{ id: 'br-001', name: 'Downtown', isDefault: true, isActive: true }],
  }),
  useBranchSwitch: () => ({ mutate: branchSwitchMutate, isPending: false }),
  BRANCH_CODES: ['BRANCH_INACTIVE', 'BRANCH_ACCESS_REVOKED', 'NO_BRANCH_ACCESS'],
}))

import { render, screen, fireEvent, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useAuth } from '../auth.jsx'
import { useAppStore } from '../store.js'
import App from '../app.jsx'

function renderApp() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <App />
    </QueryClientProvider>
  )
}

describe('app-branch-error — NO_BRANCH_ACCESS top-level gate (BERR-03, D-01/D-02)', () => {
  let getMe

  beforeEach(() => {
    branchSwitchMutate.mockReset()
    getMe = vi.fn()

    useAuth.mockReturnValue({
      signIn: vi.fn(),
      coldStartBusy: false,
      busy: false,
      error: null,
      token: 'test-token',
      client: { auth: { getMe } },
    })

    useAppStore.setState({
      isAuthenticated: true,
      role: 'cashier',
      screen: 'orders',
      lang: 'ro',
      currentBranch: { id: 'br-001', name: 'Downtown', isDefault: true, isActive: true },
      noBranchAccess: false,
      toasts: [],
    })
  })

  afterEach(() => {
    useAppStore.setState({
      isAuthenticated: false,
      screen: 'orders',
      currentBranch: null,
      noBranchAccess: false,
      toasts: [],
    })
    vi.clearAllMocks()
  })

  test('noBranchAccess=false renders the normal Shell path (no block)', () => {
    const { container } = renderApp()

    expect(container.querySelector('.sidebar')).not.toBeNull()
    expect(screen.queryByText('Nicio filială disponibilă')).not.toBeInTheDocument()
  })

  test('noBranchAccess=true renders the block and Shell/screen router is unreachable', () => {
    useAppStore.setState({ noBranchAccess: true })
    const { container } = renderApp()

    expect(container.querySelector('.sidebar')).toBeNull()
    expect(screen.getByText('Nicio filială disponibilă')).toBeInTheDocument()
    expect(screen.getByText('Cere administratorului să îți aloce o filială.')).toBeInTheDocument()
    expect(screen.getByText('Reîncearcă')).toBeInTheDocument()
  })

  test('Retry with a getMe() returning a non-null selectedBranch clears noBranchAccess and adopts the branch', async () => {
    useAppStore.setState({ noBranchAccess: true })
    getMe.mockResolvedValue({ selectedBranch: { id: 'br-002', name: 'Uptown', isDefault: false, isActive: true } })
    renderApp()

    await act(async () => {
      fireEvent.click(screen.getByText('Reîncearcă'))
    })

    expect(getMe).toHaveBeenCalledTimes(1)
    expect(useAppStore.getState().noBranchAccess).toBe(false)
    expect(useAppStore.getState().currentBranch).toEqual({ id: 'br-002', name: 'Uptown', isDefault: false, isActive: true })
    expect(screen.queryByText('Nicio filială disponibilă')).not.toBeInTheDocument()
  })

  test('Retry with a getMe() returning a null selectedBranch keeps the block up and pushes no toast', async () => {
    useAppStore.setState({ noBranchAccess: true })
    getMe.mockResolvedValue({ selectedBranch: null })
    renderApp()

    await act(async () => {
      fireEvent.click(screen.getByText('Reîncearcă'))
    })

    expect(getMe).toHaveBeenCalledTimes(1)
    expect(useAppStore.getState().noBranchAccess).toBe(true)
    expect(screen.getByText('Nicio filială disponibilă')).toBeInTheDocument()
    expect(useAppStore.getState().toasts).toHaveLength(0)
    // Button returns to idle (enabled, idle label) after the resolved retry.
    expect(screen.getByText('Reîncearcă')).not.toBeDisabled()
  })

  test('Retry whose getMe() throws keeps the block up and returns the button to idle', async () => {
    useAppStore.setState({ noBranchAccess: true })
    getMe.mockRejectedValue(new Error('network drop'))
    renderApp()

    await act(async () => {
      fireEvent.click(screen.getByText('Reîncearcă'))
    })

    expect(getMe).toHaveBeenCalledTimes(1)
    expect(useAppStore.getState().noBranchAccess).toBe(true)
    expect(screen.getByText('Nicio filială disponibilă')).toBeInTheDocument()
    expect(useAppStore.getState().toasts).toHaveLength(0)
    expect(screen.getByText('Reîncearcă')).not.toBeDisabled()
  })

  test('clicking Retry disables the button and swaps the label to the in-flight copy while the getMe() call is pending', async () => {
    useAppStore.setState({ noBranchAccess: true })
    let resolveGetMe
    getMe.mockReturnValue(new Promise((resolve) => { resolveGetMe = resolve }))
    renderApp()

    fireEvent.click(screen.getByText('Reîncearcă'))

    expect(await screen.findByText('Se verifică…')).toBeInTheDocument()
    expect(screen.getByText('Se verifică…').closest('button')).toBeDisabled()

    await act(async () => {
      resolveGetMe({ selectedBranch: { id: 'br-002', name: 'Uptown', isDefault: false, isActive: true } })
    })

    expect(useAppStore.getState().noBranchAccess).toBe(false)
  })
})
