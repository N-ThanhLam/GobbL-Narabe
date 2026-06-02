/* =============================================================================
   GobbL-Narabe Service Worker
   - 単一HTML(GobbL-Narabe.html)が本体。これと付随資産をキャッシュしてオフライン動作。
   - HTML は network-first（オンライン時は最新を取得→更新反映、オフライン時はキャッシュ）。
   - アイコン/マニフェスト/PeerJS は cache-first（不変なので高速・省通信）。
   - 新バージョンは CACHE 名を変えるだけで切り替わる。skipWaiting + clients.claim で即適用。
   ============================================================================= */
const CACHE = 'GobbL-Narabe-v9';   // v9: 本体HTMLの実ファイル名 index.html に統一(GH Pages等のルート配信に合わせる)。旧版(GobbL-Narabe.html/gobu-narabe.html)キャッシュを破棄させるため番号を更新。

/* 本体シェル（相対パス＝どの https パス配下でも動く） */
const SHELL = [
  './index.html',
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
    // 同一オリジンのシェルは確実に（{cache:'reload'} でHTTPキャッシュを無視して必ず最新を取得）
    await Promise.all(SHELL.map(async (url) => {
      const res = await fetch(new Request(url, { cache: 'reload' }));
      await cache.put(url, res);
    }));
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
  const isShell = sameOrigin && (req.mode === 'navigate' || url.pathname.endsWith('/index.html') || url.pathname.endsWith('/'));

  if (isShell) {
    // network-first: オンラインは最新、オフラインはキャッシュ→最終手段で本体HTML
    e.respondWith((async () => {
      try {
        // {cache:'no-cache'}: HTTPキャッシュを検証して必ずサーバーに問い合わせる（古い版を掴まない）
        const res = await fetch(new Request(req, { cache: 'no-cache' }));
        cachePut(req, res.clone());
        return res;
      } catch (err) {
        const hit = await caches.match(req);
        return hit || (await caches.match('./index.html'));
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
