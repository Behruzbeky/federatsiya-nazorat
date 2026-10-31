import { t, mon } from '../i18n.js';
import { table, pill, esc, num, short, kpi, date, icon, segmented, toast, downloadCSV, card, pct } from '../ui.js';
import { obligations, S, can, log, orgName, resetCache, metrics } from '../store.js';
import { MONTHS, TODAY } from '../data.js';
import { F, wire, opt, drillBar } from './_common.js';

const BAD = ['overdue', 'partial', 'unconfirmed'];
let rows = [];
export function render() {
  const f = F('transfers', { st: 'problem', m: '', kind: '', q: '' });
  const q = (f.q || '').trim().toLowerCase();
  const all = obligations();
  rows = all.filter((o) => (f.st === 'all' || (f.st === 'problem' ? BAD.includes(o.status) : f.st === 'open' ? ['pending', 'ordered'].includes(o.status) : o.status === f.st))
    && (f.m === '' || o.month === +f.m) && (!f.kind || o.kind === f.kind) && (!q || o.id.toLowerCase().includes(q) || orgName(o.from).toLowerCase().includes(q)))
    .sort((a, b) => b.overdueDays - a.overdueDays || b.month - a.month);
  const due = all.filter((o) => o.dueDate < TODAY);
  const ok = due.filter((o) => o.status === 'done').length;
  const bad = all.filter((o) => BAD.includes(o.status));
  const mp = metrics().prev;
  const cols = [
    { label: t('obligation'), render: (o) => `<span class="mono">${esc(o.id)}</span><br><small>${mon(o.month)} · ${o.rule} · ${o.pct}%</small>` },
    { label: `${t('from')} → ${t('to')}`, cls: 'wrap', render: (o) => `<b>${esc(orgName(o.from))}</b><br><small>→ ${esc(orgName(o.to))}</small>` },
    { label: t('amount'), cls: 'r', render: (o) => num(o.amount) },
    { label: t('due'), render: (o) => `${date(o.dueDate)}<br><small>${o.kind === 'society' ? '5' : '3'}-${t('days').split(' ')[0]}</small>` },
    { label: t('orderNo'), render: (o) => (o.orderNo ? `<span class="mono">${esc(o.orderNo)}</span><br><small>${date(o.orderDate)}</small>` : '<span class="muted">—</span>') },
    { label: t('bankConf'), render: (o) => (o.bankRef ? `<span class="mono">${esc(o.bankRef)}</span><br><small>${date(o.bankDate)}</small>` : '<span class="muted">—</span>') },
    { label: t('left'), cls: 'r', render: (o) => (o.amount - o.paid > 0 ? `<b style="color:var(--bad-t)">${num(o.amount - o.paid)}</b>` : '0') },
    { label: t('overdueDays'), cls: 'r', render: (o) => (o.overdueDays ? `${o.overdueDays} <small>${t('days')}</small>` : '—') },
    { label: t('status'), render: (o) => pill(o.status) },
    { label: '', cls: 'r', render: (o) => action(o) },
  ];
  const esc4 = `<div class="esc">${['e1', 'e2', 'e3', 'e4'].map((k, i) => `<div><b>${i + 1}</b>${esc(t(k))}</div>`).join('')}</div>
    <div class="note">${icon('lock', 16)}<span>${t('sod')}. ${t('bankOnly')}.</span></div>`;
  return `<div class="page-h"><div><h1>${t('transfers')}</h1><p>${t('obligation')} → ${t('orderNo')} → ${t('bankConf')} → ${t('left')}</p></div>
    <div class="card-a"><button class="btn" id="tExport">${icon('download', 15)} CSV</button></div></div>
    <div class="grid g4" style="margin-bottom:14px">
      ${kpi({ label: t('k_timely'), value: pct(ok / (due.length || 1)), sub: `${num(ok)} / ${num(due.length)}`, ic: 'transfers', tone: 'ok', drill: 'transfers?st=done', d: { now: ok / (due.length || 1), prev: mp.timely, pp: true } })}
      ${kpi({ label: t('k_overdue'), value: num(bad.length), sub: `${short(bad.reduce((s, o) => s + o.amount - o.paid, 0))} ${t('sum')}`, ic: 'clock', tone: 'bad', drill: 'transfers?st=problem', d: { now: bad.length, prev: mp.overdueN, good: 'down' } })}
      ${kpi({ label: t('unconfirmed'), value: num(all.filter((o) => o.status === 'unconfirmed').length), sub: t('bankOnly'), ic: 'bank', tone: 'warn', drill: 'transfers?st=unconfirmed' })}
      ${kpi({ label: `${t('pending')} · ${mon(MONTHS - 1)}`, value: num(all.filter((o) => ['pending', 'ordered'].includes(o.status)).length), sub: `${t('due')}: ${date(all.find((o) => o.month === MONTHS - 1)?.dueDate)}`, ic: 'calendar', drill: 'transfers?st=open' })}
    </div>
    ${card(t('escalation'), esc4, { cls: '' })}
    <section class="card" style="margin-top:14px">${drillBar('transfers')}<div class="toolbar">
      <input class="inp" data-f="q" value="${esc(f.q || '')}" placeholder="OB-…, ${esc(t('society').toLowerCase())}" style="width:180px">${segmented('trSt', [['problem', `⚠ ${t('k_overdue')}`], ['open', t('pending')], ['done', t('done')], ['doneLate', t('doneLate')], ['all', t('all')]], f.st)}
      <select class="inp" data-f="m">${opt('', `${t('period')}: ${t('all')}`, f.m)}${Array.from({ length: MONTHS }, (_, i) => opt(i, mon(i), f.m)).join('')}</select>
      <select class="inp" data-f="kind">${opt('', `${t('source')}: ${t('all')}`, f.kind)}${opt('society', '20/10 · ' + t('society'), f.kind)}${opt('region', '36% · ' + t('region'), f.kind)}</select>
    </div>${table(rows, cols, { page: S.pages.transfers || 0, id: 'transfers', size: 20 })}</section>`;
}

