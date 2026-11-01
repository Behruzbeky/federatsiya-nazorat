// Small rendering toolkit: string templates + hand-drawn SVG charts (no libraries, instant load).
import { t, getLang } from './i18n.js';

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const num = (n) => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
export const money = (n) => `${num(n)} <small>${t('sum')}</small>`;
export function short(n) {
  const a = Math.abs(n);
  const u = getLang() === 'en' ? ['K', 'M', 'B'] : getLang() === 'ru' ? ['тыс', 'млн', 'млрд'] : ['ming', 'mln', 'mlrd'];
  if (a >= 1e9) return `${(n / 1e9).toFixed(2)} ${u[2]}`;
  if (a >= 1e6) return `${(n / 1e6).toFixed(1)} ${u[1]}`;
  if (a >= 1e3) return `${(n / 1e3).toFixed(0)} ${u[0]}`;
  return num(n);
}
export const pct = (n, d = 1) => `${(n * 100).toFixed(d)}%`;
export const date = (d) => (d ? `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}` : '—');
export const dtime = (d) => `${date(d)} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

const P = {
  dashboard: '<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>',
  members: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
  fees: '<path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1"/><path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4"/>',
  bank: '<path d="M3 22h18M6 18v-7M10 18v-7M14 18v-7M18 18v-7M12 2l8 5H4z"/>',
  distribution: '<path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/>',
  transfers: '<path d="M8 3 4 7l4 4M4 7h16M16 21l4-4-4-4M20 17H4"/>',
  groups: '<rect x="16" y="16" width="6" height="6" rx="1"/><rect x="2" y="16" width="6" height="6" rx="1"/><rect x="9" y="2" width="6" height="6" rx="1"/><path d="M5 16v-3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v3M12 12V8"/>',
  reports: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/>',
  alerts: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
  audit: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/><path d="m9 12 2 2 4-4"/>',
  settings: '<path d="M21 4h-7M10 4H3M21 12h-9M8 12H3M21 20h-5M12 20H3M14 2v4M8 10v4M16 18v4"/>',
  search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>',
  upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>',
  plus: '<path d="M5 12h14M12 5v14"/>', check: '<path d="M20 6 9 17l-5-5"/>', x: '<path d="M18 6 6 18M6 6l12 12"/>',
  alert: '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4M12 17h.01"/>',
  clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>', chevron: '<path d="m9 18 6-6-6-6"/>',
  lock: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  scale: '<path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1ZM2 16l3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1ZM7 21h10M12 3v18M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2"/>',
  up: '<path d="m22 7-8.5 8.5-5-5L2 17"/><path d="M16 7h6v6"/>', down: '<path d="m22 17-8.5-8.5-5 5L2 7"/><path d="M16 17h6v-6"/>',
  eye: '<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>',
  printer: '<path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>',
  calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/>',
  globe: '<circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>',
  moon: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
};
export const themeBtn = () => `<button type="button" class="icon-btn theme-btn" data-action="theme" aria-label="theme"><span class="sun">${icon('sun', 17)}</span><span class="moon">${icon('moon', 17)}</span></button>`;
export const icon = (n, s = 18) => `<svg class="ic" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[n] || ''}</svg>`;

const TONE = { done: 'ok', matched: 'ok', active: 'ok', onTime: 'ok', closed: 'ok', withDoc: 'ok',
  doneLate: 'warn', partial: 'warn', ordered: 'info', pending: 'mute', unclear: 'warn', suspended: 'warn', late: 'warn', open: 'warn',
  unconfirmed: 'bad', overdue: 'bad', duplicate: 'mute', notSubmitted: 'bad', noDoc: 'bad', transferred: 'info', leftM: 'mute' };
export const pill = (key, label) => `<span class="pill ${TONE[key] || 'mute'}"><i></i>${esc(label || t(key))}</span>`;

/** data-drill attributes: clicking navigates to the records a number was computed from (see app.js). */
export const drillAttr = (to, label) => (to ? ` data-drill="${esc(to)}" data-drill-label="${esc(label || '')}"` : '');

/**
 * Change badge vs the previous period. good: 'up' when growth is good (green), 'down' when a fall is good
 * (debt, overdue). pp: the value is a rate, so show the difference in percentage points.
 */
export function delta({ now, prev, good = 'up', pp = false, id = '' }) {
  if (prev == null || (!pp && !prev)) return '';
  const ch = pp ? (now - prev) * 100 : ((now - prev) / Math.abs(prev)) * 100;
  const dir = ch > 0.05 ? 'up' : ch < -0.05 ? 'down' : 'flat';
  const tone = dir === 'flat' ? 'flat' : (dir === good ? 'pos' : 'neg');
  const arrow = dir === 'up' ? '▲' : dir === 'down' ? '▼' : '•';
  return `<span class="delta ${tone}"${id ? ` data-dk="${esc(id)}"` : ''} title="${esc(t('vsPrev'))}">${arrow} ${Math.abs(ch).toFixed(1)}${pp ? ` ${t('pp')}` : '%'}</span>`;
}
export function setDelta(root, id, d) { const el = root.querySelector(`[data-dk="${id}"]`); if (el) el.outerHTML = delta({ ...d, id }); }

export function kpi({ label, value, sub, trend, tone = '', ic = 'up', spark, drill, d }) {
  return `<div class="card kpi ${tone} ${drill ? 'drill' : ''}"${drillAttr(drill, label)}>${drill ? `<span class="drill-go">${icon('chevron', 14)}</span>` : ''}
    <div class="kpi-top"><span class="kpi-ic">${icon(ic, 16)}</span><span class="kpi-label">${esc(label)}</span></div>
    <div class="kpi-value">${value}${d ? delta(d) : ''}</div>
    <div class="kpi-sub">${trend ? `<b class="${trend.startsWith('-') || trend.startsWith('−') ? 'neg' : 'pos'}">${esc(trend)}</b>` : ''}<span>${esc(sub || '')}</span></div>
    ${spark ? sparkline(spark) : ''}</div>`;
}

export function sparkline(vals, w = 120, h = 34) {
  const max = Math.max(...vals), min = Math.min(...vals), r = max - min || 1;
  const pts = vals.map((v, i) => `${(i / (vals.length - 1)) * w},${h - 3 - ((v - min) / r) * (h - 6)}`).join(' ');
  return `<svg class="spark" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none"><polyline points="${pts}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/></svg>`;
}

/** Animated donut; segments sweep in and swell on hover (title = native tooltip). */
export function donut(parts, { size = 168, label = '', value = '' } = {}) {
  const r = 62, c = 2 * Math.PI * r, total = parts.reduce((s, p) => s + p.v, 0) || 1;
  let off = 0;
  const arcs = parts.map((p, i) => { const len = (p.v / total) * c; const s = `<circle class="seg" style="animation-delay:${i * 0.12}s" r="${r}" cx="80" cy="80" fill="none" stroke="${p.color}" stroke-width="16" stroke-dasharray="${Math.max(0, len - 3)} ${c}" stroke-dashoffset="${-off}" stroke-linecap="round" data-tip="${esc(p.tip || '')}"/>`; off += len; return s; }).join('');
  return `<svg class="donut" width="${size}" height="${size}" viewBox="0 0 160 160"><g transform="rotate(-90 80 80)"><circle r="${r}" cx="80" cy="80" fill="none" stroke="var(--line)" stroke-width="16"/>${arcs}</g>
    <text x="80" y="78" text-anchor="middle" class="d-val">${value}</text><text x="80" y="99" text-anchor="middle" class="d-lbl">${esc(label)}</text></svg>`;
}

/** Half-circle gauge whose arc sweeps to the value (arc length of r=80 half circle ≈ 251.3). */
export function gauge(v, label, id = '') {
  const k = Math.min(1, Math.max(0, v));
  const tone = v >= 0.9 ? 'var(--ok)' : v >= 0.75 ? 'var(--warn)' : 'var(--red)';
  return `<svg class="gauge" viewBox="0 0 200 116" ${id ? `id="${id}"` : ''}><path d="M20 100A80 80 0 0 1 180 100" stroke="var(--line)" stroke-width="14" fill="none" stroke-linecap="round"/>
    <path class="arc" d="M20 100A80 80 0 0 1 180 100" style="--off:${(251.3 * (1 - k)).toFixed(1)};color:${tone}" stroke="${tone}" stroke-width="14" fill="none" stroke-linecap="round"/>
    <text x="100" y="92" text-anchor="middle" class="g-val">${pct(v)}</text><text x="100" y="112" text-anchor="middle" class="g-lbl">${esc(label)}</text></svg>`;
}
export function setGauge(svg, v) {
  if (!svg) return; const k = Math.min(1, Math.max(0, v));
  const arc = svg.querySelector('.arc'); arc.style.animation = 'none'; arc.style.strokeDashoffset = (251.3 * (1 - k)).toFixed(1);
  svg.querySelector('.g-val').textContent = pct(v);
}

export const bar = (v, tone = '') => `<span class="bar ${tone}"><i style="width:${Math.min(100, Math.max(0, v * 100)).toFixed(1)}%"></i></span>`;

/** Segmented control with a sliding glass indicator (Apple-style). */
export const segmented = (name, items, active) => `<div class="seg" data-seg="${name}">${items.map(([v, l]) => `<button class="${v === active ? 'on' : ''}" data-seg-v="${esc(v)}">${esc(l)}</button>`).join('')}<span class="seg-ind"></span></div>`;
export function syncSegments(root = document) {
  root.querySelectorAll('.seg').forEach((s) => {
    const on = s.querySelector('button.on'); const ind = s.querySelector('.seg-ind');
    if (on && ind) { ind.style.width = `${on.offsetWidth}px`; ind.style.transform = `translateX(${on.offsetLeft}px)`; }
  });
}

/** Paginated table. cols: [{k, label, render, cls}] */
export function table(rows, cols, { page = 0, size = 25, id = 'tbl', empty, rowDrill } = {}) {
  const pages = Math.max(1, Math.ceil(rows.length / size));
  const p = Math.min(page, pages - 1);
  const slice = rows.slice(p * size, p * size + size);
  const head = cols.map((c) => `<th class="${c.cls || ''}">${esc(c.label)}</th>`).join('');
  const body = slice.length ? slice.map((r, i) => `<tr data-row="${p * size + i}"${rowDrill ? ` class="drill"${drillAttr(...rowDrill(r))}` : ''}>${cols.map((c) => `<td class="${c.cls || ''}">${c.render ? c.render(r) : esc(r[c.k])}</td>`).join('')}</tr>`).join('')
    : `<tr><td colspan="${cols.length}" class="empty">${esc(empty || t('noData'))}</td></tr>`;
  return `<div class="tbl-wrap"><table class="tbl" id="${id}"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>
    <div class="pager"><span>${num(rows.length)} ${t('rows')}</span><div>
      <button class="btn ghost sm" data-page="${id}:${p - 1}" ${p === 0 ? 'disabled' : ''}>‹</button>
      <span>${p + 1} / ${pages}</span>
      <button class="btn ghost sm" data-page="${id}:${p + 1}" ${p >= pages - 1 ? 'disabled' : ''}>›</button></div></div>`;
}

export function toast(msg, tone = 'ok') {
  const el = document.createElement('div');
  el.className = `toast ${tone}`; el.innerHTML = `${icon(tone === 'bad' ? 'alert' : 'check', 16)}<span>${esc(msg)}</span>`;
  document.getElementById('toasts').appendChild(el);
  setTimeout(() => el.classList.add('out'), 2600); setTimeout(() => el.remove(), 3000);
}

export function drawer(title, html) {
  const d = document.getElementById('drawer');
  d.querySelector('.dr-title').textContent = title;
  d.querySelector('.dr-body').innerHTML = html;
  d.classList.add('open');
}
export const closeDrawer = () => document.getElementById('drawer').classList.remove('open');

export function downloadCSV(name, header, rows) {
  // neutralise spreadsheet formulas (=, +, -, @, tab, CR, |) in text cells; numbers keep their sign
  const q = (v) => { let s = String(v ?? ''); if (typeof v === 'string' && /^[=+\-@\t\r|]/.test(s)) s = `'${s}`; return `"${s.replace(/"/g, '""')}"`; };
  const csv = '﻿' + [header, ...rows].map((r) => r.map(q).join(';')).join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  toast(t('exported'));
}

export const card = (title, body, { cls = '', actions = '' } = {}) => `<section class="card ${cls}">${title ? `<header class="card-h"><h3>${esc(title)}</h3><div class="card-a">${actions}</div></header>` : ''}${body}</section>`;
