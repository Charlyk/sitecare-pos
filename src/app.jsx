import { useEffect, useRef, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { load } from '@tauri-apps/plugin-store';
import { Shell } from './shell.jsx';
import { OrdersScreen } from './screen-orders.jsx';
import { KitchenScreen } from './screen-kitchen.jsx';
import { PosScreen } from './screen-pos.jsx';
import { OrderDetailScreen } from './screen-detail.jsx';
import { HistoryScreen } from './screen-history.jsx';
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
import { useOrderDetail } from './use-order-detail.js';
import { useOrderActions } from './use-order-actions.js';
import { useBranchSwitch } from './use-branches.js';
import { useStats } from './use-stats.js';
import { useRestaurantSettings } from './use-restaurant-settings.js';
import { useDeliveryAreas } from './use-delivery-areas.js';
import { CancelDialog } from './cancel-dialog.jsx';
import { useUpdater } from './use-updater.js';

export const statusToSDK = {
  new: 'NEW',
  accepted: 'ACCEPTED',
  preparing: 'PREPARING',
  ready: 'READY',
  out: 'OUT_FOR_DELIVERY',   // NOT 'OUT'
  done: 'COMPLETED',         // NOT 'DONE'
  cancelled: 'CANCELLED',
};

function App() {
  const lang = useAppStore((s) => s.lang);
  const role = useAppStore((s) => s.role);
  const screen = useAppStore((s) => s.screen);
  const accent = useAppStore((s) => s.accent);
  const density = useAppStore((s) => s.density);
  const sidebarCollapsed = useAppStore((s) => s.sidebarCollapsed);
  const selectedOrderId = useAppStore((s) => s.selectedOrder?.id);
  const toasts = useAppStore((s) => s.toasts);
  const acceptDialog = useAppStore((s) => s.acceptDialog);
  const setScreen = useAppStore((s) => s.setScreen);
  const setRole = useAppStore((s) => s.setRole);
  const setLang = useAppStore((s) => s.setLang);
  const setAccent = useAppStore((s) => s.setAccent);
  const setDensity = useAppStore((s) => s.setDensity);
  const setSidebarCollapsed = useAppStore((s) => s.setSidebarCollapsed);
  const openOrder = useAppStore((s) => s.openOrder);
  const historyOrder = useAppStore((s) => s.historyOrder);
  const openHistoryOrder = useAppStore((s) => s.openHistoryOrder);
  const pushToast = useAppStore((s) => s.pushToast);
  const dismissToast = useAppStore((s) => s.dismissToast);
  const setAcceptDialog = useAppStore((s) => s.setAcceptDialog);
  const [cancelDialog, setCancelDialog] = useState(null);
  const isAuthenticated = useAppStore((s) => s.isAuthenticated);
  const { signIn, coldStartBusy, busy: authBusy, error: authError, token } = useAuth();
  const t = useT(lang);

  const { data: ordersData } = useOrders();
  const orders = ordersData?.orders ?? [];
  const { data: selectedOrder } = useOrderDetail(selectedOrderId);
  const {
    data: historyDetail,
    isPending: historyDetailPending,
    isError: historyDetailError,
    refetch: refetchHistoryDetail,
  } = useOrderDetail(historyOrder?.id);
  const { data: stats } = useStats();
  const { data: restaurantSettings } = useRestaurantSettings();
  const { data: deliveryAreas = [] } = useDeliveryAreas();
  const { updateStatus } = useOrderActions();
  const soundMuted = useAppStore((s) => s.soundMuted);

  // Branch switch orchestration (Phase 16, D-05/D-07/D-08/D-09/D-10/D-11) — the phase state
  // machine lives here (not in the hook) because it bridges the mutation with useSSE's
  // isConnected transition and the global overlay, both app.jsx-local concerns.
  const branchSwitch = useBranchSwitch();
  const [switchPhase, setSwitchPhase] = useState('idle'); // 'idle' | 'pending' | 'bridging' | 'done'
  const [pendingBranch, setPendingBranch] = useState(null); // branch being switched to, for overlay/toast copy
  const hasDroppedRef = useRef(false);
  const bridgeTimeoutRef = useRef(null);

  // Refs keep interval closure fresh without resetting the 15s clock on every orders update
  const ordersRef = useRef(orders);
  const soundMutedRef = useRef(soundMuted);
  const audioRef = useRef(null);
  useEffect(() => { ordersRef.current = orders; }, [orders]);
  useEffect(() => { soundMutedRef.current = soundMuted; }, [soundMuted]);
  useEffect(() => { audioRef.current = new Audio('/sounds/new-order.mp3'); }, []);

  const playNotification = () => {
    const audio = audioRef.current;
    if (!audio || soundMutedRef.current || !audio.paused) return;
    audio.play().catch(() => {});
  };

  useEffect(() => {
    const id = setInterval(() => {
      const hasNew = ordersRef.current.some(o => o.state === 'new');
      if (hasNew) playNotification();
    }, 5000);
    return () => clearInterval(id);
  }, []);

  const { isConnected } = useSSE(token, (order) => {
    if (order?.state === 'new') playNotification();
  });
  const isOffline = !isConnected;

  // BILD-04: silent update check on launch (D-05, D-06).
  // Must be called unconditionally before any early return to respect React hook ordering rules.
  // The effect itself guards against non-Tauri environments (window.__TAURI_INTERNALS__ check).
  useUpdater();

  const handleAdvance = (order, toStatus) => {
    if (toStatus === 'accepted') {
      setAcceptDialog({ order });
      return;
    }
    updateStatus.mutate({
      id: order.id,
      currentStatus: statusToSDK[order.state] ?? order.state.toUpperCase(),
      toStatus: statusToSDK[toStatus] ?? toStatus.toUpperCase(),
    });
  };

  const handlePrint = async (order, kind) => {
    try {
      const store = await load('preferences.json', { autoSave: false });
      const config = await store.get('printer');
      if (!config?.port) {
        pushToast({
          id: Date.now(),
          kind: 'error',
          title: t('printer_not_configured'),
          detail: t('printer_go_to_settings'),
        });
        return;
      }
      await invoke('print_receipt', {
        port: config.port,
        baud: config.baud ?? 9600,
        paperWidth: config.paperWidth ?? '80mm',
        order: {
          // Coerced: Rust deserializes this as a strict u32, and normalizeOrder's
          // UUID-fallback path (data.jsx: `dailyOrderNumber ?? dailyNumber ?? id`) can
          // leave a non-number here — a UUID string would fail the whole payload
          // (CR-01). Guard with the same `typeof === 'number'` check used everywhere
          // else (csvOrderNumber, orderNumberLabel); 0 keeps the order reprintable
          // instead of hard-failing with a generic print_failed toast.
          daily_order_number: typeof order.dailyOrderNumber === 'number' ? order.dailyOrderNumber : 0,
          placed_at: order.placedAt,
          order_type: order.type,
          source: order.source ?? null,
          // Coerced: Rust deserializes this as Option<String>, and a numeric
          // table would fail the whole payload.
          table: order.table != null ? String(order.table) : null,
          customer_name: order.customer?.name ?? null,
          delivery_address: order.address?.line1 ?? null,
          notes: order.notes ?? null,
          items: (order.items ?? []).map((it) => ({
            name: it.name,
            qty: it.qty,
            price: it.price,
            mods: it.mods ?? [],
          })),
          subtotal: order.subtotal,
          tax: order.tax ?? 0,
          delivery_fee: order.deliveryFee ?? 0,
          discount: order.discount ?? 0,
          total: order.total,
          payment: order.payment ?? null,
          restaurant_name: restaurantSettings?.restaurant_name ?? 'Restaurant',
          restaurant_address: restaurantSettings?.branch_address ?? null,
        },
        kind,
      });
      pushToast({ id: Date.now(), kind: 'success', title: t('toast_printed'), detail: '' });
    } catch (err) {
      pushToast({ id: Date.now(), kind: 'error', title: t('print_failed'), detail: String(err) });
    }
  };

  // fireSwitch — D-05/D-07/D-09: clears any stale bridge timeout first (Pitfall 4 — a rapid
  // re-switch must never let a prior timeout force a premature 'done'), then fires the
  // non-optimistic mutation. onSuccess enters 'bridging' and arms the bounded-timeout safety
  // valve (D-09); onError reverts immediately (D-11) — nothing else changes.
  const fireSwitch = (branch) => {
    clearTimeout(bridgeTimeoutRef.current);
    setPendingBranch(branch);
    setSwitchPhase('pending');
    branchSwitch.mutate(branch, {
      onSuccess: () => {
        hasDroppedRef.current = false;
        setSwitchPhase('bridging');
        bridgeTimeoutRef.current = setTimeout(() => {
          setSwitchPhase('done'); // D-09: release anyway — the switch already succeeded server-side
        }, 6000);
      },
      onError: () => {
        clearTimeout(bridgeTimeoutRef.current);
        setSwitchPhase('idle');
        setPendingBranch(null);
        pushToast({
          id: Date.now(),
          kind: 'error',
          title: t('branch_switch_error_title'),
          detail: t('branch_switch_error_detail'),
        });
      },
    });
  };

  // handleSelectBranch — Shell's onSelectBranch callback. This tracer fires the switch
  // immediately; the cart-non-empty confirm gate (D-13) is Plan 03's job.
  const handleSelectBranch = (branch) => {
    fireSwitch(branch);
  };

  // Bridging watcher (D-08): only active while switchPhase === 'bridging'. use-sse.js:38
  // unconditionally drops isConnected at the top of every effect run, so a branch switch always
  // produces a true→false→true transition once setCurrentBranch fires — no race.
  useEffect(() => {
    if (switchPhase !== 'bridging') return;
    if (!isConnected) {
      hasDroppedRef.current = true;
      return;
    }
    if (isConnected && hasDroppedRef.current) {
      clearTimeout(bridgeTimeoutRef.current);
      setSwitchPhase('done');
    }
  }, [isConnected, switchPhase]);

  // Release effect (D-10, Pitfall 3): fires the success toast exactly once on the 'done'
  // transition, after reconnect OR the bounded timeout — never at mutation-resolve. Gated
  // strictly on switchPhase !== 'done' and self-terminating (resets to 'idle' synchronously in
  // the same effect body) so it cannot re-fire on a subsequent render.
  useEffect(() => {
    if (switchPhase !== 'done') return;
    pushToast({
      id: Date.now(),
      kind: 'success',
      title: t('branch_switch_success_title'),
      detail: `${t('branch_switch_success_prefix')} ${pendingBranch?.name}`,
    });
    setSwitchPhase('idle');
    setPendingBranch(null);
  }, [switchPhase]); // eslint-disable-line react-hooks/exhaustive-deps -- intentionally one-shot on phase transition, mirrors the settledPeriod precedent (Phase 9)

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
  }, [role, screen, setScreen]);

  // Rehydrate backstop (UI-SPEC E7, RESEARCH Pitfall 6): store.js's partialize persists
  // `screen` but NOT `historyOrder` (session-only, same treatment as the detail route's
  // order value). A cold start that quit while on 'history-detail' rehydrates with
  // historyOrder: null, which would otherwise leave the router's && short-circuit
  // rendering a blank content area inside a working shell. Redirect back to the list.
  useEffect(() => {
    if (screen === 'history-detail' && !historyOrder) setScreen('history');
  }, [screen, historyOrder, setScreen]);

  const orderCount = {
    live:   orders.filter(o => !['done', 'cancelled'].includes(o.state)).length,
    new:    orders.filter(o => o.state === 'new').length,
    active: orders.filter(o => ['accepted', 'preparing'].includes(o.state)).length,
  };

  // Merge the on-demand getOrder(id) payload over the AdminOrder summary (D-03): hydrated
  // fields win, guarded with `?? {}` so a pending or errored query merges nothing rather than
  // spreading undefined. Safe only because both sides have already been through normalizeOrder.
  const mergedHistoryOrder = historyOrder ? { ...historyOrder, ...(historyDetail ?? {}) } : null;

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
             setSidebarCollapsed={setSidebarCollapsed} isOffline={isOffline}
             onSelectBranch={handleSelectBranch}>
        {/* Screen router: Phase 3 — orders from useOrders(), isOffline wired to all screens */}
        {screen === 'orders'  && <OrdersScreen  orders={orders} lang={lang} onOpen={openOrder} onAdvance={handleAdvance} onPrint={handlePrint} isOffline={isOffline} stats={stats} />}
        {screen === 'kitchen' && <KitchenScreen orders={orders} lang={lang} onAdvance={handleAdvance} isOffline={isOffline} />}
        {screen === 'pos'     && <PosScreen     lang={lang} isOffline={isOffline} />}
        {screen === 'detail'  && selectedOrder && <OrderDetailScreen order={selectedOrder} lang={lang} restaurantSettings={restaurantSettings} deliveryAreas={deliveryAreas} onBack={() => setScreen('orders')} onAdvance={handleAdvance} onPrint={handlePrint} onCancel={() => setCancelDialog({ order: selectedOrder })} isOffline={isOffline} />}
        {screen === 'history' && <HistoryScreen lang={lang} onOpenOrder={openHistoryOrder} isOffline={isOffline} />}
        {screen === 'history-detail' && historyOrder && (
          <OrderDetailScreen
            order={mergedHistoryOrder}
            lang={lang}
            restaurantSettings={restaurantSettings}
            deliveryAreas={deliveryAreas}
            readOnly
            detailLoading={historyDetailPending}
            detailError={historyDetailError}
            onRetryDetail={refetchHistoryDetail}
            onBack={() => setScreen('history')}
            onPrint={handlePrint}
            isOffline={isOffline}
          />
        )}
        {screen === 'menu'    && <MenuScreen    lang={lang} isOffline={isOffline} />}
        {screen === 'printer' && <PrinterScreen lang={lang} restaurantSettings={restaurantSettings} isOffline={isOffline} />}
        {screen === 'settings'&& <SettingsScreen lang={lang} isOffline={isOffline} />}
      </Shell>

      {/* SwitchingOverlay -- sibling of Shell (never a child) so it covers all of Shell's
          children, satisfying SCOPE-04 (D-07). Renders for the full pending+bridging window. */}
      {(switchPhase === 'pending' || switchPhase === 'bridging') && (
        <SwitchingOverlay lang={lang} branchName={pendingBranch?.name} reconnecting={switchPhase === 'bridging'} />
      )}

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
            updateStatus.mutate(
              { id: acceptDialog.order.id, currentStatus: 'NEW', toStatus: 'ACCEPTED', estimatedMinutes: prepMin },
              {
                onSuccess: () => {
                  setAcceptDialog(null);
                  pushToast({ id: Date.now(), kind: 'success', title: t('accept_success_title'), detail: `${t('promised')}: ${prepMin} ${t('min')}` });
                },
                onError: () => {
                  pushToast({ id: Date.now(), kind: 'error', title: t('accept_error_title'), detail: t('check_connection') });
                  // dialog stays open intentionally — do NOT call setAcceptDialog(null) here
                },
              }
            );
          }}
        />
      )}

      {/* CancelDialog -- shown when staff clicks Cancel on an order detail screen */}
      {cancelDialog && (
        <CancelDialog
          lang={lang}
          order={cancelDialog.order}
          onCancel={() => setCancelDialog(null)}
          onConfirm={(reason) => {
            updateStatus.mutate(
              {
                id: cancelDialog.order.id,
                currentStatus: statusToSDK[cancelDialog.order.state] ?? cancelDialog.order.state.toUpperCase(),
                toStatus: 'CANCELLED',
                reason,
              },
              {
                onSuccess: () => {
                  setCancelDialog(null);
                  setScreen('orders');
                  pushToast({ id: Date.now(), kind: 'success', title: t('cancel_success_title'), detail: t('cancel_success_detail') });
                },
                onError: () => {
                  pushToast({ id: Date.now(), kind: 'error', title: t('cancel_error_title'), detail: t('check_connection') });
                  // dialog stays open intentionally — do NOT call setCancelDialog(null) here
                },
              }
            );
          }}
        />
      )}
    </div>
  );
}

