# Phase 16: Branch Switcher UI, Switch Flow & Language Relocation - Pattern Map

**Mapped:** 2026-07-23
**Files analyzed:** 8 (5 modify, 3 new tests)
**Analogs found:** 8 / 8

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/shell.jsx` (modify) | component (presentation, popover) | request-response (read-only list + click-to-select) | `src/shell.jsx:17-29,155-168` (user-chip menu, same file) | exact |
| `src/use-branches.js` (modify, add `useBranchSwitch`) | hook / service (mutation) | CRUD (single non-optimistic write) | `src/use-order-actions.js:19-35` (`updateStatus` mutation) | exact |
| `src/store.js` (modify, add `branchSwitcherForceOpen`) | store (Zustand slice) | event-driven (session-only UI flag) | `src/store.js:61` `acceptDialog` / `soundMuted` (session-only, non-partialized fields) | exact |
| `src/app.jsx` (modify, switch orchestration) | controller / orchestrator (top-level) | event-driven + request-response (phase state machine bridging mutation + SSE) | `src/app.jsx:292-344` (`AcceptDialog`/`CancelDialog` mutate+onSuccess/onError orchestration) | exact |
| `src/screen-pos.jsx` (modify, add `onCartEmptyChange`) | component | event-driven (child→parent state bridge via callback prop) | none exact — new callback-prop pattern; closest precedent is `app.jsx`'s existing prop fan-out (`isOffline` threaded to every screen, `app.jsx:255-277`) | role-match |
| `src/screen-settings.jsx` (no change — reference only) | component | request-response | N/A — reference for language control, not a modify target | n/a |
| `src/__tests__/shell.test.jsx` (new) | test | request-response (render/interaction) | `src/__tests__/cancel-dialog.test.jsx` (render + fireEvent + assert mutate/toast) | exact |
| `src/__tests__/use-branches.test.js` (new) | test | CRUD (mutation) | `src/__tests__/use-order-actions.test.js` (mutation mock scaffold, invalidateQueries assertions) | exact |
| `src/__tests__/app-branch-switch.test.jsx` (new) | test | event-driven (fake timers, state machine) | `src/__tests__/use-sse.test.js` (fake timers, SDK mock header, `isConnected` transition assertions) + `cancel-dialog.test.jsx` (full-app render pattern) | exact |

## Pattern Assignments

### `src/shell.jsx` (component, request-response)

**Analog:** same file — user-chip menu popover (`src/shell.jsx:17-29`, `155-168`)

**Imports pattern** (lines 1-8, unchanged — add `useBranches` import):
```javascript
import { useState, useEffect, useRef } from 'react';
import { relaunch } from '@tauri-apps/plugin-process';
import { Icon } from './icons.jsx';
import { useT } from './i18n.jsx';
import { OfflineBanner } from './offline-banner.jsx';
import { BrandLogo } from './brand-logo.jsx';
import { useAppStore } from './store.js';
import { useAuth } from './auth.jsx';
// ADD:
import { useBranches } from './use-branches.js';
```

**Popover state + click-outside pattern to copy verbatim** (lines 17-29):
```javascript
const [userMenuOpen, setUserMenuOpen] = useState(false);
const userMenuRef = useRef(null);

useEffect(() => {
  if (!userMenuOpen) return;
  function handleClick(e) {
    if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
      setUserMenuOpen(false);
    }
  }
  document.addEventListener('mousedown', handleClick);
  return () => document.removeEventListener('mousedown', handleClick);
}, [userMenuOpen]);
```
Rename to `branchMenuOpen`/`branchMenuRef` for the new selector — identical structure, second independent instance (D-01).

**Upward-opening popover markup to copy** (lines 155-168):
```jsx
<div style={{ position: 'relative' }} ref={userMenuRef}>
  {userMenuOpen && (
    <div style={{ position: 'absolute', bottom: 'calc(100% + 6px)', left: 0, right: 0, background: '#fff', border: '1px solid hsl(120 10% 88%)', borderRadius: 10, boxShadow: '0 4px 16px rgba(0,0,0,0.12)', zIndex: 50, overflow: 'hidden' }}>
      {/* row buttons here */}
    </div>
  )}
  <div className="user-chip" ... onClick={() => setUserMenuOpen(o => !o)}>
    ...
    <Icon name={userMenuOpen ? 'chevUp' : 'chevDown'} size={12} .../>
  </div>
