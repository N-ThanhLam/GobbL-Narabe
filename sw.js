/* GobbL-Narabe — Service Worker
   方針: アプリシェルを事前キャッシュし、stale-while-revalidate で配信。
   低速回線でも即表示・オフラインでソロCPU対戦が動く。オンライン対戦は当然ネット必須。 */
const CACHE = 'gobbl-narabe-v3';
const ASSETS = [
  './',
  './gobu-narabe.html',
  './manifest.webmanifest',
  './icon.svg',
  'https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js'
];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(ASSETS.map(u => c.add(u).catch(() => {})))));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  e.respondWith(
    caches.match(req).then(hit => {
      const net = fetch(req).then(res => {
        try {
          if (res && (res.ok || res.type === 'opaque')) {
            const copy = res.clone();
            caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
          }
        } catch (_) {}
        return res;
      }).catch(() => hit);
      return hit || net;     // キャッシュ即返し→裏で更新（無ければネット）
    })
  );
});
