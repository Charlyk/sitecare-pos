// Tests for auth error mapping — U3 (T-02-08: all signIn failures map to 'creds')
// Verifies the LoginScreen renders the 'creds' error message (not a raw API string)
// when error='creds' is passed.

vi.mock('@tauri-apps/plugin-store', () => ({ load: vi.fn() }))
vi.mock('@charlyk/admin-client', () => ({ signIn: vi.fn(), createAdminClient: vi.fn() }))
vi.mock('@tauri-apps/plugin-opener', () => ({ open: vi.fn(), openUrl: vi.fn() }))
vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }))

import { render, screen } from '@testing-library/react'
import { LoginScreen } from '../screen-login.jsx'
import { I18N } from '../i18n.jsx'

// ── U3: Auth error type mapping (T-02-08) ──────────────────────────────────

describe('U3 — Auth error maps to creds type, not raw API message (T-02-08)', () => {
  test('when error is creds, LoginScreen shows the i18n creds error message (not a raw API string)', () => {
    render(
      <LoginScreen
        lang="en"
        onLangChange={vi.fn()}
        onSubmit={vi.fn()}
        onForgotPassword={vi.fn()}
        busy={false}
        error="creds"
      />
    )

    // The i18n message for 'creds' error in English
    const expectedMsg = I18N.en.login_err_creds // "Wrong email or password"
    expect(screen.getByText(expectedMsg)).toBeInTheDocument()

    // Ensure raw API-style strings are NOT present
    expect(screen.queryByText(/unauthorized/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/invalid credentials/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/401/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/403/i)).not.toBeInTheDocument()
  })

  test('when error is creds, both email and password fields get error styling', () => {
    render(
      <LoginScreen
        lang="en"
        onLangChange={vi.fn()}
        onSubmit={vi.fn()}
        onForgotPassword={vi.fn()}
        busy={false}
        error="creds"
      />
    )

    // Both field wrappers should have the "err" class when error='creds'
    const errFields = document.querySelectorAll('.field-input.err')
    expect(errFields.length).toBe(2) // email field + password field both get .err
  })

  test('when error is creds in Romanian, shows the Romanian error message', () => {
    render(
      <LoginScreen
        lang="ro"
        onLangChange={vi.fn()}
        onSubmit={vi.fn()}
        onForgotPassword={vi.fn()}
        busy={false}
        error="creds"
      />
    )

    const expectedMsg = I18N.ro.login_err_creds // "Email sau parolă greșită"
    expect(screen.getByText(expectedMsg)).toBeInTheDocument()
  })
})
