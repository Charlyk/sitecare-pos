/* global window */
// Mock data: menu, orders, settings. Generic restaurant covering starters/mains/pizza/drinks/desserts.

const MENU_CATEGORIES = [
  { id: 'pizza', ro: 'Pizza', en: 'Pizza', icon: 'fire' },
  { id: 'burger', ro: 'Burgeri', en: 'Burgers', icon: 'utensils' },
  { id: 'pasta', ro: 'Paste', en: 'Pasta', icon: 'utensils' },
  { id: 'salad', ro: 'Salate', en: 'Salads', icon: 'leaf' },
  { id: 'drink', ro: 'Băuturi', en: 'Drinks', icon: 'coffee' },
  { id: 'dessert', ro: 'Desert', en: 'Desserts', icon: 'sparkle' },
];

const MENU_ITEMS = [
  { id: 'p1', cat: 'pizza', ro: 'Margherita', en: 'Margherita', price: 32, desc: 'Roșii, mozzarella, busuioc' },
  { id: 'p2', cat: 'pizza', ro: 'Prosciutto & Funghi', en: 'Prosciutto & Funghi', price: 38, desc: 'Șuncă, ciuperci, mozzarella' },
  { id: 'p3', cat: 'pizza', ro: 'Quattro Formaggi', en: 'Quattro Formaggi', price: 42, desc: 'Patru brânzeturi, oregano' },
  { id: 'p4', cat: 'pizza', ro: 'Diavola', en: 'Diavola', price: 39, desc: 'Salam picant, ardei iute' },
  { id: 'b1', cat: 'burger', ro: 'Burger Clasic', en: 'Classic Burger', price: 34, desc: 'Vită, cheddar, roșii, ceapă' },
  { id: 'b2', cat: 'burger', ro: 'Burger BBQ', en: 'BBQ Burger', price: 38, desc: 'Sos BBQ, bacon, rucola' },
  { id: 'b3', cat: 'burger', ro: 'Burger Vegan', en: 'Vegan Burger', price: 32, desc: 'Linte, avocado, ceapă' },
  { id: 'pa1', cat: 'pasta', ro: 'Carbonara', en: 'Carbonara', price: 34, desc: 'Bacon, ou, parmezan' },
  { id: 'pa2', cat: 'pasta', ro: 'Bolognese', en: 'Bolognese', price: 32, desc: 'Sos de carne, parmezan' },
  { id: 'pa3', cat: 'pasta', ro: 'Pesto', en: 'Pesto', price: 30, desc: 'Busuioc, pin nuts, usturoi' },
  { id: 's1', cat: 'salad', ro: 'Cezar', en: 'Caesar', price: 28, desc: 'Pui, crutoane, parmezan' },
  { id: 's2', cat: 'salad', ro: 'Grecească', en: 'Greek', price: 26, desc: 'Feta, măsline, roșii' },
  { id: 'd1', cat: 'drink', ro: 'Apă minerală', en: 'Sparkling water', price: 8, desc: '500ml' },
  { id: 'd2', cat: 'drink', ro: 'Coca-Cola', en: 'Coca-Cola', price: 10, desc: '330ml' },
  { id: 'd3', cat: 'drink', ro: 'Limonadă cu mentă', en: 'Mint lemonade', price: 14, desc: 'Casei' },
  { id: 'd4', cat: 'drink', ro: 'Cafea espresso', en: 'Espresso', price: 9, desc: 'Boabe arabica' },
  { id: 'd5', cat: 'drink', ro: 'Vin roșu (pahar)', en: 'Red wine (glass)', price: 18, desc: 'Fetească neagră' },
  { id: 'ds1', cat: 'dessert', ro: 'Tiramisu', en: 'Tiramisu', price: 18, desc: 'Mascarpone, cacao' },
  { id: 'ds2', cat: 'dessert', ro: 'Papanași', en: 'Papanași', price: 22, desc: 'Cu smântână și dulceață' },
];

// Live orders — a mix of sources + states + elapsed times
const now = Date.now();
const m = (min) => new Date(now - min * 60 * 1000).toISOString();

