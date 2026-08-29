import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const dest = 'app/game.tsx';
let src = readFileSync(dest, 'utf8');
const dir = 'scripts/campaign-inserts';

function statementEnd(text, start) {
  let j = start;
  let depth = 0;
  let inStr = null;
  while (j < text.length) {
    const c = text[j];
    if (inStr) {
      if (c === '\\') { j += 2; continue; }
      if (c === inStr) inStr = null;
      j++;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') { inStr = c; j++; continue; }
    if (c === '{' || c === '[' || c === '(') depth++;
    else if (c === '}' || c === ']' || c === ')') depth = Math.max(0, depth - 1);
    else if (c === ';' && depth === 0) { j++; break; }
    j++;
  }
  return j;
}

function dedupeTopLevelConsts(text) {
  const seen = new Set();
  let i = 0;
  let out = '';
  while (i < text.length) {
    const lineStart = i === 0 || text[i - 1] === '\n';
    if (lineStart) {
      const slice = text.slice(i);
      const m = slice.match(/^( *)const ([A-Za-z_][A-Za-z0-9_]*)\b/);
      if (m) {
        const name = m[2];
        const end = statementEnd(text, i + m[0].length);
        let next = end;
        if (text[next] === '\n') next++;
        if (seen.has(name)) {
          i = next;
          continue;
        }
        seen.add(name);
        out += text.slice(i, next);
        i = next;
        continue;
      }
    }
    out += text[i];
    i++;
  }
  return out;
}

src = dedupeTopLevelConsts(src);

const fromFiles = readdirSync(dir).filter((name) => name.endsWith('.from')).sort();
if (!fromFiles.length) throw new Error('No campaign insert files found');

for (const name of fromFiles) {
  const fromPath = join(dir, name);
  const toPath = join(dir, name.replace(/\.from$/, '.to'));
  let to;
  try {
    to = readFileSync(toPath, 'utf8');
  } catch {
    console.log('skip missing to', name);
    continue;
  }
  const from = readFileSync(fromPath, 'utf8');
  if (to !== from && src.includes(to)) {
    console.log('already', name);
  } else if (src.includes(from)) {
    src = src.replace(from, to);
    console.log('applied', name);
  } else if (to.length > 24 && src.includes(to.slice(0, Math.min(80, to.length)))) {
    console.log('already-prefix', name);
  } else {
    console.log('skip unmatched', name);
  }
}

src = dedupeTopLevelConsts(src);
writeFileSync(dest, src);
console.log('Patched', dest, src.length);
