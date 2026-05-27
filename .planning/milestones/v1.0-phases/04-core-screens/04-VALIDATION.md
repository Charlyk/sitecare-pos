---
phase: 4
slug: core-screens
status: complete
nyquist_compliant: true
wave_0_complete: true
created: 2026-04-24
audited: 2026-04-28
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest + @testing-library/react + jsdom |
| **Config file** | `vitest.config.js` (root) |
| **Setup file** | `src/__tests__/setup.js` |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run --reporter=verbose` |
| **Estimated runtime** | ~2 seconds (150 tests, 20 files) |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose`
- **After every plan wave:** Run `npx vitest run --reporter=verbose`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** ~2 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 4-W0-01 | W0 | 0 | ORD-01, ORD-03 | unit (render) | `npx vitest run src/__tests__/screen-orders.test.jsx` | ✅ | ✅ green |
| 4-W0-02 | W0 | 0 | ACT-01 | unit (render) | `npx vitest run src/__tests__/accept-dialog.test.jsx` | ✅ | ✅ green |
| 4-W0-03 | W0 | 0 | ACT-03 | unit (render) | `npx vitest run src/__tests__/cancel-dialog.test.jsx` | ✅ | ✅ green |
| 4-W0-04 | W0 | 0 | KDS-02, KDS-03, KDS-05 | unit (render) | `npx vitest run src/__tests__/screen-kitchen.test.jsx` | ✅ | ✅ green |
| 4-W0-05 | W0 | 0 | POS-01..05 | unit (render+mutation) | `npx vitest run src/__tests__/screen-pos.test.jsx` | ✅ | ✅ green |
| 4-W0-06 | W0 | 0 | MENU-01, MENU-02 | unit (render+mutation) | `npx vitest run src/__tests__/screen-menu.test.jsx` | ✅ | ✅ green |
| 4-W0-07 | W0 | 0 | SET-01, SET-02, SET-03 | unit (render) | `npx vitest run src/__tests__/screen-settings.test.jsx` | ✅ | ✅ green |
| 4-W0-08 | W0 | 0 | KDS-04 | unit (hook) | `npx vitest run src/__tests__/use-sse.test.js` | ✅ | ✅ green |
| 4-W0-09 | W0 | 0 | ACT-02 | unit (map) | `npx vitest run src/__tests__/use-order-actions.test.js` | ✅ | ✅ green |
| 4-W0-10 | W0 | 0 | soundMuted | unit (store) | `npx vitest run src/__tests__/store.test.js` | ✅ | ✅ green |
| 4-W0-11 | W0 | 0 | ORD-02 | unit (store) | `npx vitest run src/__tests__/store.test.js` | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

**Create (new files):**
- [x] `src/__tests__/screen-orders.test.jsx` — ORD-01 filter tabs + ORD-03 search
- [x] `src/__tests__/accept-dialog.test.jsx` — ACT-01 dialog callback + disabled state
- [x] `src/__tests__/cancel-dialog.test.jsx` — ACT-03 reason selection + dismiss
- [x] `src/__tests__/screen-kitchen.test.jsx` — KDS-02 timer interval + KDS-03 urgency colors + KDS-04 mute + KDS-05 bump button
- [x] `src/__tests__/screen-pos.test.jsx` — POS-01..05
- [x] `src/__tests__/screen-menu.test.jsx` — MENU-01, MENU-02
- [x] `src/__tests__/screen-settings.test.jsx` — SET-01, SET-02, SET-03

**Extend (existing files):**
- [x] `src/__tests__/use-sse.test.js` — KDS-04 snapshot detection + mute tests
- [x] `src/__tests__/use-order-actions.test.js` — ACT-02 statusToSDK enum mapping (exported from app.jsx)
- [x] `src/__tests__/store.test.js` — soundMuted + setSoundMuted + ORD-02 role switch

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Sound plays audibly on real SSE new-order event | KDS-04 | Audio.play() cannot be verified in jsdom | Open app, KDS screen; trigger a new order from another device; listen for chime |
| Display settings survive app close + reopen | SET-01/02/03 | @tauri-apps/plugin-store persistence requires native runtime | Change lang/density/accent; kill app; reopen; verify values are retained |
| Order lifecycle: NEW → ACCEPTED → PREPARING → READY → DONE | ACT-01, ACT-02 | Full API round-trip; no mock | Accept order with prep time, advance through each state, confirm each API call succeeds |
| New order appears on KDS without reload (SSE) | KDS-01/KDS-05 | SSE delivery; no mock | From POS screen, ring up an order; watch KDS screen without reloading |

---

## Validation Sign-Off

- [x] All tasks have automated verify or Manual-Only rationale
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all previously MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 5s (measured: ~2s)
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** 2026-04-28

---

## Validation Audit 2026-04-28

| Metric | Count |
|--------|-------|
| Gaps found | 25 |
| Resolved (automated) | 25 |
| Escalated to manual-only | 0 |
| Final suite | 150 tests / 20 files — all green |

**Implementation notes:**
- `statusToSDK` exported from `src/app.jsx` to enable unit testing of SDK enum mapping
- `AcceptDialog` exported from `src/app.jsx` to enable isolated component testing
- KDS-03 urgency color tests match jsdom-normalized RGB values: `rgb(227, 232, 227)` (neutral) and `rgb(245, 159, 10)` (amber); CSS custom property `var(--sc-terracotta)` preserved verbatim
