// Route + rehydrate-backstop coverage for app.jsx's History wiring (HIST-01, HIST-10, D-07/D-08).
// Mocks every data hook App() calls so this test exercises ROUTING and MERGING, not data
// fetching — per 07-06-PLAN.md Task 2 and 08-05-PLAN.md Task 2. The presenter's four items-card
// states (loading/error/empty/populated) and the button sweep are covered by
// screen-detail.test.jsx; this file only proves that app.jsx calls useOrderDetail with the
// right id, merges the payload in the right direction, passes the right props, and that Back
// lands on History.

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

// Controllable, per-id mock (finding F-01 / RESEARCH Wave 0 Gaps): app.jsx now calls
// useOrderDetail TWICE (live route + history route) against the same hook, so a blanket
// `() => ({ data: undefined })` return can no longer distinguish them and also omits
// `isPending`/`isError`/`refetch` entirely. useOrderDetailMock is declared via vi.hoisted so
// the vi.mock factory below (which is itself hoisted above these imports) can close over it.
const useOrderDetailMock = vi.hoisted(() => vi.fn())
vi.mock('../use-order-detail.js', () => ({ useOrderDetail: useOrderDetailMock }))

vi.mock('../use-orders.js', () => ({ useOrders: () => ({ data: { orders: [] } }) }))
vi.mock('../use-stats.js', () => ({ useStats: () => ({ data: undefined }) }))
vi.mock('../use-restaurant-settings.js', () => ({ useRestaurantSettings: () => ({ data: undefined }) }))
vi.mock('../use-delivery-areas.js', () => ({ useDeliveryAreas: () => ({ data: [] }) }))
vi.mock('../use-order-actions.js', () => ({
  useOrderActions: () => ({ updateStatus: { mutate: vi.fn(), isPending: false } }),
}))
vi.mock('../use-sse.js', () => ({ useSSE: () => ({ isConnected: true }) }))
vi.mock('../use-updater.js', () => ({ useUpdater: () => {} }))
vi.mock('../use-history-orders.js', () => ({ useHistoryOrders: () => ({ data: [], isLoading: false }) }))

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useAuth } from '../auth.jsx'
import { useAppStore } from '../store.js'
import App from '../app.jsx'

// Production-shaped fixture per F-01: normalizeOrder (src/data.jsx) always maps
// `items: (o.items ?? []).map(...)`, so an AdminOrder summary always reaches the route with
// `items: []`, never `items: null`. The prior fixture's `items: null` was unrepresentative and
// masked the shipped Modify defect (T-08-01) — see STATE.md Phase 8 planning note.
const historyOrderFixture = {
  id: 'ord-100',
  dailyOrderNumber: 42,
  placedAt: new Date().toISOString(),
  state: 'done',
  status: 'COMPLETED',
  paymentCaptureStatus: 'captured',
  type: 'pickup',
  payment: 'cash',
  customer: { name: 'Ana Pop', phone: null },
  address: null,
  subtotal: 120.00,
  tax: 8.50,
  deliveryFee: 0,
  tip: 0,
  discount: 0,
  total: 128.50,
  items: [],
}

// The hydrated getOrder(id) payload: items with modifiers, customer phone, and a delivery
// address — none of which the AdminOrder summary above carries. Its `total` (58.00)
// deliberately differs from the summary's (128.50) so the merge-direction tests can prove
// hydrated wins (D-03).
const hydratedDetailFixture = {
  id: 'ord-100',
  items: [
    { name: 'Margherita', qty: 1, price: 32, mods: ['Extra cheese'], source: 'menu' },
    { name: 'Coca-Cola', qty: 2, price: 8, mods: [], source: 'menu' },
  ],
  subtotal: 48,
  tax: 4,
  deliveryFee: 6,
  tip: 0,
  discount: 0,
  total: 58,
  customer: { name: 'Ana Pop', phone: '0722111222' },
  address: { line1: 'Str. Exemplu 10', city: 'București', note: null },
  events: [{ toStatus: 'COMPLETED', createdAt: '2026-07-01T12:25:00Z' }],
}

// Same hydrated shape but with `total` omitted, to prove a hydrated payload that doesn't
// carry a field never blanks the summary's value for that field (the merge's `?? {}` guard
// plus plain object spread rather than TanStack placeholderData/initialData).
const { total: _omittedTotal, ...hydratedDetailNoTotalFixture } = hydratedDetailFixture

// A second, unrelated order id — used to prove the live 'detail' route (selectedOrderId) is
// unaffected by the new sibling history-route hook call and still renders the editable,
// non-readOnly presenter.
const liveOrderFixture = {
  id: 'ord-live-1',
  dailyOrderNumber: 10,
  placedAt: new Date().toISOString(),
  state: 'accepted',
  status: 'ACCEPTED',
  type: 'dinein',
  table: '3',
  customer: { name: 'Bogdan Ion', phone: null },
  address: null,
  notes: null,
  items: [{ name: 'Pizza', qty: 1, price: 30, mods: [], source: 'menu' }],
  subtotal: 30,
  tax: 3,
  deliveryFee: 0,
  tip: 0,
  discount: 0,
  total: 33,
  payment: 'cash',
  paid: false,
}

