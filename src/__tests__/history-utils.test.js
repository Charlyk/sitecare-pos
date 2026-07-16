// Tests for history-utils.js pure functions — HIST-03, HIST-05 (D-01, D-02, D-04, D-10, D-11, D-12)
// Wave 0 stub: tests fail RED until src/history-utils.js is implemented.

import {
  getLast30DaysRange,
  filterFinishedOrders,
  deriveDisplayStatus,
  groupOrdersByDay,
  computeSummary,
} from '../history-utils.js'

// ── getLast30DaysRange — HIST-03, D-04 ────────────────────────────────────

describe('getLast30DaysRange', () => {
  const fixedNow = new Date(2026, 6, 17, 14, 30, 0, 0) // 2026-07-17 14:30 local

  test('returns an object with exactly two string keys, from and to', () => {
    const range = getLast30DaysRange(fixedNow)
    expect(Object.keys(range).sort()).toEqual(['from', 'to'])
    expect(typeof range.from).toBe('string')
    expect(typeof range.to).toBe('string')
    expect(new Date(range.from).toString()).not.toBe('Invalid Date')
    expect(new Date(range.to).toString()).not.toBe('Invalid Date')
  })

  test('from parses to local midnight 29 days before now', () => {
    const { from } = getLast30DaysRange(fixedNow)
    const d = new Date(from)
    const expected = new Date(fixedNow.getFullYear(), fixedNow.getMonth(), fixedNow.getDate() - 29)
    expect(d.getHours()).toBe(0)
    expect(d.getMinutes()).toBe(0)
    expect(d.getSeconds()).toBe(0)
    expect(d.getFullYear()).toBe(expected.getFullYear())
    expect(d.getMonth()).toBe(expected.getMonth())
    expect(d.getDate()).toBe(expected.getDate())
  })

  test('to parses to local midnight of the day after now (exclusive upper bound)', () => {
    const { to } = getLast30DaysRange(fixedNow)
    const d = new Date(to)
    const expected = new Date(fixedNow.getFullYear(), fixedNow.getMonth(), fixedNow.getDate() + 1)
    expect(d.getHours()).toBe(0)
    expect(d.getMinutes()).toBe(0)
    expect(d.getSeconds()).toBe(0)
    expect(d.getFullYear()).toBe(expected.getFullYear())
    expect(d.getMonth()).toBe(expected.getMonth())
    expect(d.getDate()).toBe(expected.getDate())
  })

  test('window spans 30 distinct local calendar days inclusive of now', () => {
    const { from, to } = getLast30DaysRange(fixedNow)
    const days = Math.round((new Date(to).getTime() - new Date(from).getTime()) / (24 * 60 * 60 * 1000))
    expect(days).toBe(30)
  })
})

// ── deriveDisplayStatus — D-02 precedence ─────────────────────────────────

describe('deriveDisplayStatus', () => {
  test('refunded wins over completed', () => {
    expect(deriveDisplayStatus({ status: 'COMPLETED', paymentCaptureStatus: 'refunded' })).toBe('refunded')
  })

  test('refunded wins over canceled', () => {
    expect(deriveDisplayStatus({ status: 'CANCELLED', paymentCaptureStatus: 'refunded' })).toBe('refunded')
  })

  test('canceled when captured and status is CANCELLED', () => {
    expect(deriveDisplayStatus({ status: 'CANCELLED', paymentCaptureStatus: 'captured' })).toBe('canceled')
  })

  test('completed when captured and status is COMPLETED', () => {
    expect(deriveDisplayStatus({ status: 'COMPLETED', paymentCaptureStatus: 'captured' })).toBe('completed')
  })

  test('completed when paymentCaptureStatus is null (cash orders)', () => {
    expect(deriveDisplayStatus({ status: 'COMPLETED', paymentCaptureStatus: null })).toBe('completed')
  })

  test('null for an in-flight status', () => {
    expect(deriveDisplayStatus({ status: 'PREPARING', paymentCaptureStatus: null })).toBe(null)
  })
})

// ── filterFinishedOrders — D-01 ────────────────────────────────────────────

