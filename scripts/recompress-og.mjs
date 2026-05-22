import sharp from 'sharp';
import { statSync, renameSync } from 'fs';

const file = 'assets/images/empresa/empresa.jpg';
const backup = file + '.original';

const before = statSync(file).size;
renameSync(file, backup);

await sharp(backup)
  .resize({ width: 1600, withoutEnlargement: true })
  .jpeg({ quality: 80, progressive: true, mozjpeg: true })
  .toFile(file);

const after = statSync(file).size;
console.log(`${file}: ${(before/1024).toFixed(0)}KB -> ${(after/1024).toFixed(0)}KB (-${((1-after/before)*100).toFixed(1)}%)`);
console.log(`Original backup: ${backup}`);
