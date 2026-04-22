/* global React, window */
function PrinterScreen({ lang, onTestPrint }) {
  const t = window.useT(lang);
  const Icon = window.Icon;
  const printers = window.PRINTERS;
  const [selected, setSelected] = React.useState(printers[0].id);
  const [opts, setOpts] = React.useState({ autoPrint: true, copies: 1, buzzer: true, cut: true, width: '80mm', openDrawer: false });

  const p = printers.find(x => x.id === selected);

  return (
    <div className="content-pad">
      <div style={{ marginBottom: 20 }}>
        <div className="eyebrow">thermal printers</div>
        <div style={{ fontWeight: 900, fontSize: 24, letterSpacing: '-0.02em' }}>{t('printers')}</div>
        <div style={{ color: 'var(--sc-muted-foreground)', fontSize: 14, marginTop: 2 }}>{lang === 'ro' ? 'Configurează imprimantele termice pentru bucătărie, bar și casă.' : 'Configure thermal printers for kitchen, bar, and front-of-house.'}</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 380px', gap: 16 }}>
        {/* Printer list */}
        <div className="card" style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 8, height: 'fit-content' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 6px' }}>
            <div style={{ fontWeight: 700, fontSize: 13 }}>{lang === 'ro' ? 'Dispozitive' : 'Devices'}</div>
            <button className="btn-ghost" style={{ fontSize: 11, padding: '4px 8px' }}><Icon name="plus" size={12} />{lang === 'ro' ? 'Adaugă' : 'Add'}</button>
          </div>
          {printers.map(pr => (
            <button key={pr.id} onClick={() => setSelected(pr.id)} style={{ border: 0, background: selected === pr.id ? 'hsl(120 14% 49% / 0.1)' : 'transparent', borderRadius: 10, padding: 10, display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: '#fff', border: '1px solid hsl(120 10% 90%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: pr.status === 'online' ? 'var(--sc-primary)' : '#aaa' }}>
                <Icon name="printer" size={18} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{pr.name}</div>
                <div style={{ fontSize: 11, color: 'var(--sc-muted-foreground)' }}>{pr.conn}</div>
              </div>
              <span className={`chip ${pr.status === 'online' ? 'chip-sage' : 'chip-slate'} chip-dot`}>{pr.status}</span>
            </button>
          ))}
        </div>

        {/* Settings */}
        <div className="card" style={{ padding: 20, height: 'fit-content' }}>
          <div style={{ fontWeight: 900, fontSize: 16, letterSpacing: '-0.02em', marginBottom: 14 }}>{p.name}</div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Field label={lang === 'ro' ? 'Model' : 'Model'} value={p.model} />
            <Field label={lang === 'ro' ? 'Conexiune' : 'Connection'} value={p.conn} />
            <Field label={lang === 'ro' ? 'Rol' : 'Role'} value={p.kind === 'kitchen' ? (lang === 'ro' ? 'Bucătărie' : 'Kitchen') : p.kind === 'customer' ? (lang === 'ro' ? 'Bon client' : 'Customer') : 'Bar'} />

            <Toggle label={lang === 'ro' ? 'Print automat la comandă nouă' : 'Auto-print on new order'} on={opts.autoPrint} onChange={v => setOpts({ ...opts, autoPrint: v })} />
            <Toggle label={lang === 'ro' ? 'Buzzer la început' : 'Buzzer on print'} on={opts.buzzer} onChange={v => setOpts({ ...opts, buzzer: v })} />
            <Toggle label={lang === 'ro' ? 'Tăiere automată hârtie' : 'Auto paper cut'} on={opts.cut} onChange={v => setOpts({ ...opts, cut: v })} />
            <Toggle label={lang === 'ro' ? 'Deschide sertarul' : 'Open cash drawer'} on={opts.openDrawer} onChange={v => setOpts({ ...opts, openDrawer: v })} />

            <div>
              <div style={{ fontSize: 11, color: 'var(--sc-muted-foreground)', fontWeight: 600, marginBottom: 4 }}>{lang === 'ro' ? 'Lățime hârtie' : 'Paper width'}</div>
              <div style={{ display: 'flex', gap: 6 }}>
                {['58mm', '80mm'].map(w => (
                  <button key={w} onClick={() => setOpts({ ...opts, width: w })} style={{ flex: 1, padding: '8px 10px', borderRadius: 8, border: opts.width === w ? '1.5px solid var(--sc-primary)' : '1px solid hsl(120 10% 88%)', background: opts.width === w ? 'hsl(120 14% 49% / 0.08)' : '#fff', color: opts.width === w ? 'var(--sc-primary)' : '#555', fontWeight: 700, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>{w}</button>
                ))}
              </div>
            </div>

            <div>
              <div style={{ fontSize: 11, color: 'var(--sc-muted-foreground)', fontWeight: 600, marginBottom: 4 }}>{lang === 'ro' ? 'Copii' : 'Copies'}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button onClick={() => setOpts({ ...opts, copies: Math.max(1, opts.copies - 1) })} className="icon-btn" style={{ width: 32, height: 32 }}>−</button>
                <div style={{ flex: 1, textAlign: 'center', fontWeight: 900, fontSize: 16 }}>{opts.copies}</div>
                <button onClick={() => setOpts({ ...opts, copies: opts.copies + 1 })} className="icon-btn" style={{ width: 32, height: 32 }}>+</button>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <button className="btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={onTestPrint}><Icon name="printer" size={14} />{t('test_print')}</button>
            <button className="btn-secondary"><Icon name="settings" size={14} /></button>
          </div>
        </div>

        {/* Live test print preview */}
        <div style={{ background: '#ede9de', padding: 18, borderRadius: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div className="eyebrow">preview</div>
          <div style={{ fontWeight: 900, fontSize: 15, letterSpacing: '-0.02em' }}>{lang === 'ro' ? 'Bon de test' : 'Test ticket'}</div>
          <window.ThermalTicket order={window.ORDERS[1]} lang={lang} kind="customer" />
        </div>
      </div>
    </div>
  );
}

function Field({ label, value }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: 'var(--sc-muted-foreground)', fontWeight: 600 }}>{label}</div>
      <div style={{ fontWeight: 600, fontSize: 13, marginTop: 2 }}>{value}</div>
    </div>
  );
}
function Toggle({ label, on, onChange }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <button onClick={() => onChange(!on)} style={{ width: 38, height: 22, borderRadius: 999, background: on ? 'var(--sc-primary)' : 'hsl(120 10% 85%)', border: 0, padding: 2, cursor: 'pointer', transition: 'background 200ms' }}>
        <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#fff', marginLeft: on ? 16 : 0, transition: 'margin 200ms', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
      </button>
      <div style={{ fontSize: 13, fontWeight: 500 }}>{label}</div>
    </div>
  );
}

window.PrinterScreen = PrinterScreen;
