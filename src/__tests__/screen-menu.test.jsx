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

describe('MenuScreen', () => {
  describe('MENU-02: live availability from useMenu()', () => {
    test.todo('renders item inStock state from useMenu() hook, not localStorage')
    test.todo('does not read from localStorage sc_avail key')
  })
  describe('MENU-01: availability toggle calls updateStock', () => {
    test.todo('toggling AvailSwitch calls updateStock with { body: { productId, inStock } } — no path param')
    test.todo('on success: invalidateQueries called with queryKey [menu]')
    test.todo('on error: error toast pushed')
  })
})