describe('filterFinishedOrders', () => {
  test('keeps COMPLETED and CANCELLED, drops in-flight statuses', () => {
    const orders = [
      { id: '1', status: 'NEW' },
      { id: '2', status: 'ACCEPTED' },
      { id: '3', status: 'PREPARING' },
      { id: '4', status: 'READY' },
      { id: '5', status: 'OUT_FOR_DELIVERY' },
      { id: '6', status: 'COMPLETED' },
      { id: '7', status: 'CANCELLED' },
    ]
    const result = filterFinishedOrders(orders)
    expect(result.map((o) => o.id).sort()).toEqual(['6', '7'])
  })

  test('returns [] for an empty array', () => {
    expect(filterFinishedOrders([])).toEqual([])
  })

  test('does not mutate its input array', () => {
    const orders = [{ id: '1', status: 'COMPLETED' }, { id: '2', status: 'NEW' }]
    const result = filterFinishedOrders(orders)
    expect(orders.length).toBe(2)
    expect(result).not.toBe(orders)
  })
})

// ── groupOrdersByDay — D-04, D-10, D-11, D-12 ─────────────────────────────

describe('groupOrdersByDay', () => {
  test('days sorted newest-first, orders within a day sorted newest-first', () => {
    const orders = [
      { id: 'a', status: 'COMPLETED', paymentCaptureStatus: null, total: 10, placedAt: new Date(2026, 6, 1, 10, 0).toISOString() },
      { id: 'b', status: 'COMPLETED', paymentCaptureStatus: null, total: 20, placedAt: new Date(2026, 6, 2, 9, 0).toISOString() },
      { id: 'c', status: 'COMPLETED', paymentCaptureStatus: null, total: 30, placedAt: new Date(2026, 6, 2, 15, 0).toISOString() },
    ]
    const groups = groupOrdersByDay(orders)
    expect(groups.map((g) => g.dayKey)).toEqual(['2026-07-02', '2026-07-01'])
    expect(groups[0].orders.map((o) => o.id)).toEqual(['c', 'b'])
  })

  test('count includes every row, including canceled and refunded', () => {
    const orders = [
      { id: 'a', status: 'COMPLETED', paymentCaptureStatus: null, total: 10, placedAt: new Date(2026, 6, 5, 10, 0).toISOString() },
      { id: 'b', status: 'CANCELLED', paymentCaptureStatus: null, total: 20, placedAt: new Date(2026, 6, 5, 11, 0).toISOString() },
      { id: 'c', status: 'COMPLETED', paymentCaptureStatus: 'refunded', total: 30, placedAt: new Date(2026, 6, 5, 12, 0).toISOString() },
    ]
    const groups = groupOrdersByDay(orders)
    expect(groups).toHaveLength(1)
    expect(groups[0].count).toBe(3)
  })

  test('revenue sums only completed rows — a day of only canceled/refunded is non-zero count, zero revenue', () => {
    const orders = [
      { id: 'a', status: 'CANCELLED', paymentCaptureStatus: null, total: 20, placedAt: new Date(2026, 6, 6, 10, 0).toISOString() },
      { id: 'b', status: 'COMPLETED', paymentCaptureStatus: 'refunded', total: 30, placedAt: new Date(2026, 6, 6, 11, 0).toISOString() },
    ]
    const groups = groupOrdersByDay(orders)
    expect(groups[0].count).toBe(2)
    expect(groups[0].revenue).toBe(0)
  })

  test('local-boundary edge: two orders one millisecond apart across local midnight land in two groups', () => {
    const orders = [
      { id: 'a', status: 'COMPLETED', paymentCaptureStatus: null, total: 10, placedAt: new Date(2026, 6, 2, 0, 0, 0, 0).toISOString() },
      { id: 'b', status: 'COMPLETED', paymentCaptureStatus: null, total: 10, placedAt: new Date(2026, 6, 1, 23, 59, 59, 999).toISOString() },
    ]
    const groups = groupOrdersByDay(orders)
    expect(groups.map((g) => g.dayKey).sort()).toEqual(['2026-07-01', '2026-07-02'])
    expect(groups).toHaveLength(2)
  })

  test('tie stability: identical placedAt within the same day keep input order', () => {
    const sameTs = new Date(2026, 6, 8, 12, 0, 0, 0).toISOString()
    const orders = [
      { id: 'first', status: 'COMPLETED', paymentCaptureStatus: null, total: 10, placedAt: sameTs },
      { id: 'second', status: 'COMPLETED', paymentCaptureStatus: null, total: 10, placedAt: sameTs },
    ]
    const groups = groupOrdersByDay(orders)
    expect(groups[0].orders.map((o) => o.id)).toEqual(['first', 'second'])
  })

  test('groupOrdersByDay([]) returns []', () => {
    expect(groupOrdersByDay([])).toEqual([])
  })

  test('a single order returns exactly one group with count 1', () => {
    const orders = [{ id: 'a', status: 'COMPLETED', paymentCaptureStatus: null, total: 10, placedAt: new Date(2026, 6, 9, 10, 0).toISOString() }]
    const groups = groupOrdersByDay(orders)
    expect(groups).toHaveLength(1)
    expect(groups[0].count).toBe(1)
  })

  test('an order with absent or unparseable timestamp is excluded, no throw', () => {
    const orders = [
      { id: 'a', status: 'COMPLETED', paymentCaptureStatus: null, total: 10, placedAt: new Date(2026, 6, 10, 10, 0).toISOString() },
      { id: 'b', status: 'COMPLETED', paymentCaptureStatus: null, total: 10 }, // no placedAt/createdAt
      { id: 'c', status: 'COMPLETED', paymentCaptureStatus: null, total: 10, placedAt: 'not-a-date' },
    ]
    expect(() => groupOrdersByDay(orders)).not.toThrow()
    const groups = groupOrdersByDay(orders)
    const allIds = groups.flatMap((g) => g.orders.map((o) => o.id))
    expect(allIds).toEqual(['a'])
  })

  test('does not mutate the input array element order', () => {
    const orders = [
      { id: 'b', status: 'COMPLETED', paymentCaptureStatus: null, total: 10, placedAt: new Date(2026, 6, 11, 9, 0).toISOString() },
      { id: 'a', status: 'COMPLETED', paymentCaptureStatus: null, total: 10, placedAt: new Date(2026, 6, 11, 15, 0).toISOString() },
    ]
    groupOrdersByDay(orders)
    expect(orders.map((o) => o.id)).toEqual(['b', 'a'])
  })
})

