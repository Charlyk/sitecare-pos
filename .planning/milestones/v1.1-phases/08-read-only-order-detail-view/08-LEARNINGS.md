---
phase: 8
phase_name: "read-only-order-detail-view"
project: "SiteCare POS — Desktop App"
generated: "2026-07-17"
counts:
  decisions: 9
  lessons: 7
  patterns: 7
  surprises: 6
missing_artifacts: []
---

# Phase 8 Learnings: Read-Only Order Detail View

## Decisions

### Cut "handled-by" rather than derive it from `events[].actor`
Both ROADMAP SC1 and REQUIREMENTS HIST-10 promised a "handled-by" field. It was removed from both documents and recorded in the Design Elements Cut table.

**Rationale:** `Order` carries no such field — only `events[].actor` (`string | null`, undocumented semantics). Guessing which event represents "handled by" risks misattributing an order to the wrong staff member. The user chose to lose a promised success criterion rather than display an unreliable fact.
**Source:** 08-CONTEXT.md (D-09), 08-01-SUMMARY.md

### Prep time is the derived actual duration, not `estimatedMinutes`
The duration row computes elapsed time from raw `events[]` timestamps rather than rendering the accept-time estimate the SDK provides as a typed field.

**Rationale:** For reviewing a finished order, what actually happened beats what was promised. Unlike `actor`, event timestamps are non-null and unambiguous. This pairs with D-09 as one rule: only show what the data can actually support — which sometimes means cutting a field and sometimes means doing more work than the easy typed field would require.
**Source:** 08-CONTEXT.md (D-10), 08-03-SUMMARY.md

### `deriveDuration` lives in `history-utils.js`, not co-located in `screen-detail.jsx`
The derivation was placed in the pure utils module alongside `deriveDisplayStatus`.

**Rationale:** Its hard edge cases (no terminal event, duplicate COMPLETED events, tied timestamps) get direct unit tests instead of being probed through rendered DOM. It also matches the module's existing raw-SDK-casing convention.
**Source:** 08-02-PLAN.md `<planner_decision>`, 08-02-SUMMARY.md

### `historyStatusMeta` exported rather than duplicated or extracted
`screen-history.jsx`'s status-meta helper changed from module-private to a named export, consumed by `screen-detail.jsx`.

**Rationale:** Mirrors the existing screen-to-screen meta-import precedent (`screen-orders.jsx`'s `sourceMeta`/`typeMeta`/`stateMeta`). Makes D-05's requirement — that the detail chip agrees with the History row — true by construction rather than by convention.
**Source:** 08-02-SUMMARY.md

### Null derivation falls back to the shipped function, not into a second derivation's default
When `deriveDisplayStatus` returns null, the chip falls back to `stateMeta` rather than passing null into `historyStatusMeta`.

**Rationale:** `historyStatusMeta`'s own `map[status] || map.completed` default would silently label an unrecognized order **Completed** — a false claim about a financial record (T-08-08). Falling back to pre-existing live-route behavior is honest; inheriting a downstream default is not.
**Source:** 08-03-SUMMARY.md, 08-SECURITY.md (T-08-08)

### Items-card state machine keys on query state, never on the items value
Precedence is `detailError → detailLoading → items.length === 0 → populated`.

**Rationale:** Per finding F-01, `items` is `[]` both while loading and when genuinely empty, so the value cannot distinguish the two. Keying on query state means the "no items" claim is only ever made about a settled, successfully-read order.
**Source:** 08-04-SUMMARY.md, 08-04-PLAN.md `<planner_finding id="F-01">`

### Manual merge chosen over TanStack `placeholderData`/`initialData`
`mergedHistoryOrder = { ...historyOrder, ...(historyDetail ?? {}) }`, hydrated fields winning.

**Rationale:** `placeholderData`/`initialData` reset to `undefined` on error, which would blank the screen — the exact opposite of D-07/SC2's requirement that already-fetched summary fields stay visible. Safe because both sides have already passed through `normalizeOrder`, so field names align.
**Source:** 08-05-SUMMARY.md, 08-CONTEXT.md (D-03)

### `isPending`, not `isFetching`, gates the loading skeleton
The skeleton shows only on a genuinely pending query.

**Rationale:** Under `staleTime: 0`, `isFetching` would re-flash the skeleton on every reopen of an already-cached order. Resolves RESEARCH Open Question 1.
**Source:** 08-05-SUMMARY.md, 08-05-PLAN.md

### `add-alongside` confirmed as terminal for this phase; promote deferred behind explicit tripwires
Two `useOrderDetail` call sites against the same `['order', id]` cache key, rather than generalizing `openOrder()`/the route.

**Rationale:** D-01/D-04 in 08-CONTEXT.md are locked user decisions. Phase 7 had predicted this phase's `getOrder(id)` would force a promote; it did not. Three tripwires are carried forward instead of resolved: a third `OrderDetailScreen` caller (Phase 11's reprint is the near-term candidate), diverging data needs between the routes, or props growing past `readOnly` + three.
**Source:** 08-05-SUMMARY.md, 08-05-PLAN.md `<assumption_delta_decision>`

---

