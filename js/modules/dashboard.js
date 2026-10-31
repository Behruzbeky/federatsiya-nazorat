import { t, mon } from '../i18n.js';
import { kpi, card, donut, gauge, setGauge, short, num, pct, esc, pill, date, icon, segmented, drillAttr, delta, setDelta } from '../ui.js';
import { areaChart, mountCharts, updateChart, capsules, updateCapsule, countUp } from '../charts.js';
import { metrics, ranking, obligations, registers, societies, S, orgName, scopeType, resetCache, regionName } from '../store.js';
import { distribute, MONTHS, TODAY, AUDIT, AGG, BANK, nthWorkday, byId, YEAR } from '../data.js';
import { F, wire } from './_common.js';

const COLORS = { region: '#2f8cff', center: '#ef3b45', society: '#4fc3ff', groups: '#e8c27a' };
const CODES = { R01: 'QR', R02: 'AN', R03: 'BU', R04: 'FA', R05: 'JI', R06: 'XO', R07: 'NA', R08: 'NV', R09: 'QA', R10: 'SA', R11: 'SI', R12: 'SU', R13: 'TV', R14: 'TSh' };
const feed = []; // latest live receipts (kept across visits)
let timer = 0, paused = false;

const capItems = (rk) => rk.slice(0, 14).map((r) => ({ id: r.id, label: CODES[r.id] || r.name.split(' ')[0], v: r.collect, text: `${r.name}: ${pct(r.collect, 1)}`, tone: r.collect < 0.72 ? 'bad' : '' }));
const feedRow = (f) => `<div class="drill"${drillAttr(`bank?q=${f.id}`, f.id)}><span class="fi">${icon('bank', 15)}</span><div><b>${esc(f.soc)}</b><small>${esc(f.id)} · ${esc(f.time)}</small></div><b>+${num(f.amount)}</b></div>`;

