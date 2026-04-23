/* global React, window */
function MenuScreen({ lang }) {
  const Icon = window.Icon;
  const cats = window.MENU_CATEGORIES;
  const allItems = window.MENU_ITEMS;

  // Local availability state — keyed by item id
  const [avail, setAvail] = React.useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('sc_avail') || '{}');
      const init = {};
      allItems.forEach(it => { init[it.id] = saved[it.id] !== undefined ? saved[it.id] : true; });
      // Seed a couple as out-of-stock for realism
      if (saved._seeded == null) {
        init['p4'] = false;
        init['ds2'] = false;
      }
      return init;
    } catch { return Object.fromEntries(allItems.map(it => [it.id, true])); }
  });
  React.useEffect(() => { localStorage.setItem('sc_avail', JSON.stringify({ ...avail, _seeded: 1 })); }, [avail]);

  const [cat, setCat] = React.useState('all');
  const [showOnly, setShowOnly] = React.useState('all'); // all | available | out

  let items = cat === 'all' ? allItems : allItems.filter(i => i.cat === cat);
  if (showOnly === 'available') items = items.filter(i => avail[i.id]);
  if (showOnly === 'out') items = items.filter(i => !avail[i.id]);

  const outCount = allItems.filter(i => !avail[i.id]).length;
  const availCount = allItems.length - outCount;

  const toggleAll = (on) => {
    const scope = cat === 'all' ? allItems : allItems.filter(i => i.cat === cat);
    const next = { ...avail };
    scope.forEach(i => { next[i.id] = on; });
    setAvail(next);
  };

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

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <button className="btn-secondary" onClick={() => toggleAll(true)}>
            <Icon name="check2" size={14} /> {lang === 'ro' ? 'Toate disponibile' : 'All available'}
          </button>
          <button className="btn-secondary" onClick={() => toggleAll(false)}>
            <Icon name="x" size={14} /> {lang === 'ro' ? 'Toate epuizate' : 'All out'}
          </button>
        </div>
      </div>

      {/* Layout: category rail + list */}
      <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 16 }}>
        <div className="card" style={{ padding: 10, height: 'fit-content' }}>
          <button onClick={() => setCat('all')} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '9px 10px', borderRadius: 8, border: 0, background: cat === 'all' ? 'hsl(120 14% 49% / 0.1)' : 'transparent', color: cat === 'all' ? 'var(--sc-primary)' : '#444', fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
            <Icon name="grid" size={15} /><span style={{ flex: 1, textAlign: 'left' }}>{lang === 'ro' ? 'Toate' : 'All'}</span><span style={{ fontSize: 11, color: 'var(--sc-muted-foreground)', fontWeight: 700 }}>{allItems.length}</span>
          </button>
          {cats.map(c => {
            const catItems = allItems.filter(i => i.cat === c.id);
            const catOut = catItems.filter(i => !avail[i.id]).length;
            return (
              <button key={c.id} onClick={() => setCat(c.id)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '9px 10px', borderRadius: 8, border: 0, background: cat === c.id ? 'hsl(120 14% 49% / 0.1)' : 'transparent', color: cat === c.id ? 'var(--sc-primary)' : '#444', fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
                <Icon name={c.icon} size={15} />
                <span style={{ flex: 1, textAlign: 'left' }}>{c[lang]}</span>
                {catOut > 0 && <span style={{ fontSize: 10, background: 'hsl(0 53% 58% / 0.14)', color: 'hsl(0 53% 42%)', padding: '1px 6px', borderRadius: 999, fontWeight: 700 }}>{catOut}</span>}
                <span style={{ fontSize: 11, color: 'var(--sc-muted-foreground)', fontWeight: 700 }}>{catItems.length}</span>
              </button>
            );
          })}
        </div>

        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '52px 1.6fr 2fr 110px 90px 70px', padding: '12px 18px', borderBottom: '1px solid hsl(120 10% 92%)', fontSize: 10, fontWeight: 700, color: 'var(--sc-muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            <div></div>
            <div>{lang === 'ro' ? 'Produs' : 'Item'}</div>
            <div>{lang === 'ro' ? 'Descriere' : 'Description'}</div>
            <div>{lang === 'ro' ? 'Categorie' : 'Category'}</div>
            <div style={{ textAlign: 'right' }}>{lang === 'ro' ? 'Preț' : 'Price'}</div>
            <div style={{ textAlign: 'right' }}>{lang === 'ro' ? 'Stoc' : 'Stock'}</div>
          </div>
          {items.map((it) => {
            const c = cats.find(c => c.id === it.cat);
            const on = avail[it.id];
            return (
              <div key={it.id} style={{ display: 'grid', gridTemplateColumns: '52px 1.6fr 2fr 110px 90px 70px', padding: '12px 18px', alignItems: 'center', borderBottom: '1px solid hsl(120 10% 94%)', fontSize: 13, opacity: on ? 1 : 0.58, transition: 'opacity 150ms' }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: on ? 'hsl(120 14% 49% / 0.1)' : 'hsl(0 53% 58% / 0.08)', color: on ? 'var(--sc-primary)' : 'hsl(0 53% 48%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name={c?.icon} size={16} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, textDecoration: on ? 'none' : 'line-through', textDecorationColor: 'hsl(0 53% 58% / 0.5)' }}>{it[lang]}</div>
                  <div style={{ fontSize: 11, color: 'var(--sc-muted-foreground)' }}>{lang === 'ro' ? 'EN' : 'RO'}: {it[lang === 'ro' ? 'en' : 'ro']}</div>
                </div>
                <div style={{ color: 'var(--sc-muted-foreground)', opacity: on ? 1 : 0.7 }}>{it.desc}</div>
                <div><span className="chip chip-slate">{c?.[lang]}</span></div>
                <div style={{ textAlign: 'right', fontWeight: 700 }}>{window.formatRON(it.price)}</div>
                <div style={{ textAlign: 'right' }}>
                  <AvailSwitch on={on} onChange={v => setAvail({ ...avail, [it.id]: v })} lang={lang} />
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
  const Icon = window.Icon;
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

window.MenuScreen = MenuScreen;
