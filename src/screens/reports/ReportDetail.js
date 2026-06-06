import { goBack } from '../../router.js';
import { getLocale, t } from '../../i18n/tr.js';
import { getActivePet } from '../../services/pets.js';
import { getClinicExportDocumentById } from '../../services/documents.js';
import { getFreeRecords } from '../../services/freeRecords.js';
import { getMeasurements } from '../../services/measurements.js';
import { showToast } from '../../ui/toast.js';

function formatDate(date) {
  if (!date) return t('reports.detail.no_date');
  return new Intl.DateTimeFormat(getLocale() === 'tr' ? 'tr-TR' : getLocale(), { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(date));
}

function safeFileName(value) {
  return String(value || 'pet-help-report')
    .toLocaleLowerCase(getLocale() === 'tr' ? 'tr-TR' : getLocale())
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9_-]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 70) || 'pet-help-report';
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatMoney(amountCents, currency = 'TRY') {
  return new Intl.NumberFormat(getLocale() === 'tr' ? 'tr-TR' : getLocale(), {
    style: 'currency',
    currency,
    maximumFractionDigits: 0
  }).format((amountCents || 0) / 100);
}

function healthTypeLabel(type) {
  return t(`reports.detail.health_types.${type}`) || t('reports.detail.health_types.default');
}

function measurementLabel(type) {
  return t(`reports.detail.measurements.${type}`) || type || t('reports.detail.measurements.default');
}

function renderDataRows(items, emptyText) {
  if (!items.length) {
    return `<p class="text-sm text-gray-500 bg-gray-50 p-3 rounded">${emptyText}</p>`;
  }

  return `
    <div class="grid grid-cols-1 gap-2 mb-6">
      ${items.map((item) => `
        <div class="bg-gray-50 p-3 rounded text-sm">
          <div class="flex justify-between gap-3">
            <span class="font-semibold text-gray-800">${item.title}</span>
            <span class="text-gray-500">${item.meta}</span>
          </div>
          ${item.summary ? `<div class="text-gray-600 mt-1">${item.summary}</div>` : ''}
        </div>
      `).join('')}
    </div>
  `;
}

