# Phase 17: Centralized Branch-Access Error Handling - Pattern Map

**Mapped:** 2026-07-23
**Files analyzed:** 8 (7 modified, 1 conceptually new export — `handleBranchError` lives inside an existing file, `NoBranchAccessBlock` is a new component inside `app.jsx` or its own file)
**Analogs found:** 8 / 8

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|--------------------|------|-----------|-----------------|---------------|
| `src/use-branches.js` (`handleBranchError` export) | utility/service (error-recovery dispatcher) | event-driven (cache-level callback) | `unwrapSdkResult` (`src/data.jsx:200-209`) + `useBranchSwitch`'s inline err.code attach (`src/use-branches.js:31-40`) | exact (same file, same `err.code` convention) |
| `src/main.jsx` (QueryClient wiring) | config | request-response (global error choke point) | itself — bare `new QueryClient()` (`src/main.jsx:8`) | exact (modify in place) |
| `NoBranchAccessBlock` (new component, likely `app.jsx` or a new `no-branch-access.jsx`) | component (full-screen blocking gate) | request-response / static-content | `EmptyBlock` (`src/screen-history.jsx:218-243`) for box-less muted-foreground convention; `SwitchingOverlay` (`src/app.jsx:523-540`) for heading token/spinner-button precedent; `LoginScreen` gate (`src/app.jsx:321-338`) for "supersede Shell entirely" precedent | role-match (composite: layout from EmptyBlock, top-level gate mechanics from LoginScreen/SwitchingOverlay) |
| `src/store.js` (`noBranchAccess` flag + setter) | store/model (session-only flag) | CRUD (simple set) | `branchSwitcherForceOpen` field + `setBranchSwitcherForceOpen` (`src/store.js:69-72`, `121`) | exact |
| `src/app.jsx` (`fireSwitch` trim, D-05) | controller (mutation error callback) | request-response | itself — current `onError` (`src/app.jsx:217-227`) | exact (modify in place) |
| `src/app.jsx` (top-level `noBranchAccess` gate + Retry) | controller (top-level route gate) | request-response | `coldStartBusy`/`!isAuthenticated` early-return gates (`src/app.jsx:316-338`) | exact |
| `src/use-sse.js` (`onopen` 403 extension) | service (stream event handler) | streaming | itself — Phase 15 capture scaffold (`src/use-sse.js:54-66`) | exact (modify in place) |
| `src/auth.jsx` (focus listener generalization) | provider/hook (revalidation) | event-driven | itself — D-04 focus listener (`src/auth.jsx:167-181`) + `seedFromMe` helper (`src/auth.jsx:96-106`) | exact (modify in place) |
| `src/shell.jsx` (`branchMenuOpen` ← `branchSwitcherForceOpen` wiring) | component (popover open-state) | event-driven | itself — local `branchMenuOpen` `useState` (`src/shell.jsx:47-59`) | exact (modify in place) |
| `src/i18n.jsx` (new RO/EN keys) | config (i18n dictionary) | static-content | existing `branch_switch_error_title`/`branch_overlay_*`/`branch_cart_discard_*` key blocks (`src/i18n.jsx:210-219`, `470-479`) | exact |

## Pattern Assignments

### `src/use-branches.js` — `handleBranchError(err, queryClient)` (NEW export)

