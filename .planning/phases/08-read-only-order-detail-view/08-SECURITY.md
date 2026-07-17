---
phase: 8
slug: read-only-order-detail-view
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
created: 2026-07-17
---

# Phase 8 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| API (`/v1/orders/{id}`) → app | `getOrder` response is server-controlled. Documented failures are 401 and 404. | Full order record: items, modifiers, totals, customer phone, delivery address |
| SDK response → derivation layer | `order.events[]` consumed by `deriveDuration` without validation; `toStatus`/`createdAt` may be absent, duplicated, out of order, or unparseable. | Status-transition events, incl. the `actor` field (never read) |
| TanStack cache `['order', id]` → both detail routes | Shared cache entry, also written by `use-sse.js:94` via `setQueryData` on live status events. | Order record |
| Zustand `historyOrder` (UI state) → merged server state | Summary object stored at navigation time, merged with query data at render time. | AdminOrder summary fields |
| readOnly route → mutating actions | The `readOnly` prop is the only barrier between an archived financial record and controls that would change it. | User intent on a settled order |
| SDK error → rendered copy | `useOrderDetail` throws an `Error` built from the server's `result.error.error` string. | Raw server error text (never rendered) |
| presenter → staff reading a financial record | Rendered status and duration are read as facts about a closed order; may inform refund, payroll, or ops decisions. | Derived status, derived duration |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-08-01 | Elevation of Privilege | Ungated Modify button on the `history-detail` route | high | mitigate | `{!readOnly && (...)}` at `screen-detail.jsx:152` — DOM removal, not `disabled`/CSS hiding. Verified unreachable in hydrated readOnly render. | closed |
| T-08-09 | Elevation of Privilege | A mutating control elsewhere in `screen-detail.jsx` | medium | mitigate | Full sweep: every button gated or non-mutating. Reachable under readOnly are back (`:49`), tab toggles (`:249`,`:252`), retry (`:335`) — all non-mutating. Print (`:263`,`:266`), advance (`:274`), cancel (`:290`), call (`:115`) all sit behind `!readOnly`. Standing allowlist test guards regressions. | closed |
| T-08-02 | Information Disclosure | Raw SDK error string (`result.error.error`) in items-card error copy | low | mitigate | Only fixed i18n strings render: `t('h_detail_error_title')` (`:333`), `t('check_connection')` (`:334`). `app.jsx:262` passes `isError` as a boolean; the thrown `Error`'s message is never read. | closed |
| T-08-03 | Tampering (data integrity) | Shared `['order', id]` cache entry, writable by `use-sse.js:94` while the read-only view is open | low | accept | D-02 "one order, one truth" — a late SSE event reflects reality catching up. Both routes read only orders the authenticated staff member may already see; `listAdminOrders` and `getOrder` are both server-scoped to the authenticated restaurant. Freshness tradeoff, not an access-control gap. | closed |
| T-08-04 | Spoofing / Repudiation | Staff misattribution via `events[].actor` / a promised "handled-by" field | medium | mitigate | "handled-by" removed from ROADMAP SC1 and REQUIREMENTS HIST-10, with a Design Elements Cut row recording why. `grep -rn "\.actor" src/` returns zero hits — no code path reads it. | closed |
| T-08-05 | Tampering (data integrity) | Duplicate or tied COMPLETED events selecting a stale duration | low | mitigate | `latestMsFor` selects max `createdAt` via `reduce` (not first-match `find`), with deterministic `>=` tie-break on array order. Unit-tested against a newest-first two-COMPLETED fixture. | closed |
| T-08-06 | Denial of Service (render crash) | Malformed `createdAt` / absent `placedAt` producing `NaN` or a throw during render | low | mitigate | Guards absent `placedAt`/`events`, `Number.isNaN` skip on unparseable `createdAt`, `Math.max(0, ...)` clamp, returns `null` rather than throwing. Unit-tested per case. | closed |
| T-08-07 | Tampering (integrity of a displayed record) | readOnly chip rendering a refunded/cancelled order as New/Done via `stateMeta` fallback | medium | mitigate | `screen-detail.jsx:22-23` routes the readOnly chip through `deriveDisplayStatus` + exported `historyStatusMeta` — the identical derivation the History row uses (D-05). | closed |
| T-08-08 | Repudiation | Unrecognised status silently labelled "Completed" by `historyStatusMeta`'s `map[status] \|\| map.completed` default | low | mitigate | `readOnly && displayStatus ?` guard — a null `deriveDisplayStatus` falls back to `stateMeta` rather than entering `historyStatusMeta`. Unit-tested. | closed |
| T-08-10 | Spoofing (false assertion about a record) | No-items message rendering while the fetch is in flight or failed | medium | mitigate | State machine at `screen-detail.jsx:156` evaluates `detailError` → `detailLoading` → `items.length === 0`, so the empty claim is only made about a settled, successfully-read order. `app.jsx` wires `isError`/`isPending` through. Unit-tested in all three states. | closed |
| T-08-11 | Denial of Service (information loss) | Error block replacing the totals block, blanking the AdminOrder total | medium | mitigate | Skeleton and error block scoped to the rows region only; card header slot and totals block stay mounted in every state. Asserted under both `detailLoading` and `detailError`. | closed |
| T-08-12 | Denial of Service (render crash) | New hook below `App()`'s conditional returns → "Rendered fewer hooks than expected" | medium | mitigate | Both `useOrderDetail` calls at `app.jsx:70` and `:76`, above the `coldStartBusy` (`:218`) and `!isAuthenticated` (`:223`) returns. Guarded by `app-guard.test.jsx`. | closed |
| T-08-SC | Tampering | npm/pip/cargo installs | high | accept | No package-manager install in this phase's committed work — `08-RESEARCH.md`'s Package Legitimacy Audit records zero new packages. See advisory below re: uncommitted working-tree drift. | closed |

