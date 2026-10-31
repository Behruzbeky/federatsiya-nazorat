// Demo dataset + business rules for Federatsiya Nazorat.
// Everything is generated deterministically from a seed so every reload shows the same numbers.

export const TODAY = new Date(2026, 9, 31);
export const YEAR = 2026;
export const MONTHS = 10; // Jan..Oct 2026 are open periods

function rng(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const R = rng(20261031);
const pick = (a) => a[Math.floor(R() * a.length)];
const int = (a, b) => a + Math.floor(R() * (b - a + 1));

/* ---------- Working-day calendar (Uzbekistan 2026, demo) ---------- */
const HOLIDAYS = new Set(['2026-01-01', '2026-03-08', '2026-03-20', '2026-03-21', '2026-03-23',
  '2026-05-09', '2026-05-27', '2026-05-28', '2026-09-01', '2026-10-01', '2026-12-08', '2026-12-31']);
export const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const isWorkday = (d) => d.getDay() !== 0 && d.getDay() !== 6 && !HOLIDAYS.has(iso(d));
/** n-th working day of the month after `m` (0-based month of YEAR) */
export function nthWorkday(m, n) {
  const d = new Date(YEAR, m + 1, 1);
  let c = 0;
  while (true) { if (isWorkday(d)) { c++; if (c === n) return new Date(d); } d.setDate(d.getDate() + 1); }
}
export function workdaysBetween(a, b) {
  if (b <= a) return 0;
  const d = new Date(a); let c = 0;
  d.setDate(d.getDate() + 1);
  while (d <= b) { if (isWorkday(d)) c++; d.setDate(d.getDate() + 1); }
  return c;
}
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };

/* ---------- Distribution rules (versioned) ---------- */
export const RULES = [
  { id: 'R-5.9', source: 'society', ver: 'v2014.1', basis: 'Ustav 5.9 · Tartib 2.4', from: '2014-04-29',
    parts: [['region', 20], ['center', 10], ['society', 60], ['groups', 10]] },
  { id: 'R-5.10', source: 'regionDirect', ver: 'v2014.1', basis: 'Ustav 5.10 · Tartib 3.4', from: '2014-04-29',
    parts: [['groups', 10], ['center', 36], ['region', 54]] },
  { id: 'R-OTH', source: 'regionOther', ver: 'v2014.1', basis: 'Tartib 3.5', from: '2014-04-29',
    parts: [['center', 10], ['region', 90]], clarify: true },
  { id: 'R-NO', source: 'regionFromSocieties', ver: '—', basis: 'Ustav 5.10', parts: null, blocked: 'redistribution' },
  { id: 'R-SEP', source: 'restricted', ver: '—', basis: 'Tartib 2.7', parts: null, blocked: 'separate' },
];
/** Split `amount` (whole so'm) by rule; rounding remainder goes to the last direction. */
export function distribute(amount, ruleId) {
  const rule = RULES.find((r) => r.id === ruleId);
  if (!rule || !rule.parts) return { rule, rows: [], total: 0, blocked: rule && rule.blocked };
  let acc = 0;
  const rows = rule.parts.map(([to, pct], i) => {
    const last = i === rule.parts.length - 1;
    const sum = last ? amount - acc : Math.floor((amount * pct) / 100);
    acc += sum;
    return { to, pct, sum };
  });
  return { rule, rows, total: acc };
}

export const TARIFFS = [
  { id: 'T-24', from: '2024-01-01', to: '2025-12-31', monthly: 10000, entry: 20000, decision: 'Kengash qarori №3/23' },
  { id: 'T-26', from: '2026-01-01', to: null, monthly: 12000, entry: 25000, decision: 'Kengash qarori №1/26' },
];
const TARIFF = TARIFFS[1];
export const BENEFITS = { pensioner: 0.5, disabled: 1, student: 0.5 };

