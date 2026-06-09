import { navigate } from '../../router.js';
import { getState } from '../../store.js';
import { t } from '../../i18n/tr.js';
import { getClinicExportDocuments } from '../../services/documents.js';

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

function typeMeta(doc) {
  if (doc.document_type === 'health_document') return { label: t('reportsScreen.document_archive'), icon: 'upload' };
  if (doc.document_type === 'vet_prep') return { label: t('reportsScreen.vet_prep'), icon: 'stethoscope' };
  return { label: t('reportsScreen.clinic_file'), icon: 'briefcase' };
}

function statusText(status) {
  if (status === 'draft') return t('reportsScreen.status_draft');
  if (status === 'uploaded') return t('reportsScreen.status_uploaded');
  if (status === 'ai_pending') return t('reportsScreen.status_ai_pending');
  if (status === 'processed') return t('reportsScreen.status_ready');
  return status || t('reportsScreen.status_ready');
}

function renderSummary(documents = []) {
  const clinic = documents.filter((doc) => doc.document_type === 'clinic_export').length;
  const vetPrep = documents.filter((doc) => doc.document_type === 'vet_prep').length;
  const uploaded = documents.filter((doc) => doc.document_type === 'health_document').length;

  return `
    <div class="record-summary-panel">
      <div class="record-summary-grid">
        <div><span>${t('reportsScreen.total_files')}</span><strong>${documents.length}</strong><small>${t('reportsScreen.summary_archive')}</small></div>
        <div><span>${t('reportsScreen.prep')}</span><strong>${clinic + vetPrep}</strong><small>${t('reportsScreen.uploaded_count', { count: uploaded })}</small></div>
      </div>
    </div>
  `;
}

function renderDocuments(documents = null) {
  if (!documents) {
    return `
      <div class="report-card">
        <div class="report-card-header">
          <div>
            <div class="report-card-title">${t('reportsScreen.files_loading')}</div>
            <div class="report-card-date">${t('reportsScreen.records_preparing')}</div>
          </div>
          <div class="premium-icon-box">${window.__icons?.clock || ''}</div>
        </div>
      </div>
    `;
  }

  if (!documents.length) {
    return `
      <div class="empty-state">
        <div class="premium-icon-box" style="margin: 0 auto 16px;">${window.__icons?.clipboard || ''}</div>
        <div class="font-bold mb-2">${t('reportsScreen.empty_title')}</div>
        <div class="text-sm text-secondary px-4">${t('reportsScreen.empty_desc')}</div>
      </div>
    `;
  }

  return documents.map((doc) => {
    const meta = typeMeta(doc);
    const included = doc.included?.length || 0;
    const note = doc.note || t('reportsScreen.included_note', { purpose: doc.purpose || meta.label, count: included });

    return `
      <button class="report-card mb-4" data-document-id="${escapeHtml(doc.id)}">
        <div class="report-card-header">
          <div>
            <div class="report-card-title">${escapeHtml(doc.title)}</div>
            <div class="report-card-date">${formatDate(doc.created_at)} · ${escapeHtml(statusText(doc.status))}</div>
          </div>
          <div class="premium-icon-box">${window.__icons?.[meta.icon] || window.__icons?.clipboard || ''}</div>
        </div>
        <div class="report-card-summary">${escapeHtml(note)}</div>
        <div class="report-card-footer">
          <div class="text-xs font-semibold text-primary-color">${escapeHtml(meta.label)}</div>
          <div class="text-xs text-secondary">${t('reportsScreen.section_count', { count: included })}</div>
        </div>
      </button>
    `;
  }).join('');
}

export function render() {
  return `
    <div class="screen premium-check">
      <div class="header premium-soft-header">
        <div class="header-left"></div>
        <div class="header-title">${t('reports.title')}</div>
        <div class="header-right">
          <button class="header-icon" id="btnAddReport" aria-label="${t('reportsScreen.add_document')}">${window.__icons?.plus || ''}</button>
        </div>
      </div>

      <div class="section pt-4">
        <div class="report-export-card">
          <div class="premium-icon-box">${window.__icons?.briefcase || ''}</div>
          <div>
            <div class="premium-screen-kicker">${t('reportsScreen.hero_kicker')}</div>
            <h2>${t('reportsScreen.hero_title')}</h2>
            <p>${t('reportsScreen.hero_desc')}</p>
          </div>
          <button class="btn btn-primary btn-sm" id="btnExportAll">${t('reportsScreen.prepare')}</button>
        </div>
      </div>

      <div class="section pt-0 pb-24">
        <div id="reportsSummary">
          ${renderSummary([])}
        </div>

        <div class="flex justify-between items-center mb-3">
          <h3 class="section-title mb-0">${t('reportsScreen.documents_title')}</h3>
          <button class="btn-ghost text-primary text-sm font-semibold" id="btnDocumentArchive">${t('reportsScreen.add_document')}</button>
        </div>

        <div class="reports-list" id="clinicDocumentsList">
          ${renderDocuments()}
        </div>
      </div>

      <div style="height: 80px;"></div>
    </div>
  `;
}

export function afterRender() {
  const state = getState();

  document.getElementById('btnAddReport')?.addEventListener('click', () => navigate('/reports/new'));
  document.getElementById('btnExportAll')?.addEventListener('click', () => navigate('/feature/clinic-export'));
  document.getElementById('btnDocumentArchive')?.addEventListener('click', () => navigate('/feature/document-ai'));

  getClinicExportDocuments({ petId: state.activePetId, limit: 30 }).then((documents) => {
    const summary = document.getElementById('reportsSummary');
    const target = document.getElementById('clinicDocumentsList');
    if (summary) summary.innerHTML = renderSummary(documents);
    if (!target) return;
    target.innerHTML = renderDocuments(documents);
    target.querySelectorAll('[data-document-id]').forEach((card) => {
      card.addEventListener('click', () => navigate(`/reports/${card.dataset.documentId}`));
    });
  }).catch((err) => {
    const target = document.getElementById('clinicDocumentsList');
    if (target) {
      target.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">${window.__icons?.alert || ''}</div>
          <div class="empty-state-title">${t('reportsScreen.load_failed')}</div>
          <div class="empty-state-desc">${escapeHtml(err.message)}</div>
        </div>
      `;
    }
  });
}
