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

describe('PosScreen', () => {
  describe('POS-01: live menu from useMenu()', () => {
    test.todo('renders category tabs from useMenu() categories, not MENU_CATEGORIES static data')
    test.todo('does not import from data.jsx MENU_CATEGORIES or MENU_ITEMS')
  })
  describe('POS-02: cart quantity adjustment', () => {
    test.todo('clicking add on a menu item increments cart badge quantity')
    test.todo('clicking minus on a cart item decrements quantity; reaches 0 removes item')
  })
  describe('POS-03: order-level discount field', () => {
    test.todo('in pct mode: discountAmount = subtotal * discountValue / 100')
    test.todo('in ron mode: discountAmount = min(discountValue, subtotal)')
    test.todo('discount line is hidden when discountValue is empty or 0')
    test.todo('discount line shows negative formatted amount when discountAmount > 0')
  })
  describe('POS-04: order type selection', () => {
    test.todo('clicking dinein/pickup/delivery toggles order type state')
  })
  describe('POS-05: order submission to API', () => {
    test.todo('Ring Up calls kitchen.orders.create with orderType local (not dinein) for dine-in')
    test.todo('Ring Up body includes productId + quantity for each cart item')
    test.todo('on success: cart cleared, success toast pushed with dailyNumber')
    test.todo('Ring Up button disabled when cart is empty or isOffline')
  })
})
