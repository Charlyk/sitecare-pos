/* global React, window */
// Mobile app screens for SiteCare POS mobile companion.
// No printer management; settings limited to notifications + language.

const { useState: useS, useMemo: useM } = React;

// ─── Design tokens (mirror login + desktop) ───────────────────
// Surface colors use CSS variables so a dark/light theme switch can flip them
// at runtime (see <body data-m-theme> in mobile-app.html). Accent hues
// (primary/terra/amber) are unchanged across themes.
const M_COLORS = {
  bg: 'var(--m-bg)',
  card: 'var(--m-card)',
  fg: 'var(--m-fg)',
  muted: 'var(--m-muted)',
  border: 'var(--m-border)',
  primary: 'hsl(120 14% 49%)',
  primarySoft: 'hsl(120 14% 49% / 0.12)',
  terra: 'hsl(0 53% 58%)',
  terraSoft: 'hsl(0 53% 58% / 0.14)',
  amber: 'hsl(38 92% 50%)',
  amberSoft: 'hsl(38 92% 50% / 0.16)',
  slate: 'hsl(215 25% 27%)',
  red: 'hsl(0 72% 48%)',
};

const mFont = { fontFamily: '"Outfit", -apple-system, system-ui, sans-serif' };
const caveat = { fontFamily: '"Caveat", cursive' };

// ─── Shared chunks ───────────────────────────────────────────

function StatusBar() {
  return (
    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 54, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 30px 0', zIndex: 10, pointerEvents: 'none' }}>
      <span style={{ fontSize: 15, fontWeight: 600, color: '#000', ...mFont }}>9:41</span>
      <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
        <svg width="17" height="11" viewBox="0 0 17 11"><path d="M1 8h2V11H1zM5 6h2v5H5zM9 3h2v8H9zM13 0h2v11h-2z" fill="#000"/></svg>
        <svg width="15" height="11" viewBox="0 0 15 11"><path d="M7.5 2A9 9 0 0 0 1 4.5L0 3.4A11 11 0 0 1 15 3.4l-1 1.1A9 9 0 0 0 7.5 2Zm0 3a6 6 0 0 0-4.4 1.8L2 5.7A8 8 0 0 1 13 5.7l-1.1 1.1A6 6 0 0 0 7.5 5Zm0 3a3 3 0 0 0-2 .8l1.4 1.5L7.5 9.6l.6.7L9.5 9A3 3 0 0 0 7.5 8Z" fill="#000"/></svg>
        <div style={{ width: 24, height: 11, border: '1px solid rgba(0,0,0,0.35)', borderRadius: 3, position: 'relative' }}>
          <div style={{ position: 'absolute', inset: 1.5, right: 6, background: '#000', borderRadius: 1 }} />
          <div style={{ position: 'absolute', right: -2.5, top: 3.5, width: 1.5, height: 4, background: 'rgba(0,0,0,0.35)', borderRadius: 1 }} />
        </div>
      </div>
    </div>
  );
}

function HomeIndicator({ dark }) {
  return (
    <div style={{ position: 'absolute', bottom: 8, left: 0, right: 0, display: 'flex', justifyContent: 'center', pointerEvents: 'none' }}>
      <div style={{ width: 134, height: 5, borderRadius: 100, background: 'var(--m-home-indicator)' }} />
    </div>
  );
}

function DynamicIsland() {
  return <div style={{ position: 'absolute', top: 11, left: '50%', transform: 'translateX(-50%)', width: 122, height: 36, borderRadius: 20, background: '#000', zIndex: 50 }} />;
}

function Phone({ children, bg = M_COLORS.bg, dark = false, width = 390, height = 844 }) {
  return (
    <div style={{ width, height, borderRadius: 54, background: '#0a0a0a', padding: 11, boxShadow: '0 30px 70px rgba(0,0,0,0.22), 0 0 0 1px rgba(0,0,0,0.3)', boxSizing: 'border-box' }}>
      <div style={{ width: '100%', height: '100%', borderRadius: 44, background: bg, position: 'relative', overflow: 'hidden', ...mFont }}>
        <DynamicIsland />
        <StatusBar />
        {children}
        <HomeIndicator dark={dark} />
      </div>
    </div>
  );
}

