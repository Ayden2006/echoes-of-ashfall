import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const dest = 'app/game.tsx';
let src = readFileSync(dest, 'utf8').replace(/\r\n/g, '\n');
const dir = 'scripts/campaign-inserts';
const fromFiles = readdirSync(dir).filter((name) => name.endsWith('.from')).sort();
if (!fromFiles.length) throw new Error('No campaign insert files found');

function flexRe(text) {
  const lines = text.replace(/\r\n/g, '\n').replace(/\n$/, '').split('\n');
  const body = lines.map((line) => {
    const t = line.trim();
    if (!t) return '[ \\t]*';
    return '[ \\t]*' + t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }).join('\\n');
  return new RegExp(body);
}

const failures = [];
for (const name of fromFiles) {
  const from = readFileSync(join(dir, name), 'utf8').replace(/\r\n/g, '\n');
  const toPath = join(dir, name.replace(/\.from$/, '.to'));
  if (!existsSync(toPath)) {
    failures.push(name + ' missing .to');
    console.log('FAILED', name, 'missing .to');
    continue;
  }
  const to = readFileSync(toPath, 'utf8').replace(/\r\n/g, '\n');
  const fromNeedle = from.replace(/\n$/, '');
  const toNeedle = to.replace(/\n$/, '');
  if (src.includes(toNeedle)) {
    console.log('already', name);
  } else if (src.includes(fromNeedle)) {
    src = src.replace(fromNeedle, toNeedle);
    console.log('applied', name);
  } else {
    const re = flexRe(from);
    if (re.test(src)) {
      src = src.replace(re, toNeedle);
      console.log('applied-flex', name);
    } else {
      failures.push(name);
      console.log('FAILED', name, '::', fromNeedle.slice(0, 140));
    }
  }
}

writeFileSync(dest, src);
console.log('Patched', dest, src.length);
if (failures.length) console.log('::warning::Failed inserts: ' + failures.join(', '));
