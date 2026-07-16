/* @ds-bundle: {"format":3,"namespace":"SiteCareDesignSystem_b7ac5f","components":[],"sourceHashes":{"ui_kits/website/components-core.jsx":"4d08ac14ca19","ui_kits/website/components-sections.jsx":"702d4d6100e1"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.SiteCareDesignSystem_b7ac5f = window.SiteCareDesignSystem_b7ac5f || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// ui_kits/website/components-core.jsx
try { (() => {
/* global React */
const {
  useState
} = React;
const ICONS = {
  menu: 'M4 6h16M4 12h16M4 18h16',
  phoneCall: 'M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z',
  monitor: 'M20 3H4a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2zM8 21h8M12 17v4',
  trending: 'M23 6l-9.5 9.5-5-5L1 18 M17 6h6v6',
  globe: 'M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 0a15.3 15.3 0 0 0-4 10 15.3 15.3 0 0 0 4 10 15.3 15.3 0 0 0 4-10 15.3 15.3 0 0 0-4-10zM2 12h20',
  wrench: 'M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z',
  search: 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zm10 2-4.35-4.35',
  server: 'M2 3h20v6H2zM2 15h20v6H2zM6 6h.01M6 18h.01',
  shield: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
  file: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M9 13l2 2 4-4',
  check: 'M20 6 9 17l-5-5',
  minus: 'M5 12h14',
  chevron: 'M6 9l6 6 6-6'
};
function Icon({
  name,
  className = 'h-5 w-5',
  stroke = 1.5
}) {
  const d = ICONS[name];
  if (!d) return null;
  return /*#__PURE__*/React.createElement("svg", {
    className: className,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: stroke,
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, d.split(/(?=M)/).map((p, i) => /*#__PURE__*/React.createElement("path", {
    key: i,
    d: p.trim()
  })));
}
function Eyebrow({
  children
}) {
  return /*#__PURE__*/React.createElement("span", {
    className: "sc-handwriting",
    style: {
      fontSize: 24
    }
  }, children);
}
function PrimaryButton({
  children,
  size = 'default',
  className = '',
  onClick
}) {
  const h = size === 'lg' ? 44 : size === 'sm' ? 36 : 40;
  const px = size === 'lg' ? 32 : size === 'sm' ? 20 : 24;
  return /*#__PURE__*/React.createElement("button", {
    onClick: onClick,
    className: className,
    style: {
      height: h,
      padding: `0 ${px}px`,
      borderRadius: 9999,
      background: 'hsl(120 14% 49%)',
      color: '#fff',
      border: 0,
      fontWeight: 700,
      fontFamily: 'inherit',
      fontSize: size === 'lg' ? 16 : 14,
      cursor: 'pointer',
      boxShadow: '0 1px 2px rgb(0 0 0 / 0.05)',
      transition: 'background 200ms'
    },
    onMouseEnter: e => e.currentTarget.style.background = 'hsl(120 14% 44%)',
    onMouseLeave: e => e.currentTarget.style.background = 'hsl(120 14% 49%)'
  }, children);
}
function TerracottaButton({
  children,
  size = 'sm',
  onClick
}) {
  const h = size === 'lg' ? 44 : 36;
  const px = size === 'lg' ? 32 : 22;
  return /*#__PURE__*/React.createElement("button", {
    onClick: onClick,
    style: {
      height: h,
      padding: `0 ${px}px`,
      borderRadius: 9999,
      background: 'hsl(0 53% 58%)',
      color: '#fff',
      border: 0,
      fontWeight: 700,
      fontFamily: 'inherit',
      fontSize: size === 'lg' ? 16 : 13,
      cursor: 'pointer',
      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
    }
  }, children);
}
function Navbar({
  onBook
}) {
  return /*#__PURE__*/React.createElement("header", {
    style: {
      position: 'sticky',
      top: 0,
      zIndex: 50,
      height: 68,
      background: 'hsl(40 60% 97% / 0.9)',
      backdropFilter: 'blur(12px)',
      borderBottom: '1px solid hsl(214 32% 91%)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 1200,
      margin: '0 auto',
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      padding: '0 24px',
      gap: 20
    }
  }, /*#__PURE__*/React.createElement("a", {
    href: "#",
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      textDecoration: 'none'
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: "../../assets/sitecare-logo-transparent.webp",
    style: {
      height: 40
    },
    alt: "SiteCare"
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'hsl(120 14% 49%)',
      fontSize: 20
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 400
    }
  }, "Site"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 700
    }
  }, "Care"))), /*#__PURE__*/React.createElement("nav", {
    style: {
      display: 'flex',
      gap: 20,
      marginLeft: 24
    }
  }, ['Services', 'Portfolio', 'How it works', 'Pricing', 'About', 'Blog'].map(l => /*#__PURE__*/React.createElement("a", {
    key: l,
    href: "#",
    style: {
      fontSize: 14,
      fontWeight: 600,
      color: 'hsl(215 25% 27%)',
      textDecoration: 'none'
    }
  }, l))), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }), /*#__PURE__*/React.createElement(TerracottaButton, {
    onClick: onBook
  }, "Schedule a call")));
}
window.SCUI = {
  Icon,
  Eyebrow,
  PrimaryButton,
  TerracottaButton,
  Navbar
};
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/website/components-core.jsx", error: String((e && e.message) || e) }); }

