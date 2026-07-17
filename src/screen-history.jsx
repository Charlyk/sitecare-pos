// HistoryScreen — read-only, day-grouped order history (HIST-05, HIST-13, Phase 7 Plan 04).
// Screen-owns-its-hook: calls its own data hook and does zero derivation inline — every
// filter/group/summary computation is delegated to history-utils.js (Plan 01).

import { useEffect, useMemo, useState } from 'react';
import { useHistoryOrders } from './use-history-orders.js';
import {
  filterFinishedOrders,
  deriveDisplayStatus,
  groupOrdersByDay,
  computeSummary,
  getPresetRange,
  formatDateRange,
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

// D-13: module-private prepositional-copy helper for the empty-state sentence — the pill/tile
// labels (periodLabel, below) do NOT survive interpolation in Romanian ("Nicio comandă în Azi"
// is broken), so this is a second, parallel label family worded to sit inside a sentence.
function periodPhrase(period, t, lang) {
  if (period.id === 'today') return t('h_period_today').toLowerCase(); // 'azi' — bare adverb, no preposition needed
  if (period.id === '7') return t('h_period_in_7');
  if (period.id === '30') return t('h_period_in_30');
  if (period.id === 'custom') {
    const locale = lang === 'ro' ? 'ro-RO' : 'en-GB';
    return `${t('h_period_in_range_prefix')} ${formatDateRange(period.from, period.to, locale)}`;
  }
  return '';
}

// D-12: module-private pill/tile label helper — the ONE lookup site both the pill's .map() and
// the tile's sub-label go through, so they cannot drift. Presets reuse the existing h_period_*
// keys verbatim; custom uses D-14's formatted range (not reachable until 09-05, written now so
// that plan doesn't have to reopen this function).
function periodLabel(period, t, lang) {
  if (period.id === 'today') return t('h_period_today');
  if (period.id === '7') return t('h_period_7');
  if (period.id === '30') return t('h_period_30');
  if (period.id === 'custom') {
    const locale = lang === 'ro' ? 'ro-RO' : 'en-GB';
    return formatDateRange(period.from, period.to, locale);
  }
  return '';
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

// D-13: main line is h_empty_prefix + the settled period's prepositional phrase + a trailing
// full stop appended HERE (h_empty_prefix deliberately carries none). settledPeriod, never
// selectedPeriod — a stale period label above the wrong empty state would be the same false
// financial claim D-06 exists to prevent. h_empty_sub is unchanged, on its own line (P7 D-13
// reserves it for Phase 10's filter copy).
function EmptyBlock({ t, settledPeriod, lang }) {
  return (
    <div style={{ textAlign: 'center', padding: 48, color: 'var(--sc-muted-foreground)' }}>
      <div style={{ fontSize: 15, fontWeight: 600 }}>{`${t('h_empty_prefix')} ${periodPhrase(settledPeriod, t, lang)}.`}</div>
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

  // HIST-04: the active period is resolved to a { from, to } range exactly once per state
  // transition, memoized on the selected period — never recomputed inline in the render body
  // (RESEARCH Pitfall 1). getPresetRange returns null for 'custom' (09-05 territory) and any
  // unrecognized id; the hook's enabled guard turns that into "no request" rather than a request
  // with undefined params.
  const [selectedPeriod, setSelectedPeriod] = useState({ id: '30' });
  const range = useMemo(() => getPresetRange(selectedPeriod.id), [selectedPeriod]);
  const { data, isLoading, isError, isFetching, isPlaceholderData, isSuccess, refetch } = useHistoryOrders(range ?? {});

  // D-06: settledPeriod tracks the range that actually PRODUCED the visible data — advances only
  // once the query succeeds with real (non-placeholder) data. Every period-dependent render (tile
  // sub-labels, empty-state copy) reads settledPeriod; ONLY the pill styling reads selectedPeriod.
  const [settledPeriod, setSettledPeriod] = useState(selectedPeriod);
  useEffect(() => {
    if (isSuccess && !isPlaceholderData) {
      setSettledPeriod(selectedPeriod);
    }
  }, [isSuccess, isPlaceholderData, selectedPeriod]);

  // 'custom' resolves to a null range (09-05 wires the popover); until then the pill click is a
  // deliberate one-wave no-op so the screen never lights a pill above data from another period.
  const handleSelectPeriod = (id) => {
    if (id === 'custom') return;
    setSelectedPeriod({ id });
  };

  const finished = useMemo(() => filterFinishedOrders(data ?? []), [data]);
  const days = useMemo(() => groupOrdersByDay(finished), [finished]);
  const summary = useMemo(() => computeSummary(finished), [finished]);

  const isEmpty = !isLoading && !isError && days.length === 0;
  // D-05: a switch is any fetch after the first successful load — isLoading is false for the
  // remainder of the component's life once data has landed once (RESEARCH Pitfall 2).
  const isSwitching = isFetching && !isLoading;

  return (
    <div className="content-pad">
      <SummaryStrip
        t={t}
        isLoading={isLoading}
        isError={isError}
        isFetching={isFetching}
        isEmptyState={isEmpty}
        summary={summary}
        settledPeriod={settledPeriod}
        lang={lang}
      />
      <FilterBar
        t={t}
        lang={lang}
        selectedPeriod={selectedPeriod}
        onSelectPeriod={handleSelectPeriod}
        isFetching={isFetching}
        isLoading={isLoading}
      />

      <div className="card" style={{ overflow: 'hidden' }}>
        <TableHeaderRow t={t} />
        {isLoading && Array.from({ length: 7 }).map((_, i) => <SkeletonRow key={i} />)}
        {!isLoading && isError && <ErrorBlock t={t} onRetry={() => refetch()} />}
        {!isLoading && !isError && isEmpty && <EmptyBlock t={t} settledPeriod={settledPeriod} lang={lang} />}
        {!isLoading && !isError && !isEmpty && (
          <div data-testid="history-rows" style={{ opacity: isSwitching ? 0.6 : 1, transition: 'opacity 150ms' }}>
            {days.map((day) => (
              <DayGroup key={day.dayKey} day={day} lang={lang} t={t} onOpenOrder={onOpenOrder} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Summary strip (D-15) — client-computed from the same fetched list groupOrdersByDay uses ───

// D-12: Orders/Revenue sub-labels read the SETTLED period's label (periodLabel — the same source
// the pill reads, D-12) so pill and tile can never drift. Avg's sub and Refunds' canceled-count
// suffix are NOT period-dependent (untouched). D-05: dimmed now also covers isFetching (a period
// switch), reusing the tile-dimming visual already built for first-load/error — no shimmer
// skeleton on a switch, since keepPreviousData guarantees a previous value to dim.
function SummaryStrip({ t, isLoading, isError, isFetching, isEmptyState, summary, settledPeriod, lang }) {
  const periodSub = periodLabel(settledPeriod, t, lang);
  const tiles = [
    { key: 'orders', label: t('h_orders'), value: String(summary.ordersCount), sub: periodSub, tint: 'sage', icon: 'receipt' },
    { key: 'revenue', label: t('h_revenue'), value: formatRON(summary.revenue), sub: periodSub, tint: 'sage', icon: 'ron' },
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
        const dimmed = isLoading || isError || isFetching;
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

// Filter bar (D-14/HIST-04): period presets are now LIVE — clicking a pill retargets the fetch.
// Status pills, search, and export stay inert this phase (Phase 10/11) so those later phases can
// wire them up with zero layout shift.
function FilterBar({ t, lang, selectedPeriod, onSelectPeriod, isFetching, isLoading }) {
  // D-12: preset labels go through the same periodLabel() the tile sub-label reads — one lookup
  // site, so pill and tile cannot drift. 'custom' is not reachable this wave (09-05 wires the
  // applied-range label onto this pill per D-03) — it stays the static t('h_period_custom')
  // label, never fed a bogus from/to.
  const periods = [
    { id: 'today', label: periodLabel({ id: 'today' }, t, lang) },
    { id: '7', label: periodLabel({ id: '7' }, t, lang) },
    { id: '30', label: periodLabel({ id: '30' }, t, lang) },
    { id: 'custom', label: t('h_period_custom') },
  ];
  const statusFilters = [
    { id: 'all', label: t('all') },
    { id: 'completed', label: t('h_status_completed') },
    { id: 'canceled', label: t('h_status_canceled') },
    { id: 'refunded', label: t('h_status_refunded') },
  ];
  const inertBtn = { border: 0, padding: '7px 12px', borderRadius: 8, fontWeight: 600, fontSize: 13, fontFamily: 'inherit', cursor: 'not-allowed', pointerEvents: 'none' };
  // Live pills get their own style constant (not inertBtn): same border/padding/radius/weight,
  // but cursor: pointer and no pointerEvents override — no opacity override either, since 0.5 was
  // the inert marker and these pills are no longer inert (UI-SPEC Period Pills Contract).
  const periodBtn = { border: 0, padding: '7px 12px', borderRadius: 8, fontWeight: 600, fontSize: 13, fontFamily: 'inherit', cursor: 'pointer' };
  // D-05: a switch is any fetch after the first successful load (RESEARCH Pitfall 2).
  const isSwitching = isFetching && !isLoading;

  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
      {/* Period presets — live (HIST-04). Mapped (not unrolled) so styling is state-driven per
          UI-SPEC's Period Pills Contract: selected -> var(--sc-foreground)/#fff, unselected ->
          transparent/#555. Container chrome (bg/border/radius/padding) is untouched. */}
      <div style={{ display: 'inline-flex', background: '#fff', border: '1px solid hsl(120 10% 90%)', borderRadius: 10, padding: 3 }}>
        {periods.map((p) => {
          const selected = selectedPeriod.id === p.id;
          return (
            <button
              key={p.id}
              data-testid="history-period-pill"
              onClick={() => onSelectPeriod(p.id)}
              style={{
                ...periodBtn,
                background: selected ? 'var(--sc-foreground)' : 'transparent',
                color: selected ? '#fff' : '#555',
              }}
            >
              {p.label}
            </button>
          );
        })}
      </div>

      {/* D-05 loading affordance — 16px spinning refresh icon, present only during a period
          switch (isFetching with data already on screen), muted-foreground per UI-SPEC (not the
          sage accent, which is reserved for the popover's Apply button). */}
      {isSwitching && (
        <span data-testid="history-switch-spinner" style={{ display: 'inline-flex', color: 'var(--sc-muted-foreground)' }}>
          <Icon name="refresh" size={16} className="spin" />
        </span>
      )}

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
