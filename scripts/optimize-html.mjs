import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, dirname, relative } from 'path';

const FONTS_HREF = 'https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@400;500;600&family=Rajdhani:wght@500;600;700&display=swap';

const CRITICAL_CSS = `*,*::before,*::after{margin:0;padding:0;box-sizing:border-box}
html{scroll-behavior:smooth;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;overflow-x:hidden}
body{font-family:'Inter',system-ui,-apple-system,sans-serif;font-size:16px;line-height:1.7;color:#e2e8f0;background:#060a13;overflow-x:hidden;min-height:100vh;margin:0}
.page-loader{position:fixed;inset:0;z-index:10000;background:#060a13;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:24px}
.page-loader__logo{width:80px;height:auto}
.page-loader__bar{width:120px;height:2px;background:rgba(255,255,255,0.06);border-radius:2px;overflow:hidden}
.page-loader__bar-inner{height:100%;width:0%;background:#e63946;border-radius:2px}
.skip-to-content{position:absolute;left:-9999px;top:auto;width:1px;height:1px;overflow:hidden}`;

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === '.git' || name === 'scripts') continue;
    const p = join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) out.push(...walk(p));
    else if (/\.html$/i.test(p) && !/lighthouse|report/i.test(p) && !p.includes('DownloadsZona')) out.push(p);
  }
  return out;
}

function detectAssetsPrefix(html) {
  // sniff existing references to determine prefix (./assets vs ../assets)
  const m = html.match(/href="(\.{0,2}\/?)assets\/css\/styles\.css"/);
  if (m) return m[1];
  return 'assets/';
}

function optimize(file) {
  let html = readFileSync(file, 'utf8');
  if (html.includes('TECMAC_OPTIMIZED_V1')) {
    return { file, skipped: 'already-optimized' };
  }

  const prefixMatch = html.match(/(href|src)="((?:\.{1,2}\/)*)assets\/css\/styles\.css"/);
  if (!prefixMatch) return { file, skipped: 'no-styles-link' };
  const prefix = prefixMatch[2]; // '' or '../'

  // Detect existing GSAP scripts (some pages may not have them)
  const hasGsap = /assets\/js\/gsap\.min\.js/.test(html);
  const hasMainJs = /assets\/js\/main\.js/.test(html);

  // Detect if this is an index page with hero slider for image preload
  const heroMatch = html.match(/hero__slide active"[^>]*background-image:\s*url\('([^']+)'/);
  const heroImg = heroMatch ? heroMatch[1] : null;
  const heroWebp = heroImg ? heroImg.replace(/\.(jpe?g|png)$/i, '.webp') : null;

  // Build new head additions
  const preloadHero = heroWebp
    ? `  <link rel="preload" as="image" href="${heroWebp}" type="image/webp" fetchpriority="high">\n`
    : '';

  const newHeadBlock =
    `  <!-- TECMAC_OPTIMIZED_V1 -->\n` +
    preloadHero +
    `  <link rel="preload" as="style" href="${FONTS_HREF}" onload="this.onload=null;this.rel='stylesheet'">\n` +
    `  <noscript><link rel="stylesheet" href="${FONTS_HREF}"></noscript>\n` +
    `  <link rel="preload" as="style" href="${prefix}assets/css/styles.css" onload="this.onload=null;this.rel='stylesheet'">\n` +
    `  <noscript><link rel="stylesheet" href="${prefix}assets/css/styles.css"></noscript>\n` +
    `  <style>${CRITICAL_CSS}</style>\n`;

  // Remove the original fonts <link>, styles.css <link>
  html = html.replace(
    /\s*<link[^>]+fonts\.googleapis\.com\/css2[^>]+rel="stylesheet"[^>]*>\n?/,
    '\n'
  );
  html = html.replace(
    /\s*<link\s+rel="stylesheet"\s+href="(?:\.{0,2}\/)*assets\/css\/styles\.css"\s*\/?>\n?/,
    '\n'
  );

  // Insert the new block right before </head>, but also right before the </head> location—better: before existing first <script>
  // Insert immediately before the first <script> tag in <head>, or before </head>
  const headEnd = html.indexOf('</head>');
  if (headEnd === -1) return { file, error: 'no </head>' };

  // Find a good anchor: insert before <script src="...gsap..."> if exists, else before </head>
  let insertPos = headEnd;
  const gsapIdx = html.search(/\s*<script\s+src="(?:\.{0,2}\/)*assets\/js\/gsap\.min\.js"/);
  if (gsapIdx !== -1 && gsapIdx < headEnd) insertPos = gsapIdx;

  html = html.slice(0, insertPos) + '\n' + newHeadBlock + html.slice(insertPos);

  // Remove duplicated main.js from body and re-add as defer in head if not already
  // Check if main.js is already in head with defer
  const mainJsInHeadDefer = /<script\s+src="(?:\.{0,2}\/)*assets\/js\/main\.js"\s+defer/.test(html.slice(0, html.indexOf('</head>') + 7));
  if (hasMainJs && !mainJsInHeadDefer) {
    // Remove from body
    html = html.replace(/\s*<script\s+src="((?:\.{0,2}\/)*)assets\/js\/main\.js"><\/script>\s*/g, '\n');
    // Add to head before </head>
    html = html.replace('</head>', `  <script src="${prefix}assets/js/main.js" defer></script>\n</head>`);
  }

  writeFileSync(file, html);
  return { file, applied: true, heroPreloaded: !!heroWebp };
}

const files = walk('.');
const out = [];
for (const f of files) {
  try { out.push(optimize(f)); }
  catch (e) { out.push({ file: f, error: e.message }); }
}

let ok=0, skipped=0, err=0;
for (const r of out) {
  if (r.applied) { ok++; console.log(`[ok]  ${r.file}${r.heroPreloaded?' (+hero preload)':''}`); }
  else if (r.skipped) { skipped++; console.log(`[skip] ${r.file} (${r.skipped})`); }
  else if (r.error) { err++; console.log(`[ERR] ${r.file}: ${r.error}`); }
}
console.log(`\n${ok} optimized, ${skipped} skipped, ${err} errors`);
