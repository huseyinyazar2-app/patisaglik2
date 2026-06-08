import { goBack, navigate } from '../../router.js';
import { getState } from '../../store.js';
import { getLocalPets } from '../../services/pets.js';
import { getFreeRecords, mergeRecentRecords } from '../../services/freeRecords.js';
import { getClinicExportDocuments } from '../../services/documents.js';
import { getMeasurements } from '../../services/measurements.js';
import { getLocale, t } from '../../i18n/tr.js';

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function shortDate(date) {
  if (!date || Number.isNaN(Date.parse(date))) return t('reports.detail.none');
  return new Intl.DateTimeFormat(getLocale() === 'tr' ? 'tr-TR' : getLocale(), { day: 'numeric', month: 'long' }).format(new Date(date));
}

function money(amountCents) {
  return new Intl.NumberFormat(getLocale() === 'tr' ? 'tr-TR' : getLocale(), { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format((amountCents || 0) / 100);
}

function measurementLabel(type) {
  return t(`healthPassport.measurements.${type}`) || type || t('reports.detail.measurements.default');
}

function optionLabel(group, value) {
  if (!value || value === 'unknown') return t('common.not_specified');
  return t(`${group}.${value}`);
}

function weightLabel(weight) {
  const value = Number(String(weight ?? '').replace(',', '.'));
  if (!Number.isFinite(value) || value <= 0) return t('common.not_specified');
  return `${value.toLocaleString(getLocale() === 'tr' ? 'tr-TR' : getLocale(), { maximumFractionDigits: 1 })} kg`;
}

function renderStatPlaceholders(values = {}) {
  return `
    <div><span>${t('reports.detail.health_types.default')}</span><strong>${values.health ?? '...'}</strong><small>${t('healthPassport.archive')}</small></div>
    <div><span>${t('reports.detail.document')}</span><strong>${values.docs ?? '...'}</strong><small>${t('healthPassport.lab_report')}</small></div>
    <div><span>${t('history.timeline_reminder')}</span><strong>${values.reminders ?? '...'}</strong><small>${t('healthPassport.vaccine_medication')}</small></div>
    <div><span>${t('history.expense')}</span><strong>${values.expense ?? '...'}</strong><small>${t('history.total')}</small></div>
  `;
}

function renderTimeline(items = []) {
  if (!items.length) {
    return `<div class="empty-state compact"><div class="text-sm text-secondary">${t('healthPassport.no_passport_records')}</div></div>`;
  }
  return items.slice(0, 6).map((item) => `
    <div class="passport-timeline-row">
      <div class="risk-dot"></div>
      <div>
        <strong>${escapeHtml(item.title || item.category || item.record_type || t('history.record'))}</strong>
        <span>${shortDate(item.date)} ${t('history.separator')} ${escapeHtml(item.kind === 'expense' ? money(item.amount_cents) : item.summary || item.note || item.status || t('reports.detail.health_types.default'))}</span>
      </div>
    </div>
  `).join('');
}

export function render() {
  const pet = getLocalPets().find((item) => item.id === getState().activePetId) || {};

  return `
    <div class="screen premium-check">
      <div class="header premium-soft-header">
        <div class="header-left">
          <button class="header-icon" id="btnBack">${window.__icons?.back || ''}</button>
        </div>
        <div class="header-title">${t('healthPassport.title')}</div>
        <div class="header-right">
          <span class="premium-header-shield">${window.__icons?.shield || ''}</span>
        </div>
      </div>

      <div class="section pt-4 pb-24">
        <div class="passport-hero">
          <div class="premium-icon-box">${window.__icons?.paw || ''}</div>
          <div>
            <div class="premium-screen-kicker">${t('healthPassport.kicker')}</div>
            <h1>${escapeHtml(pet?.name || t('reports.detail.active_pet'))}</h1>
            <p>${escapeHtml([pet?.breed, pet?.age, pet?.weight ? `${pet.weight} kg` : ''].filter(Boolean).join(t('history.separator')) || t('healthPassport.profile_info'))}</p>
          </div>
          <button class="btn btn-sm btn-primary" id="btnQr">QR</button>
        </div>

        <div class="passport-profile-grid">
          <div><span>${t('pets.gender')}</span><strong>${escapeHtml(optionLabel('pets', pet?.gender))}</strong></div>
          <div><span>${t('pets.weight')}</span><strong>${escapeHtml(weightLabel(pet?.weight))}</strong></div>
          <div><span>${t('pets.neutered')}</span><strong>${escapeHtml(optionLabel('pets', pet?.neutered))}</strong></div>
        </div>

        <div class="passport-grid" id="passportStats">
          ${renderStatPlaceholders()}
        </div>

        <div class="premium-result-section">
          <div class="premium-icon-box">${window.__icons?.heartPulse || ''}</div>
          <div>
            <h3>${t('healthPassport.risk_context_title')}</h3>
            <p>${escapeHtml(pet?.medicalSummary || pet?.statusText || t('healthPassport.risk_context_desc'))}</p>
            ${pet?.riskContext?.warnings?.length ? `<ul>${pet.riskContext.warnings.slice(0, 3).map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul>` : ''}
          </div>
        </div>

        <div class="passport-section">
          <div class="section-header">
            <h3 class="section-title">${t('healthPassport.latest_timeline')}</h3>
            <button class="btn-ghost text-primary text-sm font-semibold" id="btnTimeline">${t('history.all')}</button>
          </div>
          <div class="passport-timeline" id="passportTimeline">
            <div class="passport-timeline-row"><div class="risk-dot"></div><div><strong>${t('history.loading')}</strong><span>${t('healthPassport.records_preparing')}</span></div></div>
          </div>
        </div>

        <div class="passport-section">
          <div class="section-header">
            <h3 class="section-title">${t('healthPassport.latest_measurements_docs')}</h3>
            <button class="btn-ghost text-primary text-sm font-semibold" id="btnReports">${t('reports.title')}</button>
          </div>
          <div class="passport-list" id="passportDetails">
            <div class="text-sm text-secondary">${t('common.loading')}</div>
          </div>
        </div>

        <div class="feature-bottom-actions">
          <button class="btn btn-primary btn-full" id="btnClinicExport">${t('healthPassport.prepare_vet_file')}</button>
          <button class="btn btn-secondary btn-full" id="btnAddRecord">${t('history.timeline_new_record')}</button>
        </div>
      </div>
    </div>
  `;
}

export function afterRender() {
  const state = getState();
  const petId = state.activePetId;

  document.getElementById('btnBack')?.addEventListener('click', () => goBack());
  document.getElementById('btnQr')?.addEventListener('click', () => navigate('/feature/qr'));
  document.getElementById('btnTimeline')?.addEventListener('click', () => navigate('/history/timeline'));
  document.getElementById('btnReports')?.addEventListener('click', () => navigate('/reports'));
  document.getElementById('btnClinicExport')?.addEventListener('click', () => navigate('/feature/clinic-export'));
  document.getElementById('btnAddRecord')?.addEventListener('click', () => navigate('/history/health-records'));

  Promise.all([
    getFreeRecords({ petId, limit: 12 }),
    getClinicExportDocuments({ petId, limit: 12 }),
    getMeasurements({ petId, limit: 6 })
  ]).then(([records, docs, measurements]) => {
    const stats = document.getElementById('passportStats');
    const timeline = document.getElementById('passportTimeline');
    const details = document.getElementById('passportDetails');
    const totalExpense = (records.expenses || []).reduce((sum, item) => sum + Number(item.amount_cents || 0), 0);

    if (stats) {
      stats.innerHTML = renderStatPlaceholders({
        health: records.healthRecords.length,
        docs: docs.length,
        reminders: records.reminders.length,
        expense: money(totalExpense)
      });
    }

    if (timeline) timeline.innerHTML = renderTimeline(mergeRecentRecords(records));
    if (details) {
      const measurementRows = measurements.slice(0, 3).map(item => `
        <div class="passport-detail-row">
          <span>${window.__icons?.measurement || ''}</span>
          <div><strong>${measurementLabel(item.measurement_type)}</strong><small>${item.value} ${item.unit} ${t('history.separator')} ${shortDate(item.measured_at)}</small></div>
        </div>
      `).join('');
      const docRows = docs.slice(0, 3).map(item => `
        <button class="passport-detail-row" data-report-id="${escapeHtml(item.id)}">
          <span>${window.__icons?.upload || ''}</span>
          <div><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(item.status || t('reports.detail.ready'))} ${t('history.separator')} ${shortDate(item.created_at)}</small></div>
        </button>
      `).join('');
      details.innerHTML = measurementRows || docRows ? `${measurementRows}${docRows}` : `<div class="text-sm text-secondary">${t('healthPassport.no_measurement_or_document')}</div>`;
      details.querySelectorAll('[data-report-id]').forEach(button => {
        button.addEventListener('click', () => navigate(`/reports/${button.dataset.reportId}`));
      });
    }
  }).catch(() => {
    const details = document.getElementById('passportDetails');
    if (details) details.innerHTML = `<div class="text-sm text-danger">${t('healthPassport.load_failed')}</div>`;
  });
}
