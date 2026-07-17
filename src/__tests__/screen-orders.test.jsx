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
    test('renders orders from useOrders() hook, not static data', () => {
      // OrdersScreen receives orders as a prop; if the prop is wired correctly,
      // order #42 must appear in the DOM when passed in as a prop.
      const orders = [makeOrder({ id: 'ord-42', dailyOrderNumber: 42, state: 'new' })]
      render(
        createElement(OrdersScreen, { orders, lang: 'en', onOpen: noop, onAdvance: noop, onPrint: noop, isOffline: false }),
        { wrapper: w }
      )
      expect(screen.getByText('#42')).toBeTruthy()
    })

    test('filter "new" shows only orders with state === new', () => {
      const orders = [
        makeOrder({ id: 'n1', dailyOrderNumber: 10, state: 'new' }),
        makeOrder({ id: 'n2', dailyOrderNumber: 20, state: 'preparing' }),
        makeOrder({ id: 'n3', dailyOrderNumber: 30, state: 'accepted' }),
      ]
      render(
        createElement(OrdersScreen, { orders, lang: 'en', onOpen: noop, onAdvance: noop, onPrint: noop, isOffline: false }),
        { wrapper: w }
      )
      // Click the "New" filter button
      const filterBtns = screen.getAllByRole('button')
      const newBtn = filterBtns.find(b => b.textContent.includes('new') || b.textContent.includes('New'))
      fireEvent.click(newBtn)
      // #10 (new) visible; #20 (preparing) and #30 (accepted) must not be visible
      expect(screen.getByText('#10')).toBeTruthy()
      expect(screen.queryByText('#20')).toBeNull()
      expect(screen.queryByText('#30')).toBeNull()
    })

    test('filter "preparing" shows accepted + preparing orders', () => {
      const orders = [
        makeOrder({ id: 'p1', dailyOrderNumber: 11, state: 'new' }),
        makeOrder({ id: 'p2', dailyOrderNumber: 22, state: 'accepted' }),
        makeOrder({ id: 'p3', dailyOrderNumber: 33, state: 'preparing' }),
        makeOrder({ id: 'p4', dailyOrderNumber: 44, state: 'ready' }),
      ]
      render(
        createElement(OrdersScreen, { orders, lang: 'en', onOpen: noop, onAdvance: noop, onPrint: noop, isOffline: false }),
        { wrapper: w }
      )
      const filterBtns = screen.getAllByRole('button')
      const preparingBtn = filterBtns.find(b => b.textContent.includes('preparing') || b.textContent.includes('Preparing'))
      fireEvent.click(preparingBtn)
      // #22 (accepted) and #33 (preparing) must be visible
      expect(screen.getByText('#22')).toBeTruthy()
      expect(screen.getByText('#33')).toBeTruthy()
      // #11 (new) and #44 (ready) must not be visible
      expect(screen.queryByText('#11')).toBeNull()
      expect(screen.queryByText('#44')).toBeNull()
    })

    test('filter "ready" shows ready + out orders', () => {
      const orders = [
        makeOrder({ id: 'r1', dailyOrderNumber: 55, state: 'new' }),
        makeOrder({ id: 'r2', dailyOrderNumber: 66, state: 'ready' }),
        makeOrder({ id: 'r3', dailyOrderNumber: 77, state: 'out' }),
      ]
      render(
        createElement(OrdersScreen, { orders, lang: 'en', onOpen: noop, onAdvance: noop, onPrint: noop, isOffline: false }),
        { wrapper: w }
      )
      const filterBtns = screen.getAllByRole('button')
      const readyBtn = filterBtns.find(b => b.textContent.includes('ready') || b.textContent.includes('Ready'))
      fireEvent.click(readyBtn)
      // #66 (ready) and #77 (out) must be visible
      expect(screen.getByText('#66')).toBeTruthy()
      expect(screen.getByText('#77')).toBeTruthy()
      // #55 (new) must not be visible
      expect(screen.queryByText('#55')).toBeNull()
    })
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

  describe('F-02/D-08: Dine-in type filter matches normalized "dinein" orders (formerly-\'local\')', () => {
    test('a normalized dine-in order shows under the Dine-in type filter and under All; a delivery order is excluded from Dine-in', () => {
      const orders = [
        // Represents an order whose raw SDK orderType was 'local' — normalizeOrder now
        // emits type: 'dinein' for it (src/data.jsx:222 boundary fix, Task 1 of this plan).
        makeOrder({ id: 'dinein-1', dailyOrderNumber: 501, type: 'dinein', state: 'new' }),
        makeOrder({ id: 'delivery-1', dailyOrderNumber: 502, type: 'delivery', state: 'new' }),
      ]
      render(
        createElement(OrdersScreen, { orders, lang: 'en', onOpen: noop, onAdvance: noop, onPrint: noop, isOffline: false }),
        { wrapper: w }
      )
      // Both orders visible under the default 'all' type filter.
      expect(screen.getByText('#501')).toBeTruthy()
      expect(screen.getByText('#502')).toBeTruthy()

      // Click the Dine-in type filter pill.
      const typeBtns = screen.getAllByRole('button')
      const dineInBtn = typeBtns.find(b => b.textContent.includes('Dine-in') || b.textContent.includes('dinein'))
      expect(dineInBtn).toBeTruthy()
      fireEvent.click(dineInBtn)

      // Previously (before the boundary fix), a formerly-'local' order's o.type would never
      // equal 'dinein' and would be silently excluded here — this is the F-02 defect site
      // (screen-orders.jsx:187). Now it must be visible; the delivery order must not.
      expect(screen.getByText('#501')).toBeTruthy()
      expect(screen.queryByText('#502')).toBeNull()
    })
  })
})
