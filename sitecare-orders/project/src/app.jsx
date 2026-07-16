/* global React, ReactDOM, window */
const { useState: useStateApp, useEffect: useEffectApp } = React;

function App() {
  const [lang, setLang] = useStateApp(localStorage.getItem('sc_lang') || 'ro');
  const [role, setRole] = useStateApp(localStorage.getItem('sc_role') || 'cashier');
  const [screen, setScreenRaw] = useStateApp(localStorage.getItem('sc_screen') || 'orders');
  const [accent, setAccent] = useStateApp(localStorage.getItem('sc_accent') || 'sage');
  const [density, setDensity] = useStateApp(localStorage.getItem('sc_density') || 'balanced');
  const [sidebarCollapsed, setSidebarCollapsed] = useStateApp(localStorage.getItem('sc_sidebar_collapsed') === '1');
  const [tweaksOn, setTweaksOn] = useStateApp(false);

  const [orders, setOrders] = useStateApp(window.ORDERS);
  const [selectedOrder, setSelectedOrder] = useStateApp(null);
  const [toasts, setToasts] = useStateApp([]);
  const [scale, setScale] = useStateApp(1);
  const [acceptDialog, setAcceptDialog] = useStateApp(null); // { order, pendingState }

  // Persist
  useEffectApp(() => localStorage.setItem('sc_lang', lang), [lang]);
  useEffectApp(() => localStorage.setItem('sc_role', role), [role]);
  useEffectApp(() => localStorage.setItem('sc_screen', screen), [screen]);
  useEffectApp(() => localStorage.setItem('sc_accent', accent), [accent]);
  useEffectApp(() => localStorage.setItem('sc_density', density), [density]);
  useEffectApp(() => localStorage.setItem('sc_sidebar_collapsed', sidebarCollapsed ? '1' : '0'), [sidebarCollapsed]);

  useEffectApp(() => {
    if (role === 'kitchen' && !['kitchen', 'orders'].includes(screen)) setScreenRaw('kitchen');
  }, [role]);

  const setScreen = (s) => {
    setScreenRaw(s);
    if (s !== 'detail') setSelectedOrder(null);
  };

  useEffectApp(() => {
    const fit = () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const padX = 32, padY = 32;
      const s = Math.min((vw - padX) / 1440, (vh - padY) / 900, 1);
      setScale(s);
    };
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, []);

  useEffectApp(() => {
    const id = setTimeout(() => {
      pushToast('new', window.useT(lang)('toast_new_order'), '#1048');
    }, 6000);
    return () => clearTimeout(id);
  }, [lang]);

  useEffectApp(() => {
    const map = {
      sage: { primary: 'hsl(120 14% 49%)', hover: 'hsl(120 14% 42%)', soft: 'hsl(120 14% 49% / 0.1)' },
      indigo: { primary: 'hsl(230 50% 55%)', hover: 'hsl(230 50% 48%)', soft: 'hsl(230 50% 55% / 0.1)' },
      terracotta: { primary: 'hsl(0 53% 52%)', hover: 'hsl(0 53% 45%)', soft: 'hsl(0 53% 52% / 0.1)' },
      charcoal: { primary: 'hsl(120 8% 25%)', hover: 'hsl(120 8% 18%)', soft: 'hsl(120 8% 25% / 0.1)' },
    };
    const c = map[accent] || map.sage;
    document.documentElement.style.setProperty('--sc-primary', c.primary);
    document.documentElement.style.setProperty('--sc-primary-hover', c.hover);
    document.documentElement.style.setProperty('--sc-primary-soft', c.soft);
  }, [accent]);

  useEffectApp(() => {
    const handler = (e) => {
      const d = e.data;
      if (!d || !d.type) return;
      if (d.type === '__activate_edit_mode') setTweaksOn(true);
      if (d.type === '__deactivate_edit_mode') setTweaksOn(false);
    };
    window.addEventListener('message', handler);
    try { window.parent.postMessage({ type: '__edit_mode_available' }, '*'); } catch (e) {}
    return () => window.removeEventListener('message', handler);
  }, []);

  const pushToast = (kind, title, detail) => {
    const id = Math.random().toString(36).slice(2);
    setToasts(ts => [...ts, { id, kind, title, detail }]);
    setTimeout(() => setToasts(ts => ts.filter(t => t.id !== id)), 3500);
  };

  const openOrder = (o) => { setSelectedOrder(o); setScreenRaw('detail'); };

  // When advancing from "new" to "accepted", open the prep-time dialog
  const advance = (o, next) => {
    if (o.state === 'new' && next === 'accepted') {
      setAcceptDialog({ order: o });
      return;
    }
    applyAdvance(o, next);
  };

  const applyAdvance = (o, next, patch = {}) => {
    setOrders(os => os.map(x => x.id === o.id ? { ...x, state: next, ...patch } : x));
    if (selectedOrder && selectedOrder.id === o.id) setSelectedOrder({ ...o, state: next, ...patch });
  };

  const confirmAccept = (prepMin) => {
    const o = acceptDialog.order;
    applyAdvance(o, 'accepted', { promisedIn: prepMin, acceptedAt: new Date().toISOString() });
    pushToast('new', (lang === 'ro' ? 'Comandă acceptată' : 'Order accepted'), `${o.id} · ${prepMin} min`);
    setAcceptDialog(null);
  };

  const doPrint = (o, kind) => {
    pushToast('print', window.useT(lang)('toast_printed'), `${o.id} · ${kind || 'customer'}`);
  };

  const createOrder = (draft) => {
    const id = '#' + (1048 + orders.filter(o => o.num >= 1048).length);
    const num = 1048 + orders.filter(o => o.num >= 1048).length;
    const o = {
      id, num,
      source: 'counter', type: draft.type,
      state: 'new',
      placedAt: new Date().toISOString(),
      promisedIn: 25,
      customer: draft.type === 'dinein' ? { name: `Masa ${draft.table}` } : { name: draft.customer.name || '—', phone: draft.customer.phone },
      address: draft.type === 'delivery' ? { line1: draft.customer.address, city: 'Brașov' } : undefined,
      table: draft.type === 'dinein' ? Number(draft.table) : undefined,
      items: draft.cart,
      payment: draft.payment, paid: draft.payment === 'online',
      subtotal: draft.subtotal, tax: draft.tax, deliveryFee: draft.fee, tip: 0, total: draft.total,
      notes: draft.note || '',
    };
    setOrders(os => [o, ...os]);
    pushToast('new', window.useT(lang)('toast_printed'), id);
    setScreenRaw('orders');
  };

  const t = window.useT(lang);
  const orderCount = {
    live: orders.filter(o => o.state !== 'done').length,
    new: orders.filter(o => o.state === 'new').length,
    active: orders.filter(o => o.state === 'preparing' || o.state === 'accepted' || o.state === 'new').length,
  };

  return (
    <div className="desktop-stage">
      <div className="desktop-frame" style={{ transform: `scale(${scale})` }}>
        <window.Shell
          lang={lang} setLang={setLang}
          role={role} setRole={setRole}
          screen={screen} setScreen={setScreen}
          accent={accent} density={density}
          orderCount={orderCount}
          sidebarCollapsed={sidebarCollapsed} setSidebarCollapsed={setSidebarCollapsed}
        >
          {screen === 'orders' && <window.OrdersScreen orders={orders} lang={lang} onOpen={openOrder} onAdvance={advance} onPrint={doPrint} />}
          {screen === 'kitchen' && <window.KitchenScreen orders={orders} lang={lang} onAdvance={advance} />}
          {screen === 'pos' && <window.PosScreen lang={lang} onCreate={createOrder} />}
          {screen === 'detail' && selectedOrder && <window.OrderDetailScreen order={orders.find(o => o.id === selectedOrder.id) || selectedOrder} lang={lang} onBack={() => setScreen('orders')} onAdvance={advance} onPrint={doPrint} />}
          {screen === 'menu' && <window.MenuScreen lang={lang} />}
          {screen === 'history' && <window.HistoryScreen lang={lang} onReprint={(o) => pushToast('print', o.export ? (lang === 'ro' ? 'Export pornit' : 'Export started') : t('toast_printed'), o.id)} />}
          {screen === 'printer' && <window.PrinterScreen lang={lang} onTestPrint={() => pushToast('print', t('toast_printed'), 'Test print')} />}
          {screen === 'settings' && <window.SettingsScreen lang={lang} />}
        </window.Shell>

        <div className="toast-stack">
          {toasts.map(ts => (
            <div key={ts.id} className="toast">
              <div className="toast-icon"><window.Icon name={ts.kind === 'print' ? 'printer' : 'bell'} size={14} /></div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 13 }}>{ts.title}</div>
                <div style={{ fontSize: 11, color: 'var(--sc-muted-foreground)' }}>{ts.detail}</div>
              </div>
            </div>
          ))}
        </div>

        {acceptDialog && <AcceptDialog lang={lang} order={acceptDialog.order} onCancel={() => setAcceptDialog(null)} onConfirm={confirmAccept} />}
      </div>

      {tweaksOn && <TweaksPanel {...{ lang, setLang, role, setRole, accent, setAccent, density, setDensity }} />}
    </div>
  );
}

