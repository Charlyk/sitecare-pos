// CR-01 (17-REVIEW.md) — end-to-end proof that a branch-403 onopen genuinely stops the SSE
// stream with NO retry, against the REAL (unmocked) @microsoft/fetch-event-source library.
//
// use-sse.test.js mocks '@microsoft/fetch-event-source' entirely, which is correct for unit
// testing the hook's own logic, but cannot observe the library's internal retry-scheduling
// behavior. This file deliberately does NOT mock the library, and instead stubs the global
// `fetch` (jsdom/Node's native fetch + Response + ReadableStream are all real here), so the
// exact bug the review found — response.text() draining response.body, causing the library's
// subsequent getBytes(response.body, ...) call to throw on the locked stream and fall into
// onerror -> retry regardless of "returning without throwing" — is exercised for real.

vi.mock('@tauri-apps/plugin-store', () => ({
  load: vi.fn().mockResolvedValue({
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(undefined),
  }),
}))
vi.mock('@charlyk/admin-client', () => ({ signIn: vi.fn(), createAdminClient: vi.fn() }))
vi.mock('@tauri-apps/plugin-opener', () => ({ open: vi.fn(), openUrl: vi.fn() }))
vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }))
// handleBranchError is mocked as a spy (its own behavior is covered by use-branches.test.js);
// BRANCH_CODES stays the real literal array so the useSSE guard behaves identically to prod.
vi.mock('../use-branches.js', () => ({
  handleBranchError: vi.fn(),
  BRANCH_CODES: ['BRANCH_INACTIVE', 'BRANCH_ACCESS_REVOKED', 'NO_BRANCH_ACCESS'],
}))
// Deliberately NOT mocking '@microsoft/fetch-event-source' in this file.

import { renderHook, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement, useRef } from 'react'
import { useSSE } from '../use-sse.js'
import { useAppStore } from '../store.js'
import { handleBranchError } from '../use-branches.js'

function wrapper({ children }) {
  const clientRef = useRef(null)
  if (!clientRef.current) {
    clientRef.current = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  }
  return createElement(QueryClientProvider, { client: clientRef.current }, children)
}

describe('CR-01 — branch-403 onopen genuinely suppresses fetchEventSource retry (real library)', () => {
  let fetchSpy

  beforeEach(() => {
    vi.clearAllMocks()
    useAppStore.setState({ currentBranch: null })
  })

  afterEach(() => {
    fetchSpy?.mockRestore()
  })

  test('a branch-403 response results in exactly ONE fetch call — no retry, even after the library\'s default 1s retry interval elapses', async () => {
    fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response('{"error":"BRANCH_ACCESS_REVOKED"}', { status: 403 })
    )

    renderHook(() => useSSE('test-token'), { wrapper })

    // Let the initial fetch + onopen microtasks resolve.
    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(handleBranchError).toHaveBeenCalledTimes(1)
    expect(handleBranchError).toHaveBeenCalledWith({ code: 'BRANCH_ACCESS_REVOKED' }, expect.anything())
    expect(fetchSpy).toHaveBeenCalledTimes(1)

    // Wait well past the library's default 1000ms retry interval using real timers (the library
    // uses window.setTimeout internally; fake timers add fragility here without real benefit).
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 1500))
    })

    // CR-01: no retry was scheduled — fetch was never called a second time.
    expect(fetchSpy).toHaveBeenCalledTimes(1)
  }, 10000)

  test('a non-branch 403 response DOES retry (unchanged legacy behavior) — a second fetch call happens after the retry interval', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response('{"error":"branch not resolved"}', { status: 403 })
    )

    renderHook(() => useSSE('test-token'), { wrapper })

    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(handleBranchError).not.toHaveBeenCalled()
    expect(fetchSpy).toHaveBeenCalledTimes(1)

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 1500))
    })

    // Unchanged legacy behavior: fetchEventSource retries after its default backoff.
    expect(fetchSpy.mock.calls.length).toBeGreaterThanOrEqual(2)

    warnSpy.mockRestore()
  }, 10000)
})
