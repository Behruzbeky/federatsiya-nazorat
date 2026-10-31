import { t, mon } from '../i18n.js';
import { table, pill, esc, money, date, num, short, icon, drawer, downloadCSV, kpi, pct } from '../ui.js';
import { members, S, orgName, regionName, scopeType, can } from '../store.js';
import { REGIONS, memberDebt, memberRate, TARIFFS, byId } from '../data.js';
import { F, wire, opt, drillBar } from './_common.js';

const ST = { active: 'active', suspended: 'suspended', transferred: 'transferred', left: 'leftM' };
let filtered = [];

function apply() {
  const f = F('members', { q: '', status: '', benefit: '', region: '', debt: '', joined: '' });
  const q = f.q.trim().toLowerCase();
  filtered = members().filter((m) => (!q || m.name.toLowerCase().includes(q) || m.id.toLowerCase().includes(q) || m.doc.toLowerCase().includes(q))
    && (!f.status || m.status === f.status) && (!f.region || m.region === f.region)
    && (!f.benefit || (f.benefit === 'none' ? !m.benefit : f.benefit === 'any' ? !!m.benefit : m.benefit === f.benefit)) && (!f.debt || memberDebt(m) > 0)
    && (!f.joined || m.joined.getFullYear() === +f.joined));
  return f;
}

export function render() {
  const f = apply();
  const all = members();
  const debtors = all.filter((m) => memberDebt(m) > 0).length;
  const fresh = all.filter((m) => m.joined.getFullYear() === 2026).length;
  const cols = [
    { label: t('id'), render: (m) => `<span class="mono">${esc(m.id)}</span>` },
    { label: t('name'), render: (m) => `<b>${esc(m.name)}</b><br><small>${esc(m.doc)} · ${esc(m.phone)}</small>` },
    { label: `${t('society')} / ${t('group')}`, render: (m) => `${esc(byId[m.society].name)}<br><small>${esc(regionName(m.region))} · №${byId[m.group].n}</small>` },
    { label: t('joined'), render: (m) => `${date(m.joined)}<br><small>${t('order')} ${esc(m.order)}</small>` },
    { label: t('status'), render: (m) => pill(ST[m.status]) },
    { label: t('benefit'), render: (m) => (m.benefit ? `<span class="pill info">${esc(t(m.benefit))}</span>` : '<span class="muted">—</span>') },
    { label: t('paid'), cls: 'r', render: (m) => `${m.paid}/${m.due} <small>${t('months')}</small>` },
    { label: t('debtM'), cls: 'r', render: (m) => { const d = memberDebt(m); return d > 0 ? `<b style="color:#ff7b83">${num(d)}</b>` : '<span class="muted">0</span>'; } },
  ];
  return `<div class="page-h"><div><h1>${t('members')}</h1><p>${t('demoNote')}</p></div>
    <div class="card-a"><button class="btn" id="mExport">${icon('download', 15)} CSV</button>${can('edit') || can('approve') ? `<button class="btn primary" id="mAdd">${icon('plus', 15)} ${t('add')}</button>` : ''}</div></div>
    <div class="grid g4" style="margin-bottom:14px">
      ${kpi({ label: t('k_members'), value: num(all.length), sub: `${t('active')}: ${num(all.filter((m) => m.status === 'active').length)}`, ic: 'members', drill: 'members' })}
      ${kpi({ label: '2026', value: `+${num(fresh)}`, sub: t('joined'), ic: 'up', tone: 'ok', drill: 'members?joined=2026' })}
      ${kpi({ label: t('debtM'), value: num(debtors), sub: pct(debtors / (all.length || 1)), ic: 'alert', tone: 'bad', drill: 'members?debt=1' })}
      ${kpi({ label: t('benefit'), value: num(all.filter((m) => m.benefit).length), sub: `${t('pensioner').split(' ')[0]}, ${t('student').split(' ')[0]}…`, ic: 'scale', drill: 'members?benefit=any' })}
    </div>
    ${drillBar('members')}<section class="card"><div class="toolbar">
      <input class="inp grow" data-f="q" value="${esc(f.q)}" placeholder="${esc(t('search'))}">
      <select class="inp" data-f="status">${opt('', `${t('status')}: ${t('all')}`, f.status)}${Object.entries(ST).map(([k, v]) => opt(k, t(v), f.status)).join('')}</select>
      <select class="inp" data-f="benefit">${opt('', `${t('benefit')}: ${t('all')}`, f.benefit)}${opt('none', t('noBenefit'), f.benefit)}${['pensioner', 'disabled', 'student'].map((b) => opt(b, t(b), f.benefit)).join('')}</select>
      ${scopeType() === 'republic' ? `<select class="inp" data-f="region">${opt('', `${t('region')}: ${t('all')}`, f.region)}${REGIONS.map((r) => opt(r.id, regionName(r.id), f.region)).join('')}</select>` : ''}
      <select class="inp" data-f="debt">${opt('', `${t('debtM')}: ${t('all')}`, f.debt)}${opt('1', `${t('debtM')} > 0`, f.debt)}</select>
    </div>${table(filtered, cols, { page: S.pages.members || 0, id: 'members' })}</section>`;
}

