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
  return new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(date));
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

function itemDate(item) {
  return item.occurred_at || item.created_at;
}

function issueTitle(item) {
  return item.title || field(item.payload, [translateForLocale('tr', 'formLabels.issue_name'), 'issue_name'], t('issueDetail.default_title'));
}

function issueCategory(item) {
  return field(item.payload, [translateForLocale('tr', 'formLabels.issue_category'), 'category'], t('issueDetail.general_tracking'));
}

function issueDescription(item) {
  return item.summary || field(item.payload, [translateForLocale('tr', 'formLabels.description'), 'description', translateForLocale('tr', 'formLabels.followup_note')], t('issueDetail.no_detail'));
}

function issueStatus(item) {
  const text = `${field(item.payload, [translateForLocale('tr', 'formLabels.tracking_freq'), 'tracking_frequency'])} ${item.summary || ''}`.toLocaleLowerCase('tr-TR');
  if (text.includes('istemiyorum') || text.includes('kapal\u0131')) return { label: t('issues.status_passive'), className: 'bg-gray-200 text-gray-600' };
  if (text.includes('g\u00fcnl\u00fck')) return { label: t('issues.status_close'), className: 'danger' };
  return { label: t('issues.status_tracking'), className: 'primary' };
}

function renderIssueCards(issues = []) {
  if (!issues.length) {
    return `
      <div class="empty-state">
        <div class="empty-state-icon modern-empty-icon">${window.__icons?.search || ''}</div>
        <div class="font-bold mb-2">${t('issues.empty_title')}</div>
        <div class="text-sm text-secondary px-4">${t('issues.empty_desc')}</div>
      </div>
    `;
  }

  return issues.map((issue) => {
    const status = issueStatus(issue);
    return `
      <button class="issue-card live-issue-card" data-id="${escapeHtml(issue.id)}" style="border-left-color: ${status.className.includes('gray') ? 'var(--gray-400)' : 'var(--primary)'};">
        <div class="issue-card-header">
          <div class="issue-card-name">${escapeHtml(issueTitle(issue))}</div>
          <span class="chip-status ${status.className} text-xs">${escapeHtml(status.label)}</span>
        </div>
        <div class="text-sm text-secondary mb-2 line-clamp-2">${escapeHtml(issueDescription(issue))}</div>
        <div class="issue-card-meta flex justify-between">
          <span>${escapeHtml(issueCategory(issue))}</span>
          <span>${formatDate(itemDate(issue))}</span>
        </div>
      </button>
    `;
  }).join('');
}

export function render() {
  return `
    <div class="screen premium-check record-list-screen">
      <div class="header premium-soft-header">
        <div class="header-left">
          <button class="header-back" id="btnBack">${window.__icons?.back || ''}</button>
        </div>
        <div class="header-title">${t('issues.title')}</div>
        <div class="header-right">
          <span class="premium-header-shield">${window.__icons?.search || ''}</span>
        </div>
      </div>

      <div class="section pt-4 pb-24">
        <div class="feature-form-hero teal">
          <div class="premium-icon-box">${window.__icons?.heartPulse || ''}</div>
          <div>
            <div class="premium-screen-kicker">${t('issues.kicker')}</div>
            <h1>${t('issues.hero_title')}</h1>
            <p>${t('issues.hero_desc')}</p>
          </div>
        </div>

        <div class="record-summary-panel">
          <div class="record-summary-grid" id="issueSummary">
            <div><span>${t('issues.active_followup')}</span><strong>-</strong><small>${t('reportsScreen.records_preparing')}</small></div>
            <div><span>${t('issues.last_record')}</span><strong>-</strong><small>${t('issues.waiting_record')}</small></div>
          </div>
        </div>

        <div class="issues-list record-list-stack" id="issueList">
          <div class="free-record-panel"><p>${t('issues.records_loading')}</p></div>
        </div>

        <button class="btn btn-primary btn-full btn-lg mt-4" id="btnAddIssue">${t('issues.add_issue')}</button>
      </div>
    </div>
  `;
}

export function afterRender() {
  const state = getState();

  document.getElementById('btnBack')?.addEventListener('click', () => goBack());
  document.getElementById('btnAddIssue')?.addEventListener('click', () => navigate('/history/issues/new'));

  getFreeRecords({ petId: state.activePetId, limit: 100 }).then((records) => {
    const issues = (records.healthRecords || [])
      .filter((item) => item.record_type === 'issue')
      .sort((a, b) => new Date(itemDate(b) || 0) - new Date(itemDate(a) || 0));
    const summary = document.getElementById('issueSummary');
    const target = document.getElementById('issueList');
    const active = issues.filter((item) => issueStatus(item).label !== t('issues.status_passive'));

    if (summary) {
      summary.innerHTML = `
        <div><span>${t('issues.active_followup')}</span><strong>${active.length}</strong><small>${t('issues.total_issue_count', { count: issues.length })}</small></div>
        <div><span>${t('issues.last_record')}</span><strong>${issues[0] ? formatDate(itemDate(issues[0])) : '-'}</strong><small>${issues[0] ? escapeHtml(issueTitle(issues[0])) : t('issues.none_yet')}</small></div>
      `;
    }

    if (target) {
      target.innerHTML = renderIssueCards(issues);
      target.querySelectorAll('[data-id]').forEach((card) => {
        card.addEventListener('click', () => navigate(`/history/issues/${card.dataset.id}`));
      });
    }
  }).catch((err) => {
    const target = document.getElementById('issueList');
    if (target) {
      target.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">${window.__icons?.alert || ''}</div>
          <div class="empty-state-title">${t('issues.load_failed')}</div>
          <div class="empty-state-desc">${escapeHtml(err.message)}</div>
        </div>
      `;
    }
  });
}
