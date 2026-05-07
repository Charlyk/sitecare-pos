---
quick_id: 260507-q1
slug: hide-settings-tabs
status: complete
date: 2026-05-07
commit: 49a5e29
---

# Summary: Hide Settings Tabs

Removed `users`, `tax`, `store`, and `integrations` from the `tabs` array in `src/screen-settings.jsx`. Only the `display` (Afisaj) tab remains. Default tab state updated from `'users'` to `'display'` so settings opens directly on the display panel.

The hidden tab content (users list, tax cards, store card, integrations grid) remains in the file for future use — only the tab buttons were removed from the navigation.
