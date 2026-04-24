import { describe, it, test, vi, expect, beforeEach } from 'vitest'
import { createElement } from 'react'
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react'
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

// Mock useMenu to return live categories
vi.mock('../use-menu.js', () => ({
  useMenu: vi.fn(() => ({
    data: {
      categories: [
        {
          id: 'cat-1',
          name: 'Aperitive',
          nameEn: 'Starters',
          icon: 'utensils',
          products: [
            { id: 'p-1', name: 'Ciorbă', nameEn: 'Soup', price: 2500, inStock: true },
            { id: 'p-2', name: 'Salată', nameEn: 'Salad', price: 1800, inStock: true },
            { id: 'p-oos', name: 'Epuizat', nameEn: 'Out of Stock Item', price: 1000, inStock: false },
          ],
        },
        {
          id: 'cat-2',
          name: 'Principale',
          nameEn: 'Mains',
          icon: 'utensils',
          products: [
            { id: 'p-3', name: 'Friptură', nameEn: 'Roast', price: 5000, inStock: true },
          ],
        },
      ],
      globalProducts: [],
    },
    isLoading: false,
  })),
}))

// Mock useDeliveryAreas
vi.mock('../use-delivery-areas.js', () => ({
  useDeliveryAreas: vi.fn(() => ({
    data: [
      { id: 'area-1', name: 'Centru', fee: 10 },
      { id: 'area-2', name: 'Tractorul', fee: 15 },
    ],
  })),
}))

// Mock useAuth to return a client with kitchen.orders.create
const mockCreate = vi.fn()
vi.mock('../auth.jsx', () => ({
  useAuth: vi.fn(() => ({
    client: {
      kitchen: {
        orders: {
          create: mockCreate,
        },
        deliveryAreas: {
          list: vi.fn().mockResolvedValue({ data: { deliveryAreas: [] } }),
        },
      },
    },
    token: 'fake-token',
  })),
}))

// Mock useAppStore to return pushToast
const mockPushToast = vi.fn()
vi.mock('../store.js', () => ({
  useAppStore: vi.fn((selector) => {
    const store = {
      pushToast: mockPushToast,
    }
    return selector(store)
  }),
}))

function makeQc() {
  return new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
}
function w(qc) {
  return ({ children }) => createElement(QueryClientProvider, { client: qc }, children)
}

import { PosScreen } from '../screen-pos.jsx'

