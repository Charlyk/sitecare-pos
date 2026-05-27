# Phase 2: Authentication - Context

**Gathered:** 2026-04-23
**Status:** Ready for planning

<domain>
## Phase Boundary

Wire the login screen to the real SiteCare API via `@charlyk/admin-client`'s `signIn()` function, persist the returned token in OS secure storage (macOS Keychain / Windows Credential Manager), create a `createAdminClient()` singleton accessible app-wide, install a proactive session refresh, and add an auth guard so all 7 existing screens are protected — unauthenticated users are redirected to the login screen.

This phase delivers: staff can log in, stay logged in across an 8-hour shift and across restarts, and are automatically redirected to login when their session expires.

</domain>

<decisions>
## Implementation Decisions

### Login Form

- **D-01:** Login field label is **Email** (not "Username"). The SDK's `signIn()` takes `{ email, password }`. Apply standard email format validation (`/^[^\s@]+@[^\s@]+\.[^\s@]+$/`).
- **D-02:** Match the prototype layout pixel-perfectly — split layout (left brand panel + right form panel). See canonical ref `sitecare-orders 2/project/login.html`.
- **D-03:** The "Recent accounts" user-chip rail is **omitted entirely** from the production screen. Do not render a placeholder.
- **D-04:** The SSO (Google Workspace) button is rendered but **greyed out / disabled** — visible, not clickable.
- **D-05:** "Forgot password?" opens `https://restaurant.sitecare.ro/reset-password` in the system browser via Tauri's `shell::open()` (requires `@tauri-apps/plugin-shell` with `open` permission).
- **D-06:** "Keep me signed in on this terminal" checkbox maps directly to AUTH-04 — when checked (default: checked), the token is persisted to OS secure storage and auto-loaded on restart.

### Session Expiry UX

- **D-07:** When a 401 is received mid-session (or on restart with a stale token): show a brief **toast** ("Session expired — please log in again"), then navigate to the login screen after ~2 seconds.
- **D-08:** **Proactive refresh window is 5 minutes before `expiresAt`**. After login, read `session.expiresAt` from `getSession()`, set a `setTimeout` to fire 5 minutes before expiry, and call `getSession()` to refresh. If refresh fails, trigger the expiry UX (D-07).

### Post-Login Navigation

- **D-09:** After a successful login, always navigate to the **Orders screen** (`screen = 'orders'`). The Zustand-persisted `screen` value is overridden at login time.

### Claude's Discretion

- **Secure token storage:** Implement using `keyring-rs` via a custom Tauri Rust command (invoke `store_token` / `get_token` / `delete_token`). This uses macOS Keychain and Windows Credential Manager directly — satisfying AUTH-02. The `@tauri-apps/plugin-stronghold` approach is not used because it provides an encrypted file, not OS Keychain integration.
- **AdminClient singleton:** Wrap the app in a React context provider (`<AuthProvider>`) that holds the `AdminClient` instance after login. Expose via `useAuth()` hook. Screens that need API access call `useAuth()` — they do not create their own clients.
- **Refresh timer lifecycle:** The refresh `setTimeout` is managed inside `useAuth` with a `useRef` for the timer ID. It is cleared on logout and reset whenever a new token is obtained.
- **Auth guard implementation:** In `app.jsx`, check a Zustand `isAuthenticated` flag (backed by OS Keychain check on cold start). If false, render `<LoginScreen />` instead of `<Shell>`. No route library needed — the same conditional-render pattern already used in the screen router.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Login Screen Design
- `sitecare-orders 2/project/login.html` — pixel-perfect login screen prototype. Implement this layout verbatim (split brand panel / form panel). CSS classes, color tokens, typography, and component structure must match exactly. The `window.*` globals and fake auth logic are prototype-only — replace with real SDK calls.

### Phase Requirements
- `.planning/ROADMAP.md` — Phase 2 goal, success criteria (4 criteria), requirement IDs AUTH-01 through AUTH-05
- `.planning/REQUIREMENTS.md` — Full text for AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05

### SDK
- `node_modules/@charlyk/admin-client/dist/index.d.ts` — Type definitions for `signIn`, `createAdminClient`, `AdminClientOptions`, `SignInParams`, `SignInResponse`, `SessionResponse`. Key functions: `signIn(baseUrl, { email, password })` → `{ token, user }`; `adminClient.auth.getSession()` → `{ session: { expiresAt, token }, user }`.

### Existing Code
- `src/app.jsx` — Current screen router (Phase 1). The auth guard is added here as a conditional render before the `<Shell>`.
- `src/store.js` — Zustand store. Add `isAuthenticated: bool` and `authUser: null | AuthUser` to the session-only keys (not persisted). The OS Keychain check on cold start sets these.
- `src/i18n.jsx` — Bilingual string table. Login screen strings are in the prototype's `STRINGS` object — merge them into `i18n.jsx`'s existing `ro`/`en` tables under a `login` namespace or flat keys.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/icons.jsx` — `Icon` component used throughout prototype and production. Login screen uses `users`, `settings`, `check`, `alert`, `wifi`, `search`, `x` icons. All likely already present — verify before adding.
- `src/styles.css` — Existing global CSS. Login-specific styles from `login.html`'s `<style>` block must be added here (or a new `src/login.css` imported only in the login screen — follow existing patterns).
- `assets/colors_and_type.css` — All `--sc-*` tokens already imported. Login screen uses the same tokens: `--sc-primary`, `--sc-background`, `--sc-foreground`, `--sc-muted-foreground`, `--sc-terracotta`.

### Established Patterns
- **Kebab-case filenames, PascalCase exports** — new file will be `src/screen-login.jsx` exporting `LoginScreen`.
- **Functional components only** — no class components.
- **Inline styles for dynamic values, class names for static** — login screen uses both (scale transform = inline, layout classes = class names).
- **`@tauri-apps/plugin-store` already wired** — `store.js` uses `tauriStorage` adapter. Token storage uses a separate Rust IPC path (Keychain), not plugin-store.
- **Zustand store shape** — `store.js` has 6 persisted keys and 3 session-only keys. `isAuthenticated` and `authUser` are session-only (not in `partialize`).

### Integration Points
- `src/app.jsx` line ~56 — screen router wraps in `<Shell>`. Auth guard inserts a conditional check before Shell renders: `if (!isAuthenticated) return <LoginScreen ... />`.
- `src/main.jsx` — Vite entry; no change needed.
- `tauri.conf.json` — `allowlist.shell.open` (or Tauri v2 equivalent) must be enabled for `shell::open()` (Forgot password link). Also confirm `@tauri-apps/plugin-shell` is listed in `Cargo.toml`.
- `src-tauri/src/lib.rs` — New Rust commands `store_token`, `get_token`, `delete_token` registered here using `keyring` crate.

</code_context>

<specifics>
## Specific Ideas

- **Forgot password URL confirmed:** `https://restaurant.sitecare.ro/reset-password` — open with `open(url)` from `@tauri-apps/plugin-shell`.
- **Login screen prototype path:** `sitecare-orders 2/project/login.html` — read this file before implementing. CSS architecture is inline in the HTML `<style>` block; extract and adapt for Vite.
- **SDK confirmed:** `signIn(baseUrl, { email, password })` is a named export alongside `createAdminClient`. Both are in `@charlyk/admin-client`.
- **SSE open question resolved:** The SDK uses its own async-generator SSE client (not native `EventSource`), so Bearer auth headers can be passed through it. This is safe for Phase 3 SSE wiring.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within Phase 2 scope.

</deferred>

---

*Phase: 02-authentication*
*Context gathered: 2026-04-23*
