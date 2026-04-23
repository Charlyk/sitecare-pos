import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { load } from '@tauri-apps/plugin-store';
import { signIn as sdkSignIn, createAdminClient } from '@charlyk/admin-client';
import { useAppStore } from './store.js';

// In dev, requests go through Vite proxy (empty base = relative URL → proxy intercepts /v1/*)
// In production Tauri build, requests go directly to the API
const BASE_URL = import.meta.env.DEV ? '' : 'https://api.restaurant.sitecare.ro';
const REFRESH_LEAD_MS = 5 * 60 * 1000; // 5 minutes before expiry
const MIN_RETRY_MS = 30_000; // minimum floor to prevent tight refresh loops
const TOKEN_KEY = 'auth_token'; // top-level key in preferences.json, separate from Zustand's 'sc-ui-prefs'

// Token persistence via plugin-store (preferences.json).
// OS keychain (keyring crate) silently discards writes in unsigned macOS dev builds — plugin-store
// is the proven persistence mechanism already used for Zustand UI state.
let _store = null;
async function getStore() {
  if (!_store) _store = await load('preferences.json', { autoSave: true });
  return _store;
}
async function persistToken(token) {
  const s = await getStore();
  await s.set(TOKEN_KEY, token);
}
async function readToken() {
  const s = await getStore();
  return (await s.get(TOKEN_KEY)) ?? null;
}
async function clearToken() {
  const s = await getStore();
  await s.delete(TOKEN_KEY);
}

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const setIsAuthenticated = useAppStore((s) => s.setIsAuthenticated);
  const setAuthUser = useAppStore((s) => s.setAuthUser);
  const pushToast = useAppStore((s) => s.pushToast);
  const setScreen = useAppStore((s) => s.setScreen);

  const [client, setClient] = useState(null);
  const [coldStartBusy, setColdStartBusy] = useState(true); // true only during initial token restore
  const [signingIn, setSigningIn] = useState(false);        // true only during signIn() call
  const [error, setError] = useState(null);
  const refreshTimerRef = useRef(null);
  const tokenRef = useRef(null); // tracks current session token so doRefresh can detect rotation

  // Schedules a proactive refresh timer per D-08.
  // expiresAt is an ISO-8601 string from session.expiresAt.
  function scheduleRefresh(expiresAt, adminClient) {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    const msUntilRefresh = new Date(expiresAt).getTime() - Date.now() - REFRESH_LEAD_MS;
    if (msUntilRefresh <= 0) {
      // Already near expiry — use setTimeout floor to prevent tight async loops (CR-01)
      refreshTimerRef.current = setTimeout(() => doRefresh(adminClient), MIN_RETRY_MS);
      return;
    }
    refreshTimerRef.current = setTimeout(() => doRefresh(adminClient), msUntilRefresh);
  }

  async function doRefresh(adminClient) {
    try {
      const { session } = await adminClient.auth.getSession();
      // If the API rotated the token, update store and rebuild the client (AUTH-04)
      if (session?.token && session.token !== tokenRef.current) {
        tokenRef.current = session.token;
        try { await persistToken(session.token); } catch { /* non-fatal */ }
        const newClient = createAdminClient({ baseUrl: BASE_URL, sessionToken: session.token });
        setClient(newClient);
        scheduleRefresh(session.expiresAt, newClient);
        return;
      }
      scheduleRefresh(session.expiresAt, adminClient);
    } catch {
      expireSession();
    }
  }

  function expireSession() {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    setClient(null);
    setIsAuthenticated(false);
    setAuthUser(null);
    setError(null); // WR-02: clear stale login error before showing login screen again
    pushToast({
      id: Date.now(),
      kind: 'alert',
      title: useAppStore.getState().lang === 'ro'
        ? 'Sesiunea a expirat — te rugăm să te autentifici din nou'
        : 'Session expired — please log in again',
      detail: '',
    });
    // WR-01: set screen to 'orders' (not 'login') — 'login' is not a valid router branch
    // and would be persisted by Zustand partialize, causing a blank shell on cold start.
    // The auth guard in app.jsx renders LoginScreen whenever isAuthenticated=false.
    setTimeout(() => setScreen('orders'), 2000);
  }

  // Cold start: restore session from plugin-store (preferences.json).
  // Trust the stored token — getSession() is not called here. The token is assumed valid
  // until an API call returns 401 (Phase 3 hooks handle that naturally).
  useEffect(() => {
    (async () => {
      try {
        const token = await readToken();
        console.log('[auth:cold] readToken →', token ? `present (${String(token).length} chars)` : 'null — will show login');
        if (!token) return;
        tokenRef.current = token;
        const adminClient = createAdminClient({ baseUrl: BASE_URL, sessionToken: token });
        setClient(adminClient);
        setIsAuthenticated(true);
        console.log('[auth:cold] auth restored ✓');
      } catch (e) {
        console.error('[auth:cold] token read failed:', e?.message ?? e);
      } finally {
        setColdStartBusy(false);
      }
    })();

    return () => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // signIn: called by LoginScreen's onSubmit prop (AUTH-01)
  async function signIn(email, pass, remember) {
    setError(null);
    setSigningIn(true);
    try {
      const signInResult = await sdkSignIn(BASE_URL, { email, password: pass });
      const token = signInResult.token ?? signInResult.accessToken ?? signInResult.access_token;
      const user = signInResult.user ?? signInResult.profile ?? null;
      if (!token) throw new Error('No token in signIn response: ' + JSON.stringify(Object.keys(signInResult)));
      if (remember) {
        await persistToken(token); // AUTH-02
        tokenRef.current = token;
      }
      const adminClient = createAdminClient({ baseUrl: BASE_URL, sessionToken: token });
      setClient(adminClient);
      setIsAuthenticated(true);
      setAuthUser(user);
      // Try to get session for refresh timer — non-fatal if it fails
      try {
        const { session } = await adminClient.auth.getSession();
        if (session?.expiresAt) scheduleRefresh(session.expiresAt, adminClient);
      } catch (sessionErr) {
        console.warn('[auth] getSession after signIn failed (non-fatal):', sessionErr);
      }
      setScreen('orders'); // D-09: always navigate to orders after login
    } catch (err) {
      console.error('[auth] signIn error:', err);
      const status = err?.status;
      if (status === 401 || status === 403) {
        setError('creds');
      } else if (status === 422 || err?.message?.toLowerCase().includes('email')) {
        setError('email');
      } else {
        setError('creds');
      }
    } finally {
      setSigningIn(false);
    }
  }

  // signOut: clears stored token and resets state
  async function signOut() {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    try { await clearToken(); } catch { /* ignore */ }
    tokenRef.current = null;
    setClient(null);
    setIsAuthenticated(false);
    setAuthUser(null);
    setError(null); // WR-02: clear stale login error before showing login screen again
    setScreen('orders'); // WR-01: 'login' is not a valid router branch; auth guard handles LoginScreen render
  }

  return (
    <AuthContext.Provider value={{ signIn, signOut, client, coldStartBusy, busy: signingIn, error, setError }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
