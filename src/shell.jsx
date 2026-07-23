import { useState, useEffect, useRef } from 'react';
import { relaunch } from '@tauri-apps/plugin-process';
import { Icon } from './icons.jsx';
import { useT } from './i18n.jsx';
import { OfflineBanner } from './offline-banner.jsx';
import { BrandLogo } from './brand-logo.jsx';
import { useAppStore } from './store.js';
import { useAuth } from './auth.jsx';
import { useBranches } from './use-branches.js';

function Shell({ lang, setLang, role, setRole, screen, setScreen, accent, density, children, orderCount, sidebarCollapsed, setSidebarCollapsed, isOffline, onSelectBranch }) {
  const t = useT(lang);
  const updateReady = useAppStore((s) => s.updateReady);
  const authUser = useAppStore((s) => s.authUser);
  const { signOut } = useAuth();
  const handleRelaunch = () => { if (window.__TAURI_INTERNALS__) relaunch(); };

  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef(null);

  useEffect(() => {
    if (!userMenuOpen) return;
    function handleClick(e) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [userMenuOpen]);

  // Branch switcher (D-01/D-02/D-04, LANG-01) — presentation-only: Shell owns the read-only
  // useBranches() list itself; the switch action bubbles up via onSelectBranch to app.jsx, where
  // the overlay/phase-machine/cart-gate live. Popover state mirrors userMenuOpen/userMenuRef
  // exactly (D-01). Gate the popover on branches.length > 1, NEVER on currentBranch truthiness
  // (D-04/SWCH-02) — a single-branch tenant's currentBranch may legitimately be non-null.
  const { data: branches = [], isLoading: branchesLoading, isError: branchesError } = useBranches();
  const currentBranch = useAppStore((s) => s.currentBranch);
  const isMultiBranch = branches.length > 1;
  // E3 loading/error backstops: while the list is still resolving or errored we don't yet know
  // the definitive branch count, so the trigger stays interactive (popover shows a spinner/error
  // row — 16-UI-SPEC.md E3). A genuinely single-branch tenant settles to isMultiBranch=false with
  // both flags false and locks read-only for good — no permanent first-paint delay (Pitfall 11).
  const canOpenBranchPopover = isMultiBranch || branchesLoading || branchesError;
  const branchInitial = (currentBranch?.name ?? '').trim().charAt(0).toUpperCase();

  const [branchMenuOpen, setBranchMenuOpen] = useState(false);
  const branchMenuRef = useRef(null);

  useEffect(() => {
    if (!branchMenuOpen) return;
    function handleClick(e) {
      if (branchMenuRef.current && !branchMenuRef.current.contains(e.target)) {
        setBranchMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [branchMenuOpen]);

  // BERR-01 (17-01): consume-once reopen seam. A central 403 recovery (handleBranchError) sets
  // branchSwitcherForceOpen true; this effect force-opens the popover and immediately resets the
  // store flag so a single 403 reopens the popover exactly once, never re-overriding a later
  // manual close. Only fires when the popover is actually reachable (canOpenBranchPopover) so a
  // settled single-branch tenant is never force-opened. No new dismiss logic — the existing
  // outside-click handler above already makes the reopened popover dismissible (D-04).
  const branchSwitcherForceOpen = useAppStore((s) => s.branchSwitcherForceOpen);
  const setBranchSwitcherForceOpen = useAppStore((s) => s.setBranchSwitcherForceOpen);

  useEffect(() => {
    if (!branchSwitcherForceOpen) return;
    if (canOpenBranchPopover) setBranchMenuOpen(true);
    setBranchSwitcherForceOpen(false);
  }, [branchSwitcherForceOpen, canOpenBranchPopover, setBranchSwitcherForceOpen]);

  // D-06: compose firstName/lastName from the getMe() CurrentUser shape; fall back to any
  // optimistic-fill .name, then .email, then empty string. Never a hardcoded personal name —
  // when authUser is unresolved (null), the identity row renders nothing (UI-SPEC E2).
  const displayName =
    [authUser?.firstName, authUser?.lastName].filter(Boolean).join(' ').trim() ||
    authUser?.name ||
    authUser?.email ||
    '';
  const initials = displayName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  const navGroups = [
    {
      label: role === 'kitchen' ? t('nav_kitchen') : t('role_cashier'),
      items: role === 'kitchen'
        ? [
            { id: 'kitchen', icon: 'chef', label: t('nav_kitchen'), count: orderCount.active },
            { id: 'orders', icon: 'zap', label: t('nav_orders'), count: orderCount.live },
          ]
        : [
            { id: 'orders', icon: 'zap', label: t('nav_orders'), count: orderCount.live, dot: orderCount.new > 0 },
            { id: 'pos', icon: 'plus', label: t('nav_new') },
            { id: 'kitchen', icon: 'chef', label: t('nav_kitchen'), count: orderCount.active },
            { id: 'history', icon: 'history', label: t('nav_history') },
          ],
    },
    {
      label: lang === 'ro' ? 'Administrare' : 'Manage',
      items: [
        { id: 'menu', icon: 'utensils', label: t('nav_menu') },
        { id: 'printer', icon: 'printer', label: t('nav_printer') },
        { id: 'settings', icon: 'settings', label: t('nav_settings') },
      ],
    },
  ];

  const screenTitles = {
    orders: t('nav_orders'),
    kitchen: t('nav_kitchen'),
    pos: t('nav_new'),
    menu: t('nav_menu'),
    printer: t('nav_printer'),
    settings: t('nav_settings'),
    detail: lang === 'ro' ? 'Detalii comandă' : 'Order details',
    history: t('nav_history'),
    'history-detail': lang === 'ro' ? 'Detalii comandă' : 'Order details',
  };

  const sidebarWidth = sidebarCollapsed ? 72 : 240;

  return (
    <div className="win" style={{ '--accent': accent }}>
      <div className="app-body" style={{ gridTemplateColumns: `${sidebarWidth}px 1fr`, transition: 'grid-template-columns 200ms cubic-bezier(0.4, 0, 0.2, 1)' }}>
        {/* Sidebar */}
        <aside className="sidebar" style={{ padding: sidebarCollapsed ? '18px 10px 14px' : '18px 14px 14px', overflow: 'hidden' }}>
          <div className="brand" style={{ padding: sidebarCollapsed ? '4px 2px 16px' : '4px 8px 16px', justifyContent: sidebarCollapsed ? 'center' : 'flex-start' }}>
            <BrandLogo size="sm" />
            {!sidebarCollapsed && (
              <div>
                <div className="brand-name"><span>Site</span><b>Care</b></div>
                <div className="brand-sub">POS</div>
              </div>
            )}
          </div>

          {navGroups.map((g, gi) => (
            <div key={gi}>
              {!sidebarCollapsed && <div className="nav-group-label">{g.label}</div>}
              {sidebarCollapsed && gi > 0 && <div style={{ height: 1, background: 'hsl(120 10% 88%)', margin: '10px 4px' }} />}
              {g.items.map(item => (
                <div key={item.id}
                  title={sidebarCollapsed ? item.label : ''}
                  className={`nav-item ${screen === item.id ? 'active' : ''}`}
                  onClick={() => setScreen(item.id)}
                  style={{ justifyContent: sidebarCollapsed ? 'center' : 'flex-start', padding: sidebarCollapsed ? '10px 0' : '9px 10px', position: 'relative' }}>
                  <Icon name={item.icon} size={sidebarCollapsed ? 19 : 17} />
                  {!sidebarCollapsed && <span className="label">{item.label}</span>}
                  {!sidebarCollapsed && item.dot && <span className="dot" />}
                  {!sidebarCollapsed && item.count != null && <span className="count">{item.count}</span>}
                  {sidebarCollapsed && item.count != null && item.count > 0 && (
                    <span style={{ position: 'absolute', top: 4, right: 8, background: screen === item.id ? '#fff' : 'var(--sc-terracotta)', color: screen === item.id ? 'var(--sc-primary)' : '#fff', fontSize: 9, fontWeight: 800, borderRadius: 999, minWidth: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px' }}>{item.count}</span>
                  )}
                </div>
              ))}
            </div>
          ))}

          {updateReady && !sidebarCollapsed && (
            <div style={{ background: 'hsl(120 14% 49% / 0.08)', border: '1px solid hsl(120 14% 49% / 0.18)', borderRadius: 10, padding: '10px 12px', marginTop: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4 }}>
                <Icon name="refresh" size={14} style={{ color: 'var(--sc-primary)' }} />
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--sc-foreground)', letterSpacing: '-0.01em' }}>{t('update_ready')}</span>
              </div>
              <p style={{ fontSize: 11, color: 'var(--sc-muted-foreground)', margin: '0 0 8px', lineHeight: 1.4 }}>{t('update_ready_sub')}</p>
              <button onClick={handleRelaunch} style={{ width: '100%', border: 0, background: 'var(--sc-primary)', color: '#fff', borderRadius: 7, padding: '6px 10px', cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, fontWeight: 700 }}>
                {t('update_restart')}
              </button>
            </div>
          )}
          {updateReady && sidebarCollapsed && (
            <div title={t('update_ready')} onClick={handleRelaunch} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '10px 0', cursor: 'pointer', borderRadius: 10, background: 'hsl(120 14% 49% / 0.08)', border: '1px solid hsl(120 14% 49% / 0.18)', color: 'var(--sc-primary)', marginTop: 4 }}>
              <Icon name="refresh" size={16} />
            </div>
          )}

          <div className="sidebar-footer">
            {/* Collapse toggle */}
            <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)} title={sidebarCollapsed ? (lang === 'ro' ? 'Extinde' : 'Expand') : (lang === 'ro' ? 'Restrânge' : 'Collapse')}
              style={{ width: '100%', border: '1px solid hsl(120 10% 88%)', background: '#fff', borderRadius: 10, padding: sidebarCollapsed ? '8px 0' : '8px 10px', display: 'flex', alignItems: 'center', justifyContent: sidebarCollapsed ? 'center' : 'flex-start', gap: 8, cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 10 }}>
              <Icon name={sidebarCollapsed ? 'chevRight' : 'chevLeft'} size={14} />
              {!sidebarCollapsed && <span>{lang === 'ro' ? 'Restrânge' : 'Collapse'}</span>}
            </button>

            {/* Branch switcher (SWCH-01/D-01/D-02) — occupies the exact slot the RO/EN pill
                held (LANG-01, D-15); language now lives only in Settings → Afișaj. Collapsed
                sidebar keeps branch identity visible via a compact chip (D-03) — unlike the
                removed RO/EN toggle, this control never fully hides. */}
            <div style={{ position: 'relative', marginBottom: 8 }} ref={branchMenuRef}>
              {branchMenuOpen && canOpenBranchPopover && (
                <div style={{ position: 'absolute', bottom: 'calc(100% + 6px)', left: 0, right: 0, background: '#fff', border: '1px solid hsl(120 10% 88%)', borderRadius: 10, boxShadow: '0 4px 16px rgba(0,0,0,0.12)', zIndex: 50, overflow: 'hidden', maxHeight: 220, overflowY: 'auto' }}>
                  {isMultiBranch && !branchesLoading && !branchesError && (
                    <div style={{ padding: '8px 12px 4px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--sc-muted-foreground)' }}>
                      {t('branch_available_label')}
                    </div>
                  )}
                  {branchesLoading && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', fontSize: 12, color: 'var(--sc-muted-foreground)' }}>
                      <Icon name="refresh" size={14} className="spin" style={{ color: 'var(--sc-primary)' }} />
                    </div>
                  )}
                  {!branchesLoading && branchesError && (
                    <div style={{ padding: '10px 12px', fontSize: 12, color: 'var(--sc-muted-foreground)' }}>
                      {t('branch_popover_error')}
                    </div>
                  )}
                  {!branchesLoading && !branchesError && branches.map((branch) => {
                    const selected = branch.id === currentBranch?.id;
                    return (
                      <button
                        key={branch.id}
                        title={branch.name}
                        onClick={() => { setBranchMenuOpen(false); onSelectBranch?.(branch); }}
                        style={{ width: '100%', border: 0, background: 'transparent', display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 600, color: '#333', textAlign: 'left' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'hsl(120 14% 49% / 0.08)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        {selected
                          ? <Icon name="check" size={14} style={{ color: 'var(--sc-primary)', flexShrink: 0 }} />
                          : <span style={{ width: 14, flexShrink: 0 }} />}
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{branch.name}</span>
                        {branch.isDefault && (
                          <span className="chip chip-sage" style={{ border: '1px solid var(--sc-primary)', flexShrink: 0 }}>{t('branch_default_badge')}</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {!sidebarCollapsed && (
                <div
                  title={currentBranch?.name ?? ''}
                  onClick={() => { if (canOpenBranchPopover) setBranchMenuOpen(o => !o); }}
                  style={{ width: '100%', border: '1px solid hsl(120 10% 88%)', background: '#fff', borderRadius: 10, padding: '8px 10px', display: 'flex', alignItems: 'center', gap: 8, cursor: canOpenBranchPopover ? 'pointer' : 'default', fontFamily: 'inherit' }}
                >
                  <span style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{currentBranch?.name ?? ''}</span>
                  {currentBranch?.isDefault && (
                    <span className="chip chip-sage" style={{ border: '1px solid var(--sc-primary)', flexShrink: 0 }}>{t('branch_default_badge')}</span>
                  )}
                  {canOpenBranchPopover && (
                    <Icon name={branchMenuOpen ? 'chevUp' : 'chevDown'} size={12} style={{ color: 'var(--sc-primary)', flexShrink: 0 }} />
                  )}
                </div>
              )}

              {sidebarCollapsed && (
                <div
                  title={currentBranch?.name ?? ''}
                  aria-label={currentBranch?.name ?? ''}
                  onClick={() => { if (canOpenBranchPopover) setBranchMenuOpen(o => !o); }}
                  style={{ width: 32, height: 32, margin: '0 auto', borderRadius: '50%', border: '1px solid hsl(120 10% 88%)', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, color: 'var(--sc-foreground)', cursor: canOpenBranchPopover ? 'pointer' : 'default' }}
                >
                  {branchInitial}
                </div>
              )}
            </div>
            <div style={{ position: 'relative' }} ref={userMenuRef}>
              {userMenuOpen && (
                <div style={{ position: 'absolute', bottom: 'calc(100% + 6px)', left: 0, right: 0, background: '#fff', border: '1px solid hsl(120 10% 88%)', borderRadius: 10, boxShadow: '0 4px 16px rgba(0,0,0,0.12)', zIndex: 50, overflow: 'hidden' }}>
                  <button
                    onClick={() => { setUserMenuOpen(false); signOut(); }}
                    style={{ width: '100%', border: 0, background: 'transparent', display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 600, color: 'hsl(0 60% 45%)', borderRadius: 0 }}
                    onMouseEnter={e => e.currentTarget.style.background = 'hsl(0 60% 45% / 0.08)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <Icon name="logout" size={14} />
                    {t('logout')}
                  </button>
                </div>
              )}
              <div
                className="user-chip"
                title={sidebarCollapsed ? displayName : ''}
                style={{ justifyContent: sidebarCollapsed ? 'center' : 'flex-start', cursor: 'pointer' }}
                onClick={() => setUserMenuOpen(o => !o)}
              >
                <div className="avatar">{initials}</div>
                {!sidebarCollapsed && (
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{displayName}</div>
                    <div style={{ fontSize: 11, color: 'var(--sc-muted-foreground)' }}>{lang === 'ro' ? 'Administrator' : 'Admin'}</div>
                  </div>
                )}
                {!sidebarCollapsed && (
                  <Icon name={userMenuOpen ? 'chevUp' : 'chevDown'} size={12} style={{ color: 'var(--sc-muted-foreground)', flexShrink: 0 }} />
                )}
              </div>
            </div>
          </div>
        </aside>

        {/* Main */}
        <div className="main">
          <div className="topbar">
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ fontFamily: 'Caveat, cursive', color: 'var(--sc-terracotta)', fontWeight: 700, fontSize: 16 }}>
                  {lang === 'ro' ? 'bună dimineața,' : 'good morning,'}
                </div>
              </div>
              <div className="topbar-title" data-screen-label={screenTitles[screen]}>{screenTitles[screen]}</div>
            </div>

            <div className="role-pill" role="tablist" aria-label="role">
              <button className={role === 'cashier' ? 'active' : ''} onClick={() => setRole('cashier')}>
                <Icon name="storefront" size={13} /> {t('role_cashier')}
              </button>
              <button className={role === 'kitchen' ? 'active' : ''} onClick={() => setRole('kitchen')}>
                <Icon name="chef" size={13} /> {t('role_kitchen')}
              </button>
            </div>

            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 16 }}>
              <button className="icon-btn" title={t('toast_new_order')}>
                <Icon name="bell" size={16} />
                <span className="bubble">{orderCount.new}</span>
              </button>

              {role !== 'kitchen' && (
                <button className="btn-primary" onClick={() => setScreen('pos')}>
                  <Icon name="plus" size={15} /> {t('new_order')}
                </button>
              )}
            </div>
          </div>

          <div className={`content ${density === 'dense' ? 'density-compact' : ''}`}>
            {isOffline && <OfflineBanner lang={lang} />}
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

export { Shell };
