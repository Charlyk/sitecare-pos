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
import { load } from '@tauri-apps/plugin-store'

describe('PRNT-03: print receipt via ESC/POS Tauri command', () => {
  beforeEach(() => { vi.clearAllMocks() })

  test('onPrint calls invoke("print_receipt") with correct args when printer config exists', () => {
    // STUB
    expect(false).toBe(true)
  })

  test('onPrint shows "Printer not configured" error toast when no config in store', () => {
    // STUB
    expect(false).toBe(true)
  })

  test('onPrint shows "Print failed" error toast when invoke rejects', () => {
    // STUB
    expect(false).toBe(true)
  })

  test('onPrint passes kind="kitchen" or kind="customer" to print_receipt command', () => {
    // STUB
    expect(false).toBe(true)
  })
})
