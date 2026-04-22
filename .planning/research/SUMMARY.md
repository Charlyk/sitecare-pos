# Research Summary: SiteCare POS Desktop App

## Recommended Stack

| Layer | Choice | Version | Why |
|-------|--------|---------|-----|
| Desktop shell | Tauri | 2.10.3 | User-specified; v2 only (v1 is maintenance-mode) |
| Frontend framework | React | 18.x | Stay on 18 — React 19 has breaking JSX changes |
| Build tool | Vite | 6.x | Stay on 6 — Vite 8 Rolldown bundler not production-ready |
| UI state | Zustand | 5.0.12 | Screen, role, lang, accent, density, toasts — never server data |
| Server state | TanStack Query | 5.99.x | Orders, menu, mutations, optimistic updates, cache |
| API layer | @charlyk/admin-client | 1.1.20+ | Sole API layer — no direct HTTP calls anywhere |
| Persistence | @tauri-apps/plugin-store | 2.4.2 | Replaces localStorage for preferences and auth tokens |
| Rust | stable | ≥1.77.2 | Pin in `rust-toolchain.toml` — do not use nightly |

**What not to use:** React 19, Vite 8, Redux, Tailwind, any custom API client, Electron.

## Table Stakes

Must work on day 1:

- Username + password login; auth token in OS secure storage (Keychain / Credential Manager)
- Auth guard on every screen; token refresh for full 8-hour shifts
- Accept / advance / cancel order status — wired to API with optimistic updates + rollback
- KDS: SSE with auto-reconnect, elapsed timers, green/yellow/red urgency, bump button, sound alert
- Print receipt from Order Detail via Tauri plugin (system print dialog incompatible with thermal printers)
- Loading / error / empty states on every data-fetching screen

## Build Order

Order is mandatory — each phase creates hard prerequisites for the next:

1. **Foundation** — Tauri + Vite scaffold; `@charlyk/admin-client` installing in CI; all 7 prototype screens converted from `window.*` globals to ES modules; Zustand store; design tokens; CSP configured
2. **Authentication** — LoginScreen wired to real API; auth token in OS secure storage; auth guard on all routes; proactive token refresh; SSE auth strategy confirmed
3. **Shell + Data Hooks** — Shell/Sidebar/Topbar from Zustand; `useOrders`, `useOrderActions`, `useMenu`, `useSSE` hooks; single SSE connection at Shell level
4. **Core Screens** — All 7 screens with live API data; loading/error/empty states; optimistic updates; KDS timers + urgency + sound; POS tax bug fixed
5. **Native Integration** — Thermal printing via Tauri plugin; PrinterScreen with device discovery; receipt ESC/POS formatting; Settings wired to plugin-store
6. **Build Pipeline** — GitHub Actions matrix (separate macOS + Windows runners); macOS notarization; Windows signing; `.dmg`, `.msi`, `.exe` artifacts on release tag

## Critical Watch-Outs

1. **CSP silently blocks everything** — Configure `connect-src` in `tauri.conf.json` on day 1, including the API domain. Failure is silent in production: screens empty, EventSource loops forever.

2. **GitHub Package Registry auth breaks CI** — `.npmrc` must commit scope routing (`@charlyk:registry=https://npm.pkg.github.com`); use `NODE_AUTH_TOKEN: ${{ secrets.GITHUB_TOKEN }}` in Actions. Never commit a literal PAT.

3. **EventSource cannot send auth headers** — Browser spec limitation. Inspect `@charlyk/admin-client` source first. If the SSE endpoint requires Bearer, use `@microsoft/fetch-event-source` instead of native `EventSource`.

4. **`window.*` migration order matters** — Convert leaf components first (no deps), verify renders, move up the tree. Convert `i18n.jsx` first (everything depends on `useT`). All conversions must complete before Phase 2 API wiring.

5. **macOS notarization is a hard distribution block** — Apple Developer account ($99/yr) required. Configure all 5 CI secrets before the first release build. Unnotarized apps on macOS 13+ cannot be opened by non-technical staff.

## Open Questions (resolve during planning)

- Does `@charlyk/admin-client` manage SSE auth internally (cookies) or expose a raw URL requiring Bearer? → inspect SDK source in Phase 2
- `decorations: false` has a known macOS bug with `@tauri-apps/plugin-window-state` (issue #14822) → decide in Phase 1 whether to keep native chrome or manage window state manually
- Tax calculation bug in `screen-pos.jsx` (total excludes tax) → fix in Phase 4; confirm if API returns server-calculated total (preferred) or if client must apply Romanian VAT rates (5%/9%/19%)
- Which thermal printer model(s) are targeted? → needed before Phase 5 plugin validation
