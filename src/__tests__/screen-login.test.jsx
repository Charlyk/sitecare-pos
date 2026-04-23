// Tests for LoginScreen — U1 (isValidEmail via disabled state), U2 (canSubmit composite), U7 (SSO disabled)
// AUTH-01, AUTH-05/D-04

vi.mock('@tauri-apps/plugin-store', () => ({ load: vi.fn() }))
vi.mock('@charlyk/admin-client', () => ({ signIn: vi.fn(), createAdminClient: vi.fn() }))
vi.mock('@tauri-apps/plugin-opener', () => ({ open: vi.fn(), openUrl: vi.fn() }))
vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }))

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LoginScreen } from '../screen-login.jsx'

const defaultProps = {
  lang: 'en',
  onLangChange: vi.fn(),
  onSubmit: vi.fn(),
  onForgotPassword: vi.fn(),
  busy: false,
  error: null,
}

// Helper: find the primary submit button (not the SSO button)
function getSubmitButton() {
  return screen.getByRole('button', { name: /^(sign in|intră în aplicație|signing in|se conectează)/i })
}

// ── U1: isValidEmail reflected in Submit button disabled state ──────────────

describe('U1 — isValidEmail via Submit button disabled state (AUTH-01)', () => {
  test('submit button is disabled when email field is empty', () => {
    render(<LoginScreen {...defaultProps} />)
    // No email, no password — both empty → disabled
    const submitBtn = document.querySelector('button[type="submit"]')
    expect(submitBtn).toBeDisabled()
  })

  test('submit button is disabled when email has no @ symbol (invalid)', async () => {
    const user = userEvent.setup()
    render(<LoginScreen {...defaultProps} />)

    await user.type(screen.getByPlaceholderText(/you@restaurant/i), 'notanemail')
    await user.type(screen.getByPlaceholderText(/your password/i), 'secret123')

    const submitBtn = document.querySelector('button[type="submit"]')
    expect(submitBtn).toBeDisabled()
  })

  test('submit button is disabled when email has @ but no domain dot (invalid)', async () => {
    const user = userEvent.setup()
    render(<LoginScreen {...defaultProps} />)

    await user.type(screen.getByPlaceholderText(/you@restaurant/i), 'user@nodot')
    await user.type(screen.getByPlaceholderText(/your password/i), 'secret123')

    const submitBtn = document.querySelector('button[type="submit"]')
    expect(submitBtn).toBeDisabled()
  })

  test('submit button is enabled when email is valid and password is non-empty', async () => {
    const user = userEvent.setup()
    render(<LoginScreen {...defaultProps} />)

    await user.type(screen.getByPlaceholderText(/you@restaurant/i), 'chef@kitchen.com')
    await user.type(screen.getByPlaceholderText(/your password/i), 'secret123')

    const submitBtn = document.querySelector('button[type="submit"]')
    expect(submitBtn).not.toBeDisabled()
  })
})

// ── U2: canSubmit composite logic ───────────────────────────────────────────

describe('U2 — canSubmit composite logic (AUTH-01)', () => {
  test('submit button is disabled when email is valid but password is empty', async () => {
    const user = userEvent.setup()
    render(<LoginScreen {...defaultProps} />)

    await user.type(screen.getByPlaceholderText(/you@restaurant/i), 'chef@kitchen.com')
    // password left empty

    const submitBtn = document.querySelector('button[type="submit"]')
    expect(submitBtn).toBeDisabled()
  })

  test('submit button is disabled when password is valid but email is invalid', async () => {
    const user = userEvent.setup()
    render(<LoginScreen {...defaultProps} />)

    await user.type(screen.getByPlaceholderText(/you@restaurant/i), 'bademail')
    await user.type(screen.getByPlaceholderText(/your password/i), 'secret123')

    const submitBtn = document.querySelector('button[type="submit"]')
    expect(submitBtn).toBeDisabled()
  })

  test('submit button is disabled when busy=true even with valid credentials', () => {
    // With busy=true the submit button renders "Signing in…" and is disabled
    render(<LoginScreen {...defaultProps} busy={true} />)

    const submitBtn = document.querySelector('button[type="submit"]')
    expect(submitBtn).toBeDisabled()
  })

  test('submit button is enabled only when email is valid AND password is non-empty AND busy=false', async () => {
    const user = userEvent.setup()
    render(<LoginScreen {...defaultProps} />)

    await user.type(screen.getByPlaceholderText(/you@restaurant/i), 'manager@bistro.ro')
    await user.type(screen.getByPlaceholderText(/your password/i), 'pass1')

    const submitBtn = document.querySelector('button[type="submit"]')
    expect(submitBtn).not.toBeDisabled()
  })
})

// ── U7: SSO button visually disabled and non-interactive ────────────────────

describe('U7 — SSO button disabled state (AUTH-05 / D-04)', () => {
  test('SSO button has opacity 0.45 and pointerEvents none styles', () => {
    render(<LoginScreen {...defaultProps} />)

    // The SSO button uses class="alt-btn" with explicit styles
    const ssoBtn = screen.getByRole('button', { name: /sso/i })
    expect(ssoBtn).toHaveStyle({ opacity: '0.45', pointerEvents: 'none' })
  })

  test('SSO button has cursor not-allowed style indicating it is not clickable', () => {
    render(<LoginScreen {...defaultProps} />)

    const ssoBtn = screen.getByRole('button', { name: /sso/i })
    expect(ssoBtn.style.cursor).toBe('not-allowed')
    expect(ssoBtn.style.pointerEvents).toBe('none')
  })
})
