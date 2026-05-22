import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'fs';
import { join, dirname, resolve } from 'path';

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    if (['node_modules','.git','scripts'].includes(name)) continue;
    const p = join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) out.push(...walk(p));
    else if (/\.html$/i.test(p) && !/lighthouse|report/i.test(p) && !p.includes('DownloadsZona')) out.push(p);
  }
  return out;
}

// Resolve relative img src to actual file path on disk
function resolveAsset(htmlFile, src) {
  const htmlDir = dirname(htmlFile);
  return resolve(htmlDir, src);
}

function transform(htmlFile) {
  let html = readFileSync(htmlFile, 'utf8');
  const original = html;
  let imgConvCount = 0;
  let bgConvCount = 0;

  // ---- 1. Convert <img src="...jpg|png"> to <picture><source webp><img></picture>
  // Only target images under assets/images/ (skip logos, icons, externals)
  // Need to preserve all attributes on <img>
  const imgRe = /<img\b([^>]*?)\bsrc="((?:\.{0,2}\/)*assets\/images\/[^"]+\.(?:jpe?g|png))"([^>]*?)\/?>/gi;
  html = html.replace(imgRe, (match, pre, src, post) => {
    // Skip logos and favicons (small images that don't benefit much)
    if (/logo|favicon/i.test(src)) return match;
    const webp = src.replace(/\.(jpe?g|png)$/i, '.webp');
    // Verify the webp exists on disk
    const webpAbs = resolveAsset(htmlFile, webp);
    if (!existsSync(webpAbs)) return match;
    imgConvCount++;
    // Build picture
    const imgTag = `<img${pre}src="${src}"${post}>`;
    return `<picture><source srcset="${webp}" type="image/webp">${imgTag}</picture>`;
  });

  // ---- 2. background-image: url('...jpg|png') -> point to .webp if it exists
  // Only inline styles inside hero__slide and similar
  const bgRe = /background-image:\s*url\(\s*['"]?((?:\.{0,2}\/)*assets\/images\/[^'")]+\.(?:jpe?g|png))['"]?\s*\)/gi;
  html = html.replace(bgRe, (match, src) => {
    const webp = src.replace(/\.(jpe?g|png)$/i, '.webp');
    const webpAbs = resolveAsset(htmlFile, webp);
    if (!existsSync(webpAbs)) return match;
    bgConvCount++;
    return match.replace(src, webp);
  });

  if (html !== original) {
    writeFileSync(htmlFile, html);
    return { file: htmlFile, imgs: imgConvCount, bgs: bgConvCount };
  }
  return { file: htmlFile, skipped: true };
}

const files = walk('.');
let totalImgs = 0, totalBgs = 0, changed = 0, skipped = 0;
for (const f of files) {
  const r = transform(f);
  if (r.skipped) { skipped++; continue; }
  changed++;
  totalImgs += r.imgs; totalBgs += r.bgs;
  console.log(`[ok] ${r.file}  (img→picture: ${r.imgs}, bg→webp: ${r.bgs})`);
}
console.log(`\n${changed} files changed, ${skipped} skipped. Total ${totalImgs} <img> converted, ${totalBgs} backgrounds switched to webp.`);
