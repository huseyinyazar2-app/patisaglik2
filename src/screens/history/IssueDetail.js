import { navigate, goBack } from '../../router.js';
import { getState } from '../../store.js';
import { getFreeRecords } from '../../services/freeRecords.js';
import { t, translateForLocale } from '../../i18n/tr.js';

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatDate(date) {
  if (!date || Number.isNaN(Date.parse(date))) return t('common.no_date');
  return new Intl.DateTimeFormat('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(date));
}

function first(value) {
  if (Array.isArray(value)) return value[0]?.label || value[0] || '';
  return value || '';
}

function field(payload = {}, labels = [], fallback = '') {
  for (const label of labels) {
    const value = first(payload[label]);
    if (value) return value;
  }
  return fallback;
}

function issueTitle(item) {
  return item.title || field(item.payload, [translateForLocale('tr', 'formLabels.issue_name'), 'issue_name'], t('issueDetail.default_title'));
}

function issueDescription(item) {
  return item.summary || field(item.payload, [translateForLocale('tr', 'formLabels.description'), 'description', translateForLocale('tr', 'formLabels.followup_note')], t('issueDetail.no_detail'));
}

function renderField(label, value) {
  if (value === undefined || value === null || value === '') return '';
  const display = Array.isArray(value) ? value.join(', ') : String(value);
  return `
    <div class="record-detail-field">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(display)}</strong>
    </div>
  `;
}

function payloadFields(payload = {}) {
  const renderedKeys = [
    translateForLocale('tr', 'formLabels.issue_name'),
    'issue_name',
    translateForLocale('tr', 'formLabels.issue_category'),
    'category',
    translateForLocale('tr', 'issueDetail.first_noticed_payload'),
    'first_noticed',
    translateForLocale('tr', 'formLabels.description'),
    'description',
    translateForLocale('tr', 'formLabels.tracking_freq'),
    'tracking_frequency'
  ];
  return Object.entries(payload)
    .filter(([key, value]) => !key.startsWith('__') && !['form_submission_id', 'feature_code', ...renderedKeys].includes(key) && value !== '')
    .map(([key, value]) => renderField(key, Array.isArray(value) ? value.join(', ') : value))
    .join('');
}

function renderDetail(issue = null) {
  if (!issue) {
    return `<div class="free-record-panel"><p>${t('issueDetail.loading')}</p></div>`;
  }

  const payload = issue.payload || {};
  const frequency = field(payload, [translateForLocale('tr', 'formLabels.tracking_freq'), 'tracking_frequency'], t('issueDetail.frequency_missing'));

  return `
    <div class="record-detail-card">
      <div class="record-detail-main">
        <div class="premium-icon-box">${window.__icons?.heartPulse || ''}</div>
        <div>
          <span>${t('issueDetail.record_type')}</span>
          <h2>${escapeHtml(issueTitle(issue))}</h2>
          <p>${formatDate(issue.occurred_at || issue.created_at)}</p>
        </div>
      </div>

      <div class="record-alert-panel watch">
        <span>${window.__icons?.search || ''}</span>
        <div>
          <strong>${escapeHtml(frequency)}</strong>
          <small>${escapeHtml(issueDescription(issue))}</small>
          <em>${t('issueDetail.disclaimer')}</em>
        </div>
      </div>

      <div class="record-detail-grid">
        ${renderField(t('formLabels.issue_category'), field(payload, [translateForLocale('tr', 'formLabels.issue_category'), 'category'], t('issueDetail.general_tracking')))}
        ${renderField(t('issueDetail.first_noticed_payload'), field(payload, [translateForLocale('tr', 'issueDetail.first_noticed_payload'), 'first_noticed']))}
        ${renderField(t('formLabels.description'), issueDescription(issue))}
        ${payloadFields(payload)}
        ${renderField(t('common.record_date'), formatDate(issue.created_at))}
      </div>
    </div>
  `;
}

export function render() {
  return `
    <div class="screen premium-check record-list-screen">
      <div class="header premium-soft-header">
        <div class="header-left">
          <button class="header-back" id="btnBack">${window.__icons?.back || ''}</button>
        </div>
        <div class="header-title">${t('issueDetail.title')}</div>
        <div class="header-right">
          <span class="premium-header-shield">${window.__icons?.heartPulse || ''}</span>
        </div>
      </div>

      <div class="section pt-4 pb-24">
        <div class="feature-form-hero teal">
          <div class="premium-icon-box">${window.__icons?.search || ''}</div>
          <div>
            <div class="premium-screen-kicker">${t('issueDetail.kicker')}</div>
            <h1>${t('issueDetail.hero_title')}</h1>
            <p>${t('issueDetail.hero_desc')}</p>
          </div>
        </div>

        <div id="issueDetail" class="mt-4">
          ${renderDetail()}
        </div>

        <div class="record-detail-actions">
          <button class="btn btn-primary btn-full" id="btnNewCheck">${t('issueDetail.new_followup')}</button>
          <button class="btn btn-secondary btn-full" id="btnCreateReport">${t('issueDetail.create_report')}</button>
          <button class="btn btn-ghost btn-full" id="btnList">${t('issueDetail.back_to_list')}</button>
        </div>
      </div>
    </div>
  `;
}

export function afterRender(params = {}) {
  const state = getState();
  const target = document.getElementById('issueDetail');

  document.getElementById('btnBack')?.addEventListener('click', () => goBack());
  document.getElementById('btnNewCheck')?.addEventListener('click', () => navigate('/history/issues/new'));
  document.getElementById('btnCreateReport')?.addEventListener('click', () => navigate('/reports/new'));
  document.getElementById('btnList')?.addEventListener('click', () => navigate('/history/issues'));

  getFreeRecords({ petId: state.activePetId, limit: 100 }).then((records) => {
    const issue = (records.healthRecords || []).find((item) => item.record_type === 'issue' && item.id === params.issueId);
    if (target) {
      target.innerHTML = issue ? renderDetail(issue) : `
        <div class="empty-state">
          <div class="empty-state-icon">${window.__icons?.search || ''}</div>
          <div class="empty-state-title">${t('issueDetail.not_found_title')}</div>
          <div class="empty-state-desc">${t('issueDetail.not_found_desc')}</div>
        </div>
      `;
    }
  }).catch((err) => {
    if (target) {
      target.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">${window.__icons?.alert || ''}</div>
          <div class="empty-state-title">${t('issueDetail.load_failed')}</div>
          <div class="empty-state-desc">${escapeHtml(err.message)}</div>
        </div>
      `;
    }
  });
}
