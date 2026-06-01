/* =============================================================================
   GobbL-Narabe Service Worker
   - 単一HTML(gobu-narabe.html)が本体。これと付随資産をキャッシュしてオフライン動作。
   - HTML は network-first（オンライン時は最新を取得→更新反映、オフライン時はキャッシュ）。
   - アイコン/マニフェスト/PeerJS は cache-first（不変なので高速・省通信）。
   - 新バージョンは CACHE 名を変えるだけで切り替わる。skipWaiting + clients.claim で即適用。
   ============================================================================= */
const CACHE = 'gobu-narabe-v5';

/* 本体シェル（相対パス＝どの https パス配下でも動く） */
const SHELL = [
  './gobu-narabe.html',
  './manifest.webmanifest',
  './icon.svg',
];
/* 外部CDN（ページ読み込みに必要。オフラインでも解決できるよう保存） */
const EXTERNAL = [
  'https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js',
];

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    // 同一オリジンのシェルは確実に（1つでも失敗するとインストール失敗）
    await cache.addAll(SHELL);
    // 外部CDNは失敗しても致命的でないので個別に try（ソロCPUはCDN無しでも動く）
    await Promise.all(EXTERNAL.map(async (url) => {
      try { const res = await fetch(url, { mode: 'no-cors' }); await cache.put(url, res); } catch (e) {}
    }));
    self.skipWaiting();
  })());
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

/* ページからの即時更新要求 */
self.addEventListener('message', (e) => {
  if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting();
});

async function cachePut(req, res) {
  try { const cache = await caches.open(CACHE); await cache.put(req, res); } catch (e) {}
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;

  let url;
  try { url = new URL(req.url); } catch (e) { return; }

  // PeerJS のシグナリング/ICE は WebSocket/WebRTC で SW を通らない。
  // http(s) の GET だけを扱う（chrome-extension 等は無視）。
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;

  const sameOrigin = url.origin === self.location.origin;
  const isShell = sameOrigin && (req.mode === 'navigate' || url.pathname.endsWith('/gobu-narabe.html') || url.pathname.endsWith('gobu-narabe.html'));

  if (isShell) {
    // network-first: オンラインは最新、オフラインはキャッシュ→最終手段で本体HTML
    e.respondWith((async () => {
      try {
        const res = await fetch(req);
        cachePut(req, res.clone());
        return res;
      } catch (err) {
        const hit = await caches.match(req);
        return hit || (await caches.match('./gobu-narabe.html'));
      }
    })());
    return;
  }

  // それ以外（アイコン/マニフェスト/PeerJS など）: cache-first
  e.respondWith((async () => {
    const hit = await caches.match(req);
    if (hit) return hit;
    try {
      const res = await fetch(req);
      // 同一オリジン or 取得できた外部資産は保存（opaque も保存可）
      cachePut(req, res.clone());
      return res;
    } catch (err) {
      return hit || Response.error();
    }
  })());
});
