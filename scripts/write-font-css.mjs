import { readFileSync, writeFileSync } from 'fs';

const template = readFileSync('assets/fonts/fonts.css', 'utf8');

// Two variants: paths relative to root (used by root index.html) and paths relative to subfolder (es/, eu/, ...)
const rootCss = template.replace(/\{\{FONT_BASE\}\}/g, '/assets/fonts');
writeFileSync('assets/fonts/fonts.css', rootCss);

console.log('fonts.css written with absolute /assets/fonts paths (works from any page on the site)');
