// Render tests for HistoryScreen — HIST-05, HIST-13 (Phase 7, Plan 04).
// The screen owns its data hook (useHistoryOrders), so every state here is driven purely by
// mocking that hook's return value. No QueryClientProvider wrapper and no mock SDK client are
// needed — that is the point of the screen-owns-its-hook split.

import { createElement } from 'react'
import { render, screen, fireEvent } from '@testing-library/react'

vi.mock('../use-history-orders.js', () => ({ useHistoryOrders: vi.fn() }))

import { useHistoryOrders } from '../use-history-orders.js'
import { HistoryScreen, historyStatusMeta } from '../screen-history.jsx'
import { getPresetRange } from '../history-utils.js'

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

describe('period pills — live (HIST-04)', () => {
  test('on mount, useHistoryOrders is called with a range deep-equal to getPresetRange("30")', () => {
    useHistoryOrders.mockReturnValue({ data: [], isLoading: false, isError: false, isFetching: false, isPlaceholderData: false, isSuccess: true, refetch: vi.fn() })
    render(createElement(HistoryScreen, { lang: 'ro', onOpenOrder: noop, isOffline: false }))

    const expected = getPresetRange('30')
    const callArg = useHistoryOrders.mock.calls[useHistoryOrders.mock.calls.length - 1][0]
    // The clock in getPresetRange('30') and the one HistoryScreen resolved with are both "now" —
    // assert same-day `to` boundary rather than exact string equality across two separate Date()
    // constructions (avoids test flakiness at a midnight boundary).
    expect(callArg.to.slice(0, 10)).toBe(expected.to.slice(0, 10))
    expect(callArg.from.slice(0, 10)).toBe(expected.from.slice(0, 10))
  })

  test('exactly 4 period pills render, none disabled; the 30-days pill is selected on mount', () => {
    useHistoryOrders.mockReturnValue({ data: [], isLoading: false, isError: false, isFetching: false, isPlaceholderData: false, isSuccess: true, refetch: vi.fn() })
    render(createElement(HistoryScreen, { lang: 'ro', onOpenOrder: noop, isOffline: false }))

    const pills = screen.getAllByTestId('history-period-pill')
    expect(pills.length).toBe(4)
    pills.forEach((p) => expect(p).not.toHaveAttribute('disabled'))

    const thirtyPill = pills.find((p) => p.textContent === '30 zile')
    expect(thirtyPill.style.background).toBe('var(--sc-foreground)')
    const otherPills = pills.filter((p) => p !== thirtyPill)
    otherPills.forEach((p) => expect(p.style.background).toBe('transparent'))
  })

  test('clicking the "7 zile" pill resolves the fetched range to getPresetRange("7") and flips selection', () => {
    useHistoryOrders.mockReturnValue({ data: [], isLoading: false, isError: false, isFetching: false, isPlaceholderData: false, isSuccess: true, refetch: vi.fn() })
    render(createElement(HistoryScreen, { lang: 'ro', onOpenOrder: noop, isOffline: false }))

    const sevenPill = screen.getAllByTestId('history-period-pill').find((p) => p.textContent === '7 zile')
    fireEvent.click(sevenPill)

    const expected = getPresetRange('7')
    const callArg = useHistoryOrders.mock.calls[useHistoryOrders.mock.calls.length - 1][0]
    expect(callArg.to.slice(0, 10)).toBe(expected.to.slice(0, 10))
    expect(callArg.from.slice(0, 10)).toBe(expected.from.slice(0, 10))

    expect(sevenPill.style.background).toBe('var(--sc-foreground)')
    const thirtyPill = screen.getAllByTestId('history-period-pill').find((p) => p.textContent === '30 zile')
    expect(thirtyPill.style.background).toBe('transparent')
  })

  test('clicking "Azi" resolves to getPresetRange("today")', () => {
    useHistoryOrders.mockReturnValue({ data: [], isLoading: false, isError: false, isFetching: false, isPlaceholderData: false, isSuccess: true, refetch: vi.fn() })
    render(createElement(HistoryScreen, { lang: 'ro', onOpenOrder: noop, isOffline: false }))

    const todayPill = screen.getAllByTestId('history-period-pill').find((p) => p.textContent === 'Azi')
    fireEvent.click(todayPill)

    const expected = getPresetRange('today')
    const callArg = useHistoryOrders.mock.calls[useHistoryOrders.mock.calls.length - 1][0]
    expect(callArg.to.slice(0, 10)).toBe(expected.to.slice(0, 10))
    expect(callArg.from.slice(0, 10)).toBe(expected.from.slice(0, 10))
  })

  test('re-rendering without a click keeps the fetched range unchanged (memoized, not recomputed inline)', () => {
    useHistoryOrders.mockReturnValue({ data: [], isLoading: false, isError: false, isFetching: false, isPlaceholderData: false, isSuccess: true, refetch: vi.fn() })
    const { rerender } = render(createElement(HistoryScreen, { lang: 'ro', onOpenOrder: noop, isOffline: false }))

    const firstArg = useHistoryOrders.mock.calls[useHistoryOrders.mock.calls.length - 1][0]
    rerender(createElement(HistoryScreen, { lang: 'ro', onOpenOrder: noop, isOffline: false }))
    const secondArg = useHistoryOrders.mock.calls[useHistoryOrders.mock.calls.length - 1][0]

    expect(secondArg.from).toBe(firstArg.from)
    expect(secondArg.to).toBe(firstArg.to)
  })

  test('the status pills, search input, and Export button all still carry disabled', () => {
    useHistoryOrders.mockReturnValue({ data: [], isLoading: false, isError: false, isFetching: false, isPlaceholderData: false, isSuccess: true, refetch: vi.fn() })
    render(createElement(HistoryScreen, { lang: 'ro', onOpenOrder: noop, isOffline: false }))

    expect(screen.getByPlaceholderText('Caută după # sau client').disabled).toBe(true)
    expect(screen.getByText('Exportă CSV').closest('button').disabled).toBe(true)
    expect(screen.getByText('Toate').closest('button').disabled).toBe(true)
    expect(screen.getByText('Finalizate').closest('button').disabled).toBe(true)
  })

  test('clicking a status pill or the Export button changes nothing about the fetched range', () => {
    useHistoryOrders.mockReturnValue({ data: [], isLoading: false, isError: false, isFetching: false, isPlaceholderData: false, isSuccess: true, refetch: vi.fn() })
    render(createElement(HistoryScreen, { lang: 'ro', onOpenOrder: noop, isOffline: false }))

    const callsBefore = useHistoryOrders.mock.calls.length
    fireEvent.click(screen.getByText('Toate').closest('button'))
    fireEvent.click(screen.getByText('Exportă CSV').closest('button'))
    expect(useHistoryOrders.mock.calls.length).toBe(callsBefore)
  })
})