/* ---------- Organisation tree ---------- */
const RAW = [
  ['Qoraqalpogʻiston Respublikasi', 'Республика Каракалпакстан', 'Republic of Karakalpakstan', ['Nukus sh.', 'Xoʻjayli', 'Toʻrtkoʻl', 'Chimboy']],
  ['Andijon viloyati', 'Андижанская область', 'Andijan region', ['Andijon sh.', 'Asaka', 'Xonobod sh.', 'Shahrixon']],
  ['Buxoro viloyati', 'Бухарская область', 'Bukhara region', ['Buxoro sh.', 'Gʻijduvon', 'Kogon', 'Vobkent']],
  ['Fargʻona viloyati', 'Ферганская область', 'Fergana region', ['Fargʻona sh.', 'Margʻilon sh.', 'Qoʻqon sh.', 'Rishton']],
  ['Jizzax viloyati', 'Джизакская область', 'Jizzakh region', ['Jizzax sh.', 'Zomin', 'Gʻallaorol', 'Doʻstlik']],
  ['Xorazm viloyati', 'Хорезмская область', 'Khorezm region', ['Urganch sh.', 'Xiva', 'Xonqa', 'Gurlan']],
  ['Namangan viloyati', 'Наманганская область', 'Namangan region', ['Namangan sh.', 'Chust', 'Kosonsoy', 'Pop']],
  ['Navoiy viloyati', 'Навоийская область', 'Navoi region', ['Navoiy sh.', 'Zarafshon sh.', 'Karmana', 'Nurota']],
  ['Qashqadaryo viloyati', 'Кашкадарьинская область', 'Kashkadarya region', ['Qarshi sh.', 'Shahrisabz', 'Kitob', 'Gʻuzor']],
  ['Samarqand viloyati', 'Самаркандская область', 'Samarkand region', ['Samarqand sh.', 'Urgut', 'Kattaqoʻrgʻon', 'Pastdargʻom']],
  ['Sirdaryo viloyati', 'Сырдарьинская область', 'Syrdarya region', ['Guliston sh.', 'Yangiyer sh.', 'Boyovut', 'Sirdaryo']],
  ['Surxondaryo viloyati', 'Сурхандарьинская область', 'Surkhandarya region', ['Termiz sh.', 'Denov', 'Sherobod', 'Shoʻrchi']],
  ['Toshkent viloyati', 'Ташкентская область', 'Tashkent region', ['Nurafshon sh.', 'Chirchiq sh.', 'Olmaliq sh.', 'Zangiota']],
  ['Toshkent shahri', 'город Ташкент', 'Tashkent city', ['Yunusobod', 'Chilonzor', 'Mirzo Ulugʻbek', 'Yakkasaroy']],
];
export const REGIONS = [];
export const SOCIETIES = [];
export const GROUPS = [];
RAW.forEach(([uz, ru, en, ds], ri) => {
  const region = { id: `R${String(ri + 1).padStart(2, '0')}`, name: { uz, ru, en }, societies: [] };
  REGIONS.push(region);
  ds.forEach((d, di) => {
    const s = { id: `${region.id}-S${di + 1}`, region: region.id, name: d, groups: [],
      payRate: 0.62 + R() * 0.36, discipline: R(), account: `DEMO0000${int(100000000000, 999999999999)}` };
    region.societies.push(s.id); SOCIETIES.push(s);
    const gn = int(2, 3);
    for (let g = 1; g <= gn; g++) {
      const grp = { id: `${s.id}-G${g}`, society: s.id, region: region.id, n: g, head: null };
      s.groups.push(grp.id); GROUPS.push(grp);
    }
  });
});
export const byId = {};
[...REGIONS, ...SOCIETIES, ...GROUPS].forEach((o) => { byId[o.id] = o; });

