// Pure, React-free, SDK-free derivation layer for the History screen (Phase 7).
// Traceability: D-01 (finished-only filter), D-02 (refunded/canceled/completed precedence),
// D-04 (local-day boundaries), D-10 (completed-only revenue), D-11 (all-rows count),
// D-12 (newest-first sort), D-15 (client-computed summary).
//
// Operates on ALREADY-normalized orders (see src/data.jsx normalizeOrder): order.total is in
// RON, order.placedAt is present. Never re-divide by 100 here, and never import react/data.jsx/
// @charlyk/admin-client — this module must stay pure and unit-testable without a DOM.

/**
 * Returns the last-30-calendar-days window as local-day boundaries converted to ISO instants.
 * D-04: `from` is local midnight 29 days before `now` (30-day window inclusive of today's day).
 * `to` is local midnight of the day AFTER `now` (exclusive upper bound = start of tomorrow).
 * @param {Date} [now] — injectable clock for deterministic tests.
 * @returns {{from: string, to: string}}
 */
export function getLast30DaysRange(now = new Date()) {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29, 0, 0, 0, 0)
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0)
  return { from: start.toISOString(), to: end.toISOString() }
}

/**
 * D-01: keeps only finished orders (COMPLETED or CANCELLED). Every in-flight status
 * (NEW/ACCEPTED/PREPARING/READY/OUT_FOR_DELIVERY) is dropped. Never mutates the input.
 * @param {Array<object>} orders
 * @returns {Array<object>}
 */
export function filterFinishedOrders(orders) {
  return orders.filter((o) => o.status === 'COMPLETED' || o.status === 'CANCELLED')
}

/**
 * D-02: precedence is load-bearing — refunded wins over canceled/completed regardless of status.
 * @param {object} order
 * @returns {'refunded'|'canceled'|'completed'|null}
 */
export function deriveDisplayStatus(order) {
  if (order.paymentCaptureStatus === 'refunded') return 'refunded'
  if (order.status === 'CANCELLED') return 'canceled'
  if (order.status === 'COMPLETED') return 'completed'
  return null
}

const pad = (n) => String(n).padStart(2, '0')

/**
 * Module-private: local Y-M-D bucket key from an ISO instant, using local Date getters —
 * NEVER an ISO-string slice, which would bucket in UTC and misfile orders near midnight.
 * @param {string} iso
 * @returns {string} e.g. '2026-07-02'
 */
function localDayKey(iso) {
  const d = new Date(iso)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/**
 * D-04/D-10/D-11/D-12: groups orders by local calendar day, newest-day-first, with each day's
 * orders sorted newest-first. `count` includes every row (including canceled/refunded); `revenue`
 * sums only completed-only rows. Orders with an absent or unparseable timestamp are skipped
 * rather than producing a NaN-keyed day header. Never mutates the caller's array.
 * @param {Array<object>} orders
 * @returns {Array<{dayKey: string, orders: Array<object>, count: number, revenue: number}>}
 */
export function groupOrdersByDay(orders) {
  const byDay = new Map()

  for (const order of orders) {
    const ts = order.placedAt ?? order.createdAt
    if (!ts) continue
    const d = new Date(ts)
    if (Number.isNaN(d.getTime())) continue

    const key = localDayKey(ts)
    if (!byDay.has(key)) byDay.set(key, [])
    byDay.get(key).push(order)
  }

  return [...byDay.entries()]
    .sort(([a], [b]) => b.localeCompare(a)) // newest day first (D-04) — zero-padded key sorts lexicographically = chronologically
    .map(([dayKey, dayOrders]) => {
      const sorted = [...dayOrders].sort((a, b) => {
        const aTs = new Date(a.placedAt ?? a.createdAt).getTime()
        const bTs = new Date(b.placedAt ?? b.createdAt).getTime()
        return bTs - aTs // newest row first within the day (D-12); 0 on ties keeps input order (stable sort)
      })
      const count = sorted.length // every visible row, incl. canceled/refunded (D-11)
      const revenue = sorted
        .filter((o) => deriveDisplayStatus(o) === 'completed') // completed-only (D-10)
        .reduce((sum, o) => sum + o.total, 0)
      return { dayKey, orders: sorted, count, revenue }
    })
}

/**
 * D-15: client-computed summary tiles from the same finished-orders list groupOrdersByDay uses,
 * so tiles and day headers can never disagree.
 * @param {Array<object>} orders
 * @returns {{ordersCount: number, revenue: number, avg: number|null, refundsCount: number, canceledCount: number}}
 */
export function computeSummary(orders) {
  let revenue = 0
  let completedCount = 0
  let refundsCount = 0
  let canceledCount = 0

  for (const o of orders) {
    const displayStatus = deriveDisplayStatus(o)
    if (displayStatus === 'completed') {
      revenue += o.total
      completedCount += 1
    } else if (displayStatus === 'refunded') {
      refundsCount += 1
    } else if (displayStatus === 'canceled') {
      canceledCount += 1
    }
  }

  return {
    ordersCount: orders.length,
    revenue,
    avg: completedCount > 0 ? revenue / completedCount : null,
    refundsCount,
    canceledCount,
  }
}