// SwitchingOverlay — the global blocking overlay (D-07/D-08/D-09/SCOPE-04). Renders as a sibling
// of Shell at zIndex above CancelDialog/AcceptDialog's 200 so it can never be obscured mid-switch.
// The overlay IS the loading state (UI-SPEC E4): spinner + heading while pending, plus a
// reconnecting sub-line once switchPhase reaches 'bridging'.
function SwitchingOverlay({ lang, branchName, reconnecting }) {
  const t = useT(lang);
  return (
    <div style={{ position: 'absolute', inset: 0, background: 'rgba(18, 24, 18, 0.45)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 250, animation: 'fadeIn 180ms ease-out' }}>
      <div style={{ maxWidth: 420, width: '90%', background: '#fff', borderRadius: 20, boxShadow: '0 30px 80px rgba(0,0,0,0.35)', padding: '32px 24px', textAlign: 'center', border: '1px solid hsl(120 10% 88%)' }}>
        <Icon name="refresh" size={28} className="spin" style={{ color: 'var(--sc-primary)', marginBottom: 16 }} />
        <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.25 }}>
          {t('branch_overlay_heading_prefix')} {branchName}…
        </div>
        {reconnecting && (
          <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--sc-muted-foreground)', marginTop: 8 }}>
            {t('branch_overlay_reconnecting')}
          </div>
        )}
      </div>
    </div>
  );
}

export function AcceptDialog({ lang, order, onCancel, onConfirm }) {
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
              <div style={{ fontWeight: 900, fontSize: 16, letterSpacing: '-0.02em' }}>#{order.dailyOrderNumber} {typ.label}{order.table ? ' ' + t('table') + ' ' + order.table : ''}</div>
              <div style={{ fontSize: 12, color: 'var(--sc-muted-foreground)' }}>{order.customer?.name} {order.items?.length ?? 0} {t('items')} {formatRON(order.total)}</div>
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