function open(m) {
  const T = TARIFFS[1];
  const months = Array.from({ length: m.due }, (_, k) => m.startM + k);
  const paidSet = new Set(Array.from({ length: m.paid }, (_, k) => m.startM + Math.floor(((k + m.ph) * m.due) / m.paid)));
  drawer(m.name, `<div class="chips" style="margin-bottom:10px">${pill({ active: 'active', suspended: 'suspended', transferred: 'transferred', left: 'leftM' }[m.status])}${m.benefit ? `<span class="pill info">${esc(t(m.benefit))}</span>` : ''}</div>
    <dl class="kv"><dt>${t('id')}</dt><dd class="mono">${esc(m.id)}</dd><dt>${t('doc')}</dt><dd>${esc(m.doc)}</dd><dt>${t('joined')}</dt><dd>${date(m.joined)} · ${t('order')} ${esc(m.order)}</dd>
      <dt>${t('region')}</dt><dd>${esc(regionName(m.region))}</dd><dt>${t('society')}</dt><dd>${esc(byId[m.society].name)}</dd><dt>${t('group')}</dt><dd>${esc(orgName(m.group))}</dd>
      <dt>${t('phone')}</dt><dd>${esc(m.phone)}</dd><dt>${t('tariff')}</dt><dd>${money(memberRate(m))} / ${t('months')} · ${esc(T.decision)}</dd>
      <dt>${t('debtM')}</dt><dd style="color:${memberDebt(m) ? '#ff7b83' : 'var(--ok)'}">${money(memberDebt(m))}</dd></dl>
    <h4 style="margin:6px 0 10px">${t('fees')} · 2026</h4>
    <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:6px;margin-bottom:18px">${months.map((mm) => `<div style="padding:8px 4px;text-align:center;border-radius:10px;font-size:11.5px;font-weight:600;border:1px solid ${paidSet.has(mm) ? 'rgba(52,211,153,.3)' : 'rgba(239,59,69,.35)'};background:${paidSet.has(mm) ? 'rgba(52,211,153,.08)' : 'rgba(239,59,69,.08)'}">${mon(mm)}<br><small>${paidSet.has(mm) ? '✓' : short(memberRate(m))}</small></div>`).join('')}</div>
    <h4 style="margin:6px 0 10px">${t('history')}</h4>
    <ul class="timeline"><li>${t('joined')} — ${esc(byId[m.society].name)}<span>${date(m.joined)} · ${t('order')} ${esc(m.order)}</span></li>
      ${m.benefit ? `<li>${t('benefit')}: ${esc(t(m.benefit))}<span>${date(new Date(2026, 0, 10))} · Ariza №${m.id.slice(-2)}</span></li>` : ''}
      ${m.status !== 'active' ? `<li>${t('status')}: ${esc(t({ suspended: 'suspended', transferred: 'transferred', left: 'leftM' }[m.status]))}<span>${date(new Date(2026, 6, 3))}</span></li>` : ''}
      <li>${t('tariff')}: ${esc(T.decision)}<span>${date(new Date(2026, 0, 1))}</span></li></ul>`);
}

export function mount(el, rerender) {
  wire(el, 'members', rerender);
  el.querySelectorAll('#members tbody tr[data-row]').forEach((tr) => tr.classList.add('click'));
  el.addEventListener('click', (e) => { const tr = e.target.closest('#members tr[data-row]'); if (tr) open(filtered[+tr.dataset.row]); });
  el.querySelector('#mExport').addEventListener('click', () => downloadCSV('azolar-reyestri.csv',
    ['ID', 'FISh', 'Hujjat', 'Hudud', 'Jamiyat', 'Guruh', 'Qabul', 'Holat', 'Imtiyoz', 'Toʻlangan oy', 'Qarz'],
    filtered.map((m) => [m.id, m.name, m.doc, regionName(m.region), byId[m.society].name, byId[m.group].n, date(m.joined), m.status, m.benefit || '', `${m.paid}/${m.due}`, memberDebt(m)])));
  const add = el.querySelector('#mAdd');
  if (add) add.addEventListener('click', () => drawer(t('add'), `<p class="muted small">${t('demoNote')}</p>
    <label class="field"><span>${t('name')}</span><input placeholder="Familiya Ism Otasining ismi"></label>
    <label class="field"><span>${t('doc')}</span><input placeholder="A123456"></label>
    <label class="field"><span>${t('order')}</span><input placeholder="№—B"></label>
    <div class="note">${icon('file', 16)}<span>Qabul, koʻchirish, toʻxtatish va chiqish tasdiqlovchi hujjatga bogʻlanadi. Takroriy yozuvlar F.I.Sh. + hujjat raqami boʻyicha tekshiriladi.</span></div>
    <button class="btn primary block" style="margin-top:14px" data-action="closeDrawer">${t('save')}</button>`));
  const id = new URLSearchParams(location.hash.split('?')[1] || '').get('id');
  if (id) { const m = members().find((x) => x.id === id); if (m) open(m); }
}
