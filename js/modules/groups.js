import { t } from '../i18n.js';
import { table, esc, num, short, kpi, date, icon, drawer, pill, bar, pct, downloadCSV } from '../ui.js';
import { groups, members, expenses, S, orgName, regionName } from '../store.js';
import { memberRate, memberDebt, byId } from '../data.js';
import { wire, F, drillBar } from './_common.js';

let rows = [];
function build() {
  const fees = {}; const cnt = {};
  for (const m of members()) { fees[m.group] = (fees[m.group] || 0) + m.paid * memberRate(m); cnt[m.group] = (cnt[m.group] || 0) + 1; }
  const ex = {}; const exDoc = {};
  for (const e of expenses()) { ex[e.group] = (ex[e.group] || 0) + e.amount; if (e.doc) exDoc[e.group] = (exDoc[e.group] || 0) + e.amount; }
  rows = groups().map((g) => {
    const alloc = Math.floor((fees[g.id] || 0) * 0.1);
    const spent = Math.min(ex[g.id] || 0, alloc);
    return { g, n: cnt[g.id] || 0, fees: fees[g.id] || 0, alloc, spent, bal: alloc - spent, docs: (exDoc[g.id] || 0) / ((ex[g.id] || 0) || 1) };
  });
}

export function render() {
  build();
  const f = F('groups', { nodoc: '' });
  const shown = f.nodoc ? rows.filter((r) => r.docs < 1) : rows;
  const tot = rows.reduce((o, r) => ({ a: o.a + r.alloc, s: o.s + r.spent, b: o.b + r.bal }), { a: 0, s: 0, b: 0 });
  const ex = expenses(); const noDoc = ex.filter((e) => !e.doc);
  const cols = [
    { label: t('group'), render: (r) => `<b>${esc(orgName(r.g.id))}</b><br><small>${esc(regionName(r.g.region))}</small>` },
    { label: t('head'), render: (r) => esc(r.g.head) },
    { label: t('membersN'), cls: 'r', render: (r) => num(r.n) },
    { label: t('paid'), cls: 'r', render: (r) => num(r.fees) },
    { label: t('allocated'), cls: 'r', render: (r) => `<b>${num(r.alloc)}</b>` },
    { label: t('spent'), cls: 'r', render: (r) => num(r.spent) },
    { label: t('balance'), cls: 'r', render: (r) => num(r.bal) },
    { label: t('k_docs'), render: (r) => `<div style="display:grid;grid-template-columns:80px 40px;gap:8px;align-items:center">${bar(r.docs, r.docs < 0.8 ? 'red' : 'ok')}<b>${pct(r.docs, 0)}</b></div>` },
  ];
  return `<div class="page-h"><div><h1>${t('groups')}</h1><p>10% · ${t('to_groups')} — ${t('society').toLowerCase()} hisob raqami orqali</p></div>
    <div class="card-a"><button class="btn" id="gExport">${icon('download', 15)} CSV</button></div></div>
    <div class="grid g4" style="margin-bottom:14px">
      ${kpi({ label: t('allocated'), value: `${short(tot.a)} <small>${t('sum')}</small>`, sub: `${num(rows.length)} ${t('group').toLowerCase()}`, ic: 'groups' })}
      ${kpi({ label: t('spent'), value: `${short(tot.s)} <small>${t('sum')}</small>`, sub: pct(tot.s / (tot.a || 1)), ic: 'fees' })}
      ${kpi({ label: t('balance'), value: `${short(tot.b)} <small>${t('sum')}</small>`, sub: t('ytd'), ic: 'bank', tone: 'ok' })}
      ${kpi({ label: t('noDoc'), value: num(noDoc.length), sub: `${short(noDoc.reduce((s, e) => s + e.amount, 0))} ${t('sum')}`, ic: 'file', tone: 'bad', drill: 'groups?nodoc=1' })}
    </div>
    ${drillBar('groups')}<section class="card">${table(shown, cols, { page: S.pages.groups || 0, id: 'groups', size: 20 })}</section>`;
}

export function mount(el, rerender) {
  wire(el, 'groups', rerender);
  el.querySelectorAll('#groups tbody tr[data-row]').forEach((tr) => tr.classList.add('click'));
  el.addEventListener('click', (e) => {
    const tr = e.target.closest('#groups tr[data-row]'); if (!tr) return;
    const r = (F('groups').nodoc ? rows.filter((x) => x.docs < 1) : rows)[+tr.dataset.row];
    const ms = members().filter((m) => m.group === r.g.id).slice(0, 40);
    const ex = expenses().filter((x) => x.group === r.g.id);
    drawer(orgName(r.g.id), `<dl class="kv"><dt>${t('society')}</dt><dd>${esc(byId[r.g.society].name)}</dd><dt>${t('head')}</dt><dd>${esc(r.g.head)}</dd>
      <dt>${t('allocated')}</dt><dd>${num(r.alloc)} ${t('sum')}</dd><dt>${t('spent')}</dt><dd>${num(r.spent)} ${t('sum')}</dd><dt>${t('balance')}</dt><dd style="color:var(--ok)">${num(r.bal)} ${t('sum')}</dd></dl>
      <h4 style="margin:4px 0 8px">${t('expenses')}</h4>
      <div class="tbl-wrap" style="margin-bottom:16px"><table class="tbl"><tbody>${ex.map((x) => `<tr><td class="wrap">${esc(x.title)}<br><small>${date(x.date)}</small></td><td class="r">${num(x.amount)}</td><td>${x.doc ? pill('withDoc', x.doc) : pill('noDoc')}</td></tr>`).join('')}</tbody></table></div>
      <h4 style="margin:4px 0 8px">${t('membersN')} (${r.n})</h4>
      <div class="tbl-wrap"><table class="tbl"><tbody>${ms.map((m) => `<tr><td>${esc(m.name)}<br><small class="mono">${esc(m.id)}</small></td><td class="r">${m.paid}/${m.due}</td><td class="r">${memberDebt(m) ? `<span style="color:var(--bad-t)">${num(memberDebt(m))}</span>` : '✓'}</td></tr>`).join('')}</tbody></table></div>`);
  });
  el.querySelector('#gExport').addEventListener('click', () => downloadCSV('tayanch-guruhlar.csv', ['Guruh', 'Hudud', 'Rahbar', 'Aʼzolar', 'Badallar', 'Ajratilgan 10%', 'Sarflangan', 'Qoldiq'],
    rows.map((r) => [orgName(r.g.id), regionName(r.g.region), r.g.head, r.n, Math.round(r.fees), r.alloc, r.spent, r.bal])));
}
