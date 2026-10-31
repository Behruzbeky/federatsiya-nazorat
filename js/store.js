// Session state, role-based scope and derived metrics.
import { REGIONS, SOCIETIES, GROUPS, MEMBERS, AGG, OBLIGATIONS, BANK, REGISTERS, EXPENSES, AUDIT, MONTHS, TODAY, byId, memberDebt, workdaysBetween } from './data.js';
import { getLang } from './i18n.js';

// perms: view, edit (enter financial data), approve, audit, admin
export const ROLES = [
  { id: 'head', key: 'r_head', scope: ['republic'], perms: ['view', 'approve'], user: 'B. Toshmatov' },
  { id: 'fin', key: 'r_fin', scope: ['republic'], perms: ['view', 'approve', 'edit'], user: 'A. Karimov' },
  { id: 'region', key: 'r_region', scope: ['region', 'R10'], perms: ['view', 'approve'], user: 'J. Nazarov' },
  { id: 'chair', key: 'r_chair', scope: ['society', 'R10-S1'], perms: ['view', 'approve'], user: 'S. Yusupov' },
  { id: 'acc', key: 'r_acc', scope: ['society', 'R10-S1'], perms: ['view', 'edit'], user: 'D. Rahimova' },
  { id: 'group', key: 'r_group', scope: ['group', 'R10-S1-G1'], perms: ['view'], user: 'M. Qodirova' },
  { id: 'auditor', key: 'r_auditor', scope: ['republic'], perms: ['view', 'audit'], user: 'N. Saidova' },
  { id: 'admin', key: 'r_admin', scope: ['republic'], perms: ['view', 'admin'], user: 'T. Ergashev' },
];

export const S = { role: null, page: 'dashboard', pages: {}, filters: {}, tasks: null };
export const can = (p) => !!S.role && S.role.perms.includes(p);
export const scopeType = () => (S.role ? S.role.scope[0] : 'republic');
export const scopeId = () => (S.role ? S.role.scope[1] : null);

export function inScope(o) {
  const [type, id] = S.role ? S.role.scope : ['republic'];
  if (type === 'republic') return true;
  if (type === 'region') return o.region === id || o.from === id || o.id === id;
  if (type === 'society') return o.society === id || o.from === id || o.org === id || o.id === id;
  if (type === 'group') return o.group === id || o.id === id || (o.society === byId[id].society && !('group' in o));
  return true;
}
export const regionName = (id) => (byId[id] ? byId[id].name[getLang()] || byId[id].name.uz : id);
export function orgName(id) {
  if (id === 'CENTER') return getLang() === 'ru' ? 'Центральный аппарат' : getLang() === 'en' ? 'Central office' : 'Markaziy apparat';
  const o = byId[id]; if (!o) return id;
  if (o.societies) return regionName(id);
  if (o.groups) return o.name;
  return `${byId[o.society].name} · №${o.n}`;
}

const memo = new Map();
const cached = (k, fn) => { const key = `${S.role && S.role.id}:${k}`; if (!memo.has(key)) memo.set(key, fn()); return memo.get(key); };
export const resetCache = () => memo.clear();

export const members = () => cached('m', () => MEMBERS.filter(inScope));
export const societies = () => cached('s', () => SOCIETIES.filter((s) => inScope({ region: s.region, society: s.id, id: s.id })));
export const obligations = () => cached('o', () => OBLIGATIONS.filter((o) => {
  const t = scopeType(); const id = scopeId();
  if (t === 'republic') return true;
  if (t === 'region') return o.from === id || (o.kind === 'society' && byId[o.from].region === id);
  const soc = t === 'group' ? byId[id].society : id;
  return o.from === soc;
}));
export const bank = () => cached('b', () => BANK.filter((b) => { const t = scopeType(); return t === 'republic' || (t === 'region' ? b.region === scopeId() : b.society === (t === 'group' ? byId[scopeId()].society : scopeId())); }));
export const groups = () => cached('g', () => GROUPS.filter((g) => inScope({ region: g.region, society: g.society, group: g.id, id: g.id })));
export const expenses = () => cached('e', () => EXPENSES.filter((e) => inScope({ region: e.region, society: e.society, group: e.group })));
export const registers = () => cached('r', () => REGISTERS.filter((r) => { const t = scopeType(); return t === 'republic' || (t === 'region' ? r.region === scopeId() : r.org === (t === 'group' ? byId[scopeId()].society : scopeId())); }));

/** Monthly charged/received series for the current scope. */
export function series() {
  return cached('series', () => {
    const ch = Array(MONTHS).fill(0), rc = Array(MONTHS).fill(0);
    for (const s of societies()) { const a = AGG[s.id]; for (let i = 0; i < MONTHS; i++) { ch[i] += a.charged[i]; rc[i] += a.received[i]; } }
    if (scopeType() === 'group') { const share = members().length / Math.max(1, MEMBERS.filter((m) => m.society === byId[scopeId()].society).length); for (let i = 0; i < MONTHS; i++) { ch[i] *= share; rc[i] *= share; } }
    return { charged: ch, received: rc };
  });
}

export function metrics() {
  return cached('metrics', () => {
    const ms = members();
    const active = ms.filter((m) => m.status === 'active').length;
    const { charged, received } = series();
    const ch = charged.reduce((a, b) => a + b, 0), rc = received.reduce((a, b) => a + b, 0);
    const debt = ms.reduce((s, m) => s + memberDebt(m), 0);
    const obs = obligations().filter((o) => o.dueDate < TODAY);
    const onTime = obs.filter((o) => o.status === 'done').length;
    const overdue = obligations().filter((o) => ['overdue', 'partial', 'unconfirmed'].includes(o.status));
    const overdueSum = overdue.reduce((s, o) => s + (o.amount - o.paid), 0);
    const regs = registers().filter((r) => r.due < TODAY);
    const regOk = regs.filter((r) => r.submitted && r.submitted <= r.due).length;
    const ex = expenses(); const exDoc = ex.filter((e) => e.doc).reduce((s, e) => s + e.amount, 0); const exAll = ex.reduce((s, e) => s + e.amount, 0);
    return { total: ms.length, active, ch, rc, collect: rc / (ch || 1), debt, timely: onTime / (obs.length || 1), overdue, overdueSum,
      registers: regOk / (regs.length || 1), docs: exDoc / (exAll || 1), received, charged };
  });
}

/** Payment discipline per region (or per society inside a region). */
export function ranking() {
  return cached('rank', () => {
    const t = scopeType();
    const units = t === 'republic' ? REGIONS.map((r) => ({ id: r.id, name: regionName(r.id), socs: r.societies }))
      : societies().map((s) => ({ id: s.id, name: s.name, socs: [s.id] }));
    return units.map((u) => {
      let ch = 0, rc = 0; u.socs.forEach((sid) => { const a = AGG[sid]; ch += a.charged.reduce((x, y) => x + y, 0); rc += a.received.reduce((x, y) => x + y, 0); });
      const obs = OBLIGATIONS.filter((o) => (u.socs.includes(o.from) || o.from === u.id) && o.dueDate < TODAY);
      const ok = obs.filter((o) => o.status === 'done').length;
      return { ...u, collect: rc / (ch || 1), timely: ok / (obs.length || 1), rc };
    }).sort((a, b) => b.timely + b.collect - (a.timely + a.collect));
  });
}

export function log(kind, text, obj, basis = '—') {
  AUDIT.unshift({ at: new Date(), user: `${S.role.user} (${S.role.id})`, kind, text, obj, basis, ip: '10.12.0.1' });
}
export const overdueDaysNow = (o) => workdaysBetween(o.dueDate, TODAY);
