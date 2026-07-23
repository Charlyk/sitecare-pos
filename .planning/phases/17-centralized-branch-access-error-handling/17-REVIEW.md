---
phase: 17-centralized-branch-access-error-handling
reviewed: 2026-07-24T00:00:00Z
depth: standard
files_reviewed: 9
files_reviewed_list:
  - src/use-branches.js
  - src/main.jsx
  - src/shell.jsx
  - src/store.js
  - src/app.jsx
  - src/no-branch-access.jsx
  - src/use-sse.js
  - src/auth.jsx
  - src/i18n.jsx
findings:
  critical: 2
  warning: 2
  info: 1
  total: 5
status: issues_found
---

# Phase 17: Code Review Report

**Reviewed:** 2026-07-24T00:00:00Z
**Depth:** standard
**Files Reviewed:** 9
**Status:** issues_found

## Summary

Reviewed the nine source files that implement the centralized branch-access error handling
choke point: `handleBranchError` (use-branches.js), its QueryCache/MutationCache wiring
(main.jsx), the SSE onopen 403 short-circuit (use-sse.js), the window-focus revalidation
generalization (auth.jsx), the `NO_BRANCH_ACCESS` terminal block (no-branch-access.jsx / app.jsx),
the consume-once popover reopen seam (shell.jsx), the session-only store flags (store.js), and
i18n key parity (i18n.jsx).

The `noBranchAccess`/`partialize` correctness, the non-optimistic Retry semantics, the reentrancy
guard in `handleFocus`, and i18n key parity are all sound. However, two BLOCKER-level defects were
found that directly undermine this phase's two headline correctness claims:

