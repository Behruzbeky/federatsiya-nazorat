// Boot, login (role + 2FA), shell, hash router, global search and event delegation.
import { t, setLang, getLang } from './i18n.js';
import { icon, esc, segmented, syncSegments, closeDrawer, themeBtn } from './ui.js';
import { S, ROLES, metrics, bank, members, societies, resetCache, log, orgName, regionName } from './store.js';

const $ = (s) => document.querySelector(s);
const NAV = ['dashboard', 'members', 'fees', 'bank', 'distribution', 'transfers', 'groups', 'reports', 'alerts', 'audit', 'settings'];
const HIDE = { group: ['bank', 'distribution', 'settings', 'audit'], chair: ['settings'], acc: ['settings'], region: ['settings'], head: [] };
const modules = {};
const load = (name) => modules[name] || (modules[name] = import(`./modules/${name}.js`));

function applyStatic() {
  document.documentElement.lang = getLang();
  document.querySelectorAll('[data-t]').forEach((el) => { el.textContent = t(el.dataset.t); });
  $('#secureLine').innerHTML = `${icon('lock', 13)} ${esc(t('secure'))}`;
  $('#langLogin').innerHTML = langSeg();
  $('#themeLogin').innerHTML = themeBtn();
  $('#loginFlow').innerHTML = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8'].map((k, i) => `<li style="animation-delay:${0.15 + i * 0.06}s"><b>${i + 1}</b>${esc(t(k))}</li>`).join('');
  renderRoles();
  requestAnimationFrame(() => syncSegments());
}
const langSeg = () => segmented('lang', [['uz', 'Oʻz'], ['ru', 'Ру'], ['en', 'En']], getLang());

/* ---------------- Login ---------------- */
let pickedRole = ROLES[0];
function renderRoles() {
  $('#roleList').innerHTML = ROLES.map((r) => `<button type="button" class="role ${r.id === pickedRole.id ? 'on' : ''}" data-role="${r.id}">${esc(t(r.key))}<small>${esc(scopeLabel(r))}</small></button>`).join('');
}
function scopeLabel(r) {
  const [type, id] = r.scope;
  if (type === 'republic') return t('republic');
  if (type === 'region') return regionName(id);
  return orgName(id);
}
function showStep(n) {
  document.querySelectorAll('.step').forEach((s) => { s.hidden = s.dataset.step !== String(n); });
  if (n === 2) {
    $('#otp').innerHTML = Array.from({ length: 6 }, () => '<input inputmode="numeric" autocomplete="one-time-code">').join('');
    $('.otp-ic').innerHTML = icon('lock', 22);
    $('#otpErr').hidden = true;
    $('#otp input').focus();
  }
}
function wireLogin() {
  $('#loginForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const step = document.querySelector('.step:not([hidden])').dataset.step;
    if (step === '1') return showStep(2);
    const code = [...document.querySelectorAll('#otp input')].map((i) => i.value).join('');
    if (code !== '246810') { $('#otpErr').hidden = false; $('#otpErr').textContent = t('otpBad'); return; }
    enter(pickedRole);
  });
  $('#otp').addEventListener('input', (e) => {
    const all = [...document.querySelectorAll('#otp input')];
    const i = e.target; const digits = i.value.replace(/\D/g, '');
    // spread fast input / autofill across the boxes
    let k = all.indexOf(i);
    if (!digits) i.value = '';
    for (const d of digits) { if (k >= all.length) break; all[k++].value = d; }
    if (digits) (all[Math.min(k, all.length - 1)]).focus();
    if (all.every((x) => x.value)) $('#loginForm').requestSubmit();
  });
  $('#otp').addEventListener('keydown', (e) => { if (e.key === 'Backspace' && !e.target.value && e.target.previousElementSibling) e.target.previousElementSibling.focus(); });
  $('#otp').addEventListener('paste', (e) => {
    const d = (e.clipboardData.getData('text') || '').replace(/\D/g, '').slice(0, 6); if (!d) return;
    e.preventDefault(); document.querySelectorAll('#otp input').forEach((x, k) => { x.value = d[k] || ''; });
    if (d.length === 6) $('#loginForm').requestSubmit();
  });
  $('#otpBack').addEventListener('click', () => showStep(1));
}

