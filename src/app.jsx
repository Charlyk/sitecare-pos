import { useEffect, useState } from 'react';
import { Shell } from './shell.jsx';
import { OrdersScreen } from './screen-orders.jsx';
import { KitchenScreen } from './screen-kitchen.jsx';
import { PosScreen } from './screen-pos.jsx';
import { OrderDetailScreen } from './screen-detail.jsx';
import { MenuScreen } from './screen-menu.jsx';
import { PrinterScreen } from './screen-printer.jsx';
import { SettingsScreen } from './screen-settings.jsx';
import { useAppStore } from './store.js';
import { Icon } from './icons.jsx';
import { useT } from './i18n.jsx';
import { formatRON } from './data.jsx';
import { typeMeta } from './screen-orders.jsx';
import { AuthProvider, useAuth } from './auth.jsx';
import { LoginScreen } from './screen-login.jsx';
import { openUrl } from '@tauri-apps/plugin-opener';
import { useSSE } from './use-sse.js';
import { useOrders } from './use-orders.js';
import { useOrderActions } from './use-order-actions.js';

function App() {
  const lang = useAppStore((s) => s.lang);
  const role = useAppStore((s) => s.role);
  const screen = useAppStore((s) => s.screen);
  const accent = useAppStore((s) => s.accent);
  const density = useAppStore((s) => s.density);
  const sidebarCollapsed = useAppStore((s) => s.sidebarCollapsed);
  const selectedOrder = useAppStore((s) => s.selectedOrder);
  const toasts = useAppStore((s) => s.toasts);
  const acceptDialog = useAppStore((s) => s.acceptDialog);
  const setScreen = useAppStore((s) => s.setScreen);
  const setRole = useAppStore((s) => s.setRole);
  const setLang = useAppStore((s) => s.setLang);
  const setAccent = useAppStore((s) => s.setAccent);
  const setDensity = useAppStore((s) => s.setDensity);
  const setSidebarCollapsed = useAppStore((s) => s.setSidebarCollapsed);
  const openOrder = useAppStore((s) => s.openOrder);
  const pushToast = useAppStore((s) => s.pushToast);
  const dismissToast = useAppStore((s) => s.dismissToast);
  const setAcceptDialog = useAppStore((s) => s.setAcceptDialog);
  const isAuthenticated = useAppStore((s) => s.isAuthenticated);
  const { signIn, coldStartBusy, busy: authBusy, error: authError, token } = useAuth();

  const { isConnected } = useSSE(token);
  const isOffline = !isConnected;
  const { data: ordersData } = useOrders();
  const orders = ordersData?.orders ?? [];
  const { updateStatus } = useOrderActions();

  const handleAdvance = (order, toStatus) => {
    updateStatus.mutate({ id: order.id, currentStatus: order.state.toUpperCase(), toStatus: toStatus.toUpperCase() });
  };

  // Accent CSS custom property mutation (verbatim from prototype, Zustand-driven):
  useEffect(() => {
    const map = {
      sage:       { primary: 'hsl(120 14% 49%)', hover: 'hsl(120 14% 42%)', soft: 'hsl(120 14% 49% / 0.1)' },
      indigo:     { primary: 'hsl(230 50% 55%)', hover: 'hsl(230 50% 48%)', soft: 'hsl(230 50% 55% / 0.1)' },
      terracotta: { primary: 'hsl(0 53% 52%)',   hover: 'hsl(0 53% 45%)',   soft: 'hsl(0 53% 52% / 0.1)'  },
      charcoal:   { primary: 'hsl(120 8% 25%)',  hover: 'hsl(120 8% 18%)',  soft: 'hsl(120 8% 25% / 0.1)' },
    };
    const c = map[accent] || map.sage;
    document.documentElement.style.setProperty('--sc-primary', c.primary);
    document.documentElement.style.setProperty('--sc-primary-hover', c.hover);
    document.documentElement.style.setProperty('--sc-primary-soft', c.soft);
  }, [accent]);

  // Role gate (verbatim from prototype):
  useEffect(() => {
    if (role === 'kitchen' && !['kitchen', 'orders'].includes(screen)) setScreen('kitchen');
  }, [role]);

  const orderCount = {
    live:   orders.filter(o => !['done', 'cancelled'].includes(o.state)).length,
    new:    orders.filter(o => o.state === 'new').length,
    active: orders.filter(o => ['accepted', 'preparing'].includes(o.state)).length,
  };

  // Auth guard (AUTH-05): render LoginScreen for unauthenticated users
  if (coldStartBusy) {
    // Cold-start: keychain check in progress — render blank while awaiting result
    return <div style={{ width: '100vw', height: '100vh', background: '#fff' }} />;
  }

  if (!isAuthenticated) {
    return (
      <LoginScreen
        lang={lang}
        onLangChange={setLang}
        onSubmit={async (email, pass, remember) => {
          try {
            await signIn(email, pass, remember);
          } catch {
            // signIn sets authError in context; LoginScreen reads it via error prop
          }
        }}
        onForgotPassword={() => openUrl('https://restaurant.sitecare.ro/reset-password')}
        busy={authBusy}
        error={authError}
      />
    );
  }

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden' }}>
      <Shell lang={lang} setLang={setLang} role={role} setRole={setRole}
             screen={screen} setScreen={setScreen} accent={accent} density={density}
             orderCount={orderCount} sidebarCollapsed={sidebarCollapsed}
             setSidebarCollapsed={setSidebarCollapsed} isOffline={isOffline}>
        {/* Screen router: Phase 3 — orders from useOrders(), isOffline wired to all screens */}
        {screen === 'orders'  && <OrdersScreen  orders={orders} lang={lang} onOpen={openOrder} onAdvance={handleAdvance} onPrint={() => {}} isOffline={isOffline} />}
        {screen === 'kitchen' && <KitchenScreen orders={orders} lang={lang} onAdvance={handleAdvance} isOffline={isOffline} />}
        {screen === 'pos'     && <PosScreen     lang={lang} onCreate={() => {}} isOffline={isOffline} />}
        {screen === 'detail'  && selectedOrder && <OrderDetailScreen order={selectedOrder} lang={lang} onBack={() => setScreen('orders')} onAdvance={handleAdvance} onPrint={() => {}} isOffline={isOffline} />}
        {screen === 'menu'    && <MenuScreen    lang={lang} isOffline={isOffline} />}
        {screen === 'printer' && <PrinterScreen lang={lang} onTestPrint={() => pushToast({ id: Date.now(), kind: 'info', title: 'Test print sent', detail: '' })} isOffline={isOffline} />}
        {screen === 'settings'&& <SettingsScreen lang={lang} isOffline={isOffline} />}
      </Shell>

      {/* Toast stack -- render toasts from store */}
      {toasts.length > 0 && (
        <div className="toast-stack">
          {toasts.map((toast) => (
            <div key={toast.id} className="toast" onClick={() => dismissToast(toast.id)}>
              <div className="toast-icon">{toast.kind === 'success' ? <Icon name="check" size={16} /> : <Icon name="zap" size={16} />}</div>
              <div><strong>{toast.title}</strong>{toast.detail && <div style={{ fontSize: 13 }}>{toast.detail}</div>}</div>
            </div>
          ))}
        </div>
      )}

      {/* AcceptDialog -- shown when advancing an order from 'new' to 'accepted' state */}
      {acceptDialog && (
        <AcceptDialog
          lang={lang}
          order={acceptDialog.order}
          onCancel={() => setAcceptDialog(null)}
          onConfirm={(prepMin) => {
            pushToast({ id: Date.now(), kind: 'success', title: lang === 'ro' ? 'Comanda acceptata' : 'Order accepted', detail: acceptDialog.order.id + ' ' + prepMin + ' min' });
            setAcceptDialog(null);
          }}
        />
      )}
    </div>
  );
}

