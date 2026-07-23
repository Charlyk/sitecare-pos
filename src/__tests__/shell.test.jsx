import { describe, test, expect, vi, afterEach, beforeEach } from 'vitest'
import { createElement } from 'react'
import { render, screen, fireEvent } from '@testing-library/react'

// HIST-01: sidebar History nav item + topbar titles
// Shell reads updateReady/authUser from useAppStore and calls useAuth() for signOut.

vi.mock('@tauri-apps/plugin-store', () => ({
  load: vi.fn().mockResolvedValue({
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(undefined),
  }),
}))
vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }))
vi.mock('@tauri-apps/plugin-process', () => ({ relaunch: vi.fn() }))
vi.mock('../auth.jsx', () => ({
  useAuth: vi.fn(() => ({ signOut: vi.fn() })),
}))
// Phase 16: Shell now calls useBranches() directly (D-01/D-04) — mocked here (rather than
// wrapping every render in a QueryClientProvider) so this pre-existing Phase-7/13 suite keeps
// testing History nav + displayName composition in isolation from the branch switcher, which
// gets its own dedicated coverage in a later plan.
vi.mock('../use-branches.js', () => ({
  useBranches: vi.fn(() => ({ data: [] })),
}))

import { Shell } from '../shell.jsx'
import { useAppStore } from '../store.js'
import { useBranches } from '../use-branches.js'

const noop = () => {}

function baseProps(overrides = {}) {
  return {
    lang: 'ro',
    setLang: noop,
    role: 'cashier',
    setRole: noop,
    screen: 'orders',
    setScreen: noop,
    accent: 'sage',
    density: 'balanced',
    orderCount: { live: 0, new: 0, active: 0 },
    sidebarCollapsed: false,
    setSidebarCollapsed: noop,
    isOffline: false,
    ...overrides,
  }
}

describe('HIST-01: Shell sidebar History nav item', () => {
  test('cashier role renders a History nav item labelled "Istoric comenzi"', () => {
    render(createElement(Shell, baseProps(), createElement('div')))
    expect(screen.getByText('Istoric comenzi')).toBeTruthy()
  })

  test('clicking the History nav item calls setScreen exactly once with "history"', () => {
    const setScreen = vi.fn()
    render(createElement(Shell, baseProps({ setScreen }), createElement('div')))
    fireEvent.click(screen.getByText('Istoric comenzi'))
    expect(setScreen).toHaveBeenCalledTimes(1)
    expect(setScreen).toHaveBeenCalledWith('history')
  })

  test('kitchen role does NOT render a History nav item', () => {
    render(createElement(Shell, baseProps({ role: 'kitchen' }), createElement('div')))
    expect(screen.queryByText('Istoric comenzi')).toBeNull()
  })

  test('screen="history" gives the History nav item the active class and shows the History title in the topbar', () => {
    render(createElement(Shell, baseProps({ screen: 'history' }), createElement('div')))
    const navLabel = screen.getByText('Istoric comenzi', { selector: '.label' })
    const navItem = navLabel.closest('.nav-item')
    expect(navItem.className).toContain('active')
    expect(screen.getByText('Istoric comenzi', { selector: '.topbar-title' })).toBeTruthy()
  })

  test('screen="history-detail" shows "Detalii comandă" in the topbar and marks no nav item active', () => {
    const { container } = render(createElement(Shell, baseProps({ screen: 'history-detail' }), createElement('div')))
    expect(screen.getByText('Detalii comandă', { selector: '.topbar-title' })).toBeTruthy()
    const activeItems = container.querySelectorAll('.nav-item.active')
    expect(activeItems.length).toBe(0)
  })

  test('cashier group renders History after Kitchen (4th position)', () => {
    const { container } = render(createElement(Shell, baseProps(), createElement('div')))
    const labels = Array.from(container.querySelectorAll('.nav-item .label')).map((el) => el.textContent)
    // First group: orders, new order, kitchen, history
    expect(labels.slice(0, 4)).toEqual(['Comenzi live', 'Comandă nouă', 'Vedere bucătărie', 'Istoric comenzi'])
  })
})

// ── D-06 (BSTATE-01): sidebar displayName composition from getMe() CurrentUser shape ──

