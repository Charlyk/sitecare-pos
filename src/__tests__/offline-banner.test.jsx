// Tests for OfflineBanner component — U10 (OFF-01)
// Wave 0 stub: tests fail RED until src/offline-banner.jsx is implemented.

vi.mock('@tauri-apps/plugin-store', () => ({ load: vi.fn() }))
vi.mock('@charlyk/admin-client', () => ({ signIn: vi.fn(), createAdminClient: vi.fn() }))
vi.mock('@tauri-apps/plugin-opener', () => ({ open: vi.fn(), openUrl: vi.fn() }))
vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }))

import { render, screen } from '@testing-library/react'
import { OfflineBanner } from '../offline-banner.jsx'
import { I18N } from '../i18n.jsx'

// ── U10: OfflineBanner renders connection lost state (OFF-01) ──────────────

describe('U10 — OfflineBanner renders connection lost message (OFF-01)', () => {
  test('renders offline_banner_title in English when lang=en', () => {
    render(<OfflineBanner lang="en" />)
    expect(screen.getByText(I18N.en.offline_banner_title)).toBeInTheDocument()
  })

  test('renders offline_banner_sub in English when lang=en', () => {
    render(<OfflineBanner lang="en" />)
    expect(screen.getByText(I18N.en.offline_banner_sub)).toBeInTheDocument()
  })

  test('renders offline_banner_title in Romanian when lang=ro', () => {
    render(<OfflineBanner lang="ro" />)
    expect(screen.getByText(I18N.ro.offline_banner_title)).toBeInTheDocument()
  })

  test('renders offline_banner_sub in Romanian when lang=ro', () => {
    render(<OfflineBanner lang="ro" />)
    expect(screen.getByText(I18N.ro.offline_banner_sub)).toBeInTheDocument()
  })

  test('banner container has className offline-banner', () => {
    const { container } = render(<OfflineBanner lang="en" />)
    expect(container.firstChild).toHaveClass('offline-banner')
  })
})