const ORDERS = [
  {
    id: '#1047', num: 1047,
    source: 'web', type: 'delivery',
    state: 'new',
    placedAt: m(1), promisedIn: 45,
    customer: { name: 'Ioana Radu', phone: '+40 722 145 902' },
    address: { line1: 'Str. Lungă 24, ap. 3', city: 'Brașov', note: 'Interfon 3B, etaj 2' },
    items: [
      { id: 'p3', name: 'Quattro Formaggi', qty: 1, price: 42, mods: [] },
      { id: 'pa1', name: 'Carbonara', qty: 1, price: 34, mods: ['fără bacon'] },
      { id: 'd2', name: 'Coca-Cola', qty: 2, price: 10, mods: [] },
    ],
    payment: 'online', paid: true,
    subtotal: 96, deliveryFee: 10, tip: 0, tax: 15.28, total: 121.28,
    notes: 'Fără ceapă pe carbonara. Mulțumesc!',
  },
  {
    id: '#1046', num: 1046,
    source: 'phone', type: 'pickup',
    state: 'preparing',
    placedAt: m(8), promisedIn: 25,
    customer: { name: 'Mihai Popescu', phone: '+40 756 222 118' },
    items: [
      { id: 'p4', name: 'Diavola', qty: 2, price: 39, mods: ['extra ardei iute'] },
      { id: 'd5', name: 'Vin roșu', qty: 1, price: 18, mods: [] },
    ],
    payment: 'cash', paid: false,
    subtotal: 96, deliveryFee: 0, tip: 0, tax: 15.28, total: 96,
    notes: '',
  },
  {
    id: '#1045', num: 1045,
    source: 'counter', type: 'dinein', table: 7,
    state: 'preparing',
    placedAt: m(12), promisedIn: 20,
    customer: { name: 'Masa 7' },
    items: [
      { id: 'b1', name: 'Burger Clasic', qty: 1, price: 34, mods: ['mediu'] },
      { id: 'b2', name: 'Burger BBQ', qty: 1, price: 38, mods: ['fără ceapă'] },
      { id: 's1', name: 'Cezar', qty: 1, price: 28, mods: [] },
      { id: 'd3', name: 'Limonadă', qty: 2, price: 14, mods: [] },
      { id: 'd2', name: 'Coca-Cola', qty: 1, price: 10, mods: [] },
    ],
    payment: 'card', paid: false,
    subtotal: 138, deliveryFee: 0, tip: 0, tax: 21.96, total: 138,
    notes: '',
  },
  {
    id: '#1044', num: 1044,
    source: 'web', type: 'delivery',
    state: 'ready',
    placedAt: m(28), promisedIn: 40,
    customer: { name: 'Andreea Toma', phone: '+40 733 801 445' },
    address: { line1: 'Calea București 112, bl. 4', city: 'Brașov', note: '' },
    items: [
      { id: 'p1', name: 'Margherita', qty: 1, price: 32, mods: [] },
      { id: 'p2', name: 'Prosciutto & Funghi', qty: 1, price: 38, mods: [] },
      { id: 'ds1', name: 'Tiramisu', qty: 2, price: 18, mods: [] },
    ],
    payment: 'online', paid: true,
    subtotal: 106, deliveryFee: 10, tip: 5, tax: 16.87, total: 137.87,
    notes: 'Vă rog să sunați când ajungeți.',
  },
  {
    id: '#1043', num: 1043,
    source: 'web', type: 'pickup',
    state: 'ready',
    placedAt: m(18), promisedIn: 20,
    customer: { name: 'Răzvan Ilie', phone: '+40 744 300 111' },
    items: [
      { id: 'pa3', name: 'Pesto', qty: 1, price: 30, mods: [] },
      { id: 's2', name: 'Grecească', qty: 1, price: 26, mods: [] },
    ],
    payment: 'online', paid: true,
    subtotal: 56, deliveryFee: 0, tip: 0, tax: 8.91, total: 56,
    notes: '',
  },
  {
    id: '#1042', num: 1042,
    source: 'counter', type: 'dinein', table: 3,
    state: 'new',
    placedAt: m(2), promisedIn: 20,
    customer: { name: 'Masa 3' },
    items: [
      { id: 'p3', name: 'Quattro Formaggi', qty: 1, price: 42, mods: [] },
      { id: 'd4', name: 'Espresso', qty: 2, price: 9, mods: [] },
    ],
    payment: 'card', paid: false,
    subtotal: 60, deliveryFee: 0, tip: 0, tax: 9.54, total: 60,
    notes: '',
  },
  {
    id: '#1041', num: 1041,
    source: 'phone', type: 'delivery',
    state: 'out',
    placedAt: m(42), promisedIn: 50,
    customer: { name: 'Elena Marin', phone: '+40 721 778 223' },
    address: { line1: 'Str. Zizinului 88', city: 'Brașov' },
    items: [
      { id: 'b3', name: 'Burger Vegan', qty: 2, price: 32, mods: ['fără sos'] },
      { id: 'd1', name: 'Apă minerală', qty: 2, price: 8, mods: [] },
    ],
    payment: 'cash', paid: false,
    subtotal: 80, deliveryFee: 10, tip: 0, tax: 12.72, total: 90,
    notes: '',
  },
  {
    id: '#1040', num: 1040,
    source: 'web', type: 'delivery',
    state: 'done',
    placedAt: m(65), promisedIn: 45,
    customer: { name: 'Cristian Vasile', phone: '+40 766 123 900' },
    address: { line1: 'Str. Iuliu Maniu 12', city: 'Brașov' },
    items: [
      { id: 'p2', name: 'Prosciutto', qty: 1, price: 38, mods: [] },
    ],
    payment: 'online', paid: true,
    subtotal: 38, deliveryFee: 10, tip: 3, tax: 6.04, total: 51,
    notes: '',
  },
];

