import { describe, test, expect, vi } from 'vitest'
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

import { Shell } from '../shell.jsx'

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
