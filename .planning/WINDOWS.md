---
schema_version: 1
open_count: 1
waived_count: 0
fixed_count: 0
total_count: 1
last_updated: 2026-07-23T21:05:51.908Z
---

# Broken Windows Ledger

> Cross-phase defect register. `/gsd-ship` blocks while `open_count > 0`.
> Waive with `gsd-tools windows waive <id> "<reason>"` (reason required).
> Mark fixed with `gsd-tools windows fixed <id>`.

| id | phase | kind | file | line | description | status | reason | recorded_at | resolved_at |
|----|-------|------|------|------|-------------|--------|--------|-------------|-------------|
| 1 | 17 | deviation | src/use-branches.js |  | BRANCH_CODES err.code matcher (BRANCH_INACTIVE/BRANCH_ACCESS_REVOKED/NO_BRANCH_ACCESS) is PROVISIONAL/UNVERIFIED — live 403 capture (REST + SSE + zero-branch getMe) was infeasible during 17-02 execution (no accessible test tenant). Assumed REST/SSE 403 shape { error: '<LITERAL_CODE>' } is locked only by a synthetic test (src/__tests__/use-branches.test.js). Follow-up: re-capture the real 403 body (REST + SSE) against the live sitecare-orders-api once a test account with a deactivable/revocable branch is available, and correct the matcher/extraction if it differs — plan 17-05 (SSE extractBranchCodeFromSseBody) must not treat this as confirmed. | open |  | 2026-07-23T21:05:51.908Z |  |

````json
[
  {
    "id": 1,
    "kind": "deviation",
    "phase": "17",
    "file": "src/use-branches.js",
    "line": null,
    "description": "BRANCH_CODES err.code matcher (BRANCH_INACTIVE/BRANCH_ACCESS_REVOKED/NO_BRANCH_ACCESS) is PROVISIONAL/UNVERIFIED — live 403 capture (REST + SSE + zero-branch getMe) was infeasible during 17-02 execution (no accessible test tenant). Assumed REST/SSE 403 shape { error: '<LITERAL_CODE>' } is locked only by a synthetic test (src/__tests__/use-branches.test.js). Follow-up: re-capture the real 403 body (REST + SSE) against the live sitecare-orders-api once a test account with a deactivable/revocable branch is available, and correct the matcher/extraction if it differs — plan 17-05 (SSE extractBranchCodeFromSseBody) must not treat this as confirmed.",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-07-23T21:05:51.908Z",
    "resolved_at": null
  }
]
````
