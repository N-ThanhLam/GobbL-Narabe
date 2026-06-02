/* =============================================================================
   GobbL-Narabe アイコン生成（金ロゴ「ゴブ並べ」）
   - 1つのSVGテンプレートから icon.svg と各PNGを生成。
   - PNGは Chrome ヘッドレスで描画＝Webフォント(Dela Gothic One)を“焼き込む”ので、
     iOS/Android/各ブラウザのアイコン用途（外部フォント非取得）でも文字が出る。
   実行: node build-icons.mjs
   ============================================================================= */
import { writeFileSync, unlinkSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';

const DIR = dirname(fileURLToPath(import.meta.url));
const CHROME = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
].find(existsSync);
if (!CHROME) { console.error('Chrome/Edge が見つかりません'); process.exit(1); }

const FONT = "https://fonts.googleapis.com/css2?family=Dela+Gothic+One&display=swap";
const FAM  = "'Dela Gothic One','Reggae One','Hiragino Sans','Yu Gothic',sans-serif";

/* 2行ぶんの文字レイヤ（色/オフセットだけ差し替えて重ねる） */
function glyphs(dx, dy, fill, opacity = 1, filter = '') {
  const f = filter ? ` filter="${filter}"` : '';
  const o = opacity !== 1 ? ` opacity="${opacity}"` : '';
  return `<g transform="translate(${dx},${dy})" fill="${fill}"${o}${f}>`
    + `<text x="256" y="214">ゴブ</text>`
    + `<text x="256" y="430">並べ</text>`
    + `</g>`;
}

function svg({ maskable = false } = {}) {
  const inner = maskable ? 0.80 : 1;          // maskable はセーフゾーン内に縮小
  const wrapOpen = maskable
    ? `<g transform="translate(256,256) scale(${inner}) translate(-256,-256)">` : '';
  const wrapClose = maskable ? '</g>' : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512" role="img" aria-label="ゴブ並べ">
  <defs>
    <style>@import url('${FONT}');</style>
    <radialGradient id="bg" cx="0.5" cy="0.40" r="0.78">
      <stop offset="0" stop-color="#172245"/><stop offset="0.5" stop-color="#0b1126"/><stop offset="1" stop-color="#05060f"/>
    </radialGradient>
    <linearGradient id="gold" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#fff8d4"/><stop offset="0.17" stop-color="#fce589"/>
      <stop offset="0.40" stop-color="#efc451"/><stop offset="0.60" stop-color="#d69b25"/>
      <stop offset="0.82" stop-color="#a8701a"/><stop offset="1" stop-color="#6c460c"/>
    </linearGradient>
    <linearGradient id="frame" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#f7df8d"/><stop offset="0.5" stop-color="#cda646"/><stop offset="1" stop-color="#946f25"/>
    </linearGradient>
    <linearGradient id="sheen" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.95"/>
      <stop offset="0.30" stop-color="#ffffff" stop-opacity="0.12"/>
      <stop offset="0.46" stop-color="#ffffff" stop-opacity="0"/>
    </linearGradient>
    <radialGradient id="warm" cx="0.5" cy="0.45" r="0.55">
      <stop offset="0" stop-color="#e8b73c" stop-opacity="0.22"/><stop offset="1" stop-color="#e8b73c" stop-opacity="0"/>
    </radialGradient>
    <filter id="glow" x="-25%" y="-25%" width="150%" height="150%">
      <feGaussianBlur stdDeviation="7" result="b"/>
      <feFlood flood-color="#ffc63a" flood-opacity="0.6"/>
      <feComposite in2="b" operator="in" result="g"/>
      <feMerge><feMergeNode in="g"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <pattern id="scan" width="512" height="4" patternUnits="userSpaceOnUse">
      <line x1="0" y1="3.4" x2="512" y2="3.4" stroke="#000" stroke-width="1.1" stroke-opacity="0.07"/>
    </pattern>
  </defs>

  <rect width="512" height="512" fill="url(#bg)"/>
  <rect width="512" height="512" fill="url(#warm)"/>
  <rect width="512" height="512" fill="url(#scan)"/>
${wrapOpen}
  <rect x="14" y="14" width="484" height="484" rx="70" fill="none" stroke="url(#frame)" stroke-width="4" opacity="0.88"/>
  <rect x="25" y="25" width="462" height="462" rx="58" fill="none" stroke="url(#frame)" stroke-width="1.2" opacity="0.32"/>
  <polygon points="256,5 267,16 256,27 245,16"  fill="#e3c25c"/>
  <polygon points="256,507 267,496 256,485 245,496" fill="#e3c25c"/>
  <polygon points="5,256 16,267 27,256 16,245"  fill="#e3c25c"/>
  <polygon points="507,256 496,267 485,256 496,245" fill="#e3c25c"/>

  <rect x="0" y="150" width="512" height="2.4" fill="#19e0ff" opacity="0.06"/>
  <rect x="0" y="360" width="512" height="2"   fill="#ff2d6b" opacity="0.06"/>

  <g font-family="${FAM}" font-size="178" text-anchor="middle" letter-spacing="-12" font-weight="400">
    ${glyphs(-7, -4, '#1ad6ff', 0.5)}
    ${glyphs(9, 5, '#ff2f6c', 0.5)}
    ${glyphs(3, 5, '#140d02', 0.55)}
    ${glyphs(0, 0, 'url(#gold)', 1, 'url(#glow)')}
    ${glyphs(0, 0, 'url(#sheen)', 1)}
  </g>
${wrapClose}
</svg>`;
}

function rasterize(svgStr, size, out) {
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>
    @import url('${FONT}');
    html,body{margin:0;padding:0;background:#05060f}
    #w{width:${size}px;height:${size}px} svg{display:block;width:${size}px;height:${size}px}
  </style></head><body><div id="w">${svgStr}</div></body></html>`;
  const htmlPath = join(DIR, `_tmp_${size}_${out}.html`);
  const outPath = join(DIR, out);
  writeFileSync(htmlPath, html, 'utf8');
  execFileSync(CHROME, [
    '--headless=new', '--disable-gpu', '--hide-scrollbars', '--disable-extensions',
    '--force-device-scale-factor=1', `--window-size=${size},${size}`,
    '--virtual-time-budget=7000', `--screenshot=${outPath}`,
    pathToFileURL(htmlPath).href,
  ], { stdio: 'ignore' });
  unlinkSync(htmlPath);
  console.log('  ✓', out, `(${size}px)`);
}

// 1) ライブ用 SVG（拡大縮小自在・最新ブラウザのfaviconはこれを使う）
writeFileSync(join(DIR, 'icon.svg'), svg(), 'utf8');
console.log('  ✓ icon.svg');

// 2) PNG群（焼き込み・各アイコン用途で確実に表示）
const base = svg();
const mask = svg({ maskable: true });
rasterize(base, 512, 'icon-512.png');
rasterize(base, 192, 'icon-192.png');
rasterize(base, 180, 'apple-touch-icon-180.png');
rasterize(mask, 512, 'icon-maskable-512.png');
console.log('done.');
