import { goBack } from '../../router.js';
import { getVetReadyReport } from '../../services/vetReadyReports.js';
import { showToast } from '../../ui/toast.js';
import { t } from '../../i18n/tr.js';

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
  return new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(date));
}

function formatAnswer(value) {
  if (Array.isArray(value)) return value.join(', ');
  if (value && typeof value === 'object') return Object.entries(value).map(([key, val]) => `${key}: ${formatAnswer(val)}`).join(' | ');
  return String(value || '-');
}

function renderList(items = [], emptyText = t('publicVetReport.no_record')) {
  if (!items.length) return `<p class="text-sm text-secondary">${escapeHtml(emptyText)}</p>`;
  return `<ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`;
}

function renderReport(report) {
  const answerRows = Object.entries(report.answers || {}).slice(0, 12);
  const taskRows = (report.tasks || []).slice(0, 8);

  return `
    <div class="report-public-card">
      <div class="report-public-hero ${escapeHtml(report.urgency.level)}">
        <div>
          <div class="premium-screen-kicker">${t('publicVetReport.kicker')}</div>
          <h1>${t('publicVetReport.case_summary', { name: escapeHtml(report.pet.name) })}</h1>
          <p>${t('publicVetReport.created_at', { date: formatDate(report.createdAt) })}</p>
        </div>
        <div class="report-public-urgency">
          <span>${escapeHtml(report.urgency.title)}</span>
          <strong>${escapeHtml(report.urgency.action)}</strong>
          <small>${t('publicVetReport.score_confidence', { score: Number(report.urgency.score || 0), confidence: Number(report.urgency.confidence || 0) })}</small>
        </div>
      </div>

      <section>
        <h2>${t('publicVetReport.pet_complaint')}</h2>
        <div class="report-public-grid">
          <p><b>Pet</b><span>${escapeHtml([report.pet.breed, report.pet.age, report.pet.weight ? `${report.pet.weight} kg` : ''].filter(Boolean).join(' | ') || t('publicVetReport.no_profile'))}</span></p>
          <p><b>${t('publicVetReport.complaint')}</b><span>${escapeHtml(report.complaint.text || t('common.not_specified'))}</span></p>
          <p><b>${t('publicVetReport.duration')}</b><span>${escapeHtml(report.complaint.duration || t('common.not_specified'))}</span></p>
          <p><b>${t('publicVetReport.severity')}</b><span>${escapeHtml(report.complaint.severity || t('common.not_specified'))}</span></p>
        </div>
      </section>

      <section>
        <h2>${t('publicVetReport.red_flags')}</h2>
        ${Object.keys(report.redFlags || {}).length
          ? `<div class="report-public-rows">${Object.entries(report.redFlags).map(([key, value]) => `<p><b>${escapeHtml(key)}</b><span>${escapeHtml(value)}</span></p>`).join('')}</div>`
          : `<p class="text-sm text-secondary">${t('publicVetReport.no_red_flags')}</p>`}
      </section>

      <section>
        <h2>${t('publicVetReport.answers')}</h2>
        ${answerRows.length
          ? `<div class="report-public-rows">${answerRows.map(([key, value]) => `<p><b>${escapeHtml(key)}</b><span>${escapeHtml(formatAnswer(value))}</span></p>`).join('')}</div>`
          : `<p class="text-sm text-secondary">${t('publicVetReport.no_answers')}</p>`}
      </section>

      <section>
        <h2>${t('publicVetReport.evidence_tasks')}</h2>
        ${taskRows.length
          ? `<div class="report-public-rows">${taskRows.map((task) => `<p><b>${escapeHtml(task.title || task.key)}</b><span>${escapeHtml(task.status || 'pending')}</span></p>`).join('')}</div>`
          : `<p class="text-sm text-secondary">${t('publicVetReport.no_tasks')}</p>`}
      </section>

      <section>
        <h2>${t('publicVetReport.safe_followup')}</h2>
        ${renderList(report.steps, t('publicVetReport.no_steps'))}
      </section>

      <section>
        <h2>${t('publicVetReport.watch_items')}</h2>
        ${renderList([...(report.warnings || []), ...(report.contextWarnings || [])], t('publicVetReport.no_warnings'))}
      </section>

      <div class="premium-privacy-note">${window.__icons?.lock || ''} ${t('publicVetReport.disclaimer')}</div>
    </div>
  `;
}

export function render(params = {}) {
  const report = getVetReadyReport(params.reportId);

  return `
    <div class="screen premium-result">
      <div class="header premium-soft-header">
        <div class="header-left">
          <button class="header-icon" id="btnBack">${window.__icons?.back || ''}</button>
        </div>
        <div class="header-title">${t('publicVetReport.title')}</div>
        <div class="header-right">
          <button class="header-icon" id="btnShare">${window.__icons?.upload || ''}</button>
        </div>
      </div>

      <div class="section pt-4 pb-24">
        ${report ? renderReport(report) : `
          <div class="empty-state">
            <div class="premium-icon-box" style="margin: 0 auto 16px;">${window.__icons?.clipboard || ''}</div>
            <div class="font-bold mb-2">${t('publicVetReport.not_found_title')}</div>
            <div class="text-sm text-secondary px-4">${t('publicVetReport.not_found_desc')}</div>
          </div>
        `}
      </div>
    </div>
  `;
}

export function afterRender(params = {}) {
  document.getElementById('btnBack')?.addEventListener('click', () => goBack());
  document.getElementById('btnShare')?.addEventListener('click', async () => {
    const url = `${window.location.origin}${window.location.pathname}#/public/report/${params.reportId}`;
    try {
      if (navigator.share) await navigator.share({ title: t('publicVetReport.share_title'), url });
      else await navigator.clipboard.writeText(url);
      showToast(t('publicVetReport.link_ready'));
    } catch {}
  });
}
