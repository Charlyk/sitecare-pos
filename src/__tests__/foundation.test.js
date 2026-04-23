// @vitest-environment node
// Foundation validation tests — Phase 1 Nyquist gaps
// GAPs: 1-03-02, 1-04-01, 1-05-01, 1-05-02, 1-06-01, 1-06-02
//
// Node environment chosen so that:
//   - fs tests (CSS tokens, font files, tauri.conf.json) work natively
//   - vi.mock + dynamic import still work for module-level gap tests
//
// NOTE: gaps 1-03-02 and 1-04-01 use vi.mock + dynamic import, which is
// supported in vitest node environment with globals: true.

import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()

// ── GAP 1-05-01 — CSS design token --sc-primary is defined ───────────────────

describe('GAP 1-05-01 — CSS design token --sc-primary is defined', () => {
  const cssPath = path.join(ROOT, 'src', 'colors_and_type.css')

  test('colors_and_type.css contains --sc-primary: declaration', () => {
    const content = fs.readFileSync(cssPath, 'utf8')
    expect(content).toContain('--sc-primary:')
  })

  test('colors_and_type.css contains hsl(120 14% 49%) as the sage primary value', () => {
    const content = fs.readFileSync(cssPath, 'utf8')
    expect(content).toContain('hsl(120 14% 49%)')
  })
})

// ── GAP 1-05-02 — Font files exist at correct public paths ───────────────────

describe('GAP 1-05-02 — Font files bundled at correct paths', () => {
  const boldPath  = path.join(ROOT, 'public', 'fonts', 'Outfit-Bold.ttf')
  const blackPath = path.join(ROOT, 'public', 'fonts', 'Outfit-Black.ttf')

  test('public/fonts/Outfit-Bold.ttf exists', () => {
    expect(fs.existsSync(boldPath)).toBe(true)
  })

  test('public/fonts/Outfit-Bold.ttf is non-empty', () => {
    expect(fs.statSync(boldPath).size).toBeGreaterThan(0)
  })

  test('public/fonts/Outfit-Black.ttf exists', () => {
    expect(fs.existsSync(blackPath)).toBe(true)
  })

  test('public/fonts/Outfit-Black.ttf is non-empty', () => {
    expect(fs.statSync(blackPath).size).toBeGreaterThan(0)
  })
})

// ── GAP 1-06-01 — tauri.conf.json CSP connect-src includes API domain ────────

describe('GAP 1-06-01 — CSP connect-src includes SiteCare API domain', () => {
  const confPath = path.join(ROOT, 'src-tauri', 'tauri.conf.json')
  let conf

  beforeAll(() => {
    conf = JSON.parse(fs.readFileSync(confPath, 'utf8'))
  })

  test('tauri.conf.json CSP is at app.security.csp (Tauri v2 path)', () => {
    expect(conf?.app?.security?.csp).toBeDefined()
  })

  test('connect-src includes https://api.restaurant.sitecare.ro', () => {
    const connectSrc = conf?.app?.security?.csp?.['connect-src'] ?? ''
    expect(connectSrc).toContain('https://api.restaurant.sitecare.ro')
  })
})

// ── GAP 1-06-02 — tauri.conf.json CSP connect-src includes ipc: ──────────────

describe('GAP 1-06-02 — CSP connect-src includes ipc: for Tauri plugin-store IPC', () => {
  const confPath = path.join(ROOT, 'src-tauri', 'tauri.conf.json')
  let conf

  beforeAll(() => {
    conf = JSON.parse(fs.readFileSync(confPath, 'utf8'))
  })

  test('connect-src includes ipc:', () => {
    const connectSrc = conf?.app?.security?.csp?.['connect-src'] ?? ''
    expect(connectSrc).toContain('ipc:')
  })
})

// ── GAP 1-03-02 — All 7 screen components are importable as ES modules ───────
// Uses vi.mock + dynamic import inside the test to control module resolution.
// Mocks are declared before the dynamic imports to satisfy vitest hoisting.

vi.mock('@tauri-apps/plugin-store', () => ({
  load: vi.fn().mockResolvedValue({
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(undefined),
  }),
}))

vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }))

vi.mock('@tauri-apps/api/app', () => ({
  getVersion: vi.fn().mockResolvedValue('0.1.0'),
  getName:    vi.fn().mockResolvedValue('SiteCare POS'),
}))

vi.mock('@tauri-apps/plugin-opener', () => ({
  openUrl: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@charlyk/admin-client', () => ({
  signIn:            vi.fn().mockResolvedValue({}),
  createAdminClient: vi.fn().mockReturnValue({}),
}))

describe('GAP 1-03-02 — All 7 screen components are importable as ES modules', () => {
  test('screen-orders.jsx exports OrdersScreen as a function', async () => {
    const mod = await import('../screen-orders.jsx')
    expect(typeof mod.OrdersScreen).toBe('function')
  })

  test('screen-kitchen.jsx exports KitchenScreen as a function', async () => {
    const mod = await import('../screen-kitchen.jsx')
    expect(typeof mod.KitchenScreen).toBe('function')
  })

  test('screen-pos.jsx exports PosScreen as a function', async () => {
    const mod = await import('../screen-pos.jsx')
    expect(typeof mod.PosScreen).toBe('function')
  })

  test('screen-detail.jsx exports OrderDetailScreen as a function', async () => {
    const mod = await import('../screen-detail.jsx')
    expect(typeof mod.OrderDetailScreen).toBe('function')
  })

  test('screen-menu.jsx exports MenuScreen as a function', async () => {
    const mod = await import('../screen-menu.jsx')
    expect(typeof mod.MenuScreen).toBe('function')
  })

  test('screen-printer.jsx exports PrinterScreen as a function', async () => {
    const mod = await import('../screen-printer.jsx')
    expect(typeof mod.PrinterScreen).toBe('function')
  })

  test('screen-settings.jsx exports SettingsScreen as a function', async () => {
    const mod = await import('../screen-settings.jsx')
    expect(typeof mod.SettingsScreen).toBe('function')
  })
})

// ── GAP 1-04-01 — Zustand store initial default values ───────────────────────
// store.js imports @tauri-apps/plugin-store (already mocked above)

describe('GAP 1-04-01 — Zustand store initializes with correct default values', () => {
  test('store default: screen === "orders"', async () => {
    const { useAppStore } = await import('../store.js')
    expect(useAppStore.getState().screen).toBe('orders')
  })

  test('store default: role === "cashier"', async () => {
    const { useAppStore } = await import('../store.js')
    expect(useAppStore.getState().role).toBe('cashier')
  })

  test('store default: lang === "ro"', async () => {
    const { useAppStore } = await import('../store.js')
    expect(useAppStore.getState().lang).toBe('ro')
  })

  test('store default: accent === "sage"', async () => {
    const { useAppStore } = await import('../store.js')
    expect(useAppStore.getState().accent).toBe('sage')
  })

  test('store default: density === "balanced"', async () => {
    const { useAppStore } = await import('../store.js')
    expect(useAppStore.getState().density).toBe('balanced')
  })

  test('store default: sidebarCollapsed === false', async () => {
    const { useAppStore } = await import('../store.js')
    expect(useAppStore.getState().sidebarCollapsed).toBe(false)
  })
})
