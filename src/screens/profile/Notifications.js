import { goBack } from '../../router.js';
import { getState } from '../../store.js';
import { t } from '../../i18n/tr.js';
import { getFreeRecords } from '../../services/freeRecords.js';
import {
  getNotificationPermissionState,
  getNotificationSettings,
  getNativeNotificationState,
  getReminderNotificationPlan,
  requestNotificationPermission,
  saveNotificationSettings,
  sendTestNotification,
  syncNativeReminderPlan
} from '../../services/notifications.js';
import { showToast } from '../../ui/toast.js';
import { checkDueReminders, getReminderSchedulerStatus } from '../../services/reminderScheduler.js';

function formatDate(date) {
  if (!date) return 'Tarih yok';
  return new Intl.DateTimeFormat('tr-TR', {
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(date));
}

function permissionLabel(permission) {
  if (permission === 'granted') return t('notifications.permission_granted');
  if (permission === 'denied') return t('notifications.permission_denied');
  if (permission === 'unsupported') return t('notifications.permission_unsupported');
  return t('notifications.permission_default');
}

function schedulerLabel(result) {
  const labels = {
    started: t('notifications.scheduler_started'),
    checked: t('notifications.scheduler_checked'),
    sent: t('notifications.scheduler_sent'),
    disabled: t('notifications.scheduler_disabled'),
    waiting_permission: t('notifications.scheduler_waiting_permission'),
    quiet_hours: t('notifications.scheduler_quiet_hours'),
    no_active_pet: t('notifications.scheduler_no_active_pet'),
    not_started: t('notifications.scheduler_not_started'),
    error: t('notifications.scheduler_error')
  };
  return labels[result] || result || t('notifications.scheduler_not_started');
}

function renderSchedulerStatus(status = getReminderSchedulerStatus()) {
  return `
    <div class="profile-plan-card">
      <div>
        <strong>${t('notifications.scheduler_title')}</strong>
        <p>${t('notifications.scheduler_desc')}</p>
        <p class="text-xs text-tertiary mt-1">${t('notifications.last_check')}: ${status.updatedAt ? formatDate(status.updatedAt) : '-'}</p>
      </div>
      <span class="plan-pill">${schedulerLabel(status.lastResult)}</span>
    </div>
  `;
}

function renderNativeStatus(result = null) {
  const native = getNativeNotificationState();
  const label = native.available ? t('notifications.native_available') : t('notifications.native_unavailable');
  const detail = result
    ? `${t('notifications.native_last_result')}: ${result.scheduled || 0}`
    : t('notifications.native_desc');

  return `
    <div class="profile-plan-card">
      <div>
        <strong>${t('notifications.native_title')}</strong>
        <p>${detail}</p>
        <p class="text-xs text-tertiary mt-1">${t('notifications.native_platform')}: ${native.platform}</p>
      </div>
      <span class="plan-pill">${label}</span>
    </div>
  `;
}

function renderPlan(plan = null) {
  if (!plan) {
    return `
      <div class="free-record-panel">
        <p>${t('notifications.loading_plan')}</p>
      </div>
    `;
  }

  if (!plan.length) {
    return `
      <div class="empty-state">
        <div class="modern-empty-icon">${window.__icons?.bell}</div>
        <div class="empty-state-title">${t('notifications.empty_title')}</div>
        <div class="empty-state-desc">${t('notifications.empty_desc')}</div>
      </div>
    `;
  }

  return `
    <div class="feature-menu-list">
      ${plan.map((item) => `
        <div class="feature-menu-card">
          <div class="premium-icon-box">${window.__icons?.calendar}</div>
          <div>
            <strong>${item.title}</strong>
            <p>${formatDate(item.dueAt)} · ${item.type} · ${item.repeatRule}</p>
          </div>
          <span>${t('notifications.planned')}</span>
        </div>
      `).join('')}
    </div>
  `;
}

export function render() {
  const state = getState();
  const permission = getNotificationPermissionState();
  const settings = getNotificationSettings();

  return `
    <div class="screen premium-check">
      <div class="header premium-soft-header">
        <div class="header-left">
          <button class="header-back" id="btnBack">${window.__icons?.back}</button>
        </div>
        <div class="header-title">${t('notifications.title')}</div>
        <div class="header-right">
          <span class="premium-header-shield">${window.__icons?.bell}</span>
        </div>
      </div>

      <div class="section pt-4">
        <div class="profile-plan-card">
          <div>
            <strong>${t('notifications.reminder_title')}</strong>
            <p>${t('notifications.reminder_desc')}</p>
          </div>
          <span class="plan-pill" id="permissionPill">${permissionLabel(permission)}</span>
        </div>
      </div>

      <div class="section pt-0">
        <div class="feature-form-card">
          <label class="feature-field">
            <span>${t('notifications.reminders_toggle')}</span>
            <div class="feature-check-grid">
              <label>
                <input type="checkbox" id="toggleReminders" ${settings.reminders ? 'checked' : ''} />
                <b>${t('notifications.active')}</b>
              </label>
            </div>
          </label>

          <label class="feature-field">
            <span>${t('notifications.daily_summary')}</span>
            <div class="feature-check-grid">
              <label>
                <input type="checkbox" id="toggleDailySummary" ${settings.dailySummary ? 'checked' : ''} />
                <b>${t('notifications.evening_summary')}</b>
              </label>
            </div>
          </label>

          <label class="feature-field">
            <span>${t('notifications.quiet_hours')}</span>
            <input type="text" id="quietHours" value="${settings.quietHours}" placeholder="22:00-08:00" />
          </label>
        </div>

        <div class="feature-bottom-actions">
          <button class="btn btn-primary btn-full" id="btnPermission">${t('notifications.permission_button')}</button>
          <button class="btn btn-outline btn-full" id="btnTestNotification">${t('notifications.test_button')}</button>
          <button class="btn btn-outline btn-full" id="btnCheckNow">${t('notifications.check_now')}</button>
          <button class="btn btn-outline btn-full" id="btnSyncNative">${t('notifications.native_sync_button')}</button>
        </div>
      </div>

      <div class="section pt-0" id="schedulerStatus">
        ${renderSchedulerStatus()}
      </div>

      <div class="section pt-0" id="nativeStatus">
        ${renderNativeStatus()}
      </div>

      <div class="section pt-0 pb-24">
        <h3 class="section-title mb-3">${t('notifications.plan_title')}</h3>
        <div id="notificationPlan">${renderPlan()}</div>
      </div>

      <div class="version-badge">${state.version}</div>
    </div>
  `;
}

export function afterRender() {
  const state = getState();
  document.getElementById('btnBack')?.addEventListener('click', () => goBack());

  function persistSettings() {
    saveNotificationSettings({
      reminders: document.getElementById('toggleReminders')?.checked ?? true,
      dailySummary: document.getElementById('toggleDailySummary')?.checked ?? false,
      quietHours: document.getElementById('quietHours')?.value || '22:00-08:00'
    });
  }

  document.getElementById('toggleReminders')?.addEventListener('change', persistSettings);
  document.getElementById('toggleDailySummary')?.addEventListener('change', persistSettings);
  document.getElementById('quietHours')?.addEventListener('change', persistSettings);

  document.getElementById('btnPermission')?.addEventListener('click', async () => {
    const permission = await requestNotificationPermission();
    const pill = document.getElementById('permissionPill');
    if (pill) pill.textContent = permissionLabel(permission);
    const status = await checkDueReminders();
    const scheduler = document.getElementById('schedulerStatus');
    if (scheduler) scheduler.innerHTML = renderSchedulerStatus(status);
  });

  document.getElementById('btnTestNotification')?.addEventListener('click', () => {
    if (!sendTestNotification()) {
      showToast(t('notifications.test_permission_required'));
    }
  });

  document.getElementById('btnCheckNow')?.addEventListener('click', async () => {
    const status = await checkDueReminders();
    const scheduler = document.getElementById('schedulerStatus');
    if (scheduler) scheduler.innerHTML = renderSchedulerStatus(status);
  });

  document.getElementById('btnSyncNative')?.addEventListener('click', async () => {
    const records = await getFreeRecords({ petId: state.activePetId, limit: 50 });
    const result = await syncNativeReminderPlan(getReminderNotificationPlan(records.reminders));
    const native = document.getElementById('nativeStatus');
    if (native) native.innerHTML = renderNativeStatus(result);
    if (!result.ok) showToast(t('notifications.native_unsupported'));
  });

  getFreeRecords({ petId: state.activePetId, limit: 50 }).then((records) => {
    const target = document.getElementById('notificationPlan');
    if (target) target.innerHTML = renderPlan(getReminderNotificationPlan(records.reminders));
  }).catch(() => {});
}
