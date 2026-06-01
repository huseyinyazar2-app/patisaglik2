import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve('src');
const stringLiteralPattern = /'([^'\\]|\\.)*'|"([^"\\]|\\.)*"|`([^`\\]|\\.)*`/g;
const turkishPattern = /[ĞÜŞİÖÇğüşıöç]/;

function walk(dir, files = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else if (entry.isFile() && full.endsWith('.js') && !full.includes(`${path.sep}i18n${path.sep}`)) files.push(full);
  }
  return files;
}

const rows = [];
let total = 0;

for (const file of walk(root)) {
  const content = readFileSync(file, 'utf8');
  const matches = content.match(stringLiteralPattern) || [];
  const count = matches.filter((value) => turkishPattern.test(value)).length;
  if (!count) continue;
  total += count;
  rows.push({ file: path.relative(process.cwd(), file).replaceAll(path.sep, '/'), count });
}

rows.sort((a, b) => b.count - a.count);

console.log(JSON.stringify({ total, files: rows.length, top: rows.slice(0, 30) }, null, 2));
