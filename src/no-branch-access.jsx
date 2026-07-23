import { Icon } from './icons.jsx';
import { useT } from './i18n.jsx';

// NoBranchAccessBlock (Phase 17, plan 04 — BERR-03): the NO_BRANCH_ACCESS terminal-state block.
// Renders as a top-level gate in app.jsx, sibling to the coldStartBusy/!isAuthenticated early
// returns, superseding <Shell> entirely (D-01). Deliberately box-less/full-viewport on
// --sc-background — NOT a card over a scrim like SwitchingOverlay/CancelDialog — this is a
// persistent full-page state, not a transient modal (17-UI-SPEC.md E1-block layout rationale).
// The block's own icon and Retry button are the only interactive/visual elements; existing
// design tokens only, no new CSS classes, no new colors.
export function NoBranchAccessBlock({ lang, onRetry, retrying }) {
  const t = useT(lang);
  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        background: 'var(--sc-background)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 48,
      }}
    >
      <div style={{ textAlign: 'center', maxWidth: 420 }}>
        <Icon name="alert" size={28} style={{ color: 'var(--sc-muted-foreground)', marginBottom: 4 }} />
        <div
          style={{
            fontSize: 20,
            fontWeight: 800,
            lineHeight: 1.25,
            letterSpacing: '-0.02em',
            color: 'var(--sc-foreground)',
            marginTop: 4,
          }}
        >
          {t('branch_no_access_title')}
        </div>
        <div
          style={{
            fontSize: 13,
            fontWeight: 500,
            lineHeight: 1.5,
            color: 'var(--sc-muted-foreground)',
            marginTop: 8,
          }}
        >
          {t('branch_no_access_body')}
        </div>
        <button
          className="btn-primary"
          disabled={retrying}
          onClick={onRetry}
          style={{ justifyContent: 'center', margin: '16px auto 0' }}
        >
          {retrying && <Icon name="refresh" size={14} className="spin" style={{ color: 'var(--sc-primary)' }} />}
          {retrying ? t('branch_no_access_retry_busy') : t('branch_no_access_retry')}
        </button>
      </div>
    </div>
  );
}