1. The SSE "return-not-throw" contract that is supposed to prevent a retry storm on a
   branch-inaccessible connection does **not** actually prevent retries — it was verified
   empirically (Node repro + reading `@microsoft/fetch-event-source`'s source) that the library
   still throws internally right after `onopen` returns cleanly, landing back in the same
   retry-scheduling path the code is trying to avoid.
2. The `noBranchAccess` session flag is never reset on `signOut()`/`expireSession()` (or `signIn()`),
   so it leaks across a sign-out→sign-in cycle within the same running app process — a real risk on
   a shared POS terminal, where the *next* staff member to log in can be incorrectly blocked by a
   stale "No branch available" screen that belonged to the *previous* user's session.

## Critical Issues

### CR-01: SSE branch-403 "return-not-throw" does not actually stop the retry loop — the library throws internally anyway

**File:** `src/use-sse.js:76-99`
**Issue:**
The onopen handler for a non-2xx response reads the body via `response.text()` (line 78) before
deciding what to do. For a recognized branch code it then **returns without throwing** (lines
88-94), on the stated theory that "throwing would re-enter fetchEventSource's retry loop."

That theory is false, because `response.text()` at line 78 already fully consumes/locks
`response.body`. `@microsoft/fetch-event-source`'s `create()` loop
(`node_modules/@microsoft/fetch-event-source/lib/esm/fetch.js:50-52`) unconditionally does:
```js
const response = await fetch(...);
await onopen(response);                       // resolves normally — no throw
await getBytes(response.body, ...);            // <-- runs next, unconditionally
```
and `getBytes` (`.../lib/esm/parse.js:1-2`) does `const reader = stream.getReader();`. Since
`response.body` was already drained by `response.text()` in `onopen`, this `getReader()`/`read()`
call throws (verified empirically — Node's native `fetch`/`Response` implementation throws
`"Invalid state: ReadableStream is locked"` in this exact sequence). That exception is caught by
`fetch.js`'s outer `catch (err)` (line 66), which calls `onerror(err)` — `use-sse.js`'s `onerror()`
returns `undefined` — so the library falls back to `onerror?.(err) ?? retryInterval` and schedules
**another retry** via `window.setTimeout(create, interval)`.

In other words: the exact "blind exponential backoff hammering an inaccessible branch" scenario
D-08/BERR-01 says this return-not-throw contract prevents is what actually happens — just one
tick later and via a different exception, instead of via the removed `throw new Error(...)`. The
central goal of this SSE plan (retry-storm prevention on a branch-inaccessible connection) is not
met.

**Fix:** Do not consume the real `response.body` before deciding to short-circuit. Peek the body
via `response.clone()` so the original stream is left untouched for the library's subsequent
`getBytes(response.body, ...)` call (a small non-SSE-formatted error body will simply fail to
produce any parsed message and the stream will close normally, resolving `onclose()` without a
retry — no throw needed at all):
```js
let body;
try {
  body = await response.clone().text(); // clone — leaves response.body unconsumed for getBytes()
} catch {
  body = undefined;
}
if (response.status === 403) {
  const code = extractBranchCodeFromSseBody(body);
  if (code && BRANCH_CODES.includes(code)) {
    handleBranchError({ code }, queryClient);
    setIsConnected(false);
    return;
  }
}
```
If a fully deterministic shutdown (rather than relying on the drained-body-closes-cleanly
behavior) is preferred, additionally call the effect's `ctrl.abort()` before returning — aborting
the external signal makes `fetch.js`'s `curRequestController.signal.aborted` guard (line 67) true,
which unconditionally suppresses the retry-scheduling branch regardless of what `getBytes` does.

## Warnings

### WR-01: `noBranchAccess` (and `branchSwitcherForceOpen`) are never reset on sign-out/session-expiry — stale flag leaks into the next login on the same terminal

**File:** `src/auth.jsx:109-129` (`expireSession`), `src/auth.jsx:279-290` (`signOut`), `src/app.jsx:356`
**Issue:** `noBranchAccess` is set to `true` by `handleBranchError` (`use-branches.js:89`) and by
`handleFocus` (`auth.jsx:198`, `auth.jsx:220`). The *only* place that ever sets it back to `false`
is the Retry handler in `app.jsx:367`. Neither `expireSession()` nor `signOut()` in `auth.jsx`
resets it, even though both functions already explicitly reset `currentBranch` with a comment
("CR-01: prevent stale branch leaking into the next session") documenting exactly this class of
bug for a sibling field — `noBranchAccess` was evidently missed.

Because the Zustand store instance itself is not torn down across a sign-out→sign-in cycle (only
individual fields are reset by `expireSession`/`signOut`), a `true` `noBranchAccess` value
persists in memory. On a shared POS terminal: staff member A hits `NO_BRANCH_ACCESS`, then signs
out (or their session expires); staff member B then signs in successfully on the *same running
app* — `app.jsx`'s gate at line 356 (`if (noBranchAccess) return <NoBranchAccessBlock ... />`)
fires before B's own branch state is ever consulted, incorrectly blocking B with the "No branch
available" screen even if B has full, valid branch access. B's only way out is to notice the Retry
button and click it (which happens to call `getMe()` and clear the flag if B genuinely has
access) — a confusing false blocker with no on-screen explanation of why it's showing.

The session-only `branchSwitcherForceOpen` flag has the identical gap (also never reset by
`expireSession`/`signOut`) but is lower severity — a stale `true` value merely force-opens the
branch popover unexpectedly on the next session's first `Shell` mount (`shell.jsx:70-74`), rather
than blocking the whole app.

**Fix:** Reset both flags in `expireSession()` and `signOut()`, mirroring the existing
`setCurrentBranch(null)` CR-01 pattern:
```js
function expireSession() {
  ...
  setCurrentBranch(null); // CR-01: prevent stale branch leaking into the next session
  useAppStore.getState().setNoBranchAccess(false);
  useAppStore.getState().setBranchSwitcherForceOpen(false);
  ...
}

async function signOut() {
  ...
  setCurrentBranch(null); // CR-01: prevent stale branch leaking into the next session
  useAppStore.getState().setNoBranchAccess(false);
  useAppStore.getState().setBranchSwitcherForceOpen(false);
  ...
}
```
(`setNoBranchAccess`/`setBranchSwitcherForceOpen` aren't currently destructured at the top of
`AuthProvider` the way `setCurrentBranch` is — either add them to the existing
`useAppStore((s) => s...)` destructuring block, or use `useAppStore.getState()` as shown, matching
the non-hook `getState()` convention already used elsewhere in this same file's `handleFocus`.)

### WR-02: `useBranches()`'s queryFn bypasses the shared `unwrapSdkResult`/`err.code` convention that the rest of the central-choke-point design depends on

**File:** `src/use-branches.js:10-14`
**Issue:**
```js
queryFn: async () => {
  const result = await client.me.branches.list();
  if (result.error) throw new Error(result.error.error ?? 'Failed to load branches');
  return result.data; // AccessibleBranch[]
},
```
Every other branch-scoped query hook in this codebase (`use-orders.js`, `use-stats.js`,
`use-order-detail.js`, `use-restaurant-settings.js`, `use-delivery-areas.js`) routes its error
through `data.jsx`'s `unwrapSdkResult`, which is the one place that populates `err.code` — the
exact field `handleBranchError`'s guard (`use-branches.js:82-83`) matches against. This
`useBranches()` queryFn — defined in the *same file* that documents the "one central path"
contract — throws a plain `Error` with no `.code` at all. If `client.me.branches.list()` itself
ever surfaces a `BRANCH_*` error code (e.g. the branches-list endpoint enforcing some access
check), it silently bypasses `handleBranchError` entirely: no toast, no reopen, no `noBranchAccess`
gate — it only ever surfaces as `branchesError` in `Shell`'s generic error row
(`shell.jsx:205-209`, `branch_popover_error`). This is inconsistent with the file's own
documented "single choke point" invariant and easy to miss in review since the file otherwise
reads as authoritative for this convention.

**Fix:** Route through the same shared helper as every sibling hook:
```js
import { unwrapSdkResult } from './data.jsx';
...
queryFn: async () => {
  const result = await client.me.branches.list();
  return unwrapSdkResult(result, 'Failed to load branches'); // sets err.code (Phase 17 central path)
},
```

## Info

### IN-01: `store.js` header comment is stale — key/action counts no longer match after this phase's additions

**File:** `src/store.js:38`
**Issue:** The comment `// Single flat store. 9 state keys + 10 action functions.` was already
approximate before this phase, but this phase adds two more state keys (`branchSwitcherForceOpen`,
`noBranchAccess`) and one more action (`setNoBranchAccess`) to this same file without updating the
count — the store currently has 18 state keys and 19 actions. Low-impact, but a maintainer skimming
this comment gets a materially wrong picture of the store's surface area.
**Fix:** Update or remove the stale count (e.g. drop the specific numbers and just say "Persisted
keys (6, see partialize below); all other keys are session-only.").

---

_Reviewed: 2026-07-24T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
