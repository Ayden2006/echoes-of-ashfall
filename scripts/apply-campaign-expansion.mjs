import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const dest = 'app/game.tsx';
let src = readFileSync(dest, 'utf8');
const dir = 'scripts/campaign-inserts';
const fromFiles = readdirSync(dir).filter((name) => name.endsWith('.from')).sort();
if (!fromFiles.length) throw new Error('No campaign insert files found');

for (const name of fromFiles) {
  const from = readFileSync(join(dir, name), 'utf8');
  const to = readFileSync(join(dir, name.replace(/\.from$/, '.to')), 'utf8');
  if (src.includes(to)) {
    console.log('already', name);
  } else if (src.includes(from)) {
    src = src.replace(from, to);
    console.log('applied', name);
  } else {
    throw new Error('Failed insert ' + name + ' :: ' + from.slice(0, 140));
  }
}

writeFileSync(dest, src);
console.log('Patched', dest, src.length);
