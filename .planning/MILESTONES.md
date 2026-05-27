# Milestones: SiteCare POS Desktop App

---

## ✅ v1.0 MVP — SHIPPED 2026-05-22

**Phases:** 1–6 | **Plans:** 35 | **Timeline:** 30 days (2026-04-22 → 2026-05-22)
**Commits:** 249 | **Files changed:** 348 | **Source LOC:** ~7,961 JS/JSX

### Delivered

Full production-ready Tauri v2 desktop app (macOS + Windows) — pixel-perfect port of the Claude Design POS prototype backed by the live SiteCare API. All 41/41 v1 requirements delivered.

### Key Accomplishments

1. Full Tauri + Vite + React scaffold — all 12 prototype files converted from CDN globals to ES modules; design tokens, fonts, and CSP wired on day 1
2. Secure authentication with OS keychain — username/password login; token persisted in macOS Keychain / Windows Credential Manager; proactive 8-hour refresh
3. Real-time kitchen display via SSE — `useSSE` with `@microsoft/fetch-event-source`; offline detection; TanStack Query cache serves stale data while offline
4. All 7 screens fully live-wired — orders list (search/filter), KDS (timers/urgency/sound/bump), POS (cart/checkout), menu availability toggles, settings persistence
5. Thermal printer integration — 4 Rust Tauri commands (list ports, save config, test print, print receipt) via ESC/POS; 166 tests passing; approved-no-hardware
6. Full CI/CD release pipeline — GitHub Actions release.yml with macOS arm64 notarization, Windows MSI, Ed25519 auto-updater signing, silent in-app updates

### Known Gaps

- BILD-03: Windows code signing — unsigned MSI produced; Azure Trusted Signing deferred to v1.1

### Archives

- `.planning/milestones/v1.0-ROADMAP.md` — full phase details
- `.planning/milestones/v1.0-REQUIREMENTS.md` — all 41 requirements with outcomes

---
