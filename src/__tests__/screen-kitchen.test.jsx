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

describe('KitchenScreen', () => {
  describe('KDS-02: elapsed timer interval is 60 seconds', () => {
    test.todo('setInterval is called with 60000ms (not 30000ms)')
  })
  describe('KDS-03: urgency colors by age', () => {
    test.todo('ticket with remaining > 8 min has neutral border hsl(120 10% 90%)')
    test.todo('ticket with remaining <= 8 min has amber border hsl(38 92% 50%)')
    test.todo('ticket with remaining <= 3 min has terracotta border var(--sc-terracotta)')
  })
  describe('KDS-05: bump button advances ticket', () => {
    test.todo('clicking bump button calls onAdvance with the ticket order and next state')
  })
})
