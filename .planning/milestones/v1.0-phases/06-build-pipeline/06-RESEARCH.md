# Phase 6: Build Pipeline - Research

**Researched:** 2026-04-30
**Domain:** Tauri v2 GitHub Actions CI, macOS notarization, tauri-plugin-updater, Windows MSI
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** arm64 only — no universal binary. Restaurant hardware is all Apple Silicon or recent Mac; Intel Macs (pre-2020) are not a supported target.
- **D-02:** Minimum macOS 13 Ventura — matches BILD-02 success criteria. Gatekeeper notarization required for clean install on macOS 13+.
- **D-03:** Skip Windows code signing for now. The user installs the app personally on all current restaurant machines and can click through the one-time SmartScreen prompt. BILD-03 is deferred — will revisit when Azure Trusted Signing (~$10/month) makes sense.
- **D-04:** GitHub Releases as update source — `tauri-plugin-updater` configured to use GitHub Releases. `tauri-action` generates the `latest.json` update manifest automatically. No custom infrastructure required.
- **D-05:** Silent install on next launch — app downloads the update in the background and applies it on next restart. No user prompt or confirmation dialog.
- **D-06:** Update check on launch only — no periodic background check during a running session.

### Claude's Discretion
- Exact GitHub Actions workflow structure (matrix strategy, runner versions, job names) — standard `tauri-action` setup
- Updater private key generation and storage as GitHub Secret
- Cargo.toml `version` bump strategy for releases (manual tag bump is fine)

### Deferred Ideas (OUT OF SCOPE)
- Windows code signing (BILD-03) — skipped now; revisit when client volume makes manual installs impractical. Candidate: Azure Trusted Signing.
- Universal macOS binary — skipped; arm64 only for now.
- Periodic update checks — deferred; launch-only check is sufficient.
- Linux build — out of scope per PROJECT.md.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| BILD-01 | GitHub Actions CI builds on every push and produces platform installers on release tags | tauri-action@v0 workflow with tag trigger and matrix strategy |
| BILD-02 | macOS .dmg installer with Apple notarization (required for Gatekeeper on macOS 13+) | macOS signing + APPLE_ID/APPLE_PASSWORD/APPLE_TEAM_ID env vars; tauri-action handles xcrun notarytool |
| BILD-03 | Windows .msi installer with code signing — DEFERRED per D-03; unsigned .msi still produced | tauri-action produces .msi without signing; SmartScreen click-through acceptable |
| BILD-04 | App checks for and installs updates automatically via Tauri updater | tauri-plugin-updater + tauri-plugin-process; check() on launch + downloadAndInstall() + relaunch() |
</phase_requirements>

---

## Summary

Phase 6 adds the GitHub Actions CI workflow, the `tauri-plugin-updater` auto-update stack, and the macOS notarization configuration needed to produce production-ready installers from every release tag. The work splits cleanly across three areas: (1) installing and wiring `tauri-plugin-updater` + `tauri-plugin-process` into the app, (2) configuring `tauri.conf.json` with bundle targets, updater endpoint, and signing keys, and (3) creating the `.github/workflows/release.yml` that drives the entire pipeline.

The `tauri-action` GitHub Action (version `@v0`, the only floating major tag that exists) handles the build matrix, GitHub Release creation, artifact upload, and `latest.json` generation in a single step. macOS notarization is fully automated when `APPLE_ID`, `APPLE_PASSWORD`, and `APPLE_TEAM_ID` are set as environment variables in the workflow — `tauri-action` calls `xcrun notarytool` internally via the Tauri CLI. Windows `.msi` builds proceed unsigned, which is acceptable per D-03. The updater signing keypair is generated once with `npm run tauri signer generate` and stored as a GitHub Secret (`TAURI_SIGNING_PRIVATE_KEY` + optional password).

Because this phase involves no new UI components and all artifact validation is inherently end-to-end, the Nyquist test strategy centers on structural checks (config correctness, workflow YAML validity, JS module exports) rather than runtime integration tests that would require actual Apple credentials in the test environment.