function renderOcrDetails(doc) {
  const ocr = doc.ai_ocr;
  if (!ocr || ocr.status === 'queued_for_server') return '';
  const labValues = Array.isArray(ocr.labValues) ? ocr.labValues : [];
  const medications = Array.isArray(ocr.medications) ? ocr.medications : [];
  const tasks = Array.isArray(ocr.followupTasks) ? ocr.followupTasks : [];
  const warnings = Array.isArray(ocr.warnings) ? ocr.warnings : [];

  return `
    <div class="mt-4 border-t border-gray-200 pt-3">
      ${ocr.summary ? `<p class="text-sm text-gray-800 leading-relaxed"><span class="font-semibold">${t('reports.detail.ai_summary')}:</span> ${escapeHtml(ocr.summary)}</p>` : ''}
      <div class="grid grid-cols-2 gap-2 mt-3">
        ${ocr.documentDate ? `<div class="bg-white p-2 rounded border border-gray-200"><span class="text-xs text-gray-500">${t('reports.detail.date')}</span><div class="font-semibold">${escapeHtml(ocr.documentDate)}</div></div>` : ''}
        ${ocr.clinic ? `<div class="bg-white p-2 rounded border border-gray-200"><span class="text-xs text-gray-500">${t('reports.detail.clinic')}</span><div class="font-semibold">${escapeHtml(ocr.clinic)}</div></div>` : ''}
        ${ocr.invoice?.total ? `<div class="bg-white p-2 rounded border border-gray-200"><span class="text-xs text-gray-500">${t('reports.detail.amount')}</span><div class="font-semibold">${escapeHtml(`${ocr.invoice.total} ${ocr.invoice.currency || ''}`)}</div></div>` : ''}
        ${ocr.confidence ? `<div class="bg-white p-2 rounded border border-gray-200"><span class="text-xs text-gray-500">${t('reports.detail.confidence')}</span><div class="font-semibold">${Math.round(ocr.confidence)} / 100</div></div>` : ''}
      </div>
      ${labValues.length ? `
        <h4 class="font-semibold text-gray-800 mt-4 mb-2">${t('reports.detail.lab_values')}</h4>
        <div class="grid grid-cols-1 gap-2">
          ${labValues.slice(0, 8).map((item) => `
            <div class="bg-white p-2 rounded border border-gray-200 text-sm flex justify-between gap-2">
              <span>${escapeHtml(item.name || t('reports.detail.value'))}</span>
              <b>${escapeHtml([item.value, item.unit].filter(Boolean).join(' '))}</b>
            </div>
          `).join('')}
        </div>
      ` : ''}
      ${medications.length ? `
        <h4 class="font-semibold text-gray-800 mt-4 mb-2">${t('reports.detail.medication_prescription')}</h4>
        <div class="grid grid-cols-1 gap-2">
          ${medications.slice(0, 6).map((item) => `
            <div class="bg-white p-2 rounded border border-gray-200 text-sm">
              <b>${escapeHtml(item.name || t('reports.detail.medication'))}</b>
              <div class="text-gray-600">${escapeHtml([item.doseText, item.frequency, item.duration, item.note].filter(Boolean).join(t('reports.detail.separator')))}</div>
            </div>
          `).join('')}
        </div>
      ` : ''}
      ${tasks.length ? `
        <h4 class="font-semibold text-gray-800 mt-4 mb-2">${t('reports.detail.followup_tasks')}</h4>
        <ul class="text-sm text-gray-700">
          ${tasks.slice(0, 5).map((item) => `<li>${escapeHtml([item.title, item.dueDate, item.note].filter(Boolean).join(t('reports.detail.separator')))}</li>`).join('')}
        </ul>
      ` : ''}
      ${warnings.length ? `<p class="text-xs text-gray-500 mt-3">${t('reports.detail.warning')}: ${escapeHtml(warnings.slice(0, 2).join(t('reports.detail.separator')))}</p>` : ''}
    </div>
  `;
}

function currentReportTitle() {
  return document.querySelector('#reportDetailBody h1')?.textContent?.trim() || t('reports.detail.default_title');
}

function currentReportText() {
  return document.querySelector('#reportDetailBody')?.textContent?.replace(/\s+/g, ' ').trim() || currentReportTitle();
}

function createReportHtmlExport() {
  const title = currentReportTitle();
  const content = document.querySelector('#reportDetailBody')?.innerHTML || '';
  const html = `<!doctype html>
<html lang="${getLocale()}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <style>
    body { margin: 0; padding: 24px; background: #f6faf8; color: #111c18; font-family: Arial, sans-serif; }
    .report-export-shell { max-width: 820px; margin: 0 auto; }
    .bg-white { background: #fff; } .bg-gray-50 { background: #f8fafc; } .bg-primary-50 { background: #effaf6; }
    .text-gray-900, .text-gray-800 { color: #111827; } .text-gray-700, .text-gray-600 { color: #374151; } .text-gray-500 { color: #6b7280; }
    .text-primary, .text-primary-dark { color: #005b4c; }
    .font-bold { font-weight: 700; } .font-semibold { font-weight: 600; }
    .text-xl { font-size: 22px; } .text-sm { font-size: 14px; } .text-xs { font-size: 12px; }
    .p-6 { padding: 24px; } .p-4 { padding: 16px; } .p-3 { padding: 12px; } .p-2 { padding: 8px; }
    .mb-8 { margin-bottom: 32px; } .mb-6 { margin-bottom: 24px; } .mb-4 { margin-bottom: 16px; } .mb-3 { margin-bottom: 12px; } .mb-2 { margin-bottom: 8px; }
    .mt-8 { margin-top: 32px; } .mt-4 { margin-top: 16px; } .mt-1 { margin-top: 4px; }
    .rounded, .rounded-md, .rounded-lg { border-radius: 10px; }
    .border, .border-gray-200 { border: 1px solid #e5e7eb; } .border-b { border-bottom: 1px solid #e5e7eb; } .border-t { border-top: 1px solid #e5e7eb; }
    .border-l-4 { border-left: 4px solid #005b4c; }
    .flex { display: flex; } .grid { display: grid; } .items-start { align-items: flex-start; } .items-center { align-items: center; }
    .justify-between { justify-content: space-between; } .gap-2 { gap: 8px; } .gap-3 { gap: 12px; }
    .grid-cols-1 { grid-template-columns: 1fr; } .grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .leading-relaxed { line-height: 1.65; } .text-center { text-align: center; } .text-right { text-align: right; }
    ul { padding-left: 22px; } li { margin-bottom: 6px; } svg { width: 18px; height: 18px; vertical-align: middle; }
    .premium-icon-box, .modern-inline-icon { display: inline-grid; place-items: center; width: 34px; height: 34px; border-radius: 10px; background: #eef8f5; color: #005b4c; }
  </style>
</head>
<body>
  <main class="report-export-shell">${content}</main>
</body>
</html>`;
  return {
    blob: new Blob([html], { type: 'text/html;charset=utf-8' }),
    name: `${safeFileName(title)}.html`
  };
}