## Lessons

### Unrepresentative test fixtures hid a live production defect
The Modify button was reachable on the shipped read-only route in production, and the existing test at `app-history-route.test.jsx:105` asserted its absence — and passed, without exercising the defect it named.

**Context:** The fixture used `items: null`, a shape `normalizeOrder` never produces. With `items` null, the items card (and its Modify button) never mounted, so the assertion was vacuously true. The defect only became visible once the planner checked the fixture against `src/data.jsx:246`. A test that passes for the wrong reason is worse than no test — it actively certifies the gap.
**Source:** 08-VALIDATION.md (F-01 fixture-shape correction), 08-04-PLAN.md, STATE.md

### Fixtures must match production shape, not merely satisfy the property under test
Correcting `items: null` → `items: []` was not enough. Once `items` was a real array, the thermal rail mounted and `ThermalTicket`'s `money()` helper threw on `undefined.toFixed()`.

**Context:** `HISTORY_ORDER` omitted `subtotal`/`tax`/`deliveryFee`/`tip`/`discount` — safe only while the thermal rail stayed unmounted. Production's `normalizeOrder` always yields those numerically (0-defaulted). Half-fixing a fixture surfaces the next latent assumption behind it.
**Source:** 08-04-SUMMARY.md (auto-fixed issue 1)

### A green `-t` filter can silently skip the tests it claims to guard
Two commands in the Per-Task Verification Map passed green while never running the threat-carrying tests.

**Context:** `8-03-02` ran `-t "status"`, matching 1 of 11 `readOnly mode` tests — the refunded/cancelled/completed chip assertions (T-08-07/T-08-08 themselves) contain no literal "status" in their names. `8-04-02` ran `-t "Modif"`, matching 4 of 6, skipping both exhaustive button-sweep tests — the standing T-08-01 (high) guard. The tests existed and passed; the *sampling contract* was broken. A regression would not have been caught by running the map as written.
**Source:** 08-VALIDATION.md (Validation Audit 2026-07-17)

### An acceptance criterion can be broader than its own task's edit scope
Task 1's `<action>` specified five scoped edits, but its `<acceptance_criteria>` grepped the whole Phase 8 ROADMAP block for `handled-by` and required zero.

**Context:** A pre-existing line in the Phase 8 "Plans:" list contained the word, so the count was 1. The fix was in-scope in spirit (same document, same correction, same D-09) but outside the action text. Worth checking that a criterion's blast radius matches its action's before execution.
**Source:** 08-01-SUMMARY.md (auto-fixed issue 1)

### Romanian label collisions make text-only assertions insufficient
`state_done` and `status_completed` both render as the identical string `Finalizată`.

**Context:** Asserting on text alone could not prove *which* derivation produced a chip. The tests needed class-based checks (`chip-slate` for `stateMeta` vs `chip-sage` for `historyStatusMeta`) to distinguish them. In a bilingual app, two code paths can be observationally identical in one locale.
**Source:** 08-03-SUMMARY.md (auto-fixed issue 1)

### Ambiguous totals assertions need deliberately distinct fixture values
`getByText('128,50 lei')` was ambiguous when `tax: 0` made subtotal and total format identically.

**Context:** Both 08-04 and 08-05 independently hit this and fixed it the same way — splitting the fixture into distinct subtotal/tax values so the total resolves to a single node. A fixture value chosen for convenience can make an assertion unable to fail.
**Source:** 08-04-SUMMARY.md, 08-05-SUMMARY.md

### Planning documents drifted from what the SDK actually delivers
ROADMAP SC2 asserted `401/403`; the SDK's `GetOrderErrors` documents only 401 and 404. SC1 promised a field that does not exist.

**Context:** Both errors survived into the phase's own success criteria. Verifying criteria against installed SDK types before planning — not during execution — would have caught them earlier. Phase 8's first plan was spent correcting them.
**Source:** 08-01-SUMMARY.md, 08-CONTEXT.md `<roadmap_impact>`

---

## Patterns

### Query-state-first precedence
Evaluate `detailError → detailLoading → empty → populated` in that order, so a failed fetch never shows a stale skeleton and an "empty" claim is only made about settled, successfully-read data.

**When to use:** Any view where the loading state and the genuinely-empty state produce the same value (an empty array, a zero, an absent key). The value can't distinguish them — the query state can.
**Source:** 08-04-SUMMARY.md

### Region-scoped state, mounted shell
Skeleton/error/empty render inside the items card's rows slot only; the card shell, header, and totals block stay mounted in every state.

**When to use:** Whenever partial data is already on screen and a secondary fetch is filling in the rest. Guarantees by construction that a failure never blanks what the app already holds.
**Source:** 08-04-SUMMARY.md, 08-CONTEXT.md (D-07)

### Sibling hook call (add-alongside, not promote)
Place a second call to an existing hook in the same unconditional block as the first, above all conditional returns — rather than generalizing the hook or the route to serve both callers.

**When to use:** When a second caller needs the same data as an existing one, and unifying them would put two data paths in one file. Preserves React hook-ordering rules and keeps the incumbent route byte-identical. Pair it with explicit written tripwires for when to finally promote.
**Source:** 08-05-SUMMARY.md