**Primary recommendation:** Use `tauri-add` for both `updater` and `process` plugins (atomic install), configure `bundle.createUpdaterArtifacts: true` in `tauri.conf.json`, set the endpoint to `https://github.com/Charlyk/sitecare-pos/releases/latest/download/latest.json`, and use the tag-push trigger (`on: push: tags: - 'app-v*'`) in the workflow.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| CI build orchestration | GitHub Actions runner | — | Runs `tauri build` + uploads artifacts |
| macOS notarization | Tauri CLI (via GitHub Actions) | Apple notarization service | `cargo tauri build` calls `xcrun notarytool` when APPLE_* env vars are set |
| Updater artifact signing | Tauri CLI build step | — | Signs .tar.gz/.msi/.sig files using TAURI_SIGNING_PRIVATE_KEY |
| latest.json generation | tauri-action | GitHub Releases CDN | tauri-action uploads `latest.json` as release asset; serves as static update manifest |
| Update check logic | Frontend (JS) — app launch | Rust (optional) | `check()` from @tauri-apps/plugin-updater called in useEffect on app mount |
| Download + install | tauri-plugin-updater (Rust) | — | Downloads and applies installer on behalf of JS caller |
| App restart after update | tauri-plugin-process (Rust) | — | `relaunch()` forces clean process restart |

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| tauri-plugin-updater (crate) | 2.10.1 | Rust-side update check + download + install | Official Tauri v2 updater plugin |
| tauri-plugin-process (crate) | 2.3.1 | App restart after update (`relaunch()`) | Required companion to updater for restart |
| @tauri-apps/plugin-updater (npm) | 2.10.1 | JS API: `check()`, `downloadAndInstall()` | Front-end bridge to Rust updater |
| @tauri-apps/plugin-process (npm) | 2.3.1 | JS API: `relaunch()` | Front-end bridge to Rust process plugin |
| tauri-apps/tauri-action | @v0 (latest: v0.6.2) | GitHub Action for build + release + latest.json | Official Tauri CI action |

[VERIFIED: npm registry — npm view @tauri-apps/plugin-updater version = 2.10.1]
[VERIFIED: npm registry — npm view @tauri-apps/plugin-process version = 2.3.1]
[VERIFIED: crates.io — tauri-plugin-updater = 2.10.1, tauri-plugin-process = 2.3.1]
[VERIFIED: GitHub API — tauri-action latest tag = action-v0.6.2; floating major tag = v0; no v1 tag exists]

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| swatinem/rust-cache | @v2 (latest: v2.9.1) | Cache Rust build artifacts between CI runs | Every CI job — prevents 15-20 min Rust compile on every push |
| dtolnay/rust-toolchain | @stable | Install specified Rust toolchain + cross-compile targets | Every CI job |
| actions/checkout | @v4 | Checkout repo | Every CI job |
| actions/setup-node | @v4 | Install Node LTS | Every CI job |

[VERIFIED: GitHub API — swatinem/rust-cache latest release = v2.9.1]
[VERIFIED: context7 tauri-docs — official example uses all four of these actions]

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| tauri-action@v0 | Manual `cargo tauri build` steps | tauri-action handles latest.json, release creation, artifact naming; manual approach requires all of this from scratch |
| GitHub Releases latest.json endpoint | Dynamic update server (custom API) | No custom infra needed for this project; GitHub Releases is free and zero-maintenance |
| `passive` Windows installMode | `quiet` | quiet requires admin rights already held; passive shows progress bar and is the default/recommended |

**Version verification:** All versions confirmed against npm registry and crates.io on 2026-04-30.

**Installation (plugins — use tauri add):**
```bash
npm run tauri add updater
npm run tauri add process
```
These commands atomically update `Cargo.toml`, `package.json`, and `src-tauri/capabilities/default.json`. [VERIFIED: tauri-docs official plugin installation pattern]

**Manual installation (if tauri add fails):**
```bash
# Rust
cargo add tauri-plugin-updater --target 'cfg(any(target_os = "macos", windows, target_os = "linux"))'
cargo add tauri-plugin-process
# JS
npm install @tauri-apps/plugin-updater @tauri-apps/plugin-process
```

---

## Architecture Patterns

### System Architecture Diagram

```
git tag push (app-v*)
        │
        ▼
GitHub Actions — release.yml
        │
        ├─── macOS runner (macos-latest)
        │    ├── checkout + setup Node LTS + Rust stable (aarch64-apple-darwin target)
        │    ├── npm ci (NODE_AUTH_TOKEN → @charlyk/admin-client resolves)
        │    ├── import Apple cert → temp keychain
        │    └── tauri-action@v0
        │         ├── npm run build (beforeBuildCommand)
        │         ├── cargo tauri build --target aarch64-apple-darwin --bundles dmg,updater
        │         │    └── xcrun codesign + xcrun notarytool (APPLE_ID/APPLE_PASSWORD/APPLE_TEAM_ID)
        │         └── upload → GitHub Release
        │              ├── SiteCare POS_0.1.0_aarch64.dmg
        │              ├── SiteCare POS_0.1.0_aarch64.app.tar.gz
        │              ├── SiteCare POS_0.1.0_aarch64.app.tar.gz.sig
        │              └── latest.json ─────────────────────────────────┐
        │                                                                │
        └─── Windows runner (windows-latest)                            │
             ├── checkout + setup Node LTS + Rust stable               │
             ├── npm ci (NODE_AUTH_TOKEN → @charlyk/admin-client)      │
             └── tauri-action@v0                                        │
                  ├── npm run build                                     │
                  ├── cargo tauri build --bundles msi,updater          │
                  │    └── (unsigned — no WINDOWS_CERTIFICATE)         │
                  └── upload → GitHub Release                          │
                       ├── SiteCare POS_0.1.0_x64_en-US.msi           │
                       ├── SiteCare POS_0.1.0_x64_en-US.msi.sig       │
                       └── latest.json (merged) ──────────────────────┘
                                                                       │
Installed app (launch)                                                 │
        │                                                              │
        ▼                                                              │
useEffect → check()  ←── fetches ───── GitHub Releases latest.json ◄──┘
        │
        ├── no update: return silently
        └── update found:
             downloadAndInstall() → installer runs in background
             relaunch() → process exits + relaunches with new version
```

