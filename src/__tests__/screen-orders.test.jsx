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

describe('OrdersScreen', () => {
  describe('ORD-01: live orders list with status filtering', () => {
    test.todo('renders orders from useOrders() hook, not static data')
    test.todo('filter "new" shows only orders with state === new')
    test.todo('filter "preparing" shows accepted + preparing orders')
    test.todo('filter "ready" shows ready + out orders')
  })
  describe('ORD-03: client-side search by order ID and customer name', () => {
    test.todo('search by dailyOrderNumber filters visible orders')
    test.todo('search by customer name (case-insensitive) filters visible orders')
    test.todo('search with no matches shows empty state with search-no-results copy')
    test.todo('clear button (x) appears when searchQuery.length > 0')
  })
})
