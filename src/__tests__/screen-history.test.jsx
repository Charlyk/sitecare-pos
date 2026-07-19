// Render tests for HistoryScreen — HIST-05, HIST-13 (Phase 7, Plan 04).
// The screen owns its data hook (useHistoryOrders), so every state here is driven purely by
// mocking that hook's return value. No QueryClientProvider wrapper and no mock SDK client are
// needed — that is the point of the screen-owns-its-hook split.

import { createElement } from 'react'
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react'

vi.mock('../use-history-orders.js', () => ({ useHistoryOrders: vi.fn() }))

// HIST-12 (11-04): screen-history.jsx now imports store.js (pushToast) and the two Tauri
// export plugins. store.js itself imports @tauri-apps/plugin-store at module scope, so that
// must be mocked too (same convention as screen-detail.test.jsx/screen-orders.test.jsx) even
// though this screen never calls `load` directly.
vi.mock('@tauri-apps/plugin-store', () => ({
  load: vi.fn().mockResolvedValue({
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue(undefined),
    save: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(undefined),
  }),
}))
vi.mock('@tauri-apps/plugin-dialog', () => ({ save: vi.fn() }))
vi.mock('@tauri-apps/plugin-fs', () => ({ writeTextFile: vi.fn() }))

// vi.hoisted: pushToastMock/setHistorySelectionMock must exist before the vi.mock('../store.js',
// ...) factory below runs (factories are hoisted above imports) — this keeps ONE stable reference
// across every HistoryScreen render in every test, rather than a fresh vi.fn() per render that
// assertions could never reach.
// Phase 12 Plan 03 (D-01/D-02/D-04, Pitfall 1): historySelection + setHistorySelection added to
// the mocked store object in the SAME task that adds the selector in screen-history.jsx, so the
// existing render tests below do not destructure `undefined`. The mocked store is backed by a
// REAL zustand store (not a static object literal) — historySelection now drives HistoryScreen's
// own re-renders via a subscribed hook (it used to be four component-local useState calls that
// re-rendered on their own), so a static mock would freeze status/type/search/period clicks and
// break every filter-interaction test below. setHistorySelectionMock still records every call for
// tests that want to assert on it directly.
const { pushToastMock, setHistorySelectionMock, DEFAULT_HISTORY_SELECTION } = vi.hoisted(() => ({
  pushToastMock: vi.fn(),
  setHistorySelectionMock: vi.fn(),
  DEFAULT_HISTORY_SELECTION: { period: { id: '30' }, statusFilter: 'all', typeFilter: 'all', query: '' },
}))
vi.mock('../store.js', async () => {
  const { create } = await import('zustand')
  const useMockAppStore = create((set) => ({
    lang: 'ro',
    pushToast: pushToastMock,
    historySelection: DEFAULT_HISTORY_SELECTION,
    // Mirrors store.js's Rule-1 no-op guard: a redundant patch (e.g. re-clicking an
    // already-selected filter pill) must not allocate a new historySelection reference, or
    // HistoryScreen would re-render (and re-call useHistoryOrders) on a no-op click.
    setHistorySelection: (patch) => {
      setHistorySelectionMock(patch)
      set((s) => {
        const unchanged = Object.keys(patch).every((k) => s.historySelection[k] === patch[k])
        if (unchanged) return {}
        return { historySelection: { ...s.historySelection, ...patch } }
      })
    },
  }))
  return { useAppStore: useMockAppStore }
})

import { useHistoryOrders } from '../use-history-orders.js'
import { HistoryScreen, historyStatusMeta, CustomRangePopover } from '../screen-history.jsx'
import { getPresetRange, customRangeToQuery } from '../history-utils.js'
import { buildCsv } from '../history-utils.js'
import { save } from '@tauri-apps/plugin-dialog'
import { writeTextFile } from '@tauri-apps/plugin-fs'

