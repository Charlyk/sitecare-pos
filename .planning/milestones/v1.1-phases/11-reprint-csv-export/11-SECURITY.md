---
phase: 11
slug: reprint-csv-export
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
created: 2026-07-19
---

# Phase 11 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| npm/crates registry → build | Third-party install-time code enters the supply chain (plugin-dialog, plugin-fs) | Install-time executable code |
| JS → OS filesystem (dialog + fs plugins) | User-picked path crosses into a native write capability | CSV file contents (order data already visible on screen) |
| JS → thermal printer IPC (`print_receipt`) | Reprint reuses the existing serial-port command; no new IPC surface | Order/receipt payload |
| CSV export → external spreadsheet | Exported fields opened later in Excel/Sheets can execute as formulas | Order data (customer name, phone are user-authored) |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-11-SC | Tampering | `npm install @tauri-apps/plugin-dialog` (same-day-publish [SUS]) | high | mitigate | Blocking-human legitimacy checkpoint verified `repository.url` → official `tauri-apps/plugins-workspace` monorepo; core-team maintainers + `latest:2.7.2` tag confirmed; human typed "approved" before install. `@tauri-apps/plugin-fs` resolves to the same monorepo. | closed |
| T-11-CAP | Elevation of Privilege | over-broad `fs:scope` capability grant | high | mitigate | `capabilities/default.json` grants exactly `dialog:allow-save` + `fs:allow-write-text-file` — no `fs:scope`, no other `fs:allow-*`. Relies on the dialog plugin's session-scoped path auto-extension (Research A1). | closed |
| T-11 | Tampering | `escapeCsvField` in `history-utils.js` (CSV formula injection) | high | mitigate | Leading `=`/`+`/`-`/`@`/tab/CR neutralized with a leading apostrophe (`FORMULA_INJECTION_RE`) before RFC-4180 quoting. Scoped (WR-02) to the only injection-capable inputs — user-authored `customer.name` + `customer.phone`; programmatic columns cannot carry an attacker formula, so the posture is unchanged. Unit-tested. | closed |
| T-11-B | Tampering | positional field integrity for partial-field orders | medium | mitigate | Every column routed through `escapeCsvField`; a missing field becomes an empty position, never a dropped one that shifts downstream columns. Unit-tested. | closed |
| T-11-R1 | Denial of Service (runtime crash) | missing `onPrint` on `history-detail` route (Pitfall 1) | high | mitigate | `app.jsx:271` passes `onPrint={handlePrint}` on the read-only route; regression test (`app-history-route.test.jsx`) fails if the prop is dropped. A reprint click can never throw `onPrint is not a function`. | closed |
| T-11-R2 | Elevation of Privilege (unintended print) | reprint buttons when no printer configured | low | mitigate | `screen-detail.jsx:284-286` — buttons `disabled` + `pointerEvents:none` + `cursor:not-allowed` when `printerConfigured` is false. Inert, not merely dimmed. | closed |
| T-11-R3 | Tampering | reprint reuses existing `handlePrint`/`print_receipt` | low | accept | No new IPC surface introduced; existing click-time printer-config guard and `print_receipt` port validation unchanged. | closed (accepted) |
| T-11-E1 | Tampering (arbitrary file overwrite) | `save()` defaultPath / write path | low | mitigate | Default filename derived from the app's own period `from`/`to` (never user-typed); the write path comes only from `save()`'s return, never reconstructed; the native OS Save dialog enforces overwrite confirmation. | closed |
| T-11-E2 | Information Disclosure | CSV contents = data the user already sees | low | accept | Export operates only on `visible` — data already on screen for an already-authorized staff user; no new data surfaced. | closed (accepted) |
| T-11-E3 | Denial of Service (misrouted error) | cancel-vs-error handling | medium | mitigate | `screen-history.jsx:418` — explicit `if (!path) return;` before `writeTextFile` so a cancelled dialog is a silent no-op, not an error toast. Test-asserted. | closed |

*Status: open · closed · open — below high threshold (non-blocking)*
*Severity: critical > high > medium > low — only open threats at or above workflow.security_block_on (high) count toward threats_open*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-11-1 | T-11-R3 | Reprint adds a second UI entry point to the existing, unchanged `handlePrint`/`print_receipt` path — no new IPC surface. | Plan disposition (11-03) | 2026-07-19 |
| AR-11-2 | T-11-E2 | CSV export contains only data already rendered on-screen to an authenticated staff user. | Plan disposition (11-04) | 2026-07-19 |

*Accepted risks do not resurface in future audit runs.*

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-07-19 | 10 | 10 | 0 | gsd secure-phase (L1 grep classification; register authored at plan time, ASVS L1 short-circuit) |

Notes: A prior code review (11-REVIEW.md) found and fixed CR-01 (reprint `u32` deserialization crash — a robustness bug, not a listed threat) and WR-02 (CSV formula-injection guard over-scoping). WR-02's fix narrows the guard to user-authored columns; this was reviewed here and does **not** weaken T-11, since only user-authored fields can carry an injected formula.

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-07-19
