// Tests for offline button disabled state — U12 (OFF-03)
// Wave 0 stub: tests fail RED until screens accept isOffline prop.

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

import { render } from '@testing-library/react'
import { OrdersScreen } from '../screen-orders.jsx'
import { KitchenScreen } from '../screen-kitchen.jsx'

// Minimal order fixture matching the Order type from the SDK
const mockOrder = {
  id: 'ord-001',
  dailyOrderNumber: 1,
  orderDate: new Date().toISOString(),
  status: 'NEW',
  orderType: 'local',
  paymentType: 'cash',
  customerName: 'Test',
  customerPhone: '0700000000',
  subtotal: 100,
  total: 100,
  notes: null,
  estimatedMinutes: null,
  currency: 'RON',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  items: [],
  events: [],
}

// ── U12: Mutating buttons disabled when isOffline=true (OFF-03) ───────────

describe('U12 — mutating buttons have disabled attribute and .btn-disabled-offline class when isOffline=true (OFF-03)', () => {
  test('OrdersScreen: action buttons are disabled when isOffline=true', () => {
    const { container } = render(
      <OrdersScreen
        orders={[mockOrder]}
        lang="en"
        onOpen={vi.fn()}
        onAdvance={vi.fn()}
        onPrint={vi.fn()}
        isOffline={true}
      />
    )
    const disabledButtons = container.querySelectorAll('.btn-disabled-offline')
    expect(disabledButtons.length).toBeGreaterThan(0)
    disabledButtons.forEach(btn => {
      expect(btn).toBeDisabled()
    })
  })

  test('OrdersScreen: action buttons are NOT disabled when isOffline=false', () => {
    const { container } = render(
      <OrdersScreen
        orders={[mockOrder]}
        lang="en"
        onOpen={vi.fn()}
        onAdvance={vi.fn()}
        onPrint={vi.fn()}
        isOffline={false}
      />
    )
    const disabledButtons = container.querySelectorAll('.btn-disabled-offline')
    expect(disabledButtons.length).toBe(0)
  })

  test('KitchenScreen: advance buttons are disabled when isOffline=true', () => {
    const { container } = render(
      <KitchenScreen
        orders={[mockOrder]}
        lang="en"
        onAdvance={vi.fn()}
        isOffline={true}
      />
    )
    const disabledButtons = container.querySelectorAll('.btn-disabled-offline')
    expect(disabledButtons.length).toBeGreaterThan(0)
    disabledButtons.forEach(btn => {
      expect(btn).toBeDisabled()
    })
  })
})
