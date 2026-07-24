# Phase 13: Branch State & Launch Seeding Foundation - Pattern Map

**Mapped:** 2026-07-22
**Files analyzed:** 5 (4 modified, 1 new)
**Analogs found:** 5 / 5 (all in-repo; D-04 focus listener has no exact behavioral precedent but a structural one)

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|--------------------|------|-----------|-----------------|---------------|
| `src/store.js` | store | CRUD (in-memory state) | itself — `authUser`/`setAuthUser` field pair (lines 67, 114) | exact (same file, same tier) |
| `src/auth.jsx` (cold-start effect) | provider | request-response (throwing async, try/catch) | itself — `getSession()` in `doRefresh()` (lines 63-80) and `signIn()`'s `getSession()` call (149-154) | exact |
| `src/auth.jsx` (focus-retry listener, D-04) | provider | event-driven | `src/shell.jsx:27` / `src/screen-history.jsx:678-679` (`mousedown`/`keydown` listeners) — structural analog only, no `focus`-listener precedent exists | role-match (structure), net-new behavior |
| `src/shell.jsx` (displayName, line 31) | component | transform (derived display value) | itself — existing `displayName` expression at line 31 | exact (in-place edit) |
| `src/app.jsx` (coldStartBusy gate, ~224) | component | request-response (blocking gate) | itself — existing gate at lines 223-226 | exact (confirm-only, no new code) |
| `src/use-branches.js` | hook | CRUD (request-response, `{data,error}` fields style) | `src/use-stats.js` (16 lines, full file) | exact |

## Pattern Assignments

### `src/store.js` (store, CRUD)

**Analog:** itself — `authUser` field (line 67), `setAuthUser` action (line 114), `partialize` (lines 120-127)

**State field pattern** (line 66-67):
```javascript
// --- Auth state (session-only, NOT persisted — set by AuthProvider on cold start) ---
isAuthenticated: false,
authUser: null,
```
Add directly below:
```javascript
currentBranch: null,   // SelectedBranch | null; session-only; NEVER in partialize (D-10)
```

**Action pattern** (line 113-114):
```javascript
setIsAuthenticated: (v) => set({ isAuthenticated: v }),
setAuthUser: (user) => set({ authUser: user }),
```
Add directly below:
```javascript
setCurrentBranch: (branch) => set({ currentBranch: branch }),
```

**Partialize exclusion pattern** (lines 119-127) — `authUser`/`isAuthenticated` are already correctly absent from this list; `currentBranch` must follow the same omission, not be added:
```javascript
partialize: (state) => ({
  screen: state.screen,
  role: state.role,
  lang: state.lang,
  accent: state.accent,
  density: state.density,
  sidebarCollapsed: state.sidebarCollapsed,
  // currentBranch intentionally NOT listed
}),
```

---

### `src/auth.jsx` — cold-start effect (provider, request-response)

**Analog:** `doRefresh()`'s `getSession()` try/catch (lines 63-80) and `signIn()`'s catch block reading `err?.status` (lines 156-165). **Do NOT** use the `{data,error}` fields-style unwrap seen in `use-stats.js` — `getMe()` throws.

**Existing cold-start effect to extend** (lines 106-128):
```javascript
useEffect(() => {
  (async () => {
    try {
      const token = await readToken();
      if (!token) return;
      tokenRef.current = token;
      setToken(token);
      const adminClient = createAdminClient({ baseUrl: BASE_URL, sessionToken: token });
      setClient(adminClient);
      setIsAuthenticated(true);
    } catch (e) {
      console.error('[auth:cold] token read failed:', e?.message ?? e);
    } finally {
      setColdStartBusy(false);
    }
  })();
  return () => { if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current); };
}, []); // eslint-disable-line react-hooks/exhaustive-deps
```

**Throwing-contract try/catch pattern to insert** (after `setIsAuthenticated(true)`, before the outer `try` block ends — so it runs before `finally { setColdStartBusy(false); }`, matching Pitfall 2):
```javascript
try {
  const me = await adminClient.auth.getMe();
  setAuthUser(me);
  setCurrentBranch(me.selectedBranch);
} catch (err) {
  if (err?.status === 401) {
    expireSession(); // reuse existing function — D-03
  }
  // else: non-401 — stay signed in, currentBranch stays null (D-03)
}
```

**err?.status read precedent** (existing, `signIn()` catch block, lines 156-165):
```javascript
} catch (err) {
  console.error('[auth] signIn error:', err);
  const status = err?.status;
  if (status === 401 || status === 403) {
    setError('creds');
  } ...
```

