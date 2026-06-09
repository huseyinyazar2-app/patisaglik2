import { t } from '../i18n/tr.js';

const SETTINGS_KEY = 'pati_notification_settings';
const NATIVE_IDS_KEY = 'pati_native_notification_ids';

function nativeLocalNotifications() {
  return window.Capacitor?.Plugins?.LocalNotifications || window.Capacitor?.LocalNotifications || null;
}

function nativePlatform() {
  return window.Capacitor?.getPlatform?.() || window.Capacitor?.platform || 'web';
}

function notificationId(value) {
  const raw = String(value || 'pati');
  let hash = 0;
  for (let index = 0; index < raw.length; index += 1) {
    hash = ((hash << 5) - hash) + raw.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash % 2_000_000_000) + 10_000;
}

function readNativeIds() {
  try {
    return JSON.parse(localStorage.getItem(NATIVE_IDS_KEY) || '[]');
  } catch {
    return [];
  }
}

export function getNotificationPermissionState() {
  if (!('Notification' in window)) return 'unsupported';
  return Notification.permission || 'default';
}

export function getNotificationSettings() {
  return {
    reminders: true,
    dailySummary: false,
    quietHours: '22:00-08:00',
    ...JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}')
  };
}

export function saveNotificationSettings(settings) {
  const next = { ...getNotificationSettings(), ...settings };
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
  return next;
}

export async function requestNotificationPermission() {
  if (nativeLocalNotifications()) return requestNativeNotificationPermission();
  if (!('Notification' in window)) return 'unsupported';
  if (Notification.permission === 'granted') return 'granted';
  return Notification.requestPermission();
}

export function getNativeNotificationState() {
  return {
    available: Boolean(nativeLocalNotifications()),
    platform: nativePlatform()
  };
}

async function getNativePermission({ request = false } = {}) {
  const plugin = nativeLocalNotifications();
  if (!plugin) return 'unsupported';
  const result = request ? await plugin.requestPermissions?.() : await plugin.checkPermissions?.();
  return result?.display || result?.receive || 'granted';
}

export async function requestNativeNotificationPermission() {
  return getNativePermission({ request: true });
}

export function sendTestNotification() {
  if (!('Notification' in window) || Notification.permission !== 'granted') return false;
  new Notification(t('app.name'), {
    body: t('notificationService.test_body'),
    tag: 'pati-test-notification'
  });
  return true;
}

export async function syncNativeReminderPlan(plan = [], { requestPermission = true } = {}) {
  const plugin = nativeLocalNotifications();
  if (!plugin) return { ok: false, reason: 'unsupported', scheduled: 0 };

  const permission = await getNativePermission({ request: requestPermission });
  if (!['granted', 'prompt-with-rationale'].includes(permission)) {
    return { ok: false, reason: 'permission', permission, scheduled: 0 };
  }

  const previousIds = readNativeIds();
  if (previousIds.length && plugin.cancel) {
    await plugin.cancel({ notifications: previousIds.map((id) => ({ id })) });
  }

  const now = Date.now();
  const notifications = plan
    .filter((item) => item.dueAt && new Date(item.dueAt).getTime() > now)
    .slice(0, 16)
    .map((item, index) => ({
      id: notificationId(`${item.id}-${item.dueAt}`),
      title: t('notificationService.reminder_title'),
      body: t('notificationService.reminder_due_soon', { title: item.title || item.type || t('notificationService.reminder_fallback') }),
      schedule: { at: new Date(item.dueAt) },
      badge: index + 1,
      extra: { reminderId: item.id, dueAt: item.dueAt, type: item.type }
    }));

  if (!notifications.length) {
    localStorage.setItem(NATIVE_IDS_KEY, '[]');
    return { ok: true, reason: 'empty', scheduled: 0 };
  }

  await plugin.schedule({ notifications });
  localStorage.setItem(NATIVE_IDS_KEY, JSON.stringify(notifications.map((item) => item.id)));
  return { ok: true, reason: 'scheduled', scheduled: notifications.length };
}

export async function sendImmediateNativeNotification({ id, title, body, extra = {}, badge = 1 }) {
  const plugin = nativeLocalNotifications();
  if (!plugin) return false;
  const permission = await getNativePermission({ request: false });
  if (!['granted', 'prompt-with-rationale'].includes(permission)) return false;
  await plugin.schedule({
    notifications: [{
      id: notificationId(`${id}-${Date.now()}`),
      title,
      body,
      schedule: { at: new Date(Date.now() + 1000) },
      badge,
      extra
    }]
  });
  return true;
}

export function getReminderNotificationPlan(reminders = []) {
  const now = new Date();
  return reminders
    .filter((item) => item.status === 'scheduled' && item.due_at && new Date(item.due_at) >= now)
    .sort((a, b) => new Date(a.due_at) - new Date(b.due_at))
    .slice(0, 8)
    .map((item) => ({
      id: item.id,
      title: item.title || item.reminder_type || t('notificationService.reminder_fallback'),
      type: item.reminder_type || 'Genel',
      dueAt: item.due_at,
      repeatRule: item.repeat_rule || 'Tek sefer'
    }));
}