describe('D-05 — dimmed-in-place loading treatment + spinner (period switch)', () => {
  test('isFetching true (isLoading false) dims the rows region to 0.6, keeps rows present, shows the spinner, no skeleton', () => {
    const order = makeOrder({ id: 'switch-1' })
    useHistoryOrders.mockReturnValue({ data: [order], isLoading: false, isError: false, isFetching: true, isPlaceholderData: true, isSuccess: true, refetch: vi.fn() })
    render(createElement(HistoryScreen, { lang: 'ro', onOpenOrder: noop, isOffline: false }))

    expect(screen.getAllByTestId('history-row').length).toBe(1)
    expect(screen.getByTestId('history-rows').style.opacity).toBe('0.6')
    expect(screen.getByTestId('history-switch-spinner')).toBeTruthy()
    expect(screen.queryAllByTestId('history-skeleton-row').length).toBe(0)
  })

  test('the dimmed rows region does not set pointer-events: none, and a row click still fires', () => {
    const order = makeOrder({ id: 'switch-2' })
    const onOpenOrder = vi.fn()
    useHistoryOrders.mockReturnValue({ data: [order], isLoading: false, isError: false, isFetching: true, isPlaceholderData: true, isSuccess: true, refetch: vi.fn() })
    render(createElement(HistoryScreen, { lang: 'ro', onOpenOrder, isOffline: false }))

    const wrapper = screen.getByTestId('history-rows')
    expect(wrapper.style.pointerEvents).toBe('')

    const row = screen.getByTestId('history-row')
    fireEvent.click(row)
    expect(onOpenOrder).toHaveBeenCalledWith(order)
  })

  test('isLoading true renders the skeleton, not the spinner (first load, unchanged from Phase 7)', () => {
    useHistoryOrders.mockReturnValue({ data: undefined, isLoading: true, isError: false, isFetching: true, isPlaceholderData: false, isSuccess: false, refetch: vi.fn() })
    render(createElement(HistoryScreen, { lang: 'ro', onOpenOrder: noop, isOffline: false }))

    expect(screen.getAllByTestId('history-skeleton-row').length).toBeGreaterThan(0)
    expect(screen.queryByTestId('history-switch-spinner')).toBeNull()
  })

  test('isFetching false renders rows at full opacity and no spinner', () => {
    const order = makeOrder({ id: 'settled-1' })
    useHistoryOrders.mockReturnValue({ data: [order], isLoading: false, isError: false, isFetching: false, isPlaceholderData: false, isSuccess: true, refetch: vi.fn() })
    render(createElement(HistoryScreen, { lang: 'ro', onOpenOrder: noop, isOffline: false }))

    expect(screen.getByTestId('history-rows').style.opacity).toBe('1')
    expect(screen.queryByTestId('history-switch-spinner')).toBeNull()
  })

  test('with isFetching true, the summary tiles render dimmed (not shimmer skeletons) — value text still present', () => {
    const order = makeOrder({ id: 'switch-3', total: 40 })
    useHistoryOrders.mockReturnValue({ data: [order], isLoading: false, isError: false, isFetching: true, isPlaceholderData: true, isSuccess: true, refetch: vi.fn() })
    render(createElement(HistoryScreen, { lang: 'ro', onOpenOrder: noop, isOffline: false }))

    expect(screen.getByText('1')).toBeTruthy() // ordersCount tile value, rendered as real text, not a shimmer bar
    expect(screen.queryAllByTestId('history-skeleton-row').length).toBe(0)
  })

  test('isError true with non-empty placeholder data still renders ErrorBlock and zero history-row elements (D-07)', () => {
    useHistoryOrders.mockReturnValue({ data: [makeOrder({ id: 'stale-1' })], isLoading: false, isError: true, isFetching: false, isPlaceholderData: true, isSuccess: false, refetch: vi.fn() })
    render(createElement(HistoryScreen, { lang: 'ro', onOpenOrder: noop, isOffline: false }))

    expect(screen.getByText('Nu am putut încărca istoricul')).toBeTruthy()
    expect(screen.queryAllByTestId('history-row').length).toBe(0)
  })

  test('D-08: the clicked pill stays selected through a failed switch, and Retry does not change the selection', () => {
    useHistoryOrders.mockReturnValue({ data: [makeOrder()], isLoading: false, isError: false, isFetching: false, isPlaceholderData: false, isSuccess: true, refetch: vi.fn() })
    render(createElement(HistoryScreen, { lang: 'ro', onOpenOrder: noop, isOffline: false }))

    const refetch = vi.fn()
    useHistoryOrders.mockReturnValue({ data: undefined, isLoading: false, isError: true, isFetching: false, isPlaceholderData: false, isSuccess: false, refetch })
    const sevenPill = screen.getAllByTestId('history-period-pill').find((p) => p.textContent === '7 zile')
    fireEvent.click(sevenPill)

    expect(sevenPill.style.background).toBe('var(--sc-foreground)')

    fireEvent.click(screen.getByText('Reîncearcă'))
    expect(refetch).toHaveBeenCalledTimes(1)
    expect(sevenPill.style.background).toBe('var(--sc-foreground)')
  })

  test('the inert status pills (0.5) and the dimmed rows (0.6) render simultaneously with different opacity values', () => {
    const order = makeOrder({ id: 'switch-4' })
    useHistoryOrders.mockReturnValue({ data: [order], isLoading: false, isError: false, isFetching: true, isPlaceholderData: true, isSuccess: true, refetch: vi.fn() })
    render(createElement(HistoryScreen, { lang: 'ro', onOpenOrder: noop, isOffline: false }))

    const statusGroup = screen.getByText('Toate').closest('div[style*="opacity"]')
    expect(statusGroup.style.opacity).toBe('0.5')
    expect(screen.getByTestId('history-rows').style.opacity).toBe('0.6')
  })
})

