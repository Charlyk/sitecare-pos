# SiteCare POS — Claude Code Guide

## Project

Tauri v2 desktop app (macOS + Windows) — a pixel-perfect port of the Claude Design POS prototype backed by the live SiteCare API via `@charlyk/admin-client`.

**Core value:** Restaurant staff can see, accept, and advance orders in real-time from a native desktop app that looks exactly like the design prototype.

**Stack:** Tauri 2.x · React 18 · Vite 6 · Zustand 5 · TanStack Query 5 · @charlyk/admin-client (GitHub Package Registry)

## Planning Documents

- `.planning/STATE.md` — current phase, position, open questions (read first every session)
- `.planning/ROADMAP.md` — 6-phase plan with goals and success criteria
- `.planning/REQUIREMENTS.md` — 41 v1 requirements with REQ-IDs and traceability
- `.planning/PROJECT.md` — full project context, decisions, constraints
- `.planning/research/SUMMARY.md` — recommended stack, pitfalls, build order
- `.planning/codebase/` — codebase map (architecture, conventions, concerns)

## GSD Workflow

This project uses the GSD planning system. Always follow phase plans.

**Available commands:**
- `/gsd-plan-phase N` — plan a phase before executing
- `/gsd-execute-phase N` — execute a planned phase
- `/gsd-discuss-phase N` — gather context before planning
- `/gsd-progress` — show current status
- `/gsd-verify-work` — verify phase goals are met

**Current phase:** Phase 1 — Foundation (not started)
**Next action:** `/gsd-plan-phase 1`

## Critical Rules

1. **@charlyk/admin-client is the ONLY data layer** — never make direct HTTP calls from the app; always go through the SDK
2. **CSP must be configured in `tauri.conf.json` on day 1** — `connect-src` must include the API domain; missing CSP silently blocks all fetches and SSE
3. **GitHub Package Registry auth** — `.npmrc` must have `@charlyk:registry=https://npm.pkg.github.com`; CI uses `NODE_AUTH_TOKEN: ${{ secrets.GITHUB_TOKEN }}`
4. **window.* globals are forbidden in production code** — prototype used them as a module system; all code uses ES module imports/exports
5. **EventSource cannot send auth headers** — if SSE endpoint requires Bearer token, use `@microsoft/fetch-event-source`; confirm in Phase 2 by inspecting SDK source
6. **macOS notarization required** — Apple Developer account needed before Phase 6; plan ahead

## Architecture Decisions

- **Rust side is thin** — window chrome (`decorations: false`), `@tauri-apps/plugin-store`, and thermal printing only; everything else lives in JavaScript
- **State split** — Zustand owns UI state (screen, role, lang, accent, density, toasts); TanStack Query owns all server state (orders, menu); never store server data in Zustand
- **SSE connection** — mounted once at Shell level via `useSSE` hook; stays alive across screen switches; updates TanStack Query cache directly
- **Screens call their own data hooks** — no prop-drilling from App; each screen calls `useOrders()`, `useMenu()`, etc. directly

## Design Fidelity

The UI must match the prototype pixel-perfectly. Do not change colors, spacing, typography, or component layout without explicit instruction. The design system lives in `assets/colors_and_type.css` — import it once in `main.jsx`, all CSS custom properties work unchanged.

## Unready Features

Features not yet implemented must be **greyed-out** (visible, not hidden, not clickable). This is by design — staff see what's coming without confusion about missing nav items.
