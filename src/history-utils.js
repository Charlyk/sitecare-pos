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
 * Returns a one-calendar-day window: `from` is local midnight of `now`'s calendar day, `to` is
 * local midnight of the following day (exclusive upper bound, D-04 convention).
 * @param {Date} [now] — injectable clock for deterministic tests.
 * @returns {{from: string, to: string}}
 */
export function getTodayRange(now = new Date()) {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0)
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0)
  return { from: start.toISOString(), to: end.toISOString() }
}

/**
 * D-04: `from` is local midnight 6 days before `now` (7-day window inclusive of today).
 * `to` is local midnight of the day AFTER `now` (exclusive upper bound), matching every other
 * builder in this module.
 * @param {Date} [now] — injectable clock for deterministic tests.
 * @returns {{from: string, to: string}}
 */
export function getLast7DaysRange(now = new Date()) {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6, 0, 0, 0, 0)
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0)
  return { from: start.toISOString(), to: end.toISOString() }
}

/**
 * Dispatches a period preset id to its matching range builder. `screen-history.jsx` calls this
 * single function for every preset pill — it never calls an individual builder directly, so
 * adding a preset later touches one place.
 *
 * Returns `null` for any unrecognized id (including `'custom'`, `undefined`, `null`) rather than
 * silently defaulting to a range — a typo in a caller must never render a period label that does
 * not describe the fetched data (D-06). Never throws.
 * @param {string} periodId
 * @param {Date} [now] — injectable clock for deterministic tests.
 * @returns {{from: string, to: string}|null}
 */
export function getPresetRange(periodId, now = new Date()) {
  if (periodId === 'today') return getTodayRange(now)
  if (periodId === '7') return getLast7DaysRange(now)
  if (periodId === '30') return getLast30DaysRange(now)
  return null
}

// D-10: 366 (a full year) over the recommended 92 days, so a year-end reconciliation and Phase
// 11's CSV export complete in one pass. This is the ONLY place this number lives — both the
// validator below and screen-history.jsx's native-input min computation (09-05) import it.
export const MAX_RANGE_DAYS = 366

const DATE_INPUT_RE = /^\d{4}-\d{2}-\d{2}$/

/**
 * Module-private: builds a local-midnight Date from a `<input type="date">` `.value` string.
 * Never `new Date(value)` — that parses as UTC midnight, the wrong building block per this
 * module's component-constructor convention (RESEARCH: string-parse gotcha).
 * @param {string} value — a 'YYYY-MM-DD' string
 * @returns {Date}
 */
function localDateFromInputValue(value) {
  const [y, m, d] = value.split('-').map(Number)
  return new Date(y, m - 1, d, 0, 0, 0, 0)
}

/**
 * Validates a pair of raw `<input type="date">` `.value` strings for the custom-range popover.
 * Returns `null` when the range is submittable, otherwise a reason string — never throws, never
 * returns a corrected range (D-11 rejects silent auto-correct outright). Checked in order, first
 * match wins:
 *   1. either value empty/nullish/not `YYYY-MM-DD`, or either parses to NaN → 'incomplete'
 *   2. end < start (local-midnight timestamps) → 'end-before-start'
 *   3. either endpoint after now's local calendar day → 'future' (History is finished-only, P7 D-01)
 *   4. inclusive span > MAX_RANGE_DAYS → 'too-long'
 * @param {string} startValue
 * @param {string} endValue
 * @param {Date} [now] — injectable clock for deterministic tests.
 * @returns {string|null}
 */
export function validateCustomRange(startValue, endValue, now = new Date()) {
  if (!startValue || !endValue || !DATE_INPUT_RE.test(startValue) || !DATE_INPUT_RE.test(endValue)) {
    return 'incomplete'
  }

  const start = localDateFromInputValue(startValue)
  const end = localDateFromInputValue(endValue)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 'incomplete'

  if (end.getTime() < start.getTime()) return 'end-before-start'

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0)
  if (start.getTime() > today.getTime() || end.getTime() > today.getTime()) return 'future'

  // Math.round absorbs the ±1h a DST transition puts into the raw millisecond difference;
  // + 1 makes start-equals-end a span of 1 day, not 0.
  const spanDays = Math.round((end.getTime() - start.getTime()) / 86400000) + 1
  if (spanDays > MAX_RANGE_DAYS) return 'too-long'

  return null
}

/**
 * Converts an already-validated pair of `<input type="date">` `.value` strings into `{ from, to }`
 * ISO instants. Assumes `validateCustomRange` has already passed — this function does not
 * re-validate. `to` is local midnight of the day AFTER `endValue`, preserving the exclusive
 * upper bound every other builder in this module uses.
 * @param {string} startValue
 * @param {string} endValue
 * @returns {{from: string, to: string}}
 */
