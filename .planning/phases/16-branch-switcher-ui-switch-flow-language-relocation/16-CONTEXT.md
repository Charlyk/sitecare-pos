# Phase 16: Branch Switcher UI, Switch Flow & Language Relocation - Context

**Gathered:** 2026-07-23
**Status:** Ready for planning

<domain>
## Phase Boundary

Staff can **see and change the active branch** from the sidebar footer. The switcher is a persistent selector that occupies the exact footer slot vacated by the removed RO/EN toggle. Selecting a branch runs a **non-optimistic** switch: `client.me.branches.switch({ body: { branchId } })` fires, the whole app is blocked behind a switching overlay, and the displayed branch + every branch-scoped data view + the live SSE stream update **only after the server confirms** — a rejected switch leaves the app entirely on the old branch beyond a generic error notice. The RO/EN language control is removed from the footer; language remains fully changeable from Settings → Afișaj (which already works). Requirements: **SWCH-01, SWCH-02, SWCH-03, SWCH-04, SCOPE-03, SCOPE-04, LANG-01**.

This is the **trigger phase** for the whole v1.2 branch-switching milestone: Phase 13 seeded `currentBranch`, Phase 14 made caches react to `currentBranch?.id`, Phase 15 made SSE reconnect on `currentBranch?.id` change. This phase ships the UI that actually *sets* `currentBranch` and orchestrates the switch. It builds `useBranchSwitch()` and the `branchSwitcherForceOpen` store field — both explicitly deferred here from Phase 13.

**Out of scope for this phase** (Phase 17 / BERR):
- Any **code-aware 403 recovery** — no `err.code` branching, no reopen-switcher-on-403, no branch-list refetch on error, no SSE retry-suppression, no `NO_BRANCH_ACCESS` full-screen block. Phase 16 shows only a **generic** failure toast and reverts (hard boundary, see D-11/D-12).
- The rich per-code messages (`BRANCH_INACTIVE` / `BRANCH_ACCESS_REVOKED` / `NO_BRANCH_ACCESS`) — Phase 17 consumes the code that Phase 14's `unwrapSdkResult` attaches.

</domain>

<decisions>
## Implementation Decisions

### Selector visual form (SWCH-01)
- **D-01:** The branch selector is a **dropdown popover** — a trigger button in the footer showing the current branch name + a "default" badge for the tenant default branch; clicking opens an **upward-opening popover** listing the accessible branches (current branch checked). Reuse the **exact pattern the user-chip menu already uses** (`shell.jsx:155-168`: `position: absolute; bottom: calc(100% + 6px)`, click-outside via a `ref`). Chosen over an inline expanding list (shifts footer layout) and a modal (heaviest interaction for a frequent action, least consistent with the compact sidebar).
- **D-02:** The selector sits in the **exact footer slot the RO/EN pill occupied** (`shell.jsx:143-154`, between the Collapse button and the user chip). SWCH-01 requires positional parity.
- **D-03:** **Collapsed sidebar → a compact branch chip** (branch initial or a branch icon) that stays visible and opens the same popover on click. The active branch remains visible even when collapsed — unlike the RO/EN toggle, which simply hid when collapsed. Rationale: acting on the wrong branch is costly, so branch identity should never be hidden.

### Single-branch tenant (SWCH-02)
- **D-04:** When the user has a **single accessible branch**, the selector renders **read-only with no dropdown affordance** (no chevron, no click target opening a popover) — preserving exact pre-v2.6 behavior. Gate the interactive/popover rendering on `branches.length > 1`, never on `currentBranch` truthiness (single-branch `selectedBranch` may be `null` — Pitfall 11 / SC4).

### Switch flow — non-optimistic (SWCH-03)
- **D-05:** Build **`useBranchSwitch()`** (TanStack mutation over `client.me.branches.switch({ body: { branchId } })`). On **success only**, set `currentBranch` in the store (`setCurrentBranch`) — **never optimistically**. Because Phase 14 keys and Phase 15 SSE both react to `currentBranch?.id`, setting it in `onSuccess` re-scopes caches and reconnects the stream automatically, post-resolution — Pitfall-4 race safety by construction. — **Reversibility:** costly — the non-optimistic ordering is the linchpin the whole milestone's race-safety rests on; making it optimistic would reintroduce the cross-branch bleed Phases 14/15 were built to prevent.
- **D-06:** SDK contract is confirmed: `switch` returns `{ ok: true, branchId }` on 200; errors are `400` (validation), `401` (unauthorized), `403` ("Branch not accessible"). `useBranches()` (Phase 13) already returns `AccessibleBranch[]` for the popover list — no new list query needed.