// Bottom tab bar — 4 tabs (no printer)
function TabBar({ active = 'orders' }) {
  const tabs = [
    { id: 'orders', label: 'Comenzi', icon: receiptIcon, badge: 3 },
    { id: 'kitchen', label: 'Bucătărie', icon: potIcon },
    { id: 'new', label: 'Nouă', icon: null, center: true },
    { id: 'menu', label: 'Meniu', icon: bookIcon },
    { id: 'settings', label: 'Setări', icon: gearIcon },
  ];
  return (
    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 92, paddingBottom: 28, background: 'var(--m-tabbar)', backdropFilter: 'blur(20px)', borderTop: `1px solid ${M_COLORS.border}`, display: 'flex', alignItems: 'flex-start', paddingTop: 10, zIndex: 30 }}>
      {tabs.map(t => {
        if (t.center) {
          return (
            <div key={t.id} style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
              <div style={{ width: 52, height: 52, borderRadius: '50%', background: M_COLORS.primary, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 20px hsl(120 14% 49% / 0.45)', marginTop: -14 }}>
                <svg width="22" height="22" viewBox="0 0 24 24" stroke="#fff" strokeWidth="2.5" fill="none" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
              </div>
            </div>
          );
        }
        const isActive = active === t.id;
        const color = isActive ? M_COLORS.primary : M_COLORS.muted;
        return (
          <div key={t.id} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, color, position: 'relative' }}>
            <div style={{ position: 'relative' }}>
              {t.icon(color)}
              {t.badge && <div style={{ position: 'absolute', top: -4, right: -8, background: M_COLORS.terra, color: '#fff', fontSize: 10, fontWeight: 800, borderRadius: 999, minWidth: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px', border: '1.5px solid #fff' }}>{t.badge}</div>}
            </div>
            <span style={{ fontSize: 10, fontWeight: 600 }}>{t.label}</span>
          </div>
        );
      })}
    </div>
  );
}

// Icons
const receiptIcon = (c) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4v17l3-2 3 2 3-2 3 2 3-2V4l-3 2-3-2-3 2-3-2-3 2Z"/><path d="M8 10h8M8 14h5"/></svg>;
const potIcon = (c) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 11h18M5 11v6a3 3 0 0 0 3 3h8a3 3 0 0 0 3-3v-6M9 7c0-2 1-3 3-3s3 1 3 3"/></svg>;
const bookIcon = (c) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 5a2 2 0 0 1 2-2h12v16H6a2 2 0 0 0-2 2V5ZM4 19a2 2 0 0 1 2-2h12v2"/></svg>;
const gearIcon = (c) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z"/></svg>;

// Brand header — compact
function BrandBar({ title, sub, right, onBack }) {
  return (
    <div style={{ padding: '66px 20px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
      {onBack && (
        <button style={{ width: 36, height: 36, border: `1px solid ${M_COLORS.border}`, background: M_COLORS.card, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={M_COLORS.fg} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
        </button>
      )}
      <div style={{ flex: 1 }}>
        {sub && <div style={{ ...caveat, color: M_COLORS.terra, fontSize: 17, fontWeight: 700, lineHeight: 1 }}>{sub}</div>}
        <div style={{ fontSize: 24, fontWeight: 900, letterSpacing: '-0.02em', marginTop: sub ? 2 : 0 }}>{title}</div>
      </div>
      {right}
    </div>
  );
}

// ─── SCREEN 1: Orders list ───────────────────────────────────

function OrdersScreen() {
  const filters = [
    { id: 'all', label: 'Toate', count: 8, active: true },
    { id: 'new', label: 'Noi', count: 2 },
    { id: 'prep', label: 'Pregătire', count: 2 },
    { id: 'ready', label: 'Gata', count: 2 },
  ];
  return (
    <Phone>
      <BrandBar
        title="Comenzi live"
        sub="astăzi"
        right={
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ width: 36, height: 36, borderRadius: 12, background: M_COLORS.card, border: `1px solid ${M_COLORS.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={M_COLORS.fg} strokeWidth="2" strokeLinecap="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
              <div style={{ position: 'absolute', top: 6, right: 6, width: 8, height: 8, borderRadius: '50%', background: M_COLORS.terra, border: '1.5px solid #fff' }} />
            </div>
          </div>
        }
      />

      {/* Filter chips */}
      <div style={{ display: 'flex', gap: 8, padding: '0 20px 14px', overflowX: 'auto' }}>
        {filters.map(f => (
          <div key={f.id} style={{ flexShrink: 0, padding: '8px 14px', borderRadius: 999, background: f.active ? M_COLORS.fg : M_COLORS.card, color: f.active ? '#fff' : M_COLORS.fg, border: f.active ? 'none' : `1px solid ${M_COLORS.border}`, display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700 }}>
            {f.label}
            <span style={{ background: f.active ? 'rgba(255,255,255,0.2)' : M_COLORS.primarySoft, color: f.active ? '#fff' : M_COLORS.primary, fontSize: 11, fontWeight: 800, padding: '1px 7px', borderRadius: 999 }}>{f.count}</span>
          </div>
        ))}
      </div>

      <div style={{ padding: '0 16px 120px', display: 'flex', flexDirection: 'column', gap: 10, overflowY: 'auto', height: 'calc(100% - 215px)' }}>
        <OrderCard id="#1047" state="new" type="Livrare" source="Site" mins={1} cust="Ioana Radu" items="Quattro Formaggi, Carbonara +1" total="121,28" paid />
        <OrderCard id="#1046" state="preparing" type="Ridicare" source="Telefon" mins={8} cust="Mihai Popescu" items="Diavola ×2, Vin roșu" total="96,00" />
        <OrderCard id="#1045" state="preparing" type="La masă 7" source="Tejghea" mins={12} cust="Masa 7" items="2 burgeri, Cezar, +2" total="138,00" />
        <OrderCard id="#1044" state="ready" type="Livrare" source="Site" mins={28} cust="Andreea Toma" items="Margherita, Prosciutto, Tiramisu ×2" total="137,87" paid />
      </div>

      <TabBar active="orders" />
    </Phone>
  );
}

function stateBadge(s) {
  const map = {
    new: { label: 'Nouă', bg: M_COLORS.terraSoft, fg: M_COLORS.terra, pulse: true },
    preparing: { label: 'Pregătire', bg: M_COLORS.amberSoft, fg: 'hsl(30 80% 38%)' },
    ready: { label: 'Gata', bg: M_COLORS.primarySoft, fg: M_COLORS.primary },
  };
  return map[s];
}

function OrderCard({ id, state, type, source, mins, cust, items, total, paid }) {
  const s = stateBadge(state);
  return (
    <div style={{ background: M_COLORS.card, borderRadius: 18, border: `1px solid ${M_COLORS.border}`, padding: '14px 16px', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span style={{ padding: '3px 9px', borderRadius: 999, background: s.bg, color: s.fg, fontSize: 11, fontWeight: 800, display: 'inline-flex', gap: 5, alignItems: 'center' }}>
          {s.pulse && <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor' }} />}
          {s.label}
        </span>
        <span style={{ fontSize: 11, color: M_COLORS.muted, fontWeight: 600 }}>· {source} · {type}</span>
        <span style={{ marginLeft: 'auto', fontSize: 11, color: M_COLORS.muted, fontWeight: 700 }}>{mins}m</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 4 }}>
        <div style={{ fontWeight: 900, fontSize: 16, letterSpacing: '-0.01em' }}>{id} · {cust}</div>
        <div style={{ fontWeight: 900, fontSize: 15, fontVariantNumeric: 'tabular-nums' }}>{total} <span style={{ fontSize: 11, color: M_COLORS.muted }}>lei</span></div>
      </div>
      <div style={{ fontSize: 12, color: M_COLORS.muted, marginBottom: 10, lineHeight: 1.4 }}>{items}</div>
      <div style={{ display: 'flex', gap: 8 }}>
        {state === 'new' && (
          <>
            <button style={{ flex: 1, height: 36, border: 0, borderRadius: 10, background: M_COLORS.primary, color: '#fff', fontWeight: 700, fontSize: 13, ...mFont }}>Acceptă</button>
            <button style={{ width: 36, height: 36, border: `1px solid ${M_COLORS.border}`, background: M_COLORS.card, borderRadius: 10, color: M_COLORS.red }}>×</button>
          </>
        )}
        {state === 'preparing' && (
          <button style={{ flex: 1, height: 36, border: `1.5px solid ${M_COLORS.primary}`, borderRadius: 10, background: M_COLORS.card, color: M_COLORS.primary, fontWeight: 700, fontSize: 13, ...mFont }}>Marchează gata</button>
        )}
        {state === 'ready' && (
          <button style={{ flex: 1, height: 36, border: 0, borderRadius: 10, background: M_COLORS.fg, color: '#fff', fontWeight: 700, fontSize: 13, ...mFont }}>Finalizează {paid ? '· Plătit' : ''}</button>
        )}
      </div>
    </div>
  );
}

// ─── SCREEN 2: Order detail ──────────────────────────────────

function OrderDetailScreen() {
  return (
    <Phone>
      <BrandBar title="#1047" sub="Quattro · Carbonara ·Cola" onBack />

      <div style={{ padding: '0 16px 120px', overflowY: 'auto', height: 'calc(100% - 135px)' }}>
        {/* Status strip */}
        <div style={{ background: M_COLORS.card, borderRadius: 18, border: `1px solid ${M_COLORS.border}`, padding: 14, marginBottom: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <span style={{ padding: '4px 10px', borderRadius: 999, background: M_COLORS.terraSoft, color: M_COLORS.terra, fontSize: 12, fontWeight: 800, display: 'inline-flex', gap: 6, alignItems: 'center' }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor' }} /> Nouă · acum 1 min
            </span>
            <span style={{ fontSize: 12, color: M_COLORS.muted, fontWeight: 600 }}>Site · Livrare</span>
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            {['Primită', 'Acceptată', 'Pregătire', 'Gata', 'Livrată'].map((s, i) => (
              <React.Fragment key={s}>
                <div style={{ flex: 1, height: 4, borderRadius: 2, background: i === 0 ? M_COLORS.primary : M_COLORS.border }} />
              </React.Fragment>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 10, color: M_COLORS.muted, fontWeight: 600 }}>
            <span>Primită</span><span style={{ opacity: 0.5 }}>Livrată</span>
          </div>
        </div>

        {/* Customer card */}
        <div style={{ background: M_COLORS.card, borderRadius: 18, border: `1px solid ${M_COLORS.border}`, padding: 14, marginBottom: 10 }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 10 }}>
            <div style={{ width: 44, height: 44, borderRadius: '50%', background: M_COLORS.terra, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 15 }}>IR</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800, fontSize: 15 }}>Ioana Radu</div>
              <div style={{ fontSize: 12, color: M_COLORS.muted }}>+40 722 145 902</div>
            </div>
            <button style={{ width: 40, height: 40, borderRadius: 12, background: M_COLORS.primarySoft, border: 0, color: M_COLORS.primary, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92Z"/></svg>
            </button>
          </div>
          <div style={{ padding: 10, borderRadius: 12, background: M_COLORS.bg, fontSize: 12, color: M_COLORS.fg, lineHeight: 1.5 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: M_COLORS.muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>Adresă</div>
            Str. Lungă 24, ap. 3, Brașov<br/>
            <span style={{ color: M_COLORS.muted }}>Interfon 3B, etaj 2</span>
          </div>
        </div>

        {/* Items */}
        <div style={{ background: M_COLORS.card, borderRadius: 18, border: `1px solid ${M_COLORS.border}`, padding: 14, marginBottom: 10 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: M_COLORS.muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Articole (4)</div>
          {[
            { q: 1, n: 'Quattro Formaggi', p: '42,00', m: null },
            { q: 1, n: 'Carbonara', p: '34,00', m: 'fără bacon' },
            { q: 2, n: 'Coca-Cola', p: '20,00', m: null },
          ].map((it, i) => (
            <div key={i} style={{ display: 'flex', gap: 10, padding: '8px 0', borderTop: i ? `1px dashed ${M_COLORS.border}` : 'none' }}>
              <div style={{ width: 26, height: 26, borderRadius: 8, background: M_COLORS.primarySoft, color: M_COLORS.primary, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 12, flexShrink: 0 }}>{it.q}×</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{it.n}</div>
                {it.m && <div style={{ fontSize: 11, color: M_COLORS.terra, fontWeight: 600 }}>· {it.m}</div>}
              </div>
              <div style={{ fontWeight: 700, fontSize: 13, fontVariantNumeric: 'tabular-nums' }}>{it.p}</div>
            </div>
          ))}
          <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${M_COLORS.border}`, display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: M_COLORS.muted }}><span>Subtotal</span><span>96,00</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: M_COLORS.muted }}><span>Livrare</span><span>10,00</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: M_COLORS.muted }}><span>TVA</span><span>15,28</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontWeight: 900, fontSize: 15, color: M_COLORS.fg }}><span>Total</span><span>121,28 lei</span></div>
          </div>
          <div style={{ marginTop: 10, padding: 8, background: M_COLORS.primarySoft, borderRadius: 10, fontSize: 11, color: M_COLORS.primary, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10"/></svg>
            Plătit online · card ••3402
          </div>
        </div>

        {/* Note */}
        <div style={{ background: M_COLORS.card, borderRadius: 18, border: `1px dashed ${M_COLORS.terra}`, padding: 14, marginBottom: 14 }}>
          <div style={{ ...caveat, color: M_COLORS.terra, fontWeight: 700, fontSize: 17, lineHeight: 1, marginBottom: 4 }}>notă de la client</div>
          <div style={{ fontSize: 13, lineHeight: 1.5, color: M_COLORS.fg }}>Fără ceapă pe carbonara. Mulțumesc!</div>
        </div>
      </div>

      {/* Bottom action bar */}
      <div style={{ position: 'absolute', bottom: 92, left: 0, right: 0, padding: '12px 16px', background: 'var(--m-tabbar)', backdropFilter: 'blur(16px)', borderTop: `1px solid ${M_COLORS.border}`, display: 'flex', gap: 8, zIndex: 20 }}>
        <button style={{ width: 52, height: 50, borderRadius: 14, border: `1px solid ${M_COLORS.border}`, background: M_COLORS.card, display: 'flex', alignItems: 'center', justifyContent: 'center', color: M_COLORS.fg }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 9V2H6v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v8H6z"/></svg>
        </button>
        <button style={{ flex: 1, height: 50, borderRadius: 14, border: 0, background: M_COLORS.primary, color: '#fff', fontWeight: 800, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 4px 14px hsl(120 14% 49% / 0.35)', ...mFont }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
          Acceptă · 45 min
        </button>
      </div>
      <TabBar active="orders" />
    </Phone>
  );
}

// ─── SCREEN 2b: Order history (Istoric comenzi) ──────────────
// Owner-side reporting screen: past/closed orders grouped by day, with a
// period selector, a period summary readout, status filters, and a search.

function historyStatus(s) {
  const map = {
    done:     { label: 'Finalizată',  fg: M_COLORS.primary, bg: M_COLORS.primarySoft,
                icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg> },
    canceled: { label: 'Anulată',     fg: M_COLORS.red,     bg: M_COLORS.terraSoft,
                icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg> },
    refunded: { label: 'Rambursată',  fg: 'hsl(30 80% 38%)', bg: M_COLORS.amberSoft,
                icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7v6h6"/><path d="M3.5 13a9 9 0 1 0 2.3-9.3L3 6"/></svg> },
  };
  return map[s];
}

function HistoryRow({ o, first }) {
  const s = historyStatus(o.status);
  const dim = o.status !== 'done';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderTop: first ? 'none' : `1px solid ${M_COLORS.border}` }}>
      <div style={{ width: 38, height: 38, borderRadius: 11, background: s.bg, color: s.fg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{s.icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
          <span style={{ fontSize: 13.5, fontWeight: 900, letterSpacing: '-0.01em', color: M_COLORS.fg }}>{o.id}</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: M_COLORS.fg, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{o.cust}</span>
        </div>
        <div style={{ fontSize: 11, color: M_COLORS.muted, fontWeight: 600, marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {o.time} · {o.type} · {o.pay}{o.status !== 'done' && <span style={{ color: s.fg, fontWeight: 800 }}> · {s.label}</span>}
        </div>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 900, fontVariantNumeric: 'tabular-nums', color: M_COLORS.fg, textDecoration: o.status === 'canceled' ? 'line-through' : 'none', opacity: dim ? 0.75 : 1 }}>{o.total}</div>
        <div style={{ fontSize: 10, color: M_COLORS.muted, fontWeight: 700 }}>{o.n} art · lei</div>
      </div>
    </div>
  );
}

function OrderHistoryScreen() {
  const periods = [{ l: 'Azi' }, { l: '7 zile' }, { l: '30 zile', active: true }, { l: 'Personalizat' }];
  const filters = [
    { id: 'all', label: 'Toate', count: 486, active: true },
    { id: 'done', label: 'Finalizate', count: 458 },
    { id: 'canceled', label: 'Anulate', count: 21 },
    { id: 'refunded', label: 'Rambursate', count: 7 },
  ];
  const summary = [
    { label: 'Comenzi', val: '486', unit: '' },
    { label: 'Încasări', val: '34.180', unit: ' lei' },
    { label: 'Valoare medie', val: '70', unit: ' lei' },
  ];
  const days = [
    { label: 'Astăzi · 3 iun', count: 18, revenue: '1.284', items: [
      { id: '#1047', cust: 'Ioana Radu',     time: '20:14', type: 'Livrare',  pay: 'Card online', total: '121,28', n: 4, status: 'done' },
      { id: '#1046', cust: 'Mihai Popescu',  time: '19:52', type: 'Ridicare', pay: 'Numerar',     total: '96,00',  n: 3, status: 'done' },
      { id: '#1045', cust: 'Masa 7',         time: '19:30', type: 'La masă',  pay: 'Card',        total: '138,00', n: 5, status: 'done' },
      { id: '#1043', cust: 'Radu Ene',       time: '18:20', type: 'Livrare',  pay: 'Numerar',     total: '56,00',  n: 2, status: 'canceled' },
    ]},
    { label: 'Ieri · 2 iun', count: 23, revenue: '1.640', items: [
      { id: '#1039', cust: 'Bogdan Marin',   time: '21:40', type: 'Ridicare', pay: 'Card',        total: '84,50',  n: 3, status: 'done' },
      { id: '#1035', cust: 'Elena Vlad',     time: '20:58', type: 'Livrare',  pay: 'Card online', total: '210,00', n: 6, status: 'refunded' },
      { id: '#1032', cust: 'Vlad Ionescu',   time: '20:05', type: 'La masă',  pay: 'Numerar',     total: '74,00',  n: 4, status: 'done' },
    ]},
  ];

  return (
    <Phone>
      <BrandBar
        title="Istoric comenzi"
        sub="comenzi închise"
        right={
          <div style={{ width: 36, height: 36, borderRadius: 12, background: M_COLORS.card, border: `1px solid ${M_COLORS.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: M_COLORS.fg }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v14M12 3 8 7M12 3l4 4"/><path d="M4 21h16"/></svg>
          </div>
        }
      />

      {/* Search */}
      <div style={{ padding: '0 20px 12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '10px 13px', borderRadius: 13, background: M_COLORS.card, border: `1px solid ${M_COLORS.border}` }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={M_COLORS.muted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
          <span style={{ fontSize: 13.5, color: M_COLORS.muted, fontWeight: 500 }}>Caută după # sau client</span>
        </div>
      </div>

      {/* Period pills */}
      <div style={{ display: 'flex', gap: 8, padding: '0 20px 12px', overflowX: 'auto' }}>
        {periods.map((p) => (
          <div key={p.l} style={{ flexShrink: 0, padding: '6px 13px', borderRadius: 999, background: p.active ? M_COLORS.fg : M_COLORS.card, color: p.active ? '#fff' : M_COLORS.muted, border: p.active ? 'none' : `1px solid ${M_COLORS.border}`, fontSize: 12.5, fontWeight: 700 }}>{p.l}</div>
        ))}
      </div>

      {/* Period summary readout */}
      <div style={{ margin: '0 16px 12px', padding: '11px 15px', background: M_COLORS.card, borderRadius: 16, border: `1px solid ${M_COLORS.border}`, display: 'flex', alignItems: 'stretch' }}>
        {summary.map((s, i) => (
          <React.Fragment key={s.label}>
            {i > 0 && <div style={{ width: 1, background: M_COLORS.border, margin: '2px 0' }} />}
            <div style={{ flex: 1, paddingLeft: i ? 14 : 0 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: M_COLORS.muted, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 3 }}>{s.label}</div>
              <div style={{ fontSize: 19, fontWeight: 900, letterSpacing: '-0.02em', color: M_COLORS.fg, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
                {s.val}<span style={{ fontSize: 11, fontWeight: 700, color: M_COLORS.muted }}>{s.unit}</span>
              </div>
            </div>
          </React.Fragment>
        ))}
      </div>

      {/* Status filter chips */}
      <div style={{ display: 'flex', gap: 8, padding: '0 20px 12px', overflowX: 'auto' }}>
        {filters.map((f) => (
          <div key={f.id} style={{ flexShrink: 0, padding: '7px 13px', borderRadius: 999, background: f.active ? M_COLORS.primarySoft : M_COLORS.card, color: f.active ? M_COLORS.primary : M_COLORS.muted, border: f.active ? `1px solid ${M_COLORS.primary}` : `1px solid ${M_COLORS.border}`, display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 700 }}>
            {f.label}
            <span style={{ fontSize: 11, fontWeight: 800, opacity: 0.75 }}>{f.count}</span>
          </div>
        ))}
      </div>

      {/* Grouped day list */}
      <div style={{ padding: '0 16px 120px', overflowY: 'auto', height: 'calc(100% - 340px)', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {days.map((day) => (
          <div key={day.label}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '2px 4px 8px' }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: M_COLORS.fg, letterSpacing: '-0.01em' }}>{day.label}</div>
              <div style={{ fontSize: 11, color: M_COLORS.muted, fontWeight: 700 }}>{day.count} comenzi · <span style={{ color: M_COLORS.primary }}>{day.revenue} lei</span></div>
            </div>
            <div style={{ background: M_COLORS.card, border: `1px solid ${M_COLORS.border}`, borderRadius: 16, overflow: 'hidden', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
              {day.items.map((o, i) => <HistoryRow key={o.id} o={o} first={i === 0} />)}
            </div>
          </div>
        ))}
        <div style={{ textAlign: 'center', fontSize: 12, color: M_COLORS.muted, fontWeight: 600, padding: '4px 0' }}>Trage pentru comenzi mai vechi</div>
      </div>

      <TabBar active="orders" />
    </Phone>
  );
}

// ─── SCREEN 3: Kitchen view ──────────────────────────────────

function KitchenScreen() {
  const tickets = [
    { id: '#1046', mins: 8, target: 25, type: 'Ridicare', items: [{ q: 2, n: 'Diavola', m: 'extra ardei iute' }, { q: 1, n: 'Vin roșu' }], urgent: false },
    { id: '#1045', mins: 12, target: 20, type: 'Masa 7', items: [{ q: 1, n: 'Burger Clasic', m: 'mediu' }, { q: 1, n: 'Burger BBQ', m: 'fără ceapă' }, { q: 1, n: 'Salată Cezar' }], urgent: true },
    { id: '#1042', mins: 2, target: 20, type: 'Masa 3', items: [{ q: 1, n: 'Quattro Formaggi' }, { q: 2, n: 'Espresso' }], urgent: false },
  ];
  return (
    <Phone bg="var(--m-ink-bg)">
      <div style={{ padding: '66px 20px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ ...caveat, color: 'var(--m-eyebrow)', fontSize: 17, fontWeight: 700, lineHeight: 1 }}>bucătărie</div>
          <div style={{ fontSize: 24, fontWeight: 900, letterSpacing: '-0.02em', color: 'var(--m-ink-text)' }}>3 tichete active</div>
        </div>
        <div style={{ padding: '6px 10px', background: 'var(--m-ink-border-strong)', borderRadius: 999, color: 'var(--m-ink-text)', fontSize: 11, fontWeight: 700, display: 'flex', gap: 6, alignItems: 'center' }}>
          <span style={{ width: 6, height: 6, background: M_COLORS.primary, borderRadius: '50%' }} /> Live
        </div>
      </div>

      <div style={{ padding: '0 16px 120px', display: 'flex', flexDirection: 'column', gap: 10, overflowY: 'auto', height: 'calc(100% - 135px)' }}>
        {tickets.map(t => {
          const pct = Math.min(100, (t.mins / t.target) * 100);
          const isUrgent = t.urgent || pct > 80;
          return (
            <div key={t.id} style={{ background: isUrgent ? 'rgba(234, 88, 72, 0.12)' : 'var(--m-ink-card)', borderRadius: 18, border: isUrgent ? `1.5px solid ${M_COLORS.terra}` : '1px solid rgba(255,255,255,0.08)', padding: 14, color: 'var(--m-ink-text)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <div>
                  <div style={{ fontWeight: 900, fontSize: 18, letterSpacing: '-0.02em' }}>{t.id}</div>
                  <div style={{ fontSize: 11, color: 'var(--m-ink-text-mid)', fontWeight: 600 }}>{t.type}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 22, fontWeight: 900, letterSpacing: '-0.02em', color: isUrgent ? M_COLORS.terra : 'var(--m-ink-text)', fontVariantNumeric: 'tabular-nums' }}>{t.mins}:00</div>
                  <div style={{ fontSize: 10, color: 'var(--m-ink-text-dim)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>/ {t.target} min</div>
                </div>
              </div>
              <div style={{ height: 3, background: 'var(--m-ink-border-strong)', borderRadius: 2, marginBottom: 12, overflow: 'hidden' }}>
                <div style={{ width: `${pct}%`, height: '100%', background: isUrgent ? M_COLORS.terra : M_COLORS.primary, borderRadius: 2 }} />
              </div>
              {t.items.map((it, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, padding: '6px 0' }}>
                  <span style={{ width: 24, height: 24, borderRadius: 6, background: 'var(--m-ink-border)', color: 'var(--m-ink-text)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 12, flexShrink: 0 }}>{it.q}</span>
                  <div style={{ flex: 1, fontSize: 14, fontWeight: 600 }}>
                    {it.n}
                    {it.m && <div style={{ fontSize: 11, color: 'var(--m-eyebrow)', fontWeight: 600, ...caveat, lineHeight: 1.1 }}>↳ {it.m}</div>}
                  </div>
                </div>
              ))}
              <button style={{ width: '100%', height: 40, marginTop: 10, borderRadius: 12, border: 0, background: M_COLORS.primary, color: '#fff', fontWeight: 800, fontSize: 13, ...mFont }}>Gata de servit</button>
            </div>
          );
        })}
      </div>
      <TabBar active="kitchen" />
    </Phone>
  );
}

// ─── SCREEN 4: New order (POS) ────────────────────────────────

function NewOrderScreen() {
  const cats = [
    { id: 'pizza', n: 'Pizza', active: true },
    { id: 'burger', n: 'Burgeri' },
    { id: 'pasta', n: 'Paste' },
    { id: 'salad', n: 'Salate' },
    { id: 'drink', n: 'Băuturi' },
  ];
  const items = [
    { n: 'Margherita', d: 'Roșii, mozzarella, busuioc', p: '32,00' },
    { n: 'Prosciutto & Funghi', d: 'Șuncă, ciuperci, mozzarella', p: '38,00' },
    { n: 'Quattro Formaggi', d: 'Patru brânzeturi, oregano', p: '42,00', selected: true, qty: 1 },
    { n: 'Diavola', d: 'Salam picant, ardei iute', p: '39,00' },
  ];
  return (
    <Phone>
      <BrandBar
        title="Comandă nouă"
        sub="masa 7"
        right={
          <div style={{ padding: '6px 12px', background: M_COLORS.primarySoft, color: M_COLORS.primary, borderRadius: 999, fontSize: 12, fontWeight: 800 }}>La masă</div>
        }
      />

      {/* Type selector */}
      <div style={{ padding: '0 16px 12px' }}>
        <div style={{ display: 'flex', background: M_COLORS.card, border: `1px solid ${M_COLORS.border}`, borderRadius: 14, padding: 4 }}>
          {['La masă', 'Ridicare', 'Livrare'].map((t, i) => (
            <div key={t} style={{ flex: 1, padding: '8px 0', textAlign: 'center', borderRadius: 10, background: i === 0 ? M_COLORS.fg : 'transparent', color: i === 0 ? '#fff' : M_COLORS.muted, fontSize: 12, fontWeight: 700 }}>{t}</div>
          ))}
        </div>
      </div>

      {/* Categories */}
      <div style={{ display: 'flex', gap: 8, padding: '0 20px 12px', overflowX: 'auto' }}>
        {cats.map(c => (
          <div key={c.id} style={{ flexShrink: 0, padding: '8px 14px', borderRadius: 999, background: c.active ? M_COLORS.primary : M_COLORS.card, color: c.active ? '#fff' : M_COLORS.fg, border: c.active ? 'none' : `1px solid ${M_COLORS.border}`, fontSize: 13, fontWeight: 700 }}>
            {c.n}
          </div>
        ))}
      </div>

      {/* Menu items */}
      <div style={{ padding: '0 16px 170px', display: 'flex', flexDirection: 'column', gap: 8, overflowY: 'auto', height: 'calc(100% - 270px)' }}>
        {items.map((it, i) => (
          <div key={i} style={{ background: M_COLORS.card, borderRadius: 16, border: `1px solid ${it.selected ? M_COLORS.primary : M_COLORS.border}`, padding: 12, display: 'flex', gap: 12, alignItems: 'center' }}>
            <div style={{ width: 52, height: 52, borderRadius: 12, background: 'repeating-linear-gradient(45deg, hsl(40 30% 91%), hsl(40 30% 91%) 6px, hsl(40 30% 86%) 6px, hsl(40 30% 86%) 12px)', flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 800, fontSize: 14 }}>{it.n}</div>
              <div style={{ fontSize: 11, color: M_COLORS.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.d}</div>
              <div style={{ fontWeight: 800, fontSize: 13, color: M_COLORS.fg, marginTop: 3 }}>{it.p} <span style={{ fontSize: 10, fontWeight: 600, color: M_COLORS.muted }}>lei</span></div>
            </div>
            {it.selected ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: M_COLORS.primarySoft, borderRadius: 999, padding: 3 }}>
                <button style={{ width: 28, height: 28, borderRadius: '50%', border: 0, background: M_COLORS.card, color: M_COLORS.primary, fontWeight: 800, fontSize: 16 }}>−</button>
                <span style={{ minWidth: 20, textAlign: 'center', fontWeight: 800, color: M_COLORS.primary }}>{it.qty}</span>
                <button style={{ width: 28, height: 28, borderRadius: '50%', border: 0, background: M_COLORS.primary, color: '#fff', fontWeight: 800, fontSize: 16 }}>+</button>
              </div>
            ) : (
              <button style={{ width: 36, height: 36, borderRadius: '50%', border: `1.5px solid ${M_COLORS.primary}`, background: M_COLORS.card, color: M_COLORS.primary, fontWeight: 800, fontSize: 18 }}>+</button>
            )}
          </div>
        ))}
      </div>

      {/* Cart summary */}
      <div style={{ position: 'absolute', bottom: 92, left: 0, right: 0, padding: '12px 16px', background: 'var(--m-tabbar)', backdropFilter: 'blur(16px)', borderTop: `1px solid ${M_COLORS.border}`, display: 'flex', gap: 12, alignItems: 'center', zIndex: 20 }}>
        <div>
          <div style={{ fontSize: 10, color: M_COLORS.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>1 articol · Masa 7</div>
          <div style={{ fontSize: 18, fontWeight: 900, letterSpacing: '-0.02em' }}>42,00 <span style={{ fontSize: 11, color: M_COLORS.muted, fontWeight: 600 }}>lei</span></div>
        </div>
        <button style={{ flex: 1, height: 50, borderRadius: 14, border: 0, background: M_COLORS.primary, color: '#fff', fontWeight: 800, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 4px 14px hsl(120 14% 49% / 0.35)', ...mFont }}>
          Trimite la bucătărie
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
        </button>
      </div>

      <TabBar active="new" />
    </Phone>
  );
}

// ─── SCREEN 5: Menu ──────────────────────────────────────────

function MenuScreen() {
  const sections = [
    { n: 'Pizza', items: [
      { n: 'Margherita', p: '32,00', available: true },
      { n: 'Prosciutto & Funghi', p: '38,00', available: true },
      { n: 'Quattro Formaggi', p: '42,00', available: true },
      { n: 'Diavola', p: '39,00', available: false },
    ] },
    { n: 'Burgeri', items: [
      { n: 'Burger Clasic', p: '34,00', available: true },
      { n: 'Burger BBQ', p: '38,00', available: true },
      { n: 'Burger Vegan', p: '32,00', available: true },
    ] },
  ];
  return (
    <Phone>
      <BrandBar
        title="Meniu"
        sub="19 articole"
        right={
          <div style={{ width: 36, height: 36, borderRadius: 12, background: M_COLORS.primary, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
          </div>
        }
      />

      {/* Search */}
      <div style={{ padding: '0 16px 12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: M_COLORS.card, border: `1px solid ${M_COLORS.border}`, borderRadius: 14, padding: '10px 12px' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={M_COLORS.muted} strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <span style={{ fontSize: 13, color: M_COLORS.muted }}>Caută în meniu…</span>
        </div>
      </div>

      <div style={{ padding: '0 16px 120px', overflowY: 'auto', height: 'calc(100% - 200px)' }}>
        {sections.map(sec => (
          <div key={sec.n} style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 4px 10px' }}>
              <div style={{ fontWeight: 900, fontSize: 15, letterSpacing: '-0.01em' }}>{sec.n}</div>
              <span style={{ fontSize: 11, color: M_COLORS.muted, fontWeight: 700 }}>{sec.items.length} articole</span>
            </div>
            <div style={{ background: M_COLORS.card, borderRadius: 18, border: `1px solid ${M_COLORS.border}`, overflow: 'hidden' }}>
              {sec.items.map((it, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderTop: i ? `1px solid ${M_COLORS.border}` : 'none', opacity: it.available ? 1 : 0.5 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{it.n}</div>
                    <div style={{ fontSize: 12, color: M_COLORS.muted, fontWeight: 600 }}>{it.p} lei</div>
                  </div>
                  {/* Toggle availability */}
                  <div style={{ width: 40, height: 24, borderRadius: 999, background: it.available ? M_COLORS.primary : M_COLORS.border, padding: 2, display: 'flex', alignItems: 'center', justifyContent: it.available ? 'flex-end' : 'flex-start' }}>
                    <div style={{ width: 20, height: 20, borderRadius: '50%', background: M_COLORS.card, boxShadow: '0 1px 2px rgba(0,0,0,0.2)' }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <TabBar active="menu" />
    </Phone>
  );
}

// ─── SCREEN 6: Settings (notifications + language only) ──────

function SettingsScreen() {
  const [notifNew, setNotifNew] = useS(true);
  const [notifReady, setNotifReady] = useS(true);
  const [notifSound, setNotifSound] = useS(true);
  const [notifVibrate, setNotifVibrate] = useS(true);

  const toggle = (on, set) => (
    <div onClick={() => set(!on)} style={{ width: 44, height: 26, borderRadius: 999, background: on ? M_COLORS.primary : M_COLORS.border, padding: 3, display: 'flex', justifyContent: on ? 'flex-end' : 'flex-start', cursor: 'pointer', transition: 'background 150ms' }}>
      <div style={{ width: 20, height: 20, borderRadius: '50%', background: M_COLORS.card, boxShadow: '0 2px 4px rgba(0,0,0,0.15)' }} />
    </div>
  );

  const row = (label, sub, right, first) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderTop: first ? 'none' : `1px solid ${M_COLORS.border}` }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 700 }}>{label}</div>
        {sub && <div style={{ fontSize: 11, color: M_COLORS.muted, marginTop: 1 }}>{sub}</div>}
      </div>
      {right}
    </div>
  );

  return (
    <Phone>
      <BrandBar title="Setări" sub="preferințe cont" />

      <div style={{ padding: '0 16px 120px', overflowY: 'auto', height: 'calc(100% - 135px)' }}>
        {/* User card */}
        <div style={{ background: M_COLORS.card, borderRadius: 18, border: `1px solid ${M_COLORS.border}`, padding: 16, marginBottom: 18, display: 'flex', gap: 14, alignItems: 'center' }}>
          <div style={{ width: 52, height: 52, borderRadius: '50%', background: M_COLORS.terra, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 18 }}>MI</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 900, fontSize: 16, letterSpacing: '-0.01em' }}>Maria Iancu</div>
            <div style={{ fontSize: 11, color: M_COLORS.muted }}>Casier · Pizzeria La Colț</div>
            <div style={{ marginTop: 6, display: 'inline-flex', padding: '3px 8px', background: M_COLORS.primarySoft, color: M_COLORS.primary, borderRadius: 999, fontSize: 10, fontWeight: 800, gap: 4, alignItems: 'center' }}>
              <span style={{ width: 5, height: 5, background: 'currentColor', borderRadius: '50%' }} /> Online
            </div>
          </div>
        </div>

        {/* Language section */}
        <div style={{ fontSize: 11, fontWeight: 800, color: M_COLORS.muted, textTransform: 'uppercase', letterSpacing: '0.08em', padding: '0 4px 8px' }}>Limbă</div>
        <div style={{ background: M_COLORS.card, borderRadius: 18, border: `1px solid ${M_COLORS.border}`, marginBottom: 18, overflow: 'hidden' }}>
          {[
            { code: 'ro', n: 'Română', sub: 'România', active: true },
            { code: 'en', n: 'English', sub: 'United Kingdom' },
          ].map((l, i) => (
            <div key={l.code} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderTop: i ? `1px solid ${M_COLORS.border}` : 'none' }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: l.active ? M_COLORS.primarySoft : M_COLORS.bg, color: l.active ? M_COLORS.primary : M_COLORS.fg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 12 }}>{l.code.toUpperCase()}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 700 }}>{l.n}</div>
                <div style={{ fontSize: 11, color: M_COLORS.muted }}>{l.sub}</div>
              </div>
              {l.active && (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={M_COLORS.primary} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
              )}
            </div>
          ))}
        </div>

        {/* Notifications section */}
        <div style={{ fontSize: 11, fontWeight: 800, color: M_COLORS.muted, textTransform: 'uppercase', letterSpacing: '0.08em', padding: '0 4px 8px' }}>Notificări</div>
        <div style={{ background: M_COLORS.card, borderRadius: 18, border: `1px solid ${M_COLORS.border}`, marginBottom: 12, overflow: 'hidden' }}>
          {row('Comandă nouă', 'Push când intră o comandă', toggle(notifNew, setNotifNew), true)}
          {row('Gata de servit', 'Bucătăria marchează gata', toggle(notifReady, setNotifReady))}
          {row('Sunet alertă', 'Redă sunet la notificări', toggle(notifSound, setNotifSound))}
          {row('Vibrație', 'Vibrează telefonul', toggle(notifVibrate, setNotifVibrate))}
        </div>

        <div style={{ background: M_COLORS.primarySoft, borderRadius: 14, padding: '10px 14px', display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 18 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill={M_COLORS.primary} style={{ marginTop: 2, flexShrink: 0 }}><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" fill="none"/></svg>
          <div style={{ fontSize: 11, color: M_COLORS.primary, lineHeight: 1.5 }}>
            Notificările funcționează și când aplicația e închisă. Permite accesul în setările iOS.
          </div>
        </div>

        {/* Sign out */}
        <button style={{ width: '100%', padding: '14px', borderRadius: 18, border: `1px solid ${M_COLORS.border}`, background: M_COLORS.card, color: M_COLORS.red, fontWeight: 800, fontSize: 14, ...mFont }}>
          Deconectare
        </button>

        <div style={{ textAlign: 'center', fontSize: 10, color: M_COLORS.muted, marginTop: 20, fontWeight: 600 }}>
          SiteCare Mobile · v1.0.0 (24)
        </div>
      </div>

      <TabBar active="settings" />
    </Phone>
  );
}

// ─── SCREEN 7: Incoming order (push notification) ────────────

function IncomingScreen() {
  return (
    <Phone bg="#fbf6ea">
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 50% 30%, hsl(0 53% 58% / 0.15), transparent 60%)', pointerEvents: 'none' }} />
      <div style={{ padding: '70px 20px 20px', height: '100%', display: 'flex', flexDirection: 'column', position: 'relative' }}>
        {/* Pulse circle */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24, marginTop: 20 }}>
          <div style={{ position: 'relative', width: 100, height: 100 }}>
            {[0, 1, 2].map(i => (
              <div key={i} style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: `2px solid ${M_COLORS.terra}`, opacity: 0.3 - i * 0.1, transform: `scale(${1 + i * 0.3})` }} />
            ))}
            <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: M_COLORS.terra, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 10px 40px hsl(0 53% 58% / 0.5)' }}>
              <svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
            </div>
          </div>
        </div>

        <div style={{ textAlign: 'center', marginBottom: 22 }}>
          <div style={{ ...caveat, color: M_COLORS.terra, fontSize: 22, fontWeight: 700, lineHeight: 1, marginBottom: 4 }}>comandă nouă!</div>
          <div style={{ fontSize: 30, fontWeight: 900, letterSpacing: '-0.03em', marginBottom: 6 }}>#1048</div>
          <div style={{ fontSize: 13, color: M_COLORS.muted, fontWeight: 600 }}>Site · Livrare · acum</div>
        </div>

        {/* Quick details */}
        <div style={{ background: M_COLORS.card, borderRadius: 20, border: `1px solid ${M_COLORS.border}`, padding: 16, marginBottom: 10, boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <div style={{ width: 42, height: 42, borderRadius: '50%', background: M_COLORS.primarySoft, color: M_COLORS.primary, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 14 }}>AC</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800, fontSize: 14 }}>Ana Cristea</div>
              <div style={{ fontSize: 12, color: M_COLORS.muted }}>Str. Mureșenilor 12, Brașov</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontWeight: 900, fontSize: 16, fontVariantNumeric: 'tabular-nums' }}>87,50</div>
              <div style={{ fontSize: 10, color: M_COLORS.primary, fontWeight: 800 }}>PLĂTIT</div>
            </div>
          </div>
          <div style={{ padding: 10, background: M_COLORS.bg, borderRadius: 10, fontSize: 12, color: M_COLORS.fg, lineHeight: 1.4 }}>
            <b>3 articole</b> · Margherita, Carbonara, Limonadă ×2
          </div>
        </div>

        <div style={{ flex: 1 }} />

        {/* Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button style={{ width: '100%', height: 58, borderRadius: 16, border: 0, background: M_COLORS.primary, color: '#fff', fontWeight: 800, fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, boxShadow: '0 6px 20px hsl(120 14% 49% / 0.4)', ...mFont }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
            Acceptă · 45 min
          </button>
          <div style={{ display: 'flex', gap: 10 }}>
            <button style={{ flex: 1, height: 50, borderRadius: 14, border: `1px solid ${M_COLORS.border}`, background: M_COLORS.card, color: M_COLORS.fg, fontWeight: 700, fontSize: 13, ...mFont }}>Vezi detalii</button>
            <button style={{ flex: 1, height: 50, borderRadius: 14, border: `1px solid ${M_COLORS.border}`, background: M_COLORS.card, color: M_COLORS.red, fontWeight: 700, fontSize: 13, ...mFont }}>Respinge</button>
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: 14, fontSize: 11, color: M_COLORS.muted, fontWeight: 600, display: 'inline-flex', justifyContent: 'center', alignItems: 'center', gap: 6, width: '100%' }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={M_COLORS.muted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
          Așteaptă acțiunea ta · nu expiră
        </div>
      </div>
    </Phone>
  );
}

// ─── SCREEN 8: Login ──────────────────────────────────────────

function LoginScreen() {
  return (
    <Phone>
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 80% 10%, hsl(0 53% 58% / 0.12), transparent 55%), radial-gradient(ellipse at 10% 90%, hsl(120 14% 49% / 0.18), transparent 60%)', pointerEvents: 'none' }} />
      {/* decorative arcs */}
      <div style={{ position: 'absolute', top: 120, right: -160, width: 340, height: 340, borderRadius: '50%', border: `1.5px dashed hsl(120 14% 49% / 0.3)`, pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', top: 200, right: -240, width: 460, height: 460, borderRadius: '50%', border: `1px dashed hsl(0 53% 58% / 0.22)`, pointerEvents: 'none' }} />

      <div style={{ padding: '70px 24px 40px', height: '100%', display: 'flex', flexDirection: 'column', position: 'relative', zIndex: 2 }}>
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8, marginBottom: 38 }}>
          <div style={{ width: 42, height: 42, borderRadius: 12, background: M_COLORS.primary, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 22, boxShadow: '0 6px 18px hsl(120 14% 49% / 0.35)' }}>S</div>
          <div>
            <div style={{ fontSize: 19, letterSpacing: '-0.02em', fontWeight: 700 }}>Site<b style={{ fontWeight: 900 }}>Care</b></div>
            <div style={{ ...caveat, color: M_COLORS.terra, fontSize: 13, fontWeight: 700, lineHeight: 1, marginTop: -2 }}>POS mobile</div>
          </div>
        </div>

        {/* Hero */}
        <div style={{ ...caveat, color: M_COLORS.terra, fontSize: 22, fontWeight: 700, lineHeight: 1, marginBottom: 6 }}>bună dimineața</div>
        <h1 style={{ margin: '0 0 8px', fontSize: 34, fontWeight: 900, letterSpacing: '-0.03em', lineHeight: 1.05 }}>
          Intră în ture.<br/><span style={{ ...caveat, color: M_COLORS.primary, fontWeight: 700, fontSize: 38 }}>gătim împreună.</span>
        </h1>
        <p style={{ fontSize: 13, color: M_COLORS.muted, lineHeight: 1.5, margin: '0 0 28px', maxWidth: 300 }}>
          Autentifică-te cu contul restaurantului pentru a vedea comenzile live și a coordona bucătăria.
        </p>

        {/* Email */}
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: M_COLORS.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Email</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 14px', border: `1.5px solid ${M_COLORS.border}`, borderRadius: 14, background: M_COLORS.card, height: 52 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={M_COLORS.muted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/></svg>
            <div style={{ flex: 1, fontSize: 14, fontWeight: 600, color: M_COLORS.fg }}>maria@pizzacolt.ro</div>
          </div>
        </div>

        {/* Password */}
        <div style={{ marginBottom: 8 }}>
          <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 700, color: M_COLORS.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
            <span>Parolă</span>
            <span style={{ color: M_COLORS.primary, textTransform: 'none', letterSpacing: 0 }}>Ai uitat?</span>
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 14px', border: `1.5px solid ${M_COLORS.primary}`, boxShadow: `0 0 0 3px hsl(120 14% 49% / 0.15)`, borderRadius: 14, background: M_COLORS.card, height: 52 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={M_COLORS.primary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            <div style={{ flex: 1, fontSize: 16, letterSpacing: '0.4em', color: M_COLORS.fg }}>••••••••</div>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={M_COLORS.muted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          </div>
        </div>

        {/* Remember + biometric */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: M_COLORS.fg, fontWeight: 600 }}>
            <div style={{ width: 18, height: 18, borderRadius: 5, background: M_COLORS.primary, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
            </div>
            Ține-mă autentificată
          </div>
        </div>

        {/* Login button */}
        <button style={{ width: '100%', height: 54, borderRadius: 14, border: 0, background: M_COLORS.primary, color: '#fff', fontWeight: 800, fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, boxShadow: '0 6px 20px hsl(120 14% 49% / 0.35)', ...mFont, marginBottom: 12 }}>
          Conectează-mă
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
        </button>

        {/* Face ID */}
        <button style={{ width: '100%', height: 46, borderRadius: 14, border: `1px solid ${M_COLORS.border}`, background: M_COLORS.card, color: M_COLORS.fg, fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, ...mFont }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={M_COLORS.fg} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M4 16v2a2 2 0 0 0 2 2h2M16 20h2a2 2 0 0 0 2-2v-2M9 9v1M15 9v1M9 15s1 1 3 1 3-1 3-1M12 9v4h-1"/></svg>
          Intră cu Face ID
        </button>

        <div style={{ flex: 1 }} />

        <div style={{ textAlign: 'center', fontSize: 11, color: M_COLORS.muted, fontWeight: 600, marginTop: 20 }}>
          <span style={{ ...caveat, fontSize: 14, color: M_COLORS.terra }}>făcut cu</span> ♥ <span style={{ ...caveat, fontSize: 14, color: M_COLORS.terra }}>în Brașov</span>
        </div>
      </div>
    </Phone>
  );
}

// ─── SCREEN 9: Prep time picker (when accepting) ──────────────

function PrepTimeScreen() {
  const options = [15, 25, 35, 45, 60, 75, 90];
  const selected = 45;
  return (
    <Phone>
      {/* Dimmed backdrop to suggest modal */}
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)' }} />

      {/* Background — faint orders list behind */}
      <div style={{ position: 'absolute', top: 54, left: 20, right: 20, padding: '12px 16px', background: 'rgba(255,255,255,0.6)', borderRadius: 16, filter: 'blur(0.5px)', opacity: 0.5 }}>
        <div style={{ fontSize: 20, fontWeight: 900 }}>Comenzi live</div>
      </div>

      {/* Bottom sheet */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: M_COLORS.card, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: '14px 20px 36px', boxShadow: '0 -20px 60px rgba(0,0,0,0.3)' }}>
        {/* Grabber */}
        <div style={{ width: 40, height: 4, background: M_COLORS.border, borderRadius: 2, margin: '0 auto 14px' }} />

        <div style={{ ...caveat, color: M_COLORS.terra, fontSize: 18, fontWeight: 700, lineHeight: 1, marginBottom: 4 }}>comandă #1048</div>
        <h2 style={{ margin: '0 0 6px', fontSize: 22, fontWeight: 900, letterSpacing: '-0.02em' }}>În cât timp e gata?</h2>
        <p style={{ margin: '0 0 18px', fontSize: 13, color: M_COLORS.muted, lineHeight: 1.45 }}>Clientul primește automat estimarea. Poți actualiza mai târziu dacă se schimbă situația.</p>

        {/* Chip grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 14 }}>
          {options.map(m => {
            const active = m === selected;
            return (
              <div key={m} style={{ padding: '14px 0', borderRadius: 14, background: active ? M_COLORS.primary : M_COLORS.card, color: active ? '#fff' : M_COLORS.fg, border: `1.5px solid ${active ? M_COLORS.primary : M_COLORS.border}`, textAlign: 'center', fontWeight: 800, fontSize: 15, boxShadow: active ? '0 4px 12px hsl(120 14% 49% / 0.3)' : 'none' }}>
                {m}
                <div style={{ fontSize: 10, fontWeight: 600, opacity: active ? 0.85 : 0.6, marginTop: 1 }}>min</div>
              </div>
            );
          })}
          <div style={{ padding: '14px 0', borderRadius: 14, background: M_COLORS.card, border: `1.5px dashed ${M_COLORS.border}`, textAlign: 'center', fontWeight: 700, fontSize: 13, color: M_COLORS.muted, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={M_COLORS.muted} strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
            <span style={{ fontSize: 10, marginTop: 2 }}>Alt timp</span>
          </div>
        </div>

        {/* Readout */}
        <div style={{ padding: '14px 16px', background: M_COLORS.bg, borderRadius: 14, marginBottom: 16, display: 'flex', gap: 12, alignItems: 'center' }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: M_COLORS.primarySoft, color: M_COLORS.primary, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, color: M_COLORS.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Gata la</div>
            <div style={{ fontWeight: 900, fontSize: 20, letterSpacing: '-0.02em' }}>10:26 <span style={{ fontSize: 12, color: M_COLORS.muted, fontWeight: 600 }}>· în 45 min</span></div>
          </div>
          <div style={{ ...caveat, fontSize: 16, color: M_COLORS.terra, fontWeight: 700, textAlign: 'right', lineHeight: 1.1 }}>înainte<br/>de prânz</div>
        </div>

        {/* Optional note */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', border: `1px dashed ${M_COLORS.border}`, borderRadius: 12, marginBottom: 18, fontSize: 12, color: M_COLORS.muted }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={M_COLORS.muted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5Z"/></svg>
          Adaugă un mesaj pentru client (opțional)
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10 }}>
          <button style={{ flex: '0 0 96px', height: 52, borderRadius: 14, border: `1px solid ${M_COLORS.border}`, background: M_COLORS.card, color: M_COLORS.fg, fontWeight: 700, fontSize: 13, ...mFont }}>Anulează</button>
          <button style={{ flex: 1, height: 52, borderRadius: 14, border: 0, background: M_COLORS.primary, color: '#fff', fontWeight: 800, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 4px 14px hsl(120 14% 49% / 0.35)', ...mFont }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
            Acceptă · 45 min
          </button>
        </div>
      </div>

      <HomeIndicator />
    </Phone>
  );
}

// ─── SCREEN 10: Courier — list of ready orders ────────────────

function CourierScreen() {
  const orders = [
    { id: '#1044', mins: 2, cust: 'Andreea Toma', addr: 'Str. Mureșenilor 12', dist: '1.2 km', tip: '10', items: 3, total: '137,87', hot: true },
    { id: '#1039', mins: 6, cust: 'Paul Ilie', addr: 'Bd. 15 Noiembrie 48', dist: '2.8 km', items: 2, total: '78,00' },
    { id: '#1036', mins: 12, cust: 'Elena Dragu', addr: 'Str. Castelului 9', dist: '0.9 km', tip: '5', items: 4, total: '164,50', aging: true },
  ];
  return (
    <Phone bg="var(--m-ink-bg)">
      {/* Header */}
      <div style={{ padding: '66px 20px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 44, height: 44, borderRadius: '50%', background: M_COLORS.terra, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 14 }}>AV</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, color: 'var(--m-ink-text-dim)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Curier · Alex V.</div>
          <div style={{ fontSize: 18, fontWeight: 900, letterSpacing: '-0.02em', color: 'var(--m-ink-text)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 8, height: 8, background: M_COLORS.primary, borderRadius: '50%', boxShadow: `0 0 0 3px hsl(120 14% 49% / 0.25)` }} />
            Disponibil
          </div>
        </div>
        <div style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--m-ink-border-strong)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--m-ink-text)' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
        </div>
      </div>

      {/* Shift summary */}
      <div style={{ margin: '0 16px 14px', padding: '12px 14px', background: 'linear-gradient(135deg, hsl(120 14% 49% / 0.2), hsl(120 14% 49% / 0.08))', border: `1px solid hsl(120 14% 49% / 0.3)`, borderRadius: 16, color: 'var(--m-ink-text)', display: 'flex', gap: 14 }}>
        {[
          { k: 'Azi', v: '6', s: 'livrări' },
          { k: 'Distanță', v: '11.4', s: 'km' },
          { k: 'Bacșiș', v: '48', s: 'lei' },
        ].map((s, i) => (
          <React.Fragment key={s.k}>
            {i > 0 && <div style={{ width: 1, background: 'var(--m-ink-divider)' }} />}
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 10, color: 'var(--m-ink-text-dim)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.k}</div>
              <div style={{ fontSize: 18, fontWeight: 900, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>{s.v} <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--m-ink-text-dim)' }}>{s.s}</span></div>
            </div>
          </React.Fragment>
        ))}
      </div>

      {/* Section title */}
      <div style={{ padding: '4px 20px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ ...caveat, color: 'var(--m-eyebrow)', fontSize: 16, fontWeight: 700, lineHeight: 1 }}>gata de ridicare</div>
        <span style={{ fontSize: 11, color: 'var(--m-ink-text-mid)', fontWeight: 700 }}>{orders.length} comenzi</span>
      </div>

      <div style={{ padding: '0 16px 120px', display: 'flex', flexDirection: 'column', gap: 10, overflowY: 'auto', height: 'calc(100% - 290px)' }}>
        {orders.map(o => (
          <div key={o.id} style={{ background: 'var(--m-ink-card)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 18, padding: 14, color: 'var(--m-ink-text)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span style={{ padding: '3px 9px', borderRadius: 999, background: 'hsl(120 14% 49% / 0.25)', color: M_COLORS.primary, fontSize: 11, fontWeight: 800, display: 'inline-flex', gap: 5, alignItems: 'center' }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor' }} /> GATA
              </span>
              {o.hot && <span style={{ padding: '3px 9px', borderRadius: 999, background: 'hsl(0 53% 58% / 0.25)', color: 'var(--m-eyebrow)', fontSize: 11, fontWeight: 800 }}>🔥 fierbinte</span>}
              {o.aging && <span style={{ padding: '3px 9px', borderRadius: 999, background: 'hsl(38 92% 50% / 0.22)', color: '#ffcf5e', fontSize: 11, fontWeight: 800 }}>se răcește</span>}
              <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--m-ink-text-mid)', fontWeight: 700 }}>gata · {o.mins}m</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 }}>
              <div style={{ fontWeight: 900, fontSize: 16, letterSpacing: '-0.01em' }}>{o.id} · {o.cust}</div>
              <div style={{ fontSize: 12, color: 'var(--m-ink-text-mid)', fontWeight: 700 }}>{o.items} articole</div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: 'rgba(0,0,0,0.2)', borderRadius: 10, marginBottom: 10 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--m-eyebrow)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0Z"/><circle cx="12" cy="10" r="3"/></svg>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--m-ink-text)' }}>{o.addr}</div>
                <div style={{ fontSize: 11, color: 'var(--m-ink-text-mid)' }}>Brașov · {o.dist} de restaurant</div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, fontSize: 12 }}>
              <div style={{ color: 'var(--m-ink-text-mid)' }}>Total: <b style={{ color: 'var(--m-ink-text)', fontVariantNumeric: 'tabular-nums' }}>{o.total} lei</b></div>
              {o.tip && <div style={{ padding: '3px 8px', background: 'hsl(120 14% 49% / 0.25)', color: M_COLORS.primary, borderRadius: 999, fontSize: 11, fontWeight: 800 }}>bacșiș {o.tip} lei</div>}
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button style={{ flex: 1, height: 40, borderRadius: 12, border: 0, background: M_COLORS.primary, color: '#fff', fontWeight: 800, fontSize: 13, ...mFont, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>
                Preiau
              </button>
              <button style={{ width: 44, height: 40, borderRadius: 12, border: '1px solid rgba(255,255,255,0.15)', background: 'var(--m-ink-card-low)', color: 'var(--m-ink-text)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Courier bottom bar — different from staff */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 80, paddingBottom: 20, background: 'var(--m-ink-tabbar)', backdropFilter: 'blur(20px)', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'flex-start', paddingTop: 10, zIndex: 30 }}>
        {[
          { id: 'ready', label: 'Gata', active: true, icon: (c) => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg> },
          { id: 'active', label: 'Curse', icon: (c) => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 16H9m10-5-4-4h-3v8h2l2-2m-2 8a2 2 0 1 0 4 0 2 2 0 0 0-4 0Zm-11 0a2 2 0 1 0 4 0 2 2 0 0 0-4 0Z"/></svg> },
          { id: 'history', label: 'Istoric', icon: (c) => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7L3 8m0-5v5h5"/><path d="M12 7v5l3 2"/></svg> },
          { id: 'me', label: 'Eu', icon: (c) => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> },
        ].map(t => {
          const color = t.active ? M_COLORS.primary : 'var(--m-ink-text-mid)';
          return (
            <div key={t.id} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, color }}>
              {t.icon(color)}
              <span style={{ fontSize: 10, fontWeight: 700 }}>{t.label}</span>
              {t.id === 'ready' && <div style={{ position: 'absolute', bottom: 26, width: 20, height: 2, background: M_COLORS.primary, borderRadius: 1 }} />}
            </div>
          );
        })}
      </div>
    </Phone>
  );
}

// ─── Courier bottom tab bar (shared) ──────────────────────────
function CourierTabBar({ active }) {
  const tabs = [
    { id: 'ready', label: 'Gata', icon: (c) => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg> },
    { id: 'active', label: 'Curse', icon: (c) => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 16H9m10-5-4-4h-3v8h2l2-2m-2 8a2 2 0 1 0 4 0 2 2 0 0 0-4 0Zm-11 0a2 2 0 1 0 4 0 2 2 0 0 0-4 0Z"/></svg> },
    { id: 'history', label: 'Istoric', icon: (c) => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7L3 8m0-5v5h5"/><path d="M12 7v5l3 2"/></svg> },
    { id: 'me', label: 'Eu', icon: (c) => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> },
  ];
  return (
    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 80, paddingBottom: 20, background: 'var(--m-ink-tabbar)', backdropFilter: 'blur(20px)', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'flex-start', paddingTop: 10, zIndex: 30 }}>
      {tabs.map(t => {
        const isActive = active === t.id;
        const color = isActive ? M_COLORS.primary : 'var(--m-ink-text-mid)';
        return (
          <div key={t.id} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, color, position: 'relative' }}>
            {t.icon(color)}
            <span style={{ fontSize: 10, fontWeight: 700 }}>{t.label}</span>
            {isActive && <div style={{ position: 'absolute', top: -10, width: 24, height: 2, background: M_COLORS.primary, borderRadius: 1 }} />}
          </div>
        );
      })}
    </div>
  );
}

// ─── SCREEN 11: Courier — Active runs (Curse) ─────────────────
function CourierActiveScreen() {
  return (
    <Phone bg="var(--m-ink-bg)">
      {/* Compact header */}
      <div style={{ padding: '66px 20px 12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ ...caveat, color: 'var(--m-eyebrow)', fontSize: 17, fontWeight: 700, lineHeight: 1 }}>cursă activă</div>
            <div style={{ fontSize: 22, fontWeight: 900, letterSpacing: '-0.02em', color: 'var(--m-ink-text)' }}>Livrare în desfășurare</div>
          </div>
          <div style={{ padding: '5px 10px', background: 'hsl(38 92% 50% / 0.2)', color: '#ffcf5e', borderRadius: 999, fontSize: 11, fontWeight: 800, display: 'inline-flex', gap: 6, alignItems: 'center' }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor' }} /> În drum
          </div>
        </div>
      </div>

      <div style={{ padding: '0 16px 110px', height: 'calc(100% - 185px)', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>

        {/* Map-like hero */}
        <div style={{ position: 'relative', height: 200, borderRadius: 18, overflow: 'hidden', background: 'linear-gradient(135deg, #1a2a20 0%, #0f1814 100%)', border: '1px solid rgba(255,255,255,0.08)' }}>
          {/* Faux map grid */}
          <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0, opacity: 0.35 }}>
            <defs>
              <pattern id="cmap" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#cmap)"/>
            {/* main "road" */}
            <path d="M 30 170 Q 100 140 140 100 T 280 40" stroke="rgba(243,194,139,0.6)" strokeWidth="4" fill="none" strokeLinecap="round" strokeDasharray="none"/>
            <path d="M 30 170 Q 100 140 140 100 T 280 40" stroke="hsl(120 14% 49%)" strokeWidth="4" fill="none" strokeLinecap="round" strokeDasharray="6 6"/>
          </svg>
          {/* start pin (restaurant) */}
          <div style={{ position: 'absolute', bottom: 18, left: 22, width: 24, height: 24, borderRadius: '50%', background: M_COLORS.card, border: `3px solid ${M_COLORS.primary}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 900, color: M_COLORS.primary }}>S</div>
          {/* courier */}
          <div style={{ position: 'absolute', top: 88, left: 130, width: 32, height: 32, borderRadius: '50%', background: '#ffcf5e', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 0 4px rgba(255,207,94,0.25), 0 4px 12px rgba(0,0,0,0.4)' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0f1814" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 16H9m10-5-4-4h-3v8h2l2-2m-2 8a2 2 0 1 0 4 0 2 2 0 0 0-4 0Zm-11 0a2 2 0 1 0 4 0 2 2 0 0 0-4 0Z"/></svg>
          </div>
          {/* destination pin */}
          <div style={{ position: 'absolute', top: 24, right: 26 }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: M_COLORS.terra, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.5)' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0Z"/></svg>
            </div>
          </div>
          {/* ETA chip */}
          <div style={{ position: 'absolute', bottom: 10, right: 10, padding: '6px 10px', background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(10px)', borderRadius: 10, color: 'var(--m-ink-text)', fontSize: 11, fontWeight: 800, display: 'flex', gap: 6, alignItems: 'center' }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: M_COLORS.primary }} />
            ETA 7 min · 1.2 km
          </div>
        </div>

        {/* Current drop details */}
        <div style={{ background: 'var(--m-ink-card)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 18, padding: 14, color: 'var(--m-ink-text)' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
            <div>
              <div style={{ fontWeight: 900, fontSize: 17, letterSpacing: '-0.01em' }}>#1044 · Andreea Toma</div>
              <div style={{ fontSize: 11, color: 'var(--m-ink-text-mid)', fontWeight: 600 }}>Preluată acum 4 min</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontWeight: 900, fontSize: 15, fontVariantNumeric: 'tabular-nums' }}>137,87 <span style={{ fontSize: 10, color: 'var(--m-ink-text-dim)', fontWeight: 600 }}>lei</span></div>
              <div style={{ fontSize: 10, color: M_COLORS.primary, fontWeight: 800 }}>PLĂTIT ONLINE</div>
            </div>
          </div>

          {/* Route stops */}
          <div style={{ position: 'relative', paddingLeft: 10 }}>
            <div style={{ position: 'absolute', left: 14, top: 10, bottom: 36, width: 2, background: 'repeating-linear-gradient(to bottom, rgba(255,255,255,0.25) 0 4px, transparent 4px 8px)' }} />
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 12 }}>
              <div style={{ width: 20, height: 20, borderRadius: '50%', background: M_COLORS.primarySoft, border: `2px solid ${M_COLORS.primary}`, flexShrink: 0, marginTop: 1, marginLeft: -2 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 10, color: 'var(--m-ink-text-dim)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Ridicat</div>
                <div style={{ fontSize: 13, fontWeight: 700 }}>Pizzeria La Colț</div>
                <div style={{ fontSize: 11, color: 'var(--m-ink-text-mid)' }}>Str. Republicii 24</div>
              </div>
              <div style={{ fontSize: 10, color: 'var(--m-ink-text-dim)', fontWeight: 700 }}>10:18</div>
            </div>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <div style={{ width: 20, height: 20, borderRadius: '50%', background: M_COLORS.terra, flexShrink: 0, marginTop: 1, marginLeft: -2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0Z"/></svg>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 10, color: 'var(--m-eyebrow)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Destinație</div>
                <div style={{ fontSize: 13, fontWeight: 700 }}>Str. Mureșenilor 12, ap. 3</div>
                <div style={{ fontSize: 11, color: 'var(--m-ink-text-mid)' }}>Interfon 3B · etaj 2 · cod 4572</div>
              </div>
              <div style={{ fontSize: 10, color: '#ffcf5e', fontWeight: 800 }}>~10:29</div>
            </div>
          </div>

          {/* Quick actions */}
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button style={{ flex: 1, height: 42, borderRadius: 12, border: '1px solid rgba(255,255,255,0.12)', background: 'var(--m-ink-card)', color: 'var(--m-ink-text)', fontWeight: 700, fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, ...mFont }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92Z"/></svg>
              Sună
            </button>
            <button style={{ flex: 1, height: 42, borderRadius: 12, border: '1px solid rgba(255,255,255,0.12)', background: 'var(--m-ink-card)', color: 'var(--m-ink-text)', fontWeight: 700, fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, ...mFont }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>
              Navighează
            </button>
          </div>
        </div>

        {/* Next in queue */}
        <div style={{ padding: '10px 14px', background: 'var(--m-ink-card-low)', border: '1px dashed rgba(255,255,255,0.12)', borderRadius: 14, display: 'flex', alignItems: 'center', gap: 10, color: 'rgba(255,255,255,0.8)' }}>
          <div style={{ width: 32, height: 32, borderRadius: 10, background: 'var(--m-ink-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--m-ink-text-mid)', fontWeight: 800, fontSize: 11 }}>2</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, color: 'var(--m-ink-text-dim)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Următoare în coadă</div>
            <div style={{ fontSize: 13, fontWeight: 700 }}>#1039 · Paul Ilie · 2.8 km</div>
          </div>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 18l6-6-6-6"/></svg>
        </div>
      </div>

      {/* Completion CTA */}
      <div style={{ position: 'absolute', bottom: 80, left: 0, right: 0, padding: '10px 16px', background: 'rgba(10,14,12,0.7)', backdropFilter: 'blur(12px)', borderTop: '1px solid rgba(255,255,255,0.06)', zIndex: 25 }}>
        <button style={{ width: '100%', height: 50, borderRadius: 14, border: 0, background: M_COLORS.primary, color: '#fff', fontWeight: 800, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 6px 20px hsl(120 14% 49% / 0.4)', ...mFont }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
          Marchează ca livrat
        </button>
      </div>

      <CourierTabBar active="active" />
    </Phone>
  );
}

// ─── SCREEN 12: Courier — History (Istoric) ───────────────────
function CourierHistoryScreen() {
  const days = [
    { label: 'Astăzi · 23 apr', runs: 6, km: 11.4, tips: 48, pay: 168, items: [
      { id: '#1043', t: '14:12', addr: 'Str. Castelului 9', amount: '84,00', tip: '8', mins: 18 },
      { id: '#1038', t: '13:45', addr: 'Bd. Eroilor 22', amount: '126,50', tip: '12', mins: 22 },
      { id: '#1034', t: '13:10', addr: 'Str. Lungă 7', amount: '56,00', tip: null, mins: 15 },
    ]},
    { label: 'Ieri · 22 apr', runs: 9, km: 18.6, tips: 72, pay: 234, items: [
      { id: '#1021', t: '21:02', addr: 'Str. Iuliu Maniu 14', amount: '92,00', tip: '15', mins: 24 },
      { id: '#1017', t: '20:30', addr: 'Str. Mihail Kogălniceanu 3', amount: '78,00', tip: '5', mins: 17 },
    ]},
  ];
  return (
    <Phone bg="var(--m-ink-bg)">
      <div style={{ padding: '66px 20px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ ...caveat, color: 'var(--m-eyebrow)', fontSize: 17, fontWeight: 700, lineHeight: 1 }}>istoric curse</div>
          <div style={{ fontSize: 22, fontWeight: 900, letterSpacing: '-0.02em', color: 'var(--m-ink-text)' }}>Săptămâna asta</div>
        </div>
        <div style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--m-ink-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--m-ink-text)' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M7 12h10M10 18h4"/></svg>
        </div>
      </div>

      {/* Week summary card */}
      <div style={{ margin: '0 16px 14px', padding: '14px 16px', background: 'linear-gradient(135deg, hsl(120 14% 49% / 0.22), hsl(120 14% 49% / 0.08))', border: `1px solid hsl(120 14% 49% / 0.32)`, borderRadius: 18, color: 'var(--m-ink-text)' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--m-ink-text-mid)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Câștig total</div>
            <div style={{ fontSize: 30, fontWeight: 900, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>1.246 <span style={{ fontSize: 13, color: 'var(--m-ink-text-mid)', fontWeight: 600 }}>lei</span></div>
          </div>
          <div style={{ padding: '4px 10px', background: 'hsl(120 14% 49% / 0.3)', color: M_COLORS.primary, borderRadius: 999, fontSize: 11, fontWeight: 800 }}>+18% vs. precedentă</div>
        </div>
        {/* Mini bars */}
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 48, marginBottom: 4 }}>
          {[42, 68, 55, 82, 74, 95, 60].map((h, i) => (
            <div key={i} style={{ flex: 1, height: `${h}%`, background: i === 5 ? M_COLORS.primary : 'rgba(255,255,255,0.18)', borderRadius: 3 }} />
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--m-ink-text-low)', fontWeight: 600 }}>
          {['L', 'Ma', 'Mi', 'J', 'V', 'S', 'D'].map(d => <span key={d}>{d}</span>)}
        </div>
      </div>

      {/* Days list */}
      <div style={{ padding: '0 16px 110px', overflowY: 'auto', height: 'calc(100% - 310px)', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {days.map(day => (
          <div key={day.label}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 4px 8px' }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--m-ink-text)', letterSpacing: '-0.01em' }}>{day.label}</div>
              <div style={{ display: 'flex', gap: 8, fontSize: 10, color: 'var(--m-ink-text-mid)', fontWeight: 700 }}>
                <span>{day.runs} curse</span><span>·</span><span>{day.km} km</span><span>·</span><span style={{ color: M_COLORS.primary }}>{day.pay} lei</span>
              </div>
            </div>
            <div style={{ background: 'var(--m-ink-card-low)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, overflow: 'hidden' }}>
              {day.items.map((it, i) => (
                <div key={it.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderTop: i ? '1px solid rgba(255,255,255,0.06)' : 'none', color: 'var(--m-ink-text)' }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: 'hsl(120 14% 49% / 0.2)', color: M_COLORS.primary, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M20 6 9 17l-5-5"/></svg>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 800 }}>{it.id} · {it.addr}</div>
                    <div style={{ fontSize: 11, color: 'var(--m-ink-text-mid)', fontWeight: 600 }}>
                      {it.t} · livrată în {it.mins} min
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 13, fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>{it.amount}</div>
                    {it.tip && <div style={{ fontSize: 10, color: M_COLORS.primary, fontWeight: 800 }}>+ {it.tip} bacșiș</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <CourierTabBar active="history" />
    </Phone>
  );
}

// ─── SCREEN 13: Courier — Me (Eu) ─────────────────────────────
function CourierMeScreen() {
  const sectionTitle = (t) => (
    <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--m-ink-text-low)', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '0 4px 8px' }}>{t}</div>
  );
  const row = (icon, title, sub, right, first) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 14px', borderTop: first ? 'none' : '1px solid rgba(255,255,255,0.06)', color: 'var(--m-ink-text)' }}>
      <div style={{ width: 34, height: 34, borderRadius: 10, background: 'var(--m-ink-border)', color: 'rgba(255,255,255,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{icon}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 700 }}>{title}</div>
        {sub && <div style={{ fontSize: 11, color: 'var(--m-ink-text-dim)' }}>{sub}</div>}
      </div>
      {right}
    </div>
  );
  const toggle = (on) => (
    <div style={{ width: 40, height: 24, borderRadius: 999, background: on ? M_COLORS.primary : 'var(--m-ink-divider)', padding: 2, display: 'flex', justifyContent: on ? 'flex-end' : 'flex-start' }}>
      <div style={{ width: 20, height: 20, borderRadius: '50%', background: M_COLORS.card }} />
    </div>
  );
  const chevron = <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="2.5" strokeLinecap="round"><path d="M9 18l6-6-6-6"/></svg>;

  return (
    <Phone bg="var(--m-ink-bg)">
      <div style={{ padding: '62px 20px 10px' }}>
        <div style={{ ...caveat, color: 'var(--m-eyebrow)', fontSize: 17, fontWeight: 700, lineHeight: 1 }}>profil curier</div>
        <div style={{ fontSize: 22, fontWeight: 900, letterSpacing: '-0.02em', color: 'var(--m-ink-text)' }}>Eu</div>
      </div>

      <div style={{ padding: '0 16px 110px', overflowY: 'auto', height: 'calc(100% - 155px)' }}>

        {/* Identity card */}
        <div style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.03))', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, padding: 16, marginBottom: 16, color: 'var(--m-ink-text)', display: 'flex', gap: 14, alignItems: 'center' }}>
          <div style={{ width: 60, height: 60, borderRadius: '50%', background: M_COLORS.terra, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 20, boxShadow: '0 4px 14px hsl(0 53% 58% / 0.4)' }}>AV</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 17, fontWeight: 900, letterSpacing: '-0.01em' }}>Alex Vasilescu</div>
            <div style={{ fontSize: 11, color: 'var(--m-ink-text-mid)', marginBottom: 6 }}>Curier · din martie 2024</div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="var(--m-eyebrow)" stroke="var(--m-eyebrow)"><polygon points="12 2 15 9 22 9 17 14 19 22 12 17 5 22 7 14 2 9 9 9"/></svg>
              <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--m-ink-text)' }}>4.92</span>
              <span style={{ fontSize: 11, color: 'var(--m-ink-text-dim)' }}>· 318 livrări</span>
            </div>
          </div>
        </div>

        {/* Stats grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 18 }}>
          {[
            { k: 'Luna', v: '86', s: 'curse' },
            { k: 'Distanță', v: '142', s: 'km' },
            { k: 'Bacșișe', v: '412', s: 'lei' },
          ].map(s => (
            <div key={s.k} style={{ background: 'var(--m-ink-card-low)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: '10px 12px', color: 'var(--m-ink-text)' }}>
              <div style={{ fontSize: 10, color: 'var(--m-ink-text-dim)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.k}</div>
              <div style={{ fontSize: 18, fontWeight: 900, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>{s.v}</div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>{s.s}</div>
            </div>
          ))}
        </div>

        {/* Shift */}
        {sectionTitle('Turul meu')}
        <div style={{ background: 'var(--m-ink-card-low)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, marginBottom: 18, overflow: 'hidden' }}>
          {row(
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: M_COLORS.primary, boxShadow: `0 0 0 3px hsl(120 14% 49% / 0.25)` }} />,
            'Disponibil pentru curse',
            'Primești atribuiri automate',
            toggle(true),
            true
          )}
          {row(
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>,
            'Turul curent',
            '10:00 – 18:00 · 4h 26 rămas',
            chevron
          )}
          {row(
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z"/></svg>,
            'Program săptămânal',
            'Luni – Sâmbătă',
            chevron
          )}
        </div>

        {/* Vehicle */}
        {sectionTitle('Vehicul')}
        <div style={{ background: 'var(--m-ink-card-low)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, marginBottom: 18, overflow: 'hidden' }}>
          {row(
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 16H9m10-5-4-4h-3v8h2l2-2m-2 8a2 2 0 1 0 4 0 2 2 0 0 0-4 0Zm-11 0a2 2 0 1 0 4 0 2 2 0 0 0-4 0Z"/></svg>,
            'Scuter · BV 34 LCT',
            'Activ · termică dezactivată',
            chevron,
            true
          )}
          {row(
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>,
            'Geantă izotermă',
            'Curat · ultima verificare ieri',
            <span style={{ fontSize: 11, color: M_COLORS.primary, fontWeight: 800 }}>OK</span>
          )}
        </div>

        {/* Payouts */}
        {sectionTitle('Plăți')}
        <div style={{ background: 'var(--m-ink-card-low)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, marginBottom: 18, overflow: 'hidden' }}>
          {row(
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg>,
            'IBAN plăți',
            'BT •••• 8214',
            chevron,
            true
          )}
          {row(
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12V8H5a2 2 0 0 1 0-4h14v4M3 5v14a2 2 0 0 0 2 2h16v-5"/><circle cx="17" cy="14" r="2"/></svg>,
            'Plata următoare',
            'Luni · ~312 lei',
            <span style={{ fontSize: 11, color: 'var(--m-ink-text-mid)', fontWeight: 700 }}>3 zile</span>
          )}
        </div>

        {/* Preferences */}
        {sectionTitle('Preferințe')}
        <div style={{ background: 'var(--m-ink-card-low)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, marginBottom: 18, overflow: 'hidden' }}>
          {row(
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>,
            'Notificări curse noi',
            null,
            toggle(true),
            true
          )}
          {row(
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3ZM19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8"/></svg>,
            'Sunet alertă',
            null,
            toggle(true)
          )}
          {row(
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15 15 0 0 1 0 20 15 15 0 0 1 0-20Z"/></svg>,
            'Limbă',
            'Română',
            chevron
          )}
        </div>

        <button style={{ width: '100%', padding: '14px', borderRadius: 16, border: '1px solid rgba(255,255,255,0.1)', background: 'var(--m-ink-card-low)', color: M_COLORS.terra, fontWeight: 800, fontSize: 14, ...mFont, marginBottom: 12 }}>
          Deconectare
        </button>

        <div style={{ textAlign: 'center', fontSize: 10, color: 'rgba(255,255,255,0.35)', fontWeight: 600 }}>
          SiteCare Curier · v1.0.0
        </div>
      </div>

      <CourierTabBar active="me" />
    </Phone>
  );
}

// ─── SCREEN 9: Owner dashboard (Acasă) ───────────────────────

// Owner tab bar — kitchen removed, dashboard added first.
function OwnerTabBar({ active = 'home' }) {
  const gridIcon = (c) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>;
  const tabs = [
    { id: 'home', label: 'Acasă', icon: gridIcon },
    { id: 'orders', label: 'Comenzi', icon: receiptIcon, badge: 3 },
    { id: 'new', label: 'Nouă', icon: null, center: true },
    { id: 'menu', label: 'Meniu', icon: bookIcon },
    { id: 'settings', label: 'Setări', icon: gearIcon },
  ];
  return (
    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 92, paddingBottom: 28, background: 'var(--m-tabbar)', backdropFilter: 'blur(20px)', borderTop: `1px solid ${M_COLORS.border}`, display: 'flex', alignItems: 'flex-start', paddingTop: 10, zIndex: 30 }}>
      {tabs.map(t => {
        if (t.center) {
          return (
            <div key={t.id} style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
              <div style={{ width: 52, height: 52, borderRadius: '50%', background: M_COLORS.primary, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 20px hsl(120 14% 49% / 0.45)', marginTop: -14 }}>
                <svg width="22" height="22" viewBox="0 0 24 24" stroke="#fff" strokeWidth="2.5" fill="none" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
              </div>
            </div>
          );
        }
        const isActive = active === t.id;
        const color = isActive ? M_COLORS.primary : M_COLORS.muted;
        return (
          <div key={t.id} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, color, position: 'relative' }}>
            <div style={{ position: 'relative' }}>
              {t.icon(color)}
              {t.badge && <div style={{ position: 'absolute', top: -4, right: -8, background: M_COLORS.terra, color: '#fff', fontSize: 10, fontWeight: 800, borderRadius: 999, minWidth: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px', border: '1.5px solid #fff' }}>{t.badge}</div>}
            </div>
            <span style={{ fontSize: 10, fontWeight: 600 }}>{t.label}</span>
          </div>
        );
      })}
    </div>
  );
}

// Catmull-Rom → cubic bezier for a smooth sales line
function smoothLinePath(pts) {
  if (pts.length < 2) return '';
  let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] || p2;
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${c1x.toFixed(1)} ${c1y.toFixed(1)}, ${c2x.toFixed(1)} ${c2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }
  return d;
}

// Combo chart: sage bars (orders) + terracotta line (sales), dual aligned axes.
// X-axis labels are replaced by tap-to-select — picking a day fills the
// stats readout card above the plot.
function ComboChart({ data }) {
  // Default selection = best sales day, so the readout opens on something useful.
  const peakIdx = data.reduce((best, d, i, a) => (d.sales > a[best].sales ? i : best), 0);
  const [sel, setSel] = React.useState(peakIdx);

  const W = 330, H = 188;
  const pL = 22, pR = 26, pT = 14, pB = 22;
  const plotW = W - pL - pR;
  const plotH = H - pT - pB;
  const ordersMax = 8;   // left axis
  const salesMax = 800;  // right axis (aligned: tick value = ordersTick * 100)
  const band = plotW / data.length;
  const barW = Math.min(22, band * 0.52);

  const yForOrders = (v) => pT + plotH - (v / ordersMax) * plotH;
  const yForSales = (v) => pT + plotH - (v / salesMax) * plotH;
  const cx = (i) => pL + band * (i + 0.5);

  const ticks = [0, 2, 4, 6, 8];
  const linePts = data.map((d, i) => ({ x: cx(i), y: yForSales(d.sales) }));

  const cur = data[sel];
  const avg = cur.orders ? Math.round(cur.sales / cur.orders) : 0;
  const isPeak = sel === peakIdx;

  return (
    <div>
      {/* Selected-day stats readout */}
      <div style={{ background: M_COLORS.bg, borderRadius: 14, border: `1px solid ${M_COLORS.border}`, padding: '11px 13px 12px', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 11 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 7, minWidth: 0 }}>
            <span style={{ fontSize: 14.5, fontWeight: 900, letterSpacing: '-0.01em', color: M_COLORS.fg, whiteSpace: 'nowrap' }}>{cur.dow}</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: M_COLORS.muted, whiteSpace: 'nowrap' }}>{cur.full}</span>
          </div>
          {isPeak && (
            <span style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px', background: M_COLORS.primarySoft, color: M_COLORS.primary, borderRadius: 999, fontSize: 10, fontWeight: 800 }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M6 15l6-6 6 6"/></svg>
              Cea mai bună zi
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'stretch' }}>
          {[
            { dot: M_COLORS.primary, val: cur.orders, unit: '', label: 'Comenzi' },
            { dot: M_COLORS.terra, val: cur.sales, unit: ' lei', label: 'Vânzări' },
            { dot: null, val: avg, unit: ' lei', label: 'Medie/com.' },
          ].map((s, i) => (
            <React.Fragment key={s.label}>
              {i > 0 && <div style={{ width: 1, alignSelf: 'stretch', background: M_COLORS.border, margin: '2px 0' }} />}
              <div style={{ flex: 1, paddingLeft: i ? 12 : 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3 }}>
                  {s.dot && <span style={{ width: 7, height: 7, borderRadius: '50%', background: s.dot, flexShrink: 0 }} />}
                  <span style={{ fontSize: 10, fontWeight: 700, color: M_COLORS.muted, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{s.label}</span>
                </div>
                <div style={{ fontSize: 19, fontWeight: 900, letterSpacing: '-0.02em', color: M_COLORS.fg, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
                  {s.val}<span style={{ fontSize: 11, fontWeight: 700, color: M_COLORS.muted }}>{s.unit}</span>
                </div>
              </div>
            </React.Fragment>
          ))}
        </div>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
        {/* highlight column behind the selected day */}
        <rect x={pL + band * sel} y={pT - 4} width={band} height={plotH + 4} rx="6" fill={M_COLORS.primarySoft} />
        {/* gridlines + dual axis labels */}
        {ticks.map((t) => {
          const y = yForOrders(t);
          return (
            <g key={t}>
              <line x1={pL} y1={y} x2={W - pR} y2={y} stroke={M_COLORS.border} strokeWidth="1" />
              <text x={pL - 5} y={y + 3.5} textAnchor="end" fontSize="9" fontWeight="700" fill={M_COLORS.muted}>{t}</text>
              <text x={W - pR + 5} y={y + 3.5} textAnchor="start" fontSize="9" fontWeight="700" fill={M_COLORS.terra}>{t * 100}</text>
            </g>
          );
        })}
        {/* bars — selected at full strength, others dimmed */}
        {data.map((d, i) => {
          const y = yForOrders(d.orders);
          const x = cx(i) - barW / 2;
          return <rect key={i} x={x} y={y} width={barW} height={pT + plotH - y} rx="4" fill={M_COLORS.primary} opacity={i === sel ? 1 : 0.32} />;
        })}
        {/* sales line */}
        <path d={smoothLinePath(linePts)} fill="none" stroke={M_COLORS.terra} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" opacity="0.9" />
        {linePts.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={i === sel ? 5 : 3.2} fill={i === sel ? M_COLORS.terra : M_COLORS.card} stroke={M_COLORS.terra} strokeWidth="2" />
        ))}
        {/* short date label under the selected day only (replaces full x-axis) */}
        <text x={cx(sel)} y={H - 5} textAnchor="middle" fontSize="9.5" fontWeight="800" fill={M_COLORS.fg}>{data[sel].short}</text>
        {/* full-height tap targets */}
        {data.map((d, i) => (
          <rect key={`hit-${i}`} x={pL + band * i} y={pT - 4} width={band} height={plotH + pB} fill="transparent" style={{ cursor: 'pointer' }} onClick={() => setSel(i)} />
        ))}
      </svg>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, marginTop: 8 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, color: M_COLORS.muted }}>
          <span style={{ width: 12, height: 12, borderRadius: 3, background: M_COLORS.primary }} /> Comenzi
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, color: M_COLORS.muted }}>
          <span style={{ display: 'inline-flex', alignItems: 'center' }}>
            <span style={{ width: 14, height: 2.5, borderRadius: 2, background: M_COLORS.terra }} />
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: M_COLORS.card, border: `2px solid ${M_COLORS.terra}`, marginLeft: -5 }} />
          </span> Vânzări
        </span>
      </div>
    </div>
  );
}

// Ranked list row with proportional sage track behind the label
function RankRow({ name, value, unit, pct, first }) {
  return (
    <div style={{ position: 'relative', padding: '11px 14px', borderTop: first ? 'none' : `1px solid ${M_COLORS.border}`, overflow: 'hidden' }}>
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${pct}%`, background: M_COLORS.primarySoft }} />
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <span style={{ fontSize: 13.5, fontWeight: 700, color: M_COLORS.fg }}>{name}</span>
        <span style={{ fontSize: 13, fontWeight: 800, color: M_COLORS.fg, fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
          {value}<span style={{ fontSize: 11, fontWeight: 600, color: M_COLORS.muted, marginLeft: 3 }}>{unit}</span>
        </span>
      </div>
    </div>
  );
}

function DashboardScreen() {
  const chartData = [
    { short: '28/05', dow: 'Joi',      full: '28 mai',  orders: 3, sales: 280 },
    { short: '29/05', dow: 'Vineri',   full: '29 mai',  orders: 4, sales: 360 },
    { short: '30/05', dow: 'Sâmbătă',  full: '30 mai',  orders: 7, sales: 700 },
    { short: '31/05', dow: 'Duminică', full: '31 mai',  orders: 1, sales: 110 },
    { short: '01/06', dow: 'Luni',     full: '1 iun',   orders: 4, sales: 400 },
    { short: '02/06', dow: 'Marți',    full: '2 iun',   orders: 5, sales: 620 },
    { short: '03/06', dow: 'Miercuri', full: '3 iun',   orders: 4, sales: 349 },
  ];

  const products = [
    { n: 'Taxă ambalaj', v: 28 },
    { n: 'Shaorma Mare', v: 21 },
    { n: 'Shaorma Mică', v: 11 },
    { n: 'Dr. Sandwich', v: 8 },
    { n: 'Snitzel în lipie', v: 7 },
    { n: 'Cheesy Shaorma', v: 6 },
  ];
  const prodMax = products[0].v;

  const zones = [
    { n: 'Cristian', v: 15 },
    { n: 'Vulcan', v: 5 },
    { n: 'Ghimbav', v: 2 },
    { n: 'Râșnov', v: 1 },
  ];
  const zoneMax = zones[0].v;

  const sectionLabel = (txt) => (
    <div style={{ fontSize: 11, fontWeight: 800, color: M_COLORS.muted, textTransform: 'uppercase', letterSpacing: '0.08em', padding: '0 4px 8px' }}>{txt}</div>
  );

  return (
    <Phone>
      <BrandBar
        title="Panou"
        sub="bună, Eduard"
        right={
          <div style={{ width: 38, height: 38, borderRadius: '50%', background: M_COLORS.terra, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 13 }}>DS</div>
        }
      />

      <div style={{ padding: '0 16px 120px', overflowY: 'auto', height: 'calc(100% - 135px)' }}>
        {/* Date range picker */}
        <div style={{ background: M_COLORS.card, borderRadius: 18, border: `1px solid ${M_COLORS.border}`, padding: 12, marginBottom: 14 }}>
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', marginBottom: 10, paddingBottom: 2 }}>
            {[
              { l: 'Azi' }, { l: '7 zile' }, { l: '30 zile', active: true }, { l: 'Personalizat' },
            ].map((p) => (
              <div key={p.l} style={{ flexShrink: 0, padding: '6px 12px', borderRadius: 999, background: p.active ? M_COLORS.fg : M_COLORS.bg, color: p.active ? '#fff' : M_COLORS.muted, border: p.active ? 'none' : `1px solid ${M_COLORS.border}`, fontSize: 12, fontWeight: 700 }}>{p.l}</div>
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {[{ d: '6 mai' }, { d: '4 iun' }].map((f, i) => (
              <React.Fragment key={i}>
                {i === 1 && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={M_COLORS.muted} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M5 12h14M12 5l7 7-7 7"/></svg>}
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 7, padding: '9px 11px', borderRadius: 12, background: M_COLORS.bg, border: `1px solid ${M_COLORS.border}`, minWidth: 0 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={M_COLORS.primary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><rect x="3" y="4" width="18" height="18" rx="3"/><path d="M3 9h18M8 2v4M16 2v4"/></svg>
                  <span style={{ fontSize: 13, fontWeight: 700, color: M_COLORS.fg, whiteSpace: 'nowrap' }}>{f.d}</span>
                </div>
              </React.Fragment>
            ))}
            <button style={{ flexShrink: 0, height: 38, padding: '0 16px', borderRadius: 12, border: 0, background: M_COLORS.primary, color: '#fff', fontWeight: 800, fontSize: 13, ...mFont }}>Aplică</button>
          </div>
          <div style={{ fontSize: 11, color: M_COLORS.muted, fontWeight: 600, marginTop: 8, paddingLeft: 2 }}>6 mai – 4 iun 2026 · 30 de zile</div>
        </div>

        {/* KPI cards */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
          <div style={{ flex: 1, background: M_COLORS.card, borderRadius: 18, border: `1px solid ${M_COLORS.border}`, padding: '14px 14px 15px' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: M_COLORS.muted, marginBottom: 6 }}>Total vânzări</div>
            <div style={{ fontSize: 24, fontWeight: 900, letterSpacing: '-0.03em', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>2.819<span style={{ fontSize: 13, fontWeight: 700, color: M_COLORS.muted }}>,00 lei</span></div>
            <div style={{ marginTop: 9, display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 7px', background: M_COLORS.primarySoft, color: M_COLORS.primary, borderRadius: 999, fontSize: 10.5, fontWeight: 800 }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M6 15l6-6 6 6"/></svg>12%
            </div>
          </div>
          <div style={{ flex: 1, background: M_COLORS.card, borderRadius: 18, border: `1px solid ${M_COLORS.border}`, padding: '14px 14px 15px' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: M_COLORS.muted, marginBottom: 6 }}>Total comenzi</div>
            <div style={{ fontSize: 24, fontWeight: 900, letterSpacing: '-0.03em', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>28</div>
            <div style={{ marginTop: 9, display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 7px', background: M_COLORS.primarySoft, color: M_COLORS.primary, borderRadius: 999, fontSize: 10.5, fontWeight: 800 }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M6 15l6-6 6 6"/></svg>5%
            </div>
          </div>
        </div>

        {/* Chart */}
        {sectionLabel('Comenzi & vânzări pe zi')}
        <div style={{ background: M_COLORS.card, borderRadius: 18, border: `1px solid ${M_COLORS.border}`, padding: '14px 12px 12px', marginBottom: 18 }}>
          <ComboChart data={chartData} />
        </div>

        {/* Top products */}
        {sectionLabel('Top produse comandate')}
        <div style={{ background: M_COLORS.card, borderRadius: 18, border: `1px solid ${M_COLORS.border}`, overflow: 'hidden', marginBottom: 18 }}>
          {products.map((p, i) => (
            <RankRow key={p.n} name={p.n} value={p.v} unit="×" pct={(p.v / prodMax) * 100} first={i === 0} />
          ))}
        </div>

        {/* Delivery zones */}
        {sectionLabel('Zone de livrare')}
        <div style={{ background: M_COLORS.card, borderRadius: 18, border: `1px solid ${M_COLORS.border}`, overflow: 'hidden' }}>
          {zones.map((z, i) => (
            <RankRow key={z.n} name={z.n} value={z.v} unit={z.v === 1 ? 'livrare' : 'livrări'} pct={(z.v / zoneMax) * 100} first={i === 0} />
          ))}
        </div>
      </div>

      <OwnerTabBar active="home" />
    </Phone>
  );
}

Object.assign(window, {
  MobileDashboard: DashboardScreen,
  MobileLogin: LoginScreen,
  MobilePrepTime: PrepTimeScreen,
  MobileCourier: CourierScreen,
  MobileCourierActive: CourierActiveScreen,
  MobileCourierHistory: CourierHistoryScreen,
  MobileCourierMe: CourierMeScreen,
  MobileOrders: OrdersScreen,
  MobileOrderHistory: OrderHistoryScreen,
  MobileOrderDetail: OrderDetailScreen,
  MobileKitchen: KitchenScreen,
  MobileNewOrder: NewOrderScreen,
  MobileMenu: MenuScreen,
  MobileSettings: SettingsScreen,
  MobileIncoming: IncomingScreen,
});
