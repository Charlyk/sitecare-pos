# Phase 15: SSE Branch-Aware Reconnect - Context

**Gathered:** 2026-07-22
**Status:** Ready for planning

<domain>
## Phase Boundary

The live SSE order stream (`src/use-sse.js`) opens **one** connection scoped server-side to the session's `selected_branch_id` at connect time. When the active branch switches, that open connection keeps streaming the **old** branch's events. This phase makes the stream **drop and reopen — scoped to the new branch — as soon as a switch lands**, rather than waiting on the library's passive exponential-backoff retry. Requirement: **SCOPE-02**.

**Delivers:**
- `useSSE` reacts to `currentBranch?.id` changing by tearing down the old connection (`ctrl.abort()`) and opening a fresh one scoped to the new branch.
- SSE cache writes **re-keyed to Phase 14's branch-scoped query keys** (they currently write to the now-orphaned unscoped `['orders']` / `['stats']`).
- The existing snapshot-silence mechanism preserved across reconnect so a switch never fires the new-order sound for orders already open on the new branch (SC3).
- A minimal, non-behavioral **capture scaffold** logging any non-2xx `onopen` status + body shape, to record the 403 branch-resolution signal for Phase 17.

**Out of scope for this phase** (later phases):
- The **switch flow / mutation** that actually *sets* `currentBranch` (`client.me.branches.switch`) — Phase 16 (SWCH-03). This phase makes the stream *react* to a `currentBranch` change; it does not trigger one. There is no switcher UI yet.
- **403 branch-access handling / recovery** (toast, reopen switcher, refetch, retry suppression, `NO_BRANCH_ACCESS` block) — Phase 17 (BERR-01/02/03). This phase only *captures/logs* the signal shape; it does not act on it or change the current throw→retry behavior.
- **Bridging the pending-disabled UI state across the reconnect** so users don't see a false "offline" flash after a switch — Phase 16 (owns the switch flow and its pending state).
- **POS cart reset / detail-screen exit on switch** — Phase 16 (SCOPE-03).

</domain>

<decisions>
## Implementation Decisions

### Reconnect trigger (the ROADMAP-relevant central choice)
- **D-01:** `useSSE` reads `currentBranch?.id` from Zustand **internally** (via a selector at hook top, e.g. `useAppStore((s) => s.currentBranch?.id)`) and adds it to the SSE `useEffect` **dependency array**. A branch change re-runs the effect → `ctrl.abort()` the old connection → open a fresh one. Chosen over passing `branchId` as a param from `app.jsx` and over an imperative `reconnect()` because it keeps the hook **self-contained, declarative, and testable now without Phase 16** — and mirrors Phase 14 D-02 ("keys/streams react automatically; the phase does not touch the switch flow"). The effect's own abort→re-run gives SC1's visible drop-and-recover for free. — **Reversibility:** reversible — the change is local to `use-sse.js`'s effect dependency list and one selector read.
- **D-02:** Because the reconnect is dependency-driven and `currentBranch` is only set **after** a switch succeeds (Phase 16 sets it in `onSuccess`, never optimistically), the reconnect naturally fires **post-switch-resolution** — no cross-phase coupling, and Pitfall-4 race safety by construction (same reasoning as Phase 14 D-02).

### SSE cache-write keying (alignment with Phase 14)
- **D-03:** The SSE message handlers write to the **connection's captured `branchId`** — the selector value the effect closed over at connect time — never a fresh per-message store read. An in-flight message from a just-aborted old connection can therefore only ever land on the **old** branch's key; the old effect is torn down before the new one writes. Rejects "live store read per message," which could let a late old-connection message write the *new* branch's key and reintroduce cross-branch bleed. Mirrors Phase 14 D-04's read-once-close-over pattern. — **Reversibility:** costly — undoing means re-threading branch reads through all four cache-write sites in `use-sse.js`.
- **D-04:** All SSE cache writes re-key to Phase 14's exact shapes: the `order_new` upsert and `order_status_changed` list patch → `['orders', branchId]`; the status-filtered invalidations (`fromStatus`/`toStatus`) → `['orders', branchId, status]`; the detail patch → `['order', branchId, orderId]`; the stats invalidations → `['stats', branchId]`. Missing one leaves a live event writing an orphaned unscoped key that no hook reads — the silent-stale-stream failure this phase exists to prevent. (See Phase 14 `14-CONTEXT.md` key convention: `branchId` is always the first variable segment.)

### Offline UX during the switch reconnect
- **D-05:** Phase 15 lets `isConnected` flip **honestly** during a branch-triggered reconnect (brief `OfflineBanner` via `shell.jsx:226` + Accept/Advance disabled via `screen-orders.jsx:149-151`). Keeps the hook self-contained and SC1's "visible drop and recover" literally true. **Phase 16 — which owns the switch flow — is responsible for holding its pending-disabled ("switching…") state across the reconnect** so users perceive one continuous switch, not a false "offline" flash after the success toast. Phase 15 adds no suppression flag (there is no real switch signal to key it off until Phase 16). — **Reversibility:** reversible — no new state added in Phase 15; the bridging lives entirely in Phase 16.

