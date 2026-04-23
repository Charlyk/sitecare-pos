import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { signIn as sdkSignIn, createAdminClient } from '@charlyk/admin-client';
import { useAppStore } from './store.js';

const BASE_URL = 'https://api.restaurant.sitecare.ro';
const REFRESH_LEAD_MS = 5 * 60 * 1000; // 5 minutes before expiry

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const setIsAuthenticated = useAppStore((s) => s.setIsAuthenticated);
  const setAuthUser = useAppStore((s) => s.setAuthUser);
  const pushToast = useAppStore((s) => s.pushToast);
  const setScreen = useAppStore((s) => s.setScreen);

  const [client, setClient] = useState(null);
  const [coldStartBusy, setColdStartBusy] = useState(true); // true only during initial keychain restore
  const [signingIn, setSigningIn] = useState(false);        // true only during signIn() call
  const [error, setError] = useState(null);
  const refreshTimerRef = useRef(null);

  // Schedules a proactive refresh timer per D-08.
  // expiresAt is an ISO-8601 string from session.expiresAt.
  function scheduleRefresh(expiresAt, adminClient) {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    const msUntilRefresh = new Date(expiresAt).getTime() - Date.now() - REFRESH_LEAD_MS;
    if (msUntilRefresh <= 0) {
      // Already near expiry — refresh immediately
      doRefresh(adminClient);
      return;
    }
    refreshTimerRef.current = setTimeout(() => doRefresh(adminClient), msUntilRefresh);
  }

  async function doRefresh(adminClient) {
    try {
      const { session } = await adminClient.auth.getSession();
      // Token refreshed — reschedule with new expiry
      scheduleRefresh(session.expiresAt, adminClient);
    } catch {
      // Refresh failed — expire session per D-07
      expireSession();
    }
  }

  function expireSession() {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    setClient(null);
    setIsAuthenticated(false);
    setAuthUser(null);
    pushToast({
      id: Date.now(),
      kind: 'alert',
      title: useAppStore.getState().lang === 'ro'
        ? 'Sesiunea a expirat — te rugăm să te autentifici din nou'
        : 'Session expired — please log in again',
      detail: '',
    });
    // Navigate to login after 2s per D-07
    setTimeout(() => setScreen('login'), 2000);
  }

  // Cold start: try to restore session from OS keychain (AUTH-04)
  useEffect(() => {
    (async () => {
      try {
        const token = await invoke('get_token');
        if (!token) {
          setBusy(false);
          return;
        }
        const adminClient = createAdminClient({ baseUrl: BASE_URL, sessionToken: token });
        const { session, user } = await adminClient.auth.getSession();
        setClient(adminClient);
        setIsAuthenticated(true);
        setAuthUser(user);
        scheduleRefresh(session.expiresAt, adminClient);
      } catch (e) {
        // Stored token is stale — clear it
        console.error('[auth] cold-start restore failed:', e);
        try { await invoke('delete_token'); } catch { /* ignore */ }
        setIsAuthenticated(false);
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
      console.log('[auth] signIn response keys:', Object.keys(signInResult));
      const token = signInResult.token ?? signInResult.accessToken ?? signInResult.access_token;
      const user = signInResult.user ?? signInResult.profile ?? null;
      if (!token) throw new Error('No token in signIn response: ' + JSON.stringify(Object.keys(signInResult)));
      if (remember) {
        await invoke('store_token', { token }); // AUTH-02
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

  // signOut: clears keychain token and resets state
  async function signOut() {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    try { await invoke('delete_token'); } catch { /* ignore */ }
    setClient(null);
    setIsAuthenticated(false);
    setAuthUser(null);
    setScreen('login');
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
