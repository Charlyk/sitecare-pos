---
phase: 06-build-pipeline
plan: 04
subsystem: ci-release-workflow
status: checkpoint
tags: [github-actions, tauri-action, notarization, release-workflow, BILD-01, BILD-02, BILD-03, build-pipeline]

# Dependency graph
requires:
  - phase: 06-build-pipeline
    plan: 02
    provides: tauri-plugin-updater + tauri-plugin-process installed and wired
  - phase: 06-build-pipeline
    plan: 03
    provides: tauri.conf.json with bundle targets, updater pubkey, endpoints

provides:
  - .github/workflows/release.yml: complete GitHub Actions release pipeline
  - BILD-01: CI produces installers on app-v* tag push (macos + windows matrix)
  - BILD-02: macOS arm64 notarization via APPLE_ID/APPLE_PASSWORD/APPLE_TEAM_ID
  - BILD-03: Windows unsigned MSI deferred per D-03 (documented)

affects:
  - First release tag push will trigger the workflow

# Tech tracking
tech-stack:
  added:
    - "tauri-apps/tauri-action@v0 (GitHub Action)"
    - "dtolnay/rust-toolchain@stable (GitHub Action)"
    - "swatinem/rust-cache@v2 (GitHub Action)"
    - "actions/setup-node@v4 (GitHub Action)"
    - "actions/checkout@v4 (GitHub Action)"
  patterns:
    - "Matrix strategy: macos-latest (--target aarch64-apple-darwin) + windows-latest (empty args)"
    - "fail-fast: false — parallel builds; macOS failure does not abort Windows job"
    - "NODE_AUTH_TOKEN on npm ci step (not tauri-action) — Pitfall 3 avoided"
    - "Ephemeral macOS keychain for CI certificate import — KEYCHAIN_PASSWORD secret"
    - "get certificate identity step extracts CERT_ID → APPLE_SIGNING_IDENTITY"
    - "uploadUpdaterJson: true — tauri-action generates and uploads latest.json"
    - "releaseDraft: true — creates draft release for manual review before publish"
    - "tagName: app-v__VERSION__ — matches app-v* trigger pattern"

key-files:
  created:
    - .github/workflows/release.yml
  modified: []

key-decisions:
  - "tauri-apps/tauri-action@v0 not @v1 — no v1 tag exists in tauri-action repo (Pitfall 1)"
  - "NODE_AUTH_TOKEN on install-frontend-dependencies step not tauri-action — Pitfall 3"
  - "APPLE_SIGNING_IDENTITY extracted explicitly via security find-identity — avoids auto-detection ambiguity"
  - "releaseDraft: true — developer manually publishes after reviewing artifacts before making live"
  - "Windows MSI unsigned per D-03 — SmartScreen click-through acceptable; Azure Trusted Signing deferred"
  - "fail-fast: false — both platform builds run independently; partial CI success is useful"

# Metrics
duration: ~5min (Task 1 only; Task 2 pending checkpoint approval)
completed: 2026-05-01
---

# Phase 6 Plan 04: GitHub Actions Release Workflow Summary

**GitHub Actions release workflow created: tag-push triggered, macOS arm64 notarized DMG + unsigned Windows MSI matrix, all 12 build-pipeline tests green**

## Status: CHECKPOINT — Task 2 Pending Human Verification

Task 1 is complete and committed. Task 2 is a `checkpoint:human-verify` that requires the developer to:
1. Review the workflow YAML
2. Confirm GitHub Secrets are configured
3. Optionally push a test tag to validate the CI run end-to-end

## Performance

- **Duration:** ~5 min (Task 1 only)
- **Started:** 2026-05-01
- **Completed (Task 1):** 2026-05-01
- **Tasks:** 1 of 2 (Task 2 is checkpoint:human-verify, pending approval)
- **Files created:** 1

## Accomplishments

- Created `.github/` and `.github/workflows/` directories (new to this repo)
- Created `.github/workflows/release.yml` with 122 lines covering:
  - Tag trigger: `on: push: tags: - 'app-v*'`
  - Matrix strategy: `macos-latest` (arm64) + `windows-latest` (x64 unsigned)
  - `fail-fast: false` — parallel, independent builds
  - `dtolnay/rust-toolchain@stable` + `swatinem/rust-cache@v2` for reproducible builds
  - Apple certificate import (ephemeral keychain) — macOS-only conditional steps
  - `NODE_AUTH_TOKEN` on `npm ci` step for `@charlyk/admin-client` GitHub Package Registry auth
  - `tauri-apps/tauri-action@v0` with all 8 Apple + updater signing secrets
  - `uploadUpdaterJson: true` — auto-generates and uploads `latest.json`
  - `releaseDraft: true` — creates draft for manual review before publish
  - `args: ${{ matrix.args }}` — passes `--target aarch64-apple-darwin` for macOS only
- All 12 `build-pipeline.test.js` tests pass (BILD-01, BILD-02, BILD-04)

## Task Commits

1. **Task 1: Create .github/workflows/release.yml** — `8191e6a` (feat)

## Files Created/Modified

- `.github/workflows/release.yml` — new file; 122 lines; complete release CI workflow

## Verification Results (Automated)