### Recommended Project Structure
```
.github/
└── workflows/
    └── release.yml          # Tag-push trigger; macOS arm64 + Windows x64 matrix
src-tauri/
├── tauri.conf.json          # bundle.createUpdaterArtifacts, plugins.updater config
├── Cargo.toml               # + tauri-plugin-updater, tauri-plugin-process
├── capabilities/
│   └── default.json         # + "updater:default", "process:default"
└── src/
    └── lib.rs               # + tauri_plugin_updater::init(), tauri_plugin_process::init()
src/
└── use-updater.js           # New hook: check() on mount, silent downloadAndInstall + relaunch
```

### Pattern 1: tauri.conf.json Updater Configuration
**What:** Enables updater artifact generation and points the app at the GitHub Releases `latest.json`
**When to use:** Required for BILD-04

```json
// src-tauri/tauri.conf.json additions
{
  "bundle": {
    "active": true,
    "targets": ["dmg", "msi", "updater"],
    "createUpdaterArtifacts": true,
    "icon": ["icons/32x32.png", "icons/128x128.png", "icons/128x128@2x.png", "icons/icon.icns", "icons/icon.ico"]
  },
  "plugins": {
    "updater": {
      "pubkey": "YOUR_GENERATED_PUBKEY_HERE",
      "endpoints": [
        "https://github.com/Charlyk/sitecare-pos/releases/latest/download/latest.json"
      ],
      "windows": {
        "installMode": "passive"
      }
    }
  }
}
```

[VERIFIED: tauri-docs — bundle.createUpdaterArtifacts, plugins.updater.endpoints, installMode passive]
[VERIFIED: tauri-docs — GitHub Releases static JSON endpoint URL format]

### Pattern 2: Updater Signer Key Generation
**What:** One-time local command that produces a keypair for signing update artifacts
**When to use:** Run once before first release; store private key as GitHub Secret

```bash
# Run locally; outputs two files: ~/.tauri/sitecare-pos.key and ~/.tauri/sitecare-pos.key.pub
npm run tauri signer generate -- -w ~/.tauri/sitecare-pos.key

# The public key (contents of sitecare-pos.key.pub) goes into tauri.conf.json "pubkey"
# The private key content goes into GitHub Secret: TAURI_SIGNING_PRIVATE_KEY
# The password (if set) goes into GitHub Secret: TAURI_SIGNING_PRIVATE_KEY_PASSWORD
```

[VERIFIED: tauri-docs — signer generate command, env var names TAURI_SIGNING_PRIVATE_KEY]

### Pattern 3: lib.rs Plugin Registration
**What:** Register updater and process plugins in the Tauri builder
**When to use:** Required for Rust-side update execution

```rust
// src-tauri/src/lib.rs additions
use tauri_plugin_updater::UpdaterExt;

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .setup(|app| {
            #[cfg(desktop)]
            app.handle().plugin(tauri_plugin_window_state::Builder::default().build())?;
            Ok(())
        })
        // ... rest of builder
}
```

[VERIFIED: tauri-docs — plugin registration pattern for updater and process]

### Pattern 4: JS Update Hook (silent, launch-only)
**What:** useEffect that checks for updates on mount, downloads and installs silently, then relaunches
**When to use:** BILD-04 / D-05 / D-06 — called once at app launch from app.jsx

```javascript
// src/use-updater.js
import { check } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';

export function useUpdater() {
  // Called once at app mount — D-06: launch-only check
  useEffect(() => {
    // Only runs in Tauri desktop context, not in Vite dev server
    if (!window.__TAURI_INTERNALS__) return;
    
    check()
      .then(async (update) => {
        if (!update) return;
        // D-05: silent install — no user prompt
        await update.downloadAndInstall();
        await relaunch();
      })
      .catch((err) => {
        // Silent failure — do not surface update errors to restaurant staff
        console.warn('[updater] check failed:', err);
      });
  }, []); // empty deps — run once on mount
}
```

[VERIFIED: tauri-docs — check(), downloadAndInstall(), relaunch() API]
[ASSUMED: The `window.__TAURI_INTERNALS__` guard prevents Vite dev server from erroring when @tauri-apps/plugin-updater is called outside Tauri context. Verify exact guard idiom in Tauri v2.]

### Pattern 5: GitHub Actions Workflow (tag trigger, macOS arm64 + Windows x64)
**What:** Complete release workflow triggered on `app-v*` tag push

