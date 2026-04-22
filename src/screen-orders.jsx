import { useState } from 'react';
import { Icon } from './icons.jsx';
import { useT } from './i18n.jsx';
import { formatRON, elapsedMinutes, orderTimeLabel } from './data.jsx';

function sourceMeta(source, t) {
  const map = {
    web: { chip: 'chip-sage', icon: 'wifi', label: t('source_web') },
    phone: { chip: 'chip-terra', icon: 'phone', label: t('source_phone') },
    counter: { chip: 'chip-slate', icon: 'storefront', label: t('source_counter') },
  };
  return map[source] || map.counter;
}
function typeMeta(type, t) {
  const map = {
    delivery: { icon: 'moped', label: t('delivery') },
    pickup: { icon: 'bag', label: t('pickup') },
    dinein: { icon: 'utensils', label: t('dinein') },
  };
  return map[type] || map.dinein;
}
function stateMeta(state, t) {
  const map = {
    new: { chip: 'chip-terra chip-dot', label: t('state_new') },
    accepted: { chip: 'chip-blue chip-dot', label: t('state_accepted') },
    preparing: { chip: 'chip-amber chip-dot', label: t('state_preparing') },
    ready: { chip: 'chip-sage chip-dot', label: t('state_ready') },
    out: { chip: 'chip-blue chip-dot', label: t('state_out') },
    done: { chip: 'chip-slate chip-dot', label: t('state_done') },
  };
  return map[state] || map.new;
}

