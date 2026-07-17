---
phase: 9
slug: period-control
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
created: 2026-07-18
---

# Phase 9 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

The Phase 9 threat register was authored at plan time — every one of the five plans
(`09-01`…`09-05`) carries a parseable `<threat_model>` block. Verification ran at ASVS L1
(grep depth), which is sufficient for a plan-time register with zero open threats at or above
the blocking threshold (`high`). No `gsd-security-auditor` spawn was required.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| date-input `.value` → range query | A native `<input type="date">` accepts typed values that bypass its own `min`/`max`; `validateCustomRange` is the authoritative gate. This is the phase's only genuinely untrusted user input reaching a network parameter. | Two raw `'YYYY-MM-DD'` strings |
| resolved / applied range → rendered period label | `formatDateRange` / `periodLabel` output tells staff which accounting period they are reading. A wrong rendering is a false claim about money, not a cosmetic bug. | Date range → financial-period assertion |
| i18n table → rendered copy | Every string in `i18n.jsx` reaches the user verbatim. A missing/asymmetric key renders its own name and can pass review in one locale while shipping broken in the other. | UI copy (both locales) |
| History cache root → live-order cache root | `['history-orders', from, to]` vs `['orders']`. `use-sse.js` writes live kitchen-shaped orders into `['orders']`; a key collision would let SSE corrupt the admin-shaped archive. | TanStack Query cache keys |
| SDK error object → thrown Error message | `result.error.error` is a server-controlled string that becomes an `Error` message. | Server-controlled string |
| popover local state → screen state | The custom-range popover holds a half-built range that must not escape until Apply. | Uncommitted `{from,to}` draft |
| shared FilterBar → Phase 10/11 inert controls | Phase 9 edits the component that also hosts the status pills, search, and Export. Those controls' inertness is the only thing keeping unbuilt features unreachable. | UI capability surface |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-09-01 | Denial of Service | `validateCustomRange` — unbounded span reaching unpaginated `admin.orders.list` | high | mitigate | `MAX_RANGE_DAYS = 366` cap enforced in the validator layer that typed `min`/`max` cannot bypass — `history-utils.js:70,117`; boundary-exactness pinned by test | closed |
| T-09-02 | Tampering | `customRangeToQuery` — malformed/typed strings reaching the SDK as garbage `from`/`to` | medium | mitigate | Converter depends on a prior `validateCustomRange` pass; the `'incomplete'` branch rejects any non-`YYYY-MM-DD` / NaN value before conversion is reachable; component constructor only | closed |
| T-09-03 | Spoofing | `formatDateRange` — rendering a period label that does not describe the fetched range | medium | mitigate | Exclusive-`to` off-by-one pinned by a round-trip test through `customRangeToQuery`; locale-inverting numeric month rejected by construction (`month: 'short'` only), asserted in both locales | closed |
| T-09-04 | Tampering | Clock injection — a caller passing a manipulated `now` to widen the accepted span | low | accept | Injectable clock exists for deterministic tests, defaults to `new Date()`; an in-process caller could call the SDK directly — not a client-defensible boundary. See Accepted Risks. | closed |
| T-09-05 | Information Disclosure | Asymmetric i18n key set — a key added to `ro` but not `en`, rendering the raw key name | medium | mitigate | Every Task-1 acceptance criterion asserts a count of exactly 2 per key; fails on any single-locale addition regardless of which locale was missed | closed |
| T-09-06 | Tampering | Duplicate key shadowing an earlier declaration within the same locale object | medium | mitigate | Grep-before-write mandated for all eight names; programmatic duplicate scan fails on any `h_*` key appearing more than twice across the file | closed |
| T-09-07 | Denial of Service | Removing the old empty-state key while `screen-history.jsx` still reads it, blanking the empty state | medium | mitigate | Rename confined to `09-02`; consumer `09-04` declares `depends_on: [09-02]` in a later wave; `vitest run` catches any missed consumer | closed |
| T-09-08 | Denial of Service | Query-key instability — a caller re-deriving the range each render, refetching in a loop | high | mitigate | Hook computes no range (incapable of causing it); caller pins stability via `useMemo` — `screen-history.jsx:289`; stable-key test pins the guarantee from the caller side | closed |
| T-09-09 | Tampering | Query-key root collision with `['orders']`, letting SSE writes overwrite the history cache | high | mitigate | `['history-orders', from, to]` root preserved verbatim — `use-history-orders.js:27`; asserted by grep criterion; no change touches the root segment | closed |
| T-09-10 | Spoofing | `keepPreviousData` causing the previous range's rows to be read as the new range's result | medium | mitigate | `isPlaceholderData` exposed unwrapped so the caller can pin the period label to the settled range; placeholder test asserts the flag is true precisely while `data` is stale | closed |
| T-09-11 | Information Disclosure | Server's `result.error.error` string reaching the user through the thrown `Error` message | low | accept | `ErrorBlock` renders fixed i18n strings and never reads `error.message`; the thrown value is consumed as an `isError` boolean. Same disposition as `T-08-02`. See Accepted Risks. | closed |
| T-09-12 | Spoofing | A tile sub-label sourced from `selectedPeriod` rather than `settledPeriod` — a false revenue claim | high | mitigate | `SummaryStrip`/`EmptyBlock` receive `settledPeriod` only; `selectedPeriod` reaches `FilterBar` for pill styling alone — `screen-history.jsx:353,371,392`; WR-03 hardened `settledPeriod` to derive during render | closed |
| T-09-13 | Denial of Service | Unmemoized `getPresetRange()` in the render body producing a fresh key every render | high | mitigate | `useMemo(() => …)` wraps the resolution and `getPresetRange` has exactly one call site — `screen-history.jsx:289-292`; RESEARCH Pitfall 1 relocated from the former header comment | closed |
| T-09-14 | Elevation of Privilege | An inert Phase 10/11 control (status filter, search, Export) accidentally enabled | medium | mitigate | Forbidden edit region; render test asserts all three still carry `disabled`; `git diff` criterion fails if any `statusFilters`/`h_search`/`h_export` line changed | closed |
| T-09-15 | Spoofing | A failed switch rendering stale `keepPreviousData` rows beneath a pill naming the new period | high | mitigate | `isError` branch evaluated before any row rendering — `screen-history.jsx:370-372`; test asserts zero `history-row` elements with `isError: true` and non-empty placeholder data | closed |
| T-09-16 | Repudiation | Gating the dimming on `isLoading`, false for every switch after the first — D-05 silently unimplemented | medium | mitigate | Dimming gated on `isFetching && isPlaceholderData` (WR-02 refinement of the original `isFetching && !isLoading`) — `screen-history.jsx:341,411`; both directions asserted by test | closed |
| T-09-17 | Denial of Service | An oversized range reaching `admin.orders.list` — the range is the only bound on data volume | high | mitigate | Two layers per D-11: native `min`/`max` recomputed per field (affordance) + `validateCustomRange`'s `MAX_RANGE_DAYS` re-checked at click time (the guardrail); `366` imported not re-literalled | closed |
| T-09-18 | Tampering | A malformed typed date reaching `customRangeToQuery`, producing a garbage `from`/`to` | medium | mitigate | `validateCustomRange`'s `'incomplete'` branch + Apply's click handler early-return on any non-null reason make `customRangeToQuery` unreachable with an unvalidated pair | closed |
| T-09-19 | Spoofing | The Custom pill displaying a range that is not the live one (after preset click / dismiss / failed apply) | high | mitigate | D-04 clearing: `setSelectedPeriod({ id })` carries no `customRange` — `screen-history.jsx:319`; pill label reads `selectedPeriod.customRange`, the same value the range memo resolves from — one source, cannot diverge | closed |
| T-09-20 | Tampering | A range applied by dismissal rather than explicit Apply — committing an abandoned range | medium | mitigate | `onClose` and `onApply` are separate callbacks; the dismissal effect calls only `onClose`; tests assert outside-click and Escape never call `onApply` | closed |
| T-09-21 | Denial of Service | `document` `mousedown`/`keydown` listeners outliving the popover, accumulating per open/close | low | mitigate | Both listeners registered in one `useEffect` and removed in its cleanup return (`shell.jsx` precedent); grep asserts `'keydown'` appears twice; post-unmount Escape test | closed |
| T-09-22 | Information Disclosure | Native date picker rendering no `min`/`max` affordance on pre-Big-Sur WebKit | low | accept | The Apply-time validator is the guardrail on every platform — only the affordance degrades. See Accepted Risks. | closed |
| T-09-SC | Tampering | npm/pip/cargo installs (supply chain) | high | accept | No package-manager install in any Phase 9 plan — zero new dependencies per `09-RESEARCH.md` § Package Legitimacy Audit. `Intl.DateTimeFormat`, `<input type="date">`, and `keepPreviousData` (from already-installed `@tanstack/react-query`) are all pre-existing. See Accepted Risks. | closed |

