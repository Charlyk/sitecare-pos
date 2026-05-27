# Phase 1: Foundation - Context

**Gathered:** 2026-04-22
**Status:** Ready for planning

<domain>
## Phase Boundary

Bootstrap the Tauri+Vite project, migrate all 7 prototype screens from `window.*` globals to ES module imports/exports, wire the CSS design tokens through Vite, stand up the Zustand store with plugin-store persistence, and configure Tauri CSP for API access.

This phase delivers a working scaffold that renders all 7 screens with the correct design system — no live API data yet. It is the hard prerequisite for every subsequent phase.

</domain>

<decisions>
## Implementation Decisions

### Window Chrome

- **D-01:** Use `decorations: true` (native OS window chrome). Do NOT use `decorations: false` or the custom macOS titlebar from `lib/macos-window.jsx`. The known `@tauri-apps/plugin-window-state` bug (issue #14822) with `decorations: false` on macOS is avoided entirely. The `lib/macos-window.jsx` file is not used in the production Tauri app.

### Scaffold Location

- **D-02:** Scaffold the new Tauri+Vite project at the **repo root**. Before scaffolding, move all existing prototype files (`src/`, `assets/`, `lib/`, `index.html`) into a `_prototype/` archive directory. The Tauri project (`src/`, `src-tauri/`, `package.json`, `vite.config.js`) lives at the root.

### CSS Migration

- **D-03:** The prototype's component styles (the monolithic `<style>` block from `index.html`) move verbatim into `src/styles.css`. No splitting, no renaming of CSS classes. All existing class names (`.card`, `.btn-primary`, `.chip`, `.nav-item`, etc.) are preserved exactly.
- **D-04:** `assets/colors_and_type.css` (design tokens) is imported unchanged. Both `colors_and_type.css` and `styles.css` are imported once in `main.jsx` — no per-component CSS imports.

### API / CSP

- **D-05:** The SiteCare API base domain is `https://api.restaurant.sitecare.ro`. This domain MUST appear in `connect-src` in `tauri.conf.json`. Also add it to `event-src` for SSE (Phase 3 will need it; better to configure on day 1).

### Claude's Discretion

- **Zustand store shape:** Single flat store with logical grouping by concern (UI: screen, role, lang, accent, density, sidebar, toasts). Claude decides the exact slice structure.
- **`window.*` migration order:** Convert `i18n.jsx` first (every screen depends on `useT`), then `icons.jsx`, then leaf screens bottom-up, then `shell.jsx`, then `app.jsx`. This order is mandatory per codebase watch-out.
- **Window position:** With `decorations: true`, `@tauri-apps/plugin-window-state` works normally. Claude decides default window size and whether to persist window position.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase Requirements
- `.planning/ROADMAP.md` — Phase 1 goal, success criteria, and requirement IDs (FOUND-01 through FOUND-06)
- `.planning/REQUIREMENTS.md` — Full requirement text for FOUND-01, FOUND-02, FOUND-03, FOUND-04, FOUND-05, FOUND-06

### Research & Stack
- `.planning/research/SUMMARY.md` — Recommended stack versions, critical watch-outs, build order rationale

### Codebase Maps (prototype to migrate)
- `.planning/codebase/ARCHITECTURE.md` — Full component hierarchy, `window.*` export patterns, state flow
- `.planning/codebase/CONVENTIONS.md` — File naming, component naming, hook aliasing patterns, CSS architecture
- `.planning/codebase/STACK.md` — Prototype dependency inventory (what to replace vs. keep)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

- `assets/colors_and_type.css` — design tokens (all `--sc-*` custom properties). Moves to Vite unchanged; import once in `main.jsx`.
- `src/icons.jsx` — SVG icon registry and `Icon` component. Convert to ES module first after `i18n.jsx`; referenced by every screen.
- `src/i18n.jsx` — bilingual string table and `useT` factory. **Convert this first** — everything depends on it.
- `src/data.jsx` — mock data and helper functions (`formatRON`, `elapsedMinutes`, `orderTimeLabel`). Helpers become named exports; mock data is replaced by API in later phases.
- `lib/macos-window.jsx` — custom macOS chrome. **Do not migrate** — native OS chrome chosen (D-01). Archive to `_prototype/lib/`.

### Established Patterns

- **Functional components only** — no class components in the prototype; continue this in production.
- **Kebab-case filenames, PascalCase component names** — `screen-orders.jsx` exports `OrdersScreen`.
- **Inline styles for dynamic/conditional values, class names for static structural rules** — preserve this split; don't switch to Tailwind.
- **`--sc-*` CSS custom properties** — all color/spacing values use design tokens; accent override mutates `--sc-primary`, `--sc-primary-hover`, `--sc-primary-soft` on `document.documentElement`.
- **i18n via `useT(lang)` hook** — all user-visible strings keyed through this factory; `t('key')` pattern continues in production.

### Integration Points

- `main.jsx` — Vite entry point; imports `colors_and_type.css` and `styles.css`; mounts React root; wraps app in Zustand and TanStack Query providers.
- `src/app.jsx` — root component; owns Zustand store initialization; connects `@tauri-apps/plugin-store` for persistence; renders Shell + screen router.
- `tauri.conf.json` — CSP config; `connect-src` and `event-src` must include `https://api.restaurant.sitecare.ro` on day 1.

</code_context>

<specifics>
## Specific Ideas

- API domain confirmed by user: `https://api.restaurant.sitecare.ro` — no placeholder needed.
- Prototype archive: move to `_prototype/` at repo root before Tauri scaffold.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within Phase 1 scope.

</deferred>

---

*Phase: 01-foundation*
*Context gathered: 2026-04-22*
