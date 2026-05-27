# Stack Research — v1.1 Orders History Screen

**Updated:** 2026-05-27

## Existing Stack (do not re-add)

Tauri 2.x · React 18 · Vite 6 · Zustand 5 · TanStack Query 5 · @charlyk/admin-client

## New Stack Additions Needed

### Client-side CSV export

| Option | Size | Rationale |
|--------|------|-----------|
| Manual CSV generation | 0KB | Viable; `Array.join(',')` + `Blob` + URL.createObjectURL triggers download |
| `papaparse ^5.4.1` | ~25KB | Battle-tested; `Papa.unparse(rows)` handles quoting/escaping; worth it if columns have commas |

**Recommendation:** Manual CSV generation for v1.1. Avoids a new dependency; add papaparse only if field values need escaping (customer names with commas).

For native Save dialog on Tauri: use `@tauri-apps/plugin-dialog` (already installed) + `@tauri-apps/plugin-fs` (may need adding) to write the file at a user-chosen path.

### PDF export

| Option | Notes |
|--------|-------|
| `jspdf` + `jspdf-autotable` | ~130KB total; works in Tauri WebView; mature API |
| Print-to-PDF via Tauri | Complex Rust pipe; fragile across OS versions |
| Defer to v1.2 | Lowest risk |

**Recommendation:** Scope v1.1 to CSV export only. PDF is a separate user need and adds significant dependency weight with little operational value over CSV for accounting.

### Date range picker

No new library needed. Use two `<input type="date">` HTML natives — already functional in Tauri WebView. Style with CSS variables from design system.

## What NOT to add

- react-datepicker / react-date-range — overkill for two date inputs; adds 30–100KB
- Cursor/page-based pagination library — SDK returns full set per date range, no server cursor
- SQLite local cache — not needed; TanStack Query caches per [from, to] query key
- jspdf for v1.1 — defer PDF to v1.2

## Version Pins (unchanged from v1.0)

All existing pins remain. If CSV export needs escaping: papaparse `^5.4.1`.