describe('D-06: Shell displayName composition', () => {
  beforeEach(() => {
    useAppStore.setState({ authUser: null })
  })

  test('authUser with firstName + lastName renders "First Last"', () => {
    useAppStore.setState({ authUser: { firstName: 'Ana', lastName: 'Pop', email: 'ana@example.com' } })
    render(createElement(Shell, baseProps(), createElement('div')))
    expect(screen.getByText('Ana Pop')).toBeTruthy()
  })

  test('authUser with firstName only (lastName null) renders "First"', () => {
    useAppStore.setState({ authUser: { firstName: 'Ana', lastName: null, email: 'ana@example.com' } })
    render(createElement(Shell, baseProps(), createElement('div')))
    expect(screen.getByText('Ana')).toBeTruthy()
  })

  test('authUser with no first/last name but an email renders the email', () => {
    useAppStore.setState({ authUser: { firstName: null, lastName: null, email: 'ana@example.com' } })
    render(createElement(Shell, baseProps(), createElement('div')))
    expect(screen.getByText('ana@example.com')).toBeTruthy()
  })

  test('authUser null (unresolved) renders an empty identity name row — never the literal "Eduard Albu"', () => {
    useAppStore.setState({ authUser: null })
    const { container } = render(createElement(Shell, baseProps(), createElement('div')))
    expect(screen.queryByText('Eduard Albu')).toBeNull()
    const userChip = container.querySelector('.user-chip')
    const wrapperDiv = Array.from(userChip.children).find((el) => !el.className)
    const nameDiv = wrapperDiv.children[0]
    expect(nameDiv.textContent).toBe('')
  })

  test('initials derive from the resolved displayName and are empty when displayName is empty', () => {
    useAppStore.setState({ authUser: null })
    const { container } = render(createElement(Shell, baseProps(), createElement('div')))
    const avatar = container.querySelector('.avatar')
    expect(avatar.textContent).toBe('')
  })

  test('initials derive from the resolved displayName when authUser has a full name', () => {
    useAppStore.setState({ authUser: { firstName: 'Ana', lastName: 'Pop', email: 'ana@example.com' } })
    const { container } = render(createElement(Shell, baseProps(), createElement('div')))
    const avatar = container.querySelector('.avatar')
    expect(avatar.textContent).toBe('AP')
  })
})

// ── Phase 16 Plan 02: branch selector — SWCH-01, SWCH-02, LANG-01, collapsed chip, popover states ──

const branchCentru = { id: 'b1', name: 'Filiala Centru', isDefault: true, isActive: true }
const branchNord = { id: 'b2', name: 'Filiala Nord', isDefault: false, isActive: true }

afterEach(() => {
  useBranches.mockReturnValue({ data: [] })
  useAppStore.setState({ currentBranch: null })
})

describe('SWCH-01: default badge + multi-branch trigger', () => {
  test('trigger shows the current branch name and a default badge when the current branch isDefault', () => {
    useBranches.mockReturnValue({ data: [branchCentru, branchNord], isLoading: false, isError: false })
    useAppStore.setState({ currentBranch: branchCentru })
    render(createElement(Shell, baseProps(), createElement('div')))
    expect(screen.getByText('Filiala Centru')).toBeTruthy()
    expect(screen.getByText('Implicit')).toBeTruthy()
  })

  test('popover row for the default branch also carries the default badge', () => {
    useBranches.mockReturnValue({ data: [branchCentru, branchNord], isLoading: false, isError: false })
    useAppStore.setState({ currentBranch: branchCentru })
    render(createElement(Shell, baseProps(), createElement('div')))
    fireEvent.click(screen.getByTitle('Filiala Centru'))
    // One badge in the trigger, one on the default row inside the now-open popover
    expect(screen.getAllByText('Implicit').length).toBe(2)
    expect(screen.getByText('Filiala Nord')).toBeTruthy()
  })

  test('selected branch row shows the primary checkmark, sourced from the store currentBranch (not an optimistic local value)', () => {
    useBranches.mockReturnValue({ data: [branchCentru, branchNord], isLoading: false, isError: false })
    useAppStore.setState({ currentBranch: branchNord })
    render(createElement(Shell, baseProps(), createElement('div')))
    fireEvent.click(screen.getByTitle('Filiala Nord'))
    const nordRow = screen.getAllByTitle('Filiala Nord').find((el) => el.tagName === 'BUTTON')
    const centruRow = screen.getAllByTitle('Filiala Centru').find((el) => el.tagName === 'BUTTON')
    expect(nordRow.querySelector('svg')).toBeTruthy()
    expect(centruRow.querySelector('svg')).toBeNull()
  })
})

describe('SWCH-02 (D-04): single-branch tenant renders read-only', () => {
  test('with exactly one branch, no popover opens on click and no branch row ever renders', () => {
    useBranches.mockReturnValue({ data: [branchCentru], isLoading: false, isError: false })
    useAppStore.setState({ currentBranch: branchCentru })
    render(createElement(Shell, baseProps(), createElement('div')))
    const trigger = screen.getByTitle('Filiala Centru')
    fireEvent.click(trigger)
    // Only the trigger's own name text exists — no second occurrence from a popover row
    expect(screen.getAllByText('Filiala Centru').length).toBe(1)
  })

  test('a null currentBranch with a single branch still renders read-only (never gates on !!currentBranch)', () => {
    useBranches.mockReturnValue({ data: [branchCentru], isLoading: false, isError: false })
    useAppStore.setState({ currentBranch: null })
    const { container } = render(createElement(Shell, baseProps(), createElement('div')))
    const branchWrapper = container.querySelectorAll('.sidebar-footer > div')[0]
    fireEvent.click(branchWrapper.firstElementChild)
    // Popover never opens — the single branch's name never appears anywhere in the DOM
    expect(screen.queryByText('Filiala Centru')).toBeNull()
  })
})

