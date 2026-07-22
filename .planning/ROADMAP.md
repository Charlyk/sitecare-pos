# Roadmap: SiteCare POS Desktop App

**Project:** SiteCare POS — Tauri desktop app (macOS + Windows)
**Core Value:** Restaurant staff can see, accept, and advance orders in real-time from a native desktop app that looks exactly like the design prototype.
**Created:** 2026-04-22

---

## Milestones

- ✅ **v1.0 MVP** — Phases 1–6 (shipped 2026-05-22)
- ✅ **v1.1 Orders History Screen** — Phases 7–12 (shipped 2026-07-19)
- 🚧 **v1.2 Branch Switching** — Phases 13–17 (in progress)

---

## Phases

<details>
<summary>✅ v1.0 MVP (Phases 1–6) — SHIPPED 2026-05-22</summary>

- [x] Phase 1: Foundation (5/5 plans) — completed 2026-04-22
- [x] Phase 2: Authentication (5/5 plans) — completed 2026-04-23
- [x] Phase 3: Shell + Data Foundation (6/6 plans) — completed 2026-04-24
- [x] Phase 4: Core Screens (11/11 plans) — completed 2026-04-27
- [x] Phase 5: Native Integration (4/4 plans) — completed 2026-04-29
- [x] Phase 6: Build Pipeline (4/4 plans) — completed 2026-05-02

Full phase details → `.planning/milestones/v1.0-ROADMAP.md`

</details>

<details>
<summary>✅ v1.1 Orders History Screen (Phases 7–12) — SHIPPED 2026-07-19</summary>

- [x] Phase 7: History Screen Foundation (6/6 plans) — completed 2026-07-17
- [x] Phase 8: Read-Only Order Detail View (5/5 plans) — completed 2026-07-17
- [x] Phase 9: Period Control (5/5 plans) — completed 2026-07-18
- [x] Phase 10: Filters + Search (4/4 plans) — completed 2026-07-18
- [x] Phase 11: Reprint + CSV Export (4/4 plans) — completed 2026-07-19
- [x] Phase 12: Tech-Debt Closeout (4/4 plans) — completed 2026-07-19

Full phase details → `.planning/milestones/v1.1-ROADMAP.md`

</details>

### 🚧 v1.2 Branch Switching (Phases 13–17, in progress)

**Milestone Goal:** Make the POS app branch-aware — staff can see and switch the active branch, and every screen plus the live SSE stream follow the selected branch. Built against the API's v2.6 "Tenant Branching" model, where the active branch is server-side session state — no header or param — so every existing SDK call auto-scopes to it.

- [x] **Phase 13: Branch State & Launch Seeding Foundation** - Seed the current branch and the accessible-branch list from the session on sign-in and cold start (completed 2026-07-22)
- [ ] **Phase 14: Branch-Scoped Cache Re-Scoping** - Key every branch-scoped data cache to the active branch
- [ ] **Phase 15: SSE Branch-Aware Reconnect** - Reconnect the live order stream scoped to the new branch on every switch
- [ ] **Phase 16: Branch Switcher UI, Switch Flow & Language Relocation** - Sidebar branch switcher with a non-optimistic switch flow; RO/EN control relocates to Settings
- [ ] **Phase 17: Centralized Branch-Access Error Handling** - Route every branch-access 403, from the switch call or any later request, through one recovery path

---

## Phase Details

### Phase 13: Branch State & Launch Seeding Foundation

**Goal**: The app resolves and holds the current active branch — and the list of branches the user can switch to — from server session state on every sign-in and cold start, never from local persistence.
**Depends on**: Nothing (first phase of v1.2)
**Requirements**: BSTATE-01, BSTATE-02
**Success Criteria** (what must be TRUE):

  1. After an interactive sign-in, the current branch (from `client.auth.getMe().selectedBranch`) is held in session-only app state.
  2. After restarting the app with a remembered session (no interactive sign-in), the current branch is populated the same way — the cold-start path gains this call rather than staying null.
  3. The accessible-branches list loads via `client.me.branches.list()` and refetches on window focus and after any branch-access error; it is never cached indefinitely.
  4. No branch field is written to persisted preferences — restarting always re-derives the branch from the server, never from a locally cached value.
  5. Standing regression: a single-branch tenant's sign-in and cold-start flow behaves exactly as pre-v1.2, with no added delay or new blank state.

