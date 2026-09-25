/* One-off helper: rewrites the Simplified Chinese interface text of this project
   into Traditional Chinese (Taiwan standard). Kept out of the app bundle. */
import { readFileSync, writeFileSync } from 'node:fs';
import * as OpenCC from 'opencc-js';

const convert = OpenCC.Converter({ from: 'cn', to: 'tw' });
const files = process.argv.slice(2);
if (!files.length) throw new Error('usage: node scripts/convert-s2t.mjs <files...>');

for (const file of files) {
  const before = readFileSync(file, 'utf8');
  const after = convert(before);
  if (before === after) {
    console.log(`unchanged  ${file}`);
    continue;
  }
  const changed = before.split('\n').filter((line, i) => line !== after.split('\n')[i]).length;
  writeFileSync(file, after);
  console.log(`converted  ${file}  (${changed} lines)`);
}
