/* global React, window */
const { useState: useStateHist } = React;

// Status chip + tile styling for closed orders
function histStatusMeta(status, t) {
  const map = {
    completed: { chip: 'chip-sage chip-dot', tile: 'hsl(120 14% 49% / 0.12)', ink: 'var(--sc-primary)', icon: 'check', label: t('status_completed') },
    canceled:  { chip: 'chip-red chip-dot',  tile: 'hsl(0 84% 60% / 0.1)',     ink: 'hsl(0 72% 45%)',   icon: 'x',     label: t('status_canceled') },
    refunded:  { chip: 'chip-amber chip-dot', tile: 'hsl(38 92% 50% / 0.14)',  ink: 'hsl(30 80% 40%)',  icon: 'refresh', label: t('status_refunded') },
  };
  return map[status] || map.completed;
}

const HIST_GRID = '150px minmax(150px, 1.6fr) 118px 78px 66px 116px 132px 116px 34px';

function histTime(iso, lang) {
  return new Date(iso).toLocaleTimeString(lang === 'ro' ? 'ro-RO' : 'en-GB', { hour: '2-digit', minute: '2-digit' });
}

function HistoryReceiptRow({ o, lang, t, onReprint }) {
  const Icon = window.Icon;
  const st = histStatusMeta(o.status, t);
  return (
    <div style={{ gridColumn: '1 / -1', background: '#fbf8f0', borderTop: '1px solid hsl(120 10% 92%)', padding: '16px 20px 18px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 24 }}>
        {/* Left: items */}
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--sc-muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
            {o.items.length} {t('items')}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {o.items.map((it, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'baseline', gap: 10, padding: '6px 0', borderTop: i ? '1px dashed hsl(120 10% 88%)' : 'none' }}>
                <span style={{ fontWeight: 800, color: 'var(--sc-primary)', fontSize: 13, minWidth: 26 }}>{it.qty}×</span>
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{it.name}</span>
                  {it.mods && it.mods.length > 0 && <span style={{ fontSize: 12, color: 'var(--sc-terracotta)', fontWeight: 600, marginLeft: 8 }}>· {it.mods.join(', ')}</span>}
                </div>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--sc-muted-foreground)', fontVariantNumeric: 'tabular-nums' }}>{window.formatRON(it.qty * it.price)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right: totals + meta */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ background: '#fff', border: '1px solid hsl(120 10% 90%)', borderRadius: 12, padding: '12px 14px' }}>
            {[
              { l: t('subtotal'), v: o.subtotal },
              ...(o.deliveryFee ? [{ l: t('delivery_fee'), v: o.deliveryFee }] : []),
              ...(o.tip ? [{ l: t('tip'), v: o.tip }] : []),
              { l: t('tax'), v: o.tax },
            ].map((r, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, color: 'var(--sc-muted-foreground)', padding: '2px 0' }}>
                <span>{r.l}</span><span style={{ fontVariantNumeric: 'tabular-nums' }}>{window.formatRON(r.v)}</span>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 6, paddingTop: 8, borderTop: '1px solid hsl(120 10% 90%)' }}>
              <span style={{ fontWeight: 800, fontSize: 13 }}>{t('total')}</span>
              <span style={{ fontWeight: 900, fontSize: 17, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>{window.formatRON(o.total)}</span>
            </div>
            {o.status === 'refunded' && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6, padding: '6px 8px', background: 'hsl(38 92% 50% / 0.12)', borderRadius: 8, color: 'hsl(30 80% 38%)', fontWeight: 700, fontSize: 12 }}>
                <span>{t('h_refunded_amount')}{o.refundReason ? ` · ${o.refundReason}` : ''}</span>
                <span style={{ fontVariantNumeric: 'tabular-nums' }}>− {window.formatRON(o.refundAmount)}</span>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, fontSize: 12, color: 'var(--sc-muted-foreground)' }}>
            {o.customer.phone && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><Icon name="phone" size={12} />{o.customer.phone}</span>}
            {o.address && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><Icon name="mapPin" size={12} />{o.address.line1}</span>}
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><Icon name="users" size={12} />{t('h_handled_by')} <b style={{ color: 'var(--sc-foreground)', fontWeight: 700 }}>{o.cashier}</b></span>
            {o.prepMins != null && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><Icon name="clock" size={12} />{o.prepMins} {t('min')}</span>}
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
            <button className="btn-secondary" style={{ height: 34, fontSize: 12, padding: '0 12px' }} onClick={() => onReprint(o)}>
              <Icon name="printer" size={13} /> {t('h_reprint')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function HistoryRow({ o, lang, t, expanded, onToggle, onReprint }) {
  const Icon = window.Icon;
  const src = window.sourceMeta(o.source, t);
  const typ = window.typeMeta(o.type, t);
  const st = histStatusMeta(o.status, t);
  const dim = o.status === 'canceled';

  return (
    <React.Fragment>
      <div onClick={onToggle}
        style={{ display: 'grid', gridTemplateColumns: HIST_GRID, alignItems: 'center', gap: 12, padding: '13px 20px', cursor: 'pointer', borderTop: '1px solid hsl(120 10% 94%)', background: expanded ? '#fbf8f0' : 'transparent', transition: 'background 120ms' }}
        onMouseEnter={e => { if (!expanded) e.currentTarget.style.background = '#faf7ef'; }}
        onMouseLeave={e => { if (!expanded) e.currentTarget.style.background = 'transparent'; }}>
        {/* Order id + source */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          <div style={{ width: 30, height: 30, borderRadius: 9, background: st.tile, color: st.ink, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Icon name={st.icon} size={15} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 900, fontSize: 14, letterSpacing: '-0.01em' }}>{o.id}</div>
            <div style={{ fontSize: 10.5, color: 'var(--sc-muted-foreground)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 3 }}><Icon name={src.icon} size={10} />{src.label}</div>
          </div>
        </div>
        {/* Customer */}
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 13.5, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{o.customer.name}</div>
          {o.address && <div style={{ fontSize: 11, color: 'var(--sc-muted-foreground)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{o.address.line1}</div>}
        </div>
        {/* Type */}
        <div><span className="chip chip-slate"><Icon name={typ.icon} size={11} />{typ.label}{o.table ? ` ${o.table}` : ''}</span></div>
        {/* Time */}
        <div style={{ fontSize: 13, color: 'var(--sc-muted-foreground)', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{histTime(o.closedAt, lang)}</div>
        {/* Items count */}
        <div style={{ fontSize: 13, color: 'var(--sc-muted-foreground)', fontWeight: 600, textAlign: 'center' }}>{o.items.reduce((a, it) => a + it.qty, 0)}</div>
        {/* Payment */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: 'var(--sc-muted-foreground)', fontWeight: 600 }}>
          <Icon name={o.payment === 'cash' ? 'cash' : 'card'} size={13} />
          {o.payment === 'online' ? t('online') : o.payment === 'card' ? t('card') : t('cash')}
        </div>
        {/* Status */}
        <div><span className={`chip ${st.chip}`}>{st.label}</span></div>
        {/* Total */}
        <div style={{ textAlign: 'right', fontWeight: 900, fontSize: 14.5, letterSpacing: '-0.01em', fontVariantNumeric: 'tabular-nums', textDecoration: dim ? 'line-through' : 'none', opacity: dim ? 0.6 : 1 }}>
          {window.formatRON(o.total).replace(' lei', '')}
        </div>
        {/* Expand chevron */}
        <div style={{ display: 'flex', justifyContent: 'center', color: 'var(--sc-muted-foreground)', transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 150ms' }}>
          <Icon name="chevDown" size={16} />
        </div>
      </div>
      {expanded && <HistoryReceiptRow o={o} lang={lang} t={t} onReprint={onReprint} />}
    </React.Fragment>
  );
}

function HistoryScreen({ lang, onReprint }) {
  const t = window.useT(lang);
  const Icon = window.Icon;
  const all = window.HISTORY_ORDERS;
  const summary = window.HISTORY_SUMMARY;

  const [period, setPeriod] = useStateHist('30');
  const [status, setStatus] = useStateHist('all');
  const [typeFilter, setTypeFilter] = useStateHist('all');
  const [query, setQuery] = useStateHist('');
  const [expandedId, setExpandedId] = useStateHist(null);

  const periods = [
    { id: 'today', label: t('h_period_today') },
    { id: '7', label: t('h_period_7') },
    { id: '30', label: t('h_period_30') },
    { id: 'custom', label: t('h_period_custom'), icon: 'chevDown' },
  ];
  const statusFilters = [
    { id: 'all', label: t('all'), count: summary.orders },
    { id: 'completed', label: t('h_status_completed'), count: summary.orders - summary.cancelCount - summary.refundCount },
    { id: 'refunded', label: t('h_status_refunded'), count: summary.refundCount },
    { id: 'canceled', label: t('h_status_canceled'), count: summary.cancelCount },
  ];
  const typeFilters = [
    { id: 'all', label: t('all'), icon: 'grid' },
    { id: 'delivery', label: t('delivery'), icon: 'moped' },
    { id: 'pickup', label: t('pickup'), icon: 'bag' },
    { id: 'dinein', label: t('dinein'), icon: 'utensils' },
  ];

  const q = query.trim().toLowerCase();
  const visible = all.filter(o => {
    if (status !== 'all' && o.status !== status) return false;
    if (typeFilter !== 'all' && o.type !== typeFilter) return false;
    if (q && !(o.id.toLowerCase().includes(q) || o.customer.name.toLowerCase().includes(q))) return false;
    return true;
  });

  // Group by calendar day
  const dayKey = (iso) => new Date(iso).toDateString();
  const todayKey = new Date().toDateString();
  const yestKey = (() => { const d = new Date(); d.setDate(d.getDate() - 1); return d.toDateString(); })();
  const dayLabel = (iso) => {
    const k = dayKey(iso);
    const nice = new Date(iso).toLocaleDateString(lang === 'ro' ? 'ro-RO' : 'en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
    if (k === todayKey) return `${t('h_today')} · ${nice}`;
    if (k === yestKey) return `${t('h_yesterday')} · ${nice}`;
    return nice.charAt(0).toUpperCase() + nice.slice(1);
  };

  const groups = [];
  visible.forEach(o => {
    const k = dayKey(o.closedAt);
    let g = groups.find(x => x.key === k);
    if (!g) { g = { key: k, label: dayLabel(o.closedAt), items: [] }; groups.push(g); }
    g.items.push(o);
  });

  const stats = [
    { label: t('h_orders'), value: summary.orders.toLocaleString('ro-RO'), sub: t('h_period_30'), icon: 'receipt', tint: 'sage' },
    { label: t('h_revenue'), value: window.formatRON(summary.revenue), sub: t('h_period_30'), icon: 'ron', tint: 'sage' },
    { label: t('h_avg'), value: window.formatRON(summary.avg), sub: lang === 'ro' ? 'pe comandă' : 'per order', icon: 'percent', tint: 'slate' },
    { label: t('h_refunds'), value: `${summary.refundCount} · ${window.formatRON(summary.refundTotal).replace(' lei', ' lei')}`, sub: lang === 'ro' ? `${summary.cancelCount} anulate` : `${summary.cancelCount} canceled`, icon: 'refresh', tint: 'terra' },
  ];

  return (
    <div className="content-pad">
      {/* Period summary strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        {stats.map((s, i) => (
          <div key={i} className="card" style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, flexShrink: 0, background: s.tint === 'sage' ? 'hsl(120 14% 49% / 0.1)' : s.tint === 'terra' ? 'hsl(0 53% 58% / 0.1)' : 'hsl(210 15% 92%)', color: s.tint === 'sage' ? 'var(--sc-primary)' : s.tint === 'terra' ? 'var(--sc-terracotta)' : '#556', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name={s.icon} size={18} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 11, color: 'var(--sc-muted-foreground)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.label}</div>
              <div style={{ fontWeight: 900, fontSize: 20, letterSpacing: '-0.02em', whiteSpace: 'nowrap' }}>{s.value}</div>
              <div style={{ fontSize: 11, color: 'var(--sc-muted-foreground)', fontWeight: 500 }}>{s.sub}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filter bar */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
        {/* Period */}
        <div style={{ display: 'inline-flex', background: '#fff', border: '1px solid hsl(120 10% 90%)', borderRadius: 10, padding: 3 }}>
          {periods.map(p => (
            <button key={p.id} onClick={() => setPeriod(p.id)}
              style={{ border: 0, background: period === p.id ? 'var(--sc-foreground)' : 'transparent', color: period === p.id ? '#fff' : '#555', padding: '7px 13px', borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6 }}>
              {p.label}{p.icon && <Icon name={p.icon} size={12} />}
            </button>
          ))}
        </div>

        {/* Status */}
        <div style={{ display: 'inline-flex', background: '#fff', border: '1px solid hsl(120 10% 90%)', borderRadius: 10, padding: 3 }}>
          {statusFilters.map(f => (
            <button key={f.id} onClick={() => setStatus(f.id)}
              style={{ border: 0, background: status === f.id ? 'var(--sc-primary)' : 'transparent', color: status === f.id ? '#fff' : '#555', padding: '7px 12px', borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6 }}>
              {f.label}
              <span style={{ fontSize: 11, background: status === f.id ? 'rgba(255,255,255,0.25)' : 'hsl(120 10% 90%)', padding: '1px 6px', borderRadius: 999, fontWeight: 700 }}>{f.count}</span>
            </button>
          ))}
        </div>

        {/* Type */}
        <div style={{ display: 'inline-flex', background: '#fff', border: '1px solid hsl(120 10% 90%)', borderRadius: 10, padding: 3 }}>
          {typeFilters.map(f => (
            <button key={f.id} onClick={() => setTypeFilter(f.id)}
              style={{ border: 0, background: typeFilter === f.id ? '#f7f1e1' : 'transparent', color: typeFilter === f.id ? 'var(--sc-primary)' : '#777', padding: '7px 11px', borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Icon name={f.icon} size={13} /> {f.label}
            </button>
          ))}
        </div>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
          <div className="search" style={{ width: 220 }}>
            <Icon name="search" size={15} style={{ color: 'var(--sc-muted-foreground)' }} />
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder={t('h_search')} />
          </div>
          <button className="btn-secondary" onClick={() => onReprint({ id: t('h_export'), export: true })}>
            <Icon name="download" size={14} /> {t('h_export')}
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="card shadow" style={{ overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ display: 'grid', gridTemplateColumns: HIST_GRID, gap: 12, padding: '11px 20px', background: '#faf6ec', borderBottom: '1px solid hsl(120 10% 90%)', fontSize: 10.5, fontWeight: 700, color: 'var(--sc-muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          <div>{t('h_col_order')}</div>
          <div>{t('h_col_customer')}</div>
          <div>{t('h_col_type')}</div>
          <div>{t('h_col_time')}</div>
          <div style={{ textAlign: 'center' }}>{t('h_col_items')}</div>
          <div>{t('h_col_payment')}</div>
          <div>{t('h_col_status')}</div>
          <div style={{ textAlign: 'right' }}>{t('h_col_total')}</div>
          <div />
        </div>

        {/* Groups */}
        {groups.map(g => {
          const dayRevenue = g.items.filter(o => o.status !== 'canceled').reduce((a, o) => a + o.total - (o.refundAmount || 0), 0);
          return (
            <React.Fragment key={g.key}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 20px', background: '#fcfaf4', borderBottom: '1px solid hsl(120 10% 93%)', borderTop: '1px solid hsl(120 10% 93%)' }}>
                <div style={{ fontSize: 12.5, fontWeight: 800, letterSpacing: '-0.01em' }}>{g.label}</div>
                <div style={{ fontSize: 11.5, color: 'var(--sc-muted-foreground)', fontWeight: 600 }}>
                  {g.items.length} {t('h_orders_count')} · <span style={{ color: 'var(--sc-primary)', fontWeight: 800 }}>{window.formatRON(dayRevenue)}</span>
                </div>
              </div>
              {g.items.map(o => (
                <HistoryRow key={o.id} o={o} lang={lang} t={t}
                  expanded={expandedId === o.id}
                  onToggle={() => setExpandedId(expandedId === o.id ? null : o.id)}
                  onReprint={onReprint} />
              ))}
            </React.Fragment>
          );
        })}

        {groups.length === 0 && (
          <div style={{ textAlign: 'center', padding: 56, color: 'var(--sc-muted-foreground)' }}>
            <div style={{ fontSize: 15, fontWeight: 600 }}>{t('h_empty')}</div>
            <div style={{ fontSize: 13, marginTop: 4 }}>{t('h_empty_sub')}</div>
          </div>
        )}
      </div>
    </div>
  );
}

window.HistoryScreen = HistoryScreen;