**Plans**: 2/2 plans executed

- [x] 13-01-PLAN.md — Launch-seeding: session-only currentBranch store field + getMe() seeding at cold-start/signIn + focus-retry backstop + displayName fix (BSTATE-01)
- [x] 13-02-PLAN.md — useBranches() hook over client.me.branches.list() with finite staleTime + focus refetch (BSTATE-02)

### Phase 14: Branch-Scoped Cache Re-Scoping

**Goal**: Every branch-scoped data cache is keyed to the active branch, so no cached response can be served against the wrong branch once switching exists.
**Depends on**: Phase 13
**Requirements**: SCOPE-01
**Success Criteria** (what must be TRUE):

  1. Orders, order detail, stats, product availability, order history, restaurant settings, and delivery-area data are all cached per branch, so a branch change is guaranteed to produce a fresh fetch rather than a stale hit from another branch.
  2. Order mutations (accept/advance/cancel, POS submit) invalidate only the active branch's cache entries, never a different branch's.
  3. Every branch-scoped data-fetch error carries a matchable error code (e.g. `BRANCH_INACTIVE`) that a later centralized handler can act on.
  4. Standing regression: a single-branch tenant's order list loads with no added delay versus pre-v1.2 — branch resolution never blocks the initial fetch.

**Plans**: 2/4 plans executed
**Wave 1**

- [x] 14-01-PLAN.md — Tracer: unwrapSdkResult helper + use-orders branch-key + screen-orders invalidation + SC3/SC4 tests

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 14-02-PLAN.md — Expand fetch hooks A: use-order-detail, use-stats, use-menu + SC1 tests
- [ ] 14-03-PLAN.md — Expand fetch hooks B: use-restaurant-settings, use-delivery-areas, use-history-orders (key-only) + SC1 tests
- [ ] 14-04-PLAN.md — Mutation invalidation lockstep (use-order-actions, screen-pos, screen-menu) + SC2 sibling-untouched test

**Cross-cutting constraints:**

- In all three hooks branchId = `useAppStore((s) => s.currentBranch?.id) ?? null` and is the first variable segment immediately after the resource name. (D-07)

**Planning note (RESOLVED during Phase 14 planning):** D-01 picks **branchId-keyed query keys** (`['orders', branchId]`, etc.) over `queryClient.resetQueries()`, applied uniformly across all seven hooks — chosen for race-safety by construction (immune to Pitfall 4) and future-proofing. No ad-hoc mixing.

### Phase 15: SSE Branch-Aware Reconnect

**Goal**: The live order stream always reflects the currently active branch, reconnecting immediately on a switch rather than waiting on the library's passive retry.
**Depends on**: Phase 14
**Requirements**: SCOPE-02
**Success Criteria** (what must be TRUE):

  1. A branch switch causes the live connection to visibly reconnect (drop and recover) within about a second, scoped to the new branch — not on the library's own backoff timetable.
  2. The Kitchen Display and the order list both receive the new branch's live events after a switch, confirmed against a second live session on that branch.
  3. Reconnecting after a branch switch never fires the sound alert for orders that were already open on the new branch — the initial snapshot replay stays silent.
  4. Standing regression: a single-branch tenant's live connection behaves exactly as before v2.6 — connects once, stays connected, no extra reconnect cycles.

**Plans**: TBD

**Planning note (flagged, not resolved here):** the exact 403 signal shape `fetchEventSource`'s `onopen`/`onerror` path surfaces for a branch-resolution failure (vs. a generic non-2xx or network drop) is unverified from documentation alone. If this phase's own testing surfaces it, note the shape for Phase 17; otherwise treat it as a Phase 17 build-time verification item.

### Phase 16: Branch Switcher UI, Switch Flow & Language Relocation

