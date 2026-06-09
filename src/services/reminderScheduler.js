import { getState } from '../store.js';
import { getFreeRecords } from './freeRecords.js';
import {
  getNativeNotificationState,
  getNotificationPermissionState,
  getNotificationSettings,
  getReminderNotificationPlan,
  sendImmediateNativeNotification,
  syncNativeReminderPlan
} from './notifications.js';
import { t } from '../i18n/tr.js';

const NOTIFIED_KEY = 'pati_notified_reminders';
const STATUS_KEY = 'pati_reminder_scheduler_status';
let intervalId = null;

function readJson(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
  } catch {
    return fallback;
  }
}

function writeStatus(status) {
  const current = readJson(STATUS_KEY, {});
  const next = {
    ...current,
    ...status,
    updatedAt: new Date().toISOString()
  };
  localStorage.setItem(STATUS_KEY, JSON.stringify(next));
  return next;
}

function inQuietHours(quietHours) {
  const [start, end] = String(quietHours || '').split('-');
  if (!start || !end) return false;

  const toMinutes = (value) => {
    const [hour, minute] = value.split(':').map((part) => Number.parseInt(part, 10));
    if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
    return hour * 60 + minute;
  };

  const startMinutes = toMinutes(start);
  const endMinutes = toMinutes(end);
  if (startMinutes === null || endMinutes === null) return false;

  const now = new Date();
  const current = now.getHours() * 60 + now.getMinutes();
  if (startMinutes < endMinutes) return current >= startMinutes && current < endMinutes;
  return current >= startMinutes || current < endMinutes;
}

async function notifyReminder(reminder, badge = 1) {
  const title = t('notificationService.reminder_title');
  const body = t('notificationService.reminder_due_now', { title: reminder.title || reminder.reminder_type || t('notificationService.reminder_fallback') });
  const nativeSent = await sendImmediateNativeNotification({
    id: `due-${reminder.id}-${reminder.due_at}`,
    title,
    body,
    badge,
    extra: { reminderId: reminder.id, dueAt: reminder.due_at }
  });
  if (nativeSent) return;
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  new Notification(t('notificationService.reminder_title'), {
    body,
    tag: `pati-reminder-${reminder.id}-${reminder.due_at}`,
    data: { reminderId: reminder.id, dueAt: reminder.due_at }
  });
}

export function getReminderSchedulerStatus() {
  return readJson(STATUS_KEY, {
    running: false,
    lastResult: 'not_started',
    sentCount: 0,
    dueCount: 0,
    updatedAt: null
  });
}

export async function checkDueReminders() {
  const settings = getNotificationSettings();
  const permission = getNotificationPermissionState();
  const native = getNativeNotificationState();
  const state = getState();

  if (!settings.reminders) {
    return writeStatus({ running: Boolean(intervalId), lastResult: 'disabled', sentCount: 0, dueCount: 0 });
  }

  if (permission !== 'granted' && !native.available) {
    return writeStatus({ running: Boolean(intervalId), lastResult: 'waiting_permission', sentCount: 0, dueCount: 0 });
  }

  if (inQuietHours(settings.quietHours)) {
    return writeStatus({ running: Boolean(intervalId), lastResult: 'quiet_hours', sentCount: 0, dueCount: 0 });
  }

  if (!state.activePetId) {
    return writeStatus({ running: Boolean(intervalId), lastResult: 'no_active_pet', sentCount: 0, dueCount: 0 });
  }

  const records = await getFreeRecords({ petId: state.activePetId, limit: 50 });
  const now = Date.now();
  const lookbackMs = 24 * 60 * 60 * 1000;
  const due = (records.reminders || []).filter((item) => {
    const dueTime = item.due_at ? new Date(item.due_at).getTime() : 0;
    return item.status === 'scheduled' && dueTime <= now && dueTime >= now - lookbackMs;
  });

  const notified = readJson(NOTIFIED_KEY, {});
  let sentCount = 0;
  for (const item of due) {
    if (notified[item.id] === item.due_at) continue;
    await notifyReminder(item, sentCount + 1);
    notified[item.id] = item.due_at;
    sentCount += 1;
  }
  localStorage.setItem(NOTIFIED_KEY, JSON.stringify(notified));

  return writeStatus({
    running: Boolean(intervalId),
    lastResult: sentCount ? 'sent' : 'checked',
    sentCount,
    dueCount: due.length,
    activePetId: state.activePetId
  });
}

export async function syncUpcomingNativeReminders({ requestPermission = false } = {}) {
  const state = getState();
  if (!state.activePetId) return { ok: false, reason: 'no_active_pet', scheduled: 0 };
  const records = await getFreeRecords({ petId: state.activePetId, limit: 50 });
  return syncNativeReminderPlan(getReminderNotificationPlan(records.reminders), { requestPermission });
}

export function startReminderScheduler({ intervalMs = 60_000 } = {}) {
  if (intervalId) {
    return getReminderSchedulerStatus();
  }

  writeStatus({ running: true, lastResult: 'started', intervalMs });
  checkDueReminders().catch((err) => writeStatus({ running: true, lastResult: 'error', error: err.message }));
  syncUpcomingNativeReminders({ requestPermission: false }).catch(() => {});
  intervalId = window.setInterval(() => {
    checkDueReminders().catch((err) => writeStatus({ running: true, lastResult: 'error', error: err.message }));
    syncUpcomingNativeReminders({ requestPermission: false }).catch(() => {});
  }, intervalMs);

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      checkDueReminders().catch((err) => writeStatus({ running: true, lastResult: 'error', error: err.message }));
      syncUpcomingNativeReminders({ requestPermission: false }).catch(() => {});
    }
  });

  return getReminderSchedulerStatus();
}
