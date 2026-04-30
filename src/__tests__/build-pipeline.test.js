// @vitest-environment node
// Build pipeline validation tests — Phase 6 Nyquist stubs
// BILD-01: CI release workflow exists with correct structure
// BILD-02: macOS arm64 build matrix present
// BILD-04: tauri.conf.json updater config + use-updater.js hook
//
// Node environment chosen so that:
//   - fs tests (release.yml, tauri.conf.json) work natively via node:fs
//   - vi.mock + dynamic import still work for module-level stubs
//
// NOTE: All 12 tests are stubs — they FAIL in RED state (Wave 0).
// Waves 1 and 2 add production code that turns these green.

import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()

// vi.mock calls are hoisted by vitest — declare them BEFORE dynamic imports.
// This is a vitest requirement, not optional style.
vi.mock('@tauri-apps/plugin-updater', () => ({ check: vi.fn() }))
vi.mock('@tauri-apps/plugin-process', () => ({ relaunch: vi.fn() }))
vi.mock('@tauri-apps/plugin-store', () => ({ load: vi.fn() }))
vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }))

// ── BILD-01 — .github/workflows/release.yml exists ───────────────────────────

describe('BILD-01 — .github/workflows/release.yml exists', () => {
  const wfPath = path.join(ROOT, '.github', 'workflows', 'release.yml')

  test('release.yml exists', () => {
    expect(fs.existsSync(wfPath)).toBe(true)
  })

  test('release.yml is non-empty', () => {
    expect(fs.statSync(wfPath).size).toBeGreaterThan(0)
  })
})

// ── BILD-01 — release.yml workflow structure ──────────────────────────────────

describe('BILD-01 — release.yml workflow structure', () => {
  const wfPath = path.join(ROOT, '.github', 'workflows', 'release.yml')
  let content

  beforeAll(() => {
    if (fs.existsSync(wfPath)) {
      content = fs.readFileSync(wfPath, 'utf8')
    } else {
      content = ''
    }
  })

  test("workflow triggers on 'app-v*' tag push", () => {
    expect(content).toContain("- 'app-v*'")
  })

  test('workflow uses tauri-apps/tauri-action@v0 (not v1)', () => {
    expect(content).toContain('tauri-apps/tauri-action@v0')
  })

  test('workflow sets NODE_AUTH_TOKEN on npm ci step', () => {
    expect(content).toContain('NODE_AUTH_TOKEN')
  })
})

// ── BILD-02 — release.yml includes macOS arm64 build ─────────────────────────

describe('BILD-02 — release.yml includes macOS arm64 build', () => {
  const wfPath = path.join(ROOT, '.github', 'workflows', 'release.yml')
  let content

  beforeAll(() => {
    if (fs.existsSync(wfPath)) {
      content = fs.readFileSync(wfPath, 'utf8')
    } else {
      content = ''
    }
  })

  test('workflow includes aarch64-apple-darwin target (per D-01)', () => {
    expect(content).toContain('aarch64-apple-darwin')
  })

  test('workflow references APPLE_ID env var for notarization (per D-02)', () => {
    expect(content).toContain('APPLE_ID')
  })
})

// ── BILD-04 — tauri.conf.json updater configuration ──────────────────────────

describe('BILD-04 — tauri.conf.json updater configuration', () => {
  const confPath = path.join(ROOT, 'src-tauri', 'tauri.conf.json')
  let conf

  beforeAll(() => {
    conf = JSON.parse(fs.readFileSync(confPath, 'utf8'))
  })

  test('bundle.createUpdaterArtifacts is true', () => {
    expect(conf?.bundle?.createUpdaterArtifacts).toBe(true)
  })

  test('plugins.updater.endpoints is a non-empty array', () => {
    const endpoints = conf?.plugins?.updater?.endpoints
    expect(Array.isArray(endpoints)).toBe(true)
    expect(endpoints.length).toBeGreaterThan(0)
  })

  test('plugins.updater.pubkey is set (non-empty string)', () => {
    const pubkey = conf?.plugins?.updater?.pubkey
    expect(typeof pubkey).toBe('string')
    expect(pubkey.length).toBeGreaterThan(0)
  })

  test('bundle.targets is an array (not "all") per Pitfall 5', () => {
    expect(Array.isArray(conf?.bundle?.targets)).toBe(true)
  })
})

// ── BILD-04 — use-updater.js module export ────────────────────────────────────

describe('BILD-04 — use-updater.js exports useUpdater function', () => {
  test('use-updater.js exports useUpdater as a function', async () => {
    const mod = await import('../use-updater.js')
    expect(typeof mod.useUpdater).toBe('function')
  })
})
