# Phase 16: Branch Switcher UI, Switch Flow & Language Relocation - Research

**Researched:** 2026-07-23
**Domain:** React/Zustand/TanStack Query UI orchestration — non-optimistic mutation + SSE-reconnect bridging
**Confidence:** HIGH

## Summary

This phase is almost entirely mechanics, not product decisions — CONTEXT.md and the approved UI-SPEC.md already lock every visual/product choice (D-01..D-15). The real risk in this phase is wiring three already-shipped, independently-correct primitives together without breaking their individual guarantees: `useSSE`'s branch-keyed reconnect (Phase 15), the branch-scoped TanStack Query caches (Phase 14), and the non-optimistic `currentBranch` setter (Phase 13's `store.js`). All source files were read directly; every claim below is grounded in a file:line citation from this repo.

The single highest-value finding: `useSSE`'s effect **unconditionally** calls `setIsConnected(false)` synchronously at the top of every effect run, before starting the new `fetchEventSource` call (`use-sse.js:38`, Phase 15 D-05 "setIsConnected(false) added at top of every SSE effect run"). Because `branchId` is a dependency of that effect (`use-sse.js:141`), a branch switch **always** produces an observable `true → false → (eventually) true` transition on `isConnected` once `setCurrentBranch` fires in the mutation's `onSuccess`. This removes the race that would otherwise make D-08's overlay-release bridge unreliable — the drop is guaranteed by construction, not by timing luck. A concrete `switchPhase` state machine (`idle → pending → bridging → done`) keyed off the mutation's own pending/success state plus a `hasDropped` ref watching `isConnected`'s trajectory, with a bounded `setTimeout` fallback, is race-safe and requires no changes to `use-sse.js` itself.

The second load-bearing finding: **the POS cart lives in `PosScreen`'s own local `useState` (`screen-pos.jsx:57`), with zero external visibility.** `app.jsx` (where the switch orchestration and overlay live per CONTEXT's canonical refs) cannot read cart emptiness for the D-13 confirm-gate decision without a new, explicit channel — there is no existing prop, ref, or store field carrying this signal today. The recommended fix (below, Pitfall/Pattern section) is a single `onCartEmptyChange(isEmpty)` callback prop threaded into `PosScreen`, mirrored into a local `useState` in `App`, updated via a `useEffect` on `cart` (not on every render). No CONTEXT decision blocks this; D-13 explicitly leaves "exact selector form for reading POS cart emptiness" to planner discretion.

Third: the i18n system (`src/i18n.jsx:510-512`) has **no interpolation support** — `t(key)` is a flat table lookup with no parameter substitution. Every UI-SPEC copy row with a `<branch>` placeholder (overlay heading, success toast detail) must be composed the same way the codebase already composes interpolated strings elsewhere (`app.jsx:411` `` `${t('promised')}: ${prep} ${t('min')}` `` and the Phase 9 `h_empty_prefix` precedent) — i.e. the i18n key holds only the static prefix, and the branch name is string-concatenated in JSX. A planner unaware of this would try (and fail) to invent a `t(key, {branch})` call signature that does not exist in this codebase.

**Primary recommendation:** Build the switch orchestration entirely inside `app.jsx` (owns the overlay, the phase state machine, the cart-emptiness gate, and the confirm dialog) with `shell.jsx` staying a pure presentation layer that receives `branches`, `currentBranch`, and an `onSelectBranch(branch)` callback as props — mirroring exactly how `isOffline` is already computed in `App` and threaded down as a prop (`app.jsx:108`, `250-253`) rather than computed inside `Shell`.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Branch selector UI (trigger, popover, collapsed chip) | Frontend (React component — `shell.jsx`) | — | Pure presentation; no server calls of its own beyond `useBranches()`'s existing read query |
| Branch list data | Frontend Server (TanStack Query cache) | API (SDK `me.branches.list()`) | Already built in Phase 13 (`use-branches.js`); this phase only consumes it |
| Switch mutation + non-optimistic state update | Frontend (React/Zustand orchestration in `app.jsx`) | API (SDK `me.branches.switch()`) | The mutation itself is a thin SDK call; the *safety* (non-optimistic ordering, overlay bridge) is entirely client-orchestration, per D-05/D-08 |
| Global switching overlay + phase state machine | Frontend (`app.jsx`, sibling to `Shell`) | — | Must render above `Shell` to satisfy SCOPE-04 (blocks all screens); cannot live inside `Shell` because `Shell`'s children are exactly what needs blocking |
| Cart-emptiness read + cart reset | Frontend (`screen-pos.jsx` local state, surfaced via callback prop) + `app.jsx` (remount key) | — | Cart is deliberately local component state (never lifted to Zustand); the emptiness *signal* must cross the component boundary via a new callback, the *reset* via a remount key |
| SSE reconnect | Frontend Server (persistent connection hook `use-sse.js`) | API (SSE endpoint) | Already branch-aware (Phase 15); this phase only *observes* its `isConnected` transitions, never modifies `use-sse.js` |
| Language control | Frontend (`screen-settings.jsx`) | — | Already fully functional; this phase only deletes a duplicate control elsewhere (`shell.jsx`) |

## User Constraints (from CONTEXT.md)

<user_constraints>

### Locked Decisions

