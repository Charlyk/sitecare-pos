---
slug: pos-delivery-address-area
date: 2026-04-24
status: in-progress
---

# POS Delivery Address & Area

Update the manual order form (POS screen) so that:
1. Address input expands to the structured fields the SDK expects (`street`, `number`, `bloc`, `apartament`, `etaj`, `interfon`)
2. User can select a delivery area from a dropdown (loaded from `client.kitchen.deliveryAreas.list`)
3. Delivery fee is taken from the selected area (SDK returns cents → divide by 100)

## Tasks

- [ ] T1: Add i18n keys (street, street_number, bloc, apartament, etaj, interfon, choose_area, no_areas) to both ro and en
- [ ] T2: Create `src/use-delivery-areas.js` hook
- [ ] T3: Update `screen-pos.jsx` — area dropdown + structured address fields + dynamic fee
- [ ] T4: Update `src/__tests__/screen-pos.test.jsx` — mock useDeliveryAreas, update delivery tests

## SDK contract

- `client.kitchen.deliveryAreas.list({})` → `{ deliveryAreas: Array<{id,name,fee,...}> }`
- Fee is in cents (same as all SDK money values), divide by 100 for RON
- Create order body: `deliveryAreaId?: string`, `deliveryAddress?: { street, number, bloc?, apartament?, etaj?, interfon? }`