export function render() {
  const f = F('dashboard', { range: 'year' });
  const m = metrics();
  const obs = obligations();
  const last = m.received[MONTHS - 1];
  const split = distribute(Math.round(last), 'R-5.9').rows;
  const regs = registers();
  const from = f.range === 'q' ? MONTHS - 3 : f.range === 'h' ? MONTHS - 6 : 0;
  const labels = Array.from({ length: MONTHS - from }, (_, i) => mon(from + i));

  const top = `<div class="grid g4">
    ${kpi({ label: t('k_members'), value: `<span data-k="active">${num(m.active)}</span>`, sub: `${t('total')}: ${num(m.total)}`, ic: 'members', tone: 'hl', spark: [3, 4, 4, 5, 5, 6, 6, 7, 7, 8], drill: 'members?status=active', d: { now: m.active, prev: m.prev.active } })}
    ${kpi({ label: t('k_collect'), value: `<span data-k="collect" data-v="${m.collect}">${pct(m.collect)}</span>`, sub: `${short(m.rc)} / ${short(m.ch)}`, ic: 'fees', tone: m.collect > 0.85 ? 'ok' : 'warn', spark: m.received, drill: 'fees', d: { now: m.collect, prev: m.prev.collect, pp: true, id: 'collect' } })}
    ${kpi({ label: t('k_debt'), value: `<span data-k="debt" data-v="${m.debt}">${short(m.debt)}</span> <small>${t('sum')}</small>`, sub: t('ytd'), ic: 'alert', tone: 'bad', spark: m.charged.map((c, i) => c - m.received[i]), drill: 'members?debt=1', d: { now: m.debt, prev: m.prev.debt, good: 'down', id: 'debt' } })}
    ${kpi({ label: t('k_timely'), value: pct(m.timely), sub: `${t('k_overdue')}: ${num(m.overdue.length)} · ${short(m.overdueSum)}`, ic: 'transfers', tone: m.timely > 0.8 ? 'ok' : 'warn', drill: 'transfers?st=problem', d: { now: m.timely, prev: m.prev.timely, pp: true } })}
  </div>`;
  // KPI set from section 11 of the concept, each with its change vs the end of last month
  const low = `<div class="grid g4">
    ${kpi({ label: t('k_registers'), value: pct(m.registers), sub: t('ytd'), ic: 'reports', tone: m.registers > 0.85 ? 'ok' : 'warn', drill: 'reports', d: { now: m.registers, prev: m.prev.registers, pp: true } })}
    ${kpi({ label: t('k_discrep'), value: `0 <small>${t('sum')}</small>`, sub: t('check100'), ic: 'scale', tone: 'ok', drill: 'distribution', d: { now: 0, prev: 0, pp: true } })}
    ${kpi({ label: t('k_docs'), value: pct(m.docs), sub: t('groups'), ic: 'file', tone: m.docs > 0.9 ? 'ok' : 'warn', drill: 'groups?nodoc=1', d: { now: m.docs, prev: m.prev.docs, pp: true } })}
    ${kpi({ label: t('k_overdue'), value: `${short(m.overdueSum)} <small>${t('sum')}</small>`, sub: `${num(m.overdue.length)} ${t('obligation').toLowerCase()}`, ic: 'clock', tone: 'bad', drill: 'transfers?st=problem', d: { now: m.overdueSum, prev: m.prev.overdueSum, good: 'down' } })}
  </div>`;

  const chart = card(t('receiptsByMonth'), `<p class="muted small" style="margin:-8px 0 6px">${t('plan')} / ${t('fact')} · <span class="num drill"${drillAttr(`bank?st=matched&m=${MONTHS - 1}`, `${t('received')} · ${mon(MONTHS - 1)}`)}><span data-k="rcMonth" data-v="${last}">${short(last)}</span> ${t('sum')} — ${mon(MONTHS - 1)}</span> ${delta({ now: last, prev: m.prev.month, id: 'month' })}</p>
      ${areaChart('rcpt', m.charged.slice(from), m.received.slice(from), labels, { unit: t('sum'), planLabel: t('plan'), drill: (i) => [`bank?st=matched&m=${from + i}`, `${t('received')} · ${mon(from + i)} 2026`] })}`,
  { actions: segmented('dashRange', [['q', '3 oy'], ['h', '6 oy'], ['year', String(YEAR)]], f.range) });

  const side = card(t('distShare'), `<div style="display:flex;gap:16px;align-items:center;flex-wrap:wrap">
      <div id="dDonut" class="drill"${drillAttr('distribution', t('distShare'))}>${donut(split.map((r) => ({ v: r.sum, color: COLORS[r.to], tip: `${t('to_' + r.to)}: ${num(r.sum)}` })), { value: short(last), label: mon(MONTHS - 1) })}</div>
      <div style="flex:1;min-width:150px;display:grid;gap:10px">${split.map((r) => `<div style="display:flex;justify-content:space-between;gap:8px;font-size:12.5px"><span><i style="display:inline-block;width:8px;height:8px;border-radius:2px;background:${COLORS[r.to]};margin-right:8px"></i>${esc(t('to_' + r.to))}</span><b>${r.pct}%</b></div>`).join('')}</div>
    </div><div class="drill" style="display:flex;justify-content:center;margin-top:8px"${drillAttr('fees', t('k_collect'))}>${gauge(m.collect, t('k_collect'), 'dGauge')}</div>`);

  const caps = card(scopeType() === 'republic' ? t('regionsCollect') : t('k_collect'), capsules(capItems(ranking())),
    { actions: `<span class="muted small">${t('k_collect')} · ${t('ytd')}</span>` });

  const live = card(t('liveFeed'), `<p class="muted small" style="margin:-8px 0 10px">${t('liveNote')}</p><div class="feed" id="feed">${feed.slice(0, 6).map(feedRow).join('')}</div>`,
    { actions: `<span class="live"><i></i>LIVE</span><button class="btn sm ghost" id="livePause">${paused ? t('resume') : t('pause')}</button>` });

  const od = m.overdue.slice().sort((a, b) => (b.amount - b.paid) - (a.amount - a.paid)).slice(0, 6);
  const odCard = card(t('overdueList'), od.length ? `<div class="tbl-wrap"><table class="tbl"><tbody>${od.map((o) => `<tr class="drill"${drillAttr(`transfers?st=all&q=${o.id}`, o.id)}><td>${esc(orgName(o.from))}<br><small>→ ${esc(orgName(o.to))} · ${mon(o.month)} · ${o.pct}%</small></td>
      <td>${pill(o.status)}</td><td class="r"><b>${short(o.amount - o.paid)}</b><br><small>${o.overdueDays} ${t('days')}</small></td></tr>`).join('')}</tbody></table></div>` : `<p class="muted">${t('noData')}</p>`,
  { actions: `<a class="btn sm" href="#/transfers">${t('details')} ${icon('chevron', 14)}</a>` });

  const dl = [[`${t('registers')} (${t('society')})`, new Date(YEAR, MONTHS, 5)], [`${t('registers')} (${t('region')})`, new Date(YEAR, MONTHS, 7)],
    [`20/10 → ${t('to_region')}`, nthWorkday(MONTHS - 1, 5)], [`36% → ${t('to_center')}`, nthWorkday(MONTHS - 1, 3)], [t('rep_monthly'), new Date(YEAR, MONTHS, 10)]].sort((a, b) => a[1] - b[1]);
  const dlTo = (l) => (l.includes('→') ? 'transfers?st=open' : 'reports');
  const dlCard = card(t('deadlines'), `<div style="display:grid;gap:10px">${dl.map(([l, d]) => `<div class="drill"${drillAttr(dlTo(l), l)} style="display:flex;justify-content:space-between;align-items:center;gap:10px;font-size:12.8px">
      <span style="display:flex;gap:10px;align-items:center">${icon('calendar', 15)}${esc(l)}</span><b>${date(d)}</b></div>`).join('')}</div>`);

  const confirmed = obs.filter((o) => o.bankDate).length, ordered = obs.filter((o) => o.orderDate).length;
  const steps = [[t('p1'), num(m.total)], [t('p2'), short(m.ch)], [t('p3'), `<span data-k="rc" data-v="${m.rc}">${short(m.rc)}</span>`], [t('p4'), num(obs.length)],
    [t('p5'), num(ordered)], [t('p6'), num(confirmed)], [t('p7'), num(regs.filter((r) => r.submitted).length)], [t('p8'), num(AUDIT.length)]];
  const DR = ['members', 'fees', 'bank?st=matched', 'transfers?st=all', 'transfers?st=open', 'transfers?st=done', 'reports', 'audit'];
  const pipeline = card(t('pipeline'), `<div class="pipeline">${steps.map(([a, b], i) => `<div class="drill"${drillAttr(DR[i], a)}>${esc(a)}<b>${b}</b></div>`).join('')}</div>`);

  return `<div class="page-h"><div><h1>${t('dashboard')}</h1><p>${esc(S.role.user)} · ${esc(t(S.role.key))} · ${date(TODAY)}</p></div>
      <div class="card-a"><a class="btn" href="#/reports">${icon('download', 15)} ${t('export')}</a><a class="btn primary" href="#/bank">${icon('upload', 15)} ${t('uploadStatement')}</a></div></div>
    <div class="grid" style="gap:14px">${top}
      <div class="grid g-main">${chart}${side}</div>
      <div class="grid g-main">${caps}${live}</div>
      ${low}
      ${pipeline}
      <div class="grid g-main">${odCard}${dlCard}</div></div>`;
}