function enter(role) {
  S.role = role; resetCache();
  try { sessionStorage.setItem('fn.role', role.id); } catch (e) { /* ignore */ }
  log('login', 'Demo kirish (2FA imitatsiyasi)', role.id);
  $('#login').hidden = true; $('#app').hidden = false; document.body.classList.add('in-app');
  if (!location.hash) location.hash = '#/dashboard';
  route();
}
function logout() {
  S.role = null; try { sessionStorage.removeItem('fn.role'); } catch (e) { /* ignore */ }
  $('#app').hidden = true; $('#login').hidden = false; document.body.classList.remove('in-app');
  closeDrawer(); showStep(1); applyStatic(); history.replaceState(null, '', location.pathname);
}

/* ---------------- Shell ---------------- */
const visibleNav = () => NAV.filter((n) => !(HIDE[S.role.id] || []).includes(n));
function renderShell() {
  const m = metrics();
  const alertsN = m.overdue.length + bank().filter((b) => b.status === 'unclear').length;
  $('#rail').innerHTML = `<img class="logo" src="assets/logo-256.webp" alt="" width="44" height="44">${visibleNav().map((n, i) =>
    `${n === 'reports' ? '<span class="div"></span>' : ''}<a href="#/${n}" class="${S.page === n ? 'on' : ''}" data-label="${esc(t(n))}" aria-label="${esc(t(n))}">${icon(n, 19)}${n === 'alerts' && alertsN ? `<span class="badge">${alertsN > 99 ? '99+' : alertsN}</span>` : ''}</a>`).join('')}
    <span class="sep"></span><a href="#" data-action="logout" data-label="${esc(t('logout'))}" aria-label="${esc(t('logout'))}">${icon('logout', 19)}</a>`;
  const initials = S.role.user.split(/[ .]+/).filter(Boolean).map((p) => p[0]).join('').slice(0, 2);
  $('#top').innerHTML = `<div class="crumbs"><b>${esc(t(S.page))}</b><span>${esc(scopeLabel(S.role))} · <b class="demo-tag">DEMO</b> ${esc(t('demoBanner'))}</span></div>
    <label class="searchbox">${icon('search', 16)}<input id="q" placeholder="${esc(t('search'))}" autocomplete="off"><kbd>Ctrl K</kbd><div class="results" id="qr" hidden></div></label>
    <div id="langTop">${langSeg()}</div>${themeBtn()}
    <a class="icon-btn" href="#/alerts" aria-label="${esc(t('alerts'))}">${icon('alerts', 17)}${alertsN ? `<span class="badge">${alertsN > 99 ? '99+' : alertsN}</span>` : ''}</a>
    <div class="user"><div class="meta"><b>${esc(S.role.user)}</b><span>${esc(t(S.role.key))}</span></div><div class="av">${esc(initials)}</div></div>`;
}

let routeSeq = 0;
async function route() {
  if (!S.role) return;
  const name = (location.hash.replace('#/', '') || 'dashboard').split('?')[0];
  S.page = visibleNav().includes(name) ? name : 'dashboard';
  renderShell();
  const view = $('#view');
  const seq = ++routeSeq;
  const mod = await load(S.page);
  if (seq !== routeSeq) return; // a newer navigation already won
  view.innerHTML = `<div class="page">${mod.render()}</div>`;
  view.style.animation = 'none'; void view.offsetWidth; view.style.animation = '';
  if (mod.mount) mod.mount(view.firstElementChild, rerender);
  requestAnimationFrame(() => syncSegments());
  window.scrollTo({ top: 0 });
}
async function rerender() {
  const mod = await load(S.page);
  const view = $('#view');
  view.innerHTML = `<div class="page">${mod.render()}</div>`;
  if (mod.mount) mod.mount(view.firstElementChild, rerender);
  syncSegments();
}