**expireSession() to reuse as-is** (lines 82-101) — no modification needed, D-03's 401 branch calls this existing function directly.

---

### `src/auth.jsx` — `signIn()` (provider, request-response)

**Analog:** itself, existing `signIn()` body (lines 131-169) — same `getMe()` try/catch pattern as the cold-start effect, inserted as a second, independent seam.

**Existing seam to extend** (lines 144-154):
```javascript
const adminClient = createAdminClient({ baseUrl: BASE_URL, sessionToken: token });
setClient(adminClient);
setIsAuthenticated(true);
setAuthUser(user);
// Try to get session for refresh timer — non-fatal if it fails
try {
  const { session } = await adminClient.auth.getSession();
  if (session?.expiresAt) scheduleRefresh(session.expiresAt, adminClient);
} catch (sessionErr) {
  console.warn('[auth] getSession after signIn failed (non-fatal):', sessionErr);
}
```
Add a `getMe()` try/catch of the same shape (non-fatal on any failure, per D-07) either replacing or supplementing `setAuthUser(user)` — planner's discretion on ordering:
```javascript
try {
  const me = await adminClient.auth.getMe();
  setAuthUser(me);
  setCurrentBranch(me.selectedBranch);
} catch (meErr) {
  console.warn('[auth] getMe after signIn failed (non-fatal):', meErr);
  // currentBranch stays null; D-04 focus-retry is the backstop
}
```

---

### `src/auth.jsx` — D-04 focus-retry listener (provider, event-driven)

**Analog:** No exact precedent — this codebase's only existing `window`-adjacent listeners are `mousedown`/`keydown` in `src/shell.jsx:27` and `src/screen-history.jsx:678-679` (attach/detach `useEffect` shape only, not the `focus` event itself). Build net-new inside `AuthProvider`, following the attach/cleanup shape those listeners use.

**Structural shape to follow** (attach on mount, cleanup on unmount/dep-change) — generic `useEffect` add/remove-listener idiom already used in this codebase (`shell.jsx:27`, `screen-history.jsx:678-679`):
```javascript
useEffect(() => {
  window.addEventListener('<event>', handler);
  return () => window.removeEventListener('<event>', handler);
}, [/* deps */]);
```

**Concrete D-04 implementation** (net-new, no existing analog for the `focus` event or the getMe-retry body — verified against research Code Example §2):
```javascript
useEffect(() => {
  function handleFocus() {
    const { isAuthenticated, currentBranch } = useAppStore.getState();
    if (!isAuthenticated || currentBranch || !client) return;
    client.auth.getMe()
      .then((me) => {
        setAuthUser(me);
        setCurrentBranch(me.selectedBranch);
      })
      .catch(() => { /* non-fatal — will retry on next focus event */ });
  }
  window.addEventListener('focus', handleFocus);
  return () => window.removeEventListener('focus', handleFocus);
}, [client]);
```

---

### `src/shell.jsx` (component, transform)

**Analog:** itself — existing `displayName` line to be edited in place.

**Existing pattern** (line 31):
```javascript
const displayName = authUser?.name ?? authUser?.email ?? 'Eduard Albu';
```

**Updated pattern (D-06)** — compose `firstName`/`lastName` from `getMe()`'s `CurrentUser` shape, fall back to the old `.name`/`.email`/hardcoded chain so any signIn()-optimistic-fill shape (if kept) still works:
```javascript
const displayName =
  [authUser?.firstName, authUser?.lastName].filter(Boolean).join(' ') ||
  authUser?.name ||
  authUser?.email ||
  'Eduard Albu';
```
No other line in `shell.jsx` needs modification — `initials` (line 32) derives from `displayName` and needs no change.

---

### `src/app.jsx` (component, request-response — confirm only, no new code)

**Analog:** itself — existing `coldStartBusy` gate (lines 223-226), unmodified.

**Existing gate to confirm still wraps the (now longer) cold-start effect correctly:**
```javascript
if (coldStartBusy) {
  // Cold-start: keychain check in progress — render blank while awaiting result
  return <div style={{ width: '100vw', height: '100vh', background: '#fff' }} />;
}
```
No edit needed in this file this phase — D-01/D-02 rely on `auth.jsx`'s existing `finally { setColdStartBusy(false); }` running only after the new `getMe()` call resolves/throws (see Pitfall 2 in RESEARCH.md). Verify the diff to `auth.jsx` does not move the `getMe()` call after this `finally`.