export function customRangeToQuery(startValue, endValue) {
  const start = localDateFromInputValue(startValue)
  const [ey, em, ed] = endValue.split('-').map(Number)
  const end = new Date(ey, em - 1, ed + 1, 0, 0, 0, 0)
  return { from: start.toISOString(), to: end.toISOString() }
}

/**
 * D-14: one locale-aware range formatter serving every render site (summary-tile sub-label,
 * Custom pill, and any other period-dependent copy). Inputs are the SAME `{ from, to }` ISO
 * instants every builder in this module returns — `to` is EXCLUSIVE, so the inclusive end is
 * derived by taking local midnight of the day BEFORE `toIso` before formatting. Getting this
 * wrong renders a range one calendar day wider than the one actually fetched.
 *
 * The year is shown on BOTH endpoints (never just one) whenever EITHER inclusive endpoint's
 * calendar year differs from `now`'s — a single boolean feeds both formatter calls, so a mixed
 * one-endpoint-with-year form is never reachable. Month is always rendered as a
 * locale-aware short name (`month: 'short'`), never a numeric form — a numeric short form
 * inverts between ro (dd.mm) and en (mm/dd) and would name a different accounting period
 * depending on the active language.
 *
 * Endpoints are joined with ' – ' (an EN DASH, U+2013, single space either side).
 * @param {string} fromIso — inclusive start instant
 * @param {string} toIso — EXCLUSIVE end instant (start of the day after the last included day)
 * @param {string} locale — resolved BCP-47 locale (e.g. 'ro-RO'/'en-GB'); mapping from `lang`
 *   stays at the call site, per `dayGroupLabel`'s existing convention in screen-history.jsx.
 * @param {Date} [now] — injectable clock for deterministic tests.
 * @returns {string}
 */
export function formatDateRange(fromIso, toIso, locale, now = new Date()) {
  const start = new Date(fromIso)
  const exclusiveEnd = new Date(toIso)
  const end = new Date(
    exclusiveEnd.getFullYear(),
    exclusiveEnd.getMonth(),
    exclusiveEnd.getDate() - 1,
    0, 0, 0, 0
  )

  const showYear = start.getFullYear() !== now.getFullYear() || end.getFullYear() !== now.getFullYear()

  const formatter = new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
    ...(showYear && { year: 'numeric' }),
  })

  return `${formatter.format(start)} – ${formatter.format(end)}`
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

/**
 * D-10, UI-SPEC E1: derives an order's actual measured duration from its raw `events[]` array —
 * never from the lowercased `order.state`. `normalizeOrder` (src/data.jsx) spreads `...o` and
 * never rewrites `events[]`, so only raw SDK casing ('COMPLETED'/'CANCELLED') exists on
 * `e.toStatus`; reading `order.state`'s vocabulary here would silently match nothing.
 *
 * Returns `{ kind: 'prep'|'canceled', minutes }` measured from `order.placedAt` to the winning
 * terminal event's `createdAt`, or `null` whenever a trustworthy number cannot be produced — no
 * `order.placedAt`, no `order.events`, an empty `events[]`, or an `events[]` carrying neither
 * terminal status. Never returns an estimated, defaulted, or partially-derived number — an
 * absence of evidence is reported as `null`, not a guessed duration.
 *
 * COMPLETED wins outright over CANCELLED when both are present, regardless of which is later —
 * an order that completed and later received a correction event still reads as completed.
 *
 * The winning event per status is the one with the MAXIMUM `createdAt`, selected via `filter` +
 * `reduce` with a `>=` comparison (never `Array.prototype.find`, which returns the first array
 * match and would produce a stale duration on a re-completed or corrected order — RESEARCH
 * Pitfall 5). The `>=` comparison makes the later array element win an exact timestamp tie, so
 * the same input is always deterministic (adjacency edge). Events whose `createdAt` fails to
 * parse (`Number.isNaN`) are skipped rather than propagating a NaN into the result.
 *
 * `minutes` is clamped to a floor of 0 via `Math.max(0, ...)` — an event predating `placedAt`
 * never produces a negative duration.
 *
 * Uses `Math.round`, not `Math.floor`. This deliberately diverges from `elapsedMinutes` in
 * data.jsx, which floors because it is a live ticking counter where rounding up would show a
 * minute that has not elapsed yet. `deriveDuration` is a fixed historical measurement, where
 * rounding to the nearest minute is the more accurate report — do not "fix" this into
 * consistency with `elapsedMinutes`.
 *
 * @param {object} order — an already-normalized order
 * @returns {{kind: 'prep'|'canceled', minutes: number}|null}
 */
