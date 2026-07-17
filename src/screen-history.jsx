// HistoryScreen — read-only, day-grouped order history (HIST-05, HIST-13, Phase 7 Plan 04).
// Screen-owns-its-hook: calls its own data hook and does zero derivation inline — every
// filter/group/summary computation is delegated to history-utils.js (Plan 01).

import { useMemo } from 'react';
import { useHistoryOrders } from './use-history-orders.js';
import {
  filterFinishedOrders,
  deriveDisplayStatus,
  groupOrdersByDay,
  computeSummary,
} from './history-utils.js';
import { Icon } from './icons.jsx';
import { useT } from './i18n.jsx';
import { formatRON, orderTimeLabel } from './data.jsx';
import { typeMeta } from './screen-orders.jsx';

// D-06: 8-track grid (7 data columns + a chevron affordance track), replacing the design
// source's 9-track definition. The dropped items-count track and dropped sub-line rows are
// absorbed by widening the customer track (1.6fr/150px min -> 1.8fr/200px min).
const HIST_GRID = '150px minmax(200px, 1.8fr) 118px 78px 116px 132px 116px 34px';

const pad2 = (n) => String(n).padStart(2, '0');

// Exported (was module-private): chip class + icon-tile colors for a row's derived display
// status. Precedence itself is history-utils.js's job (deriveDisplayStatus, D-02) — this only
// maps whichever status comes back to its chip class and icon-tile colors. screen-detail.jsx
// now imports this under readOnly (D-05) so the detail view's status chip agrees with the
// History row by construction — do not narrow this back to module-private.
export function historyStatusMeta(status, t) {
  const map = {
    completed: { chip: 'chip-sage', tile: 'hsl(120 14% 49% / 0.12)', ink: 'var(--sc-primary)', icon: 'check', label: t('status_completed') },
    canceled: { chip: 'chip-red', tile: 'hsl(0 84% 60% / 0.1)', ink: 'hsl(0 72% 45%)', icon: 'x', label: t('status_canceled') },
    refunded: { chip: 'chip-amber', tile: 'hsl(38 92% 50% / 0.14)', ink: 'hsl(30 80% 40%)', icon: 'refresh', label: t('status_refunded') },
  };
  return map[status] || map.completed;
}

// D-05: render the daily number directly when it is numeric; fall back to a short slice of
// the id when normalizeOrder had to use its UUID-fallback path (dailyOrderNumber === id).
function orderNumberLabel(order) {
  const num = order.dailyOrderNumber;
  if (typeof num === 'number') return num;
  return String(order.id).slice(0, 8);
}

function paymentIconFor(payment) {
  if (payment === 'card') return 'card';
  if (payment === 'online') return 'wifi';
  return 'cash';
}

