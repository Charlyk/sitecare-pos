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
  const [busy, setBusy] = useState(true);   // true on cold start while checking keychain
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
      } catch {
        // Stored token is stale — clear it
        try { await invoke('delete_token'); } catch { /* ignore */ }
        setIsAuthenticated(false);
      } finally {
        setBusy(false);
      }
    })();

    return () => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // signIn: called by LoginScreen's onSubmit prop (AUTH-01)
  async function signIn(email, pass, remember) {
    setError(null);
    setBusy(true);
    try {
      const { token, user } = await sdkSignIn(BASE_URL, { email, password: pass });
      if (remember) {
        await invoke('store_token', { token }); // AUTH-02
      }
      const adminClient = createAdminClient({ baseUrl: BASE_URL, sessionToken: token });
      const { session } = await adminClient.auth.getSession();
      setClient(adminClient);
      setIsAuthenticated(true);
      setAuthUser(user);
      scheduleRefresh(session.expiresAt, adminClient); // AUTH-03
      setScreen('orders'); // D-09: always navigate to orders after login
    } catch (err) {
      const msg = err?.message || '';
      if (msg.includes('401') || msg.toLowerCase().includes('invalid') || msg.toLowerCase().includes('credential')) {
        setError('creds');
      } else {
        setError('creds'); // surface any auth failure as credential error
      }
      throw err; // re-throw so LoginScreen can react if needed
    } finally {
      setBusy(false);
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
    <AuthContext.Provider value={{ signIn, signOut, client, busy, error, setError }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