/* ---------------- Global search ---------------- */
function search(q) {
  q = q.trim().toLowerCase(); const box = $('#qr');
  if (q.length < 2) { box.hidden = true; return; }
  const res = [];
  // results are limited to the signed-in role's scope
  for (const m of members()) { if (res.length >= 6) break; if (m.name.toLowerCase().includes(q) || m.id.toLowerCase().includes(q)) res.push({ l: m.name, s: m.id, go: `#/members?id=${m.id}` }); }
  for (const s of societies()) { if (res.length >= 10) break; if (s.name.toLowerCase().includes(q)) res.push({ l: s.name, s: regionName(s.region), go: '#/transfers' }); }
  for (const b of bank()) { if (res.length >= 13) break; if (b.id.toLowerCase().includes(q)) res.push({ l: b.id, s: b.payer, go: '#/bank' }); }
  box.innerHTML = res.length ? res.map((r, i) => `<a data-go="${esc(r.go)}" class="${i ? '' : 'hl'}">${esc(r.l)}<small>${esc(r.s)}</small></a>`).join('') : `<a>${esc(t('noData'))}</a>`;
  box.hidden = false;
}

/* ---------------- Events ---------------- */
function wire() {
  document.addEventListener('click', (e) => {
    const seg = e.target.closest('[data-seg-v]');
    if (seg) {
      const name = seg.parentElement.dataset.seg;
      if (name === 'lang') { setLang(seg.dataset.segV); applyStatic(); if (S.role) route(); return; }
      seg.parentElement.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b === seg)); syncSegments(seg.parentElement.parentElement);
      document.dispatchEvent(new CustomEvent('seg', { detail: { name, value: seg.dataset.segV } }));
      return;
    }
    const role = e.target.closest('[data-role]');
    if (role) { pickedRole = ROLES.find((r) => r.id === role.dataset.role); renderRoles(); return; }
    const a = e.target.closest('[data-action]');
    if (a) {
      if (a.dataset.action === 'logout') { e.preventDefault(); logout(); }
      if (a.dataset.action === 'closeDrawer') closeDrawer();
      if (a.dataset.action === 'theme') {
        const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
        document.documentElement.dataset.theme = next;
        document.querySelector('meta[name="theme-color"]').content = next === 'dark' ? '#050a18' : '#eef3fa';
        try { localStorage.setItem('fn.theme', next); } catch (err) { /* ignore */ }
      }
      return;
    }
    const go = e.target.closest('[data-go]');
    if (go) { location.hash = go.dataset.go; $('#qr').hidden = true; $('#q').value = ''; return; }
    if (!e.target.closest('#drawer') && !e.target.closest('[data-open]') && !e.target.closest('tr.click') && document.getElementById('drawer').classList.contains('open')) closeDrawer();
  });
  document.addEventListener('input', (e) => { if (e.target.id === 'q') search(e.target.value); });
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k' && S.role) { e.preventDefault(); $('#q').focus(); }
    if (e.key === 'Escape') { closeDrawer(); if ($('#qr')) $('#qr').hidden = true; }
    if (e.key === 'Enter' && e.target.id === 'q') { const f = $('#qr a[data-go]'); if (f) f.click(); }
  });
  // chart tooltips
  const tip = $('#tip');
  document.addEventListener('mouseover', (e) => { const el = e.target.closest('[data-tip]'); if (!el) { tip.hidden = true; return; } tip.textContent = el.dataset.tip; tip.hidden = false; });
  document.addEventListener('mousemove', (e) => { if (!tip.hidden) { tip.style.left = `${e.clientX + 12}px`; tip.style.top = `${e.clientY - 34}px`; } }, { passive: true });
  window.addEventListener('hashchange', route);
  let rz; window.addEventListener('resize', () => { cancelAnimationFrame(rz); rz = requestAnimationFrame(() => syncSegments()); });
}

applyStatic(); wireLogin(); wire();
let saved = null;
try { saved = sessionStorage.getItem('fn.role'); } catch (e) { /* ignore */ }
if (saved && ROLES.find((r) => r.id === saved)) enter(ROLES.find((r) => r.id === saved));
else $('#login').hidden = false;
// warm the dashboard module while the user is on the login screen
setTimeout(() => load('dashboard'), 300);
