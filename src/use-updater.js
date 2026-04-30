import { useEffect } from 'react';
import { check } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';

/**
 * Silent launch-only update check (D-05, D-06).
 *
 * - Runs once on mount (empty deps array — no periodic re-check per D-06).
 * - Guarded by window.__TAURI_INTERNALS__ so Vite dev server never calls plugin APIs.
 * - Downloads and installs silently, then relaunches — no user prompt per D-05.
 * - Must be called inside the isAuthenticated branch of app.jsx (Pitfall 7):
 *   relaunch() during auth init would disrupt the cold-start auth flow.
 *
 * Errors are swallowed (console.warn only) — restaurant staff must never see
 * update-related error messages.
 */
export function useUpdater() {
  useEffect(() => {
    // Guard: do not call Tauri plugin APIs outside the Tauri webview.
    // Vite dev server has no __TAURI_INTERNALS__ — calling check() would throw.
    if (!window.__TAURI_INTERNALS__) return;

    // D-06: launch-only check — empty deps array, runs once on mount.
    check()
      .then(async (update) => {
        if (!update) return;
        // D-05: silent install — no user prompt, no confirmation dialog.
        await update.downloadAndInstall();
        await relaunch();
      })
      .catch((err) => {
        // Silent failure — do not surface update errors to restaurant staff.
        console.warn('[updater] check failed:', err);
      });
  }, []); // empty deps — run once on mount (D-06)
}
