const CACHE = 'bluedawg-v1';
const ASSETS = ['/', '/index.html', '/css/app.css', '/css/print.css',
  '/src/main.js', '/src/imperial.js', '/src/geometry.js', '/src/draw-tool.js',
  '/src/renderer.js', '/src/layout-engine.js', '/src/boundary-clip.js',
  '/src/material-list.js', '/src/store.js', '/src/home.js', '/src/print.js'];

self.addEventListener('install', e => e.waitUntil(
  caches.open(CACHE).then(c => c.addAll(ASSETS))
));
self.addEventListener('fetch', e => e.respondWith(
  caches.match(e.request).then(r => r || fetch(e.request))
));
