import { describe, it, test, vi, expect, beforeEach } from 'vitest'
import { createElement } from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

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
vi.mock('../auth.jsx', () => ({ useAuth: vi.fn(() => ({ client: null, token: null })) }))

const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
function w({ children }) { return createElement(QueryClientProvider, { client: qc }, children) }

// Helper — make a minimal NormalizedOrder for tests
function makeOrder(overrides = {}) {
  return {
    id: overrides.id ?? 'order-1',
    dailyOrderNumber: overrides.dailyOrderNumber ?? 42,
    state: overrides.state ?? 'new',
    type: overrides.type ?? 'dinein',
    source: 'counter',
    payment: 'cash',
    placedAt: new Date().toISOString(),
    customer: { name: overrides.customerName ?? 'Test User', phone: null },
    total: 50,
    subtotal: 50,
    deliveryFee: 0,
    tax: 0,
    tip: 0,
    items: [{ name: 'Item 1', qty: 1, price: 50, mods: [] }],
    ...overrides,
  }
}

import { OrdersScreen } from '../screen-orders.jsx'

describe('OrdersScreen', () => {
  const noop = () => {}

  describe('ORD-01: live orders list with status filtering', () => {
    test.todo('renders orders from useOrders() hook, not static data')
    test.todo('filter "new" shows only orders with state === new')
    test.todo('filter "preparing" shows accepted + preparing orders')
    test.todo('filter "ready" shows ready + out orders')
  })

  describe('ORD-03: client-side search by order ID and customer name', () => {
    test('search by dailyOrderNumber filters visible orders', () => {
      const orders = [
        makeOrder({ id: 'a', dailyOrderNumber: 100, customerName: 'Alice Smith', state: 'new' }),
        makeOrder({ id: 'b', dailyOrderNumber: 200, customerName: 'Bob Jones', state: 'new' }),
      ]
      const { container } = render(
        createElement(OrdersScreen, { orders, lang: 'en', onOpen: noop, onAdvance: noop, onPrint: noop, isOffline: false }),
        { wrapper: w }
      )
      // Find the search input and type the order number
      const searchInput = container.querySelector('input[type="search"]')
      expect(searchInput).toBeTruthy()
      fireEvent.change(searchInput, { target: { value: '100' } })
      // Should show #100 and NOT show #200
      expect(screen.getByText('#100')).toBeTruthy()
      expect(screen.queryByText('#200')).toBeNull()
    })

    test('search by customer name (case-insensitive) filters visible orders', () => {
      const orders = [
        makeOrder({ id: 'a', dailyOrderNumber: 1, customerName: 'Alice Smith', state: 'new' }),
        makeOrder({ id: 'b', dailyOrderNumber: 2, customerName: 'Bob Jones', state: 'new' }),
      ]
      const { container } = render(
        createElement(OrdersScreen, { orders, lang: 'en', onOpen: noop, onAdvance: noop, onPrint: noop, isOffline: false }),
        { wrapper: w }
      )
      const searchInput = container.querySelector('input[type="search"]')
      // Type lowercase name — should still match (case-insensitive)
      fireEvent.change(searchInput, { target: { value: 'alice' } })
      expect(screen.getByText('Alice Smith')).toBeTruthy()
      expect(screen.queryByText('Bob Jones')).toBeNull()
    })

    test('search with no matches shows empty state with search-no-results copy', () => {
      const orders = [
        makeOrder({ id: 'a', dailyOrderNumber: 1, customerName: 'Alice Smith', state: 'new' }),
      ]
      const { container } = render(
        createElement(OrdersScreen, { orders, lang: 'en', onOpen: noop, onAdvance: noop, onPrint: noop, isOffline: false }),
        { wrapper: w }
      )
      const searchInput = container.querySelector('input[type="search"]')
      fireEvent.change(searchInput, { target: { value: 'zzznomatch999' } })
      // Should show search-no-results key (returned as-is when key missing, or translated string)
      const noResultsHeading = screen.queryByText('No results') ?? screen.queryByText('search_no_results')
      expect(noResultsHeading).toBeTruthy()
    })

    test('clear button (x) appears when searchQuery.length > 0', () => {
      const orders = [makeOrder({ state: 'new' })]
      const { container } = render(
        createElement(OrdersScreen, { orders, lang: 'en', onOpen: noop, onAdvance: noop, onPrint: noop, isOffline: false }),
        { wrapper: w }
      )
      const searchInput = container.querySelector('input[type="search"]')
      // Before typing — no clear button expected
      // After typing — clear button should appear
      fireEvent.change(searchInput, { target: { value: 'abc' } })
      // The clear button has an x icon; look for a button that clears the input
      // After clicking clear, input value should be ''
      const clearBtn = container.querySelector('button[class*="clear"], input[type="search"] ~ button') ??
        Array.from(container.querySelectorAll('button')).find(b => b.closest('[style*="position: relative"]') && b !== container.querySelector('.btn-primary') && b !== container.querySelector('.btn-secondary'))
      // The clear button exists when query > 0
      expect(searchInput.value).toBe('abc')
      // Find the clear button by looking for buttons in the search container area
      const searchContainer = searchInput.closest('[style*="relative"]') ?? searchInput.parentElement
      const btns = searchContainer ? searchContainer.querySelectorAll('button') : []
      expect(btns.length).toBeGreaterThan(0)
    })
  })
})
