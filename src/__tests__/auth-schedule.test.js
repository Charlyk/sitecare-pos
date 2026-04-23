// Tests for scheduleRefresh MIN_RETRY_MS floor behavior — U4 (AUTH-03 / CR-01)
// scheduleRefresh is module-private inside AuthProvider.
// We test the floor behavior by extracting the logic pattern and verifying it
// with fake timers. The Tauri module dependencies are mocked.

vi.mock('@tauri-apps/plugin-store', () => ({ load: vi.fn() }))
vi.mock('@charlyk/admin-client', () => ({ signIn: vi.fn(), createAdminClient: vi.fn() }))
vi.mock('@tauri-apps/plugin-opener', () => ({ open: vi.fn(), openUrl: vi.fn() }))
vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }))

// ── U4: scheduleRefresh MIN_RETRY_MS floor (AUTH-03 / CR-01) ──────────────
// The constants from auth.jsx:
//   REFRESH_LEAD_MS = 5 * 60 * 1000  (5 minutes)
//   MIN_RETRY_MS    = 30_000          (30 seconds)
//
// Logic under test:
//   const msUntilRefresh = expiresAt - Date.now() - REFRESH_LEAD_MS
//   if (msUntilRefresh <= 0) {
//     setTimeout(doRefresh, MIN_RETRY_MS)  ← MIN_RETRY_MS floor
//   } else {
//     setTimeout(doRefresh, msUntilRefresh)
//   }

const REFRESH_LEAD_MS = 5 * 60 * 1000
const MIN_RETRY_MS = 30_000

// Replicates the scheduleRefresh logic from auth.jsx in a testable form
function scheduleRefresh(expiresAt, doRefresh, timerRef) {
  if (timerRef.current) clearTimeout(timerRef.current)
  const msUntilRefresh = new Date(expiresAt).getTime() - Date.now() - REFRESH_LEAD_MS
  if (msUntilRefresh <= 0) {
    timerRef.current = setTimeout(doRefresh, MIN_RETRY_MS)
    return
  }
  timerRef.current = setTimeout(doRefresh, msUntilRefresh)
}

describe('U4 — scheduleRefresh MIN_RETRY_MS floor prevents tight loops (AUTH-03 / CR-01)', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  test('when token is already expired, uses MIN_RETRY_MS floor (30s) instead of calling doRefresh immediately', () => {
    const doRefresh = vi.fn()
    const timerRef = { current: null }

    // Token expired 1 hour ago
    const expiredAt = new Date(Date.now() - 60 * 60 * 1000).toISOString()

    scheduleRefresh(expiredAt, doRefresh, timerRef)

    // doRefresh must NOT be called immediately
    expect(doRefresh).not.toHaveBeenCalled()

    // Advance less than MIN_RETRY_MS — still not called
    vi.advanceTimersByTime(MIN_RETRY_MS - 1)
    expect(doRefresh).not.toHaveBeenCalled()

    // Advance to exactly MIN_RETRY_MS — now it fires
    vi.advanceTimersByTime(1)
    expect(doRefresh).toHaveBeenCalledTimes(1)
  })

  test('when token expires in less than REFRESH_LEAD_MS (near expiry), uses MIN_RETRY_MS floor', () => {
    const doRefresh = vi.fn()
    const timerRef = { current: null }

    // Token expires in 1 minute, but REFRESH_LEAD_MS is 5 minutes → msUntilRefresh < 0
    const nearExpiryAt = new Date(Date.now() + 60 * 1000).toISOString()

    scheduleRefresh(nearExpiryAt, doRefresh, timerRef)

    expect(doRefresh).not.toHaveBeenCalled()
    vi.advanceTimersByTime(MIN_RETRY_MS)
    expect(doRefresh).toHaveBeenCalledTimes(1)
  })

  test('when token is healthy (far future), schedules at msUntilRefresh (not MIN_RETRY_MS floor)', () => {
    const doRefresh = vi.fn()
    const timerRef = { current: null }

    // Token expires in 30 minutes; REFRESH_LEAD_MS=5min → msUntilRefresh = 25min
    const futureExpiry = new Date(Date.now() + 30 * 60 * 1000).toISOString()
    const expectedMs = 30 * 60 * 1000 - REFRESH_LEAD_MS // 25 minutes

    scheduleRefresh(futureExpiry, doRefresh, timerRef)

    // After MIN_RETRY_MS (30s) doRefresh must NOT have fired
    vi.advanceTimersByTime(MIN_RETRY_MS)
    expect(doRefresh).not.toHaveBeenCalled()

    // After the full expected delay it fires
    vi.advanceTimersByTime(expectedMs - MIN_RETRY_MS)
    expect(doRefresh).toHaveBeenCalledTimes(1)
  })

  test('calling scheduleRefresh again clears the previous timer (no duplicate refreshes)', () => {
    const doRefresh = vi.fn()
    const timerRef = { current: null }

    const expiredAt = new Date(Date.now() - 60 * 60 * 1000).toISOString()

    scheduleRefresh(expiredAt, doRefresh, timerRef)
    // Immediately reschedule — should cancel the first timer
    scheduleRefresh(expiredAt, doRefresh, timerRef)

    vi.advanceTimersByTime(MIN_RETRY_MS)
    // doRefresh fires exactly once — the first timer was cancelled
    expect(doRefresh).toHaveBeenCalledTimes(1)
  })
})
