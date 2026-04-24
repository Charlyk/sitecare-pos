import { useState } from 'react';
import { Icon } from './icons.jsx';
import { useT } from './i18n.jsx';
import { useAppStore } from './store.js';
import { USERS } from './data.jsx';

const ACCENT_SWATCHES = [
  { id: 'sage',       color: 'hsl(120 14% 49%)' },
  { id: 'indigo',     color: 'hsl(230 50% 55%)' },
  { id: 'terracotta', color: 'hsl(0 53% 52%)' },
  { id: 'charcoal',   color: 'hsl(120 8% 25%)' },
];

function SettingsScreen({ lang }) {
  const t = useT(lang);
  const users = USERS;
  const [tab, setTab] = useState('users');

  const storeLang    = useAppStore((s) => s.lang);
  const setLang      = useAppStore((s) => s.setLang);
  const density      = useAppStore((s) => s.density);
  const setDensity   = useAppStore((s) => s.setDensity);
  const accent       = useAppStore((s) => s.accent);
  const setAccent    = useAppStore((s) => s.setAccent);

  const tabs = [
    { id: 'users', label: t('users'), icon: 'users' },
    { id: 'tax', label: lang === 'ro' ? 'Taxe & TVA' : 'Tax & VAT', icon: 'percent' },
    { id: 'store', label: lang === 'ro' ? 'Restaurant' : 'Restaurant', icon: 'storefront' },
    { id: 'integrations', label: lang === 'ro' ? 'Integrări' : 'Integrations', icon: 'wifi' },
    { id: 'display', label: t('display_tab'), icon: 'grid' },
  ];

  return (
    <div className="content-pad">
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16, marginBottom: 16, borderBottom: '1px solid hsl(120 10% 90%)' }}>
        {tabs.map(tb => (
          <button key={tb.id} onClick={() => setTab(tb.id)} style={{ padding: '10px 2px 12px', border: 0, background: 'transparent', color: tab === tb.id ? 'var(--sc-primary)' : '#555', fontWeight: 700, fontSize: 14, cursor: 'pointer', borderBottom: tab === tb.id ? '2px solid var(--sc-primary)' : '2px solid transparent', display: 'flex', gap: 7, alignItems: 'center', fontFamily: 'inherit', marginBottom: -1 }}>
            <Icon name={tb.icon} size={15} /> {tb.label}
          </button>
        ))}
      </div>

      {tab === 'users' && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 14 }}>
            <div>
              <div className="eyebrow">who's on shift</div>
              <div style={{ fontWeight: 900, fontSize: 22, letterSpacing: '-0.02em' }}>{users.length} {lang === 'ro' ? 'utilizatori' : 'users'}</div>
            </div>
            <button className="btn-primary" style={{ marginLeft: 'auto' }}><Icon name="plus" size={14} />{lang === 'ro' ? 'Invită utilizator' : 'Invite user'}</button>
          </div>
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            {users.map((u, i) => (
              <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px', borderBottom: i < users.length - 1 ? '1px solid hsl(120 10% 94%)' : 'none' }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: i % 2 ? 'var(--sc-terracotta)' : 'var(--sc-primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14 }}>{u.initials}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{u.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--sc-muted-foreground)' }}>{u.email}</div>
                </div>
                <span className="chip chip-slate">{u.role}</span>
                <span className="chip chip-sage chip-dot">{lang === 'ro' ? 'activ' : 'active'}</span>
                <button className="icon-btn" style={{ width: 32, height: 32 }}><Icon name="more" size={14} /></button>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'tax' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, maxWidth: 800 }}>
          <div className="card" style={{ padding: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--sc-muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>{lang === 'ro' ? 'TVA standard' : 'Standard VAT'}</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}><div style={{ fontWeight: 900, fontSize: 40, letterSpacing: '-0.02em', color: 'var(--sc-primary)' }}>19</div><div style={{ fontSize: 18, color: 'var(--sc-muted-foreground)', fontWeight: 700 }}>%</div></div>
            <div style={{ fontSize: 12, color: 'var(--sc-muted-foreground)', marginTop: 6 }}>{lang === 'ro' ? 'Aplicabil la produse alimentare servite' : 'Applied to prepared food sales'}</div>
          </div>
          <div className="card" style={{ padding: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--sc-muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>CUI</div>
            <div style={{ fontWeight: 900, fontSize: 20, fontFamily: '"SF Mono", monospace' }}>RO38291445</div>
            <div style={{ fontSize: 12, color: 'var(--sc-muted-foreground)', marginTop: 6 }}>{lang === 'ro' ? 'Apare pe fiecare bon fiscal' : 'Printed on every fiscal receipt'}</div>
          </div>
          <div className="card" style={{ padding: 20, gridColumn: 'span 2' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--sc-muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>{lang === 'ro' ? 'Casa de marcat fiscală' : 'Fiscal cash register'}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: 10, background: 'hsl(120 14% 49% / 0.1)', color: 'var(--sc-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="shield" size={18} /></div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700 }}>Datecs DP-25 · ANAF conform</div>
                <div style={{ fontSize: 12, color: 'var(--sc-muted-foreground)' }}>Serial FX0212945 · {lang === 'ro' ? 'Conectată' : 'Connected'}</div>
              </div>
              <span className="chip chip-sage chip-dot">{lang === 'ro' ? 'activă' : 'online'}</span>
            </div>
          </div>
        </div>
      )}

      {tab === 'store' && (
        <div className="card" style={{ padding: 24, maxWidth: 700 }}>
          <div style={{ fontWeight: 900, fontSize: 18, letterSpacing: '-0.02em', marginBottom: 16 }}>Bistro Republicii</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--sc-muted-foreground)' }}>{lang === 'ro' ? 'Adresă' : 'Address'}</div>
              <div style={{ fontWeight: 600, fontSize: 13 }}>Str. Republicii 14, Brașov</div>
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--sc-muted-foreground)' }}>{lang === 'ro' ? 'Telefon' : 'Phone'}</div>
              <div style={{ fontWeight: 600, fontSize: 13 }}>+40 268 555 1200</div>
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--sc-muted-foreground)' }}>{lang === 'ro' ? 'Program' : 'Hours'}</div>
              <div style={{ fontWeight: 600, fontSize: 13 }}>Lun–Dum · 10:00–23:00</div>
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--sc-muted-foreground)' }}>{lang === 'ro' ? 'Capacitate' : 'Capacity'}</div>
              <div style={{ fontWeight: 600, fontSize: 13 }}>42 {lang === 'ro' ? 'locuri · 12 mese' : 'seats · 12 tables'}</div>
            </div>
          </div>
        </div>
      )}

      {tab === 'display' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 560 }}>

          {/* Language section */}
          <div className="card" style={{ padding: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--sc-muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
              {t('display_lang_label')}
            </div>
            <div style={{ display: 'inline-flex', background: '#fff', border: '1px solid hsl(120 10% 90%)', borderRadius: 10, padding: 3 }}>
              {[
                { id: 'ro', label: 'Română' },
                { id: 'en', label: 'English' },
              ].map(l => (
                <button key={l.id} onClick={() => setLang(l.id)}
                  style={{
                    border: 0, background: storeLang === l.id ? 'var(--sc-primary)' : 'transparent',
                    color: storeLang === l.id ? '#fff' : '#555',
                    padding: '7px 20px', borderRadius: 8,
                    fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
                  }}>
                  {l.label}
                </button>
              ))}
            </div>
          </div>

          {/* Density section */}
          <div className="card" style={{ padding: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--sc-muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
              {t('display_density_label')}
            </div>
            <div style={{ display: 'inline-flex', background: '#fff', border: '1px solid hsl(120 10% 90%)', borderRadius: 10, padding: 3 }}>
              {[
                { id: 'balanced', labelRo: 'Echilibrat', labelEn: 'Balanced' },
                { id: 'dense',    labelRo: 'Compact',    labelEn: 'Dense' },
              ].map(d => (
                <button key={d.id} onClick={() => setDensity(d.id)}
                  style={{
                    border: 0, background: density === d.id ? 'var(--sc-primary)' : 'transparent',
                    color: density === d.id ? '#fff' : '#555',
                    padding: '7px 20px', borderRadius: 8,
                    fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
                  }}>
                  {storeLang === 'ro' ? d.labelRo : d.labelEn}
                </button>
              ))}
            </div>
          </div>

          {/* Accent color section */}
          <div className="card" style={{ padding: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--sc-muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
              {t('display_accent_label')}
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              {ACCENT_SWATCHES.map(a => (
                <button
                  key={a.id}
                  onClick={() => setAccent(a.id)}
                  title={a.id}
                  style={{
                    width: 40, height: 40, borderRadius: '50%',
                    background: a.color,
                    border: 'none',
                    boxShadow: accent === a.id ? `0 0 0 2px #fff, 0 0 0 4px ${a.color}` : 'none',
                    cursor: 'pointer',
                    transform: accent === a.id ? 'scale(1.1)' : 'scale(1)',
                    transition: 'transform 150ms, box-shadow 150ms',
                  }}
                />
              ))}
            </div>
          </div>

        </div>
      )}

      {tab === 'integrations' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, maxWidth: 900 }}>
          {[
            { name: 'Website (SiteCare)', on: true, icon: 'wifi', desc: lang === 'ro' ? 'Comenzi live de pe site' : 'Live orders from your site' },
            { name: 'Glovo', on: false, icon: 'moped', desc: lang === 'ro' ? 'Inactiv — conectează pentru livrări' : 'Off — connect for delivery' },
            { name: 'Tazz', on: false, icon: 'moped', desc: lang === 'ro' ? 'Inactiv' : 'Off' },
            { name: 'Datecs POS', on: true, icon: 'shield', desc: lang === 'ro' ? 'Casă fiscală conectată' : 'Fiscal register linked' },
            { name: 'Stripe', on: true, icon: 'card', desc: lang === 'ro' ? 'Plăți online' : 'Online payments' },
            { name: 'WhatsApp', on: false, icon: 'phone', desc: lang === 'ro' ? 'Notificări client' : 'Customer notifications' },
          ].map(i => (
            <div key={i.name} className="card" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: i.on ? 'hsl(120 14% 49% / 0.1)' : 'hsl(120 10% 94%)', color: i.on ? 'var(--sc-primary)' : '#999', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name={i.icon} size={18} /></div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{i.name}</div>
                <span className={`chip ${i.on ? 'chip-sage' : 'chip-slate'} chip-dot`} style={{ marginLeft: 'auto' }}>{i.on ? 'on' : 'off'}</span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--sc-muted-foreground)' }}>{i.desc}</div>
              <button className="btn-secondary" style={{ marginTop: 'auto' }}>{i.on ? (lang === 'ro' ? 'Configurare' : 'Configure') : (lang === 'ro' ? 'Conectează' : 'Connect')}</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export { SettingsScreen };
