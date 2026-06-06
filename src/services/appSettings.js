const SETTINGS_KEY = 'pati_app_settings';
const API_BASE_URL = import.meta.env?.VITE_API_BASE_URL || '';
const API_FALLBACK = 'https://api.pethelp.app';

const DEFAULT_SETTINGS = {
  mediaQualityCheckEnabled: false,
  aiIgnoreLowQualityMedia: true
};

function readCachedSettings() {
  try {
    return JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
  } catch {
    return {};
  }
}

function writeCachedSettings(value) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...DEFAULT_SETTINGS, ...(value || {}) }));
}

async function fetchSettingsFrom(base) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 1200);
  let response;
  try {
    response = await fetch(`${base}/api/app/settings`, {
      headers: { Accept: 'application/json' },
      signal: controller.signal
    });
  } finally {
    clearTimeout(timeout);
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.ok === false) throw new Error(data.error || `http_${response.status}`);
  return data.data || {};
}

export function getAppSettings() {
  return { ...DEFAULT_SETTINGS, ...readCachedSettings() };
}

export function isMediaQualityCheckEnabled() {
  return Boolean(getAppSettings().mediaQualityCheckEnabled);
}

export async function refreshAppSettings() {
  const bases = API_BASE_URL ? [API_BASE_URL] : ['', API_FALLBACK];
  for (const base of bases) {
    try {
      const settings = await fetchSettingsFrom(base);
      writeCachedSettings(settings);
      return getAppSettings();
    } catch {}
  }
  writeCachedSettings(DEFAULT_SETTINGS);
  return getAppSettings();
}