export function deriveDuration(order) {
  if (!order.placedAt || !Array.isArray(order.events) || order.events.length === 0) return null

  const placedMs = new Date(order.placedAt).getTime()
  if (Number.isNaN(placedMs)) return null

  // Returns the maximum parseable createdAt (ms) among events matching toStatus, or null.
  const latestMsFor = (toStatus) =>
    order.events
      .filter((e) => e.toStatus === toStatus)
      .reduce((bestMs, e) => {
        const ms = new Date(e.createdAt).getTime()
        if (Number.isNaN(ms)) return bestMs
        if (bestMs === null || ms >= bestMs) return ms
        return bestMs
      }, null)

  const completedMs = latestMsFor('COMPLETED')
  const kind = completedMs !== null ? 'prep' : 'canceled'
  const eventMs = completedMs !== null ? completedMs : latestMsFor('CANCELLED')

  if (eventMs === null) return null

  const minutes = Math.max(0, Math.round((eventMs - placedMs) / 60000))
  return { kind, minutes }
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
 * D-11: folds diacritics for loose matching — NFD-decomposes the string, then strips the
 * Unicode combining-diacritical-marks block (U+0300–U+036F). Pure, locale-agnostic. Targets the
 * WHOLE block (not a hand-picked subset) so both the modern comma-below (U+0219/U+021B ș/ț) and
 * the legacy cedilla (U+015F/U+0163 ș/ț) encodings fold, alongside ă/â/î (RESEARCH Pitfall 2).
 * @param {string} s
 * @returns {string}
 */
export function foldDiacritics(s) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '')
}

/**
 * HIST-09: predicate for the free-text search input. Matches the SAME `#` label the row renders
 * (`dailyOrderNumber` when numeric, else `id.slice(0, 8)` — mirrors `orderNumberLabel` in
 * screen-history.jsx, D-09/RESEARCH Pitfall 4) plus a diacritic-folded `customer.name`. Query and
 * name are folded on the same axis (D-11) before comparison. An empty or whitespace-only query
 * matches every order. Never throws on a missing `order.customer`.
 * @param {object} order
 * @param {string} query
 * @returns {boolean}
 */
export function matchesSearch(order, query) {
  const q = foldDiacritics(query.trim().toLowerCase())
  if (!q) return true

  const numLabel = String(
    typeof order.dailyOrderNumber === 'number' ? order.dailyOrderNumber : order.id.slice(0, 8)
  ).toLowerCase()
  const name = foldDiacritics((order.customer?.name ?? '').toLowerCase())

  return numLabel.includes(q) || name.includes(q)
}

/**
 * HIST-07: predicate for the status filter group. `'all'` always matches; otherwise delegates to
 * `deriveDisplayStatus`'s precedence-correct vocabulary (refunded > canceled > completed) — never
 * re-derives that precedence here (a second precedence source would drift, D-02 INVARIANT).
 * @param {object} order
 * @param {'all'|'completed'|'refunded'|'canceled'} statusFilter
 * @returns {boolean}
 */
export function matchesStatus(order, statusFilter) {
  if (statusFilter === 'all') return true
  return deriveDisplayStatus(order) === statusFilter
}

/**
 * HIST-08: predicate for the type filter group. Assumes the `normalizeOrder` boundary fix (D-08,
 * plan 10-02) has already mapped `'local'` -> `'dinein'` upstream — this predicate does its own
 * mapping-free equality check only, no history-only special-casing.
 * @param {object} order
 * @param {'all'|'delivery'|'pickup'|'dinein'} typeFilter
 * @returns {boolean}
 */