```yaml
# .github/workflows/release.yml
name: 'Release'

on:
  push:
    tags:
      - 'app-v*'

jobs:
  publish-tauri:
    permissions:
      contents: write
    strategy:
      fail-fast: false
      matrix:
        include:
          - platform: 'macos-latest'
            args: '--target aarch64-apple-darwin'
          - platform: 'windows-latest'
            args: ''

    runs-on: ${{ matrix.platform }}
    steps:
      - uses: actions/checkout@v4

      - name: setup node
        uses: actions/setup-node@v4
        with:
          node-version: lts/*

      - name: install Rust stable
        uses: dtolnay/rust-toolchain@stable
        with:
          targets: ${{ matrix.platform == 'macos-latest' && 'aarch64-apple-darwin' || '' }}

      - name: Rust cache
        uses: swatinem/rust-cache@v2
        with:
          workspaces: './src-tauri -> target'

      # macOS: import certificate into temporary keychain
      - name: import Apple certificate (macOS only)
        if: matrix.platform == 'macos-latest'
        env:
          APPLE_CERTIFICATE: ${{ secrets.APPLE_CERTIFICATE }}
          APPLE_CERTIFICATE_PASSWORD: ${{ secrets.APPLE_CERTIFICATE_PASSWORD }}
          KEYCHAIN_PASSWORD: ${{ secrets.KEYCHAIN_PASSWORD }}
        run: |
          echo $APPLE_CERTIFICATE | base64 --decode > certificate.p12
          security create-keychain -p "$KEYCHAIN_PASSWORD" build.keychain
          security default-keychain -s build.keychain
          security unlock-keychain -p "$KEYCHAIN_PASSWORD" build.keychain
          security set-keychain-settings -t 3600 -u build.keychain
          security import certificate.p12 -k build.keychain \
            -P "$APPLE_CERTIFICATE_PASSWORD" -T /usr/bin/codesign
          security set-key-partition-list \
            -S apple-tool:,apple:,codesign: -s -k "$KEYCHAIN_PASSWORD" build.keychain
          security find-identity -v -p codesigning build.keychain

      - name: get certificate identity (macOS only)
        if: matrix.platform == 'macos-latest'
        run: |
          CERT_INFO=$(security find-identity -v -p codesigning build.keychain \
            | grep "Developer ID Application")
          CERT_ID=$(echo "$CERT_INFO" | awk -F'"' '{print $2}')
          echo "CERT_ID=$CERT_ID" >> $GITHUB_ENV

      # NODE_AUTH_TOKEN enables .npmrc to resolve @charlyk/admin-client
      - name: install frontend dependencies
        env:
          NODE_AUTH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: npm ci

      - uses: tauri-apps/tauri-action@v0
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          # Updater signing
          TAURI_SIGNING_PRIVATE_KEY: ${{ secrets.TAURI_SIGNING_PRIVATE_KEY }}
          TAURI_SIGNING_PRIVATE_KEY_PASSWORD: ${{ secrets.TAURI_SIGNING_PRIVATE_KEY_PASSWORD }}
          # macOS notarization (Apple ID path — simpler than App Store Connect API)
          APPLE_ID: ${{ secrets.APPLE_ID }}
          APPLE_PASSWORD: ${{ secrets.APPLE_PASSWORD }}
          APPLE_TEAM_ID: ${{ secrets.APPLE_TEAM_ID }}
          APPLE_CERTIFICATE: ${{ secrets.APPLE_CERTIFICATE }}
          APPLE_CERTIFICATE_PASSWORD: ${{ secrets.APPLE_CERTIFICATE_PASSWORD }}
          APPLE_SIGNING_IDENTITY: ${{ env.CERT_ID }}
        with:
          tagName: app-v__VERSION__
          releaseName: 'SiteCare POS v__VERSION__'
          releaseBody: 'See the assets to download this version and install.'
          releaseDraft: true
          prerelease: false
          uploadUpdaterJson: true
          updaterJsonPreferNsis: false
          args: ${{ matrix.args }}
```

[VERIFIED: tauri-docs v2 GitHub pipeline — exact workflow structure using tauri-action@v0]
[VERIFIED: tauri-docs macOS signing — APPLE_CERTIFICATE, APPLE_CERTIFICATE_PASSWORD, KEYCHAIN_PASSWORD pattern]
[VERIFIED: tauri-action README — TAURI_SIGNING_PRIVATE_KEY, TAURI_SIGNING_PRIVATE_KEY_PASSWORD env vars]
[VERIFIED: tauri-docs — NODE_AUTH_TOKEN with .npmrc for GitHub Package Registry auth]

