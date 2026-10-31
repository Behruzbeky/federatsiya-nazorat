import { t } from '../i18n.js';
import { table, esc, dtime, icon, downloadCSV, kpi, num } from '../ui.js';
import { S } from '../store.js';
import { AUDIT } from '../data.js';
import { F, wire, opt } from './_common.js';

const KINDS = ['login', 'import', 'confirm', 'order', 'member', 'rule', 'register', 'task'];
let rows = [];
export function render() {
  const f = F('audit', { q: '', kind: '' });
  const q = f.q.trim().toLowerCase();
  rows = AUDIT.filter((a) => (!f.kind || a.kind === f.kind) && (!q || `${a.user} ${a.text} ${a.obj} ${a.basis}`.toLowerCase().includes(q)));
  const cols = [
    { label: t('date'), render: (a) => `<span class="mono">${dtime(a.at)}</span>` },
    { label: t('user'), render: (a) => esc(a.user) },
    { label: t('actions'), cls: 'wrap', render: (a) => `<b>${esc(a.text)}</b><br><small class="mono">${esc(a.kind)}</small>` },
    { label: t('object'), render: (a) => `<span class="mono">${esc(a.obj)}</span>` },
    { label: t('basis'), render: (a) => `<span class="mono">${esc(a.basis)}</span>` },
    { label: 'IP', render: (a) => `<span class="mono">${esc(a.ip)}</span>` },
  ];
  const today = AUDIT.filter((a) => a.at.toDateString() === new Date().toDateString() || a.at.getDate() === 31).length;
  return `<div class="page-h"><div><h1>${t('audit')}</h1><p>Kim, qachon va qanday asosda oʻzgartirdi yoki tasdiqladi — yozuvlar oʻchirilmaydi.</p></div>
    <div class="card-a"><button class="btn" id="aExport">${icon('download', 15)} CSV</button></div></div>
    <div class="grid g4" style="margin-bottom:14px">
      ${kpi({ label: t('total'), value: num(AUDIT.length), sub: t('audit'), ic: 'audit', drill: 'audit' })}
      ${kpi({ label: t('thisMonth'), value: num(today), sub: '31.10.2026', ic: 'clock' })}
      ${kpi({ label: t('bankConf'), value: num(AUDIT.filter((a) => a.kind === 'confirm').length), sub: 'TXN', ic: 'bank', tone: 'ok', drill: 'audit?kind=confirm' })}
      ${kpi({ label: '2FA', value: num(AUDIT.filter((a) => a.kind === 'login').length), sub: t('login'), ic: 'lock', drill: 'audit?kind=login' })}
    </div>
    <section class="card"><div class="toolbar"><input class="inp grow" data-f="q" value="${esc(f.q)}" placeholder="${esc(t('search'))}">
      <select class="inp" data-f="kind">${opt('', t('all'), f.kind)}${KINDS.map((k) => opt(k, k, f.kind)).join('')}</select></div>
      ${table(rows, cols, { page: S.pages.audit || 0, id: 'audit', size: 25 })}</section>`;
}
export function mount(el, rerender) {
  wire(el, 'audit', rerender);
  el.querySelector('#aExport').addEventListener('click', () => downloadCSV('audit-jurnali.csv', ['Vaqt', 'Foydalanuvchi', 'Amal', 'Tur', 'Obyekt', 'Asos', 'IP'], rows.map((a) => [dtime(a.at), a.user, a.text, a.kind, a.obj, a.basis, a.ip])));
}
