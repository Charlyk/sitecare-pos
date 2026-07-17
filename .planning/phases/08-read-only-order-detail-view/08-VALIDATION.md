---
phase: 8
slug: read-only-order-detail-view
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: validated
nyquist_compliant: true
wave_0_complete: true
created: 2026-07-17
---

# Phase 8 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.5 + `@testing-library/react` (both installed; confirmed via `npx vitest --version`) |
| **Config file** | `vitest.config.js` — `environment: 'jsdom'`, `globals: true`, `setupFiles: ['./src/__tests__/setup.js']` |
| **Quick run command** | `npx vitest run src/__tests__/screen-detail.test.jsx src/__tests__/history-utils.test.js src/__tests__/app-history-route.test.jsx` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~4s quick · ~25s full suite |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run src/__tests__/screen-detail.test.jsx src/__tests__/history-utils.test.js src/__tests__/app-history-route.test.jsx`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd-verify-work`:** Full suite must be green **except** the two pre-existing failures
  logged in `deferred-items.md` (`build-pipeline.test.js:101`, `offline-buttons.test.jsx`). Both predate
  Phase 8 and are outside it; neither touches history or order-detail code. Current baseline:
  **3 failed / 311 passed**. Any *fourth* failure is a Phase 8 regression and blocks.
- **Max feedback latency:** 25 seconds

No watch-mode flags are used anywhere — every command above is a one-shot `vitest run`.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 8-01-01 | 01 | 1 | HIST-10 | T-08-04 | Documents stop promising a staff-attribution field, removing the pressure to synthesize it from `events[].actor` | doc assertion | `awk '/^### Phase 8:/,/^### Phase 9:/' .planning/ROADMAP.md \| grep -c 'handled-by'` → 0 | ✅ | ✅ green |
| 8-01-02 | 01 | 1 | HIST-10 | — | N/A | unit | `npx vitest run src/__tests__/i18n.test.js` | ✅ | ✅ green |
| 8-02-01 | 02 | 1 | HIST-10 | T-08-04 / T-08-05 / T-08-06 | `deriveDuration` reads only `toStatus`/`createdAt`, never `actor`; selects by max `createdAt` (not first match); returns `null` rather than throwing or emitting NaN/negative minutes | unit | `npx vitest run src/__tests__/history-utils.test.js` | ✅ | ✅ green |
| 8-02-02 | 02 | 1 | HIST-10 | — | N/A — export-visibility change only | unit | `npx vitest run src/__tests__/screen-history.test.jsx` | ✅ | ✅ green |
| 8-03-01 | 03 | 2 | HIST-10 | T-08-04 | Duration row consumes only `deriveDuration`'s `{ kind, minutes }`; no `events[]` field read directly in the presenter | unit | `npx vitest run src/__tests__/screen-detail.test.jsx -t "duration row"` | ✅ | ✅ green (7 tests) |
| 8-03-02 | 03 | 2 | HIST-10 | T-08-07 / T-08-08 | Refunded/canceled orders render their true chip; a null derived status degrades to `stateMeta` rather than falsely claiming Completed | unit | `npx vitest run src/__tests__/screen-detail.test.jsx -t "readOnly mode"` | ✅ | ✅ green (11 tests) |
| 8-04-01 | 04 | 3 | HIST-10 | T-08-02 / T-08-10 / T-08-11 | Fixed i18n error copy only (no raw SDK string); the empty claim is unreachable while loading or errored; the totals block survives every state | unit | `npx vitest run src/__tests__/screen-detail.test.jsx -t "items-card"` | ✅ | ✅ green (10 tests) |
| 8-04-02 | 04 | 3 | HIST-10 | **T-08-01 (high)** / T-08-09 | No mutating control reachable under `readOnly` with hydrated items; gate is DOM removal, not `disabled`; standing allowlist test over every `button` in the file | unit | `npx vitest run src/__tests__/screen-detail.test.jsx -t "mutating-control gate"` | ✅ | ✅ green (6 tests) |
| 8-05-01 | 05 | 4 | HIST-10 | T-08-12 / T-08-03 | Hook placed above `App()`'s conditional returns (no hook-count throw at sign-in/out); shared cache key accepted per D-02 | unit | `npx vitest run src/__tests__/app-guard.test.jsx src/__tests__/app-history-route.test.jsx` | ✅ | ✅ green |
| 8-05-02 | 05 | 4 | HIST-10 | T-08-10 | Loading/error wired through so a silent failure cannot render as a complete receipt | unit/integration | `npx vitest run src/__tests__/app-history-route.test.jsx` | ✅ | ✅ green |

**Filter-selectivity note (2026-07-17 audit).** Three commands above were corrected because the
originals did not exercise the behavior their own Secure Behavior column names — a live sampling gap,
since each passed green while skipping the tests that carry the threat:

- **8-03-02** ran `-t "status"`, matching **1 of 11** `readOnly mode` tests. The refunded (`:226`),
  cancelled (`:236`), and completed (`:247`) chip assertions — i.e. T-08-07/T-08-08 themselves — contain
  no literal "status" in their names and never ran. Rescoped to the describe block.
- **8-04-02** ran `-t "Modif"`, matching **4 of 6** `mutating-control gate` tests. The two exhaustive
  button-sweep allowlist tests (`:615`, `:646`) — the standing T-08-01 (high) guard this row exists for —
  were skipped. Rescoped to the describe block.