### Anti-Patterns to Avoid
- **Using `tauri-apps/tauri-action@v1`:** No v1 tag exists in the tauri-action repository as of 2026-04-30. The README (dev branch) says @v1 but the official Tauri v2 docs and the only existing floating major tag are both `@v0`. Use `@v0`.
- **Setting `bundle.targets: "all"` in tauri.conf.json for CI:** `"all"` includes Linux AppImage/deb which cannot be built on macOS runners. Specify explicit targets per-platform via the `args` field.
- **Universal binary (`--target universal-apple-darwin`) when arm64-only:** Requires both `aarch64-apple-darwin` and `x86_64-apple-darwin` targets installed. Per D-01, use `--target aarch64-apple-darwin` only.
- **Hardcoding a literal PAT in `.npmrc`:** The `.npmrc` in this repo correctly uses `${NODE_AUTH_TOKEN}` interpolation. In CI, set `NODE_AUTH_TOKEN: ${{ secrets.GITHUB_TOKEN }}` — GITHUB_TOKEN has read access to GitHub Package Registry by default.
- **Calling `check()` without Tauri context guard in dev:** `@tauri-apps/plugin-updater` throws if called outside the Tauri webview. Guard with `window.__TAURI_INTERNALS__` check.
- **Omitting `pubkey` from `tauri.conf.json`:** Without a pubkey, the updater plugin will refuse to verify downloads and throw at runtime.
- **Using `uploadUpdaterJson: false`:** The default is `true`. Explicitly set `uploadUpdaterJson: true` to be clear that latest.json upload is expected.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| latest.json generation | Custom script to assemble update manifest | tauri-action `uploadUpdaterJson: true` | Correct platform keys (darwin-aarch64, windows-x86_64), exact .sig inline content, version sync |
| macOS notarization | Manual xcrun notarytool calls in workflow | tauri-action env vars (APPLE_ID/PASSWORD/TEAM_ID) | Tauri CLI handles stapling, retry logic, notarization wait loop |
| Update artifact signing | Custom signing script | `TAURI_SIGNING_PRIVATE_KEY` env var + `createUpdaterArtifacts: true` | Tauri CLI generates .sig files automatically |
| GitHub Release creation | gh CLI script or actions/create-release | tauri-action `tagName`/`releaseName` inputs | tauri-action creates release, uploads all artifacts, and updates it atomically |

**Key insight:** The entire release pipeline is three declarative configs (tauri.conf.json changes + lib.rs plugin registration + workflow YAML). Nothing in this phase requires custom scripts.

---

## Common Pitfalls

### Pitfall 1: tauri-action Version Mismatch (v0 vs v1)
**What goes wrong:** Workflow file references `tauri-apps/tauri-action@v1` which resolves to "not found" or wrong commit.
**Why it happens:** The tauri-action README's dev branch uses @v1 aspirationally, but only the @v0 floating tag actually exists in the repository. The official Tauri v2 documentation correctly uses @v0.
**How to avoid:** Always use `tauri-apps/tauri-action@v0` in the workflow. Verify with `gh api repos/tauri-apps/tauri-action/git/refs/tags/v0`.
**Warning signs:** Workflow step fails with "Unable to resolve action" or downloads wrong version.

### Pitfall 2: pubkey Missing or Stale in tauri.conf.json
**What goes wrong:** Build succeeds but the installed app crashes on update check: "public key does not match" or "no pubkey configured".
**Why it happens:** `tauri signer generate` produces a keypair. The pubkey must be pasted into `plugins.updater.pubkey` in `tauri.conf.json`. If the private key is rotated without updating the pubkey, all previous installs cannot verify new updates.
**How to avoid:** Generate the keypair once, commit the pubkey to tauri.conf.json, store the private key as a GitHub Secret. Never regenerate unless you intend to break update verification for existing installs.
**Warning signs:** `tauri build` warning about missing pubkey; updater throws `InvalidSignature` at runtime.

### Pitfall 3: NODE_AUTH_TOKEN Not Injected for npm ci
**What goes wrong:** CI fails at `npm ci` with `404 Not Found` for `@charlyk/admin-client`.
**Why it happens:** The `.npmrc` uses `${NODE_AUTH_TOKEN}` interpolation. The env var must be present at `npm ci` time. Setting it only in the `tauri-action` step's `env:` block is too late — npm install happens in a separate step.
**How to avoid:** Set `NODE_AUTH_TOKEN: ${{ secrets.GITHUB_TOKEN }}` in the `env:` of the `install frontend dependencies` step.
**Warning signs:** `npm ci` output shows `npm ERR! 404 Not Found - GET https://npm.pkg.github.com/...`.

### Pitfall 4: KEYCHAIN_PASSWORD Secret Not Created
**What goes wrong:** macOS build fails at "import Apple certificate" step with "security: SecKeychainCreate".
**Why it happens:** The certificate import step creates a temporary keychain and needs a password. This is a separate secret from APPLE_CERTIFICATE_PASSWORD.
**How to avoid:** Add `KEYCHAIN_PASSWORD` as a GitHub Secret. The value can be any strong random string (e.g., `openssl rand -hex 32`) since the keychain is ephemeral and only lives for the CI run.
**Warning signs:** `security create-keychain` fails or `security unlock-keychain` fails on macOS runner.

