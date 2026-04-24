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
vi.mock('../auth.jsx', () => ({ useAuth: vi.fn() }))
vi.mock('../use-menu.js', () => ({ useMenu: vi.fn() }))
vi.mock('../store.js', () => ({ useAppStore: vi.fn() }))

import { useAuth } from '../auth.jsx'
import { useMenu } from '../use-menu.js'
import { useAppStore } from '../store.js'
import { MenuScreen } from '../screen-menu.jsx'

const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
function w({ children }) { return createElement(QueryClientProvider, { client: qc }, children) }

const mockMenuData = {
  categories: [
    {
      id: 'cat1',
      name: 'Meniu principal',
      nameEn: 'Main menu',
      icon: 'utensils',
      products: [
        { id: 'p1', name: 'Sarmale', nameEn: 'Stuffed cabbage', price: 3500, inStock: true },
        { id: 'p2', name: 'Mici', nameEn: 'Grilled sausages', price: 2500, inStock: false },
      ],
    },
  ],
}

describe('MenuScreen', () => {
  let mockUpdateStock
  let mockInvalidateQueries
  let mockPushToast

  beforeEach(() => {
    mockUpdateStock = vi.fn().mockResolvedValue({})
    mockInvalidateQueries = vi.fn().mockResolvedValue(undefined)
    mockPushToast = vi.fn()

    useAuth.mockReturnValue({
      client: {
        kitchen: {
          products: {
            updateStock: mockUpdateStock,
          },
        },
      },
    })

    useMenu.mockReturnValue({
      data: mockMenuData,
      isLoading: false,
    })

    useAppStore.mockImplementation((selector) => {
      const state = { pushToast: mockPushToast }
      return selector(state)
    })

    // Clear the QueryClient between tests
    qc.clear()
  })

  describe('MENU-02: live availability from useMenu()', () => {
    test('renders item inStock state from useMenu() hook, not localStorage', () => {
      const localStorageGetSpy = vi.spyOn(Storage.prototype, 'getItem')

      render(createElement(MenuScreen, { lang: 'ro' }), { wrapper: w })

      // Should NOT read from localStorage for availability state
      expect(localStorageGetSpy).not.toHaveBeenCalledWith('sc_avail')

      // Items from useMenu() should be rendered
      expect(screen.getByText('Sarmale')).toBeTruthy()
      expect(screen.getByText('Mici')).toBeTruthy()

      localStorageGetSpy.mockRestore()
    })

    test('does not read from localStorage sc_avail key', () => {
      const localStorageGetSpy = vi.spyOn(Storage.prototype, 'getItem')
      const localStorageSetSpy = vi.spyOn(Storage.prototype, 'setItem')

      render(createElement(MenuScreen, { lang: 'ro' }), { wrapper: w })

      expect(localStorageGetSpy).not.toHaveBeenCalledWith('sc_avail')
      expect(localStorageSetSpy).not.toHaveBeenCalledWith('sc_avail', expect.anything())

      localStorageGetSpy.mockRestore()
      localStorageSetSpy.mockRestore()
    })
  })

  describe('MENU-01: availability toggle calls updateStock', () => {
    test('toggling AvailSwitch calls updateStock with { body: { productId, inStock } } — no path param', async () => {
      // p1 is inStock: true — toggle OFF should call updateStock with inStock: false
      render(createElement(MenuScreen, { lang: 'ro' }), { wrapper: w })

      // Find the in-stock toggle for p1 (Sarmale) — it should be a button
      const availButtons = screen.getAllByTitle(/Disponibil|Epuizat/)
      // p1 is inStock: true, so its title is 'Disponibil' (ro)
      const sarmaleSwitchButton = availButtons.find(btn => btn.title === 'Disponibil')
      expect(sarmaleSwitchButton).toBeTruthy()

      await act(async () => {
        fireEvent.click(sarmaleSwitchButton)
      })

      expect(mockUpdateStock).toHaveBeenCalledWith({
        body: { productId: 'p1', inStock: false },
      })

      // Verify NO path parameter was passed
      const callArgs = mockUpdateStock.mock.calls[0][0]
      expect(callArgs).not.toHaveProperty('path')
    })

    test('on success: invalidateQueries called with queryKey [menu]', async () => {
      // We need to verify that the onSuccess callback calls invalidateQueries
      // We use the QueryClient from the hook directly
      // Wire up the mock to call the onSuccess from the mutation
      const invalidateSpy = vi.spyOn(qc, 'invalidateQueries').mockResolvedValue(undefined)

      render(createElement(MenuScreen, { lang: 'ro' }), { wrapper: w })

      const availButtons = screen.getAllByTitle(/Disponibil|Epuizat/)
      const sarmaleSwitchButton = availButtons.find(btn => btn.title === 'Disponibil')

      // Make the mutation succeed
      mockUpdateStock.mockResolvedValueOnce({})

      await act(async () => {
        fireEvent.click(sarmaleSwitchButton)
      })

      await waitFor(() => {
        expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['menu'] })
      })

      invalidateSpy.mockRestore()
    })

    test('on error: error toast pushed', async () => {
      mockUpdateStock.mockRejectedValueOnce(new Error('Network error'))

      render(createElement(MenuScreen, { lang: 'ro' }), { wrapper: w })

      const availButtons = screen.getAllByTitle(/Disponibil|Epuizat/)
      const sarmaleSwitchButton = availButtons.find(btn => btn.title === 'Disponibil')

      await act(async () => {
        fireEvent.click(sarmaleSwitchButton)
      })

      await waitFor(() => {
        expect(mockPushToast).toHaveBeenCalledWith(
          expect.objectContaining({ kind: 'error' })
        )
      })
    })
  })
})
