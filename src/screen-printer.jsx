import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { load } from '@tauri-apps/plugin-store';
import { Icon } from './icons.jsx';
import { useT } from './i18n.jsx';
import { ThermalTicket } from './screen-detail.jsx';
import { useAppStore } from './store.js';

const PREVIEW_ORDER = {
  id: 'preview',
  dailyOrderNumber: 1,
  placedAt: new Date().toISOString(),
  state: 'accepted',
  type: 'dinein',
  source: 'counter',
  table: '1',
  customer: { name: 'Preview', phone: null },
  address: null,
  notes: null,
  items: [{ name: 'Test Item', qty: 1, price: 10.00, mods: [], source: 'menu' }],
  subtotal: 10.00,
  tax: 1.90,
  deliveryFee: 0,
  discount: 0,
  total: 11.90,
  payment: 'cash',
  paid: false,
};

function PrinterScreen({ lang, restaurantSettings, isOffline }) {
  const t = useT(lang);
  const pushToast = useAppStore((s) => s.pushToast);
  const [ports, setPorts] = useState([]);
  const [selectedPort, setSelectedPort] = useState('');
  const [printerName, setPrinterName] = useState('');
  const [width, setWidth] = useState('80mm');
  const [saveStatus, setSaveStatus] = useState(null); // null | 'pending' | 'success' | 'error'
  const [saveError, setSaveError] = useState('');
  const [testPending, setTestPending] = useState(false);
  const [hasConfig, setHasConfig] = useState(false);

  useEffect(() => {
    invoke('list_serial_ports')
      .then((list) => {
        setPorts(list);
        if (list.length > 0) setSelectedPort(list[0]);
      })
      .catch(() => setPorts([]));

    // Load saved config to pre-populate form and enable Test Print
    load('preferences.json', { autoSave: false })
      .then((store) => store.get('printer'))
      .then((config) => {
        if (config?.port) {
          setSelectedPort(config.port);
          setPrinterName(config.name ?? '');
          setWidth(config.paperWidth ?? '80mm');
          setHasConfig(true);
          setSaveStatus('success');
        }
      })
      .catch(() => {});
  }, []);

  const handleRefreshPorts = () => {
    invoke('list_serial_ports')
      .then((list) => {
        setPorts(list);
        if (list.length > 0 && !selectedPort) setSelectedPort(list[0]);
      })
      .catch(() => setPorts([]));
  };

  const handleSave = async () => {
    if (!selectedPort) return;
    setSaveStatus('pending');
    setSaveError('');
    try {
      await invoke('save_printer_config', { port: selectedPort, baud: 9600 });
      // Connection test passed — now persist to plugin-store (JS side per RESEARCH.md recommendation)
      const store = await load('preferences.json', { autoSave: false });
      await store.set('printer', { port: selectedPort, name: printerName, paperWidth: width, baud: 9600 });
      await store.save();
      setSaveStatus('success');
      setHasConfig(true);
    } catch (err) {
      setSaveStatus('error');
      setSaveError(String(err));
      // Do NOT write to store on failure (D-11)
    }
  };

  const handleTestPrint = async () => {
    setTestPending(true);
    try {
      const store = await load('preferences.json', { autoSave: false });
      const config = await store.get('printer');
      await invoke('test_print', {
        port: config.port,
        baud: config.baud ?? 9600,
        paperWidth: config.paperWidth ?? '80mm',
        restaurantName: restaurantSettings?.restaurant_name ?? 'Restaurant',
      });
      pushToast({ id: Date.now(), kind: 'success', title: t('toast_printed'), detail: '' });
    } catch (err) {
      pushToast({ id: Date.now(), kind: 'error', title: t('print_failed'), detail: String(err) });
    } finally {
      setTestPending(false);
    }
  };

  return (
    <div className="content-pad">
      {/* Screen heading block */}
      <div style={{ marginBottom: 20 }}>
        <div className="eyebrow">{t('printer_eyebrow')}</div>
        <div style={{ fontWeight: 900, fontSize: 24, letterSpacing: '-0.02em' }}>{t('printers')}</div>
        <div style={{ color: 'var(--sc-muted-foreground)', fontSize: 13, marginTop: 2 }}>{t('printer_subtitle')}</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 380px', gap: 16 }}>
        {/* Left: single-printer form card */}
        <div className="card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16, height: 'fit-content' }}>

          {/* Port picker row */}
          <div>
            <div style={{ fontSize: 11, color: 'var(--sc-muted-foreground)', fontWeight: 600, marginBottom: 4 }}>{t('printer_port_label')}</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <select
                value={selectedPort}
                onChange={(e) => setSelectedPort(e.target.value)}
                disabled={isOffline}
                style={{ flex: 1, border: '1px solid hsl(120 10% 88%)', borderRadius: 8, padding: '8px 12px', fontSize: 13, fontFamily: 'inherit', background: '#fff' }}
              >
                {ports.length === 0
                  ? <option value="" disabled>{t('printer_no_ports')}</option>
                  : ports.map((p) => <option key={p} value={p}>{p}</option>)
                }
              </select>
              <button className="btn-secondary" onClick={handleRefreshPorts} style={{ padding: '8px 12px', flexShrink: 0 }}>
                <Icon name="refresh" size={13} /> {t('printer_refresh_ports')}
              </button>
            </div>
          </div>

          {/* Paper width toggle */}
          <div>
            <div style={{ fontSize: 11, color: 'var(--sc-muted-foreground)', fontWeight: 600, marginBottom: 4 }}>{t('printer_width_label')}</div>
            <div style={{ display: 'flex', gap: 6 }}>
              {['58mm', '80mm'].map((w) => (
                <button key={w} onClick={() => setWidth(w)}
                  style={{ flex: 1, padding: '8px 10px', borderRadius: 8,
                    border: width === w ? '1.5px solid var(--sc-primary)' : '1px solid hsl(120 10% 88%)',
                    background: width === w ? 'hsl(120 14% 49% / 0.08)' : '#fff',
                    color: width === w ? 'var(--sc-primary)' : '#555',
                    fontWeight: 700, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>{w}</button>
              ))}
            </div>
          </div>

          {/* Printer name field */}
          <div>
            <div style={{ fontSize: 11, color: 'var(--sc-muted-foreground)', fontWeight: 600, marginBottom: 4 }}>{t('printer_name_label')}</div>
            <input
              value={printerName}
              onChange={(e) => setPrinterName(e.target.value)}
              placeholder={t('printer_name_placeholder')}
              style={{ width: '100%', border: '1px solid hsl(120 10% 88%)', borderRadius: 8, padding: '8px 12px', fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box' }}
            />
          </div>

          {/* Status chip (shown after save attempt) */}
          {saveStatus === 'success' && (
            <span className="chip chip-sage chip-dot">{t('printer_connected')}</span>
          )}
          {saveStatus === 'error' && (
            <div>
              <span className="chip chip-red chip-dot">{t('printer_connection_failed')}</span>
              {saveError && <div style={{ fontSize: 11, color: 'var(--sc-muted-foreground)', marginTop: 4 }}>{saveError}</div>}
            </div>
          )}

          {/* Action row */}
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className={`btn-primary${isOffline ? ' btn-disabled-offline' : ''}`}
              style={{ flex: 1, justifyContent: 'center', opacity: saveStatus === 'pending' ? 0.7 : 1 }}
              disabled={isOffline || saveStatus === 'pending' || !selectedPort}
              onClick={handleSave}
            >
              <Icon name="check" size={14} />
              {saveStatus === 'pending' ? t('printer_saving_btn') : t('printer_save_btn')}
            </button>
            <button
              className="btn-secondary"
              style={{ flex: 1, justifyContent: 'center',
                opacity: !hasConfig || isOffline || testPending ? 0.45 : 1,
                pointerEvents: !hasConfig || isOffline || testPending ? 'none' : 'auto' }}
              disabled={!hasConfig || isOffline || testPending}
              onClick={handleTestPrint}
            >
              <Icon name="printer" size={14} />
              {testPending ? t('printer_printing_btn') : t('printer_test_btn')}
            </button>
          </div>

          {/* Auto-print toggle — greyed-out (unready feature per CLAUDE.md) */}
          <div style={{ opacity: 0.45, pointerEvents: 'none', marginTop: 4 }}>
            <Toggle label={t('printer_auto_print')} on={false} onChange={() => {}} />
          </div>
        </div>

        {/* Right: receipt preview panel */}
        <div style={{ background: '#ede9de', padding: 16, borderRadius: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div className="eyebrow">preview</div>
          <div style={{ fontWeight: 900, fontSize: 15, letterSpacing: '-0.02em' }}>{t('printer_test_ticket_preview')}</div>
          <ThermalTicket order={PREVIEW_ORDER} lang={lang} kind="customer" restaurantSettings={restaurantSettings} />
        </div>
      </div>
    </div>
  );
}

function Toggle({ label, on, onChange }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <button onClick={() => onChange(!on)}
        style={{ width: 38, height: 22, borderRadius: 999,
          background: on ? 'var(--sc-primary)' : 'hsl(120 10% 85%)',
          border: 0, padding: 2, cursor: 'pointer', transition: 'background 200ms' }}>
        <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#fff',
          marginLeft: on ? 16 : 0, transition: 'margin 200ms',
          boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
      </button>
      <div style={{ fontSize: 13, fontWeight: 500 }}>{label}</div>
    </div>
  );
}

export { PrinterScreen };
