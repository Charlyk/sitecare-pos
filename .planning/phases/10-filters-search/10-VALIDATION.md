---
phase: 10
slug: filters-search
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-07-17
---

# Phase 10 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Seed skeleton — see `10-RESEARCH.md` § Validation Architecture for the source-of-truth
> test seams (diacritic-folding helper, status/type/search predicates, D-01/D-02 faceted counts,
> F-02 dine-in↔`local` regression). Refined by `/gsd-validate-phase`.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | {vitest / jest — confirm against package.json at plan time} |
| **Config file** | {path or "none — Wave 0 installs"} |
| **Quick run command** | `{quick command}` |
| **Full suite command** | `{full command}` |
| **Estimated runtime** | ~{N} seconds |

---

## Sampling Rate

- **After every task commit:** Run `{quick run command}`
- **After every plan wave:** Run `{full suite command}`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** {N} seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| {N}-01-01 | 01 | 1 | REQ-{XX} | T-{N}-01 / — | {expected secure behavior or "N/A"} | unit | `{command}` | ✅ / ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/history-utils.test.js` (or existing history-utils test file) — pure-unit stubs for the diacritic-folding helper (HIST-09/D-11), status predicate (`deriveDisplayStatus`-based, HIST-07), and type predicate (HIST-08/D-08)
- [ ] F-02 regression: a dine-in filter matches `orderType: 'local'` orders after the `normalizeOrder` boundary fix (D-08)
- [ ] ș/ț dual-encoding cases (comma-below U+0219/U+021B and cedilla U+015F/U+0163) for the folding helper (RESEARCH Pitfall 2)

*Confirm framework + existing test infra during planning; history-utils.js already has an established pure-unit-test pattern.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Two-row filter-bar wrap renders as designed at 1440×900 | HIST-07/08/D-07 | Visual/layout fidelity against `screenshots/desktop-history.png` | Open History at the default window size; confirm the three pill groups sit on row 1 and search + Export wrap to a right-aligned row 2 |
| 250ms debounce feels responsive; clear is immediate | HIST-09/D-10 | Perceptual timing | Type a burst; confirm one filter pass after ~250ms idle; clearing the box applies at once |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < {N}s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