function AcceptDialog({ lang, order, onCancel, onConfirm }) {
  const t = window.useT(lang);
  const Icon = window.Icon;
  const suggested = order.promisedIn || 25;
  const presets = order.type === 'delivery'
    ? [20, 30, 45, 60, 75]
    : order.type === 'pickup'
    ? [10, 15, 20, 30, 45]
    : [10, 15, 20, 25, 30];
  const [picked, setPicked] = React.useState(presets.includes(suggested) ? suggested : presets[1]);
  const [custom, setCustom] = React.useState('');
  const [useCustom, setUseCustom] = React.useState(false);

  const prep = useCustom && Number(custom) > 0 ? Number(custom) : picked;
  const promised = new Date(Date.now() + prep * 60 * 1000);
  const typ = window.typeMeta(order.type, t);

  return (
    <div style={{ position: 'absolute', inset: 0, background: 'rgba(18, 24, 18, 0.45)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, animation: 'fadeIn 180ms ease-out' }}>
      <div style={{ width: 460, background: '#fff', borderRadius: 20, boxShadow: '0 30px 80px rgba(0,0,0,0.35)', overflow: 'hidden', border: '1px solid hsl(120 10% 88%)' }}>
        <div style={{ padding: '20px 24px 8px', borderBottom: '1px solid hsl(120 10% 92%)' }}>
          <div className="eyebrow" style={{ marginBottom: 2 }}>{lang === 'ro' ? 'pregătire' : 'prep time'}</div>
          <div style={{ fontWeight: 900, fontSize: 22, letterSpacing: '-0.02em' }}>{t('prep_time_title')}</div>
          <div style={{ color: 'var(--sc-muted-foreground)', fontSize: 13, marginTop: 4 }}>{t('prep_time_sub')}</div>
        </div>

        <div style={{ padding: '16px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 12, background: '#fbf6ea', borderRadius: 12, marginBottom: 16 }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: '#fff', border: '1px solid hsl(120 10% 88%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--sc-primary)' }}>
              <Icon name={typ.icon} size={16} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 900, fontSize: 16, letterSpacing: '-0.02em' }}>{order.id} · {typ.label}{order.table ? ` · ${t('table')} ${order.table}` : ''}</div>
              <div style={{ fontSize: 12, color: 'var(--sc-muted-foreground)' }}>{order.customer.name} · {order.items.length} {t('items')} · {window.formatRON(order.total)}</div>
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
            <input type="number" value={custom} onChange={e => { setCustom(e.target.value); setUseCustom(true); }} placeholder="—" min="1" max="240"
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

function TweaksPanel({ lang, setLang, role, setRole, accent, setAccent, density, setDensity }) {
  const save = (edits) => {
    try { window.parent.postMessage({ type: '__edit_mode_set_keys', edits }, '*'); } catch (e) {}
  };
  const seg = (val, options, onChange, key) => (
    <div className="tw-seg">
      {options.map(o => (
        <button key={o.value} className={val === o.value ? 'on' : ''} onClick={() => { onChange(o.value); save({ [key]: o.value }); }}>{o.label}</button>
      ))}
    </div>
  );
  return (
    <div className="tweaks-panel">
      <h4>Tweaks <span style={{ fontFamily: 'Caveat', color: 'var(--sc-terracotta)', fontSize: 16 }}>live</span></h4>
      <div className="tw-row">
        <div className="tw-label">Role</div>
        {seg(role, [{ value: 'cashier', label: 'Cashier' }, { value: 'kitchen', label: 'Kitchen' }], setRole, 'role')}
      </div>
      <div className="tw-row">
        <div className="tw-label">Language</div>
        {seg(lang, [{ value: 'ro', label: 'Română' }, { value: 'en', label: 'English' }], setLang, 'lang')}
      </div>
      <div className="tw-row">
        <div className="tw-label">Accent</div>
        {seg(accent, [
          { value: 'sage', label: 'Sage' },
          { value: 'terracotta', label: 'Terra' },
          { value: 'indigo', label: 'Indigo' },
          { value: 'charcoal', label: 'Charcoal' },
        ], setAccent, 'accent')}
      </div>
      <div className="tw-row">
        <div className="tw-label">Density</div>
        {seg(density, [{ value: 'balanced', label: 'Balanced' }, { value: 'dense', label: 'Dense' }], setDensity, 'density')}
      </div>
    </div>
  );
}

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "lang": "ro",
  "role": "cashier",
  "accent": "sage",
  "density": "balanced"
}/*EDITMODE-END*/;

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
