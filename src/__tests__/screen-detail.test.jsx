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

  test('readOnly + refunded order renders the refunded label, not the completed label', () => {
    const order = { ...HISTORY_ORDER, status: 'COMPLETED', paymentCaptureStatus: 'refunded' }
    render(
      createElement(OrderDetailScreen, { order, lang: 'ro', readOnly: true, onBack: vi.fn() }),
      { wrapper: w }
    )
    expect(screen.getAllByText('Rambursată').length).toBeGreaterThan(0)
    expect(screen.queryByText('Finalizată')).toBeNull()
  })

  test('readOnly + cancelled order renders the canceled label, not New (RESEARCH Pitfall 2)', () => {
    const order = { ...HISTORY_ORDER, status: 'CANCELLED', state: 'cancelled' }
    render(
      createElement(OrderDetailScreen, { order, lang: 'ro', readOnly: true, onBack: vi.fn() }),
      { wrapper: w }
    )
    expect(screen.getAllByText('Anulată').length).toBeGreaterThan(0)
    expect(screen.queryByText('Nouă')).toBeNull()
    expect(screen.queryByText('New')).toBeNull()
  })

  test('readOnly + completed order renders the completed label via historyStatusMeta (chip-sage)', () => {
    const order = { ...HISTORY_ORDER, status: 'COMPLETED', state: 'done' }
    render(
      createElement(OrderDetailScreen, { order, lang: 'ro', readOnly: true, onBack: vi.fn() }),
      { wrapper: w }
    )
    const chips = screen.getAllByText('Finalizată').filter(el => el.closest('span.chip'))
    expect(chips.length).toBeGreaterThan(0)
    expect(chips[0].className).toContain('chip-sage')
  })

  test('readOnly + no status and no paymentCaptureStatus falls back to stateMeta, not historyStatusMeta', () => {
    // HISTORY_ORDER carries state: 'done', whose stateMeta label ('Finalizată') happens to
    // coincide with historyStatusMeta's 'completed' label — same word, different derivation and
    // different chip class. Assert on the class to distinguish which map actually produced the
    // chip: stateMeta.done -> chip-slate; historyStatusMeta's map.completed default -> chip-sage.
    // The defect this guards against is historyStatusMeta's own `map[status] || map.completed`
    // default silently activating when deriveDisplayStatus returns null.
    const order = { ...HISTORY_ORDER }
    render(
      createElement(OrderDetailScreen, { order, lang: 'ro', readOnly: true, onBack: vi.fn() }),
      { wrapper: w }
    )
    const chips = screen.getAllByText('Finalizată').filter(el => el.closest('span.chip'))
    expect(chips.length).toBeGreaterThan(0)
    for (const chip of chips) {
      expect(chip.className).toContain('chip-slate')
      expect(chip.className).not.toContain('chip-sage')
    }
  })

  test('NOT readOnly + MINIMAL_ORDER still renders stateMeta accepted chip, unchanged', () => {
    render(
      createElement(OrderDetailScreen, {
        order: MINIMAL_ORDER,
        lang: 'ro',
        onBack: vi.fn(),
        onAdvance: vi.fn(),
        onPrint: vi.fn(),
        onCancel: vi.fn(),
        isOffline: false,
      }),
      { wrapper: w }
    )
    const chip = screen.getAllByText('Acceptată').find(el => el.closest('span.chip'))
    expect(chip).toBeTruthy()
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

// Production-shaped fixture per F-01: normalizeOrder always yields items: [], never null
// and never omitted, and always yields numeric subtotal/tax/deliveryFee/tip/discount
// (0-defaulted, never undefined — see data.jsx normalizeOrder). HISTORY_ORDER above omits
// these fields, which is fine for the tests that never reach ThermalTicket (items == null
// keeps the thermal rail unmounted); once items is an array the rail does mount, so these
// fixtures must carry the full numeric shape to match what getOrder() actually returns.
const HYDRATING_ORDER = { ...HISTORY_ORDER, items: [], subtotal: 118.50, tax: 10, deliveryFee: 0, tip: 0, discount: 0 }

const HYDRATED_ITEMS = [
  { name: 'Margherita', qty: 1, price: 32, mods: [], source: 'menu' },
  { name: 'Coca-Cola', qty: 2, price: 8, mods: [], source: 'menu' },
]
const HYDRATED_ORDER = { ...HISTORY_ORDER, items: HYDRATED_ITEMS, subtotal: 118.50, tax: 10, deliveryFee: 0, tip: 0, discount: 0 }

const DUPLICATE_ITEMS = [
  { name: 'Same Item', qty: 1, price: 20, mods: [], source: 'menu' },
  { name: 'Same Item', qty: 1, price: 20, mods: [], source: 'menu' },
]
const DUPLICATE_ITEMS_ORDER = { ...HISTORY_ORDER, items: DUPLICATE_ITEMS, subtotal: 118.50, tax: 10, deliveryFee: 0, tip: 0, discount: 0 }

describe('readOnly items-card states', () => {
  beforeEach(() => { vi.clearAllMocks() })

  test('detailLoading: exactly 3 skeleton rows render, no no-items line, no error title', () => {
    render(
      createElement(OrderDetailScreen, {
        order: HYDRATING_ORDER,
        lang: 'en',
        readOnly: true,
        detailLoading: true,
        onBack: vi.fn(),
      }),
      { wrapper: w }
    )
    expect(screen.getAllByTestId('detail-skeleton-row').length).toBe(3)
    expect(screen.queryByText('No items on this order')).toBeNull()
    expect(screen.queryByText("Couldn't load this receipt")).toBeNull()
  })

  test('detailLoading: the totals block still renders the formatted total', () => {
    render(
      createElement(OrderDetailScreen, {
        order: HYDRATING_ORDER,
        lang: 'en',
        readOnly: true,
        detailLoading: true,
        onBack: vi.fn(),
      }),
      { wrapper: w }
    )
    expect(screen.getByText('128,50 lei')).toBeTruthy()
  })

  test('detailError: error title, check-connection body, and Retry render; no skeleton, no no-items line', () => {
    render(
      createElement(OrderDetailScreen, {
        order: HYDRATING_ORDER,
        lang: 'ro',
        readOnly: true,
        detailError: true,
        onBack: vi.fn(),
        onRetryDetail: vi.fn(),
      }),
      { wrapper: w }
    )
    expect(screen.getByText('Nu am putut încărca bonul')).toBeTruthy()
    expect(screen.getByText('Verifică conexiunea și încearcă din nou.')).toBeTruthy()
    expect(screen.getByText('Reîncearcă')).toBeTruthy()
    expect(screen.queryAllByTestId('detail-skeleton-row').length).toBe(0)
    expect(screen.queryByText('Nicio poziție pe această comandă')).toBeNull()
  })

  test('detailError: the totals block still renders the formatted total', () => {
    render(
      createElement(OrderDetailScreen, {
        order: HYDRATING_ORDER,
        lang: 'en',
        readOnly: true,
        detailError: true,
        onBack: vi.fn(),
        onRetryDetail: vi.fn(),
      }),
      { wrapper: w }
    )
    expect(screen.getByText('128,50 lei')).toBeTruthy()
  })

  test('detailError: clicking Retry calls onRetryDetail exactly once', () => {
    const onRetryDetail = vi.fn()
    render(
      createElement(OrderDetailScreen, {
        order: HYDRATING_ORDER,
        lang: 'ro',
        readOnly: true,
        detailError: true,
        onBack: vi.fn(),
        onRetryDetail,
      }),
      { wrapper: w }
    )
    fireEvent.click(screen.getByText('Reîncearcă'))
    expect(onRetryDetail).toHaveBeenCalledTimes(1)
  })

  test('settled (both flags false) + empty items: the no-items line renders; totals render; no skeleton', () => {
    render(
      createElement(OrderDetailScreen, {
        order: HYDRATING_ORDER,
        lang: 'ro',
        readOnly: true,
        onBack: vi.fn(),
      }),
      { wrapper: w }
    )
    expect(screen.getByText('Nicio poziție pe această comandă')).toBeTruthy()
    expect(screen.getByText('128,50 lei')).toBeTruthy()
    expect(screen.queryAllByTestId('detail-skeleton-row').length).toBe(0)
  })

  test('settled + hydrated 2-item array: both item names render, no skeleton, no error, no no-items line', () => {
    render(
      createElement(OrderDetailScreen, {
        order: HYDRATED_ORDER,
        lang: 'en',
        readOnly: true,
        onBack: vi.fn(),
      }),
      { wrapper: w }
    )
    expect(screen.getByText('Margherita')).toBeTruthy()
    expect(screen.getByText('Coca-Cola')).toBeTruthy()
    expect(screen.queryAllByTestId('detail-skeleton-row').length).toBe(0)
    expect(screen.queryByText("Couldn't load this receipt")).toBeNull()
    expect(screen.queryByText('No items on this order')).toBeNull()
  })

  test('settled + two items with identical name/price/qty: both rows render in server order', () => {
    const { container } = render(
      createElement(OrderDetailScreen, {
        order: DUPLICATE_ITEMS_ORDER,
        lang: 'en',
        readOnly: true,
        onBack: vi.fn(),
      }),
      { wrapper: w }
    )
    const rows = screen.getAllByText('Same Item')
    expect(rows.length).toBe(2)
    // both rows present in the DOM in document order (server order preserved, no client sort)
    const containerRows = Array.from(container.querySelectorAll('div')).filter(d => d.textContent === 'Same Item')
    expect(containerRows.length).toBeGreaterThanOrEqual(2)
  })

  test('NOT readOnly + MINIMAL_ORDER, both flags omitted: renders exactly as today', () => {
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
    expect(screen.getByText('Pizza')).toBeTruthy()
    expect(screen.queryAllByTestId('detail-skeleton-row').length).toBe(0)
    expect(screen.queryByText("Couldn't load this receipt")).toBeNull()
  })

  test('skeleton row inline padding is 12px 18px and gap is 12, matching a real item row', () => {
    const { container } = render(
      createElement(OrderDetailScreen, {
        order: HYDRATING_ORDER,
        lang: 'en',
        readOnly: true,
        detailLoading: true,
        onBack: vi.fn(),
      }),
      { wrapper: w }
    )
    const row = container.querySelector('[data-testid="detail-skeleton-row"]')
    expect(row.style.padding).toBe('12px 18px')
    expect(row.style.gap).toBe('12px')
  })
})
