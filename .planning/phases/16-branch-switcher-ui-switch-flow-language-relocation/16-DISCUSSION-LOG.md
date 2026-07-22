# Phase 16: Branch Switcher UI, Switch Flow & Language Relocation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-23
**Phase:** 16-branch-switcher-ui-switch-flow-language-relocation
**Areas discussed:** Selector form & collapsed state, Pending-switch UX & duration, Cart-discard guard, Failed-switch notice & Phase 17 boundary

---

## Selector form & collapsed state

### Visual form

| Option | Description | Selected |
|--------|-------------|----------|
| Dropdown popover | Trigger button (current branch + default badge) opens an upward popover; reuses the user-chip menu pattern (shell.jsx:155-168) | ✓ |
| Inline expanding list | Expands in place, pushes user-chip down | |
| Modal dialog | Centered modal listing branches | |

**User's choice:** Dropdown popover

### Collapsed sidebar behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Compact branch chip | Always-visible chip (initial/icon) opens the same popover; branch stays visible when collapsed | ✓ |
| Hide entirely | Match RO/EN toggle — only appears when expanded | |
| You decide | Planner picks | |

**User's choice:** Compact branch chip
**Notes:** Branch identity matters more than language did — a wrong-branch action is costly, so it should never be hidden.

---

## Pending-switch UX & duration

### Pending presentation

| Option | Description | Selected |
|--------|-------------|----------|
| In-selector only | Spinner in selector; order actions disable via isOffline-style prop | |
| Global overlay | Translucent full-screen "Switching to <branch>…" blocks all interaction | ✓ |
| You decide | Planner picks | |

**User's choice:** Global overlay

### Duration / release condition

| Option | Description | Selected |
|--------|-------------|----------|
| Hold until SSE reconnects | Keep disabled state until switch() resolves AND SSE reconnects on the new branch — fulfills Phase 15 D-05, no false offline flash | ✓ |
| Release on switch resolve | Release the moment switch() resolves; SSE reconnect may briefly show OfflineBanner | |

**User's choice:** Hold until SSE reconnects

### Reconnect-failure safety valve

| Option | Description | Selected |
|--------|-------------|----------|
| Timeout → release anyway | Bounded window (~5–8s); if no reconnect, drop overlay + toast + OfflineBanner | ✓ |
| Hold indefinitely | No timeout — risks trapping the user under the overlay | |
| You decide | Planner picks value/fallback | |

**User's choice:** Timeout → release anyway

### Toast timing

| Option | Description | Selected |
|--------|-------------|----------|
| Toast on release | Success toast fires when overlay releases (after reconnect or timeout) | ✓ |
| Toast on switch resolve | Toast fires the moment switch() resolves, behind the overlay | |

**User's choice:** Toast on release

---

## Cart-discard guard

### Immediate vs. confirm

| Option | Description | Selected |
|--------|-------------|----------|
| Confirm only if cart non-empty | Immediate when empty; confirm dialog ("discards N items") when cart has items | ✓ |
| Always immediate | Instant switch, silent cart discard | |
| Always confirm | Confirm every switch, even empty cart | |

**User's choice:** Confirm only if cart non-empty

### Neutral landing screen

| Option | Description | Selected |
|--------|-------------|----------|
| Orders (live board) | Detail/history-detail exit to Orders; other screens stay & re-scope | ✓ |
| Always reset to Orders | Every switch routes to Orders regardless of current screen | |
| You decide | Planner picks | |

**User's choice:** Orders (live board)
**Notes:** POS stays on POS with cart remounted empty via `key={currentBranch?.id}`, consistent with "other screens stay."

---

## Failed-switch notice & Phase 17 boundary

### Error notice in this phase

| Option | Description | Selected |
|--------|-------------|----------|
| Generic error toast | Single generic toast + revert selector + release overlay; nothing else changed | ✓ |
| Code-specific messages now | Read err.code and tailor per code — overlaps Phase 17 | |
| You decide | Planner picks copy | |

**User's choice:** Generic error toast

### Phase 17 boundary firmness

| Option | Description | Selected |
|--------|-------------|----------|
| Hard boundary — defer all | Phase 16 = switch + non-optimistic success + generic fail toast + revert. Zero err.code branching, zero recovery UI, no retry-suppression | ✓ |
| Soft — wire the seam | Mostly defer but set branchSwitcherForceOpen on failure now | |

**User's choice:** Hard boundary — defer all

---

## Claude's Discretion

- Exact popover markup/styling, the "default" badge visual, collapsed-chip glyph (initial vs icon).
- Overlay-hold timeout value (~5–8s) and whether the timeout fallback adds a retry affordance.
- Whether the cart-discard confirm dialog reuses the existing cancel-dialog modal pattern.
- Popover loading/error states for `useBranches()`.
- Exact selector form for reading POS cart emptiness (D-13 gate).

## Deferred Ideas

- Phase 17 (BERR) — code-aware 403 recovery: per-code messages, reopen switcher (`branchSwitcherForceOpen`), refetch branch list, SSE retry-suppression, `NO_BRANCH_ACCESS` full-screen block.
- Possible richer timeout-fallback affordance (retry button in OfflineBanner after a D-09 timeout) — natural Phase 17 extension.