/* ---------- Members ---------- */
const LAST_M = ['Karimov', 'Rahimov', 'Toshmatov', 'Yusupov', 'Abdullayev', 'Ismoilov', 'Nazarov', 'Xolmatov', 'Ergashev', 'Saidov', 'Qodirov', 'Mirzayev', 'Usmonov', 'Haydarov', 'Sobirov', 'Normatov', 'Joʻrayev', 'Aliyev', 'Hamidov', 'Tursunov', 'Valiyev', 'Rasulov', 'Sharipov', 'Oripov'];
const FIRST_M = ['Aziz', 'Bekzod', 'Jasur', 'Sardor', 'Otabek', 'Dilshod', 'Rustam', 'Sherzod', 'Akmal', 'Bobur', 'Ulugʻbek', 'Farrux', 'Javlon', 'Shoxrux', 'Anvar', 'Doniyor', 'Ilhom', 'Murod', 'Nodir', 'Temur'];
const FIRST_F = ['Dilnoza', 'Gulnora', 'Madina', 'Nilufar', 'Shahnoza', 'Zarina', 'Malika', 'Feruza', 'Kamola', 'Sevara', 'Mohira', 'Nodira', 'Lola', 'Barno', 'Umida', 'Yulduz', 'Dildora', 'Ozoda'];
const PATR = ['Bahodir', 'Alisher', 'Rustam', 'Karim', 'Ergash', 'Shavkat', 'Abdulla', 'Mahmud', 'Odil', 'Tolib', 'Hamid', 'Salim'];

export const MEMBERS = [];
let seq = 1;
for (const s of SOCIETIES) {
  const n = int(70, 190);
  for (let i = 0; i < n; i++) {
    const f = R() < 0.46;
    const last = pick(LAST_M);
    const joinedYear = R() < 0.14 ? YEAR : int(2016, 2025);
    const joinedMonth = joinedYear === YEAR ? int(0, MONTHS - 1) : int(0, 11);
    const joined = new Date(joinedYear, joinedMonth, int(1, 28));
    const st = R();
    const status = st < 0.9 ? 'active' : st < 0.95 ? 'suspended' : st < 0.98 ? 'transferred' : 'left';
    const b = R();
    const benefit = b < 0.08 ? 'pensioner' : b < 0.11 ? 'disabled' : b < 0.15 ? 'student' : null;
    const startM = joinedYear === YEAR ? joinedMonth : 0;
    const due = status === 'active' ? MONTHS - startM : Math.max(0, int(2, 8) - startM);
    const paid = benefit === 'disabled' ? due : Math.min(due, Math.round(due * (s.payRate + (R() - 0.5) * 0.5)));
    MEMBERS.push({
      id: `FN-${String(seq++).padStart(6, '0')}`,
      name: `${f ? last + 'a' : last} ${f ? pick(FIRST_F) : pick(FIRST_M)} ${pick(PATR)} ${f ? 'qizi' : 'oʻgʻli'}`,
      gender: f ? 'f' : 'm', doc: `XX-DEMO-${int(100000, 999999)}`,
      joined, order: `№${int(1, 140)}-B`, region: s.region, society: s.id, group: pick(s.groups),
      status, benefit, startM, due, paid: Math.max(0, paid), ph: R(),
      phone: `+998 ${pick(['90', '91', '93', '94', '97', '99', '88'])} ••• •• ${int(10, 99)}`,
    });
  }
}
for (const g of GROUPS) {
  const m = MEMBERS.find((x) => x.group === g.id && x.status === 'active');
  g.head = m ? m.name.split(' ').slice(0, 2).join(' ') : '—';
}
export const memberRate = (m) => TARIFF.monthly * (1 - (BENEFITS[m.benefit] || 0));
export const memberDebt = (m) => (m.due - m.paid) * memberRate(m);

/* ---------- Monthly aggregates per society ---------- */
// agg[societyId] = { charged:[10], received:[10], entry:[10] }
export const AGG = {};
for (const s of SOCIETIES) AGG[s.id] = { charged: Array(MONTHS).fill(0), received: Array(MONTHS).fill(0) };
for (const m of MEMBERS) {
  const a = AGG[m.society]; const rate = memberRate(m);
  for (let k = 0; k < m.due; k++) a.charged[m.startM + k] += rate;
  // paid months are spread across the member's due range (partial payers skip some months)
  for (let k = 0; k < m.paid; k++) a.received[m.startM + Math.floor(((k + m.ph) * m.due) / m.paid)] += rate;
  if (m.joined.getFullYear() === YEAR) { a.charged[m.startM] += TARIFF.entry; a.received[m.startM] += TARIFF.entry; }
}