// Module-private: today/yesterday/plain localized date label for a day group, derived from the
// first order's own timestamp (never a UTC-string slice — matches history-utils.js's local-day
// convention).
function dayGroupLabel(day, lang, t) {
  const first = day.orders[0];
  const sampleIso = first?.placedAt ?? first?.createdAt;
  const d = new Date(sampleIso);
  const now = new Date();
  const todayKey = `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
  const yest = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  const yestKey = `${yest.getFullYear()}-${pad2(yest.getMonth() + 1)}-${pad2(yest.getDate())}`;
  const nice = d.toLocaleDateString(lang === 'ro' ? 'ro-RO' : 'en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
  if (day.dayKey === todayKey) return `${t('h_today')} · ${nice}`;
  if (day.dayKey === yestKey) return `${t('h_yesterday')} · ${nice}`;
  return nice.charAt(0).toUpperCase() + nice.slice(1);
}

function SkeletonRow() {
  const bar = (w, h = 12, extra = {}) => ({ width: w, height: h, borderRadius: 4, background: 'hsl(210 15% 92%)', ...extra });
  return (
    <div
      data-testid="history-skeleton-row"
      style={{ display: 'grid', gridTemplateColumns: HIST_GRID, alignItems: 'center', gap: 12, padding: '13px 20px', borderTop: '1px solid hsl(120 10% 94%)' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 30, height: 30, borderRadius: 9, background: 'hsl(210 15% 92%)', flexShrink: 0 }} />
        <div style={bar(48)} />
      </div>
      <div style={bar('70%')} />
      <div style={bar(64, 20, { borderRadius: 999 })} />
      <div style={bar(44)} />
      <div style={bar(56)} />
      <div style={bar(74, 20, { borderRadius: 999 })} />
      <div style={bar(52, 12, { justifySelf: 'end' })} />
      <div />
    </div>
  );
}

function ErrorBlock({ t, onRetry }) {
  return (
    <div style={{ textAlign: 'center', padding: 56, color: 'var(--sc-muted-foreground)' }}>
      <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--sc-foreground)' }}>{t('h_error_title')}</div>
      <div style={{ fontSize: 13, marginTop: 4 }}>{t('check_connection')}</div>
      <button className="btn-secondary" style={{ marginTop: 16 }} onClick={onRetry}>
        <Icon name="refresh" size={14} /> {t('h_retry')}
      </button>
    </div>
  );
}

function EmptyBlock({ t }) {
  return (
    <div style={{ textAlign: 'center', padding: 48, color: 'var(--sc-muted-foreground)' }}>
      <div style={{ fontSize: 15, fontWeight: 600 }}>{t('h_empty')}</div>
      <div style={{ fontSize: 13, marginTop: 4 }}>{t('h_empty_sub')}</div>
    </div>
  );
}

function TableHeaderRow({ t }) {
  return (
    <div
      style={{
        display: 'grid', gridTemplateColumns: HIST_GRID, gap: 12, padding: '11px 20px',
        background: '#faf6ec', borderBottom: '1px solid hsl(120 10% 90%)',
        fontSize: 10.5, fontWeight: 700, color: 'var(--sc-muted-foreground)',
        textTransform: 'uppercase', letterSpacing: '0.06em',
      }}
    >
      <div>{t('h_col_order')}</div>
      <div>{t('h_col_customer')}</div>
      <div>{t('h_col_type')}</div>
      <div>{t('h_col_time')}</div>
      <div>{t('h_col_payment')}</div>
      <div>{t('h_col_status')}</div>
      <div style={{ textAlign: 'right' }}>{t('h_col_total')}</div>
      <div />
    </div>
  );
}

function HistoryRow({ order, t, onOpenOrder }) {
  const displayStatus = deriveDisplayStatus(order);
  const meta = historyStatusMeta(displayStatus, t);
  const typ = typeMeta(order.type, t);
  const customerName = order.customer?.name;
  const isCanceled = displayStatus === 'canceled';

  return (
    <div
      data-testid="history-row"
      onClick={() => onOpenOrder(order)}
      style={{
        display: 'grid', gridTemplateColumns: HIST_GRID, alignItems: 'center', gap: 12,
        padding: '13px 20px', cursor: 'pointer', borderTop: '1px solid hsl(120 10% 94%)',
        transition: 'background 120ms',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = '#faf7ef'; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
        <div style={{ width: 30, height: 30, borderRadius: 9, background: meta.tile, color: meta.ink, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Icon name={meta.icon} size={15} />
        </div>
        <div style={{ fontWeight: 900, fontSize: 14, letterSpacing: '-0.01em', fontVariantNumeric: 'tabular-nums' }}>#{orderNumberLabel(order)}</div>
      </div>
      <div style={{ fontSize: 13.5, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {customerName || '—'}
      </div>
      <div><span className="chip chip-slate"><Icon name={typ.icon} size={11} />{typ.label}</span></div>
      <div style={{ fontSize: 13, color: 'var(--sc-muted-foreground)', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
        {orderTimeLabel(order.placedAt)}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: 'var(--sc-muted-foreground)', fontWeight: 600 }}>
        <Icon name={paymentIconFor(order.payment)} size={13} />
        {t(order.payment ?? 'cash')}
      </div>
      <div><span className={`chip ${meta.chip}`}>{meta.label}</span></div>
      <div
        style={{
          textAlign: 'right', fontWeight: 900, fontSize: 14.5, letterSpacing: '-0.01em',
          fontVariantNumeric: 'tabular-nums',
          textDecoration: isCanceled ? 'line-through' : 'none',
          opacity: isCanceled ? 0.6 : 1,
        }}
      >
        {formatRON(order.total).replace(' lei', '')}
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', color: 'var(--sc-muted-foreground)' }}>
        <Icon name="chevRight" size={16} />
      </div>
    </div>
  );
}

function DayGroup({ day, lang, t, onOpenOrder }) {
  const label = dayGroupLabel(day, lang, t);
  const noun = day.count === 1 ? t('h_orders_count_one') : t('h_orders_count_other');
  return (
    <>
      <div
        data-testid="history-day-header"
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '9px 20px', background: '#fcfaf4',
          borderTop: '1px solid hsl(120 10% 93%)', borderBottom: '1px solid hsl(120 10% 93%)',
        }}
      >
        <div style={{ fontSize: 12.5, fontWeight: 800, letterSpacing: '-0.01em' }}>{label}</div>
        <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--sc-muted-foreground)' }}>
          {day.count} {noun} · <span style={{ fontSize: 11.5, fontWeight: 800, color: 'var(--sc-primary)' }}>{formatRON(day.revenue)}</span>
        </div>
      </div>
      {day.orders.map((order) => (
        <HistoryRow key={order.id} order={order} t={t} onOpenOrder={onOpenOrder} />
      ))}
    </>
  );
}

export function HistoryScreen({ lang, onOpenOrder, isOffline }) {
  const t = useT(lang);
  const { data, isLoading, isError, refetch } = useHistoryOrders();

  const finished = useMemo(() => filterFinishedOrders(data ?? []), [data]);
  const days = useMemo(() => groupOrdersByDay(finished), [finished]);
  const summary = useMemo(() => computeSummary(finished), [finished]);

  const isEmpty = !isLoading && !isError && days.length === 0;

  return (
    <div className="content-pad">
      <SummaryStrip t={t} isLoading={isLoading} isError={isError} isEmptyState={isEmpty} summary={summary} />
      <FilterBar t={t} />

      <div className="card" style={{ overflow: 'hidden' }}>
        <TableHeaderRow t={t} />
        {isLoading && Array.from({ length: 7 }).map((_, i) => <SkeletonRow key={i} />)}
        {!isLoading && isError && <ErrorBlock t={t} onRetry={() => refetch()} />}
        {!isLoading && !isError && isEmpty && <EmptyBlock t={t} />}
        {!isLoading && !isError && !isEmpty && days.map((day) => (
          <DayGroup key={day.dayKey} day={day} lang={lang} t={t} onOpenOrder={onOpenOrder} />
        ))}
      </div>
    </div>
  );
}

// ─── Summary strip (D-15) — Task 3 adds the period/status filter pills to FilterBar below ───

function SummaryStrip({ t, isLoading, isError, isEmptyState, summary }) {
  const tiles = [
    { key: 'orders', label: t('h_orders'), value: String(summary.ordersCount), sub: t('h_period_30'), tint: 'sage', icon: 'receipt' },
    { key: 'revenue', label: t('h_revenue'), value: formatRON(summary.revenue), sub: t('h_period_30'), tint: 'sage', icon: 'ron' },
    {
      key: 'avg',
      label: t('h_avg'),
      value: summary.avg === null ? (isEmptyState ? formatRON(0) : '—') : formatRON(summary.avg),
      sub: t('h_avg_sub'),
      tint: 'slate',
      icon: 'percent',
    },
    { key: 'refunds', label: t('h_refunds'), value: String(summary.refundsCount), sub: `${summary.canceledCount} ${t('h_canceled_suffix')}`, tint: 'terra', icon: 'refresh' },
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
      {tiles.map((tile) => {
        const dimmed = isLoading || isError;
        const bg = dimmed
          ? 'hsl(210 15% 92%)'
          : tile.tint === 'sage' ? 'hsl(120 14% 49% / 0.1)'
          : tile.tint === 'terra' ? 'hsl(0 53% 58% / 0.1)'
          : 'hsl(210 15% 92%)';
        const ink = dimmed ? '#99a3ad' : tile.tint === 'sage' ? 'var(--sc-primary)' : tile.tint === 'terra' ? 'var(--sc-terracotta)' : '#556';
        return (
          <div key={tile.key} className="card" style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, flexShrink: 0, background: bg, color: ink, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {!isLoading && <Icon name={tile.icon} size={18} />}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 11, color: 'var(--sc-muted-foreground)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{tile.label}</div>
              <div style={{ fontWeight: 900, fontSize: 20, letterSpacing: '-0.02em' }}>
                {isLoading
                  ? <span style={{ display: 'inline-block', width: 50, height: 18, borderRadius: 4, background: 'hsl(210 15% 92%)' }} />
                  : isError ? '—' : tile.value}
              </div>
              <div style={{ fontSize: 11, color: 'var(--sc-muted-foreground)', fontWeight: 500 }}>
                {isLoading
                  ? <span style={{ display: 'inline-block', width: 40, height: 10, borderRadius: 4, background: 'hsl(210 15% 92%)' }} />
                  : tile.sub}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Full inert filter bar (D-14): period presets, status pills, search, and export all render at
// final visual position/size — visible, dimmed, not clickable — so later phases (Filters +
// Search) can wire them up with zero layout shift. The "30 days" period pill is the sole
// exception: it renders at full opacity/selected styling because it reflects real current state.
function FilterBar({ t }) {
  const periods = [
    { id: 'today', label: t('h_period_today') },
    { id: '7', label: t('h_period_7') },
    { id: '30', label: t('h_period_30') },
    { id: 'custom', label: t('h_period_custom') },
  ];
  const statusFilters = [
    { id: 'all', label: t('all') },
    { id: 'completed', label: t('h_status_completed') },
    { id: 'canceled', label: t('h_status_canceled') },
    { id: 'refunded', label: t('h_status_refunded') },
  ];
  const inertBtn = { border: 0, padding: '7px 12px', borderRadius: 8, fontWeight: 600, fontSize: 13, fontFamily: 'inherit', cursor: 'not-allowed', pointerEvents: 'none' };

  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
      {/* Period presets — the h_period_30 pill is the single exception rendered at full opacity.
          Unrolled (not mapped) so each pill's disabled attribute is independently readable. */}
      <div style={{ display: 'inline-flex', background: '#fff', border: '1px solid hsl(120 10% 90%)', borderRadius: 10, padding: 3 }}>
        <button disabled style={{ ...inertBtn, background: 'transparent', color: '#555', opacity: 0.5 }}>{periods[0].label}</button>
        <button disabled style={{ ...inertBtn, background: 'transparent', color: '#555', opacity: 0.5 }}>{periods[1].label}</button>
        <button disabled style={{ ...inertBtn, background: 'var(--sc-foreground)', color: '#fff', opacity: 1 }}>{periods[2].label}</button>
        <button disabled style={{ ...inertBtn, background: 'transparent', color: '#555', opacity: 0.5 }}>{periods[3].label}</button>
      </div>

      {/* Status pills — dimmed as a group, no live counts yet (Phase 10 wires those up) */}
      <div style={{ display: 'inline-flex', background: '#fff', border: '1px solid hsl(120 10% 90%)', borderRadius: 10, padding: 3, opacity: 0.5, pointerEvents: 'none', cursor: 'not-allowed' }}>
        {statusFilters.map((f) => (
          <button key={f.id} disabled style={{ ...inertBtn, background: f.id === 'all' ? 'var(--sc-primary)' : 'transparent', color: f.id === 'all' ? '#fff' : '#555' }}>
            {f.label}
          </button>
        ))}
      </div>

      <div className="search" style={{ width: 220, opacity: 0.5, pointerEvents: 'none', cursor: 'not-allowed' }}>
        <Icon name="search" size={15} style={{ color: 'var(--sc-muted-foreground)' }} />
        <input placeholder={t('h_search')} disabled />
      </div>

      <div style={{ marginLeft: 'auto', opacity: 0.5, pointerEvents: 'none', cursor: 'not-allowed' }}>
        <button className="btn-secondary" disabled>
          <Icon name="download" size={14} /> {t('h_export')}
        </button>
      </div>
    </div>
  );
}
