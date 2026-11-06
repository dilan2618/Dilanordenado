// =====================================================================
// OUR SPACE · arranque, enrutador y estructura
// =====================================================================
import { db } from './db.js';
import { S, loadSpace, onboardingDone, memberView } from './store.js';
import { $, $$, esc, icon, avatar, sheet, closeSheet, toast, friendlyError } from './ui.js';

const routes = {
  inicio: () => import('./views/home.js'),
  asistente: () => import('./views/assistant.js'),
  conflictos: () => import('./views/conflicts.js'),
  conocernos: () => import('./views/know.js'),
  diario: () => import('./views/journal.js'),
  acuerdos: () => import('./views/agreements.js'),
  actividades: () => import('./views/activities.js'),
  memoria: () => import('./views/memory.js'),
  ajustes: () => import('./views/settings.js'),
  seguridad: () => import('./views/safety.js'),
};
const NAV = [
  ['inicio', 'Nuestro espacio', 'home'], ['asistente', 'Asistente', 'chat'], ['conflictos', 'Comprender un conflicto', 'scale'],
  ['conocernos', 'Conocernos', 'users'], ['diario', 'Nuestro diario', 'book'], ['acuerdos', 'Acuerdos', 'pact'],
  ['actividades', 'Actividades', 'compass'], ['memoria', 'Memoria', 'brain'], ['ajustes', 'Privacidad y ajustes', 'settings'],
];
const TABS = [['inicio', 'Inicio', 'home'], ['diario', 'Diario', 'book'], ['asistente', 'Asistente', 'chat'], ['actividades', 'Conectar', 'compass']];

const app = $('#app');
let cleanup = null, unsub = null, current = '';

export const go = (path) => { location.hash = '#/' + path; };
const parseHash = () => (location.hash.replace(/^#\/?/, '') || 'inicio').split('?')[0].split('/');

function shell() {
  if ($('.shell', app)) return $('#main');
  const partner = memberView(S.partner), me = memberView(S.me);
  app.innerHTML = `<div class="shell">
    <aside class="side">
      <div class="brand"><span class="brand-mark">os</span><b>OUR SPACE</b></div>
      <nav>${NAV.map(([k, l, i]) => `<a href="#/${k}" data-nav="${k}">${icon(i)}<span>${l}</span></a>`).join('')}</nav>
      <div class="side-foot row"><span class="pair">${avatar(me, 'sm')}${partner ? avatar(partner, 'sm') : ''}</span>
        <span class="grow">${esc(me?.display_name || '')}${partner ? ' y ' + esc(partner.display_name) : ''}</span></div>
    </aside>
    <main class="main" id="main"></main>
    <nav class="tabbar">${TABS.map(([k, l, i]) => `<a href="#/${k}" data-nav="${k}">${icon(i)}<span>${l}</span></a>`).join('')}
      <button id="moreBtn">${icon('grid')}<span>Más</span></button></nav>
  </div>`;
  $('#moreBtn').onclick = () => sheet(`<h2>Más</h2><div class="tiles" style="margin-top:14px">${NAV.filter(([k]) => !TABS.some((t) => t[0] === k))
    .map(([k, l, i]) => `<a class="tile" href="#/${k}" data-close><span class="ic">${icon(i)}</span><b>${l}</b></a>`).join('')}</div>`);
  return $('#main');
}

async function render() {
  const [route, ...params] = parseHash();
  window.__osGen = (window.__osGen || 0) + 1;
  if (cleanup) { try { cleanup(); } catch {} cleanup = null; }
  closeSheet();

  // rutas sin sesión
  if (!S.session) {
    if (route === 'nueva-clave') return mount(await import('./views/auth.js'), app, ['reset']);
    return mount(await import('./views/auth.js'), app, []);
  }
  if (route === 'nueva-clave') return mount(await import('./views/auth.js'), app, ['reset']);
  if (!S.space) return mount(await import('./views/start.js'), app, []);
  if (!onboardingDone()) return mount(await import('./views/onboarding.js'), app, params);

  const loader = routes[route] || routes.inicio;
  const main = shell();
  $$('[data-nav]').forEach((a) => a.classList.toggle('on', a.dataset.nav === (routes[route] ? route : 'inicio')));
  main.innerHTML = '<div class="loading-page"><span class="spin"></span></div>';
  current = route;
  const mod = await loader();
  if (current !== route) return;
  window.scrollTo(0, 0);
  return mount(mod, main, params);
}

async function mount(mod, el, params) {
  if (el === app) app.innerHTML = '';
  try { cleanup = (await mod.default(el, params)) || null; }
  catch (e) {
    console.error(e);
    el.innerHTML = `<div class="page narrow"><div class="card center" style="margin-top:40px"><h2>No se pudo cargar</h2>
      <p class="muted" style="margin:8px 0 18px">${esc(friendlyError(e))}</p><button class="btn" onclick="location.reload()">Reintentar</button></div></div>`;
  }
}

export async function refreshSpace(rerender = true) {
  await loadSpace();
  if (rerender) { app.innerHTML = ''; render(); }
}

function listenSpace() {
  if (unsub) unsub();
  if (!S.space) return;
  let t;
  unsub = db.subscribe(S.space.id, (table) => {
    clearTimeout(t);
    t = setTimeout(async () => {
      if (table === 'os_members' || table === 'os_spaces') { await loadSpace(); }
      window.dispatchEvent(new CustomEvent('os:change', { detail: { table } }));
    }, 400);
  });
}

export async function boot() {
  app.innerHTML = '<div class="loading-page"><span class="spin"></span></div>';
  try {
    S.session = await db.session();
    if (S.session) { await loadSpace(); listenSpace(); }
  } catch (e) { console.error(e); toast(friendlyError(e)); }
  render();
}

db.onAuth(async (ev, session) => {
  if (ev === 'PASSWORD_RECOVERY') { S.session = session; location.hash = '#/nueva-clave'; return; }
  if (ev === 'SIGNED_IN' && !S.session) { S.session = session; await loadSpace(); listenSpace(); app.innerHTML = ''; render(); }
  if (ev === 'SIGNED_OUT') { S.session = null; S.space = null; if (unsub) unsub(); app.innerHTML = ''; render(); }
});
window.addEventListener('hashchange', render);
export const relisten = listenSpace;
if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
boot();