function action(o) {
  if (['pending', 'overdue'].includes(o.status) && can('edit')) return `<button class="btn sm" data-ob="order:${esc(o.id)}">${t('createOrder')}</button>`;
  if (['ordered', 'unconfirmed', 'partial'].includes(o.status) && can('approve')) {
    const self = o.createdBy && o.createdBy === S.role.user;
    return `<button class="btn sm primary" data-ob="bank:${esc(o.id)}" ${self ? `disabled title="${esc(t('sod'))}"` : ''}>${t('attachBank')}</button>`;
  }
  return '';
}

export function mount(el, rerender) {
  wire(el, 'transfers', rerender, ({ name, value }) => { if (name === 'trSt') { F('transfers').st = value; S.pages.transfers = 0; rerender(); } });
  el.addEventListener('click', (e) => {
    const b = e.target.closest('[data-ob]'); if (!b) return;
    const [act, id] = b.dataset.ob.split(':');
    const o = obligations().find((x) => x.id === id);
    if (act === 'order') {
      o.orderNo = `PT-${Math.floor(1000 + Math.random() * 8999)}`; o.orderDate = new Date(); o.createdBy = S.role.user;
      o.status = o.dueDate < TODAY ? 'unconfirmed' : 'ordered';
      log('order', 'Toʻlov topshiriqnomasi yaratildi', o.id, o.orderNo);
    } else {
      o.bankRef = `TXN${Math.floor(60000000 + Math.random() * 999999)}`; o.bankDate = new Date(); o.paid = o.amount;
      o.status = o.bankDate <= o.dueDate ? 'done' : 'doneLate';
      log('confirm', 'Toʻlov bank tomonidan tasdiqlandi', o.id, o.bankRef);
    }
    resetCache(); toast(t('actionLogged')); rerender();
  });
  el.querySelector('#tExport').addEventListener('click', () => downloadCSV('otkazmalar-nazorati.csv', ['ID', 'Davr', 'Kimdan', 'Kimga', 'Foiz', 'Summa', 'Muddat', 'Topshiriqnoma', 'Bank tasdigʻi', 'Qoldiq', 'Kechikish (ish kuni)', 'Holat'],
    rows.map((o) => [o.id, mon(o.month), orgName(o.from), orgName(o.to), o.pct, o.amount, date(o.dueDate), o.orderNo || '', o.bankRef || '', o.amount - o.paid, o.overdueDays, o.status])));
}
