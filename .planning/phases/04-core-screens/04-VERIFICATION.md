---
phase: 04-core-screens
verified: 2026-04-27T23:10:00Z
status: gaps_found
score: 16/20 must-haves verified
overrides_applied: 0
gaps:
  - truth: "Ring Up button is disabled when cart is empty or isOffline"
    status: failed
    reason: "The Ring Up button disabled condition is `cart.length === 0 || createOrder.isPending || (type === 'delivery' && !deliveryAreaId)` — isOffline is accepted as a prop but not included. Staff can attempt order submission while offline."
    artifacts:
      - path: "src/screen-pos.jsx"
        issue: "Line 437: disabled={cart.length === 0 || createOrder.isPending || (type === 'delivery' && !deliveryAreaId)} — isOffline missing"
    missing:
      - "Add `isOffline ||` to the Ring Up button disabled condition at line 437"

  - truth: "Ring Up calls client.kitchen.orders.create with orderType 'local' (not 'dinein') for dine-in — Ring Up body maps each cart item to { productId: it.id, quantity: it.qty }"
    status: partial
    reason: "orderTypeMap and productId mapping are VERIFIED. However CR-01 (table number silently dropped from body) and CR-02 (discount encoding: pct mode sends raw percent integer instead of RON value, which conflicts with discountType: 'percent') are data-integrity bugs in what is submitted to the API. The cart-to-API mapping itself works but the full submission body is incorrect."
    artifacts:
      - path: "src/screen-pos.jsx"
        issue: "CR-01: table state is captured but never included in the orders.create body (lines 57, 192-217). CR-02: sdkDiscountAmount for pct mode sends Math.round(discountVal) = raw percent integer (e.g., 10), not RON cents."
    missing:
      - "CR-01: Add `...(type === 'dinein' && table ? { tableNumber: table } : {})` to createOrder body (confirm SDK field name first)"
      - "CR-02: Compute RON cents for discount: pct mode should send Math.round((subtotal * discountVal / 100) * 100)"

  - truth: "useSSE accepts an optional onLiveOrder callback and fires it only after 100ms post-connect"
    status: partial
    reason: "onLiveOrder callback and snapshotDone ref are VERIFIED and work correctly on first connect. CR-04: snapshotDone ref is never reset to false when the SSE connection drops and reconnects — after a reconnect the 100ms snapshot window is bypassed and every replayed snapshot order triggers a sound notification. This contradicts the snapshot-detection contract."
    artifacts:
      - path: "src/use-sse.js"
        issue: "CR-04: snapshotDone = useRef(false) is set once to true via setTimeout. On reconnect the useEffect runs again but snapshotDone.current remains true — snapshot orders after reconnect all trigger onLiveOrder."
    missing:
      - "Add `snapshotDone.current = false;` at the start of the useEffect body (after the token guard) so each (re)connect gets a fresh snapshot window"

  - truth: "app.jsx AcceptDialog onConfirm calls updateStatus.mutate instead of showing a toast only"
    status: partial
    reason: "updateStatus.mutate is correctly called. CR-03: inside AcceptDialog render, `order.customer.name` is accessed without an optional chain (app.jsx line 277). If an order has customer: null, this crashes with TypeError. normalizeOrder in data.jsx provides a fallback but KitchenScreen passes augmented order objects that may bypass normalizeOrder."
    artifacts:
      - path: "src/app.jsx"
        issue: "CR-03: Line 277: `{order.customer.name}` should be `{order.customer?.name}` — missing null guard"
    missing:
      - "Change line 277 in app.jsx: `{order.customer.name}` → `{order.customer?.name}`"
      - "Add null guards for order.items?.length as well"
---

# Phase 4: Core Screens — Verification Report