- **8-01-01** grepped both files whole and returned 1, not 0, permanently red. The surviving hit
  (`REQUIREMENTS.md:21`) is SDK reference prose describing what `events[]` carries, not a promise to
  render staff attribution. 08-01's real acceptance check was scoped to the Phase 8 ROADMAP block
  (see 08-01-SUMMARY.md deviation 1); restored that scoping.

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

**Sampling continuity:** every task above has an `<automated>` verify. No 3 consecutive tasks lack one.

---

## Wave 0 Requirements

**Existing infrastructure covers all phase requirements** — Vitest and Testing Library are configured
and already used by `screen-detail.test.jsx`, `history-utils.test.js`, `app-history-route.test.jsx`, and
`screen-history.test.jsx`. No framework install, no new config, no new test file is needed.

The two gaps `08-RESEARCH.md` flagged as Wave 0 are **fixture-shaped, not infrastructure-shaped**, so
they are owned by the plan that needs them rather than by a separate Wave 0 plan:

- [x] Controllable per-id `useOrderDetail` mock (replacing the blanket `() => ({ data: undefined })` at
      `app-history-route.test.jsx:22`) — **owned by 08-05 Task 2**, the only plan with two live call
      sites to distinguish.
- [x] Hydrated-items and terminal-event fixtures — **owned by 08-04 Task 1 / 08-05 Task 2** at the level
      each needs them (component vs route).
- [x] `readOnly` + `paymentCaptureStatus: 'refunded'` fixture for D-05's chip derivation — **owned by
      08-03 Task 2**.
- [x] COMPLETED / CANCELLED / no-terminal-event / two-COMPLETED fixtures for D-10's edge matrix —
      **owned by 08-02 Task 1**, as pure unit fixtures rather than rendered ones.

⚠ **Fixture-shape correction (planner finding F-01, load-bearing for this phase's validity).** The
existing fixtures are unrepresentative of production and this is why the phase's central defect went
untested: `normalizeOrder` maps `items: (o.items ?? []).map(...)`, returning `[]` and never `null`, and
`use-history-orders.js` runs every summary through it. So `app-history-route.test.jsx:52`'s `items:
null` and `screen-detail.test.jsx`'s `HISTORY_ORDER` (key omitted → `undefined`) both describe a shape
the app never produces. The consequence for validation: the existing Modify assertion at
`app-history-route.test.jsx:105` **passes without exercising the defect it names**. Every new fixture in
this phase must use `items: []` for the summary shape. 08-05 Task 2 corrects the existing one.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| A real archived order hydrates against the live API — `getOrder(id)` resolves for an order older than the live-orders window, confirming the admin token reaches `/v1/orders/{id}` | HIST-10 (SC1) | STATE.md carries this as an open v1.1 question: *"Does the admin token have access to `/v1/orders/{id}` (kitchen endpoint)? If 401 on getOrder, detail view must fall back to AdminOrder summary fields only."* Every test in this phase mocks the SDK, so a mocked pass would encode the assumption rather than verify it. `08-RESEARCH.md` confirms the URL is not kitchen-scoped **at the type level**, which is necessary but not sufficient — only a live call settles token scope. | Sign in against the live API, open History, click any order older than a day. Confirm items, modifiers, phone, and address render (not the generic error). If the error block appears instead, capture the network response status — a 401 here means the phase's premise needs revisiting and the D-08 generic-message decision may need reopening. |
| The skeleton does not flash when reopening an already-cached order | HIST-10 (SC2) | `staleTime: 0` refetches on every mount; whether the `isPending` gate actually prevents a visible flash depends on real network timing, which a mocked test cannot reproduce (RESEARCH Pitfall 6). | Open a historical order, press Back, reopen the same order. The item rows should stay on screen through the background refetch — no grey skeleton flash. |
| The duration row reads plausibly against a real order | HIST-10 (SC1, D-10) | Unit tests pin the derivation against synthetic fixtures; only real `events[]` data confirms the API populates terminal events with the timestamps the derivation assumes. | Open a completed order whose prep time staff remember. Confirm the prep-time row shows a plausible number. Open a cancelled order and confirm the label reads "Canceled after", not "Prep time". |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references — none are missing; every target test file exists
- [x] No watch-mode flags
- [x] Feedback latency < 25s
- [x] `nyquist_compliant: true` set in frontmatter
- [x] Every documented command re-run and confirmed green as written (2026-07-17 audit)
- [x] Every `-t` filter confirmed to select the tests its Secure Behavior column names — no vacuous passes

**Approval:** approved 2026-07-17

---

## Validation Audit 2026-07-17

| Metric | Count |
|--------|-------|
| Gaps found | 3 |
| Resolved | 3 |
| Escalated | 0 |

**Gap class:** all three were command-selectivity defects in the map, not missing tests and not
implementation bugs. Phase 8 ships 113 passing tests across its 6 files; every behavior in the
Per-Task Map was already covered. What was broken was the *sampling contract* — two commands passed
green while silently skipping the threat-carrying tests (T-08-07/T-08-08 chips; T-08-01 button sweep),
and one grep was permanently red against legitimate SDK prose. A regression in the refunded chip or a
newly reachable mutating control would not have been caught by running the map as written.

**Method:** each of the 10 commands was executed as literally transcribed and its selected-test count
compared against the tests the row claims to guard. No test files were generated or modified; no
`gsd-nyquist-auditor` spawn was needed.

**Not addressed (out of scope, pre-existing):** `build-pipeline.test.js:101` and
`offline-buttons.test.jsx` remain red — tracked in `deferred-items.md`, unrelated to Phase 8.