---

### `src/use-branches.js` (hook, CRUD, request-response)

**Analog:** `src/use-stats.js` (full 16-line file, exact structural mirror)

**Full analog source** (`src/use-stats.js`, all 16 lines):
```javascript
import { useQuery } from '@tanstack/react-query';
import { useAuth } from './auth.jsx';

export function useStats() {
  const { client } = useAuth();
  return useQuery({
    queryKey: ['stats'],
    queryFn: async () => {
      const result = await client.admin.dashboard.getToday();
      if (result.error) throw new Error(result.error.error ?? 'Failed to load stats');
      return result.data;
    },
    enabled: !!client,
    staleTime: 30_000,
  });
}
```

**New file, mirroring the above 1:1** with `client.me.branches.list()` swapped in (this SDK call DOES follow the `{data,error}` fields style — unlike `getMe()`):
```javascript
import { useQuery } from '@tanstack/react-query';
import { useAuth } from './auth.jsx';

export function useBranches() {
  const { client } = useAuth();
  return useQuery({
    queryKey: ['branches'],
    queryFn: async () => {
      const result = await client.me.branches.list();
      if (result.error) throw new Error(result.error.error ?? 'Failed to load branches');
      return result.data; // AccessibleBranch[]
    },
    enabled: !!client,             // sole gate — NEVER add !!currentBranch/!!branchId (Pitfall 5/11)
    staleTime: 30_000,             // finite, matches use-stats.js precedent
    refetchOnWindowFocus: true,    // explicit per D-09 (TanStack default is already true)
  });
}
```

---

## Shared Patterns

### Session-only Zustand field (mirrors `authUser`)
**Source:** `src/store.js:67` (field), `:114` (action), `:120-127` (partialize exclusion)
**Apply to:** `currentBranch` in `store.js` only, this phase.
```javascript
authUser: null,                              // existing precedent field
setAuthUser: (user) => set({ authUser: user }), // existing precedent action
// partialize omits both authUser and (new) currentBranch — never list session-only auth fields here
```

### `getMe()` throwing-contract (NOT `{data,error}`)
**Source:** `node_modules/@charlyk/admin-client/dist/index.mjs:1619-1623` (verified in RESEARCH.md); calling-convention precedent is `src/auth.jsx`'s `getSession()` try/catch (lines 63-80, 149-154), not `use-stats.js`'s `if (result.error)` style.
**Apply to:** All three `getMe()` call sites — cold-start effect, `signIn()`, D-04 focus-retry.
```javascript
try {
  const me = await adminClient.auth.getMe();
  setAuthUser(me);
  setCurrentBranch(me.selectedBranch);
} catch (err) {
  if (err?.status === 401) { expireSession(); }
  // else non-401: swallow, stay signed in, currentBranch stays null
}
```

### `{data,error}` fields-style (existing convention, applies to `me.branches.list()` only)
**Source:** `src/use-stats.js:9-11` and every other `use-*.js` hook in `src/`.
**Apply to:** `use-branches.js`'s `queryFn` only — `getMe()` does NOT use this convention (see above).
```javascript
const result = await client.<namespace>.<method>();
if (result.error) throw new Error(result.error.error ?? 'Failed to load <resource>');
return result.data;
```

### `enabled: !!client` sole gate (existing convention across all hooks)
**Source:** `src/use-stats.js:13` and all sibling `use-*.js` hooks.
**Apply to:** `use-branches.js`. Never extend to `!!currentBranch`/`!!branchId` (Pitfall 5/11 — explicit anti-pattern for this phase and the whole v1.2 milestone).

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| D-04 focus-retry listener body (inside `src/auth.jsx`) | provider (effect) | event-driven | No `window.addEventListener('focus', ...)` exists anywhere in this codebase; only `mousedown`/`keydown` listeners exist as structural (attach/cleanup) precedent. The retry body itself (re-call `getMe()` while `currentBranch` is null) is net-new logic with no in-repo analog — build from RESEARCH.md Code Example §2 directly. |

## Metadata

**Analog search scope:** `src/` (flat structure, no subdirectories) — `store.js`, `auth.jsx`, `shell.jsx`, `app.jsx`, `use-stats.js`, `use-orders.js`, `use-menu.js`, `screen-history.jsx`
**Files scanned:** 8
**Pattern extraction date:** 2026-07-22
</content>