### Pending-switch presentation & duration (SCOPE-04 + Phase 15 D-05 handoff)
- **D-07:** While a switch is in flight, show a **global overlay** ("Switching to `<branch>`…") that blocks all interaction. Chosen over an in-selector-spinner-only treatment — the user wanted the atomic nature of the switch made unambiguous. Order mutations (Ring Up, Accept, Advance, Cancel, Reprint) are inherently blocked because the overlay covers everything; this satisfies SCOPE-04 (no mutation can land against the wrong branch during the pending window). — **Reversibility:** reversible — the overlay is a single new component gated on the mutation's pending/bridging state.
- **D-08:** The overlay is **held until the SSE stream reconnects** on the new branch (`isConnected` recovers), not merely until `switch()` resolves. This **fulfills the Phase 15 D-05 handoff**: the user perceives one continuous switch and never sees the honest OfflineBanner flash that Phase 15 deliberately left for Phase 16 to smooth. — **Reversibility:** reversible — the bridge lives entirely in this phase's overlay-release condition.
- **D-09:** **Bounded-timeout safety valve.** Hold the overlay for a finite window waiting for reconnect (planner picks the value, ~5–8s range); if SSE does not reconnect in time, **release the overlay anyway**, fire the success toast, and let the normal OfflineBanner take over. The switch already succeeded server-side, so the user lands on the new branch with the honest offline indicator rather than being trapped under the overlay. Rejected "hold indefinitely" (a genuinely down new-branch stream would trap the user with no escape).
- **D-10:** The **"switched to `<branch>`" success toast (SWCH-04) fires on overlay release** — after reconnect *or* timeout — so the confirmation appears exactly when the app becomes usable on the new branch, reinforcing the single-continuous-switch perception.

### Failed-switch notice & Phase 17 boundary (SC3)
- **D-11:** On a **failed `switch()`** (any 4xx incl. 403), fire a **single generic error toast** ("Couldn't switch to `<branch>` — try again") via the existing `pushToast` path, release the overlay, **revert the selector to the old branch**, and change nothing else (old branch, caches, stream all untouched). This literally satisfies SC3 ("leaves the app on the old branch with nothing changed beyond an error notice"). Rejected code-specific messages now (overlaps Phase 17 BERR, risks building recovery twice).
- **D-12:** **Hard boundary — all real 403 recovery is Phase 17.** Phase 16 does ONLY: fire `switch()`, non-optimistic success path, generic failure toast + revert. **Zero `err.code` branching, zero recovery UI, no retry-suppression** in this phase. Mirrors how Phases 14/15 deliberately produced signals (`err.code`, the `onopen` 403 capture) without consuming them. — **Reversibility:** reversible — keeping the failure path generic means Phase 17 slots its code-aware handler in without unwinding anything here.

### Cart discard & neutral landing (SCOPE-03)
- **D-13:** Switch is **immediate when the POS cart is empty** (the common case); when the **cart has items**, show a **confirm dialog** first ("Switching to `<branch>` will discard the current order — continue?") before firing `switch()`. Prevents nuking a half-built order via a mis-tap without adding friction to routine switches. Rejected always-immediate (silent data loss on mis-tap) and always-confirm (a click on the frequent harmless empty-cart case).
- **D-14:** On a successful switch, **exit any open order-detail / history-detail view to the Orders screen** (the neutral landing — the app's default home and the new branch's live board). Other screens (menu, settings, printer) **stay put** and re-scope via Phase 14's branch-keyed caches. **POS stays on the POS screen** with its cart discarded — implement the cart reset via `key={currentBranch?.id}` on the POS route so the component remounts empty (SCOPE-03), rather than routing away from POS.

### RO/EN language relocation (LANG-01)
- **D-15:** LANG-01 is **almost entirely a deletion.** Remove the RO/EN pill from the sidebar footer (`shell.jsx:143-154`). The Settings → Afișaj language control **already exists and is fully functional** (`screen-settings.jsx:119-140`, reads/writes `lang` from the store) — no new Settings work needed, no loss of capability. Verify `setLang` has no remaining sole dependency on the deleted footer control.

