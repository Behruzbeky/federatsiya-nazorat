// Shared wiring for module pages: pagination, filters, segmented tabs, debounced search.
import { S } from '../store.js';
import { esc } from '../ui.js';

export const F = (mod, defaults) => (S.filters[mod] = { ...defaults, ...(S.filters[mod] || {}) });

/** Chip showing where a drill-down came from, with a button that clears it. */
export function drillBar(mod) {
  const f = S.filters[mod]; if (!f || !f._via) return '';
  return `<div class="drill-bar"><span class="chip">↳ ${esc(f._via)}<button data-clear-drill="${esc(mod)}" aria-label="clear">×</button></span></div>`;
}

export function wire(el, mod, rerender, onSeg) {
  el.addEventListener('click', (e) => {
    const p = e.target.closest('[data-page]');
    if (p) { const [id, n] = p.dataset.page.split(':'); S.pages[id] = +n; rerender(); }
    const c = e.target.closest('[data-clear-drill]');
    if (c) { S.filters[c.dataset.clearDrill] = null; S.pages[c.dataset.clearDrill] = 0; rerender(); }
  });
  el.querySelectorAll('[data-f]').forEach((inp) => {
    const apply = () => { F(mod)[inp.dataset.f] = inp.value; S.pages[mod] = 0; rerender(); };
    if (inp.tagName === 'SELECT') inp.addEventListener('change', apply);
    else {
      let tm; inp.addEventListener('input', () => { clearTimeout(tm); tm = setTimeout(() => { apply(); const n = document.querySelector(`[data-f="${inp.dataset.f}"]`); if (n) { n.focus(); n.setSelectionRange(n.value.length, n.value.length); } }, 180); });
    }
  });
  segHandler = onSeg ? (e) => { if (S.page === mod) onSeg(e.detail); } : null;
}
let segHandler = null;
document.addEventListener('seg', (e) => { if (segHandler) segHandler(e); });
export const opt = (v, label, cur) => `<option value="${esc(v)}" ${String(v) === String(cur) ? 'selected' : ''}>${esc(label)}</option>`;
