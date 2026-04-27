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
    // Set placedAt = now so elapsed ≈ 0; control remaining via promisedIn.
    function makeTicketOrder(promisedIn, state = 'new') {
      return {
        id: 'ticket-' + promisedIn,
        dailyOrderNumber: promisedIn,
        state,
        _state: state,
        type: 'dinein',
        placedAt: new Date().toISOString(),
        promisedIn,
        items: [{ name: 'Burger', qty: 1, price: 20, mods: [] }],
      }
    }

    test('ticket with remaining > 8 min has neutral border hsl(120 10% 90%)', async () => {
      const { KitchenScreen } = await import('../screen-kitchen.jsx')
      const order = makeTicketOrder(20) // remaining ≈ 20, neutral
      const { container } = render(
        createElement(w, null, createElement(KitchenScreen, {
          orders: [order], lang: 'en', onAdvance: vi.fn(), isOffline: false,
        }))
      )
      const card = container.querySelector('.card')
      expect(card).toBeTruthy()
      // jsdom normalizes hsl(120 10% 90%) → rgb(227, 232, 227) in inline styles.
      // Verify the neutral color is applied (not amber rgb(245,159,10) or terracotta).
      const styleAttr = card.getAttribute('style') ?? ''
      // Must contain rgb(227, 232, 227) — the RGB equivalent of hsl(120 10% 90%)
      expect(styleAttr).toContain('rgb(227, 232, 227)')
    })

    test('ticket with remaining <= 8 min has amber border hsl(38 92% 50%)', async () => {
      const { KitchenScreen } = await import('../screen-kitchen.jsx')
      const order = makeTicketOrder(5) // remaining ≈ 5 (≤8 and >3), amber
      const { container } = render(
        createElement(w, null, createElement(KitchenScreen, {
          orders: [order], lang: 'en', onAdvance: vi.fn(), isOffline: false,
        }))
      )
      const card = container.querySelector('.card')
      expect(card).toBeTruthy()
      // jsdom normalizes hsl(38 92% 50%) → rgb(245, 159, 10) in inline styles.
      const styleAttr = card.getAttribute('style') ?? ''
      expect(styleAttr).toContain('rgb(245, 159, 10)')
    })

    test('ticket with remaining <= 3 min has terracotta border var(--sc-terracotta)', async () => {
      const { KitchenScreen } = await import('../screen-kitchen.jsx')
      const order = makeTicketOrder(2) // remaining ≈ 2 (≤3), terracotta
      const { container } = render(
        createElement(w, null, createElement(KitchenScreen, {
          orders: [order], lang: 'en', onAdvance: vi.fn(), isOffline: false,
        }))
      )
      const card = container.querySelector('.card')
      expect(card).toBeTruthy()
      // CSS variables are kept as-is by jsdom — var(--sc-terracotta) stays in the attribute.
      const styleAttr = card.getAttribute('style') ?? ''
      expect(styleAttr).toContain('var(--sc-terracotta)')
    })
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
    test('clicking bump button calls onAdvance with the ticket order and next state', async () => {
      const { KitchenScreen } = await import('../screen-kitchen.jsx')
      const onAdvance = vi.fn()
      const order = {
        id: 'bump-order-1',
        dailyOrderNumber: 99,
        state: 'new',
        _state: 'new',
        type: 'dinein',
        placedAt: new Date().toISOString(),
        promisedIn: 20,
        items: [{ name: 'Pizza', qty: 1, price: 30, mods: [] }],
      }
      render(
        createElement(w, null, createElement(KitchenScreen, {
          orders: [order], lang: 'en', onAdvance, isOffline: false,
        }))
      )
      // The bump button in a 'new' ticket advances to 'accepted'
      // Its label comes from t('accept') which falls back to the key 'accept'
      const buttons = screen.getAllByRole('button')
      // Find the advance/bump button — it has btn-primary class and contains 'accept' text
      const bumpBtn = buttons.find(b => b.className.includes('btn-primary') && !b.disabled)
      expect(bumpBtn).toBeTruthy()
      fireEvent.click(bumpBtn)
      expect(onAdvance).toHaveBeenCalledTimes(1)
      // First arg is the order (with _state normalisation), second is 'accepted'
      expect(onAdvance.mock.calls[0][1]).toBe('accepted')
    })
  })
})