### Pitfall 5: bundle.targets "all" on macOS Runner
**What goes wrong:** macOS CI job attempts to build Linux AppImage and fails with "appimagetool not found".
**Why it happens:** `"targets": "all"` in tauri.conf.json includes all bundle types for the current platform; on macOS this does not include Linux targets, but if "all" is interpreted globally it can create issues.
**How to avoid:** Leave `bundle.targets` in tauri.conf.json as a sensible default but pass explicit `--bundles dmg,updater` (macOS) or `--bundles msi,updater` (Windows) via the `args` field in the workflow matrix. Alternatively, set `"targets": ["dmg", "msi"]` in tauri.conf.json since this project only cares about those two.
**Warning signs:** Unexpected build targets being attempted on a runner that lacks their toolchain.

### Pitfall 6: Update Check Fails Silently Because Endpoint Has Wrong URL
**What goes wrong:** App silently never finds updates even though new releases are published.
**Why it happens:** If the `tagName` in tauri-action uses a prefix (e.g., `app-v__VERSION__`) then `latest.json` is uploaded under that tag's assets. The endpoint URL must point to the correct release. Using `/releases/latest/download/latest.json` works only if every release without exception has a `latest.json` asset — a draft release that is never published breaks this.
**How to avoid:** Use `releaseDraft: true` to create drafts, then manually publish. Or use `releaseDraft: false` if you want fully automated releases. The endpoint `releases/latest/download/latest.json` works for published releases.
**Warning signs:** HTTP 404 at updater check time in production logs.

### Pitfall 7: Calling useUpdater() Before isAuthenticated
**What goes wrong:** The update check fires before auth completes, potentially causing a relaunch that logs the user out of the Tauri secure storage session.
**Why it happens:** `relaunch()` restarts the Tauri process. If called during auth init, the restart loop disrupts the cold-start auth flow.
**How to avoid:** Call `useUpdater()` only in the authenticated branch of `app.jsx` (inside the `isAuthenticated` guard), not at the top of App() before the auth guard.
**Warning signs:** Users report being logged out unexpectedly after installing updates.

---

## Code Examples

Verified patterns from official sources:

### Plugin Registration in lib.rs
```rust
// Source: https://v2.tauri.app/plugin/updater/
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .setup(|app| {
            #[cfg(desktop)]
            app.handle().plugin(tauri_plugin_window_state::Builder::default().build())?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            store_token, get_token, delete_token,
            list_serial_ports, save_printer_config, test_print, print_receipt
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application")
}
```

### Signer Key Generation (one-time)
```bash
# Source: https://v2.tauri.app/plugin/updater/ — signer generate
npm run tauri signer generate -- -w ~/.tauri/sitecare-pos.key
# Outputs:
#   Private key: ~/.tauri/sitecare-pos.key  → GitHub Secret: TAURI_SIGNING_PRIVATE_KEY
#   Public key:  ~/.tauri/sitecare-pos.key.pub → paste into tauri.conf.json "pubkey"
```

### capabilities/default.json Additions
```json
// Source: https://v2.tauri.app/plugin/updater/ — capabilities
{
  "identifier": "default",
  "description": "Capability file generated by the Tauri CLI",
  "windows": ["main"],
  "permissions": [
    "core:default",
    "store:default",
    "window-state:default",
    "opener:default",
    "updater:default",
    "process:default"
  ]
}
```

### Cargo.toml Additions
```toml
# Source: https://v2.tauri.app/plugin/updater/ — manual install
[dependencies]
tauri-plugin-updater = "2"
tauri-plugin-process = "2"
```
Note: `tauri add updater` and `tauri add process` handle this automatically.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Tauri v1 `tauri.conf.json` updater section at root level | Tauri v2 `plugins.updater` section + `bundle.createUpdaterArtifacts` | Tauri v2 release | All Tauri v1 updater docs/examples are wrong for v2 |
| `@tauri-apps/api/updater` (v1 built-in) | `@tauri-apps/plugin-updater` (v2 separate plugin) | Tauri v2 release | Must install plugin separately; v1 API does not exist in v2 |
| tauri-action v0 docs showing `@v5` or higher | tauri-action @v0 only (no v1 tag exists) | Current state | README dev branch says @v1 aspirationally; use @v0 |
| universal-apple-darwin for all Mac users | Targeted `aarch64-apple-darwin` or `x86_64-apple-darwin` | D-01 decision | Faster CI builds; smaller installers |

**Deprecated/outdated:**
- `tauri.conf.json "updater"` at root level: This is the Tauri v1 config. In v2, updater config lives under `plugins.updater`.
- `@tauri-apps/api/updater`: Removed in Tauri v2. The replacement is the separate `@tauri-apps/plugin-updater` package.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `window.__TAURI_INTERNALS__` is the correct guard for detecting Tauri context in v2 | Pattern 4 (useUpdater) | If wrong, dev server would throw on check(); use alternative guard or try/catch |
| A2 | `APPLE_SIGNING_IDENTITY` env var (extracted from keychain) is not required when `APPLE_CERTIFICATE` is set directly in tauri-action env — tauri-action may derive it automatically | Pattern 5 (workflow) | If required, keychain import step must always run before tauri-action step |

---

## Open Questions

