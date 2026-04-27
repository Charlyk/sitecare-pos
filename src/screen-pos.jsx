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
      optionGroups: (p.optionGroups ?? [])
        .filter(og => og.isActive !== false)
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
        .map(og => ({
          id: og.id,
          name: og.name,
          type: og.type ?? 'single',
          minSelections: og.minSelections ?? 0,
          maxSelections: og.maxSelections ?? null,
          options: (og.options ?? [])
            .filter(o => o.isActive !== false)
            .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
            .map(o => ({
              id: o.id,
              name: o.name,
              priceDelta: typeof o.priceDelta === 'number' ? o.priceDelta / 100 : 0,
            })),
        })),
    })),
  })), [menuData]);

  const [cat, setCat] = useState(() => cats[0]?.id ?? '');
  const [cart, setCart] = useState([]);
  const [type, setType] = useState('dinein');
  const [table, setTable] = useState('');
  const [customer, setCustomer] = useState({ name: '', phone: '', street: '', number: '', bloc: '', apartament: '', etaj: '', interfon: '' });
  const [deliveryAreaId, setDeliveryAreaId] = useState('');
  const [payment, setPayment] = useState('card');
  const [note, setNote] = useState('');
  const [discountValue, setDiscountValue] = useState('');
  const [discountMode, setDiscountMode] = useState('pct'); // 'pct' | 'ron'
  const [prepDialog, setPrepDialog] = useState(false);

  // Options modal state
  const [optionModal, setOptionModal] = useState(null); // null | { product }
  const [selections, setSelections] = useState({}); // { [ogId]: string[] }

  const addToCart = (product, sels) => {
    const allOpts = (product.optionGroups ?? []).flatMap(og => og.options ?? []);
    const chosenIds = Object.values(sels).flat();
    const extraPrice = allOpts
      .filter(o => chosenIds.includes(o.id))
      .reduce((sum, o) => sum + o.priceDelta, 0);

    const mods = (product.optionGroups ?? []).flatMap(og => {
      const ids = sels[og.id] ?? [];
      return ids.map(oid => og.options?.find(o => o.id === oid)?.name ?? '').filter(Boolean);
    });

    const fingerprint = chosenIds.slice().sort().join(',');
    const cartKey = fingerprint ? `${product.id}:${fingerprint}` : product.id;

    const selectedOptions = Object.entries(sels)
      .filter(([, ids]) => ids.length > 0)
      .map(([ogId, ids]) => ({ optionGroupId: ogId, optionIds: ids }));

    setCart(c => {
      const ex = c.find(x => x.cartKey === cartKey);
      if (ex) return c.map(x => x.cartKey === cartKey ? { ...x, qty: x.qty + 1 } : x);
      return [...c, {
        cartKey,
        id: product.id,
        name: product[lang === 'ro' ? 'ro' : 'en'],
        price: product.price + extraPrice,
        qty: 1,
        mods,
        selectedOptions,
      }];
    });
  };

  const handleProductClick = (it) => {
    if (!it.inStock) return;
    if (!it.optionGroups?.length) {
      addToCart(it, {});
      return;
    }
    setSelections({});
    setOptionModal({ product: it });
  };

  const toggleOption = (og, optId) => {
    setSelections(s => {
      const current = s[og.id] ?? [];
      if (og.type === 'single') {
        return { ...s, [og.id]: current.includes(optId) ? [] : [optId] };
      }
      const max = og.maxSelections ?? Infinity;
      if (current.includes(optId)) {
        return { ...s, [og.id]: current.filter(id => id !== optId) };
      }
      if (current.length >= max) return s;
      return { ...s, [og.id]: [...current, optId] };
    });
  };

  const modalValid = optionModal
    ? (optionModal.product.optionGroups ?? []).every(
        og => (selections[og.id]?.length ?? 0) >= og.minSelections
      )
    : true;

  const closeModal = () => { setOptionModal(null); setSelections({}); };

  const confirmModal = () => {
    addToCart(optionModal.product, selections);
    closeModal();
  };

  const setQty = (cartKey, qty) => setCart(c =>
    qty <= 0 ? c.filter(x => x.cartKey !== cartKey) : c.map(x => x.cartKey === cartKey ? { ...x, qty } : x)
  );

  const subtotal = cart.reduce((a, x) => a + x.qty * x.price, 0);
  const tax = +(subtotal * 0.19).toFixed(2);
  const selectedArea = deliveryAreas.find(a => a.id === deliveryAreaId) ?? null;
  const fee = type === 'delivery' ? (selectedArea?.fee ?? 0) : 0;

  const discountAmount = useMemo(() => {
    const v = parseFloat(discountValue);
    if (!v || v <= 0) return 0;
    if (discountMode === 'pct') return +(subtotal * v / 100).toFixed(2);
    return Math.min(v, subtotal);
  }, [discountValue, discountMode, subtotal]);

  const total = +(subtotal + fee - discountAmount).toFixed(2);

  const effectiveCat = cat || (cats[0]?.id ?? '');
  const effectiveVisible = (cats.find(c => c.id === effectiveCat)?.items ?? []);

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

  const handleCreate = (estimatedMinutes) => {
    const discountVal = parseFloat(discountValue);
    const hasDiscount = discountVal > 0;
    const sdkDiscountAmount = hasDiscount
      ? (discountMode === 'pct' ? Math.round(discountVal) : Math.round(discountVal * 100))
      : undefined;
    const sdkDiscountType = hasDiscount ? (discountMode === 'pct' ? 'percent' : 'fixed') : undefined;

    const body = {
      orderType: orderTypeMap[type],
      items: cart.map(it => ({
        productId: it.id,
        quantity: it.qty,
        ...(it.selectedOptions?.length ? { selectedOptions: it.selectedOptions } : {}),
      })),
      ...(customer.name  ? { customerName: customer.name }  : {}),
      ...(customer.phone ? { customerPhone: customer.phone } : {}),
      ...((() => {
          const tableNote = type === 'dinein' && table ? `Table: ${table}` : '';
          const combined = [tableNote, note].filter(Boolean).join('\n');
          return combined ? { notes: combined } : {};
        })()),
      paymentType: payment === 'online' ? undefined : payment,
      ...(estimatedMinutes ? { estimatedMinutes } : {}),
      ...(hasDiscount ? { discountAmount: sdkDiscountAmount, discountType: sdkDiscountType } : {}),
      ...(type === 'delivery' ? { deliveryAreaId } : {}),
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

  // Extra price from current selections (for modal price preview)
  const modalExtraPrice = optionModal
    ? (optionModal.product.optionGroups ?? []).flatMap(og => og.options ?? [])
        .filter(o => Object.values(selections).flat().includes(o.id))
        .reduce((s, o) => s + o.priceDelta, 0)
    : 0;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', height: '100%', position: 'relative' }}>
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
            const totalInCart = cart.filter(c => c.id === it.id).reduce((s, c) => s + c.qty, 0);
            const inCartAny = totalInCart > 0;
            return (
              <button key={it.id}
                onClick={it.inStock ? () => handleProductClick(it) : undefined}
                className="card"
                style={{
                  textAlign: 'left', padding: 14, cursor: it.inStock ? 'pointer' : 'default',
                  border: inCartAny ? '1.5px solid var(--sc-primary)' : '1px solid hsl(120 10% 90%)',
                  background: '#fff', display: 'flex', flexDirection: 'column', gap: 6,
                  position: 'relative', fontFamily: 'inherit',
                  opacity: it.inStock ? 1 : 0.45,
                }}>
                {inCartAny && <div style={{ position: 'absolute', top: 8, right: 8, width: 22, height: 22, background: 'var(--sc-primary)', color: '#fff', borderRadius: 999, fontWeight: 900, fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{totalInCart}</div>}
                <div style={{ height: 72, borderRadius: 10, background: `linear-gradient(135deg, ${['#f3ecd9', '#fbf6ea', '#ede9de', '#f7efe0'][idx % 4]} 0%, #fff 100%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--sc-primary)' }}>
                  <Icon name={cats.find(c => c.id === effectiveCat)?.icon ?? 'utensils'} size={28} stroke={1.25} />
                </div>
                <div style={{ fontWeight: 700, fontSize: 14, letterSpacing: '-0.01em' }}>{it[lang === 'ro' ? 'ro' : 'en']}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontWeight: 900, fontSize: 15, color: 'var(--sc-primary)' }}>{formatRON(it.price)}</span>
                  {it.optionGroups?.some(og => og.minSelections > 0) && (
                    <span style={{ fontSize: 10, fontWeight: 700, color: 'hsl(0 53% 42%)', background: 'hsl(0 53% 58% / 0.1)', padding: '1px 6px', borderRadius: 999 }}>
                      {lang === 'ro' ? 'opțiuni' : 'options'}
                    </span>
                  )}
                </div>
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
            <div key={it.cartKey} style={{ background: '#fff', padding: 10, borderRadius: 10, display: 'flex', alignItems: 'flex-start', gap: 10, border: '1px solid hsl(120 10% 90%)' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 13 }}>{it.name}</div>
                {it.mods?.length > 0 && (
                  <div style={{ fontSize: 11, color: 'var(--sc-muted-foreground)', marginTop: 2 }}>
                    {it.mods.join(', ')}
                  </div>
                )}
                <div style={{ fontSize: 11, color: 'var(--sc-muted-foreground)', marginTop: 2 }}>{formatRON(it.price)} × {it.qty}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                <button onClick={() => setQty(it.cartKey, it.qty - 1)} style={{ width: 24, height: 24, borderRadius: 6, border: '1px solid hsl(120 10% 88%)', background: '#fff', cursor: 'pointer', fontWeight: 700 }}>−</button>
                <span style={{ minWidth: 18, textAlign: 'center', fontWeight: 700, fontSize: 13 }}>{it.qty}</span>
                <button onClick={() => setQty(it.cartKey, it.qty + 1)} style={{ width: 24, height: 24, borderRadius: 6, border: '1px solid hsl(120 10% 88%)', background: '#fff', cursor: 'pointer', fontWeight: 700 }}>+</button>
              </div>
              <div style={{ fontWeight: 800, fontSize: 13, minWidth: 68, textAlign: 'right', marginTop: 2 }}>{formatRON(it.price * it.qty)}</div>
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

          {/* Discount field */}
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
            className="btn-primary"
            style={{ width: '100%', marginTop: 12, height: 46, fontSize: 14, justifyContent: 'center' }}
            disabled={isOffline || cart.length === 0 || createOrder.isPending || (type === 'delivery' && !deliveryAreaId)}
            onClick={() => setPrepDialog(true)}
          >
            <Icon name="check" size={16} /> {t('ring_up')} — {formatRON(total)}
          </button>
        </div>
      </div>

      {/* Prep time dialog — shown on Ring Up */}
      {prepDialog && (
        <PrepTimeDialog
          lang={lang}
          orderType={type}
          total={total}
          onCancel={() => setPrepDialog(false)}
          onConfirm={(prepMin) => { setPrepDialog(false); handleCreate(prepMin); }}
        />
      )}

      {/* Product options modal */}
      {optionModal && (
        <div style={{
          position: 'absolute', inset: 0,
          background: 'rgba(18, 24, 18, 0.45)',
          backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 200,
        }}>
          <div style={{
            width: 480, maxHeight: '85%', background: '#fff', borderRadius: 20,
            boxShadow: '0 30px 80px rgba(0,0,0,0.35)',
            overflow: 'hidden', border: '1px solid hsl(120 10% 88%)',
            display: 'flex', flexDirection: 'column',
          }}>
            {/* Header */}
            <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid hsl(120 10% 92%)' }}>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--sc-muted-foreground)', marginBottom: 4 }}>
                {lang === 'ro' ? 'configurează produsul' : 'configure product'}
              </div>
              <div style={{ fontWeight: 900, fontSize: 22, letterSpacing: '-0.02em' }}>
                {optionModal.product[lang === 'ro' ? 'ro' : 'en']}
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 4 }}>
                <span style={{ fontWeight: 900, fontSize: 16, color: 'var(--sc-primary)' }}>{formatRON(optionModal.product.price)}</span>
                {modalExtraPrice > 0 && (
                  <span style={{ fontSize: 13, color: 'var(--sc-muted-foreground)', fontWeight: 600 }}>
                    + {formatRON(modalExtraPrice)} {lang === 'ro' ? 'opțiuni' : 'options'}
                  </span>
                )}
              </div>
            </div>

            {/* Option groups */}
            <div style={{ flex: 1, overflow: 'auto', padding: '0 24px' }}>
              {(optionModal.product.optionGroups ?? []).map((og, idx) => (
                <div key={og.id} style={{
                  paddingTop: 16, paddingBottom: 16,
                  borderBottom: idx < optionModal.product.optionGroups.length - 1 ? '1px solid hsl(120 10% 92%)' : 'none',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontWeight: 700, fontSize: 14 }}>{og.name}</span>
                      {og.minSelections > 0 && (
                        <span style={{
                          fontSize: 10, fontWeight: 700,
                          background: 'hsl(0 53% 58% / 0.1)', color: 'hsl(0 53% 42%)',
                          padding: '2px 8px', borderRadius: 999,
                        }}>
                          {lang === 'ro' ? 'obligatoriu' : 'required'}
                        </span>
                      )}
                    </div>
                    {og.type === 'multi' && og.maxSelections != null && (
                      <span style={{ fontSize: 11, color: 'var(--sc-muted-foreground)' }}>
                        {lang === 'ro' ? `max ${og.maxSelections}` : `max ${og.maxSelections}`}
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {og.options.map(opt => {
                      const chosen = (selections[og.id] ?? []).includes(opt.id);
                      const maxReached = og.type === 'multi' && og.maxSelections != null
                        && !chosen && (selections[og.id]?.length ?? 0) >= og.maxSelections;
                      return (
                        <button
                          key={opt.id}
                          disabled={maxReached}
                          onClick={() => toggleOption(og, opt.id)}
                          style={{
                            padding: '10px 14px', borderRadius: 10,
                            cursor: maxReached ? 'default' : 'pointer',
                            fontFamily: 'inherit', fontSize: 13, textAlign: 'left',
                            border: chosen
                              ? '1.5px solid var(--sc-primary)'
                              : '1px solid hsl(120 10% 88%)',
                            background: chosen
                              ? 'hsl(120 14% 49% / 0.08)'
                              : maxReached ? '#f8f8f8' : '#fff',
                            color: maxReached ? '#aaa' : chosen ? 'var(--sc-primary)' : '#333',
                            fontWeight: chosen ? 700 : 500,
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            transition: 'all 140ms',
                          }}
                        >
                          <span>{opt.name}</span>
                          {opt.priceDelta > 0 && (
                            <span style={{ fontSize: 12, fontWeight: 600, color: chosen ? 'var(--sc-primary)' : 'var(--sc-muted-foreground)' }}>
                              +{formatRON(opt.priceDelta)}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div style={{
              padding: '14px 24px', borderTop: '1px solid hsl(120 10% 92%)',
              display: 'flex', gap: 10, background: '#fafaf6',
            }}>
              <button className="btn-secondary" onClick={closeModal}>
                {lang === 'ro' ? 'Anulează' : 'Cancel'}
              </button>
              <button
                className="btn-primary"
                style={{
                  flex: 1, justifyContent: 'center', height: 42,
                  opacity: modalValid ? 1 : 0.45,
                  pointerEvents: modalValid ? 'auto' : 'none',
                  display: 'flex', alignItems: 'center', gap: 6,
                }}
                disabled={!modalValid}
                onClick={confirmModal}
              >
                <Icon name="plus" size={14} />
                {lang === 'ro' ? 'Adaugă în coș' : 'Add to cart'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PrepTimeDialog({ lang, orderType, total, onCancel, onConfirm }) {
  const t = useT(lang);
  const presets = orderType === 'delivery'
    ? [20, 30, 45, 60, 75]
    : orderType === 'pickup'
    ? [10, 15, 20, 30, 45]
    : [10, 15, 20, 25, 30];
  const [picked, setPicked] = useState(presets[1]);
  const [custom, setCustom] = useState('');
  const [useCustom, setUseCustom] = useState(false);

  const prep = useCustom && Number(custom) > 0 ? Number(custom) : picked;
  const promised = new Date(Date.now() + prep * 60 * 1000);
  const typ = typeMeta(orderType, t);

  return (
    <div style={{ position: 'absolute', inset: 0, background: 'rgba(18, 24, 18, 0.45)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300, animation: 'fadeIn 180ms ease-out' }}>
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
              <div style={{ fontWeight: 900, fontSize: 16, letterSpacing: '-0.02em' }}>{typ.label}</div>
              <div style={{ fontSize: 12, color: 'var(--sc-muted-foreground)' }}>{formatRON(total)}</div>
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
              <span style={{ color: 'var(--sc-muted-foreground)' }}>{lang === 'ro' ? 'Gata aproximativ la' : 'Ready by approximately'}</span>
              <span style={{ fontWeight: 900, marginLeft: 6, letterSpacing: '-0.01em' }}>
                {promised.toLocaleTimeString(lang === 'ro' ? 'ro-RO' : 'en-GB', { hour: '2-digit', minute: '2-digit' })}
              </span>
              <span style={{ color: 'var(--sc-muted-foreground)', marginLeft: 6 }}>· {prep} {t('min')}</span>
            </div>
          </div>
        </div>

        <div style={{ padding: '14px 24px', borderTop: '1px solid hsl(120 10% 92%)', display: 'flex', gap: 10, background: '#fafaf6' }}>
          <button className="btn-secondary" onClick={onCancel} style={{ flex: '0 0 auto' }}>{t('cancel')}</button>
          <button className="btn-primary" onClick={() => onConfirm(prep)} disabled={!prep || prep <= 0}
            style={{ flex: 1, justifyContent: 'center', height: 42 }}>
            <Icon name="check" size={14} /> {t('ring_up')} · {prep} {t('min')}
          </button>
        </div>
      </div>
    </div>
  );
}

export { PosScreen };
