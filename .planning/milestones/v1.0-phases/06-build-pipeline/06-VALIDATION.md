---
phase: 6
slug: build-pipeline
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-30
---

# Phase 6 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.5 + jsdom |
| **Config file** | `vitest.config.js` |
| **Quick run command** | `npx vitest run` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd-verify-work`:** Full suite green + manual CI run verified
- **Max feedback latency:** ~15 seconds (automated); CI run ~10 min (manual)

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 6-01-01 | 01 | 0 | BILD-01,02,04 | — | N/A | smoke | `npx vitest run src/__tests__/build-pipeline.test.js` | ❌ W0 | ⬜ pending |
| 6-02-01 | 02 | 1 | BILD-04 | — | Updater uses signed pubkey | smoke | `npx vitest run src/__tests__/build-pipeline.test.js` | ❌ W0 | ⬜ pending |
| 6-02-02 | 02 | 1 | BILD-04 | — | Guard prevents crash in dev | unit | `npx vitest run src/__tests__/build-pipeline.test.js` | ❌ W0 | ⬜ pending |
| 6-03-01 | 03 | 1 | BILD-01 | — | N/A | smoke | `npx vitest run src/__tests__/build-pipeline.test.js` | ❌ W0 | ⬜ pending |
| 6-04-01 | 04 | 2 | BILD-02 | — | Notarization secrets present in workflow | smoke | `npx vitest run src/__tests__/build-pipeline.test.js` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/__tests__/build-pipeline.test.js` — structural smoke tests for BILD-01, BILD-02, BILD-04:
  - `.github/workflows/release.yml` exists
  - `tauri.conf.json` has `bundle.createUpdaterArtifacts: true`
  - `plugins.updater.endpoints` array is non-empty
  - `plugins.updater.pubkey` is a non-empty string
  - `@tauri-apps/plugin-updater` in package.json dependencies
  - `use-updater.js` exports `useUpdater` function
  - `capabilities/default.json` includes `"updater:default"` permission
  - macOS matrix entry exists in release workflow

*Existing vitest + `@vitest-environment node` pattern already established in Phase 3.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| macOS .dmg opens without Gatekeeper warning | BILD-02 | Requires Apple notarization round-trip with real credentials | Install .dmg on clean macOS 13+ VM; confirm no security dialog |
| Windows .msi runs with SmartScreen click-through | BILD-03 | Requires Windows runner + SmartScreen behavior | Install .msi on Windows; confirm "More info → Run anyway" path works |
| Auto-update installs on next launch | BILD-04 | Requires two deployed versions on GitHub Releases | Install v0.1.0; push v0.2.0 tag; relaunch app; confirm updated |
| CI run produces .dmg, .msi, .sig files, latest.json | BILD-01 | Requires actual GitHub Actions runner | Push `app-v0.1.0` tag; verify release assets |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s (automated portion)
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
