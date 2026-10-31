import { t, mon } from '../i18n.js';
import { table, pill, esc, num, short, kpi, date, icon, drawer, closeDrawer, toast, segmented, downloadCSV } from '../ui.js';
import { bank, S, can, log, resetCache, regionName, societies, scopeType } from '../store.js';
import { BANK, SOCIETIES, REGIONS, AGG, MONTHS, byId, YEAR } from '../data.js';
import { F, wire, opt, drillBar } from './_common.js';

let rows = [];
export function render() {
  const f = F('bank', { st: 'all', q: '', m: '', region: '', soc: '' });
  const q = f.q.trim().toLowerCase();
  // scope = role + period/region/society filters; KPIs and the table use the same set, so totals always match
  const base = bank().filter((b) => (f.m === '' || b.month === +f.m) && (!f.region || b.region === f.region) && (!f.soc || b.society === f.soc));
  rows = base.filter((b) => (f.st === 'all' || b.status === f.st) && (!q || b.id.toLowerCase().includes(q) || b.payer.toLowerCase().includes(q) || byId[b.society].name.toLowerCase().includes(q)));
  const sum = (st) => base.filter((b) => b.status === st).reduce((s, b) => s + b.amount, 0);
  const cnt = (st) => base.filter((b) => b.status === st).length;
  const period = f.m === '' ? t('ytd') : `${mon(+f.m)} 2026`;
  const total = rows.filter((b) => b.status !== 'duplicate').reduce((s, b) => s + b.amount, 0);
  const cols = [
    { label: 'TXN', render: (b) => `<span class="mono">${esc(b.id)}</span>` },
    { label: t('date'), render: (b) => date(b.date) },
    { label: t('payer'), cls: 'wrap', render: (b) => `${esc(b.payer)}<br><small>${esc(b.purpose)}</small>` },
    { label: `${t('account')} / ${t('society')}`, render: (b) => `<span class="mono">${esc(b.account.slice(0, 5))}…${esc(b.account.slice(-4))}</span><br><small>${esc(byId[b.society].name)} · ${esc(regionName(b.region))}</small>` },
    { label: t('amount'), cls: 'r', render: (b) => `<b>${num(b.amount)}</b>` },
    { label: t('status'), render: (b) => pill(b.status) + (b.dupOf ? `<br><small>= ${esc(b.dupOf)}</small>` : '') },
    { label: '', cls: 'r', render: (b) => (b.status === 'unclear' && can('edit') ? `<button class="btn sm" data-assign="${esc(b.id)}">${t('assign')}</button>` : '') },
  ];
  const keep = `m=${f.m}&region=${f.region}&soc=${f.soc}`;
  return `<div class="page-h"><div><h1>${t('bank')}</h1><p>${t('bankOnly')}</p></div><div class="card-a"><button class="btn" id="bExport">${icon('download', 15)} CSV</button></div></div>
    ${drillBar('bank')}
    <div class="grid g4" style="margin-bottom:14px">
      ${kpi({ label: `${t('received')} · ${period}`, value: `${short(sum('matched'))} <small>${t('sum')}</small>`, sub: `${num(cnt('matched'))} TXN`, ic: 'bank', tone: 'ok', drill: `bank?st=matched&${keep}` })}
      ${kpi({ label: t('unclear'), value: num(cnt('unclear')), sub: `${short(sum('unclear'))} ${t('sum')}`, ic: 'alert', tone: 'warn', drill: `bank?st=unclear&${keep}` })}
      ${kpi({ label: t('duplicate'), value: num(cnt('duplicate')), sub: `${short(sum('duplicate'))} ${t('sum')}`, ic: 'x', tone: 'bad', drill: `bank?st=duplicate&${keep}` })}
      ${kpi({ label: t('k_discrep'), value: `0 <small>${t('sum')}</small>`, sub: t('check100'), ic: 'scale', tone: 'ok', drill: 'distribution' })}
    </div>
    <div class="grid g-main">
      <section class="card"><div class="toolbar">${segmented('bankSt', [['all', t('all')], ['matched', t('matched')], ['unclear', t('unclear')], ['duplicate', t('duplicate')]], f.st)}
        <select class="inp" data-f="m">${opt('', `${t('period')}: ${t('ytd')}`, f.m)}${Array.from({ length: MONTHS }, (_, i) => opt(i, `${mon(i)} 2026`, f.m)).join('')}</select>
        ${scopeType() === 'republic' ? `<select class="inp" data-f="region">${opt('', `${t('region')}: ${t('all')}`, f.region)}${REGIONS.map((r) => opt(r.id, regionName(r.id), f.region)).join('')}</select>` : ''}
        <select class="inp" data-f="soc">${opt('', `${t('society')}: ${t('all')}`, f.soc)}${societies().filter((s) => !f.region || s.region === f.region).map((s) => opt(s.id, s.name, f.soc)).join('')}</select>
        <input class="inp grow" data-f="q" value="${esc(f.q)}" placeholder="TXN, ${esc(t('payer').toLowerCase())}…"></div>
        ${table(rows, cols, { page: S.pages.bank || 0, id: 'bank', size: 20 })}
        <div class="sumline"><span>${t('count')}: <b>${num(rows.length)}</b></span><span>${t('total')}: <b>${num(total)} ${t('sum')}</b></span></div></section>
      <section class="card"><header class="card-h"><h3>${t('uploadStatement')}</h3></header>
        ${can('edit') ? `<label class="drop" id="drop">${icon('upload', 22)}<p>${esc(t('dropHint'))}</p><input type="file" accept=".csv,text/csv" id="csv" hidden></label>
        <button class="btn sm" id="sample" style="margin-top:10px">${icon('file', 14)} Namuna CSV</button>` : `<div class="note">${icon('lock', 16)}<span>${t('readOnly')}</span></div>`}
        <div class="note">${icon('audit', 16)}<span>Har bir tranzaksiya identifikatori saqlanadi — bitta toʻlov ikki marta hisobga olinmaydi. Aniqlanmagan tushumlar «${esc(t('unclear'))}» navbatiga tushadi.</span></div>
        <div class="note warn">${icon('clock', 16)}<span>2-bosqich: bank API orqali avtomatik olish (kelishuv va xavfsizlik bahosidan soʻng).</span></div>
      </section></div>`;
}

