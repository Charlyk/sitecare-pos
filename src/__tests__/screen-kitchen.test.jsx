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
    test('setInterval is called with 60000ms (not 30000ms)', async () => {
      const spy = vi.spyOn(globalThis, 'setInterval')
      const { KitchenScreen } = await import('../screen-kitchen.jsx')
      render(createElement(w, null, createElement(KitchenScreen, { orders: [], lang: 'en', onAdvance: vi.fn(), isOffline: false })))
      // Check that setInterval was called with 60000
      const called60k = spy.mock.calls.some(call => call[1] === 60000)
      expect(called60k).toBe(true)
      // Check that setInterval was NOT called with 30000
      const called30k = spy.mock.calls.some(call => call[1] === 30000)
      expect(called30k).toBe(false)
      spy.mockRestore()
    })
  })

  describe('KDS-03: urgency colors by age', () => {
    test.todo('ticket with remaining > 8 min has neutral border hsl(120 10% 90%)')
    test.todo('ticket with remaining <= 8 min has amber border hsl(38 92% 50%)')
    test.todo('ticket with remaining <= 3 min has terracotta border var(--sc-terracotta)')
  })

  describe('KDS-04: mute toggle button', () => {
    test('mute toggle button is visible in KDS screen header', async () => {
      const { KitchenScreen } = await import('../screen-kitchen.jsx')
      render(createElement(w, null, createElement(KitchenScreen, { orders: [], lang: 'en', onAdvance: vi.fn(), isOffline: false })))
      // Should render a button with sound_on label when not muted (default)
      const muteBtn = screen.getByRole('button', { name: /sound on/i })
      expect(muteBtn).toBeTruthy()
    })

    test('mute toggle button has btn-secondary class', async () => {
      const { KitchenScreen } = await import('../screen-kitchen.jsx')
      render(createElement(w, null, createElement(KitchenScreen, { orders: [], lang: 'en', onAdvance: vi.fn(), isOffline: false })))
      const muteBtn = screen.getByRole('button', { name: /sound on/i })
      expect(muteBtn.className).toContain('btn-secondary')
    })

    test('clicking mute toggle changes label to muted', async () => {
      const { KitchenScreen } = await import('../screen-kitchen.jsx')
      render(createElement(w, null, createElement(KitchenScreen, { orders: [], lang: 'en', onAdvance: vi.fn(), isOffline: false })))
      const muteBtn = screen.getByRole('button', { name: /sound on/i })
      fireEvent.click(muteBtn)
      // After click, soundMuted becomes true — button label should change to 'Muted'
      const mutedBtn = screen.getByRole('button', { name: /muted/i })
      expect(mutedBtn).toBeTruthy()
    })
  })

  describe('KDS-05: bump button advances ticket', () => {
    test.todo('clicking bump button calls onAdvance with the ticket order and next state')
  })
})
