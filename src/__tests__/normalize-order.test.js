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

// D-06 backfill — CR-01 (percent-discount 100x-inflation) / CR-02 (tax dropped from fallback
// total). The underlying fix already shipped (30c89d8 percent-discount, 7d9810b tax); this
// describe block is test-only regression coverage so the fallback-total path (o.total absent)
// can never silently regress. All assertions are on RON (post-cRON) outputs, never raw cents.
describe('normalizeOrder — fallback total + discount (D-06 / CR-01 / CR-02)', () => {
  test('fallback total INCLUDES tax when o.total is omitted', () => {
    const result = normalizeOrder({
      id: 'f1',
      subtotal: 5000,    // 50.00 RON
      tax: 500,          // 5.00 RON
      deliveryFee: 200,  // 2.00 RON
      // total omitted — forces the fallback recompute path
    })
    expect(result.subtotal).toBe(50)
    expect(result.tax).toBe(5)
    expect(result.deliveryFee).toBe(2)
    expect(result.discount).toBe(0)
    // Tax must NOT be dropped: 50 + 5 + 2 + 0 (tip) - 0 (discount) = 57
    expect(result.total).toBe(57)
  })

  test('percent discount is cRON-scaled, not 100x inflated (10% of 96 RON = 9.60)', () => {
    const result = normalizeOrder({
      id: 'f2',
      subtotal: 9600,          // 96.00 RON
      discountType: 'percent',
      discountAmount: 1000,    // 10.00% in the SDK's permyriad encoding
      // total omitted — forces the fallback recompute path
    })
    expect(result.subtotal).toBe(96)
    // The 100x-inflation regression would yield 960 here instead of 9.60
    expect(result.discount).toBe(9.6)
    // 96 + 0 (tax) + 0 (deliveryFee) + 0 (tip) - 9.6 (discount) = 86.4, NOT a large negative
    // number that a 960 discount would produce (96 - 960 = -864).
    expect(result.total).toBe(86.4)
  })

  test('combined: fallback total with tax AND percent discount is internally consistent', () => {
    const result = normalizeOrder({
      id: 'f3',
      subtotal: 9600,          // 96.00 RON
      tax: 500,                // 5.00 RON
      deliveryFee: 300,        // 3.00 RON
      tip: 200,                // 2.00 RON
      discountType: 'percent',
      discountAmount: 1000,    // 10.00% in the SDK's permyriad encoding
      // total omitted — forces the fallback recompute path
    })
    expect(result.subtotal).toBe(96)
    expect(result.tax).toBe(5)
    expect(result.deliveryFee).toBe(3)
    expect(result.tip).toBe(2)
    expect(result.discount).toBe(9.6)
    // Total must equal the sum of these same asserted RON components — closes the
    // CR-01/CR-02 gap by tying the total assertion directly to the component assertions.
    const expectedTotal = +(result.subtotal + result.tax + result.deliveryFee + result.tip - result.discount).toFixed(2)
    expect(result.total).toBe(expectedTotal)
    expect(result.total).toBe(96.4)
  })
})
