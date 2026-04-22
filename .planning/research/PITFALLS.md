# Domain Pitfalls: SiteCare POS — Tauri v2 + React + Private SDK

**Domain:** Tauri v2 desktop POS app ported from CDN/Babel React prototype
**Researched:** 2026-04-22
**Confidence:** HIGH (Tauri docs, GitHub official docs, MDN) / MEDIUM (CI patterns, Windows signing) / LOW (cross-compilation edge cases)

---

## Overview

This project sits at the intersection of four independently tricky domains: Tauri v2's security model, private GitHub Package Registry authentication in CI, SSE-based real-time transport in a desktop webview, and cross-platform code signing. Each domain has well-documented failure modes. The prototype-to-production migration adds a fifth: the CDN/global-variable architecture must be fully dismantled before any real wiring can happen, and that dismantling carries refactor risk that affects every subsequent phase.

The single most dangerous combination is: **CSP blocks your SSE connection silently in production, your auth token can't be passed via EventSource headers anyway, and you don't notice until after you've wired up the kitchen display**. That triple failure is addressed in Pitfalls 1, 3, and 4 below.

---

## Critical Pitfalls

### Pitfall 1: Tauri CSP Silently Blocks the SSE Connection and External API

**What goes wrong:** Tauri v2 applies no default CSP — but once you set any CSP in `tauri.conf.json`, it becomes highly restrictive. The `connect-src` directive defaults to `ipc: http://ipc.localhost` in example configs, which blocks all outbound fetch and EventSource connections to your API. The failure mode is silent in production builds: the EventSource opens, gets a network error immediately from the webview, and auto-reconnects in an infinite loop. React renders nothing. No visible error.

**Why it happens:** Tauri's webview is not a normal browser tab. It enforces CSP at the binary level for production builds. Developers test in `tauri dev` (where CSP behavior differs from production), then ship and discover the kitchen display never updates.

