# Handoff: Owner Dashboard (Acasă / Statistici)

## Overview
A mobile dashboard screen for the **restaurant owner** persona in the SiteCare POS mobile companion app. It is the new **home/first tab** of the owner's app and surfaces business statistics for a selectable date range: total sales, total orders, a per-day combo chart (orders + sales), the top ordered products, and the top delivery zones.

This screen replaces the cashier-oriented home. For the owner build, the **Kitchen ("Bucătărie") tab was removed**, **"Comenzi" moved to second position**, and this **Dashboard ("Acasă") was added as the first tab**.

## About the Design Files
The files in this bundle are **design references created in HTML/React-via-Babel** — a prototype showing intended look and behavior, **not production code to ship directly**. The task is to **recreate this design in the target codebase's existing environment**, using its established patterns, component library, and charting solution.

The real product is **Next.js 16 / React 19 / Tailwind CSS 4 / shadcn-ui / lucide-react** (per the SiteCare design system). In that codebase:
- Rebuild layout with Tailwind utility classes and shadcn primitives, not the inline styles used in the prototype.
- Use a real charting library (e.g. Recharts / visx / Chart.js) for the combo chart rather than the hand-rolled SVG here.
- Use `lucide-react` icons rather than the inline SVG paths.
- Pull copy from the `next-intl` message catalogs (ro primary, en secondary).

If no app environment exists yet, implement in the framework above (it's the product's stack).

## Fidelity
**High-fidelity.** Final colors, typography, spacing, radii, and interactions are specified. Recreate pixel-accurately using the codebase's libraries. All values below are exact.

## Screen: Owner Dashboard ("Acasă")

**Frame:** iOS, 390 × 844 (design width). Cream page background, scrollable content region between a fixed header and a fixed bottom tab bar.

**Vertical structure (top → bottom):**
1. iOS status bar + Dynamic Island (device chrome — provided by the OS / app shell, not part of this feature).
2. **Header (BrandBar)** — fixed, padding `66px 20px 14px`.
   - Eyebrow: handwritten script, terracotta, 17px/700, text `"bună, Eduard"` (Caveat font).
   - Title: 24px/900, letter-spacing −0.02em, text `"Panou"`.
   - Right: 38×38 circular avatar, terracotta bg, white initials `"DS"`, 13px/800.
3. **Scroll region** — `padding: 0 16px 120px`, `overflow-y: auto`, height `calc(100% − 135px)`. Contains, in order:
   - Date range picker card
   - Two KPI cards (row)
   - Section label + chart card
   - Section label + Top products list
   - Section label + Delivery zones list
4. **Owner tab bar** — fixed bottom, 92px tall.

### Component: Date range picker card
- Card: white bg, `border 1px` slate hairline, radius **18px**, padding 12px, margin-bottom 14px.
- **Preset chips row** (horizontal scroll, gap 8): pills, padding `6px 12px`, radius full, 12px/700.
  - Inactive: cream bg (`--m-bg`), muted text, 1px border.
  - Active (`"30 zile"`): foreground/near-black bg, white text, no border.
  - Chips: `Azi`, `7 zile`, `30 zile` (active), `Personalizat`.
- **Date fields row** (flex, gap 8, align center):
  - Two fields (flex 1 each): cream bg, 1px border, radius 12px, padding `9px 11px`; each shows a 14px calendar icon (sage stroke) + label 13px/700 (`"6 mai"`, `"4 iun"`).
  - Between the two fields: a 14px right-arrow icon (muted stroke).
  - **`Aplică` button**: sage bg `hsl(120 14% 49%)`, white text 13px/800, radius 12px, height 38px, padding `0 16px`.
- **Caption** below: 11px/600 muted, `"6 mai – 4 iun 2026 · 30 de zile"`.

