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

describe('CancelDialog', () => {
  describe('ACT-03: cancel order with required reason', () => {
    test.todo('confirm button is disabled (opacity 0.45) when no reason selected')
    test.todo('selecting a reason enables the confirm button')
    test.todo('onConfirm calls updateStatus.mutate with toStatus CANCELLED and the selected reason string')
    test.todo('on success: dialog closes, navigates to orders screen, pushes success toast')
    test.todo('on error: error toast pushed, dialog stays open')
    test.todo('dismiss button (Înapoi/Back) closes dialog without API call')
  })
})
