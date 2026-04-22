import { useState, Fragment } from 'react';
import { Icon } from './icons.jsx';
import { useT } from './i18n.jsx';
import { formatRON, elapsedMinutes, orderTimeLabel } from './data.jsx';
import { sourceMeta, typeMeta, stateMeta } from './screen-orders.jsx';

function OrderDetailScreen({ order, lang, onBack, onAdvance, onPrint }) {
  const t = useT(lang);
  const [tab, setTab] = useState('overview');

  if (!order) return null;

  const src = sourceMeta(order.source, t);
  const typ = typeMeta(order.type, t);
  const st = stateMeta(order.state, t);
  const elapsed = elapsedMinutes(order.placedAt);

  const timeline = [
    { label: lang === 'ro' ? 'Plasată' : 'Placed', at: order.placedAt, done: true },
    { label: lang === 'ro' ? 'Acceptată' : 'Accepted', at: order.state !== 'new' ? order.placedAt : null, done: order.state !== 'new' },
    { label: lang === 'ro' ? 'În pregătire' : 'Preparing', done: ['preparing', 'ready', 'out', 'done'].includes(order.state) },
    { label: lang === 'ro' ? 'Gata' : 'Ready', done: ['ready', 'out', 'done'].includes(order.state) },
    { label: order.type === 'delivery' ? (lang === 'ro' ? 'Livrată' : 'Delivered') : (lang === 'ro' ? 'Predată' : 'Handed off'), done: order.state === 'done' },
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', height: '100%', overflow: 'hidden' }}>
      <div style={{ overflow: 'auto', padding: 24 }}>
        {/* Back + header */}
        <button className="btn-ghost" onClick={onBack} style={{ marginBottom: 12, paddingLeft: 0 }}>
          <Icon name="arrowLeft" size={14} /> {lang === 'ro' ? 'Înapoi la comenzi' : 'Back to orders'}
        </button>

        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 16 }}>
          <div>
            <div style={{ fontWeight: 900, fontSize: 32, letterSpacing: '-0.02em', lineHeight: 1 }}>{order.id}</div>
            <div style={{ fontSize: 12, color: 'var(--sc-muted-foreground)', marginTop: 4 }}>
              {orderTimeLabel(order.placedAt)} · {elapsed} {t('min')} {t('elapsed').toLowerCase()}
            </div>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <span className={`chip ${st.chip}`}>{st.label}</span>
            <span className={`chip ${src.chip}`}><Icon name={src.icon} size={11} />{src.label}</span>
            <span className="chip chip-slate"><Icon name={typ.icon} size={11} />{typ.label}{order.table ? ` · ${t('table')} ${order.table}` : ''}</span>
          </div>
        </div>

        {/* Timeline */}
        <div className="card" style={{ padding: 18, marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 0, position: 'relative' }}>
            {timeline.map((step, i) => (
              <Fragment key={i}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: i === timeline.length - 1 ? '0 0 auto' : 0, minWidth: 0 }}>
                  <div style={{ width: 24, height: 24, borderRadius: 999, background: step.done ? 'var(--sc-primary)' : '#fff', border: `2px solid ${step.done ? 'var(--sc-primary)' : 'hsl(120 10% 85%)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {step.done && <Icon name="check" size={12} style={{ color: '#fff' }} stroke={3} />}
                  </div>
                  <div style={{ fontSize: 10, fontWeight: 700, marginTop: 6, color: step.done ? 'var(--sc-foreground)' : 'var(--sc-muted-foreground)', textAlign: 'center', whiteSpace: 'nowrap' }}>{step.label}</div>
                </div>
                {i < timeline.length - 1 && (
                  <div style={{ flex: 1, height: 2, background: timeline[i + 1].done ? 'var(--sc-primary)' : 'hsl(120 10% 90%)', margin: '0 8px', marginBottom: 22 }} />
                )}
              </Fragment>
            ))}
          </div>
        </div>

        {/* Customer + notes */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
          <div className="card" style={{ padding: 16 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--sc-muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>{t('customer')}</div>
            <div style={{ fontWeight: 700, fontSize: 15 }}>{order.customer.name}</div>
            {order.customer.phone && (
              <div style={{ marginTop: 6, display: 'flex', gap: 6, alignItems: 'center', fontSize: 13, color: 'var(--sc-muted-foreground)' }}>
                <Icon name="phone" size={13} /> {order.customer.phone}
              </div>
            )}
            {order.address && (
              <div style={{ marginTop: 10, display: 'flex', gap: 6, alignItems: 'flex-start', fontSize: 13 }}>
                <Icon name="mapPin" size={13} style={{ marginTop: 2, color: 'var(--sc-muted-foreground)' }} />
                <div>
                  <div>{order.address.line1}</div>
                  <div style={{ color: 'var(--sc-muted-foreground)' }}>{order.address.city}</div>
                  {order.address.note && <div style={{ fontSize: 12, color: 'var(--sc-muted-foreground)', marginTop: 2, fontStyle: 'italic' }}>{order.address.note}</div>}
                </div>
              </div>
            )}
            {order.customer.phone && (
              <button className="btn-secondary" style={{ marginTop: 12, width: '100%', justifyContent: 'center' }}>
                <Icon name="phone" size={13} /> {t('call_customer')}
              </button>
            )}
          </div>

          <div className="card" style={{ padding: 16 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--sc-muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>{t('notes')}</div>
            {order.notes ? (
              <div style={{ padding: 10, background: '#fbf6ea', borderRadius: 8, fontSize: 13, fontStyle: 'italic', color: '#6a5a3b', borderLeft: '3px solid var(--sc-terracotta)' }}>"{order.notes}"</div>
            ) : (
              <div style={{ color: 'var(--sc-muted-foreground)', fontSize: 13 }}>{lang === 'ro' ? 'Nicio notă' : 'No notes'}</div>
            )}
            <div style={{ marginTop: 12, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <span className="chip chip-sage"><Icon name={order.payment === 'cash' ? 'cash' : order.payment === 'card' ? 'card' : 'wifi'} size={11} />{t(order.payment)}</span>
              {order.paid && <span className="chip chip-sage"><Icon name="check" size={11} />{lang === 'ro' ? 'Plătit' : 'Paid'}</span>}
            </div>
          </div>
        </div>

        {/* Items */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid hsl(120 10% 92%)' }}>
            <div style={{ fontWeight: 900, fontSize: 15, letterSpacing: '-0.02em' }}>{order.items.length} {t('items')}</div>
            <button className="btn-ghost"><Icon name="edit" size={13} />{lang === 'ro' ? 'Modifică' : 'Modify'}</button>
          </div>
          {order.items.map((it, i) => (
            <div key={i} style={{ padding: '12px 18px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: i < order.items.length - 1 ? '1px solid hsl(120 10% 94%)' : 'none' }}>
              <div style={{ minWidth: 32, height: 32, borderRadius: 8, background: 'hsl(120 14% 49% / 0.12)', color: 'var(--sc-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 13 }}>{it.qty}×</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{it.name}</div>
                {it.mods && it.mods.length > 0 && <div style={{ fontSize: 12, color: 'var(--sc-terracotta)', fontWeight: 600 }}>→ {it.mods.join(', ')}</div>}
              </div>
              <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--sc-muted-foreground)' }}>{formatRON(it.price)}</div>
              <div style={{ fontWeight: 800, fontSize: 14, minWidth: 72, textAlign: 'right' }}>{formatRON(it.price * it.qty)}</div>
            </div>
          ))}
          <div style={{ padding: 18, background: '#fbf6ea' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
              <span>{t('subtotal')}</span><span style={{ fontWeight: 600 }}>{formatRON(order.subtotal)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
              <span>{t('tax')}</span><span style={{ fontWeight: 600 }}>{formatRON(order.tax)}</span>
            </div>
            {order.deliveryFee > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}><span>{t('delivery_fee')}</span><span style={{ fontWeight: 600 }}>{formatRON(order.deliveryFee)}</span></div>}
            {order.tip > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}><span>{t('tip')}</span><span style={{ fontWeight: 600 }}>{formatRON(order.tip)}</span></div>}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', paddingTop: 8, marginTop: 8, borderTop: '1px dashed hsl(120 10% 82%)' }}>
              <span style={{ fontWeight: 900, fontSize: 16 }}>{t('total')}</span>
              <span style={{ fontWeight: 900, fontSize: 26, letterSpacing: '-0.02em', color: 'var(--sc-primary)' }}>{formatRON(order.total)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right: thermal ticket preview */}
      <div style={{ background: '#ede9de', padding: 24, display: 'flex', flexDirection: 'column', gap: 12, overflow: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div className="eyebrow">thermal preview</div>
            <div style={{ fontWeight: 900, fontSize: 15, letterSpacing: '-0.02em' }}>{lang === 'ro' ? 'Bon imprimantă' : 'Ticket preview'}</div>
          </div>
          <div style={{ display: 'flex', background: '#fff', borderRadius: 8, padding: 3, border: '1px solid hsl(120 10% 88%)' }}>
            <button onClick={() => setTab('overview')} style={{ border: 0, padding: '5px 10px', borderRadius: 6, background: tab === 'overview' ? 'var(--sc-primary)' : 'transparent', color: tab === 'overview' ? '#fff' : '#555', fontWeight: 700, fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}>
              {t('print_kitchen')}
            </button>
            <button onClick={() => setTab('customer')} style={{ border: 0, padding: '5px 10px', borderRadius: 6, background: tab === 'customer' ? 'var(--sc-primary)' : 'transparent', color: tab === 'customer' ? '#fff' : '#555', fontWeight: 700, fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}>
              {t('print_customer')}
            </button>
          </div>
        </div>

        {/* The ticket */}
        <ThermalTicket order={order} lang={lang} kind={tab} />

        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-secondary" style={{ flex: 1, justifyContent: 'center' }} onClick={() => onPrint(order, 'kitchen')}>
            <Icon name="printer" size={14} /> {t('print_kitchen')}
          </button>
          <button className="btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={() => onPrint(order, 'customer')}>
            <Icon name="printer" size={14} /> {t('print_customer')}
          </button>
        </div>

        {/* Advance */}
        {order.state !== 'done' && (
          <button className="btn-terracotta" style={{ height: 44, justifyContent: 'center', fontSize: 14 }}
            onClick={() => {
              const next = { new: 'accepted', accepted: 'preparing', preparing: 'ready', ready: order.type === 'delivery' ? 'out' : 'done', out: 'done' }[order.state];
              if (next) onAdvance(order, next);
            }}>
            <Icon name="chevRight" size={14} />
            {order.state === 'new' ? t('accept') : order.state === 'preparing' ? t('mark_ready') : t('complete')}
          </button>
        )}
      </div>
    </div>
  );
}

function ThermalTicket({ order, lang, kind }) {
  const t = useT(lang);
  // Classic 80mm thermal look: monospace, dashes, all caps
  const dashed = '--------------------------------';
  const money = (n) => n.toFixed(2);
  return (
    <div style={{
      background: '#fafaf6', border: '1px solid hsl(120 10% 82%)',
      borderRadius: 6, padding: '20px 16px',
      fontFamily: '"SF Mono", "Menlo", "Courier New", monospace',
      fontSize: 11, lineHeight: 1.5, color: '#1a1a1a',
      boxShadow: '0 4px 14px rgba(0,0,0,0.06)',
      maxWidth: 320, alignSelf: 'center', width: '100%',
      position: 'relative',
    }}>
      {/* receipt top */}
      <div style={{ position: 'absolute', top: -6, left: 0, right: 0, height: 10, background: `repeating-linear-gradient(45deg, transparent 0 6px, #ede9de 6px 12px)` }} />
      <div style={{ textAlign: 'center', fontWeight: 700, fontSize: 14 }}>SITECARE RESTAURANT</div>
      <div style={{ textAlign: 'center', fontSize: 10 }}>Str. Republicii 14, Brașov</div>
      <div style={{ textAlign: 'center', fontSize: 10 }}>CUI: RO38291445</div>
      <div style={{ textAlign: 'center', fontSize: 10 }}>Tel: 0268 555 1200</div>
      <div style={{ textAlign: 'center', margin: '6px 0' }}>{dashed}</div>

      {kind === 'kitchen' && (
        <div style={{ textAlign: 'center', background: '#1a1a1a', color: '#fff', padding: '4px 0', fontWeight: 700, marginBottom: 6 }}>
          *** {lang === 'ro' ? 'BON BUCĂTĂRIE' : 'KITCHEN TICKET'} ***
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span>{lang === 'ro' ? 'Comanda' : 'Order'} {order.id}</span>
        <span>{orderTimeLabel(order.placedAt)}</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span>{typeMeta(order.type, t).label.toUpperCase()}{order.table ? ` · MASA ${order.table}` : ''}</span>
        <span>{order.source.toUpperCase()}</span>
      </div>
      {order.customer.name && <div>Client: {order.customer.name}</div>}
      {order.address && <div style={{ fontSize: 10 }}>{order.address.line1}</div>}
      <div>{dashed}</div>

      {order.items.map((it, i) => (
        <div key={i} style={{ margin: '2px 0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
            <span>{it.qty}x {it.name.toUpperCase()}</span>
            {kind !== 'kitchen' && <span>{money(it.price * it.qty)}</span>}
          </div>
          {it.mods && it.mods.length > 0 && <div style={{ paddingLeft: 12, fontSize: 10 }}>→ {it.mods.join(', ')}</div>}
        </div>
      ))}

      {order.notes && (
        <>
          <div>{dashed}</div>
          <div style={{ fontWeight: 700 }}>NOTE:</div>
          <div style={{ fontSize: 10 }}>{order.notes}</div>
        </>
      )}

      {kind !== 'kitchen' && (
        <>
          <div>{dashed}</div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Subtotal</span><span>{money(order.subtotal)}</span></div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>TVA 19%</span><span>{money(order.tax)}</span></div>
          {order.deliveryFee > 0 && <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Livrare</span><span>{money(order.deliveryFee)}</span></div>}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 13, marginTop: 4 }}>
            <span>TOTAL RON</span><span>{money(order.total)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}><span>Plată</span><span>{order.payment.toUpperCase()}</span></div>
        </>
      )}

      <div style={{ textAlign: 'center', margin: '8px 0 4px' }}>{dashed}</div>
      <div style={{ textAlign: 'center', fontSize: 10 }}>{lang === 'ro' ? 'Mulțumim!' : 'Thank you!'}</div>
      <div style={{ textAlign: 'center', fontSize: 10 }}>sitecare.ro</div>
      {/* barcode */}
      <div style={{ margin: '10px 0 2px', display: 'flex', justifyContent: 'center', gap: 1 }}>
        {[...order.id.replace('#', '') + '00'].map((_, i) => (
          <div key={i} style={{ width: Math.random() > 0.5 ? 2 : 1, height: 30, background: '#1a1a1a' }} />
        ))}
      </div>
      <div style={{ textAlign: 'center', fontSize: 9 }}>{order.id.replace('#', '')}·{new Date(order.placedAt).getFullYear()}</div>
    </div>
  );
}

export { OrderDetailScreen, ThermalTicket };
