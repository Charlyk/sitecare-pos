---
slug: pos-delivery-address-area
date: 2026-04-24
status: complete
---

# Summary: POS Delivery Address & Area

## What was done

- **T1** — Added 8 i18n keys (street, street_number, bloc, apartament, etaj, interfon, choose_area, no_areas) to both `ro` and `en` in `src/i18n.jsx`
- **T2** — Created `src/use-delivery-areas.js` hook: fetches `client.kitchen.deliveryAreas.list({})`, normalizes each area to `{ id, name, fee }` (fee divided by 100 from cents to RON)
- **T3** — Updated `src/screen-pos.jsx`:
  - Replaced single `customer.address` string with structured fields: `street`, `number`, `bloc`, `apartament`, `etaj`, `interfon`
  - Added `deliveryAreaId` state
  - Added delivery zone `<select>` dropdown (shows area name + fee) above address fields
  - Replaced hardcoded `fee = 10` with `selectedArea?.fee ?? 0` from selected delivery area
  - Updated `handleCreate` to pass `deliveryAreaId` and full structured `deliveryAddress` to SDK
- **T4** — Updated `src/__tests__/screen-pos.test.jsx`: mocked `use-delivery-areas.js` with two test zones; added `deliveryAreas.list` to auth mock

## Result

13/13 tests pass. Delivery form now sends correct SDK payload with structured address and `deliveryAreaId`.
