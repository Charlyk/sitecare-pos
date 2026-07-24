# Phase 17 — API Coverage Declaration

**Verdict:** No external API integration.

This phase reacts to 403 responses from the already-integrated `@charlyk/admin-client`
branch endpoints (`me.branches.switch`, `me.branches.list`, `auth.getMe`), all wired in
Phases 13–16. It adds centralized error handling on top of existing branch calls — it does
NOT introduce a new external-API integration surface.

The one new *read* usage is `getMe().selectedBranch` on window focus (BERR-04 revalidation),
which is the same `client.auth.getMe()` call already used by cold-start seeding (`auth.jsx`)
and sign-in (Phases 2/13). No new SDK method, endpoint, or auth surface is introduced.

| Method | Status | Introduced | This phase's use |
|--------|--------|------------|------------------|
| `client.auth.getMe()` | pre-integrated (Phase 2/13) | — | focus revalidation compares `selectedBranch` to `currentBranch` (BERR-04) |
| `client.me.branches.list()` | pre-integrated (Phase 13) | — | `['branches']` refetch on recovery (BERR-01) |
| `client.me.branches.switch()` | pre-integrated (Phase 16) | — | its 403 now routes through the central handler (BERR-01/02) |

**Package installs:** none. Zero new dependencies (verified against `package.json` /
`package-lock.json`). All three consumed libraries (`@tanstack/react-query`,
`@microsoft/fetch-event-source`, `@charlyk/admin-client`) are pre-existing, already-audited
dependencies. The `T-17-SC` supply-chain threat is therefore N/A for this phase.

*Written by plan-phase, 2026-07-23.*