- **D-01:** Branch selector is a dropdown popover (upward-opening, `bottom: calc(100% + 6px)`), reusing the exact user-chip-menu pattern (`shell.jsx:155-168`).
- **D-02:** Selector sits in the exact footer slot the RO/EN pill occupied (`shell.jsx:143-154`).
- **D-03:** Collapsed sidebar shows a compact branch chip (branch identity never hidden, unlike RO/EN).
- **D-04:** Single-accessible-branch tenants get a read-only selector, gated on `branches.length > 1`, never on `currentBranch` truthiness.
- **D-05:** `useBranchSwitch()` — TanStack mutation over `client.me.branches.switch({ body: { branchId } })`; sets `currentBranch` via `setCurrentBranch` on success ONLY, never optimistically.
- **D-06:** SDK contract: `switch` → `{ ok: true, branchId }` (200); errors 400/401/403. `useBranches()` already returns `AccessibleBranch[]`.
- **D-07:** Global overlay ("Switching to `<branch>`…") blocks all interaction while pending; this is the SCOPE-04 enforcement mechanism.
- **D-08:** Overlay held until SSE `isConnected` recovers on the new branch (fulfills Phase 15 D-05 handoff).
- **D-09:** Bounded-timeout safety valve (~5-8s, planner picks exact value) — release overlay anyway if reconnect never lands.
- **D-10:** Success toast (SWCH-04) fires on overlay release (after reconnect OR timeout), not on mutation resolution.
- **D-11:** Failed switch → single generic error toast, release overlay, revert selector to old branch, change nothing else.
- **D-12:** Hard boundary — zero `err.code` branching, zero recovery UI, no retry-suppression in this phase. All code-aware 403 recovery is Phase 17.
- **D-13:** Switch immediate when POS cart empty; confirm dialog first when cart has items.
- **D-14:** Successful switch exits detail/history-detail to Orders screen (`setScreen('orders')`); other screens stay put; POS stays on POS with cart reset via `key={currentBranch?.id}` remount.
- **D-15:** LANG-01 is almost entirely a deletion — remove RO/EN pill (`shell.jsx:143-154`); Settings → Afișaj already works, no new Settings work.

### Claude's Discretion

- Exact popover markup/styling, "default" badge visual, collapsed-chip glyph (initial vs icon).
- Overlay-hold timeout value (D-09) and whether the timeout fallback shows plain OfflineBanner or adds a retry affordance.
- Whether the cart-discard confirm dialog (D-13) reuses `cancelDialog`'s modal pattern or a new small confirm.
- Popover loading/error states for `useBranches()`.
- Exact selector form for reading POS cart emptiness to decide immediate-vs-confirm (D-13).

### Deferred Ideas (OUT OF SCOPE)

- Phase 17 (BERR) — code-aware 403 recovery: `err.code` branching, reopening the switcher via `branchSwitcherForceOpen`, branch-list refetch on error, SSE retry-suppression on 403, `NO_BRANCH_ACCESS` full-screen block.
- Possible richer timeout-fallback affordance (retry button in OfflineBanner after a D-09 timeout) — may fold into Phase 17.

</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SWCH-01 | Persistent branch selector in sidebar footer, exact RO/EN slot, current branch name + "default" badge | Shell footer surgery section; `shell.jsx:143-154` slot confirmed empty after RO/EN removal |
| SWCH-02 | Single accessible branch → read-only selector, preserving pre-v2.6 behavior | `useBranches()` already gates `enabled: !!client` only (`use-branches.js:13`); popover render gated on `branches.length > 1` |
| SWCH-03 | Select branch → `client.me.branches.switch({ body: { branchId } })`; disabled while pending; non-optimistic | SDK contract verified in `node_modules/@charlyk/admin-client/dist/index.d.ts:1994-2023`; mirrors `use-order-actions.js` mutation shape |
| SWCH-04 | Success toast "switched to `<branch>`" | `pushToast` pattern (`store.js:109`, `app.jsx:60`); fires at overlay release per D-10 |
| SCOPE-03 | POS cart reset + open order-detail exited on switch | Cart-emptiness read + remount-key section below; `screen-pos.jsx:57` cart location confirmed |
| SCOPE-04 | Order mutations blocked while switch pending | D-07's overlay is the enforcement mechanism — no per-button disabling needed, confirmed by overlay's absolute-position + inert backdrop covering `Shell`'s children |
| LANG-01 | RO/EN toggle removed from footer; Settings → Afișaj control unaffected | `screen-settings.jsx:19-20` confirmed independent `useAppStore` access, not prop-threaded; no orphaned dependency |

</phase_requirements>

## Standard Stack

No new packages. This phase is 100% composition of already-installed, already-used primitives:

| Library | Version | Purpose | Why Standard (already in use) |
|---------|---------|---------|-------------------------------|
| `@tanstack/react-query` | 5.x (already installed) | `useMutation` for `useBranchSwitch()` | Same pattern as `use-order-actions.js`'s `updateStatus`/`updateEstimatedTime` mutations |
| `zustand` | 5.x (already installed) | `setCurrentBranch`, new `branchSwitcherForceOpen` field | Existing `store.js` slice pattern |
| `@charlyk/admin-client` | 1.1.67 (already installed) | `client.me.branches.switch`, `client.me.branches.list` | Only data layer per CLAUDE.md; both endpoints already typed in the SDK |

**No installation step required for this phase.** No `## Package Legitimacy Audit` needed — zero new external packages.

## Architecture Patterns

### System Architecture Diagram

```
User clicks a branch row in the popover (Shell, rendered via prop from App)
        │
        ▼
Shell calls onSelectBranch(branch) ──────────────► App's handleSelectBranch(branch)
                                                          │
                                          screen === 'pos' && cartEmpty === false ?
                                          ┌───────────────┴────────────────┐
                                          │ yes                            │ no
                                          ▼                                ▼
                                 setPendingSwitch(branch)          fireSwitch(branch)
                                 (opens CartDiscardConfirm)                │
                                          │                                │
                              user confirms "Switch and discard"          │
                                          └────────────────┬───────────────┘
                                                            ▼
                                          switchPhase = 'pending' (overlay shows
                                          "Se comută la <branch>…")
                                                            │
                                          useBranchSwitch().mutate({branchId})
                                                            │
                                   ┌────────────────────────┴───────────────────────┐
                                   │ onSuccess                                       │ onError
                                   ▼                                                 ▼
                       setCurrentBranch(branch)                          generic failure toast (D-11)
                       switchPhase = 'bridging'                          switchPhase = 'idle'
                       start bounded timeout (D-09)                      selector reverts (no state changed)
                                   │                                     overlay releases immediately
                                   ▼
       currentBranch?.id changes ──► useSSE's effect deps change ──► ctrl.abort() old connection
                                                                    ──► setIsConnected(false) (guaranteed, use-sse.js:38)
                                                                    ──► new fetchEventSource() call
                                   │
                    (also, independently: Phase 14 branch-keyed
                     query keys re-scope every screen's data automatically)
                                   │
                    App's bridging watcher effect observes isConnected:
                    false → armed=true ; later true (onopen fires) → armed && true?
                                   │
                                   ▼ (or bounded timeout fires first — D-09)
                       switchPhase = 'done'
                       success toast fires (D-10)
                       overlay releases
                       if screen was 'detail'/'history-detail' → setScreen('orders') (D-14)
                       if screen === 'pos' → PosScreen remounts via key={currentBranch?.id}, cart empty
```

