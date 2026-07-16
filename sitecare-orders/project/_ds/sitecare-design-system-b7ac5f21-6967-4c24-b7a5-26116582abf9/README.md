# SiteCare Design System

A warm, trustworthy, artisan-meets-technical system for **SiteCare** — a fully-managed "websites as a service" product for small Romanian businesses. Fixed monthly price (300–400 RON/lună), hosting/domain/SEO/maintenance included, one accountable person (founder Eduard Albu).

The brand is **personal, not corporate**: sage green for trust, a terracotta handwritten signature as the "human" accent, a warm-cream paper background, and chunky Outfit Black headlines. It reads less like a SaaS landing and more like a craftsman's shingle.

## Sources

All tokens, copy patterns, and components here were lifted from the production landing repo:

- **GitHub:** `Charlyk/sitecare-landing` (branch `main`)
- **Live site:** https://sitecare.ro
- **Tech stack:** Next.js 16, React 19, Tailwind CSS 4, shadcn/ui, lucide-react, next-intl (ro / en)
- **Key files referenced:**
  - `src/app/globals.css` — color tokens
  - `src/app/[locale]/layout.tsx` — fonts (`Outfit`, `Caveat` via `next/font/google`)
  - `src/components/*.tsx` — section components
  - `messages/en.json` + `messages/ro.json` — the entire copy corpus
  - `public/llms.txt` — official product summary
  - `public/sitecare-logo-*.{png,webp}`, `public/portofolio/*.webp`

Full repo listing is preserved at the end of this document.

---

## Content fundamentals

SiteCare's voice is **plainspoken, empathetic, a little pugnacious**. It writes like a friend who is tired of watching small business owners get ripped off by agencies and decided to do something about it. **Zero enterprise jargon.** Every sentence either names a fear or lands a promise.

### Voice mechanics

- **Second person, warm.** "You focus on your business." / "We build and fully manage your website." Never "users," "clients," or "stakeholders."
- **One accountable first person.** Eduard signs his own work: *"I'm Eduard. I take care of the website, you take care of your business."* The founder isn't hiding behind a "we" — he's in the hero section, face and name.
- **Sentence case, everywhere.** Headlines, buttons, navigation. No Title Case Marketing Voice.
- **Contractions on.** "We're," "it's," "you're."
- **Bilingual-aware.** Content ships in Romanian first, English second. Keep ro/en in matched pairs; don't compose copy in only one locale.

### Rhetorical patterns

SiteCare's copy has a recognizable shape. Use it:

1. **Pain → mechanism → relief** — the Pain section: *"They go to your competitors → Without an optimized website you're losing sales every day → Don't let money walk out the door."*
2. **Fear-of-loss + permission to exhale** — *"Sleep soundly while we handle all the technical chaos"* / *"Peace of mind and profit."*
3. **Concrete numbers as reassurance** — `300 RON/month`, `48h`, `15 minutes`, `24h reply`. Every price claim is load-bearing; never round, never vague.
4. **Affirmation close** on every section: *"If you want your website to stop being an expense and become an investment, SiteCare is the right choice."* This repeats verbatim across sections by design.
5. **No hype adjectives.** Not "revolutionary," "next-gen," "AI-powered." Things are "fast," "clear," "honest," "included."

### Specific examples, lifted from copy

- Hero: *"Get a website that brings you clients, without any technical hassle."*
- CTA helper: *"15 minutes · No commitment · Reply within 24h"*
- Comparison callout: *"300 RON/month — less than a dinner out"*
- FAQ answer tone: *"Not at all. You tell us what you want to communicate, and we handle everything else."*
- Values pillar name: **Ownership (No Vendor Lock-in)** — plain, bracketed clarifier, not a slogan.

### Casing, punctuation, emoji

- **Sentence case titles.** Buttons: "Schedule a call", "Book a call", "How it works" — never "Schedule A Call."
- **`·` middle dot** as a separator for trust-strip microcopy: `15 minutes · No commitment · Reply within 24h`.
- **One curated emoji** used for location: `📍 Brașov · Cristian · Râșnov` in portfolio cards. No other emoji appear. Do not add smileys, rockets, sparkles.
- **Prices in numerals with thousands-separator dot** (Romanian convention): `3.000–10.000 RON`, not `3,000–10,000`.
- **Oxford comma optional**, follow source.

---

## Visual foundations

### Color

The palette is tight: **one warm neutral background, one sage primary, one terracotta accent, plus white.** That's it — no gradients, no secondary brand colors to speak of.