beforeEach(async () => {
  pushToastMock.mockClear()
  setHistorySelectionMock.mockClear()
  save.mockReset()
  writeTextFile.mockReset()
  // Reset the mock store's historySelection to defaults between tests — each test's clicks would
  // otherwise leak into the next (the mock store is real zustand state, not re-created per test).
  const { useAppStore } = await import('../store.js')
  useAppStore.setState({ historySelection: DEFAULT_HISTORY_SELECTION })
})

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

    test('the filter bar: search and Export are both activated when the visible set is non-empty (Phase 10 search, Phase 11 HIST-12 export)', () => {
      const order = makeOrder({ id: 'inert-1', total: 10 })
      useHistoryOrders.mockReturnValue({ data: [order], isLoading: false, isError: false, error: null, isSuccess: true, refetch: vi.fn() })
      render(createElement(HistoryScreen, { lang: 'ro', onOpenOrder: noop, isOffline: false }))

      const searchInput = screen.getByPlaceholderText('Caută după # sau client')
      expect(searchInput.disabled).toBe(false)

      const exportBtn = screen.getByText('Exportă CSV').closest('button')
      expect(exportBtn.disabled).toBe(false)
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

  test('status pills, type pills, and search are activated (Phase 10); Export stays disabled', () => {
    useHistoryOrders.mockReturnValue({ data: [], isLoading: false, isError: false, isFetching: false, isPlaceholderData: false, isSuccess: true, refetch: vi.fn() })
    render(createElement(HistoryScreen, { lang: 'ro', onOpenOrder: noop, isOffline: false }))

    expect(screen.getByPlaceholderText('Caută după # sau client').disabled).toBe(false)
    expect(screen.getByText('Exportă CSV').closest('button').disabled).toBe(true)
    // 'Toate' is the shared 'all' label for both the status AND type groups (F-03/HIST-08) — the
    // status group renders first in DOM order, so index 0 is the status pill.
    expect(screen.getAllByText('Toate')[0].closest('button').disabled).toBe(false)
    expect(screen.getByText('Finalizate').closest('button').disabled).toBe(false)
  })

  test('clicking a status pill or the Export button changes nothing about the fetched range', () => {
    useHistoryOrders.mockReturnValue({ data: [], isLoading: false, isError: false, isFetching: false, isPlaceholderData: false, isSuccess: true, refetch: vi.fn() })
    render(createElement(HistoryScreen, { lang: 'ro', onOpenOrder: noop, isOffline: false }))

    const callsBefore = useHistoryOrders.mock.calls.length
    fireEvent.click(screen.getAllByText('Toate')[0].closest('button'))
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

    // ordersCount tile value, rendered as real text, not a shimmer bar. Scoped to the Comenzi
    // card since Phase 10's status-pill count badges can also render '1' elsewhere on screen.
    expect(screen.getByText('Comenzi').closest('.card').textContent).toContain('1')
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

  test('WR-02: a same-range background refetch (isFetching true, isPlaceholderData false) does not dim rows or show the spinner', () => {
    // Mirrors a window-refocus revalidation of the UNCHANGED range (TanStack Query's default
    // refetchOnWindowFocus): isFetching is true but isPlaceholderData stays false since the query
    // key never changed — this must read as "quietly refreshing", not a period switch.
    const order = makeOrder({ id: 'bg-refetch-1' })
    useHistoryOrders.mockReturnValue({ data: [order], isLoading: false, isError: false, isFetching: true, isPlaceholderData: false, isSuccess: true, refetch: vi.fn() })
    render(createElement(HistoryScreen, { lang: 'ro', onOpenOrder: noop, isOffline: false }))

    expect(screen.getByTestId('history-rows').style.opacity).toBe('1')
    expect(screen.queryByTestId('history-switch-spinner')).toBeNull()
  })

  test('Export enabled/disabled dimming (data-driven, HIST-12) and the D-05 rows loading-dim (0.6) are independent axes', () => {
    // Phase 11 (11-04/HIST-12) makes Export's dimming purely data-driven (visible.length === 0)
    // rather than the Phase 10 permanently-inert feature flag this test used to lock. With a
    // non-empty visible set, Export renders fully enabled/undimmed even while the rows region is
    // separately dimmed to 0.6 by an in-flight period switch — the two mechanisms never share a
    // condition.
    const order = makeOrder({ id: 'switch-4' })
    useHistoryOrders.mockReturnValue({ data: [order], isLoading: false, isError: false, isFetching: true, isPlaceholderData: true, isSuccess: true, refetch: vi.fn() })
    render(createElement(HistoryScreen, { lang: 'ro', onOpenOrder: noop, isOffline: false }))

    const exportBtn = screen.getByText('Exportă CSV').closest('button')
    expect(exportBtn.disabled).toBe(false)
    expect(exportBtn.style.opacity).toBe('')
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

  test('WR-03: settledPeriod advances on the SAME render the settled data arrives on, with no separate flush step', () => {
    // Unlike the D-06 test above (which forces a second fireEvent.click purely to trigger a
    // re-render), this locks the actual WR-03 guarantee: settledPeriod is derived synchronously
    // during render (a ref updated in the render body), not via a post-paint useEffect — so a
    // single re-render carrying settled (non-placeholder) data for the new range is enough to
    // flip the label. Real usage never gets an "extra click" to force a flush; an async query
    // resolving on its own must land the label and the numbers together on the very same paint.
    const thirtyDayOrder = makeOrder({ id: 'wr03-1', total: 100 })
    useHistoryOrders.mockReturnValue({
      data: [thirtyDayOrder], isLoading: false, isError: false, isFetching: false,
      isPlaceholderData: false, isSuccess: true, refetch: vi.fn(),
    })
    const { rerender } = render(createElement(HistoryScreen, { lang: 'ro', onOpenOrder: noop, isOffline: false }))

    expect(screen.getByText('Comenzi').closest('.card').textContent).toContain('30 zile')

    // In-flight switch to 7 days (user's one and only click — nothing further triggers a render).
    useHistoryOrders.mockReturnValue({
      data: [thirtyDayOrder], isLoading: false, isError: false, isFetching: true,
      isPlaceholderData: true, isSuccess: true, refetch: vi.fn(),
    })
    const sevenPill = screen.getAllByTestId('history-period-pill').find((p) => p.textContent === '7 zile')
    fireEvent.click(sevenPill)
    expect(screen.getByText('Comenzi').closest('.card').textContent).toContain('30 zile')

    // The query settles on its own — modeled here as a parent-driven rerender (React re-rendering
    // the tree because the query's state changed), NOT a further click on anything.
    const sevenDayOrder = makeOrder({ id: 'wr03-2', total: 20 })
    useHistoryOrders.mockReturnValue({
      data: [sevenDayOrder], isLoading: false, isError: false, isFetching: false,
      isPlaceholderData: false, isSuccess: true, refetch: vi.fn(),
    })
    rerender(createElement(HistoryScreen, { lang: 'ro', onOpenOrder: noop, isOffline: false }))

    const ordersCard = screen.getByText('Comenzi').closest('.card')
    expect(ordersCard.textContent).toContain('7 zile')
    expect(ordersCard.textContent).not.toContain('30 zile')
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

// ── Custom range popover wiring — D-03/D-04, the custom-range fetch seam (09-05 Task 2) ─────

describe('Custom range popover wiring — D-03/D-04 (09-05)', () => {
  // The Custom pill is whichever period pill is NOT one of the three static preset labels — its
  // own text is dynamic (either the static 'Interval'/'Custom' label or an applied formatted
  // range), so it cannot be found by a fixed textContent match the way the preset pills can.
  const PRESET_LABELS = ['Azi', '7 zile', '30 zile', 'Today', '7 days', '30 days']
  function getCustomPill() {
    return screen.getAllByTestId('history-period-pill').find((p) => !PRESET_LABELS.includes(p.textContent))
  }
  function applyRange(start, end) {
    fireEvent.click(getCustomPill())
    fireEvent.change(screen.getByTestId('history-range-start'), { target: { value: start } })
    fireEvent.change(screen.getByTestId('history-range-end'), { target: { value: end } })
    fireEvent.click(screen.getByTestId('history-range-apply'))
  }

  test('the popover is absent on mount; clicking the Custom pill opens it, clicking it again closes it', () => {
    useHistoryOrders.mockReturnValue({ data: [], isLoading: false, isError: false, isFetching: false, isPlaceholderData: false, isSuccess: true, refetch: vi.fn() })
    render(createElement(HistoryScreen, { lang: 'ro', onOpenOrder: noop, isOffline: false }))

    expect(screen.queryByTestId('history-range-popover')).toBeNull()

    const customPill = getCustomPill()
    fireEvent.click(customPill)
    expect(screen.getByTestId('history-range-popover')).toBeTruthy()

    fireEvent.click(customPill)
    expect(screen.queryByTestId('history-range-popover')).toBeNull()
  })

  // WR-01 (09-REVIEW.md): fireEvent.click alone never dispatches a preceding mousedown, so it
  // cannot exercise the real mousedown(close)->click(reopen) race a browser produces on a second
  // click. realClick fires the actual mousedown->mouseup->click sequence against the same target.
  function realClick(el) {
    fireEvent.mouseDown(el)
    fireEvent.mouseUp(el)
    fireEvent.click(el)
  }

  test('WR-01: a real mousedown->click sequence on the Custom pill opens then closes the popover (no reopen race)', () => {
    useHistoryOrders.mockReturnValue({ data: [], isLoading: false, isError: false, isFetching: false, isPlaceholderData: false, isSuccess: true, refetch: vi.fn() })
    render(createElement(HistoryScreen, { lang: 'ro', onOpenOrder: noop, isOffline: false }))

    const customPill = getCustomPill()
    realClick(customPill)
    expect(screen.getByTestId('history-range-popover')).toBeTruthy()

    // Second real click on the same (still-mounted) toggle button: the outside-click mousedown
    // handler must see this mousedown as INSIDE the boundary ref and not close the popover ahead
    // of the click's own toggle, or the popover would reopen immediately (the WR-01 bug).
    realClick(customPill)
    expect(screen.queryByTestId('history-range-popover')).toBeNull()
  })

  test('WR-01: a genuine outside mousedown still closes the popover', () => {
    useHistoryOrders.mockReturnValue({ data: [], isLoading: false, isError: false, isFetching: false, isPlaceholderData: false, isSuccess: true, refetch: vi.fn() })
    render(createElement(HistoryScreen, { lang: 'ro', onOpenOrder: noop, isOffline: false }))

    fireEvent.click(getCustomPill())
    expect(screen.getByTestId('history-range-popover')).toBeTruthy()

    fireEvent.mouseDown(document.body)
    expect(screen.queryByTestId('history-range-popover')).toBeNull()
  })

  test('applying a valid range calls useHistoryOrders with customRangeToQuery(from,to) and closes the popover', () => {
    useHistoryOrders.mockReturnValue({ data: [], isLoading: false, isError: false, isFetching: false, isPlaceholderData: false, isSuccess: true, refetch: vi.fn() })
    render(createElement(HistoryScreen, { lang: 'ro', onOpenOrder: noop, isOffline: false }))

    applyRange('2026-03-03', '2026-03-17')

    const expected = customRangeToQuery('2026-03-03', '2026-03-17')
    const callArg = useHistoryOrders.mock.calls[useHistoryOrders.mock.calls.length - 1][0]
    expect(callArg).toEqual(expected)
    expect(screen.queryByTestId('history-range-popover')).toBeNull()
  })

  test('after applying 2026-03-03..2026-03-17 (ro), the Custom pill reads "3 mar. – 17 mar." and no longer "Interval"', () => {
    useHistoryOrders.mockReturnValue({ data: [], isLoading: false, isError: false, isFetching: false, isPlaceholderData: false, isSuccess: true, refetch: vi.fn() })
    render(createElement(HistoryScreen, { lang: 'ro', onOpenOrder: noop, isOffline: false }))

    applyRange('2026-03-03', '2026-03-17')

    const customPill = getCustomPill()
    expect(customPill.textContent).toContain('3 mar. – 17 mar.')
    expect(customPill.textContent).not.toContain('Interval')
  })

  test('after applying, the Custom pill shows selected styling and the other three pills are unselected', () => {
    useHistoryOrders.mockReturnValue({ data: [], isLoading: false, isError: false, isFetching: false, isPlaceholderData: false, isSuccess: true, refetch: vi.fn() })
    render(createElement(HistoryScreen, { lang: 'ro', onOpenOrder: noop, isOffline: false }))

    applyRange('2026-03-03', '2026-03-17')

    const pills = screen.getAllByTestId('history-period-pill')
    const customPill = getCustomPill()
    expect(customPill.style.background).toBe('var(--sc-foreground)')
    pills.filter((p) => p !== customPill).forEach((p) => expect(p.style.background).toBe('transparent'))
  })

  test('after applying, the chevDown icon is still rendered within the Custom pill', () => {
    useHistoryOrders.mockReturnValue({ data: [], isLoading: false, isError: false, isFetching: false, isPlaceholderData: false, isSuccess: true, refetch: vi.fn() })
    render(createElement(HistoryScreen, { lang: 'ro', onOpenOrder: noop, isOffline: false }))

    applyRange('2026-03-03', '2026-03-17')

    const customPill = getCustomPill()
    expect(customPill.querySelector('svg path[d="M6 9l6 6 6-6"]')).toBeTruthy()
  })

  test('after applying, the tile sub-label reads the same formatted range once settled (D-12)', () => {
    useHistoryOrders.mockReturnValue({ data: [], isLoading: false, isError: false, isFetching: false, isPlaceholderData: false, isSuccess: true, refetch: vi.fn() })
    render(createElement(HistoryScreen, { lang: 'ro', onOpenOrder: noop, isOffline: false }))

    applyRange('2026-03-03', '2026-03-17')

    const ordersCard = screen.getByText('Comenzi').closest('.card')
    expect(ordersCard.textContent).toContain('3 mar. – 17 mar.')
  })

  test('after applying, the empty-state phrase reads the composed custom-range sentence (D-13)', () => {
    useHistoryOrders.mockReturnValue({ data: [], isLoading: false, isError: false, isFetching: false, isPlaceholderData: false, isSuccess: true, refetch: vi.fn() })
    render(createElement(HistoryScreen, { lang: 'ro', onOpenOrder: noop, isOffline: false }))

    applyRange('2026-03-03', '2026-03-17')

    expect(screen.getByText('Nicio comandă în intervalul 3 mar. – 17 mar.')).toBeTruthy()
  })

  test('applying a single-day range fetches a from/to exactly 24h apart and the pill reads the same date on both sides', () => {
    useHistoryOrders.mockReturnValue({ data: [], isLoading: false, isError: false, isFetching: false, isPlaceholderData: false, isSuccess: true, refetch: vi.fn() })
    render(createElement(HistoryScreen, { lang: 'ro', onOpenOrder: noop, isOffline: false }))

    applyRange('2026-03-10', '2026-03-10')

    const callArg = useHistoryOrders.mock.calls[useHistoryOrders.mock.calls.length - 1][0]
    expect(new Date(callArg.to).getTime() - new Date(callArg.from).getTime()).toBe(24 * 60 * 60 * 1000)

    const customPill = getCustomPill()
    const [left, right] = customPill.textContent.split(' – ')
    expect(left).toBe(right)
  })

  test('after applying, clicking "7 zile" reverts the Custom pill, selects the 7-day pill, and fetches getPresetRange("7")', () => {
    useHistoryOrders.mockReturnValue({ data: [], isLoading: false, isError: false, isFetching: false, isPlaceholderData: false, isSuccess: true, refetch: vi.fn() })
    render(createElement(HistoryScreen, { lang: 'ro', onOpenOrder: noop, isOffline: false }))

    applyRange('2026-03-03', '2026-03-17')

    const sevenPill = screen.getAllByTestId('history-period-pill').find((p) => p.textContent === '7 zile')
    fireEvent.click(sevenPill)

    const expected = getPresetRange('7')
    const callArg = useHistoryOrders.mock.calls[useHistoryOrders.mock.calls.length - 1][0]
    expect(callArg.to.slice(0, 10)).toBe(expected.to.slice(0, 10))
    expect(callArg.from.slice(0, 10)).toBe(expected.from.slice(0, 10))
    expect(sevenPill.style.background).toBe('var(--sc-foreground)')

    const customPill = getCustomPill()
    expect(customPill.textContent).toBe('Interval')
    expect(customPill.textContent).not.toMatch(/\d/)
  })

  test('after clearing via a preset click, reopening the popover shows both fields blank (D-04)', () => {
    useHistoryOrders.mockReturnValue({ data: [], isLoading: false, isError: false, isFetching: false, isPlaceholderData: false, isSuccess: true, refetch: vi.fn() })
    render(createElement(HistoryScreen, { lang: 'ro', onOpenOrder: noop, isOffline: false }))

    applyRange('2026-03-03', '2026-03-17')
    const sevenPill = screen.getAllByTestId('history-period-pill').find((p) => p.textContent === '7 zile')
    fireEvent.click(sevenPill)

    fireEvent.click(getCustomPill())
    expect(screen.getByTestId('history-range-start').value).toBe('')
    expect(screen.getByTestId('history-range-end').value).toBe('')
  })

  test('dismissing the popover with Escape after typing a range leaves the pill reading "Interval" and the fetched range unchanged', () => {
    useHistoryOrders.mockReturnValue({ data: [], isLoading: false, isError: false, isFetching: false, isPlaceholderData: false, isSuccess: true, refetch: vi.fn() })
    render(createElement(HistoryScreen, { lang: 'ro', onOpenOrder: noop, isOffline: false }))

    fireEvent.click(getCustomPill())
    fireEvent.change(screen.getByTestId('history-range-start'), { target: { value: '2026-03-03' } })
    fireEvent.change(screen.getByTestId('history-range-end'), { target: { value: '2026-03-17' } })
    fireEvent.keyDown(document, { key: 'Escape' })

    expect(screen.queryByTestId('history-range-popover')).toBeNull()
    const customPill = getCustomPill()
    expect(customPill.textContent).toBe('Interval')

    const expected = getPresetRange('30')
    const callArg = useHistoryOrders.mock.calls[useHistoryOrders.mock.calls.length - 1][0]
    expect(callArg.to.slice(0, 10)).toBe(expected.to.slice(0, 10))
    expect(callArg.from.slice(0, 10)).toBe(expected.from.slice(0, 10))
  })

  test('there is no rendered state where the Custom pill shows a date range while the resolved range is a preset range', () => {
    useHistoryOrders.mockReturnValue({ data: [], isLoading: false, isError: false, isFetching: false, isPlaceholderData: false, isSuccess: true, refetch: vi.fn() })
    render(createElement(HistoryScreen, { lang: 'ro', onOpenOrder: noop, isOffline: false }))

    // Mount: preset '30' is live, Custom pill shows the static label.
    expect(getCustomPill().textContent).toBe('Interval')

    // Apply a custom range: Custom pill now shows dates, matching the live fetched range.
    applyRange('2026-03-03', '2026-03-17')
    expect(getCustomPill().textContent).toContain('–')
    let callArg = useHistoryOrders.mock.calls[useHistoryOrders.mock.calls.length - 1][0]
    expect(callArg).toEqual(customRangeToQuery('2026-03-03', '2026-03-17'))

    // Switch to a preset: Custom pill reverts to the static label, matching the (now preset) live range.
    fireEvent.click(screen.getAllByTestId('history-period-pill').find((p) => p.textContent === '7 zile'))
    expect(getCustomPill().textContent).toBe('Interval')
    callArg = useHistoryOrders.mock.calls[useHistoryOrders.mock.calls.length - 1][0]
    const expected = getPresetRange('7')
    expect(callArg.to.slice(0, 10)).toBe(expected.to.slice(0, 10))
  })
})

// ── Phase 10 integration coverage (10-04) — faceted status filtering (D-01/D-02), F-03 order,
// D-03 zero-pill→empty, D-04 filtered day-header/tile recompute, D-15 Avg-tile fix, the D-10
// debounce (fake timers), and both empty-state variants (D-13/D-14) ─────

describe('Phase 10 integration — faceting, debounce, filtered recompute, empty-state variants', () => {
  // Fixture spans completed/refunded/canceled and delivery/pickup/dinein, all on the SAME local
  // day (2026-07-10) so D-04's day-header recompute has exactly one group to observe.
  function facetedFixture() {
    return [
      makeOrder({ id: 'f-completed-dinein', dailyOrderNumber: 601, status: 'COMPLETED', type: 'dinein', total: 100, customerName: 'Lucas Popescu', placedAt: new Date(2026, 6, 10, 9, 0).toISOString() }),
      makeOrder({ id: 'f-completed-delivery', dailyOrderNumber: 602, status: 'COMPLETED', type: 'delivery', total: 50, customerName: 'Maria Ionescu', placedAt: new Date(2026, 6, 10, 10, 0).toISOString() }),
      makeOrder({ id: 'f-refunded-pickup', dailyOrderNumber: 603, status: 'COMPLETED', paymentCaptureStatus: 'refunded', type: 'pickup', total: 30, customerName: 'Elena Radu', placedAt: new Date(2026, 6, 10, 11, 0).toISOString() }),
      makeOrder({ id: 'f-canceled-dinein', dailyOrderNumber: 604, status: 'CANCELLED', type: 'dinein', total: 40, customerName: 'Vasile Dan', placedAt: new Date(2026, 6, 10, 12, 0).toISOString() }),
      makeOrder({ id: 'f-canceled-delivery', dailyOrderNumber: 605, status: 'CANCELLED', type: 'delivery', total: 20, customerName: 'Ioana Cristea', placedAt: new Date(2026, 6, 10, 13, 0).toISOString() }),
    ]
  }

  // getNodeText (RTL's default text matcher) only concatenates a node's DIRECT text-node
  // children — the button's own {f.label} text node, never the nested <span> badge's text —
  // so getByText(label).closest('button') resolves the exact status pill (existing precedent,
  // line 281 above).
  function getStatusPill(label) {
    return screen.getByText(label).closest('button')
  }
  function badgeCount(button) {
    return button.querySelector('span').textContent
  }

  test('F-03: the four status pills render in order All/Completed/Refunded/Canceled', () => {
    useHistoryOrders.mockReturnValue({ data: facetedFixture(), isLoading: false, isError: false, isFetching: false, isPlaceholderData: false, isSuccess: true, refetch: vi.fn() })
    render(createElement(HistoryScreen, { lang: 'ro', onOpenOrder: noop, isOffline: false }))

    // The status group is whichever 'Toate'-labeled pill's parent has 4 children each carrying a
    // count badge span — the type group's 'Toate' pill has no badge, so this disambiguates
    // without relying on DOM order alone.
    const toatePills = screen.getAllByText('Toate').map((el) => el.closest('button'))
    const statusAllPill = toatePills.find((btn) => btn.querySelector('span') !== null)
    const statusGroup = statusAllPill.parentElement
    const labels = Array.from(statusGroup.children).map((btn) => btn.childNodes[0].textContent)
    expect(labels).toEqual(['Toate', 'Finalizate', 'Rambursate', 'Anulate'])
  })

  test('D-02: selecting Completed leaves the Canceled and Refunded pills showing their true non-zero counts, not 0', () => {
    useHistoryOrders.mockReturnValue({ data: facetedFixture(), isLoading: false, isError: false, isFetching: false, isPlaceholderData: false, isSuccess: true, refetch: vi.fn() })
    render(createElement(HistoryScreen, { lang: 'ro', onOpenOrder: noop, isOffline: false }))

    // Before selecting: all=5, completed=2, refunded=1, canceled=2.
    expect(badgeCount(getStatusPill('Rambursate'))).toBe('1')
    expect(badgeCount(getStatusPill('Anulate'))).toBe('2')

    fireEvent.click(getStatusPill('Finalizate'))

    // D-02 (exclude-self faceting): selecting Completed must NOT zero out the sibling pills'
    // counts — they are tallied over byTypeAndSearch, never re-derived from the post-selection set.
    expect(badgeCount(getStatusPill('Rambursate'))).toBe('1')
    expect(badgeCount(getStatusPill('Anulate'))).toBe('2')
    // The rows themselves DO narrow to the selected status (D-04, confirmed in its own test below).
    expect(screen.getAllByTestId('history-row').length).toBe(2)
  })

  test('D-03: a zero-count status pill is clickable and lands on the filtered empty state (Variant B)', () => {
    // No refunded orders in this smaller fixture — the Refunded pill reads 0 and must still work.
    const orders = [
      makeOrder({ id: 'zc-1', dailyOrderNumber: 700, status: 'COMPLETED', type: 'dinein', total: 10 }),
      makeOrder({ id: 'zc-2', dailyOrderNumber: 701, status: 'CANCELLED', type: 'dinein', total: 20 }),
    ]
    useHistoryOrders.mockReturnValue({ data: orders, isLoading: false, isError: false, isFetching: false, isPlaceholderData: false, isSuccess: true, refetch: vi.fn() })
    render(createElement(HistoryScreen, { lang: 'ro', onOpenOrder: noop, isOffline: false }))

    const refundedPill = getStatusPill('Rambursate')
    expect(badgeCount(refundedPill)).toBe('0')
    expect(refundedPill.disabled).toBeFalsy()

    fireEvent.click(refundedPill)

    expect(screen.getByText('Nicio comandă nu se potrivește cu filtrele active.')).toBeTruthy()
    expect(screen.queryByText('Comenzile finalizate vor apărea aici.')).toBeNull()
    expect(screen.getByText('Șterge filtrele')).toBeTruthy()
  })

  test('D-13/D-14: Clear Filters resets status/type/query and restores Variant A', () => {
    const orders = [
      makeOrder({ id: 'cf-1', dailyOrderNumber: 800, status: 'COMPLETED', type: 'dinein', total: 10 }),
    ]
    useHistoryOrders.mockReturnValue({ data: orders, isLoading: false, isError: false, isFetching: false, isPlaceholderData: false, isSuccess: true, refetch: vi.fn() })
    render(createElement(HistoryScreen, { lang: 'ro', onOpenOrder: noop, isOffline: false }))

    // Select Canceled — the fixture has no canceled orders, so Variant B renders (D-03/D-13).
    fireEvent.click(getStatusPill('Anulate'))
    expect(screen.getByText('Nicio comandă nu se potrivește cu filtrele active.')).toBeTruthy()

    fireEvent.click(screen.getByText('Șterge filtrele'))

    // D-14: Clear Filters must restore Variant A (period copy) — the single completed order is
    // visible again, and the status pill is back to All.
    expect(screen.queryByText('Nicio comandă nu se potrivește cu filtrele active.')).toBeNull()
    expect(screen.getAllByTestId('history-row').length).toBe(1)
  })

  test('D-14 prohibition: Clear Filters never touches the active period/date-range', () => {
    const orders = [makeOrder({ id: 'cf-period-1', dailyOrderNumber: 810, status: 'CANCELLED', type: 'dinein', total: 10 })]
    useHistoryOrders.mockReturnValue({ data: orders, isLoading: false, isError: false, isFetching: false, isPlaceholderData: false, isSuccess: true, refetch: vi.fn() })
    render(createElement(HistoryScreen, { lang: 'ro', onOpenOrder: noop, isOffline: false }))

    // Switch to the 7-day period first.
    const sevenPill = screen.getAllByTestId('history-period-pill').find((p) => p.textContent === '7 zile')
    fireEvent.click(sevenPill)
    const rangeBeforeClear = useHistoryOrders.mock.calls[useHistoryOrders.mock.calls.length - 1][0]

    // Land on the filtered-empty state (no completed orders in this fixture) and Clear Filters.
    // Selecting a status pill and clicking Clear Filters both re-render HistoryScreen (so
    // useHistoryOrders — a hook call, not a fetch trigger — IS invoked again on each render); the
    // load-bearing assertion is that the RANGE ARGUMENT never changes, i.e. no period/range setter
    // was ever touched by either action (D-14 prohibition).
    fireEvent.click(getStatusPill('Finalizate'))
    expect(screen.getByText('Nicio comandă nu se potrivește cu filtrele active.')).toBeTruthy()
    fireEvent.click(screen.getByText('Șterge filtrele'))

    const rangeAfterClear = useHistoryOrders.mock.calls[useHistoryOrders.mock.calls.length - 1][0]
    expect(rangeAfterClear).toEqual(rangeBeforeClear)
    expect(sevenPill.style.background).toBe('var(--sc-foreground)')
  })

  test('D-04: a canceled-only filter recomputes day-header counts/subtotals and the summary tiles to the canceled subset', () => {
    useHistoryOrders.mockReturnValue({ data: facetedFixture(), isLoading: false, isError: false, isFetching: false, isPlaceholderData: false, isSuccess: true, refetch: vi.fn() })
    render(createElement(HistoryScreen, { lang: 'ro', onOpenOrder: noop, isOffline: false }))

    fireEvent.click(getStatusPill('Anulate'))

    // Only the 2 canceled rows remain; the day header narrows its count/revenue to that subset.
    expect(screen.getAllByTestId('history-row').length).toBe(2)
    const header = screen.getByTestId('history-day-header')
    expect(header.textContent).toContain('2')
    // Canceled rows never contribute to revenue (history-utils.groupOrdersByDay) — 0,00 lei.
    expect(header.textContent).toContain('0,00 lei')

    // Summary tiles: ordersCount narrows to 2, revenue to 0.
    const ordersCard = screen.getByText('Comenzi').closest('.card')
    expect(ordersCard.textContent).toContain('2')
    const revenueCard = screen.getByText('Încasări').closest('.card')
    expect(revenueCard.textContent).toContain('0,00 lei')
  })

  test('D-15: a canceled-only filter with canceled rows present renders the Avg tile as a RON zero, not "—"', () => {
    useHistoryOrders.mockReturnValue({ data: facetedFixture(), isLoading: false, isError: false, isFetching: false, isPlaceholderData: false, isSuccess: true, refetch: vi.fn() })
    render(createElement(HistoryScreen, { lang: 'ro', onOpenOrder: noop, isOffline: false }))

    fireEvent.click(getStatusPill('Anulate'))

    const avgCard = screen.getByText('Valoare medie').closest('.card')
    expect(avgCard.textContent).toContain('0,00 lei')
    expect(avgCard.textContent).not.toContain('—')
  })

  test('type filter: selecting "Livrare" narrows rows to delivery-type orders across every status', () => {
    useHistoryOrders.mockReturnValue({ data: facetedFixture(), isLoading: false, isError: false, isFetching: false, isPlaceholderData: false, isSuccess: true, refetch: vi.fn() })
    render(createElement(HistoryScreen, { lang: 'ro', onOpenOrder: noop, isOffline: false }))

    // 'Livrare' also renders inside each delivery row's type chip (a <span>, not a <button>) —
    // scope to the actual <button> element to avoid TestingLibraryElementError.
    const deliveryTypeBtn = screen.getAllByText('Livrare').find((el) => el.tagName === 'BUTTON')
    fireEvent.click(deliveryTypeBtn)

    // Fixture has exactly 2 delivery orders (one completed, one canceled) — both survive.
    expect(screen.getAllByTestId('history-row').length).toBe(2)
  })

  test('D-10: a rapid keystroke burst yields exactly one filtered recompute after advanceTimersByTime(250); clearing applies immediately', () => {
    vi.useFakeTimers()
    try {
      useHistoryOrders.mockReturnValue({ data: facetedFixture(), isLoading: false, isError: false, isFetching: false, isPlaceholderData: false, isSuccess: true, refetch: vi.fn() })
      render(createElement(HistoryScreen, { lang: 'ro', onOpenOrder: noop, isOffline: false }))

      const searchInput = screen.getByPlaceholderText('Caută după # sau client')
      expect(screen.getAllByTestId('history-row').length).toBe(5)

      // A rapid keystroke burst — each keystroke supersedes the previous debounce timer
      // (clearTimeout cleanup, D-10/Pitfall 3).
      fireEvent.change(searchInput, { target: { value: 'L' } })
      fireEvent.change(searchInput, { target: { value: 'Lu' } })
      fireEvent.change(searchInput, { target: { value: 'Luc' } })
      fireEvent.change(searchInput, { target: { value: 'Luca' } })
      fireEvent.change(searchInput, { target: { value: 'Lucas' } })

      // Before the debounce window elapses, the filtered set has NOT recomputed — all 5 rows
      // still render (debouncedQuery is still '').
      expect(screen.getAllByTestId('history-row').length).toBe(5)

      act(() => { vi.advanceTimersByTime(250) })

      // Exactly one recompute lands, filtering to the single Lucas Popescu row.
      expect(screen.getAllByTestId('history-row').length).toBe(1)
      expect(screen.getByText('Lucas Popescu')).toBeTruthy()

      // D-10: clearing the box applies immediately — no timer advance needed.
      fireEvent.change(searchInput, { target: { value: '' } })
      expect(screen.getAllByTestId('history-row').length).toBe(5)
    } finally {
      vi.useRealTimers()
    }
  })

  test('D-12: a status filter survives a period switch — period and filters are independent axes', () => {
    useHistoryOrders.mockReturnValue({ data: facetedFixture(), isLoading: false, isError: false, isFetching: false, isPlaceholderData: false, isSuccess: true, refetch: vi.fn() })
    render(createElement(HistoryScreen, { lang: 'ro', onOpenOrder: noop, isOffline: false }))

    fireEvent.click(getStatusPill('Anulate'))
    expect(getStatusPill('Anulate').style.background).toBe('var(--sc-primary)')
    expect(screen.getAllByTestId('history-row').length).toBe(2)

    // Switch period — this must NOT reset statusFilter (D-12: period and filters are separate
    // axes; neither setter derives from or resets the other, by construction).
    const sevenPill = screen.getAllByTestId('history-period-pill').find((p) => p.textContent === '7 zile')
    fireEvent.click(sevenPill)

    expect(getStatusPill('Anulate').style.background).toBe('var(--sc-primary)')
    // The mocked data is unchanged across the "switch" (useHistoryOrders is mocked, not a real
    // fetch) — the canceled-only filter still narrows the same 2 rows post-switch.
    expect(screen.getAllByTestId('history-row').length).toBe(2)
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

  test('falls back to a distinct neutral mapping (not completed) for an unrecognized status', () => {
    const meta = historyStatusMeta('unknown', t)
    expect(meta).not.toEqual(historyStatusMeta('completed', t))
    expect(meta.chip).toBe('chip-slate')
  })
})

// ── CustomRangePopover — popover fields, guardrails, Apply (09-05 Task 1, HIST-04 SC2) ─────

describe('CustomRangePopover popover (09-05)', () => {
  const t = (key) => key
  const noopOnApply = () => {}
  const noopOnClose = () => {}

  // Local-midnight-safe 'YYYY-MM-DD' formatter — mirrors screen-history.jsx's own
  // toDateInputValue, never `.toISOString()` (UTC-slice drift).
  const fmt = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

  test('renders both field labels, two date inputs (blank), and the Apply button', () => {
    render(createElement(CustomRangePopover, { t, onApply: noopOnApply, onClose: noopOnClose }))

    expect(screen.getByText('h_range_start')).toBeTruthy()
    expect(screen.getByText('h_range_end')).toBeTruthy()
    expect(screen.getByTestId('history-range-start').value).toBe('')
    expect(screen.getByTestId('history-range-end').value).toBe('')
    expect(screen.getByTestId('history-range-apply')).toBeTruthy()
  })

  test('with both fields empty, Apply is disabled and no cap message renders', () => {
    render(createElement(CustomRangePopover, { t, onApply: noopOnApply, onClose: noopOnClose }))

    expect(screen.getByTestId('history-range-apply').disabled).toBe(true)
    expect(screen.queryByTestId('history-range-cap')).toBeNull()
  })

  test('with only the start field filled, Apply stays disabled', () => {
    render(createElement(CustomRangePopover, { t, onApply: noopOnApply, onClose: noopOnClose }))

    fireEvent.change(screen.getByTestId('history-range-start'), { target: { value: '2020-03-03' } })
    expect(screen.getByTestId('history-range-apply').disabled).toBe(true)
  })

  test('with a valid range, Apply is enabled and no cap message renders', () => {
    render(createElement(CustomRangePopover, { t, onApply: noopOnApply, onClose: noopOnClose }))

    fireEvent.change(screen.getByTestId('history-range-start'), { target: { value: '2020-03-03' } })
    fireEvent.change(screen.getByTestId('history-range-end'), { target: { value: '2020-03-17' } })

    expect(screen.getByTestId('history-range-apply').disabled).toBe(false)
    expect(screen.queryByTestId('history-range-cap')).toBeNull()
  })

  test('clicking Apply with a valid range calls onApply once with customRangeToQuery(...), then closes', () => {
    const onApply = vi.fn()
    const onClose = vi.fn()
    render(createElement(CustomRangePopover, { t, onApply, onClose }))

    fireEvent.change(screen.getByTestId('history-range-start'), { target: { value: '2020-03-03' } })
    fireEvent.change(screen.getByTestId('history-range-end'), { target: { value: '2020-03-17' } })
    fireEvent.click(screen.getByTestId('history-range-apply'))

    expect(onApply).toHaveBeenCalledTimes(1)
    expect(onApply).toHaveBeenCalledWith(customRangeToQuery('2020-03-03', '2020-03-17'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  test('with end before start, Apply is disabled and onApply is never called on click', () => {
    const onApply = vi.fn()
    render(createElement(CustomRangePopover, { t, onApply, onClose: noopOnClose }))

    fireEvent.change(screen.getByTestId('history-range-start'), { target: { value: '2020-03-17' } })
    fireEvent.change(screen.getByTestId('history-range-end'), { target: { value: '2020-03-03' } })

    expect(screen.getByTestId('history-range-apply').disabled).toBe(true)
    fireEvent.click(screen.getByTestId('history-range-apply'))
    expect(onApply).not.toHaveBeenCalled()
  })

  test('with a span over 366 days, Apply is disabled and the cap message renders in var(--sc-destructive)', () => {
    render(createElement(CustomRangePopover, { t, onApply: noopOnApply, onClose: noopOnClose }))

    fireEvent.change(screen.getByTestId('history-range-start'), { target: { value: '2018-03-17' } })
    fireEvent.change(screen.getByTestId('history-range-end'), { target: { value: '2020-03-17' } })

    expect(screen.getByTestId('history-range-apply').disabled).toBe(true)
    const cap = screen.getByTestId('history-range-cap')
    expect(cap.textContent).toBe('h_range_cap_message')
    expect(cap.style.color).toBe('var(--sc-destructive)')
  })

  test('with a span of exactly 366 days, Apply is enabled and no cap message renders', () => {
    render(createElement(CustomRangePopover, { t, onApply: noopOnApply, onClose: noopOnClose }))

    const end = new Date(2020, 2, 17)
    const start = new Date(2020, 2, 17)
    start.setDate(start.getDate() - 365) // inclusive span of exactly 366 days

    fireEvent.change(screen.getByTestId('history-range-start'), { target: { value: fmt(start) } })
    fireEvent.change(screen.getByTestId('history-range-end'), { target: { value: fmt(end) } })

    expect(screen.getByTestId('history-range-apply').disabled).toBe(false)
    expect(screen.queryByTestId('history-range-cap')).toBeNull()
  })

  test('with start equal to end, Apply is enabled (adjacency edge)', () => {
    render(createElement(CustomRangePopover, { t, onApply: noopOnApply, onClose: noopOnClose }))

    fireEvent.change(screen.getByTestId('history-range-start'), { target: { value: '2020-03-10' } })
    fireEvent.change(screen.getByTestId('history-range-end'), { target: { value: '2020-03-10' } })

    expect(screen.getByTestId('history-range-apply').disabled).toBe(false)
  })

  test("the End input's max is today; after picking End, Start's max is that date and min is 366 days earlier", () => {
    render(createElement(CustomRangePopover, { t, onApply: noopOnApply, onClose: noopOnClose }))

    const today = fmt(new Date())
    expect(screen.getByTestId('history-range-end').max).toBe(today)

    fireEvent.change(screen.getByTestId('history-range-end'), { target: { value: '2020-03-17' } })
    expect(screen.getByTestId('history-range-start').max).toBe('2020-03-17')

    const expectedMin = new Date(2020, 2, 17)
    expectedMin.setDate(expectedMin.getDate() - 365)
    expect(screen.getByTestId('history-range-start').min).toBe(fmt(expectedMin))
  })

  test('a mousedown outside the panel calls onClose and never onApply', () => {
    const onApply = vi.fn()
    const onClose = vi.fn()
    render(createElement('div', null, createElement(CustomRangePopover, { t, onApply, onClose })))

    fireEvent.mouseDown(document.body)
    expect(onClose).toHaveBeenCalledTimes(1)
    expect(onApply).not.toHaveBeenCalled()
  })

  test('an Escape keydown calls onClose and never onApply', () => {
    const onApply = vi.fn()
    const onClose = vi.fn()
    render(createElement(CustomRangePopover, { t, onApply, onClose }))

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
    expect(onApply).not.toHaveBeenCalled()
  })

  test('a mousedown INSIDE the panel does not close it', () => {
    const onClose = vi.fn()
    render(createElement(CustomRangePopover, { t, onApply: noopOnApply, onClose }))

    fireEvent.mouseDown(screen.getByTestId('history-range-popover'))
    expect(onClose).not.toHaveBeenCalled()
  })

  test('unmounting the popover removes both document listeners — a post-unmount Escape does not call onClose', () => {
    const onClose = vi.fn()
    const { unmount } = render(createElement(CustomRangePopover, { t, onApply: noopOnApply, onClose }))

    unmount()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).not.toHaveBeenCalled()
  })
})

// ── Export CSV — HIST-12 (11-04): handleExportCsv build -> save -> writeTextFile, with
// cancel/error/empty/success coverage and the D-14 default-filename contract ─────

describe('Export CSV — HIST-12 (11-04)', () => {
  function renderWithOrder(overrides = {}) {
    const order = makeOrder({ id: 'export-1', dailyOrderNumber: 900, total: 42, ...overrides })
    useHistoryOrders.mockReturnValue({ data: [order], isLoading: false, isError: false, isFetching: false, isPlaceholderData: false, isSuccess: true, refetch: vi.fn() })
    render(createElement(HistoryScreen, { lang: 'ro', onOpenOrder: noop, isOffline: false }))
    return order
  }
  function exportButton() {
    return screen.getByText('Exportă CSV').closest('button')
  }

  test('empty visible set: Export is disabled, dimmed (opacity 0.5/pointerEvents none/cursor not-allowed), carries the h_export_empty_tooltip title', () => {
    useHistoryOrders.mockReturnValue({ data: [], isLoading: false, isError: false, isFetching: false, isPlaceholderData: false, isSuccess: true, refetch: vi.fn() })
    render(createElement(HistoryScreen, { lang: 'ro', onOpenOrder: noop, isOffline: false }))

    const btn = exportButton()
    expect(btn.disabled).toBe(true)
    expect(btn.style.opacity).toBe('0.5')
    expect(btn.style.pointerEvents).toBe('none')
    expect(btn.style.cursor).toBe('not-allowed')
    expect(btn.title).toBe('Nicio comandă de exportat')
  })

  test('non-empty visible set: Export is enabled, full-opacity, and carries no title', () => {
    renderWithOrder()
    const btn = exportButton()
    expect(btn.disabled).toBe(false)
    expect(btn.style.opacity).toBe('')
    expect(btn.title).toBe('')
  })

  test('happy path: click -> save() resolves a path -> writeTextFile(path, buildCsv(visible)) -> toast_saved success toast with pluralized detail', async () => {
    const order = renderWithOrder()
    save.mockResolvedValue('/Users/staff/Desktop/orders.csv')
    writeTextFile.mockResolvedValue(undefined)

    fireEvent.click(exportButton())

    await waitFor(() => expect(writeTextFile).toHaveBeenCalledTimes(1))
    const [path, csv] = writeTextFile.mock.calls[0]
    expect(path).toBe('/Users/staff/Desktop/orders.csv')
    expect(csv).toBe(buildCsv([order]))

    await waitFor(() => expect(pushToastMock).toHaveBeenCalledTimes(1))
    expect(pushToastMock).toHaveBeenCalledWith(expect.objectContaining({
      kind: 'success',
      title: 'Salvat',
      detail: '1 comandă',
    }))
  })

  test('happy path pluralization: 2 visible orders push a "2 comenzi" success detail', async () => {
    const orders = [
      makeOrder({ id: 'p1', dailyOrderNumber: 901, total: 10 }),
      makeOrder({ id: 'p2', dailyOrderNumber: 902, total: 20 }),
    ]
    useHistoryOrders.mockReturnValue({ data: orders, isLoading: false, isError: false, isFetching: false, isPlaceholderData: false, isSuccess: true, refetch: vi.fn() })
    render(createElement(HistoryScreen, { lang: 'ro', onOpenOrder: noop, isOffline: false }))
    save.mockResolvedValue('/tmp/orders.csv')
    writeTextFile.mockResolvedValue(undefined)

    fireEvent.click(exportButton())

    await waitFor(() => expect(pushToastMock).toHaveBeenCalledTimes(1))
    expect(pushToastMock).toHaveBeenCalledWith(expect.objectContaining({ detail: '2 comenzi' }))
  })

  test('cancel: save() resolving null is a silent no-op — writeTextFile is never called and no toast is pushed', async () => {
    renderWithOrder()
    save.mockResolvedValue(null)

    fireEvent.click(exportButton())

    await waitFor(() => expect(save).toHaveBeenCalledTimes(1))
    expect(writeTextFile).not.toHaveBeenCalled()
    expect(pushToastMock).not.toHaveBeenCalled()
  })

  test('cancel: save() resolving undefined behaves identically to null (silent no-op)', async () => {
    renderWithOrder()
    save.mockResolvedValue(undefined)

    fireEvent.click(exportButton())

    await waitFor(() => expect(save).toHaveBeenCalledTimes(1))
    expect(writeTextFile).not.toHaveBeenCalled()
    expect(pushToastMock).not.toHaveBeenCalled()
  })

  test('error: a thrown writeTextFile (after a real save() path) pushes an h_export_error_title error toast with String(err) detail', async () => {
    renderWithOrder()
    save.mockResolvedValue('/tmp/orders.csv')
    writeTextFile.mockRejectedValue(new Error('disk full'))

    fireEvent.click(exportButton())

    await waitFor(() => expect(pushToastMock).toHaveBeenCalledTimes(1))
    expect(pushToastMock).toHaveBeenCalledWith(expect.objectContaining({
      kind: 'error',
      title: 'Eroare la export',
      detail: 'Error: disk full',
    }))
  })

  test('error: a thrown save() pushes the same error toast and writeTextFile is never called', async () => {
    renderWithOrder()
    save.mockRejectedValue(new Error('dialog crashed'))

    fireEvent.click(exportButton())

    await waitFor(() => expect(pushToastMock).toHaveBeenCalledTimes(1))
    expect(writeTextFile).not.toHaveBeenCalled()
    expect(pushToastMock).toHaveBeenCalledWith(expect.objectContaining({
      kind: 'error',
      title: 'Eroare la export',
      detail: 'Error: dialog crashed',
    }))
  })

  test('filename: save() is called with defaultPath orders_<from>_<to>.csv for the active range and a CSV filter', async () => {
    renderWithOrder()
    save.mockResolvedValue('/tmp/orders.csv')
    writeTextFile.mockResolvedValue(undefined)

    fireEvent.click(exportButton())

    await waitFor(() => expect(save).toHaveBeenCalledTimes(1))
    const arg = save.mock.calls[0][0]
    expect(arg.defaultPath).toMatch(/^orders_\d{4}-\d{2}-\d{2}_\d{4}-\d{2}-\d{2}\.csv$/)
    expect(arg.filters).toEqual([{ name: 'CSV', extensions: ['csv'] }])

    // The end date is the settled range's INCLUSIVE last day (today, for the default 30-day
    // mount), never the exclusive to-boundary (tomorrow) getPresetRange('30') actually returns.
    const today = new Date()
    const pad = (n) => String(n).padStart(2, '0')
    const todayStr = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`
    expect(arg.defaultPath).toContain(`_${todayStr}.csv`)
  })

  test('no in-app pending/disabled-while-running state: Export stays enabled/undimmed through the in-flight async save (loading coverage)', async () => {
    renderWithOrder()
    let resolveSave
    save.mockReturnValue(new Promise((resolve) => { resolveSave = resolve }))

    fireEvent.click(exportButton())

    const btn = exportButton()
    expect(btn.disabled).toBe(false)
    expect(btn.style.opacity).toBe('')

    resolveSave(null)
    await waitFor(() => expect(save).toHaveBeenCalledTimes(1))
  })
})