### Recommended Project Structure

No new files required — every locus of change is an existing file:

```
src/
├── shell.jsx            # remove RO/EN pill; add branch trigger + popover + collapsed chip (presentation only)
├── use-branches.js       # add useBranchSwitch() mutation alongside existing useBranches()
├── store.js              # add branchSwitcherForceOpen (session-only, excluded from partialize)
├── app.jsx               # switch orchestration: phase state machine, overlay, cart-gate, neutral-landing routing
├── screen-pos.jsx        # add onCartEmptyChange prop + remount-safety notes (component itself is remounted, not edited for reset logic)
└── i18n.jsx               # add new keys (see Copywriting Contract mechanics below)
```

### Pattern 1: Non-optimistic mutation mirrors `useOrderActions` exactly

**What:** `useBranchSwitch()` follows the identical shape as `updateStatus`/`updateEstimatedTime` in `use-order-actions.js:19-35` — a bare `useMutation` wrapping an SDK call, `onSuccess` doing store/cache work, no `onMutate` (no optimistic update).

**When to use:** Any mutation in this codebase where the server is the sole source of truth for the field being changed (established precedent: order status, and now branch selection).

**Example:**
```javascript
// src/use-branches.js — new export alongside the existing useBranches()
// Source: mirrors src/use-order-actions.js:19-35 exactly; SDK contract verified at
// node_modules/@charlyk/admin-client/dist/index.d.ts:1994-2023 (SwitchMyBranchData/-Errors/-Responses)
import { useMutation } from '@tanstack/react-query';
import { useAuth } from './auth.jsx';
import { useAppStore } from './store.js';

export function useBranchSwitch() {
  const { client } = useAuth();
  const setCurrentBranch = useAppStore((s) => s.setCurrentBranch);

  return useMutation({
    mutationFn: (branch) =>
      client.me.branches.switch({ body: { branchId: branch.id } }).then((result) => {
        // unwrapSdkResult (data.jsx:200) is the codebase's shared {data,error} unwrap
        // convention — reuse it here rather than inlining a duplicate check.
        if (result.error) {
          const raw = result.error;
          const message = (typeof raw === 'string' ? raw : raw?.error) ?? 'Failed to switch branch';
          throw new Error(message);
        }
        return { response: result.data, branch }; // carry the full AccessibleBranch through onSuccess
      }),
    // NOTE: no onSuccess here that calls setCurrentBranch directly — see Pitfall 1 below for why
    // the store write belongs in the component's mutate() call-site options, not baked into the hook.
  });
}
```

