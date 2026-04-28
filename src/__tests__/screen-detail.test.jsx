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