**Analog 1 — `err.code` convention:** `src/data.jsx:195-209` (`unwrapSdkResult`) and `src/use-branches.js:31-40` (`useBranchSwitch`'s inline copy).

```js
// src/data.jsx:200-209
export function unwrapSdkResult(result, fallbackMessage) {
  if (result.error) {
    const raw = result.error;
    const message = (typeof raw === 'string' ? raw : raw?.error) ?? fallbackMessage;
    const err = new Error(message);
    err.code = message; // same string serves as the matchable code (Phase 17 consumes err.code)
    throw err;
  }
  return result.data;
}
```
```js
// src/use-branches.js:31-40 (useBranchSwitch's own copy of the same convention)
mutationFn: async (branch) => {
  const result = await client.me.branches.switch({ body: { branchId: branch.id } });
  if (result.error) {
    const raw = result.error;
    const message = (typeof raw === 'string' ? raw : raw?.error) ?? 'Failed to switch branch';
    const err = new Error(message);
    err.code = message; // matches data.jsx's unwrapSdkResult convention — Phase 17 will consume this
    throw err;
  }
  return result.data;
},
```
**Takeaway:** `handleBranchError` must guard on `err?.code` (a bare string), never assume a typed enum. Every branch-scoped hook (`use-orders`, `use-menu`, `use-stats`, `use-order-detail`, `use-history-orders`, `use-delivery-areas`, `use-restaurant-settings`) already throws through `unwrapSdkResult`, so no hook needs modification for BERR-01/02 coverage — only the global `onError` needs wiring (see `main.jsx` below).

**Analog 2 — module-scope `useAppStore.getState()` (non-hook) reads:** `src/auth.jsx:173` (inside the D-04 focus listener, a plain function, not a hook) and `src/auth.jsx:119` (inside `expireSession`, also a plain function using `useAppStore.getState().lang`).

```js
// src/auth.jsx:172-178 — the exact non-hook getState() pattern to mirror
function handleFocus() {
  const { isAuthenticated, currentBranch } = useAppStore.getState();
  if (!isAuthenticated || currentBranch || !client) return;
  seedFromMe(client, { onUnauthorized: () => expireSession() });
}
```
```js
// src/auth.jsx:116-123 — getState() used for a one-off read inside a plain function (expireSession)
pushToast({
  id: Date.now(),
  kind: 'alert',
  title: useAppStore.getState().lang === 'ro'
    ? 'Sesiunea a expirat — te rugăm să te autentifici din nou'
    : 'Session expired — please log in again',
  detail: '',
});
```
**Takeaway:** `handleBranchError(err, queryClient)` is a plain exported function (not a hook) — read `pushToast`, `setBranchSwitcherForceOpen`, `setNoBranchAccess`, `currentBranch`, `lang` all via one `useAppStore.getState()` destructure at the top, exactly like `handleFocus` does. This makes it callable from `main.jsx`'s module scope (inside `QueryCache`/`MutationCache` `onError`, which is not a React component).

**Core dispatch pattern (sketch, from RESEARCH.md, already codebase-consistent):**
```js
export const BRANCH_CODES = ['BRANCH_INACTIVE', 'BRANCH_ACCESS_REVOKED', 'NO_BRANCH_ACCESS'];

export function handleBranchError(err, queryClient) {
  const code = err?.code;
  if (!BRANCH_CODES.includes(code)) return;

  const { pushToast, setBranchSwitcherForceOpen, setNoBranchAccess, currentBranch } = useAppStore.getState();

  if (code === 'NO_BRANCH_ACCESS') {
    setNoBranchAccess(true);
    return;
  }
  // BRANCH_INACTIVE / BRANCH_ACCESS_REVOKED — per-code toast copy (D-03), same recovery
  pushToast({ id: Date.now(), kind: 'error', title: /* per-code i18n */, detail: /* per-code i18n, interpolated */ });
  setBranchSwitcherForceOpen(true);
  queryClient.invalidateQueries({ queryKey: ['branches'] });
}
```

**Toast shape analog:** `pushToast` action (`src/store.js:113`, `{ id, kind, title, detail }`) and an existing call site — `src/app.jsx:221-226` (the very toast D-05 trims):
```js
// src/app.jsx:221-226 — the exact { id, kind, title, detail } shape to reuse for the new per-code toasts
pushToast({
  id: Date.now(),
  kind: 'error',
  title: t('branch_switch_error_title'),
  detail: t('branch_switch_error_detail'),
});
```

---

### `src/main.jsx` — QueryCache/MutationCache `onError` wiring (MODIFIED)

**Analog:** itself, current state.

```js
// src/main.jsx:1-14 (current, bare QueryClient — the exact insertion point)
import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import './colors_and_type.css';
import './styles.css';
import App from './app.jsx';

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById('root')).render(
  <QueryClientProvider client={queryClient}>
    <App />
  </QueryClientProvider>
);
```
**Target shape** (per RESEARCH.md Pattern 1, already locked): import `QueryCache`, `MutationCache` alongside `QueryClient`; import `handleBranchError` from `./use-branches.js`; construct `queryClient` with `queryCache: new QueryCache({ onError: (err) => handleBranchError(err, queryClient) })` and `mutationCache: new MutationCache({ onError: (err) => handleBranchError(err, queryClient) })`. Note the self-reference: `queryClient` must be declared with `let`/hoisted appropriately since the `onError` closures reference the same `queryClient` being constructed — follow RESEARCH.md's exact snippet (lines 187-200 of RESEARCH.md), which already resolves this via the `new QueryClient({...})` single-expression form (the `onError` closures capture the outer `const queryClient` binding, valid due to closure timing — the callbacks only invoke `queryClient.invalidateQueries` after construction completes, at actual error time).

---

### `NoBranchAccessBlock` (NEW component)

**Analog 1 — box-less, muted-foreground, centered "empty" convention:** `src/screen-history.jsx:218-243` (`EmptyBlock`).

```js
// src/screen-history.jsx:237-243 — the exact box-less/centered/muted-foreground convention to mirror
return (
  <div style={{ textAlign: 'center', padding: 48, color: 'var(--sc-muted-foreground)' }}>
    <div style={{ fontSize: 15, fontWeight: 600 }}>{mainLine}</div>
    <div style={{ fontSize: 13, marginTop: 4 }}>{t('h_empty_sub')}</div>
  </div>
);
```
**Note:** `17-UI-SPEC.md` locks the headline at 20px/800 (matching `SwitchingOverlay`'s heading token, not `EmptyBlock`'s 15px/600) and the body at 13px/500 — so borrow `EmptyBlock`'s box-less/centered/muted layout *approach*, not its exact type scale. Full-viewport background is `--sc-background` (not a card), per the UI-SPEC's explicit rejection of the card/scrim treatment.

**Analog 2 — heading token + icon + spinner-button precedent:** `src/app.jsx:523-540` (`SwitchingOverlay`).

```js
// src/app.jsx:526-536 — heading size/weight token (20px/800) and Icon+spin precedent to reuse
<Icon name="refresh" size={28} className="spin" style={{ color: 'var(--sc-primary)', marginBottom: 16 }} />
<div style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.25 }}>
  {t('branch_overlay_heading_prefix')} {branchName}…
</div>
{reconnecting && (
  <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--sc-muted-foreground)', marginTop: 8 }}>
    {t('branch_overlay_reconnecting')}
  </div>
)}
```
**Takeaway for Retry button in-flight state:** reuse the exact `<Icon name="refresh" className="spin" />` treatment for the "Checking…" label swap (D-02, `17-UI-SPEC.md` E1-retry `loading`).

**Analog 3 — top-level gate superseding Shell:** `src/app.jsx:316-338` (`coldStartBusy` blank-render + `!isAuthenticated` → `<LoginScreen>` early return, BEFORE `<Shell>` renders).

```js
// src/app.jsx:316-338 — the exact "supersede Shell" early-return precedent
if (coldStartBusy) {
  return <div style={{ width: '100vw', height: '100vh', background: '#fff' }} />;
}
if (!isAuthenticated) {
  return (
    <LoginScreen lang={lang} onLangChange={setLang} onSubmit={...} onForgotPassword={...} busy={authBusy} error={authError} />
  );
}
```
**Takeaway:** add a `noBranchAccess` early return in this exact same position/style (after `!isAuthenticated`, before the `<Shell>` return) — `NoBranchAccessBlock` becomes a third top-level gate, sibling to the cold-start blank screen and `LoginScreen`, not a child of `<Shell>`.

**Retry button** — `.btn-primary` class (existing, `styles.css`), matching `SwitchingOverlay`/`CartDiscardConfirm`'s footer button convention (`src/app.jsx:501-512`, `611-613`).

---

### `src/store.js` — `noBranchAccess` flag + setter (MODIFIED)

**Analog:** `branchSwitcherForceOpen` (`src/store.js:69-72`, setter `121`) — the exact sibling flag this phase's new flag should mirror field-for-field.

```js
// src/store.js:69-72 — the exact session-only flag convention to mirror for noBranchAccess
// branchSwitcherForceOpen (Phase 16, deferred from Phase 13): session-only reopen-on-403
// seam consumed by Phase 17's recovery flow. This phase adds the field + setter with ZERO
// call sites setting it true (D-12) — wired minimally, not consumed yet.
branchSwitcherForceOpen: false,
```
```js
// src/store.js:121 — the exact setter convention
setBranchSwitcherForceOpen: (v) => set({ branchSwitcherForceOpen: v }),
```
**Placement:** add `noBranchAccess: false,` alongside `currentBranch`/`branchSwitcherForceOpen` in the "Auth state (session-only, NOT persisted)" block (`store.js:65-72`), plus `setNoBranchAccess: (v) => set({ noBranchAccess: v }),` beside `setBranchSwitcherForceOpen` (`store.js:121`).

**partialize exclusion pattern:** `src/store.js:126-134` — the `partialize` function is an explicit allowlist of 6 keys; `noBranchAccess` (like `currentBranch`, `branchSwitcherForceOpen`, `toasts`, `acceptDialog`) must simply **not** be added to this object — no explicit "exclusion" syntax exists, omission from the allowlist is the exclusion mechanism.

```js
// src/store.js:126-134 — the exact allowlist; noBranchAccess must NOT be added here
partialize: (state) => ({
  screen: state.screen,
  role: state.role,
  lang: state.lang,
  accent: state.accent,
  density: state.density,
  sidebarCollapsed: state.sidebarCollapsed,
}),
```

---

### `src/app.jsx` — `fireSwitch` trim (D-05) (MODIFIED)

**Analog:** itself, current `onError` (`src/app.jsx:217-227`).

```js
// BEFORE (current, src/app.jsx:217-227)
onError: () => {
  clearTimeout(bridgeTimeoutRef.current);
  setSwitchPhase('idle');
  setPendingBranch(null);
  pushToast({
    id: Date.now(),
    kind: 'error',
    title: t('branch_switch_error_title'),
    detail: t('branch_switch_error_detail'),
  });
},
```
```js
// AFTER (D-05, per RESEARCH.md Code Examples — exact target shape)
onError: (err) => {
  clearTimeout(bridgeTimeoutRef.current);
  setSwitchPhase('idle');
  setPendingBranch(null);
  if (!BRANCH_CODES.includes(err?.code)) {
    pushToast({
      id: Date.now(),
      kind: 'error',
      title: t('branch_switch_error_title'),
      detail: t('branch_switch_error_detail'),
    });
  }
},
```
**Note:** the `switchPhase`/`pendingBranch` cleanup stays unconditional (BERR-02 requires the app to visibly return to a stable state regardless of error code) — only the toast dispatch becomes conditional. Import `BRANCH_CODES` from `./use-branches.js`.

---

### `src/use-sse.js` — `onopen` 403 extension (D-08) (MODIFIED)

**Analog:** itself, the Phase 15 capture scaffold (`src/use-sse.js:48-66`).

```js
// src/use-sse.js:48-66 (current — the exact scaffold to extend)
async onopen(response) {
  if (response.ok) {
    setIsConnected(true);
    setTimeout(() => { snapshotDone.current = true; }, 100);
    return;
  }
  let body;
  try {
    body = await response.text();
  } catch {
    body = undefined;
  }
  console.warn('[SSE] non-2xx onopen', { status: response.status, body });
  throw new Error(`SSE: server returned ${response.status}`);
},
```
**Target shape** (per RESEARCH.md Pattern 2): after the `response.text()` capture, attempt `JSON.parse(body)` → extract `.error`/bare-string code, check against `BRANCH_CODES`; if matched, call `handleBranchError({ code }, queryClient)` and `return` (NOT throw) — this is the load-bearing line that stops `fetchEventSource`'s retry loop. Non-branch 403s and all other non-2xx statuses fall through unchanged to the existing `console.warn` + `throw`. `queryClient` is already available in scope via `useQueryClient()` at `use-sse.js:19`.

---

### `src/auth.jsx` — window-focus listener generalization (D-06/D-07) (MODIFIED)

**Analog:** itself, the exact D-04 listener (`src/auth.jsx:167-181`) plus `seedFromMe` (`96-106`).

```js
// src/auth.jsx:167-181 (current — gated on "only if currentBranch is null", must generalize)
useEffect(() => {
  function handleFocus() {
    const { isAuthenticated, currentBranch } = useAppStore.getState();
    if (!isAuthenticated || currentBranch || !client) return;
    seedFromMe(client, { onUnauthorized: () => expireSession() });
  }
  window.addEventListener('focus', handleFocus);
  return () => window.removeEventListener('focus', handleFocus);
}, [client]);
```
**Takeaway:** the `|| currentBranch` guard is exactly what must be removed/generalized per D-07 — replace the body with an explicit `getMe()` call + `selectedBranch` comparison (RESEARCH.md Pattern 3, already fully sketched with an `inFlight` reentrancy guard for Pitfall 4). Reuse `useAppStore.getState()` destructuring style and the existing `meErr?.status === 401 → expireSession()` handling convention (mirrors `seedFromMe`'s own catch block, `auth.jsx:102-105`).

```js
// src/auth.jsx:96-106 — seedFromMe's existing 401-catch convention to mirror in the new getMe() call
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
**Neutral info toast (D-06) shape:** same `pushToast` `{ id, kind, title, detail }` convention as above; use `kind: 'info'` if that variant exists in toast rendering, else follow the existing `kind` values used in the toast stack (`success`/`error`/`alert` seen in `app.jsx`/`auth.jsx`) — verify `.toast-icon` rendering in `app.jsx:384` only branches on `kind === 'success'` (else `zap` icon) — an `'info'` kind will render the same generic `zap` icon unless the planner adds a branch; note this for the planner as a potential UI-SPEC gap (UI-SPEC doesn't specify a distinct icon for the neutral toast, only its title/detail copy).

---

### `src/shell.jsx` — wire `branchSwitcherForceOpen` into `branchMenuOpen` (MODIFIED)

**Analog:** itself, current local-only state (`src/shell.jsx:47-59`).

```js
// src/shell.jsx:47-59 (current — purely local useState, no store wiring yet)
const [branchMenuOpen, setBranchMenuOpen] = useState(false);
const branchMenuRef = useRef(null);

useEffect(() => {
  if (!branchMenuOpen) return;
  function handleClick(e) {
    if (branchMenuRef.current && !branchMenuRef.current.contains(e.target)) {
      setBranchMenuOpen(false);
    }
  }
  document.addEventListener('mousedown', handleClick);
  return () => document.removeEventListener('mousedown', handleClick);
}, [branchMenuOpen]);
```
**Takeaway:** add a `useAppStore` subscription to `branchSwitcherForceOpen` + `setBranchSwitcherForceOpen`, and a `useEffect` that does `if (branchSwitcherForceOpen) { setBranchMenuOpen(true); setBranchSwitcherForceOpen(false); }` (consume-once pattern — force-open, then immediately reset the store flag so it doesn't re-trigger). D-04 requires the reopened popover be **dismissible** — `branchMenuOpen`'s existing outside-click-close handler already provides this for free, no new dismiss logic needed.

---

### `src/i18n.jsx` — new RO/EN keys (MODIFIED)

**Analog:** the existing `branch_*` key blocks, RO at `src/i18n.jsx:210-219`, EN mirror at `470-479`.

```js
// src/i18n.jsx:210-219 (ro block) — exact structure/key-naming convention to extend
branch_overlay_heading_prefix: 'Se comută la',
branch_overlay_reconnecting: 'Se reconectează…',
branch_switch_error_title: 'Nu s-a putut schimba filiala',
branch_switch_error_detail: 'Încearcă din nou',
branch_cart_discard_title: 'Comanda curentă va fi anulată',
branch_cart_discard_body: 'Schimbarea filialei șterge comanda POS în lucru. Continui?',
branch_cart_discard_confirm: 'Schimbă și renunță',
branch_cart_discard_cancel: 'Rămân aici',
```
```js
// src/i18n.jsx:470-479 (en mirror) — exact 1:1 key parity convention to extend
branch_overlay_heading_prefix: 'Switching to',
branch_overlay_reconnecting: 'Reconnecting…',
branch_switch_error_title: "Couldn't switch branch",
branch_switch_error_detail: 'Try again',
branch_cart_discard_title: 'Current order will be discarded',
branch_cart_discard_body: 'Switching branches discards the in-progress POS order. Continue?',
branch_cart_discard_confirm: 'Switch and discard',
branch_cart_discard_cancel: 'Stay here',
```
**New keys needed (exact copy locked by `17-UI-SPEC.md` Copywriting Contract):** `branch_err_revoked_title`/`branch_err_revoked_detail`, `branch_err_inactive_title`/`branch_err_inactive_detail`, `branch_no_access_title`/`branch_no_access_body`/`branch_no_access_retry`/`branch_no_access_retry_busy`, `branch_focus_update_title`/`branch_focus_update_prefix` — add each pair to both the `ro` block (near line 219) and the `en` block (near line 479), preserving 1:1 key parity exactly as the existing `branch_*` keys do. `<branch>` interpolation follows the same manual `${t(...)} ${branchName}` concatenation style already used for `branch_switch_success_prefix` (`src/app.jsx:267`), not a template-replace mechanism — no i18n interpolation library is in use.

`useT(lang)` signature: `src/i18n.jsx:538` — confirm exact usage `const t = useT(lang);` then `t('key')`, same as every other file in this codebase.

---

## Shared Patterns

### `err.code` matching
**Source:** `src/data.jsx:200-209` (`unwrapSdkResult`), `src/use-branches.js:31-40` (`useBranchSwitch`).
**Apply to:** `handleBranchError`, the `fireSwitch` `onError` trim, and the SSE `onopen` extension — all three must use the same `BRANCH_CODES` array (exported once from `use-branches.js`) rather than re-declaring the literal list.

### Toast dispatch
**Source:** `src/store.js:113` (`pushToast` action), call-site example `src/app.jsx:221-226`.
**Apply to:** the two per-code recoverable toasts (D-03) and the focus-revalidation neutral toast (D-06) — all use the identical `{ id: Date.now(), kind, title, detail }` shape; no new toast component/markup.

### Session-only store flags (never persisted)
**Source:** `src/store.js:69-72` (`branchSwitcherForceOpen`) and `partialize`'s allowlist (`126-134`).
**Apply to:** the new `noBranchAccess` flag — add to the session-only block, add a setter beside the others, do NOT add to `partialize`'s object.

### Non-hook module-scope store reads
**Source:** `src/auth.jsx:172-178` (`handleFocus`), `src/auth.jsx:119` (`expireSession`'s `useAppStore.getState().lang`).
**Apply to:** `handleBranchError(err, queryClient)` — must read/write the store via `useAppStore.getState()`, never `useAppStore((s) => ...)`, since it's invoked from `main.jsx`'s module-scope `QueryCache`/`MutationCache` constructors and from `use-sse.js`'s `onopen` callback, neither of which is a React render context.

### Top-level route gates superseding `<Shell>`
**Source:** `src/app.jsx:316-338` (`coldStartBusy` blank render, `!isAuthenticated` → `<LoginScreen>`).
**Apply to:** the new `noBranchAccess` early return in `app.jsx` — same "return before `<Shell>` renders" mechanics, added as a third gate in the same position.

## No Analog Found

None — every file in this phase has at least a role-match analog in the existing codebase; this phase is pure composition/wiring of already-established patterns (per RESEARCH.md's own framing: "the entire phase is composition, not construction").

## Metadata

**Analog search scope:** `src/` (all `.jsx`/`.js` source files); no `node_modules` search needed beyond the already-cited SDK type declarations (covered exhaustively in RESEARCH.md).
**Files scanned:** `src/main.jsx`, `src/use-branches.js`, `src/store.js`, `src/app.jsx`, `src/use-sse.js`, `src/auth.jsx`, `src/shell.jsx`, `src/data.jsx`, `src/screen-history.jsx`, `src/i18n.jsx`.
**Pattern extraction date:** 2026-07-23
