import { describe, it, test, vi, expect, beforeEach } from 'vitest'
import { createElement } from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

vi.mock('@tauri-apps/plugin-store', () => ({
  load: vi.fn().mockResolvedValue({
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue(undefined),
    save: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(undefined),
  }),
}))
vi.mock('@charlyk/admin-client', () => ({ signIn: vi.fn(), createAdminClient: vi.fn() }))
vi.mock('@tauri-apps/plugin-opener', () => ({ open: vi.fn(), openUrl: vi.fn() }))
vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }))
vi.mock('../auth.jsx', () => ({ useAuth: vi.fn(() => ({ client: null, token: null })) }))
vi.mock('../store.js', () => ({
  useAppStore: vi.fn((selector) => selector ? selector({ lang: 'en', pushToast: vi.fn() }) : {}),
}))

const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
function w({ children }) { return createElement(QueryClientProvider, { client: qc }, children) }

import { OrderDetailScreen } from '../screen-detail.jsx'

const MINIMAL_ORDER = {
  id: 'ord-print-1',
  dailyOrderNumber: 42,
  placedAt: '2026-04-28T10:00:00Z',
  state: 'accepted',
  type: 'dinein',
  source: 'counter',
  table: '5',
  customer: { name: 'Ion Pop', phone: null },
  address: null,
  notes: null,
  items: [{ name: 'Pizza', qty: 2, price: 35.00, mods: [], source: 'menu' }],
  subtotal: 70.00,
  tax: 13.30,
  deliveryFee: 0,
  discount: 0,
  total: 83.30,
  payment: 'cash',
  paid: false,
}

describe('ACT-04: print receipt from Order Detail screen', () => {
  beforeEach(() => { vi.clearAllMocks() })

  test('Print kitchen button calls onPrint(order, "kitchen")', () => {
    const onPrint = vi.fn()
    render(
      createElement(OrderDetailScreen, {
        order: MINIMAL_ORDER,
        lang: 'en',
        restaurantSettings: null,
        deliveryAreas: [],
        onBack: vi.fn(),
        onAdvance: vi.fn(),
        onPrint,
        onCancel: vi.fn(),
        isOffline: false,
      }),
      { wrapper: w }
    )
    // There are two "Print kitchen" elements: a tab toggle and an action button.
    // The action button is inside .btn-secondary with the actual onPrint call.
    const allKitchenBtns = screen.getAllByText('Print kitchen')
    // The action button is the one inside a btn-secondary (has className on closest button)
    const actionBtn = allKitchenBtns.find(el => el.closest('button.btn-secondary'))
    fireEvent.click(actionBtn)
    expect(onPrint).toHaveBeenCalledWith(MINIMAL_ORDER, 'kitchen')
  })

  test('Print customer button calls onPrint(order, "customer")', () => {
    const onPrint = vi.fn()
    render(
      createElement(OrderDetailScreen, {
        order: MINIMAL_ORDER,
        lang: 'en',
        restaurantSettings: null,
        deliveryAreas: [],
        onBack: vi.fn(),
        onAdvance: vi.fn(),
        onPrint,
        onCancel: vi.fn(),
        isOffline: false,
      }),
      { wrapper: w }
    )
    // There are two "Print customer" elements: a tab toggle and an action button.
    // The action button is inside .btn-primary with the actual onPrint call.
    const allCustomerBtns = screen.getAllByText('Print customer')
    const actionBtn = allCustomerBtns.find(el => el.closest('button.btn-primary'))
    fireEvent.click(actionBtn)
    expect(onPrint).toHaveBeenCalledWith(MINIMAL_ORDER, 'customer')
  })
})

// AdminOrder-shaped fixture: no items[], no notes, no address — matches the fields
// Phase 7's history list call actually returns (post-normalizeOrder).
const HISTORY_ORDER = {
  id: 'ord-history-1',
  dailyOrderNumber: 77,
  placedAt: '2026-06-01T12:00:00Z',
  state: 'done',
  type: 'delivery',
  source: 'app',
  table: null,
  customer: { name: 'Maria Ionescu', phone: '0722111222' },
  total: 128.50,
  payment: 'card',
  paid: true,
}