1. **Does tauri-action auto-derive APPLE_SIGNING_IDENTITY from APPLE_CERTIFICATE?**
   - What we know: Some tauri-action examples pass APPLE_SIGNING_IDENTITY explicitly after extracting it from the keychain via `security find-identity`. Others omit it.
   - What's unclear: Whether APPLE_SIGNING_IDENTITY is strictly required or derived automatically when APPLE_CERTIFICATE is present.
   - Recommendation: Include the `security find-identity` step and pass APPLE_SIGNING_IDENTITY explicitly to be safe. Cost is two extra workflow steps.

2. **Exact Rust `use` import for tauri_plugin_updater in lib.rs**
   - What we know: The plugin is initialized via `.plugin(tauri_plugin_updater::Builder::new().build())`.
   - What's unclear: Whether `use tauri_plugin_updater::UpdaterExt;` is needed in lib.rs (it is needed when calling `app.updater()?.check()` in Rust, but not when using the JS API exclusively).
   - Recommendation: The D-05/D-06 strategy uses JS-side update logic. The `use` import is not needed in lib.rs unless we later add Rust-side update logic.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | npm ci, Vite build | ✓ | v24.9.0 | — |
| npm | package install | ✓ | 11.6.2 | — |
| cargo / Rust | Tauri build | ✓ | stable | — |
| @tauri-apps/cli (tauri add) | Plugin install commands | ✓ | 2.11.0 | Manual Cargo.toml + npm install |
| Apple Developer account | macOS notarization | [ASSUMED] owner has $99/yr account | — | No distributable macOS DMG |
| Apple p12 certificate | Code signing | [ASSUMED] derived from Apple account | — | Unsigned = Gatekeeper quarantine |
| GitHub Secrets configured | CI workflow auth | Needs setup | — | Workflow fails silently |

**Missing dependencies with no fallback:**
- Apple Developer account + Developer ID Application certificate: Notarization is impossible without this. This is a human prerequisite, not a code task — the planner must document "human must configure Apple credentials before running release workflow."

**Missing dependencies with fallback:**
- GitHub Secrets (APPLE_*, TAURI_SIGNING_*): CI workflow will fail gracefully if secrets are absent; unsigned/unsigned builds still proceed for Windows.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.5 + jsdom |
| Config file | `vitest.config.js` |
| Quick run command | `npx vitest run` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map

Phase 6 is a CI/CD pipeline phase. The artifacts (notarized DMG, unsigned MSI, working auto-update) can only be fully verified end-to-end by actually running the GitHub Actions workflow. However, the structural preconditions that make the workflow succeed can be unit-tested:

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| BILD-01 | Workflow YAML exists at `.github/workflows/release.yml` | smoke (fs) | `npx vitest run src/__tests__/build-pipeline.test.js` | ❌ Wave 0 |
| BILD-01 | `tauri.conf.json` has `bundle.createUpdaterArtifacts: true` | smoke (fs) | same | ❌ Wave 0 |
| BILD-02 | Workflow includes macOS arm64 matrix entry with APPLE_* env vars | smoke (fs/content) | same | ❌ Wave 0 |
| BILD-04 | `plugins.updater.endpoints` array is non-empty in tauri.conf.json | smoke (fs/json) | same | ❌ Wave 0 |
| BILD-04 | `plugins.updater.pubkey` is set (non-empty string) | smoke (fs/json) | same | ❌ Wave 0 |
| BILD-04 | `@tauri-apps/plugin-updater` appears in package.json dependencies | smoke (fs/json) | same | ❌ Wave 0 |
| BILD-04 | `use-updater.js` exports a `useUpdater` function | unit | same | ❌ Wave 0 |
| BILD-04 | capabilities/default.json includes `"updater:default"` permission | smoke (fs/json) | same | ❌ Wave 0 |

**What cannot be automated locally:**
- Actual notarization (requires Apple credentials + network round-trip)
- Actual Windows MSI build (requires Windows runner)
- End-to-end update install cycle (requires two different app versions installed)
- These are verified manually after the first CI run succeeds.

### Manual Verification Checklist (post-CI)
1. Push tag `app-v0.1.0` → CI run completes green for both matrix jobs
2. GitHub Release is created as draft with at least: `.dmg`, `.dmg.sig`, `.msi`, `.msi.sig`, `latest.json`
3. Install `.dmg` on clean macOS 13+ VM → no Gatekeeper warning
4. Install `.msi` on Windows → SmartScreen "More info → Run anyway" appears (expected per D-03)
5. Publish release as `app-v0.1.0`; push tag `app-v0.2.0` → second CI run
6. Install `0.1.0` app; launch it → auto-update to `0.2.0` occurs on launch without user prompt