// ── computeSummary — D-15 ──────────────────────────────────────────────────

describe('computeSummary', () => {
  test('ordersCount counts all passed (finished) orders', () => {
    const orders = [
      { id: 'a', status: 'COMPLETED', paymentCaptureStatus: null, total: 10 },
      { id: 'b', status: 'CANCELLED', paymentCaptureStatus: null, total: 20 },
    ]
    expect(computeSummary(orders).ordersCount).toBe(2)
  })

  test('revenue sums completed-only totals; canceled and refunded contribute 0', () => {
    const orders = [
      { id: 'a', status: 'COMPLETED', paymentCaptureStatus: null, total: 10 },
      { id: 'b', status: 'CANCELLED', paymentCaptureStatus: null, total: 20 },
      { id: 'c', status: 'COMPLETED', paymentCaptureStatus: 'refunded', total: 30 },
    ]
    expect(computeSummary(orders).revenue).toBe(10)
  })

  test('avg is revenue / completedCount, null when zero completed', () => {
    const orders = [
      { id: 'a', status: 'COMPLETED', paymentCaptureStatus: null, total: 10 },
      { id: 'b', status: 'COMPLETED', paymentCaptureStatus: null, total: 30 },
    ]
    expect(computeSummary(orders).avg).toBe(20)

    const noCompleted = [{ id: 'c', status: 'CANCELLED', paymentCaptureStatus: null, total: 20 }]
    expect(computeSummary(noCompleted).avg).toBe(null)
  })

  test('refundsCount and canceledCount are derived via deriveDisplayStatus', () => {
    const orders = [
      { id: 'a', status: 'COMPLETED', paymentCaptureStatus: 'refunded', total: 10 },
      { id: 'b', status: 'CANCELLED', paymentCaptureStatus: null, total: 20 },
      { id: 'c', status: 'COMPLETED', paymentCaptureStatus: null, total: 30 },
    ]
    const summary = computeSummary(orders)
    expect(summary.refundsCount).toBe(1)
    expect(summary.canceledCount).toBe(1)
  })

  test('computeSummary([]) returns the zeroed shape', () => {
    expect(computeSummary([])).toEqual({
      ordersCount: 0,
      revenue: 0,
      avg: null,
      refundsCount: 0,
      canceledCount: 0,
    })
  })
})
