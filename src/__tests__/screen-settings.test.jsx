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

// Capture setter spies at module level so they are available after vi.mock hoisting
const mockSetLang = vi.fn()
const mockSetDensity = vi.fn()
const mockSetAccent = vi.fn()

vi.mock('../store.js', () => ({
  useAppStore: vi.fn((selector) => {
    const state = {
      lang: 'en',
      density: 'balanced',
      accent: 'sage',
      setLang: mockSetLang,
      setDensity: mockSetDensity,
      setAccent: mockSetAccent,
    }
    return selector ? selector(state) : state
  }),
}))

beforeEach(() => {
  mockSetLang.mockClear()
  mockSetDensity.mockClear()
  mockSetAccent.mockClear()
})

import { SettingsScreen } from '../screen-settings.jsx'

const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
function w({ children }) { return createElement(QueryClientProvider, { client: qc }, children) }

function renderSettings(lang = 'ro') {
  return render(createElement(SettingsScreen, { lang }), { wrapper: w })
}

describe('SettingsScreen', () => {
  describe('Display tab exists', () => {
    test('Display tab is visible in the tab list', () => {
      renderSettings('en')
      expect(screen.getByText('Display')).toBeTruthy()
    })

    test('clicking Display tab shows the display pane content', () => {
      renderSettings('en')
      fireEvent.click(screen.getByText('Display'))
      // Language section label should appear
      expect(screen.getByText('Language')).toBeTruthy()
    })
  })

  describe('SET-01: language toggle', () => {
    test('clicking RO button calls setLang("ro")', () => {
      renderSettings('en')
      fireEvent.click(screen.getByText('Display'))
      fireEvent.click(screen.getByText('Română'))
      expect(mockSetLang).toHaveBeenCalledWith('ro')
    })

    test('clicking EN button calls setLang("en")', () => {
      renderSettings('en')
      fireEvent.click(screen.getByText('Display'))
      fireEvent.click(screen.getByText('English'))
      expect(mockSetLang).toHaveBeenCalledWith('en')
    })
  })

  describe('SET-02: density toggle', () => {
    test('clicking Balanced calls setDensity("balanced")', () => {
      renderSettings('en')
      fireEvent.click(screen.getByText('Display'))
      fireEvent.click(screen.getByText('Balanced'))
      expect(mockSetDensity).toHaveBeenCalledWith('balanced')
    })

    test('clicking Dense/Compact calls setDensity("dense")', () => {
      renderSettings('en')
      fireEvent.click(screen.getByText('Display'))
      fireEvent.click(screen.getByText('Dense'))
      expect(mockSetDensity).toHaveBeenCalledWith('dense')
    })
  })

  describe('SET-03: accent color picker', () => {
    test('clicking sage swatch calls setAccent("sage")', () => {
      renderSettings('en')
      fireEvent.click(screen.getByText('Display'))
      fireEvent.click(screen.getByTitle('sage'))
      expect(mockSetAccent).toHaveBeenCalledWith('sage')
    })

    test('clicking indigo swatch calls setAccent("indigo")', () => {
      renderSettings('en')
      fireEvent.click(screen.getByText('Display'))
      fireEvent.click(screen.getByTitle('indigo'))
      expect(mockSetAccent).toHaveBeenCalledWith('indigo')
    })

    test('clicking terracotta swatch calls setAccent("terracotta")', () => {
      renderSettings('en')
      fireEvent.click(screen.getByText('Display'))
      fireEvent.click(screen.getByTitle('terracotta'))
      expect(mockSetAccent).toHaveBeenCalledWith('terracotta')
    })

    test('clicking charcoal swatch calls setAccent("charcoal")', () => {
      renderSettings('en')
      fireEvent.click(screen.getByText('Display'))
      fireEvent.click(screen.getByTitle('charcoal'))
      expect(mockSetAccent).toHaveBeenCalledWith('charcoal')
    })
  })
})
