import { useEffect } from 'react';
import { check } from '@tauri-apps/plugin-updater';
import { useAppStore } from './store.js';

/**
 * Silent background update check (D-05, D-06).
 *
 * - Runs once on mount (empty deps array).
 * - Guarded by window.__TAURI_INTERNALS__ so Vite dev server never calls plugin APIs.
 * - Downloads silently, then sets updateReady=true in the store.
 * - Shell renders a "Restart to update" banner in the sidebar when updateReady is true.
 * - Errors are swallowed (console.warn only) — restaurant staff must never see
 *   update-related error messages.
 */
export function useUpdater() {
  const setUpdateReady = useAppStore((s) => s.setUpdateReady);

  useEffect(() => {
    if (!window.__TAURI_INTERNALS__) return;

    check()
      .then(async (update) => {
        if (!update) return;
        await update.downloadAndInstall();
        setUpdateReady(true);
      })
      .catch((err) => {
        console.warn('[updater] check failed:', err);
      });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
}
