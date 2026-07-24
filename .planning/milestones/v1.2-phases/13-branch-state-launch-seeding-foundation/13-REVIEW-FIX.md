---
phase: 13-branch-state-launch-seeding-foundation
fixed_at: 2026-07-22T15:15:00Z
review_path: .planning/phases/13-branch-state-launch-seeding-foundation/13-REVIEW.md
iteration: 1
findings_in_scope: 7
fixed: 7
skipped: 0
status: all_fixed
---

# Phase 13: Code Review Fix Report

**Fixed at:** 2026-07-22T15:15:00Z
**Source review:** .planning/phases/13-branch-state-launch-seeding-foundation/13-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 7 (2 Critical, 5 Warning — `fix_scope: critical_warning`; the 2 Info findings, IN-01 and IN-02, were out of scope)
- Fixed: 7
- Skipped: 0

## Fixed Issues

### CR-01: Stale `currentBranch` survives sign-out / session-expiry and leaks into the next session

**Files modified:** `src/auth.jsx`
**Commit:** `5342557`
**Applied fix:** Added `setCurrentBranch(null)` to `expireSession()`, `signOut()`, and at the top of `signIn()` (immediately after the optimistic `setAuthUser(user)`, before the possibly-failing `getMe()` re-seeds it), matching the review's suggested fix exactly. Verified against the `auth-token.test.jsx` suite — all 11 tests pass.

### CR-02: `remember=false` sign-in still gets persisted to disk on the next token refresh

**Files modified:** `src/auth.jsx`
**Commit:** `4a45cbd`
**Applied fix:** Added a `rememberRef` ref to track the "remember me" choice for the life of the session. `signIn` now unconditionally sets `tokenRef.current = token` (previously only set inside the `if (remember)` branch) and separately records `rememberRef.current = remember`. `doRefresh`'s rotation-handling branch now only calls `persistToken()` when `rememberRef.current` is true, so an opted-out session's token rotation no longer force-writes to `preferences.json`. Verified against `auth-token.test.jsx` — all 11 tests pass.

### WR-01: `getMe()`-seeding logic duplicated three times (DRY violation, root cause of CR-01)

**Files modified:** `src/auth.jsx`
**Commit:** `940df18`
**Applied fix:** Extracted a shared `seedFromMe(adminClient, { onUnauthorized } = {})` helper implementing "call getMe(), seed authUser + currentBranch, on 401 invoke the optional callback" as a single choke point. Migrated all three call sites (cold-start, the D-04 focus-retry backstop, and `signIn`) to use it, each wiring `onUnauthorized: () => expireSession()` where the original code did so (cold-start and, per WR-02 below, focus-retry), and omitting it in `signIn` to preserve that seam's original non-fatal-only behavior. The helper's `me?.selectedBranch ?? null` also incidentally satisfies IN-01 (defensive null-check on `me`), though IN-01 itself was out of scope for this fix pass. Verified against `auth-token.test.jsx` — all 11 tests pass.

### WR-02: Focus-retry backstop conflates "legitimately no branch," "auth expired (401)," and "transient failure" into one silent catch-all

**Files modified:** `src/auth.jsx`
**Commit:** `6a4d819`
**Applied fix:** Applied inline first (before the WR-01 helper extraction) so the fix's intent is visible as an isolated diff: the focus-retry `handleFocus()` catch handler now special-cases `meErr?.status === 401` to call `expireSession()`, mirroring the other two `getMe()` seams, instead of swallowing every rejection identically. (This code was subsequently folded into the shared `seedFromMe()` helper by the WR-01 commit, which preserves the same 401-handling behavior via its `onUnauthorized` callback.) Verified against `auth-token.test.jsx` — all 11 tests pass.

### WR-03: `doRefresh`'s fallback path relies on an unguarded property access throwing to trigger cleanup

**Files modified:** `src/auth.jsx`
**Commit:** `c205f4f`
**Applied fix:** Added an explicit `if (!session) { expireSession(); return; }` check immediately after `getSession()` resolves, so the "no session" case triggers cleanup by intent rather than by an incidental `TypeError` on `session.expiresAt` falling through to the surrounding `catch`. Verified against `auth-token.test.jsx` (which mocks `{ session: null }` responses) — all 11 tests pass.

### WR-04: Debug `console.log`/`console.warn`/`console.error` statements shipped in the auth flow

**Files modified:** `src/auth.jsx`
**Commit:** `d0dfbeb`
**Applied fix:** Gated all remaining debug console statements behind `if (import.meta.env.DEV)`: the cold-start `readToken` result log, the "auth restored" log, the cold-start token-read-failure error log, the post-signIn `getSession` failure warning, and the top-level `signIn` error log. (The sixth statement cited by the review — the post-signIn `getMe` failure warning — had already been removed as a side effect of the WR-01 helper extraction, since `seedFromMe()` does not log internally.) Verified against `auth-token.test.jsx` — all 11 tests pass.

### WR-05: `ORD-02` store test exercises role values that don't exist in the app

**Files modified:** `src/__tests__/store.test.js`
**Commit:** `8bb564e`
**Applied fix:** Rewrote the `ORD-02` describe block to switch between the documented `'cashier'` and `'kitchen'` role values (per `src/store.js:47`) instead of the nonexistent `'boh'`/`'foh'` values. Verified against `store.test.js` — all 29 tests pass.

## Skipped Issues

None — all in-scope findings were fixed.

**Note on out-of-scope findings:** IN-01 (`me`/`me.selectedBranch` null-check) and IN-02 (`Date.now()` toast ID collision risk) were Info-severity and excluded by `fix_scope: critical_warning`. IN-01 is effectively already addressed as a side effect of the WR-01 helper extraction (`me?.selectedBranch ?? null`); IN-02 remains unaddressed and can be picked up in a future `--scope all` pass or manually.

**Verification approach:** No `tsconfig.json` exists in this project and `node -c` does not support JSX, so Tier 2 syntax checking used the project's own `vitest` suite (symlinked `node_modules` from the main working tree into the isolated worktree for this purpose) as the most reliable available check — every fix was verified against the full `auth-token.test.jsx` (11 tests) and, for WR-05, `store.test.js` (29 tests) suites, all passing. A full run of `src/__tests__/` showed 3 pre-existing failures (`build-pipeline.test.js` and `offline-buttons.test.jsx`) in files unrelated to this phase's scope; confirmed present on `master` prior to any of these fixes and left untouched.

---

_Fixed: 2026-07-22T15:15:00Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
