---
phase: 06-build-pipeline
plan: 01
subsystem: testing
tags: [vitest, tauri, ci, nyquist, tdd, build-pipeline]

# Dependency graph
requires:
  - phase: 05-native-integration
    provides: 166 passing tests baseline, vitest infrastructure, foundation.test.js node-environment pattern
provides:
  - 12 failing RED-state tests covering BILD-01 (CI workflow), BILD-02 (macOS arm64), BILD-04 (updater config + hook)
  - Nyquist gate ensuring Waves 1 and 2 produce real implementations, not placeholders
affects:
  - 06-02-PLAN (must turn BILD-01 and BILD-02 tests green by creating release.yml)
  - 06-03-PLAN (must turn BILD-04 tauri.conf.json tests green)
  - 06-04-PLAN (must turn BILD-04 use-updater.js test green)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - node-environment vitest test for filesystem + YAML content checks
    - vi.mock hoisting before dynamic imports for Tauri plugin stubs
    - beforeAll + fs.existsSync guard for missing-file tolerance in structural tests

key-files:
  created:
    - src/__tests__/build-pipeline.test.js
  modified: []

key-decisions:
  - "Wave 0 plan creates only failing tests (RED state) — no production code produced; this is the Nyquist gate for Phase 6"
  - "BILD-01 file-existence tests use fs.statSync (not just existsSync) to assert non-empty file, catching accidental empty stubs"
  - "BILD-01/02 structure tests use beforeAll with existsSync guard so content tests produce clear 'expected true, got false' not a crash when workflow file missing"
  - "Full test suite went from 166 (plan estimate) to 306 passing — Phase 5 tests added since plan was written; no regressions introduced"

patterns-established:
  - "Node-environment directive pattern: // @vitest-environment node on line 1 for all FS-based structural tests"
  - "vi.mock hoisting order: declare all vi.mock() calls before any dynamic import() in the same file"
  - "Structural beforeAll guard: if (fs.existsSync(path)) { content = readFileSync(...) } else { content = '' } — allows content tests to fail clearly rather than crash on missing file"

requirements-completed:
  - BILD-01
  - BILD-02
  - BILD-04

# Metrics
duration: 8min
completed: 2026-04-30
---

# Phase 6 Plan 01: Build Pipeline RED Gate Summary

**12 failing vitest stubs covering BILD-01/02/04 (CI workflow, macOS arm64 matrix, tauri.conf.json updater config, use-updater.js hook) in node-environment test file — Nyquist gate for Phase 6 Waves 1 and 2**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-04-30T23:14:00Z
- **Completed:** 2026-04-30T23:22:00Z
- **Tasks:** 1 of 1
- **Files modified:** 1

## Accomplishments

- Created `src/__tests__/build-pipeline.test.js` with exactly 12 failing test stubs across 5 describe blocks
- All structural requirements met: `// @vitest-environment node` on line 1, vi.mock declarations for both Tauri plugins before dynamic imports, correct describe block structure
- Zero regressions — 306 pre-existing tests continue to pass (plan estimated 166; Phase 5 added more tests since plan was authored)
- Clear RED-state failures: BILD-01 file tests fail because `.github/workflows/release.yml` doesn't exist; BILD-04 tauri.conf tests fail because `createUpdaterArtifacts`/`plugins.updater` not in `tauri.conf.json`; BILD-04 module test fails because `src/use-updater.js` doesn't exist yet

## Task Commits

1. **Task 1: Create build-pipeline.test.js with 12 failing stubs** - `7d00bcd` (test)

**Plan metadata:** _(committed at end of this plan — see SUMMARY commit)_

## Files Created/Modified

- `src/__tests__/build-pipeline.test.js` — 128-line vitest node-environment file with 5 describe blocks and 12 individual test() calls; all fail in RED state; mocks @tauri-apps/plugin-updater, @tauri-apps/plugin-process, @tauri-apps/plugin-store, @tauri-apps/api/core

## Decisions Made

- Wave 0 is test-only: no production code written. This is intentional — the Nyquist gate requires tests to exist and fail before implementations ship.
- BILD-01/02 content tests use `beforeAll` with `existsSync` guard rather than `let content = fs.readFileSync(...)` directly, so the test runner shows clean assertion failures ("expected '' to contain '...'") rather than file-not-found exceptions when the workflow file is absent.

## Deviations from Plan

None — plan executed exactly as written. The test count discrepancy (306 vs. 166 pre-existing) is expected: Phase 5 tests were committed after the plan was authored; no regressions exist.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Wave 1 starts with Plan 02 (create `.github/workflows/release.yml`) which must turn 5 BILD-01/02 tests green
- Wave 2 continues with Plan 03 (tauri.conf.json updater config, Cargo.toml, lib.rs) which must turn 4 BILD-04 config tests green
- Wave 2 Plan 04 (create `src/use-updater.js`) must turn the final BILD-04 module export test green
- macOS notarization secrets (APPLE_ID, APPLE_TEAM_ID, APPLE_PASSWORD, TAURI_SIGNING_PRIVATE_KEY) must be configured in GitHub before any real release tag is pushed

## Known Stubs

None — this plan creates test stubs intentionally (RED gate); the stubs listed are in the test file itself, not in production code. No production code was written in this plan.

## Threat Flags

None — test file reads `tauri.conf.json` and `release.yml` read-only; no new network surface, no auth paths, no schema changes.

## Self-Check

- [x] `src/__tests__/build-pipeline.test.js` exists: confirmed
- [x] Commit `7d00bcd` exists: confirmed
- [x] 12 tests fail, 306 pass: confirmed via `npx vitest run`
- [x] `// @vitest-environment node` on line 1: confirmed
- [x] 5 describe blocks: confirmed (`grep -c "^describe("` = 5)
- [x] 12 test() calls: confirmed (`grep -c "^  test("` = 12)

## Self-Check: PASSED

---
*Phase: 06-build-pipeline*
*Completed: 2026-04-30*