**Phase Goal:** All core restaurant screens fully wired to live API — Orders, KDS, POS, Menu, Settings all functional and human-verified
**Verified:** 2026-04-27T23:10:00Z
**Status:** gaps_found
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | store.js has soundMuted: false in session state and setSoundMuted action, NOT in partialize | VERIFIED | store.js line 56: `soundMuted: false`, line 75: `setSoundMuted: (v) => set({ soundMuted: v })`. partialize (lines 83-90) lists only 6 keys — soundMuted absent. |
| 2 | useSSE accepts an optional onLiveOrder callback and fires it only after 100ms post-connect | PARTIAL | Callback and snapshotDone ref exist and work on first connect. CR-04: snapshotDone is never reset to false before each reconnect — after a connection drop, every replayed snapshot order triggers onLiveOrder, defeating the snapshot-detection purpose. |
| 3 | app.jsx wires handleLiveOrder into useSSE and plays audio when soundMuted is false | VERIFIED | app.jsx line 93: `useSSE(token, (order) => { if (order?.state === 'new') playNotification(); })`. playNotification() checks soundMutedRef.current. Note: audio path is `/sounds/notification.mp3` (WR-03 — spec says `/sounds/new-order.mp3`; both files exist on disk so audio plays). |
| 4 | app.jsx AcceptDialog onConfirm calls updateStatus.mutate instead of showing a toast only | PARTIAL | updateStatus.mutate IS called correctly (lines 195-209). CR-03: `order.customer.name` at line 277 is accessed without optional chaining — null customer object causes TypeError crash. |
| 5 | statusToSDK mapping converts done→COMPLETED and out→OUT_FOR_DELIVERY | VERIFIED | app.jsx lines 27-35: statusToSDK object. Line 32: `out: 'OUT_FOR_DELIVERY'`, line 33: `done: 'COMPLETED'`. Used in handleAdvance (line 105) and CancelDialog onConfirm (line 222). |
| 6 | i18n.jsx has accept_success_title, accept_error_title, check_connection keys | VERIFIED | i18n.jsx line 148 (ro) + line 312 (en): accept_success_title present in both sections. check_connection present in both sections. |
| 7 | A Cancel button is visible in the OrderDetail right panel for non-terminal orders | VERIFIED | screen-detail.jsx line 217: `{order.state !== 'done' && order.state !== 'cancelled' && (` guards Cancel button visibility. |
| 8 | Confirming CancelDialog calls updateStatus.mutate with toStatus CANCELLED and the selected reason string | VERIFIED | app.jsx lines 219-238: CancelDialog onConfirm calls updateStatus.mutate with `toStatus: 'CANCELLED', reason`. |
| 9 | KDS elapsed timer re-renders every 60 seconds (not 30) | VERIFIED | screen-kitchen.jsx line 15: `setInterval(() => force(v => v + 1), 60000)`. grep confirms 30000 absent. |
| 10 | Mute toggle reads soundMuted from Zustand and calls setSoundMuted on click | VERIFIED | screen-kitchen.jsx lines 11-12: selectors present. Line 49: `onClick={() => setSoundMuted(!soundMuted)}`. Opacity at 0.6 when muted. |
| 11 | A search input is visible in the Orders filter bar and filters by dailyOrderNumber + customer name | VERIFIED | screen-orders.jsx lines 164, 186-190: searchQuery state, filter by dailyOrderNumber and customer name. Lines 248-263: SearchInput with search icon and clear button. Lines 291-299: conditional search-no-results empty state. |
| 12 | POS screen renders menu categories and items from useMenu() — not from MENU_CATEGORIES/MENU_ITEMS static imports | VERIFIED | screen-pos.jsx: no MENU_CATEGORIES/MENU_ITEMS imports. Line 7: `import { useMenu }`. Line 19: `useMenu()` called inside PosScreen. cats normalization with defensive fallbacks. |
| 13 | Ring Up calls client.kitchen.orders.create with orderType 'local' (not 'dinein') for dine-in — Ring Up body maps each cart item to { productId: it.id, quantity: it.qty } | PARTIAL | orderTypeMap correctly maps `dinein: 'local'` (line 12). productId: it.id correctly mapped (line 195). BLOCKER from CR-01: table number silently dropped. CR-02: discount encoding sends wrong unit for pct mode. |
| 14 | Ring Up button is disabled when cart is empty or isOffline | FAILED | screen-pos.jsx line 437: `disabled={cart.length === 0 \|\| createOrder.isPending \|\| (type === 'delivery' && !deliveryAreaId)}`. isOffline is accepted as prop (line 14) but not included in disabled condition. |
| 15 | MenuScreen renders item inStock state from useMenu() hook — not from localStorage | VERIFIED | screen-menu.jsx: zero localStorage references. Line 15: `useMenu()` called directly. Line 151: `<AvailSwitch on={it.inStock}`. |
| 16 | Toggling an AvailSwitch calls client.kitchen.products.updateStock with { body: { productId, inStock } } — no path param | VERIFIED | screen-menu.jsx line 38: `client.kitchen.products.updateStock({ body: { productId, inStock } })`. No path argument present. |
| 17 | On toggle success, queryClient.invalidateQueries({ queryKey: ['menu'] }) is called | VERIFIED | screen-menu.jsx line 39: `onSuccess: () => queryClient.invalidateQueries({ queryKey: ['menu'] })`. |
| 18 | A 'Display' tab is visible in the SettingsScreen tab bar | VERIFIED | screen-settings.jsx line 31: `{ id: 'display', label: t('display_tab'), icon: 'grid' }` in TABS array. Line 120: `{tab === 'display' && (` pane content. |
| 19 | Clicking RO/EN calls setLang; clicking density options calls setDensity; clicking swatches calls setAccent | VERIFIED | screen-settings.jsx lines 19-24: all three selectors. Lines 133, 156, 178: onClick handlers call setLang, setDensity, setAccent respectively. ACCENT_SWATCHES module-level const at line 7. |
| 20 | lang, density, accent values are read from Zustand and persist via partialize | VERIFIED | store.js partialize (lines 83-90) includes lang, accent, density. screen-settings.jsx reads from store via useAppStore selectors. |

