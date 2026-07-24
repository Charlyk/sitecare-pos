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
  critical: 2
  warning: 5
  info: 2
  total: 9
status: issues_found
---

# Phase 13: Code Review Report

**Reviewed:** 2026-07-22T00:00:00Z
**Depth:** standard
**Files Reviewed:** 8
**Status:** issues_found

## Summary

Reviewed the session-only `currentBranch` Zustand field and its `partialize` exclusion, the two `getMe()`-seeding seams (cold-start restore and `signIn`), the D-04 window-focus retry backstop, the token-refresh scheduling loop, the Shell sidebar `displayName`/initials/user-menu work, and the new `useBranches()` TanStack Query hook, together with all four associated test files. Note the supplied `diff_base` resolves to a Phase-02 commit and does not bound the actual Phase 13 change set; the file list in `files:` was treated as authoritative and each file was read and reviewed in full.

The store's `partialize` exclusion of `currentBranch` (D-10) is correctly implemented and well tested, `useBranches()` matches its test suite exactly (enabled gate, staleTime, refetchOnWindowFocus, error-shape handling), and the Shell `displayName` composition handles its documented edge cases correctly.

Two Critical defects were found, both in `src/auth.jsx`, both untested by the current suite:

1. `currentBranch` is seeded in three places but never cleared on sign-out/expiry, so a departing staff member's branch can silently carry over and be attributed to the next person who signs in on the same running app instance (a normal operating mode for this shared-terminal POS).
2. `signIn(..., remember=false)` never updates `tokenRef.current`. Because the token-rotation check in `doRefresh` compares the current session token against `tokenRef.current`, a "don't remember me" sign-in is misclassified as a token rotation on its first scheduled refresh, and the token gets persisted to disk anyway — silently defeating the user's opt-out.

## Critical Issues

### CR-01: Stale `currentBranch` survives sign-out / session-expiry and leaks into the next session

**File:** `src/auth.jsx:83-102` (`expireSession`), `src/auth.jsx:218-228` (`signOut`), `src/auth.jsx:167-215` (`signIn`)

**Issue:** `currentBranch` is seeded from `getMe()` at three call sites — cold-start restore (line 127), `signIn` (line 190), and the D-04 focus-retry backstop (line 158) — but is **never cleared**. `authUser` is explicitly reset to `null` in both `expireSession()` (line 88) and `signOut()` (line 225), and is optimistically overwritten again at the top of `signIn()` (line 183) — but `currentBranch` has no equivalent reset anywhere in the file.