### 403 branch-resolution signal (the ROADMAP-flagged item)
- **D-06:** Phase 15 adds a **minimal, non-behavioral capture scaffold** in `onopen`: when the response is non-2xx, log the status + response body shape before the existing throw. This records the actual 403 branch-resolution signal shape whenever one first occurs (realistically during Phase 16/17 testing, since there is no switcher to trigger it in Phase 15). It does **not** add any handling, recovery, retry-suppression, or behavior change — the current throw→`onerror`→library-retry path is untouched. All 403 *handling* is Phase 17 (BERR). Rejected "pure defer" (loses the free observability hedge) and "capture + probe now" (needs test setup that doesn't exist pre-switcher — wasted effort). — **Reversibility:** reversible — a single logging line in `onopen`.

### Verification method
- **D-07:** SC2 ("KDS and order list both receive the new branch's live events, confirmed against a second live session on that branch") is recorded as a **human-verification / UAT item** run against the live API — it needs two concurrent live sessions and cannot be unit-tested without encoding the assumption. Automated tests cover the reconnect *mechanism* (effect re-runs and aborts on `branchId` change), snapshot-silence preservation across reconnect (SC3), and cache-key alignment with Phase 14 (D-04). Same live-API-verification pattern as v1.1's timezone / cents-vs-RON confirmations.

### Claude's Discretion
- Exact selector form for reading `currentBranch?.id` in `use-sse.js` (inline `useAppStore` selector vs. a small shared selector) — planner's call, as long as it triggers a re-render/effect-re-run on id change.
- Whether the captured `branchId` is threaded as a closed-over `const` inside the effect body or passed into small helper writers — planner's call, as long as D-03's "captured, not live-read" invariant holds.
- Whether the D-06 capture logs via `console` or a more structured sink, and the exact fields logged (status is mandatory; body/headers best-effort) — as long as it stays non-behavioral.
- Test scaffolding specifics for the reconnect/snapshot-silence/key-alignment assertions (mock branch ids, fake SSE messages, abort-spy).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & roadmap
- `.planning/REQUIREMENTS.md` — **SCOPE-02** (line 25): the single locked requirement for this phase. Also read SCOPE-01 (line 24, Phase 14 — the keys this phase aligns to) and SWCH-03 / SCOPE-03-04 (lines 19, 26-27, Phase 16 — the switch flow that eventually triggers the reconnect).
- `.planning/ROADMAP.md` §"Phase 15" (lines 108–122) — goal + 4 success criteria + the **explicit planning note** on the unverified `fetchEventSource` `onopen`/`onerror` 403 signal shape (D-06 resolves this in favor of a capture-only scaffold, handling deferred to Phase 17).

### Prior phase context (carried forward — load-bearing)
- `.planning/phases/14-branch-scoped-cache-re-scoping/14-CONTEXT.md` — Phase 14's branch-scoped **key convention** that this phase's SSE writes MUST match (`branchId` always the first variable segment: `['orders', branchId, status?]`, `['order', branchId, id]`, `['stats', branchId]`). Its `<code_context>` "Integration Points" explicitly flags `useSSE` as the deferred consumer this phase closes. D-01/D-02 (key-driven reaction, no switch-flow coupling) are the pattern D-01/D-02 here mirror.
- `.planning/phases/13-branch-state-launch-seeding-foundation/13-CONTEXT.md` — `currentBranch` is the session-only `SelectedBranch` object in Zustand (`store.js:68`), nullable-is-valid, never persisted; the `enabled: !!client` / never-`!!branchId` lock (SC4 single-branch regression).

### Research (all 2026-07-21, HIGH confidence)
- `.planning/research/SUMMARY.md` §"Phase 3: SSE Branch-Aware Reconnect" — this phase's deliverables and the reconnect-vs-passive-retry rationale.
- `.planning/research/PITFALLS.md` — **Pitfall 4** (refetch/reconnect-before-switch-resolves race — why the `currentBranch`-set-after-success ordering is safe), **Pitfall 11** (single-branch regression — SC4). Check for any pitfall on the SSE snapshot sound burst.
- `.planning/research/ARCHITECTURE.md` — how the SSE hook sits relative to the branch-scoped hooks and the eventual Phase 17 `onError` interceptor.

### SDK / server contract (source of truth over the PRD)
- `node_modules/@charlyk/admin-client/dist/index.d.ts` — SSE client + the error envelope carrying `code: string` (relevant to the D-06 capture and Phase 17). Confirm the SSE endpoint auth path.
- Server SSE route (referenced in `use-sse.js:4`: `sitecare-orders-api/src/routes/v1/sse/index.ts`) — the event shapes (`order_new`, `order_status_changed`, `ping`) and how the connection resolves `selected_branch_id`.

### Source files this phase modifies
- `src/use-sse.js` — add `currentBranch?.id` selector + effect dep (D-01); capture `branchId` closed over (D-03); re-key all four cache writes (D-04); add non-2xx `onopen` capture log (D-06).
- `src/app.jsx:105-108` — `useSSE(token, …)` call site + `isOffline` derivation (read-only awareness; no change required by D-01 since the store read is internal, but confirm).
- `src/__tests__/use-sse.test.js` — extend with reconnect-on-branch-change, snapshot-silence-across-reconnect, and Phase-14-key-alignment assertions (D-07).

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`currentBranch` in Zustand** (`store.js:68`) — session-only, already shipped by Phase 13; read `currentBranch?.id` via a selector (same idiom as the 7 Phase-14 hooks). No new state needed.
- **`snapshotDone` ref + 100ms window** (`use-sse.js:21,32,44`) — already resets `snapshotDone.current = false` at the top of every effect run, so a dependency-driven reconnect gets a fresh silent snapshot window **for free**. SC3 is largely structural under D-01 — the planner's job is to *preserve* it, not build it.
- **`normalizeOrder` / `SDK_STATE_MAP`** (`src/data.jsx`) — already imported and used by the handlers; unchanged.
- **`unwrapSdkResult`** (Phase 14, in `src/data.jsx`) — exists for fetch hooks; not directly needed here (SSE isn't an SDK fetch call), but the `err.code` convention it established is the same one Phase 17 will read from the D-06-captured 403.

### Established Patterns
- **Effect keyed on connection inputs** — the SSE effect already depends on `[token, queryClient]` and tears down via `return () => ctrl.abort()`. Adding `branchId` to that array is the exact same idiom; `onLiveOrder` is deliberately excluded via a ref to avoid reconnect churn — **do not** add `branchId` via a ref (it MUST trigger reconnect, unlike `onLiveOrder`).
- **`onLiveOrder` stored in a ref** (`use-sse.js:22-23,69`) — sound trigger stays stable; branch reconnect must not disturb this pattern.
- **Phase 14 branch-scoped keys** — `['orders', branchId, status?]` etc. are the canonical shapes the SSE writes must adopt (D-04).

### Integration Points
- **Phase 16 switch flow** is the eventual *trigger* — it sets `currentBranch` in `onSuccess`; this phase's effect reacts. Phase 15 ships the reaction; Phase 16 ships the trigger AND the pending-state bridge (D-05).
- **Phase 17 `onError` / 403 recovery** is the eventual *consumer* of the signal shape D-06 captures.
- **`isOffline` fan-out** — `isConnected` from `useSSE` drives `OfflineBanner` (`shell.jsx:226`) and disables order actions (`screen-orders.jsx:149-151`) across every screen (`app.jsx:255-277`). D-05 accepts the honest flash here; Phase 16 owns smoothing it.

</code_context>

<specifics>
## Specific Ideas

- **`branchId` MUST go in the effect dependency array, not a ref.** The existing `onLiveOrder`-in-a-ref pattern exists precisely to *avoid* reconnects; `branchId` is the opposite — a change must force a reconnect.
- **Captured, not live-read** (D-03): the branchId that scopes the connection is the one that keys its writes. This single invariant is what keeps a torn-down old connection from ever polluting the new branch's cache.
- `null` is a legitimate resolved `branchId` (single-branch tenant / non-401 cold-start) — the reconnect and key logic must treat `null` as a stable value, not "unloaded," consistent with Phase 14 D-07/D-08. A single-branch tenant's `branchId` never changes, so its connection never reconnects (SC4).

</specifics>

<deferred>
## Deferred Ideas

- **Phase 16 — bridge the pending-disabled state across the reconnect** (D-05): Phase 16's non-optimistic switch handler should keep order actions in their "switching…" disabled state until `isConnected` recovers, so the honest Phase 15 offline flash is invisible to the user as a false disconnect. Surfaced here, owned there.
- **Phase 17 — 403 branch-access handling** (BERR): consume the D-06-captured signal shape; add toast + reopen switcher + refetch branch list for `BRANCH_INACTIVE` / `BRANCH_ACCESS_REVOKED`, a full-screen block for `NO_BRANCH_ACCESS`, and suppress the library's blind exponential-backoff retry on a 403 (which will otherwise loop forever against an inaccessible branch).
- **Phase 16 — switch flow / `client.me.branches.switch` mutation** (SWCH-03) and **POS cart reset / detail exit on switch** (SCOPE-03).

None of these were scope creep — all are already-roadmapped later phases surfaced by the discussion.

</deferred>

---

*Phase: 15-sse-branch-aware-reconnect*
*Context gathered: 2026-07-22*
