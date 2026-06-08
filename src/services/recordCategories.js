import { t } from '../i18n/tr.js';

const STORAGE_KEY = 'pati_record_categories';
const OTHER_VALUE = '__other__';

function parseJson(value, fallback = {}) {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function normalize(value) {
  return String(value || '').trim().toLocaleLowerCase('tr-TR');
}

function readCustom() {
  return parseJson(localStorage.getItem(STORAGE_KEY), {});
}

function writeCustom(value) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
}

function defaultsFor(kind) {
  const values = t(`recordCategories.defaults.${kind}`);
  return Array.isArray(values) ? values : [];
}

export function otherCategoryLabel() {
  return t('recordCategories.other');
}

export function otherCategoryValue() {
  return OTHER_VALUE;
}

export function getRecordCategories(kind = 'expense') {
  const custom = readCustom()[kind] || [];
  const merged = [...defaultsFor(kind), ...custom.map((item) => item.label).filter(Boolean)];
  return [...new Map(merged.map((label) => [normalize(label), label])).values()];
}

export function getRecordCategoryOptions(kind = 'expense', { includeOther = true } = {}) {
  const options = getRecordCategories(kind).map((label) => ({ value: label, label, custom: false }));
  if (includeOther) options.push({ value: OTHER_VALUE, label: otherCategoryLabel(), custom: false });
  return options;
}

export function addRecordCategory(kind = 'expense', label) {
  const clean = String(label || '').trim();
  if (!clean || normalize(clean) === normalize(otherCategoryLabel())) return getRecordCategories(kind);
  const current = readCustom();
  const existing = getRecordCategories(kind);
  if (existing.some((item) => normalize(item) === normalize(clean))) return existing;
  const next = {
    ...current,
    [kind]: [...(current[kind] || []), { id: `cat-${Date.now()}`, label: clean }]
  };
  writeCustom(next);
  return getRecordCategories(kind);
}

export function removeRecordCategory(kind = 'expense', label) {
  const current = readCustom();
  const nextItems = (current[kind] || []).filter((item) => normalize(item.label) !== normalize(label));
  writeCustom({ ...current, [kind]: nextItems });
  return getRecordCategories(kind);
}

export function getCustomRecordCategories(kind = 'expense') {
  return readCustom()[kind] || [];
}