Concrete failure sequence on a shared terminal (the app's normal operating mode per `CLAUDE.md`):

1. Staff member A signs in → `getMe()` resolves → `currentBranch = { id: 'branch-A', ... }`.
2. A signs out (or their session expires via `expireSession()`) → `authUser` is cleared but `currentBranch` still holds `branch-A`.
3. Staff member B signs in on the same running instance. `signIn()` does not reset `currentBranch` before calling `getMe()`. If that call fails (network/5xx — explicitly treated as "non-fatal" at line 191-193), `currentBranch` is left as `branch-A` while B is now signed in and displayed by name.
4. The D-04 focus-retry backstop guards with `if (!isAuthenticated || currentBranch || !client) return;` (line 154) — since `currentBranch` is still truthy, the backstop treats it as already resolved and never retries, so the stale branch persists for the remainder of B's session.

Any branch-scoped feature built on `currentBranch` will silently operate against the wrong branch for staff member B. This is a data-integrity/session-isolation defect, not cosmetic.

Untested: `src/__tests__/auth-token.test.jsx`'s `BSTATE-01` and `D-04` describe blocks explicitly do `useAppStore.setState({ ..., currentBranch: null, ... })` in `beforeEach`, which resets the exact field this bug leaves stale, so the suite cannot observe the real-world carryover scenario.

**Fix:**
```js
// expireSession()
function expireSession() {
  if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
  setClient(null);
  setToken(null);
  setIsAuthenticated(false);
  setAuthUser(null);
  setCurrentBranch(null); // prevent stale branch leaking into the next session
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
  setCurrentBranch(null); // prevent stale branch leaking into the next session
  setError(null);
  setScreen('orders');
}

// signIn() — reset before the (possibly-failing) getMe() re-seeds it
setAuthUser(user); // optimistic fill from the signIn response
setCurrentBranch(null); // clear any previous session's branch before getMe() re-seeds it
```

### CR-02: `remember=false` sign-in still gets persisted to disk on the next token refresh

**File:** `src/auth.jsx:167-215` (`signIn`), `src/auth.jsx:64-81` (`doRefresh`)

**Issue:** `tokenRef.current` is only updated inside the `if (remember)` branch of `signIn`:
```js
setToken(token);
if (remember) {
  await persistToken(token); // AUTH-02
  tokenRef.current = token;
}
```
When `remember` is `false`, `tokenRef.current` is left at whatever it was before (typically `null`, its initial `useRef(null)` value, on a fresh app instance with no prior remembered session).

`doRefresh` uses `tokenRef.current` purely to detect server-side token rotation:
```js
const { session } = await adminClient.auth.getSession();
if (session?.token && session.token !== tokenRef.current) {
  tokenRef.current = session.token;
  setToken(session.token);
  try { await persistToken(session.token); } catch { /* non-fatal */ }
  ...
}
```
Because `tokenRef.current` was never set for a `remember=false` sign-in, the very first scheduled refresh (`scheduleRefresh` fires ~5 minutes before expiry, per `REFRESH_LEAD_MS`) sees `session.token !== null` and misclassifies the *unchanged* token as a rotation — which unconditionally calls `persistToken(session.token)`, writing the auth token to `preferences.json` on disk even though the user explicitly opted out of "remember me." This silently defeats the AUTH-02 opt-out for any session that stays open long enough to hit a scheduled refresh (which is the common case, not an edge case).

**Fix:** Track the "remember" choice for the life of the session (e.g. a ref) and only persist during rotation-handling when that choice is true; also set `tokenRef.current = token` unconditionally in `signIn` (not just when `remember`), since it's meant to track "current known token," not "should persist":
```js
const rememberRef = useRef(false);
// in signIn:
tokenRef.current = token;         // always track current token for rotation detection
rememberRef.current = remember;
if (remember) {
  await persistToken(token);
}
// in doRefresh's rotation branch:
tokenRef.current = session.token;
setToken(session.token);
if (rememberRef.current) {
  try { await persistToken(session.token); } catch { /* non-fatal */ }
}
```

## Warnings

### WR-01: `getMe()`-seeding logic duplicated three times (DRY violation, root cause of CR-01)

**File:** `src/auth.jsx:124-134` (cold-start), `src/auth.jsx:151-164` (focus-retry), `src/auth.jsx:187-193` (signIn)

**Issue:** The pattern `const me = await adminClient.auth.getMe(); setAuthUser(me); setCurrentBranch(me.selectedBranch);` (with slightly different catch handling per seam) is duplicated across three call sites. This duplication is exactly what let CR-01 slip through — a shared helper would make "reset-then-reseed" a single choke point instead of three independently maintained copies, and would avoid a future `CurrentUser` contract change (e.g. renaming `selectedBranch`) requiring three synchronized edits.

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

### WR-02: Focus-retry backstop conflates "legitimately no branch," "auth expired (401)," and "transient failure" into one silent catch-all

**File:** `src/auth.jsx:151-164`

**Issue:**
```js
function handleFocus() {
  const { isAuthenticated, currentBranch } = useAppStore.getState();
  if (!isAuthenticated || currentBranch || !client) return;
  client.auth.getMe()
    .then((me) => { setAuthUser(me); setCurrentBranch(me.selectedBranch); })
    .catch(() => { /* non-fatal — will retry on next focus event */ });
}
```
Unlike the other two `getMe()` call sites in this same file (cold-start line 128-133, `signIn` — no explicit 401 handling but at least logs a warning), this handler swallows every rejection identically, including a genuine `401`. The cold-start and `signIn` seams both special-case `meErr?.status === 401` to call `expireSession()`; this one does not. Consequences:
- If the session has genuinely expired (401) while the app was backgrounded, this handler retries silently forever instead of ever calling `expireSession()` — the user is left signed-in-but-broken with no path back to the login screen via this seam.
- Separately, if `getMe()` legitimately resolves with `selectedBranch: null` (a valid state, not an error), `currentBranch` stays falsy forever, so the `!currentBranch` guard is true on every single `focus` event for the life of the session — firing an unthrottled `getMe()` call every time the window regains focus, with no backoff and no "already tried, got a real answer" tracking.

**Fix:** Special-case 401 the same way the other two seams do, and track "already resolved (even to null)" separately from `currentBranch` truthiness, e.g.:
```js
function handleFocus() {
  const { isAuthenticated, currentBranch } = useAppStore.getState();
  if (!isAuthenticated || currentBranch || !client) return;
  client.auth.getMe()
    .then((me) => { setAuthUser(me); setCurrentBranch(me?.selectedBranch ?? null); })
    .catch((meErr) => {
      if (meErr?.status === 401) expireSession();
      // else: non-fatal — will retry on next focus event
    });
}
```

### WR-03: `doRefresh`'s fallback path relies on an unguarded property access throwing to trigger cleanup

**File:** `src/auth.jsx:64-81`

**Issue:**
```js
async function doRefresh(adminClient) {
  try {
    const { session } = await adminClient.auth.getSession();
    if (session?.token && session.token !== tokenRef.current) {
      ...
      return;
    }
    scheduleRefresh(session.expiresAt, adminClient);
  } catch {
    expireSession();
  }
}
```
If `getSession()` resolves `{ session: null }` — a shape this very file's own tests deliberately mock (e.g. `auth-token.test.jsx:58, 87, ...`) — `session?.token` is falsy, so execution falls through to `scheduleRefresh(session.expiresAt, adminClient)`, where `session` is `null`. This throws a `TypeError` that happens to be caught by the surrounding `catch` and happens to route to `expireSession()`. The current behavior is arguably reasonable (session gone ⇒ log out), but it works by *coincidence* of an unhandled exception rather than by intent — any future refactor that adds differentiated handling inside that `catch` (e.g. distinguishing network errors from an explicit `session: null`) will silently inherit this accidental control flow.

**Fix:** Make the "no session" case explicit:
```js
const { session } = await adminClient.auth.getSession();
if (!session) { expireSession(); return; }
if (session.token && session.token !== tokenRef.current) { ... }
scheduleRefresh(session.expiresAt, adminClient);
```

### WR-04: Debug `console.log`/`console.warn`/`console.error` statements shipped in the auth flow

**File:** `src/auth.jsx:111, 118, 136, 192, 199, 203`

**Issue:** Several debug-oriented console statements ship unconditionally in the cold-start and sign-in paths, e.g. `console.log('[auth:cold] readToken →', token ? \`present (${String(token).length} chars)\` : 'null — will show login')`. These run in every production build (no `import.meta.env.DEV` gate) and leak internal auth-flow details — token presence and length, `getMe()`/`getSession()` failure reasons — into devtools.

**Fix:** Remove them, or gate behind `if (import.meta.env.DEV) console.log(...)`.

### WR-05: `ORD-02` store test exercises role values that don't exist in the app

**File:** `src/__tests__/store.test.js:143-158`

**Issue:**
```js
describe('ORD-02: role switch reflects in store', () => {
  test('setRole("boh") updates role to boh', () => {
    useAppStore.getState().setRole('boh')
    expect(useAppStore.getState().role).toBe('boh')
    useAppStore.getState().setRole('cashier')
  })
  test('setRole("foh") updates role back to foh', () => { ... })
})
```
`src/store.js:47` documents the only valid `role` values as `'cashier'|'kitchen'`; `'boh'`/`'foh'` (back-of-house/front-of-house) are not used anywhere else in this codebase. Since `setRole` is a generic unguarded setter, this test would pass identically whether or not `role` handling is correct for the app's actual values — it provides no real regression coverage for `ORD-02` and reads as a copy/paste artifact from a different naming scheme.

**Fix:** Use the documented values, e.g. assert switching between `'cashier'` and `'kitchen'`.

## Info

### IN-01: `me.selectedBranch` / `me` accessed without a defensive null-check on `me` itself

**File:** `src/auth.jsx:127, 158, 190`

**Issue:** All three `getMe()`-seeding call sites do `setCurrentBranch(me.selectedBranch)`, assuming `me` is always a truthy object per the documented "throwing contract." If a future SDK version (or a misconfigured mock) resolves `getMe()` to `undefined`/`null` instead of throwing, this throws a `TypeError` inside the `try` block that is then silently swallowed by the surrounding `catch (meErr)` (since `meErr.status` won't be `401`), compounding CR-01 by leaving `currentBranch` unset with no visible error.

**Fix:** `setCurrentBranch(me?.selectedBranch ?? null);` — cheap insurance, and naturally falls out of the WR-01 helper extraction.

### IN-02: Toast `id: Date.now()` can collide

**File:** `src/auth.jsx:91`

**Issue:** `expireSession()` pushes a toast with `id: Date.now()`. If two toasts are pushed within the same millisecond (plausible if another code path pushes a toast around the same time as a session expiry), `dismissToast(id)` (`src/store.js:110`, `t.id !== id`) would dismiss both, since IDs are not unique in that scenario.

**Fix:** Use a monotonically increasing counter or `crypto.randomUUID()` for toast IDs instead of `Date.now()`.

---

_Reviewed: 2026-07-22T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