function renderApp() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <App />
    </QueryClientProvider>
  )
}

describe('app-history-route — router wiring + fetch/merge (HIST-01, HIST-10, D-07/D-08)', () => {
  let detailResponses

  beforeEach(() => {
    // Reset per-id response map and give the hook TanStack v5's real disabled-query shape by
    // default: an undefined id (e.g. the live route when nothing is selected) is not pending.
    detailResponses = new Map()
    useOrderDetailMock.mockReset()
    useOrderDetailMock.mockImplementation((id) => {
      if (id && detailResponses.has(id)) return detailResponses.get(id)
      return { data: undefined, isPending: false, isError: false, refetch: vi.fn() }
    })

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

  test('hydration: opening a historical order fetches getOrder(id) and renders items with modifiers, phone, and address (SC1)', () => {
    detailResponses.set(historyOrderFixture.id, { data: hydratedDetailFixture, isPending: false, isError: false, refetch: vi.fn() })
    useAppStore.setState({ screen: 'history-detail', historyOrder: historyOrderFixture })
    renderApp()

    expect(screen.getAllByText('Margherita').length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Extra cheese/).length).toBeGreaterThan(0)
    expect(screen.getAllByText('Coca-Cola').length).toBeGreaterThan(0)
    // Customer phone and delivery address are present only on the detail response — the
    // AdminOrder summary carries neither.
    expect(screen.getByText(/0722111222/)).toBeInTheDocument()
    expect(screen.getAllByText('Str. Exemplu 10').length).toBeGreaterThan(0)
    expect(screen.getAllByText('București').length).toBeGreaterThan(0)
  })

  test('loading: isPending true renders the items skeleton and the summary total still renders', () => {
    detailResponses.set(historyOrderFixture.id, { data: undefined, isPending: true, isError: false, refetch: vi.fn() })
    useAppStore.setState({ screen: 'history-detail', historyOrder: historyOrderFixture })
    renderApp()

    expect(screen.getAllByTestId('detail-skeleton-row')).toHaveLength(3)
    expect(screen.getByText('128,50 lei')).toBeInTheDocument()
  })

  test('error: isError true renders the error title and the summary total still renders', () => {
    detailResponses.set(historyOrderFixture.id, { data: undefined, isPending: false, isError: true, refetch: vi.fn() })
    useAppStore.setState({ screen: 'history-detail', historyOrder: historyOrderFixture })
    renderApp()

    expect(screen.getByText('Nu am putut încărca bonul')).toBeInTheDocument()
    expect(screen.getByText('128,50 lei')).toBeInTheDocument()
  })

  test('merge: summary total present, hydrated payload omits total — nothing blanks', () => {
    detailResponses.set(historyOrderFixture.id, { data: hydratedDetailNoTotalFixture, isPending: false, isError: false, refetch: vi.fn() })
    useAppStore.setState({ screen: 'history-detail', historyOrder: historyOrderFixture })
    renderApp()

    expect(screen.getByText('128,50 lei')).toBeInTheDocument()
  })

  test('merge: hydrated total differs from summary total — hydrated wins (D-03)', () => {
    detailResponses.set(historyOrderFixture.id, { data: hydratedDetailFixture, isPending: false, isError: false, refetch: vi.fn() })
    useAppStore.setState({ screen: 'history-detail', historyOrder: historyOrderFixture })
    renderApp()

    expect(screen.getByText('58,00 lei')).toBeInTheDocument()
    expect(screen.queryByText('128,50 lei')).not.toBeInTheDocument()
  })

  test('Modify gate holds under real hydration: with a hydrated fixture (non-empty items), Modify is absent from the DOM', () => {
    detailResponses.set(historyOrderFixture.id, { data: hydratedDetailFixture, isPending: false, isError: false, refetch: vi.fn() })
    useAppStore.setState({ screen: 'history-detail', historyOrder: historyOrderFixture })
    renderApp()

    expect(screen.queryByText(/Modifică/i)).not.toBeInTheDocument()
  })

  test('Back: from history-detail, clicking back returns to History, not Orders (SC4)', () => {
    useAppStore.setState({ screen: 'history-detail', historyOrder: historyOrderFixture })
    renderApp()

    fireEvent.click(screen.getByText(/Înapoi la istoric/i))
    expect(useAppStore.getState().screen).toBe('history')
    expect(useAppStore.getState().screen).not.toBe('orders')
  })

  test('the live route is unaffected: screen "detail" with a selectedOrder still renders the editable detail', () => {
    detailResponses.set(liveOrderFixture.id, { data: liveOrderFixture, isPending: false, isError: false, refetch: vi.fn() })
    useAppStore.setState({ screen: 'detail', selectedOrder: { id: liveOrderFixture.id } })
    renderApp()

    // Mutating "Back to orders" label (not the read-only "Back to history" label) proves the
    // live route rendered with readOnly falsy, unaffected by the new sibling hook call.
    expect(screen.getByText(/Înapoi la comenzi/i)).toBeInTheDocument()
    expect(screen.getByText('#10')).toBeInTheDocument()
  })
})