/* ---------- Transfer obligations ---------- */
// For each society & month: 20% to region, 10% to center (due 5th working day of next month).
// For each region & month: 36% of direct collections to center (due 3rd working day).
export const OBLIGATIONS = [];
let oseq = 1;
function makeOb(o) {
  const dueDate = nthWorkday(o.month, o.dueN);
  const closed = dueDate < TODAY;
  const disc = o.discipline;
  let paid = 0, orderDate = null, bankDate = null;
  const roll = R();
  if (closed) {
    if (roll < 0.70 + disc * 0.2) { paid = o.amount; orderDate = addDays(dueDate, -int(1, 4)); bankDate = addDays(orderDate, int(0, 1)); }
    else if (roll < 0.86 + disc * 0.1) { paid = o.amount; orderDate = addDays(dueDate, int(1, 9)); bankDate = addDays(orderDate, 1); }
    else if (roll < 0.94) { paid = Math.round(o.amount * (0.3 + R() * 0.5)); orderDate = addDays(dueDate, int(-2, 6)); bankDate = addDays(orderDate, 1); }
    else if (roll < 0.97) { orderDate = addDays(dueDate, int(0, 3)); } // order issued, bank not confirmed
  } else if (roll < 0.22) { orderDate = addDays(TODAY, -int(0, 2)); }
  if (bankDate && bankDate > TODAY) bankDate = null;
  const status = !closed && !paid ? (orderDate ? 'ordered' : 'pending')
    : paid >= o.amount ? (bankDate <= dueDate ? 'done' : 'doneLate')
    : paid > 0 ? 'partial' : orderDate ? 'unconfirmed' : 'overdue';
  const overdueDays = closed && status !== 'done' ? workdaysBetween(dueDate, bankDate && paid >= o.amount ? bankDate : TODAY) : 0;
  OBLIGATIONS.push({ ...o, id: `OB-${String(oseq++).padStart(5, '0')}`, dueDate, paid, orderDate, bankDate, status, overdueDays,
    orderNo: orderDate ? `PT-${int(1000, 9999)}` : null, bankRef: bankDate ? `TXN${int(10000000, 99999999)}` : null });
}
for (let m = 0; m < MONTHS; m++) {
  for (const s of SOCIETIES) {
    const base = Math.round(AGG[s.id].received[m]);
    const { rows } = distribute(base, 'R-5.9');
    makeOb({ from: s.id, to: s.region, kind: 'society', month: m, dueN: 5, amount: rows[0].sum, rule: 'R-5.9', pct: 20, discipline: s.discipline });
    makeOb({ from: s.id, to: 'CENTER', kind: 'society', month: m, dueN: 5, amount: rows[1].sum, rule: 'R-5.9', pct: 10, discipline: s.discipline });
  }
  for (const r of REGIONS) {
    const direct = Math.round(1800000 + R() * 4200000);
    const { rows } = distribute(direct, 'R-5.10');
    makeOb({ from: r.id, to: 'CENTER', kind: 'region', month: m, dueN: 3, amount: rows[1].sum, base: direct, rule: 'R-5.10', pct: 36, discipline: 0.6 });
  }
}

/* ---------- Bank statement (October) ---------- */
export const BANK = [];
let tseq = 1;
for (const s of SOCIETIES) {
  let left = Math.round(AGG[s.id].received[MONTHS - 1]);
  const parts = int(2, 5);
  for (let p = 0; p < parts && left > 0; p++) {
    const amt = p === parts - 1 ? left : Math.round(left * (0.2 + R() * 0.3) / 1000) * 1000;
    left -= amt;
    const cnt = Math.max(1, Math.round(amt / TARIFF.monthly));
    BANK.push({ id: `TXN${String(60000000 + tseq++)}`, date: new Date(YEAR, 9, int(1, 30)), amount: amt,
      payer: `${s.name} tayanch guruhi (roʻyxat ${cnt} nafar)`, account: s.account, society: s.id, region: s.region,
      purpose: `Aʼzolik badali, oktyabr 2026, ${cnt} aʼzo`, status: 'matched' });
  }
}
const UNKNOWN = ['Jismoniy shaxs', 'XK «Baraka Savdo»', 'Naqd pul topshirish', 'P2P oʻtkazma', 'MChJ «Ishonch Servis»'];
for (let i = 0; i < 14; i++) {
  const s = pick(SOCIETIES);
  BANK.push({ id: `TXN${String(60000000 + tseq++)}`, date: new Date(YEAR, 9, int(1, 30)), amount: int(1, 40) * 12000,
    payer: pick(UNKNOWN), account: s.account, society: s.id, region: s.region, purpose: pick(['badal', 'toʻlov', 'aʼzolik uchun', '—']), status: 'unclear' });
}
for (let i = 0; i < 4; i++) { const src = BANK[int(0, 200)]; BANK.push({ ...src, status: 'duplicate', dupOf: src.id }); }
BANK.sort((a, b) => b.date - a.date);

