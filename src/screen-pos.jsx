import { useState, useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Icon } from './icons.jsx';
import { useT } from './i18n.jsx';
import { formatRON } from './data.jsx';
import { typeMeta } from './screen-orders.jsx';
import { useMenu } from './use-menu.js';
import { useDeliveryAreas } from './use-delivery-areas.js';
import { useAuth } from './auth.jsx';
import { useAppStore } from './store.js';

const orderTypeMap = { dinein: 'local', pickup: 'pickup', delivery: 'delivery' };

function PosScreen({ lang, isOffline }) {
  const t = useT(lang);
  const { client } = useAuth();
  const queryClient = useQueryClient();
  const pushToast = useAppStore((s) => s.pushToast);
  const { data: menuData } = useMenu();
  const { data: deliveryAreas = [] } = useDeliveryAreas();

  const cats = useMemo(() => (menuData?.categories ?? []).map(c => ({
    id: c.id ?? String(c.categoryId ?? ''),
    ro: c.name ?? '',
    en: c.nameEn ?? c.name ?? '',
    icon: c.icon ?? 'utensils',
    items: (c.products ?? c.items ?? []).map(p => ({
      id: p.id ?? String(p.productId ?? ''),
      ro: p.name ?? '',
      en: p.nameEn ?? p.name ?? '',
      price: typeof p.price === 'number' ? p.price / 100 : 0,
      inStock: p.inStock !== false,
    })),
  })), [menuData]);

  const [cat, setCat] = useState(() => cats[0]?.id ?? '');
  const [cart, setCart] = useState([]);
  const [type, setType] = useState('dinein');
  const [table, setTable] = useState('7');
  const [customer, setCustomer] = useState({ name: '', phone: '', street: '', number: '', bloc: '', apartament: '', etaj: '', interfon: '' });
  const [deliveryAreaId, setDeliveryAreaId] = useState('');
  const [payment, setPayment] = useState('card');
  const [note, setNote] = useState('');
  const [discountValue, setDiscountValue] = useState('');
  const [discountMode, setDiscountMode] = useState('pct'); // 'pct' | 'ron'

  const add = (it) => {
    setCart(c => {
      const ex = c.find(x => x.id === it.id);
      if (ex) return c.map(x => x.id === it.id ? { ...x, qty: x.qty + 1 } : x);
      return [...c, { id: it.id, name: it[lang === 'ro' ? 'ro' : 'en'], price: it.price, qty: 1, mods: [] }];
    });
  };
  const setQty = (id, qty) => setCart(c => qty <= 0 ? c.filter(x => x.id !== id) : c.map(x => x.id === id ? { ...x, qty } : x));

  const subtotal = cart.reduce((a, x) => a + x.qty * x.price, 0);
  const tax = +(subtotal * 0.19).toFixed(2);
  const selectedArea = deliveryAreas.find(a => a.id === deliveryAreaId) ?? null;
  const fee = type === 'delivery' ? (selectedArea?.fee ?? 0) : 0;

  const discountAmount = useMemo(() => {
    const v = parseFloat(discountValue);
    if (!v || v <= 0) return 0;
    if (discountMode === 'pct') return +(subtotal * v / 100).toFixed(2);
    return Math.min(v, subtotal); // RON mode: cap at subtotal
  }, [discountValue, discountMode, subtotal]);

  const total = +(subtotal + fee - discountAmount).toFixed(2);

  const visible = cats.find(c => c.id === cat)?.items ?? [];

  // Sync cat state when categories load for the first time
  const effectiveCat = cat || (cats[0]?.id ?? '');

  const resetCustomer = () => {
    setCustomer({ name: '', phone: '', street: '', number: '', bloc: '', apartament: '', etaj: '', interfon: '' });
    setDeliveryAreaId('');
  };

  const createOrder = useMutation({
    mutationFn: (orderData) => client.kitchen.orders.create({ body: orderData }),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      pushToast({ id: Date.now(), kind: 'success', title: t('order_sent'), detail: `#${result.data?.dailyNumber}` });
      setCart([]);
      setDiscountValue('');
      setNote('');
      resetCustomer();
    },
    onError: () => {
      pushToast({ id: Date.now(), kind: 'error', title: t('order_error'), detail: t('check_connection') });
    },
  });

  const handleCreate = () => {
    const body = {
      orderType: orderTypeMap[type], // CRITICAL: 'dinein' → 'local'
      items: cart.map(it => ({ productId: it.id, quantity: it.qty })),
      ...(customer.name  ? { customerName: customer.name }  : {}),
      ...(customer.phone ? { customerPhone: customer.phone } : {}),
      ...(note           ? { notes: note }                   : {}),
      paymentType: payment === 'online' ? undefined : payment,
      ...(type === 'delivery' && deliveryAreaId ? { deliveryAreaId } : {}),
      ...(type === 'delivery' && customer.street
        ? { deliveryAddress: {
            street: customer.street,
            number: customer.number,
            ...(customer.bloc       ? { bloc: customer.bloc }             : {}),
            ...(customer.apartament ? { apartament: customer.apartament } : {}),
            ...(customer.etaj       ? { etaj: customer.etaj }             : {}),
            ...(customer.interfon   ? { interfon: customer.interfon }     : {}),
          } }
        : {}),
    };
    createOrder.mutate(body);
  };

  const effectiveVisible = (cats.find(c => c.id === effectiveCat)?.items ?? []);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', height: '100%' }}>
      {/* Menu */}
      <div style={{ overflow: 'auto', padding: 24, borderRight: '1px solid hsl(120 10% 90%)' }}>
        {/* Categories */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
          {cats.map(c => (
            <button key={c.id} onClick={() => setCat(c.id)}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', borderRadius: 12, border: effectiveCat === c.id ? '1.5px solid var(--sc-primary)' : '1px solid hsl(120 10% 90%)', background: effectiveCat === c.id ? 'hsl(120 14% 49% / 0.08)' : '#fff', color: effectiveCat === c.id ? 'var(--sc-primary)' : '#444', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
              <Icon name={c.icon} size={14} /> {c[lang === 'ro' ? 'ro' : 'en']}
            </button>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {effectiveVisible.map((it, idx) => {
            const inCart = cart.find(c => c.id === it.id);
            return (
              <button key={it.id}
                onClick={it.inStock ? () => add(it) : undefined}
                className="card"
                style={{
                  textAlign: 'left', padding: 14, cursor: it.inStock ? 'pointer' : 'default',
                  border: inCart ? '1.5px solid var(--sc-primary)' : '1px solid hsl(120 10% 90%)',
                  background: '#fff', display: 'flex', flexDirection: 'column', gap: 6,
                  position: 'relative', fontFamily: 'inherit',
                  opacity: it.inStock ? 1 : 0.45,
                }}>
                {inCart && <div style={{ position: 'absolute', top: 8, right: 8, width: 22, height: 22, background: 'var(--sc-primary)', color: '#fff', borderRadius: 999, fontWeight: 900, fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{inCart.qty}</div>}
                <div style={{ height: 72, borderRadius: 10, background: `linear-gradient(135deg, ${['#f3ecd9', '#fbf6ea', '#ede9de', '#f7efe0'][idx % 4]} 0%, #fff 100%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--sc-primary)' }}>
                  <Icon name={cats.find(c => c.id === effectiveCat)?.icon ?? 'utensils'} size={28} stroke={1.25} />
                </div>
                <div style={{ fontWeight: 700, fontSize: 14, letterSpacing: '-0.01em' }}>{it[lang === 'ro' ? 'ro' : 'en']}</div>
                <div style={{ fontWeight: 900, fontSize: 15, color: 'var(--sc-primary)', marginTop: 2 }}>{formatRON(it.price)}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Cart */}
      <div style={{ display: 'flex', flexDirection: 'column', background: '#fbf6ea', minHeight: 0 }}>
        {/* Type picker */}
        <div style={{ padding: '16px 18px 12px' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--sc-muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>{t('choose_type')}</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
            {['dinein', 'pickup', 'delivery'].map(typeK => {
              const tm = typeMeta(typeK, t);
              return (
                <button key={typeK} onClick={() => setType(typeK)}
                  style={{ padding: '10px 6px', borderRadius: 10, border: type === typeK ? '1.5px solid var(--sc-primary)' : '1px solid hsl(120 10% 88%)', background: type === typeK ? '#fff' : 'transparent', color: type === typeK ? 'var(--sc-primary)' : '#555', fontWeight: 700, fontSize: 12, cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center', fontFamily: 'inherit' }}>
                  <Icon name={tm.icon} size={16} />
                  {tm.label}
                </button>
              );
            })}
          </div>

          {type === 'dinein' && (
            <div style={{ marginTop: 10 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--sc-muted-foreground)' }}>{t('table')}</label>
              <input value={table} onChange={e => setTable(e.target.value)} style={{ width: '100%', padding: '8px 10px', border: '1px solid hsl(120 10% 88%)', borderRadius: 8, marginTop: 4, fontFamily: 'inherit', fontSize: 13 }} />
            </div>
          )}
          {(type === 'delivery' || type === 'pickup') && (
            <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <input placeholder={lang === 'ro' ? 'Nume client' : 'Customer name'} value={customer.name} onChange={e => setCustomer({...customer, name: e.target.value})} style={{ padding: '8px 10px', border: '1px solid hsl(120 10% 88%)', borderRadius: 8, fontFamily: 'inherit', fontSize: 13 }} />
              <input placeholder={lang === 'ro' ? 'Telefon' : 'Phone'} value={customer.phone} onChange={e => setCustomer({...customer, phone: e.target.value})} style={{ padding: '8px 10px', border: '1px solid hsl(120 10% 88%)', borderRadius: 8, fontFamily: 'inherit', fontSize: 13 }} />
              {type === 'delivery' && (
                <>
                  <div style={{ position: 'relative' }}>
                    <select
                      value={deliveryAreaId}
                      onChange={e => setDeliveryAreaId(e.target.value)}
                      style={{ width: '100%', padding: '8px 32px 8px 10px', border: '1px solid hsl(120 10% 88%)', borderRadius: 8, fontFamily: 'inherit', fontSize: 13, background: '#fff', color: deliveryAreaId ? '#111' : 'hsl(120 5% 55%)', boxSizing: 'border-box', appearance: 'none', WebkitAppearance: 'none', outline: 'none', cursor: 'pointer' }}
                    >
                      <option value="">{deliveryAreas.length === 0 ? t('no_areas') : t('choose_area')}</option>
                      {deliveryAreas.map(a => (
                        <option key={a.id} value={a.id}>{a.name} — {formatRON(a.fee)}</option>
                      ))}
                    </select>
                    <Icon name="chevDown" size={14} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'hsl(120 5% 55%)' }} />
                  </div>
                  <div style={{ display: 'flex', gap: 6, minWidth: 0 }}>
                    <input placeholder={t('street')} value={customer.street} onChange={e => setCustomer({...customer, street: e.target.value})} style={{ flex: 3, minWidth: 0, padding: '8px 10px', border: '1px solid hsl(120 10% 88%)', borderRadius: 8, fontFamily: 'inherit', fontSize: 13 }} />
                    <input placeholder={t('street_number')} value={customer.number} onChange={e => setCustomer({...customer, number: e.target.value})} style={{ flex: 1, minWidth: 0, padding: '8px 10px', border: '1px solid hsl(120 10% 88%)', borderRadius: 8, fontFamily: 'inherit', fontSize: 13 }} />
                  </div>
                  <div style={{ display: 'flex', gap: 6, minWidth: 0 }}>
                    <input placeholder={t('bloc')} value={customer.bloc} onChange={e => setCustomer({...customer, bloc: e.target.value})} style={{ flex: 1, minWidth: 0, padding: '8px 8px', border: '1px solid hsl(120 10% 88%)', borderRadius: 8, fontFamily: 'inherit', fontSize: 12 }} />
                    <input placeholder={t('apartament')} value={customer.apartament} onChange={e => setCustomer({...customer, apartament: e.target.value})} style={{ flex: 1, minWidth: 0, padding: '8px 8px', border: '1px solid hsl(120 10% 88%)', borderRadius: 8, fontFamily: 'inherit', fontSize: 12 }} />
                    <input placeholder={t('etaj')} value={customer.etaj} onChange={e => setCustomer({...customer, etaj: e.target.value})} style={{ flex: 1, minWidth: 0, padding: '8px 8px', border: '1px solid hsl(120 10% 88%)', borderRadius: 8, fontFamily: 'inherit', fontSize: 12 }} />
                    <input placeholder={t('interfon')} value={customer.interfon} onChange={e => setCustomer({...customer, interfon: e.target.value})} style={{ flex: 1, minWidth: 0, padding: '8px 8px', border: '1px solid hsl(120 10% 88%)', borderRadius: 8, fontFamily: 'inherit', fontSize: 12 }} />
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Cart items */}
        <div style={{ flex: 1, overflow: 'auto', padding: '4px 18px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--sc-muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{t('cart')}</div>
          {cart.length === 0 && (
            <div style={{ textAlign: 'center', padding: 24, color: 'var(--sc-muted-foreground)' }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{t('empty_cart')}</div>
              <div style={{ fontSize: 12, marginTop: 4 }}>{t('empty_cart_sub')}</div>
            </div>
          )}
          {cart.map(it => (
            <div key={it.id} style={{ background: '#fff', padding: 10, borderRadius: 10, display: 'flex', alignItems: 'center', gap: 10, border: '1px solid hsl(120 10% 90%)' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 13 }}>{it.name}</div>
                <div style={{ fontSize: 11, color: 'var(--sc-muted-foreground)' }}>{formatRON(it.price)} × {it.qty}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <button onClick={() => setQty(it.id, it.qty - 1)} style={{ width: 24, height: 24, borderRadius: 6, border: '1px solid hsl(120 10% 88%)', background: '#fff', cursor: 'pointer', fontWeight: 700 }}>−</button>
                <span style={{ minWidth: 18, textAlign: 'center', fontWeight: 700, fontSize: 13 }}>{it.qty}</span>
                <button onClick={() => setQty(it.id, it.qty + 1)} style={{ width: 24, height: 24, borderRadius: 6, border: '1px solid hsl(120 10% 88%)', background: '#fff', cursor: 'pointer', fontWeight: 700 }}>+</button>
              </div>
              <div style={{ fontWeight: 800, fontSize: 13, minWidth: 68, textAlign: 'right' }}>{formatRON(it.price * it.qty)}</div>
            </div>
          ))}
        </div>

        {/* Totals + actions */}
        <div style={{ borderTop: '1px solid hsl(120 10% 88%)', padding: 16, background: '#fff' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
            <span style={{ color: 'var(--sc-muted-foreground)' }}>{t('subtotal')}</span>
            <span style={{ fontWeight: 600 }}>{formatRON(subtotal)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
            <span style={{ color: 'var(--sc-muted-foreground)' }}>{t('tax')} 19%</span>
            <span style={{ fontWeight: 600 }}>{formatRON(tax)}</span>
          </div>
          {fee > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
              <span style={{ color: 'var(--sc-muted-foreground)' }}>{t('delivery_fee')}</span>
              <span style={{ fontWeight: 600 }}>{formatRON(fee)}</span>
            </div>
          )}

          {/* Discount field — between fee and total */}
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 8, paddingTop: 4 }}>
            <span style={{ fontSize: 12, color: 'var(--sc-muted-foreground)', fontWeight: 600, minWidth: 60 }}>
              {t('discount')}
            </span>
            <input
              type="number"
              min="0"
              max={discountMode === 'pct' ? 100 : undefined}
              value={discountValue}
              onChange={e => setDiscountValue(e.target.value)}
              placeholder="0"
              style={{
                flex: 1, padding: '5px 8px',
                border: '1px solid hsl(120 10% 88%)', borderRadius: 8,
                fontFamily: 'inherit', fontSize: 13,
              }}
            />
            <button
              onClick={() => setDiscountMode(discountMode === 'pct' ? 'ron' : 'pct')}
              style={{
                padding: '5px 10px', borderRadius: 8,
                border: '1px solid hsl(120 10% 88%)',
                background: '#fff', fontWeight: 700, fontSize: 12,
                cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              {discountMode === 'pct' ? '%' : 'RON'}
            </button>
          </div>

          {/* Discount line — only when discountAmount > 0 */}
          {discountAmount > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4, color: 'hsl(0 53% 42%)' }}>
              <span style={{ color: 'var(--sc-muted-foreground)', fontWeight: 600 }}>{t('discount')}</span>
              <span style={{ fontWeight: 700 }}>−{formatRON(discountAmount)}</span>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', paddingTop: 8, borderTop: '1px dashed hsl(120 10% 88%)', marginTop: 8 }}>
            <span style={{ fontWeight: 900, fontSize: 15 }}>{t('total')}</span>
            <span style={{ fontWeight: 900, fontSize: 24, letterSpacing: '-0.02em', color: 'var(--sc-primary)' }}>{formatRON(total)}</span>
          </div>

          <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
            {['cash', 'card', 'online'].map(p => (
              <button key={p} onClick={() => setPayment(p)}
                style={{ flex: 1, padding: '8px 6px', borderRadius: 8, border: payment === p ? '1.5px solid var(--sc-primary)' : '1px solid hsl(120 10% 88%)', background: payment === p ? 'hsl(120 14% 49% / 0.08)' : '#fff', color: payment === p ? 'var(--sc-primary)' : '#555', fontWeight: 700, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, fontFamily: 'inherit' }}>
                <Icon name={p === 'cash' ? 'cash' : p === 'card' ? 'card' : 'wifi'} size={13} />
                {t(p)}
              </button>
            ))}
          </div>

          <button
            className={`btn-primary${isOffline ? ' btn-disabled-offline' : ''}`}
            style={{ width: '100%', marginTop: 12, height: 46, fontSize: 14, justifyContent: 'center' }}
            disabled={cart.length === 0 || isOffline || createOrder.isPending}
            onClick={() => handleCreate()}
          >
            <Icon name="check" size={16} /> {t('ring_up')} — {formatRON(total)}
          </button>
        </div>
      </div>
    </div>
  );
}

export { PosScreen };
