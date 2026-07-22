---
phase: 13-branch-state-launch-seeding-foundation
reviewed: 2026-07-22T00:00:00Z
depth: standard
files_reviewed: 8
files_reviewed_list:
  - src/store.js
  - src/auth.jsx
  - src/shell.jsx
  - src/use-branches.js
  - src/__tests__/store.test.js
  - src/__tests__/auth-token.test.jsx
  - src/__tests__/shell.test.jsx
  - src/__tests__/use-branches.test.js
findings:
  critical: 1
  warning: 3
  info: 1
  total: 5
status: issues_found
---

# Phase 13: Code Review Report

**Reviewed:** 2026-07-22T00:00:00Z
**Depth:** standard
**Files Reviewed:** 8
**Status:** issues_found

## Summary

Reviewed the session-only `currentBranch` Zustand field, its two getMe()-seeding seams (cold-start restore and signIn), the D-04 window-focus retry backstop, the Shell sidebar `displayName`/initials reconciliation, and the new `useBranches()` TanStack Query hook, together with all four associated test files.

The store partialize exclusion of `currentBranch` (D-10) is correctly implemented and well tested. The Shell `displayName` composition logic is correct, including its edge cases (null authUser, partial name, multi-space names). `useBranches()` matches its test suite exactly (enabled gate, staleTime, refetchOnWindowFocus, error-shape handling).

