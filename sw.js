const CACHE = 'subko-hub-v1';
const ASSETS = ['/', '/index.html', '/css/style.css', '/js/config.js', '/js/sheets.js', '/js/app.js', '/js/leave.js', '/manifest.json'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
});

self.addEventListener('fetch', e => {
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
});