### Claude's Discretion
- Exact popover markup/styling, the "default" badge visual, and the compact-collapsed-chip glyph (initial vs icon) — planner/UI-spec, keeping to the existing sidebar chrome and the design system in `assets/colors_and_type.css`.
- The precise overlay-hold **timeout value** (D-09) and whether the timeout fallback shows the plain OfflineBanner or adds a retry affordance.
- Whether the cart-discard confirm dialog (D-13) reuses the existing cancel-dialog modal pattern (`app.jsx` `cancelDialog`) or a new small confirm — planner's call.
- Popover **loading/error states** for `useBranches()` (still fetching / errored) — planner picks sensible minimal handling; not a product-level decision.
- Exact selector form for reading POS cart emptiness to decide immediate-vs-confirm (D-13).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & roadmap
- `.planning/REQUIREMENTS.md` — **SWCH-01** (line 17), **SWCH-02** (18), **SWCH-03** (19), **SWCH-04** (20), **SCOPE-03** (26), **SCOPE-04** (27), **LANG-01** (38): the seven locked requirements for this phase.
- `.planning/ROADMAP.md` §"Phase 16" — goal + 5 success criteria. Note SC3 wording ("rejected switch leaves the app on the old branch with nothing changed beyond an error notice") is resolved by D-11/D-12; SC4 ("exits any open order-detail view back to a neutral screen") by D-14.

### Prior phase context (carried forward — load-bearing; this phase is their trigger)
- `.planning/phases/13-branch-state-launch-seeding-foundation/13-CONTEXT.md` — `currentBranch` is the full session-only `SelectedBranch` object in Zustand (`store.js:68`, setter `store.js:116`), never persisted; `useBranches()` already built (`src/use-branches.js`); **`useBranchSwitch()` + `branchSwitcherForceOpen` were explicitly deferred to THIS phase** (D-08 there). The `enabled: !!client` / never-`!!branchId` lock (SWCH-02 single-branch regression).
- `.planning/phases/14-branch-scoped-cache-re-scoping/14-CONTEXT.md` — branch-keyed query keys (`branchId` always first variable segment) already react to `currentBranch?.id`; setting `currentBranch` on switch re-scopes every cache **automatically** (D-02 there). `unwrapSdkResult` attaches the `err.code` Phase 17 will consume.
- `.planning/phases/15-sse-branch-aware-reconnect/15-CONTEXT.md` — SSE reconnects on `currentBranch?.id` change; **D-05 there is the handoff D-08 here fulfills** (Phase 16 owns bridging the pending state across the reconnect so no false offline flash). The `onopen` 403 capture scaffold is for Phase 17, not this phase.

### Research (all 2026-07-21, HIGH confidence)
- `.planning/research/SUMMARY.md` — build order; the switcher/switch-flow phase deliverables.
- `.planning/research/PITFALLS.md` — **Pitfall 4** (refetch/reconnect-before-switch-resolves race — why the `currentBranch`-set-after-success ordering is safe, D-05), **Pitfall 11** (single-branch regression — `branches.length > 1` gate, never `!!branchId`, D-04).
- `.planning/research/ARCHITECTURE.md` — how the switcher, the branch-scoped hooks, the SSE hook, and the Phase 17 `onError` interceptor relate.

### SDK contract (source of truth over the PRD)
- `node_modules/@charlyk/admin-client/dist/index.d.ts` — `me.branches.switch` → `/v1/me/branches/switch`, body `{ branchId: string }`, `SwitchBranchResponse = { ok: true, branchId }` (line 666), errors `400/401/403` (`SwitchMyBranchErrors`, ~line 2004). `AccessibleBranch` (id/name/slug/isDefault/isActive, line 670), `SelectedBranch` (same shape, nullable, line 677).

