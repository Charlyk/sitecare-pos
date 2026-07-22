// Tests for unwrapSdkResult — shared SDK {data,error} envelope unwrap (D-05, SC3, Phase 14)

import { unwrapSdkResult } from '../data.jsx'

describe('unwrapSdkResult (D-05, SC3)', () => {
  test('returns result.data when no error', () => {
    expect(unwrapSdkResult({ data: { foo: 1 }, error: null }, 'fallback')).toEqual({ foo: 1 })
  })

  test('throws with populated .code on bare-string error', () => {
    try {
      unwrapSdkResult({ data: null, error: 'BRANCH_INACTIVE' }, 'fallback')
      throw new Error('should have thrown')
    } catch (err) {
      expect(err.code).toBe('BRANCH_INACTIVE')
    }
  })

  test('throws with populated .code on { error: string } object error', () => {
    try {
      unwrapSdkResult({ data: null, error: { error: 'Branch is inactive' } }, 'fallback')
      throw new Error('should have thrown')
    } catch (err) {
      expect(err.code).toBe('Branch is inactive')
    }
  })
})
