# Requirements: SiteCare POS — v1.2 Branch Switching

**Defined:** 2026-07-21
**Core Value:** Restaurant staff can see, accept, and advance orders in real-time from a native desktop app that looks and feels exactly like the design prototype.

**Milestone goal:** Make the POS app branch-aware — staff can see and switch the active branch, and every screen plus the live SSE stream follow the selected branch. Built against the API's v2.6 "Tenant Branching" model, where the active branch is **server-side session state** (`user.selected_branch_id`) — no header or param — so every existing SDK call auto-scopes to it. SDK `@charlyk/admin-client` v1.1.67 (already installed) is the only data layer; zero new dependencies.

## v1.2 Requirements

### Branch State & Launch (BSTATE)

- [x] **BSTATE-01**: On sign-in and on cold-start session restore, the app resolves the current selected branch from `client.auth.getMe().selectedBranch` and holds it in session-only state (never client-persisted). Cold start currently sets `isAuthenticated` without any `getMe()` call, so this adds that call.
- [x] **BSTATE-02**: The set of accessible branches loads via `client.me.branches.list()`; the list is refetched on window focus and after any branch-access error, and is never cached indefinitely.

### Branch Switcher UI (SWCH)

- [ ] **SWCH-01**: A persistent branch selector sits in the sidebar footer — in the exact position vacated by the removed RO/EN toggle — showing the current branch name and a "default" badge for the tenant's default branch.
- [ ] **SWCH-02**: When the user has a single accessible branch, the selector renders read-only, preserving exact pre-v2.6 behavior for single-branch tenants.
- [ ] **SWCH-03**: Selecting a different branch calls `client.me.branches.switch({ body: { branchId } })`; the control is disabled while the switch is pending, and the active branch updates only after the call succeeds (non-optimistic).
- [ ] **SWCH-04**: A successful switch surfaces a "switched to \<branch\>" confirmation toast.

### Branch-Scoped Data & Realtime (SCOPE)

- [ ] **SCOPE-01**: On switch, all branch-scoped server data (orders, order detail, stats, menu, order history, restaurant settings, delivery areas) re-scopes to the newly selected branch — no stale prior-branch data is served for the cache's `staleTime` window.
- [ ] **SCOPE-02**: The live SSE stream reconnects on switch so the order list and Kitchen Display receive the new branch's events; the reconnect must not fire the initial-snapshot sound burst.
- [ ] **SCOPE-03**: On switch, the POS cart is reset and any open order-detail view is exited, so no prior-branch working state carries into the new branch.
- [ ] **SCOPE-04**: Order mutations (POS submit, accept / advance / cancel, receipt reprint) are blocked while a switch is pending, so no mutation lands against the wrong branch.

### Branch Access Errors (BERR)

- [ ] **BERR-01**: `BRANCH_INACTIVE` and `BRANCH_ACCESS_REVOKED` (403) — whether returned by the switch call itself or by any later branch-scoped request — are handled through one central path: a toast, the branch switcher reopened, and the branch list refetched.
- [ ] **BERR-02**: A rejected switch (403) leaves the app on the previously selected branch, with no change beyond the error notice (the server state was untouched).
- [ ] **BERR-03**: `NO_BRANCH_ACCESS` (403 — the user has no accessible active branch at all) shows a distinct full-screen blocking state that supersedes normal screens until access is restored.
- [ ] **BERR-04**: The selected branch is revalidated when the app window regains focus, catching a branch change or access revocation made on another device.

### Language Control Relocation (LANG)

- [ ] **LANG-01**: The RO/EN toggle is removed from the sidebar footer; language remains changeable via Settings → Afișaj (which already provides the control), with no loss of language-switching capability.

## Future Requirements

Deferred to a later milestone. Tracked but not in the v1.2 roadmap.

### Notifications (per branch)

- **NOTIF-01**: Per-branch push-notification preferences (API v2.6 NOTIF-02) — a newly created branch defaults notifications OFF for all-branches users; surface a per-branch toggle. Deferred: this staff app does not yet register push tokens.

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Branch creation / editing / activation / legal identity / coordinates | Superadmin-only surface (`?branchId=` dashboard) — this app never creates or edits branches |
| Per-branch Stripe Connect onboarding | Owner-dashboard concern; owner-gated `/v1/stripe/connect/**`, not a staff POS surface |
| Staff ↔ branch assignment (invite / grant branch access) | Owner-dashboard concern (`PUT /v1/admin/users/{id}/branches`), owner-gated |
| Cross-branch reporting UI | `/v1/reports` is an internal service-to-service surface (Reports MCP), not a dashboard/app endpoint |
| Client-side persistence of the selected branch | Server (`selected_branch_id`) is authoritative and re-validated every request; persisting locally would fight that model |
| Sending `X-Branch-Id` / a `branchId` query param on existing calls | v2.6 resolves the branch server-side; the app must send nothing extra — the switch call is the only branch mutation |

## Traceability

Which phases cover which requirements. Populated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| BSTATE-01 | Phase 13 | Complete |
| BSTATE-02 | Phase 13 | Complete |
| SWCH-01 | Phase 16 | Pending |
| SWCH-02 | Phase 16 | Pending |
| SWCH-03 | Phase 16 | Pending |
| SWCH-04 | Phase 16 | Pending |
| SCOPE-01 | Phase 14 | Pending |
| SCOPE-02 | Phase 15 | Pending |
| SCOPE-03 | Phase 16 | Pending |
| SCOPE-04 | Phase 16 | Pending |
| BERR-01 | Phase 17 | Pending |
| BERR-02 | Phase 17 | Pending |
| BERR-03 | Phase 17 | Pending |
| BERR-04 | Phase 17 | Pending |
| LANG-01 | Phase 16 | Pending |

**Coverage:**

- v1.2 requirements: 15 total
- Mapped to phases: 15/15 ✓
- Unmapped: 0

---
*Requirements defined: 2026-07-21*
*Last updated: 2026-07-21 — roadmap created; all 15 requirements mapped across Phases 13–17 (Phase 13: BSTATE; Phase 14: SCOPE-01; Phase 15: SCOPE-02; Phase 16: SWCH, SCOPE-03/04, LANG-01; Phase 17: BERR).*
