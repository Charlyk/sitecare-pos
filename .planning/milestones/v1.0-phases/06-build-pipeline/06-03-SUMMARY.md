---
plan: 06-03
phase: 06-build-pipeline
status: complete
completed: 2026-05-01
requirements:
  - BILD-04
  - BILD-03
---

## Summary

Configured `src-tauri/tauri.conf.json` with the full updater stack: Ed25519 public key, GitHub Releases endpoint, explicit bundle targets, and Windows passive install mode. Developer generated the Ed25519 signing keypair and added the two required GitHub Secrets.

## What Was Built

### tauri.conf.json changes

| Field | Before | After |
|-------|--------|-------|
| `bundle.targets` | `"all"` | `["dmg", "msi"]` |
| `bundle.createUpdaterArtifacts` | absent | `true` |
| `plugins.updater.pubkey` | absent | Ed25519 public key (152 chars) |
| `plugins.updater.endpoints[0]` | absent | `https://github.com/Charlyk/sitecare-pos/releases/latest/download/latest.json` |
| `plugins.updater.windows.installMode` | absent | `"passive"` |

### Keypair generated

Developer ran `npm run tauri signer generate -- -w ~/.tauri/sitecare-pos.key`.

GitHub Secrets added:
- `TAURI_SIGNING_PRIVATE_KEY` — private key for signing update artifacts
- `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` — password set during generation

### BILD-03 deferral (per D-03)

Windows code signing is intentionally absent. The Windows `.msi` is unsigned — SmartScreen shows "More info → Run anyway" on first install. This is acceptable for personal installs. Azure Trusted Signing (~$10/month, no hardware token required) is the deferred candidate when client volume makes manual installs impractical.

## Test Results

```
BILD-04 config tests: 4/4 PASS
BILD-04 module export: 1/1 PASS
BILD-01 + BILD-02 workflow tests: 7/7 FAIL (expected — release.yml not yet created)
```

## key-files

### created
- (none — tauri.conf.json modified in place)

### modified
- `src-tauri/tauri.conf.json` — updater pubkey, endpoints, bundle targets, createUpdaterArtifacts

## Decisions

- `bundle.targets: ["dmg", "msi"]` — explicit array prevents macOS runner from attempting Linux AppImage builds (Pitfall 5)
- `windows.installMode: "passive"` — shows progress bar, no admin rights required, recommended default
- Pubkey embedded in binary at build time — rotating requires a new release; all prior installs keep old pubkey

## Self-Check: PASSED