function AcceptDialog({ lang, order, onCancel, onConfirm }) {
  const t = useT(lang);
  const suggested = order.promisedIn || 25;
  const presets = order.type === 'delivery'
    ? [20, 30, 45, 60, 75]
    : order.type === 'pickup'
    ? [10, 15, 20, 30, 45]
    : [10, 15, 20, 25, 30];
  const [picked, setPicked] = useState(presets.includes(suggested) ? suggested : presets[1]);
  const [custom, setCustom] = useState('');
  const [useCustom, setUseCustom] = useState(false);

  const prep = useCustom && Number(custom) > 0 ? Number(custom) : picked;
  const promised = new Date(Date.now() + prep * 60 * 1000);
  const typ = typeMeta(order.type, t);

  return (
    <div style={{ position: 'absolute', inset: 0, background: 'rgba(18, 24, 18, 0.45)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, animation: 'fadeIn 180ms ease-out' }}>
      <div style={{ width: 460, background: '#fff', borderRadius: 20, boxShadow: '0 30px 80px rgba(0,0,0,0.35)', overflow: 'hidden', border: '1px solid hsl(120 10% 88%)' }}>
        <div style={{ padding: '20px 24px 8px', borderBottom: '1px solid hsl(120 10% 92%)' }}>
          <div className="eyebrow" style={{ marginBottom: 2 }}>{lang === 'ro' ? 'pregatire' : 'prep time'}</div>
          <div style={{ fontWeight: 900, fontSize: 22, letterSpacing: '-0.02em' }}>{t('prep_time_title')}</div>
          <div style={{ color: 'var(--sc-muted-foreground)', fontSize: 13, marginTop: 4 }}>{t('prep_time_sub')}</div>
        </div>

        <div style={{ padding: '16px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 12, background: '#fbf6ea', borderRadius: 12, marginBottom: 16 }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: '#fff', border: '1px solid hsl(120 10% 88%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--sc-primary)' }}>
              <Icon name={typ.icon} size={16} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 900, fontSize: 16, letterSpacing: '-0.02em' }}>{order.id} {typ.label}{order.table ? ' ' + t('table') + ' ' + order.table : ''}</div>
              <div style={{ fontSize: 12, color: 'var(--sc-muted-foreground)' }}>{order.customer.name} {order.items.length} {t('items')} {formatRON(order.total)}</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8, marginBottom: 10 }}>
            {presets.map(p => (
              <button key={p} onClick={() => { setPicked(p); setUseCustom(false); }}
                style={{ padding: '14px 6px', borderRadius: 12, border: !useCustom && picked === p ? '1.5px solid var(--sc-primary)' : '1px solid hsl(120 10% 88%)', background: !useCustom && picked === p ? 'hsl(120 14% 49% / 0.1)' : '#fff', color: !useCustom && picked === p ? 'var(--sc-primary)' : '#333', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'center' }}>
                <span style={{ fontWeight: 900, fontSize: 20, letterSpacing: '-0.02em' }}>{p}</span>
                <span style={{ fontSize: 11, fontWeight: 600, opacity: 0.75 }}>{t('min')}</span>
              </button>
            ))}
          </div>

          <button onClick={() => setUseCustom(true)}
            style={{ width: '100%', padding: '10px 14px', borderRadius: 12, border: useCustom ? '1.5px solid var(--sc-primary)' : '1px solid hsl(120 10% 88%)', background: useCustom ? 'hsl(120 14% 49% / 0.08)' : '#fff', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 10 }}>
            <Icon name="clock" size={14} style={{ color: useCustom ? 'var(--sc-primary)' : '#777' }} />
            <span style={{ fontWeight: 600, fontSize: 13, color: useCustom ? 'var(--sc-primary)' : '#555' }}>{t('prep_time_custom')}</span>
            <input type="number" value={custom} onChange={e => { setCustom(e.target.value); setUseCustom(true); }} placeholder="--" min="1" max="240"
              style={{ marginLeft: 'auto', width: 64, padding: '6px 8px', border: '1px solid hsl(120 10% 88%)', borderRadius: 8, fontFamily: 'inherit', fontSize: 13, textAlign: 'right', fontWeight: 700 }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--sc-muted-foreground)' }}>{t('min')}</span>
          </button>

          <div style={{ marginTop: 16, padding: 12, background: 'hsl(120 14% 49% / 0.08)', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
            <Icon name="clock" size={16} style={{ color: 'var(--sc-primary)' }} />
            <div style={{ flex: 1, fontSize: 13 }}>
              <span style={{ color: 'var(--sc-muted-foreground)' }}>{lang === 'ro' ? 'Promis pentru' : 'Promised by'}</span>
              <span style={{ fontWeight: 900, marginLeft: 6, letterSpacing: '-0.01em' }}>
                {promised.toLocaleTimeString(lang === 'ro' ? 'ro-RO' : 'en-GB', { hour: '2-digit', minute: '2-digit' })}
              </span>
              <span style={{ color: 'var(--sc-muted-foreground)', marginLeft: 6 }}>· {prep} {t('min')} {lang === 'ro' ? 'din acum' : 'from now'}</span>
            </div>
          </div>
        </div>

        <div style={{ padding: '14px 24px', borderTop: '1px solid hsl(120 10% 92%)', display: 'flex', gap: 10, background: '#fafaf6' }}>
          <button className="btn-secondary" onClick={onCancel} style={{ flex: '0 0 auto' }}>{t('cancel')}</button>
          <button className="btn-primary" onClick={() => onConfirm(prep)} disabled={!prep || prep <= 0} style={{ flex: 1, justifyContent: 'center', height: 42 }}>
            <Icon name="check" size={14} /> {t('confirm_accept')} · {prep} {t('min')}
          </button>
        </div>
      </div>
    </div>
  );
}

function AppWithAuth() {
  return (
    <AuthProvider>
      <App />
    </AuthProvider>
  );
}

export default AppWithAuth;