**Important nuance (verified against `use-order-actions.js` precedent, NOT a deviation):** Whether `setCurrentBranch` is called inside the hook's own `onSuccess` or passed as a per-call `onSuccess` option at the `.mutate(branch, { onSuccess })` call-site in `app.jsx` is a real implementation choice the planner must make explicitly. Baking it into the hook (as `use-order-actions.js`'s mutations do for their `invalidateQueries` calls) is simpler and matches precedent — but this phase's `onSuccess` ALSO needs to kick off the `switchPhase = 'bridging'` transition and the bounded timeout, which are `app.jsx`-local concerns. **Recommendation:** put `setCurrentBranch(branch)` inside the hook's `onSuccess` (keeps D-05's "never optimistic" guarantee co-located with the mutation definition, auditable in one file), and let `app.jsx`'s call-site `.mutate(branch, { onSuccess: () => setSwitchPhase('bridging') })` handle the phase transition — TanStack Query v5 runs both the hook-level and call-site `onSuccess` callbacks (hook-level fires first).

### Pattern 2: Overlay-release bridge — the D-08/D-09 state machine

**What:** A `switchPhase` state (`'idle' | 'pending' | 'bridging' | 'done'`) in `app.jsx`, combined with a `hasDroppedRef` and a bounded `setTimeout`, that reliably detects "SSE reconnected on the new branch" without a race.

**Why the race is actually closed by construction:** `use-sse.js:38` calls `setIsConnected(false)` **unconditionally, synchronously, at the very top of every effect run** — not conditionally on the previous value. Because `branchId` is an effect dependency (`use-sse.js:141`, `const branchId = useAppStore((s) => s.currentBranch?.id) ?? null`), the instant `setCurrentBranch(branch)` fires in `useBranchSwitch`'s `onSuccess`, Zustand's store update triggers a re-render, `useSSE`'s `branchId` selector returns a new value, React tears down the old effect (`ctrl.abort()`) and re-runs the new one, which calls `setIsConnected(false)` before even constructing the new `fetchEventSource` call. This means: **there is no code path where `isConnected` can stay `true` through a branch switch and never signal.** The existing test suite already asserts this transition directly: `src/__tests__/use-sse.test.js:170-195` ("branchId change triggers reconnect... isConnected flips false").

**When to use:** Exactly this one bridging scenario — do not generalize into a reusable hook unless Phase 17 needs the same pattern (it likely will, for its own reopen-on-error flow, but that's out of scope here per D-12).

**Example:**
```javascript
// src/app.jsx — new local state + effect, alongside the existing isConnected destructure at line 105
const [switchPhase, setSwitchPhase] = useState('idle'); // 'idle' | 'pending' | 'bridging' | 'done'
const [pendingBranch, setPendingBranch] = useState(null); // the branch being switched to, for overlay copy
const hasDroppedRef = useRef(false);
const bridgeTimeoutRef = useRef(null);

const branchSwitch = useBranchSwitch();

const fireSwitch = (branch) => {
  setPendingBranch(branch);
  setSwitchPhase('pending');
  branchSwitch.mutate(branch, {
    onSuccess: () => {
      hasDroppedRef.current = false;
      setSwitchPhase('bridging');
      bridgeTimeoutRef.current = setTimeout(() => {
        // D-09: bounded timeout — release anyway, success toast still fires (switch DID succeed server-side)
        setSwitchPhase('done');
      }, 6000); // planner's discretion per D-09; 6000ms sits in the 5-8s range
    },
    onError: () => {
      setSwitchPhase('idle'); // D-11: revert immediately, no bridging needed on failure
      setPendingBranch(null);
      pushToast({ id: Date.now(), kind: 'error', title: t('branch_switch_error_title'), detail: t('branch_switch_error_detail') });
    },
  });
};

// Bridging watcher: only active while switchPhase === 'bridging'
useEffect(() => {
  if (switchPhase !== 'bridging') return;
  if (!isConnected) {
    hasDroppedRef.current = true; // observed the drop (guaranteed by use-sse.js:38, see above)
    return;
  }
  if (isConnected && hasDroppedRef.current) {
    clearTimeout(bridgeTimeoutRef.current);
    setSwitchPhase('done');
  }
}, [isConnected, switchPhase]);

// Release effect: fires the D-10 success toast + D-14 neutral-landing exactly once per 'done' transition
useEffect(() => {
  if (switchPhase !== 'done') return;
  pushToast({ id: Date.now(), kind: 'success', title: t('branch_switch_success_title'), detail: `${t('branch_switch_success_prefix')} ${pendingBranch?.name}` });
  if (screen === 'detail' || screen === 'history-detail') setScreen('orders'); // D-14
  setSwitchPhase('idle');
  setPendingBranch(null);
}, [switchPhase]); // eslint-disable-line react-hooks/exhaustive-deps -- intentionally one-shot on phase transition, mirrors existing settledPeriod effect pattern (09-04)
```

**Overlay render (sibling to `<Shell>`, inside the same top-level wrapper `div` in `app.jsx:249`):**
```jsx
{(switchPhase === 'pending' || switchPhase === 'bridging') && (
  <SwitchingOverlay lang={lang} branchName={pendingBranch?.name} reconnecting={switchPhase === 'bridging'} />
)}
```
This must render as a sibling of `<Shell>` (not a child passed into it), the same way `AcceptDialog`/`CancelDialog`/the toast stack already do (`app.jsx:280-344`) — Shell's children are exactly what SCOPE-04 needs blocked, so the overlay cannot be inside them.

### Pattern 3: Cart-emptiness bridge (SCOPE-03/D-13 mechanics)

**What goes wrong without a fix:** `PosScreen`'s cart (`screen-pos.jsx:57`, `const [cart, setCart] = useState([])`) is fully local — no prop, ref, context, or store field exposes it. `app.jsx` currently renders `<PosScreen lang={lang} isOffline={isOffline} />` (`app.jsx:257`) with no cart-related prop at all. D-13's confirm-gate decision must happen in `app.jsx` (that's where the switch orchestration and confirm dialog live per the canonical refs), but `app.jsx` has no way to know if the cart is empty at click time.

**Recommended fix:**
```jsx
// screen-pos.jsx — add a prop, report cart emptiness via effect (not on every render)
function PosScreen({ lang, isOffline, onCartEmptyChange }) {
  // ...existing state...
  useEffect(() => {
    onCartEmptyChange?.(cart.length === 0);
  }, [cart, onCartEmptyChange]);
  // ...
}
```
```jsx
// app.jsx — track it locally, default true (safe: assume empty until PosScreen reports otherwise,
// since PosScreen only mounts when screen === 'pos' and the effect fires on mount with cart===[])
const [posCartEmpty, setPosCartEmpty] = useState(true);
// ...
{screen === 'pos' && (
  <PosScreen
    key={currentBranch?.id}                 // D-14: remount → fresh empty cart on branch change
    lang={lang}
    isOffline={isOffline}
    onCartEmptyChange={setPosCartEmpty}
  />
)}
```
```jsx
// handleSelectBranch in app.jsx — the D-13 gate
const handleSelectBranch = (branch) => {
  if (screen === 'pos' && !posCartEmpty) {
    setCartDiscardConfirm(branch); // opens the confirm dialog, mirrors cancelDialog's local-useState pattern
    return;
  }
  fireSwitch(branch);
};
```

**Why `useEffect` + callback, not a ref exposed via `useImperativeHandle`:** The callback pattern matches the codebase's existing "child reports state changes to parent via a passed setter" convention seen nowhere else *exactly* like this, but is the lowest-friction fix consistent with React's unidirectional data flow and this codebase's avoidance of imperative handles anywhere else in the tree (`git grep useImperativeHandle` returns nothing in `src/`). A ref-based imperative escape hatch would be the only alternative and is unprecedented in this codebase — reject it in favor of the callback, which is one line of new surface area on both sides.

**Remount interacts correctly with the emptiness callback:** When `PosScreen` remounts (new `key`), its `cart` state resets to `[]`, and the mount-time effect fires `onCartEmptyChange(true)` — so `posCartEmpty` in `App` is correctly re-synced to `true` immediately after a successful switch, with no manual reset needed in `app.jsx`'s own switch-success handler.

### Pattern 4: Shell footer surgery — presentation-only branch selector

**What:** `shell.jsx` receives `branches` (array), `currentBranch`, and `onSelectBranch` as new props (mirroring how `orderCount`, `isOffline`, etc. are already threaded in) rather than calling `useBranches()`/`useBranchSwitch()` itself.

**Why props, not hooks-in-Shell:** `useBranches()` itself is safe to call directly in `Shell` (it's a pure read with no side effects that need centralizing) — but the *switch* action (`onSelectBranch`) must bubble up to `app.jsx` because that's where the overlay/phase-machine/cart-gate live. Splitting "Shell calls `useBranches()` for the list" and "Shell receives `onSelectBranch` as a prop for the action" is the cleanest boundary — it avoids threading the *entire* branch list through `App` as a prop (unnecessary — `Shell` can fetch its own read-only list) while keeping the *mutation trigger* centralized where D-07's overlay lives.

**Concretely:**
```jsx
// shell.jsx — new imports/hooks alongside the existing useAppStore(updateReady)/useAppStore(authUser)
import { useBranches } from './use-branches.js';
// ...
function Shell({ ..., onSelectBranch }) {
  const { data: branches = [] } = useBranches();
  const currentBranch = useAppStore((s) => s.currentBranch);
  const isMultiBranch = branches.length > 1; // D-04 gate — NEVER `!!currentBranch`
  // ... popover state (branchMenuOpen/branchMenuRef), mirrors userMenuOpen/userMenuRef exactly (D-01)
}
```

**Popover click-outside + upward-opening precedent to copy verbatim (`shell.jsx:155-168`):**
```jsx
// EXACT pattern already shipped for the user-chip menu — branch popover reuses this structure
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

**Insertion point:** Replace the RO/EN block (`shell.jsx:143-154`) with the branch trigger + popover, placed BEFORE the `<div style={{ position: 'relative' }} ref={userMenuRef}>` user-chip block (i.e., between the Collapse button, `shell.jsx:137-141`, and the user chip) — exact positional parity with the deleted RO/EN pill, per D-02.

### Anti-Patterns to Avoid

- **Calling `setCurrentBranch` adjacent to `.mutate()` rather than inside `onSuccess`:** This is Pitfall 4/5 from `.planning/research/PITFALLS.md` — it would reintroduce the exact cross-branch race Phases 14/15 were built to prevent. D-05 is explicit and non-negotiable.
- **Gating the popover's interactive rendering on `!!currentBranch`:** Must gate on `branches.length > 1` only (D-04) — a single-branch tenant's `currentBranch` may legitimately be non-null (it's just not switchable), and worse, some code paths could have `currentBranch` transiently null during the cold-start window even for multi-branch tenants; `branches.length` is the correct, stable gate.
- **Threading `switchPending` as a new prop to every screen to disable order actions:** CONTEXT explicitly notes (`code_context` → Established Patterns) that the global overlay is the SCOPE-04 mechanism, not a new prop fan-out — adding one would be redundant work that duplicates what the overlay already guarantees by fully covering `Shell`'s children.
- **Inventing a `t(key, {branch})` interpolation call:** Does not exist in this codebase's i18n system (`i18n.jsx:510-512` is a flat lookup). Always split into prefix-key + JSX-level concatenation (see Copywriting mechanics below).
- **Building the cart-emptiness signal via `useImperativeHandle`/ref:** Unprecedented in this codebase; the callback-prop pattern (Pattern 3) is simpler and consistent with every other parent-child data flow here.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| SDK error unwrapping for the switch mutation | A bespoke `if (result.error) ...` inline check with different shape than the rest of the app | Reuse `unwrapSdkResult` from `data.jsx:200` (or inline the identical `raw?.error ?? fallback` logic if avoiding a throw-based control flow inside `.then()`) | Every other hook in this codebase (`use-order-detail.js`, `use-menu.js`, `use-stats.js`, etc.) already funnels through this one function; a bespoke variant here would be the one exception, breaking the `err.code` convention Phase 17 depends on |
| "Is the SSE connection back" detection | A custom polling loop or a second SSE-specific event listener | The existing `isConnected` boolean already returned by `useSSE` (`use-sse.js:143`) | It already encodes the exact signal needed; building a parallel detector would be redundant and could disagree with the real connection state |
| Branch list fetching/caching | A second query hook or a raw `client.me.branches.list()` call inside `shell.jsx` | The existing `useBranches()` (`use-branches.js`) | Already built in Phase 13, already has the correct `staleTime`/`refetchOnWindowFocus` tuning (D-09 there) |
| Popover positioning/click-outside logic | A new floating-UI library or manual document-level click listener variant | Copy the exact `userMenuRef`/`userMenuOpen` pattern (`shell.jsx:17-29`, `155-168`) | Already shipped, human-verified, zero new dependencies, and the UI-SPEC explicitly mandates reusing this exact pattern (D-01) |

**Key insight:** Nothing in this phase requires a new abstraction. Every "don't hand-roll" item above is "don't build a second copy of something this codebase already has one correct copy of."

## Runtime State Inventory

Not applicable — this phase does not rename, refactor, or migrate any persisted identifiers. `branchSwitcherForceOpen` and `switchPhase`/`pendingBranch`/`posCartEmpty` are all new, session-only, in-memory state with no prior on-disk or server-side representation to migrate.

## Common Pitfalls

### Pitfall 1: Optimistic-looking code that isn't actually optimistic but reads that way in review

**What goes wrong:** A planner/implementer writes `branchSwitch.mutate(branch)` and, in the same click handler, immediately updates some local "selected" UI state (e.g., highlighting the clicked popover row before the request resolves) for perceived snappiness. This is not the same bug as D-05's "never set `currentBranch` optimistically," but it looks similar in a diff and can get flagged/unflagged incorrectly during review.

**Why it happens:** The popover needs *some* visual feedback that a click registered (closing the popover, e.g.) — it's tempting to also flip the checkmark to the new row immediately.

**How to avoid:** The popover should close on click (fine — no data implication) but the checkmark/highlighted row must continue reading `currentBranch` from the store, which only changes in `onSuccess`. On a 403, the popover (if reopened — out of scope this phase per D-12) would then correctly still show the OLD branch checked, because nothing optimistic ever moved it.

**Warning signs:** Any new `useState` in `shell.jsx` that holds a "which branch did I just click" value used for anything beyond closing the popover.

### Pitfall 2: `useBranches()`'s `enabled: !!client` regression via a new `!!branches.length` guard upstream

**What goes wrong:** Someone "helpfully" adds a guard like `enabled: !!client && !!currentBranch` to `useBranches()` while touching this file for the mutation addition, "since we're in here anyway."

**Why it happens:** Proximity — the file is being edited for `useBranchSwitch()`, and it's easy to conflate "the switch needs a resolved list" with "the list query needs a resolved branch."

**How to avoid:** Do not touch `useBranches()`'s existing `enabled: !!client` (`use-branches.js:13`) at all in this phase. It already has an explicit comment forbidding this (`// sole gate — NEVER add !!currentBranch/!!branchId (Pitfall 5/11)`).

**Warning signs:** Any diff to `use-branches.js` that touches the `enabled` line.

### Pitfall 3: Overlay bridging effect fires the success toast/neutral-landing more than once

**What goes wrong:** If the "release" effect's dependency array includes `pendingBranch` or other values that change during the same phase transition, it can re-fire on every subsequent render while `switchPhase === 'done'` remains stale for one extra render before being reset to `'idle'`.

**Why it happens:** React effects re-run whenever any listed dependency changes reference identity, not just on the specific transition being watched.

**How to avoid:** Gate strictly on `switchPhase !== 'done'` returning early, and set `switchPhase` back to `'idle'` synchronously inside the same effect body (as shown in Pattern 2's example) so the effect is self-terminating — mirrors the existing `settledPeriod` effect precedent from Phase 9 (`STATE.md` decision log: "settledPeriod effect gates on isSuccess && !isPlaceholderData... matches D-06's mechanism").

**Warning signs:** Success toast appearing twice for a single switch in manual testing.

### Pitfall 4: Forgetting the bounded-timeout cleanup on unmount/rapid re-switch

**What goes wrong:** If a user (implausibly quickly, but possible in an automated test) triggers a second switch while the first's bridging timeout is still pending, two `setTimeout` handles could both fire and both call `setSwitchPhase('done')`, or a stale timeout from switch #1 fires after switch #2 has already completed, incorrectly forcing a premature "done" for switch #2.

**How to avoid:** `clearTimeout(bridgeTimeoutRef.current)` at the START of every new `fireSwitch` call (before scheduling a new one), not just on successful bridge completion. Also clear it in the `onError` path (D-11) even though a timeout shouldn't have been scheduled yet at that point (defensive symmetry).

**Warning signs:** A flaky Nyquist test where two rapid switches show the toast for the wrong branch name.

### Pitfall 5: `screenTitles` map in `shell.jsx` (line 66-76) has no entry needed for anything new — but don't forget the popover row's `title` attribute for overflow (E1/E3 backstops)

**What goes wrong:** UI-SPEC's E1/E3 overflow backstops (`title` attribute for full branch name on ellipsis-truncated text) are easy to skip since they're framed as "backstop," not "covered" — but they are still required rows in the sign-off table, not optional.

**How to avoid:** Every branch name render (trigger pill, popover row, collapsed chip's accessible name) needs `title={branch.name}` (or `aria-label` for the collapsed chip per D-03's canonical-refs note), following the existing `nav-item` truncation precedent already cited in the UI-SPEC.

**Warning signs:** UI checker /gsd-ui-review flags E1/E3 overflow as unresolved in a later pass.

## Code Examples

### `useBranchSwitch()` — full hook (verified SDK shape)
```javascript
// Source: node_modules/@charlyk/admin-client/dist/index.d.ts:666-669 (SwitchBranchResponse),
// :1994-2023 (SwitchMyBranchData/-Errors/-Responses), mirrors src/use-order-actions.js:19-35
import { useMutation } from '@tanstack/react-query';
import { useAuth } from './auth.jsx';
import { useAppStore } from './store.js';

export function useBranchSwitch() {
  const { client } = useAuth();
  const setCurrentBranch = useAppStore((s) => s.setCurrentBranch);

  return useMutation({
    mutationFn: async (branch) => {
      const result = await client.me.branches.switch({ body: { branchId: branch.id } });
      if (result.error) {
        const raw = result.error;
        const message = (typeof raw === 'string' ? raw : raw?.error) ?? 'Failed to switch branch';
        const err = new Error(message);
        err.code = message; // matches data.jsx's unwrapSdkResult convention — Phase 17 will consume this
        throw err;
      }
      return result.data; // SwitchBranchResponse: { ok: true, branchId }
    },
    onSuccess: (_response, branch) => {
      setCurrentBranch(branch); // D-05: non-optimistic, only here. `branch` is the full AccessibleBranch
                                  // passed to .mutate(branch) — richer than the response's bare branchId,
                                  // needed for the popover checkmark/trigger label/toast copy (name, isDefault).
    },
  });
}
```

### `store.js` — `branchSwitcherForceOpen` addition (session-only, deferred from Phase 13)
```javascript
// Added alongside currentBranch (store.js:68) — session-only, excluded from partialize (D-10 precedent)
branchSwitcherForceOpen: false, // consumed by Phase 17's reopen-on-403 flow; wired minimally here (D-12)
// ...
setBranchSwitcherForceOpen: (v) => set({ branchSwitcherForceOpen: v }),
```
This phase adds the field and setter but has **zero call sites** that set it to `true` — Phase 17 is the first consumer. This satisfies "wired minimally here" from the canonical refs without building any Phase-17 behavior early.

## State of the Art

Not applicable in the conventional sense (no external library/API version drift to track) — this phase's "state of the art" IS the three prior phases' shipped work (13/14/15), which this phase composes without modification.

| Old Approach (pre-v2.6) | Current Approach (this phase) | When Changed | Impact |
|--------------------------|-------------------------------|---------------|--------|
| RO/EN toggle in sidebar footer, no branch concept | Branch selector in the same slot; language moved to Settings | Phase 16 (this phase) | LANG-01; footer real estate repurposed |
| `currentBranch` never set by any UI action (Phase 13 seeded it read-only from `getMe()`) | `useBranchSwitch()` is the first and only writer of `currentBranch` post-launch | Phase 16 (this phase) | Completes the branch-switching data flow Phases 13-15 built toward |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | 6000ms is a reasonable default for the D-09 bounded timeout (within the CONTEXT-specified 5-8s range) | Pattern 2 code example | Low — CONTEXT explicitly delegates the exact value to planner discretion; easy to tune post-hoc, no architectural dependency on the specific number |
| A2 | `onSuccess` inside `useBranchSwitch()` AND a call-site `onSuccess` at `.mutate()` both fire (TanStack Query v5 behavior) rather than the call-site option overriding the hook-level one | Pattern 1 | Medium — if v5 actually overrides rather than composes, `setCurrentBranch` would need to move to the call-site `onSuccess` instead. This should be confirmed against the installed `@tanstack/react-query` version's docs/changelog during planning, or simply avoided by putting ALL onSuccess logic in one place (recommend: verify via TanStack Query v5 docs before finalizing the plan, or default to single-onSuccess-site to sidestep the question entirely) |

**If this table is empty:** N/A — two low/medium-risk assumptions logged above, both non-blocking and independently resolvable during planning.

## Open Questions

1. **Does TanStack Query v5's `useMutation` compose hook-level and call-site `onSuccess` callbacks, or does the call-site option override the hook-level one?**
   - What we know: v5's `mutate(variables, options)` accepts a per-call options object; TanStack's docs describe these as composing (both fire, hook-level first) in v4/v5, but this repo's own hooks (`use-order-actions.js`) never exercise this pattern — every existing mutation only has ONE `onSuccess`, defined at the hook level, with call sites never passing a second one.
   - What's unclear: whether relying on dual-`onSuccess` composition (Pattern 1's recommendation) is proven correct within THIS specific installed version, vs. a safer single-`onSuccess`-site design.
   - Recommendation: the planner should either (a) verify this against the installed `@tanstack/react-query` version's behavior before committing to the dual-callback design, or (b) sidestep the question entirely by keeping `setCurrentBranch` inside the hook's `onSuccess` and handling the `switchPhase` transition via a `useEffect` watching `branchSwitch.isSuccess` in `app.jsx` instead of a call-site `onSuccess` — this is actually the more robust design regardless of the answer, since it decouples the phase-machine trigger from mutation-callback composition semantics entirely.

2. **Exact wording/keys for the new i18n entries.**
   - What we know: the UI-SPEC's Copywriting Contract table gives the exact ro/en strings needed.
   - What's unclear: whether "prefix" keys should be named e.g. `branch_switch_overlay_heading_prefix` vs. some shorter convention; this codebase has no single naming convention for prefix-style keys (`h_empty_prefix` is the only precedent, from Phase 9).
   - Recommendation: planner picks any clear, grep-able key names; not a decision requiring further research.

## Environment Availability

Not applicable — this phase has no new external dependencies (no new packages, no new native/OS integrations, no new services). All required tools (Node/npm, the already-installed SDK, Tauri toolchain) were verified present in prior phases (13-15) and are unchanged.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (already configured; confirmed via `src/__tests__/use-sse.test.js`, `src/__tests__/use-order-actions.test.js`, `src/__tests__/cancel-dialog.test.jsx`, `src/__tests__/offline-banner.test.jsx`) |
| Config file | existing `vitest` config at repo root (unchanged by this phase) |
| Quick run command | `npx vitest run src/__tests__/use-branches.test.js src/__tests__/shell.test.jsx src/__tests__/app-branch-switch.test.jsx` (new files, exact names planner's choice) |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SWCH-01 | Selector renders in footer slot with name + default badge | unit (shell.jsx render) | `npx vitest run src/__tests__/shell.test.jsx` | ❌ Wave 0 (new) |
| SWCH-02 | Single-branch tenant → read-only, no popover affordance | unit | same file, dedicated `describe` block | ❌ Wave 0 |
| SWCH-03 | Selecting branch fires `client.me.branches.switch`, disabled while pending, non-optimistic (`currentBranch` unchanged until resolve) | unit (mock SDK, mirrors `use-order-actions.test.js` mocking pattern) | `npx vitest run src/__tests__/use-branches.test.js` | ❌ Wave 0 |
| SWCH-04 | Success toast fires at overlay release (not at mutation resolve) | unit (fake timers, mirrors `use-sse.test.js`'s `vi.useFakeTimers()` pattern) | `npx vitest run src/__tests__/app-branch-switch.test.jsx` | ❌ Wave 0 |
| SCOPE-03 | Cart reset on switch (remount key); open detail view exits to Orders | unit + integration | same file | ❌ Wave 0 |
| SCOPE-04 | Overlay blocks all screens while pending (assert Shell children are covered/inert) | unit (render + query overlay z-index/coverage, or simpler: assert overlay renders and blocks via a synthetic click-through test) | same file | ❌ Wave 0 |
| LANG-01 | RO/EN pill absent from footer; Settings still switches `lang` | unit (existing `screen-settings` tests should already cover the Settings half; new negative assertion for Shell) | `npx vitest run src/__tests__/shell.test.jsx` | ❌ Wave 0 (negative assertion only — Settings behavior itself is pre-existing, verify no regression) |

### Sampling Rate
- **Per task commit:** targeted `npx vitest run <changed-test-file>`
- **Per wave merge:** `npx vitest run src/__tests__/` (full `src/__tests__` directory)
- **Phase gate:** Full suite green (`npx vitest run`) before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `src/__tests__/use-branches.test.js` — does not exist yet; needed for `useBranchSwitch()` unit coverage (mirrors `use-order-actions.test.js`'s existing mocking scaffold)
- [ ] `src/__tests__/shell.test.jsx` — does not exist yet; needed for footer-slot/popover/collapsed-chip/single-branch-readonly coverage
- [ ] `src/__tests__/app-branch-switch.test.jsx` (or extend an existing `app.jsx` test file if one exists — confirm during planning) — needed for the overlay/phase-machine/cart-gate/neutral-landing integration coverage
- Framework install: none — Vitest, `@testing-library/react`, and the existing mock scaffolding (`vi.mock('@tauri-apps/plugin-store', ...)`, `vi.mock('@charlyk/admin-client', ...)`) are already present and reusable verbatim from `use-sse.test.js`'s header block.

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-------------------|
| V2 Authentication | no | Unaffected — this phase adds no auth surface; `client` from `useAuth()` already carries the session token |
| V3 Session Management | yes (indirect) | The switch mutation changes server-side session state (`selected_branch_id`); this phase must NOT attempt to carry `branchId` on any other request per the v1.2 Out-of-Scope table ("Sending `X-Branch-Id`... the app must send nothing extra") |
| V4 Access Control | yes | 403 ("Branch not accessible") is the server's access-control enforcement; this phase's job is ONLY to surface a generic failure and revert (D-11/D-12) — never to infer/bypass access decisions client-side |
| V5 Input Validation | yes (minimal) | `branchId` sent to `switch()` always comes from a server-supplied `AccessibleBranch.id` in the popover list, never free-typed — no new client-side validation surface introduced |
| V6 Cryptography | no | Unaffected |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|----------------------|
| Client trusting its own optimistic branch state over server confirmation (leads to staff acting on the wrong branch's data) | Tampering / Spoofing (of application state, not network) | D-05's non-optimistic ordering — `currentBranch` only ever reflects the last server-confirmed value, never a client guess. This is the single most important invariant in this entire phase. |
| Overlay bypass via rapid double-click or dev-tools state manipulation during the pending window | Elevation of Privilege (of timing — a mutation landing against the wrong branch) | D-07's full-screen overlay + SWCH-03's "disabled while pending" on the selector itself; SCOPE-04 relies on the overlay's DOM coverage, not developer-trust — acceptable for this app's threat model (single-tenant desktop POS, not a public web surface) |
| Leaking which branches a user *could* switch to but shouldn't act on (info disclosure via the popover list) | Information Disclosure | Not a new risk — `useBranches()`/`client.me.branches.list()` already scopes to server-computed "accessible branches for this user" (Phase 13); this phase adds no new listing surface |

## Sources

### Primary (HIGH confidence — read directly this session)

- `node_modules/@charlyk/admin-client/dist/index.d.ts` — lines 666-669 (`SwitchBranchResponse`), 670-683 (`AccessibleBranch`/`SelectedBranch`), 1974-2023 (`GetMyBranchesData/Errors/Responses`, `SwitchMyBranchData/Errors/Responses`), 5218-5223 (`me.branches` client surface), 1239-1241 (`Error = { error: string }`)
- `src/shell.jsx` — full file, footer structure (135-187), user-chip popover pattern (17-29, 155-168), RO/EN pill to remove (143-154)
- `src/store.js` — full file, `currentBranch`/`setCurrentBranch` (68, 116), partialize exclusions (118-131)
- `src/app.jsx` — full file, `isConnected`/`isOffline` (105-108), screen router (248-278), toast/dialog rendering pattern (280-344)
- `src/use-sse.js` — full file, the D-05 `setIsConnected(false)` guarantee (38), effect deps (141), `scopedBranchId` capture (41)
- `src/use-order-actions.js` — full file, the non-optimistic mutation shape this phase's `useBranchSwitch()` mirrors
- `src/screen-pos.jsx` — full file, cart local state (57), Ring Up button/prep dialog flow (442-449, 453-462)
- `src/use-branches.js` — full file, existing `useBranches()` to extend
- `src/data.jsx` — `unwrapSdkResult` (195-209)
- `src/cancel-dialog.jsx` — full file, confirm-dialog precedent for D-13's cart-discard confirm
- `src/offline-banner.jsx` — full file, existing offline-state precedent
- `src/i18n.jsx` — `useT` (510-512, no interpolation support), existing key structure
- `src/icons.jsx` — confirmed `chevDown`/`chevUp`/`check`/`x`/`wifi`/`refresh` icons already exist; no new icon needed
- `src/styles.css` — `.spin` keyframe (281) reused per UI-SPEC for the overlay spinner
- `src/__tests__/use-sse.test.js` — full file; direct evidence for the isConnected drop-then-recover guarantee (lines 170-207) underpinning Pattern 2
- `.planning/phases/16-.../16-CONTEXT.md`, `16-UI-SPEC.md` — full files, all 15 locked decisions and the approved design contract
- `.planning/REQUIREMENTS.md`, `.planning/STATE.md` — full files, requirement text and full v1.2 decision history (Phases 13-15)
- `.planning/research/PITFALLS.md` — Pitfalls 1, 2, 3, 4, 5, 6, 11 (grep-verified sections)

### Secondary (MEDIUM confidence)

- TanStack Query v5 hook-level vs. call-site `onSuccess` composition behavior — based on general v5 documentation knowledge, not verified against this repo's specific installed version in this session (see Open Question 1; recommend the effect-based sidestep to avoid dependency on this behavior entirely)

### Tertiary (LOW confidence)

- None — every other claim in this document is grounded in a direct file read from this session.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - zero new packages, all primitives already installed and in active use elsewhere in this codebase
- Architecture: HIGH - every architectural claim (overlay placement, cart-emptiness gap, SSE drop guarantee, i18n interpolation limits) verified by direct file read this session, several with existing passing-test evidence
- Pitfalls: HIGH - all five pitfalls are either directly observed in the current source (cart isolation, i18n flat lookup) or explicitly documented as prior-phase invariants with inline code comments (`use-sse.js`, `use-branches.js`)

**Research date:** 2026-07-23
**Valid until:** 30 days (stable internal codebase; no external API/version drift risk since zero new dependencies)
