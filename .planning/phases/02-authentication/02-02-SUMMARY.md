---
phase: 02-authentication
plan: 02
subsystem: ui/login
tags: [login, css, i18n, react, component]
completed: 2026-04-23T08:57:59Z
duration: 214s

dependency_graph:
  requires: []
  provides:
    - src/login.css
    - src/screen-login.jsx
    - login strings in src/i18n.jsx
  affects:
    - src/app.jsx (Plan 02-04 wires LoginScreen here)
    - src/i18n.jsx (login_ namespace added)

tech_stack:
  added: []
  patterns:
    - CSS extracted verbatim from prototype <style> block into dedicated login.css
    - LoginScreen accepts all auth logic as props (onSubmit, onForgotPassword, busy, error)
    - Bilingual strings merged into existing I18N flat-key table under login_ prefix

key_files:
  created:
    - src/login.css
    - src/screen-login.jsx
  modified:
    - src/i18n.jsx

decisions:
  - remember defaults to true (D-06)
  - SSO button rendered but disabled — opacity 0.45, pointerEvents none (D-04)
  - Forgot password uses onForgotPassword prop (D-05) — wired to shell::open in Plan 02-03/04
  - Decorative arcs always rendered (prototype bg=arcs is the only mode; tweaks panel omitted)
  - Version string hardcoded to VITE_APP_VERSION env var or '0.1.0' — no new Date()
  - Status pill is static read-only indicator (always online); toggle removed per D-03

metrics:
  tasks_completed: 2
  tasks_total: 2
  files_created: 2
  files_modified: 1
---

# Phase 02 Plan 02: Login Screen CSS, i18n Strings, and LoginScreen Component Summary

**One-liner:** Pixel-perfect split-panel login screen with bilingual i18n strings, all prototype CSS verbatim, and full props-driven LoginScreen component ready for auth wiring in Plan 02-04.

---

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create src/login.css — all prototype login CSS | 77ce971 | src/login.css |
| 2 | Add login strings to i18n.jsx and create src/screen-login.jsx | 25923d1 | src/i18n.jsx, src/screen-login.jsx |

---

## Artifacts Produced

### src/login.css
- 10,644 bytes — all login-specific CSS extracted verbatim from `sitecare-orders 2/project/login.html`
- Includes: `.login-body`, `.brand-panel`, `.form-panel`, `.field-input`, `.field-input.err`, `.alt-btn`, `.primary-btn`, `.receipt-card`, `.lang-seg`, `.status-pill`, `.signature`, `@keyframes pulse`, `@keyframes spin`
- Excludes (prototype-only): `.desktop-stage`, `.desktop-frame`, `.win`, `.titlebar`, `.tl-dot`, `.tl-close`, `.tl-min`, `.tl-max`, `.tl-group`, `.tweaks-panel`, `.tw-*`, `.tw-seg`, `.loc-chip`, `.loc-icon`, `.loc-info`, `.loc-label`, `.loc-name`, `.loc-addr`, `.loc-edit`, `.recent-label`, `.user-rail`, `.recent-chip`

### src/i18n.jsx
- 35 bilingual string pairs added under `login_*` prefix to both `ro` and `en` objects
- 74 total `login_` occurrences (35 keys × 2 languages, plus 4 uses in comments)
- Keys cover: welcome, title, sub, email, password, forgot, remember, submit button (idle + busy), SSO, online status, error messages, session expired, brand panel copy, receipt card copy, footer links, signature

### src/screen-login.jsx
- Exports `LoginScreen({ lang, onLangChange, onSubmit, onForgotPassword, busy, error })`
- Full split-panel layout: brand panel (left) + form panel (right)
- Internal state: `email`, `pass`, `showPass`, `remember` (default: true)
- Email validation with `/^[^\s@]+@[^\s@]+\.[^\s@]+$/` guards `onSubmit` call (T-02-04)
- Password type toggles `password`/`text` via showPass state (T-02-05)
- Submit disabled when `email === '' || pass === '' || busy` (T-02-06)
- SSO button: rendered, `opacity: 0.45`, `cursor: not-allowed`, `pointerEvents: none` (D-04)
- Forgot password: two locations — both call `onForgotPassword()` prop (D-05)
- Decorative arcs always rendered (both `.arc` and `.arc2`)
- No `window.*` globals, no `localStorage`, no prototype-only wrappers

---

## Deviations from Plan

None — plan executed exactly as written.

---

## Threat Model Compliance

| Threat ID | Mitigation | Status |
|-----------|-----------|--------|
| T-02-04 | `isValidEmail()` regex guards `handleSubmit` before `onSubmit` is called | Implemented |
| T-02-05 | `type={showPass ? 'text' : 'password'}` — defaults to `password` type | Implemented |
| T-02-06 | `disabled={!canSubmit}` prevents submit when fields empty or `busy` is true | Implemented |

---

## Known Stubs

| Stub | File | Line | Reason |
|------|------|------|--------|
| Receipt prices: 42,00 / 28,00 / 22,00 / 92,00 lei | src/screen-login.jsx | ~88-98 | Intentional — receipt card is a static decorative element per UI-SPEC; prices are not data-driven |

---

## Self-Check: PASSED

| Item | Status |
|------|--------|
| src/login.css exists | FOUND |
| src/screen-login.jsx exists | FOUND |
| src/i18n.jsx modified | FOUND |
| 02-02-SUMMARY.md exists | FOUND |
| Task 1 commit 77ce971 | FOUND |
| Task 2 commit 25923d1 | FOUND |
