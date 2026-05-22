import sharp from 'sharp';
import { readdirSync, statSync, existsSync, writeFileSync } from 'fs';
import { join, extname, basename, dirname } from 'path';

const ROOT = 'assets/images';
const MIN_BYTES = 10 * 1024;
const WEBP_QUALITY = 78;

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}

const targets = walk(ROOT).filter(p => /\.(jpe?g|png)$/i.test(p));

const results = [];
for (const file of targets) {
  const size = statSync(file).size;
  if (size < MIN_BYTES) continue;
  const webp = file.replace(/\.(jpe?g|png)$/i, '.webp');
  if (existsSync(webp)) {
    const w = statSync(webp).size;
    results.push({ file, jpg: size, webp: w, skipped: 'exists' });
    continue;
  }
  try {
    await sharp(file).webp({ quality: WEBP_QUALITY, effort: 5 }).toFile(webp);
    const w = statSync(webp).size;
    results.push({ file, jpg: size, webp: w });
  } catch (e) {
    results.push({ file, jpg: size, error: e.message });
  }
}

let totalJ = 0, totalW = 0;
for (const r of results) {
  if (r.error) { console.log('ERR', r.file, r.error); continue; }
  totalJ += r.jpg; totalW += r.webp;
  const pct = ((1 - r.webp / r.jpg) * 100).toFixed(1);
  console.log(`${r.skipped ? '[skip]' : '[ok]  '} ${r.file}  ${(r.jpg/1024).toFixed(0)}KB -> ${(r.webp/1024).toFixed(0)}KB (-${pct}%)`);
}
console.log(`\nTOTAL: ${(totalJ/1024/1024).toFixed(2)} MB -> ${(totalW/1024/1024).toFixed(2)} MB`);
