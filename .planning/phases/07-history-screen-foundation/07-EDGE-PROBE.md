# Edge-probe accounting — Phase 7 (spec-less fallback)

> Split out of `COVERAGE.md` so the `api-coverage` gate's matrix parser sees only the
> capability matrix. Content is unchanged — this is the audit record for the deterministic
> edge probe, not part of the API capability surface.

Phase 7 has no plain `SPEC.md`, so `## Edge Coverage` and `## Prohibitions` were authored by the
spec-less probe fallback rather than lifted from a SPEC. The deterministic edge probe surfaced
**13 applicable edges, all `unresolved`** at probe time. This table is the audit record showing
where each one landed — the no-silent-drop equality check is
`13 = 9 covered + 2 backstop + 2 flagged`.

| requirement | category | disposition | where (verified against plan files) |
|---|---|---|---|
| HIST-01 | adjacency | covered | `07-02-PLAN.md:24` |
| HIST-01 | empty | covered | `07-02-PLAN.md:26` |
| HIST-01 | ordering | covered | `07-02-PLAN.md:28` |
| HIST-02 | empty | covered | `07-03-PLAN.md:22` |
| HIST-02 | ordering | covered | `07-03-PLAN.md:24` |
| HIST-02 | adjacency | **backstop** | `07-03-PLAN.md:26` — `{ statement, verification: backstop }` |
| HIST-03 | **unclassified** | **flagged assumption** | see A-1 below — *no plan tag by design* |
| HIST-05 | boundary | covered | `07-01-PLAN.md:23` |
| HIST-05 | adjacency | covered | `07-01-PLAN.md:25` |
| HIST-05 | empty | covered | `07-01-PLAN.md:27` |
| HIST-05 | ordering | covered | `07-01-PLAN.md:29` |
| HIST-05 | precision | **backstop** | `07-01-PLAN.md:31` — the cents-vs-RON unit question; a mocked test would encode the assumption, not verify it |
| HIST-13 | **unclassified** | **flagged assumption** | see A-2 below — *no plan tag by design* |

**Why the two `unclassified` rows are flagged, not backstopped.** The fallback protocol forbids
auto-backstopping an `unclassified` row — inventing a criterion for one is worse than recording the
gap. Both requirements ARE functionally covered by ordinary (non-edge-probe) `truths`; what is
flagged is the *edge*, not the requirement.

- **A-1 — HIST-03 / unclassified.** The 30-day window's inclusivity (29 days back + today) and its
  DST-transition behavior. Implemented per D-04 and exercised by unit tests (the window's own edges
  are the separate, `covered` HIST-05/boundary predicate), but the DST edge is unverified against a
  live Europe/Bucharest terminal. Inherited RESEARCH A1 rider: day-boundary correctness assumes the
  terminal's OS timezone is Europe/Bucharest — a deployment concern outside this phase's code.
  Routed to the `07-06-PLAN.md` Task 3 checkpoint.
- **A-2 — HIST-13 / unclassified.** Distinguishing "no orders in period" from "no orders match
  filters". Not actionable in Phase 7 — filters land in a later phase, and D-13 deliberately ships a
  single empty-state variant. Revisit when filters exist.

**Related deferrals.** The two live-API open questions (server `from`/`to` boundary interpretation;
`AdminOrder.total` cents-vs-RON) are recorded in `07-RESEARCH.md` → *Open Questions (DEFERRED)* and
`07-VALIDATION.md` → *Manual-Only Verifications*, and route to the same blocking human checkpoint.
They are deliberately NOT asserted by mocked unit tests, which would encode the assumption rather
than verify it.
