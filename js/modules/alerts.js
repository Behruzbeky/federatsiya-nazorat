import { t, mon } from '../i18n.js';
import { esc, num, icon, date, segmented, drawer, closeDrawer, toast, kpi } from '../ui.js';
import { obligations, bank, registers, S, orgName, log } from '../store.js';
import { TODAY, MONTHS, nthWorkday, byId } from '../data.js';
import { F, wire } from './_common.js';

const closed = new Map(); // task id -> { measures, at, by }
function level(days) { return days >= 10 ? ['e4', 'bad'] : days > 0 ? ['e3', 'bad'] : days === 0 ? ['e2', 'warn'] : ['e1', 'info']; }

function build() {
  const out = [];
  obligations().filter((o) => ['overdue', 'partial', 'unconfirmed'].includes(o.status)).forEach((o) => {
    const [e, tone] = level(o.overdueDays);
    out.push({ id: o.id, tone, ic: 'clock', title: `${t('a_overdue')}: ${orgName(o.from)} → ${orgName(o.to)}`, text: `${mon(o.month)} · ${o.pct}% · ${t('left')} ${num(o.amount - o.paid)} ${t('sum')} · ${o.overdueDays} ${t('days')}`, who: t(e), due: o.dueDate });
  });
  bank().filter((b) => b.status === 'unclear').forEach((b) => out.push({ id: b.id, tone: 'warn', ic: 'bank', title: `${t('a_unclear')}: ${b.id}`, text: `${b.payer} · ${num(b.amount)} ${t('sum')} · ${byId[b.society].name}`, who: t('r_acc'), due: b.date }));
  registers().filter((r) => !r.submitted && r.due < TODAY).forEach((r) => out.push({ id: `REG-${r.org}-${r.month}`, tone: 'bad', ic: 'reports', title: `${t('a_register')}: ${orgName(r.org)}`, text: `${mon(r.month)} 2026 · ${t('due')} ${date(r.due)}`, who: t('r_chair'), due: r.due }));
  const soon = nthWorkday(MONTHS - 1, 5);
  out.push({ id: 'SOON-1', tone: 'info', ic: 'calendar', title: `${t('a_soon')}: 20/10 · ${mon(MONTHS - 1)}`, text: `${t('due')} ${date(soon)} · ${t('e1')}`, who: t('r_acc'), due: soon });
  return out.sort((a, b) => ({ bad: 0, warn: 1, info: 2 }[a.tone] - { bad: 0, warn: 1, info: 2 }[b.tone]));
}

let list = [];
export function render() {
  const f = F('alerts', { tab: 'open' });
  const all = build();
  list = all.filter((x) => (f.tab === 'open' ? !closed.has(x.id) : closed.has(x.id))).slice(0, 120);
  const bad = all.filter((x) => x.tone === 'bad' && !closed.has(x.id)).length;
  return `<div class="page-h"><div><h1>${t('alerts')}</h1><p>${t('escalation')}: ${t('e1')} → ${t('e2')} → ${t('e3')} → ${t('e4')}</p></div></div>
    <div class="grid g4" style="margin-bottom:14px">
      ${kpi({ label: t('open'), value: num(all.length - closed.size), sub: t('tasks'), ic: 'alerts', tone: 'warn' })}
      ${kpi({ label: t('k_overdue'), value: num(bad), sub: t('e3'), ic: 'clock', tone: 'bad' })}
      ${kpi({ label: t('a_unclear'), value: num(all.filter((x) => x.ic === 'bank').length), sub: t('r_acc'), ic: 'bank' })}
      ${kpi({ label: t('closed'), value: num(closed.size), sub: t('measures'), ic: 'check', tone: 'ok' })}
    </div>
    <section class="card"><div class="toolbar">${segmented('alTab', [['open', t('open')], ['closed', t('closed')]], f.tab)}<span class="muted small">${t('demoNote')}</span></div>
      ${list.length ? list.map((x) => `<div class="task ${closed.has(x.id) ? 'done' : x.tone}"><span class="ti">${icon(closed.has(x.id) ? 'check' : x.ic, 16)}</span>
        <div><b>${esc(x.title)}</b><p>${esc(x.text)}</p><p>${t('assignee')}: <b style="font-size:12px">${esc(x.who)}</b>${closed.has(x.id) ? ` · ${t('measures')}: ${esc(closed.get(x.id).measures)} · ${date(closed.get(x.id).at)}` : ''}</p></div>
        ${closed.has(x.id) ? '' : `<button class="btn sm" data-close="${esc(x.id)}">${t('closeTask')}</button>`}</div>`).join('') : `<p class="muted">${t('noData')}</p>`}</section>`;
}

export function mount(el, rerender) {
  wire(el, 'alerts', rerender, ({ name, value }) => { if (name === 'alTab') { F('alerts').tab = value; rerender(); } });
  el.addEventListener('click', (e) => {
    const b = e.target.closest('[data-close]'); if (!b) return;
    const x = list.find((y) => y.id === b.dataset.close);
    drawer(t('closeTask'), `<p><b>${esc(x.title)}</b></p><p class="muted small">${esc(x.text)}</p>
      <label class="field"><span>${t('measures')}</span><input id="meas" placeholder="Qarzdor bilan uchrashuv, toʻlov jadvali…"></label>
      <button class="btn primary block" id="measOk">${icon('check', 16)} ${t('save')}</button>`);
    document.getElementById('measOk').onclick = () => {
      const measures = document.getElementById('meas').value || '—';
      closed.set(x.id, { measures, at: new Date(), by: S.role.user });
      log('task', 'Topshiriq yopildi', x.id, measures);
      closeDrawer(); toast(t('actionLogged')); rerender();
    };
  });
}
