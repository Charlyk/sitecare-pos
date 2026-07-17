# Phase 10: Filters + Search - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-17
**Phase:** 10-Filters + Search
**Areas discussed:** Count scope, Summary strip under filters, Type filter placement, Search scope, Empty state copy

---

## Sequencing (pre-discussion)

Phase 10 depends on Phase 9, which had an interrupted discussion (3/4 areas, checkpoint only, no
CONTEXT.md). Raised before any Phase 10 work.

| Option | Description | Selected |
|--------|-------------|----------|
| Finish Phase 9 first | Resume from checkpoint, finish the last area, write 09-CONTEXT.md, then discuss Phase 10 | |
| Discuss Phase 10 anyway | Treat the 11 checkpoint decisions as provisional prior context | |
| Just write Phase 9's CONTEXT.md | Accept 3 areas as-is, skip the unfinished one, stop | |

**User's choice:** *Other* — "Phase 9 context updated, check again."
**Notes:** Re-checked and confirmed: `09-CONTEXT.md` (D-01…D-14) and `09-DISCUSSION-LOG.md` both present
and committed; checkpoint cleaned up. Phase 9 loaded as prior context and proved load-bearing throughout
(P9 D-03, D-04, D-05, D-06, D-12, D-13 all cited in Phase 10 decisions).

---

## Count scope

### Q1 — What the counts respect

| Option | Description | Selected |
|--------|-------------|----------|
| Counts respect all other filters | Count always answers "how many rows if I click this?" — coheres with P9 D-06 | ✓ |
| Period-only counts (design) | From the static period summary; a pill can read 240 while 12 rows show | |
| Type but not search | Middle ground; inconsistent rule, count still won't match row count | |

**User's choice:** Counts respect all other filters → **D-01**

### Q2 — Exclude-self faceting

| Option | Description | Selected |
|--------|-------------|----------|
| Yes — exclude self | Status count computed against type + search but not the status selection; pills stay navigational | ✓ |
| No — apply status too | Literally consistent, but every unselected pill reads 0 and the group goes dead | |

**User's choice:** Exclude self → **D-02**
**Notes:** Load-bearing consequence recorded in CONTEXT.md — D-01 + D-02 mean counts are *not* derivable
from the final filtered array. Two derived sets are required, one pass apart.

### Q3 — Zero-count pills

| Option | Description | Selected |
|--------|-------------|----------|
| Stays clickable, shows 0 | Avoids a third meaning for grey (unready P7 D-14 / loading P9 D-05 already coexist) | ✓ |
| Disabled and greyed at 0 | Prevents a useless click; overloads grey, flickers while typing | |
| You decide | | |

**User's choice:** Stays clickable → **D-03**

**Not asked — verified in source instead:** `filterFinishedOrders` + `deriveDisplayStatus`'s precedence
make the three status buckets partition the list exactly (All = Completed + Refunded + Canceled, no
double-count, no remainder; `deriveDisplayStatus` never returns null on this list). Recorded as an
INVARIANT rather than put to the user.

---

## Summary strip under filters

### Q1 — Do tiles follow filters?

| Option | Description | Selected |
|--------|-------------|----------|
| Tiles follow the filters | One rule for the screen; computeSummary already takes any list; sets up Phase 11's filtered export | ✓ |
| Period-wide (design) | Stable reference figure; recreates the tiles-vs-headers disagreement P7 D-15 dropped getAdminDashboard to prevent | |
| Filtered + period subtext | Both scopes readable; the sub-line is already spoken for by P9 D-12 | |

**User's choice:** Tiles follow the filters → **D-04**

### Q2 — The zero-Refunds consequence

| Option | Description | Selected |
|--------|-------------|----------|
| Accept it — one rule, no exceptions | Refunds reads 0 under a Completed filter; literally correct, keeps D-04 exception-free | ✓ |
| Refunds tile ignores status only | Tile stays informative; three tiles obey status and one doesn't, unexplained | |
| You decide | | |