function downloadReportFile() {
  const file = createReportHtmlExport();
  const url = URL.createObjectURL(file.blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = file.name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function renderDocument(doc, records = null, measurements = []) {
  const pet = getActivePet(doc.pet_id);
  const isHealthDocument = doc.document_type === 'health_document';
  const included = doc.included.length ? doc.included : t('reports.detail.default_included');
  const healthRecords = records?.healthRecords || [];
  const reminders = records?.reminders || [];
  const expenses = records?.expenses || [];
  const totalExpense = expenses.reduce((sum, item) => sum + Number(item.amount_cents || 0), 0);
  const latestMeasurements = measurements.slice(0, 4);

  return `
    <div class="bg-white p-6 rounded-md shadow-sm border border-gray-200" style="min-height: 760px;">
      <div class="flex justify-between items-start border-b border-gray-200 pb-4 mb-4">
        <div>
          <h1 class="text-xl font-bold text-gray-900">${doc.title}</h1>
          <p class="text-sm text-gray-500 mt-1">${t('reports.detail.created')}: ${formatDate(doc.created_at)}${t('reports.detail.separator')}${doc.status === 'draft' ? t('reports.detail.draft') : t('reports.detail.ready')}</p>
        </div>
        <div class="premium-icon-box">${window.__icons?.briefcase}</div>
      </div>

      <div class="bg-gray-50 p-4 rounded-lg mb-6 text-sm">
        <h3 class="font-bold text-gray-700 mb-2 border-b border-gray-200 pb-1">${t('reports.detail.pet_info')}</h3>
        <p><span class="font-semibold w-24 inline-block">${t('reports.detail.name')}:</span> ${pet?.name || t('reports.detail.active_pet')}</p>
        <p><span class="font-semibold w-24 inline-block">${isHealthDocument ? t('reports.detail.document') : t('reports.detail.purpose')}:</span> ${doc.purpose}</p>
      </div>

      <div class="border-l-4 border-primary bg-primary-50 p-4 mb-6">
        <h3 class="font-bold text-primary-dark mb-2">${isHealthDocument ? t('reports.detail.document_note') : t('reports.detail.clinic_note')}</h3>
        <p class="text-sm text-gray-800 leading-relaxed">${doc.note || (isHealthDocument ? t('reports.detail.no_document_note') : t('reports.detail.no_clinic_note'))}</p>
      </div>

      ${isHealthDocument ? `
        <div class="bg-gray-50 p-4 rounded-lg mb-6 text-sm">
          <h3 class="font-bold text-gray-700 mb-2 border-b border-gray-200 pb-1">${t('reports.detail.ocr_prep')}</h3>
          <p><span class="font-semibold w-24 inline-block">${t('reports.detail.goal')}:</span> ${doc.read_goal || t('reports.detail.clinic_summary')}</p>
          <p><span class="font-semibold w-24 inline-block">${t('reports.detail.status')}:</span> ${doc.status === 'ai_pending' ? t('reports.detail.ai_waiting') : doc.status || t('reports.detail.uploaded')}</p>
          ${doc.visible_values ? `<p class="mt-1"><span class="font-semibold w-24 inline-block">${t('reports.detail.manual_note')}:</span> ${doc.visible_values}</p>` : ''}
          ${renderOcrDetails(doc)}
        </div>
      ` : ''}

      <h3 class="font-bold text-gray-800 border-b border-gray-200 pb-1 mb-3">${isHealthDocument ? t('reports.detail.planned_outputs') : t('reports.detail.included_sections')}</h3>
      <div class="grid grid-cols-1 gap-2 mb-6">
        ${included.map((item) => `
          <div class="bg-gray-50 p-3 rounded text-sm flex items-center gap-2">
            <span class="modern-inline-icon">${window.__icons?.checkCircle}</span>
            <span class="font-semibold">${item}</span>
          </div>
        `).join('')}
      </div>

      <h3 class="font-bold text-gray-800 border-b border-gray-200 pb-1 mb-3">${t('reports.detail.health_summary')}</h3>
      ${renderDataRows(healthRecords.slice(0, 4).map((item) => ({
        title: item.title,
        meta: `${healthTypeLabel(item.record_type)}${t('reports.detail.separator')}${formatDate(item.occurred_at || item.created_at)}`,
        summary: item.summary
      })), t('reports.detail.no_health_records'))}

      <h3 class="font-bold text-gray-800 border-b border-gray-200 pb-1 mb-3">${t('reports.detail.calendar_reminders')}</h3>
      ${renderDataRows(reminders.slice(0, 4).map((item) => ({
        title: item.title,
        meta: formatDate(item.due_at),
        summary: `${item.reminder_type || t('reports.detail.reminder')}${t('reports.detail.separator')}${item.status || 'scheduled'}`
      })), t('reports.detail.no_upcoming_reminders'))}

      <h3 class="font-bold text-gray-800 border-b border-gray-200 pb-1 mb-3">${t('reports.detail.expense_measurement_summary')}</h3>
      <div class="grid grid-cols-2 gap-2 mb-6">
        <div class="bg-gray-50 p-3 rounded text-sm">
          <div class="text-gray-500">${t('reports.detail.total_expense')}</div>
          <div class="font-bold text-gray-900 mt-1">${formatMoney(totalExpense)}</div>
          <div class="text-xs text-gray-500 mt-1">${t('reports.detail.record_count').replace('{count}', expenses.length)}</div>
        </div>
        <div class="bg-gray-50 p-3 rounded text-sm">
          <div class="text-gray-500">${t('reports.detail.latest_measurement')}</div>
          <div class="font-bold text-gray-900 mt-1">${latestMeasurements[0] ? `${latestMeasurements[0].value} ${latestMeasurements[0].unit}` : t('reports.detail.none')}</div>
          <div class="text-xs text-gray-500 mt-1">${latestMeasurements[0] ? measurementLabel(latestMeasurements[0].measurement_type) : t('reports.detail.waiting_record')}</div>
        </div>
      </div>

      ${latestMeasurements.length > 1 ? `
        <div class="grid grid-cols-1 gap-2 mb-6">
          ${latestMeasurements.slice(1).map((item) => `
            <div class="bg-gray-50 p-3 rounded text-sm flex justify-between gap-3">
              <span class="font-semibold">${measurementLabel(item.measurement_type)}</span>
              <span class="text-gray-600">${item.value} ${item.unit}${t('reports.detail.separator')}${formatDate(item.measured_at)}</span>
            </div>
          `).join('')}
        </div>
      ` : ''}

      <h3 class="font-bold text-gray-800 border-b border-gray-200 pb-1 mb-2">${t('reports.detail.production_status')}</h3>
      <p class="text-sm text-gray-700 leading-relaxed">
        ${isHealthDocument
          ? (doc.ai_ocr && doc.ai_ocr.status !== 'queued_for_server'
              ? t('reports.detail.ocr_processed_note')
              : t('reports.detail.ocr_queued_note'))
          : t('reports.detail.export_note')}
      </p>
    </div>
  `;
}

export function render(params = {}) {
  return `
    <div class="screen bg-gray-100">
      <div class="header bg-white shadow-sm" style="position: sticky; top: 0; z-index: 10;">
        <div class="header-left">
          <button class="header-icon" id="btnBack">${window.__icons?.back}</button>
        </div>
        <div class="header-title">${t('reports.detail.preview_title')}</div>
        <div class="header-right">
          <button class="btn-ghost text-primary text-sm font-semibold p-2" id="btnShareTop">${t('common.share')}</button>
        </div>
      </div>

      <div class="section pt-6 pb-24">
        <div id="reportDetailBody">
          <div class="report-card">
            <div class="report-card-header">
              <div>
                <div class="report-card-title">${t('reports.detail.loading_title')}</div>
                <div class="report-card-date">${t('reports.detail.loading_desc')}</div>
              </div>
              <div class="premium-icon-box">${window.__icons?.clock}</div>
            </div>
          </div>
        </div>

        <div class="flex gap-3 mt-6">
          <button class="btn btn-primary flex-1 shadow-sm" id="btnDownload">
            <span class="modern-button-icon">${window.__icons?.upload}</span> ${t('reports.detail.download_html')}
          </button>
          <button class="btn btn-outline flex-1 shadow-sm bg-white" id="btnSend">
            <span class="modern-button-icon">${window.__icons?.message}</span> ${t('reports.send_vet')}
          </button>
        </div>
      </div>
    </div>
  `;
}

export function afterRender(params = {}) {
  document.getElementById('btnBack')?.addEventListener('click', () => goBack());
  document.getElementById('btnDownload')?.addEventListener('click', () => downloadReportFile());
  const shareReport = async () => {
    const title = currentReportTitle();
    const text = currentReportText().slice(0, 900);
    const exportFile = createReportHtmlExport();
    const file = typeof File === 'undefined' ? null : new File([exportFile.blob], exportFile.name, { type: 'text/html' });
    if (file && navigator.canShare?.({ files: [file] })) {
      await navigator.share({ title, text, files: [file] });
      return;
    }
    if (navigator.share) {
      await navigator.share({ title, text, url: location.href });
      return;
    }
    downloadReportFile();
    showToast(t('reports.detail.share_fallback'));
  };
  document.getElementById('btnSend')?.addEventListener('click', () => shareReport().catch(() => {}));
  document.getElementById('btnShareTop')?.addEventListener('click', () => shareReport().catch(() => {}));

  getClinicExportDocumentById(params.reportId).then(async (doc) => {
    const target = document.getElementById('reportDetailBody');
    if (!target) return;
    if (!doc) {
      target.innerHTML = `
      <div class="empty-state">
        <div class="premium-icon-box" style="margin: 0 auto 16px;">${window.__icons?.clipboard}</div>
        <div class="font-bold mb-2">${t('reports.detail.not_found')}</div>
        <div class="text-sm text-secondary px-4">${t('reports.detail.not_found_desc')}</div>
      </div>
    `;
      return;
    }

    try {
      const [records, measurements] = await Promise.all([
        getFreeRecords({ petId: doc.pet_id, limit: 8 }),
        getMeasurements({ petId: doc.pet_id, limit: 8 })
      ]);
      target.innerHTML = renderDocument(doc, records, measurements);
    } catch {
      target.innerHTML = renderDocument(doc);
    }
  }).catch(() => {});
}
