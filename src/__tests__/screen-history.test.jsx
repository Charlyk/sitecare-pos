// Render tests for HistoryScreen — HIST-05, HIST-13 (Phase 7, Plan 04).
// The screen owns its data hook (useHistoryOrders), so every state here is driven purely by
// mocking that hook's return value. No QueryClientProvider wrapper and no mock SDK client are
// needed — that is the point of the screen-owns-its-hook split.

import { createElement } from 'react'
import { render, screen, fireEvent } from '@testing-library/react'

vi.mock('../use-history-orders.js', () => ({ useHistoryOrders: vi.fn() }))

import { useHistoryOrders } from '../use-history-orders.js'
import { HistoryScreen, historyStatusMeta } from '../screen-history.jsx'

// Helper — build a POST-normalizeOrder-shaped fixture (RON totals, resolved dailyOrderNumber,
// nested customer object) — never a raw SDK/cents shape.
function makeOrder(overrides = {}) {
  const { customerName, ...rest } = overrides
  return {
    id: 'order-uuid-1',
    dailyOrderNumber: 100,
    status: 'COMPLETED',
    paymentCaptureStatus: null,
    type: 'dinein',
    payment: 'cash',
    placedAt: new Date(2026, 6, 2, 14, 30).toISOString(),
    customer: { name: customerName ?? 'Test Customer', phone: null },
    total: 50,
    ...rest,
  }
}

const noop = () => {}

