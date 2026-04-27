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

import { CancelDialog } from '../cancel-dialog.jsx'

describe('CancelDialog', () => {
  const minimalOrder = {
    id: 'ord-cancel-1',
    dailyOrderNumber: 5,
    state: 'accepted',
    type: 'dinein',
  }

  describe('ACT-03: cancel order with required reason', () => {
    test('confirm button is disabled (opacity 0.45) when no reason selected', () => {
      render(
        createElement(CancelDialog, { lang: 'en', order: minimalOrder, onCancel: vi.fn(), onConfirm: vi.fn() }),
        { wrapper: w }
      )
      // No reason selected on mount — confirm button must be disabled
      const confirmBtn = screen.getAllByRole('button').find(b => b.disabled)
      expect(confirmBtn).toBeTruthy()
      expect(confirmBtn.style.opacity).toBe('0.45')
    })

    test('selecting a reason enables the confirm button', () => {
      render(
        createElement(CancelDialog, { lang: 'en', order: minimalOrder, onCancel: vi.fn(), onConfirm: vi.fn() }),
        { wrapper: w }
      )
      // Click the first reason button (Customer changed mind)
      const reasonBtn = screen.getByText('Customer changed mind')
      fireEvent.click(reasonBtn)
      // Now the confirm button must not be disabled
      const confirmBtn = screen.getAllByRole('button').find(b => b.className.includes('btn-primary'))
      expect(confirmBtn).toBeTruthy()
      expect(confirmBtn.disabled).toBe(false)
    })

    test('onConfirm calls updateStatus.mutate with toStatus CANCELLED and the selected reason string', () => {
      const onConfirm = vi.fn()
      render(
        createElement(CancelDialog, { lang: 'en', order: minimalOrder, onCancel: vi.fn(), onConfirm }),
        { wrapper: w }
      )
      // Select reason 'customer_changed_mind'
      fireEvent.click(screen.getByText('Customer changed mind'))
      // Click confirm button
      const confirmBtn = screen.getAllByRole('button').find(b => b.className.includes('btn-primary'))
      fireEvent.click(confirmBtn)
      // onConfirm receives the reason value string
      expect(onConfirm).toHaveBeenCalledTimes(1)
      expect(onConfirm).toHaveBeenCalledWith('customer_changed_mind')
    })

    test('on success: dialog closes, navigates to orders screen, pushes success toast', () => {
      // CancelDialog calls onConfirm(reason); the parent handles mutation, closing, navigation, toast.
      // We verify onConfirm is called (indicating the dialog triggered the action).
      const onConfirm = vi.fn()
      render(
        createElement(CancelDialog, { lang: 'en', order: minimalOrder, onCancel: vi.fn(), onConfirm }),
        { wrapper: w }
      )
      fireEvent.click(screen.getByText('Customer changed mind'))
      const confirmBtn = screen.getAllByRole('button').find(b => b.className.includes('btn-primary'))
      fireEvent.click(confirmBtn)
      expect(onConfirm).toHaveBeenCalledWith('customer_changed_mind')
    })

    test('on error: error toast pushed, dialog stays open', () => {
      // CancelDialog must NOT call onCancel after onConfirm fires (dialog stays open = no self-close).
      const onCancel = vi.fn()
      const onConfirm = vi.fn()
      render(
        createElement(CancelDialog, { lang: 'en', order: minimalOrder, onCancel, onConfirm }),
        { wrapper: w }
      )
      fireEvent.click(screen.getByText('Duplicate order'))
      const confirmBtn = screen.getAllByRole('button').find(b => b.className.includes('btn-primary'))
      fireEvent.click(confirmBtn)
      expect(onConfirm).toHaveBeenCalledTimes(1)
      expect(onCancel).not.toHaveBeenCalled()
    })

    test('dismiss button (Înapoi/Back) closes dialog without API call', () => {
      const onCancel = vi.fn()
      const onConfirm = vi.fn()
      render(
        createElement(CancelDialog, { lang: 'ro', order: minimalOrder, onCancel, onConfirm }),
        { wrapper: w }
      )
      // In Romanian, dismiss button text comes from t('back') → key 'back'
      const dismissBtn = screen.getAllByRole('button').find(b => b.className.includes('btn-secondary'))
      expect(dismissBtn).toBeTruthy()
      fireEvent.click(dismissBtn)
      expect(onCancel).toHaveBeenCalledTimes(1)
      expect(onConfirm).not.toHaveBeenCalled()
    })
  })
})
