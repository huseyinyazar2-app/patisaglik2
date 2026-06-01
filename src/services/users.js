import { getDbClient } from './dbClient.js';

const LOCAL_USER_KEY = 'pati_user_profile';

function parseJson(value, fallback = {}) {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

export function getLocalUserProfile(base = {}) {
  const local = parseJson(localStorage.getItem(LOCAL_USER_KEY), {});
  return {
    id: base.id || local.id || 'user-1',
    name: base.name || local.name || local.displayName || '',
    email: base.email || local.email || '',
    phone: base.phone || local.phone || '',
    locale: base.locale || local.locale || 'tr',
    timezone: base.timezone || local.timezone || 'Europe/Istanbul',
    location: {
      country: base.location?.country || local.location?.country || 'Türkiye',
      province: base.location?.province || local.location?.province || '',
      district: base.location?.district || local.location?.district || '',
      neighborhood: base.location?.neighborhood || local.location?.neighborhood || ''
    },
    notificationPreference: base.notificationPreference || local.notificationPreference || 'push'
  };
}

export function saveLocalUserProfile(profile) {
  const normalized = getLocalUserProfile(profile);
  localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(normalized));
  return normalized;
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
      normalized.name || 'Kullanıcı',
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
