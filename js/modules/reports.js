import { t, mon } from '../i18n.js';
import { table, pill, esc, icon, date, downloadCSV, pct, toast } from '../ui.js';
import { registers, members, metrics, obligations, societies, groups, S, orgName, regionName } from '../store.js';
import { AGG, MONTHS, memberDebt, byId } from '../data.js';
import { F, wire, opt } from './_common.js';

const REPORTS = [
  ['rep_monthly', 'fees'], ['rep_recon', 'bank'], ['rep_registry', 'members'], ['rep_transfers', 'transfers'], ['rep_groups', 'groups'], ['rep_kpi', 'up'],
];
function exportReport(k) {
  const m = metrics();
  if (k === 'rep_registry') return downloadCSV('reyestr.csv', ['ID', 'FISh', 'Jamiyat', 'Holat', 'Qarz'], members().map((x) => [x.id, x.name, byId[x.society].name, x.status, memberDebt(x)]));
  if (k === 'rep_transfers') return downloadCSV('ajratmalar.csv', ['ID', 'Davr', 'Kimdan', 'Kimga', 'Summa', 'Toʻlangan', 'Holat'], obligations().map((o) => [o.id, mon(o.month), orgName(o.from), orgName(o.to), o.amount, o.paid, o.status]));
  if (k === 'rep_kpi') return downloadCSV('kpi.csv', ['Koʻrsatkich', 'Qiymat'], [[t('k_collect'), pct(m.collect)], [t('k_timely'), pct(m.timely)], [t('k_debt'), Math.round(m.debt)], [t('k_discrep'), 0], [t('k_registers'), pct(m.registers)], [t('k_docs'), pct(m.docs)]]);
  if (k === 'rep_groups') return downloadCSV('guruhlar.csv', ['Guruh', 'Rahbar'], groups().map((g) => [orgName(g.id), g.head]));
  // monthly + reconciliation: per society, per month
  const hdr = ['Jamiyat', 'Hudud', ...Array.from({ length: MONTHS }, (_, i) => mon(i)), 'Jami'];
  return downloadCSV(k === 'rep_recon' ? 'solishtirma.csv' : 'oylik-hisobot.csv', hdr, societies().map((s) => [s.name, regionName(s.region), ...AGG[s.id].received.map(Math.round), Math.round(AGG[s.id].received.reduce((a, b) => a + b, 0))]));
}

let rows = [];
export function render() {
  const f = F('reports', { m: String(MONTHS - 2) });
  rows = registers().filter((r) => r.month === +f.m).sort((a, b) => (a.submitted ? 1 : 0) - (b.submitted ? 1 : 0));
  const cards = `<div class="grid g3">${REPORTS.map(([k, ic]) => `<section class="card"><div class="kpi-top"><span class="kpi-ic">${icon(ic, 16)}</span><b style="color:var(--text);font-size:13.5px">${esc(t(k))}</b></div>
    <p class="muted small" style="min-height:36px">${t('period')}: 2026 · ${esc(S.role ? orgName(S.role.scope[1] || '') || t('republic') : '')}</p>
    <div class="card-a"><button class="btn sm" data-rep="${k}">${icon('download', 14)} CSV / XLSX</button><button class="btn sm ghost" data-print="1">${icon('printer', 14)} PDF</button></div></section>`).join('')}</div>`;
  const cols = [
    { label: `${t('society')} / ${t('region')}`, render: (r) => `<b>${esc(orgName(r.org))}</b><br><small>${r.kind === 'region' ? t('region') : esc(regionName(r.region))}</small>` },
    { label: t('due'), render: (r) => date(r.due) },
    { label: t('submitted'), render: (r) => date(r.submitted) },
    { label: t('version'), cls: 'r', render: (r) => (r.ver ? `v${r.ver}` : '—') },
    { label: t('status'), render: (r) => (!r.submitted ? pill(r.due < new Date(2026, 9, 31) ? 'notSubmitted' : 'pending') : r.submitted <= r.due ? pill('onTime') : pill('late')) },
  ];
  return `<div class="page-h"><div><h1>${t('reports')}</h1><p>CSV · XLSX · PDF — ${t('version').toLowerCase()} ${t('history').toLowerCase()}</p></div></div>
    ${cards}
    <section class="card" style="margin-top:14px"><header class="card-h"><h3>${t('registers')}</h3><div class="card-a">
      <select class="inp" data-f="m">${Array.from({ length: MONTHS }, (_, i) => opt(i, `${mon(i)} 2026`, f.m)).join('')}</select></div></header>
      <p class="muted small" style="margin-top:-6px">${t('society')}: 5-sana · ${t('region')}: 7-sana · Tezkor moliyaviy maʼlumot: 10-sana</p>
      ${table(rows, cols, { page: S.pages.reports || 0, id: 'reports', size: 15 })}</section>`;
}

export function mount(el, rerender) {
  wire(el, 'reports', rerender);
  el.addEventListener('click', (e) => {
    const r = e.target.closest('[data-rep]'); if (r) exportReport(r.dataset.rep);
    if (e.target.closest('[data-print]')) { toast(t('exported')); setTimeout(() => window.print(), 200); }
  });
}