</div>
```

**Deletion target — RO/EN pill** (lines 143-154): remove this entire block (the whole `!sidebarCollapsed && (<div style={{ display:'flex', background:'#f3ecd9', ...}}>...RO/EN buttons...</div>)`). Insert the new branch-selector trigger + popover in its place, BEFORE the `<div style={{ position: 'relative' }} ref={userMenuRef}>` user-chip block (exact positional parity, D-02).

**Collapse toggle button precedent for the collapsed-chip glyph slot** (lines 137-141) — shows how a footer control adapts between `sidebarCollapsed` true/false; the collapsed branch chip (D-03) should follow this same conditional-render-by-`sidebarCollapsed` shape, plus the `title={...}` attribute precedent used at line 171 (`title={sidebarCollapsed ? displayName : ''}`) — apply identically for `title={branch.name}` per Pitfall 5 (E1/E3 overflow backstop).

**Single-branch gate (D-04) — new code, no existing analog to copy, but the `enabled: !!client` comment in `use-branches.js:13` documents the rule to follow:** gate the interactive popover render on `branches.length > 1`, never `!!currentBranch`.

---

### `src/use-branches.js` (hook/service, CRUD — add `useBranchSwitch()`)

**Analog:** `src/use-order-actions.js:1-52` (full file)

**Imports pattern** (use-order-actions.js lines 9-11):
```javascript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './auth.jsx';
import { useAppStore } from './store.js';
```
(For `useBranchSwitch()`, `useQueryClient` is not needed — no `invalidateQueries` call; only `setCurrentBranch` from the store on success.)

**Existing file to extend (`src/use-branches.js`, full file, 17 lines):**
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
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });
}
```
Do NOT touch the `enabled: !!client` line (Pitfall 2). Add `useBranchSwitch()` as a new, separate export in the same file.

**Non-optimistic mutation core pattern to mirror** (`use-order-actions.js:19-35`):
```javascript
const updateStatus = useMutation({
  mutationFn: ({ id, currentStatus, toStatus, estimatedMinutes, reason }) =>
    client.kitchen.orders.updateStatus({
      path: { id },
      body: { currentStatus, toStatus, ...(estimatedMinutes != null ? { estimatedMinutes } : {}), ...(reason != null ? { reason } : {}) },
    }),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['orders', branchId] });
    queryClient.invalidateQueries({ queryKey: ['order', branchId] });
    queryClient.invalidateQueries({ queryKey: ['stats', branchId] });
  },
});
```
For `useBranchSwitch()`, the `onSuccess` writes `setCurrentBranch(branch)` instead of invalidating caches (D-05) — no `onMutate`, exactly matching this analog's "no optimistic update" shape.

**Error unwrap convention** — `src/use-branches.js:10` (`if (result.error) throw new Error(result.error.error ?? 'Failed to load branches')`) is the exact inline shape to copy for `useBranchSwitch`'s `mutationFn`, per RESEARCH's `unwrapSdkResult` (`src/data.jsx:195-209`) convention — reuse this `raw?.error ?? fallback` shape rather than inventing a new one.

---

### `src/store.js` (Zustand slice, event-driven — add `branchSwitcherForceOpen`)

**Analog:** existing session-only fields (`acceptDialog`, `soundMuted`, `currentBranch`) and their setters/partialize exclusion.

**Session-only field declaration pattern** (`store.js:61-68`):
```javascript
acceptDialog: null,      // Set by setAcceptDialog(); consumed by AcceptDialog in app.jsx
soundMuted: false,       // KDS mute toggle (D-07) — session-only, NOT in partialize
updateReady: false,      // Set by useUpdater after silent download; triggers sidebar banner
// ...
currentBranch: null,     // SelectedBranch | null (from getMe()); session-only; NEVER in partialize (D-10)
```
Add: `branchSwitcherForceOpen: false, // consumed by Phase 17's reopen-on-403 flow; wired minimally here (D-12)`

**Setter pattern** (`store.js:111-116`):
```javascript
setAcceptDialog: (dialog) => set({ acceptDialog: dialog }),
setSoundMuted: (v) => set({ soundMuted: v }),
setUpdateReady: (v) => set({ updateReady: v }),
setIsAuthenticated: (v) => set({ isAuthenticated: v }),
setAuthUser: (user) => set({ authUser: user }),
setCurrentBranch: (branch) => set({ currentBranch: branch }),
```
Add: `setBranchSwitcherForceOpen: (v) => set({ branchSwitcherForceOpen: v }),`

**`partialize` exclusion pattern** (`store.js:118-129`) — do NOT add `branchSwitcherForceOpen` (or `currentBranch`) to this object; it lists only the 6 persisted keys (`screen, role, lang, accent, density, sidebarCollapsed`). Confirm `setCurrentBranch` (line 116) remains the sole success-path setter for D-05.