function OrderCard({ order, lang, t, onOpen, onAdvance, onPrint }) {
  const src = sourceMeta(order.source, t);
  const typ = typeMeta(order.type, t);
  const st = stateMeta(order.state, t);
  const elapsed = elapsedMinutes(order.placedAt);
  const remaining = (order.promisedIn || 0) - elapsed;
  const timeCritical = remaining <= 5 && order.state !== 'done' && order.state !== 'out';

  const nextAction = {
    new: { label: t('accept'), next: 'accepted' },
    accepted: { label: t('start'), next: 'preparing' },
    preparing: { label: t('mark_ready'), next: 'ready' },
    ready: { label: order.type === 'delivery' ? t('state_out') : t('complete'), next: order.type === 'delivery' ? 'out' : 'done' },
    out: { label: t('complete'), next: 'done' },
  }[order.state];

  return (
    <div className="card shadow" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12, border: order.state === 'new' ? '1.5px solid hsl(0 53% 58% / 0.4)' : '1px solid hsl(120 10% 90%)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ fontWeight: 900, fontSize: 18, letterSpacing: '-0.02em' }}>{order.id}</span>
            <span className={`chip ${st.chip}`}>{st.label}</span>
            {order.state === 'new' && <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--sc-terracotta)' }} className="pulse" />}
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
            <span className={`chip ${src.chip}`}><Icon name={src.icon} size={11} />{src.label}</span>
            <span className="chip chip-slate"><Icon name={typ.icon} size={11} />{typ.label}{order.table ? ` · ${t('table')} ${order.table}` : ''}</span>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 11, color: 'var(--sc-muted-foreground)', fontWeight: 600 }}>{orderTimeLabel(order.placedAt)}</div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 2, fontSize: 12, fontWeight: 700, color: timeCritical ? 'var(--sc-terracotta)' : 'var(--sc-muted-foreground)' }}>
            <Icon name="clock" size={12} />
            {elapsed} {t('min')}
          </div>
        </div>
      </div>

      {/* Customer */}
      <div style={{ fontSize: 13 }}>
        <div style={{ fontWeight: 600 }}>{order.customer.name}</div>
        {order.customer.phone && <div style={{ color: 'var(--sc-muted-foreground)', fontSize: 12 }}>{order.customer.phone}</div>}
        {order.address && <div style={{ color: 'var(--sc-muted-foreground)', fontSize: 12, marginTop: 2 }}>{order.address.line1}</div>}
      </div>

      {/* Items preview */}
      <div style={{ borderTop: '1px dashed hsl(120 10% 88%)', paddingTop: 10, display: 'flex', flexDirection: 'column', gap: 4 }}>
        {order.items.slice(0, 3).map((it, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
            <span><b style={{ color: 'var(--sc-primary)', marginRight: 6 }}>{it.qty}×</b>{it.name}</span>
            <span style={{ color: 'var(--sc-muted-foreground)' }}>{formatRON(it.qty * it.price)}</span>
          </div>
        ))}
        {order.items.length > 3 && <div style={{ fontSize: 12, color: 'var(--sc-muted-foreground)' }}>+{order.items.length - 3} {lang === 'ro' ? 'încă' : 'more'}</div>}
      </div>

      {/* Total + actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8, borderTop: '1px solid hsl(120 10% 92%)' }}>
        <div>
          <div style={{ fontSize: 10, color: 'var(--sc-muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>{t('total')}</div>
          <div style={{ fontWeight: 900, fontSize: 18, letterSpacing: '-0.02em' }}>{formatRON(order.total)}</div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button className="icon-btn" style={{ width: 34, height: 34 }} onClick={() => onPrint(order)} title={t('print')}>
            <Icon name="printer" size={14} />
          </button>
          <button className="btn-secondary" style={{ height: 34, fontSize: 12, padding: '0 12px' }} onClick={() => onOpen(order)}>
            {lang === 'ro' ? 'Detalii' : 'Details'}
          </button>
          {nextAction && (
            <button className="btn-primary" style={{ height: 34, fontSize: 12, padding: '0 14px' }} onClick={() => onAdvance(order, nextAction.next)}>
              {nextAction.label}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function OrdersScreen({ orders, lang, onOpen, onAdvance, onPrint }) {
  const t = useT(lang);
  const [filter, setFilter] = useState('all');

  const filters = [
    { id: 'all', label: t('all'), count: orders.length },
    { id: 'new', label: t('new'), count: orders.filter(o => o.state === 'new').length },
    { id: 'preparing', label: t('preparing'), count: orders.filter(o => o.state === 'preparing' || o.state === 'accepted').length },
    { id: 'ready', label: t('ready'), count: orders.filter(o => o.state === 'ready' || o.state === 'out').length },
  ];

  const typeFilters = [
    { id: 'all', label: t('all'), icon: 'grid' },
    { id: 'delivery', label: t('delivery'), icon: 'moped' },
    { id: 'pickup', label: t('pickup'), icon: 'bag' },
    { id: 'dinein', label: t('dinein'), icon: 'utensils' },
  ];
  const [typeFilter, setTypeFilter] = useState('all');

  const visible = orders.filter(o => {
    if (filter === 'preparing' && !['preparing', 'accepted'].includes(o.state)) return false;
    if (filter === 'ready' && !['ready', 'out'].includes(o.state)) return false;
    if (filter !== 'all' && filter !== 'preparing' && filter !== 'ready' && o.state !== filter) return false;
    if (typeFilter !== 'all' && o.type !== typeFilter) return false;
    return o.state !== 'done';
  });

  // Stats strip
  const todayRevenue = orders.reduce((a, o) => a + o.total, 0);
  const stats = [
    { label: lang === 'ro' ? 'Venit azi' : 'Today revenue', value: formatRON(todayRevenue), icon: 'ron', tint: 'sage' },
    { label: lang === 'ro' ? 'Comenzi active' : 'Active orders', value: orders.filter(o => o.state !== 'done').length, icon: 'zap', tint: 'terra' },
    { label: lang === 'ro' ? 'Timp mediu' : 'Avg. time', value: '23 ' + t('min'), icon: 'clock', tint: 'slate' },
    { label: lang === 'ro' ? 'Finalizate azi' : 'Completed today', value: orders.filter(o => o.state === 'done').length + 24, icon: 'check', tint: 'sage' },
  ];

  return (
    <div className="content-pad">
      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        {stats.map((s, i) => (
          <div key={i} className="card" style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: s.tint === 'sage' ? 'hsl(120 14% 49% / 0.1)' : s.tint === 'terra' ? 'hsl(0 53% 58% / 0.1)' : 'hsl(210 15% 92%)', color: s.tint === 'sage' ? 'var(--sc-primary)' : s.tint === 'terra' ? 'var(--sc-terracotta)' : '#556' , display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name={s.icon} size={18} />
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--sc-muted-foreground)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.label}</div>
              <div style={{ fontWeight: 900, fontSize: 22, letterSpacing: '-0.02em' }}>{s.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filter bar */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ display: 'inline-flex', background: '#fff', border: '1px solid hsl(120 10% 90%)', borderRadius: 10, padding: 3 }}>
          {filters.map(f => (
            <button key={f.id} onClick={() => setFilter(f.id)}
              style={{ border: 0, background: filter === f.id ? 'var(--sc-primary)' : 'transparent', color: filter === f.id ? '#fff' : '#555', padding: '7px 14px', borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6 }}>
              {f.label}
              {f.count > 0 && <span style={{ fontSize: 11, background: filter === f.id ? 'rgba(255,255,255,0.25)' : 'hsl(120 10% 90%)', padding: '1px 6px', borderRadius: 999, fontWeight: 700 }}>{f.count}</span>}
            </button>
          ))}
        </div>

        <div style={{ display: 'inline-flex', background: '#fff', border: '1px solid hsl(120 10% 90%)', borderRadius: 10, padding: 3 }}>
          {typeFilters.map(f => (
            <button key={f.id} onClick={() => setTypeFilter(f.id)}
              style={{ border: 0, background: typeFilter === f.id ? '#f7f1e1' : 'transparent', color: typeFilter === f.id ? 'var(--sc-primary)' : '#777', padding: '7px 12px', borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Icon name={f.icon} size={13} /> {f.label}
            </button>
          ))}
        </div>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <button className="btn-secondary"><Icon name="refresh" size={14} />{lang === 'ro' ? 'Reîmprospătează' : 'Refresh'}</button>
          <button className="btn-secondary"><Icon name="filter" size={14} />{lang === 'ro' ? 'Mai multe filtre' : 'More filters'}</button>
        </div>
      </div>

      {/* Columns */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        {visible.map(o => (
          <OrderCard key={o.id} order={o} lang={lang} t={t} onOpen={onOpen} onAdvance={onAdvance} onPrint={onPrint} />
        ))}
        {visible.length === 0 && (
          <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: 48, color: 'var(--sc-muted-foreground)' }}>
            <div style={{ fontSize: 15, fontWeight: 600 }}>{t('empty_orders')}</div>
            <div style={{ fontSize: 13, marginTop: 4 }}>{t('empty_orders_sub')}</div>
          </div>
        )}
      </div>
    </div>
  );
}

export { OrdersScreen, sourceMeta, typeMeta, stateMeta };
