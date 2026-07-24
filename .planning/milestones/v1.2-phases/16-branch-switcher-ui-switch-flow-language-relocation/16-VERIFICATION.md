---
phase: 16-branch-switcher-ui-switch-flow-language-relocation
verified: 2026-07-23T13:34:57Z
status: human_needed
score: 5/5 must-haves verified (roadmap Success Criteria); 12/12 plan-level truths verified
behavior_unverified: 0
overrides_applied: 0
human_verification:
  - test: "Visual/interaction fidelity of the branch popover, SwitchingOverlay copy layout, truncation/title-attribute overflow handling, and collapsed-sidebar branch-chip identity against 16-UI-SPEC.md"
    expected: "Spacing, color tokens (--sc-primary badge/checkmark/spinner), popover positioning, and ellipsis truncation match the approved spec pixel-for-pixel"
    why_human: "Pixel-level visual review requires a human looking at the running app; automated DOM assertions cover structural/behavioral correctness only (confirmed present in 16-01-SUMMARY.md D5, 16-02-SUMMARY.md's own human_judgment items)"
  - test: "Popover list scroll behavior (overflow-y auto + max-height) with a many-branch tenant"
    expected: "The popover list scrolls internally rather than growing unbounded or clipping rows"
    why_human: "Visual/interaction fidelity of scroll behavior needs a real multi-branch (>4-5 branch) fixture and a human eye; carried forward unchanged from Plan 01, not independently re-tested (16-02-SUMMARY.md D6)"
  - test: "Visual fidelity of the CartDiscardConfirm dialog (spacing, destructive-red primary button, copy layout)"
    expected: "Matches the approved 16-UI-SPEC.md chrome exactly"
    why_human: "Pixel-level visual review requires a human looking at the running app (16-03-SUMMARY.md D7)"
  - test: "Live multi-branch switch against the real SiteCare API: overlay bridges the real SSE reconnect with no false OfflineBanner flash"
    expected: "One continuous overlay from click through success toast on the new branch, no offline flash in between"
    why_human: "Requires a live multi-branch account; SSE reconnect timing cannot be faithfully reproduced in a unit mock without encoding the assumption being tested (16-VALIDATION.md Manual-Only Verifications; 16-03-SUMMARY.md D8)"
  - test: "Single-branch-tenant regression: login → orders → KDS → POS shows no first-paint delay and no switcher affordance"
    expected: "Footer shows a read-only branch label (no chevron); orders paint immediately, matching exact pre-v2.6 behavior"
    why_human: "The enabled:!!client / never-!!branchId first-paint timing guarantee is best confirmed against a real one-branch fixture (16-VALIDATION.md)"
  - test: "D-09 bounded-timeout fallback with a genuinely-down new-branch SSE stream"
    expected: "Overlay releases at the bounded ~6s window, success toast still fires, OfflineBanner takes over honestly (not an error)"
    why_human: "Requires forcing a real dead stream against the live API, hard to reproduce deterministically outside fake-timer unit tests (16-VALIDATION.md; automated bounded-timeout mechanics already proven by app-branch-switch.test.jsx)"
---

# Phase 16: Branch Switcher UI, Switch Flow & Language Relocation Verification Report