describe('D-12/D-13 — period-dependent copy (tile sub-labels + empty state)', () => {
  test('settled 30 days: Orders/Revenue tiles read "30 zile" (ro); Avg/Refunds subs are unaffected', () => {
    const orders = [makeOrder({ id: 'p30-1', total: 10 })]
    useHistoryOrders.mockReturnValue({ data: orders, isLoading: false, isError: false, isFetching: false, isPlaceholderData: false, isSuccess: true, refetch: vi.fn() })
    render(createElement(HistoryScreen, { lang: 'ro', onOpenOrder: noop, isOffline: false }))

    const ordersCard = screen.getByText('Comenzi').closest('.card')
    const revenueCard = screen.getByText('Încasări').closest('.card')
    expect(ordersCard.textContent).toContain('30 zile')
    expect(revenueCard.textContent).toContain('30 zile')

    const avgCard = screen.getByText('Valoare medie').closest('.card')
    expect(avgCard.textContent).toContain('pe comandă')
    const refundsCard = screen.getByText('Rambursări').closest('.card')
    expect(refundsCard.textContent).toContain('anulate')
  })

  test('D-06: during an in-flight switch, the selected pill flips immediately but the tile sub-label stays pinned to the settled (30-day) period', () => {
    const thirtyDayOrder = makeOrder({ id: 'd06-1', total: 100 })
    useHistoryOrders.mockReturnValue({
      data: [thirtyDayOrder], isLoading: false, isError: false, isFetching: false,
      isPlaceholderData: false, isSuccess: true, refetch: vi.fn(),
    })
    render(createElement(HistoryScreen, { lang: 'ro', onOpenOrder: noop, isOffline: false }))

    // settledPeriod is now {id:'30'} — sanity check before the switch.
    expect(screen.getByText('Comenzi').closest('.card').textContent).toContain('30 zile')

    // In-flight switch to 7 days: still the 30-day placeholder data, isFetching+isPlaceholderData true.
    useHistoryOrders.mockReturnValue({
      data: [thirtyDayOrder], isLoading: false, isError: false, isFetching: true,
      isPlaceholderData: true, isSuccess: true, refetch: vi.fn(),
    })
    const sevenPill = screen.getAllByTestId('history-period-pill').find((p) => p.textContent === '7 zile')
    fireEvent.click(sevenPill)

    // The pill is the intent signal — it updates immediately.
    expect(sevenPill.style.background).toBe('var(--sc-foreground)')
    // The tile sub-label is the truth signal — it still reads the settled 30-day period.
    const ordersCard = screen.getByText('Comenzi').closest('.card')
    expect(ordersCard.textContent).toContain('30 zile')
    expect(ordersCard.textContent).not.toContain('7 zile')

    // The fetch settles on the 7-day data: isPlaceholderData flips false.
    const sevenDayOrder = makeOrder({ id: 'd06-2', total: 20 })
    useHistoryOrders.mockReturnValue({
      data: [sevenDayOrder], isLoading: false, isError: false, isFetching: false,
      isPlaceholderData: false, isSuccess: true, refetch: vi.fn(),
    })
    // Re-render to let the settle effect run against the new mock return value.
    fireEvent.click(sevenPill)
    const ordersCardAfter = screen.getByText('Comenzi').closest('.card')
    expect(ordersCardAfter.textContent).toContain('7 zile')
  })

  test('empty state, settled today (ro): main line reads "Nicio comandă azi." with h_empty_sub on its own line', () => {
    useHistoryOrders.mockReturnValue({ data: [], isLoading: false, isError: false, isFetching: false, isPlaceholderData: false, isSuccess: true, refetch: vi.fn() })
    render(createElement(HistoryScreen, { lang: 'ro', onOpenOrder: noop, isOffline: false }))

    const todayPill = screen.getAllByTestId('history-period-pill').find((p) => p.textContent === 'Azi')
    fireEvent.click(todayPill)

    expect(screen.getByText('Nicio comandă azi.')).toBeTruthy()
    expect(screen.getByText('Comenzile finalizate vor apărea aici.')).toBeTruthy()
  })

  test('empty state, settled 7 days (ro): "Nicio comandă în ultimele 7 zile."', () => {
    useHistoryOrders.mockReturnValue({ data: [], isLoading: false, isError: false, isFetching: false, isPlaceholderData: false, isSuccess: true, refetch: vi.fn() })
    render(createElement(HistoryScreen, { lang: 'ro', onOpenOrder: noop, isOffline: false }))

    const sevenPill = screen.getAllByTestId('history-period-pill').find((p) => p.textContent === '7 zile')
    fireEvent.click(sevenPill)

    expect(screen.getByText('Nicio comandă în ultimele 7 zile.')).toBeTruthy()
  })

  test('empty state, settled 7 days (en): "No orders in the last 7 days."', () => {
    useHistoryOrders.mockReturnValue({ data: [], isLoading: false, isError: false, isFetching: false, isPlaceholderData: false, isSuccess: true, refetch: vi.fn() })
    render(createElement(HistoryScreen, { lang: 'en', onOpenOrder: noop, isOffline: false }))

    const sevenPill = screen.getAllByTestId('history-period-pill').find((p) => p.textContent === '7 days')
    fireEvent.click(sevenPill)

    expect(screen.getByText('No orders in the last 7 days.')).toBeTruthy()
  })

  test('empty period: Orders/Revenue tiles show computed zeroes, Avg shows a formatted zero (not an em-dash)', () => {
    useHistoryOrders.mockReturnValue({ data: [], isLoading: false, isError: false, isFetching: false, isPlaceholderData: false, isSuccess: true, refetch: vi.fn() })
    render(createElement(HistoryScreen, { lang: 'ro', onOpenOrder: noop, isOffline: false }))

    expect(screen.getAllByText('0').length).toBeGreaterThan(0)
    expect(screen.getByText('Valoare medie').closest('.card').textContent).not.toContain('—')
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
