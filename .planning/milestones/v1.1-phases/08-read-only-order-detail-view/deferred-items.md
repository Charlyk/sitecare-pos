# Deferred Items — Phase 8

Pre-existing failures encountered during `08-01` execution, out of scope for this plan (SCOPE
BOUNDARY: only auto-fix issues directly caused by the current task's changes).

## From 08-01 (`npx vitest run` full-suite check)

- **`src/__tests__/build-pipeline.test.js:101`** — `expect(conf?.bundle?.createUpdaterArtifacts).toBe(true)`
  fails. Unrelated to `src/i18n.jsx` string additions; a `tauri.conf.json` bundle-config assertion.
- **`src/__tests__/offline-buttons.test.jsx`** — `Error: No QueryClient set, use QueryClientProvider
  to set one`, thrown from `screen-orders.jsx:164` (`useQueryClient()` with no `QueryClientProvider`
  wrapping the test render). Unrelated to `src/i18n.jsx` string additions.

Both were present before this plan's changes (i18n.jsx-only edits cannot cause either failure). Not
fixed here; flagged for a future plan or a dedicated test-infra fix.
