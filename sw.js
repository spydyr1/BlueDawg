const CACHE = 'bluedawg-v2';
const ASSETS = ['/', '/index.html', '/css/app.css', '/css/print.css',
  '/src/main.js', '/src/imperial.js', '/src/geometry.js', '/src/draw-tool.js',
  '/src/renderer.js', '/src/layout-engine.js', '/src/boundary-clip.js',
  '/src/material-list.js', '/src/store.js', '/src/home.js', '/src/print.js',
  '/manifest.json', '/icons/icon-192.png', '/icons/icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => e.respondWith(
  caches.match(e.request).then(r => r || fetch(e.request))
));
