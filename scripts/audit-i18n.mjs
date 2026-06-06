import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import tr, { supportedLocales } from '../src/i18n/tr.js';
import en from '../src/i18n/en.js';

const root = path.resolve('src');
const stringLiteralPattern = /'([^'\\]|\\.)*'|"([^"\\]|\\.)*"|`([^`\\]|\\.)*`/g;
const turkishPattern = /[ĞÜŞİÖÇğüşıöç]/;
const hardcodedTurkishExemptions = new Set([
  'src/screens/web/Admin.js'
]);

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
  const relativeFile = path.relative(process.cwd(), file).replaceAll(path.sep, '/');
  if (hardcodedTurkishExemptions.has(relativeFile)) continue;
  const content = readFileSync(file, 'utf8');
  const matches = content.match(stringLiteralPattern) || [];
  const count = matches.filter((value) => turkishPattern.test(value)).length;
  if (!count) continue;
  total += count;
  rows.push({ file: relativeFile, count });
}

rows.sort((a, b) => b.count - a.count);

function flattenKeys(object, prefix = '') {
  const keys = [];
  for (const [key, value] of Object.entries(object || {})) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (Array.isArray(value)) keys.push(fullKey);
    else if (value && typeof value === 'object') keys.push(...flattenKeys(value, fullKey));
    else keys.push(fullKey);
  }
  return keys;
}

const trKeys = new Set(flattenKeys(tr));
const enKeys = new Set(flattenKeys(en));
const missingInEn = [...trKeys].filter((key) => !enKeys.has(key)).sort();
const extraInEn = [...enKeys].filter((key) => !trKeys.has(key)).sort();

console.log(JSON.stringify({
  supportedLocales: supportedLocales.length,
  translatedLocales: ['tr', 'en'],
  dictionaryKeys: {
    tr: trKeys.size,
    en: enKeys.size,
    missingInEn,
    extraInEn
  },
  hardcodedTurkish: {
    total,
    files: rows.length,
    exempt: [...hardcodedTurkishExemptions],
    top: rows.slice(0, 30)
  }
}, null, 2));