export function matchesType(order, typeFilter) {
  if (typeFilter === 'all') return true
  return order.type === typeFilter
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

// D-07..D-12, T-11: accounting-grade CSV export for the History screen. Fixed English machine
// headers (D-10) — never localized, unlike every other user-facing string in this app.
const CSV_HEADERS = [
  'order_number',
  'placed_at',
  'type',
  'status',
  'customer',
  'phone',
  'payment',
  'subtotal',
  'delivery_fee',
  'tip',
  'tax',
  'discount',
  'total',
]

/**
 * Module-private: leading-character guard for OWASP CSV-injection (T-11). A field opened by
 * `=`/`+`/`-`/`@`/tab/CR can execute as a spreadsheet formula when the file is opened in
 * Excel/Sheets — RFC-4180 quoting alone does NOT neutralize this, so this check runs BEFORE the
 * quote step below, never after.
 */
const FORMULA_INJECTION_RE = /^[=+\-@\t\r]/

/**
 * Module-private: RFC-4180 field escaper (D-12) with the T-11 formula-injection guard applied
 * first — but only for genuinely user-authored columns (WR-02). `null`/`undefined` coerce to an
 * empty field, never the literal string 'null'/'undefined' (partial-row coverage). A value
 * containing a comma, double-quote, or newline is wrapped in double-quotes with embedded quotes
 * doubled; a plain value is emitted unquoted.
 *
 * `guardFormula` gates the leading-character neutralization. Only free-text columns a user can
 * type into (customer name, phone) can carry an injected formula, so only those pass `true`.
 * Programmatically-formatted columns (order_number, placed_at, type, status, payment, and every
 * money column) bypass the guard — otherwise a legitimately negative money value like `-5.00`
 * (or any future negative adjustment) would be rewritten to the text `'-5.00`, breaking the
 * D-09 numeric-column contract Excel needs to sum/sort that column.
 * @param {*} value
 * @param {boolean} [guardFormula=false]
 * @returns {string}
 */
function escapeCsvField(value, guardFormula = false) {
  let s = value === null || value === undefined ? '' : String(value)
  if (guardFormula && FORMULA_INJECTION_RE.test(s)) s = `'${s}`
  if (/[",\n\r]/.test(s)) s = `"${s.replace(/"/g, '""')}"`
  return s
}

/**
 * Module-private: local-time 'YYYY-MM-DD HH:mm' formatter for the placed_at CSV column
 * (UI-SPEC: sortable, no comma, avoids ISO's 'T' separator misparsing in some regional Excel
 * builds). Co-located here rather than importing `orderTimeLabel` from data.jsx — this module
 * never imports react/data.jsx/@charlyk (file-header invariant).
 * @param {string} iso
 * @returns {string}
 */
function csvPlacedAt(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/**
 * Module-private: order_number CSV column value — same derivation as `orderNumberLabel` in
 * screen-history.jsx (D-09): the numeric `dailyOrderNumber` when present, else the first 8
 * characters of `id` (normalizeOrder's UUID-fallback path).
 * @param {object} order
 * @returns {number|string}
 */
function csvOrderNumber(order) {
  const num = order.dailyOrderNumber
  if (typeof num === 'number') return num
  return String(order.id).slice(0, 8)
}

/**
 * Module-private: coerces a monetary field to a fixed-two-decimal string (Open Question 2), or an
 * empty field when the value is null/undefined (partial-row coverage) — never '0.00' for a
 * genuinely-absent field.
 * @param {number|null|undefined} v
 * @returns {string}
 */
function csvMoney(v) {
  return v === null || v === undefined ? '' : Number(v).toFixed(2)
}

/**
 * Module-private: maps one order to its 13-field CSV row, positionally matching CSV_HEADERS.
 * Every field passes through `escapeCsvField` (T-11-B) — a missing value becomes an empty
 * position, never a dropped one that would shift downstream columns. The formula-injection guard
 * is applied only to the two user-authored columns (customer name, phone); programmatic columns
 * bypass it so numeric/formatted values are never mangled (WR-02).
 * @param {object} order
 * @returns {string}
 */
function orderToCsvRow(order) {
  return [
    escapeCsvField(csvOrderNumber(order)),
    escapeCsvField(csvPlacedAt(order.placedAt)),
    escapeCsvField(order.type),
    escapeCsvField(deriveDisplayStatus(order)),
    escapeCsvField(order.customer?.name, true),
    escapeCsvField(order.customer?.phone, true),
    escapeCsvField(order.payment),
    escapeCsvField(csvMoney(order.subtotal)),
    escapeCsvField(csvMoney(order.deliveryFee)),
    escapeCsvField(csvMoney(order.tip)),
    escapeCsvField(csvMoney(order.tax)),
    escapeCsvField(csvMoney(order.discount)),
    escapeCsvField(csvMoney(order.total)),
  ].join(',')
}

/**
 * D-07..D-12: builds the accounting-grade CSV export string for a set of already-fetched,
 * already-normalized orders. One row per order (D-07), the fixed accounting-full column set
 * (D-08), comma-delimited with dot decimals (D-09), fixed English machine headers as the first
 * line — never localized (D-10) — and exactly one UTF-8 BOM (U+FEFF) prepended at position 0 of
 * the whole string, never per-row (D-11). Rows are CRLF-joined per RFC-4180. Zero orders yields a
 * header-only, still BOM-prefixed string — CSV structure never branches on row count.
 * @param {Array<object>} orders — already-normalized orders (see normalizeOrder in data.jsx)
 * @returns {string}
 */
export function buildCsv(orders) {
  const lines = [CSV_HEADERS.join(','), ...orders.map(orderToCsvRow)]
  return '\uFEFF' + lines.join('\r\n')
}