// Same shape but with a non-terminal state, to prove Advance/Cancel gating is
// unconditional on readOnly rather than derived from order.state.
const HISTORY_ORDER_NON_TERMINAL = { ...HISTORY_ORDER, state: 'new' }

describe('readOnly mode', () => {
  beforeEach(() => { vi.clearAllMocks() })

  test('readOnly omitted renders exactly as shipped: timeline and Advance present, default back label', () => {
    render(
      createElement(OrderDetailScreen, {
        order: MINIMAL_ORDER,
        lang: 'ro',
        restaurantSettings: null,
        deliveryAreas: [],
        onBack: vi.fn(),
        onAdvance: vi.fn(),
        onPrint: vi.fn(),
        onCancel: vi.fn(),
        isOffline: false,
      }),
      { wrapper: w }
    )
    expect(screen.getByText('Înapoi la comenzi')).toBeTruthy()
    // Advance button present for a non-terminal 'accepted' order
    expect(screen.getByText('Începe')).toBeTruthy()
  })

  test('readOnly hides timeline, notes card, Call customer, items card, thermal rail, print buttons, Advance, Cancel', () => {
    const onBack = vi.fn()
    render(
      createElement(OrderDetailScreen, {
        order: HISTORY_ORDER,
        lang: 'ro',
        readOnly: true,
        onBack,
      }),
      { wrapper: w }
    )
    expect(screen.queryByText('Nicio notă')).toBeNull()
    expect(screen.queryByText('Sună clientul')).toBeNull()
    expect(screen.queryByText('Modifică')).toBeNull()
    expect(screen.queryByText('Bon imprimantă')).toBeNull()
    expect(screen.queryByText('Print kitchen')).toBeNull()
    expect(screen.queryByText('Print customer')).toBeNull()
    expect(screen.queryByText('Începe')).toBeNull()
    expect(screen.queryByText('Anulează comanda')).toBeNull()

    // back label switches to history copy, onBack still wired through the same prop
    const backBtn = screen.getByText('Înapoi la istoric')
    fireEvent.click(backBtn)
    expect(onBack).toHaveBeenCalledTimes(1)
  })

  test('readOnly hides Advance and Cancel unconditionally, even for a non-terminal order state', () => {
    render(
      createElement(OrderDetailScreen, {
        order: HISTORY_ORDER_NON_TERMINAL,
        lang: 'ro',
        readOnly: true,
        onBack: vi.fn(),
      }),
      { wrapper: w }
    )
    expect(screen.queryByText('Acceptă')).toBeNull()
    expect(screen.queryByText('Anulează comanda')).toBeNull()
  })

  test('readOnly still renders customer name and phone', () => {
    render(
      createElement(OrderDetailScreen, {
        order: HISTORY_ORDER,
        lang: 'ro',
        readOnly: true,
        onBack: vi.fn(),
      }),
      { wrapper: w }
    )
    expect(screen.getByText('Maria Ionescu')).toBeTruthy()
    expect(screen.getByText('0722111222')).toBeTruthy()
  })

  test('readOnly with items-less order collapses the outer grid to a single 1fr column', () => {
    const { container } = render(
      createElement(OrderDetailScreen, {
        order: HISTORY_ORDER,
        lang: 'ro',
        readOnly: true,
        onBack: vi.fn(),
      }),
      { wrapper: w }
    )
    const outerGrid = container.firstChild
    expect(outerGrid.style.gridTemplateColumns).toBe('1fr')
  })

  test('readOnly renders the minimal totals card: total label + formatted RON total', () => {
    render(
      createElement(OrderDetailScreen, {
        order: HISTORY_ORDER,
        lang: 'ro',
        readOnly: true,
        onBack: vi.fn(),
      }),
      { wrapper: w }
    )
    expect(screen.getByText('Total')).toBeTruthy()
    expect(screen.getByText('128,50 lei')).toBeTruthy()
  })
})