| Check | Command | Expected | Actual | Pass? |
|-------|---------|----------|--------|-------|
| File exists | `ls .github/workflows/release.yml` | exits 0 | exits 0 | YES |
| Non-empty (>50 lines) | `wc -l` | >50 | 122 | YES |
| Uses @v0 not @v1 | `grep -c "tauri-action@v0"` | 1 | 1 | YES |
| @v1 absent | `grep -c "tauri-action@v1"` | 0 | 0 | YES |
| arm64 target (D-01) | `grep -c "aarch64-apple-darwin"` | 2 | 2 | YES |
| APPLE_ID present (D-02) | `grep -c "APPLE_ID"` | >=2 | 2 | YES |
| NODE_AUTH_TOKEN | `grep -c "NODE_AUTH_TOKEN"` | >=2 | 3 | YES |
| Tag trigger | `grep -c "app-v*"` | 1 (in trigger) | present | YES |
| uploadUpdaterJson | `grep -c "uploadUpdaterJson: true"` | 1 | 1 | YES |
| releaseDraft | `grep -c "releaseDraft: true"` | 1 | 1 | YES |
| fail-fast: false | `grep -c "fail-fast: false"` | 1 | 1 | YES |
| macOS-only conditionals | `grep -c "matrix.platform == 'macos-latest'"` | 2 | 3* | YES |

*3 occurrences: `if:` on import-certificate step, `if:` on get-certificate-identity step, and `targets:` ternary expression in Rust toolchain step.

### tauri.conf.json Verification

```
targets: ["dmg","msi"]         ✓
createUpdaterArtifacts: true   ✓
pubkey set: true               ✓
endpoint: https://github.com/Charlyk/sitecare-pos/releases/latest/download/latest.json  ✓
```

### Build-Pipeline Test Suite

```
npx vitest run src/__tests__/build-pipeline.test.js --reporter=verbose

Test Files  1 passed (1)
     Tests  12 passed (12)
  Duration  138ms
```

All 12 build-pipeline tests GREEN.

### Pre-Existing Test Failures (Out of Scope)

The full test suite has 5 failing suites (`accept-dialog`, `app-guard`, `auth`, `auth-schedule`, `screen-login`) caused by missing files that are untracked in the worktree (`brand-logo.jsx`, `use-order-detail.js`, `use-stats.js`, `use-restaurant-settings.js`). These are Phase 4 files not yet merged into this branch — they predate Plan 04 and are NOT caused by this plan's changes.

## Required GitHub Secrets (User Action Needed)

Before the release workflow can run successfully, the following secrets must be configured at:
**github.com/Charlyk/sitecare-pos → Settings → Secrets and variables → Actions**

### From Plan 03 (may already be done):
- [ ] `TAURI_SIGNING_PRIVATE_KEY` — content of `~/.tauri/sitecare-pos.key`
- [ ] `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` — password set during keypair generation

### From Plan 04 (macOS notarization — requires Apple Developer account):
- [ ] `APPLE_CERTIFICATE` — base64-encoded Developer ID Application .p12: `base64 -i certificate.p12 | pbcopy`
- [ ] `APPLE_CERTIFICATE_PASSWORD` — password used when exporting the .p12 from Keychain Access
- [ ] `APPLE_ID` — Apple ID email address (e.g. user@example.com)
- [ ] `APPLE_PASSWORD` — app-specific password from appleid.apple.com (NOT your Apple ID password)
- [ ] `APPLE_TEAM_ID` — 10-character Team ID from developer.apple.com → Membership Details
- [ ] `KEYCHAIN_PASSWORD` — any random string: `openssl rand -hex 32`

## Decisions Made

- `tauri-apps/tauri-action@v0` — only floating major tag that exists in the tauri-action repo; no v1 tag
- `NODE_AUTH_TOKEN` on `npm ci` step — `.npmrc` uses `${NODE_AUTH_TOKEN}` interpolation; must be present at npm install time, not just at tauri-action time
- `APPLE_SIGNING_IDENTITY` extracted explicitly via `security find-identity` — avoids ambiguity if multiple certs exist in keychain
- `releaseDraft: true` — manual publish step before making the release live; gives developer chance to review artifacts
- `fail-fast: false` — if macOS build fails (e.g. notarization timeout), Windows build still completes and uploads its artifacts
- Windows MSI unsigned per D-03 — SmartScreen "More info → Run anyway" on first install; acceptable for personal deployment; Azure Trusted Signing (~$10/month) is the deferred path

## Deviations from Plan

None — plan executed exactly as written. The workflow YAML matches the plan's specified content verbatim.

## Known Stubs

None — the workflow file is complete and production-ready (no placeholder content, no TODO comments, no hardcoded empty values).

## Threat Flags

No new surface beyond what was pre-approved in the plan's threat model (T-06-04-01 through T-06-04-07).

## Self-Check

- [x] `.github/workflows/release.yml` exists: FOUND
- [x] File is 122 lines (>50 required): FOUND
- [x] Commit `8191e6a` exists: confirmed
- [x] All 12 build-pipeline tests pass: confirmed (vitest run output above)
- [x] tauri.conf.json has correct targets, pubkey, endpoints, createUpdaterArtifacts: confirmed

## Self-Check: PASSED