// ; or , separated, double-quoted fields may contain separators and "" escapes
function splitCSV(line) {
  const out = []; let cur = '', q = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (q) { if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; } else if (ch === '"') q = false; else cur += ch; }
    else if (ch === '"') q = true; else if (ch === ';' || ch === ',') { out.push(cur.trim()); cur = ''; } else cur += ch;
  }
  out.push(cur.trim()); return out;
}

function importCSV(text) {
  const known = new Set(BANK.map((b) => b.id));
  const byAcc = new Map(SOCIETIES.map((s) => [s.account, s]));
  let n = 0, d = 0, bad = 0;
  if (text.length > 5e6) { toast('CSV > 5 MB', 'bad'); return; }
  text.split(/\r?\n/).slice(1, 20001).forEach((line) => {
    const c = splitCSV(line);
    if (c.length < 3 || !c[0]) return;
    let [id, dt, amt, payer = '—', acc = '', purpose = '—'] = c;
    // validate at the boundary: strict ids/accounts/amounts, clipped free text (also escaped on render)
    if (!/^[A-Za-z0-9_-]{1,40}$/.test(id) || (acc && !/^[A-Z0-9]{20}$/.test(acc)) || !/^[\d\s.,]+$/.test(amt) || !/^[\d.-]{8,10}$/.test(dt)) { bad++; return; }
    payer = payer.slice(0, 200); purpose = purpose.slice(0, 200);
    const soc = byAcc.get(acc) || societies()[0];
    const [dd, mm, yy] = dt.includes('.') ? dt.split('.') : [dt.slice(8, 10), dt.slice(5, 7), dt.slice(0, 4)];
    const when = new Date(+yy || YEAR, (+mm || 10) - 1, +dd || 1);
    const row = { id, date: when, month: Math.min(MONTHS - 1, Math.max(0, when.getMonth())), amount: Math.round(+amt.replace(/\s/g, '')) || 0, payer, account: acc || soc.account,
      society: soc.id, region: soc.region, purpose, status: known.has(id) ? 'duplicate' : byAcc.has(acc) ? 'matched' : 'unclear' };
    if (known.has(id)) { row.dupOf = id; d++; } else n++;
    known.add(id); BANK.unshift(row);
  });
  log('import', `Bank koʻchirmasi yuklandi: ${n} ta, takroriy ${d}, rad etilgan ${bad}`, 'CSV');
  resetCache(); toast(t('importedN', { n, d }));
}

