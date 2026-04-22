---
phase: 1
slug: foundation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-22
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Phase 1 is a scaffold + migration phase — no automated test framework yet. All verification is command-line or DevTools-based.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | None — scaffold/migration phase; no unit tests |
| **Config file** | none — no test config required for Phase 1 |
| **Quick run command** | `npm run dev` (Vite-only, no Tauri window) |
| **Full suite command** | `npm run tauri dev` (full native window) |
| **Estimated runtime** | ~60s for `tauri dev` (first Rust compile ~5-10min) |

---

## Sampling Rate

- **After every task commit:** Run `npm run dev` — Vite should serve without errors
- **After every plan wave:** Run `npm run tauri dev` — native window should open, navigate all screens
- **Before `/gsd-verify-work`:** Full manual smoke test (all 7 screens + persistence + CSP check)
- **Max feedback latency:** 60 seconds (Vite build; Rust compile only on first run)

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 1-01-01 | 01 | 0 | FOUND-01 | T-1-01 | Rust toolchain installed before scaffold | manual | `cargo --version` exits 0 | ✅ W0 | ⬜ pending |
| 1-01-02 | 01 | 0 | FOUND-01 | — | Tauri scaffold at repo root | smoke | `npm run tauri dev` opens window | ✅ W0 | ⬜ pending |
| 1-02-01 | 02 | 1 | FOUND-02 | T-1-03 | No literal PAT in .npmrc | static | `grep -v 'NODE_AUTH_TOKEN' .npmrc \| grep 'npm.pkg.github'` empty | ✅ W1 | ⬜ pending |
| 1-02-02 | 02 | 1 | FOUND-02 | — | @charlyk/admin-client installs | install | `npm install @charlyk/admin-client` exits 0 | ✅ W1 | ⬜ pending |
| 1-03-01 | 03 | 1 | FOUND-03 | T-1-02 | No window.* globals in src/ | static | `grep -rn "window\." src/ --include="*.jsx" \| grep -v "addEventListener\|removeEventListener\|innerWidth\|innerHeight\|document"` returns empty | ✅ W1 | ⬜ pending |
| 1-03-02 | 03 | 1 | FOUND-03 | — | All 7 screens render | smoke | Navigate each screen in running app; verify no JS errors | ✅ W1 | ⬜ pending |
| 1-04-01 | 04 | 2 | FOUND-04 | — | Zustand store initializes with defaults | smoke | App opens to Orders screen (default); role = cashier; lang = ro | ✅ W2 | ⬜ pending |
| 1-04-02 | 04 | 2 | FOUND-04 | — | plugin-store persists preferences | manual | Change lang to 'en' → quit app → relaunch → lang still 'en' | ✅ W2 | ⬜ pending |
| 1-05-01 | 04 | 2 | FOUND-05 | — | CSS design tokens active | DevTools | `getComputedStyle(document.documentElement).getPropertyValue('--sc-primary')` = `hsl(120 14% 49%)` | ✅ W2 | ⬜ pending |
| 1-05-02 | 04 | 2 | FOUND-05 | — | Font files load (no 404) | network | DevTools Network: Outfit-Bold.ttf and Outfit-Black.ttf return 200 | ✅ W2 | ⬜ pending |
| 1-06-01 | 05 | 2 | FOUND-06 | T-1-01 | CSP allows API domain (connect-src) | DevTools | `fetch('https://api.restaurant.sitecare.ro').catch(e=>console.log(e.message))` does NOT log "Content Security Policy" | ✅ W2 | ⬜ pending |
| 1-06-02 | 05 | 2 | FOUND-06 | — | Tauri IPC not blocked by CSP | smoke | No "blocked by Content Security Policy" errors for ipc: or http://ipc.localhost in DevTools Console | ✅ W2 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Rust toolchain installed (`curl --proto '=https' --tlsv1.2 https://sh.rustup.rs -sSf | sh`)
- [ ] Xcode CLT confirmed (`xcode-select --install` if needed)
- [ ] `cargo --version` exits 0

*Note: No test stubs required — Phase 1 is a scaffold/migration phase with no application logic to unit-test.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| 7 screens render without JS errors | FOUND-03 | No automated renderer; requires live Tauri window | Launch `npm run tauri dev`; click each nav item; watch DevTools Console for errors |
| plugin-store persists across restarts | FOUND-04 | Requires app quit + relaunch cycle | Settings → change lang to 'en' → Cmd+Q → relaunch → verify lang is 'en' |
| CSS tokens visible in UI (sage green palette) | FOUND-05 | Visual check; no automated screenshot comparison | Confirm nav active item is sage green, topbar background is warm cream, cards are white |
| Font weights display correctly (Bold/Black) | FOUND-05 | Font loading is network-level | DevTools Network filtered to "Font" → Outfit-Bold.ttf and Outfit-Black.ttf both 200 OK |
| CSP does not block API fetch | FOUND-06 | Requires live Tauri window with DevTools | Open DevTools → Console → run `fetch('https://api.restaurant.sitecare.ro')` → no CSP error |
| Accent theme mutation works | FOUND-04 | Visual/CSS check | Switch accent in Settings; verify sidebar active item color changes to match new accent |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s (excluding first Rust compile)
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