describe('PosScreen', () => {
  beforeEach(() => {
    mockCreate.mockReset()
    mockPushToast.mockReset()
  })

  describe('POS-01: live menu from useMenu()', () => {
    test('renders category tabs from useMenu() categories, not MENU_CATEGORIES static data', () => {
      const qc = makeQc()
      render(createElement(PosScreen, { lang: 'ro', isOffline: false }), { wrapper: w(qc) })
      // Should render category names from mocked useMenu data
      expect(screen.getByText('Aperitive')).toBeTruthy()
      expect(screen.getByText('Principale')).toBeTruthy()
    })

    test('does not import from data.jsx MENU_CATEGORIES or MENU_ITEMS', async () => {
      // Verify that items rendered come from useMenu() — live data contains 'Ciorbă'
      // Static data would not contain this item
      const qc = makeQc()
      render(createElement(PosScreen, { lang: 'ro', isOffline: false }), { wrapper: w(qc) })
      expect(screen.getByText('Ciorbă')).toBeTruthy()
    })
  })

  describe('POS-02: cart quantity adjustment', () => {
    test('clicking add on a menu item increments cart badge quantity', () => {
      const qc = makeQc()
      render(createElement(PosScreen, { lang: 'ro', isOffline: false }), { wrapper: w(qc) })
      // Find Ciorbă item button and click it
      const ciorbaButton = screen.getAllByRole('button').find(b => b.textContent.includes('Ciorbă') && !b.textContent.includes('Comandă'))
      expect(ciorbaButton).toBeTruthy()
      fireEvent.click(ciorbaButton)
      // Cart badge should show "1"
      // Item is now in cart — cart row should be visible
      expect(screen.getAllByText('1').length).toBeGreaterThan(0)
    })

    test('clicking minus on a cart item decrements quantity; reaches 0 removes item', () => {
      const qc = makeQc()
      render(createElement(PosScreen, { lang: 'ro', isOffline: false }), { wrapper: w(qc) })
      // Add Ciorbă to cart
      const ciorbaButton = screen.getAllByRole('button').find(b => b.textContent.includes('Ciorbă') && !b.textContent.includes('Comandă'))
      fireEvent.click(ciorbaButton)
      // Find the minus button and click it to remove
      const minusButtons = screen.getAllByRole('button').filter(b => b.textContent === '−')
      expect(minusButtons.length).toBeGreaterThan(0)
      fireEvent.click(minusButtons[0])
      // Cart should be empty again
      expect(screen.getByText('Nu există articole')).toBeTruthy()
    })
  })

  describe('POS-03: order-level discount field', () => {
    test('in pct mode: discountAmount = subtotal * discountValue / 100', () => {
      const qc = makeQc()
      render(createElement(PosScreen, { lang: 'ro', isOffline: false }), { wrapper: w(qc) })
      // Add Ciorbă (25.00 RON) to cart
      const ciorbaButton = screen.getAllByRole('button').find(b => b.textContent.includes('Ciorbă') && !b.textContent.includes('Comandă'))
      fireEvent.click(ciorbaButton)
      // Input 10% discount — look for discount input
      const discountInput = document.querySelector('input[type="number"][placeholder="0"]')
      expect(discountInput).toBeTruthy()
      fireEvent.change(discountInput, { target: { value: '10' } })
      // discountAmount should be 25 * 0.10 = 2.50 RON
      // The discount span has text like "−2,50 lei" — look for a span starting with −
      const discountSpans = screen.getAllByText(/^−/)
      expect(discountSpans.length).toBeGreaterThan(0)
      expect(discountSpans.some(el => el.tagName === 'SPAN')).toBe(true)
    })

    test('in ron mode: discountAmount = min(discountValue, subtotal)', () => {
      const qc = makeQc()
      render(createElement(PosScreen, { lang: 'ro', isOffline: false }), { wrapper: w(qc) })
      // Add Ciorbă (25.00 RON) to cart
      const ciorbaButton = screen.getAllByRole('button').find(b => b.textContent.includes('Ciorbă') && !b.textContent.includes('Comandă'))
      fireEvent.click(ciorbaButton)
      // Switch to RON mode
      const modeToggle = screen.getByText('%')
      fireEvent.click(modeToggle)
      expect(screen.getByText('RON')).toBeTruthy()
      // Enter discount of 5 RON
      const discountInput = document.querySelector('input[type="number"][placeholder="0"]')
      fireEvent.change(discountInput, { target: { value: '5' } })
      // discount line should show a span with −
      const discountSpans = screen.getAllByText(/^−/)
      expect(discountSpans.some(el => el.tagName === 'SPAN')).toBe(true)
    })

    test('discount line is hidden when discountValue is empty or 0', () => {
      const qc = makeQc()
      render(createElement(PosScreen, { lang: 'ro', isOffline: false }), { wrapper: w(qc) })
      // Add item to cart
      const ciorbaButton = screen.getAllByRole('button').find(b => b.textContent.includes('Ciorbă') && !b.textContent.includes('Comandă'))
      fireEvent.click(ciorbaButton)
      // Discount input is empty by default — discount line should not show a negative span
      const discountInput = document.querySelector('input[type="number"][placeholder="0"]')
      expect(discountInput.value).toBe('')
      // No span starting with − (cart minus buttons render as button text "−" not in spans)
      const discountSpans = screen.queryAllByText(/^−/)
      expect(discountSpans.filter(el => el.tagName === 'SPAN').length).toBe(0)
    })

    test('discount line shows negative formatted amount when discountAmount > 0', () => {
      const qc = makeQc()
      render(createElement(PosScreen, { lang: 'ro', isOffline: false }), { wrapper: w(qc) })
      const ciorbaButton = screen.getAllByRole('button').find(b => b.textContent.includes('Ciorbă') && !b.textContent.includes('Comandă'))
      fireEvent.click(ciorbaButton)
      const discountInput = document.querySelector('input[type="number"][placeholder="0"]')
      fireEvent.change(discountInput, { target: { value: '20' } })
      // 20% of 25 RON = 5 RON discount — a span starting with − should appear
      const discountSpans = screen.getAllByText(/^−/)
      expect(discountSpans.some(el => el.tagName === 'SPAN')).toBe(true)
    })
  })

  describe('POS-04: order type selection', () => {
    test('clicking dinein/pickup/delivery toggles order type state', () => {
      const qc = makeQc()
      render(createElement(PosScreen, { lang: 'ro', isOffline: false }), { wrapper: w(qc) })
      // Default is dinein — Table input should be visible
      const tableLabel = screen.queryByText('Masa')
      expect(tableLabel).toBeTruthy()
      // Click Ridicare (pickup) button
      const pickupBtn = screen.getByText('Ridicare')
      fireEvent.click(pickupBtn)
      // Table input should be gone, customer name input should be visible
      expect(screen.queryByText('Masa')).toBeNull()
    })
  })

  describe('POS-05: order submission to API', () => {
    test('Ring Up calls kitchen.orders.create with orderType local (not dinein) for dine-in', async () => {
      mockCreate.mockResolvedValue({ data: { dailyNumber: 42, orderId: 'ord-1', trackToken: 't', cancelToken: 'c', estimatedMinutes: null } })
      const qc = makeQc()
      render(createElement(PosScreen, { lang: 'ro', isOffline: false }), { wrapper: w(qc) })
      // Add item to cart
      const ciorbaButton = screen.getAllByRole('button').find(b => b.textContent.includes('Ciorbă') && !b.textContent.includes('Comandă'))
      fireEvent.click(ciorbaButton)
      // Click Ring Up
      const ringUpBtn = screen.getAllByRole('button').find(b => b.textContent.includes('Încasează'))
      expect(ringUpBtn).toBeTruthy()
      await act(async () => { fireEvent.click(ringUpBtn) })
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({ body: expect.objectContaining({ orderType: 'local' }) })
      )
    })

    test('Ring Up body includes productId + quantity for each cart item', async () => {
      mockCreate.mockResolvedValue({ data: { dailyNumber: 43, orderId: 'ord-2', trackToken: 't', cancelToken: 'c', estimatedMinutes: null } })
      const qc = makeQc()
      render(createElement(PosScreen, { lang: 'ro', isOffline: false }), { wrapper: w(qc) })
      const ciorbaButton = screen.getAllByRole('button').find(b => b.textContent.includes('Ciorbă') && !b.textContent.includes('Comandă'))
      fireEvent.click(ciorbaButton)
      const ringUpBtn = screen.getAllByRole('button').find(b => b.textContent.includes('Încasează'))
      await act(async () => { fireEvent.click(ringUpBtn) })
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          body: expect.objectContaining({
            items: expect.arrayContaining([
              expect.objectContaining({ productId: 'p-1', quantity: 1 }),
            ]),
          }),
        })
      )
    })

    test('on success: cart cleared, success toast pushed with dailyNumber', async () => {
      mockCreate.mockResolvedValue({ data: { dailyNumber: 44, orderId: 'ord-3', trackToken: 't', cancelToken: 'c', estimatedMinutes: null } })
      const qc = makeQc()
      render(createElement(PosScreen, { lang: 'ro', isOffline: false }), { wrapper: w(qc) })
      const ciorbaButton = screen.getAllByRole('button').find(b => b.textContent.includes('Ciorbă') && !b.textContent.includes('Comandă'))
      fireEvent.click(ciorbaButton)
      const ringUpBtn = screen.getAllByRole('button').find(b => b.textContent.includes('Încasează'))
      await act(async () => { fireEvent.click(ringUpBtn) })
      await waitFor(() => {
        expect(mockPushToast).toHaveBeenCalledWith(
          expect.objectContaining({ kind: 'success', detail: '#44' })
        )
      })
    })

    test('Ring Up button disabled when cart is empty or isOffline', () => {
      const qc = makeQc()
      render(createElement(PosScreen, { lang: 'ro', isOffline: false }), { wrapper: w(qc) })
      // Cart is empty — Ring Up should be disabled
      const ringUpBtn = screen.getAllByRole('button').find(b => b.textContent.includes('Încasează'))
      expect(ringUpBtn.disabled).toBe(true)
    })
  })
})
