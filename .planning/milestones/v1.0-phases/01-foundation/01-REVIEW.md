---
phase: 01-foundation
reviewed: 2026-04-22T00:00:00Z
depth: standard
files_reviewed: 20
files_reviewed_list:
  - src/app.jsx
  - src/main.jsx
  - src/store.js
  - src/shell.jsx
  - src/i18n.jsx
  - src/icons.jsx
  - src/data.jsx
  - src/screen-orders.jsx
  - src/screen-kitchen.jsx
  - src/screen-pos.jsx
  - src/screen-menu.jsx
  - src/screen-settings.jsx
  - src/screen-detail.jsx
  - src/screen-printer.jsx
  - src/colors_and_type.css
  - src/styles.css
  - src-tauri/src/lib.rs
  - src-tauri/tauri.conf.json
  - src-tauri/capabilities/default.json
  - .npmrc
findings:
  critical: 0
  warning: 6
  info: 5
  total: 11
status: issues_found
---

# Phase 1: Code Review Report

**Reviewed:** 2026-04-22
**Depth:** standard
**Files Reviewed:** 20
**Status:** issues_found

## Summary

The Phase 1 foundation is in good shape overall. The ES module conversion is complete and correct — no `window.*` globals remain in production code. The Zustand store is well-structured with proper partialize, the Tauri plugin-store adapter is correctly wired, and the CSP in `tauri.conf.json` is correctly configured for the API domain and Google Fonts. The `.npmrc` uses an environment variable for the GitHub token, not a hardcoded value.

Six warnings were found, all of which are logic or correctness issues that will cause visible bugs or incorrect behavior. None are security-critical. The most significant are: (1) the POS screen omits tax from the displayed total, (2) the `screen` persisted key can be `'detail'` on restart causing a blank content area, and (3) the role-gate `useEffect` is missing `screen` and `setScreen` in its dependency array.

Five informational items cover dead code, a non-persistent `localStorage` bypass in `MenuScreen`, and frozen mock timestamps.

---

## Warnings

### WR-01: POS total calculation excludes tax

**File:** `src/screen-pos.jsx:32`
**Issue:** `total` is computed as `subtotal + fee` only. The `tax` variable (19% of subtotal) is displayed in the breakdown UI and passed to `onCreate`, but it is never added to `total`. The displayed "Total" and the ring-up button label are therefore understated by the full VAT amount.
**Fix:**
```js
const total = +(subtotal + tax + fee).toFixed(2);
```

---

### WR-02: Persisted `screen` key can be `'detail'` on cold restart, producing blank content

**File:** `src/store.js:75-81`
**Issue:** The `partialize` function persists `screen` to disk (including `'detail'`). `selectedOrder` is session-only and always starts as `null`. On restart, if the last screen was `'detail'`, the app renders `screen === 'detail' && selectedOrder && <OrderDetailScreen …>` — the guard is falsy, so no screen component renders and the main content area is blank. The user cannot recover without navigating away via the sidebar.
**Fix:** Either exclude `'detail'` from the persisted value, or normalize on hydration:
```js
// In partialize or a merge/onRehydrateStorage callback:
screen: state.screen === 'detail' ? 'orders' : state.screen,
```
Or add an `onRehydrateStorage` callback to the persist config that resets `screen` to `'orders'` when it is `'detail'`.

---

### WR-03: Role-gate `useEffect` missing `screen` and `setScreen` in dependency array

**File:** `src/app.jsx:52-54`
**Issue:** The effect reads `screen` and calls `setScreen`, but the dependency array is `[role]` only. If `role` is already `'kitchen'` and the user navigates to a forbidden screen via a direct state mutation or future code path, the effect will not fire because `role` did not change. React's exhaustive-deps rule flags this; it is also incorrect per the React docs: all reactive values used inside an effect must be listed.
**Fix:**
```js
useEffect(() => {
  if (role === 'kitchen' && !['kitchen', 'orders'].includes(screen)) setScreen('kitchen');
}, [role, screen, setScreen]);
```

---

### WR-04: `MenuScreen` availability state is read from and never written back to `localStorage`

**File:** `src/screen-menu.jsx:11-23`
**Issue:** The `avail` state initialiser reads from `localStorage.getItem('sc_avail')` but there is no corresponding `useEffect` that writes changes back. Every toggle (`onChange v => setAvail(...)`) updates React state only; closing and reopening the app resets availability to the seeded defaults. Additionally, the `_seeded` guard key is read but never written, so the two items are always forcibly toggled out-of-stock on every fresh load regardless of what was previously saved.

