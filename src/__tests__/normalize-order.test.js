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
