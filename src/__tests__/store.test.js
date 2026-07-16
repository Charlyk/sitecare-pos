import { describe, test, expect, beforeEach, vi } from 'vitest'

// Tests for Zustand store partialize — U5 (AUTH-02)
// Verifies isAuthenticated and authUser are NOT persisted to disk.

vi.mock('@tauri-apps/plugin-store', () => ({
  load: vi.fn().mockResolvedValue({
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(undefined),
  }),
}))
vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }))

import { useAppStore } from '../store.js'

// ── U5: isAuthenticated and authUser NOT in partialize (AUTH-02) ─────────

describe('U5 — partialize excludes auth state from persistence (AUTH-02)', () => {
  test('partialize result does NOT contain isAuthenticated key', () => {
    const state = useAppStore.getState()
    // Access the persist options partialize function directly via the store internals
    // Zustand persist exposes getOptions via store.__zustand_persist__ or through the config
    // We call partialize manually since it's part of the persist config
    const { partialize } = useAppStore.persist.getOptions()
    const persisted = partialize(state)

    expect(persisted).not.toHaveProperty('isAuthenticated')
  })

  test('partialize result does NOT contain authUser key', () => {
    const state = useAppStore.getState()
    const { partialize } = useAppStore.persist.getOptions()
    const persisted = partialize(state)

    expect(persisted).not.toHaveProperty('authUser')
  })

  test('partialize result contains exactly the 6 expected persisted keys', () => {
    const state = useAppStore.getState()
    const { partialize } = useAppStore.persist.getOptions()
    const persisted = partialize(state)

    const persistedKeys = Object.keys(persisted).sort()
    expect(persistedKeys).toEqual([
      'accent',
      'density',
      'lang',
      'role',
      'screen',
      'sidebarCollapsed',
    ])
  })

  test('partialize does NOT contain session-only keys (toasts, selectedOrder, acceptDialog)', () => {
    const state = useAppStore.getState()
    const { partialize } = useAppStore.persist.getOptions()
    const persisted = partialize(state)

    expect(persisted).not.toHaveProperty('toasts')
    expect(persisted).not.toHaveProperty('selectedOrder')
    expect(persisted).not.toHaveProperty('acceptDialog')
  })
})

describe('soundMuted state (KDS-04, D-07)', () => {
  test('store initializes with soundMuted: false', () => {
    const state = useAppStore.getState()
    expect(state.soundMuted).toBe(false)
  })

  test('setSoundMuted(true) sets soundMuted to true', () => {
    useAppStore.getState().setSoundMuted(true)
    expect(useAppStore.getState().soundMuted).toBe(true)
    // reset
    useAppStore.getState().setSoundMuted(false)
  })

  test('setSoundMuted(false) sets soundMuted back to false', () => {
    useAppStore.getState().setSoundMuted(true)
    useAppStore.getState().setSoundMuted(false)
    expect(useAppStore.getState().soundMuted).toBe(false)
  })

  test('soundMuted is NOT included in the partialize output (session-only)', () => {
    const state = useAppStore.getState()
    const { partialize } = useAppStore.persist.getOptions()
    const persisted = partialize(state)
    expect(persisted).not.toHaveProperty('soundMuted')
  })
})

describe('ORD-02: role switch reflects in store', () => {
  test('setRole("boh") updates role to boh', () => {
    useAppStore.getState().setRole('boh')
    expect(useAppStore.getState().role).toBe('boh')
    // reset to default
    useAppStore.getState().setRole('cashier')
  })

  test('setRole("foh") updates role back to foh', () => {
    useAppStore.getState().setRole('boh')
    useAppStore.getState().setRole('foh')
    expect(useAppStore.getState().role).toBe('foh')
    // reset to default
    useAppStore.getState().setRole('cashier')
  })
})

// ── HIST-01: history route additions (D-07/D-08) ─────────────────────────

describe('HIST-01: openHistoryOrder / historyOrder / setScreen reset (D-07, D-08)', () => {
  beforeEach(() => {
    useAppStore.setState({ selectedOrder: null, historyOrder: null, screen: 'orders' })
  })

  test('historyOrder defaults to null on a fresh store', () => {
    expect(useAppStore.getState().historyOrder).toBe(null)
  })

  test('openHistoryOrder(order) sets historyOrder and screen to history-detail in one update', () => {
    const order = { id: 'hist-1' }
    useAppStore.getState().openHistoryOrder(order)
    const state = useAppStore.getState()
    expect(state.historyOrder).toBe(order)
    expect(state.screen).toBe('history-detail')
  })

  test('openHistoryOrder(order) leaves selectedOrder at null', () => {
    const order = { id: 'hist-2' }
    useAppStore.getState().openHistoryOrder(order)
    expect(useAppStore.getState().selectedOrder).toBe(null)
  })

  test('openOrder(order) still sets selectedOrder and screen to detail, leaving historyOrder null (unchanged shipped behavior)', () => {
    const order = { id: 'live-1' }
    useAppStore.getState().openOrder(order)
    const state = useAppStore.getState()
    expect(state.selectedOrder).toBe(order)
    expect(state.screen).toBe('detail')
    expect(state.historyOrder).toBe(null)
  })

  test('setScreen resets both selectedOrder and historyOrder to null', () => {
    useAppStore.getState().openOrder({ id: 'live-2' })
    useAppStore.getState().openHistoryOrder({ id: 'hist-3' })
    useAppStore.getState().setScreen('history')
    const state = useAppStore.getState()
    expect(state.screen).toBe('history')
    expect(state.selectedOrder).toBe(null)
    expect(state.historyOrder).toBe(null)
  })

  test('historyOrder is NOT included in the partialize output (session-only)', () => {
    useAppStore.getState().openHistoryOrder({ id: 'hist-4' })
    const state = useAppStore.getState()
    const { partialize } = useAppStore.persist.getOptions()
    const persisted = partialize(state)
    expect(persisted).not.toHaveProperty('historyOrder')
  })
})