const PRINTERS = [
  { id: 'pr1', name: 'Epson TM-T20III (Bucătărie)', model: 'Thermal 80mm', conn: 'USB', status: 'online', kind: 'kitchen' },
  { id: 'pr2', name: 'Star TSP143 (Casă)', model: 'Thermal 80mm', conn: 'Ethernet · 192.168.1.42', status: 'online', kind: 'customer' },
  { id: 'pr3', name: 'Epson TM-T88VI (Bar)', model: 'Thermal 80mm', conn: 'Ethernet · 192.168.1.43', status: 'offline', kind: 'bar' },
];

const USERS = [
  { id: 'u1', name: 'Eduard Albu', role: 'Admin', email: 'eduard@sitecare.ro', initials: 'EA' },
  { id: 'u2', name: 'Maria Iancu', role: 'Cashier', email: 'maria@local', initials: 'MI' },
  { id: 'u3', name: 'Andrei Dima', role: 'Kitchen', email: 'andrei@local', initials: 'AD' },
  { id: 'u4', name: 'Raluca Stan', role: 'Cashier', email: 'raluca@local', initials: 'RS' },
];

// ─── Order history (closed orders) ───────────────────────
// Past orders the cashier/owner can review. Independent of the live ORDERS
// queue. `closedAt` drives day-grouping; `status` is completed|canceled|refunded.
const hd = (daysAgo, hh, mm) => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(hh, mm, 0, 0);
  return d.toISOString();
};

