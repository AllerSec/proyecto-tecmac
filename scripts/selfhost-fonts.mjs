import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';

const CSS_URL = 'https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@400;500;600&family=Rajdhani:wght@500;600;700&display=swap';
const UA_MODERN = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const FONT_DIR = 'assets/fonts';
mkdirSync(FONT_DIR, { recursive: true });

// 1. Fetch CSS with a modern UA so Google returns woff2 URLs
const cssRes = await fetch(CSS_URL, { headers: { 'User-Agent': UA_MODERN } });
let css = await cssRes.text();

// 2. Find all woff2 URLs in the CSS
const urlRegex = /url\((https:\/\/fonts\.gstatic\.com\/[^)]+\.woff2)\)/g;
const urls = [...new Set([...css.matchAll(urlRegex)].map(m => m[1]))];
console.log(`Found ${urls.length} woff2 URLs`);

// 3. Download each woff2 and rewrite CSS to local path
for (const url of urls) {
  const m = url.match(/\/s\/([^/]+)\/v\d+\/([^/]+)\.woff2/);
  const family = m ? m[1] : 'font';
  const hash = m ? m[2] : url.split('/').pop().replace('.woff2','');
  const localName = `${family}-${hash}.woff2`;
  const localPath = join(FONT_DIR, localName);

  let buf = null;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const r = await fetch(url);
      buf = Buffer.from(await r.arrayBuffer());
      break;
    } catch (e) {
      console.log(`  retry ${attempt}: ${e.message}`);
      await new Promise(r => setTimeout(r, 1000 * attempt));
    }
  }
  if (!buf) { console.log(`  FAILED ${localName}`); continue; }
  writeFileSync(localPath, buf);
  console.log(`  ${localName}  ${(buf.length/1024).toFixed(1)} KB`);

  // Replace URL in CSS with local (relative paths handled per-page later)
  css = css.split(url).join(`{{FONT_BASE}}/${localName}`);
}

// 4. Use font-display: swap and add subset-friendly defaults
css = css.replace(/font-display:\s*swap/g, 'font-display:swap');

writeFileSync(join(FONT_DIR, 'fonts.css'), css);
console.log(`\nFonts CSS written. Files in ${FONT_DIR}/`);
console.log('CSS uses {{FONT_BASE}} placeholder; HTMLs will rewrite to correct relative path.');
