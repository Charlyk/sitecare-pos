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

  test('partialize result does NOT contain currentBranch key (D-10, BSTATE-01)', () => {
    useAppStore.getState().setCurrentBranch({ id: 'b1', name: 'Branch 1', slug: 'b1', isDefault: true, isActive: true })
    const state = useAppStore.getState()
    const { partialize } = useAppStore.persist.getOptions()
    const persisted = partialize(state)

    expect(persisted).not.toHaveProperty('currentBranch')
    // reset
    useAppStore.getState().setCurrentBranch(null)
  })

  test('partialize result still contains exactly the 6 expected persisted keys after currentBranch is set (D-10)', () => {
    useAppStore.getState().setCurrentBranch({ id: 'b1', name: 'Branch 1', slug: 'b1', isDefault: true, isActive: true })
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
    // reset
    useAppStore.getState().setCurrentBranch(null)
  })
})

describe('currentBranch session-only field (BSTATE-01)', () => {
  test('store default currentBranch value is null', () => {
    expect(useAppStore.getState().currentBranch).toBe(null)
  })

  test('setCurrentBranch(branchObj) sets currentBranch on the store', () => {
    const branch = { id: 'b1', name: 'Branch 1', slug: 'b1', isDefault: true, isActive: true }
    useAppStore.getState().setCurrentBranch(branch)
    expect(useAppStore.getState().currentBranch).toBe(branch)
    // reset
    useAppStore.getState().setCurrentBranch(null)
  })

  test('setCurrentBranch(null) sets currentBranch back to null (nullable resolved state)', () => {
    useAppStore.getState().setCurrentBranch({ id: 'b2', name: 'Branch 2', slug: 'b2', isDefault: false, isActive: true })
    useAppStore.getState().setCurrentBranch(null)
    expect(useAppStore.getState().currentBranch).toBe(null)
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

// ── Phase 12 Plan 03: historySelection session-only slice (D-01/D-03/D-04) ───────

const DEFAULT_HISTORY_SELECTION = { period: { id: '30' }, statusFilter: 'all', typeFilter: 'all', query: '' }

describe('historySelection session-only slice (D-01/D-03/D-04)', () => {
  beforeEach(() => {
    useAppStore.setState({
      selectedOrder: null,
      historyOrder: null,
      screen: 'orders',
      historySelection: DEFAULT_HISTORY_SELECTION,
    })
  })

  test('historySelection defaults to { period: { id: "30" }, statusFilter: "all", typeFilter: "all", query: "" } on a fresh store', () => {
    expect(useAppStore.getState().historySelection).toEqual(DEFAULT_HISTORY_SELECTION)
  })

  test('setHistorySelection({ statusFilter: "completed" }) changes only statusFilter; the period reference is unchanged', () => {
    const before = useAppStore.getState().historySelection
    useAppStore.getState().setHistorySelection({ statusFilter: 'completed' })
    const after = useAppStore.getState().historySelection
    expect(after.statusFilter).toBe('completed')
    expect(after.typeFilter).toBe('all')
    expect(after.query).toBe('')
    expect(after.period).toBe(before.period) // reference stability (D-04)
  })

  test('setScreen("history") preserves historySelection (unchanged reference)', () => {
    useAppStore.getState().setHistorySelection({ statusFilter: 'refunded' })
    const before = useAppStore.getState().historySelection
    useAppStore.getState().setScreen('history')
    const after = useAppStore.getState().historySelection
    expect(after).toBe(before)
  })

  test('setScreen("history-detail") preserves historySelection (unchanged reference)', () => {
    useAppStore.getState().setHistorySelection({ query: 'ana' })
    const before = useAppStore.getState().historySelection
    useAppStore.getState().setScreen('history-detail')
    const after = useAppStore.getState().historySelection
    expect(after).toBe(before)
  })

  test('History -> history-detail -> Back (history) round-trip preserves the full selection', () => {
    useAppStore.getState().setHistorySelection({ period: { id: 'custom', customRange: { from: 'a', to: 'b' } } })
    useAppStore.getState().setHistorySelection({ statusFilter: 'completed', typeFilter: 'delivery', query: 'pizza' })
    useAppStore.getState().setScreen('history-detail')
    useAppStore.getState().setScreen('history')
    const state = useAppStore.getState().historySelection
    expect(state).toEqual({
      period: { id: 'custom', customRange: { from: 'a', to: 'b' } },
      statusFilter: 'completed',
      typeFilter: 'delivery',
      query: 'pizza',
    })
  })

  test('setScreen("orders") (a non-history target) resets historySelection to defaults', () => {
    useAppStore.getState().setHistorySelection({ statusFilter: 'canceled', query: 'x' })
    useAppStore.getState().setScreen('orders')
    expect(useAppStore.getState().historySelection).toEqual(DEFAULT_HISTORY_SELECTION)
  })

  test('setScreen to any non-history target still sets selectedOrder=null and historyOrder=null (unconditional, unchanged)', () => {
    useAppStore.getState().openOrder({ id: 'live-9' })
    useAppStore.getState().openHistoryOrder({ id: 'hist-9' })
    useAppStore.getState().setScreen('history')
    const state = useAppStore.getState()
    expect(state.selectedOrder).toBe(null)
    expect(state.historyOrder).toBe(null)
  })

  test('historySelection is NOT included in the partialize output (session-only)', () => {
    useAppStore.getState().setHistorySelection({ statusFilter: 'completed' })
    const state = useAppStore.getState()
    const { partialize } = useAppStore.persist.getOptions()
    const persisted = partialize(state)
    expect(persisted).not.toHaveProperty('historySelection')
  })
})
