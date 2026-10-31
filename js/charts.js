// Interactive SVG charts drawn at the container's real pixel size (crisp text, round dots),
// with draw-in animation, hover crosshair + tooltip, and in-place live updates.
import { esc, short, num } from './ui.js';

const charts = new Map(); // id -> { plan, fact, labels, unit, el }

/** Catmull-Rom → cubic Bézier for a smooth line through the points. */
function smooth(pts) {
  if (pts.length < 2) return '';
  let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += `C${c1[0].toFixed(1)},${c1[1].toFixed(1)} ${c2[0].toFixed(1)},${c2[1].toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
  }
  return d;
}

/** Placeholder; mountCharts() draws it once the card has a width. */
export function areaChart(id, plan, fact, labels, { unit = '', planLabel = '', factLabel = '' } = {}) {
  charts.set(id, { plan, fact, labels, unit, planLabel, factLabel, el: null, animate: true });
  return `<div class="chart-wrap" data-chart="${esc(id)}" style="height:240px"></div>`;
}

function geometry(c, w, h) {
  const padL = 48, padR = 14, padT = 14, padB = 28, n = c.fact.length;
  // domain fitted to the data (not from zero) so month-to-month movement is visible
  const hi = Math.max(...c.plan, ...c.fact), lo = Math.min(...c.plan, ...c.fact);
  const pad = (hi - lo) * 0.25 || hi * 0.1 || 1;
  const min = Math.max(0, lo - pad), max = hi + pad;
  const x = (i) => padL + (i / (n - 1)) * (w - padL - padR);
  const y = (v) => padT + (1 - (v - min) / (max - min)) * (h - padT - padB);
  return { padL, padR, padT, padB, n, min, max, x, y };
}

function draw(id) {
  const c = charts.get(id); const wrap = document.querySelector(`[data-chart="${id}"]`);
  if (!c || !wrap) return;
  const w = Math.max(280, wrap.clientWidth), h = wrap.clientHeight;
  const g = geometry(c, w, h);
  const fp = c.fact.map((v, i) => [g.x(i), g.y(v)]), pp = c.plan.map((v, i) => [g.x(i), g.y(v)]);
  let grid = '';
  for (let k = 0; k <= 4; k++) { const v = g.min + ((g.max - g.min) / 4) * k; grid += `<line x1="${g.padL}" x2="${w - g.padR}" y1="${g.y(v)}" y2="${g.y(v)}"/><text x="${g.padL - 10}" y="${g.y(v) + 4}" text-anchor="end">${short(v)}</text>`; }
  const labels = c.labels.map((l, i) => `<text x="${g.x(i)}" y="${h - 8}" text-anchor="middle">${esc(l)}</text>`).join('');
  const line = smooth(fp); const last = fp[fp.length - 1];
  wrap.innerHTML = `<svg class="chart ${c.animate ? '' : 'static'}" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
    <defs><linearGradient id="ga-${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--cyan)" stop-opacity=".38"/><stop offset="1" stop-color="var(--cyan)" stop-opacity="0"/></linearGradient>
      <filter id="glow-${id}" x="-10%" y="-30%" width="120%" height="160%"><feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
    <g class="grid">${grid}</g><g class="axis">${labels}</g>
    <path class="area" d="${line}L${last[0]},${h - g.padB}L${fp[0][0]},${h - g.padB}Z" fill="url(#ga-${id})"/>
    <path class="plan" d="${smooth(pp)}"/>
    <path class="fact" d="${line}" pathLength="1" filter="url(#glow-${id})"/>
    <circle class="live-ring" cx="${last[0]}" cy="${last[1]}" r="6"/><circle class="live-dot" cx="${last[0]}" cy="${last[1]}" r="4"/>
    <line class="xhair" y1="${g.padT}" y2="${h - g.padB}" x1="0" x2="0" visibility="hidden"/><circle class="hot" r="5.5" cx="0" cy="0" visibility="hidden"/>
    <rect x="${g.padL}" y="0" width="${w - g.padL - g.padR}" height="${h}" fill="transparent" class="hit"/></svg><div class="ctip" hidden></div>`;
  c.el = wrap; c.g = g; c.animate = false;
}

function hover(wrap, e) {
  const id = wrap.dataset.chart; const c = charts.get(id); if (!c || !c.g) return;
  const r = wrap.getBoundingClientRect(); const mx = e.clientX - r.left;
  const i = Math.max(0, Math.min(c.g.n - 1, Math.round(((mx - c.g.padL) / (r.width - c.g.padL - c.g.padR)) * (c.g.n - 1))));
  const x = c.g.x(i), y = c.g.y(c.fact[i]);
  const xh = wrap.querySelector('.xhair'), hot = wrap.querySelector('.hot'), tip = wrap.querySelector('.ctip');
  xh.setAttribute('x1', x); xh.setAttribute('x2', x); hot.setAttribute('cx', x); hot.setAttribute('cy', y); xh.setAttribute('visibility', 'visible'); hot.setAttribute('visibility', 'visible');
  const rate = c.plan[i] ? (c.fact[i] / c.plan[i]) * 100 : 0;
  tip.innerHTML = `<span>${esc(c.labels[i])}</span><b>${num(c.fact[i])} ${esc(c.unit)}</b><span>${esc(c.planLabel)}: ${short(c.plan[i])} · ${rate.toFixed(1)}%</span>`;
  tip.style.left = `${Math.min(r.width - 90, Math.max(90, x))}px`; tip.style.top = `${y}px`; tip.hidden = false;
}

/** Draw every chart placeholder inside root and wire hover. */
export function mountCharts(root) {
  root.querySelectorAll('[data-chart]').forEach((wrap) => {
    draw(wrap.dataset.chart);
    wrap.addEventListener('pointermove', (e) => hover(wrap, e));
    wrap.addEventListener('pointerleave', () => { const t = wrap.querySelector('.ctip'); if (t) t.hidden = true; wrap.querySelectorAll('.hot,.xhair').forEach((n) => n.setAttribute('visibility', 'hidden')); });
  });
}
/** Live update: replace the series and redraw without the intro animation. */
export function updateChart(id, fact, plan) {
  const c = charts.get(id); if (!c) return;
  c.fact = fact.slice(); if (plan) c.plan = plan.slice();
  draw(id);
}
let rz;
window.addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => charts.forEach((c, id) => { if (document.querySelector(`[data-chart="${id}"]`)) draw(id); }), 120); });

/** Glass capsule bars. items: [{ id, label, v (0..1 of max), text, tone }] */
export function capsules(items) {
  return `<div class="caps">${items.map((it, k) => `<div class="cap ${it.tone || ''}" data-cap="${esc(it.id)}" style="--h:${(Math.max(0.04, it.v) * 100).toFixed(1)}%;--k:${k}"><b>${esc(it.text)}</b><i></i><em>${esc(it.label)}</em></div>`).join('')}</div>`;
}
export function updateCapsule(root, id, v, text) {
  const el = root.querySelector(`[data-cap="${CSS.escape(id)}"]`); if (!el) return;
  el.style.setProperty('--h', `${(Math.max(0.04, v) * 100).toFixed(1)}%`); el.querySelector('b').textContent = text;
  el.classList.add('on'); setTimeout(() => el.classList.remove('on'), 1600);
}

/** Animate a number inside el from its current value to `to`. */
export function countUp(el, to, fmt, ms = 900) {
  if (!el) return;
  const from = +el.dataset.v || 0; el.dataset.v = to;
  const t0 = performance.now();
  const step = (t) => { const k = Math.min(1, (t - t0) / ms); const e = 1 - Math.pow(1 - k, 3); el.innerHTML = fmt(from + (to - from) * e); if (k < 1) requestAnimationFrame(step); };
  requestAnimationFrame(step);
}