### Sampling Rate
- **Per task commit:** `npx vitest run` (166 existing tests + new build-pipeline tests)
- **Per wave merge:** `npx vitest run` — full suite
- **Phase gate:** Full suite green + manual CI run verification before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `src/__tests__/build-pipeline.test.js` — covers BILD-01, BILD-02, BILD-04 structural checks
- [ ] No new test infrastructure needed; vitest + @vitest-environment node pattern already established

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | CI auth uses GITHUB_TOKEN (scoped) |
| V3 Session Management | no | No session state in CI pipeline |
| V4 Access Control | yes | GitHub Secrets access scoped to repo; GITHUB_TOKEN has minimum needed permissions (contents: write) |
| V5 Input Validation | no | No user input in pipeline phase |
| V6 Cryptography | yes | Ed25519 keypair for updater signing; never hand-roll — use `tauri signer generate` |

### Known Threat Patterns for CI/CD + Tauri Updater

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Compromised private signing key | Spoofing / Tampering | Store TAURI_SIGNING_PRIVATE_KEY in GitHub Secrets (encrypted at rest); rotate if leaked — all existing installs become unable to verify updates until app is reinstalled |
| Man-in-the-middle update injection | Tampering | Ed25519 signature on every artifact; TLS enforced for endpoints in production mode |
| Unauthorized release creation | Elevation of Privilege | `permissions: contents: write` in workflow — tightly scoped; no other permissions granted |
| APPLE_* credential exfiltration | Disclosure | Stored as GitHub encrypted secrets; never echoed in workflow output |
| Malicious PR modifying workflow | Tampering | Secrets not available to fork PRs by default in GitHub Actions |
| update check on Vite dev server | Availability | Guard useUpdater() with `window.__TAURI_INTERNALS__` check to prevent dev server errors |

---

## Sources

### Primary (HIGH confidence)
- `/tauri-apps/tauri-docs` (Context7) — bundle.createUpdaterArtifacts, plugins.updater config, signer generate, check()/downloadAndInstall()/relaunch() API, capabilities permissions, macOS notarization env vars
- `/tauri-apps/tauri-action` (Context7 + GitHub raw README) — workflow YAML structure, input reference, uploadUpdaterJson, latest.json behavior
- `https://raw.githubusercontent.com/tauri-apps/tauri-docs/v2/src/content/docs/distribute/Pipelines/github.mdx` — official v2 pipeline guide confirming tauri-action@v0
- `https://raw.githubusercontent.com/tauri-apps/tauri-docs/v2/src/content/docs/distribute/Sign/macos.mdx` — macOS signing + notarization env vars (APPLE_ID, APPLE_PASSWORD, APPLE_TEAM_ID)
- `https://raw.githubusercontent.com/tauri-apps/tauri-docs/v2/src/content/docs/plugin/updater.mdx` — updater plugin full reference, installMode, static JSON format

### Secondary (MEDIUM confidence)
- npm registry (`npm view @tauri-apps/plugin-updater version`) — confirmed version 2.10.1
- npm registry (`npm view @tauri-apps/plugin-process version`) — confirmed version 2.3.1
- crates.io API — tauri-plugin-updater 2.10.1, tauri-plugin-process 2.3.1
- GitHub API (`repos/tauri-apps/tauri-action/git/refs/tags`) — confirmed only v0 floating tag exists, no v1 tag

### Tertiary (LOW confidence)
- [ASSUMED] `window.__TAURI_INTERNALS__` as Tauri context guard — needs verification in Tauri v2

---

## Project Constraints (from CLAUDE.md)

All actionable directives from `./CLAUDE.md` that apply to this phase:

1. **@charlyk/admin-client is the ONLY data layer** — CI must install it; use `NODE_AUTH_TOKEN: ${{ secrets.GITHUB_TOKEN }}` with `.npmrc` already committed to repo.
2. **GitHub Package Registry auth** — `.npmrc` has `@charlyk:registry=https://npm.pkg.github.com` and `//npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}`. CI must set `NODE_AUTH_TOKEN` as env var at `npm ci` time.
3. **macOS notarization required** — Apple Developer account ($99/yr) needed. Configure all CI secrets before the first release build. This is a hard distribution block.
4. **window.* globals are forbidden** — `use-updater.js` must use ES module import (`import { check } from '@tauri-apps/plugin-updater'`), not `window.` access.
5. **Cargo.lock committed** — CI must not gitignore Cargo.lock; reproducible builds depend on it.
6. **`tauri add` for plugins** — install updater and process via `npm run tauri add updater` and `npm run tauri add process` to keep npm, Cargo, and capabilities in sync atomically.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all versions verified against npm registry and crates.io on 2026-04-30
- Architecture: HIGH — based on official Tauri v2 docs and tauri-action repository
- Pitfalls: HIGH — tauri-action version discrepancy verified via GitHub API; other pitfalls from official docs
- Workflow YAML: HIGH — verified against live tauri-docs v2 pipeline guide
- macOS notarization: HIGH — verified against tauri-docs macOS signing guide
- Windows MSI unsigned: HIGH — no signing config required; tauri build produces .msi without it

**Research date:** 2026-04-30
**Valid until:** 2026-07-30 (90 days — Tauri plugin versions bump frequently; re-verify before executing if delayed)
