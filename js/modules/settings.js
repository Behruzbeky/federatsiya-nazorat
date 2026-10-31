import { t, mon } from '../i18n.js';
import { esc, num, icon, card } from '../ui.js';
import { ROLES } from '../store.js';
import { RULES, TARIFFS, YEAR, isWorkday, nthWorkday } from '../data.js';

const PERMS = ['view', 'edit', 'approve', 'audit', 'admin'];
const PL = { view: 'perm_view', edit: 'perm_edit', approve: 'perm_approve', audit: 'audit', admin: 'perm_admin' };

function calendar(m) {
  const first = new Date(YEAR, m, 1); const days = new Date(YEAR, m + 1, 0).getDate();
  const off = (first.getDay() + 6) % 7; const d5 = nthWorkday(m - 1, 5).getDate(); const d3 = nthWorkday(m - 1, 3).getDate();
  let cells = '<div></div>'.repeat(off);
  for (let d = 1; d <= days; d++) {
    const wd = isWorkday(new Date(YEAR, m, d));
    const mark = d === d5 ? 'background:var(--blue);color:#fff' : d === d3 ? 'background:var(--red);color:#fff' : wd ? '' : 'color:var(--dim);background:var(--glass)';
    cells += `<div style="padding:7px 0;text-align:center;border-radius:9px;font-size:12px;font-weight:600;border:1px solid var(--line);${mark}">${d}</div>`;
  }
  return `<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:4px">${['Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh', 'Ya'].map((x) => `<div style="text-align:center;font-size:11px;color:var(--mute)">${x}</div>`).join('')}${cells}</div>
    <div class="chips" style="margin-top:10px"><span class="pill info">3-ish kuni · 36%</span><span class="pill info">5-ish kuni · 20/10</span></div>`;
}

export function render() {
  const rules = card(t('rulesTitle'), `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>ID</th><th>${t('ruleVer')}</th><th>${t('basis')}</th><th>${t('period')}</th><th>%</th></tr></thead><tbody>
    ${RULES.map((r) => `<tr><td class="mono">${esc(r.id)}</td><td class="mono">${esc(r.ver)}</td><td>${esc(r.basis)}</td><td>${r.from || '—'} → …</td><td>${r.parts ? r.parts.map((p) => `${p[1]}`).join('/') : r.blocked === 'redistribution' ? '⛔' : '∅'}</td></tr>`).join('')}</tbody></table></div>
    <div class="note">${icon('lock', 16)}<span>Yangi versiya faqat kuchga kirgan sanadan qoʻllaniladi; oʻtgan davr hisob-kitoblari oʻzgarmaydi. Oʻzgartirish ikki bosqichli tasdiqdan oʻtadi.</span></div>`);
  const tariffs = card(t('tariffsTitle'), `<div class="tbl-wrap"><table class="tbl"><tbody>${TARIFFS.map((x) => `<tr><td class="mono">${esc(x.id)}</td><td>${esc(x.from)} → ${esc(x.to || '…')}</td><td class="r">${num(x.monthly)}</td><td class="r">${num(x.entry)}</td><td>${esc(x.decision)}</td></tr>`).join('')}</tbody></table></div>
    <div class="note warn">${icon('alert', 16)}<span>${t('demoNote')}</span></div>`);
  const roles = card(t('rolesTitle'), `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>${t('role')}</th>${PERMS.map((p) => `<th class="perm">${esc(t(PL[p]))}</th>`).join('')}</tr></thead><tbody>
    ${ROLES.map((r) => `<tr><td>${esc(t(r.key))}</td>${PERMS.map((p) => `<td class="perm">${r.perms.includes(p) ? '<span class="y">●</span>' : '<span class="n">○</span>'}</td>`).join('')}</tr>`).join('')}</tbody></table></div>
    <div class="note">${icon('audit', 16)}<span>Minimal zarur kirish tamoyili. Administrator moliyaviy tasdiqlash huquqiga ega emas. ${t('sod')}.</span></div>`);
  const cal = card(`${t('calendar')} · ${mon(10)} ${YEAR}`, calendar(10));
  return `<div class="page-h"><div><h1>${t('settings')}</h1><p>${t('demoNote')}</p></div></div>
    <div class="grid g2" style="margin-bottom:14px">${rules}${roles}</div><div class="grid g2">${tariffs}${cal}</div>`;
}