### Source files this phase modifies/adds
- `src/shell.jsx` — **remove** RO/EN pill (143-154, LANG-01); **add** the branch selector in that slot (D-01/D-02) + collapsed chip (D-03); popover mirrors the user-chip menu (155-168).
- `src/use-branches.js` — **add `useBranchSwitch()`** mutation (D-05) alongside the existing `useBranches()` list query.
- `src/store.js` — **add `branchSwitcherForceOpen`** field (deferred from Phase 13; consumed for Phase 17's reopen but wired minimally here per D-12) and confirm `setCurrentBranch` is the success setter; session-only, excluded from `partialize`.
- `src/app.jsx` — orchestrate the switch: global overlay (D-07/D-08/D-09), toast on release (D-10), neutral-landing routing (D-14: detail/history-detail → `setScreen('orders')`), POS `key={currentBranch?.id}` cart reset (D-14), cart-non-empty confirm gate (D-13). `useSSE` `isConnected` (105) is the reconnect signal for the overlay-release bridge.
- `src/screen-pos.jsx` — cart-emptiness read for the D-13 confirm decision; cart reset via remount key from `app.jsx`.
- `src/screen-settings.jsx` — **no change** — the Afișaj language control (119-140) already satisfies LANG-01's "no loss of capability."

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **User-chip menu popover** (`shell.jsx:155-168`) — the exact upward-opening, click-outside-via-ref popover pattern the branch selector reuses (D-01). `userMenuRef` / `userMenuOpen` is the template.
- **`useBranches()`** (`src/use-branches.js`) — already returns `AccessibleBranch[]`; the popover list source. `enabled: !!client` sole gate preserved.
- **`currentBranch` in Zustand** (`store.js:68`, setter `store.js:116`) — the success setter for the non-optimistic switch (D-05); session-only, never persisted.
- **`pushToast`** (`app.jsx:60`, `store` action) — `{ id, kind, title, detail }` — for the SWCH-04 success toast (D-10) and the D-11 generic error toast.
- **`isConnected` from `useSSE`** (`app.jsx:105`, `isOffline = !isConnected`) — the reconnect signal the overlay-release bridge keys off (D-08).
- **`cancelDialog` modal** (`app.jsx`) — existing confirm-dialog precedent the D-13 cart-discard confirm can mirror.
- **Settings → Afișaj language control** (`screen-settings.jsx:119-140`) — already fully functional; LANG-01 needs nothing here (D-15).

### Established Patterns
- **`isOffline` prop fan-out** — `app.jsx` threads `isOffline` to every screen (255-277) to disable order actions; the switching overlay (D-07) blocks interaction globally instead, so SCOPE-04 is satisfied by the overlay rather than by threading a new "switchPending" prop everywhere (planner may still choose to combine signals).
- **Non-optimistic mutation → store set in `onSuccess`** — Phases 14/15 both assume `currentBranch` changes only after success; D-05 must honor this or their race-safety breaks.
- **Session-only state never in `partialize`** — `branchSwitcherForceOpen` and any switch-pending flag are session-only.
- **Screen routing via `screen` string + `setScreen`** (`app.jsx`) — the D-14 neutral-landing exit is a `setScreen('orders')` on the detail/history-detail screens; POS cart reset is a React remount `key`, not a route change.

### Integration Points
- **Phase 14 branch-scoped caches** — react automatically when D-05 sets `currentBranch`; this phase does not touch the 7 hooks.
- **Phase 15 SSE reconnect** — reacts automatically to `currentBranch?.id`; its `isConnected` drop→recover is what D-08's overlay bridges.
- **Phase 17 `onError` / 403 recovery** — the eventual consumer; D-12 keeps this phase's failure path generic so Phase 17 slots in cleanly. `branchSwitcherForceOpen` is the seam.

</code_context>

<specifics>
## Specific Ideas

- The switcher is **net-new UI with no prototype reference** (v2.6 feature) — the design-fidelity rule doesn't bind the switcher's form; the user chose a dropdown popover deliberately. Still match the existing sidebar chrome + `assets/colors_and_type.css` tokens.
- The **overlay is the SCOPE-04 enforcement mechanism** — blocking all interaction globally is what guarantees no mutation lands against the wrong branch during the pending window, rather than per-button disabling.
- **Branch identity must stay visible when collapsed** (D-03) — the design intent is that "which branch am I on" is never hidden, because a wrong-branch action is costly. This is the deliberate divergence from how RO/EN behaved when collapsed.
- The success toast and the app becoming usable are **deliberately coupled** (D-10) — one perceived continuous switch, no premature "done" signal while the stream is still reconnecting.

</specifics>

<deferred>
## Deferred Ideas

- **Phase 17 (BERR) — code-aware 403 recovery:** consume `err.code` (`BRANCH_INACTIVE` / `BRANCH_ACCESS_REVOKED` / `NO_BRANCH_ACCESS`) to show per-code messages, reopen the switcher (via `branchSwitcherForceOpen`), refetch the branch list, suppress the SSE library's blind exponential-backoff retry on a 403, and render a full-screen block for `NO_BRANCH_ACCESS`. Phase 16 deliberately ships only a generic failure toast + revert (D-11/D-12); all code-aware behavior is Phase 17.
- **Possible richer timeout-fallback affordance** (retry button in the OfflineBanner after a D-09 timeout) — could fold into Phase 17's recovery work rather than this phase.

None of these were scope creep — the 403-recovery items are the already-roadmapped Phase 17; the timeout affordance is a natural Phase-17 extension surfaced by D-09.

</deferred>

---

*Phase: 16-branch-switcher-ui-switch-flow-language-relocation*
*Context gathered: 2026-07-23*
