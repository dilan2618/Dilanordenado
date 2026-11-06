// Service worker: permite instalar OUR SPACE como app y abrirla rápido.
// Solo guarda en caché los archivos de la app; los datos siempre vienen del servidor.
const CACHE = 'ourspace-v1';
const SHELL = ['./', 'index.html', 'css/app.css', 'icon.svg', 'manifest.webmanifest', 'js/app.js', 'js/db.js', 'js/ui.js', 'js/store.js', 'js/content.js',
  'js/profile.js', 'js/render.js', 'js/config.js', 'js/safety.js', 'js/importnr.js'];

self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return; // datos, fotos y Supabase: siempre en red
  // red primero (para recibir actualizaciones), caché si no hay conexión
  e.respondWith(fetch(e.request).then((r) => { const copy = r.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); return r; })
    .catch(() => caches.match(e.request).then((r) => r || caches.match('index.html'))));
});
