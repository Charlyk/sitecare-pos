# Phase 6: Build Pipeline - Context

**Gathered:** 2026-04-30
**Status:** Ready for planning

<domain>
## Phase Boundary

Every GitHub release tag triggers a GitHub Actions CI workflow that produces:
- A notarized macOS arm64 `.dmg` installer (Gatekeeper-clean on macOS 13+)
- An unsigned Windows `.msi` installer (SmartScreen click-through acceptable for now)

The installed app checks for updates silently on launch via `tauri-plugin-updater` backed by GitHub Releases. No manual build step required for any release.

</domain>

<decisions>
## Implementation Decisions

### macOS Build Target
- **D-01:** arm64 only — no universal binary. Restaurant hardware is all Apple Silicon or recent Mac; Intel Macs (pre-2020) are not a supported target.
- **D-02:** Minimum macOS 13 Ventura — matches BILD-02 success criteria. Gatekeeper notarization required for clean install on macOS 13+.

### Windows Code Signing
- **D-03:** Skip code signing for now. The user installs the app personally on all current restaurant machines and can click through the one-time SmartScreen prompt ("More info" → "Run anyway"). BILD-03 is deferred — will revisit once client volume makes manual installs impractical. Signing candidate: Azure Trusted Signing (~$10/month, no hardware token) when that time comes.

### Auto-Update Server
- **D-04:** GitHub Releases — `tauri-plugin-updater` is configured to use GitHub Releases as the update source. `tauri-action` generates the `latest.json` update manifest automatically as part of the release workflow. No custom infrastructure required.

### Auto-Update UX
- **D-05:** Silent install on next launch — app downloads the update in the background and applies it on next restart. No user prompt or confirmation dialog. Matches BILD-04 spec exactly.
- **D-06:** Update check on launch only — no periodic background check during a running session. Keeps update logic simple and avoids any download activity mid-shift.

### Claude's Discretion
- Exact GitHub Actions workflow structure (matrix strategy, runner versions, job names) — standard `tauri-action` setup
- Updater private key generation and storage as GitHub Secret
- Cargo.toml `version` bump strategy for releases (manual tag bump is fine)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Configuration
- `src-tauri/tauri.conf.json` — app identifier (`ro.sitecare.pos`), product name, current version (`0.1.0`), bundle targets. Updater endpoint URL goes here.
- `src-tauri/Cargo.toml` — app version must stay in sync with `tauri.conf.json` for releases.
- `.planning/ROADMAP.md` §Phase 6 — goal, success criteria (BILD-01 through BILD-04)
- `.planning/REQUIREMENTS.md` §Build Pipeline — BILD-01, BILD-02, BILD-03, BILD-04 requirement text

### Auth / Secrets
- `.npmrc` (repo root) — `@charlyk:registry=https://npm.pkg.github.com` — CI must set `NODE_AUTH_TOKEN: ${{ secrets.GITHUB_TOKEN }}` to install `@charlyk/admin-client`. Already documented in STATE.md critical watch-outs.

### State / Prior Decisions
- `.planning/STATE.md` §Critical Watch-Outs — `Cargo.lock` committed, GitHub Package Registry auth pattern, macOS notarization requirement
- `.planning/phases/05-native-integration/` — Phase 5 plans for Rust commands and escpos crate; CI must compile these successfully

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src-tauri/tauri.conf.json`: `bundle.active = true`, `bundle.targets = "all"` already set — Phase 6 will refine targets and add updater config block here.
- `src-tauri/icons/`: Full icon set already present (32x32, 128x128, 128x128@2x, icon.icns, icon.ico) — no new icon work needed.

### Established Patterns
- **Cargo.lock committed** — ensures reproducible Rust builds in CI; do not add `Cargo.lock` to `.gitignore`.
- **`tauri add` for plugins** — prior phases installed all Tauri plugins via `tauri add` CLI (handles npm + Cargo + capabilities atomically). `tauri-plugin-updater` should follow the same pattern.
- **No `.github/` directory exists** — the entire CI workflow must be created from scratch in Phase 6.

### Integration Points
- `tauri-plugin-updater` adds an update check call to `src-tauri/src/lib.rs` (Rust side) and optionally a JS-side hook; the update endpoint URL is configured in `tauri.conf.json` under `plugins.updater.endpoints`.
- macOS notarization requires `APPLE_ID`, `APPLE_PASSWORD` (app-specific), `APPLE_TEAM_ID`, and `APPLE_CERTIFICATE` + `APPLE_CERTIFICATE_PASSWORD` GitHub Secrets — planner must document all required secrets.

</code_context>

<specifics>
## Specific Ideas

- User will install the app personally on all machines for the foreseeable future — optimise for "get a working installer fast" over "production-hardened distribution".
- When Windows signing is eventually added, Azure Trusted Signing is the preferred path (no hardware token, CI-friendly, ~$10/month).

</specifics>

<deferred>
## Deferred Ideas

- **Windows code signing (BILD-03)** — skipped now; revisit when client volume makes manual installs impractical. Candidate: Azure Trusted Signing.
- **Universal macOS binary** — skipped; arm64 only for now. Add x86_64 cross-compilation later if Intel Mac users emerge.
- **Periodic update checks** — deferred; launch-only check is sufficient. Add background polling in a future phase if needed.
- **Linux build** — out of scope per PROJECT.md.

</deferred>

---

*Phase: 6-Build-Pipeline*
*Context gathered: 2026-04-30*
