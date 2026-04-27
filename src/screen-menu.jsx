import { useState, useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Icon } from './icons.jsx';
import { useT } from './i18n.jsx';
import { formatRON } from './data.jsx';
import { useMenu } from './use-menu.js';
import { useAuth } from './auth.jsx';
import { useAppStore } from './store.js';

function MenuScreen({ lang, isOffline }) {
  const t = useT(lang);
  const { client } = useAuth();
  const queryClient = useQueryClient();
  const pushToast = useAppStore((s) => s.pushToast);
  const { data: menuData, isLoading } = useMenu();

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

  const allItems = useMemo(() => cats.flatMap(c => c.items), [cats]);

  const [cat, setCat] = useState('all');
  const [showOnly, setShowOnly] = useState('all'); // all | available | out

  const toggleStock = useMutation({
    mutationFn: ({ productId, inStock }) =>
      client.kitchen.products.updateStock({ body: { productId, inStock } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['menu'] }),
    onError: () => pushToast({
      id: Date.now(),
      kind: 'error',
      title: lang === 'ro' ? 'Eroare la actualizare stoc' : 'Stock update failed',
      detail: '',
    }),
  });

  let items = cat === 'all' ? allItems : allItems.filter(i => {
    const catObj = cats.find(c => c.id === cat);
    return catObj?.items.some(ci => ci.id === i.id);
  });
  if (showOnly === 'available') items = items.filter(i => i.inStock);
  if (showOnly === 'out') items = items.filter(i => !i.inStock);

  const outCount = allItems.filter(i => !i.inStock).length;
  const availCount = allItems.length - outCount;

  if (isLoading) return (
    <div style={{ padding: 48, color: 'var(--sc-muted-foreground)', fontSize: 14 }}>
      {lang === 'ro' ? 'Se încarcă meniul…' : 'Loading menu…'}
    </div>
  );

  return (
    <div className="content-pad">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 16 }}>
        <div>
          <div className="eyebrow">stock control</div>
          <div style={{ fontWeight: 900, fontSize: 24, letterSpacing: '-0.02em' }}>
            {lang === 'ro' ? 'Disponibilitate produse' : 'Item availability'}
          </div>
          <div style={{ color: 'var(--sc-muted-foreground)', fontSize: 13, marginTop: 4, maxWidth: 620 }}>
            {lang === 'ro'
              ? 'Marchează produsele ca disponibile sau epuizate. Pentru a modifica prețuri, descrieri sau fotografii, folosește panoul administrativ web.'
              : 'Toggle items available or out of stock. To edit prices, descriptions, or photos, use the web admin dashboard.'}
          </div>
        </div>
        <a href="#" onClick={e => e.preventDefault()} className="btn-secondary" style={{ marginLeft: 'auto', textDecoration: 'none' }}>
          <Icon name="wifi" size={14} /> {lang === 'ro' ? 'Deschide panoul web' : 'Open web dashboard'} <Icon name="chevRight" size={12} />
        </a>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
        <StatTile icon="grid" tint="slate" label={lang === 'ro' ? 'Total produse' : 'Total items'} value={allItems.length} />
        <StatTile icon="check2" tint="sage" label={lang === 'ro' ? 'Disponibile' : 'Available'} value={availCount} />
        <StatTile icon="alert" tint="terra" label={lang === 'ro' ? 'Epuizate' : 'Out of stock'} value={outCount} />
      </div>

      {/* Filter bar */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 14, flexWrap: 'wrap' }}>
        <div style={{ display: 'inline-flex', background: '#fff', border: '1px solid hsl(120 10% 90%)', borderRadius: 10, padding: 3 }}>
          {[
            { id: 'all', label: lang === 'ro' ? 'Toate' : 'All', n: allItems.length },
            { id: 'available', label: lang === 'ro' ? 'Disponibile' : 'Available', n: availCount },
            { id: 'out', label: lang === 'ro' ? 'Epuizate' : 'Out of stock', n: outCount },
          ].map(f => (
            <button key={f.id} onClick={() => setShowOnly(f.id)}
              style={{ border: 0, background: showOnly === f.id ? 'var(--sc-primary)' : 'transparent', color: showOnly === f.id ? '#fff' : '#555', padding: '7px 14px', borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6 }}>
              {f.label}
              <span style={{ fontSize: 11, background: showOnly === f.id ? 'rgba(255,255,255,0.25)' : 'hsl(120 10% 90%)', padding: '1px 6px', borderRadius: 999, fontWeight: 700 }}>{f.n}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Layout: category rail + list */}
      <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 16 }}>
        <div className="card" style={{ padding: 10, height: 'fit-content' }}>
          <button onClick={() => setCat('all')} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '9px 10px', borderRadius: 8, border: 0, background: cat === 'all' ? 'hsl(120 14% 49% / 0.1)' : 'transparent', color: cat === 'all' ? 'var(--sc-primary)' : '#444', fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
            <Icon name="grid" size={15} /><span style={{ flex: 1, textAlign: 'left' }}>{lang === 'ro' ? 'Toate' : 'All'}</span><span style={{ fontSize: 11, color: 'var(--sc-muted-foreground)', fontWeight: 700 }}>{allItems.length}</span>
          </button>
          {cats.map(c => {
            const catOut = c.items.filter(i => !i.inStock).length;
            return (
              <button key={c.id} onClick={() => setCat(c.id)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '9px 10px', borderRadius: 8, border: 0, background: cat === c.id ? 'hsl(120 14% 49% / 0.1)' : 'transparent', color: cat === c.id ? 'var(--sc-primary)' : '#444', fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
                <Icon name={c.icon} size={15} />
                <span style={{ flex: 1, textAlign: 'left' }}>{lang === 'ro' ? c.ro : c.en}</span>
                {catOut > 0 && <span style={{ fontSize: 10, background: 'hsl(0 53% 58% / 0.14)', color: 'hsl(0 53% 42%)', padding: '1px 6px', borderRadius: 999, fontWeight: 700 }}>{catOut}</span>}
                <span style={{ fontSize: 11, color: 'var(--sc-muted-foreground)', fontWeight: 700 }}>{c.items.length}</span>
              </button>
            );
          })}
        </div>

        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '52px 1.6fr 110px 90px 70px', padding: '12px 18px', borderBottom: '1px solid hsl(120 10% 92%)', fontSize: 10, fontWeight: 700, color: 'var(--sc-muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            <div></div>
            <div>{lang === 'ro' ? 'Produs' : 'Item'}</div>
            <div>{lang === 'ro' ? 'Categorie' : 'Category'}</div>
            <div style={{ textAlign: 'right' }}>{lang === 'ro' ? 'Preț' : 'Price'}</div>
            <div style={{ textAlign: 'right' }}>{lang === 'ro' ? 'Stoc' : 'Stock'}</div>
          </div>
          {items.map((it) => {
            const c = cats.find(c => c.items.some(ci => ci.id === it.id));
            const isPending = toggleStock.isPending && toggleStock.variables?.productId === it.id;
            return (
              <div key={it.id} style={{ display: 'grid', gridTemplateColumns: '52px 1.6fr 110px 90px 70px', padding: '12px 18px', alignItems: 'center', borderBottom: '1px solid hsl(120 10% 94%)', fontSize: 13, opacity: isPending ? 0.6 : (it.inStock ? 1 : 0.58), transition: 'opacity 150ms' }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: it.inStock ? 'hsl(120 14% 49% / 0.1)' : 'hsl(0 53% 58% / 0.08)', color: it.inStock ? 'var(--sc-primary)' : 'hsl(0 53% 48%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name={c?.icon ?? 'utensils'} size={16} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, textDecoration: it.inStock ? 'none' : 'line-through', textDecorationColor: 'hsl(0 53% 58% / 0.5)' }}>{lang === 'ro' ? it.ro : it.en}</div>
                  <div style={{ fontSize: 11, color: 'var(--sc-muted-foreground)' }}>{lang === 'ro' ? 'EN' : 'RO'}: {lang === 'ro' ? it.en : it.ro}</div>
                </div>
                <div><span className="chip chip-slate">{lang === 'ro' ? c?.ro : c?.en}</span></div>
                <div style={{ textAlign: 'right', fontWeight: 700 }}>{formatRON(it.price)}</div>
                <div style={{ textAlign: 'right' }}>
                  <AvailSwitch
                    on={it.inStock}
                    onChange={v => toggleStock.mutate({ productId: it.id, inStock: v })}
                    lang={lang}
                  />
                </div>
              </div>
            );
          })}
          {items.length === 0 && (
            <div style={{ padding: 36, textAlign: 'center', color: 'var(--sc-muted-foreground)' }}>
              {lang === 'ro' ? 'Niciun produs în această categorie.' : 'No items in this category.'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatTile({ icon, tint, label, value }) {
  const tintMap = {
    sage: { bg: 'hsl(120 14% 49% / 0.1)', fg: 'var(--sc-primary)' },
    terra: { bg: 'hsl(0 53% 58% / 0.1)', fg: 'var(--sc-terracotta)' },
    slate: { bg: 'hsl(210 15% 92%)', fg: '#556' },
  };
  const c = tintMap[tint] || tintMap.slate;
  return (
    <div className="card" style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ width: 44, height: 44, borderRadius: 12, background: c.bg, color: c.fg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={icon} size={18} />
      </div>
      <div>
        <div style={{ fontSize: 11, color: 'var(--sc-muted-foreground)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
        <div style={{ fontWeight: 900, fontSize: 22, letterSpacing: '-0.02em' }}>{value}</div>
      </div>
    </div>
  );
}

function AvailSwitch({ on, onChange, lang }) {
  return (
    <button onClick={() => onChange(!on)}
      title={on ? (lang === 'ro' ? 'Disponibil' : 'Available') : (lang === 'ro' ? 'Epuizat' : 'Out of stock')}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 10px 5px 5px', borderRadius: 999, border: 0, background: on ? 'hsl(120 14% 49% / 0.14)' : 'hsl(0 53% 58% / 0.14)', color: on ? 'hsl(120 14% 30%)' : 'hsl(0 53% 42%)', fontWeight: 700, fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}>
      <span style={{ width: 28, height: 16, borderRadius: 999, background: on ? 'var(--sc-primary)' : '#c87c7c', padding: 2, position: 'relative', transition: 'background 200ms' }}>
        <span style={{ position: 'absolute', top: 2, left: on ? 14 : 2, width: 12, height: 12, borderRadius: '50%', background: '#fff', transition: 'left 200ms', boxShadow: '0 1px 2px rgba(0,0,0,0.2)' }} />
      </span>
      {on ? (lang === 'ro' ? 'Pe stoc' : 'In stock') : (lang === 'ro' ? 'Epuizat' : 'Out')}
    </button>
  );
}

export { MenuScreen };
