// OfflineBanner — shown at the top of .content when SSE connection is lost (OFF-01, D-10)
// Shell renders this when isOffline=true. Component itself has no conditional logic.
// Position: first child inside .content, above {children} — does NOT span sidebar.
// Analog: src/shell.jsx (Icon + useT pattern)

import { Icon } from './icons.jsx';
import { useT } from './i18n.jsx';

export function OfflineBanner({ lang }) {
  const t = useT(lang);
  return (
    <div className="offline-banner">
      <Icon name="wifi" size={16} />
      <span>{t('offline_banner_title')}</span>
      <span className="banner-sub">{t('offline_banner_sub')}</span>
    </div>
  );
}