**Phase Goal:** Ship the branch-switcher UI, switch-flow state safety, and language-toggle relocation for milestone v1.2 "Branch Switching" — a multi-branch selector in the sidebar footer that fires a non-optimistic branch switch, bridges the SSE reconnect behind a blocking overlay, handles cart-discard/neutral-landing state safety, and removes the RO/EN language pill.
**Verified:** 2026-07-23T13:34:57Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (Roadmap Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Sidebar footer shows a branch selector in the exact slot RO/EN occupied, with current branch name + "default" badge | ✓ VERIFIED | `src/shell.jsx:173-244` — selector rendered in place of the deleted RO/EN block; `t('branch_default_badge')` rendered on trigger (`currentBranch?.isDefault`) and popover row (`branch.isDefault`); `src/__tests__/shell.test.jsx` "SWCH-01" describe block passes |
| 2 | Single-branch tenant renders read-only, no dropdown affordance (pre-v2.6 parity) | ✓ VERIFIED | `canOpenBranchPopover = isMultiBranch \|\| branchesLoading \|\| branchesError` (`shell.jsx:44`) gates ALL interactive rendering — never on `!!currentBranch`; `shell.test.jsx` "SWCH-02 (D-04)" block asserts no popover opens with 1 branch, incl. null-`currentBranch` edge case |
| 3 | Selecting a branch: control inert until `client.me.branches.switch` resolves; branch/data/stream update only on success; rejected switch reverts with only an error notice | ✓ VERIFIED | `use-branches.js` `useBranchSwitch()` — `setCurrentBranch` called ONLY in `onSuccess`; `use-branches.test.js` proves store untouched at `.mutate()` time and untouched on error; `SwitchingOverlay` (sibling of `<Shell>`, `position:absolute;inset:0;zIndex:250`) covers the full viewport (incl. the footer trigger) for the whole pending+bridging window, functionally blocking re-interaction; `app-branch-switch.test.jsx` proves error path leaves `currentBranch` unchanged + single generic toast |
| 4 | Successful switch: confirmation toast, exits open detail view to a neutral screen, discards in-progress POS cart; order-affecting actions stay disabled for the pending duration | ✓ VERIFIED | `app.jsx:261-274` release effect fires toast only on `switchPhase==='done'` (never at mutation-resolve) + `if (screen==='detail'\|\|'history-detail') setScreen('orders')`; `<PosScreen key={currentBranch?.id}>` (`app.jsx:350`) remounts → cart resets; `CartDiscardConfirm` gates a non-empty POS cart before firing switch (D-13); `SwitchingOverlay` covers all screens (incl. Accept/Advance/Cancel/Reprint controls) for the full pending+bridging+bounded-timeout window; all proven by `app-branch-switch.test.jsx`'s cart-gate/neutral-landing/remount/bounded-timeout describe blocks |
| 5 | RO/EN toggle removed from footer; language remains changeable via Settings → Afișaj | ✓ VERIFIED | No `setLang('ro')`/`setLang('en')` call sites remain in `shell.jsx` (grep confirms zero); `screen-settings.jsx:129` still wires `setLang` in the Afișaj language picker; `shell.test.jsx` "LANG-01 (D-15)" negative-assertion block passes |

**Score:** 5/5 roadmap Success Criteria verified (0 present-but-behavior-unverified)

### Plan-Level Must-Haves (supplementary detail)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 6 | `branchSwitcherForceOpen` exists as session-only store field + setter, excluded from `partialize`, zero call sites setting it true this phase | ✓ VERIFIED | `store.js:72,121` field + setter present; `partialize` block (`store.js:127-134`) lists only 6 unrelated persisted keys; `grep -rn "setBranchSwitcherForceOpen("` outside its own definition returns 0 hits |
| 7 | Bridging watcher: overlay released only after `isConnected` false→true transition, or a bounded ~6000ms timeout, whichever first | ✓ VERIFIED | `app.jsx:213,245-255` — `setTimeout(...,6000)` + effect gated on `switchPhase==='bridging'` tracking a drop-then-recover; `app-branch-switch.test.jsx` drives both the reconnect-releases and the bounded-timeout-releases paths with fake timers, and proves no double toast on a later reconnect |
| 8 | Failure toast copy is static, no interpolation | ✓ VERIFIED | `i18n.jsx:214-215/474-475` `branch_switch_error_title`/`branch_switch_error_detail` are plain strings; `app.jsx:221-226` uses them with no template interpolation |
| 9 | Every branch-name render truncates with ellipsis + title attribute | ✓ VERIFIED | `shell.jsx:200,209,221,225,237` — trigger, collapsed chip, and popover rows all carry `title=`/`aria-label=` + `textOverflow:'ellipsis'` |
| 10 | Cart-discard confirm gated strictly on `screen==='pos' && cart non-empty`; cancel leaves branch unchanged; empty cart/non-POS switches immediately | ✓ VERIFIED | `app.jsx:234-240` `handleSelectBranch` gate; `app-branch-switch.test.jsx` "cart-discard confirm gate" describe block covers populated/cancel/empty cases |
| 11 | POS cart resets via `key={currentBranch?.id}` remount; `posCartEmpty` resyncs to true post-remount | ✓ VERIFIED | `app.jsx:350`; `app-branch-switch.test.jsx` "POS remount on switch success" test asserts a mount-counter increments and a subsequent switch attempt proceeds with no confirm (proving resync) |
| 12 | Neutral-landing: successful switch from `detail`/`history-detail` exits to `orders`; `orders` screen itself untouched | ✓ VERIFIED | `app.jsx:271`; three dedicated tests cover detail, history-detail, and the orders-untouched negative case |

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/use-branches.js` | `useBranchSwitch()` non-optimistic mutation added, `useBranches()` untouched | ✓ VERIFIED | Both exports present; `enabled: !!client` line unchanged (grep-confirmed) |
| `src/store.js` | `branchSwitcherForceOpen` field + setter, session-only | ✓ VERIFIED | Present, excluded from `partialize` |
| `src/i18n.jsx` | 13 new bilingual copywriting-contract keys | ✓ VERIFIED | All 13 keys present in both `ro` and `en` blocks (grep-confirmed) |
| `src/shell.jsx` | RO/EN pill deleted; branch selector in its slot | ✓ VERIFIED | No `setLang` call sites; full selector (trigger + popover + collapsed chip + badge + backstops) present |
| `src/app.jsx` | `switchPhase` machine, `SwitchingOverlay`, cart gate, neutral landing, remount key | ✓ VERIFIED | All present and wired (see truths 3, 4, 6-12 above) |
| `src/screen-pos.jsx` | `onCartEmptyChange` callback wired to a `useEffect([cart, onCartEmptyChange])` | ✓ VERIFIED | `screen-pos.jsx:62-64` |
| `src/__tests__/use-branches.test.js` | `useBranchSwitch` describe block | ✓ VERIFIED | Present, passes (part of 44/44 phase-scoped tests) |
| `src/__tests__/shell.test.jsx` | SWCH-01/02/LANG-01/D-03/E3 describe blocks | ✓ VERIFIED | Present, passes |
| `src/__tests__/app-branch-switch.test.jsx` | Tracer + cart-gate + neutral-landing + remount + bounded-timeout describe blocks | ✓ VERIFIED | Present, passes |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|----|--------|---------|
| Shell branch-row click | `app.jsx handleSelectBranch` | `onSelectBranch` prop | ✓ WIRED | `shell.jsx:201` → `app.jsx:346` |
| `handleSelectBranch` | `fireSwitch`/`CartDiscardConfirm` | D-13 cart gate | ✓ WIRED | `app.jsx:234-240` |
| `useBranchSwitch` `onSuccess` | `setCurrentBranch` | non-optimistic write | ✓ WIRED | `use-branches.js:42-46` |
| `currentBranch?.id` change | Phase-14 cache re-scope + Phase-15 SSE reconnect | automatic (no code touched this phase) | ✓ WIRED | Confirmed by existing Phase 14/15 tests still passing; `app-branch-switch.test.jsx`'s bridging-watcher tests exercise the `isConnected` signal this phase consumes |
| `switchPhase==='bridging'` + `isConnected` transition | overlay release + success toast | bridging watcher + release effect | ✓ WIRED | `app.jsx:245-274`; proven by fake-timer tests |
| `SwitchingOverlay` | full-viewport block | sibling of `<Shell>`, `position:absolute;inset:0;zIndex:250` | ✓ WIRED | `app.jsx:340-377` — overlay renders after Shell in the outer positioned wrapper, so it sits in the top stacking layer over Shell's entire subtree (structural/CSS-level verification; browser pointer-event blocking not independently exercisable in jsdom — see Human Verification) |
| `PosScreen` cart | `app.jsx posCartEmpty` | `onCartEmptyChange` callback | ✓ WIRED | `screen-pos.jsx:62-64` → `app.jsx:350` |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|---------------------|--------|
| `shell.jsx` branch trigger/popover | `branches`, `currentBranch` | `useBranches()` → `client.me.branches.list()` (real SDK call, Phase 13); `currentBranch` from store, set by `getMe()` at launch and by `useBranchSwitch` `onSuccess` (real SDK call `client.me.branches.switch`) | Yes | ✓ FLOWING |

### Behavioral Spot-Checks / Full Suite Run

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Phase-scoped unit/integration suite | `npx vitest run src/__tests__/use-branches.test.js src/__tests__/shell.test.jsx src/__tests__/app-branch-switch.test.jsx` | 3 files, 44/44 tests pass | ✓ PASS |
| Full workspace suite (run once) | `npx vitest run` | 37/38 files pass, 574/575 tests pass | ✓ PASS (see Anti-Patterns note below for the 1 pre-existing failure) |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|--------------|--------|----------|
| SWCH-01 | 16-01, 16-02 | Persistent branch selector in sidebar footer slot, name + default badge | ✓ SATISFIED | `shell.jsx` selector + badge; `shell.test.jsx` SWCH-01 block |
| SWCH-02 | 16-02 | Single-branch tenant renders read-only | ✓ SATISFIED | `canOpenBranchPopover` gate; `shell.test.jsx` SWCH-02 block |
| SWCH-03 | 16-01 | `client.me.branches.switch` call; disabled while pending; non-optimistic update | ✓ SATISFIED | `useBranchSwitch()`; overlay full-screen block; `use-branches.test.js` non-optimistic proof |
| SWCH-04 | 16-01 | Success confirmation toast | ✓ SATISFIED | Release effect toast, `app-branch-switch.test.jsx` |
| SCOPE-03 | 16-03 | Cart reset + detail-view exit on switch | ✓ SATISFIED | `key={currentBranch?.id}` remount + D-14 neutral landing; `app-branch-switch.test.jsx` |
| SCOPE-04 | 16-01, 16-03 | Order mutations blocked while switch pending (incl. bounded timeout) | ✓ SATISFIED | `SwitchingOverlay` full-viewport coverage for pending+bridging+timeout window; bounded-timeout-completeness test |
| LANG-01 | 16-01, 16-02 | RO/EN pill removed; Settings → Afișaj retains language control | ✓ SATISFIED | No `setLang` in `shell.jsx`; `screen-settings.jsx:129` retains control; `shell.test.jsx` LANG-01 negative assertion |

**Orphaned requirements:** None. The union of `requirements:` across 16-01/16-02/16-03 PLAN frontmatter (`SWCH-01, SWCH-02, SWCH-03, SWCH-04, SCOPE-03, SCOPE-04, LANG-01`) exactly matches REQUIREMENTS.md's Phase 16 traceability row and the phase-directive's stated requirement IDs. All 7 are marked `[x]` complete in REQUIREMENTS.md.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| — | — | No TBD/FIXME/XXX/TODO/HACK/placeholder-stub markers found in any of the 6 files this phase modified (`use-branches.js`, `store.js`, `i18n.jsx`, `shell.jsx`, `app.jsx`, `screen-pos.jsx`) | — | None — all `placeholder=` hits are legitimate HTML input placeholders, unrelated to this phase's scope |
| `src/__tests__/build-pipeline.test.js` | 101 | `BILD-04 — bundle.createUpdaterArtifacts is true` fails (`v1Compatible` vs expected `true`) | ℹ️ Info | Pre-existing, unrelated to Phase 16 — confirmed via `git stash` in 16-01-SUMMARY.md and reproduced independently in this verification's full-suite run (574/575). Not attributed to this phase per the phase directive. |
| `.planning/phases/16.../16-VALIDATION.md` | — | Still shows `status: draft`, all Per-Task Verification Map rows `TBD`/`⬜ pending`, `Approval: pending` | ℹ️ Info | This scaffold document was never updated post-execution to reflect the concrete task/plan/wave values or mark rows green — a documentation-hygiene gap, not a functional gap. All the automated verifications it lists as pending are independently confirmed passing by this report's own test runs and by each SUMMARY.md's `coverage:` section. Does not block phase goal achievement. |

### Human Verification Required

See frontmatter `human_verification` list — 6 items, all either (a) pixel-level visual fidelity checks against 16-UI-SPEC.md that automated DOM assertions cannot judge, or (b) live-API/real-SSE-stream behaviors that 16-VALIDATION.md itself designates Manual-Only (requiring a real multi-branch SiteCare account). None of these represent missing or unwired code — the underlying mechanisms (overlay bridging, bounded timeout, single-branch first-paint gate) are all proven at the unit/integration level with fake timers and mocked SDK calls; only the live-network and pixel-fidelity dimensions remain unverified by design.

### Gaps Summary

No gaps found. All 5 roadmap Success Criteria and all 7 phase requirement IDs (SWCH-01/02/03/04, SCOPE-03/04, LANG-01) are backed by code that exists, is substantive, is wired end-to-end, and is exercised by 44 passing phase-scoped automated tests (plus a clean 574/575 full-suite run, the 1 failure being a pre-existing, phase-16-unrelated updater-config issue). The only open items are the 6 human-verification checks above, which this phase's own executors already flagged as human-judgment/manual-only in their SUMMARY.md coverage sections — they are routed here for the developer's end-of-phase sign-off, not because any artifact is missing.

---

*Verified: 2026-07-23T13:34:57Z*
*Verifier: Claude (gsd-verifier)*