- **Background cream** `hsl(40 60% 97%)` — every page's default surface. Warm, paper-like, low-contrast vs white so cards pop gently.
- **Sage primary** `hsl(120 14% 49%)` — trust, CTAs, icon tiles (at 10% opacity), pricing accent, final CTA band background.
- **Terracotta accent** `hsl(0 53% 58%)` — **reserved for two things:** (1) the handwritten `font-handwriting` eyebrows above every section heading, (2) the nav-bar "Schedule a call" pill. Never used as a background surface behind body content.
- **Near-black foreground** `hsl(120 8% 15%)` — has a green tint, not pure black. Don't substitute `#000`.
- **Muted foreground** `hsl(120 5% 46%)` for body copy and meta info. High body-text contrast is avoided deliberately — SiteCare feels "calm," not shouty.
- **Slate-50** `hsl(210 40% 98%)` — alternative surface for hero + pricing sections (cooler than cream, creates rhythm).

**Usage rule:** Alternate section backgrounds between cream → white → cream → slate-50 → cream to create vertical rhythm. See the Rhythm card in `preview/`.

### Type

- **Outfit** (geometric sans, Google Fonts) is the whole system. Weights 400/500/600/700/**900**. The **900 (Black)** is a core brand move — it's what makes hero headlines feel chunky and confident.
- **Caveat** (handwriting script) is used *only* for the small terracotta eyebrow line above each section heading, and for the founder's hero quote. It never appears as body text or as a headline. Roughly 3% of total type.
- **Letter-spacing: tight** (`-0.02em`) on display headings.
- **Display sizes:** Hero `clamp(2.25rem, 1.2rem + 3.2vw, 3.75rem)` weight 900. Section H2 `2.25rem` weight 900. Card H3 `1.25rem` weight 700.
- `italic` is used on the one highlight span in the hero headline (sage primary color + italic). No other italics in system.

### Spacing, radii, layout

- **Container:** `max-w-5xl` / `max-w-6xl` horizontal, `px-6` gutter on mobile.
- **Section vertical rhythm:** `py-24` between sections, `mb-16` between section header and grid.
- **Radii are generous.** Cards use **`rounded-3xl` (24px)**, CTAs are **`rounded-full` pills**, icon tiles are **`rounded-2xl` (16px)**, inputs are `rounded-md` (6px). Buttons at 8px; most shadcn-inherited widgets stay at 8px. The hero image is `rounded-[2rem]` (32px).
- **Grid:** cards sit in 2-col or 3-col grids (`sm:grid-cols-2 lg:grid-cols-3`) with `gap-6` to `gap-8`.

### Shadows & borders

- Cards: **`border border-slate-100` + `shadow-sm`**, hover → `shadow-md`. That's the entire elevation system for body cards.
- Hero/founder image: `shadow-2xl`.
- The popular pricing card gets **`border-2 border-primary`** instead of a shadow bump — border color is the emphasis mechanism.
- **No inner shadows. No neumorphism. No glassmorphism except one spot:** the hero quote overlay uses `bg-white/90 backdrop-blur` — the only place blur appears in the system.

### Backgrounds, imagery, texture

- **No illustrations.** No hand-drawn SVGs, no brand mascot, no pattern fills. The brand leans on **real photography** (founder portraits, portfolio screenshots of built sites).
- **No gradients** in the primary brand system. The CTA band has a single subtle white/5 blurred radial in the corner (`bg-white/5 blur-[100px]`) — that's the only gradient-adjacent effect.
- **Imagery vibe:** warm, natural-light, candid. Founder shots are shot at street level, not studio-lit. Portfolio shots are straight screenshots of the delivered sites — no device mockups, no tilted iMacs.
- **Full-bleed imagery** appears inside cards only, via `aspect-video` containers with `object-cover`. Never floats past the section container.
- **Portfolio hover effect:** a `bg-black/40` overlay with centered white text fades in on hover (`opacity-0 group-hover:opacity-100`).

### Motion & interaction

- **All transitions:** `transition-colors` or `transition-shadow`, duration defaults (Tailwind's `200ms`).
- **No bouncing, no springs, no page-level scroll animations, no entrance animations.** Only two interactive motions: color change on hover, shadow bump on card hover, and the portfolio-card overlay fade.
- **Scroll:** `scroll-behavior: smooth` globally; anchor links scroll to sections with a `scroll-mt-[var(--navbar-height)]` offset so the sticky nav doesn't cover the heading.
- **Hover states:**
  - Primary button → `bg-primary/90` (10% darker via opacity)
  - Terracotta CTA → `bg-terracotta/90`
  - Nav link → `text-primary` (from slate-700)
  - Muted link → `text-foreground` (darken)
  - Card → `shadow-md`
- **Press / active states:** not custom-styled; accept browser/shadcn defaults. `focus-visible:ring-2 ring-ring ring-offset-2` is the focus ring (inherited from shadcn button).
- **Disabled:** `opacity-50 pointer-events-none`.

### Transparency & blur

Used rarely and purposefully:
- Navbar: `bg-background/90 backdrop-blur-md` (sticky header legibility)
- Hero founder-quote overlay: `bg-white/90 backdrop-blur`
- CTA band ambient glow: `bg-white/5 blur-[100px]`

Don't sprinkle `backdrop-blur` elsewhere.

### Cards — the canonical recipe

```
rounded-3xl           /* 24px radius */
border border-slate-100
bg-white   /* or bg-background for alternating rhythm */
p-8 to p-10
shadow-sm hover:shadow-md
transition-shadow
flex flex-col gap-3 to gap-6
```

Most interior patterns: sage-tinted icon tile (`bg-primary/10 text-primary w-16 h-16 rounded-2xl`) → H3 title → muted-foreground paragraph.

---

## Iconography

- **System:** [**lucide-react**](https://lucide.dev) — thin 1.5px stroke, rounded line-caps. This is the repo's `lucide-react@^0.462.0` dependency and **the only icon set used in product.** Identifiable icons in the landing: `Menu`, `ChevronDown`, `Check`, `Minus`, `Loader2`, `PhoneCall`, `Monitor`, `TrendingUp`, `Globe`, `Wrench`, `Search`, `Server`, `Shield`, `FileEdit`.
- **Delivery:** Load from CDN `https://unpkg.com/lucide@0.462.0/dist/umd/lucide.js` and use `data-lucide="icon-name"` attributes + `lucide.createIcons()`. Or copy individual SVGs from lucide.dev.
- **Sizing:** icons in card tiles use `h-7 w-7` inside a `w-16 h-16 rounded-2xl` sage-tinted tile. Inline/list icons use `h-4 w-4`.
- **Color:** `text-primary` when active/decorative, `text-muted-foreground` when neutral, inherit when inline in a CTA.
- **Emoji as icon:** **one exception only.** `📍` used for location in portfolio cards. Do not add 🚀 ⭐ 💡 🎉 etc. The brand is grown-up.
- **Unicode punctuation as icon:** the `&#8250;` (`›`) single-right-angle-quote is used as the bullet marker in pain-section lists, colored `text-primary`. This is intentionally low-weight — a soft chevron.
- **Material Symbols Outlined** is loaded in the page `<head>` (`display=block`) but never actually rendered in the landing code. It appears to be a leftover preload or is used by `vanilla-cookieconsent` styling. Treat as not-part-of-system.
- **Don't:** invent hand-drawn SVGs, use FontAwesome, use Heroicons, or use filled icon styles. Stroke only, weight 1.5.

