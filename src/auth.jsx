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
  const setCurrentBranch = useAppStore((s) => s.setCurrentBranch);
  const pushToast = useAppStore((s) => s.pushToast);
  const setScreen = useAppStore((s) => s.setScreen);

  const [client, setClient] = useState(null);
  const [token, setToken] = useState(null);
  const [coldStartBusy, setColdStartBusy] = useState(true); // true only during initial token restore
  const [signingIn, setSigningIn] = useState(false);        // true only during signIn() call
  const [error, setError] = useState(null);
  const refreshTimerRef = useRef(null);
  const tokenRef = useRef(null); // tracks current session token so doRefresh can detect rotation
  const rememberRef = useRef(false); // CR-02: tracks the "remember me" choice for the life of the session

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
        setToken(session.token);
        if (rememberRef.current) {
          try { await persistToken(session.token); } catch { /* non-fatal */ }
        }
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

  // WR-01: shared helper for the getMe()-seeding pattern that was previously duplicated across
  // cold-start, the D-04 focus-retry backstop, and signIn (the root cause of CR-01 — three
  // independently-maintained copies of "reset-then-reseed" made it easy for one to be missed).
  // `me?.selectedBranch ?? null` also covers IN-01 (defensive null-check on `me` itself).
  async function seedFromMe(adminClient, { onUnauthorized } = {}) {
    try {
      const me = await adminClient.auth.getMe();
      setAuthUser(me);
      setCurrentBranch(me?.selectedBranch ?? null);
      return me;
    } catch (meErr) {
      if (meErr?.status === 401) onUnauthorized?.();
      return null;
    }
  }

  function expireSession() {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    setClient(null);
    setToken(null);
    setIsAuthenticated(false);
    setAuthUser(null);
    setCurrentBranch(null); // CR-01: prevent stale branch leaking into the next session
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
        setToken(token);
        const adminClient = createAdminClient({ baseUrl: BASE_URL, sessionToken: token });
        setClient(adminClient);
        setIsAuthenticated(true);
        console.log('[auth:cold] auth restored ✓');
        // D-05/D-07/BSTATE-01: seed authUser + currentBranch from the server session on cold
        // start (the pre-existing gap this plan closes — authUser was only ever set in signIn()).
        // getMe() has a throwing contract (resolves CurrentUser or throws w/ .status), NOT the
        // {data,error} fields style used elsewhere. Awaited inside this outer try so it completes
        // before the finally releases coldStartBusy (Pitfall 2 — no extra blank/spinner state).
        // D-03: only a true 401 ends the session; non-401 (network/5xx) failures leave
        // currentBranch null — the D-04 window-focus listener below is the backstop that retries.
        await seedFromMe(adminClient, { onUnauthorized: () => expireSession() });
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

  // D-04: window 'focus' retry backstop. Re-seeds authUser/currentBranch via getMe() whenever
  // the window regains focus AND isAuthenticated is true AND currentBranch is still null AND a
  // client exists — the backstop for a non-401 getMe() failure at either seam above. Removes
  // itself on unmount / client change.
  useEffect(() => {
    function handleFocus() {
      const { isAuthenticated, currentBranch } = useAppStore.getState();
      if (!isAuthenticated || currentBranch || !client) return;
      // WR-02: mirror the 401 handling used by the other two getMe() seams — a genuinely
      // expired session must not be swallowed silently forever by this backstop.
      seedFromMe(client, { onUnauthorized: () => expireSession() });
    }
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [client]);

  // signIn: called by LoginScreen's onSubmit prop (AUTH-01)
  async function signIn(email, pass, remember) {
    setError(null);
    setSigningIn(true);
    try {
      const signInResult = await sdkSignIn(BASE_URL, { email, password: pass });
      const token = signInResult.token ?? signInResult.accessToken ?? signInResult.access_token;
      const user = signInResult.user ?? signInResult.profile ?? null;
      if (!token) throw new Error('No token in signIn response: ' + JSON.stringify(Object.keys(signInResult)));
      setToken(token);
      tokenRef.current = token; // CR-02: always track current token for rotation detection, regardless of remember
      rememberRef.current = remember; // CR-02: remember the opt-out choice for the life of the session
      if (remember) {
        await persistToken(token); // AUTH-02
      }
      const adminClient = createAdminClient({ baseUrl: BASE_URL, sessionToken: token });
      setClient(adminClient);
      setIsAuthenticated(true);
      setAuthUser(user); // optimistic fill from the signIn response; getMe() below is the source of truth
      setCurrentBranch(null); // CR-01: clear any previous session's branch before getMe() re-seeds it
      // D-07/BSTATE-01: getMe() seeds authUser + currentBranch as the source of truth, replacing
      // the optimistic setAuthUser(user) above. Non-fatal — a failure here is not fatal to sign-in
      // (currentBranch stays null; the D-04 focus-retry listener is the backstop).
      await seedFromMe(adminClient); // non-fatal; currentBranch stays null on failure (D-04 backstop retries)
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
    setToken(null);
    setClient(null);
    setIsAuthenticated(false);
    setAuthUser(null);
    setCurrentBranch(null); // CR-01: prevent stale branch leaking into the next session
    setError(null); // WR-02: clear stale login error before showing login screen again
    setScreen('orders'); // WR-01: 'login' is not a valid router branch; auth guard handles LoginScreen render
  }

  return (
    <AuthContext.Provider value={{ signIn, signOut, client, token, coldStartBusy, busy: signingIn, error, setError }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