*Status: open · closed · open — below high threshold (non-blocking)*
*Severity: critical > high > medium > low — only open threats at or above workflow.security_block_on count toward threats_open*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Advisory — Uncommitted Dependency Drift (out of phase scope)

Not a phase 8 threat; recorded so it is not lost. At audit time the working tree
carried uncommitted changes to `package.json` / `package-lock.json` that are not
part of any phase 8 commit:

- `@charlyk/admin-client` bumped `^1.1.29` → `^1.1.59` (existing vetted dependency,
  not a new package — so T-08-SC's "zero new packages" claim holds)
- `"tauri": "tauri"` → `"tauri": "tauri dev"` in scripts

A ~30-version jump of the sole data-layer SDK has not been vetted by this phase's
Package Legitimacy Audit. Recommend reviewing the changelog and committing or
reverting deliberately before the next phase seals.

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| R-08-01 | T-08-03 | Shared `['order', id]` cache is SSE-writable while the read-only view is open. Accepted as "one order, one truth" (D-02) — a late refund event reflects reality catching up, not contamination. Both routes are server-scoped to the authenticated restaurant. ⚠ Known Phase 11 consequence: a reprint from this view may print post-SSE data rather than the payload as originally fetched. | Plan 08-05 (D-02) | 2026-07-17 |
| R-08-02 | T-08-02 | Generic error copy does not distinguish 401 from a network fault. Deliberate simplification (D-08); 401 is handled app-wide by the existing auth-refresh/redirect layer and self-resolves before the user sees the generic message in most cases. | Plan 08-05 (D-08) | 2026-07-17 |
| R-08-03 | T-08-SC | No package-manager install occurs in this phase; zero new dependencies per `08-RESEARCH.md`. No install to gate. | Plans 08-01…08-05 | 2026-07-17 |

*Accepted risks do not resurface in future audit runs.*

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-07-17 | 13 | 13 | 0 | /gsd-secure-phase (orchestrator, ASVS L1 short-circuit) |

Register was authored at plan time across all five plans (`register_authored_at_plan_time: true`)
with `threats_open: 0` at classification and `asvs_level: 1`, so the L1 grep-depth
short-circuit applied and no separate auditor pass was required.

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-07-17