### Read-only-gated derivation
Compute the read-only-only value once per render (`const duration = readOnly ? deriveDuration(order) : null`), guarded by the flag, and let the live route's original expression stand unchanged in its own branch.

**When to use:** Adding a variant behavior to a shared presenter. Avoids double-calling a derivation inside a ternary and keeps the incumbent branch reviewable as untouched.
**Source:** 08-03-SUMMARY.md

### Null-fallback-to-shipped-behavior
When a derivation returns null, fall back to the pre-existing function rather than feeding null into a second function whose own internal default would silently mislabel the record.

**When to use:** Any chain of derivations where a downstream helper has a permissive `|| default`. The default is fine for its original caller and dangerous for a new one.
**Source:** 08-03-SUMMARY.md

### Max-by-reduce, never `.find`, for selecting a winning array element
Select via `filter` + `reduce` with a `>=` tie-break, making the max-`createdAt` contract explicit and grep-verifiable (`grep -c "\.find(" → 0`).

**When to use:** Selecting from server-supplied arrays whose ordering is not contractually guaranteed. `.find` silently returns a stale first match when the array arrives newest-first.
**Source:** 08-02-SUMMARY.md, 08-SECURITY.md (T-08-05)

### Standing allowlist sweep as a regression guard
Enumerate every `<button>` in a fully-hydrated read-only render against a fixed non-mutating allowlist, rather than asserting the absence of specific known controls.

**When to use:** When a requirement is a claim about a whole surface ("no mutating control is reachable"), not about one element. A future ungated addition fails the test automatically — which is exactly how Phase 7 missed the Modify button.
**Source:** 08-04-SUMMARY.md, 08-SECURITY.md (T-08-09)

---

## Surprises

### The phase's central defect was already live in production
The Modify button was reachable on the shipped `history-detail` route from Phase 7 — not a prospective risk introduced by this phase's hydration work.

**Impact:** Reclassified T-08-01 from prospective to a live high-severity defect. Also revealed the minimal-totals fallback at `screen-detail.jsx:191-204` as dead code, since `items` is never null. Discovered only because the planner checked a documented premise against source.
**Source:** STATE.md (Phase 8 planning note F-01), 08-04-PLAN.md

### The planner disproved a premise carried by both RESEARCH and CONTEXT
Both documents assumed the `AdminOrder` summary reaches `screen-detail.jsx` with `items: null`. `normalizeOrder` maps `items: (o.items ?? []).map(...)` — always an array.

**Impact:** Load-bearing for the whole phase. It changed the state machine's key (query state, not `items.length`), invalidated every existing fixture, reclassified the Modify defect, and was confirmed independently by the plan-checker. Upstream research artifacts are not authoritative about code.
**Source:** STATE.md, 08-01-SUMMARY.md (F-01), 08-VALIDATION.md

### The predicted architectural forcing function did not fire
Phase 7 recorded `add-alongside` as accepted debt and named this phase's `getOrder(id)` as "what should force a promote." It didn't.

**Impact:** The debt was re-accepted rather than paid, with three explicit tripwires documented instead. A predicted trigger is a hypothesis, not a schedule — the tripwires now carry forward to whichever phase actually trips one (Phase 11's reprint being the near-term candidate).
**Source:** 08-05-SUMMARY.md, 08-05-PLAN.md `<assumption_delta_decision>`, STATE.md

### The Modify gate landed in the wrong task, and proving it still worked took deliberate effort
Task 1's mandatory header restructuring touched the exact lines containing the Modify button, so the `{!readOnly && (...)}` gate landed there organically — leaving Task 2's committed diff test-only.

**Impact:** The RED→GREEN proof would have been skipped because the fix was "already there." Resolved by transiently un-gating Modify, confirming 5 assertions fail, then restoring. A task split can be invalidated by the physical adjacency of the code it touches.
**Source:** 08-04-SUMMARY.md (Decisions Made, Issues Encountered)

### Correct duplicate rendering broke single-match test queries three separate times
`getByText` threw "Found multiple elements" for the status chip (header + minimal-totals), for modifiers (items card + ThermalTicket), and for the address line.

**Impact:** Each was a query-strictness problem, not a behavior defect — the duplication is by design, and in the chip's case was explicitly anticipated in the plan's action text. Resolved with `getAllByText` plus class-based disambiguation where identity mattered. Worth expecting whenever a value feeds a preview/mirror region.
**Source:** 08-03-SUMMARY.md, 08-05-SUMMARY.md

### A ~30-version SDK jump sat uncommitted in the working tree during the security audit
`@charlyk/admin-client` was bumped `^1.1.29` → `^1.1.59` in `package.json`/`package-lock.json`, outside any Phase 8 commit.

**Impact:** T-08-SC's "zero new packages" claim holds (it's an existing vetted dependency), so the phase sealed with `threats_open: 0`. But the jump has not been vetted by any Package Legitimacy Audit. Recorded as an advisory: review the changelog and commit or revert deliberately before the next phase seals.
**Source:** 08-SECURITY.md (Advisory — Uncommitted Dependency Drift)
