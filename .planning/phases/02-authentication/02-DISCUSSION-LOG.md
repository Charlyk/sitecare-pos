# Phase 2: Authentication - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-23
**Phase:** 02-authentication
**Areas discussed:** Login field (email vs username), Session expiry UX, Login screen visual design, Post-login landing

---

## Login field: email vs username

| Option | Description | Selected |
|--------|-------------|----------|
| Email address | Form shows 'Email' field with email validation. Matches SDK signature directly. | ✓ |
| Staff ID / username | Short alias or ID; no email validation. | |
| Either (show 'Email or Username') | Generic label, no strict validation. | |

**User's choice:** Email address
**Notes:** SDK's `signIn()` takes `{ email, password }` — email field with standard validation confirmed.

---

## Session expiry UX

### What to show when token expires

| Option | Description | Selected |
|--------|-------------|----------|
| Toast + auto-redirect | Brief toast then navigate to login after ~2 seconds. | ✓ |
| Silent redirect | Navigate to login immediately with no explanation. | |
| Blocking modal | Dialog with 'Log in' button before redirect. | |

**User's choice:** Toast + auto-redirect

### Proactive refresh timing

| Option | Description | Selected |
|--------|-------------|----------|
| 5 minutes before expiry | Comfortable buffer for network round-trip. Standard practice. | ✓ |
| 30 minutes before expiry | Very safe for slow networks, more aggressive. | |
| Claude decides | Let implementation pick a sensible default. | |

**User's choice:** 5 minutes before expiry

---

## Login screen visual design

**User clarification:** User provided the login screen prototype at `sitecare-orders 2/project/login.html`.

### Recent accounts rail

| Option | Description | Selected |
|--------|-------------|----------|
| Do not add it | Omit entirely — no placeholder. | ✓ |
| Grey it out | Render placeholder but non-clickable. | |
| Implement it | Store recently logged-in users for quick re-login. | |

**User's choice:** Do not add it (user note: "do not add it")

### SSO button and Forgot password

| Option | Description | Selected |
|--------|-------------|----------|
| Grey out SSO, link Forgot Password | SSO disabled; 'Forgot password?' opens SiteCare web URL. | ✓ |
| Grey out both | Both rendered but non-functional. | |
| Hide both | Remove from production screen entirely. | |

**User's choice:** Grey out SSO, link Forgot Password

### Forgot password URL

**User's choice:** `https://restaurant.sitecare.ro/reset-password`

---

## Post-login landing

| Option | Description | Selected |
|--------|-------------|----------|
| Always Orders screen | Every login lands on Orders. Predictable for all staff roles. | ✓ |
| Restore last active screen | Re-login returns to the screen the user was on before session expired. | |

**User's choice:** Always Orders screen

---

## Claude's Discretion

- Secure token storage: `keyring-rs` crate via custom Tauri Rust command (actual OS Keychain, not encrypted file)
- AdminClient singleton: React context provider `<AuthProvider>` + `useAuth()` hook
- Auth guard: Zustand `isAuthenticated` flag, conditional render in `app.jsx`
- Refresh timer: `setTimeout` in `useAuth`, cleared on logout, reset on new token

## Deferred Ideas

None — discussion stayed within Phase 2 scope.