describe('readOnly duration row', () => {
  beforeEach(() => { vi.clearAllMocks() })

  test('readOnly + COMPLETED event 25 min after placedAt renders prep-time label and duration, no elapsed label', () => {
    const order = {
      ...HISTORY_ORDER,
      events: [{ toStatus: 'COMPLETED', createdAt: '2026-06-01T12:25:00Z' }],
    }
    render(
      createElement(OrderDetailScreen, { order, lang: 'en', readOnly: true, onBack: vi.fn() }),
      { wrapper: w }
    )
    expect(screen.getByText(/Prep time: 25 min/)).toBeTruthy()
    expect(screen.queryByText(/Elapsed/i)).toBeNull()
  })

  test('readOnly + COMPLETED event 25 min after placedAt renders Romanian prep-time label', () => {
    const order = {
      ...HISTORY_ORDER,
      events: [{ toStatus: 'COMPLETED', createdAt: '2026-06-01T12:25:00Z' }],
    }
    render(
      createElement(OrderDetailScreen, { order, lang: 'ro', readOnly: true, onBack: vi.fn() }),
      { wrapper: w }
    )
    expect(screen.getByText(/Timp de pregătire: 25 min/)).toBeTruthy()
  })

  test('readOnly + CANCELLED event 65 min after placedAt renders canceled-after label and 1h 5m', () => {
    const order = {
      ...HISTORY_ORDER,
      events: [{ toStatus: 'CANCELLED', createdAt: '2026-06-01T13:05:00Z' }],
    }
    render(
      createElement(OrderDetailScreen, { order, lang: 'en', readOnly: true, onBack: vi.fn() }),
      { wrapper: w }
    )
    expect(screen.getByText(/Canceled after: 1h 5m/)).toBeTruthy()
  })

  test('readOnly + empty events renders placed-at time with no duration label and no trailing separator', () => {
    const order = { ...HISTORY_ORDER, events: [] }
    const { container } = render(
      createElement(OrderDetailScreen, { order, lang: 'en', readOnly: true, onBack: vi.fn() }),
      { wrapper: w }
    )
    const metaLine = container.querySelector('div[style*="margin-top: 4px"]')
    expect(metaLine).toBeTruthy()
    expect(metaLine.textContent).not.toContain('·')
    expect(metaLine.textContent).not.toMatch(/Prep time|Canceled after/)
  })

  test('readOnly + no events key renders placed-at time and does not throw', () => {
    const order = { ...HISTORY_ORDER }
    delete order.events
    expect(() => {
      render(
        createElement(OrderDetailScreen, { order, lang: 'en', readOnly: true, onBack: vi.fn() }),
        { wrapper: w }
      )
    }).not.toThrow()
    expect(screen.queryByText(/Prep time|Canceled after/)).toBeNull()
  })

  test('readOnly + both COMPLETED and CANCELLED events renders prep-time label (COMPLETED precedence)', () => {
    const order = {
      ...HISTORY_ORDER,
      events: [
        { toStatus: 'CANCELLED', createdAt: '2026-06-01T12:10:00Z' },
        { toStatus: 'COMPLETED', createdAt: '2026-06-01T12:25:00Z' },
      ],
    }
    render(
      createElement(OrderDetailScreen, { order, lang: 'en', readOnly: true, onBack: vi.fn() }),
      { wrapper: w }
    )
    expect(screen.getByText(/Prep time: 25 min/)).toBeTruthy()
  })

  test('NOT readOnly (MINIMAL_ORDER) still renders the elapsed label, no prep-time or canceled-after label', () => {
    render(
      createElement(OrderDetailScreen, {
        order: MINIMAL_ORDER,
        lang: 'en',
        onBack: vi.fn(),
        onAdvance: vi.fn(),
        onPrint: vi.fn(),
        onCancel: vi.fn(),
        isOffline: false,
      }),
      { wrapper: w }
    )
    expect(screen.getByText(/elapsed/i)).toBeTruthy()
    expect(screen.queryByText(/Prep time|Canceled after/)).toBeNull()
  })
})