/* ---------- Registers & reports submission ---------- */
export const REGISTERS = [];
for (let m = 0; m < MONTHS; m++) {
  for (const s of SOCIETIES) {
    const due = new Date(YEAR, m + 1, 5);
    const closed = due < TODAY;
    const late = R() < 0.12 + (1 - s.discipline) * 0.12;
    const sub = closed ? (late ? (R() < 0.3 ? null : addDays(due, int(1, 9))) : addDays(due, -int(0, 4))) : (R() < 0.15 ? addDays(TODAY, -int(0, 3)) : null);
    REGISTERS.push({ kind: 'society', org: s.id, region: s.region, month: m, due, submitted: sub, ver: sub ? int(1, 3) : 0 });
  }
  for (const r of REGIONS) {
    const due = new Date(YEAR, m + 1, 7);
    const closed = due < TODAY;
    const sub = closed ? addDays(due, R() < 0.15 ? int(1, 5) : -int(0, 2)) : null;
    REGISTERS.push({ kind: 'region', org: r.id, region: r.id, month: m, due, submitted: sub, ver: sub ? int(1, 2) : 0 });
  }
}

/* ---------- Support group expenses ---------- */
export const EXPENSES = [];
const EXP = ['Tushuntirish varaqalari chop etish', 'Iste’molchilar uchun seminar', 'Bozor monitoringi (transport)', 'Ofis jihozlari', 'Huquqiy maslahat kuni', 'Aloqa xizmatlari'];
for (const g of GROUPS) {
  const n = int(1, 4);
  for (let i = 0; i < n; i++) {
    EXPENSES.push({ id: `EX-${g.id}-${i}`, group: g.id, society: g.society, region: g.region, title: pick(EXP),
      date: new Date(YEAR, int(0, 9), int(1, 28)), amount: int(2, 18) * 25000, doc: R() < 0.84 ? `Dalolatnoma №${int(10, 99)}` : null });
  }
}

/* ---------- Audit journal (seed) ---------- */
export const USERS = ['A. Karimov (markaziy moliya)', 'D. Rahimova (buxgalter)', 'S. Yusupov (rais)', 'N. Saidova (auditor)', 'tizim'];
export const AUDIT = [];
const ACT = [['import', 'Bank koʻchirmasi yuklandi'], ['confirm', 'Toʻlov bank tomonidan tasdiqlandi'], ['member', 'Aʼzo maʼlumoti oʻzgartirildi'],
  ['order', 'Toʻlov topshiriqnomasi yaratildi'], ['rule', 'Qoida versiyasi koʻrib chiqildi'], ['login', 'Tizimga kirish (2FA)'], ['register', 'Reyestr yuborildi']];
for (let i = 0; i < 60; i++) {
  const [k, t] = pick(ACT); const s = pick(SOCIETIES);
  AUDIT.push({ at: new Date(YEAR, 9, 31 - Math.floor(i / 3), int(8, 18), int(0, 59)), user: pick(USERS), kind: k, text: t,
    obj: k === 'member' ? pick(MEMBERS).id : k === 'confirm' || k === 'order' ? `OB-${String(int(1, 1200)).padStart(5, '0')}` : s.id,
    basis: k === 'confirm' ? `TXN${int(60000000, 60000300)}` : k === 'member' ? 'Ariza №' + int(10, 99) : '—', ip: `10.12.${int(1, 40)}.${int(2, 250)}` });
}
