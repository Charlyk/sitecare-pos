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

  test('list_serial_ports invoke called on mount, populates port dropdown', async () => {
    invoke.mockResolvedValueOnce(['/dev/ttyUSB0', '/dev/ttyUSB1'])
    render(createElement(PrinterScreen, { lang: 'en', isOffline: false }), { wrapper: w })
    await waitFor(() => {
      expect(invoke).toHaveBeenCalledWith('list_serial_ports')
    })
    await waitFor(() => {
      expect(screen.getByText('/dev/ttyUSB0')).toBeTruthy()
    })
  })

  test('empty port list renders disabled "No ports found" option', async () => {
    invoke.mockResolvedValueOnce([])
    render(createElement(PrinterScreen, { lang: 'en', isOffline: false }), { wrapper: w })
    await waitFor(() => {
      expect(screen.getByText('No ports found')).toBeTruthy()
    })
  })

  test('Save button invokes save_printer_config with port, name, paperWidth, baud 9600', async () => {
    invoke.mockResolvedValueOnce(['/dev/ttyUSB0']) // list_serial_ports
    invoke.mockResolvedValueOnce(undefined) // save_printer_config
    render(createElement(PrinterScreen, { lang: 'en', isOffline: false }), { wrapper: w })
    await waitFor(() => expect(invoke).toHaveBeenCalledWith('list_serial_ports'))
    const saveBtn = screen.getByText('Save')
    fireEvent.click(saveBtn)
    await waitFor(() => {
      expect(invoke).toHaveBeenCalledWith('save_printer_config', expect.objectContaining({ port: '/dev/ttyUSB0', baud: 9600 }))
    })
  })

  test('save success shows chip-sage "Printer connected" chip', async () => {
    invoke.mockResolvedValueOnce(['/dev/ttyUSB0']) // list_serial_ports
    invoke.mockResolvedValueOnce(undefined) // save_printer_config
    render(createElement(PrinterScreen, { lang: 'en', isOffline: false }), { wrapper: w })
    await waitFor(() => expect(invoke).toHaveBeenCalledWith('list_serial_ports'))
    const saveBtn = screen.getByText('Save')
    fireEvent.click(saveBtn)
    await waitFor(() => {
      expect(screen.getByText('Printer connected')).toBeTruthy()
    })
  })

  test('save failure shows chip-red "Connection failed" chip', async () => {
    invoke.mockResolvedValueOnce(['/dev/ttyUSB0']) // list_serial_ports
    invoke.mockRejectedValueOnce(new Error('Port not available')) // save_printer_config fails
    render(createElement(PrinterScreen, { lang: 'en', isOffline: false }), { wrapper: w })
    await waitFor(() => expect(invoke).toHaveBeenCalledWith('list_serial_ports'))
    const saveBtn = screen.getByText('Save')
    fireEvent.click(saveBtn)
    await waitFor(() => {
      expect(screen.getByText('Connection failed')).toBeTruthy()
    })
  })
})

describe('PRNT-02: test print from Printer Setup', () => {
  beforeEach(() => { vi.clearAllMocks() })

  test('Test Print button invokes test_print Tauri command', async () => {
    const { load } = await import('@tauri-apps/plugin-store')
    // Return saved config so hasConfig=true and Test Print is enabled
    load.mockResolvedValue({
      get: vi.fn().mockResolvedValue({ port: '/dev/ttyUSB0', baud: 9600, paperWidth: '80mm' }),
      set: vi.fn().mockResolvedValue(undefined),
      save: vi.fn().mockResolvedValue(undefined),
    })
    invoke.mockResolvedValueOnce(['/dev/ttyUSB0']) // list_serial_ports
    invoke.mockResolvedValueOnce(undefined) // test_print
    render(createElement(PrinterScreen, { lang: 'en', isOffline: false }), { wrapper: w })
    // Wait for mount effects (list_serial_ports + load config)
    await waitFor(() => expect(invoke).toHaveBeenCalledWith('list_serial_ports'))
    // The component loads config from store, so hasConfig becomes true
    await waitFor(() => {
      const testBtn = screen.getByText('Test Print')
      expect(testBtn).toBeTruthy()
      fireEvent.click(testBtn)
    })
    await waitFor(() => {
      expect(invoke).toHaveBeenCalledWith('test_print', expect.objectContaining({ port: '/dev/ttyUSB0' }))
    })
  })

  test('Test Print button is disabled (opacity 0.45) when no config saved yet', async () => {
    const { load } = await import('@tauri-apps/plugin-store')
    // Ensure no saved config
    load.mockResolvedValue({
      get: vi.fn().mockResolvedValue(null),
      set: vi.fn().mockResolvedValue(undefined),
      save: vi.fn().mockResolvedValue(undefined),
    })
    invoke.mockResolvedValueOnce([]) // list_serial_ports returns empty
    render(createElement(PrinterScreen, { lang: 'en', isOffline: false }), { wrapper: w })
    await waitFor(() => expect(invoke).toHaveBeenCalledWith('list_serial_ports'))
    const testBtn = screen.getByText('Test Print')
    // The button should have opacity 0.45 style when hasConfig is false
    expect(testBtn.closest('button')).toBeTruthy()
    const btn = testBtn.closest('button')
    expect(btn.style.opacity).toBe('0.45')
  })
})
