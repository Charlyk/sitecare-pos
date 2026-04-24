---
phase: 3
slug: shell-data-foundation
status: complete
nyquist_compliant: true
wave_0_complete: true
created: 2026-04-23
audited: 2026-04-24
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.1.5 |
| **Config file** | vite.config.js (vitest reads it) |
| **Quick run command** | `npx vitest run src/__tests__/` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run src/__tests__/`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 3-install | 01 | 1 | KDS-01 | — | N/A | shell | `npm list @microsoft/fetch-event-source` | ✅ | ✅ green |
| 3-auth-token | 01 | 1 | KDS-01 | T-3-01 | Token in Authorization header only, never in URL | unit | `npx vitest run src/__tests__/use-sse.test.js` | ✅ | ✅ green |
| 3-use-sse | 01 | 1 | KDS-01 | T-3-02 | Guard: if (!token) return early; malformed events ignored in try/catch | unit | `npx vitest run src/__tests__/use-sse.test.js` | ✅ | ✅ green |
| 3-use-orders | 02 | 2 | OFF-02 | — | N/A | unit | `npx vitest run src/__tests__/use-orders.test.js` | ✅ | ✅ green |
| 3-use-menu | 02 | 2 | OFF-02 | — | N/A | unit | `npx vitest run src/__tests__/use-orders.test.js` | ✅ | ✅ green |
| 3-use-order-actions | 02 | 2 | OFF-03 | — | N/A | unit | `npx vitest run src/__tests__/use-order-actions.test.js` | ✅ | ✅ green |
| 3-offline-banner | 03 | 2 | OFF-01 | — | N/A | unit | `npx vitest run src/__tests__/offline-banner.test.jsx` | ✅ | ✅ green |
| 3-i18n-keys | 03 | 2 | OFF-01 | — | N/A | unit | `npx vitest run src/__tests__/i18n.test.js` | ✅ | ✅ green |
| 3-offline-buttons | 03 | 2 | OFF-03 | — | N/A | unit | `npx vitest run src/__tests__/offline-buttons.test.jsx` | ✅ | ✅ green |
| 3-shell-wiring | 03 | 3 | OFF-01, OFF-02, OFF-03 | — | N/A | manual | visual verify in dev app | — | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `src/__tests__/use-sse.test.js` — stubs for KDS-01 (mock fetchEventSource, verify cache upsert on `order_new`, isConnected state transitions, ping events ignored)
- [x] `src/__tests__/offline-banner.test.jsx` — stubs for OFF-01 (renders when isOffline=true; does not render when isOffline=false)
- [x] `src/__tests__/use-orders.test.js` — stubs for OFF-02 (mock client; verify staleTime=5min on useMenu; verify stale cache is served when query throws)
- [x] `src/__tests__/offline-buttons.test.jsx` — stubs for OFF-03 (render a screen with isOffline=true; assert mutating buttons have `disabled` attribute and `.btn-disabled-offline` class)
- [x] Extend `src/__tests__/i18n.test.js` — add assertions for `offline_banner_title` and `offline_banner_sub` keys in both `ro` and `en` objects
- [x] `src/__tests__/use-order-actions.test.js` — U11c (audited 2026-04-24): updateStatus SDK args, cache invalidation on success, updateEstimatedTime SDK args

*Existing infrastructure: `src/__tests__/setup.js`, `src/__tests__/i18n.test.js`, `src/__tests__/store.test.js` — vitest + @testing-library/react already installed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| KDS receives live `order_new` event within 2s of server emit | KDS-01 | Requires live SSE server + network; real-time delivery cannot be mocked in unit tests | Run `npm run tauri dev`; create an order via API or another client; verify KDS screen updates without page reload |
| Offline banner appears within seconds of network loss | OFF-01 | Requires actual network disruption — cannot simulate SSE drop in jsdom | Run app; disable WiFi/ethernet; observe banner within ~35s (SSE reconnect timeout) |
| Banner disappears automatically on reconnect | OFF-01 | Requires real network reconnection to verify auto-recovery | Re-enable network after offline test; verify banner disappears within 10s |
| Previously loaded orders remain visible while offline | OFF-02 | Requires TanStack Query cache with prior data + live network disruption | Load orders screen; disable network; navigate away and back; verify orders still display from cache |
| `slideDown` entry animation plays on banner mount | OFF-01 | CSS animation — jsdom does not compute animations | Trigger offline state in dev; observe 200ms `slideDown` animation on banner entry |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 15s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** 2026-04-24

---

## Validation Audit 2026-04-24

| Metric | Count |
|--------|-------|
| Gaps found | 1 |
| Resolved | 1 |
| Escalated | 0 |

**Gap resolved:** `3-use-order-actions` — created `src/__tests__/use-order-actions.test.js` with 3 tests (U11c): updateStatus SDK args, cache invalidation on success, updateEstimatedTime SDK args.

**Final suite:** 80 passed, 0 failed, 13 test files (`npx vitest run`, ~1.2s)