---

### `src/app.jsx` (orchestrator, event-driven + request-response)

**Analog:** `AcceptDialog`/`CancelDialog` mutate + onSuccess/onError orchestration (`src/app.jsx:292-344`)

**Mutation-with-dialog-and-toast pattern to mirror** (`app.jsx:316-344`, CancelDialog block):
```jsx
{cancelDialog && (
  <CancelDialog
    lang={lang}
    order={cancelDialog.order}
    onCancel={() => setCancelDialog(null)}
    onConfirm={(reason) => {
      updateStatus.mutate(
        { id: cancelDialog.order.id, currentStatus: statusToSDK[cancelDialog.order.state] ?? cancelDialog.order.state.toUpperCase(), toStatus: 'CANCELLED', reason },
        {
          onSuccess: () => {
            setCancelDialog(null);
            setScreen('orders');
            pushToast({ id: Date.now(), kind: 'success', title: t('cancel_success_title'), detail: t('cancel_success_detail') });
          },
          onError: () => {
            pushToast({ id: Date.now(), kind: 'error', title: t('cancel_error_title'), detail: t('check_connection') });
            // dialog stays open intentionally — do NOT call setCancelDialog(null) here
          },
        }
      );
    }}
  />
)}
```
This is the exact shape for the D-13 cart-discard confirm dialog + the branch-switch `fireSwitch` handler's `onError` revert (D-11): dialog/overlay state resets only on success; on error, generic toast fires and nothing else changes (mirrors `onError` here leaving `cancelDialog` untouched, i.e. no premature dismissal).

**`isConnected`/`isOffline` destructure — the reconnect bridge signal** (`app.jsx:105-108`):
```javascript
const { isConnected } = useSSE(token, (order) => {
  if (order?.state === 'new') playNotification();
});
const isOffline = !isConnected;
```
`isConnected` is the exact value the D-08 bridging watcher effect observes (transitions to `false` then back to `true` on branch switch, guaranteed by `use-sse.js:38`).

**`pushToast` call shape** (`app.jsx:132-137`, `178`, `180`, `304`, `307`, `334`, `337`) — always `{ id: Date.now(), kind: 'success'|'error', title: t(key), detail: t(key) or string }`. Copy this exact shape for the SWCH-04 success toast and D-11 generic failure toast.

**Prop fan-out pattern for `isOffline`** (`app.jsx:255-277`) — every screen receives `isOffline={isOffline}` as a prop; this is the established "compute once in App, thread down" convention. The new `posCartEmpty` state and `onCartEmptyChange` setter follow the same shape when wired to `<PosScreen>` (`app.jsx:257`).

**Screen router — insertion point for neutral-landing routing** (`app.jsx:248-278`, specifically the `screen === 'pos'` line 257 needs `key={currentBranch?.id}` added, and D-14's `setScreen('orders')` call belongs in the switch-success effect, analogous to how `CancelDialog`'s `onSuccess` already calls `setScreen('orders')` at line 333).

