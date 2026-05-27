# Phase 6: Build Pipeline - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-30
**Phase:** 6-Build-Pipeline
**Areas discussed:** macOS build target, Windows code signing, Update server, Update UX

---

## macOS Build Target

| Option | Description | Selected |
|--------|-------------|----------|
| Universal binary | Single .dmg covers arm64 + x86_64; CI cross-compiles; ~2x artifact size | |
| arm64 only | Apple Silicon only; simpler CI; smaller artifact | ✓ |

**User's choice:** arm64 only

---

| Option | Description | Selected |
|--------|-------------|----------|
| macOS 13 Ventura+ | Matches BILD-02 spec; most restaurant Macs will be on this or newer | ✓ |
| macOS 12 Monterey+ | One step back; broader but harder to maintain | |
| macOS 10.13+ | Maximum compatibility; unrealistic for restaurant hardware | |

**User's choice:** macOS 13 Ventura+

---

## Windows Code Signing

| Option | Description | Selected |
|--------|-------------|----------|
| EV Certificate | ~$300-500/yr + hardware token; eliminates SmartScreen immediately | |
| Azure Trusted Signing | ~$10/month; no hardware token; reputation-based SmartScreen removal | |
| OV Certificate | ~$100-300/yr; reputation-based; stored as PFX in GitHub Secrets | |
| Skip signing for now | Unsigned .msi; one-time SmartScreen click-through for manual installs | ✓ |

**User's choice:** Skip signing for now
**Notes:** User installs the app personally on all restaurant machines. Will revisit signing when client volume makes manual installs impractical. Prefers Azure Trusted Signing when that time comes (no hardware token, CI-friendly).

---

## Update Server

| Option | Description | Selected |
|--------|-------------|----------|
| GitHub Releases | tauri-plugin-updater native support; tauri-action auto-generates update JSON; free | ✓ |
| Custom S3/CDN endpoint | More control over rollout; requires infrastructure; overkill for small install base | |

**User's choice:** GitHub Releases

---

## Update UX

| Option | Description | Selected |
|--------|-------------|----------|
| Silent install on next launch | Downloads in background; applies on restart; no user prompt; matches BILD-04 | ✓ |
| Prompt before installing | Shows toast/dialog; transparent but risk of deferred updates | |

**User's choice:** Silent install on next launch

---

| Option | Description | Selected |
|--------|-------------|----------|
| Launch only | Check once on startup; zero impact on running shift | ✓ |
| Launch + periodic (every 4 hours) | Catches updates during long shift; download could start mid-service | |

**User's choice:** Launch only

---

## Claude's Discretion

- GitHub Actions workflow structure (matrix strategy, runner versions, job names)
- Updater private key generation and storage as GitHub Secret
- Cargo.toml version bump strategy for releases

## Deferred Ideas

- **Windows code signing** — deferred; unsigned for now; Azure Trusted Signing when client volume grows
- **Universal macOS binary** — deferred; arm64 only for now
- **Periodic update checks** — deferred; launch-only is sufficient
- **Linux build** — out of scope (PROJECT.md)
