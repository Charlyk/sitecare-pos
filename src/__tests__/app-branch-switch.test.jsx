// End-to-end branch-switch tracer (Phase 16, Task 1) — proves the whole vertical: selector click
// → non-optimistic mutation → overlay (pending) → onSuccess enters bridging → SSE isConnected
// drop+recover releases the overlay → success toast fires on release, never at mutation-resolve.
// Mirrors src/__tests__/app-history-route.test.jsx's full-App render pattern and
// src/__tests__/use-sse.test.js's fake-timers + isConnected-transition precedent.

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

// isConnected is driven directly by this mock's return value so the test can force the
// true→false→true transition the bridging watcher observes (D-08), without a real SSE stream.
const sseState = vi.hoisted(() => ({ isConnected: true }))
const useSSEMock = vi.hoisted(() => vi.fn(() => ({ isConnected: sseState.isConnected })))
vi.mock('../use-sse.js', () => ({ useSSE: useSSEMock }))

// useBranchSwitch is mocked at the mutate-call level: the mock captures the call-site
// { onSuccess, onError } options so the test can drive them directly with act(), exactly
// mirroring how the mutation would resolve asynchronously in production.
const branchSwitchMutate = vi.hoisted(() => vi.fn())
vi.mock('../use-branches.js', () => ({
  useBranches: () => ({
    data: [
      { id: 'br-001', name: 'Downtown', isDefault: true, isActive: true },
      { id: 'br-002', name: 'Uptown', isDefault: false, isActive: true },
    ],
  }),
  useBranchSwitch: () => ({ mutate: branchSwitchMutate, isPending: false }),
}))

import { render, screen, fireEvent, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useAuth } from '../auth.jsx'
import { useAppStore } from '../store.js'
import App from '../app.jsx'

function renderApp() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const tree = () => (
    <QueryClientProvider client={qc}>
      <App />
    </QueryClientProvider>
  )
  const utils = render(tree())
  // forceRerender: the mocked useSSE() has no internal React state of its own (it's a bare
  // vi.fn(), not a hook backed by useState/useSyncExternalStore), so mutating the module-level
  // sseState object alone does not trigger a re-render. Re-rendering the same root element
  // forces App() to re-execute and read the mock's current return value — mirroring what the
  // real useSSE's internal setIsConnected would have triggered on its own.
  const forceRerender = () => utils.rerender(tree())
  return { ...utils, forceRerender }
}

function openPopoverAndSelect(branchName) {
  // The branch trigger pill shows the current branch name (Downtown) — click it to open the
  // popover, then click the target row.
  fireEvent.click(screen.getByTitle('Downtown'))
  fireEvent.click(screen.getByText(branchName))
}

describe('app-branch-switch — end-to-end tracer (SWCH-03/04, SCOPE-04, D-05/D-07/D-08/D-09/D-10/D-11)', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    sseState.isConnected = true
    branchSwitchMutate.mockReset()

    useAuth.mockReturnValue({
      signIn: vi.fn(),
      coldStartBusy: false,
      busy: false,
      error: null,
      token: 'test-token',
      client: {},
    })

    useAppStore.setState({
      isAuthenticated: true,
      role: 'cashier',
      screen: 'orders',
      lang: 'ro',
      currentBranch: { id: 'br-001', name: 'Downtown', isDefault: true, isActive: true },
      toasts: [],
    })
  })

  afterEach(() => {
    useAppStore.setState({
      isAuthenticated: false,
      screen: 'orders',
      currentBranch: null,
      toasts: [],
    })
    vi.clearAllMocks()
    vi.useRealTimers()
  })

  test('selecting a branch shows the pending overlay and calls the mutation exactly once', () => {
    renderApp()

    openPopoverAndSelect('Uptown')

    expect(branchSwitchMutate).toHaveBeenCalledTimes(1)
    expect(branchSwitchMutate.mock.calls[0][0]).toEqual({ id: 'br-002', name: 'Uptown', isDefault: false, isActive: true })
    expect(screen.getByText(/Se comută la/)).toBeInTheDocument()
    expect(screen.getByText(/Uptown/)).toBeInTheDocument()
  })

  test('mutation success enters bridging (Reconnecting sub-line) and does NOT fire the success toast at mutation-resolve', () => {
    renderApp()
    openPopoverAndSelect('Uptown')

    const { onSuccess } = branchSwitchMutate.mock.calls[0][1]
    act(() => { onSuccess() })

    // Still in bridging — overlay stays up with the reconnecting sub-line.
    expect(screen.getByText(/Se reconectează/)).toBeInTheDocument()
    // The toast must NOT have fired yet — it fires on overlay release, not on mutation resolve (D-10).
    expect(screen.queryByText('Filială schimbată')).not.toBeInTheDocument()
  })

  test('an isConnected false→true transition while bridging releases the overlay and fires the success toast exactly once (D-08/D-10)', async () => {
    const { forceRerender } = renderApp()
    openPopoverAndSelect('Uptown')

    const { onSuccess } = branchSwitchMutate.mock.calls[0][1]
    await act(async () => { onSuccess() })

    // Simulate the guaranteed use-sse.js:38 drop, then the reconnect.
    await act(async () => { sseState.isConnected = false; forceRerender() })
    await act(async () => { sseState.isConnected = true; forceRerender() })

    expect(screen.getByText('Filială schimbată')).toBeInTheDocument()
    expect(screen.getByText(/Ești acum pe Uptown/)).toBeInTheDocument()
    // Overlay released.
    expect(screen.queryByText(/Se comută la/)).not.toBeInTheDocument()
    // Exactly one success toast.
    expect(screen.getAllByText('Filială schimbată')).toHaveLength(1)
  })

  test('bounded timeout (D-09): if isConnected never recovers, the overlay releases anyway and the success toast still fires', async () => {
    const { forceRerender } = renderApp()
    openPopoverAndSelect('Uptown')

    const { onSuccess } = branchSwitchMutate.mock.calls[0][1]
    await act(async () => { onSuccess() })

    await act(async () => { sseState.isConnected = false; forceRerender() })

    await act(async () => { vi.advanceTimersByTime(6000) })

    expect(screen.getByText('Filială schimbată')).toBeInTheDocument()
    expect(screen.queryByText(/Se comută la/)).not.toBeInTheDocument()
  })

  test('a rejected switch releases the overlay immediately and shows the generic failure toast (D-11/D-12/SC3)', () => {
    renderApp()
    openPopoverAndSelect('Uptown')

    const { onError } = branchSwitchMutate.mock.calls[0][1]
    act(() => { onError() })

    expect(screen.queryByText(/Se comută la/)).not.toBeInTheDocument()
    expect(screen.getByText('Nu s-a putut schimba filiala')).toBeInTheDocument()
    expect(screen.getByText('Încearcă din nou')).toBeInTheDocument()
    // Never a success toast on the error path.
    expect(screen.queryByText('Filială schimbată')).not.toBeInTheDocument()
  })
})