### Component: KPI cards (row of two, gap 10, margin-bottom 14)
Each: flex 1, white bg, 1px border, radius 18px, padding `14px 14px 15px`.
- Label: 11px/700 muted.
  - Card 1: `"Total vânzări"`. Value: `2.819` at 24px/900 (letter-spacing −0.03em, tabular-nums) + `",00 lei"` at 13px/700 muted.
  - Card 2: `"Total comenzi"`. Value: `28` at 24px/900.
- **Delta chip** (below value, margin-top 9): inline pill, sage-soft bg `hsl(120 14% 49% / 0.12)`, sage text, 10.5px/800, padding `2px 7px`, radius full, with a small up-chevron icon. Card 1 = `12%`, Card 2 = `5%`. (Represents change vs. previous period.)

### Component: Combo chart card (interactive — tap a day)
- Preceding section label: 11px/800 uppercase muted, letter-spacing 0.08em, text `"Comenzi & vânzări pe zi"`.
- Card: white bg, 1px border, radius 18px, padding `14px 12px 12px`, margin-bottom 18px.
- **This chart has no per-day x-axis labels.** Instead, each day is a tap target and the **selected day's stats fill a readout card above the plot.** The chart opens with the **best-sales day pre-selected** (highest `sales`; the sample data → `30/05`).

- **Stats readout card** (sits at the top of the chart card, above the SVG):
  - Container: cream bg (`--m-bg`), 1px border, radius **14px**, padding `11px 13px 12px`, margin-bottom 12px.
  - **Header row** (flex, space-between, align baseline):
    - Left: weekday name 14.5px/900 (letter-spacing −0.01em, fg) + full date 12px/600 muted — e.g. `"Sâmbătă"` + `"30 mai"`.
    - Right (conditional): **"Cea mai bună zi"** badge — only shown when the selected day is the peak-sales day. Inline pill, sage-soft bg, sage text, 10px/800, padding `3px 8px`, radius full, small up-chevron icon.
  - **Stats row** (flex, three equal cells separated by 1px vertical dividers):
    1. Sage dot + label `"Comenzi"` (10px/700 uppercase muted) over value (19px/900, tabular-nums) — selected day's orders.
    2. Terracotta dot + label `"Vânzări"` over value + ` lei` unit (11px/700 muted) — selected day's sales.
    3. No dot + label `"Medie/com."` over value + ` lei` — average order value, computed `round(sales / orders)`.

- **Chart** — combo bar + line, SVG viewBox `0 0 330 188`, rendered at 100% width. Dual aligned Y-axes:
  - **Left axis** = orders count, max **8**, ticks `0,2,4,6,8` (muted color).
  - **Right axis** = sales (lei), max **800**, ticks `0,200,400,600,800` (terracotta color). Axes are aligned so left-tick × 100 = right-tick.
  - Horizontal gridlines at each tick (slate hairline).
  - **Selected-day highlight column**: a sage-soft (`hsl(120 14% 49% / 0.12)`) rounded rect (radius 6px) spanning the full band width and plot height, drawn *behind* the gridlines/bars.
  - **Bars** = orders/day: sage fill `hsl(120 14% 49%)`, width ≈ 22px (≤52% of band), top corners radius 4px. **Selected bar = full opacity; all other bars dimmed to opacity 0.32.**
  - **Line** = sales/day: terracotta `hsl(0 53% 58%)`, 2.4px stroke at 0.9 opacity, **smooth** (Catmull-Rom → cubic bézier). Dot markers at each point: **selected = 5px radius, solid terracotta fill**; unselected = 3.2px radius, white/card fill, 2px terracotta stroke.
  - **Selected-day label only**: the chosen day's short date (`30/05`) prints centered under its column, 9.5px/800 fg. No other x labels render.
  - **Tap targets**: one full-height transparent `rect` per day (spanning band width × full plot height, `cursor: pointer`); clicking sets the selected index.
