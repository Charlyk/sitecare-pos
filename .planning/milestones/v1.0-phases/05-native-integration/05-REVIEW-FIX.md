---
phase: 05-native-integration
fixed_at: 2026-04-29T00:20:00+03:00
review_path: .planning/phases/05-native-integration/05-REVIEW.md
iteration: 1
findings_in_scope: 2
fixed: 2
skipped: 0
status: all_fixed
---

# Phase 05: Code Review Fix Report

**Fixed at:** 2026-04-29T00:20:00+03:00
**Source review:** .planning/phases/05-native-integration/05-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 2 (HIGH severity only — critical_warning scope)
- Fixed: 2
- Skipped: 0

## Fixed Issues

### HIGH-01: Byte-slice truncation panics on non-Romanian Unicode

**Files modified:** `src-tauri/src/lib.rs`
**Commit:** 4690586
**Applied fix:** Replaced byte-index slicing (`&safe[..safe.len().min(40)]`) with character-based slicing (`safe.chars().take(40).collect::<String>()`) at all three truncation sites:
- Line 262: `customer_name` truncation
- Line 268: `delivery_address` truncation
- Line 277: `item.name` truncation (`truncated_name`)

Cargo check passed with zero errors (one pre-existing dead_code warning for `table` field, unrelated to this fix).

### HIGH-02: Race condition in screen-printer.jsx mount effect

**Files modified:** `src/screen-printer.jsx`
**Commit:** f847bac
**Applied fix:** Replaced the two concurrent `Promise` launches in `useEffect` (mount) with a sequenced chain: config is loaded first via `load('preferences.json')`, the saved port is applied, and only then `invoke('list_serial_ports')` is called. `list[0]` is used as fallback only when no saved port exists. The `.catch()` branch handles store unavailability by still discovering ports (matching the previous behaviour for a fresh install). The `handleRefreshPorts` function at line 69 was already correct and was not modified.

JSX syntax check via `node -c` is not supported for `.jsx` files (node throws ERR_UNKNOWN_FILE_EXTENSION). Tier 1 verification (re-read of modified lines) confirmed the fix is present and surrounding code is intact.

---

_Fixed: 2026-04-29T00:20:00+03:00_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
