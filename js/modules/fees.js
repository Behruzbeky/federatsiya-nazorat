import { t, mon } from '../i18n.js';
import { table, esc, num, short, pct, bar, card, kpi, downloadCSV, icon, segmented } from '../ui.js';
import { societies, members, S, regionName, metrics, scopeType } from '../store.js';
import { AGG, TARIFFS, MONTHS, BENEFITS, REGIONS } from '../data.js';
import { F, wire, opt, drillBar } from './_common.js';

let rows = [];
export function render() {
  const f = F('fees', { m: 'ytd', region: '', soc: '' });
  const ms = members();
  const cnt = {}; ms.forEach((m) => { if (m.status === 'active') cnt[m.society] = (cnt[m.society] || 0) + 1; });
  rows = societies().filter((s) => (!f.region || s.region === f.region) && (!f.soc || s.id === f.soc)).map((s) => {
    const a = AGG[s.id];
    const ch = f.m === 'ytd' ? a.charged.reduce((x, y) => x + y, 0) : a.charged[+f.m];
    const rc = f.m === 'ytd' ? a.received.reduce((x, y) => x + y, 0) : a.received[+f.m];
    return { s, ch, rc, debt: Math.max(0, ch - rc), over: Math.max(0, rc - ch), rate: rc / (ch || 1), n: cnt[s.id] || 0 };
  }).sort((a, b) => a.rate - b.rate);
  const tot = rows.reduce((o, r) => ({ ch: o.ch + r.ch, rc: o.rc + r.rc, debt: o.debt + r.debt }), { ch: 0, rc: 0, debt: 0 });
  const m = metrics();
  const cols = [
    { label: t('society'), render: (r) => `<b>${esc(r.s.name)}</b><br><small>${esc(regionName(r.s.region))}</small>` },
    { label: t('membersN'), cls: 'r', render: (r) => num(r.n) },
    { label: t('charged'), cls: 'r', render: (r) => num(r.ch) },
    { label: t('received'), cls: 'r', render: (r) => num(r.rc) },
    { label: t('debtM'), cls: 'r', render: (r) => (r.debt ? `<b style="color:#ff7b83">${num(r.debt)}</b>` : '0') },
    { label: t('k_collect'), render: (r) => `<div style="display:grid;grid-template-columns:110px 48px;gap:10px;align-items:center">${bar(r.rate, r.rate < 0.7 ? 'red' : r.rate > 0.9 ? 'ok' : '')}<b>${pct(r.rate, 0)}</b></div>` },
  ];
  const T = TARIFFS;
  const tariffs = card(t('tariffsTitle'), `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>${t('version')}</th><th>${t('period')}</th><th class="r">${t('monthlyFee')}</th><th class="r">${t('entryFee')}</th><th>${t('decision')}</th></tr></thead>
    <tbody>${T.map((x) => `<tr><td class="mono">${esc(x.id)}</td><td>${esc(x.from)} → ${esc(x.to || '…')}</td><td class="r">${num(x.monthly)}</td><td class="r">${num(x.entry)}</td><td>${esc(x.decision)}</td></tr>`).join('')}</tbody></table></div>
    <div class="chips" style="margin-top:12px">${Object.entries(BENEFITS).map(([k]) => `<span class="pill info">${esc(t(k))}</span>`).join('')}</div>
    <div class="note">${icon('clock', 16)}<span>Avtomatik hisoblashda tarifning kuchga kirgan sanasi hisobga olinadi; oʻtgan davrlar qayta hisoblanmaydi.</span></div>`);
  const months = [['ytd', t('ytd')], ...Array.from({ length: MONTHS }, (_, i) => [String(i), mon(i)])];
  return `<div class="page-h"><div><h1>${t('fees')}</h1><p>${t('demoNote')}</p></div><div class="card-a"><button class="btn" id="fExport">${icon('download', 15)} CSV</button></div></div>
    ${drillBar('fees')}<div class="grid g4" style="margin-bottom:14px">
      ${kpi({ label: t('charged'), value: `${short(tot.ch)} <small>${t('sum')}</small>`, sub: f.m === 'ytd' ? t('ytd') : mon(+f.m), ic: 'fees' })}
      ${kpi({ label: t('received'), value: `${short(tot.rc)} <small>${t('sum')}</small>`, sub: t('bankOnly'), ic: 'bank', tone: 'ok', drill: `bank?st=matched&m=${f.m === 'ytd' ? '' : f.m}&region=${f.region}&soc=${f.soc}` })}
      ${kpi({ label: t('debtM'), value: `${short(tot.debt)} <small>${t('sum')}</small>`, sub: `${num(rows.filter((r) => r.debt > 0).length)} ${t('society').toLowerCase()}`, ic: 'alert', tone: 'bad', drill: `members?debt=1&region=${f.region}` })}
      ${kpi({ label: t('k_collect'), value: pct(tot.rc / (tot.ch || 1)), sub: `${t('ytd')}: ${pct(m.collect)}`, ic: 'up', spark: m.received })}
    </div>
    <div class="grid g-main"><section class="card"><header class="card-h"><h3>${t('k_collect')}</h3><div class="card-a" style="overflow-x:auto;max-width:100%">${segmented('feesM', months, f.m)}</div></header>
      ${scopeType() === 'republic' ? `<div class="toolbar"><select class="inp" data-f="region">${opt('', `${t('region')}: ${t('all')}`, f.region)}${REGIONS.map((r) => opt(r.id, regionName(r.id), f.region)).join('')}</select></div>` : ''}
      ${table(rows, cols, { page: S.pages.fees || 0, id: 'fees', size: 15, rowDrill: (r) => [`bank?st=matched&soc=${r.s.id}&m=${f.m === 'ytd' ? '' : f.m}`, `${r.s.name} · ${f.m === 'ytd' ? t('ytd') : mon(+f.m)}`] })}</section>${tariffs}</div>`;
}

export function mount(el, rerender) {
  wire(el, 'fees', rerender, ({ name, value }) => { if (name === 'feesM') { F('fees').m = value; S.pages.fees = 0; rerender(); } });
  el.querySelector('#fExport').addEventListener('click', () => downloadCSV('azolik-badallari.csv', ['Jamiyat', 'Hudud', 'Aʼzolar', 'Hisoblangan', 'Tushum', 'Qarz', 'Yigʻiluvchanlik %'],
    rows.map((r) => [r.s.name, regionName(r.s.region), r.n, Math.round(r.ch), Math.round(r.rc), Math.round(r.debt), (r.rate * 100).toFixed(1)])));
}