- **Legend** (below chart, centered, gap 16): `■ Comenzi` (sage 12px square) and `●— Vânzări` (terracotta line + ringed dot). 11px/700 muted.
- **Sample data** (7 days; each datum carries short date, weekday, full date, orders, sales):
  | short | weekday (dow) | full | Orders (bar) | Sales lei (line) |
  |-----|-----|-----|-----|-----|
  | 28/05 | Joi | 28 mai | 3 | 280 |
  | 29/05 | Vineri | 29 mai | 4 | 360 |
  | 30/05 | Sâmbătă | 30 mai | 7 | 700 |
  | 31/05 | Duminică | 31 mai | 1 | 110 |
  | 01/06 | Luni | 1 iun | 4 | 400 |
  | 02/06 | Marți | 2 iun | 5 | 620 |
  | 03/06 | Miercuri | 3 iun | 4 | 349 |

  (Note: the prototype shows 7 days for mobile legibility; the underlying range is 30 days. Production should aggregate the selected range into a sensible number of buckets, and dynamically scale both axis maxima with "nice" rounded tick steps rather than the fixed 8 / 800 used here. Weekday/full-date strings should come from the locale date formatter, not be hardcoded.)

### Component: Top products list ("Top produse comandate")
- Preceding section label (same style as above): `"Top produse comandate"`.
- Card: white bg, 1px border, radius 18px, `overflow: hidden`, margin-bottom 18px.
- **Rows** (`RankRow`): padding `11px 14px`, divider `1px` slate border between rows (none on first).
  - **Proportional track**: an absolutely-positioned sage-soft bar (`hsl(120 14% 49% / 0.12)`) filling from the left, width = `value / max × 100%` (max = top row's value = 28), behind the text.
  - Foreground row (flex, space-between): name 13.5px/700 fg; value 13px/800 fg (tabular-nums) + unit 11px/600 muted.
- **Data:** `Taxă ambalaj 28×`, `Shaorma Mare 21×`, `Shaorma Mică 11×`, `Dr. Sandwich 8×`, `Snitzel în lipie 7×`, `Cheesy Shaorma 6×` (unit = `×`).

### Component: Delivery zones list ("Zone de livrare")
- Same `RankRow` pattern and card style (max = 15).
- Preceding section label: `"Zone de livrare"`.
- **Data:** `Cristian 15 livrări`, `Vulcan 5 livrări`, `Ghimbav 2 livrări`, `Râșnov 1 livrare`.
- Unit string is pluralized: `livrare` when value === 1, else `livrări`.

### Component: Owner tab bar
- Fixed bottom, height 92px, `padding-bottom 28px` (home indicator), translucent bg `--m-tabbar` with `backdrop-blur(20px)`, top hairline border.
- 5 slots (flex 1 each): **Acasă** (2×2 grid icon — active), **Comenzi** (receipt icon, terracotta badge `3`), **Nouă** (center raised 52px sage circle with white `+`, shadow), **Meniu** (book icon), **Setări** (gear icon).
- Active tab = sage `hsl(120 14% 49%)`; inactive = muted. Labels 10px/600.
- Badge: terracotta bg, white 10px/800, min-width 16px, 1.5px white border, top-right of icon.

## Interactions & Behavior
- **Preset chip tap** → sets the active range; updates the two date fields, caption, all KPIs, chart, and lists. `Personalizat` reveals/enables manual date editing of the two fields.
- **Date field tap** → opens a native/date-picker; **`Aplică`** commits the manual range and refetches stats.
- **Chart day tap** → selects that day: moves the highlight column, brings its bar to full opacity (others dim to 0.32), enlarges + solid-fills its sales dot, prints its short date under the column, and refills the readout card (weekday, full date, orders, sales, average). The "Cea mai bună zi" badge appears only when the selected day is the peak-sales day. On data/range change, reset the selection to the new peak-sales day.
- **Tab tap** → navigates between owner tabs (Acasă is current).
- Transitions: follow the design system — `transition-colors`/`transition-shadow`, ~200ms. No bounce/spring, no entrance animations. Cards may bump `shadow-sm → shadow-md` on hover (desktop).
- **States to implement:** loading (skeletons for KPIs/chart/lists), empty range (zero orders → show "fără date pentru această perioadă"), error (retry). The prototype only shows the loaded state.

## State Management
- `range`: `{ from: Date, to: Date, preset: 'azi'|'7'|'30'|'custom' }`.
- Derived/fetched per range: `totalSales`, `totalOrders`, per-period deltas, `series` (`[{ day, orders, sales }]`), `topProducts` (`[{ name, count }]`), `topZones` (`[{ name, deliveries }]`).
- Single data fetch keyed on `range`; refetch on `Aplică` / preset change.
- `selectedDay`: index (or date key) of the day shown in the chart readout. Initialise to the peak-sales day of `series`; reset whenever `series` changes. The readout's average is derived (`round(sales / orders)`), not stored. Each `series` datum should carry display strings (short date, weekday, full date) or be formatted on the fly via the locale formatter.
- Currency/number formatting: Romanian locale — thousands `.`, decimals `,` (e.g. `2.819,00 lei`). The prototype uses `lei`; the desktop reference uses `RON` — **confirm preferred unit with product** before finalizing.

## Design Tokens
Defined in `assets/colors_and_type.css` (prefixed `--sc-*` in the system; the prototype mirrors them as `--m-*` theme vars that flip for light/dark). Key values:

| Token | Light value | Use |
|---|---|---|
| Sage primary | `hsl(120 14% 49%)` | bars, CTAs, active tab, delta chips, calendar icon |
| Sage soft | `hsl(120 14% 49% / 0.12)` | rank track bars, delta chip bg |
| Terracotta | `hsl(0 53% 58%)` | sales line, eyebrow script, badge, right-axis labels |
| Background cream | `#fbf6ea` (`hsl(40 60% 97%)`) | page bg, fields, inactive chips |
| Card | `#ffffff` | all cards |
| Foreground | `hsl(120 8% 15%)` | titles, values, active chip bg |
| Muted | `hsl(120 5% 46%)` | labels, captions, inactive tabs |
| Border | `hsl(120 10% 88%)` | hairlines, card borders |
| Tab bar | `rgba(255,255,255,0.92)` + blur(20px) | bottom bar |

**Dark mode** (`body[data-m-theme="dark"]`): bg `#0f1814`, card `rgba(255,255,255,0.06)`, fg `#fff`, muted `rgba(255,255,255,0.6)`, border `rgba(255,255,255,0.1)`, eyebrow `#f3c28b`. Accent hues (sage/terracotta) are unchanged. The screen is built entirely on CSS variables so it themes automatically — replicate this with the codebase's theming.

**Radii:** cards 18px, chips/pills full, fields/buttons 12px, avatar full.
**Type:** **Outfit** (400/500/600/700/900) everywhere; **Caveat** (700) only for the terracotta eyebrow. Display weight is **900** with tight letter-spacing (−0.02 to −0.03em).
**Spacing:** screen gutter 16px, card padding 12–14px, inter-card gaps 10–18px.

## Assets
- **No raster assets.** All icons are inline SVG in the prototype → replace with `lucide-react`: dashboard grid (`LayoutGrid`), receipt (`ReceiptText`), book (`BookOpen`), gear (`Settings`), calendar (`Calendar`), arrow-right (`ArrowRight`), up-chevron (`ChevronUp`), plus (`Plus`).
- Fonts: Outfit + Caveat via Google Fonts / `next/font` (already in the product).

## Files
- `mobile-app.html` — entry; mounts the design-canvas of all mobile screens. The dashboard is the first artboard (`id="ab-dashboard"`, section "Owner"). Theme switch lives in `<body data-m-theme>`.
- `src/mobile-screens.jsx` — all mobile screens. **The dashboard feature is the `DashboardScreen` component** plus its helpers: `OwnerTabBar`, `ComboChart`, `smoothLinePath`, `RankRow`. Exported as `window.MobileDashboard`. (Other screens in this file — orders, detail, POS, menu, settings, courier — are existing app context, useful for matching patterns.)
- `assets/colors_and_type.css` — design tokens + font-faces.