This also violates the CLAUDE.md architecture rule that the plugin-store (not `localStorage`) is the persistence layer for this app. `localStorage` is not available in Tauri WebView on all platforms under strict CSP without explicit allowance.
**Fix:** Move availability state to Zustand (session) or persist it via `plugin-store`. If temporary localStorage usage is intentional for Phase 1, at minimum add a `useEffect` to write back and fix the `_seeded` sentinel:
```js
useEffect(() => {
  try { localStorage.setItem('sc_avail', JSON.stringify({ ...avail, _seeded: true })); } catch {}
}, [avail]);
```

---

### WR-05: `Math.random()` called inside JSX render for barcode widths causes infinite re-render risk

**File:** `src/screen-detail.jsx:265`
**Issue:** `Math.random()` is called directly inside the JSX map that renders barcode bars. Every re-render of `OrderDetailScreen` produces new random widths, meaning the barcode visually changes each time the component re-renders (e.g., when `tab` state changes). More importantly, if any parent component causes frequent re-renders, this creates a flickering visual artifact that is inconsistent with design fidelity requirements.
**Fix:** Generate the random widths once, outside render, using a deterministic seed derived from `order.id`:
```js
// Outside or in a useMemo:
const barcodeWidths = useMemo(() => {
  return [...(order.id.replace('#', '') + '00')].map((_, i) => ((i * 7 + 3) % 2 === 0 ? 2 : 1));
}, [order.id]);

// In JSX:
{barcodeWidths.map((w, i) => (
  <div key={i} style={{ width: w, height: 30, background: '#1a1a1a' }} />
))}
```

---

### WR-06: `tauri.conf.json` sets `decorations: true`, contradicting the architecture decision

**File:** `src-tauri/tauri.conf.json:20`
**Issue:** `CLAUDE.md` (Architecture Decisions) explicitly states "Rust side is thin — window chrome (`decorations: false`)". The config currently sets `"decorations": true`, which means the native OS window chrome (title bar, traffic lights on macOS) is rendered alongside the custom `titlebar` CSS. The `styles.css` file defines `.titlebar` with `-webkit-app-region: drag` and custom macOS-style traffic lights — these elements will be hidden behind or conflict with the system title bar.
**Fix:**
```json
"decorations": false
```

---

## Info

### IN-01: `useMemo` imported but never used in `screen-pos.jsx`

**File:** `src/screen-pos.jsx:1`
**Issue:** `useMemo` is imported from React but never referenced in the file. This is dead import.
**Fix:** Remove from import:
```js
import { useState } from 'react';
```

---

### IN-02: Mock order timestamps frozen at module load time

**File:** `src/data.jsx:35-36`
**Issue:** `const now = Date.now()` is evaluated once when the module is first imported. The elapsed-time calculations (`elapsedMinutes`, time labels on order cards and the kitchen screen) are correct at startup but drift further from reality as the session progresses. The kitchen screen compensates with a 30-second force-rerender interval. This is acceptable for Phase 1 mocks but will produce visually wrong data if the app is left open long enough.
**Fix:** No action needed in Phase 1 (this data is replaced in Phase 3). Noted for awareness.

---

### IN-03: `desktop-stage`, `desktop-frame`, and `tweaks-panel` CSS classes defined but never used in JSX

**File:** `src/styles.css:5-16, 213-227`
**Issue:** These classes (`desktop-stage`, `desktop-frame`, `tweaks-panel`, `tw-seg`, etc.) exist in `styles.css` from the prototype but no JSX in the current codebase applies them. They are dead CSS increasing bundle size slightly and adding noise.
**Fix:** Remove the unused rule-sets from `styles.css`, or leave them if they will be used in a later phase (e.g., a settings tweaks panel).

---

### IN-04: `typeMeta` imported in `app.jsx` from `screen-orders.jsx` — coupling screen modules through `app.jsx`

**File:** `src/app.jsx:14`
**Issue:** `app.jsx` imports `typeMeta` from `screen-orders.jsx` solely for use inside `AcceptDialog` (also defined in `app.jsx`). This creates a coupling where the top-level app file directly depends on a screen-level utility. It also means `AcceptDialog` is defined in the same file as the router, making `app.jsx` do double duty.
**Fix:** Move `AcceptDialog` (and its `typeMeta` dependency) into its own file `src/accept-dialog.jsx`, or move `typeMeta`/`sourceMeta`/`stateMeta` into a shared `src/order-utils.js` utility file that multiple screens import from.

---

### IN-05: `screen-menu.jsx` reads `localStorage` directly — violates project architecture rule

**File:** `src/screen-menu.jsx:13`
**Issue:** Same root cause as WR-04 but from an architecture perspective. The project's CLAUDE.md mandates that the plugin-store is the only persistence layer. Direct `localStorage` access is a rule violation (Critical Rule #4 is about `window.*` globals, and `localStorage` is `window.localStorage`). Even if the behavior is intentional for Phase 1, the pattern should not remain past Phase 2.
**Fix:** Track this as a known technical debt item to migrate in Phase 2 when Zustand store slices are expanded.

---

_Reviewed: 2026-04-22_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
