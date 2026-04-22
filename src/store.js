// src/store.js
// Zustand UI state store with @tauri-apps/plugin-store persistence.
// Replaces the prototype's React.useState + localStorage in app.jsx.
// Architecture decision: Zustand owns UI state; TanStack Query owns server state.

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { load } from '@tauri-apps/plugin-store';

// Lazy plugin-store handle — initialized once on first access.
// autoSave: true writes to disk on every set() call with 100ms debounce.
let _store = null;
async function getPluginStore() {
  if (!_store) {
    _store = await load('preferences.json', { autoSave: true });
  }
  return _store;
}

// Custom StateStorage adapter bridging Zustand persist <-> plugin-store.
// Zustand persist calls getItem/setItem/removeItem asynchronously.
const tauriStorage = {
  getItem: async (name) => {
    const store = await getPluginStore();
    const val = await store.get(name);
    return val ?? null;
  },
  setItem: async (name, value) => {
    const store = await getPluginStore();
    await store.set(name, value);
  },
  removeItem: async (name) => {
    const store = await getPluginStore();
    await store.delete(name);
  },
};

// Single flat store. 9 state keys + 10 action functions.
// Persisted keys (6): written to preferences.json via plugin-store.
// Session-only keys (3): reset to defaults on every cold start.
export const useAppStore = create(
  persist(
    (set) => ({
      // --- Persisted UI state (mirrors prototype sc_* localStorage keys) ---
      screen: 'orders',        // Valid: 'orders'|'kitchen'|'pos'|'detail'|'menu'|'printer'|'settings'
      role: 'cashier',         // Valid: 'cashier'|'kitchen'
      lang: 'ro',              // Valid: 'ro'|'en'
      accent: 'sage',          // Valid: 'sage'|'indigo'|'terracotta'|'charcoal'
      density: 'balanced',     // Valid: 'balanced'|'dense'
      sidebarCollapsed: false,

      // --- Session-only state (NOT persisted — reset on restart) ---
      selectedOrder: null,     // Set by openOrder(); consumed by screen-detail
      toasts: [],              // Managed by pushToast/dismissToast
      acceptDialog: null,      // Set by setAcceptDialog(); consumed by AcceptDialog in app.jsx

      // --- Actions ---
      // setScreen resets selectedOrder so detail screen can't show stale data
      setScreen: (screen) => set({ screen, selectedOrder: null }),
      setRole: (role) => set({ role }),
      setLang: (lang) => set({ lang }),
      setAccent: (accent) => set({ accent }),
      setDensity: (density) => set({ density }),
      setSidebarCollapsed: (v) => set({ sidebarCollapsed: v }),
      // openOrder navigates to detail screen and sets the order in one atomic update
      openOrder: (order) => set({ selectedOrder: order, screen: 'detail' }),
      pushToast: (toast) => set((s) => ({ toasts: [...s.toasts, toast] })),
      dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
      setAcceptDialog: (dialog) => set({ acceptDialog: dialog }),
    }),
    {
      name: 'sc-ui-prefs',                           // Key name in preferences.json
      storage: createJSONStorage(() => tauriStorage),
      // partialize: only persist these 6 keys. Session keys are excluded.
      partialize: (state) => ({
        screen: state.screen,
        role: state.role,
        lang: state.lang,
        accent: state.accent,
        density: state.density,
        sidebarCollapsed: state.sidebarCollapsed,
      }),
    }
  )
);
