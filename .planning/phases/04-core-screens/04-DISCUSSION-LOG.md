# Phase 4: Core Screens - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-24
**Phase:** 04-core-screens
**Areas discussed:** Cancel order UX, Sound alert, POS discount, Display settings

---

## Cancel Order UX (ACT-03)

| Option | Description | Selected |
|--------|-------------|----------|
| OrderCard only | Cancel button on the order card, quick access | |
| OrderDetail only | Cancel only reachable via full detail screen | ✓ |
| Both screens | Cancel in card and detail | |

**User's choice:** OrderDetail only

---

| Option | Description | Selected |
|--------|-------------|----------|
| Confirm dialog | Small modal before cancellation | ✓ |
| Direct — no dialog | Immediate cancel on tap | |

**User's choice:** Confirm dialog

---

| Option | Description | Selected |
|--------|-------------|----------|
| No reason field | Simple confirm button only | |
| Optional reason dropdown | Preset reasons, skippable | |
| Required reason | Must pick before confirming | ✓ |

**User's choice:** Required reason — staff must pick a reason from a preset dropdown before the Confirm button activates.

---

## Sound Alert (KDS-04)

| Option | Description | Selected |
|--------|-------------|----------|
| Browser Audio API beep | Synthesized tone, no asset needed | |
| Bundled MP3 file | Custom audio file committed to repo | ✓ |

**User's choice:** Bundled MP3 file

---

| Option | Description | Selected |
|--------|-------------|----------|
| SSE new-order events only | Plays only on live events, not snapshot | ✓ |
| Any new order in cache | Plays on app open and reconnect too | |

**User's choice:** SSE new-order events only

---

| Option | Description | Selected |
|--------|-------------|----------|
| Mute toggle on KDS | Button on KDS screen, session-only Zustand state | ✓ |
| Always on | No mute control | |

**User's choice:** Mute toggle visible on KDS screen, state in Zustand (not persisted to disk)

---

## POS Discount (POS-03)

| Option | Description | Selected |
|--------|-------------|----------|
| Order-level % only | Single percentage field | |
| Order-level fixed or % | Staff picks between RON amount or % | ✓ |
| Per-item discount | Each cart item has its own field | |

**User's choice:** Order-level, staff chooses fixed RON or percentage mode via a toggle

---

| Option | Description | Selected |
|--------|-------------|----------|
| Totals area | Between delivery fee and total row | ✓ |
| Above cart items | Discount first | |
| Separate discount button | Extra tap to reveal field | |

**User's choice:** In the totals area, between fee and total rows

---

## Display Settings (SET-01/02/03)

| Option | Description | Selected |
|--------|-------------|----------|
| Add Display tab to SettingsScreen | New tab alongside Users/Tax/Store/Integrations | ✓ |
| Shell topbar only | Density + accent in topbar alongside lang | |
| Both locations | Controls in topbar and Settings | |

**User's choice:** New "Display" tab in SettingsScreen

---

| Option | Description | Selected |
|--------|-------------|----------|
| Trust Phase 1 persistence | Already verified, skip re-check | |
| Re-verify in Phase 4 | Include restart test in verification step | ✓ |

**User's choice:** Re-verify — close/reopen app and confirm lang/density/accent survive restart

---

## Claude's Discretion

- MP3 sound file selection (short chime, ~0.5s)
- Exact cancel reason preset text (bilingual)
- SSE snapshot vs live event detection implementation
- Discount API field name (inspect SDK types before implementing)
- Error handling style (brief toast, consistent with Phase 3)

## Deferred Ideas

- Cancel from OrderCard — deferred (cancel only in OrderDetail)
- Per-item discounts — deferred to v2
- Sound volume control / custom sound file — deferred; mute toggle is sufficient
