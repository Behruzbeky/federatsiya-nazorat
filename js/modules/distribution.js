import { t, mon } from '../i18n.js';
import { esc, num, icon, card, table, donut, short, date, toast, segmented } from '../ui.js';
import { S, can, log, societies, orgName } from '../store.js';
import { distribute, RULES, AGG, MONTHS, TODAY } from '../data.js';
import { F, wire } from './_common.js';

const SRC = [['R-5.9', 's_society'], ['R-5.10', 's_regionDirect'], ['R-OTH', 's_regionOther'], ['R-NO', 's_regionFromSocieties'], ['R-SEP', 's_restricted']];
const COLORS = { region: '#2f8cff', center: '#e11d2a', society: '#1597e5', groups: '#c99a3e' };
const saved = []; // calculations stored in this session, each receipt can be allocated once

export function render() {
  const f = F('distribution', { rule: 'R-5.9', amount: '10000000', ref: 'TXN60000123' });
  const amount = Math.max(0, Math.round(+String(f.amount).replace(/\D/g, '')) || 0);
  const res = distribute(amount, f.rule);
  const rule = RULES.find((r) => r.id === f.rule);
  const already = saved.find((s) => s.ref === f.ref);

  const result = res.blocked
    ? `<div class="note bad">${icon('alert', 16)}<span>${esc(t('blocked_' + res.blocked))}</span></div>`
    : `<div style="display:grid;grid-template-columns:auto 1fr;gap:20px;align-items:center">${donut(res.rows.map((r) => ({ v: r.sum, color: COLORS[r.to] })), { value: short(amount), label: t('total') })}
      <div>${res.rows.map((r) => `<div class="dist-row"><span><i style="display:inline-block;width:9px;height:9px;border-radius:3px;background:${COLORS[r.to]};margin-right:10px"></i>${esc(t('to_' + r.to))}</span><span class="pc">${r.pct}%</span><span class="s">${num(r.sum)}</span></div>`).join('')}
      <div class="dist-row" style="border:0"><b>${t('total')}</b><span class="pc">100%</span><span class="s" style="color:${res.total === amount ? 'var(--ok)' : 'var(--red)'}">${num(res.total)} ${res.total === amount ? '✓' : '✗'}</span></div></div></div>
      ${rule.clarify ? `<div class="note warn">${icon('alert', 16)}<span>${t('clarify')}</span></div>` : ''}
      <div class="note">${icon('scale', 16)}<span>${t('check100')}. ${t('rounding')}. ${t('ruleVer')}: <b>${rule.ver}</b> · ${esc(rule.basis)} · ${date(TODAY)}</span></div>`;

  const calc = card(t('distribution'), `<p class="muted small" style="margin-top:-6px">${t('source')}</p>
    <div style="overflow-x:auto;margin-bottom:6px">${segmented('distRule', SRC.map(([id, k]) => [id, id === 'R-5.9' ? '20/10/60/10' : id === 'R-5.10' ? '10/36/54' : id === 'R-OTH' ? '10/90' : id === 'R-NO' ? '⛔ ' + t('obligation') : 'Grant']), f.rule)}</div>
    <p style="font-weight:600;margin:8px 0 12px">${esc(t(SRC.find((s) => s[0] === f.rule)[1]))}</p>
    <div class="grid g2"><label class="field"><span>${t('amount')} (${t('sum')})</span><input data-f="amount" value="${esc(f.amount)}" inputmode="numeric"></label>
      <label class="field"><span>TXN / ${t('basis')}</span><input data-f="ref" value="${esc(f.ref)}"></label></div>
    ${result}
    ${!res.blocked ? `<div class="card-a" style="margin-top:14px">${already ? `<div class="note bad" style="margin:0;flex:1">${icon('lock', 16)}<span>${esc(f.ref)}: ${t('blocked_redistribution').split(':')[0]} — ${date(already.at)}</span></div>`
    : can('edit') || can('approve') ? `<button class="btn primary" id="dSave">${icon('check', 15)} ${t('save')}</button>` : `<span class="muted small">${t('readOnly')}</span>`}</div>` : ''}`);

  const examples = card('Ustav · Tartib', `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>${t('source')}</th><th>${t('ruleVer')}</th><th>${t('basis')}</th><th>%</th></tr></thead><tbody>
    ${RULES.map((r) => `<tr><td class="wrap">${esc(t(SRC.find((s) => s[0] === r.id)[1]))}</td><td class="mono">${r.ver}</td><td>${esc(r.basis)}</td><td>${r.parts ? r.parts.map((p) => p[1]).join('/') : '—'}</td></tr>`).join('')}</tbody></table></div>
    <div class="note">${icon('clock', 16)}<span>Soliqqa tortiladigan faoliyat daromadlari taqsimlashdan oldin soliqlar toʻlangan boʻlishi shart. Qoidalar oʻzgarsa, yangi versiya faqat kuchga kirgan sanadan qoʻllaniladi.</span></div>`);

  const last = MONTHS - 1;
  const rows = societies().map((s) => ({ s, base: Math.round(AGG[s.id].received[last]) })).map((r) => ({ ...r, d: distribute(r.base, 'R-5.9').rows }));
  const tbl = card(`${t('distShare')} · ${mon(last)}`, table(rows, [
    { label: t('society'), render: (r) => `<b>${esc(r.s.name)}</b><br><small>${esc(orgName(r.s.region))}</small>` },
    { label: t('received'), cls: 'r', render: (r) => num(r.base) },
    ...['region', 'center', 'society', 'groups'].map((k, i) => ({ label: `${t('to_' + k).split(' ')[0]} ${[20, 10, 60, 10][i]}%`, cls: 'r', render: (r) => num(r.d[i].sum) })),
    { label: '∑', cls: 'r', render: (r) => (r.d.reduce((a, b) => a + b.sum, 0) === r.base ? '<span style="color:var(--ok)">✓</span>' : '✗') },
  ], { page: S.pages.dist || 0, id: 'dist', size: 12, rowDrill: (r) => [`bank?st=matched&soc=${r.s.id}&m=${last}`, `${r.s.name} · ${mon(last)}`] }));

  return `<div class="page-h"><div><h1>${t('distribution')}</h1><p>${t('rounding')}</p></div></div>
    <div class="grid g-main" style="margin-bottom:14px">${calc}${examples}</div>${tbl}
    ${saved.length ? card(t('history'), `<ul class="timeline">${saved.map((s) => `<li>${esc(s.ref)} — ${num(s.amount)} ${t('sum')} · ${s.rule}<span>${date(s.at)} · ${esc(S.role.user)}</span></li>`).join('')}</ul>`, { cls: '' }) : ''}`;
}

export function mount(el, rerender) {
  wire(el, 'distribution', rerender, ({ name, value }) => { if (name === 'distRule') { F('distribution').rule = value; rerender(); } });
  const b = el.querySelector('#dSave');
  if (b) b.addEventListener('click', () => {
    const f = F('distribution');
    saved.unshift({ ref: f.ref, amount: +String(f.amount).replace(/\D/g, ''), rule: f.rule, at: new Date() });
    log('rule', `Ajratma hisoblandi (${f.rule})`, f.ref, f.rule);
    toast(t('actionLogged')); rerender();
  });
}