**Top-level sibling-overlay rendering point** (`app.jsx:248-346`) — `<Shell>`, the toast stack, `AcceptDialog`, and `CancelDialog` are all siblings inside the outer `<div style={{ width:'100vw', height:'100vh', position:'relative', overflow:'hidden' }}>` (line 249). The new `SwitchingOverlay` must render as an additional sibling here (NOT inside `<Shell>`'s children) — same DOM-coverage technique already used by `AcceptDialog`/`CancelDialog` (`position: 'absolute', inset: 0, zIndex: 200`, see `cancel-dialog.jsx:22-28` below).

---

### `src/screen-pos.jsx` (component — add `onCartEmptyChange` prop)

**Analog:** no exact precedent (new callback-prop channel); closest is the `isOffline` prop already accepted by `PosScreen` (`screen-pos.jsx:14`, `function PosScreen({ lang, isOffline }) {`).

**Cart local state location** (`screen-pos.jsx:57`):
```javascript
const [cart, setCart] = useState([]);
```

**Fix to add** (new, per RESEARCH Pattern 3 — not copied from an existing file but the shape to use):
```jsx
function PosScreen({ lang, isOffline, onCartEmptyChange }) {
  // ...
  useEffect(() => {
    onCartEmptyChange?.(cart.length === 0);
  }, [cart, onCartEmptyChange]);
  // ...
}
```
Import `useEffect` alongside the existing `useState, useMemo` import (`screen-pos.jsx:1`).

---

### `src/screen-settings.jsx` (reference-only, no modify)

**Reference for LANG-01 verification** — the Afișaj language control (cited at `screen-settings.jsx:119-140` per CONTEXT/RESEARCH) reads/writes `lang` via `useAppStore` directly (independent of any prop threaded from `Shell`/`App`), confirmed by RESEARCH: "`screen-settings.jsx:19-20` confirmed independent `useAppStore` access, not prop-threaded; no orphaned dependency." No code changes needed here; only a negative-assertion test (RO/EN pill absent from Shell) plus a smoke check that this control still functions.

---

### `src/__tests__/shell.test.jsx` (new test)

**Analog:** `src/__tests__/cancel-dialog.test.jsx` (full file, 106 lines)

**Header/mock scaffold to copy** (`cancel-dialog.test.jsx:1-16`):
```javascript
import { describe, it, test, vi, expect, beforeEach } from 'vitest'
import { createElement } from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

vi.mock('@tauri-apps/plugin-store', () => ({
  load: vi.fn(() => Promise.resolve({ get: vi.fn(), set: vi.fn(), delete: vi.fn() })),
}))
vi.mock('@charlyk/admin-client', () => ({ signIn: vi.fn(), createAdminClient: vi.fn() }))
vi.mock('@tauri-apps/plugin-opener', () => ({ open: vi.fn(), openUrl: vi.fn() }))
vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }))
vi.mock('../auth.jsx', () => ({ useAuth: vi.fn(() => ({ client: null, token: null })) }))
```
For `shell.test.jsx`, additionally mock `../use-branches.js` (`vi.mock('../use-branches.js', () => ({ useBranches: vi.fn() }))`) to control the branch list per test case (multi-branch popover vs. single-branch read-only, D-04).

**Render + fireEvent + assert pattern** (`cancel-dialog.test.jsx` describe blocks, e.g. lines 31-56): render component with required props, `fireEvent.click(screen.getByText(...))`, assert on resulting DOM state (opacity, disabled attr, or mock calls).

---

### `src/__tests__/use-branches.test.js` (new test)

**Analog:** `src/__tests__/use-order-actions.test.js` (full file; mutation-hook mocking scaffold, `U11c` describe block lines 27-165)

**Header mock scaffold to copy** (`use-order-actions.test.js:1-23`):
```javascript
vi.mock('@tauri-apps/plugin-store', () => ({ /* ... */ }))
vi.mock('@charlyk/admin-client', () => ({ signIn: vi.fn(), createAdminClient: vi.fn() }))
vi.mock('@tauri-apps/plugin-opener', () => ({ open: vi.fn(), openUrl: vi.fn() }))
vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }))
vi.mock('../auth.jsx', () => ({ /* useAuth mock returning a fake `client` */ }))
import { renderHook, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement } from 'react'
import { useAuth } from '../auth.jsx'
import { useAppStore } from '../store.js'
import { useOrderActions } from '../use-order-actions.js'
```
Swap the last import for `import { useBranchSwitch } from '../use-branches.js'`, and mock `client.me.branches.switch` instead of `client.kitchen.orders.updateStatus`.

**Test shape to mirror** (`use-order-actions.test.js:33-64`, `updateStatus calls SDK with correct path and body args`): `renderHook(() => useOrderActions(), { wrapper })`, `act(() => result.current.updateStatus.mutate({...}))`, assert on the mocked SDK call args and on cache invalidation. For `useBranchSwitch`, assert `client.me.branches.switch` called with `{ body: { branchId } }`, and assert `setCurrentBranch` is called ONLY after `onSuccess` resolves (non-optimistic — SWCH-03), never before.

---

### `src/__tests__/app-branch-switch.test.jsx` (new test)

**Analogs:** `src/__tests__/use-sse.test.js` (fake timers + SDK mock header, `branch-aware reconnect` describe block line 167) AND `src/__tests__/cancel-dialog.test.jsx` (full-app-level render pattern).

**Fake-timers + `isConnected` transition assertion precedent** (`use-sse.test.js`, `describe('branch-aware reconnect', ...)` at line 167) — this is the direct evidence backing RESEARCH's claim that `isConnected` reliably flips `false` then `true` on a `branchId` change; the D-08 bridging-watcher test should reuse this exact mocking approach (`vi.mock('@microsoft/fetch-event-source', ...)` at line 14, plus `vi.useFakeTimers()` for the D-09 bounded-timeout test).

**Mock header to copy** (`use-sse.test.js:4-23`):
```javascript
vi.mock('@tauri-apps/plugin-store', () => ({ /* ... */ }))
vi.mock('@charlyk/admin-client', () => ({ signIn: vi.fn(), createAdminClient: vi.fn() }))
vi.mock('@tauri-apps/plugin-opener', () => ({ open: vi.fn(), openUrl: vi.fn() }))
vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }))
vi.mock('@microsoft/fetch-event-source', () => ({ /* fetchEventSource mock capturing onopen/onmessage/onerror callbacks */ }))
import { renderHook, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement, useRef } from 'react'
import { useSSE } from '../use-sse.js'
import { fetchEventSource } from '@microsoft/fetch-event-source'
import { useAppStore } from '../store.js'
```

For the full orchestration test (overlay renders while pending/bridging, success toast fires only on release, timeout fallback releases overlay, cart-discard confirm gate, D-14 neutral landing), render the actual `App` component the way `cancel-dialog.test.jsx` renders `CancelDialog` inside a `QueryClientProvider`, but mock `../use-sse.js`, `../use-branches.js`, and `../use-order-actions.js` so the mutation/connection states can be driven directly with `act()` + `vi.advanceTimersByTime()`.

---

## Shared Patterns

### Non-optimistic mutation + store-set-on-success
**Source:** `src/use-order-actions.js:19-35` (structural precedent), `src/store.js:116` (`setCurrentBranch`)
**Apply to:** `useBranchSwitch()` in `src/use-branches.js`
```javascript
onSuccess: (_response, branch) => {
  setCurrentBranch(branch); // ONLY here — never adjacent to .mutate(), never in onMutate
},
```

### pushToast success/error shape
**Source:** `src/app.jsx:132-137, 178, 180, 304, 307, 334, 337`
**Apply to:** SWCH-04 success toast (fires on overlay release, D-10) and D-11 generic failure toast in `src/app.jsx`
```javascript
pushToast({ id: Date.now(), kind: 'success', title: t('...'), detail: '...' });
pushToast({ id: Date.now(), kind: 'error', title: t('...'), detail: t('check_connection') });
```

### Dialog/overlay-as-sibling-of-Shell rendering
**Source:** `src/app.jsx:248-346` (`<Shell>`, toast stack, `AcceptDialog`, `CancelDialog` all direct children of the same outer wrapper div)
**Apply to:** `SwitchingOverlay` (D-07) and the cart-discard confirm dialog (D-13) — both render as new siblings in this same block, never nested inside `<Shell>`'s `children` prop, so the overlay's DOM coverage actually blocks `Shell`'s content (SCOPE-04).

### Full-screen modal chrome (position/backdrop/zIndex)
**Source:** `src/cancel-dialog.jsx:22-33` (outer wrapper: `position: 'absolute', inset: 0, background: 'rgba(18,24,18,0.45)', backdropFilter: 'blur(4px)', zIndex: 200, animation: 'fadeIn 180ms ease-out'`; inner card: `width, background: '#fff', borderRadius: 20, boxShadow: '0 30px 80px rgba(0,0,0,0.35)'`)
**Apply to:** Both the cart-discard confirm dialog (D-13, can literally reuse `CancelDialog`'s component shape with different copy/reason-list removed) and the `SwitchingOverlay` (D-07) minus the card — the overlay likely needs only the backdrop layer plus a centered spinner/copy block, reusing the same `zIndex: 200`-class treatment (or higher, to sit above any open dialog) and the existing `.spin` keyframe (`src/styles.css:281`).

### Click-outside popover (upward-opening)
**Source:** `src/shell.jsx:17-29, 155-168` (user-chip menu)
**Apply to:** Branch selector popover in `src/shell.jsx` (D-01) — copy verbatim, rename state/ref variables.

### Session-only Zustand field (declaration + setter + partialize exclusion)
**Source:** `src/store.js:61-68` (declarations), `111-116` (setters), `118-129` (`partialize`, confirms exclusion by omission)
**Apply to:** `branchSwitcherForceOpen` in `src/store.js`.

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `src/screen-pos.jsx` (`onCartEmptyChange` callback) | component | event-driven | No existing "child reports local state to parent via callback prop" pattern in this codebase (confirmed: `git grep useImperativeHandle` returns nothing in `src/`); this phase introduces the first instance. Use RESEARCH Pattern 3's `useEffect`-based callback as the template since no in-repo precedent exists. |

## Metadata

**Analog search scope:** `src/`, `src/__tests__/` (targeted reads of `shell.jsx`, `use-branches.js`, `use-order-actions.js`, `store.js`, `app.jsx`, `cancel-dialog.jsx`, `offline-banner.jsx`, `screen-pos.jsx`, plus `grep` scans of `use-sse.test.js`, `use-order-actions.test.js`, `cancel-dialog.test.jsx`)
**Files scanned:** 12
**Pattern extraction date:** 2026-07-23