// ui_kits/website/components-sections.jsx
try { (() => {
/* global React, SCUI */
const {
  Icon,
  Eyebrow,
  PrimaryButton
} = SCUI;
function Section({
  id,
  bg = '#fff',
  children,
  style
}) {
  return /*#__PURE__*/React.createElement("section", {
    id: id,
    style: {
      padding: '96px 0',
      background: bg,
      scrollMarginTop: 68,
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 1120,
      margin: '0 auto',
      padding: '0 24px'
    }
  }, children));
}
function SectionHeader({
  eyebrow,
  heading,
  sub,
  align = 'center'
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
      textAlign: align,
      alignItems: align === 'center' ? 'center' : 'flex-start',
      marginBottom: 56
    }
  }, eyebrow && /*#__PURE__*/React.createElement(Eyebrow, null, eyebrow), /*#__PURE__*/React.createElement("h2", {
    style: {
      margin: 0,
      font: '900 36px/1.15 Outfit',
      letterSpacing: '-0.02em',
      maxWidth: 720
    }
  }, heading), sub && /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: 18,
      lineHeight: 1.6,
      color: 'hsl(120 5% 46%)',
      maxWidth: 640
    }
  }, sub));
}
function HeroSection({
  onBook
}) {
  return /*#__PURE__*/React.createElement("section", {
    style: {
      padding: '80px 0',
      background: 'hsl(210 40% 98%)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 1200,
      margin: '0 auto',
      padding: '0 24px',
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 48,
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 28
    }
  }, /*#__PURE__*/React.createElement(Eyebrow, null, "A partner for your business"), /*#__PURE__*/React.createElement("h1", {
    style: {
      margin: 0,
      font: '900 56px/1.1 Outfit',
      letterSpacing: '-0.02em'
    }
  }, "Get a website that ", /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'hsl(120 14% 49%)',
      fontStyle: 'italic'
    }
  }, "brings you clients,"), /*#__PURE__*/React.createElement("br", null), "without any technical hassle."), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: 18,
      lineHeight: 1.6,
      color: 'hsl(120 5% 46%)',
      maxWidth: 540
    }
  }, "We build and fully manage your website. You focus on your business."), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(PrimaryButton, {
    size: "lg",
    onClick: onBook
  }, "Schedule a free call")), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 14,
      fontWeight: 500,
      color: 'hsl(120 5% 46%)'
    }
  }, "If you want to stop losing customers online, SiteCare is the right choice for your business.")), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      aspectRatio: '4/3',
      borderRadius: 32,
      overflow: 'hidden',
      boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.25)'
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: "../../assets/founder-1.webp",
    alt: "Eduard Albu",
    style: {
      width: '100%',
      height: '100%',
      objectFit: 'cover'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      left: 24,
      right: 24,
      bottom: 24,
      background: 'hsl(0 0% 100% / 0.9)',
      backdropFilter: 'blur(8px)',
      padding: '16px 24px',
      borderRadius: 12,
      boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontFamily: 'Caveat, cursive',
      fontSize: 22,
      color: 'hsl(0 53% 58%)',
      fontWeight: 700
    }
  }, "\"I'm Eduard. I take care of the website, you take care of your business.\"")))));
}
function PainSection() {
  const cards = [{
    t: 'They go to your competitors',
    h: 'Are you watching your customers walk to the competition?',
    b: ['Without an optimized website, you\'re losing sales every day to businesses that are more visible than you.', 'Don\'t let money walk out the door just because a competitor has a faster website.']
  }, {
    t: 'They lose trust',
    h: 'Are you invisible or do you look unprofessional?',
    b: ['Your customers\' brains decide in under two seconds whether to trust you.', 'An outdated or missing website sends them straight to someone who looks more reliable.']
  }, {
    t: 'You can\'t act fast',
    h: 'Do you feel trapped by your own technology?',
    b: ['A business that can\'t adapt quickly, dies.', 'You shouldn\'t have to wait days for a developer just to update a price or launch an offer.']
  }, {
    t: 'You waste time for nothing',
    h: 'Stop stealing time from your business growth.',
    b: ['Every hour you spend fighting with your website settings is an hour you\'re not selling.', 'Leave the technical chaos to us and focus on what brings you profit.']
  }];
  const bgs = ['#fff', 'hsl(40 60% 97%)', 'hsl(40 60% 97%)', '#fff'];
  return /*#__PURE__*/React.createElement(Section, {
    bg: "#fff"
  }, /*#__PURE__*/React.createElement(SectionHeader, {
    heading: "Without a website, you lose customers every day.",
    sub: "We know how frustrating it is to watch your customers go to the competition just because your website doesn't work."
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 960,
      margin: '0 auto',
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 24
    }
  }, cards.map((c, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      background: bgs[i],
      border: '1px solid hsl(210 40% 96%)',
      borderRadius: 24,
      padding: 40,
      boxShadow: '0 1px 2px rgb(0 0 0 / 0.05)',
      display: 'flex',
      flexDirection: 'column',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("h3", {
    style: {
      margin: 0,
      font: '700 20px/1.3 Outfit'
    }
  }, c.t), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontWeight: 600
    }
  }, c.h), /*#__PURE__*/React.createElement("ul", {
    style: {
      margin: '4px 0 0',
      padding: 0,
      listStyle: 'none',
      display: 'flex',
      flexDirection: 'column',
      gap: 8
    }
  }, c.b.map((x, j) => /*#__PURE__*/React.createElement("li", {
    key: j,
    style: {
      display: 'flex',
      gap: 8,
      color: 'hsl(120 5% 46%)',
      lineHeight: 1.55
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'hsl(120 14% 49%)',
      marginTop: 2
    }
  }, "\u203A"), /*#__PURE__*/React.createElement("span", null, x))))))));
}
function ServicesSection() {
  const services = [{
    i: 'globe',
    t: 'Fast launch: idea to sales in 48h',
    d: 'Stop wasting months on complicated projects. We build you a site ready to attract customers.'
  }, {
    i: 'wrench',
    t: 'Zero technical errors',
    d: 'Forget white screens and broken sites. We handle updates and security so you sleep soundly.'
  }, {
    i: 'search',
    t: 'Dominate Google searches',
    d: 'Don\'t let customers go to the competition. We position you exactly where they search.'
  }, {
    i: 'server',
    t: 'Full management: no forgotten invoices',
    d: 'Hosting, domain, SEO — everything in one place, automated for your success.'
  }, {
    i: 'shield',
    t: 'Protection and instant speed',
    d: 'A slow website drives customers away. We secure you against hackers and keep pages fast.'
  }, {
    i: 'file',
    t: 'Your website evolves with you',
    d: 'Want to launch an offer today? Send us a message and we make the changes.'
  }];
  return /*#__PURE__*/React.createElement(Section, {
    id: "services",
    bg: "hsl(40 60% 97%)"
  }, /*#__PURE__*/React.createElement(SectionHeader, {
    eyebrow: "What we do for you",
    heading: "Everything you need for your website to make money, not stress",
    sub: "Everything your business needs online, at a fixed monthly price, no surprises."
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 1080,
      margin: '0 auto',
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: 32
    }
  }, services.map((s, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      background: '#fff',
      border: '1px solid hsl(210 40% 96%)',
      borderRadius: 24,
      padding: 40,
      boxShadow: '0 1px 2px rgb(0 0 0 / 0.05)',
      display: 'flex',
      flexDirection: 'column',
      gap: 24
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 64,
      height: 64,
      borderRadius: 16,
      background: 'hsl(120 14% 49% / 0.10)',
      color: 'hsl(120 14% 49%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: s.i,
    className: ""
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("h3", {
    style: {
      margin: 0,
      font: '700 20px/1.3 Outfit'
    }
  }, s.t), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      color: 'hsl(120 5% 46%)',
      lineHeight: 1.6
    }
  }, s.d))))));
}
function PortfolioSection() {
  const cards = [{
    img: '../../assets/portfolio/dr-sandwich.webp',
    cat: 'Restaurant & Fast Food',
    loc: 'Brașov · Cristian · Râșnov',
    t: 'Dr. Sandwich'
  }, {
    img: '../../assets/portfolio/lidia-lux.webp',
    cat: 'Beauty & Wellness',
    loc: 'Râșnov, județul Brașov',
    t: 'Lidia Lux Beauty House'
  }, {
    img: '../../assets/portfolio/a-and-l-prosolutions.webp',
    cat: 'Cleaning Services',
    loc: 'Brașov',
    t: 'A&L ProSolutions'
  }, {
    img: '../../assets/portfolio/da-massimo-cristian.webp',
    cat: 'Gastronomic Store',
    loc: 'Brașov, Cristian',
    t: 'Da Massimo'
  }];
  return /*#__PURE__*/React.createElement(Section, {
    id: "portfolio",
    bg: "hsl(40 60% 97%)"
  }, /*#__PURE__*/React.createElement(SectionHeader, {
    eyebrow: "Portfolio",
    heading: "Local businesses we've helped grow",
    sub: "Every local business deserves a professional site."
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(4, 1fr)',
      gap: 24
    }
  }, cards.map((c, i) => /*#__PURE__*/React.createElement("a", {
    key: i,
    href: "#",
    style: {
      display: 'flex',
      flexDirection: 'column',
      background: '#fff',
      border: '1px solid hsl(210 40% 96%)',
      borderRadius: 24,
      overflow: 'hidden',
      boxShadow: '0 1px 2px rgb(0 0 0 / 0.05)',
      textDecoration: 'none',
      color: 'inherit'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      aspectRatio: '16/10',
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: c.img,
    alt: c.t,
    style: {
      width: '100%',
      height: '100%',
      objectFit: 'cover'
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 20,
      display: 'flex',
      flexDirection: 'column',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      alignSelf: 'flex-start',
      background: 'hsl(120 14% 49% / 0.10)',
      color: 'hsl(120 14% 49%)',
      fontSize: 11,
      fontWeight: 600,
      padding: '4px 12px',
      borderRadius: 9999
    }
  }, c.cat), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11,
      color: 'hsl(120 5% 46%)'
    }
  }, "\uD83D\uDCCD ", c.loc), /*#__PURE__*/React.createElement("h3", {
    style: {
      margin: 0,
      font: '700 17px/1.3 Outfit'
    }
  }, c.t))))));
}
function HowItWorksSection({
  onBook
}) {
  const steps = [{
    i: 'phoneCall',
    n: '01',
    t: '5-minute call',
    d: 'We set goals together: a short call to understand how we can grow your profit.'
  }, {
    i: 'monitor',
    n: '02',
    t: 'Fast launch in 48h',
    d: 'We build, configure and launch everything, while you stay focused on your business.'
  }, {
    i: 'trending',
    n: '03',
    t: 'Peace of mind and profit',
    d: 'You automatically attract new customers from Google and forget about technical worries.'
  }];
  return /*#__PURE__*/React.createElement(Section, {
    id: "how",
    bg: "#fff"
  }, /*#__PURE__*/React.createElement(SectionHeader, {
    eyebrow: "Your plan in 3 steps",
    heading: "Your simple path to a website that makes money, not stress",
    sub: "Get a professional online presence without hidden costs or endless waiting times."
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 1040,
      margin: '0 auto',
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: 32
    }
  }, steps.map((s, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      background: i % 2 === 0 ? 'hsl(40 60% 97%)' : '#fff',
      border: '1px solid hsl(210 40% 96%)',
      borderRadius: 24,
      padding: 40,
      boxShadow: '0 1px 2px rgb(0 0 0 / 0.05)',
      display: 'flex',
      flexDirection: 'column',
      gap: 24
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 64,
      height: 64,
      borderRadius: 16,
      background: 'hsl(120 14% 49% / 0.10)',
      color: 'hsl(120 14% 49%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: s.i,
    className: ""
  })), /*#__PURE__*/React.createElement("h3", {
    style: {
      margin: 0,
      font: '700 20px/1.3 Outfit'
    }
  }, s.t), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      color: 'hsl(120 5% 46%)',
      lineHeight: 1.6
    }
  }, s.d)))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 16,
      marginTop: 48
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      color: 'hsl(120 5% 46%)',
      maxWidth: 520,
      textAlign: 'center'
    }
  }, "If you're tired of losing customers because of a weak website, choosing SiteCare is the right decision."), /*#__PURE__*/React.createElement(PrimaryButton, {
    size: "lg",
    onClick: onBook
  }, "I want a stress-free website")));
}
function PricingSection({
  onBook
}) {
  const tiers = [{
    name: 'Start',
    price: '300',
    tag: 'Get found on Google. Stop being invisible to customers searching for you.',
    extras: [],
    pop: false
  }, {
    name: 'Standard',
    price: '350',
    tag: 'Automate your bookings. Stop losing time taking reservations by phone.',
    extras: ['Online booking / ordering'],
    pop: true
  }, {
    name: 'Pro',
    price: '400',
    tag: 'Sell directly from your site, 24/7. Remove barriers between customer and product.',
    extras: ['Online booking / ordering', 'Online payments (e-commerce)', 'Priority support'],
    pop: false
  }];
  const allFeat = ['Online booking / ordering', 'Online payments (e-commerce)', 'Priority support'];
  return /*#__PURE__*/React.createElement(Section, {
    id: "pricing",
    bg: "hsl(210 40% 98%)"
  }, /*#__PURE__*/React.createElement(SectionHeader, {
    eyebrow: "Invest in success",
    heading: "Choose the plan that turns your website into a sales engine",
    sub: "No hidden fees. Cancel anytime after the first year."
  }), /*#__PURE__*/React.createElement("p", {
    style: {
      textAlign: 'center',
      fontSize: 14,
      color: 'hsl(120 5% 46%)',
      maxWidth: 560,
      margin: '-30px auto 40px'
    }
  }, "All plans include: Hosting, .ro Domain, Monthly SEO, Maintenance and Content Updates."), /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 1040,
      margin: '0 auto',
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: 32
    }
  }, tiers.map((t, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      position: 'relative',
      background: t.pop ? 'hsl(40 60% 97%)' : '#fff',
      border: t.pop ? '2px solid hsl(120 14% 49%)' : '1px solid hsl(210 40% 96%)',
      borderRadius: 24,
      padding: 32,
      boxShadow: t.pop ? '0 4px 6px -1px rgb(0 0 0 / 0.08)' : '0 1px 2px rgb(0 0 0 / 0.05)',
      display: 'flex',
      flexDirection: 'column',
      gap: 20
    }
  }, t.pop && /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      top: -12,
      left: '50%',
      transform: 'translateX(-50%)',
      background: 'hsl(120 14% 49%)',
      color: '#fff',
      fontSize: 11,
      fontWeight: 700,
      padding: '4px 14px',
      borderRadius: 9999
    }
  }, "Popular"), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h3", {
    style: {
      margin: 0,
      font: '700 20px/1.3 Outfit'
    }
  }, t.name), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: '4px 0 0',
      fontSize: 13,
      color: 'hsl(120 5% 46%)'
    }
  }, t.tag)), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'baseline',
      gap: 4
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: '900 36px/1 Outfit'
    }
  }, t.price), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 14,
      color: 'hsl(120 5% 46%)'
    }
  }, "RON/month")), /*#__PURE__*/React.createElement("ul", {
    style: {
      margin: 0,
      padding: 0,
      listStyle: 'none',
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("li", {
    style: {
      display: 'flex',
      gap: 8,
      fontSize: 14,
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "check",
    className: "",
    stroke: 2
  }), " Full base package included"), allFeat.map(f => {
    const yes = t.extras.includes(f);
    return /*#__PURE__*/React.createElement("li", {
      key: f,
      style: {
        display: 'flex',
        gap: 8,
        fontSize: 14,
        alignItems: 'center',
        color: yes ? 'inherit' : 'hsl(120 5% 46%)'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        color: yes ? 'hsl(120 14% 49%)' : 'currentColor',
        display: 'flex'
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: yes ? 'check' : 'minus',
      className: "",
      stroke: 2
    })), f);
  })), /*#__PURE__*/React.createElement(PrimaryButton, {
    onClick: onBook,
    className: ""
  }, "Schedule a call")))));
}
function CTASection({
  onBook
}) {
  return /*#__PURE__*/React.createElement("section", {
    style: {
      padding: '96px 24px',
      background: 'hsl(120 14% 49%)',
      color: '#fff',
      position: 'relative',
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 0,
      right: 0,
      width: '33%',
      height: '100%',
      background: 'hsl(0 0% 100% / 0.05)',
      filter: 'blur(100px)',
      borderRadius: '50%',
      transform: 'translateX(50%)'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 720,
      margin: '0 auto',
      position: 'relative',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 28,
      textAlign: 'center'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'Caveat, cursive',
      fontSize: 36,
      color: 'hsl(0 0% 100% / 0.85)',
      fontWeight: 700
    }
  }, "Stop fighting technical problems on your own."), /*#__PURE__*/React.createElement("h2", {
    style: {
      margin: 0,
      font: '900 44px/1.15 Outfit',
      letterSpacing: '-0.02em'
    }
  }, "Stop letting your website block your growth."), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: 18,
      color: 'hsl(0 0% 100% / 0.8)',
      maxWidth: 520
    }
  }, "If you're tired of your website being a source of stress instead of a sales engine, scheduling this call is the right decision."), /*#__PURE__*/React.createElement("button", {
    onClick: onBook,
    style: {
      background: 'hsl(0 53% 58%)',
      color: '#fff',
      border: 0,
      borderRadius: 9999,
      padding: '14px 40px',
      fontSize: 16,
      fontWeight: 700,
      fontFamily: 'inherit',
      cursor: 'pointer',
      boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.2)'
    }
  }, "I want a stress-free website"), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: 14,
      color: 'hsl(0 0% 100% / 0.6)'
    }
  }, "Free \xB7 15 minutes \xB7 You'll leave with your online success plan.")));
}
function FAQSection() {
  const [open, setOpen] = React.useState(0);
  const faqs = [{
    q: 'How much does it cost and what\'s included?',
    a: '300 RON per month, everything included: professional website, .ro domain, fast hosting, SSL certificate, full monthly SEO, maintenance, content updates, and monthly analytics reports. There are no setup fees and no hidden costs.'
  }, {
    q: 'Do I need technical knowledge?',
    a: 'Not at all. You tell us what you want to communicate — and we handle everything else. Design, development, hosting, domain, SEO setup — all of it is our responsibility.'
  }, {
    q: 'How long does it take to get the website?',
    a: 'The website is ready within 48 hours of the first discovery call.'
  }, {
    q: 'Can I make changes after launch?',
    a: 'Yes, changes are included in the subscription — at no extra cost and with no ticketing system.'
  }, {
    q: 'How long is the contract?',
    a: 'The initial contract is 1 year. After the first year, you can continue month-to-month or cancel with 30 days\' notice.'
  }, {
    q: 'Is the website mine?',
    a: 'Your website content — text, images, logo, contact details, brand materials — is entirely yours.'
  }];
  return /*#__PURE__*/React.createElement(Section, {
    id: "faq",
    bg: "#fff"
  }, /*#__PURE__*/React.createElement(SectionHeader, {
    eyebrow: "Frequently asked",
    heading: "Frequently asked questions",
    sub: "All the questions you have before reaching out \u2014 answered honestly."
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 640,
      margin: '0 auto'
    }
  }, faqs.map((f, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      borderBottom: '1px solid hsl(120 10% 88%)'
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setOpen(open === i ? -1 : i),
    style: {
      width: '100%',
      padding: '16px 0',
      background: 'transparent',
      border: 0,
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      font: 'inherit',
      fontWeight: 500,
      color: 'inherit',
      cursor: 'pointer',
      textAlign: 'left'
    }
  }, /*#__PURE__*/React.createElement("span", null, f.q), /*#__PURE__*/React.createElement("span", {
    style: {
      transform: open === i ? 'rotate(180deg)' : 'none',
      transition: 'transform 200ms',
      color: 'hsl(120 5% 46%)',
      display: 'flex'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "chevron",
    className: ""
  }))), open === i && /*#__PURE__*/React.createElement("div", {
    style: {
      paddingBottom: 16,
      color: 'hsl(120 5% 46%)',
      fontSize: 14,
      lineHeight: 1.6
    }
  }, f.a)))));
}
function Footer() {
  return /*#__PURE__*/React.createElement("footer", {
    style: {
      borderTop: '1px solid hsl(120 10% 88%)',
      background: 'hsl(40 60% 97%)',
      padding: '48px 24px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 1120,
      margin: '0 auto',
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: 32,
      paddingBottom: 32,
      borderBottom: '1px solid hsl(120 10% 88%)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: "../../assets/sitecare-logo-transparent.webp",
    style: {
      height: 56
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'hsl(120 14% 49%)',
      fontSize: 28
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 400
    }
  }, "Site"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 700
    }
  }, "Care"))), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: 14,
      color: 'hsl(120 5% 46%)'
    }
  }, "Professional websites. Complete management. 300 RON/month.")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      margin: '0 0 4px',
      fontSize: 14,
      fontWeight: 600
    }
  }, "Navigation"), ['Services', 'Pricing', 'How It Works', 'FAQ', 'Blog', 'About', 'Contact'].map(l => /*#__PURE__*/React.createElement("a", {
    key: l,
    href: "#",
    style: {
      fontSize: 14,
      color: 'hsl(120 5% 46%)',
      textDecoration: 'none'
    }
  }, l))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      margin: '0 0 4px',
      fontSize: 14,
      fontWeight: 600
    }
  }, "Contact"), /*#__PURE__*/React.createElement("a", {
    href: "tel:+40741810387",
    style: {
      fontSize: 14,
      color: 'hsl(120 5% 46%)',
      textDecoration: 'none'
    }
  }, "+40 741 810 387"), /*#__PURE__*/React.createElement("a", {
    href: "mailto:contact@sitecare.ro",
    style: {
      fontSize: 14,
      color: 'hsl(120 5% 46%)',
      textDecoration: 'none'
    }
  }, "contact@sitecare.ro"), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: '6px 0 0',
      fontSize: 12,
      color: 'hsl(120 5% 46%)'
    }
  }, "Active in Bra\u0219ov county and all of Romania"))), /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 1120,
      margin: '0 auto',
      paddingTop: 24,
      display: 'flex',
      justifyContent: 'space-between',
      fontSize: 13,
      color: 'hsl(120 5% 46%)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 16
    }
  }, /*#__PURE__*/React.createElement("a", {
    href: "#",
    style: {
      color: 'inherit',
      textDecoration: 'none'
    }
  }, "Privacy Policy"), /*#__PURE__*/React.createElement("a", {
    href: "#",
    style: {
      color: 'inherit',
      textDecoration: 'none'
    }
  }, "Terms of Service"), /*#__PURE__*/React.createElement("a", {
    href: "#",
    style: {
      color: 'inherit',
      textDecoration: 'none'
    }
  }, "Cookie preferences")), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: 12
    }
  }, "\xA9 2026 SiteCare. All rights reserved.")));
}
window.SCSections = {
  HeroSection,
  PainSection,
  ServicesSection,
  PortfolioSection,
  HowItWorksSection,
  PricingSection,
  CTASection,
  FAQSection,
  Footer
};
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/website/components-sections.jsx", error: String((e && e.message) || e) }); }

})();
