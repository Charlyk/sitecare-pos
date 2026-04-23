import { useState, useEffect } from 'react';
import { Icon } from './icons.jsx';
import { useT } from './i18n.jsx';
import { elapsedMinutes } from './data.jsx';
import { typeMeta } from './screen-orders.jsx';

function KitchenScreen({ orders, lang, onAdvance, isOffline }) {
  const t = useT(lang);
  const [, force] = useState(0);

  useEffect(() => {
    const id = setInterval(() => force(v => v + 1), 30000);
    return () => clearInterval(id);
  }, []);

  // Kitchen only cares about non-done orders. Group by state.
  // Normalise SDK shape (status: 'NEW') → prototype shape (state: 'new') for compatibility
  const normalised = orders.map(o => ({ ...o, _state: o.state ?? o.status?.toLowerCase() ?? 'new' }));
  const queue = normalised.filter(o => o._state === 'new' || o._state === 'accepted').sort((a, b) => new Date(a.placedAt ?? a.createdAt) - new Date(b.placedAt ?? b.createdAt));
  const active = normalised.filter(o => o._state === 'preparing');
  const ready = normalised.filter(o => o._state === 'ready');

  const Column = ({ title, items, accent, emptyLabel }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minHeight: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 4px' }}>
        <div style={{ width: 8, height: 8, borderRadius: 2, background: accent }} />
        <div style={{ fontWeight: 900, fontSize: 16, letterSpacing: '-0.02em' }}>{title}</div>
        <div style={{ marginLeft: 'auto', fontWeight: 700, fontSize: 12, color: 'var(--sc-muted-foreground)', background: '#fff', border: '1px solid hsl(120 10% 90%)', borderRadius: 999, padding: '2px 10px' }}>{items.length}</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {items.map(o => <KitchenTicket key={o.id} order={o} lang={lang} t={t} onAdvance={onAdvance} isOffline={isOffline} />)}
        {items.length === 0 && (
          <div style={{ border: '1.5px dashed hsl(120 10% 82%)', borderRadius: 14, padding: 24, textAlign: 'center', color: 'var(--sc-muted-foreground)', fontSize: 13 }}>
            {emptyLabel}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="content-pad" style={{ height: '100%' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        <Column title={t('queue')} items={queue} accent="hsl(0 53% 58%)" emptyLabel={lang === 'ro' ? 'Nicio comandă în așteptare' : 'No orders in queue'} />
        <Column title={t('active')} items={active} accent="hsl(38 92% 50%)" emptyLabel={lang === 'ro' ? 'Nimic în pregătire' : 'Nothing cooking'} />
        <Column title={t('ready')} items={ready} accent="hsl(120 14% 49%)" emptyLabel={lang === 'ro' ? 'Nimic gata încă' : 'Nothing ready'} />
      </div>
    </div>
  );
}

function KitchenTicket({ order, lang, t, onAdvance, isOffline }) {
  // Normalise SDK shape for compatibility
  const state = order._state ?? order.state ?? order.status?.toLowerCase() ?? 'new';
  const type = order.type ?? order.orderType ?? 'dinein';
  const placedAt = order.placedAt ?? order.createdAt;
  const elapsed = elapsedMinutes(placedAt);
  const remaining = (order.promisedIn ?? order.estimatedMinutes ?? 0) - elapsed;
  const critical = remaining <= 3;
  const warn = remaining <= 8 && !critical;

  const tm = typeMeta(type, t);
  const next = {
    new: { label: t('accept'), state: 'accepted' },
    accepted: { label: t('start'), state: 'preparing' },
    preparing: { label: t('mark_ready'), state: 'ready' },
    ready: { label: type === 'delivery' ? t('state_out') : t('complete'), state: type === 'delivery' ? 'out' : 'done' },
  }[state];

  const borderColor = critical ? 'var(--sc-terracotta)' : warn ? 'hsl(38 92% 50%)' : 'hsl(120 10% 90%)';

  return (
    <div className="card" style={{ padding: 0, border: `1.5px solid ${borderColor}`, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', padding: '12px 14px', background: state === 'ready' ? 'hsl(120 14% 49% / 0.08)' : state === 'preparing' ? 'hsl(38 92% 50% / 0.08)' : 'hsl(0 53% 58% / 0.06)' }}>
        <div>
          <div style={{ fontWeight: 900, fontSize: 22, letterSpacing: '-0.02em', lineHeight: 1 }}>{order.id}</div>
          <div style={{ display: 'flex', gap: 6, marginTop: 4, alignItems: 'center' }}>
            <Icon name={tm.icon} size={12} />
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--sc-muted-foreground)' }}>{tm.label}{order.table ? ` · ${t('table')} ${order.table}` : ''}</span>
          </div>
        </div>
        <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
          <div style={{ fontFamily: 'Outfit', fontWeight: 900, fontSize: 24, letterSpacing: '-0.02em', color: critical ? 'var(--sc-terracotta)' : warn ? 'hsl(30 80% 38%)' : 'var(--sc-foreground)' }}>
            {elapsed}:00
          </div>
          <div style={{ fontSize: 10, color: 'var(--sc-muted-foreground)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            {t('promised')} {order.promisedIn} {t('min')}
          </div>
        </div>
      </div>

      <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {order.items.map((it, i) => (
          <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'baseline' }}>
            <div style={{ minWidth: 28, height: 28, borderRadius: 6, background: 'var(--sc-primary)', color: '#fff', fontWeight: 900, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 6px' }}>{it.qty}</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>{it.name}</div>
              {it.mods && it.mods.length > 0 && (
                <div style={{ fontSize: 12, color: 'var(--sc-terracotta)', fontWeight: 600, marginTop: 1 }}>
                  → {it.mods.join(', ')}
                </div>
              )}
            </div>
          </div>
        ))}
        {order.notes && (
          <div style={{ marginTop: 6, padding: 8, background: '#fbf6ea', borderRadius: 8, fontSize: 12, fontStyle: 'italic', color: '#8a6d3b', borderLeft: '3px solid var(--sc-terracotta)' }}>
            "{order.notes}"
          </div>
        )}
      </div>

      {next && (
        <div style={{ padding: '10px 14px', borderTop: '1px solid hsl(120 10% 92%)', display: 'flex', gap: 8 }}>
          <button
            className={`btn-primary${isOffline ? ' btn-disabled-offline' : ''}`}
            style={{ flex: 1, height: 40 }}
            disabled={isOffline}
            onClick={() => onAdvance(order, next.state)}
          >
            <Icon name="check" size={14} /> {next.label}
          </button>
        </div>
      )}
    </div>
  );
}

export { KitchenScreen };
