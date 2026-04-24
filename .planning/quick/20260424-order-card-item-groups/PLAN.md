---
slug: order-card-item-groups
created: 2026-04-24
status: complete
---

# Split order card items into groups

Split the items preview in `OrderCard` (screen-orders.jsx) into two groups separated by a dashed divider:
1. Menu items (source !== 'global_product') — shown with primary color qty badge
2. Global products + delivery fee if applicable — shown in muted style below the divider

The "+N more" truncation counter now only counts hidden menu items (not global products or delivery fee).
