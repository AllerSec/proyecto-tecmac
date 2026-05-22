import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

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

let totalFixes = 0;
for (const f of walk('.')) {
  let html = readFileSync(f, 'utf8');
  const before = html;
  // Pattern: <picture><source...><picture><source srcset="X" type="image/webp"><img...></picture></picture>
  // We want: <picture><source srcset="X" type="image/webp"><img...></picture>
  // Strategy: collapse nested <picture><source...><picture> -> <picture>
  let changed = true;
  while (changed) {
    changed = false;
    const fixed = html.replace(
      /<picture><source[^>]*>(<picture><source[^>]*><img[^>]*><\/picture>)<\/picture>/g,
      '$1'
    );
    if (fixed !== html) { html = fixed; changed = true; }
  }
  if (html !== before) {
    writeFileSync(f, html);
    const count = (before.match(/<picture><source[^>]*><picture>/g) || []).length;
    totalFixes += count;
    console.log(`[fix] ${f}  (${count} nested picture(s))`);
  }
}
console.log(`\nFixed ${totalFixes} nested <picture> wrappers`);