/* ---------- real-time demo stream: a bank receipt every ~3 s updates everything in place ---------- */
function tick(root) {
  if (!root.isConnected || S.page !== 'dashboard') { clearTimeout(timer); timer = 0; return; }
  if (!paused && !document.hidden) { // no work while the tab is in the background
    const socs = societies(); const s = socs[Math.floor(Math.random() * socs.length)];
    const amount = (1 + Math.floor(Math.random() * 24)) * 12000;
    AGG[s.id].received[MONTHS - 1] += amount;
    const id = `TXN${String(61000000 + Math.floor(Math.random() * 899999))}`;
    BANK.unshift({ id, date: new Date(), amount, payer: `${s.name} tayanch guruhi`, account: s.account, society: s.id, region: s.region, purpose: 'Aʼzolik badali (onlayn)', status: 'matched', month: MONTHS - 1 });
    const now = new Date();
    feed.unshift({ id, soc: `${s.name} · ${regionName(s.region)}`, amount, time: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}` });
    feed.length = Math.min(feed.length, 12);
    resetCache();
    const m = metrics(); const f = F('dashboard');
    const from = f.range === 'q' ? MONTHS - 3 : f.range === 'h' ? MONTHS - 6 : 0;
    countUp(root.querySelector('[data-k="collect"]'), m.collect, (v) => pct(v));
    countUp(root.querySelector('[data-k="debt"]'), m.debt, (v) => short(v));
    countUp(root.querySelector('[data-k="rc"]'), m.rc, (v) => short(v));
    countUp(root.querySelector('[data-k="rcMonth"]'), m.received[MONTHS - 1], (v) => short(v));
    setDelta(root, 'collect', { now: m.collect, prev: m.prev.collect, pp: true });
    setDelta(root, 'debt', { now: m.debt, prev: m.prev.debt, good: 'down' });
    setDelta(root, 'month', { now: m.received[MONTHS - 1], prev: m.prev.month });
    root.querySelectorAll('[data-k="collect"],[data-k="rc"],[data-k="rcMonth"]').forEach((el) => { el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash'); });
    updateChart('rcpt', m.received.slice(from), m.charged.slice(from));
    setGauge(root.querySelector('#dGauge'), m.collect);
    const dv = root.querySelector('#dDonut .d-val'); if (dv) dv.textContent = short(m.received[MONTHS - 1]);
    const unit = scopeType() === 'republic' ? s.region : s.id;
    const r = ranking().find((x) => x.id === unit); if (r) updateCapsule(root, unit, r.collect, `${r.name}: ${pct(r.collect, 1)}`);
    const box = root.querySelector('#feed');
    if (box) { box.insertAdjacentHTML('afterbegin', feedRow(feed[0])); while (box.children.length > 6) box.lastElementChild.remove(); }
  }
  timer = setTimeout(() => tick(root), 2600 + Math.random() * 1800);
}

export function mount(el, rerender) {
  wire(el, 'dashboard', rerender, ({ name, value }) => { if (name === 'dashRange') { F('dashboard').range = value; rerender(); } });
  mountCharts(el);
  el.querySelector('#livePause').addEventListener('click', (e) => { paused = !paused; e.currentTarget.textContent = paused ? t('resume') : t('pause'); });
  el.addEventListener('click', (e) => { const c = e.target.closest('[data-cap]'); if (c && byId[c.dataset.cap]) { S.filters.fees = scopeType() === 'republic' ? { region: c.dataset.cap, _via: regionName(c.dataset.cap) } : { soc: c.dataset.cap, _via: byId[c.dataset.cap].name }; location.hash = '#/fees'; } });
  clearTimeout(timer); timer = setTimeout(() => tick(el), 1500);
}