See `assets/` for brand logos (full, transparent, png + webp).

---

## Index — what's in this folder

### Root
- `README.md` — this file
- `colors_and_type.css` — CSS custom properties + font-faces, importable into any HTML artifact
- `SKILL.md` — cross-compatible Agent Skill definition

### Folders
- `assets/` — brand logos, founder portraits, portfolio screenshots, industry photos
- `fonts/` — `Outfit-Bold.ttf`, `Outfit-Black.ttf`, `Inter-Bold.ttf` (300/400/500/600 pulled from Google Fonts at runtime)
- `preview/` — HTML specimen cards rendered in the Design System tab (one card per token cluster)
- `ui_kits/website/` — pixel-fidelity React recreation of the SiteCare.ro landing page, assembled from the repo's section components

### Key tokens at a glance
| Token              | Value                         |
|--------------------|-------------------------------|
| Primary            | `hsl(120 14% 49%)` sage       |
| Terracotta accent  | `hsl(0 53% 58%)`              |
| Background cream   | `hsl(40 60% 97%)`             |
| Foreground         | `hsl(120 8% 15%)`             |
| Sans               | Outfit, 400–900               |
| Script accent      | Caveat, 700                   |
| Card radius        | 1.5rem (24px)                 |
| CTA radius         | full (pill)                   |
| Container          | max-w-5xl / max-w-6xl         |

---

## Caveats / substitutions

- **Fonts:** repo ships `Outfit-Bold.ttf`, `Outfit-Black.ttf`, and an unused `Inter-Bold.ttf`. Weights 300/400/500/600 are served via Google Fonts in production (next/font/google). This design system does the same via `@import`. Caveat likewise via Google Fonts — no `.ttf` shipped.
- **No design spec file in the repo** — all tokens here were derived from `src/app/globals.css` + component-level Tailwind classes, not a pre-existing style guide. If you find drift between this doc and production, **trust production.**