The one significant defect is a **cross-session data leak**: `currentBranch` is set in three places (cold-start getMe(), signIn's getMe(), and the focus-retry backstop) but is never reset to `null` in `signOut()`, `expireSession()`, or at the top of `signIn()`. Since this is a shared-terminal restaurant POS (staff sign in/out on the same running app instance throughout a shift), a departing user's branch can silently persist and be attributed to the next user's session if that next session's own `getMe()` call fails transiently — and the focus-retry backstop's guard (`currentBranch` truthy ⇒ skip) then treats the stale value as already-resolved, so it never self-heals. This is untested — the existing tests reset `currentBranch: null` manually in `beforeEach`, masking the gap.

## Critical Issues

### CR-01: Stale `currentBranch` survives sign-out / session-expiry and leaks into the next session

**File:** `src/auth.jsx:83-102` (`expireSession`), `src/auth.jsx:218-228` (`signOut`), `src/auth.jsx:167-215` (`signIn`)

**Issue:** `currentBranch` is seeded from `getMe()` at three call sites (cold-start restore, `signIn`, and the D-04 focus-retry backstop) but is **never cleared**. `authUser` is explicitly reset to `null` in both `expireSession()` (line 88) and `signOut()` (line 225), and again optimistically overwritten at the top of `signIn()` (line 183) — but `currentBranch` has no equivalent reset anywhere.

Concrete failure sequence on a shared terminal (the normal operating mode for this app per CLAUDE.md — "restaurant staff can see, accept, and advance orders... from a native desktop app"):

1. Staff member A signs in → `getMe()` resolves → `currentBranch = { id: 'branch-A', ... }`.
2. Staff member A signs out (or their session expires) → `authUser` is cleared but `currentBranch` still holds `branch-A`.
3. Staff member B signs in on the same running app instance. `signIn()` does not reset `currentBranch` before calling `getMe()`. If that `getMe()` call fails (transient network/5xx — explicitly treated as "non-fatal" by the existing `catch (meErr)` block at line 191-193), `currentBranch` is left as `branch-A` while B is now signed in and displayed by name.
4. The D-04 focus-retry backstop (`src/auth.jsx:151-164`) guards with `if (!isAuthenticated || currentBranch || !client) return;` — since `currentBranch` is still truthy (branch-A), the backstop treats it as already resolved and **never retries**, so the stale branch persists indefinitely for the remainder of B's session (until app restart).

Any branch-scoped feature built on `currentBranch` (branch selector, order attribution, `useBranches()`-derived default selection, etc.) will silently operate against the wrong branch for staff member B. This is a data-integrity/session-isolation bug, not a cosmetic one.

Note this is untested: `src/__tests__/auth-token.test.jsx`'s `BSTATE-01 — signIn() getMe() seeding` and `D-04 window focus-retry backstop` describe blocks both explicitly do `useAppStore.setState({ ..., currentBranch: null, ... })` in `beforeEach`, which resets the exact field this bug leaves stale — so the test suite cannot observe the real-world carryover scenario.

**Fix:**
```js
// expireSession()
function expireSession() {
  if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
  setClient(null);
  setToken(null);
  setIsAuthenticated(false);
  setAuthUser(null);
  setCurrentBranch(null); // BSTATE-01: prevent stale branch leaking into the next session
  setError(null);
  // ...
}

// signOut()
async function signOut() {
  if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
  try { await clearToken(); } catch { /* ignore */ }
  tokenRef.current = null;
  setToken(null);
  setClient(null);
  setIsAuthenticated(false);
  setAuthUser(null);
  setCurrentBranch(null); // BSTATE-01: prevent stale branch leaking into the next session
  setError(null);
  setScreen('orders');
}

// signIn() — reset before the (possibly-failing) getMe() re-seeds it
setAuthUser(user); // optimistic fill from the signIn response
setCurrentBranch(null); // BSTATE-01: clear any previous session's branch before getMe() re-seeds it
```

## Warnings

### WR-01: getMe()-seeding logic duplicated three times (DRY violation, increases risk of drift)

**File:** `src/auth.jsx:124-134` (cold-start), `src/auth.jsx:155-160` (focus-retry), `src/auth.jsx:187-193` (signIn)

**Issue:** The pattern `const me = await adminClient.auth.getMe(); setAuthUser(me); setCurrentBranch(me.selectedBranch);` (with slightly different catch handling per seam) is duplicated across three call sites. This is exactly the kind of duplication that let CR-01 slip through — a shared helper would have made the "reset before re-seed" behavior a single choke point instead of three independently-maintained copies. It also means a future contract change to `CurrentUser` (e.g., renaming `selectedBranch`) requires three synchronized edits.

**Fix:** Extract a shared helper:
```js
async function seedFromMe(adminClient, { onUnauthorized } = {}) {
  try {
    const me = await adminClient.auth.getMe();
    setAuthUser(me);
    setCurrentBranch(me?.selectedBranch ?? null);
    return me;
  } catch (meErr) {
    if (meErr?.status === 401) onUnauthorized?.();
    return null;
  }
}
```
and call it from all three seams.

### WR-02: Focus-retry backstop can retry unboundedly with no backoff when a user legitimately has no branch

**File:** `src/auth.jsx:151-164`

**Issue:** `handleFocus` only skips re-fetching when `currentBranch` is truthy. If `getMe()` legitimately resolves with `selectedBranch: null` (a valid state — a user with no assigned branch, not an error), `currentBranch` stays `null` forever, and the guard `!currentBranch` will be true on every single `window focus` event for the lifetime of the session, firing an unthrottled `getMe()` call each time the app regains focus (e.g., tabbing away and back repeatedly). There's no distinction between "transient failure, please retry" and "resolved to legitimately empty," and no backoff/rate-limit.

**Fix:** Track whether `getMe()` has successfully resolved at least once (independent of whether `selectedBranch` was non-null), e.g. a `meResolvedRef` flag, and gate the retry on that instead of on `currentBranch` truthiness alone.

### WR-03: Debug `console.log`/`console.warn`/`console.error` statements shipped in auth flow

**File:** `src/auth.jsx:111, 118, 136, 192, 199, 203`

**Issue:** Several debug-oriented console statements were left in the cold-start and sign-in paths, e.g. `console.log('[auth:cold] readToken →', token ? \`present (${String(token).length} chars)\` : 'null — will show login')`. These ship to the production console in every build (no `import.meta.env.DEV` gate), leak internal auth-flow details (token presence/length, getMe failure reasons) into devtools, and are generally noise once the feature has been verified.

**Fix:** Remove them, or gate behind `if (import.meta.env.DEV) console.log(...)`.

## Info

### IN-01: `me.selectedBranch` accessed without null-checking `me` itself

**File:** `src/auth.jsx:127, 158, 190`

**Issue:** All three getMe()-seeding call sites do `setCurrentBranch(me.selectedBranch)` assuming `me` is always a truthy object per the documented "throwing contract." If a future SDK version (or a mock in a misconfigured environment) resolves `getMe()` to `undefined`/`null` instead of throwing, this throws a `TypeError` inside the `try` block, which is then silently swallowed by the surrounding `catch (meErr)` (since `meErr.status` won't be `401`), compounding CR-01 by leaving `currentBranch` unset with no visible error.

**Fix:** Use optional chaining defensively: `setCurrentBranch(me?.selectedBranch ?? null);` — cheap insurance against a contract violation, consistent with the WR-01 helper extraction.

---

_Reviewed: 2026-07-22T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