describe('D-03: collapsed sidebar branch chip', () => {
  test('renders a compact chip with the branch initial and the full name in title/aria-label', () => {
    useBranches.mockReturnValue({ data: [branchCentru, branchNord], isLoading: false, isError: false })
    useAppStore.setState({ currentBranch: branchCentru })
    render(createElement(Shell, baseProps({ sidebarCollapsed: true }), createElement('div')))
    const chip = screen.getByTitle('Filiala Centru')
    expect(chip.textContent).toBe('F')
    expect(chip.getAttribute('aria-label')).toBe('Filiala Centru')
  })

  test('clicking the collapsed chip opens the same popover when multi-branch', () => {
    useBranches.mockReturnValue({ data: [branchCentru, branchNord], isLoading: false, isError: false })
    useAppStore.setState({ currentBranch: branchCentru })
    render(createElement(Shell, baseProps({ sidebarCollapsed: true }), createElement('div')))
    fireEvent.click(screen.getByTitle('Filiala Centru'))
    expect(screen.getByText('Filiala Nord')).toBeTruthy()
  })
})

describe('E3 popover backstops: loading / error states', () => {
  test('shows an inline spinner row while useBranches() is loading', () => {
    useBranches.mockReturnValue({ data: undefined, isLoading: true, isError: false })
    useAppStore.setState({ currentBranch: branchCentru })
    const { container } = render(createElement(Shell, baseProps(), createElement('div')))
    fireEvent.click(screen.getByTitle('Filiala Centru'))
    expect(container.querySelector('.spin')).toBeTruthy()
  })

  test('shows the branch_popover_error row when useBranches() errors, keeping the last-known trigger label', () => {
    useBranches.mockReturnValue({ data: undefined, isLoading: false, isError: true })
    useAppStore.setState({ currentBranch: branchCentru })
    render(createElement(Shell, baseProps(), createElement('div')))
    expect(screen.getByText('Filiala Centru')).toBeTruthy() // trigger keeps last-known label
    fireEvent.click(screen.getByTitle('Filiala Centru'))
    expect(screen.getByText('Nu am putut încărca filialele')).toBeTruthy()
  })
})

describe('LANG-01 (D-15): RO/EN pill is absent from the footer', () => {
  test('no RO or EN language-toggle button renders in the sidebar footer', () => {
    render(createElement(Shell, baseProps(), createElement('div')))
    expect(screen.queryByRole('button', { name: 'RO' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'EN' })).toBeNull()
  })
})

// ── Phase 17 Plan 01 (BERR-01): consume branchSwitcherForceOpen — reopen the switcher ──

describe('BERR-01: Shell consumes branchSwitcherForceOpen (reopen-on-403 consume-once)', () => {
  afterEach(() => {
    useAppStore.setState({ branchSwitcherForceOpen: false })
  })

  test('setting branchSwitcherForceOpen true opens the branch popover and resets the store flag to false', () => {
    useBranches.mockReturnValue({ data: [branchCentru, branchNord], isLoading: false, isError: false })
    useAppStore.setState({ currentBranch: branchCentru, branchSwitcherForceOpen: true })

    render(createElement(Shell, baseProps(), createElement('div')))

    expect(screen.getByText('Filiala Nord')).toBeTruthy() // popover open — sibling row visible
    expect(useAppStore.getState().branchSwitcherForceOpen).toBe(false) // consumed once
  })

  test('a settled single-branch tenant (canOpenBranchPopover false) is never force-opened', () => {
    useBranches.mockReturnValue({ data: [branchCentru], isLoading: false, isError: false })
    useAppStore.setState({ currentBranch: branchCentru, branchSwitcherForceOpen: true })

    render(createElement(Shell, baseProps(), createElement('div')))

    // Only the trigger's own name text exists — no popover row rendered
    expect(screen.getAllByText('Filiala Centru').length).toBe(1)
  })

  test('the reopened popover stays dismissible via the existing outside-click handler', () => {
    useBranches.mockReturnValue({ data: [branchCentru, branchNord], isLoading: false, isError: false })
    useAppStore.setState({ currentBranch: branchCentru, branchSwitcherForceOpen: true })

    render(createElement(Shell, baseProps(), createElement('div')))
    expect(screen.getByText('Filiala Nord')).toBeTruthy()

    fireEvent.mouseDown(document.body)
    expect(screen.queryByText('Filiala Nord')).toBeNull()
  })
})
