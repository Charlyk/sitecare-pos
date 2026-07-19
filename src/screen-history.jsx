// HistoryScreen — read-only, day-grouped order history (HIST-05, HIST-13, Phase 7 Plan 04).
// Screen-owns-its-hook: calls its own data hook and does zero derivation inline — every
// filter/group/summary computation is delegated to history-utils.js (Plan 01).

import { useEffect, useMemo, useRef, useState } from 'react';
import { save } from '@tauri-apps/plugin-dialog';
import { writeTextFile } from '@tauri-apps/plugin-fs';
import { useHistoryOrders } from './use-history-orders.js';
import {
  filterFinishedOrders,
  deriveDisplayStatus,
  groupOrdersByDay,
  computeSummary,
  getPresetRange,
  formatDateRange,
  validateCustomRange,
  customRangeToQuery,
  MAX_RANGE_DAYS,
  matchesStatus,
  matchesType,
  matchesSearch,
  buildCsv,
} from './history-utils.js';
import { Icon } from './icons.jsx';
import { useT } from './i18n.jsx';
import { formatRON, orderTimeLabel } from './data.jsx';
import { typeMeta } from './screen-orders.jsx';
import { useAppStore } from './store.js';

// D-06: 8-track grid (7 data columns + a chevron affordance track), replacing the design
// source's 9-track definition. The dropped items-count track and dropped sub-line rows are
// absorbed by widening the customer track (1.6fr/150px min -> 1.8fr/200px min).
const HIST_GRID = '150px minmax(200px, 1.8fr) 118px 78px 116px 132px 116px 34px';

const pad2 = (n) => String(n).padStart(2, '0');

// Module-private (09-05): a local-midnight-safe 'YYYY-MM-DD' formatter for the popover's native
// date inputs — never `.toISOString()`, which would slice at UTC midnight and drift the displayed
// day near the local day boundary (same local-Date-getters convention as history-utils.js).
function toDateInputValue(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

// Module-private (09-05, D-11): the earliest pickable Start value once End is chosen — End minus
// (MAX_RANGE_DAYS - 1) days, the earliest start whose inclusive span (see history-utils.js's
// validateCustomRange spanDays formula) is still within the cap. Imports MAX_RANGE_DAYS rather
// than re-literalling the cap number in this file (D-10).
function minStartFor(endValue) {
  const [y, m, d] = endValue.split('-').map(Number);
  return toDateInputValue(new Date(y, m - 1, d - (MAX_RANGE_DAYS - 1), 0, 0, 0, 0));
}

// D-14 (11-04): converts the resolved `{from, to}` query range into the two YYYY-MM-DD values
// driving the CSV export's default filename. `to` is EXCLUSIVE (local midnight of the day AFTER
// the last included day — every range builder in history-utils.js uses this convention), so the
// filename's end date is the INCLUSIVE last day, mirroring formatDateRange's own
// exclusive-to-inclusive-end conversion. Never slice range.to directly — that would name the
// file with tomorrow's date instead of the period's actual last day.
function rangeToFilenameDates(range) {
  const from = toDateInputValue(new Date(range.from));
  const exclusiveEnd = new Date(range.to);
  const inclusiveEnd = new Date(exclusiveEnd.getFullYear(), exclusiveEnd.getMonth(), exclusiveEnd.getDate() - 1, 0, 0, 0, 0);
  const to = toDateInputValue(inclusiveEnd);
  return { from, to };
}

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
  return map[status] ?? { chip: 'chip-slate', tile: 'hsl(210 15% 92%)', ink: '#556', icon: 'help', label: '—' };
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
    if (!period.customRange) return '';
    const locale = lang === 'ro' ? 'ro-RO' : 'en-GB';
    return `${t('h_period_in_range_prefix')} ${formatDateRange(period.customRange.from, period.customRange.to, locale)}`;
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
    if (!period.customRange) return t('h_period_custom');
    const locale = lang === 'ro' ? 'ro-RO' : 'en-GB';
    return formatDateRange(period.customRange.from, period.customRange.to, locale);
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
//
// Phase 10 (D-13/D-14): a second variant renders instead whenever filtersActive is true — the
// filtered-empty copy (h_empty_filtered_title) on the SAME main-line role, no sub-line, and a
// Clear Filters button below it (ErrorBlock's retry-button shape) whose onClick is onClearFilters.
// Variant B never interpolates filter labels into the sentence (D-13's rejected ro/en
// interpolation-trap alternative) — it is a single static i18n string per language.
function EmptyBlock({ t, settledPeriod, lang, filtersActive, onClearFilters }) {
  if (filtersActive) {
    return (
      <div style={{ textAlign: 'center', padding: 48, color: 'var(--sc-muted-foreground)' }}>
        <div style={{ fontSize: 15, fontWeight: 600 }}>{t('h_empty_filtered_title')}</div>
        <button className="btn-secondary" style={{ marginTop: 16 }} onClick={onClearFilters}>
          <Icon name="x" size={14} /> {t('h_clear_filters')}
        </button>
      </div>
    );
  }

  // 09-05 Rule-1 fix: a trailing period is appended UNLESS the phrase already ends with one —
  // D-14's Romanian abbreviated month format ('mar.') already carries a trailing dot for a custom
  // range's end date, and naively appending a second one produced "17 mar.." (double-dot), first
  // exposed now that the custom branch (this plan) exercises EmptyBlock's sentence composition
  // for the first time with a phrase that can itself end in punctuation.
  const phrase = periodPhrase(settledPeriod, t, lang);
  const mainLine = phrase.endsWith('.') ? `${t('h_empty_prefix')} ${phrase}` : `${t('h_empty_prefix')} ${phrase}.`;
  return (
    <div style={{ textAlign: 'center', padding: 48, color: 'var(--sc-muted-foreground)' }}>
      <div style={{ fontSize: 15, fontWeight: 600 }}>{mainLine}</div>
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

function HistoryRow({ order, lang, t, onOpenOrder }) {
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
        {orderTimeLabel(order.placedAt, lang)}
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
        <HistoryRow key={order.id} order={order} lang={lang} t={t} onOpenOrder={onOpenOrder} />
      ))}
    </>
  );
}

