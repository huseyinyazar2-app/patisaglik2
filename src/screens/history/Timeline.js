import { navigate, goBack } from '../../router.js';
import { getState } from '../../store.js';
import { getLocale, t } from '../../i18n/tr.js';
import { getFreeRecords } from '../../services/freeRecords.js';
import { getMeasurements } from '../../services/measurements.js';
import { getClinicExportDocuments } from '../../services/documents.js';

const FILTER_TABS = [
  { id: 'all', labelKey: 'history.timeline_filters.all' },
  { id: 'health', labelKey: 'history.timeline_filters.health' },
  { id: 'measurements', labelKey: 'history.timeline_filters.measurements' },
  { id: 'reminders', labelKey: 'history.timeline_filters.reminders' },
  { id: 'expenses', labelKey: 'history.timeline_filters.expenses' },
  { id: 'reports', labelKey: 'history.timeline_filters.reports' }
];

function formatDate(date) {
  if (!date) return t('history.no_date');
  return new Intl.DateTimeFormat(getLocale() === 'tr' ? 'tr-TR' : getLocale(), { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(date));
}

function formatTime(date) {
  if (!date) return '';
  return new Intl.DateTimeFormat(getLocale() === 'tr' ? 'tr-TR' : getLocale(), { hour: '2-digit', minute: '2-digit' }).format(new Date(date));
}

function formatMoney(amountCents, currency = 'TRY') {
  return new Intl.NumberFormat(getLocale() === 'tr' ? 'tr-TR' : getLocale(), {
    style: 'currency',
    currency,
    maximumFractionDigits: 0
  }).format((amountCents || 0) / 100);
}

function measurementLabel(type) {
  return t(`reports.detail.measurements.${type}`) || type || t('reports.detail.measurements.default');
}

function healthTypeLabel(type) {
  return t(`reports.detail.health_types.${type}`) || t('reports.detail.health_types.default');
}

function buildTimelineItems(records, measurements, documents) {
  return [
    ...(records.healthRecords || []).map((item) => ({
      type: 'health',
      id: item.id,
      route: `/history/records/health/${item.id}`,
      date: item.occurred_at || item.created_at,
      icon: 'heartPulse',
      title: item.title || healthTypeLabel(item.record_type),
      meta: healthTypeLabel(item.record_type),
      summary: item.summary || ''
    })),
    ...(records.reminders || []).map((item) => ({
      type: 'reminders',
      id: item.id,
      route: `/history/records/reminders/${item.id}`,
      date: item.due_at || item.created_at,
      icon: 'calendar',
      title: item.title || item.reminder_type || t('history.timeline_reminder'),
      meta: item.status === 'completed' ? t('freeRecords.common.completed') : t('freeRecords.common.scheduled'),
      summary: item.note || item.reminder_type || ''
    })),
    ...(records.expenses || []).map((item) => ({
      type: 'expenses',
      id: item.id,
      route: `/history/records/expenses/${item.id}`,
      date: item.spent_at || item.created_at,
      icon: 'briefcase',
      title: item.title || item.category || t('history.expense'),
      meta: formatMoney(item.amount_cents, item.currency),
      summary: item.note || item.category || ''
    })),
    ...(measurements || []).map((item) => ({
      type: 'measurements',
      id: item.id,
      route: `/history/measurements?type=${encodeURIComponent(item.measurement_type || '')}`,
      date: item.measured_at || item.created_at,
      icon: item.measurement_type === 'weight' ? 'weight' : item.measurement_type === 'temperature' ? 'thermometer' : 'measurement',
      title: `${measurementLabel(item.measurement_type)}: ${item.value} ${item.unit || ''}`.trim(),
      meta: t('reports.detail.measurements.default'),
      summary: item.note || ''
    })),
    ...(documents || []).map((item) => ({
      type: 'reports',
      id: item.id,
      route: `/reports/${item.id}`,
      date: item.created_at,
      icon: 'reports',
      title: item.title || t('history.timeline_clinic_file'),
      meta: item.status === 'draft' ? t('reports.detail.draft') : t('reports.detail.ready'),
      summary: item.note || t('history.timeline_report_preparing').replace('{purpose}', item.purpose || t('reports.detail.clinic'))
    }))
  ].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
}

function renderTabs(activeFilter) {
  return `
    <div class="filter-tabs">
      ${FILTER_TABS.map((tab) => `
        <button class="filter-tab ${activeFilter === tab.id ? 'active' : ''}" data-filter="${tab.id}">
          ${t(tab.labelKey)}
        </button>
      `).join('')}
    </div>
  `;
}

function renderTimeline(items = null, activeFilter = 'all') {
  if (!items) {
    return `
      <div class="free-record-panel">
        <p>${t('history.timeline_loading')}</p>
      </div>
    `;
  }

  const filtered = activeFilter === 'all' ? items : items.filter((item) => item.type === activeFilter);
  if (!filtered.length) {
    return `
      <div class="empty-state">
        <div class="modern-empty-icon">${window.__icons?.clock}</div>
        <div class="empty-state-title">${t('history.timeline_empty_title')}</div>
        <div class="empty-state-desc">${t('history.timeline_empty_desc')}</div>
      </div>
    `;
  }

  const groups = filtered.reduce((acc, item) => {
    const key = formatDate(item.date);
    acc[key] = acc[key] || [];
    acc[key].push(item);
    return acc;
  }, {});

  return `
    <div class="timeline">
      ${Object.entries(groups).map(([dateLabel, groupItems]) => `
        <div class="mb-4">
          <div class="text-xs text-tertiary font-semibold mb-2" style="padding-left: 4px;">${dateLabel}</div>
          ${groupItems.map((item, index) => `
            <div class="timeline-item" style="animation: slideUp ${0.16 + index * 0.05}s ease;">
              <div class="timeline-dot" style="background: var(--primary);"></div>
              <button class="card card-bordered card-interactive mb-2 text-left w-full" data-timeline-route="${item.route}">
                <div class="flex items-center gap-3 mb-2">
                  <span class="modern-timeline-icon">${window.__icons?.[item.icon] || window.__icons?.clipboard}</span>
                  <div style="flex: 1;">
                    <div class="font-semibold text-sm">${item.title}</div>
                    <div class="text-xs text-tertiary">${formatTime(item.date)} ${t('history.separator')} ${item.meta}</div>
                  </div>
                  <span style="width: 18px; height: 18px; color: var(--text-tertiary);">${window.__icons?.chevronRight}</span>
                </div>
                ${item.summary ? `<div class="text-sm text-secondary" style="line-height: 1.5;">${item.summary}</div>` : ''}
              </button>
            </div>
          `).join('')}
        </div>
      `).join('')}
    </div>
  `;
}

export function render(params = {}, query = {}) {
  const state = getState();
  const activeFilter = query.filter || 'all';

  return `
    <div class="screen premium-check">
      <div class="header premium-soft-header">
        <div class="header-left">
          <button class="header-back" id="backBtn">${window.__icons?.back}</button>
        </div>
        <div class="header-title">${t('history.timeline')}</div>
        <div class="header-right">
          <span class="premium-header-shield">${window.__icons?.clock}</span>
        </div>
      </div>

      <div style="padding: var(--space-3) var(--space-4);">
        ${renderTabs(activeFilter)}
      </div>

      <div class="screen-padded" style="padding-top: 0; padding-bottom: 96px;">
        <div id="timelineContent">${renderTimeline(null, activeFilter)}</div>
      </div>

      <button class="fab" id="fabBtn">${window.__icons?.plus}</button>

      <div id="fabModal" class="hidden">
        <div class="modal-backdrop" id="fabBackdrop"></div>
        <div class="modal">
          <div class="modal-handle"></div>
          <div class="modal-title">${t('history.timeline_new_record')}</div>
          <div class="modal-actions">
            <button class="btn btn-primary btn-full" id="fabHealth">${window.__icons?.heartPulse} ${t('reports.detail.health_types.default')}</button>
            <button class="btn btn-outline btn-full" id="fabNewMeasurement">${window.__icons?.measurement} ${t('reports.detail.measurements.default')}</button>
            <button class="btn btn-outline btn-full" id="fabExpense">${window.__icons?.briefcase} ${t('history.expense')}</button>
            <button class="btn btn-outline btn-full" id="fabReminder">${window.__icons?.calendar} ${t('history.timeline_reminder')}</button>
            <button class="btn btn-ghost btn-full" id="fabCancel">${t('common.cancel')}</button>
          </div>
        </div>
      </div>

      <div class="version-badge">${state.version}</div>
    </div>
  `;
}

export function afterRender(params = {}, query = {}) {
  const state = getState();
  const activeFilter = query.filter || 'all';

  document.getElementById('backBtn')?.addEventListener('click', () => goBack());

  document.querySelectorAll('.filter-tab').forEach((tab) => {
    tab.addEventListener('click', () => navigate(`/history/timeline?filter=${tab.dataset.filter}`));
  });

  const fabModal = document.getElementById('fabModal');
  const closeFab = () => fabModal?.classList.add('hidden');
  document.getElementById('fabBtn')?.addEventListener('click', () => fabModal?.classList.remove('hidden'));
  document.getElementById('fabBackdrop')?.addEventListener('click', closeFab);
  document.getElementById('fabCancel')?.addEventListener('click', closeFab);
  document.getElementById('fabHealth')?.addEventListener('click', () => navigate('/feature/photo-followup'));
  document.getElementById('fabNewMeasurement')?.addEventListener('click', () => navigate('/history/measurements/new'));
  document.getElementById('fabExpense')?.addEventListener('click', () => navigate('/feature/expense'));
  document.getElementById('fabReminder')?.addEventListener('click', () => navigate('/feature/reminders'));

  Promise.all([
    getFreeRecords({ petId: state.activePetId, limit: 50 }),
    getMeasurements({ petId: state.activePetId, limit: 50 }),
    getClinicExportDocuments({ petId: state.activePetId, limit: 20 })
  ]).then(([records, measurements, documents]) => {
    const target = document.getElementById('timelineContent');
    if (!target) return;
    target.innerHTML = renderTimeline(buildTimelineItems(records, measurements, documents), activeFilter);
    target.querySelectorAll('[data-timeline-route]').forEach((card) => {
      card.addEventListener('click', () => navigate(card.dataset.timelineRoute));
    });
  }).catch(() => {
    const target = document.getElementById('timelineContent');
    if (target) {
      target.innerHTML = `
        <div class="empty-state">
          <div class="modern-empty-icon">${window.__icons?.alert}</div>
          <div class="empty-state-title">${t('history.timeline_failed_title')}</div>
          <div class="empty-state-desc">${t('history.timeline_failed_desc')}</div>
        </div>
      `;
    }
  });
}
