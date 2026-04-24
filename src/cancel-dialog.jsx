import { useState } from 'react';
import { useT } from './i18n.jsx';
import { Icon } from './icons.jsx';

export function CancelDialog({ lang, order, onCancel, onConfirm }) {
  const t = useT(lang);
  const [reason, setReason] = useState('');

  if (!order) return null;

  const reasons = [
    { value: 'customer_changed_mind', ro: 'Clientul a renunțat',           en: 'Customer changed mind' },
    { value: 'out_of_ingredients',    ro: 'Lipsă ingrediente',              en: 'Out of ingredients' },
    { value: 'duplicate_order',       ro: 'Comandă duplicată',              en: 'Duplicate order' },
    { value: 'kitchen_cannot_fulfill', ro: 'Bucătăria nu poate pregăti',   en: 'Kitchen cannot fulfill' },
    { value: 'other',                 ro: 'Altul',                          en: 'Other' },
  ];

  const canConfirm = reason !== '';

  return (
    <div style={{
      position: 'absolute', inset: 0,
      background: 'rgba(18, 24, 18, 0.45)',
      backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 200, animation: 'fadeIn 180ms ease-out',
    }}>
      <div style={{
        width: 420, background: '#fff', borderRadius: 20,
        boxShadow: '0 30px 80px rgba(0,0,0,0.35)',
        overflow: 'hidden', border: '1px solid hsl(120 10% 88%)',
      }}>
        {/* Header */}
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid hsl(120 10% 92%)' }}>
          <div className="eyebrow">{lang === 'ro' ? 'anulare comandă' : 'cancel order'}</div>
          <div style={{ fontWeight: 900, fontSize: 22, letterSpacing: '-0.02em', marginTop: 4 }}>
            {t('cancel_dialog_title')}
          </div>
          <div style={{ color: 'var(--sc-muted-foreground)', fontSize: 13, marginTop: 4, lineHeight: 1.5 }}>
            {t('cancel_dialog_sub')}
          </div>
        </div>

        {/* Reason picker */}
        <div style={{ padding: '16px 24px' }}>
          <div style={{
            fontSize: 11, fontWeight: 700, color: 'var(--sc-muted-foreground)',
            textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10,
          }}>
            {t('cancel_reason_label')}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {reasons.map(r => {
              const label = lang === 'ro' ? r.ro : r.en;
              const selected = reason === r.value;
              return (
                <button
                  key={r.value}
                  onClick={() => setReason(r.value)}
                  style={{
                    padding: '11px 16px', borderRadius: 12, cursor: 'pointer',
                    fontFamily: 'inherit', fontSize: 13, textAlign: 'left',
                    border: selected ? '1.5px solid hsl(0 53% 58%)' : '1px solid hsl(120 10% 88%)',
                    background: selected ? 'hsl(0 53% 58% / 0.08)' : '#fff',
                    color: selected ? 'hsl(0 53% 42%)' : '#333',
                    fontWeight: selected ? 700 : 500,
                    transition: 'all 150ms',
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '14px 24px', borderTop: '1px solid hsl(120 10% 92%)',
          display: 'flex', gap: 10, background: '#fafaf6',
        }}>
          <button className="btn-secondary" onClick={onCancel} style={{ flex: '0 0 auto' }}>
            {t('back')}
          </button>
          <button
            className="btn-primary"
            style={{
              flex: 1, justifyContent: 'center', height: 42,
              background: canConfirm ? 'hsl(0 53% 52%)' : undefined,
              opacity: canConfirm ? 1 : 0.45,
              pointerEvents: canConfirm ? 'auto' : 'none',
              display: 'flex', alignItems: 'center', gap: 6,
            }}
            disabled={!canConfirm}
            onClick={() => onConfirm(reason)}
          >
            <Icon name="x" size={14} />
            {canConfirm ? t('confirm_cancellation') : t('select_reason')}
          </button>
        </div>
      </div>
    </div>
  );
}
