/* global React, window */
const { useState: useStateP, useMemo } = React;

function PosScreen({ lang, onCreate }) {
  const t = window.useT(lang);
  const Icon = window.Icon;
  const cats = window.MENU_CATEGORIES;
  const items = window.MENU_ITEMS;

  const [cat, setCat] = useStateP(cats[0].id);
  const [cart, setCart] = useStateP([]);
  const [type, setType] = useStateP('dinein');
  const [table, setTable] = useStateP('7');
  const [customer, setCustomer] = useStateP({ name: '', phone: '', address: '' });
  const [payment, setPayment] = useStateP('card');
  const [note, setNote] = useStateP('');

  const add = (it) => {
    setCart(c => {
      const ex = c.find(x => x.id === it.id);
      if (ex) return c.map(x => x.id === it.id ? { ...x, qty: x.qty + 1 } : x);
      return [...c, { id: it.id, name: it[lang], price: it.price, qty: 1, mods: [] }];
    });
  };
  const setQty = (id, qty) => setCart(c => qty <= 0 ? c.filter(x => x.id !== id) : c.map(x => x.id === id ? { ...x, qty } : x));

  const subtotal = cart.reduce((a, x) => a + x.qty * x.price, 0);
  const tax = +(subtotal * 0.19).toFixed(2);
  const fee = type === 'delivery' ? 10 : 0;
  const total = +(subtotal + fee).toFixed(2);

  const visible = items.filter(i => i.cat === cat);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', height: '100%' }}>
      {/* Menu */}
      <div style={{ overflow: 'auto', padding: 24, borderRight: '1px solid hsl(120 10% 90%)' }}>
        {/* Categories */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
          {cats.map(c => (
            <button key={c.id} onClick={() => setCat(c.id)}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', borderRadius: 12, border: cat === c.id ? '1.5px solid var(--sc-primary)' : '1px solid hsl(120 10% 90%)', background: cat === c.id ? 'hsl(120 14% 49% / 0.08)' : '#fff', color: cat === c.id ? 'var(--sc-primary)' : '#444', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
              <Icon name={c.icon} size={14} /> {c[lang]}
            </button>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {visible.map(it => {
            const inCart = cart.find(c => c.id === it.id);
            return (
              <button key={it.id} onClick={() => add(it)}
                className="card" style={{ textAlign: 'left', padding: 14, cursor: 'pointer', border: inCart ? '1.5px solid var(--sc-primary)' : '1px solid hsl(120 10% 90%)', background: '#fff', display: 'flex', flexDirection: 'column', gap: 6, position: 'relative', fontFamily: 'inherit' }}>
                {inCart && <div style={{ position: 'absolute', top: 8, right: 8, width: 22, height: 22, background: 'var(--sc-primary)', color: '#fff', borderRadius: 999, fontWeight: 900, fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{inCart.qty}</div>}
                <div style={{ height: 72, borderRadius: 10, background: `linear-gradient(135deg, ${['#f3ecd9', '#fbf6ea', '#ede9de', '#f7efe0'][items.indexOf(it) % 4]} 0%, #fff 100%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--sc-primary)' }}>
                  <Icon name={cats.find(c => c.id === it.cat)?.icon} size={28} stroke={1.25} />
                </div>
                <div style={{ fontWeight: 700, fontSize: 14, letterSpacing: '-0.01em' }}>{it[lang]}</div>
                <div style={{ fontSize: 11, color: 'var(--sc-muted-foreground)', lineHeight: 1.3 }}>{it.desc}</div>
                <div style={{ fontWeight: 900, fontSize: 15, color: 'var(--sc-primary)', marginTop: 2 }}>{window.formatRON(it.price)}</div>
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
              const tm = window.typeMeta(typeK, t);
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
              {type === 'delivery' && <input placeholder={t('address')} value={customer.address} onChange={e => setCustomer({...customer, address: e.target.value})} style={{ padding: '8px 10px', border: '1px solid hsl(120 10% 88%)', borderRadius: 8, fontFamily: 'inherit', fontSize: 13 }} />}
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
                <div style={{ fontSize: 11, color: 'var(--sc-muted-foreground)' }}>{window.formatRON(it.price)} × {it.qty}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <button onClick={() => setQty(it.id, it.qty - 1)} style={{ width: 24, height: 24, borderRadius: 6, border: '1px solid hsl(120 10% 88%)', background: '#fff', cursor: 'pointer', fontWeight: 700 }}>−</button>
                <span style={{ minWidth: 18, textAlign: 'center', fontWeight: 700, fontSize: 13 }}>{it.qty}</span>
                <button onClick={() => setQty(it.id, it.qty + 1)} style={{ width: 24, height: 24, borderRadius: 6, border: '1px solid hsl(120 10% 88%)', background: '#fff', cursor: 'pointer', fontWeight: 700 }}>+</button>
              </div>
              <div style={{ fontWeight: 800, fontSize: 13, minWidth: 68, textAlign: 'right' }}>{window.formatRON(it.price * it.qty)}</div>
            </div>
          ))}
        </div>

        {/* Totals + actions */}
        <div style={{ borderTop: '1px solid hsl(120 10% 88%)', padding: 16, background: '#fff' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
            <span style={{ color: 'var(--sc-muted-foreground)' }}>{t('subtotal')}</span>
            <span style={{ fontWeight: 600 }}>{window.formatRON(subtotal)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
            <span style={{ color: 'var(--sc-muted-foreground)' }}>{t('tax')} 19%</span>
            <span style={{ fontWeight: 600 }}>{window.formatRON(tax)}</span>
          </div>
          {fee > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
              <span style={{ color: 'var(--sc-muted-foreground)' }}>{t('delivery_fee')}</span>
              <span style={{ fontWeight: 600 }}>{window.formatRON(fee)}</span>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', paddingTop: 8, borderTop: '1px dashed hsl(120 10% 88%)', marginTop: 8 }}>
            <span style={{ fontWeight: 900, fontSize: 15 }}>{t('total')}</span>
            <span style={{ fontWeight: 900, fontSize: 24, letterSpacing: '-0.02em', color: 'var(--sc-primary)' }}>{window.formatRON(total)}</span>
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

          <button className="btn-primary" style={{ width: '100%', marginTop: 12, height: 46, fontSize: 14, justifyContent: 'center' }} disabled={cart.length === 0} onClick={() => onCreate({ cart, type, table, customer, payment, note, subtotal, tax, fee, total })}>
            <Icon name="check" size={16} /> {t('ring_up')} — {window.formatRON(total)}
          </button>
        </div>
      </div>
    </div>
  );
}

window.PosScreen = PosScreen;
