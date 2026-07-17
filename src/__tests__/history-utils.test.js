// Tests for history-utils.js pure functions — HIST-03, HIST-05 (D-01, D-02, D-04, D-10, D-11, D-12)
// Wave 0 stub: tests fail RED until src/history-utils.js is implemented.

import {
  getLast30DaysRange,
  getTodayRange,
  getLast7DaysRange,
  getPresetRange,
  MAX_RANGE_DAYS,
  validateCustomRange,
  customRangeToQuery,
  formatDateRange,
  filterFinishedOrders,
  deriveDisplayStatus,
  groupOrdersByDay,
  computeSummary,
  deriveDuration,
  foldDiacritics,
  matchesSearch,
} from '../history-utils.js'

// Local Y-M-D formatter for building `<input type="date">` value strings from test fixtures —
// mirrors the input's own contract (never derived via toISOString, which would shift on UTC offset).
function toInputValue(date) {
  const pad = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

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

// ── getTodayRange — HIST-04, D-04 ─────────────────────────────────────────

describe('getTodayRange', () => {
  const fixedNow = new Date(2026, 6, 17, 14, 30, 0, 0) // 2026-07-17 14:30 local

  test('from is local midnight of now\'s calendar day, to is local midnight the following day', () => {
    const { from, to } = getTodayRange(fixedNow)
    const fromD = new Date(from)
    const toD = new Date(to)
    expect(fromD.getFullYear()).toBe(2026)
    expect(fromD.getMonth()).toBe(6)
    expect(fromD.getDate()).toBe(17)
    expect(fromD.getHours()).toBe(0)
    expect(fromD.getMinutes()).toBe(0)
    expect(toD.getFullYear()).toBe(2026)
    expect(toD.getMonth()).toBe(6)
    expect(toD.getDate()).toBe(18)
    expect(toD.getHours()).toBe(0)
  })

  test('from and to are exactly one calendar day apart', () => {
    const { from, to } = getTodayRange(fixedNow)
    const days = Math.round((new Date(to).getTime() - new Date(from).getTime()) / (24 * 60 * 60 * 1000))
    expect(days).toBe(1)
  })

  test('a clock late in the evening (23:59) produces the same range as one at 00:01 the same day', () => {
    const lateNow = new Date(2026, 6, 17, 23, 59, 0, 0)
    const earlyNow = new Date(2026, 6, 17, 0, 1, 0, 0)
    expect(getTodayRange(lateNow)).toEqual(getTodayRange(earlyNow))
  })
})

// ── getLast7DaysRange — HIST-04, D-04 ─────────────────────────────────────

describe('getLast7DaysRange', () => {
  const fixedNow = new Date(2026, 6, 17, 14, 30, 0, 0) // 2026-07-17 14:30 local

  test('from is local midnight 6 days before now, to is local midnight the day after now', () => {
    const { from, to } = getLast7DaysRange(fixedNow)
    const fromD = new Date(from)
    const toD = new Date(to)
    expect(fromD.getFullYear()).toBe(2026)
    expect(fromD.getMonth()).toBe(6)
    expect(fromD.getDate()).toBe(11)
    expect(toD.getFullYear()).toBe(2026)
    expect(toD.getMonth()).toBe(6)
    expect(toD.getDate()).toBe(18)
  })

  test('window spans exactly 7 calendar days', () => {
    const { from, to } = getLast7DaysRange(fixedNow)
    const days = Math.round((new Date(to).getTime() - new Date(from).getTime()) / (24 * 60 * 60 * 1000))
    expect(days).toBe(7)
  })

  test('getLast30DaysRange still spans exactly 30 days for the same clock (shared exclusive upper bound)', () => {
    const range30 = getLast30DaysRange(fixedNow)
    const range7 = getLast7DaysRange(fixedNow)
    const rangeToday = getTodayRange(fixedNow)
    expect(range30.to).toBe(range7.to)
    expect(range7.to).toBe(rangeToday.to)
  })
})

// ── getPresetRange — HIST-04 dispatch ─────────────────────────────────────

describe('getPresetRange', () => {
  const fixedNow = new Date(2026, 6, 17, 14, 30, 0, 0)

  test("'today' dispatches to getTodayRange", () => {
    expect(getPresetRange('today', fixedNow)).toEqual(getTodayRange(fixedNow))
  })

  test("'7' dispatches to getLast7DaysRange", () => {
    expect(getPresetRange('7', fixedNow)).toEqual(getLast7DaysRange(fixedNow))
  })

  test("'30' dispatches to getLast30DaysRange", () => {
    expect(getPresetRange('30', fixedNow)).toEqual(getLast30DaysRange(fixedNow))
  })

  test("'custom' returns null, not a default range", () => {
    expect(getPresetRange('custom', fixedNow)).toBe(null)
  })

  test('undefined and null return null without throwing', () => {
    expect(() => getPresetRange(undefined, fixedNow)).not.toThrow()
    expect(getPresetRange(undefined, fixedNow)).toBe(null)
    expect(getPresetRange(null, fixedNow)).toBe(null)
  })
})

// ── validateCustomRange / customRangeToQuery — HIST-04, D-09/D-10/D-11 ────

describe('validateCustomRange', () => {
  const fixedNow = new Date(2026, 6, 17, 14, 30, 0, 0) // 2026-07-17 14:30 local
  const todayValue = toInputValue(fixedNow)
  const tomorrowValue = toInputValue(new Date(2026, 6, 18))

  test('MAX_RANGE_DAYS equals 366 and is exported', () => {
    expect(MAX_RANGE_DAYS).toBe(366)
  })

  test('a valid range returns null', () => {
    expect(validateCustomRange('2026-03-03', '2026-03-17', fixedNow)).toBe(null)
  })

  test('start equals end (single day) is valid', () => {
    expect(validateCustomRange('2026-03-17', '2026-03-17', fixedNow)).toBe(null)
  })

  test('empty startValue returns incomplete', () => {
    expect(validateCustomRange('', '2026-03-17', fixedNow)).toBe('incomplete')
  })

  test('empty endValue returns incomplete', () => {
    expect(validateCustomRange('2026-03-03', '', fixedNow)).toBe('incomplete')
  })

  test('both empty returns incomplete', () => {
    expect(validateCustomRange('', '', fixedNow)).toBe('incomplete')
  })

  test('none of the empty-input cases throw', () => {
    expect(() => validateCustomRange('', '', fixedNow)).not.toThrow()
  })

  test('end before start returns end-before-start', () => {
    expect(validateCustomRange('2026-03-17', '2026-03-03', fixedNow)).toBe('end-before-start')
  })

  test('an endpoint after now\'s calendar day returns future', () => {
    expect(validateCustomRange('2026-03-03', tomorrowValue, fixedNow)).toBe('future')
  })

  test("today itself is not a future date", () => {
    expect(validateCustomRange(todayValue, todayValue, fixedNow)).toBe(null)
  })

  test('an inclusive span of exactly MAX_RANGE_DAYS (366) is valid', () => {
    // end = todayValue, start = 365 days before today -> inclusive span of 366 days
    const start = new Date(fixedNow.getFullYear(), fixedNow.getMonth(), fixedNow.getDate() - 365)
    expect(validateCustomRange(toInputValue(start), todayValue, fixedNow)).toBe(null)
  })

  test('an inclusive span of MAX_RANGE_DAYS + 1 (367) returns too-long', () => {
    const start = new Date(fixedNow.getFullYear(), fixedNow.getMonth(), fixedNow.getDate() - 366)
    expect(validateCustomRange(toInputValue(start), todayValue, fixedNow)).toBe('too-long')
  })

  test('precedence: a range that is both end-before-start and too-long returns end-before-start', () => {
    const farFutureStart = new Date(fixedNow.getFullYear(), fixedNow.getMonth(), fixedNow.getDate() + 1)
    const farPastEnd = new Date(fixedNow.getFullYear() - 2, fixedNow.getMonth(), fixedNow.getDate())
    expect(validateCustomRange(toInputValue(farFutureStart), toInputValue(farPastEnd), fixedNow)).toBe('end-before-start')
  })

  test('an unparseable date string returns incomplete, no throw', () => {
    expect(() => validateCustomRange('not-a-date', '2026-03-17', fixedNow)).not.toThrow()
    expect(validateCustomRange('not-a-date', '2026-03-17', fixedNow)).toBe('incomplete')
  })
})

describe('customRangeToQuery', () => {
  test('single-day range: from and to are exactly 24h apart at local-midnight boundaries', () => {
    const { from, to } = customRangeToQuery('2026-03-17', '2026-03-17')
    const fromD = new Date(from)
    const toD = new Date(to)
    expect(fromD.getHours()).toBe(0)
    expect(toD.getHours()).toBe(0)
    expect(fromD.getFullYear()).toBe(2026)
    expect(fromD.getMonth()).toBe(2)
    expect(fromD.getDate()).toBe(17)
    expect(toD.getFullYear()).toBe(2026)
    expect(toD.getMonth()).toBe(2)
    expect(toD.getDate()).toBe(18) // exclusive upper bound: day AFTER endValue
    const hours = (toD.getTime() - fromD.getTime()) / (60 * 60 * 1000)
    expect(hours).toBe(24)
  })

  test('multi-day range: from is local midnight of startValue, to is local midnight the day after endValue', () => {
    const { from, to } = customRangeToQuery('2026-03-03', '2026-03-17')
    const fromD = new Date(from)
    const toD = new Date(to)
    expect(fromD.getDate()).toBe(3)
    expect(fromD.getMonth()).toBe(2)
    expect(toD.getDate()).toBe(18)
    expect(toD.getMonth()).toBe(2)
  })
})

// ── formatDateRange — HIST-04, D-14 ────────────────────────────────────────

describe('formatDateRange', () => {
  const fixedNow = new Date(2026, 6, 17, 14, 30, 0, 0) // 2026-07-17 local — same calendar year as fixtures below

  test('ro-RO: exclusive `to` renders as an inclusive end (3 mar. – 17 mar.)', () => {
    const { from, to } = customRangeToQuery('2026-03-03', '2026-03-17')
    expect(formatDateRange(from, to, 'ro-RO', fixedNow)).toBe('3 mar. – 17 mar.')
  })

  test('en-GB: same range renders 3 Mar – 17 Mar', () => {
    const { from, to } = customRangeToQuery('2026-03-03', '2026-03-17')
    expect(formatDateRange(from, to, 'en-GB', fixedNow)).toBe('3 Mar – 17 Mar')
  })

  test('single-day range renders the same date on both sides (adjacency)', () => {
    const { from, to } = customRangeToQuery('2026-03-17', '2026-03-17')
    expect(formatDateRange(from, to, 'ro-RO', fixedNow)).toBe('17 mar. – 17 mar.')
  })

  test('a range inside now\'s calendar year omits the year on both sides', () => {
    const { from, to } = customRangeToQuery('2026-03-03', '2026-03-17')
    const result = formatDateRange(from, to, 'ro-RO', fixedNow)
    expect(result).not.toMatch(/2026/)
  })

  test('a range crossing into the previous calendar year shows the year on BOTH endpoints', () => {
    const { from, to } = customRangeToQuery('2025-12-20', '2026-01-10')
    expect(formatDateRange(from, to, 'ro-RO', fixedNow)).toBe('20 dec. 2025 – 10 ian. 2026')
  })

  test('a range entirely inside a past calendar year shows the year on both endpoints', () => {
    const { from, to } = customRangeToQuery('2025-01-05', '2025-01-20')
    const result = formatDateRange(from, to, 'ro-RO', fixedNow)
    expect(result).toBe('5 ian. 2025 – 20 ian. 2025')
  })

  test('output contains exactly one en dash (U+2013) and no hyphen-minus separator', () => {
    const { from, to } = customRangeToQuery('2026-03-03', '2026-03-17')
    const result = formatDateRange(from, to, 'ro-RO', fixedNow)
    expect((result.match(/–/g) || []).length).toBe(1)
    expect(result).not.toMatch(/ - /)
  })

  test('round-trip: customRangeToQuery -> formatDateRange agree on the exclusive upper bound', () => {
    const { from, to } = customRangeToQuery('2026-03-03', '2026-03-17')
    expect(formatDateRange(from, to, 'ro-RO', fixedNow)).toBe('3 mar. – 17 mar.')
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

// ── deriveDuration — D-10, UI-SPEC E1 ─────────────────────────────────────

describe('deriveDuration', () => {
  const placedAt = new Date(2026, 6, 15, 10, 0, 0, 0).toISOString()

  test('COMPLETED event 25 minutes after placedAt returns { kind: "prep", minutes: 25 }', () => {
    const order = {
      placedAt,
      events: [{ toStatus: 'COMPLETED', createdAt: new Date(2026, 6, 15, 10, 25, 0, 0).toISOString() }],
    }
    expect(deriveDuration(order)).toEqual({ kind: 'prep', minutes: 25 })
  })

  test('CANCELLED event 65 minutes after placedAt, no COMPLETED, returns { kind: "canceled", minutes: 65 }', () => {
    const order = {
      placedAt,
      events: [{ toStatus: 'CANCELLED', createdAt: new Date(2026, 6, 15, 11, 5, 0, 0).toISOString() }],
    }
    expect(deriveDuration(order)).toEqual({ kind: 'canceled', minutes: 65 })
  })

  test('COMPLETED takes precedence over CANCELLED, independent of timestamps', () => {
    const order = {
      placedAt,
      events: [
        { toStatus: 'COMPLETED', createdAt: new Date(2026, 6, 15, 10, 20, 0, 0).toISOString() },
        { toStatus: 'CANCELLED', createdAt: new Date(2026, 6, 15, 12, 0, 0, 0).toISOString() },
      ],
    }
    expect(deriveDuration(order)).toEqual({ kind: 'prep', minutes: 20 })
  })

  test('events: [] returns null', () => {
    expect(deriveDuration({ placedAt, events: [] })).toBe(null)
  })

  test('events: undefined returns null', () => {
    expect(deriveDuration({ placedAt })).toBe(null)
  })

  test('events with no terminal status returns null', () => {
    const order = {
      placedAt,
      events: [{ toStatus: 'ACCEPTED', createdAt: new Date(2026, 6, 15, 10, 10, 0, 0).toISOString() }],
    }
    expect(deriveDuration(order)).toBe(null)
  })

  test('placedAt undefined with a valid COMPLETED event returns null', () => {
    const order = {
      events: [{ toStatus: 'COMPLETED', createdAt: new Date(2026, 6, 15, 10, 25, 0, 0).toISOString() }],
    }
    expect(deriveDuration(order)).toBe(null)
  })

  test('two COMPLETED events, listed newest-first in the array, max createdAt wins (not array-first)', () => {
    const order = {
      placedAt,
      events: [
        { toStatus: 'COMPLETED', createdAt: new Date(2026, 6, 15, 10, 40, 0, 0).toISOString() }, // 40 min, first in array
        { toStatus: 'COMPLETED', createdAt: new Date(2026, 6, 15, 10, 10, 0, 0).toISOString() }, // 10 min, second in array
      ],
    }
    expect(deriveDuration(order)).toEqual({ kind: 'prep', minutes: 40 })
  })

  test('two COMPLETED events with an identical createdAt: deterministic across repeated calls', () => {
    const tied = new Date(2026, 6, 15, 10, 30, 0, 0).toISOString()
    const order = {
      placedAt,
      events: [
        { toStatus: 'COMPLETED', createdAt: tied },
        { toStatus: 'COMPLETED', createdAt: tied },
      ],
    }
    const first = deriveDuration(order)
    const second = deriveDuration(order)
    expect(first).toEqual(second)
    expect(first).toEqual({ kind: 'prep', minutes: 30 })
  })

  test('a COMPLETED event predating placedAt clamps to 0, never negative', () => {
    const order = {
      placedAt,
      events: [{ toStatus: 'COMPLETED', createdAt: new Date(2026, 6, 15, 9, 0, 0, 0).toISOString() }],
    }
    expect(deriveDuration(order)).toEqual({ kind: 'prep', minutes: 0 })
  })

  test('an unparseable createdAt does not throw and is ignored', () => {
    const order = {
      placedAt,
      events: [
        { toStatus: 'COMPLETED', createdAt: 'not-a-date' },
        { toStatus: 'COMPLETED', createdAt: new Date(2026, 6, 15, 10, 15, 0, 0).toISOString() },
      ],
    }
    expect(() => deriveDuration(order)).not.toThrow()
    expect(deriveDuration(order)).toEqual({ kind: 'prep', minutes: 15 })
  })

  test('no returned minutes value is negative or NaN across the fixtures above', () => {
    const results = [
      deriveDuration({ placedAt, events: [{ toStatus: 'COMPLETED', createdAt: new Date(2026, 6, 15, 9, 0, 0, 0).toISOString() }] }),
      deriveDuration({ placedAt, events: [{ toStatus: 'CANCELLED', createdAt: new Date(2026, 6, 15, 11, 5, 0, 0).toISOString() }] }),
    ]
    for (const r of results) {
      expect(r.minutes).toBeGreaterThanOrEqual(0)
      expect(Number.isNaN(r.minutes)).toBe(false)
    }
  })
})

// ── foldDiacritics — HIST-09, D-11 (RESEARCH Pitfall 2: both ș/ț encodings) ────

describe('foldDiacritics', () => {
  test('folds ă (breve)', () => {
    expect(foldDiacritics('Rădulescu')).toBe('Radulescu')
  })

  test('folds â and î (circumflex)', () => {
    expect(foldDiacritics('Câmpină')).toBe('Campina')
  })

  test('folds ș/ț modern comma-below encoding (U+0219/U+021B)', () => {
    expect(foldDiacritics('Gheorghița')).toBe('Gheorghita') // ț U+021B
    expect(foldDiacritics('șerban')).toBe('serban') // ș U+0219
  })

  test('folds ș/ț legacy cedilla encoding (U+015F/U+0163)', () => {
    expect(foldDiacritics('Gheorghiţa')).toBe('Gheorghita') // ţ U+0163 (cedilla)
    expect(foldDiacritics('şerban')).toBe('serban') // ş U+015F (cedilla)
  })

  test('both ș/ț encodings fold to the identical result for the same word', () => {
    const modern = foldDiacritics('Gheorghița') // comma-below ț
    const legacy = foldDiacritics('Gheorghiţa') // cedilla ţ
    expect(modern).toBe(legacy)
    expect(modern).toBe('Gheorghita')
  })

  test('folds the leading Ș in both encodings', () => {
    expect(foldDiacritics('Șerban')).toBe('Serban') // Ș U+0218 (comma-below, upper)
    expect(foldDiacritics('Şerban')).toBe('Serban') // Ş U+015E (cedilla, upper)
  })

  test('a string with no diacritics is returned unchanged', () => {
    expect(foldDiacritics('Popescu')).toBe('Popescu')
  })

  test('empty string returns empty string', () => {
    expect(foldDiacritics('')).toBe('')
  })
})

// ── matchesSearch — HIST-09, D-09/D-11 ────────────────────────────────────

describe('matchesSearch', () => {
  test('empty query matches every order', () => {
    const order = { id: 'abc12345678', dailyOrderNumber: 42, customer: { name: 'Ion Pop' } }
    expect(matchesSearch(order, '')).toBe(true)
  })

  test('whitespace-only query matches every order', () => {
    const order = { id: 'abc12345678', dailyOrderNumber: 42, customer: { name: 'Ion Pop' } }
    expect(matchesSearch(order, '   ')).toBe(true)
  })

  test('matches when the query is a substring of dailyOrderNumber', () => {
    const order = { id: 'abc12345678', dailyOrderNumber: 4217, customer: { name: 'Ion Pop' } }
    expect(matchesSearch(order, '21')).toBe(true)
    expect(matchesSearch(order, '99')).toBe(false)
  })

  test('matches on order.id.slice(0,8) when dailyOrderNumber is null (Pitfall 4)', () => {
    const order = { id: 'a3f9c201-dead-beef', dailyOrderNumber: null, customer: { name: 'Ion Pop' } }
    expect(matchesSearch(order, 'a3f9c2')).toBe(true)
    expect(matchesSearch(order, 'dead')).toBe(false) // outside the [0,8) slice
  })

  test('matches on order.id.slice(0,8) when dailyOrderNumber is undefined', () => {
    const order = { id: 'a3f9c201-dead-beef', customer: { name: 'Ion Pop' } }
    expect(matchesSearch(order, 'a3f9c201')).toBe(true)
  })

  test('matches a diacritic-folded customer.name (query without diacritics matches name with diacritics)', () => {
    const order = { id: 'abc12345678', dailyOrderNumber: 5, customer: { name: 'Rădulescu' } } // Rădulescu
    expect(matchesSearch(order, 'radulescu')).toBe(true)
  })

  test('match is case-insensitive on the customer name', () => {
    const order = { id: 'abc12345678', dailyOrderNumber: 5, customer: { name: 'Ion Popescu' } }
    expect(matchesSearch(order, 'POPESCU')).toBe(true)
  })

  test('does not throw when order.customer is undefined', () => {
    const order = { id: 'abc12345678', dailyOrderNumber: 5 }
    expect(() => matchesSearch(order, 'anything')).not.toThrow()
    expect(matchesSearch(order, 'anything')).toBe(false)
    expect(matchesSearch(order, '')).toBe(true)
  })

  test('non-matching query returns false', () => {
    const order = { id: 'abc12345678', dailyOrderNumber: 42, customer: { name: 'Ion Pop' } }
    expect(matchesSearch(order, 'zzz')).toBe(false)
  })
})