**Consequences:**
- SSE never connects; kitchen display is permanently stuck
- Fetch calls to `@charlyk/admin-client` are blocked; auth fails; every screen is empty
- Outfit font (loaded from Google Fonts in the prototype) is blocked — the design token system breaks visually
- The prototype used `<script type="text/babel">` tags; the migration to Vite removes those, but any remaining `eval()` usage (e.g., from a UI library's CSS-in-JS) triggers `script-src` violations

**Prevention:** Set the CSP explicitly from project day one in `src-tauri/tauri.conf.json`. Required directives for this project:

```json
"csp": {
  "default-src": "'self' ipc: http://ipc.localhost",
  "connect-src": "ipc: http://ipc.localhost https://YOUR_API_DOMAIN wss://YOUR_API_DOMAIN",
  "font-src": "'self' https://fonts.gstatic.com",
  "style-src": "'unsafe-inline' 'self' https://fonts.googleapis.com",
  "img-src": "'self' asset: http://asset.localhost blob: data:"
}
```

Replace `https://YOUR_API_DOMAIN` with the actual SiteCare API base URL. If `@charlyk/admin-client` uses a different subdomain for SSE, that subdomain needs its own entry. Enable devtools in debug builds to catch CSP violations before they reach production.

**Detection:** In `tauri dev`, open the webview devtools (right-click → Inspect). Filter console for `Content-Security-Policy` errors. In production, add `--debug` to the build command to keep devtools accessible temporarily.

**Phase:** Scaffold / Phase 1 — configure before writing a single API call.

---

### Pitfall 2: GitHub Package Registry Auth Breaks the Entire CI Build Pipeline

**What goes wrong:** `@charlyk/admin-client` is scoped to `@charlyk` and hosted at `npm.pkg.github.com`. Without a correctly configured `.npmrc`, `npm install` exits 401 immediately, which fails the Tauri build step before any Rust compilation begins. Developers commonly hard-code a PAT in `.npmrc`, commit it to the repository, and only realize the leak after the token has been rotated.

**Why it happens:** GitHub Package Registry requires authentication for all packages — even reading from public-ish scoped packages. The scope routing (`@charlyk:registry=...`) is non-obvious and is separate from the `_authToken` line. Missing either line causes a different failure: a missing scope line causes npm to try `registry.npmjs.org` which returns a 404, not a 401, confusing the error message.

**Consequences:**
- Every CI build fails at `npm install` until resolved
- If a PAT is committed, GitHub immediately detects and revokes it (secret scanning), breaking the CI again
- Tauri's 5–15 minute Rust compilation window is entirely wasted each time this is hit

**Prevention:** Two files must exist and never contain a literal token:

`.npmrc` (committed to the repository):
```
@charlyk:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}
```

GitHub Actions workflow:
```yaml
- uses: actions/setup-node@v4
  with:
    node-version: '20'
    registry-url: 'https://npm.pkg.github.com'
    scope: '@charlyk'

- run: npm ci
  env:
    NODE_AUTH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

`GITHUB_TOKEN` is automatically available in every Actions run and has `read:packages` scope for packages owned by the same organization. No PAT is needed, no rotation required, no secret leak risk. The `actions/setup-node` step with `registry-url` automatically writes the scope-to-registry mapping into the runner's `.npmrc`, so the committed `.npmrc` and the Actions step work together.

**Warning:** If `@charlyk/admin-client` is in a different GitHub organization than `sitecare-pos`, `GITHUB_TOKEN` may not have cross-org read access and a scoped PAT (stored as a repository secret, never in code) becomes necessary.

**Detection:** Run `npm install` locally without `NODE_AUTH_TOKEN` set. If it returns 401 or 404, the `.npmrc` scope routing is missing or incorrect.

**Phase:** Scaffold / Phase 1 — must work before any CI job can succeed.

---

### Pitfall 3: EventSource Cannot Send Auth Headers — SSE Auth Silently Fails

**What goes wrong:** The browser's native `EventSource` API has no method to set request headers. There is no `Authorization` field, no `headers` option, nothing. If `@charlyk/admin-client`'s SSE endpoint requires a `Bearer` token (highly likely given it requires auth everywhere else), the SSE connection is established unauthenticated and either returns 401 (at which point EventSource auto-reconnects in an infinite loop) or returns an empty event stream.

**Why it happens:** This is a browser-level specification limitation, not a Tauri limitation. It exists in Chrome, WebView2, and WKWebView equally. Most developers discover it after wiring up the happy path with API key auth from cookies or assuming headers work.

**Consequences:**
- Kitchen display SSE stream never delivers events
- EventSource enters a reconnect loop generating log noise and server load
- Auth token expiry while the app is running causes the SSE connection to silently die — no error event is fired, EventSource just reconnects without auth

**Prevention strategy (in order of preference):**

1. **Check what `@charlyk/admin-client` actually does.** If the SDK wraps SSE internally and uses cookies or a session token from the initial auth handshake, the problem may already be solved. Inspect the SDK source in `node_modules/@charlyk/admin-client/` before writing any custom SSE code.

2. **If the SDK exposes an SSE URL that requires a Bearer header:** Replace native `EventSource` with a fetch-based SSE implementation. The `@microsoft/fetch-event-source` package (or equivalent) uses `fetch()` instead of `EventSource`, supports `Authorization` headers, and handles reconnection correctly. Install as a dependency, not dev dependency.

3. **If the SDK manages SSE internally:** Wrap the SDK's reconnection in a listener that checks for auth expiry events (HTTP 401 response code) and triggers a re-login flow before reconnecting.

4. **Token expiry during a live session:** SSE connections can outlive JWT access tokens. Implement a proactive token refresh (before expiry) rather than reacting to 401 errors from the SSE stream. The refresh must happen in the same component or hook that owns the SSE lifecycle.

**Detection:** Open the network panel in Tauri devtools during development. Filter for the SSE endpoint. If you see repeated connection attempts with no data flowing, check the response status code of each attempt.

**Phase:** Phase 2 (API integration) — address before wiring the kitchen display, not after.

---

### Pitfall 4: `window.*` Globals Prevent Proper Module Wiring — Migration Order Matters

**What goes wrong:** The prototype exposes every component as a property on `window` (`window.ScreenOrders`, `window.ScreenKitchen`, `window.useT`, etc.) and imports them via `<script>` tag load order. When these files are moved into a Vite project as-is, the module system is undefined — each file executes in isolation, `window.SomeDependency` is `undefined` at evaluation time, and the app crashes with `TypeError: window.X is not a constructor` errors that are difficult to trace.

**Why it happens:** The prototype's implicit dependency ordering (file A must load before file B because B uses `window.A`) is invisible in the source. Vite's module graph is explicit: every import must be declared. Moving files without adding `import`/`export` statements produces silent failures that look like missing components rather than missing imports.

**Consequences:**
- If even one component file is not converted, the entire component tree that depends on it renders nothing
- The 7-screen app shell is tightly coupled — missing one screen component crashes the router
- CSS from `index.html`'s inline `<style>` block (230 lines) does not automatically become available to Vite-bundled components

**Prevention:** Follow a strict conversion sequence and do not mix converted and unconverted files:

1. Start with leaf components (no `window.*` dependencies)
2. Add `export default function ComponentName()` to each file
3. Add `import ComponentName from './ComponentName'` wherever `window.ComponentName` was used
4. Delete the `window.X =` assignment
5. Convert one file, verify it renders, then move to the next

Move the `index.html` inline CSS block to a `src/index.css` or component-level CSS Modules file in the same pass. Do not keep the Babel CDN script in the Vite project — Vite's `@vitejs/plugin-react` handles JSX at build time without Babel standalone.

**Warning:** The `i18n.jsx` file uses `window.useT(lang)` as a global hook. This must become a proper React context or a module export before any screen component that calls `useT` is converted. Convert it first.

**Detection:** After each component conversion, run `npm run dev` and check the Vite console for `ReferenceError` or `window.X is not a function`. Any remaining `window.` call in the console output indicates an unconverted file.

**Phase:** Phase 1 (scaffold) — the entire window-to-module conversion must complete before Phase 2 begins wiring API calls.

---

### Pitfall 5: macOS Notarization Breaks Distribution Without a Paid Developer Account

**What goes wrong:** Tauri automatically notarizes macOS builds when `APPLE_ID`, `APPLE_PASSWORD`, and `APPLE_TEAM_ID` (or App Store Connect API keys) are present in the CI environment. If those variables are absent, the binary is code-signed but not notarized. When end users on macOS 13+ open an unnotarized app downloaded from the internet, Gatekeeper blocks it with "cannot verify developer" — not just a warning, a hard block requiring the user to manually override in System Settings. Restaurant POS terminals are typically handed off as installer packages, not set up by developers — staff will not know how to override Gatekeeper.

**Why it happens:** Apple requires notarization for all Developer ID-signed apps distributed outside the App Store. This requirement has been enforced since macOS 10.15 but the friction increased in macOS 13+. The CI setup for signing (base64-encoded certificate, keychain creation) is complex enough that developers often stop at signing and miss the notarization step.

**Consequences:**
- App cannot be opened by end users on macOS without CLI intervention
- Notarization failure reason is not shown to the user — they see only "damaged or incomplete"
- Notarization takes 5–15 minutes per build via Apple's servers, adding to CI time

**Prevention:**

1. Obtain an Apple Developer account ($99/year) before the first macOS build
2. Generate a Developer ID Application certificate, not just a development certificate
3. Store these CI secrets: `APPLE_CERTIFICATE` (base64 .p12), `APPLE_CERTIFICATE_PASSWORD`, `APPLE_ID`, `APPLE_PASSWORD` (app-specific, not account password), `APPLE_TEAM_ID`
4. Follow the Tauri GitHub Actions example exactly for keychain creation — the `security create-keychain` / `security import` / `security set-key-partition-list` sequence is brittle and order-dependent
5. Verify notarization succeeded by checking the `xcrun stapler staple` output in CI logs

**Detection:** After CI produces a macOS `.dmg`, run `spctl --assess --verbose /path/to/App.app` on a clean Mac (not the build machine). If it returns `rejected`, notarization failed or was skipped.

**Phase:** Phase N (build pipeline) — must be set up before any distribution, even internal testing distribution.

---

## Medium Pitfalls

### Pitfall 6: Windows Code Signing — OV Certificate Triggers SmartScreen Every Install

**What goes wrong:** As of March 2024, Microsoft changed SmartScreen behavior: EV certificates no longer bypass SmartScreen warnings instantly. OV certificates (significantly cheaper, obtained without hardware token) trigger a "Windows protected your PC" warning for every download until the binary accumulates enough SmartScreen reputation. For a restaurant POS with a small install base, reputation accumulates very slowly — staff will see the SmartScreen warning every time they reinstall.

**Why it happens:** SmartScreen reputation is per-binary-hash. Every new build version has zero reputation. Small-volume apps may never accumulate enough downloads to auto-clear.

**Consequences:**
- Every installer on Windows shows a blue/orange SmartScreen overlay requiring user action
- Non-technical restaurant staff may refuse to install or call IT
- No automated workaround — reputation is time and volume based

**Prevention:**
- EV certificates (hardware token required, ~$300–$500/year) previously bypassed SmartScreen instantly but post-March 2024 they no longer do so automatically — they still accumulate reputation faster
- Budget for time: SmartScreen reputation clears after a few hundred installs from a consistent signing cert
- For initial deployment to a controlled set of machines: consider distributing via a package manager or MDM that bypasses SmartScreen (SCCM, Intune) rather than direct browser download
- Submit the binary to Microsoft for manual review via the Windows Defender Security Intelligence submission portal — not guaranteed to clear warnings but worth attempting for small ISVs

**Detection:** On a clean Windows 10/11 machine, download the installer via Chrome or Edge and execute it. If SmartScreen appears, the certificate does not yet have reputation.

**Phase:** Phase N (build pipeline) — plan for this before committing to a Windows distribution timeline.

---

### Pitfall 7: Tauri Cross-Compilation Is Not Supported — Two Build Runners Required

**What goes wrong:** Developers attempt to build the Windows `.exe` installer from a macOS GitHub Actions runner (or vice versa) using a cross-compilation target. Tauri explicitly does not support meaningful cross-compilation. Attempting `tauri build --target x86_64-pc-windows-gnu` from macOS fails at the bundling step because `makensis.exe` (NSIS, the Windows installer builder) is not available on macOS. The Rust compilation itself may succeed but producing a distributable Windows installer does not.

**Consequences:**
- CI pipeline produces no Windows artifact despite successful Rust compilation
- If using a single runner matrix entry for both platforms, the entire release job fails

**Prevention:** Use a matrix strategy with separate runners per platform:

```yaml
strategy:
  matrix:
    include:
      - platform: 'macos-latest'
        args: '--target aarch64-apple-darwin'
      - platform: 'macos-latest'
        args: '--target x86_64-apple-darwin'
      - platform: 'windows-latest'
        args: ''
```

Each runner builds only its native platform. Use `swatinem/rust-cache@v2` on all runners to cache the `target/` directory — Rust compilation takes 10–15 minutes cold, 2–3 minutes warm.

**Detection:** Check if a `windows-latest` runner exists in your CI matrix. If the CI only has one runner, you will not get Windows artifacts.

**Phase:** Phase N (build pipeline) — design the matrix from the first CI commit.

---

### Pitfall 8: State Management Debt — Props From the Prototype Will Cause a Rewrite

**What goes wrong:** The prototype's single `App()` component passes 7+ props (`orders`, `lang`, `role`, `screen`, `selectedOrder`, `toasts`, `accent`) to every screen. This works in a mock-data app where state never changes asynchronously. Once API calls are introduced — particularly optimistic updates, SSE events arriving out of band, and concurrent state transitions (cashier advances order while kitchen display is showing it) — the prop-drilling model produces update storms, stale closure bugs, and prop threading through 3–4 component layers where middle components don't use the prop at all.

**Why it happens:** The prototype was designed for UI demonstration, not async data flow. The pattern is explicitly called out in CONCERNS.md (Concern #6) but it is easy to carry forward the existing shape when migrating components one by one.

**Consequences:**
- Re-renders of the entire component tree on every SSE event
- Stale order data in optimistically-updated POS screen while the server processes the request
- Toast system in root component causes full re-render on every notification
- Adding a sixth prop requires touching every intermediate component file

**Prevention:** Introduce the state split at the scaffold stage, before wiring any API:

- **Server state** (orders, menu items, order history): TanStack Query v5. Handles caching, background refetch, optimistic updates with rollback, and stale-while-revalidate. The kitchen display SSE events should invalidate the order query cache rather than maintaining a separate state slice.
- **UI state** (current screen, language, role, sidebar collapse, accent theme): Zustand store. Single `useAppStore` hook, no prop drilling. Preference persistence (already in the prototype) becomes a Zustand middleware (`persist` with `localStorage`).
- **Toast notifications**: `react-hot-toast` or `sonner` — context-based, zero props, works from any component including async callbacks in `@charlyk/admin-client` event handlers.

The threshold for introducing the store is: the first API call. Do not wait until prop drilling becomes painful — it becomes painful at the second API call.

**Phase:** Phase 1 (scaffold) — set up the store shape before migrating screen components.

---

### Pitfall 9: SSE Reconnection Loop on Auth Token Expiry Crashes the Kitchen Display

**What goes wrong:** JWT access tokens typically expire in 15–60 minutes. When the token expires mid-session, the SSE endpoint returns 401. The native `EventSource` API treats 401 as a network error and reconnects immediately with the same (expired) token. This produces an infinite reconnection loop at the SSE connection level: thousands of failed requests per minute, server log flooding, and a kitchen display that shows data from before the token expired with no visible error to staff.

**Consequences:**
- Kitchen display appears functional (no crash) but stops updating after token expiry
- Server logs show a flood of 401s from the SSE endpoint
- Staff have no indication that the display is stale

**Prevention:**
- Implement proactive token refresh: schedule a refresh 60 seconds before token expiry using the expiry timestamp from the JWT payload
- If using a fetch-based SSE library (recommended in Pitfall 3), hook into its error callback to detect 401 responses and trigger a re-auth before reconnecting
- On 401, close the SSE connection explicitly, refresh the token, then re-open — do not rely on EventSource auto-reconnect behavior
- Add a visible "disconnected" indicator to the kitchen display header so staff can report staleness

**Detection:** In development, shorten the token TTL to 60 seconds. Observe whether the kitchen display continues to update after 60 seconds. Check the network panel for repeated SSE connection attempts.

**Phase:** Phase 2 (real-time integration) — implement alongside the SSE setup, not as a follow-up task.

---

### Pitfall 10: Tax Calculation Bug Ships to Production If Not Fixed During Prototype Migration

**What goes wrong:** The prototype has a documented bug (CONCERNS.md, Concern #8): `screen-pos.jsx` line 29 computes `total = subtotal + fee`, omitting tax. This means the POS total displayed to customers is understated. If this logic is carried forward into the production app before server-side tax calculation is available, cashiers will undercharge every customer.

**Why it happens:** The migration focuses on wiring up components to the API. The tax bug is in the existing component code and easy to miss if the component is migrated without a business logic review.

**Consequences:**
- Financial discrepancy on every transaction until corrected
- For a Romanian restaurant, per-category VAT rates (5% takeaway cold food, 9% some categories, 19% dine-in/alcohol) must be applied correctly — a flat 19% is also wrong for many menu items

**Prevention:**
- Do not migrate `screen-pos.jsx` without fixing the total calculation at the same time
- Server-side total is authoritative — when `@charlyk/admin-client`'s `createOrder` response includes the server-calculated total, use that value in the receipt, not the client-computed subtotal
- Display tax as a separate line item in the POS summary so the discrepancy is visible during testing

**Phase:** Phase 2 (API integration) — fix before `createOrder` is wired up.

---

## Low Pitfalls

### Pitfall 11: Outfit Font Loads Slowly or Fails — CSS Design Token System Breaks Visually

**What goes wrong:** The prototype loads Outfit from Google Fonts via a `<link>` in `index.html`. In the Tauri app, Tauri's CSP (if not configured per Pitfall 1) blocks `fonts.googleapis.com` and `fonts.gstatic.com`. Additionally, the app may be used in a restaurant with intermittent internet — if the font is not bundled locally, the app falls back to a system sans-serif and the design token palette (`--sc-body-font`) produces a visually wrong result even though colors are correct.

**Prevention:**
- Bundle Outfit as a local font asset in `src/assets/fonts/` using the downloaded `.woff2` files
- Use `@font-face` declarations in `src/index.css` pointing to local files
- Remove the Google Fonts `<link>` from `index.html` during prototype migration
- If internet loading is preferred, ensure CSP `font-src` includes `https://fonts.gstatic.com` from day one

**Phase:** Phase 1 (scaffold) — resolve during prototype-to-Vite migration.

---

### Pitfall 12: Vite Dev Server Runs on HTTP, Tauri Webview Has Mixed-Content Issues

**What goes wrong:** During development, `tauri dev` starts Vite's dev server on `http://localhost:1420` (or similar). If the SiteCare API is served over HTTPS, the browser's mixed-content rules can block fetch calls from an HTTP page to an HTTPS API. In Tauri's webview this is less strict than a public browser but can still surface depending on webview version and OS.

**Prevention:**
- The Tauri CSP `connect-src` directive should include the API domain with the `https://` scheme
- In `vite.config.js`, do not configure a proxy that changes protocol — let the API SDK handle its own connection directly
- If mixed-content errors appear in devtools during `tauri dev`, add `"dangerousDisableAssetCspModification": false` and inspect what Tauri is injecting

**Phase:** Phase 1/2 — catch during first API call test.

---

### Pitfall 13: Hardcoded CSS Colors Break the Accent Theme System

**What goes wrong:** The prototype's `index.html` contains 230 lines of inline CSS with hardcoded hex values (`#fbf6ea`, `#3b3a36`, `#fafaf6`) that do not use the `var(--sc-*)` token system. The accent color switcher in `app.jsx` writes CSS variables to `document.documentElement.style` at runtime — but hardcoded hex values in component CSS do not respond to those runtime variable updates. Result: switching from Sage to Terracotta accent changes some colors but not others.

**Prevention:**
- During the CSS migration from `index.html` to component CSS Modules, audit every hex value and replace with the appropriate `var(--sc-*)` token
- A quick audit: `grep -r '#[0-9a-fA-F]\{3,6\}' src/` should return zero results after migration
- Use CSS Modules per component (`ComponentName.module.css`) to scope styles and make the token usage visible

**Phase:** Phase 1 (scaffold) — progressive cleanup during component migration.

---

### Pitfall 14: The Fixed 1440x900 Viewport Scale Transform Will Break on High-DPI Windows Machines

**What goes wrong:** The prototype scales the `1440×900` desktop frame using `transform: scale()` computed from the window size. On Windows with 150% or 200% display scaling (common on high-DPI laptops used as POS terminals), the effective CSS pixel space is smaller than physical pixels and the scale calculation produces a UI that is either too small or overflows the window. macOS handles HiDPI transparently; Windows DPI scaling interacts with WebView2 in a non-obvious way.

**Prevention:**
- Test on a Windows machine with `Settings > Display > Scale = 150%` during Phase 1
- Consider replacing the `transform: scale()` approach with a proper CSS-based responsive layout using the existing CSS token system — this removes the fragile scale calculation entirely
- If keeping the scale approach, read the Tauri `window.scaleFactor()` via the Tauri JS API rather than computing from CSS `window.innerWidth`

**Phase:** Phase 1 (scaffold) — verify during first Windows test build.

---

## Phase Mapping

| Phase | Topic | Likely Pitfall | Required Mitigation |
|-------|-------|---------------|---------------------|
| Phase 1: Scaffold | Tauri project init | CSP blocks everything from the start | Configure CSP in tauri.conf.json before any API call |
| Phase 1: Scaffold | Private npm install | GITHUB_TOKEN missing, .npmrc wrong | Set up .npmrc + Actions NODE_AUTH_TOKEN on day one |
| Phase 1: Scaffold | Prototype migration | window.* globals crash module imports | Convert all files to ES modules before wiring API |
| Phase 1: Scaffold | State architecture | Prop-drilling carried forward from prototype | Introduce Zustand + TanStack Query in scaffold phase |
| Phase 1: Scaffold | Font loading | Outfit blocked by CSP or internet dependency | Bundle font locally, configure font-src CSP |
| Phase 1: Scaffold | High-DPI Windows | scale() transform breaks at 150% DPI | Test on scaled Windows display in first build |
| Phase 2: API integration | Auth flow | Token management for SSE vs REST | Plan token refresh before writing SSE code |
| Phase 2: API integration | SSE auth | EventSource can't send headers | Use fetch-based SSE library if SDK doesn't handle it |
| Phase 2: API integration | SSE reconnect | 401 loop on token expiry | Proactive refresh + explicit reconnect on auth failure |
| Phase 2: API integration | POS tax bug | Wrong total migrated from prototype | Fix total calculation when migrating screen-pos.jsx |
| Phase N: Build pipeline | macOS distribution | No notarization = Gatekeeper hard block | Apple Developer account + notarization env vars |
| Phase N: Build pipeline | Windows distribution | SmartScreen warning on every install | Plan for OV cert reputation buildup or EV cert cost |
| Phase N: Build pipeline | Cross-platform CI | Cross-compilation not supported | Matrix with separate macOS + Windows runners |

---

## Sources

- [Tauri v2 CSP Documentation](https://v2.tauri.app/security/csp/) — HIGH confidence
- [Tauri v2 Migrate from v1](https://v2.tauri.app/start/migrate/from-tauri-1/) — HIGH confidence
- [Tauri v2 macOS Code Signing](https://v2.tauri.app/distribute/sign/macos/) — HIGH confidence
- [Tauri v2 Windows Code Signing](https://v2.tauri.app/distribute/sign/windows/) — HIGH confidence
- [Tauri v2 GitHub Actions Pipeline](https://v2.tauri.app/distribute/pipelines/github/) — HIGH confidence
- [GitHub Packages npm Registry Documentation](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-npm-registry) — HIGH confidence
- [MDN EventSource](https://developer.mozilla.org/en-US/docs/Web/API/EventSource) — HIGH confidence (header limitation confirmed)
- [MDN SSE Connection Limits](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events) — HIGH confidence
- [Tauri CSP Discussion #8578](https://github.com/orgs/tauri-apps/discussions/8578) — MEDIUM confidence (community-verified CSP patterns)
- [Windows SmartScreen EV vs OV — Microsoft Q&A](https://learn.microsoft.com/en-us/answers/questions/417016/reputation-with-ov-certificates-and-are-ev-certifi) — HIGH confidence
- [Tauri Cross-Compilation Issue #12312](https://github.com/tauri-apps/tauri/issues/12312) — MEDIUM confidence (reported bugs)
- [SSE Hidden Risks — Medium](https://medium.com/@2957607810/the-hidden-risks-of-sse-server-sent-events-what-developers-often-overlook-14221a4b3bfe) — MEDIUM confidence (community article)
- [TanStack Query: Does it replace client state?](https://tanstack.com/query/v5/docs/framework/react/guides/does-this-replace-client-state) — HIGH confidence
