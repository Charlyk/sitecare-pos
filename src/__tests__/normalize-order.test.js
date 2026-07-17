// Tests for normalizeOrder's dailyOrderNumber fallback chain — D-05, RESEARCH Pitfall 2.
// Extends the existing shared normalization chokepoint (src/data.jsx) additively for
// AdminOrder.dailyNumber; the kitchen Order.dailyOrderNumber path must remain unchanged.

import { normalizeOrder } from '../data.jsx'

describe('normalizeOrder — dailyOrderNumber fallback chain (D-05)', () => {
  test('AdminOrder-shaped input with dailyNumber resolves to that number', () => {
    const result = normalizeOrder({ id: 'uuid-abc', dailyNumber: 12 })
    expect(result.dailyOrderNumber).toBe(12)
  })

  test('kitchen Order-shaped input with dailyOrderNumber still resolves unchanged', () => {
    const result = normalizeOrder({ id: 'uuid-abc', dailyOrderNumber: 7 })
    expect(result.dailyOrderNumber).toBe(7)
  })

  test('when both are present, dailyOrderNumber wins (first in the chain)', () => {
    const result = normalizeOrder({ id: 'uuid-abc', dailyOrderNumber: 7, dailyNumber: 12 })
    expect(result.dailyOrderNumber).toBe(7)
  })

  test('dailyNumber: null falls through to the UUID', () => {
    const result = normalizeOrder({ id: 'uuid-abc', dailyNumber: null })
    expect(result.dailyOrderNumber).toBe('uuid-abc')
  })

  test('neither field present falls through to the UUID', () => {
    const result = normalizeOrder({ id: 'uuid-abc' })
    expect(result.dailyOrderNumber).toBe('uuid-abc')
  })

  test('dailyNumber: 0 yields 0, not the UUID (?? not ||)', () => {
    const result = normalizeOrder({ id: 'uuid-abc', dailyNumber: 0 })
    expect(result.dailyOrderNumber).toBe(0)
  })
})

// F-02 regression — HIST-08/D-08: the SDK's raw 'local' orderType must normalize to the
// app-wide 'dinein' vocabulary so the live Orders Dine-in filter (and History's type filter)
// match dine-in rows. Only 'local' is translated; delivery/pickup pass through unchanged.
describe('normalizeOrder — type boundary mapping (F-02, D-08)', () => {
  test("orderType 'local' normalizes to type 'dinein'", () => {
    const result = normalizeOrder({ id: 'x1', orderType: 'local', status: 'COMPLETED' })
    expect(result.type).toBe('dinein')
  })

  test("orderType 'delivery' passes through unchanged", () => {
    const result = normalizeOrder({ id: 'x2', orderType: 'delivery' })
    expect(result.type).toBe('delivery')
  })

  test("orderType 'pickup' passes through unchanged", () => {
    const result = normalizeOrder({ id: 'x3', orderType: 'pickup' })
    expect(result.type).toBe('pickup')
  })

  test('absent type/orderType still falls back to dinein', () => {
    const result = normalizeOrder({ id: 'x4' })
    expect(result.type).toBe('dinein')
  })

  test("an order that already carries type: 'delivery' (not orderType) still yields 'delivery'", () => {
    const result = normalizeOrder({ id: 'x5', type: 'delivery' })
    expect(result.type).toBe('delivery')
  })
})
