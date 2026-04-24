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

describe('SettingsScreen', () => {
  describe('Display tab exists', () => {
    test.todo('Display tab is visible in the tab list')
    test.todo('clicking Display tab shows the display pane content')
  })
  describe('SET-01: language toggle', () => {
    test.todo('clicking RO button calls setLang("ro")')
    test.todo('clicking EN button calls setLang("en")')
  })
  describe('SET-02: density toggle', () => {
    test.todo('clicking Balanced calls setDensity("balanced")')
    test.todo('clicking Dense/Compact calls setDensity("dense")')
  })
  describe('SET-03: accent color picker', () => {
    test.todo('clicking sage swatch calls setAccent("sage")')
    test.todo('clicking indigo swatch calls setAccent("indigo")')
    test.todo('clicking terracotta swatch calls setAccent("terracotta")')
    test.todo('clicking charcoal swatch calls setAccent("charcoal")')
  })
})