export function HistoryScreen({ lang, onOpenOrder, isOffline }) {
  const t = useT(lang);
  const pushToast = useAppStore((s) => s.pushToast);

  // Phase 12 Plan 03 (D-02/D-04): period/status/type/search selection now lives in the
  // session-only historySelection store slice (added Task 1) instead of four component-local
  // useState calls, so the selection survives the History -> history-detail -> Back round-trip
  // (HistoryScreen unmounts on the history-detail route). One selector for the whole object (not
  // an inline literal, which would allocate a new reference every render) plus a single
  // destructure below.
  const historySelection = useAppStore((s) => s.historySelection);
  const setHistorySelection = useAppStore((s) => s.setHistorySelection);
  const { period: selectedPeriod, statusFilter, typeFilter, query } = historySelection;

  // HIST-04: the active period is resolved to a { from, to } range exactly once per state
  // transition, memoized on the selected period — never recomputed inline in the render body
  // (RESEARCH Pitfall 1). getPresetRange returns null for 'custom' (09-05 territory) and any
  // unrecognized id; the hook's enabled guard turns that into "no request" rather than a request
  // with undefined params.
  // 09-05: selectedPeriod is { id } for a preset, or { id: 'custom', customRange: {from,to} }
  // once a custom range has been applied — customRange is absent until Apply fires (D-02).
  const range = useMemo(() => {
    if (selectedPeriod.id === 'custom') return selectedPeriod.customRange ?? null;
    return getPresetRange(selectedPeriod.id);
  }, [selectedPeriod]);
  const { data, isLoading, isError, isFetching, isPlaceholderData, isSuccess, refetch } = useHistoryOrders(range ?? {});

  // D-06/WR-03 (09-REVIEW.md): settledPeriod tracks the range that actually PRODUCED the visible
  // data — advances only once the query succeeds with real (non-placeholder) data. Every
  // period-dependent render (tile sub-labels, empty-state copy) reads settledPeriod; ONLY the
  // pill styling reads selectedPeriod.
  //
  // WR-03 fix: this is derived with a ref updated DURING render (React's documented
  // "adjust state during render" pattern for derived state), not via useEffect. useEffect runs
  // after paint — when the in-flight query resolves, `data`/`finished`/`summary` are recomputed
  // from the new range in that same render, but the old useEffect-driven settledPeriod hadn't
  // advanced yet, so the browser could paint one frame of new numbers next to the OLD period's
  // label before the effect fired a correcting re-render. Updating the ref synchronously in the
  // render body closes that window: settledPeriod and the numbers it labels can never disagree on
  // a paint, by construction.
  const settledPeriodRef = useRef(selectedPeriod);
  if (isSuccess && !isPlaceholderData && settledPeriodRef.current !== selectedPeriod) {
    settledPeriodRef.current = selectedPeriod;
  }
  const settledPeriod = settledPeriodRef.current;

  // 09-05/D-04: a preset click always clears any applied custom range — writing a `period` with
  // no customRange field reverts the Custom pill and a reopened popover starts blank. FilterBar
  // owns the Custom pill's own click (it toggles the popover locally); this handler is only ever
  // invoked with a preset id. Phase 12 Plan 03: routed through setHistorySelection (D-02).
  const handleSelectPeriod = (id) => {
    setHistorySelection({ period: { id } });
  };

  // 09-05/D-03: fired by the popover's Apply button. This is the ONLY place the period gets a
  // customRange — the pill's dates and the fetched range therefore cannot diverge by construction
  // (T-09-19). Phase 12 Plan 03: routed through setHistorySelection (D-02).
  const handleApplyCustomRange = (customRange) => {
    setHistorySelection({ period: { id: 'custom', customRange } });
  };

  // Phase 10 (HIST-07/08/09): status/type/search filters, colocated with the period state above
  // but NOT keyed to it — D-12 requires all three to survive a period switch, so none of this is
  // derived from or reset by `selectedPeriod`/`range`. Phase 12 Plan 03: statusFilter/typeFilter/
  // query now come from the historySelection destructure above; setters route through
  // setHistorySelection (D-02/D-04). debouncedQuery stays LOCAL — it is a derived UI timing value,
  // not shared selection — but is seeded from the restored query so the first post-Back render
  // shows correctly-filtered rows with no one-frame unfiltered flash (Pitfall 4).
  const [debouncedQuery, setDebouncedQuery] = useState(() => historySelection.query);
  const setStatusFilter = (v) => setHistorySelection({ statusFilter: v });
  const setTypeFilter = (v) => setHistorySelection({ typeFilter: v });
  const setQuery = (v) => setHistorySelection({ query: v });

  // D-10: 250ms debounce on typing; clearing/emptying the box applies immediately (no timer) —
  // widening a result set has no cost, and waiting to see MORE reads as broken. Cleanup cancels a
  // superseded keystroke's pending apply (RESEARCH Pitfall 3).
  useEffect(() => {
    if (query === '') {
      setDebouncedQuery('');
      return;
    }
    const id = setTimeout(() => setDebouncedQuery(query), 250);
    return () => clearTimeout(id);
  }, [query]);

  const finished = useMemo(() => filterFinishedOrders(data ?? []), [data]);

  // D-01/D-02: two derived sets, one pass apart — byTypeAndSearch (type+search only) feeds the
  // faceted status counts AND is the seed for `visible`; a single `.filter()` cannot produce both
  // the exclude-self counts and the fully-filtered rows (RESEARCH Pattern 1 / Pitfall 1).
  const byTypeAndSearch = useMemo(
    () => finished.filter((o) => matchesType(o, typeFilter) && matchesSearch(o, debouncedQuery)),
    [finished, typeFilter, debouncedQuery]
  );

  // Full filter (status too) — feeds rows/day-groups/summary (D-04).
  const visible = useMemo(
    () => byTypeAndSearch.filter((o) => matchesStatus(o, statusFilter)),
    [byTypeAndSearch, statusFilter]
  );

  // HIST-12 (11-04): serializes the CURRENTLY VISIBLE filtered/searched/period-scoped set —
  // never getOrder-hydrates or issues a new fetch (D-07). Research Pattern 2 / Pitfall 3: a
  // cancelled save() dialog (path falsy) is an explicit silent no-op BEFORE writeTextFile is ever
  // called — it must never fall into the catch block's error toast. Only a genuine save()/
  // writeTextFile() throw reaches the catch. No in-app pending/disabled state is shown (loading
  // coverage) — the CSV builds synchronously and only the native dialog is async.
  const handleExportCsv = async () => {
    try {
      const csv = buildCsv(visible);
      const { from: fromDateStr, to: toDateStr } = rangeToFilenameDates(range);
      const path = await save({
        defaultPath: `orders_${fromDateStr}_${toDateStr}.csv`,
        filters: [{ name: 'CSV', extensions: ['csv'] }],
      });
      if (!path) return; // user canceled — silent no-op, never an error toast (Pitfall 3)
      await writeTextFile(path, csv);
      const count = visible.length;
      const noun = t(count === 1 ? 'h_orders_count_one' : 'h_orders_count_other');
      pushToast({ id: Date.now(), kind: 'success', title: t('toast_saved'), detail: `${count} ${noun}` });
    } catch (err) {
      pushToast({ id: Date.now(), kind: 'error', title: t('h_export_error_title'), detail: String(err) });
    }
  };

  // D-02: exclude-self faceting — tallied via deriveDisplayStatus over byTypeAndSearch (never
  // subtraction, RESEARCH Pitfall 1), so a sibling pill's count is unaffected by the status
  // selection itself. `all` = byTypeAndSearch.length (D-02).
  const statusCounts = useMemo(() => {
    const counts = { all: 0, completed: 0, refunded: 0, canceled: 0 };
    for (const o of byTypeAndSearch) {
      counts.all += 1;
      const status = deriveDisplayStatus(o);
      if (status) counts[status] += 1;
    }
    return counts;
  }, [byTypeAndSearch]);

  const days = useMemo(() => groupOrdersByDay(visible), [visible]);
  const summary = useMemo(() => computeSummary(visible), [visible]);

  // D-13/D-14: filtersActive selects EmptyBlock's Variant B (filtered-empty copy + Clear Filters)
  // over Variant A (period copy) — a simple boolean, not a new derivation layer. handleClearFilters
  // resets the three filter axes ONLY; it must never touch selectedPeriod/setHistorySelection's
  // period key (D-12 — period and filters are separate axes; clearing filters must not silently
  // retarget the fetch).
  const filtersActive = statusFilter !== 'all' || typeFilter !== 'all' || query !== '';
  const handleClearFilters = () => {
    setStatusFilter('all');
    setTypeFilter('all');
    setQuery('');
  };

  const isEmpty = !isLoading && !isError && days.length === 0;
  // D-05/WR-02 (09-REVIEW.md): a switch is a fetch that is also showing placeholder data for a
  // NEW query key — isPlaceholderData is only true while keepPreviousData is standing in for a
  // range that changed, never for a background revalidation of the SAME range (TanStack Query's
  // default refetchOnWindowFocus fires one of those every window-refocus past staleTime, with
  // isFetching true but isPlaceholderData false since the key didn't change). Gating on
  // isPlaceholderData too means a passive background refetch no longer dims rows/tiles or shows
  // the switch spinner — only a genuine user-initiated period change does.
  const isSwitching = isFetching && isPlaceholderData;

  return (
    <div className="content-pad">
      <SummaryStrip
        t={t}
        isLoading={isLoading}
        isError={isError}
        isFetching={isFetching}
        isPlaceholderData={isPlaceholderData}
        summary={summary}
        settledPeriod={settledPeriod}
        lang={lang}
      />
      <FilterBar
        t={t}
        lang={lang}
        selectedPeriod={selectedPeriod}
        onSelectPeriod={handleSelectPeriod}
        onApplyCustomRange={handleApplyCustomRange}
        isFetching={isFetching}
        isPlaceholderData={isPlaceholderData}
        isLoading={isLoading}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        typeFilter={typeFilter}
        setTypeFilter={setTypeFilter}
        query={query}
        setQuery={setQuery}
        statusCounts={statusCounts}
        exportDisabled={visible.length === 0}
        onExportCsv={handleExportCsv}
      />

      <div className="card" style={{ overflow: 'hidden' }}>
        <TableHeaderRow t={t} />
        {isLoading && Array.from({ length: 7 }).map((_, i) => <SkeletonRow key={i} />)}
        {!isLoading && isError && <ErrorBlock t={t} onRetry={() => refetch()} />}
        {!isLoading && !isError && isEmpty && (
          <EmptyBlock
            t={t}
            settledPeriod={settledPeriod}
            lang={lang}
            filtersActive={filtersActive}
            onClearFilters={handleClearFilters}
          />
        )}
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
// suffix are NOT period-dependent (untouched). D-05/WR-02: dimmed also covers a genuine period
// switch (isFetching && isPlaceholderData), reusing the tile-dimming visual already built for
// first-load/error — no shimmer skeleton on a switch, since keepPreviousData guarantees a
// previous value to dim. isPlaceholderData excludes a same-range background refetch (WR-02).
function SummaryStrip({ t, isLoading, isError, isFetching, isPlaceholderData, summary, settledPeriod, lang }) {
  const periodSub = periodLabel(settledPeriod, t, lang);
  const tiles = [
    { key: 'orders', label: t('h_orders'), value: String(summary.ordersCount), sub: periodSub, tint: 'sage', icon: 'receipt' },
    { key: 'revenue', label: t('h_revenue'), value: formatRON(summary.revenue), sub: periodSub, tint: 'sage', icon: 'ron' },
    {
      key: 'avg',
      label: t('h_avg'),
      // D-15: the em-dash keeps exactly one meaning on this screen — a true fetch error. A status
      // filter (Canceled/Refunded-only) can now reduce completedCount to 0 while rows stay on
      // screen (avg === null, isError false) — that case must render a computed 0, not '—'.
      value: summary.avg === null ? (isError ? '—' : formatRON(0)) : formatRON(summary.avg),
      sub: t('h_avg_sub'),
      tint: 'slate',
      icon: 'percent',
    },
    { key: 'refunds', label: t('h_refunds'), value: String(summary.refundsCount), sub: `${summary.canceledCount} ${t('h_canceled_suffix')}`, tint: 'terra', icon: 'refresh' },
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
      {tiles.map((tile) => {
        const dimmed = isLoading || isError || (isFetching && isPlaceholderData);
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

// Custom-range popover (09-05, HIST-04 SC2) — the phase's one genuinely net-new visual surface.
// Chrome copied verbatim from shell.jsx:148-150 (the app's only other popover); the outside-click
// dismissal effect copied from shell.jsx:20-28 and extended with an Escape listener (UI-SPEC).
// Exported (not truly module-private) so this component is directly unit-testable in isolation,
// ahead of 09-05 Task 2 wiring it into FilterBar — same reuse-precedent as historyStatusMeta.
// Both dates live in local state per D-02: nothing here fetches; onApply fires only from the
// Apply button's click handler, and only once validateCustomRange has passed.
// WR-01 (09-REVIEW.md): containerRef is an OPTIONAL boundary ref supplied by the caller
// (FilterBar passes a ref to the wrapper that contains BOTH the toggle button and this popover,
// mirroring shell.jsx:148's userMenuRef precedent). When provided, it — not panelRef — decides
// "inside" for the outside-click check, so a mousedown on the toggle button is correctly seen as
// inside and never fires onClose. Falls back to panelRef (the popover's own root) when no
// containerRef is supplied, preserving this component's standalone-render behavior for its own
// direct unit tests.
export function CustomRangePopover({ t, onApply, onClose, containerRef }) {
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const panelRef = useRef(null);

  useEffect(() => {
    function handleMouseDown(e) {
      const boundaryRef = containerRef ?? panelRef;
      if (boundaryRef.current && !boundaryRef.current.contains(e.target)) onClose();
    }
    function handleKeyDown(e) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose, containerRef]);

  // D-11: native min/max narrow what is pickable, recomputed as the other field changes. Future
  // dates are excluded because History is finished-only (P7 D-01), and a future range is
  // guaranteed empty.
  const todayStr = toDateInputValue(new Date());
  const startMax = end || todayStr;
  const startMin = end ? minStartFor(end) : undefined;

  // D-11: the Apply-time check re-runs regardless of the native min/max, because typed values
  // bypass those entirely — validateCustomRange is the authoritative gate on every render AND at
  // click time.
  const reason = validateCustomRange(start, end);
  const disabled = reason !== null;

  const handleApply = () => {
    if (validateCustomRange(start, end) !== null) return;
    onApply(customRangeToQuery(start, end));
    onClose();
  };

  return (
    <div
      ref={panelRef}
      data-testid="history-range-popover"
      style={{
        position: 'absolute',
        top: 'calc(100% + 6px)',
        left: 0,
        background: '#fff',
        border: '1px solid hsl(120 10% 88%)',
        borderRadius: 10,
        boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
        zIndex: 50,
        width: 280,
        padding: 16,
      }}
    >
      <div style={{ display: 'flex', gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--sc-muted-foreground)' }}>
            {t('h_range_start')}
          </div>
          <input
            type="date"
            data-testid="history-range-start"
            value={start}
            max={startMax}
            min={startMin}
            onChange={(e) => setStart(e.target.value)}
            style={{ width: '100%', marginTop: 4, fontFamily: 'inherit' }}
          />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--sc-muted-foreground)' }}>
            {t('h_range_end')}
          </div>
          <input
            type="date"
            data-testid="history-range-end"
            value={end}
            max={todayStr}
            onChange={(e) => setEnd(e.target.value)}
            style={{ width: '100%', marginTop: 4, fontFamily: 'inherit' }}
          />
        </div>
      </div>

      {reason === 'too-long' && (
        <div data-testid="history-range-cap" style={{ fontSize: 11, fontWeight: 600, color: 'var(--sc-destructive)', marginTop: 8 }}>
          {t('h_range_cap_message')}
        </div>
      )}

      <div style={{ marginTop: 16, textAlign: 'right' }}>
        <button
          className="btn-primary"
          data-testid="history-range-apply"
          disabled={disabled}
          onClick={handleApply}
          style={disabled ? { opacity: 0.45, cursor: 'not-allowed' } : {}}
        >
          {t('h_range_apply')}
        </button>
      </div>
    </div>
  );
}

// Filter bar (D-14/HIST-04, Phase 10 HIST-07/08/09, Phase 11 HIST-12): period presets, status
// pills (with live faceted counts, F-03 order), the net-new type-filter group, search, and Export
// (HIST-12, 11-04) are all LIVE.
function FilterBar({
  t, lang, selectedPeriod, onSelectPeriod, onApplyCustomRange, isFetching, isPlaceholderData, isLoading,
  statusFilter, setStatusFilter, typeFilter, setTypeFilter, query, setQuery, statusCounts,
  exportDisabled, onExportCsv,
}) {
  // 09-05/D-04: the popover unmounts entirely when closed (rangeOpen false) so its blank local
  // state is genuinely fresh on each open — nothing is remembered across a close/reopen cycle.
  const [rangeOpen, setRangeOpen] = useState(false);
  // WR-01: boundary ref for the outside-click check — attached below to the wrapper `<div>` that
  // contains BOTH the Custom pill's toggle button and CustomRangePopover, matching shell.jsx:148's
  // userMenuRef precedent exactly. Without this, a real mousedown->click on the toggle button
  // while open registers as "outside" (closes) then "click" (reopens) — the popover can never be
  // dismissed by re-clicking the pill.
  const customWrapperRef = useRef(null);

  // D-12: preset labels go through the same periodLabel() the tile sub-label reads — one lookup
  // site, so pill and tile cannot drift. D-03/09-05: the Custom pill's own label is the applied
  // range (via the same periodLabel helper) ONLY while selectedPeriod.id === 'custom' carries a
  // customRange; otherwise it is the static t('h_period_custom') label, never fed a bogus
  // from/to — this is the invariant that keeps the pill from ever advertising a range that is
  // not live (T-09-19).
  const customPillLabel = selectedPeriod.id === 'custom' && selectedPeriod.customRange
    ? periodLabel(selectedPeriod, t, lang)
    : t('h_period_custom');
  const periods = [
    { id: 'today', label: periodLabel({ id: 'today' }, t, lang) },
    { id: '7', label: periodLabel({ id: '7' }, t, lang) },
    { id: '30', label: periodLabel({ id: '30' }, t, lang) },
    { id: 'custom', label: customPillLabel },
  ];
  // F-03: corrected order — All / Completed / Refunded / Canceled (production's inert bar had
  // Canceled before Refunded; the design/REQUIREMENTS wording is authoritative).
  const statusFilters = [
    { id: 'all', label: t('all') },
    { id: 'completed', label: t('h_status_completed') },
    { id: 'refunded', label: t('h_status_refunded') },
    { id: 'canceled', label: t('h_status_canceled') },
  ];
  // F-03: net-new type-filter group (never ported before this phase) — no count badge
  // (screenshot evidence, Type Filter Contract), cream/sage selected treatment ported verbatim.
  const typeFilters = [
    { id: 'all', label: t('all'), icon: 'grid' },
    { id: 'delivery', label: t('delivery'), icon: 'moped' },
    { id: 'pickup', label: t('pickup'), icon: 'bag' },
    { id: 'dinein', label: t('dinein'), icon: 'utensils' },
  ];
  // Live pills get their own style constant: same border/padding/radius/weight, but
  // cursor: pointer and no pointerEvents override — no opacity override either, since 0.5 was
  // the inert marker and these pills are no longer inert (UI-SPEC Period Pills Contract).
  const periodBtn = { border: 0, padding: '7px 12px', borderRadius: 8, fontWeight: 600, fontSize: 13, fontFamily: 'inherit', cursor: 'pointer' };
  // D-05/WR-02: a switch is a fetch that is also showing placeholder data for a NEW range — see
  // the matching comment on HistoryScreen's isSwitching for the full background-refetch rationale.
  const isSwitching = isFetching && isPlaceholderData;

  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
      {/* Period presets — live (HIST-04). Mapped (not unrolled) so styling is state-driven per
          UI-SPEC's Period Pills Contract: selected -> var(--sc-foreground)/#fff, unselected ->
          transparent/#555. Container chrome (bg/border/radius/padding) is untouched. */}
      <div style={{ display: 'inline-flex', background: '#fff', border: '1px solid hsl(120 10% 90%)', borderRadius: 10, padding: 3 }}>
        {periods.map((p) => {
          const selected = selectedPeriod.id === p.id;
          const pillStyle = {
            ...periodBtn,
            background: selected ? 'var(--sc-foreground)' : 'transparent',
            color: selected ? '#fff' : '#555',
          };

          if (p.id !== 'custom') {
            return (
              <button
                key={p.id}
                data-testid="history-period-pill"
                onClick={() => { setRangeOpen(false); onSelectPeriod(p.id); }}
                style={pillStyle}
              >
                {p.label}
              </button>
            );
          }

          // D-01/09-05: position:relative wraps the Custom pill button ONLY — not the whole
          // segmented-control group (UI-SPEC Custom Range Popover Contract). Clicking it toggles
          // the popover open/closed regardless of whether a range is currently applied.
          return (
            <div key={p.id} ref={customWrapperRef} style={{ position: 'relative' }}>
              <button
                data-testid="history-period-pill"
                onClick={() => setRangeOpen((open) => !open)}
                style={{ ...pillStyle, display: 'inline-flex', alignItems: 'center', gap: 4 }}
              >
                {p.label}
                <Icon name="chevDown" size={14} />
              </button>
              {rangeOpen && (
                <CustomRangePopover
                  t={t}
                  onApply={onApplyCustomRange}
                  onClose={() => setRangeOpen(false)}
                  containerRef={customWrapperRef}
                />
              )}
            </div>
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

      {/* Status pills — activated (HIST-07): live faceted counts (D-01/D-02), F-03 order.
          D-03: a 0-count pill stays clickable and reads 0 — no disable, no dim. */}
      <div style={{ display: 'inline-flex', background: '#fff', border: '1px solid hsl(120 10% 90%)', borderRadius: 10, padding: 3 }}>
        {statusFilters.map((f) => {
          const selected = statusFilter === f.id;
          return (
            <button
              key={f.id}
              onClick={() => setStatusFilter(f.id)}
              style={{
                border: 0, padding: '7px 12px', borderRadius: 8, fontWeight: 600, fontSize: 13,
                fontFamily: 'inherit', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                background: selected ? 'var(--sc-primary)' : 'transparent',
                color: selected ? '#fff' : '#555',
              }}
            >
              {f.label}
              <span
                style={{
                  fontSize: 11, fontWeight: 700, padding: '1px 6px', borderRadius: 999,
                  color: 'currentColor',
                  background: selected ? 'rgba(255,255,255,0.25)' : 'hsl(120 10% 90%)',
                }}
              >
                {statusCounts[f.id]}
              </span>
            </button>
          );
        })}
      </div>

      {/* Type pills — net-new (HIST-08/F-03), no count badge (Type Filter Contract). Cream/sage
          selected treatment is the design's own choice — a third distinct selected register in
          this bar, ported as drawn. */}
      <div style={{ display: 'inline-flex', background: '#fff', border: '1px solid hsl(120 10% 90%)', borderRadius: 10, padding: 3 }}>
        {typeFilters.map((f) => {
          const selected = typeFilter === f.id;
          return (
            <button
              key={f.id}
              onClick={() => setTypeFilter(f.id)}
              style={{
                border: 0, padding: '7px 11px', borderRadius: 8, fontWeight: 600, fontSize: 13,
                fontFamily: 'inherit', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                background: selected ? '#f7f1e1' : 'transparent',
                color: selected ? 'var(--sc-primary)' : '#777',
              }}
            >
              <Icon name={f.icon} size={13} /> {f.label}
            </button>
          );
        })}
      </div>

      {/* D-07: ONE marginLeft:auto container holding BOTH search and Export, so they wrap
          together to a right-aligned row 2. Search is activated (HIST-09); Export is activated
          (HIST-12, 11-04) — disabled+greyed+tooltipped only when the visible set is empty (the
          project's greyed-out-not-hidden convention, D-05 dimming values, not a hidden button). */}
      <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
        <div className="search" style={{ width: 220 }}>
          <Icon name="search" size={15} style={{ color: 'var(--sc-muted-foreground)' }} />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t('h_search')} />
        </div>
        <button
          className="btn-secondary"
          disabled={exportDisabled}
          onClick={onExportCsv}
          title={exportDisabled ? t('h_export_empty_tooltip') : undefined}
          style={exportDisabled ? { opacity: 0.5, pointerEvents: 'none', cursor: 'not-allowed' } : {}}
        >
          <Icon name="download" size={14} /> {t('h_export')}
        </button>
      </div>
    </div>
  );
}