*Status: open · closed · open — below high threshold (non-blocking)*
*Severity: critical > high > medium > low — only open threats at or above workflow.security_block_on count toward threats_open*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-09-01 | T-09-04 | Injectable clock is a test seam defaulting to `new Date()`; a caller able to pass a fake clock is already in-process and could call the SDK directly — not a boundary the client can defend. Consistent with `history-utils.js` convention across Phases 7–8. | Plan author (`09-01`) | 2026-07-17 |
| AR-09-02 | T-09-11 | `ErrorBlock` renders fixed i18n strings (`h_error_title` + `check_connection`) and never reads `error.message`; the thrown server string is consumed only as an `isError` boolean. Same disposition and rationale as `T-08-02`. | Plan author (`09-03`) | 2026-07-17 |
| AR-09-03 | T-09-22 | Native date picker may show no `min`/`max` affordance on pre-Big-Sur WebKit, but the Apply-time `validateCustomRange` guardrail holds on every platform — only the affordance degrades. `tauri.conf.json` pins no `minimumSystemVersion`. Human checkpoint reports actual target-machine behavior rather than blocking. | Plan author (`09-05`) + human checkpoint (approved 2026-07-17) | 2026-07-17 |
| AR-09-04 | T-09-SC | Zero new dependencies added anywhere in Phase 9; all primitives used (`Intl.DateTimeFormat`, `<input type="date">`, `keepPreviousData`) are runtime built-ins or already-installed exports. No supply-chain surface introduced. | Plan authors (`09-01`…`09-05`) | 2026-07-17 |

*Accepted risks do not resurface in future audit runs.*

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-07-18 | 23 | 23 | 0 | /gsd-secure-phase (L1 grep-depth, orchestrator) |

**Verification notes:** All eight `high`-severity mitigations confirmed present in shipped
code by grep — the `MAX_RANGE_DAYS` cap (`history-utils.js:117`), the distinct
`['history-orders', …]` cache root (`use-history-orders.js:27`), the `useMemo`-stabilized
range with a single `getPresetRange` call site (`screen-history.jsx:289-292`), the
`settledPeriod`/`selectedPeriod` separation feeding `SummaryStrip`/`EmptyBlock`
(`screen-history.jsx:353,371,392`), the `isError`-before-rows gate
(`screen-history.jsx:370-372`), and the D-04 custom-range clearing
(`screen-history.jsx:319`). `09-REVIEW.md` is `status: clean` — WR-01/WR-02/WR-03 fixed,
including the security-relevant WR-03 (`settledPeriod` now derived during render, closing the
one-paint false-financial-claim window that reinforces T-09-12).

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-07-18
