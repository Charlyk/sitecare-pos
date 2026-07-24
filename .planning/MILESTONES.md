# Milestones: SiteCare POS Desktop App

## v1.2 Branch Switching (Shipped: 2026-07-24)

**Phases completed:** 5 phases, 16 plans, 30 tasks

**Key accomplishments:**

- Session-only `currentBranch` seeded from `getMe().selectedBranch` on both cold-start and sign-in, with a window-focus retry backstop and a corrected sidebar displayName — never persisted, never blocking a new spinner.
- ['branches']-keyed TanStack Query hook over client.me.branches.list(), mirroring use-stats.js's {data,error} unwrap, with enabled:!!client and finite staleTime — the accessible-branches list data layer with no UI consumer yet (D-08)
- Proved the branch-scoped cache pattern end-to-end on `useOrders` — `unwrapSdkResult()` helper, `['orders', branchId]` key, and lockstep invalidation — as the template for Plans 02–04 to mechanically expand to the remaining 6 hooks and invalidation sites.
- Mechanically retrofitted `use-order-detail.js`, `use-stats.js`, and `use-menu.js` to Plan 14-01's proven branch-scoped cache pattern — branchId-keyed queryKey plus `unwrapSdkResult()` error routing — with a dedicated SC1 branch-key test per hook.
- Mechanically retrofitted the final 3 fetch hooks to Plan 14-01's proven branch-scoped cache pattern — `use-restaurant-settings.js` and `use-delivery-areas.js` get key + `unwrapSdkResult()` error routing; `use-history-orders.js` gets a key-only change that preserves its live debug diagnostic — completing all 7 hooks for SCOPE-01.
- Moved the three remaining mutation invalidation call sites (`use-order-actions.js`'s two mutations, `screen-pos.jsx` POS-submit, `screen-menu.jsx` stock-toggle) onto branch-scoped keys in lockstep with Plans 01-03's query-key retrofit, and proved SC2 — a branch-a mutation never touches branch-b's cache — with a dedicated automated test. This closes the final plan of Phase 14: all 7 query-key hooks and all 6 mutation-side invalidation sites are now branch-scoped.
- useSSE now reconnects whenever `currentBranch?.id` changes — branchId is a real effect dependency (not a ref), every one of the seven SSE cache writes targets Phase 14's branch-scoped keys via a per-connection captured const, and a non-2xx onopen now logs the real 403 signal shape ahead of a Phase 17 spike.
- `useBranchSwitch()` non-optimistic mutation wired end-to-end through a minimal multi-branch popover, a global blocking overlay bridging the SSE reconnect, and a release-gated success toast — plus deletion of the RO/EN footer toggle (LANG-01).
- Expanded the tracer's bare branch selector into the full UI-SPEC-compliant control: single-branch read-only lock (SWCH-02), tenant "default" badge (SWCH-01), a collapsed-sidebar branch-initial chip (D-03), popover loading/error backstops (E3), and 22 new automated tests including a negative assertion that the RO/EN pill stays gone (LANG-01).
- Cart-discard confirm gate (D-13), open-detail exit to Orders (D-14), and a `key={currentBranch?.id}` remount close the loop on no prior-branch working state surviving a switch — proven by 13 new integration tests, zero regressions in the 575-test suite (1 pre-existing unrelated failure).
- Wired TanStack Query's global QueryCache/MutationCache `onError` to a new `handleBranchError(err, queryClient)` in `use-branches.js`, proving the one-central-path architecture end-to-end for `BRANCH_ACCESS_REVOKED` (toast + switcher reopen + `['branches']` refetch) before any expansion.
- Blocking-human checkpoint resolved as "live capture infeasible" — the three-literal-string BRANCH_CODES matcher from 17-01 is kept unchanged and locked by a new regression test, with the REST/SSE 403 body shapes recorded as explicit UNVERIFIED assumptions (not confirmed facts) via a project decision and a broken-windows ledger entry for 17-05 to re-check.
- `handleBranchError` now dispatches all three `BRANCH_CODES` (INACTIVE/REVOKED share copy-differentiated recovery via a `RECOVERABLE_CODE_COPY` map, `NO_BRANCH_ACCESS` sets a new `noBranchAccess` session flag), and `fireSwitch`'s own `onError` is trimmed with a `BRANCH_CODES` guard so a branch-code switch failure never doubles up with the central dispatcher's toast.
- A box-less, full-viewport `NoBranchAccessBlock` now supersedes `<Shell>` entirely as app.jsx's third top-level gate whenever the session-only `noBranchAccess` flag is true, with a Retry button that clears the flag only on a server-confirmed non-null `selectedBranch`, never optimistically.
- `use-sse.js`'s `onopen` now routes a branch-access SSE 403 through the same central `handleBranchError` dispatcher and returns without throwing — stopping `fetchEventSource`'s exponential-backoff retry loop against an inaccessible branch — while every non-branch non-2xx case (malformed body, non-branch code, non-403 status) keeps the exact prior warn+throw/retry behavior.
- `auth.jsx`'s window-focus listener now always revalidates the selected branch via `getMe()` on every focus (the old `|| currentBranch` null-only guard is removed), silently adopting a benign remote branch change with a neutral "Now showing `<branch>`" toast, routing a revoked/zero-branch state to the same `NO_BRANCH_ACCESS` block as a live 403, no-opping when unchanged, and guarding rapid-focus races with an in-closure `inFlight` boolean.

**Closeout:** `override_closeout` — 15/15 requirements code-complete and test-backed (~620 tests), all cross-phase flows wired (integration checker: 0 broken). **Known verification overrides: 11** (see STATE.md → Deferred Items): Phases 15/16/17 closed `human_needed` with 10 deferred UAT/verification items (live-account + pixel-fidelity checks; no test tenant with a switchable/revocable branch was available) plus 1 pre-existing debug session. **Open WINDOWS caveats: 2** — #1 the branch-access 403 envelope (REST + SSE) is UNVERIFIED against the live API (BERR recovery degrades silently if the assumed shape is wrong — load-bearing follow-up), #2 no concurrent-error de-dup guard. Stats: 41 src files changed (+3,938 / −116); ~620 tests (1 pre-existing unrelated `build-pipeline` failure). Audit: `.planning/milestones/v1.2-MILESTONE-AUDIT.md`.

---

---

## ✅ v1.1 Orders History Screen — SHIPPED 2026-07-19

**Phases:** 7–12 (6 phases) | **Plans:** 28 | **Tasks:** 61 | **Timeline:** 2026-07-17 → 2026-07-19
**Commits:** 40 feat commits | **Source changed:** 22 files (+6,009 LOC in `src/` + `src-tauri/src/`) | **Tests:** 487

### Delivered

A dedicated Orders History screen backing the live SiteCare API — restaurant staff can browse, filter, search, reprint, and export the full archive of past orders. All 13/13 v1.1 requirements (HIST-01…HIST-13) delivered and verified.

### Key Accomplishments

1. **History screen foundation** — new cashier-level "History" sidebar entry opening a day-grouped scroll of the last 30 days via `client.admin.orders.list({from,to})`, with per-day count/revenue subtotals, a client-computed 4-tile summary strip (orders / revenue / average / refunds), and loading/empty/error states (HIST-01/02/03/05/06/13)
2. **Read-only order detail** — reuses `screen-detail.jsx` in `readOnly` mode, hydrated on demand via `getOrder(id)`, showing items + modifiers, totals, phone, address, and a derived actual prep duration; every mutating control gated out (HIST-10)
3. **Period control** — Today / 7 / 30 / custom-range presets retarget the fetch through one seam with `keepPreviousData`; the client-computed summary strip follows for free so tiles and day headers can never disagree (HIST-04)
4. **Client-side filters + search** — status (All/Completed/Refunded/Canceled) and type (All/Delivery/Pickup/Dine-in, `local`→Dine-in) with live faceted per-period counts, plus diacritic-folded debounced search; filters, search, and period compose (HIST-07/08/09)
5. **Reprint + CSV export** — printer-gated reprint from the detail view, and accounting-grade CSV export via native Save dialog (`plugin-dialog`/`plugin-fs`) with RFC-4180 escaping, UTF-8 BOM, and OWASP formula-injection guard (HIST-11/12)
6. **Tech-debt closeout (Phase 12)** — History selection lifted into a session-only `historySelection` Zustand slice (survives History→detail→Back, resets on leave); backfilled `normalizeOrder` fallback-total + percent-discount regression tests; HIST-06 traceability fixed; CR-01/CR-02/WR-01/G-07-1 verified fixed (code + live check); Phase 10/11 Nyquist validations promoted; milestone audit re-derived to `passed`

### Known Overrides (override_closeout)

- 2 stale v1.0-era quick tasks (`kitchen-ticket-data-mapping`, `order-card-item-groups`, both dated 2026-04-24, `[missing]`) — orphaned index entries, acknowledged and deferred at close (see STATE.md → Deferred Items)
- Phase 8 verification flagged `stale` by hash (Phase 12 commits touched shared files after Phase 8's verify) — audit-authoritative status is `passed` (9/9 must-haves, UAT 20/0); benign hash-staleness, not a functional gap

### Archives

- `.planning/milestones/v1.1-ROADMAP.md` — full phase details
- `.planning/milestones/v1.1-REQUIREMENTS.md` — all 13 requirements with outcomes
- `.planning/milestones/v1.1-MILESTONE-AUDIT.md` — audit report (`passed`)
- `.planning/milestones/v1.1-phases/` — phase execution artifacts

---

## ✅ v1.0 MVP — SHIPPED 2026-05-22

**Phases:** 1–6 | **Plans:** 35 | **Timeline:** 30 days (2026-04-22 → 2026-05-22)
**Commits:** 249 | **Files changed:** 348 | **Source LOC:** ~7,961 JS/JSX

### Delivered

Full production-ready Tauri v2 desktop app (macOS + Windows) — pixel-perfect port of the Claude Design POS prototype backed by the live SiteCare API. All 41/41 v1 requirements delivered.

### Key Accomplishments

1. Full Tauri + Vite + React scaffold — all 12 prototype files converted from CDN globals to ES modules; design tokens, fonts, and CSP wired on day 1
2. Secure authentication with OS keychain — username/password login; token persisted in macOS Keychain / Windows Credential Manager; proactive 8-hour refresh
3. Real-time kitchen display via SSE — `useSSE` with `@microsoft/fetch-event-source`; offline detection; TanStack Query cache serves stale data while offline
4. All 7 screens fully live-wired — orders list (search/filter), KDS (timers/urgency/sound/bump), POS (cart/checkout), menu availability toggles, settings persistence
5. Thermal printer integration — 4 Rust Tauri commands (list ports, save config, test print, print receipt) via ESC/POS; 166 tests passing; approved-no-hardware
6. Full CI/CD release pipeline — GitHub Actions release.yml with macOS arm64 notarization, Windows MSI, Ed25519 auto-updater signing, silent in-app updates

### Known Gaps

- BILD-03: Windows code signing — unsigned MSI produced; Azure Trusted Signing deferred to v1.1

### Archives

- `.planning/milestones/v1.0-ROADMAP.md` — full phase details
- `.planning/milestones/v1.0-REQUIREMENTS.md` — all 41 requirements with outcomes

---
