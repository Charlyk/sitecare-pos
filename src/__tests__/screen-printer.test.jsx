import { describe, it, test, vi, expect, beforeEach } from 'vitest'
import { createElement } from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

vi.mock('@tauri-apps/plugin-store', () => ({
  load: vi.fn().mockResolvedValue({
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue(undefined),
    save: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(undefined),
  }),
}))
vi.mock('@charlyk/admin-client', () => ({ signIn: vi.fn(), createAdminClient: vi.fn() }))
vi.mock('@tauri-apps/plugin-opener', () => ({ open: vi.fn(), openUrl: vi.fn() }))
vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }))
vi.mock('../auth.jsx', () => ({ useAuth: vi.fn(() => ({ client: null, token: null })) }))
vi.mock('../store.js', () => ({
  useAppStore: vi.fn((selector) => selector ? selector({ lang: 'en', pushToast: vi.fn() }) : {}),
}))

const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
function w({ children }) { return createElement(QueryClientProvider, { client: qc }, children) }

import { invoke } from '@tauri-apps/api/core'
import { PrinterScreen } from '../screen-printer.jsx'

describe('PRNT-01: configure thermal printer', () => {
  beforeEach(() => { vi.clearAllMocks() })

  test('list_serial_ports invoke called on mount, populates port dropdown', () => {
    // STUB — fails until screen-printer.jsx calls invoke('list_serial_ports') on mount
    expect(false).toBe(true)
  })

  test('empty port list renders disabled "No ports found" option', () => {
    // STUB
    expect(false).toBe(true)
  })

  test('Save button invokes save_printer_config with port, name, paperWidth, baud 9600', () => {
    // STUB
    expect(false).toBe(true)
  })

  test('save success shows chip-sage "Printer connected" chip', () => {
    // STUB
    expect(false).toBe(true)
  })

  test('save failure shows chip-red "Connection failed" chip', () => {
    // STUB
    expect(false).toBe(true)
  })
})

describe('PRNT-02: test print from Printer Setup', () => {
  beforeEach(() => { vi.clearAllMocks() })

  test('Test Print button invokes test_print Tauri command', () => {
    // STUB
    expect(false).toBe(true)
  })

  test('Test Print button is disabled (opacity 0.45) when no config saved yet', () => {
    // STUB
    expect(false).toBe(true)
  })
})