const HISTORY_ORDERS = [
  // ── Today ──
  { id: '#1047', num: 1047, source: 'web', type: 'delivery', status: 'completed', closedAt: hd(0, 20, 14), prepMins: 42, cashier: 'Maria Iancu',
    customer: { name: 'Ioana Radu', phone: '+40 722 145 902' }, address: { line1: 'Str. Lungă 24, ap. 3', city: 'Brașov' },
    items: [ { name: 'Quattro Formaggi', qty: 1, price: 42, mods: [] }, { name: 'Carbonara', qty: 1, price: 34, mods: ['fără bacon'] }, { name: 'Coca-Cola', qty: 2, price: 10, mods: [] } ],
    payment: 'online', paid: true, subtotal: 96, deliveryFee: 10, tip: 0, tax: 15.28, total: 121.28 },
  { id: '#1046', num: 1046, source: 'phone', type: 'pickup', status: 'completed', closedAt: hd(0, 19, 52), prepMins: 20, cashier: 'Maria Iancu',
    customer: { name: 'Mihai Popescu', phone: '+40 756 222 118' },
    items: [ { name: 'Diavola', qty: 2, price: 39, mods: ['extra ardei iute'] }, { name: 'Vin roșu', qty: 1, price: 18, mods: [] } ],
    payment: 'cash', paid: true, subtotal: 96, deliveryFee: 0, tip: 0, tax: 15.28, total: 96 },
  { id: '#1045', num: 1045, source: 'counter', type: 'dinein', table: 7, status: 'completed', closedAt: hd(0, 19, 30), prepMins: 24, cashier: 'Eduard Albu',
    customer: { name: 'Masa 7' },
    items: [ { name: 'Burger Clasic', qty: 1, price: 34, mods: ['mediu'] }, { name: 'Burger BBQ', qty: 1, price: 38, mods: ['fără ceapă'] }, { name: 'Cezar', qty: 1, price: 28, mods: [] }, { name: 'Limonadă', qty: 2, price: 14, mods: [] }, { name: 'Coca-Cola', qty: 1, price: 10, mods: [] } ],
    payment: 'card', paid: true, subtotal: 138, deliveryFee: 0, tip: 0, tax: 21.96, total: 138 },
  { id: '#1044', num: 1044, source: 'web', type: 'delivery', status: 'completed', closedAt: hd(0, 18, 47), prepMins: 38, cashier: 'Maria Iancu',
    customer: { name: 'Andreea Toma', phone: '+40 733 801 445' }, address: { line1: 'Calea București 112, bl. 4', city: 'Brașov' },
    items: [ { name: 'Margherita', qty: 1, price: 32, mods: [] }, { name: 'Prosciutto & Funghi', qty: 1, price: 38, mods: [] }, { name: 'Tiramisu', qty: 2, price: 18, mods: [] } ],
    payment: 'online', paid: true, subtotal: 106, deliveryFee: 10, tip: 5, tax: 16.87, total: 137.87 },
  { id: '#1043', num: 1043, source: 'web', type: 'pickup', status: 'canceled', cancelReason: 'client', closedAt: hd(0, 18, 20), cashier: 'Raluca Stan',
    customer: { name: 'Radu Ene', phone: '+40 744 300 111' },
    items: [ { name: 'Pesto', qty: 1, price: 30, mods: [] }, { name: 'Grecească', qty: 1, price: 26, mods: [] } ],
    payment: 'cash', paid: false, subtotal: 56, deliveryFee: 0, tip: 0, tax: 8.91, total: 56 },
  { id: '#1042', num: 1042, source: 'counter', type: 'dinein', table: 3, status: 'completed', closedAt: hd(0, 17, 58), prepMins: 18, cashier: 'Eduard Albu',
    customer: { name: 'Masa 3' },
    items: [ { name: 'Quattro Formaggi', qty: 1, price: 42, mods: [] }, { name: 'Espresso', qty: 2, price: 9, mods: [] } ],
    payment: 'card', paid: true, subtotal: 60, deliveryFee: 0, tip: 0, tax: 9.54, total: 60 },
  // ── Yesterday ──
  { id: '#1039', num: 1039, source: 'phone', type: 'pickup', status: 'completed', closedAt: hd(1, 21, 40), prepMins: 22, cashier: 'Maria Iancu',
    customer: { name: 'Bogdan Marin', phone: '+40 720 551 234' },
    items: [ { name: 'Bolognese', qty: 1, price: 32, mods: [] }, { name: 'Cezar', qty: 1, price: 28, mods: [] }, { name: 'Limonadă cu mentă', qty: 1, price: 14, mods: [] } ],
    payment: 'card', paid: true, subtotal: 74, deliveryFee: 0, tip: 0, tax: 11.78, total: 84.5 },
  { id: '#1035', num: 1035, source: 'web', type: 'delivery', status: 'refunded', refundAmount: 40, refundReason: 'articol lipsă', closedAt: hd(1, 20, 58), prepMins: 44, cashier: 'Raluca Stan',
    customer: { name: 'Elena Vlad', phone: '+40 731 909 200' }, address: { line1: 'Str. Zizinului 88', city: 'Brașov' },
    items: [ { name: 'Diavola', qty: 2, price: 39, mods: [] }, { name: 'Quattro Formaggi', qty: 1, price: 42, mods: [] }, { name: 'Tiramisu', qty: 2, price: 18, mods: [] } ],
    payment: 'online', paid: true, subtotal: 174, deliveryFee: 10, tip: 0, tax: 27.68, total: 210 },
  { id: '#1032', num: 1032, source: 'counter', type: 'dinein', table: 5, status: 'completed', closedAt: hd(1, 20, 5), prepMins: 20, cashier: 'Eduard Albu',
    customer: { name: 'Masa 5' },
    items: [ { name: 'Burger BBQ', qty: 1, price: 38, mods: [] }, { name: 'Grecească', qty: 1, price: 26, mods: [] }, { name: 'Coca-Cola', qty: 1, price: 10, mods: [] } ],
    payment: 'cash', paid: true, subtotal: 74, deliveryFee: 0, tip: 0, tax: 11.78, total: 74 },
  { id: '#1030', num: 1030, source: 'web', type: 'delivery', status: 'completed', closedAt: hd(1, 19, 20), prepMins: 40, cashier: 'Maria Iancu',
    customer: { name: 'Cristina Popa', phone: '+40 745 118 664' }, address: { line1: 'Bd. Griviței 30', city: 'Brașov' },
    items: [ { name: 'Prosciutto & Funghi', qty: 2, price: 38, mods: [] }, { name: 'Apă minerală', qty: 2, price: 8, mods: [] } ],
    payment: 'online', paid: true, subtotal: 92, deliveryFee: 10, tip: 0, tax: 14.63, total: 96.5 },
  { id: '#1028', num: 1028, source: 'phone', type: 'pickup', status: 'canceled', cancelReason: 'restaurant', closedAt: hd(1, 18, 40), cashier: 'Raluca Stan',
    customer: { name: 'Dan Suciu', phone: '+40 726 400 815' },
    items: [ { name: 'Burger Vegan', qty: 1, price: 32, mods: [] }, { name: 'Espresso', qty: 1, price: 9, mods: [] } ],
    payment: 'cash', paid: false, subtotal: 41, deliveryFee: 0, tip: 0, tax: 6.52, total: 48 },
  // ── 2 days ago ──
  { id: '#1019', num: 1019, source: 'web', type: 'delivery', status: 'completed', closedAt: hd(2, 21, 10), prepMins: 45, cashier: 'Maria Iancu',
    customer: { name: 'George Enache', phone: '+40 799 210 004' }, address: { line1: 'Str. Castelului 9', city: 'Brașov' },
    items: [ { name: 'Diavola', qty: 2, price: 39, mods: [] }, { name: 'Papanași', qty: 2, price: 22, mods: [] }, { name: 'Limonadă cu mentă', qty: 2, price: 14, mods: [] } ],
    payment: 'online', paid: true, subtotal: 130, deliveryFee: 10, tip: 12, tax: 20.68, total: 152 },
  { id: '#1015', num: 1015, source: 'counter', type: 'dinein', table: 2, status: 'completed', closedAt: hd(2, 20, 22), prepMins: 22, cashier: 'Eduard Albu',
    customer: { name: 'Masa 2' },
    items: [ { name: 'Quattro Formaggi', qty: 1, price: 42, mods: [] }, { name: 'Carbonara', qty: 1, price: 34, mods: [] }, { name: 'Vin roșu (pahar)', qty: 2, price: 18, mods: [] } ],
    payment: 'card', paid: true, subtotal: 112, deliveryFee: 0, tip: 0, tax: 17.82, total: 118 },
  { id: '#1012', num: 1012, source: 'phone', type: 'pickup', status: 'completed', closedAt: hd(2, 19, 35), prepMins: 18, cashier: 'Raluca Stan',
    customer: { name: 'Alina Barbu', phone: '+40 723 667 021' },
    items: [ { name: 'Pesto', qty: 1, price: 30, mods: [] }, { name: 'Cezar', qty: 1, price: 28, mods: [] }, { name: 'Coca-Cola', qty: 1, price: 10, mods: [] } ],
    payment: 'cash', paid: true, subtotal: 68, deliveryFee: 0, tip: 0, tax: 10.81, total: 67 },
];

// Period-level rollups (30-day window the sample sits inside).
const HISTORY_SUMMARY = { orders: 486, revenue: 34180, avg: 70, refundCount: 7, refundTotal: 640, cancelCount: 21 };

window.MENU_CATEGORIES = MENU_CATEGORIES;
window.MENU_ITEMS = MENU_ITEMS;
window.ORDERS = ORDERS;
window.HISTORY_ORDERS = HISTORY_ORDERS;
window.HISTORY_SUMMARY = HISTORY_SUMMARY;
window.PRINTERS = PRINTERS;
window.USERS = USERS;

// ─── Helpers ─────────────────────────────────────────────
window.formatRON = (n) => new Intl.NumberFormat('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n) + ' lei';
window.elapsedMinutes = (iso) => Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
window.orderTimeLabel = (iso) => {
  const d = new Date(iso);
  return d.toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' });
};