export function mount(el, rerender) {
  wire(el, 'bank', rerender, ({ name, value }) => { if (name === 'bankSt') { F('bank').st = value; S.pages.bank = 0; rerender(); } });
  el.querySelector('#bExport').addEventListener('click', () => downloadCSV('bank-tushumlari.csv', ['TXN', 'Sana', 'Toʻlovchi', 'Hisob', 'Jamiyat', 'Summa', 'Holat'],
    rows.map((b) => [b.id, date(b.date), b.payer, b.account, byId[b.society].name, b.amount, b.status])));
  el.addEventListener('click', (e) => {
    const a = e.target.closest('[data-assign]'); if (!a) return;
    const b = BANK.find((x) => x.id === a.dataset.assign);
    drawer(`${t('assign')} · ${b.id}`, `<dl class="kv"><dt>${t('payer')}</dt><dd>${esc(b.payer)}</dd><dt>${t('amount')}</dt><dd>${num(b.amount)} ${t('sum')}</dd><dt>${t('purpose')}</dt><dd>${esc(b.purpose)}</dd></dl>
      <label class="field"><span>${t('society')}</span><select id="asSoc">${societies().map((s) => opt(s.id, `${s.name} — ${regionName(s.region)}`, b.society)).join('')}</select></label>
      <label class="field"><span>${t('basis')}</span><input id="asBasis" placeholder="Toʻlovchi bilan aniqlashtirildi, xat №…"></label>
      <button class="btn primary block" id="asOk">${icon('check', 16)} ${t('save')}</button>`);
    document.getElementById('asOk').onclick = () => {
      b.society = document.getElementById('asSoc').value; b.region = byId[b.society].region; b.status = 'matched';
      AGG[b.society].received[b.month ?? MONTHS - 1] += b.amount;
      log('confirm', 'Tushum aʼzo/jamiyatga biriktirildi', b.id, document.getElementById('asBasis').value || '—');
      resetCache(); closeDrawer(); toast(t('actionLogged')); rerender();
    };
  });
  const csv = el.querySelector('#csv');
  if (csv) {
    const drop = el.querySelector('#drop');
    csv.addEventListener('change', () => { const f = csv.files[0]; if (f) f.text().then((x) => { importCSV(x); rerender(); }); });
    drop.addEventListener('dragover', (e) => { e.preventDefault(); drop.classList.add('over'); });
    drop.addEventListener('dragleave', () => drop.classList.remove('over'));
    drop.addEventListener('drop', (e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) f.text().then((x) => { importCSV(x); rerender(); }); });
    el.querySelector('#sample').addEventListener('click', () => {
      const s = societies()[0]; const dup = BANK.find((b) => b.status === 'matched');
      downloadCSV('namuna-kochirma.csv', ['id', 'sana', 'summa', 'toʻlovchi', 'hisob', 'maqsad'], [
        ['TXN70000001', '28.10.2026', '240000', `${s.name} tayanch guruhi`, s.account, 'Aʼzolik badali, oktyabr'],
        ['TXN70000002', '29.10.2026', '36000', 'Jismoniy shaxs', '00000000000000000000', 'badal'],
        [dup.id, date(dup.date), String(dup.amount), dup.payer, dup.account, dup.purpose]]);
    });
  }
}