**User's choice:** Accept it → **D-05**

### Q3 — Does the sub-label name the filters?

| Option | Description | Selected |
|--------|-------------|----------|
| Period only | Pills below already say what's filtered; preserves P9 D-12's single label source | ✓ |
| Append filters — "30 zile · Livrare" | Self-describing tile; breaks P9 D-12, can overflow, re-opens ro/en drift | |
| You decide | | |

**User's choice:** Period only → **D-06**

---

## Type filter placement

**Scouting findings presented before questions:** F-03 (the type group was never ported; P7 D-14's
zero-layout-shift promise doesn't cover HIST-08) and F-02 (the `'local'` vocabulary bug — see below).
Measured the real widths (1440 window − 240 sidebar − 48 pad = 1152px) and read the design screenshot
rather than estimating.

### Q1 — How the bar accommodates the type group

| Option | Description | Selected |
|--------|-------------|----------|
| Match the design — wrap search+export to row 2 | The screenshot (1440×900, the app's exact window size) shows the two-row wrap is intended; row 1 ≈990px fits in 1152px | ✓ |
| Force one row — icon-only type pills | Saves ~120px; diverges from design, discards existing i18n labels | |
| Type as a dropdown | Compact; a new control pattern nothing else uses | |

**User's choice:** Match the design → **D-07**
**Notes:** Production's current structure would *not* produce this — search is a standalone flex child
with only Export in an auto-margin div, so adding a type group strands search on row 1. The nesting must
change to match the design's single `marginLeft: auto` container.

### Q2 — Where to fix `'local'` → `'dinein'`

| Option | Description | Selected |
|--------|-------------|----------|
| In normalizeOrder — at the boundary | One line inverts screen-pos's outbound map; fixes HIST-08 and the live Orders defect; rendering unaffected | ✓ |
| Map inside the history predicate only | Smallest blast radius; leaves the shipped Orders bug, creates two type vocabularies | |
| Fix normalizeOrder, file the Orders bug separately | Same fix, tracked independently | |

**User's choice:** In normalizeOrder → **D-08**
**Notes:** F-02 was verified in source during the discussion and is worse than first framed —
`screen-orders.jsx:187` has the identical bug in **shipped v1.0**: selecting "La masă" on the live Orders
screen returns zero rows today, masked because `typeMeta` has no `'local'` key and falls through to
`map.dinein`. The chips render correctly; only filtering is broken. Same family as T-08-01/F-01. The user
chose the shared fix over the safe narrow one.

---

## Search scope

### Q1 — Which fields match

| Option | Description | Selected |
|--------|-------------|----------|
| Match what's rendered | dailyOrderNumber, the id[0:8] fallback when dailyNumber is null, plus customer name | ✓ |
| dailyOrderNumber + name only | Mirrors screen-orders.jsx:188-191; leaves null-dailyNumber rows unreachable | |
| Add customer phone | Beyond SC3 and the h_search label; not a visible column | |

**User's choice:** Match what's rendered → **D-09**

### Q2 — Debounce

| Option | Description | Selected |
|--------|-------------|----------|
| 250ms, clearing immediate | Below the ~300ms lag threshold; widening a result set has no cost | ✓ |
| 300ms uniform | Conventional; visible pause when clearing | |
| You decide | | |

**User's choice:** 250ms, clearing immediate → **D-10**

### Q3 — Diacritics

| Option | Description | Selected |
|--------|-------------|----------|
| Fold diacritics | Romanian-first POS; ș/ț habitually typed as s/t; pure helper in history-utils.js | ✓ |
| Plain lowercase substring | What the design and screen-orders.jsx do; staff omitting a diacritic get zero results | |
| You decide | | |

**User's choice:** Fold diacritics → **D-11**
**Notes:** Deliberately diverges from `screen-orders.jsx:188-191`. Recorded in `<deferred>`.

### Q4 — Filters vs period switch

| Option | Description | Selected |
|--------|-------------|----------|
| All survive the period switch | Period and filters are independent axes — SC4's "compose" | ✓ |
| Filters reset on period switch | Matches P9 D-04's clearing instinct; undercuts SC4 | |
| Status and type survive; search clears | Inconsistent rule with no visible logic | |

**User's choice:** All survive → **D-12**
**Notes:** Does not contradict P9 D-04 — that governs two expressions of the *same* axis; this governs a
*different* axis.

---

## Empty state copy

Flagged during the wrap-up check as the one named-but-undiscussed thread (P7 D-13 explicitly reserved the
empty state's sub-line for this phase). User chose to explore it rather than delegate it.

### Q1 — Distinguish empty-period from excluded-by-filters?

| Option | Description | Selected |
|--------|-------------|----------|
| Two distinct variants | Different causes, different remedies; the period line is factually false in the second case | ✓ |
| One copy for both | Fewer strings; either lies about the period or says nothing actionable | |
| Variants naming the active filters | Most precise; ro/en composition — P9 D-13's interpolation trap | |

**User's choice:** Two distinct variants → **D-13**
**Notes:** Surfaced that the P7 D-13 / P9 D-13 split does not survive filters — filters must reach the
**main** line, not only the reserved sub-line, because "Nicio comandă în ultimele 30 de zile" is false
when 240 orders exist and filters exclude them.

### Q2 — Clear-filters action?

| Option | Description | Selected |
|--------|-------------|----------|
| Yes — a clear-filters button in the empty state | Dead-end state, one obvious remedy; costs no permanent bar space | ✓ |
| No — the pills are right there | No new affordance; resetting means three clicks across two rows | |
| You decide | | |

**User's choice:** Yes → **D-14**
**Notes:** Resets status, type, and search — **not** the period (D-12: separate axes).

### Q3 — The Avg tile's em-dash

| Option | Description | Selected |
|--------|-------------|----------|
| Zero — em-dash means error, nothing else | Broadens P7's rule from "period is empty" to "no completed orders in view" | ✓ |
| Em-dash — "not applicable" | More honest for a null average; gives the glyph two meanings staff can't tell apart | |
| You decide | | |

**User's choice:** Zero → **D-15**
**Notes:** Raised proactively as a bug D-04 would otherwise introduce: under a Canceled-only filter
`avg === null` but `isEmptyState === false`, so `screen-history.jsx:250` renders the error em-dash during
a successful filter. The gating condition must change from `isEmptyState` to "not an error".

---

## Claude's Discretion

- Where filter state lives (bounded by D-12: must not be keyed to the range).
- How D-02's two derived sets are computed — one memo chain vs. two, and where the count pass sits.
- Debounce implementation — no debounce utility exists; `screen-orders.jsx`'s search is undebounced, so it
  is a precedent for the predicate but not the timing.
- Whether the status pill order is corrected to the design's All/Completed/Refunded/Canceled (production's
  inert bar has the last two swapped — F-03).
- The type group's cream selected styling — three selected treatments in one bar; port as drawn.
- Exact `h_empty_*` key naming for D-13's second variant (⚠ check for pre-existing keys first).

## Deferred Ideas

- Diacritic folding for the live Orders screen's search (`screen-orders.jsx:188-191`).
- Debounce for the live Orders screen's search.
- Extracting a shared filter-predicate module across Orders and History (promote on the third caller).
- Naming the active filters in the empty-state copy (rejected under D-13).
- Multi-select filters (would change D-02's faceting math).
- Persisting filters across navigation (reset-on-leave already accepted for v1.1).
- Design-system popover primitive (P9's trigger not pulled here — this phase adds no popover).
- List virtualization — ⚠ filtering does not shrink the fetched array, and D-01/D-02's count passes now
  traverse a potentially 366-day fetch on every debounced keystroke.
