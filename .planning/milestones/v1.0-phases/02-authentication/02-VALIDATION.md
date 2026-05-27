---
phase: 02
slug: authentication
status: complete
nyquist_compliant: true
wave_0_complete: true
created: 2026-04-23
---

# Phase 02 — Validation Strategy

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.x + @testing-library/react + jsdom |
| **Config file** | `vitest.config.js` |
| **Quick run command** | `npx vitest run src/__tests__/` |
| **Full suite command** | `npx vitest run src/__tests__/` |
| **Estimated runtime** | ~1.1 seconds (30 tests, 6 files) |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run src/__tests__/`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** ~2 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 02-01-T1 | 01 | 1 | AUTH-02 | T-02-01 | Token stored in OS keychain, not localStorage | manual | — | — | ✅ human |
| 02-01-T2 | 01 | 1 | AUTH-02 | T-02-03 | `opener:default` capability grants URL open | manual | — | — | ✅ human |
| 02-02-T1 | 02 | 1 | AUTH-01 | T-02-04, T-02-06 | Submit disabled for invalid email or empty pass | unit | `npx vitest run src/__tests__/screen-login.test.jsx` | ✅ | ✅ green |
| 02-02-T2 | 02 | 1 | AUTH-01, AUTH-05 | T-02-05 | SSO greyed-out (opacity 0.45, pointerEvents none) | unit | `npx vitest run src/__tests__/screen-login.test.jsx` | ✅ | ✅ green |
| 02-03-T1 | 03 | 2 | AUTH-05 | — | isAuthenticated/authUser not persisted to disk | unit | `npx vitest run src/__tests__/store.test.js` | ✅ | ✅ green |
| 02-03-T2 | 03 | 2 | AUTH-03 | T-02-08, T-02-09 | scheduleRefresh MIN_RETRY_MS floor; errors map to 'creds' | unit | `npx vitest run src/__tests__/auth-schedule.test.js src/__tests__/auth.test.jsx` | ✅ | ✅ green |
| 02-04-T1 | 04 | 3 | AUTH-05 | T-02-11, T-02-13 | Auth guard: busy→blank, !auth→LoginScreen, auth→Shell | unit | `npx vitest run src/__tests__/app-guard.test.jsx` | ✅ | ✅ green |
| 02-05 | 05 | 4 | AUTH-01–05 | — | i18n bilingual parity (≥35 login_ keys RO↔EN) | unit | `npx vitest run src/__tests__/i18n.test.js` | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ manual*

---

## Wave 0 Requirements

All installed and verified:
- `vitest.config.js` — Vitest config with jsdom environment + React plugin
- `src/__tests__/setup.js` — @testing-library/jest-dom matchers
- Packages added: `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`, `jsdom`

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Successful login against live SiteCare API | AUTH-01 | Requires real credentials + live network | ✅ human-verified 2026-04-23 |
| OS keychain store/read/delete via Tauri IPC | AUTH-02 | Requires native Tauri runtime + signed app | ✅ human-verified 2026-04-23 |
| Cold-start auto-login from keychain token | AUTH-04 | Requires Tauri runtime + OS keychain | ✅ human-verified 2026-04-23 |
| Forgot password opens system browser | D-05 | Requires Tauri opener plugin at runtime | ✅ human-verified 2026-04-23 |
| Session expiry toast + redirect after 2s | AUTH-03/D-07 | Requires runtime timer to fire | ✅ human-verified 2026-04-23 |

---

## Validation Audit 2026-04-23

| Metric | Count |
|--------|-------|
| Gaps found | 8 automated + 5 manual |
| Resolved (automated) | 8 |
| Escalated to manual | 5 (all require Tauri runtime) |
| Total tests | 30 |
| Test files | 6 |
| Suite runtime | ~1.1s |

---

## Validation Sign-Off

- [x] All tasks have automated verify or manual-only designation
- [x] Wave 0 infrastructure installed and verified
- [x] No watch-mode flags
- [x] Feedback latency < 2s
- [x] `nyquist_compliant: true` — 8 automated green + 5 manual-only items human-verified 2026-04-23

**Approval:** approved 2026-04-23 — 30 automated tests green, 5 manual items human-verified by user
