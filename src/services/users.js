import { getDbClient } from './dbClient.js';
import { translateForLocale } from '../i18n/tr.js';

const LOCAL_USER_KEY = 'pati_user_profile';
const LOCAL_HEALTH_KEYS = [
  'pati_pets',
  'pati_active_pet',
  'pati_followups',
  'pati_form_submissions',
  'pati_public_cards',
  'pati_measurements',
  'pati_product_safety_checks',
  'pati_vet_ready_reports',
  'pati_feature_usage',
  'pati_credit_wallets',
  'pati_local_plan_code',
  'pati_notification_settings',
  'pati_reminder_scheduler_status',
  'pati_notified_reminders',
  'pati_native_notification_ids',
  'pati_sitter_invite_acceptance'
];

function parseJson(value, fallback = {}) {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function cleanIdentity(value) {
  return String(value || '').trim().toLowerCase();
}

function identityChanged(previous, incoming, key) {
  const before = cleanIdentity(previous?.[key]);
  const after = cleanIdentity(incoming?.[key]);
  return before && after && before !== after;
}

function hasLocalHealthData() {
  return LOCAL_HEALTH_KEYS.some((key) => {
    const value = localStorage.getItem(key);
    return value && value !== '[]' && value !== '{}';
  });
}

function shouldResetLocalHealthData(previous, incoming) {
  const incomingHasIdentity = cleanIdentity(incoming.phone) || cleanIdentity(incoming.email) || cleanIdentity(incoming.id).replace(/^user-1$/, '');
  if (!previous || !Object.keys(previous).length) return Boolean(incomingHasIdentity) && hasLocalHealthData();
  if (
    identityChanged(previous, incoming, 'id') ||
    identityChanged(previous, incoming, 'phone') ||
    identityChanged(previous, incoming, 'email')
  ) {
    return true;
  }

  const previousHasIdentity = cleanIdentity(previous.phone) || cleanIdentity(previous.email) || cleanIdentity(previous.id).replace(/^user-1$/, '');
  return !previousHasIdentity && Boolean(incomingHasIdentity) && hasLocalHealthData();
}

function clearLocalHealthData() {
  LOCAL_HEALTH_KEYS.forEach((key) => localStorage.removeItem(key));
}

export function getLocalUserProfile(base = {}) {
  const local = parseJson(localStorage.getItem(LOCAL_USER_KEY), {});
  return {
    id: base.id || local.id || 'user-1',
    name: base.name || local.name || local.displayName || '',
    email: base.email || local.email || '',
    phone: base.phone || local.phone || '',
    accountRole: base.accountRole || local.accountRole || 'owner',
    vetProfileId: base.vetProfileId || local.vetProfileId || null,
    locale: base.locale || local.locale || 'tr',
    timezone: base.timezone || local.timezone || 'Europe/Istanbul',
    location: {
      country: base.location?.country || local.location?.country || translateForLocale('tr', 'userDefaults.country'),
      province: base.location?.province || local.location?.province || '',
      district: base.location?.district || local.location?.district || '',
      neighborhood: base.location?.neighborhood || local.location?.neighborhood || ''
    },
    notificationPreference: base.notificationPreference || local.notificationPreference || 'push'
  };
}

export function saveLocalUserProfile(profile) {
  const previous = parseJson(localStorage.getItem(LOCAL_USER_KEY), {});
  const localDataReset = shouldResetLocalHealthData(previous, profile || {});
  if (localDataReset) clearLocalHealthData();
  const normalized = getLocalUserProfile(profile);
  localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(normalized));
  return { ...normalized, localDataReset };
}

export async function saveUserProfile({ userId = 'user-1', profile }) {
  const normalized = saveLocalUserProfile({ ...profile, id: userId });
  const db = getDbClient();
  if (!db) return { ok: true, storage: 'local-fallback', profile: normalized };

  const metadata = {
    location: normalized.location,
    notificationPreference: normalized.notificationPreference
  };

  await db.execute({
    sql: `UPDATE users
          SET display_name = ?, email = ?, phone = ?, locale = ?, timezone = ?, metadata = ?, updated_at = ?
          WHERE id = ?`,
    args: [
      normalized.name || translateForLocale(normalized.locale || 'tr', 'userDefaults.name'),
      normalized.email || null,
      normalized.phone || null,
      normalized.locale || 'tr',
      normalized.timezone || 'Europe/Istanbul',
      JSON.stringify(metadata),
      new Date().toISOString(),
      userId
    ]
  });

  return { ok: true, storage: 'turso', profile: normalized };
}