**Score: 16/20 truths verified (4 failed/partial)**

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/store.js` | soundMuted + setSoundMuted, NOT in partialize | VERIFIED | All conditions met |
| `src/use-sse.js` | onLiveOrder callback + snapshotDone ref + snapshot timer | PARTIAL | Exists and wired; snapshotDone not reset on reconnect (CR-04) |
| `src/app.jsx` | handleLiveOrder + fixed AcceptDialog onConfirm + statusToSDK map | PARTIAL | statusToSDK + AcceptDialog mutate VERIFIED; CR-03 null guard missing in AcceptDialog render |
| `src/cancel-dialog.jsx` | CancelDialog with 5 reasons, canConfirm guard, onConfirm callback | VERIFIED | Exists, exports CancelDialog, 5 preset reasons, canConfirm guards opacity + pointerEvents |
| `src/screen-detail.jsx` | Cancel button + onCancel prop, state guard | VERIFIED | onCancel prop in signature, visibility guard for non-terminal states |
| `src/screen-kitchen.jsx` | 60s timer + soundMuted from store + mute toggle button | VERIFIED | All conditions met |
| `src/screen-orders.jsx` | searchQuery state + filter + SearchInput + search empty state | VERIFIED | All conditions met |
| `src/screen-pos.jsx` | useMenu() integration + orderTypeMap + discount field + createOrder mutation | PARTIAL | Core wiring VERIFIED; CR-01 (table dropped), CR-02 (discount encoding), WR-01 (isOffline not in disabled) |
| `src/screen-menu.jsx` | useMenu() live data + toggleStock mutation + localStorage removed | VERIFIED | All conditions met |
| `src/screen-settings.jsx` | Display tab + lang/density/accent controls wired to useAppStore | VERIFIED | All conditions met |
| `src/i18n.jsx` | All required bilingual keys for Plans 02-08 | VERIFIED | accept_success_title, cancel_dialog_title, search_placeholder, order_sent, display_tab, sound_on all present in ro + en |
| `public/sounds/new-order.mp3` | Bundled notification sound | VERIFIED | File exists at public/sounds/new-order.mp3 |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| src/app.jsx | src/use-sse.js | useSSE(token, callback) | VERIFIED | Line 93: `useSSE(token, (order) => { if (order?.state === 'new') playNotification(); })` |
| src/app.jsx | src/use-order-actions.js | updateStatus.mutate with statusToSDK mapped values | VERIFIED | Lines 195, 219: updateStatus.mutate called with statusToSDK values |
| src/app.jsx | src/cancel-dialog.jsx | cancelDialog state + CancelDialog JSX | VERIFIED | Line 25: import; line 57: useState; lines 214-239: JSX |
| src/screen-detail.jsx | src/cancel-dialog.jsx | onCancel prop triggers setCancelDialog in parent | VERIFIED | screen-detail.jsx line 243: `onClick={() => onCancel && onCancel(order)}` |
| src/screen-kitchen.jsx | src/store.js | useAppStore soundMuted + setSoundMuted | VERIFIED | Lines 11-12: selectors |
| src/screen-pos.jsx | src/use-menu.js | useMenu() returns categories | VERIFIED | Line 19: `useMenu()` inside PosScreen |
| src/screen-pos.jsx | src/auth.jsx | useAuth().client.kitchen.orders.create | VERIFIED | Line 170: createOrder mutation calls client.kitchen.orders.create |
| src/screen-menu.jsx | src/use-menu.js | useMenu() live data | VERIFIED | Line 15: `useMenu()` inside MenuScreen |
| src/screen-menu.jsx | src/auth.jsx | client.kitchen.products.updateStock | VERIFIED | Line 38: updateStock with { body: { productId, inStock } } |
| src/screen-settings.jsx | src/store.js | useAppStore reads/writes lang, density, accent | VERIFIED | Lines 19-24: all six selectors |

---

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|--------------|--------|--------------------|--------|
| screen-orders.jsx | orders array | useOrders() → TanStack Query ['orders'] cache | Yes — live API + SSE upsert | FLOWING |
| screen-kitchen.jsx | orders array | prop from app.jsx → same useOrders cache | Yes — live API + SSE | FLOWING |
| screen-pos.jsx | cats (menu categories) | useMenu() → kitchen.menu.list API | Yes — live API, defensive normalization | FLOWING |
| screen-menu.jsx | allItems (menu items + inStock) | useMenu() → kitchen.menu.list API | Yes — live API | FLOWING |
| screen-settings.jsx | lang, density, accent | useAppStore (Zustand) | Yes — persisted via plugin-store | FLOWING |

---

### Behavioral Spot-Checks

| Behavior | Check | Result | Status |
|----------|-------|--------|--------|
| KDS timer at 60s | `grep "60000" src/screen-kitchen.jsx` | 1 line match, 30000 absent | PASS |
| Static menu imports removed from POS | `grep "MENU_CATEGORIES\|MENU_ITEMS" src/screen-pos.jsx` | 0 lines | PASS |
| localStorage removed from MenuScreen | `grep "localStorage" src/screen-menu.jsx` | 0 lines | PASS |
| statusToSDK COMPLETED mapping | `grep "COMPLETED" src/app.jsx` | Line 33: `done: 'COMPLETED'` | PASS |
| statusToSDK OUT_FOR_DELIVERY mapping | `grep "OUT_FOR_DELIVERY" src/app.jsx` | Line 32: `out: 'OUT_FOR_DELIVERY'` | PASS |
| updateStock body-only (no path param) | `grep "path:" src/screen-menu.jsx` adjacent to updateStock | 0 matches near updateStock | PASS |
| Ring Up isOffline guard | `grep "isOffline" src/screen-pos.jsx` at disabled condition | isOffline in prop only, not in disabled | FAIL |
| Full test suite | `npx vitest run` | 124 pass, 25 todo, 0 fail | PASS |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| ORD-01 | 04-05 | Live orders list with status filtering | VERIFIED | useOrders() feeds screen-orders.jsx; status filter logic present |
| ORD-02 | 04-05 | FOH/BOH role switch | VERIFIED | Zustand role gates; setRole wired in Shell; human-verified pass |
| ORD-03 | 04-05 | Client-side search by order ID and customer name | VERIFIED | searchQuery state, filter by dailyOrderNumber + customer name, clear button |
| ACT-01 | 04-02 | Accept order with prep time → API transition | VERIFIED | AcceptDialog onConfirm calls updateStatus.mutate({ currentStatus: 'NEW', toStatus: 'ACCEPTED', estimatedMinutes }); note CR-03 null guard |
| ACT-02 | 04-02 | Advance order through lifecycle with correct SDK enum values | VERIFIED | statusToSDK: done→COMPLETED, out→OUT_FOR_DELIVERY in app.jsx |
| ACT-03 | 04-03 | Cancel order with required reason | VERIFIED | CancelDialog with 5 presets, canConfirm guard, updateStatus.mutate with CANCELLED + reason |
| KDS-02 | 04-04 | Elapsed timer updates every 60 seconds | VERIFIED | setInterval(60000) confirmed in screen-kitchen.jsx |
| KDS-03 | 04-04 | Urgency colors by age thresholds | VERIFIED | screen-kitchen.jsx: remaining>8 neutral, <=8 amber, <=3 terracotta |
| KDS-04 | 04-02/04-04 | Sound plays on new order arrival (not snapshot) | PARTIAL | snapshotDone ref and onLiveOrder callback functional on first connect; CR-04: sound burst on every reconnect because snapshotDone not reset |
| KDS-05 | 04-04 | Bump button advances ticket | VERIFIED | screen-kitchen.jsx line 133: onClick calls onAdvance(order, next.state) |
| POS-01 | 04-06 | Browse live menu from API | VERIFIED | useMenu() replaces static MENU_CATEGORIES/MENU_ITEMS |
| POS-02 | 04-06 | Cart with quantity adjustment | VERIFIED | addToCart, setQty functions; +/- buttons in cart items render |
| POS-03 | 04-06 | Order-level discount field | VERIFIED | discountValue/discountMode state, discountAmount useMemo, conditional discount line in totals |
| POS-04 | 04-06 | Order type selection (dinein/pickup/delivery) | VERIFIED | type state, orderTypeMap (dinein→local), type toggle buttons |
| POS-05 | 04-06 | Submit order to API; Ring Up disabled when cart empty or offline | FAILED (partial) | createOrder mutation calls client.kitchen.orders.create with orderTypeMap. FAIL: isOffline not in disabled condition. CR-01: table number dropped. CR-02: discount encoding bug. |
| MENU-01 | 04-07 | Toggle item availability calls updateStock | VERIFIED | toggleStock.mutate({ productId, inStock }), correct body shape |
| MENU-02 | 04-07 | Menu shows availability from live API | VERIFIED | useMenu() drives inStock; localStorage removed |
| SET-01 | 04-08 | Language toggle persists across restart | VERIFIED | setLang from store; lang in partialize |
| SET-02 | 04-08 | Density toggle persists across restart | VERIFIED | setDensity from store; density in partialize |
| SET-03 | 04-08 | Accent color picker persists across restart | VERIFIED | setAccent from store; accent in partialize; ACCENT_SWATCHES 4 colors |

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| src/screen-pos.jsx | 437 | `isOffline` prop accepted but not in Ring Up disabled condition | WARNING (CR-01 grade: BLOCKER for goal) | Staff can submit orders while offline — request fails, error toast shown, but no proactive block |
| src/screen-pos.jsx | 57 | `table` state captured but not included in createOrder body | BLOCKER | Table number silently dropped from every dine-in order submission |
| src/screen-pos.jsx | 187-190 | pct discount: sends raw percent integer, not RON cents | BLOCKER | API receives wrong discount value; "10% discount" sent as 10 instead of computed RON amount |
| src/app.jsx | 277 | `order.customer.name` without optional chaining | WARNING | Crash if order.customer is null; occurs for counter orders with no registered customer |
| src/use-sse.js | 21,42,66 | snapshotDone ref never reset before reconnection | WARNING | On SSE reconnect, all replayed snapshot orders trigger sound notification |
| src/app.jsx | 77 | Audio path `/sounds/notification.mp3` (spec says `/sounds/new-order.mp3`) | INFO | Both files exist on disk; audio plays but uses wrong file per spec |
| src/screen-pos.jsx | 160 | Dead variable `visible` (effectiveVisible is what renders) | INFO | Code smell only; no runtime impact |
| src/__tests__/accept-dialog.test.jsx | all | All ACT-01 tests are test.todo | WARNING | Zero automated coverage for highest-risk mutations |
| src/__tests__/cancel-dialog.test.jsx | all | All ACT-03 tests are test.todo | WARNING | Zero automated coverage for cancel flow |

---

### Human Verification Claimed

Per 04-09-SUMMARY.md, a human verification session was completed on 2026-04-27 with the following results recorded:

- Pre-flight: 124/124 tests green — PASS
- Criterion 1 (Order lifecycle: accept, advance, cancel): criterion-1-pass
- Criterion 2 (KDS timers, urgency, sound, bump): criterion-2-pass
- Criterion 3 (POS checkout end-to-end): criterion-3-pass
- Criterion 4 (Menu toggle persists in API): criterion-4-pass
- Criterion 5 (Settings Display tab persists across restart): criterion-5-pass
- Orders screen (live data, filters, search, role): orders-pass

These claims cannot be verified programmatically. The code review (04-REVIEW.md) was performed AFTER this human verification session and found 4 critical issues and 7 warnings, meaning the human verification session passed code that contained known bugs. The gaps reported here reflect bugs found post-human-verification.

---

### Gaps Summary

**4 gaps identified blocking full goal achievement:**

**GAP-1 (BLOCKER): isOffline not wired to Ring Up disabled condition (POS-05)**
The must_have truth explicitly states "Ring Up button disabled when cart is empty or isOffline." The code at screen-pos.jsx line 437 excludes isOffline from the disabled condition. Every other mutation in the app (KDS bump, Order Detail advance/cancel) guards on isOffline. Fix: add `isOffline ||` to the disabled condition.

**GAP-2 (BLOCKER): Table number silently dropped from POS API submission (CR-01)**
table state is displayed to staff but never sent to client.kitchen.orders.create. Kitchen receives no table assignment for dine-in orders. This is a data loss bug that directly affects the phase goal ("POS checkout flow... submit the order to the kitchen").

**GAP-3 (BLOCKER): Discount encoding sends wrong unit to API for pct mode (CR-02)**
For percentage discounts, the code sends `Math.round(discountVal)` (raw percent integer, e.g., 10 for 10%) while also sending `discountType: 'percent'`. This produces either a near-zero discount (if API interprets discountAmount as monetary) or ambiguous behavior. The discountAmount should be the computed RON value converted to cents.

**GAP-4 (WARNING — crash risk): AcceptDialog crashes when order.customer is null (CR-03)**
app.jsx line 277 accesses `order.customer.name` without optional chaining. Counter orders or orders from certain API responses may have customer: null. Fix is one character: `order.customer?.name`.

**Additional notable issues (not blocking individually but degrade goal quality):**
- CR-04: snapshotDone ref not reset on SSE reconnect — sound alert fires for every replayed snapshot order on reconnect
- WR-03: Audio path uses `/sounds/notification.mp3` but spec and plan say `/sounds/new-order.mp3`
- WR-04/05: ACT-01 and ACT-03 tests are all test.todo — zero automated coverage for highest-risk mutations

---

_Verified: 2026-04-27T23:10:00Z_
_Verifier: Claude (gsd-verifier)_
