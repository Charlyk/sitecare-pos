# Roadmap: SiteCare POS Desktop App

**Project:** SiteCare POS — Tauri desktop app (macOS + Windows)
**Core Value:** Restaurant staff can see, accept, and advance orders in real-time from a native desktop app that looks exactly like the design prototype.
**Created:** 2026-04-22

---

## Milestones

- ✅ **v1.0 MVP** — Phases 1–6 (shipped 2026-05-22)
- ✅ **v1.1 Orders History Screen** — Phases 7–12 (shipped 2026-07-19)
- ✅ **v1.2 Branch Switching** — Phases 13–17 (shipped 2026-07-24)

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

<details>
<summary>✅ v1.2 Branch Switching (Phases 13–17) — SHIPPED 2026-07-24</summary>

**Milestone Goal:** Make the POS app branch-aware — staff can see and switch the active branch, and every screen plus the live SSE stream follow the selected branch. Built against the API's v2.6 "Tenant Branching" model, where the active branch is server-side session state.

- [x] Phase 13: Branch State & Launch Seeding Foundation (2/2 plans) — completed 2026-07-22 — BSTATE-01, BSTATE-02
- [x] Phase 14: Branch-Scoped Cache Re-Scoping (4/4 plans) — completed 2026-07-22 — SCOPE-01
- [x] Phase 15: SSE Branch-Aware Reconnect (1/1 plans) — completed 2026-07-23 — SCOPE-02
- [x] Phase 16: Branch Switcher UI, Switch Flow & Language Relocation (3/3 plans) — completed 2026-07-23 — SWCH-01…04, SCOPE-03/04, LANG-01
- [x] Phase 17: Centralized Branch-Access Error Handling (6/6 plans) — completed 2026-07-24 — BERR-01…04

Closed `override_closeout` (2026-07-24): 15/15 requirements code-complete and test-backed, all cross-phase flows wired; live-account/pixel verification (Phases 15/16/17) and two WINDOWS caveats deferred. Full phase details → `.planning/milestones/v1.2-ROADMAP.md` · Audit → `.planning/milestones/v1.2-MILESTONE-AUDIT.md`

</details>

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
| 13. Branch State & Launch Seeding Foundation | v1.2 | 2/2 | Complete | 2026-07-22 |
| 14. Branch-Scoped Cache Re-Scoping | v1.2 | 4/4 | Complete | 2026-07-22 |
| 15. SSE Branch-Aware Reconnect | v1.2 | 1/1 | Complete | 2026-07-23 |
| 16. Branch Switcher UI, Switch Flow & Language Relocation | v1.2 | 3/3 | Complete | 2026-07-23 |
| 17. Centralized Branch-Access Error Handling | v1.2 | 6/6 | Complete | 2026-07-24 |

---

*Roadmap created: 2026-04-22*
*Last updated: 2026-07-24 — v1.2 Branch Switching shipped (Phases 13–17); milestone archived.*