**Goal**: Staff can see and change the active branch from the sidebar footer, with every screen and the live stream following only after the server confirms the switch — and the vacated language control keeps working from Settings.
**Depends on**: Phase 13, Phase 14, Phase 15
**Requirements**: SWCH-01, SWCH-02, SWCH-03, SWCH-04, SCOPE-03, SCOPE-04, LANG-01
**Success Criteria** (what must be TRUE):

  1. The sidebar footer shows a branch selector in the exact position the RO/EN toggle used to occupy, displaying the current branch name and a "default" badge for the tenant's default branch.
  2. For a single-branch tenant, the selector renders read-only with no dropdown affordance — pre-v2.6 behavior preserved exactly.
  3. Selecting a different branch disables the control until `client.me.branches.switch` resolves; the displayed branch, every branch-scoped data view, and the live stream all update only after success — a rejected switch leaves the app on the old branch with nothing changed beyond an error notice.
  4. A successful switch shows a "switched to `<branch>`" confirmation toast, exits any open order-detail view back to a neutral screen, and discards any in-progress POS cart so no prior-branch state carries forward; order-affecting actions (Ring Up, Accept, Advance, Cancel, Reprint) stay disabled for the duration of a pending switch.
  5. The RO/EN language toggle no longer appears in the sidebar footer; language remains changeable from Settings → Afișaj with no loss of capability.

**Plans**: TBD
**UI hint**: yes

### Phase 17: Centralized Branch-Access Error Handling

**Goal**: Any branch-access failure — from the switch call itself or from any later ordinary request — recovers through one consistent, visible path instead of surfacing as a generic or silent failure.
**Depends on**: Phase 14, Phase 16
**Requirements**: BERR-01, BERR-02, BERR-03, BERR-04
**Success Criteria** (what must be TRUE):

  1. A `BRANCH_INACTIVE` or `BRANCH_ACCESS_REVOKED` 403 returned by the switch call itself produces a toast, reopens the branch switcher, and refetches the branch list — the app stays on the previously selected branch with no other change.
  2. The identical recovery (toast, reopened switcher, refetched branch list) also fires when the same 403 codes arrive from any later ordinary request — an order refetch, a mutation, a stream reconnect — not only from a switch attempt.
  3. A `NO_BRANCH_ACCESS` 403 produces a distinct blocking state that takes over the entire app until access is restored, rather than the toast-and-reopen treatment used for the other two codes.
  4. Returning to the app after it regains focus revalidates the selected branch, surfacing a branch change or access revocation made on another device through the same recovery path.

**Plans**: TBD

---

## Progress Table

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Foundation | v1.0 | 5/5 | Complete | 2026-04-22 |
| 2. Authentication | v1.0 | 5/5 | Complete | 2026-04-23 |
| 3. Shell + Data Foundation | v1.0 | 6/6 | Complete | 2026-04-24 |
| 4. Core Screens | v1.0 | 11/11 | Complete | 2026-04-27 |
| 5. Native Integration | v1.0 | 4/4 | Complete | 2026-04-29 |
| 6. Build Pipeline | v1.0 | 4/4 | Complete | 2026-05-02 |
| 7. History Screen Foundation | v1.1 | 6/6 | Complete | 2026-07-17 |
| 8. Read-Only Order Detail View | v1.1 | 5/5 | Complete | 2026-07-17 |
| 9. Period Control | v1.1 | 5/5 | Complete | 2026-07-18 |
| 10. Filters + Search | v1.1 | 4/4 | Complete | 2026-07-18 |
| 11. Reprint + CSV Export | v1.1 | 4/4 | Complete | 2026-07-19 |
| 12. Tech-Debt Closeout | v1.1 | 4/4 | Complete | 2026-07-19 |
| 13. Branch State & Launch Seeding Foundation | v1.2 | 2/2 | Complete    | 2026-07-22 |
| 14. Branch-Scoped Cache Re-Scoping | v1.2 | 2/4 | In Progress|  |
| 15. SSE Branch-Aware Reconnect | v1.2 | 0/TBD | Not started | - |
| 16. Branch Switcher UI, Switch Flow & Language Relocation | v1.2 | 0/TBD | Not started | - |
| 17. Centralized Branch-Access Error Handling | v1.2 | 0/TBD | Not started | - |

---

*Roadmap created: 2026-04-22*
*Last updated: 2026-07-21 — v1.2 Branch Switching roadmap created (Phases 13–17); 15/15 requirements mapped, no orphans.*
