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
      screen: 'orders',        // Valid: 'orders'|'kitchen'|'pos'|'detail'|'menu'|'printer'|'settings'|'history'|'history-detail'
      role: 'cashier',         // Valid: 'cashier'|'kitchen'
      lang: 'ro',              // Valid: 'ro'|'en'
      accent: 'sage',          // Valid: 'sage'|'indigo'|'terracotta'|'charcoal'
      density: 'balanced',     // Valid: 'balanced'|'dense'
      sidebarCollapsed: false,

      // --- Session-only state (NOT persisted — reset on restart) ---
      selectedOrder: null,     // Set by openOrder(); consumed by screen-detail
      historyOrder: null,      // Set by openHistoryOrder(); consumed by screen-detail in readOnly mode; session-only (NOT persisted — mirrors selectedOrder)
      // historySelection (D-01, Phase 12 Plan 03): session-only History UI selection state
      // (period/status/type/search) lifted out of screen-history.jsx's local useState calls.
      // Mirrors the selectedOrder/historyOrder session-only pattern exactly — set via an action,
      // conditionally reset by setScreen (D-03 below), excluded from partialize. NOT persisted.
      historySelection: { period: { id: '30' }, statusFilter: 'all', typeFilter: 'all', query: '' },
      toasts: [],              // Managed by pushToast/dismissToast
      acceptDialog: null,      // Set by setAcceptDialog(); consumed by AcceptDialog in app.jsx
      soundMuted: false,       // KDS mute toggle (D-07) — session-only, NOT in partialize
      updateReady: false,      // Set by useUpdater after silent download; triggers sidebar banner

      // --- Auth state (session-only, NOT persisted — set by AuthProvider on cold start) ---
      isAuthenticated: false,
      authUser: null,
      currentBranch: null,     // SelectedBranch | null (from getMe()); session-only; NEVER in partialize (D-10)
      // branchSwitcherForceOpen (Phase 16, deferred from Phase 13): session-only reopen-on-403
      // seam consumed by Phase 17's recovery flow. This phase adds the field + setter with ZERO
      // call sites setting it true (D-12) — wired minimally, not consumed yet.
      branchSwitcherForceOpen: false,
      // noBranchAccess (Phase 17, plan 03 — BERR-01): session-only flag mirroring
      // branchSwitcherForceOpen. Set true by handleBranchError on a NO_BRANCH_ACCESS 403; gates
      // the top-level NO_BRANCH_ACCESS block (consumed in 17-04). NEVER persisted — see partialize.
      noBranchAccess: false,

      // --- Actions ---
      // setScreen resets selectedOrder and historyOrder so no detail route can show stale data
      // (unconditional, unchanged). D-03: historySelection is ADDITIVELY preserved when the
      // target is 'history' or 'history-detail' (the History<->history-detail round-trip), and
      // reset to defaults for any other target — so leaving History for Orders/KDS/POS clears the
      // selection. Functional set() form reads current historySelection for the preserve branch.
      setScreen: (screen) =>
        set((s) => ({
          screen,
          selectedOrder: null,
          historyOrder: null,
          historySelection:
            screen === 'history' || screen === 'history-detail'
              ? s.historySelection
              : { period: { id: '30' }, statusFilter: 'all', typeFilter: 'all', query: '' },
        })),
      // setHistorySelection performs a shallow merge of only the changed key(s) — keeps the
      // period object reference stable on a status/type/query-only update (D-04, reference
      // stability for settledPeriodRef comparison + the range useMemo in screen-history.jsx).
      // Rule-1 fix: no-op when every patched key already strictly equals its current value (e.g.
      // re-clicking an already-selected filter pill) — returns {} so the historySelection
      // reference itself is untouched and selector-subscribed components (HistoryScreen) do not
      // re-render, matching the bail-out behavior the four local useState calls had before D-01's
      // lift into this store slice.
      setHistorySelection: (patch) =>
        set((s) => {
          const unchanged = Object.keys(patch).every((k) => s.historySelection[k] === patch[k]);
          if (unchanged) return {};
          return { historySelection: { ...s.historySelection, ...patch } };
        }),
      setRole: (role) => set({ role }),
      setLang: (lang) => set({ lang }),
      setAccent: (accent) => set({ accent }),
      setDensity: (density) => set({ density }),
      setSidebarCollapsed: (v) => set({ sidebarCollapsed: v }),
      // openOrder navigates to detail screen and sets the order in one atomic update
      openOrder: (order) => set({ selectedOrder: order, screen: 'detail' }),
      // openHistoryOrder navigates to the history detail route in one atomic update (D-07/D-08)
      openHistoryOrder: (order) => set({ historyOrder: order, screen: 'history-detail' }),
      pushToast: (toast) => set((s) => ({ toasts: [...s.toasts, toast] })),
      dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
      setAcceptDialog: (dialog) => set({ acceptDialog: dialog }),
      setSoundMuted: (v) => set({ soundMuted: v }),
      setUpdateReady: (v) => set({ updateReady: v }),
      setIsAuthenticated: (v) => set({ isAuthenticated: v }),
      setAuthUser: (user) => set({ authUser: user }),
      setCurrentBranch: (branch) => set({ currentBranch: branch }),
      setBranchSwitcherForceOpen: (v) => set({ branchSwitcherForceOpen: v }),
      setNoBranchAccess: (v) => set({ noBranchAccess: v }),
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