describe('HistoryScreen', () => {
  describe('loading state', () => {
    test('renders 6-8 skeleton rows, no day headers, tiles present, header labels render', () => {
      useHistoryOrders.mockReturnValue({ data: undefined, isLoading: true, isError: false, error: null, refetch: vi.fn() })
      render(createElement(HistoryScreen, { lang: 'ro', onOpenOrder: noop, isOffline: false }))

      const skeletons = screen.getAllByTestId('history-skeleton-row')
      expect(skeletons.length).toBeGreaterThanOrEqual(6)
      expect(skeletons.length).toBeLessThanOrEqual(8)

      expect(screen.queryAllByTestId('history-day-header').length).toBe(0)

      // Column headers still render
      expect(screen.getByText('Comandă')).toBeTruthy()
      expect(screen.getByText('Client')).toBeTruthy()
      expect(screen.getByText('Total')).toBeTruthy()

      // Summary tiles present (strip does not disappear)
      expect(screen.getByText('Comenzi')).toBeTruthy()
      expect(screen.getByText('Încasări')).toBeTruthy()
      expect(screen.getByText('Valoare medie')).toBeTruthy()
      expect(screen.getByText('Rambursări')).toBeTruthy()
    })
  })

  describe('error state', () => {
    test('renders static error copy, retry calls refetch, never leaks raw error text, tiles show em-dash', () => {
      const refetch = vi.fn()
      useHistoryOrders.mockReturnValue({ data: undefined, isLoading: false, isError: true, error: new Error('boom'), refetch })
      render(createElement(HistoryScreen, { lang: 'ro', onOpenOrder: noop, isOffline: false }))

      expect(screen.getByText('Nu am putut încărca istoricul')).toBeTruthy()
      expect(screen.getByText('Verifică conexiunea și încearcă din nou.')).toBeTruthy()

      const retryBtn = screen.getByText('Reîncearcă')
      fireEvent.click(retryBtn)
      expect(refetch).toHaveBeenCalledTimes(1)

      expect(screen.queryByText(/boom/)).toBeNull()

      expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(4)
    })
  })

  describe('empty state', () => {
    test('successfully loaded empty list renders empty copy and computed zeros, not dashes', () => {
      useHistoryOrders.mockReturnValue({ data: [], isLoading: false, isError: false, error: null, isSuccess: true, refetch: vi.fn() })
      render(createElement(HistoryScreen, { lang: 'ro', onOpenOrder: noop, isOffline: false }))

      expect(screen.getByText('Nicio comandă în ultimele 30 de zile.')).toBeTruthy()
      expect(screen.getByText('Comenzile finalizate vor apărea aici.')).toBeTruthy()
      expect(screen.queryAllByTestId('history-day-header').length).toBe(0)
      expect(screen.queryAllByTestId('history-row').length).toBe(0)

      expect(screen.getAllByText('0').length).toBeGreaterThan(0)
      expect(screen.queryByText('—')).toBeNull()
    })

    test('data containing only in-flight orders renders the empty state (D-01)', () => {
      const inFlight = [makeOrder({ id: 'inflight-1', status: 'PREPARING', paymentCaptureStatus: null })]
      useHistoryOrders.mockReturnValue({ data: inFlight, isLoading: false, isError: false, error: null, isSuccess: true, refetch: vi.fn() })
      render(createElement(HistoryScreen, { lang: 'ro', onOpenOrder: noop, isOffline: false }))

      expect(screen.getByText('Nicio comandă în ultimele 30 de zile.')).toBeTruthy()
      expect(screen.queryAllByTestId('history-row').length).toBe(0)
    })
  })

  describe('populated state', () => {
    test('groups orders by day newest-first; count includes canceled, revenue is completed-only; plural handling', () => {
      const orders = [
        // Day 2026-07-02 (newest): 2 completed + 1 canceled -> count 3, revenue 30,00 lei
        makeOrder({ id: 'c1', dailyOrderNumber: 201, status: 'COMPLETED', total: 10, placedAt: new Date(2026, 6, 2, 10, 0).toISOString() }),
        makeOrder({ id: 'c2', dailyOrderNumber: 202, status: 'COMPLETED', total: 20, placedAt: new Date(2026, 6, 2, 20, 0).toISOString() }),
        makeOrder({ id: 'x1', dailyOrderNumber: 203, status: 'CANCELLED', total: 99, placedAt: new Date(2026, 6, 2, 15, 0).toISOString() }),
        // Day 2026-07-01 (older): exactly 1 completed order -> singular noun
        makeOrder({ id: 'single1', dailyOrderNumber: 150, status: 'COMPLETED', total: 15, placedAt: new Date(2026, 6, 1, 12, 0).toISOString() }),
      ]
      useHistoryOrders.mockReturnValue({ data: orders, isLoading: false, isError: false, error: null, isSuccess: true, refetch: vi.fn() })
      render(createElement(HistoryScreen, { lang: 'ro', onOpenOrder: noop, isOffline: false }))

      const headers = screen.getAllByTestId('history-day-header')
      expect(headers.length).toBe(2)

      // Newest day first: 3-row day with completed-only revenue
      expect(headers[0].textContent).toContain('3')
      expect(headers[0].textContent).toContain('comenzi')
      expect(headers[0].textContent).toContain('30,00 lei')

      // Older day: singular noun, never "comenzi"
      expect(headers[1].textContent).toContain('1')
      expect(headers[1].textContent).toContain('comandă')
      expect(headers[1].textContent).not.toContain('comenzi')

      expect(screen.getAllByTestId('history-row').length).toBe(4)
    })

    test('a day of only canceled/refunded rows renders its true count with 0,00 lei revenue', () => {
      const orders = [
        makeOrder({ id: 'canc-1', dailyOrderNumber: 300, status: 'CANCELLED', total: 50, placedAt: new Date(2026, 6, 5, 9, 0).toISOString() }),
        makeOrder({ id: 'ref-1', dailyOrderNumber: 301, status: 'COMPLETED', paymentCaptureStatus: 'refunded', total: 80, placedAt: new Date(2026, 6, 5, 11, 0).toISOString() }),
      ]
      useHistoryOrders.mockReturnValue({ data: orders, isLoading: false, isError: false, error: null, isSuccess: true, refetch: vi.fn() })
      render(createElement(HistoryScreen, { lang: 'ro', onOpenOrder: noop, isOffline: false }))

      const headers = screen.getAllByTestId('history-day-header')
      expect(headers.length).toBe(1)
      expect(headers[0].textContent).toContain('2')
      expect(headers[0].textContent).toContain('0,00 lei')
    })

    test('a refunded order renders the refunded chip and not the completed chip (D-02)', () => {
      const orders = [
        makeOrder({ id: 'ref-2', dailyOrderNumber: 400, status: 'COMPLETED', paymentCaptureStatus: 'refunded', total: 40 }),
      ]
      useHistoryOrders.mockReturnValue({ data: orders, isLoading: false, isError: false, error: null, isSuccess: true, refetch: vi.fn() })
      render(createElement(HistoryScreen, { lang: 'ro', onOpenOrder: noop, isOffline: false }))

      expect(screen.getByText('Rambursată')).toBeTruthy()
      expect(screen.queryByText('Finalizată')).toBeNull()
    })

    test('a null dailyNumber (post-normalize UUID fallback) renders a short slice, never the full UUID', () => {
      const uuid = '3fa85f64-5717-4562-b3fc-2c963f66afa6'
      const orders = [makeOrder({ id: uuid, dailyOrderNumber: uuid, total: 25 })]
      useHistoryOrders.mockReturnValue({ data: orders, isLoading: false, isError: false, error: null, isSuccess: true, refetch: vi.fn() })
      render(createElement(HistoryScreen, { lang: 'ro', onOpenOrder: noop, isOffline: false }))

      expect(screen.getByText(`#${uuid.slice(0, 8)}`)).toBeTruthy()
      expect(screen.queryByText(`#${uuid}`)).toBeNull()
    })

    test('an empty customerName renders a non-empty Customer cell (E1 backstop)', () => {
      const orders = [makeOrder({ id: 'nocust-1', customerName: '', total: 30 })]
      useHistoryOrders.mockReturnValue({ data: orders, isLoading: false, isError: false, error: null, isSuccess: true, refetch: vi.fn() })
      render(createElement(HistoryScreen, { lang: 'ro', onOpenOrder: noop, isOffline: false }))

      expect(screen.getByText('—')).toBeTruthy()
    })

    test('clicking a row calls onOpenOrder exactly once with that order', () => {
      const order = makeOrder({ id: 'click-1', dailyOrderNumber: 500, total: 60 })
      const onOpenOrder = vi.fn()
      useHistoryOrders.mockReturnValue({ data: [order], isLoading: false, isError: false, error: null, isSuccess: true, refetch: vi.fn() })
      const { container } = render(createElement(HistoryScreen, { lang: 'ro', onOpenOrder, isOffline: false }))

      const row = container.querySelector('[data-testid="history-row"]')
      expect(row).toBeTruthy()
      fireEvent.click(row)
      expect(onOpenOrder).toHaveBeenCalledTimes(1)
      expect(onOpenOrder).toHaveBeenCalledWith(order)
    })

    test('the filter bar renders inert: Export button and search input are disabled', () => {
      const order = makeOrder({ id: 'inert-1', total: 10 })
      useHistoryOrders.mockReturnValue({ data: [order], isLoading: false, isError: false, error: null, isSuccess: true, refetch: vi.fn() })
      render(createElement(HistoryScreen, { lang: 'ro', onOpenOrder: noop, isOffline: false }))

      const searchInput = screen.getByPlaceholderText('Caută după # sau client')
      expect(searchInput.disabled).toBe(true)

      const exportBtn = screen.getByText('Exportă CSV').closest('button')
      expect(exportBtn.disabled).toBe(true)
    })
  })
})

// ── historyStatusMeta — exported for reuse by screen-detail.jsx (D-05) ─────

describe('historyStatusMeta', () => {
  const t = (key) => key

  test('is importable by name and maps each status to its chip class', () => {
    expect(historyStatusMeta('refunded', t).chip).toBe('chip-amber')
    expect(historyStatusMeta('canceled', t).chip).toBe('chip-red')
    expect(historyStatusMeta('completed', t).chip).toBe('chip-sage')
  })

  test('falls back to the completed mapping for an unrecognized status', () => {
    expect(historyStatusMeta('unknown', t)).toEqual(historyStatusMeta('completed', t))
  })
})
