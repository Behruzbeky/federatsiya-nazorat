import { t, mon } from '../i18n.js';
import { kpi, card, areaChart, donut, gauge, short, num, pct, esc, pill, date, bar, icon } from '../ui.js';
import { metrics, ranking, obligations, registers, S, orgName, scopeType } from '../store.js';
import { distribute, MONTHS, TODAY, AUDIT, nthWorkday } from '../data.js';

export function render() {
  const m = metrics();
  const obs = obligations();
  const last = m.received[MONTHS - 1], prev = m.received[MONTHS - 2];
  const growth = (last - prev) / (prev || 1);
  const split = distribute(Math.round(last), 'R-5.9').rows;
  const COLORS = { region: '#2f8cff', center: '#ef3b45', society: '#4fc3ff', groups: '#e8c27a' };
  const regs = registers();

  const top = `<div class="grid g4">
    ${kpi({ label: t('k_members'), value: num(m.active), sub: `${t('total')}: ${num(m.total)}`, ic: 'members', spark: [3, 4, 4, 5, 5, 6, 6, 7, 7, 8] })}
    ${kpi({ label: t('k_collect'), value: pct(m.collect), sub: `${short(m.rc)} / ${short(m.ch)}`, ic: 'fees', tone: m.collect > 0.85 ? 'ok' : 'warn', trend: `${growth >= 0 ? '+' : '−'}${pct(Math.abs(growth))}`, spark: m.received })}
    ${kpi({ label: t('k_debt'), value: `${short(m.debt)} <small>${t('sum')}</small>`, sub: t('ytd'), ic: 'alert', tone: 'bad', spark: m.charged.map((c, i) => c - m.received[i]) })}
    ${kpi({ label: t('k_timely'), value: pct(m.timely), sub: `${t('k_overdue')}: ${num(m.overdue.length)} · ${short(m.overdueSum)}`, ic: 'transfers', tone: m.timely > 0.8 ? 'ok' : 'warn' })}
  </div>`;

  const confirmed = obs.filter((o) => o.bankDate).length, ordered = obs.filter((o) => o.orderDate).length;
  const steps = [[t('p1'), num(m.total), t('k_members')], [t('p2'), short(m.ch), t('ytd')], [t('p3'), short(m.rc), t('ytd')], [t('p4'), num(obs.length), t('obligation')],
    [t('p5'), num(ordered), 'PT'], [t('p6'), num(confirmed), 'TXN'], [t('p7'), num(regs.filter((r) => r.submitted).length), t('registers')], [t('p8'), num(AUDIT.length), t('audit')]];
  const pipeline = card(t('pipeline'), `<div class="pipeline">${steps.map(([a, b, c]) => `<div>${esc(a)}<b>${b}</b><em>${esc(c)}</em></div>`).join('')}</div>`);

  const chart = card(t('receiptsByMonth'), areaChart(m.charged, m.received), {
    actions: `<div class="legend"><span><i style="background:var(--cyan)"></i>${t('fact')}</span><span><i style="background:var(--plan)"></i>${t('plan')}</span></div>` });
  const side = card(t('distShare'), `<div style="display:flex;gap:16px;align-items:center;flex-wrap:wrap">
      ${donut(split.map((r) => ({ v: r.sum, color: COLORS[r.to] })), { value: short(last), label: mon(MONTHS - 1) })}
      <div style="flex:1;min-width:150px;display:grid;gap:10px">${split.map((r) => `<div style="display:flex;justify-content:space-between;gap:8px;font-size:12.5px"><span><i style="display:inline-block;width:8px;height:8px;border-radius:2px;background:${COLORS[r.to]};margin-right:8px"></i>${esc(t('to_' + r.to))}</span><b>${r.pct}%</b></div>`).join('')}</div>
    </div><div style="display:flex;justify-content:center;margin-top:10px">${gauge(m.collect, t('k_collect'))}</div>`);

  const rk = ranking();
  const rankCard = card(scopeType() === 'republic' ? t('regionsRank') : t('society'), `<div class="rank">${rk.slice(0, 14).map((r, i) => `<div class="rank-row"><span class="n">${String(i + 1).padStart(2, '0')}</span>
      <div class="nm"><span>${esc(r.name)}</span>${bar(r.timely, r.timely < 0.75 ? 'red' : r.timely > 0.88 ? 'ok' : '')}</div><span class="v">${pct(r.timely, 0)}</span></div>`).join('')}</div>`,
  { actions: `<span class="muted small">${t('k_timely')}</span>` });

  const od = m.overdue.slice().sort((a, b) => (b.amount - b.paid) - (a.amount - a.paid)).slice(0, 7);
  const odCard = card(t('overdueList'), od.length ? `<div class="tbl-wrap"><table class="tbl"><tbody>${od.map((o) => `<tr><td>${esc(orgName(o.from))}<br><small>→ ${esc(orgName(o.to))} · ${mon(o.month)} · ${o.pct}%</small></td>
      <td>${pill(o.status)}</td><td class="r"><b>${short(o.amount - o.paid)}</b><br><small>${o.overdueDays} ${t('days')}</small></td></tr>`).join('')}</tbody></table></div>` : `<p class="muted">${t('noData')}</p>`,
  { actions: `<a class="btn sm" href="#/transfers">${t('details')} ${icon('chevron', 14)}</a>` });

  const dl = [[t('a_soon'), `${t('registers')} (${t('society')})`, new Date(TODAY.getFullYear(), MONTHS, 5)], [t('a_soon'), `${t('registers')} (${t('region')})`, new Date(TODAY.getFullYear(), MONTHS, 7)],
    [t('a_soon'), `20/10 → ${t('to_region')}`, nthWorkday(MONTHS - 1, 5)], [t('a_soon'), `36% → ${t('to_center')}`, nthWorkday(MONTHS - 1, 3)], [t('a_soon'), t('rep_monthly'), new Date(TODAY.getFullYear(), MONTHS, 10)]]
    .sort((a, b) => a[2] - b[2]);
  const dlCard = card(t('deadlines'), `<div style="display:grid;gap:10px">${dl.map(([, l, d]) => `<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;font-size:12.8px">
      <span style="display:flex;gap:10px;align-items:center">${icon('calendar', 15)}${esc(l)}</span><b>${date(d)}</b></div>`).join('')}</div>`);

  const low = `<div class="grid g4">
    ${kpi({ label: t('k_registers'), value: pct(m.registers), sub: t('ytd'), ic: 'reports', tone: m.registers > 0.85 ? 'ok' : 'warn' })}
    ${kpi({ label: t('k_discrep'), value: `0 <small>${t('sum')}</small>`, sub: t('check100'), ic: 'scale', tone: 'ok' })}
    ${kpi({ label: t('k_docs'), value: pct(m.docs), sub: t('groups'), ic: 'file', tone: m.docs > 0.9 ? 'ok' : 'warn' })}
    ${kpi({ label: t('k_overdue'), value: `${short(m.overdueSum)} <small>${t('sum')}</small>`, sub: `${num(m.overdue.length)} ${t('obligation').toLowerCase()}`, ic: 'clock', tone: 'bad' })}
  </div>`;

  return `<div class="page-h"><div><h1>${t('dashboard')}</h1><p>${esc(S.role.user)} · ${esc(t(S.role.key))} · ${date(TODAY)}</p></div>
      <div class="card-a"><a class="btn" href="#/reports">${icon('download', 15)} ${t('export')}</a><a class="btn primary" href="#/bank">${icon('upload', 15)} ${t('uploadStatement')}</a></div></div>
    <div class="grid" style="gap:14px">${top}${pipeline}
      <div class="grid g-main">${chart}${side}</div>
      <div class="grid g-main">${odCard}<div class="grid" style="gap:14px">${rankCard}${dlCard}</div></div>
      ${low}</div>`;
}
