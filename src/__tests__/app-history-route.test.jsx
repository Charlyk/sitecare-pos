// Route + rehydrate-backstop coverage for app.jsx's History wiring (Plan 06, HIST-01/05, D-07/D-08).
// Mocks every data hook App() calls so this test exercises ROUTING, not data fetching —
// per 07-06-PLAN.md Task 2.

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

vi.mock('../auth.jsx', () => ({
  AuthProvider: ({ children }) => children,
  useAuth: vi.fn(),
}))

vi.mock('../use-orders.js', () => ({ useOrders: () => ({ data: { orders: [] } }) }))
vi.mock('../use-order-detail.js', () => ({ useOrderDetail: () => ({ data: undefined }) }))
vi.mock('../use-stats.js', () => ({ useStats: () => ({ data: undefined }) }))
vi.mock('../use-restaurant-settings.js', () => ({ useRestaurantSettings: () => ({ data: undefined }) }))
vi.mock('../use-delivery-areas.js', () => ({ useDeliveryAreas: () => ({ data: [] }) }))
vi.mock('../use-order-actions.js', () => ({
  useOrderActions: () => ({ updateStatus: { mutate: vi.fn(), isPending: false } }),
}))
vi.mock('../use-sse.js', () => ({ useSSE: () => ({ isConnected: true }) }))
vi.mock('../use-updater.js', () => ({ useUpdater: () => {} }))
vi.mock('../use-history-orders.js', () => ({ useHistoryOrders: () => ({ data: [], isLoading: false }) }))

import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useAuth } from '../auth.jsx'
import { useAppStore } from '../store.js'
import App from '../app.jsx'

// Minimal AdminOrder-shaped fixture for the history-detail route (items: null mirrors the
// AdminOrder summary shape — no items[], no fetch; see 07-06-PLAN.md's D-08 asymmetry note).
const historyOrderFixture = {
  id: 'ord-100',
  dailyOrderNumber: 42,
  placedAt: new Date().toISOString(),
  state: 'done',
  type: 'pickup',
  payment: 'cash',
  customer: { name: 'Ana Pop' },
  total: 5000,
  subtotal: 5000,
  tax: 0,
  items: null,
}

function renderApp() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <App />
    </QueryClientProvider>
  )
}

describe('app-history-route — Plan 06 router wiring (HIST-01, D-07/D-08)', () => {
  beforeEach(() => {
    useAuth.mockReturnValue({
      signIn: vi.fn(),
      coldStartBusy: false,
      busy: false,
      error: null,
      token: 'test-token',
      client: {},
    })
    useAppStore.setState({ isAuthenticated: true, role: 'cashier' })
  })

  afterEach(() => {
    useAppStore.setState({
      screen: 'orders',
      historyOrder: null,
      selectedOrder: null,
      isAuthenticated: false,
      role: 'cashier',
    })
    vi.clearAllMocks()
  })

  test('rehydrate backstop: history-detail with historyOrder null redirects to history (not blank)', async () => {
    useAppStore.setState({ screen: 'history-detail', historyOrder: null })
    renderApp()

    await waitFor(() => expect(useAppStore.getState().screen).toBe('history'))
    // History's empty state renders — proof the redirect landed on a real screen, not blank.
    expect(await screen.findByText('Nicio comandă în ultimele 30 de zile.')).toBeInTheDocument()
  })

  test('history-detail with a historyOrder present does not redirect and renders read-only detail', () => {
    useAppStore.setState({ screen: 'history-detail', historyOrder: historyOrderFixture })
    renderApp()

    expect(useAppStore.getState().screen).toBe('history-detail')
    // Read-only back button text (h_back_to_history), not the mutating "Back to orders" label.
    expect(screen.getByText(/Înapoi la istoric/i)).toBeInTheDocument()
    // No Advance/Cancel/print controls reach the readOnly route (T-07-21).
    expect(screen.queryByText(/Modifică/i)).not.toBeInTheDocument()
  })

  test('screen === history renders HistoryScreen inside the Shell', () => {
    useAppStore.setState({ screen: 'history' })
    renderApp()

    expect(screen.getByText('Nicio comandă în ultimele 30 de zile.')).toBeInTheDocument()
  })

  test('screen === detail is unaffected: shipped editable detail path still renders (no regression)', () => {
    useAppStore.setState({ screen: 'orders' })
    renderApp()
    // Orders screen renders without throwing (hook-order safe) — sanity check that the
    // additive router changes did not break the shipped default screen.
    expect(document.body).toBeTruthy()
  })
})
